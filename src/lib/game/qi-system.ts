/**
 * Система Ци — Серверные действия
 * 
 * Этот модуль содержит ТОЛЬКО функции, которые:
 * - Выполняют действия над персонажем
 * - Возвращают данные для обновления в БД
 * - Не могут использоваться на клиенте
 * 
 * Для расчётов используйте qi-shared.ts!
 * 
 * @module qi-system
 * @see qi-shared — чистые расчёты
 */

import type { Character, MeditationResult, BreakthroughResult } from '@/types/game';
import type { LocationData } from '@/types/game-shared';

import {
  calculateCoreGenerationRate,
  calculateEnvironmentalAbsorptionRate,
  calculateBreakthroughRequirements,
  calculateBreakthroughResult,
  calculateMeditationFatigue,
  calculateQiRates,
  getCultivationLevelName,
} from './qi-shared';
import { QI_CONSTANTS, MEDITATION_TYPE_CONSTANTS } from './constants';
import { calculateTotalConductivity } from './conductivity-system';

// ==================== СЕРВЕРНЫЕ ДЕЙСТВИЯ ====================

/**
 * Результат медитации на прорыв
 */
export interface BreakthroughMeditationResult {
  success: boolean;
  qiGained: number;           // Сколько Ци было перенесено в накопленное
  coreWasEmptied: boolean;    // Было ли ядро опустошено в accumulatedQi
  duration: number;
  fatigueGained: { physical: number; mental: number };
  breakdown?: {
    coreGeneration: number;
    environmentalAbsorption: number;
  };
}

/**
 * Результат медитации на проводимость
 */
export interface ConductivityMeditationResult {
  success: boolean;
  qiGained: number;
  coreWasFilled: boolean;
  duration: number;
  fatigueGained: { physical: number; mental: number };
  conductivityMeditationsGained: number; // Всегда 1 при успехе
  newConductivityMeditations: number;
  newTotalConductivity: number;
  breakdown?: {
    coreGeneration: number;
    environmentalAbsorption: number;
  };
}

/**
 * Выполнение медитации на накопление (обычная)
 * Вычисляет результат и возвращает данные для обновления
 */
export function performMeditation(
  character: Character,
  location: LocationData | null,
  intendedDurationMinutes: number,
  type: 'accumulation' | 'breakthrough' | 'conductivity'
): MeditationResult {
  const maxQi = character.coreCapacity;
  const currentQi = character.currentQi;
  
  let actualDurationSeconds = intendedDurationMinutes * 60;
  
  // === РАСЧЁТЫ ИСПОЛЬЗУЮТ ОБЩИЕ ФУНКЦИИ ===
  const rates = calculateQiRates(character, location);
  
  let coreGain = rates.coreGeneration * actualDurationSeconds;
  let envGain = rates.environmentalAbsorption * actualDurationSeconds;
  let totalGain = coreGain + envGain;
  
  let wasInterrupted = false;
  let interruptionReason: string | undefined;
  
  // === МЕХАНИКА НАКОПЛЕНИЯ ДЛЯ ПРОРЫВА ===
  let accumulatedQiGained = 0;
  let coreWasFilled = false;
  
  if (type === 'accumulation') {
    const qiToFull = maxQi - currentQi;
    
    if (qiToFull <= 0) {
      // Ядро уже полное - НЕ медитируем!
      return {
        success: false,
        qiGained: 0,
        accumulatedQiGained: 0,
        coreWasFilled: false,
        duration: 0,
        wasInterrupted: true,
        interruptionReason: '⚡ Ядро заполнено! Потратьте Ци (техники, бой) чтобы продолжить накопление, или попытайтесь прорваться.',
        fatigueGained: { physical: 0, mental: 0 },
        breakdown: { coreGeneration: 0, environmentalAbsorption: 0 },
      };
    }
    
    if (totalGain >= qiToFull) {
      // Ядро будет заполнено!
      coreWasFilled = true;
      accumulatedQiGained = maxQi;
      totalGain = qiToFull;
      
      // Пересчитываем время до заполнения
      actualDurationSeconds = Math.ceil(qiToFull / rates.total);
      
      // Пересчитываем прирост по источникам
      coreGain = rates.coreGeneration * actualDurationSeconds;
      envGain = rates.environmentalAbsorption * actualDurationSeconds;
      
      wasInterrupted = true;
      interruptionReason = '⚡ Ядро заполнено! Потратьте Ци чтобы продолжить накопление.';
    }
  }
  
  // Расчёт усталости от концентрации (только ментальная)
  const fatigueResult = calculateMeditationFatigue(actualDurationSeconds / 60, type);
  
  return {
    success: true,
    qiGained: Math.floor(totalGain),
    accumulatedQiGained,
    coreWasFilled,
    duration: Math.ceil(actualDurationSeconds / 60),
    wasInterrupted,
    interruptionReason,
    fatigueGained: {
      physical: fatigueResult.physicalGain,
      mental: fatigueResult.mentalGain,
    },
    breakdown: {
      coreGeneration: Math.floor(coreGain),
      environmentalAbsorption: Math.floor(envGain),
    },
  };
}

