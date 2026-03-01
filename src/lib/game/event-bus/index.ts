/**
 * ============================================================================
 * EVENT BUS - Главная точка входа
 * ============================================================================
 * 
 * Event Bus — граница доступа между Engine (клиент) и Skeleton (сервер).
 * 
 * Архитектура:
 * ```
 * Engine (Phaser) → HTTP POST /api/game/event → Event Bus → Handlers → TruthSystem
 *                                                                      ↓
 * Engine ← HTTP Response ← commands, result ←─────────────────────────┘
 * ```
 * 
 * ВАЖНО: Этот файл содержит серверный код.
 * Для клиентского использования импортируйте из './client':
 * 
 * // Клиентский код:
 * import { sendEvent } from '@/lib/game/event-bus/client';
 * 
 * // Серверный код:
 * import { processEvent } from '@/lib/game/event-bus';
 * 
 * Версия: 2.0.0
 */

// ==================== СЕРВЕРНЫЙ PACKAGE ====================

import 'server-only';

// ==================== ОСНОВНЫЕ ЭКСПОРТЫ ====================

export { processEvent, getSupportedEventTypes, isEventTypeSupported, registerHandler, unregisterHandler } from './processor';
export { validateEvent } from './validator';

// ==================== ТИПЫ ====================

export type {
  EventResult,
  EventContext,
  EventHandler,
  HandlerRegistry,
  EventBusStats,
  ValidationResult,
} from './types';

// ==================== HANDLERS (только для сервера) ====================

export { handleCombatEvent } from './handlers/combat';
export { handleInventoryEvent } from './handlers/inventory';
export { handleEnvironmentEvent } from './handlers/environment';
export { handleMovementEvent } from './handlers/movement';

// ==================== КЛИЕНТСКИЕ УТИЛИТЫ ====================

// Реэкспорт для обратной совместимости, но с предупреждением
// ВАЖНО: Используйте '@/lib/game/event-bus/client' для клиентского кода!
export { sendEvent, getEventBusStatus, checkSessionStatus } from './client';

export default { processEvent };
