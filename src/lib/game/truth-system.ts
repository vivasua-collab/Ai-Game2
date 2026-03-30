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
 * @updated 2026-03-06 12:45 UTC
 */

import { db } from '@/lib/db';
import type { Character, Location, WorldTime, InventoryItem, CharacterTechnique } from '@/types/game';
import { Prisma } from '@prisma/client';
import { logQiChange, type QiChangeSource } from '@/lib/logger/qi-logger';
import type { NPCState } from './types/npc-state';

// ==================== TYPES ====================

/**
 * Полное состояние сессии в памяти
 */
export interface SessionState {
  sessionId: string;
  characterId: string;

  // Персонаж (первичное состояние в памяти)
  character: CharacterState;

  // === ПОЗИЦИЯ ИГРОКА (для AI) ===
  playerX: number;
  playerY: number;

  // Мир
  worldTime: WorldTimeState;
  worldState: Record<string, unknown>;

  // Текущая локация
  currentLocation: LocationState | null;

  // Инвентарь
  inventory: InventoryItemState[];

  // Техники
  techniques: TechniqueState[];

  // === НОВОЕ: NPC (Фаза 1) ===
  npcs: Map<string, NPCState>;                      // npcId → NPCState
  npcIndexByLocation: Map<string, Set<string>>;     // locationId → Set<npcId>
  npcIndexByActivation: Map<string, Set<string>>;   // 'active' | 'inactive' → Set<npcId>

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
  
  // Счётчик всех медитаций
  meditationCount: number;
  
  // Счётчик длинных медитаций (>= 4 часов)
  longMeditationCount: number;
  
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

// Используем globalThis для сохранения singleton между запросами в Next.js Dev Mode
const globalForTruthSystem = globalThis as unknown as {
  truthSystem: TruthSystemImpl | undefined;
};

class TruthSystemImpl {
  // Активные сессии: sessionId -> SessionState
  private sessions: Map<string, SessionState> = new Map();

  // Индекс: characterId -> sessionId для быстрого поиска
  private characterToSession: Map<string, string> = new Map();

  // Интервал автосохранения (мс)
  private autoSaveInterval = process.env.NODE_ENV === 'development' ? 120000 : 60000; // 2 мин dev, 1 мин prod
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  static getInstance(): TruthSystemImpl {
    if (!globalForTruthSystem.truthSystem) {
      globalForTruthSystem.truthSystem = new TruthSystemImpl();
    }
    return globalForTruthSystem.truthSystem;
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

        // === ПОЗИЦИЯ ИГРОКА (для AI) ===
        playerX: 400,  // Дефолтная позиция, обновляется через updatePlayerPosition
        playerY: 300,

        // === НОВОЕ: Инициализация NPC (Фаза 1) ===
        npcs: new Map(),
        npcIndexByLocation: new Map(),
        npcIndexByActivation: new Map([
          ['active', new Set()],
          ['inactive', new Set()],
        ]),

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
    updates: Partial<CharacterState>,
    reason: string = 'updateCharacter'
  ): TruthResult<CharacterState> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    // Логируем изменение Ци если оно есть
    if (updates.currentQi !== undefined && updates.currentQi !== session.character.currentQi) {
      logQiChange(sessionId, session.character.id, {
        oldQi: session.character.currentQi,
        newQi: updates.currentQi,
        source: 'system',
        reason,
        details: { updates },
      });
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
  addQi(sessionId: string, amount: number, source: QiChangeSource = 'system', reason: string = 'addQi'): TruthResult<{ currentQi: number; coreOverflow: number }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    const char = session.character;
    const oldQi = char.currentQi;
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

    // Логируем изменение Ци
    logQiChange(sessionId, char.id, {
      oldQi,
      newQi: char.currentQi,
      source,
      reason: `${reason} (amount: ${amount})`,
      details: { amount, coreOverflow },
    });

    session.isDirty = true;
    return { success: true, data: { currentQi: char.currentQi, coreOverflow } };
  }

  /**
   * Потратить Ци
   */
  spendQi(sessionId: string, amount: number, source: QiChangeSource = 'system', reason: string = 'spendQi'): TruthResult<{ currentQi: number }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    if (session.character.currentQi < amount) {
      return { success: false, error: 'Not enough Qi' };
    }

    const oldQi = session.character.currentQi;
    session.character.currentQi -= amount;
    session.isDirty = true;

    // Логируем изменение Ци
    logQiChange(sessionId, session.character.id, {
      oldQi,
      newQi: session.character.currentQi,
      source,
      reason: `${reason} (amount: ${amount})`,
      details: { amount },
    });

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

