/**
 * ============================================================================
 * ОФФЛАЙН ГЕНЕРАТОР ТЕХНИК
 * ============================================================================
 * 
 * Процедурная генерация техник культивации без использования LLM.
 * 
 * Принципы:
 * - Base + Modifiers: базовый объект + флаги эффектов + значения
 * - Детерминированная генерация через seed
 * - Балансировка по формулам уровня
 * - Система ID с префиксами
 * 
 * Типы техник:
 * - combat (TC) - атакующие
 * - defense (DF) - защитные (вынесено из combat)
 * - curse (CR) - проклятия (новое)
 * - poison (PN) - отравления (новое)
 */

// ==================== ТИПЫ ====================

export type TechniqueType = 
  | "combat" 
  | "defense"      // НОВОЕ: вынесено из combat
  | "cultivation" 
  | "support" 
  | "movement" 
  | "sensory" 
  | "healing"
  | "curse"        // НОВОЕ
  | "poison";      // НОВОЕ

export type CombatSubtype = 
  | "melee_strike" 
  | "melee_weapon" 
  | "ranged_projectile" 
  | "ranged_beam" 
  | "ranged_aoe";

export type DefenseSubtype = 
  | "shield"       // Энергетический щит
  | "barrier"      // Стационарный барьер
  | "block"        // Активный блок
  | "dodge"        // Уклонение
  | "absorb"       // Поглощение урона
  | "reflect";     // Отражение урона

export type CurseSubtype = 
  | "combat"       // Боевое (секунды-минуты)
  | "ritual";      // Ритуальное (часы-месяцы)

export type PoisonSubtype = 
  | "body"         // Отравление тела
  | "qi";          // Отравление Ци

export type Element = 
  | "fire" 
  | "water" 
  | "earth" 
  | "air" 
  | "lightning" 
  | "void" 
  | "neutral";

export type Rarity = "common" | "uncommon" | "rare" | "legendary";

/**
 * Эффект проклятия
 */
export type CurseEffectType =
  | "weakness"       // Снижение силы
  | "slowness"       // Замедление
  | "blindness"      // Слепота
  | "silence"        // Блокировка техник
  | "confusion"      // Путаница
  | "fear"           // Страх
  | "exhaustion"     // Истощение
  | "qi_drain"       // Истощение Ци
  | "soul_burn"      // Жжение души (DoT)
  | "cultivation_block" // Блокировка культивации
  | "meridian_damage"   // Повреждение меридиан
  | "core_corruption"   // Разрушение ядра
  | "fate_binding"      // Связывание судьбы
  | "soul_seal";        // Печать души

/**
 * Способ доставки яда
 */
export type PoisonDeliveryType =
  | "ingestion"    // Употребление
  | "contact"      // Контакт
  | "injection"    // Инъекция
  | "inhalation"   // Вдыхание
  | "technique"    // Через технику
  | "contaminated_qi"; // Заражённая Ци

/**
 * Параметры генерации
 */
export interface GenerationOptions {
  level?: number;
  minLevel?: number;
  maxLevel?: number;
  types?: TechniqueType[];
  elements?: Element[];
  rarities?: Rarity[];
  count?: number;
  countPerLevel?: Record<number, number>;
  mode: 'replace' | 'append';
  idPrefix?: string;
  startCounter?: number;
  // Новые параметры
  rarity?: Rarity;  // Фиксированная редкость
  damageVariance?: { min: number; max: number };  // Разброс урона
  paramBounds?: {
    damageMin?: number;
    damageMax?: number;
    qiCostMin?: number;
    qiCostMax?: number;
    rangeMin?: number;
    rangeMax?: number;
  };
}

/**
 * Результат генерации
 */
export interface GenerationResult {
  success: boolean;
  generated: number;
  total: number;
  techniques: GeneratedTechnique[];
  errors: string[];
  warnings: string[];
}

/**
 * Модификаторы техники
 */
export interface TechniqueModifiers {
  effects: {
    burning?: boolean;
    freezing?: boolean;
    slow?: boolean;
    stun?: boolean;
    poison?: boolean;
    heal?: boolean;
    shield?: boolean;
    buff?: boolean;
    debuff?: boolean;
    leech?: boolean;
    aoe?: boolean;
    pierce?: boolean;
    knockback?: boolean;
  };
  
  effectValues: {
    burningDamage?: number;
    burningDuration?: number;
    freezingDuration?: number;
    slowPercent?: number;
    slowDuration?: number;
    stunDuration?: number;
    poisonDamage?: number;
    poisonDuration?: number;
    healAmount?: number;
    shieldHP?: number;
    shieldDuration?: number;
    buffStat?: string;
    buffAmount?: number;
    buffDuration?: number;
    debuffStat?: string;
    debuffAmount?: number;
    debuffDuration?: number;
    leechPercent?: number;
    aoeRadius?: number;
    piercePercent?: number;
    knockbackDistance?: number;
  };
  
  penalties: {
    selfDamage?: number;
    qiCostMultiplier?: number;
    healthCost?: number;
    cooldownMultiplier?: number;
    fatigueCost?: number;
    rangePenalty?: number;
  };
  
  bonuses: {
    damageMultiplier?: number;
    castSpeedMultiplier?: number;
    rangeMultiplier?: number;
    critChance?: number;
    critDamage?: number;
    efficiencyBonus?: number;
  };
}

/**
 * Базовая техника
 */
export interface BaseTechnique {
  id: string;
  name: string;
  nameEn: string;
  type: TechniqueType;
  subtype?: CombatSubtype | DefenseSubtype | CurseSubtype | PoisonSubtype;
  element: Element;
  level: number;
  baseDamage: number;
  baseQiCost: number;
  baseRange: number;
  baseDuration: number;
  minCultivationLevel: number;
  statRequirements?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  };
}

/**
 * Полная сгенерированная техника
 */
export interface GeneratedTechnique extends BaseTechnique {
  description: string;
  rarity: Rarity;
  modifiers: TechniqueModifiers;
  computed: {
    finalDamage: number;
    finalQiCost: number;
    finalRange: number;
    finalDuration: number;
    activeEffects: ActiveEffect[];
  };
  meta: {
    seed: number;
    template: string;
    generatedAt: string;
    generatorVersion: string;
  };
}

export interface ActiveEffect {
  type: string;
  value: number;
  duration?: number;
}

// ==================== КОНСТАНТЫ ====================

// Модификаторы редкости
const RARITY_MULTIPLIERS: Record<Rarity, {
  damageMult: number;
  qiCostMult: number;
  effectChanceMult: number;
  maxEffects: number;
  weight: number; // Вес для случайного выбора
}> = {
  common:     { damageMult: 0.8,  qiCostMult: 1.0,  effectChanceMult: 0.5,  maxEffects: 1, weight: 50 },
  uncommon:   { damageMult: 1.0,  qiCostMult: 0.95, effectChanceMult: 0.8,  maxEffects: 2, weight: 30 },
  rare:       { damageMult: 1.25, qiCostMult: 0.9,  effectChanceMult: 1.2,  maxEffects: 3, weight: 15 },
  legendary:  { damageMult: 1.6,  qiCostMult: 0.85, effectChanceMult: 1.5,  maxEffects: 4, weight: 5 },
};

