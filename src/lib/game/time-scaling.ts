/**
 * Time Scaling Module
 *
 * Provides functions for scaling game mechanics based on time speed.
 *
 * FUNDAMENTAL RULE:
 *   1 TICK = 1 SECOND REAL TIME (FIXED, NEVER CHANGES)
 *   Variable: minutesPerTick = game minutes per tick
 *
 * Scaling Factor = 1 / minutesPerTick (normalized to 'normal' speed = 1 min/tick)
 *
 * Higher scaling factor = faster perceived movement, shorter cooldowns in game time
 * Lower scaling factor = slower perceived movement, longer cooldowns in game time
 */

import { TickSpeedId, TICK_SPEEDS } from '@/stores/time.store';

// ==================== SCALING FACTORS ====================

/**
 * Time scaling factors normalized to 'normal' (1 min/tick)
 *
 * Formula: 1 / minutesPerTick
 *
 * Interpretation:
 * - Factor > 1: Time is slower, actions feel faster (combat mode)
 * - Factor < 1: Time is faster, actions feel slower (travel mode)
 * - Factor = 1: Normal speed
 */
export const TIME_SCALING_FACTORS: Record<TickSpeedId, number> = {
  superSuperSlow: 4.0,    // 1 / 0.25 = 4x (combat - very detailed)
  slow: 2.0,             // 1 / 0.5 = 2x (бывший "Точный")
  normal: 1.0,           // 1 / 1 = 1x (base)
  fast: 0.2,             // 1 / 5 = 0.2x (travel)
  ultra: 0.017,          // 1 / 60 = 0.017x (meditation) - ограничено!
};

/**
 * Get scaling factor for a given speed
 */
export function getScalingFactor(speed: TickSpeedId): number {
  return TIME_SCALING_FACTORS[speed];
}

/**
 * Get inverse scaling factor (for "slower" perception)
 * Used when time is fast and actions should feel slower
 */
export function getInverseScalingFactor(speed: TickSpeedId): number {
  return 1 / TIME_SCALING_FACTORS[speed];
}

// ==================== MOVEMENT SCALING ====================

/**
 * Scale movement speed based on time speed
 *
 * Higher scaling factor = faster perceived movement
 * This makes movement feel "rushed" in slow time (combat)
 * and "relaxed" in fast time (travel)
 *
 * @param baseSpeed - Speed at normal time (pixels per second)
 * @param speed - Current time speed
 * @returns Scaled speed in pixels per second
 */
export function scaleMovementSpeed(baseSpeed: number, speed: TickSpeedId): number {
  return baseSpeed * TIME_SCALING_FACTORS[speed];
}

/**
 * Scale movement speed with inverse perception
 * Use this when you want movement to feel slower in fast time
 *
 * @param baseSpeed - Speed at normal time
 * @param speed - Current time speed
 * @returns Scaled speed with inverse perception
 */
export function scaleMovementSpeedInverse(baseSpeed: number, speed: TickSpeedId): number {
  return baseSpeed / TIME_SCALING_FACTORS[speed];
}

// ==================== COOLDOWN SCALING ====================

/**
 * Scale cooldown based on time speed
 *
 * Higher scaling factor = shorter cooldown in game time
 * Cooldowns in REAL time are always consistent (1 tick = 1 sec)
 *
 * @param baseCooldownMinutes - Cooldown in game minutes at normal time
 * @param speed - Current time speed
 * @returns Scaled cooldown in game minutes
 */
export function scaleCooldown(baseCooldownMinutes: number, speed: TickSpeedId): number {
  return baseCooldownMinutes / TIME_SCALING_FACTORS[speed];
}

/**
 * Convert game minutes to real milliseconds
 * Used for animations and timed actions
 *
 * @param gameMinutes - Duration in game minutes
 * @param speed - Current time speed
 * @returns Duration in real milliseconds
 */
