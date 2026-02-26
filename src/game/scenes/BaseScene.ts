/**
 * BaseScene - Abstract base class for all game scenes
 * 
 * Provides common functionality:
 * - GameBridge integration
 * - Scene transitions
 * - UI helpers
 */

import * as Phaser from 'phaser';

// Forward declaration to avoid circular import
type GameBridge = {
  getInstance(): GameBridge;
  getGame(): Phaser.Game | null;
  setGame(game: Phaser.Game): void;
  getSessionId(): string | null;
  setSessionId(id: string): void;
  getLocations(): Promise<unknown[]>;
  getLocation(id: string): Promise<unknown>;
  getCharacter(): Promise<unknown>;
  getNPCs(locationId: string): Promise<unknown[]>;
  sendAction(action: string): Promise<string>;
  setCurrentLocation(locationId: string): void;
  toggleChat(): void;
  initCombat(enemyId: string): Promise<unknown>;
  executeCombatAction(action: string): Promise<unknown>;
  getEnemyAction(): Promise<unknown>;
};

export abstract class BaseScene extends Phaser.Scene {
  protected bridge: GameBridge | null = null;
  
  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config);
  }
  
  /**
   * Set the game bridge instance
   */
  setBridge(bridge: GameBridge): void {
    this.bridge = bridge;
  }
  
  /**
   * Create a styled button
   */
  protected createButton(
    x: number,
    y: number,
    text: string,
    options: {
      width?: number;
      height?: number;
      fontSize?: string;
      onClick?: () => void;
    } = {}
  ): Phaser.GameObjects.Container {
    const { width = 100, height = 40, fontSize = '14px', onClick } = options;
    
    const container = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, width, height, 0x333333, 0.9)
      .setStrokeStyle(2, 0x666666);
    
    const label = this.add.text(0, 0, text, {
      fontSize,
      color: '#ffffff',
    }).setOrigin(0.5);
    
    container.add([bg, label]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    
    // Hover effects
    container.on('pointerover', () => {
      bg.setFillStyle(0x444444);
      container.setScale(1.05);
    });
    
    container.on('pointerout', () => {
      bg.setFillStyle(0x333333);
      container.setScale(1);
    });
    
    if (onClick) {
      container.on('pointerdown', onClick);
    }
    
    return container;
  }
  
  /**
   * Create a text with shadow effect
   */
  protected createText(
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle = {}
  ): Phaser.GameObjects.Text {
    const textObj = this.add.text(x, y, text, {
      fontSize: '16px',
      color: '#ffffff',
      ...style,
    });
    
    textObj.setShadow(2, 2, '#000000', 4, true, true);
    
    return textObj;
  }
  
  /**
   * Show floating text animation
   */
  protected showFloatingText(
    x: number,
    y: number,
    text: string,
    color: string = '#ffffff',
    duration: number = 1000
  ): void {
    const floatingText = this.add.text(x, y, text, {
      fontSize: '18px',
      color,
    }).setOrigin(0.5).setDepth(200);
    
    this.tweens.add({
      targets: floatingText,
      y: y - 60,
      alpha: 0,
      duration,
      ease: 'Power2',
      onComplete: () => floatingText.destroy(),
    });
  }
  
  /**
   * Transition to another scene with fade effect
   */
  protected goToScene(sceneName: string, data?: object, fadeDuration: number = 300): void {
    this.cameras.main.fadeOut(fadeDuration, 0, 0, 0);
    
    this.time.delayedCall(fadeDuration, () => {
      this.scene.start(sceneName, data);
    });
  }
  
  /**
   * Create a progress bar
   */
  protected createProgressBar(
    x: number,
    y: number,
    width: number,
    height: number,
    getProgress: () => number,
    color: number = 0x4ade80
  ): Phaser.GameObjects.Graphics {
    const bar = this.add.graphics();
    
    const draw = () => {
      bar.clear();
      const progress = Math.max(0, Math.min(1, getProgress()));
      
      // Background
      bar.fillStyle(0x333333);
      bar.fillRect(x, y, width, height);
      
      // Fill
      bar.fillStyle(color);
      bar.fillRect(x, y, width * progress, height);
      
      // Border
      bar.lineStyle(2, 0x666666);
      bar.strokeRect(x, y, width, height);
    };
    
    draw();
    
    // Update every frame
    this.events.on('update', draw);
    
    return bar;
  }
  
  /**
   * Shake camera effect
   */
  protected shakeCamera(duration: number = 100, intensity: number = 0.01): void {
    this.cameras.main.shake(duration, intensity);
  }
  
  /**
   * Flash camera effect
   */
  protected flashCamera(duration: number = 100, color: number = 0xffffff): void {
    this.cameras.main.flash(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
  }
}
