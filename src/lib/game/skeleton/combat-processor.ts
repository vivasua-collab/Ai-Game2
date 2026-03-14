/**
 * ============================================================================
 * COMBAT PROCESSOR - Процессор боевых событий
 * ============================================================================
 * 
 * Обрабатывает боевые события:
 * - Нанесение урона
 * - Получение урона
 * - Использование техник
 * 
 * Интеграция с:
 * - combat-system.ts (расчёты урона, дальности)
 * - TruthSystem (состояние персонажа)
 * - qi-shared.ts (расчёты Ци)
 * 
 * Версия: 1.1.0 (с расширенной формулой мастерства)
 * ============================================================================
 */

import { TruthSystem, type SessionState } from '../truth-system';
import {
  calculateAttackDamage,
  calculateCastTime,
  calculateDamageAtDistance,
  getEffectiveRange,
  isMeleeTechnique,
  isRangedTechnique,
  type AttackResult,
  type CombatTarget,
} from '../combat-system';
import { calculateTotalConductivity } from '../conductivity-system';
import { WORLD_CONSTANTS } from '../constants';
import { calculateFatigueFromQiSpent } from '../fatigue-system';
import { 
  calculateTechniqueCapacity, 
  calculateQiDensity,
  type TechniqueRarity 
} from '../techniques';
import { db } from '@/lib/db';
import type { 
  GameEvent, 
  CombatDamageDealtEvent, 
  TechniqueUseEvent,
  EventResult,
} from '../events/game-events';
import { 
  createShowDamageCommand,
  createShowEffectCommand,
  createShowBeamCommand,
  createShowAoeCommand,
  createUpdateHpBarCommand,
  createCameraShakeCommand,
} from '../events/visual-commands';

// ==================== КОНСТАНТЫ ====================
// Используем WORLD_CONSTANTS из constants.ts

// Множители мастерства по редкости
const MASTERY_RARITY_MULTIPLIERS: Record<TechniqueRarity, number> = {
  common: 1.0,
  uncommon: 1.1,
  rare: 1.25,
  legendary: 1.5,
};

// ==================== ТИПЫ ====================

interface CombatChanges {
  character?: {
    currentQi?: number;
    health?: number;
    fatigue?: number;
    mentalFatigue?: number;
  };
  target?: {
    hp?: number;
    maxHp?: number;
  };
}

interface TechniqueData {
  id: string;
  name: string;
  type: string;
  element: string;
  level: number;
  qiCost: number;
  rarity: string;
  effects: {
    damage?: number;
    range?: number;
    distance?: number;
    combatType?: string;
    [key: string]: unknown;
  };
  damageFalloff?: {
    fullDamage?: number;
    halfDamage?: number;
    max?: number;
  };
}

// ==================== РАСЧЁТ МАСТЕРСТВА ====================

/**
 * Расширенная формула прироста мастерства
 * 
 * Учитывает:
 * - Убывающую отдачу (чем выше мастерство, тем медленнее рост)
 * - Эффективность использования (заполнение ёмкости)
 * - Разницу уровней техники и культивации
 * - Редкость техники
 * 
 * @param params Параметры для расчёта
 * @returns Прирост мастерства (0.1 - 2.0)
 */
