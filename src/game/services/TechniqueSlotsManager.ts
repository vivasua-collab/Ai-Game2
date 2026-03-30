/**
 * TechniqueSlotsManager - Менеджер слотов техник игрока
 * 
 * Управляет:
 * - 4 слотами боевых техник (клавиши 1-4)
 * - Кулдаунами техник
 * - Расходом Qi
 * - Созданием снарядов через ProjectileManager
 * 
 * Интеграция:
 * - technique-charging.ts - система зарядки
 * - ProjectileManager - создание снарядов
 * - Event Bus - синхронизация с сервером
 * 
 * @see src/types/game.ts - TechniqueSlots, CharacterTechnique
 */

import type { Technique, CharacterTechnique, CombatTechniqueType } from '@/types/game';
import type { CombatSubtype } from '@/lib/game/techniques';
import { eventBusClient } from '@/lib/game/event-bus/client';
import {
  calculateChargeTime,
  type TechniqueCharging,
  type ChargingContext,
} from './technique-charging';
import {
  calculateQiDensity,
  calculateTechniqueCapacity,
  checkDestabilizationWithBaseQi,
  type TechniqueType as CapacityTechniqueType,
  type CombatSubtype as CapacityCombatSubtype,
} from '@/lib/constants/technique-capacity';
import {
  TECHNIQUE_GRADE_CONFIGS,
  RARITY_TO_TECHNIQUE_GRADE,
  type TechniqueGrade,
} from '@/types/grade';

// ==================== ТИПЫ ====================

/**
 * Слот техники в UI
 */
export interface TechniqueSlot {
  index: number;              // 0-3 (соответствует клавишам 1-4)
  techniqueId: string | null; // ID техники или null
  technique: Technique | null;
  cooldownEndsAt: number;     // Timestamp окончания кулдауна
  isAvailable: boolean;       // Можно ли использовать
  isCharging: boolean;        // В процессе зарядки
}

/**
 * Состояние менеджера слотов
 */
export interface TechniqueSlotsState {
  slots: TechniqueSlot[];
  activeSlotIndex: number;    // Текущий активный слот (0-3)
  lastUsedAt: number;         // Timestamp последнего использования
  totalSlots: number;         // Общее количество слотов (зависит от уровня)
}

/**
 * Результат использования техники
 */
export interface TechniqueUseResult {
  success: boolean;
  reason?: 'cooldown' | 'no_qi' | 'no_technique' | 'invalid_target' | 'charging';
  damage?: number;
  projectileId?: string;
  chargeTime?: number;        // Время зарядки в мс
}

/**
 * Конфигурация для создания снаряда
 */
export interface ProjectileFireConfig {
  techniqueId: string;
  ownerId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  damage: number;
  subtype: CombatSubtype;
  element: string;
}

/**
 * Callback для создания снаряда
 */
export type FireProjectileCallback = (config: ProjectileFireConfig) => void;

// ==================== КЛАСС ====================

export class TechniqueSlotsManager {
  private state: TechniqueSlotsState;
  private scene: Phaser.Scene;
  private onFireProjectile: FireProjectileCallback;
  private chargingTechniques: TechniqueCharging[] = [];
  private characterQi: number = 100;
  private characterMaxQi: number = 100;
  private characterCoreCapacity: number = 360;
  private characterCultivationLevel: number = 1;
  private characterConductivityMeditations: number = 0;
  
  // === Мастерство техник ===
  // Хранит mastery (0-100) для каждой техники по её ID
  private techniqueMasteries: Map<string, number> = new Map();
  
  // Характеристики персонажа для расчёта урона
  private characterStrength: number = 10;
  private characterAgility: number = 10;
  private characterIntelligence: number = 10;

  // === Блокировка для защиты от race condition ===
  private isProcessingUse: boolean = false;
  
  // Константы
  private static readonly DEFAULT_COOLDOWN = 1000; // 1 сек
  private static readonly DEFAULT_SLOT_COUNT = 4;
  
