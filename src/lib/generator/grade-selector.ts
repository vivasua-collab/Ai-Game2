/**
 * ============================================================================
 * GRADE SELECTOR - Унифицированная система выбора Grade
 * ============================================================================
 * 
 * Централизованный модуль для выбора грейда всех генерируемых объектов.
 * 
 * === КЛЮЧЕВЫЕ ПРИНЦИПЫ ===
 * 
 * 1. Grade НЕ зависит от уровня!
 *    Даже на L1 есть 2% шанс получить transcendent.
 * 
 * 2. Разные распределения для разных типов объектов:
 *    - Экипировка: 5 грейдов (с damaged)
 *    - Техники: 4 грейда (без damaged)
 *    - Формации: 4 грейда
 *    - Расходники: 4 грейда
 * 
 * 3. Возможность переопределения через customDistribution.
 * 
 * 4. Обратная совместимость через маппинги Rarity ↔ Grade.
 */

import {
  EquipmentGrade,
  TechniqueGrade,
  FormationGrade,
  ConsumableGrade,
  EQUIPMENT_GRADE_ORDER,
  TECHNIQUE_GRADE_ORDER,
  TECHNIQUE_GRADE_CONFIGS,
  FORMATION_GRADE_CONFIGS,
  CONSUMABLE_GRADE_CONFIGS,
  RARITY_TO_TECHNIQUE_GRADE,
  TECHNIQUE_GRADE_TO_RARITY,
  RARITY_TO_EQUIPMENT_GRADE,
  EQUIPMENT_GRADE_TO_RARITY,
} from '../../types/grade';
import { Rarity } from '../../types/rarity';

// ============================================================================
// ТИПЫ РАСПРЕДЕЛЕНИЙ
// ============================================================================

/**
 * Распределение грейдов экипировки
 */
export interface EquipmentGradeDistribution {
  damaged: number;
  common: number;
  refined: number;
  perfect: number;
  transcendent: number;
}

/**
 * Распределение грейдов техник/формаций/расходников
 */
export interface TechniqueGradeDistribution {
  common: number;
  refined: number;
  perfect: number;
  transcendent: number;
}

// ============================================================================
// УНИВЕРСАЛЬНЫЕ РАСПРЕДЕЛЕНИЯ (НЕ зависят от уровня!)
// ============================================================================

/**
 * Универсальное распределение для экипировки
 * 
 * ВАЖНО: НЕ зависит от уровня!
 * Даже на L1 есть 2% шанс получить transcendent.
 */
export const UNIVERSAL_EQUIPMENT_DISTRIBUTION: EquipmentGradeDistribution = {
  damaged: 5,      // 5% - сломанные (только для найденных/выпавших)
  common: 50,      // 50% - обычные
  refined: 30,     // 30% - улучшенные
  perfect: 13,     // 13% - совершенные
  transcendent: 2, // 2% - превосходящие (уникальные)
};

/**
 * Универсальное распределение для техник
 * 
 * Техники не могут быть "damaged" - это знания/навыки.
 */
export const UNIVERSAL_TECHNIQUE_DISTRIBUTION: TechniqueGradeDistribution = {
  common: 60,      // 60% - обычные
  refined: 28,     // 28% - улучшенные
  perfect: 10,     // 10% - совершенные
  transcendent: 2, // 2% - превосходящие
};

/**
 * Универсальное распределение для формаций
 */
export const UNIVERSAL_FORMATION_DISTRIBUTION: TechniqueGradeDistribution = {
  common: 70,      // 70% - обычные
  refined: 20,     // 20% - улучшенные
  perfect: 8,      // 8% - совершенные
  transcendent: 2, // 2% - превосходящие
};

/**
 * Универсальное распределение для расходников
 */
export const UNIVERSAL_CONSUMABLE_DISTRIBUTION: TechniqueGradeDistribution = {
  common: 60,      // 60% - обычные
  refined: 28,     // 28% - улучшенные
  perfect: 10,     // 10% - совершенные
  transcendent: 2, // 2% - превосходящие
};

// ============================================================================
// КЭШИРОВАННЫЕ РАСПРЕДЕЛЕНИЯ (для производительности)
// ============================================================================

