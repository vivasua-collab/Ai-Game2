/**
 * ============================================================================
 * SPINAL AI - Types
 * ============================================================================
 * 
 * Типы для классической (rules-based) Spinal AI системы.
 * Spinal AI - это быстрая рефлекторная система, работающая синхронно на клиенте.
 * 
 * Требования:
 * - Время выполнения update(): < 1мс
 * - Нет HTTP запросов внутри update()
 * - Нет Promise/async внутри update()
 * 
 * @see docs/NPC_AI_NEUROTHEORY.md
 * @see docs/checkpoints/checkpoint_03_24_spinal_ai_phase1.md
 */

// ==================== SIGNALS ====================

/**
 * Типы сигналов для Spinal AI
 */
export type SpinalSignalType =
  | 'danger_nearby'      // Опасность рядом (враг, ловушка)
  | 'damage'             // Получен урон
  | 'collision'          // Столкновение с объектом
  | 'edge_detected'      // Край обрыва/воды
  | 'loud_sound'         // Громкий звук
  | 'balance_lost'       // Потеря равновесия
  | 'qi_attack'          // Qi атака направлена на NPC
  | 'suppression'        // Подавление культивацией
  | 'ally_call'          // Зов союзника
  | 'player_nearby';     // Игрок рядом

/**
 * Сигнал для Spinal AI
 */
export interface SpinalSignal {
  type: SpinalSignalType;
  intensity: number;       // 0.0 - 1.0
  direction?: {            // Направление источника
    x: number;
    y: number;
  };
  source?: string;         // ID источника (игрок, другой NPC)
  timestamp: number;       // Время создания сигнала
}

// ==================== ACTIONS ====================

/**
 * Типы действий Spinal AI
 */
export type SpinalActionType =
  | 'dodge'           // Уклонение
  | 'flinch'          // Вздрогнуть
  | 'step_back'       // Шаг назад
  | 'stumble'         // Пошатнуться
  | 'turn_to_sound'   // Повернуться на звук
  | 'balance'         // Восстановить равновесие
  | 'qi_shield'       // Qi щит
  | 'freeze'          // Замереть
  | 'flee'            // Убежать
  | 'alert';          // Тревога

/**
 * Параметры действия
 */
export interface SpinalActionParams {
  direction?: { x: number; y: number };  // Направление действия
  speed?: number;                         // Скорость
  duration?: number;                      // Длительность в мс
  distance?: number;                      // Дистанция
  qiCost?: number;                        // Стоимость Qi
}

/**
 * Действие Spinal AI
 */
export interface SpinalAction {
  type: SpinalActionType;
  params: SpinalActionParams;
  priority: number;       // Приоритет действия
  timestamp: number;      // Время создания
  sourceReflex: string;   // ID рефлекса, вызвавшего действие
}

// ==================== REFLEXES ====================

/**
 * Условие триггера рефлекса
 */
export interface ReflexTrigger {
  signalType: SpinalSignalType;
  minIntensity: number;   // Минимальная интенсивность
  maxIntensity?: number;  // Максимальная интенсивность (опционально)
}

/**
 * Рефлекс Spinal AI
 */
export interface SpinalReflex {
  id: string;                          // Уникальный ID
  name: string;                        // Название
  trigger: ReflexTrigger;              // Условие триггера
  action: SpinalActionType;            // Действие
  priority: number;                    // Приоритет (0-100, выше = важнее)
  cooldown: number;                    // Кулдаун в мс
  lastTriggered?: number;              // Время последнего срабатывания
  
  // Модификаторы
  intensityModifier?: number;          // Множитель интенсивности (0.5 = половина)
  speedModifier?: number;              // Множитель скорости
  
  // Условия
  requiresQi?: number;                 // Требуется Qi
  requiresNotInState?: string[];       // Не работает в этих состояниях
}

// ==================== BODY STATE ====================

/**
 * Состояние тела NPC для Spinal AI
 */
export interface SpinalBodyState {
  // Позиция и движение
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  facing: number;           // Угол направления в градусах
  
  // Здоровье
  hp: number;
  maxHp: number;
  
