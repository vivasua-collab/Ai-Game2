/**
 * Assets Configuration
 * 
 * Defines paths to all game assets (sprites, audio, UI elements).
 * Uses emoji placeholders until proper assets are created.
 */

export const ASSETS = {
  sprites: {
    player: '/assets/sprites/player.png',
    npc: '/assets/sprites/npc.png',
    enemy: '/assets/sprites/enemy.png',
    locationMarker: '/assets/sprites/location-marker.png',
    locationVisited: '/assets/sprites/location-visited.png',
    particle: '/assets/sprites/particle.png',
  },
  
  ui: {
    button: '/assets/ui/button.png',
    panel: '/assets/ui/panel.png',
    dialog: '/assets/ui/dialog.png',
  },
  
  audio: {
    meditation: '/assets/audio/meditation.mp3',
    combat: '/assets/audio/combat.mp3',
    ambient: '/assets/audio/ambient.mp3',
  },
} as const;

/**
 * Emoji icons for locations (fallback when no sprite available)
 */
export const LOCATION_ICONS: Record<string, string> = {
  forest: '🌲',
  mountain: '🏔️',
  water: '🌊',
  desert: '🏜️',
  plains: '🌾',
  cave: '🕳️',
  temple: '🛕',
  village: '🏘️',
  city: '🏯',
  ruins: '🏚️',
  default: '📍',
};

/**
 * Colors for different terrain types
 */
export const TERRAIN_COLORS: Record<string, number> = {
  forest: 0x1a4d1a,
  mountain: 0x4a4a4a,
  water: 0x1a3d5c,
  desert: 0xc2a860,
  temple: 0x2a2a4a,
  village: 0x3d3d3d,
  plains: 0x2d4a2d,
  cave: 0x2a2a2a,
  city: 0x3a3a4a,
  ruins: 0x4a4a3a,
  default: 0x1a1a2e,
};
