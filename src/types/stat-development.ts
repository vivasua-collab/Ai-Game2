/**
 * Типы для системы развития характеристик
 *
 * Версия: 1.0
 * Источник: docs/stat-threshold-system.md
 *
 * Концепция:
 * - Виртуальная дельта — временное накопление прогресса
 * - Пороги развития — естественное замедление роста
 * - Закрепление при сне — конвертация в постоянные статы
 */

// ==================== ОСНОВНЫЕ ИНТЕРФЕЙСЫ ====================

/**
 * Развитие одной характеристики
 *
 * Содержит текущее значение, накопленную виртуальную дельту
 * и порог для следующего повышения.
 *
 * @example
 * const stat: StatDevelopment = {
 *   current: 25,
 *   virtualDelta: 1.5,
 *   threshold: 2.0,
 *   lastTrainingAt: '2026-03-15T10:00:00Z',
 * };
 */
export interface StatDevelopment {
  /** Текущее значение характеристики */
  current: number;

  /** Накопленная виртуальная дельта (временный прогресс) */
  virtualDelta: number;

  /** Порог для следующего повышения (вычисляемый: floor(current/10)) */
  threshold: number;

  /** Время последней тренировки (ISO timestamp) */
  lastTrainingAt?: string;

  /** Источник последнего прироста дельты */
  lastDeltaSource?: DeltaSource;
}

/**
 * Развитие всех характеристик персонажа
 *
 * Используется для хранения в БД как JSON.
 */
export interface CharacterStatsDevelopment {
  /** Сила — физическая мощь */
  strength: StatDevelopment;

  /** Ловкость — скорость и координация */
  agility: StatDevelopment;

  /** Интеллект — ментальные способности */
  intelligence: StatDevelopment;

  /** Живучесть — выносливость и HP */
  vitality: StatDevelopment;
}

// ==================== ИСТОЧНИКИ ДЕЛЬТЫ ====================

/**
 * Источник виртуальной дельты
 *
 * Определяет, откуда получен прогресс развития.
 */
export type DeltaSource =
  | 'combat_hit' // Удар в бою
  | 'combat_block' // Блок атаки
  | 'combat_dodge' // Уклонение
  | 'physical_labor' // Физический труд
  | 'training' // Тренировка
  | 'technique_learning' // Изучение техники
  | 'meditation' // Медитация (для интеллекта)
  | 'sleep_consolidation' // Закрепление при сне
  | 'event_reward' // Награда за событие
  | 'item_bonus'; // Бонус от предмета

/**
 * Действие, генерирующее дельту
 *
 * Используется для расчёта количества виртуальной дельты
 * от различных игровых действий.
 */
export interface DeltaGeneratingAction {
  /** Тип действия (источник дельты) */
  type: DeltaSource;

  /** Интенсивность (множитель базовой дельты) */
  intensity: number;

  /** Целевая характеристика */
  targetStat: StatName;

  /** Дополнительные модификаторы */
  modifiers?: {
    /** Множитель от используемой техники */
    techniqueMultiplier?: number;
    /** Множитель от экипировки */
    equipmentMultiplier?: number;
    /** Штраф от усталости (0-1, где 0 = полный штраф) */
    fatiguePenalty?: number;
  };
}

// ==================== ТРЕНИРОВКА ====================

/**
 * Тип тренировки
 *
 * Определяет баланс между эффективностью и усталостью.
 */
export type TrainingType = 'classical' | 'focused' | 'extreme';

/**
 * Конфигурация тренировки
 *
 * Параметры для запуска тренировки характеристики.
 */
export interface TrainingConfig {
  /** Тип тренировки (классическая, фокусная, экстремальная) */
  type: TrainingType;

  /** Целевая характеристика для развития */
  targetStat: StatName;

  /** Длительность тренировки в минутах */
  durationMinutes: number;

  /** Автоостановка при критической усталости */
  stopOnCriticalFatigue: boolean;
}

/**
 * Активная тренировка
 *
 * Состояние текущей сессии тренировки.
 */
export interface TrainingSession {
  /** Уникальный ID сессии */
  id: string;

  /** ID персонажа */
  characterId: string;

  /** Конфигурация тренировки */
  config: TrainingConfig;

  /** Время начала (ISO timestamp) */
  startedAt: string;

  /** Прогресс тренировки (0-100%) */
  progress: number;

  /** Накопленная виртуальная дельта */
  accumulatedDelta: number;

  /** Накопленная усталость */
  accumulatedFatigue: {
    physical: number;
    mental: number;
  };

  /** Статус сессии */
  status: 'active' | 'paused' | 'completed' | 'interrupted';

  /** Причина прерывания (если status = 'interrupted') */
  interruptedReason?: string;
}

/**
 * Результат завершения тренировки
 */
export interface TrainingResult {
  /** ID сессии */
  sessionId: string;

