/**
 * NPCSprite - Phaser спрайт NPC с физическим телом
 * 
 * Интегрирует:
 * - Arcade Physics для коллизий
 * - Существующую систему npc-collision.ts
 * - Типы из temp-npc.ts
 * - Spinal AI для рефлекторных реакций
 * 
 * Phaser 3 Arcade Physics API:
 * - body.setCircle(radius) - круглый хитбокс
 * - body.setImmovable(true) - статический объект
 * - scene.physics.add.overlap() - обнаружение перекрытия
 * - scene.physics.add.collider() - физическая коллизия с выталкиванием
 * 
 * @see https://docs.phaser.io/api-documentation/namespace/Physics-Arcade
 */

// @ts-ignore - Phaser namespace import for Next.js/Turbopack compatibility
import * as Phaser from 'phaser';
import { DEPTHS } from '../constants';
import { eventBusClient } from '@/lib/game/event-bus/client';
import type { CollisionConfig, InteractionZones } from '@/types/temp-npc';
import { 
  calculateCollisionConfig, 
  calculateInteractionZones,
  checkPlayerInteraction,
  type InteractionResult,
  type Position
} from '@/lib/game/npc-collision';

// Spinal AI imports
import { 
  SpinalController,
  createSpinalController,
  type SpinalSignal,
  type SpinalAction,
  type SpinalBodyState,
  type SpinalPresetType,
} from '@/lib/game/ai/spinal';

// ==================== КОНФИГУРАЦИЯ ====================

export interface NPCSpriteConfig {
  id: string;
  name: string;
  speciesId: string;
  roleId: string;
  level: number;
  x: number;
  y: number;
  disposition: number;
  aggressionLevel: number;
  // Cultivation data
  cultivationSubLevel?: number;
  // Данные из TempNPC
  collision?: CollisionConfig;
  interactionZones?: InteractionZones;
  // Stats
  vitality?: number;
  intelligence?: number;
  // Personality
  canTalk?: boolean;
  canTrade?: boolean;
  fleeThreshold?: number;
  // Spinal AI
  spinalPreset?: SpinalPresetType;
  qi?: number;
  maxQi?: number;
}

// Цвета по уровню культивации
const LEVEL_COLORS: Record<number, number> = {
  1: 0x9ca3af, 2: 0x22c55e, 3: 0x3b82f6, 4: 0xa855f7,
  5: 0xf59e0b, 6: 0xec4899, 7: 0x06b6d4, 8: 0xfbbf24, 9: 0xffffff,
};

// ==================== КЛАСС NPC SPRITE ====================

export class NPCSprite extends Phaser.Physics.Arcade.Sprite {
  // === Идентификация ===
  public npcId: string;
  public npcName: string;
  public speciesId: string;
  public roleId: string;
  public level: number;
  
  // === Поведение ===
  public disposition: number;
  public aggressionLevel: number;
  
  // === Коллизии ===
  public hitboxRadius: number;
  public collisionConfig: CollisionConfig;
  public interactionZones: InteractionZones;
  
  // === Состояние ===
  public hp: number;
  public maxHp: number;
  public isAggro: boolean;
  public isDead: boolean;
  
  // === AI State ===
  public aiState: 'idle' | 'patrol' | 'chase' | 'attack' | 'flee' = 'idle';
  public patrolTarget: { x: number; y: number } | null = null;
  
  // === Визуал ===
  private hpBar!: Phaser.GameObjects.Graphics;
  private hpBarBg!: Phaser.GameObjects.Graphics;
  private nameLabel!: Phaser.GameObjects.Text;
  private aura!: Phaser.GameObjects.Arc;
  private bodyCircle!: Phaser.GameObjects.Arc;
  private directionIndicator!: Phaser.GameObjects.Triangle;
  
  // === Внутренние данные ===
  private vitality: number;
  private intelligence: number;
  private canTalk: boolean;
  private canTrade: boolean;
  private fleeThreshold: number;
  
  // === Spinal AI ===
  private spinalController: SpinalController | null = null;
  private spinalPresetType: SpinalPresetType;
  private qi: number = 0;
  private maxQi: number = 100;
  
  // === Spinal Action State ===
  private spinalActionActive: boolean = false;
  private spinalActionEndTime: number = 0;

