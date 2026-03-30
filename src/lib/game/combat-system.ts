/**
 * ============================================================================
 * СИСТЕМА БОЕВЫХ ТЕХНИК
 * ============================================================================
 * 
 * Содержит функции расчёта урона для боевых техник:
 * - Melee (ближний бой): усиление ударов, усиление оружия
 * - Ranged (дальний бой): снаряды, лучи, AOE с падением урона
 * - Defense (защитные): блок, щит, уклонение
 * 
 * Версия: 2.1
 * Обновлено: 2026-03-22 - Добавлена интеграция Level Suppression
 * ============================================================================
 */

import type { 
  Technique, 
  CombatRange, 
  CombatTechniqueType,
  Character,
  AttackType,
} from '@/types/game';

// Импорт функций из techniques.ts (устранение дублирования)
import { 
  calculateTechniqueCapacity,
  calculateQiDensity,
  QI_DENSITY_TABLE 
} from './techniques';

// Импорт системы Level Suppression
import {
  calculateLevelSuppression,
  calculateLevelSuppressionFull,
  type LevelSuppressionResult,
} from '@/lib/constants/level-suppression';

// Импорт определения типа атаки
import { determineAttackType } from '@/types/technique-types';

// ============================================
// ТИПЫ
// ============================================

/**
 * Результат расчёта урона на дистанции
 */
export interface DamageAtDistanceResult {
  damage: number;       // Итоговый урон
  multiplier: number;   // Множитель (0-1)
  isZero: boolean;      // True если техника рассеялась
  zone: 1 | 2 | 3;      // Зона дальности
}

/**
 * Цель боя
 */
export interface CombatTarget {
  id: string;
  name: string;
  armor: number;        // Защита цели
  dodgeChance?: number; // Шанс уклонения
  position: { x: number; y: number; z?: number };
}

/**
 * Результат атаки
 */
export interface AttackResult {
  success: boolean;
  damage: number;
  wasDodged: boolean;
  distance: number;
  multiplier: number;
  elementalDamage?: {
    type: string;
    damagePerTurn: number;
    duration: number;
  };
  message: string;
}

/**
 * Результат блока
 */
export interface BlockResult {
  blockedDamage: number;   // Заблокированный урон
  finalDamage: number;     // Итоговый урон
  reduction: number;       // Процент снижения
  blockHolds: boolean;     // Блок выдержал
  counterChance: number;   // Шанс контратаки
}

/**
 * Результат щита
 */
export interface ShieldResult {
  absorbedDamage: number;  // Поглощённый урон
  remainingHP: number;     // Оставшееся HP щита
  qiDrained: number;       // Потрачено Ци
  shieldBroken: boolean;   // Щит сломан
}

/**
 * Результат уклонения
 */
export interface DodgeResult {
  dodged: boolean;         // Успешное уклонение
  dodgeChance: number;     // Итоговый шанс
  counterBonus: number;    // Бонус к контратаке
}

/**
 * Результат расчёта времени каста
 */
export interface CastTimeResult {
  baseTime: number;        // Базовое время (сек)
  effectiveTime: number;   // Итоговое время с бонусами
  effectiveSpeed: number;  // Эффективная скорость наполнения
  cultivationBonus: number;// Бонус от уровня культивации
  masteryBonus: number;    // Бонус от мастерства
}

/**
 * Результат проверки дестабилизации
 */
export interface DestabilizationResult {
  isDestabilized: boolean;
  efficiency: number;        // 0-1.0, какая доля Ци использована эффективно
  effectiveQi: number;       // Реально использованное Ци
  excessQi: number;          // Избыточное Ци
  backlashDamage: number;    // Урон от нестабильности (практику)
  backlashQiLoss: number;    // Потеря Ци
  message: string;
}

/**
 * Результат расчёта урона техники (новая система)
 */
