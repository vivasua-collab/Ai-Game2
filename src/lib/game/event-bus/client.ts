/**
 * ============================================================================
 * EVENT BUS CLIENT - Клиентская часть Event Bus
 * ============================================================================
 * 
 * Этот файл содержит ТОЛЬКО клиентский код.
 * НЕ импортируйте сюда серверные модули (TruthSystem, Prisma и т.д.)
 * 
 * Версия: 1.0.0
 */

import type { EventResult } from './types';
import type { GameEvent } from '../events/game-events';

// ==================== ТИПЫ ====================

export type { EventResult } from './types';

// ==================== КЛИЕНТСКАЯ УТИЛИТА ====================

/**
 * Отправить событие через Event Bus
 * 
 * @param event - Данные события (без id и timestamp - они генерируются автоматически)
 * @returns Promise с результатом обработки события
 * 
 * @example
 * const result = await sendEvent({
 *   type: 'combat:damage_dealt',
 *   sessionId: 'session_123',
 *   characterId: 'char_456',
 *   targetId: 'enemy_789',
 *   targetType: 'training_dummy',
 *   techniqueId: 'tech_basic_strike',
 *   targetPosition: { x: 500, y: 300 },
 *   distance: 100,
 *   rotation: 0,
 * });
 */
export async function sendEvent(
  event: Omit<GameEvent, 'id' | 'timestamp'> & { type: string }
): Promise<EventResult> {
  const fullEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  } as GameEvent;

  const response = await fetch('/api/game/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fullEvent),
  });

  return response.json();
}

/**
 * Получить статус Event Bus
 */
export async function getEventBusStatus(): Promise<{
  status: string;
  timestamp: number;
  sessions: { activeSessions: number; sessions: string[] };
}> {
  const response = await fetch('/api/game/event');
  return response.json();
}

/**
 * Получить поддерживаемые типы событий
 */
export async function getSupportedEventTypes(): Promise<{
  status: string;
  supportedTypes: string[];
}> {
  const response = await fetch('/api/game/event?action=types');
  return response.json();
}

/**
 * Проверить статус сессии
 */
export async function checkSessionStatus(sessionId: string): Promise<{
  loaded: boolean;
  sessionId: string;
  stats: { characterId: string; isDirty: boolean; lastSavedAt: Date } | null;
}> {
  const response = await fetch(`/api/game/event?action=session&sessionId=${sessionId}`);
  return response.json();
}

export default { sendEvent, getEventBusStatus, getSupportedEventTypes, checkSessionStatus };
