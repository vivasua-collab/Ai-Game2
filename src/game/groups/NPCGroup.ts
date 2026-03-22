/**
 * NPCGroup - Группа NPC с физикой Arcade
 * 
 * Управляет множеством NPCSprite и обеспечивает:
 * - Групповые коллизии с игроком
 * - Коллизии NPC-NPC
 * - Обновление всех NPC в группе
 * - Быстрое добавление/удаление NPC
 * 
 * Phaser 3 Arcade Physics Groups:
 * - this.physics.add.group() - создаёт физическую группу
 * - this.physics.add.collider(group, target) - коллизия группы с целью
 * - this.physics.add.overlap(group, target) - обнаружение перекрытия
 * 
 * @see https://docs.phaser.io/api-documentation/namespace/Physics-Arcade#class-Group
 */

// @ts-ignore - Phaser namespace import for Next.js/Turbopack compatibility
import * as Phaser from 'phaser';
import { NPCSprite, type NPCSpriteConfig } from '../objects/NPCSprite';

// ==================== ТИПЫ ====================

export interface NPCGroupConfig {
  scene: Phaser.Scene;
  collideWorldBounds?: boolean;
  bounce?: number;
}

// Интерфейс для результатов коллизии
export interface CollisionCallbackData {
  npc: NPCSprite;
  target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
  offsetX: number;
  offsetY: number;
}

// ==================== КЛАСС NPC GROUP ====================

export class NPCGroup {
  private scene: Phaser.Scene;
  private group: Phaser.Physics.Arcade.Group;
  private npcs: Map<string, NPCSprite> = new Map();
  
  // Настройки
  private collideWorldBounds: boolean;
  private bounce: number;
  
  // Коллизии
  private playerCollider: Phaser.Physics.Arcade.Collider | null = null;
  private playerOverlap: Phaser.Physics.Arcade.Collider | null = null;
  private internalCollider: Phaser.Physics.Arcade.Collider | null = null;
  
  // Callbacks
  private onPlayerCollide: ((data: CollisionCallbackData) => void) | null = null;
  private onPlayerOverlap: ((data: CollisionCallbackData) => void) | null = null;

  constructor(config: NPCGroupConfig) {
    this.scene = config.scene;
    this.collideWorldBounds = config.collideWorldBounds ?? true;
    this.bounce = config.bounce ?? 0;
    
    // Создаём Arcade Physics Group
    this.group = this.scene.physics.add.group({
      collideWorldBounds: this.collideWorldBounds,
      bounceX: this.bounce,
      bounceY: this.bounce,
      // Не проверяем коллизии автоматически - делаем вручную через colliders
    });
    
    console.log('[NPCGroup] Created physics group');
  }
  
  // ==================== УПРАВЛЕНИЕ NPC ====================
  
  /**
   * Добавить NPC в группу
   * 
   * ВАЖНО: Physics Group создаёт тело при добавлении,
   * поэтому configurePhysicsBody() вызывается ПОСЛЕ add()
   */
  add(npc: NPCSprite): void {
    if (this.npcs.has(npc.npcId)) {
      console.warn(`[NPCGroup] NPC ${npc.npcId} already in group`);
      return;
    }
    
    // Добавляем в Phaser группу - это создаёт физическое тело
    this.group.add(npc);
    this.npcs.set(npc.npcId, npc);
    
    // Настраиваем физическое тело ПОСЛЕ добавления в группу
    // Это исправляет конфликт с physics.add.existing()
    npc.configurePhysicsBody();
    
    console.log(`[NPCGroup] Added NPC "${npc.npcName}" (${npc.npcId})`);
  }
  
  /**
   * Создать и добавить NPC
   */
  create(config: NPCSpriteConfig): NPCSprite {
    const npc = new NPCSprite(this.scene, config);
    this.add(npc);
    return npc;
  }
  
  /**
   * Удалить NPC из группы
   */
  remove(npcId: string): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;
    
