/**
 * Общие константы игры
 * Единый источник констант для фронтенда и бэкенда
 */

// ==================== КОНСТАНТЫ ЦИ ====================

export const QI_CONSTANTS = {
  /** Секунд в сутках */
  SECONDS_PER_DAY: 86400,
  
  /** Кап пассивного накопления (90% от ёмкости) */
  PASSIVE_QI_CAP: 0.9,
  
  /** Базовая скорость генерации ядром (10% от ёмкости в сутки) */
  CORE_GENERATION_RATE: 0.1,
  
  /** Базовая плотность Ци (ед/м³) */
  DEFAULT_QI_DENSITY: 20,
  
  /** Множители проводимости по уровням культивации */
  CONDUCTIVITY_MULTIPLIERS: {
    1: 1.0,
    2: 1.2,
    3: 1.5,
    4: 2.0,
    5: 2.5,
    6: 3.0,
    7: 4.0,
    8: 5.0,
    9: 6.0,
  } as Record<number, number>,
} as const;

// ==================== КОНСТАНТЫ ПРОРЫВА ====================

export const BREAKTHROUGH_CONSTANTS = {
  /** Множитель увеличения ёмкости ядра при прорыве */
  CORE_CAPACITY_MULTIPLIER: 1.1,
  
  /** Базовое количество заполнений на уровень */
  FILLS_PER_LEVEL: 10,
  
  /** Усталость при прорыве */
  FATIGUE: {
    /** Физическая усталость при любом прорыве */
    PHYSICAL_BASE: 10,
    /** Ментальная усталость при малом прорыве */
    MENTAL_MINOR: 25,
    /** Ментальная усталость при большом прорыве */
    MENTAL_MAJOR: 40,
  },
} as const;

// ==================== КОНСТАНТЫ МЕДИТАЦИИ ====================

export const MEDITATION_CONSTANTS = {
  /** Снятие физической усталости в минуту (0.1% = 6% в час) */
  PHYSICAL_RELIEF_RATE: 0.1,
  
  /** Снятие ментальной усталости в минуту при накоплении (0.15% = 9% в час) */
  MENTAL_RELIEF_ACCUMULATION: 0.15,
  
  /** Снятие ментальной усталости в минуту при прорыве (0.05% = 3% в час) */
  MENTAL_RELIEF_BREAKTHROUGH: 0.05,
} as const;

// ==================== КОНСТАНТЫ УСТАЛОСТИ ====================

export const FATIGUE_CONSTANTS = {
  /** Максимальная усталость (%) */
  MAX_FATIGUE: 100,
  
  /** Минимальная усталость (%) */
  MIN_FATIGUE: 0,
  
  /** Восстановление при отдыхе (% в час) */
  REST_RECOVERY_RATE: 10,
} as const;

// ==================== НАЗВАНИЯ УРОВНЕЙ КУЛЬТИВАЦИИ ====================

export const CULTIVATION_LEVEL_NAMES = [
  '',                      // 0 - не используется
  'Пробуждённое Ядро',     // 1
  'Течение Жизни',         // 2
  'Пламя Внутреннего Огня', // 3
  'Объединение Тела и Духа', // 4
  'Сердце Небес',          // 5
  'Разрыв Пелены',         // 6
  'Вечное Кольцо',         // 7
  'Глас Небес',            // 8
  'Бессмертное Ядро',      // 9
  'Вознесение',            // 10
] as const;

// ==================== ТИПЫ МЕДИТАЦИИ ====================

export type MeditationType = 'accumulation' | 'breakthrough';

// ==================== ТИПЫ ДЕЙСТВИЙ БОЯ ====================

export const COMBAT_ACTION_COSTS: Record<string, number> = {
  basic_strike: 5,
  qi_blast: 20,
  qi_shield: 15,
  enhanced_movement: 10,
} as const;

// ==================== ТИПЫ ДЕЙСТВИЙ КУЛЬТИВАЦИИ ====================

export const CULTIVATION_ACTION_COSTS: Record<string, number> = {
  basic_technique: 5,
  intermediate_technique: 15,
  advanced_technique: 30,
} as const;

// ==================== ТИПЫ ДЕЙСТВИЙ ВОССТАНОВЛЕНИЯ ====================

export const HEALING_ACTION_COSTS: Record<string, number> = {
  healing_minor: 10,
  healing_major: 50,
} as const;

// ==================== ВСЕ ЗАТРАТЫ ЦИ ====================

export const QI_COSTS = {
  ...COMBAT_ACTION_COSTS,
  ...CULTIVATION_ACTION_COSTS,
  ...HEALING_ACTION_COSTS,
  sensory_enhancement: 5,
  speed_boost: 20,
  strength_boost: 20,
} as const;