export interface TechniqueDamageResult {
  damage: number;
  qiSpent: number;
  effectiveQi: number;
  qiDensity: number;
  techniqueCapacity: number;
  isDestabilized: boolean;
  backlashDamage: number;
  backlashQiLoss: number;
  statMultiplier: number;
  masteryMultiplier: number;
  levelBonus: number;
  message: string;
  // === Level Suppression (v2.1) ===
  /** Результат подавления уровнем (если указан defenderLevel) */
  levelSuppression?: LevelSuppressionResult;
  /** Урон после подавления */
  damageAfterSuppression?: number;
}

// ============================================
// КОНСТАНТЫ
// ============================================

/**
 * Максимальная дистанция для melee техник
 */
export const MELEE_MAX_RANGE = 2; // 2 метра

/**
 * Минимальный множитель урона (для Zone 3)
 */
export const MIN_DAMAGE_MULTIPLIER = 0.01;

/**
 * Минимальное время наполнения техники (секунды)
 */
export const MIN_CAST_TIME = 0.1;

/**
 * Коэффициенты масштабирования по типу техники
 */
export const SCALING_COEFFICIENTS = {
  melee_strike: {
    strength: 0.05,      // 5% за единицу
    agility: 0.025,      // 2.5% за единицу
    intelligence: 0,
  },
  melee_weapon: {
    strength: 0.025,     // 2.5% за единицу
    agility: 0.05,       // 5% за единицу
    intelligence: 0,
  },
  ranged_projectile: {
    strength: 0,
    agility: 0.025,      // 2.5% за единицу
    intelligence: 0.05,  // 5% за единицу
  },
  ranged_beam: {
    strength: 0,
    agility: 0.025,
    intelligence: 0.05,
  },
  ranged_aoe: {
    strength: 0,
    agility: 0.025,
    intelligence: 0.05,
  },
  defense_block: {
    strength: 0,
    agility: 0,
    intelligence: 0.05,  // 5% за единицу
  },
  defense_shield: {
    strength: 0,
    agility: 0,
    intelligence: 0.05,
  },
  defense_dodge: {
    strength: 0,
    agility: 0,
    intelligence: 0.05,
  },
} as const;

// ============================================
// ФУНКЦИИ ВРЕМЕНИ НАПОЛНЕНИЯ (КАСТА)
// ============================================

/**
 * Рассчитать время наполнения техники Ци
 * 
 * Формула: время = qiCost / (проводимость × бонусы)
 */
export function calculateCastTime(
  qiCost: number,
  conductivity: number,
  cultivationLevel: number = 1,
  mastery: number = 0
): CastTimeResult {
  
  // Базовая скорость = проводимость ед/сек
  let effectiveSpeed = conductivity;
  
  // Бонус от уровня культивации (+5% за уровень выше 1)
  const cultivationBonus = (cultivationLevel - 1) * 0.05;
  effectiveSpeed *= 1 + cultivationBonus;
  
  // Бонус от мастерства (+1% за 1% мастерства)
  const masteryBonus = mastery * 0.01;
  effectiveSpeed *= 1 + masteryBonus;
  
  // Время наполнения
  const baseTime = qiCost / conductivity;
  const effectiveTime = Math.max(MIN_CAST_TIME, qiCost / effectiveSpeed);
  
  return {
    baseTime: Math.round(baseTime * 100) / 100,
    effectiveTime: Math.round(effectiveTime * 100) / 100,
    effectiveSpeed: Math.round(effectiveSpeed * 100) / 100,
    cultivationBonus,
    masteryBonus,
  };
}

/**
 * Форматировать время каста для отображения
 */
export function formatCastTime(seconds: number): string {
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)} мс`;
  }
  if (seconds < 60) {
    return `${Math.round(seconds * 10) / 10} сек`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes} мин ${secs} сек`;
}

// ============================================
// ФУНКЦИИ МАСШТАБИРОВАНИЯ
// ============================================

/**
 * Рассчитать множитель урона от характеристик по типу техники
 * 
 * Melee Strike: сила × 5% + ловкость × 2.5%
 * Melee Weapon: сила × 2.5% + ловкость × 5%
 * Ranged: ловкость × 2.5% + интеллект × 5%
 * Defense: интеллект × 5%
 */
