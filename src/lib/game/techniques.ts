/**
 * Система активных техник
 * 
 * Техники - это активные способности, используемые практиком:
 * - Боевые: атаки и защита
 * - Культивационные: накопление и управление Ци
 * - Вспомогательные: баффы и дебаффы
 * - Передвижения: ускорение и телепортация
 * - Восприятия: обнаружение и анализ
 * - Исцеления: восстановление здоровья
 * 
 * Особенности:
 * - Каждая техника имеет уровень (1-9)
 * - Эффективность зависит от характеристик
 * - Мастерство растёт при использовании
 * - Структурная ёмкость ограничивает максимум Ци
 * 
 * Влияние характеристик:
 * - Сила/Ловкость → физические техники
 * - Интеллект/Проводимость → техники Ци
 */

import type { Character } from "@/types/game";

// ============================================
// ТИПЫ ТЕХНИК
// ============================================

export type TechniqueType = 
  | "combat"      // Боевая техника
  | "cultivation" // Культивационная техника
  | "support"     // Вспомогательная техника
  | "movement"    // Техника передвижения
  | "sensory"     // Техника восприятия
  | "healing";    // Техника исцеления

export type TechniqueRarity = "common" | "uncommon" | "rare" | "legendary";

export type TechniqueElement = "fire" | "water" | "earth" | "air" | "lightning" | "void" | "neutral";

// ============================================
// СТРУКТУРНАЯ ЁМКОСТЬ ТЕХНИК
// ============================================

/**
 * Расчёт структурной ёмкости техники
 * 
 * Максимум Ци, который техника может безопасно обработать.
 * Базовая формула: 50 × 2^(level-1)
 * Бонус от мастерства: +50% при 100%
 * 
 * @param techniqueLevel - Уровень техники (1-9)
 * @param mastery - Уровень мастерства (0-100)
 * @returns Ёмкость техники в единицах Ци
 */
export function calculateTechniqueCapacity(
  techniqueLevel: number,
  mastery: number = 0
): number {
  // Защита от некорректных значений
  const level = Math.max(1, Math.min(9, techniqueLevel));
  const masteryValue = Math.max(0, Math.min(100, mastery));
  
  // Базовая ёмкость: 50 × 2^(level-1)
  const baseCapacity = 50 * Math.pow(2, level - 1);
  
  // Бонус от мастерства: +50% при 100%
  const masteryBonus = 1 + (masteryValue / 100) * 0.5;
  
  return Math.floor(baseCapacity * masteryBonus);
}

/**
 * Проверка дестабилизации техники
 * 
 * При превышении ёмкости техники происходит дестабилизация:
 * - Эффективность снижается
 * - Излишек Ци наносит урон пользователю
 * 
 * @param qiInput - Вложенное Ци
 * @param capacity - Ёмкость техники
 * @returns Результат проверки с эффективным Ци и уроном
 */
export function checkDestabilization(
  qiInput: number,
  capacity: number
): {
  isDestabilized: boolean;
  effectiveQi: number;
  backlashDamage: number;
  efficiencyPercent: number;
} {
  const SAFE_MARGIN = 1.1; // 10% запас
  
  // Безопасное использование
  if (qiInput <= capacity) {
    return {
      isDestabilized: false,
      effectiveQi: qiInput,
      backlashDamage: 0,
      efficiencyPercent: 100,
    };
  }
  
  // В пределах безопасного запаса (до +10%)
  if (qiInput <= capacity * SAFE_MARGIN) {
    // Эффективность немного падает, но без урона
    const efficiency = 90 - (qiInput - capacity) / capacity * 100;
    return {
      isDestabilized: false,
      effectiveQi: capacity,
      backlashDamage: 0,
      efficiencyPercent: Math.max(80, efficiency),
    };
  }
  
  // Дестабилизация!
  const excess = qiInput - capacity;
  const excessPercent = excess / capacity;
  
  // Эффективность падает с перевыполнением
  const efficiency = Math.max(50, 100 - excessPercent * 50);
  
  // 50% излишка = урон себе
  const backlashDamage = Math.floor(excess * 0.5);
  
  return {
    isDestabilized: true,
    effectiveQi: capacity, // Только ёмкость используется эффективно
    backlashDamage,
    efficiencyPercent: efficiency,
  };
}

/**
 * Расчёт качества Ци культиватора
 * 
 * qiDensity = 2^(cultivationLevel - 1)
 * 
 * Качество Ци определяет эффективность техник:
 * - L1: qiDensity = 1 (базовое качество)
 * - L5: qiDensity = 16 (в 16 раз эффективнее)
 * - L9: qiDensity = 256 (максимальное качество)
 * 
 * @param cultivationLevel - Уровень культивации (1-9)
 * @returns Плотность/качество Ци
 */
