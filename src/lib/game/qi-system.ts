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
 * Суть: ОДИН перенос Ци из ядра в accumulatedQi
 * 
 * Особенности:
 * - Длительность ФИКСИРОВАНА: 60 секунд (1 минута)
 * - Если ядро НЕ полное: сначала накопление до 100%, затем перенос
 * - Если ядро ПОЛНОЕ: немедленный перенос всего содержимого
 * - ОДИН перенос за медитацию (не множественный)
 * - x2 ментальная усталость
 * - НЕ прерывается внешними факторами
 * 
 * Скорость переноса: coreCapacity за 60 секунд
 * (быстрый процесс, всё происходит внутри ядра)
 */
export function performBreakthroughMeditation(
  character: Character,
  location: LocationData | null,
  _intendedDurationMinutes: number // Игнорируется - длительность фиксирована
): BreakthroughMeditationResult {
  const maxQi = character.coreCapacity;
  const currentQi = character.currentQi;
  
  // Расчёт скоростей накопления
  const rates = calculateQiRates(character, location);
  
  // === ФИКСИРОВАННАЯ ДЛИТЕЛЬНОСТЬ: 60 секунд для одного переноса ===
  const fixedDurationSeconds = 60;
  
  // === СЛУЧАЙ 1: Ядро уже полное ===
  if (currentQi >= maxQi) {
    // Полный перенос за 60 секунд
    const fatigueResult = calculateMeditationFatigue(fixedDurationSeconds / 60, 'breakthrough');
    
    return {
      success: true,
      qiGained: maxQi, // Переносим ВСЮ Ци из ядра
      coreWasEmptied: true,
      duration: 1, // 1 минута
      fatigueGained: {
        physical: fatigueResult.physicalGain,
        mental: fatigueResult.mentalGain,
      },
      breakdown: {
        coreGeneration: 0, // При переносе нет выработки
        environmentalAbsorption: 0, // При переносе нет поглощения
      },
    };
  }
  
  // === СЛУЧАЙ 2: Ядро не полное ===
  // Сначала накапливаем до полного, затем переносим
  const qiToFull = maxQi - currentQi;
  const secondsToFull = Math.ceil(qiToFull / rates.total);
  const totalDurationSeconds = secondsToFull + fixedDurationSeconds;
  
  // Расчёт breakdown (только для накопления)
  const coreGain = rates.coreGeneration * secondsToFull;
  const envGain = rates.environmentalAbsorption * secondsToFull;
  
  const fatigueResult = calculateMeditationFatigue(totalDurationSeconds / 60, 'breakthrough');
  
  return {
    success: true,
    qiGained: maxQi, // Переносим ВСЮ Ци (ядро было заполнено и опустошено)
    coreWasEmptied: true,
    duration: Math.ceil(totalDurationSeconds / 60),
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
 * Суть: ОДИН перенос Ци из ядра в расширение каналов меридиан
 * 
 * Особенности:
 * - Длительность АВТОМАТИЧЕСКАЯ: coreCapacity / проводимость секунд
 * - Если ядро НЕ полное: сначала накопление до 100%, затем перенос
 * - Если ядро ПОЛНОЕ: немедленный перенос
 * - ОДИН перенос за медитацию (не множественный)
 * - x1.5 ментальная усталость
 * - +1 к счётчику медитаций на проводимость при успехе
 * - НЕ прерывается внешними факторами
 * 
 * Скорость переноса: coreCapacity / текущая_проводимость секунд
 * (медленный процесс, расширяем каналы)
 * 
 * Пример: 1000 capacity / 3.0 conductivity = 333 секунды (~5.5 минут) на один перенос
 */
export function performConductivityMeditation(
  character: Character,
  location: LocationData | null,
  _intendedDurationMinutes: number, // Игнорируется - длительность автоматическая
  currentConductivityMeditations: number
): ConductivityMeditationResult {
  const maxQi = character.coreCapacity;
  const currentQi = character.currentQi;
  const currentConductivity = character.conductivity;
  
  // Расчёт скоростей накопления
  const rates = calculateQiRates(character, location);
  
  // === ФИКСИРОВАННАЯ ДЛИТЕЛЬНОСТЬ ПЕРЕНОСА ===
  // Время переноса = coreCapacity / проводимость секунд
  const secondsPerTransfer = Math.ceil(maxQi / currentConductivity);
  
  // === СЛУЧАЙ 1: Ядро уже полное ===
  if (currentQi >= maxQi) {
    // Полный перенос за secondsPerTransfer секунд
    const newConductivityMeditations = currentConductivityMeditations + 1;
    const newTotalConductivity = calculateTotalConductivity(
      character.coreCapacity, 
      character.cultivationLevel, 
      newConductivityMeditations
    );
    const fatigueResult = calculateMeditationFatigue(secondsPerTransfer / 60, 'conductivity');
    
    return {
      success: true,
      qiGained: maxQi, // Переносим ВСЮ Ци
      coreWasFilled: true,
      duration: Math.ceil(secondsPerTransfer / 60),
      fatigueGained: {
        physical: fatigueResult.physicalGain,
        mental: fatigueResult.mentalGain,
      },
      conductivityMeditationsGained: 1,
      newConductivityMeditations,
      newTotalConductivity,
      breakdown: {
        coreGeneration: 0, // При переносе нет выработки
        environmentalAbsorption: 0, // При переносе нет поглощения
      },
    };
  }
  
  // === СЛУЧАЙ 2: Ядро не полное ===
  // Сначала накапливаем до полного, затем переносим
  const qiToFull = maxQi - currentQi;
  const secondsToFull = Math.ceil(qiToFull / rates.total);
  const totalDurationSeconds = secondsToFull + secondsPerTransfer;
  
  // Расчёт breakdown (только для накопления)
  const coreGain = rates.coreGeneration * secondsToFull;
  const envGain = rates.environmentalAbsorption * secondsToFull;
  
  const newConductivityMeditations = currentConductivityMeditations + 1;
  const newTotalConductivity = calculateTotalConductivity(
    character.coreCapacity, 
    character.cultivationLevel, 
    newConductivityMeditations
  );
  const fatigueResult = calculateMeditationFatigue(totalDurationSeconds / 60, 'conductivity');
  
  return {
    success: true,
    qiGained: maxQi, // Переносим ВСЮ Ци (ядро было заполнено)
    coreWasFilled: true,
    duration: Math.ceil(totalDurationSeconds / 60),
    fatigueGained: {
      physical: fatigueResult.physicalGain,
      mental: fatigueResult.mentalGain,
    },
    conductivityMeditationsGained: 1,
    newConductivityMeditations,
    newTotalConductivity,
    breakdown: {
      coreGeneration: Math.floor(coreGain),
      environmentalAbsorption: Math.floor(envGain),
    },
  };
}

/**
 * Попытка прорыва
 * Вычисляет результат и возвращает данные для обновления
 * 
 * При прорыве:
 * - Проводимость умножается на conductivityMultiplier нового уровня
 */
export function attemptBreakthrough(
  character: Character
): BreakthroughResult & { newCoreCapacity: number; newConductivity: number } {
  return calculateBreakthroughResult(
    character.cultivationLevel,
    character.cultivationSubLevel,
    character.coreCapacity,
    character.accumulatedQi,
    character.conductivity
  );
}
