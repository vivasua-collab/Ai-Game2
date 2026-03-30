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
import { 
  TechniqueGrade,
  TECHNIQUE_GRADE_ORDER,
  TECHNIQUE_GRADE_CONFIGS,
  RARITY_TO_TECHNIQUE_GRADE,
} from '@/types/grade';

// ============================================================================
// ИМПОРТ ТИПОВ ИЗ ЕДИНОГО ИСТОЧНИКА
// ============================================================================

import type {
  TechniqueType,
  CombatSubtype,
  TechniqueElement,
} from '@/types/technique-types';

// Реэкспорт для удобства потребителей
export type {
  TechniqueType,
  CombatSubtype,
  TechniqueElement,
} from '@/types/technique-types';

// Импорт из единого источника истины
import {
  QI_DENSITY_TABLE,
  calculateQiDensity,
  calculateTechniqueCapacity as calculateTechniqueCapacityNew,
  checkDestabilizationWithBaseQi,
  type TechniqueType as CapacityTechniqueType,
  type CombatSubtype as CapacityCombatSubtype,
} from '@/lib/constants/technique-capacity';

// ============================================
// ТИПЫ ТЕХНИК
// ============================================
// Типы TechniqueType, CombatSubtype, TechniqueElement импортированы из @/types/technique-types.ts

/**
 * Редкость техники (legacy)
 * @deprecated Использовать TechniqueGrade из @/types/grade
 */
export type TechniqueRarity = "common" | "uncommon" | "rare" | "legendary";

// ============================================
// СТРУКТУРНАЯ ЁМКОСТЬ ТЕХНИК (реэкспорт)
// ============================================

/**
 * @deprecated Использовать calculateTechniqueCapacity из '@/lib/constants/technique-capacity'
 * 
 * Эта функция оставлена для обратной совместимости.
 * Новая версия принимает type и combatSubtype.
 */
export function calculateTechniqueCapacity(
  techniqueLevel: number,
  mastery: number = 0
): number {
  // Защита от некорректных значений
  const level = Math.max(1, Math.min(9, techniqueLevel));
  const masteryValue = Math.max(0, Math.min(100, mastery));
  
  // Используем 'combat' как тип по умолчанию для совместимости
  const result = calculateTechniqueCapacityNew('combat', level, masteryValue);
  return result ?? 50 * Math.pow(2, level - 1);
}

/**
 * @deprecated Использовать checkDestabilizationWithBaseQi из '@/lib/constants/technique-capacity'
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
  const result = checkDestabilizationWithBaseQi(qiInput, 1, capacity);
  return {
    isDestabilized: result.isDestabilized,
    effectiveQi: result.effectiveQi,
    backlashDamage: result.backlashDamage ?? 0,
    efficiencyPercent: Math.floor(result.efficiency * 100),
  };
}

// Реэкспорт из единого источника
export { QI_DENSITY_TABLE, calculateQiDensity };
export { checkDestabilizationWithBaseQi } from '@/lib/constants/technique-capacity';

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
    gradeMult: number;
    elementMult: number;
    statMult: number;
    masteryMult: number;
    qiEffectiveness: number;
  };
}

// ============================================================================
// СИСТЕМА GRADE (МАТРЁШКА) - Новая унифицированная система
// ============================================================================

// Модификаторы элемента
// ⚠️ ВСЕ = 1.0 (базовый уровень)
// @see src/lib/constants/element-multipliers.ts
import { ELEMENT_DAMAGE_MULTIPLIER } from '@/lib/constants/element-multipliers';

// Локальный алиас для совместимости
const ELEMENT_DAMAGE_MULTIPLIERS = ELEMENT_DAMAGE_MULTIPLIER;

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
 * 5. Множители (grade, элемент, характеристики)
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
  
  // 5. Множители - используем Grade System
  // Приоритет: grade > rarity → grade mapping
  const grade = technique.grade ?? RARITY_TO_TECHNIQUE_GRADE[technique.rarity] ?? 'common';
  const gradeMult = TECHNIQUE_GRADE_CONFIGS[grade].damageMultiplier;
  const elementMult = ELEMENT_DAMAGE_MULTIPLIERS[technique.element] || 1.0;
  const statMult = calculateStatScaling(cultivator, technique.type);
  
  // 6. Бонус от мастерства (+50% при 100%)
  const masteryMult = 1 + (mastery / 100) * 0.5;
  
  // 7. Итоговый урон
  const baseDamage = technique.baseDamage;
  let finalDamage = Math.floor(
    baseDamage *
    (1 + qiEffectiveness) *  // Бонус от вложенного Ци
    gradeMult *
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
      gradeMult,
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

// CombatSubtype импортирован из @/types/technique-types.ts

export interface Technique {
  id: string;
  name: string;
  description: string;
  
  // Классификация
  type: TechniqueType;
  subtype?: CombatSubtype;           // Подтип для combat техник
  element: TechniqueElement;
  rarity: TechniqueRarity;
  /** Грейд техники (новая система Матрёшка) - заменит rarity */
  grade?: TechniqueGrade;
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
