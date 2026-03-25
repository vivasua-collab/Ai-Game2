/**
 * Система порогов развития характеристик
 *
 * Версия: 1.0
 * Источник: docs/stat-threshold-system.md
 *
 * Концепция:
 * Чем выше характеристика, тем больше виртуальной дельты нужно для повышения.
 * Аналогия с ядром культивации: чем больше сосуд, тем больше наполнять.
 *
 * Формула: threshold = floor(currentStat / 10), минимум 1.0
 *
 * Примеры:
 * - Стат 10: порог 1.0 (нужно 1.0 дельты для +1)
 * - Стат 20: порог 2.0 (нужно 2.0 дельты для +1)
 * - Стат 50: порог 5.0 (нужно 5.0 дельты для +1)
 * - Стат 100: порог 10.0 (нужно 10.0 дельты для +1)
 */

import type {
  StatDevelopment,
  AdvanceResult,
  StatProgressInfo,
  StatName,
  CharacterStatsDevelopment,
} from '@/types/stat-development';

import { STAT_DEVELOPMENT_CONSTANTS } from './constants';

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Вычисляет порог развития для характеристики
 *
 * Формула: threshold = floor(currentStat / 10), минимум 1.0
 *
 * @param currentStat Текущее значение характеристики
 * @returns Требуемая виртуальная дельта для повышения на +1
 *
 * @example
 * calculateStatThreshold(10)  // 1.0
 * calculateStatThreshold(15)  // 1.0
 * calculateStatThreshold(20)  // 2.0
 * calculateStatThreshold(25)  // 2.0
 * calculateStatThreshold(50)  // 5.0
 * calculateStatThreshold(100) // 10.0
 */
export function calculateStatThreshold(currentStat: number): number {
  const divisor = STAT_DEVELOPMENT_CONSTANTS.THRESHOLD_DIVISOR;
  const minThreshold = STAT_DEVELOPMENT_CONSTANTS.MIN_THRESHOLD;

  return Math.max(minThreshold, Math.floor(currentStat / divisor));
}

/**
 * Вычисляет прогресс до следующего повышения
 *
 * @param stat Характеристика с развитием
 * @returns Прогресс от 0 до 1 (0-100%)
 */
export function getStatProgress(stat: StatDevelopment): number {
  if (stat.threshold <= 0) return 0;
  return Math.min(1, stat.virtualDelta / stat.threshold);
}

/**
 * Проверяет возможность повышения характеристики
 *
 * @param stat Характеристика с развитием
 * @returns true если виртуальной дельты достаточно для повышения
 */
export function canAdvanceStat(stat: StatDevelopment): boolean {
  return stat.virtualDelta >= stat.threshold;
}

/**
 * Выполняет повышение характеристики (одно)
 *
 * Важно: Эта функция НЕ изменяет исходный объект.
 * Она возвращает результат, который нужно применить.
 *
 * @param stat Характеристика с развитием
 * @returns Результат повышения или null если невозможно
 */
export function advanceStat(stat: StatDevelopment): AdvanceResult | null {
  if (!canAdvanceStat(stat)) {
    return null;
  }

  const thresholdUsed = stat.threshold;
  const newValue = stat.current + 1;
  const remainingDelta = stat.virtualDelta - thresholdUsed;
  const newThreshold = calculateStatThreshold(newValue);

  return {
    newValue,
    remainingDelta,
    thresholdUsed,
    newThreshold,
  };
}

/**
 * Выполняет все возможные повышения
 *
 * Используется когда накоплено много виртуальной дельты.
 * Возвращает массив результатов для каждого повышения.
 *
 * @param stat Характеристика с развитием
 * @returns Массив результатов повышений (пустой если нет повышений)
 */
