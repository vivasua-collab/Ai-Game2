/**
 * Сервис для работы с инвентарём
 * 
 * Функции:
 * - Получение инвентаря персонажа
 * - Добавление/удаление предметов
 * - Перемещение предметов
 * - Экипировка/снятие
 * - Духовное хранилище
 * 
 * Поддержка системы Grade (Матрёшка):
 * - V2 экипировка сохраняет grade
 * - V1 предметы используют rarity
 */

import { db } from '@/lib/db';
import type { 
  InventoryItem, 
  EquipmentSlotId, 
  ItemCategory,
  ItemRarity,
  ItemType,
  InventoryState,
  SpiritStorageState,
  ItemStats,
} from '@/types/inventory';
import { 
  BASE_INVENTORY_SIZE,
  calculateTotalWeight,
  calculateMaxWeight,
  canEquipInSlot,
  STORAGE_SIZE_BY_LEVEL,
} from '@/types/inventory';
import { 
  type EquipmentGrade, 
  type TechniqueGrade,
  type ConsumableGrade,
} from '@/types/grade';

// ==================== ТИПЫ ====================

interface CreateItemData {
  name: string;
  nameId?: string;
  description?: string;
  type: ItemType;
  category: ItemCategory;
  rarity: ItemRarity;
  /** Грейд предмета (новая система Матрёшка) */
  grade?: EquipmentGrade | TechniqueGrade | ConsumableGrade;
  icon: string;
  quantity?: number;
  maxStack?: number;
  stackable?: boolean;
  sizeWidth?: number;
  sizeHeight?: number;
  weight?: number;
  equipmentSlot?: EquipmentSlotId;
  stats?: ItemStats;
  value?: number;
  isConsumable?: boolean;
  isQuestItem?: boolean;
  techniqueId?: string;
}

interface MoveItemData {
  itemId: string;
  toX?: number;
  toY?: number;
  toLocation?: 'inventory' | 'storage';
}

// ==================== ✅ S2-1: HELPER FUNCTIONS ====================

/**
 * ✅ S2-1: Преобразовать DB InventoryItem в интерфейс InventoryItem
 */
function mapDbItemToInterface(item: any): InventoryItem {
  return {
    id: item.id,
    name: item.name,
    nameId: item.nameId || item.name,
    description: item.description || '',
    type: item.type as ItemType,
    category: item.category as ItemCategory,
    rarity: item.rarity as ItemRarity,
    icon: item.icon || '📦',
    size: { width: item.sizeWidth || 1, height: item.sizeHeight || 1 },
    stackable: item.stackable,
    maxStack: item.maxStack,
    quantity: item.quantity,
    weight: item.weight,
    isEquipped: item.isEquipped,
    isBound: item.isBound,
    isQuestItem: item.isQuestItem,
    value: item.value,
    currency: (item.currency || 'spirit_stones') as 'spirit_stones' | 'contribution' | 'gold',
  };
}

// ==================== ПОЛУЧЕНИЕ ДАННЫХ ====================

/**
 * Получить все предметы персонажа
 */
export async function getCharacterItems(characterId: string) {
  const items = await db.inventoryItem.findMany({
    where: { characterId },
    orderBy: [{ posY: 'asc' }, { posX: 'asc' }],
  });
  
  return items;
}

/**
 * Получить экипировку персонажа
 */
export async function getCharacterEquipment(characterId: string) {
  const equipment = await db.equipment.findMany({
    where: { characterId },
    include: { item: true },
  });
  
  // Преобразуем в Map для удобства
  const equipmentMap = new Map<EquipmentSlotId, typeof equipment[0]['item']>();
  for (const eq of equipment) {
    equipmentMap.set(eq.slotId as EquipmentSlotId, eq.item);
  }
  
  return equipmentMap;
}

/**
 * Получить состояние инвентаря
 */
