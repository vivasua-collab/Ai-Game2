/**
 * ============================================================================
 * ПРЕСЕТЫ ПРЕДМЕТОВ (Единый формат)
 * ============================================================================
 * 
 * Предметы в игре делятся на категории:
 * - material: Материалы для крафта
 * - artifact: Артефакты (постоянные эффекты)
 * - consumable: Расходуемые предметы
 * - equipment: Снаряжение
 * - spirit_stone: Духовные камни
 * 
 * ============================================================================
 */

import type { BasePreset, PresetCategory, PresetRarity, PresetSource } from "./base-preset";

// ============================================
// ТИПЫ ПРЕДМЕТОВ
// ============================================

/**
 * Тип предмета
 */
export type ItemType = 
  | "material"     // Материал для крафта
  | "artifact"     // Артефакт (постоянный эффект)
  | "consumable"   // Расходуемый предмет
  | "equipment"    // Снаряжение
  | "spirit_stone" // Духовный камень
  | "quest";       // Квестовый предмет

/**
 * Действие при использовании
 */
export type ItemUseAction = 
  | "restore_qi" 
  | "restore_health" 
  | "restore_fatigue"
  | "restore_mental_fatigue"
  | "absorb_qi"
  | "learn_technique"
  | "buff_stat"
  | "teleport";

/**
 * Эффекты предмета
 */
export interface ItemEffects {
  qiRestore?: number;
  healthRestore?: number;
  fatigueRestore?: number;
  mentalFatigueRestore?: number;
  statBonus?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  };
  duration?: number; // Длительность эффекта (минуты)
}

/**
 * Пресет предмета (Единый формат)
 */
export interface ItemPreset extends BasePreset {
  // === ТИП ПРЕДМЕТА ===
  itemType: ItemType;
  
  // === ИСПОЛЬЗОВАНИЕ ===
  isConsumable: boolean;
  useAction?: ItemUseAction;
  
  // === ЭФФЕКТЫ ===
  itemEffects?: ItemEffects;
  
  // === СТЕКОВАНИЕ ===
  stackable: boolean;
  maxStack: number;
  
  // === ПРОЧНОСТЬ (для оборудования) ===
  durability?: number;
  maxDurability?: number;
  
  // === ЗАРЯД ЦИ (для артефактов) ===
  qiCharge?: number;
  maxQiCharge?: number;
  
  // === СТОИМОСТЬ ===
  sellPrice?: number;
  buyPrice?: number;
}

// ============================================
// РАСХОДУЕМЫЕ ПРЕДМЕТЫ
// ============================================

