/**
 * ============================================================================
 * INVENTORY SYNC SERVICE - Сервис синхронизации инвентаря
 * ============================================================================
 * 
 * Обеспечивает двустороннюю синхронизацию между:
 * - React (Zustand store)
 * - Phaser (игровой движок)
 * 
 * Через EventBus API.
 * 
 * Версия: 1.0.0
 */

import {
  createCellId,
  parseCellId,
  createEquipSlotId,
  parseEquipSlotId,
  getOccupiedCells,
  canPlaceItem,
  findFreePosition,
  createEmptyInventoryState,
  type InventorySyncState,
  type GridItem,
  type ItemSize,
  INVENTORY_GRID,
} from '@/types/inventory-sync';
import type { InventoryItem } from '@/types/inventory';

// ==================== ТИПЫ ====================

export interface InventorySyncConfig {
  characterId: string;
  sessionId: string;
  onStateChange?: (state: InventorySyncState) => void;
  onError?: (error: string) => void;
}

export type SyncSource = 'react' | 'phaser';

// ==================== КЛАСС СИНХРОНИЗАЦИИ ====================

/**
 * InventorySyncService - управляет синхронизацией инвентаря
 */
export class InventorySyncService {
  private state: InventorySyncState;
  private config: InventorySyncConfig;
  private pendingChanges: Set<string> = new Set();
  private syncTimeout: NodeJS.Timeout | null = null;
  
  constructor(config: InventorySyncConfig) {
    this.config = config;
    this.state = createEmptyInventoryState(config.characterId);
  }
  
  // ==================== GETTERS ====================
  
  getState(): InventorySyncState {
    return this.state;
  }
  
  getItem(itemId: string): GridItem | undefined {
    return this.state.items.get(itemId);
  }
  
  getItemAtCell(cellId: string): GridItem | undefined {
    const itemId = this.state.cellToItem.get(cellId);
    if (!itemId) return undefined;
    return this.state.items.get(itemId);
  }
  
  getEquipment(slotId: string): GridItem | undefined {
    return this.state.equipment.get(slotId);
  }
  
  // ==================== ПЕРЕМЕЩЕНИЕ ПРЕДМЕТОВ ====================
  
  /**
   * Переместить предмет между ячейками
   */
  async moveItem(
    itemId: string,
    fromCellId: string,
    toCellId: string,
    source: SyncSource
  ): Promise<{ success: boolean; error?: string }> {
    const item = this.state.items.get(itemId);
    if (!item) {
      return { success: false, error: 'Предмет не найден' };
    }
    
    // Парсим целевую ячейку
    const toCoords = parseCellId(toCellId);
    const toSlotId = parseEquipSlotId(toCellId);
    
    if (toCoords) {
      // Перемещение в инвентарь
      return this.moveItemToInventory(item, fromCellId, toCoords.x, toCoords.y, source);
    } else if (toSlotId) {
      // Экипировка
      return this.equipItem(item, fromCellId, toSlotId, source);
    }
    
    return { success: false, error: 'Неверная целевая ячейка' };
  }
  
  /**
   * Переместить предмет в инвентарь
   */
  private async moveItemToInventory(
    item: GridItem,
    fromCellId: string,
    toX: number,
    toY: number,
    source: SyncSource
  ): Promise<{ success: boolean; error?: string }> {
    // Проверяем, помещается ли предмет
    const occupiedSet = this.getOccupiedCellsSet(item.itemId);
    
    // Убираем текущие ячейки предмета из проверки
    for (const cellId of item.occupiedCells) {
      occupiedSet.delete(cellId);
    }
    
    if (!canPlaceItem(toX, toY, item.size, occupiedSet)) {
      return { success: false, error: 'Невозможно разместить предмет в этой позиции' };
    }
    
    // Освобождаем старые ячейки
    this.freeCells(item.occupiedCells);
    
    // Занимаем новые ячейки
    const newCells = getOccupiedCells(toX, toY, item.size);
    this.occupyCells(newCells, item.itemId);
    
    // Обновляем предмет
    item.mainCellId = createCellId(toX, toY);
    item.occupiedCells = newCells;
    
    // Отправляем событие
    await this.sendSyncEvent('inventory:move_item', {
      itemId: item.itemId,
      fromCellId,
      toCellId: item.mainCellId,
      source,
    });
    
    return { success: true };
  }
  