export async function getInventoryState(characterId: string): Promise<InventoryState> {
  const items = await getCharacterItems(characterId);
  const character = await db.character.findUnique({
    where: { id: characterId },
    select: { 
      strength: true, 
      spiritStones: true, 
      contributionPoints: true,
      cultivationLevel: true,
    },
  });
  
  // Фильтруем только инвентарь
  const inventoryItems = items.filter(i => i.location === 'inventory');
  
  // Базовый размер + бонус от рюкзака
  const backpack = items.find(i => i.equipmentSlot === 'backpack');
  let bonusSlots = 0;
  if (backpack?.properties) {
    try {
      const props = JSON.parse(backpack.properties);
      bonusSlots = props.bonusSlots || 0;
    } catch {
      // ignore
    }
  }
  const totalSlots = BASE_INVENTORY_SIZE.width * BASE_INVENTORY_SIZE.height + bonusSlots;
  
  // Создаём плоский массив слотов
  const slots: (InventoryItem | null)[] = new Array(totalSlots).fill(null);
  
  // ✅ S2-1: Используем mapDbItemToInterface
  for (const item of inventoryItems) {
    if (item.posX !== null && item.posY !== null) {
      const index = item.posY * BASE_INVENTORY_SIZE.width + item.posX;
      if (index >= 0 && index < totalSlots) {
        slots[index] = mapDbItemToInterface(item);
      }
    }
  }
  
  // Считаем вес
  const totalWeight = inventoryItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
  
  return {
    characterId,
    baseWidth: BASE_INVENTORY_SIZE.width,
    baseHeight: BASE_INVENTORY_SIZE.height,
    bonusSlots,
    slots,
    currentWeight: totalWeight,
    maxWeight: character ? calculateMaxWeight(character.strength) : 50,
    usedSlots: inventoryItems.length,
    totalSlots,
    spiritStones: character?.spiritStones || 0,
    contributionPoints: character?.contributionPoints || 0,
  };
}

/**
 * Получить духовное хранилище
 */
export async function getSpiritStorage(characterId: string): Promise<SpiritStorageState> {
  let storage = await db.spiritStorage.findUnique({
    where: { characterId },
  });
  
  const character = await db.character.findUnique({
    where: { id: characterId },
    select: { cultivationLevel: true },
  });
  
  const level = character?.cultivationLevel || 1;
  const requiredLevel = 3;
  const capacity = STORAGE_SIZE_BY_LEVEL[level] || 20;
  
  // Создаём хранилище если нет
  if (!storage) {
    storage = await db.spiritStorage.create({
      data: {
        characterId,
        capacity,
        unlocked: level >= requiredLevel,
        requiredLevel,
        items: '[]',
      },
    });
  }
  
  // Парсим предметы
  const items = JSON.parse(storage.items || '[]');
  const slots = new Array(storage.capacity).fill(null);
  
  for (let i = 0; i < items.length && i < slots.length; i++) {
    slots[i] = items[i];
  }
  
  return {
    characterId,
    capacity: storage.capacity,
    unlocked: storage.unlocked,
    slots,
    requiredLevel: storage.requiredLevel,
  };
}

// ==================== ДОБАВЛЕНИЕ/УДАЛЕНИЕ ====================

/**
 * Добавить предмет персонажу
 */
