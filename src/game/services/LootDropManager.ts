/**
 * LootDropManager - Менеджер выпадения лута
 * 
 * Управляет:
 * - Выпадением лута при смерти NPC
 * - Созданием визуальных объектов лута
 * - Подбором лута игроком
 * - Отправкой событий на сервер для permanentize
 * 
 * Интеграция:
 * - Event Bus: npc:death → loot:drop
 * - LocationScene: визуализация и подбор
 * 
 * @see docs/NPC_COMBAT_INTERACTIONS.md - Фаза 5.x
 */

// @ts-ignore - Phaser namespace import for Next.js/Turbopack compatibility
import * as Phaser from 'phaser';
import { eventBusClient } from '@/lib/game/event-bus/client';
import { DEPTHS } from '../constants';

// ==================== ТИПЫ ====================

/**
 * Тип предмета лута
 */
export type LootItemType = 
  | 'qi_stone'      // Камень Ци
  | 'material'      // Материал
  | 'consumable'    // Расходник
  | 'equipment'     // Экипировка
  | 'technique_scroll' // Свиток техники
  | 'currency';     // Валюта

/**
 * Редкость лута
 */
export type LootRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/**
 * Данные предмета лута
 */
export interface LootItem {
  id: string;
  itemId: string;       // ID в базе данных (для permanentize)
  name: string;
  type: LootItemType;
  rarity: LootRarity;
  quantity: number;
  value?: number;       // Стоимость в дух. камнях
  icon?: string;        // Эмодзи иконка
  description?: string;
}

/**
 * Объект лута на карте
 */
export interface LootDrop {
  id: string;
  x: number;
  y: number;
  items: LootItem[];
  sprite?: Phaser.GameObjects.Container;
  spawnTime: number;
  sourceNpcId?: string;
  sourceNpcName?: string;
}

/**
 * Конфигурация менеджера лута
 */
export interface LootDropManagerConfig {
  scene: Phaser.Scene;
  onPickup?: (loot: LootDrop) => void;
  autoDespawnMs?: number; // Автоудаление через N мс
}

/**
 * Результат подбора лута
 */
export interface LootPickupResult {
  success: boolean;
  items: LootItem[];
  reason?: 'too_far' | 'already_picked' | 'inventory_full';
}

/**
 * Таблица дропа NPC
 */
export interface NPCLootTable {
  npcId: string;
  npcLevel: number;
  guaranteedDrops?: LootItem[];
  chanceDrops?: Array<{
    item: Omit<LootItem, 'id' | 'quantity'>;
    chance: number;  // 0-100
    quantity?: { min: number; max: number };
  }>;
}

// ==================== КОНСТАНТЫ ====================

/**
 * Радиус подбора лута (в пикселях)
 */
const PICKUP_RADIUS = 50;

/**
 * Время автоматического исчезновения лута (5 минут)
 */
const DEFAULT_AUTO_DESPAWN_MS = 5 * 60 * 1000;

/**
 * Цвета редкости
 */
const RARITY_COLORS: Record<LootRarity, number> = {
  common: 0x9ca3af,    // Серый
  uncommon: 0x22c55e,  // Зелёный
  rare: 0x3b82f6,      // Синий
  legendary: 0xfbbf24, // Золотой
};

/**
 * Иконки типов лута
 */
const LOOT_TYPE_ICONS: Record<LootItemType, string> = {
  qi_stone: '💎',
  material: '🪨',
  consumable: '🧪',
  equipment: '⚔️',
  technique_scroll: '📜',
  currency: '🪙',
};

// ==================== КЛАСС ====================

export class LootDropManager {
  private scene: Phaser.Scene;
  private lootDrops: Map<string, LootDrop> = new Map();
  private onPickup?: (loot: LootDrop) => void;
  private autoDespawnMs: number;
  private updateTimer: number = 0;
  private updateInterval: number = 1000; // 1 сек
  
  constructor(config: LootDropManagerConfig) {
    this.scene = config.scene;
    this.onPickup = config.onPickup;
    this.autoDespawnMs = config.autoDespawnMs ?? DEFAULT_AUTO_DESPAWN_MS;
    
    console.log('[LootDropManager] Initialized');
  }
  
  // ==================== PUBLIC METHODS ====================
  
