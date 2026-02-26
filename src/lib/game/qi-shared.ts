/**
 * Общие функции расчёта Ци
 * 
 * ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ для всех расчётов!
 * Используется и сервером, и клиентом (только для отображения).
 * 
 * ВАЖНО: Все изменения состояния происходят ТОЛЬКО на сервере!
 * Клиент использует эти функции только для ПРЕДПРОСМОТРА.
 */

import { QI_CONSTANTS, BREAKTHROUGH_CONSTANTS, MEDITATION_CONSTANTS, CULTIVATION_LEVEL_NAMES, QI_COSTS } from './constants';
import type { Character, BreakthroughRequirements, BreakthroughResult, QiRates } from '@/types/game';
import type { LocationData } from '@/types/game-shared';

// ==================== ОСНОВНЫЕ РАСЧЁТЫ ====================

/**
 * Расчёт скорости ВЫРАБОТКИ МИКРОЯДРОМ
 * Работает ВСЕГДА (пассивно)
 * @returns Ци в секунду
 */
export function calculateCoreGenerationRate(coreCapacity: number): number {
  const baseGeneration = coreCapacity * QI_CONSTANTS.CORE_GENERATION_RATE;
  return baseGeneration / QI_CONSTANTS.SECONDS_PER_DAY;
}

/**
 * Получить множитель проводимости для уровня культивации
 */
export function getConductivityMultiplier(cultivationLevel: number): number {
  return QI_CONSTANTS.CONDUCTIVITY_MULTIPLIERS[cultivationLevel] || 1.0;
}

/**
 * Расчёт скорости ПОГЛОЩЕНИЯ ИЗ СРЕДЫ
 * Работает ТОЛЬКО при медитации
 * @returns Ци в секунду
 */
export function calculateEnvironmentalAbsorptionRate(
  conductivity: number,
  qiDensity: number,
  cultivationLevel: number
): number {
  const levelMultiplier = getConductivityMultiplier(cultivationLevel);
  return (qiDensity * conductivity * levelMultiplier) / QI_CONSTANTS.SECONDS_PER_DAY;
}

/**
 * Полные скорости накопления Ци
 */
export function calculateQiRates(
  character: Pick<Character, 'coreCapacity' | 'conductivity' | 'cultivationLevel'>,
  location: LocationData | null
): QiRates {
  const coreGeneration = calculateCoreGenerationRate(character.coreCapacity);
  const qiDensity = location?.qiDensity || QI_CONSTANTS.DEFAULT_QI_DENSITY;
  const environmentalAbsorption = calculateEnvironmentalAbsorptionRate(
    character.conductivity,
    qiDensity,
    character.cultivationLevel
  );
  
  return {
    coreGeneration,
    environmentalAbsorption,
    total: coreGeneration + environmentalAbsorption,
  };
}

// ==================== РАСЧЁТ ВРЕМЕНИ ====================

/**
 * Расчёт времени до полного ядра (в секундах)
 */
export function calculateTimeToFull(
  currentQi: number,
  coreCapacity: number,
  rates: QiRates
): number {
  const deficit = coreCapacity - currentQi;
  
  if (deficit <= 0) return 0;
  if (rates.total <= 0) return Infinity;
  
  return Math.ceil(deficit / rates.total);
}

/**
 * Форматирование времени для отображения
 */