  /**
   * Инкрементировать счётчик медитаций
   * @param durationMinutes - длительность медитации в минутах
   * Если durationMinutes >= 240 (4 часа), также инкрементируется longMeditationCount
   * Возвращает объект с новыми значениями счётчиков
   */
  incrementMeditationCount(sessionId: string, durationMinutes: number = 0): TruthResult<{ meditationCount: number; longMeditationCount: number }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    session.character.meditationCount += 1;
    
    // Длинная медитация - 4 часа и более (240 минут)
    if (durationMinutes >= 240) {
      session.character.longMeditationCount += 1;
    }
    
    session.isDirty = true;

    console.log(`[TruthSystem] Meditation count: ${session.character.meditationCount}, Long meditation count: ${session.character.longMeditationCount}`);
    return { 
      success: true, 
      data: {
        meditationCount: session.character.meditationCount,
        longMeditationCount: session.character.longMeditationCount,
      }
    };
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

  // ==================== NPC OPERATIONS ====================

  /**
   * Добавить NPC в сессию
   * 
   * ИСПРАВЛЕНО: Автоматически загружает сессию если её нет в памяти
   */
  async addNPC(sessionId: string, npc: NPCState): Promise<TruthResult<NPCState>> {
    let session = this.sessions.get(sessionId);
    
    // Если сессия не загружена - загружаем из БД
    if (!session) {
      console.log(`[TruthSystem] addNPC: Session ${sessionId} not loaded, loading from DB...`);
      const loadResult = await this.loadSession(sessionId);
      if (!loadResult.success) {
        console.error(`[TruthSystem] Failed to load session ${sessionId}: ${loadResult.error}`);
        return { success: false, error: `Failed to load session: ${loadResult.error}` };
      }
      session = loadResult.data!;
    }

    // Сохраняем в Map
    session.npcs.set(npc.id, npc);

    // Обновляем индекс по локации
    if (!session.npcIndexByLocation.has(npc.locationId)) {
      session.npcIndexByLocation.set(npc.locationId, new Set());
    }
    session.npcIndexByLocation.get(npc.locationId)!.add(npc.id);

    // Обновляем индекс активности
    const activationKey = npc.isActive ? 'active' : 'inactive';
    session.npcIndexByActivation.get(activationKey)!.add(npc.id);

    session.isDirty = true;

    console.log(`[TruthSystem] Added NPC: ${npc.name} (${npc.id}) to location ${npc.locationId}`);
    return { success: true, data: npc };
  }

  /**
   * Добавить несколько NPC сразу (batch)
   */
  addNPCs(sessionId: string, npcs: NPCState[]): TruthResult<number> {
    let added = 0;
    for (const npc of npcs) {
      const result = this.addNPC(sessionId, npc);
      if (result.success) added++;
    }
    return { success: true, data: added };
  }

  /**
   * Получить NPC по ID
   */
  getNPC(sessionId: string, npcId: string): NPCState | null {
    const session = this.sessions.get(sessionId);
    return session?.npcs.get(npcId) || null;
  }

  /**
   * Получить всех NPC в локации
   */
  getNPCsByLocation(sessionId: string, locationId: string): NPCState[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const npcIds = session.npcIndexByLocation.get(locationId);
    if (!npcIds) return [];

    return Array.from(npcIds)
      .map(id => session.npcs.get(id))
      .filter((npc): npc is NPCState => npc !== undefined);
  }

  /**
   * Получить всех активных NPC
   */
  getActiveNPCs(sessionId: string): NPCState[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const activeIds = session.npcIndexByActivation.get('active');
    if (!activeIds) return [];

    return Array.from(activeIds)
      .map(id => session.npcs.get(id))
      .filter((npc): npc is NPCState => npc !== undefined);
  }

  /**
   * Получить всех NPC в сессии
   */
  getAllNPCs(sessionId: string): NPCState[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return Array.from(session.npcs.values());
  }

  // ==================== PLAYER POSITION (для AI) ====================

  /**
   * Получить позицию игрока в сессии
   * 
   * Используется NPCAIManager для определения ближайших NPC к игроку.
   */
  getPlayerPosition(sessionId: string): { x: number; y: number } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    return { x: session.playerX, y: session.playerY };
  }

  /**
   * Обновить позицию игрока
   * 
   * Вызывается клиентом через AIPollingClient для синхронизации позиции с сервером.
   */
  updatePlayerPosition(sessionId: string, x: number, y: number): TruthResult<{ x: number; y: number }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    session.playerX = x;
    session.playerY = y;
    
