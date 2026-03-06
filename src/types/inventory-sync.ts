/**
 * ============================================================================
 * INVENTORY SYNC - Система прозрачной синхронизации инвентаря
 * ============================================================================
 * 
 * Архитектура:
 * - Каждая ячейка имеет уникальный ID (cellId)
 * - Двусторонняя синхронизация React ↔ Phaser через EventBus
 * - Поддержка предметов размером 1x1, 2x1, 1x2, 2x2, 2x3
 * 
 * Версия: 1.0.0
 */

// ==================== КОНСТАНТЫ ====================

/** Размер сетки инвентаря */
export const INVENTORY_GRID = {
  WIDTH: 7,
  HEIGHT: 7,
} as const;

/** Максимальный размер предмета */
export const MAX_ITEM_SIZE = {
  WIDTH: 2,
  HEIGHT: 3,
} as const;

// ==================== ID ЯЧЕЕК ====================

/**
 * Генерация ID ячейки по координатам
 * Формат: inv_{x}_{y}
 */
export function createCellId(x: number, y: number): string {
  return `inv_${x}_${y}`;
}

/**
 * Парсинг координат из ID ячейки
 */
export function parseCellId(cellId: string): { x: number; y: number } | null {
  const match = cellId.match(/^inv_(\d+)_(\d+)$/);
  if (!match) return null;
  return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) };
}

/**
 * ID слота экипировки
 * Формат: equip_{slotId}
 */
export function createEquipSlotId(slotId: string): string {
  return `equip_${slotId}`;
}

/**
 * Парсинг ID слота экипировки
 */
export function parseEquipSlotId(cellId: string): string | null {
  const match = cellId.match(/^equip_(.+)$/);
  return match ? match[1] : null;
}

// ==================== ТИПЫ ЯЧЕЕК ====================

/** Тип ячейки */
export type CellType = 'inventory' | 'equipment' | 'storage';

/** Базовая ячейка */
export interface CellBase {
  cellId: string;
  cellType: CellType;
  x: number;
  y: number;
  isOccupied: boolean;
  occupiedBy: string | null; // itemId
}

/** Ячейка инвентаря */
export interface InventoryCell extends CellBase {
  cellType: 'inventory';
}

/** Ячейка экипировки */
export interface EquipmentCell extends CellBase {
  cellType: 'equipment';
  slotId: string; // head, torso, left_hand, etc.
  allowedCategories: string[];
}

/** Любая ячейка */
export type Cell = InventoryCell | EquipmentCell;

// ==================== РАЗМЕР ПРЕДМЕТА ====================

/** Размер предмета в ячейках */
export interface ItemSize {
  width: 1 | 2;
  height: 1 | 2 | 3;
}

/**
 * Получить все ячейки, занимаемые предметом
 */
export function getOccupiedCells(
  startX: number,
  startY: number,
  size: ItemSize
): string[] {
  const cells: string[] = [];
  for (let dx = 0; dx < size.width; dx++) {
    for (let dy = 0; dy < size.height; dy++) {
      cells.push(createCellId(startX + dx, startY + dy));
    }
  }
  return cells;
}

/**
 * Проверить, помещается ли предмет в позицию
 */
