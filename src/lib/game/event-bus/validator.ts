/**
 * ============================================================================
 * EVENT BUS VALIDATOR - Валидация входящих событий
 * ============================================================================
 * 
 * Централизованная валидация всех событий перед обработкой.
 * 
 * Версия: 1.0.0
 */

import type { ValidationResult } from './types';
import { EVENT_TYPES, type EventType, type GameEventBase } from '../events/game-events';

// ==================== КОНСТАНТЫ ====================

/** Обязательные поля для всех событий */
const REQUIRED_FIELDS = ['id', 'type', 'sessionId', 'characterId', 'timestamp'] as const;

/** Максимальная длина ID */
const MAX_ID_LENGTH = 100;

/** Максимальная длина типа события */
const MAX_TYPE_LENGTH = 50;

// ==================== ОСНОВНАЯ ВАЛИДАЦИЯ ====================

/**
 * Валидация базовой структуры события
 */
export function validateEventBase(event: unknown): ValidationResult {
  // Проверяем, что это объект
  if (!event || typeof event !== 'object') {
    return { valid: false, error: 'Event must be an object' };
  }

  const obj = event as Record<string, unknown>;

  // Проверяем обязательные поля
  for (const field of REQUIRED_FIELDS) {
    if (!(field in obj)) {
      return { valid: false, error: `Missing required field: ${field}`, field };
    }

    const value = obj[field];

    // ID и sessionId должны быть строками
    if (['id', 'sessionId', 'characterId'].includes(field)) {
      if (typeof value !== 'string') {
        return { valid: false, error: `Field ${field} must be a string`, field };
      }
      if (value.length === 0) {
        return { valid: false, error: `Field ${field} cannot be empty`, field };
      }
      if (value.length > MAX_ID_LENGTH) {
        return { valid: false, error: `Field ${field} exceeds max length`, field };
      }
    }

    // timestamp должен быть числом
    if (field === 'timestamp') {
      if (typeof value !== 'number') {
        return { valid: false, error: 'Field timestamp must be a number', field };
      }
      if (value <= 0) {
        return { valid: false, error: 'Field timestamp must be positive', field };
      }
    }

    // type должен быть валидным типом
    if (field === 'type') {
      if (typeof value !== 'string') {
        return { valid: false, error: 'Field type must be a string', field };
      }
      if (!isValidEventType(value)) {
        return { valid: false, error: `Unknown event type: ${value}`, field };
      }
    }
  }

  return { valid: true };
}

/**
 * Проверка, является ли тип события валидным
 */
export function isValidEventType(type: string): type is EventType {
  return Object.values(EVENT_TYPES).includes(type as EventType);
}

// ==================== СПЕЦИАЛИЗИРОВАННАЯ ВАЛИДАЦИЯ ====================

/**
 * Валидация боевых событий
 */
export function validateCombatEvent(event: Record<string, unknown>): ValidationResult {
  const type = event.type as string;

  switch (type) {
    case EVENT_TYPES.DAMAGE_DEALT: {
      if (!event.targetId || typeof event.targetId !== 'string') {
        return { valid: false, error: 'Missing or invalid targetId', field: 'targetId' };
      }
      if (!event.techniqueId || typeof event.techniqueId !== 'string') {
        return { valid: false, error: 'Missing or invalid techniqueId', field: 'techniqueId' };
      }
      if (!event.targetPosition || typeof event.targetPosition !== 'object') {
        return { valid: false, error: 'Missing targetPosition', field: 'targetPosition' };
      }
      break;
    }

    case EVENT_TYPES.TECHNIQUE_USE: {
      if (!event.techniqueId || typeof event.techniqueId !== 'string') {
        return { valid: false, error: 'Missing or invalid techniqueId', field: 'techniqueId' };
      }
      if (!event.position || typeof event.position !== 'object') {
        return { valid: false, error: 'Missing position', field: 'position' };
      }
      break;
    }
  }

  return { valid: true };
}

/**
 * Валидация событий инвентаря
 */
export function validateInventoryEvent(event: Record<string, unknown>): ValidationResult {
  const type = event.type as string;

  switch (type) {
    case EVENT_TYPES.USE_ITEM: {
      if (!event.itemId || typeof event.itemId !== 'string') {
        return { valid: false, error: 'Missing or invalid itemId', field: 'itemId' };
      }
      break;
    }

    case EVENT_TYPES.PICKUP_ITEM: {
      if (!event.worldItemId || typeof event.worldItemId !== 'string') {
        return { valid: false, error: 'Missing or invalid worldItemId', field: 'worldItemId' };
      }
      break;
    }
  }

  return { valid: true };
}

/**
 * Валидация событий окружения
 */
export function validateEnvironmentEvent(event: Record<string, unknown>): ValidationResult {
  const type = event.type as string;

  switch (type) {
    case EVENT_TYPES.ENTER:
    case EVENT_TYPES.LEAVE: {
      if (!event.zoneId || typeof event.zoneId !== 'string') {
        return { valid: false, error: 'Missing or invalid zoneId', field: 'zoneId' };
      }
      break;
    }

    case EVENT_TYPES.INTERACT: {
      if (!event.objectId || typeof event.objectId !== 'string') {
        return { valid: false, error: 'Missing or invalid objectId', field: 'objectId' };
      }
      break;
    }
  }

  return { valid: true };
}

/**
 * Валидация событий движения
 */
export function validateMovementEvent(event: Record<string, unknown>): ValidationResult {
  const type = event.type as string;

  switch (type) {
    case EVENT_TYPES.MOVE: {
      if (!event.fromPosition || typeof event.fromPosition !== 'object') {
        return { valid: false, error: 'Missing fromPosition', field: 'fromPosition' };
      }
      if (!event.toPosition || typeof event.toPosition !== 'object') {
        return { valid: false, error: 'Missing toPosition', field: 'toPosition' };
      }
      break;
    }

    case EVENT_TYPES.TELEPORT: {
      if (!event.targetPosition || typeof event.targetPosition !== 'object') {
        return { valid: false, error: 'Missing targetPosition', field: 'targetPosition' };
      }
      break;
    }
  }

  return { valid: true };
}

// ==================== ГЛАВНАЯ ФУНКЦИЯ ====================

/**
 * Полная валидация события
 */
export function validateEvent(event: unknown): ValidationResult {
  // Базовая валидация
  const baseResult = validateEventBase(event);
  if (!baseResult.valid) {
    return baseResult;
  }

  const obj = event as Record<string, unknown>;
  const type = obj.type as string;
  const category = type.split(':')[0];

  // Валидация по категории
  switch (category) {
    case 'combat':
    case 'technique':
      return validateCombatEvent(obj);

    case 'inventory':
    case 'item':
      return validateInventoryEvent(obj);

    case 'environment':
      return validateEnvironmentEvent(obj);

    case 'player':
      return validateMovementEvent(obj);

    default:
      return { valid: true };
  }
}

export default validateEvent;
