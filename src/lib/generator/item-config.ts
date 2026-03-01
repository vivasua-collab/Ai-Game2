/**
 * ============================================================================
 * КОНФИГУРАЦИЯ ТИПОВ ПРЕДМЕТОВ
 * ============================================================================
 * 
 * Определяет типы, слоты, категории и параметры для генерации предметов.
 * Базируется на тех же принципах, что и technique-config.ts
 */

import type { Rarity, Element } from './base-item-generator';
import { RARITY_INFO } from './base-item-generator';

// ==================== ТИПЫ ====================

/**
 * Тип предмета
 */
export type ItemType = 
  | 'weapon'      // Оружие
  | 'armor'       // Броня/экипировка
  | 'accessory'   // Аксессуары (кольца, амулеты, талисманы)
  | 'consumable'  // Расходники
  | 'qi_stone'    // Камни Ци
  | 'charger';    // Зарядники

/**
 * Слот экипировки
 */
export type EquipmentSlot = 
  | 'head'           // Голова (шлемы, капюшоны, обручи)
  | 'torso'          // Торс (кирасы, доспехи, роба)
  | 'legs'           // Ноги (штаны, поножи)
  | 'feet'           // Стопы (ботинки, сапоги)
  | 'hands_gloves'   // Кисти (перчатки, рукавицы)
  | 'hands_bracers'; // Руки (наручи, защитные рукава)

/**
 * Слот аксессуара
 */
export type AccessorySlot =
  | 'ring_left_1'
  | 'ring_left_2'
  | 'ring_right_1'
  | 'ring_right_2'
  | 'amulet'
  | 'talisman_1'
  | 'talisman_2';

/**
 * Категория оружия
 */
export type WeaponCategory = 
  | 'one_handed_blade'  // Одноручное клинковое
  | 'two_handed_blade'  // Двуручное клинковое
  | 'polearm'           // Древковое
  | 'blunt'             // Дробящее
  | 'fist'              // Кистевое
  | 'thrown'            // Метательное
  | 'ranged';           // Дальнобойное

/**
 * Тип оружия (конкретный)
 */
export type WeaponType = 
  // Одноручное клинковое
  | 'sword' | 'saber' | 'dagger' | 'rapier' | 'shortsword'
  // Двуручное клинковое
  | 'greatsword' | 'katana' | 'claymore' | 'zweihander'
  // Древковое
  | 'spear' | 'glaive' | 'naginata' | 'halberd' | 'staff'
  // Дробящее
  | 'mace' | 'hammer' | 'flail' | 'club' | 'warhammer'
  // Кистевое
  | 'fist' | 'claw' | 'knuckle' | 'glove_weapon'
  // Метательное
  | 'throwing_knife' | 'shuriken' | 'throwing_axe' | 'javelin'
  // Дальнобойное
  | 'bow' | 'crossbow' | 'slingshot';

/**
 * Тип расходника
 */
export type ConsumableType = 'pill' | 'elixir' | 'food' | 'scroll';

/**
 * Размер камня Ци
 */
export type QiStoneSize = 
  | 'dust'      // < 0.1 см³
  | 'fragment'  // 0.1 - 1 см³
  | 'small'     // 1 - 8 см³
  | 'medium'    // 8 - 27 см³
  | 'large'     // 27 - 64 см³
  | 'huge'      // 64 - 125 см³
  | 'boulder';  // > 125 см³

// ==================== ИНТЕРФЕЙСЫ ====================

/**
 * Параметр для UI слайдера
 */
