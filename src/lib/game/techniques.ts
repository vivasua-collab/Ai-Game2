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
// ИНТЕРФЕЙСЫ ТЕХНИК
// ============================================

export interface Technique {
  id: string;
  name: string;
  description: string;
  
  // Классификация
  type: TechniqueType;
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
    statModifiers?: {
      strength?: number;
      agility?: number;
      intelligence?: number;
    };
  };
  
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
  let multiplier = 1.0;
  
  // Физические техники масштабируются от силы и ловкости
  if (technique.statScaling?.strength) {
    multiplier += (character.strength - 10) * technique.statScaling.strength;
  }
  if (technique.statScaling?.agility) {
    multiplier += (character.agility - 10) * technique.statScaling.agility;
  }
  
  // Техники Ци масштабируются от интеллекта и проводимости
  if (technique.statScaling?.intelligence) {
    multiplier += (character.intelligence - 10) * technique.statScaling.intelligence;
  }
  if (technique.statScaling?.conductivity) {
    multiplier += character.conductivity * technique.statScaling.conductivity;
  }
  
  // Бонус от мастерства (базовый бонус = 0.5 при 100% мастерства)
  const masteryBonus = 0.5; // Фиксированный бонус мастерства
  const masteryMultiplier = 1 + (mastery / 100) * masteryBonus;
  multiplier *= masteryMultiplier;
  
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
  const effectiveness = calculateTechniqueEffectiveness(technique, character);
  
  // Применяем эффективность к эффектам
  const effects = { ...technique.effects };
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
  const fatigueGained = technique.fatigueCost;
  
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
