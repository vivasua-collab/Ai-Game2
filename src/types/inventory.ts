/**
 * Типы для системы инвентаря и экипировки
 * 
 * Структура:
 * - ItemType: типы предметов
 * - Rarity: редкость
 * - EquipmentSlotId: слоты экипировки
 * - InventoryItem: предмет
 * - Equipment: экипировка персонажа
 * - Inventory: инвентарь
 * - SpiritStorage: духовное хранилище
 */

// ==================== ТИПЫ ПРЕДМЕТОВ ====================

/** Тип предмета */
export type ItemType = 
  // Оружие
  | 'weapon_sword'      // Меч
  | 'weapon_spear'      // Копьё
  | 'weapon_staff'      // Посох
  | 'weapon_bow'        // Лук
  | 'weapon_dagger'     // Кинжал
  | 'weapon_fist'       // Кулаки/перчатки
  // Броня
  | 'armor_head'        // Шлем
  | 'armor_torso'       // Торс
  | 'armor_legs'        // Поножи
  | 'armor_feet'        // Сапоги
  | 'armor_back'        // Плащ
  // Аксессуары
  | 'accessory_ring'    // Кольцо
  | 'accessory_amulet'  // Амулет
  | 'accessory_talisman'// Талисман
  // Контейнеры
  | 'container_bag'     // Сумка
  | 'container_backpack'// Рюкзак
  | 'container_ring'    // Кольцо хранения
  // Расходники
  | 'consumable_pill'   // Таблетка
  | 'consumable_elixir' // Эликсир
  | 'consumable_food'   // Еда
  | 'consumable_scroll' // Свиток
  // Материалы
  | 'material_ore'      // Руда
  | 'material_herb'     // Трава
  | 'material_crystal'  // Кристалл
  | 'material_essence'  // Эссенция
  // Прочее
  | 'technique_scroll'  // Свиток техники
  | 'quest_item'        // Квестовый предмет
  | 'misc';             // Разное

/** Редкость предмета */
export type ItemRarity = 
  | 'common'    // Обычный (серый)
  | 'uncommon'  // Необычный (зелёный)
  | 'rare'      // Редкий (синий)
  | 'epic'      // Эпический (фиолетовый)
  | 'legendary' // Легендарный (оранжевый)
  | 'mythic';   // Мифический (красный)

/** Категория предмета (для фильтрации) */
export type ItemCategory = 
  | 'weapon'      // Оружие
  | 'armor'       // Броня
  | 'accessory'   // Аксессуары
  | 'consumable'  // Расходники
  | 'material'    // Материалы
  | 'technique'   // Техники
  | 'quest'       // Квестовые
  | 'misc';       // Прочее

// ==================== СЛОТЫ ЭКИПИРОВКИ ====================

/** ID слота экипировки */
export type EquipmentSlotId = 
  | 'head'        // Голова
  | 'torso'       // Торс
  | 'left_hand'   // Левая рука (оружие/щит/кольцо)
  | 'right_hand'  // Правая рука (оружие/инструмент/кольцо)
  | 'legs'        // Ноги
  | 'feet'        // Ступни
  | 'accessory1'  // Аксессуар 1
  | 'accessory2'  // Аксессуар 2
  | 'back'        // Спина (плащ)
  | 'backpack';   // Рюкзак

/** Конфигурация слота экипировки */
export interface EquipmentSlotConfig {
  id: EquipmentSlotId;
  name: string;
  allowedTypes: ItemCategory[];
  icon: string;
}

/** Слоты экипировки */
export const EQUIPMENT_SLOTS: EquipmentSlotConfig[] = [
  { id: 'head', name: 'Голова', allowedTypes: ['armor'], icon: '🧢' },
  { id: 'torso', name: 'Торс', allowedTypes: ['armor'], icon: '👕' },
  { id: 'left_hand', name: 'Левая рука', allowedTypes: ['weapon', 'accessory'], icon: '🛡️' },
  { id: 'right_hand', name: 'Правая рука', allowedTypes: ['weapon', 'accessory'], icon: '⚔️' },
  { id: 'legs', name: 'Ноги', allowedTypes: ['armor'], icon: '👖' },
  { id: 'feet', name: 'Ступни', allowedTypes: ['armor'], icon: '👞' },
  { id: 'accessory1', name: 'Аксессуар 1', allowedTypes: ['accessory'], icon: '💍' },
  { id: 'accessory2', name: 'Аксессуар 2', allowedTypes: ['accessory'], icon: '💍' },
  { id: 'back', name: 'Спина', allowedTypes: ['armor'], icon: '🧥' },
  { id: 'backpack', name: 'Рюкзак', allowedTypes: ['misc'], icon: '🎒' },
];

