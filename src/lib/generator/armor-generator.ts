/**
 * ============================================================================
 * ГЕНЕРАТОР ЭКИПИРОВКИ (БРОНИ)
 * ============================================================================
 * 
 * Процедурная генерация экипировки с параметрами.
 * Префикс ID: AR (AR_000001, AR_000002, ...)
 * 
 * Принципы:
 * - Base + Modifiers: базовый объект + модификаторы
 * - Детерминированная генерация через seed
 * - Балансировка по формулам уровня
 * - Система редкости с весами
 */

import {
  seededRandom,
  selectRarity,
  randomRange,
  randomInt,
  generateItemId,
  createSeed,
  roundTo,
  generateUpgradeFlags,
  RARITY_MULTIPLIERS,
  ELEMENT_MULTIPLIERS,
  type Rarity,
  type Element,
  type GenerationResult,
} from './base-item-generator';

import {
  EQUIPMENT_SLOT_CONFIGS,
  type EquipmentSlot,
} from './item-config';

import {
  generateArmorName,
} from './name-generator';

// ==================== ТИПЫ ====================

/**
 * Защита экипировки
 */
export interface ArmorDefense {
  physical: number;     // Физическая защита
  qi: number;           // Защита от Ци
  elemental: {
    fire: number;
    water: number;
    earth: number;
    air: number;
    lightning: number;
    void: number;
  };
}

/**
 * Характеристики экипировки
 */
export interface ArmorStats {
  strength?: number;
  agility?: number;
  conductivity?: number;
  intelligence?: number;
}

/**
 * Требования для экипировки
 */
export interface ArmorRequirements {
  cultivationLevel?: number;
}

/**
 * Полная экипировка
 */
export interface Armor {
  id: string;                    // AR_XXXXXX
  name: string;
  nameEn: string;
  slot: EquipmentSlot;
  element: Element;
  
  // Защита
  defense: ArmorDefense;
  
  // Характеристики
  stats: ArmorStats;
  
  // Требования
  requirements: ArmorRequirements;
  
  // Редкость
  rarity: Rarity;
  
  // Улучшения (битовое поле 0-15)
  upgradeFlags: number;
  
  // Сет (заглушки)
  setId?: string;
  isSetItem: boolean;
  
  // Метаданные
  level: number;
  description: string;
}

/**
 * Опции генерации экипировки
 */
export interface ArmorGenerationOptions {
  level?: number;
  minLevel?: number;
  maxLevel?: number;
  rarity?: Rarity;
  slot?: EquipmentSlot;
  element?: Element;
  seed?: number;
  count?: number;
  mode: 'replace' | 'append';
}

// ==================== КОНСТАНТЫ ====================

/**
 * Базовые значения защиты по уровню
 */
const DEFENSE_VALUES_BY_LEVEL: Record<number, {
  physical: number;
  qi: number;
  elemental: number;
}> = {
  1: { physical: 5,   qi: 3,   elemental: 2 },
  2: { physical: 10,  qi: 6,   elemental: 4 },
  3: { physical: 18,  qi: 12,  elemental: 8 },
  4: { physical: 30,  qi: 20,  elemental: 12 },
  5: { physical: 45,  qi: 32,  elemental: 18 },
  6: { physical: 65,  qi: 48,  elemental: 26 },
  7: { physical: 90,  qi: 68,  elemental: 36 },
  8: { physical: 120, qi: 92,  elemental: 48 },
  9: { physical: 160, qi: 120, elemental: 62 },
};

/**
 * Множители защиты по слоту
 */
const SLOT_DEFENSE_MULT: Record<EquipmentSlot, {
  physical: number;
  qi: number;
}> = {
  head:          { physical: 0.8,  qi: 1.0 },
  torso:         { physical: 1.5,  qi: 1.2 },
  legs:          { physical: 1.0,  qi: 0.8 },
  feet:          { physical: 0.6,  qi: 0.7 },
  hands_gloves:  { physical: 0.5,  qi: 0.6 },
  hands_bracers: { physical: 0.4,  qi: 0.5 },
};

/**
 * Разброс защиты
 */
const DEFENSE_VARIANCE = {
  min: 0.85,
  max: 1.15,
};

// ==================== ГЕНЕРАЦИЯ ====================

/**
 * Генерация одной единицы экипировки
 */
