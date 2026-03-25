/**
 * Movement Processor
 *
 * Processes movement on each tick from TickTimer.
 * Integrates with game:tick event system.
 *
 * FUNDAMENTAL RULE: 1 TICK = 1 SECOND REAL TIME
 *
 * @module movement-processor
 * @version 1.0.0
 * @date 2026-03-24
 */

import type { TickEventDetail } from '@/lib/tick-timer';
import {
  type MovementMode,
  type MovementInput,
  type MovementResult,
  type MovementStats,
  type PendingMovement,
  type TerrainType,
  MOVEMENT_CONFIGS,
  MOVEMENT_CONSTANTS,
  calculateEffectiveSpeed,
  calculateStaminaCost,
  canUseMovementMode,
  generateMovementId,
} from './movement-types';

// ==================== TYPES ====================

/**
 * Position interface
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Movement processor configuration
 */
export interface MovementProcessorConfig {
  /** Session ID for API calls */
  sessionId: string | null;
  /** Character ID for API calls */
  characterId: string | null;
  /** Initial position */
  initialPosition?: Position;
  /** Initial stats */
  initialStats?: Partial<MovementStats>;
  /** Initial terrain type */
  initialTerrain?: TerrainType;
  /** Callback when position changes */
  onPositionChange?: (position: Position) => void;
  /** Callback when stats change */
  onStatsChange?: (stats: MovementStats) => void;
  /** Callback for movement events */
  onMovementEvent?: (event: MovementEvent) => void;
}

/**
 * Movement event for callbacks
 */
export interface MovementEvent {
  type: 'moved' | 'blocked' | 'mode_changed' | 'stamina_exhausted' | 'queue_cleared';
  data: {
    position?: Position;
    tilesMoved?: number;
    mode?: MovementMode;
    reason?: string;
  };
}

// ==================== MOVEMENT PROCESSOR CLASS ====================

/**
 * Processor for time-based movement.
 *
 * Usage:
 * 1. Create instance with initial position and stats
 * 2. Call `queueMovement()` on player input
 * 3. Listen to game:tick and call `processTick()`
 * 4. Position updates through callbacks
 */
export class MovementProcessor {
  // Session info
  private sessionId: string | null = null;
  private characterId: string | null = null;

  // Current state
  private position: Position;
  private stats: MovementStats;
  private terrain: TerrainType;
  private currentMode: MovementMode = 'walk';

  // Movement queue
  private pendingQueue: PendingMovement[] = [];
  private lastInputTick: number = 0;

  // Callbacks
  private onPositionChange?: (position: Position) => void;
  private onStatsChange?: (stats: MovementStats) => void;
  private onMovementEvent?: (event: MovementEvent) => void;

  // Tick counter
  private tickCount: number = 0;
  private boundGameTickHandler: ((event: Event) => void) | null = null;

  constructor(config?: MovementProcessorConfig) {
    this.sessionId = config?.sessionId ?? null;
    this.characterId = config?.characterId ?? null;
    this.position = config?.initialPosition ?? { x: 0, y: 0 };
    this.terrain = config?.initialTerrain ?? 'plain';
    this.onPositionChange = config?.onPositionChange;
    this.onStatsChange = config?.onStatsChange;
    this.onMovementEvent = config?.onMovementEvent;

    // Default stats
    this.stats = {
      baseSpeed: MOVEMENT_CONSTANTS.BASE_TILES_PER_TICK,
      stamina: 100,
      maxStamina: 100,
      staminaRegen: MOVEMENT_CONSTANTS.STAMINA_REGEN_IDLE,
      agility: 10,
      fatigue: 0,
      currentQi: 0,
      carriedWeight: 0,
      maxCarryWeight: 100,
      ...config?.initialStats,
    };

    console.log('[MovementProcessor] Initialized at', this.position);
  }

  // ==================== PUBLIC API ====================

  /**
   * Set session info
   */
  setSession(sessionId: string, characterId: string): void {
    this.sessionId = sessionId;
    this.characterId = characterId;
  }

  /**
   * Clear session
   */
  clearSession(): void {
    this.sessionId = null;
    this.characterId = null;
    this.pendingQueue = [];
  }

