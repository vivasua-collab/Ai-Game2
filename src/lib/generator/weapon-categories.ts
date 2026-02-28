/**
 * ============================================================================
 * КАТЕГОРИИ ОРУЖИЯ
 * ============================================================================
 * 
 * Определяет категории оружия для техник melee_weapon.
 * Техника привязывается к категории, а не к конкретному оружию.
 * Бонус зависит от конкретного типа оружия в категории.
 * 
 * Пример:
 * - Техника "Вихрь клинков" → категория: one_handed_blade
 * - Работает с: меч, сабля, кинжал
 * - Бонусы отличаются для каждого типа оружия
 */

import { WeaponType } from './weapon-config';

// ==================== ТИПЫ ====================

/**
 * Категория оружия
 */
export type WeaponCategory =
  | 'one_handed_blade'    // Одноручные клинки (меч, сабля, кинжал)
  | 'one_handed_blunt'    // Одноручные дробящие (топор, молот, кистень)
  | 'two_handed_heavy'    // Двуручное тяжёлое (двуручный топор/молот)
  | 'two_handed_polearm'  // Древковое (копьё, алебарда, посох)
  | 'light_fist'         // Кистевое (кастет, коготь)
  | 'exotic';            // Экзотическое (кнут, веер)

/**
 * Бонусы оружия для техники
 */
export interface WeaponBonus {
  /** Множитель урона (1.0 = базовый) */
  damageMod: number;
  /** Множитель скорости (1.0 = базовый) */
  speedMod: number;
  /** Множитель дальности (1.0 = базовый) */
  rangeMod: number;
  /** Бонус к крит. шансу (%) */
  critBonus?: number;
  /** Особый эффект */
  specialEffect?: string;
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
  
  /**
   * Типы оружия в этой категории
   */
  weapons: WeaponType[];
  
  /**
   * Бонусы для каждого типа оружия в категории
   */
  weaponBonuses: Record<WeaponType, WeaponBonus>;
  
  /**
   * Базовые характеристики техник этой категории
   */
  baseStats: {
    avgDamage: number;
    avgSpeed: number;
    avgRange: number;
  };
}

// ==================== КОНФИГУРАЦИЯ КАТЕГОРИЙ ====================

