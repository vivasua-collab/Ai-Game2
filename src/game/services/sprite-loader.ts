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

// ============================================
// SIMPLIFIED 2-DIRECTION SPRITE SYSTEM (East-West)
// ============================================

/**
 * Типы анимаций персонажа
 */
export type PlayerAnimation = 'idle' | 'walk' | 'attack';

/**
 * Параметры для отрисовки фрейма персонажа
 */
interface CharacterFrameParams {
  cx: number;           // Центр X
  cy: number;           // Центр Y
  frameIndex: number;   // Индекс фрейма в анимации
  animation: PlayerAnimation;
  level: number;
  glowColor: number;
  scale?: number;
}

/**
 * Нарисовать фрейм персонажа в профиль (смотрит влево - "Запад")
 * 
 * @param ctx Canvas контекст
 * @param params Параметры отрисовки
 */
function drawCharacterProfileFrame(
  ctx: CanvasRenderingContext2D,
  params: CharacterFrameParams
): void {
  const { cx, cy, frameIndex, animation, level, glowColor, scale = 1 } = params;
  const s = scale;
  
  // Анимационные смещения
  const isWalking = animation === 'walk';
  const isAttacking = animation === 'attack';
  const isIdle = animation === 'idle';
  
  // Дыхание для idle
  const breathe = isIdle ? Math.sin(frameIndex * Math.PI / 2) * 1.5 : 0;
  
  // Шаги для walk
  const walkCycle = isWalking ? frameIndex : 0;
  const legOffset = isWalking ? Math.sin(walkCycle * Math.PI / 3) * 4 : 0;
  const armSwing = isWalking ? Math.sin(walkCycle * Math.PI / 3) * 5 : 0;
  const bodyBob = isWalking ? Math.abs(Math.sin(walkCycle * Math.PI / 3)) * 2 : 0;
  
  // Атака
  const attackPhase = isAttacking ? frameIndex / 3 : 0; // 0-1 за 4 фрейма
  const armExtend = isAttacking ? Math.sin(attackPhase * Math.PI) * 15 : 0;
  const bodyLean = isAttacking ? Math.sin(attackPhase * Math.PI) * 3 : 0;
  
  // === ЦИ СИЯНИЕ (фон) ===
  ctx.strokeStyle = `rgba(${(glowColor >> 16) & 255}, ${(glowColor >> 8) & 255}, ${glowColor & 255}, 0.25)`;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.arc(cx, cy - breathe, 26 * s, 0, Math.PI * 2);
  ctx.stroke();
  
  // Внешнее свечение
  ctx.strokeStyle = `rgba(${(glowColor >> 16) & 255}, ${(glowColor >> 8) & 255}, ${glowColor & 255}, 0.1)`;
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.arc(cx, cy - breathe, 30 * s, 0, Math.PI * 2);
  ctx.stroke();
  
  // === ТЕНЬ ===
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 28 * s + bodyBob, 12 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // === НОГИ ===
  ctx.strokeStyle = '#1a3d2e';
  ctx.lineWidth = 6 * s;
  ctx.lineCap = 'round';
  
  // Задняя нога (дальняя от зрителя)
  ctx.beginPath();
  ctx.moveTo(cx + 2 * s, cy + 10 * s - bodyBob);
  ctx.lineTo(cx + 5 * s + legOffset * s, cy + 26 * s - bodyBob);
  ctx.stroke();
  
  // Передняя нога (ближайшая к зрителю)
  ctx.beginPath();
  ctx.moveTo(cx - 2 * s, cy + 10 * s - bodyBob);
  ctx.lineTo(cx - 5 * s - legOffset * s, cy + 26 * s - bodyBob);
  ctx.stroke();
  
  // Ступни
  ctx.fillStyle = '#3d2d1a';
  ctx.beginPath();
  ctx.ellipse(cx + 6 * s + legOffset * s, cy + 27 * s - bodyBob, 4 * s, 2 * s, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx - 6 * s - legOffset * s, cy + 27 * s - bodyBob, 4 * s, 2 * s, -0.1, 0, Math.PI * 2);
  ctx.fill();
  
  // === ТЕЛО (РОБА) ===
  // Задняя часть робы
  ctx.fillStyle = '#153025';
  ctx.beginPath();
  ctx.ellipse(cx - 2 * s - bodyLean * s, cy - 2 * s - breathe - bodyBob, 12 * s, 16 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Основная роба
  ctx.fillStyle = '#1a3d2e';
  ctx.beginPath();
  ctx.ellipse(cx - bodyLean * s, cy - 2 * s - breathe - bodyBob, 14 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Внутренняя роба
  ctx.fillStyle = '#2d5a4d';
  ctx.beginPath();
  ctx.ellipse(cx - bodyLean * s, cy - 2 * s - breathe - bodyBob, 10 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // V-образный вырез ворота
  ctx.fillStyle = '#153025';
  ctx.beginPath();
  ctx.moveTo(cx - 4 * s - bodyLean * s, cy - 14 * s - breathe - bodyBob);
  ctx.lineTo(cx - bodyLean * s, cy - 4 * s - breathe - bodyBob);
  ctx.lineTo(cx + 2 * s - bodyLean * s, cy - 14 * s - breathe - bodyBob);
  ctx.closePath();
  ctx.fill();
  
  // === РУКИ ===
  ctx.fillStyle = '#2d5a4d';
  ctx.strokeStyle = '#2d5a4d';
  ctx.lineWidth = 5 * s;
  
  // Задняя рука (дальняя)
  const backArmX = cx + 8 * s + bodyLean * s;
  const backArmY = cy - 4 * s - breathe - bodyBob - armSwing * s;
  ctx.beginPath();
  ctx.moveTo(backArmX, backArmY);
  ctx.lineTo(backArmX + 10 * s, backArmY + 12 * s);
  ctx.stroke();
  
  // Кисть задней руки
  ctx.fillStyle = '#f5deb3';
  ctx.beginPath();
  ctx.arc(backArmX + 12 * s, backArmY + 14 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  
  // Передняя рука (ближайшая) - для атаки выдвигается вперёд
  const frontArmX = cx - 10 * s - bodyLean * s;
  const frontArmY = cy - 6 * s - breathe - bodyBob + armSwing * s;
  
  ctx.fillStyle = '#2d5a4d';
  ctx.strokeStyle = '#2d5a4d';
  ctx.lineWidth = 6 * s;
  ctx.beginPath();
  ctx.moveTo(frontArmX, frontArmY);
  
  if (isAttacking) {
    // Рука выбрасывается вперёд-влево для удара
    ctx.lineTo(frontArmX - 15 * s - armExtend * s, frontArmY - 5 * s - armExtend * 0.3 * s);
  } else {
    ctx.lineTo(frontArmX - 8 * s, frontArmY + 14 * s);
  }
  ctx.stroke();
  
  // Кисть передней руки
  ctx.fillStyle = '#f5deb3';
  if (isAttacking) {
    // Кулак для атаки
    ctx.beginPath();
    ctx.arc(frontArmX - 18 * s - armExtend * s, frontArmY - 6 * s - armExtend * 0.3 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(frontArmX - 10 * s, frontArmY + 16 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // === ГОЛОВА ===
  // Волосы сзади
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(cx - 4 * s - bodyLean * s, cy - 20 * s - breathe - bodyBob, 9 * s, Math.PI * 0.6, Math.PI * 1.6);
  ctx.fill();
  
  // Лицо (профиль)
  ctx.fillStyle = '#f5deb3';
  ctx.beginPath();
  ctx.ellipse(cx - 6 * s - bodyLean * s, cy - 20 * s - breathe - bodyBob, 7 * s, 8 * s, 0.1, 0, Math.PI * 2);
  ctx.fill();
  
  // Ухо
  ctx.fillStyle = '#e8d4a8';
  ctx.beginPath();
  ctx.ellipse(cx + 1 * s - bodyLean * s, cy - 20 * s - breathe - bodyBob, 2 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Волосы на голове
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(cx - 4 * s - bodyLean * s, cy - 26 * s - breathe - bodyBob, 7 * s, Math.PI * 0.8, Math.PI * 2.2);
  ctx.fill();
  
  // Пучок волос (традиционный стиль культиватора)
  ctx.beginPath();
  ctx.arc(cx - 8 * s - bodyLean * s, cy - 32 * s - breathe - bodyBob, 4 * s, 0, Math.PI * 2);
  ctx.fill();
  
  // Палочка для волос
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 4 * s - bodyLean * s, cy - 28 * s - breathe - bodyBob);
  ctx.lineTo(cx - 12 * s - bodyLean * s, cy - 35 * s - breathe - bodyBob);
  ctx.stroke();
  
  // === ЛИЦО (профиль) ===
  // Глаз (один, т.к. профиль)
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(cx - 10 * s - bodyLean * s, cy - 21 * s - breathe - bodyBob, 1.5 * s, 1 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Бровь
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 12 * s - bodyLean * s, cy - 24 * s - breathe - bodyBob);
  ctx.lineTo(cx - 8 * s - bodyLean * s, cy - 24.5 * s - breathe - bodyBob);
  ctx.stroke();
  
  // Нос (профиль)
  ctx.strokeStyle = '#d4b896';
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 13 * s - bodyLean * s, cy - 18 * s - breathe - bodyBob);
  ctx.lineTo(cx - 14 * s - bodyLean * s, cy - 15 * s - breathe - bodyBob);
  ctx.stroke();
  
  // Рот
  ctx.strokeStyle = '#c4a080';
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 12 * s - bodyLean * s, cy - 13 * s - breathe - bodyBob);
  ctx.lineTo(cx - 9 * s - bodyLean * s, cy - 13 * s - breathe - bodyBob);
  ctx.stroke();
  
  // === ИНДИКАТОР НАПРАВЛЕНИЯ (маленькая стрелка) ===
  // Стрелка показывает, куда смотрит персонаж (влево)
  ctx.fillStyle = `rgba(${(glowColor >> 16) & 255}, ${(glowColor >> 8) & 255}, ${glowColor & 255}, 0.8)`;
  ctx.beginPath();
  ctx.moveTo(cx - 28 * s, cy - 5 * s - breathe - bodyBob);
  ctx.lineTo(cx - 22 * s, cy - 8 * s - breathe - bodyBob);
  ctx.lineTo(cx - 22 * s, cy - 2 * s - breathe - bodyBob);
  ctx.closePath();
  ctx.fill();
}

/**
 * Создать спрайт персонажа с 2 направлениями (Восток/Запад)
 * 
 * Принцип:
 * - 1 спрайт смотрит влево ("Запад")
 * - Правое направление ("Восток") = flipX оригинала
 * 
 * @param scene Phaser Scene
 * @param level Уровень культивации (1-9)
 * @param animation Тип анимации ('idle', 'walk', 'attack')
 */
export function createSimpleDirectionalSprite(
  scene: Phaser.Scene,
  level: number = 1,
  animation: PlayerAnimation = 'idle'
): void {
  const frameSize = 64;
  const frameCount = animation === 'walk' ? 6 : 4; // walk = 6 frames, others = 4
  const sheetWidth = frameSize * frameCount;
  
  const themeConfig = getCultivationThemeConfig(level);
  const glowColor = themeConfig.color;
  
  // Create canvas for the spritesheet
  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = frameSize;
  const ctx = canvas.getContext('2d')!;
  
  // Draw each frame
  for (let i = 0; i < frameCount; i++) {
    const cx = i * frameSize + frameSize / 2;
    const cy = frameSize / 2;
    
    drawCharacterProfileFrame(ctx, {
      cx,
      cy,
      frameIndex: i,
      animation,
      level,
      glowColor,
      scale: 1
    });
  }
  
  // Add texture
  const textureKey = `player_${animation}`;
  scene.textures.addCanvas(textureKey, canvas);
  
  // Add frame data for animation
  const texture = scene.textures.get(textureKey);
  for (let i = 0; i < frameCount; i++) {
    texture.add(i, 0, i * frameSize, 0, frameSize, frameSize);
  }
  
  console.log(`[SpriteLoader] Created ${textureKey} sprite with ${frameCount} frames`);
}

/**
 * Создать все анимации персонажа (idle, walk, attack)
 */
export function createAllPlayerAnimations(scene: Phaser.Scene, level: number = 1): void {
  createSimpleDirectionalSprite(scene, level, 'idle');
  createSimpleDirectionalSprite(scene, level, 'walk');
  createSimpleDirectionalSprite(scene, level, 'attack');
}

/**
 * Определить, нужно ли отзеркалить спрайт
 * 
 * @param angleDeg Угол направления в градусах (0 = вправо, 90 = вниз, 180 = влево, -90 = вверх)
 * @returns true если нужно flipX (смотрит вправо/Восток)
 */
export function shouldFlipSprite(angleDeg: number): boolean {
  // Normalize to 0-360
  const normalized = ((angleDeg % 360) + 360) % 360;
  
  // Правая сторона (Восток): 270° - 90° (или -90° - 90°)
  // Левая сторона (Запад): 90° - 270°
  
  // flipX = true когда смотрим вправо (Восток)
  return normalized < 90 || normalized > 270;
}

/**
 * Создать Phaser анимации для персонажа
 * Вызывать после создания текстур через createAllPlayerAnimations()
 */
export function createPlayerAnimationDefs(scene: Phaser.Scene): void {
  // Idle animation (4 frames, breathing)
  if (!scene.anims.exists('player_idle_anim')) {
    scene.anims.create({
      key: 'player_idle_anim',
      frames: scene.anims.generateFrameNumbers('player_idle', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });
  }
  
  // Walk animation (6 frames, walking cycle)
  if (!scene.anims.exists('player_walk_anim')) {
    scene.anims.create({
      key: 'player_walk_anim',
      frames: scene.anims.generateFrameNumbers('player_walk', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    });
  }
  
  // Attack animation (4 frames, single hit)
  if (!scene.anims.exists('player_attack_anim')) {
    scene.anims.create({
      key: 'player_attack_anim',
      frames: scene.anims.generateFrameNumbers('player_attack', { start: 0, end: 3 }),
      frameRate: 12,
      repeat: 0
    });
  }
  
  console.log('[SpriteLoader] Created player animation definitions');
}
