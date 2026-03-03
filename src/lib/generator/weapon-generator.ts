/**
 * ============================================================================
 * ГЕНЕРАТОР ОРУЖИЯ
 * ============================================================================
 * 
 * Процедурная генерация оружия с параметрами.
 * Префикс ID: WP (WP_000001, WP_000002, ...)
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
  type Rarity,
  type Element,
  type GenerationResult,
} from './base-item-generator';

import {
  WEAPON_CATEGORY_CONFIGS,
  WEAPON_TYPE_CONFIGS,
  getWeaponsForCategory,
  type WeaponCategory,
  type WeaponType,
} from './item-config';

import {
  generateWeaponName,
  getWeaponGender,
} from './name-generator';

// ==================== ТИПЫ ====================

/**
 * Требования для оружия
 */
export interface WeaponRequirements {
  strength?: number;
  agility?: number;
  cultivationLevel?: number;
}

/**
 * Свойства оружия
 */
export interface WeaponProperties {
  critChance: number;      // Шанс крита (%)
  critDamage: number;      // Множитель крита (1.5 = 150%)
  armorPenetration: number; // Пробитие брони (%)
}

/**
 * Полное оружие
 */
export interface Weapon {
  id: string;                    // WP_XXXXXX
  name: string;
  nameEn: string;
  category: WeaponCategory;
  weaponType: WeaponType;
  element: Element;
  
  // Базовые параметры
  baseDamage: number;
  baseRange: number;             // в метрах
  attackSpeed: number;           // атаки в секунду
  
  // Требования
  requirements: WeaponRequirements;
  
