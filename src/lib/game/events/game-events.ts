/**
 * ============================================================================
 * GAME EVENTS - Типы игровых событий для Event Bus
 * ============================================================================
 * 
 * Система ивентов для разделения Engine (Phaser) и Skeleton (TruthSystem).
 * Engine генерирует ивенты, Skeleton обрабатывает и возвращает результаты.
 * 
 * Версия: 1.0.0
 * Дата: 2026-02-28
 * ============================================================================
 */

// ==================== КОНСТАНТЫ ТИПОВ ИВЕНТОВ ====================

/**
 * Типы боевых ивентов
 */
export const COMBAT_EVENT_TYPES = {
  DAMAGE_DEALT: 'combat:damage_dealt',
  DAMAGE_RECEIVED: 'combat:damage_received',
  TECHNIQUE_USE: 'technique:use',
  TECHNIQUE_CHARGE_START: 'technique:charge_start',
  TECHNIQUE_CHARGE_CANCEL: 'technique:charge_cancel',
} as const;

/**
 * Типы ивентов окружения
 */
export const ENVIRONMENT_EVENT_TYPES = {
  ENTER: 'environment:enter',
  LEAVE: 'environment:leave',
  INTERACT: 'environment:interact',
} as const;

/**
 * Типы ивентов инвентаря
 */
export const INVENTORY_EVENT_TYPES = {
  USE_ITEM: 'inventory:use_item',
  EQUIP_ITEM: 'inventory:equip_item',
  UNEQUIP_ITEM: 'inventory:unequip_item',
  DROP_ITEM: 'inventory:drop_item',
  PICKUP_ITEM: 'item:pickup',
} as const;

/**
 * Типы ивентов движения
 */
export const MOVEMENT_EVENT_TYPES = {
  MOVE: 'player:move',
  TELEPORT: 'player:teleport',
} as const;

/**
 * Все типы ивентов
 */
