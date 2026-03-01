/**
 * Phaser Game Configuration
 * 
 * Main configuration for the Cultivation World Simulator game.
 * Uses WebGL renderer with Canvas fallback.
 * 
 * NOTE: This file imports Phaser and should only be loaded client-side.
 */

import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './game.constants';

export { GAME_WIDTH, GAME_HEIGHT };

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