  constructor(
    scene: Phaser.Scene,
    onFireProjectile: FireProjectileCallback,
    options?: {
      totalSlots?: number;
      characterQi?: number;
      characterMaxQi?: number;
      coreCapacity?: number;
      cultivationLevel?: number;
    }
  ) {
    this.scene = scene;
    this.onFireProjectile = onFireProjectile;
    
    const totalSlots = options?.totalSlots ?? TechniqueSlotsManager.DEFAULT_SLOT_COUNT;
    
    this.state = {
      slots: this.createEmptySlots(totalSlots),
      activeSlotIndex: 0,
      lastUsedAt: 0,
      totalSlots,
    };
    
    if (options?.characterQi !== undefined) {
      this.characterQi = options.characterQi;
    }
    if (options?.characterMaxQi !== undefined) {
      this.characterMaxQi = options.characterMaxQi;
    }
    if (options?.coreCapacity !== undefined) {
      this.characterCoreCapacity = options.coreCapacity;
    }
    if (options?.cultivationLevel !== undefined) {
      this.characterCultivationLevel = options.cultivationLevel;
    }
    
    // === Добавляем базовую технику в первый слот по умолчанию ===
    this.state.slots[0] = {
      index: 0,
      techniqueId: 'basic_qi_strike',
      technique: {
        id: 'basic_qi_strike',
        name: 'Удар Ци',
        nameId: 'basic_qi_strike',
        type: 'combat',
        subtype: 'ranged',
        element: 'neutral',
        qiCost: 5,
        cooldown: 500,
        baseDamage: 10,
        range: { fullDamage: 150, halfDamage: 250, max: 350 },
        effects: { combatSubtype: 'ranged_projectile' },
      } as Technique,
      cooldownEndsAt: 0,
      isAvailable: true,
      isCharging: false,
    };
    
    console.log('[TechniqueSlotsManager] Initialized with basic_qi_strike in slot 1');
  }
  
  // ==================== PUBLIC METHODS ====================
  
  /**
   * Загрузить техники в слоты
   */
  loadTechniques(techniques: CharacterTechnique[]): void {
    // Сбрасываем слоты
    this.state.slots = this.createEmptySlots(this.state.totalSlots);
    
    // Очищаем предыдущее мастерство
    this.techniqueMasteries.clear();
    
    // Заполняем слоты из техник персонажа
    for (const charTech of techniques) {
      const slotIndex = charTech.quickSlot;
      // quickSlot: 1-12 = боевой слот (0 = культивация)
      if (slotIndex !== null && slotIndex >= 1 && slotIndex <= this.state.totalSlots) {
        const index = slotIndex - 1; // Конвертируем в 0-based
        this.state.slots[index] = {
          index,
          techniqueId: charTech.techniqueId,
          technique: charTech.technique,
          cooldownEndsAt: 0,
          isAvailable: true,
          isCharging: false,
        };
        
        // === Сохраняем mastery техники ===
        this.techniqueMasteries.set(charTech.techniqueId, charTech.mastery ?? 0);
      }
    }
    
    console.log(`[TechniqueSlotsManager] Loaded ${techniques.length} techniques into slots`);
    console.log(`[TechniqueSlotsManager] Masteries loaded: ${this.techniqueMasteries.size}`);
  }
  
  /**
   * Установить активный слот
   */
  setActiveSlot(index: number): void {
    if (index >= 0 && index < this.state.totalSlots) {
      this.state.activeSlotIndex = index;
      console.log(`[TechniqueSlotsManager] Active slot: ${index + 1}`);
    }
  }
  
  /**
   * Получить активную технику
   */
  getActiveTechnique(): Technique | null {
    const slot = this.state.slots[this.state.activeSlotIndex];
    return slot?.technique ?? null;
  }
  
  /**
   * Получить активный слот
   */
  getActiveSlot(): TechniqueSlot | null {
    return this.state.slots[this.state.activeSlotIndex] ?? null;
  }
  
  /**
   * Проверить возможность использования
   */
  canUse(slotIndex?: number): { canUse: boolean; reason?: string } {
    const index = slotIndex ?? this.state.activeSlotIndex;
    const slot = this.state.slots[index];
    
    if (!slot) {
      return { canUse: false, reason: 'invalid_slot' };
    }
    
    if (!slot.technique) {
      return { canUse: false, reason: 'no_technique' };
    }
    
    if (slot.isCharging) {
      return { canUse: false, reason: 'charging' };
    }
    
    if (Date.now() < slot.cooldownEndsAt) {
      return { canUse: false, reason: 'cooldown' };
    }
    
    const qiCost = slot.technique.qiCost ?? 10;
    if (this.characterQi < qiCost) {
      return { canUse: false, reason: 'no_qi' };
    }
    
    return { canUse: true };
  }
  