export function calculateStatScalingByType(
  character: Character,
  combatType: CombatTechniqueType
): number {
  const coeffs = SCALING_COEFFICIENTS[combatType];
  if (!coeffs) return 1.0;
  
  let multiplier = 1.0;
  
  const strBonus = Math.max(0, character.strength - 10);
  const agiBonus = Math.max(0, character.agility - 10);
  const intlBonus = Math.max(0, character.intelligence - 10);
  
  // Сила
  if (coeffs.strength > 0 && strBonus > 0) {
    multiplier += strBonus * coeffs.strength;
  }
  
  // Ловкость
  if (coeffs.agility > 0 && agiBonus > 0) {
    multiplier += agiBonus * coeffs.agility;
  }
  
  // Интеллект
  if (coeffs.intelligence > 0 && intlBonus > 0) {
    multiplier += intlBonus * coeffs.intelligence;
  }
  
  return multiplier;
}

/**
 * Рассчитать множитель урона от характеристик (legacy, с явными коэффициентами)
 */
export function calculateStatScaling(
  character: Character,
  scaling?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  }
): number {
  if (!scaling) return 1.0;
  
  let multiplier = 1.0;
  
  // Сила (база = 10)
  if (scaling.strength && character.strength > 10) {
    multiplier += (character.strength - 10) * scaling.strength;
  }
  
  // Ловкость (база = 10)
  if (scaling.agility && character.agility > 10) {
    multiplier += (character.agility - 10) * scaling.agility;
  }
  
  // Интеллект (база = 10)
  if (scaling.intelligence && character.intelligence > 10) {
    multiplier += (character.intelligence - 10) * scaling.intelligence;
  }
  
  // Проводимость
  if (scaling.conductivity && character.conductivity > 0) {
    multiplier += character.conductivity * scaling.conductivity;
  }
  
  return multiplier;
}

/**
 * Рассчитать множитель от мастерства техники
 */
export function calculateMasteryMultiplier(mastery: number, masteryBonus: number): number {
  // mastery: 0-100%
  // masteryBonus: бонус при 100% мастерства (например, 0.3 = +30%)
  return 1 + (mastery / 100) * masteryBonus;
}

// ============================================
// ФУНКЦИИ ТИПОВ ТЕХНИК
// ============================================

/**
 * Проверить, является ли техника melee
 */
export function isMeleeTechnique(combatType?: CombatTechniqueType): boolean {
  return combatType === 'melee_strike' || combatType === 'melee_weapon';
}

/**
 * Проверить, является ли техника ranged
 */
export function isRangedTechnique(combatType?: CombatTechniqueType): boolean {
  return combatType === 'ranged_projectile' || 
         combatType === 'ranged_beam' || 
         combatType === 'ranged_aoe';
}

/**
 * Проверить, является ли техника защитной
 */
export function isDefenseTechnique(combatType?: CombatTechniqueType): boolean {
  return combatType === 'defense_block' || 
         combatType === 'defense_shield' || 
         combatType === 'defense_dodge';
}

/**
 * Получить эффективную дальность техники
 */
export function getEffectiveRange(technique: Technique): {
  min: number;
  fullDamage: number;
  halfDamage: number;
  max: number;
} {
  const effects = technique.effects;
  
  // Melee техники
  if (isMeleeTechnique(effects?.combatType)) {
    return {
      min: 0,
      fullDamage: MELEE_MAX_RANGE,
      halfDamage: MELEE_MAX_RANGE,
      max: MELEE_MAX_RANGE
    };
  }
  
  // Защитные техники (действуют на себя)
  if (isDefenseTechnique(effects?.combatType)) {
    return {
      min: 0,
      fullDamage: 0,
      halfDamage: 0,
      max: 0
    };
  }
  
  // Ranged техники
  if (effects?.range) {
    // effects.range is typed as number, convert to CombatRange
    const rangeObj = typeof effects.range === 'number'
      ? createCombatRange(effects.range)
      : effects.range as CombatRange;
    return {
      min: 0,
      fullDamage: rangeObj.fullDamage,
      halfDamage: rangeObj.halfDamage,
      max: rangeObj.max
    };
  }
  
  // Legacy: если указана только distance
  if (effects?.distance) {
    const maxRange = effects.distance;
    return {
      min: 0,
      fullDamage: Math.floor(maxRange * 0.5),
      halfDamage: Math.floor(maxRange * 0.75),
      max: maxRange
    };
  }
  
  // По умолчанию - контактная
  return {
    min: 0,
    fullDamage: MELEE_MAX_RANGE,
    halfDamage: MELEE_MAX_RANGE,
    max: MELEE_MAX_RANGE
  };
}