  constructor(scene: Phaser.Scene, config: NPCSpriteConfig) {
    // Создаём спрайт с текстурой по умолчанию (будет заменён визуалом)
    super(scene, config.x, config.y, '__DEFAULT');
    
    // === Идентификация ===
    this.npcId = config.id;
    this.npcName = config.name;
    this.speciesId = config.speciesId;
    this.roleId = config.roleId;
    this.level = config.level;
    this.disposition = config.disposition;
    this.aggressionLevel = config.aggressionLevel;
    
    // === Статы ===
    this.vitality = config.vitality ?? 10;
    this.intelligence = config.intelligence ?? 10;
    this.canTalk = config.canTalk ?? true;
    this.canTrade = config.canTrade ?? true;
    this.fleeThreshold = config.fleeThreshold ?? 20;
    
    // === HP ===
    const baseHp = 100;
    const levelMult = 1 + this.level * 0.5;
    this.maxHp = Math.floor(baseHp * levelMult + this.vitality * 5);
    this.hp = this.maxHp;
    
    // === Состояния ===
    this.isAggro = this.disposition < 0;
    this.isDead = false;
    
    // === Spinal AI ===
    this.qi = config.qi ?? 0;
    this.maxQi = config.maxQi ?? 100;
    this.spinalPresetType = config.spinalPreset ?? this.determineSpinalPreset(config);
    this.spinalController = createSpinalController(this.npcId, this.spinalPresetType);
    
    // === Добавляем в сцену (физика добавляется через NPCGroup) ===
    scene.add.existing(this);
    // ВАЖНО: physics.add.existing() вызывается при добавлении в Physics Group
    // Это предотвращает конфликт с group.add()
    
    // === Рассчитываем коллизию ===
    this.collisionConfig = config.collision ?? this.calculateCollision();
    this.interactionZones = config.interactionZones ?? this.calculateZones();
    this.hitboxRadius = this.collisionConfig.radius;
    
    // === Создаём визуал ===
    this.createVisual(scene);
    
    // Скрываем базовый спрайт (используем кастомный визуал)
    this.setAlpha(0);
    
    console.log(`[NPCSprite] Created NPC "${this.npcName}" at (${this.x}, ${this.y}) with hitbox radius ${this.hitboxRadius}, Spinal AI preset: ${this.spinalPresetType}`);
  }
  
  // ==================== SPINAL AI ====================
  
  /**
   * Определить пресет Spinal AI по конфигурации NPC
   */
  private determineSpinalPreset(config: NPCSpriteConfig): SpinalPresetType {
    // По roleId
    if (config.roleId.includes('guard') || config.roleId.includes('patrol')) {
      return 'guard';
    }
    if (config.roleId.includes('merchant') || config.roleId.includes('civilian')) {
      return 'passerby';
    }
    if (config.roleId.includes('cultivator') || config.roleId.includes('elder') || config.level >= 3) {
      return 'cultivator';
    }
    
    // По speciesId
    if (config.speciesId.includes('wolf') || config.speciesId.includes('tiger') || 
        config.speciesId.includes('beast') || config.speciesId.includes('monster')) {
      return 'monster';
    }
    
    // По умолчанию - passerby
    return 'passerby';
  }
  
  /**
   * Генерация сигнала для Spinal AI
   */
  public generateSpinalSignal(
    type: SpinalSignal['type'],
    intensity: number,
    direction?: { x: number; y: number },
    source?: string
  ): void {
    if (!this.spinalController || this.isDead) return;
    
    const signal: SpinalSignal = {
      type,
      intensity,
      direction,
      source,
      timestamp: Date.now(),
    };
    
    this.spinalController.receiveSignal(signal);
  }
  
