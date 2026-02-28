/**
 * ============================================================================
 * ENVIRONMENT EVENT HANDLER - Обработчик событий окружения
 * ============================================================================
 * 
 * Версия: 1.0.0
 */

import type { GameEvent } from '../../events/game-events';
import type { EventResult, EventContext } from '../types';
import { TruthSystem } from '../../truth-system';

export async function handleEnvironmentEvent(
  event: GameEvent,
  context: EventContext
): Promise<EventResult> {
  context.log('info', `Processing environment event: ${event.type}`);

  const session = TruthSystem.getSessionState(context.sessionId);

  if (!session) {
    return {
      success: false,
      eventId: context.eventId,
      error: 'Session not loaded in TruthSystem',
      commands: [],
    };
  }

  switch (event.type) {
    case 'environment:enter':
      return handleEnter(event, context, session);

    case 'environment:leave':
      return handleLeave(event, context, session);

    case 'environment:interact':
      return handleInteract(event, context, session);

    default:
      return {
        success: false,
        eventId: context.eventId,
        error: `Unknown environment event: ${event.type}`,
        commands: [],
      };
  }
}

async function handleEnter(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getSessionState>>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    zoneId: string;
    zoneType: string;
    position: { x: number; y: number };
  };

  const { zoneId, zoneType } = typedEvent;
  context.log('info', `Entering zone: ${zoneId} (${zoneType})`);

  const zoneEffects = getZoneEffects(zoneType);

  const commands = [
    {
      type: 'ui:show_notification',
      timestamp: Date.now(),
      data: {
        message: zoneEffects.message || `Entered ${zoneType} zone`,
        type: 'info',
        duration: 3000,
      },
    },
  ];

  return {
    success: true,
    eventId: context.eventId,
    commands,
    message: `Entered zone: ${zoneId}`,
  };
}

async function handleLeave(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getSessionState>>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    zoneId: string;
    zoneType: string;
  };

  context.log('info', `Leaving zone: ${typedEvent.zoneId}`);

  return {
    success: true,
    eventId: context.eventId,
    commands: [],
    message: `Left zone: ${typedEvent.zoneId}`,
  };
}

async function handleInteract(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getSessionState>>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    objectId: string;
    objectType: string;
    action: string;
    position: { x: number; y: number };
  };

  const { objectId, objectType, action } = typedEvent;
  context.log('info', `Interacting with ${objectType}: ${action}`);

  switch (objectType) {
    case 'chest':
      return {
        success: true,
        eventId: context.eventId,
        commands: [
          {
            type: 'object:update',
            timestamp: Date.now(),
            data: { objectId, properties: { opened: true } },
          },
        ],
        message: 'Chest opened!',
      };

    case 'npc':
      return {
        success: true,
        eventId: context.eventId,
        commands: [
          {
            type: 'ui:show_dialog',
            timestamp: Date.now(),
            data: { npcId: objectId },
          },
        ],
        message: 'Started conversation',
      };

    case 'resource':
      return {
        success: true,
        eventId: context.eventId,
        commands: [
          {
            type: 'object:remove',
            timestamp: Date.now(),
            data: { objectId, fadeOut: true },
          },
        ],
        message: 'Resource gathered',
      };

    default:
      return {
        success: true,
        eventId: context.eventId,
        commands: [],
        message: `Interacted with ${objectType}: ${action}`,
      };
  }
}

function getZoneEffects(zoneType: string): {
  qiRegenBonus?: number;
  dangerLevel?: number;
  message?: string;
} {
  switch (zoneType) {
    case 'qi_rich':
      return {
        qiRegenBonus: 0.5,
        message: 'Qi-rich area detected. Regeneration increased.',
      };

    case 'dangerous':
      return {
        dangerLevel: 1,
        message: 'Dangerous area! Be careful.',
      };

    case 'safe':
      return {
        message: 'Safe zone. You can rest here.',
      };

    case 'dungeon':
      return {
        dangerLevel: 2,
        message: 'Ancient dungeon. Enemies lurk in the shadows.',
      };

    case 'town':
      return {
        message: 'You enter the town.',
      };

    default:
      return {};
  }
}

export default handleEnvironmentEvent;
