/**
 * ============================================================================
 * УНИФИЦИРОВАННАЯ СИСТЕМА GRADE (МАТРЁШКА)
 * ============================================================================
 * 
 * Единая система качества для всех генерируемых объектов.
 * 
 * === ПРИНЦИПЫ ===
 * 
 * 1. Grade НЕ зависит от уровня!
 *    Даже на L1 есть шанс получить transcendent (2%)
 * 
 * 2. Разные типы объектов имеют разные наборы Grade:
 *    - Экипировка: 5 уровней (damaged, common, refined, perfect, transcendent)
 *    - Техники/Формации/Расходники: 4 уровня (без damaged)
 * 
 * 3. Ци практика влияет ТОЛЬКО на техники (не на экипировку)
 * 
 * === АРХИТЕКТУРА ===
 * 
 *    ЭКИПИРОВКА:
 *    Base → Material → Grade → Final
 *    
 *    ТЕХНИКИ:
 *    Base → Grade → QiConversion → Final
 * 
 * === ОБРАТНАЯ СОВМЕСТИМОСТЬ ===
 * 
 * Rarity → Grade маппинги сохранены для совместимости с существующей БД.
 */

// ============================================================================
// ТИПЫ GRADE
// ============================================================================

/**
 * Грейд экипировки (5 уровней)
 * 
 * Порядок: damaged < common < refined < perfect < transcendent
 */
export type EquipmentGrade =
  | 'damaged'      // Повреждённый (×0.8 урона, ×0.5 прочности)
  | 'common'       // Обычный (базовые параметры)
  | 'refined'      // Улучшенный (×1.3 урона, ×1.5 прочности)
  | 'perfect'      // Совершенный (×1.7 урона, ×2.5 прочности)
  | 'transcendent'; // Превосходящий (×2.5 урона, ×4.0 прочности)

/**
 * Грейд техник (4 уровня, без damaged)
 *
 * Техники не могут быть "damaged" - это знания/навыки
 */
export type TechniqueGrade =
  | 'common'       // Обычный (×1.0 урона)
  | 'refined'      // Улучшенный (×1.2 урона)
  | 'perfect'      // Совершенный (×1.4 урона)
  | 'transcendent'; // Превосходящий (×1.6 урона)

/**
 * Грейд формаций (аналогично техникам)
 */
export type FormationGrade = TechniqueGrade;

/**
 * Грейд расходников (аналогично техникам)
 */
export type ConsumableGrade = TechniqueGrade;

/**
 * Универсальный грейд (объединение всех типов)
 */
export type UniversalGrade = EquipmentGrade | TechniqueGrade;

// ============================================================================
// ПОРЯДОК GRADE
// ============================================================================

/**
 * Порядок грейдов экипировки (для сравнения и сортировки)
 */
export const EQUIPMENT_GRADE_ORDER: EquipmentGrade[] = [
  'damaged',
  'common',
  'refined',
  'perfect',
  'transcendent',
];

/**
 * Порядок грейдов техник (для сравнения и сортировки)
 */
export const TECHNIQUE_GRADE_ORDER: TechniqueGrade[] = [
  'common',
  'refined',
  'perfect',
  'transcendent',
];

// ============================================================================
// КОНФИГУРАЦИИ GRADE
// ============================================================================

/**
 * Конфигурация грейда техники
 */
export interface TechniqueGradeConfig {
  /** ID грейда */
  grade: TechniqueGrade;
  
  /** Отображаемое название */
  name: string;
  
  /** Множитель урона */
  damageMultiplier: number;
  
  /** Множитель стоимости Ци */
  qiCostMultiplier: number;
  
  /** Множитель шанса эффектов */
  effectChanceMultiplier: number;
  
  /** Максимум эффектов */
  maxEffects: number;
  
  /** Вес для случайного выбора (%) */
  weight: number;
  
  /** Tailwind класс цвета */
  color: string;
  
  /** Hex цвет для UI */
  colorHex: string;
  
  /** Иконка/символ */
  icon: string;
  
  /** Описание */
  description: string;
}

/**
 * Конфигурации всех грейдов техник
 * 
 * ВАЖНО: Grade НЕ зависит от уровня!
 * Эти множители применяются к базовым значениям техники.
 */