/**
 * Выполнение медитации на прорыв (тип 1)
 * 
 * Суть: заполняем ядро → при заполнении опустошаем в шкалу прорыва
 * 
 * Особенности:
 * - Ядро должно быть НЕ полное для начала
 * - При заполнении ядра - Ци переносится в accumulatedQi
 * - Можно заполнить несколько раз за одну медитацию
 * - x2 ментальная усталость
 */
export function performBreakthroughMeditation(
  character: Character,
  location: LocationData | null,
  intendedDurationMinutes: number
): BreakthroughMeditationResult {
  const maxQi = character.coreCapacity;
  let currentQi = character.currentQi;
  const currentAccumulated = character.accumulatedQi;
  
  // Проверка: ядро должно быть не полное
  if (currentQi >= maxQi) {
    return {
      success: false,
      qiGained: 0,
      coreWasEmptied: false,
      duration: 0,
      fatigueGained: { physical: 0, mental: 0 },
    };
  }
  
  // Расчёт скоростей
  const rates = calculateQiRates(character, location);
  let remainingSeconds = intendedDurationMinutes * 60;
  let totalAccumulatedGained = 0;
  let fillsCount = 0;
  
  // Симулируем медитацию с учётом заполнений
  while (remainingSeconds > 0 && currentQi < maxQi) {
    const qiToFull = maxQi - currentQi;
    const secondsToFull = Math.ceil(qiToFull / rates.total);
    
    if (secondsToFull <= remainingSeconds) {
      // Ядро будет заполнено за это время
      remainingSeconds -= secondsToFull;
      currentQi = maxQi;
      
      // Переносим в accumulated
      totalAccumulatedGained += maxQi;
      fillsCount++;
      
      // Опустошаем ядро для продолжения
      currentQi = 0;
    } else {
      // Время закончилось, ядро не заполнено
      const qiGained = rates.total * remainingSeconds;
      currentQi = Math.min(maxQi, currentQi + qiGained);
      remainingSeconds = 0;
    }
  }
  
  const actualDuration = intendedDurationMinutes * 60 - remainingSeconds;
  const fatigueResult = calculateMeditationFatigue(actualDuration / 60, 'breakthrough');
  
  // Расчёт breakdown
  const coreGain = rates.coreGeneration * actualDuration;
  const envGain = rates.environmentalAbsorption * actualDuration;
  
  return {
    success: true,
    qiGained: totalAccumulatedGained,
    coreWasEmptied: fillsCount > 0,
    duration: Math.ceil(actualDuration / 60),
    fatigueGained: {
      physical: fatigueResult.physicalGain,
      mental: fatigueResult.mentalGain,
    },
    breakdown: {
      coreGeneration: Math.floor(coreGain),
      environmentalAbsorption: Math.floor(envGain),
    },
  };
}