// ============================================
// ФУНКЦИИ ЗАЩИТНЫХ ТЕХНИК
// ============================================

/**
 * Рассчитать результат блока
 */
export function calculateBlockResult(
  technique: Technique,
  character: Character,
  incomingDamage: number,
  attackerPenetration: number = 0
): BlockResult {
  
  const effects = technique.effects;
  const combatType = effects?.combatType;
  
  // Базовое снижение урона
  let reduction = effects?.damageReduction || 30;
  
  // Масштабирование от интеллекта (5% за единицу выше 10)
  const intBonus = Math.max(0, character.intelligence - 10) * 0.05;
  reduction *= (1 + intBonus);
  
  // Пробитие атакующего
  reduction *= (1 - attackerPenetration / 100);
  
  // Ограничение: максимум 90%
  reduction = Math.min(90, reduction);
  
  // Итоговый урон
  const blockedDamage = Math.floor(incomingDamage * reduction / 100);
  const finalDamage = incomingDamage - blockedDamage;
  
  // Проверка прочности блока
  const durability = effects?.durability || 100;
  const blockHolds = blockedDamage < durability;
  
  return {
    blockedDamage,
    finalDamage,
    reduction: Math.round(reduction),
    blockHolds,
    counterChance: effects?.counterAttack || 0,
  };
}

/**
 * Рассчитать результат щита
 */
export function calculateShieldResult(
  technique: Technique,
  character: Character,
  incomingDamage: number,
  currentShieldHP: number
): ShieldResult {
  
  const effects = technique.effects;
  
  // Базовое HP щита
  const maxShieldHP = effects?.shieldHP || 50;
  
  // Масштабирование от интеллекта
  const intBonus = Math.max(0, character.intelligence - 10) * 0.05;
  const effectiveMaxHP = Math.floor(maxShieldHP * (1 + intBonus));
  
  // Сколько урона поглотит щит
  const absorbedDamage = Math.min(currentShieldHP, incomingDamage);
  const remainingHP = currentShieldHP - absorbedDamage;
  
  // Расход Ци при попадании
  const qiDrained = effects?.qiDrainPerHit || 0;
  
  return {
    absorbedDamage,
    remainingHP,
    qiDrained,
    shieldBroken: remainingHP <= 0,
  };
}

/**
 * Рассчитать результат уклонения
 */
export function calculateDodgeResult(
  technique: Technique,
  character: Character,
  baseDodgeChance: number = 0
): DodgeResult {
  
  const effects = technique.effects;
  
  // Базовый шанс уклонения от техники
  let dodgeChance = effects?.dodgeChance || baseDodgeChance;
  
  // Масштабирование от интеллекта (5% за единицу выше 10)
  const intBonus = Math.max(0, character.intelligence - 10) * 0.05;
  dodgeChance *= (1 + intBonus);
  
  // Добавочный бонус от ловкости цели
  const agiBonus = Math.max(0, character.agility - 10) * 0.01; // +1% за единицу
  dodgeChance += agiBonus * 100;
  
  // Максимум 90%
  dodgeChance = Math.min(90, dodgeChance);
  
  // Проверка уклонения
  const dodged = Math.random() * 100 < dodgeChance;
  
  return {
    dodged,
    dodgeChance: Math.round(dodgeChance),
    counterBonus: effects?.counterBonus || 0,
  };
}