export function advanceStatAll(stat: StatDevelopment): AdvanceResult[] {
  const results: AdvanceResult[] = [];
  let currentStat = stat.current;
  let currentDelta = stat.virtualDelta;
  let currentThreshold = stat.threshold;

  while (currentDelta >= currentThreshold) {
    const newValue = currentStat + 1;
    const remainingDelta = currentDelta - currentThreshold;
    const newThreshold = calculateStatThreshold(newValue);

    results.push({
      newValue,
      remainingDelta,
      thresholdUsed: currentThreshold,
      newThreshold,
    });

    // Обновляем для следующей итерации
    currentStat = newValue;
    currentDelta = remainingDelta;
    currentThreshold = newThreshold;

    // Защита от бесконечного цикла (более 100 повышений за раз — нереально)
    if (results.length > 100) {
      console.warn('[stat-threshold] Too many advancements, breaking loop');
      break;
    }
  }

  return results;
}

// ==================== ИНФОРМАЦИОННЫЕ ФУНКЦИИ ====================

/**
 * Получает полную информацию о прогрессе характеристики
 *
 * @param stat Характеристика с развитием
 * @param dailyConsolidationRate Ежедневное закрепление (по умолчанию 0.20)
 * @param activeDaysRatio Процент активных дней (по умолчанию 0.75)
 */
export function getStatProgressInfo(
  stat: StatDevelopment,
  dailyConsolidationRate: number = STAT_DEVELOPMENT_CONSTANTS.MAX_CONSOLIDATION_PER_SLEEP,
  activeDaysRatio: number = 0.75
): StatProgressInfo {
  const progress = getStatProgress(stat);
  const effectiveDailyRate = dailyConsolidationRate * activeDaysRatio;

  // Сколько ещё дельты нужно для повышения
  const deltaNeeded = Math.max(0, stat.threshold - stat.virtualDelta);

  // Прогноз дней до повышения
  const estimatedDays =
    deltaNeeded > 0 ? Math.ceil(deltaNeeded / effectiveDailyRate) : 0;

  const estimatedActiveDays = Math.ceil(estimatedDays * activeDaysRatio);

  return {
    current: stat.current,
    threshold: stat.threshold,
    progress,
    virtualDelta: stat.virtualDelta,
    estimatedDaysToAdvance: estimatedDays,
    estimatedActiveDaysToAdvance: estimatedActiveDays,
  };
}

/**
 * Вычисляет количество дней для повышения с X на X+1
 *
 * @param currentStat Текущее значение
 * @param dailyConsolidationRate Ежедневное закрепление
 * @param activeDaysRatio Процент активных дней
 */
export function daysToAdvance(
  currentStat: number,
  dailyConsolidationRate: number = STAT_DEVELOPMENT_CONSTANTS.MAX_CONSOLIDATION_PER_SLEEP,
  activeDaysRatio: number = 0.75
): number {
  const threshold = calculateStatThreshold(currentStat);
  const effectiveDaily = dailyConsolidationRate * activeDaysRatio;
  return Math.ceil(threshold / effectiveDaily);
}

/**
 * Вычисляет, сколько дней нужно для достижения целевого стата
 *
 * @param startStat Начальное значение
 * @param targetStat Целевое значение
 * @param dailyConsolidationRate Ежедневное закрепление
 */
export function daysToReachStat(
  startStat: number,
  targetStat: number,
  dailyConsolidationRate: number = STAT_DEVELOPMENT_CONSTANTS.MAX_CONSOLIDATION_PER_SLEEP
): number {
  if (targetStat <= startStat) return 0;

  let totalDays = 0;

  for (
    let stat = Math.floor(startStat);
    stat < Math.floor(targetStat);
    stat++
  ) {
    totalDays += daysToAdvance(stat, dailyConsolidationRate);
  }

  return totalDays;
}

// ==================== ТАБЛИЦА ПОРОГОВ ====================

/**
 * Генерирует таблицу порогов для отображения
 *
 * @param fromStat Начальный стат
 * @param toStat Конечный стат
 */
