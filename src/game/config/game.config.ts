/**
 * Phaser Game Configuration
 * 
 * Main configuration for the Cultivation World Simulator game.
 * Uses WebGL renderer with Canvas fallback.
 */

import Phaser from 'phaser';

export const GAME_WIDTH = 900;
export const GAME_HEIGHT = 550;

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  
  render: {
    pixelArt: true,
    antialias: false,
  },
  
  // Scenes are registered dynamically
  scene: [],
};
