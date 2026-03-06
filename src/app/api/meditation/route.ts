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
import type { LocationData } from '@/types/game-shared';
import type { Character, WorldTime } from '@/types/game';

interface MeditationRequest {
  characterId: string;
  durationMinutes?: number;  // Only for accumulation type. Ignored for breakthrough/conductivity
  meditationType?: 'accumulation' | 'breakthrough' | 'conductivity'; // Type of meditation
  formationId?: string;     // Optional: active formation
  formationQuality?: number; // Optional: formation quality (1-5)
  techniqueId?: string;     // Optional: specific technique to use (overrides slot)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MeditationRequest;
    const { 
      characterId, 
      durationMinutes, 
      meditationType = 'accumulation',
      formationId, 
      formationQuality = 1, 
      techniqueId 
    } = body;
    
    // Validate characterId
    if (!characterId) {
      return NextResponse.json(
        { success: false, error: 'Missing characterId' },
        { status: 400 }
      );
    }
    
    // === DURATION VALIDATION ===
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
    
    // Validate meditation type
    if (!['accumulation', 'breakthrough', 'conductivity'].includes(meditationType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid meditationType. Must be "accumulation", "breakthrough", or "conductivity"' },
        { status: 400 }
      );
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
    
    if (techniqueData) {
      const effects = techniqueData.effects ? JSON.parse(techniqueData.effects as string) : {};
      
      if (effects.qiRegenPercent) {
        qiAbsorptionBonus = effects.qiRegenPercent;
      } else if (effects.qiRegen) {
        qiAbsorptionBonus = effects.qiRegen;
      }
      
      if (effects.unnoticeability) {
        unnoticeabilityBonus = effects.unnoticeability;
      }
      
      const masteryMultiplier = 1 + (cultivationTechnique?.mastery || 0) / 100;
      qiAbsorptionBonus *= masteryMultiplier;
      unnoticeabilityBonus *= masteryMultiplier;
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
    let interruptionResult = null;
    
    if (meditationType === 'accumulation' && actualDurationMinutes >= 60) {
      const charForCheck: Character = {
        id: character.id,
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
        currentLocationId: character.currentLocationId,
        sectId: character.sectId,
      };
      
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
      
      if (interruptionResult.interrupted && interruptionResult.event) {
        actualDurationMinutes = interruptionResult.checkHour * 60;
      }
    }
    
    // === PERFORM MEDITATION BASED ON TYPE ===
    let result: any;
    let message = '';
    
    if (meditationType === 'breakthrough') {
      // === BREAKTHROUGH MEDITATION ===
      result = performBreakthroughMeditation(character, location, 0);
      
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
      
      let autoBreakthrough = null;
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
          daysSinceStart: finalWorldTime?.daysSinceStart || 0,
          worldYear: finalWorldTime?.year || 0,
          worldMonth: finalWorldTime?.month || 0,
          worldDay: finalWorldTime?.day || 0,
          worldHour: finalWorldTime?.hour || 0,
          worldMinute: finalWorldTime?.minute || 0,
        }),
      });
      
    } else if (meditationType === 'conductivity') {
      // === CONDUCTIVITY MEDITATION ===
      result = performConductivityMeditation(
        character, 
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
          daysSinceStart: finalWorldTime?.daysSinceStart || 0,
          worldYear: finalWorldTime?.year || 0,
          worldMonth: finalWorldTime?.month || 0,
          worldDay: finalWorldTime?.day || 0,
          worldHour: finalWorldTime?.hour || 0,
          worldMinute: finalWorldTime?.minute || 0,
        }),
      });
      
    } else {
      // === ACCUMULATION MEDITATION (DEFAULT) ===
      const baseResult = performMeditation(
        character,
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
        character: {
          id: characterId,
          currentQi: finalState?.character.currentQi,
          coreCapacity: finalState?.character.coreCapacity,
          fatigue: finalState?.character.fatigue,
          mentalFatigue: finalState?.character.mentalFatigue,
          accumulatedQi: finalState?.character.accumulatedQi,
        },
        worldTime: formatWorldTimeForResponse({
          year: finalWorldTime?.year || 0,
          month: finalWorldTime?.month || 0,
          day: finalWorldTime?.day || 0,
          hour: finalWorldTime?.hour || 0,
          minute: finalWorldTime?.minute || 0,
          daysSinceStart: finalWorldTime?.daysSinceStart || 0,
          worldYear: finalWorldTime?.year || 0,
          worldMonth: finalWorldTime?.month || 0,
          worldDay: finalWorldTime?.day || 0,
          worldHour: finalWorldTime?.hour || 0,
          worldMinute: finalWorldTime?.minute || 0,
        }),
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
