/**
 * Система тренировки характеристик
 *
 * Версия: 1.0
 * Источник: docs/body-development-analysis.md, docs/implementation/phase-5-training.md
 *
 * Три варианта тренировки:
 * - Классическая: сбалансированная, безопасная (50/50)
 * - Фокусная: больше дельты, больше физической усталости (70/30)
 * - Экстремальная: максимум дельты, критическая физическая усталость (95/5)
 */

import type {
  TrainingType,
  TrainingConfig,
  TrainingSession,
  TrainingResult,
  StatName,
  CharacterStatsDevelopment,
} from '@/types/stat-development';

import { addVirtualDelta } from './stat-development';
import { STAT_DEVELOPMENT_CONSTANTS, FATIGUE_CONSTANTS } from './constants';

// ==================== КОНФИГУРАЦИЯ ТРЕНИРОВОК ====================

/**
 * Параметры типа тренировки
 */
interface TrainingTypeConfig {
  /** Распределение физической нагрузки */
  physicalRatio: number;
  /** Распределение ментальной нагрузки */
  mentalRatio: number;
  /** Множитель генерации дельты */
  deltaMultiplier: number;
  /** Множитель генерации усталости */
  fatigueMultiplier: number;
  /** Название для отображения */
  displayName: string;
  /** Описание */
  description: string;
  /** Базовая дельта в минуту */
  baseDeltaPerMinute: number;
}

/**
 * Конфигурация типов тренировки
 */
const TRAINING_TYPE_CONFIGS: Record<TrainingType, TrainingTypeConfig> = {
  classical: {
    physicalRatio: 0.5,
    mentalRatio: 0.5,
    deltaMultiplier: 1.0,
    fatigueMultiplier: 1.0,
    displayName: 'Классическая тренировка',
    description: 'Сбалансированная тренировка с равным распределением нагрузки',
    baseDeltaPerMinute: STAT_DEVELOPMENT_CONSTANTS.DELTA_SOURCES.training_classical ?? 0.01,
  },
  focused: {
    physicalRatio: 0.7,
    mentalRatio: 0.3,
    deltaMultiplier: 1.2,
    fatigueMultiplier: 1.3,
    displayName: 'Фокусная тренировка',
    description: 'Интенсивная тренировка с упором на физическую нагрузку',
    baseDeltaPerMinute: STAT_DEVELOPMENT_CONSTANTS.DELTA_SOURCES.training_focused ?? 0.015,
  },
  extreme: {
    physicalRatio: 0.95,
    mentalRatio: 0.05,
    deltaMultiplier: 1.5,
    fatigueMultiplier: 2.0,
    displayName: 'Экстремальная тренировка',
    description: 'Максимально интенсивная тренировка, высокий риск критической усталости',
    baseDeltaPerMinute: STAT_DEVELOPMENT_CONSTANTS.DELTA_SOURCES.training_extreme ?? 0.02,
  },
};

// ==================== СОЗДАНИЕ ТРЕНИРОВКИ ====================

/**
 * Создаёт новую сессию тренировки
 *
 * @param characterId ID персонажа
 * @param config Конфигурация тренировки
 */
