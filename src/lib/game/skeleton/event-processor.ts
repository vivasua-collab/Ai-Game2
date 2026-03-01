/**
 * ============================================================================
 * EVENT PROCESSOR - Центральный процессор игровых событий
 * ============================================================================
 * 
 * Обрабатывает события, приходящие от Event Bus, и делегирует их
 * в специализированные процессоры.
 * 
 * Интеграция с:
 * - TruthSystem (состояние)
 * - Combat System (бой)
 * - Qi System (Ци)
 * - Inventory System (инвентарь)
 * 
 * Версия: 1.0.0
 * ============================================================================
 */

import { TruthSystem } from '../truth-system';
import { processCombatEvent } from './combat-processor';
import type { 
  GameEvent, 
  EventResult, 
  VisualCommand,
  CombatDamageDealtEvent,
  TechniqueUseEvent,
} from '../events/game-events';
import { 
  createShowDamageCommand, 
  createUpdateHpBarCommand,
  createShowEffectCommand,
} from '../events/visual-commands';

// ==================== КОНСТАНТЫ ====================

const METERS_TO_PIXELS = 32;

// ==================== ТИПЫ ====================

interface CharacterChanges {
  currentQi?: number;
  health?: number;
  fatigue?: number;
  mentalFatigue?: number;
  spiritStones?: number;
}

// ==================== ГЛАВНЫЙ ПРОЦЕССОР ====================

/**
 * Обработать игровое событие
 */
export async function processGameEvent(event: GameEvent): Promise<EventResult> {
  console.log(`[EventProcessor] Processing: ${event.type}`);

  // Маршрутизация по категории
  const category = event.type.split(':')[0];

  switch (category) {
    case 'combat':
    case 'technique':
      return processCombatEventWrapper(event);

    case 'inventory':
    case 'item':
      return processInventoryEvent(event);

    case 'environment':
      return processEnvironmentEvent(event);

    case 'player':
      return processMovementEvent(event);

    default:
      console.warn(`[EventProcessor] Unknown category: ${category}`);
      return {
        success: false,
        eventId: event.id,
        error: `Unknown event category: ${category}`,
        commands: [],
      };
  }
}

// ==================== БОЕВЫЕ ИВЕНТЫ ====================

/**
 * Обёртка для боевых ивентов с интеграцией TruthSystem
 */
async function processCombatEventWrapper(event: GameEvent): Promise<EventResult> {
  const session = TruthSystem.getSessionState(event.sessionId);
  
  if (!session) {
    return {
      success: false,
      eventId: event.id,
      error: 'Session not loaded in TruthSystem',
      commands: [],
    };
  }

  // Обрабатываем через combat processor
  const result = await processCombatEvent(event, session);

  // ВАЖНО: combat processor уже списывает Ци напрямую через TruthSystem.spendQi()
  // Поэтому здесь НЕ нужно повторно применять changes.currentQi к Ци!
  // Только обновляем усталость и здоровье (которые combat processor не обновляет напрямую)

  if (result.success && result.changes?.character) {
    const changes = result.changes.character as CharacterChanges;

    // Обновляем усталость (combat processor может не обновить)
    if (changes.fatigue !== undefined || changes.mentalFatigue !== undefined) {
      TruthSystem.updateFatigue(
        event.sessionId,
        changes.fatigue ?? session.character.fatigue,
        changes.mentalFatigue ?? session.character.mentalFatigue
      );
    }

    // Обновляем здоровье
    if (changes.health !== undefined) {
      TruthSystem.updateCharacter(event.sessionId, { health: changes.health });
    }
    
    // Ци НЕ обновляем - combat processor уже это сделал!
    // changes.currentQi возвращается только для информации клиенту
  }

  return result;
}

// ==================== ИВЕНТЫ ИНВЕНТАРЯ ====================

/**
 * Обработка ивентов инвентаря
 */
async function processInventoryEvent(event: GameEvent): Promise<EventResult> {
  const session = TruthSystem.getSessionState(event.sessionId);
  
  if (!session) {
    return {
      success: false,
      eventId: event.id,
      error: 'Session not loaded in TruthSystem',
      commands: [],
    };
  }

  switch (event.type) {
    case 'inventory:use_item': {
      const { itemId, quantity } = event as GameEvent & { itemId: string; quantity: number };
      return handleUseItem(event.sessionId, event.characterId, itemId, quantity, event.id);
    }

    case 'item:pickup': {
      const { worldItemId, itemType, position } = event as GameEvent & {
        worldItemId: string;
        itemType: string;
        position: { x: number; y: number };
      };
      
      // Добавляем предмет в инвентарь через TruthSystem
      const result = await TruthSystem.addInventoryItem(event.sessionId, {
        name: itemType,
        type: itemType,
        quantity: 1,
        isConsumable: false,
      });

      if (result.success) {
        return {
          success: true,
          eventId: event.id,
          changes: {
            inventory: session.inventory,
          },
          commands: [
            createShowEffectCommand(position.x, position.y, 'aura', {
              duration: 500,
              alpha: 0.5,
            }),
          ],
          message: `Picked up ${itemType}`,
        };
      }

      return {
        success: false,
        eventId: event.id,
        error: result.error || 'Failed to pick up item',
        commands: [],
      };
    }

    default:
      return {
        success: false,
        eventId: event.id,
        error: `Unknown inventory event: ${event.type}`,
        commands: [],
      };
  }
}

