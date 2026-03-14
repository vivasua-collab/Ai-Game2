/**
 * ============================================================================
 * ОРКЕСТРАТОР ЭКИПИРОВКИ И ИНВЕНТАРЯ NPC
 * ============================================================================
 * 
 * Обёртка над существующими генераторами:
 * - weapon-generator.ts (generateWeapon)
 * - armor-generator.ts (generateArmor)
 * - accessory-generator.ts (generateAccessory)
 * - consumable-generator.ts (generateConsumable)
 * 
 * Определяет:
 * - Шансы экипировки по уровню NPC
 * - Какие слоты заполнять для конкретного NPC
 * - Уровень богатства по роли
 * - Генерацию инвентаря (расходники, хлам)
 * 
 * НЕ генерирует предметы сам — использует существующие генераторы!
 */

import {
  type TempItem,
  type TempEquipment,
  type TempNPC,
  generateTempItemId,
} from '@/types/temp-npc';
import {
  generateWeapon,
  type Weapon,
  type WeaponGenerationOptions,
} from './weapon-generator';
import {
  generateArmor,
  type Armor,
  type ArmorGenerationOptions,
} from './armor-generator';
import {
  generateAccessory,
  type GeneratedAccessory,
  type AccessoryGenerationOptions,
} from './accessory-generator';
import {
  generateConsumable,
  type Consumable,
  type ConsumableGenerationOptions,
  type ConsumableType,
} from './consumable-generator';

// ==================== ТИПЫ ====================

/**
 * Уровень богатства NPC
 */
export type WealthLevel = 'poor' | 'common' | 'wealthy' | 'rich';

/**
 * Контекст генерации экипировки
 */
export interface EquipmentGenerationContext {
  cultivationLevel: number;
  speciesId: string;
  roleId: string;
  wealth: WealthLevel;
  rng: () => number;
}

/**
 * Контекст генерации инвентаря
 */
export interface InventoryGenerationContext {
  cultivationLevel: number;
  speciesId: string;
  roleId: string;
  wealth: WealthLevel;
  combatant: boolean;           // Участвует ли в бою
  rng: () => number;
}

/**
 * Конфигурация шансов экипировки по уровню
 */
interface EquipmentChances {
  weapon: number;
  armor: number;
  helmet: number;
  boots: number;
  gloves: number;
  accessory: number;
}

/**
 * Конфигурация инвентаря по уровню
 */
interface InventoryChances {
  healingPills: number;         // Шанс иметь таблетки
  healingPillsCount: [number, number]; // [мин, макс]
  elixirs: number;              // Шанс иметь эликсиры
  elixirsCount: [number, number];
  food: number;                 // Шанс иметь еду
  foodCount: [number, number];
  junk: number;                 // Шанс иметь хлам
  junkCount: [number, number];
}

/**
 * Предмет хлама (старая/повреждённая вещь)
 */
interface JunkItem {
  id: string;
  name: string;
  type: 'clothing' | 'tool' | 'misc';
  condition: 'worn' | 'damaged' | 'broken';
  value: number;
}

// ==================== КОНСТАНТЫ ====================

/**
 * Множители шансов по уровню богатства
 */
const WEALTH_MULTIPLIERS: Record<WealthLevel, number> = {
  poor: 0.5,
  common: 1.0,
  wealthy: 1.3,
  rich: 1.6,
};

/**
 * Базовые шансы экипировки по слотам и уровням (в процентах)
 */
const BASE_EQUIPMENT_CHANCES: Record<number, EquipmentChances> = {
  1: { weapon: 70, armor: 30, helmet: 0, boots: 20, gloves: 0, accessory: 0 },
  2: { weapon: 75, armor: 40, helmet: 0, boots: 30, gloves: 25, accessory: 0 },
  3: { weapon: 80, armor: 50, helmet: 30, boots: 40, gloves: 30, accessory: 0 },
  4: { weapon: 85, armor: 60, helmet: 35, boots: 50, gloves: 35, accessory: 20 },
  5: { weapon: 90, armor: 70, helmet: 40, boots: 60, gloves: 40, accessory: 25 },
  6: { weapon: 90, armor: 70, helmet: 40, boots: 60, gloves: 40, accessory: 25 },
  7: { weapon: 95, armor: 75, helmet: 45, boots: 65, gloves: 45, accessory: 30 },
  8: { weapon: 95, armor: 75, helmet: 45, boots: 65, gloves: 45, accessory: 30 },
  9: { weapon: 100, armor: 80, helmet: 50, boots: 70, gloves: 50, accessory: 35 },
};

