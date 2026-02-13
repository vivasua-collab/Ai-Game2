/**
 * Система Ци - серверная логика
 * 
 * ВНИМАНИЕ: Вся логика расчётов находится в qi-shared.ts!
 * Этот файл содержит только серверные действия (meditation, breakthrough)
 * которые применяют расчёты к персонажу и базе данных.
 * 
 * ИСТОЧНИК ИСТИНЫ: Сервер - единственный источник данных о состоянии!
 */

import type { Character, Location, MeditationResult, BreakthroughResult } from '@/types/game';
import {
  calculateCoreGenerationRate,
  calculateEnvironmentalAbsorptionRate,
  calculateBreakthroughRequirements,
  calculateBreakthroughResult,
  calculateMeditationFatigue,
  calculateQiRates,
  getCultivationLevelName,
} from './qi-shared';
import { QI_CONSTANTS } from './constants';

// ==================== СЕРВЕРНЫЕ ДЕЙСТВИЯ ====================

/**
 * Выполнение медитации
 * Вычисляет результат и возвращает данные для обновления
 */
export function performMeditation(
  character: Character,
  location: Location | null,
  intendedDurationMinutes: number,
  type: 'accumulation' | 'breakthrough'
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
  
  // Расчёт снятия усталости (медитация = отдых)
  const fatigueRelief = calculateMeditationFatigue(actualDurationSeconds / 60, type);
  
  return {
    success: true,
    qiGained: Math.floor(totalGain),
    accumulatedQiGained,
    coreWasFilled,
    duration: Math.ceil(actualDurationSeconds / 60),
    wasInterrupted,
    interruptionReason,
    fatigueGained: {
      physical: fatigueRelief.physicalRelief,
      mental: fatigueRelief.mentalRelief,
    },
    breakdown: {
      coreGeneration: Math.floor(coreGain),
      environmentalAbsorption: Math.floor(envGain),
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

// ==================== ЭКСПОРТ ОБЩИХ ФУНКЦИЙ ====================
// Для обратной совместимости, но все должны использовать qi-shared

export {
  calculateCoreGenerationRate,
  calculateEnvironmentalAbsorptionRate,
  calculateQiRates,
  calculateBreakthroughRequirements,
  getCultivationLevelName,
  calculateMeditationFatigue,
  calculateQiCost,
  calculatePassiveQiGain,
} from './qi-shared';

// ==================== УСТАРЕВШИЕ ФУНКЦИИ (для совместимости) ====================

/**
 * @deprecated Используйте calculateQiRates из qi-shared
 */
export function calculateQiAccumulationRate(
  character: Character,
  location: Location | null
): number {
  const rates = calculateQiRates(character, location);
  return rates.total;
}

/**
 * @deprecated Используйте calculateTimeToFull из qi-shared
 */
export function calculateTimeToFull(
  character: Character,
  location: Location | null
): number {
  const rates = calculateQiRates(character, location);
  const deficit = character.coreCapacity - character.currentQi;
  
  if (deficit <= 0) return 0;
  if (rates.total <= 0) return Infinity;
  
  return Math.ceil(deficit / rates.total);
}
