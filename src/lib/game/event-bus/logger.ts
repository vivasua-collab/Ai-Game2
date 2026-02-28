/**
 * ============================================================================
 * EVENT BUS LOGGER - Логирование событий
 * ============================================================================
 * 
 * Централизованное логирование всех событий для аудита и отладки.
 * 
 * Версия: 1.0.0
 */

import type { GameEvent } from '../events/game-events';
import type { EventResult, EventBusStats } from './types';

// ==================== ХРАНИЛИЩЕ ЛОГОВ ====================

interface EventLogEntry {
  eventId: string;
  eventType: string;
  sessionId: string;
  characterId: string;
  timestamp: number;
  receivedAt: number;
  processedAt?: number;
  processingTimeMs?: number;
  success?: boolean;
  error?: string;
  commandsCount?: number;
}

// Хранилище логов в памяти (для отладки)
const eventLogs: EventLogEntry[] = [];
const MAX_LOGS = 1000;

// Статистика
const stats: EventBusStats = {
  totalProcessed: 0,
  successful: 0,
  failed: 0,
  avgProcessingTime: 0,
  byType: {},
};

// ==================== ЛОГИРОВАНИЕ ====================

/**
 * Залогировать получение события
 */
export function logEventReceived(event: GameEvent): void {
  const entry: EventLogEntry = {
    eventId: event.id,
    eventType: event.type,
    sessionId: event.sessionId,
    characterId: event.characterId,
    timestamp: event.timestamp,
    receivedAt: Date.now(),
  };

  eventLogs.unshift(entry);

  // Ограничиваем размер
  if (eventLogs.length > MAX_LOGS) {
    eventLogs.pop();
  }

  // Вывод в консоль
  console.log(`[EventBus] 📥 Received: ${event.type} (${event.id})`);
}

/**
 * Залогировать результат обработки
 */
export function logEventResult(event: GameEvent, result: EventResult, processingTime: number): void {
  // Обновляем запись в логах
  const entry = eventLogs.find(e => e.eventId === event.id);
  if (entry) {
    entry.processedAt = Date.now();
    entry.processingTimeMs = processingTime;
    entry.success = result.success;
    entry.error = result.error;
    entry.commandsCount = result.commands.length;
  }

  // Обновляем статистику
  stats.totalProcessed++;
  if (result.success) {
    stats.successful++;
  } else {
    stats.failed++;
  }

  // Скользящее среднее
  stats.avgProcessingTime = 
    (stats.avgProcessingTime * (stats.totalProcessed - 1) + processingTime) / 
    stats.totalProcessed;

  // Статистика по типу
  if (!stats.byType[event.type]) {
    stats.byType[event.type] = { count: 0, avgTime: 0, errors: 0 };
  }
  const typeStats = stats.byType[event.type];
  typeStats.count++;
  typeStats.avgTime = 
    (typeStats.avgTime * (typeStats.count - 1) + processingTime) / 
    typeStats.count;
  if (!result.success) {
    typeStats.errors++;
  }

  // Вывод в консоль
  const status = result.success ? '✅' : '❌';
  console.log(
    `[EventBus] ${status} Processed: ${event.type} (${processingTime}ms)` +
    (result.error ? ` - ${result.error}` : '') +
    (result.commands.length > 0 ? ` [${result.commands.length} commands]` : '')
  );
}

/**
 * Залогировать ошибку валидации
 */
export function logValidationError(event: unknown, error: string): void {
  console.warn(`[EventBus] ⚠️ Validation failed: ${error}`, event);
}

/**
 * Залогировать внутреннюю ошибку
 */
export function logInternalError(event: GameEvent, error: unknown): void {
  console.error(`[EventBus] 💥 Internal error processing ${event.type}:`, error);
}

// ==================== ПОЛУЧЕНИЕ ДАННЫХ ====================

/**
 * Получить последние логи
 */
export function getRecentLogs(count: number = 50): EventLogEntry[] {
  return eventLogs.slice(0, count);
}

/**
 * Получить лог конкретного события
 */
export function getEventLog(eventId: string): EventLogEntry | undefined {
  return eventLogs.find(e => e.eventId === eventId);
}

/**
 * Получить статистику
 */
export function getStats(): EventBusStats {
  return { ...stats };
}

/**
 * Сбросить статистику
 */
export function resetStats(): void {
  stats.totalProcessed = 0;
  stats.successful = 0;
  stats.failed = 0;
  stats.avgProcessingTime = 0;
  stats.byType = {};
}

/**
 * Очистить логи
 */
export function clearLogs(): void {
  eventLogs.length = 0;
}

// ==================== КОНТЕКСТНЫЙ ЛОГГЕР ====================

/**
 * Создать контекстный логгер для обработчика
 */
export function createContextLogger(
  eventId: string,
  eventType: string,
  sessionId: string
) {
  return {
    info: (message: string, data?: unknown) => {
      console.log(`[EventBus:${eventType}:${eventId}] ${message}`, data ?? '');
    },
    warn: (message: string, data?: unknown) => {
      console.warn(`[EventBus:${eventType}:${eventId}] ${message}`, data ?? '');
    },
    error: (message: string, data?: unknown) => {
      console.error(`[EventBus:${eventType}:${eventId}] ${message}`, data ?? '');
    },
  };
}

export default {
  logEventReceived,
  logEventResult,
  logValidationError,
  logInternalError,
  getRecentLogs,
  getEventLog,
  getStats,
  resetStats,
  clearLogs,
  createContextLogger,
};