export const TECHNIQUE_GRADE_CONFIGS: Record<TechniqueGrade, TechniqueGradeConfig> = {
  common: {
    grade: 'common',
    name: 'Обычный',
    damageMultiplier: 1.0,
    qiCostMultiplier: 1.0,
    effectChanceMultiplier: 0.5,
    maxEffects: 1,
    weight: 60,  // 60%
    color: 'text-gray-400',
    colorHex: '#9ca3af',
    icon: '○',
    description: 'Базовая техника без особенностей.',
  },

  refined: {
    grade: 'refined',
    name: 'Улучшенный',
    damageMultiplier: 1.2,
    qiCostMultiplier: 0.95,
    effectChanceMultiplier: 0.8,
    maxEffects: 2,
    weight: 28,  // 28%
    color: 'text-green-400',
    colorHex: '#4ade80',
    icon: '◇',
    description: 'Улучшенная техника с дополнительными эффектами.',
  },

  perfect: {
    grade: 'perfect',
    name: 'Совершенный',
    damageMultiplier: 1.4,
    qiCostMultiplier: 0.9,
    effectChanceMultiplier: 1.2,
    maxEffects: 3,
    weight: 10,  // 10%
    color: 'text-blue-400',
    colorHex: '#60a5fa',
    icon: '◆',
    description: 'Идеальная техника мастеров.',
  },

  transcendent: {
    grade: 'transcendent',
    name: 'Превосходящий',
    damageMultiplier: 1.6,
    qiCostMultiplier: 0.85,
    effectChanceMultiplier: 1.5,
    maxEffects: 4,
    weight: 2,  // 2%
    color: 'text-amber-400',
    colorHex: '#fbbf24',
    icon: '★',
    description: 'Легендарная техника древних мастеров.',
  },
};

/**
 * Конфигурация грейда формации
 */
export interface FormationGradeConfig {
  grade: FormationGrade;
  name: string;
  effectMultiplier: number;
  qiDrainMultiplier: number;
  maxMembers: number;
  weight: number;
  color: string;
  colorHex: string;
  icon: string;
  description: string;
}

/**
 * Конфигурации всех грейдов формаций
 */
export const FORMATION_GRADE_CONFIGS: Record<FormationGrade, FormationGradeConfig> = {
  common: {
    grade: 'common',
    name: 'Обычный',
    effectMultiplier: 1.0,
    qiDrainMultiplier: 1.0,
    maxMembers: 3,
    weight: 70,
    color: 'text-gray-400',
    colorHex: '#9ca3af',
    icon: '○',
    description: 'Базовая формация.',
  },
  
  refined: {
    grade: 'refined',
    name: 'Улучшенный',
    effectMultiplier: 1.2,
    qiDrainMultiplier: 0.9,
    maxMembers: 5,
    weight: 20,
    color: 'text-green-400',
    colorHex: '#4ade80',
    icon: '◇',
    description: 'Улучшенная формация.',
  },
  
  perfect: {
    grade: 'perfect',
    name: 'Совершенный',
    effectMultiplier: 1.5,
    qiDrainMultiplier: 0.8,
    maxMembers: 7,
    weight: 8,
    color: 'text-blue-400',
    colorHex: '#60a5fa',
    icon: '◆',
    description: 'Идеальная формация мастеров.',
  },
  
  transcendent: {
    grade: 'transcendent',
    name: 'Превосходящий',
    effectMultiplier: 2.0,
    qiDrainMultiplier: 0.7,
    maxMembers: 9,
    weight: 2,
    color: 'text-amber-400',
    colorHex: '#fbbf24',
    icon: '★',
    description: 'Легендарная формация древних мастеров.',
  },
};

/**
 * Конфигурация грейда расходника
 */
export interface ConsumableGradeConfig {
  grade: ConsumableGrade;
  name: string;
  effectMultiplier: number;
  durationMultiplier: number;
  weight: number;
  color: string;
  colorHex: string;
  icon: string;
  description: string;
}

/**
 * Конфигурации всех грейдов расходников
 */
export const CONSUMABLE_GRADE_CONFIGS: Record<ConsumableGrade, ConsumableGradeConfig> = {
  common: {
    grade: 'common',
    name: 'Обычный',
    effectMultiplier: 1.0,
    durationMultiplier: 1.0,
    weight: 60,
    color: 'text-gray-400',
    colorHex: '#9ca3af',
    icon: '○',
    description: 'Обычное качество.',
  },
  
  refined: {
    grade: 'refined',
    name: 'Улучшенный',
    effectMultiplier: 1.3,
    durationMultiplier: 1.2,
    weight: 28,
    color: 'text-green-400',
    colorHex: '#4ade80',
    icon: '◇',
    description: 'Улучшенное качество.',
  },
  
  perfect: {
    grade: 'perfect',
    name: 'Совершенный',
    effectMultiplier: 1.7,
    durationMultiplier: 1.5,
    weight: 10,
    color: 'text-blue-400',
    colorHex: '#60a5fa',
    icon: '◆',
    description: 'Идеальное качество.',
  },
  
  transcendent: {
    grade: 'transcendent',
    name: 'Превосходящий',
    effectMultiplier: 2.5,
    durationMultiplier: 2.0,
    weight: 2,
    color: 'text-amber-400',
    colorHex: '#fbbf24',
    icon: '★',
    description: 'Легендарное качество.',
  },
};

