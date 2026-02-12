/**
 * Локальный калькулятор Ци (клиентская сторона)
 * 
 * ПРИОРИТЕТ: Локальные расчёты имеют приоритет над данными от LLM
 * LLM возвращает только ДЕЛЬТУ (затраты/накопление), а расчёты проводятся здесь
 * 
 * ДВА ИСТОЧНИКА ЦИ:
 * 1. Выработка микроядром - работает ВСЕГДА (пассивно, до 90% ядра)
 * 2. Поглощение из среды - ТОЛЬКО при активной медитации
 * 
 * Правила:
 * - Генерация микроядром: 10% от ёмкости ядра / сутки
 * - Поглощение: проводимость × плотность Ци локации (только медитация)
 * - Переполнение: излишки уходят в окружающую среду (кроме прорыва)
 */

import type { Character, Location } from "@/hooks/useGame";

// Константы
const SECONDS_PER_DAY = 86400;
const PASSIVE_QI_CAP = 0.9; // Пассивное накопление только до 90%

// Интерфейс результата расчёта Ци
export interface QiCalculationResult {
  newQi: number;           // Новое значение Ци
  qiGained: number;        // Сколько получено
  qiLost: number;          // Сколько потеряно (рассеялось)
  overflow: number;        // Излишки, ушедшие в среду
  rate: number;            // Скорость Ци/сек
  breakdown?: {            // Детализация источников
    coreGeneration: number;  // От микроядра
    environmentalAbsorption: number; // Из среды
  };
}

// Интерфейс дельты от LLM/API
export interface QiDelta {
  qiChange: number;        // Дельта Ци (отрицательная = затраты, положительная = накопление)
  reason: string;          // Причина изменения
  isBreakthrough?: boolean; // Это прорыв? (не рассеивать излишки)
  accumulatedGain?: number; // Прирост накопленной Ци для прорыва (при заполнении ядра)
}

/**
 * Расчёт скорости ВЫРАБОТКИ МИКРОЯДРОМ
 * Работает ВСЕГДА (пассивно)
 * @returns Ци в секунду
 */
export function calculateCoreGenerationRate(
  character: Character
): number {
  // Генерация микроядром: 10% от ёмкости / сутки
  const baseGeneration = character.coreCapacity * 0.1;
  return baseGeneration / SECONDS_PER_DAY; // Ци/секунду
}

/**
 * Расчёт скорости ПОГЛОЩЕНИЯ ИЗ ОКРУЖАЮЩЕЙ СРЕДЫ
 * Работает ТОЛЬКО при активной медитации
 * @returns Ци в секунду
 */
export function calculateEnvironmentalAbsorptionRate(
  character: Character,
  location: Location | null
): number {
  // Проводимость персонажа (ед/сек)
  const conductivity = character.conductivity;
  
  // Плотность Ци локации (ед/м³)
  const qiDensity = location?.qiDensity || 20;
  
  // Формула: (плотность × проводимость) / секунд в сутках
  // Результат: Ци/секунду
  return (qiDensity * conductivity) / SECONDS_PER_DAY;
}

/**
 * Расчёт ПОЛНОЙ скорости накопления при МЕДИТАЦИИ
 * Включает оба источника: ядро + среда
 * @returns Ци в секунду
 */
export function calculateMeditationQiRate(
  character: Character,
  location: Location | null
): number {
  const coreRate = calculateCoreGenerationRate(character);
  const envRate = calculateEnvironmentalAbsorptionRate(character, location);
  return coreRate + envRate;
}

/**
 * Применить дельту Ци от LLM с локальными расчётами
 * 
 * @param currentQi Текущее значение Ци
 * @param delta Дельта от LLM
 * @param coreCapacity Ёмкость ядра
 * @param isBreakthrough Это прорыв? (излишки не рассеиваются)
 * @returns Результат расчёта
 */
