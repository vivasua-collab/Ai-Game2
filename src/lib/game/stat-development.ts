/**
 * Система развития характеристик — виртуальная дельта
 *
 * Версия: 1.0
 * Источник: docs/body-development-analysis.md
 *
 * Механика:
 * - Виртуальная дельта — временное накопление прогресса
 * - Закрепляется при сне
 * - Источники: бой, тренировка, труд, медитация
 *
 * Ключевые параметры:
 * - Прирост за действие: 0.001
 * - Кап закрепления за сон: +0.20
 */

import type {
  StatDevelopment,
  CharacterStatsDevelopment,
  AddDeltaResult,
  ConsolidationResult,
  SleepConsolidationResult,
  DeltaSource,
  DeltaGeneratingAction,
  StatName,
} from '@/types/stat-development';

import {
  calculateStatThreshold,
  advanceStatAll,
  applyAllAdvancements,
  createInitialStatsDevelopment,
} from './stat-threshold';

import { STAT_DEVELOPMENT_CONSTANTS } from './constants';

// ==================== ДОБАВЛЕНИЕ ДЕЛЬТЫ ====================

/**
 * Добавляет виртуальную дельту к характеристике
 *
 * Автоматически обрабатывает повышения если дельты достаточно.
 *
 * @param stat Характеристика для обновления
 * @param amount Количество дельты
 * @param source Источник дельты
 * @returns Результат добавления с возможными повышениями
 */
export function addVirtualDelta(
  stat: StatDevelopment,
  amount: number,
  source: DeltaSource
): AddDeltaResult {
  // Добавляем дельту
  const newDelta = stat.virtualDelta + amount;

  // Проверяем повышения
  const advancements = advanceStatAll({
    ...stat,
    virtualDelta: newDelta,
  });

  if (advancements.length === 0) {
    // Нет повышений
    return {
      stat: {
        ...stat,
        virtualDelta: newDelta,
        lastDeltaSource: source,
      },
      addedDelta: amount,
      advanced: false,
      advancementCount: 0,
    };
  }

  // Применяем все повышения
  const updatedStat = applyAllAdvancements(
    { ...stat, virtualDelta: newDelta },
    advancements
  );

  return {
    stat: {
      ...updatedStat,
      lastDeltaSource: source,
    },
    addedDelta: amount,
    advanced: true,
    advancementCount: advancements.length,
  };
}

/**
 * Добавляет дельту к конкретной характеристике
 *
 * @param stats Все характеристики
 * @param targetStat Целевая характеристика
 * @param amount Количество
 * @param source Источник
 */
export function addDeltaToStats(
  stats: CharacterStatsDevelopment,
  targetStat: StatName,
  amount: number,
  source: DeltaSource
): {
  stats: CharacterStatsDevelopment;
  result: AddDeltaResult;
} {
  const result = addVirtualDelta(stats[targetStat], amount, source);

  return {
    stats: {
      ...stats,
      [targetStat]: result.stat,
    },
    result,
  };
}

// ==================== РАСЧЁТ ДЕЛЬТЫ ОТ ДЕЙСТВИЙ ====================

/**
 * Вычисляет дельту от действия
 *
 * Учитывает интенсивность, модификаторы от техник, экипировки и усталости.
 *
 * @param action Действие, генерирующее дельту
 * @returns Количество виртуальной дельты
 */
export function calculateDeltaFromAction(action: DeltaGeneratingAction): number {
  const sources = STAT_DEVELOPMENT_CONSTANTS.DELTA_SOURCES;
  let baseDelta = sources[action.type] ?? 0;

  // Применяем интенсивность
  baseDelta *= action.intensity;

  // Применяем модификаторы
  if (action.modifiers) {
    const { techniqueMultiplier, equipmentMultiplier, fatiguePenalty } =
      action.modifiers;

    if (techniqueMultiplier) {
      baseDelta *= techniqueMultiplier;
    }

    if (equipmentMultiplier) {
      baseDelta *= equipmentMultiplier;
    }

    if (fatiguePenalty !== undefined) {
      baseDelta *= fatiguePenalty;
    }
  }

  return baseDelta;
}

