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
import { useGameSessionId, useGameActions, useGameCharacter, useGameTechniques, useGameMessages, useGameTime } from '@/stores/game.store';
import type { Message, CharacterTechnique, Character } from '@/types/game';
import { getCombatSlotsCount } from '@/types/game';
import { calculateTotalConductivity } from '@/lib/game/conductivity-system';

// Game dimensions
const BASE_WIDTH = 1200;
const BASE_HEIGHT = 700;
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;

// Player settings
const PLAYER_SIZE = 24;
const PLAYER_SPEED = 200;
const METERS_TO_PIXELS = 32; // 1 meter = 32 pixels
const PLAYER_HITBOX_RADIUS = 24; // Player hitbox radius in pixels

// Target hitbox settings
const TARGET_HITBOX_RADIUS = 22; // Target hitbox radius in pixels (approx half of body width)

// Time tracking
const TILE_SIZE = 64;
const TIME_SYNC_INTERVAL = 3000;
const MIN_TILES_FOR_SYNC = 1;

// Target positions (6 training dummies) - in pixels from world center
// World center is at WORLD_WIDTH/2, WORLD_HEIGHT/2
// Positions are set relative to center for metric system compatibility
const TARGET_POSITIONS_METERS = [
  { x: -15, y: -10 },  // 15m left, 10m up from center
  { x: -8, y: -10 },
  { x: 0, y: -10 },
  { x: -15, y: 5 },    // 15m left, 5m down from center
  { x: -8, y: 5 },
  { x: 0, y: 5 },
];

// Convert meter positions to pixel positions
const TARGET_POSITIONS = TARGET_POSITIONS_METERS.map(pos => ({
  x: WORLD_WIDTH / 2 + pos.x * METERS_TO_PIXELS,
  y: WORLD_HEIGHT / 2 + pos.y * METERS_TO_PIXELS,
}));

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
  centerY: number; // Center of the figure (torso area) for hit detection
  hitboxRadius: number; // Radius of the hitbox in pixels (body size)
  hp: number;
  maxHp: number;
  sprite: Phaser.GameObjects.Container | null;
  hpBar: Phaser.GameObjects.Graphics | null;
  hitboxCircle: Phaser.GameObjects.Graphics | null; // Visual hitbox indicator
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

/**
 * Техника в процессе зарядки
 * 
 * Время зарядки = qiCost / проводимость (секунды)
 * Бонусы: +5% скорость за уровень культивации, +1% за 1% мастерства
 */
interface TechniqueCharging {
  id: string;                    // Уникальный ID зарядки
  techniqueId: string;           // ID техники
  slotIndex: number;             // Индекс слота (1-6)
  qiCost: number;                // Стоимость Ци
  startTime: number;             // Время начала зарядки (ms)
  chargeTime: number;            // Время зарядки (ms)
  progress: number;              // Прогресс 0-1
  techniqueData: {
    damage: number;
    range: number | RangeData;   // Поддержка зон урона
    type: string;
    element: string;
    qiCost: number;
    mastery?: number;
    coneAngle?: number;          // Угол конуса атаки
  };
  chargeBar?: Phaser.GameObjects.Graphics;  // Визуальный индикатор
  chargeText?: Phaser.GameObjects.Text;     // Текст времени
}

// Global references
let globalSessionId: string | null = null;
let globalOnMovement: ((tiles: number) => void) | null = null;
let globalOnSendMessage: ((message: string) => void) | null = null;
let globalCharacter: Character | null = null;
let globalTechniques: CharacterTechnique[] = [];
let globalMessages: Message[] = [];
// globalIsLoading removed - unused
let globalWorldTime: { year: number; month: number; day: number; hour: number; minute: number } | null = null;

// Scene globals
let globalTargets: TrainingTarget[] = [];
let globalDamageNumbers: DamageNumber[] = [];
let globalPlayerRotation: number = 0;
// globalOnUseTechnique removed - unused