export function calculateMasteryGain(params: {
  techniqueLevel: number;
  cultivationLevel: number;
  currentMastery: number;
  qiSpent: number;
  techniqueCapacity: number;
  techniqueRarity: TechniqueRarity;
}): number {
  const {
    techniqueLevel,
    cultivationLevel,
    currentMastery,
    qiSpent,
    techniqueCapacity,
    techniqueRarity,
  } = params;
  
  // 1. Базовый прирост (убывающая отдача)
  const baseGain = 1.0;
  const diminishingReturn = Math.max(0.1, 1 - (currentMastery / 100));
  let gain = baseGain * diminishingReturn;
  
  // 2. Бонус за эффективное использование (заполнение ёмкости)
  const capacityUsage = techniqueCapacity > 0 ? qiSpent / techniqueCapacity : 0;
  const efficiencyBonus = Math.min(1.0, capacityUsage);
  gain *= (1 + efficiencyBonus * 0.5); // до +50%
  
  // 3. Штраф за использование техники выше уровня культивации
  if (techniqueLevel > cultivationLevel) {
    const levelDiff = techniqueLevel - cultivationLevel;
    gain *= Math.max(0.1, 1 - levelDiff * 0.2); // -20% за каждый уровень разницы
  }
  
  // 4. Бонус от редкости (сложнее освоить = больше опыта)
  gain *= MASTERY_RARITY_MULTIPLIERS[techniqueRarity] || 1.0;
  
  // Минимум 0.1%, максимум 2.0%
  return Math.max(0.1, Math.min(2.0, gain));
}

// ==================== ГЛАВНЫЙ ЭКСПОРТ ====================

/**
 * Обработать боевое событие
 */
export async function processCombatEvent(
  event: GameEvent,
  session: SessionState
): Promise<EventResult> {
  console.log(`[CombatProcessor] Processing: ${event.type}`);

  switch (event.type) {
    case 'combat:damage_dealt':
      return processDamageDealt(event as CombatDamageDealtEvent, session);

    case 'technique:use':
      return processTechniqueUse(event as TechniqueUseEvent, session);

    case 'technique:charge_start':
      return processChargeStart(event, session);

    case 'technique:charge_cancel':
      return processChargeCancel(event, session);

    default:
      return {
        success: false,
        eventId: event.id,
        error: `Unknown combat event: ${event.type}`,
        commands: [],
      };
  }
}

// ==================== ОБРАБОТКА УРОНА ====================

/**
 * Обработка нанесения урона
 */
