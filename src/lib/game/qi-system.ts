/**
 * Система Ци - серверная математика
 * 
 * ДВА ИСТОЧНИКА ЦИ:
 * 1. Выработка микроядром - работает ВСЕГДА (пассивно, до 90% ядра)
 * 2. Поглощение из среды - ТОЛЬКО при активной медитации
 * 
 * Правила:
 * - Генерация микроядром: 10% от ёмкости ядра / сутки
 * - Поглощение: проводимость × плотность Ци локации (только медитация)
 * - Переполнение: при 100% ядра медитация прерывается (кроме прорыва)
 */

import type { Character, Location } from "@/hooks/useGame";
import { CULTIVATION_LEVELS, calculateBaseConductivity } from "@/data/cultivation-levels";

// Типы медитации
export type MeditationType = "accumulation" | "breakthrough";

// Результат медитации
export interface MeditationResult {
  success: boolean;
  qiGained: number;
  duration: number; // в минутах
  wasInterrupted: boolean;
  interruptionReason?: string;
  fatigueGained: {
    physical: number;
    mental: number;
  };
  breakdown?: {
    coreGeneration: number;
    environmentalAbsorption: number;
  };
}

// Константы
const SECONDS_PER_DAY = 86400;
const PASSIVE_QI_CAP = 0.9; // Пассивное накопление только до 90%

/**
 * Расчёт скорости ВЫРАБОТКИ МИКРОЯДРОМ
 * Работает ВСЕГДА (пассивно)
 * @returns Ци в секунду
 */
export function calculateCoreGenerationRate(character: Character): number {
  // Генерация микроядром: 10% от ёмкости / сутки
  const baseGeneration = character.coreCapacity * 0.1;
  return baseGeneration / SECONDS_PER_DAY; // Ци/секунду
}