  /**
   * Обновление Spinal AI (вызывается каждый кадр)
   */
  public updateSpinalAI(deltaMs: number, playerPosition?: { x: number; y: number }): SpinalAction | null {
    if (!this.spinalController || this.isDead) return null;
    
    // Собираем состояние тела
    const bodyState: SpinalBodyState = {
      position: { x: this.x, y: this.y },
      velocity: { x: this.body?.velocity?.x || 0, y: this.body?.velocity?.y || 0 },
      facing: 0,
      hp: this.hp,
      maxHp: this.maxHp,
      qi: this.qi,
      maxQi: this.maxQi,
      isGrounded: true,
      isMoving: this.body?.speed > 0,
      isInCombat: this.isAggro,
      isSuppressed: false,
      isNearEdge: false,
      nearbyAllies: 0,
    };
    
    // Проверяем близость игрока
    if (playerPosition) {
      const dx = playerPosition.x - this.x;
      const dy = playerPosition.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Генерируем сигнал опасности если игрок близко и враждебен
      if (distance < 200 && this.disposition < 0) {
        this.generateSpinalSignal(
          'danger_nearby',
          1 - distance / 200,
          { x: dx / distance, y: dy / distance },
          'player'
        );
      }
      
      // Генерируем сигнал player_nearby для охранников
      if (distance < 150) {
        this.generateSpinalSignal('player_nearby', 0.5);
      }
      
      // Обновляем ближайшую угрозу
      bodyState.nearestThreat = {
        id: 'player',
        position: playerPosition,
        distance,
      };
    }
    
    // Обновляем Spinal AI
    const action = this.spinalController.update(deltaMs, bodyState);
    
    // Выполняем действие
    if (action) {
      this.executeSpinalAction(action);
    }
    
    return action;
  }
  
  /**
   * Выполнение действия Spinal AI
   */
  private executeSpinalAction(action: SpinalAction): void {
    // Проверяем, что предыдущее действие завершено
    if (this.spinalActionActive && Date.now() < this.spinalActionEndTime) {
      return;
    }
    
    this.spinalActionActive = true;
    this.spinalActionEndTime = Date.now() + (action.params.duration || 200);
    
    switch (action.type) {
      case 'dodge':
        this.performDodge(action.params);
        break;
      case 'flinch':
        this.performFlinch(action.params);
        break;
      case 'step_back':
        this.performStepBack(action.params);
        break;
      case 'flee':
        this.performFlee(action.params);
        break;
      case 'qi_shield':
        this.performQiShield(action.params);
        break;
      case 'freeze':
        this.performFreeze(action.params);
        break;
      case 'alert':
        this.performAlert();
        break;
      default:
        break;
    }
  }
  
