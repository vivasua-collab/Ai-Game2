/**
 * ============================================================================
 * BODY EVENT HANDLER - Обработчик событий тела (Kenshi-style)
 * ============================================================================
 * 
 * Обрабатывает события:
 * - body:damage - нанесение урона части тела
 * - body:heal - лечение части тела
 * - body:attach_limb - приживление конечности
 * - body:regenerate - регенерация конечности
 * - body:update - обновление состояния тела
 * 
 * Версия: 1.0.0
 */

import type { GameEvent } from '../../events/game-events';
import type { EventResult, EventContext } from '../types';
import { TruthSystem } from '../../truth-system';
import { db } from '@/lib/db';
import {
  applyDamageToLimb,
  createHumanBody,
  deserializeBody,
  serializeBody,
  getLimbStatus,
  calculateOverallHealth,
  regenerateLimb,
} from '../../body-system';
import {
  attachLimb,
  startLimbRegeneration,
  canAttachLimb,
  processAllAttachments,
} from '../../limb-attachment';
import type { BodyStructure, BodyPart, DamageType } from '@/types/body';

// ==================== ГЛАВНЫЙ HANDLER ====================

export async function handleBodyEvent(
  event: GameEvent,
  context: EventContext
): Promise<EventResult> {
  context.log('info', `Processing body event: ${event.type}`);

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
    case 'body:damage':
      return handleBodyDamage(event, context, session, truthSystem);

    case 'body:heal':
      return handleBodyHeal(event, context, session, truthSystem);

    case 'body:attach_limb':
      return handleAttachLimb(event, context, session, truthSystem);

    case 'body:regenerate':
      return handleRegenerateLimb(event, context, session, truthSystem);

    case 'body:update':
      return handleBodyUpdate(event, context, session);

    default:
      return {
        success: false,
        eventId: context.eventId,
        error: `Unknown body event: ${event.type}`,
        commands: [],
      };
  }
}

// ==================== ОБРАБОТКА УРОНА ====================

async function handleBodyDamage(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>,
  truthSystem: ReturnType<typeof TruthSystem.getInstance>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    partId: string;
    damage: number;
    damageType: DamageType;
    source: 'combat' | 'environment' | 'internal';
    penetration?: number;
  };

  const { partId, damage, damageType, source, penetration } = typedEvent;
  context.log('info', `Body damage: ${partId} -${damage} (${damageType})`);

  try {
    // Получаем состояние тела из БД
    const character = await db.character.findUnique({
      where: { id: context.characterId },
      select: { bodyState: true },
    });

    if (!character) {
      return {
        success: false,
        eventId: context.eventId,
        error: 'Character not found',
        commands: [],
      };
    }

    // Десериализуем или создаём новое тело
    let body: BodyStructure;
    if (character.bodyState && character.bodyState !== '{}') {
      body = deserializeBody(character.bodyState);
    } else {
      body = createHumanBody(context.characterId);
    }

    // Получаем часть тела
    const part = body.parts.get(partId);
    if (!part) {
      return {
        success: false,
        eventId: context.eventId,
        error: `Body part not found: ${partId}`,
        commands: [],
      };
    }

    // Проверяем, не отрублена ли часть
    if (part.status === 'severed') {
      return {
        success: false,
        eventId: context.eventId,
        error: 'Cannot damage severed limb',
        commands: [],
      };
    }

    // Применяем урон
    const damageResult = applyDamageToLimb(part, damage, {
      penetration: penetration ?? 0,
    });

    // Обновляем статус части
    part.status = getLimbStatus(part.hp);
    body.overallHealth = calculateOverallHealth(body);

    // Проверяем смерть
    if (damageResult.fatal) {
      body.isDead = true;
      body.deathReason = damageResult.severed
        ? `Отрублена часть тела: ${part.name}`
        : 'Получен смертельный урон';
    }

    // Сохраняем в БД
    await db.character.update({
      where: { id: context.characterId },
      data: {
        bodyState: serializeBody(body),
        health: body.overallHealth,
      },
    });

    // Обновляем состояние персонажа в TruthSystem
    truthSystem.updateCharacter(context.sessionId, {
      health: body.overallHealth,
    });

    // Генерируем визуальные команды
    const commands = [];

    // Команда обновления HP баров
    commands.push({
      type: 'visual:update_body_part',
      timestamp: Date.now(),
      data: {
        partId,
        functionalHp: part.hp.functional.current,
        structuralHp: part.hp.structural.current,
        status: part.status,
        severed: damageResult.severed,
      },
    });

    // Если часть отрублена - уведомление
    if (damageResult.severed) {
      commands.push({
        type: 'visual:show_notification',
        timestamp: Date.now(),
        data: {
          message: `Отрублено: ${part.name}!`,
          type: 'danger',
          duration: 5000,
        },
      });
    }

    // Если смерть
    if (damageResult.fatal) {
      commands.push({
        type: 'game:death',
        timestamp: Date.now(),
        data: {
          reason: body.deathReason,
        },
      });
    }

    return {
      success: true,
      eventId: context.eventId,
      commands,
      changes: {
        character: {
          health: body.overallHealth,
        },
        body: {
          partId,
          damage: damageResult.totalDamage,
          newStatus: part.status,
          severed: damageResult.severed,
          fatal: damageResult.fatal,
        },
      },
      message: damageResult.severed
        ? `${part.name} отрублена!`
        : `${part.name} получила ${damageResult.totalDamage} урона`,
    };
  } catch (error) {
    context.log('error', `Body damage error: ${error}`);
    return {
      success: false,
      eventId: context.eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
      commands: [],
    };
  }
}

