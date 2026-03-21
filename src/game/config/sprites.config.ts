/**
 * Sprite Configuration for Cultivation World Simulator
 * 
 * Defines sprite paths, animations, and cultivation level effects
 */

// Cultivation level visual themes
export const CULTIVATION_THEMES = {
  1: { name: 'Awakened Core', color: '#FFFFFF', glow: 'faint white', intensity: 0.3 },
  2: { name: 'Life Flow', color: '#88FF88', glow: 'soft green', intensity: 0.4 },
  3: { name: 'Inner Fire', color: '#FF8844', glow: 'orange flames', intensity: 0.5 },
  4: { name: 'Body Spirit Union', color: '#4488FF', glow: 'flowing blue', intensity: 0.6 },
  5: { name: 'Heaven Heart', color: '#AA44FF', glow: 'purple lightning', intensity: 0.7 },
  6: { name: 'Veil Break', color: '#CCCCCC', glow: 'silver distortion', intensity: 0.8 },
  7: { name: 'Eternal Ring', color: '#FFD700', glow: 'golden halo', intensity: 0.9 },
  8: { name: 'Heaven Voice', color: '#FFFFCC', glow: 'radiant white-gold', intensity: 1.0 },
  9: { name: 'Immortal Core', color: '#FF88FF', glow: 'rainbow celestial', intensity: 1.2 },
} as const;

// Sprite paths
export const SPRITE_PATHS = {
  player: {
    directions: '/sprites/player/player-directions.png',
    idleFrames: '/sprites/player/player-idle-frames.png',
    walkFrames: '/sprites/player/player-walk-frames.png',
    levels: {
      1: '/sprites/player/player-level-1.png',
      3: '/sprites/player/player-level-3.png',
      5: '/sprites/player/player-level-5.png',
      7: '/sprites/player/player-level-7.png',
      9: '/sprites/player/player-level-9.png',
    } as Record<number, string>,
  },
  effects: {
    qiGlow: '/sprites/effects/qi-glow.png',
    breakthrough: '/sprites/effects/breakthrough-effect.png',
    meditation: '/sprites/effects/meditation-effect.png',
  },
} as const;

// Animation frame configuration
export const ANIMATION_CONFIG = {
  directions: 8,
  framesPerDirection: 4,
  frameWidth: 256,
  frameHeight: 256,
  frameRate: 8,
};

// Direction mappings (Phaser uses these for animation keys)
export const DIRECTION_KEYS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
export type Direction = typeof DIRECTION_KEYS[number];

// Animation keys
export const ANIMATION_KEYS = {
  idle: (dir: Direction) => `player_idle_${dir}`,
  walk: (dir: Direction) => `player_walk_${dir}`,
  attack: (dir: Direction) => `player_attack_${dir}`,
} as const;

// Qi aura configuration
export const QI_AURA_CONFIG = {
  baseRadius: 30,
  radiusPerLevel: 5,
  baseAlpha: 0.3,
  pulseSpeed: 1000, // ms
  particleCount: 20,
};

// Get theme for cultivation level (with fallback)
export function getCultivationTheme(level: number) {
  const safeLevel = Math.min(Math.max(1, level), 9) as keyof typeof CULTIVATION_THEMES;
  return CULTIVATION_THEMES[safeLevel];
}

// Get sprite path for cultivation level
export function getPlayerSpritePath(level: number): string {
  // Round to nearest available level sprite
  const availableLevels = [1, 3, 5, 7, 9];
  const closestLevel = availableLevels.reduce((prev, curr) => 
    Math.abs(curr - level) < Math.abs(prev - level) ? curr : prev
  );
  return SPRITE_PATHS.player.levels[closestLevel as keyof typeof SPRITE_PATHS.player.levels];
}