export function applyQiDelta(
  currentQi: number,
  delta: QiDelta,
  coreCapacity: number,
  isBreakthrough: boolean = false
): QiCalculationResult {
  let newQi = currentQi + delta.qiChange;
  let overflow = 0;
  let qiLost = 0;
  
  // Проверка переполнения ядра
  if (newQi > coreCapacity) {
    overflow = newQi - coreCapacity;
    
    if (isBreakthrough || delta.isBreakthrough) {
      // При прорыве излишки остаются (ядро расширяется)
      // Но пока ядро не расширилось, ограничиваем
      newQi = coreCapacity;
    } else {
      // Излишки рассеиваются в окружающую среду
      newQi = coreCapacity;
      qiLost = overflow;
    }
  }
  
  // Проверка отрицательного значения
  if (newQi < 0) {
    newQi = 0;
    qiLost = Math.abs(currentQi + delta.qiChange); // Потеря больше чем было
  }
  
  return {
    newQi: Math.round(newQi * 100) / 100, // Округление до 0.01
    qiGained: delta.qiChange > 0 ? Math.min(delta.qiChange, coreCapacity - currentQi) : 0,
    qiLost: qiLost,
    overflow,
    rate: 0, // Не применимо для дельты
  };
}

/**
 * Рассчитать накопление Ци за время
 * 
 * @param character Персонаж
 * @param location Локация
 * @param durationSeconds Длительность в секундах
 * @param isMeditation Это активная медитация? (ядро + среда, до 100%)
 * @returns Результат расчёта с детализацией источников
 */
export function calculateQiOverTime(
  character: Character,
  location: Location | null,
  durationSeconds: number,
  isMeditation: boolean = false
): QiCalculationResult {
  const maxQi = character.coreCapacity;
  const currentQi = character.currentQi;
  
  // РАЗДЕЛЕНИЕ ИСТОЧНИКОВ:
  // 1. Ядро - ВСЕГДА работает
  const coreRate = calculateCoreGenerationRate(character);
  let coreGain = coreRate * durationSeconds;
  
  // 2. Среда - ТОЛЬКО при медитации
  let envGain = 0;
  if (isMeditation) {
    const envRate = calculateEnvironmentalAbsorptionRate(character, location);
    envGain = envRate * durationSeconds;
  }
  
  // Пассивное накопление только до 90% (только от ядра)
  // При медитации можно до 100% (ядро + среда)
  const passiveCap = maxQi * PASSIVE_QI_CAP;
  const effectiveCap = isMeditation ? maxQi : passiveCap;
  
  // Общий прирост
  let totalGain = coreGain + envGain;
  let overflow = 0;
  
  // Проверка переполнения
  if (currentQi + totalGain > effectiveCap) {
    totalGain = effectiveCap - currentQi;
    overflow = (coreGain + envGain) - totalGain;
    
    // Пропорционально уменьшаем источники при переполнении
    if (coreGain + envGain > 0) {
      const ratio = totalGain / (coreGain + envGain);
      coreGain *= ratio;
      envGain *= ratio;
    }
  }
  
  const newQi = Math.min(effectiveCap, currentQi + totalGain);
  const totalRate = isMeditation 
    ? calculateMeditationQiRate(character, location)
    : coreRate;
  
  return {
    newQi: Math.round(newQi * 100) / 100,
    qiGained: Math.round(totalGain * 100) / 100,
    qiLost: 0,
    overflow: Math.round(overflow * 100) / 100,
    rate: totalRate,
    breakdown: {
      coreGeneration: Math.round(coreGain * 100) / 100,
      environmentalAbsorption: Math.round(envGain * 100) / 100,
    },
  };
}

/**
 * Рассчитать ПАССИВНОЕ накопление Ци
 * Только от микроядра, до 90% ёмкости
 * 
 * @param character Персонаж
 * @param deltaTimeSeconds Время с последнего обновления
 * @returns Результат расчёта
 */