// ==================== ОБРАБОТКА ЛЕЧЕНИЯ ====================

async function handleBodyHeal(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>,
  truthSystem: ReturnType<typeof TruthSystem.getInstance>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    partId?: string;
    amount: number;
    source: 'technique' | 'item' | 'rest' | 'natural';
  };

  const { partId, amount, source } = typedEvent;
  context.log('info', `Body heal: ${partId ?? 'all'} +${amount} (${source})`);

  try {
    const character = await db.character.findUnique({
      where: { id: context.characterId },
      select: { bodyState: true, cultivationLevel: true },
    });

    if (!character) {
      return {
        success: false,
        eventId: context.eventId,
        error: 'Character not found',
        commands: [],
      };
    }

    let body: BodyStructure;
    if (character.bodyState && character.bodyState !== '{}') {
      body = deserializeBody(character.bodyState);
    } else {
      body = createHumanBody(context.characterId);
    }

    const commands = [];
    const healedParts: string[] = [];

    if (partId) {
      // Лечим конкретную часть
      const part = body.parts.get(partId);
      if (part && part.status !== 'severed') {
        const oldFunctional = part.hp.functional.current;
        const oldStructural = part.hp.structural.current;

        // Восстанавливаем HP
        part.hp.functional.current = Math.min(
          part.hp.functional.max,
          part.hp.functional.current + amount
        );
        part.hp.structural.current = Math.min(
          part.hp.structural.max,
          part.hp.structural.current + amount * 0.5 // Структурная медленнее
        );

        part.status = getLimbStatus(part.hp);
        healedParts.push(partId);

        commands.push({
          type: 'visual:update_body_part',
          timestamp: Date.now(),
          data: {
            partId,
            functionalHp: part.hp.functional.current,
            structuralHp: part.hp.structural.current,
            status: part.status,
          },
        });
      }
    } else {
      // Лечим всё тело
      body.parts.forEach((part, id) => {
        if (part.status !== 'severed') {
          part.hp.functional.current = Math.min(
            part.hp.functional.max,
            part.hp.functional.current + amount
          );
          part.hp.structural.current = Math.min(
            part.hp.structural.max,
            part.hp.structural.current + amount * 0.5
          );
          part.status = getLimbStatus(part.hp);
          healedParts.push(id);
        }
      });
    }

    body.overallHealth = calculateOverallHealth(body);

    // Сохраняем
    await db.character.update({
      where: { id: context.characterId },
      data: {
        bodyState: serializeBody(body),
        health: body.overallHealth,
      },
    });

    truthSystem.updateCharacter(context.sessionId, {
      health: body.overallHealth,
    });

    return {
      success: true,
      eventId: context.eventId,
      commands,
      changes: {
        character: {
          health: body.overallHealth,
        },
        body: {
          healedParts,
          newHealth: body.overallHealth,
        },
      },
      message: `Восстановлено ${amount} HP`,
    };
  } catch (error) {
    context.log('error', `Body heal error: ${error}`);
    return {
      success: false,
      eventId: context.eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
      commands: [],
    };
  }
}

// ==================== ПРИЖИВЛЕНИЕ КОНЕЧНОСТИ ====================

