/**
 * Общие функции расчёта Ци
 * 
 * ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ для всех расчётов!
 * Используется и сервером, и клиентом (только для отображения).
 * 
 * ВАЖНО: Все изменения состояния происходят ТОЛЬКО на сервере!
 * Клиент использует эти функции только для ПРЕДПРОСМОТРА.
 * 
 * @module qi-shared
 * @updated 2026-03-06 12:45 UTC
 */

import { QI_CONSTANTS, BREAKTHROUGH_CONSTANTS, MEDITATION_CONSTANTS, CULTIVATION_LEVEL_NAMES, QI_COSTS, MEDITATION_TYPE_CONSTANTS } from './constants';
import { calculateTotalConductivity } from './conductivity-system';
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
 * 
 * При прорыве:
 * - Проводимость пересчитывается ПОЛНОСТЬЮ с новой ёмкостью ядра
 */
export function calculateBreakthroughResult(
  cultivationLevel: number,
  cultivationSubLevel: number,
  coreCapacity: number,
  accumulatedQi: number,
  currentConductivity: number = 0,
  conductivityMeditations: number = 0
): BreakthroughResult & { newCoreCapacity: number; newConductivity: number } {
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
      newConductivity: currentConductivity,
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
  
  // === ПРОВОДИМОСТЬ ===
  // При прорыве проводимость пересчитывается ПОЛНОСТЬЮ
  // Формула: (новая_ёмкость / 360) * множитель_уровня + бонус_от_медитаций
  const newConductivity = calculateTotalConductivity(newCoreCapacity, newLevel, conductivityMeditations);
  
  const levelName = getCultivationLevelName(newLevel);
  let message = isMajorBreakthrough
    ? `🌟 Большой прорыв! Уровень ${newLevel} (${levelName})!`
    : `⬆️ Продвижение до ${newLevel}.${newSubLevel}`;
  
  // Добавляем информацию о проводимости если она изменилась
  if (newConductivity !== currentConductivity) {
    const changePercent = ((newConductivity - currentConductivity) / currentConductivity * 100).toFixed(0);
    message += `\n⚡ Проводимость: ${currentConductivity.toFixed(2)} → ${newConductivity.toFixed(2)} (${changePercent > 0 ? '+' : ''}${changePercent}%)`;
  }
  
  return {
    success: true,
    newLevel,
    newSubLevel,
    newCoreCapacity,
    newConductivity,
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
 * 
 * Типы медитации:
 * - accumulation: обычная накопительная (базовая усталость)
 * - breakthrough: на прорыв (x2 ментальная усталость)
 * - conductivity: на проводимость (x1.5 ментальная усталость)
 */
export function calculateMeditationFatigue(
  durationMinutes: number,
  type: 'accumulation' | 'breakthrough' | 'conductivity'
): { physicalGain: number; mentalGain: number } {
  // Физическая: не меняется (сидячее положение, тело отдыхает)
  const physicalGain = 0;
  
  // Ментальная: концентрация утомляет разум
  const baseMentalRate = MEDITATION_CONSTANTS.MENTAL_FATIGUE_RATE;
  
  let mentalMultiplier = 1.0;
  if (type === 'breakthrough') {
    mentalMultiplier = MEDITATION_TYPE_CONSTANTS.BREAKTHROUGH_MENTAL_FATIGUE_MULTIPLIER;
  } else if (type === 'conductivity') {
    mentalMultiplier = MEDITATION_TYPE_CONSTANTS.CONDUCTIVITY_MENTAL_FATIGUE_MULTIPLIER;
  }
  
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
 * 
 * @param currentQi - Текущее Ци в ядре
 * @param coreCapacity - Ёмкость ядра
 * @param type - Тип медитации (по умолчанию accumulation)
 * @returns Можно ли начать медитацию
 * 
 * Правила:
 * - accumulation: блокируется только при 100% заполнении
 * - breakthrough: доступен только при 90%+ заполнении (когда заканчивается естественное восстановление)
 * - conductivity: доступен только при 90%+ заполнении
 */
export function canMeditate(
  currentQi: number, 
  coreCapacity: number,
  type: 'accumulation' | 'breakthrough' | 'conductivity' = 'accumulation'
): { canMeditate: boolean; reason?: string } {
  const isFull = currentQi >= coreCapacity;
  const fillPercent = getCoreFillPercent(currentQi, coreCapacity);
  const isAbovePassiveCap = fillPercent >= (QI_CONSTANTS.PASSIVE_QI_CAP * 100); // 90%
  
  // Накопительная медитация блокируется при полном ядре
  if (type === 'accumulation' && isFull) {
    return {
      canMeditate: false,
      reason: '⚡ Ядро заполнено! Потратьте Ци (техники, бой) или используйте медитацию на прорыв/проводимость.'
    };
  }
  
  // Прорыв и проводимость доступны только при 90%+ заполнении
  if ((type === 'breakthrough' || type === 'conductivity') && !isAbovePassiveCap) {
    return {
      canMeditate: false,
      reason: `⚡ Медитация на ${type === 'breakthrough' ? 'прорыв' : 'проводимость'} доступна при заполнении ядра на 90%+. Текущее: ${fillPercent}%.`
    };
  }
  
  return { canMeditate: true };
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

// ==================== ПАССИВНОЕ РАССЕИВАНИЕ ЦИ ====================

/**
 * Результат пассивного рассеивания Ци
 */
export interface QiDissipationResult {
  /** Новое значение Ци после рассеивания */
  newQi: number;
  /** Сколько Ци рассеялось */
  dissipated: number;
  /** Было ли рассеивание */
  wasOvercharged: boolean;
}

/**
 * Расчёт пассивного рассеивания избыточной Ци
 * 
 * ЕДИНСТВЕННАЯ функция для рассеивания - работает при currentQi > coreCapacity.
 * Избыточная Ци "вытекает" через меридианы со скоростью проводимости.
 * 
 * @param currentQi - Текущее количество Ци
 * @param coreCapacity - Ёмкость ядра
 * @param conductivity - Проводимость (Ци/сек)
 * @param deltaTimeSeconds - Время в секундах
 * @returns Результат рассеивания
 * 
 * @example
 * // Переполненное ядро: 1974 Ци при ёмкости 1000
 * // Проводимость 3.61 Ци/сек, прошло 60 секунд (1 минута)
 * const result = calculatePassiveQiDissipation(1974, 1000, 3.61, 60);
 * // dissipated = min(1974 - 1000, 3.61 * 60) = min(974, 216.6) = 216.6
 * // newQi = 1974 - 216.6 = 1757.4
 */
export function calculatePassiveQiDissipation(
  currentQi: number,
  coreCapacity: number,
  conductivity: number,
  deltaTimeSeconds: number
): QiDissipationResult {
  // Если нет переполнения - нет рассеивания
  if (currentQi <= coreCapacity) {
    return {
      newQi: currentQi,
      dissipated: 0,
      wasOvercharged: false,
    };
  }
  
  // Избыточная Ци
  const excessQi = currentQi - coreCapacity;
  
  // Скорость рассеивания = проводимость (сколько Ци может "вытекать" в секунду)
  // Рассеивание происходит со скоростью проводимости
  const maxDissipation = conductivity * deltaTimeSeconds;
  
  // Рассеиваем не больше избытка
  const dissipated = Math.min(excessQi, maxDissipation);
  
  // Новое значение Ци
  const newQi = currentQi - dissipated;
  
  return {
    newQi: Math.max(coreCapacity, newQi), // Не опускаемся ниже ёмкости
    dissipated: Math.floor(dissipated),
    wasOvercharged: true,
  };
}
