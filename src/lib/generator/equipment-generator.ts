/**
 * ============================================================================
 * ОРКЕСТРАТОР ЭКИПИРОВКИ И ИНВЕНТАРЯ NPC (V2 BRIDGE)
 * ============================================================================
 * 
 * Обёртка над equipment-generator-v2.ts:
 * - Использует generateEquipmentV2 для экипировки
 * - Использует consumable-generator для расходников
 * 
 * Определяет:
 * - Шансы экипировки по уровню NPC
 * - Какие слоты заполнять для конкретного NPC
 * - Уровень богатства по роли
 * - Генерацию инвентаря (расходники, хлам)
 */

import {
  type TempItem,
  type TempEquipment,
  type TempNPC,
  generateTempItemId,
} from '@/types/temp-npc';
import {
  generateEquipmentV2,
  convertToTempItem,
  type EquipmentType,
  type EquipmentGrade,
} from './equipment-generator-v2';
import {
  generateConsumable,
  type Consumable,
  type ConsumableGenerationOptions,
} from './consumable-generator';
import { randomInRange as randomInRangeUtil } from './lore-formulas';

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
  combatant: boolean;
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
  healingPills: number;
  healingPillsCount: [number, number];
  elixirs: number;
  elixirsCount: [number, number];
  food: number;
  foodCount: [number, number];
  junk: number;
  junkCount: [number, number];
}

/**
 * Предмет хлама
 */
interface JunkItem {
  id: string;
  name: string;
  type: 'clothing' | 'tool' | 'misc';
  condition: 'worn' | 'damaged' | 'broken';
  value: number;
}

// ==================== КОНСТАНТЫ ====================

const WEALTH_MULTIPLIERS: Record<WealthLevel, number> = {
  poor: 0.5,
  common: 1.0,
  wealthy: 1.3,
  rich: 1.6,
};

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

const BASE_INVENTORY_CHANCES: Record<number, InventoryChances> = {
  1: { healingPills: 40, healingPillsCount: [1, 2], elixirs: 0, elixirsCount: [0, 0], food: 60, foodCount: [1, 3], junk: 50, junkCount: [0, 2] },
  2: { healingPills: 50, healingPillsCount: [1, 3], elixirs: 10, elixirsCount: [0, 1], food: 55, foodCount: [1, 3], junk: 40, junkCount: [0, 2] },
  3: { healingPills: 60, healingPillsCount: [2, 4], elixirs: 20, elixirsCount: [0, 1], food: 50, foodCount: [1, 2], junk: 30, junkCount: [0, 1] },
  4: { healingPills: 65, healingPillsCount: [2, 5], elixirs: 25, elixirsCount: [0, 2], food: 45, foodCount: [1, 2], junk: 25, junkCount: [0, 1] },
  5: { healingPills: 70, healingPillsCount: [3, 6], elixirs: 30, elixirsCount: [1, 2], food: 40, foodCount: [1, 2], junk: 20, junkCount: [0, 1] },
  6: { healingPills: 75, healingPillsCount: [3, 7], elixirs: 35, elixirsCount: [1, 2], food: 35, foodCount: [0, 2], junk: 15, junkCount: [0, 1] },
  7: { healingPills: 80, healingPillsCount: [4, 8], elixirs: 40, elixirsCount: [1, 3], food: 30, foodCount: [0, 2], junk: 10, junkCount: [0, 1] },
  8: { healingPills: 85, healingPillsCount: [5, 10], elixirs: 45, elixirsCount: [1, 3], food: 25, foodCount: [0, 1], junk: 5, junkCount: [0, 1] },
  9: { healingPills: 90, healingPillsCount: [6, 12], elixirs: 50, elixirsCount: [2, 4], food: 20, foodCount: [0, 1], junk: 0, junkCount: [0, 0] },
};