async function handleAttachLimb(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>,
  truthSystem: ReturnType<typeof TruthSystem.getInstance>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    partType: string;
    partId: string;
    donorCultivationLevel: number;
    donorCultivationSubLevel: number;
    donorId?: string;
    donorName?: string;
  };

  const { partType, partId, donorCultivationLevel, donorCultivationSubLevel, donorId, donorName } = typedEvent;
  context.log('info', `Attach limb: ${partType} to ${partId}`);

  try {
    const character = await db.character.findUnique({
      where: { id: context.characterId },
      select: { bodyState: true, cultivationLevel: true, cultivationSubLevel: true },
    });

    if (!character) {
      return {
        success: false,
        eventId: context.eventId,
        error: 'Character not found',
        commands: [],
      };
    }

    let body: BodyStructure;
    if (character.bodyState && character.bodyState !== '{}') {
      body = deserializeBody(character.bodyState);
    } else {
      body = createHumanBody(context.characterId);
    }

    // Проверяем возможность приживления
    const canAttach = canAttachLimb(
      character.cultivationLevel,
      character.cultivationSubLevel,
      donorCultivationLevel,
      donorCultivationSubLevel,
      0, // Свежая конечность
      0,
      'living'
    );

    if (!canAttach.canAttach) {
      return {
        success: false,
        eventId: context.eventId,
        error: canAttach.reason,
        commands: [],
      };
    }

    // Приживляем конечность
    const result = attachLimb(
      body,
      partType as any,
      partId,
      getPartName(partId),
      0, // Текущий тик
      character.cultivationLevel,
      character.cultivationSubLevel,
      donorCultivationLevel,
      donorCultivationSubLevel,
      { donorId, donorName }
    );

    if (!result.success) {
      return {
        success: false,
        eventId: context.eventId,
        error: result.reason,
        commands: [],
      };
    }

    // Сохраняем
    await db.character.update({
      where: { id: context.characterId },
      data: {
        bodyState: serializeBody(body),
      },
    });

    const commands = [
      {
        type: 'visual:show_notification',
        timestamp: Date.now(),
        data: {
          message: `Начато приживление: ${getPartName(partId)}`,
          type: 'info',
          duration: 3000,
        },
      },
    ];

    return {
      success: true,
      eventId: context.eventId,
      commands,
      data: {
        process: result.process,
        duration: result.process?.duration,
      },
      message: `Конечность приживляется. Время: ${Math.round((result.process?.duration ?? 0) / 60)} минут`,
    };
  } catch (error) {
    context.log('error', `Attach limb error: ${error}`);
    return {
      success: false,
      eventId: context.eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
      commands: [],
    };
  }
}

// ==================== РЕГЕНЕРАЦИЯ КОНЕЧНОСТИ ====================

async function handleRegenerateLimb(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>,
  truthSystem: ReturnType<typeof TruthSystem.getInstance>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    partId: string;
    useFormation?: boolean;
  };

  const { partId, useFormation } = typedEvent;
  context.log('info', `Regenerate limb: ${partId}`);

  try {
    const character = await db.character.findUnique({
      where: { id: context.characterId },
      select: { bodyState: true, cultivationLevel: true },
    });

    if (!character) {
      return {
        success: false,
        eventId: context.eventId,
        error: 'Character not found',
        commands: [],
      };
    }

    let body: BodyStructure;
    if (character.bodyState && character.bodyState !== '{}') {
      body = deserializeBody(character.bodyState);
    } else {
      body = createHumanBody(context.characterId);
    }

    const part = body.parts.get(partId);
    if (!part || part.status !== 'severed') {
      return {
        success: false,
        eventId: context.eventId,
        error: 'Часть тела не отрублена',
        commands: [],
      };
    }

    const result = startLimbRegeneration(
      body,
      partId,
      part.type,
      character.cultivationLevel,
      0, // Текущий тик
      useFormation
    );

    if (!result.success) {
      return {
        success: false,
        eventId: context.eventId,
        error: result.reason,
        commands: [],
      };
    }

    // Сохраняем
    await db.character.update({
      where: { id: context.characterId },
      data: {
        bodyState: serializeBody(body),
      },
    });

    const commands = [
      {
        type: 'visual:show_notification',
        timestamp: Date.now(),
        data: {
          message: `Начата регенерация: ${part.name}`,
          type: 'info',
          duration: 3000,
        },
      },
    ];

    return {
      success: true,
      eventId: context.eventId,
      commands,
      data: {
        process: result.process,
        duration: result.duration,
      },
      message: `Регенерация начата. Время: ${Math.round((result.duration ?? 0) / 60 / 24)} дней`,
    };
  } catch (error) {
    context.log('error', `Regenerate limb error: ${error}`);
    return {
      success: false,
      eventId: context.eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
      commands: [],
    };
  }
}

// ==================== ОБНОВЛЕНИЕ СОСТОЯНИЯ ТЕЛА ====================

async function handleBodyUpdate(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    bodyState: string;
    changedParts: string[];
  };

  const { bodyState, changedParts } = typedEvent;

  // Это событие приходит от сервера к движку
  // Сохраняем состояние и отправляем команды обновления UI
  const commands = changedParts.map(partId => ({
    type: 'visual:update_body_part',
    timestamp: Date.now(),
    data: { partId },
  }));

  return {
    success: true,
    eventId: context.eventId,
    commands,
    message: `Body updated: ${changedParts.length} parts`,
  };
}

// ==================== HELPERS ====================

function getPartName(partId: string): string {
  const names: Record<string, string> = {
    head: 'Голова',
    torso: 'Торс',
    left_arm: 'Левая рука',
    right_arm: 'Правая рука',
    left_hand: 'Левая кисть',
    right_hand: 'Правая кисть',
    left_leg: 'Левая нога',
    right_leg: 'Правая нога',
    left_foot: 'Левая стопа',
    right_foot: 'Правая стопа',
    left_eye: 'Левый глаз',
    right_eye: 'Правый глаз',
    left_ear: 'Левое ухо',
    right_ear: 'Правое ухо',
  };
  return names[partId] || partId;
}

export default handleBodyEvent;