export function generateArmor(
  options: ArmorGenerationOptions,
  counter: number
): Armor {
  // Создаём seed для детерминированной генерации
  const seed = createSeed('armor', counter, options.seed || Date.now());
  const rng = seededRandom(seed);
  
  // Определяем уровень
  const level = options.level ?? randomInt(
    options.minLevel ?? 1,
    options.maxLevel ?? 9,
    rng
  );
  
  // Выбираем слот
  let slot: EquipmentSlot;
  if (options.slot) {
    slot = options.slot;
  } else {
    const slots = Object.keys(EQUIPMENT_SLOT_CONFIGS) as EquipmentSlot[];
    slot = slots[Math.floor(rng() * slots.length)];
  }
  
  // Получаем конфигурацию слота
  const slotConfig = EQUIPMENT_SLOT_CONFIGS[slot];
  const slotMult = SLOT_DEFENSE_MULT[slot];
  
  // Выбираем редкость
  const rarity = selectRarity(rng, options.rarity);
  const rarityMult = RARITY_MULTIPLIERS[rarity];
  
  // Выбираем элемент
  const elements: Element[] = ['fire', 'water', 'earth', 'air', 'lightning', 'void', 'neutral'];
  const element = options.element ?? elements[Math.floor(rng() * elements.length)];
  const elementMult = ELEMENT_MULTIPLIERS[element];
  
  // Базовые значения по уровню
  const baseValues = DEFENSE_VALUES_BY_LEVEL[level] || DEFENSE_VALUES_BY_LEVEL[1];
  
  // Рассчитываем физическую защиту
  let physicalDefense = baseValues.physical * slotMult.physical;
  physicalDefense *= randomRange(DEFENSE_VARIANCE.min, DEFENSE_VARIANCE.max, rng);
  physicalDefense *= rarityMult.statMult;
  physicalDefense = Math.floor(physicalDefense);
  
  // Рассчитываем защиту Ци
  let qiDefense = baseValues.qi * slotMult.qi;
  qiDefense *= randomRange(DEFENSE_VARIANCE.min, DEFENSE_VARIANCE.max, rng);
  qiDefense *= rarityMult.statMult;
  qiDefense = Math.floor(qiDefense);
  
  // Рассчитываем элементальную защиту
  const elementalBase = baseValues.elemental;
  const elementalDefense = {
    fire: Math.floor(elementalBase * elementMult.defense * (element === 'fire' ? 1.5 : element === 'water' ? 0.7 : 1) * randomRange(0.8, 1.2, rng)),
    water: Math.floor(elementalBase * elementMult.defense * (element === 'water' ? 1.5 : element === 'lightning' ? 0.7 : 1) * randomRange(0.8, 1.2, rng)),
    earth: Math.floor(elementalBase * elementMult.defense * (element === 'earth' ? 1.5 : element === 'air' ? 0.7 : 1) * randomRange(0.8, 1.2, rng)),
    air: Math.floor(elementalBase * elementMult.defense * (element === 'air' ? 1.5 : element === 'earth' ? 0.7 : 1) * randomRange(0.8, 1.2, rng)),
    lightning: Math.floor(elementalBase * elementMult.defense * (element === 'lightning' ? 1.5 : element === 'earth' ? 0.7 : 1) * randomRange(0.8, 1.2, rng)),
    void: Math.floor(elementalBase * elementMult.defense * (element === 'void' ? 1.5 : 1) * randomRange(0.8, 1.2, rng)),
  };
  
  // Характеристики (зависят от редкости)
  const stats: ArmorStats = {};
  
  if (rarity !== 'common') {
    // Добавляем случайные характеристики
    const possibleStats: (keyof ArmorStats)[] = ['strength', 'agility', 'conductivity', 'intelligence'];
    const numStats = rarity === 'uncommon' ? 1 : rarity === 'rare' ? 2 : 3;
    
    for (let i = 0; i < numStats && possibleStats.length > 0; i++) {
      const idx = Math.floor(rng() * possibleStats.length);
      const statName = possibleStats.splice(idx, 1)[0];
      stats[statName] = Math.floor(level * 0.5 + rng() * level * 0.5);
    }
  }
  
  // Требования
  const requirements: ArmorRequirements = {
    cultivationLevel: level > 3 ? level - 1 : undefined,
  };
  
  // Улучшения
  const upgradeFlags = generateUpgradeFlags(rarity, rng);
  
  // Генерация имени
  const { name, nameEn } = generateArmorName(slot, element, rarity, rng);
  
  // Описание
  const description = `${name} — ${slotConfig.name.toLowerCase()} уровня ${level}. ` +
    `Редкость: ${rarity}. Защита: физ. ${physicalDefense}, Ци ${qiDefense}.`;
  
  return {
    id: generateItemId('AR', counter),
    name,
    nameEn,
    slot,
    element,
    defense: {
      physical: physicalDefense,
      qi: qiDefense,
      elemental: elementalDefense,
    },
    stats,
    requirements,
    rarity,
    upgradeFlags,
    setId: undefined,
    isSetItem: false,
    level,
    description,
  };
}

/**
 * Генерация массива экипировки
 */
export function generateArmors(
  count: number,
  options: ArmorGenerationOptions = { mode: 'replace' }
): GenerationResult<Armor> {
  const armors: Armor[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Начальный счётчик
  let counter = 1000; // TODO: получать из системы счётчиков
  
  for (let i = 0; i < count; i++) {
    try {
      const armor = generateArmor(options, counter++);
      armors.push(armor);
    } catch (error) {
      errors.push(`Ошибка при генерации экипировки #${i + 1}: ${error}`);
    }
  }
  
  return {
    success: errors.length === 0,
    generated: armors.length,
    total: count,
    items: armors,
    errors,
    warnings,
  };
}
