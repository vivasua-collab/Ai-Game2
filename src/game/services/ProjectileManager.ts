/**
 * ============================================================================
 * PROJECTILE MANAGER - Менеджер снарядов техник
 * ============================================================================
 * 
 * Управляет созданием, обновлением и коллизиями снарядов техник.
 * 
 * Интегрирует:
 * - TechniqueProjectile (снаряды, лучи, AOE, конусы)
 * - NPCGroup (коллизии с NPC)
 * - Event Bus (синхронизация урона с сервером)
 * 
 * Версия: 1.0.0
 */

// @ts-ignore - Phaser namespace import for Next.js/Turbopack compatibility
import * as Phaser from 'phaser';
import { 
  TechniqueProjectile, 
  createProjectileGroup, 
  type ProjectileConfig,
  type HitResult 
} from '../objects/TechniqueProjectile';
import { NPCGroup } from '../groups/NPCGroup';
import { NPCSprite } from '../objects/NPCSprite';
import { eventBusClient } from '@/lib/game/event-bus/client';
import { getElementColor } from './combat-utils';
import { DEPTHS } from '../constants';
import type { CombatSubtype } from '@/lib/game/techniques';
import type { DamageElement } from '@/lib/game/events/visual-commands';

// ==================== ТИПЫ ====================

export interface TechniqueFiredEvent {
  techniqueId: string;
  ownerId: string;
  damage: number;
  element: string;
  subtype: CombatSubtype;
  position: { x: number; y: number };
  target?: { x: number; y: number };
}

export interface ProjectileHitEvent {
  projectile: TechniqueProjectile;
  target: NPCSprite;
  hitResult: HitResult;
}

export interface ProjectileManagerConfig {
  scene: Phaser.Scene;
  npcGroup: NPCGroup;
  onHit?: (event: ProjectileHitEvent) => void;
  onFire?: (event: TechniqueFiredEvent) => void;
}

// ==================== КЛАСС PROJECTILE MANAGER ====================

export class ProjectileManager {
  private scene: Phaser.Scene;
  private npcGroup: NPCGroup;
  private projectileGroup!: Phaser.Physics.Arcade.Group;
  private playerProjectiles: TechniqueProjectile[] = [];
  
  // Callbacks
  private onHitCallback?: (event: ProjectileHitEvent) => void;
  private onFireCallback?: (event: TechniqueFiredEvent) => void;
  
  // Коллизии
  private npcCollider: Phaser.Physics.Arcade.Collider | null = null;
  
  // Счётчик ID
  private projectileIdCounter = 0;

  constructor(config: ProjectileManagerConfig) {
    this.scene = config.scene;
    this.npcGroup = config.npcGroup;
    this.onHitCallback = config.onHit;
    this.onFireCallback = config.onFire;
    
    // Создаём группу снарядов
    this.projectileGroup = createProjectileGroup(this.scene);
    
    // Настраиваем коллизии
    this.setupCollision();
    
    console.log('[ProjectileManager] Initialized');
  }
  
  // ==================== КОЛЛИЗИИ ====================
  
  /**
   * Настроить коллизию снарядов с NPC
   */
  private setupCollision(): void {
    this.npcCollider = this.npcGroup.setProjectileCollision(
      this.projectileGroup,
      (projectile, npc) => this.onProjectileHit(projectile, npc)
    );
    
    console.log('[ProjectileManager] Collision setup complete');
  }
  
  /**
   * Обработка попадания снаряда по NPC
   * 
   * ВАЖНО: Урон применяется на СЕРВЕРЕ, клиент только отображает!
   * Отправляем player:attack на WebSocket сервер.
   */
  private onProjectileHit(
    projectile: Phaser.Physics.Arcade.Sprite,
    npc: NPCSprite
  ): void {
    const proj = projectile as TechniqueProjectile;
    
    // Проверяем попадание через hit() метод снаряда
    const hitResult = proj.hit(npc);
    
    if (hitResult) {
      console.log(`[ProjectileManager] Hit: ${proj.techniqueId} → ${npc.npcName} for ${hitResult.damage} damage (${hitResult.damageZone})`);
      
      // === ВАЖНО: Урон отправляется на СЕРВЕР через HTTP API ===
      // Combat API применит урон и вернёт новое HP
      this.sendDamageToCombatAPI(npc, proj, hitResult);
      
      // Визуальный эффект попадания
      this.showHitEffect(npc.x, npc.y, proj.element);
      
      // Показываем число урона
      this.showDamageNumber(npc.x, npc.y - 30, hitResult.damage, proj.element);
      
      // Отправляем событие на сервер через Event Bus (для истории)
      this.reportDamageToServer(npc, proj, hitResult);
      
      // Callback
      if (this.onHitCallback) {
        this.onHitCallback({
          projectile: proj,
          target: npc,
          hitResult,
        });
      }
    }
  }
  