  /**
   * Экипировать предмет
   */
  private async equipItem(
    item: GridItem,
    fromCellId: string,
    slotId: string,
    source: SyncSource
  ): Promise<{ success: boolean; error?: string }> {
    // Проверяем, занят ли слот
    const existingItem = this.state.equipment.get(slotId);
    if (existingItem) {
      // Сначала нужно снять существующий предмет
      const freePos = findFreePosition(existingItem.size, this.getOccupiedCellsSet());
      if (!freePos) {
        return { success: false, error: 'Нет места для снятия текущего предмета' };
      }
      
      // Снимаем существующий предмет
      this.freeCells(existingItem.occupiedCells);
      const newCells = getOccupiedCells(freePos.x, freePos.y, existingItem.size);
      this.occupyCells(newCells, existingItem.itemId);
      existingItem.mainCellId = createCellId(freePos.x, freePos.y);
      existingItem.occupiedCells = newCells;
      this.state.equipment.delete(slotId);
    }
    
    // Освобождаем ячейки инвентаря
    this.freeCells(item.occupiedCells);
    
    // Экипируем
    this.state.equipment.set(slotId, item);
    
    // Отправляем событие
    await this.sendSyncEvent('inventory:equip_item', {
      itemId: item.itemId,
      fromCellId,
      slotId,
      source,
    });
    
    return { success: true };
  }
  
  /**
   * Снять предмет в инвентарь
   */
  async unequipItem(
    slotId: string,
    targetCellId: string | undefined,
    source: SyncSource
  ): Promise<{ success: boolean; error?: string }> {
    const item = this.state.equipment.get(slotId);
    if (!item) {
      return { success: false, error: 'Слот пуст' };
    }
    
    // Находим место в инвентаре
    let targetX: number;
    let targetY: number;
    
    if (targetCellId) {
      const coords = parseCellId(targetCellId);
      if (!coords) {
        return { success: false, error: 'Неверная целевая ячейка' };
      }
      targetX = coords.x;
      targetY = coords.y;
      
      if (!canPlaceItem(targetX, targetY, item.size, this.getOccupiedCellsSet())) {
        return { success: false, error: 'Невозможно разместить предмет в этой позиции' };
      }
    } else {
      const freePos = findFreePosition(item.size, this.getOccupiedCellsSet());
      if (!freePos) {
        return { success: false, error: 'Нет места в инвентаре' };
      }
      targetX = freePos.x;
      targetY = freePos.y;
    }
    
    // Снимаем из экипировки
    this.state.equipment.delete(slotId);
    
    // Размещаем в инвентаре
    const newCells = getOccupiedCells(targetX, targetY, item.size);
    this.occupyCells(newCells, item.itemId);
    item.mainCellId = createCellId(targetX, targetY);
    item.occupiedCells = newCells;
    
    // Отправляем событие
    await this.sendSyncEvent('inventory:unequip_item', {
      slotId,
      toCellId: item.mainCellId,
      source,
    });
    
    return { success: true };
  }
  
  // ==================== ДОБАВЛЕНИЕ/УДАЛЕНИЕ ====================
  
  /**
   * Добавить предмет в инвентарь
   */
  async addItem(
    itemData: Omit<GridItem, 'mainCellId' | 'occupiedCells'>,
    targetCellId: string | undefined,
    source: SyncSource
  ): Promise<{ success: boolean; item?: GridItem; error?: string }> {
    // Проверяем стаки
    if (itemData.stackable && itemData.quantity > 0) {
      const existingItem = this.findStackableItem(itemData.nameId, itemData.maxStack);
      if (existingItem && existingItem.quantity < existingItem.maxStack) {
        // Добавляем в существующий стак
        const addQuantity = Math.min(
          itemData.quantity,
          existingItem.maxStack - existingItem.quantity
        );
        existingItem.quantity += addQuantity;
        
        this.notifyStateChange();
        return { success: true, item: existingItem };
      }
    }
    
    // Ищем место для нового предмета
    let targetX: number;
    let targetY: number;
    
    if (targetCellId) {
      const coords = parseCellId(targetCellId);
      if (!coords) {
        return { success: false, error: 'Неверная целевая ячейка' };
      }
      targetX = coords.x;
      targetY = coords.y;
      
      if (!canPlaceItem(targetX, targetY, itemData.size, this.getOccupiedCellsSet())) {
        return { success: false, error: 'Невозможно разместить предмет в этой позиции' };
      }
    } else {
      const freePos = findFreePosition(itemData.size, this.getOccupiedCellsSet());
      if (!freePos) {
        return { success: false, error: 'Нет места в инвентаре' };
      }
      targetX = freePos.x;
      targetY = freePos.y;
    }
    
    // Создаём новый предмет
    const mainCellId = createCellId(targetX, targetY);
    const occupiedCells = getOccupiedCells(targetX, targetY, itemData.size);
    
    const newItem: GridItem = {
      ...itemData,
      mainCellId,
      occupiedCells,
    };
    
    // Добавляем в состояние
    this.state.items.set(newItem.itemId, newItem);
    this.occupyCells(occupiedCells, newItem.itemId);
    
    // Обновляем статистику
    this.updateStats();
    
    // Отправляем событие
    await this.sendSyncEvent('inventory:add_item', {
      itemData: {
        name: newItem.name,
        nameId: newItem.nameId,
        type: newItem.type,
        category: newItem.category,
        rarity: newItem.rarity,
        icon: newItem.icon,
        quantity: newItem.quantity,
        size: newItem.size,
        weight: newItem.weight,
        value: newItem.value,
        stackable: newItem.stackable,
        maxStack: newItem.maxStack,
      },
      targetCellId: mainCellId,
      source,
    });
    
    return { success: true, item: newItem };
  }
  