  /**
   * Создать лут при смерти NPC
   */
  dropLoot(
    npcId: string,
    npcName: string,
    x: number,
    y: number,
    npcLevel: number,
    customLoot?: LootItem[]
  ): LootDrop | null {
    // Генерируем лут
    const items = customLoot ?? this.generateLootForNPC(npcId, npcLevel);
    
    if (items.length === 0) {
      return null;
    }
    
    const lootId = `loot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const loot: LootDrop = {
      id: lootId,
      x,
      y,
      items,
      spawnTime: Date.now(),
      sourceNpcId: npcId,
      sourceNpcName: npcName,
    };
    
    // Создаём визуальный объект
    loot.sprite = this.createLootSprite(loot);
    
    this.lootDrops.set(lootId, loot);
    
    // Отправляем событие на сервер
    this.emitLootDropped(loot);
    
    console.log(`[LootDropManager] Dropped loot at (${x}, ${y}) with ${items.length} items`);
    
    return loot;
  }
  
  /**
   * Попытаться подобрать лут
   */
  tryPickup(playerX: number, playerY: number): LootPickupResult | null {
    for (const [lootId, loot] of this.lootDrops) {
      const dx = playerX - loot.x;
      const dy = playerY - loot.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= PICKUP_RADIUS) {
        // Подбираем лут
        const result: LootPickupResult = {
          success: true,
          items: loot.items,
        };
        
        // Удаляем визуал
        if (loot.sprite) {
          this.scene.tweens.add({
            targets: loot.sprite,
            scale: 1.5,
            alpha: 0,
            duration: 200,
            onComplete: () => {
              loot.sprite?.destroy();
            },
          });
        }
        
        // Удаляем из списка
        this.lootDrops.delete(lootId);
        
        // Отправляем событие на сервер
        this.emitLootPickedUp(loot);
        
        // Callback
        if (this.onPickup) {
          this.onPickup(loot);
        }
        
        console.log(`[LootDropManager] Picked up ${loot.items.length} items`);
        
        return result;
      }
    }
    
    return null;
  }
  
  /**
   * Обновление (вызывается каждый кадр)
   */
  update(delta: number): void {
    this.updateTimer += delta;
    
    if (this.updateTimer >= this.updateInterval) {
      this.updateTimer = 0;
      this.checkAutoDespawn();
    }
  }
  
  /**
   * Получить ближайший лут
   */
  getNearestLoot(playerX: number, playerY: number): LootDrop | null {
    let nearest: LootDrop | null = null;
    let minDist = Infinity;
    
    for (const loot of this.lootDrops.values()) {
      const dx = playerX - loot.x;
      const dy = playerY - loot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < minDist) {
        minDist = dist;
        nearest = loot;
      }
    }
    
    return nearest;
  }
  
  /**
   * Получить расстояние до ближайшего лута
   */
  getDistanceToNearestLoot(playerX: number, playerY: number): number {
    const nearest = this.getNearestLoot(playerX, playerY);
    if (!nearest) return Infinity;
    
    const dx = playerX - nearest.x;
    const dy = playerY - nearest.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Очистить весь лут
   */
  clear(): void {
    for (const loot of this.lootDrops.values()) {
      if (loot.sprite) {
        loot.sprite.destroy();
      }
    }
    this.lootDrops.clear();
    console.log('[LootDropManager] Cleared all loot');
  }
  
  /**
   * Получить количество активных дропов
   */
  getActiveDropCount(): number {
    return this.lootDrops.size;
  }

  /**
   * Уничтожить менеджер и освободить ресурсы
   * Вызывается при shutdown сцены
   */
  destroy(): void {
    this.clear();
    this.onPickup = undefined;
    console.log('[LootDropManager] Destroyed');
  }
  
  // ==================== PRIVATE METHODS ====================
  
  /**
   * Генерация лута для NPC
   */
  private generateLootForNPC(npcId: string, npcLevel: number): LootItem[] {
    const items: LootItem[] = [];
    
    // Базовый камень Ци (всегда падает)
    const qiStoneValue = 10 + npcLevel * 5;
    items.push({
      id: `item_${Date.now()}_qi`,
      itemId: 'qi_stone_small',
      name: 'Камень Ци',
      type: 'qi_stone',
      rarity: 'common',
      quantity: 1,
      value: qiStoneValue,
      icon: '💎',
    });
    
    // Шанс материала (50%)
    if (Math.random() < 0.5) {
      items.push({
        id: `item_${Date.now()}_mat`,
        itemId: 'material_essence',
        name: 'Эссенция',
        type: 'material',
        rarity: npcLevel > 3 ? 'uncommon' : 'common',
        quantity: 1 + Math.floor(Math.random() * npcLevel),
        icon: '🪨',
      });
    }
    
    // Шанс редкого предмета (10% * level)
    if (Math.random() < 0.1 * npcLevel) {
      items.push({
        id: `item_${Date.now()}_rare`,
        itemId: 'rare_artifact',
        name: 'Редкий артефакт',
        type: 'equipment',
        rarity: 'rare',
        quantity: 1,
        value: 100 * npcLevel,
        icon: '⚔️',
      });
    }
    
    return items;
  }
  
  /**
   * Создать спрайт лута
   */
  private createLootSprite(loot: LootDrop): Phaser.GameObjects.Container {
    const container = this.scene.add.container(loot.x, loot.y);
    container.setDepth(DEPTHS.items);
    
    // Определяем редчайший предмет
    const rarityOrder: LootRarity[] = ['legendary', 'rare', 'uncommon', 'common'];
    let highestRarity: LootRarity = 'common';
    for (const item of loot.items) {
      if (rarityOrder.indexOf(item.rarity) < rarityOrder.indexOf(highestRarity)) {
        highestRarity = item.rarity;
      }
    }
    
    const color = RARITY_COLORS[highestRarity];
    
    // Внешнее свечение
    const glow = this.scene.add.circle(0, 0, 20, color, 0.3);
    container.add(glow);
    
    // Пульсация
    this.scene.tweens.add({
      targets: glow,
      scale: { from: 1, to: 1.3 },
      alpha: { from: 0.3, to: 0.1 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
    
    // Основной круг
    const bg = this.scene.add.circle(0, 0, 15, 0x1e293b, 0.9);
    bg.setStrokeStyle(2, color);
    container.add(bg);
    
    // Иконка (берём от первого предмета или по типу)
    const icon = this.scene.add.text(0, 0, LOOT_TYPE_ICONS[loot.items[0]?.type ?? 'material'], {
      fontSize: '16px',
    }).setOrigin(0.5);
    container.add(icon);
    
    // Количество предметов
    if (loot.items.length > 1) {
      const countText = this.scene.add.text(10, -10, `×${loot.items.length}`, {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);
      container.add(countText);
    }
    
    // Интерактивность
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      this.scene.tweens.add({
        targets: container,
        scale: 1.2,
        duration: 100,
      });
      this.showLootTooltip(loot, container);
    });
    bg.on('pointerout', () => {
      this.scene.tweens.add({
        targets: container,
        scale: 1,
        duration: 100,
      });
      this.hideTooltip();
    });
    
    return container;
  }
  
  /**
   * Показать тултип лута
   */
  private showLootTooltip(loot: LootDrop, parent: Phaser.GameObjects.Container): void {
    // Удаляем предыдущий тултип
    this.hideTooltip();
    
    const tooltip = this.scene.add.container(parent.x, parent.y - 60);
    tooltip.setDepth(DEPTHS.tooltip + 1);
    tooltip.setName('loot_tooltip');
    
    // Фон
    const bg = this.scene.add.rectangle(0, 0, 160, 50 + loot.items.length * 20, 0x1e293b, 0.95);
    bg.setStrokeStyle(1, 0x4ade80);
    tooltip.add(bg);
    
    // Заголовок
    const title = this.scene.add.text(0, -20, '📦 Лут', {
      fontSize: '12px',
      color: '#fbbf24',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
    tooltip.add(title);
    
    // Предметы
    loot.items.forEach((item, i) => {
      const itemText = this.scene.add.text(0, i * 18, `${item.icon} ${item.name} ×${item.quantity}`, {
        fontSize: '10px',
        color: item.rarity === 'legendary' ? '#fbbf24' : 
               item.rarity === 'rare' ? '#3b82f6' : 
               item.rarity === 'uncommon' ? '#22c55e' : '#9ca3af',
        fontFamily: 'Arial',
      }).setOrigin(0.5);
      tooltip.add(itemText);
    });
    
    tooltip.setAlpha(0);
    this.scene.tweens.add({
      targets: tooltip,
      alpha: 1,
      duration: 100,
    });
  }
  
  /**
   * Скрыть тултип
   */
  private hideTooltip(): void {
    const tooltip = this.scene.children.getByName('loot_tooltip');
    if (tooltip) {
      tooltip.destroy();
    }
  }
  
  /**
   * Проверка автоудаления старого лута
   */
  private checkAutoDespawn(): void {
    const now = Date.now();
    const toRemove: string[] = [];
    
    for (const [lootId, loot] of this.lootDrops) {
      if (now - loot.spawnTime > this.autoDespawnMs) {
        toRemove.push(lootId);
      }
    }
    
    for (const lootId of toRemove) {
      const loot = this.lootDrops.get(lootId);
      if (loot?.sprite) {
        this.scene.tweens.add({
          targets: loot.sprite,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            loot.sprite?.destroy();
          },
        });
      }
      this.lootDrops.delete(lootId);
    }
    
    if (toRemove.length > 0) {
      console.log(`[LootDropManager] Despawned ${toRemove.length} old loot drops`);
    }
  }
  
  /**
   * Отправить событие о выпадении лута
   */
  private emitLootDropped(loot: LootDrop): void {
    eventBusClient.emit('loot:drop', {
      lootId: loot.id,
      position: { x: loot.x, y: loot.y },
      items: loot.items.map(i => ({
        itemId: i.itemId,
        name: i.name,
        type: i.type,
        rarity: i.rarity,
        quantity: i.quantity,
      })),
      sourceNpcId: loot.sourceNpcId,
      sourceNpcName: loot.sourceNpcName,
      timestamp: loot.spawnTime,
    });
  }
  
  /**
   * Отправить событие о подборе лута
   */
  private emitLootPickedUp(loot: LootDrop): void {
    eventBusClient.emit('loot:pickup', {
      lootId: loot.id,
      items: loot.items.map(i => ({
        itemId: i.itemId,
        name: i.name,
        type: i.type,
        rarity: i.rarity,
        quantity: i.quantity,
      })),
      timestamp: Date.now(),
    });
  }
}

// ==================== ФАБРИКА ====================

export function createLootDropManager(config: LootDropManagerConfig): LootDropManager {
  return new LootDropManager(config);
}