export const WEAPON_CATEGORIES: Record<WeaponCategory, WeaponCategoryConfig> = {
  one_handed_blade: {
    id: 'one_handed_blade',
    name: 'Одноручные клинки',
    nameEn: 'One-Handed Blades',
    icon: '🗡️',
    description: 'Мечи, сабли, кинжалы — баланс скорости и урона, рубящие удары',
    weapons: ['sword', 'blade', 'dagger'],
    weaponBonuses: {
      sword: {
        damageMod: 1.0,
        speedMod: 1.0,
        rangeMod: 1.0,
        critBonus: 5,
      },
      blade: {
        damageMod: 0.95,
        speedMod: 1.15,
        rangeMod: 0.85,
        critBonus: 8,
      },
      dagger: {
        damageMod: 0.7,
        speedMod: 1.4,
        rangeMod: 0.4,
        critBonus: 15,
        specialEffect: 'backstab', // Бонус к урону в спину
      },
    },
    baseStats: {
      avgDamage: 0.88,
      avgSpeed: 1.18,
      avgRange: 0.75,
    },
  },
  
  one_handed_blunt: {
    id: 'one_handed_blunt',
    name: 'Одноручные дробящие',
    nameEn: 'One-Handed Blunt',
    icon: '🔨',
    description: 'Топоры, молоты, кистени — мощные удары, оглушение',
    weapons: ['axe', 'hammer', 'fist'],
    weaponBonuses: {
      axe: {
        damageMod: 1.2,
        speedMod: 0.8,
        rangeMod: 0.85,
        critBonus: 10,
      },
      hammer: {
        damageMod: 1.35,
        speedMod: 0.65,
        rangeMod: 1.0,
        specialEffect: 'stun', // Шанс оглушения
      },
      fist: {
        damageMod: 0.9,
        speedMod: 1.3,
        rangeMod: 0.4,
        critBonus: 5,
      },
    },
    baseStats: {
      avgDamage: 1.15,
      avgSpeed: 0.92,
      avgRange: 0.75,
    },
  },
  
  two_handed_heavy: {
    id: 'two_handed_heavy',
    name: 'Двуручное тяжёлое',
    nameEn: 'Two-Handed Heavy',
    icon: '⚔️',
    description: 'Тяжёлые двуручные топоры и молоты — сокрушительный урон',
    weapons: ['axe', 'hammer'],
    weaponBonuses: {
      axe: {
        damageMod: 1.5,
        speedMod: 0.6,
        rangeMod: 1.2,
        critBonus: 15,
        specialEffect: 'cleave', // Урон по площади
      },
      hammer: {
        damageMod: 1.7,
        speedMod: 0.5,
        rangeMod: 1.1,
        specialEffect: 'crush', // Пробитие брони
      },
    },
    baseStats: {
      avgDamage: 1.6,
      avgSpeed: 0.55,
      avgRange: 1.15,
    },
  },
  
  two_handed_polearm: {
    id: 'two_handed_polearm',
    name: 'Древковое',
    nameEn: 'Polearms',
    icon: '🔱',
    description: 'Копья, алебарды, посохи — большая дальность, контроль зоны',
    weapons: ['spear', 'halberd', 'staff'],
    weaponBonuses: {
      spear: {
        damageMod: 1.1,
        speedMod: 0.85,
        rangeMod: 2.0,
        critBonus: 10,
        specialEffect: 'reach', // Первый удар с большей дистанции
      },
      halberd: {
        damageMod: 1.25,
        speedMod: 0.7,
        rangeMod: 2.2,
        critBonus: 8,
        specialEffect: 'sweep', // Круговой удар
      },
      staff: {
        damageMod: 0.85,
        speedMod: 1.0,
        rangeMod: 1.5,
        specialEffect: 'qi_channel', // Бонус к Ци-атакам
      },
    },
    baseStats: {
      avgDamage: 1.07,
      avgSpeed: 0.85,
      avgRange: 1.9,
    },
  },
  
  light_fist: {
    id: 'light_fist',
    name: 'Кистевое',
    nameEn: 'Fist Weapons',
    icon: '👊',
    description: 'Кастеты, когти — молниеносные атаки, серии ударов',
    weapons: ['fist', 'claw'],
    weaponBonuses: {
      fist: {
        damageMod: 0.9,
        speedMod: 1.3,
        rangeMod: 0.4,
        critBonus: 5,
        specialEffect: 'combo', // Бонус к серийным атакам
      },
      claw: {
        damageMod: 0.65,
        speedMod: 1.5,
        rangeMod: 0.3,
        critBonus: 12,
        specialEffect: 'bleed', // Кровотечение
      },
    },
    baseStats: {
      avgDamage: 0.78,
      avgSpeed: 1.4,
      avgRange: 0.35,
    },
  },
  
  exotic: {
    id: 'exotic',
    name: 'Экзотическое',
    nameEn: 'Exotic',
    icon: '🪭',
    description: 'Кнуты, веера — особые техники, нестандартный стиль',
    weapons: ['whip', 'fan'],
    weaponBonuses: {
      whip: {
        damageMod: 0.6,
        speedMod: 1.1,
        rangeMod: 3.0,
        specialEffect: 'bind', // Связывание противника
      },
      fan: {
        damageMod: 0.6,
        speedMod: 1.4,
        rangeMod: 0.7,
        critBonus: 5,
        specialEffect: 'deflection', // Шанс отразить атаку
      },
    },
    baseStats: {
      avgDamage: 0.6,
      avgSpeed: 1.25,
      avgRange: 1.85,
    },
  },
};

