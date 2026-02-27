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
 * 
 * Распределение по уровням:
 * - Уровень 1: 1024 техники
 * - Уровень 2: 512 техник
 * - Уровень N: 1024 / 2^(N-1)
 * - Итого: ~2046 техник
 */

// ==================== ТИПЫ ====================

export type TechniqueType = 
  | "combat" 
  | "cultivation" 
  | "support" 
  | "movement" 
  | "sensory" 
  | "healing";

export type CombatTechniqueType = 
  | "melee_strike" 
  | "melee_weapon" 
  | "ranged_projectile" 
  | "ranged_beam" 
  | "ranged_aoe" 
  | "defense_block" 
  | "defense_shield" 
  | "defense_dodge";

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
 * Модификаторы техники (флаги + значения)
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
  combatType?: CombatTechniqueType;
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
    cultivation: ['Дыхание', 'Поток', 'Накопление', 'Концентрация', 'Медитация'],
    support: ['Барьер', 'Щит', 'Усиление', 'Защита', 'Стена'],
    movement: ['Шаг', 'Рывок', 'Смещение', 'Прыжок', 'Побег'],
    sensory: ['Взгляд', 'Чутьё', 'Восприятие', 'Обнаружение', 'Анализ'],
    healing: ['Исцеление', 'Восстановление', 'Регенерация', 'Обновление'],
  },
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

// ==================== ГЕНЕРАЦИЯ ====================

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

function generateModifiers(base: BaseTechnique, rng: () => number): TechniqueModifiers {
  const modifiers: TechniqueModifiers = {
    effects: {},
    effectValues: {},
    penalties: {},
    bonuses: {},
  };
  
  const numModifiers = 1 + Math.floor(rng() * Math.min(3, base.level));
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

// ==================== ЭКСПОРТИРУЕМЫЕ ФУНКЦИИ ====================

export function generateTechnique(
  id: string,
  type: TechniqueType,
  element: Element,
  level: number,
  seed?: number
): GeneratedTechnique {
  const actualSeed = seed ?? hashString(id);
  const rng = seededRandom(actualSeed);
  const baseValues = BASE_VALUES_BY_LEVEL[level] || BASE_VALUES_BY_LEVEL[1];
  const elementMult = ELEMENT_MULTIPLIERS[element];
  
  let combatType: CombatTechniqueType | undefined;
  if (type === 'combat') {
    const types: CombatTechniqueType[] = ['melee_strike', 'melee_weapon', 'ranged_projectile', 'ranged_beam', 'ranged_aoe', 'defense_block', 'defense_shield', 'defense_dodge'];
    combatType = types[Math.floor(rng() * types.length)];
  }
  
  const base: BaseTechnique = {
    id, name: '', nameEn: '', type, combatType, element, level,
    baseDamage: Math.floor(baseValues.damage * elementMult.damage),
    baseQiCost: Math.floor(baseValues.qiCost * elementMult.qiCost),
    baseRange: baseValues.range,
    baseDuration: baseValues.duration,
    minCultivationLevel: Math.max(1, level - 1),
  };
  
  const modifiers = generateModifiers(base, rng);
  const computed = computeFinalValues(base, modifiers);
  const { name, nameEn } = generateName(type, element, level, rng);
  
  const description = `${name} - техника ${type === 'combat' ? 'боевая' : type === 'cultivation' ? 'культивации' : type} уровня ${level}.`;
  const rarity: Rarity = level <= 2 ? 'common' : level <= 4 ? 'uncommon' : level <= 6 ? 'rare' : 'legendary';
  
  return {
    ...base, name, nameEn, description, rarity, modifiers, computed,
    meta: { seed: actualSeed, template: `${type}_${element}`, generatedAt: new Date().toISOString(), generatorVersion: '1.0.0' },
  };
}

export function generateTechniquesForLevel(level: number): GeneratedTechnique[] {
  const types: TechniqueType[] = ['combat', 'cultivation', 'support', 'movement', 'sensory', 'healing'];
  const elements: Element[] = ['fire', 'water', 'earth', 'air', 'lightning', 'void', 'neutral'];
  const count = Math.floor(1024 / Math.pow(2, level - 1));
  
  const techniques: GeneratedTechnique[] = [];
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const element = elements[i % elements.length];
    const id = `gen_${type}_${element}_l${level}_${i}`;
    techniques.push(generateTechnique(id, type, element, level));
  }
  
  return techniques;
}

export function generateAllTechniques(): GeneratedTechnique[] {
  const all: GeneratedTechnique[] = [];
  for (let level = 1; level <= 9; level++) {
    all.push(...generateTechniquesForLevel(level));
  }
  return all;
}

export function getTechniqueCountForLevel(level: number): number {
  return Math.floor(1024 / Math.pow(2, level - 1));
}

export function getTotalTechniqueCount(): number {
  let total = 0;
  for (let level = 1; level <= 9; level++) {
    total += getTechniqueCountForLevel(level);
  }
  return total;
}