/**
 * Шансы инвентаря по уровню (для combatant = true)
 */
const BASE_INVENTORY_CHANCES: Record<number, InventoryChances> = {
  1: {
    healingPills: 40, healingPillsCount: [1, 2],
    elixirs: 0, elixirsCount: [0, 0],
    food: 60, foodCount: [1, 3],
    junk: 50, junkCount: [0, 2],
  },
  2: {
    healingPills: 50, healingPillsCount: [1, 3],
    elixirs: 10, elixirsCount: [0, 1],
    food: 55, foodCount: [1, 3],
    junk: 40, junkCount: [0, 2],
  },
  3: {
    healingPills: 60, healingPillsCount: [2, 4],
    elixirs: 20, elixirsCount: [0, 1],
    food: 50, foodCount: [1, 2],
    junk: 30, junkCount: [0, 1],
  },
  4: {
    healingPills: 65, healingPillsCount: [2, 5],
    elixirs: 25, elixirsCount: [0, 2],
    food: 45, foodCount: [1, 2],
    junk: 25, junkCount: [0, 1],
  },
  5: {
    healingPills: 70, healingPillsCount: [3, 6],
    elixirs: 30, elixirsCount: [1, 2],
    food: 40, foodCount: [1, 2],
    junk: 20, junkCount: [0, 1],
  },
  6: {
    healingPills: 75, healingPillsCount: [3, 7],
    elixirs: 35, elixirsCount: [1, 2],
    food: 35, foodCount: [0, 2],
    junk: 15, junkCount: [0, 1],
  },
  7: {
    healingPills: 80, healingPillsCount: [4, 8],
    elixirs: 40, elixirsCount: [1, 3],
    food: 30, foodCount: [0, 2],
    junk: 10, junkCount: [0, 1],
  },
  8: {
    healingPills: 85, healingPillsCount: [5, 10],
    elixirs: 45, elixirsCount: [1, 3],
    food: 25, foodCount: [0, 1],
    junk: 5, junkCount: [0, 1],
  },
  9: {
    healingPills: 90, healingPillsCount: [6, 12],
    elixirs: 50, elixirsCount: [2, 4],
    food: 20, foodCount: [0, 1],
    junk: 0, junkCount: [0, 0],
  },
};

/**
 * Виды, которые НЕ могут носить экипировку
 */
const BEAST_SPECIES = ['wolf', 'tiger', 'bear', 'snake', 'eagle', 'dragon_beast', 'lion', 'panther'];
const SPIRIT_SPECIES = ['fire_elemental', 'water_elemental', 'ghost', 'wind_spirit', 'earth_spirit'];

/**
 * Роли с высоким богатством
 */
const RICH_ROLES = ['sect_master', 'elder', 'noble', 'merchant_guild_leader'];

/**
 * Роли со средним богатством
 */
const WEALTHY_ROLES = ['merchant', 'inner_disciple', 'core_member', 'alchemist', 'blacksmith'];

/**
 * Роли с низким богатством
 */
const POOR_ROLES = ['beggar', 'refugee', 'outer_disciple', 'servant', 'slave'];

/**
 * Роли, которые не участвуют в бою
 */
const NON_COMBAT_ROLES = ['merchant', 'beggar', 'servant', 'slave', 'refugee'];

/**
 * Шаблоны хлама
 */
const JUNK_TEMPLATES: JunkItem[] = [
  // Одежда (старая)
  { id: 'junk_worn_robe', name: 'Драная роба', type: 'clothing', condition: 'worn', value: 1 },
  { id: 'junk_worn_shirt', name: 'Старая рубаха', type: 'clothing', condition: 'worn', value: 1 },
  { id: 'junk_torn_pants', name: 'Рваные штаны', type: 'clothing', condition: 'damaged', value: 1 },
  { id: 'junk_old_boots', name: 'Стёртые сапоги', type: 'clothing', condition: 'worn', value: 2 },
  { id: 'junk_dirty_cloak', name: 'Грязный плащ', type: 'clothing', condition: 'damaged', value: 1 },
  { id: 'junk_worn_hat', name: 'Потрёпанная шляпа', type: 'clothing', condition: 'worn', value: 1 },
  
  // Инструменты (сломанные)
  { id: 'junk_broken_knife', name: 'Сломанный нож', type: 'tool', condition: 'broken', value: 1 },
  { id: 'junk_dull_axe', name: 'Тупой топор', type: 'tool', condition: 'damaged', value: 2 },
  { id: 'junk_rusty_saw', name: 'Ржавая пила', type: 'tool', condition: 'damaged', value: 1 },
  { id: 'junk_cracked_pot', name: 'Треснутый горшок', type: 'tool', condition: 'damaged', value: 1 },
  
  // Разное
  { id: 'junk_broken_bowl', name: 'Разбитая чаша', type: 'misc', condition: 'broken', value: 1 },
  { id: 'junk_old_rope', name: 'Старая верёвка', type: 'misc', condition: 'worn', value: 1 },
  { id: 'junk_ragged_blanket', name: 'Дряхлое одеяло', type: 'misc', condition: 'worn', value: 1 },
  { id: 'junk_cracked_mirror', name: 'Треснутое зеркало', type: 'misc', condition: 'damaged', value: 2 },
  { id: 'junk_bent_spoon', name: 'Погнутая ложка', type: 'misc', condition: 'damaged', value: 1 },
];

