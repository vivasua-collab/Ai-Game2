/**
 * Sprite Loader Service for Phaser
 * 
 * Handles loading and caching of AI-generated sprites
 * 
 * IMPORTANT: This module should only be used in Phaser scene context (browser only)
 */

import { SPRITE_PATHS, QI_AURA_CONFIG, getCultivationTheme } from '../config/sprites.config';

// Helper to convert hex color string to number
function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/**
 * Cultivation theme based on level
 */
function getCultivationThemeConfig(level: number) {
  const theme = getCultivationTheme(level);
  return {
    color: hexToNumber(theme.color),
    intensity: theme.intensity,
    name: theme.name,
    glow: theme.glow,
  };
}

export class SpriteLoader {
  private scene: Phaser.Scene;
  private loadedTextures: Set<string> = new Set();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  /**
   * Check if a texture is already loaded
   */
  isTextureLoaded(key: string): boolean {
    return this.loadedTextures.has(key) || this.scene.textures.exists(key);
  }
  
  /**
   * Load player directional spritesheet
   */
  loadPlayerDirectionalSprites(): void {
    const textureKey = 'player_directions';
    
    if (this.isTextureLoaded(textureKey)) {
      return;
    }
    
    this.scene.load.image(textureKey, SPRITE_PATHS.player.directions);
    this.loadedTextures.add(textureKey);
  }
  
  /**
   * Load cultivation level sprite
   * @param level Cultivation level (1-9)
   * @param asPlayerKey If true, load with 'player' key to replace fallback
   */
  loadCultivationLevelSprite(level: number, asPlayerKey: boolean = false): void {
    const textureKey = asPlayerKey ? 'player' : `player_level_${level}`;
    
    if (this.isTextureLoaded(textureKey)) {
      return;
    }
    
    // Find closest available level
    const availableLevels = [1, 3, 5, 7, 9] as const;
    const closestLevel = availableLevels.reduce((prev, curr) => 
      Math.abs(curr - level) < Math.abs(prev - level) ? curr : prev
    );
    
    const path = SPRITE_PATHS.player.levels[closestLevel];
    if (path) {
      this.scene.load.image(textureKey, path);
      this.loadedTextures.add(textureKey);
    }
  }
  
  /**
   * Load effect sprites
   */
  loadEffectSprites(): void {
    const effects = [
      { key: 'qi_glow', path: SPRITE_PATHS.effects.qiGlow },
      { key: 'breakthrough', path: SPRITE_PATHS.effects.breakthrough },
      { key: 'meditation', path: SPRITE_PATHS.effects.meditation },
    ];
    
    effects.forEach(({ key, path }) => {
      if (!this.isTextureLoaded(key)) {
        this.scene.load.image(key, path);
        this.loadedTextures.add(key);
      }
    });
  }
  
