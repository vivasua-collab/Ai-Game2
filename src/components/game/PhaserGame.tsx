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
 * Create player texture with direction indicator
 */
function createPlayerTexture(scene: Phaser.Scene): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  const size = PLAYER_SIZE;
  const cx = size + 8;
  const cy = size + 8;

  // Body (circle)
  graphics.fillStyle(0x4ade80);
  graphics.fillCircle(cx, cy, size);
  
  // Inner circle (darker)
  graphics.fillStyle(0x22c55e);
  graphics.fillCircle(cx, cy, size * 0.6);
  
  // Direction indicator (arrow pointing right by default)
  graphics.fillStyle(0xFFFFFF);
  graphics.beginPath();
  graphics.moveTo(cx + size + 4, cy);        // Tip of arrow
  graphics.lineTo(cx + size - 6, cy - 6);    // Top corner
  graphics.lineTo(cx + size - 6, cy + 6);    // Bottom corner
  graphics.closePath();
  graphics.fillPath();

  graphics.generateTexture('player', size * 2 + 16, size * 2 + 16);
  graphics.destroy();
}

/**
 * Create target (straw dummy) texture
 */
function createTargetTexture(scene: Phaser.Scene): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  const size = 32;

  // Post (vertical pole)
  graphics.fillStyle(0x8B4513);
  graphics.fillRect(size / 2 - 3, 0, 6, size * 2);

  // Body (straw bundle)
  graphics.fillStyle(0xDAA520);
  graphics.fillCircle(size / 2, size * 0.5, size * 0.6);
  
  // Head
  graphics.fillStyle(0xDEB887);
  graphics.fillCircle(size / 2, size * 0.15, size * 0.25);

  // Arms (horizontal bar)
  graphics.fillStyle(0x8B4513);
  graphics.fillRect(0, size * 0.5, size, 4);

  graphics.generateTexture('target', size, size * 2);
  graphics.destroy();
}

/**
 * Create a training target
 */