export function calculateQiDensity(cultivationLevel: number): number {
  const level = Math.max(1, Math.min(9, cultivationLevel));
  return Math.pow(2, level - 1);
}

/**
 * Таблица качества Ци по уровню (для справки)
 */
export const QI_DENSITY_TABLE: Record<number, number> = {
  1: 1, 2: 2, 3: 4, 4: 8, 5: 16,
  6: 32, 7: 64, 8: 128, 9: 256,
};

// ============================================
// ПОЛНЫЙ РАСЧЁТ УРОНА ТЕХНИКИ
// ============================================

/**
 * Параметры для расчёта урона техники
 */
export interface TechniqueDamageParams {
  technique: {
    level: number;
    baseDamage: number;
    baseCapacity: number;
    element: TechniqueElement;
    rarity: TechniqueRarity;
    type: TechniqueType;
  };
  cultivator: {
    cultivationLevel: number;
    strength: number;
    agility: number;
    intelligence: number;
    conductivity: number;
  };
  mastery: number;  // 0-100%
  qiInput: number;  // Сколько Ци вложено
}

/**
 * Результат расчёта урона
 */
export interface TechniqueDamageResult {
  damage: number;
  effectiveQi: number;
  qiDensity: number;
  capacity: number;
  isDestabilized: boolean;
  backlashDamage: number;
  efficiencyPercent: number;
  breakdown: {
    baseDamage: number;
    rarityMult: number;
    elementMult: number;
    statMult: number;
    masteryMult: number;
    qiEffectiveness: number;
  };
}

// Модификаторы редкости
const RARITY_DAMAGE_MULTIPLIERS: Record<TechniqueRarity, number> = {
  common: 0.8,
  uncommon: 1.0,
  rare: 1.25,
  legendary: 1.6,
};

// Модификаторы элемента (упрощённые)
const ELEMENT_DAMAGE_MULTIPLIERS: Record<TechniqueElement, number> = {
  fire: 1.15,
  water: 1.0,
  earth: 1.25,
  air: 0.9,
  lightning: 1.3,
  void: 1.5,
  neutral: 1.0,
};

/**
 * Расчёт масштабирования от характеристик
 */
export function calculateStatScaling(
  cultivator: TechniqueDamageParams['cultivator'],
  techniqueType: TechniqueType
): number {
  let mult = 1.0;
  
  // Базовое масштабирование от проводимости
  mult += (cultivator.conductivity / 100) * 0.3;
  
  // Тип-специфичное масштабирование
  switch (techniqueType) {
    case 'combat':
      // Боевые техники масштабируются от силы и ловкости
      mult += (cultivator.strength / 10) * 0.05;
      mult += (cultivator.agility / 10) * 0.025;
      break;
    case 'cultivation':
      // Культивационные - от интеллекта и проводимости
      mult += (cultivator.intelligence / 10) * 0.05;
      mult += (cultivator.conductivity / 10) * 0.05;
      break;
    case 'healing':
      // Исцеление - от интеллекта
      mult += (cultivator.intelligence / 10) * 0.05;
      break;
    case 'movement':
      // Передвижение - от ловкости
      mult += (cultivator.agility / 10) * 0.05;
      break;
    case 'sensory':
      // Восприятие - от интеллекта
      mult += (cultivator.intelligence / 10) * 0.04;
      break;
    case 'support':
      // Поддержка - от интеллекта и проводимости
      mult += (cultivator.intelligence / 10) * 0.03;
      mult += (cultivator.conductivity / 10) * 0.03;
      break;
  }
  
  return mult;
}

/**
 * Полный расчёт урона техники
 * 
 * Иерархия расчёта:
 * 1. Структурная ёмкость (лимит Ци)
 * 2. Эффективное Ци (с ограничением)
 * 3. Качество Ци культиватора
 * 4. Базовая эффективность
 * 5. Множители (редкость, элемент, характеристики)
 * 6. Бонус мастерства
 * 7. Дестабилизация
 */