  /**
   * Отправить отчёт об уроне на сервер
   * 
   * ВАЖНО: Сервер возвращает npcAction - действие, которое должен выполнить NPC!
   * Это серверная логика управления NPC.
   */
  private async reportDamageToServer(
    npc: NPCSprite,
    projectile: TechniqueProjectile,
    hitResult: HitResult
  ): Promise<void> {
    try {
      // Рассчитываем множитель урона по зоне
      const damageMultiplier = hitResult.damageZone === 'full' ? 1.0 
        : hitResult.damageZone === 'half' ? 0.5 
        : 0.25; // falloff zone
      
      const response = await eventBusClient.reportDamageDealt(
        npc.npcId,
        'npc',
        projectile.techniqueId,
        { x: npc.x, y: npc.y },
        hitResult.distance,
        0, // rotation - не важен для сервера
        damageMultiplier
      );

      // === ОБРАБАТЫВАЕМ NPC ACTION ИЗ ОТВЕТА СЕРВЕРА ===
      // Это серверная логика управления NPC!
      if (response.success && response.data) {
        const data = response.data as {
          npcAction?: {
            type: string;
            target?: { x: number; y: number } | string;
            params?: Record<string, unknown>;
            startTime: number;
            duration: number;
          };
          newHealth?: number;
          maxHealth?: number;
          isDead?: boolean;
        };

        // Обновляем HP NPC из ответа сервера
        if (data.newHealth !== undefined) {
          npc.applyServerUpdate({
            health: data.newHealth,
            maxHp: data.maxHealth,
          });
        }

        // Выполняем действие NPC (серверная логика!)
        if (data.npcAction && !data.isDead) {
          console.log(`[ProjectileManager] Server sent NPC action: ${data.npcAction.type}`);
          npc.executeServerAction(data.npcAction);
        }
      }
    } catch (error) {
      console.warn('[ProjectileManager] Failed to report damage:', error);
    }
  }
  
