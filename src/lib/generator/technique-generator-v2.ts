/**
 * ============================================================================
 * ГЕНЕРАТОР ТЕХНИК V2
 * ============================================================================
 *
 * Ключевые принципы V2 (по документации technique-system-v2.md):
 *
 * 1. qiCost = baseCapacity(type) × 2^(level-1)
 *    - Затраты Ци зависят от типа техники и уровня
 *    - Для cultivation: qiCost = 0
 *
 * 2. capacity = baseCapacity × 2^(level-1) × masteryBonus
 *    - Ёмкость техники (максимальное Ци, которое можно обработать)
 *    - masteryBonus = 1 + (mastery / 100) × 0.5 (до +50% при 100% мастерства)
 *
 * 3. damage = capacity × gradeMult
 *    - Урон вычисляется ИЗ ёмкости
 *    - gradeMult: common=1.0, refined=1.2, perfect=1.4, transcendent=1.6
 *
 * Три слоя генерации:
 * - Слой 1: БАЗА (baseCapacity → qiCost, capacity)
 * - Слой 2: ГРЕЙД (множители урона, НЕ зависит от уровня)
 * - Слой 3: СПЕЦИАЛИЗАЦИЯ (подтипы, элементы, эффекты)
 *
 * @see docs/technique-system-v2.md
 * @see docs/matryoshka-architecture.md
 */

import {
  calculateQiCost,
  calculateDamage,
  GRADE_DAMAGE_MULTIPLIERS,
  GRADE_DISTRIBUTION,
  COMBAT_SUBTYPE_BASE_RANGE,
  TECHNIQUE_TIER,
  TECHNIQUE_COUNT_LIMITS,
  ELEMENTS,
  NAME_PARTS,
  GENERATOR_VERSION,
  type EffectTier,
} from './technique-generator-config-v2';

import {
  getBaseCapacity,
  calculateTechniqueCapacity,
  QI_DENSITY_TABLE,
} from '@/lib/constants/technique-capacity';

import {
  seededRandom,
  hashString,
} from './base-item-generator';

import {
  getPrefixForTechniqueType,
  type IdPrefix,
} from './id-config';

import {
  TechniqueGrade,
  TECHNIQUE_GRADE_ORDER,
  TECHNIQUE_GRADE_CONFIGS,
} from '@/types/grade';

import type {
  TechniqueType,
  CombatSubtype,
  DefenseSubtype,
  CurseSubtype,
  PoisonSubtype,
  TechniqueElement,
} from '@/types/technique-types';

import {
  getAllowedElements,
  isValidElementForType,
} from '@/types/technique-types';

// Реэкспорт типов
export type {
  TechniqueType,
  CombatSubtype,
  DefenseSubtype,
  CurseSubtype,
  PoisonSubtype,
  TechniqueElement,
  EffectTier,
};

// ==================== ТИПЫ ====================

/**
 * Параметры генерации V2
 */
export interface GenerationOptionsV2 {
  /** Уровень техники (1-9) */
  level?: number;
  /** Минимальный уровень */
  minLevel?: number;
  /** Максимальный уровень */
  maxLevel?: number;
  /** Типы техник */
  types?: TechniqueType[];
  /** Подтип для combat */
  combatSubtype?: CombatSubtype;
  /** Элементы */
  elements?: TechniqueElement[];
  /** Фиксированный Grade */
  grade?: TechniqueGrade;
  /** Количество техник */
  count?: number;
  /** Режим генерации */
  mode: 'replace' | 'append';
  /** Префикс ID */
  idPrefix?: string;
  /** Начальный счётчик */
  startCounter?: number;
  /** Seed для детерминированной генерации */
  seed?: number;
  /** Среда: test или production */
  environment?: 'test' | 'production';
}

/**
 * Результат генерации V2
 */
export interface GenerationResultV2 {
  success: boolean;
  generated: number;
  total: number;
  techniques: GeneratedTechniqueV2[];
  errors: string[];
  warnings: string[];
}