  /**
   * Удалить предмет
   */
  async removeItem(
    itemId: string,
    quantity: number,
    source: SyncSource
  ): Promise<{ success: boolean; error?: string }> {
    const item = this.state.items.get(itemId);
    if (!item) {
      return { success: false, error: 'Предмет не найден' };
    }
    
    if (quantity >= item.quantity) {
      // Удаляем полностью
      this.freeCells(item.occupiedCells);
      this.state.items.delete(itemId);
    } else {
      // Уменьшаем количество
      item.quantity -= quantity;
    }
    
    this.updateStats();
    
    await this.sendSyncEvent('inventory:remove_item', {
      itemId,
      quantity,
      source,
    });
    
    return { success: true };
  }
  
  // ==================== СТАКИ ====================
  
  /**
   * Разделить стак
   */
  async splitStack(
    sourceItemId: string,
    targetCellId: string,
    quantity: number,
    source: SyncSource
  ): Promise<{ success: boolean; error?: string }> {
    const sourceItem = this.state.items.get(sourceItemId);
    if (!sourceItem || !sourceItem.stackable) {
      return { success: false, error: 'Предмет нельзя разделить' };
    }
    
    if (quantity >= sourceItem.quantity) {
      return { success: false, error: 'Нельзя отделить всё количество' };
    }
    
    const coords = parseCellId(targetCellId);
    if (!coords) {
      return { success: false, error: 'Неверная целевая ячейка' };
    }
    
    if (!canPlaceItem(coords.x, coords.y, sourceItem.size, this.getOccupiedCellsSet())) {
      return { success: false, error: 'Ячейка занята' };
    }
    
    // Создаём новый предмет
    const newCells = getOccupiedCells(coords.x, coords.y, sourceItem.size);
    const newItem: GridItem = {
      ...sourceItem,
      itemId: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      quantity,
      mainCellId: createCellId(coords.x, coords.y),
      occupiedCells: newCells,
    };
    
    // Обновляем источник
    sourceItem.quantity -= quantity;
    
    // Добавляем новый
    this.state.items.set(newItem.itemId, newItem);
    this.occupyCells(newCells, newItem.itemId);
    
    await this.sendSyncEvent('inventory:split_stack', {
      sourceItemId,
      targetCellId,
      quantity,
      source,
    });
    
    return { success: true };
  }
  
  /**
   * Объединить стаки
   */
  async mergeStacks(
    sourceItemId: string,
    targetItemId: string,
    source: SyncSource
  ): Promise<{ success: boolean; error?: string }> {
    const sourceItem = this.state.items.get(sourceItemId);
    const targetItem = this.state.items.get(targetItemId);
    
    if (!sourceItem || !targetItem) {
      return { success: false, error: 'Предметы не найдены' };
    }
    
    if (!sourceItem.stackable || sourceItem.nameId !== targetItem.nameId) {
      return { success: false, error: 'Предметы нельзя объединить' };
    }
    
    const maxAdd = targetItem.maxStack - targetItem.quantity;
    const toAdd = Math.min(sourceItem.quantity, maxAdd);
    
    if (toAdd <= 0) {
      return { success: false, error: 'Целевой стек полон' };
    }
    
    targetItem.quantity += toAdd;
    
    if (toAdd >= sourceItem.quantity) {
      // Удаляем источник полностью
      this.freeCells(sourceItem.occupiedCells);
      this.state.items.delete(sourceItemId);
    } else {
      sourceItem.quantity -= toAdd;
    }
    
    await this.sendSyncEvent('inventory:merge_stack', {
      sourceItemId,
      targetItemId,
      quantity: toAdd,
      source,
    });
    
    return { success: true };
  }
  
  // ==================== ПОЛНАЯ СИНХРОНИЗАЦИЯ ====================
  