async function processDamageDealt(
  event: CombatDamageDealtEvent,
  session: SessionState
): Promise<EventResult> {
  const { targetId, targetType, techniqueId, distance, targetPosition, rotation } = event;

  console.log(`[CombatProcessor] Damage dealt to ${targetId} (${targetType})`);

  try {
    // 1. Получаем данные техники
    const technique = await db.technique.findUnique({
      where: { id: techniqueId },
    });

    if (!technique) {
      return {
        success: false,
        eventId: event.id,
        error: 'Technique not found',
        commands: [],
      };
    }

    // 2. Получаем мастерство техники персонажа
    const characterTechnique = await db.characterTechnique.findFirst({
      where: {
        characterId: event.characterId,
        techniqueId,
      },
    });

    const mastery = characterTechnique?.mastery ?? 0;

    // 3. Рассчитываем урон
    const rangeData = getEffectiveRange(technique as unknown as TechniqueData);
    const distanceInMeters = distance / WORLD_CONSTANTS.METERS_TO_PIXELS;

    // Базовый урон из эффектов
    const baseDamage = technique.effects?.damage ?? 10;
    const element = technique.element ?? 'neutral';

    // Применяем затухание по дальности
    const damageResult = calculateDamageAtDistance(
      baseDamage,
      distanceInMeters,
      rangeData
    );

    // 4. Списываем Ци
    const qiCost = technique.qiCost ?? 0;
    if (qiCost > 0) {
      const qiResult = TruthSystem.spendQi(event.sessionId, qiCost);
      if (!qiResult.success) {
        return {
          success: false,
          eventId: event.id,
          error: 'Not enough Qi',
          commands: [],
        };
      }
    }

    // 5. Генерируем визуальные команды
    const commands = [];

    // Показываем урон
    if (damageResult.damage > 0) {
      commands.push(createShowDamageCommand(
        targetPosition.x,
        targetPosition.y,
        damageResult.damage,
        {
          element: element as 'fire' | 'water' | 'earth' | 'air' | 'lightning' | 'void' | 'neutral',
          multiplier: damageResult.multiplier,
        }
      ));
    }

    // Показываем эффект атаки
    const combatType = technique.effects?.combatType ?? 'melee_strike';
    
    if (isRangedTechnique(combatType as 'ranged_projectile' | 'ranged_beam' | 'ranged_aoe')) {
      if (combatType === 'ranged_beam') {
        commands.push(createShowBeamCommand(
          session.character.currentLocation?.x ?? 0,
          session.character.currentLocation?.y ?? 0,
          targetPosition.x,
          targetPosition.y,
          { element: element as 'fire' | 'water' | 'earth' | 'air' | 'lightning' | 'void' | 'neutral' }
        ));
      } else if (combatType === 'ranged_aoe') {
        commands.push(createShowAoeCommand(
          targetPosition.x,
          targetPosition.y,
          (rangeData.max ?? 5) * WORLD_CONSTANTS.METERS_TO_PIXELS,
          { element: element as 'fire' | 'water' | 'earth' | 'air' | 'lightning' | 'void' | 'neutral' }
        ));
      }
    } else {
      // Melee - показываем эффект удара
      commands.push(createShowEffectCommand(
        targetPosition.x,
        targetPosition.y,
        'impact',
        { element: element as 'fire' | 'water' | 'earth' | 'air' | 'lightning' | 'void' | 'neutral' }
      ));
    }

    // Тряска камеры для критических ударов
    if (damageResult.multiplier >= 1.0) {
      commands.push(createCameraShakeCommand(0.3, 200));
    }

    // 6. Обновляем HP цели (для training dummy)
    const changes: CombatChanges = {};

    if (targetType === 'training_dummy') {
      // Для тренировочных чучел HP обрабатывается на клиенте
      // Но можно добавить серверную логику
      changes.target = {
        hp: WORLD_CONSTANTS.DEFAULT_TRAINING_DUMMY_HP - damageResult.damage,
        maxHp: WORLD_CONSTANTS.DEFAULT_TRAINING_DUMMY_HP,
      };

      commands.push(createUpdateHpBarCommand(
        targetId,
        Math.max(0, WORLD_CONSTANTS.DEFAULT_TRAINING_DUMMY_HP - damageResult.damage),
        WORLD_CONSTANTS.DEFAULT_TRAINING_DUMMY_HP
      ));
    }

    // 7. Обновляем состояние персонажа
    const updatedSession = TruthSystem.getSessionState(event.sessionId);
    changes.character = {
      currentQi: updatedSession?.character.currentQi,
    };

    return {
      success: true,
      eventId: event.id,
      changes,
      commands,
      message: damageResult.damage > 0 
        ? `Dealt ${damageResult.damage} damage to ${targetId}`
        : 'Attack missed or was out of range',
    };

  } catch (error) {
    console.error('[CombatProcessor] Error processing damage:', error);
    return {
      success: false,
      eventId: event.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      commands: [],
    };
  }
}

// ==================== ИСПОЛЬЗОВАНИЕ ТЕХНИКИ ====================

/**
 * Обработка использования техники
 */