// Разброс базового урона (в процентах от базового)
const DAMAGE_VARIANCE = {
  min: 0.7,   // -30% от базового
  max: 1.3,   // +30% от базового
};

const BASE_VALUES_BY_LEVEL: Record<number, {
  damage: number;
  qiCost: number;
  range: number;
  duration: number;
}> = {
  1: { damage: 15, qiCost: 10, range: 5, duration: 0 },
  2: { damage: 25, qiCost: 18, range: 10, duration: 2 },
  3: { damage: 40, qiCost: 30, range: 15, duration: 3 },
  4: { damage: 60, qiCost: 50, range: 20, duration: 4 },
  5: { damage: 90, qiCost: 80, range: 25, duration: 5 },
  6: { damage: 130, qiCost: 120, range: 30, duration: 6 },
  7: { damage: 185, qiCost: 180, range: 40, duration: 8 },
  8: { damage: 260, qiCost: 260, range: 50, duration: 10 },
  9: { damage: 350, qiCost: 400, range: 60, duration: 15 },
};

// Защитные техники имеют другие базовые значения
const DEFENSE_VALUES_BY_LEVEL: Record<number, {
  shieldHP: number;
  damageReduction: number;
  duration: number;
  qiCost: number;
}> = {
  1: { shieldHP: 20, damageReduction: 10, duration: 60, qiCost: 15 },
  2: { shieldHP: 40, damageReduction: 15, duration: 90, qiCost: 25 },
  3: { shieldHP: 70, damageReduction: 20, duration: 120, qiCost: 40 },
  4: { shieldHP: 100, damageReduction: 25, duration: 180, qiCost: 60 },
  5: { shieldHP: 150, damageReduction: 30, duration: 240, qiCost: 90 },
  6: { shieldHP: 220, damageReduction: 35, duration: 300, qiCost: 130 },
  7: { shieldHP: 300, damageReduction: 40, duration: 420, qiCost: 180 },
  8: { shieldHP: 400, damageReduction: 45, duration: 600, qiCost: 260 },
  9: { shieldHP: 550, damageReduction: 50, duration: 900, qiCost: 400 },
};

const ELEMENT_MULTIPLIERS: Record<Element, {
  damage: number;
  qiCost: number;
  effects: string[];
}> = {
  fire:    { damage: 1.15, qiCost: 1.0, effects: ['burning'] },
  water:   { damage: 1.0,  qiCost: 1.0, effects: ['freezing', 'slow'] },
  earth:   { damage: 1.25, qiCost: 1.1, effects: ['shield', 'knockback'] },
  air:     { damage: 0.9,  qiCost: 0.9, effects: ['knockback', 'slow'] },
  lightning: { damage: 1.3, qiCost: 1.2, effects: ['stun', 'pierce'] },
  void:    { damage: 1.5,  qiCost: 1.5, effects: ['pierce', 'leech', 'debuff'] },
  neutral: { damage: 1.0,  qiCost: 1.0, effects: [] },
};

const NAME_PARTS = {
  elements: {
    fire: ['Огненный', 'Пылающий', 'Раскалённый', 'Пожирающий', 'Вулканический'],
    water: ['Ледяной', 'Струящийся', 'Холодный', 'Морской', 'Штормовой'],
    earth: ['Каменный', 'Тяжёлый', 'Горный', 'Неизбежный', 'Титанический'],
    air: ['Стремительный', 'Вихревой', 'Невидимый', 'Порывистый', 'Штормовой'],
    lightning: ['Молниеносный', 'Искрящийся', 'Громовой', 'Ослепляющий', 'Статический'],
    void: ['Бесплотный', 'Теневой', 'Пустотный', 'Забвенный', 'Эфирный'],
    neutral: ['Истинный', 'Чистый', 'Сфокусированный', 'Концентрированный', 'Базовый'],
  },
  nouns: {
    combat: ['Удар', 'Кулак', 'Ладонь', 'Толчок', 'Взрыв', 'Волна', 'Клинок', 'Укол'],
    defense: ['Щит', 'Стена', 'Барьер', 'Броня', 'Купол', 'Защита', 'Печать'],
    cultivation: ['Дыхание', 'Поток', 'Накопление', 'Концентрация', 'Медитация'],
    support: ['Барьер', 'Усиление', 'Защита', 'Стена'],
    movement: ['Шаг', 'Рывок', 'Смещение', 'Прыжок', 'Побег'],
    sensory: ['Взгляд', 'Чутьё', 'Восприятие', 'Обнаружение', 'Анализ'],
    healing: ['Исцеление', 'Восстановление', 'Регенерация', 'Обновление'],
    curse: ['Проклятие', 'Скверна', 'Печать', 'Порча', 'Оковы', 'Метка'],
    poison: ['Яд', 'Токсин', 'Отрава', 'Губитель', 'Разрушитель'],
  },
};

// Маппинг типов для ID
const TYPE_ID_PREFIX: Record<TechniqueType, string> = {
  combat: 'TC',
  defense: 'DF',   // НОВОЕ
  cultivation: 'CU',
  support: 'SP',
  movement: 'MV',
  sensory: 'SN',
  healing: 'HL',
  curse: 'CR',     // НОВОЕ
  poison: 'PN',    // НОВОЕ
};

interface ModifierRule {
  effect: keyof TechniqueModifiers['effects'];
  minLevel: number;
  maxLevel: number;
  weight: number;
  incompatibleWith: string[];
  valueRange: { min: number; max: number };
}