// Счётчики для генерации
let weaponCounter = 1;
let armorCounter = 1;
let consumableCounter = 1;

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Генерация экипировки для NPC
 * Использует существующие генераторы weapon-generator, armor-generator, accessory-generator
 */
export function generateEquipmentForNPC(
  context: EquipmentGenerationContext
): TempEquipment {
  const { cultivationLevel, speciesId, roleId, wealth, rng } = context;
  const equipment: TempEquipment = {};
  
  // 1. Проверяем может ли вид носить экипировку
  if (!canSpeciesEquipEquipment(speciesId)) {
    return equipment;
  }
  
  // 2. Получаем шансы для уровня
  const levelChances = getEquipmentChances(cultivationLevel);
  
  // 3. Применяем множитель богатства
  const wealthMult = WEALTH_MULTIPLIERS[wealth];
  
  // 4. Генерируем каждый слот с помощью существующих генераторов
  
  // Оружие
  if (rng() * 100 < levelChances.weapon * wealthMult) {
    equipment.weapon = generateWeaponItem(cultivationLevel, rng);
  }
  
  // Броня (torso)
  if (rng() * 100 < levelChances.armor * wealthMult) {
    equipment.armor = generateArmorItem(cultivationLevel, 'torso', rng);
  }
  
  // Шлем
  if (levelChances.helmet > 0 && rng() * 100 < levelChances.helmet * wealthMult) {
    equipment.helmet = generateArmorItem(cultivationLevel, 'head', rng);
  }
  
  // Сапоги
  if (rng() * 100 < levelChances.boots * wealthMult) {
    equipment.boots = generateArmorItem(cultivationLevel, 'feet', rng);
  }
  
  // Перчатки
  if (levelChances.gloves > 0 && rng() * 100 < levelChances.gloves * wealthMult) {
    equipment.gloves = generateArmorItem(cultivationLevel, 'hands_gloves', rng);
  }
  
  // Аксессуар
  if (levelChances.accessory > 0 && rng() * 100 < levelChances.accessory * wealthMult) {
    equipment.accessory1 = generateAccessoryItem(cultivationLevel, rng);
  }
  
  return equipment;
}

/**
 * Генерация инвентаря для NPC
 * Возвращает массив предметов для quickSlots
 */
export function generateInventoryForNPC(
  context: InventoryGenerationContext
): TempItem[] {
  const { cultivationLevel, speciesId, roleId, wealth, combatant, rng } = context;
  const inventory: TempItem[] = [];
  
  // 1. Проверяем может ли вид иметь инвентарь
  if (!canSpeciesEquipEquipment(speciesId)) {
    return inventory;
  }
  
  // 2. Получаем шансы для уровня
  const levelChances = getInventoryChances(cultivationLevel);
  const wealthMult = WEALTH_MULTIPLIERS[wealth];
  
  // 3. Бедные NPC имеют больше хлама
  const junkMult = wealth === 'poor' ? 2.0 : wealth === 'rich' ? 0.0 : 1.0;
  
  // 4. Генерируем расходники (только для combatant)
  if (combatant) {
    // Таблетки лечения
    if (rng() * 100 < levelChances.healingPills * wealthMult) {
      const count = randomInRange(levelChances.healingPillsCount, rng);
      for (let i = 0; i < count; i++) {
        inventory.push(generateHealingPill(cultivationLevel, rng));
      }
    }
    
    // Эликсиры
    if (levelChances.elixirs > 0 && rng() * 100 < levelChances.elixirs * wealthMult) {
      const count = randomInRange(levelChances.elixirsCount, rng);
      for (let i = 0; i < count; i++) {
        inventory.push(generateElixir(cultivationLevel, rng));
      }
    }
  }
  
  // 5. Еда (для всех)
  const foodChances = getInventoryChances(cultivationLevel);
  if (rng() * 100 < foodChances.food * wealthMult) {
    const count = randomInRange(foodChances.foodCount, rng);
    for (let i = 0; i < count; i++) {
      inventory.push(generateFood(cultivationLevel, rng));
    }
  }
  
  // 6. Хлам (больше у бедных)
  if (levelChances.junk > 0 && rng() * 100 < levelChances.junk * junkMult) {
    const count = randomInRange(levelChances.junkCount, rng);
    for (let i = 0; i < count; i++) {
      inventory.push(generateJunkItem(rng));
    }
  }
  
  return inventory;
}