export interface ItemParam {
  id: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

/**
 * Конфигурация типа предмета
 */
export interface ItemTypeConfig {
  id: ItemType;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  prefix: string;  // ID префикс (WP, AR, AC, CS, QS, CH)
  params: ItemParam[];
}

/**
 * Конфигурация слота экипировки
 */
export interface EquipmentSlotConfig {
  id: EquipmentSlot;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
}

/**
 * Конфигурация категории оружия
 */
export interface WeaponCategoryConfig {
  id: WeaponCategory;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  weapons: WeaponType[];
  baseStats: {
    avgDamage: number;
    avgSpeed: number;
    avgRange: number;
  };
}

/**
 * Конфигурация типа оружия
 */
export interface WeaponTypeConfig {
  id: WeaponType;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  category: WeaponCategory;
  baseDamage: number;
  baseRange: number;
  attackSpeed: number;
  gender: 'male' | 'female' | 'neuter'; // Род для имени
}

// ==================== КОНФИГУРАЦИЯ ====================

/**
 * Конфигурация всех типов предметов
 */
export const ITEM_TYPE_CONFIGS: Record<ItemType, ItemTypeConfig> = {
  weapon: {
    id: 'weapon',
    name: 'Оружие',
    nameEn: 'Weapon',
    icon: '⚔️',
    description: 'Оружие для боя - мечи, копья, молоты и другое',
    prefix: 'WP',
    params: [
      {
        id: 'damageBonus',
        label: 'Бонус урона',
        description: 'Дополнительный урон к базовому',
        min: 0,
        max: 50,
        step: 5,
        default: 0,
        unit: '',
      },
      {
        id: 'rangeBonus',
        label: 'Бонус дальности',
        description: 'Процент увеличения дальности',
        min: 0,
        max: 50,
        step: 5,
        default: 0,
        unit: '%',
      },
    ],
  },
  
  armor: {
    id: 'armor',
    name: 'Экипировка',
    nameEn: 'Armor',
    icon: '🛡️',
    description: 'Защитная экипировка - шлемы, доспехи, поножи',
    prefix: 'AR',
    params: [
      {
        id: 'defenseBonus',
        label: 'Бонус защиты',
        description: 'Дополнительная защита',
        min: 0,
        max: 50,
        step: 5,
        default: 0,
        unit: '',
      },
    ],
  },
  
  accessory: {
    id: 'accessory',
    name: 'Аксессуары',
    nameEn: 'Accessory',
    icon: '💍',
    description: 'Кольца, амулеты, талисманы',
    prefix: 'AC',
    params: [],
  },
  
  consumable: {
    id: 'consumable',
    name: 'Расходники',
    nameEn: 'Consumable',
    icon: '🧪',
    description: 'Таблетки, эликсиры, еда, свитки',
    prefix: 'CS',
    params: [],
  },
  
  qi_stone: {
    id: 'qi_stone',
    name: 'Камни Ци',
    nameEn: 'Qi Stone',
    icon: '💎',
    description: 'Камни с запасом Ци для культивации',
    prefix: 'QS',
    params: [],
  },
  
  charger: {
    id: 'charger',
    name: 'Зарядники',
    nameEn: 'Charger',
    icon: '🔋',
    description: 'Устройства для хранения и передачи Ци',
    prefix: 'CH',
    params: [],
  },
};

/**
 * Конфигурация слотов экипировки
 */
export const EQUIPMENT_SLOT_CONFIGS: Record<EquipmentSlot, EquipmentSlotConfig> = {
  head: {
    id: 'head',
    name: 'Голова',
    nameEn: 'Head',
    icon: '🪖',
    description: 'Шлемы, капюшоны, обручи, диадемы',
  },
  torso: {
    id: 'torso',
    name: 'Торс',
    nameEn: 'Torso',
    icon: '🦺',
    description: 'Кирасы, доспехи, роба, куртки',
  },
  legs: {
    id: 'legs',
    name: 'Ноги',
    nameEn: 'Legs',
    icon: '👖',
    description: 'Штаны, поножи, набедренники',
  },
  feet: {
    id: 'feet',
    name: 'Стопы',
    nameEn: 'Feet',
    icon: '👢',
    description: 'Ботинки, сапоги, сандалии',
  },
  hands_gloves: {
    id: 'hands_gloves',
    name: 'Перчатки',
    nameEn: 'Gloves',
    icon: '🧤',
    description: 'Перчатки, рукавицы, наручи для ладоней',
  },
  hands_bracers: {
    id: 'hands_bracers',
    name: 'Наручи',
    nameEn: 'Bracers',
    icon: '🛡️',
    description: 'Наручи, защитные рукава для предплечий',
  },
};

/**
 * Конфигурация категорий оружия
 */
export const WEAPON_CATEGORY_CONFIGS: Record<WeaponCategory, WeaponCategoryConfig> = {
  one_handed_blade: {
    id: 'one_handed_blade',
    name: 'Одноручное клинковое',
    nameEn: 'One-Handed Blade',
    icon: '🗡️',
    description: 'Мечи, сабли, кинжалы для одной руки',
    weapons: ['sword', 'saber', 'dagger', 'rapier', 'shortsword'],
    baseStats: { avgDamage: 1.0, avgSpeed: 1.1, avgRange: 0.8 },
  },
  
  two_handed_blade: {
    id: 'two_handed_blade',
    name: 'Двуручное клинковое',
    nameEn: 'Two-Handed Blade',
    icon: '⚔️',
    description: 'Мощные мечи для двух рук',
    weapons: ['greatsword', 'katana', 'claymore', 'zweihander'],
    baseStats: { avgDamage: 1.4, avgSpeed: 0.8, avgRange: 1.2 },
  },
  
  polearm: {
    id: 'polearm',
    name: 'Древковое',
    nameEn: 'Polearm',
    icon: '🔱',
    description: 'Копья, алебарды, нагинаты',
    weapons: ['spear', 'glaive', 'naginata', 'halberd', 'staff'],
    baseStats: { avgDamage: 1.2, avgSpeed: 0.9, avgRange: 1.8 },
  },
  
  blunt: {
    id: 'blunt',
    name: 'Дробящее',
    nameEn: 'Blunt',
    icon: '🔨',
    description: 'Булавы, молоты, палицы',
    weapons: ['mace', 'hammer', 'flail', 'club', 'warhammer'],
    baseStats: { avgDamage: 1.3, avgSpeed: 0.85, avgRange: 0.9 },
  },
  
  fist: {
    id: 'fist',
    name: 'Кистевое',
    nameEn: 'Fist Weapon',
    icon: '👊',
    description: 'Кастеты, когти, боевие перчатки',
    weapons: ['fist', 'claw', 'knuckle', 'glove_weapon'],
    baseStats: { avgDamage: 0.8, avgSpeed: 1.3, avgRange: 0.5 },
  },
  
  thrown: {
    id: 'thrown',
    name: 'Метательное',
    nameEn: 'Thrown',
    icon: '🎯',
    description: 'Метательные ножи, сюрикены, топоры',
    weapons: ['throwing_knife', 'shuriken', 'throwing_axe', 'javelin'],
    baseStats: { avgDamage: 0.7, avgSpeed: 1.2, avgRange: 1.5 },
  },
  
  ranged: {
    id: 'ranged',
    name: 'Дальнобойное',
    nameEn: 'Ranged',
    icon: '🏹',
    description: 'Луки, арбалеты, пращи',
    weapons: ['bow', 'crossbow', 'slingshot'],
    baseStats: { avgDamage: 1.0, avgSpeed: 0.9, avgRange: 2.5 },
  },
};

/**
 * Конфигурация типов оружия
 */
export const WEAPON_TYPE_CONFIGS: Record<WeaponType, WeaponTypeConfig> = {
  // Одноручное клинковое
  sword: {
    id: 'sword', name: 'Меч', nameEn: 'Sword', icon: '🗡️',
    description: 'Классический прямой меч', category: 'one_handed_blade',
    baseDamage: 15, baseRange: 0.9, attackSpeed: 1.0, gender: 'male',
  },
  saber: {
    id: 'saber', name: 'Сабля', nameEn: 'Saber', icon: '⚔️',
    description: 'Изогнутый клинок для рубящих ударов', category: 'one_handed_blade',
    baseDamage: 14, baseRange: 0.85, attackSpeed: 1.1, gender: 'female',
  },
  dagger: {
    id: 'dagger', name: 'Кинжал', nameEn: 'Dagger', icon: '🔪',
    description: 'Короткий клинок для ближнего боя', category: 'one_handed_blade',
    baseDamage: 10, baseRange: 0.5, attackSpeed: 1.4, gender: 'male',
  },
  rapier: {
    id: 'rapier', name: 'Рапира', nameEn: 'Rapier', icon: '🤺',
    description: 'Тонкий клинок для колющих ударов', category: 'one_handed_blade',
    baseDamage: 12, baseRange: 1.0, attackSpeed: 1.3, gender: 'female',
  },
  shortsword: {
    id: 'shortsword', name: 'Короткий меч', nameEn: 'Shortsword', icon: '🗡️',
    description: 'Компактный меч для быстрых атак', category: 'one_handed_blade',
    baseDamage: 12, baseRange: 0.7, attackSpeed: 1.2, gender: 'male',
  },
  
  // Двуручное клинковое
  greatsword: {
    id: 'greatsword', name: 'Двуручный меч', nameEn: 'Greatsword', icon: '⚔️',
    description: 'Мощный меч для двух рук', category: 'two_handed_blade',
    baseDamage: 25, baseRange: 1.3, attackSpeed: 0.7, gender: 'male',
  },
  katana: {
    id: 'katana', name: 'Катана', nameEn: 'Katana', icon: '🗡️',
    description: 'Изящный изогнутый меч', category: 'two_handed_blade',
    baseDamage: 22, baseRange: 1.2, attackSpeed: 0.9, gender: 'female',
  },
  claymore: {
    id: 'claymore', name: 'Клеймор', nameEn: 'Claymore', icon: '⚔️',
    description: 'Шотландский двуручный меч', category: 'two_handed_blade',
    baseDamage: 28, baseRange: 1.4, attackSpeed: 0.65, gender: 'male',
  },
  zweihander: {
    id: 'zweihander', name: 'Цвайхандер', nameEn: 'Zweihander', icon: '⚔️',
    description: 'Немецкий двуручный меч', category: 'two_handed_blade',
    baseDamage: 30, baseRange: 1.5, attackSpeed: 0.6, gender: 'male',
  },
  
  // Древковое
  spear: {
    id: 'spear', name: 'Копьё', nameEn: 'Spear', icon: '🔱',
    description: 'Классическое копьё с наконечником', category: 'polearm',
    baseDamage: 18, baseRange: 2.0, attackSpeed: 0.9, gender: 'neuter',
  },
  glaive: {
    id: 'glaive', name: 'Глефа', nameEn: 'Glaive', icon: '⚔️',
    description: 'Древковое оружие с лезвием', category: 'polearm',
    baseDamage: 20, baseRange: 1.8, attackSpeed: 0.85, gender: 'female',
  },
  naginata: {
    id: 'naginata', name: 'Нагината', nameEn: 'Naginata', icon: '⚔️',
    description: 'Японское древковое оружие', category: 'polearm',
    baseDamage: 19, baseRange: 1.9, attackSpeed: 0.9, gender: 'female',
  },
  halberd: {
    id: 'halberd', name: 'Алебарда', nameEn: 'Halberd', icon: '🔱',
    description: 'Комбинированное древковое оружие', category: 'polearm',
    baseDamage: 24, baseRange: 2.0, attackSpeed: 0.75, gender: 'female',
  },
  staff: {
    id: 'staff', name: 'Посох', nameEn: 'Staff', icon: '🪄',
    description: 'Боевой посох для культиваторов', category: 'polearm',
    baseDamage: 12, baseRange: 1.5, attackSpeed: 1.0, gender: 'male',
  },
  
  // Дробящее
  mace: {
    id: 'mace', name: 'Булава', nameEn: 'Mace', icon: '🔨',
    description: 'Ударное оружие с шипами', category: 'blunt',
    baseDamage: 18, baseRange: 0.8, attackSpeed: 0.9, gender: 'female',
  },
  hammer: {
    id: 'hammer', name: 'Молот', nameEn: 'Hammer', icon: '🔨',
    description: 'Тяжёлый боевой молот', category: 'blunt',
    baseDamage: 22, baseRange: 0.9, attackSpeed: 0.75, gender: 'male',
  },
  flail: {
    id: 'flail', name: 'Цеп', nameEn: 'Flail', icon: '🔗',
    description: 'Ударное оружие на цепи', category: 'blunt',
    baseDamage: 20, baseRange: 1.0, attackSpeed: 0.85, gender: 'male',
  },
  club: {
    id: 'club', name: 'Дубина', nameEn: 'Club', icon: '🪵',
    description: 'Простая, но эффективная', category: 'blunt',
    baseDamage: 14, baseRange: 0.7, attackSpeed: 1.0, gender: 'female',
  },
  warhammer: {
    id: 'warhammer', name: 'Боевой молот', nameEn: 'Warhammer', icon: '🔨',
    description: 'Молот для пробития доспехов', category: 'blunt',
    baseDamage: 26, baseRange: 1.0, attackSpeed: 0.7, gender: 'male',
  },
  
  // Кистевое
  fist: {
    id: 'fist', name: 'Кулак', nameEn: 'Fist', icon: '👊',
    description: 'Усиленные кулаки', category: 'fist',
    baseDamage: 8, baseRange: 0.3, attackSpeed: 1.5, gender: 'male',
  },
  claw: {
    id: 'claw', name: 'Коготь', nameEn: 'Claw', icon: '🦅',
    description: 'Острые когти для ближнего боя', category: 'fist',
    baseDamage: 10, baseRange: 0.4, attackSpeed: 1.4, gender: 'male',
  },
  knuckle: {
    id: 'knuckle', name: 'Кастет', nameEn: 'Knuckle', icon: '👊',
    description: 'Металлический кастет', category: 'fist',
    baseDamage: 9, baseRange: 0.3, attackSpeed: 1.5, gender: 'male',
  },
  glove_weapon: {
    id: 'glove_weapon', name: 'Боевая перчатка', nameEn: 'Battle Glove', icon: '🧤',
    description: 'Перчатка с встроенным оружием', category: 'fist',
    baseDamage: 11, baseRange: 0.4, attackSpeed: 1.3, gender: 'female',
  },
  
  // Метательное
  throwing_knife: {
    id: 'throwing_knife', name: 'Метательный нож', nameEn: 'Throwing Knife', icon: '🔪',
    description: 'Сбалансированный нож для метания', category: 'thrown',
    baseDamage: 8, baseRange: 10, attackSpeed: 1.5, gender: 'male',
  },
  shuriken: {
    id: 'shuriken', name: 'Сюрикен', nameEn: 'Shuriken', icon: '✴️',
    description: 'Звёздочка для метания', category: 'thrown',
    baseDamage: 6, baseRange: 8, attackSpeed: 1.8, gender: 'male',
  },
  throwing_axe: {
    id: 'throwing_axe', name: 'Метательный топор', nameEn: 'Throwing Axe', icon: '🪓',
    description: 'Лёгкий топор для метания', category: 'thrown',
    baseDamage: 12, baseRange: 12, attackSpeed: 1.2, gender: 'male',
  },
  javelin: {
    id: 'javelin', name: 'Дротик', nameEn: 'Javelin', icon: '🔱',
    description: 'Лёгкое метательное копьё', category: 'thrown',
    baseDamage: 14, baseRange: 15, attackSpeed: 1.0, gender: 'male',
  },
  
  // Дальнобойное
  bow: {
    id: 'bow', name: 'Лук', nameEn: 'Bow', icon: '🏹',
    description: 'Классический лук', category: 'ranged',
    baseDamage: 15, baseRange: 30, attackSpeed: 1.0, gender: 'male',
  },
  crossbow: {
    id: 'crossbow', name: 'Арбалет', nameEn: 'Crossbow', icon: '🏹',
    description: 'Мощный арбалет', category: 'ranged',
    baseDamage: 20, baseRange: 25, attackSpeed: 0.6, gender: 'male',
  },
  slingshot: {
    id: 'slingshot', name: 'Праща', nameEn: 'Slingshot', icon: '🎯',
    description: 'Простая дальнобойная техника', category: 'ranged',
    baseDamage: 8, baseRange: 20, attackSpeed: 1.3, gender: 'female',
  },
};

// ==================== ФУНКЦИИ ====================

/**
 * Получить конфигурацию типа предмета
 */
export function getItemTypeConfig(type: ItemType): ItemTypeConfig {
  return ITEM_TYPE_CONFIGS[type];
}

/**
 * Получить список всех типов предметов
 */
export function getItemTypeList(): ItemTypeConfig[] {
  return Object.values(ITEM_TYPE_CONFIGS);
}

/**
 * Получить конфигурацию слота экипировки
 */
export function getEquipmentSlotConfig(slot: EquipmentSlot): EquipmentSlotConfig {
  return EQUIPMENT_SLOT_CONFIGS[slot];
}

/**
 * Получить список всех слотов экипировки
 */
export function getEquipmentSlotList(): EquipmentSlotConfig[] {
  return Object.values(EQUIPMENT_SLOT_CONFIGS);
}

/**
 * Получить конфигурацию категории оружия
 */
export function getWeaponCategoryConfig(category: WeaponCategory): WeaponCategoryConfig {
  return WEAPON_CATEGORY_CONFIGS[category];
}

/**
 * Получить список всех категорий оружия
 */
export function getWeaponCategoryList(): WeaponCategoryConfig[] {
  return Object.values(WEAPON_CATEGORY_CONFIGS);
}

/**
 * Получить конфигурацию типа оружия
 */
export function getWeaponTypeConfig(type: WeaponType): WeaponTypeConfig {
  return WEAPON_TYPE_CONFIGS[type];
}

/**
 * Получить список всех типов оружия
 */
export function getWeaponTypeList(): WeaponTypeConfig[] {
  return Object.values(WEAPON_TYPE_CONFIGS);
}

/**
 * Получить типы оружия для категории
 */
export function getWeaponsForCategory(category: WeaponCategory): WeaponTypeConfig[] {
  const categoryConfig = WEAPON_CATEGORY_CONFIGS[category];
  return categoryConfig.weapons.map(w => WEAPON_TYPE_CONFIGS[w]);
}

/**
 * Найти категорию по типу оружия
 */
export function getCategoryForWeaponType(type: WeaponType): WeaponCategory | null {
  const config = WEAPON_TYPE_CONFIGS[type];
  return config?.category || null;
}

/**
 * Экспорт RARITY_INFO для использования в UI
 */
export { RARITY_INFO };