const BEAST_SPECIES = ['wolf', 'tiger', 'bear', 'snake', 'eagle', 'dragon_beast', 'lion', 'panther'];
const SPIRIT_SPECIES = ['fire_elemental', 'water_elemental', 'ghost', 'wind_spirit', 'earth_spirit'];
const RICH_ROLES = ['sect_master', 'elder', 'noble', 'merchant_guild_leader'];
const WEALTHY_ROLES = ['merchant', 'inner_disciple', 'core_member', 'alchemist', 'blacksmith'];
const POOR_ROLES = ['beggar', 'refugee', 'outer_disciple', 'servant', 'slave'];
const NON_COMBAT_ROLES = ['merchant', 'beggar', 'servant', 'slave', 'refugee'];

const JUNK_TEMPLATES: JunkItem[] = [
  { id: 'junk_worn_robe', name: 'Драная роба', type: 'clothing', condition: 'worn', value: 1 },
  { id: 'junk_worn_shirt', name: 'Старая рубаха', type: 'clothing', condition: 'worn', value: 1 },
  { id: 'junk_torn_pants', name: 'Рваные штаны', type: 'clothing', condition: 'damaged', value: 1 },
  { id: 'junk_old_boots', name: 'Стёртые сапоги', type: 'clothing', condition: 'worn', value: 2 },
  { id: 'junk_dirty_cloak', name: 'Грязный плащ', type: 'clothing', condition: 'damaged', value: 1 },
  { id: 'junk_worn_hat', name: 'Потрёпанная шляпа', type: 'clothing', condition: 'worn', value: 1 },
  { id: 'junk_broken_knife', name: 'Сломанный нож', type: 'tool', condition: 'broken', value: 1 },
  { id: 'junk_dull_axe', name: 'Тупой топор', type: 'tool', condition: 'damaged', value: 2 },
  { id: 'junk_rusty_saw', name: 'Ржавая пила', type: 'tool', condition: 'damaged', value: 1 },
  { id: 'junk_cracked_pot', name: 'Треснутый горшок', type: 'tool', condition: 'damaged', value: 1 },
  { id: 'junk_broken_bowl', name: 'Разбитая чаша', type: 'misc', condition: 'broken', value: 1 },
  { id: 'junk_old_rope', name: 'Старая верёвка', type: 'misc', condition: 'worn', value: 1 },
  { id: 'junk_ragged_blanket', name: 'Дряхлое одеяло', type: 'misc', condition: 'worn', value: 1 },
  { id: 'junk_cracked_mirror', name: 'Треснутое зеркало', type: 'misc', condition: 'damaged', value: 2 },
  { id: 'junk_bent_spoon', name: 'Погнутая ложка', type: 'misc', condition: 'damaged', value: 1 },
];

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Генерация экипировки для NPC (V2)
 */
export function generateEquipmentForNPC(
  context: EquipmentGenerationContext
): TempEquipment {
  const { cultivationLevel, speciesId, roleId, wealth, rng } = context;
  const equipment: TempEquipment = {};
  
  if (!canSpeciesEquipEquipment(speciesId)) {
    return equipment;
  }
  
  const levelChances = getEquipmentChances(cultivationLevel);
  const wealthMult = WEALTH_MULTIPLIERS[wealth];
  
  // Оружие
  if (rng() * 100 < levelChances.weapon * wealthMult) {
    equipment.weapon = generateWeaponItemV2(cultivationLevel, rng);
  }
  
  // Броня (torso)
  if (rng() * 100 < levelChances.armor * wealthMult) {
    equipment.armor = generateArmorItemV2(cultivationLevel, 'torso', rng);
  }
  
  // Шлем
  if (levelChances.helmet > 0 && rng() * 100 < levelChances.helmet * wealthMult) {
    equipment.helmet = generateArmorItemV2(cultivationLevel, 'head', rng);
  }
  
  // Сапоги
  if (rng() * 100 < levelChances.boots * wealthMult) {
    equipment.boots = generateArmorItemV2(cultivationLevel, 'feet', rng);
  }
  
  // Перчатки
  if (levelChances.gloves > 0 && rng() * 100 < levelChances.gloves * wealthMult) {
    equipment.gloves = generateArmorItemV2(cultivationLevel, 'hands_gloves', rng);
  }
  
  // Аксессуар
  if (levelChances.accessory > 0 && rng() * 100 < levelChances.accessory * wealthMult) {
    equipment.accessory1 = generateAccessoryItemV2(cultivationLevel, rng);
  }
  
  return equipment;
}