  /**
   * Update position (e.g., after teleport)
   */
  setPosition(x: number, y: number): void {
    this.position = { x, y };
    this.onPositionChange?.(this.position);
  }

  /**
   * Get current position
   */
  getPosition(): Position {
    return { ...this.position };
  }

  /**
   * Update movement stats
   */
  updateStats(updates: Partial<MovementStats>): void {
    this.stats = { ...this.stats, ...updates };
    this.onStatsChange?.(this.stats);
  }

  /**
   * Get current stats
   */
  getStats(): MovementStats {
    return { ...this.stats };
  }

  /**
   * Set terrain type
   */
  setTerrain(terrain: TerrainType): void {
    this.terrain = terrain;
  }

  /**
   * Set movement mode
   */
  setMode(mode: MovementMode): void {
    const check = canUseMovementMode(mode, this.stats);
    if (!check.canUse) {
      console.warn(`[MovementProcessor] Cannot use mode ${mode}: ${check.reason}`);
      return;
    }

    this.currentMode = mode;
    this.onMovementEvent?.({
      type: 'mode_changed',
      data: { mode },
    });
  }

  /**
   * Get current movement mode
   */
  getMode(): MovementMode {
    return this.currentMode;
  }

  /**
   * Queue a movement request
   * Called on WASD input
   */
  queueMovement(dx: number, dy: number, mode?: MovementMode): string {
    // Use provided mode or current mode
    const movementMode = mode ?? this.currentMode;

    // Check if mode is available
    const check = canUseMovementMode(movementMode, this.stats);
    if (!check.canUse) {
      // Fall back to walk mode
      this.currentMode = 'walk';
    }

    // Normalize diagonal movement
    let normalizedDx = dx;
    let normalizedDy = dy;
    if (dx !== 0 && dy !== 0) {
      // Diagonal: normalize to length 1
      const length = Math.sqrt(dx * dx + dy * dy);
      normalizedDx = dx / length;
      normalizedDy = dy / length;
    }

    // Create pending movement
    const pending: PendingMovement = {
      id: generateMovementId(),
      dx: normalizedDx,
      dy: normalizedDy,
      mode: this.currentMode,
      timestamp: Date.now(),
    };

    // Add to queue (limit size)
    if (this.pendingQueue.length >= MOVEMENT_CONSTANTS.MAX_PENDING_QUEUE) {
      this.pendingQueue.shift();
    }
    this.pendingQueue.push(pending);
    this.lastInputTick = this.tickCount;

    return pending.id;
  }

  /**
   * Process a tick from TickTimer
   */
  processTick(detail: TickEventDetail): MovementResult | null {
    this.tickCount = detail.tickCount;

    // Check queue timeout - clear if no input for N ticks
    const ticksSinceInput = this.tickCount - this.lastInputTick;
    if (ticksSinceInput > MOVEMENT_CONSTANTS.QUEUE_TIMEOUT_TICKS && this.pendingQueue.length > 0) {
      this.pendingQueue = [];
      this.onMovementEvent?.({
        type: 'queue_cleared',
        data: { reason: 'timeout' },
      });
    }

    // Get pending movement
    const pending = this.pendingQueue.shift();
    if (!pending) {
      // No movement - regenerate stamina
      this.regenerateStamina(true);
      return null;
    }

    // Process the movement
    const result = this.executeMovement(pending);

    // Regenerate stamina (less when moving)
    this.regenerateStamina(false);

    return result;
  }

  /**
   * Setup TickTimer sync
   */
  setupTickTimerSync(): void {
    if (typeof window === 'undefined') return;

    this.cleanupTickTimerSync();

    this.boundGameTickHandler = ((event: Event) => {
      const customEvent = event as CustomEvent<TickEventDetail>;
      this.processTick(customEvent.detail);
    }) as EventListener;

    window.addEventListener('game:tick', this.boundGameTickHandler);
    console.log('[MovementProcessor] TickTimer sync setup');
  }