// ==================== СТАТИСТИКА ПРЕДМЕТА ====================

/** Статы предмета */
export interface ItemStats {
  // Атака и защита
  damage?: number;
  defense?: number;
  criticalChance?: number;
  criticalDamage?: number;
  
  // Культивация
  qiBonus?: number;
  qiRegen?: number;
  cultivationSpeed?: number;
  
  // Характеристики
  strength?: number;
  agility?: number;
  intelligence?: number;
  conductivity?: number;
  
  // Выносливость
  fatigueReduction?: number;
  mentalFatigueReduction?: number;
  healthRegen?: number;
  
  // Прочее
  moveSpeed?: number;
  weightCapacity?: number;
  inventorySlots?: number; // Для рюкзаков
}

/** Эффект расходника */
export interface ConsumableEffect {
  type: 'heal' | 'qi' | 'buff' | 'cure' | 'stat_boost';
  value: number;
  duration?: number; // ТИКов (для баффов)
  stat?: keyof ItemStats;
}

// ==================== ПРЕДМЕТ ИНВЕНТАРЯ ====================

/** Размер предмета в сетке */
export interface ItemSize {
  width: number;  // 1-2
  height: number; // 1-3
}

/** Предмет инвентаря */
export interface InventoryItem {
  // Идентификация
  id: string;
  nameId: string;
  name: string;
  description: string;
  
  // Типизация
  type: ItemType;
  category: ItemCategory;
  rarity: ItemRarity;
  
  // Отображение
  icon: string;  // Emoji или sprite key
  
  // Размер в сетке инвентаря
  size: ItemSize;
  
  // Стаки
  stackable: boolean;
  maxStack: number;
  quantity: number;
  
  // Физика
  weight: number;
  
  // Экипировка
  equipmentSlot?: EquipmentSlotId;
  requiredLevel?: number;
  requiredStats?: Partial<Record<keyof ItemStats, number>>;
  
  // Характеристики
  stats?: ItemStats;
  
  // Расходники
  consumable?: {
    effect: ConsumableEffect;
    usesLeft?: number;
  };
  
  // Техники
  techniqueId?: string;
  
  // Стоимость
  value: number;
  currency: 'spirit_stones' | 'contribution' | 'gold';
  
  // Позиция в инвентаре
  position?: {
    x: number;
    y: number;
  };
  
  // Метаданные
  isEquipped: boolean;
  isBound: boolean;     // Привязан к персонажу
  isQuestItem: boolean;
}

// ==================== ЭКИПИРОВКА ====================

/** Экипированный предмет */
export interface EquippedItem {
  slotId: EquipmentSlotId;
  item: InventoryItem;
  equippedAt: Date;
}

/** Состояние экипировки персонажа */
export interface EquipmentState {
  characterId: string;
  slots: Map<EquipmentSlotId, InventoryItem | null>;
  
  // Бонусы от экипировки
  totalStats: ItemStats;
  totalWeight: number;
  inventoryBonus: number; // Доп. слоты от рюкзака
}

// ==================== ИНВЕНТАРЬ ====================

/** Ячейка инвентаря */
export interface InventorySlot {
  x: number;
  y: number;
  item: InventoryItem | null;
}

/** Состояние инвентаря */
export interface InventoryState {
  characterId: string;
  
  // Размер сетки
  baseWidth: number;   // 7 по умолчанию
  baseHeight: number;  // 7 по умолчанию
  bonusSlots: number;  // Бонус от рюкзака
  
  // Слоты (плоский массив для простоты)
  slots: (InventoryItem | null)[];
  