/**
 * Генерация инвентаря для NPC
 */
export function generateInventoryForNPC(
  context: InventoryGenerationContext
): TempItem[] {
  const { cultivationLevel, speciesId, wealth, combatant, rng } = context;
  const inventory: TempItem[] = [];
  
  if (!canSpeciesEquipEquipment(speciesId)) {
    return inventory;
  }
  
  const levelChances = getInventoryChances(cultivationLevel);
  const wealthMult = WEALTH_MULTIPLIERS[wealth];
  const junkMult = wealth === 'poor' ? 2.0 : wealth === 'rich' ? 0.0 : 1.0;
  
  if (combatant) {
    if (rng() * 100 < levelChances.healingPills * wealthMult) {
      const count = randomInRangeUtil(levelChances.healingPillsCount, rng);
      for (let i = 0; i < count; i++) {
        inventory.push(generateHealingPill(cultivationLevel, rng));
      }
    }
    
    if (levelChances.elixirs > 0 && rng() * 100 < levelChances.elixirs * wealthMult) {
      const count = randomInRangeUtil(levelChances.elixirsCount, rng);
      for (let i = 0; i < count; i++) {
        inventory.push(generateElixir(cultivationLevel, rng));
      }
    }
  }
  
  const foodChances = getInventoryChances(cultivationLevel);
  if (rng() * 100 < foodChances.food * wealthMult) {
    const count = randomInRangeUtil(foodChances.foodCount, rng);
    for (let i = 0; i < count; i++) {
      inventory.push(generateFood(cultivationLevel, rng));
    }
  }
  
  if (levelChances.junk > 0 && rng() * 100 < levelChances.junk * junkMult) {
    const count = randomInRangeUtil(levelChances.junkCount, rng);
    for (let i = 0; i < count; i++) {
      inventory.push(generateJunkItem(rng));
    }
  }
  
  return inventory;
}

/**
 * Экипировка NPC сгенерированными предметами
 */
export function equipItemsToNPC(npc: TempNPC, equipment: TempEquipment): void {
  if (equipment.weapon && !npc.equipment.weapon) npc.equipment.weapon = equipment.weapon;
  if (equipment.armor && !npc.equipment.armor) npc.equipment.armor = equipment.armor;
  if (equipment.helmet && !npc.equipment.helmet) npc.equipment.helmet = equipment.helmet;
  if (equipment.boots && !npc.equipment.boots) npc.equipment.boots = equipment.boots;
  if (equipment.gloves && !npc.equipment.gloves) npc.equipment.gloves = equipment.gloves;
  if (equipment.accessory1 && !npc.equipment.accessory1) npc.equipment.accessory1 = equipment.accessory1;
  if (equipment.accessory2 && !npc.equipment.accessory2) npc.equipment.accessory2 = equipment.accessory2;
}

/**
 * Добавление инвентаря в quickSlots NPC
 */