  /**
   * Отправить урон на Combat API (HTTP)
   * 
   * Заменяет WebSocket player:attack на HTTP запрос к /api/combat
   */
  private async sendDamageToCombatAPI(
    npc: NPCSprite,
    projectile: TechniqueProjectile,
    hitResult: HitResult
  ): Promise<void> {
    try {
      const response = await fetch('/api/combat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'combat:hit',
          attackerId: 'player',
          targetId: npc.npcId,
          damage: hitResult.damage,
          techniqueLevel: 1, // TODO: get from technique
          attackerLevel: 1,  // TODO: get from player
          element: projectile.element,
          isUltimate: false,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Обновляем HP NPC из ответа сервера
          if (result.targetHp !== undefined) {
            npc.currentHp = result.targetHp;
            npc.updateHpBar();
          }
          
          // NPC умер
          if (result.isDead) {
            npc.onDeath();
          }
          
          console.log(`[ProjectileManager] Combat API confirmed: ${hitResult.damage} damage, HP: ${result.targetHp}`);
        }
      } else {
        // Fallback: применяем урон локально
        console.warn('[ProjectileManager] Combat API failed, applying damage locally');
        npc.takeDamage(hitResult.damage, projectile.element);
      }
    } catch (error) {
      console.warn('[ProjectileManager] Combat API error:', error);
      // Fallback: применяем урон локально
      npc.takeDamage(hitResult.damage, projectile.element);
    }
  }
  
  // ==================== СОЗДАНИЕ СНАРЯДОВ ====================
  
  /**
   * Создать снаряд с полной конфигурацией
   */
  fire(config: ProjectileConfig): TechniqueProjectile {
    const projectile = new TechniqueProjectile(this.scene, config);
    this.projectileGroup.add(projectile);
    this.playerProjectiles.push(projectile);
    
    // Автоудаление при уничтожении
    projectile.once('destroy', () => {
      const idx = this.playerProjectiles.indexOf(projectile);
      if (idx >= 0) {
        this.playerProjectiles.splice(idx, 1);
      }
    });
    
    // Callback
    if (this.onFireCallback) {
      this.onFireCallback({
        techniqueId: config.techniqueId,
        ownerId: config.ownerId,
        damage: config.damage,
        element: config.element,
        subtype: config.subtype,
        position: { x: config.x, y: config.y },
        target: config.targetX !== undefined && config.targetY !== undefined
          ? { x: config.targetX, y: config.targetY }
          : undefined,
      });
    }
    
    console.log(`[ProjectileManager] Fired: ${config.subtype} (${config.techniqueId})`);
    return projectile;
  }
  
  /**
   * Создать снаряд от игрока к точке
   */
  fireFromPlayer(
    playerX: number,
    playerY: number,
    targetX: number,
    targetY: number,
    technique: {
      id: string;
      damage: number;
      subtype: CombatSubtype;
      element: string;
      range?: { fullDamage: number; halfDamage: number; max: number };
    }
  ): TechniqueProjectile {
    const dx = targetX - playerX;
    const dy = targetY - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Нормализованное направление
    const velocityX = distance > 0 ? dx / distance : 0;
    const velocityY = distance > 0 ? dy / distance : 0;
    
    return this.fire({
      techniqueId: technique.id,
      ownerId: 'player',
      x: playerX,
      y: playerY,
      targetX,
      targetY,
      velocityX,
      velocityY,
      damage: technique.damage,
      subtype: technique.subtype,
      element: technique.element as DamageElement,
      damageFalloff: technique.range,
    });
  }
  
  /**
   * Создать AOE технику в точке
   */
  fireAOE(
    x: number,
    y: number,
    technique: {
      id: string;
      damage: number;
      element: string;
      radius: number;
      range?: { fullDamage: number; halfDamage: number; max: number };
    }
  ): TechniqueProjectile {
    return this.fire({
      techniqueId: technique.id,
      ownerId: 'player',
      x,
      y,
      damage: technique.damage,
      subtype: 'ranged_aoe',
      element: technique.element as DamageElement,
      aoeRadius: technique.radius,
      damageFalloff: technique.range,
    });
  }
  
  /**
   * Создать луч от игрока к точке
   */
  fireBeam(
    playerX: number,
    playerY: number,
    targetX: number,
    targetY: number,
    technique: {
      id: string;
      damage: number;
      element: string;
      width?: number;
    }
  ): TechniqueProjectile {
    return this.fire({
      techniqueId: technique.id,
      ownerId: 'player',
      x: playerX,
      y: playerY,
      targetX,
      targetY,
      damage: technique.damage,
      subtype: 'ranged_beam',
      element: technique.element as DamageElement,
      beamWidth: technique.width ?? 6,
    });
  }
  
  // ==================== ВИЗУАЛЬНЫЕ ЭФФЕКТЫ ====================
  
  /**
   * Показать эффект попадания
   */
  private showHitEffect(x: number, y: number, element: string): void {
    const color = getElementColor(element);
    
    // Круговая вспышка
    const flash = this.scene.add.circle(x, y, 20, color, 0.8);
    flash.setDepth(DEPTHS.effects);
    
    this.scene.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
    
    // Частицы
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i;
      const particle = this.scene.add.circle(
        x + Math.cos(angle) * 10,
        y + Math.sin(angle) * 10,
        4,
        color,
        0.6
      );
      particle.setDepth(DEPTHS.effects);
      
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 30,
        y: y + Math.sin(angle) * 30,
        alpha: 0,
        duration: 300,
        onComplete: () => particle.destroy(),
      });
    }
  }
  
  /**
   * Показать число урона
   */
  private showDamageNumber(x: number, y: number, damage: number, element: string): void {
    const colors: Record<string, string> = {
      fire: '#FF6622',
      water: '#4488FF',
      earth: '#886622',
      air: '#AACCFF',
      lightning: '#FFFF00',
      void: '#9944FF',
      neutral: '#4ADE80',
    };
    
    const color = colors[element] || colors.neutral;
    
    const text = this.scene.add.text(x, y, damage.toString(), {
      fontSize: '18px',
      fontFamily: 'Arial',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTHS.effects + 10);
    
    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      scale: 1.2,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }
  
  // ==================== ОБНОВЛЕНИЕ ====================
  
  /**
   * Обновить все снаряды (вызывать в update сцены)
   * 
   * ВАЖНО: Для лучей (ranged_beam) используется ручная проверка коллизии,
   * так как Arcade Physics не поддерживает повёрнутые прямоугольники.
   */
  update(delta: number): void {
    for (const projectile of this.playerProjectiles) {
      projectile.update(delta);
      
      // Ручная проверка коллизии для лучей
      if (projectile.subtype === 'ranged_beam' && projectile.isActive()) {
        this.checkBeamCollisions(projectile);
      }
    }
  }
  
  /**
   * Проверка попадания луча по всем NPC
   */
  private checkBeamCollisions(beam: TechniqueProjectile): void {
    const npcs = this.npcGroup.getAll();
    
    for (const npc of npcs) {
      const hitResult = beam.checkBeamCollision({
        x: npc.x,
        y: npc.y,
        hitboxRadius: npc.hitboxRadius
      });
      
      if (hitResult) {
        this.onProjectileHit(beam, npc);
      }
    }
  }
  
  // ==================== ИНФОРМАЦИЯ ====================
  
  /**
   * Количество активных снарядов
   */
  get activeCount(): number {
    return this.playerProjectiles.length;
  }
  
  /**
   * Получить все активные снаряды
   */
  getActiveProjectiles(): TechniqueProjectile[] {
    return [...this.playerProjectiles];
  }
  
  // ==================== ОЧИСТКА ====================
  
  /**
   * Уничтожить все снаряды
   */
  clear(): void {
    for (const projectile of this.playerProjectiles) {
      projectile.destroy();
    }
    this.playerProjectiles = [];
  }
  
  /**
   * Полное уничтожение менеджера
   */
  destroy(): void {
    if (this.npcCollider) {
      this.npcCollider.destroy();
      this.npcCollider = null;
    }
    
    this.clear();
    
    console.log('[ProjectileManager] Destroyed');
  }
}

// ==================== ФАБРИКА ====================

/**
 * Создать ProjectileManager
 */
export function createProjectileManager(
  config: ProjectileManagerConfig
): ProjectileManager {
  return new ProjectileManager(config);
}

export default ProjectileManager;
