/**
 * Tick Timer
 *
 * Independent tick timer that runs in the background.
 * Sends events via window.dispatchEvent for React and Phaser integration.
 *
 * FUNDAMENTAL RULE:
 *   1 TICK = 1 SECOND REAL TIME (FIXED, NEVER CHANGES)
 *   Variable: HOW MUCH GAME TIME passes per tick
 */

import { useTimeStore, type TickSpeedId, type GameTime } from '@/stores/time.store';
import { useGameStore } from '@/stores/game.store';
import { getQiTickProcessor, type QiTickProcessor } from '@/lib/game/qi-tick-processor';

// ==================== TYPES ====================

/** Tick event detail sent to listeners */
export interface TickEventDetail {
  tickCount: number;
  gameTime: GameTime;
  speed: TickSpeedId;
  minutesPerTick: number;
  timestamp: number;
}

/** Timer event names */
export type TickTimerEvent =
  | 'timer:start'
  | 'timer:stop'
  | 'timer:pause'
  | 'timer:resume'
  | 'game:tick';

// ==================== TICK TIMER CLASS ====================

class TickTimer {
  private static instance: TickTimer | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /** 1 tick = 1 second real time (FIXED) */
  private readonly INTERVAL_MS = 1000;

  /** Qi processor for batch effects */
  private qiProcessor: QiTickProcessor | null = null;

  private constructor() {
    // Singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TickTimer {
    if (!TickTimer.instance) {
      TickTimer.instance = new TickTimer();
    }
    return TickTimer.instance;
  }

  // ==================== QI PROCESSOR ====================

  /**
   * Set Qi processor for tick effects
   */
  setQiProcessor(processor: QiTickProcessor): void {
    this.qiProcessor = processor;
    console.log('[TickTimer] Qi processor set');
  }

  /**
   * Get current Qi processor
   */
  getQiProcessor(): QiTickProcessor | null {
    return this.qiProcessor;
  }

  /**
   * Initialize default Qi processor
   */
  initDefaultQiProcessor(): void {
    this.qiProcessor = getQiTickProcessor();
    console.log('[TickTimer] Default Qi processor initialized');
  }

  // ==================== PUBLIC API ====================

  /**
   * Start the tick timer
   */
  start(): void {
    if (this.intervalId !== null) {
      console.warn('[TickTimer] Already running, ignoring start()');
      return;
    }

    console.log('[TickTimer] Starting...');

    // СНАЧАЛА сбрасываем паузу в store
    useTimeStore.getState()._setPaused(false);
    useTimeStore.getState()._setRunning(true);

    // Sync to game.store
    useGameStore.getState().setIsPaused(false);

    // ПОТОМ запускаем интервал
    this.intervalId = setInterval(() => {
      this.processTick();
    }, this.INTERVAL_MS);

    // И мгновенно делаем первый тик!
    // Это обеспечивает немедленное обновление UI
    this.processTick();

    // Emit start event
    const store = useTimeStore.getState();
    this.emitEvent('timer:start', {
      tickCount: store.tickCount,
      timestamp: Date.now(),
    });

    console.log('[TickTimer] Started successfully');
  }

  /**
   * Pause the tick timer
   */
  pause(): void {
    if (this.intervalId === null) {
      console.warn('[TickTimer] Not running, ignoring pause()');
      return;
    }

    console.log('[TickTimer] Pausing...');

    clearInterval(this.intervalId);
    this.intervalId = null;

    // Update store
    useTimeStore.getState()._setPaused(true);

    // FIX: Sync to game.store
    useGameStore.getState().setIsPaused(true);

    // Emit pause event
    const store = useTimeStore.getState();
    this.emitEvent('timer:pause', {
      tickCount: store.tickCount,
      gameTime: store.gameTime,
      timestamp: Date.now(),
    });

    console.log('[TickTimer] Paused successfully');
  }

