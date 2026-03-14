/**
 * ============================================================================
 * ЕДИНАЯ СИСТЕМА БОНУСОВ (Bonus Registry)
 * ============================================================================
 * 
 * Этот файл содержит все типы для системы бонусов.
 * Унифицирован с src/lib/generator/technique-config.ts
 * 
 * ⚠️ ВАЖНЫЕ ОГРАНИЧЕНИЯ ИЗ ЛОРА (docs/start_lore.md):
 * 
 * 1. БАЗОВЫЕ ХАРАКТЕРИСТИКИ ТЕЛА — НЕ БОНУСЫ:
 *    - Сила — только от тренировки и закалки мышц
 *    - Ловкость — только от тренировки связок и суставов
 *    - Интеллект — от активного изучения и осознания знаний
 *    - Виталити — от развития организма и культивации
 * 
 * 2. ХАРАКТЕРИСТИКИ СИСТЕМЫ ЦИ — НЕ БОНУСЫ:
 *    - Проводимость меридиан — базовая = объём_ядра / 360 сек
 *    - Ёмкость ядра — определяется при становлении практиком
 *    - Плотность Ци — определяется уровнем культивации
 * 
 * 3. ЧТО МОЖЕТ БЫТЬ БОНУСАМИ:
 *    - Эффекты техник Ци (урон, защита, скорость)
 *    - Состояния (горение, заморозка, отравление) — через Ци
 *    - Стихийный окрас техник — допустим (Ци + элемент)
 *    - Специальные эффекты (вампиризм, отражение) — через техники
 * 
 * @see docs/bonuses.md — документация
 * @see docs/start_lore.md — лор мира (контейнеры 2-3, раздел 200, 666-669)
 */

// ============================================================================
// БАЗОВЫЕ ТИПЫ
// ============================================================================

/**
 * Категории бонусов
 * 
 * ⚠️ 'stat' УДАЛЁН — характеристики тела не могут быть бонусами!
 * ⚠️ 'qi' ОГРАНИЧЕН — проводимость и ёмкость ядра не могут быть бонусами!
 */
export type BonusCategory = 
  | 'combat'         // Боевые параметры (урон, крит, пробитие) — через Ци
  | 'defense'        // Защита (броня, уклонение, HP) — через техники Ци
  | 'qi_technique'   // Эффекты техник Ци (стоимость, длительность, эффективность)
  | 'elemental'      // Элементальные (стихийный окрас Ци)
  | 'condition'      // Состояния (горение, заморозка, отравление)
  | 'special'        // Особые эффекты (вампиризм, отражение)
  | 'utility';       // Утилити (скорость движения, скрытность — через Ци)

/**
 * Подкатегории бонусов
 */
export type BonusSubcategory = 
  | 'primary'        // Первичные эффекты
  | 'secondary'      // Вторичные эффекты
  | 'resistance'     // Сопротивления
  | 'regeneration'   // Регенерация (через Ци)
  | 'modifier'       // Модификаторы
  | 'buff'           // Баффы (положительные состояния)
  | 'debuff';        // Дебаффы (отрицательные состояния)

/**
 * Тип значения бонуса
 */
export type BonusValueType = 
  | 'flat'           // Абсолютное значение (+10)
  | 'percent'        // Процент (+10%)
  | 'multiplier';    // Множитель (×1.5)

/**
 * Объекты, к которым применимы бонусы
 */
export type ApplicableTarget = 
  | 'weapon'         // Оружие (физический урон × Ци)
  | 'armor'          // Броня (защита через Ци)
  | 'jewelry'        // Украшения (усилители Ци)
  | 'charger'        // Зарядники (хранение Ци)
  | 'technique'      // Техники (эффекты Ци)
  | 'formation'      // Формации (массивы Ци)
  | 'artifact'       // Артефакты (заряжены Ци)
  | 'implant'        // Импланты (био-усилители)
  | 'tool'           // Инструменты
  | 'condition';     // Состояния (баффы/дебаффы)

/**
 * Редкость (унифицирована)
 */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/**
 * Элементы (для elemental бонусов)
 * 
 * Обоснование из лора (раздел 200):
 * Ци может принимать стихийный окрас при прохождении через 
 * определённые материалы или при использовании специальных техник.
 */
export type Element = 'fire' | 'water' | 'earth' | 'air' | 'lightning' | 'void' | 'neutral';

// ============================================================================
// ИНТЕРФЕЙСЫ
// ============================================================================

/**
 * Полное определение бонуса
 */
export interface BonusDefinition {
  // === ИДЕНТИФИКАЦИЯ ===
  id: string;                    // Уникальный ID (например, "combat_damage_flat")
  name: string;                  // Отображаемое имя
  nameEn: string;                // Английское имя
  
  // === КЛАССИФИКАЦИЯ ===
  category: BonusCategory;       // Категория бонуса
  subcategory: BonusSubcategory; // Подкатегория
  valueType: BonusValueType;     // Тип значения
  
  // === ЭЛЕМЕНТ (только для elemental) ===
  element?: Element;
  
  // === ПАРАМЕТРЫ ===
  baseValue: number;             // Базовое значение
  scalingPerLevel: number;       // Масштабирование за уровень
  maxValue?: number;             // Максимальное значение
  minValue?: number;             // Минимальное значение
  
  // === ПРИМЕНИМОСТЬ ===
  applicableTo: ApplicableTarget[]; // К каким объектам применим
  
  // === КОНФЛИКТЫ ===
  incompatibleWith: string[];    // Несовместимые бонусы
  
  // === ОТОБРАЖЕНИЕ ===
  displayFormat: string;         // Формат отображения ({value}%)
  icon?: string;                 // Иконка
  
  // === РЕДКОСТЬ ===
  minRarity: Rarity;             // Минимальная редкость для появления
  weight: number;                // Вес для случайного выбора
  
