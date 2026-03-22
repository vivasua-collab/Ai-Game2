/**
 * DURABILITY SYSTEM
 * 
 * Система прочности и износа экипировки.
 * 
 * === ОСНОВНЫЕ ПРИНЦИПЫ ===
 * 
 * 1. Прочность определяет состояние предмета
 * 2. При использовании предмет теряет прочность
 * 3. Состояние влияет на эффективность
 * 4. Сломанные предметы нельзя экипировать
 * 
 * === ШКАЛА СОСТОЯНИЙ ===
 * 
 * pristine (Безупречное): 100-90% → 100% эффективности
 * good (Хорошее): 89-70% → 95% эффективности
 * worn (Поношенное): 69-50% → 85% эффективности
 * damaged (Повреждённое): 49-20% → 70% эффективности
 * broken (Сломанное): <20% → 50% эффективности, нельзя экипировать
 * 
 * === ПОТЕРЯ ПРОЧНОСТИ ===
 * 
 * Атака: 0.1
 * Тяжёлая атака: 0.3
 * Блок: 0.3
 * Парирование: 0.2
 * Полученный урон: 0.5
 * Использование навыка: 0.1
 * Критический удар: +0.2 дополнительно
 * 
 * === ОБОСНОВАНИЕ ИЗ ЛОРА ===
 * 
 * - "Ничто не берётся из ниоткуда и не исчезает в никуда"
 * - "Сохранение материи строго соблюдается"
 * - Износ — это материальное разрушение предмета
 */

import {
  DurabilityCondition,
  DurabilityState,
  DurabilityThreshold,
} from '@/types/equipment-v2';
import { MaterialDefinition } from '@/types/materials';
import { EquipmentGrade, GRADE_CONFIGS } from './grade-system';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Потеря прочности по типам действий
 */
export const DURABILITY_LOSS: Record<string, number> = {
  attack: 0.1,
  heavy_attack: 0.3,
  block: 0.3,
  parry: 0.2,
  damage_taken: 0.5,
  skill_use: 0.1,
  critical_hit: 0.2,
  time: 0.01, // За час использования
};

/**
 * Пороги состояний прочности
 */
export const CONDITION_THRESHOLDS: Record<DurabilityCondition, DurabilityThreshold> = {
  pristine: {
    minPercent: 90,
    effectiveness: 1.0,
    color: 'text-green-400',
  },
  good: {
    minPercent: 70,
    effectiveness: 0.95,
    color: 'text-lime-400',
  },
  worn: {
    minPercent: 50,
    effectiveness: 0.85,
    color: 'text-yellow-400',
  },
  damaged: {
    minPercent: 20,
    effectiveness: 0.70,
    color: 'text-orange-400',
  },
  broken: {
    minPercent: 0,
    effectiveness: 0.50,
    color: 'text-red-400',
  },
};

/**
 * Порядок состояний для сравнения
 */
export const CONDITION_ORDER: DurabilityCondition[] = [
  'broken',
  'damaged',
  'worn',
  'good',
  'pristine',
];

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Рассчитать максимальную прочность
 * 
 * Формула: baseDurability × gradeMultiplier + levelBonus
 * 
 * @param material - Материал предмета
 * @param grade - Грейд предмета
 * @param level - Уровень предмета
 * @returns Максимальная прочность
 */
export function calculateMaxDurability(
  material: MaterialDefinition,
  grade: EquipmentGrade,
  level: number
): number {
  const baseDurability = material.properties.durability;
  const gradeMultiplier = GRADE_CONFIGS[grade].durabilityMultiplier;
  const levelBonus = Math.floor(level * 2);
  
  return Math.floor(baseDurability * gradeMultiplier + levelBonus);
}

/**
 * Рассчитать состояние по проценту прочности
 * 
 * @param percent - Процент прочности (0-100)
 * @returns Состояние прочности
 */
