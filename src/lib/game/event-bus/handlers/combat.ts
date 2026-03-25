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
 * ВНИМАНИЕ: Все взаимодействия с TempNPC через Event Bus!
 * 
 * Версия: 3.3.0 (Level Suppression + Qi Buffer интеграция)
 */

import type { GameEvent } from '../../events/game-events';
import type { EventResult, EventContext } from '../types';
import { TruthSystem } from '../../truth-system';
import { db } from '@/lib/db';
import { calculateTotalConductivity } from '../../conductivity-system';
import { 
  isTempNPCId, 
  handleTempNPCCombat,
  getTempNPCForCombat,
} from '../../skeleton/temp-npc-combat';
import { EVENT_TYPES } from '../../events/game-events';
import { addStatDelta, calculateFatiguePenaltyForDevelopment } from '../../stat-truth';
import { 
  generateAttackDelta,
} from '../../combat-system';
import { logDestabilization } from '@/lib/logger/qi-logger';

// ==================== ИМПОРТ LEVEL SUPPRESSION И QI BUFFER ====================
import {
  calculateLevelSuppression,
  calculateLevelSuppressionFull,
  isTargetImmune,
  type LevelSuppressionResult,
} from '@/lib/constants/level-suppression';
import {
  processQiDamage,
  type QiDamageResult,
} from '@/lib/game/qi-buffer';
import {
  MATERIAL_DAMAGE_REDUCTION,
} from '@/lib/game/damage-pipeline';
import { determineAttackType } from '@/types/technique-types';

// ==================== ИМПОРТ КОНСТАНТ ====================

/**
 * Импорт из единого источника истины
 * 
 * @see src/lib/constants/technique-capacity.ts
 */
