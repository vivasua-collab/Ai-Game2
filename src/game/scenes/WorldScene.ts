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
import { GameBridge } from '@/services/game-bridge.service';

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
    console.log('[WorldScene] create() started');
    
    // Camera fade in
    this.cameras.main.fadeIn(300);
    
    // Create world background
    this.createBackground();
    console.log('[WorldScene] Background created');
    
    // Load locations from API
    await this.loadLocations();
    console.log('[WorldScene] Locations loaded');
    
    // Create player marker
    this.createPlayer();
    console.log('[WorldScene] Player created');
    
    // Setup input
    this.setupInput();
    
    // Create UI
    this.createUI();
    console.log('[WorldScene] UI created, scene ready');
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
      // Get sessionId from GameBridge (set by GameContainer before scene starts)
      const bridge = GameBridge.getInstance();
      let sessionId = bridge.getSessionId();
      
      // Fallback to localStorage if bridge doesn't have it
      if (!sessionId && typeof window !== 'undefined') {
        sessionId = localStorage.getItem('cultivation_session_id');
        if (sessionId) {
          bridge.setSessionId(sessionId);
        }
      }
      
      if (!sessionId) {
        console.error('[WorldScene] No sessionId found in bridge or localStorage');
        this.showError('Сессия не найдена. Перезагрузите страницу.');
        return;
      }
      
      console.log('[WorldScene] Using sessionId:', sessionId);
      
      // Load all locations for this session
      const response = await fetch(`/api/map?action=all&sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.success && data.locations && Array.isArray(data.locations)) {
        if (data.locations.length === 0) {
          this.showError('Локации не найдены. Создайте мир заново.');
          return;
        }
        console.log('[WorldScene] Loaded', data.locations.length, 'locations');
        this.worldData = data.locations;
        this.renderLocations(data.locations);
      } else {
        console.error('[WorldScene] API error:', data.error);
        this.showError(data.error || 'Не удалось загрузить локации');
      }
    } catch (error) {
      console.error('[WorldScene] Failed to load locations:', error);
      this.showError('Ошибка загрузки карты мира');
    }
  }
  
  private showError(message: string): void {
    // Show error message with retry button
    const container = this.add.container(450, 275);
    container.setDepth(DEPTHS.ui + 10);
    
    const bg = this.add.rectangle(0, 0, 400, 100, 0x1a1a2e, 0.95);
    bg.setStrokeStyle(2, 0xef4444);
    
    const text = this.add.text(0, -20, message, {
      fontSize: '14px',
      color: '#ef4444',
      align: 'center',
      wordWrap: { width: 380 },
    }).setOrigin(0.5);
    
    // Retry button
    const btnBg = this.add.rectangle(0, 25, 120, 30, 0x4ade80, 0.8);
    btnBg.setInteractive({ useHandCursor: true });
    
    const btnText = this.add.text(0, 25, '🔄 Повторить', {
      fontSize: '12px',
      color: '#000000',
    }).setOrigin(0.5);
    
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x86efac, 1));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x4ade80, 0.8));
    btnBg.on('pointerdown', () => {
      container.destroy();
      this.loadLocations();
    });
    
    container.add([bg, text, btnBg, btnText]);
  }
  
  private renderLocations(locations: Location[]): void {
    console.log('[WorldScene] Rendering locations:', locations.length);
    
    // Always arrange locations in a circle for the world map view
    // Real coordinates are too large for display (thousands of meters)
    this.arrangeLocationsInCircle(locations);
    
    locations.forEach((location) => {
      console.log('[WorldScene] Creating marker for:', location.name, 'at', location.x, location.y);
      const container = this.createLocationMarker(location);
      this.locations.set(location.id, container);
    });
    
    console.log('[WorldScene] Total markers created:', this.locations.size);
  }
  
  private arrangeLocationsInCircle(locations: Location[]): void {
    const centerX = 450;
    const centerY = 275;
    const radius = 180;
    
    // Always recalculate screen positions for display
    // Real world coordinates are in meters and too large for screen
    locations.forEach((location, index) => {
      const angle = (index / locations.length) * Math.PI * 2 - Math.PI / 2;
      // Store display coordinates (override real coordinates for rendering)
      (location as any).displayX = centerX + Math.cos(angle) * radius;
      (location as any).displayY = centerY + Math.sin(angle) * radius;
    });
  }
  
  private createLocationMarker(location: Location): Phaser.GameObjects.Container {
    // Use display coordinates if available, otherwise use real coordinates or center
    const x = (location as any).displayX ?? location.x ?? 450;
    const y = (location as any).displayY ?? location.y ?? 275;
    
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
    
    // Get sessionId from GameBridge (set by GameContainer)
    const bridge = GameBridge.getInstance();
    let sessionId = bridge.getSessionId();
    
    // Fallback to localStorage
    if (!sessionId && typeof window !== 'undefined') {
      sessionId = localStorage.getItem('cultivation_session_id');
    }

    // Transition to location scene with sessionId
    this.time.delayedCall(100, () => {
      this.goToScene('LocationScene', { 
        locationId: location.id, 
        locationName: location.name,
        sessionId: sessionId || undefined,
      });
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