const MODIFIER_RULES: ModifierRule[] = [
  { effect: 'burning', minLevel: 1, maxLevel: 9, weight: 15, incompatibleWith: ['freezing'], valueRange: { min: 2, max: 20 } },
  { effect: 'freezing', minLevel: 1, maxLevel: 9, weight: 10, incompatibleWith: ['burning'], valueRange: { min: 0.5, max: 2 } },
  { effect: 'slow', minLevel: 1, maxLevel: 9, weight: 12, incompatibleWith: [], valueRange: { min: 10, max: 40 } },
  { effect: 'stun', minLevel: 3, maxLevel: 9, weight: 5, incompatibleWith: [], valueRange: { min: 0.3, max: 1.5 } },
  { effect: 'poison', minLevel: 2, maxLevel: 9, weight: 8, incompatibleWith: [], valueRange: { min: 3, max: 15 } },
  { effect: 'heal', minLevel: 1, maxLevel: 9, weight: 10, incompatibleWith: [], valueRange: { min: 5, max: 50 } },
  { effect: 'shield', minLevel: 2, maxLevel: 9, weight: 8, incompatibleWith: [], valueRange: { min: 20, max: 100 } },
  { effect: 'buff', minLevel: 1, maxLevel: 9, weight: 10, incompatibleWith: ['debuff'], valueRange: { min: 5, max: 30 } },
  { effect: 'debuff', minLevel: 2, maxLevel: 9, weight: 8, incompatibleWith: ['buff'], valueRange: { min: 5, max: 25 } },
  { effect: 'leech', minLevel: 4, maxLevel: 9, weight: 4, incompatibleWith: [], valueRange: { min: 5, max: 20 } },
  { effect: 'aoe', minLevel: 2, maxLevel: 9, weight: 6, incompatibleWith: [], valueRange: { min: 2, max: 10 } },
  { effect: 'pierce', minLevel: 3, maxLevel: 9, weight: 5, incompatibleWith: [], valueRange: { min: 10, max: 40 } },
  { effect: 'knockback', minLevel: 2, maxLevel: 9, weight: 7, incompatibleWith: [], valueRange: { min: 1, max: 5 } },
];

// ==================== УТИЛИТЫ ====================