  /** Фактическая длительность в минутах */
  actualDurationMinutes: number;

  /** Накопленная виртуальная дельта */
  deltaGained: number;

  /** Накопленная усталость */
  fatigueGained: {
    physical: number;
    mental: number;
  };

  /** Статус завершения */
  status: 'completed' | 'interrupted';
}

// ==================== ЗАКРЕПЛЕНИЕ ====================

/**
 * Результат добавления виртуальной дельты
 *
 * Возвращается при добавлении дельты к характеристике.
 * Может содержать информацию о произошедших повышениях.
 */
export interface AddDeltaResult {
  /** Обновлённая характеристика */
  stat: StatDevelopment;

  /** Добавленная дельта */
  addedDelta: number;

  /** Было ли повышение характеристики */
  advanced: boolean;

  /** Количество повышений (если накоплено много дельты) */
  advancementCount: number;
}

/**
 * Результат закрепления при сне
 *
 * Содержит информацию о том, сколько дельты было закреплено
 * и какие повышения произошли.
 */
export interface ConsolidationResult {
  /** Характеристика до закрепления */
  before: StatDevelopment;

  /** Характеристика после закрепления */
  after: StatDevelopment;

  /** Закреплённая дельта */
  consolidatedDelta: number;

  /** Максимально возможное закрепление (кап за сон) */
  maxConsolidation: number;

  /** Список произошедших повышений */
  advancements: {
    from: number;
    to: number;
    thresholdUsed: number;
  }[];
}

/**
 * Результат обработки всех характеристик при сне
 *
 * Агрегированные результаты закрепления для всех характеристик.
 */
export interface SleepConsolidationResult {
  /** Результаты по каждой характеристике */
  stats: {
    [key in StatName]?: ConsolidationResult;
  };

  /** Общее время сна (часы) */
  sleepHours: number;

  /** Общее количество повышений */
  totalAdvancements: number;
}

// ==================== ПОРОГИ ====================

/**
 * Результат повышения характеристики
 *
 * Возвращается при успешном повышении характеристики.
 */
export interface AdvanceResult {
  /** Новое значение характеристики */
  newValue: number;

  /** Остаток виртуальной дельты */
  remainingDelta: number;

  /** Порог, который был использован для повышения */
  thresholdUsed: number;

  /** Новый порог для следующего повышения */
  newThreshold: number;
}

// ==================== УТИЛИТЫ ====================

/**
 * Имя характеристики
 *
 * Четыре базовые характеристики персонажа.
 */
export type StatName = 'strength' | 'agility' | 'intelligence' | 'vitality';

/**
 * Полная информация о прогрессе характеристики
 *
 * Используется для отображения в UI.
 */
export interface StatProgressInfo {
  /** Текущее значение */
  current: number;

  /** Порог для следующего +1 */
  threshold: number;

  /** Прогресс до следующего повышения (0-1) */
  progress: number;

  /** Виртуальная дельта */
  virtualDelta: number;

  /** Прогноз дней до повышения (при капе +0.20/день, 100% активности) */
  estimatedDaysToAdvance: number;

  /** Прогноз дней до повышения (при 75% активности) */
  estimatedActiveDaysToAdvance: number;
}

/**
 * Событие развития для логирования
 *
 * Используется для отслеживания истории развития.
 */
export interface StatDevelopmentEvent {
  /** ID персонажа */
  characterId: string;

  /** Характеристика */
  stat: StatName;

  /** Тип события */
  eventType: 'delta_added' | 'stat_advanced' | 'training_started' | 'training_completed';

  /** Значения до события */
  before: Partial<StatDevelopment>;

  /** Значения после события */
  after: Partial<StatDevelopment>;

  /** Источник изменения */
  source: DeltaSource;

  /** Время события (ISO timestamp) */
  timestamp: string;

  /** Дополнительные данные */
  metadata?: Record<string, unknown>;
}

// ==================== КОНСТАНТЫ ====================

/**
 * Русские названия характеристик для UI
 */
export const STAT_NAMES_RU: Record<StatName, string> = {
  strength: 'Сила',
  agility: 'Ловкость',
  intelligence: 'Интеллект',
  vitality: 'Живучесть',
};

/**
 * Эмодзи для характеристик
 */
export const STAT_EMOJIS: Record<StatName, string> = {
  strength: '💪',
  agility: '🏃',
  intelligence: '🧠',
  vitality: '❤️',
};

/**
 * Иконки для источников дельты
 */
export const DELTA_SOURCE_ICONS: Record<DeltaSource, string> = {
  combat_hit: '⚔️',
  combat_block: '🛡️',
  combat_dodge: '💨',
  physical_labor: '🔨',
  training: '🏋️',
  technique_learning: '📖',
  meditation: '🧘',
  sleep_consolidation: '💤',
  event_reward: '🎁',
  item_bonus: '✨',
};
