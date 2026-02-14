/**
 * Система развития проводимости
 * 
 * Проводимость - это способность меридиан проводить Ци.
 * Влияет на:
 * - Эффективность техник Ци
 * - Скорость накопления Ци
 * - Эффективность медитации
 * 
 * Развитие проводимости:
 * 1. Базовый прирост при повышении уровня культивации
 * 2. Прирост от медитации (небольшой)
 * 3. Прирост от использования техник Ци
 * 4. Специальные упражнения/тренировки
 * 
 * Кап проводимости зависит от уровня культивации
 */

import { QI_CONSTANTS } from "./constants";

// ============================================
// КОНСТАНТЫ РАЗВИТИЯ ПРОВОДИМОСТИ
// ============================================

/**
 * Максимальная проводимость для каждого уровня культивации
 * (нельзя превысить без повышения уровня)
 */
export const MAX_CONDUCTIVITY_BY_LEVEL: Record<number, number> = {
  1: 0.5,    // Уровень 1
  2: 1.0,    // Уровень 2
  3: 2.0,    // Уровень 3
  4: 4.0,    // Уровень 4
  5: 8.0,    // Уровень 5
  6: 16.0,   // Уровень 6
  7: 32.0,   // Уровень 7
  8: 64.0,   // Уровень 8
  9: 128.0,  // Уровень 9
};

/**
 * Прирост проводимости от действий
 */
export const CONDUCTIVITY_GAIN = {
  /** За час медитации */
  perMeditationHour: 0.01,
  
  /** За использование техники Ци */
  perTechniqueUse: 0.005,
  
  /** За специальную тренировку (час) */
  perTrainingHour: 0.05,
  
  /** Бонус при прорыве уровня */
  perBreakthrough: 0.1,
  
  /** Бонус при большом прорыве */
  perMajorBreakthrough: 0.3,
};

// ============================================
// ФУНКЦИИ РАСЧЁТА
// ============================================

/**
 * Получить максимальную проводимость для уровня
 */
export function getMaxConductivity(cultivationLevel: number): number {
  return MAX_CONDUCTIVITY_BY_LEVEL[cultivationLevel] || 0.5;
}

/**
 * Получить базовую проводимость при повышении уровня
 * (из констант Ци)
 */
export function getBaseConductivityForLevel(cultivationLevel: number): number {
  const multiplier = QI_CONSTANTS.CONDUCTIVITY_MULTIPLIERS[cultivationLevel] || 1.0;
  // Базовая проводимость = множитель уровня
  return multiplier * 0.1;
}

/**
 * Рассчитать прирост проводимости от медитации
 */
export function calculateConductivityGainFromMeditation(
  durationMinutes: number,
  currentConductivity: number,
  maxConductivity: number
): number {
  // Если достигнут кап - нет прироста
  if (currentConductivity >= maxConductivity) {
    return 0;
  }
  
  // Базовый прирост
  const hours = durationMinutes / 60;
  let gain = hours * CONDUCTIVITY_GAIN.perMeditationHour;
  
  // Не превышаем кап
  const remainingCapacity = maxConductivity - currentConductivity;
  return Math.min(gain, remainingCapacity);
}

/**
 * Рассчитать прирост проводимости от использования техники
 */
export function calculateConductivityGainFromTechnique(
  qiSpent: number,
  currentConductivity: number,
  maxConductivity: number
): number {
  if (currentConductivity >= maxConductivity) {
    return 0;
  }
  
  // Прирост зависит от затраченной Ци
  let gain = CONDUCTIVITY_GAIN.perTechniqueUse * (qiSpent / 10);
  
  const remainingCapacity = maxConductivity - currentConductivity;
  return Math.min(gain, remainingCapacity);
}

/**
 * Рассчитать прирост при прорыве
 */
export function calculateConductivityGainFromBreakthrough(
  currentLevel: number,
  newLevel: number,
  isMajorBreakthrough: boolean
): number {
  let gain = CONDUCTIVITY_GAIN.perBreakthrough;
  
  if (isMajorBreakthrough) {
    gain = CONDUCTIVITY_GAIN.perMajorBreakthrough;
  }
  
  // Бонус пропорционален уровню
  gain *= newLevel * 0.5;
  
  return gain;
}

/**
 * Проверка возможности развития проводимости
 */
export function canImproveConductivity(
  currentConductivity: number,
  cultivationLevel: number
): { canImprove: boolean; reason?: string } {
  const maxConductivity = getMaxConductivity(cultivationLevel);
  
  if (currentConductivity >= maxConductivity) {
    return {
      canImprove: false,
      reason: `Достигнут максимум проводимости для уровня ${cultivationLevel}: ${maxConductivity}`,
    };
  }
  
  return { canImprove: true };
}

/**
 * Получить прогресс развития проводимости
 */
export function getConductivityProgress(
  currentConductivity: number,
  cultivationLevel: number
): { current: number; max: number; percent: number; toNextCap: number } {
  const max = getMaxConductivity(cultivationLevel);
  
  return {
    current: currentConductivity,
    max,
    percent: Math.round((currentConductivity / max) * 100),
    toNextCap: max - currentConductivity,
  };
}

/**
 * Рекомендации по развитию проводимости
 */
export function getConductivityTrainingAdvice(
  currentConductivity: number,
  cultivationLevel: number
): string[] {
  const max = getMaxConductivity(cultivationLevel);
  const percent = (currentConductivity / max) * 100;
  
  const advice: string[] = [];
  
  if (percent < 50) {
    advice.push("Рекомендуется регулярная медитация для развития проводимости.");
    advice.push("Используйте техники Ци чаще - это ускорит развитие меридиан.");
  } else if (percent < 80) {
    advice.push("Хороший прогресс! Продолжайте практику.");
    advice.push("Специальные тренировки проводимости дадут больший эффект.");
  } else if (percent < 100) {
    advice.push("Почти достигнут максимум для текущего уровня.");
    advice.push("Для дальнейшего развития необходим прорыв.");
  } else {
    advice.push("Достигнут максимум проводимости для текущего уровня культивации.");
    advice.push("Совершите прорыв для увеличения потенциала.");
  }
  
  return advice;
}