  /**
   * Resume the tick timer
   */
  resume(): void {
    if (this.intervalId !== null) {
      console.warn('[TickTimer] Already running, ignoring resume()');
      return;
    }

    console.log('[TickTimer] Resuming...');

    this.intervalId = setInterval(() => {
      this.processTick();
    }, this.INTERVAL_MS);

    // Update store
    useTimeStore.getState()._setPaused(false);
    useTimeStore.getState()._setRunning(true);

    // FIX: Sync to game.store
    useGameStore.getState().setIsPaused(false);

    // Emit resume event
    const store = useTimeStore.getState();
    this.emitEvent('timer:resume', {
      tickCount: store.tickCount,
      timestamp: Date.now(),
    });

    console.log('[TickTimer] Resumed successfully');
  }

  /**
   * Stop the tick timer completely
   */
  stop(): void {
    if (this.intervalId === null) {
      return;
    }

    console.log('[TickTimer] Stopping...');

    clearInterval(this.intervalId);
    this.intervalId = null;

    // Update store
    useTimeStore.getState()._setRunning(false);
    useTimeStore.getState()._setPaused(true);

    // FIX: Sync to game.store
    useGameStore.getState().setIsPaused(true);

    // Emit stop event
    const store = useTimeStore.getState();
    this.emitEvent('timer:stop', {
      tickCount: store.tickCount,
      timestamp: Date.now(),
    });

    console.log('[TickTimer] Stopped successfully');
  }

  /**
   * Check if timer is running
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  // ==================== INTERNAL ====================

  /**
   * Process a single tick
   */
  private processTick(): void {
    try {
      const store = useTimeStore.getState();

      // Double-check: don't tick if paused
      if (store.isPaused) {
        console.log('[TickTimer] Skipping tick - paused');
        return;
      }

      // Get current speed config
      const speedConfig = store.speeds[store.speed];
      const minutesPerTick = speedConfig.minutesPerTick;

      // Increment tick in store (this updates gameTime)
      store._incrementTick();

      // Get updated state
      const newState = useTimeStore.getState();
      const { tickCount, gameTime, speed } = newState;

      // Build tick detail for events
      const tickDetail: TickEventDetail = {
        tickCount,
        gameTime,
        speed,
        minutesPerTick,
        timestamp: Date.now(),
      };

      // Log for debugging
      console.log(
        `[TickTimer] Tick #${tickCount} | ` +
        `${gameTime.year} Э.С.М., ${gameTime.month}/${gameTime.day}, ` +
        `${String(gameTime.hour).padStart(2, '0')}:${String(gameTime.minute).padStart(2, '0')} | ` +
        `Speed: ${speed} (${minutesPerTick} min/tick)`
      );

      // Process Qi effects through processor (if available)
      if (this.qiProcessor) {
        this.qiProcessor.processTick(tickDetail);
      }

      // Emit game:tick event for Phaser and other listeners
      this.emitEvent('game:tick', tickDetail);

      // FIX: Sync to game.store for React UI
      // This ensures React components see the same time as Phaser
      const gameStore = useGameStore.getState();
      if (gameStore.setWorldTime) {
        gameStore.setWorldTime({
          year: gameTime.year,
          month: gameTime.month,
          day: gameTime.day,
          hour: gameTime.hour,
          minute: gameTime.minute,
          season: gameTime.season,
          formatted: `${gameTime.year} Э.С.М., ${gameTime.month} месяц, ${gameTime.day} день`,
        });
      }

    } catch (error) {
      console.error('[TickTimer] Error in processTick:', error);
      // Don't rethrow - keep timer running
    }
  }

  /**
   * Emit event via window.dispatchEvent
   * This ensures Phaser and React can both listen
   */
  private emitEvent(eventName: string, detail: unknown): void {
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
      } catch (error) {
        console.error(`[TickTimer] Error emitting ${eventName}:`, error);
      }
    }
  }
}

// ==================== EXPORTS ====================

/** Singleton tick timer instance */
export const tickTimer = TickTimer.getInstance();

/** Type guard for tick event */
export function isTickEvent(event: Event): event is CustomEvent<TickEventDetail> {
  return event instanceof CustomEvent && 'tickCount' in event.detail;
}
