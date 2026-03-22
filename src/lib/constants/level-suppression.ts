/**
 * ============================================================================
 * СИСТЕМА ПОДАВЛЕНИЯ УРОВНЕМ (Level Suppression)
 * ============================================================================
 * 
 * Решает проблему: Qi Buffer с поглощением 90% позволяет практику L1 
 * наносить урон практику L8.
 * 
 * Решение: Множитель подавления на основе разницы уровней культивации.
 * 
 * @see docs/body_armor.md - Секция 2: Система Подавления Уровнем
 * @see docs/checkpoints/checkpoint_03_22_Body_update.md
 * 
 * Версия: 1.0.0
 */

import type { AttackType } from '@/types/technique-types';

// ==================== ТИПЫ ====================

/**
 * Значения подавления для каждого типа атаки
 */
export interface SuppressionValues {
  /** Множитель для обычной атаки без техники */
  normal: number;
  /** Множитель для атаки техникой (technique.level влияет) */
  technique: number;
  /** Множитель для ultimate-техники (isUltimate: true) */
  ultimate: number;
}

/**
 * Результат расчёта подавления
 */
export interface LevelSuppressionResult {
  /** Разница уровней (defender - attacker) */
  levelDifference: number;
  /** Тип атаки */
  attackType: AttackType;
  /** Множитель урона (0-1) */
  multiplier: number;
  /** Эффективный уровень атакующего (с учётом уровня техники) */
  effectiveAttackerLevel: number;
  /** Была ли подавление */
  wasSuppressed: boolean;
}

// ==================== ТАБЛИЦА ПОДАВЛЕНИЯ ====================

/**
 * Таблица подавления уровнем
 * 
 * Ключ: разница уровней (defender - attacker)
 * Значение: множители для каждого типа атаки
 * 
 * Сянся-конвенция:
 * - 3+ уровня = почти иммунитет
 * - 5+ уровней = полный иммунитет
 * 
 * @see docs/body_armor.md - Секция 2.2
 */
export const LEVEL_SUPPRESSION_TABLE: Record<number, SuppressionValues> = {
  0: { normal: 1.0, technique: 1.0, ultimate: 1.0 },      // Тот же уровень
  1: { normal: 0.5, technique: 0.75, ultimate: 1.0 },     // +1 уровень защитника
  2: { normal: 0.1, technique: 0.25, ultimate: 0.5 },     // +2 уровня
  3: { normal: 0.0, technique: 0.05, ultimate: 0.25 },    // +3 уровня (почти иммунитет)
  4: { normal: 0.0, technique: 0.0, ultimate: 0.1 },      // +4 уровня
  5: { normal: 0.0, technique: 0.0, ultimate: 0.0 },      // +5+ уровней = иммунитет
} as const;

/**
 * Максимальная разница уровней в таблице
 */
export const MAX_LEVEL_DIFFERENCE = 5;

// ==================== ФУНКЦИИ ====================

/**
 * Рассчитать множитель подавления уровнем
 * 
 * @param attackerLevel - уровень культивации атакующего
 * @param defenderLevel - уровень культивации защитника
 * @param attackType - тип атаки (normal, technique, ultimate)
 * @param techniqueLevel - уровень техники (для attackType='technique')
 * @returns множитель урона (0-1)
 * 
 * @example
 * // L9 атакует L9
 * calculateLevelSuppression(9, 9, 'technique') // → 1.0
 * 
 * @example
 * // L7 атакует L9 обычной атакой
 * calculateLevelSuppression(7, 9, 'normal') // → 0.0 (иммунитет)
 * 
 * @example
 * // L7 атакует L9 техникой L8
 * calculateLevelSuppression(7, 9, 'technique', 8) // → 0.25
 * 
 * @example
 * // L5 атакует L9 ultimate
 * calculateLevelSuppression(5, 9, 'ultimate') // → 0.1
 */
export function calculateLevelSuppression(
  attackerLevel: number,
  defenderLevel: number,
  attackType: AttackType,
  techniqueLevel?: number
): number {
  // Для техник: можно "пробить" защиту выше уровнем
  let effectiveAttackerLevel = attackerLevel;
  if (attackType === 'technique' && techniqueLevel !== undefined) {
    effectiveAttackerLevel = Math.max(attackerLevel, techniqueLevel);
  }
  
  // Разница уровней (защитник выше = подавление)
  const levelDiff = Math.max(0, Math.floor(defenderLevel) - Math.floor(effectiveAttackerLevel));
  
  // Ограничиваем разницу до максимума таблицы
  const clampedDiff = Math.min(MAX_LEVEL_DIFFERENCE, levelDiff);
  
  // Получаем значения из таблицы
  const values = LEVEL_SUPPRESSION_TABLE[clampedDiff];
  
  return values[attackType];
}

