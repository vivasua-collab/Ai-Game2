/**
 * ============================================================================
 * STAT DEVELOPMENT EVENTS - События развития характеристик
 * ============================================================================
 * 
 * Интеграция Stat Development System с Event Bus.
 * 
 * Архитектура:
 * Engine (Phaser) → Event Bus → TruthSystem → stat-development.ts
 * 
 * Версия: 1.0.0
 * ============================================================================
 */

import type { StatName, DeltaSource, StatDevelopment } from '@/types/stat-development';

// ==================== КОНСТАНТЫ ТИПОВ ИВЕНТОВ ====================

export const STAT_EVENT_TYPES = {
  /** Добавление виртуальной дельты */
  DELTA_ADD: 'stat:delta_add',
  /** Повышение характеристики */
  ADVANCE: 'stat:advance',
  /** Закрепление при сне */
  CONSOLIDATE: 'stat:consolidate',
  /** Начало тренировки */
  TRAINING_START: 'stat:training_start',
  /** Тик тренировки */
  TRAINING_TICK: 'stat:training_tick',
  /** Завершение тренировки */
  TRAINING_END: 'stat:training_end',
} as const;

// ==================== ИНТЕРФЕЙСЫ ИВЕНТОВ ====================

/**
 * Базовый интерфейс для ивентов развития
 */
export interface StatEventBase {
  id: string;
  type: typeof STAT_EVENT_TYPES[keyof typeof STAT_EVENT_TYPES];
  sessionId: string;
  characterId: string;
  timestamp: number;
}

/**
 * Ивент: Добавление виртуальной дельты
 * 
 * Генерируется при:
 * - Боевых ударах
 * - Уклонении
 * - Блоке
 * - Физическом труде
 * - Медитации (для интеллекта)
 */
export interface StatDeltaAddEvent extends StatEventBase {
  type: typeof STAT_EVENT_TYPES.DELTA_ADD;
  /** Целевая характеристика */
  targetStat: StatName;
  /** Источник дельты */
  source: DeltaSource;
  /** Интенсивность (множитель) */
  intensity: number;
  /** Модификаторы */
  modifiers?: {
    techniqueMultiplier?: number;
    equipmentMultiplier?: number;
    fatiguePenalty?: number;
  };
}

/**
 * Ивент: Повышение характеристики
 * 
 * Генерируется когда виртуальная дельта достигает порога.
 */
export interface StatAdvanceEvent extends StatEventBase {
  type: typeof STAT_EVENT_TYPES.ADVANCE;
  /** Характеристика */
  stat: StatName;
  /** Старое значение */
  oldValue: number;
  /** Новое значение */
  newValue: number;
  /** Использованный порог */
  thresholdUsed: number;
}

/**
 * Ивент: Закрепление при сне
 * 
 * Генерируется при обработке сна персонажа.
 */
export interface StatConsolidateEvent extends StatEventBase {
  type: typeof STAT_EVENT_TYPES.CONSOLIDATE;
  /** Часы сна */
  sleepHours: number;
  /** Текущая усталость */
  currentFatigue: {
    physical: number;
    mental: number;
  };
}

/**
 * Тип тренировки
 */
export type TrainingType = 'classical' | 'focused' | 'extreme';

/**
 * Ивент: Начало тренировки
 */
export interface StatTrainingStartEvent extends StatEventBase {
  type: typeof STAT_EVENT_TYPES.TRAINING_START;
  /** Тип тренировки */
  trainingType: TrainingType;
  /** Целевая характеристика */
  targetStat: StatName;
  /** Длительность в минутах */
  durationMinutes: number;
  /** Текущая усталость */
  currentFatigue: {
    physical: number;
    mental: number;
  };
}

/**
 * Ивент: Тик тренировки
 */
export interface StatTrainingTickEvent extends StatEventBase {
  type: typeof STAT_EVENT_TYPES.TRAINING_TICK;
  /** ID сессии тренировки */
  trainingSessionId: string;
  /** Накопленная дельта */
  accumulatedDelta: number;
  /** Накопленная усталость */
  accumulatedFatigue: {
    physical: number;
    mental: number;
  };
  /** Прогресс (0-100) */
  progress: number;
}

/**
 * Ивент: Завершение тренировки
 */
export interface StatTrainingEndEvent extends StatEventBase {
  type: typeof STAT_EVENT_TYPES.TRAINING_END;
  /** ID сессии тренировки */
  trainingSessionId: string;
  /** Итоговая дельта */
  finalDelta: number;
  /** Итоговая усталость */
  finalFatigue: {
    physical: number;
    mental: number;
  };
  /** Было ли повышение */
  advanced: boolean;
  /** Новое значение (если было повышение) */
  newStatValue?: number;
}

// ==================== UNION ТИПЫ ====================

/**
 * Все ивенты развития
 */
export type StatEvent =
  | StatDeltaAddEvent
  | StatAdvanceEvent
  | StatConsolidateEvent
  | StatTrainingStartEvent
  | StatTrainingTickEvent
  | StatTrainingEndEvent;

// ==================== УТИЛИТЫ ====================

/**
 * Генерация ID ивента
 */
export function generateStatEventId(): string {
  return `stat_evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Создание базового ивента развития
 */
export function createStatEventBase(
  type: typeof STAT_EVENT_TYPES[keyof typeof STAT_EVENT_TYPES],
  sessionId: string,
  characterId: string
): StatEventBase {
  return {
    id: generateStatEventId(),
    type,
    sessionId,
    characterId,
    timestamp: Date.now(),
  };
}

/**
 * Создание ивента добавления дельты
 */
export function createStatDeltaAddEvent(
  sessionId: string,
  characterId: string,
  targetStat: StatName,
  source: DeltaSource,
  intensity: number = 1.0,
  modifiers?: StatDeltaAddEvent['modifiers']
): StatDeltaAddEvent {
  return {
    ...createStatEventBase(STAT_EVENT_TYPES.DELTA_ADD, sessionId, characterId),
    targetStat,
    source,
    intensity,
    modifiers,
  };
}

/**
 * Создание ивента закрепления при сне
 */
export function createStatConsolidateEvent(
  sessionId: string,
  characterId: string,
  sleepHours: number,
  currentFatigue: { physical: number; mental: number }
): StatConsolidateEvent {
  return {
    ...createStatEventBase(STAT_EVENT_TYPES.CONSOLIDATE, sessionId, characterId),
    sleepHours,
    currentFatigue,
  };
}

/**
 * Создание ивента начала тренировки
 */
export function createStatTrainingStartEvent(
  sessionId: string,
  characterId: string,
  trainingType: TrainingType,
  targetStat: StatName,
  durationMinutes: number,
  currentFatigue: { physical: number; mental: number }
): StatTrainingStartEvent {
  return {
    ...createStatEventBase(STAT_EVENT_TYPES.TRAINING_START, sessionId, characterId),
    trainingType,
    targetStat,
    durationMinutes,
    currentFatigue,
  };
}

/**
 * Проверка типа ивента
 */
export function isStatEvent(event: { type: string }): event is StatEvent {
  return Object.values(STAT_EVENT_TYPES).includes(event.type as typeof STAT_EVENT_TYPES[keyof typeof STAT_EVENT_TYPES]);
}
