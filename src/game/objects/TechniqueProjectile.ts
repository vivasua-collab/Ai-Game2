/**
 * TechniqueProjectile - Снаряды, лучи и AOE техник
 * 
 * Поддерживает три типа техник:
 * - ranged_projectile: движущийся снаряд
 * - ranged_beam: мгновенный луч
 * - ranged_aoe: область поражения
 * 
 * Использует существующие типы из:
 * - visual-commands.ts (ShowBeamCommand, ShowAoeCommand)
 * - combat-utils.ts (getElementColor)
 * - techniques.ts (CombatSubtype)
 * 
 * @see docs/checkpoints/checkpoint_03_16_colision.md - Этап 4
 */

// @ts-ignore - Phaser namespace import for Next.js/Turbopack compatibility
import * as Phaser from 'phaser';
import { DEPTHS } from '../constants';
import { getElementColor } from '../services/combat-utils';
import type { CombatSubtype } from '@/lib/game/techniques';
import type { DamageElement } from '@/lib/game/events/visual-commands';

// ==================== ТИПЫ ====================

export interface ProjectileConfig {
  // Идентификация
  techniqueId: string;
  ownerId: string;
  
  // Позиция
  x: number;
  y: number;
  
  // Тип
  subtype: CombatSubtype;
  element: DamageElement | string;
  
  // Урон
  damage: number;
  
  // Для снарядов
  velocityX?: number;
  velocityY?: number;
  targetX?: number;
  targetY?: number;
  speed?: number;
  
  // Для лучей и AOE
  aoeRadius?: number;
  beamWidth?: number;
  
  // Длительность
  duration?: number;
  
  // Зоны урона
  damageFalloff?: {
    fullDamage: number;
    halfDamage: number;
    max: number;
  };
  
  // Callback при попадании
  onHit?: (target: Phaser.GameObjects.Sprite, damage: number) => void;
}

// Интерфейс для результатов попадания
export interface HitResult {
  target: Phaser.GameObjects.Sprite;
  damage: number;
  distance: number;
  damageZone: 'full' | 'half' | 'falloff';
}

// ==================== КЛАСС TECHNIQUE PROJECTILE ====================

export class TechniqueProjectile extends Phaser.Physics.Arcade.Sprite {
  // === Идентификация ===
  public techniqueId: string;
  public ownerId: string;
  public subtype: CombatSubtype;
  public element: string;
  
  // === Параметры ===
  public damage: number;
  public damageFalloff?: { fullDamage: number; halfDamage: number; max: number };
  
  // === Состояние ===
  public hasHit: boolean = false;
  public targetsHit: Set<string> = new Set();
  
  // === Визуал ===
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private lifetime: number;
  private elapsed: number = 0;
  
  // === Для лучей ===
  private beamEndX: number = 0;
  private beamEndY: number = 0;
  
  // === Для AOE ===
  private aoeRadius: number = 50;
  
  // === Callback ===
  private onHitCallback?: (target: Phaser.GameObjects.Sprite, damage: number) => void;

  constructor(scene: Phaser.Scene, config: ProjectileConfig) {
    super(scene, config.x, config.y, '__DEFAULT');
    
    this.techniqueId = config.techniqueId;
    this.ownerId = config.ownerId;
    this.subtype = config.subtype;
    this.element = config.element;
    this.damage = config.damage;
    this.damageFalloff = config.damageFalloff;
    this.onHitCallback = config.onHit;
    
    // Длительность по умолчанию
    this.lifetime = config.duration ?? this.getDefaultDuration();
    
    // Добавляем в сцену и физику
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Скрываем базовый спрайт
    this.setAlpha(0);
    
    // Настраиваем по типу
    this.setupBySubtype(config);
    
    console.log(`[TechniqueProjectile] Created ${this.subtype} at (${this.x}, ${this.y})`);
  }
  
  // ==================== НАСТРОЙКА ПО ТИПУ ====================
  