/**
 * Экипировка NPC сгенерированными предметами
 * Проверяет слоты и надевает вещи
 */
export function equipItemsToNPC(
  npc: TempNPC,
  equipment: TempEquipment
): void {
  // Проверяем каждый слот и надеваем если пуст
  if (equipment.weapon && !npc.equipment.weapon) {
    npc.equipment.weapon = equipment.weapon;
  }
  if (equipment.armor && !npc.equipment.armor) {
    npc.equipment.armor = equipment.armor;
  }
  if (equipment.helmet && !npc.equipment.helmet) {
    npc.equipment.helmet = equipment.helmet;
  }
  if (equipment.boots && !npc.equipment.boots) {
    npc.equipment.boots = equipment.boots;
  }
  if (equipment.gloves && !npc.equipment.gloves) {
    npc.equipment.gloves = equipment.gloves;
  }
  if (equipment.accessory1 && !npc.equipment.accessory1) {
    npc.equipment.accessory1 = equipment.accessory1;
  }
  if (equipment.accessory2 && !npc.equipment.accessory2) {
    npc.equipment.accessory2 = equipment.accessory2;
  }
}

/**
 * Добавление инвентаря в quickSlots NPC
 */
export function addInventoryToNPC(
  npc: TempNPC,
  items: TempItem[]
): void {
  // Инициализируем quickSlots если нужно
  if (!npc.quickSlots) {
    npc.quickSlots = [null, null, null, null];
  }
  
  // Добавляем предметы в свободные слоты
  for (const item of items) {
    const freeSlotIndex = npc.quickSlots.findIndex(slot => slot === null);
    if (freeSlotIndex !== -1) {
      npc.quickSlots[freeSlotIndex] = item;
    }
  }
}

/**
 * Полная генерация экипировки и инвентаря для NPC
 */
