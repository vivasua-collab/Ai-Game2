/**
 * Game Scene - Training Ground with targets and combat system
 * 
 * Features:
 * - Player with 360° rotation (mouse control)
 * - Training targets (straw dummies)
 * - Damage number popups
 * - Direction-based technique usage
 * - WASD movement + mouse aiming
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameSessionId, useGameActions, useGameCharacter, useGameTechniques, useGameMessages, useGameLoading, useGameTime } from '@/stores/game.store';
import type { Message, CharacterTechnique } from '@/types/game';
import { getCombatSlotsCount } from '@/types/game';

// Game dimensions
const BASE_WIDTH = 1200;
const BASE_HEIGHT = 700;
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;

// Player settings
const PLAYER_SIZE = 24;
const PLAYER_SPEED = 200;
const METERS_TO_PIXELS = 32; // 1 meter = 32 pixels

// Time tracking
const TILE_SIZE = 64;
const TIME_SYNC_INTERVAL = 3000;
const MIN_TILES_FOR_SYNC = 1;

// Combat slots configuration
const COMBAT_SLOT_KEYS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO', 'MINUS', 'EQUALS'];

// Target positions (6 training dummies)
const TARGET_POSITIONS = [
  { x: 400, y: 300 },
  { x: 600, y: 300 },
  { x: 800, y: 300 },
  { x: 400, y: 600 },
  { x: 600, y: 600 },
  { x: 800, y: 600 },
];

// Damage number colors
const DAMAGE_COLORS: Record<string, string> = {
  normal: '#FFFFFF',
  critical: '#FF4444',
  fire: '#FF8844',
  water: '#4488FF',
  earth: '#886644',
  air: '#CCCCCC',
  lightning: '#FFFF44',
  void: '#9944FF',
  healing: '#44FF44',
};

// ============================================
// INTERFACES
// ============================================

interface TrainingTarget {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  sprite: Phaser.GameObjects.Container | null;
  hpBar: Phaser.GameObjects.Graphics | null;
  lastHitTime: number;
}

interface DamageNumber {
  id: string;
  x: number;
  y: number;
  damage: number;
  type: string;
  text: Phaser.GameObjects.Text;
  createdAt: number;
}

// Global references
let globalSessionId: string | null = null;
let globalOnMovement: ((tiles: number) => void) | null = null;
let globalOnSendMessage: ((message: string) => void) | null = null;
let globalCharacter: any = null;
let globalTechniques: CharacterTechnique[] = [];
let globalMessages: Message[] = [];
let globalIsLoading: boolean = false;
let globalWorldTime: { year: number; month: number; day: number; hour: number; minute: number } | null = null;

// Scene globals
let globalTargets: TrainingTarget[] = [];
let globalDamageNumbers: DamageNumber[] = [];
let globalPlayerRotation: number = 0;
let globalOnUseTechnique: ((techniqueId: string, rotation: number, playerX: number, playerY: number) => void) | null = null;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create player texture with clear front/back distinction
 * Front = face with eyes, Back = darker with hair/bun
 */
function createPlayerTexture(scene: Phaser.Scene): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  const size = PLAYER_SIZE;
  const cx = size + 12;
  const cy = size + 12;
  const textureSize = size * 2 + 24;

  // === ROBE/BODY (main circle) ===
  // Outer robe with gradient effect
  graphics.fillStyle(0x2d5a3d);  // Dark green outer
  graphics.fillCircle(cx, cy, size);

  // Inner robe (lighter)
  graphics.fillStyle(0x3d7a5d);
  graphics.fillCircle(cx, cy, size * 0.85);

  // === BACK INDICATOR (darker area on back side) ===
  // Semi-circle on the back (left side when facing right)
  graphics.fillStyle(0x1d3a2d);
  graphics.beginPath();
  graphics.arc(cx, cy, size * 0.7, Math.PI * 0.6, Math.PI * 1.4, false);
  graphics.closePath();
  graphics.fillPath();

  // === FRONT INDICATOR (face area) ===
  // Face oval (facing right = front)
  graphics.fillStyle(0xf5deb3);  // Skin tone
  graphics.fillEllipse(cx + size * 0.35, cy, size * 0.5, size * 0.6);

  // === FACE DETAILS ===
  // Eye
  graphics.fillStyle(0x000000);
  graphics.fillCircle(cx + size * 0.45, cy - size * 0.08, size * 0.08);

  // Eye highlight
  graphics.fillStyle(0xFFFFFF);
  graphics.fillCircle(cx + size * 0.48, cy - size * 0.1, size * 0.03);

  // Eyebrow
  graphics.lineStyle(2, 0x4a3728);
  graphics.beginPath();
  graphics.moveTo(cx + size * 0.35, cy - size * 0.2);
  graphics.lineTo(cx + size * 0.55, cy - size * 0.18);
  graphics.strokePath();

  // === HAIR (top and back) ===
  graphics.fillStyle(0x1a1a2e);
  graphics.beginPath();
  graphics.arc(cx, cy, size * 0.75, Math.PI * 1.6, Math.PI * 0.4, false);
  graphics.closePath();
  graphics.fillPath();

  // Hair bun (cultivator style)
  graphics.fillStyle(0x1a1a2e);
  graphics.fillCircle(cx - size * 0.1, cy - size * 0.65, size * 0.25);

  // === QI GLOW (subtle aura) ===
  graphics.lineStyle(2, 0x4ade80, 0.5);
  graphics.beginPath();
  graphics.arc(cx, cy, size + 2, 0, Math.PI * 2);
  graphics.strokePath();

  // === DIRECTION ARROW (subtle, shows attack direction) ===
  graphics.fillStyle(0x4ade80);
  graphics.beginPath();
  graphics.moveTo(cx + size + 6, cy);        // Tip
  graphics.lineTo(cx + size - 2, cy - 5);    // Top
  graphics.lineTo(cx + size - 2, cy + 5);    // Bottom
  graphics.closePath();
  graphics.fillPath();

  graphics.generateTexture('player', textureSize, textureSize);
  graphics.destroy();
}

