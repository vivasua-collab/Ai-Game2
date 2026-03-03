/**
 * ============================================================================
 * VISUAL COMMANDS - Визуальные команды для Engine (Phaser)
 * ============================================================================
 * 
 * Команды генерируются Skeleton (сервером) и отправляются в Engine (Phaser)
 * для отображения эффектов без расчётов на клиенте.
 * 
 * Версия: 1.0.0
 * Дата: 2026-02-28
 * ============================================================================
 */

// ==================== КОНСТАНТЫ ТИПОВ КОМАНД ====================

/**
 * Типы визуальных команд
 */
export const VISUAL_COMMAND_TYPES = {
  // Урон
  SHOW_DAMAGE: 'visual:show_damage',
  SHOW_HEALING: 'visual:show_healing',
  
  // Эффекты
  SHOW_EFFECT: 'visual:show_effect',
  SHOW_BEAM: 'visual:show_beam',
  SHOW_AOE: 'visual:show_aoe',
  SHOW_EXPLOSION: 'visual:show_explosion',
  
  // Обновление UI
  UPDATE_HP_BAR: 'visual:update_hp_bar',
  UPDATE_QI_BAR: 'visual:update_qi_bar',
  UPDATE_CHARACTER: 'visual:update_character',
  
  // Звук
  PLAY_SOUND: 'audio:play',
  STOP_SOUND: 'audio:stop',
  
  // Объекты
  SPAWN_OBJECT: 'object:spawn',
  REMOVE_OBJECT: 'object:remove',
  UPDATE_OBJECT: 'object:update',
  
  // Камера
  CAMERA_SHAKE: 'camera:shake',
  CAMERA_FOLLOW: 'camera:follow',
} as const;

export type VisualCommandType = typeof VISUAL_COMMAND_TYPES[keyof typeof VISUAL_COMMAND_TYPES];

// ==================== БАЗОВЫЙ ИНТЕРФЕЙС ====================

/**
 * Базовый интерфейс визуальной команды
 */
export interface VisualCommandBase {
  /** Тип команды */
  type: VisualCommandType;
  /** Время выполнения (ms) */
  timestamp: number;
}

// ==================== КОМАНДЫ УРОНА ====================

/**
 * Элемент урона
 */
export type DamageElement = 
  | 'physical' 
  | 'fire' 
  | 'water' 
  | 'earth' 
  | 'air' 
  | 'lightning' 
  | 'void' 
  | 'neutral';

/**
 * Команда: Показать урон
 */
export interface ShowDamageCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.SHOW_DAMAGE;
  data: {
    /** Позиция X (пиксели) */
    x: number;
    /** Позиция Y (пиксели) */
    y: number;
    /** Количество урона */
    damage: number;
    /** Элемент урона */
    element?: DamageElement;
    /** Критический удар */
    isCritical?: boolean;
    /** Множитель (для отображения затухания) */
    multiplier?: number;
  };
}

/**
 * Команда: Показать исцеление
 */
export interface ShowHealingCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.SHOW_HEALING;
  data: {
    x: number;
    y: number;
    amount: number;
  };
}

// ==================== КОМАНДЫ ЭФФЕКТОВ ====================

/**
 * Тип визуального эффекта
 */
export type VisualEffectType = 
  | 'explosion' 
  | 'beam' 
  | 'aoe' 
  | 'shield' 
  | 'aura' 
  | 'trail'
  | 'impact';

/**
 * Команда: Показать эффект
 */
export interface ShowEffectCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.SHOW_EFFECT;
  data: {
    x: number;
    y: number;
    effectType: VisualEffectType;
    element?: DamageElement;
    /** Длительность (ms) */
    duration?: number;
    /** Радиус (для AOE) */
    radius?: number;
    /** Цвет (hex) */
    color?: number;
    /** Непрозрачность */
    alpha?: number;
  };
}

/**
 * Команда: Показать луч
 */
export interface ShowBeamCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.SHOW_BEAM;
  data: {
    /** Начальная позиция X */
    startX: number;
    /** Начальная позиция Y */
    startY: number;
    /** Конечная позиция X */
    endX: number;
    /** Конечная позиция Y */
    endY: number;
    element?: DamageElement;
    /** Толщина луча */
    width?: number;
    duration?: number;
  };
}

/**
 * Команда: Показать AOE
 */
export interface ShowAoeCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.SHOW_AOE;
  data: {
    x: number;
    y: number;
    radius: number;
    element?: DamageElement;
    duration?: number;
    /** Показывать зоны урона */
    showDamageZones?: boolean;
  };
}

// ==================== КОМАНДЫ UI ====================

/**
 * Команда: Обновить HP бар
 */
export interface UpdateHpBarCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.UPDATE_HP_BAR;
  data: {
    targetId: string;
    currentHp: number;
    maxHp: number;
    /** Показывать анимацию изменения */
    animate?: boolean;
  };
}

/**
 * Команда: Обновить Qi бар
 */
export interface UpdateQiBarCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.UPDATE_QI_BAR;
  data: {
    currentQi: number;
    maxQi: number;
    animate?: boolean;
  };
}

/**
 * Команда: Обновить состояние персонажа
 */
export interface UpdateCharacterCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.UPDATE_CHARACTER;
  data: {
    currentQi?: number;
    maxQi?: number;
    health?: number;
    fatigue?: number;
    mentalFatigue?: number;
  };
}

// ==================== КОМАНДЫ ЗВУКА ====================

/**
 * Команда: Воспроизвести звук
 */