  /**
   * Уклонение
   */
  private performDodge(params: SpinalAction['params']): void {
    if (!params.direction) return;
    
    const speed = params.speed || 300;
    const distance = params.distance || 50;
    
    // Быстрое движение перпендикулярно угрозе
    this.setVelocity(
      params.direction.x * speed,
      params.direction.y * speed
    );
    
    // Визуальный эффект
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.setAlpha(0);
        this.spinalActionActive = false;
      },
    });
    
    console.log(`[NPCSprite:${this.npcName}] Dodging!`);
  }
  
  /**
   * Вздрогнуть
   */
  private performFlinch(params: SpinalAction['params']): void {
    // Визуальный эффект
    this.scene.tweens.add({
      targets: this.bodyCircle,
      scale: 1.2,
      duration: 50,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.spinalActionActive = false;
      },
    });
    
    console.log(`[NPCSprite:${this.npcName}] Flinching!`);
  }
  
  /**
   * Шаг назад
   */
  private performStepBack(params: SpinalAction['params']): void {
    if (!params.direction) return;
    
    const speed = params.speed || 100;
    
    // Движение от угрозы
    this.setVelocity(
      -params.direction.x * speed,
      -params.direction.y * speed
    );
    
    // Остановка через duration
    this.scene.time.delayedCall(params.duration || 200, () => {
      this.setVelocity(0, 0);
      this.spinalActionActive = false;
    });
    
    console.log(`[NPCSprite:${this.npcName}] Stepping back!`);
  }
  
  /**
   * Бегство
   */
  private performFlee(params: SpinalAction['params']): void {
    if (!params.direction) return;
    
    const speed = params.speed || 200;
    
    // Быстрое движение от угрозы
    this.setVelocity(
      -params.direction.x * speed,
      -params.direction.y * speed
    );
    
    this.aiState = 'flee';
    
    // Остановка через duration
    this.scene.time.delayedCall(params.duration || 1000, () => {
      this.setVelocity(0, 0);
      this.spinalActionActive = false;
      this.aiState = 'idle';
    });
    
    console.log(`[NPCSprite:${this.npcName}] Fleeing!`);
  }
  
  /**
   * Qi щит
   */
  private performQiShield(params: SpinalAction['params']): void {
    if (this.qi < (params.qiCost || 20)) return;
    
    this.qi -= params.qiCost || 20;
    
    // Визуальный эффект щита
    const shield = this.scene.add.circle(this.x, this.y, 40, 0x3b82f6, 0.3);
    shield.setStrokeStyle(2, 0x3b82f6);
    
    // Анимация щита
    this.scene.tweens.add({
      targets: shield,
      scale: 1.2,
      alpha: 0.1,
      duration: params.duration || 500,
      onComplete: () => {
        shield.destroy();
        this.spinalActionActive = false;
      },
    });
    
    console.log(`[NPCSprite:${this.npcName}] Qi Shield activated!`);
  }
  
  /**
   * Замереть
   */
  private performFreeze(params: SpinalAction['params']): void {
    // Остановка
    this.setVelocity(0, 0);
    
    // Визуальный эффект
    this.bodyCircle.setFillStyle(0x60a5fa, 0.9);
    
    this.scene.time.delayedCall(params.duration || 1000, () => {
      this.bodyCircle.setFillStyle(this.getBodyColor(), 0.9);
      this.spinalActionActive = false;
    });
    
    console.log(`[NPCSprite:${this.npcName}] Frozen!`);
  }
  
  /**
   * Тревога
   */
  private performAlert(): void {
    // Эмитируем событие тревоги
    this.scene.events.emit('npc:alert', {
      npcId: this.npcId,
      position: { x: this.x, y: this.y },
    });
    
    // Визуальный эффект
    const alertIcon = this.scene.add.text(this.x, this.y - 50, '⚠️', {
      fontSize: '20px',
    }).setOrigin(0.5);
    
    this.scene.tweens.add({
      targets: alertIcon,
      y: this.y - 70,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        alertIcon.destroy();
        this.spinalActionActive = false;
      },
    });
    
    console.log(`[NPCSprite:${this.npcName}] Alert!`);
  }
  
  /**
   * Получить информацию для отладки Spinal AI
   */
  public getSpinalDebugInfo() {
    return this.spinalController?.getDebugInfo() || null;
  }
  
  // ==================== SERVER ACTION EXECUTOR ====================
  
  /**
   * Выполнить действие, полученное от сервера
   * 
   * Это основной метод для выполнения действий в серверной архитектуре.
   * Сервер вычисляет AI, клиент только отображает.
   */
  public executeServerAction(action: {
    type: string;
    target?: { x: number; y: number } | string;
    params?: Record<string, unknown>;
    startTime: number;
    duration: number;
  }): void {
    if (this.isDead) return;
    
    console.log(`[NPCSprite:${this.npcName}] Server action: ${action.type}`);
    
    switch (action.type) {
      case 'move':
      case 'chase':
        if (action.target && typeof action.target === 'object') {
          this.performServerMove(action.target, action.params);
        }
        break;
        
      case 'attack':
        if (action.target && typeof action.target === 'object') {
          this.performServerAttack(action.target, action.params);
        }
        break;
        
      case 'dodge':
        this.performServerDodge(action.params);
        break;
        
      case 'flee':
        if (action.target && typeof action.target === 'object') {
          this.performServerFlee(action.target, action.params);
        }
        break;
        
      case 'flinch':
        this.performFlinch(action.params || {});
        break;
        
      case 'idle':
        this.performServerIdle();
        break;
        
      case 'patrol':
        if (action.target && typeof action.target === 'object') {
          this.performServerPatrol(action.target, action.params);
        }
        break;
        
      case 'orient':
        if (action.target && typeof action.target === 'object') {
          this.performServerOrient(action.target);
        }
        break;
        
      default:
        console.warn(`[NPCSprite:${this.npcName}] Unknown server action: ${action.type}`);
    }
  }
  
  /**
   * Серверное движение
   */
  private performServerMove(target: { x: number; y: number }, params?: Record<string, unknown>): void {
    const speed = (params?.speed as number) || 100;
    this.aiState = 'chase';
    this.moveTo(target.x, target.y, speed);
  }
  
  /**
   * Серверная атака
   */
  private performServerAttack(target: { x: number; y: number }, params?: Record<string, unknown>): void {
    this.aiState = 'attack';
    
    // Поворачиваемся к цели
    const angle = Math.atan2(target.y - this.y, target.x - this.x) * 180 / Math.PI;
    this.setDirection(angle);
    
    // Визуальный эффект атаки
    this.scene.tweens.add({
      targets: this.bodyCircle,
      scale: 1.3,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.aiState = 'idle';
      },
    });
  }
  
  /**
   * Серверное уклонение
   */
  private performServerDodge(params?: Record<string, unknown>): void {
    const direction = params?.direction as { x: number; y: number } | undefined;
    const speed = (params?.speed as number) || 300;
    
    if (direction) {
      this.setVelocity(direction.x * speed, direction.y * speed);
      
      this.scene.tweens.add({
        targets: this,
        alpha: 0.5,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          this.setAlpha(0);
          this.setVelocity(0, 0);
        },
      });
    }
  }
  
  /**
   * Серверное бегство
   */
  private performServerFlee(target: { x: number; y: number }, params?: Record<string, unknown>): void {
    const speed = (params?.speed as number) || 200;
    this.aiState = 'flee';
    
    // Бежим от цели
    const dx = this.x - target.x;
    const dy = this.y - target.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    
    this.setVelocity((dx / len) * speed, (dy / len) * speed);
    
    this.scene.time.delayedCall(1000, () => {
      this.setVelocity(0, 0);
      this.aiState = 'idle';
    });
  }
  
  /**
   * Серверный idle
   */
  private performServerIdle(): void {
    this.aiState = 'idle';
    this.setVelocity(0, 0);
  }
  
  /**
   * Серверный патруль
   */
  private performServerPatrol(target: { x: number; y: number }, params?: Record<string, unknown>): void {
    const speed = (params?.speed as number) || 50;
    this.aiState = 'patrol';
    this.patrolTarget = target;
    this.moveTo(target.x, target.y, speed);
  }
  
  /**
   * Серверная ориентация (поворот к цели без движения)
   */
  private performServerOrient(target: { x: number; y: number }): void {
    const angle = Math.atan2(target.y - this.y, target.x - this.x) * 180 / Math.PI;
    this.setDirection(angle);
    this.setVelocity(0, 0);
    
    // Визуальный эффект "внимания"
    this.scene.tweens.add({
      targets: this.bodyCircle,
      alpha: 0.7,
      duration: 100,
      yoyo: true,
    });
  }
  
  /**
   * Применить обновление состояния от сервера
   * 
   * Используется для синхронизации HP, позиции и других данных.
   * Сервер - источник истины!
   */
  public applyServerUpdate(changes: {
    health?: number;
    hp?: number;
    maxHp?: number;
    x?: number;
    y?: number;
    aiState?: string;
    isActive?: boolean;
  }): void {
    // Обновляем HP
    if (changes.health !== undefined || changes.hp !== undefined) {
      const newHp = changes.health ?? changes.hp ?? this.hp;
      const oldHp = this.hp;
      this.hp = newHp;
      
      if (changes.maxHp !== undefined) {
        this.maxHp = changes.maxHp;
      }
      
      // Обновляем HP бар
      this.updateHpBar();
      
      // Визуальный эффект урона
      if (newHp < oldHp) {
        this.bodyCircle.setFillStyle(0xff4444, 0.9);
        this.scene.time.delayedCall(100, () => {
          if (this.bodyCircle?.active) {
            this.bodyCircle.setFillStyle(this.getBodyColor(), 0.9);
          }
        });
      }
      
      console.log(`[NPCSprite:${this.npcName}] HP updated: ${oldHp} → ${newHp}/${this.maxHp}`);
      
      // Проверка смерти
      if (this.hp <= 0 && !this.isDead) {
        this.die('server');
      }
    }
    
    // Обновляем позицию (если сервер её изменил)
    if (changes.x !== undefined && changes.y !== undefined) {
      this.setPosition(changes.x, changes.y);
      this.syncVisualPosition();
    }
    
    // Обновляем AI состояние
    if (changes.aiState !== undefined) {
      this.aiState = changes.aiState as any;
    }
    
    // Обновляем активность
    if (changes.isActive !== undefined) {
      // Можно добавить визуальные эффекты при активации/деактивации
    }
  }
  
  // ==================== ФИЗИКА ====================
  
  /**
   * Настройка физического тела после добавления в Physics Group
   * 
   * ВАЖНО: Этот метод должен вызываться ПОСЛЕ group.add(), 
   * так как Physics Group создаёт тело при добавлении.
   * 
   * Phaser 3 setCircle() требует offset для центрирования:
   * - __DEFAULT текстура = 32×32 пикселей
   * - origin = 0.5 → половина размера = 16
   * - offset = halfSize - radius
   */
  public configurePhysicsBody(): void {
    if (!this.body) {
      console.warn(`[NPCSprite] Cannot configure physics body - body is null for "${this.npcName}"`);
      return;
    }
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    const SPRITE_HALF = 16; // __DEFAULT = 32×32, origin = 0.5
    
    // Устанавливаем круглый хитбокс с правильным offset для центрирования
    body.setCircle(
      this.hitboxRadius,
      SPRITE_HALF - this.hitboxRadius,  // offsetX
      SPRITE_HALF - this.hitboxRadius   // offsetY
    );
    
    // Ограничиваем в пределах мира
    this.setCollideWorldBounds(true);
    
    // ВАЖНО: Все NPC неподвижны при столкновении с игроком
    // Это предотвращает проход сквозь NPC
    body.setImmovable(true);
    
    console.log(`[NPCSprite] Physics body configured for "${this.npcName}" with radius ${this.hitboxRadius}, offset (${SPRITE_HALF - this.hitboxRadius}, ${SPRITE_HALF - this.hitboxRadius})`);
  }
  
  // ==================== ВИЗУАЛИЗАЦИЯ ====================
  
  private createVisual(scene: Phaser.Scene): void {
    const levelColor = LEVEL_COLORS[this.level] || 0x9ca3af;
    
    // === Aura (внешний круг) ===
    this.aura = scene.add.circle(0, 0, 30, levelColor, 0.15);
    
    // Пульсирующая анимация ауры
    scene.tweens.add({
      targets: this.aura,
      scale: { from: 1, to: 1.3 },
      alpha: { from: 0.15, to: 0.05 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    
    // === Body (основной круг) - синхронизирован с физическим хитбоксом ===
    this.bodyCircle = scene.add.circle(0, 0, this.hitboxRadius, this.getBodyColor(), 0.9);
    this.bodyCircle.setStrokeStyle(3, levelColor);
    
    // === Inner glow ===
    const innerGlow = scene.add.circle(0, 0, 15, levelColor, 0.2);
    
    // === Direction indicator ===
    this.directionIndicator = scene.add.triangle(25, 0, 0, -8, 0, 8, 12, levelColor, 0.8);
    
    // === Icon ===
    const icon = scene.add.text(0, 0, this.getSpeciesIcon(), {
      fontSize: '16px',
    }).setOrigin(0.5);
    
    // === HP Bar Background ===
    this.hpBarBg = scene.add.graphics();
    this.hpBarBg.fillStyle(0x000000, 0.7);
    this.hpBarBg.fillRect(-24, -50, 48, 6);
    
    // === HP Bar ===
    this.hpBar = scene.add.graphics();
    
    // === Name Label ===
    this.nameLabel = scene.add.text(0, 35, this.npcName, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    
    // Добавляем все элементы как дочерние к спрайту (они будут следовать за позицией)
    // В Phaser.Sprite нельзя добавить детей напрямую, поэтому используем привязку
    this.aura.setPosition(this.x, this.y);
    this.bodyCircle.setPosition(this.x, this.y);
    innerGlow.setPosition(this.x, this.y);
    this.directionIndicator.setPosition(this.x + 25, this.y);
    icon.setPosition(this.x, this.y);
    this.hpBarBg.setPosition(this.x, this.y);
    this.hpBar.setPosition(this.x, this.y);
    this.nameLabel.setPosition(this.x, this.y + 35);
    
    // Устанавливаем глубину
    const depth = DEPTHS.npcs;
    this.aura.setDepth(depth);
    this.bodyCircle.setDepth(depth + 1);
    innerGlow.setDepth(depth + 1);
    this.directionIndicator.setDepth(depth + 2);
    icon.setDepth(depth + 3);
    this.hpBarBg.setDepth(depth + 4);
    this.hpBar.setDepth(depth + 5);
    this.nameLabel.setDepth(depth + 5);
    
    // === Интерактивность ===
    this.bodyCircle.setInteractive({ useHandCursor: true });
    
    this.bodyCircle.on('pointerover', () => {
      // Увеличиваем только ауру и иконку, НЕ bodyCircle
      // bodyCircle должен совпадать с физическим хитбоксом!
      scene.tweens.add({ 
        targets: [this.aura, innerGlow, icon, this.nameLabel], 
        scale: 1.15, 
        duration: 150 
      });
    });
    
    this.bodyCircle.on('pointerout', () => {
      scene.tweens.add({ 
        targets: [this.aura, innerGlow, icon, this.nameLabel], 
        scale: 1, 
        duration: 150 
      });
    });
    
    this.bodyCircle.on('pointerdown', () => {
      scene.events.emit('npc:selected', this);
    });
    
    // Обновляем HP бар
    this.updateHpBar();
  }
  
  private getBodyColor(): number {
    // Цвет зависит от disposition
    if (this.disposition < -50) return 0xff4444;  // Враг
    if (this.disposition < 0) return 0xf97316;    // Недружелюбный
    if (this.disposition > 50) return 0x22c55e;   // Дружелюбный
    return 0xfbbf24;                               // Нейтральный
  }
  
  private getSpeciesIcon(): string {
    const icons: Record<string, string> = {
      human: '👤',
      elf: '🧝',
      demon_humanoid: '👹',
      beastkin: '🐺',
      wolf: '🐺',
      tiger: '🐅',
      dragon_beast: '🐉',
      ghost: '👻',
      giant: '🗿',
      dwarf: '⛏️',
    };
    return icons[this.speciesId] || '👤';
  }
  
  // ==================== ОБНОВЛЕНИЕ ПОЗИЦИИ ====================
  
  /**
   * Синхронизирует визуальные элементы с позицией спрайта
   * Вызывается автоматически в update()
   */
  public syncVisualPosition(): void {
    const x = this.x;
    const y = this.y;
    
    this.aura.setPosition(x, y);
    this.bodyCircle.setPosition(x, y);
    this.directionIndicator.setPosition(x + 25, y);
    this.hpBarBg.setPosition(x, y);
    this.hpBar.setPosition(x, y);
    this.nameLabel.setPosition(x, y + 35);
  }
  
  /**
   * Обновляет направление индикатора
   */
  public setDirection(angle: number): void {
    const rad = angle * Math.PI / 180;
    this.directionIndicator.setRotation(rad);
    this.directionIndicator.setPosition(
      this.x + Math.cos(rad) * 25,
      this.y + Math.sin(rad) * 25
    );
  }
  
  // ==================== HP BAR ====================
  
  private updateHpBar(): void {
    this.hpBar.clear();
    const hpPercent = this.hp / this.maxHp;
    
    // Цвет зависит от процента HP
    let color = 0x22c55e;  // Зелёный
    if (hpPercent < 0.25) color = 0xef4444;      // Красный
    else if (hpPercent < 0.5) color = 0xf97316;  // Оранжевый
    else if (hpPercent < 0.75) color = 0xeab308; // Жёлтый
    
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRect(-24, -49, 48 * hpPercent, 4);
  }
  
  // ==================== ВЗАИМОДЕЙСТВИЕ ====================
  
  /**
   * Проверка взаимодействия с игроком
   */
  public checkInteraction(playerX: number, playerY: number): InteractionResult {
    return checkPlayerInteraction(
      {
        position: { x: this.x, y: this.y },
        interactionZones: this.interactionZones,
        personality: {
          canTalk: this.canTalk,
          canTrade: this.canTrade,
          aggressionLevel: this.aggressionLevel,
          fleeThreshold: this.fleeThreshold,
        },
        bodyState: { health: (this.hp / this.maxHp) * 100 },
      } as any,
      { x: playerX, y: playerY }
    );
  }
  
  /**
   * Нанести урон
   */
  public takeDamage(damage: number, type: string = 'normal', sourceId?: string, sourcePosition?: { x: number; y: number }): void {
    if (this.isDead) return;
    
    this.hp = Math.max(0, this.hp - damage);
    this.updateHpBar();
    
    // === Spinal AI: Генерируем сигнал урона ===
    const intensity = damage / this.maxHp;
    const direction = sourcePosition ? {
      x: sourcePosition.x - this.x,
      y: sourcePosition.y - this.y,
    } : undefined;
    
    // Нормализуем направление
    if (direction) {
      const len = Math.sqrt(direction.x * direction.x + direction.y * direction.y) || 1;
      direction.x /= len;
      direction.y /= len;
    }
    
    this.generateSpinalSignal('damage', intensity, direction, sourceId);
    
    // Если урон от Qi атаки
    if (type === 'qi') {
      this.generateSpinalSignal('qi_attack', intensity, direction, sourceId);
    }
    
    // Визуальный эффект
    this.bodyCircle.setFillStyle(0xff4444, 0.9);
    this.scene.time.delayedCall(100, () => {
      if (this.bodyCircle?.active) {
        this.bodyCircle.setFillStyle(this.getBodyColor(), 0.9);
      }
    });
    
    // Отправка события на сервер
    eventBusClient.reportDamageDealt(
      this.npcId,
      'npc',
      type,
      { x: this.x, y: this.y },
      0,
      0,
      1.0
    ).catch(() => {
      // Ignore errors
    });
    
    // Проверка смерти
    if (this.hp <= 0) {
      this.die(sourceId);
    }
  }
  
  /**
   * Смерть NPC
   */
  public die(killerId?: string): void {
    if (this.isDead) return;
    this.isDead = true;
    
    // Сброс Spinal AI
    this.spinalController?.reset();
    
    // Эффект смерти
    this.scene.tweens.add({
      targets: [this.aura, this.bodyCircle, this.directionIndicator, this.nameLabel, this.hpBar, this.hpBarBg],
      alpha: 0,
      scale: 0.5,
      duration: 500,
      onComplete: () => {
        this.destroy();
      },
    });
    
    // Событие смерти (с ID убийцы для Event Bus)
    this.scene.events.emit('npc:death', { npc: this, killerId });
    
    // Отправка события смерти на сервер через Event Bus
    if (killerId) {
      eventBusClient.sendEvent('npc:death', {
        npcId: this.npcId,
        killerId,
        locationId: 'current_location',
      }).catch(() => {
        // Ignore errors
      });
    }
  }
  
  // ==================== ДВИЖЕНИЕ ====================
  
  /**
   * Двигаться к цели
   */
  public moveTo(targetX: number, targetY: number, speed: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      // Нормализуем направление
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Устанавливаем скорость через Arcade Physics
      this.setVelocity(nx * speed, ny * speed);
      
      // Обновляем направление
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      this.setDirection(angle);
    } else {
      this.setVelocity(0, 0);
    }
  }
  
  /**
   * Остановиться
   */
  public stopMovement(): this {
    this.setVelocity(0, 0);
    return this;
  }
  
  // ==================== РАСЧЁТЫ ====================
  
  private calculateCollision(): CollisionConfig {
    const tempNPC = {
      speciesId: this.speciesId,
      roleId: this.roleId,
      cultivation: { level: this.level },
      stats: { vitality: this.vitality, intelligence: this.intelligence },
      speciesType: 'humanoid',
      personality: {
        canTalk: this.canTalk,
        canTrade: this.canTrade,
        aggressionLevel: this.aggressionLevel,
        fleeThreshold: this.fleeThreshold,
      },
    } as any;
    
    return calculateCollisionConfig(tempNPC);
  }
  
  private calculateZones(): InteractionZones {
    const tempNPC = {
      speciesId: this.speciesId,
      roleId: this.roleId,
      cultivation: { level: this.level },
      stats: { vitality: this.vitality, intelligence: this.intelligence },
      speciesType: 'humanoid',
      personality: {
        canTalk: this.canTalk,
        canTrade: this.canTrade,
        aggressionLevel: this.aggressionLevel,
        fleeThreshold: this.fleeThreshold,
      },
    } as any;
    
    return calculateInteractionZones(tempNPC);
  }
  
  // ==================== ОЧИСТКА ====================
  
  destroy(fromScene?: boolean): void {
    // Уничтожаем визуальные элементы с проверкой active
    if (this.aura?.active) this.aura.destroy();
    if (this.bodyCircle?.active) this.bodyCircle.destroy();
    if (this.directionIndicator?.active) this.directionIndicator.destroy();
    if (this.nameLabel?.active) this.nameLabel.destroy();
    if (this.hpBar?.active) this.hpBar.destroy();
    if (this.hpBarBg?.active) this.hpBarBg.destroy();
    
    // Очищаем ссылки
    this.aura = null;
    this.bodyCircle = null;
    this.directionIndicator = null;
    this.nameLabel = null;
    this.hpBar = null;
    this.hpBarBg = null;
    
    super.destroy(fromScene);
  }
}

// ==================== ЭКСПОРТ ТИПОВ ====================

export type { CollisionConfig, InteractionZones, InteractionResult, Position };