  /**
   * Использовать технику
   * 
   * ВАЖНО: Все расчёты происходят на сервере!
   * - Qi списывается на сервере
   * - Урон рассчитывается на сервере
   * - Клиент только отправляет намерение и создаёт визуальный снаряд
   * 
   * @see docs/checkpoints/checkpoint_03_25_phase2_techniques.md
   */
  async use(
    playerX: number,
    playerY: number,
    targetX: number,
    targetY: number
  ): Promise<TechniqueUseResult> {
    // === Защита от race condition ===
    if (this.isProcessingUse) {
      return { success: false, reason: 'cooldown' };
    }

    this.isProcessingUse = true;

    try {
      const slot = this.state.slots[this.state.activeSlotIndex];
      const technique = slot?.technique;

      if (!technique) {
        return { success: false, reason: 'no_technique' };
      }

      // Проверка кулдауна (локально - это допустимо)
      if (Date.now() < slot.cooldownEndsAt) {
        return { success: false, reason: 'cooldown' };
      }

      // === Получаем mastery техники ===
      const mastery = this.getTechniqueMastery(technique.id);
      
      // Определяем Grade
      const grade: TechniqueGrade = (technique.grade as TechniqueGrade)
        ?? RARITY_TO_TECHNIQUE_GRADE[technique.rarity as keyof typeof RARITY_TO_TECHNIQUE_GRADE]
        ?? 'common';

      // === ВАЖНО: Все расчёты на сервере! ===
      // Отправляем запрос на сервер через HTTP API
      try {
        const response = await fetch('/api/combat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'technique:use',
            sessionId: 'current', // TODO: получить из GameBridge
            characterId: 'player',
            techniqueId: technique.id,
            techniqueLevel: technique.level ?? 1,
            techniqueGrade: grade,
            techniqueType: technique.type ?? 'combat',
            combatSubtype: this.getCombatSubtype(technique),
            element: technique.element ?? 'neutral',
            mastery,
            targetX,
            targetY,
            attackerX: playerX,
            attackerY: playerY,
            cultivationLevel: this.characterCultivationLevel,
            currentQi: this.characterQi,
            maxQi: this.characterMaxQi,
            isUltimate: false, // TODO: определить из техники
          }),
        });
        
        if (!response.ok) {
          console.error('[TechniqueSlotsManager] Server error:', response.status);
          return { success: false, reason: 'no_qi' };
        }
        
        const result = await response.json();
        
        if (!result.success) {
          console.warn('[TechniqueSlotsManager] Technique use failed:', result.reason);
          return { 
            success: false, 
            reason: result.reason?.includes('Qi') ? 'no_qi' : 'invalid_target'
          };
        }
        
        // === Обновляем Qi от сервера ===
        if (result.currentQi !== undefined) {
          this.characterQi = result.currentQi;
          // Уведомляем UI об изменении Qi
          this.scene.events.emit('qi-updated', { 
            currentQi: result.currentQi, 
            maxQi: this.characterMaxQi 
          });
        }
        
        // === Создаём снаряд с данными от сервера ===
        const damage = result.damage ?? 10;
        const subtype = this.getCombatSubtype(technique);
        
        this.onFireProjectile({
          techniqueId: technique.id,
          ownerId: 'player',
          x: playerX,
          y: playerY,
          targetX,
          targetY,
          damage,
          subtype,
          element: technique.element ?? 'neutral',
        });
        
        // Установка кулдауна
        const cooldown = technique.effects?.duration ?? TechniqueSlotsManager.DEFAULT_COOLDOWN;
        slot.cooldownEndsAt = Date.now() + cooldown;
        this.state.lastUsedAt = Date.now();
        
        // Уведомление UI
        this.scene.events.emit('technique-slots-update', this.state);
        