function createTarget(scene: Phaser.Scene, x: number, y: number, id: string): TrainingTarget {
  const container = scene.add.container(x, y);
  container.setDepth(5);

  // Target sprite
  const sprite = scene.add.image(0, 16, 'target');
  container.add(sprite);

  // HP bar background
  const hpBarBg = scene.add.graphics();
  hpBarBg.fillStyle(0x000000, 0.7);
  hpBarBg.fillRect(-20, -20, 40, 6);
  container.add(hpBarBg);

  // HP bar
  const hpBar = scene.add.graphics();
  container.add(hpBar);

  // Target label
  const label = scene.add.text(0, -35, 'Соломенное чучело', {
    fontSize: '10px',
    color: '#fbbf24',
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
  const barWidth = 38 * hpPercent;
  
  // Color based on HP
  let color = 0x22c55e; // Green
  if (hpPercent < 0.25) color = 0xef4444; // Red
  else if (hpPercent < 0.5) color = 0xf97316; // Orange
  else if (hpPercent < 0.75) color = 0xeab308; // Yellow

  target.hpBar.fillStyle(color);
  target.hpBar.fillRect(-19, -19, barWidth, 4);
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
  
  const text = scene.add.text(x, y - 20, damage.toString(), {
    fontSize: isCrit ? '20px' : '16px',
    fontFamily: 'Arial',
    color: color,
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5).setDepth(200);

  const damageNum: DamageNumber = {
    id: `dmg_${Date.now()}_${Math.random()}`,
    x,
    y: y - 20,
    damage,
    type,
    text,
    createdAt: Date.now(),
  };

  globalDamageNumbers.push(damageNum);

  // Animate: float up and fade
  scene.tweens.add({
    targets: text,
    y: y - 60,
    alpha: 0,
    scale: isCrit ? 1.5 : 1.2,
    duration: 1000,
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

  // Show damage number
  showDamageNumber(scene, target.x, target.y - 30, damage, type);

  // Flash effect
  if (target.sprite) {
    const sprite = target.sprite.getAt(0) as Phaser.GameObjects.Image;
    if (sprite && sprite.setTint) {
      sprite.setTint(0xff0000);
      scene.time.delayedCall(100, () => {
        sprite.clearTint();
      });
    }
  }

  // Reset if destroyed
  if (target.hp <= 0) {
    scene.time.delayedCall(500, () => {
      target.hp = target.maxHp;
      updateTargetHpBar(target);
      showDamageNumber(scene, target.x, target.y - 30, 0, 'healing');
      
      // Respawn message
      if (target.sprite) {
        const label = target.sprite.getAt(3) as Phaser.GameObjects.Text;
        if (label) {
          const originalText = label.text;
          label.setText('Восстановлено!');
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

  // Visual effect: beam/projectile
  const beamLength = range;
  const rad = playerRotation * Math.PI / 180;
  const endX = playerX + Math.cos(rad) * beamLength;
  const endY = playerY + Math.sin(rad) * beamLength;

  // Draw beam
  const beam = scene.add.graphics();
  beam.lineStyle(3, 0x4ade80, 0.8);
  beam.beginPath();
  beam.moveTo(playerX, playerY);
  beam.lineTo(endX, endY);
  beam.strokePath();
  beam.setDepth(15);

  // Fade out beam
  scene.tweens.add({
    targets: beam,
    alpha: 0,
    duration: 300,
    onComplete: () => beam.destroy(),
  });

  // Check each target
  for (const target of globalTargets) {
    if (isInAttackCone(playerX, playerY, playerRotation, target.x, target.y, 60, range)) {
      // Hit!
      const isCrit = Math.random() < 0.1; // 10% crit chance
      const finalDamage = isCrit ? Math.floor(damage * 1.5) : damage;
      
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
        const slotKey = String(i + 1);

        const slotBg = scene.add.rectangle(x, slotsY, slotSize, slotSize,
          isAvailable ? (equipped ? 0x22c55e : 0x1e293b) : 0x0f172a, 1
        );
        slotBg.setStrokeStyle(2, isAvailable ? (equipped ? 0x22c55e : 0x4ade80) : 0x334155);
        combatSlotsContainer.add(slotBg);
        slotBackgrounds.push(slotBg);

        const keyLabel = scene.add.text(x, slotsY - slotSize / 2 - 8, slotKey, {
          fontSize: '10px',
          color: isAvailable ? '#9ca3af' : '#475569',
        }).setOrigin(0.5);
        combatSlotsContainer.add(keyLabel);

        const icon = equipped ? (equipped.technique.element === 'fire' ? '🔥' : 
                       equipped.technique.element === 'water' ? '💧' :
                       equipped.technique.element === 'earth' ? '🪨' :
                       equipped.technique.element === 'air' ? '💨' :
                       equipped.technique.element === 'lightning' ? '⚡' : '⚔️') : '';
        
        const slotContent = scene.add.text(x, slotsY, icon, {
          fontSize: '18px',
        }).setOrigin(0.5);
        combatSlotsContainer.add(slotContent);

        if (isAvailable && equipped) {
          slotBg.setInteractive();
          slotBg.on('pointerdown', () => {
            useTechniqueInDirection(
              scene,
              equipped.techniqueId,
              {
                damage: equipped.technique.effects?.damage || 15,
                range: equipped.technique.effects?.distance || 2,
                type: equipped.technique.type,
                element: equipped.technique.element,
              },
              player.x,
              player.y,
              globalPlayerRotation
            );
            
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

    // Combat slot keys
    COMBAT_SLOT_KEYS.slice(0, 6).forEach((keyName, index) => {
      const keyCode = Phaser.Input.Keyboard.KeyCodes[keyName as keyof typeof Phaser.Input.Keyboard.KeyCodes];
      scene.input.keyboard?.on(`keydown-${keyCode}`, () => {
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
            useTechniqueInDirection(
              scene,
              equipped.techniqueId,
              {
                damage: equipped.technique.effects?.damage || 15,
                range: equipped.technique.effects?.distance || 2,
                type: equipped.technique.type,
                element: equipped.technique.element,
              },
              player.x,
              player.y,
              globalPlayerRotation
            );

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
