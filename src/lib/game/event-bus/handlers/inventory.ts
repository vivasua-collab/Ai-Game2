/**
 * ============================================================================
 * INVENTORY EVENT HANDLER - Обработчик событий инвентаря
 * ============================================================================
 * 
 * Версия: 1.0.0
 */

import type { GameEvent } from '../../events/game-events';
import type { EventResult, EventContext } from '../types';
import { TruthSystem } from '../../truth-system';

export async function handleInventoryEvent(
  event: GameEvent,
  context: EventContext
): Promise<EventResult> {
  context.log('info', `Processing inventory event: ${event.type}`);

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
    case 'inventory:use_item':
      return handleUseItem(event, context, session);

    case 'item:pickup':
      return handlePickup(event, context, session);

    case 'inventory:equip_item':
      return handleEquip(event, context, session);

    case 'inventory:unequip_item':
      return handleUnequip(event, context, session);

    case 'inventory:drop_item':
      return handleDrop(event, context, session);

    default:
      return {
        success: false,
        eventId: context.eventId,
        error: `Unknown inventory event: ${event.type}`,
        commands: [],
      };
  }
}

async function handleUseItem(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getSessionState>>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    itemId: string;
    quantity: number;
  };

  const { itemId, quantity } = typedEvent;
  context.log('info', `Using item: ${itemId}`);

  // Ищем предмет в инвентаре
  const inventory = TruthSystem.getInventory(context.sessionId);
  const item = inventory.find(i => i.id === itemId);

  if (!item) {
    return {
      success: false,
      eventId: context.eventId,
      error: 'Item not found in inventory',
      commands: [],
    };
  }

  const commands = [];
  const changes: Record<string, unknown> = {};

  // Применяем эффекты предмета
  const effects = item.effects as Record<string, number> | null;

  if (effects) {
    if (effects.qiRestore) {
      const result = TruthSystem.addQi(context.sessionId, effects.qiRestore);
      if (result.success && result.data) {
        changes.currentQi = result.data.currentQi;
      }
    }

    if (effects.healthRestore) {
      const newHealth = Math.min(100, session.character.health + effects.healthRestore);
      TruthSystem.updateCharacter(context.sessionId, { health: newHealth });
      changes.health = newHealth;
    }
  }

  return {
    success: true,
    eventId: context.eventId,
    changes: { character: changes },
    commands,
    message: `Used ${item.name} x${quantity}`,
  };
}

async function handlePickup(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getSessionState>>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    worldItemId: string;
    itemType: string;
    position: { x: number; y: number };
  };

  const { itemType, position } = typedEvent;
  context.log('info', `Picking up: ${itemType}`);

  const result = await TruthSystem.addInventoryItem(context.sessionId, {
    name: itemType,
    type: itemType,
    quantity: 1,
    isConsumable: false,
  });

  if (result.success) {
    return {
      success: true,
      eventId: context.eventId,
      commands: [
        {
          type: 'visual:show_effect',
          timestamp: Date.now(),
          data: {
            x: position.x,
            y: position.y,
            effectType: 'aura',
            duration: 500,
            alpha: 0.5,
          },
        },
      ],
      message: `Picked up ${itemType}`,
    };
  }

  return {
    success: false,
    eventId: context.eventId,
    error: result.error || 'Failed to pick up item',
    commands: [],
  };
}

async function handleEquip(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getSessionState>>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    itemId: string;
    slotId: string;
  };

  context.log('info', `Equipping: ${typedEvent.itemId} to ${typedEvent.slotId}`);

  return {
    success: true,
    eventId: context.eventId,
    commands: [],
    message: `Equipped item to ${typedEvent.slotId}`,
  };
}

async function handleUnequip(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getSessionState>>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & { slotId: string };

  context.log('info', `Unequipping: ${typedEvent.slotId}`);

  return {
    success: true,
    eventId: context.eventId,
    commands: [],
    message: `Unequipped item from ${typedEvent.slotId}`,
  };
}

async function handleDrop(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getSessionState>>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    itemId: string;
    quantity: number;
    position: { x: number; y: number };
  };

  context.log('info', `Dropping: ${typedEvent.itemId}`);

  return {
    success: true,
    eventId: context.eventId,
    commands: [
      {
        type: 'visual:show_effect',
        timestamp: Date.now(),
        data: {
          x: typedEvent.position.x,
          y: typedEvent.position.y,
          effectType: 'aura',
          duration: 300,
          alpha: 0.3,
        },
      },
    ],
    message: 'Dropped item',
  };
}

export default handleInventoryEvent;
