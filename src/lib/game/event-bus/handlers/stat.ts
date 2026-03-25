/**
 * ============================================================================
 * STAT EVENT PROCESSOR - Процессор событий развития характеристик
 * ============================================================================
 * 
 * Обрабатывает события stat:* через Event Bus.
 * Интегрирует Stat Development с Truth System.
 * 
 * Версия: 1.0.0
 * ============================================================================
 */

import type { GameEvent, EventResult, VisualCommand } from './events/game-events';
import { isStatEvent, STAT_EVENT_TYPES } from './events/stat-events';
import type { StatName, DeltaSource } from '@/types/stat-development';
import {
  getStatsDevelopment,
  addStatDelta,
  processSleepConsolidation,
  getStatsDevelopmentForClient,
  calculateCombatDelta,
  calculateFatiguePenaltyForDevelopment,
} from './stat-truth';
import { TruthSystem } from './truth-system';
import { STAT_DEVELOPMENT_CONSTANTS } from './constants';

// ==================== ГЛАВНЫЙ ПРОЦЕССОР ====================

/**
 * Обработать событие развития
 */
export async function processStatEvent(event: GameEvent): Promise<EventResult> {
  // Проверяем тип события
  if (!isStatEvent(event)) {
    return {
      success: false,
      eventId: event.id,
      error: 'Not a stat event',
      commands: [],
    };
  }

  const sessionId = event.sessionId;
  const session = TruthSystem.getSessionState(sessionId);
  
  if (!session) {
    return {
      success: false,
      eventId: event.id,
      error: 'Session not loaded in TruthSystem',
      commands: [],
    };
  }

  console.log(`[StatProcessor] Processing: ${event.type}`);

  switch (event.type) {
    case STAT_EVENT_TYPES.DELTA_ADD:
      return processDeltaAdd(event, session);

    case STAT_EVENT_TYPES.CONSOLIDATE:
      return processConsolidate(event, session);

    case STAT_EVENT_TYPES.TRAINING_START:
      return processTrainingStart(event, session);

    case STAT_EVENT_TYPES.TRAINING_END:
      return processTrainingEnd(event, session);

    default:
      return {
        success: false,
        eventId: event.id,
        error: `Unknown stat event: ${event.type}`,
        commands: [],
      };
  }
}

// ==================== ОБРАБОТЧИКИ ====================

/**
 * Обработка добавления виртуальной дельты
 */
async function processDeltaAdd(
  event: any,
  session: any
): Promise<EventResult> {
  const { targetStat, source, intensity, modifiers } = event;

  // Рассчитываем штраф от усталости
  const fatiguePenalty = modifiers?.fatiguePenalty ?? 
    calculateFatiguePenaltyForDevelopment(
      session.character.fatigue,
      session.character.mentalFatigue
    );

  // Базовая дельта
  const sources = STAT_DEVELOPMENT_CONSTANTS.DELTA_SOURCES;
  let baseDelta = sources[source as DeltaSource] ?? 0;
  
  // Применяем множители
  baseDelta *= intensity;
  baseDelta *= fatiguePenalty;
  
  if (modifiers?.techniqueMultiplier) {
    baseDelta *= modifiers.techniqueMultiplier;
  }
  
  if (modifiers?.equipmentMultiplier) {
    baseDelta *= modifiers.equipmentMultiplier;
  }

  // Добавляем дельту через Truth System
  const result = addStatDelta(
    event.sessionId,
    targetStat as StatName,
    baseDelta,
    source as DeltaSource
  );

  // Формируем команды
  const commands: VisualCommand[] = [];

  // Если было повышение - показываем уведомление
  if (result.advanced) {
    commands.push({
      type: 'ui:show_notification',
      timestamp: Date.now(),
      data: {
        message: `📈 ${getStatNameRu(targetStat)} повышена до ${result.stat.current}!`,
        type: 'success',
        duration: 3000,
      },
    });

    // Добавляем визуальный эффект повышения
    commands.push({
      type: 'stat:advanced',
      timestamp: Date.now(),
      data: {
        stat: targetStat,
        newValue: result.stat.current,
        advancements: result.advancementCount,
      },
    });
  }

  // Получаем актуальное состояние
  const { progressInfo } = getStatsDevelopmentForClient(event.sessionId);

  return {
    success: true,
    eventId: event.id,
    changes: {
      statsDevelopment: getStatsDevelopment(event.sessionId),
      progressInfo,
      character: {
        strength: session.character.strength,
        agility: session.character.agility,
        intelligence: session.character.intelligence,
      },
    },
    commands,
    message: result.advanced
      ? `${getStatNameRu(targetStat)} +${result.advancementCount} (now ${result.stat.current})`
      : `${getStatNameRu(targetStat)}: +${baseDelta.toFixed(4)} virtual delta`,
  };
}