  // Свойства
  properties: WeaponProperties;
  
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
 * Опции генерации оружия
 */
export interface WeaponGenerationOptions {
  level?: number;
  minLevel?: number;
  maxLevel?: number;
  rarity?: Rarity;
  category?: WeaponCategory;
  weaponType?: WeaponType;
  element?: Element;
  seed?: number;
  count?: number;
  mode: 'replace' | 'append';
}

// ==================== КОНСТАНТЫ ====================

/**
 * Базовые значения по уровню
 */
const BASE_VALUES_BY_LEVEL: Record<number, {
  damage: number;
  range: number;
  speed: number;
}> = {
  1: { damage: 15,  range: 0.8,  speed: 1.0 },
  2: { damage: 25,  range: 1.0,  speed: 1.0 },
  3: { damage: 40,  range: 1.2,  speed: 1.1 },
  4: { damage: 60,  range: 1.4,  speed: 1.1 },
  5: { damage: 90,  range: 1.6,  speed: 1.2 },
  6: { damage: 130, range: 1.8,  speed: 1.2 },
  7: { damage: 185, range: 2.0,  speed: 1.3 },
  8: { damage: 260, range: 2.2,  speed: 1.3 },
  9: { damage: 350, range: 2.5,  speed: 1.4 },
};

/**
 * Разброс базового урона
 */
const DAMAGE_VARIANCE = {
  min: 0.8,
  max: 1.2,
};

// ==================== ГЕНЕРАЦИЯ ====================

/**
 * Генерация одного оружия
 */
export function generateWeapon(
  options: WeaponGenerationOptions,
  counter: number
): Weapon {
  // Определяем уровень
  const level = options.level ?? randomInt(
    options.minLevel ?? 1,
    options.maxLevel ?? 9,
    seededRandom(options.seed || Date.now())
  );
  
  // Создаём seed для детерминированной генерации
  const seed = createSeed('weapon', level, counter, options.seed || Date.now());
  const rng = seededRandom(seed);
  
  // Выбираем категорию
  let category: WeaponCategory;
  if (options.category) {
    category = options.category;
  } else {
    const categories = Object.keys(WEAPON_CATEGORY_CONFIGS) as WeaponCategory[];
    category = categories[Math.floor(rng() * categories.length)];
  }
  
  // Выбираем тип оружия
  let weaponType: WeaponType;
  if (options.weaponType) {
    weaponType = options.weaponType;
  } else {
    const weaponsInCategory = getWeaponsForCategory(category);
    weaponType = weaponsInCategory[Math.floor(rng() * weaponsInCategory.length)].id;
  }
  
  // Получаем конфигурации
  const categoryConfig = WEAPON_CATEGORY_CONFIGS[category];
  const weaponConfig = WEAPON_TYPE_CONFIGS[weaponType];
  
  // Выбираем редкость
  const rarity = selectRarity(rng, options.rarity);
  const rarityMult = RARITY_MULTIPLIERS[rarity];
  
  // Выбираем элемент
  const elements: Element[] = ['fire', 'water', 'earth', 'air', 'lightning', 'void', 'neutral'];
  const element = options.element ?? elements[Math.floor(rng() * elements.length)];
  
  // Базовые значения по уровню
  const baseValues = BASE_VALUES_BY_LEVEL[level] || BASE_VALUES_BY_LEVEL[1];
  
  // Рассчитываем урон
  let baseDamage = baseValues.damage * weaponConfig.baseDamage / 15; // Нормализация
  baseDamage *= randomRange(DAMAGE_VARIANCE.min, DAMAGE_VARIANCE.max, rng);
  baseDamage *= rarityMult.statMult;
  baseDamage *= categoryConfig.baseStats.avgDamage;
  baseDamage = Math.floor(baseDamage);
  
  // Рассчитываем дальность
  let baseRange = weaponConfig.baseRange;
  baseRange *= categoryConfig.baseStats.avgRange;
  baseRange *= (1 + level * 0.05); // +5% за уровень
  baseRange = roundTo(baseRange, 2);
  
  // Рассчитываем скорость атаки
  let attackSpeed = weaponConfig.attackSpeed;
  attackSpeed *= categoryConfig.baseStats.avgSpeed;
  attackSpeed *= rarityMult.statMult;
  attackSpeed = roundTo(attackSpeed, 2);
  
  // Требования
  const requirements: WeaponRequirements = {
    strength: weaponConfig.gender === 'male' 
      ? Math.floor(level * 3 + (rarityMult.statMult - 1) * 20)
      : Math.floor(level * 2),
    agility: weaponConfig.gender === 'female' || weaponConfig.gender === 'neuter'
      ? Math.floor(level * 3 + (rarityMult.statMult - 1) * 20)
      : Math.floor(level * 2),
    cultivationLevel: level > 5 ? level - 2 : undefined,
  };
  
  // Свойства
  const properties: WeaponProperties = {
    critChance: roundTo(5 + level * 1.5 + (rarity === 'legendary' ? 10 : rarity === 'rare' ? 5 : 0), 1),
    critDamage: roundTo(1.5 + level * 0.05, 2),
    armorPenetration: roundTo(level * 2 + (rarity === 'legendary' ? 15 : rarity === 'rare' ? 8 : 0), 1),
  };
  
  // Улучшения
  const upgradeFlags = generateUpgradeFlags(rarity, rng);
  
  // Генерация имени
  const { name, nameEn } = generateWeaponName(weaponType, element, rarity, rng);
  
  // Описание
  const description = `${name} — ${categoryConfig.name.toLowerCase()} уровня ${level}. ` +
    `Редкость: ${rarity}. Урон: ${baseDamage}. Дальность: ${baseRange}м. ` +
    `Скорость: ${attackSpeed}.`;
  
  return {
    id: generateItemId('WP', counter),
    name,
    nameEn,
    category,
    weaponType,
    element,
    baseDamage,
    baseRange,
    attackSpeed,
    requirements,
    properties,
    rarity,
    upgradeFlags,
    setId: undefined,
    isSetItem: false,
    level,
    description,
  };
}

/**
 * Генерация массива оружия
 */
export function generateWeapons(
  count: number,
  options: WeaponGenerationOptions = { mode: 'replace' }
): GenerationResult<Weapon> {
  const weapons: Weapon[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Начальный счётчик
  let counter = 1000; // TODO: получать из системы счётчиков
  
  for (let i = 0; i < count; i++) {
    try {
      const weapon = generateWeapon(options, counter++);
      weapons.push(weapon);
    } catch (error) {
      errors.push(`Ошибка при генерации оружия #${i + 1}: ${error}`);
    }
  }
  
  return {
    success: errors.length === 0,
    generated: weapons.length,
    total: count,
    items: weapons,
    errors,
    warnings,
  };
}