/**
 * Использование предмета
 */
async function handleUseItem(
  sessionId: string,
  characterId: string,
  itemId: string,
  quantity: number,
  eventId: string
): Promise<EventResult> {
  // Получаем инвентарь
  const inventory = TruthSystem.getInventory(sessionId);
  const item = inventory.find(i => i.id === itemId);

  if (!item) {
    return {
      success: false,
      eventId,
      error: 'Item not found in inventory',
      commands: [],
    };
  }

  // Проверяем эффекты
  const effects = item.effects as Record<string, number> | null;
  
  if (!effects) {
    return {
      success: false,
      eventId,
      error: 'Item has no effects',
      commands: [],
    };
  }

  const commands: VisualCommand[] = [];
  const changes: CharacterChanges = {};

  // Применяем эффекты
  if (effects.qiRestore) {
    const result = TruthSystem.addQi(sessionId, effects.qiRestore);
    changes.currentQi = result.data?.currentQi;
    
    commands.push({
      type: 'visual:show_damage',
      timestamp: Date.now(),
      data: {
        x: 0,
        y: 0,
        damage: effects.qiRestore,
        element: 'neutral',
      },
    });
  }

  if (effects.healthRestore) {
    const session = TruthSystem.getSessionState(sessionId);
    const newHealth = Math.min(100, (session?.character.health ?? 0) + effects.healthRestore);
    TruthSystem.updateCharacter(sessionId, { health: newHealth });
    changes.health = newHealth;
  }

  return {
    success: true,
    eventId,
    changes: { character: changes },
    commands,
    message: `Used ${item.name}`,
  };
}

// ==================== ИВЕНТЫ ОКРУЖЕНИЯ ====================

/**
 * Обработка ивентов окружения
 */
async function processEnvironmentEvent(event: GameEvent): Promise<EventResult> {
  const session = TruthSystem.getSessionState(event.sessionId);
  
  if (!session) {
    return {
      success: false,
      eventId: event.id,
      error: 'Session not loaded in TruthSystem',
      commands: [],
    };
  }

  switch (event.type) {
    case 'environment:enter': {
      const { zoneId, zoneType, position } = event as GameEvent & {
        zoneId: string;
        zoneType: string;
        position: { x: number; y: number };
      };

      // Обновляем состояние мира
      TruthSystem.updateCharacter(event.characterId, {
        // Можно добавить эффекты зоны
      });

      return {
        success: true,
        eventId: event.id,
        commands: [
          {
            type: 'ui:show_notification',
            timestamp: Date.now(),
            data: {
              message: `Entered ${zoneType} zone`,
              type: 'info',
              duration: 3000,
            },
          },
        ],
        message: `Entered zone: ${zoneId}`,
      };
    }

    case 'environment:interact': {
      const { objectId, objectType, action } = event as GameEvent & {
        objectId: string;
        objectType: string;
        action: string;
      };

      return {
        success: true,
        eventId: event.id,
        commands: [],
        message: `Interacted with ${objectType}: ${action}`,
      };
    }

    default:
      return {
        success: false,
        eventId: event.id,
        error: `Unknown environment event: ${event.type}`,
        commands: [],
      };
  }
}

// ==================== ИВЕНТЫ ДВИЖЕНИЯ ====================

/**
 * Обработка ивентов движения
 */
async function processMovementEvent(event: GameEvent): Promise<EventResult> {
  const session = TruthSystem.getSessionState(event.sessionId);
  
  if (!session) {
    return {
      success: false,
      eventId: event.id,
      error: 'Session not loaded in TruthSystem',
      commands: [],
    };
  }

  switch (event.type) {
    case 'player:move': {
      const { distanceMeters, durationMs } = event as GameEvent & {
        distanceMeters: number;
        durationMs: number;
      };

      // Продвигаем время
      const timePerMeter = 1; // 1 минута на метр (примерно)
      const minutesToAdvance = Math.floor(distanceMeters * timePerMeter);
      
      if (minutesToAdvance > 0) {
        TruthSystem.advanceTime(event.sessionId, minutesToAdvance);
      }

      return {
        success: true,
        eventId: event.id,
        changes: {
          character: session.character,
        },
        commands: [],
        message: `Moved ${distanceMeters.toFixed(1)}m`,
      };
    }

    case 'player:teleport': {
      const { targetPosition, techniqueId } = event as GameEvent & {
        targetPosition: { x: number; y: number };
        techniqueId?: string;
      };

      // Если телепорт через технику - списываем Ци
      if (techniqueId) {
        const qiCost = 50; // Базовая стоимость
        const result = TruthSystem.spendQi(event.sessionId, qiCost);
        
        if (!result.success) {
          return {
            success: false,
            eventId: event.id,
            error: 'Not enough Qi for teleport',
            commands: [],
          };
        }
      }

      return {
        success: true,
        eventId: event.id,
        commands: [
          {
            type: 'character:teleport',
            timestamp: Date.now(),
            data: targetPosition,
          },
        ],
        message: 'Teleported successfully',
      };
    }

    default:
      return {
        success: false,
        eventId: event.id,
        error: `Unknown movement event: ${event.type}`,
        commands: [],
      };
  }
}

export default processGameEvent;