/**
 * Обработка закрепления при сне
 */
async function processConsolidate(
  event: any,
  session: any
): Promise<EventResult> {
  const { sleepHours, currentFatigue } = event;

  // Обрабатываем сон
  const result = processSleepConsolidation(event.sessionId, sleepHours);

  const commands: VisualCommand[] = [];

  // Показываем результаты сна
  if (result.result.totalAdvancements > 0) {
    commands.push({
      type: 'ui:show_notification',
      timestamp: Date.now(),
      data: {
        message: `✨ За время сна: ${result.result.totalAdvancements} повышений характеристик!`,
        type: 'success',
        duration: 5000,
      },
    });
  }

  // Добавляем команду обновления статов
  commands.push({
    type: 'stat:consolidated',
    timestamp: Date.now(),
    data: {
      sleepHours,
      advancements: result.result.totalAdvancements,
      stats: result.updatedStats,
    },
  });

  return {
    success: true,
    eventId: event.id,
    changes: {
      statsDevelopment: result.updatedStats,
      character: {
        strength: result.updatedStats.strength.current,
        agility: result.updatedStats.agility.current,
        intelligence: result.updatedStats.intelligence.current,
        fatigue: 0, // После сна усталость восстанавливается
        mentalFatigue: 0,
      },
    },
    commands,
    message: `Sleep consolidation: ${result.result.totalAdvancements} advancements`,
  };
}

/**
 * Обработка начала тренировки
 */
async function processTrainingStart(
  event: any,
  session: any
): Promise<EventResult> {
  const { trainingType, targetStat, durationMinutes, currentFatigue } = event;

  // Тренировка обрабатывается клиентом
  // Сервер только подтверждает и выдаёт прогноз

  const multipliers = STAT_DEVELOPMENT_CONSTANTS.TRAINING_TYPES[trainingType];
  const deltaPerMinute = STAT_DEVELOPMENT_CONSTANTS.DELTA_SOURCES[`training_${trainingType}` as keyof typeof STAT_DEVELOPMENT_CONSTANTS.DELTA_SOURCES] ?? 0.01;
  const estimatedDelta = deltaPerMinute * durationMinutes * (multipliers?.deltaMultiplier ?? 1.0);

  return {
    success: true,
    eventId: event.id,
    changes: {},
    commands: [
      {
        type: 'stat:training_started',
        timestamp: Date.now(),
        data: {
          trainingType,
          targetStat,
          durationMinutes,
          estimatedDelta,
        },
      },
    ],
    message: `Training started: ${trainingType} ${targetStat} for ${durationMinutes}min`,
  };
}

/**
 * Обработка завершения тренировки
 */
async function processTrainingEnd(
  event: any,
  session: any
): Promise<EventResult> {
  const { trainingSessionId, finalDelta, finalFatigue, advanced, newStatValue } = event;

  // Применяем результаты тренировки к Truth System
  // (дельта уже должна быть накоплена на клиенте)

  const commands: VisualCommand[] = [];

  if (advanced) {
    commands.push({
      type: 'ui:show_notification',
      timestamp: Date.now(),
      data: {
        message: `📈 Тренировка завершена! Характеристика повышена до ${newStatValue}`,
        type: 'success',
        duration: 4000,
      },
    });
  }

  // Обновляем усталость в Truth System
  if (finalFatigue.physical > 0 || finalFatigue.mental > 0) {
    TruthSystem.updateFatigue(
      event.sessionId,
      finalFatigue.physical,
      finalFatigue.mental
    );
  }

  return {
    success: true,
    eventId: event.id,
    changes: {
      character: {
        fatigue: session.character.fatigue + finalFatigue.physical,
        mentalFatigue: session.character.mentalFatigue + finalFatigue.mental,
      },
    },
    commands,
    message: `Training ended: +${finalDelta.toFixed(3)} delta, advanced: ${advanced}`,
  };
}

// ==================== УТИЛИТЫ ====================

/**
 * Получить русское название характеристики
 */
function getStatNameRu(stat: StatName): string {
  const names: Record<StatName, string> = {
    strength: 'Сила',
    agility: 'Ловкость',
    intelligence: 'Интеллект',
    vitality: 'Живучесть',
  };
  return names[stat] || stat;
}

export default processStatEvent;