/**
 * Модификаторы техники V2
 */
export interface TechniqueModifiersV2 {
  effects: Record<string, boolean>;
  effectValues: Record<string, number | string>;
  penalties: Record<string, number>;
  bonuses: Record<string, number>;
}

/**
 * Сгенерированная техника V2
 */
export interface GeneratedTechniqueV2 {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type: TechniqueType;
  subtype?: CombatSubtype | DefenseSubtype | CurseSubtype | PoisonSubtype;
  element: TechniqueElement;
  level: number;
  grade: TechniqueGrade;
  /** Является ли техника Ultimate (пробивает +4 уровня) */
  isUltimate?: boolean;

  // Базовые параметры (Слой 1)
  /** Затраты Ци = baseCapacity × 2^(level-1) */
  qiCost: number;
  baseQiCost: number;
  /** Урон без Grade = capacity */
  baseDamage: number;
  baseRange: number;
  /** Базовая ёмкость типа техники */
  baseCapacity: number | null;

  // Вычисленные параметры
  computed: {
    finalDamage: number;
    finalQiCost: number;
    finalRange: number;
    formula: string;  // Формула расчёта для UI
    activeEffects: Array<{ type: string; value: number; duration?: number }>;
  };

  // Модификаторы
  modifiers: TechniqueModifiersV2;

  // Дополнительные поля
  weaponCategory?: string;
  weaponType?: string;
  damageFalloff?: {
    fullDamage: number;
    halfDamage: number;
    max: number;
  };
  isRangedQi?: boolean;

  // Требования
  minCultivationLevel: number;
  minLevel?: number;
  maxLevel?: number;
  fatigueCost?: { physical: number; mental: number };
  statRequirements?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  };

  // Метаданные
  meta: {
    seed: number;
    template: string;
    generatedAt: string;
    generatorVersion: string;
    tier: EffectTier;
  };
}

// ==================== УТИЛИТЫ ====================

/**
 * Взвешенный случайный выбор
 */
