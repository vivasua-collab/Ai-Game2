/**
 * ============================================================================
 * COMBAT EVENT HANDLER - Обработчик боевых событий
 * ============================================================================
 * 
 * АРХИТЕКТУРА:
 * 1. Движок проверяет Qi локально (быстрая проверка UI)
 * 2. Отправляет событие technique:use через шину
 * 3. Сервер ищет технику в БД, списывает Qi через TruthSystem
 * 4. Возвращает: success, damageMultiplier, remainingQi
 * 
 * Версия: 3.0.0
 */

import type { GameEvent } from '../../events/game-events';
import type { EventResult, EventContext } from '../types';
import { TruthSystem } from '../../truth-system';
import { db } from '@/lib/db';
import { calculateTotalConductivity } from '../../conductivity-system';

// ==================== КОНСТАНТЫ ====================

const METERS_TO_PIXELS = 32;

// ==================== ГЛАВНЫЙ HANDLER ====================

export async function handleCombatEvent(
  event: GameEvent,
  context: EventContext
): Promise<EventResult> {
  context.log('info', `Processing combat event: ${event.type}`);

  const truthSystem = TruthSystem.getInstance();
  const session = truthSystem.getSessionState(context.sessionId);

  if (!session) {
    return createErrorResult(context.eventId, 'Session not loaded in TruthSystem');
  }

  switch (event.type) {
    case 'combat:damage_dealt':
      return handleDamageDealt(event, context, session, truthSystem);

    case 'technique:use':
      return handleTechniqueUse(event, context, session, truthSystem);

    case 'technique:charge_start':
      return handleChargeStart(event, context);

    case 'technique:charge_cancel':
      return handleChargeCancel(event, context);

    default:
      return createErrorResult(context.eventId, `Unknown combat event: ${event.type}`);
  }
}

// ==================== ИСПОЛЬЗОВАНИЕ ТЕХНИКИ ====================

/**
 * Главная функция обработки использования техники
 * 
 * Возвращает:
 * - success: true/false
 * - damageMultiplier: множитель урона от бонусов
 * - currentQi: оставшееся Ци
 * - error: если техника не найдена или недостаточно Ци
 */