export async function addItemToInventory(
  characterId: string, 
  data: CreateItemData
): Promise<InventoryItem> {
  // Ищем существующий стак для стакаемых предметов
  if (data.stackable && data.quantity) {
    const existing = await db.inventoryItem.findFirst({
      where: {
        characterId,
        nameId: data.nameId || data.name,
        location: 'inventory',
        quantity: { lt: data.maxStack || 99 },
      },
    });
    
    if (existing) {
      const newQuantity = Math.min(
        existing.quantity + (data.quantity || 1),
        existing.maxStack || 99
      );
      
      const updated = await db.inventoryItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
      });
      
      // ✅ S2-1: Используем mapDbItemToInterface
      return mapDbItemToInterface(updated);
    }
  }
  
  // Находим свободную позицию
  const items = await db.inventoryItem.findMany({
    where: { characterId, location: 'inventory' },
    select: { posX: true, posY: true, sizeWidth: true, sizeHeight: true },
  });
  
  // Простое размещение (ищем первый свободный слот)
  let posX = 0;
  let posY = 0;
  const occupied = new Set<string>();
  
  for (const item of items) {
    if (item.posX !== null && item.posY !== null) {
      for (let dx = 0; dx < (item.sizeWidth || 1); dx++) {
        for (let dy = 0; dy < (item.sizeHeight || 1); dy++) {
          occupied.add(`${item.posX + dx},${item.posY + dy}`);
        }
      }
    }
  }
  
  // Ищем свободное место
  outer:
  for (let y = 0; y < BASE_INVENTORY_SIZE.height; y++) {
    for (let x = 0; x < BASE_INVENTORY_SIZE.width; x++) {
      if (!occupied.has(`${x},${y}`)) {
        posX = x;
        posY = y;
        break outer;
      }
    }
  }
  
  // Создаём предмет
  const item = await db.inventoryItem.create({
    data: {
      characterId,
      name: data.name,
      nameId: data.nameId || data.name.toLowerCase().replace(/\s+/g, '_'),
      description: data.description || '',
      type: data.type,
      category: data.category,
      rarity: data.rarity,
      // Сохраняем grade если передан (новая система Матрёшка) - приводим к string
      grade: data.grade ? String(data.grade) : undefined,
      icon: data.icon,
      quantity: data.quantity || 1,
      maxStack: data.maxStack || 1,
      stackable: data.stackable || false,
      sizeWidth: data.sizeWidth || 1,
      sizeHeight: data.sizeHeight || 1,
      weight: data.weight || 0,
      posX,
      posY,
      location: 'inventory',
      equipmentSlot: data.equipmentSlot,
      stats: data.stats ? JSON.stringify(data.stats) : null,
      value: data.value || 0,
      isConsumable: data.isConsumable || false,
      isQuestItem: data.isQuestItem || false,
      techniqueId: data.techniqueId,
    },
  });
  
  return mapDbItemToInterface(item);
}

/**
 * Удалить предмет
 */
export async function removeItem(itemId: string, quantity?: number) {
  const item = await db.inventoryItem.findUnique({
    where: { id: itemId },
  });
  
  if (!item) throw new Error('Предмет не найден');
  
  if (quantity && quantity < item.quantity) {
    // Уменьшаем количество
    return db.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: item.quantity - quantity },
    });
  }
  
  // Удаляем полностью
  return db.inventoryItem.delete({
    where: { id: itemId },
  });
}

// ==================== ПЕРЕМЕЩЕНИЕ ====================

/**
 * Переместить предмет в инвентаре
 */
export async function moveItemInInventory(
  characterId: string,
  data: MoveItemData
) {
  const item = await db.inventoryItem.findUnique({
    where: { id: data.itemId },
  });
  
  if (!item || item.characterId !== characterId) {
    throw new Error('Предмет не найден');
  }
  
  // Обновляем позицию
  return db.inventoryItem.update({
    where: { id: data.itemId },
    data: {
      posX: data.toX ?? item.posX,
      posY: data.toY ?? item.posY,
      location: data.toLocation || item.location,
    },
  });
}

/**
 * ✅ S1-3: Переместить предмет в хранилище (в транзакции)
 */
export async function moveItemToStorage(
  characterId: string,
  itemId: string
) {
  const storage = await getSpiritStorage(characterId);
  
  if (!storage.unlocked) {
    throw new Error('Духовное хранилище не открыто');
  }
  
  // ✅ S1-3: ВЫПОЛНЯЕМ В ТРАНЗАКЦИИ
  return await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: itemId },
    });
    
    if (!item || item.characterId !== characterId) {
      throw new Error('Предмет не найден');
    }
    
    // Проверяем есть ли место
    const storageRecord = await tx.spiritStorage.findUnique({
      where: { characterId },
    });
    
    const currentItems = JSON.parse(storageRecord?.items || '[]');
    
    if (currentItems.length >= storage.capacity) {
      throw new Error('Хранилище переполнено');
    }
    
    // Добавляем в хранилище
    currentItems.push({
      id: item.id,
      name: item.name,
      type: item.type,
      category: item.category,
      rarity: item.rarity,
      icon: item.icon,
      quantity: item.quantity,
    });
    
    await tx.spiritStorage.update({
      where: { characterId },
      data: { items: JSON.stringify(currentItems) },
    });
    
    // Удаляем из инвентаря
    await tx.inventoryItem.delete({
      where: { id: itemId },
    });
    
    return getSpiritStorage(characterId);
  });
}