/**
 * Create target (straw dummy) texture - more detailed cultivator training dummy
 */
function createTargetTexture(scene: Phaser.Scene): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  const width = 48;
  const height = 80;

  // === WOODEN POST BASE ===
  graphics.fillStyle(0x5c4033);
  graphics.fillRect(width / 2 - 5, height * 0.6, 10, height * 0.4);

  // Base platform
  graphics.fillStyle(0x4a3728);
  graphics.fillEllipse(width / 2, height * 0.95, 30, 8);

  // === STRAW BODY ===
  // Main body (straw bundle)
  graphics.fillStyle(0xdaa520);
  graphics.fillEllipse(width / 2, height * 0.45, 22, 28);

  // Straw texture lines
  graphics.lineStyle(1, 0xb8860b);
  for (let i = 0; i < 5; i++) {
    const y = height * 0.3 + i * 6;
    graphics.beginPath();
    graphics.moveTo(width / 2 - 18, y);
    graphics.lineTo(width / 2 + 18, y);
    graphics.strokePath();
  }

  // === HEAD ===
  graphics.fillStyle(0xdeb887);
  graphics.fillCircle(width / 2, height * 0.18, 12);

  // Face markings (target circles)
  graphics.lineStyle(2, 0x8b0000);
  graphics.beginPath();
  graphics.arc(width / 2, height * 0.18, 6, 0, Math.PI * 2);
  graphics.strokePath();

  graphics.lineStyle(1, 0x8b0000);
  graphics.beginPath();
  graphics.arc(width / 2, height * 0.18, 3, 0, Math.PI * 2);
  graphics.strokePath();

  // === ARMS (horizontal bar) ===
  graphics.fillStyle(0x5c4033);
  graphics.fillRect(width / 2 - 24, height * 0.4, 48, 6);

  // Arm end caps
  graphics.fillStyle(0x8b4513);
  graphics.fillCircle(width / 2 - 24, height * 0.43, 5);
  graphics.fillCircle(width / 2 + 24, height * 0.43, 5);

  // === VITAL POINT MARKERS ===
  // Head vital point
  graphics.fillStyle(0xff4444);
  graphics.fillCircle(width / 2, height * 0.18, 2);

  // Chest vital point
  graphics.fillStyle(0xff4444);
  graphics.fillCircle(width / 2, height * 0.4, 2);

  // === WORN/USED EFFECTS ===
  // Some straw pieces sticking out
  graphics.lineStyle(2, 0xdaa520);
  graphics.beginPath();
  graphics.moveTo(width / 2 - 10, height * 0.35);
  graphics.lineTo(width / 2 - 15, height * 0.28);
  graphics.strokePath();

  graphics.beginPath();
  graphics.moveTo(width / 2 + 8, height * 0.5);
  graphics.lineTo(width / 2 + 14, height * 0.55);
  graphics.strokePath();

  graphics.generateTexture('target', width, height);
  graphics.destroy();
}

/**
 * Create a training target
 */
function createTarget(scene: Phaser.Scene, x: number, y: number, id: string): TrainingTarget {
  const container = scene.add.container(x, y);
  container.setDepth(5);

  // Target sprite (texture is 48x80, anchor at bottom center)
  const sprite = scene.add.image(0, -40, 'target').setOrigin(0.5, 1);
  container.add(sprite);

  // HP bar background
  const hpBarBg = scene.add.graphics();
  hpBarBg.fillStyle(0x000000, 0.7);
  hpBarBg.fillRect(-25, -100, 50, 8);
  container.add(hpBarBg);

  // HP bar
  const hpBar = scene.add.graphics();
  container.add(hpBar);

  // Target label
  const label = scene.add.text(0, -115, '🎯 Соломенное чучело', {
    fontSize: '11px',
    color: '#fbbf24',
    fontFamily: 'Arial',
  }).setOrigin(0.5);
  container.add(label);

  const target: TrainingTarget = {
    id,
    x,
    y,
    hp: 1000,
    maxHp: 1000,
    sprite: container,
    hpBar,
    lastHitTime: 0,
  };

  updateTargetHpBar(target);
  
  // Make interactive
  sprite.setInteractive();
  sprite.on('pointerdown', () => {
    // Visual feedback
    scene.tweens.add({
      targets: container,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 50,
      yoyo: true,
    });
  });

  return target;
}

/**
 * Update target HP bar
 */
function updateTargetHpBar(target: TrainingTarget): void {
  if (!target.hpBar) return;

  target.hpBar.clear();
  
  const hpPercent = target.hp / target.maxHp;
  const barWidth = 48 * hpPercent;
  
  // Color based on HP
  let color = 0x22c55e; // Green
  if (hpPercent < 0.25) color = 0xef4444; // Red
  else if (hpPercent < 0.5) color = 0xf97316; // Orange
  else if (hpPercent < 0.75) color = 0xeab308; // Yellow

  target.hpBar.fillStyle(color);
  target.hpBar.fillRect(-24, -99, barWidth, 6);
}

/**
 * Show damage number
 */
function showDamageNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  damage: number,
  type: string = 'normal'
): void {
  const color = DAMAGE_COLORS[type] || DAMAGE_COLORS.normal;
  const isCrit = type === 'critical';
  const isHeal = type === 'healing';
  
  const text = scene.add.text(x, y, damage.toString(), {
    fontSize: isCrit ? '24px' : '18px',
    fontFamily: 'Arial',
    color: color,
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5).setDepth(200);

  const damageNum: DamageNumber = {
    id: `dmg_${Date.now()}_${Math.random()}`,
    x,
    y,
    damage,
    type,
    text,
    createdAt: Date.now(),
  };

  globalDamageNumbers.push(damageNum);

  // Animate: float up and fade
  scene.tweens.add({
    targets: text,
    y: y - 50,
    alpha: 0,
    scale: isCrit ? 1.8 : (isHeal ? 1.0 : 1.3),
    duration: 1200,
    ease: 'Power2',
    onComplete: () => {
      text.destroy();
      globalDamageNumbers = globalDamageNumbers.filter(d => d.id !== damageNum.id);
    },
  });
}

/**
 * Apply damage to target
 */
function damageTarget(
  scene: Phaser.Scene,
  target: TrainingTarget,
  damage: number,
  type: string = 'normal'
): void {
  target.hp = Math.max(0, target.hp - damage);
  target.lastHitTime = Date.now();

  // Update HP bar
  updateTargetHpBar(target);

  // Show damage number (positioned above the target)
  showDamageNumber(scene, target.x, target.y - 90, damage, type);

  // Flash effect
  if (target.sprite) {
    const sprite = target.sprite.getAt(0) as Phaser.GameObjects.Image;
    if (sprite && sprite.setTint) {
      sprite.setTint(0xff4444);
      scene.tweens.add({
        targets: sprite,
        alpha: 0.7,
        duration: 50,
        yoyo: true,
        onComplete: () => {
          sprite.clearTint();
          sprite.setAlpha(1);
        },
      });
    }
  }

  // Reset if destroyed
  if (target.hp <= 0) {
    scene.time.delayedCall(500, () => {
      target.hp = target.maxHp;
      updateTargetHpBar(target);
      showDamageNumber(scene, target.x, target.y - 90, 1000, 'healing');
      
      // Respawn message
      if (target.sprite) {
        const label = target.sprite.getAt(3) as Phaser.GameObjects.Text;
        if (label) {
          const originalText = '🎯 Соломенное чучело';
          label.setText('✅ Восстановлено!');
          label.setColor('#22c55e');
          scene.time.delayedCall(1500, () => {
            label.setText(originalText);
            label.setColor('#fbbf24');
          });
        }
      }
    });
  }
}

/**
 * Check if target is in attack cone
 */
function isInAttackCone(
  playerX: number,
  playerY: number,
  playerRotation: number,
  targetX: number,
  targetY: number,
  coneAngle: number = 60,
  range: number = 64
): boolean {
  const dx = targetX - playerX;
  const dy = targetY - playerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > range) return false;

  // Angle to target
  const angleToTarget = Math.atan2(dy, dx) * 180 / Math.PI;
  const normalizedTarget = ((angleToTarget % 360) + 360) % 360;
  
  // Player rotation (convert to degrees, where 0 = right)
  const normalizedRotation = ((playerRotation % 360) + 360) % 360;

  // Difference
  let angleDiff = Math.abs(normalizedTarget - normalizedRotation);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;

  return angleDiff <= coneAngle / 2;
}

/**
 * Get element color for visual effects
 */
function getElementColor(element: string): number {
  const colors: Record<string, number> = {
    fire: 0xff6622,
    water: 0x4488ff,
    earth: 0x886622,
    air: 0xaaccff,
    lightning: 0xffff00,
    void: 0x9944ff,
    neutral: 0x4ade80,
  };
  return colors[element] || colors.neutral;
}

/**
 * Use technique in direction
 */
function useTechniqueInDirection(
  scene: Phaser.Scene,
  techniqueId: string,
  techniqueData: { damage: number; range: number; type: string; element: string },
  playerX: number,
  playerY: number,
  playerRotation: number
): void {
  const range = (techniqueData.range || 2) * METERS_TO_PIXELS;
  const damage = techniqueData.damage || 10;
  const element = techniqueData.element || 'neutral';
  const techniqueType = techniqueData.type || 'combat';

  const rad = playerRotation * Math.PI / 180;
  const endX = playerX + Math.cos(rad) * range;
  const endY = playerY + Math.sin(rad) * range;
  const elementColor = getElementColor(element);

  // === VISUAL EFFECTS BASED ON TECHNIQUE TYPE ===
  
  if (techniqueType === 'ranged_beam' || techniqueType === 'ranged_projectile') {
    // Beam effect
    const beam = scene.add.graphics();
    beam.lineStyle(4, elementColor, 0.9);
    beam.beginPath();
    beam.moveTo(playerX, playerY);
    beam.lineTo(endX, endY);
    beam.strokePath();
    beam.setDepth(15);

    // Glow effect
    beam.lineStyle(8, elementColor, 0.3);
    beam.beginPath();
    beam.moveTo(playerX, playerY);
    beam.lineTo(endX, endY);
    beam.strokePath();

    // Impact point
    const impact = scene.add.circle(endX, endY, 10, elementColor, 0.7);
    impact.setDepth(16);

    scene.tweens.add({
      targets: [beam, impact],
      alpha: 0,
      scale: 1.5,
      duration: 400,
      onComplete: () => {
        beam.destroy();
        impact.destroy();
      },
    });
  } else {
    // Melee/Combat - cone effect
    const cone = scene.add.graphics();
    const coneAngle = 60 * Math.PI / 180; // 60 degree cone
    const coneRadius = range;

    cone.fillStyle(elementColor, 0.3);
    cone.beginPath();
    cone.moveTo(playerX, playerY);
    cone.arc(playerX, playerY, coneRadius, rad - coneAngle / 2, rad + coneAngle / 2, false);
    cone.closePath();
    cone.fillPath();
    cone.setDepth(15);

    // Edge line
    cone.lineStyle(2, elementColor, 0.8);
    cone.beginPath();
    cone.moveTo(playerX, playerY);
    cone.lineTo(playerX + Math.cos(rad - coneAngle / 2) * coneRadius, playerY + Math.sin(rad - coneAngle / 2) * coneRadius);
    cone.moveTo(playerX, playerY);
    cone.lineTo(playerX + Math.cos(rad + coneAngle / 2) * coneRadius, playerY + Math.sin(rad + coneAngle / 2) * coneRadius);
    cone.strokePath();

    scene.tweens.add({
      targets: cone,
      alpha: 0,
      duration: 300,
      onComplete: () => cone.destroy(),
    });
  }

  // Check each target
  for (const target of globalTargets) {
    if (isInAttackCone(playerX, playerY, playerRotation, target.x, target.y, 60, range)) {
      // Hit!
      const isCrit = Math.random() < 0.15; // 15% crit chance
      const finalDamage = isCrit ? Math.floor(damage * 1.5) : damage;
      
      // Hit effect on target position
      const hitEffect = scene.add.circle(target.x, target.y - 40, 15, elementColor, 0.8);
      hitEffect.setDepth(200);
      scene.tweens.add({
        targets: hitEffect,
        scale: 2,
        alpha: 0,
        duration: 300,
        onComplete: () => hitEffect.destroy(),
      });
      
      damageTarget(scene, target, finalDamage, isCrit ? 'critical' : element);
    }
  }
}