  /**
   * Cleanup TickTimer sync
   */
  cleanupTickTimerSync(): void {
    if (this.boundGameTickHandler && typeof window !== 'undefined') {
      window.removeEventListener('game:tick', this.boundGameTickHandler);
      this.boundGameTickHandler = null;
    }
  }

  /**
   * Get pending queue size
   */
  getQueueSize(): number {
    return this.pendingQueue.length;
  }

  /**
   * Clear movement queue
   */
  clearQueue(): void {
    this.pendingQueue = [];
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Execute movement for one tick
   */
  private executeMovement(pending: PendingMovement): MovementResult {
    const config = MOVEMENT_CONFIGS[pending.mode];

    // Calculate effective speed
    const effectiveSpeed = calculateEffectiveSpeed(
      config.tilesPerTick,
      this.stats,
      this.terrain
    );

    // Calculate stamina cost
    const staminaCost = calculateStaminaCost(
      config.staminaCostPerTick,
      this.stats,
      this.terrain
    );

    // Check if we have enough stamina
    if (staminaCost > 0 && this.stats.stamina < staminaCost) {
      // Fall back to walk mode
      this.currentMode = 'walk';
      this.onMovementEvent?.({
        type: 'stamina_exhausted',
        data: { mode: pending.mode },
      });
    }

    // Check Qi cost for sprint
    if (config.qiCostPerTick > 0 && this.stats.currentQi < config.qiCostPerTick) {
      this.currentMode = 'run';
      this.onMovementEvent?.({
        type: 'stamina_exhausted',
        data: { mode: pending.mode, reason: 'Недостаточно Ци' },
      });
    }

    // Calculate new position
    const tilesMoved = effectiveSpeed;
    const newX = this.position.x + pending.dx * tilesMoved;
    const newY = this.position.y + pending.dy * tilesMoved;

    // TODO: Check collision with obstacles (requires map data)
    const blocked = false;
    const blockedReason = undefined;

    // Apply movement
    if (!blocked) {
      this.position = { x: newX, y: newY };

      // Spend stamina
      if (staminaCost > 0) {
        this.stats.stamina = Math.max(0, this.stats.stamina - staminaCost);
      }

      // Spend Qi (for sprint)
      if (config.qiCostPerTick > 0) {
        this.stats.currentQi = Math.max(0, this.stats.currentQi - config.qiCostPerTick);
      }

      // Notify listeners
      this.onPositionChange?.(this.position);
      this.onStatsChange?.(this.stats);

      this.onMovementEvent?.({
        type: 'moved',
        data: {
          position: this.position,
          tilesMoved,
          mode: pending.mode,
        },
      });
    } else {
      this.onMovementEvent?.({
        type: 'blocked',
        data: {
          position: this.position,
          reason: blockedReason,
        },
      });
    }

    return {
      newX,
      newY,
      staminaSpent: staminaCost,
      qiSpent: config.qiCostPerTick,
      tilesMoved: blocked ? 0 : tilesMoved,
      blocked,
      blockedReason,
    };
  }

  /**
   * Regenerate stamina
   */
  private regenerateStamina(isIdle: boolean): void {
    const regenRate = isIdle
      ? MOVEMENT_CONSTANTS.STAMINA_REGEN_IDLE
      : MOVEMENT_CONSTANTS.STAMINA_REGEN_WALKING;

    if (this.stats.stamina < this.stats.maxStamina) {
      this.stats.stamina = Math.min(
        this.stats.maxStamina,
        this.stats.stamina + regenRate
      );
      this.onStatsChange?.(this.stats);
    }
  }
}

// ==================== SINGLETON INSTANCE ====================

let movementProcessorInstance: MovementProcessor | null = null;

/**
 * Get singleton MovementProcessor instance
 */
export function getMovementProcessor(): MovementProcessor {
  if (!movementProcessorInstance) {
    movementProcessorInstance = new MovementProcessor();
  }
  return movementProcessorInstance;
}

/**
 * Initialize MovementProcessor with config
 */
export function initMovementProcessor(config: MovementProcessorConfig): MovementProcessor {
  movementProcessorInstance = new MovementProcessor(config);
  return movementProcessorInstance;
}
