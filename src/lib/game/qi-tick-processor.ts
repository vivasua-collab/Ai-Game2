/**
 * Qi Tick Processor
 *
 * Process Qi effects on each tick from TickTimer.
 * Batches requests to server for efficiency.
 *
 * FUNDAMENTAL RULE: 1 TICK = 1 SECOND REAL TIME
 */

import type { TickEventDetail } from '@/lib/tick-timer';
import type { GameTime } from '@/stores/time.store';

// ==================== TYPES ====================

export interface QiTickResult {
  success: boolean;
  passiveGain: number;
  dissipation: number;
  finalQi: number;
}

export interface QiProcessorConfig {
  /** Session ID for API calls */
  sessionId: string | null;
  /** Character ID for API calls */
  characterId: string | null;
  /** Batch size - send to server every N ticks */
  batchSize: number;
  /** Auto-flush on batch size */
  autoFlush: boolean;
}

// ==================== QI TICK PROCESSOR CLASS ====================

/**
 * Processor for Qi effects during tick timer execution.
 *
 * Usage:
 * 1. Create instance: `const processor = new QiTickProcessor();`
 * 2. Set session: `processor.setSession(sessionId, characterId);`
 * 3. Listen to game:tick events and call `processTick()`
 * 4. Call `flush()` before game exit or pause
 */
export class QiTickProcessor {
  private sessionId: string | null = null;
  private characterId: string | null = null;
  private pendingTicks: number = 0;
  private readonly batchSize: number;
  private autoFlush: boolean;
  private isProcessing: boolean = false;

  constructor(config?: Partial<QiProcessorConfig>) {
    this.sessionId = config?.sessionId ?? null;
    this.characterId = config?.characterId ?? null;
    this.batchSize = config?.batchSize ?? 10;
    this.autoFlush = config?.autoFlush ?? true;
  }

  // ==================== PUBLIC API ====================

  /**
   * Set session for API calls
   */
  setSession(sessionId: string, characterId: string): void {
    this.sessionId = sessionId;
    this.characterId = characterId;
    console.log(`[QiTickProcessor] Session set: ${sessionId}`);
  }

  /**
   * Clear session
   */
  clearSession(): void {
    this.sessionId = null;
    this.characterId = null;
    this.pendingTicks = 0;
    console.log('[QiTickProcessor] Session cleared');
  }

  /**
   * Process a tick from TickTimer
   *
   * Called on every game:tick event.
   * Accumulates ticks and sends to server when batch is full.
   */
  processTick(detail: TickEventDetail): void {
    if (!this.sessionId || !this.characterId) {
      // No session - skip processing
      return;
    }

    // Increment pending ticks
    this.pendingTicks++;
    console.log(
      `[QiTickProcessor] Tick #${detail.tickCount} pending (${this.pendingTicks}/${this.batchSize})`
    );

    // Auto-flush if batch is full
    if (this.autoFlush && this.pendingTicks >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush pending ticks to server
   *
   * Sends accumulated ticks to /api/qi/tick for processing.
   * Called automatically when batch is full or manually on pause/exit.
   */
  async flush(): Promise<QiTickResult | null> {
    if (!this.sessionId || !this.characterId) {
      console.log('[QiTickProcessor] No session, skipping flush');
      return null;
    }

    if (this.pendingTicks === 0) {
      console.log('[QiTickProcessor] No pending ticks to flush');
      return null;
    }

    if (this.isProcessing) {
      console.log('[QiTickProcessor] Already processing, skipping flush');
      return null;
    }

    this.isProcessing = true;
    const ticksToSend = this.pendingTicks;
    this.pendingTicks = 0;

    try {
      console.log(`[QiTickProcessor] Flushing ${ticksToSend} ticks to server...`);

      const response = await fetch('/api/qi/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          characterId: this.characterId,
          ticks: ticksToSend,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[QiTickProcessor] Flush complete:`, result);

      return result;
    } catch (error) {
      console.error('[QiTickProcessor] Flush error:', error);
      // Restore pending ticks on error
      this.pendingTicks = ticksToSend;
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get pending tick count
   */
  getPendingTicks(): number {
    return this.pendingTicks;
  }

  /**
   * Check if processor has session
   */
  hasSession(): boolean {
    return this.sessionId !== null && this.characterId !== null;
  }
}

// ==================== SINGLETON INSTANCE ====================

let qiTickProcessorInstance: QiTickProcessor | null = null;

/**
 * Get singleton QiTickProcessor instance
 */
export function getQiTickProcessor(): QiTickProcessor {
  if (!qiTickProcessorInstance) {
    qiTickProcessorInstance = new QiTickProcessor();
  }
  return qiTickProcessorInstance;
}

/**
 * Initialize QiTickProcessor with session
 */
export function initQiTickProcessor(sessionId: string, characterId: string): QiTickProcessor {
  const processor = getQiTickProcessor();
  processor.setSession(sessionId, characterId);
  return processor;
}
