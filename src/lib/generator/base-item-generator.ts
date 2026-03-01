/**
 * ============================================================================
 * БАЗОВЫЙ ГЕНЕРАТОР ПРЕДМЕТОВ
 * ============================================================================
 * 
 * Общие утилиты для всех генераторов предметов.
 * Базируется на архитектуре technique-generator.ts
 * 
 * Принципы:
 * - Детерминированная генерация через seed
 * - Система редкости с весами
 * - Утилиты для выбора по весу
 */

// ==================== ТИПЫ ====================

/**
 * Редкость предмета
 */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/**
 * Элемент (для имени и свойств)
 */
export type Element = 
  | 'fire' 
  | 'water' 
  | 'earth' 
  | 'air' 
  | 'lightning' 
  | 'void' 
  | 'neutral';

/**
 * Род слова (для согласования прилагательных)
 */
export type Gender = 'male' | 'female' | 'neuter';

/**
 * Базовые опции генерации
 */
export interface BaseGenerationOptions {
  level?: number;
  minLevel?: number;
  maxLevel?: number;
  rarity?: Rarity;
  rarities?: Rarity[];
  count?: number;
  mode: 'replace' | 'append';
  seed?: number;
}

/**
 * Результат генерации
 */
export interface GenerationResult<T> {
  success: boolean;
  generated: number;
  total: number;
  items: T[];
  errors: string[];
  warnings: string[];
}

// ==================== КОНСТАНТЫ ====================

/**
 * Модификаторы редкости
 */
export const RARITY_MULTIPLIERS: Record<Rarity, {
  statMult: number;
  qualityMult: number;
  effectChanceMult: number;
  maxEffects: number;
  weight: number;
}> = {
  common:     { statMult: 0.8,  qualityMult: 1.0,  effectChanceMult: 0.5,  maxEffects: 0, weight: 50 },
  uncommon:   { statMult: 1.0,  qualityMult: 1.1,  effectChanceMult: 0.8,  maxEffects: 1, weight: 30 },
  rare:       { statMult: 1.25, qualityMult: 1.3,  effectChanceMult: 1.2,  maxEffects: 2, weight: 15 },
  legendary:  { statMult: 1.6,  qualityMult: 1.6,  effectChanceMult: 1.5,  maxEffects: 3, weight: 5 },
};

/**
 * Информация о редкости для UI
 */
export const RARITY_INFO: Record<Rarity, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  bonusSlots: number;
  description: string;
}> = {
  common: {
    label: 'Обычная',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500',
    borderColor: 'border-slate-500',
    bonusSlots: 0,
    description: 'Базовый предмет без дополнительных бонусов',
  },
  uncommon: {
    label: 'Необычная',
    color: 'text-green-400',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-500',
    bonusSlots: 1,
    description: 'Предмет с одним дополнительным бонусом',
  },
  rare: {
    label: 'Редкая',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500',
    bonusSlots: 2,
    description: 'Предмет с двумя дополнительными бонусами',
  },
  legendary: {
    label: 'Легендарная',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-500',
    bonusSlots: 3,
    description: 'Предмет с тремя мощными бонусами',
  },
};

/**
 * Множители элементов
 */
export const ELEMENT_MULTIPLIERS: Record<Element, {
  damage: number;
  defense: number;
  special: string[];
}> = {
  fire:      { damage: 1.15, defense: 0.9,  special: ['burning', 'heat'] },
  water:     { damage: 1.0,  defense: 1.1,  special: ['freezing', 'flow'] },
  earth:     { damage: 1.1,  defense: 1.25, special: ['stability', 'weight'] },
  air:       { damage: 0.9,  defense: 0.95, special: ['speed', 'lightness'] },
  lightning: { damage: 1.3,  defense: 0.85, special: ['stun', 'chain'] },
  void:      { damage: 1.5,  defense: 0.7,  special: ['pierce', 'drain'] },
  neutral:   { damage: 1.0,  defense: 1.0,  special: [] },
};

// ==================== УТИЛИТЫ ====================

/**
 * Детерминированный генератор случайных чисел
 * Использует линейный конгруэнтный метод
 */
export function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/**
 * Хеширование строки в число
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Выбор элемента по весу
 */
export function weightedSelect<T extends { weight: number }>(
  items: T[], 
  rng: () => number
): T | null {
  if (items.length === 0) return null;
  
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = rng() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  
  return items[items.length - 1];
}

/**
 * Выбор случайного элемента из массива
 */
export function randomSelect<T>(items: T[], rng: () => number): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(rng() * items.length)];
}

/**
 * Случайное число в диапазоне
 */