export function formatTime(seconds: number): string {
  if (seconds === Infinity) return '∞';
  if (seconds < 60) return `${seconds} сек`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин`;
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} ч ${minutes} мин`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days} дн ${hours} ч`;
}

// ==================== РАСЧЁТ ПРОРЫВА ====================

/**
 * Расчёт требований для прорыва
 */
export function calculateBreakthroughRequirements(
  cultivationLevel: number,
  cultivationSubLevel: number,
  accumulatedQi: number,
  coreCapacity: number
): BreakthroughRequirements {
  // Количество заполнений = уровень * 10 + подуровень
  // 1.0 = 10, 1.5 = 15, 6.5 = 65
  const requiredFills = cultivationLevel * BREAKTHROUGH_CONSTANTS.FILLS_PER_LEVEL + cultivationSubLevel;
  
  // Текущее накопление в "заполнениях ядра"
  const currentFills = Math.floor(accumulatedQi / coreCapacity);
  
  // Сколько ещё нужно
  const fillsNeeded = Math.max(0, requiredFills - currentFills);
  
  // Абсолютное значение Ци
  const requiredQi = requiredFills * coreCapacity;
  
  return {
    requiredFills,
    currentFills,
    fillsNeeded,
    requiredQi,
    currentAccumulated: accumulatedQi,
    canAttempt: currentFills >= requiredFills,
  };
}

/**
 * Получить название уровня культивации
 */
export function getCultivationLevelName(level: number): string {
  return CULTIVATION_LEVEL_NAMES[level] || 'Неизвестно';
}

/**
 * Расчёт результата попытки прорыва
 * ВНИМАНИЕ: Эта функция только ВЫЧИСЛЯЕТ результат, НЕ изменяет состояние!
 */
export function calculateBreakthroughResult(
  cultivationLevel: number,
  cultivationSubLevel: number,
  coreCapacity: number,
  accumulatedQi: number
): BreakthroughResult {
  const requirements = calculateBreakthroughRequirements(
    cultivationLevel,
    cultivationSubLevel,
    accumulatedQi,
    coreCapacity
  );
  
  if (!requirements.canAttempt) {
    return {
      success: false,
      newLevel: cultivationLevel,
      newSubLevel: cultivationSubLevel,
      newCoreCapacity: coreCapacity,
      qiConsumed: 0,
      fatigueGained: { physical: 5, mental: 20 },
      message: `Недостаточно накопленной Ци. Нужно: ${requirements.requiredFills} заполнений (${requirements.requiredQi} Ци), накоплено: ${requirements.currentFills} (${requirements.currentAccumulated} Ци). Осталось: ${requirements.fillsNeeded} заполнений.`,
    };
  }
  
  // Определяем тип прорыва (большой при subLevel >= 9)
  const isMajorBreakthrough = cultivationSubLevel >= 9;
  
  let newLevel = cultivationLevel;
  let newSubLevel = cultivationSubLevel;
  
  if (isMajorBreakthrough) {
    newLevel = cultivationLevel + 1;
    newSubLevel = 0;
  } else {
    newSubLevel = cultivationSubLevel + 1;
  }
  
  // Новая ёмкость ядра (+10%)
  const newCoreCapacity = Math.ceil(coreCapacity * BREAKTHROUGH_CONSTANTS.CORE_CAPACITY_MULTIPLIER);
  
  // Затраты накопленной Ци
  const qiConsumed = requirements.requiredQi;
  
  // Усталость от прорыва
  const fatigueGained = {
    physical: BREAKTHROUGH_CONSTANTS.FATIGUE.PHYSICAL_BASE,
    mental: isMajorBreakthrough 
      ? BREAKTHROUGH_CONSTANTS.FATIGUE.MENTAL_MAJOR 
      : BREAKTHROUGH_CONSTANTS.FATIGUE.MENTAL_MINOR,
  };
  
  const levelName = getCultivationLevelName(newLevel);
  const message = isMajorBreakthrough
    ? `🌟 Большой прорыв! Уровень ${newLevel} (${levelName})!`
    : `⬆️ Продвижение до ${newLevel}.${newSubLevel}`;
  
  return {
    success: true,
    newLevel,
    newSubLevel,
    newCoreCapacity,
    qiConsumed,
    fatigueGained,
    message,
  };
}

// ==================== РАСЧЁТ УСТАЛОСТИ ====================

/**
 * Расчёт усталости при медитации
 * Медитация = концентрация, даёт ментальную усталость
 * Физическая усталость НЕ меняется (сидячее положение)
 */
export function calculateMeditationFatigue(
  durationMinutes: number,
  type: 'accumulation' | 'breakthrough'
): { physicalGain: number; mentalGain: number } {
  // Физическая: не меняется (сидячее положение, тело отдыхает)
  const physicalGain = 0;
  
  // Ментальная: концентрация утомляет разум
  const baseMentalRate = MEDITATION_CONSTANTS.MENTAL_FATIGUE_RATE;
  const mentalMultiplier = type === 'breakthrough'
    ? MEDITATION_CONSTANTS.MENTAL_FATIGUE_BREAKTHROUGH_MULTIPLIER
    : 1.0;
  const mentalGain = durationMinutes * baseMentalRate * mentalMultiplier;
  
  return { physicalGain, mentalGain };
}

// ==================== РАСЧЁТ ЗАТРАТ ЦИ ====================

/**
 * Расчёт расхода Ци на действие
 */
export function calculateQiCost(action: string, cultivationLevel: number): number {
  const baseCost = QI_COSTS[action as keyof typeof QI_COSTS] || 10;
  
  // Модификатор от уровня (выше уровень = эффективнее)
  const levelModifier = 1 - (cultivationLevel - 1) * 0.05;
  
  return Math.ceil(baseCost * Math.max(0.5, levelModifier));
}

// ==================== ПАССИВНОЕ НАКОПЛЕНИЕ ====================

/**
 * Расчёт пассивного накопления Ци
 * ВНИМАНИЕ: Работает ТОЛЬКО выработка микроядром, до 90% ёмкости
 */
export function calculatePassiveQiGain(
  currentQi: number,
  coreCapacity: number,
  coreGenerationRate: number, // Ци/сек
  deltaTimeSeconds: number
): number {
  // Пассивное накопление только до 90%
  const passiveCap = coreCapacity * QI_CONSTANTS.PASSIVE_QI_CAP;
  
  if (currentQi >= passiveCap) {
    return 0; // Выше капа - нет пассивного накопления
  }
  
  const potentialGain = coreGenerationRate * deltaTimeSeconds;
  const actualGain = Math.min(potentialGain, passiveCap - currentQi);
  
  return Math.floor(actualGain);
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

/**
 * Проверка возможности медитации
 */
export function canMeditate(currentQi: number, coreCapacity: number): boolean {
  // Нельзя медитировать если ядро полное
  return currentQi < coreCapacity;
}

/**
 * Прогресс заполнения ядра (в процентах)
 */
export function getCoreFillPercent(currentQi: number, coreCapacity: number): number {
  return Math.round((currentQi / coreCapacity) * 100);
}

/**
 * Прогресс прорыва (сколько заполнений сделано)
 */
export function getBreakthroughProgress(
  cultivationLevel: number,
  cultivationSubLevel: number,
  accumulatedQi: number,
  coreCapacity: number
): { current: number; required: number; percent: number } {
  const requirements = calculateBreakthroughRequirements(
    cultivationLevel,
    cultivationSubLevel,
    accumulatedQi,
    coreCapacity
  );
  
  return {
    current: requirements.currentFills,
    required: requirements.requiredFills,
    percent: Math.round((requirements.currentFills / requirements.requiredFills) * 100),
  };
}