/**
 * Рассчитывает штраф от усталости
 *
 * При 50% усталости: ~75% эффективности
 * При 80% усталости: ~36% эффективности
 * При 100% усталости: 0% эффективности
 *
 * @param physicalFatigue Физическая усталость (0-100)
 * @param mentalFatigue Ментальная усталость (0-100)
 * @returns Коэффициент эффективности (0-1)
 */
export function calculateFatiguePenalty(
  physicalFatigue: number,
  mentalFatigue: number
): number {
  const physicalEfficiency = 1 - Math.pow(physicalFatigue, 2) / 10000;
  const mentalEfficiency = 1 - Math.pow(mentalFatigue, 2) / 10000;

  // Средняя эффективность
  return (physicalEfficiency + mentalEfficiency) / 2;
}

// ==================== ИСТОЧНИКИ ДЕЛЬТЫ ====================

/**
 * Генерирует дельту для боевого удара
 */
export function generateCombatHitAction(
  targetStat: StatName = 'strength',
  isBlocked: boolean = false,
  modifiers?: DeltaGeneratingAction['modifiers']
): DeltaGeneratingAction {
  return {
    type: isBlocked ? 'combat_block' : 'combat_hit',
    intensity: 1.0,
    targetStat,
    modifiers,
  };
}

/**
 * Генерирует дельту для уклонения
 */
export function generateCombatDodgeAction(
  modifiers?: DeltaGeneratingAction['modifiers']
): DeltaGeneratingAction {
  return {
    type: 'combat_dodge',
    intensity: 1.0,
    targetStat: 'agility',
    modifiers,
  };
}

/**
 * Генерирует дельту для физического труда
 */
export function generateLaborAction(
  durationMinutes: number,
  intensity: number = 1.0,
  targetStat: StatName = 'strength',
  modifiers?: DeltaGeneratingAction['modifiers']
): DeltaGeneratingAction {
  return {
    type: 'physical_labor',
    intensity: intensity * durationMinutes,
    targetStat,
    modifiers,
  };
}

/**
 * Генерирует дельту для медитации (интеллект)
 */
export function generateMeditationAction(
  durationMinutes: number,
  modifiers?: DeltaGeneratingAction['modifiers']
): DeltaGeneratingAction {
  return {
    type: 'meditation',
    intensity: durationMinutes,
    targetStat: 'intelligence',
    modifiers,
  };
}

/**
 * Генерирует дельту для изучения техники
 */
export function generateTechniqueLearningAction(
  durationMinutes: number,
  techniqueLevel: number,
  modifiers?: DeltaGeneratingAction['modifiers']
): DeltaGeneratingAction {
  // Бонус от уровня техники: +0.001 за уровень
  const levelBonus = 0.001 * techniqueLevel;

  return {
    type: 'technique_learning',
    intensity: durationMinutes,
    targetStat: 'intelligence',
    modifiers: {
      ...modifiers,
      techniqueMultiplier: 1 + levelBonus,
    },
  };
}

// ==================== ОБРАБОТКА ДЕЙСТВИЙ ====================

/**
 * Обрабатывает действие, генерирующее дельту
 *
 * @param stats Характеристики персонажа
 * @param action Действие
 * @param fatigue Текущая усталость
 * @returns Обновлённые характеристики и результат
 */