export const EVENT_TYPES = {
  ...COMBAT_EVENT_TYPES,
  ...ENVIRONMENT_EVENT_TYPES,
  ...INVENTORY_EVENT_TYPES,
  ...MOVEMENT_EVENT_TYPES,
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// ==================== БАЗОВЫЙ ИНТЕРФЕЙС ====================

/**
 * Базовый интерфейс для всех игровых ивентов
 */
export interface GameEventBase {
  /** Уникальный ID ивента */
  id: string;
  /** Тип ивента */
  type: EventType;
  /** ID сессии */
  sessionId: string;
  /** ID персонажа */
  characterId: string;
  /** Время создания (ms) */
  timestamp: number;
}

// ==================== БОЕВЫЕ ИВЕНТЫ ====================

/**
 * Цель атаки
 */
export type TargetType = 'training_dummy' | 'enemy' | 'player' | 'object';

/**
 * Ивент: Нанесение урона цели
 * 
 * Генерируется Phaser когда игрок атакует цель.
 * Skeleton рассчитывает реальный урон и возвращает результат.
 */
export interface CombatDamageDealtEvent extends GameEventBase {
  type: typeof EVENT_TYPES.DAMAGE_DEALT;
  /** ID цели */
  targetId: string;
  /** Тип цели */
  targetType: TargetType;
  /** ID использованной техники */
  techniqueId: string;
  /** Позиция цели в мире (пиксели) */
  targetPosition: { x: number; y: number };
  /** Дистанция до цели (метры) */
  distance: number;
  /** Направление атаки (градусы, 0 = вправо) */
  rotation: number;
}

/**
 * Тип урона
 */
export type DamageType = 'physical' | 'fire' | 'water' | 'earth' | 'air' | 'lightning' | 'void' | 'neutral';

/**
 * Ивент: Получение урона
 * 
 * Генерируется когда игрок получает урон от врага/ловушки.
 */
export interface CombatDamageReceivedEvent extends GameEventBase {
  type: typeof EVENT_TYPES.DAMAGE_RECEIVED;
  /** ID источника урона */
  sourceId: string;
  /** Тип источника */
  sourceType: 'enemy' | 'trap' | 'environment' | 'player';
  /** Базовый урон (до применения защиты) */
  baseDamage: number;
  /** Тип урона */
  damageType: DamageType;
  /** Позиция источника */
  sourcePosition: { x: number; y: number };
}

/**
 * Ивент: Использование техники
 * 
 * Запрос на использование техники.
 * Skeleton проверяет Ци, рассчитывает эффекты.
 */
export interface TechniqueUseEvent extends GameEventBase {
  type: typeof EVENT_TYPES.TECHNIQUE_USE;
  /** ID техники */
  techniqueId: string;
  /** ID цели (опционально) */
  targetId?: string;
  /** Тип цели (опционально) */
  targetType?: TargetType;
  /** Позиция применения */
  position: { x: number; y: number };
  /** Направление (градусы) */
  rotation: number;
  /** Дистанция до цели (если есть) */
  distance?: number;
}

/**
 * Ивент: Начало зарядки техники
 */
export interface TechniqueChargeStartEvent extends GameEventBase {
  type: typeof EVENT_TYPES.TECHNIQUE_CHARGE_START;
  /** ID техники */
  techniqueId: string;
  /** Индекс слота */
  slotIndex: number;
}

/**
 * Ивент: Отмена зарядки техники
 */
export interface TechniqueChargeCancelEvent extends GameEventBase {
  type: typeof EVENT_TYPES.TECHNIQUE_CHARGE_CANCEL;
  /** ID техники */
  techniqueId: string;
  /** Индекс слота */
  slotIndex: number;
}

// ==================== ИВЕНТЫ ОКРУЖЕНИЯ ====================

/**
 * Тип зоны
 */
export type ZoneType = 'qi_rich' | 'dangerous' | 'safe' | 'dungeon' | 'town';

/**
 * Ивент: Вход в зону
 */
export interface EnvironmentEnterEvent extends GameEventBase {
  type: typeof EVENT_TYPES.ENTER;
  /** ID зоны */
  zoneId: string;
  /** Тип зоны */
  zoneType: ZoneType;
  /** Позиция игрока */
  position: { x: number; y: number };
}

/**
 * Ивент: Выход из зоны
 */
export interface EnvironmentLeaveEvent extends GameEventBase {
  type: typeof EVENT_TYPES.LEAVE;
  /** ID зоны */
  zoneId: string;
  /** Тип зоны */
  zoneType: ZoneType;
  /** Позиция игрока */
  position: { x: number; y: number };
}

/**
 * Тип интерактивного объекта
 */
export type InteractiveObjectType = 'item' | 'chest' | 'door' | 'lever' | 'npc' | 'resource' | 'altar';

/**
 * Действие с объектом
 */
export type ObjectAction = 'examine' | 'use' | 'open' | 'close' | 'talk' | 'take';

/**
 * Ивент: Взаимодействие с объектом
 */
export interface EnvironmentInteractEvent extends GameEventBase {
  type: typeof EVENT_TYPES.INTERACT;
  /** ID объекта */
  objectId: string;
  /** Тип объекта */
  objectType: InteractiveObjectType;
  /** Действие */
  action: ObjectAction;
  /** Позиция объекта */
  position: { x: number; y: number };
}

// ==================== ИВЕНТЫ ИНВЕНТАРЯ ====================

/**
 * Ивент: Использование предмета
 */
export interface InventoryUseItemEvent extends GameEventBase {
  type: typeof EVENT_TYPES.USE_ITEM;
  /** ID предмета */
  itemId: string;
  /** Количество */
  quantity: number;
}

/**
 * Ивент: Экипировка предмета
 */
export interface InventoryEquipItemEvent extends GameEventBase {
  type: typeof EVENT_TYPES.EQUIP_ITEM;
  /** ID предмета */
  itemId: string;
  /** ID слота экипировки */
  slotId: string;
}

/**
 * Ивент: Снятие предмета
 */
export interface InventoryUnequipItemEvent extends GameEventBase {
  type: typeof EVENT_TYPES.UNEQUIP_ITEM;
  /** ID слота экипировки */
  slotId: string;
}

/**
 * Ивент: Выбрасывание предмета
 */
export interface InventoryDropItemEvent extends GameEventBase {
  type: typeof EVENT_TYPES.DROP_ITEM;
  /** ID предмета */
  itemId: string;
  /** Количество */
  quantity: number;
  /** Позиция выбрасывания */
  position: { x: number; y: number };
}

/**
 * Ивент: Подбор предмета
 */
export interface ItemPickupEvent extends GameEventBase {
  type: typeof EVENT_TYPES.PICKUP_ITEM;
  /** ID предмета в мире */
  worldItemId: string;
  /** Тип предмета */
  itemType: string;
  /** Позиция предмета */
  position: { x: number; y: number };
}

// ==================== ИВЕНТЫ ДВИЖЕНИЯ ====================

/**
 * Ивент: Движение игрока
 * 
 * Используется для:
 * - Пассивного восстановления Ци
 * - Продвижения времени
 * - Проверки зон
 */
export interface PlayerMoveEvent extends GameEventBase {
  type: typeof EVENT_TYPES.MOVE;
  /** Начальная позиция */
  fromPosition: { x: number; y: number };
  /** Конечная позиция */
  toPosition: { x: number; y: number };
  /** Пройденное расстояние (метры) */
  distanceMeters: number;
  /** Время движения (ms) */
  durationMs: number;
}

/**
 * Ивент: Телепортация
 */
export interface PlayerTeleportEvent extends GameEventBase {
  type: typeof EVENT_TYPES.TELEPORT;
  /** Целевая позиция */
  targetPosition: { x: number; y: number };
  /** ID целевой локации (если междугородняя) */
  targetLocationId?: string;
  /** Техника телепортации (если есть) */
  techniqueId?: string;
}

// ==================== UNION ТИПЫ ====================

/**
 * Все боевые ивенты
 */
export type CombatEvent = 
  | CombatDamageDealtEvent 
  | CombatDamageReceivedEvent 
  | TechniqueUseEvent
  | TechniqueChargeStartEvent
  | TechniqueChargeCancelEvent;

/**
 * Все ивенты окружения
 */
export type EnvironmentEvent = 
  | EnvironmentEnterEvent 
  | EnvironmentLeaveEvent 
  | EnvironmentInteractEvent;

/**
 * Все ивенты инвентаря
 */
export type InventoryEvent = 
  | InventoryUseItemEvent 
  | InventoryEquipItemEvent 
  | InventoryUnequipItemEvent 
  | InventoryDropItemEvent 
  | ItemPickupEvent;

/**
 * Все ивенты движения
 */
export type MovementEvent = 
  | PlayerMoveEvent 
  | PlayerTeleportEvent;

/**
 * Все игровые ивенты
 */
export type GameEvent = 
  | CombatEvent 
  | EnvironmentEvent 
  | InventoryEvent 
  | MovementEvent;

// ==================== УТИЛИТЫ ====================

/**
 * Генерация уникального ID ивента
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Создание базового ивента
 */
export function createEventBase(
  type: EventType,
  sessionId: string,
  characterId: string
): GameEventBase {
  return {
    id: generateEventId(),
    type,
    sessionId,
    characterId,
    timestamp: Date.now(),
  };
}

/**
 * Type guard для проверки типа ивента
 */
export function isEventType<T extends GameEvent>(
  event: GameEvent, 
  type: EventType
): event is T {
  return event.type === type;
}

/**
 * Проверка, является ли ивент боевым
 */
export function isCombatEvent(event: GameEvent): event is CombatEvent {
  return Object.values(COMBAT_EVENT_TYPES).includes(event.type as typeof EVENT_TYPES[keyof typeof COMBAT_EVENT_TYPES]);
}

/**
 * Проверка, является ли ивент инвентарным
 */
export function isInventoryEvent(event: GameEvent): event is InventoryEvent {
  return Object.values(INVENTORY_EVENT_TYPES).includes(event.type as typeof EVENT_TYPES[keyof typeof INVENTORY_EVENT_TYPES]);
}

/**
 * Проверка, является ли ивент движения
 */
export function isMovementEvent(event: GameEvent): event is MovementEvent {
  return Object.values(MOVEMENT_EVENT_TYPES).includes(event.type as typeof EVENT_TYPES[keyof typeof MOVEMENT_EVENT_TYPES]);
}

/**
 * Проверка, является ли ивент окружения
 */
export function isEnvironmentEvent(event: GameEvent): event is EnvironmentEvent {
  return Object.values(ENVIRONMENT_EVENT_TYPES).includes(event.type as typeof EVENT_TYPES[keyof typeof ENVIRONMENT_EVENT_TYPES]);
}