    this.group.remove(npc, true, false);
    this.npcs.delete(npcId);
    
    console.log(`[NPCGroup] Removed NPC "${npcId}"`);
  }
  
  /**
   * Получить NPC по ID
   */
  get(npcId: string): NPCSprite | undefined {
    return this.npcs.get(npcId);
  }
  
  /**
   * Получить всех NPC
   */
  getAll(): NPCSprite[] {
    return Array.from(this.npcs.values());
  }
  
  /**
   * Количество NPC
   */
  get size(): number {
    return this.npcs.size;
  }
  
  /**
   * Получить внутреннюю Phaser группу (для debug и расширенных операций)
   */
  public getGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }
  
  /**
   * Проверить, содержит ли группа объект
   */
  public contains(npc: NPCSprite): boolean {
    return this.group.contains(npc);
  }
  
  /**
   * Получить размер Phaser группы
   */
  public getPhaserGroupSize(): number {
    return this.group.getLength();
  }
  
  // ==================== КОЛЛИЗИИ ====================
  
  /**
   * Настроить коллизию с игроком
   * 
   * collider - физическая коллизия с выталкиванием
   * overlap - обнаружение перекрытия (без физики)
   */
  setPlayerCollision(
    player: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container,
    options?: {
      collide?: boolean;      // Физическая коллизия
      overlap?: boolean;      // Обнаружение перекрытия
      onCollide?: (data: CollisionCallbackData) => void;
      onOverlap?: (data: CollisionCallbackData) => void;
    }
  ): void {
    const opts = {
      collide: options?.collide ?? true,
      overlap: options?.overlap ?? false,
      onCollide: options?.onCollide,
      onOverlap: options?.onOverlap,
    };
    
    // Удаляем старые коллизии
    this.clearPlayerCollision();
    
    // Физическая коллизия с callback
    if (opts.collide) {
      this.onPlayerCollide = opts.onCollide ?? null;
      
      // ВАЖНО: Передаём callback для обработки игровой логики
      this.playerCollider = this.scene.physics.add.collider(
        player,
        this.group,
        (playerObj, npcObj) => this.handlePlayerCollision(playerObj, npcObj, 'collide'),
        undefined,
        this
      );
      
      console.log('[NPCGroup] Player collider enabled with callback');
    }
    
    // Обнаружение перекрытия с callback
    if (opts.overlap) {
      this.onPlayerOverlap = opts.onOverlap ?? null;
      
      // ВАЖНО: Передаём callback для обработки перекрытия
      this.playerOverlap = this.scene.physics.add.overlap(
        player,
        this.group,
        (playerObj, npcObj) => this.handlePlayerCollision(playerObj, npcObj, 'overlap'),
        undefined,
        this
      );
      
      console.log('[NPCGroup] Player overlap enabled with callback');
    }
  }
  
  /**
   * Очистить коллизии с игроком
   */
  clearPlayerCollision(): void {
    if (this.playerCollider) {
      this.playerCollider.destroy();
      this.playerCollider = null;
    }
    if (this.playerOverlap) {
      this.playerOverlap.destroy();
      this.playerOverlap = null;
    }
  }
  
  /**
   * Настроить внутренние коллизии NPC-NPC
   */
  setInternalCollision(enabled: boolean): void {
    if (this.internalCollider) {
      this.internalCollider.destroy();
      this.internalCollider = null;
    }
    
    if (enabled) {
      this.internalCollider = this.scene.physics.add.collider(
        this.group,
        this.group,
        undefined,
        undefined,
        this
      );
      
      console.log('[NPCGroup] Internal NPC-NPC collision enabled');
    }
  }
  
  /**
   * Обработчик коллизии с игроком
   */
  private handlePlayerCollision(
    obj1: Phaser.GameObjects.GameObject,
    obj2: Phaser.GameObjects.GameObject,
    type: 'collide' | 'overlap'
  ): void {
    // Определяем, какой объект - NPC
    let npc: NPCSprite | null = null;
    let target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container | null = null;
    
    if (obj1 instanceof NPCSprite) {
      npc = obj1;
      target = obj2 as Phaser.GameObjects.Sprite;
    } else if (obj2 instanceof NPCSprite) {
      npc = obj2;
      target = obj1 as Phaser.GameObjects.Sprite;
    }
    
    if (!npc || !target) return;
    
    const callback = type === 'collide' ? this.onPlayerCollide : this.onPlayerOverlap;
    
    if (callback) {
      callback({
        npc,
        target,
        offsetX: 0,
        offsetY: 0,
      });
    }
    
    // Эмитим событие для сцены
    this.scene.events.emit('npc:playerCollision', {
      npc,
      target,
      type,
    });
  }
  
  // ==================== КОЛЛИЗИИ СНАРЯДОВ ====================
  
  /**
   * Настроить коллизию с группой снарядов
   */
  setProjectileCollision(
    projectileGroup: Phaser.Physics.Arcade.Group,
    onHit: (projectile: Phaser.Physics.Arcade.Sprite, npc: NPCSprite) => void
  ): Phaser.Physics.Arcade.Collider {
    return this.scene.physics.add.overlap(
      projectileGroup,
      this.group,
      (proj, npc) => {
        if (npc instanceof NPCSprite) {
          onHit(proj as Phaser.Physics.Arcade.Sprite, npc);
        }
      },
      undefined,
      this
    );
  }
  
  // ==================== ОБНОВЛЕНИЕ ====================
  
  /**
   * Обновить всех NPC (вызывать в update сцены)
   */
  update(delta: number): void {
    for (const npc of this.npcs.values()) {
      // Синхронизируем визуальные элементы с позицией физического тела
      npc.syncVisualPosition();
    }
  }
  
  // ==================== ФИЛЬТРАЦИЯ ====================
  
  /**
   * Получить NPC в радиусе от точки
   */
  getNPCsInRange(x: number, y: number, radius: number): NPCSprite[] {
    const result: NPCSprite[] = [];
    const radiusSq = radius * radius;
    
    for (const npc of this.npcs.values()) {
      const dx = npc.x - x;
      const dy = npc.y - y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq <= radiusSq) {
        result.push(npc);
      }
    }
    
    return result;
  }
  
  /**
   * Получить ближайшего NPC к точке
   */
  getNearestNPC(x: number, y: number, maxDistance?: number): NPCSprite | null {
    let nearest: NPCSprite | null = null;
    let nearestDist = Infinity;
    
    for (const npc of this.npcs.values()) {
      const dx = npc.x - x;
      const dy = npc.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < nearestDist && (!maxDistance || dist <= maxDistance)) {
        nearest = npc;
        nearestDist = dist;
      }
    }
    
    return nearest;
  }
  
  /**
   * Получить враждебных NPC
   */
  getHostileNPCs(): NPCSprite[] {
    return this.getAll().filter(npc => npc.disposition < 0);
  }
  
  /**
   * Получить дружественных NPC
   */
  getFriendlyNPCs(): NPCSprite[] {
    return this.getAll().filter(npc => npc.disposition >= 0);
  }
  
  // ==================== ОЧИСТКА ====================
  
  /**
   * Уничтожить группу и всех NPC
   */
  destroy(): void {
    this.clearPlayerCollision();
    
    if (this.internalCollider) {
      this.internalCollider.destroy();
      this.internalCollider = null;
    }
    
    // Уничтожаем всех NPC
    for (const npc of this.npcs.values()) {
      npc.destroy();
    }
    
    this.npcs.clear();
    this.group.destroy(true);
    
    console.log('[NPCGroup] Destroyed');
  }
  
  /**
   * Очистить группу без уничтожения
   */
  clear(): void {
    for (const npc of this.npcs.values()) {
      this.group.remove(npc, true, false);
    }
    this.npcs.clear();
  }
}
