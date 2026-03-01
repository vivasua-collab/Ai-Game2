/**
 * ============================================================================
 * КОНФИГУРАЦИЯ ТИПОВ ТЕХНИК
 * ============================================================================
 * 
 * Определяет параметры генерации для каждого типа техники,
 * включая бонусы от редкости и специфичные параметры.
 */

import { TechniqueType, Rarity, Element, CombatSubtype } from './technique-generator';
import { WeaponType } from './weapon-config';

/**
 * Типы бонусов, которые может давать редкость
 */
export type BonusType = 
  | 'damage'           // +урон
  | 'shieldHP'         // +HP щита
  | 'healAmount'       // +лечение
  | 'qiRegen'          // +регенерация Ци
  | 'range'            // +дальность
  | 'duration'         // +длительность
  | 'critChance'       // +шанс крита
  | 'critDamage'       // +урон крита
  | 'penetration'      // +пробитие
  | 'effectPower'      // +сила эффекта
  | 'cooldownReduce'   // -перезарядка
  | 'qiCostReduce';    // -стоимость Ци

/**
 * Слот бонуса для редкости
 */
export interface BonusSlot {
  type: BonusType;
  minValue: number;
  maxValue: number;
  label: string;
  description: string;
}

/**
 * Конфигурация параметров для типа техники
 */
export interface TechniqueTypeConfig {
  id: TechniqueType;
  name: string;
  icon: string;
  description: string;
  
  /**
   * Параметры, доступные для настройки в UI
   */
  params: TechniqueParam[];
  
  /**
   * Бонусы по редкости
   * common - 0 слотов, uncommon - 1 слот, rare - 2 слота, legendary - 3 слота
   */
  bonusSlotsByRarity: Record<Rarity, BonusSlot[]>;
  
  /**
   * Базовые границы параметров
   */
  baseBounds: {
    damageMin: number;
    damageMax: number;
    qiCostMin: number;
    qiCostMax: number;
    rangeMin: number;
    rangeMax: number;
    durationMin: number;
    durationMax: number;
  };
}

/**
 * Параметр для UI слайдера
 */