// Charging system globals
let globalChargingTechniques: TechniqueCharging[] = [];
let globalChargeBars: Map<number, Phaser.GameObjects.Graphics> = new Map();
let globalChargeTexts: Map<number, Phaser.GameObjects.Text> = new Map();

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

  // Calculate the center of the figure (torso area)
  // Sprite is at (0, -40) with origin (0.5, 1), texture is 80px tall
  // Bottom of sprite at y - 40, top at y - 120
  // Center of torso (straw body) is around 45% from top = y - 40 - 80*0.55 ≈ y - 84
  // But for visual center, we use y - 60 (torso area)
  const centerY = y - 60;

  // Visual hitbox indicator (debug/tactical view)
  const hitboxCircle = scene.add.graphics();
  hitboxCircle.lineStyle(1, 0x00ff00, 0.4); // Green, semi-transparent
  hitboxCircle.strokeCircle(0, -60, TARGET_HITBOX_RADIUS); // Centered at torso
  container.add(hitboxCircle);

  const target: TrainingTarget = {
    id,
    x,
    y,
    centerY,
    hitboxRadius: TARGET_HITBOX_RADIUS,
    hp: 1000,
    maxHp: 1000,
    sprite: container,
    hpBar,
    hitboxCircle,
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

  // Show damage number at target center (centerY = torso area)
  showDamageNumber(scene, target.x, target.centerY, damage, type);

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
      showDamageNumber(scene, target.x, target.centerY, 1000, 'healing');
      
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

// ============================================
// TECHNIQUE CHARGING SYSTEM
// ============================================

/**
 * Calculate technique charge time based on Qi cost and conductivity
 * 
 * Formula: chargeTime = qiCost / effectiveSpeed
 * effectiveSpeed = conductivity × (1 + masteryBonus)
 * 
 * @param qiCost Qi cost of the technique
 * @param coreCapacity Character's core capacity
 * @param cultivationLevel Character's cultivation level
 * @param mastery Technique mastery (0-100%)
 * @param conductivityMeditations Number of conductivity meditations (default 0)
 * @returns Charge time in milliseconds
 */
function calculateChargeTime(
  qiCost: number,
  coreCapacity: number,
  cultivationLevel: number = 1,
  mastery: number = 0,
  conductivityMeditations: number = 0
): number {
  // Используем ЕДИНУЮ функцию проводимости из conductivity-system.ts
  const totalConductivity = calculateTotalConductivity(
    coreCapacity,
    cultivationLevel,
    conductivityMeditations
  );
  
  // Base speed = conductivity Qi/second
  let effectiveSpeed = Math.max(0.1, totalConductivity);
  
  // Mastery bonus: +1% speed per 1% mastery
  const masteryBonus = 1 + mastery * 0.01;
  effectiveSpeed *= masteryBonus;
  
  // Charge time in milliseconds
  const chargeTimeMs = (qiCost / effectiveSpeed) * 1000;
  
  // Minimum 100ms (для баланса - минимум 0.1 секунды)
  return Math.max(100, chargeTimeMs);
}

/**
 * Get effective conductivity from character
 * Использует ЕДИНУЮ функцию проводимости из conductivity-system.ts
 */
function getEffectiveConductivity(): number {
  const char = globalCharacter;
  if (!char) return 1.0;
  
  // Используем единую функцию проводимости
  return calculateTotalConductivity(
    char.coreCapacity,
    char.cultivationLevel,
    char.conductivityMeditations || 0
  );
}

/**
 * Get core capacity from character (for charge time calculation)
 */
function getCoreCapacity(): number {
  return globalCharacter?.coreCapacity || 360;
}

/**
 * Get cultivation level from character
 */
function getCultivationLevel(): number {
  return globalCharacter?.cultivationLevel || 1;
}

/**
 * Check if a slot is already charging
 */
function isSlotCharging(slotIndex: number): boolean {
  return globalChargingTechniques.some(ct => ct.slotIndex === slotIndex);
}

/**
 * Start charging a technique
 * 
 * @returns true if charging started, false if already charging or invalid
 */
function startTechniqueCharging(
  scene: Phaser.Scene,
  slotIndex: number,
  techniqueId: string,
  techniqueData: {
    damage: number;
    range: number;
    type: string;
    element: string;
    qiCost: number;
    mastery?: number;
  },
  playerX: number,
  playerY: number
): boolean {
  // Check if already charging this slot
  if (isSlotCharging(slotIndex)) {
    // Show "Already charging" message
    const msgText = scene.add.text(playerX, playerY - 60, 'Уже заряжается...', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(200);
    
    scene.tweens.add({
      targets: msgText,
      y: playerY - 80,
      alpha: 0,
      duration: 1000,
      onComplete: () => msgText.destroy(),
    });
    return false;
  }
  
  // Check Qi availability
  const currentQi = globalCharacter?.currentQi || 0;
  if (techniqueData.qiCost > 0 && currentQi < techniqueData.qiCost) {
    // Show "Not enough Qi" message
    const noQiText = scene.add.text(playerX, playerY - 60, `Недостаточно Ци! Нужно: ${techniqueData.qiCost}`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(200);
    
    scene.tweens.add({
      targets: noQiText,
      y: playerY - 90,
      alpha: 0,
      duration: 1500,
      onComplete: () => noQiText.destroy(),
    });
    return false;
  }
  
  // Calculate charge time using coreCapacity and conductivity meditations
  const coreCapacity = getCoreCapacity();
  const cultivationLevel = getCultivationLevel();
  const mastery = techniqueData.mastery || 0;
  const conductivityMeditations = globalCharacter?.conductivityMeditations || 0;
  const chargeTime = calculateChargeTime(techniqueData.qiCost, coreCapacity, cultivationLevel, mastery, conductivityMeditations);
  
  // Create charge bar for this slot (will be updated in update loop)
  const chargeBar = scene.add.graphics();
  chargeBar.setDepth(150);
  globalChargeBars.set(slotIndex, chargeBar);
  
  // Create charge text
  const chargeText = scene.add.text(0, 0, '', {
    fontSize: '10px',
    fontFamily: 'Arial',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 1,
  }).setOrigin(0.5).setDepth(151);
  globalChargeTexts.set(slotIndex, chargeText);
  
  // Create charging entry
  const charging: TechniqueCharging = {
    id: `charge_${slotIndex}_${Date.now()}`,
    techniqueId,
    slotIndex,
    qiCost: techniqueData.qiCost,
    startTime: Date.now(),
    chargeTime,
    progress: 0,
    techniqueData: {
      ...techniqueData,
      qiCost: techniqueData.qiCost,
    },
    chargeBar,
    chargeText,
  };
  
  globalChargingTechniques.push(charging);
  
  // Show charging started message
  const chargeSeconds = (chargeTime / 1000).toFixed(1);
  const startText = scene.add.text(playerX, playerY - 50, `⚡ Зарядка: ${chargeSeconds}с`, {
    fontSize: '12px',
    fontFamily: 'Arial',
    color: '#4ade80',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5).setDepth(200);
  
  scene.tweens.add({
    targets: startText,
    y: playerY - 70,
    alpha: 0,
    duration: 1000,
    onComplete: () => startText.destroy(),
  });
  
  return true;
}

/**
 * Update all charging techniques
 * Returns techniques that finished charging this frame
 */
function updateChargingTechniques(scene: Phaser.Scene): TechniqueCharging[] {
  const now = Date.now();
  const finished: TechniqueCharging[] = [];
  
  for (const charging of globalChargingTechniques) {
    const elapsed = now - charging.startTime;
    charging.progress = Math.min(1, elapsed / charging.chargeTime);
    
    // Update visual charge bar
    if (charging.chargeBar) {
      charging.chargeBar.clear();
      
      // Background
      charging.chargeBar.fillStyle(0x000000, 0.7);
      charging.chargeBar.fillRect(-20, -8, 40, 6);
      
      // Progress
      const progressColor = charging.progress >= 1 ? 0x4ade80 : 0xfbbf24;
      charging.chargeBar.fillStyle(progressColor, 1);
      charging.chargeBar.fillRect(-20, -8, 40 * charging.progress, 6);
    }
    
    // Update charge text
    if (charging.chargeText) {
      const remaining = Math.max(0, (charging.chargeTime - elapsed) / 1000);
      if (charging.progress >= 1) {
        charging.chargeText.setText('ГОТОВО!');
        charging.chargeText.setColor('#4ade80');
      } else {
        charging.chargeText.setText(`${remaining.toFixed(1)}с`);
      }
    }
    
    // Check if finished
    if (charging.progress >= 1) {
      finished.push(charging);
    }
  }
  
  return finished;
}

/**
 * Execute a fully charged technique
 */
async function executeChargedTechnique(
  scene: Phaser.Scene,
  charging: TechniqueCharging,
  playerX: number,
  playerY: number,
  playerRotation: number
): Promise<boolean> {
  // Remove from charging list
  globalChargingTechniques = globalChargingTechniques.filter(ct => ct.id !== charging.id);
  
  // Clean up visuals
  if (charging.chargeBar) {
    charging.chargeBar.destroy();
    globalChargeBars.delete(charging.slotIndex);
  }
  if (charging.chargeText) {
    charging.chargeText.destroy();
    globalChargeTexts.delete(charging.slotIndex);
  }
  
  // Deduct Qi
  const qiCost = charging.qiCost;
  const currentQi = globalCharacter?.currentQi || 0;
  
  if (qiCost > 0) {
    // Update local Qi immediately
    if (globalCharacter) {
      globalCharacter.currentQi = Math.max(0, currentQi - qiCost);
    }
    
    // Sync with server (fire and forget)
    if (globalSessionId && globalCharacter?.id) {
      fetch('/api/technique/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: globalCharacter.id,
          techniqueId: charging.techniqueId,
          trainingMode: true,
          qiCostOverride: qiCost,
        }),
      }).catch(err => console.error('Failed to sync Qi:', err));
    }
  }
  
  // Execute technique visuals
  await executeTechniqueInDirection(
    scene,
    charging.techniqueId,
    {
      damage: charging.techniqueData.damage,
      range: charging.techniqueData.range,
      type: charging.techniqueData.type,
      element: charging.techniqueData.element,
      qiCost: 0, // Already deducted
    },
    playerX,
    playerY,
    playerRotation
  );
  
  return true;
}

/**
 * Cancel charging for a slot
 */
function cancelCharging(slotIndex: number): void {
  const charging = globalChargingTechniques.find(ct => ct.slotIndex === slotIndex);
  if (charging) {
    if (charging.chargeBar) {
      charging.chargeBar.destroy();
      globalChargeBars.delete(slotIndex);
    }
    if (charging.chargeText) {
      charging.chargeText.destroy();
      globalChargeTexts.delete(slotIndex);
    }
    globalChargingTechniques = globalChargingTechniques.filter(ct => ct.slotIndex !== slotIndex);
  }
}

/**
 * Get charging progress for a slot (0-1, or 0 if not charging)
 */
function getChargingProgress(slotIndex: number): number {
  const charging = globalChargingTechniques.find(ct => ct.slotIndex === slotIndex);
  return charging?.progress || 0;
}

/**
 * Извлечь данные о дальности из effects техники или damageFalloff
 * Автоматически рассчитывает зоны урона если они не указаны явно
 */
function extractRangeData(
  effects: Record<string, unknown> | undefined,
  fallbackRange: number = 10,
  techniqueType?: string,
  damageFalloff?: { fullDamage?: number; halfDamage?: number; max?: number }
): RangeData {
  // ПРИОРИТЕТ 1: Проверяем damageFalloff (основное поле для боевых техник)
  if (damageFalloff && typeof damageFalloff === 'object' && (damageFalloff.fullDamage || damageFalloff.halfDamage || damageFalloff.max)) {
    const maxRange = damageFalloff.max ?? fallbackRange;
    return {
      fullDamage: damageFalloff.fullDamage ?? maxRange * 0.5,
      halfDamage: damageFalloff.halfDamage ?? maxRange * 0.75,
      max: maxRange,
    };
  }

  if (!effects) {
    return { fullDamage: fallbackRange, halfDamage: fallbackRange, max: fallbackRange };
  }

  // ПРИОРИТЕТ 2: Если range это объект с зонами урона
  const range = effects.range as { fullDamage?: number; halfDamage?: number; max?: number } | undefined;

  if (range && typeof range === 'object' && (range.fullDamage || range.halfDamage || range.max)) {
    const maxRange = range.max ?? fallbackRange;
    return {
      fullDamage: range.fullDamage ?? maxRange * 0.5,
      halfDamage: range.halfDamage ?? maxRange * 0.75,
      max: maxRange,
    };
  }

  // ПРИОРИТЕТ 3: Если range это просто число - рассчитываем зоны автоматически
  const rangeValue = typeof effects.range === 'number' ? effects.range :
                     typeof effects.distance === 'number' ? effects.distance :
                     fallbackRange;

  // Для AOE техник - зоны урона шире (50% и 75% от максимальной дальности)
  if (techniqueType === 'ranged_aoe' || effects.combatType === 'ranged_aoe') {
    return {
      fullDamage: rangeValue * 0.5,   // 50% дальности = полный урон
      halfDamage: rangeValue * 0.75,  // 75% дальности = 50% урона
      max: rangeValue,
    };
  }

  // Для обычных ranged техник
  if (techniqueType?.startsWith('ranged_') || String(effects.combatType).startsWith('ranged_')) {
    return {
      fullDamage: rangeValue * 0.5,   // 50% дальности = полный урон
      halfDamage: rangeValue * 0.75,  // 75% дальности = 50% урона
      max: rangeValue,
    };
  }

  // Для melee техник - весь урон на всей дистанции
  return { fullDamage: rangeValue, halfDamage: rangeValue, max: rangeValue };
}

/**
 * Рассчитать множитель урона на основе расстояния (линейное затухание)
 * Для AOE техник с линейным затуханием урона
 * 
 * @param distance Дистанция до цели (в пикселях)
 * @param fullDamageRange Дистанция полного урона (в пикселях)
 * @param maxRange Максимальная дистанция (в пикселях)
 * @returns Множитель урона от 0.0 до 1.0
 */
function calculateLinearDamageFalloff(
  distance: number,
  fullDamageRange: number,
  maxRange: number
): number {
  // В зоне полного урона
  if (distance <= fullDamageRange) {
    return 1.0;
  }
  
  // За пределами максимальной дальности
  if (distance >= maxRange) {
    return 0.0;
  }
  
  // Линейное затухание от fullDamageRange до maxRange
  const falloffRange = maxRange - fullDamageRange;
  const distanceInFalloff = distance - fullDamageRange;
  
  // Урон падает от 100% до 0% линейно
  return 1.0 - (distanceInFalloff / falloffRange);
}

/**
 * Результат проверки попадания
 */
interface HitResult {
  hit: boolean;
  damageZone: 'full' | 'half' | 'falloff' | 'none';
  damageMultiplier: number;  // Точный множитель урона (0.0 - 1.0)
  distance: number;
}

/**
 * Check if target is in attack cone with hitbox consideration
 * Returns hit result with damage zone info and exact multiplier
 * 
 * Damage zones:
 * - full: distance <= fullDamageRange (100% damage)
 * - half: distance <= halfDamageRange (50% damage)  
 * - falloff: linear falloff from fullDamageRange to maxRange
 * - none: distance > maxRange
 */
function checkAttackHit(
  playerX: number,
  playerY: number,
  playerRotation: number,
  targetX: number,
  targetY: number,
  coneAngle: number,
  fullDamageRange: number,
  halfDamageRange: number,
  maxRange: number,
  targetHitboxRadius: number = 0
): HitResult {
  const dx = targetX - playerX;
  const dy = targetY - playerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Проверка максимальной дальности (с учётом хитбокса)
  if (distance > maxRange + targetHitboxRadius) {
    return { hit: false, damageZone: 'none', damageMultiplier: 0, distance };
  }

  // Angle to target
  const angleToTarget = Math.atan2(dy, dx) * 180 / Math.PI;
  const normalizedTarget = ((angleToTarget % 360) + 360) % 360;
  
  // Player rotation (convert to degrees, where 0 = right)
  const normalizedRotation = ((playerRotation % 360) + 360) % 360;

  // Difference
  let angleDiff = Math.abs(normalizedTarget - normalizedRotation);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;

  // Не в конусе
  if (angleDiff > coneAngle / 2) {
    return { hit: false, damageZone: 'none', damageMultiplier: 0, distance };
  }

  // Определяем зону урона и множитель
  let damageZone: 'full' | 'half' | 'falloff' | 'none' = 'none';
  let damageMultiplier = 0;
  
  if (distance <= fullDamageRange + targetHitboxRadius) {
    // Зона полного урона (100%)
    damageZone = 'full';
    damageMultiplier = 1.0;
  } else if (distance <= halfDamageRange + targetHitboxRadius) {
    // Зона половинного урона (50%)
    damageZone = 'half';
    damageMultiplier = 0.5;
  } else if (distance <= maxRange + targetHitboxRadius) {
    // Зона линейного затухания (от 50% до 0%)
    damageZone = 'falloff';
    // Линейное затухание от halfDamageRange до maxRange
    const falloffDistance = distance - halfDamageRange;
    const totalFalloffRange = maxRange - halfDamageRange;
    damageMultiplier = Math.max(0, 0.5 * (1 - falloffDistance / totalFalloffRange));
  }

  return { hit: damageMultiplier > 0, damageZone, damageMultiplier, distance };
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
 * Данные о дальности техники
 */
interface RangeData {
  fullDamage: number;  // Дальность полного урона (в метрах)
  halfDamage: number;  // Дальность половинного урона (в метрах)
  max: number;         // Максимальная дальность (в метрах)
}

/**
 * Use technique in direction - with Qi cost check
 */
async function executeTechniqueInDirection(
  scene: Phaser.Scene,
  techniqueId: string,
  techniqueData: { 
    damage: number; 
    range: number | RangeData; 
    type: string; 
    element: string; 
    qiCost?: number;
    coneAngle?: number;  // Угол конуса атаки (по умолчанию 60)
  },
  playerX: number,
  playerY: number,
  playerRotation: number
): Promise<boolean> {
  // === QI COST CHECK ===
  const qiCost = techniqueData.qiCost || 0;
  const currentQi = globalCharacter?.currentQi || 0;
  
  if (qiCost > 0 && currentQi < qiCost) {
    // Show "Not enough Qi" message
    const noQiText = scene.add.text(playerX, playerY - 40, `Недостаточно Ци! Нужно: ${qiCost}`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(200);
    
    scene.tweens.add({
      targets: noQiText,
      y: playerY - 70,
      alpha: 0,
      duration: 1500,
      onComplete: () => noQiText.destroy(),
    });
    return false;
  }

  // === DEDUCT QI VIA API ===
  if (qiCost > 0 && globalSessionId) {
    try {
      await fetch('/api/technique/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: globalCharacter?.id,
          techniqueId: techniqueId,
          trainingMode: true, // Don't actually use technique, just deduct Qi
          qiCostOverride: qiCost,
        }),
      });
      
      // Update local character Qi
      if (globalCharacter) {
        globalCharacter.currentQi = Math.max(0, currentQi - qiCost);
      }
    } catch (error) {
      console.error('Failed to deduct Qi:', error);
    }
  }

  // === PARSE RANGE DATA ===
  const rangeData: RangeData = typeof techniqueData.range === 'number' 
    ? { fullDamage: techniqueData.range, halfDamage: techniqueData.range, max: techniqueData.range }
    : techniqueData.range;
  
  const fullDamageRange = rangeData.fullDamage * METERS_TO_PIXELS;
  const halfDamageRange = rangeData.halfDamage * METERS_TO_PIXELS;
  const maxRange = rangeData.max * METERS_TO_PIXELS;
  
  const damage = techniqueData.damage || 10;
  const element = techniqueData.element || 'neutral';
  const techniqueType = techniqueData.type || 'combat';
  const coneAngle = techniqueData.coneAngle || 60; // По умолчанию 60 градусов

  const rad = playerRotation * Math.PI / 180;
  const endX = playerX + Math.cos(rad) * maxRange;
  const endY = playerY + Math.sin(rad) * maxRange;
  const elementColor = getElementColor(element);

  // === VISUAL EFFECTS BASED ON TECHNIQUE TYPE ===
  
  if (techniqueType === 'ranged_beam' || techniqueType === 'ranged_projectile') {
    // Beam effect - показываем линии зон урона
    const beam = scene.add.graphics();
    beam.setDepth(15);
    
    // Линия до конца максимальной дальности
    beam.lineStyle(4, elementColor, 0.9);
    beam.beginPath();
    beam.moveTo(playerX, playerY);
    beam.lineTo(endX, endY);
    beam.strokePath();

    // Glow effect
    beam.lineStyle(8, elementColor, 0.3);
    beam.beginPath();
    beam.moveTo(playerX, playerY);
    beam.lineTo(endX, endY);
    beam.strokePath();
    
    // Показываем зону половинного урона (более тусклая)
    if (halfDamageRange > fullDamageRange) {
      const halfX = playerX + Math.cos(rad) * halfDamageRange;
      const halfY = playerY + Math.sin(rad) * halfDamageRange;
      
      // Затухание от половинной до максимальной
      beam.lineStyle(3, elementColor, 0.4);
      beam.beginPath();
      beam.moveTo(playerX + Math.cos(rad) * fullDamageRange, playerY + Math.sin(rad) * fullDamageRange);
      beam.lineTo(halfX, halfY);
      beam.strokePath();
    }

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
  } else if (techniqueType === 'ranged_aoe') {
    // AOE - круговая область с зонами урона
    const aoe = scene.add.graphics();
    aoe.setDepth(15);
    
    // Зона половинного урона (внешняя)
    if (halfDamageRange > fullDamageRange) {
      aoe.fillStyle(elementColor, 0.15);
      aoe.beginPath();
      aoe.arc(playerX, playerY, halfDamageRange, rad - Math.PI / 6, rad + Math.PI / 6, false);
      aoe.lineTo(playerX, playerY);
      aoe.closePath();
      aoe.fillPath();
    }
    
    // Зона полного урона (внутренняя)
    aoe.fillStyle(elementColor, 0.35);
    aoe.beginPath();
    aoe.arc(playerX, playerY, fullDamageRange, rad - Math.PI / 6, rad + Math.PI / 6, false);
    aoe.lineTo(playerX, playerY);
    aoe.closePath();
    aoe.fillPath();
    
    // Радиус максимальной дальности (граница)
    aoe.lineStyle(1, elementColor, 0.5);
    aoe.beginPath();
    aoe.arc(playerX, playerY, maxRange, rad - Math.PI / 6, rad + Math.PI / 6, false);
    aoe.strokePath();
    
    scene.tweens.add({
      targets: aoe,
      alpha: 0,
      duration: 400,
      onComplete: () => aoe.destroy(),
    });
  } else {
    // Melee/Combat - cone effect с зонами урона
    const cone = scene.add.graphics();
    const coneAngleRad = coneAngle * Math.PI / 180;
    
    // Зона половинного урона (внешняя часть конуса)
    if (halfDamageRange > fullDamageRange) {
      cone.fillStyle(elementColor, 0.15);
      cone.beginPath();
      cone.moveTo(playerX, playerY);
      cone.arc(playerX, playerY, halfDamageRange, rad - coneAngleRad / 2, rad + coneAngleRad / 2, false);
      cone.closePath();
      cone.fillPath();
    }
    
    // Зона полного урона (внутренняя часть конуса)
    cone.fillStyle(elementColor, 0.35);
    cone.beginPath();
    cone.moveTo(playerX, playerY);
    cone.arc(playerX, playerY, fullDamageRange, rad - coneAngleRad / 2, rad + coneAngleRad / 2, false);
    cone.closePath();
    cone.fillPath();
    cone.setDepth(15);

    // Edge lines
    cone.lineStyle(2, elementColor, 0.8);
    cone.beginPath();
    cone.moveTo(playerX, playerY);
    cone.lineTo(playerX + Math.cos(rad - coneAngleRad / 2) * maxRange, playerY + Math.sin(rad - coneAngleRad / 2) * maxRange);
    cone.moveTo(playerX, playerY);
    cone.lineTo(playerX + Math.cos(rad + coneAngleRad / 2) * maxRange, playerY + Math.sin(rad + coneAngleRad / 2) * maxRange);
    cone.strokePath();
    
    // Граница зоны половинного урона
    if (halfDamageRange > fullDamageRange) {
      cone.lineStyle(1, elementColor, 0.5);
      cone.beginPath();
      cone.arc(playerX, playerY, halfDamageRange, rad - coneAngleRad / 2, rad + coneAngleRad / 2, false);
      cone.strokePath();
    }

    scene.tweens.add({
      targets: cone,
      alpha: 0,
      duration: 300,
      onComplete: () => cone.destroy(),
    });
  }

  // Check each target - use target's center (centerY) and hitbox for collision
  for (const target of globalTargets) {
    const hitResult = checkAttackHit(
      playerX, playerY, playerRotation,
      target.x, target.centerY,
      coneAngle,
      fullDamageRange, halfDamageRange, maxRange,
      target.hitboxRadius
    );
    
    if (hitResult.hit) {
      // Calculate damage based on exact multiplier (linear falloff)
      let finalDamage = Math.floor(damage * hitResult.damageMultiplier);
      let damageType = element;
      
      // Показываем разный цвет для разных зон
      if (hitResult.damageZone === 'half' || hitResult.damageZone === 'falloff') {
        damageType = 'normal'; // Урон в зонах затухания показываем белым
      }
      
      // Crit check (только для полного урона)
      const isCrit = hitResult.damageZone === 'full' && Math.random() < 0.15;
      if (isCrit) {
        finalDamage = Math.floor(finalDamage * 1.5);
        damageType = 'critical';
      }
      
      // Hit effect on target's center (torso area)
      const hitColor = hitResult.damageZone === 'full' ? elementColor : 0xffffff;
      const hitEffect = scene.add.circle(target.x, target.centerY, 
        hitResult.damageZone === 'full' ? 15 : 10, 
        hitColor, 0.8);
      hitEffect.setDepth(200);
      scene.tweens.add({
        targets: hitEffect,
        scale: 2,
        alpha: 0,
        duration: 300,
        onComplete: () => hitEffect.destroy(),
      });
      
      // Показываем расстояние для отладки
      const distText = scene.add.text(target.x, target.centerY + 30, 
        `${(hitResult.distance / METERS_TO_PIXELS).toFixed(1)}м (${hitResult.damageZone})`, {
        fontSize: '10px',
        fontFamily: 'Arial',
        color: hitResult.damageZone === 'full' ? '#4ade80' : '#fbbf24',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(200);
      
      scene.tweens.add({
        targets: distText,
        y: distText.y - 20,
        alpha: 0,
        duration: 800,
        onComplete: () => distText.destroy(),
      });
      
      damageTarget(scene, target, finalDamage, isCrit ? 'critical' : damageType);
    }
  }
  
  return true;
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
    const chatInputText = '';
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

    // Player hitbox indicator (visual feedback for body size)
    const playerHitbox = scene.add.graphics();
    playerHitbox.lineStyle(1, 0x4ade80, 0.3); // Green, semi-transparent
    playerHitbox.strokeCircle(0, 0, PLAYER_HITBOX_RADIUS);
    playerHitbox.setDepth(9);
    scene.data.set('playerHitbox', playerHitbox);

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

    // === LEFT PANEL: Time + HP + Qi ===
    // World time display
    const worldTimeText = scene.add.text(10, 60, '', {
      fontSize: '14px',
      color: '#fbbf24',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
    });
    uiContainer.add(worldTimeText);
    scene.data.set('worldTimeText', worldTimeText);

    // HP BAR
    const hpBarBg = scene.add.graphics();
    hpBarBg.fillStyle(0x000000, 0.7);
    hpBarBg.fillRect(0, 0, 140, 20);
    hpBarBg.setPosition(10, 85);
    uiContainer.add(hpBarBg);

    const hpBarFill = scene.add.graphics();
    hpBarFill.setPosition(10, 85);
    uiContainer.add(hpBarFill);
    scene.data.set('hpBarFill', hpBarFill);

    const hpLabel = scene.add.text(15, 88, '❤️ HP: 100%', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial',
    });
    uiContainer.add(hpLabel);
    scene.data.set('hpLabel', hpLabel);

    // QI BAR
    const qiBarBg = scene.add.graphics();
    qiBarBg.fillStyle(0x000000, 0.7);
    qiBarBg.fillRect(0, 0, 140, 20);
    qiBarBg.setPosition(10, 110);
    uiContainer.add(qiBarBg);

    const qiBarFill = scene.add.graphics();
    qiBarFill.setPosition(10, 110);
    uiContainer.add(qiBarFill);
    scene.data.set('qiBarFill', qiBarFill);

    const qiLabel = scene.add.text(15, 113, '✨ Ци: 100/100', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial',
    });
    uiContainer.add(qiLabel);
    scene.data.set('qiLabel', qiLabel);

    // === DISTANCE DISPLAY (below Qi) ===
    const distanceText = scene.add.text(10, 138, '📏 До цели: -- м', {
      fontSize: '12px',
      color: '#4ade80',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
    });
    uiContainer.add(distanceText);
    scene.data.set('distanceText', distanceText);

    // ATTACK RANGE indicator (shows effective range with hitbox consideration)
    const basicRangeMeters = 1.0;
    const targetHitboxMeters = TARGET_HITBOX_RADIUS / METERS_TO_PIXELS;
    const rangeText = scene.add.text(10, 160, `⚔️ Дальность: ${basicRangeMeters.toFixed(1)}м (+${targetHitboxMeters.toFixed(1)}м тело)`, {
      fontSize: '11px',
      color: '#9ca3af',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
    });
    uiContainer.add(rangeText);
    scene.data.set('rangeText', rangeText);

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
        const hpWidth = 138 * (hpPercent / 100);
        let hpColor = 0x22c55e; // Green
        if (hpPercent < 25) hpColor = 0xef4444; // Red
        else if (hpPercent < 50) hpColor = 0xf97316; // Orange
        else if (hpPercent < 75) hpColor = 0xeab308; // Yellow
        
        hpBar.fillStyle(hpColor);
        hpBar.fillRect(1, 1, hpWidth, 18);
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
        const qiWidth = 138 * (qiPercent / 100);
        qiBar.fillStyle(0x4ade80); // Green for Qi
        qiBar.fillRect(1, 1, qiWidth, 18);
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
    const chatWidth = 350;
    const chatHeight = 360; // Increased 3x from 120
    
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
    // Адаптивный размер слотов в зависимости от количества
    const baseSlotSize = 40;
    const baseSlotSpacing = 5;
    // Количество слотов зависит от уровня культивации (3 + level - 1)
    // Уровень 1 = 3 слота, уровень 9 = 11 слотов

    const combatSlotsContainer = scene.add.container(0, 0);
    uiContainer.add(combatSlotsContainer);

    const slotBackgrounds: Phaser.GameObjects.Rectangle[] = [];

    const updateCombatSlots = () => {
      combatSlotsContainer.removeAll(true);
      slotBackgrounds.length = 0;

      const { width, height } = getScreenSize();
      const level = globalCharacter?.cultivationLevel || 1;
      const availableSlots = getCombatSlotsCount(level);
      
      // Адаптивный размер слотов - уменьшаем если много слотов
      let slotSize = baseSlotSize;
      let slotSpacing = baseSlotSpacing;
      const totalWidth = availableSlots * (slotSize + slotSpacing) - slotSpacing;
      const maxAllowedWidth = width - 40; // 20px отступ с каждой стороны
      
      if (totalWidth > maxAllowedWidth) {
        const scale = maxAllowedWidth / totalWidth;
        slotSize = Math.floor(baseSlotSize * scale);
        slotSpacing = Math.max(2, Math.floor(baseSlotSpacing * scale));
      }

      const equippedBySlot: Map<number, CharacterTechnique> = new Map();
      for (const t of globalTechniques) {
        if ((t.technique.type === 'combat' || t.technique.type === 'movement' || 
             t.technique.type === 'support' || t.technique.type === 'sensory') && 
            t.quickSlot !== null && t.quickSlot > 0) {
          equippedBySlot.set(t.quickSlot, t);
        }
      }

      // Позиция слотов - учитываем место для номера слота сверху (+15px)
      const slotsY = height - 50 - 15; 
      const startX = width / 2 - (availableSlots * (slotSize + slotSpacing) - slotSpacing) / 2;

      for (let i = 0; i < availableSlots; i++) {
        const x = startX + i * (slotSize + slotSpacing);
        const isAvailable = i < availableSlots;
        const equipped = equippedBySlot.get(i + 1);
        const isSlot1 = i === 0;
        const hasContent = equipped || (isSlot1 && isAvailable); // Slot 1 always has basic attack
        const slotKey = String(i + 1);
        
        // Check if this slot is charging
        const chargingSlot = globalChargingTechniques.find(ct => ct.slotIndex === i + 1);
        const isCharging = !!chargingSlot;
        const chargeProgress = chargingSlot?.progress || 0;

        // Darken background when charging
        const slotBg = scene.add.rectangle(x, slotsY, slotSize, slotSize,
          isAvailable 
            ? (isCharging ? 0x1a3a1a : (hasContent ? 0x22c55e : 0x1e293b)) 
            : 0x0f172a, 
          1
        );
        slotBg.setStrokeStyle(2, isAvailable ? (hasContent ? 0x22c55e : 0x4ade80) : 0x334155);
        combatSlotsContainer.add(slotBg);
        slotBackgrounds.push(slotBg);
        
        // === CHARGING PROGRESS BAR (внутри слота, снизу) ===
        if (isCharging) {
          const barWidth = slotSize - 6;
          const barHeight = 3;
          const barX = x;
          const barY = slotsY + slotSize / 2 - barHeight - 2; // Внизу слота, внутри границ
          
          // Background of progress bar
          const progressBg = scene.add.rectangle(barX, barY, barWidth, barHeight, 0x000000, 0.8);
          combatSlotsContainer.add(progressBg);
          
          // Progress fill (fills from left to right)
          const progressFill = scene.add.rectangle(
            barX - barWidth / 2 + (barWidth * chargeProgress) / 2, 
            barY, 
            Math.max(1, barWidth * chargeProgress), 
            barHeight, 
            chargeProgress >= 1 ? 0x4ade80 : 0xfbbf24, 
            1
          );
          combatSlotsContainer.add(progressFill);
          
          // Percentage text inside slot (центр слота)
          const progressText = scene.add.text(x, slotsY, 
            `${Math.round(chargeProgress * 100)}%`, {
            fontSize: '9px',
            fontFamily: 'Arial',
            color: chargeProgress >= 1 ? '#4ade80' : '#fbbf24',
            stroke: '#000000',
            strokeThickness: 2,
          }).setOrigin(0.5);
          combatSlotsContainer.add(progressText);
        }

        const keyLabel = scene.add.text(x, slotsY - slotSize / 2 - 12, slotKey, {
          fontSize: '11px',
          fontFamily: 'Arial',
          color: isAvailable ? '#fbbf24' : '#475569',
          stroke: '#000000',
          strokeThickness: 2,
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

        if (isAvailable && hasContent) {
          slotBg.setInteractive();
          slotBg.on('pointerdown', () => {
            if (equipped) {
              const qiCost = equipped.technique.qiCost || 0;
              const techniqueType = equipped.technique.effects?.combatType || equipped.technique.type;
              const rangeData = extractRangeData(
                equipped.technique.effects as Record<string, unknown> | undefined,
                10,
                techniqueType,
                equipped.technique.damageFalloff as { fullDamage?: number; halfDamage?: number; max?: number } | undefined
              );
              
              // Techniques with 0 Qi cost execute instantly
              if (qiCost === 0) {
                executeTechniqueInDirection(
                  scene,
                  equipped.techniqueId,
                  {
                    damage: equipped.technique.effects?.damage || 15,
                    range: rangeData,
                    type: equipped.technique.effects?.combatType || equipped.technique.type,
                    element: equipped.technique.element,
                    qiCost: 0,
                  },
                  player.x,
                  player.y,
                  globalPlayerRotation
                );
              } else {
                // Start charging for techniques that cost Qi
                startTechniqueCharging(
                  scene,
                  i + 1,
                  equipped.techniqueId,
                  {
                    damage: equipped.technique.effects?.damage || 15,
                    range: rangeData,
                    type: equipped.technique.effects?.combatType || equipped.technique.type,
                    element: equipped.technique.element,
                    qiCost: qiCost,
                    mastery: equipped.mastery || 0,
                  },
                  player.x,
                  player.y
                );
              }
            } else if (isSlot1) {
              // Basic attack - NO Qi cost (physical attack, not a technique)
              executeTechniqueInDirection(
                scene,
                'basic_training_strike',
                {
                  damage: 25,
                  range: 1, // 1 meter - hand reach
                  type: 'melee_strike',
                  element: 'neutral',
                  qiCost: 0, // Physical attack - no Qi needed
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
      'WASD • Мышь для прицеливания • 1-9,0,- для атак', {
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

      // Left panel elements are fixed at x:10, only update on resize
      worldTimeText.setPosition(10, 60);
      hpBarBg.setPosition(10, 85);
      hpBarFill.setPosition(10, 85);
      hpLabel.setPosition(15, 88);
      qiBarBg.setPosition(10, 110);
      qiBarFill.setPosition(10, 110);
      qiLabel.setPosition(15, 113);
      distanceText.setPosition(10, 138);
      rangeText.setPosition(10, 160);

      const chatX = chatWidth / 2 + 10;
      const chatY = height - chatHeight / 2 - 10;
      chatBg.setPosition(chatX, chatY);
      chatTitle.setPosition(chatX - chatWidth / 2 + 5, chatY - chatHeight / 2 + 5);
      chatMessagesText.setPosition(chatX - chatWidth / 2 + 10, chatY - chatHeight / 2 + 25);
      inputBg.setPosition(chatX, chatY + chatHeight / 2 - 15);
      chatInputDisplay.setPosition(chatX - chatWidth / 2 + 10, chatY + chatHeight / 2 - 22);

      const minimapX = width - minimapSize / 2 - 10;
      const minimapY = 180 + minimapSize / 2;
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

    // Combat slot keys - support up to 11 slots (level 9)
    const numberKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO', 'MINUS'];
    // 1-9 = slots 1-9, 0 = slot 10, - = slot 11
    
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
            // Start charging the technique instead of instant use
            const qiCost = equipped.technique.qiCost || 0;
            const techniqueType = equipped.technique.effects?.combatType || equipped.technique.type;
            const rangeData = extractRangeData(
              equipped.technique.effects as Record<string, unknown> | undefined,
              10,
              techniqueType,
              equipped.technique.damageFalloff as { fullDamage?: number; halfDamage?: number; max?: number } | undefined
            );
            
            // Techniques with 0 Qi cost (like basic attacks) execute instantly
            if (qiCost === 0) {
              executeTechniqueInDirection(
                scene,
                equipped.techniqueId,
                {
                  damage: equipped.technique.effects?.damage || 15,
                  range: rangeData,
                  type: equipped.technique.effects?.combatType || equipped.technique.type,
                  element: equipped.technique.element,
                  qiCost: 0,
                },
                player.x,
                player.y,
                globalPlayerRotation
              );
            } else {
              // Start charging for techniques that cost Qi
              startTechniqueCharging(
                scene,
                slotIndex,
                equipped.techniqueId,
                {
                  damage: equipped.technique.effects?.damage || 15,
                  range: rangeData,
                  type: equipped.technique.effects?.combatType || equipped.technique.type,
                  element: equipped.technique.element,
                  qiCost: qiCost,
                  mastery: equipped.mastery || 0,
                },
                player.x,
                player.y
              );
            }
          } else if (slotIndex === 1) {
            // Slot 1: Default basic attack - NO Qi cost (physical attack, not a technique)
            executeTechniqueInDirection(
              scene,
              'basic_training_strike',
              {
                damage: 25,
                range: 1, // 1 meter - hand reach
                type: 'melee_strike',
                element: 'neutral',
                qiCost: 0, // Physical attack - no Qi needed
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
          if (globalMessages && globalMessages.length > 0) {
            const recentMessages = globalMessages.slice(-25); // More messages for larger chat (3x)
            const text = recentMessages.map(m => {
              const prefix = m.sender === 'player' ? '👤' : '📖';
              // Show full text, no truncation
              return `${prefix} ${m.content}`;
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
    const distanceTextEl = scene.data.get('distanceText') as Phaser.GameObjects.Text;
    const minimapPlayer = scene.data.get('minimapPlayer') as Phaser.GameObjects.Arc;
    const minimapX = scene.data.get('minimapX') as number;
    const minimapY = scene.data.get('minimapY') as number;
    const minimapSize = scene.data.get('minimapSize') as number;
    const lastPosition = scene.data.get('lastPosition') as { x: number; y: number };
    const accumulatedTiles = scene.data.get('accumulatedTiles') as number;
    const lastSyncTime = scene.data.get('lastSyncTime') as number;
    const isChatFocused = scene.data.get('isChatFocused') as boolean;
    const playerHitbox = scene.data.get('playerHitbox') as Phaser.GameObjects.Graphics;

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

    // Update player hitbox position (follows player)
    if (playerHitbox) {
      playerHitbox.clear();
      playerHitbox.lineStyle(1, 0x4ade80, 0.3);
      playerHitbox.strokeCircle(player.x, player.y, PLAYER_HITBOX_RADIUS);
    }

    // === METRIC COORDINATES ===
    // Convert pixel position to meters (center of world = 0,0)
    const playerXMeters = (player.x - WORLD_WIDTH / 2) / METERS_TO_PIXELS;
    const playerYMeters = (player.y - WORLD_HEIGHT / 2) / METERS_TO_PIXELS;
    const rotText = `🎯: ${Math.round(((globalPlayerRotation % 360) + 360) % 360)}°`;
    coordsText.setText(`X: ${playerXMeters.toFixed(1)}м  Y: ${playerYMeters.toFixed(1)}м  ${rotText}`);

    // === DISTANCE TO NEAREST TARGET (in meters) ===
    // Distance calculated from player center to target center (centerY = torso area)
    // Effective distance = distance to center - hitbox radius (distance to edge of hitbox)
    let nearestDistance = Infinity;
    let nearestInFront: number | null = null;
    let nearestHitboxRadius = 0;
    
    for (const target of globalTargets) {
      // Use target's centerY (torso area) for accurate distance to center of figure
      const dx = target.x - player.x;
      const dy = target.centerY - player.y;
      const distPixels = Math.sqrt(dx * dx + dy * dy);
      const distMeters = distPixels / METERS_TO_PIXELS;
      const hitboxMeters = target.hitboxRadius / METERS_TO_PIXELS;
      
      if (distMeters < nearestDistance) {
        nearestDistance = distMeters;
        nearestHitboxRadius = hitboxMeters;
        
        // Check if target is in front of player (within 90 degree cone)
        const angleToTarget = Math.atan2(dy, dx) * 180 / Math.PI;
        const playerAngleDeg = ((globalPlayerRotation % 360) + 360) % 360;
        let angleDiff = Math.abs(angleToTarget - playerAngleDeg);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;
        
        if (angleDiff <= 45) {
          nearestInFront = distMeters;
        }
      }
    }

    // Update distance display
    // Effective distance = distance to center - hitbox radius (how far from edge of body)
    // Attack reaches if: effectiveDistance <= attackRange
    const basicAttackRange = 1.0; // 1 meter hand reach
    if (distanceTextEl) {
      if (nearestInFront !== null) {
        const effectiveDistance = Math.max(0, nearestInFront - nearestHitboxRadius);
        const inRange = effectiveDistance <= basicAttackRange;
        distanceTextEl.setText(`📏 До цели: ${effectiveDistance.toFixed(1)}м (тело ${nearestHitboxRadius.toFixed(1)}м) ${inRange ? '✓' : '⚠️'}`);
        distanceTextEl.setColor(inRange ? '#4ade80' : '#fbbf24');
      } else if (nearestDistance < Infinity) {
        const effectiveDistance = Math.max(0, nearestDistance - nearestHitboxRadius);
        distanceTextEl.setText(`📏 Ближайшая: ${effectiveDistance.toFixed(1)}м`);
        distanceTextEl.setColor('#9ca3af');
      } else {
        distanceTextEl.setText('📏 Целей нет');
        distanceTextEl.setColor('#9ca3af');
      }
    }

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

    // === TECHNIQUE CHARGING UPDATE ===
    // Update all charging techniques and auto-execute when ready
    const finishedCharging = updateChargingTechniques(scene);
    for (const charging of finishedCharging) {
      // Execute the technique in current player direction
      executeChargedTechnique(
        scene,
        charging,
        player.x,
        player.y,
        globalPlayerRotation
      );
    }
    
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
  const worldTime = useGameTime();
  const { loadState, sendMessage } = useGameActions();

  useEffect(() => { globalSessionId = sessionId; }, [sessionId]);
  useEffect(() => { globalCharacter = character; }, [character]);
  useEffect(() => { globalTechniques = techniques; }, [techniques]);
  useEffect(() => { globalMessages = messages || []; }, [messages]);
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
