/**
 * Типы для системы тела (Kenshi-style)
 * Двойная HP система, кровотечения, приживление конечностей
 */

// ==================== ТИПЫ HP КОНЕЧНОСТЕЙ ====================

/**
 * Типы HP для части тела
 */
export interface LimbHP {
  /** Функциональная HP (красная) - работает ли конечность */
  functional: {
    max: number;
    current: number;
  };
  
  /** Структурная HP (чёрная) - прикреплена ли конечность */
  structural: {
    max: number;
    current: number;
  };
}

/**
 * Состояние конечности
 */
export type LimbStatus = 
  | 'healthy'      // functional > 80%, structural > 90%
  | 'damaged'      // functional 50-80%
  | 'crippled'     // functional 1-49%
  | 'paralyzed'    // functional = 0, structural > 0
  | 'critical'     // structural 1-30%
  | 'severed';     // Отрублена

/**
 * Тип части тела
 */
export type BodyPartType = 
  | 'head'           // Голова
  | 'torso'          // Торс
  | 'heart'          // ❤️ Сердце (только красная HP)
  | 'arm'            // Рука/передняя лапа
  | 'hand'           // Кисть/лапа
  | 'leg'            // Нога/задняя лапа
  | 'foot'           // Стопа
  | 'wing'           // Крыло
  | 'tail'           // Хвост
  | 'horn'           // Рог
  | 'claw'           // Коготь
  | 'fang'           // Клык
  | 'eye'            // Глаз
  | 'ear'            // Ухо
  | 'tentacle'       // Щупальце
  | 'pincer'         // Клешня
  | 'special';       // Особая часть

/**
 * Функция части тела
 */
export type BodyPartFunction = 
  | 'movement'       // Передвижение
  | 'manipulation'   // Манипуляция предметами
  | 'attack'         // Атака
  | 'defense'        // Защита
  | 'sensory'        // Восприятие
  | 'flight'         // Полёт
  | 'swimming'       // Плавание
  | 'breathing'      // Дыхание
  | 'circulation'    // Кровообращение
  | 'digestion'      // Пищеварение
  | 'reproduction'   // Размножение
  | 'qi_channel';    // Канал Ци

// ==================== ЧАСТЬ ТЕЛА ====================

/**
 * Часть тела с двойной HP системой
 */
export interface BodyPart {
  id: string;
  name: string;
  type: BodyPartType;
  
  /** HP система */
  hp: LimbHP;
  
  /** Текущее состояние */
  status: LimbStatus;
  
  /** Функции части */
  functions: BodyPartFunction[];
  
  /** Эффективность работы (0-100%) */
  efficiency: number;
  
  /** Броня */
  armor: number;
  
  /** Порог урона для отрубания */
  damageThreshold: number;
  
  /** Размер хитбокса (м) */
  hitboxRadius: number;
  
  /** Зависимости (родительская часть) */
  parent?: string;
  
  /** Дочерние части */
  children?: string[];
  
  /** Позиция для UI */
  position?: {
    x: number;
    y: number;
  };
  
  /** Метаданные приживлённой конечности */
  attachment?: AttachmentMetadata;
}

/**
 * Метаданные приживлённой конечности
 */
export interface AttachmentMetadata {
  /** ID исходного владельца */
  originalOwnerId?: string;
  
  /** Уровень культивации донора */
  donorCultivationLevel: number;
  
  /** Ступень культивации донора */
  donorCultivationStep: number;
  
  /** Время приживления (ТИК начала) */
  startedAt: number;
  
  /** Длительность приживления (ТИКов) */
  duration: number;
  
  /** Прогресс приживления (0-100%) */
  progress: number;
  
  /** Статус приживления */
  status: 'attaching' | 'adapting' | 'strengthening' | 'complete' | 'rejected';
}

// ==================== СЕРДЦЕ ====================

/**
 * Сердце - особая часть тела
 * Имеет только функциональную HP
 */
export interface HeartProperties {
  /** HP сердца (только функциональная) */
  hp: {
    max: number;
    current: number;
  };
  
  /** Доступно для атаки */
  vulnerable: boolean;
  
  /** Уровень функциональности */
  efficiency: number;
}

// ==================== СТРУКТУРА ТЕЛА ====================

/**
 * Полная структура тела персонажа
 */
export interface BodyStructure {
  /** ID персонажа */
  characterId: string;
  
  /** Все части тела */
  parts: Map<string, BodyPart>;
  
  /** Сердце (особая часть) */
  heart: HeartProperties;
  
  /** Общее состояние здоровья */
  overallHealth: number;
  
  /** Активные кровотечения */
  activeBleeds: BleedingEffect[];
  
  /** Активные процессы приживления */
  activeAttachments: AttachmentProcess[];
  
  /** Смерть */
  isDead: boolean;
  
  /** Причина смерти */
  deathReason?: string;
}

// ==================== КРОВОТЕЧЕНИЕ ====================

/**
 * Тип кровотечения
 */
export type BleedingType = 
  | 'none'        // Нет
  | 'minor'       // Лёгкое
  | 'moderate'    // Умеренное
  | 'severe'      // Сильное
  | 'critical'    // Критическое
  | 'arterial';   // Артериальное

/**
 * Эффект кровотечения
 */
export interface BleedingEffect {
  /** ID эффекта */
  id: string;
  
  /** Тип кровотечения */
  type: BleedingType;
  