function weightedSelect<T extends { weight: number }>(
  items: T[],
  rng: () => number
): T | null {
  if (items.length === 0) return null;
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = rng() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

/**
 * Случайный выбор из массива
 */
function randomChoice<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Случайное число в диапазоне
 */
function randomRange(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

/**
 * Округление до N знаков
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ==================== ГЕНЕРАЦИЯ GRADE ====================

/**
 * Шанс генерации Ultimate-техники по Grade
 * Ultimate-техники получают 25% множитель вместо 5% для technique при Level Suppression
 */
const ULTIMATE_CHANCE_BY_GRADE: Record<TechniqueGrade, number> = {
  common: 0,
  refined: 0,
  perfect: 0,
  transcendent: 0.05,  // 5% шанс для Transcendent
};

/**
 * Множитель урона для Ultimate-техник
 */
const ULTIMATE_DAMAGE_MULTIPLIER = 1.3;

/**
 * Множитель стоимости Ци для Ultimate-техник
 */
const ULTIMATE_QI_COST_MULTIPLIER = 1.5;

/**
 * Выбор Grade по распределению
 */
function selectGrade(rng: () => number): TechniqueGrade {
  const roll = rng() * 100;
  let cumulative = 0;

  for (const grade of TECHNIQUE_GRADE_ORDER) {
    cumulative += GRADE_DISTRIBUTION[grade];
    if (roll <= cumulative) {
      return grade;
    }
  }

  return 'common';
}

// ==================== ГЕНЕРАЦИЯ ИМЁН ====================

/**
 * Генерация названия техники
 */
function generateName(
  type: TechniqueType,
  element: TechniqueElement,
  level: number,
  rng: () => number
): { name: string; nameEn: string } {
  const elementAdjs = NAME_PARTS.elements[element] || NAME_PARTS.elements.neutral;
  const nouns = NAME_PARTS.nouns[type] || NAME_PARTS.nouns.combat;

  const adj = randomChoice(elementAdjs, rng);
  const noun = randomChoice(nouns, rng);

  const patterns = [
    () => `${adj} ${noun}`,
    () => `${noun} ${adj.toLowerCase()}`,
  ];

  const name = patterns[Math.floor(rng() * patterns.length)]();
  const nameEn = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return { name, nameEn };
}

// ==================== ГЕНЕРАЦИЯ ЭФФЕКТОВ ====================

/**
 * Доступные эффекты по Tier
 */
const EFFECTS_BY_TIER: Record<EffectTier, string[]> = {
  1: [], // combat — нет эффектов
  2: ['shield', 'heal'], // defense, healing
  3: ['poison', 'debuff', 'slow'], // curse, poison
  4: ['buff', 'speed'], // support, movement, sensory
  5: ['qiRegen', 'efficiency'], // cultivation
};

/**
 * Генерация эффектов по Tier
 */
function generateEffects(
  tier: EffectTier,
  level: number,
  grade: TechniqueGrade,
  rng: () => number
): TechniqueModifiersV2 {
  const modifiers: TechniqueModifiersV2 = {
    effects: {},
    effectValues: {},
    penalties: {},
    bonuses: {},
  };

  // Tier 1 — нет эффектов
  if (tier === 1) {
    // Только бонусы от Grade
    const gradeIndex = TECHNIQUE_GRADE_ORDER.indexOf(grade);
    if (gradeIndex >= 1) {
      modifiers.bonuses.critChance = gradeIndex * 5;
    }
    if (gradeIndex >= 2) {
      modifiers.bonuses.critDamage = 1.5 + gradeIndex * 0.25;
    }
    if (gradeIndex >= 3) {
      modifiers.bonuses.piercePercent = gradeIndex * 10;
    }
    return modifiers;
  }

  // Количество эффектов от Grade
  const minEffects: Record<TechniqueGrade, number> = {
    common: 0,
    refined: 1,
    perfect: 2,
    transcendent: 3,
  };

  const maxEffects = TECHNIQUE_GRADE_CONFIGS[grade].maxEffects;
  const numEffects = minEffects[grade] + Math.floor(rng() * (maxEffects - minEffects[grade] + 1));

  const availableEffects = EFFECTS_BY_TIER[tier];
  if (availableEffects.length === 0) return modifiers;

  // Выбираем эффекты
  const selectedEffects: string[] = [];
  for (let i = 0; i < numEffects && availableEffects.length > 0; i++) {
    const effect = randomChoice(availableEffects, rng);
    if (!selectedEffects.includes(effect)) {
      selectedEffects.push(effect);
    }
  }

  // Применяем эффекты
  for (const effect of selectedEffects) {
    modifiers.effects[effect] = true;

    switch (effect) {
      case 'shield':
        modifiers.effectValues.shieldHP = Math.floor(20 + level * 10 + rng() * 30);
        modifiers.effectValues.shieldDuration = Math.floor(3 + rng() * 5);
        break;
      case 'heal':
        modifiers.effectValues.healAmount = Math.floor(10 + level * 5 + rng() * 20);
        break;
      case 'poison':
        modifiers.effectValues.poisonDamage = Math.floor(3 + level * 2 + rng() * 5);
        modifiers.effectValues.poisonDuration = Math.floor(2 + rng() * 4);
        break;
      case 'debuff':
        modifiers.effectValues.debuffStat = randomChoice(['strength', 'agility', 'intelligence'], rng);
        modifiers.effectValues.debuffAmount = Math.floor(5 + level * 2);
        modifiers.effectValues.debuffDuration = Math.floor(2 + rng() * 3);
        break;
      case 'slow':
        modifiers.effectValues.slowPercent = Math.floor(15 + level * 3 + rng() * 15);
        modifiers.effectValues.slowDuration = Math.floor(1 + rng() * 3);
        break;
      case 'buff':
        // ⚠️ ВАЖНО: Support баффы НЕ могут увеличивать физические характеристики!
        // Только временные модификаторы: damage_percent, crit_chance, crit_damage, resistance, speed, cooldown, pierce
        modifiers.effectValues.buffType = randomChoice(['damage_percent', 'crit_chance', 'crit_damage', 'speed', 'pierce'], rng);
        modifiers.effectValues.buffAmount = Math.floor(5 + level * 3);
        modifiers.effectValues.buffDuration = Math.floor(3 + rng() * 5);
        break;
      case 'speed':
        modifiers.effectValues.speedBonus = Math.floor(10 + level * 5 + rng() * 10);
        break;
      case 'qiRegen':
        modifiers.effectValues.qiRegenPercent = Math.floor(5 + level * 2);
        break;
      case 'efficiency':
        modifiers.effectValues.qiCostReduction = Math.floor(10 + level * 3);
        break;
    }
  }

  return modifiers;
}

// ==================== ОСНОВНАЯ ГЕНЕРАЦИЯ ====================

/**
 * Генерация одной техники V2
 */
export function generateTechniqueV2(options: {
  id: string;
  type: TechniqueType;
  element: TechniqueElement;
  level: number;
  seed: number;
  grade?: TechniqueGrade;
  combatSubtype?: CombatSubtype;
}): GeneratedTechniqueV2 {
  const { id, type, element, level, seed, grade: fixedGrade, combatSubtype } = options;
  const rng = seededRandom(seed);

  // === СЛОЙ 1: БАЗА ===
  // Получаем базовую ёмкость
  const baseCapacity = getBaseCapacity(type, combatSubtype);
  
  // qiCost = baseCapacity × 2^(level-1)
  // Для cultivation: qiCost = 0
  const baseQiCost = calculateQiCost(baseCapacity, level);
  
  // capacity = baseCapacity × 2^(level-1) × masteryBonus (mastery=0 при генерации)
  const capacity = calculateTechniqueCapacity(type, level, 0, combatSubtype);
  
  // baseDamage вычисляется ИЗ capacity (НЕ из qiCost!)
  // damage = capacity × gradeMult

  // === СЛОЙ 2: GRADE ===
  const grade = fixedGrade || selectGrade(rng);
  const gradeDamageMult = GRADE_DAMAGE_MULTIPLIERS[grade];
  const gradeIndex = TECHNIQUE_GRADE_ORDER.indexOf(grade);

  // === ULTIMATE-ГЕНЕРАЦИЯ ===
  // 5% шанс для transcendent grade стать Ultimate-техникой
  let isUltimate = false;
  const ultimateChance = ULTIMATE_CHANCE_BY_GRADE[grade];
  if (ultimateChance > 0 && rng() < ultimateChance) {
    isUltimate = true;
  }

  // === СЛОЙ 3: СПЕЦИАЛИЗАЦИЯ ===
  let baseRange = 5; // Базовая дальность

  // Для combat — выбираем подтип
  let actualSubtype = combatSubtype;
  if (type === 'combat') {
    if (!actualSubtype) {
      const subtypes: CombatSubtype[] = ['melee_strike', 'melee_weapon', 'ranged_projectile', 'ranged_beam', 'ranged_aoe'];
      actualSubtype = randomChoice(subtypes, rng);
    }
    baseRange = COMBAT_SUBTYPE_BASE_RANGE[actualSubtype];

    // Бонус дальности от Grade
    if (actualSubtype === 'melee_strike') {
      baseRange = 0.5 + gradeIndex * 0.1;
    }
  }

  // === ВАЛИДАЦИЯ СТИХИИ ===
  const validElement = isValidElementForType(type, element)
    ? element
    : getAllowedElements(type)[0];

  // === ВЫЧИСЛЕНИЕ УРОНА ===
  // baseDamage = capacity (урон без Grade)
  const baseDamage = capacity ?? 0;
  
  // finalDamage = capacity × gradeMult
  let finalDamage = 0;
  let formula = 'Пассивная техника';
  
  if (capacity !== null) {
    finalDamage = calculateDamage(capacity, gradeDamageMult);
    
    // Ultimate-техники имеют повышенный урон
    if (isUltimate) {
      finalDamage = Math.floor(finalDamage * ULTIMATE_DAMAGE_MULTIPLIER);
      formula = `${capacity} × ${gradeDamageMult} × ${ULTIMATE_DAMAGE_MULTIPLIER}(ult) = ${finalDamage}`;
    } else {
      formula = `${capacity} × ${gradeDamageMult} = ${finalDamage}`;
    }
  }

  // qiCost НЕ зависит от Grade, НО Ultimate-техники требуют больше Ци
  let finalQiCost = baseQiCost;
  if (isUltimate) {
    finalQiCost = Math.floor(baseQiCost * ULTIMATE_QI_COST_MULTIPLIER);
  }
  const finalRange = roundTo(baseRange, 1);

  // === ЭФФЕКТЫ ===
  const tier = TECHNIQUE_TIER[type];
  const modifiers = generateEffects(tier, level, grade, rng);

  // === АКТИВНЫЕ ЭФФЕКТЫ ===
  const activeEffects: Array<{ type: string; value: number; duration?: number }> = [];
  for (const [effect, active] of Object.entries(modifiers.effects)) {
    if (active) {
      const value = modifiers.effectValues[`${effect}Amount`] ||
                   modifiers.effectValues[`${effect}HP`] ||
                   modifiers.effectValues[`${effect}Damage`] ||
                   modifiers.effectValues[`${effect}Percent`] ||
                   0;
      const duration = modifiers.effectValues[`${effect}Duration`] as number | undefined;
      activeEffects.push({
        type: effect,
        value: typeof value === 'number' ? value : 0,
        duration,
      });
    }
  }

  // === НАЗВАНИЕ И ОПИСАНИЕ ===
  let { name, nameEn } = generateName(type, validElement, level, rng);
  
  // Ultimate-техники получают маркер в названии
  if (isUltimate) {
    name = `⚡ ${name}`;
    nameEn = `⚡ ${nameEn}`;
  }
  
  const description = `${name} — техника ${type === 'combat' ? actualSubtype : type} ` +
    `${validElement === 'neutral' ? '' : `элемента ${validElement} `}уровня ${level}. ` +
    `Grade: ${grade}.${isUltimate ? ' ULTIMATE!' : ''} Урон: ${finalDamage}. Дальность: ${finalRange}м.`;

  // === ТРЕБОВАНИЯ ===
  const minCultivationLevel = Math.max(1, level - 1);
  const statRequirements = {
    strength: type === 'combat' ? Math.floor(level * 3 + gradeIndex * 2) : undefined,
    agility: type === 'movement' ? Math.floor(level * 3 + gradeIndex * 2) : undefined,
    intelligence: ['cultivation', 'support', 'sensory'].includes(type)
      ? Math.floor(level * 3 + gradeIndex * 2)
      : undefined,
    conductivity: type === 'cultivation' ? Math.floor(level * 2 + gradeIndex) : undefined,
  };

  // Удаляем undefined значения
  const cleanStatRequirements: Record<string, number> = {};
  for (const [key, value] of Object.entries(statRequirements)) {
    if (value !== undefined) {
      cleanStatRequirements[key] = value;
    }
  }

  return {
    id,
    name,
    nameEn,
    description,
    type,
    subtype: actualSubtype,
    element: validElement,
    level,
    grade,
    isUltimate: isUltimate || undefined,
    qiCost: finalQiCost,
    baseQiCost,
    baseDamage,
    baseRange,
    baseCapacity,
    computed: {
      finalDamage,
      finalQiCost,
      finalRange,
      formula,
      activeEffects,
    },
    modifiers,
    minCultivationLevel,
    minLevel: Math.max(1, level - 1),
    maxLevel: Math.min(9, level + 1),
    fatigueCost: { physical: Math.floor(level * 0.5), mental: Math.floor(level * 0.3) },
    statRequirements: Object.keys(cleanStatRequirements).length > 0 ? cleanStatRequirements : undefined,
    meta: {
      seed,
      template: `${type}_${actualSubtype || 'base'}_${validElement}`,
      generatedAt: new Date().toISOString(),
      generatorVersion: GENERATOR_VERSION,
      tier,
    },
  };
}

// ==================== ПАКЕТНАЯ ГЕНЕРАЦИЯ ====================

/**
 * Генерация техник с опциями V2
 */
export function generateTechniquesWithOptionsV2(
  options: GenerationOptionsV2,
  generateId: (prefix: IdPrefix) => string
): GenerationResultV2 {
  const {
    level,
    minLevel = 1,
    maxLevel = 9,
    types,
    combatSubtype,
    elements,
    grade,
    count = 10,
    mode,
    seed = Date.now(),
  } = options;

  const techniques: GeneratedTechniqueV2[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const targetLevels = level ? [level] : Array.from({ length: maxLevel - minLevel + 1 }, (_, i) => minLevel + i);
  const targetTypes = types || (['combat', 'defense', 'cultivation', 'support', 'movement', 'sensory', 'healing', 'curse', 'poison'] as TechniqueType[]);
  const targetElements = elements || [...ELEMENTS];

  let generated = 0;
  let currentSeed = seed;

  for (const targetLevel of targetLevels) {
    for (const targetType of targetTypes) {
      // Для combat — генерируем по подтипам
      if (targetType === 'combat' && !combatSubtype) {
        const combatSubtypes: CombatSubtype[] = ['melee_strike', 'melee_weapon', 'ranged_projectile', 'ranged_beam', 'ranged_aoe'];
        for (const subtype of combatSubtypes) {
          const perSubtype = Math.ceil(count / combatSubtypes.length / targetLevels.length / targetElements.length);

          for (let i = 0; i < perSubtype && generated < count; i++) {
            const element = targetElements[generated % targetElements.length];
            const prefix = getPrefixForTechniqueType(targetType, subtype);
            const id = generateId(prefix);

            try {
              const technique = generateTechniqueV2({
                id,
                type: targetType,
                element,
                level: targetLevel,
                seed: currentSeed++,
                grade,
                combatSubtype: subtype,
              });
              techniques.push(technique);
              generated++;
            } catch (error) {
              errors.push(`Failed to generate ${id}: ${error}`);
            }
          }
        }
      } else {
        const perType = Math.ceil(count / targetTypes.length / targetLevels.length / targetElements.length);

        for (let i = 0; i < perType && generated < count; i++) {
          const element = targetElements[generated % targetElements.length];
          const prefix = getPrefixForTechniqueType(targetType, combatSubtype);
          const id = generateId(prefix);

          try {
            const technique = generateTechniqueV2({
              id,
              type: targetType,
              element,
              level: targetLevel,
              seed: currentSeed++,
              grade,
              combatSubtype,
            });
            techniques.push(technique);
            generated++;
          } catch (error) {
            errors.push(`Failed to generate ${id}: ${error}`);
          }
        }
      }
    }
  }

  return {
    success: errors.length === 0,
    generated: techniques.length,
    total: count,
    techniques,
    errors,
    warnings,
  };
}

/**
 * Генерация всех техник V2 (для тестовой среды)
 */
export function generateAllTechniquesV2(
  generateId: (prefix: IdPrefix) => string,
  environment: 'test' | 'production' = 'test'
): GeneratedTechniqueV2[] {
  const limits = TECHNIQUE_COUNT_LIMITS[environment];
  const techniques: GeneratedTechniqueV2[] = [];
  let seed = Date.now();

  // Combat типы
  const combatSubtypes: CombatSubtype[] = ['melee_strike', 'melee_weapon', 'ranged_projectile', 'ranged_beam', 'ranged_aoe'];

  for (const subtype of combatSubtypes) {
    const config = subtype.startsWith('ranged')
      ? limits.combat.ranged
      : subtype === 'melee_strike'
        ? limits.combat.melee_strike
        : limits.combat.melee_weapon;

    for (const level of config.levels) {
      for (let i = 0; i < config.perLevel; i++) {
        const element = ELEMENTS[(techniques.length) % ELEMENTS.length];
        const prefix = getPrefixForTechniqueType('combat', subtype);
        const id = generateId(prefix);

        techniques.push(generateTechniqueV2({
          id,
          type: 'combat',
          element,
          level,
          seed: seed++,
          combatSubtype: subtype,
        }));
      }
    }
  }

  // Другие типы
  const otherTypes: TechniqueType[] = ['defense', 'healing', 'support', 'movement', 'sensory', 'curse', 'poison', 'cultivation'];

  for (const type of otherTypes) {
    const config = limits[type];
    if (!config) continue;

    // Получаем допустимые стихии для типа
    const allowedElements = getAllowedElements(type);

    for (const level of config.levels) {
      for (let i = 0; i < config.perLevel; i++) {
        const element = allowedElements[(techniques.length) % allowedElements.length];
        const prefix = getPrefixForTechniqueType(type);
        const id = generateId(prefix);

        techniques.push(generateTechniqueV2({
          id,
          type,
          element,
          level,
          seed: seed++,
        }));
      }
    }
  }

  return techniques;
}

/**
 * Генерация техник для уровня V2
 */
export function generateTechniquesForLevelV2(
  level: number,
  generateId: (prefix: IdPrefix) => string
): GeneratedTechniqueV2[] {
  const techniques: GeneratedTechniqueV2[] = [];
  let seed = Date.now();

  const types: TechniqueType[] = ['combat', 'defense', 'cultivation', 'support', 'movement', 'sensory', 'healing', 'curse', 'poison'];

  for (const type of types) {
    // Получаем допустимые стихии для типа
    const allowedElements = getAllowedElements(type);
    
    if (type === 'combat') {
      const combatSubtypes: CombatSubtype[] = ['melee_strike', 'melee_weapon', 'ranged_projectile', 'ranged_beam', 'ranged_aoe'];
      for (const subtype of combatSubtypes) {
        for (let i = 0; i < 5; i++) {
          const element = allowedElements[(techniques.length) % allowedElements.length];
          const prefix = getPrefixForTechniqueType(type, subtype);
          const id = generateId(prefix);

          techniques.push(generateTechniqueV2({
            id,
            type,
            element,
            level,
            seed: seed++,
            combatSubtype: subtype,
          }));
        }
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const element = allowedElements[(techniques.length) % allowedElements.length];
        const prefix = getPrefixForTechniqueType(type);
        const id = generateId(prefix);

        techniques.push(generateTechniqueV2({
          id,
          type,
          element,
          level,
          seed: seed++,
        }));
      }
    }
  }

  return techniques;
}

/**
 * Статистика генерации V2
 */
export function getGenerationStatsV2(): {
  version: string;
  principles: string[];
  formulaBaseDamage: string;
  formulaQiCost: string;
  formulaCapacity: string;
} {
  return {
    version: GENERATOR_VERSION,
    principles: [
      'qiCost = baseCapacity(type) × 2^(level-1)',
      'capacity = baseCapacity × 2^(level-1) × masteryBonus',
      'damage = capacity × gradeMult',
      'Элементы валидируются по типу техники',
    ],
    formulaQiCost: 'qiCost = baseCapacity(type) × 2^(level-1)',
    formulaCapacity: 'capacity = baseCapacity × 2^(level-1) × (1 + mastery × 0.5%)',
    formulaBaseDamage: 'damage = capacity × gradeMult',
  };
}