export interface TechniqueParam {
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
 * Полная конфигурация всех типов техник
 */
export const TECHNIQUE_TYPE_CONFIGS: Record<TechniqueType, TechniqueTypeConfig> = {
  combat: {
    id: 'combat',
    name: 'Атакующие',
    icon: '⚔️',
    description: 'Техники нападения и нанесения урона противнику',
    params: [
      {
        id: 'damageVarianceMin',
        label: 'Мин. разброс урона',
        description: 'Минимальный множитель базового урона',
        min: 50,
        max: 100,
        step: 5,
        default: 70,
        unit: '%',
      },
      {
        id: 'damageVarianceMax',
        label: 'Макс. разброс урона',
        description: 'Максимальный множитель базового урона',
        min: 100,
        max: 150,
        step: 5,
        default: 130,
        unit: '%',
      },
      {
        id: 'critChanceBonus',
        label: 'Бонус шанса крита',
        description: 'Дополнительный шанс критического удара',
        min: 0,
        max: 25,
        step: 1,
        default: 0,
        unit: '%',
      },
    ],
    bonusSlotsByRarity: {
      common: [],
      uncommon: [
        { type: 'damage', minValue: 2, maxValue: 5, label: '+Урон', description: 'Увеличивает базовый урон на 2-5' },
      ],
      rare: [
        { type: 'damage', minValue: 3, maxValue: 8, label: '+Урон', description: 'Увеличивает базовый урон на 3-8' },
        { type: 'critChance', minValue: 3, maxValue: 7, label: '+Шанс крита', description: 'Увеличивает шанс крита на 3-7%' },
      ],
      legendary: [
        { type: 'damage', minValue: 5, maxValue: 15, label: '+Урон', description: 'Увеличивает базовый урон на 5-15' },
        { type: 'critChance', minValue: 5, maxValue: 12, label: '+Шанс крита', description: 'Увеличивает шанс крита на 5-12%' },
        { type: 'penetration', minValue: 10, maxValue: 25, label: '+Пробитие', description: 'Пробивает 10-25% защиты' },
      ],
    },
    baseBounds: {
      damageMin: 10,
      damageMax: 500,
      qiCostMin: 10,
      qiCostMax: 400,
      rangeMin: 5,
      rangeMax: 60,
      durationMin: 0,
      durationMax: 10,
    },
  },
  
  defense: {
    id: 'defense',
    name: 'Защитные',
    icon: '🛡️',
    description: 'Техники создания щитов, барьеров и поглощения урона',
    params: [
      {
        id: 'shieldHPBonus',
        label: 'Бонус HP щита',
        description: 'Дополнительные очки прочности щита',
        min: 0,
        max: 100,
        step: 5,
        default: 0,
        unit: ' HP',
      },
      {
        id: 'durationBonus',
        label: 'Бонус длительности',
        description: 'Дополнительное время действия щита',
        min: 0,
        max: 300,
        step: 15,
        default: 0,
        unit: ' сек',
      },
      {
        id: 'damageReductionBonus',
        label: 'Снижение урона',
        description: 'Процент снижения входящего урона',
        min: 0,
        max: 30,
        step: 5,
        default: 0,
        unit: '%',
      },
    ],
    bonusSlotsByRarity: {
      common: [],
      uncommon: [
        { type: 'shieldHP', minValue: 10, maxValue: 25, label: '+HP щита', description: 'Увеличивает HP щита на 10-25' },
      ],
      rare: [
        { type: 'shieldHP', minValue: 15, maxValue: 40, label: '+HP щита', description: 'Увеличивает HP щита на 15-40' },
        { type: 'duration', minValue: 30, maxValue: 60, label: '+Длительность', description: 'Увеличивает длительность на 30-60 сек' },
      ],
      legendary: [
        { type: 'shieldHP', minValue: 30, maxValue: 80, label: '+HP щита', description: 'Увеличивает HP щита на 30-80' },
        { type: 'duration', minValue: 60, maxValue: 120, label: '+Длительность', description: 'Увеличивает длительность на 60-120 сек' },
        { type: 'damage', minValue: 5, maxValue: 15, label: 'Отражение урона', description: 'Отражает 5-15 урона атакующему' },
      ],
    },
    baseBounds: {
      damageMin: 0,
      damageMax: 0,
      qiCostMin: 15,
      qiCostMax: 400,
      rangeMin: 0,
      rangeMax: 0,
      durationMin: 60,
      durationMax: 900,
    },
  },
  
  healing: {
    id: 'healing',
    name: 'Исцеление',
    icon: '💚',
    description: 'Техники восстановления здоровья и регенерации',
    params: [
      {
        id: 'healBonus',
        label: 'Бонус лечения',
        description: 'Дополнительное исцеление',
        min: 0,
        max: 50,
        step: 5,
        default: 0,
        unit: ' HP',
      },
      {
        id: 'healRange',
        label: 'Дальность лечения',
        description: 'Максимальная дистанция до цели',
        min: 5,
        max: 30,
        step: 5,
        default: 5,
        unit: 'м',
      },
    ],
    bonusSlotsByRarity: {
      common: [],
      uncommon: [
        { type: 'healAmount', minValue: 5, maxValue: 15, label: '+Лечение', description: 'Увеличивает лечение на 5-15 HP' },
      ],
      rare: [
        { type: 'healAmount', minValue: 10, maxValue: 25, label: '+Лечение', description: 'Увеличивает лечение на 10-25 HP' },
        { type: 'range', minValue: 3, maxValue: 8, label: '+Дальность', description: 'Увеличивает дальность на 3-8м' },
      ],
      legendary: [
        { type: 'healAmount', minValue: 15, maxValue: 40, label: '+Лечение', description: 'Увеличивает лечение на 15-40 HP' },
        { type: 'range', minValue: 5, maxValue: 12, label: '+Дальность', description: 'Увеличивает дальность на 5-12м' },
        { type: 'qiCostReduce', minValue: 10, maxValue: 25, label: '-Стоимость Ци', description: 'Снижает стоимость Ци на 10-25%' },
      ],
    },
    baseBounds: {
      damageMin: 0,
      damageMax: 0,
      qiCostMin: 12,
      qiCostMax: 480,
      rangeMin: 5,
      rangeMax: 20,
      durationMin: 0,
      durationMax: 30,
    },
  },
  
  movement: {
    id: 'movement',
    name: 'Перемещение',
    icon: '🏃',
    description: 'Техники быстрого перемещения, уклонения и прыжков',
    params: [
      {
        id: 'distanceBonus',
        label: 'Бонус дистанции',
        description: 'Дополнительная дистанция перемещения',
        min: 0,
        max: 20,
        step: 2,
        default: 0,
        unit: 'м',
      },
      {
        id: 'speedBonus',
        label: 'Бонус скорости',
        description: 'Временное увеличение скорости после перемещения',
        min: 0,
        max: 50,
        step: 5,
        default: 0,
        unit: '%',
      },
    ],
    bonusSlotsByRarity: {
      common: [],
      uncommon: [
        { type: 'range', minValue: 3, maxValue: 8, label: '+Дистанция', description: 'Увеличивает дистанцию на 3-8м' },
      ],
      rare: [
        { type: 'range', minValue: 5, maxValue: 12, label: '+Дистанция', description: 'Увеличивает дистанцию на 5-12м' },
        { type: 'cooldownReduce', minValue: 1, maxValue: 3, label: '-Перезарядка', description: 'Снижает перезарядку на 1-3 сек' },
      ],
      legendary: [
        { type: 'range', minValue: 8, maxValue: 20, label: '+Дистанция', description: 'Увеличивает дистанцию на 8-20м' },
        { type: 'cooldownReduce', minValue: 2, maxValue: 5, label: '-Перезарядка', description: 'Снижает перезарядку на 2-5 сек' },
        { type: 'qiCostReduce', minValue: 15, maxValue: 35, label: '-Стоимость Ци', description: 'Снижает стоимость Ци на 15-35%' },
      ],
    },
    baseBounds: {
      damageMin: 0,
      damageMax: 0,
      qiCostMin: 6,
      qiCostMax: 240,
      rangeMin: 10,
      rangeMax: 100,
      durationMin: 0,
      durationMax: 5,
    },
  },
  
  sensory: {
    id: 'sensory',
    name: 'Восприятие',
    icon: '👁️',
    description: 'Техники обнаружения, анализа и sensing окружения',
    params: [
      {
        id: 'sensingRange',
        label: 'Радиус восприятия',
        description: 'Дальность обнаружения объектов',
        min: 20,
        max: 200,
        step: 10,
        default: 50,
        unit: 'м',
      },
      {
        id: 'durationBonus',
        label: 'Длительность',
        description: 'Время действия техники восприятия',
        min: 1,
        max: 30,
        step: 1,
        default: 5,
        unit: 'мин',
      },
    ],
    bonusSlotsByRarity: {
      common: [],
      uncommon: [
        { type: 'range', minValue: 5, maxValue: 15, label: '+Радиус', description: 'Увеличивает радиус на 5-15м' },
      ],
      rare: [
        { type: 'range', minValue: 10, maxValue: 25, label: '+Радиус', description: 'Увеличивает радиус на 10-25м' },
        { type: 'duration', minValue: 2, maxValue: 5, label: '+Длительность', description: 'Увеличивает длительность на 2-5 мин' },
      ],
      legendary: [
        { type: 'range', minValue: 20, maxValue: 50, label: '+Радиус', description: 'Увеличивает радиус на 20-50м' },
        { type: 'duration', minValue: 5, maxValue: 15, label: '+Длительность', description: 'Увеличивает длительность на 5-15 мин' },
        { type: 'qiCostReduce', minValue: 20, maxValue: 40, label: '-Стоимость Ци', description: 'Снижает стоимость Ци на 20-40%' },
      ],
    },
    baseBounds: {
      damageMin: 0,
      damageMax: 0,
      qiCostMin: 5,
      qiCostMax: 200,
      rangeMin: 20,
      rangeMax: 150,
      durationMin: 1,
      durationMax: 45,
    },
  },
  
  cultivation: {
    id: 'cultivation',
    name: 'Культивация',
    icon: '🧘',
    description: 'Техники медитации, накопления Ци и развития',
    params: [
      {
        id: 'qiRegenBonus',
        label: 'Бонус регена Ци',
        description: 'Дополнительный процент регенерации Ци',
        min: 0,
        max: 20,
        step: 1,
        default: 0,
        unit: '%',
      },
      {
        id: 'efficiencyBonus',
        label: 'Эффективность',
        description: 'Бонус к эффективности культивации',
        min: 0,
        max: 30,
        step: 5,
        default: 0,
        unit: '%',
      },
    ],
    bonusSlotsByRarity: {
      common: [],
      uncommon: [
        { type: 'qiRegen', minValue: 2, maxValue: 5, label: '+Реген Ци', description: 'Увеличивает реген Ци на 2-5%' },
      ],
      rare: [
        { type: 'qiRegen', minValue: 3, maxValue: 8, label: '+Реген Ци', description: 'Увеличивает реген Ци на 3-8%' },
        { type: 'efficiencyBonus', minValue: 5, maxValue: 15, label: '+Эффективность', description: 'Увеличивает эффективность на 5-15%' },
      ],
      legendary: [
        { type: 'qiRegen', minValue: 5, maxValue: 15, label: '+Реген Ци', description: 'Увеличивает реген Ци на 5-15%' },
        { type: 'efficiencyBonus', minValue: 10, maxValue: 25, label: '+Эффективность', description: 'Увеличивает эффективность на 10-25%' },
        { type: 'duration', minValue: 10, maxValue: 30, label: '+Длительность эффекта', description: 'Длительность бонусов +10-30 мин' },
      ],
    },
    baseBounds: {
      damageMin: 0,
      damageMax: 0,
      qiCostMin: 0,
      qiCostMax: 0,
      rangeMin: 0,
      rangeMax: 0,
      durationMin: 0,
      durationMax: 0,
    },
  },
  
  support: {
    id: 'support',
    name: 'Поддержка',
    icon: '✨',
    description: 'Техники усиления союзников и создания эффектов',
    params: [
      {
        id: 'buffAmount',
        label: 'Сила баффа',
        description: 'Величина усиления характеристик',
        min: 5,
        max: 50,
        step: 5,
        default: 15,
        unit: '%',
      },
      {
        id: 'buffDuration',
        label: 'Длительность баффа',
        description: 'Время действия усиления',
        min: 1,
        max: 30,
        step: 1,
        default: 5,
        unit: 'мин',
      },
    ],
    bonusSlotsByRarity: {
      common: [],
      uncommon: [
        { type: 'effectPower', minValue: 3, maxValue: 8, label: '+Сила эффекта', description: 'Увеличивает силу баффа на 3-8%' },
      ],
      rare: [
        { type: 'effectPower', minValue: 5, maxValue: 12, label: '+Сила эффекта', description: 'Увеличивает силу баффа на 5-12%' },
        { type: 'duration', minValue: 2, maxValue: 6, label: '+Длительность', description: 'Увеличивает длительность на 2-6 мин' },
      ],
      legendary: [
        { type: 'effectPower', minValue: 8, maxValue: 20, label: '+Сила эффекта', description: 'Увеличивает силу баффа на 8-20%' },
        { type: 'duration', minValue: 5, maxValue: 12, label: '+Длительность', description: 'Увеличивает длительность на 5-12 мин' },
        { type: 'range', minValue: 5, maxValue: 15, label: '+Радиус', description: 'Увеличивает радиус действия на 5-15м' },
      ],
    },
    baseBounds: {
      damageMin: 0,
      damageMax: 0,
      qiCostMin: 10,
      qiCostMax: 300,
      rangeMin: 5,
      rangeMax: 30,
      durationMin: 1,
      durationMax: 30,
    },
  },
  
  curse: {
    id: 'curse',
    name: 'Проклятия',
    icon: '💀',
    description: 'Техники ослабления и проклятия противников',
    params: [
      {
        id: 'cursePower',
        label: 'Сила проклятия',
        description: 'Величина ослабления характеристик',
        min: 5,
        max: 50,
        step: 5,
        default: 15,
        unit: '%',
      },
      {
        id: 'curseDuration',
        label: 'Длительность проклятия',
        description: 'Время действия ослабления',
        min: 10,
        max: 600,
        step: 30,
        default: 60,
        unit: ' сек',
      },
    ],
    bonusSlotsByRarity: {
      common: [],
      uncommon: [
        { type: 'effectPower', minValue: 3, maxValue: 8, label: '+Сила проклятия', description: 'Увеличивает силу ослабления на 3-8%' },
      ],
      rare: [
        { type: 'effectPower', minValue: 5, maxValue: 12, label: '+Сила проклятия', description: 'Увеличивает силу ослабления на 5-12%' },
        { type: 'duration', minValue: 30, maxValue: 90, label: '+Длительность', description: 'Увеличивает длительность на 30-90 сек' },
      ],
      legendary: [
        { type: 'effectPower', minValue: 10, maxValue: 25, label: '+Сила проклятия', description: 'Увеличивает силу ослабления на 10-25%' },
        { type: 'duration', minValue: 60, maxValue: 180, label: '+Длительность', description: 'Увеличивает длительность на 60-180 сек' },
        { type: 'range', minValue: 5, maxValue: 15, label: '+Дальность', description: 'Увеличивает дальность проклятия на 5-15м' },
      ],
    },
    baseBounds: {
      damageMin: 5,
      damageMax: 50,
      qiCostMin: 20,
      qiCostMax: 300,
      rangeMin: 10,
      rangeMax: 30,
      durationMin: 10,
      durationMax: 3600,
    },
  },
  
  poison: {
    id: 'poison',
    name: 'Яды',
    icon: '🧪',
    description: 'Техники отравления и нанесения урона по времени',
    params: [
      {
        id: 'poisonDamage',
        label: 'Урон яда',
        description: 'Урон в секунду от отравления',
        min: 1,
        max: 30,
        step: 1,
        default: 5,
        unit: '/сек',
      },
      {
        id: 'poisonDuration',
        label: 'Длительность яда',
        description: 'Время действия отравления',
        min: 1,
        max: 60,
        step: 5,
        default: 15,
        unit: 'мин',
      },
    ],
    bonusSlotsByRarity: {
      common: [],
      uncommon: [
        { type: 'damage', minValue: 1, maxValue: 3, label: '+Урон яда', description: 'Увеличивает урон яда на 1-3/сек' },
      ],
      rare: [
        { type: 'damage', minValue: 2, maxValue: 5, label: '+Урон яда', description: 'Увеличивает урон яда на 2-5/сек' },
        { type: 'duration', minValue: 5, maxValue: 15, label: '+Длительность', description: 'Увеличивает длительность на 5-15 мин' },
      ],
      legendary: [
        { type: 'damage', minValue: 3, maxValue: 10, label: '+Урон яда', description: 'Увеличивает урон яда на 3-10/сек' },
        { type: 'duration', minValue: 10, maxValue: 30, label: '+Длительность', description: 'Увеличивает длительность на 10-30 мин' },
        { type: 'penetration', minValue: 15, maxValue: 35, label: '+Пробитие защиты', description: 'Игнорирует 15-35% сопротивления яду' },
      ],
    },
    baseBounds: {
      damageMin: 3,
      damageMax: 30,
      qiCostMin: 30,
      qiCostMax: 400,
      rangeMin: 0,
      rangeMax: 15,
      durationMin: 15,
      durationMax: 240,
    },
  },
};

/**
 * ============================================================================
 * КОНФИГУРАЦИЯ ПОДТИПОВ АТАКУЮЩИХ ТЕХНИК
 * ============================================================================
 */

/**
 * Диапазон затухания урона для дальних техник
 */
export interface DamageFalloff {
  fullDamage: number;    // Дистанция полного урона (м)
  halfDamage: number;    // Дистанция 50% урона (м)
  max: number;           // Максимальная дистанция (м)
}

/**
 * Конфигурация подтипа атакующей техники
 */
export interface CombatSubtypeConfig {
  id: CombatSubtype;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  
  /**
   * Требуется ли выбор типа оружия
   */
  requiresWeaponType: boolean;
  