/**
 * ✅ S1-3: Переместить предмет из хранилища в инвентарь (в транзакции)
 */
export async function moveItemFromStorage(
  characterId: string,
  storageIndex: number
) {
  const storage = await getSpiritStorage(characterId);
  
  if (storageIndex < 0 || storageIndex >= storage.slots.length) {
    throw new Error('Неверный индекс');
  }
  
  const itemData = storage.slots[storageIndex];
  if (!itemData) throw new Error('Предмет не найден');
  
  // ✅ S1-3: ВЫПОЛНЯЕМ В ТРАНЗАКЦИИ
  return await db.$transaction(async (tx) => {
    // Создаём предмет в инвентаре
    await addItemToInventory(characterId, {
      name: itemData.name,
      type: itemData.type as ItemType,
      category: itemData.category as ItemCategory,
      rarity: itemData.rarity as ItemRarity,
      icon: itemData.icon,
      quantity: itemData.quantity,
    });
    
    // Удаляем из хранилища
    const storageRecord = await tx.spiritStorage.findUnique({
      where: { characterId },
    });
    
    if (storageRecord) {
      const items = JSON.parse(storageRecord.items);
      items.splice(storageIndex, 1);
      
      await tx.spiritStorage.update({
        where: { characterId },
        data: { items: JSON.stringify(items) },
      });
    }
    
    return getInventoryState(characterId);
  });
}

// ==================== ЭКИПИРОВКА ====================

/**
 * ✅ S3-2: Экипировать предмет (все проверки в транзакции)
 * ВАЖНО: Вся операция выполняется в транзакции для предотвращения рассинхрона
 */
export async function equipItem(
  characterId: string,
  itemId: string,
  slotId: EquipmentSlotId
) {
  // ✅ S3-2: ВЫПОЛНЯЕМ ВСЁ В ТРАНЗАКЦИИ (включая проверки)
  return await db.$transaction(async (tx) => {
    // ✅ S3-2: Проверка предмета внутри транзакции
    const item = await tx.inventoryItem.findUnique({
      where: { id: itemId },
    });
    
    if (!item || item.characterId !== characterId) {
      throw new Error('Предмет не найден');
    }
    
    // ✅ S3-2: ПРОВЕРКА BROKEN внутри транзакции
    const durabilityPercent = (item.durabilityCurrent ?? 100) / (item.durabilityMax ?? 100) * 100;
    if (item.durabilityCondition === 'broken' || durabilityPercent < 20) {
      throw new Error('Нельзя экипировать сломанный предмет. Сначала отремонтируйте его.');
    }
    
    // ✅ S3-2: Проверяем совместимость внутри транзакции
    if (!canEquipInSlot(item as unknown as InventoryItem, slotId)) {
      throw new Error('Этот предмет нельзя экипировать в данный слот');
    }
    
    // ✅ S3-2: Проверяем требования внутри транзакции
    const requirements = item.requirements ? JSON.parse(item.requirements) : {};
    const character = await tx.character.findUnique({
      where: { id: characterId },
    });
    
    if (requirements.level && character && character.cultivationLevel < requirements.level) {
      throw new Error(`Требуется уровень культивации ${requirements.level}`);
    }
    
    // Снимаем текущий предмет в слоте
    const existingEquip = await tx.equipment.findUnique({
      where: { characterId_slotId: { characterId, slotId } },
    });
    
    if (existingEquip) {
      // Возвращаем в инвентарь
      await tx.inventoryItem.update({
        where: { id: existingEquip.itemId },
        data: { 
          location: 'inventory',
          isEquipped: false,
          equipmentSlot: null,
        },
      });
      
      await tx.equipment.delete({
        where: { id: existingEquip.id },
      });
    }
    
    // Экипируем новый предмет
    await tx.equipment.create({
      data: {
        characterId,
        slotId,
        itemId,
      },
    });
    
    await tx.inventoryItem.update({
      where: { id: itemId },
      data: {
        location: 'equipment',
        isEquipped: true,
        equipmentSlot: slotId,
        posX: null,
        posY: null,
      },
    });
    
    // Возвращаем обновлённую экипировку
    const equipment = await tx.equipment.findMany({
      where: { characterId },
      include: { item: true },
    });
    
    const equipmentMap = new Map<EquipmentSlotId, typeof equipment[0]['item']>();
    for (const eq of equipment) {
      equipmentMap.set(eq.slotId as EquipmentSlotId, eq.item);
    }
    
    return equipmentMap;
  });
}

