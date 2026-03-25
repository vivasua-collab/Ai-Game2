/**
 * ============================================================================
 * КОНФИГУРАЦИЯ ТИПОВ ОРУЖИЯ
 * ============================================================================
 * 
 * Определяет параметры оружия для генерации техник melee_weapon.
 * Каждое оружие имеет базовую дальность, тип урона и совместимость.
 */

import { CombatSubtype } from './technique-generator';

/**
 * Тип оружия
 */
export type WeaponType = 
  | 'sword'      // Меч
  | 'spear'      // Копьё
  | 'staff'      // Посох
  | 'dagger'     // Кинжал
  | 'axe'        // Топор
  | 'hammer'     // Молот
  | 'whip'       // Кнут
  | 'fist'       // Кистень/Кастет
  | 'claw'       // Коготь
  | 'blade'      // Сабля
  | 'halberd'    // Алебарда
  | 'fan';       // Веер

/**
 * Тип урона оружия
 */
export type WeaponDamageType = 
  | 'slashing'   // Рубящий
  | 'piercing'   // Колющий
  | 'blunt'      // Дробящий
  | 'hybrid';    // Смешанный

/**
 * Конфигурация типа оружия
 */
export interface WeaponTypeConfig {
  id: WeaponType;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  
  /**
   * Базовая дальность в метрах
   */
  baseRange: number;
  
  /**
   * Разброс дальности (+/-)
   */
  rangeVariance: number;
  
  /**
   * Тип урона
   */
  damageType: WeaponDamageType;
  
  /**
   * Базовый множитель урона
   */
  damageMultiplier: number;
  
  /**
   * Базовый множитель скорости
   */
  speedMultiplier: number;
  
  /**
   * Совместимые подтипы атакующих техник
   */
  compatibleSubtypes: CombatSubtype[];
  
  /**
   * Поддерживает ли дальний удар Ци (для легендарных техник)
   */
  canRangedQi: boolean;
  
  /**
   * Характеристики, которые усиливают технику с этим оружием
   */
  scalingStats: {
    primary: 'strength' | 'agility' | 'intelligence';
    secondary?: 'strength' | 'agility' | 'intelligence';
  };
}

/**
 * Полная конфигурация всех типов оружия
 */
