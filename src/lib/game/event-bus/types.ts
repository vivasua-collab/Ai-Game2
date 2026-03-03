/**
 * ============================================================================
 * EVENT BUS TYPES - Типы для Event Bus
 * ============================================================================
 * 
 * Версия: 1.0.0
 */

import type { GameEvent } from '../events/game-events';
import type { VisualCommand } from '../events/visual-commands';

// ==================== РЕЗУЛЬТАТ ОБРАБОТКИ ====================

export interface EventResult {
  success: boolean;
  eventId: string;
  error?: string;
  changes?: {
    character?: Record<string, unknown>;
    inventory?: unknown[];
    techniques?: unknown[];
    world?: Record<string, unknown>;
  };
  commands: VisualCommand[];
  message?: string;
  metadata?: {
    processingTimeMs: number;
    handler: string;
  };
}

// ==================== ВАЛИДАЦИЯ ====================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  field?: string;
}

// ==================== КОНТЕКСТ ОБРАБОТКИ ====================

export interface EventContext {
  sessionId: string;
  characterId: string;
  eventId: string;
  startTime: number;
  log: (level: 'info' | 'warn' | 'error', message: string, data?: unknown) => void;
}

// ==================== HANDLER ====================

export type EventHandler<T extends GameEvent = GameEvent> = (
  event: T,
  context: EventContext
) => Promise<EventResult>;

// ==================== РЕГИСТР ОБРАБОТЧИКОВ ====================

export type HandlerRegistry = Map<string, EventHandler>;

// ==================== СТАТИСТИКА ====================

export interface EventBusStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  avgProcessingTime: number;
  byType: Record<string, {
    count: number;
    avgTime: number;
    errors: number;
  }>;
}
