/**
 * ============================================================================
 * INVENTORY SORT UTILITY - Утилита для сортировки инвентаря
 * ============================================================================
 * 
 * Предоставляет функции для сортировки предметов инвентаря
 * по различным критериям.
 * 
 * Версия: 1.0.0
 */

import type { InventoryItem, InventorySortType, SortDirection, ItemRarity, ItemCategory } from '@/types/inventory';
import { RARITY_SORT_PRIORITY, CATEGORY_SORT_PRIORITY } from '@/types/inventory';

// ==================== ФУНКЦИИ СОРТИРОВКИ ====================

/**
 * Сравнивает два предмета по указанному типу сортировки
 */
function compareItems(
  a: InventoryItem,
  b: InventoryItem,
  sortType: InventorySortType,
  direction: SortDirection
): number {
  let comparison = 0;
  
  switch (sortType) {
    case 'name':
      comparison = a.name.localeCompare(b.name, 'ru');
      break;
      
    case 'rarity':
      comparison = (RARITY_SORT_PRIORITY[b.rarity] || 0) - (RARITY_SORT_PRIORITY[a.rarity] || 0);
      break;
      
    case 'type':
      comparison = (CATEGORY_SORT_PRIORITY[a.category] || 99) - (CATEGORY_SORT_PRIORITY[b.category] || 99);
      // Вторичная сортировка по имени внутри типа
      if (comparison === 0) {
        comparison = a.name.localeCompare(b.name, 'ru');
      }
      break;
      
    case 'weight':
      comparison = (b.weight || 0) - (a.weight || 0);
      break;
      
    case 'value':
      comparison = (b.value || 0) - (a.value || 0);
      break;
      
    case 'quantity':
      comparison = (b.quantity || 0) - (a.quantity || 0);
      break;
      
    case 'recent':
      // Приоритет по sortOrder (меньше = недавнее)
      comparison = (a.sortOrder || 999) - (b.sortOrder || 999);
      break;
      
    default:
      comparison = 0;
  }
  
  return direction === 'asc' ? comparison : -comparison;
}

/**
 * Сортирует массив предметов инвентаря
 */
export function sortInventory(
  items: InventoryItem[],
  sortType: InventorySortType,
  direction: SortDirection = 'desc'
): InventoryItem[] {
  return [...items].sort((a, b) => compareItems(a, b, sortType, direction));
}

/**
 * Многоуровневая сортировка инвентаря
 * Сначала по типу, затем по редкости, затем по имени
 */
export function sortInventoryDefault(items: InventoryItem[]): InventoryItem[] {
  return [...items].sort((a, b) => {
    // 1. Экипированные предметы всегда первыми
    if (a.isEquipped !== b.isEquipped) {
      return a.isEquipped ? -1 : 1;
    }
    
    // 2. По категории
    const catDiff = (CATEGORY_SORT_PRIORITY[a.category] || 99) - (CATEGORY_SORT_PRIORITY[b.category] || 99);
    if (catDiff !== 0) return catDiff;
    
    // 3. По редкости (высокая редкость - первые)
    const rarityDiff = (RARITY_SORT_PRIORITY[b.rarity] || 0) - (RARITY_SORT_PRIORITY[a.rarity] || 0);
    if (rarityDiff !== 0) return rarityDiff;
    
    // 4. По имени
    return a.name.localeCompare(b.name, 'ru');
  });
}

/**
 * Группирует предметы по категории
 */
export function groupByCategory(items: InventoryItem[]): Map<ItemCategory, InventoryItem[]> {
  const groups = new Map<ItemCategory, InventoryItem[]>();
  
  for (const item of items) {
    const group = groups.get(item.category) || [];
    group.push(item);
    groups.set(item.category, group);
  }
  
  // Сортируем каждую группу
  for (const [category, groupItems] of groups) {
    groups.set(category, sortInventory(groupItems, 'rarity', 'desc'));
  }
  
  return groups;
}

/**
 * Группирует предметы по редкости
 */