  /**
   * Create Qi aura effect around player
   * Returns a container with pulsing glow circles
   */
  createQiAura(
    x: number, 
    y: number, 
    cultivationLevel: number,
    currentQi: number,
    maxQi: number
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const themeConfig = getCultivationThemeConfig(cultivationLevel);
    
    // Qi percentage affects aura intensity
    const qiPercent = maxQi > 0 ? currentQi / maxQi : 0.5;
    
    // Base glow circle
    const baseRadius = QI_AURA_CONFIG.baseRadius + (cultivationLevel * QI_AURA_CONFIG.radiusPerLevel);
    const glowColor = themeConfig.color;
    
    // Outer glow (large, dim)
    const outerGlow = this.scene.add.circle(0, 0, baseRadius * 1.5, glowColor, 0.1 * qiPercent);
    outerGlow.setBlendMode(Phaser.BlendModes.ADD);
    container.add(outerGlow);
    
    // Middle glow
    const middleGlow = this.scene.add.circle(0, 0, baseRadius, glowColor, 0.2 * qiPercent);
    middleGlow.setBlendMode(Phaser.BlendModes.ADD);
    container.add(middleGlow);
    
    // Inner glow (brighter)
    const innerGlow = this.scene.add.circle(0, 0, baseRadius * 0.6, glowColor, 0.3 * qiPercent);
    innerGlow.setBlendMode(Phaser.BlendModes.ADD);
    container.add(innerGlow);
    
    // Pulsing animation
    this.scene.tweens.add({
      targets: [outerGlow, middleGlow, innerGlow],
      scaleX: 1.1,
      scaleY: 1.1,
      alpha: { from: outerGlow.alpha, to: outerGlow.alpha * 1.5 },
      duration: QI_AURA_CONFIG.pulseSpeed,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    
    // Floating particles for higher levels
    if (cultivationLevel >= 3) {
      this.createQiParticles(container, baseRadius, glowColor, cultivationLevel);
    }
    
    return container;
  }
  
  /**
   * Create floating Qi particles
   */
  private createQiParticles(
    container: Phaser.GameObjects.Container,
    radius: number,
    color: number,
    level: number
  ): void {
    const particleCount = Math.min(QI_AURA_CONFIG.particleCount, 5 + level * 2);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = radius * 0.8 + Math.random() * radius * 0.4;
      
      const particle = this.scene.add.circle(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        2 + Math.random() * 3,
        color,
        0.4 + Math.random() * 0.3
      );
      particle.setBlendMode(Phaser.BlendModes.ADD);
      container.add(particle);
      
      // Orbit animation
      this.scene.tweens.add({
        targets: particle,
        x: Math.cos(angle + Math.PI) * distance,
        y: Math.sin(angle + Math.PI) * distance,
        duration: 2000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
  
  /**
   * Create breakthrough effect
   */
  createBreakthroughEffect(x: number, y: number, level: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const themeConfig = getCultivationThemeConfig(level);
    const color = themeConfig.color;
    
    // Expanding rings
    for (let i = 0; i < 3; i++) {
      const ring = this.scene.add.circle(0, 0, 10, color, 0);
      ring.setStrokeStyle(3, color, 0.8);
      container.add(ring);
      
      this.scene.tweens.add({
        targets: ring,
        radius: 100 + i * 30,
        alpha: 0,
        duration: 800,
        delay: i * 200,
        ease: 'Power2',
        onComplete: () => ring.destroy(),
      });
    }
    
    // Flash
    const flash = this.scene.add.circle(0, 0, 50, 0xFFFFFF, 1);
    container.add(flash);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => flash.destroy(),
    });
    
    // Auto-destroy after animation
    this.scene.time.delayedCall(2000, () => {
      container.destroy();
    });
    
    return container;
  }
  
  /**
   * Create meditation effect
   */
  createMeditationEffect(x: number, y: number, level: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const themeConfig = getCultivationThemeConfig(level);
    const color = themeConfig.color;
    
    // Lotus pattern
    const petals = 6 + Math.min(level, 6);
    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * Math.PI * 2;
      const petal = this.scene.add.ellipse(
        Math.cos(angle) * 30,
        Math.sin(angle) * 30,
        20, 40,
        color,
        0.3
      );
      petal.setRotation(angle + Math.PI / 2);
      petal.setBlendMode(Phaser.BlendModes.ADD);
      container.add(petal);
    }
    
    // Center glow
    const centerGlow = this.scene.add.circle(0, 0, 20, color, 0.5);
    centerGlow.setBlendMode(Phaser.BlendModes.ADD);
    container.add(centerGlow);
    
    // Breathing animation
    this.scene.tweens.add({
      targets: container,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    
    return container;
  }
}

/**
 * Create a fallback player texture (programmatic)
 * A small cultivator character with front/back distinction
 */
export function createFallbackPlayerTexture(scene: Phaser.Scene, level: number = 1): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  const scale = 2; // Scale up for better detail
  const w = 32 * scale;  // Width of character
  const h = 48 * scale;  // Height of character
  const cx = w / 2 + 8 * scale;
  const cy = h / 2 + 8 * scale;
  const textureSize = w + 16 * scale;
  
  const themeConfig = getCultivationThemeConfig(level);
  const glowColor = themeConfig.color;
  
  // === QI GLOW AURA (behind character) ===
  graphics.lineStyle(3 + level * 0.5, glowColor, 0.4);
  graphics.strokeCircle(cx, cy - 4 * scale, 22 * scale);
  
  // === ROBE/BODY ===
  // Outer robe (darker)
  graphics.fillStyle(0x1a3d2e);
  graphics.fillRoundedRect(cx - 10 * scale, cy - 8 * scale, 20 * scale, 28 * scale, 4 * scale);
  
  // Inner robe (lighter)
  graphics.fillStyle(0x2d5a4d);
  graphics.fillRoundedRect(cx - 8 * scale, cy - 6 * scale, 16 * scale, 24 * scale, 3 * scale);
  
  // Robe collar (V-shape)
  graphics.fillStyle(0x1a2d24);
  graphics.beginPath();
  graphics.moveTo(cx - 4 * scale, cy - 6 * scale);
  graphics.lineTo(cx, cy + 2 * scale);
  graphics.lineTo(cx + 4 * scale, cy - 6 * scale);
  graphics.closePath();
  graphics.fillPath();
  
  // === HEAD ===
  // Face (front side - right part of texture)
  graphics.fillStyle(0xf5deb3); // Skin tone
  graphics.fillCircle(cx, cy - 14 * scale, 7 * scale);
  
  // Hair (covers back of head)
  graphics.fillStyle(0x1a1a2e);
  graphics.beginPath();
  graphics.arc(cx, cy - 14 * scale, 7 * scale, Math.PI * 0.8, Math.PI * 2.2, false);
  graphics.closePath();
  graphics.fillPath();
  
  // Hair top
  graphics.fillEllipse(cx, cy - 19 * scale, 6 * scale, 3 * scale);
  
  // Hair bun (traditional cultivator style)
  graphics.fillCircle(cx, cy - 22 * scale, 3 * scale);
  
  // === FACE DETAILS (only on front) ===
  // Eyes
  graphics.fillStyle(0x000000);
  graphics.fillCircle(cx + 2 * scale, cy - 15 * scale, 1 * scale);
  
  // Eyebrow
  graphics.lineStyle(1, 0x1a1a2e, 1);
  graphics.beginPath();
  graphics.moveTo(cx, cy - 17 * scale);
  graphics.lineTo(cx + 4 * scale, cy - 17.5 * scale);
  graphics.strokePath();
  
  // === ARMS ===
  // Left arm
  graphics.fillStyle(0x2d5a4d);
  graphics.fillRoundedRect(cx - 12 * scale, cy - 4 * scale, 5 * scale, 12 * scale, 2 * scale);
  
  // Right arm  
  graphics.fillRoundedRect(cx + 7 * scale, cy - 4 * scale, 5 * scale, 12 * scale, 2 * scale);
  
  // Hands
  graphics.fillStyle(0xf5deb3);
  graphics.fillCircle(cx - 10 * scale, cy + 10 * scale, 2 * scale);
  graphics.fillCircle(cx + 10 * scale, cy + 10 * scale, 2 * scale);
  
  // === LEGS ===
  graphics.fillStyle(0x1a3d2e);
  graphics.fillRoundedRect(cx - 7 * scale, cy + 18 * scale, 5 * scale, 10 * scale, 2 * scale);
  graphics.fillRoundedRect(cx + 2 * scale, cy + 18 * scale, 5 * scale, 10 * scale, 2 * scale);
  
  // Feet
  graphics.fillStyle(0x3d2d1a);
  graphics.fillRoundedRect(cx - 8 * scale, cy + 26 * scale, 6 * scale, 4 * scale, 1 * scale);
  graphics.fillRoundedRect(cx + 2 * scale, cy + 26 * scale, 6 * scale, 4 * scale, 1 * scale);
  
  // === DIRECTION INDICATOR (arrow) ===
  graphics.fillStyle(glowColor);
  graphics.beginPath();
  graphics.moveTo(cx + 14 * scale, cy);
  graphics.lineTo(cx + 10 * scale, cy - 3 * scale);
  graphics.lineTo(cx + 10 * scale, cy + 3 * scale);
  graphics.closePath();
  graphics.fillPath();
  
  // === OUTER QI GLOW (level-dependent intensity) ===
  graphics.lineStyle(1 + level * 0.3, glowColor, themeConfig.intensity * 0.5);
  graphics.strokeCircle(cx, cy, 28 * scale);
  
  graphics.generateTexture('player', textureSize, textureSize);
  graphics.destroy();
}

// ============================================
// 8-DIRECTION SPRITE SHEET GENERATOR
// ============================================

/**
 * Direction angles and their frame indices
 * 0 = S (down), 1 = SW, 2 = W, 3 = NW, 4 = N (up), 5 = NE, 6 = E, 7 = SE
 */
export const DIRECTION_FRAMES = {
  S: 0,   // looking down (screen)
  SW: 1,  // looking down-left
  W: 2,   // looking left
  NW: 3,  // looking up-left
  N: 4,   // looking up (screen)
  NE: 5,  // looking up-right
  E: 6,   // looking right
  SE: 7,  // looking down-right
} as const;

/**
 * Convert angle in degrees to direction frame index
 * 
 * Phaser screen coordinates: Y increases downward
 * - Mouse at right of player: angle = 0° (E)
 * - Mouse below player: angle = 90° (S)
 * - Mouse at left of player: angle = 180° (W)
 * - Mouse above player: angle = -90° or 270° (N)
 * 
 * @param angleDeg Angle in degrees from atan2(dy, dx)
 * @returns Frame index (0-7)
 */
export function angleToDirectionFrame(angleDeg: number): number {
  // Normalize angle to 0-360
  let normalized = ((angleDeg % 360) + 360) % 360;
  
  // In Phaser screen coords:
  // 0° = E (right), 90° = S (down), 180° = W (left), 270° = N (up)
  // Our frames: S=0, SW=1, W=2, NW=3, N=4, NE=5, E=6, SE=7
  
  // Map normalized angle to frame (45° sectors):
  // E: 337.5 - 22.5 → frame 6
  // SE: 22.5 - 67.5 → frame 7
  // S: 67.5 - 112.5 → frame 0
  // SW: 112.5 - 157.5 → frame 1
  // W: 157.5 - 202.5 → frame 2
  // NW: 202.5 - 247.5 → frame 3
  // N: 247.5 - 292.5 → frame 4
  // NE: 292.5 - 337.5 → frame 5
  
  if (normalized >= 337.5 || normalized < 22.5) return DIRECTION_FRAMES.E;   // ~0°
  if (normalized >= 22.5 && normalized < 67.5) return DIRECTION_FRAMES.SE;    // ~45°
  if (normalized >= 67.5 && normalized < 112.5) return DIRECTION_FRAMES.S;    // ~90°
  if (normalized >= 112.5 && normalized < 157.5) return DIRECTION_FRAMES.SW;  // ~135°
  if (normalized >= 157.5 && normalized < 202.5) return DIRECTION_FRAMES.W;   // ~180°
  if (normalized >= 202.5 && normalized < 247.5) return DIRECTION_FRAMES.NW;  // ~225°
  if (normalized >= 247.5 && normalized < 292.5) return DIRECTION_FRAMES.N;   // ~270°
  return DIRECTION_FRAMES.NE; // 292.5 - 337.5 ~315°
}

/**
 * Create a spritesheet with 8 directions (top-down view)
 * Each frame shows the character facing a different direction
 * 
 * Frame layout: S, SW, W, NW, N, NE, E, SE (left to right)
 * 
 * IMPORTANT: Creates a canvas texture that Phaser treats as a spritesheet
 */
export function createDirectionalSpritesheet(scene: Phaser.Scene, level: number = 1): void {
  const frameSize = 64; // Each frame is 64x64
  const sheetWidth = frameSize * 8; // 8 directions in a row
  
  const themeConfig = getCultivationThemeConfig(level);
  const glowColor = themeConfig.color;
  
  // Create a canvas for the spritesheet
  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = frameSize;
  const ctx = canvas.getContext('2d')!;
  
  // Direction angles for drawing (which way character faces)
  const directions = [
    { name: 'S', angle: Math.PI / 2 },      // 90° - facing down
    { name: 'SW', angle: Math.PI * 0.75 },  // 135°
    { name: 'W', angle: Math.PI },          // 180° - facing left
    { name: 'NW', angle: Math.PI * 1.25 },  // 225°
    { name: 'N', angle: Math.PI * 1.5 },    // 270° - facing up
    { name: 'NE', angle: Math.PI * 1.75 },  // 315°
    { name: 'E', angle: 0 },                // 0° - facing right
    { name: 'SE', angle: Math.PI * 0.25 },  // 45°
  ];
  
  directions.forEach((dir, frameIndex) => {
    const cx = frameIndex * frameSize + frameSize / 2;
    const cy = frameSize / 2;
    const s = 1; // Scale factor
    
    // Helper to convert hex color to CSS
    const hexToCss = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`;
    const hexToRgba = (hex: number, alpha: number) => {
      const r = (hex >> 16) & 255;
      const g = (hex >> 8) & 255;
      const b = hex & 255;
      return `rgba(${r},${g},${b},${alpha})`;
    };
    
    // === QI GLOW (subtle) ===
    ctx.strokeStyle = hexToRgba(glowColor, 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.stroke();
    
    // === BODY (oval, top-down view) ===
    // Outer robe
    ctx.fillStyle = hexToCss(0x1a3d2e);
    ctx.beginPath();
    ctx.ellipse(cx, cy, 28 * s, 24 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner robe
    ctx.fillStyle = hexToCss(0x2d5a4d);
    ctx.beginPath();
    ctx.ellipse(cx, cy, 22 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // === HEAD (circle at front of body) ===
    const headOffsetX = Math.cos(dir.angle) * 8;
    const headOffsetY = Math.sin(dir.angle) * 6;
    
    // Hair/head back
    ctx.fillStyle = hexToCss(0x1a1a2e);
    ctx.beginPath();
    ctx.arc(cx + headOffsetX, cy + headOffsetY - 2, 10 * s, 0, Math.PI * 2);
    ctx.fill();
    
    // Face
    ctx.fillStyle = hexToCss(0xf5deb3);
    ctx.beginPath();
    ctx.arc(cx + headOffsetX, cy + headOffsetY, 8 * s, 0, Math.PI * 2);
    ctx.fill();
    
    // Hair bun (visible from top)
    ctx.fillStyle = hexToCss(0x1a1a2e);
    ctx.beginPath();
    ctx.arc(cx + headOffsetX * 0.3, cy + headOffsetY * 0.3 - 4, 4 * s, 0, Math.PI * 2);
    ctx.fill();
    
    // === FACE DETAILS (only visible when facing down-ish) ===
    if (dir.name === 'S' || dir.name === 'SE' || dir.name === 'SW') {
      // Eyes
      ctx.fillStyle = hexToCss(0x000000);
      ctx.beginPath();
      ctx.arc(cx + headOffsetX - 2, cy + headOffsetY - 1, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + headOffsetX + 2, cy + headOffsetY - 1, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // === HANDS (positioned based on direction) ===
    const handDist = 14;
    const handAngle1 = dir.angle + Math.PI / 3;
    const handAngle2 = dir.angle - Math.PI / 3;
    
    ctx.fillStyle = hexToCss(0xf5deb3);
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(handAngle1) * handDist,
      cy + Math.sin(handAngle1) * handDist,
      4 * s, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(handAngle2) * handDist,
      cy + Math.sin(handAngle2) * handDist,
      4 * s, 0, Math.PI * 2
    );
    ctx.fill();
    
    // === DIRECTION INDICATOR (small dot showing facing) ===
    const arrowDist = 26;
    const arrowX = cx + Math.cos(dir.angle) * arrowDist;
    const arrowY = cy + Math.sin(dir.angle) * arrowDist;
    
    ctx.fillStyle = hexToRgba(glowColor, 0.8);
    ctx.beginPath();
    ctx.arc(arrowX, arrowY, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Add the canvas as a spritesheet texture
  scene.textures.addCanvas('player_directions', canvas);
  
  // Add frame data to the texture so Phaser knows it's a spritesheet
  const texture = scene.textures.get('player_directions');
  for (let i = 0; i < 8; i++) {
    texture.add(i, 0, i * frameSize, 0, frameSize, frameSize);
  }
}
