/**
 * ============================================================================
 * КОНСТАНТЫ ТЕХНИК КУЛЬТИВАЦИИ
 * ============================================================================
 * 
 * Единый источник истины для параметров техник.
 * 
 * Содержимое:
 * - QI_DENSITY_TABLE — плотность Ци по уровню (ЕДИНСТВЕННЫЙ ИСТОЧНИК!)
 * - BASE_CAPACITY_BY_TYPE — базовая ёмкость по типу техники
 * - BASE_CAPACITY_BY_COMBAT_SUBTYPE — ёмкость для подтипов атак
 * - CULTIVATION_BONUS_BY_GRADE — бонусы техник культивации
 * - SHIELD_SUSTAIN_BY_GRADE — подпитка щитов по Grade
 * 
 * @see docs/checkpoints/checkpoint_03_20_technique_implementation.md
 * @see docs/checkpoints/checkpoint_03_20_technique.md
 */

import type { TechniqueGrade } from '@/types/grade';

// Реэкспорт для удобства
export type { TechniqueGrade } from '@/types/grade';

// ==================== ТИПЫ ТЕХНИК (импорт из единого источника) ====================

/**
 * @see src/types/technique-types.ts - Единый источник типов
 */
import type {
  TechniqueType,
  CombatSubtype,
} from '@/types/technique-types';

// Реэкспорт для удобства
export type { TechniqueType, CombatSubtype } from '@/types/technique-types';

// ==================== ПЛОТНОСТЬ ЦИ ====================

/**
 * Плотность Ци по уровню культивации
 * 
 * ⚠️ ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ! Не дублировать!
 * 
 * Формула: qiDensity = 2^(level - 1)
 * 
 * Уровень 1 = 1 ед/см³
 * Уровень 5 = 16 ед/см³
 * Уровень 9 = 256 ед/см³
 */
export const QI_DENSITY_TABLE: Record<number, number> = {
  1: 1,    // 2^0
  2: 2,    // 2^1
  3: 4,    // 2^2
  4: 8,    // 2^3
  5: 16,   // 2^4
  6: 32,   // 2^5
  7: 64,   // 2^6
  8: 128,  // 2^7
  9: 256,  // 2^8
} as const;

/**
 * Рассчитать плотность Ци по уровню культивации
 * 
 * @param cultivationLevel - уровень культивации (1-9)
 * @returns плотность Ци
 */
export function calculateQiDensity(cultivationLevel: number): number {
  const level = Math.max(1, Math.min(9, cultivationLevel));
  return QI_DENSITY_TABLE[level] ?? Math.pow(2, level - 1);
}

// ==================== ТИПЫ ТЕХНИК ====================
// Типы TechniqueType и CombatSubtype импортированы из @/types/technique-types.ts
// (см. импорт в начале файла)

// ==================== БАЗОВАЯ ЁМКОСТЬ ПО ТИПУ ====================

/**
 * Базовая ёмкость техники по типу
 * 
 * null = пассивная техника (не использует capacity)
 * 
 * Группы:
 * - Максимальная: formation (80) — долгая установка
 * - Очень высокая: defense (72) — резервуар для блокирования
 * - Высокая: melee_strike (64) — Ци в теле
 * - Повышенная: support, healing (56) — мягкое воздействие
 * - Средняя: melee_weapon (48) — через оружие
 * - Ниже средней: movement, curse, poison (40)
 * - Низкая: sensory, ranged_* (32) — расхождение веером
 * - Пассивная: cultivation (null) — не использует capacity
 * 
 * @see docs/checkpoints/technique_damage_analysis.md
 */
export const BASE_CAPACITY_BY_TYPE: Record<TechniqueType, number | null> = {
  combat: 48,        // Базовое, переопределяется по CombatSubtype
  formation: 80,     // Максимальная — долгая установка
  defense: 72,       // Очень высокая — резервуар для блокирования
  cultivation: null, // Пассивная — не использует capacity
  support: 56,       // Повышенная — мягкое воздействие
  healing: 56,       // Повышенная — мягкое воздействие
  movement: 40,      // Ниже средней — выталкивание тела
  curse: 40,         // Ниже средней — пробитие защиты
  poison: 40,        // Ниже средней — скрытое внедрение
  sensory: 32,       // Низкая — расхождение веером
} as const;

/**
 * Базовая ёмкость для подтипов атакующих техник
 * 
 * Логика:
 * - melee_strike: Высокая (64) — Ци накапливается в теле
 * - melee_weapon: Средняя (48) — Ци проходит через оружие
 * - ranged_*: Низкая (32) — Ци рассеивается при полёте
 */
export const BASE_CAPACITY_BY_COMBAT_SUBTYPE: Record<CombatSubtype, number> = {
  melee_strike: 64,      // Высокая — Ци в теле
  melee_weapon: 48,      // Средняя — через оружие
  ranged_projectile: 32, // Низкая — снаряд летит
  ranged_beam: 32,       // Низкая — луч рассеивается
  ranged_aoe: 32,        // Низкая — область
} as const;

// ==================== ФУНКЦИИ ====================

/**
 * Получить базовую ёмкость для техники
 * 
 * @param type Тип техники
 * @param combatSubtype Подтип для combat (опционально)
 * @returns Базовая ёмкость или null для пассивных техник
 */
