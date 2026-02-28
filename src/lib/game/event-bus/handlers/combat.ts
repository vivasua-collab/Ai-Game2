/**
 * ============================================================================
 * COMBAT EVENT HANDLER - Обработчик боевых событий
 * ============================================================================
 * 
 * Упрощённая версия для демонстрации работы Event Bus.
 * 
 * Версия: 1.0.0
 */

import type { GameEvent } from '../../events/game-events';
import type { EventResult, EventContext } from '../types';
import { TruthSystem } from '../../truth-system';

// ==================== КОНСТАНТЫ ====================

const METERS_TO_PIXELS = 32;

// ==================== ГЛАВНЫЙ HANDLER ====================

export async function handleCombatEvent(
  event: GameEvent,
  context: EventContext
): Promise<EventResult> {
  context.log('info', `Processing combat event: ${event.type}`);

  // Получаем состояние сессии
  const session = TruthSystem.getSessionState(context.sessionId);

  if (!session) {
    return {
      success: false,
      eventId: context.eventId,
      error: 'Session not loaded in TruthSystem',
      commands: [],
    };
  }

  // Маршрутизация по типу
  switch (event.type) {
    case 'combat:damage_dealt':
      return handleDamageDealt(event, context, session);

    case 'technique:use':
      return handleTechniqueUse(event, context, session);

    case 'technique:charge_start':
      return handleChargeStart(event, context);

    case 'technique:charge_cancel':
      return handleChargeCancel(event, context);

    default:
      return {
        success: false,
        eventId: context.eventId,
        error: `Unknown combat event: ${event.type}`,
        commands: [],
      };
  }
}

// ==================== ОБРАБОТКА УРОНА ====================

async function handleDamageDealt(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getSessionState>>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    targetId: string;
    targetType: string;
    techniqueId: string;
    targetPosition: { x: number; y: number };
    distance: number;
    rotation: number;
  };

  const { targetId, targetType, targetPosition, distance } = typedEvent;

  context.log('info', `Damage to ${targetId} (${targetType}) at distance ${distance}`);

  // Базовый урон (упрощённо)
  const baseDamage = 25;
  const qiCost = 10;

  // Проверяем Qi
  if (session.character.currentQi < qiCost) {
    return {
      success: false,
      eventId: context.eventId,
      error: `Not enough Qi. Need: ${qiCost}, Have: ${session.character.currentQi}`,
      commands: [],
    };
  }

  // Списываем Qi
  TruthSystem.spendQi(context.sessionId, qiCost);

  // Расчёт урона с учётом расстояния
  const distanceInMeters = distance / METERS_TO_PIXELS;
  const effectiveRange = 5; // 5 метров
  const damageMultiplier = distanceInMeters > effectiveRange ? 0.5 : 1.0;
  const finalDamage = Math.floor(baseDamage * damageMultiplier);

  // Добавляем усталость
  TruthSystem.updateFatigue(
    context.sessionId,
    session.character.fatigue + 1,
    session.character.mentalFatigue
  );

  // Генерируем визуальные команды
  const commands = [
    {
      type: 'visual:show_damage',
      timestamp: Date.now(),
      data: {
        x: targetPosition.x,
        y: targetPosition.y,
        damage: finalDamage,
        element: 'neutral',
        multiplier: damageMultiplier,
      },
    },
    {
      type: 'visual:show_effect',
      timestamp: Date.now(),
      data: {
        x: targetPosition.x,
        y: targetPosition.y,
        effectType: 'impact',
        duration: 300,
      },
    },
  ];

  // Получаем обновлённое состояние
  const updatedSession = TruthSystem.getSessionState(context.sessionId);

  return {
    success: true,
    eventId: context.eventId,
    changes: {
      character: {
        currentQi: updatedSession?.character.currentQi,
        fatigue: updatedSession?.character.fatigue,
      },
    },
    commands,
    message: `Dealt ${finalDamage} damage to ${targetId}`,
  };
}

// ==================== ИСПОЛЬЗОВАНИЕ ТЕХНИКИ ====================

async function handleTechniqueUse(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getSessionState>>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    techniqueId: string;
    position: { x: number; y: number };
    rotation: number;
    targetId?: string;
    distance?: number;
  };

  const { techniqueId, position } = typedEvent;

  context.log('info', `Using technique: ${techniqueId}`);

  // Базовая стоимость
  const qiCost = 20;

  // Проверяем Qi
  if (session.character.currentQi < qiCost) {
    return {
      success: false,
      eventId: context.eventId,
      error: `Not enough Qi. Need: ${qiCost}, Have: ${session.character.currentQi}`,
      commands: [],
    };
  }

  // Списываем Qi
  TruthSystem.spendQi(context.sessionId, qiCost);

  // Добавляем усталость
  TruthSystem.updateFatigue(
    context.sessionId,
    session.character.fatigue + 2,
    session.character.mentalFatigue + 1
  );

  // Генерируем визуальные команды
  const commands = [
    {
      type: 'visual:show_effect',
      timestamp: Date.now(),
      data: {
        x: position.x,
        y: position.y,
        effectType: 'aura',
        element: 'neutral',
        duration: 500,
        radius: 100,
      },
    },
  ];

  // Получаем обновлённое состояние
  const updatedSession = TruthSystem.getSessionState(context.sessionId);

  return {
    success: true,
    eventId: context.eventId,
    changes: {
      character: {
        currentQi: updatedSession?.character.currentQi,
        fatigue: updatedSession?.character.fatigue,
        mentalFatigue: updatedSession?.character.mentalFatigue,
      },
    },
    commands,
    message: `Used technique ${techniqueId}`,
  };
}

// ==================== ЗАРЯДКА ТЕХНИКИ ====================

async function handleChargeStart(
  event: GameEvent,
  context: EventContext
): Promise<EventResult> {
  return {
    success: true,
    eventId: context.eventId,
    commands: [],
    message: 'Charge started',
  };
}

async function handleChargeCancel(
  event: GameEvent,
  context: EventContext
): Promise<EventResult> {
  return {
    success: true,
    eventId: context.eventId,
    commands: [],
    message: 'Charge cancelled',
  };
}

export default handleCombatEvent;
