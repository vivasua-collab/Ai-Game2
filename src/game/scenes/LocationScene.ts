/**
 * LocationScene - NPC Location with Player Movement
 * 
 * Features:
 * - 8-direction player sprites (like training ground)
 * - WASD movement + mouse aiming
 * - Training targets with HP
 * - NPC interactions with directional sprites
 * - Camera following player
 * - Integrated game menu (Status, Rest, Techniques, Inventory)
 * - AI behavior for NPCs (patrol, chase, attack, flee)
 * 
 * Graphics: Uses same system as Training Ground (SpriteLoader)
 */

import * as Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { DEPTHS } from '../constants';
import { SpriteLoader, createDirectionalSpritesheet, angleToDirectionFrame, DIRECTION_FRAMES } from '../services/sprite-loader';
import { getCultivationTheme } from '../config/sprites.config';
import type { NPCMoveEvent, NPCAttackPlayerEvent } from '@/lib/game/events/game-events';
import { 
  calculateHandAttack, 
  canAttack, 
  type HandAttackResult 
} from '@/lib/game/hand-combat';
import { eventBusClient } from '@/lib/game/event-bus/client';

// ==================== CONSTANTS ====================

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;
const PLAYER_SPEED = 200;
const PLAYER_SIZE = 24;
const METERS_TO_PIXELS = 32;
const TARGET_HITBOX_RADIUS = 22;
const NPC_COLLISION_RADIUS = 25;  // Collision radius for NPCs
const PLAYER_COLLISION_RADIUS = 15;  // Collision radius for player

// ==================== TYPES ====================

interface LocationNPC {
  id: string;
  name: string;
  title?: string;
  cultivationLevel: number;
  cultivationSubLevel: number;
  speciesId: string;
  roleId: string;
  disposition: number;
  x: number;
  y: number;
  hitboxRadius: number;  // Collision radius
  hp: number;            // Current HP
  maxHp: number;         // Max HP
  sprite?: Phaser.GameObjects.Container;
  directionalSprite?: Phaser.GameObjects.Sprite;
}

interface TrainingTarget {
  id: string;
  x: number;
  y: number;
  centerY: number;
  hitboxRadius: number;
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

interface LocationSceneData {
  locationId: string;
  locationName?: string;
  sessionId?: string;
}

// Cultivation level colors
const LEVEL_COLORS: Record<number, number> = {
  1: 0x9ca3af, 2: 0x22c55e, 3: 0x3b82f6, 4: 0xa855f7,
  5: 0xf59e0b, 6: 0xec4899, 7: 0x06b6d4, 8: 0xfbbf24, 9: 0xffffff,
};

const DAMAGE_COLORS: Record<string, string> = {
  normal: '#FFFFFF', critical: '#FF4444', fire: '#FF8844',
  water: '#4488FF', earth: '#886644', air: '#CCCCCC',
  lightning: '#FFFF44', void: '#9944FF', healing: '#44FF44',
};

// ==================== SCENE CLASS ====================

export class LocationScene extends BaseScene {
  private locationId: string = '';
  private locationName: string = '';
  private sessionId: string = '';
  
  // Graphics system
  private spriteLoader!: SpriteLoader;
  private cultivationLevel: number = 1;
  
  // Player
  private player!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private qiAura!: Phaser.GameObjects.Container;
  private playerX: number = 0;
  private playerY: number = 0;
  private playerRotation: number = 0;
  private playerDirection: number = 0; // Frame index (0-7)
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  
  // Combat system
  private lastAttackTime: number = 0;
  private characterStats: { strength: number; agility: number } = { strength: 10, agility: 10 };
  
  // NPCs & Targets
  private npcs: Map<string, LocationNPC> = new Map();
  private npcSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private targets: TrainingTarget[] = [];
  private damageNumbers: DamageNumber[] = [];
  
  // AI System
  private aiUpdateTimer: number = 0;
  private aiUpdateInterval: number = 100; // 10 FPS for AI
  private npcStates: Map<string, 'idle' | 'patrol' | 'chase' | 'attack' | 'flee'> = new Map();
  
