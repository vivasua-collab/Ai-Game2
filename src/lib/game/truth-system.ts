/**
 * Truth System - Система Истинности
 *
 * Архитектура состояния игры:
 * - В АКТИВНОЙ СЕССИИ состояние в памяти ПЕРВИЧНО
 * - БД используется для:
 *   1. Загрузки сессии при старте
 *   2. Хранения промежуточных состояний при смене локаций
 *   3. Немедленного сохранения критических данных (новые техники)
 *   4. Периодического автосохранения
 *
 * Логика работы:
 * 1. Старт сессии → загрузка из БД в память
 * 2. Активная сессия → все расчёты в памяти
 * 3. Периодическое обновление БД (автосохранение)
 * 4. Смена локации → сохранение в БД → загрузка новой локации
 * 5. Критические события (новая техника) → немедленное сохранение в БД
 *
 * @module truth-system
 * @version 1.0.0
 * @date 2026-02-28
 */

import { db } from '@/lib/db';
import type { Character, Location, WorldTime, InventoryItem, CharacterTechnique } from '@/types/game';
import { Prisma } from '@prisma/client';

// ==================== TYPES ====================

/**
 * Полное состояние сессии в памяти
 */
export interface SessionState {
  sessionId: string;
  characterId: string;

  // Персонаж (первичное состояние в памяти)
  character: CharacterState;

  // Мир
  worldTime: WorldTimeState;
  worldState: Record<string, unknown>;

  // Текущая локация
  currentLocation: LocationState | null;

  // Инвентарь
  inventory: InventoryItemState[];

  // Техники
  techniques: TechniqueState[];

  // Метаданные
  lastSavedAt: Date;
  isDirty: boolean; // Есть несохранённые изменения
  loadedAt: Date;
}

export interface CharacterState {
  id: string;
  name: string;
  age: number;

  // Характеристики
  strength: number;
  agility: number;
  intelligence: number;
  conductivity: number;

  // Культивация
  cultivationLevel: number;
  cultivationSubLevel: number;
  coreCapacity: number;
  coreQuality: number;
  currentQi: number;
  accumulatedQi: number;

  // Физиология
  health: number;
  fatigue: number;
  mentalFatigue: number;

  // Память
  hasAmnesia: boolean;
  knowsAboutSystem: boolean;

  // Принадлежность
  sectId: string | null;
  sectRole: string | null;

  // Ресурсы
  contributionPoints: number;
  spiritStones: number;

  // Навыки
  cultivationSkills: Record<string, number>;
  qiUnderstanding: number;
  qiUnderstandingCap: number;

  // Медитации на проводимость
  conductivityMeditations: number;
  fatigueRecoveryMultiplier: number;
}

export interface WorldTimeState {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  daysSinceStart: number;
  season: string;
  formatted: string;
}

export interface LocationState {
  id: string;
  name: string;
  description: string | null;
  x: number;
  y: number;
  z: number;
  terrainType: string;
  qiDensity: number;
  qiFlowRate: number;
}

export interface InventoryItemState {
  id: string;
  name: string;
  type: string;
  quantity: number;
  rarity: string | null;
  isConsumable: boolean;
  effects: Record<string, unknown> | null;
}

export interface TechniqueState {
  id: string;
  techniqueId: string;
  name: string;
  type: string;
  element: string;
  qiCost: number;
  mastery: number;
  quickSlot: number | null;
}

/**
 * Результат операции
 */
export interface TruthResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================== TRUTH SYSTEM CLASS ====================

/**
 * TruthSystem - Singleton для управления активными сессиями
 *
 * ВАЖНО: В активной сессии состояние в памяти ПЕРВИЧНО!
 * БД - это persistence layer, не источник истины во время игры.
 */
class TruthSystemImpl {
  private static instance: TruthSystemImpl;

  // Активные сессии: sessionId -> SessionState
  private sessions: Map<string, SessionState> = new Map();

  // Индекс: characterId -> sessionId для быстрого поиска
  private characterToSession: Map<string, string> = new Map();

