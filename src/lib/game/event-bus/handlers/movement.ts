/**
 * ============================================================================
 * MOVEMENT EVENT HANDLER - Обработчик событий движения
 * ============================================================================
 * 
 * Версия: 1.0.0
 */

import type { GameEvent } from '../../events/game-events';
import type { EventResult, EventContext } from '../types';
import { TruthSystem } from '../../truth-system';

const TIME_PER_METER = 1; // 1 минута игрового времени за метр
const TELEPORT_QI_COST = 50;

export async function handleMovementEvent(
  event: GameEvent,
  context: EventContext
): Promise<EventResult> {
  context.log('info', `Processing movement event: ${event.type}`);

  const truthSystem = TruthSystem.getInstance();
  const session = truthSystem.getSessionState(context.sessionId);

  if (!session) {
    return {
      success: false,
      eventId: context.eventId,
      error: 'Session not loaded in TruthSystem',
      commands: [],
    };
  }

  switch (event.type) {
    case 'player:move':
      return handleMove(event, context, session, truthSystem);

    case 'player:teleport':
      return handleTeleport(event, context, session, truthSystem);

    default:
      return {
        success: false,
        eventId: context.eventId,
        error: `Unknown movement event: ${event.type}`,
        commands: [],
      };
  }
}

async function handleMove(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>,
  truthSystem: ReturnType<typeof TruthSystem.getInstance>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    fromPosition: { x: number; y: number };
    toPosition: { x: number; y: number };
    distanceMeters: number;
    durationMs: number;
  };

  const { distanceMeters, durationMs } = typedEvent;
  context.log('info', `Moving ${distanceMeters.toFixed(1)}m`);

  // Продвигаем игровое время
  const minutesToAdvance = Math.floor(distanceMeters * TIME_PER_METER);

  if (minutesToAdvance > 0) {
    truthSystem.advanceTime(context.sessionId, minutesToAdvance);
  }

  // Получаем обновлённое состояние
  const updatedSession = truthSystem.getSessionState(context.sessionId);

  return {
    success: true,
    eventId: context.eventId,
    changes: {
      character: updatedSession?.character,
    },
    commands: [],
    message: `Moved ${distanceMeters.toFixed(1)}m (${durationMs}ms)`,
  };
}

async function handleTeleport(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>,
  truthSystem: ReturnType<typeof TruthSystem.getInstance>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    targetPosition: { x: number; y: number };
    targetLocationId?: string;
    techniqueId?: string;
  };

  const { targetPosition, targetLocationId, techniqueId } = typedEvent;
  context.log('info', `Teleporting to (${targetPosition.x}, ${targetPosition.y})`);

  // Если телепорт через технику - списываем Ци
  if (techniqueId) {
    const qiResult = truthSystem.spendQi(context.sessionId, TELEPORT_QI_COST);

    if (!qiResult.success) {
      return {
        success: false,
        eventId: context.eventId,
        error: `Not enough Qi for teleport. Need: ${TELEPORT_QI_COST}, Have: ${session.character.currentQi}`,
        commands: [],
      };
    }
  }

  // Если междугородняя телепортация
  if (targetLocationId) {
    const locationResult = await truthSystem.changeLocation(context.sessionId, targetLocationId);
    if (!locationResult.success) {
      return {
        success: false,
        eventId: context.eventId,
        error: locationResult.error || 'Failed to change location',
        commands: [],
      };
    }
  }

  // Получаем обновлённое состояние
  const updatedSession = truthSystem.getSessionState(context.sessionId);

  return {
    success: true,
    eventId: context.eventId,
    changes: {
      character: updatedSession?.character,
    },
    commands: [
      {
        type: 'character:teleport',
        timestamp: Date.now(),
        data: {
          position: targetPosition,
          locationId: targetLocationId,
        },
      },
      {
        type: 'camera:follow',
        timestamp: Date.now(),
        data: {
          targetId: 'player',
          lerp: 0.1,
        },
      },
    ],
    message: techniqueId
      ? `Teleported using technique (${TELEPORT_QI_COST} Qi)`
      : 'Teleported successfully',
  };
}

export default handleMovementEvent;
