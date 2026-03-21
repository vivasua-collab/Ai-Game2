/**
 * ============================================================================
 * УНИФИЦИРОВАННАЯ СИСТЕМА RARITY
 * ============================================================================
 * 
 * Единая точка реэкспорта редкости для всего проекта.
 * 
 * ItemRarity (6 значений) - определён в inventory.ts
 * Rarity (4 значения) - базовая редкость
 */

// ==================== ИМПОРТ ИЗ ИСТОЧНИКА ====================

// ItemRarity - самый полный тип (6 значений)
export type { ItemRarity } from './inventory';

// ==================== БАЗОВЫЙ ТИП RARITY ====================

/**
 * Базовая редкость (4 значения)
 * Используется для: техники, расходники, формации, NPC
 */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

// ==================== КОНСТАНТЫ ====================

/**
 * Порядок редкости (для сортировки и сравнения)
 */
export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];

/**
 * Полный порядок редкости (с epic и mythic)
 */
export const ITEM_RARITY_ORDER: (Rarity | 'epic' | 'mythic')[] = 
  ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

/**
 * Цвета редкости (hex)
 */
export const RARITY_COLORS: Record<Rarity | 'epic' | 'mythic', string> = {
  common: '#9ca3af',    // gray-400
  uncommon: '#22c55e',  // green-500
  rare: '#3b82f6',      // blue-500
  epic: '#a855f7',      // purple-500
  legendary: '#f97316', // orange-500
  mythic: '#ef4444',    // red-500
};

/**
 * Tailwind классы для текста по редкости
 */
export const RARITY_TEXT_COLORS: Record<Rarity | 'epic' | 'mythic', string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-500',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-orange-500',
  mythic: 'text-red-500',
};

/**
 * Tailwind классы для border и background по редкости
 */
export const RARITY_BORDER_COLORS: Record<Rarity | 'epic' | 'mythic', string> = {
  common: 'border-gray-500 bg-gray-700/50',
  uncommon: 'border-green-500 bg-green-900/30',
  rare: 'border-blue-500 bg-blue-900/30',
  epic: 'border-purple-500 bg-purple-900/30',
  legendary: 'border-orange-500 bg-orange-900/30',
  mythic: 'border-red-500 bg-red-900/30',
};

/**
 * Phaser hex числа для редкости
 */
export const RARITY_COLORS_PHASER: Record<Rarity | 'epic' | 'mythic', number> = {
  common: 0x9ca3af,
  uncommon: 0x22c55e,
  rare: 0x3b82f6,
  epic: 0xa855f7,
  legendary: 0xf97316,
  mythic: 0xef4444,
};

/**
 * Русские названия редкости
 */
export const RARITY_NAMES: Record<Rarity | 'epic' | 'mythic', string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
  mythic: 'Мифический',
};

/**
 * Множители стоимости по редкости
 */
export const RARITY_VALUE_MULTIPLIERS: Record<Rarity | 'epic' | 'mythic', number> = {
  common: 1.0,
  uncommon: 1.5,
  rare: 2.5,
  epic: 4.0,
  legendary: 6.0,
  mythic: 10.0,
};

/**
 * Множители силы по редкости
 */
export const RARITY_POWER_MULTIPLIERS: Record<Rarity | 'epic' | 'mythic', number> = {
  common: 0.8,
  uncommon: 1.0,
  rare: 1.25,
  epic: 1.5,
  legendary: 1.8,
  mythic: 2.2,
};

// ==================== УТИЛИТЫ ====================

/**
 * Получить индекс редкости (для сравнения)
 */
export function getRarityIndex(rarity: Rarity | 'epic' | 'mythic'): number {
  return ITEM_RARITY_ORDER.indexOf(rarity);
}

/**
 * Сравнить две редкости
 * @returns -1 если a < b, 0 если равны, 1 если a > b
 */
export function compareRarity(
  a: Rarity | 'epic' | 'mythic', 
  b: Rarity | 'epic' | 'mythic'
): number {
  return Math.sign(getRarityIndex(a) - getRarityIndex(b));
}

/**
 * Проверить валидность редкости
 */
export function isValidRarity(value: string): value is Rarity {
  return RARITY_ORDER.includes(value as Rarity);
}

/**
 * Проверить валидность ItemRarity
 */
export function isValidItemRarity(value: string): value is Rarity | 'epic' | 'mythic' {
  return ITEM_RARITY_ORDER.includes(value as Rarity | 'epic' | 'mythic');
}

/**
 * Парсить строку в Rarity (с fallback)
 */
export function parseRarity(value: string, fallback: Rarity = 'common'): Rarity {
  if (isValidRarity(value)) return value;
  // Поддержка epic -> rare, mythic -> legendary
  if (value === 'epic') return 'rare';
  if (value === 'mythic') return 'legendary';
  return fallback;
}

/**
 * Конвертировать ItemRarity в Rarity (epic → rare, mythic → legendary)
 */
export function itemRarityToRarity(rarity: Rarity | 'epic' | 'mythic'): Rarity {
  switch (rarity) {
    case 'epic':
      return 'rare';
    case 'mythic':
      return 'legendary';
    default:
      return rarity;
  }
}

/**
 * Получить случайную редкость по распределению
 */
export function getRandomRarity(level: number, rng: () => number = Math.random): Rarity {
  const legendaryChance = Math.min(0.05, level * 0.005);
  const rareChance = Math.min(0.20, 0.05 + level * 0.02);
  const uncommonChance = Math.min(0.40, 0.15 + level * 0.03);
  
  const roll = rng();
  
  if (roll < legendaryChance) return 'legendary';
  if (roll < legendaryChance + rareChance) return 'rare';
  if (roll < legendaryChance + rareChance + uncommonChance) return 'uncommon';
  return 'common';
}