export const CONSUMABLE_ITEMS: ItemPreset[] = [
  {
    id: "qi_pill_small",
    name: "Малая таблетка Ци",
    nameEn: "Small Qi Pill",
    description: "Восстанавливает 50 единиц Ци.",
    category: "basic",
    rarity: "common",
    itemType: "consumable",
    isConsumable: true,
    useAction: "restore_qi",
    itemEffects: { qiRestore: 50 },
    stackable: true,
    maxStack: 99,
    sellPrice: 5,
    buyPrice: 10,
    sources: ["sect", "drop"],
    icon: "💊",
  },
  {
    id: "qi_pill_medium",
    name: "Средняя таблетка Ци",
    nameEn: "Medium Qi Pill",
    description: "Восстанавливает 150 единиц Ци.",
    category: "advanced",
    rarity: "uncommon",
    itemType: "consumable",
    isConsumable: true,
    useAction: "restore_qi",
    itemEffects: { qiRestore: 150 },
    stackable: true,
    maxStack: 99,
    sellPrice: 20,
    buyPrice: 40,
    sources: ["sect", "drop"],
    icon: "💊",
  },
  {
    id: "qi_pill_large",
    name: "Большая таблетка Ци",
    nameEn: "Large Qi Pill",
    description: "Восстанавливает 500 единиц Ци.",
    category: "master",
    rarity: "rare",
    itemType: "consumable",
    isConsumable: true,
    useAction: "restore_qi",
    itemEffects: { qiRestore: 500 },
    stackable: true,
    maxStack: 99,
    sellPrice: 80,
    buyPrice: 160,
    sources: ["sect", "scroll"],
    icon: "💊",
  },
  {
    id: "healing_pill",
    name: "Лечебная таблетка",
    nameEn: "Healing Pill",
    description: "Восстанавливает 20 здоровья.",
    category: "basic",
    rarity: "common",
    itemType: "consumable",
    isConsumable: true,
    useAction: "restore_health",
    itemEffects: { healthRestore: 20 },
    stackable: true,
    maxStack: 99,
    sellPrice: 10,
    buyPrice: 20,
    sources: ["sect", "drop"],
    icon: "🩹",
  },
  {
    id: "fatigue_pill",
    name: "Тонизирующая таблетка",
    nameEn: "Tonic Pill",
    description: "Снимает 30% физической усталости.",
    category: "advanced",
    rarity: "uncommon",
    itemType: "consumable",
    isConsumable: true,
    useAction: "restore_fatigue",
    itemEffects: { fatigueRestore: 30 },
    stackable: true,
    maxStack: 99,
    sellPrice: 25,
    buyPrice: 50,
    sources: ["sect"],
    icon: "⚡",
  },
  {
    id: "mental_clarity_pill",
    name: "Таблетка ясности ума",
    nameEn: "Mental Clarity Pill",
    description: "Снимает 30% ментальной усталости.",
    category: "advanced",
    rarity: "uncommon",
    itemType: "consumable",
    isConsumable: true,
    useAction: "restore_mental_fatigue",
    itemEffects: { mentalFatigueRestore: 30 },
    stackable: true,
    maxStack: 99,
    sellPrice: 30,
    buyPrice: 60,
    sources: ["sect"],
    icon: "🧠",
  },
];

// ============================================
// ДУХОВНЫЕ КАМНИ
// ============================================

export const SPIRIT_STONES: ItemPreset[] = [
  {
    id: "spirit_stone_low",
    name: "Низкосортный духовный камень",
    nameEn: "Low-grade Spirit Stone",
    description: "Содержит 100 единиц Ци. Можно поглотить.",
    category: "basic",
    rarity: "common",
    itemType: "spirit_stone",
    isConsumable: true,
    useAction: "absorb_qi",
    itemEffects: { qiRestore: 100 },
    stackable: true,
    maxStack: 999,
    sellPrice: 1,
    buyPrice: 2,
    sources: ["drop", "sect"],
    icon: "💎",
  },
  {
    id: "spirit_stone_medium",
    name: "Духовный камень",
    nameEn: "Spirit Stone",
    description: "Содержит 500 единиц Ци. Можно поглотить.",
    category: "advanced",
    rarity: "uncommon",
    itemType: "spirit_stone",
    isConsumable: true,
    useAction: "absorb_qi",
    itemEffects: { qiRestore: 500 },
    stackable: true,
    maxStack: 999,
    sellPrice: 5,
    buyPrice: 10,
    sources: ["drop", "sect"],
    icon: "💎",
  },
  {
    id: "spirit_stone_high",
    name: "Высокосортный духовный камень",
    nameEn: "High-grade Spirit Stone",
    description: "Содержит 2000 единиц Ци. Можно поглотить.",
    category: "master",
    rarity: "rare",
    itemType: "spirit_stone",
    isConsumable: true,
    useAction: "absorb_qi",
    itemEffects: { qiRestore: 2000 },
    stackable: true,
    maxStack: 999,
    sellPrice: 20,
    buyPrice: 40,
    sources: ["drop"],
    icon: "💎",
  },
];

// ============================================
// МАТЕРИАЛЫ
// ============================================

