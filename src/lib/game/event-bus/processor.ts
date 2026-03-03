/**
 * ============================================================================
 * EVENT BUS PROCESSOR - Центральный процессор событий
 * ============================================================================
 * 
 * Версия: 1.0.0
 */

import type { GameEvent } from '../events/game-events';
import type { EventResult, EventHandler } from './types';
import { validateEvent } from './validator';
import { TruthSystem } from '../truth-system';
import { handleCombatEvent } from './handlers/combat';
import { handleInventoryEvent } from './handlers/inventory';
import { handleEnvironmentEvent } from './handlers/environment';
import { handleMovementEvent } from './handlers/movement';
import { handleBodyEvent } from './handlers/body';

// ==================== HANDLER REGISTRY ====================

const handlers: Map<string, EventHandler> = new Map([
  // Combat events
  ['combat:damage_dealt', handleCombatEvent],
  ['combat:damage_received', handleCombatEvent],
  ['technique:use', handleCombatEvent],
  ['technique:charge_start', handleCombatEvent],
  ['technique:charge_cancel', handleCombatEvent],
  
  // Inventory events
  ['inventory:use_item', handleInventoryEvent],
  ['inventory:equip_item', handleInventoryEvent],
  ['inventory:unequip_item', handleInventoryEvent],
  ['inventory:drop_item', handleInventoryEvent],
  ['item:pickup', handleInventoryEvent],
  
  // Environment events
  ['environment:enter', handleEnvironmentEvent],
  ['environment:leave', handleEnvironmentEvent],
  ['environment:interact', handleEnvironmentEvent],
  
  // Movement events
  ['player:move', handleMovementEvent],
  ['player:teleport', handleMovementEvent],
  
  // Body events (Kenshi-style)
  ['body:damage', handleBodyEvent],
  ['body:heal', handleBodyEvent],
  ['body:attach_limb', handleBodyEvent],
  ['body:regenerate', handleBodyEvent],
  ['body:update', handleBodyEvent],
]);

// ==================== SIMPLE LOGGER ====================

function log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
  const prefix = level === 'info' ? '📝' : level === 'warn' ? '⚠️' : '❌';
  console[level](`[EventBus] ${prefix} ${message}`, data ?? '');
}

// ==================== MAIN PROCESSOR ====================

export async function processEvent(event: GameEvent): Promise<EventResult> {
  const startTime = Date.now();
  const eventId = event.id;

  log('info', `Processing: ${event.type} (${eventId})`);

  // 1. Validate
  const validation = validateEvent(event);
  if (!validation.valid) {
    log('warn', `Validation failed: ${validation.error}`);
    return {
      success: false,
      eventId,
      error: validation.error,
      commands: [],
    };
  }

  // 2. Get TruthSystem instance
  const truthSystem = TruthSystem.getInstance();

  // 3. Ensure session is loaded
  let session = truthSystem.getSessionState(event.sessionId);
  
  if (!session) {
    const loadResult = await truthSystem.loadSession(event.sessionId);
    if (!loadResult.success) {
      return {
        success: false,
        eventId,
        error: `Session not found: ${event.sessionId}`,
        commands: [],
      };
    }
    session = loadResult.data!;
  }

  // 4. Create context
  const context = {
    sessionId: event.sessionId,
    characterId: event.characterId,
    eventId,
    startTime,
    log,
  };

  // 5. Get handler
  const handler = handlers.get(event.type);
  
  if (!handler) {
    log('warn', `No handler for: ${event.type}`);
    return {
      success: false,
      eventId,
      error: `No handler for event type: ${event.type}`,
      commands: [],
    };
  }

  // 6. Execute handler
  try {
    const result = await handler(event, context);

    result.metadata = {
      processingTimeMs: Date.now() - startTime,
      handler: event.type,
    };

    log('info', `Done: ${event.type} (${result.metadata.processingTimeMs}ms)`);

    return result;

  } catch (error) {
    log('error', `Handler error: ${error instanceof Error ? error.message : 'Unknown'}`);
    
    return {
      success: false,
      eventId,
      error: error instanceof Error ? error.message : 'Internal error',
      commands: [],
      metadata: {
        processingTimeMs: Date.now() - startTime,
        handler: event.type,
      },
    };
  }
}

// ==================== UTILITIES ====================

export function getSupportedEventTypes(): string[] {
  return Array.from(handlers.keys());
}

export function isEventTypeSupported(type: string): boolean {
  return handlers.has(type);
}

export function registerHandler(type: string, handler: EventHandler): void {
  handlers.set(type, handler);
  log('info', `Registered: ${type}`);
}

export function unregisterHandler(type: string): boolean {
  return handlers.delete(type);
}

export default processEvent;