export function calculateTechniqueDamage(
  params: TechniqueDamageParams
): TechniqueDamageResult {
  const { technique, cultivator, mastery, qiInput } = params;
  
  // 1. Структурная ёмкость техники (с учётом мастерства)
  const capacity = calculateTechniqueCapacity(technique.level, mastery);
  
  // 2. Эффективное Ци и проверка дестабилизации
  const { isDestabilized, effectiveQi, backlashDamage, efficiencyPercent } = 
    checkDestabilization(qiInput, capacity);
  
  // 3. Качество Ци культиватора
  const qiDensity = calculateQiDensity(cultivator.cultivationLevel);
  
  // 4. Базовая эффективность: effectiveQi × qiDensity
  const qiEffectiveness = (effectiveQi * qiDensity) / 100; // Нормализация
  
  // 5. Множители
  const rarityMult = RARITY_DAMAGE_MULTIPLIERS[technique.rarity] || 1.0;
  const elementMult = ELEMENT_DAMAGE_MULTIPLIERS[technique.element] || 1.0;
  const statMult = calculateStatScaling(cultivator, technique.type);
  
  // 6. Бонус от мастерства (+50% при 100%)
  const masteryMult = 1 + (mastery / 100) * 0.5;
  
  // 7. Итоговый урон
  const baseDamage = technique.baseDamage;
  let finalDamage = Math.floor(
    baseDamage *
    (1 + qiEffectiveness) *  // Бонус от вложенного Ци
    rarityMult *
    elementMult *
    statMult *
    masteryMult *
    (efficiencyPercent / 100)  // Штраф при дестабилизации
  );
  
  // Минимальный урон
  finalDamage = Math.max(1, finalDamage);
  
  return {
    damage: finalDamage,
    effectiveQi,
    qiDensity,
    capacity,
    isDestabilized,
    backlashDamage,
    efficiencyPercent,
    breakdown: {
      baseDamage,
      rarityMult,
      elementMult,
      statMult,
      masteryMult,
      qiEffectiveness,
    },
  };
}

// ============================================
// ИНТЕРФЕЙСЫ ТЕХНИК
// ============================================

// Подтипы combat-техник
export type CombatSubtype = 
  | "melee_strike"       // Удар телом (руки/ноги)
  | "melee_weapon"       // Удар оружием
  | "ranged_projectile"  // Снаряд
  | "ranged_beam"        // Луч
  | "ranged_aoe";        // По площади

export interface Technique {
  id: string;
  name: string;
  description: string;
  
  // Классификация
  type: TechniqueType;
  subtype?: CombatSubtype;           // Подтип для combat техник
  element: TechniqueElement;
  rarity: TechniqueRarity;
  level: number;                    // НОВОЕ: уровень техники (1-9)
  
  // Требования
  minCultivationLevel: number;
  qiCost: number;
  fatigueCost: {
    physical: number;
    mental: number;
  };
  
  // Требования к характеристикам (для изучения)
  statRequirements?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  };
  
  // Масштабирование от характеристик
  statScaling?: {
    strength?: number;      // +X% эффекта за единицу силы
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  };
  
  // Эффекты
  effects: {
    damage?: number;
    healing?: number;
    qiRegen?: number;
    duration?: number; // в минутах
    range?: number;    // дальность в метрах
    statModifiers?: {
      strength?: number;
      agility?: number;
      intelligence?: number;
    };
  };
  
  // Дополнительные поля для combat техник
  weaponType?: string;           // Тип оружия (для melee_weapon)
  damageFalloff?: {              // Затухание урона (для ranged)
    fullDamage: number;
    halfDamage: number;
    max: number;
  };
  isRangedQi?: boolean;          // Дальний удар Ци (для легендарных weapon)
  
  // Мастерство
  masteryProgress: number; // 0-100
  masteryBonus: number;    // множитель при 100% мастерства
  
  // Источник получения
  source: "preset" | "npc" | "scroll" | "insight" | "created";
  createdAt: Date;
}

// Результат использования техники
export interface TechniqueUseResult {
  success: boolean;
  qiSpent: number;
  fatigueGained: { physical: number; mental: number };
  effects: Technique["effects"];
  effectiveness: number;  // Итоговая эффективность (с учётом характеристик)
  message: string;
  masteryGained: number;
}

// ============================================
// ФУНКЦИИ РАСЧЁТА ЭФФЕКТИВНОСТИ
// ============================================

/**
 * Расчёт эффективности техники от характеристик персонажа
 * @param technique - техника
 * @param character - персонаж
 * @param mastery - мастерство (0-100) из CharacterTechnique
 */
