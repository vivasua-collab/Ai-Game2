/**
 * EQUIPMENT V2 TYPE DEFINITIONS
 * 
 * Система экипировки v2 с поддержкой грейдов, материалов и прочности.
 * 
 * === АРХИТЕКТУРА "МАТРЁШКА" ===
 * 
 * Генерация экипировки происходит в три слоя:
 * 
 * 1. БАЗОВЫЙ ОБЪЕКТ (привязан к уровню)
 *    - Тип: weapon, armor, charger
 *    - Уровень: 1-9
 *    - Базовые параметры: damage, defense, qiCost
 * 
 * 2. МАТЕРИАЛ (надстройка)
 *    - ID материала из MaterialsRegistry
 *    - Тир материала: T1-T5
 *    - Бонусы от материала
 * 
 * 3. ГРЕЙД / РЕДКОСТЬ (надстройка)
 *    - Грейд: damaged → common → refined → perfect → transcendent
 *    - Множители параметров
 *    - Дополнительные бонусы
 * 
 * Итоговые параметры:
 *   EffectiveStats = Base × MaterialBonuses × GradeMultipliers
 *   Bonuses = BaseBonuses + MaterialBonuses + GradeBonuses
 */

import { MaterialDefinition } from './materials';

// ============================================================================
// GRADE TYPES
// ============================================================================

/**
 * Грейд (качество) экипировки
 * 
 * Порядок: damaged < common < refined < perfect < transcendent
 * 
 * Обоснование из лора:
 * - damaged: повреждённые предметы при неудачном ремонте или использовании
 * - common: стандартное качество (большинство предметов)
 * - refined: улучшенное качество (мастера-кузнецы)
 * - perfect: идеальное качество (великие мастера)
 * - transcendent: превосходящее качество (легендарные мастера, техники Ци)
 */
export type EquipmentGrade =
  | 'damaged'      // Повреждённый (×0.8 урона, ×0.5 прочности)
  | 'common'       // Обычный (базовые параметры)
  | 'refined'      // Улучшенный (×1.3 урона, ×1.5 прочности)
  | 'perfect'      // Совершенный (×1.7 урона, ×2.5 прочности)
  | 'transcendent'; // Превосходящий (×2.5 урона, ×4.0 прочности)

/**
 * Порядок грейдов для сравнения
 */
export const GRADE_ORDER: EquipmentGrade[] = [
  'damaged',
  'common',
  'refined',
  'perfect',
  'transcendent',
];

/**
 * Конфигурация грейда
 */
export interface GradeConfig {
  /** ID грейда */
  grade: EquipmentGrade;
  
  /** Отображаемое название */
  name: string;
  
  /** Множитель прочности */
  durabilityMultiplier: number;
  
  /** Множитель урона */
  damageMultiplier: number;
  
  /** Диапазон количества бонусов [min, max] */
  bonusCount: [number, number];
  
  /** Tailwind класс цвета */
  color: string;
  
  /** Hex цвет для UI */
  colorHex: string;
  
  /** Иконка/символ */
  icon: string;
  
  /** Шанс успеха при улучшении (%) */
  upgradeChance: number;
  
  /** Риск понижения при ремонте (%) */
  downgradeRisk: number;
  
  /** Описание */
  description: string;
}

// ============================================================================
// DURABILITY TYPES
// ============================================================================

/**
 * Состояние прочности
 * 
 * Влияет на эффективность экипировки:
 * - pristine: 100% эффективности
 * - good: 95% эффективности
 * - worn: 85% эффективности
 * - damaged: 70% эффективности
 * - broken: 50% эффективности (нельзя экипировать)
 */
export type DurabilityCondition =
  | 'pristine'   // 100-90% — Безупречное
  | 'good'       // 89-70% — Хорошее
  | 'worn'       // 69-50% — Поношенное
  | 'damaged'    // 49-20% — Повреждённое
  | 'broken';    // <20% — Сломанное

/**
 * Пороги состояния прочности
 */
export interface DurabilityThreshold {
  /** Минимальный процент для состояния */
  minPercent: number;
  
  /** Множитель эффективности */
  effectiveness: number;
  
  /** Tailwind цвет */
  color: string;
}

/**
 * Состояние прочности экипировки
 */
export interface DurabilityState {
  /** Текущая прочность */
  current: number;
  
  /** Максимальная прочность */
  max: number;
  
  /** Текущее состояние */
  condition: DurabilityCondition;
  
  /** Количество ремонтов */
  repairCount: number;
  
  /** Качество последнего ремонта (0-100) */
  lastRepairQuality: number;
  
  /** Всего поглощено урона */
  totalDamageAbsorbed: number;
}

// ============================================================================
// EQUIPMENT TYPES
// ============================================================================

/**
 * Тип экипировки
 */
export type EquipmentType =
  | 'weapon'      // Оружие
  | 'armor'       // Броня
  | 'charger'     // Зарядник Ци
  | 'accessory'   // Аксессуар
  | 'artifact';   // Артефакт

/**
 * Подтипы оружия
 */
export type WeaponSubtype =
  | 'sword'       // Меч
  | 'blade'       // Клинок
  | 'spear'       // Копьё
  | 'staff'       // Посох
  | 'bow'         // Лук
  | 'dagger'      // Кинжал
  | 'fist';       // Кастеты

/**
 * Подтипы брони
 */
export type ArmorSubtype =
  | 'head'        // Шлем
  | 'chest'       // Нагрудник
  | 'hands'       // Наручи
  | 'legs'        // Поножи
  | 'feet';       // Сапоги