export function calculatePassiveQiGain(
  character: Character,
  deltaTimeSeconds: number
): QiCalculationResult {
  const maxQi = character.coreCapacity;
  const currentQi = character.currentQi;
  
  // Пассивное накопление только до 90%
  const passiveCap = maxQi * PASSIVE_QI_CAP;
  
  // Только ядро
  const coreRate = calculateCoreGenerationRate(character);
  let coreGain = coreRate * deltaTimeSeconds;
  
  // Если уже выше капа - нет накопления
  if (currentQi >= passiveCap) {
    return {
      newQi: currentQi,
      qiGained: 0,
      qiLost: 0,
      overflow: 0,
      rate: coreRate,
      breakdown: {
        coreGeneration: 0,
        environmentalAbsorption: 0,
      },
    };
  }
  
  // Ограничение по капу
  let overflow = 0;
  if (currentQi + coreGain > passiveCap) {
    overflow = (currentQi + coreGain) - passiveCap;
    coreGain = passiveCap - currentQi;
  }
  
  return {
    newQi: Math.round((currentQi + coreGain) * 100) / 100,
    qiGained: Math.round(coreGain * 100) / 100,
    qiLost: 0,
    overflow: Math.round(overflow * 100) / 100,
    rate: coreRate,
    breakdown: {
      coreGeneration: Math.round(coreGain * 100) / 100,
      environmentalAbsorption: 0,
    },
  };
}

/**
 * Рассчитать время до полного ядра
 * @returns Время в секундах
 */
export function calculateTimeToFull(
  character: Character,
  location: Location | null
): number {
  const currentQi = character.currentQi;
  const maxQi = character.coreCapacity;
  const deficit = maxQi - currentQi;
  
  if (deficit <= 0) return 0;
  
  const rate = calculateQiRate(character, location);
  if (rate <= 0) return Infinity;
  
  return Math.ceil(deficit / rate);
}

/**
 * Форматирование скорости Ци для отображения
 */
export function formatQiRate(rate: number): string {
  if (rate < 0.001) {
    return `${(rate * 1000).toFixed(4)} мЦи/сек`;
  } else if (rate < 1) {
    return `${(rate * 1000).toFixed(2)} мЦи/сек`;
  } else {
    return `${rate.toFixed(4)} Ци/сек`;
  }
}

/**
 * Валидация дельты от LLM
 * Защита от некорректных данных
 */
export function validateQiDelta(delta: unknown): QiDelta | null {
  if (!delta || typeof delta !== 'object') return null;
  
  const d = delta as Record<string, unknown>;
  
  // Проверяем qiChange
  if (typeof d.qiChange !== 'number' || !isFinite(d.qiChange)) {
    return null;
  }
  
  // Ограничиваем дельту разумными пределами
  const maxDelta = 10000; // Максимум 10000 Ци за действие
  const qiChange = Math.max(-maxDelta, Math.min(maxDelta, d.qiChange));
  
  return {
    qiChange,
    reason: typeof d.reason === 'string' ? d.reason : 'Действие',
    isBreakthrough: Boolean(d.isBreakthrough),
  };
}

/**
 * Создать дельту затрат Ци (для техник, действий)
 */
export function createQiCost(cost: number, reason: string): QiDelta {
  return {
    qiChange: -Math.abs(cost),
    reason,
    isBreakthrough: false,
  };
}

/**
 * Создать дельту накопления Ци
 */
export function createQiGain(amount: number, reason: string): QiDelta {
  return {
    qiChange: Math.abs(amount),
    reason,
    isBreakthrough: false,
  };
}

// ============================================
// РАСЧЁТЫ ПРОРЫВА (клиентская сторона)
// ============================================

/**
 * Интерфейс требований для прорыва
 */
export interface BreakthroughRequirements {
  requiredFills: number;      // Сколько заполнений нужно (level*10 + subLevel)
  currentFills: number;       // Сколько уже накоплено
  fillsNeeded: number;        // Сколько ещё осталось
  requiredQi: number;         // Сколько Ци нужно
  currentAccumulated: number; // Сколько накоплено
  canAttempt: boolean;
}

/**
 * Расчёт требований для прорыва
 * Количество циклов = уровень * 10 + подуровень
 * 1.0 = 10 циклов, 6.5 = 65 циклов
 */
