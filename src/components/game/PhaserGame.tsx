/**
 * Game Scene - Training Ground with targets and combat system
 * 
 * Features:
 * - Player with 8-direction sprites (no rotation, frame-based)
 * - Training targets (straw dummies)
 * - Damage number popups
 * - Direction-based technique usage
 * - WASD movement + mouse aiming
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameSessionId, useGameActions, useGameCharacter, useGameTechniques, useGameMessages, useGameTime, useGameInventory } from '@/stores/game.store';
import type { Message, CharacterTechnique, Character } from '@/types/game';
import { getCombatSlotsCount } from '@/types/game';
import { calculateTotalConductivity } from '@/lib/game/conductivity-system';
import { RARITY_COLORS_PHASER } from '@/types/rarity';
import { calculateEffectiveRange } from '@/types/body';
import { eventBusClient } from '@/lib/game/event-bus/client';
import { SpriteLoader, createDirectionalSpritesheet, angleToDirectionFrame, DIRECTION_FRAMES, shouldFlipSprite, createAllPlayerAnimations, createPlayerAnimationDefs, createFallbackPlayerTexture } from '@/game/services/sprite-loader';
import { getCultivationTheme } from '@/game/config/sprites.config';
import { EnvironmentManager, createDefaultTestPolygonConfig } from '@/game/services/environment-manager';
import { checkAttackHit, calculateLinearDamageFalloff, getElementColor, type HitResult, type RangeData } from '@/game/services/combat-utils';
import { 
  calculateChargeTime,
  getEffectiveConductivity,
  getCoreCapacity,
  getCultivationLevel,
  isSlotCharging,
  updateChargingTechniques as updateChargingTechniquesUtil,
  cancelCharging as cancelChargingUtil,
  getChargingProgress as getChargingProgressUtil,
  type TechniqueCharging,
  type ChargingContext
} from '@/game/services/technique-charging';
import { 
  InventorySceneConfig, 
  setInventoryGetter,
  type PhaserInventoryItem
} from '@/game/scenes/InventoryScene';
import { 
  ROCK_PRESETS, 
  TREE_PRESETS, 
  ORE_PRESETS, 
  BUILDING_PART_PRESETS 
} from '@/data/presets/environment';

// Game dimensions
const BASE_WIDTH = 1200;
const BASE_HEIGHT = 700;
// World size: 6000x6000 pixels (~187x187 meters)
// For training experience with manageable space
const WORLD_WIDTH = 6000;
const WORLD_HEIGHT = 6000;

// Player settings
const PLAYER_SIZE = 24;
const PLAYER_SPEED = 200;
const METERS_TO_PIXELS = 32; // 1 meter = 32 pixels
const PLAYER_HITBOX_RADIUS = 24; // Player hitbox radius in pixels

// Target hitbox settings
const TARGET_HITBOX_RADIUS = 22; // Target hitbox radius in pixels (approx half of body width)

// Time tracking
const TILE_SIZE = 64;
const TIME_SYNC_INTERVAL = 10000; // Увеличено с 3000 до 10000мс (10 сек) для уменьшения ре-рендеров
const MIN_TILES_FOR_SYNC = 5; // Увеличено с 1 до 5 тайлов - синхронизация только при значительном движении

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

// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ PHASER ↔ REACT
// ============================================
// 
// ВАЖНО: Это НЕ мусор, а архитектурное решение!
// 
// Phaser 3 Scene классы не имеют прямого доступа к React state.
// Глобальные переменные служат мостом для синхронизации:
// 
//   React (Zustand) → useEffect → globalVariable → Phaser Scene
// 
// Альтернативы (рассматривались, но отложены):
// - Инкапсуляция в класс: усложняет архитектуру
// - React Context: не работает внутри Phaser Scene
// - Custom Phaser Plugin: избыточно для текущих нужд
// 
// Синхронизация происходит в useEffect компонента PhaserGame:
//   useEffect(() => { globalSessionId = sessionId; }, [sessionId]);
// 
// Все переменные используются (см. grep подсчёт в ревью):
//   globalSessionId: 5 упоминаний
//   globalCharacter: 18 упоминаний
//   globalTechniques: 8 упоминаний
//   и т.д.
// ============================================

// === React State Bridge ===
let globalSessionId: string | null = null;
let globalOnMovement: ((tiles: number) => void) | null = null;
let globalOnSendMessage: ((message: string) => void) | null = null;
let globalCharacter: Character | null = null;
let globalTechniques: CharacterTechnique[] = [];
let globalMessages: Message[] = [];
let globalWorldTime: { year: number; month: number; day: number; hour: number; minute: number } | null = null;

// === Inventory Bridge ===
let globalInventory: PhaserInventoryItem[] = [];

// === Scene State ===
let globalTargets: TrainingTarget[] = [];
let globalDamageNumbers: DamageNumber[] = [];
let globalPlayerRotation: number = 0;

// === Charging System ===
let globalChargingTechniques: TechniqueCharging[] = [];
let globalChargeBars: Map<number, Phaser.GameObjects.Graphics> = new Map();
let globalChargeTexts: Map<number, Phaser.GameObjects.Text> = new Map();

// === Qi Aura System ===
let globalQiAura: Phaser.GameObjects.Container | null = null;
let globalSpriteLoader: SpriteLoader | null = null;
let globalLastCultivationLevel: number = 0; // Для отслеживания изменений уровня культивации

// === Callbacks ===
let globalOnToggleInventory: (() => void) | null = null;

// === Environment Manager ===
let globalEnvironmentManager: EnvironmentManager | null = null;

// === Training NPCs ===
interface TrainingNPC {
  id: string;
  name: string;
  speciesId: string;
  roleId: string;
  level: number;
  subLevel: number;
  health: number;
  maxHealth: number;
  disposition: number;
  aggressionLevel: number;
  x: number;
  y: number;
  sprite?: Phaser.GameObjects.Container;
  isAggro: boolean;
}
let globalTrainingNPCs: TrainingNPC[] = [];
let globalGameScene: Phaser.Scene | null = null;

// === Debug Mode ===
let globalDebugMode: boolean = false;
let globalDebugGraphics: Phaser.GameObjects.Graphics | null = null;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create player texture with clear front/back distinction
 * Front = face with eyes, Back = darker with hair/bun
 * DEPRECATED: Use SpriteLoader for AI-generated sprites
 */