  // Интервал автосохранения (мс)
  private autoSaveInterval = 60000; // 1 минута
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  static getInstance(): TruthSystemImpl {
    if (!this.instance) {
      this.instance = new TruthSystemImpl();
    }
    return this.instance;
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Загрузить сессию из БД в память
   * Вызывается при старте игры или при загрузке сохранения
   */
  async loadSession(sessionId: string): Promise<TruthResult<SessionState>> {
    try {
      // Проверяем, не загружена ли уже сессия
      const existingSession = this.sessions.get(sessionId);
      if (existingSession) {
        return { success: true, data: existingSession };
      }

      // Загружаем из БД
      const dbSession = await db.gameSession.findUnique({
        where: { id: sessionId },
        include: {
          character: {
            include: {
              currentLocation: true,
              techniques: {
                include: { technique: true },
              },
            },
          },
          locations: {
            where: { id: undefined }, // Будет заменено на currentLocation
          },
        },
      });

      if (!dbSession) {
        return { success: false, error: 'Session not found' };
      }

      // Загружаем инвентарь
      const inventory = await db.inventoryItem.findMany({
        where: { characterId: dbSession.characterId },
      });

      // Загружаем техники персонажа
      const techniques = await db.characterTechnique.findMany({
        where: { characterId: dbSession.characterId },
        include: { technique: true },
      });

      // Формируем состояние в памяти
      const sessionState: SessionState = {
        sessionId: dbSession.id,
        characterId: dbSession.characterId,

        character: this.mapCharacterToState(dbSession.character),

        worldTime: {
          year: dbSession.worldYear,
          month: dbSession.worldMonth,
          day: dbSession.worldDay,
          hour: dbSession.worldHour,
          minute: dbSession.worldMinute,
          daysSinceStart: dbSession.daysSinceStart,
          season: dbSession.worldMonth <= 6 ? 'тёплый' : 'холодный',
          formatted: this.formatWorldTime(dbSession),
        },

        worldState: JSON.parse(dbSession.worldState || '{}'),

        currentLocation: dbSession.character.currentLocation
          ? this.mapLocationToState(dbSession.character.currentLocation)
          : null,

        inventory: inventory.map(this.mapInventoryItemToState),

        techniques: techniques.map(this.mapTechniqueToState),

        lastSavedAt: new Date(),
        isDirty: false,
        loadedAt: new Date(),
      };

      // Сохраняем в память
      this.sessions.set(sessionId, sessionState);
      this.characterToSession.set(dbSession.characterId, sessionId);

      // Запускаем автосохранение
      this.startAutoSave(sessionId);

      console.log(`[TruthSystem] Session loaded: ${sessionId}`);
      return { success: true, data: sessionState };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[TruthSystem] Load session error: ${message}`);
      return { success: false, error: `Failed to load session: ${message}` };
    }
  }

  /**
   * Получить состояние сессии из памяти
   */
  getSessionState(sessionId: string): SessionState | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Получить состояние по characterId
   */
  getSessionByCharacter(characterId: string): SessionState | null {
    const sessionId = this.characterToSession.get(characterId);
    if (!sessionId) return null;
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Выгрузить сессию из памяти с сохранением в БД
   */
  async unloadSession(sessionId: string): Promise<TruthResult> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return { success: true }; // Уже выгружена
      }

      // Сохраняем в БД перед выгрузкой
      if (session.isDirty) {
        await this.saveToDatabase(sessionId);
      }

      // Останавливаем автосохранение
      this.stopAutoSave(sessionId);

      // Удаляем из памяти
      this.sessions.delete(sessionId);
      this.characterToSession.delete(session.characterId);

      console.log(`[TruthSystem] Session unloaded: ${sessionId}`);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to unload session: ${message}` };
    }
  }

  // ==================== CHARACTER OPERATIONS ====================

  /**
   * Обновить состояние персонажа в памяти
   * ВАЖНО: Изменения происходят в памяти, БД обновляется периодически
   */
  updateCharacter(
    sessionId: string,
    updates: Partial<CharacterState>
  ): TruthResult<CharacterState> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    // Применяем изменения в памяти
    session.character = { ...session.character, ...updates };
    session.isDirty = true;