  /**
   * Базовая дальность (для melee_strike)
   */
  baseRange?: number;
  
  /**
   * Прирост дальности за уровень редкости (м)
   */
  rangePerRarity?: number;
  
  /**
   * Поддерживает ли дальний удар Ци для легендарных
   */
  canRangedQi: boolean;
  
  /**
   * Имеет ли затухание урона по дистанции
   */
  hasDamageFalloff: boolean;
  
  /**
   * Параметры для UI
   */
  params: TechniqueParam[];
  
  /**
   * Бонусы по редкости для этого подтипа
   */
  bonusSlotsByRarity: Record<Rarity, BonusSlot[]>;
  
  /**
   * Формула масштабирования характеристик
   */
  statScaling: {
    primary: 'strength' | 'agility' | 'intelligence';
    secondary?: 'strength' | 'agility' | 'intelligence';
    primaryPercent: number;
    secondaryPercent: number;
  };
}

/**
 * Конфигурация всех подтипов атакующих техник
 */
export const COMBAT_SUBTYPE_CONFIGS: Record<CombatSubtype, CombatSubtypeConfig> = {
  melee_strike: {
    id: 'melee_strike',
    name: 'Удар телом',
    nameEn: 'Body Strike',
    icon: '👊',
    description: 'Техники усиления тела для ближнего боя. Дальность равна диаметру тела.',
    requiresWeaponType: false,
    baseRange: 0.5, // Диаметр тела (0.5м)
    rangePerRarity: 0.1, // +0.1м за уровень редкости
    canRangedQi: false,
    hasDamageFalloff: false,
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
        id: 'knockbackChance',
        label: 'Шанс отбрасывания',
        description: 'Вероятность отбросить противника',
        min: 0,
        max: 50,
        step: 5,
        default: 0,
        unit: '%',
      },
    ],
    bonusSlotsByRarity: {
      common: [],
      uncommon: [
        { type: 'damage', minValue: 2, maxValue: 5, label: '+Урон', description: 'Увеличивает урон на 2-5' },
      ],
      rare: [
        { type: 'damage', minValue: 3, maxValue: 8, label: '+Урон', description: 'Увеличивает урон на 3-8' },
        { type: 'penetration', minValue: 5, maxValue: 15, label: '+Пробитие', description: 'Пробивает 5-15% защиты' },
      ],
      legendary: [
        { type: 'damage', minValue: 5, maxValue: 15, label: '+Урон', description: 'Увеличивает урон на 5-15' },
        { type: 'penetration', minValue: 10, maxValue: 25, label: '+Пробитие', description: 'Пробивает 10-25% защиты' },
        { type: 'effectPower', minValue: 20, maxValue: 40, label: '+Оглушение', description: '20-40% шанс оглушения' },
      ],
    },
    statScaling: {
      primary: 'strength',
      secondary: 'agility',
      primaryPercent: 5,
      secondaryPercent: 2.5,
    },
  },
  
  melee_weapon: {
    id: 'melee_weapon',
    name: 'Удар с оружием',
    nameEn: 'Weapon Strike',
    icon: '⚔️',
    description: 'Техники усиления оружия. Дальность зависит от типа оружия. Легендарные могут выпускать волны Ци.',
    requiresWeaponType: true,
    canRangedQi: true, // Для легендарных техник
    hasDamageFalloff: false,
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
        description: 'Процент увеличения дальности оружия',
        min: 0,
        max: 50,
        step: 5,
        default: 0,
        unit: '%',
      },
      {
        id: 'critChanceBonus',
        label: 'Бонус шанса крита',
        description: 'Дополнительный шанс критического удара',
        min: 0,
        max: 25,
        step: 1,
        default: 0,
        unit: '%',
      },
    ],
    bonusSlotsByRarity: {
      common: [],
      uncommon: [
        { type: 'damage', minValue: 2, maxValue: 6, label: '+Урон', description: 'Увеличивает урон на 2-6' },
      ],
      rare: [
        { type: 'damage', minValue: 4, maxValue: 10, label: '+Урон', description: 'Увеличивает урон на 4-10' },
        { type: 'critChance', minValue: 3, maxValue: 8, label: '+Шанс крита', description: 'Увеличивает шанс крита на 3-8%' },
      ],
      legendary: [
        { type: 'damage', minValue: 8, maxValue: 20, label: '+Урон', description: 'Увеличивает урон на 8-20' },
        { type: 'critChance', minValue: 5, maxValue: 15, label: '+Шанс крита', description: 'Увеличивает шанс крита на 5-15%' },
        { type: 'penetration', minValue: 15, maxValue: 35, label: '+Пробитие', description: 'Пробивает 15-35% защиты' },
      ],
    },
    statScaling: {
      primary: 'agility',
      secondary: 'strength',
      primaryPercent: 5,
      secondaryPercent: 2.5,
    },
  },
  
  ranged_projectile: {
    id: 'ranged_projectile',
    name: 'Снаряд',
    nameEn: 'Projectile',
    icon: '🎯',
    description: 'Дистанционные техники со снарядом. Урон затухает с расстоянием.',
    requiresWeaponType: false,
    canRangedQi: false,
    hasDamageFalloff: true,
    params: [
      {
        id: 'projectileSpeed',
        label: 'Скорость снаряда',
        description: 'Скорость полёта снаряда',
        min: 10,
        max: 100,
        step: 5,
        default: 30,
        unit: ' м/с',
      },
      {
        id: 'projectileSize',
        label: 'Размер снаряда',
        description: 'Размер снаряда (метры)',
        min: 0.1,
        max: 2,
        step: 0.1,
        default: 0.3,
        unit: 'м',
      },
      {
        id: 'pierceCount',
        label: 'Пробитие целей',
        description: 'Количество пробиваемых целей',
        min: 0,
        max: 5,
        step: 1,
        default: 0,
        unit: '',
      },
    ],
    bonusSlotsByRarity: {
      common: [],
      uncommon: [
        { type: 'damage', minValue: 2, maxValue: 5, label: '+Урон', description: 'Увеличивает урон на 2-5' },
      ],
      rare: [
        { type: 'damage', minValue: 3, maxValue: 8, label: '+Урон', description: 'Увеличивает урон на 3-8' },
        { type: 'range', minValue: 5, maxValue: 15, label: '+Дальность', description: 'Увеличивает дальность на 5-15м' },
      ],
      legendary: [
        { type: 'damage', minValue: 5, maxValue: 15, label: '+Урон', description: 'Увеличивает урон на 5-15' },
        { type: 'range', minValue: 10, maxValue: 30, label: '+Дальность', description: 'Увеличивает дальность на 10-30м' },
        { type: 'penetration', minValue: 10, maxValue: 25, label: '+Пробитие', description: 'Пробивает 10-25% защиты' },
      ],
    },
    statScaling: {
      primary: 'intelligence',
      secondary: 'agility',
      primaryPercent: 5,
      secondaryPercent: 2.5,
    },
  },
  
  ranged_beam: {
    id: 'ranged_beam',
    name: 'Луч',
    nameEn: 'Beam',
    icon: '💫',
    description: 'Техники с непрерывным лучом энергии. Высокая точность, мгновенное попадание.',
    requiresWeaponType: false,
    canRangedQi: false,
    hasDamageFalloff: true,
    params: [
      {
        id: 'beamWidth',
        label: 'Ширина луча',
        description: 'Толщина луча энергии',
        min: 0.1,
        max: 2,
        step: 0.1,
        default: 0.2,
        unit: 'м',
      },
      {
        id: 'channelDuration',
        label: 'Длительность канала',
        description: 'Время поддержания луча',
        min: 0.5,
        max: 5,
        step: 0.5,
        default: 1,
        unit: 'сек',
      },
    ],
    bonusSlotsByRarity: {
      common: [],
      uncommon: [
        { type: 'damage', minValue: 2, maxValue: 6, label: '+Урон', description: 'Увеличивает урон в секунду на 2-6' },
      ],
      rare: [
        { type: 'damage', minValue: 4, maxValue: 10, label: '+Урон', description: 'Увеличивает урон в секунду на 4-10' },
        { type: 'duration', minValue: 30, maxValue: 90, label: '+Длительность', description: 'Увеличивает длительность канала на 30-90%' },
      ],
      legendary: [
        { type: 'damage', minValue: 8, maxValue: 20, label: '+Урон', description: 'Увеличивает урон в секунду на 8-20' },
        { type: 'duration', minValue: 50, maxValue: 150, label: '+Длительность', description: 'Увеличивает длительность канала на 50-150%' },
        { type: 'penetration', minValue: 15, maxValue: 40, label: '+Пробитие', description: 'Пробивает 15-40% защиты' },
      ],
    },
    statScaling: {
      primary: 'intelligence',
      secondary: 'agility',
      primaryPercent: 5,
      secondaryPercent: 2.5,
    },
  },
  
  ranged_aoe: {
    id: 'ranged_aoe',
    name: 'Область',
    nameEn: 'Area of Effect',
    icon: '💥',
    description: 'Техники с областью поражения. Наносят урон всем целям в зоне.',
    requiresWeaponType: false,
    canRangedQi: false,
    hasDamageFalloff: false, // AoE имеет равномерный урон в зоне
    params: [
      {
        id: 'aoeRadius',
        label: 'Радиус области',
        description: 'Радиус зоны поражения',
        min: 2,
        max: 20,
        step: 1,
        default: 5,
        unit: 'м',
      },
      {
        id: 'aoeDelay',
        label: 'Задержка',
        description: 'Задержка перед активацией',
        min: 0,
        max: 3,
        step: 0.5,
        default: 0,
        unit: 'сек',
      },
    ],
    bonusSlotsByRarity: {
      common: [],
      uncommon: [
        { type: 'damage', minValue: 2, maxValue: 5, label: '+Урон', description: 'Увеличивает урон на 2-5' },
      ],
      rare: [
        { type: 'damage', minValue: 3, maxValue: 8, label: '+Урон', description: 'Увеличивает урон на 3-8' },
        { type: 'range', minValue: 2, maxValue: 6, label: '+Радиус', description: 'Увеличивает радиус на 2-6м' },
      ],
      legendary: [
        { type: 'damage', minValue: 6, maxValue: 18, label: '+Урон', description: 'Увеличивает урон на 6-18' },
        { type: 'range', minValue: 4, maxValue: 10, label: '+Радиус', description: 'Увеличивает радиус на 4-10м' },
        { type: 'effectPower', minValue: 30, maxValue: 60, label: '+Замедление', description: '30-60% замедление в зоне' },
      ],
    },
    statScaling: {
      primary: 'intelligence',
      secondary: 'agility',
      primaryPercent: 5,
      secondaryPercent: 2.5,
    },
  },
};