export function gameMinutesToRealMs(gameMinutes: number, speed: TickSpeedId): number {
  const minutesPerTick = TICK_SPEEDS[speed].minutesPerTick;
  // 1 tick = 1 second = 1000ms
  // gameMinutes / minutesPerTick = number of ticks
  // ticks * 1000 = real ms
  return (gameMinutes / minutesPerTick) * 1000;
}

/**
 * Convert real milliseconds to game minutes
 *
 * @param realMs - Duration in real milliseconds
 * @param speed - Current time speed
 * @returns Duration in game minutes
 */
export function realMsToGameMinutes(realMs: number, speed: TickSpeedId): number {
  const minutesPerTick = TICK_SPEEDS[speed].minutesPerTick;
  // realMs / 1000 = seconds = ticks
  // ticks * minutesPerTick = game minutes
  return (realMs / 1000) * minutesPerTick;
}

// ==================== ACTION DURATIONS ====================

/**
 * Base action durations in game minutes
 * These represent how long actions take in game time
 */
export const ACTION_DURATIONS = {
  // === Combat ===
  BASIC_ATTACK: 1,           // 1 game minute
  TECHNIQUE_FAST: 0.5,       // 30 game seconds
  TECHNIQUE_NORMAL: 2,       // 2 game minutes
  TECHNIQUE_ULTIMATE: 5,     // 5 game minutes

  // === Movement ===
  STEP_BASE: 0.1,            // 6 game seconds (base step)
  RUN_SPEED: 1,              // 1 minute per "cell"
  DASH: 0.05,                // 3 game seconds

  // === Cultivation ===
  MEDITATION_TICK: 60,       // 1 hour (meditation per tick)
  QI_ABSORPTION: 5,          // 5 minutes
  BREAKTHROUGH: 480,         // 8 hours

  // === NPC ===
  NPC_IDLE: 0.25,            // 15 game seconds
  NPC_PATROL_STEP: 0.5,      // 30 game seconds
  NPC_ATTACK: 1,             // 1 game minute

  // === Recovery ===
  REST_HOUR: 60,             // 1 hour
  SLEEP_CYCLE: 480,          // 8 hours
} as const;

/**
 * Calculate real duration for an action
 *
 * @param actionDuration - Duration in game minutes (use ACTION_DURATIONS)
 * @param speed - Current time speed
 * @returns Duration in real milliseconds
 */
export function calculateRealDuration(
  actionDuration: number,
  speed: TickSpeedId
): number {
  return gameMinutesToRealMs(actionDuration, speed);
}

// ==================== UTILITY ====================

/**
 * Get human-readable description of time perception
 */
export function getTimePerception(speed: TickSpeedId): string {
  const factor = TIME_SCALING_FACTORS[speed];

  if (factor > 10) {
    return 'Очень детальное время (бой)';
  } else if (factor > 1) {
    return 'Замедленное время';
  } else if (factor === 1) {
    return 'Обычное время';
  } else if (factor > 0.1) {
    return 'Ускоренное время (путешествие)';
  } else {
    return 'Максимально ускоренное время (медитация)';
  }
}

/**
 * Get speed multiplier description for UI
 */
export function getSpeedMultiplierLabel(speed: TickSpeedId): string {
  const factor = TIME_SCALING_FACTORS[speed];

  if (factor > 1) {
    return `×${factor.toFixed(0)} медленнее`;
  } else if (factor < 1) {
    return `×${(1 / factor).toFixed(1)} быстрее`;
  } else {
    return 'Обычная скорость';
  }
}

/**
 * Check if current speed is combat-appropriate
 */
export function isCombatSpeed(speed: TickSpeedId): boolean {
  return speed === 'superSuperSlow' || speed === 'slow';
}

/**
 * Check if current speed is travel-appropriate
 */
export function isTravelSpeed(speed: TickSpeedId): boolean {
  return speed === 'fast' || speed === 'ultra';
}