export function processDeltaGeneratingAction(
  stats: CharacterStatsDevelopment,
  action: DeltaGeneratingAction,
  fatigue: { physical: number; mental: number }
): {
  stats: CharacterStatsDevelopment;
  deltaAmount: number;
  result: AddDeltaResult;
} {
  // Применяем штраф усталости
  const fatigueEfficiency = calculateFatiguePenalty(
    fatigue.physical,
    fatigue.mental
  );

  const actionWithFatigue: DeltaGeneratingAction = {
    ...action,
    modifiers: {
      ...action.modifiers,
      fatiguePenalty: fatigueEfficiency,
    },
  };

  // Рассчитываем дельту
  const deltaAmount = calculateDeltaFromAction(actionWithFatigue);

  // Добавляем к характеристике
  const { stats: newStats, result } = addDeltaToStats(
    stats,
    action.targetStat,
    deltaAmount,
    action.type
  );

  return {
    stats: newStats,
    deltaAmount,
    result,
  };
}

// ==================== ЗАКРЕПЛЕНИЕ ПРИ СНЕ ====================

/**
 * Вычисляет максимально возможное закрепление за сон
 *
 * @param sleepHours Часы сна
 * @returns Максимальное закрепление (0 - 0.20)
 *
 * @example
 * calculateMaxConsolidation(3)  // 0 (минимум 4 часа)
 * calculateMaxConsolidation(4)  // 0.067
 * calculateMaxConsolidation(6)  // 0.133
 * calculateMaxConsolidation(8)  // 0.20
 * calculateMaxConsolidation(10) // 0.20 (кап)
 */
export function calculateMaxConsolidation(sleepHours: number): number {
  const {
    MIN_SLEEP_HOURS_FOR_CONSOLIDATION,
    MAX_SLEEP_HOURS_FOR_CONSOLIDATION,
    MAX_CONSOLIDATION_PER_SLEEP,
    MIN_CONSOLIDATION_PER_SLEEP,
  } = STAT_DEVELOPMENT_CONSTANTS;

  // Минимум 4 часа для закрепления
  if (sleepHours < MIN_SLEEP_HOURS_FOR_CONSOLIDATION) {
    return 0;
  }

  // Кап на 8 часах
  if (sleepHours >= MAX_SLEEP_HOURS_FOR_CONSOLIDATION) {
    return MAX_CONSOLIDATION_PER_SLEEP;
  }

  // Линейная интерполяция от 4 до 8 часов
  // 4 часа = 0.067, 8 часов = 0.20
  const hoursOverMinimum = sleepHours - MIN_SLEEP_HOURS_FOR_CONSOLIDATION;
  const hoursInRange =
    MAX_SLEEP_HOURS_FOR_CONSOLIDATION - MIN_SLEEP_HOURS_FOR_CONSOLIDATION;
  const deltaRange =
    MAX_CONSOLIDATION_PER_SLEEP - MIN_CONSOLIDATION_PER_SLEEP;

  return MIN_CONSOLIDATION_PER_SLEEP + (hoursOverMinimum / hoursInRange) * deltaRange;
}

/**
 * Закрепляет виртуальную дельту для одной характеристики
 *
 * @param stat Характеристика с развитием
 * @param sleepHours Часы сна
 * @returns Результат закрепления
 */
export function consolidateDelta(
  stat: StatDevelopment,
  sleepHours: number
): ConsolidationResult {
  const maxConsolidation = calculateMaxConsolidation(sleepHours);
  const before = { ...stat };

  // Сколько можно закрепить
  const consolidatedDelta = Math.min(stat.virtualDelta, maxConsolidation);

  // Вычитаем из виртуальной дельты
  const remainingDelta = stat.virtualDelta - consolidatedDelta;

  // Проверяем повышения
  const advancements = advanceStatAll({
    ...stat,
    virtualDelta: remainingDelta,
  });

  // Применяем повышения
  const after = applyAllAdvancements(
    { ...stat, virtualDelta: remainingDelta },
    advancements
  );

  const advancementResults: ConsolidationResult['advancements'] = [];
  let lastStat = stat.current;
  for (const adv of advancements) {
    advancementResults.push({
      from: lastStat,
      to: adv.newValue,
      thresholdUsed: adv.thresholdUsed,
    });
    lastStat = adv.newValue;
  }

  return {
    before,
    after,
    consolidatedDelta,
    maxConsolidation,
    advancements: advancementResults,
  };
}