// ============================================
// ФУНКЦИИ УРОНА
// ============================================

/**
 * Рассчитать урон на заданной дистанции
 */
export function calculateDamageAtDistance(
  baseDamage: number,
  distance: number,
  range: CombatRange
): DamageAtDistanceResult {
  
  // Зона 1: Полный урон
  if (distance <= range.fullDamage) {
    return { 
      damage: Math.floor(baseDamage), 
      multiplier: 1.0, 
      isZero: false,
      zone: 1 
    };
  }
  
  // За пределами максимальной дальности
  if (distance >= range.max) {
    return { 
      damage: 0, 
      multiplier: 0, 
      isZero: true,
      zone: 3 
    };
  }
  
  // Зона 2: Линейное падение до 50%
  if (distance <= range.halfDamage) {
    const progress = (distance - range.fullDamage) / 
                     (range.halfDamage - range.fullDamage);
    const multiplier = 1.0 - 0.5 * progress;
    return { 
      damage: Math.floor(baseDamage * multiplier), 
      multiplier, 
      isZero: false,
      zone: 2 
    };
  }
  
  // Зона 3: Квадратичное затухание от 50% до 0%
  const progress = (distance - range.halfDamage) / 
                   (range.max - range.halfDamage);
  const multiplier = 0.5 * (1 - progress * progress);
  
  if (multiplier < MIN_DAMAGE_MULTIPLIER) {
    return { 
      damage: 0, 
      multiplier: 0, 
      isZero: true,
      zone: 3 
    };
  }
  
  return { 
    damage: Math.floor(baseDamage * multiplier), 
    multiplier, 
    isZero: false,
    zone: 3 
  };
}

// ============================================
// СИСТЕМА СТРУКТУРНОЙ ЁМКОСТИ ТЕХНИК
// ============================================

/**
 * Проверка дестабилизации при перегрузке техники
 * 
 * @param qiInput - поданное в технику Ци
 * @param techniqueCapacity - структурная ёмкость техники
 * @returns результат дестабилизации
 */
export function checkDestabilization(
  qiInput: number,
  techniqueCapacity: number
): DestabilizationResult {
  
  // Запас прочности: 110% ёмкости без последствий
  const safeLimit = techniqueCapacity * 1.1;
  
  if (qiInput <= safeLimit) {
    return {
      isDestabilized: false,
      efficiency: 1.0,
      effectiveQi: qiInput,
      excessQi: 0,
      backlashDamage: 0,
      backlashQiLoss: 0,
      message: `Техника стабильна`
    };
  }
  
  // Степень перегрузки
  const excessQi = qiInput - techniqueCapacity;
  const overloadRatio = qiInput / techniqueCapacity;
  
  // Эффективность падает при перегрузке
  // Формула: capacity / input (но минимум 10%)
  const efficiency = Math.max(0.1, techniqueCapacity / qiInput);
  
  // Эффективное Ци
  const effectiveQi = Math.floor(qiInput * efficiency);
  
  // Обратный удар (backlash)
  // 50% излишка = урон практику
  const backlashDamage = Math.floor(excessQi * 0.5);
  // Весь излишек теряется
  const backlashQiLoss = excessQi;
  
  return {
    isDestabilized: true,
    efficiency,
    effectiveQi,
    excessQi,
    backlashDamage,
    backlashQiLoss,
    message: `⚠️ Дестабилизация! Эффективность: ${Math.floor(efficiency * 100)}%, обратный удар: ${backlashDamage}`
  };
}

/**
 * Полный расчёт урона техники с учётом структурной ёмкости
 * 
 * @param technique - техника
 * @param character - персонаж (атакующий)
 * @param qiInput - поданное Ци
 * @param mastery - мастерство техники (0-100)
 * @param defenderLevel - уровень защитника (для Level Suppression)
 * @returns полный результат урона
 */
