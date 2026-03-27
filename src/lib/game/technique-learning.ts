/**
 * Система обучения техникам
 * 
 * Способы изучения:
 * 1. Автоматически из пресета (при создании персонажа)
 * 2. Обучение у NPC (в секте)
 * 3. Изучение свитков (предметы)
 * 4. Прозрение (аккумулятор Понимания Ци)
 * 
 * Механики:
 * - Прогресс изучения (0-100%)
 * - Штраф за уровень техники выше персонажа
 * - Требования к характеристикам
 */

import type { Character } from "@/types/game";

// ============================================
// КОНСТАНТЫ ОБУЧЕНИЯ
// ============================================

/**
 * Скорость обучения (% в час) по источникам
 */
export const LEARNING_RATES = {
  /** Из пресета (мгновенно) */
  preset: 100,
  
  /** Обучение у NPC */
  npc: 10,  // 10% в час
  
  /** Изучение свитка */
  scroll: 8,  // 8% в час
  
  /** Прозрение (мгновенно) */
  insight: 100,
};

/**
 * Множители штрафа за уровень техники
 */
export const LEVEL_PENALTY = {
  /** Базовый штраф за каждый уровень разницы */
  perLevelDiff: 0.2,  // -20% за уровень
  
  /** Минимальная скорость обучения */
  minRate: 0.1,  // Минимум 10% от базовой скорости
};

/**
 * Бонусы от характеристик к обучению
 */
export const LEARNING_BONUSES = {
  /** За каждую единицу интеллекта выше 10 */
  perIntelligence: 0.02,  // +2%
  
  /** За каждую единицу проводимости */
  perConductivity: 0.05,  // +5% (для техник Ци)
};

// ============================================
// ТИПЫ
// ============================================

export type LearningSource = "preset" | "npc" | "scroll" | "insight";

export interface LearningProgress {
  techniqueId: string;
  source: LearningSource;
  progress: number;      // 0-100
  startedAt: Date;
  estimatedHours?: number;
}

export interface LearningResult {
  success: boolean;
  progressGained: number;
  newProgress: number;
  isComplete: boolean;
  conductivityGained?: number;
  message: string;
}

// ============================================
// ФУНКЦИИ РАСЧЁТА
// ============================================

/**
 * Расчёт скорости обучения
 */
export function calculateLearningSpeed(
  techniqueLevel: number,
  characterLevel: number,
  characterIntelligence: number,
  characterConductivity: number,
  source: LearningSource
): number {
  // Базовая скорость
  let baseSpeed = LEARNING_RATES[source] || 5;
  
  // Бонус от интеллекта
  const intBonus = (characterIntelligence - 10) * LEARNING_BONUSES.perIntelligence;
  baseSpeed *= (1 + intBonus);
  
  // Бонус от проводимости (для техник Ци, через свитки)
  if (source === "scroll" || source === "npc") {
    baseSpeed *= (1 + characterConductivity * LEARNING_BONUSES.perConductivity);
  }
  
  // Штраф за уровень техники
  if (techniqueLevel > characterLevel) {
    const levelDiff = techniqueLevel - characterLevel;
    const penalty = levelDiff * LEVEL_PENALTY.perLevelDiff;
    baseSpeed *= Math.max(LEVEL_PENALTY.minRate, 1 - penalty);
  }
  
  return baseSpeed; // % в час
}

/**
 * Расчёт времени до завершения обучения
 */
export function calculateTimeToComplete(
  currentProgress: number,
  learningSpeed: number  // % в час
): number {
  const remaining = 100 - currentProgress;
  if (remaining <= 0) return 0;
  if (learningSpeed <= 0) return Infinity;
  
  return Math.ceil(remaining / learningSpeed); // часов
}

/**
 * Обработка прогресса обучения
 */
export function processLearning(
  character: Character,
  techniqueLevel: number,
  source: LearningSource,
  durationMinutes: number,
  currentProgress: number = 0
): LearningResult {
  // Расчёт скорости
  const speed = calculateLearningSpeed(
    techniqueLevel,
    character.cultivationLevel,
    character.intelligence,
    character.conductivity,
    source
  );
  
  // Прогресс за время
  const hours = durationMinutes / 60;
  let progressGained = speed * hours;
  
  // Из пресета/прозрения - мгновенное завершение
  if (source === "preset" || source === "insight") {
    progressGained = 100 - currentProgress;
  }
  
  const newProgress = Math.min(100, currentProgress + progressGained);
  const isComplete = newProgress >= 100;
  
  // Прирост проводимости при изучении
  let conductivityGained = 0;
  if (isComplete) {
    // Бонус проводимости за завершение изучения техники
    conductivityGained = techniqueLevel * 0.02;
  }
  
  return {
    success: true,
    progressGained,
    newProgress,
    isComplete,
    conductivityGained,
    message: isComplete
      ? `Техника изучена! (+${conductivityGained.toFixed(3)} проводимости)`
      : `Прогресс обучения: ${newProgress.toFixed(1)}%`,
  };
}

/**
 * Проверка возможности обучения
 */
export function canStartLearning(
  techniqueLevel: number,
  techniqueRequirements: {
    minCultivationLevel: number;
    strength?: number;
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  },
  character: Character
): { canLearn: boolean; reason?: string } {
  // Проверка уровня культивации
  if (character.cultivationLevel < techniqueRequirements.minCultivationLevel) {
    return {
      canLearn: false,
      reason: `Требуется уровень культивации ${techniqueRequirements.minCultivationLevel}`,
    };
  }
  
  // Проверка характеристик
  if (techniqueRequirements.strength && character.strength < techniqueRequirements.strength) {
    return { canLearn: false, reason: `Требуется сила: ${techniqueRequirements.strength}` };
  }
  if (techniqueRequirements.agility && character.agility < techniqueRequirements.agility) {
    return { canLearn: false, reason: `Требуется ловкость: ${techniqueRequirements.agility}` };
  }
  if (techniqueRequirements.intelligence && character.intelligence < techniqueRequirements.intelligence) {
    return { canLearn: false, reason: `Требуется интеллект: ${techniqueRequirements.intelligence}` };
  }
  if (techniqueRequirements.conductivity && character.conductivity < techniqueRequirements.conductivity) {
    return { canLearn: false, reason: `Требуется проводимость: ${techniqueRequirements.conductivity}` };
  }
  
  return { canLearn: true };
}

/**
 * Генерация описания прогресса обучения
 */
export function formatLearningProgress(
  progress: number,
  source: LearningSource,
  techniqueName: string
): string {
  const sourceNames: Record<LearningSource, string> = {
    preset: "Получена из пресета",
    npc: "Обучение у наставника",
    scroll: "Изучение свитка",
    insight: "Прозрение",
  };
  
  if (progress >= 100) {
    return `✅ ${techniqueName} - изучена!`;
  }
  
  return `📖 ${techniqueName} - ${progress.toFixed(1)}% (${sourceNames[source]})`;
}