export function getBaseCapacity(
  type: TechniqueType,
  combatSubtype?: CombatSubtype
): number | null {
  // Культивация — пассивная техника
  if (type === 'cultivation') return null;
  
  // Для атакующих техник — по подтипу
  if (type === 'combat' && combatSubtype) {
    return BASE_CAPACITY_BY_COMBAT_SUBTYPE[combatSubtype] ?? 48;
  }
  
  return BASE_CAPACITY_BY_TYPE[type] ?? 48;
}

/**
 * Проверить, является ли техника пассивной
 */
export function isPassiveTechnique(type: TechniqueType): boolean {
  return type === 'cultivation';
}

/**
 * Рассчитать полную ёмкость техники
 * 
 * Формула: baseCapacity × 2^(level-1) × (1 + mastery × 0.5%)
 * 
 * @param type Тип техники
 * @param level Уровень техники (1-9)
 * @param mastery Мастерство (0-100)
 * @param combatSubtype Подтип для combat
 * @returns Ёмкость или null для пассивных техник
 */
export function calculateTechniqueCapacity(
  type: TechniqueType,
  level: number,
  mastery: number,
  combatSubtype?: CombatSubtype
): number | null {
  const baseCapacity = getBaseCapacity(type, combatSubtype);
  if (baseCapacity === null) return null;
  
  const levelMultiplier = Math.pow(2, level - 1);
  const masteryBonus = 1 + (mastery / 100) * 0.5; // +50% при 100% mastery
  
  return Math.floor(baseCapacity * levelMultiplier * masteryBonus);
}

// ==================== СПЕЦИАЛЬНЫЕ МЕХАНИКИ ====================

/**
 * Параметры подпитки щита по Grade
 * 
 * Проценты от проводимости (conductivity) × плотность Ци (qiDensity)
 * 
 * Логика:
 * - common: Нет подпитки
 * - refined+: Щит постепенно восстанавливается
 * 
 * @see docs/checkpoints/technique_damage_analysis.md#defense
 */
export const SHIELD_SUSTAIN_BY_GRADE: Record<TechniqueGrade, number> = {
  common: 0,       // Нет подпитки
  refined: 0.05,   // 5% от conductivity × qiDensity
  perfect: 0.10,   // 10% от conductivity × qiDensity
  transcendent: 0.20, // 20% от conductivity × qiDensity
} as const;

/**
 * Параметры техники культивации по Grade
 * 
 * @see docs/checkpoints/technique_damage_analysis.md#cultivation
 */
export const CULTIVATION_BONUS_BY_GRADE: Record<TechniqueGrade, {
  /** +% к скорости поглощения */
  qiBonus: number;
  /** Множитель градиента */
  gradient: number;
  /** -% к прерыванию */
  unnoticeability: number;
}> = {
  common: { 
    qiBonus: 0.10, 
    gradient: 1.0, 
    unnoticeability: 0.05 
  },
  refined: { 
    qiBonus: 0.20, 
    gradient: 1.2, 
    unnoticeability: 0.10 
  },
  perfect: { 
    qiBonus: 0.35, 
    gradient: 1.5, 
    unnoticeability: 0.15 
  },
  transcendent: { 
    qiBonus: 0.50, 
    gradient: 2.0, 
    unnoticeability: 0.25 
  },
} as const;

/**
 * Скорость распада щита (% за ход)
 */
export const SHIELD_DECAY_RATE = 0.002; // 0.2% за ход

// ==================== ДЕСТАБИЛИЗАЦИЯ ====================

/**
 * Результат проверки дестабилизации
 */
export interface DestabilizationResult {
  /** Произошла ли дестабилизация */
  isDestabilized: boolean;
  /** Эффективное Ци (для урона) */
  effectiveQi: number;
  /** Эффективность использования */
  efficiency: number;
  /** Урон отдачи (если дестабилизация) */
  backlashDamage?: number;
  /** Потеря Ци от отдачи */
  backlashQiLoss?: number;
  /** Урон по цели (только для melee при дестабилизации) */
  targetDamage?: number;
  /** Флаг melee дестабилизации (для UI) */
  isMeleeDestabilization?: boolean;
}

/**
 * Проверка дестабилизации с учётом базового Ци
 * 
 * Ключевое изменение: baseQiInput = qiCost × qiDensity
 * 
 * @param qiCost Стоимость Ци техники (в "игровых единицах")
 * @param qiDensity Плотность Ци практика
 * @param capacity Ёмкость техники
 * @param techniqueSubtype Подтип техники (для melee определения)
 * @returns Результат дестабилизации
 */
export function checkDestabilizationWithBaseQi(
  qiCost: number,
  qiDensity: number,
  capacity: number,
  techniqueSubtype?: CombatSubtype
): DestabilizationResult {
  // Ключевое изменение: baseQiInput вместо qiCost
  const baseQiInput = qiCost * qiDensity;
  
  const safeLimit = capacity * 1.1; // 10% запас
  
  if (baseQiInput <= safeLimit) {
    return {
      isDestabilized: false,
      effectiveQi: baseQiInput,
      efficiency: 1.0,
    };
  }
  
  // Дестабилизация!
  const excessQi = baseQiInput - capacity;
  
  // Проверка melee подтипов
  const isMelee = techniqueSubtype 
    && ['melee_strike', 'melee_weapon'].includes(techniqueSubtype);
  
  return {
    isDestabilized: true,
    effectiveQi: capacity,
    efficiency: capacity / baseQiInput,
    backlashDamage: Math.floor(excessQi * 0.5), // 50% от избытка = урон себе
    backlashQiLoss: excessQi,
    targetDamage: isMelee ? Math.floor(baseQiInput * 0.5) : 0,
    isMeleeDestabilization: !!isMelee,
  };
}
