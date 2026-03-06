/**
 * ============================================================================
 * MOVEMENT EVENT HANDLER - Обработчик событий движения
 * ============================================================================
 * 
 * Обрабатывает:
 * - player:move - движение персонажа с эффектами времени и Ци
 * - player:teleport - телепортация
 * 
 * ИНТЕГРАЦИЯ:
 * - TruthSystem для обновления состояния
 * - time-tick.service для пассивной генерации Ци
 * 
 * Версия: 2.0.0
 * @updated 2026-03-06 13:30 UTC
 */

import type { GameEvent } from '../../events/game-events';
import type { EventResult, EventContext } from '../types';
import { TruthSystem } from '../../truth-system';
import { quickProcessQiTick } from '@/services/time-tick.service';
import { ACTION_TICK_COSTS } from '../../constants';

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

/**
 * Обработка движения персонажа
 * 
 * Эффекты:
 * - Продвижение игрового времени (1 tile = 1 tick = 1 minute)
 * - Пассивная генерация Ци ядром
 * - Рассеивание избыточной Ци
 */
async function handleMove(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>,
  truthSystem: ReturnType<typeof TruthSystem.getInstance>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    tilesMoved?: number;
    distanceMeters?: number;
    fromPosition?: { x: number; y: number };
    toPosition?: { x: number; y: number };
    durationMs?: number;
  };

  // Получаем количество тайлов (предпочитаем tilesMoved, fallback на distanceMeters)
  const tilesMoved = typedEvent.tilesMoved ?? typedEvent.distanceMeters ?? 0;
  
  if (tilesMoved <= 0) {
    return {
      success: true,
      eventId: context.eventId,
      commands: [],
      data: {
        timeAdvanced: false,
        ticksAdvanced: 0,
        dayChanged: false,
      },
      message: 'No movement detected',
    };
  }

  context.log('info', `Moving ${tilesMoved} tiles`);

  // === ИСПОЛЬЗУЕМ ЕДИНЫЙ СЕРВИС ОБРАБОТКИ ТИКОВ ===
  // quickProcessQiTick обрабатывает:
  // - Продвижение времени в БД и памяти
  // - Пассивную генерацию Ци
  // - Рассеивание избыточной Ци
  // - Обновление TruthSystem
  const tickResult = await quickProcessQiTick(
    context.characterId,
    context.sessionId,
    tilesMoved
  );

  if (!tickResult.success) {
    return {
      success: false,
      eventId: context.eventId,
      error: 'Failed to process time tick',
      commands: [],
    };
  }

  // Получаем обновлённое состояние из памяти
  const updatedSession = truthSystem.getSessionState(context.sessionId);
  const worldTime = truthSystem.getWorldTime(context.sessionId);

  return {
    success: true,
    eventId: context.eventId,
    changes: {
      character: updatedSession?.character,
    },
    commands: [],
    data: {
      timeAdvanced: true,
      ticksAdvanced: tickResult.ticksAdvanced,
      dayChanged: tickResult.dayChanged,
      worldTime: worldTime ? {
        year: worldTime.year,
        month: worldTime.month,
        day: worldTime.day,
        hour: worldTime.hour,
        minute: worldTime.minute,
        formatted: worldTime.formatted,
        season: worldTime.season,
        daysSinceStart: worldTime.daysSinceStart,
      } : undefined,
      qiEffects: {
        passiveGain: tickResult.qiEffects.passiveGain,
        dissipation: tickResult.qiEffects.dissipation,
        finalQi: tickResult.qiEffects.finalQi,
      },
      character: updatedSession?.character ? {
        currentQi: updatedSession.character.currentQi,
        accumulatedQi: updatedSession.character.accumulatedQi,
      } : undefined,
      conductivityInfo: tickResult.conductivityInfo,
    },
    message: `Moved ${tilesMoved} tiles. Time +${tickResult.ticksAdvanced} min`,
  };
}

/**
 * Обработка телепортации
 * 
 * Телепортация через технику требует Ци (TELEPORT_QI_COST)
 * Междугородняя телепортация меняет локацию
 */
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