export function calculateBreakthroughRequirements(
  character: Character
): BreakthroughRequirements {
  const currentLevel = character.cultivationLevel;
  const currentSubLevel = character.cultivationSubLevel;
  
  // Количество заполнений = уровень * 10 + подуровень
  const requiredFills = currentLevel * 10 + currentSubLevel;
  
  // Текущее накопление в "заполнениях ядра"
  const currentFills = Math.floor(character.accumulatedQi / character.coreCapacity);
  
  // Сколько ещё нужно
  const fillsNeeded = Math.max(0, requiredFills - currentFills);
  
  // Абсолютное значение Ци
  const requiredQi = requiredFills * character.coreCapacity;
  const currentAccumulated = character.accumulatedQi;
  
  return {
    requiredFills,
    currentFills,
    fillsNeeded,
    requiredQi,
    currentAccumulated,
    canAttempt: currentFills >= requiredFills,
  };
}

/**
 * Интерфейс результата прорыва
 */
export interface BreakthroughResult {
  success: boolean;
  newLevel: number;
  newSubLevel: number;
  newCoreCapacity: number;
  qiConsumed: number;
  fatigueGained: { physical: number; mental: number };
  message: string;
}

/**
 * Выполнить прорыв (локально на клиенте)
 */
export function attemptBreakthrough(character: Character): BreakthroughResult {
  const currentLevel = character.cultivationLevel;
  const currentSubLevel = character.cultivationSubLevel;
  
  // Проверяем требования
  const requirements = calculateBreakthroughRequirements(character);
  
  if (!requirements.canAttempt) {
    return {
      success: false,
      newLevel: currentLevel,
      newSubLevel: currentSubLevel,
      newCoreCapacity: character.coreCapacity,
      qiConsumed: 0,
      fatigueGained: { physical: 5, mental: 20 },
      message: `Недостаточно накопленной Ци. Нужно: ${requirements.requiredFills} заполнений, накоплено: ${requirements.currentFills}. Осталось: ${requirements.fillsNeeded}`,
    };
  }
  
  // Определяем тип прорыва (большой при subLevel >= 9)
  const isMajorBreakthrough = currentSubLevel >= 9;
  
  // Прорыв успешен
  let newLevel = currentLevel;
  let newSubLevel = currentSubLevel;
  
  if (isMajorBreakthrough) {
    newLevel = currentLevel + 1;
    newSubLevel = 0;
  } else {
    newSubLevel = currentSubLevel + 1;
  }
  
  // Новая ёмкость ядра (+10%)
  const newCoreCapacity = Math.ceil(character.coreCapacity * 1.1);
  
  // Затраты накопленной Ци
  const qiConsumed = requirements.requiredQi;
  
  // Усталость от прорыва
  const fatigueGained = {
    physical: 10,
    mental: isMajorBreakthrough ? 40 : 25,
  };
  
  return {
    success: true,
    newLevel,
    newSubLevel,
    newCoreCapacity,
    qiConsumed,
    fatigueGained,
    message: isMajorBreakthrough
      ? `🌟 Большой прорыв! Уровень ${newLevel}!`
      : `⬆️ Продвижение до ${newLevel}.${newSubLevel}`,
  };
}

/**
 * Рассчитать время до следующего заполнения ядра
 */
export function calculateTimeToNextFill(
  character: Character,
  location: Location | null
): number {
  const currentQi = character.currentQi;
  const maxQi = character.coreCapacity;
  const deficit = maxQi - currentQi;
  
  if (deficit <= 0) return 0; // Уже полное
  
  const rate = calculateMeditationQiRate(character, location);
  if (rate <= 0) return Infinity;
  
  return Math.ceil(deficit / rate); // секунды
}

/**
 * Форматирование времени для отображения
 */
export function formatTime(seconds: number): string {
  if (seconds === Infinity) return "∞";
  if (seconds < 60) return `${seconds} сек`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} ч`;
  return `${(seconds / 86400).toFixed(1)} дн`;
}