  // Qi (для культиваторов)
  qi?: number;
  maxQi?: number;
  
  // Состояния
  isGrounded: boolean;      // На земле?
  isMoving: boolean;        // Движется?
  isInCombat: boolean;      // В бою?
  isSuppressed: boolean;    // Подавлен культивацией?
  
  // Ближайшие угрозы
  nearestThreat?: {
    id: string;
    position: { x: number; y: number };
    distance: number;
    level?: number;
  };
  
  // Окружение
  isNearEdge: boolean;
  nearbyAllies: number;     // Количество союзников рядом
}

// ==================== PRESETS ====================

/**
 * Тип пресета NPC
 */
export type SpinalPresetType = 'monster' | 'guard' | 'passerby' | 'cultivator';

/**
 * Конфигурация пресета
 */
export interface SpinalPreset {
  type: SpinalPresetType;
  name: string;
  reflexes: SpinalReflex[];
  
  // Глобальные модификаторы
  globalIntensityModifier: number;   // Множитель интенсивности всех сигналов
  globalSpeedModifier: number;       // Множитель скорости всех реакций
  
  // Пороги
  sensitivity: number;               // Чувствительность (0.5 = низкая, 1.0 = нормальная, 1.5 = высокая)
}

// ==================== DEBUG ====================

/**
 * Информация для отладки
 */
export interface SpinalDebugInfo {
  npcId: string;
  currentReflex: string | null;
  lastSignal: SpinalSignal | null;
  lastAction: SpinalAction | null;
  signalQueue: number;               // Размер очереди сигналов
  updateCount: number;               // Количество вызовов update()
  avgUpdateTime: number;             // Среднее время update() в мс
}

// ==================== CONTROLLER ====================

/**
 * Интерфейс SpinalController
 */
export interface ISpinalController {
  // Приём сигнала
  receiveSignal(signal: SpinalSignal): void;
  
  // Обновление каждый кадр (< 1мс)
  update(deltaMs: number, state: SpinalBodyState): SpinalAction | null;
  
  // Управление рефлексами
  loadPreset(preset: SpinalPresetType): void;
  addReflex(reflex: SpinalReflex): void;
  removeReflex(reflexId: string): void;
  
  // Состояние
  getCurrentReflex(): string | null;
  getDebugInfo(): SpinalDebugInfo;
  
  // Отладка
  setDebugEnabled(enabled: boolean): void;
}

// ==================== EVENTS ====================

/**
 * Событие для отправки на сервер
 */
export interface SpinalServerEvent {
  type: 'damage_received' | 'death' | 'combat_start' | 'combat_end';
  npcId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// ==================== CONSTANTS ====================

/**
 * Константы Spinal AI
 */
export const SPINAL_CONSTANTS = {
  // Время выполнения
  MAX_UPDATE_TIME_MS: 1,           // Максимальное время update()
  
  // Приоритеты
  PRIORITY_MAX: 100,
  PRIORITY_HIGH: 80,
  PRIORITY_MEDIUM: 50,
  PRIORITY_LOW: 20,
  
  // Кулдауны
  DODGE_COOLDOWN: 500,             // 500мс между уклонениями
  FLINCH_COOLDOWN: 300,            // 300мс между вздрагиваниями
  STEP_BACK_COOLDOWN: 1000,        // 1с между отступлениями
  
  // Длительности
  DODGE_DURATION: 200,             // 200мс уклонение
  FLINCH_DURATION: 150,            // 150мс вздрагивание
  
  // Расстояния
  DODGE_DISTANCE: 50,              // 50 пикселей уклонение
  STEP_BACK_DISTANCE: 30,          // 30 пикселей шаг назад
  
  // Скорости
  DODGE_SPEED: 300,                // 300 пикселей/сек
  STEP_BACK_SPEED: 100,            // 100 пикселей/сек
  
  // Qi
  QI_SHIELD_COST: 20,              // 20 Qi для щита
  
  // Очередь сигналов
  MAX_SIGNAL_QUEUE: 10,            // Максимум сигналов в очереди
  SIGNAL_LIFETIME_MS: 500,         // Сигналы старше 500мс отбрасываются
} as const;