import { 
  QI_DENSITY_TABLE,
  calculateQiDensity,
  calculateTechniqueCapacity,
  getBaseCapacity,
  checkDestabilizationWithBaseQi,
  type TechniqueType,
  type CombatSubtype,
} from '@/lib/constants/technique-capacity';
import {
  TECHNIQUE_GRADE_CONFIGS,
  RARITY_TO_TECHNIQUE_GRADE,
  type TechniqueGrade,
} from '@/types/grade';

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

    // === 6. РАССЧИТЫВАЕМ УРОН ПО ФОРМУЛЕ ИЗ ДОКУМЕНТАЦИИ ===
    // НОВАЯ ФОРМУЛА:
    // baseQiInput = qiCost × qiDensity
    // capacity = baseCapacity × 2^(techniqueLevel-1) × (1 + mastery × 0.5%)
    // effectiveQi = min(baseQiInput, capacity)
    // damage = effectiveQi × statMult × masteryMult × gradeMult
    // 
    // ВАЖНО: qiDensity НЕ умножается дважды! effectiveQi уже в базовых единицах.
    // ВАЖНО: уровень техники влияет только на capacity, НЕ на урон напрямую!
    
    const mastery = characterTechnique.mastery ?? 0;
    const techniqueLevel = technique.level ?? 1;
    const cultivationLevel = session.character.cultivationLevel ?? 1;
    
    // 6.1. Качество Ци практика (qiDensity = 2^(level-1))
    const qiDensity = calculateQiDensity(cultivationLevel);
    
    // 6.2. Структурная ёмкость техники
    // Используем тип техники из БД (по умолчанию 'combat')
    const techniqueType = (technique.type as TechniqueType) ?? 'combat';
    const combatSubtype = technique.subtype as CombatSubtype | undefined;
    
    // Проверка на пассивную технику (cultivation)
    const capacity = calculateTechniqueCapacity(techniqueType, techniqueLevel, mastery, combatSubtype);
    
    if (capacity === null) {
      // Пассивная техника (cultivation) — не используется в бою
      return {
        success: false,
        eventId: context.eventId,
        error: 'PASSIVE_TECHNIQUE',
        commands: [],
        data: {
          canUse: false,
          reason: 'Техники культивации нельзя использовать в бою напрямую',
        },
      };
    }
    
    // 6.3. Проверка дестабилизации с учётом базового Ци
    // Функция внутри вычисляет: baseQiInput = qiCost × qiDensity
    const stability = checkDestabilizationWithBaseQi(qiCost, qiDensity, capacity);
    const { effectiveQi, isDestabilized, backlashDamage } = stability;
    
    // 6.4. Базовый урон = эффективное Ци (УЖЕ в базовых единицах, БЕЗ повторного qiDensity!)
    let damage = effectiveQi;
    
    // 6.5. Масштабирование от характеристик
    // Сила для melee, Ловкость для ranged, Интеллект для magic
    let statMult = 1.0;
    
    if (techniqueType === 'combat' || techniqueType === 'melee') {
      const strBonus = Math.max(0, (session.character.strength ?? 10) - 10);
      statMult += strBonus * 0.05; // +5% за каждую единицу силы выше 10
    } else if (techniqueType === 'ranged') {
      const agiBonus = Math.max(0, (session.character.agility ?? 10) - 10);
      statMult += agiBonus * 0.05;
    } else {
      const intBonus = Math.max(0, (session.character.intelligence ?? 10) - 10);
      statMult += intBonus * 0.05;
    }
    damage *= statMult;
    
    // 6.6. Бонус от мастерства (до +50% при 100% мастерства)
    const masteryMult = 1 + (mastery / 100) * 0.5;
    damage *= masteryMult;
    
    // 6.7. Редкость/grade техники влияет на базовый множитель
    // Используем новую систему Grade, если доступна, иначе fallback на rarity
    const grade: TechniqueGrade = (technique.grade as TechniqueGrade) 
      ?? RARITY_TO_TECHNIQUE_GRADE[technique.rarity as keyof typeof RARITY_TO_TECHNIQUE_GRADE] 
      ?? 'common';
    const gradeConfig = TECHNIQUE_GRADE_CONFIGS[grade];
    damage *= gradeConfig.damageMultiplier;
    
    // 6.9. Итоговый урон (округление вниз)
    const finalDamage = Math.floor(damage);
    
    // 6.10. Множитель для совместимости со старым кодом
    // (базовый урон из effects.damage используется как множитель, не как абсолют)
    const baseDamageFromEffects = (technique.effects as Record<string, unknown>)?.damage as number | undefined;
    const damageMultiplier = baseDamageFromEffects 
      ? finalDamage / baseDamageFromEffects 
      : finalDamage / 10;
    
    // === 7. ДЕСТАБИЛИЗАЦИЯ (ПРИМЕНЕНИЕ BACKLASH) ===
    const destabilizationCommands: GameCommand[] = [];
    if (isDestabilized && backlashDamage > 0) {
      // Логируем дестабилизацию
      logDestabilization(
        context.sessionId,
        event.characterId,
        {
          techniqueId: technique.id,
          techniqueName: technique.name,
          techniqueLevel: techniqueLevel,
          techniqueType: techniqueType,
          qiCost,
          qiDensity,
          baseQiInput: qiCost * qiDensity,
          capacity,
          backlashDamage,
          backlashQiLoss: stability.backlashQiLoss ?? 0,
          efficiency: stability.efficiency,
        }
      );
      
      // Наносим урон здоровью персонажа от перегрузки техники
      const currentHealth = session.character.health ?? 100;
      const newHealth = Math.max(0, currentHealth - backlashDamage);
      
      await db.character.update({
        where: { id: event.characterId },
        data: { health: newHealth },
      });
      
      // Обновляем состояние в TruthSystem
      truthSystem.updateCharacter(context.sessionId, { health: newHealth });
      
      // Визуальная команда о дестабилизации
      destabilizationCommands.push({
        type: 'ui:show_notification',
        timestamp: Date.now(),
        data: {
          message: `⚠️ Дестабилизация! Обратный удар: ${backlashDamage} урона`,
          type: 'warning',
          duration: 3000,
        },
      });
      
      // Визуальный эффект дестабилизации на персонаже
      if (position) {
        destabilizationCommands.push({
          type: 'visual:show_effect',
          timestamp: Date.now(),
          data: {
            x: position.x,
            y: position.y,
            effectType: 'destabilization',
            element: 'void',
            duration: 800,
            radius: 50,
          },
        });
      }
      
      context.log('warn', `⚠️ DESTABILIZATION! Technique overloaded. Backlash damage: ${backlashDamage}. Health: ${currentHealth} -> ${newHealth}`);
    }

    // === 8. ДОБАВЛЯЕМ УСТАЛОСТЬ ===
    const fatigueGain = Math.max(1, Math.floor(qiCost / 50));
    truthSystem.updateFatigue(
      context.sessionId,
      fatigueGain,
      Math.floor(fatigueGain / 2)
    );

    // === 9. ОБНОВЛЯЕМ МАСТЕРСТВО ===
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
    const commands: GameCommand[] = [...destabilizationCommands];
    
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

    context.log('info', `Technique ${technique.name} used. Qi: ${currentQi} -> ${updatedSession?.character.currentQi}. Damage: ${finalDamage}${isDestabilized ? ' (DESTABILIZED!)' : ''}`);

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
        
        // Для расчёта урона в движке (НОВАая система!)
        baseDamage: baseDamageFromEffects ?? 10,
        damageMultiplier,
        finalDamage,
        
        // Детали расчёта урона (для UI и дебага)
        damageBreakdown: {
          effectiveQi,
          qiDensity,
          statMult,
          masteryMult,
          gradeMult: gradeConfig.damageMultiplier,
          grade,
          capacity,
          isDestabilized,
          backlashDamage,
        },
        
        // Бонусы (для информации)
        masteryMult,
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
      message: `Техника "${technique.name}" применена. Урон: ${finalDamage}${isDestabilized ? ' (Дестабилизация!)' : ''}`,
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
 * 
 * ВАЖНО: Для TempNPC (TEMP_*) роутит на handleTempNPCCombat
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

  // === ПРОВЕРКА: ЯВЛЯЕТСЯ ЛИ ЦЕЛЬЮ TEMP_NPC ===
  if (isTempNPCId(targetId)) {
    context.log('info', `Target is TempNPC, routing to TempNPC combat handler`);
    return handleTempNPCDamageEvent(event, context, session, truthSystem);
  }

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
    
    // === ДОБАВЛЯЕМ ДЕЛЬТУ РАЗВИТИЯ ===
    // После успешной атаки добавляем виртуальную дельту к силе
    if (finalDamage > 0) {
      try {
        // Генерируем результат дельты
        const deltaResult = generateAttackDelta(
          false, // isCritical - TODO: передавать из события
          undefined, // weaponType
          finalMultiplier
        );
        
        // Рассчитываем штраф от усталости
        const fatiguePenalty = calculateFatiguePenaltyForDevelopment(
          session.character.fatigue ?? 0,
          session.character.mentalFatigue ?? 0
        );
        
        // Добавляем дельту к целевой характеристике
        await addStatDelta(
          event.characterId,
          deltaResult.targetStat,
          deltaResult.deltaGained * fatiguePenalty,
          deltaResult.source
        );
        
        context.log('info', `Added delta: +${deltaResult.deltaGained * fatiguePenalty} to ${deltaResult.targetStat}`);
      } catch (deltaError) {
        // Non-critical error - don't fail the combat
        context.log('warn', `Failed to add stat delta: ${deltaError}`);
      }
    }

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