export function generateThresholdTable(
  fromStat: number = 10,
  toStat: number = 100
): Array<{ stat: number; threshold: number; daysToNext: number }> {
  const table: Array<{
    stat: number;
    threshold: number;
    daysToNext: number;
  }> = [];

  for (let stat = fromStat; stat <= toStat; stat++) {
    table.push({
      stat,
      threshold: calculateStatThreshold(stat),
      daysToNext: daysToAdvance(stat),
    });
  }

  return table;
}

// ==================== УТИЛИТЫ ====================

/**
 * Создаёт начальную структуру развития характеристики
 *
 * @param startValue Начальное значение (по умолчанию 10)
 */
export function createInitialStatDevelopment(
  startValue: number = 10
): StatDevelopment {
  return {
    current: startValue,
    virtualDelta: 0,
    threshold: calculateStatThreshold(startValue),
  };
}

/**
 * Создаёт начальную структуру для всех характеристик
 */
export function createInitialStatsDevelopment(): CharacterStatsDevelopment {
  return {
    strength: createInitialStatDevelopment(10),
    agility: createInitialStatDevelopment(10),
    intelligence: createInitialStatDevelopment(10),
    vitality: createInitialStatDevelopment(10),
  };
}

/**
 * Применяет результат повышения к характеристике
 *
 * @param stat Исходная характеристика
 * @param result Результат повышения
 * @returns Новая характеристика (иммутабельно)
 */
export function applyAdvancement(
  stat: StatDevelopment,
  result: AdvanceResult
): StatDevelopment {
  return {
    ...stat,
    current: result.newValue,
    virtualDelta: result.remainingDelta,
    threshold: result.newThreshold,
  };
}

/**
 * Применяет все повышения к характеристике
 *
 * @param stat Исходная характеристика
 * @param results Массив результатов повышений
 * @returns Новая характеристика (иммутабельно)
 */
export function applyAllAdvancements(
  stat: StatDevelopment,
  results: AdvanceResult[]
): StatDevelopment {
  if (results.length === 0) return stat;

  // Берём последнее значение из результатов
  const lastResult = results[results.length - 1];

  return {
    ...stat,
    current: lastResult.newValue,
    virtualDelta: lastResult.remainingDelta,
    threshold: lastResult.newThreshold,
  };
}

/**
 * Сериализует CharacterStatsDevelopment для хранения в БД
 */
export function serializeStatsDevelopment(stats: CharacterStatsDevelopment): string {
  return JSON.stringify(stats);
}

/**
 * Десериализует CharacterStatsDevelopment из БД
 */
export function deserializeStatsDevelopment(data: string): CharacterStatsDevelopment {
  try {
    const parsed = JSON.parse(data);

    // Валидация и заполнение значений по умолчанию
    const defaultStats = createInitialStatsDevelopment();

    return {
      strength: { ...defaultStats.strength, ...parsed.strength },
      agility: { ...defaultStats.agility, ...parsed.agility },
      intelligence: {
        ...defaultStats.intelligence,
        ...parsed.intelligence,
      },
      vitality: { ...defaultStats.vitality, ...parsed.vitality },
    };
  } catch (error) {
    console.error('[stat-threshold] Failed to parse stats:', error);
    return createInitialStatsDevelopment();
  }
}

/**
 * Вычисляет общее количество повышений для достижения стата
 *
 * @param targetStat Целевой стат
 * @param startStat Начальный стат
 * @returns Количество повышений
 */
export function advancementsToReachStat(
  targetStat: number,
  startStat: number = 10
): number {
  return Math.max(0, Math.floor(targetStat) - Math.floor(startStat));
}

/**
 * Вычисляет общую дельту, необходимую для достижения стата
 *
 * @param targetStat Целевой стат
 * @param startStat Начальный стат
 * @returns Общая виртуальная дельта
 */
export function totalDeltaToReachStat(
  targetStat: number,
  startStat: number = 10
): number {
  if (targetStat <= startStat) return 0;

  let totalDelta = 0;

  for (let stat = Math.floor(startStat); stat < Math.floor(targetStat); stat++) {
    totalDelta += calculateStatThreshold(stat);
  }

  return totalDelta;
}