export function calculateTechniqueDamageFull(
  technique: Technique,
  character: Character,
  qiInput: number,
  mastery: number = 0,
  defenderLevel?: number
): TechniqueDamageResult {
  
  // 1. Структурная ёмкость техники
  const techniqueCapacity = calculateTechniqueCapacity(technique.level || 1, mastery);
  
  // 2. Проверка дестабилизации
  const stability = checkDestabilization(qiInput, techniqueCapacity);
  
  // 3. Эффективное Ци
  const effectiveQi = stability.effectiveQi;
  
  // 4. Качество Ци практика (геометрический рост ×2)
  const qiDensity = calculateQiDensity(character.cultivationLevel);
  
  // 5. Базовый урон = Ци × Качество
  let damage = effectiveQi * qiDensity;
  
  // 6. Масштабирование от характеристик
  const effects = technique.effects;
  const combatType = effects?.combatType as CombatTechniqueType | undefined;
  const statMultiplier = combatType 
    ? calculateStatScalingByType(character, combatType)
    : 1.0;
  damage *= statMultiplier;
  
  // 7. Бонус от мастерства (эффективность использования)
  // До +30% при 100% мастерства
  const masteryMultiplier = 1 + (mastery / 100) * 0.3;
  damage *= masteryMultiplier;
  
  // 8. Бонус от уровня техники
  // Техники высоких уровней эффективнее используют Ци: +5% за уровень
  const levelBonus = 1 + ((technique.level || 1) - 1) * 0.05;
  damage *= levelBonus;
  
  // === 9. LEVEL SUPPRESSION (v2.1) ===
  let levelSuppression: LevelSuppressionResult | undefined;
  let damageAfterSuppression: number | undefined;
  
  if (defenderLevel !== undefined) {
    // Определяем тип атаки
    const attackType: AttackType = determineAttackType(true, technique);
    
    // Рассчитываем подавление
    levelSuppression = calculateLevelSuppressionFull(
      character.cultivationLevel,
      defenderLevel,
      attackType,
      technique.level
    );
    
    // Применяем множитель подавления
    damageAfterSuppression = damage * levelSuppression.multiplier;
    damage = damageAfterSuppression;
  }
  
  // Формирование сообщения
  let message = '';
  if (stability.isDestabilized) {
    message = `⚔️ Дестабилизация! Урон: ${Math.floor(damage)} (эфф. ${Math.floor(stability.efficiency * 100)}%), обратный удар: ${stability.backlashDamage}`;
  } else if (levelSuppression && levelSuppression.wasSuppressed) {
    message = `⚔️ Урон: ${Math.floor(damage)} (подавление ×${levelSuppression.multiplier.toFixed(2)})`;
  } else {
    message = `✅ Урон: ${Math.floor(damage)} (Ци: ${effectiveQi} × плотность: ${qiDensity})`;
  }
  
  return {
    damage: Math.floor(damage),
    qiSpent: qiInput,
    effectiveQi,
    qiDensity,
    techniqueCapacity,
    isDestabilized: stability.isDestabilized,
    backlashDamage: stability.backlashDamage,
    backlashQiLoss: stability.backlashQiLoss,
    statMultiplier,
    masteryMultiplier,
    levelBonus,
    message,
    levelSuppression,
    damageAfterSuppression,
  };
}

/**
 * Таблица ёмкости техник по уровням
 */
export const TECHNIQUE_CAPACITY_TABLE: Record<number, { base: number; withMastery: number }> = {
  1: { base: 50, withMastery: 75 },
  2: { base: 100, withMastery: 150 },
  3: { base: 200, withMastery: 300 },
  4: { base: 400, withMastery: 600 },
  5: { base: 800, withMastery: 1200 },
  6: { base: 1600, withMastery: 2400 },
  7: { base: 3200, withMastery: 4800 },
  8: { base: 6400, withMastery: 9600 },
  9: { base: 12800, withMastery: 19200 },
};

// ============================================
// УТИЛИТЫ
// ============================================

/**
 * Форматировать дальность для отображения
 */
export function formatRange(range: CombatRange): string {
  if (range.fullDamage === range.halfDamage && range.halfDamage === range.max) {
    return `${range.max}м`;
  }
  return `${range.fullDamage}м / ${range.halfDamage}м / ${range.max}м`;
}