        console.log(`[TechniqueSlotsManager] Technique ${technique.name} used: ${damage} damage, Qi: ${result.currentQi}`);
        
        return {
          success: true,
          damage,
          projectileId: `proj_${Date.now()}`,
        };
        
      } catch (error) {
        console.error('[TechniqueSlotsManager] Failed to use technique:', error);
        return { success: false, reason: 'invalid_target' };
      }

    } finally {
      // === ВСЕГДА снимаем блокировку ===
      this.isProcessingUse = false;
    }
  }
  
  /**
   * Обновление состояния (каждый кадр)
   */
  update(_delta: number): void {
    const now = Date.now();
    
    // Обновляем доступность слотов
    for (const slot of this.state.slots) {
      slot.isAvailable = now >= slot.cooldownEndsAt && !slot.isCharging;
    }
    
    // Обновляем зарядку
    this.updateCharging();
  }
  
  /**
   * Установить текущее Qi персонажа
   */
  setCharacterQi(qi: number, maxQi?: number): void {
    this.characterQi = qi;
    if (maxQi !== undefined) {
      this.characterMaxQi = maxQi;
    }
  }
  
  /**
   * Установить параметры персонажа
   */
  setCharacterParams(params: {
    coreCapacity?: number;
    cultivationLevel?: number;
    conductivityMeditations?: number;
    strength?: number;
    agility?: number;
    intelligence?: number;
  }): void {
    if (params.coreCapacity !== undefined) {
      this.characterCoreCapacity = params.coreCapacity;
    }
    if (params.cultivationLevel !== undefined) {
      this.characterCultivationLevel = params.cultivationLevel;
    }
    if (params.conductivityMeditations !== undefined) {
      this.characterConductivityMeditations = params.conductivityMeditations;
    }
    if (params.strength !== undefined) {
      this.characterStrength = params.strength;
    }
    if (params.agility !== undefined) {
      this.characterAgility = params.agility;
    }
    if (params.intelligence !== undefined) {
      this.characterIntelligence = params.intelligence;
    }
  }
  
  /**
   * Получить состояние слотов
   */
  getState(): TechniqueSlotsState {
    return { ...this.state };
  }
  
  /**
   * Получить слот по индексу
   */
  getSlot(index: number): TechniqueSlot | null {
    return this.state.slots[index] ?? null;
  }
  
  /**
   * Получить мастерство техники по её ID
   * 
   * @param techniqueId ID техники
   * @returns Мастерство (0-100) или 0 если техника не найдена
   */
  getTechniqueMastery(techniqueId: string): number {
    return this.techniqueMasteries.get(techniqueId) ?? 0;
  }
  
  /**
   * Обновить мастерство техники
   * 
   * @param techniqueId ID техники
   * @param mastery Новое значение мастерства (0-100)
   */
  setTechniqueMastery(techniqueId: string, mastery: number): void {
    this.techniqueMasteries.set(techniqueId, Math.min(100, Math.max(0, mastery)));
  }
  
  // ==================== PRIVATE METHODS ====================
  
  /**
   * Создать пустые слоты
   */
  private createEmptySlots(count: number): TechniqueSlot[] {
    return Array.from({ length: count }, (_, i) => ({
      index: i,
      techniqueId: null,
      technique: null,
      cooldownEndsAt: 0,
      isAvailable: true,
      isCharging: false,
    }));
  }
  
  /**
   * Расчёт урона техники по НОВОЙ ФОРМУЛЕ
   * 
   * Формула:
   * baseQiInput = qiCost × qiDensity
   * capacity = baseCapacity × 2^(techniqueLevel-1) × (1 + mastery × 0.5%)
   * effectiveQi = min(baseQiInput, capacity)
   * damage = effectiveQi × statMult × masteryMult × gradeMult
   * 
   * @returns Объект с уроном и информацией о дестабилизации
   */
  private calculateDamage(technique: Technique): { damage: number; isDestabilized: boolean; backlashDamage: number } {
    const qiCost = technique.qiCost ?? 10;
    const techniqueLevel = technique.level ?? 1;
    const mastery = this.getTechniqueMastery(technique.id);
    
    // 1. Качество Ци практика (qiDensity = 2^(level-1))
    const qiDensity = calculateQiDensity(this.characterCultivationLevel);
    
    // 2. Структурная ёмкость техники
    const techniqueType = (technique.type as CapacityTechniqueType) ?? 'combat';
    const combatSubtype = technique.subtype as CapacityCombatSubtype | undefined;
    
    // Базовая ёмкость - из техники или рассчитываем
    const baseCapacity = technique.baseCapacity ?? 48;
    
    // Полная ёмкость с учётом уровня и мастерства
    const capacity = calculateTechniqueCapacity(techniqueType, techniqueLevel, mastery, combatSubtype);
    
    // Если capacity === null - это пассивная техника
    const effectiveCapacity = capacity ?? (baseCapacity * Math.pow(2, techniqueLevel - 1));
    
    // 3. Проверка дестабилизации
    const stability = checkDestabilizationWithBaseQi(qiCost, qiDensity, effectiveCapacity);
    const { effectiveQi, isDestabilized, backlashDamage } = stability;
    
    // 4. Базовый урон = эффективное Ци
    let damage = effectiveQi;
    
    // 5. Масштабирование от характеристик
    let statMult = 1.0;
    
    // Определяем тип для статов
    const isMelee = combatSubtype?.startsWith('melee') || technique.subtype === 'melee_strike' || technique.subtype === 'melee_weapon';
    const isRanged = combatSubtype?.startsWith('ranged') || technique.subtype === 'ranged_projectile' || technique.subtype === 'ranged_beam' || technique.subtype === 'ranged_aoe';
    
    if (isMelee) {
      const strBonus = Math.max(0, this.characterStrength - 10);
      statMult += strBonus * 0.05; // +5% за каждую единицу силы выше 10
    } else if (isRanged) {
      const agiBonus = Math.max(0, this.characterAgility - 10);
      statMult += agiBonus * 0.05;
    } else {
      const intBonus = Math.max(0, this.characterIntelligence - 10);
      statMult += intBonus * 0.05;
    }
    damage *= statMult;
    
    // 6. Бонус от мастерства (до +50% при 100% мастерства)
    const masteryMult = 1 + (mastery / 100) * 0.5;
    damage *= masteryMult;
    
    // 7. Множитель от Grade
    const grade: TechniqueGrade = (technique.grade as TechniqueGrade)
      ?? RARITY_TO_TECHNIQUE_GRADE[technique.rarity as keyof typeof RARITY_TO_TECHNIQUE_GRADE]
      ?? 'common';
    const gradeConfig = TECHNIQUE_GRADE_CONFIGS[grade];
    damage *= gradeConfig.damageMultiplier;
    
    return {
      damage: Math.floor(damage),
      isDestabilized,
      backlashDamage,
    };
  }
  
  /**
   * Определить CombatSubtype из Technique
   */
  private getCombatSubtype(technique: Technique): CombatSubtype {
    const combatType = technique.effects?.combatType;
    
    switch (combatType) {
      case 'melee_strike':
      case 'melee_weapon':
        return 'melee_strike';
      case 'ranged_projectile':
        return 'ranged_projectile';
      case 'ranged_beam':
        return 'ranged_beam';
      case 'ranged_aoe':
        return 'ranged_aoe';
      default:
        return 'ranged_projectile';
    }
  }
  
  /**
   * Обновление зарядки техник
   */
  private updateCharging(): void {
    // TODO: Интегрировать с technique-charging.ts
    // Пока просто обновляем isCharging
    for (const slot of this.state.slots) {
      if (slot.isCharging) {
        // Заглушка - через 1 секунду зарядка завершается
        // Реальная логика будет через TechniqueCharging[]
      }
    }
  }
}

// ==================== ФАБРИКА ====================

/**
 * Создать менеджер слотов техник
 */
export function createTechniqueSlotsManager(
  scene: Phaser.Scene,
  onFireProjectile: FireProjectileCallback,
  options?: {
    totalSlots?: number;
    characterQi?: number;
    characterMaxQi?: number;
    coreCapacity?: number;
    cultivationLevel?: number;
  }
): TechniqueSlotsManager {
  return new TechniqueSlotsManager(scene, onFireProjectile, options);
}
