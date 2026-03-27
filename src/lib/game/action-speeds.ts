/**
 * Action Speed Profiles
 *
 * Defines preferred time speeds for different game activities.
 * Used for automatic time speed switching.
 *
 * Based on user decisions (2026-03-24):
 * 1. Different speeds for different actions? YES
 * 2. Meditation makes everything instant? YES (ultra speed)
 * 3. Combat mode time? YES (auto-switch to superSuperSlow)
 */

import { TickSpeedId } from '@/stores/time.store';

// ==================== TYPES ====================

/**
 * Game activity types that can trigger time speed changes
 */
export type GameActivity =
  | 'exploration'    // Exploring a location
  | 'travel'         // Traveling between locations
  | 'combat'         // In combat
  | 'meditation'     // Cultivating/meditating
  | 'dialogue'       // Talking with NPC
  | 'crafting'       // Creating items
  | 'rest';          // Resting/sleeping

/**
 * Speed profile for an activity
 */
export interface ActionSpeedProfile {
  activity: GameActivity;
  preferredSpeed: TickSpeedId;
  autoSwitch: boolean;        // Should auto-switch to this speed
  rememberPrevious: boolean;  // Remember previous speed for restoration
  description: string;
}

// ==================== PROFILES ====================

/**
 * Speed profiles for all game activities
 *
 * Decision matrix:
 * - Combat: superSuperSlow (tactical control)
 * - Travel: fast (accelerated movement)
 * - Meditation: ultra (maximum acceleration)
 * - Rest: ultra (fast time passage)
 * - Exploration: normal (standard)
 * - Dialogue: slow (for detail)
 * - Crafting: normal (standard)
 */
export const ACTION_SPEED_PROFILES: Record<GameActivity, ActionSpeedProfile> = {
  exploration: {
    activity: 'exploration',
    preferredSpeed: 'normal',
    autoSwitch: false,  // Manual control
    rememberPrevious: true,
    description: 'Стандартная скорость для исследования',
  },
  travel: {
    activity: 'travel',
    preferredSpeed: 'fast',
    autoSwitch: true,   // Auto-switch when leaving location
    rememberPrevious: true,
    description: 'Ускоренное время при путешествии',
  },
  combat: {
    activity: 'combat',
    preferredSpeed: 'superSuperSlow',
    autoSwitch: true,   // Auto-switch when combat starts
    rememberPrevious: true,
    description: 'Замедленное время для тактического боя',
  },
  meditation: {
    activity: 'meditation',
    preferredSpeed: 'ultra',
    autoSwitch: true,   // Auto-switch when meditating
    rememberPrevious: true,
    description: 'Максимальное ускорение при культивации',
  },
  dialogue: {
    activity: 'dialogue',
    preferredSpeed: 'slow',
    autoSwitch: true,   // Auto-switch when talking
    rememberPrevious: true,
    description: 'Замедленное время для диалогов',
  },
  crafting: {
    activity: 'crafting',
    preferredSpeed: 'normal',
    autoSwitch: false,  // Manual control
    rememberPrevious: true,
    description: 'Обычное время для крафта',
  },
  rest: {
    activity: 'rest',
    preferredSpeed: 'ultra',
    autoSwitch: true,   // Auto-switch when resting
    rememberPrevious: true,
    description: 'Ускорение времени при отдыхе',
  },
};

// ==================== HELPERS ====================

/**
 * Get profile for a specific activity
 */
export function getActivityProfile(activity: GameActivity): ActionSpeedProfile {
  return ACTION_SPEED_PROFILES[activity];
}

/**
 * Get preferred speed for an activity
 */
export function getPreferredSpeed(activity: GameActivity): TickSpeedId {
  return ACTION_SPEED_PROFILES[activity].preferredSpeed;
}

/**
 * Check if activity should auto-switch
 */
export function shouldAutoSwitch(activity: GameActivity): boolean {
  return ACTION_SPEED_PROFILES[activity].autoSwitch;
}

/**
 * Get all activities that auto-switch
 */
export function getAutoSwitchActivities(): GameActivity[] {
  return Object.values(ACTION_SPEED_PROFILES)
    .filter(profile => profile.autoSwitch)
    .map(profile => profile.activity);
}

/**
 * Get activity name in Russian
 */
export function getActivityName(activity: GameActivity): string {
  const names: Record<GameActivity, string> = {
    exploration: 'Исследование',
    travel: 'Путешествие',
    combat: 'Бой',
    meditation: 'Медитация',
    dialogue: 'Диалог',
    crafting: 'Крафт',
    rest: 'Отдых',
  };
  return names[activity];
}

/**
 * Get activity description
 */
export function getActivityDescription(activity: GameActivity): string {
  return ACTION_SPEED_PROFILES[activity].description;
}