  // Статистика
  currentWeight: number;
  maxWeight: number;
  usedSlots: number;
  totalSlots: number;
  
  // Деньги
  spiritStones: number;
  contributionPoints: number;
}

// ==================== ДУХОВНОЕ ХРАНИЛИЩЕ ====================

/** Духовное хранилище (кольцо хранения) */
export interface SpiritStorageState {
  characterId: string;
  
  // Размер (зависит от уровня культивации)
  capacity: number;
  unlocked: boolean;
  
  // Слоты
  slots: (InventoryItem | null)[];
  
  // Требование уровня культивации
  requiredLevel: number;
}

// ==================== КОНСТАНТЫ ====================

/** Базовый размер инвентаря */
export const BASE_INVENTORY_SIZE = { width: 7, height: 7 };

/** Максимальный стак для расходников */
export const MAX_STACK_BY_CATEGORY: Record<ItemCategory, number> = {
  weapon: 1,
  armor: 1,
  accessory: 1,
  consumable: 99,
  material: 100,
  technique: 1,
  quest: 1,
  misc: 20,
};

/** Множитель веса от силы */
export const WEIGHT_PER_STRENGTH = 5; // кг за единицу силы

/** Цвета редкости */
export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9ca3af',    // gray-400
  uncommon: '#22c55e',  // green-500
  rare: '#3b82f6',      // blue-500
  epic: '#a855f7',      // purple-500
  legendary: '#f97316', // orange-500
  mythic: '#ef4444',    // red-500
};

/** Названия редкости */
export const RARITY_NAMES: Record<ItemRarity, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
  mythic: 'Мифический',
};

/** Базовый размер духовного хранилища по уровню культивации */
export const STORAGE_SIZE_BY_LEVEL: Record<number, number> = {
  1: 0,   // Недоступно
  2: 0,
  3: 20,  // Открытие
  4: 25,
  5: 30,
  6: 40,
  7: 50,
  8: 65,
  9: 80,
  10: 100,
};

// ==================== ФУНКЦИИ-УТИЛИТЫ ====================

/** Получить категорию по типу предмета */
export function getCategoryFromType(type: ItemType): ItemCategory {
  if (type.startsWith('weapon_')) return 'weapon';
  if (type.startsWith('armor_')) return 'armor';
  if (type.startsWith('accessory_')) return 'accessory';
  if (type.startsWith('consumable_')) return 'consumable';
  if (type.startsWith('material_')) return 'material';
  if (type === 'technique_scroll') return 'technique';
  if (type === 'quest_item') return 'quest';
  return 'misc';
}

/** Проверить можно ли экипировать предмет в слот */
export function canEquipInSlot(item: InventoryItem, slotId: EquipmentSlotId): boolean {
  const slot = EQUIPMENT_SLOTS.find(s => s.id === slotId);
  if (!slot) return false;
  
  // Проверяем категорию
  if (!slot.allowedTypes.includes(item.category)) return false;
  
  // Специальные проверки по слотам
  if (slotId === 'left_hand' || slotId === 'right_hand') {
    // Кольца можно надеть на руки
    if (item.category === 'accessory' && item.type === 'accessory_ring') return true;
    // Оружие - только в руки
    if (item.category === 'weapon') return true;
  }
  
  // Для брони проверяем соответствие типа слоту
  if (item.category === 'armor') {
    if (item.type === 'armor_head' && slotId === 'head') return true;
    if (item.type === 'armor_torso' && slotId === 'torso') return true;
    if (item.type === 'armor_legs' && slotId === 'legs') return true;
    if (item.type === 'armor_feet' && slotId === 'feet') return true;
    if (item.type === 'armor_back' && slotId === 'back') return true;
    return false;
  }
  
  return slot.allowedTypes.includes(item.category);
}

/** Рассчитать общий вес инвентаря */
export function calculateTotalWeight(items: (InventoryItem | null)[]): number {
  return items.reduce((total, item) => {
    if (!item) return total;
    return total + (item.weight * item.quantity);
  }, 0);
}

/** Рассчитать максимальный вес от силы */
export function calculateMaxWeight(strength: number): number {
  return strength * WEIGHT_PER_STRENGTH;
}
