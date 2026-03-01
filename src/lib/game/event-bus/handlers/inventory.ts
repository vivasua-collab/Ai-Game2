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
    case 'inventory:use_item':
      return handleUseItem(event, context, session, truthSystem);

    case 'item:pickup':
      return handlePickup(event, context, session, truthSystem);

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
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>,
  truthSystem: ReturnType<typeof TruthSystem.getInstance>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    itemId: string;
    quantity: number;
  };

  const { itemId, quantity } = typedEvent;
  context.log('info', `Using item: ${itemId}`);

  // Ищем предмет в инвентаре
  const inventory = truthSystem.getInventory(context.sessionId);
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
      const result = truthSystem.addQi(context.sessionId, effects.qiRestore);
      if (result.success && result.data) {
        changes.currentQi = result.data.currentQi;
      }
    }

    if (effects.healthRestore) {
      const newHealth = Math.min(100, session.character.health + effects.healthRestore);
      truthSystem.updateCharacter(context.sessionId, { health: newHealth });
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
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>,
  truthSystem: ReturnType<typeof TruthSystem.getInstance>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    worldItemId: string;
    itemType: string;
    position: { x: number; y: number };
  };

  const { itemType, position } = typedEvent;
  context.log('info', `Picking up: ${itemType}`);

  const result = await truthSystem.addInventoryItem(context.sessionId, {
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
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    itemId: string;
    slotId: string;
  };

  const { itemId, slotId } = typedEvent;
  context.log('info', `Equipping: ${itemId} to ${slotId}`);

  try {
    // Импортируем inventory service для работы с БД
    const { inventoryService } = await import('@/services/inventory.service');
    
    // Экипируем предмет через сервис
    const equipment = await inventoryService.equipItem(context.characterId, itemId, slotId);

    // Обновляем инвентарь в TruthSystem
    const items = await inventoryService.getCharacterItems(context.characterId);
    const truthSystem = TruthSystem.getInstance();
    truthSystem.updateInventory(context.sessionId, items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      quantity: item.quantity,
      rarity: item.rarity,
      isConsumable: item.isConsumable,
      effects: item.effects ? JSON.parse(item.effects) : null,
    })));

    // Генерируем команду для визуального обновления
    const commands = [
      {
        type: 'visual:equipment_changed',
        timestamp: Date.now(),
        data: {
          slotId,
          itemId,
          action: 'equip',
        },
      },
    ];

    return {
      success: true,
      eventId: context.eventId,
      commands,
      changes: {
        inventory: {
          equipped: { slotId, itemId },
        },
      },
      message: `Предмет экипирован в слот ${slotId}`,
    };
  } catch (error) {
    context.log('error', `Equip error: ${error}`);
    return {
      success: false,
      eventId: context.eventId,
      error: error instanceof Error ? error.message : 'Failed to equip item',
      commands: [],
    };
  }
}

async function handleUnequip(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & { slotId: string };

  const { slotId } = typedEvent;
  context.log('info', `Unequipping: ${slotId}`);

  try {
    // Импортируем inventory service для работы с БД
    const { inventoryService } = await import('@/services/inventory.service');
    
    // Снимаем предмет через сервис
    const equipment = await inventoryService.unequipItem(context.characterId, slotId);

    // Обновляем инвентарь в TruthSystem
    const items = await inventoryService.getCharacterItems(context.characterId);
    const truthSystem = TruthSystem.getInstance();
    truthSystem.updateInventory(context.sessionId, items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      quantity: item.quantity,
      rarity: item.rarity,
      isConsumable: item.isConsumable,
      effects: item.effects ? JSON.parse(item.effects) : null,
    })));

    // Генерируем команду для визуального обновления
    const commands = [
      {
        type: 'visual:equipment_changed',
        timestamp: Date.now(),
        data: {
          slotId,
          itemId: null,
          action: 'unequip',
        },
      },
    ];

    return {
      success: true,
      eventId: context.eventId,
      commands,
      changes: {
        inventory: {
          unequipped: { slotId },
        },
      },
      message: `Предмет снят из слота ${slotId}`,
    };
  } catch (error) {
    context.log('error', `Unequip error: ${error}`);
    return {
      success: false,
      eventId: context.eventId,
      error: error instanceof Error ? error.message : 'Failed to unequip item',
      commands: [],
    };
  }
}

async function handleDrop(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    itemId: string;
    quantity: number;
    position: { x: number; y: number };
  };

  const { itemId, quantity, position } = typedEvent;
  context.log('info', `Dropping: ${itemId} x${quantity}`);

  try {
    // Импортируем inventory service для работы с БД
    const { inventoryService, removeItem } = await import('@/services/inventory.service');
    
    // Удаляем предмет из инвентаря
    await removeItem(itemId, quantity);

    // Обновляем инвентарь в TruthSystem
    const items = await inventoryService.getCharacterItems(context.characterId);
    const truthSystem = TruthSystem.getInstance();
    truthSystem.updateInventory(context.sessionId, items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      quantity: item.quantity,
      rarity: item.rarity,
      isConsumable: item.isConsumable,
      effects: item.effects ? JSON.parse(item.effects) : null,
    })));

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
            duration: 300,
            alpha: 0.3,
          },
        },
        {
          type: 'visual:item_dropped',
          timestamp: Date.now(),
          data: {
            itemId,
            quantity,
            position,
          },
        },
      ],
      changes: {
        inventory: {
          dropped: { itemId, quantity },
        },
      },
      message: `Выброшено ${quantity} предмет(ов)`,
    };
  } catch (error) {
    context.log('error', `Drop error: ${error}`);
    return {
      success: false,
      eventId: context.eventId,
      error: error instanceof Error ? error.message : 'Failed to drop item',
      commands: [],
    };
  }
}

export default handleInventoryEvent;