/**
 * Получить описание зоны урона
 */
export function getDamageZoneDescription(zone: 1 | 2 | 3): string {
  switch (zone) {
    case 1: return 'Полный урон';
    case 2: return 'Промежуточный урон';
    case 3: return 'Ослабленный урон';
  }
}

/**
 * Создать структуру CombatRange из простых значений
 */
export function createCombatRange(
  fullDamage: number,
  halfDamageMultiplier: number = 2,
  maxRangeMultiplier: number = 3
): CombatRange {
  return {
    fullDamage,
    halfDamage: fullDamage * halfDamageMultiplier,
    max: fullDamage * maxRangeMultiplier
  };
}

// ============================================
// СИСТЕМА РАЗВИТИЯ В БОЮ
// ============================================

import type {
  StatName,
  DeltaGeneratingAction,
} from '@/types/stat-development';

import { STAT_DEVELOPMENT_CONSTANTS } from './constants';

/**
 * Результат генерации дельты в бою
 */
export interface CombatDeltaResult {
  /** Целевая характеристика */
  targetStat: StatName;

  /** Количество виртуальной дельты */
  deltaGained: number;

  /** Тип действия */
  actionType: 'hit' | 'critical' | 'blocked' | 'dodge' | 'block' | 'parry';

  /** Источник */
  source: 'combat_hit' | 'combat_block' | 'combat_dodge';
}

/**
 * Определяет целевую характеристику для боевого действия
 *
 * @param actionType Тип боевого действия
 * @param weaponType Тип оружия (опционально)
 */
export function determineCombatTargetStat(
  actionType: 'attack' | 'defense' | 'dodge',
  weaponType?: string
): StatName {
  switch (actionType) {
    case 'attack':
      // Лёгкое оружие → ловкость, тяжёлое → сила
      if (weaponType === 'dagger' || weaponType === 'sword_light' || weaponType === 'fist') {
        return 'agility';
      }
      return 'strength';

    case 'defense':
      return 'strength';

    case 'dodge':
      return 'agility';

    default:
      return 'strength';
  }
}

/**
 * Генерирует дельту для успешной атаки
 *
 * @param isCritical Критический удар
 * @param weaponType Тип оружия
 * @param techniqueMultiplier Множитель от техники
 */
export function generateAttackDelta(
  isCritical: boolean = false,
  weaponType?: string,
  techniqueMultiplier: number = 1.0
): CombatDeltaResult {
  const targetStat = determineCombatTargetStat('attack', weaponType);
  const baseDelta = STAT_DEVELOPMENT_CONSTANTS.DELTA_SOURCES.combat_hit;

  let delta = baseDelta * techniqueMultiplier;
  if (isCritical) {
    delta *= 1.5; // +50% за крит
  }

  return {
    targetStat,
    deltaGained: delta,
    actionType: isCritical ? 'critical' : 'hit',
    source: 'combat_hit',
  };
}

/**
 * Генерирует дельту для заблокированной атаки
 *
 * @param weaponType Тип оружия
 */
export function generateBlockedAttackDelta(
  weaponType?: string
): CombatDeltaResult {
  const targetStat = determineCombatTargetStat('attack', weaponType);
  const baseDelta = STAT_DEVELOPMENT_CONSTANTS.DELTA_SOURCES.combat_block;

  return {
    targetStat,
    deltaGained: baseDelta,
    actionType: 'blocked',
    source: 'combat_block',
  };
}

/**
 * Генерирует дельту для защиты (блока)
 *
 * @param isParry Парирование (вместо блока)
 */
export function generateDefenseDelta(
  isParry: boolean = false
): CombatDeltaResult {
  const baseDelta = STAT_DEVELOPMENT_CONSTANTS.DELTA_SOURCES.combat_block;

  let delta = baseDelta;
  if (isParry) {
    delta *= 1.2; // +20% за парирование
  }

  return {
    targetStat: 'strength',
    deltaGained: delta,
    actionType: isParry ? 'parry' : 'block',
    source: 'combat_block',
  };
}