/**
 * Рассчитать подавление с полным результатом
 * 
 * @param attackerLevel - уровень культивации атакующего
 * @param defenderLevel - уровень культивации защитника
 * @param attackType - тип атаки
 * @param techniqueLevel - уровень техники (опционально)
 * @returns полный результат подавления
 */
export function calculateLevelSuppressionFull(
  attackerLevel: number,
  defenderLevel: number,
  attackType: AttackType,
  techniqueLevel?: number
): LevelSuppressionResult {
  // Эффективный уровень атакующего
  let effectiveAttackerLevel = attackerLevel;
  if (attackType === 'technique' && techniqueLevel !== undefined) {
    effectiveAttackerLevel = Math.max(attackerLevel, techniqueLevel);
  }
  
  // Разница уровней
  const levelDifference = Math.max(0, Math.floor(defenderLevel) - Math.floor(effectiveAttackerLevel));
  
  // Множитель
  const multiplier = calculateLevelSuppression(
    attackerLevel,
    defenderLevel,
    attackType,
    techniqueLevel
  );
  
  return {
    levelDifference,
    attackType,
    multiplier,
    effectiveAttackerLevel,
    wasSuppressed: multiplier < 1.0,
  };
}

/**
 * Проверить, является ли цель иммунной к атаке
 * 
 * @param attackerLevel - уровень атакующего
 * @param defenderLevel - уровень защитника
 * @param attackType - тип атаки
 * @param techniqueLevel - уровень техники (опционально)
 * @returns true если множитель = 0
 */
export function isTargetImmune(
  attackerLevel: number,
  defenderLevel: number,
  attackType: AttackType,
  techniqueLevel?: number
): boolean {
  const multiplier = calculateLevelSuppression(
    attackerLevel,
    defenderLevel,
    attackType,
    techniqueLevel
  );
  return multiplier === 0;
}

/**
 * Получить описание подавления для UI
 * 
 * @param result - результат подавления
 * @returns строка описания
 */
export function getSuppressionDescription(result: LevelSuppressionResult): string {
  if (result.multiplier === 1.0) {
    return 'Нет подавления';
  }
  
  if (result.multiplier === 0) {
    return `Иммунитет (+${result.levelDifference} ур.)`;
  }
  
  const percent = Math.round(result.multiplier * 100);
  const attackTypeLabel = {
    normal: 'обычная',
    technique: 'техника',
    ultimate: 'ultimate',
  }[result.attackType];
  
  return `Подавление +${result.levelDifference} ур. (${attackTypeLabel}): ${percent}% урона`;
}

// ==================== ТАБЛИЦА ПРИМЕРОВ ====================

/**
 * Примеры подавления (для документации и тестов)
 * 
 * | Атакующий | Защитник | Тип атаки | Уровень техники | Множитель |
 * |-----------|----------|-----------|-----------------|-----------|
 * | L9        | L9       | normal    | -               | 1.0       |
 * | L9        | L9       | technique | -               | 1.0       |
 * | L7        | L9       | normal    | -               | 0.0       |
 * | L7        | L9       | technique | L7              | 0.05      |
 * | L7        | L9       | technique | L8              | 0.25      |
 * | L5        | L9       | ultimate  | -               | 0.1       |
 * | L4        | L9       | ultimate  | -               | 0.0       |
 */
export const SUPPRESSION_EXAMPLES = [
  { attackerLevel: 9, defenderLevel: 9, attackType: 'normal' as AttackType, expected: 1.0 },
  { attackerLevel: 9, defenderLevel: 9, attackType: 'technique' as AttackType, expected: 1.0 },
  { attackerLevel: 7, defenderLevel: 9, attackType: 'normal' as AttackType, expected: 0.0 },
  { attackerLevel: 7, defenderLevel: 9, attackType: 'technique' as AttackType, techniqueLevel: 7, expected: 0.05 },
  { attackerLevel: 7, defenderLevel: 9, attackType: 'technique' as AttackType, techniqueLevel: 8, expected: 0.25 },
  { attackerLevel: 5, defenderLevel: 9, attackType: 'ultimate' as AttackType, expected: 0.1 },
  { attackerLevel: 4, defenderLevel: 9, attackType: 'ultimate' as AttackType, expected: 0.0 },
];