export function calculateConditionByPercent(percent: number): DurabilityCondition {
  if (percent >= 90) return 'pristine';
  if (percent >= 70) return 'good';
  if (percent >= 50) return 'worn';
  if (percent >= 20) return 'damaged';
  return 'broken';
}

/**
 * Рассчитать состояние по текущей и максимальной прочности
 * 
 * @param current - Текущая прочность
 * @param max - Максимальная прочность
 * @returns Состояние прочности
 */
export function calculateCondition(
  current: number,
  max: number
): DurabilityCondition {
  const percent = max > 0 ? (current / max) * 100 : 0;
  return calculateConditionByPercent(percent);
}

/**
 * Получить множитель эффективности для состояния
 * 
 * @param condition - Состояние прочности
 * @returns Множитель эффективности (0.5 - 1.0)
 */
export function getEffectivenessMultiplier(condition: DurabilityCondition): number {
  return CONDITION_THRESHOLDS[condition].effectiveness;
}

/**
 * Получить цвет для отображения состояния
 * 
 * @param condition - Состояние прочности
 * @returns Tailwind класс цвета
 */
export function getConditionColor(condition: DurabilityCondition): string {
  return CONDITION_THRESHOLDS[condition].color;
}

/**
 * Проверить, сломан ли предмет
 * 
 * @param state - Состояние прочности
 * @returns true если предмет сломан
 */
export function isBroken(state: DurabilityState): boolean {
  return state.condition === 'broken';
}

/**
 * Проверить, требуется ли ремонт
 * 
 * @param state - Состояние прочности
 * @returns true если нужен ремонт
 */
export function needsRepair(state: DurabilityState): boolean {
  return state.condition === 'damaged' || state.condition === 'broken';
}

/**
 * Получить процент прочности
 * 
 * @param state - Состояние прочности
 * @returns Процент (0-100)
 */
export function getDurabilityPercent(state: DurabilityState): number {
  return state.max > 0 ? Math.floor((state.current / state.max) * 100) : 0;
}

// ============================================================================
// STATE MODIFICATION
// ============================================================================

/**
 * Создать начальное состояние прочности
 * 
 * @param material - Материал предмета
 * @param grade - Грейд предмета
 * @param level - Уровень предмета
 * @returns Начальное состояние прочности
 */
export function createDurabilityState(
  material: MaterialDefinition,
  grade: EquipmentGrade,
  level: number
): DurabilityState {
  const max = calculateMaxDurability(material, grade, level);
  
  return {
    current: max,
    max,
    condition: 'pristine',
    repairCount: 0,
    lastRepairQuality: 100,
    totalDamageAbsorbed: 0,
  };
}

/**
 * Потерять прочность
 * 
 * @param state - Текущее состояние
 * @param action - Тип действия
 * @param customAmount - Кастомное количество (опционально)
 * @returns Новое состояние
 */
export function loseDurability(
  state: DurabilityState,
  action: keyof typeof DURABILITY_LOSS,
  customAmount?: number
): DurabilityState {
  const baseLoss = customAmount ?? DURABILITY_LOSS[action] ?? 0.1;
  const newCurrent = Math.max(0, state.current - baseLoss);
  const newCondition = calculateCondition(newCurrent, state.max);
  
  return {
    ...state,
    current: newCurrent,
    condition: newCondition,
  };
}

/**
 * Восстановить прочность
 * 
 * @param state - Текущее состояние
 * @param amount - Количество для восстановления
 * @param quality - Качество ремонта (0-100)
 * @returns Новое состояние
 */
export function restoreDurability(
  state: DurabilityState,
  amount: number,
  quality: number = 100
): DurabilityState {
  const newCurrent = Math.min(state.max, state.current + amount);
  const newCondition = calculateCondition(newCurrent, state.max);
  
  return {
    ...state,
    current: newCurrent,
    condition: newCondition,
    repairCount: state.repairCount + 1,
    lastRepairQuality: quality,
  };
}

/**
 * Поглотить урон (для брони)
 * 
 * @param state - Текущее состояние
 * @param damageAmount - Количество поглощённого урона
 * @returns Новое состояние
 */