/**
 * Закрепляет дельту для всех характеристик при сне
 *
 * @param stats Все характеристики
 * @param sleepHours Часы сна
 * @returns Результаты по всем характеристикам
 */
export function consolidateAllStats(
  stats: CharacterStatsDevelopment,
  sleepHours: number
): SleepConsolidationResult {
  const statNames: StatName[] = [
    'strength',
    'agility',
    'intelligence',
    'vitality',
  ];
  const results: SleepConsolidationResult['stats'] = {};
  let totalAdvancements = 0;

  for (const statName of statNames) {
    const result = consolidateDelta(stats[statName], sleepHours);
    results[statName] = result;
    totalAdvancements += result.advancements.length;
  }

  return {
    stats: results,
    sleepHours,
    totalAdvancements,
  };
}

// ==================== ОБРАБОТКА СНА ====================

/**
 * Обрабатывает сон персонажа
 *
 * Эта функция должна вызываться из time-system.ts
 * при обработке сна персонажа.
 *
 * @param statsData JSON-строка с характеристиками
 * @param sleepHours Часы сна
 * @returns Обновлённые характеристики и результаты
 */
export function processSleep(
  statsData: string,
  sleepHours: number
): {
  updatedStatsData: string;
  result: SleepConsolidationResult;
  updatedStats: CharacterStatsDevelopment;
} {
  // Десериализуем
  let stats: CharacterStatsDevelopment;
  try {
    stats = JSON.parse(statsData);
    // Валидация
    if (!stats.strength || !stats.agility || !stats.intelligence || !stats.vitality) {
      stats = createInitialStatsDevelopment();
    }
  } catch {
    stats = createInitialStatsDevelopment();
  }

  // Закрепляем
  const result = consolidateAllStats(stats, sleepHours);

  // Обновляем статы
  const updatedStats: CharacterStatsDevelopment = {
    strength: result.stats.strength?.after ?? stats.strength,
    agility: result.stats.agility?.after ?? stats.agility,
    intelligence: result.stats.intelligence?.after ?? stats.intelligence,
    vitality: result.stats.vitality?.after ?? stats.vitality,
  };

  return {
    updatedStatsData: JSON.stringify(updatedStats),
    result,
    updatedStats,
  };
}

// ==================== ФОРМАТИРОВАНИЕ ====================

/**
 * Формирует сообщение о результатах сна
 */
export function formatSleepResultMessage(
  result: SleepConsolidationResult
): string {
  const lines: string[] = [];
  const statNames: StatName[] = [
    'strength',
    'agility',
    'intelligence',
    'vitality',
  ];
  const statNamesRu: Record<StatName, string> = {
    strength: 'Сила',
    agility: 'Ловкость',
    intelligence: 'Интеллект',
    vitality: 'Живучесть',
  };

  lines.push(`💤 Сон: ${result.sleepHours} часов`);

  // Добавляем информацию по каждому стату
  for (const statName of statNames) {
    const statResult = result.stats[statName];
    if (!statResult) continue;

    const name = statNamesRu[statName];
    const delta = statResult.consolidatedDelta.toFixed(3);

    if (statResult.advancements.length > 0) {
      const lastAdv =
        statResult.advancements[statResult.advancements.length - 1];
      lines.push(
        `  ${name}: +${delta} закреплено, повышено до ${lastAdv.to}`
      );
    } else if (statResult.consolidatedDelta > 0) {
      lines.push(`  ${name}: +${delta} закреплено`);
    }
  }

  if (result.totalAdvancements > 0) {
    lines.push(`✨ Повышений: ${result.totalAdvancements}`);
  }

  return lines.join('\n');
}