export function randomRange(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

/**
 * Случайное целое в диапазоне (включительно)
 */
export function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(min + rng() * (max - min + 1));
}

/**
 * Выбор редкости по весу
 */
export function selectRarity(rng: () => number, forcedRarity?: Rarity): Rarity {
  if (forcedRarity) return forcedRarity;
  
  const roll = rng() * 100;
  let cumulative = 0;
  
  for (const [rarity, data] of Object.entries(RARITY_MULTIPLIERS)) {
    cumulative += data.weight;
    if (roll < cumulative) {
      return rarity as Rarity;
    }
  }
  
  return 'common';
}

/**
 * Генерация ID с префиксом
 */
export function generateItemId(prefix: string, counter: number): string {
  return `${prefix}_${counter.toString().padStart(6, '0')}`;
}

/**
 * Создание seed из нескольких параметров
 */
export function createSeed(...params: (string | number)[]): number {
  const combined = params.map(p => String(p)).join('_');
  return hashString(combined);
}

/**
 * Округление до指定ного количества знаков
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Проверка на валидность редкости
 */
export function isValidRarity(value: string): value is Rarity {
  return ['common', 'uncommon', 'rare', 'legendary'].includes(value);
}

/**
 * Получение индекса редкости (0-3)
 */
export function getRarityIndex(rarity: Rarity): number {
  return ['common', 'uncommon', 'rare', 'legendary'].indexOf(rarity);
}

/**
 * Битовые флаги улучшений
 */
export const UPGRADE_FLAGS = {
  NONE: 0,           // 0000 - без улучшений
  REINFORCED: 1,     // 0001 - усиление
  ENCHANTED: 2,      // 0010 - зачарование
  REFINED: 4,        // 0100 - очистка
  MASTERWORK: 8,     // 1000 - мастерская работа
  // Комбинации:
  REINFORCED_ENCHANTED: 3,   // 0011
  REFINED_MASTERWORK: 12,    // 1100
  MAX: 15,           // 1111 - все улучшения
} as const;

/**
 * Проверка наличия флага улучшения
 */
export function hasUpgrade(flags: number, upgrade: number): boolean {
  return (flags & upgrade) === upgrade;
}

/**
 * Добавление флага улучшения
 */
export function addUpgrade(flags: number, upgrade: number): number {
  return flags | upgrade;
}

/**
 * Подсчёт количества установленных флагов
 */
export function countUpgrades(flags: number): number {
  let count = 0;
  let n = flags;
  while (n) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}

/**
 * Случайная генерация флагов улучшений на основе редкости
 */
export function generateUpgradeFlags(rarity: Rarity, rng: () => number): number {
  const rarityIndex = getRarityIndex(rarity);
  
  // common: 0% шанс улучшений
  // uncommon: 20% шанс 1 улучшения
  // rare: 50% шанс 1-2 улучшений
  // legendary: 80% шанс 2-3 улучшений
  
  if (rarityIndex === 0) return 0;
  
  const chance = rarityIndex * 0.25 + 0.05; // 0.3, 0.55, 0.8
  if (rng() > chance) return 0;
  
  const maxUpgrades = Math.min(rarityIndex + 1, 3);
  const numUpgrades = randomInt(1, maxUpgrades, rng);
  
  const availableFlags = [UPGRADE_FLAGS.REINFORCED, UPGRADE_FLAGS.ENCHANTED, UPGRADE_FLAGS.REFINED, UPGRADE_FLAGS.MASTERWORK];
  let flags = 0;
  
  for (let i = 0; i < numUpgrades && availableFlags.length > 0; i++) {
    const idx = Math.floor(rng() * availableFlags.length);
    flags = addUpgrade(flags, availableFlags[idx]);
    availableFlags.splice(idx, 1);
  }
  
  return flags;
}

// ==================== УДАЛЕНИЕ ДУБЛИКАТОВ ====================

/**
 * Результат удаления дубликатов
 */
export interface DedupResult<T> {
  unique: T[];
  duplicates: number;
  removedIds: string[];
  duplicateGroups: Array<{
    signature: string;
    count: number;
    keptId: string;
    removedIds: string[];
  }>;
}

/**
 * Универсальная функция создания сигнатуры предмета
 * Создаёт строковый ключ на основе значимых полей
 */
