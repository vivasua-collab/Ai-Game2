/**
 * ============================================================================
 * СИСТЕМА БОЕВЫХ ТЕХНИК
 * ============================================================================
 * 
 * Содержит функции расчёта урона для боевых техник:
 * - Melee (ближний бой): усиление ударов, усиление оружия
 * - Ranged (дальний бой): снаряды, лучи, AOE с падением урона
 * 
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

// ============================================
// ОСНОВНЫЕ ФУНКЦИИ
// ============================================

/**
 * Рассчитать урон на заданной дистанции
 * 
 * Зона 1 (0 → fullDamage): 100% урона
 * Зона 2 (fullDamage → halfDamage): линейное падение 100% → 50%
 * Зона 3 (halfDamage → max): квадратичное затухание 50% → 0%
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
  // Квадратичное затухание: быстрее падает к концу
  const multiplier = 0.5 * (1 - progress * progress);
  
  // Если множитель слишком мал, считаем что техника рассеялась
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

/**
 * Рассчитать множитель урона от характеристик
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

/**
 * Проверить уклонение
 */
export function checkDodge(
  attackerPosition: { x: number; y: number },
  targetPosition: { x: number; y: number },
  baseDodgeChance: number,
  targetAgility: number
): boolean {
  // Базовый шанс уклонения + бонус от ловкости
  const agilityBonus = Math.max(0, (targetAgility - 10) * 0.01); // +1% за каждую единицу выше 10
  const totalDodgeChance = Math.min(0.9, baseDodgeChance + agilityBonus); // Максимум 90%
  
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
  mastery: number = 0,
  scaling?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  }
): AttackResult {
  
  const effects = technique.effects;
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
  
  // 1. Масштабирование от характеристик
  const statMultiplier = calculateStatScaling(character, scaling);
  damage *= statMultiplier;
  
  // 2. Мастерство техники
  const masteryMultiplier = calculateMasteryMultiplier(mastery, 0.3);
  damage *= masteryMultiplier;
  
  // 3. Штраф за дальность (только для ranged)
  let distanceMultiplier = 1.0;
  let isZero = false;
  let zone: 1 | 2 | 3 = 1;
  
  if (isRangedTechnique(effects.combatType) && effects.range) {
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
  if (isMeleeTechnique(effects.combatType)) {
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
    { x: 0, y: 0 }, // Позиция атакующего (упрощённо)
    target.position,
    baseDodgeChance,
    10 // Ловкость цели (упрощённо)
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
