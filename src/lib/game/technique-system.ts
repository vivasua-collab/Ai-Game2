/**
 * Система техник и навыков
 * 
 * Техники хранятся в БД для повторного использования
 * LLM не создаёт одну технику дважды
 */

import type { Character } from "@/hooks/useGame";

// Типы техник
export type TechniqueType = 
  | "combat"      // Боевая техника
  | "cultivation" // Культивационная техника
  | "support"     // Вспомогательная техника
  | "movement"    // Техника передвижения
  | "sensory"     // Техника восприятия
  | "healing";    // Техника исцеления

// Редкость техник
export type TechniqueRarity = "common" | "uncommon" | "rare" | "legendary";

// Элемент техники
export type TechniqueElement = "fire" | "water" | "earth" | "air" | "void" | "neutral";

// Интерфейс техники
export interface Technique {
  id: string;
  name: string;
  description: string;
  type: TechniqueType;
  element: TechniqueElement;
  rarity: TechniqueRarity;
  
  // Требования
  minCultivationLevel: number;
  qiCost: number;
  fatigueCost: {
    physical: number;
    mental: number;
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
  
  // Коэффициенты mastery
  masteryProgress: number; // 0-100
  masteryBonus: number;    // множитель при 100% мастерства
  
  // Источник
  source: "learned" | "created" | "inherited";
  createdAt: Date;
}

// Результат использования техники
export interface TechniqueUseResult {
  success: boolean;
  qiSpent: number;
  fatigueGained: { physical: number; mental: number };
  effects: Technique["effects"];
  message: string;
  masteryGained: number;
}

// Проверка возможности использования техники
export function canUseTechnique(
  technique: Technique,
  character: Character
): { canUse: boolean; reason?: string } {
  // Проверка уровня
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
  
  // Проверка усталости (упрощённо - используем общую)
  if (character.fatigue >= 90) {
    return {
      canUse: false,
      reason: "Слишком высокая усталость для использования техники",
    };
  }
  
  return { canUse: true };
}

// Использование техники
export function useTechnique(
  technique: Technique,
  character: Character,
  targetLevel?: number // Уровень цели для боевых техник
): TechniqueUseResult {
  const check = canUseTechnique(technique, character);
  
  if (!check.canUse) {
    return {
      success: false,
      qiSpent: 0,
      fatigueGained: { physical: 0, mental: 0 },
      effects: {},
      message: check.reason || "Техника недоступна",
      masteryGained: 0,
    };
  }
  
  // Расчёт эффектов с учётом мастерства
  const masteryMultiplier = 1 + (technique.masteryProgress / 100) * technique.masteryBonus;
  const effects = { ...technique.effects };
  
  if (effects.damage) {
    effects.damage = Math.floor(effects.damage * masteryMultiplier);
  }
  if (effects.healing) {
    effects.healing = Math.floor(effects.healing * masteryMultiplier);
  }
  
  // Затраты
  const qiSpent = technique.qiCost;
  const fatigueGained = technique.fatigueCost;
  
  // Прирост мастерства (уменьшается с ростом мастерства)
  const masteryGained = Math.floor(1 * (1 - technique.masteryProgress / 100));
  
  return {
    success: true,
    qiSpent,
    fatigueGained,
    effects,
    message: `Использована техника: ${technique.name}`,
    masteryGained,
  };
}

// Создание новой техники (LLM создаёт, система валидирует)
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
  
  if (technique.minCultivationLevel !== undefined && (technique.minCultivationLevel < 1 || technique.minCultivationLevel > 9)) {
    errors.push("Уровень культивации должен быть от 1 до 9");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Генерация ID техники на основе имени (для поиска дубликатов)
export function generateTechniqueId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-я0-9]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

// Список базовых техник (предопределённые)
export const BASE_TECHNIQUES: Omit<Technique, "id" | "createdAt">[] = [
  {
    name: "Дыхание Ци",
    description: "Базовая техника накопления Ци",
    type: "cultivation",
    element: "neutral",
    rarity: "common",
    minCultivationLevel: 1,
    qiCost: 0,
    fatigueCost: { physical: 0.05, mental: 0.1 },
    effects: { qiRegen: 5 },
    masteryProgress: 0,
    masteryBonus: 0.5,
    source: "learned",
  },
  {
    name: "Усиленный удар",
    description: "Удар с использованием Ци",
    type: "combat",
    element: "neutral",
    rarity: "common",
    minCultivationLevel: 1,
    qiCost: 5,
    fatigueCost: { physical: 2, mental: 1 },
    effects: { damage: 15 },
    masteryProgress: 0,
    masteryBonus: 0.3,
    source: "learned",
  },
  {
    name: "Ментальный щит",
    description: "Защита от ментальных атак",
    type: "support",
    element: "neutral",
    rarity: "uncommon",
    minCultivationLevel: 2,
    qiCost: 10,
    fatigueCost: { physical: 0.5, mental: 3 },
    effects: { duration: 10 },
    masteryProgress: 0,
    masteryBonus: 0.4,
    source: "learned",
  },
  {
    name: "Скорость ветра",
    description: "Временное усиление скорости",
    type: "movement",
    element: "air",
    rarity: "uncommon",
    minCultivationLevel: 2,
    qiCost: 15,
    fatigueCost: { physical: 3, mental: 2 },
    effects: {
      duration: 5,
      statModifiers: { agility: 20 },
    },
    masteryProgress: 0,
    masteryBonus: 0.35,
    source: "learned",
  },
  {
    name: "Лечение Ци",
    description: "Восстановление здоровья с помощью Ци",
    type: "healing",
    element: "neutral",
    rarity: "rare",
    minCultivationLevel: 3,
    qiCost: 30,
    fatigueCost: { physical: 1, mental: 5 },
    effects: { healing: 25 },
    masteryProgress: 0,
    masteryBonus: 0.5,
    source: "learned",
  },
];
