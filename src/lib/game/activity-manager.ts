/**
 * Activity Manager
 *
 * Manages current game activity and automatic time speed switching.
 *
 * Single source of truth for what the player is currently doing.
 * Automatically switches time speed based on activity changes.
 */

import { useTimeStore, TickSpeedId } from '@/stores/time.store';
import {
  GameActivity,
  ACTION_SPEED_PROFILES,
  ActionSpeedProfile,
  getActivityName,
} from './action-speeds';

// ==================== TYPES ====================

export interface ActivityChangeEvent {
  previousActivity: GameActivity;
  newActivity: GameActivity;
  previousSpeed: TickSpeedId;
  newSpeed: TickSpeedId;
  timestamp: number;
}

export type ActivityChangeListener = (event: ActivityChangeEvent) => void;

// ==================== ACTIVITY MANAGER CLASS ====================

/**
 * ActivityManager - Singleton
 *
 * Manages game activity and automatic time speed switching.
 */
class ActivityManager {
  private currentActivity: GameActivity = 'exploration';
  private previousSpeed: TickSpeedId = 'normal';
  private speedStack: TickSpeedId[] = [];  // Stack for nested activities
  private listeners: ActivityChangeListener[] = [];

  /**
   * Set current activity and optionally switch time speed
   *
   * @param activity - New activity
   * @param forceSwitch - Force switch even if autoSwitch is false
   */
  setActivity(activity: GameActivity, forceSwitch: boolean = false): ActivityChangeEvent | null {
    const profile = ACTION_SPEED_PROFILES[activity];
    const timeStore = useTimeStore.getState();

    // No change
    if (this.currentActivity === activity) {
      return null;
    }

    const previousActivity = this.currentActivity;
    const previousSpeed = timeStore.speed;

    // Remember previous speed if configured
    if (profile.rememberPrevious) {
      this.previousSpeed = previousSpeed;
      this.speedStack.push(previousSpeed);
    }

    this.currentActivity = activity;

    // Determine if we should switch
    const shouldSwitch = profile.autoSwitch || forceSwitch;

    let newSpeed = previousSpeed;
    if (shouldSwitch) {
      newSpeed = profile.preferredSpeed;
      timeStore.setSpeed(newSpeed);
    }

    const event: ActivityChangeEvent = {
      previousActivity,
      newActivity: activity,
      previousSpeed,
      newSpeed,
      timestamp: Date.now(),
    };

    // Notify listeners
    this.notifyListeners(event);

    console.log(
      `[ActivityManager] Activity: ${getActivityName(previousActivity)} → ${getActivityName(activity)}, ` +
      `Speed: ${previousSpeed} → ${newSpeed}`
    );

    return event;
  }

  /**
   * End current activity and return to previous
   *
   * @returns The activity change event or null if no change
   */
  endActivity(): ActivityChangeEvent | null {
    if (this.speedStack.length === 0) {
      // No previous speed to restore
      return null;
    }

    const previousSpeed = this.speedStack.pop()!;
    const timeStore = useTimeStore.getState();
    const previousActivity = this.currentActivity;

    // Determine new activity based on stack
    const newActivity: GameActivity = 'exploration'; // Default to exploration

    this.currentActivity = newActivity;
    timeStore.setSpeed(previousSpeed);

    const event: ActivityChangeEvent = {
      previousActivity,
      newActivity,
      previousSpeed: timeStore.speed,
      newSpeed: previousSpeed,
      timestamp: Date.now(),
    };

    this.notifyListeners(event);

    console.log(
      `[ActivityManager] Activity ended: ${getActivityName(previousActivity)} → ${getActivityName(newActivity)}, ` +
      `Speed restored: ${previousSpeed}`
    );

    return event;
  }

  /**
   * Get current activity
   */
  getActivity(): GameActivity {
    return this.currentActivity;
  }

  /**
   * Get current activity profile
   */
  getProfile(): ActionSpeedProfile {
    return ACTION_SPEED_PROFILES[this.currentActivity];
  }

  /**
   * Get previous speed (for restoration)
   */
  getPreviousSpeed(): TickSpeedId {
    return this.previousSpeed;
  }

  /**
   * Restore previous time speed manually
   */
  restorePreviousSpeed(): void {
    const timeStore = useTimeStore.getState();
    timeStore.setSpeed(this.previousSpeed);
    console.log(`[ActivityManager] Speed manually restored: ${this.previousSpeed}`);
  }

  /**
   * Check if current activity is combat
   */
  isInCombat(): boolean {
    return this.currentActivity === 'combat';
  }

  /**
   * Check if current activity is meditation
   */
  isMeditating(): boolean {
    return this.currentActivity === 'meditation';
  }

  /**
   * Check if current activity is travel
   */
  isTraveling(): boolean {
    return this.currentActivity === 'travel';
  }

  /**
   * Check if current activity is rest
   */
  isResting(): boolean {
    return this.currentActivity === 'rest';
  }

  /**
   * Add activity change listener
   */
  addListener(listener: ActivityChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(event: ActivityChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[ActivityManager] Listener error:', error);
      }
    });
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.currentActivity = 'exploration';
    this.previousSpeed = 'normal';
    this.speedStack = [];
    console.log('[ActivityManager] Reset to initial state');
  }
}

// ==================== SINGLETON EXPORT ====================

export const activityManager = new ActivityManager();

// ==================== CONVENIENCE FUNCTIONS ====================

/**
 * Start combat mode
 */
export function startCombat(): void {
  activityManager.setActivity('combat');
}

/**
 * End combat mode
 */
export function endCombat(): void {
  if (activityManager.isInCombat()) {
    activityManager.endActivity();
  }
}

/**
 * Start travel mode
 */
export function startTravel(): void {
  activityManager.setActivity('travel');
}

/**
 * End travel mode
 */
export function endTravel(): void {
  if (activityManager.isTraveling()) {
    activityManager.endActivity();
  }
}

/**
 * Start meditation mode
 */
export function startMeditation(): void {
  activityManager.setActivity('meditation');
}

/**
 * End meditation mode
 */
export function endMeditation(): void {
  if (activityManager.isMeditating()) {
    activityManager.endActivity();
  }
}

/**
 * Start rest mode
 */
export function startRest(): void {
  activityManager.setActivity('rest');
}

/**
 * End rest mode
 */
export function endRest(): void {
  if (activityManager.isResting()) {
    activityManager.endActivity();
  }
}
