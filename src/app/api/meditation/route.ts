/**
 * Meditation API Endpoint
 * 
 * Direct meditation without LLM routing.
 * Synchronized with global time system (ticks).
 * 
 * Features:
 * - System of interruptions integrated
 * - Cultivation technique from slot (quickSlot = 0) applies bonus
 * - Formation effects considered
 * 
 * Meditation Types:
 * - accumulation: обычная накопительная (по умолчанию)
 * - breakthrough: медитация на прорыв (заполнение → опустошение в accumulatedQi)
 * - conductivity: медитация на проводимость (+1 к МедП при заполнении)
 * 
 * ИНТЕГРАЦИЯ TRUTHSYSTEM:
 * - Проверяет наличие сессии в памяти (ПАМЯТЬ ПЕРВИЧНА!)
 * - Накопление Ци через TruthSystem.addQi()
 * - Обновление усталости через TruthSystem.updateFatigue()
 * - КРИТИЧЕСКИЕ операции (прорыв, проводимость) через TruthSystem.applyBreakthrough/updateConductivity
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  performMeditation,
  performBreakthroughMeditation,
  performConductivityMeditation,
  attemptBreakthrough,
} from '@/lib/game/qi-system';
import { logQiMeditation, logQiChange } from '@/lib/logger/qi-logger';
import { getCoreFillPercent, calculateBreakthroughRequirements, getCultivationLevelName, calculatePassiveQiDissipation } from '@/lib/game/qi-shared';
import { QI_CONSTANTS, TIME_CONSTANTS } from '@/lib/game/constants';
import { advanceWorldTime, formatWorldTimeForResponse } from '@/lib/game/time-db';
import { 
  checkMeditationInterruption
} from '@/lib/game/meditation-interruption';
import { 
  canDoConductivityMeditation,
  calculateTotalConductivity,
  getConductivityMeditationProgress,
} from '@/lib/game/conductivity-system';
import { TruthSystem } from '@/lib/game/truth-system';
import {
  meditationRequestSchema,
  validateOrError,
  validationErrorResponse,
} from '@/lib/validations/game';
import type { LocationData } from '@/types/game-shared';
import type { Character, WorldTime } from '@/types/game';
import {
  CULTIVATION_BONUS_BY_GRADE,
  type TechniqueGrade,
} from '@/lib/constants/technique-capacity';
import { RARITY_TO_TECHNIQUE_GRADE } from '@/types/grade';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zod validation for base structure
    const validation = validateOrError(meditationRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(validationErrorResponse(validation.error), { status: 400 });
    }
    
    const { 
      characterId, 
      durationMinutes, 
      meditationType = 'accumulation',
      formationId, 
      formationQuality = 1, 
      techniqueId 
    } = validation.data;
    
    // === DURATION VALIDATION (additional checks for accumulation type) ===
    let actualDurationMinutes = durationMinutes || 0;
    
    if (meditationType === 'accumulation') {
      if (!durationMinutes) {
        return NextResponse.json(
          { success: false, error: 'Missing durationMinutes for accumulation meditation' },
          { status: 400 }
        );
      }
      
      if (durationMinutes < TIME_CONSTANTS.MIN_MEDITATION_TICKS) {
        return NextResponse.json(
          { success: false, error: `Minimum duration: ${TIME_CONSTANTS.MIN_MEDITATION_TICKS} minutes` },
          { status: 400 }
        );
      }
      
      if (durationMinutes > TIME_CONSTANTS.MAX_MEDITATION_TICKS) {
        return NextResponse.json(
          { success: false, error: `Maximum duration: ${TIME_CONSTANTS.MAX_MEDITATION_TICKS / 60} hours` },
          { status: 400 }
        );
      }
      
      if (durationMinutes % TIME_CONSTANTS.MEDITATION_TICK_STEP !== 0) {
        return NextResponse.json(
          { success: false, error: `Duration must be multiple of ${TIME_CONSTANTS.MEDITATION_TICK_STEP} minutes` },
          { status: 400 }
        );
      }
      
      actualDurationMinutes = durationMinutes;
    }
    
    // === ПРОВЕРКА TRUTHSYSTEM (ПАМЯТЬ ПЕРВИЧНА!) ===
    const truthSystem = TruthSystem.getInstance();
    const memoryState = truthSystem.getSessionByCharacter(characterId);
    
    let source: 'memory' | 'database' = 'database';
    
    // Get character with location and session
    const dbCharacter = await db.character.findUnique({
      where: { id: characterId },
      include: {
        currentLocation: true,
        sessions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        techniques: techniqueId 
          ? {
              where: { 
                techniqueId: techniqueId,
              },
              include: { technique: true },
            }
          : {
              where: { 
                quickSlot: 0,
              },
              include: { technique: true },
            },
      },
    });
    
    if (!dbCharacter) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      );
    }
    
    const session = dbCharacter.sessions[0];
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'No active session for character' },
        { status: 404 }
      );
    }
    
    const sessionId = session.id;
    
    // Если сессия не в памяти - загружаем
    if (memoryState) {
      source = 'memory';
    } else {
      await truthSystem.loadSession(sessionId);
    }
    
    // Теперь получаем персонажа из памяти (ПЕРВИЧНЫЙ ИСТОЧНИК)
    const currentMemoryState = truthSystem.getSessionState(sessionId);
    if (!currentMemoryState) {
      return NextResponse.json(
        { success: false, error: 'Failed to load session into memory' },
        { status: 500 }
      );
    }
    
    // Используем данные из памяти
    const character = {
      ...dbCharacter,
      // Переопределяем данными из памяти
      currentQi: currentMemoryState.character.currentQi,
      accumulatedQi: currentMemoryState.character.accumulatedQi,
      fatigue: currentMemoryState.character.fatigue,
      mentalFatigue: currentMemoryState.character.mentalFatigue,
      cultivationLevel: currentMemoryState.character.cultivationLevel,
      cultivationSubLevel: currentMemoryState.character.cultivationSubLevel,
      coreCapacity: currentMemoryState.character.coreCapacity,
      coreQuality: currentMemoryState.character.coreQuality,
      conductivity: currentMemoryState.character.conductivity,
      conductivityMeditations: currentMemoryState.character.conductivityMeditations,
      health: currentMemoryState.character.health,
    };
    
    // Get cultivation technique
    const cultivationTechnique = dbCharacter.techniques[0];
    const techniqueData = cultivationTechnique?.technique;
    
    // Calculate technique bonuses
    let qiAbsorptionBonus = 0;
    let unnoticeabilityBonus = 0;
    let gradeInfo: { grade: TechniqueGrade; qiBonus: number; unnoticeability: number } | null = null;
    
    if (techniqueData) {
      const effects = techniqueData.effects ? JSON.parse(techniqueData.effects as string) : {};
      
      // Получаем grade из техники или конвертируем из rarity
      const techniqueGrade = (techniqueData.grade as TechniqueGrade) 
        ?? (techniqueData.rarity ? RARITY_TO_TECHNIQUE_GRADE[techniqueData.rarity as keyof typeof RARITY_TO_TECHNIQUE_GRADE] : 'common')
        ?? 'common';
      
      // Получаем бонусы из Grade System
      const gradeBonuses = CULTIVATION_BONUS_BY_GRADE[techniqueGrade];
      
      // Сохраняем информацию о grade для ответа
      gradeInfo = {
        grade: techniqueGrade,
        qiBonus: gradeBonuses.qiBonus * 100, // Конвертируем в проценты
        unnoticeability: gradeBonuses.unnoticeability * 100,
      };
      
      // Бонусы из эффектов (из пресета)
      if (effects.qiRegenPercent) {
        qiAbsorptionBonus = effects.qiRegenPercent;
      } else if (effects.qiRegen) {
        qiAbsorptionBonus = effects.qiRegen;
      }
      
      if (effects.unnoticeability) {
        unnoticeabilityBonus = effects.unnoticeability;
      }
      
      // Применяем множитель мастерства
      const masteryMultiplier = 1 + (cultivationTechnique?.mastery || 0) / 100;
      qiAbsorptionBonus *= masteryMultiplier;
      unnoticeabilityBonus *= masteryMultiplier;
      
      // Добавляем бонусы Grade System (кроме уже учтённых в эффектах)
      // Если эффекты не заданы, используем бонусы из Grade
      if (qiAbsorptionBonus === 0) {
        qiAbsorptionBonus = gradeBonuses.qiBonus * 100 * masteryMultiplier;
      }
      if (unnoticeabilityBonus === 0) {
        unnoticeabilityBonus = gradeBonuses.unnoticeability * 100 * masteryMultiplier;
      }
    }
    
    // === РАССЕИВАНИЕ ИЗБЫТОЧНОЙ ЦИ ===
    let dissipationBeforeMeditation = 0;
    if (character.currentQi > character.coreCapacity) {
      const conductivity = calculateTotalConductivity(
        character.coreCapacity,
        character.cultivationLevel,
        character.conductivityMeditations || 0
      );
      
      const dissipationResult = calculatePassiveQiDissipation(
        character.currentQi,
        character.coreCapacity,
        conductivity,
        60
      );
      
      if (dissipationResult.dissipated > 0) {
        dissipationBeforeMeditation = dissipationResult.dissipated;
        // Обновляем в памяти через TruthSystem
        truthSystem.updateCharacter(sessionId, {
          currentQi: dissipationResult.newQi,
        });
        character.currentQi = dissipationResult.newQi;
      }
    }
    
    // Build location data
    let location: LocationData | null = null;
    if (dbCharacter.currentLocation) {
      location = {
        name: dbCharacter.currentLocation.name,
        qiDensity: dbCharacter.currentLocation.qiDensity || QI_CONSTANTS.DEFAULT_QI_DENSITY,
        qiFlowRate: dbCharacter.currentLocation.qiFlowRate || 1,
        distanceFromCenter: dbCharacter.currentLocation.distanceFromCenter || 0,
        terrainType: dbCharacter.currentLocation.terrainType,
      };
    } else {
      location = {
        qiDensity: QI_CONSTANTS.DEFAULT_QI_DENSITY,
        distanceFromCenter: 0,
      };
    }
    
    // Build world time for interruption checks
    const worldTime: WorldTime = {
      year: currentMemoryState.worldTime.year,
      month: currentMemoryState.worldTime.month,
      day: currentMemoryState.worldTime.day,
      hour: currentMemoryState.worldTime.hour,
      minute: currentMemoryState.worldTime.minute,
      formatted: currentMemoryState.worldTime.formatted,
      season: currentMemoryState.worldTime.season,
    };
    
    // === SPECIAL CHECKS FOR CONDUCTIVITY MEDITATION ===
    if (meditationType === 'conductivity') {
      const check = canDoConductivityMeditation(
        character.cultivationLevel, 
        character.conductivityMeditations
      );
      if (!check.canDo) {
        return NextResponse.json({
          success: false,
          error: check.reason,
        });
      }
    }
    
    // === CHECK FOR INTERRUPTIONS (ONLY FOR ACCUMULATION TYPE) ===
    // ВРЕМЕННО ДЕАКТИВИРОВАНО - будет подключено позже
    const MEDITATION_INTERRUPTIONS_ENABLED = false;
    
    let interruptionResult: ReturnType<typeof checkMeditationInterruption> | null = null;
    
    if (MEDITATION_INTERRUPTIONS_ENABLED && meditationType === 'accumulation' && actualDurationMinutes >= 60) {
      const charForCheck = {
        id: character.id as any,
        name: character.name,
        age: character.age,
        cultivationLevel: character.cultivationLevel,
        cultivationSubLevel: character.cultivationSubLevel,
        coreCapacity: character.coreCapacity,
        coreQuality: character.coreQuality,
        currentQi: character.currentQi,
        accumulatedQi: character.accumulatedQi,
        strength: character.strength,
        agility: character.agility,
        intelligence: character.intelligence,
        conductivity: character.conductivity,
        health: character.health,
        fatigue: character.fatigue,
        mentalFatigue: character.mentalFatigue,
        hasAmnesia: character.hasAmnesia,
        knowsAboutSystem: character.knowsAboutSystem,
        sectRole: character.sectRole,
        currentLocationId: character.currentLocationId as any,
        sectId: character.sectId as any,
      } as Character;
      
      interruptionResult = checkMeditationInterruption(
        charForCheck,
        location,
        worldTime,
        durationMinutes!,
        {
          formationId: formationId as any,
          formationQuality: formationQuality,
        }
      );
      
      if (interruptionResult && unnoticeabilityBonus !== 0) {
        interruptionResult.finalChance *= (1 - unnoticeabilityBonus / 100);
        interruptionResult.finalChance = Math.max(0, Math.min(100, interruptionResult.finalChance));
      }
      
      if (interruptionResult?.interrupted && interruptionResult.event) {
        actualDurationMinutes = interruptionResult.checkHour * 60;
      }
    }
    
    // === PERFORM MEDITATION BASED ON TYPE ===
    let result: any;
    let message = '';
    
    if (meditationType === 'breakthrough') {
      // === BREAKTHROUGH MEDITATION ===
      result = performBreakthroughMeditation(character as any, location, 0);
      
      actualDurationMinutes = result.duration;
      
      if (qiAbsorptionBonus > 0) {
        result.qiGained = Math.floor(result.qiGained * (1 + qiAbsorptionBonus / 100));
      }
      
      // Продвигаем время в БД и памяти
      await advanceWorldTime(sessionId, actualDurationMinutes);
      
      // Обновляем через TruthSystem
      const wasCoreFullAtStart = character.currentQi >= character.coreCapacity;
      
      // Добавляем накопленную Ци
      truthSystem.updateCharacter(sessionId, {
        accumulatedQi: character.accumulatedQi + result.qiGained,
        mentalFatigue: Math.min(100, character.mentalFatigue + result.fatigueGained.mental),
      });
      
      if (!wasCoreFullAtStart && result.coreWasEmptied) {
        // Логируем опустошение ядра при прорыве
        logQiChange(sessionId, character.id, {
          oldQi: character.currentQi,
          newQi: 0,
          source: 'breakthrough',
          reason: 'core emptied for breakthrough transfer',
          details: { qiTransferred: result.qiGained },
        });
        truthSystem.updateCharacter(sessionId, { currentQi: 0 }, 'breakthrough: empty core');
      }
      
      truthSystem.advanceTime(sessionId, actualDurationMinutes);
      
      // Получаем обновлённое состояние из памяти
      const stateAfterMeditation = truthSystem.getSessionState(sessionId);
      if (!stateAfterMeditation) {
        return NextResponse.json({ success: false, error: 'Lost session state' }, { status: 500 });
      }
      
      // === AUTO-BREAKTHROUGH CHECK ===
      const newAccumulatedQi = stateAfterMeditation.character.accumulatedQi;
      const breakthroughReq = calculateBreakthroughRequirements(
        stateAfterMeditation.character.cultivationLevel,
        stateAfterMeditation.character.cultivationSubLevel,
        newAccumulatedQi,
        stateAfterMeditation.character.coreCapacity
      );
      
      let autoBreakthrough: {
        success: boolean;
        oldLevel: number;
        oldSubLevel: number;
        newLevel: number;
        newSubLevel: number;
        levelName: string;
        isMajorBreakthrough: boolean;
        qiConsumed: number;
        message: string;
      } | null = null;
      if (breakthroughReq.canAttempt) {
        // Формируем объект для attemptBreakthrough
        const charForBreakthrough = {
          ...stateAfterMeditation.character,
          physicalFatigue: stateAfterMeditation.character.fatigue,
        };
        const breakthroughResult = attemptBreakthrough(charForBreakthrough as any);
        
        if (breakthroughResult.success) {
          // КРИТИЧЕСКАЯ ОПЕРАЦИЯ - применяем через TruthSystem
          const breakthroughData = {
            newLevel: breakthroughResult.newLevel,
            newSubLevel: breakthroughResult.newSubLevel,
            newCoreCapacity: breakthroughResult.newCoreCapacity,
            newConductivity: breakthroughResult.newConductivity,
            qiConsumed: breakthroughResult.qiConsumed,
          };
          
          const applyResult = await truthSystem.applyBreakthrough(sessionId, breakthroughData);
          
          if (applyResult.success) {
            // Добавляем усталость от прорыва
            truthSystem.updateFatigue(
              sessionId, 
              breakthroughResult.fatigueGained.physical, 
              breakthroughResult.fatigueGained.mental
            );
            
            const newLevelName = getCultivationLevelName(breakthroughResult.newLevel);
            const isMajor = stateAfterMeditation.character.cultivationSubLevel >= 9;
            
            autoBreakthrough = {
              success: true,
              oldLevel: stateAfterMeditation.character.cultivationLevel,
              oldSubLevel: stateAfterMeditation.character.cultivationSubLevel,
              newLevel: breakthroughResult.newLevel,
              newSubLevel: breakthroughResult.newSubLevel,
              levelName: newLevelName,
              isMajorBreakthrough: isMajor,
              qiConsumed: breakthroughResult.qiConsumed,
              message: breakthroughResult.message,
            };
          }
        }
      }
      
      // Получаем финальное состояние
      const finalState = truthSystem.getSessionState(sessionId);
      const finalWorldTime = truthSystem.getWorldTime(sessionId);
      
      message = `🔥 Медитация на прорыв завершена!\n\n`;
      message += `⏱️ Время: ${result.duration} минут\n`;
      
      if (wasCoreFullAtStart) {
        message += `💫 Ци перенесено в накопленную: +${result.qiGained}\n`;
        message += `⚡ Перенос: ${character.coreCapacity} Ци за 1 минуту\n`;
      } else {
        message += `💫 Ци накоплено и перенесено: +${result.qiGained}\n`;
        if (result.breakdown && (result.breakdown.coreGeneration > 0 || result.breakdown.environmentalAbsorption > 0)) {
          message += `   ├─ Ядро: +${result.breakdown.coreGeneration}\n`;
          message += `   └─ Среда: +${result.breakdown.environmentalAbsorption}\n`;
        }
      }
      
      message += `\n📊 Накопленная Ци: ${finalState?.character.accumulatedQi}`;
      message += `\n💜 Мент. усталость: ${finalState?.character.mentalFatigue.toFixed(0)}% (+${result.fatigueGained.mental.toFixed(1)}%)`;
      
      if (result.coreWasEmptied) {
        message += `\n\n⚡ Ядро опустошено! Один перенос завершён.`;
      }
      
      if (autoBreakthrough) {
        message += `\n\n${'═'.repeat(30)}`;
        message += `\n🌟 АВТОМАТИЧЕСКИЙ ПРОРЫВ!`;
        message += `\n${'═'.repeat(30)}\n\n`;
        
        if (autoBreakthrough.isMajorBreakthrough) {
          message += `🌟 БОЛЬШОЙ ПРОРЫВ!\n`;
          message += `Уровень ${autoBreakthrough.oldLevel}.${autoBreakthrough.oldSubLevel} → ${autoBreakthrough.newLevel}.${autoBreakthrough.newSubLevel}\n`;
        } else {
          message += `⬆️ Продвижение!\n`;
          message += `${autoBreakthrough.oldLevel}.${autoBreakthrough.oldSubLevel} → ${autoBreakthrough.newLevel}.${autoBreakthrough.newSubLevel}\n`;
        }
        
        message += `📛 Новая ступень: ${autoBreakthrough.levelName}\n`;
        message += `💫 Ци израсходовано: ${autoBreakthrough.qiConsumed}\n`;
        message += `🔷 Новая ёмкость ядра: ${finalState?.character.coreCapacity}\n`;
        message += `⚡ Проводимость: ${finalState?.character.conductivity.toFixed(2)}`;
      }
      
      return NextResponse.json({
        success: true,
        source,
        message,
        meditationType: 'breakthrough',
        result: {
          qiGained: result.qiGained,
          duration: result.duration,
          coreWasEmptied: result.coreWasEmptied,
          breakdown: result.breakdown,
        },
        autoBreakthrough,
        character: {
          id: characterId,
          currentQi: finalState?.character.currentQi,
          accumulatedQi: finalState?.character.accumulatedQi,
          cultivationLevel: finalState?.character.cultivationLevel,
          cultivationSubLevel: finalState?.character.cultivationSubLevel,
          coreCapacity: finalState?.character.coreCapacity,
          conductivity: finalState?.character.conductivity,
          mentalFatigue: finalState?.character.mentalFatigue,
        },
        worldTime: formatWorldTimeForResponse({
          year: finalWorldTime?.year || 0,
          month: finalWorldTime?.month || 0,
          day: finalWorldTime?.day || 0,
          hour: finalWorldTime?.hour || 0,
          minute: finalWorldTime?.minute || 0,
        } as any),
      });
      
    } else if (meditationType === 'conductivity') {
      // === CONDUCTIVITY MEDITATION ===
      result = performConductivityMeditation(
        character as any, 
        location, 
        0,
        character.conductivityMeditations
      );
      
      actualDurationMinutes = result.duration;
      
      if (qiAbsorptionBonus > 0 && result.qiGained > 0) {
        result.qiGained = Math.floor(result.qiGained * (1 + qiAbsorptionBonus / 100));
      }
      
      // Продвигаем время
      await advanceWorldTime(sessionId, actualDurationMinutes);
      
      // Calculate new conductivity
      const newConductivityMeditations = character.conductivityMeditations + result.conductivityMeditationsGained;
      const newConductivity = calculateTotalConductivity(character.coreCapacity, character.cultivationLevel, newConductivityMeditations);
      
      // КРИТИЧЕСКАЯ ОПЕРАЦИЯ - обновляем через TruthSystem
      await truthSystem.updateConductivity(sessionId, newConductivity, result.conductivityMeditationsGained);
      
      // Обновляем усталость
      truthSystem.updateFatigue(sessionId, 0, result.fatigueGained.mental);
      
      // Продвигаем время в памяти
      truthSystem.advanceTime(sessionId, actualDurationMinutes);
      
      // Получаем финальное состояние
      const finalState = truthSystem.getSessionState(sessionId);
      const finalWorldTime = truthSystem.getWorldTime(sessionId);
      
      const progress = getConductivityMeditationProgress(
        character.coreCapacity, 
        character.cultivationLevel, 
        newConductivityMeditations
      );
      
      message = `⚡ Медитация на проводимость завершена!\n\n`;
      message += `⏱️ Время: ${result.duration} минут\n`;
      message += `✨ Каналы меридиан расширены!\n`;
      message += `📈 Медитации на проводимость: ${character.conductivityMeditations} → ${newConductivityMeditations} (+${result.conductivityMeditationsGained})\n`;
      message += `⚡ Проводимость: ${character.conductivity.toFixed(3)} → ${newConductivity.toFixed(3)}\n`;
      const secondsPerTransfer = Math.ceil(character.coreCapacity / newConductivity);
      message += `⏳ Время переноса: ${secondsPerTransfer} сек\n`;
      message += `📊 Прогресс: ${progress.current}/${progress.max} (${progress.percent}%)`;
      message += `\n\n💜 Мент. усталость: ${finalState?.character.mentalFatigue.toFixed(0)}% (+${result.fatigueGained.mental.toFixed(1)}%)`;
      
      return NextResponse.json({
        success: true,
        source,
        message,
        meditationType: 'conductivity',
        result: {
          qiGained: result.qiGained,
          duration: result.duration,
          coreWasFilled: result.coreWasFilled,
          conductivityMeditationsGained: result.conductivityMeditationsGained,
          newConductivityMeditations,
          newConductivity,
          breakdown: result.breakdown,
        },
        character: {
          id: characterId,
          currentQi: finalState?.character.currentQi,
          conductivity: finalState?.character.conductivity,
          conductivityMeditations: finalState?.character.conductivityMeditations,
          mentalFatigue: finalState?.character.mentalFatigue,
        },
        worldTime: formatWorldTimeForResponse({
          year: finalWorldTime?.year || 0,
          month: finalWorldTime?.month || 0,
          day: finalWorldTime?.day || 0,
          hour: finalWorldTime?.hour || 0,
          minute: finalWorldTime?.minute || 0,
        } as any),
      });
      
    } else {
      // === ACCUMULATION MEDITATION (DEFAULT) ===
      const baseResult = performMeditation(
        character as any,
        location,
        actualDurationMinutes,
        'accumulation'
      );
      
      let qiGainedWithBonus = baseResult.qiGained;
      if (qiAbsorptionBonus > 0 && baseResult.success) {
        qiGainedWithBonus = Math.floor(baseResult.qiGained * (1 + qiAbsorptionBonus / 100));
      }
      
      result = {
        ...baseResult,
        qiGained: qiGainedWithBonus,
        interruption: interruptionResult,
      };
      
      if (!result.success && !interruptionResult?.interrupted) {
        return NextResponse.json({
          success: false,
          error: result.interruptionReason,
          result,
        });
      }
      
      // Handle interruption
      if (interruptionResult?.interrupted && interruptionResult.event) {
        const event = interruptionResult.event;
        const interruptedMessage = `⚠️ Медитация прервана на ${interruptionResult.checkHour}-м часу!\n\n` +
          `📜 Событие: ${event.description}\n` +
          `⚡ Уровень опасности: ${event.dangerLevel}/10\n\n` +
          `${event.canIgnore ? '💡 Можно проигнорировать и продолжить.' : ''}\n` +
          `${event.canHide ? '💡 Можно попытаться скрыться.' : ''}`;
        
        // Добавляем Ци через TruthSystem (с логированием)
        logQiMeditation(sessionId, character.id, character.currentQi, character.currentQi + result.qiGained, actualDurationMinutes, 'accumulation');
        truthSystem.addQi(sessionId, result.qiGained, 'meditation', `accumulation ${actualDurationMinutes}min interrupted`);
        truthSystem.updateFatigue(sessionId, 0, result.fatigueGained.mental);
        truthSystem.advanceTime(sessionId, actualDurationMinutes);
        
        return NextResponse.json({
          success: true,
          source,
          interrupted: true,
          message: interruptedMessage,
          result: {
            qiGained: result.qiGained,
            duration: actualDurationMinutes,
            coreWasFilled: false,
            breakdown: result.breakdown,
            interruption: {
              event: event,
              checkHour: interruptionResult.checkHour,
              baseChance: interruptionResult.baseChance,
              finalChance: interruptionResult.finalChance,
            },
          },
          techniqueUsed: techniqueData ? {
            name: techniqueData.name,
            qiAbsorptionBonus: Math.round(qiAbsorptionBonus),
            unnoticeabilityBonus: Math.round(unnoticeabilityBonus),
          } : null,
        });
      }
      
      // Normal completion
      await advanceWorldTime(sessionId, actualDurationMinutes);

      // Добавляем Ци через TruthSystem (с логированием)
      logQiMeditation(sessionId, character.id, character.currentQi, character.currentQi + result.qiGained, actualDurationMinutes, 'accumulation');
      truthSystem.addQi(sessionId, result.qiGained, 'meditation', `accumulation ${actualDurationMinutes}min`);
      
      // Обновляем усталость
      truthSystem.updateFatigue(sessionId, 0, result.fatigueGained.mental);
      
      // Продвигаем время в памяти
      truthSystem.advanceTime(sessionId, actualDurationMinutes);
      
      // === СЧЁТЧИК МЕДИТАЦИЙ И ВЫДАЧА ТЕХНИК ===
      // Инкрементируем счётчик медитаций (передаём duration для учёта длинных медитаций >= 4 часов)
      const meditationCountResult = truthSystem.incrementMeditationCount(sessionId, actualDurationMinutes);
      const currentMeditationCount = meditationCountResult.data?.meditationCount || character.meditationCount || 0;
      const currentLongMeditationCount = meditationCountResult.data?.longMeditationCount || character.longMeditationCount || 0;
      
      // Проверяем выдачу техник (1-я и 2-я ДЛИННАЯ медитация >= 4 часов)
      let techniqueGrant: { granted: boolean; technique?: { id: string; name: string; type: string }; message?: string } = { granted: false };
      if (currentLongMeditationCount >= 1 && currentLongMeditationCount <= 2) {
        // Импорт динамический чтобы избежать циклических зависимостей
        const { checkAndGrantTechnique } = await import('@/lib/game/technique-granter');
        techniqueGrant = await checkAndGrantTechnique(character.id, currentLongMeditationCount - 1);
      }
      
      // Increase technique mastery (КРИТИЧЕСКАЯ ОПЕРАЦИЯ - в БД)
      let masteryGain = 0;
      if (cultivationTechnique) {
        masteryGain = Math.round((actualDurationMinutes / 30) * 10) / 10;
        const currentMastery = cultivationTechnique.mastery || 0;
        const newMastery = Math.min(100, currentMastery + masteryGain);
        
        await db.characterTechnique.update({
          where: { id: cultivationTechnique.id },
          data: { mastery: newMastery },
        });
      }
      
      // Получаем финальное состояние
      const finalState = truthSystem.getSessionState(sessionId);
      const finalWorldTime = truthSystem.getWorldTime(sessionId);
      
      // Generate message
      const qiPercent = getCoreFillPercent(finalState?.character.currentQi || 0, finalState?.character.coreCapacity || 1);
      message = `🧘 Медитация завершена!\n\n`;
      
      if (dissipationBeforeMeditation > 0) {
        message += `💨 Рассеяно избыточной Ци: -${dissipationBeforeMeditation}\n\n`;
      }
      
      message += `⏱️ Время: ${result.duration} минут (${Math.floor(result.duration / 60)} ч ${result.duration % 60} мин)\n`;
      message += `💫 Прирост Ци: +${result.qiGained}`;
      if (result.breakdown) {
        message += `\n   ├─ Ядро: +${result.breakdown.coreGeneration}`;
        message += `\n   └─ Среда: +${result.breakdown.environmentalAbsorption}`;
      }
      
      if (techniqueData) {
        message += `\n\n📜 Техника: ${techniqueData.name}`;
        if (qiAbsorptionBonus !== 0) {
          message += `\n   ├─ Бонус поглощения: +${Math.round(qiAbsorptionBonus)}%`;
        }
        if (unnoticeabilityBonus !== 0) {
          if (unnoticeabilityBonus > 0) {
            message += `\n   ├─ Незаметность: +${Math.round(unnoticeabilityBonus)}%`;
          } else {
            message += `\n   ├─ Заметность: +${Math.round(Math.abs(unnoticeabilityBonus))}%`;
          }
        }
        if (cultivationTechnique && masteryGain > 0) {
          const currentMastery = cultivationTechnique.mastery || 0;
          const newMastery = Math.min(100, currentMastery + masteryGain);
          message += `\n   └─ Мастерство: ${currentMastery.toFixed(2)}% → ${newMastery.toFixed(2)}% (+${masteryGain.toFixed(2)}%)`;
        }
      }
      
      message += `\n\n🌊 Текущая Ци: ${finalState?.character.currentQi}/${finalState?.character.coreCapacity} (${qiPercent}%)`;
      message += `\n💚 Физ. усталость: ${finalState?.character.fatigue.toFixed(0)}%`;
      message += `\n💜 Мент. усталость: ${finalState?.character.mentalFatigue.toFixed(0)}% (+${result.fatigueGained.mental.toFixed(1)}% от концентрации)`;
      
      if (result.coreWasFilled) {
        message += `\n\n⚡ Ядро заполнено! Накопленная Ци увеличена.`;
      }
      
      // === СООБЩЕНИЕ О ВЫДАЧЕ ТЕХНИКИ ===
      if (techniqueGrant.granted && techniqueGrant.message) {
        message += `\n\n${'═'.repeat(30)}`;
        message += `\n${techniqueGrant.message}`;
      }
      
      const dayChanged = finalWorldTime?.day !== worldTime.day;
      if (dayChanged) {
        message += `\n\n🌅 Наступил новый день!`;
      }
      
      return NextResponse.json({
        success: true,
        source,
        message,
        meditationType: 'accumulation',
        result: {
          qiGained: result.qiGained,
          duration: result.duration,
          coreWasFilled: result.coreWasFilled,
          breakdown: result.breakdown,
          dissipation: dissipationBeforeMeditation,
        },
        techniqueUsed: techniqueData ? {
          name: techniqueData.name,
          qiAbsorptionBonus: Math.round(qiAbsorptionBonus),
          unnoticeabilityBonus: Math.round(unnoticeabilityBonus),
        } : null,
        techniqueGranted: techniqueGrant.granted ? {
          name: techniqueGrant.technique?.name,
          type: techniqueGrant.technique?.type,
          meditationNumber: techniqueGrant.technique ? currentMeditationCount : undefined,
        } : undefined,
        character: {
          id: characterId,
          currentQi: finalState?.character.currentQi,
          coreCapacity: finalState?.character.coreCapacity,
          fatigue: finalState?.character.fatigue,
          mentalFatigue: finalState?.character.mentalFatigue,
          accumulatedQi: finalState?.character.accumulatedQi,
          meditationCount: currentMeditationCount,
          longMeditationCount: currentLongMeditationCount,
        },
        worldTime: formatWorldTimeForResponse({
          year: finalWorldTime?.year || 0,
          month: finalWorldTime?.month || 0,
          day: finalWorldTime?.day || 0,
          hour: finalWorldTime?.hour || 0,
          minute: finalWorldTime?.minute || 0,
        } as any),
        timeAdvanced: {
          ticks: actualDurationMinutes,
          dayChanged,
        },
      });
    }
    
  } catch (error) {
    console.error('Meditation API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