  private setupBySubtype(config: ProjectileConfig): void {
    const color = getElementColor(this.element);
    
    switch (this.subtype) {
      case 'ranged_projectile':
        this.setupProjectile(config, color);
        break;
        
      case 'ranged_beam':
        this.setupBeam(config, color);
        break;
        
      case 'ranged_aoe':
        this.setupAOE(config, color);
        break;
        
      default:
        console.warn(`[TechniqueProjectile] Unknown subtype: ${this.subtype}`);
        this.setupProjectile(config, color);
    }
  }
  
  private getDefaultDuration(): number {
    switch (this.subtype) {
      case 'ranged_projectile': return 3000;  // 3 секунды
      case 'ranged_beam': return 200;         // 200 мс
      case 'ranged_aoe': return 500;          // 500 мс
      default: return 1000;
    }
  }
  
  // ==================== СНАРЯД ====================
  
  private setupProjectile(config: ProjectileConfig, color: number): void {
    // Физическое тело
    const radius = 8;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const SPRITE_HALF = 16; // __DEFAULT = 32×32, origin = 0.5
    
    // ВАЖНО: setCircle() НЕ центрирует автоматически! Нужен offset!
    // offset = halfSize - radius
    body.setCircle(
      radius,
      SPRITE_HALF - radius,  // offsetX
      SPRITE_HALF - radius   // offsetY
    );
    
    // Скорость
    const speed = config.speed ?? 400;
    
    if (config.velocityX !== undefined && config.velocityY !== undefined) {
      this.setVelocity(config.velocityX * speed, config.velocityY * speed);
    } else if (config.targetX !== undefined && config.targetY !== undefined) {
      // Направление к цели
      const dx = config.targetX - this.x;
      const dy = config.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        this.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      }
    }
    
    // Визуал
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(DEPTHS.effects);
    
    // Основной снаряд
    this.graphics.fillStyle(color, 0.9);
    this.graphics.fillCircle(0, 0, radius);
    
    // Внешнее свечение
    this.graphics.fillStyle(color, 0.3);
    this.graphics.fillCircle(0, 0, radius * 2);
    