/**
 * Кэшированные распределения по типам объектов
 * Создаётся один раз при загрузке модуля
 */
const CACHED_EQUIPMENT_DISTRIBUTIONS: EquipmentGradeDistribution = 
  { ...UNIVERSAL_EQUIPMENT_DISTRIBUTION };

const CACHED_TECHNIQUE_DISTRIBUTIONS: TechniqueGradeDistribution = 
  { ...UNIVERSAL_TECHNIQUE_DISTRIBUTION };

const CACHED_FORMATION_DISTRIBUTIONS: TechniqueGradeDistribution = 
  { ...UNIVERSAL_FORMATION_DISTRIBUTION };

const CACHED_CONSUMABLE_DISTRIBUTIONS: TechniqueGradeDistribution = 
  { ...UNIVERSAL_CONSUMABLE_DISTRIBUTION };

// ============================================================================
// ФУНКЦИИ ВЫБОРА GRADE
// ============================================================================

/**
 * Выбрать грейд экипировки
 * 
 * @param customDistribution - Опциональное кастомное распределение
 * @param rng - Функция случайного числа (0-1)
 * @returns Выбранный грейд экипировки
 * 
 * @example
 * ```typescript
 * // Случайный выбор
 * const grade = selectEquipmentGrade();
 * 
 * // С кастомным распределением
 * const grade = selectEquipmentGrade({ damaged: 0, common: 70, refined: 20, perfect: 8, transcendent: 2 });
 * 
 * // С детерминированным RNG
 * const grade = selectEquipmentGrade(undefined, seededRandom(seed));
 * ```
 */
export function selectEquipmentGrade(
  customDistribution?: Partial<EquipmentGradeDistribution>,
  rng: () => number = Math.random
): EquipmentGrade {
  // Используем кэшированное распределение или кастомное
  const distribution: EquipmentGradeDistribution = customDistribution
    ? { ...CACHED_EQUIPMENT_DISTRIBUTIONS, ...customDistribution }
    : CACHED_EQUIPMENT_DISTRIBUTIONS;
  
  const roll = rng() * 100;
  let cumulative = 0;
  
  // Проходим по порядку грейдов
  for (const grade of EQUIPMENT_GRADE_ORDER) {
    cumulative += distribution[grade];
    if (roll <= cumulative) {
      return grade;
    }
  }
  
  // Fallback (не должно достигаться при корректной конфигурации)
  return 'common';
}

/**
 * Выбрать грейд техники
 * 
 * @param customDistribution - Опциональное кастомное распределение
 * @param rng - Функция случайного числа (0-1)
 * @returns Выбранный грейд техники
 * 
 * @example
 * ```typescript
 * const grade = selectTechniqueGrade();
 * const grade = selectTechniqueGrade({ common: 40, refined: 35, perfect: 20, transcendent: 5 });
 * ```
 */
export function selectTechniqueGrade(
  customDistribution?: Partial<TechniqueGradeDistribution>,
  rng: () => number = Math.random
): TechniqueGrade {
  const distribution: TechniqueGradeDistribution = customDistribution
    ? { ...CACHED_TECHNIQUE_DISTRIBUTIONS, ...customDistribution }
    : CACHED_TECHNIQUE_DISTRIBUTIONS;
  
  const roll = rng() * 100;
  let cumulative = 0;
  
  for (const grade of TECHNIQUE_GRADE_ORDER) {
    cumulative += distribution[grade];
    if (roll <= cumulative) {
      return grade;
    }
  }
  
  return 'common';
}

/**
 * Выбрать грейд формации
 */
export function selectFormationGrade(
  customDistribution?: Partial<TechniqueGradeDistribution>,
  rng: () => number = Math.random
): FormationGrade {
  const distribution: TechniqueGradeDistribution = customDistribution
    ? { ...CACHED_FORMATION_DISTRIBUTIONS, ...customDistribution }
    : CACHED_FORMATION_DISTRIBUTIONS;
  
  const roll = rng() * 100;
  let cumulative = 0;
  
  for (const grade of TECHNIQUE_GRADE_ORDER) {
    cumulative += distribution[grade as TechniqueGrade];
    if (roll <= cumulative) {
      return grade as TechniqueGrade;
    }
  }
  
  return 'common';
}