    return { success: true, data: session.character };
  }

  /**
   * Получить состояние персонажа из памяти
   */
  getCharacter(sessionId: string): CharacterState | null {
    const session = this.sessions.get(sessionId);
    return session?.character || null;
  }

  /**
   * Добавить Ци персонажу
   */
  addQi(sessionId: string, amount: number): TruthResult<{ currentQi: number; coreOverflow: number }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    const char = session.character;
    const newQi = char.currentQi + amount;
    let coreOverflow = 0;

    if (newQi > char.coreCapacity) {
      // Ядро заполнено, излишек идёт в accumulated
      coreOverflow = newQi - char.coreCapacity;
      char.currentQi = char.coreCapacity;
      char.accumulatedQi += coreOverflow;
    } else {
      char.currentQi = newQi;
    }

    session.isDirty = true;
    return { success: true, data: { currentQi: char.currentQi, coreOverflow } };
  }

  /**
   * Потратить Ци
   */
  spendQi(sessionId: string, amount: number): TruthResult<{ currentQi: number }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    if (session.character.currentQi < amount) {
      return { success: false, error: 'Not enough Qi' };
    }

    session.character.currentQi -= amount;
    session.isDirty = true;

    return { success: true, data: { currentQi: session.character.currentQi } };
  }

  // ==================== FATIGUE OPERATIONS ====================

  /**
   * Обновить усталость
   */
  updateFatigue(
    sessionId: string,
    physicalChange: number,
    mentalChange: number
  ): TruthResult<{ fatigue: number; mentalFatigue: number }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    const char = session.character;
    char.fatigue = Math.max(0, Math.min(100, char.fatigue + physicalChange));
    char.mentalFatigue = Math.max(0, Math.min(100, char.mentalFatigue + mentalChange));
    session.isDirty = true;

    return { success: true, data: { fatigue: char.fatigue, mentalFatigue: char.mentalFatigue } };
  }

  /**
   * Восстановить усталость (отрицательные значения = восстановление)
   */
  recoverFatigue(
    sessionId: string,
    physicalRecovery: number,
    mentalRecovery: number
  ): TruthResult<{ fatigue: number; mentalFatigue: number }> {
    return this.updateFatigue(sessionId, -physicalRecovery, -mentalRecovery);
  }

  // ==================== BREAKTHROUGH OPERATIONS ====================

  /**
   * Применить результаты прорыва
   * КРИТИЧЕСКАЯ ОПЕРАЦИЯ - немедленное сохранение в БД!
   */
  async applyBreakthrough(
    sessionId: string,
    breakthroughData: {
      newLevel: number;
      newSubLevel: number;
      newCoreCapacity: number;
      newConductivity: number;
      qiConsumed: number;
    }
  ): Promise<TruthResult<CharacterState>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    try {
      const char = session.character;

      // Обновляем в памяти
      char.cultivationLevel = breakthroughData.newLevel;
      char.cultivationSubLevel = breakthroughData.newSubLevel;
      char.coreCapacity = breakthroughData.newCoreCapacity;
      char.conductivity = breakthroughData.newConductivity;
      char.accumulatedQi = Math.max(0, char.accumulatedQi - breakthroughData.qiConsumed);

      // Сохраняем в БД (КРИТИЧЕСКАЯ ОПЕРАЦИЯ!)
      await db.character.update({
        where: { id: char.id },
        data: {
          cultivationLevel: char.cultivationLevel,
          cultivationSubLevel: char.cultivationSubLevel,
          coreCapacity: char.coreCapacity,
          conductivity: char.conductivity,
          accumulatedQi: char.accumulatedQi,
          updatedAt: new Date(),
        },
      });

      session.lastSavedAt = new Date();
      session.isDirty = false;

      console.log(`[TruthSystem] Breakthrough applied and saved: Level ${char.cultivationLevel}.${char.cultivationSubLevel}`);
      return { success: true, data: char };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to apply breakthrough: ${message}` };
    }
  }

  /**
   * Обновить проводимость после медитации
   * КРИТИЧЕСКАЯ ОПЕРАЦИЯ - немедленное сохранение в БД!
   */
  async updateConductivity(
    sessionId: string,
    newConductivity: number,
    meditationGained: number
  ): Promise<TruthResult<{ conductivity: number; conductivityMeditations: number }>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    try {
      const char = session.character;
      char.conductivity = newConductivity;
      char.conductivityMeditations += meditationGained;

      // Сохраняем в БД
      await db.character.update({
        where: { id: char.id },
        data: {
          conductivity: char.conductivity,
          conductivityMeditations: char.conductivityMeditations,
          updatedAt: new Date(),
        },
      });

      session.lastSavedAt = new Date();

      console.log(`[TruthSystem] Conductivity updated: ${char.conductivity.toFixed(3)} (meditations: ${char.conductivityMeditations})`);
      return { success: true, data: { conductivity: char.conductivity, conductivityMeditations: char.conductivityMeditations } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to update conductivity: ${message}` };
    }
  }

  // ==================== TECHNIQUE OPERATIONS ====================

  /**
   * Добавить новую технику персонажу
   * КРИТИЧЕСКАЯ ОПЕРАЦИЯ - немедленное сохранение в БД!
   */
  async addTechnique(
    sessionId: string,
    techniqueData: {
      techniqueId: string;
      mastery?: number;
      quickSlot?: number | null;
      learningSource?: string;
    }
  ): Promise<TruthResult<TechniqueState>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    try {
      // Проверяем, нет ли уже такой техники
      const existing = session.techniques.find(t => t.techniqueId === techniqueData.techniqueId);
      if (existing) {
        return { success: false, error: 'Technique already learned' };
      }

      // Получаем данные техники из БД
      const technique = await db.technique.findUnique({
        where: { id: techniqueData.techniqueId },
      });

      if (!technique) {
        return { success: false, error: 'Technique not found in database' };
      }

      // Создаём связь в БД (НЕМЕДЛЕННО!)
      const characterTechnique = await db.characterTechnique.create({
        data: {
          characterId: session.characterId,
          techniqueId: techniqueData.techniqueId,
          mastery: techniqueData.mastery ?? 0,
          quickSlot: techniqueData.quickSlot ?? null,
          learningSource: techniqueData.learningSource ?? 'insight',
          learningStartedAt: new Date(),
        },
        include: { technique: true },
      });

      // Добавляем в память
      const techniqueState = this.mapTechniqueToState(characterTechnique);
      session.techniques.push(techniqueState);

      console.log(`[TruthSystem] Technique added and saved to DB: ${technique.name}`);
      return { success: true, data: techniqueState };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to add technique: ${message}` };
    }
  }

  /**
   * Получить техники персонажа из памяти
   */
  getTechniques(sessionId: string): TechniqueState[] {
    const session = this.sessions.get(sessionId);
    return session?.techniques || [];
  }

  // ==================== INVENTORY OPERATIONS ====================

  /**
   * Добавить предмет в инвентарь
   * КРИТИЧЕСКАЯ ОПЕРАЦИЯ - немедленное сохранение в БД!
   */
  async addInventoryItem(
    sessionId: string,
    itemData: {
      name: string;
      nameId?: string;
      type: string;
      quantity: number;
      rarity?: string;
      description?: string;
      isConsumable?: boolean;
      effects?: Record<string, unknown>;
    }
  ): Promise<TruthResult<InventoryItemState>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    try {
      // Создаём в БД (НЕМЕДЛЕННО!)
      const dbItem = await db.inventoryItem.create({
        data: {
          characterId: session.characterId,
          name: itemData.name,
          nameId: itemData.nameId,
          type: itemData.type,
          quantity: itemData.quantity,
          rarity: itemData.rarity ?? null,
          description: itemData.description ?? null,
          isConsumable: itemData.isConsumable ?? false,
          effects: itemData.effects ? JSON.stringify(itemData.effects) : null,
        },
      });

      // Добавляем в память
      const itemState = this.mapInventoryItemToState(dbItem);
      session.inventory.push(itemState);

      console.log(`[TruthSystem] Item added and saved to DB: ${itemData.name}`);
      return { success: true, data: itemState };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to add item: ${message}` };
    }
  }

  /**
   * Получить инвентарь из памяти
   */
  getInventory(sessionId: string): InventoryItemState[] {
    const session = this.sessions.get(sessionId);
    return session?.inventory || [];
  }

  /**
   * Обновить инвентарь из внешнего источника (например, после синхронизации)
   */
  updateInventory(sessionId: string, items: InventoryItemState[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.inventory = items;
    session.isDirty = true;
  }

  // ==================== LOCATION OPERATIONS ====================

  /**
   * Смена локации
   * СОХРАНЯЕТ текущее состояние в БД, затем обновляет память
   */
  async changeLocation(
    sessionId: string,
    newLocationId: string
  ): Promise<TruthResult<LocationState>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    try {
      // 1. Сохраняем текущее состояние в БД (ПЕРЕД сменой локации)
      await this.saveToDatabase(sessionId);

      // 2. Загружаем новую локацию
      const dbLocation = await db.location.findUnique({
        where: { id: newLocationId },
      });

      if (!dbLocation) {
        return { success: false, error: 'Location not found' };
      }

      // 3. Обновляем персонажа в БД
      await db.character.update({
        where: { id: session.characterId },
        data: { currentLocationId: newLocationId },
      });

      // 4. Обновляем в памяти
      const locationState = this.mapLocationToState(dbLocation);
      session.currentLocation = locationState;

      console.log(`[TruthSystem] Location changed: ${locationState.name}`);
      return { success: true, data: locationState };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to change location: ${message}` };
    }
  }

  /**
   * Получить текущую локацию из памяти
   */
  getCurrentLocation(sessionId: string): LocationState | null {
    const session = this.sessions.get(sessionId);
    return session?.currentLocation || null;
  }

  // ==================== TIME OPERATIONS ====================

  /**
   * Продвинуть время
   */
  advanceTime(
    sessionId: string,
    minutes: number
  ): TruthResult<WorldTimeState> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    const time = session.worldTime;
    let newMinute = time.minute + minutes;
    let newHour = time.hour;
    let newDay = time.day;
    let newMonth = time.month;
    let newYear = time.year;
    let daysSinceStart = time.daysSinceStart;

    // Обработка переполнения
    while (newMinute >= 60) {
      newMinute -= 60;
      newHour++;
    }

    while (newHour >= 24) {
      newHour -= 24;
      newDay++;
      daysSinceStart++;
    }

    while (newDay > 30) {
      newDay -= 30;
      newMonth++;
    }

    while (newMonth > 12) {
      newMonth -= 12;
      newYear++;
    }

    // Обновляем в памяти
    time.minute = newMinute;
    time.hour = newHour;
    time.day = newDay;
    time.month = newMonth;
    time.year = newYear;
    time.daysSinceStart = daysSinceStart;
    time.season = newMonth <= 6 ? 'тёплый' : 'холодный';
    time.formatted = `${newYear} Э.С.М., ${newMonth} месяц, ${newDay} день, ${newHour}:${newMinute.toString().padStart(2, '0')}`;

    session.isDirty = true;
    return { success: true, data: time };
  }

  /**
   * Получить время из памяти
   */
  getWorldTime(sessionId: string): WorldTimeState | null {
    const session = this.sessions.get(sessionId);
    return session?.worldTime || null;
  }

  // ==================== PERSISTENCE ====================

  /**
   * Сохранить сессию в БД
   */
  async saveToDatabase(sessionId: string): Promise<TruthResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    try {
      const char = session.character;
      const time = session.worldTime;

      // Сохраняем персонажа
      await db.character.update({
        where: { id: char.id },
        data: {
          name: char.name,
          age: char.age,
          strength: char.strength,
          agility: char.agility,
          intelligence: char.intelligence,
          conductivity: char.conductivity,
          cultivationLevel: char.cultivationLevel,
          cultivationSubLevel: char.cultivationSubLevel,
          coreCapacity: char.coreCapacity,
          coreQuality: char.coreQuality,
          currentQi: char.currentQi,
          accumulatedQi: char.accumulatedQi,
          health: char.health,
          fatigue: char.fatigue,
          mentalFatigue: char.mentalFatigue,
          hasAmnesia: char.hasAmnesia,
          knowsAboutSystem: char.knowsAboutSystem,
          sectId: char.sectId,
          sectRole: char.sectRole,
          contributionPoints: char.contributionPoints,
          spiritStones: char.spiritStones,
          cultivationSkills: JSON.stringify(char.cultivationSkills),
          qiUnderstanding: char.qiUnderstanding,
          qiUnderstandingCap: char.qiUnderstandingCap,
          conductivityMeditations: char.conductivityMeditations,
          fatigueRecoveryMultiplier: char.fatigueRecoveryMultiplier,
          updatedAt: new Date(),
        },
      });

      // Сохраняем время сессии
      await db.gameSession.update({
        where: { id: sessionId },
        data: {
          worldYear: time.year,
          worldMonth: time.month,
          worldDay: time.day,
          worldHour: time.hour,
          worldMinute: time.minute,
          daysSinceStart: time.daysSinceStart,
          worldState: JSON.stringify(session.worldState),
          updatedAt: new Date(),
        },
      });

      session.lastSavedAt = new Date();
      session.isDirty = false;

      console.log(`[TruthSystem] Session saved to DB: ${sessionId}`);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[TruthSystem] Save error: ${message}`);
      return { success: false, error: `Failed to save: ${message}` };
    }
  }

  /**
   * Быстрое сохранение (только критические данные)
   */
  async quickSave(sessionId: string): Promise<TruthResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    try {
      // Сохраняем только персонажа (самое важное)
      const char = session.character;
      await db.character.update({
        where: { id: char.id },
        data: {
          currentQi: char.currentQi,
          accumulatedQi: char.accumulatedQi,
          health: char.health,
          fatigue: char.fatigue,
          mentalFatigue: char.mentalFatigue,
          cultivationLevel: char.cultivationLevel,
          cultivationSubLevel: char.cultivationSubLevel,
          coreCapacity: char.coreCapacity,
          updatedAt: new Date(),
        },
      });

      session.lastSavedAt = new Date();
      console.log(`[TruthSystem] Quick save: ${sessionId}`);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Quick save failed: ${message}` };
    }
  }

  // ==================== AUTO-SAVE ====================

  private startAutoSave(sessionId: string): void {
    // Останавливаем предыдущий таймер если есть
    this.stopAutoSave(sessionId);

    const timer = setInterval(async () => {
      const session = this.sessions.get(sessionId);
      if (session && session.isDirty) {
        await this.quickSave(sessionId);
      }
    }, this.autoSaveInterval);

    this.autoSaveTimers.set(sessionId, timer);
  }

  private stopAutoSave(sessionId: string): void {
    const timer = this.autoSaveTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(sessionId);
    }
  }

  // ==================== MAPPERS ====================

  private mapCharacterToState(char: Prisma.CharacterGetPayload<{
    include: { currentLocation: true; techniques: true };
  }>): CharacterState {
    return {
      id: char.id,
      name: char.name,
      age: char.age,
      strength: char.strength,
      agility: char.agility,
      intelligence: char.intelligence,
      conductivity: char.conductivity,
      cultivationLevel: char.cultivationLevel,
      cultivationSubLevel: char.cultivationSubLevel,
      coreCapacity: char.coreCapacity,
      coreQuality: char.coreQuality,
      currentQi: char.currentQi,
      accumulatedQi: char.accumulatedQi,
      health: char.health,
      fatigue: char.fatigue,
      mentalFatigue: char.mentalFatigue,
      hasAmnesia: char.hasAmnesia,
      knowsAboutSystem: char.knowsAboutSystem,
      sectId: char.sectId,
      sectRole: char.sectRole,
      contributionPoints: char.contributionPoints,
      spiritStones: char.spiritStones,
      cultivationSkills: JSON.parse(char.cultivationSkills || '{}'),
      qiUnderstanding: char.qiUnderstanding,
      qiUnderstandingCap: char.qiUnderstandingCap,
      conductivityMeditations: char.conductivityMeditations,
      fatigueRecoveryMultiplier: char.fatigueRecoveryMultiplier,
    };
  }

  private mapLocationToState(loc: Prisma.LocationGetPayload<Record<string, never>>): LocationState {
    return {
      id: loc.id,
      name: loc.name,
      description: loc.description,
      x: loc.x,
      y: loc.y,
      z: loc.z,
      terrainType: loc.terrainType,
      qiDensity: loc.qiDensity,
      qiFlowRate: loc.qiFlowRate,
    };
  }

  private mapInventoryItemToState(item: Prisma.InventoryItemGetPayload<Record<string, never>>): InventoryItemState {
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      quantity: item.quantity,
      rarity: item.rarity,
      isConsumable: item.isConsumable,
      effects: item.effects ? JSON.parse(item.effects) : null,
    };
  }

  private mapTechniqueToState(ct: Prisma.CharacterTechniqueGetPayload<{
    include: { technique: true };
  }>): TechniqueState {
    return {
      id: ct.id,
      techniqueId: ct.techniqueId,
      name: ct.technique.name,
      type: ct.technique.type,
      element: ct.technique.element,
      qiCost: ct.technique.qiCost,
      mastery: ct.mastery,
      quickSlot: ct.quickSlot,
    };
  }

  private formatWorldTime(session: { worldYear: number; worldMonth: number; worldDay: number; worldHour: number; worldMinute: number }): string {
    return `${session.worldYear} Э.С.М., ${session.worldMonth} месяц, ${session.worldDay} день, ${session.worldHour}:${session.worldMinute.toString().padStart(2, '0')}`;
  }

  // ==================== UTILS ====================

  /**
   * Получить статистику системы
   */
  getStats(): { activeSessions: number; sessions: string[] } {
    return {
      activeSessions: this.sessions.size,
      sessions: Array.from(this.sessions.keys()),
    };
  }

  /**
   * Проверить, загружена ли сессия
   */
  isSessionLoaded(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}

// ==================== EXPORTS ====================

export const TruthSystem = TruthSystemImpl;