function createPlayerTexture(scene: Phaser.Scene, level: number = 1): void {
  // Use fallback texture generator with cultivation level theme
  createFallbackPlayerTexture(scene, level);
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
// TRAINING NPC SYSTEM
// ============================================

/**
 * Load NPCs for Training Ground from server
 */
async function loadTrainingNPCs(
  scene: Phaser.Scene,
  sessionId: string | null,
  playerLevel: number
): Promise<void> {
  if (!sessionId) {
    console.log('[TrainingNPC] No sessionId, skipping NPC load');
    return;
  }
  
  try {
    // Initialize NPCs for training ground via API
    const response = await fetch('/api/temp-npc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'init',
        sessionId,
        locationId: 'training_ground',
        config: 'training_ground',
        playerLevel,
      }),
    });
    
    const data = await response.json();
    
    if (data.success && data.npcs) {
      console.log(`[TrainingNPC] Loaded ${data.npcs.length} NPCs`);
      
      // Create sprites for each NPC
      for (const npcData of data.npcs) {
        createTrainingNPCSprite(scene, npcData);
      }
    } else {
      console.warn('[TrainingNPC] Failed to load NPCs:', data.error);
    }
  } catch (error) {
    console.error('[TrainingNPC] Error loading NPCs:', error);
  }
}

/**
 * Create sprite for training NPC
 */