// ============================================================================
// МАППИНГИ RARITY ↔ GRADE (обратная совместимость)
// ============================================================================

import { Rarity } from './rarity';

/**
 * Маппинг Rarity → TechniqueGrade
 * 
 * Используется для конвертации старых данных
 */
export const RARITY_TO_TECHNIQUE_GRADE: Record<Rarity, TechniqueGrade> = {
  common: 'common',
  uncommon: 'refined',
  rare: 'perfect',
  legendary: 'transcendent',
};

/**
 * Маппинг TechniqueGrade → Rarity
 * 
 * Используется для обратной совместимости с UI и API
 */
export const TECHNIQUE_GRADE_TO_RARITY: Record<TechniqueGrade, Rarity> = {
  common: 'common',
  refined: 'uncommon',
  perfect: 'rare',
  transcendent: 'legendary',
};

/**
 * Маппинг Rarity → EquipmentGrade
 */
export const RARITY_TO_EQUIPMENT_GRADE: Record<Rarity, EquipmentGrade> = {
  common: 'common',
  uncommon: 'refined',
  rare: 'perfect',
  legendary: 'transcendent',
};

/**
 * Маппинг EquipmentGrade → Rarity
 */
export const EQUIPMENT_GRADE_TO_RARITY: Record<EquipmentGrade, Rarity> = {
  damaged: 'common',     // damaged считается как common для совместимости
  common: 'common',
  refined: 'uncommon',
  perfect: 'rare',
  transcendent: 'legendary',
};

// ============================================================================
// УТИЛИТЫ
// ============================================================================

/**
 * Получить индекс грейда техники (для сравнения)
 */
export function getTechniqueGradeIndex(grade: TechniqueGrade): number {
  return TECHNIQUE_GRADE_ORDER.indexOf(grade);
}

/**
 * Получить индекс грейда экипировки (для сравнения)
 */
export function getEquipmentGradeIndex(grade: EquipmentGrade): number {
  return EQUIPMENT_GRADE_ORDER.indexOf(grade);
}

/**
 * Сравнить два грейда техники
 * @returns -1 если a < b, 0 если равны, 1 если a > b
 */
export function compareTechniqueGrades(a: TechniqueGrade, b: TechniqueGrade): number {
  return Math.sign(getTechniqueGradeIndex(a) - getTechniqueGradeIndex(b));
}

/**
 * Сравнить два грейда экипировки
 * @returns -1 если a < b, 0 если равны, 1 если a > b
 */
export function compareEquipmentGrades(a: EquipmentGrade, b: EquipmentGrade): number {
  return Math.sign(getEquipmentGradeIndex(a) - getEquipmentGradeIndex(b));
}

/**
 * Проверить валидность TechniqueGrade
 */
export function isValidTechniqueGrade(value: string): value is TechniqueGrade {
  return TECHNIQUE_GRADE_ORDER.includes(value as TechniqueGrade);
}

/**
 * Проверить валидность EquipmentGrade
 */
export function isValidEquipmentGrade(value: string): value is EquipmentGrade {
  return EQUIPMENT_GRADE_ORDER.includes(value as EquipmentGrade);
}

/**
 * Конвертировать Rarity в TechniqueGrade
 */
export function rarityToTechniqueGrade(rarity: Rarity): TechniqueGrade {
  return RARITY_TO_TECHNIQUE_GRADE[rarity] || 'common';
}

/**
 * Конвертировать TechniqueGrade в Rarity
 */
export function techniqueGradeToRarity(grade: TechniqueGrade): Rarity {
  return TECHNIQUE_GRADE_TO_RARITY[grade] || 'common';
}

/**
 * Конвертировать Rarity в EquipmentGrade
 */
export function rarityToEquipmentGrade(rarity: Rarity): EquipmentGrade {
  return RARITY_TO_EQUIPMENT_GRADE[rarity] || 'common';
}

/**
 * Конвертировать EquipmentGrade в Rarity
 */
export function equipmentGradeToRarity(grade: EquipmentGrade): Rarity {
  return EQUIPMENT_GRADE_TO_RARITY[grade] || 'common';
}

/**
 * Получить конфигурацию грейда техники
 */
export function getTechniqueGradeConfig(grade: TechniqueGrade): TechniqueGradeConfig {
  return TECHNIQUE_GRADE_CONFIGS[grade];
}

/**
 * Получить конфигурацию грейда формации
 */
export function getFormationGradeConfig(grade: FormationGrade): FormationGradeConfig {
  return FORMATION_GRADE_CONFIGS[grade];
}

/**
 * Получить конфигурацию грейда расходника
 */
export function getConsumableGradeConfig(grade: ConsumableGrade): ConsumableGradeConfig {
  return CONSUMABLE_GRADE_CONFIGS[grade];
}