export function addInventoryToNPC(npc: TempNPC, items: TempItem[]): void {
  if (!npc.quickSlots) {
    npc.quickSlots = [null, null, null, null];
  }
  
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
  
  const equipmentContext: EquipmentGenerationContext = {
    cultivationLevel: npc.cultivation.level,
    speciesId: npc.speciesId,
    roleId: npc.roleId,
    wealth,
    rng,
  };
  const equipment = generateEquipmentForNPC(equipmentContext);
  equipItemsToNPC(npc, equipment);
  
  const inventoryContext: InventoryGenerationContext = {
    cultivationLevel: npc.cultivation.level,
    speciesId: npc.speciesId,
    roleId: npc.roleId,
    wealth,
    combatant,
    rng,
  };
  const inventory = generateInventoryForNPC(inventoryContext);
  addInventoryToNPC(npc, inventory);
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

export function canSpeciesEquipEquipment(speciesId: string): boolean {
  if (BEAST_SPECIES.includes(speciesId)) return false;
  if (SPIRIT_SPECIES.includes(speciesId)) return false;
  return true;
}

export function getWealthByRole(roleId: string): WealthLevel {
  if (RICH_ROLES.includes(roleId)) return 'rich';
  if (WEALTHY_ROLES.includes(roleId)) return 'wealthy';
  if (POOR_ROLES.includes(roleId)) return 'poor';
  return 'common';
}

export function isCombatRole(roleId: string): boolean {
  return !NON_COMBAT_ROLES.includes(roleId);
}

function getEquipmentChances(level: number): EquipmentChances {
  return BASE_EQUIPMENT_CHANCES[Math.max(1, Math.min(9, level))];
}

function getInventoryChances(level: number): InventoryChances {
  return BASE_INVENTORY_CHANCES[Math.max(1, Math.min(9, level))];
}

// randomInRange импортируется из lore-formulas

// ==================== V2 ГЕНЕРАЦИЯ ====================

/**
 * Генерирует оружие через equipment-generator-v2
 */
function generateWeaponItemV2(level: number, rng: () => number): TempItem {
  const equipment = generateEquipmentV2({
    type: 'weapon',
    level,
    seed: Date.now() + Math.floor(rng() * 10000),
  });
  return convertToTempItem(equipment);
}

/**
 * Генерирует броню через equipment-generator-v2
 */
function generateArmorItemV2(level: number, slot: string, rng: () => number): TempItem {
  // Маппинг слотов для V2
  const armorTypeMap: Record<string, string> = {
    'torso': 'armor',
    'head': 'armor',
    'feet': 'armor',
    'hands_gloves': 'armor',
  };
  
  const equipment = generateEquipmentV2({
    type: 'armor',
    level,
    seed: Date.now() + Math.floor(rng() * 10000),
  });
  
  const tempItem = convertToTempItem(equipment);
  // Добавляем информацию о слоте
  tempItem.category = `armor_${slot}` as any;
  return tempItem;
}

/**
 * Генерирует аксессуар через equipment-generator-v2
 */
function generateAccessoryItemV2(level: number, rng: () => number): TempItem {
  const equipment = generateEquipmentV2({
    type: 'accessory',
    level,
    seed: Date.now() + Math.floor(rng() * 10000),
  });
  return convertToTempItem(equipment);
}

// ==================== РАСХОДНИКИ (остаётся через V1) ====================

function generateHealingPill(level: number, rng: () => number): TempItem {
  const options: ConsumableGenerationOptions = {
    type: 'pill',
    effectType: 'heal_hp',
    level,
    mode: 'append',
  };
  return convertConsumableToTempItem(generateConsumable(options));
}

function generateElixir(level: number, rng: () => number): TempItem {
  const effects: ('buff_stat' | 'buff_resistance')[] = ['buff_stat', 'buff_resistance'];
  const effectType = effects[Math.floor(rng() * effects.length)];
  
  const options: ConsumableGenerationOptions = {
    type: 'elixir',
    effectType,
    level,
    mode: 'append',
  };
  return convertConsumableToTempItem(generateConsumable(options));
}

function generateFood(level: number, rng: () => number): TempItem {
  const options: ConsumableGenerationOptions = {
    type: 'food',
    level,
    mode: 'append',
  };
  return convertConsumableToTempItem(generateConsumable(options));
}

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

// ==================== КОНВЕРТАЦИЯ ====================

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

function calculateConsumableValue(consumable: Consumable): number {
  const baseValue = 5 * consumable.level;
  const rarityMult: Record<string, number> = {
    common: 1,
    uncommon: 1.5,
    rare: 2.5,
    legendary: 4,
  };
  return Math.floor(baseValue * (rarityMult[consumable.rarity] || 1));
}

// ==================== ЭКСПОРТ КОНСТАНТ ====================

export { BEAST_SPECIES, SPIRIT_SPECIES, RICH_ROLES, WEALTHY_ROLES, POOR_ROLES, JUNK_TEMPLATES };
