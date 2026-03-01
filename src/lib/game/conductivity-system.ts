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
 * 5. Медитации на проводимость (МедП) - +10% к базовой проводимости за каждую
 * 
 * Кап проводимости зависит от уровня культивации
 * 
 * ФОРМУЛА ПРОВОДИМОСТИ (из cultivation-levels.ts):
 * ============================================
 * Базовая проводимость = объём_ядра / 360 сек
 * 
 * Итоговая проводимость = базовая_проводимость * множитель_уровня + (МедП * базовая_проводимость * 10%)
 * 
 * Где:
 * - объём_ядра = coreCapacity персонажа
 * - множитель_уровня = conductivityMultiplier из cultivation-levels.ts
 * - МедП = количество медитаций на проводимость
 * - 10% = константа CONDUCTIVITY_BONUS_PERCENT
 * 
 * ПРИМЕР для уровня 2, coreCapacity=1000, МедП=0:
 * Базовая = 1000 / 360 = 2.778
 * Итоговая = 2.778 * 1.2 = 3.333
 * 
 * ПРИМЕР для уровня 2, coreCapacity=1000, МедП=10:
 * Базовая = 1000 / 360 = 2.778
 * Бонус от МедП = 10 * (2.778 * 10%) = 2.778
 * Итоговая = 2.778 * 1.2 + 2.778 = 6.111
 */

import { QI_CONSTANTS, MEDITATION_TYPE_CONSTANTS } from "./constants";

// ============================================
// КОНСТАНТЫ РАЗВИТИЯ ПРОВОДИМОСТИ
// ============================================

/**
 * Максимальная проводимость для каждого уровня культивации
 * (нельзя превысить без повышения уровня)
 * 
 * Формула: max_base_conductivity * multiplier + max_meditations_bonus
 * При coreCapacity=1000: базовая = 2.778
 */