/**
 * Получить конфигурацию подтипа атакующей техники
 */
export function getCombatSubtypeConfig(subtype: CombatSubtype): CombatSubtypeConfig {
  return COMBAT_SUBTYPE_CONFIGS[subtype];
}

/**
 * Получить список всех подтипов атакующих техник для UI
 */
export function getCombatSubtypeList(): CombatSubtypeConfig[] {
  return Object.values(COMBAT_SUBTYPE_CONFIGS);
}

/**
 * Вычислить дальность для melee_strike по редкости
 */
export function calculateMeleeStrikeRange(rarity: Rarity): number {
  const config = COMBAT_SUBTYPE_CONFIGS.melee_strike;
  const rarityIndex = ['common', 'uncommon', 'rare', 'legendary'].indexOf(rarity);
  return (config.baseRange || 0.5) + (rarityIndex * (config.rangePerRarity || 0.1));
}

/**
 * Информация о редкости
 */
export const RARITY_INFO: Record<Rarity, {
  label: string;
  color: string;
  bgColor: string;
  bonusSlots: number;
  description: string;
}> = {
  common: {
    label: 'Обычная',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500',
    bonusSlots: 0,
    description: 'Базовая техника без дополнительных бонусов',
  },
  uncommon: {
    label: 'Необычная',
    color: 'text-green-400',
    bgColor: 'bg-green-500',
    bonusSlots: 1,
    description: 'Техника с одним дополнительным бонусом',
  },
  rare: {
    label: 'Редкая',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500',
    bonusSlots: 2,
    description: 'Техника с двумя дополнительными бонусами',
  },
  legendary: {
    label: 'Легендарная',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500',
    bonusSlots: 3,
    description: 'Техника с тремя мощными бонусами',
  },
};

/**
 * Получить конфигурацию типа техники
 */
export function getTechniqueTypeConfig(type: TechniqueType): TechniqueTypeConfig {
  return TECHNIQUE_TYPE_CONFIGS[type];
}

/**
 * Получить список всех типов техник для UI
 */
export function getTechniqueTypeList(): TechniqueTypeConfig[] {
  return Object.values(TECHNIQUE_TYPE_CONFIGS);
}

/**
 * Получить бонусы для конкретной редкости и типа
 */
export function getBonusSlotsForRarity(type: TechniqueType, rarity: Rarity): BonusSlot[] {
  const config = TECHNIQUE_TYPE_CONFIGS[type];
  return config.bonusSlotsByRarity[rarity] || [];
}
