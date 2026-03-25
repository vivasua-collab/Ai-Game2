/**
 * Movement Types and Configuration
 *
 * Time-based movement system.
 * FUNDAMENTAL RULE: 1 TICK = 1 SECOND REAL TIME
 *
 * Movement modes affect:
 * - Tiles per tick (speed)
 * - Stamina cost
 * - Visibility to enemies
 * - Qi consumption (sprint)
 *
 * @module movement-types
 * @version 1.0.0
 * @date 2026-03-24
 */

// ==================== TYPES ====================

/**
 * Movement mode types
 */
export type MovementMode = 'sneak' | 'walk' | 'fastWalk' | 'run' | 'sprint';

/**
 * Movement configuration for each mode
 */
export interface MovementConfig {
  /** Movement mode identifier */
  mode: MovementMode;
  /** Display name in Russian */
  displayName: string;
  /** Tiles moved per tick (1 tile = 5 meters) */
  tilesPerTick: number;
  /** Stamina cost per tick (0 = no cost) */
  staminaCostPerTick: number;
  /** Qi cost per tick (for sprint) */
  qiCostPerTick: number;
  /** Visibility modifier: negative = harder to detect */
  visibilityModifier: number;
  /** Sound range in tiles (for NPC detection) */
  soundRange: number;
  /** Icon for UI */
  icon: string;
}

/**
 * Terrain type affecting movement speed
 */
export type TerrainType =
  | 'road'      // Normal speed
  | 'plain'     // Normal speed
  | 'forest'    // -20% speed
  | 'mountain'  // -40% speed
  | 'water'     // -50% speed
  | 'swamp';    // -60% speed

/**
 * Terrain movement modifier
 */
export interface TerrainModifier {
  terrain: TerrainType;
  /** Speed multiplier (1.0 = normal) */
  speedMultiplier: number;
  /** Stamina cost multiplier */
  staminaMultiplier: number;
  /** Display name in Russian */
  displayName: string;
}

/**
 * Character movement stats
 */
export interface MovementStats {
  /** Base movement speed (affected by agility) */
  baseSpeed: number;
  /** Current stamina (0-100) */
  stamina: number;
  /** Max stamina */
  maxStamina: number;
  /** Stamina regeneration per tick */
  staminaRegen: number;
  /** Agility stat (affects speed) */
  agility: number;
  /** Current fatigue (reduces speed) */
  fatigue: number;
  /** Current Qi (for sprint) */
  currentQi: number;
  /** Carried weight (affects speed) */
  carriedWeight: number;
  /** Max carry weight */
  maxCarryWeight: number;
}

/**
 * Movement input direction
 */
export interface MovementInput {
  /** X direction (-1 = left, 1 = right, 0 = none) */
  dx: number;
  /** Y direction (-1 = up, 1 = down, 0 = none) */
  dy: number;
  /** Movement mode */
  mode: MovementMode;
}

/**
 * Calculated movement result for one tick
 */
export interface MovementResult {
  /** New X position in tiles */
  newX: number;
  /** New Y position in tiles */
  newY: number;
  /** Stamina spent this tick */
  staminaSpent: number;
  /** Qi spent this tick */
  qiSpent: number;
  /** Actual tiles moved */
  tilesMoved: number;
  /** Whether movement was blocked */
  blocked: boolean;
  /** Reason if blocked */
  blockedReason?: string;
}

/**
 * Pending movement request (queued for next tick)
 */
export interface PendingMovement {
  /** Unique request ID */
  id: string;
  /** Direction X */
  dx: number;
  /** Direction Y */
  dy: number;
  /** Movement mode */
  mode: MovementMode;
  /** Timestamp when queued */
  timestamp: number;
}

// ==================== CONFIGURATION ====================

/**
 * Movement configuration by mode
 */
export const MOVEMENT_CONFIGS: Record<MovementMode, MovementConfig> = {
  sneak: {
    mode: 'sneak',
    displayName: 'Крадусь',
    tilesPerTick: 0.5,
    staminaCostPerTick: 0,
    qiCostPerTick: 0,
    visibilityModifier: -50,
    soundRange: 0,
    icon: '🤫',
  },
  walk: {
    mode: 'walk',
    displayName: 'Иду',
    tilesPerTick: 1,
    staminaCostPerTick: 0,
    qiCostPerTick: 0,
    visibilityModifier: 0,
    soundRange: 3,
    icon: '🚶',
  },
  fastWalk: {
    mode: 'fastWalk',
    displayName: 'Быстро иду',
    tilesPerTick: 2,
    staminaCostPerTick: 1,
    qiCostPerTick: 0,
    visibilityModifier: 0,
    soundRange: 5,
    icon: '🚶‍♂️',
  },
  run: {
    mode: 'run',
    displayName: 'Бегу',
    tilesPerTick: 3,
    staminaCostPerTick: 2,
    qiCostPerTick: 0,
    visibilityModifier: 25,
    soundRange: 10,
    icon: '🏃',
  },
  sprint: {
    mode: 'sprint',
    displayName: 'Несусь',
    tilesPerTick: 4,
    staminaCostPerTick: 4,
    qiCostPerTick: 1,
    visibilityModifier: 50,
    soundRange: 15,
    icon: '💨',
  },
};

/**
 * Terrain modifiers
 */