/**
 * Генерирует дельту для уклонения
 */
export function generateDodgeDelta(): CombatDeltaResult {
  const baseDelta = STAT_DEVELOPMENT_CONSTANTS.DELTA_SOURCES.combat_dodge;

  return {
    targetStat: 'agility',
    deltaGained: baseDelta,
    actionType: 'dodge',
    source: 'combat_dodge',
  };
}

/**
 * Создаёт DeltaGeneratingAction для боевого действия
 *
 * Используется для интеграции с системой развития.
 *
 * @param deltaResult Результат генерации дельты
 * @param fatigue Текущая усталость
 */
export function createCombatDeltaAction(
  deltaResult: CombatDeltaResult,
  fatigue: { physical: number; mental: number }
): DeltaGeneratingAction {
  // Штраф от усталости
  const physicalEfficiency =
    1 - Math.pow(fatigue.physical, 2) / 10000;
  const mentalEfficiency =
    1 - Math.pow(fatigue.mental, 2) / 10000;
  const fatiguePenalty = (physicalEfficiency + mentalEfficiency) / 2;

  return {
    type: deltaResult.source,
    intensity: 1.0,
    targetStat: deltaResult.targetStat,
    modifiers: {
      fatiguePenalty,
    },
  };
}

/**
 * Статистика дельты за бой
 */
export interface CombatDeltaStats {
  /** ID персонажа */
  characterId: string;

  /** Дельта силы */
  strengthDelta: number;

  /** Дельта ловкости */
  agilityDelta: number;

  /** Количество атак */
  attackCount: number;

  /** Критических ударов */
  criticalCount: number;

  /** Количество блоков */
  blockCount: number;

  /** Количество уклонений */
  dodgeCount: number;

  /** Количество заблокированных атак */
  blockedAttacks: number;
}

/**
 * Создаёт объект статистики дельты за бой
 */
export function createCombatDeltaStats(characterId: string): CombatDeltaStats {
  return {
    characterId,
    strengthDelta: 0,
    agilityDelta: 0,
    attackCount: 0,
    criticalCount: 0,
    blockCount: 0,
    dodgeCount: 0,
    blockedAttacks: 0,
  };
}

/**
 * Добавляет результат боя к статистике дельты
 */
export function addDeltaToStats(
  stats: CombatDeltaStats,
  result: CombatDeltaResult
): CombatDeltaStats {
  const newStats = { ...stats };

  // Добавляем дельту
  if (result.targetStat === 'strength') {
    newStats.strengthDelta += result.deltaGained;
  } else if (result.targetStat === 'agility') {
    newStats.agilityDelta += result.deltaGained;
  }

  // Обновляем счётчики
  switch (result.actionType) {
    case 'hit':
      newStats.attackCount++;
      break;
    case 'critical':
      newStats.attackCount++;
      newStats.criticalCount++;
      break;
    case 'blocked':
      newStats.blockedAttacks++;
      break;
    case 'block':
    case 'parry':
      newStats.blockCount++;
      break;
    case 'dodge':
      newStats.dodgeCount++;
      break;
  }

  return newStats;
}

/**
 * Формирует сообщение о развитии в бою
 */
export function formatCombatDeltaMessage(stats: CombatDeltaStats): string {
  const lines: string[] = [];

  lines.push(`⚔️ Развитие в бою:`);

  if (stats.strengthDelta > 0) {
    lines.push(`  💪 Сила: +${stats.strengthDelta.toFixed(4)}`);
  }

  if (stats.agilityDelta > 0) {
    lines.push(`  🏃 Ловкость: +${stats.agilityDelta.toFixed(4)}`);
  }

  lines.push(
    `  📊 Атак: ${stats.attackCount} (${stats.criticalCount} крит.), ` +
    `Защит: ${stats.blockCount}, Уклонений: ${stats.dodgeCount}`
  );

  return lines.join('\n');
}