// ============================================
// SCENE CONFIG
// ============================================

const GameSceneConfig = {
  key: 'GameScene',

  preload(this: Phaser.Scene) {
    const scene = this as Phaser.Scene;
    createPlayerTexture(scene);
    createTargetTexture(scene);

    // Ground tile texture
    const tileGraphics = scene.make.graphics({ x: 0, y: 0 });
    tileGraphics.fillStyle(0x1a2a1a);
    tileGraphics.fillRect(0, 0, 64, 64);
    tileGraphics.lineStyle(1, 0x2a3a2a);
    tileGraphics.strokeRect(0, 0, 64, 64);
    tileGraphics.generateTexture('ground', 64, 64);
    tileGraphics.destroy();
  },

  create(this: Phaser.Scene) {
    const scene = this as Phaser.Scene;
    let isChatFocused = false;
    let chatInputText = '';
    globalPlayerRotation = 0;

    // Create world bounds
    scene.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Create tiled ground
    for (let x = 0; x < WORLD_WIDTH; x += 64) {
      for (let y = 0; y < WORLD_HEIGHT; y += 64) {
        scene.add.image(x + 32, y + 32, 'ground').setOrigin(0.5);
      }
    }

    // World border visual
    const border = scene.add.graphics();
    border.lineStyle(4, 0x4ade80, 0.8);
    border.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Create player
    const player = scene.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 100, 'player');
    player.setCollideWorldBounds(true);
    player.setDepth(10);

    // Player label
    const playerLabel = scene.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 140, 'Игрок', {
      fontSize: '14px',
      color: '#4ade80',
    }).setOrigin(0.5).setDepth(11);

    // Direction indicator (line showing facing direction)
    const directionLine = scene.add.graphics();
    directionLine.setDepth(12);

    // Create training targets
    globalTargets = [];
    TARGET_POSITIONS.forEach((pos, index) => {
      const target = createTarget(scene, pos.x, pos.y, `target_${index}`);
      globalTargets.push(target);
    });

    // Camera setup
    scene.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    scene.cameras.main.startFollow(player, true, 0.1, 0.1);
    scene.cameras.main.setZoom(1);

    // Input keys
    const cursors = scene.input.keyboard?.createCursorKeys();
    const wasd = scene.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    // Store references
    scene.data.set('player', player);
    scene.data.set('playerLabel', playerLabel);
    scene.data.set('cursors', cursors);
    scene.data.set('wasd', wasd);
    scene.data.set('isChatFocused', isChatFocused);
    scene.data.set('chatInputText', chatInputText);
    scene.data.set('lastPosition', { x: player.x, y: player.y });
    scene.data.set('accumulatedTiles', 0);
    scene.data.set('lastSyncTime', Date.now());
    scene.data.set('directionLine', directionLine);

    // Mouse movement for rotation
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isChatFocused) return;
      
      // Get world position of mouse
      const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      
      // Calculate angle from player to mouse
      const dx = worldPoint.x - player.x;
      const dy = worldPoint.y - player.y;
      globalPlayerRotation = Math.atan2(dy, dx) * 180 / Math.PI;
      
      // Update player sprite rotation
      player.setRotation(globalPlayerRotation * Math.PI / 180);
      
      // Update direction line
      updateDirectionLine(scene, player.x, player.y, globalPlayerRotation);
    });

    // Update direction line function
    function updateDirectionLine(scene: Phaser.Scene, x: number, y: number, rotation: number) {
      const line = scene.data.get('directionLine') as Phaser.GameObjects.Graphics;
      if (!line) return;
      
      line.clear();
      
      const rad = rotation * Math.PI / 180;
      const lineLength = 40;
      const endX = x + Math.cos(rad) * lineLength;
      const endY = y + Math.sin(rad) * lineLength;
      
      line.lineStyle(2, 0x4ade80, 0.5);
      line.beginPath();
      line.moveTo(x, y);
      line.lineTo(endX, endY);
      line.strokePath();
    }

    // === UI CONTAINER (fixed on screen) ===
    const uiContainer = scene.add.container(0, 0);
    uiContainer.setScrollFactor(0);
    uiContainer.setDepth(100);

    // Helper function to get current screen size
    const getScreenSize = () => ({
      width: scene.cameras.main.width,
      height: scene.cameras.main.height,
    });

    // Top bar
    const topBar = scene.add.rectangle(0, 25, 0, 50, 0x000000, 0.7);
    uiContainer.add(topBar);

    const title = scene.add.text(0, 15, '🎯 Тренировочный полигон', {
      fontSize: '18px',
      color: '#4ade80',
    }).setOrigin(0.5);
    uiContainer.add(title);

    const coords = scene.add.text(0, 35, 'X: 1000  Y: 1000  🎯: 0°', {
      fontSize: '12px',
      color: '#9ca3af',
    }).setOrigin(0.5);
    uiContainer.add(coords);
    scene.data.set('coordsText', coords);

    // World time display (top-left)
    const worldTimeText = scene.add.text(10, 60, '', {
      fontSize: '14px',
      color: '#fbbf24',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
    });
    uiContainer.add(worldTimeText);
    scene.data.set('worldTimeText', worldTimeText);

    // === HP BAR (under time) ===
    const hpBarContainer = scene.add.container(10, 85);
    hpBarContainer.setScrollFactor(0);
    uiContainer.add(hpBarContainer);

    const hpBarBg = scene.add.graphics();
    hpBarBg.fillStyle(0x000000, 0.7);
    hpBarBg.fillRect(0, 0, 120, 16);
    hpBarContainer.add(hpBarBg);

    const hpBarFill = scene.add.graphics();
    hpBarContainer.add(hpBarFill);
    scene.data.set('hpBarFill', hpBarFill);

    const hpLabel = scene.add.text(5, 2, '❤️ HP: 100%', {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'Arial',
    });
    hpBarContainer.add(hpLabel);
    scene.data.set('hpLabel', hpLabel);

    // === QI BAR (under HP) ===
    const qiBarContainer = scene.add.container(10, 105);
    qiBarContainer.setScrollFactor(0);
    uiContainer.add(qiBarContainer);

    const qiBarBg = scene.add.graphics();
    qiBarBg.fillStyle(0x000000, 0.7);
    qiBarBg.fillRect(0, 0, 120, 16);
    qiBarContainer.add(qiBarBg);

    const qiBarFill = scene.add.graphics();
    qiBarContainer.add(qiBarFill);
    scene.data.set('qiBarFill', qiBarFill);

    const qiLabel = scene.add.text(5, 2, '✨ Ци: 100/100', {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'Arial',
    });
    qiBarContainer.add(qiLabel);
    scene.data.set('qiLabel', qiLabel);

    // Function to update HP/Qi bars
    const updateStatusBars = () => {
      const char = globalCharacter;
      if (!char) return;

      // HP
      const hpPercent = Math.max(0, Math.min(100, char.health || 100));
      const hpBar = scene.data.get('hpBarFill') as Phaser.GameObjects.Graphics;
      const hpLabelText = scene.data.get('hpLabel') as Phaser.GameObjects.Text;
      
      if (hpBar) {
        hpBar.clear();
        const hpWidth = 118 * (hpPercent / 100);
        let hpColor = 0x22c55e; // Green
        if (hpPercent < 25) hpColor = 0xef4444; // Red
        else if (hpPercent < 50) hpColor = 0xf97316; // Orange
        else if (hpPercent < 75) hpColor = 0xeab308; // Yellow
        
        hpBar.fillStyle(hpColor);
        hpBar.fillRect(1, 1, hpWidth, 14);
      }
      if (hpLabelText) {
        hpLabelText.setText(`❤️ HP: ${hpPercent}%`);
      }

      // Qi
      const currentQi = char.currentQi || 0;
      const maxQi = char.coreCapacity || 100;
      const qiPercent = Math.max(0, Math.min(100, (currentQi / maxQi) * 100));
      const qiBar = scene.data.get('qiBarFill') as Phaser.GameObjects.Graphics;
      const qiLabelText = scene.data.get('qiLabel') as Phaser.GameObjects.Text;
      
      if (qiBar) {
        qiBar.clear();
        const qiWidth = 118 * (qiPercent / 100);
        qiBar.fillStyle(0x4ade80); // Green for Qi
        qiBar.fillRect(1, 1, qiWidth, 14);
      }
      if (qiLabelText) {
        qiLabelText.setText(`✨ Ци: ${Math.round(currentQi)}/${maxQi}`);
      }
    };
    scene.data.set('updateStatusBars', updateStatusBars);

    // === TARGETS INFO (top-right) ===
    const targetsInfo = scene.add.text(0, 60, '', {
      fontSize: '11px',
      color: '#e2e8f0',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
      align: 'right',
    }).setOrigin(1, 0);
    uiContainer.add(targetsInfo);
    scene.data.set('targetsInfo', targetsInfo);

    // === CHAT PANEL (bottom-left) ===
    const chatWidth = 280;
    const chatHeight = 120;
    
    const chatBg = scene.add.rectangle(0, 0, chatWidth, chatHeight, 0x000000, 0.8);
    chatBg.setStrokeStyle(1, 0x4ade80, 0.5);
    uiContainer.add(chatBg);

    const chatTitle = scene.add.text(0, 0, '💬 Чат [Enter]', {
      fontSize: '12px',
      color: '#fbbf24',
    });
    uiContainer.add(chatTitle);

    const chatMessagesText = scene.add.text(0, 0, '', {
      fontSize: '11px',
      color: '#e2e8f0',
      wordWrap: { width: chatWidth - 20 },
      lineSpacing: 3,
    });
    uiContainer.add(chatMessagesText);
    scene.data.set('chatMessagesText', chatMessagesText);

    const inputBg = scene.add.rectangle(0, 0, chatWidth - 10, 24, 0x1e293b, 1);
    inputBg.setStrokeStyle(1, 0x4ade80, 0.3);
    uiContainer.add(inputBg);

    const chatInputDisplay = scene.add.text(0, 0, '|', {
      fontSize: '12px',
      color: '#ffffff',
    });
    uiContainer.add(chatInputDisplay);
    scene.data.set('chatInputDisplay', chatInputDisplay);

    // === COMBAT SLOTS (bottom-center) ===
    const slotSize = 40;
    const slotSpacing = 5;
    const totalSlots = 6;

    const combatSlotsContainer = scene.add.container(0, 0);
    uiContainer.add(combatSlotsContainer);

    const slotBackgrounds: Phaser.GameObjects.Rectangle[] = [];

    const updateCombatSlots = () => {
      combatSlotsContainer.removeAll(true);
      slotBackgrounds.length = 0;

      const { width, height } = getScreenSize();
      const level = globalCharacter?.cultivationLevel || 1;
      const availableSlots = getCombatSlotsCount(level);

      const equippedBySlot: Map<number, CharacterTechnique> = new Map();
      for (const t of globalTechniques) {
        if ((t.technique.type === 'combat' || t.technique.type === 'movement') && t.quickSlot !== null && t.quickSlot > 0) {
          equippedBySlot.set(t.quickSlot, t);
        }
      }

      const slotsY = height - 35;
      const startX = width / 2 - (totalSlots * (slotSize + slotSpacing)) / 2;

      for (let i = 0; i < totalSlots; i++) {
        const x = startX + i * (slotSize + slotSpacing);
        const isAvailable = i < availableSlots;
        const equipped = equippedBySlot.get(i + 1);
        const isSlot1 = i === 0;
        const hasContent = equipped || (isSlot1 && isAvailable); // Slot 1 always has basic attack
        const slotKey = String(i + 1);

        const slotBg = scene.add.rectangle(x, slotsY, slotSize, slotSize,
          isAvailable ? (hasContent ? 0x22c55e : 0x1e293b) : 0x0f172a, 1
        );
        slotBg.setStrokeStyle(2, isAvailable ? (hasContent ? 0x22c55e : 0x4ade80) : 0x334155);
        combatSlotsContainer.add(slotBg);
        slotBackgrounds.push(slotBg);

        const keyLabel = scene.add.text(x, slotsY - slotSize / 2 - 8, slotKey, {
          fontSize: '10px',
          color: isAvailable ? '#9ca3af' : '#475569',
        }).setOrigin(0.5);
        combatSlotsContainer.add(keyLabel);

        // Icon: equipped technique, or basic attack for slot 1
        let icon = '';
        if (equipped) {
          icon = equipped.technique.element === 'fire' ? '🔥' : 
                 equipped.technique.element === 'water' ? '💧' :
                 equipped.technique.element === 'earth' ? '🪨' :
                 equipped.technique.element === 'air' ? '💨' :
                 equipped.technique.element === 'lightning' ? '⚡' : '⚔️';
        } else if (isSlot1 && isAvailable) {
          icon = '👊'; // Basic attack
        }
        
        const slotContent = scene.add.text(x, slotsY, icon, {
          fontSize: '18px',
        }).setOrigin(0.5);
        combatSlotsContainer.add(slotContent);

        // Slot tooltip
        let tooltip = '';
        if (equipped) {
          tooltip = equipped.technique.name;
        } else if (isSlot1 && isAvailable) {
          tooltip = 'Базовый удар';
        }

        if (isAvailable && hasContent) {
          slotBg.setInteractive();
          slotBg.on('pointerdown', () => {
            if (equipped) {
              useTechniqueInDirection(
                scene,
                equipped.techniqueId,
                {
                  damage: equipped.technique.effects?.damage || 15,
                  range: equipped.technique.effects?.distance || (equipped.technique.effects?.range?.max || 10),
                  type: equipped.technique.effects?.combatType || equipped.technique.type,
                  element: equipped.technique.element,
                },
                player.x,
                player.y,
                globalPlayerRotation
              );
            } else if (isSlot1) {
              // Basic attack
              useTechniqueInDirection(
                scene,
                'basic_training_strike',
                {
                  damage: 25,
                  range: 5,
                  type: 'melee_strike',
                  element: 'neutral',
                },
                player.x,
                player.y,
                globalPlayerRotation
              );
            }
            
            scene.tweens.add({
              targets: slotBg,
              scaleX: 1.2,
              scaleY: 1.2,
              duration: 100,
              yoyo: true,
            });
          });
        }
      }
    };

    scene.data.set('updateCombatSlots', updateCombatSlots);
    updateCombatSlots();

    // === MINIMAP (top-right, below targets) ===
    const minimapSize = 100;
    const minimapBg = scene.add.rectangle(0, 0, minimapSize, minimapSize, 0x000000, 0.7);
    minimapBg.setStrokeStyle(2, 0x4ade80);
    uiContainer.add(minimapBg);

    const minimapPlayer = scene.add.circle(0, 0, 3, 0x4ade80);
    uiContainer.add(minimapPlayer);
    scene.data.set('minimapPlayer', minimapPlayer);
    scene.data.set('minimapSize', minimapSize);

    // Target dots on minimap
    globalTargets.forEach(target => {
      const dot = scene.add.circle(0, 0, 2, 0xfbbf24);
      uiContainer.add(dot);
      target.sprite?.setData('minimapDot', dot);
    });

    // === INSTRUCTIONS ===
    const instructions = scene.add.text(0, 0,
      'WASD • Мышь для прицеливания • 1-6 для атак', {
      fontSize: '12px',
      color: '#9ca3af',
    }).setOrigin(0.5);
    uiContainer.add(instructions);

    // === UPDATE UI POSITIONS FUNCTION ===
    const updateUIPositions = () => {
      const { width, height } = getScreenSize();

      topBar.setPosition(width / 2, 25);
      topBar.setSize(width, 50);
      title.setPosition(width / 2, 15);
      coords.setPosition(width / 2, 35);

      const chatX = chatWidth / 2 + 10;
      const chatY = height - chatHeight / 2 - 10;
      chatBg.setPosition(chatX, chatY);
      chatTitle.setPosition(chatX - chatWidth / 2 + 5, chatY - chatHeight / 2 + 5);
      chatMessagesText.setPosition(chatX - chatWidth / 2 + 10, chatY - chatHeight / 2 + 25);
      inputBg.setPosition(chatX, chatY + chatHeight / 2 - 15);
      chatInputDisplay.setPosition(chatX - chatWidth / 2 + 10, chatY + chatHeight / 2 - 22);

      const minimapX = width - minimapSize / 2 - 10;
      const minimapY = 120 + minimapSize / 2;
      minimapBg.setPosition(minimapX, minimapY);
      minimapPlayer.setPosition(minimapX, minimapY);
      scene.data.set('minimapX', minimapX);
      scene.data.set('minimapY', minimapY);

      // Targets info position
      targetsInfo.setPosition(width - 10, 60);

      instructions.setPosition(width / 2, height - 15);
      updateCombatSlots();
    };

    scene.data.set('updateUIPositions', updateUIPositions);
    updateUIPositions();

    // === AMBIENT PARTICLES ===
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(100, WORLD_WIDTH - 100);
      const y = Phaser.Math.Between(100, WORLD_HEIGHT - 100);
      const particle = scene.add.circle(x, y, Phaser.Math.Between(2, 4), 0x4ade80, 0.3);
      particle.setDepth(1);
      scene.tweens.add({
        targets: particle,
        y: y - Phaser.Math.Between(10, 30),
        alpha: { from: 0.3, to: 0.1 },
        duration: Phaser.Math.Between(1500, 3000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 500),
      });
    }

    // === KEYBOARD HANDLING ===

    scene.input.keyboard?.on('keydown-ENTER', () => {
      isChatFocused = !isChatFocused;
      scene.data.set('isChatFocused', isChatFocused);

      if (isChatFocused) {
        chatBg.setFillStyle(0x000000, 0.9);
        inputBg.setStrokeStyle(2, 0xfbbf24);
        chatTitle.setText('💬 Чат [Enter - отправить]');
      } else {
        const text = scene.data.get('chatInputText') as string;
        if (text?.trim() && globalOnSendMessage) {
          globalOnSendMessage(text.trim());
        }
        scene.data.set('chatInputText', '');
        chatBg.setFillStyle(0x000000, 0.8);
        inputBg.setStrokeStyle(1, 0x4ade80, 0.3);
        chatTitle.setText('💬 Чат [Enter]');
        chatInputDisplay.setText('|');
      }
    });

    scene.input.keyboard?.on('keydown-ESC', () => {
      if (isChatFocused) {
        isChatFocused = false;
        scene.data.set('isChatFocused', false);
        scene.data.set('chatInputText', '');
        chatBg.setFillStyle(0x000000, 0.8);
        inputBg.setStrokeStyle(1, 0x4ade80, 0.3);
        chatTitle.setText('💬 Чат [Enter]');
        chatInputDisplay.setText('|');
      }
    });

    scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!isChatFocused) return;
      let currentText = (scene.data.get('chatInputText') as string) || '';
      if (event.key === 'Backspace') {
        currentText = currentText.slice(0, -1);
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && currentText.length < 100) {
        currentText += event.key;
      }
      scene.data.set('chatInputText', currentText);
      chatInputDisplay.setText(currentText + '|');
    });

    // Combat slot keys - use direct key names
    const numberKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'];
    
    numberKeys.forEach((keyName, index) => {
      scene.input.keyboard?.on(`keydown-${keyName}`, () => {
        if (isChatFocused) return;

        const slotIndex = index + 1;
        const level = globalCharacter?.cultivationLevel || 1;
        const availableSlots = getCombatSlotsCount(level);

        if (slotIndex <= availableSlots) {
          const equipped = globalTechniques.find(t => 
            (t.technique.type === 'combat' || t.technique.type === 'movement') && 
            t.quickSlot === slotIndex
          );

          if (equipped) {
            // Use equipped technique
            useTechniqueInDirection(
              scene,
              equipped.techniqueId,
              {
                damage: equipped.technique.effects?.damage || 15,
                range: equipped.technique.effects?.distance || (equipped.technique.effects?.range?.max || 10),
                type: equipped.technique.effects?.combatType || equipped.technique.type,
                element: equipped.technique.element,
              },
              player.x,
              player.y,
              globalPlayerRotation
            );
          } else if (slotIndex === 1) {
            // Slot 1: Default basic attack for training ground
            useTechniqueInDirection(
              scene,
              'basic_training_strike',
              {
                damage: 25,
                range: 5, // 5 meters
                type: 'melee_strike',
                element: 'neutral',
              },
              player.x,
              player.y,
              globalPlayerRotation
            );
          }

          // Visual feedback
          const slotBg = slotBackgrounds[index];
          if (slotBg) {
            scene.tweens.add({
              targets: slotBg,
              scaleX: 1.2,
              scaleY: 1.2,
              duration: 100,
              yoyo: true,
            });
          }
        }
      });
    });

    // Update loop for chat and targets
    scene.time.addEvent({
      delay: 500,
      callback: () => {
        // World time
        const worldTimeTextEl = scene.data.get('worldTimeText') as Phaser.GameObjects.Text;
        if (worldTimeTextEl && globalWorldTime) {
          const timeStr = `📅 ${globalWorldTime.day}.${globalWorldTime.month}.${globalWorldTime.year} ⏰ ${globalWorldTime.hour.toString().padStart(2, '0')}:${globalWorldTime.minute.toString().padStart(2, '0')}`;
          worldTimeTextEl.setText(timeStr);
        }

        // Update HP/Qi bars
        const updateBars = scene.data.get('updateStatusBars') as (() => void) | undefined;
        if (updateBars) updateBars();
        
        // Chat
        if (chatMessagesText) {
          if (globalMessages.length > 0) {
            const recentMessages = globalMessages.slice(-4);
            const text = recentMessages.map(m => {
              const prefix = m.sender === 'player' ? '👤' : '📖';
              const content = m.content.length > 40 ? m.content.slice(0, 40) + '...' : m.content;
              return `${prefix} ${content}`;
            }).join('\n');
            chatMessagesText.setText(text);
          } else {
            chatMessagesText.setText('Нет сообщений');
          }
        }

        // Targets info
        const targetsInfoEl = scene.data.get('targetsInfo') as Phaser.GameObjects.Text;
        if (targetsInfoEl) {
          const infoLines = globalTargets.map((t, i) => `Чучело ${i + 1}: ${t.hp}/${t.maxHp}`);
          targetsInfoEl.setText(infoLines.join('\n'));
        }
      },
      loop: true,
    });

    scene.time.addEvent({
      delay: 1000,
      callback: updateCombatSlots,
      loop: true,
    });
  },

  update(this: Phaser.Scene) {
    const scene = this as Phaser.Scene;

    const player = scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
    const playerLabel = scene.data.get('playerLabel') as Phaser.GameObjects.Text;
    const cursors = scene.data.get('cursors') as Phaser.Types.Input.Keyboard.CursorKeys;
    const wasd = scene.data.get('wasd') as Record<string, Phaser.Input.Keyboard.Key>;
    const coordsText = scene.data.get('coordsText') as Phaser.GameObjects.Text;
    const minimapPlayer = scene.data.get('minimapPlayer') as Phaser.GameObjects.Arc;
    const minimapX = scene.data.get('minimapX') as number;
    const minimapY = scene.data.get('minimapY') as number;
    const minimapSize = scene.data.get('minimapSize') as number;
    const lastPosition = scene.data.get('lastPosition') as { x: number; y: number };
    const accumulatedTiles = scene.data.get('accumulatedTiles') as number;
    const lastSyncTime = scene.data.get('lastSyncTime') as number;
    const isChatFocused = scene.data.get('isChatFocused') as boolean;

    if (!player || !cursors || !wasd) return;

    if (isChatFocused) {
      player.setVelocity(0, 0);
      return;
    }

    // Movement
    let velocityX = 0;
    let velocityY = 0;

    if (cursors.left.isDown || wasd.left.isDown) velocityX = -PLAYER_SPEED;
    else if (cursors.right.isDown || wasd.right.isDown) velocityX = PLAYER_SPEED;

    if (cursors.up.isDown || wasd.up.isDown) velocityY = -PLAYER_SPEED;
    else if (cursors.down.isDown || wasd.down.isDown) velocityY = PLAYER_SPEED;

    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }

    player.setVelocity(velocityX, velocityY);

    // Update player label position
    playerLabel.setPosition(player.x, player.y + 40);

    // Update coordinates display with rotation
    const rotText = `🎯: ${Math.round(((globalPlayerRotation % 360) + 360) % 360)}°`;
    coordsText.setText(`X: ${Math.round(player.x)}  Y: ${Math.round(player.y)}  ${rotText}`);

    // Update minimap
    const mapRatio = minimapSize / WORLD_WIDTH;
    const miniX = minimapX - minimapSize / 2 + player.x * mapRatio;
    const miniY = minimapY - minimapSize / 2 + player.y * mapRatio;
    minimapPlayer.setPosition(miniX, miniY);

    // Update target dots on minimap
    globalTargets.forEach(target => {
      const dot = target.sprite?.getData('minimapDot') as Phaser.GameObjects.Arc;
      if (dot) {
        const targetMiniX = minimapX - minimapSize / 2 + target.x * mapRatio;
        const targetMiniY = minimapY - minimapSize / 2 + target.y * mapRatio;
        dot.setPosition(targetMiniX, targetMiniY);
      }
    });

    // Time tracking
    const dx = player.x - lastPosition.x;
    const dy = player.y - lastPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    scene.data.set('lastPosition', { x: player.x, y: player.y });

    const tilesThisFrame = distance / TILE_SIZE;
    const newAccumulatedTiles = accumulatedTiles + tilesThisFrame;
    scene.data.set('accumulatedTiles', newAccumulatedTiles);

    const now = Date.now();
    const timeSinceSync = now - lastSyncTime;

    if (newAccumulatedTiles >= MIN_TILES_FOR_SYNC && timeSinceSync >= TIME_SYNC_INTERVAL) {
      const tilesToReport = Math.floor(newAccumulatedTiles);
      scene.data.set('accumulatedTiles', newAccumulatedTiles - tilesToReport);
      scene.data.set('lastSyncTime', now);

      if (globalOnMovement && globalSessionId) {
        globalOnMovement(tilesToReport);
      }
    }
  }
};

