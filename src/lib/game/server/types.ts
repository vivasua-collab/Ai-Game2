/**
 * ============================================================================
 * СЕРВЕРНЫЕ ТИПЫ БОЕВОЙ СИСТЕМЫ
 * ============================================================================
 * 
 * Основные типы для серверной миграции боевой системы.
 * Все расчёты урона происходят ТОЛЬКО на сервере.
 * 
 * @see docs/checkpoints/checkpoint_03_25_phase1_combat.md
 */

import type { TechniqueElement, TechniqueGrade, TechniqueType } from '@/types/technique-types';

// ==================== ВЕКТОРЫ И ПОЗИЦИИ ====================

/**
 * 2D вектор
 */
export interface Vector2D {
  x: number;
  y: number;
}

/**
 * Направление (нормализованный вектор)
 */
export type Direction = Vector2D;

// ==================== ИЕРАРХИЯ ТИПОВ (из soul-system.md) ====================

/**
 * L1: Тип души
 */
export type SoulType = 'character' | 'creature' | 'spirit' | 'construct' | 'artifact';

/**
 * L2: Морфология тела
 */
export type BodyMorphology = 
  | 'humanoid' 
  | 'quadruped' 
  | 'serpentine' 
  | 'arthropod' 
  | 'bird' 
  | 'amorphous'
  | 'hybrid_centaur'
  | 'hybrid_mermaid'
  | 'hybrid_harpy'
  | 'hybrid_lamia';

/**
 * L3: Материал тела
 */
export type BodyMaterial = 'organic' | 'scaled' | 'chitin' | 'ethereal' | 'mineral' | 'chaos';

/**
 * Класс размера
 */
export type SizeClass = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

// ==================== ТИПЫ АТАКИ ====================

/**
 * Тип атаки для Level Suppression
 */
export type AttackType = 'normal' | 'technique' | 'ultimate';

/**
 * Подтип combat техник
 */
export type CombatSubtype = 
  | 'melee_strike' 
  | 'melee_weapon' 
  | 'ranged_projectile' 
  | 'ranged_beam' 
  | 'ranged_aoe';

// ==================== ПАРАМЕТРЫ БОЯ ====================

/**
 * Параметры атакующего
 */
export interface AttackerParams {
  /** ID атакующего */
  id: string;
  /** Уровень культивации */
  cultivationLevel: number;
  /** Плотность Ци (вычисляется) */
  qiDensity?: number;
  /** Используемая техника */
  technique?: {
    id: string;
    level: number;
    grade: TechniqueGrade;
    type: TechniqueType;
    element: TechniqueElement;
    isUltimate?: boolean;
    subtype?: CombatSubtype;
  };
  /** Позиция атакующего */
  position?: Vector2D;
  /** Направление атаки */
  direction?: Direction;
}

/**
 * Параметры защитника
 */
export interface DefenderParams {
  /** ID защитника */
  id: string;
  /** Уровень культивации */
  cultivationLevel: number;
  /** Текущее HP */
  currentHp: number;
  /** Максимальное HP */
  maxHp: number;
  /** Текущее Qi */
  currentQi: number;
  /** Максимальное Qi */
  maxQi: number;
  /** Материал тела */
  bodyMaterial?: BodyMaterial;
  /** Морфология */
  morphology?: BodyMorphology;
  /** Класс размера */
  sizeClass?: SizeClass;
  /** Значение брони */
  armor?: number;
  /** Есть активный щит */
  hasShieldTechnique?: boolean;
  /** Позиция */
  position?: Vector2D;
}

// ==================== QI DENSITY ====================

/**
 * Рассчитать плотность Ци по уровню культивации
 * 
 * Формула: qiDensity = 2^(cultivationLevel - 1)
 * 
 * @see docs/technique-system-v2.md - Секция 5: Качество Ци
 */
export function calculateQiDensity(cultivationLevel: number): number {
  return Math.pow(2, cultivationLevel - 1);
}

