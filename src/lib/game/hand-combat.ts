/**
 * Hand Combat System
 * 
 * Calculates hand attack damage and cooldown based on character stats.
 * 
 * @see docs/combat-system.md
 * @see docs/implementation/phase-8-attack-system.md
 */

import type { Technique } from '@/types/game';

// ==================== CONSTANTS ====================

/** Base hand damage */
export const BASE_HAND_DAMAGE = 3;

/** Damage bonus per STR above 10 */
export const STRENGTH_DAMAGE_BONUS = 0.3;

/** Base attack cooldown in milliseconds */
export const BASE_ATTACK_COOLDOWN = 1000;

/** Minimum attack cooldown in milliseconds */
export const MIN_ATTACK_COOLDOWN = 200;

/** Cooldown reduction per AGI above 10 (ms) */
export const AGILITY_COOLDOWN_BONUS = 15;

// ==================== FUNCTIONS ====================

/**
 * Calculate hand damage based on strength
 * 
 * Formula: handDamage = 3 + (STR-10) * 0.3
 * 
 * @param strength - Character strength stat
 * @returns Damage dealt by hand attack
 */
export function calculateHandDamage(strength: number): number {
  const strBonus = Math.max(0, strength - 10) * STRENGTH_DAMAGE_BONUS;
  return Math.floor(BASE_HAND_DAMAGE + strBonus);
}

/**
 * Calculate attack cooldown based on agility
 * 
 * Formula: cooldown = max(200ms, 1000ms - (AGI-10) * 15ms)
 * 
 * @param agility - Character agility stat
 * @returns Cooldown in milliseconds
 */
export function calculateAttackCooldown(agility: number): number {
  const agiBonus = Math.max(0, agility - 10) * AGILITY_COOLDOWN_BONUS;
  return Math.max(MIN_ATTACK_COOLDOWN, BASE_ATTACK_COOLDOWN - agiBonus);
}

/**
 * Calculate technique damage for slot 1 (melee_strike only)
 * 
 * @param technique - Technique in slot 1
 * @param strength - Character strength
 * @param mastery - Technique mastery (0-100)
 * @returns Additional damage from technique
 */
export function calculateSlot1TechniqueDamage(
  technique: Technique | null,
  strength: number,
  mastery: number
): number {
  if (!technique || technique.subtype !== 'melee_strike') return 0;
  
  const baseDamage = technique.effects?.damage || 0;
  const strMultiplier = 1 + Math.max(0, strength - 10) * 0.05;
  const masteryMultiplier = 1 + (mastery / 100) * 0.3;
  
  return Math.floor(baseDamage * strMultiplier * masteryMultiplier);
}

// ==================== RESULT TYPE ====================

/**
 * Result of hand attack calculation
 */
export interface HandAttackResult {
  /** Total damage (hand + technique) */
  damage: number;
  /** Attack cooldown in ms */
  cooldown: number;
  /** Damage from hand only */
  handDamage: number;
  /** Additional damage from technique */
  techniqueDamage: number;
  /** Technique name if used */
  techniqueName: string | null;
  /** Human-readable breakdown */
  breakdown: string;
}

// ==================== MAIN FUNCTION ====================

/**
 * Calculate complete hand attack result
 * 
 * @param strength - Character strength
 * @param agility - Character agility
 * @param technique - Technique in slot 1 (optional)
 * @param mastery - Technique mastery (0-100)
 * @returns Complete attack calculation result
 */
export function calculateHandAttack(
  strength: number,
  agility: number,
  technique: Technique | null = null,
  mastery: number = 0
): HandAttackResult {
  const handDamage = calculateHandDamage(strength);
  const cooldown = calculateAttackCooldown(agility);
  const techniqueDamage = calculateSlot1TechniqueDamage(technique, strength, mastery);
  const damage = handDamage + techniqueDamage;
  const techniqueName = technique?.name || null;
  
  let breakdown = `hand:${handDamage}`;
  if (techniqueDamage > 0) breakdown += ` + tech:${techniqueDamage}`;
  breakdown += ` = ${damage}`;

  return { damage, cooldown, handDamage, techniqueDamage, techniqueName, breakdown };
}

/**
 * Check if attack is on cooldown
 * 
 * @param lastAttackTime - Timestamp of last attack
 * @param cooldown - Calculated cooldown in ms
 * @returns true if attack is allowed
 */
export function canAttack(lastAttackTime: number, cooldown: number): boolean {
  return Date.now() - lastAttackTime >= cooldown;
}

/**
 * Get cooldown progress (for UI)
 * 
 * @param lastAttackTime - Timestamp of last attack
 * @param cooldown - Calculated cooldown in ms
 * @returns Progress 0-1 (1 = ready)
 */
export function getCooldownProgress(lastAttackTime: number, cooldown: number): number {
  const elapsed = Date.now() - lastAttackTime;
  return Math.min(1, elapsed / cooldown);
}
