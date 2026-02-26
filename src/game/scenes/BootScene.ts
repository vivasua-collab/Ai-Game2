/**
 * BootScene - Initial scene for loading assets
 * 
 * Shows a loading progress bar while loading all game assets.
 * Transitions to WorldScene when complete.
 */

import Phaser from 'phaser';
import { ASSETS } from '../config/assets.config';

export class BootScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Rectangle;
  private progressBox!: Phaser.GameObjects.Rectangle;
  private loadingText!: Phaser.GameObjects.Text;
  
  constructor() {
    super({ key: 'BootScene' });
  }
  
  preload(): void {
    this.createLoadingUI();
    this.setupLoadEvents();
    this.loadAssets();
  }
  
  create(): void {
    // Fade out and start main scene
    this.cameras.main.fadeOut(200, 0, 0, 0);
    
    this.time.delayedCall(200, () => {
      this.scene.start('WorldScene');
    });
  }
  
  private createLoadingUI(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    // Progress box (outer)
    this.progressBox = this.add.rectangle(centerX, centerY, 420, 40, 0x222222);
    
    // Progress bar (inner)
    this.progressBar = this.add.rectangle(centerX - 200, centerY, 0, 30, 0x4ade80);
    this.progressBar.setOrigin(0, 0.5);
    
    // Loading text
    this.loadingText = this.add.text(centerX, centerY - 50, 'Загрузка мира...', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    // Title
    this.add.text(centerX, centerY - 100, '🧘 Cultivation World', {
      fontSize: '32px',
      color: '#4ade80',
    }).setOrigin(0.5);
  }
  
  private setupLoadEvents(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    // Progress update
    this.load.on('progress', (value: number) => {
      this.progressBar.width = 400 * value;
    });
    
    // File loaded
    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      this.loadingText.setText(`Загрузка: ${file.key}`);
    });
    
    // Complete
    this.load.on('complete', () => {
      this.loadingText.setText('Готово!');
    });
  }
  
  private loadAssets(): void {
    // For now, we use minimal placeholder assets
    // These will be generated procedurally in the scenes
    
    // Create placeholder textures programmatically
    this.createPlaceholderTextures();
    
    // In production, load actual assets:
    // this.load.image('player', ASSETS.sprites.player);
    // this.load.image('npc', ASSETS.sprites.npc);
    // etc.
  }
  
  private createPlaceholderTextures(): void {
    // Player placeholder (simple circle)
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(0x4ade80);
    playerGraphics.fillCircle(16, 16, 16);
    playerGraphics.fillStyle(0x22c55e);
    playerGraphics.fillCircle(16, 12, 8); // Head
    playerGraphics.generateTexture('player', 32, 32);
    playerGraphics.destroy();
    
    // NPC placeholder
    const npcGraphics = this.make.graphics({ x: 0, y: 0 });
    npcGraphics.fillStyle(0xfbbf24);
    npcGraphics.fillCircle(16, 16, 16);
    npcGraphics.fillStyle(0xf59e0b);
    npcGraphics.fillCircle(16, 12, 8);
    npcGraphics.generateTexture('npc', 32, 32);
    npcGraphics.destroy();
    
    // Enemy placeholder
    const enemyGraphics = this.make.graphics({ x: 0, y: 0 });
    enemyGraphics.fillStyle(0xef4444);
    enemyGraphics.fillCircle(16, 16, 16);
    enemyGraphics.fillStyle(0xdc2626);
    enemyGraphics.fillCircle(16, 12, 8);
    enemyGraphics.generateTexture('enemy', 32, 32);
    enemyGraphics.destroy();
    
    // Location marker placeholder
    const markerGraphics = this.make.graphics({ x: 0, y: 0 });
    markerGraphics.fillStyle(0x3b82f6, 0.8);
    markerGraphics.fillCircle(24, 24, 24);
    markerGraphics.lineStyle(3, 0x60a5fa);
    markerGraphics.strokeCircle(24, 24, 24);
    markerGraphics.generateTexture('location-marker', 48, 48);
    markerGraphics.destroy();
    
    // Location visited marker
    const visitedGraphics = this.make.graphics({ x: 0, y: 0 });
    visitedGraphics.fillStyle(0x4ade80, 0.8);
    visitedGraphics.fillCircle(24, 24, 24);
    visitedGraphics.lineStyle(3, 0x22c55e);
    visitedGraphics.strokeCircle(24, 24, 24);
    visitedGraphics.generateTexture('location-visited', 48, 48);
    visitedGraphics.destroy();
    
    // Particle placeholder
    const particleGraphics = this.make.graphics({ x: 0, y: 0 });
    particleGraphics.fillStyle(0xffffff);
    particleGraphics.fillCircle(4, 4, 4);
    particleGraphics.generateTexture('particle', 8, 8);
    particleGraphics.destroy();
  }
}