/**
 * Таблица плотности Ци по уровням
 */
export const QI_DENSITY_TABLE: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
  6: 32,
  7: 64,
  8: 128,
  9: 256,
};

// ==================== LEVEL SUPPRESSION ====================

/**
 * Результат подавления уровнем
 */
export interface LevelSuppressionResult {
  /** Разница уровней (defender - attacker) */
  levelDifference: number;
  /** Множитель урона */
  multiplier: number;
  /** Было ли подавление */
  wasSuppressed: boolean;
  /** Тип атаки */
  attackType: AttackType;
}

/**
 * Таблица подавления уровнем
 * 
 * @see docs/technique-system-v2.md - Секция 14: Подавление уровнем
 */
export const LEVEL_SUPPRESSION_TABLE: Record<number, Record<AttackType, number>> = {
  0: { normal: 1.0, technique: 1.0, ultimate: 1.0 },
  1: { normal: 0.5, technique: 0.75, ultimate: 1.0 },
  2: { normal: 0.1, technique: 0.25, ultimate: 0.5 },
  3: { normal: 0.0, technique: 0.05, ultimate: 0.25 },
  4: { normal: 0.0, technique: 0.0, ultimate: 0.1 },
  5: { normal: 0.0, technique: 0.0, ultimate: 0.0 },
};

// ==================== QI BUFFER ====================

/**
 * Результат Qi буфера
 */
export interface QiBufferResult {
  /** Буфер был активирован */
  bufferActivated: boolean;
  /** Поглощённый урон */
  absorbedDamage: number;
  /** Потраченное Qi */
  qiConsumed: number;
  /** Оставшийся Qi */
  remainingQi: number;
  /** Оставшийся урон */
  remainingDamage: number;
}

// ==================== ДЕСТАБИЛИЗАЦИЯ ====================

/**
 * Результат дестабилизации (переполнение Ци)
 */
export interface DestabilizationResult {
  /** Было ли переполнение */
  overflow: boolean;
  /** Излишек Qi */
  excessQi: number;
  /** Урон практику */
  backlashDamage: number;
  /** Урон по цели (для melee) */
  targetDamage: number;
  /** Рассеянное Qi */
  dissipatedQi: number;
}

// ==================== ФИНАЛЬНЫЙ РЕЗУЛЬТАТ ====================

/**
 * Полный результат боевого действия
 */
export interface CombatResult {
  /** Успешность */
  success: boolean;
  /** Причина неудачи */
  reason?: string;
  /** Сообщение для UI */
  message?: string;
  
  /** ID атакующего */
  attackerId: string;
  /** ID цели */
  targetId: string;
  
  /** Исходный урон */
  rawDamage: number;
  /** Финальный урон */
  finalDamage: number;
  
  /** Подавление уровнем */
  levelSuppression?: LevelSuppressionResult;
  /** Qi буфер */
  qiBuffer?: QiBufferResult;
  /** Дестабилизация */
  destabilization?: DestabilizationResult;
  
  /** Текущее HP цели */
  targetHp: number;
  /** Максимальное HP цели */
  targetMaxHp: number;
  /** Цель мертва */
  isDead: boolean;
  
  /** Применённые эффекты */
  effects: CombatEffect[];
  
  /** Метка времени */
  timestamp: number;
}

/**
 * Боевой эффект
 */
export interface CombatEffect {
  type: string;
  value: number;
  duration?: number;
  element?: TechniqueElement;
}

// ==================== ТЕХНИКИ ====================

/**
 * Состояние техники
 */
export interface TechniqueState {
  id: string;
  techniqueId: string;
  level: number;
  grade: TechniqueGrade;
  mastery: number;
  cooldownEndsAt?: number;
}

/**
 * Результат использования техники
 */
export interface TechniqueUseResult {
  success: boolean;
  reason?: string;
  damage?: number;
  currentQi?: number;
  qiCost?: number;
  projectile?: ProjectileData;
  cooldown?: number;
  effects?: CombatEffect[];
}