export function groupByRarity(items: InventoryItem[]): Map<ItemRarity, InventoryItem[]> {
  const groups = new Map<ItemRarity, InventoryItem[]>();
  
  for (const item of items) {
    const group = groups.get(item.rarity) || [];
    group.push(item);
    groups.set(item.rarity, group);
  }
  
  // Сортируем каждую группу по имени
  for (const [rarity, groupItems] of groups) {
    groups.set(rarity, sortInventory(groupItems, 'name', 'asc'));
  }
  
  return groups;
}

/**
 * Объединяет одинаковые предметы в стаках
 * Возвращает новый массив с объединёнными стаками
 */
export function mergeStacks(items: InventoryItem[]): InventoryItem[] {
  const stackMap = new Map<string, InventoryItem>();
  const result: InventoryItem[] = [];
  
  for (const item of items) {
    if (item.stackable && item.maxStack > 1) {
      const key = item.nameId;
      const existing = stackMap.get(key);
      
      if (existing) {
        // Объединяем стаки
        const newQuantity = Math.min(existing.quantity + item.quantity, existing.maxStack);
        existing.quantity = newQuantity;
        
        // Если не влезло - создаём новый стак
        if (item.quantity > (newQuantity - existing.quantity)) {
          const overflow = { ...item, quantity: item.quantity - (newQuantity - existing.quantity) };
          result.push(overflow);
        }
      } else {
        stackMap.set(key, { ...item });
      }
    } else {
      result.push(item);
    }
  }
  
  return [...Array.from(stackMap.values()), ...result];
}

/**
 * Распределяет предметы по сетке инвентаря
 * Возвращает массив с обновлёнными позициями
 */
export function arrangeItemsInGrid(
  items: InventoryItem[],
  gridWidth: number = 7,
  gridHeight: number = 7
): InventoryItem[] {
  const result: InventoryItem[] = [];
  const occupiedCells = new Set<string>();
  
  for (const item of items) {
    // Ищем свободное место для предмета
    let placed = false;
    const itemWidth = item.size?.width || 1;
    const itemHeight = item.size?.height || 1;
    
    for (let y = 0; y <= gridHeight - itemHeight && !placed; y++) {
      for (let x = 0; x <= gridWidth - itemWidth && !placed; x++) {
        // Проверяем, свободны ли все нужные ячейки
        let canPlace = true;
        for (let dy = 0; dy < itemHeight && canPlace; dy++) {
          for (let dx = 0; dx < itemWidth && canPlace; dx++) {
            if (occupiedCells.has(`${x + dx},${y + dy}`)) {
              canPlace = false;
            }
          }
        }
        
        if (canPlace) {
          // Размещаем предмет
          result.push({
            ...item,
            position: { x, y },
          });
          
          // Помечаем ячейки как занятые
          for (let dy = 0; dy < itemHeight; dy++) {
            for (let dx = 0; dx < itemWidth; dx++) {
              occupiedCells.add(`${x + dx},${y + dy}`);
            }
          }
          
          placed = true;
        }
      }
    }
    
    // Если не удалось разместить - всё равно добавляем (будет показан warning)
    if (!placed) {
      result.push({
        ...item,
        position: { x: -1, y: -1 }, // Невалидная позиция
      });
    }
  }
  
  return result;
}

/**
 * Полная реорганизация инвентаря
 * - Объединяет стаки
 * - Сортирует по умолчанию
 * - Распределяет по сетке
 */
export function reorganizeInventory(
  items: InventoryItem[],
  gridWidth: number = 7,
  gridHeight: number = 7
): InventoryItem[] {
  // 1. Объединяем стаки
  const merged = mergeStacks(items);
  
  // 2. Сортируем
  const sorted = sortInventoryDefault(merged);
  
  // 3. Распределяем по сетке
  return arrangeItemsInGrid(sorted, gridWidth, gridHeight);
}

export default {
  sortInventory,
  sortInventoryDefault,
  groupByCategory,
  groupByRarity,
  mergeStacks,
  arrangeItemsInGrid,
  reorganizeInventory,
};