export const TERRAIN_MODIFIERS: Record<TerrainType, TerrainModifier> = {
  road: {
    terrain: 'road',
    speedMultiplier: 1.0,
    staminaMultiplier: 1.0,
    displayName: 'Дорога',
  },
  plain: {
    terrain: 'plain',
    speedMultiplier: 1.0,
    staminaMultiplier: 1.0,
    displayName: 'Равнина',
  },
  forest: {
    terrain: 'forest',
    speedMultiplier: 0.8,
    staminaMultiplier: 1.2,
    displayName: 'Лес',
  },
  mountain: {
    terrain: 'mountain',
    speedMultiplier: 0.6,
    staminaMultiplier: 1.5,
    displayName: 'Горы',
  },
  water: {
    terrain: 'water',
    speedMultiplier: 0.5,
    staminaMultiplier: 2.0,
    displayName: 'Вода',
  },
  swamp: {
    terrain: 'swamp',
    speedMultiplier: 0.4,
    staminaMultiplier: 2.5,
    displayName: 'Болото',
  },
};

/**
 * Movement constants
 */
export const MOVEMENT_CONSTANTS = {
  /** Tile size in meters */
  TILE_SIZE_METERS: 5,

  /** Base speed in tiles per tick for average human */
  BASE_TILES_PER_TICK: 1,

  /** Agility bonus: +1% speed per agility point above 10 */
  AGILITY_SPEED_BONUS: 0.01,

  /** Fatigue penalty: -1% speed per 10% fatigue */
  FATIGUE_SPEED_PENALTY: 0.01,

  /** Weight penalty: -1% speed per 10% over encumbrance */
  WEIGHT_SPEED_PENALTY: 0.01,

  /** Stamina regeneration per tick when not moving */
  STAMINA_REGEN_IDLE: 2,

  /** Stamina regeneration per tick when walking */
  STAMINA_REGEN_WALKING: 1,

  /** Minimum stamina to run */
  MIN_STAMINA_RUN: 20,

  /** Minimum stamina to sprint */
  MIN_STAMINA_SPRINT: 40,

  /** Maximum pending movements in queue */
  MAX_PENDING_QUEUE: 10,

  /** Ticks before movement queue is cleared on no input */
  QUEUE_TIMEOUT_TICKS: 3,
} as const;

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get movement config by mode
 */
export function getMovementConfig(mode: MovementMode): MovementConfig {
  return MOVEMENT_CONFIGS[mode];
}

/**
 * Get terrain modifier by type
 */
export function getTerrainModifier(terrain: TerrainType): TerrainModifier {
  return TERRAIN_MODIFIERS[terrain];
}

/**
 * Calculate effective speed based on character stats
 */
export function calculateEffectiveSpeed(
  baseTilesPerTick: number,
  stats: MovementStats,
  terrain: TerrainType
): number {
  const terrainMod = TERRAIN_MODIFIERS[terrain];

  // Base speed
  let speed = baseTilesPerTick;

  // Agility bonus (+1% per point above 10)
  const agilityBonus = Math.max(0, stats.agility - 10) * MOVEMENT_CONSTANTS.AGILITY_SPEED_BONUS;
  speed *= (1 + agilityBonus);

  // Fatigue penalty (-1% per 10% fatigue)
  const fatiguePenalty = (stats.fatigue / 10) * MOVEMENT_CONSTANTS.FATIGUE_SPEED_PENALTY;
  speed *= (1 - fatiguePenalty);

  // Weight penalty (only if overencumbered)
  if (stats.carriedWeight > stats.maxCarryWeight) {
    const overencumbrance = (stats.carriedWeight - stats.maxCarryWeight) / stats.maxCarryWeight;
    const weightPenalty = overencumbrance * 10 * MOVEMENT_CONSTANTS.WEIGHT_SPEED_PENALTY;
    speed *= Math.max(0.25, 1 - weightPenalty); // Minimum 25% speed
  }

  // Terrain modifier
  speed *= terrainMod.speedMultiplier;

  // Minimum speed is 0.1 tiles per tick (very slow)
  return Math.max(0.1, speed);
}

/**
 * Calculate stamina cost for movement
 */
export function calculateStaminaCost(
  baseCost: number,
  stats: MovementStats,
  terrain: TerrainType
): number {
  const terrainMod = TERRAIN_MODIFIERS[terrain];
  return baseCost * terrainMod.staminaMultiplier;
}

/**
 * Check if character can use movement mode
 */
export function canUseMovementMode(
  mode: MovementMode,
  stats: MovementStats
): { canUse: boolean; reason?: string } {
  const config = MOVEMENT_CONFIGS[mode];

  // Check stamina requirements
  if (mode === 'run' && stats.stamina < MOVEMENT_CONSTANTS.MIN_STAMINA_RUN) {
    return { canUse: false, reason: `Нужно минимум ${MOVEMENT_CONSTANTS.MIN_STAMINA_RUN} выносливости` };
  }

  if (mode === 'sprint' && stats.stamina < MOVEMENT_CONSTANTS.MIN_STAMINA_SPRINT) {
    return { canUse: false, reason: `Нужно минимум ${MOVEMENT_CONSTANTS.MIN_STAMINA_SPRINT} выносливости` };
  }

  // Check Qi for sprint
  if (mode === 'sprint' && stats.currentQi < config.qiCostPerTick) {
    return { canUse: false, reason: 'Недостаточно Ци для спринта' };
  }

  return { canUse: true };
}

/**
 * Generate unique movement ID
 */
export function generateMovementId(): string {
  return `move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get default movement mode based on situation
 */
export function getDefaultMovementMode(
  isStealth: boolean,
  isUrgent: boolean,
  stamina: number
): MovementMode {
  if (isStealth) return 'sneak';
  if (isUrgent && stamina >= MOVEMENT_CONSTANTS.MIN_STAMINA_SPRINT) return 'sprint';
  if (isUrgent && stamina >= MOVEMENT_CONSTANTS.MIN_STAMINA_RUN) return 'run';
  return 'walk';
}