/**
 * Выполнение медитации на проводимость (тип 2)
 * 
 * Суть: как накопительная, но при заполнении ядра:
 * - Ядро опустошается
 * - +1 к счётчику медитаций на проводимость
 * - Проводимость пересчитывается
 * 
 * Особенности:
 * - x1.5 ментальная усталость
 * - Требует заполнения ядра для успеха
 * - Ограничено максимальным количеством на уровень
 */
export function performConductivityMeditation(
  character: Character,
  location: LocationData | null,
  intendedDurationMinutes: number,
  currentConductivityMeditations: number
): ConductivityMeditationResult {
  const maxQi = character.coreCapacity;
  const currentQi = character.currentQi;
  
  // Проверка: ядро должно быть не полное
  if (currentQi >= maxQi) {
    return {
      success: false,
      qiGained: 0,
      coreWasFilled: false,
      duration: 0,
      fatigueGained: { physical: 0, mental: 0 },
      conductivityMeditationsGained: 0,
      newConductivityMeditations: currentConductivityMeditations,
      newTotalConductivity: calculateTotalConductivity(character.cultivationLevel, currentConductivityMeditations),
    };
  }
  
  // Расчёт скоростей
  const rates = calculateQiRates(character, location);
  const qiToFull = maxQi - currentQi;
  const secondsToFull = Math.ceil(qiToFull / rates.total);
  const minutesToFull = Math.ceil(secondsToFull / 60);
  
  // Проверяем, хватит ли времени
  if (minutesToFull > intendedDurationMinutes) {
    // Не хватило времени - просто накопили Ци, но не заполнили
    const actualSeconds = intendedDurationMinutes * 60;
    const qiGained = rates.total * actualSeconds;
    const fatigueResult = calculateMeditationFatigue(intendedDurationMinutes, 'conductivity');
    
    return {
      success: true,
      qiGained: Math.floor(qiGained),
      coreWasFilled: false,
      duration: intendedDurationMinutes,
      fatigueGained: {
        physical: fatigueResult.physicalGain,
        mental: fatigueResult.mentalGain,
      },
      conductivityMeditationsGained: 0,
      newConductivityMeditations: currentConductivityMeditations,
      newTotalConductivity: calculateTotalConductivity(character.cultivationLevel, currentConductivityMeditations),
      breakdown: {
        coreGeneration: Math.floor(rates.coreGeneration * actualSeconds),
        environmentalAbsorption: Math.floor(rates.environmentalAbsorption * actualSeconds),
      },
    };
  }
  
  // Ядро было заполнено!
  const newConductivityMeditations = currentConductivityMeditations + 1;
  const newTotalConductivity = calculateTotalConductivity(character.cultivationLevel, newConductivityMeditations);
  const fatigueResult = calculateMeditationFatigue(minutesToFull, 'conductivity');
  
  return {
    success: true,
    qiGained: qiToFull,
    coreWasFilled: true,
    duration: minutesToFull,
    fatigueGained: {
      physical: fatigueResult.physicalGain,
      mental: fatigueResult.mentalGain,
    },
    conductivityMeditationsGained: 1,
    newConductivityMeditations,
    newTotalConductivity,
    breakdown: {
      coreGeneration: Math.floor(rates.coreGeneration * secondsToFull),
      environmentalAbsorption: Math.floor(rates.environmentalAbsorption * secondsToFull),
    },
  };
}

/**
 * Попытка прорыва
 * Вычисляет результат и возвращает данные для обновления
 */
export function attemptBreakthrough(
  character: Character
): BreakthroughResult & { newCoreCapacity: number } {
  return calculateBreakthroughResult(
    character.cultivationLevel,
    character.cultivationSubLevel,
    character.coreCapacity,
    character.accumulatedQi
  );
}