async function handleTechniqueUse(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>,
  truthSystem: ReturnType<typeof TruthSystem.getInstance>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    techniqueId: string;
    position?: { x: number; y: number };
    rotation?: number;
    targetId?: string;
    distance?: number;
  };

  const { techniqueId, position } = typedEvent;

  context.log('info', `Technique use request: ${techniqueId}`);

  try {
    // === 1. ИЩЕМ ТЕХНИКУ В БАЗЕ ===
    const technique = await db.technique.findUnique({
      where: { id: techniqueId },
    });

    // Техника не найдена - возвращаем ошибку
    if (!technique) {
      context.log('warn', `Technique not found: ${techniqueId}`);
      return {
        success: false,
        eventId: context.eventId,
        error: 'TECHNIQUE_NOT_FOUND',
        commands: [],
        data: {
          canUse: false,
          reason: 'Техника не существует',
        },
      };
    }

    // === 2. ПРОВЕРЯЕМ, ЧТО ПЕРСОНАЖ ЗНАЕТ ТЕХНИКУ ===
    const characterTechnique = await db.characterTechnique.findFirst({
      where: {
        characterId: event.characterId,
        techniqueId,
      },
    });

    if (!characterTechnique) {
      return {
        success: false,
        eventId: context.eventId,
        error: 'TECHNIQUE_NOT_LEARNED',
        commands: [],
        data: {
          canUse: false,
          reason: 'Персонаж не знает эту технику',
        },
      };
    }

    // === 3. ПОЛУЧАЕМ СТОИМОСТЬ ЦИ ИЗ ТЕХНИКИ ===
    const qiCost = technique.qiCost ?? 0;

    // === 4. ПРОВЕРЯЕМ ЦИ В TRUTH SYSTEM ===
    const currentQi = session.character.currentQi;
    
    if (qiCost > currentQi) {
      return {
        success: false,
        eventId: context.eventId,
        error: 'NOT_ENOUGH_QI',
        commands: [],
        data: {
          canUse: false,
          reason: `Недостаточно Ци. Нужно: ${qiCost}, есть: ${currentQi}`,
          requiredQi: qiCost,
          currentQi,
        },
      };
    }

    // === 5. СПИСЫВАЕМ ЦИ ЧЕРЕЗ TRUTH SYSTEM ===
    if (qiCost > 0) {
      const result = truthSystem.spendQi(context.sessionId, qiCost);
      if (!result.success) {
        return {
          success: false,
          eventId: context.eventId,
          error: 'QI_SPEND_FAILED',
          commands: [],
          data: {
            canUse: false,
            reason: result.error || 'Ошибка списания Ци',
          },
        };
      }
    }

    // === 6. РАССЧИТЫВАЕМ БОНУСЫ УРОНА ===
    const mastery = characterTechnique.mastery ?? 0;
    
    // Бонус от мастерства (до +50% при 100% мастерства)
    const masteryBonus = 1 + (mastery / 100) * 0.5;
    
    // Бонус от характеристик
    const baseDamage = (technique.effects as Record<string, unknown>)?.damage ?? 10;
    
    // Рассчитываем проводимость для эффективности техник
    const conductivity = calculateTotalConductivity(
      session.character.coreCapacity,
      session.character.cultivationLevel,
      session.character.conductivityMeditations ?? 0
    );
    
    // Проводимость влияет на эффективность техник Ци
    const conductivityBonus = 1 + (conductivity / 100);
    
    // Итоговый множитель урона
    const damageMultiplier = masteryBonus * conductivityBonus;
    
    // === 7. ДОБАВЛЯЕМ УСТАЛОСТЬ ===
    const fatigueGain = Math.max(1, Math.floor(qiCost / 50));
    truthSystem.updateFatigue(
      context.sessionId,
      fatigueGain,
      Math.floor(fatigueGain / 2)
    );

    // === 8. ОБНОВЛЯЕМ МАСТЕРСТВО ===
    const masteryGain = 0.1;
    await db.characterTechnique.update({
      where: { id: characterTechnique.id },
      data: {
        mastery: Math.min(100, characterTechnique.mastery + masteryGain),
      },
    });

    // === 9. ПОЛУЧАЕМ ОБНОВЛЁННОЕ СОСТОЯНИЕ ===
    const updatedSession = truthSystem.getSessionState(context.sessionId);

    // === 10. ФОРМИРУЕМ ОТВЕТ ===
    const commands = [];
    
    if (position) {
      commands.push({
        type: 'visual:show_effect',
        timestamp: Date.now(),
        data: {
          x: position.x,
          y: position.y,
          effectType: 'aura',
          element: technique.element ?? 'neutral',
          duration: 500,
          radius: 100,
        },
      });
    }

    context.log('info', `Technique ${technique.name} used. Qi: ${currentQi} -> ${updatedSession?.character.currentQi}, multiplier: ${damageMultiplier.toFixed(2)}`);

    return {
      success: true,
      eventId: context.eventId,
      error: undefined, // Явно указываем, что ошибки нет
      commands,
      data: {
        canUse: true,
        techniqueName: technique.name,
        techniqueType: technique.type,
        element: technique.element,
        
        // Для расчёта урона в движке
        baseDamage,
        damageMultiplier,
        finalDamage: Math.floor(baseDamage as number * damageMultiplier),
        
        // Бонусы (для информации)
        masteryBonus,
        conductivityBonus,
        mastery,
        
        // Состояние Ци
        qiSpent: qiCost,
        currentQi: updatedSession?.character.currentQi ?? currentQi - qiCost,
        
        // Радиус действия (для визуализации)
        range: (technique.effects as Record<string, unknown>)?.range,
      },
      changes: {
        character: {
          currentQi: updatedSession?.character.currentQi,
          fatigue: updatedSession?.character.fatigue,
          mentalFatigue: updatedSession?.character.mentalFatigue,
        },
      },
      message: `Техника "${technique.name}" применена. Урон: x${damageMultiplier.toFixed(2)}`,
    };

  } catch (error) {
    context.log('error', `Error in handleTechniqueUse: ${error}`);
    return {
      success: false,
      eventId: context.eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
      commands: [],
    };
  }
}