    return { success: true, data: { x, y } };
  }

  /**
   * Обновить NPC
   */
  updateNPC(
    sessionId: string,
    npcId: string,
    updates: Partial<NPCState>
  ): TruthResult<NPCState> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    const npc = session.npcs.get(npcId);
    if (!npc) {
      return { success: false, error: 'NPC not found' };
    }

    // Проверяем смену локации
    if (updates.locationId && updates.locationId !== npc.locationId) {
      this.moveNPCToLocation(session, npc, updates.locationId);
    }

    // Проверяем смену активности
    if (updates.isActive !== undefined && updates.isActive !== npc.isActive) {
      this.updateNPCActivationIndex(session, npc, updates.isActive);
    }

    // Применяем обновления
    Object.assign(npc, updates);
    session.isDirty = true;

    return { success: true, data: npc };
  }

  /**
   * Удалить NPC
   */
  removeNPC(sessionId: string, npcId: string): TruthResult<NPCState> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    const npc = session.npcs.get(npcId);
    if (!npc) {
      return { success: false, error: 'NPC not found' };
    }

    // Удаляем из основного Map
    session.npcs.delete(npcId);

    // Удаляем из индекса локации
    session.npcIndexByLocation.get(npc.locationId)?.delete(npcId);

    // Удаляем из индекса активности
    const activationKey = npc.isActive ? 'active' : 'inactive';
    session.npcIndexByActivation.get(activationKey)?.delete(npcId);

    session.isDirty = true;

    console.log(`[TruthSystem] Removed NPC: ${npc.name} (${npcId})`);
    return { success: true, data: npc };
  }

  /**
   * Активировать NPC в радиусе от позиции
   *
   * Используется при движении игрока для активации ближайших NPC.
   * Активированные NPC обрабатываются AI.
   */
  activateNearbyNPCs(
    sessionId: string,
    x: number,
    y: number,
    radius: number,
    locationId?: string
  ): NPCState[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const targetLocationId = locationId || session.currentLocation?.id;
    if (!targetLocationId) return [];

    const npcsInLocation = this.getNPCsByLocation(sessionId, targetLocationId);
    const activated: NPCState[] = [];

    for (const npc of npcsInLocation) {
      const dx = npc.x - x;
      const dy = npc.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= radius) {
        if (!npc.isActive) {
          npc.isActive = true;
          npc.lastActiveTime = Date.now();
          this.updateNPCActivationIndex(session, npc, true);
          activated.push(npc);
        }
      }
    }

    if (activated.length > 0) {
      console.log(`[TruthSystem] Activated ${activated.length} NPCs within ${radius}px`);
    }

    return activated;
  }

  /**
   * Деактивировать NPC, далеко от игрока
   */
  deactivateFarNPCs(
    sessionId: string,
    playerX: number,
    playerY: number,
    maxDistance: number,
    locationId?: string
  ): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;

    const targetLocationId = locationId || session.currentLocation?.id;
    if (!targetLocationId) return 0;

    const activeNPCs = this.getActiveNPCs(sessionId);
    let deactivated = 0;

    for (const npc of activeNPCs) {
      if (npc.locationId !== targetLocationId) continue;

      const dx = npc.x - playerX;
      const dy = npc.y - playerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > maxDistance) {
        npc.isActive = false;
        this.updateNPCActivationIndex(session, npc, false);
        deactivated++;
      }
    }

    if (deactivated > 0) {
      console.log(`[TruthSystem] Deactivated ${deactivated} NPCs beyond ${maxDistance}px`);
    }

    return deactivated;
  }

  /**
   * Получить статистику NPC
   */
  getNPCStats(sessionId: string): {
    total: number;
    active: number;
    inactive: number;
    byLocation: Record<string, number>;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { total: 0, active: 0, inactive: 0, byLocation: {} };
    }

    const active = session.npcIndexByActivation.get('active')?.size || 0;
    const inactive = session.npcIndexByActivation.get('inactive')?.size || 0;

    const byLocation: Record<string, number> = {};
    for (const [locationId, npcIds] of session.npcIndexByLocation) {
      byLocation[locationId] = npcIds.size;
    }

    return {
      total: session.npcs.size,
      active,
      inactive,
      byLocation,
    };
  }

  /**
   * Переместить NPC в другую локацию (приватный метод)
   */
  private moveNPCToLocation(
    session: SessionState,
    npc: NPCState,
    newLocationId: string
  ): void {
    const oldLocationId = npc.locationId;

    // Удаляем из старой локации
    const oldLocationNPCs = session.npcIndexByLocation.get(oldLocationId);
    if (oldLocationNPCs) {
      oldLocationNPCs.delete(npc.id);
    }

    // Добавляем в новую локацию
    if (!session.npcIndexByLocation.has(newLocationId)) {
      session.npcIndexByLocation.set(newLocationId, new Set());
    }
    session.npcIndexByLocation.get(newLocationId)!.add(npc.id);

    npc.locationId = newLocationId;

    console.log(`[TruthSystem] Moved NPC ${npc.name} from ${oldLocationId} to ${newLocationId}`);
  }

  /**
   * Обновить индекс активности (приватный метод)
   */
  private updateNPCActivationIndex(
    session: SessionState,
    npc: NPCState,
    newIsActive: boolean
  ): void {
    const oldKey = npc.isActive ? 'active' : 'inactive';
    const newKey = newIsActive ? 'active' : 'inactive';

    // Удаляем из старого индекса
    session.npcIndexByActivation.get(oldKey)?.delete(npc.id);

    // Добавляем в новый индекс
    session.npcIndexByActivation.get(newKey)?.add(npc.id);

    console.log(`[TruthSystem] NPC ${npc.name} activation changed: ${oldKey} → ${newKey}`);
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
          meditationCount: char.meditationCount,
          longMeditationCount: char.longMeditationCount,
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
          meditationCount: char.meditationCount,
          longMeditationCount: char.longMeditationCount,
          updatedAt: new Date(),
        },
      });

      session.lastSavedAt = new Date();
      session.isDirty = false; // IMPORTANT: Reset dirty flag after save
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
      meditationCount: char.meditationCount,
      longMeditationCount: char.longMeditationCount,
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

  // ==================== TICKTIMER INTEGRATION ====================

  /** Tick counter for batch saving */
  private tickCounter: number = 0;
  private readonly SAVE_INTERVAL: number = 60; // Save every 60 ticks (1 minute real time)
  private boundGameTickHandler: ((event: Event) => void) | null = null;

  /**
   * Setup TickTimer sync - call after session is loaded
   * Listens to game:tick events from TickTimer
   */
  setupTickTimerSync(sessionId: string): void {
    if (typeof window === 'undefined') return;

    // Remove existing handler
    this.cleanupTickTimerSync();

    // Create bound handler
    this.boundGameTickHandler = ((event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      this.onGameTick(sessionId, detail);
    }) as EventListener;

    // Add listener
    window.addEventListener('game:tick', this.boundGameTickHandler);
    console.log(`[TruthSystem] TickTimer sync setup for session: ${sessionId}`);
  }

  /**
   * Cleanup TickTimer sync
   */
  cleanupTickTimerSync(): void {
    if (this.boundGameTickHandler && typeof window !== 'undefined') {
      window.removeEventListener('game:tick', this.boundGameTickHandler);
      this.boundGameTickHandler = null;
    }
  }

  /**
   * Handle game:tick event
   */
  private onGameTick(sessionId: string, detail: { gameTime: unknown; tickCount: number }): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Sync worldTime from gameTime (if provided)
    if (detail.gameTime && typeof detail.gameTime === 'object') {
      const gt = detail.gameTime as {
        year?: number;
        month?: number;
        day?: number;
        hour?: number;
        minute?: number;
        season?: string;
      };

      if (gt.year !== undefined) session.worldTime.year = gt.year;
      if (gt.month !== undefined) session.worldTime.month = gt.month;
      if (gt.day !== undefined) session.worldTime.day = gt.day;
      if (gt.hour !== undefined) session.worldTime.hour = gt.hour;
      if (gt.minute !== undefined) session.worldTime.minute = gt.minute;
      if (gt.season !== undefined) session.worldTime.season = gt.season;

      // Update formatted string
      session.worldTime.formatted = `${session.worldTime.year} Э.С.М., ${session.worldTime.month} месяц, ${session.worldTime.day} день, ${session.worldTime.hour}:${session.worldTime.minute.toString().padStart(2, '0')}`;
    }

    // Increment tick counter
    this.tickCounter++;

    // Batch save every N ticks
    if (this.tickCounter >= this.SAVE_INTERVAL) {
      this.tickCounter = 0;
      if (session.isDirty) {
        this.quickSave(sessionId).catch(err => {
          console.error('[TruthSystem] Auto-save error:', err);
        });
      }
    }
  }

  /**
   * Sync worldTime from time.store gameTime
   */
  syncWorldTime(sessionId: string, gameTime: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    season: string;
  }): TruthResult<WorldTimeState> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not loaded' };
    }

    session.worldTime.year = gameTime.year;
    session.worldTime.month = gameTime.month;
    session.worldTime.day = gameTime.day;
    session.worldTime.hour = gameTime.hour;
    session.worldTime.minute = gameTime.minute;
    session.worldTime.season = gameTime.season;
    session.worldTime.formatted = `${gameTime.year} Э.С.М., ${gameTime.month} месяц, ${gameTime.day} день, ${gameTime.hour}:${gameTime.minute.toString().padStart(2, '0')}`;

    session.isDirty = true;
    return { success: true, data: session.worldTime };
  }

}

// ==================== EXPORTS ====================

export const TruthSystem = TruthSystemImpl;