export function generateFullEquipmentForNPC(
  npc: TempNPC,
  rng: () => number = Math.random
): void {
  const wealth = getWealthByRole(npc.roleId);
  const combatant = !NON_COMBAT_ROLES.includes(npc.roleId);
  
  // 1. Генерируем экипировку
  const equipmentContext: EquipmentGenerationContext = {
    cultivationLevel: npc.cultivation.level,
    speciesId: npc.speciesId,
    roleId: npc.roleId,
    wealth,
    rng,
  };
  const equipment = generateEquipmentForNPC(equipmentContext);
  
  // 2. Надеваем экипировку
  equipItemsToNPC(npc, equipment);
  
  // 3. Генерируем инвентарь
  const inventoryContext: InventoryGenerationContext = {
    cultivationLevel: npc.cultivation.level,
    speciesId: npc.speciesId,
    roleId: npc.roleId,
    wealth,
    combatant,
    rng,
  };
  const inventory = generateInventoryForNPC(inventoryContext);
  
  // 4. Добавляем в quickSlots
  addInventoryToNPC(npc, inventory);
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

/**
 * Проверяет может ли вид носить экипировку
 */
export function canSpeciesEquipEquipment(speciesId: string): boolean {
  // Звери не носят экипировку
  if (BEAST_SPECIES.includes(speciesId)) {
    return false;
  }
  
  // Духи бесплотны
  if (SPIRIT_SPECIES.includes(speciesId)) {
    return false;
  }
  
  return true;
}

/**
 * Определяет уровень богатства по роли
 */
export function getWealthByRole(roleId: string): WealthLevel {
  if (RICH_ROLES.includes(roleId)) {
    return 'rich';
  }
  if (WEALTHY_ROLES.includes(roleId)) {
    return 'wealthy';
  }
  if (POOR_ROLES.includes(roleId)) {
    return 'poor';
  }
  return 'common';
}

/**
 * Проверяет является ли роль боевой
 */
export function isCombatRole(roleId: string): boolean {
  return !NON_COMBAT_ROLES.includes(roleId);
}

/**
 * Получает шансы экипировки для уровня
 */
function getEquipmentChances(level: number): EquipmentChances {
  const validLevel = Math.max(1, Math.min(9, level));
  return BASE_EQUIPMENT_CHANCES[validLevel];
}

/**
 * Получает шансы инвентаря для уровня
 */
function getInventoryChances(level: number): InventoryChances {
  const validLevel = Math.max(1, Math.min(9, level));
  return BASE_INVENTORY_CHANCES[validLevel];
}

/**
 * Случайное число в диапазоне
 */
function randomInRange(range: [number, number], rng: () => number): number {
  return Math.floor(rng() * (range[1] - range[0] + 1)) + range[0];
}

// ==================== ГЕНЕРАЦИЯ ЧЕРЕЗ СУЩЕСТВУЮЩИЕ ГЕНЕРАТОРЫ ====================

/**
 * Генерирует оружие через weapon-generator
 */
function generateWeaponItem(level: number, rng: () => number): TempItem {
  const options: WeaponGenerationOptions = {
    level,
    mode: 'append',
    seed: Date.now() + Math.floor(rng() * 10000),
  };
  
  const weapon = generateWeapon(options, weaponCounter++);
  
  return convertWeaponToTempItem(weapon);
}

/**
 * Генерирует броню через armor-generator
 */
function generateArmorItem(level: number, slot: string, rng: () => number): TempItem {
  const options: ArmorGenerationOptions = {
    level,
    slot: slot as any,
    mode: 'append',
    seed: Date.now() + Math.floor(rng() * 10000),
  };
  
  const armor = generateArmor(options, armorCounter++);
  
  return convertArmorToTempItem(armor);
}

/**
 * Генерирует аксессуар через accessory-generator
 */
function generateAccessoryItem(level: number, rng: () => number): TempItem {
  const options: AccessoryGenerationOptions = {
    level,
    mode: 'append',
  };
  
  const accessory = generateAccessory(options);
  
  return convertAccessoryToTempItem(accessory);
}

/**
 * Генерирует таблетку лечения
 */
function generateHealingPill(level: number, rng: () => number): TempItem {
  const options: ConsumableGenerationOptions = {
    type: 'pill',
    effectType: 'heal_hp',
    level,
    mode: 'append',
  };
  
  const consumable = generateConsumable(options);
  
  return convertConsumableToTempItem(consumable);
}

/**
 * Генерирует эликсир
 */
function generateElixir(level: number, rng: () => number): TempItem {
  const effects: ('buff_stat' | 'buff_resistance')[] = ['buff_stat', 'buff_resistance'];
  const effectType = effects[Math.floor(rng() * effects.length)];
  
  const options: ConsumableGenerationOptions = {
    type: 'elixir',
    effectType,
    level,
    mode: 'append',
  };
  
  const consumable = generateConsumable(options);
  
  return convertConsumableToTempItem(consumable);
}

/**
 * Генерирует еду
 */
function generateFood(level: number, rng: () => number): TempItem {
  const options: ConsumableGenerationOptions = {
    type: 'food',
    level,
    mode: 'append',
  };
  
  const consumable = generateConsumable(options);
  
  return convertConsumableToTempItem(consumable);
}

/**
 * Генерирует предмет хлама
 */
function generateJunkItem(rng: () => number): TempItem {
  const template = JUNK_TEMPLATES[Math.floor(rng() * JUNK_TEMPLATES.length)];
  
  return {
    id: generateTempItemId(),
    name: template.name,
    nameId: template.id,
    type: 'material',
    category: 'material_essence',
    rarity: 'common',
    icon: undefined,
    stats: {},
    effects: [],
    charges: undefined,
    maxCharges: undefined,
    value: template.value,
    requirements: {},
  };
}

// ==================== КОНВЕРТАЦИЯ В TempItem ====================

/**
 * Конвертирует Weapon в TempItem
 */
function convertWeaponToTempItem(weapon: Weapon): TempItem {
  return {
    id: weapon.id,
    name: weapon.name,
    nameId: weapon.id,
    type: 'weapon',
    category: `weapon_${weapon.weaponType}` as any,
    rarity: weapon.rarity,
    icon: undefined,
    stats: {
      damage: weapon.baseDamage,
      defense: undefined,
      qiBonus: undefined,
      healthBonus: undefined,
      fatigueReduction: undefined,
      conductivityBonus: undefined,
    },
    effects: [],
    charges: undefined,
    maxCharges: undefined,
    value: calculateItemValue(weapon.level, weapon.rarity),
    requirements: {
      level: weapon.requirements.cultivationLevel,
      strength: weapon.requirements.strength,
      agility: weapon.requirements.agility,
    },
  };
}

/**
 * Конвертирует Armor в TempItem
 */
function convertArmorToTempItem(armor: Armor): TempItem {
  return {
    id: armor.id,
    name: armor.name,
    nameId: armor.id,
    type: 'armor',
    category: `armor_${armor.slot}` as any,
    rarity: armor.rarity,
    icon: undefined,
    stats: {
      damage: undefined,
      defense: armor.defense.physical,
      qiBonus: undefined,
      healthBonus: undefined,
      fatigueReduction: undefined,
      conductivityBonus: armor.stats.conductivity,
    },
    effects: [],
    charges: undefined,
    maxCharges: undefined,
    value: calculateItemValue(armor.level, armor.rarity),
    requirements: {
      level: armor.requirements.cultivationLevel,
    },
  };
}

/**
 * Конвертирует Accessory в TempItem
 */
function convertAccessoryToTempItem(accessory: GeneratedAccessory): TempItem {
  return {
    id: accessory.id,
    name: accessory.name,
    nameId: accessory.id,
    type: 'accessory',
    category: `accessory_${accessory.type}` as any,
    rarity: accessory.rarity,
    icon: undefined,
    stats: {
      damage: undefined,
      defense: undefined,
      qiBonus: undefined,
      healthBonus: undefined,
      fatigueReduction: undefined,
      conductivityBonus: 'bonuses' in accessory ? accessory.bonuses?.stats?.conductivity : undefined,
    },
    effects: [],
    charges: undefined,
    maxCharges: undefined,
    value: calculateItemValue(accessory.level, accessory.rarity),
    requirements: {},
  };
}

/**
 * Конвертирует Consumable в TempItem
 */
function convertConsumableToTempItem(consumable: Consumable): TempItem {
  return {
    id: consumable.id,
    name: consumable.name,
    nameId: consumable.id,
    type: 'consumable',
    category: `consumable_${consumable.type}` as any,
    rarity: consumable.rarity,
    icon: undefined,
    stats: {},
    effects: [
      {
        type: mapEffectType(consumable.effect.type),
        value: consumable.effect.value,
        duration: consumable.effect.duration,
      },
    ],
    charges: consumable.quantity,
    maxCharges: consumable.stackSize,
    value: calculateConsumableValue(consumable),
    requirements: {},
  };
}

/**
 * Маппинг типов эффектов
 */
function mapEffectType(type: string): any {
  const mapping: Record<string, string> = {
    'heal_hp': 'heal',
    'heal_stamina': 'fatigue_restore',
    'buff_stat': 'strength_boost',
    'buff_resistance': 'defense_boost',
    'cure': 'heal',
    'special': 'heal',
  };
  return mapping[type] || 'heal';
}

/**
 * Рассчитывает стоимость предмета
 */
function calculateItemValue(level: number, rarity: string): number {
  const baseValue = 10 * level;
  const rarityMult = {
    common: 1,
    uncommon: 1.5,
    rare: 2.5,
    legendary: 4,
  };
  return Math.floor(baseValue * (rarityMult[rarity as keyof typeof rarityMult] || 1));
}

/**
 * Рассчитывает стоимость расходника
 */
function calculateConsumableValue(consumable: Consumable): number {
  const baseValue = 5 * consumable.level;
  const rarityMult = {
    common: 1,
    uncommon: 1.5,
    rare: 2.5,
    legendary: 4,
  };
  return Math.floor(baseValue * (rarityMult[consumable.rarity] || 1));
}

// ==================== СБРОС СЧЁТЧИКОВ ====================

/**
 * Сбросить счётчики генерации
 */
export function resetEquipmentCounters(): void {
  weaponCounter = 1;
  armorCounter = 1;
  consumableCounter = 1;
}

// ==================== ЭКСПОРТ КОНСТАНТ ====================

export { BEAST_SPECIES, SPIRIT_SPECIES, RICH_ROLES, WEALTHY_ROLES, POOR_ROLES, JUNK_TEMPLATES };