/**
 * Расчёт скорости ПОГЛОЩЕНИЯ ИЗ СРЕДЫ
 * Работает ТОЛЬКО при медитации
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
  
  // Влияние уровня культивации
  const levelInfo = CULTIVATION_LEVELS.find(l => l.level === character.cultivationLevel);
  const levelMultiplier = levelInfo?.conductivityMultiplier || 1;
  
  // Формула: (плотность × проводимость × множитель) / секунд в сутках
  return (qiDensity * conductivity * levelMultiplier) / SECONDS_PER_DAY;
}

// Расчёт скорости накопления Ци (для совместимости)
export function calculateQiAccumulationRate(
  character: Character,
  location: Location | null
): number {
  const coreRate = calculateCoreGenerationRate(character);
  const envRate = calculateEnvironmentalAbsorptionRate(character, location);
  return coreRate + envRate;
}

// Расчёт времени до полного ядра
export function calculateTimeToFull(
  character: Character,
  location: Location | null
): number {
  const currentQi = character.currentQi;
  const maxQi = character.coreCapacity;
  const deficit = maxQi - currentQi;
  
  if (deficit <= 0) return 0;
  
  // Для расчёта времени используем полную скорость (как при медитации)
  const rate = calculateQiAccumulationRate(character, location);
  if (rate <= 0) return Infinity;
  
  return Math.ceil(deficit / rate); // секунды
}

// Выполнение медитации
export function performMeditation(
  character: Character,
  location: Location | null,
  intendedDuration: number, // в минутах
  type: MeditationType
): MeditationResult {
  const maxQi = character.coreCapacity;
  const currentQi = character.currentQi;
  
  let actualDuration = intendedDuration * 60; // переводим в секунды
  
  // === РАЗДЕЛЕНИЕ ИСТОЧНИКОВ ===
  // При медитации работают ОБА источника
  
  // 1. Выработка микроядром (ВСЕГДА)
  const coreRate = calculateCoreGenerationRate(character);
  let coreGain = coreRate * actualDuration;
  
  // 2. Поглощение из среды (ТОЛЬКО при медитации - а это медитация)
  const envRate = calculateEnvironmentalAbsorptionRate(character, location);
  let envGain = envRate * actualDuration;
  
  let totalGain = coreGain + envGain;
  let wasInterrupted = false;
  let interruptionReason: string | undefined;
  
  // Проверка переполнения для накопительной медитации
  if (type === "accumulation") {
    const qiToFull = maxQi - currentQi;
    
    if (qiToFull <= 0) {
      // Ядро уже полное
      return {
        success: false,
        qiGained: 0,
        duration: 0,
        wasInterrupted: true,
        interruptionReason: "Ядро уже полностью заполнено. Медитация невозможна.",
        fatigueGained: { physical: 0, mental: 0 },
        breakdown: { coreGeneration: 0, environmentalAbsorption: 0 },
      };
    }
    
    if (totalGain > qiToFull) {
      // Переполнение - прерываем медитацию
      // Пересчитываем время до заполнения
      const totalRate = coreRate + envRate;
      actualDuration = Math.ceil(qiToFull / totalRate);
      
      // Пересчитываем прирост по источникам
      coreGain = coreRate * actualDuration;
      envGain = envRate * actualDuration;
      totalGain = coreGain + envGain;
      
      // Округляем до точного заполнения
      totalGain = qiToFull;
      
      wasInterrupted = true;
      interruptionReason = "Ядро достигло максимальной ёмкости. Медитация прервана.";
    }
  }
  // Для прорыва - не ограничиваем
  
  // Расчёт усталости
  const durationMinutes = actualDuration / 60;
  const fatigueGained = calculateMeditationFatigue(durationMinutes, type);
  
  return {
    success: true,
    qiGained: Math.floor(totalGain),
    duration: Math.ceil(actualDuration / 60), // возвращаем в минутах
    wasInterrupted,
    interruptionReason,
    fatigueGained,
    breakdown: {
      coreGeneration: Math.floor(coreGain),
      environmentalAbsorption: Math.floor(envGain),
    },
  };
}

// Расчёт усталости от медитации
function calculateMeditationFatigue(
  durationMinutes: number,
  type: MeditationType
): { physical: number; mental: number } {
  // Физическая усталость: низкая (сидячее положение)
  const physical = durationMinutes * 0.05; // 3% за час
  
  // Ментальная усталость: зависит от типа
  // Накопление: средняя нагрузка
  // Прорыв: высокая нагрузка
  const mentalRate = type === "breakthrough" ? 0.2 : 0.1; // 12% или 6% за час
  const mental = durationMinutes * mentalRate;
  
  return {
    physical: Math.min(physical, 100),
    mental: Math.min(mental, 100),
  };
}

// Расчёт Ци для прорыва
export function calculateBreakthroughRequirements(
  character: Character,
  isMajorBreakthrough: boolean
): {
  requiredQi: number;
  currentAccumulated: number;
  deficit: number;
  canAttempt: boolean;
} {
  const requiredQi = character.coreCapacity * (isMajorBreakthrough ? 100 : 10);
  const currentAccumulated = character.accumulatedQi;
  const deficit = requiredQi - currentAccumulated;
  
  return {
    requiredQi,
    currentAccumulated,
    deficit: Math.max(0, deficit),
    canAttempt: deficit <= 0,
  };
}

// Попытка прорыва
export interface BreakthroughResult {
  success: boolean;
  newLevel: number;
  newSubLevel: number;
  newCoreCapacity: number;
  qiConsumed: number;
  fatigueGained: { physical: number; mental: number };
  message: string;
}

export function attemptBreakthrough(
  character: Character
): BreakthroughResult {
  const currentLevel = character.cultivationLevel;
  const currentSubLevel = character.cultivationSubLevel;
  
  // Определяем тип прорыва
  const isMajorBreakthrough = currentSubLevel >= 9;
  
  // Проверяем требования
  const requirements = calculateBreakthroughRequirements(character, isMajorBreakthrough);
  
  if (!requirements.canAttempt) {
    return {
      success: false,
      newLevel: currentLevel,
      newSubLevel: currentSubLevel,
      newCoreCapacity: character.coreCapacity,
      qiConsumed: 0,
      fatigueGained: { physical: 5, mental: 20 },
      message: `Недостаточно накопленной Ци для прорыва. Нужно: ${requirements.requiredQi}, накоплено: ${requirements.currentAccumulated}`,
    };
  }
  
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
  
  // Затраты Ци
  const qiConsumed = requirements.requiredQi;
  
  // Усталость от прорыва (высокая ментальная нагрузка)
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
      ? `Прорыв на ${newLevel} уровень культивации!`
      : `Продвижение до ${newLevel}.${newSubLevel}`,
  };
}

// Расчёт расхода Ци на действие
export function calculateQiCost(
  action: string,
  character: Character
): number {
  // Базовые затраты на разные действия
  const costMap: Record<string, number> = {
    // Боевые техники
    "basic_strike": 5,
    "qi_blast": 20,
    "qi_shield": 15,
    "enhanced_movement": 10,
    
    // Культивация
    "basic_technique": 5,
    "intermediate_technique": 15,
    "advanced_technique": 30,
    
    // Восстановление
    "healing_minor": 10,
    "healing_major": 50,
    
    // Усиление
    "sensory_enhancement": 5,
    "speed_boost": 20,
    "strength_boost": 20,
  };
  
  const baseCost = costMap[action] || 10;
  
  // Модификатор от уровня (выше уровень = эффективнее)
  const levelModifier = 1 - (character.cultivationLevel - 1) * 0.05;
  
  return Math.ceil(baseCost * Math.max(0.5, levelModifier));
}

// Автоматическое накопление Ци (для фонового процесса)
// Внимание: работает ТОЛЬКО выработка микроядром, до 90% ёмкости
export function calculatePassiveQiGain(
  character: Character,
  location: Location | null,
  deltaTimeSeconds: number
): number {
  const maxQi = character.coreCapacity;
  const currentQi = character.currentQi;
  
  // Пассивное накопление только до 90%
  const passiveCap = maxQi * PASSIVE_QI_CAP;
  
  if (currentQi >= passiveCap) {
    return 0; // Выше капа - нет пассивного накопления
  }
  
  // Только выработка микроядром (БЕЗ поглощения из среды)
  const coreRate = calculateCoreGenerationRate(character);
  const potentialGain = coreRate * deltaTimeSeconds;
  const actualGain = Math.min(potentialGain, passiveCap - currentQi);
  
  return Math.floor(actualGain);
}