  /**
   * Загрузить состояние из базы данных
   */
  async loadFromDatabase(items: InventoryItem[]): Promise<void> {
    // Очищаем текущее состояние
    this.state = createEmptyInventoryState(this.config.characterId);
    
    // Добавляем каждый предмет
    for (const item of items) {
      const size: ItemSize = {
        width: (item.sizeWidth || 1) as 1 | 2,
        height: (item.sizeHeight || 1) as 1 | 2 | 3,
      };
      
      const gridItem: GridItem = {
        itemId: item.id,
        name: item.name,
        nameId: item.nameId || item.name,
        type: item.type,
        category: item.category,
        rarity: item.rarity || 'common',
        icon: item.icon || '📦',
        size,
        quantity: item.quantity,
        maxStack: item.maxStack || 1,
        weight: item.weight || 0,
        value: item.value || 0,
        stackable: item.stackable,
        mainCellId: createCellId(item.posX || 0, item.posY || 0),
        occupiedCells: getOccupiedCells(item.posX || 0, item.posY || 0, size),
      };
      
      if (item.isEquipped && item.equipmentSlot) {
        this.state.equipment.set(item.equipmentSlot, gridItem);
      } else {
        this.state.items.set(gridItem.itemId, gridItem);
        this.occupyCells(gridItem.occupiedCells, gridItem.itemId);
      }
    }
    
    this.updateStats();
    this.notifyStateChange();
  }
  
  /**
   * Получить данные для сохранения в БД
   */
  getDatabaseData(): Array<{
    id: string;
    posX: number | null;
    posY: number | null;
    quantity: number;
    isEquipped: boolean;
    equipmentSlot: string | null;
  }> {
    const result: Array<{
      id: string;
      posX: number | null;
      posY: number | null;
      quantity: number;
      isEquipped: boolean;
      equipmentSlot: string | null;
    }> = [];
    
    // Предметы в инвентаре
    for (const item of this.state.items.values()) {
      const coords = parseCellId(item.mainCellId);
      result.push({
        id: item.itemId,
        posX: coords?.x ?? null,
        posY: coords?.y ?? null,
        quantity: item.quantity,
        isEquipped: false,
        equipmentSlot: null,
      });
    }
    
    // Экипировка
    for (const [slotId, item] of this.state.equipment) {
      result.push({
        id: item.itemId,
        posX: null,
        posY: null,
        quantity: item.quantity,
        isEquipped: true,
        equipmentSlot: slotId,
      });
    }
    
    return result;
  }
  
  // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================
  
  private getOccupiedCellsSet(excludeItemId?: string): Set<string> {
    const set = new Set<string>();
    
    for (const item of this.state.items.values()) {
      if (item.itemId !== excludeItemId) {
        for (const cellId of item.occupiedCells) {
          set.add(cellId);
        }
      }
    }
    
    return set;
  }
  
  private findStackableItem(nameId: string, maxStack: number): GridItem | undefined {
    for (const item of this.state.items.values()) {
      if (item.nameId === nameId && item.stackable) {
        return item;
      }
    }
    return undefined;
  }
  
  private freeCells(cellIds: string[]): void {
    for (const cellId of cellIds) {
      this.state.cellToItem.delete(cellId);
      const cell = this.state.grid.cells.get(cellId);
      if (cell) {
        cell.isOccupied = false;
        cell.occupiedBy = null;
      }
    }
  }
  
  private occupyCells(cellIds: string[], itemId: string): void {
    for (const cellId of cellIds) {
      this.state.cellToItem.set(cellId, itemId);
      const cell = this.state.grid.cells.get(cellId);
      if (cell) {
        cell.isOccupied = true;
        cell.occupiedBy = itemId;
      }
    }
  }
  
  private updateStats(): void {
    let usedSlots = 0;
    let totalWeight = 0;
    
    for (const item of this.state.items.values()) {
      usedSlots += item.size.width * item.size.height;
      totalWeight += item.weight * item.quantity;
    }
    
    this.state.stats = {
      totalItems: this.state.items.size,
      usedSlots,
      freeSlots: INVENTORY_GRID.WIDTH * INVENTORY_GRID.HEIGHT - usedSlots,
      totalWeight,
    };
    
    this.state.timestamp = Date.now();
  }
  
  private async sendSyncEvent(eventType: string, data: Record<string, unknown>): Promise<void> {
    try {
      const response = await fetch('/api/game/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: eventType,
          sessionId: this.config.sessionId,
          characterId: this.config.characterId,
          ...data,
        }),
      });
      
      const result = await response.json();
      if (!result.success && this.config.onError) {
        this.config.onError(result.error || 'Ошибка синхронизации');
      }
    } catch (error) {
      if (this.config.onError) {
        this.config.onError(error instanceof Error ? error.message : 'Ошибка синхронизации');
      }
    }
    
    this.notifyStateChange();
  }
  
  private notifyStateChange(): void {
    if (this.config.onStateChange) {
      this.config.onStateChange(this.state);
    }
  }
  
  // ==================== STATIC UTILS ====================
  
  static createCellId = createCellId;
  static parseCellId = parseCellId;
  static createEquipSlotId = createEquipSlotId;
  static parseEquipSlotId = parseEquipSlotId;
  static getOccupiedCells = getOccupiedCells;
  static canPlaceItem = canPlaceItem;
  static findFreePosition = findFreePosition;
}

export default InventorySyncService;
