/**
 * Depth Layers (Z-Index)
 * 
 * Defines the rendering order for game objects.
 * Higher values render on top.
 */

export const DEPTHS = {
  // Background layers
  background: 0,
  decorations: 10,
  
  // Game entities
  resources: 30,
  npcs: 40,
  player: 50,
  
  // Effects
  effects: 60,
  particles: 70,
  
  // UI overlay
  ui: 100,
  dialog: 110,
  tooltip: 120,
} as const;