/**
 * Эффективные параметры экипировки
 */
export interface EffectiveStats {
  /** Урон (для оружия) */
  damage: number;
  
  /** Защита (для брони) */
  defense: number;
  
  /** Проводимость Ци */
  qiConductivity: number;
  
  /** Вес */
  weight: number;
}

/**
 * Требования к экипировке
 */
export interface EquipmentRequirements {
  /** Минимальный уровень культивации */
  level: number;
  
  /** Минимальная сила (опционально) */
  strength?: number;
  
  /** Минимальная ловкость (опционально) */
  agility?: number;
  
  /** Минимальный интеллект (опционально) */
  intelligence?: number;
  
  /** Минимальная выносливость (опционально) */
  vitality?: number;
}

/**
 * Событие изменения грейда
 */
export interface GradeChangeEvent {
  /** Исходный грейд */
  from: EquipmentGrade;
  
  /** Новый грейд */
  to: EquipmentGrade;
  
  /** Причина изменения */
  reason: 'upgrade' | 'downgrade' | 'repair' | 'damage';
  
  /** Время события */
  timestamp: number;
}

// ============================================================================
// GENERATED EQUIPMENT
// ============================================================================

/**
 * Сгенерированная экипировка v2
 */
export interface GeneratedEquipmentV2 {
  /** Уникальный ID */
  id: string;
  
  /** Тип экипировки */
  type: EquipmentType;
  
  /** Отображаемое название */
  name: string;
  
  /** Уровень предмета (1-9) */
  level: number;
  
  // === МАТЕРИАЛ ===
  /** ID материала */
  materialId: string;
  
  /** Определение материала */
  material: MaterialDefinition;
  
  // === ГРЕЙД ===
  /** Текущий грейд */
  grade: EquipmentGrade;
  
  /** Конфигурация грейда */
  gradeConfig: GradeConfig;
  
  // === ПАРАМЕТРЫ ===
  /** Эффективные параметры */
  effectiveStats: EffectiveStats;
  
  // === ПРОЧНОСТЬ ===
  /** Состояние прочности */
  durability: DurabilityState;
  
  // === БОНУСЫ ===
  /** Бонусы предмета */
  bonuses: GeneratedBonus[];
  
  // === СПЕЦИАЛЬНОЕ ===
  /** Специальные эффекты */
  specialEffects: string[];
  
  // === ТРЕБОВАНИЯ ===
  /** Требования для использования */
  requirements: EquipmentRequirements;
  
  // === СТОИМОСТЬ ===
  /** Стоимость в золоте */
  value: number;
  
  // === ИСТОРИЯ ===
  /** История изменений грейда */
  gradeHistory?: GradeChangeEvent[];
}

/**
 * Сгенерированный бонус
 */
export interface GeneratedBonus {
  /** ID бонуса */
  id: string;
  
  /** Тип бонуса (из BonusRegistry) */
  type: string;
  
  /** Категория бонуса */
  category: string;
  
  /** Значение бонуса */
  value: number;
  
  /** Является ли множителем */
  isMultiplier: boolean;
  
  /** Источник бонуса */
  source: 'material' | 'grade' | 'base' | 'enchant';
}

// ============================================================================
// OPTIONS
// ============================================================================

/**
 * Опции генерации экипировки
 */
export interface EquipmentGenerationOptions {
  /** Тип экипировки */
  type: EquipmentType;
  
  /** Уровень предмета (1-9) */
  level: number;
  
  /** ID материала (опционально, иначе выбирается случайно) */
  materialId?: string;
  
  /** Грейд (опционально, иначе выбирается случайно) */
  grade?: EquipmentGrade;
  
  /** Seed для RNG (для воспроизводимости) */
  seed?: number;
  
  /** Регион (влияет на выбор материала) */
  region?: string;
}

// ============================================================================
// REPAIR TYPES
// ============================================================================

/**
 * Метод ремонта
 */
export type RepairMethod =
  | 'field_repair'    // Полевой ремонт
  | 'proper_repair'   // Правильный ремонт
  | 'master_repair'   // Мастерский ремонт
  | 'divine_repair';  // Божественный ремонт

/**
 * Конфигурация метода ремонта
 */
export interface RepairMethodConfig {
  /** ID метода */
  id: RepairMethod;
  
  /** Название */
  name: string;
  
  /** % восстановления прочности */
  durabilityRestore: number;
  
  /** Базовое качество ремонта */
  quality: number;
  
  /** Риск понижения грейда (%) */
  downgradeRisk: number;
  
  /** Требуемые материалы */
  materialCost: string[];
  
  /** Требуемый навык */
  skillRequired: number;
  
  /** Стоимость в золоте */
  goldCost: number;
  
  /** Описание */
  description: string;
}

/**
 * Результат ремонта
 */
export interface RepairResult {
  /** Успех */
  success: boolean;
  
  /** Качество ремонта (0-100) */
  quality: number;
  
  /** Восстановлено прочности */
  durabilityRestored: number;
  
  /** Новый грейд */
  newGrade: EquipmentGrade;
  
  /** Произошло ли понижение */
  didDowngrade: boolean;
  
  /** Сообщение для игрока */
  message: string;
}

/**
 * Опции ремонта
 */
export interface RepairOptions {
  /** Метод ремонта */
  method: RepairMethod;
  
  /** Используемые материалы */
  materials: string[];
  
  /** Навык кузнеца */
  skill: number;
  
  /** Бонусы (от техник) */
  bonuses: string[];
}
