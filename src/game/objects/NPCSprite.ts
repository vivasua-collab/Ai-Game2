/**
 * NPCSprite - Phaser спрайт NPC с физическим телом
 * 
 * Интегрирует:
 * - Arcade Physics для коллизий
 * - Существующую систему npc-collision.ts
 * - Типы из temp-npc.ts
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
    
    console.log(`[NPCSprite] Created NPC "${this.npcName}" at (${this.x}, ${this.y}) with hitbox radius ${this.hitboxRadius}`);
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
  public takeDamage(damage: number, type: string = 'normal'): void {
    if (this.isDead) return;
    
    this.hp = Math.max(0, this.hp - damage);
    this.updateHpBar();
    
    // Визуальный эффект
    this.bodyCircle.setFillStyle(0xff4444, 0.9);
    this.scene.time.delayedCall(100, () => {
      this.bodyCircle.setFillStyle(this.getBodyColor(), 0.9);
    });
    
    // Отправка события на сервер
    eventBusClient.reportDamageDealt(
      this.npcId,
      'npc',
      'technique',
      { x: this.x, y: this.y },
      0,
      0,
      1.0
    ).catch(() => {
      // Ignore errors
    });
    
    // Проверка смерти
    if (this.hp <= 0) {
      this.die();
    }
  }
  
  /**
   * Смерть NPC
   */
  public die(): void {
    if (this.isDead) return;
    this.isDead = true;
    
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
    
    // Событие смерти
    this.scene.events.emit('npc:death', this);
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