// ==================== ОБРАБОТКА УРОНА ====================

/**
 * Обработка нанесения урона (после подтверждения использования техники)
 */
async function handleDamageDealt(
  event: GameEvent,
  context: EventContext,
  session: NonNullable<ReturnType<typeof TruthSystem.getInstance>['getSessionState']>,
  truthSystem: ReturnType<typeof TruthSystem.getInstance>
): Promise<EventResult> {
  const typedEvent = event as GameEvent & {
    targetId: string;
    targetType: string;
    techniqueId: string;
    targetPosition: { x: number; y: number };
    distance: number;
    rotation: number;
    damageMultiplier?: number; // Может прийти от движка
  };

  const { targetId, targetType, targetPosition, distance, techniqueId, damageMultiplier } = typedEvent;

  context.log('info', `Damage to ${targetId} (${targetType}) with ${techniqueId}`);

  try {
    // Получаем технику
    const technique = await db.technique.findUnique({
      where: { id: techniqueId },
    });

    if (!technique) {
      return createErrorResult(context.eventId, 'Technique not found');
    }

    // Базовый урон
    const baseDamage = (technique.effects as Record<string, unknown>)?.damage ?? 25;
    const element = technique.element ?? 'neutral';
    
    // Используем multiplier от техники или переданный
    const finalMultiplier = damageMultiplier ?? 1.0;
    
    // Расчёт урона с учётом расстояния
    const distanceInMeters = distance / METERS_TO_PIXELS;
    const effects = technique.effects as Record<string, unknown> | null;
    const rangeData = effects?.range as { fullDamage?: number; halfDamage?: number; max?: number } | undefined;
    
    let rangeMultiplier = 1.0;
    const fullDamageRange = rangeData?.fullDamage ?? 5;
    const maxRange = rangeData?.max ?? 10;
    
    if (distanceInMeters <= fullDamageRange) {
      rangeMultiplier = 1.0;
    } else if (distanceInMeters <= maxRange) {
      rangeMultiplier = 0.5;
    } else {
      rangeMultiplier = 0;
    }
    
    const finalDamage = Math.floor(baseDamage as number * finalMultiplier * rangeMultiplier);

    // Генерируем визуальные команды
    const commands = [
      {
        type: 'visual:show_damage',
        timestamp: Date.now(),
        data: {
          x: targetPosition.x,
          y: targetPosition.y,
          damage: finalDamage,
          element,
          multiplier: rangeMultiplier,
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

    return {
      success: true,
      eventId: context.eventId,
      commands,
      data: {
        damage: finalDamage,
        baseDamage,
        finalMultiplier,
        rangeMultiplier,
        distance: distanceInMeters,
      },
      message: `Нанесено ${finalDamage} урона (${rangeMultiplier === 1 ? 'полный' : rangeMultiplier === 0.5 ? 'половинный' : 'мимо'})`,
    };

  } catch (error) {
    context.log('error', `Error in handleDamageDealt: ${error}`);
    return {
      success: false,
      eventId: context.eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
      commands: [],
    };
  }
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

// ==================== HELPERS ====================

function createErrorResult(eventId: string, error: string): EventResult {
  return {
    success: false,
    eventId,
    error,
    commands: [],
  };
}

export default handleCombatEvent;