export function calculateTechniqueEffectiveness(
  technique: Technique,
  character: Character,
  mastery: number = 0
): number {
  // Защита от null/undefined
  if (!technique || !character) {
    return 1.0;
  }
  
  let multiplier = 1.0;
  
  // Физические техники масштабируются от силы и ловкости
  const strScaling = technique.statScaling?.strength;
  if (strScaling && typeof strScaling === 'number' && character.strength != null) {
    multiplier += (character.strength - 10) * strScaling;
  }
  
  const agiScaling = technique.statScaling?.agility;
  if (agiScaling && typeof agiScaling === 'number' && character.agility != null) {
    multiplier += (character.agility - 10) * agiScaling;
  }
  
  // Техники Ци масштабируются от интеллекта и проводимости
  const intScaling = technique.statScaling?.intelligence;
  if (intScaling && typeof intScaling === 'number' && character.intelligence != null) {
    multiplier += (character.intelligence - 10) * intScaling;
  }
  
  const conScaling = technique.statScaling?.conductivity;
  if (conScaling && typeof conScaling === 'number' && character.conductivity != null) {
    multiplier += character.conductivity * conScaling;
  }
  
  // Бонус от мастерства (базовый бонус = 0.5 при 100% мастерства)
  const safeMastery = typeof mastery === 'number' && !isNaN(mastery) ? mastery : 0;
  const masteryBonus = 0.5; // Фиксированный бонус мастерства
  const masteryMultiplier = 1 + (safeMastery / 100) * masteryBonus;
  multiplier *= masteryMultiplier;
  
  // Защита от NaN
  if (isNaN(multiplier) || !isFinite(multiplier)) {
    return 1.0;
  }
  
  return Math.max(0.1, multiplier); // Минимум 10% эффективности
}

/**
 * Проверка возможности использования техники
 */
export function canUseTechnique(
  technique: Technique,
  character: Character
): { canUse: boolean; reason?: string } {
  // Проверка уровня культивации
  if (character.cultivationLevel < technique.minCultivationLevel) {
    return {
      canUse: false,
      reason: `Требуется уровень культивации ${technique.minCultivationLevel}`,
    };
  }
  
  // Проверка Ци
  if (character.currentQi < technique.qiCost) {
    return {
      canUse: false,
      reason: `Недостаточно Ци. Нужно: ${technique.qiCost}, есть: ${character.currentQi}`,
    };
  }
  
  // Проверка усталости
  if (character.fatigue >= 90) {
    return {
      canUse: false,
      reason: "Слишком высокая физическая усталость для использования техники",
    };
  }
  if (character.mentalFatigue >= 90) {
    return {
      canUse: false,
      reason: "Слишком высокая ментальная усталость для использования техники",
    };
  }
  
  return { canUse: true };
}

/**
 * Проверка возможности изучения техники
 */
export function canLearnTechnique(
  technique: Technique,
  character: Character
): { canLearn: boolean; reason?: string } {
  // Проверка уровня культивации
  if (character.cultivationLevel < technique.minCultivationLevel) {
    return {
      canLearn: false,
      reason: `Требуется уровень культивации ${technique.minCultivationLevel}`,
    };
  }
  
  // Проверка требований к характеристикам
  if (technique.statRequirements) {
    if (technique.statRequirements.strength && character.strength < technique.statRequirements.strength) {
      return { canLearn: false, reason: `Требуется сила: ${technique.statRequirements.strength}` };
    }
    if (technique.statRequirements.agility && character.agility < technique.statRequirements.agility) {
      return { canLearn: false, reason: `Требуется ловкость: ${technique.statRequirements.agility}` };
    }
    if (technique.statRequirements.intelligence && character.intelligence < technique.statRequirements.intelligence) {
      return { canLearn: false, reason: `Требуется интеллект: ${technique.statRequirements.intelligence}` };
    }
    if (technique.statRequirements.conductivity && character.conductivity < technique.statRequirements.conductivity) {
      return { canLearn: false, reason: `Требуется проводимость: ${technique.statRequirements.conductivity}` };
    }
  }
  
  return { canLearn: true };
}

/**
 * Использование техники
 */
export function useTechnique(
  technique: Technique,
  character: Character,
  targetLevel?: number
): TechniqueUseResult {
  const check = canUseTechnique(technique, character);
  
  if (!check.canUse) {
    return {
      success: false,
      qiSpent: 0,
      fatigueGained: { physical: 0, mental: 0 },
      effects: {},
      effectiveness: 0,
      message: check.reason || "Техника недоступна",
      masteryGained: 0,
    };
  }
  
  // Расчёт эффективности с учётом характеристик
  const effectiveness = calculateTechniqueEffectiveness(technique, character, technique.masteryProgress);
  
  // Применяем эффективность к эффектам
  const effects = technique.effects ? { ...technique.effects } : {};
  if (effects.damage) {
    effects.damage = Math.floor(effects.damage * effectiveness);
  }
  if (effects.healing) {
    effects.healing = Math.floor(effects.healing * effectiveness);
  }
  if (effects.qiRegen) {
    effects.qiRegen = Math.floor(effects.qiRegen * effectiveness);
  }
  
  // Затраты
  const qiSpent = technique.qiCost;
  const fatigueGained = technique.fatigueCost || { physical: 0, mental: 0 };
  
  // Прирост мастерства (уменьшается с ростом мастерства)
  const masteryGained = Math.max(0.1, 1 * (1 - technique.masteryProgress / 100));
  
  return {
    success: true,
    qiSpent,
    fatigueGained,
    effects,
    effectiveness,
    message: `Использована техника: ${technique.name} (эффективность: ${Math.round(effectiveness * 100)}%)`,
    masteryGained,
  };
}