// ==================== TEMP NPC DAMAGE HANDLING ====================

/**
 * Обработка урона по TempNPC через Event Bus
 * 
 * Все взаимодействия с системой истинности через шину!
 * 
 * Версия 3.3.0: Добавлена интеграция Level Suppression и Qi Buffer
 */
async function handleTempNPCDamageEvent(
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
    damageMultiplier?: number;
  };

  const { targetId, techniqueId, targetPosition, damageMultiplier } = typedEvent;

  try {
    // Получаем технику для расчёта урона
    const technique = await db.technique.findUnique({
      where: { id: techniqueId },
    });

    if (!technique) {
      return createErrorResult(context.eventId, 'Technique not found');
    }

    // === ПОЛУЧАЕМ ДАННЫЕ NPC ДЛЯ LEVEL SUPPRESSION ===
    const npc = getTempNPCForCombat(context.sessionId, targetId);
    const npcCultivationLevel = npc?.cultivation?.level ?? 1;
    const npcCurrentQi = npc?.cultivation?.currentQi ?? 0;
    const npcMaxQi = npc?.cultivation?.coreCapacity ?? 100;
    const npcBodyMaterial = npc?.bodyState?.material ?? 'organic';
    
    // === LEVEL SUPPRESSION ===
    const playerCultivationLevel = session.character.cultivationLevel ?? 1;
    const techniqueLevel = technique.level ?? 1;
    const isUltimate = (technique as Record<string, unknown>).isUltimate === true;
    
    // Определяем тип атаки
    const attackType = determineAttackType(true, {
      level: techniqueLevel,
      isUltimate,
    });
    
    // Рассчитываем подавление
    const suppressionResult = calculateLevelSuppressionFull(
      playerCultivationLevel,
      npcCultivationLevel,
      attackType,
      techniqueLevel
    );
    
    // Проверяем иммунитет
    if (suppressionResult.multiplier === 0) {
      context.log('info', `Target ${targetId} is immune (level difference: +${suppressionResult.levelDifference})`);
      return {
        success: true,
        eventId: context.eventId,
        commands: [{
          type: 'visual:show_damage',
          timestamp: Date.now(),
          data: {
            targetId,
            x: targetPosition.x,
            y: targetPosition.y,
            damage: 0,
            element: technique.element ?? 'neutral',
            isImmune: true,
            message: `Иммунитет (+${suppressionResult.levelDifference} ур.)`,
          },
        }],
        data: {
          damage: 0,
          isImmune: true,
          levelSuppression: suppressionResult,
        },
        message: `Цель иммунна к атаке (+${suppressionResult.levelDifference} уровней)`,
      };
    }
    
    // Базовый урон техники
    const baseDamage = (technique.effects as Record<string, unknown>)?.damage ?? 25;
    const element = technique.element ?? 'neutral';
    const finalMultiplier = damageMultiplier ?? 1.0;
    
    // Расчёт урона с учётом расстояния
    const distanceInMeters = typedEvent.distance / METERS_TO_PIXELS;
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
    
    // === ПРИМЕНЯЕМ LEVEL SUPPRESSION ===
    let damage = baseDamage as number * finalMultiplier * rangeMultiplier;
    damage *= suppressionResult.multiplier;
    
    // === QI BUFFER NPC (если у NPC есть Ци) ===
    let qiBufferResult: QiDamageResult | null = null;
    if (npcCurrentQi > 0 && damage > 0) {
      qiBufferResult = processQiDamage({
        incomingDamage: damage,
        currentQi: npcCurrentQi,
        maxQi: npcMaxQi,
        hasShieldTechnique: false, // NPC обычно без щитовых техник
      });
      damage = qiBufferResult.remainingDamage;
      
      // TODO: Обновить Ци NPC через sessionNPCManager
      context.log('info', `NPC Qi Buffer: absorbed ${qiBufferResult.absorbedDamage}, remaining ${damage}`);
    }
    
    // === МАТЕРИАЛ ТЕЛА NPC ===
    // Chitin (пауки, скорпионы) - 20% снижение
    // Ethereal (духи) - 70% снижение физического урона
    const materialReduction = MATERIAL_DAMAGE_REDUCTION[npcBodyMaterial] || 0;
    if (materialReduction > 0 && damage > 0) {
      const reducedDamage = Math.floor(damage * (1 - materialReduction));
      context.log('info', `Material reduction (${npcBodyMaterial}): ${damage} -> ${reducedDamage} (-${Math.round(materialReduction * 100)}%)`);
      damage = Math.max(1, reducedDamage);
    }
    
    const finalDamage = Math.floor(damage);

    // Обрабатываем урон через TempNPC combat систему
    const combatResult = await handleTempNPCCombat({
      sessionId: context.sessionId,
      npcId: targetId,
      damage: finalDamage,
      techniqueId,
    });

    if (!combatResult.success) {
      return {
        success: false,
        eventId: context.eventId,
        error: 'NPC_NOT_FOUND',
        commands: [],
        data: {
          reason: `TempNPC ${targetId} not found in session`,
        },
      };
    }

    // Формируем визуальные команды
    const commands = [
      {
        type: 'visual:show_damage',
        timestamp: Date.now(),
        data: {
          targetId,
          x: targetPosition.x,
          y: targetPosition.y,
          damage: finalDamage,
          element,
          newHealth: combatResult.newHealth,
          maxHealth: combatResult.maxHealth,
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

    // Если NPC умер - добавляем команду смерти
    if (combatResult.isDead) {
      commands.push({
        type: 'visual:npc_death',
        timestamp: Date.now(),
        data: {
          targetId,
          x: targetPosition.x,
          y: targetPosition.y,
          loot: combatResult.loot,
          xp: combatResult.xp,
        },
      });
    }
    
    // === ДОБАВЛЯЕМ ДЕЛЬТУ РАЗВИТИЯ ===
    if (finalDamage > 0) {
      try {
        const deltaResult = generateAttackDelta(
          false,
          undefined,
          finalMultiplier
        );
        
        const fatiguePenalty = calculateFatiguePenaltyForDevelopment(
          session.character.fatigue ?? 0,
          session.character.mentalFatigue ?? 0
        );
        
        await addStatDelta(
          event.characterId,
          deltaResult.targetStat,
          deltaResult.deltaGained * fatiguePenalty,
          deltaResult.source
        );
        
        context.log('info', `Added delta: +${deltaResult.deltaGained * fatiguePenalty} to ${deltaResult.targetStat}`);
      } catch (deltaError) {
        context.log('warn', `Failed to add stat delta: ${deltaError}`);
      }
    }

    context.log('info', `TempNPC ${targetId} took ${finalDamage} damage. New HP: ${combatResult.newHealth}/${combatResult.maxHealth}. Dead: ${combatResult.isDead}`);

    // Формируем сообщение с учётом подавления
    let damageMessage = `${finalDamage} урона`;
    if (suppressionResult.wasSuppressed) {
      damageMessage += ` (подавление: ${Math.round(suppressionResult.multiplier * 100)}%)`;
    }
    if (qiBufferResult && qiBufferResult.bufferActivated) {
      damageMessage += ` [Ци: -${Math.floor(qiBufferResult.qiConsumed)}]`;
    }
    if (materialReduction > 0) {
      damageMessage += ` [${npcBodyMaterial}: -${Math.round(materialReduction * 100)}%]`;
    }

    return {
      success: true,
      eventId: context.eventId,
      commands,
      data: {
        targetId,
        damage: finalDamage,
        newHealth: combatResult.newHealth,
        maxHealth: combatResult.maxHealth,
        isDead: combatResult.isDead,
        isUnconscious: combatResult.isUnconscious,
        loot: combatResult.loot,
        xp: combatResult.xp,
        // Данные о подавлении уровнем
        levelSuppression: suppressionResult,
        // Данные о Qi Buffer
        qiBuffer: qiBufferResult,
        // Данные о материале тела
        bodyMaterial: npcBodyMaterial,
        materialReduction,
      },
      message: combatResult.isDead 
        ? `${targetId} уничтожен! XP: ${combatResult.xp}`
        : `Нанесено ${damageMessage} ${targetId}`,
    };

  } catch (error) {
    context.log('error', `Error in handleTempNPCDamageEvent: ${error}`);
    return {
      success: false,
      eventId: context.eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
      commands: [],
    };
  }
}

export default handleCombatEvent;
