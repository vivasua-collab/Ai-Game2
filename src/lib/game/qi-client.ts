/**
 * Локальный калькулятор Ци (клиентская сторона)
 * 
 * ПРИОРИТЕТ: Локальные расчёты имеют приоритет над данными от LLM
 * LLM возвращает только ДЕЛЬТУ (затраты/накопление), а расчёты проводятся здесь
 * 
 * Правила:
 * - Генерация микроядром: 10% от ёмкости ядра / сутки
 * - Поглощение: проводимость × плотность Ци локации
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
}

// Интерфейс дельты от LLM
export interface QiDelta {
  qiChange: number;        // Дельта Ци (отрицательная = затраты, положительная = накопление)
  reason: string;          // Причина изменения
  isBreakthrough?: boolean; // Это прорыв? (не рассеивать излишки)
}

/**
 * Расчёт скорости накопления Ци
 * @returns Ци в секунду
 */
export function calculateQiRate(
  character: Character,
  location: Location | null
): number {
  // Базовая генерация микроядром: 10% от ёмкости / сутки
  const baseGeneration = character.coreCapacity * 0.1;
  
  // Проводимость персонажа (ед/сек)
  const conductivity = character.conductivity;
  
  // Плотность Ци локации (ед/м³)
  const qiDensity = location?.qiDensity || 20;
  
  // Формула: база + (плотность × проводимость) / секунд в сутках
  const environmentalAbsorption = (qiDensity * conductivity) / SECONDS_PER_DAY;
  
  // Общая скорость: базовая генерация + поглощение из окружения
  const totalRate = (baseGeneration / SECONDS_PER_DAY) + environmentalAbsorption;
  
  return totalRate; // Ци/секунду
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
 * @param isMeditation Это активная медитация? (может заполнять до 100%)
 * @returns Результат расчёта
 */
export function calculateQiOverTime(
  character: Character,
  location: Location | null,
  durationSeconds: number,
  isMeditation: boolean = false
): QiCalculationResult {
  const rate = calculateQiRate(character, location);
  const maxQi = character.coreCapacity;
  const currentQi = character.currentQi;
  
  // Пассивное накопление только до 90%
  const passiveCap = maxQi * PASSIVE_QI_CAP;
  const effectiveCap = isMeditation ? maxQi : passiveCap;
  
  let potentialGain = rate * durationSeconds;
  let overflow = 0;
  
  // Проверка переполнения
  if (currentQi + potentialGain > effectiveCap) {
    potentialGain = effectiveCap - currentQi;
    overflow = (rate * durationSeconds) - potentialGain;
  }
  
  const newQi = Math.min(effectiveCap, currentQi + potentialGain);
  
  return {
    newQi: Math.round(newQi * 100) / 100,
    qiGained: Math.round(potentialGain * 100) / 100,
    qiLost: 0,
    overflow: Math.round(overflow * 100) / 100,
    rate,
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