export function createItemSignature(
  item: Record<string, unknown>,
  fields: string[]
): string {
  const parts: string[] = [];
  
  for (const field of fields) {
    const value = item[field];
    
    if (value === undefined || value === null) {
      parts.push('null');
    } else if (typeof value === 'object') {
      // Для объектов (defense, stats и т.д.) - сортируем ключи
      const sorted = Object.entries(value as Record<string, unknown>)
        .filter(([_, v]) => v !== undefined && v !== null)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${roundTo(Number(v) || 0, 1)}`);
      parts.push(sorted.join(','));
    } else if (typeof value === 'number') {
      // Округляем числа до 1 знака
      parts.push(String(roundTo(value, 1)));
    } else {
      parts.push(String(value));
    }
  }
  
  return parts.join('|');
}

/**
 * Универсальная функция удаления дубликатов
 * @param items - массив предметов
 * @param signatureFields - поля для создания сигнатуры
 * @returns результат с уникальными предметами и статистикой
 */
export function removeDuplicateItems<T extends { id: string }>(
  items: T[],
  signatureFields: string[]
): DedupResult<T> {
  const signatureMap = new Map<string, T[]>();
  
  // Группируем по сигнатуре
  for (const item of items) {
    const signature = createItemSignature(item as Record<string, unknown>, signatureFields);
    if (!signatureMap.has(signature)) {
      signatureMap.set(signature, []);
    }
    signatureMap.get(signature)!.push(item);
  }
  
  const unique: T[] = [];
  const removedIds: string[] = [];
  const duplicateGroups: DedupResult<T>['duplicateGroups'] = [];
  
  for (const [signature, group] of signatureMap) {
    // Сортируем по ID для детерминированности
    group.sort((a, b) => a.id.localeCompare(b.id));
    
    // Оставляем первый предмет
    const [kept, ...duplicates] = group;
    unique.push(kept);
    
    if (duplicates.length > 0) {
      removedIds.push(...duplicates.map(d => d.id));
      duplicateGroups.push({
        signature,
        count: group.length,
        keptId: kept.id,
        removedIds: duplicates.map(d => d.id),
      });
    }
  }
  
  return {
    unique,
    duplicates: items.length - unique.length,
    removedIds,
    duplicateGroups,
  };
}

/**
 * Сигнатуры для разных типов предметов
 */
export const ITEM_SIGNATURE_FIELDS = {
  weapon: [
    'category', 'weaponType', 'rarity',
    'baseDamage', 'baseRange', 'attackSpeed',
    'upgradeFlags'
  ],
  armor: [
    'slot', 'rarity',
    'defense.physical', 'defense.qi',
    'upgradeFlags'
  ],
  accessory: [
    'slot', 'accessoryType', 'rarity',
    'bonuses.stats.strength', 'bonuses.stats.agility',
    'bonuses.stats.intelligence', 'bonuses.stats.conductivity',
    'upgradeFlags'
  ],
  consumable: [
    'type', 'rarity',
    'effect.type', 'effect.value', 'effect.duration'
  ],
  qi_stone: [
    'sizeClass', 'type', 'totalQi'
  ],
  charger: [
    'capacity', 'efficiency', 'chargeRate', 'rarity'
  ],
} as const;

/**
 * Специализированные функции dedup для каждого типа
 */
export function removeDuplicateWeapons(weapons: Array<{ id: string } & Record<string, unknown>>): DedupResult<{ id: string } & Record<string, unknown>> {
  return removeDuplicateItems(weapons, [...ITEM_SIGNATURE_FIELDS.weapon]);
}

export function removeDuplicateArmors(armors: Array<{ id: string } & Record<string, unknown>>): DedupResult<{ id: string } & Record<string, unknown>> {
  return removeDuplicateItems(armors, [...ITEM_SIGNATURE_FIELDS.armor]);
}

export function removeDuplicateAccessories(accessories: Array<{ id: string } & Record<string, unknown>>): DedupResult<{ id: string } & Record<string, unknown>> {
  return removeDuplicateItems(accessories, [...ITEM_SIGNATURE_FIELDS.accessory]);
}

export function removeDuplicateConsumables(consumables: Array<{ id: string } & Record<string, unknown>>): DedupResult<{ id: string } & Record<string, unknown>> {
  return removeDuplicateItems(consumables, [...ITEM_SIGNATURE_FIELDS.consumable]);
}

export function removeDuplicateQiStones(stones: Array<{ id: string } & Record<string, unknown>>): DedupResult<{ id: string } & Record<string, unknown>> {
  return removeDuplicateItems(stones, [...ITEM_SIGNATURE_FIELDS.qi_stone]);
}

export function removeDuplicateChargers(chargers: Array<{ id: string } & Record<string, unknown>>): DedupResult<{ id: string } & Record<string, unknown>> {
  return removeDuplicateItems(chargers, [...ITEM_SIGNATURE_FIELDS.charger]);
}
