/**
 * Система Ци - клиентская математика
 * 
 * Правила:
 * - Генерация микроядром: 10% от ёмкости ядра / сутки
 * - Влияние локации: плотность Ци × проводимость
 * - Переполнение: при 100% ядра медитация прерывается
 * - Прорыв: не прерывается при переполнении
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
}

// Расчёт скорости накопления Ци
export function calculateQiAccumulationRate(
  character: Character,
  location: Location | null
): number {
  // Базовая генерация микроядром: 10% от ёмкости / сутки
  const baseGeneration = character.coreCapacity * 0.1;
  
  // Проводимость персонажа (ед/сек)
  const conductivity = character.conductivity;
  
  // Плотность Ци локации (ед/м³)
  const qiDensity = location?.qiDensity || 20; // дефолт 20
  
  // Влияние уровня культивации
  const levelInfo = CULTIVATION_LEVELS.find(l => l.level === character.cultivationLevel);
  const levelMultiplier = levelInfo?.conductivityMultiplier || 1;
  
  // Формула: база + (плотность × проводимость × множитель уровня) / 86400 (секунд в сутках)
  // Результат: Ци/секунду
  const environmentalAbsorption = (qiDensity * conductivity * levelMultiplier) / 86400;
  
  // Общая скорость: базовая генерация + поглощение из окружения
  const totalRate = (baseGeneration / 86400) + environmentalAbsorption;
  
  return totalRate; // Ци в секунду
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
  const rate = calculateQiAccumulationRate(character, location); // Ци/сек
  const maxQi = character.coreCapacity;
  const currentQi = character.currentQi;
  
  let actualDuration = intendedDuration * 60; // переводим в секунды
  let qiGained = 0;
  let wasInterrupted = false;
  let interruptionReason: string | undefined;
  
  // Расчёт Ци за полную длительность
  const potentialQiGain = rate * actualDuration;
  
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
      };
    }
    
    if (potentialQiGain > qiToFull) {
      // Переполнение - прерываем медитацию
      actualDuration = Math.ceil(qiToFull / rate);
      qiGained = qiToFull;
      wasInterrupted = true;
      interruptionReason = "Ядро достигло максимальной ёмкости. Медитация прервана.";
    } else {
      qiGained = potentialQiGain;
    }
  } else {
    // Медитация для прорыва - не прерывается
    qiGained = potentialQiGain;
  }
  
  // Расчёт усталости
  const durationMinutes = actualDuration / 60;
  const fatigueGained = calculateMeditationFatigue(durationMinutes, type);
  
  return {
    success: true,
    qiGained: Math.floor(qiGained),
    duration: Math.ceil(actualDuration / 60), // возвращаем в минутах
    wasInterrupted,
    interruptionReason,
    fatigueGained,
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
export function calculatePassiveQiGain(
  character: Character,
  location: Location | null,
  deltaTimeSeconds: number
): number {
  const rate = calculateQiAccumulationRate(character, location);
  const maxQi = character.coreCapacity;
  const currentQi = character.currentQi;
  
  // Пассивное накопление только до 90% ёмкости
  const passiveCap = maxQi * 0.9;
  
  if (currentQi >= passiveCap) {
    return 0; // Выше капа - нет пассивного накопления
  }
  
  const potentialGain = rate * deltaTimeSeconds;
  const actualGain = Math.min(potentialGain, passiveCap - currentQi);
  
  return Math.floor(actualGain);
}