    // След
    this.graphics.lineStyle(2, color, 0.5);
    this.graphics.beginPath();
    this.graphics.moveTo(0, 0);
    this.graphics.lineTo(-20, 0);
    this.graphics.strokePath();
  }
  
  // ==================== ЛУЧ ====================
  
  private setupBeam(config: ProjectileConfig, color: number): void {
    // ВАЖНО: Arcade Physics НЕ поддерживает повёрнутые прямоугольники!
    // Решение: выключаем физику, используем ручную проверку пересечения отрезка с кругом NPC
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setEnable(false);  // Выключаем физику - проверяем вручную
    
    this.setVelocity(0, 0);
    
    // Цель луча
    this.beamEndX = config.targetX ?? this.x + 100;
    this.beamEndY = config.targetY ?? this.y;
    
    // Радиус луча (толщина)
    const beamWidth = config.beamWidth ?? 6;
    
    // Визуал луча
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(DEPTHS.effects);
    
    const dx = this.beamEndX - this.x;
    const dy = this.beamEndY - this.y;
    
    // Внешнее свечение
    this.graphics.lineStyle(beamWidth * 2, color, 0.3);
    this.graphics.beginPath();
    this.graphics.moveTo(0, 0);
    this.graphics.lineTo(dx, dy);
    this.graphics.strokePath();
    
    // Основной луч
    this.graphics.lineStyle(beamWidth, color, 0.8);
    this.graphics.beginPath();
    this.graphics.moveTo(0, 0);
    this.graphics.lineTo(dx, dy);
    this.graphics.strokePath();
    
    // Начальная точка (яркая)
    this.graphics.fillStyle(0xffffff, 0.9);
    this.graphics.fillCircle(0, 0, beamWidth);
    
    // Конечная точка
    this.graphics.fillStyle(color, 0.7);
    this.graphics.fillCircle(dx, dy, beamWidth * 1.5);
    
    console.log(`[Beam] Created beam from (${this.x}, ${this.y}) to (${this.beamEndX}, ${this.beamEndY}), physics disabled`);
  }
  
  /**
   * Проверка пересечения луча с NPC (ручная, вместо физической коллизии)
   * Алгоритм: пересечение отрезка с кругом
   */
  public checkBeamCollision(npc: { x: number; y: number; hitboxRadius: number }): HitResult | null {
    const ax = this.x, ay = this.y;
    const bx = this.beamEndX, by = this.beamEndY;
    const cx = npc.x, cy = npc.y;
    const r = npc.hitboxRadius;
    
    // Алгоритм пересечения отрезка с кругом
    const dx = bx - ax, dy = by - ay;
    const fx = ax - cx, fy = ay - cy;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    
    // Если a = 0, отрезок вырожден в точку
    if (a === 0) {
      const dist = Math.sqrt(fx * fx + fy * fy);
      if (dist <= r) {
        return {
          target: npc as Phaser.GameObjects.Sprite,
          damage: this.damage,
          distance: dist,
          damageZone: 'full'
        };
      }
      return null;
    }
    
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) return null;  // Нет пересечения
    
    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);
    
    // Проверяем, попадает ли хотя бы одна точка в отрезок [0, 1]
    const t = t1 >= 0 && t1 <= 1 ? t1 : (t2 >= 0 && t2 <= 1 ? t2 : null);
    if (t === null) return null;
    
    const distance = t * Math.sqrt(a);
    
    return {
      target: npc as Phaser.GameObjects.Sprite,
      damage: this.damage,
      distance,
      damageZone: 'full'
    };
  }
  
  // ==================== AOE ====================
  
  private setupAOE(config: ProjectileConfig, color: number): void {
    // AOE - статическая область
    this.aoeRadius = config.aoeRadius ?? 50;
    
    // Круглый хитбокс с правильным offset
    const body = this.body as Phaser.Physics.Arcade.Body;
    const SPRITE_HALF = 16; // __DEFAULT = 32×32, origin = 0.5
    
    // ВАЖНО: setCircle() НЕ центрирует автоматически! Нужен offset!
    body.setCircle(
      this.aoeRadius,
      SPRITE_HALF - this.aoeRadius,  // offsetX
      SPRITE_HALF - this.aoeRadius   // offsetY
    );
    this.setVelocity(0, 0);
    
    // Визуал AOE
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(DEPTHS.effects);
    
    // Если есть зоны урона - показываем
    if (this.damageFalloff && config.damageFalloff) {
      const { fullDamage, halfDamage, max } = this.damageFalloff;
      
      // Внешний круг (max range)
      this.graphics.lineStyle(2, color, 0.2);
      this.graphics.strokeCircle(0, 0, max);
      
      // Средний круг (half damage)
      this.graphics.lineStyle(2, color, 0.4);
      this.graphics.strokeCircle(0, 0, halfDamage);
      
      // Внутренний круг (full damage)
      this.graphics.fillStyle(color, 0.3);
      this.graphics.fillCircle(0, 0, fullDamage);
    } else {
      // Простой AOE без зон
      // Внешний круг
      this.graphics.lineStyle(2, color, 0.3);
      this.graphics.strokeCircle(0, 0, this.aoeRadius);
      
      // Внутренняя заливка
      this.graphics.fillStyle(color, 0.2);
      this.graphics.fillCircle(0, 0, this.aoeRadius);
      
      // Яркое ядро
      this.graphics.fillStyle(color, 0.4);
      this.graphics.fillCircle(0, 0, this.aoeRadius * 0.4);
    }
  }
  
  // ==================== ОБНОВЛЕНИЕ ====================
  
  /**
   * Обновить снаряд (вызывать в update сцены)
   */
  update(delta: number): void {
    if (this.hasHit && this.subtype !== 'ranged_aoe') {
      // Снаряды уничтожаются после первого попадания
      return;
    }
    
    this.elapsed += delta;
    
    // Синхронизируем графику с позицией
    if (this.graphics) {
      this.graphics.setPosition(this.x, this.y);
    }
    
    // Проверяем время жизни
    if (this.elapsed >= this.lifetime) {
      this.fadeOut();
    }
  }
  
  /**
   * Плавное исчезновение
   */
  private fadeOut(): void {
    if (!this.graphics) {
      this.destroy();
      return;
    }
    
    this.scene.tweens.add({
      targets: this.graphics,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.destroy();
      },
    });
  }
  
  // ==================== ПОПАДАНИЕ ====================
  
  /**
   * Обработать попадание по цели
   */
  hit(target: Phaser.GameObjects.Sprite): HitResult | null {
    // Проверяем, не попадали ли уже по этой цели
    const targetId = (target as any).npcId || (target as any).id;
    if (this.targetsHit.has(targetId)) {
      return null;
    }
    
    this.targetsHit.add(targetId);
    
    // Рассчитываем урон
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let damage = this.damage;
    let damageZone: 'full' | 'half' | 'falloff' = 'full';
    
    if (this.damageFalloff) {
      const { fullDamage, halfDamage, max } = this.damageFalloff;
      
      if (distance <= fullDamage) {
        damage = this.damage;
        damageZone = 'full';
      } else if (distance <= halfDamage) {
        damage = this.damage * 0.5;
        damageZone = 'half';
      } else if (distance <= max) {
        // Линейное затухание
        const falloffDist = distance - halfDamage;
        const totalFalloffRange = max - halfDamage;
        const falloffMult = Math.max(0, 0.5 * (1 - falloffDist / totalFalloffRange));
        damage = this.damage * falloffMult;
        damageZone = 'falloff';
      } else {
        return null; // Вне радиуса
      }
    }
    
    // Для снарядов - уничтожаем после первого попадания
    if (this.subtype === 'ranged_projectile') {
      this.hasHit = true;
    }
    
    // Callback
    if (this.onHitCallback) {
      this.onHitCallback(target, Math.floor(damage));
    }
    
    return {
      target,
      damage: Math.floor(damage),
      distance,
      damageZone,
    };
  }
  
  /**
   * Множественное попадание (для AOE)
   */
  hitMultiple(targets: Phaser.GameObjects.Sprite[]): HitResult[] {
    const results: HitResult[] = [];
    
    for (const target of targets) {
      const result = this.hit(target);
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }
  
  // ==================== ИНФОРМАЦИЯ ====================
  
  /**
   * Получить радиус поражения
   */
  getEffectiveRadius(): number {
    switch (this.subtype) {
      case 'ranged_projectile':
        return 8; // Радиус снаряда
      
      case 'ranged_beam':
        // Длина луча
        const dx = this.beamEndX - this.x;
        const dy = this.beamEndY - this.y;
        return Math.sqrt(dx * dx + dy * dy);
      
      case 'ranged_aoe':
        return this.aoeRadius;
      
      default:
        return 10;
    }
  }
  
  /**
   * Проверка, активен ли снаряд
   */
  isActive(): boolean {
    return !this.hasHit && this.elapsed < this.lifetime;
  }
  
  // ==================== ОЧИСТКА ====================
  
  destroy(fromScene?: boolean): void {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    
    super.destroy(fromScene);
  }
}

// ==================== ФАБРИКА СНАРЯДОВ ====================

/**
 * Создать снаряд техники
 */
export function createTechniqueProjectile(
  scene: Phaser.Scene,
  config: ProjectileConfig
): TechniqueProjectile {
  return new TechniqueProjectile(scene, config);
}

/**
 * Создать группу снарядов
 */
export function createProjectileGroup(
  scene: Phaser.Scene
): Phaser.Physics.Arcade.Group {
  return scene.physics.add.group({
    classType: TechniqueProjectile,
    runChildUpdate: false,  // ВАЖНО: update() вызывается вручную через ProjectileManager
  });
}