function createTrainingNPCSprite(
  scene: Phaser.Scene,
  npcData: any
): TrainingNPC {
  // Random position around center - игрок может перемещаться
  const angle = Math.random() * Math.PI * 2;
  const distance = 200 + Math.random() * 300; // 200-500 pixels from center
  const x = WORLD_WIDTH / 2 + Math.cos(angle) * distance;
  const y = WORLD_HEIGHT / 2 + Math.sin(angle) * distance;
  
  const container = scene.add.container(x, y);
  container.setDepth(5);
  
  // NPC body (enemy color based on level)
  const levelColor = getLevelColor(npcData.level || 1);
  
  // Outer aura
  const aura = scene.add.circle(0, 0, 35, levelColor, 0.15);
  container.add(aura);
  
  // Body
  const body = scene.add.circle(0, 0, 22, 0xff6b6b, 0.9);
  body.setStrokeStyle(3, levelColor);
  container.add(body);
  
  // Direction indicator
  const direction = scene.add.triangle(28, 0, 0, -8, 0, 8, 12, levelColor, 0.8);
  container.add(direction);
  
  // Icon based on species
  const icon = scene.add.text(0, 0, getSpeciesIcon(npcData.speciesId), {
    fontSize: '18px',
  }).setOrigin(0.5);
  container.add(icon);
  
  // Name label
  const label = scene.add.text(0, 38, npcData.name, {
    fontSize: '11px',
    color: '#ffffff',
    fontFamily: 'Arial',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5);
  container.add(label);
  
  // Level indicator
  const levelText = scene.add.text(0, 52, `Ур. ${npcData.level}.${npcData.subLevel || 0}`, {
    fontSize: '9px',
    color: '#fbbf24',
    fontFamily: 'Arial',
  }).setOrigin(0.5);
  container.add(levelText);
  
  // HP bar background
  const hpBarBg = scene.add.graphics();
  hpBarBg.fillStyle(0x000000, 0.7);
  hpBarBg.fillRect(-25, -55, 50, 6);
  container.add(hpBarBg);
  
  // HP bar
  const hpBar = scene.add.graphics();
  container.add(hpBar);
  
  // Make interactive
  body.setInteractive({ useHandCursor: true });
  body.on('pointerover', () => {
    scene.tweens.add({ targets: container, scale: 1.15, duration: 150 });
  });
  body.on('pointerout', () => {
    scene.tweens.add({ targets: container, scale: 1, duration: 150 });
  });
  
  // Create NPC object
  const npc: TrainingNPC = {
    id: npcData.id,
    name: npcData.name,
    speciesId: npcData.speciesId || 'human',
    roleId: npcData.roleId || 'enemy',
    level: npcData.level || 1,
    subLevel: npcData.subLevel || 0,
    health: npcData.health || 100,
    maxHealth: npcData.health || 100,
    disposition: npcData.disposition || -50,
    aggressionLevel: npcData.aggressionLevel || 70,
    x,
    y,
    sprite: container,
    isAggro: (npcData.disposition || -50) < 0,
  };
  
  // Update HP bar
  updateTrainingNPCHPBar(npc, hpBar);
  
  // Store in global array
  globalTrainingNPCs.push(npc);
  
  // Pulsing animation
  scene.tweens.add({
    targets: aura,
    scale: { from: 1, to: 1.2 },
    alpha: { from: 0.15, to: 0.05 },
    duration: 2000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  
  return npc;
}

/**
 * Update HP bar for training NPC
 */
function updateTrainingNPCHPBar(npc: TrainingNPC, hpBar: Phaser.GameObjects.Graphics): void {
  hpBar.clear();
  const hpPercent = npc.health / npc.maxHealth;
  let color = 0x22c55e;
  if (hpPercent < 0.25) color = 0xef4444;
  else if (hpPercent < 0.5) color = 0xf97316;
  else if (hpPercent < 0.75) color = 0xeab308;
  
  hpBar.fillStyle(color);
  hpBar.fillRect(-24, -54, 48 * hpPercent, 4);
}

/**
 * Get color for level
 */
function getLevelColor(level: number): number {
  const colors: Record<number, number> = {
    1: 0x9ca3af, 2: 0x22c55e, 3: 0x3b82f6, 4: 0xa855f7,
    5: 0xf59e0b, 6: 0xec4899, 7: 0x06b6d4, 8: 0xfbbf24, 9: 0xffffff,
  };
  return colors[level] || 0x9ca3af;
}

/**
 * Get icon for species
 */
function getSpeciesIcon(speciesId: string): string {
  const icons: Record<string, string> = {
    human: '👤', elf: '🧝', demon_humanoid: '👹',
    beastkin: '🐺', wolf: '🐺', tiger: '🐅',
    dragon_beast: '🐉', ghost: '👻', beast: '🐗',
    abberation: '👾', spirit: '✨',
  };
  return icons[speciesId] || '👤';
}

// ============================================
// TECHNIQUE CHARGING SYSTEM
// ============================================

/**
 * Get effective conductivity from character
 * Использует ЕДИНУЮ функцию проводимости из conductivity-system.ts
 */
function getEffectiveConductivityLocal(): number {
  return getEffectiveConductivity(globalCharacter);
}

/**
 * Get core capacity from character (for charge time calculation)
 */
function getCoreCapacityLocal(): number {
  return getCoreCapacity(globalCharacter);
}

/**
 * Get cultivation level from character
 */
function getCultivationLevelLocal(): number {
  return getCultivationLevel(globalCharacter);
}

/**
 * Check if a slot is already charging
 */
function isSlotChargingLocal(slotIndex: number): boolean {
  return isSlotCharging(globalChargingTechniques, slotIndex);
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
    range: number | RangeData;
    type: string;
    element: string;
    qiCost: number;
    mastery?: number;
  },
  playerX: number,
  playerY: number
): boolean {
  // Check if already charging this slot
  if (isSlotChargingLocal(slotIndex)) {
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
  const coreCapacity = getCoreCapacityLocal();
  const cultivationLevel = getCultivationLevelLocal();
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
  return updateChargingTechniquesUtil(scene, globalChargingTechniques);
}

/**
 * Execute a fully charged technique
 * 
 * АРХИТЕКТУРА: Qi списывается через Event Bus в executeTechniqueInDirection
 * НЕ делаем прямой fetch — это нарушало бы архитектуру!
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
  
  // Execute technique through Event Bus (Qi will be deducted there)
  // ВАЖНО: передаём реальный qiCost, чтобы Event Bus списал Qi
  await executeTechniqueInDirection(
    scene,
    charging.techniqueId,
    {
      damage: charging.techniqueData.damage,
      range: charging.techniqueData.range,
      type: charging.techniqueData.type,
      element: charging.techniqueData.element,
      qiCost: charging.qiCost, // Event Bus спишет Qi
      coneAngle: charging.techniqueData.coneAngle,
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
  globalChargingTechniques = cancelChargingUtil(globalChargingTechniques, globalChargeBars, globalChargeTexts, slotIndex);
}

/**
 * Get charging progress for a slot (0-1, or 0 if not charging)
 */
function getChargingProgressLocal(slotIndex: number): number {
  return getChargingProgressUtil(globalChargingTechniques, slotIndex);
}

/**
 * Извлечь данные о дальности из effects техники или damageFalloff
 * Автоматически рассчитывает зоны урона если они не указаны явно
 */
function extractRangeData(
  effects: Record<string, unknown> | undefined,
  fallbackRange: number = 10,
  techniqueType?: string,
  damageFalloff?: { fullDamage?: number; halfDamage?: number; max?: number },
  bodyHeight?: number
): RangeData {
  // ПРИОРИТЕТ 1: Проверяем damageFalloff (основное поле для боевых техник)
  if (damageFalloff && typeof damageFalloff === 'object' && (damageFalloff.fullDamage || damageFalloff.halfDamage || damageFalloff.max)) {
    const maxRange = damageFalloff.max ?? fallbackRange;
    const effectiveMax = calculateEffectiveRange(maxRange, bodyHeight);
    return {
      fullDamage: calculateEffectiveRange(damageFalloff.fullDamage ?? maxRange * 0.5, bodyHeight),
      halfDamage: calculateEffectiveRange(damageFalloff.halfDamage ?? maxRange * 0.75, bodyHeight),
      max: effectiveMax,
    };
  }

  if (!effects) {
    const effectiveFallback = calculateEffectiveRange(fallbackRange, bodyHeight);
    return { fullDamage: effectiveFallback, halfDamage: effectiveFallback, max: effectiveFallback };
  }

  // ПРИОРИТЕТ 2: Если range это объект с зонами урона
  const range = effects.range as { fullDamage?: number; halfDamage?: number; max?: number } | undefined;

  if (range && typeof range === 'object' && (range.fullDamage || range.halfDamage || range.max)) {
    const maxRange = range.max ?? fallbackRange;
    return {
      fullDamage: calculateEffectiveRange(range.fullDamage ?? maxRange * 0.5, bodyHeight),
      halfDamage: calculateEffectiveRange(range.halfDamage ?? maxRange * 0.75, bodyHeight),
      max: calculateEffectiveRange(maxRange, bodyHeight),
    };
  }

  // ПРИОРИТЕТ 3: Если range это просто число - рассчитываем зоны автоматически
  const rangeValue = typeof effects.range === 'number' ? effects.range :
                     typeof effects.distance === 'number' ? effects.distance :
                     fallbackRange;
  
  // Применяем множитель размера тела к базовой дальности
  const effectiveRangeValue = calculateEffectiveRange(rangeValue, bodyHeight);

  // Для AOE техник - зоны урона шире (50% и 75% от максимальной дальности)
  if (techniqueType === 'ranged_aoe' || effects.combatType === 'ranged_aoe') {
    return {
      fullDamage: effectiveRangeValue * 0.5,   // 50% дальности = полный урон
      halfDamage: effectiveRangeValue * 0.75,  // 75% дальности = 50% урона
      max: effectiveRangeValue,
    };
  }

  // Для обычных ranged техник
  if (techniqueType?.startsWith('ranged_') || String(effects.combatType).startsWith('ranged_')) {
    return {
      fullDamage: effectiveRangeValue * 0.5,   // 50% дальности = полный урон
      halfDamage: effectiveRangeValue * 0.75,  // 75% дальности = 50% урона
      max: effectiveRangeValue,
    };
  }

  // Для melee техник - весь урон на всей дистанции
  return { fullDamage: effectiveRangeValue, halfDamage: effectiveRangeValue, max: effectiveRangeValue };
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

  // === ОТПРАВЛЯЕМ СОБЫТИЕ ЧЕРЕЗ ШИНУ ===
  if (qiCost > 0 && globalSessionId) {
    try {
      // Отправляем событие technique:use через шину
      const result = await eventBusClient.useTechnique(techniqueId);
      
      if (!result.success || !result.data?.canUse) {
        // Показываем сообщение об ошибке
        const errorText = scene.add.text(playerX, playerY - 40, result.data?.reason || result.error || 'Ошибка', {
          fontSize: '14px',
          fontFamily: 'Arial',
          color: '#ff4444',
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5).setDepth(200);
        
        scene.tweens.add({
          targets: errorText,
          y: playerY - 70,
          alpha: 0,
          duration: 1500,
          onComplete: () => errorText.destroy(),
        });
        return false;
      }
      
      // Получаем данные из ответа шины
      const { damageMultiplier, currentQi, finalDamage, element } = result.data;
      
      // Обновляем локальное состояние Qi из ответа сервера (единый источник истины)
      if (globalCharacter && currentQi !== undefined) {
        globalCharacter.currentQi = currentQi;
        console.log(`[Qi] Deducted ${qiCost} Qi via Event Bus. Remaining: ${currentQi}, damageMultiplier: ${damageMultiplier?.toFixed(2)}`);
      }
      
      // Сохраняем multiplier для использования в расчёте урона
      techniqueData.damage = finalDamage || techniqueData.damage;
      
    } catch (error) {
      console.error('Failed to send technique:use event:', error);
      return false;
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
  
  // === CHECK TRAINING NPCs ===
  for (const npc of globalTrainingNPCs) {
    const hitResult = checkAttackHit(
      playerX, playerY, playerRotation,
      npc.x, npc.y,
      coneAngle,
      fullDamageRange, halfDamageRange, maxRange,
      25 // NPC hitbox radius
    );
    
    if (hitResult.hit) {
      let finalDamage = Math.floor(damage * hitResult.damageMultiplier);
      
      // Crit check
      const isCrit = hitResult.damageZone === 'full' && Math.random() < 0.15;
      if (isCrit) {
        finalDamage = Math.floor(finalDamage * 1.5);
      }
      
      // Apply damage to NPC
      npc.health -= finalDamage;
      
      // Hit effect
      const hitColor = hitResult.damageZone === 'full' ? elementColor : 0xffffff;
      const hitEffect = scene.add.circle(npc.x, npc.y, 15, hitColor, 0.8);
      hitEffect.setDepth(200);
      scene.tweens.add({
        targets: hitEffect,
        scale: 2,
        alpha: 0,
        duration: 300,
        onComplete: () => hitEffect.destroy(),
      });
      
      // Damage number
      showDamageNumber(scene, npc.x, npc.y - 30, finalDamage, isCrit ? 'critical' : element);
      
      // Update NPC HP bar if exists
      if (npc.sprite) {
        const hpBar = npc.sprite.getAt(7) as Phaser.GameObjects.Graphics;
        if (hpBar && typeof hpBar.clear === 'function') {
          updateTrainingNPCHPBar(npc, hpBar);
        }
      }
      
      // Check if NPC is dead
      if (npc.health <= 0) {
        // Respawn after delay
        scene.time.delayedCall(3000, () => {
          npc.health = npc.maxHealth;
          if (npc.sprite) {
            const hpBar = npc.sprite.getAt(7) as Phaser.GameObjects.Graphics;
            if (hpBar && typeof hpBar.clear === 'function') updateTrainingNPCHPBar(npc, hpBar);
          }
        });
      }
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
    
    // Initialize SpriteLoader for effects
    globalSpriteLoader = new SpriteLoader(scene);
    
    // Get cultivation level for sprite colors
    const cultivationLevel = globalCharacter?.cultivationLevel || 1;
    
    // === SIMPLIFIED 2-DIRECTION SPRITE SYSTEM ===
    // Create all player animations (idle, walk, attack) - 1 direction only
    // Second direction is achieved via flipX
    createAllPlayerAnimations(scene, cultivationLevel);
    
    // Load effect sprites (Qi glow, breakthrough, meditation)
    try {
      globalSpriteLoader.loadEffectSprites();
    } catch (error) {
      console.warn('Failed to load effect sprites:', error);
    }
    
    // Create target texture
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
    globalTrainingNPCs = []; // Reset NPCs on scene create
    globalGameScene = scene; // Store scene for later use

    // Create world bounds
    scene.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Create tiled ground - only for visible area around center
    // Full world is too large to render all tiles
    const groundRadius = 3000; // 3000 pixels = ~94 meters around center
    const centerX = WORLD_WIDTH / 2;
    const centerY = WORLD_HEIGHT / 2;
    for (let x = centerX - groundRadius; x < centerX + groundRadius; x += 64) {
      for (let y = centerY - groundRadius; y < centerY + groundRadius; y += 64) {
        scene.add.image(x + 32, y + 32, 'ground').setOrigin(0.5);
      }
    }

    // World border visual (around visible area)
    const border = scene.add.graphics();
    border.lineStyle(4, 0x4ade80, 0.8);
    border.strokeRect(centerX - groundRadius, centerY - groundRadius, groundRadius * 2, groundRadius * 2);

    // === ENVIRONMENT SYSTEM ===
    // Initialize environment manager with presets (async, then generate)
    globalEnvironmentManager = new EnvironmentManager(scene);
    
    // Use async IIFE to wait for initialization
    (async () => {
      await globalEnvironmentManager.initialize(
        ROCK_PRESETS,
        TREE_PRESETS,
        ORE_PRESETS,
        BUILDING_PART_PRESETS
      );
      
      // Generate test polygon environment after initialization
      const envConfig = createDefaultTestPolygonConfig();
      // Scale config - generate objects in a 200m x 200m area around center
      const visibleAreaMeters = Math.floor(groundRadius * 2 / METERS_TO_PIXELS);
      envConfig.width = visibleAreaMeters;
      envConfig.height = visibleAreaMeters;
      // Offset to center of the world (in meters)
      envConfig.offsetX = Math.floor(centerX / METERS_TO_PIXELS) - visibleAreaMeters / 2;
      envConfig.offsetY = Math.floor(centerY / METERS_TO_PIXELS) - visibleAreaMeters / 2;
      // Proportional object count for larger area
      envConfig.rocks = Math.floor(visibleAreaMeters * 0.3);  // ~30 rocks per 100m
      envConfig.trees = Math.floor(visibleAreaMeters * 0.5);   // ~50 trees per 100m
      envConfig.ores = Math.floor(visibleAreaMeters * 0.15);   // ~15 ores per 100m
      envConfig.buildings = Math.floor(visibleAreaMeters * 0.1); // ~10 buildings per 100m
      
      const envResult = globalEnvironmentManager.generateTestPolygon(envConfig);
      console.log('[GameScene] Environment generated:', envResult);
    })();

    // === CREATE PLAYER ANIMATION DEFINITIONS ===
    createPlayerAnimationDefs(scene);

    // Create player with simplified 2-direction system
    // Uses flipX for right direction, original for left
    const player = scene.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 100, 'player_idle');
    player.setCollideWorldBounds(true);
    player.setDepth(10);
    
    // Play idle animation by default
    player.play('player_idle_anim');
    
    // Scale up the player for better visibility
    player.setScale(1.5);
    
    // Store player facing direction for flipX logic
    scene.data.set('playerFacingRight', false);

    // === QI AURA ===
    // Create dynamic Qi aura around player based on cultivation level
    const createQiAura = () => {
      if (globalQiAura) {
        globalQiAura.destroy();
      }
      
      const char = globalCharacter;
      const level = char?.cultivationLevel || 1;
      const currentQi = char?.currentQi || 0;
      const maxQi = char?.coreCapacity || 100;
      
      if (globalSpriteLoader) {
        globalQiAura = globalSpriteLoader.createQiAura(
          player.x,
          player.y,
          level,
          currentQi,
          maxQi
        );
        globalQiAura.setDepth(8); // Below player
      }
    };
    
    // Initial aura creation
    createQiAura();
    scene.data.set('createQiAura', createQiAura);

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
    
    // === LOAD TRAINING NPCs ===
    // NPC загружаются через useEffect когда sessionId становится доступен
    // См. "Training Ground NPCs Loading" ниже в компоненте

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

    // Mouse movement for direction (uses flipX for 2-direction system)
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isChatFocused) return;
      
      // Get world position of mouse
      const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      
      // Calculate angle from player to mouse
      const dx = worldPoint.x - player.x;
      const dy = worldPoint.y - player.y;
      globalPlayerRotation = Math.atan2(dy, dx) * 180 / Math.PI;
      
      // === 2-DIRECTION SYSTEM: flipX ===
      // Left side (West) = original sprite (flipX = false)
      // Right side (East) = flipped sprite (flipX = true)
      const shouldFlip = shouldFlipSprite(globalPlayerRotation);
      player.setFlipX(shouldFlip);
      scene.data.set('playerFacingRight', shouldFlip);
      
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
                equipped.technique.damageFalloff as { fullDamage?: number; halfDamage?: number; max?: number } | undefined,
                globalCharacter?.bodyHeight
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

    // Inventory toggle (I key) - запускает InventoryScene как overlay
    scene.input.keyboard?.on('keydown-I', () => {
      if (!isChatFocused) {
        // Проверяем, открыта ли уже сцена инвентаря
        if (scene.scene.isActive('InventoryScene')) {
          scene.scene.stop('InventoryScene');
        } else {
          scene.scene.launch('InventoryScene');
        }
      }
    });

    // ESC to close inventory (только если открыт инвентарь)
    scene.input.keyboard?.on('keydown-ESC', () => {
      if (scene.scene.isActive('InventoryScene')) {
        scene.scene.stop('InventoryScene');
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
              equipped.technique.damageFalloff as { fullDamage?: number; halfDamage?: number; max?: number } | undefined,
              globalCharacter?.bodyHeight
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
                range: 2, // 2 meters - realistic hand reach
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

    // === DEBUG MODE ===
    globalDebugGraphics = scene.add.graphics();
    globalDebugGraphics.setDepth(1000);
    
    const toggleDebug = () => {
      globalDebugMode = !globalDebugMode;
      if (!globalDebugMode && globalDebugGraphics) {
        globalDebugGraphics.clear();
      }
      console.log(`[GameScene] Debug mode: ${globalDebugMode ? 'ON' : 'OFF'}`);
    };
    
    scene.input.keyboard?.on('keydown-P', toggleDebug);
    scene.input.keyboard?.on('keydown-BACKTICK', toggleDebug);
    console.log('[GameScene] Debug mode available (press P or `)');
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

    // === ENVIRONMENT COLLISION ===
    // Check collision with environment objects
    if (globalEnvironmentManager && (velocityX !== 0 || velocityY !== 0)) {
      const nextX = player.x + velocityX * 0.016; // Approximate next position
      const nextY = player.y + velocityY * 0.016;
      
      const collision = globalEnvironmentManager.checkCollisionAt(nextX, nextY, PLAYER_HITBOX_RADIUS);
      if (collision) {
        // Block movement by zeroing velocity
        // Or slide along the obstacle
        const dx = nextX - collision.sprite.x;
        const dy = nextY - collision.sprite.y;
        
        // Determine which axis to block
        if (Math.abs(dx) > Math.abs(dy)) {
          player.setVelocityX(0);
        } else {
          player.setVelocityY(0);
        }
      }
    }

    // === UPDATE QI AURA ===
    // Update aura position to follow player
    // Also recreate aura if cultivation level changed (throttled check)
    const currentCultivationLevel = globalCharacter?.cultivationLevel || 1;
    if (globalQiAura) {
      globalQiAura.setPosition(player.x, player.y);
      
      // Проверяем изменение уровня культивации (только раз в 60 кадров для оптимизации)
      if (currentCultivationLevel !== globalLastCultivationLevel) {
        globalLastCultivationLevel = currentCultivationLevel;
        // Пересоздаём ауру при изменении уровня
        const createQiAura = scene.data.get('createQiAura') as (() => void) | undefined;
        if (createQiAura) {
          createQiAura();
        }
      }
    }

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

    // === DISTANCE TO NEAREST TARGET AND ENVIRONMENT OBJECTS (in meters) ===
    // Distance calculated from player center to target center (centerY = torso area)
    // Effective distance = distance to center - hitbox radius (distance to edge of hitbox)
    let nearestDistance = Infinity;
    let nearestInFront: number | null = null;
    let nearestHitboxRadius = 0;
    let nearestObjectName = '';
    
    // Check training targets
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
        nearestObjectName = 'Чучело';
        
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
    
    // Check environment objects (trees, rocks, ores, buildings)
    if (globalEnvironmentManager) {
      const envObjects = globalEnvironmentManager.getAllObjects();
      for (const envObj of envObjects) {
        const dx = envObj.sprite.x - player.x;
        const dy = envObj.sprite.y - player.y;
        const distPixels = Math.sqrt(dx * dx + dy * dy);
        const distMeters = distPixels / METERS_TO_PIXELS;
        const envHitboxMeters = 0.9; // ~30 pixels radius for environment objects
        
        if (distMeters < nearestDistance) {
          nearestDistance = distMeters;
          nearestHitboxRadius = envHitboxMeters;
          
          // Get object name from preset
          const preset = envObj.preset as { name?: string; id?: string };
          nearestObjectName = preset?.name || envObj.presetId || envObj.presetType;
          
          // Check if object is in front of player (within 90 degree cone)
          const angleToTarget = Math.atan2(dy, dx) * 180 / Math.PI;
          const playerAngleDeg = ((globalPlayerRotation % 360) + 360) % 360;
          let angleDiff = Math.abs(angleToTarget - playerAngleDeg);
          if (angleDiff > 180) angleDiff = 360 - angleDiff;
          
          if (angleDiff <= 45) {
            nearestInFront = distMeters;
          }
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
        distanceTextEl.setText(`📏 ${nearestObjectName}: ${effectiveDistance.toFixed(1)}м ${inRange ? '✓' : '⚠️'}`);
        distanceTextEl.setColor(inRange ? '#4ade80' : '#fbbf24');
      } else if (nearestDistance < Infinity) {
        const effectiveDistance = Math.max(0, nearestDistance - nearestHitboxRadius);
        distanceTextEl.setText(`📏 ${nearestObjectName}: ${effectiveDistance.toFixed(1)}м`);
        distanceTextEl.setColor('#9ca3af');
      } else {
        distanceTextEl.setText('📏 Объектов нет');
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

    // === DEBUG MODE RENDER ===
    if (globalDebugMode) {
      drawDebugHitboxes(scene, player);
    }
  }
};

// ============================================
// DEBUG FUNCTIONS
// ============================================

function drawDebugHitboxes(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite): void {
  if (!globalDebugGraphics) return;
  
  globalDebugGraphics.clear();
  
  // Player hitbox (green)
  globalDebugGraphics.lineStyle(2, 0x00ff00);
  globalDebugGraphics.strokeCircle(player.x, player.y, PLAYER_HITBOX_RADIUS);
  
  // Player center (yellow)
  globalDebugGraphics.fillStyle(0xffff00, 0.5);
  globalDebugGraphics.fillCircle(player.x, player.y, 3);
  
  // Targets hitboxes (cyan)
  for (const target of globalTargets) {
    globalDebugGraphics.lineStyle(2, 0x00ffff);
    globalDebugGraphics.strokeCircle(target.x, target.centerY, target.hitboxRadius);
    globalDebugGraphics.fillStyle(0x00ffff, 0.3);
    globalDebugGraphics.fillCircle(target.x, target.centerY, 2);
  }
  
  // Training NPCs hitboxes (red for enemies, yellow for neutral)
  for (const npc of globalTrainingNPCs) {
    const color = npc.disposition < 0 ? 0xff0000 : 0xffff00;
    globalDebugGraphics.lineStyle(2, color);
    globalDebugGraphics.strokeCircle(npc.x, npc.y, 25);
    globalDebugGraphics.fillStyle(color, 0.3);
    globalDebugGraphics.fillCircle(npc.x, npc.y, 2);
  }
  
  // Debug info panel
  globalDebugGraphics.fillStyle(0x000000, 0.7);
  globalDebugGraphics.fillRect(10, 10, 220, 80);
  globalDebugGraphics.lineStyle(1, 0x4ade80);
  globalDebugGraphics.strokeRect(10, 10, 220, 80);
  
  const infoText = scene.add.text(15, 15, [
    `Player: (${Math.round(player.x)}, ${Math.round(player.y)})`,
    `Targets: ${globalTargets.length}`,
    `NPCs: ${globalTrainingNPCs.length}`,
    `Projectiles: ${globalChargingTechniques.length}`,
    `Debug: Press P or \`${globalDebugMode ? 'ON' : 'OFF'}`,
  ].join('\n'), {
    fontSize: '11px',
    color: '#4ade80',
    fontFamily: 'monospace',
  });
  
  // Remove text after this frame
  scene.time.delayedCall(16, () => infoText.destroy());
}

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
  const inventory = useGameInventory();
  const { loadState, sendMessage, loadInventory } = useGameActions();

  // === React State Bridge ===
  // Используем useRef для хранения предыдущих значений, чтобы избежать лишних обновлений
  const prevCharacterRef = useRef<Character | null>(null);
  const prevTechniquesRef = useRef<CharacterTechnique[] | null>(null);
  const npcsLoadedRef = useRef(false);
  
  // Обновляем глобальные переменные только при реальном изменении данных
  // Это предотвращает лишние ре-рендеры React
  useEffect(() => { globalSessionId = sessionId; }, [sessionId]);
  
  // === Training Ground NPCs Loading ===
  // Загружаем NPC для Training Ground когда sessionId становится доступен
  // Используем интервал для проверки готовности сцены (Phaser создаётся асинхронно)
  useEffect(() => {
    console.log('[TrainingNPC] useEffect triggered, sessionId:', sessionId, 'npcsLoadedRef:', npcsLoadedRef.current);
    
    if (!sessionId || npcsLoadedRef.current) {
      console.log('[TrainingNPC] Skipping - no sessionId or already loaded');
      return;
    }
    
    const checkAndLoad = () => {
      console.log('[TrainingNPC] Checking scene, globalGameScene:', !!globalGameScene);
      if (globalGameScene && !npcsLoadedRef.current) {
        npcsLoadedRef.current = true;
        const playerLevel = globalCharacter?.cultivationLevel || 1;
        console.log('[TrainingNPC] Loading NPCs for session:', sessionId, 'playerLevel:', playerLevel);
        loadTrainingNPCs(globalGameScene, sessionId, playerLevel);
        return true;
      }
      return false;
    };
    
    // Пробуем сразу
    if (checkAndLoad()) return;
    
    console.log('[TrainingNPC] Scene not ready, starting interval...');
    
    // Если не получилось, ждём с интервалом
    const interval = setInterval(() => {
      if (checkAndLoad()) {
        clearInterval(interval);
      }
    }, 100);
    
    // Таймаут через 5 секунд
    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.warn('[TrainingNPC] Timeout waiting for game scene');
    }, 5000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [sessionId]);
  
  useEffect(() => {
    // Проверяем, действительно ли изменился character (глубокое сравнение ключевых полей)
    if (character && prevCharacterRef.current) {
      const prev = prevCharacterRef.current;
      const hasRealChange = 
        character.id !== prev.id ||
        character.cultivationLevel !== prev.cultivationLevel ||
        character.currentQi !== prev.currentQi ||
        character.health !== prev.health ||
        character.fatigue !== prev.fatigue;
      
      if (!hasRealChange) return; // Пропускаем обновление если данных не изменились
    }
    prevCharacterRef.current = character;
    globalCharacter = character;
  }, [character]);
  
  useEffect(() => {
    // Пропускаем если техники не изменились (сравниваем id И quickSlot)
    if (techniques && prevTechniquesRef.current) {
      const currentKeys = techniques.map(t => `${t.id}:${t.quickSlot}`).sort();
      const prevKeys = prevTechniquesRef.current.map(t => `${t.id}:${t.quickSlot}`).sort();
      if (JSON.stringify(currentKeys) === JSON.stringify(prevKeys)) {
        return;
      }
    }
    prevTechniquesRef.current = techniques;
    globalTechniques = techniques;
  }, [techniques]);
  
  useEffect(() => { globalMessages = messages || []; }, [messages]);
  useEffect(() => { globalWorldTime = worldTime; }, [worldTime]);
  
  // === Inventory Sync ===
  // Синхронизация инвентаря между React и Phaser
  useEffect(() => {
    // Set up inventory getter for InventoryScene
    setInventoryGetter(() => globalInventory);
    
    if (inventory && inventory.length > 0) {
      globalInventory = inventory as PhaserInventoryItem[];
      console.log('[Inventory] Synced to Phaser:', inventory.length, 'items');
    } else {
      globalInventory = [];
    }
  }, [inventory]);
  
  // === Слушатель событий инвентаря от Phaser (через Event Bus) ===
  // Phaser отправляет window event 'inventory:changed' после успешного действия
  useEffect(() => {
    const handleInventoryChanged = (event: CustomEvent) => {
      const { action, itemId } = event.detail || {};
      console.log('[Inventory] Phaser event received:', action, itemId);
      // Перезагружаем инвентарь из БД
      loadInventory();
    };
    
    window.addEventListener('inventory:changed', handleInventoryChanged as EventListener);
    
    return () => {
      window.removeEventListener('inventory:changed', handleInventoryChanged as EventListener);
    };
  }, [loadInventory]);
  
  // Qi Aura обновляется внутри Phaser update loop, а не через React useEffect
  // Это предотвращает ре-рендеры React при каждом изменении Qi
  
  // Инициализация клиента шины для связи с сервером
  useEffect(() => {
    if (sessionId && character?.id) {
      eventBusClient.initialize(sessionId, character.id);
      console.log('[PhaserGame] EventBus client initialized:', { sessionId, characterId: character.id });
    }
    return () => {
      eventBusClient.reset();
    };
  }, [sessionId, character?.id]);

  // === ПЕРИОДИЧЕСКОЕ ОБНОВЛЕНИЕ ИНВЕНТАРЯ (каждые 30 секунд) ===
  // Уменьшена частота для предотвращения лишних ре-рендеров
  useEffect(() => {
    if (!character?.id) return;
    
    // Загружаем инвентарь каждые 30 секунд (раньше было 10)
    const intervalId = setInterval(() => {
      loadInventory();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [character?.id, loadInventory]);

  const handleMovement = useCallback(async (tilesMoved: number) => {
    if (!sessionId) return;
    try {
      // === ИСПОЛЬЗУЕМ EVENT BUS ВМЕСТО ПРЯМОГО FETCH ===
      // Это обеспечивает единую точку входа для всех событий
      const result = await eventBusClient.move(tilesMoved);
      
      // === ОПТИМИЗАЦИЯ: НЕ вызываем loadState() ===
      // Вместо этого обновляем только глобальные переменные Phaser
      // Это предотвращает React ре-рендер
      
      if (result.success && result.data) {
        // Обновляем глобальное время
        if (result.data.worldTime) {
          globalWorldTime = {
            year: result.data.worldTime.year,
            month: result.data.worldTime.month,
            day: result.data.worldTime.day,
            hour: result.data.worldTime.hour,
            minute: result.data.worldTime.minute,
          };
        }
        
        // Обновляем Qi в глобальном персонаже (если изменилось)
        if (result.data.qiEffects && globalCharacter) {
          globalCharacter.currentQi = result.data.qiEffects.finalQi;
        }
        
        // Обновляем accumulatedQi если есть
        if (result.data.character?.accumulatedQi !== undefined && globalCharacter) {
          globalCharacter.accumulatedQi = result.data.character.accumulatedQi;
        }
        
        // TruthSystem уже обновил состояние в памяти на сервере
        // React компоненты обновятся при следующем открытии диалогов
      }
    } catch (err) {
      console.error('Movement sync error:', err);
    }
  }, [sessionId]); // Убрана зависимость loadState

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

    let destroyed = false;

    const initGame = async () => {
      try {
        const PhaserModule = await import('phaser');
        const Phaser = PhaserModule.default;

        // Check if component was unmounted during async import
        if (destroyed || !containerRef.current) return;

        const container = containerRef.current;
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
          scene: [GameSceneConfig, InventorySceneConfig],
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
      destroyed = true;
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