export interface PlaySoundCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.PLAY_SOUND;
  data: {
    soundId: string;
    volume?: number;
    /** Зацикливание */
    loop?: boolean;
  };
}

/**
 * Команда: Остановить звук
 */
export interface StopSoundCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.STOP_SOUND;
  data: {
    soundId: string;
    /** Плавное затухание (ms) */
    fadeOut?: number;
  };
}

// ==================== КОМАНДЫ ОБЪЕКТОВ ====================

/**
 * Команда: Создать объект
 */
export interface SpawnObjectCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.SPAWN_OBJECT;
  data: {
    objectId: string;
    objectType: string;
    x: number;
    y: number;
    /** Дополнительные свойства */
    properties?: Record<string, unknown>;
  };
}

/**
 * Команда: Удалить объект
 */
export interface RemoveObjectCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.REMOVE_OBJECT;
  data: {
    objectId: string;
    /** Эффект исчезновения */
    fadeOut?: boolean;
  };
}

/**
 * Команда: Обновить объект
 */
export interface UpdateObjectCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.UPDATE_OBJECT;
  data: {
    objectId: string;
    /** Новая позиция */
    position?: { x: number; y: number };
    /** Новые свойства */
    properties?: Record<string, unknown>;
  };
}

// ==================== КОМАНДЫ КАМЕРЫ ====================

/**
 * Команда: Тряска камеры
 */
export interface CameraShakeCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.CAMERA_SHAKE;
  data: {
    /** Интенсивность (0-1) */
    intensity: number;
    /** Длительность (ms) */
    duration: number;
  };
}

/**
 * Команда: Следовать за объектом
 */
export interface CameraFollowCommand extends VisualCommandBase {
  type: typeof VISUAL_COMMAND_TYPES.CAMERA_FOLLOW;
  data: {
    targetId: string | null;
    /** Плавность следования */
    lerp?: number;
  };
}

// ==================== UNION ТИПЫ ====================

/**
 * Все визуальные команды
 */
export type VisualCommand = 
  | ShowDamageCommand 
  | ShowHealingCommand
  | ShowEffectCommand 
  | ShowBeamCommand 
  | ShowAoeCommand 
  | UpdateHpBarCommand 
  | UpdateQiBarCommand 
  | UpdateCharacterCommand
  | PlaySoundCommand 
  | StopSoundCommand
  | SpawnObjectCommand 
  | RemoveObjectCommand 
  | UpdateObjectCommand
  | CameraShakeCommand
  | CameraFollowCommand;

// ==================== УТИЛИТЫ ====================

/**
 * Генерация ID команды
 */
export function generateCommandId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Создание базовой команды
 */
export function createCommandBase(type: VisualCommandType): VisualCommandBase {
  return {
    type,
    timestamp: Date.now(),
  };
}

// ==================== ФАБРИКИ КОМАНД ====================

/**
 * Создать команду показа урона
 */
export function createShowDamageCommand(
  x: number,
  y: number,
  damage: number,
  options?: {
    element?: DamageElement;
    isCritical?: boolean;
    multiplier?: number;
  }
): ShowDamageCommand {
  return {
    type: VISUAL_COMMAND_TYPES.SHOW_DAMAGE,
    timestamp: Date.now(),
    data: {
      x,
      y,
      damage,
      ...options,
    },
  };
}

/**
 * Создать команду показа эффекта
 */
export function createShowEffectCommand(
  x: number,
  y: number,
  effectType: VisualEffectType,
  options?: {
    element?: DamageElement;
    duration?: number;
    radius?: number;
    color?: number;
    alpha?: number;
  }
): ShowEffectCommand {
  return {
    type: VISUAL_COMMAND_TYPES.SHOW_EFFECT,
    timestamp: Date.now(),
    data: {
      x,
      y,
      effectType,
      ...options,
    },
  };
}

/**
 * Создать команду показа луча
 */
export function createShowBeamCommand(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  options?: {
    element?: DamageElement;
    width?: number;
    duration?: number;
  }
): ShowBeamCommand {
  return {
    type: VISUAL_COMMAND_TYPES.SHOW_BEAM,
    timestamp: Date.now(),
    data: {
      startX,
      startY,
      endX,
      endY,
      ...options,
    },
  };
}

/**
 * Создать команду показа AOE
 */
export function createShowAoeCommand(
  x: number,
  y: number,
  radius: number,
  options?: {
    element?: DamageElement;
    duration?: number;
    showDamageZones?: boolean;
  }
): ShowAoeCommand {
  return {
    type: VISUAL_COMMAND_TYPES.SHOW_AOE,
    timestamp: Date.now(),
    data: {
      x,
      y,
      radius,
      ...options,
    },
  };
}

/**
 * Создать команду обновления HP бара
 */
export function createUpdateHpBarCommand(
  targetId: string,
  currentHp: number,
  maxHp: number,
  animate: boolean = true
): UpdateHpBarCommand {
  return {
    type: VISUAL_COMMAND_TYPES.UPDATE_HP_BAR,
    timestamp: Date.now(),
    data: {
      targetId,
      currentHp,
      maxHp,
      animate,
    },
  };
}

/**
 * Создать команду тряски камеры
 */
export function createCameraShakeCommand(
  intensity: number,
  duration: number
): CameraShakeCommand {
  return {
    type: VISUAL_COMMAND_TYPES.CAMERA_SHAKE,
    timestamp: Date.now(),
    data: {
      intensity,
      duration,
    },
  };
}