/**
 * Валидация новой техники
 */
export function validateNewTechnique(
  technique: Partial<Technique>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!technique.name || technique.name.length < 3) {
    errors.push("Имя техники должно содержать минимум 3 символа");
  }
  
  if (!technique.type) {
    errors.push("Не указан тип техники");
  }
  
  if (technique.qiCost !== undefined && technique.qiCost < 0) {
    errors.push("Стоимость Ци не может быть отрицательной");
  }
  
  if (technique.level !== undefined && (technique.level < 1 || technique.level > 9)) {
    errors.push("Уровень техники должен быть от 1 до 9");
  }
  
  if (technique.minCultivationLevel !== undefined && (technique.minCultivationLevel < 1 || technique.minCultivationLevel > 9)) {
    errors.push("Уровень культивации должен быть от 1 до 9");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Генерация ID техники на основе имени
 */
export function generateTechniqueId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-я0-9]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

// ============================================
// БАЗОВЫЕ ТЕХНИКИ (будут перенесены в пресеты)
// ============================================

export const BASE_TECHNIQUES: Omit<Technique, "id" | "createdAt">[] = [
  {
    name: "Дыхание Ци",
    description: "Базовая техника накопления Ци",
    type: "cultivation",
    element: "neutral",
    rarity: "common",
    level: 1,
    minCultivationLevel: 1,
    qiCost: 0,
    fatigueCost: { physical: 0.05, mental: 0.1 },
    statScaling: {
      intelligence: 0.02,  // +2% за каждую единицу интеллекта выше 10
      conductivity: 0.1,   // +10% за каждую единицу проводимости
    },
    effects: { qiRegen: 5 },
    masteryProgress: 0,
    masteryBonus: 0.5,
    source: "preset",
  },
  {
    name: "Усиленный удар",
    description: "Удар с использованием Ци",
    type: "combat",
    element: "neutral",
    rarity: "common",
    level: 1,
    minCultivationLevel: 1,
    qiCost: 5,
    fatigueCost: { physical: 2, mental: 1 },
    statRequirements: { strength: 8 },
    statScaling: {
      strength: 0.05,      // +5% урона за каждую единицу силы выше 10
    },
    effects: { damage: 15 },
    masteryProgress: 0,
    masteryBonus: 0.3,
    source: "preset",
  },
  {
    name: "Ментальный щит",
    description: "Защита от ментальных атак",
    type: "support",
    element: "neutral",
    rarity: "uncommon",
    level: 2,
    minCultivationLevel: 2,
    qiCost: 10,
    fatigueCost: { physical: 0.5, mental: 3 },
    statRequirements: { intelligence: 12 },
    statScaling: {
      intelligence: 0.03,
      conductivity: 0.05,
    },
    effects: { duration: 10 },
    masteryProgress: 0,
    masteryBonus: 0.4,
    source: "preset",
  },
  {
    name: "Скорость ветра",
    description: "Временное усиление скорости",
    type: "movement",
    element: "air",
    rarity: "uncommon",
    level: 2,
    minCultivationLevel: 2,
    qiCost: 15,
    fatigueCost: { physical: 3, mental: 2 },
    statRequirements: { agility: 12 },
    statScaling: {
      agility: 0.04,
    },
    effects: {
      duration: 5,
      statModifiers: { agility: 20 },
    },
    masteryProgress: 0,
    masteryBonus: 0.35,
    source: "preset",
  },
  {
    name: "Лечение Ци",
    description: "Восстановление здоровья с помощью Ци",
    type: "healing",
    element: "neutral",
    rarity: "rare",
    level: 3,
    minCultivationLevel: 3,
    qiCost: 30,
    fatigueCost: { physical: 1, mental: 5 },
    statRequirements: { intelligence: 14, conductivity: 0.5 },
    statScaling: {
      intelligence: 0.03,
      conductivity: 0.1,
    },
    effects: { healing: 25 },
    masteryProgress: 0,
    masteryBonus: 0.5,
    source: "preset",
  },
];