export const WEAPON_TYPE_CONFIGS: Record<WeaponType, WeaponTypeConfig> = {
  sword: {
    id: 'sword',
    name: 'Меч',
    nameEn: 'Sword',
    icon: '🗡️',
    description: 'Классическое одноручное оружие с балансом скорости и урона',
    baseRange: 1.2,
    rangeVariance: 0.3,
    damageType: 'slashing',
    damageMultiplier: 1.0,
    speedMultiplier: 1.0,
    compatibleSubtypes: ['melee_weapon'],
    canRangedQi: true, // Может выпускать волны Ци
    scalingStats: {
      primary: 'strength',
      secondary: 'agility',
    },
  },
  
  blade: {
    id: 'blade',
    name: 'Сабля',
    nameEn: 'Blade',
    icon: '⚔️',
    description: 'Изогнутый клинок для быстрых рубящих ударов',
    baseRange: 1.0,
    rangeVariance: 0.2,
    damageType: 'slashing',
    damageMultiplier: 0.95,
    speedMultiplier: 1.15,
    compatibleSubtypes: ['melee_weapon'],
    canRangedQi: true,
    scalingStats: {
      primary: 'agility',
      secondary: 'strength',
    },
  },
  
  spear: {
    id: 'spear',
    name: 'Копьё',
    nameEn: 'Spear',
    icon: '🔱',
    description: 'Длинное древковое оружие с отличной дальностью',
    baseRange: 2.5,
    rangeVariance: 0.5,
    damageType: 'piercing',
    damageMultiplier: 1.1,
    speedMultiplier: 0.85,
    compatibleSubtypes: ['melee_weapon'],
    canRangedQi: true,
    scalingStats: {
      primary: 'strength',
      secondary: 'agility',
    },
  },
  
  halberd: {
    id: 'halberd',
    name: 'Алебарда',
    nameEn: 'Halberd',
    icon: '🪓',
    description: 'Тяжёлое древковое оружие с огромной дальностью',
    baseRange: 2.8,
    rangeVariance: 0.4,
    damageType: 'hybrid',
    damageMultiplier: 1.25,
    speedMultiplier: 0.7,
    compatibleSubtypes: ['melee_weapon'],
    canRangedQi: true,
    scalingStats: {
      primary: 'strength',
    },
  },
  
  staff: {
    id: 'staff',
    name: 'Посох',
    nameEn: 'Staff',
    icon: '🪄',
    description: 'Деревянный посох, подходит для техник Ци',
    baseRange: 1.8,
    rangeVariance: 0.3,
    damageType: 'blunt',
    damageMultiplier: 0.85,
    speedMultiplier: 1.0,
    compatibleSubtypes: ['melee_weapon'],
    canRangedQi: true,
    scalingStats: {
      primary: 'intelligence',
      secondary: 'strength',
    },
  },
  
  dagger: {
    id: 'dagger',
    name: 'Кинжал',
    nameEn: 'Dagger',
    icon: '🔪',
    description: 'Короткое скрытное оружие для быстрых атак',
    baseRange: 0.4,
    rangeVariance: 0.1,
    damageType: 'piercing',
    damageMultiplier: 0.7,
    speedMultiplier: 1.4,
    compatibleSubtypes: ['melee_weapon'],
    canRangedQi: false, // Слишком короткий для дальнего удара Ци
    scalingStats: {
      primary: 'agility',
    },
  },
  
  claw: {
    id: 'claw',
    name: 'Коготь',
    nameEn: 'Claw',
    icon: '🦅',
    description: 'Оружие в виде когтей для быстрых атак',
    baseRange: 0.35,
    rangeVariance: 0.1,
    damageType: 'slashing',
    damageMultiplier: 0.65,
    speedMultiplier: 1.5,
    compatibleSubtypes: ['melee_weapon'],
    canRangedQi: false,
    scalingStats: {
      primary: 'agility',
    },
  },
  
  axe: {
    id: 'axe',
    name: 'Топор',
    nameEn: 'Axe',
    icon: '🪓',
    description: 'Тяжёлое рубящее оружие',
    baseRange: 1.0,
    rangeVariance: 0.2,
    damageType: 'slashing',
    damageMultiplier: 1.2,
    speedMultiplier: 0.8,
    compatibleSubtypes: ['melee_weapon'],
    canRangedQi: true,
    scalingStats: {
      primary: 'strength',
    },
  },
  
  hammer: {
    id: 'hammer',
    name: 'Молот',
    nameEn: 'Hammer',
    icon: '🔨',
    description: 'Тяжёлое дробящее оружие для сокрушительных ударов',
    baseRange: 1.2,
    rangeVariance: 0.2,
    damageType: 'blunt',
    damageMultiplier: 1.35,
    speedMultiplier: 0.65,
    compatibleSubtypes: ['melee_weapon'],
    canRangedQi: true,
    scalingStats: {
      primary: 'strength',
    },
  },
  
  whip: {
    id: 'whip',
    name: 'Кнут',
    nameEn: 'Whip',
    icon: '➰',
    description: 'Гибкое оружие с большой дальностью',
    baseRange: 3.5,
    rangeVariance: 0.8,
    damageType: 'slashing',
    damageMultiplier: 0.6,
    speedMultiplier: 1.1,
    compatibleSubtypes: ['melee_weapon'],
    canRangedQi: true,
    scalingStats: {
      primary: 'agility',
    },
  },
  
  fist: {
    id: 'fist',
    name: 'Кистень',
    nameEn: 'Fist Weapon',
    icon: '👊',
    description: 'Кастеты и кистени для ближнего боя',
    baseRange: 0.5,
    rangeVariance: 0.1,
    damageType: 'blunt',
    damageMultiplier: 0.9,
    speedMultiplier: 1.3,
    compatibleSubtypes: ['melee_weapon'],
    canRangedQi: true,
    scalingStats: {
      primary: 'strength',
      secondary: 'agility',
    },
  },
  
  fan: {
    id: 'fan',
    name: 'Веер',
    nameEn: 'Fan',
    icon: '🪭',
    description: 'Изящное оружие для быстрых техник и отражения атак',
    baseRange: 0.8,
    rangeVariance: 0.2,
    damageType: 'slashing',
    damageMultiplier: 0.6,
    speedMultiplier: 1.4,
    compatibleSubtypes: ['melee_weapon'],
    canRangedQi: true, // Веер может создавать волны воздуха
    scalingStats: {
      primary: 'agility',
      secondary: 'intelligence',
    },
  },
};

/**
 * Получить конфигурацию типа оружия
 */
export function getWeaponTypeConfig(type: WeaponType): WeaponTypeConfig {
  return WEAPON_TYPE_CONFIGS[type];
}

/**
 * Получить список всех типов оружия для UI
 */
export function getWeaponTypeList(): WeaponTypeConfig[] {
  return Object.values(WEAPON_TYPE_CONFIGS);
}

/**
 * Получить типы оружия, совместимые с редкостью (для дальнего удара Ци)
 */
export function getWeaponsForRangedQi(rarity: string): WeaponType[] {
  return Object.entries(WEAPON_TYPE_CONFIGS)
    .filter(([_, config]) => config.canRangedQi)
    .map(([id]) => id as WeaponType);
}

/**
 * Вычислить дальность техники с оружием
 */
export function calculateWeaponRange(
  weaponType: WeaponType,
  rarityIndex: number, // 0=common, 1=uncommon, 2=rare, 3=legendary
  rangeBonusPercent: number = 0
): number {
  const config = WEAPON_TYPE_CONFIGS[weaponType];
  const baseRange = config.baseRange + (Math.random() - 0.5) * config.rangeVariance;
  const rarityBonus = 1 + (rarityIndex * 0.1); // +10% за уровень редкости
  const bonusMult = 1 + (rangeBonusPercent / 100);
  
  return Math.round(baseRange * rarityBonus * bonusMult * 100) / 100;
}

/**
 * Получить название типа урона
 */
export const DAMAGE_TYPE_NAMES: Record<WeaponDamageType, string> = {
  slashing: 'Рубящий',
  piercing: 'Колющий',
  blunt: 'Дробящий',
  hybrid: 'Смешанный',
};