// ============================================
// REACT COMPONENT
// ============================================

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const sessionId = useGameSessionId();
  const character = useGameCharacter();
  const techniques = useGameTechniques();
  const messages = useGameMessages();
  const isLoading = useGameLoading();
  const worldTime = useGameTime();
  const { loadState, sendMessage } = useGameActions();

  useEffect(() => { globalSessionId = sessionId; }, [sessionId]);
  useEffect(() => { globalCharacter = character; }, [character]);
  useEffect(() => { globalTechniques = techniques; }, [techniques]);
  useEffect(() => { globalMessages = messages; }, [messages]);
  useEffect(() => { globalIsLoading = isLoading; }, [isLoading]);
  useEffect(() => { globalWorldTime = worldTime; }, [worldTime]);

  const handleMovement = useCallback(async (tilesMoved: number) => {
    if (!sessionId) return;
    try {
      const response = await fetch('/api/game/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, tilesMoved }),
      });
      const data = await response.json();
      if (data.success && data.timeAdvanced) await loadState();
    } catch (err) {
      console.error('Movement sync error:', err);
    }
  }, [sessionId, loadState]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;
    await sendMessage(message);
  }, [sendMessage]);

  useEffect(() => {
    globalOnMovement = handleMovement;
    return () => { globalOnMovement = null; };
  }, [handleMovement]);

  useEffect(() => {
    globalOnSendMessage = handleSendMessage;
    return () => { globalOnSendMessage = null; };
  }, [handleSendMessage]);

  useEffect(() => {
    if (!containerRef.current) return;

    const initGame = async () => {
      try {
        const PhaserModule = await import('phaser');
        const Phaser = PhaserModule.default;

        const container = containerRef.current!;
        const width = container.clientWidth || BASE_WIDTH;
        const height = container.clientHeight || BASE_HEIGHT;

        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          width,
          height,
          parent: container,
          backgroundColor: '#0a1a0a',
          physics: {
            default: 'arcade',
            arcade: { gravity: { x: 0, y: 0 }, debug: false },
          },
          scene: [GameSceneConfig],
          scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width,
            height,
          },
        };

        gameRef.current = new Phaser.Game(config);
        
        const handleResize = () => {
          if (!gameRef.current || !container) return;
          const newWidth = container.clientWidth;
          const newHeight = container.clientHeight;
          gameRef.current.scale.resize(newWidth, newHeight);
          
          const scene = gameRef.current.scene.getScene('GameScene') as Phaser.Scene;
          if (scene?.data) {
            const updateUI = scene.data.get('updateUIPositions') as (() => void) | undefined;
            if (updateUI) updateUI();
          }
        };
        
        window.addEventListener('resize', handleResize);
        setTimeout(handleResize, 100);
        setIsLoaded(true);
      } catch (err) {
        console.error('Phaser init error:', err);
        setError('Ошибка загрузки Phaser');
      }
    };

    initGame();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-0 flex-1">
      <div
        ref={containerRef}
        className="w-full h-full bg-slate-900"
        style={{ minHeight: '100%' }}
      />

      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Загрузка полигона...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