async function processTechniqueUse(
  event: TechniqueUseEvent,
  session: SessionState
): Promise<EventResult> {
  const { techniqueId, position, rotation, targetId, distance } = event;

  console.log(`[CombatProcessor] Using technique: ${techniqueId}`);

  try {
    // 1. Получаем технику
    const technique = await db.technique.findUnique({
      where: { id: techniqueId },
    });

    if (!technique) {
      return {
        success: false,
        eventId: event.id,
        error: 'Technique not found',
        commands: [],
      };
    }

    // 2. Проверяем, есть ли техника у персонажа
    const characterTechnique = await db.characterTechnique.findFirst({
      where: {
        characterId: event.characterId,
        techniqueId,
      },
    });

    if (!characterTechnique) {
      return {
        success: false,
        eventId: event.id,
        error: 'Character does not know this technique',
        commands: [],
      };
    }

    // 3. Проверяем Ци
    const qiCost = technique.qiCost ?? 0;
    if (qiCost > session.character.currentQi) {
      return {
        success: false,
        eventId: event.id,
        error: `Not enough Qi. Need: ${qiCost}, Have: ${session.character.currentQi}`,
        commands: [],
      };
    }

    // 4. Рассчитываем время зарядки
    const conductivity = calculateTotalConductivity(
      session.character.coreCapacity,
      session.character.cultivationLevel,
      session.character.conductivityMeditations ?? 0
    );

    const castTime = calculateCastTime(
      qiCost,
      conductivity,
      session.character.cultivationLevel,
      characterTechnique.mastery
    );

    // 5. Списываем Ци
    if (qiCost > 0) {
      TruthSystem.spendQi(event.sessionId, qiCost);
    }

    // 6. Добавляем усталость (использование техники утомляет)
    const fatigueResult = calculateFatigueFromQiSpent(qiCost, session.character.cultivationLevel);
    if (fatigueResult.physicalFatigue > 0 || fatigueResult.mentalFatigue > 0) {
      TruthSystem.updateFatigue(event.sessionId, fatigueResult.physicalFatigue, fatigueResult.mentalFatigue);
    }

    // 7. Обновляем мастерство (расширенная формула)
    const techniqueCapacity = calculateTechniqueCapacity(
      technique.level ?? 1,
      characterTechnique.mastery
    );
    
    const masteryGain = calculateMasteryGain({
      techniqueLevel: technique.level ?? 1,
      cultivationLevel: session.character.cultivationLevel,
      currentMastery: characterTechnique.mastery,
      qiSpent: qiCost,
      techniqueCapacity,
      techniqueRarity: (technique.rarity as TechniqueRarity) || 'common',
    });
    
    await db.characterTechnique.update({
      where: { id: characterTechnique.id },
      data: {
        mastery: Math.min(100, characterTechnique.mastery + masteryGain),
      },
    });

    // 8. Генерируем команды
    const commands = [];
    const element = technique.element ?? 'neutral';
    const combatType = technique.effects?.combatType;

    // Визуальный эффект
    if (technique.effects?.range || distance) {
      const range = technique.effects?.range ?? distance ?? 5;
      commands.push(createShowAoeCommand(
        position.x,
        position.y,
        range * WORLD_CONSTANTS.METERS_TO_PIXELS,
        { element: element as 'fire' | 'water' | 'earth' | 'air' | 'lightning' | 'void' | 'neutral' }
      ));
    }

    // 9. Формируем результат
    const updatedSession = TruthSystem.getSessionState(event.sessionId);

    return {
      success: true,
      eventId: event.id,
      changes: {
        character: {
          currentQi: updatedSession?.character.currentQi,
          fatigue: updatedSession?.character.fatigue,
          mentalFatigue: updatedSession?.character.mentalFatigue,
        },
      },
      commands,
      message: `Used ${technique.name} (cast time: ${castTime.effectiveTime.toFixed(1)}s)`,
    };

  } catch (error) {
    console.error('[CombatProcessor] Error using technique:', error);
    return {
      success: false,
      eventId: event.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      commands: [],
    };
  }
}

// ==================== ЗАРЯДКА ТЕХНИКИ ====================

/**
 * Начало зарядки техники
 */
async function processChargeStart(
  event: GameEvent,
  session: SessionState
): Promise<EventResult> {
  // Зарядка обрабатывается на клиенте
  // Сервер только подтверждает
  
  return {
    success: true,
    eventId: event.id,
    commands: [],
    message: 'Charge started',
  };
}

/**
 * Отмена зарядки
 */
async function processChargeCancel(
  event: GameEvent,
  session: SessionState
): Promise<EventResult> {
  return {
    success: true,
    eventId: event.id,
    commands: [],
    message: 'Charge cancelled',
  };
}

export default processCombatEvent;
