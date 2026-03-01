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
 * Версия: 2.0
 * ============================================================================
 */

import type { 
  Technique, 
  CombatRange, 
  CombatTechniqueType,
  Character 
} from '@/types/game';

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
    return {
      min: 0,
      fullDamage: effects.range.fullDamage,
      halfDamage: effects.range.halfDamage,
      max: effects.range.max
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

/**
 * Проверить уклонение
 */
export function checkDodge(
  attackerPosition: { x: number; y: number },
  targetPosition: { x: number; y: number },
  baseDodgeChance: number,
  targetAgility: number
): boolean {
  const agilityBonus = Math.max(0, (targetAgility - 10) * 0.01);
  const totalDodgeChance = Math.min(0.9, baseDodgeChance + agilityBonus);
  
  return Math.random() < totalDodgeChance;
}

/**
 * Рассчитать итоговый урон атаки
 */
export function calculateAttackDamage(
  technique: Technique,
  character: Character,
  target: CombatTarget,
  distance: number,
  mastery: number = 0
): AttackResult {
  
  const effects = technique.effects;
  const combatType = effects?.combatType;
  
  // Защитные техники не наносят урон
  if (isDefenseTechnique(combatType)) {
    return {
      success: false,
      damage: 0,
      wasDodged: false,
      distance,
      multiplier: 0,
      message: 'Защитная техника не наносит урона'
    };
  }
  
  if (!effects?.damage) {
    return {
      success: false,
      damage: 0,
      wasDodged: false,
      distance,
      multiplier: 0,
      message: 'Техника не наносит урона'
    };
  }
  
  // Базовый урон
  let damage = effects.damage;
  
  // 1. Масштабирование от характеристик по типу техники
  const statMultiplier = calculateStatScalingByType(character, combatType as CombatTechniqueType);
  damage *= statMultiplier;
  
  // 2. Мастерство техники
  const masteryMultiplier = calculateMasteryMultiplier(mastery, 0.3);
  damage *= masteryMultiplier;
  
  // 3. Штраф за дальность (только для ranged)
  let distanceMultiplier = 1.0;
  let isZero = false;
  let zone: 1 | 2 | 3 = 1;
  
  if (isRangedTechnique(combatType) && effects.range) {
    const result = calculateDamageAtDistance(damage, distance, effects.range);
    damage = result.damage;
    distanceMultiplier = result.multiplier;
    isZero = result.isZero;
    zone = result.zone;
    
    if (isZero) {
      return {
        success: false,
        damage: 0,
        wasDodged: false,
        distance,
        multiplier: 0,
        message: `Техника рассеялась на расстоянии ${distance}м`
      };
    }
  }
  
  // 4. Для melee проверяем дистанцию
  if (isMeleeTechnique(combatType)) {
    if (distance > MELEE_MAX_RANGE) {
      return {
        success: false,
        damage: 0,
        wasDodged: false,
        distance,
        multiplier: 0,
        message: `Цель слишком далеко для ближнего боя (${distance}м > ${MELEE_MAX_RANGE}м)`
      };
    }
  }
  
  // 5. Проверка уклонения
  const baseDodgeChance = effects.dodgeChance || 0;
  const wasDodged = checkDodge(
    { x: 0, y: 0 },
    target.position,
    baseDodgeChance,
    10
  );
  
  if (wasDodged) {
    return {
      success: false,
      damage: 0,
      wasDodged: true,
      distance,
      multiplier: distanceMultiplier,
      message: `${target.name} уклонился от атаки!`
    };
  }
  
  // 6. Применение брони и пробития
  const penetration = effects.penetration || 0;
  const effectiveArmor = target.armor * (1 - penetration / 100);
  damage = Math.max(1, damage - effectiveArmor);
  
  // 7. Элементальный эффект
  let elementalDamage = undefined;
  if (effects.elementalEffect) {
    elementalDamage = {
      type: effects.elementalEffect.type,
      damagePerTurn: effects.elementalEffect.damagePerTurn || 0,
      duration: effects.elementalEffect.duration
    };
  }
  
  // Формирование сообщения
  let message = '';
  if (zone === 1) {
    message = `Полный удар! ${damage} урона`;
  } else if (zone === 2) {
    message = `Удар на дистанции: ${Math.floor(distanceMultiplier * 100)}% урона = ${damage}`;
  } else {
    message = `Ослабленный удар: ${Math.floor(distanceMultiplier * 100)}% урона = ${damage}`;
  }
  
  return {
    success: true,
    damage: Math.floor(damage),
    wasDodged: false,
    distance,
    multiplier: distanceMultiplier,
    elementalDamage,
    message
  };
}

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