function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function weightedSelect<T extends { weight: number }>(items: T[], rng: () => number): T | null {
  if (items.length === 0) return null;
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = rng() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

// ==================== ГЕНЕРАЦИЯ НАЗВАНИЙ ====================

function generateName(type: TechniqueType, element: Element, level: number, rng: () => number): { name: string; nameEn: string } {
  const elementAdjs = NAME_PARTS.elements[element] || NAME_PARTS.elements.neutral;
  const nouns = NAME_PARTS.nouns[type] || NAME_PARTS.nouns.combat;
  
  const adj = elementAdjs[Math.floor(rng() * elementAdjs.length)];
  const noun = nouns[Math.floor(rng() * nouns.length)];
  
  const patterns = [
    () => `${adj} ${noun}`,
    () => `${noun} ${adj.toLowerCase()}`,
  ];
  
  const name = patterns[Math.floor(rng() * patterns.length)]();
  const nameEn = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  return { name, nameEn };
}

// ==================== ГЕНЕРАЦИЯ МОДИФИКАТОРОВ ====================

function generateModifiers(base: BaseTechnique, rng: () => number, rarity?: Rarity): TechniqueModifiers {
  const modifiers: TechniqueModifiers = {
    effects: {},
    effectValues: {},
    penalties: {},
    bonuses: {},
  };
  
  // Количество эффектов зависит от редкости
  // common: 0-1, uncommon: 1-2, rare: 2-3, legendary: 3-4
  const rarityMinEffects: Record<Rarity, number> = {
    common: 0,
    uncommon: 1,
    rare: 2,
    legendary: 3,
  };
  
  const maxEffects = rarity ? RARITY_MULTIPLIERS[rarity].maxEffects : 1;
  const minEffects = rarity ? rarityMinEffects[rarity] : 1;
  const numModifiers = minEffects + Math.floor(rng() * Math.min(maxEffects - minEffects + 1, base.level));
  const availableRules = MODIFIER_RULES.filter(rule => 
    base.level >= rule.minLevel && base.level <= rule.maxLevel
  );
  
  const selectedRules: ModifierRule[] = [];
  const usedEffects = new Set<string>();
  
  for (let i = 0; i < numModifiers && availableRules.length > 0; i++) {
    const compatible = availableRules.filter(rule => 
      !rule.incompatibleWith.some(inc => usedEffects.has(inc))
    );
    if (compatible.length === 0) break;
    
    const rule = weightedSelect(compatible, rng);
    if (rule) {
      selectedRules.push(rule);
      usedEffects.add(rule.effect);
    }
  }
  
  for (const rule of selectedRules) {
    modifiers.effects[rule.effect] = true;
    const value = rule.valueRange.min + rng() * (rule.valueRange.max - rule.valueRange.min);
    
    const mapping: Record<string, keyof TechniqueModifiers['effectValues']> = {
      burning: 'burningDamage', freezing: 'freezingDuration', slow: 'slowPercent',
      stun: 'stunDuration', poison: 'poisonDamage', heal: 'healAmount',
      shield: 'shieldHP', buff: 'buffAmount', debuff: 'debuffAmount',
      leech: 'leechPercent', aoe: 'aoeRadius', pierce: 'piercePercent',
      knockback: 'knockbackDistance',
    };
    
    const key = mapping[rule.effect];
    if (key) {
      (modifiers.effectValues as Record<string, number>)[key] = Math.round(value * 10) / 10;
    }
    
    if (rule.effect === 'burning') modifiers.effectValues.burningDuration = Math.floor(1 + rng() * 3);
    if (rule.effect === 'slow') modifiers.effectValues.slowDuration = Math.floor(1 + rng() * 3);
    if (rule.effect === 'poison') modifiers.effectValues.poisonDuration = Math.floor(2 + rng() * 3);
    if (rule.effect === 'buff' || rule.effect === 'debuff') {
      const stats = ['strength', 'agility', 'intelligence'];
      if (rule.effect === 'buff') {
        modifiers.effectValues.buffStat = stats[Math.floor(rng() * stats.length)];
        modifiers.effectValues.buffDuration = Math.floor(3 + rng() * 5);
      } else {
        modifiers.effectValues.debuffStat = stats[Math.floor(rng() * stats.length)];
        modifiers.effectValues.debuffDuration = Math.floor(2 + rng() * 3);
      }
    }
    if (rule.effect === 'shield') modifiers.effectValues.shieldDuration = Math.floor(3 + rng() * 5);
  }
  
  if (selectedRules.length >= 2 && rng() > 0.5) {
    modifiers.penalties.qiCostMultiplier = Math.round((1.1 + rng() * 0.2) * 100) / 100;
  }
  if (base.level >= 4 && rng() > 0.5) {
    modifiers.bonuses.damageMultiplier = Math.round((1.05 + rng() * 0.2) * 100) / 100;
  }
  
  return modifiers;
}

// ==================== ВЫЧИСЛЕНИЕ ФИНАЛЬНЫХ ЗНАЧЕНИЙ ====================

function computeFinalValues(base: BaseTechnique, modifiers: TechniqueModifiers): GeneratedTechnique['computed'] {
  let finalDamage = base.baseDamage;
  let finalQiCost = base.baseQiCost;
  let finalRange = base.baseRange;
  let finalDuration = base.baseDuration;
  
  if (modifiers.bonuses.damageMultiplier) finalDamage *= modifiers.bonuses.damageMultiplier;
  if (modifiers.penalties.qiCostMultiplier) finalQiCost *= modifiers.penalties.qiCostMultiplier;
  if (modifiers.effects.aoe) finalDamage *= 0.8;
  
  const activeEffects: ActiveEffect[] = [];
  for (const [effect, active] of Object.entries(modifiers.effects)) {
    if (active) {
      const valueKeys = Object.keys(modifiers.effectValues).filter(k => 
        k.toLowerCase().includes(effect.toLowerCase().substring(0, 4))
      );
      if (valueKeys.length > 0) {
        const effectValue = (modifiers.effectValues as Record<string, number | undefined>)[valueKeys[0]] || 0;
        activeEffects.push({
          type: effect,
          value: typeof effectValue === 'number' ? effectValue : 0,
        });
      }
    }
  }
  
  return {
    finalDamage: Math.floor(finalDamage),
    finalQiCost: Math.floor(finalQiCost),
    finalRange: Math.floor(finalRange),
    finalDuration: Math.floor(finalDuration),
    activeEffects,
  };
}

// ==================== ГЕНЕРАЦИЯ ПО ТИПАМ ====================

interface TechniqueGenParams {
  rarity?: Rarity;
  damageVariance?: { min: number; max: number };
  paramBounds?: GenerationOptions['paramBounds'];
}

function selectRarity(rng: () => number, forcedRarity?: Rarity): Rarity {
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

function applyDamageVariance(baseDamage: number, rng: () => number, variance?: { min: number; max: number }): number {
  const v = variance || DAMAGE_VARIANCE;
  const multiplier = v.min + rng() * (v.max - v.min);
  return Math.floor(baseDamage * multiplier);
}

function generateCombatTechnique(
  id: string,
  element: Element,
  level: number,
  seed: number,
  params?: TechniqueGenParams
): GeneratedTechnique {
  const rng = seededRandom(seed);
  const baseValues = BASE_VALUES_BY_LEVEL[level] || BASE_VALUES_BY_LEVEL[1];
  const elementMult = ELEMENT_MULTIPLIERS[element];
  
  // Выбор редкости
  const rarity = selectRarity(rng, params?.rarity);
  const rarityMult = RARITY_MULTIPLIERS[rarity];
  
  const subtypes: CombatSubtype[] = ['melee_strike', 'melee_weapon', 'ranged_projectile', 'ranged_beam', 'ranged_aoe'];
  const subtype = subtypes[Math.floor(rng() * subtypes.length)];
  
  // Базовый урон с разбросом и модификатором редкости
  let baseDamage = applyDamageVariance(
    baseValues.damage * elementMult.damage,
    rng,
    params?.damageVariance
  );
  baseDamage = Math.floor(baseDamage * rarityMult.damageMult);
  
  // Применение границ параметров
  if (params?.paramBounds) {
    const bounds = params.paramBounds;
    if (bounds.damageMin !== undefined) baseDamage = Math.max(baseDamage, bounds.damageMin);
    if (bounds.damageMax !== undefined) baseDamage = Math.min(baseDamage, bounds.damageMax);
  }
  
  let baseQiCost = Math.floor(baseValues.qiCost * elementMult.qiCost * rarityMult.qiCostMult);
  let baseRange = baseValues.range;
  
  if (params?.paramBounds) {
    const bounds = params.paramBounds;
    if (bounds.qiCostMin !== undefined) baseQiCost = Math.max(baseQiCost, bounds.qiCostMin);
    if (bounds.qiCostMax !== undefined) baseQiCost = Math.min(baseQiCost, bounds.qiCostMax);
    if (bounds.rangeMin !== undefined) baseRange = Math.max(baseRange, bounds.rangeMin);
    if (bounds.rangeMax !== undefined) baseRange = Math.min(baseRange, bounds.rangeMax);
  }
  
  const base: BaseTechnique = {
    id, name: '', nameEn: '', type: 'combat', subtype, element, level,
    baseDamage,
    baseQiCost,
    baseRange,
    baseDuration: baseValues.duration,
    minCultivationLevel: Math.max(1, level - 1),
  };
  
  const modifiers = generateModifiers(base, rng, rarity);
  const computed = computeFinalValues(base, modifiers);
  const { name, nameEn } = generateName('combat', element, level, rng);
  
  const description = `${name} — атакующая техника ${element === 'neutral' ? '' : `элемента ${element} `}уровня ${level}. ` +
    `Редкость: ${rarity}. Базовый урон: ${baseDamage}.`;
  
  return {
    ...base, name, nameEn, description, rarity, modifiers, computed,
    meta: { seed, template: `combat_${element}`, generatedAt: new Date().toISOString(), generatorVersion: '2.1.0' },
  };
}

function generateDefenseTechnique(
  id: string,
  element: Element,
  level: number,
  seed: number,
  params?: TechniqueGenParams
): GeneratedTechnique {
  const rng = seededRandom(seed);
  const defenseValues = DEFENSE_VALUES_BY_LEVEL[level] || DEFENSE_VALUES_BY_LEVEL[1];
  const elementMult = ELEMENT_MULTIPLIERS[element];
  
  const rarity = selectRarity(rng, params?.rarity);
  const rarityMult = RARITY_MULTIPLIERS[rarity];
  
  const subtypes: DefenseSubtype[] = ['shield', 'barrier', 'block', 'dodge', 'absorb', 'reflect'];
  const subtype = subtypes[Math.floor(rng() * subtypes.length)];
  
  const shieldHP = Math.floor(defenseValues.shieldHP * rarityMult.damageMult);
  
  const base: BaseTechnique = {
    id, name: '', nameEn: '', type: 'defense', subtype, element, level,
    baseDamage: 0,
    baseQiCost: Math.floor(defenseValues.qiCost * elementMult.qiCost * rarityMult.qiCostMult),
    baseRange: 0,
    baseDuration: defenseValues.duration,
    minCultivationLevel: Math.max(1, level - 1),
  };
  
  const modifiers: TechniqueModifiers = {
    effects: { shield: true },
    effectValues: { 
      shieldHP,
      shieldDuration: defenseValues.duration,
    },
    penalties: {},
    bonuses: {},
  };
  
  const computed = computeFinalValues(base, modifiers);
  const { name, nameEn } = generateName('defense', element, level, rng);
  
  const description = `${name} — защитная техника ${element === 'neutral' ? '' : `элемента ${element} `}уровня ${level}. ` +
    `Редкость: ${rarity}. Щит: ${shieldHP} HP на ${Math.floor(defenseValues.duration / 60)} мин.`;
  
  return {
    ...base, name, nameEn, description, rarity, modifiers, computed,
    meta: { seed, template: `defense_${element}`, generatedAt: new Date().toISOString(), generatorVersion: '2.1.0' },
  };
}

function generateSupportTechnique(
  id: string,
  element: Element,
  level: number,
  seed: number,
  params?: TechniqueGenParams
): GeneratedTechnique {
  const rng = seededRandom(seed);
  const baseValues = BASE_VALUES_BY_LEVEL[level] || BASE_VALUES_BY_LEVEL[1];
  
  const rarity = selectRarity(rng, params?.rarity);
  const rarityMult = RARITY_MULTIPLIERS[rarity];
  
  const base: BaseTechnique = {
    id, name: '', nameEn: '', type: 'support', element, level,
    baseDamage: 0,
    baseQiCost: Math.floor(baseValues.qiCost * 0.8 * rarityMult.qiCostMult),
    baseRange: 10,
    baseDuration: baseValues.duration * 2,
    minCultivationLevel: Math.max(1, level - 1),
  };
  
  const modifiers = generateModifiers(base, rng, rarity);
  modifiers.effects.buff = true;
  modifiers.effectValues.buffAmount = Math.floor((5 + level * 5) * rarityMult.damageMult);
  modifiers.effectValues.buffDuration = 3 + level * 2;
  
  const computed = computeFinalValues(base, modifiers);
  const { name, nameEn } = generateName('support', element, level, rng);
  
  const description = `${name} — техника поддержки уровня ${level}. Редкость: ${rarity}.`;
  
  return {
    ...base, name, nameEn, description, rarity, modifiers, computed,
    meta: { seed, template: `support_${element}`, generatedAt: new Date().toISOString(), generatorVersion: '2.1.0' },
  };
}

function generateHealingTechnique(
  id: string,
  element: Element,
  level: number,
  seed: number,
  params?: TechniqueGenParams
): GeneratedTechnique {
  const rng = seededRandom(seed);
  const baseValues = BASE_VALUES_BY_LEVEL[level] || BASE_VALUES_BY_LEVEL[1];
  
  const rarity = selectRarity(rng, params?.rarity);
  const rarityMult = RARITY_MULTIPLIERS[rarity];
  
  const base: BaseTechnique = {
    id, name: '', nameEn: '', type: 'healing', element, level,
    baseDamage: 0,
    baseQiCost: Math.floor(baseValues.qiCost * 1.2 * rarityMult.qiCostMult),
    baseRange: 5,
    baseDuration: baseValues.duration,
    minCultivationLevel: Math.max(1, level - 1),
  };
  
  const healAmount = Math.floor((10 + level * 15) * rarityMult.damageMult);
  const modifiers: TechniqueModifiers = {
    effects: { heal: true },
    effectValues: { healAmount },
    penalties: {},
    bonuses: {},
  };
  
  const computed = computeFinalValues(base, modifiers);
  const { name, nameEn } = generateName('healing', element, level, rng);
  
  const description = `${name} — техника исцеления уровня ${level}. Редкость: ${rarity}. Восстанавливает ${healAmount} HP.`;
  
  return {
    ...base, name, nameEn, description, rarity, modifiers, computed,
    meta: { seed, template: `healing_${element}`, generatedAt: new Date().toISOString(), generatorVersion: '2.1.0' },
  };
}

function generateMovementTechnique(
  id: string,
  element: Element,
  level: number,
  seed: number,
  params?: TechniqueGenParams
): GeneratedTechnique {
  const rng = seededRandom(seed);
  const baseValues = BASE_VALUES_BY_LEVEL[level] || BASE_VALUES_BY_LEVEL[1];
  
  const rarity = selectRarity(rng, params?.rarity);
  const rarityMult = RARITY_MULTIPLIERS[rarity];
  
  const base: BaseTechnique = {
    id, name: '', nameEn: '', type: 'movement', element, level,
    baseDamage: 0,
    baseQiCost: Math.floor(baseValues.qiCost * 0.6 * rarityMult.qiCostMult),
    baseRange: Math.floor((5 + level * 5) * rarityMult.damageMult),
    baseDuration: 0,
    minCultivationLevel: Math.max(1, level - 1),
  };
  
  const modifiers = generateModifiers(base, rng, rarity);
  const computed = computeFinalValues(base, modifiers);
  const { name, nameEn } = generateName('movement', element, level, rng);
  
  const description = `${name} — техника перемещения уровня ${level}. Редкость: ${rarity}. Дальность: ${base.baseRange}м.`;
  
  return {
    ...base, name, nameEn, description, rarity, modifiers, computed,
    meta: { seed, template: `movement_${element}`, generatedAt: new Date().toISOString(), generatorVersion: '2.1.0' },
  };
}

function generateSensoryTechnique(
  id: string,
  element: Element,
  level: number,
  seed: number,
  params?: TechniqueGenParams
): GeneratedTechnique {
  const rng = seededRandom(seed);
  const baseValues = BASE_VALUES_BY_LEVEL[level] || BASE_VALUES_BY_LEVEL[1];
  
  const rarity = selectRarity(rng, params?.rarity);
  const rarityMult = RARITY_MULTIPLIERS[rarity];
  
  const base: BaseTechnique = {
    id, name: '', nameEn: '', type: 'sensory', element, level,
    baseDamage: 0,
    baseQiCost: Math.floor(baseValues.qiCost * 0.5 * rarityMult.qiCostMult),
    baseRange: Math.floor((20 + level * 10) * rarityMult.damageMult),
    baseDuration: baseValues.duration * 3,
    minCultivationLevel: Math.max(1, level - 1),
  };
  
  const modifiers = generateModifiers(base, rng, rarity);
  const computed = computeFinalValues(base, modifiers);
  const { name, nameEn } = generateName('sensory', element, level, rng);
  
  const description = `${name} — техника восприятия уровня ${level}. Редкость: ${rarity}. Радиус: ${base.baseRange}м.`;
  
  return {
    ...base, name, nameEn, description, rarity, modifiers, computed,
    meta: { seed, template: `sensory_${element}`, generatedAt: new Date().toISOString(), generatorVersion: '2.1.0' },
  };
}

function generateCultivationTechnique(
  id: string,
  element: Element,
  level: number,
  seed: number,
  params?: TechniqueGenParams
): GeneratedTechnique {
  const rng = seededRandom(seed);
  
  const rarity = selectRarity(rng, params?.rarity);
  const rarityMult = RARITY_MULTIPLIERS[rarity];
  
  const qiRegenPercent = Math.floor((3 + level * 2) * rarityMult.damageMult);
  
  const base: BaseTechnique = {
    id, name: '', nameEn: '', type: 'cultivation', element, level,
    baseDamage: 0,
    baseQiCost: 0,
    baseRange: 0,
    baseDuration: 0,
    minCultivationLevel: level,
  };
  
  const modifiers: TechniqueModifiers = {
    effects: {},
    effectValues: {},
    penalties: {},
    bonuses: { efficiencyBonus: qiRegenPercent },
  };
  
  const computed = computeFinalValues(base, modifiers);
  const { name, nameEn } = generateName('cultivation', element, level, rng);
  
  const description = `${name} — техника культивации уровня ${level}. Редкость: ${rarity}. Увеличивает поглощение Ци на ${qiRegenPercent}%.`;
  
  return {
    ...base, name, nameEn, description, rarity, modifiers, computed,
    meta: { seed, template: `cultivation_${element}`, generatedAt: new Date().toISOString(), generatorVersion: '2.1.0' },
  };
}

// ==================== ГЕНЕРАЦИЯ ПРОКЛЯТИЙ ====================

const CURSE_EFFECTS_BY_LEVEL: Record<number, { effects: CurseEffectType[]; durationRange: [number, number]; qiCostRange: [number, number] }> = {
  1: { effects: ['weakness', 'slowness'], durationRange: [10, 30], qiCostRange: [20, 35] },
  2: { effects: ['weakness', 'slowness', 'exhaustion'], durationRange: [15, 45], qiCostRange: [30, 50] },
  3: { effects: ['silence', 'fear', 'exhaustion'], durationRange: [20, 60], qiCostRange: [40, 65] },
  4: { effects: ['silence', 'fear', 'qi_drain'], durationRange: [30, 90], qiCostRange: [55, 80] },
  5: { effects: ['soul_burn', 'qi_drain', 'confusion'], durationRange: [45, 120], qiCostRange: [70, 100] },
  6: { effects: ['soul_burn', 'meridian_damage'], durationRange: [60, 180], qiCostRange: [90, 130] },
  7: { effects: ['cultivation_block', 'meridian_damage'], durationRange: [90, 300], qiCostRange: [120, 170] },
  8: { effects: ['core_corruption', 'fate_binding'], durationRange: [180, 600], qiCostRange: [160, 220] },
  9: { effects: ['soul_seal', 'core_corruption'], durationRange: [300, 3600], qiCostRange: [200, 300] },
};

function generateCurseTechnique(
  id: string,
  element: Element,
  level: number,
  seed: number
): GeneratedTechnique {
  const rng = seededRandom(seed);
  const curseConfig = CURSE_EFFECTS_BY_LEVEL[level] || CURSE_EFFECTS_BY_LEVEL[1];
  
  // Определяем подтип (боевое или ритуальное)
  const subtype: CurseSubtype = level >= 5 && rng() > 0.6 ? 'ritual' : 'combat';
  
  // Выбираем эффект проклятия
  const effectIndex = Math.floor(rng() * curseConfig.effects.length);
  const curseEffect = curseConfig.effects[effectIndex];
  
  const duration = curseConfig.durationRange[0] + Math.floor(rng() * (curseConfig.durationRange[1] - curseConfig.durationRange[0]));
  const qiCost = curseConfig.qiCostRange[0] + Math.floor(rng() * (curseConfig.qiCostRange[1] - curseConfig.qiCostRange[0]));
  
  const base: BaseTechnique = {
    id, name: '', nameEn: '', type: 'curse', subtype, element, level,
    baseDamage: subtype === 'combat' ? 5 + level * 3 : 0,  // Боевые могут наносить урон
    baseQiCost: qiCost,
    baseRange: subtype === 'combat' ? 15 : 0,  // Ритуальные не имеют дальности
    baseDuration: duration,
    minCultivationLevel: level,
  };
  
  const modifiers: TechniqueModifiers = {
    effects: { debuff: true },
    effectValues: {
      debuffStat: curseEffect,
      debuffAmount: 10 + level * 5,
      debuffDuration: duration,
    },
    penalties: subtype === 'ritual' ? { qiCostMultiplier: 1.5 } : {},
    bonuses: {},
  };
  
  const computed = computeFinalValues(base, modifiers);
  const { name, nameEn } = generateName('curse', element, level, rng);
  
  const durationStr = duration < 60 ? `${duration} сек` : 
                       duration < 3600 ? `${Math.floor(duration / 60)} мин` : 
                       `${Math.floor(duration / 3600)} ч`;
  
  const description = `${name} — ${subtype === 'combat' ? 'боевое' : 'ритуальное'} проклятие уровня ${level}. ` +
    `Эффект: ${curseEffect}. Длительность: ${durationStr}.`;
  const rarity: Rarity = level <= 2 ? 'common' : level <= 4 ? 'uncommon' : level <= 6 ? 'rare' : 'legendary';
  
  return {
    ...base, name, nameEn, description, rarity, modifiers, computed,
    meta: { seed, template: `curse_${element}_${subtype}`, generatedAt: new Date().toISOString(), generatorVersion: '2.0.0' },
  };
}

// ==================== ГЕНЕРАЦИЯ ОТРАВЛЕНИЙ ====================

const POISON_STAGES = {
  body: [
    { onset: 15, duration: 30, effects: { fatigue: 20 } },
    { onset: 45, duration: 60, effects: { hpDamage: 5 } },
    { onset: 105, duration: 120, effects: { hpDamage: 15, paralysis: 20 } },
  ],
  qi: [
    { onset: 30, duration: 60, effects: { qiDrain: 5 } },
    { onset: 90, duration: 120, effects: { conductivityReduction: 20 } },
    { onset: 210, duration: 240, effects: { techniqueBlock: true } },
  ],
};

function generatePoisonTechnique(
  id: string,
  element: Element,
  level: number,
  seed: number
): GeneratedTechnique {
  const rng = seededRandom(seed);
  
  // Определяем подтип (тело или Ци)
  const subtype: PoisonSubtype = element === 'void' || level >= 4 ? 
    (rng() > 0.5 ? 'qi' : 'body') : 'body';
  
  const stages = POISON_STAGES[subtype];
  const stageIndex = Math.min(Math.floor(level / 3), stages.length - 1);
  const stage = stages[stageIndex];
  
  const deliveryTypes: PoisonDeliveryType[] = subtype === 'body' 
    ? ['ingestion', 'contact', 'inhalation']
    : ['technique', 'contaminated_qi'];
  const delivery = deliveryTypes[Math.floor(rng() * deliveryTypes.length)];
  
  const qiCost = 30 + level * 20;
  const totalDuration = stage.onset + stage.duration;
  
  const base: BaseTechnique = {
    id, name: '', nameEn: '', type: 'poison', subtype, element, level,
    baseDamage: subtype === 'body' ? stage.effects.hpDamage || 0 : 0,
    baseQiCost: qiCost,
    baseRange: delivery === 'technique' ? 10 : 0,
    baseDuration: totalDuration,
    minCultivationLevel: Math.max(1, level - 1),
  };
  
  const modifiers: TechniqueModifiers = {
    effects: { poison: true },
    effectValues: {
      poisonDamage: stage.effects.hpDamage || stage.effects.qiDrain || 0,
      poisonDuration: totalDuration,
    },
    penalties: {},
    bonuses: {},
  };
  
  const computed = computeFinalValues(base, modifiers);
  const { name, nameEn } = generateName('poison', element, level, rng);
  
  const description = `${name} — ${subtype === 'body' ? 'яд тела' : 'яд Ци'} уровня ${level}. ` +
    `Способ доставки: ${delivery}. Длительность: ${totalDuration} мин.`;
  const rarity: Rarity = level <= 2 ? 'common' : level <= 4 ? 'uncommon' : level <= 6 ? 'rare' : 'legendary';
  
  return {
    ...base, name, nameEn, description, rarity, modifiers, computed,
    meta: { seed, template: `poison_${element}_${subtype}`, generatedAt: new Date().toISOString(), generatorVersion: '2.0.0' },
  };
}

// ==================== ГЛАВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ ====================

/**
 * Генерация одной техники по типу
 */
export function generateTechnique(
  id: string,
  type: TechniqueType,
  element: Element,
  level: number,
  seed?: number,
  params?: TechniqueGenParams
): GeneratedTechnique {
  const actualSeed = seed ?? hashString(id);
  
  switch (type) {
    case 'combat':
      return generateCombatTechnique(id, element, level, actualSeed, params);
    case 'defense':
      return generateDefenseTechnique(id, element, level, actualSeed, params);
    case 'support':
      return generateSupportTechnique(id, element, level, actualSeed, params);
    case 'healing':
      return generateHealingTechnique(id, element, level, actualSeed, params);
    case 'movement':
      return generateMovementTechnique(id, element, level, actualSeed, params);
    case 'sensory':
      return generateSensoryTechnique(id, element, level, actualSeed, params);
    case 'cultivation':
      return generateCultivationTechnique(id, element, level, actualSeed, params);
    case 'curse':
      return generateCurseTechnique(id, element, level, actualSeed, params);
    case 'poison':
      return generatePoisonTechnique(id, element, level, actualSeed, params);
    default:
      return generateCombatTechnique(id, element, level, actualSeed, params);
  }
}

/**
 * Генерация техник для уровня
 */
export function generateTechniquesForLevel(level: number, idCounter?: { current: number }): GeneratedTechnique[] {
  // Распределение типов техник по уровню
  const typesByLevel: Record<number, TechniqueType[]> = {
    1: ['combat', 'defense', 'cultivation', 'support', 'movement', 'sensory', 'healing'],
    2: ['combat', 'defense', 'cultivation', 'support', 'movement', 'sensory', 'healing', 'curse'],
    3: ['combat', 'defense', 'cultivation', 'support', 'curse', 'poison'],
    4: ['combat', 'defense', 'cultivation', 'curse', 'poison'],
    5: ['combat', 'defense', 'cultivation', 'curse', 'poison'],
    6: ['combat', 'defense', 'cultivation', 'curse', 'poison'],
    7: ['combat', 'defense', 'cultivation', 'curse'],
    8: ['combat', 'defense', 'cultivation', 'curse'],
    9: ['combat', 'defense', 'cultivation', 'curse'],
  };
  
  const elements: Element[] = ['fire', 'water', 'earth', 'air', 'lightning', 'void', 'neutral'];
  const count = Math.floor(10000 / Math.pow(2, level - 1)); // До ~20000 техник
  
  const techniques: GeneratedTechnique[] = [];
  const counter = idCounter || { current: 0 };
  
  const types = typesByLevel[level] || typesByLevel[1];
  
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const element = elements[i % elements.length];
    const prefix = TYPE_ID_PREFIX[type];
    const id = `${prefix}_${(counter.current + i + 1).toString().padStart(6, '0')}`;
    techniques.push(generateTechnique(id, type, element, level));
  }
  
  if (idCounter) {
    idCounter.current += count;
  }
  
  return techniques;
}

/**
 * Генерация всех техник
 */
export function generateAllTechniques(): GeneratedTechnique[] {
  const all: GeneratedTechnique[] = [];
  const counter = { current: 0 };
  
  for (let level = 1; level <= 9; level++) {
    all.push(...generateTechniquesForLevel(level, counter));
  }
  return all;
}

/**
 * Генерация с расширенными опциями
 */
export function generateTechniquesWithOptions(options: GenerationOptions, idGenerator?: (prefix: string) => string): GenerationResult {
  const techniques: GeneratedTechnique[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const levels: number[] = [];
    if (options.level) {
      levels.push(options.level);
    } else if (options.countPerLevel) {
      levels.push(...Object.keys(options.countPerLevel).map(Number));
    } else {
      const minL = options.minLevel ?? 1;
      const maxL = options.maxLevel ?? 9;
      for (let l = minL; l <= maxL; l++) {
        levels.push(l);
      }
    }
    
    const types: TechniqueType[] = options.types?.length 
      ? options.types 
      : ['combat', 'defense', 'cultivation', 'support', 'movement', 'sensory', 'healing', 'curse', 'poison'];
    
    const elements: Element[] = options.elements?.length
      ? options.elements
      : ['fire', 'water', 'earth', 'air', 'lightning', 'void', 'neutral'];
    
    let generated = 0;
    const maxGenerate = options.count ?? 10000;
    
    for (const level of levels) {
      const levelCount = options.countPerLevel?.[level] 
        ?? Math.floor(10000 / Math.pow(2, level - 1));
      
      const actualCount = Math.min(levelCount, maxGenerate - generated);
      
      for (let i = 0; i < actualCount && generated < maxGenerate; i++) {
        const type = types[i % types.length];
        const element = elements[(i + level) % elements.length];
        
        const prefix = TYPE_ID_PREFIX[type];
        const id = idGenerator 
          ? idGenerator(prefix)
          : `${prefix}_${(generated + 1).toString().padStart(6, '0')}`;
        
        // Передаём параметры редкости и границ
        const params: TechniqueGenParams = {
          rarity: options.rarity,
          damageVariance: options.damageVariance,
          paramBounds: options.paramBounds,
        };
        
        const technique = generateTechnique(id, type, element, level, undefined, params);
        
        // Фильтрация по редкости (если не задана фиксированная)
        if (options.rarities?.length && !options.rarities.includes(technique.rarity)) {
          continue;
        }
        
        techniques.push(technique);
        generated++;
      }
    }
    
    if (techniques.length === 0) {
      warnings.push('Не сгенерировано ни одной техники. Проверьте параметры фильтрации.');
    }
    
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Неизвестная ошибка');
  }
  
  return {
    success: errors.length === 0,
    generated: techniques.length,
    total: techniques.length,
    techniques,
    errors,
    warnings,
  };
}

/**
 * Количество техник по уровню
 * Базовое значение 10000 для уровня 1, уменьшается в 2 раза за каждый уровень
 * Это позволяет генерировать до ~20000 техник
 */
export function getTechniqueCountForLevel(level: number): number {
  return Math.floor(10000 / Math.pow(2, level - 1));
}

/**
 * Общее количество техник
 */
export function getTotalTechniqueCount(): number {
  let total = 0;
  for (let level = 1; level <= 9; level++) {
    total += getTechniqueCountForLevel(level);
  }
  return total;
}

/**
 * Получить статистику генерации
 */
export function getGenerationStats() {
  return {
    totalPossible: getTotalTechniqueCount(),
    byLevel: Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [i + 1, getTechniqueCountForLevel(i + 1)])
    ),
    types: ['combat', 'defense', 'cultivation', 'support', 'movement', 'sensory', 'healing', 'curse', 'poison'] as TechniqueType[],
    elements: ['fire', 'water', 'earth', 'air', 'lightning', 'void', 'neutral'] as Element[],
    rarities: ['common', 'uncommon', 'rare', 'legendary'] as Rarity[],
  };
}