/**
 * Снять предмет
 * ВАЖНО: Вся операция выполняется в транзакции для предотвращения рассинхрона
 */
export async function unequipItem(
  characterId: string,
  slotId: EquipmentSlotId
) {
  // ВЫПОЛНЯЕМ ВСЁ В ТРАНЗАКЦИИ
  return await db.$transaction(async (tx) => {
    const equipment = await tx.equipment.findUnique({
      where: { characterId_slotId: { characterId, slotId } },
    });
    
    if (!equipment) {
      throw new Error('Слот пуст');
    }
    
    // Возвращаем в инвентарь
    await tx.inventoryItem.update({
      where: { id: equipment.itemId },
      data: {
        location: 'inventory',
        isEquipped: false,
        equipmentSlot: null,
      },
    });
    
    await tx.equipment.delete({
      where: { id: equipment.id },
    });
    
    // Возвращаем обновлённую экипировку
    const allEquipment = await tx.equipment.findMany({
      where: { characterId },
      include: { item: true },
    });
    
    const equipmentMap = new Map<EquipmentSlotId, typeof allEquipment[0]['item']>();
    for (const eq of allEquipment) {
      equipmentMap.set(eq.slotId as EquipmentSlotId, eq.item);
    }
    
    return equipmentMap;
  });
}

// ==================== ИСПОЛЬЗОВАНИЕ ====================

/**
 * ✅ S2-2: Использовать расходник (оптимизировано - один запрос к character)
 */
export async function useConsumable(
  characterId: string,
  itemId: string
) {
  const item = await db.inventoryItem.findUnique({
    where: { id: itemId },
  });
  
  if (!item || item.characterId !== characterId) {
    throw new Error('Предмет не найден');
  }
  
  if (!item.isConsumable) {
    throw new Error('Этот предмет нельзя использовать');
  }
  
  const effects = item.effects ? JSON.parse(item.effects) : {};
  
  // ✅ S2-2: Один запрос к character в начале
  const character = await db.character.findUnique({
    where: { id: characterId },
  });
  
  if (!character) {
    throw new Error('Персонаж не найден');
  }
  
  // ✅ S2-2: Применяем эффекты к персонажу (один update)
  const updateData: Record<string, number> = {};
  
  if (effects.qiRestore) {
    updateData.currentQi = Math.min(
      character.currentQi + effects.qiRestore,
      character.coreCapacity
    );
  }
  
  if (effects.healthRestore) {
    updateData.health = Math.min(
      character.health + effects.healthRestore,
      100
    );
  }
  
  if (Object.keys(updateData).length > 0) {
    await db.character.update({
      where: { id: characterId },
      data: updateData,
    });
  }
  
  // Уменьшаем количество или удаляем
  if (item.quantity > 1) {
    await db.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: item.quantity - 1 },
    });
  } else {
    await db.inventoryItem.delete({
      where: { id: itemId },
    });
  }
  
  return { success: true, effects };
}

// ==================== ЭКСПОРТ ====================

// Алиасы для совместимости со старым API
export const getInventory = getCharacterItems;
export const addItem = addItemToInventory;
export const useItem = useConsumable;

// Заглушки для методов, которые ещё не реализованы
export async function addItemFromPreset(_characterId: string, _presetId: string, _quantity?: number) {
  // TODO: Реализовать добавление из пресетов
  throw new Error('addItemFromPreset not implemented yet');
}

export const inventoryService = {
  getCharacterItems,
  getCharacterEquipment,
  getInventoryState,
  getSpiritStorage,
  addItemToInventory,
  removeItem,
  moveItemInInventory,
  moveItemToStorage,
  moveItemFromStorage,
  equipItem,
  unequipItem,
  useConsumable,
  // Алиасы для совместимости
  getInventory,
  addItem,
  useItem,
  addItemFromPreset,
};

export default inventoryService;