  // === ОБОСНОВАНИЕ ИЗ ЛОРА ===
  loreReason: string;            // Почему этот бонус допустим согласно start_lore.md
}

/**
 * Сгенерированный бонус (результат генерации)
 */
export interface GeneratedBonus {
  id: string;
  name: string;
  value: number;
  valueType: BonusValueType;
  displayText: string;
}

/**
 * Активное состояние на персонаже
 * 
 * Обоснование из лора (раздел 200, контейнер 3):
 * Состояния накладываются через техники Ци. Эффект зависит от 
 * количества вложенной Ци и качества ядра практика.
 */
export interface ActiveCondition {
  id: string;                    // ID состояния (condition_burning)
  source: 'technique' | 'weapon' | 'artifact' | 'environment';
  sourceId?: string;             // ID источника
  value: number;                 // Сила эффекта (зависит от Ци)
  duration: number;              // Оставшееся время (сек)
  maxDuration: number;           // Максимальная длительность
  stacks?: number;               // Количество стаков
  tickInterval?: number;         // Интервал тика (для DoT)
  lastTick?: number;             // Время последнего тика
}

/**
 * Результат обработки тика состояния
 */
export interface ConditionTickResult {
  damage: number;
  effect: 'none' | 'dot' | 'slow' | 'stun' | 'buff' | 'debuff';
  slowPercent?: number;
  duration?: number;
  healAmount?: number;
}

// ============================================================================
// ПРАВИЛА ГЕНЕРАЦИИ
// ============================================================================

/**
 * Правила генерации бонусов для объекта
 */
export interface BonusGenerationRules {
  minBonuses: Record<Rarity, number>;
  maxBonuses: Record<Rarity, number>;
  categories: BonusCategory[];
  excludeCategories: BonusCategory[];
}

/**
 * Полные правила генерации для всех типов объектов
 */
export type BonusRulesByTarget = Record<ApplicableTarget, BonusGenerationRules>;

// ============================================================================
// КОНСТАНТЫ
// ============================================================================

/**
 * Множители грейдов для экипировки
 * 
 * Обоснование из лора:
 * Качество предмета определяет, насколько эффективно он проводит Ци.
 * Лучшие материалы и обработка = лучшая проводимость Ци = больший эффект.
 */
export const GRADE_MULTIPLIERS: Record<string, number> = {
  damaged: 0.5,
  common: 1.0,
  refined: 1.3,
  perfect: 1.7,
  transcendent: 2.5,
};

/**
 * Множители редкости для техник
 * 
 * Обоснование из лора (раздел 200):
 * Качество Ци и эффективность техники пропорциональны общему объёму Ци
 * в пересчёте на базовую плотность: Эффективность = Ци × Качество_Ци
 */
export const RARITY_MULTIPLIERS: Record<Rarity, {
  damageMult: number;
  qiCostMult: number;
  effectChanceMult: number;
}> = {
  common: { damageMult: 0.8, qiCostMult: 1.0, effectChanceMult: 0.5 },
  uncommon: { damageMult: 1.0, qiCostMult: 0.95, effectChanceMult: 0.8 },
  rare: { damageMult: 1.25, qiCostMult: 0.9, effectChanceMult: 1.2 },
  legendary: { damageMult: 1.6, qiCostMult: 0.85, effectChanceMult: 1.5 },
};

/**
 * Количество слотов бонусов по редкости
 */
export const BONUS_SLOTS_BY_RARITY: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  legendary: 3,
};

// ============================================================================
// УТИЛИТЫ
// ============================================================================

/**
 * Проверка, является ли состояние положительным (баффом)
 */
export function isBuffCondition(conditionId: string): boolean {
  const buffConditions = [
    'condition_haste',
    'condition_regeneration',
    'condition_clarity',
    'condition_fortify',
    'condition_berserk',
    'condition_invisibility',
    'condition_shield',
    'condition_reflect',
  ];
  return buffConditions.includes(conditionId);
}

/**
 * Проверка, является ли состояние отрицательным (дебаффом)
 */
export function isDebuffCondition(conditionId: string): boolean {
  const debuffConditions = [
    'condition_burning',
    'condition_freezing',
    'condition_poison',
    'condition_stun',
    'condition_slow',
    'condition_weakness',
    'condition_silence',
    'condition_bleed',
    'condition_curse',
    'condition_fear',
  ];
  return debuffConditions.includes(conditionId);
}

/**
 * Проверка, является ли состояние DoT (damage over time)
 */
export function isDotCondition(conditionId: string): boolean {
  const dotConditions = [
    'condition_burning',
    'condition_poison',
    'condition_bleed',
  ];
  return dotConditions.includes(conditionId);
}

/**
 * Получение иконки для категории бонуса
 */
export function getBonusCategoryIcon(category: BonusCategory): string {
  const icons: Record<BonusCategory, string> = {
    combat: '⚔️',
    defense: '🛡️',
    qi_technique: '✨',
    elemental: '🔥',
    condition: '💫',
    special: '⭐',
    utility: '🔧',
  };
  return icons[category];
}

/**
 * Получение цвета для категории бонуса
 */
export function getBonusCategoryColor(category: BonusCategory): string {
  const colors: Record<BonusCategory, string> = {
    combat: 'text-red-400',
    defense: 'text-blue-400',
    qi_technique: 'text-purple-400',
    elemental: 'text-orange-400',
    condition: 'text-pink-400',
    special: 'text-amber-400',
    utility: 'text-green-400',
  };
  return colors[category];
}

// ============================================================================
// РЕЕСТР БОНУСОВ (определения)
// ============================================================================

/**
 * Все определения бонусов с обоснованиями из лора
 * 
 * ⚠️ ВАЖНО: Каждый бонус имеет loreReason — обоснование из start_lore.md
 */
