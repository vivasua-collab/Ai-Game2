/**
 * WorldScene - Main world map view
 * 
 * Displays all discovered locations as interactive markers.
 * Player can click on locations to navigate.
 */

import * as Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { LOCATION_ICONS, TERRAIN_COLORS } from '../config/assets.config';
import { DEPTHS } from '../constants';

interface Location {
  id: string;
  name: string;
  terrainType?: string | null;
  x?: number | null;
  y?: number | null;
  description?: string | null;
}

export class WorldScene extends BaseScene {
  private locations: Map<string, Phaser.GameObjects.Container> = new Map();
  private player!: Phaser.GameObjects.Sprite;
  private playerLocationId: string = '';
  private worldData: Location[] = [];
  
  constructor() {
    super({ key: 'WorldScene' });
  }
  
  init(): void {
    // Reset state
    this.locations.clear();
  }
  
  async create(): Promise<void> {
    // Camera fade in
    this.cameras.main.fadeIn(300);
    
    // Create world background
    this.createBackground();
    
    // Load locations from API
    await this.loadLocations();
    
    // Create player marker
    this.createPlayer();
    
    // Setup input
    this.setupInput();
    
    // Create UI
    this.createUI();
  }
  
  private createBackground(): void {
    // Gradient background
    const graphics = this.add.graphics();
    
    // Draw gradient
    for (let i = 0; i < this.cameras.main.height; i++) {
      const alpha = 0.4 - (i / this.cameras.main.height) * 0.2;
      graphics.fillStyle(0x1a1a4e, alpha);
      graphics.fillRect(0, i, this.cameras.main.width, 1);
    }
    
    // Add some atmospheric particles
    this.createAtmosphericParticles();
  }
  
  private createAtmosphericParticles(): void {
    // Floating particles for atmosphere
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, 900);
      const y = Phaser.Math.Between(0, 550);
      
      const particle = this.add.circle(x, y, Phaser.Math.Between(1, 3), 0x4ade80, 0.3);
      particle.setDepth(DEPTHS.decorations);
      