/**
 * Данные снаряда
 */
export interface ProjectileData {
  id: string;
  techniqueId: string;
  element: TechniqueElement;
  damage: number;
  speed: number;
  size: number;
  color: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  createdAt: number;
}

// ==================== МАТЕРИАЛЫ ====================

/**
 * Снижение урона от материала тела
 */
export const MATERIAL_DAMAGE_REDUCTION: Record<BodyMaterial, number> = {
  organic: 0,      // 0%
  scaled: 0.30,    // 30%
  chitin: 0.20,    // 20%
  ethereal: 0.70,  // 70% (физический урон)
  mineral: 0.50,   // 50%
  chaos: 0.20,     // 20%
};

/**
 * Твёрдость материала по умолчанию
 */
export const DEFAULT_MATERIAL_HARDNESS: Record<BodyMaterial, number> = {
  organic: 3,
  scaled: 6,
  chitin: 5,
  ethereal: 1,
  mineral: 8,
  chaos: 5,
};

// ==================== GRADE МНОЖИТЕЛИ ====================

/**
 * Множители урона по Grade
 * 
 * @see docs/technique-system-v2.md - Секция 1: Grade System
 */
export const GRADE_DAMAGE_MULTIPLIERS: Record<TechniqueGrade, number> = {
  common: 1.0,
  refined: 1.2,
  perfect: 1.4,
  transcendent: 1.6,
};

/**
 * Множители стоимости Qi по Grade
 * ВСЕГДА 1.0 - Grade не влияет на стоимость!
 */
export const GRADE_QI_COST_MULTIPLIERS: Record<TechniqueGrade, number> = {
  common: 1.0,
  refined: 1.0,
  perfect: 1.0,
  transcendent: 1.0,
};

// ==================== БАЗОВАЯ ЁМКОСТЬ ====================

/**
 * Базовая ёмкость по типу техники
 * 
 * @see docs/technique-system-v2.md - Секция 2: Структурная ёмкость
 */
export const BASE_CAPACITY_BY_TYPE: Record<TechniqueType, number | null> = {
  formation: 80,
  defense: 72,
  support: 56,
  healing: 56,
  combat: 48,
  movement: 40,
  curse: 40,
  poison: 40,
  sensory: 32,
  cultivation: null, // Пассивная - не использует capacity
};

/**
 * Базовая ёмкость по Combat подтипу
 */
export const BASE_CAPACITY_BY_COMBAT_SUBTYPE: Record<CombatSubtype, number> = {
  melee_strike: 64,
  melee_weapon: 48,
  ranged_projectile: 32,
  ranged_beam: 32,
  ranged_aoe: 32,
};

// ==================== ULTIMATE ТЕХНИКИ ====================

/**
 * Шанс Ultimate по Grade
 * Только transcendent имеет 5% шанс!
 */
export const ULTIMATE_CHANCE_BY_GRADE: Record<TechniqueGrade, number> = {
  common: 0,
  refined: 0,
  perfect: 0,
  transcendent: 0.05,
};

/**
 * Множители Ultimate
 */
export const ULTIMATE_DAMAGE_MULTIPLIER = 1.3;   // +30% урона
export const ULTIMATE_QI_COST_MULTIPLIER = 1.5;  // +50% стоимости Qi

// ==================== ДОПОЛНИТЕЛЬНЫЕ ТИПЫ ====================

/**
 * Данные снаряда
 */
export interface ProjectileData {
  id: string;
  techniqueId?: string;
  element: string;
  speed: number;
  size: number;
  color: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

/**
 * Результат использования техники
 */
export interface TechniqueUseResult {
  success: boolean;
  reason?: string;
  damage?: number;
  currentQi?: number;
  qiCost?: number;
  projectile?: ProjectileData;
  cooldown?: number;
  effects?: CombatEffect[];
  techniqueData?: {
    capacity: number;
    baseDamage: number;
    gradeMultiplier: number;
    formula: string;
  };
}