export const BONUS_DEFINITIONS: BonusDefinition[] = [
  // ============================================================================
  // COMBAT (Боевые параметры)
  // ============================================================================
  
  /**
   * Бонус урона
   * 
   * Обоснование из лора (раздел 200):
   * "Эффективность техники (урон...) пропорциональна общему объёму Ци 
   * в пересчёте на базовую плотность Ци Qi(1)"
   * 
   * Правила:
   * - Применяется к оружию (проводит Ци) и техникам (эффект Ци)
   * - Значение зависит от качества Ци практика
   */
  {
    id: 'combat_damage_flat',
    name: 'Урон',
    nameEn: 'Damage',
    category: 'combat',
    subcategory: 'primary',
    valueType: 'flat',
    baseValue: 2,
    scalingPerLevel: 1,
    maxValue: 100,
    applicableTo: ['weapon', 'technique'],
    incompatibleWith: [],
    displayFormat: '+{value} Урон',
    minRarity: 'common',
    weight: 120,
    loreReason: 'Раздел 200: Эффективность техники пропорциональна объёму Ци × качество Ци. Оружие проводит Ци практика.',
  },
  
  {
    id: 'combat_damage_percent',
    name: 'Урон',
    nameEn: 'Damage %',
    category: 'combat',
    subcategory: 'primary',
    valueType: 'percent',
    baseValue: 3,
    scalingPerLevel: 1,
    maxValue: 100,
    applicableTo: ['weapon', 'technique', 'artifact'],
    incompatibleWith: [],
    displayFormat: '+{value}% Урон',
    minRarity: 'uncommon',
    weight: 100,
    loreReason: 'Раздел 200: Процентное усиление эффекта техники через лучшую проводимость Ци.',
  },
  
  /**
   * Пробитие брони
   * 
   * Обоснование из лора (раздел 200):
   * Ци в сверхкритическом состоянии (плазма) может пробивать защиту.
   * Качество Ци определяет пробивную способность.
   */
  {
    id: 'combat_penetration_flat',
    name: 'Пробитие брони',
    nameEn: 'Armor Penetration',
    category: 'combat',
    subcategory: 'secondary',
    valueType: 'flat',
    baseValue: 1,
    scalingPerLevel: 0.5,
    maxValue: 50,
    applicableTo: ['weapon'],
    incompatibleWith: [],
    displayFormat: '+{value} Пробитие',
    minRarity: 'uncommon',
    weight: 70,
    loreReason: 'Раздел 200: Ци в сверхкритическом состоянии (плазма) пробивает защиту. Качество материала оружия влияет на проводимость Ци.',
  },
  
  /**
   * Шанс критического удара
   * 
   * Обоснование из лора (контейнер 3, раздел 5):
   * "Интуитивное чувство опасности (Ци реагирует на угрозы)"
   * Ци может направляться в точку удара для критического эффекта.
   */
  {
    id: 'combat_crit_chance',
    name: 'Шанс крит. удара',
    nameEn: 'Crit Chance',
    category: 'combat',
    subcategory: 'secondary',
    valueType: 'percent',
    baseValue: 1,
    scalingPerLevel: 0.5,
    maxValue: 50,
    applicableTo: ['weapon', 'jewelry'],
    incompatibleWith: [],
    displayFormat: '+{value}% Крит',
    minRarity: 'uncommon',
    weight: 60,
    loreReason: 'Контейнер 3: Ци может направляться в точку удара. Украшения-усилители помогают фокусировать Ци.',
  },
  
  /**
   * Критический урон
   * 
   * Обоснование из лора (раздел 200):
   * При критическом ударе больше Ци высвобождается в точке контакта.
   */
  {
    id: 'combat_crit_damage',
    name: 'Крит. урон',
    nameEn: 'Crit Damage',
    category: 'combat',
    subcategory: 'secondary',
    valueType: 'percent',
    baseValue: 5,
    scalingPerLevel: 2,
    maxValue: 200,
    applicableTo: ['weapon', 'artifact'],
    incompatibleWith: [],
    displayFormat: '+{value}% Крит. урон',
    minRarity: 'rare',
    weight: 40,
    loreReason: 'Раздел 200: Большее количество Ци высвобождается при критическом ударе через проводник.',
  },
  
  /**
   * Дальность атаки
   * 
   * Обоснование из лора (раздел 200):
   * "При выпуске техники за пределы тела, Ци переходит сверхкритическое 
   * состояние, плазму, с плотностью что равна плотности жидкой Ци практика"
   */
  {
    id: 'combat_range_flat',
    name: 'Дальность',
    nameEn: 'Range',
    category: 'combat',
    subcategory: 'secondary',
    valueType: 'flat',
    baseValue: 0.5,
    scalingPerLevel: 0.2,
    maxValue: 50,
    applicableTo: ['weapon', 'technique'],
    incompatibleWith: [],
    displayFormat: '+{value}м Дальность',
    minRarity: 'uncommon',
    weight: 50,
    loreReason: 'Раздел 200: Ци в плазменном состоянии может распространяться на расстояние. Дальность зависит от количества Ци.',
  },
  
  /**
   * Снижение перезарядки техники
   * 
   * Обоснование из лора (контейнер 3):
   * Проводимость меридиан определяет скорость вывода Ци.
   * Лучшие техники используют меридианы эффективнее.
   */
  {
    id: 'combat_cooldown_reduce',
    name: 'Снижение перезарядки',
    nameEn: 'Cooldown Reduction',
    category: 'combat',
    subcategory: 'modifier',
    valueType: 'percent',
    baseValue: 1,
    scalingPerLevel: 0.3,
    maxValue: 50,
    applicableTo: ['technique'],
    incompatibleWith: [],
    displayFormat: '-{value}% Перезарядка',
    minRarity: 'rare',
    weight: 30,
    loreReason: 'Контейнер 3: Проводимость меридиан = скорость вывода Ци. Эффективные техники быстрее восстанавливаются.',
  },
  
  // ============================================================================
  // DEFENSE (Защита)
  // ============================================================================
  
  /**
   * Броня
   * 
   * Обоснование из лора (уровни культивации):
   * L6: "Тело почти неуязвимо для обычного оружия" — Ци защищает тело.
   * Защитные техники Ци создают барьеры.
   */
  {
    id: 'defense_armor_flat',
    name: 'Броня',
    nameEn: 'Armor',
    category: 'defense',
    subcategory: 'primary',
    valueType: 'flat',
    baseValue: 2,
    scalingPerLevel: 1,
    maxValue: 100,
    applicableTo: ['armor'],
    incompatibleWith: [],
    displayFormat: '+{value} Броня',
    minRarity: 'common',
    weight: 100,
    loreReason: 'Уровни культивации: L6 "Тело почти неуязвимо для обычного оружия". Броня проводит Ци для защиты.',
  },
  
  /**
   * Уклонение
   * 
   * Обоснование из лора (контейнер 3, раздел 5):
   * L2: "Интуитивное чувство опасности (Ци реагирует на угрозы)"
   * Ци предупреждает об опасности, позволяя уклониться.
   */
  {
    id: 'defense_dodge_flat',
    name: 'Уклонение',
    nameEn: 'Dodge',
    category: 'defense',
    subcategory: 'secondary',
    valueType: 'percent',
    baseValue: 1,
    scalingPerLevel: 0.5,
    maxValue: 30,
    applicableTo: ['armor', 'jewelry'],
    incompatibleWith: ['defense_block_flat'],
    displayFormat: '+{value}% Уклонение',
    minRarity: 'uncommon',
    weight: 50,
    loreReason: 'Контейнер 3, L2: "Интуитивное чувство опасности (Ци реагирует на угрозы)". Украшения усиливают восприятие Ци.',
  },
  
  /**
   * Блок
   * 
   * Обоснование из лора:
   * Ци можно направить в оружие/броню для блокировки ударов.
   */
  {
    id: 'defense_block_flat',
    name: 'Блок',
    nameEn: 'Block',
    category: 'defense',
    subcategory: 'secondary',
    valueType: 'percent',
    baseValue: 2,
    scalingPerLevel: 1,
    maxValue: 50,
    applicableTo: ['armor', 'weapon'],
    incompatibleWith: ['defense_dodge_flat'],
    displayFormat: '+{value}% Блок',
    minRarity: 'uncommon',
    weight: 50,
    loreReason: 'Ци направляется в оружие/броню для создания защитного барьера при блоке.',
  },
  
  /**
   * Здоровье (HP)
   * 
   * ⚠️ ОГРАНИЧЕНО: HP зависит от виталити (характеристика тела).
   * Бонус применяется ТОЛЬКО к предметам, дающим временное HP через Ци.
   * 
   * Обоснование из лора (контейнер 3):
   * L2: "Заживление ускоряется (порезы за час)" — Ци ускоряет регенерацию.
   */
  {
    id: 'defense_hp_flat',
    name: 'Здоровье (временное)',
    nameEn: 'Temporary HP',
    category: 'defense',
    subcategory: 'secondary',
    valueType: 'flat',
    baseValue: 10,
    scalingPerLevel: 5,
    maxValue: 200,
    applicableTo: ['artifact'], // Только артефакты!
    incompatibleWith: [],
    displayFormat: '+{value} Временное HP',
    minRarity: 'rare',
    weight: 40,
    loreReason: 'Контейнер 3, L2: "Заживление ускоряется". Артефакты с Ци могут давать временный запас HP через Ци-барьер. НЕ увеличивает базовое HP тела!',
  },
  
  /**
   * HP щита (техники защиты)
   * 
   * Обоснование из лора (уровни культивации):
   * L3: "Может использовать Ци для всплесков силы" — Ци создаёт щиты.
   */
  {
    id: 'defense_shield_hp',
    name: 'HP щита',
    nameEn: 'Shield HP',
    category: 'defense',
    subcategory: 'primary',
    valueType: 'flat',
    baseValue: 10,
    scalingPerLevel: 5,
    maxValue: 500,
    applicableTo: ['technique', 'artifact'],
    incompatibleWith: [],
    displayFormat: 'Щит: {value} HP',
    minRarity: 'uncommon',
    weight: 50,
    loreReason: 'Уровни культивации L3: Ци создаёт защитные барьеры. Эффективность = Ци × качество.',
  },
  
  /**
   * Снижение урона
   * 
   * Обоснование из лора:
   * Защитные техники Ци поглощают часть урона.
   */
  {
    id: 'defense_damage_reduction',
    name: 'Снижение урона',
    nameEn: 'Damage Reduction',
    category: 'defense',
    subcategory: 'modifier',
    valueType: 'percent',
    baseValue: 2,
    scalingPerLevel: 0.5,
    maxValue: 50,
    applicableTo: ['technique', 'artifact'],
    incompatibleWith: [],
    displayFormat: '-{value}% Урон',
    minRarity: 'rare',
    weight: 30,
    loreReason: 'Защитные техники Ци поглощают часть урона через рассеивание Ци противника.',
  },
  
  // ============================================================================
  // QI_TECHNIQUE (Эффекты техник Ци)
  // ============================================================================
  
  /**
   * ⚠️ ВАЖНО: Проводимость и ёмкость ядра — НЕ бонусы!
   * Это базовые характеристики системы Ци (контейнер 3).
   * 
   * Обоснование из лора:
   * - Проводимость = объём_ядра / 360 сек (пункт 667)
   * - Ёмкость ядра = стартовый объём × множитель уровня (пункт 5)
   * 
   * Эти параметры НЕ могут быть улучшены бонусами!
   */
  
  /**
   * Регенерация Ци
   * 
   * ⚠️ ОГРАНИЧЕНО: Базовая скорость = 10% от ёмкости ядра/сутки.
   * Бонусы могут только немного ускорить через техники.
   */
  {
    id: 'qi_regen_flat',
    name: 'Регенерация Ци (техника)',
    nameEn: 'Qi Regeneration (technique)',
    category: 'qi_technique',
    subcategory: 'regeneration',
    valueType: 'flat',
    baseValue: 0.5,
    scalingPerLevel: 0.2,
    maxValue: 10,
    applicableTo: ['technique', 'artifact'],
    incompatibleWith: [],
    displayFormat: '+{value} Ци/сек (техника)',
    minRarity: 'rare',
    weight: 30,
    loreReason: 'Контейнер 3: "Скорость генерации Ци микро ядром — 10% от ёмкости ядра в сутки". Техники могут временно ускорять поглощение Ци из среды. НЕ увеличивает базовую генерацию!',
  },
  
  /**
   * Снижение стоимости Ци техники
   * 
   * Обоснование из лора (раздел 200):
   * "Любая техника Ци требует минимального объёма Ци"
   * Мастерство техники снижает расход Ци.
   */
  {
    id: 'qi_cost_reduce',
    name: 'Снижение стоимости Ци',
    nameEn: 'Qi Cost Reduction',
    category: 'qi_technique',
    subcategory: 'modifier',
    valueType: 'percent',
    baseValue: 2,
    scalingPerLevel: 0.5,
    maxValue: 50,
    applicableTo: ['technique'],
    incompatibleWith: [],
    displayFormat: '-{value}% Стоимость Ци',
    minRarity: 'uncommon',
    weight: 50,
    loreReason: 'Раздел 200: "Любая техника Ци требует минимального объёма Ци". Мастерство позволяет использовать Ци эффективнее.',
  },
  
  /**
   * Эффективность Ци
   * 
   * Обоснование из лора (раздел 200):
   * "Эффективность = Потрачено Ци × Качество Ци"
   */
  {
    id: 'qi_efficiency',
    name: 'Эффективность Ци',
    nameEn: 'Qi Efficiency',
    category: 'qi_technique',
    subcategory: 'modifier',
    valueType: 'percent',
    baseValue: 3,
    scalingPerLevel: 1,
    maxValue: 50,
    applicableTo: ['technique', 'artifact'],
    incompatibleWith: [],
    displayFormat: '+{value}% Эффективность Ци',
    minRarity: 'rare',
    weight: 40,
    loreReason: 'Раздел 200: "Эффективность = Потрачено Ци × Качество Ци". Техники могут улучшить коэффициент эффективности.',
  },
  
  // ============================================================================
  // ELEMENTAL (Элементальные / стихийный окрас)
  // ============================================================================
  
  /**
   * Стихийный урон
   * 
   * Обоснование из лора (раздел 200):
   * "Ци — квантованная, не дробная"
   * "Хаотичная Ци имеет выше энергетический потенциал"
   * 
   * Ци может принимать стихийный окрас при прохождении через
   * определённые материалы или при использовании техник.
   */
  {
    id: 'elemental_fire_damage',
    name: 'Урон огнём',
    nameEn: 'Fire Damage',
    category: 'elemental',
    subcategory: 'primary',
    valueType: 'percent',
    baseValue: 3,
    scalingPerLevel: 1,
    maxValue: 100,
    element: 'fire',
    applicableTo: ['weapon', 'technique'],
    incompatibleWith: [],
    displayFormat: '+{value}% Урон огнём',
    minRarity: 'uncommon',
    weight: 50,
    loreReason: 'Раздел 200: Ци принимает стихийный окрас. Огненный окрас = усиление горения и тепловых эффектов.',
  },
  
  {
    id: 'elemental_fire_resist',
    name: 'Сопротивление огню',
    nameEn: 'Fire Resistance',
    category: 'elemental',
    subcategory: 'resistance',
    valueType: 'percent',
    baseValue: 3,
    scalingPerLevel: 1,
    maxValue: 100,
    element: 'fire',
    applicableTo: ['armor', 'jewelry'],
    incompatibleWith: [],
    displayFormat: '+{value}% Сопр. огню',
    minRarity: 'uncommon',
    weight: 50,
    loreReason: 'Защитные техники Ци могут рассеивать огненную Ци противника.',
  },
  
  {
    id: 'elemental_water_damage',
    name: 'Урон водой',
    nameEn: 'Water Damage',
    category: 'elemental',
    subcategory: 'primary',
    valueType: 'percent',
    baseValue: 3,
    scalingPerLevel: 1,
    maxValue: 100,
    element: 'water',
    applicableTo: ['weapon', 'technique'],
    incompatibleWith: [],
    displayFormat: '+{value}% Урон водой',
    minRarity: 'uncommon',
    weight: 50,
    loreReason: 'Раздел 200: Водный окрас Ци = замедление, охлаждение, проникновение.',
  },
  
  {
    id: 'elemental_water_resist',
    name: 'Сопротивление воде',
    nameEn: 'Water Resistance',
    category: 'elemental',
    subcategory: 'resistance',
    valueType: 'percent',
    baseValue: 3,
    scalingPerLevel: 1,
    maxValue: 100,
    element: 'water',
    applicableTo: ['armor', 'jewelry'],
    incompatibleWith: [],
    displayFormat: '+{value}% Сопр. воде',
    minRarity: 'uncommon',
    weight: 50,
    loreReason: 'Защитные техники рассеивают водную Ци.',
  },
  
  {
    id: 'elemental_lightning_damage',
    name: 'Урон молнией',
    nameEn: 'Lightning Damage',
    category: 'elemental',
    subcategory: 'primary',
    valueType: 'percent',
    baseValue: 3,
    scalingPerLevel: 1,
    maxValue: 100,
    element: 'lightning',
    applicableTo: ['weapon', 'technique'],
    incompatibleWith: [],
    displayFormat: '+{value}% Урон молнией',
    minRarity: 'uncommon',
    weight: 50,
    loreReason: 'Раздел 200: Молниевый окрас Ци = оглушение, пронзание, скорость.',
  },
  
  {
    id: 'elemental_lightning_resist',
    name: 'Сопротивление молнии',
    nameEn: 'Lightning Resistance',
    category: 'elemental',
    subcategory: 'resistance',
    valueType: 'percent',
    baseValue: 3,
    scalingPerLevel: 1,
    maxValue: 100,
    element: 'lightning',
    applicableTo: ['armor', 'jewelry'],
    incompatibleWith: [],
    displayFormat: '+{value}% Сопр. молнии',
    minRarity: 'uncommon',
    weight: 50,
    loreReason: 'Защитные техники заземляют молниевую Ци.',
  },
  
  {
    id: 'elemental_void_damage',
    name: 'Урон пустотой',
    nameEn: 'Void Damage',
    category: 'elemental',
    subcategory: 'primary',
    valueType: 'percent',
    baseValue: 5,
    scalingPerLevel: 2,
    maxValue: 100,
    element: 'void',
    applicableTo: ['weapon', 'technique'],
    incompatibleWith: [],
    displayFormat: '+{value}% Урон пустотой',
    minRarity: 'rare',
    weight: 30,
    loreReason: 'Раздел 200: Пустотный окрас Ци = разрушение, аннигиляция. Редкий и опасный элемент.',
  },
  
  {
    id: 'elemental_void_resist',
    name: 'Сопротивление пустоте',
    nameEn: 'Void Resistance',
    category: 'elemental',
    subcategory: 'resistance',
    valueType: 'percent',
    baseValue: 5,
    scalingPerLevel: 2,
    maxValue: 100,
    element: 'void',
    applicableTo: ['armor', 'jewelry'],
    incompatibleWith: [],
    displayFormat: '+{value}% Сопр. пустоте',
    minRarity: 'rare',
    weight: 30,
    loreReason: 'Защита от пустотной Ци требует специальных техник стабилизации.',
  },
  
  // ============================================================================
  // CONDITION (Состояния)
  // ============================================================================
  
  // === ПОЛОЖИТЕЛЬНЫЕ (баффы) ===
  
  /**
   * Ускорение
   * 
   * Обоснование из лора (уровни культивации):
   * L2: "Может использовать Ци для лёгкого усиления мышц (прыжки, удары)"
   */
  {
    id: 'condition_haste',
    name: 'Ускорение',
    nameEn: 'Haste',
    category: 'condition',
    subcategory: 'buff',
    valueType: 'percent',
    baseValue: 10,
    scalingPerLevel: 2,
    maxValue: 100,
    applicableTo: ['technique', 'artifact'],
    incompatibleWith: ['condition_slow'],
    displayFormat: '+{value}% Скорость',
    minRarity: 'uncommon',
    weight: 40,
    loreReason: 'Уровни культивации L2: "Может использовать Ци для лёгкого усиления мышц". Техники ускорения направляют Ци в ноги.',
  },
  
  /**
   * Регенерация HP
   * 
   * Обоснование из лора (контейнер 3):
   * L2: "Заживление ускоряется (порезы за час)"
   */
  {
    id: 'condition_regeneration',
    name: 'Регенерация',
    nameEn: 'Regeneration',
    category: 'condition',
    subcategory: 'buff',
    valueType: 'flat',
    baseValue: 2,
    scalingPerLevel: 0.5,
    maxValue: 20,
    applicableTo: ['technique'],
    incompatibleWith: ['condition_poison', 'condition_bleed'],
    displayFormat: '+{value} HP/сек',
    minRarity: 'uncommon',
    weight: 50,
    loreReason: 'Контейнер 3, L2: "Заживление ускоряется". Ци направляется в повреждённые ткани для ускорения регенерации.',
  },
  
  /**
   * Энергетический щит
   * 
   * Обоснование из лора (уровни культивации):
   * L3: "Ци можно выбрасывать для всплесков силы" — создание щита
   */
  {
    id: 'condition_shield',
    name: 'Энергетический щит',
    nameEn: 'Energy Shield',
    category: 'condition',
    subcategory: 'buff',
    valueType: 'flat',
    baseValue: 50,
    scalingPerLevel: 10,
    maxValue: 500,
    applicableTo: ['technique', 'artifact'],
    incompatibleWith: [],
    displayFormat: 'Щит: {value} HP',
    minRarity: 'rare',
    weight: 30,
    loreReason: 'Уровни культивации L3: Ци создаёт защитный барьер вокруг тела. Эффективность = объём Ци × качество.',
  },
  
  /**
   * Отражение урона
   * 
   * Обоснование из лора:
   * Защитные техники могут перенаправлять Ци противника обратно.
   */
  {
    id: 'condition_reflect',
    name: 'Отражение',
    nameEn: 'Reflect',
    category: 'condition',
    subcategory: 'buff',
    valueType: 'percent',
    baseValue: 10,
    scalingPerLevel: 2,
    maxValue: 50,
    applicableTo: ['technique', 'artifact'],
    incompatibleWith: [],
    displayFormat: '+{value}% Отражение урона',
    minRarity: 'rare',
    weight: 25,
    loreReason: 'Защитные техники Ци могут перенаправлять атакующую Ци обратно к противнику.',
  },
  
  // === ОТРИЦАТЕЛЬНЫЕ (дебаффы) ===
  
  /**
   * Горение (DoT огнём)
   * 
   * Обоснование из лора (раздел 200):
   * "Хаотичная Ци... стремиться к преобразованию в Спокойную"
   * Огненная Ци вызывает горение тканей.
   */
  {
    id: 'condition_burning',
    name: 'Горение',
    nameEn: 'Burning',
    category: 'condition',
    subcategory: 'debuff',
    valueType: 'flat',
    baseValue: 2,
    scalingPerLevel: 0.5,
    maxValue: 50,
    element: 'fire',
    applicableTo: ['technique', 'weapon'],
    incompatibleWith: ['condition_freezing'],
    displayFormat: 'Горение: {value} урона/сек',
    minRarity: 'uncommon',
    weight: 40,
    loreReason: 'Раздел 200: Огненная Ци вызывает горение тканей. DoT = количество Ци × стихийный множитель.',
  },
  
  /**
   * Заморозка
   * 
   * Обоснование из лора:
   * Водная Ци в комбинации с охлаждением замедляет движения.
   */
  {
    id: 'condition_freezing',
    name: 'Заморозка',
    nameEn: 'Freezing',
    category: 'condition',
    subcategory: 'debuff',
    valueType: 'percent',
    baseValue: 20,
    scalingPerLevel: 5,
    maxValue: 80,
    element: 'water',
    applicableTo: ['technique'],
    incompatibleWith: ['condition_burning', 'condition_haste'],
    displayFormat: 'Заморозка: -{value}% скорость',
    minRarity: 'uncommon',
    weight: 35,
    loreReason: 'Водная Ци + охлаждение = замедление движения. Ци "застывает" в меридианах цели.',
  },
  
  /**
   * Отравление (DoT ядом)
   * 
   * Обоснование из лора:
   * Хаотичная Ци повреждает меридианы, вызывая отравление.
   */
  {
    id: 'condition_poison',
    name: 'Отравление',
    nameEn: 'Poison',
    category: 'condition',
    subcategory: 'debuff',
    valueType: 'flat',
    baseValue: 1,
    scalingPerLevel: 0.3,
    maxValue: 30,
    applicableTo: ['technique', 'weapon'],
    incompatibleWith: ['condition_regeneration'],
    displayFormat: 'Отравление: {value} урона/сек',
    minRarity: 'common',
    weight: 60,
    loreReason: 'Хаотичная Ци повреждает меридианы, отравляя организм. Восстановление требует очистки Ци.',
  },
  
  /**
   * Оглушение
   * 
   * Обоснование из лора:
   * Резкий выброс Ци может дезориентировать противника.
   */
  {
    id: 'condition_stun',
    name: 'Оглушение',
    nameEn: 'Stun',
    category: 'condition',
    subcategory: 'debuff',
    valueType: 'flat',
    baseValue: 0.5,
    scalingPerLevel: 0.1,
    maxValue: 3,
    applicableTo: ['technique', 'weapon'],
    incompatibleWith: [],
    displayFormat: 'Оглушение: {value} сек',
    minRarity: 'rare',
    weight: 20,
    loreReason: 'Резкий выброс Ци дезориентирует противника, сбивая поток Ци в меридианах.',
  },
  
  /**
   * Замедление
   * 
   * Обоснование из лора:
   * Техники могут "утяжелять" Ци противника.
   */
  {
    id: 'condition_slow',
    name: 'Замедление',
    nameEn: 'Slow',
    category: 'condition',
    subcategory: 'debuff',
    valueType: 'percent',
    baseValue: 20,
    scalingPerLevel: 5,
    maxValue: 80,
    applicableTo: ['technique'],
    incompatibleWith: ['condition_haste'],
    displayFormat: 'Замедление: -{value}% скорость',
    minRarity: 'common',
    weight: 50,
    loreReason: 'Техники замедления "утяжеляют" Ци противника в ногах, затрудняя движение.',
  },
  
  /**
   * Кровотечение (DoT)
   * 
   * Обоснование из лора:
   * Оружие с Ци может вызывать раны, которые не заживают.
   */
  {
    id: 'condition_bleed',
    name: 'Кровотечение',
    nameEn: 'Bleed',
    category: 'condition',
    subcategory: 'debuff',
    valueType: 'flat',
    baseValue: 1,
    scalingPerLevel: 0.3,
    maxValue: 20,
    applicableTo: ['weapon', 'technique'],
    incompatibleWith: ['condition_regeneration'],
    displayFormat: 'Кровотечение: {value} урона/сек',
    minRarity: 'uncommon',
    weight: 45,
    loreReason: 'Оружие с Ци наносит раны, которые сопротивляются исцелению. Ци блокирует регенерацию в месте ранения.',
  },
  
  // ============================================================================
  // SPECIAL (Особые эффекты)
  // ============================================================================
  
  /**
   * Вампиризм
   * 
   * Обоснование из лора:
   * Техники могут поглощать Ци противника при ударе.
   */
  {
    id: 'special_leech',
    name: 'Вампиризм',
    nameEn: 'Life Leech',
    category: 'special',
    subcategory: 'modifier',
    valueType: 'percent',
    baseValue: 3,
    scalingPerLevel: 1,
    maxValue: 30,
    applicableTo: ['weapon', 'technique'],
    incompatibleWith: [],
    displayFormat: '+{value}% Вампиризм',
    minRarity: 'rare',
    weight: 25,
    loreReason: 'Техники вампиризма поглощают Ци противника при ударе и преобразуют её в HP практика.',
  },
  
  /**
   * Отбрасывание
   * 
   * Обоснование из лора (раздел 200):
   * "Ци в сверхкритическом состоянии (плазма) с плотностью жидкой Ци"
   * Выброс плазмы может отбросить противника.
   */
  {
    id: 'special_knockback',
    name: 'Отбрасывание',
    nameEn: 'Knockback',
    category: 'special',
    subcategory: 'modifier',
    valueType: 'flat',
    baseValue: 1,
    scalingPerLevel: 0.5,
    maxValue: 10,
    applicableTo: ['weapon', 'technique'],
    incompatibleWith: [],
    displayFormat: 'Отбрасывание: {value}м',
    minRarity: 'uncommon',
    weight: 40,
    loreReason: 'Раздел 200: Выброс плазменной Ци создаёт ударную волну, отбрасывающую противника.',
  },
  
  /**
   * Пробитие (игнорирование брони)
   * 
   * Обоснование из лора:
   * Сфокусированная Ци пробивает защиту.
   */
  {
    id: 'special_pierce',
    name: 'Пробитие',
    nameEn: 'Pierce',
    category: 'special',
    subcategory: 'modifier',
    valueType: 'percent',
    baseValue: 5,
    scalingPerLevel: 2,
    maxValue: 50,
    applicableTo: ['weapon', 'technique'],
    incompatibleWith: [],
    displayFormat: '+{value}% Пробитие брони',
    minRarity: 'uncommon',
    weight: 45,
    loreReason: 'Сфокусированная Ци пробивает защитные техники противника. Качество Ци определяет пробитие.',
  },
  
  /**
   * AoE (область действия)
   * 
   * Обоснование из лора:
   * Массивы Ци и техники могут поражать область.
   */
  {
    id: 'special_aoe',
    name: 'Область действия',
    nameEn: 'Area of Effect',
    category: 'special',
    subcategory: 'modifier',
    valueType: 'flat',
    baseValue: 1,
    scalingPerLevel: 0.5,
    maxValue: 20,
    applicableTo: ['technique'],
    incompatibleWith: [],
    displayFormat: 'AoE: {value}м радиус',
    minRarity: 'rare',
    weight: 30,
    loreReason: 'Массивы Ци и техники поражают область. Радиус = количество Ци × эффективность техники.',
  },
  
  // ============================================================================
  // UTILITY (Утилити)
  // ============================================================================
  
  /**
   * Скорость движения
   * 
   * Обоснование из лора (уровни культивации):
   * L2: "Может использовать Ци для лёгкого усиления мышц"
   * L4: "Может на короткое время парить"
   */
  {
    id: 'utility_move_speed',
    name: 'Скорость движения',
    nameEn: 'Move Speed',
    category: 'utility',
    subcategory: 'modifier',
    valueType: 'percent',
    baseValue: 2,
    scalingPerLevel: 1,
    maxValue: 50,
    applicableTo: ['armor', 'jewelry'],
    incompatibleWith: [],
    displayFormat: '+{value}% Скорость',
    minRarity: 'uncommon',
    weight: 50,
    loreReason: 'Уровни культивации L2: Ци усиливает мышцы ног. Украшения-усилители помогают направлять Ци.',
  },
  
  /**
   * Скрытность
   * 
   * Обоснование из лора (уровни культивации):
   * L6: "Может искажать локальное поле Ци (иллюзии, маскировка)"
   */
  {
    id: 'utility_stealth',
    name: 'Скрытность',
    nameEn: 'Stealth',
    category: 'utility',
    subcategory: 'modifier',
    valueType: 'percent',
    baseValue: 3,
    scalingPerLevel: 1,
    maxValue: 50,
    applicableTo: ['armor', 'jewelry'],
    incompatibleWith: [],
    displayFormat: '+{value}% Скрытность',
    minRarity: 'rare',
    weight: 30,
    loreReason: 'Уровни культивации L6: "Может искажать локальное поле Ци (иллюзии, маскировка)". Техники скрытности маскируют присутствие практика.',
  },
  
  /**
   * Восприятие
   * 
   * Обоснование из лора (контейнер 3):
   * L2: "Интуитивное чувство опасности (Ци реагирует на угрозы)"
   * L5: "Способен слушать Ци ландшафта"
   */
  {
    id: 'utility_perception',
    name: 'Восприятие',
    nameEn: 'Perception',
    category: 'utility',
    subcategory: 'modifier',
    valueType: 'percent',
    baseValue: 3,
    scalingPerLevel: 1,
    maxValue: 50,
    applicableTo: ['jewelry', 'artifact'],
    incompatibleWith: [],
    displayFormat: '+{value}% Восприятие',
    minRarity: 'uncommon',
    weight: 45,
    loreReason: 'Контейнер 3, L5: "Способен слушать Ци ландшафта". Украшения усиливают чувствительность к Ци.',
  },
];

// ============================================================================
// ФУНКЦИЯ ПОЛУЧЕНИЯ БОНУСОВ
// ============================================================================

/**
 * Получить все определения бонусов
 */
export function getAllBonusDefinitions(): BonusDefinition[] {
  return BONUS_DEFINITIONS;
}

/**
 * Получить бонус по ID
 */
export function getBonusDefinition(id: string): BonusDefinition | undefined {
  return BONUS_DEFINITIONS.find(b => b.id === id);
}

/**
 * Получить бонусы по категории
 */
export function getBonusesByCategory(category: BonusCategory): BonusDefinition[] {
  return BONUS_DEFINITIONS.filter(b => b.category === category);
}

/**
 * Получить бонусы для объекта
 */
export function getBonusesForTarget(target: ApplicableTarget): BonusDefinition[] {
  return BONUS_DEFINITIONS.filter(b => b.applicableTo.includes(target));
}

/**
 * Получить категории бонусов (без 'stat' и без 'qi' с проводимостью!)
 */
export function getBonusCategories(): BonusCategory[] {
  return ['combat', 'defense', 'qi_technique', 'elemental', 'condition', 'special', 'utility'];
}
