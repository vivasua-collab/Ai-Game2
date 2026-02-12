/**
 * Система Ци - серверная математика
 * 
 * ДВА ИСТОЧНИКА ЦИ:
 * 1. Выработка микроядром - работает ВСЕГДА (пассивно, до 90% ядра)
 * 2. Поглощение из среды - ТОЛЬКО при активной медитации
 * 
 * МЕХАНИКА ПРОРЫВА:
 * - accumulatedQi растёт только при заполнении ядра до 100%
 * - При 100% ядра: currentQi → 0, accumulatedQi += coreCapacity
 * - Прорыв возможен когда accumulatedQi >= 10 × coreCapacity
 * 
 * Правила:
 * - Генерация микроядром: 10% от ёмкости ядра / сутки
 * - Поглощение: проводимость × плотность Ци локации (только медитация)
 */

import type { Character, Location } from "@/hooks/useGame";
import { CULTIVATION_LEVELS, calculateBaseConductivity } from "@/data/cultivation-levels";

// Типы медитации
export type MeditationType = "accumulation" | "breakthrough";

// Результат медитации
export interface MeditationResult {
  success: boolean;
  qiGained: number;
  accumulatedQiGained: number; // Сколько перенесено в накопление для прорыва
  coreWasFilled: boolean; // Ядро было заполнено до 100%
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
  
  // === МЕХАНИКА НАКОПЛЕНИЯ ДЛЯ ПРОРЫВА ===
  // accumulatedQi растёт при ПОЛНОМ заполнении ядра
  // Ядро остаётся полным, игрок должен ПОТРАТИТЬ Ци перед следующей медитацией
  let accumulatedQiGained = 0;
  let coreWasFilled = false;
  
  if (type === "accumulation") {
    const qiToFull = maxQi - currentQi;
    
    if (qiToFull <= 0) {
      // Ядро уже полное - НЕ медитируем!
      // Игрок должен ПОТРАТИТЬ Ци (техники, бой) или попытаться прорваться
      return {
        success: false,
        qiGained: 0,
        accumulatedQiGained: 0,
        coreWasFilled: false,
        duration: 0,
        wasInterrupted: true,
        interruptionReason: "⚡ Ядро заполнено! Потратьте Ци (техники, бой) чтобы продолжить накопление, или попытайтесь прорваться.",
        fatigueGained: { physical: 0, mental: 0 },
        breakdown: { coreGeneration: 0, environmentalAbsorption: 0 },
      };
    }
    
    if (totalGain >= qiToFull) {
      // Ядро будет заполнено! 
      // currentQi = maxQi (остаётся полным!)
      // accumulatedQi += maxQi (добавляем к накоплению)
      coreWasFilled = true;
      accumulatedQiGained = maxQi;
      totalGain = qiToFull; // Точно до заполнения, не больше
      
      // Пересчитываем время до заполнения
      const totalRate = coreRate + envRate;
      actualDuration = Math.ceil(qiToFull / totalRate);
      
      // Пересчитываем прирост по источникам (для статистики)
      coreGain = coreRate * actualDuration;
      envGain = envRate * actualDuration;
      
      wasInterrupted = true;
      interruptionReason = "⚡ Ядро заполнено! Потратьте Ци чтобы продолжить накопление.";
    }
  }
  // Для прорыва - не ограничиваем и не переносим
  
  // Расчёт усталости
  const durationMinutes = actualDuration / 60;
  const fatigueGained = calculateMeditationFatigue(durationMinutes, type);
  
  return {
    success: true,
    qiGained: Math.floor(totalGain),
    accumulatedQiGained,
    coreWasFilled,
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

// Расчёт снятия усталости при медитации
// Медитация = отдых, поэтому снимает усталость
function calculateMeditationFatigue(
  durationMinutes: number,
  type: MeditationType
): { physical: number; mental: number } {
  // Медитация СНИМАЕТ усталость (это отдых!)
  // Физическая: сидячее положение, расслабление
  const physicalRelief = durationMinutes * 0.1; // -6% за час
  
  // Ментальная: глубокая концентрация, покой
  // Накопление: хороший отдых
  // Прорыв: меньше отдыха (напряжение)
  const mentalRate = type === "breakthrough" ? 0.05 : 0.15; // -3% или -9% за час
  const mentalRelief = durationMinutes * mentalRate;
  
  return {
    physical: physicalRelief, // Положительное значение = сколько снимется
    mental: mentalRelief,
  };
}

// Расчёт Ци для прорыва
// НОВАЯ ЛОГИКА: количество циклов = уровень культивации
// 1.0 = 10 циклов, 6.5 = 65 циклов
export function calculateBreakthroughRequirements(
  character: Character
): {
  requiredFills: number;      // Сколько заполнений нужно (level*10 + subLevel)
  currentFills: number;       // Сколько уже накоплено (в "заполнениях")
  fillsNeeded: number;        // Сколько ещё осталось
  requiredQi: number;         // Сколько Ци нужно
  currentAccumulated: number; // Сколько накоплено
  canAttempt: boolean;
} {
  const currentLevel = character.cultivationLevel;
  const currentSubLevel = character.cultivationSubLevel;
  
  // Количество заполнений = уровень * 10 + подуровень
  // 1.0 = 10, 1.5 = 15, 6.5 = 65
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
      message: `Недостаточно накопленной Ци. Нужно: ${requirements.requiredFills} заполнений (${requirements.requiredQi} Ци), накоплено: ${requirements.currentFills} (${requirements.currentAccumulated} Ци). Осталось: ${requirements.fillsNeeded} заполнений.`,
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
  
  // Затраты накопленной Ци (сбрасываем накопление)
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
      ? `🌟 Большой прорыв! Уровень ${newLevel} (${getCultivationLevelName(newLevel)})!`
      : `⬆️ Продвижение до ${newLevel}.${newSubLevel}`,
  };
}

// Вспомогательная функция для названия уровня
function getCultivationLevelName(level: number): string {
  const names = [
    '', 'Пробуждённое Ядро', 'Течение Жизни', 'Пламя Внутреннего Огня',
    'Объединение Тела и Духа', 'Сердце Небес', 'Разрыв Пелены',
    'Вечное Кольцо', 'Глас Небес', 'Бессмертное Ядро', 'Вознесение'
  ];
  return names[level] || 'Неизвестно';
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