  /** Урон за ТИК */
  damagePerTick: number;
  
  /** Оставшаяся длительность (ТИКов), -1 = постоянно */
  remainingDuration: number;
  
  /** ID повреждённой части */
  sourcePartId: string;
  
  /** Время начала (ТИК) */
  startedAt: number;
  
  /** Источник кровотечения */
  source: 'damage' | 'severed' | 'internal';
}

// ==================== ПРИЖИВЛЕНИЕ ====================

/**
 * Процесс приживления конечности
 */
export interface AttachmentProcess {
  /** ID процесса */
  id: string;
  
  /** ID части тела */
  partId: string;
  
  /** Время начала (ТИК) */
  startedAt: number;
  
  /** Длительность (ТИКов) */
  duration: number;
  
  /** Прогресс (0-100%) */
  progress: number;
  
  /** Текущий этап */
  stage: 'attaching' | 'adapting' | 'strengthening' | 'complete' | 'rejected';
  
  /** Штраф эффективности пока приживается */
  efficiencyPenalty: number;
  
  /** Расход Ци за ТИК */
  qiDrainPerTick: number;
  
  /** Информация о доноре */
  donor: {
    id?: string;
    cultivationLevel: number;
    cultivationStep: number;
    name?: string;
  };
  
  /** Совместимость */
  compatibility: AttachmentCompatibility;
}

/**
 * Результат проверки совместимости
 */
export interface AttachmentCompatibility {
  /** Можно приживить */
  canAttach: boolean;
  
  /** Причина отказа */
  reason?: string;
  
  /** Разница в ступенях */
  tierDifference: number;
  
  /** Множитель времени приживления */
  durationMultiplier: number;
}

/**
 * Свежесть конечности
 */
export interface LimbFreshness {
  /** Свежая */
  isFresh: boolean;
  
  /** ТИКов с момента отрубания */
  ticksSinceSevered: number;
  
  /** Источник */
  source: 'living' | 'freshly_killed' | 'old_corpse';
}

// ==================== УРОН И ВОССТАНОВЛЕНИЕ ====================

/**
 * Результат применения урона к конечности
 */
export interface DamageResult {
  /** ID части */
  partId: string;
  
  /** Общий урон */
  totalDamage: number;
  
  /** Урон функциональной HP */
  functionalDamage: number;
  
  /** Урон структурной HP */
  structuralDamage: number;
  
  /** Предыдущее состояние */
  previousStatus: LimbStatus;
  
  /** Новое состояние */
  newStatus: LimbStatus;
  
  /** Кровотечение */
  bleeding: BleedingEffect | null;
  
  /** Отрублена */
  severed: boolean;
  
  /** Смерть */
  fatal: boolean;
}

/**
 * Результат регенерации
 */
export interface RegenerationResult {
  /** ID части */
  partId: string;
  
  /** Восстановлено структурной HP */
  structuralRegenerated: number;
  
  /** Восстановлено функциональной HP */
  functionalRegenerated: number;
  
  /** Новое состояние */
  newStatus: LimbStatus;
  
  /** Расход Ци */
  qiConsumed: number;
}

/**
 * Параметры регенерации
 */
export interface RegenerationParams {
  /** Уровень культивации */
  cultivationLevel: number;
  
  /** Состояние персонажа */
  state: 'active' | 'resting' | 'sleeping' | 'meditation';
  
  /** Модификаторы */
  modifiers: {
    medicine?: number;
    technique?: number;
    formation?: number;
  };
  
  /** Доступная Ци для регенерации */
  availableQi?: number;
}

// ==================== КОНСТАНТЫ HP ====================

/**
 * Базовые HP для частей тела человека
 */
export const HUMAN_BODY_PART_HP: Record<BodyPartType, { functional: number; structural: number }> = {
  head:     { functional: 50,  structural: 100 },
  torso:    { functional: 100, structural: 200 },
  heart:    { functional: 80,  structural: 0 },    // Только функциональная!
  arm:      { functional: 40,  structural: 80 },
  hand:     { functional: 20,  structural: 40 },
  leg:      { functional: 50,  structural: 100 },
  foot:     { functional: 25,  structural: 50 },
  eye:      { functional: 10,  structural: 20 },
  ear:      { functional: 8,   structural: 16 },
  wing:     { functional: 35,  structural: 70 },
  tail:     { functional: 30,  structural: 60 },
  horn:     { functional: 15,  structural: 30 },
  claw:     { functional: 12,  structural: 24 },
  fang:     { functional: 10,  structural: 20 },
  tentacle: { functional: 25,  structural: 50 },
  pincer:   { functional: 30,  structural: 60 },
  special:  { functional: 50,  structural: 100 },
};

/**
 * Множитель структурной HP к функциональной
 */
export const STRUCTURAL_HP_MULTIPLIER = 2;

/**
 * Максимальное время свежести конечности (ТИКов)
 * 24 часа = 1440 тиков
 */
export const MAX_FRESH_LIMB_TICKS = 1440;

/**
 * Минимальный уровень культивации для атаки сердца
 */
export const MIN_LEVEL_FOR_HEART_ATTACK = 5;

/**
 * Минимальный уровень культивации для регенерации конечностей
 */
export const MIN_LEVEL_FOR_LIMB_REGENERATION = 8;

/**
 * Порог торса для доступа к сердцу (% структурной HP)
 */
export const HEART_VULNERABILITY_TORSO_THRESHOLD = 0.5;
