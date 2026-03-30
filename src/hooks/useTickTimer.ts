/**
 * useTickTimer Hook
 *
 * React hook for TickTimer system integration.
 * Provides time state and control functions for UI components.
 *
 * FUNDAMENTAL RULE:
 *   1 TICK = 1 SECOND REAL TIME (FIXED, NEVER CHANGES)
 *   Variable: HOW MUCH GAME TIME passes per tick
 */

'use client';

import { useCallback } from 'react';
import {
  useTimeStore,
  formatGameTime,
  type TickSpeedId,
  type GameTime,
  type TickSpeedConfig,
} from '@/stores/time.store';
import { tickTimer } from '@/lib/tick-timer';

// ==================== HOOK ====================

export function useTickTimer() {
  const {
    isPaused,
    isRunning,
    tickCount,
    speed,
    gameTime,
    speeds,
    setSpeed,
  } = useTimeStore();

  // === CONTROL FUNCTIONS ===

  const start = useCallback(() => {
    tickTimer.start();
  }, []);

  const pause = useCallback(() => {
    tickTimer.pause();
  }, []);

  const resume = useCallback(() => {
    tickTimer.resume();
  }, []);

  const stop = useCallback(() => {
    tickTimer.stop();
  }, []);

  // Smart toggle: handles start/resume/pause
  const togglePause = useCallback(() => {
    if (!isRunning) {
      // Timer not running → start it
      tickTimer.start();
    } else if (isPaused) {
      // Paused → resume
      tickTimer.resume();
    } else {
      // Running → pause
      tickTimer.pause();
    }
  }, [isRunning, isPaused]);

  const cycleSpeed = useCallback(() => {
    const speedIds = Object.keys(speeds) as TickSpeedId[];
    const currentIndex = speedIds.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speedIds.length;
    setSpeed(speedIds[nextIndex]);
  }, [speed, speeds, setSpeed]);

  // === COMPUTED VALUES ===

  const speedConfig: TickSpeedConfig = speeds[speed];
  const formattedTime = formatGameTime(gameTime);

  // Get all speeds for selector
  const speedOptions = Object.entries(speeds).map(([id, config]) => ({
    id: id as TickSpeedId,
    label: config.label,
    description: config.description,
    minutesPerTick: config.minutesPerTick,
  }));

  return {
    // === STATE ===
    isPaused,
    isRunning,
    tickCount,
    speed,
    gameTime,
    speeds,

    // === COMPUTED ===
    speedConfig,
    formattedTime,
    speedOptions,

    // === ACTIONS ===
    start,
    pause,
    resume,
    stop,
    togglePause,
    setSpeed,
    cycleSpeed,
  };
}

// ==================== UTILITY HOOKS ====================

/**
 * Hook to get formatted game time only (lightweight)
 */
export function useGameTimeDisplay(): string {
  const gameTime = useTimeStore((s) => s.gameTime);
  return formatGameTime(gameTime);
}

/**
 * Hook to get current speed config only (lightweight)
 */
export function useSpeedConfig(): TickSpeedConfig {
  const speed = useTimeStore((s) => s.speed);
  const speeds = useTimeStore((s) => s.speeds);
  return speeds[speed];
}

/**
 * Hook to check if timer is active (running and not paused)
 */
export function useIsTimerActive(): boolean {
  const isRunning = useTimeStore((s) => s.isRunning);
  const isPaused = useTimeStore((s) => s.isPaused);
  return isRunning && !isPaused;
}

// ==================== EXPORTS ====

export type { TickSpeedId, GameTime, TickSpeedConfig };