export const MATERIALS: ItemPreset[] = [
  {
    id: "spirit_herb",
    name: "Духовная трава",
    nameEn: "Spirit Herb",
    description: "Трава, растущая в местах с высокой концентрацией Ци.",
    category: "basic",
    rarity: "common",
    itemType: "material",
    isConsumable: false,
    stackable: true,
    maxStack: 999,
    sellPrice: 2,
    sources: ["drop"],
    icon: "🌿",
  },
  {
    id: "fire_stone",
    name: "Камень огня",
    nameEn: "Fire Stone",
    description: "Камень, содержащий энергию огненной стихии.",
    category: "advanced",
    rarity: "uncommon",
    itemType: "material",
    isConsumable: false,
    stackable: true,
    maxStack: 99,
    sellPrice: 15,
    sources: ["drop"],
    icon: "🔥",
  },
  {
    id: "water_stone",
    name: "Камень воды",
    nameEn: "Water Stone",
    description: "Камень, содержащий энергию водной стихии.",
    category: "advanced",
    rarity: "uncommon",
    itemType: "material",
    isConsumable: false,
    stackable: true,
    maxStack: 99,
    sellPrice: 15,
    sources: ["drop"],
    icon: "💧",
  },
  {
    id: "earth_stone",
    name: "Камень земли",
    nameEn: "Earth Stone",
    description: "Камень, содержащий энергию земной стихии.",
    category: "advanced",
    rarity: "uncommon",
    itemType: "material",
    isConsumable: false,
    stackable: true,
    maxStack: 99,
    sellPrice: 15,
    sources: ["drop"],
    icon: "🪨",
  },
  {
    id: "air_stone",
    name: "Камень воздуха",
    nameEn: "Air Stone",
    description: "Камень, содержащий энергию воздушной стихии.",
    category: "advanced",
    rarity: "uncommon",
    itemType: "material",
    isConsumable: false,
    stackable: true,
    maxStack: 99,
    sellPrice: 15,
    sources: ["drop"],
    icon: "💨",
  },
  {
    id: "elemental_crystal",
    name: "Кристалл стихий",
    nameEn: "Elemental Crystal",
    description: "Редкий кристалл, сочетающий энергии всех стихий.",
    category: "master",
    rarity: "rare",
    itemType: "material",
    isConsumable: false,
    stackable: true,
    maxStack: 10,
    sellPrice: 100,
    sources: ["drop"],
    icon: "✨",
  },
  {
    id: "moonlight_essence",
    name: "Эссенция лунного света",
    nameEn: "Moonlight Essence",
    description: "Собранный свет полной луны. Используется в продвинутых формациях.",
    category: "master",
    rarity: "rare",
    itemType: "material",
    isConsumable: false,
    stackable: true,
    maxStack: 10,
    sellPrice: 150,
    sources: ["drop"],
    icon: "🌙",
  },
];

// ============================================
// ЭКСПОРТ ВСЕХ ПРЕДМЕТОВ
// ============================================

export const ALL_ITEM_PRESETS: ItemPreset[] = [
  ...CONSUMABLE_ITEMS,
  ...SPIRIT_STONES,
  ...MATERIALS,
];

// ============================================
// ФУНКЦИИ ПОИСКА
// ============================================

/**
 * Получить предмет по ID
 */
export function getItemPresetById(id: string): ItemPreset | undefined {
  return ALL_ITEM_PRESETS.find(i => i.id === id);
}

/**
 * Получить предметы по типу
 */
export function getItemPresetsByType(type: ItemType): ItemPreset[] {
  return ALL_ITEM_PRESETS.filter(i => i.itemType === type);
}

/**
 * Получить расходуемые предметы
 */
export function getConsumableItems(): ItemPreset[] {
  return CONSUMABLE_ITEMS;
}

/**
 * Получить духовные камни
 */
export function getSpiritStones(): ItemPreset[] {
  return SPIRIT_STONES;
}

/**
 * Получить материалы
 */
export function getMaterials(): ItemPreset[] {
  return MATERIALS;
}

/**
 * Получить предметы, доступные для покупки
 */
export function getBuyableItems(): ItemPreset[] {
  return ALL_ITEM_PRESETS.filter(i => i.buyPrice !== undefined);
}

/**
 * Получить предметы по редкости
 */
export function getItemPresetsByRarity(rarity: PresetRarity): ItemPreset[] {
  return ALL_ITEM_PRESETS.filter(i => i.rarity === rarity);
}