// ==================== УТИЛИТЫ ====================

/**
 * Получить конфигурацию категории
 */
export function getWeaponCategoryConfig(category: WeaponCategory): WeaponCategoryConfig {
  return WEAPON_CATEGORIES[category];
}

/**
 * Получить список всех категорий для UI
 */
export function getWeaponCategoryList(): WeaponCategoryConfig[] {
  return Object.values(WEAPON_CATEGORIES);
}

/**
 * Определить категорию по типу оружия
 */
export function getWeaponCategory(weaponType: WeaponType): WeaponCategory | null {
  for (const [categoryId, config] of Object.entries(WEAPON_CATEGORIES)) {
    if (config.weapons.includes(weaponType)) {
      return categoryId as WeaponCategory;
    }
  }
  return null;
}

/**
 * Получить бонусы для конкретного оружия в категории
 */
export function getWeaponBonus(
  category: WeaponCategory,
  weaponType: WeaponType
): WeaponBonus | null {
  const config = WEAPON_CATEGORIES[category];
  if (!config || !config.weapons.includes(weaponType)) {
    return null;
  }
  return config.weaponBonuses[weaponType] || null;
}

/**
 * Проверить совместимость оружия с категорией
 */
export function isWeaponCompatible(
  category: WeaponCategory,
  weaponType: WeaponType
): boolean {
  const config = WEAPON_CATEGORIES[category];
  return config?.weapons.includes(weaponType) ?? false;
}

/**
 * Получить средние бонусы категории
 */
export function getCategoryAverageBonus(category: WeaponCategory): WeaponBonus {
  const config = WEAPON_CATEGORIES[category];
  const weapons = config.weapons;
  
  let totalDamage = 0;
  let totalSpeed = 0;
  let totalRange = 0;
  
  for (const weapon of weapons) {
    const bonus = config.weaponBonuses[weapon];
    totalDamage += bonus.damageMod;
    totalSpeed += bonus.speedMod;
    totalRange += bonus.rangeMod;
  }
  
  const count = weapons.length;
  return {
    damageMod: totalDamage / count,
    speedMod: totalSpeed / count,
    rangeMod: totalRange / count,
  };
}

/**
 * Выбрать случайное оружие из категории
 */
export function getRandomWeaponFromCategory(
  category: WeaponCategory,
  rng: () => number
): WeaponType {
  const config = WEAPON_CATEGORIES[category];
  const index = Math.floor(rng() * config.weapons.length);
  return config.weapons[index];
}

/**
 * Названия особых эффектов
 */
export const SPECIAL_EFFECT_NAMES: Record<string, { name: string; description: string }> = {
  backstab: {
    name: 'Удар в спину',
    description: '+50% урона при атаке со спины',
  },
  stun: {
    name: 'Оглушение',
    description: '20% шанс оглушить цель на 1 сек',
  },
  cleave: {
    name: 'Рассечение',
    description: 'Урон по всем целям в радиусе 1.5м',
  },
  crush: {
    name: 'Сокрушение',
    description: 'Пробивает 30% брони цели',
  },
  reach: {
    name: 'Дальний удар',
    description: 'Первая атака с +50% дальности',
  },
  sweep: {
    name: 'Размах',
    description: 'Урон по всем целям в扇ной зоне',
  },
  qi_channel: {
    name: 'Канал Ци',
    description: '+20% к Ци-урону от техники',
  },
  combo: {
    name: 'Комбо',
    description: '+15% урона за каждый предыдущий удар (макс 3)',
  },
  bleed: {
    name: 'Кровотечение',
    description: 'Цель теряет 2 HP/сек в течение 5 сек',
  },
  bind: {
    name: 'Связывание',
    description: '25% шанс обездвижить цель на 2 сек',
  },
  deflection: {
    name: 'Отражение',
    description: '15% шанс отразить входящую атаку',
  },
};
