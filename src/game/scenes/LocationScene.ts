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

// @ts-ignore - Phaser namespace import for Next.js/Turbopack compatibility
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
// Arcade Physics Integration
import { NPCSprite, type NPCSpriteConfig } from '../objects/NPCSprite';
import { NPCGroup, type CollisionCallbackData } from '../groups/NPCGroup';
// Projectile Manager
import { ProjectileManager, type ProjectileHitEvent } from '../services/ProjectileManager';
import type { CombatSubtype } from '@/lib/game/techniques';
// Technique Slots Manager
import { TechniqueSlotsManager, type ProjectileFireConfig } from '../services/TechniqueSlotsManager';
// Loot Drop Manager
import { LootDropManager, type LootDrop } from '../services/LootDropManager';
// NPC Damage Calculator
import { calculateDamageFromNPC, checkNPCCritical, type NPCCombatStats } from '@/lib/game/npc-damage-calculator';

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
  
  // === Arcade Physics Integration ===
  private playerPhysicsBody!: Phaser.Physics.Arcade.Sprite;  // Физическое тело игрока
  private npcGroup!: NPCGroup;                                // Группа NPC с физикой
  private npcPhysicsSprites: Map<string, NPCSprite> = new Map(); // Физические спрайты NPC
  
  // AI System
  private aiUpdateTimer: number = 0;
  private aiUpdateInterval: number = 100; // 10 FPS for AI
  private npcStates: Map<string, 'idle' | 'patrol' | 'chase' | 'attack' | 'flee'> = new Map();
  
  // === Projectile System ===
  private projectileManager!: ProjectileManager;
  
  // === Technique Slots System ===
  private techniqueSlotsManager!: TechniqueSlotsManager;
  private techniqueSlotUI!: Phaser.GameObjects.Container;
  
  // === Loot Drop System ===
  private lootDropManager!: LootDropManager;
  
  // === Player Stats (Combat) ===
  private playerHp: number = 100;
  private playerMaxHp: number = 100;
  private playerArmor: number = 0;
  private isPlayerDead: boolean = false;
  
  // UI
  private selectedNPC: LocationNPC | null = null;
  private tooltipContainer: Phaser.GameObjects.Container | null = null;
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private playerHpBarBg!: Phaser.GameObjects.Graphics;
  
  // Debug mode
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;
  private debugMode: boolean = false;

  // === AI Event Handlers (for cleanup) ===
  private boundNPCMove: ((event: Event) => void) | null = null;
  private boundNPCAttack: ((event: Event) => void) | null = null;
  private boundAITick: ((event: Event) => void) | null = null;

  constructor() {
    super({ key: 'LocationScene' });
  }

  init(data: LocationSceneData): void {
    this.locationId = data.locationId || '';
    this.locationName = data.locationName || 'Unknown Location';
    this.sessionId = data.sessionId || '';
    this.npcs.clear();
    this.npcSprites.clear();
    this.npcPhysicsSprites.clear();
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
    this.createPlayerWithPhysics();  // ← Updated: Arcade Physics
    this.createTrainingTargets();
    this.initializeNPCGroup();   // ← New: Initialize NPC physics group
    this.initializeProjectileManager(); // ← Initialize Projectile Manager
    this.initializeTechniqueSlots(); // ← Initialize Technique Slots
    this.initializeLootDropManager(); // ← Initialize Loot Drop Manager
    await this.loadNPCs();
    await this.loadCharacterStats();
    this.setupInput();
    this.setupAI();
    this.createUI();
    this.setupDebugMode();
    
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
        const characterId = typeof window !== 'undefined' ? localStorage.getItem('characterId') : null;
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

  /**
   * Create player with Arcade Physics body
   * 
   * Phaser 3: Container не может иметь физическое тело напрямую.
   * Решение: Создаём невидимый Physics Sprite и синхронизируем его с Container.
   * 
   * @see https://docs.phaser.io/api-documentation/class-Physics-Arcade-Sprite
   */
  private createPlayerWithPhysics(): void {
    this.playerX = WORLD_WIDTH / 2;
    this.playerY = WORLD_HEIGHT / 2;
    
    // === 1. Визуальный контейнер (без физики) ===
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
    
    // === 2. Невидимое физическое тело ===
    // Создаём спрайт для Arcade Physics
    this.playerPhysicsBody = this.physics.add.sprite(this.playerX, this.playerY, '__DEFAULT');
    this.playerPhysicsBody.setVisible(false);  // Невидимый
    this.playerPhysicsBody.setAlpha(0);
    
    // Настройка круглого хитбокса
    const playerBody = this.playerPhysicsBody.body as Phaser.Physics.Arcade.Body;
    // ВАЖНО: setCircle() НЕ центрирует автоматически! Нужен offset!
    // __DEFAULT текстура = 32×32, origin = 0.5 → halfSize = 16
    // offset = halfSize - radius
    const PLAYER_SPRITE_HALF = 16;
    playerBody.setCircle(
      PLAYER_COLLISION_RADIUS,
      PLAYER_SPRITE_HALF - PLAYER_COLLISION_RADIUS,
      PLAYER_SPRITE_HALF - PLAYER_COLLISION_RADIUS
    );
    this.playerPhysicsBody.setCollideWorldBounds(true);
    
    // Camera follow - следим за контейнером для плавности
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
    
    console.log('[LocationScene] Player created with Arcade Physics body');
  }
  
  /**
   * Инициализация NPC Group с Arcade Physics
   */
  private initializeNPCGroup(): void {
    this.npcGroup = new NPCGroup({
      scene: this,
      collideWorldBounds: true,
      bounce: 0.2,
    });
    
    // Настраиваем коллизию между игроком и NPC
    this.npcGroup.setPlayerCollision(this.playerPhysicsBody, {
      collide: true,  // Физическая коллизия с выталкиванием
      overlap: false, // Без триггера перекрытия (пока)
      onCollide: (data) => {
        // Игрок столкнулся с NPC
        const npc = data.npc;
        if (npc.disposition < 0) {
          // Враждебный NPC - триггер боя
          this.events.emit('combat:initiate', { npcId: npc.npcId });
        }
      },
    });
    
    // Включаем коллизии между NPC
    this.npcGroup.setInternalCollision(true);
    
    console.log('[LocationScene] NPC Group initialized with Arcade Physics');
  }
  
  /**
   * Инициализация Projectile Manager
   */
  private initializeProjectileManager(): void {
    this.projectileManager = new ProjectileManager({
      scene: this,
      npcGroup: this.npcGroup,
      onHit: (event: ProjectileHitEvent) => {
        console.log(`[LocationScene] Projectile hit: ${event.hitResult.damage} damage`);
      },
    });
    
    console.log('[LocationScene] ProjectileManager initialized');
  }
  
  /**
   * Инициализация Technique Slots Manager
   */
  private initializeTechniqueSlots(): void {
    this.techniqueSlotsManager = new TechniqueSlotsManager(
      this,
      (config: ProjectileFireConfig) => {
        // Fire projectile from ProjectileManager
        this.projectileManager.fireFromPlayer(
          this.playerX,
          this.playerY,
          config.targetX,
          config.targetY,
          {
            id: config.techniqueId,
            damage: config.damage,
            subtype: config.subtype,
            element: config.element,
          }
        );
      },
      {
        totalSlots: 4,
        characterQi: 100,
        characterMaxQi: 100,
        cultivationLevel: this.cultivationLevel,
      }
    );
    
    console.log('[LocationScene] TechniqueSlotsManager initialized');
  }
  
  /**
   * Инициализация Loot Drop Manager
   */
  private initializeLootDropManager(): void {
    this.lootDropManager = new LootDropManager({
      scene: this,
      onPickup: (loot) => {
        // Показать уведомление о подборе
        this.showDamageNumber(loot.x, loot.y - 20, 0, 'healing');
        console.log(`[LocationScene] Loot picked up: ${loot.items.length} items`);
      },
      autoDespawnMs: 3 * 60 * 1000, // 3 минуты
    });
    
    console.log('[LocationScene] LootDropManager initialized');
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

    const level = npcData.cultivation?.level || 1;
    const disposition = npcData.personality?.disposition || 50;

    // === Создаём NPCSprite с физикой через NPCGroup ===
    const npcSprite = this.npcGroup.create({
      id: npcData.id,
      name: npcData.name,
      speciesId: npcData.speciesId || 'human',
      roleId: npcData.roleId || 'unknown',
      level,
      x,
      y,
      disposition,
      aggressionLevel: disposition < 0 ? Math.abs(disposition) : 0,
      cultivationSubLevel: npcData.cultivation?.subLevel || 0,
    });
    
    // === Сохраняем в локальные Map для совместимости ===
    const npc: LocationNPC = {
      id: npcData.id,
      name: npcData.name,
      title: npcData.title,
      cultivationLevel: level,
      cultivationSubLevel: npcData.cultivation?.subLevel || 0,
      speciesId: npcData.speciesId || 'human',
      roleId: npcData.roleId || 'unknown',
      disposition,
      x, y,
      hitboxRadius: NPC_COLLISION_RADIUS,
      hp: npcSprite.maxHp,
      maxHp: npcSprite.maxHp,
    };
    
    this.npcs.set(npc.id, npc);
    this.npcPhysicsSprites.set(npc.id, npcSprite);
    
    console.log(`[LocationScene] Spawned NPC "${npcData.name}" at (${x}, ${y}) with physics`);
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
      
      // Hotkeys for technique slots 1-4
      this.input.keyboard.on('keydown-ONE', () => this.setActiveTechniqueSlot(0));
      this.input.keyboard.on('keydown-TWO', () => this.setActiveTechniqueSlot(1));
      this.input.keyboard.on('keydown-THREE', () => this.setActiveTechniqueSlot(2));
      this.input.keyboard.on('keydown-FOUR', () => this.setActiveTechniqueSlot(3));
      
      // Interaction key (E or F) - для взаимодействия с NPC
      this.input.keyboard.on('keydown-E', () => this.interactWithNearestNPC());
      this.input.keyboard.on('keydown-F', () => this.interactWithNearestNPC());
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
  
  /**
   * Взаимодействие с ближайшим NPC
   */
  private interactWithNearestNPC(): void {
    console.log('[LocationScene] E/F pressed - attempting NPC interaction...');
    
    if (!this.npcGroup) {
      console.warn('[LocationScene] No NPC group available!');
      return;
    }
    
    console.log(`[LocationScene] Player position: (${this.playerX.toFixed(0)}, ${this.playerY.toFixed(0)})`);
    console.log(`[LocationScene] NPCs in group: ${this.npcGroup.size}`);
    
    // Ищем ближайшего NPC в радиусе 60 пикселей
    const nearest = this.npcGroup.getNearestNPC(this.playerX, this.playerY, 60);
    
    if (nearest) {
      console.log(`[LocationScene] Found nearest NPC: ${nearest.npcName} at (${nearest.x.toFixed(0)}, ${nearest.y.toFixed(0)})`);
      
      // Эмитим событие взаимодействия
      this.events.emit('npc:interact', {
        npcId: nearest.npcId,
        npcName: nearest.npcName,
        disposition: nearest.disposition,
        canTalk: nearest.disposition >= 0,
      });
      
      // Визуальный эффект
      this.tweens.add({
        targets: nearest,
        scale: 1.1,
        duration: 100,
        yoyo: true,
      });
      
      // Если дружественный - показываем взаимодействие через UI
      if (nearest.disposition >= 0) {
        // Отправляем событие в React UI
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('game:npcInteract', {
            detail: {
              npcId: nearest.npcId,
              npcName: nearest.npcName,
            }
          }));
        }
      }
    } else {
      console.log('[LocationScene] No NPC found within 60px radius');
    }
  }

  update(time: number, delta: number): void {
    this.handleMovement();
    this.updateAI();
    
    // Update projectiles - ВАЖНО: передаём реальную delta!
    if (this.projectileManager) {
      this.projectileManager.update(delta);
    }
    
    // Update technique slots
    if (this.techniqueSlotsManager) {
      this.techniqueSlotsManager.update(delta);
    }
    
    // Update loot drops
    if (this.lootDropManager) {
      this.lootDropManager.update(delta);
    }
    
    // Try to pickup nearby loot (auto-pickup when close)
    if (this.lootDropManager) {
      const nearestDist = this.lootDropManager.getDistanceToNearestLoot(this.playerX, this.playerY);
      if (nearestDist <= 30) { // Auto-pickup within 30 pixels
        this.lootDropManager.tryPickup(this.playerX, this.playerY);
      }
    }
    
    // === Синхронизация npc.x/y с физической позицией спрайта ===
    // ВАЖНО: NPCSprite — единственный источник истины для позиции!
    // LocationNPC.x/y обновляется здесь для совместимости с остальным кодом
    for (const [id, sprite] of this.npcPhysicsSprites) {
      const npc = this.npcs.get(id);
      if (npc) {
        npc.x = sprite.x;
        npc.y = sprite.y;
      }
    }
    
    // Debug mode - draw hitboxes
    if (this.debugMode) {
      this.drawDebugHitboxes();
    }
  }
  
  // ==================== AI SYSTEM ====================
  
  /**
   * Настройка системы ИИ
   * Слушает события от NPCAIController через Event Bus
   */
  private setupAI(): void {
    // Создать bound handlers с сохранением ссылок
    this.boundNPCMove = ((event: Event) => {
      const data = (event as CustomEvent).detail as NPCMoveEvent;
      this.handleNPCMove(data);
    }) as EventListener;

    this.boundNPCAttack = ((event: Event) => {
      const data = (event as CustomEvent).detail as NPCAttackPlayerEvent;
      this.handleNPCAttack(data);
    }) as EventListener;

    this.boundAITick = (() => {
      this.onAITick();
    }) as EventListener;

    // Зарегистрировать слушатели
    window.addEventListener('npc:move', this.boundNPCMove);
    window.addEventListener('npc:attack', this.boundNPCAttack);
    window.addEventListener('npc_ai:tick', this.boundAITick);

    console.log('[LocationScene] AI system initialized');
  }
  
  /**
   * Обработка движения NPC от ИИ
   * 
   * ВАЖНО: Использует sprite.moveTo() для физического движения!
   * Tween анимация обходит физику и игнорирует коллизии.
   */
  private handleNPCMove(data: NPCMoveEvent): void {
    const sprite = this.npcPhysicsSprites.get(data.npcId);
    const npc = this.npcs.get(data.npcId);
    
    if (!sprite || !npc) return;
    
    // Используем физическое движение через setVelocity
    // sprite.moveTo() использует Arcade Physics и уважает коллизии
    sprite.moveTo(data.targetX, data.targetY, data.speed);
    
    // НЕ обновляем npc.x/y напрямую - они синхронизируются в update()
  }
  
  /**
   * Обработка атаки NPC
   * 
   * ВАЖНО: Использует sprite.x/y для позиции (от физики)!
   * npc.x/y может быть рассинхронизирован.
   */
  private handleNPCAttack(data: NPCAttackPlayerEvent): void {
    const sprite = this.npcPhysicsSprites.get(data.npcId);
    const npc = this.npcs.get(data.npcId);
    
    if (!sprite || !npc || this.isPlayerDead) return;
    
    // Используем позицию спрайта (от физики), а не npc.x/y
    const npcX = sprite.x;
    const npcY = sprite.y;
    
    // Проверяем дистанцию до игрока
    const dx = this.playerX - npcX;
    const dy = this.playerY - npcY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Атака только если игрок достаточно близко
    if (distance <= 60) {
      // Визуальный эффект атаки
      const attackEffect = this.add.graphics();
      attackEffect.setDepth(DEPTHS.effects);
      attackEffect.lineStyle(2, 0xff4444, 0.8);
      attackEffect.beginPath();
      attackEffect.moveTo(npcX, npcY);
      attackEffect.lineTo(this.playerX, this.playerY);
      attackEffect.strokePath();
      
      this.tweens.add({
        targets: attackEffect,
        alpha: 0,
        duration: 200,
        onComplete: () => attackEffect.destroy(),
      });
      
      // === Рассчитываем урон через calculateDamageFromNPC ===
      const isCritical = checkNPCCritical(npc.cultivationLevel * 2); // agility ~ level*2
      
      const damageResult = calculateDamageFromNPC({
        npc: {
          cultivationLevel: npc.cultivationLevel,
          strength: 10 + npc.cultivationLevel * 2,
          agility: 10 + npc.cultivationLevel,
          intelligence: 10 + npc.cultivationLevel,
          conductivity: 5 + npc.cultivationLevel,
          currentQi: 100,
        },
        technique: data.techniqueId ? {
          id: data.techniqueId,
          combatType: 'melee_strike',
          baseDamage: data.damage ?? 10,
        } : null,
        target: {
          armor: this.playerArmor,
          conductivity: 5,
          health: this.playerHp,
          maxHealth: this.playerMaxHp,
          meridianBuffer: 0,
        },
        isCritical,
      });
      
      const finalDamage = damageResult.damage;
      
      // Наносим урон игроку
      this.playerTakeDamage(npc, finalDamage, isCritical ? 'critical' : 'normal');
      
      console.log(`[LocationScene] NPC ${npc.name} attacks player for ${finalDamage} damage! (critical: ${isCritical})`);
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
   * 
   * ВАЖНО: Использует sprite.x/y для позиции (от физики)!
   */
  private updateNPCBehavior(npc: LocationNPC): void {
    const sprite = this.npcPhysicsSprites.get(npc.id);
    if (!sprite) return;
    
    const state = this.npcStates.get(npc.id) || 'idle';
    
    // Используем позицию спрайта (от физики)
    const npcX = sprite.x;
    const npcY = sprite.y;
    
    // Проверяем дистанцию до игрока
    const dx = this.playerX - npcX;
    const dy = this.playerY - npcY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Определяем агрессивность по disposition
    const isAggressive = npc.disposition < 0;
    const agroRadius = isAggressive ? 200 : 100;
    
    // Машина состояний
    if (distance <= 50) {
      // В зоне атаки
      if (state !== 'attack') {
        this.npcStates.set(npc.id, 'attack');
        // Останавливаем движение при атаке
        sprite.stopMovement();
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
      // Останавливаем движение вне зоны агрессии
      sprite.stopMovement();
    }
  }
  
  /**
   * Движение NPC к цели
   * 
   * ВАЖНО: Использует sprite.moveTo() для физического движения!
   * setPosition() обходит физику и игнорирует коллизии.
   */
  private moveNPCTowards(npc: LocationNPC, targetX: number, targetY: number, speed: number): void {
    const sprite = this.npcPhysicsSprites.get(npc.id);
    if (!sprite) return;
    
    // Используем физическое движение через setVelocity
    sprite.moveTo(targetX, targetY, speed);
    
    // Синхронизируем данные с физической позицией
    // (позиция обновляется автоматически физическим движком)
  }

  /**
   * Handle player movement using Arcade Physics
   * 
   * Вместо ручного расчёта коллизий используем Arcade Physics.
   * Физика автоматически обрабатывает столкновения с NPC.
   */
  private handleMovement(): void {
    if (!this.playerPhysicsBody || !this.player) return;
    
    // === Определяем направление ===
    let vx = 0, vy = 0;
    if (this.wasd?.A?.isDown || this.cursors?.left?.isDown) vx = -1;
    if (this.wasd?.D?.isDown || this.cursors?.right?.isDown) vx = 1;
    if (this.wasd?.W?.isDown || this.cursors?.up?.isDown) vy = -1;
    if (this.wasd?.S?.isDown || this.cursors?.down?.isDown) vy = 1;

    // Нормализация диагонального движения
    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;
    }

    // === Устанавливаем скорость через Arcade Physics ===
    // Arcade Physics автоматически обрабатывает коллизии
    this.playerPhysicsBody.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);

    // === Синхронизируем визуальный контейнер с физическим телом ===
    this.player.setPosition(this.playerPhysicsBody.x, this.playerPhysicsBody.y);
    this.playerX = this.playerPhysicsBody.x;
    this.playerY = this.playerPhysicsBody.y;
    
    // === Обновляем NPC Group ===
    if (this.npcGroup) {
      this.npcGroup.update(16); // ~16ms per frame
    }
  }

  // ==================== COMBAT ====================

  /**
   * Выполнить атаку (выстрел снарядом по клику мыши)
   * Использует ProjectileManager для создания снарядов
   */
  private performAttack(): void {
    const now = Date.now();

    // Calculate attack result with stat-based damage and cooldown
    const attackResult = calculateHandAttack(
      this.characterStats.strength,
      this.characterStats.agility,
      null, // technique from slot
      0     // mastery
    );

    // Check cooldown
    if (!canAttack(this.lastAttackTime, attackResult.cooldown)) {
      return; // Attack on cooldown
    }

    this.lastAttackTime = now;

    // === Получаем позицию курсора в мировых координатах ===
    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    
    // === Определяем активную технику из слотов ===
    const activeTechnique = this.techniqueSlotsManager?.getActiveTechnique();
    
    if (activeTechnique && this.projectileManager) {
      // === Ranged атака через ProjectileManager ===
      this.projectileManager.fireFromPlayer(
        this.playerX,
        this.playerY,
        worldPoint.x,
        worldPoint.y,
        {
          id: activeTechnique.id,
          damage: attackResult.damage,
          subtype: (activeTechnique.effects?.combatSubtype as any) || 'ranged_projectile',
          element: activeTechnique.element || 'neutral',
        }
      );
      
      console.log(`[LocationScene] Fired projectile: ${activeTechnique.id} → (${worldPoint.x}, ${worldPoint.y})`);
    } else {
      // === Fallback: базовый снаряд ===
      if (this.projectileManager) {
        this.projectileManager.fireFromPlayer(
          this.playerX,
          this.playerY,
          worldPoint.x,
          worldPoint.y,
          {
            id: 'basic_strike',
            damage: attackResult.damage,
            subtype: 'ranged_projectile',
            element: 'neutral',
          }
        );
      }
      
      // === Melee атака для training targets (legacy) ===
      const attackRange = 150;
      const attackAngle = 60;

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
          this.reportAttackToServer(target.id, attackResult.damage, 'training_target');
        }
      }
    }
    
    // Визуальный эффект атаки
    this.showAttackEffect(100, 30);
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
   * Apply damage to an NPC (работает с NPCSprite)
   * Вызывается из ProjectileManager при попадании снаряда
   */
  private damageNPC(npc: LocationNPC, damage: number): void {
    // Получаем физический спрайт NPC
    const npcSprite = this.npcPhysicsSprites.get(npc.id);
    
    if (npcSprite) {
      // Наносим урон через NPCSprite.takeDamage()
      npcSprite.takeDamage(damage, 'neutral');
      
      // Обновляем HP в локальном объекте
      npc.hp = npcSprite.hp;
      
      // Показываем число урона
      this.showDamageNumber(npcSprite.x, npcSprite.y, damage, 'normal');
    } else {
      // Fallback для старых NPC без физики
      npc.hp = Math.max(0, npc.hp - damage);
      this.showDamageNumber(npc.x, npc.y, damage, 'normal');
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
    const npcSprite = this.npcPhysicsSprites.get(npc.id);
    
    // Drop loot before destroying sprite
    if (this.lootDropManager) {
      this.lootDropManager.dropLoot(
        npc.id,
        npc.name,
        npcSprite?.x ?? npc.x,
        npcSprite?.y ?? npc.y,
        npc.cultivationLevel
      );
    }
    
    if (npcSprite) {
      // Удаляем из npcGroup
      this.npcGroup.remove(npc.id);
      this.npcPhysicsSprites.delete(npc.id);
    }
    
    // Удаляем из локальных Map
    this.npcs.delete(npc.id);

    // Show death message
    this.showDamageNumber(npcSprite?.x ?? npc.x, (npcSprite?.y ?? npc.y) - 30, 0, 'healing');
    
    // Notify server about NPC death
    eventBusClient.emit('npc:death', {
      npcId: npc.id,
      locationId: this.locationId,
      position: { x: npcSprite?.x ?? npc.x, y: npcSprite?.y ?? npc.y },
      timestamp: Date.now(),
    });
    
    console.log(`[LocationScene] NPC "${npc.name}" died`);
  }
  
  // ==================== PLAYER DAMAGE ====================
  
  /**
   * Игрок получает урон от NPC
   */
  private playerTakeDamage(
    npc: LocationNPC,
    damage: number,
    damageType: string = 'normal'
  ): void {
    if (this.isPlayerDead) return;
    
    this.playerHp = Math.max(0, this.playerHp - damage);
    
    // Визуальный эффект урона
    this.showDamageNumber(this.playerX, this.playerY, damage, damageType);
    
    // Flash эффект игрока
    this.tweens.add({
      targets: this.player,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 2,
    });
    
    // Обновить UI HP бара
    this.updatePlayerHpBar();
    
    // Отправить событие на сервер
    eventBusClient.reportDamageReceived({
      sourceId: npc.id,
      sourceName: npc.name,
      damage,
      damageType,
      newHealth: this.playerHp,
      maxHealth: this.playerMaxHp,
    }).catch(() => {
      // Ignore errors
    });
    
    // Проверка смерти
    if (this.playerHp <= 0) {
      this.handlePlayerDeath(npc);
    }
  }
  
  /**
   * Смерть игрока
   */
  private handlePlayerDeath(killer: LocationNPC | null): void {
    if (this.isPlayerDead) return;
    this.isPlayerDead = true;
    
    console.log(`[LocationScene] Player died! Killed by: ${killer?.name ?? 'unknown'}`);
    
    // Эффект смерти
    this.tweens.add({
      targets: this.player,
      alpha: 0,
      scale: 0.5,
      duration: 1000,
      onComplete: () => {
        // Показать диалог респауна
        this.showRespawnDialog();
      },
    });
    
    // Уведомить сервер
    eventBusClient.reportPlayerDeath({
      locationId: this.locationId,
      killerId: killer?.id ?? null,
      killerName: killer?.name,
      deathPosition: { x: this.playerX, y: this.playerY },
    }).catch(() => {
      // Ignore errors
    });
  }
  
  /**
   * Диалог респауна
   */
  private showRespawnDialog(): void {
    // TODO: Показать UI диалог
    // Временно: автоматический респаун через 3 сек
    this.time.delayedCall(3000, () => {
      this.respawnPlayer();
    });
  }
  
  /**
   * Респаун игрока
   */
  private respawnPlayer(): void {
    this.playerHp = this.playerMaxHp;
    this.isPlayerDead = false;
    
    // Респаун в центре карты
    this.playerX = WORLD_WIDTH / 2;
    this.playerY = WORLD_HEIGHT / 2;
    
    this.player.setPosition(this.playerX, this.playerY);
    this.player.setAlpha(1);
    this.player.setScale(1);
    
    // Уведомить сервер
    eventBusClient.reportPlayerRespawn({
      locationId: this.locationId,
      respawnPosition: { x: this.playerX, y: this.playerY },
    }).catch(() => {
      // Ignore errors
    });
    
    // Обновить HP бар
    this.updatePlayerHpBar();
    
    console.log('[LocationScene] Player respawned');
  }
  
  /**
   * Обновить HP бар игрока
   */
  private updatePlayerHpBar(): void {
    if (!this.playerHpBar) return;
    
    this.playerHpBar.clear();
    const hpPercent = this.playerHp / this.playerMaxHp;
    
    // Цвет зависит от процента HP
    let color = 0x22c55e;  // Зелёный
    if (hpPercent < 0.25) color = 0xef4444;      // Красный
    else if (hpPercent < 0.5) color = 0xf97316;  // Оранжевый
    else if (hpPercent < 0.75) color = 0xeab308; // Жёлтый
    
    this.playerHpBar.fillStyle(color, 1);
    this.playerHpBar.fillRect(-94, this.cameras.main.height - 29, 188 * hpPercent, 10);
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
    
    // === HP Bar (bottom left) ===
    const hpBarWidth = 200;
    const hpBarHeight = 16;
    const hpBarX = 110;
    const hpBarY = this.cameras.main.height - 35;
    
    // HP Bar Background
    this.playerHpBarBg = this.add.graphics();
    this.playerHpBarBg.setScrollFactor(0).setDepth(DEPTHS.ui);
    this.playerHpBarBg.fillStyle(0x000000, 0.7);
    this.playerHpBarBg.fillRoundedRect(hpBarX - hpBarWidth/2, hpBarY, hpBarWidth, hpBarHeight, 4);
    
    // HP Bar Fill
    this.playerHpBar = this.add.graphics();
    this.playerHpBar.setScrollFactor(0).setDepth(DEPTHS.ui + 1);
    
    // HP Label
    const hpLabel = this.add.text(hpBarX, hpBarY + hpBarHeight + 5, 'HP', {
      fontSize: '10px',
      color: '#9ca3af',
    }).setOrigin(0.5, 0);
    hpLabel.setScrollFactor(0).setDepth(DEPTHS.ui);
    
    // Initial HP bar update
    this.updatePlayerHpBar();
    
    // === Technique Slots UI (bottom right) ===
    this.createTechniqueSlotsUI();
    
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
  
  // ==================== TECHNIQUE SLOTS UI ====================
  
  /**
   * Создать UI слотов техник
   */
  private createTechniqueSlotsUI(): void {
    const slotSize = 44;
    const padding = 4;
    const startX = this.cameras.main.width - (slotSize + padding) * 4 - 20;
    const startY = this.cameras.main.height - 70;
    
    this.techniqueSlotUI = this.add.container(0, 0);
    this.techniqueSlotUI.setScrollFactor(0).setDepth(DEPTHS.ui + 5);
    
    // Create 4 technique slots
    for (let i = 0; i < 4; i++) {
      const slotX = startX + i * (slotSize + padding);
      
      // Background
      const bg = this.add.rectangle(slotX, startY, slotSize, slotSize, 0x1e293b, 0.9);
      bg.setStrokeStyle(2, i === 0 ? 0x4ade80 : 0x475569);
      this.techniqueSlotUI.add(bg);
      
      // Slot number (key hint)
      const keyLabel = this.add.text(slotX, startY - slotSize/2 - 10, (i + 1).toString(), {
        fontSize: '11px',
        color: '#9ca3af',
        fontFamily: 'Arial',
      }).setOrigin(0.5);
      this.techniqueSlotUI.add(keyLabel);
      
      // Empty slot indicator
      const emptyIcon = this.add.text(slotX, startY, '⚔️', {
        fontSize: '20px',
      }).setOrigin(0.5);
      emptyIcon.setAlpha(0.3);
      this.techniqueSlotUI.add(emptyIcon);
    }
    
    // Technique name label (above slots)
    const techNameLabel = this.add.text(startX + (slotSize + padding) * 1.5, startY + slotSize/2 + 10, 'Нет техники', {
      fontSize: '10px',
      color: '#64748b',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
    this.techniqueSlotUI.add(techNameLabel);
    
    console.log('[LocationScene] Technique slots UI created');
  }
  
  /**
   * Установить активный слот техники
   */
  private setActiveTechniqueSlot(index: number): void {
    if (index < 0 || index > 3) return;
    
    this.techniqueSlotsManager?.setActiveSlot(index);
    
    // Update UI - highlight active slot
    const slotSize = 44;
    const padding = 4;
    const startX = this.cameras.main.width - (slotSize + padding) * 4 - 20;
    const startY = this.cameras.main.height - 70;
    
    // Update all slot borders
    for (let i = 0; i < 4; i++) {
      const slotX = startX + i * (slotSize + padding);
      const bg = this.techniqueSlotUI.getAt(i * 3) as Phaser.GameObjects.Rectangle;
      if (bg) {
        bg.setStrokeStyle(2, i === index ? 0x4ade80 : 0x475569);
      }
    }
    
    // Update technique name
    const activeTech = this.techniqueSlotsManager?.getActiveTechnique();
    const techNameLabel = this.techniqueSlotUI.getAt(12) as Phaser.GameObjects.Text;
    if (techNameLabel) {
      techNameLabel.setText(activeTech?.name ?? 'Нет техники');
      techNameLabel.setColor(activeTech ? '#fbbf24' : '#64748b');
    }
    
    console.log(`[LocationScene] Active technique slot: ${index + 1}`);
  }
  
  // ==================== DEBUG MODE ====================
  
  /**
   * Настройка режима отладки (F3 для переключения)
   */
  private setupDebugMode(): void {
    // Создаём graphics для отрисовки хитбоксов
    this.debugGraphics = this.add.graphics();
    this.debugGraphics.setDepth(1000);
    
    // P или Backtick (`) - переключение debug режима (F3 перехватывается браузером!)
    const toggleDebug = () => {
      this.debugMode = !this.debugMode;
      if (!this.debugMode && this.debugGraphics) {
        this.debugGraphics.clear();
      }
      console.log(`[LocationScene] Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
    };
    
    this.input.keyboard?.on('keydown-P', toggleDebug);
    this.input.keyboard?.on('keydown-BACKTICK', toggleDebug);
    
    console.log('[LocationScene] Debug mode available (press P or `)');
  }
  
  /**
   * Отрисовка хитбоксов для отладки
   */
  private drawDebugHitboxes(): void {
    if (!this.debugGraphics) return;
    
    this.debugGraphics.clear();
    
    // Рисуем хитбокс игрока (зелёный)
    this.debugGraphics.lineStyle(2, 0x00ff00);
    this.debugGraphics.strokeCircle(
      this.playerPhysicsBody.x,
      this.playerPhysicsBody.y,
      PLAYER_COLLISION_RADIUS
    );
    
    // Показываем позицию контейнера игрока (жёлтый)
    this.debugGraphics.fillStyle(0xffff00, 0.5);
    this.debugGraphics.fillCircle(this.playerX, this.playerY, 3);
    
    // Рисуем хитбоксы NPC
    for (const npc of this.npcGroup.getAll()) {
      // Цвет зависит от disposition
      const color = npc.disposition < 0 ? 0xff0000 : 0xffff00; // Красный для врагов
      this.debugGraphics.lineStyle(2, color);
      this.debugGraphics.strokeCircle(npc.x, npc.y, npc.hitboxRadius);
      
      // Центр хитбокса
      this.debugGraphics.fillStyle(color, 0.5);
      this.debugGraphics.fillCircle(npc.x, npc.y, 2);
    }
    
    // Рисуем хитбоксы снарядов (голубой)
    for (const proj of this.projectileManager.getActiveProjectiles()) {
      this.debugGraphics.lineStyle(2, 0x00ffff);
      const radius = proj.getEffectiveRadius();
      this.debugGraphics.strokeCircle(proj.x, proj.y, Math.min(radius, 30));
      
      // Вектор движения
      const body = proj.body as Phaser.Physics.Arcade.Body;
      if (body && (body.velocity.x !== 0 || body.velocity.y !== 0)) {
        this.debugGraphics.lineStyle(1, 0x00ffff, 0.5);
        this.debugGraphics.beginPath();
        this.debugGraphics.moveTo(proj.x, proj.y);
        this.debugGraphics.lineTo(
          proj.x + body.velocity.x * 0.1,
          proj.y + body.velocity.y * 0.1
        );
        this.debugGraphics.strokePath();
      }
    }
    
    // Информация о группе NPC
    this.debugGraphics.fillStyle(0x000000, 0.7);
    this.debugGraphics.fillRect(10, 10, 200, 60);
    this.debugGraphics.lineStyle(1, 0x4ade80);
    this.debugGraphics.strokeRect(10, 10, 200, 60);
    
    const infoText = this.add.text(15, 15, [
      `NPC Group: ${this.npcGroup.size}`,
      `Phaser Group: ${this.npcGroup.getPhaserGroupSize()}`,
      `Projectiles: ${this.projectileManager.activeCount}`,
      `Player: (${Math.round(this.playerX)}, ${Math.round(this.playerY)})`,
    ].join('\n'), {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    infoText.setDepth(1001);
    // Удаляем текст на следующем кадре
    this.time.delayedCall(16, () => infoText.destroy());
  }

  /**
   * Очистка ресурсов сцены при переключении
   *
   * ВАЖНО: Должен вызываться при переходе на другую сцену!
   * Удаляет все слушатели событий и очищает коллекции.
   */
  shutdown(): void {
    console.log('[LocationScene] Shutdown started...');

    // === Удалить все слушатели событий window ===
    if (this.boundNPCMove) {
      window.removeEventListener('npc:move', this.boundNPCMove);
      this.boundNPCMove = null;
    }
    if (this.boundNPCAttack) {
      window.removeEventListener('npc:attack', this.boundNPCAttack);
      this.boundNPCAttack = null;
    }
    if (this.boundAITick) {
      window.removeEventListener('npc_ai:tick', this.boundAITick);
      this.boundAITick = null;
    }

    // === Очистить физические спрайты NPC ===
    if (this.npcPhysicsSprites) {
      this.npcPhysicsSprites.forEach((sprite) => {
        if (sprite.active) {
          sprite.destroy();
        }
      });
      this.npcPhysicsSprites.clear();
    }

    // === Очистить остальные коллекции ===
    if (this.npcs) {
      this.npcs.clear();
    }
    if (this.npcSprites) {
      this.npcSprites.clear();
    }
    if (this.npcStates) {
      this.npcStates.clear();
    }
    this.targets = [];
    this.damageNumbers = [];

    // === Остановить менеджеры ===
    if (this.projectileManager) {
      this.projectileManager.destroy();
    }
    if (this.lootDropManager) {
      this.lootDropManager.destroy();
    }

    console.log('[LocationScene] Shutdown complete');
  }
}

export const LocationSceneConfig = { key: 'LocationScene', scene: LocationScene };