      // Gentle floating animation
      this.tweens.add({
        targets: particle,
        y: y - Phaser.Math.Between(20, 50),
        alpha: { from: 0.3, to: 0.1 },
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1000),
      });
    }
  }
  
  private async loadLocations(): Promise<void> {
    try {
      const response = await fetch('/api/map');
      const data = await response.json();
      
      if (data.locations && Array.isArray(data.locations)) {
        this.worldData = data.locations;
        this.renderLocations(data.locations);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
      // Show error message
      this.createText(450, 275, 'Не удалось загрузить карту мира', {
        color: '#ef4444',
      }).setOrigin(0.5);
    }
  }
  
  private renderLocations(locations: Location[]): void {
    // If locations don't have coordinates, arrange them in a grid
    const needsCoordinates = locations.some(loc => loc.x === null || loc.y === null);
    
    if (needsCoordinates) {
      this.arrangeLocationsInCircle(locations);
    }
    
    locations.forEach((location) => {
      const container = this.createLocationMarker(location);
      this.locations.set(location.id, container);
    });
  }
  
  private arrangeLocationsInCircle(locations: Location[]): void {
    const centerX = 450;
    const centerY = 275;
    const radius = 180;
    
    locations.forEach((location, index) => {
      if (location.x === null || location.y === null) {
        const angle = (index / locations.length) * Math.PI * 2 - Math.PI / 2;
        location.x = centerX + Math.cos(angle) * radius;
        location.y = centerY + Math.sin(angle) * radius;
      }
    });
  }
  
  private createLocationMarker(location: Location): Phaser.GameObjects.Container {
    const x = location.x || 450;
    const y = location.y || 275;
    
    const container = this.add.container(x, y);
    container.setDepth(DEPTHS.npcs);
    
    // Background circle
    const bg = this.add.circle(0, 0, 30, TERRAIN_COLORS[location.terrainType || 'default'] || 0x3b82f6, 0.8);
    bg.setStrokeStyle(3, 0x60a5fa);
    
    // Icon
    const iconText = LOCATION_ICONS[location.terrainType || 'default'] || LOCATION_ICONS.default;
    const icon = this.add.text(0, 0, iconText, {
      fontSize: '28px',
    }).setOrigin(0.5);
    
    // Name
    const name = this.add.text(0, 45, location.name, {
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    container.add([bg, icon, name]);
    
    // Interactive
    bg.setInteractive({ useHandCursor: true });
    
    // Hover effects
    bg.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scale: 1.15,
        duration: 150,
      });
      this.showLocationTooltip(location, container);
    });
    
    bg.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 150,
      });
      this.hideTooltip();
    });
    
    // Click handler
    bg.on('pointerdown', () => {
      this.onLocationClick(location);
    });
    
    return container;
  }
  
  private tooltipContainer: Phaser.GameObjects.Container | null = null;
  
  private showLocationTooltip(location: Location, parent: Phaser.GameObjects.Container): void {
    this.hideTooltip();
    
    const tooltipY = -80;
    this.tooltipContainer = this.add.container(parent.x, parent.y + tooltipY);
    this.tooltipContainer.setDepth(DEPTHS.tooltip);
    
    const bg = this.add.rectangle(0, 0, 200, 60, 0x1a1a2e, 0.95);
    bg.setStrokeStyle(2, 0x4a4a5e);
    
    const name = this.add.text(0, -15, location.name, {
      fontSize: '14px',
      color: '#4ade80',
    }).setOrigin(0.5);
    
    const terrain = this.add.text(0, 10, location.terrainType || 'Неизвестно', {
      fontSize: '12px',
      color: '#9ca3af',
    }).setOrigin(0.5);
    
    this.tooltipContainer.add([bg, name, terrain]);
    
    // Fade in
    this.tooltipContainer.setAlpha(0);
    this.tweens.add({
      targets: this.tooltipContainer,
      alpha: 1,
      duration: 100,
    });
  }
  
  private hideTooltip(): void {
    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
      this.tooltipContainer = null;
    }
  }
  
  private createPlayer(): void {
    // Find player's current location
    // For now, place in center
    const x = 450;
    const y = 275;
    
    this.player = this.add.sprite(x, y, 'player');
    this.player.setScale(1.5);
    this.player.setDepth(DEPTHS.player);
    
    // Glow effect
    const glow = this.add.circle(x, y, 25, 0x4ade80, 0.3);
    glow.setDepth(DEPTHS.player - 1);
    
    // Pulsing animation
    this.tweens.add({
      targets: [this.player, glow],
      scale: { from: 1.5, to: 1.7 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    
    // Player label
    this.add.text(x, y + 35, '👤 Ты', {
      fontSize: '12px',
      color: '#4ade80',
    }).setOrigin(0.5).setDepth(DEPTHS.player);
  }
  
  private onLocationClick(location: Location): void {
    // Visual feedback
    this.cameras.main.flash(100, 0x4a, 0xde, 0x80);
    
    // Transition to location scene
    this.time.delayedCall(100, () => {
      this.goToScene('LocationScene', { locationId: location.id });
    });
  }
  
  private setupInput(): void {
    // ESC to open menu
    this.input.keyboard?.on('keydown-ESC', () => {
      this.showMenu();
    });
    
    // Arrow keys for navigation (optional)
    this.input.keyboard?.on('keydown-LEFT', () => {
      this.cameras.main.scrollX -= 10;
    });
    this.input.keyboard?.on('keydown-RIGHT', () => {
      this.cameras.main.scrollX += 10;
    });
  }
  
  private createUI(): void {
    // Title
    this.add.text(450, 30, '🗺️ Карта мира', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(DEPTHS.ui);
    
    // Instructions
    this.add.text(450, 530, 'Нажмите на локацию для перехода', {
      fontSize: '14px',
      color: '#9ca3af',
    }).setOrigin(0.5).setDepth(DEPTHS.ui);
  }
  
  private showMenu(): void {
    // TODO: Implement menu overlay
    console.log('Menu opened');
  }
}