export function startTraining(
  characterId: string,
  config: TrainingConfig
): TrainingSession {
  return {
    id: `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    characterId,
    config,
    startedAt: new Date().toISOString(),
    progress: 0,
    accumulatedDelta: 0,
    accumulatedFatigue: {
      physical: 0,
      mental: 0,
    },
    status: 'active',
  };
}

// ==================== ОБРАБОТКА ТРЕНИРОВКИ ====================

/**
 * Результат одного тика тренировки
 */
export interface TrainingTickResult {
  /** Добавленная виртуальная дельта */
  deltaGained: number;

  /** Добавленная усталость */
  fatigueGained: {
    physical: number;
    mental: number;
  };

  /** Текущая усталость (после тика) */
  currentFatigue: {
    physical: number;
    mental: number;
  };

  /** Достигнута критическая усталость */
  criticalFatigue: boolean;

  /** Тренировка завершена */
  completed: boolean;

  /** Причина завершения */
  completedReason?: 'duration_complete' | 'critical_fatigue' | 'manual_stop';

  /** Обновлённая сессия */
  session: TrainingSession;
}

/**
 * Обрабатывает один тик тренировки
 *
 * Вызывается каждую минуту (или по другому интервалу).
 *
 * @param session Сессия тренировки
 * @param currentFatigue Текущая усталость персонажа (до тика)
 * @param tickMinutes Длительность тика в минутах (по умолчанию 1)
 */
export function processTrainingTick(
  session: TrainingSession,
  currentFatigue: { physical: number; mental: number },
  tickMinutes: number = 1
): TrainingTickResult {
  // Проверяем статус
  if (session.status !== 'active') {
    return {
      deltaGained: 0,
      fatigueGained: { physical: 0, mental: 0 },
      currentFatigue,
      criticalFatigue: false,
      completed: true,
      completedReason: 'manual_stop',
      session,
    };
  }

  const typeConfig = TRAINING_TYPE_CONFIGS[session.config.type];

  // Расчёт дельты с множителями
  let deltaGained =
    typeConfig.baseDeltaPerMinute * tickMinutes * typeConfig.deltaMultiplier;

  // Штраф от усталости
  const totalPhysical =
    currentFatigue.physical + session.accumulatedFatigue.physical;
  const totalMental = currentFatigue.mental + session.accumulatedFatigue.mental;
  const fatigueEfficiency = calculateTrainingEfficiency(
    totalPhysical,
    totalMental
  );
  deltaGained *= fatigueEfficiency;

  // Расчёт усталости
  const baseFatigueRate = 0.5; // % в минуту
  const fatigueGained = {
    physical:
      baseFatigueRate *
      tickMinutes *
      typeConfig.physicalRatio *
      typeConfig.fatigueMultiplier,
    mental:
      baseFatigueRate *
      tickMinutes *
      typeConfig.mentalRatio *
      typeConfig.fatigueMultiplier,
  };

  // Обновляем сессию
  session.accumulatedDelta += deltaGained;
  session.accumulatedFatigue.physical += fatigueGained.physical;
  session.accumulatedFatigue.mental += fatigueGained.mental;
  session.progress = calculateSessionProgress(session);

  // Новая усталость
  const newFatigue = {
    physical: Math.min(100, totalPhysical + fatigueGained.physical),
    mental: Math.min(100, totalMental + fatigueGained.mental),
  };

  // Проверка критической усталости
  const criticalFatigue =
    newFatigue.physical >=
      STAT_DEVELOPMENT_CONSTANTS.CRITICAL_TRAINING_FATIGUE ||
    newFatigue.mental >= STAT_DEVELOPMENT_CONSTANTS.CRITICAL_TRAINING_FATIGUE;

  // Проверка завершения
  let completed = false;
  let completedReason: TrainingTickResult['completedReason'];

  if (criticalFatigue && session.config.stopOnCriticalFatigue) {
    completed = true;
    completedReason = 'critical_fatigue';
    session.status = 'interrupted';
    session.interruptedReason = 'Критическая усталость';
  } else if (session.progress >= 100) {
    completed = true;
    completedReason = 'duration_complete';
    session.status = 'completed';
  }

  return {
    deltaGained,
    fatigueGained,
    currentFatigue: newFatigue,
    criticalFatigue,
    completed,
    completedReason,
    session,
  };
}

/**
 * Вычисляет эффективность тренировки на основе усталости
 *
 * При 50% усталости: ~75% эффективности
 * При 80% усталости: ~36% эффективности
 * При 100% усталости: 0% эффективности
 */
export function calculateTrainingEfficiency(
  physicalFatigue: number,
  mentalFatigue: number
): number {
  const physicalEfficiency =
    1 - Math.pow(Math.min(100, physicalFatigue), 2) / 10000;
  const mentalEfficiency =
    1 - Math.pow(Math.min(100, mentalFatigue), 2) / 10000;

  // Взвешенное среднее (физическая важнее для тренировки)
  return physicalEfficiency * 0.7 + mentalEfficiency * 0.3;
}

/**
 * Вычисляет прогресс сессии в процентах
 */
function calculateSessionProgress(session: TrainingSession): number {
  const startedAt = new Date(session.startedAt).getTime();
  const elapsedMinutes = (Date.now() - startedAt) / (1000 * 60);
  return Math.min(100, (elapsedMinutes / session.config.durationMinutes) * 100);
}

// ==================== ЗАВЕРШЕНИЕ ТРЕНИРОВКИ ====================

/**
 * Завершает тренировку и возвращает результаты
 *
 * @param session Сессия тренировки
 * @param stats Текущие характеристики персонажа
 */
export function completeTraining(
  session: TrainingSession,
  stats: CharacterStatsDevelopment
): {
  session: TrainingSession;
  result: TrainingResult;
  updatedStats: CharacterStatsDevelopment;
  advancementCount: number;
} {
  // Финальный статус
  if (session.status === 'active') {
    session.status = 'completed';
  }

  // Вычисляем фактическую длительность
  const startedAt = new Date(session.startedAt).getTime();
  const actualDurationMinutes = Math.round(
    (Date.now() - startedAt) / (1000 * 60)
  );

  // Добавляем дельту к характеристике
  const addResult = addVirtualDelta(
    stats[session.config.targetStat],
    session.accumulatedDelta,
    'training'
  );

  const updatedStats: CharacterStatsDevelopment = {
    ...stats,
    [session.config.targetStat]: addResult.stat,
  };

  return {
    session,
    result: {
      sessionId: session.id,
      actualDurationMinutes,
      deltaGained: session.accumulatedDelta,
      fatigueGained: session.accumulatedFatigue,
      status: session.status === 'completed' ? 'completed' : 'interrupted',
    },
    updatedStats,
    advancementCount: addResult.advancementCount,
  };
}

/**
 * Принудительно прерывает тренировку
 */
export function interruptTraining(
  session: TrainingSession,
  reason: string
): TrainingSession {
  return {
    ...session,
    status: 'interrupted',
    interruptedReason: reason,
  };
}

// ==================== ИНФОРМАЦИЯ О ТРЕНИРОВКЕ ====================

/**
 * Возвращает информацию о типах тренировки
 */
export function getTrainingTypeInfo(): Record<
  TrainingType,
  {
    displayName: string;
    description: string;
    deltaMultiplier: number;
    fatigueMultiplier: number;
    physicalRatio: number;
    mentalRatio: number;
  }
> {
  const result: Record<
    TrainingType,
    {
      displayName: string;
      description: string;
      deltaMultiplier: number;
      fatigueMultiplier: number;
      physicalRatio: number;
      mentalRatio: number;
    }
  > = {
    classical: {
      displayName: TRAINING_TYPE_CONFIGS.classical.displayName,
      description: TRAINING_TYPE_CONFIGS.classical.description,
      deltaMultiplier: TRAINING_TYPE_CONFIGS.classical.deltaMultiplier,
      fatigueMultiplier: TRAINING_TYPE_CONFIGS.classical.fatigueMultiplier,
      physicalRatio: TRAINING_TYPE_CONFIGS.classical.physicalRatio,
      mentalRatio: TRAINING_TYPE_CONFIGS.classical.mentalRatio,
    },
    focused: {
      displayName: TRAINING_TYPE_CONFIGS.focused.displayName,
      description: TRAINING_TYPE_CONFIGS.focused.description,
      deltaMultiplier: TRAINING_TYPE_CONFIGS.focused.deltaMultiplier,
      fatigueMultiplier: TRAINING_TYPE_CONFIGS.focused.fatigueMultiplier,
      physicalRatio: TRAINING_TYPE_CONFIGS.focused.physicalRatio,
      mentalRatio: TRAINING_TYPE_CONFIGS.focused.mentalRatio,
    },
    extreme: {
      displayName: TRAINING_TYPE_CONFIGS.extreme.displayName,
      description: TRAINING_TYPE_CONFIGS.extreme.description,
      deltaMultiplier: TRAINING_TYPE_CONFIGS.extreme.deltaMultiplier,
      fatigueMultiplier: TRAINING_TYPE_CONFIGS.extreme.fatigueMultiplier,
      physicalRatio: TRAINING_TYPE_CONFIGS.extreme.physicalRatio,
      mentalRatio: TRAINING_TYPE_CONFIGS.extreme.mentalRatio,
    },
  };

  return result;
}

/**
 * Оценивает результат тренировки до её начала
 */
export function estimateTrainingResult(
  type: TrainingType,
  durationMinutes: number,
  currentFatigue: { physical: number; mental: number }
): {
  estimatedDelta: number;
  estimatedFatigue: { physical: number; mental: number };
  willReachCriticalFatigue: boolean;
  efficiency: number;
} {
  const typeConfig = TRAINING_TYPE_CONFIGS[type];

  // Примерная эффективность (средняя за тренировку)
  const avgEfficiency = 0.8;

  const estimatedDelta =
    typeConfig.baseDeltaPerMinute *
    durationMinutes *
    typeConfig.deltaMultiplier *
    avgEfficiency;

  const baseFatigueRate = 0.5;
  const estimatedFatigue = {
    physical:
      baseFatigueRate *
      durationMinutes *
      typeConfig.physicalRatio *
      typeConfig.fatigueMultiplier,
    mental:
      baseFatigueRate *
      durationMinutes *
      typeConfig.mentalRatio *
      typeConfig.fatigueMultiplier,
  };

  const willReachCriticalFatigue =
    currentFatigue.physical + estimatedFatigue.physical >=
      STAT_DEVELOPMENT_CONSTANTS.CRITICAL_TRAINING_FATIGUE ||
    currentFatigue.mental + estimatedFatigue.mental >=
      STAT_DEVELOPMENT_CONSTANTS.CRITICAL_TRAINING_FATIGUE;

  return {
    estimatedDelta,
    estimatedFatigue,
    willReachCriticalFatigue,
    efficiency: avgEfficiency,
  };
}

/**
 * Формирует сообщение о завершении тренировки
 */
export function formatTrainingResultMessage(
  result: TrainingResult,
  statName: StatName,
  advancementCount: number
): string {
  const statNamesRu: Record<StatName, string> = {
    strength: 'Сила',
    agility: 'Ловкость',
    intelligence: 'Интеллект',
    vitality: 'Живучесть',
  };

  const lines: string[] = [];

  lines.push(
    `🏋️ Тренировка ${result.status === 'completed' ? 'завершена' : 'прервана'}`
  );
  lines.push(`⏱️ Длительность: ${result.actualDurationMinutes} мин`);
  lines.push(`📈 ${statNamesRu[statName]}: +${result.deltaGained.toFixed(3)}`);

  if (advancementCount > 0) {
    lines.push(`✨ Повышений: ${advancementCount}`);
  }

  lines.push(
    `😰 Усталость: физическая +${result.fatigueGained.physical.toFixed(1)}%, ментальная +${result.fatigueGained.mental.toFixed(1)}%`
  );

  if (result.status === 'interrupted') {
    lines.push(`⚠️ Причина прерывания: критическая усталость`);
  }

  return lines.join('\n');
}

// ==================== ЭКСПОРТ КОНФИГУРАЦИИ ====================

export { TRAINING_TYPE_CONFIGS };