  // UI
  private selectedNPC: LocationNPC | null = null;
  private tooltipContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'LocationScene' });
  }

  init(data: LocationSceneData): void {
    this.locationId = data.locationId || '';
    this.locationName = data.locationName || 'Unknown Location';
    this.sessionId = data.sessionId || '';
    this.npcs.clear();
    this.npcSprites.clear();
    this.targets = [];
    this.damageNumbers = [];
    this.selectedNPC = null;
    this.lastAttackTime = 0;
  }

  async create(): Promise<void> {
    console.log('[LocationScene] Creating scene...');
    
    // Get cultivation level from global state
    this.cultivationLevel = this.getCultivationLevelFromStorage();
    
    // Initialize sprite loader
    this.spriteLoader = new SpriteLoader(this);
    
    // Create directional spritesheet (same as training ground)
    createDirectionalSpritesheet(this, this.cultivationLevel);
    
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.fadeIn(300);
    
    this.createBackground();
    this.createPlayer();
    this.createTrainingTargets();
    await this.loadNPCs();
    await this.loadCharacterStats();
    this.setupInput();
    this.setupAI();
    this.createUI();
    
    console.log('[LocationScene] Scene ready with directional sprites and AI');
  }

  // Updated: 2026-03-11 12:05 - Removed localStorage (sandbox restriction)
  // Returns default cultivation level (data should come from server via GameBridge)
  private getCultivationLevelFromStorage(): number {
    // No longer using localStorage - return default
    // Real data should be fetched from server via GameBridge or passed in scene data
    return 1;
  }

  /**
   * Load character stats from server via Event Bus
   */
  private async loadCharacterStats(): Promise<void> {
    try {
      // Initialize EventBusClient if we have session
      if (this.sessionId) {
        // Get characterId from bridge or storage
        const characterId = localStorage.getItem('characterId');
        if (characterId) {
          eventBusClient.initialize(this.sessionId, characterId);
        }
      }
      
      // Try to get stats from API
      const response = await fetch('/api/character/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.character) {
          this.characterStats = {
            strength: data.character.strength || 10,
            agility: data.character.agility || 10,
          };
          console.log('[LocationScene] Loaded character stats:', this.characterStats);
        }
      }
    } catch (error) {
      console.warn('[LocationScene] Failed to load character stats, using defaults:', error);
    }
  }

  // ==================== BACKGROUND ====================

  private createBackground(): void {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    
    const graphics = this.add.graphics();
    for (let i = 0; i < WORLD_HEIGHT; i++) {
      const alpha = 0.95 - (i / WORLD_HEIGHT) * 0.3;
      graphics.fillStyle(0x0f172a, alpha);
      graphics.fillRect(0, i, WORLD_WIDTH, 1);
    }
    
    this.createGroundPattern();
    this.createAtmosphere();
    
    const boundsGraphics = this.add.graphics();
    boundsGraphics.lineStyle(3, 0x4a4a5e, 0.5);
    boundsGraphics.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  private createGroundPattern(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x1e293b, 0.5);
    const gridSize = 64;
    
    for (let x = 0; x < WORLD_WIDTH; x += gridSize) {
      graphics.beginPath();
      graphics.moveTo(x, 0);
      graphics.lineTo(x, WORLD_HEIGHT);
      graphics.strokePath();
    }
    for (let y = 0; y < WORLD_HEIGHT; y += gridSize) {
      graphics.beginPath();
      graphics.moveTo(0, y);
      graphics.lineTo(WORLD_WIDTH, y);
      graphics.strokePath();
    }
    graphics.setDepth(0);
  }

  private createAtmosphere(): void {
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, WORLD_WIDTH);
      const y = Phaser.Math.Between(0, WORLD_HEIGHT);
      const particle = this.add.circle(x, y, Phaser.Math.Between(2, 4), 0x4ade80, 0.2);
      particle.setDepth(DEPTHS.decorations);
      this.tweens.add({
        targets: particle,
        y: y - Phaser.Math.Between(30, 60),
        alpha: { from: 0.2, to: 0.05 },
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true, repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  // ==================== PLAYER ====================

  private createPlayer(): void {
    this.playerX = WORLD_WIDTH / 2;
    this.playerY = WORLD_HEIGHT / 2;
    
    // Create player container
    this.player = this.add.container(this.playerX, this.playerY);
    this.player.setDepth(DEPTHS.player);
    
    // Create Qi Aura (same as training ground)
    this.qiAura = this.spriteLoader.createQiAura(0, 0, this.cultivationLevel, 100, 100);
    this.player.add(this.qiAura);
    
    // Create directional player sprite
    this.playerSprite = this.add.sprite(0, 0, 'player_directions', DIRECTION_FRAMES.S);
    this.playerSprite.setScale(0.75); // Scale 64px frames to ~48px
    this.player.add(this.playerSprite);
    
    // Add player icon overlay
    const icon = this.add.text(0, -2, '🧘', { fontSize: '16px' }).setOrigin(0.5);
    this.player.add(icon);
    
    // Camera follow
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
  }

  private updatePlayerDirection(): void {
    // Convert mouse angle to direction frame
    const newDirection = angleToDirectionFrame(this.playerRotation);
    
    if (newDirection !== this.playerDirection) {
      this.playerDirection = newDirection;
      this.playerSprite.setFrame(newDirection);
    }
  }

  // ==================== TRAINING TARGETS ====================

  private createTrainingTargets(): void {
    if (!this.textures.exists('target')) {
      this.createTargetTexture();
    }
    
    const targetPositions = [
      { x: WORLD_WIDTH / 2 - 200, y: WORLD_HEIGHT / 2 - 150 },
      { x: WORLD_WIDTH / 2 + 200, y: WORLD_HEIGHT / 2 - 150 },
      { x: WORLD_WIDTH / 2 - 200, y: WORLD_HEIGHT / 2 + 150 },
      { x: WORLD_WIDTH / 2 + 200, y: WORLD_HEIGHT / 2 + 150 },
    ];
    
    targetPositions.forEach((pos, index) => {
      const target = this.createTarget(pos.x, pos.y, `target_${index}`);
      this.targets.push(target);
    });
  }

  private createTargetTexture(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    const width = 48, height = 80;
    
    // Wooden post
    graphics.fillStyle(0x5c4033);
    graphics.fillRect(width / 2 - 5, height * 0.6, 10, height * 0.4);
    graphics.fillStyle(0x4a3728);
    graphics.fillEllipse(width / 2, height * 0.95, 30, 8);
    
    // Straw body
    graphics.fillStyle(0xdaa520);
    graphics.fillEllipse(width / 2, height * 0.45, 22, 28);
    graphics.lineStyle(1, 0xb8860b);
    for (let i = 0; i < 5; i++) {
      const y = height * 0.3 + i * 6;
      graphics.beginPath();
      graphics.moveTo(width / 2 - 18, y);
      graphics.lineTo(width / 2 + 18, y);
      graphics.strokePath();
    }
    
    // Head
    graphics.fillStyle(0xdeb887);
    graphics.fillCircle(width / 2, height * 0.18, 12);
    graphics.lineStyle(2, 0x8b0000);
    graphics.beginPath();
    graphics.arc(width / 2, height * 0.18, 6, 0, Math.PI * 2);
    graphics.strokePath();
    
    // Arms
    graphics.fillStyle(0x5c4033);
    graphics.fillRect(width / 2 - 24, height * 0.4, 48, 6);
    
    // Vital points
    graphics.fillStyle(0xff4444);
    graphics.fillCircle(width / 2, height * 0.18, 2);
    graphics.fillCircle(width / 2, height * 0.4, 2);
    
    graphics.generateTexture('target', width, height);
    graphics.destroy();
  }

  private createTarget(x: number, y: number, id: string): TrainingTarget {
    const container = this.add.container(x, y);
    container.setDepth(DEPTHS.npcs);
    
    const sprite = this.add.image(0, -40, 'target').setOrigin(0.5, 1);
    container.add(sprite);
    
    const hpBarBg = this.add.graphics();
    hpBarBg.fillStyle(0x000000, 0.7);
    hpBarBg.fillRect(-25, -100, 50, 8);
    container.add(hpBarBg);
    
    const hpBar = this.add.graphics();
    container.add(hpBar);
    
    const label = this.add.text(0, -115, '🎯 Чучело', {
      fontSize: '11px', color: '#fbbf24', fontFamily: 'Arial',
    }).setOrigin(0.5);
    container.add(label);
    
    const centerY = y - 60;
    
    const target: TrainingTarget = {
      id, x, y, centerY,
      hitboxRadius: TARGET_HITBOX_RADIUS,
      hp: 1000, maxHp: 1000,
      sprite: container, hpBar,
      lastHitTime: 0,
    };
    
    this.updateTargetHpBar(target);
    
    sprite.setInteractive();
    sprite.on('pointerdown', () => {
      this.tweens.add({
        targets: container, scaleX: 0.9, scaleY: 0.9,
        duration: 50, yoyo: true,
      });
    });
    
    return target;
  }

  private updateTargetHpBar(target: TrainingTarget): void {
    if (!target.hpBar) return;
    target.hpBar.clear();
    const hpPercent = target.hp / target.maxHp;
    let color = 0x22c55e;
    if (hpPercent < 0.25) color = 0xef4444;
    else if (hpPercent < 0.5) color = 0xf97316;
    else if (hpPercent < 0.75) color = 0xeab308;
    target.hpBar.fillStyle(color);
    target.hpBar.fillRect(-24, -99, 48 * hpPercent, 6);
  }

  private damageTarget(target: TrainingTarget, damage: number, type: string = 'normal'): void {
    target.hp = Math.max(0, target.hp - damage);
    target.lastHitTime = Date.now();
    this.updateTargetHpBar(target);
    this.showDamageNumber(target.x, target.centerY, damage, type);
    
    if (target.sprite) {
      const sprite = target.sprite.getAt(0) as Phaser.GameObjects.Image;
      if (sprite && sprite.setTint) {
        sprite.setTint(0xff4444);
        this.tweens.add({
          targets: sprite, alpha: 0.7,
          duration: 50, yoyo: true,
          onComplete: () => { sprite.clearTint(); sprite.setAlpha(1); },
        });
      }
    }
    
    if (target.hp <= 0) {
      this.time.delayedCall(500, () => {
        target.hp = target.maxHp;
        this.updateTargetHpBar(target);
        this.showDamageNumber(target.x, target.centerY, 1000, 'healing');
      });
    }
  }

  private showDamageNumber(x: number, y: number, damage: number, type: string = 'normal'): void {
    const color = DAMAGE_COLORS[type] || DAMAGE_COLORS.normal;
    const isCrit = type === 'critical';
    
    const text = this.add.text(x, y, damage.toString(), {
      fontSize: isCrit ? '24px' : '18px', fontFamily: 'Arial',
      color, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);
    
    const damageNum: DamageNumber = {
      id: `dmg_${Date.now()}_${Math.random()}`,
      x, y, damage, type, text,
      createdAt: Date.now(),
    };
    this.damageNumbers.push(damageNum);
    
    this.tweens.add({
      targets: text, y: y - 50, alpha: 0,
      scale: isCrit ? 1.8 : 1.3,
      duration: 1200, ease: 'Power2',
      onComplete: () => {
        text.destroy();
        this.damageNumbers = this.damageNumbers.filter(d => d.id !== damageNum.id);
      },
    });
  }

  // ==================== NPC LOADING ====================

  private async loadNPCs(): Promise<void> {
    if (!this.sessionId) return;
    try {
      const response = await fetch(
        `/api/npc/spawn?action=list&sessionId=${this.sessionId}&locationId=${this.locationId}`
      );
      const data = await response.json();
      if (data.success && data.npcs) {
        for (const npc of data.npcs) this.spawnNPC(npc);
        console.log(`[LocationScene] Loaded ${data.npcs.length} NPCs`);
      }
    } catch (error) {
      console.error('[LocationScene] Failed to load NPCs:', error);
    }
  }

  private spawnNPC(npcData: any): void {
    const angle = Math.random() * Math.PI * 2;
    const distance = 150 + Math.random() * 200;
    const x = WORLD_WIDTH / 2 + Math.cos(angle) * distance;
    const y = WORLD_HEIGHT / 2 + Math.sin(angle) * distance;

    // Calculate HP based on cultivation level
    const baseHp = 100;
    const levelMultiplier = 1 + (npcData.cultivation?.level || 1) * 0.5;
    const maxHp = Math.floor(baseHp * levelMultiplier);

    const npc: LocationNPC = {
      id: npcData.id, name: npcData.name, title: npcData.title,
      cultivationLevel: npcData.cultivation?.level || 1,
      cultivationSubLevel: npcData.cultivation?.subLevel || 0,
      speciesId: npcData.speciesId || 'human',
      roleId: npcData.roleId || 'unknown',
      disposition: npcData.personality?.disposition || 50,
      x, y,
      hitboxRadius: NPC_COLLISION_RADIUS,
      hp: maxHp,
      maxHp,
    };
    this.npcs.set(npc.id, npc);
    this.npcSprites.set(npc.id, this.createNPCSprite(npc));
  }

  private createNPCSprite(npc: LocationNPC): Phaser.GameObjects.Container {
    const container = this.add.container(npc.x, npc.y);
    container.setDepth(DEPTHS.npcs);
    
    const levelColor = LEVEL_COLORS[npc.cultivationLevel] || 0x9ca3af;
    const theme = getCultivationTheme(npc.cultivationLevel);
    
    // Create NPC directional sprite using same system
    // For now use a circle with Qi aura
    const aura = this.add.circle(0, 0, 30, levelColor, 0.15);
    
    // Pulsing aura animation
    this.tweens.add({
      targets: aura,
      scale: { from: 1, to: 1.3 },
      alpha: { from: 0.15, to: 0.05 },
      duration: 2000, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });
    
    // NPC body - larger and more detailed
    const body = this.add.circle(0, 0, 20, 0xfbbf24, 0.9);
    body.setStrokeStyle(3, levelColor);
    
    // Inner glow
    const innerGlow = this.add.circle(0, 0, 15, levelColor, 0.2);
    
    // Direction indicator for NPC (faces player initially)
    const direction = this.add.triangle(25, 0, 0, -8, 0, 8, 12, levelColor, 0.8);
    
    // NPC icon
    const icon = this.add.text(0, 0, this.getSpeciesIcon(npc.speciesId), {
      fontSize: '16px',
    }).setOrigin(0.5);
    
    // Name label
    const label = this.add.text(0, 35, npc.name, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    
    container.add([aura, innerGlow, body, direction, icon, label]);
    container.setData('npcId', npc.id);
    
    body.setInteractive({ useHandCursor: true });
    body.on('pointerover', () => {
      this.tweens.add({ targets: container, scale: 1.15, duration: 150 });
      this.showNPCTooltip(npc, container);
    });
    body.on('pointerout', () => {
      this.tweens.add({ targets: container, scale: 1, duration: 150 });
      this.hideTooltip();
    });
    body.on('pointerdown', () => this.selectNPC(npc));
    
    return container;
  }

  private getSpeciesIcon(speciesId: string): string {
    const icons: Record<string, string> = {
      human: '👤', elf: '🧝', demon_humanoid: '👹',
      beastkin: '🐺', wolf: '🐺', tiger: '🐅',
      dragon_beast: '🐉', ghost: '👻',
    };
    return icons[speciesId] || '👤';
  }

  // ==================== INPUT ====================

  private setupInput(): void {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.input.keyboard.on('keydown-ESC', () => this.goToScene('WorldScene', {}));
    }
    
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const dx = worldPoint.x - this.player.x;
      const dy = worldPoint.y - this.player.y;
      this.playerRotation = Math.atan2(dy, dx) * 180 / Math.PI;
      
      // Update player direction based on rotation
      this.updatePlayerDirection();
    });
    
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.performAttack();
    });
  }

  update(): void {
    this.handleMovement();
    this.updateAI();
  }
  
  // ==================== AI SYSTEM ====================
  
  /**
   * Настройка системы ИИ
   * Слушает события от NPCAIController через Event Bus
   */
  private setupAI(): void {
    // Слушаем события движения NPC
    window.addEventListener('npc:move', ((event: CustomEvent) => {
      const data = event.detail as NPCMoveEvent;
      this.handleNPCMove(data);
    }) as EventListener);
    
    // Слушаем события атаки NPC
    window.addEventListener('npc:attack', ((event: CustomEvent) => {
      const data = event.detail as NPCAttackPlayerEvent;
      this.handleNPCAttack(data);
    }) as EventListener);
    
    // Слушаем тик ИИ
    window.addEventListener('npc_ai:tick', (() => {
      this.onAITick();
    }) as EventListener);
    
    console.log('[LocationScene] AI system initialized');
  }
  
  /**
   * Обработка движения NPC от ИИ
   */
  private handleNPCMove(data: NPCMoveEvent): void {
    const sprite = this.npcSprites.get(data.npcId);
    const npc = this.npcs.get(data.npcId);
    
    if (!sprite || !npc) return;
    
    // Обновляем позицию NPC
    npc.x = data.targetX;
    npc.y = data.targetY;
    
    // Анимация движения к цели
    this.tweens.add({
      targets: sprite,
      x: data.targetX,
      y: data.targetY,
      duration: 1000 / (data.speed / 100), // Скорость в пикселях/сек
      ease: 'linear',
    });
  }
  
  /**
   * Обработка атаки NPC
   */
  private handleNPCAttack(data: NPCAttackPlayerEvent): void {
    const npc = this.npcs.get(data.npcId);
    if (!npc) return;
    
    // Проверяем дистанцию до игрока
    const dx = this.playerX - npc.x;
    const dy = this.playerY - npc.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Атака только если игрок достаточно близко
    if (distance <= 60) {
      // Визуальный эффект атаки
      const attackEffect = this.add.graphics();
      attackEffect.setDepth(DEPTHS.effects);
      attackEffect.lineStyle(2, 0xff4444, 0.8);
      attackEffect.beginPath();
      attackEffect.moveTo(npc.x, npc.y);
      attackEffect.lineTo(this.playerX, this.playerY);
      attackEffect.strokePath();
      
      this.tweens.add({
        targets: attackEffect,
        alpha: 0,
        duration: 200,
        onComplete: () => attackEffect.destroy(),
      });
      
      // TODO: Отправить урон через Event Bus на сервер
      console.log(`[LocationScene] NPC ${npc.name} attacks player!`);
    }
  }
  
  /**
   * Тик обновления ИИ
   */
  private onAITick(): void {
    // Инициализируем состояния для новых NPC
    for (const [id, npc] of this.npcs) {
      if (!this.npcStates.has(id)) {
        this.npcStates.set(id, 'idle');
      }
    }
  }
  
  /**
   * Обновление ИИ (вызывается каждый кадр)
   */
  private updateAI(): void {
    this.aiUpdateTimer += 16; // ~60 FPS
    
    if (this.aiUpdateTimer >= this.aiUpdateInterval) {
      this.aiUpdateTimer = 0;
      
      // Обновляем поведение всех NPC
      for (const [id, npc] of this.npcs) {
        this.updateNPCBehavior(npc);
      }
    }
  }
  
  /**
   * Обновление поведения отдельного NPC
   */
  private updateNPCBehavior(npc: LocationNPC): void {
    const state = this.npcStates.get(npc.id) || 'idle';
    
    // Проверяем дистанцию до игрока
    const dx = this.playerX - npc.x;
    const dy = this.playerY - npc.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Определяем агрессивность по disposition
    const isAggressive = npc.disposition < 0;
    const agroRadius = isAggressive ? 200 : 100;
    
    // Машина состояний
    if (distance <= 50) {
      // В зоне атаки
      if (state !== 'attack') {
        this.npcStates.set(npc.id, 'attack');
        // Эффект атаки
        this.tweens.add({
          targets: this.npcSprites.get(npc.id),
          scale: 1.2,
          duration: 100,
          yoyo: true,
        });
      }
    } else if (distance <= agroRadius && isAggressive) {
      // В зоне агрессии
      if (state !== 'chase') {
        this.npcStates.set(npc.id, 'chase');
      }
      // Двигаемся к игроку
      this.moveNPCTowards(npc, this.playerX, this.playerY, 100);
    } else {
      // Патрулирование
      if (state !== 'patrol') {
        this.npcStates.set(npc.id, 'patrol');
      }
    }
  }
  
  /**
   * Движение NPC к цели
   */
  private moveNPCTowards(npc: LocationNPC, targetX: number, targetY: number, speed: number): void {
    const sprite = this.npcSprites.get(npc.id);
    if (!sprite) return;
    
    const dx = targetX - npc.x;
    const dy = targetY - npc.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      // Нормализуем направление
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Обновляем позицию
      npc.x += nx * speed * 0.016; // 16ms frame
      npc.y += ny * speed * 0.016;
      
      // Ограничиваем в пределах мира
      npc.x = Phaser.Math.Clamp(npc.x, 30, WORLD_WIDTH - 30);
      npc.y = Phaser.Math.Clamp(npc.y, 30, WORLD_HEIGHT - 30);
      
      // Обновляем спрайт
      sprite.setPosition(npc.x, npc.y);
      
      // Поворачиваем индикатор направления
      const angle = Math.atan2(dy, dx);
      const direction = sprite.getAt(3) as Phaser.GameObjects.Triangle;
      if (direction) {
        direction.setRotation(angle);
        direction.setPosition(Math.cos(angle) * 25, Math.sin(angle) * 25);
      }
    }
  }

  private handleMovement(): void {
    if (!this.player) return;
    let vx = 0, vy = 0;
    if (this.wasd?.A?.isDown || this.cursors?.left?.isDown) vx = -1;
    if (this.wasd?.D?.isDown || this.cursors?.right?.isDown) vx = 1;
    if (this.wasd?.W?.isDown || this.cursors?.up?.isDown) vy = -1;
    if (this.wasd?.S?.isDown || this.cursors?.down?.isDown) vy = 1;

    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len; vy /= len;
    }

    // Calculate new position
    const margin = PLAYER_SIZE;
    let newX = Phaser.Math.Clamp(this.player.x + vx * PLAYER_SPEED * (1/60), margin, WORLD_WIDTH - margin);
    let newY = Phaser.Math.Clamp(this.player.y + vy * PLAYER_SPEED * (1/60), margin, WORLD_HEIGHT - margin);

    // Check collision with NPCs
    for (const [id, npc] of this.npcs) {
      const dx = newX - npc.x;
      const dy = newY - npc.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = PLAYER_COLLISION_RADIUS + npc.hitboxRadius;

      if (distance < minDistance && distance > 0) {
        // Push player out of NPC
        const overlap = minDistance - distance;
        const nx = dx / distance;
        const ny = dy / distance;
        newX += nx * overlap;
        newY += ny * overlap;
      }
    }

    this.player.x = newX;
    this.player.y = newY;
    this.playerX = this.player.x;
    this.playerY = this.player.y;
  }

  // ==================== COMBAT ====================

  private performAttack(): void {
    const now = Date.now();

    // Calculate attack result with stat-based damage and cooldown
    const attackResult = calculateHandAttack(
      this.characterStats.strength,
      this.characterStats.agility,
      null, // TODO: technique from slot 1
      0     // TODO: mastery
    );

    // Check cooldown
    if (!canAttack(this.lastAttackTime, attackResult.cooldown)) {
      return; // Attack on cooldown
    }

    this.lastAttackTime = now;

    const attackRange = 150;
    const attackAngle = 60;

    // Apply damage to training targets
    for (const target of this.targets) {
      if (this.checkAttackHit(
        this.playerX,
        this.playerY,
        this.playerRotation,
        target.x,
        target.centerY,
        attackAngle,
        attackRange,
        target.hitboxRadius
      )) {
        this.damageTarget(target, attackResult.damage, 'normal');

        // Report attack to server via Event Bus for delta development
        this.reportAttackToServer(target.id, attackResult.damage, 'training_target');
      }
    }

    // Apply damage to NPCs
    for (const [id, npc] of this.npcs) {
      if (this.checkAttackHit(
        this.playerX,
        this.playerY,
        this.playerRotation,
        npc.x,
        npc.y,
        attackAngle,
        attackRange,
        npc.hitboxRadius
      )) {
        this.damageNPC(npc, attackResult.damage);

        // Report attack to server via Event Bus
        this.reportAttackToServer(npc.id, attackResult.damage, 'temp_npc');
      }
    }

    this.showAttackEffect(attackRange, attackAngle);
  }
  
  /**
   * Report attack to server via Event Bus
   * This triggers stat delta generation on the server
   */
  private async reportAttackToServer(targetId: string, damage: number, targetType: string): Promise<void> {
    try {
      await eventBusClient.reportDamageDealt(
        targetId,
        targetType,
        'hand_attack',
        { x: this.playerX, y: this.playerY },
        0, // distance
        this.playerRotation,
        1.0 // damageMultiplier
      );
    } catch (error) {
      // Non-critical error, don't interrupt gameplay
      console.warn('[LocationScene] Failed to report attack:', error);
    }
  }

  /**
   * Apply damage to an NPC
   */
  private damageNPC(npc: LocationNPC, damage: number): void {
    npc.hp = Math.max(0, npc.hp - damage);

    // Show damage number
    this.showDamageNumber(npc.x, npc.y, damage, 'normal');

    // Visual feedback - flash the NPC sprite
    const sprite = this.npcSprites.get(npc.id);
    if (sprite) {
      // Find the body circle in the container (index 2)
      const body = sprite.getAt(2) as Phaser.GameObjects.Arc;
      if (body && body.setTint) {
        body.setTint(0xff4444);
        this.tweens.add({
          targets: body,
          alpha: 0.5,
          duration: 50,
          yoyo: true,
          onComplete: () => {
            body.clearTint();
            body.setAlpha(0.9);
          },
        });
      }

      // Scale effect
      this.tweens.add({
        targets: sprite,
        scale: 0.9,
        duration: 50,
        yoyo: true,
      });
    }

    // Check for death
    if (npc.hp <= 0) {
      this.handleNPCDeath(npc);
    }
  }

  /**
   * Handle NPC death
   */
  private handleNPCDeath(npc: LocationNPC): void {
    const sprite = this.npcSprites.get(npc.id);
    if (sprite) {
      // Death animation
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        scale: 0.5,
        duration: 500,
        onComplete: () => {
          sprite.destroy();
          this.npcSprites.delete(npc.id);
          this.npcs.delete(npc.id);
        },
      });
    }

    // Show death message
    this.showDamageNumber(npc.x, npc.y - 30, 0, 'healing');
  }

  private checkAttackHit(px: number, py: number, rot: number, tx: number, ty: number, cone: number, range: number, hitbox: number): boolean {
    const dx = tx - px, dy = ty - py;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > range + hitbox) return false;
    
    const angleToTarget = Math.atan2(dy, dx) * 180 / Math.PI;
    const normTarget = ((angleToTarget % 360) + 360) % 360;
    const normRot = ((rot % 360) + 360) % 360;
    let diff = Math.abs(normTarget - normRot);
    if (diff > 180) diff = 360 - diff;
    return diff <= cone / 2;
  }

  private showAttackEffect(range: number, angle: number): void {
    const rad = this.playerRotation * Math.PI / 180;
    const coneRad = angle * Math.PI / 180;
    const cone = this.add.graphics();
    cone.setDepth(DEPTHS.effects);
    cone.fillStyle(0x4ade80, 0.3);
    cone.beginPath();
    cone.moveTo(this.playerX, this.playerY);
    cone.arc(this.playerX, this.playerY, range, rad - coneRad / 2, rad + coneRad / 2, false);
    cone.closePath();
    cone.fillPath();
    this.tweens.add({ targets: cone, alpha: 0, duration: 200, onComplete: () => cone.destroy() });
  }

  // ==================== UI ====================

  private createUI(): void {
    // Title bar with gradient
    const titleBarHeight = 50;
    const titleBg = this.add.graphics();
    titleBg.setScrollFactor(0).setDepth(DEPTHS.ui + 10);
    
    // Draw gradient background for title bar
    for (let i = 0; i < titleBarHeight; i++) {
      const alpha = 0.9 - (i / titleBarHeight) * 0.3;
      titleBg.fillStyle(0x0f172a, alpha);
      titleBg.fillRect(0, i, this.cameras.main.width, 1);
    }
    
    // Bottom border glow
    titleBg.lineStyle(2, 0x4ade80, 0.5);
    titleBg.beginPath();
    titleBg.moveTo(0, titleBarHeight);
    titleBg.lineTo(this.cameras.main.width, titleBarHeight);
    titleBg.strokePath();
    
    const title = this.add.text(this.cameras.main.width / 2, 25, `📍 ${this.locationName}`, {
      fontSize: '18px', color: '#fbbf24', fontStyle: 'bold',
      fontFamily: 'Arial',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    title.setScrollFactor(0).setDepth(DEPTHS.ui + 11);
    
    // Back button (left) - improved style
    this.createStyledButton(60, 25, '← Карта', 0x475569, 0x64748b, () => {
      this.cameras.main.flash(100, 0x4a, 0xde, 0x80);
      this.goToScene('WorldScene', {});
    });
    
    // Game menu buttons (right side) - with proper labels
    const menuItems = [
      { label: 'Статус', icon: '📊', x: this.cameras.main.width - 195, action: 'status' },
      { label: 'Отдых', icon: '⏸️', x: this.cameras.main.width - 140, action: 'rest' },
      { label: 'Техники', icon: '⚔️', x: this.cameras.main.width - 85, action: 'techniques' },
      { label: 'Инвентарь', icon: '🎒', x: this.cameras.main.width - 30, action: 'inventory' },
    ];
    
    menuItems.forEach(item => {
      this.createStyledButton(item.x, 25, item.icon, 0x475569, 0x64748b, () => {
        this.emitMenuAction(item.action);
      }, 44, 36, item.label);
    });
    
    // Instructions at bottom
    const instrBg = this.add.graphics();
    instrBg.setScrollFactor(0).setDepth(DEPTHS.ui);
    instrBg.fillStyle(0x000000, 0.6);
    instrBg.fillRect(0, this.cameras.main.height - 25, this.cameras.main.width, 25);
    
    const instrText = this.add.text(
      this.cameras.main.width / 2, this.cameras.main.height - 12,
      'WASD - движение | ЛКМ - атака | ESC - карта',
      { fontSize: '11px', color: '#9ca3af', fontFamily: 'Arial' }
    ).setOrigin(0.5);
    instrText.setScrollFactor(0).setDepth(DEPTHS.ui + 1);
  }

  private createStyledButton(
    x: number, y: number, label: string, 
    bgColor: number, borderColor: number, 
    onClick: () => void,
    width: number = 80, height: number = 36,
    tooltip?: string
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setScrollFactor(0).setDepth(DEPTHS.ui + 15);
    
    // Shadow
    const shadow = this.add.rectangle(2, 2, width, height, 0x000000, 0.3);
    
    // Background with gradient effect
    const bg = this.add.rectangle(0, 0, width, height, bgColor, 0.95);
    bg.setStrokeStyle(2, borderColor, 0.8);
    
    // Highlight line at top
    const highlight = this.add.rectangle(0, -height/2 + 1, width - 4, 2, 0xffffff, 0.1);
    
    // Label text
    const text = this.add.text(0, 0, label, { 
      fontSize: '16px', 
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5);
    
    container.add([shadow, bg, highlight, text]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    
    // Hover effects
    container.on('pointerover', () => {
      bg.setFillStyle(0x64748b, 1);
      bg.setStrokeStyle(2, 0x4ade80, 1);
      container.setScale(1.05);
    });
    
    container.on('pointerout', () => {
      bg.setFillStyle(bgColor, 0.95);
      bg.setStrokeStyle(2, borderColor, 0.8);
      container.setScale(1);
    });
    
    container.on('pointerdown', () => {
      this.tweens.add({ targets: container, scale: 0.95, duration: 50, yoyo: true });
      onClick();
    });
    
    return container;
  }

  private emitMenuAction(action: string): void {
    console.log(`[LocationScene] Menu action: ${action}`);
    // Emit event that React components listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gameMenuAction', { detail: { action } }));
    }
  }

  private showNPCTooltip(npc: LocationNPC, parent: Phaser.GameObjects.Container): void {
    this.hideTooltip();
    this.tooltipContainer = this.add.container(parent.x, parent.y - 60);
    this.tooltipContainer.setDepth(DEPTHS.tooltip);
    
    const bg = this.add.rectangle(0, 0, 150, 60, 0x1e293b, 0.95);
    bg.setStrokeStyle(1, 0x4ade80);
    const name = this.add.text(0, -18, npc.name, { fontSize: '12px', color: '#fbbf24' }).setOrigin(0.5);
    const level = this.add.text(0, 2, `Ур. ${npc.cultivationLevel}.${npc.cultivationSubLevel}`, { fontSize: '10px', color: '#22c55e' }).setOrigin(0.5);
    const role = this.add.text(0, 18, npc.roleId, { fontSize: '9px', color: '#64748b' }).setOrigin(0.5);
    
    this.tooltipContainer.add([bg, name, level, role]);
    this.tooltipContainer.setAlpha(0);
    this.tweens.add({ targets: this.tooltipContainer, alpha: 1, duration: 100 });
  }

  private hideTooltip(): void {
    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
      this.tooltipContainer = null;
    }
  }

  private selectNPC(npc: LocationNPC): void {
    this.selectedNPC = npc;
    console.log('[LocationScene] Selected NPC:', npc.name);
  }
}

export const LocationSceneConfig = { key: 'LocationScene', scene: LocationScene };