/**
 * Выбрать грейд расходника
 */
export function selectConsumableGrade(
  customDistribution?: Partial<TechniqueGradeDistribution>,
  rng: () => number = Math.random
): ConsumableGrade {
  const distribution: TechniqueGradeDistribution = customDistribution
    ? { ...CACHED_CONSUMABLE_DISTRIBUTIONS, ...customDistribution }
    : CACHED_CONSUMABLE_DISTRIBUTIONS;
  
  const roll = rng() * 100;
  let cumulative = 0;
  
  for (const grade of TECHNIQUE_GRADE_ORDER) {
    cumulative += distribution[grade as TechniqueGrade];
    if (roll <= cumulative) {
      return grade as ConsumableGrade;
    }
  }
  
  return 'common';
}

// ============================================================================
// ФУНКЦИИ С ПОДДЕРЖКОЙ RARITY (обратная совместимость)
// ============================================================================

/**
 * Выбрать грейд техники с поддержкой legacy rarity
 * 
 * Если передан rarity, конвертирует его в grade.
 * Если передан grade, использует его напрямую.
 * Иначе выбирает случайный grade.
 * 
 * @param params - Параметры выбора
 * @param rng - Функция случайного числа
 */
export function selectTechniqueGradeWithFallback(
  params: {
    grade?: TechniqueGrade;
    rarity?: Rarity;
    customDistribution?: Partial<TechniqueGradeDistribution>;
  },
  rng: () => number = Math.random
): TechniqueGrade {
  // Приоритет: grade > rarity → grade > случайный
  if (params.grade) {
    return params.grade;
  }
  
  if (params.rarity) {
    return RARITY_TO_TECHNIQUE_GRADE[params.rarity] || 'common';
  }
  
  return selectTechniqueGrade(params.customDistribution, rng);
}

/**
 * Выбрать грейд экипировки с поддержкой legacy rarity
 */
export function selectEquipmentGradeWithFallback(
  params: {
    grade?: EquipmentGrade;
    rarity?: Rarity;
    customDistribution?: Partial<EquipmentGradeDistribution>;
  },
  rng: () => number = Math.random
): EquipmentGrade {
  if (params.grade) {
    return params.grade;
  }
  
  if (params.rarity) {
    return RARITY_TO_EQUIPMENT_GRADE[params.rarity] || 'common';
  }
  
  return selectEquipmentGrade(params.customDistribution, rng);
}

// ============================================================================
// МАППИНГИ RARITY ↔ GRADE (экспорт для удобства)
// ============================================================================

export {
  RARITY_TO_TECHNIQUE_GRADE,
  TECHNIQUE_GRADE_TO_RARITY,
  RARITY_TO_EQUIPMENT_GRADE,
  EQUIPMENT_GRADE_TO_RARITY,
};

// ============================================================================
// УТИЛИТЫ
// ============================================================================

/**
 * Получить все конфигурации грейдов техник
 */
export function getAllTechniqueGradeConfigs() {
  return TECHNIQUE_GRADE_CONFIGS;
}

/**
 * Получить все конфигурации грейдов формаций
 */
export function getAllFormationGradeConfigs() {
  return FORMATION_GRADE_CONFIGS;
}

/**
 * Получить все конфигурации грейдов расходников
 */
export function getAllConsumableGradeConfigs() {
  return CONSUMABLE_GRADE_CONFIGS;
}

/**
 * Получить суммарный вес распределения
 */
export function getTotalWeight(distribution: TechniqueGradeDistribution | EquipmentGradeDistribution): number {
  return Object.values(distribution).reduce((sum, w) => sum + w, 0);
}

/**
 * Нормализовать распределение (сумма = 100)
 */
export function normalizeDistribution<T extends TechniqueGradeDistribution | EquipmentGradeDistribution>(
  distribution: T
): T {
  const total = getTotalWeight(distribution);
  if (total === 0) return distribution;
  
  const normalized = {} as T;
  for (const [key, value] of Object.entries(distribution)) {
    normalized[key as keyof T] = (value / total) * 100 as any;
  }
  
  return normalized;
}