export function absorbDamage(
  state: DurabilityState,
  damageAmount: number
): DurabilityState {
  // Потеря прочности: 0.1 от урона, максимум 5 за удар
  const loss = Math.min(damageAmount * 0.1, 5);
  const newCurrent = Math.max(0, state.current - loss);
  const newCondition = calculateCondition(newCurrent, state.max);
  
  return {
    ...state,
    current: newCurrent,
    condition: newCondition,
    totalDamageAbsorbed: state.totalDamageAbsorbed + damageAmount,
  };
}

// ============================================================================
// EFFECTIVENESS APPLICATION
// ============================================================================

/**
 * Применить множитель эффективности к урону
 * 
 * @param baseDamage - Базовый урон
 * @param condition - Состояние прочности
 * @returns Эффективный урон
 */
export function applyDurabilityToDamage(
  baseDamage: number,
  condition: DurabilityCondition
): number {
  const multiplier = getEffectivenessMultiplier(condition);
  return Math.floor(baseDamage * multiplier);
}

/**
 * Применить множитель эффективности к защите
 * 
 * @param baseDefense - Базовая защита
 * @param condition - Состояние прочности
 * @returns Эффективная защита
 */
export function applyDurabilityToDefense(
  baseDefense: number,
  condition: DurabilityCondition
): number {
  const multiplier = getEffectivenessMultiplier(condition);
  return Math.floor(baseDefense * multiplier);
}

/**
 * Применить множитель эффективности к проводимости Ци
 * 
 * @param baseConductivity - Базовая проводимость
 * @param condition - Состояние прочности
 * @returns Эффективная проводимость
 */
export function applyDurabilityToConductivity(
  baseConductivity: number,
  condition: DurabilityCondition
): number {
  const multiplier = getEffectivenessMultiplier(condition);
  return Math.floor(baseConductivity * multiplier);
}

// ============================================================================
// COMPARISON
// ============================================================================

/**
 * Сравнить состояния
 * 
 * @param a - Первое состояние
 * @param b - Второе состояние
 * @returns -1 если a хуже, 0 если равны, 1 если a лучше
 */
export function compareConditions(
  a: DurabilityCondition,
  b: DurabilityCondition
): number {
  const indexA = CONDITION_ORDER.indexOf(a);
  const indexB = CONDITION_ORDER.indexOf(b);
  return Math.sign(indexB - indexA); // Инвертируем, т.к. порядок от худшего к лучшему
}

/**
 * Проверить, можно ли экипировать предмет
 * 
 * @param state - Состояние прочности
 * @returns true если можно экипировать
 */
export function canEquip(state: DurabilityState): boolean {
  return state.condition !== 'broken';
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Получить название состояния для UI
 * 
 * @param condition - Состояние прочности
 * @returns Локализованное название
 */
export function getConditionLabel(condition: DurabilityCondition): string {
  const labels: Record<DurabilityCondition, string> = {
    pristine: 'Безупречное',
    good: 'Хорошее',
    worn: 'Поношенное',
    damaged: 'Повреждённое',
    broken: 'Сломанное',
  };
  return labels[condition];
}

/**
 * Получить описание состояния для UI
 * 
 * @param condition - Состояние прочности
 * @returns Описание
 */
export function getConditionDescription(condition: DurabilityCondition): string {
  const descriptions: Record<DurabilityCondition, string> = {
    pristine: 'Предмет в идеальном состоянии.',
    good: 'Небольшие следы использования.',
    worn: 'Заметные следы износа.',
    damaged: 'Предмет повреждён и требует ремонта.',
    broken: 'Предмет сломан и не может использоваться.',
  };
  return descriptions[condition];
}

/**
 * Форматировать состояние для отображения
 * 
 * @param state - Состояние прочности
 * @returns Строка для UI
 */
export function formatDurability(state: DurabilityState): string {
  const percent = getDurabilityPercent(state);
  const label = getConditionLabel(state.condition);
  return `${label} (${percent}%)`;
}