// ==================== УБОРЩИК ДУБЛИКАТОВ ====================

/**
 * Создаёт ключ уникальности для техники на основе её параметров
 */
function createTechniqueSignature(technique: GeneratedTechnique): string {
  const parts: string[] = [
    technique.type,
    technique.subtype || 'none',
    technique.element,
    technique.rarity,
    String(technique.level),
    String(technique.baseDamage),
    String(technique.baseQiCost),
    String(technique.baseRange),
    String(technique.baseDuration),
  ];
  
  // Добавляем эффекты
  const effects = Object.entries(technique.modifiers.effects)
    .filter(([_, active]) => active)
    .map(([name]) => name)
    .sort()
    .join(',');
  parts.push(effects);
  
  // Добавляем значения эффектов
  const effectValues = Object.entries(technique.modifiers.effectValues)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}:${Math.floor(Number(value) * 10) / 10}`)
    .sort()
    .join('|');
  parts.push(effectValues);
  
  return parts.join('|');
}

/**
 * Результат уборки дубликатов
 */
export interface GarbageCollectionResult {
  original: number;
  unique: number;
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
 * Убирает дубликаты техник (техники с одинаковыми параметрами)
 * Оставляет первую технику из группы дубликатов
 */
export function removeDuplicateTechniques(
  techniques: GeneratedTechnique[]
): GarbageCollectionResult {
  const signatureMap = new Map<string, GeneratedTechnique[]>();
  
  // Группируем по сигнатуре
  for (const technique of techniques) {
    const signature = createTechniqueSignature(technique);
    if (!signatureMap.has(signature)) {
      signatureMap.set(signature, []);
    }
    signatureMap.get(signature)!.push(technique);
  }
  
  const uniqueTechniques: GeneratedTechnique[] = [];
  const removedIds: string[] = [];
  const duplicateGroups: GarbageCollectionResult['duplicateGroups'] = [];
  
  for (const [signature, group] of signatureMap) {
    // Сортируем по ID для детерминированности
    group.sort((a, b) => a.id.localeCompare(b.id));
    
    // Оставляем первую технику
    const [kept, ...duplicates] = group;
    uniqueTechniques.push(kept);
    
    if (duplicates.length > 0) {
      const removedGroupIds = duplicates.map(t => t.id);
      removedIds.push(...removedGroupIds);
      
      duplicateGroups.push({
        signature: signature.substring(0, 100) + '...', // Сокращаем для читаемости
        count: group.length,
        keptId: kept.id,
        removedIds: removedGroupIds,
      });
    }
  }
  
  return {
    original: techniques.length,
    unique: uniqueTechniques.length,
    duplicates: techniques.length - uniqueTechniques.length,
    removedIds,
    duplicateGroups,
  };
}

/**
 * Сравнивает две техники на идентичность параметров
 */
export function areTechniquesIdentical(
  a: GeneratedTechnique,
  b: GeneratedTechnique
): boolean {
  return createTechniqueSignature(a) === createTechniqueSignature(b);
}

/**
 * Находит похожие техники (с похожими, но не идентичными параметрами)
 */
export function findSimilarTechniques(
  techniques: GeneratedTechnique[],
  threshold: number = 0.9
): Array<{ technique: GeneratedTechnique; similar: GeneratedTechnique[]; similarity: number }> {
  const results: Array<{ technique: GeneratedTechnique; similar: GeneratedTechnique[]; similarity: number }> = [];
  
  for (let i = 0; i < techniques.length; i++) {
    const similar: GeneratedTechnique[] = [];
    let maxSimilarity = 0;
    
    for (let j = 0; j < techniques.length; j++) {
      if (i === j) continue;
      
      const similarity = calculateTechniqueSimilarity(techniques[i], techniques[j]);
      if (similarity >= threshold) {
        similar.push(techniques[j]);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }
    
    if (similar.length > 0) {
      results.push({
        technique: techniques[i],
        similar,
        similarity: maxSimilarity,
      });
    }
  }
  
  return results;
}

/**
 * Вычисляет степень похожести двух техник (0-1)
 */
function calculateTechniqueSimilarity(a: GeneratedTechnique, b: GeneratedTechnique): number {
  let score = 0;
  let total = 0;
  
  // Тип (вес 2)
  if (a.type === b.type) score += 2;
  total += 2;
  
  // Подтип (вес 1)
  if (a.subtype === b.subtype) score += 1;
  total += 1;
  
  // Элемент (вес 1)
  if (a.element === b.element) score += 1;
  total += 1;
  
  // Редкость (вес 1)
  if (a.rarity === b.rarity) score += 1;
  total += 1;
  
  // Уровень (вес 1)
  if (a.level === b.level) score += 1;
  total += 1;
  
  // Числовые параметры (вес 2)
  const numericSimilarity = calculateNumericSimilarity(
    [a.baseDamage, a.baseQiCost, a.baseRange, a.baseDuration],
    [b.baseDamage, b.baseQiCost, b.baseRange, b.baseDuration]
  );
  score += numericSimilarity * 2;
  total += 2;
  
  // Эффекты (вес 2)
  const effectsA = Object.keys(a.modifiers.effects).filter(k => a.modifiers.effects[k as keyof typeof a.modifiers.effects]);
  const effectsB = Object.keys(b.modifiers.effects).filter(k => b.modifiers.effects[k as keyof typeof b.modifiers.effects]);
  const effectSimilarity = calculateSetSimilarity(new Set(effectsA), new Set(effectsB));
  score += effectSimilarity * 2;
  total += 2;
  
  return score / total;
}

/**
 * Вычисляет сходство числовых массивов
 */
function calculateNumericSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  if (a.length === 0) return 1;
  
  let totalDiff = 0;
  for (let i = 0; i < a.length; i++) {
    const maxVal = Math.max(Math.abs(a[i]), Math.abs(b[i]), 1);
    const diff = Math.abs(a[i] - b[i]) / maxVal;
    totalDiff += diff;
  }
  
  return Math.max(0, 1 - totalDiff / a.length);
}

/**
 * Вычисляет сходство множеств (коэффициент Жаккара)
 */
function calculateSetSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  
  return intersection.size / union.size;
}