export const MAX_CONDUCTIVITY_BY_LEVEL: Record<number, number> = {
  1: 5,      // Уровень 1: 2.778 * 1 + 5 * 0.278 = 4.17
  2: 10,     // Уровень 2: 2.778 * 1.2 + 10 * 0.278 = 6.11
  3: 20,     // Уровень 3
  4: 40,     // Уровень 4
  5: 80,     // Уровень 5
  6: 150,    // Уровень 6
  7: 300,    // Уровень 7
  8: 600,    // Уровень 8
  9: 2000,   // Уровень 9
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
 * Получить базовую проводимость для объёма ядра
 * Формула из cultivation-levels.ts: coreCapacity / 360
 * 
 * @param coreCapacity - ёмкость ядра персонажа
 * @returns базовая проводимость (без множителя уровня)
 */
export function getBaseConductivity(coreCapacity: number): number {
  return coreCapacity / 360;
}

/**
 * Получить базовую проводимость с учётом множителя уровня
 * 
 * @param coreCapacity - ёмкость ядра персонажа
 * @param cultivationLevel - уровень культивации
 * @returns базовая проводимость с множителем уровня
 */
export function getBaseConductivityForLevel(coreCapacity: number, cultivationLevel: number): number {
  const baseConductivity = getBaseConductivity(coreCapacity);
  const multiplier = QI_CONSTANTS.CONDUCTIVITY_MULTIPLIERS[cultivationLevel] || 1;
  return baseConductivity * multiplier;
}

/**
 * Получить максимальное количество медитаций на проводимость для уровня
 */
export function getMaxConductivityMeditations(cultivationLevel: number): number {
  return MEDITATION_TYPE_CONSTANTS.MAX_CONDUCTIVITY_MEDITATIONS_BY_LEVEL[cultivationLevel] || 5;
}

/**
 * Рассчитать бонус проводимости от медитаций на проводимость
 * Формула: МедП * (базовая_проводимость * 10%)
 * 
 * ВАЖНО: Бонус считается от базовой проводимости (coreCapacity / 360),
 * а не от проводимости с множителем уровня!
 * 
 * @param conductivityMeditations - количество медитаций на проводимость (МедП)
 * @param coreCapacity - ёмкость ядра персонажа
 * @returns бонус к проводимости
 */
export function calculateConductivityBonusFromMeditations(
  conductivityMeditations: number,
  coreCapacity: number
): number {
  const baseConductivity = getBaseConductivity(coreCapacity);
  const bonusPercent = MEDITATION_TYPE_CONSTANTS.CONDUCTIVITY_BONUS_PERCENT / 100; // 0.1
  
  // Бонус = МедП * (базовая_проводимость * 10%)
  return conductivityMeditations * (baseConductivity * bonusPercent);
}

/**
 * Рассчитать ИТОГОВУЮ проводимость персонажа
 * 
 * ФОРМУЛА:
 * Итоговая = (coreCapacity / 360) * multiplier + (МедП * базовая * 10%)
 * 
 * @param coreCapacity - ёмкость ядра персонажа
 * @param cultivationLevel - уровень культивации
 * @param conductivityMeditations - количество медитаций на проводимость (МедП)
 * @returns итоговая проводимость
 */
export function calculateTotalConductivity(
  coreCapacity: number,
  cultivationLevel: number,
  conductivityMeditations: number
): number {
  const baseWithMultiplier = getBaseConductivityForLevel(coreCapacity, cultivationLevel);
  const meditationBonus = calculateConductivityBonusFromMeditations(conductivityMeditations, coreCapacity);
  
  return baseWithMultiplier + meditationBonus;
}

/**
 * Проверить, можно ли выполнить медитацию на проводимость
 */
export function canDoConductivityMeditation(
  cultivationLevel: number,
  conductivityMeditations: number
): { canDo: boolean; reason?: string } {
  const maxMeditations = getMaxConductivityMeditations(cultivationLevel);
  
  if (conductivityMeditations >= maxMeditations) {
    return {
      canDo: false,
      reason: `Достигнут максимум медитаций на проводимость для уровня ${cultivationLevel}: ${maxMeditations}. Повысьте уровень для продолжения.`,
    };
  }
  
  return { canDo: true };
}

/**
 * Получить информацию о прогрессе медитаций на проводимость
 */
export function getConductivityMeditationProgress(
  coreCapacity: number,
  cultivationLevel: number,
  conductivityMeditations: number
): {
  current: number;
  max: number;
  percent: number;
  currentBonus: number;
  nextBonus: number;
  toNextCap: number;
} {
  const max = getMaxConductivityMeditations(cultivationLevel);
  const currentBonus = calculateConductivityBonusFromMeditations(conductivityMeditations, coreCapacity);
  const nextBonus = calculateConductivityBonusFromMeditations(conductivityMeditations + 1, coreCapacity);
  const baseConductivity = getBaseConductivity(coreCapacity);
  
  return {
    current: conductivityMeditations,
    max,
    percent: Math.round((conductivityMeditations / max) * 100),
    currentBonus,
    nextBonus,
    toNextCap: max - conductivityMeditations,
  };
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

/**
 * Рассчитать время переноса Ци
 * 
 * Используется для:
 * - Медитации на проводимость
 * - Медитации на прорыв
 * - Отображения времени в UI
 * 
 * @param coreCapacity - Ёмкость ядра персонажа
 * @param conductivity - Проводимость (Ци/сек)
 * @returns Время переноса в секундах
 */
export function calculateTransferTime(coreCapacity: number, conductivity: number): number {
  // Защита от деления на ноль
  const safeConductivity = Math.max(0.1, conductivity);
  return Math.ceil(coreCapacity / safeConductivity);
}

/**
 * Рассчитать время переноса Ци в минутах
 * 
 * @param coreCapacity - Ёмкость ядра персонажа
 * @param conductivity - Проводимость (Ци/сек)
 * @returns Время переноса в минутах
 */
export function calculateTransferTimeMinutes(coreCapacity: number, conductivity: number): number {
  return Math.ceil(calculateTransferTime(coreCapacity, conductivity) / 60);
}