export function canPlaceItem(
  x: number,
  y: number,
  size: ItemSize,
  occupiedCells: Set<string>
): boolean {
  // Проверка границ
  if (x + size.width > INVENTORY_GRID.WIDTH) return false;
  if (y + size.height > INVENTORY_GRID.HEIGHT) return false;
  
  // Проверка занятых ячеек
  for (let dx = 0; dx < size.width; dx++) {
    for (let dy = 0; dy < size.height; dy++) {
      if (occupiedCells.has(createCellId(x + dx, y + dy))) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Найти первую свободную позицию для предмета
 */
export function findFreePosition(
  size: ItemSize,
  occupiedCells: Set<string>
): { x: number; y: number } | null {
  for (let y = 0; y < INVENTORY_GRID.HEIGHT; y++) {
    for (let x = 0; x < INVENTORY_GRID.WIDTH; x++) {
      if (canPlaceItem(x, y, size, occupiedCells)) {
        return { x, y };
      }
    }
  }
  return null;
}

// ==================== СОСТОЯНИЕ ИНВЕНТАРЯ ====================

/** Предмет в сетке */
export interface GridItem {
  itemId: string;
  name: string;
  icon: string;
  size: ItemSize;
  rarity: string;
  quantity: number;
  maxStack: number;
  mainCellId: string; // Главная ячейка (верхний левый угол)
  occupiedCells: string[]; // Все занимаемые ячейки
}

/** Полное состояние инвентаря для синхронизации */
export interface InventorySyncState {
  version: number;
  timestamp: number;
  characterId: string;
  
  // Сетка инвентаря
  grid: {
    width: number;
    height: number;
    cells: Map<string, Cell>;
  };
  
  // Предметы
  items: Map<string, GridItem>;
  
  // Индекс: cellId -> itemId
  cellToItem: Map<string, string>;
  
  // Экипировка
  equipment: Map<string, GridItem>; // slotId -> item
  
  // Статистика
  stats: {
    totalItems: number;
    usedSlots: number;
    freeSlots: number;
    totalWeight: number;
  };
}

// ==================== СОБЫТИЯ СИНХРОНИЗАЦИИ ====================

/** Типы событий синхронизации инвентаря */
export const INVENTORY_SYNC_EVENT_TYPES = {
  /** Перемещение предмета */
  ITEM_MOVE: 'inventory_sync:item_move',
  /** Добавление предмета */
  ITEM_ADD: 'inventory_sync:item_add',
  /** Удаление предмета */
  ITEM_REMOVE: 'inventory_sync:item_remove',
  /** Экипировка предмета */
  ITEM_EQUIP: 'inventory_sync:item_equip',
  /** Снятие предмета */
  ITEM_UNEQUIP: 'inventory_sync:item_unequip',
  /** Использование предмета */
  ITEM_USE: 'inventory_sync:item_use',
  /** Разделение стака */
  STACK_SPLIT: 'inventory_sync:stack_split',
  /** Объединение стаков */
  STACK_MERGE: 'inventory_sync:stack_merge',
  /** Полная синхронизация */
  FULL_SYNC: 'inventory_sync:full_sync',
  /** Запрос состояния */
  STATE_REQUEST: 'inventory_sync:state_request',
} as const;

/** Событие: Перемещение предмета */
export interface InventoryItemMoveEvent {
  type: typeof INVENTORY_SYNC_EVENT_TYPES.ITEM_MOVE;
  itemId: string;
  fromCellId: string;
  toCellId: string;
  source: 'react' | 'phaser';
}

/** Событие: Добавление предмета */
export interface InventoryItemAddEvent {
  type: typeof INVENTORY_SYNC_EVENT_TYPES.ITEM_ADD;
  item: Omit<GridItem, 'mainCellId' | 'occupiedCells'>;
  targetCellId?: string; // Если не указан, ищется автоматически
  source: 'react' | 'phaser';
}

/** Событие: Удаление предмета */
export interface InventoryItemRemoveEvent {
  type: typeof INVENTORY_SYNC_EVENT_TYPES.ITEM_REMOVE;
  itemId: string;
  quantity: number;
  source: 'react' | 'phaser';
}

/** Событие: Экипировка предмета */
export interface InventoryItemEquipEvent {
  type: typeof INVENTORY_SYNC_EVENT_TYPES.ITEM_EQUIP;
  itemId: string;
  fromCellId: string;
  toSlotId: string;
  source: 'react' | 'phaser';
}

/** Событие: Снятие предмета */
export interface InventoryItemUnequipEvent {
  type: typeof INVENTORY_SYNC_EVENT_TYPES.ITEM_UNEQUIP;
  slotId: string;
  toCellId?: string; // Если не указан, ищется автоматически
  source: 'react' | 'phaser';
}

/** Событие: Использование предмета */
export interface InventoryItemUseEvent {
  type: typeof INVENTORY_SYNC_EVENT_TYPES.ITEM_USE;
  itemId: string;
  quantity: number;
  source: 'react' | 'phaser';
}

/** Событие: Разделение стака */
export interface InventoryStackSplitEvent {
  type: typeof INVENTORY_SYNC_EVENT_TYPES.STACK_SPLIT;
  itemId: string;
  fromCellId: string;
  toCellId: string;
  splitQuantity: number;
  source: 'react' | 'phaser';
}

/** Событие: Объединение стаков */
export interface InventoryStackMergeEvent {
  type: typeof INVENTORY_SYNC_EVENT_TYPES.STACK_MERGE;
  sourceItemId: string;
  targetItemId: string;
  quantity: number;
  source: 'react' | 'phaser';
}

/** Событие: Полная синхронизация */
export interface InventoryFullSyncEvent {
  type: typeof INVENTORY_SYNC_EVENT_TYPES.FULL_SYNC;
  state: InventorySyncState;
  source: 'server';
}

/** Событие: Запрос состояния */
export interface InventoryStateRequestEvent {
  type: typeof INVENTORY_SYNC_EVENT_TYPES.STATE_REQUEST;
  requestId: string;
  source: 'react' | 'phaser';
}

/** Все события синхронизации инвентаря */
export type InventorySyncEvent =
  | InventoryItemMoveEvent
  | InventoryItemAddEvent
  | InventoryItemRemoveEvent
  | InventoryItemEquipEvent
  | InventoryItemUnequipEvent
  | InventoryItemUseEvent
  | InventoryStackSplitEvent
  | InventoryStackMergeEvent
  | InventoryFullSyncEvent
  | InventoryStateRequestEvent;

// ==================== РЕЗУЛЬТАТ ОПЕРАЦИИ ====================

/** Результат операции с инвентарём */
export interface InventorySyncResult {
  success: boolean;
  eventId: string;
  error?: string;
  changes?: {
    movedItem?: GridItem;
    addedItem?: GridItem;
    removedItem?: { itemId: string; quantity: number };
    equippedItem?: GridItem;
    unequippedItem?: GridItem;
    state?: InventorySyncState;
  };
  // Визуальные команды для Phaser
  visualCommands?: InventoryVisualCommand[];
}

// ==================== ВИЗУАЛЬНЫЕ КОМАНДЫ ====================

/** Визуальная команда для отрисовки в Phaser */
export interface InventoryVisualCommand {
  type: 'item_move' | 'item_add' | 'item_remove' | 'item_highlight' | 'slot_flash';
  timestamp: number;
  data: Record<string, unknown>;
}

/** Команда: Перемещение предмета визуально */
export interface ItemMoveVisualCommand extends InventoryVisualCommand {
  type: 'item_move';
  data: {
    itemId: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    animated: boolean;
  };
}

/** Команда: Подсветка ячейки */
export interface CellHighlightVisualCommand extends InventoryVisualCommand {
  type: 'item_highlight';
  data: {
    cellId: string;
    color: string;
    duration: number;
  };
}

/** Команда: Мигание слота */
export interface SlotFlashVisualCommand extends InventoryVisualCommand {
  type: 'slot_flash';
  data: {
    slotId: string;
    color: string;
    duration: number;
  };
}

// ==================== УТИЛИТЫ ====================

/**
 * Создать начальное состояние инвентаря
 */
export function createEmptyInventoryState(characterId: string): InventorySyncState {
  const cells = new Map<string, Cell>();
  
  // Создаём ячейки инвентаря
  for (let y = 0; y < INVENTORY_GRID.HEIGHT; y++) {
    for (let x = 0; x < INVENTORY_GRID.WIDTH; x++) {
      const cellId = createCellId(x, y);
      cells.set(cellId, {
        cellId,
        cellType: 'inventory',
        x,
        y,
        isOccupied: false,
        occupiedBy: null,
      });
    }
  }
  
  return {
    version: 1,
    timestamp: Date.now(),
    characterId,
    grid: {
      width: INVENTORY_GRID.WIDTH,
      height: INVENTORY_GRID.HEIGHT,
      cells,
    },
    items: new Map(),
    cellToItem: new Map(),
    equipment: new Map(),
    stats: {
      totalItems: 0,
      usedSlots: 0,
      freeSlots: INVENTORY_GRID.WIDTH * INVENTORY_GRID.HEIGHT,
      totalWeight: 0,
    },
  };
}

/**
 * Экспорт состояния для передачи (сериализация)
 */
export function serializeInventoryState(state: InventorySyncState): string {
  return JSON.stringify({
    ...state,
    grid: {
      ...state.grid,
      cells: Array.from(state.grid.cells.entries()),
    },
    items: Array.from(state.items.entries()),
    cellToItem: Array.from(state.cellToItem.entries()),
    equipment: Array.from(state.equipment.entries()),
  });
}

/**
 * Импорт состояния (десериализация)
 */
export function deserializeInventoryState(json: string): InventorySyncState {
  const data = JSON.parse(json);
  return {
    ...data,
    grid: {
      ...data.grid,
      cells: new Map(data.grid.cells),
    },
    items: new Map(data.items),
    cellToItem: new Map(data.cellToItem),
    equipment: new Map(data.equipment),
  };
}

export default {
  INVENTORY_GRID,
  MAX_ITEM_SIZE,
  createCellId,
  parseCellId,
  createEquipSlotId,
  parseEquipSlotId,
  getOccupiedCells,
  canPlaceItem,
  findFreePosition,
  createEmptyInventoryState,
  serializeInventoryState,
  deserializeInventoryState,
};
