/**
 * Combat Utilities
 * 
 * Shared combat calculation functions for Phaser game
 */

/**
 * Данные о дальности техники
 */
export interface RangeData {
  fullDamage: number;  // Дальность полного урона (в метрах)
  halfDamage: number;  // Дальность половинного урона (в метрах)
  max: number;         // Максимальная дальность (в метрах)
}

/**
 * Результат проверки попадания
 */
export interface HitResult {
  hit: boolean;
  damageZone: 'full' | 'half' | 'falloff' | 'none';
  damageMultiplier: number;  // Точный множитель урона (0.0 - 1.0)
  distance: number;
}

/**
 * Рассчитать множитель урона на основе расстояния (линейное затухание)
 * Для AOE техник с линейным затуханием урона
 * 
 * @param distance Дистанция до цели (в пикселях)
 * @param fullDamageRange Дистанция полного урона (в пикселях)
 * @param maxRange Максимальная дистанция (в пикселях)
 * @returns Множитель урона от 0.0 до 1.0
 */
export function calculateLinearDamageFalloff(
  distance: number,
  fullDamageRange: number,
  maxRange: number
): number {
  // В зоне полного урона
  if (distance <= fullDamageRange) {
    return 1.0;
  }
  
  // За пределами максимальной дальности
  if (distance >= maxRange) {
    return 0.0;
  }
  
  // Линейное затухание от fullDamageRange до maxRange
  const falloffRange = maxRange - fullDamageRange;
  const distanceInFalloff = distance - fullDamageRange;
  
  // Урон падает от 100% до 0% линейно
  return 1.0 - (distanceInFalloff / falloffRange);
}

/**
 * Check if target is in attack cone with hitbox consideration
 * Returns hit result with damage zone info and exact multiplier
 * 
 * Damage zones:
 * - full: distance <= fullDamageRange (100% damage)
 * - half: distance <= halfDamageRange (50% damage)  
 * - falloff: linear falloff from fullDamageRange to maxRange
 * - none: distance > maxRange
 */
export function checkAttackHit(
  playerX: number,
  playerY: number,
  playerRotation: number,
  targetX: number,
  targetY: number,
  coneAngle: number,
  fullDamageRange: number,
  halfDamageRange: number,
  maxRange: number,
  targetHitboxRadius: number = 0
): HitResult {
  const dx = targetX - playerX;
  const dy = targetY - playerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Проверка максимальной дальности (с учётом хитбокса)
  if (distance > maxRange + targetHitboxRadius) {
    return { hit: false, damageZone: 'none', damageMultiplier: 0, distance };
  }

  // Angle to target
  const angleToTarget = Math.atan2(dy, dx) * 180 / Math.PI;
  const normalizedTarget = ((angleToTarget % 360) + 360) % 360;
  
  // Player rotation (convert to degrees, where 0 = right)
  const normalizedRotation = ((playerRotation % 360) + 360) % 360;

  // Difference
  let angleDiff = Math.abs(normalizedTarget - normalizedRotation);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;

  // Не в конусе
  if (angleDiff > coneAngle / 2) {
    return { hit: false, damageZone: 'none', damageMultiplier: 0, distance };
  }

  // Определяем зону урона и множитель
  let damageZone: 'full' | 'half' | 'falloff' | 'none' = 'none';
  let damageMultiplier = 0;
  
  if (distance <= fullDamageRange + targetHitboxRadius) {
    // Зона полного урона (100%)
    damageZone = 'full';
    damageMultiplier = 1.0;
  } else if (distance <= halfDamageRange + targetHitboxRadius) {
    // Зона половинного урона (50%)
    damageZone = 'half';
    damageMultiplier = 0.5;
  } else if (distance <= maxRange + targetHitboxRadius) {
    // Зона линейного затухания (от 50% до 0%)
    damageZone = 'falloff';
    // Линейное затухание от halfDamageRange до maxRange
    const falloffDistance = distance - halfDamageRange;
    const totalFalloffRange = maxRange - halfDamageRange;
    damageMultiplier = Math.max(0, 0.5 * (1 - falloffDistance / totalFalloffRange));
  }

  return { hit: damageMultiplier > 0, damageZone, damageMultiplier, distance };
}

/**
 * Get element color for visual effects
 */
export function getElementColor(element: string): number {
  const colors: Record<string, number> = {
    fire: 0xff6622,
    water: 0x4488ff,
    earth: 0x886622,
    air: 0xaaccff,
    lightning: 0xffff00,
    void: 0x9944ff,
    neutral: 0x4ade80,
  };
  return colors[element] || colors.neutral;
}
