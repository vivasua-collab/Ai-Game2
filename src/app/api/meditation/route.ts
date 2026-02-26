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
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  performMeditation, 
  performBreakthroughMeditation, 
  performConductivityMeditation 
} from '@/lib/game/qi-system';
import { getCoreFillPercent, calculateQiRates } from '@/lib/game/qi-shared';
import { QI_CONSTANTS, TIME_CONSTANTS, MEDITATION_TYPE_CONSTANTS } from '@/lib/game/constants';
import { advanceWorldTime, formatWorldTimeForResponse } from '@/lib/game/time-db';
import { 
  checkMeditationInterruption
} from '@/lib/game/meditation-interruption';
import { 
  canDoConductivityMeditation,
  getMaxConductivityMeditations,
  calculateTotalConductivity,
  getConductivityMeditationProgress,
} from '@/lib/game/conductivity-system';
import type { LocationData } from '@/types/game-shared';
import type { Character, WorldTime } from '@/types/game';

interface MeditationRequest {
  characterId: string;
  durationMinutes: number;  // In ticks (1 tick = 1 minute)
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
    
    // Validate duration using time constants
    if (!characterId || !durationMinutes) {
      return NextResponse.json(
        { success: false, error: 'Missing characterId or durationMinutes' },
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
    
    // Validate meditation type
    if (!['accumulation', 'breakthrough', 'conductivity'].includes(meditationType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid meditationType. Must be "accumulation", "breakthrough", or "conductivity"' },
        { status: 400 }
      );
    }
    
    // Get character with location and session
    const character = await db.character.findUnique({
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
                quickSlot: 0,  // Cultivation slot (default)
              },
              include: { technique: true },
            },
      },
    });
    
    if (!character) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      );
    }
    
    // Get cultivation technique
    const cultivationTechnique = character.techniques[0];
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
    
    const session = character.sessions[0];
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'No active session for character' },
        { status: 404 }
      );
    }
    
    // Build location data
    let location: LocationData | null = null;
    if (character.currentLocation) {
      location = {
        name: character.currentLocation.name,
        qiDensity: character.currentLocation.qiDensity || QI_CONSTANTS.DEFAULT_QI_DENSITY,
        qiFlowRate: character.currentLocation.qiFlowRate || 1,
        distanceFromCenter: character.currentLocation.distanceFromCenter || 0,
        terrainType: character.currentLocation.terrainType,
      };
    } else {
      location = {
        qiDensity: QI_CONSTANTS.DEFAULT_QI_DENSITY,
        distanceFromCenter: 0,
      };
    }
    
    // Build world time for interruption checks
    const worldTime: WorldTime = {
      year: session.worldYear,
      month: session.worldMonth,
      day: session.worldDay,
      hour: session.worldHour,
      minute: session.worldMinute,
      formatted: '',
      season: session.worldMonth <= 6 ? 'тёплый' : 'холодный',
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
    
    // === CHECK FOR INTERRUPTIONS (only for meditations >= 60 minutes) ===
    let interruptionResult = null;
    let actualDurationMinutes = durationMinutes;
    
    if (durationMinutes >= 60) {
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
        durationMinutes,
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
    let updateData: any = {};
    let message = '';
    
    if (meditationType === 'breakthrough') {
      // === BREAKTHROUGH MEDITATION ===
      result = performBreakthroughMeditation(character, location, actualDurationMinutes);
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: 'Ядро уже заполнено! Сначала используйте Ци или выберите другой тип медитации.',
        });
      }
      
      // Apply qi absorption bonus
      if (qiAbsorptionBonus > 0) {
        result.qiGained = Math.floor(result.qiGained * (1 + qiAbsorptionBonus / 100));
      }
      
      // Handle interruption
      if (interruptionResult?.interrupted && interruptionResult.event) {
        const event = interruptionResult.event;
        await db.character.update({
          where: { id: characterId },
          data: {
            currentQi: result.coreWasEmptied ? 0 : character.currentQi,
            accumulatedQi: character.accumulatedQi + result.qiGained,
            mentalFatigue: Math.min(100, character.mentalFatigue + result.fatigueGained.mental),
          },
        });
        await advanceWorldTime(session.id, actualDurationMinutes);
        
        return NextResponse.json({
          success: true,
          interrupted: true,
          message: `⚠️ Медитация на прорыв прервана!\n\n📜 ${event.description}`,
          result: {
            qiGained: result.qiGained,
            duration: actualDurationMinutes,
            coreWasEmptied: result.coreWasEmptied,
          },
        });
      }
      
      // Normal completion
      const timeResult = await advanceWorldTime(session.id, actualDurationMinutes);
      
      updateData = {
        currentQi: result.coreWasEmptied ? 0 : character.currentQi,
        accumulatedQi: character.accumulatedQi + result.qiGained,
        mentalFatigue: Math.min(100, character.mentalFatigue + result.fatigueGained.mental),
      };
      
      const updatedCharacter = await db.character.update({
        where: { id: characterId },
        data: updateData,
      });
      
      message = `🔥 Медитация на прорыв завершена!\n\n`;
      message += `⏱️ Время: ${result.duration} минут\n`;
      message += `💫 Ци в accumulatedQi: +${result.qiGained}\n`;
      if (result.breakdown) {
        message += `   ├─ Ядро: +${result.breakdown.coreGeneration}\n`;
        message += `   └─ Среда: +${result.breakdown.environmentalAbsorption}\n`;
      }
      message += `\n📊 Накопленная Ци: ${updatedCharacter.accumulatedQi}`;
      message += `\n💜 Мент. усталость: ${updatedCharacter.mentalFatigue.toFixed(0)}% (+${result.fatigueGained.mental.toFixed(1)}%)`;
      
      if (result.coreWasEmptied) {
        message += `\n\n⚡ Ядро опустошено! Вся Ци перенесена в накопленную.`;
      }
      
      return NextResponse.json({
        success: true,
        message,
        meditationType: 'breakthrough',
        result: {
          qiGained: result.qiGained,
          duration: result.duration,
          coreWasEmptied: result.coreWasEmptied,
          breakdown: result.breakdown,
        },
        character: {
          id: updatedCharacter.id,
          currentQi: updatedCharacter.currentQi,
          accumulatedQi: updatedCharacter.accumulatedQi,
          mentalFatigue: updatedCharacter.mentalFatigue,
        },
        worldTime: formatWorldTimeForResponse(timeResult.newTime),
      });
      
    } else if (meditationType === 'conductivity') {
      // === CONDUCTIVITY MEDITATION ===
      result = performConductivityMeditation(
        character, 
        location, 
        actualDurationMinutes, 
        character.conductivityMeditations
      );
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: 'Ядро уже заполнено! Сначала используйте Ци.',
        });
      }
      
      // Apply qi absorption bonus
      if (qiAbsorptionBonus > 0 && result.qiGained > 0) {
        result.qiGained = Math.floor(result.qiGained * (1 + qiAbsorptionBonus / 100));
      }
      
      // Handle interruption
      if (interruptionResult?.interrupted && interruptionResult.event) {
        const event = interruptionResult.event;
        await db.character.update({
          where: { id: characterId },
          data: {
            currentQi: character.currentQi + result.qiGained,
            mentalFatigue: Math.min(100, character.mentalFatigue + result.fatigueGained.mental),
          },
        });
        await advanceWorldTime(session.id, actualDurationMinutes);
        
        return NextResponse.json({
          success: true,
          interrupted: true,
          message: `⚠️ Медитация на проводимость прервана!\n\n📜 ${event.description}`,
          result: {
            qiGained: result.qiGained,
            duration: actualDurationMinutes,
            coreWasFilled: false,
            conductivityGained: false,
          },
        });
      }
      
      // Normal completion
      const timeResult = await advanceWorldTime(session.id, result.duration);
      
      // Calculate new conductivity
      const newConductivityMeditations = character.conductivityMeditations + result.conductivityMeditationsGained;
      const newConductivity = calculateTotalConductivity(character.coreCapacity, character.cultivationLevel, newConductivityMeditations);
      
      updateData = {
        currentQi: result.coreWasFilled ? 0 : character.currentQi + result.qiGained,
        mentalFatigue: Math.min(100, character.mentalFatigue + result.fatigueGained.mental),
        conductivityMeditations: newConductivityMeditations,
        conductivity: newConductivity,
      };
      
      const updatedCharacter = await db.character.update({
        where: { id: characterId },
        data: updateData,
      });
      
      const progress = getConductivityMeditationProgress(
        character.cultivationLevel, 
        newConductivityMeditations
      );
      
      message = `⚡ Медитация на проводимость завершена!\n\n`;
      message += `⏱️ Время: ${result.duration} минут\n`;
      
      if (result.coreWasFilled) {
        message += `✨ Ядро заполнено и опустошено!\n`;
        message += `📈 Медитации на проводимость: ${character.conductivityMeditations} → ${newConductivityMeditations}\n`;
        message += `⚡ Проводимость: ${character.conductivity.toFixed(3)} → ${newConductivity.toFixed(3)}\n`;
        message += `📊 Прогресс: ${progress.current}/${progress.max} (${progress.percent}%)`;
      } else {
        message += `💫 Прирост Ци: +${result.qiGained}\n`;
        message += `⚠️ Ядро не было заполнено. Нужно больше времени для увеличения проводимости.`;
      }
      
      message += `\n\n💜 Мент. усталость: ${updatedCharacter.mentalFatigue.toFixed(0)}% (+${result.fatigueGained.mental.toFixed(1)}%)`;
      
      return NextResponse.json({
        success: true,
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
          id: updatedCharacter.id,
          currentQi: updatedCharacter.currentQi,
          conductivity: updatedCharacter.conductivity,
          conductivityMeditations: updatedCharacter.conductivityMeditations,
          mentalFatigue: updatedCharacter.mentalFatigue,
        },
        worldTime: formatWorldTimeForResponse(timeResult.newTime),
      });
      
    } else {
      // === ACCUMULATION MEDITATION (DEFAULT) ===
      const baseResult = performMeditation(
        character,
        location,
        actualDurationMinutes,
        'accumulation'
      );
      
      // Apply qi absorption bonus
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
        
        const partialQi = Math.min(
          character.coreCapacity,
          character.currentQi + result.qiGained
        );
        
        await db.character.update({
          where: { id: characterId },
          data: {
            currentQi: partialQi,
            mentalFatigue: Math.min(100, character.mentalFatigue + result.fatigueGained.mental),
          },
        });
        
        await advanceWorldTime(session.id, actualDurationMinutes);
        
        return NextResponse.json({
          success: true,
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
      const timeResult = await advanceWorldTime(session.id, actualDurationMinutes);
      
      const newQi = Math.min(
        character.coreCapacity,
        character.currentQi + result.qiGained
      );
      
      const newPhysicalFatigue = character.fatigue;
      const newMentalFatigue = Math.min(100, character.mentalFatigue + result.fatigueGained.mental);
      
      const updatedCharacter = await db.character.update({
        where: { id: characterId },
        data: {
          currentQi: newQi,
          fatigue: newPhysicalFatigue,
          mentalFatigue: newMentalFatigue,
          accumulatedQi: result.coreWasFilled 
            ? character.accumulatedQi + character.coreCapacity 
            : character.accumulatedQi,
        },
      });
      
      // Increase technique mastery
      let masteryGain = 0;
      if (cultivationTechnique) {
        masteryGain = Math.round((actualDurationMinutes / 30) * 10) / 10;
        const currentMastery = cultivationTechnique.mastery || 0;
        const newMastery = Math.min(100, currentMastery + masteryGain);
        
        console.log(`[Meditation] Updating mastery: ${currentMastery}% -> ${newMastery}% (+${masteryGain}%) for technique ${cultivationTechnique.techniqueId}`);
        
        await db.characterTechnique.update({
          where: { id: cultivationTechnique.id },
          data: { mastery: newMastery },
        });
      } else {
        console.log(`[Meditation] No cultivation technique assigned to slot 0. Mastery not updated.`);
      }
      
      // Generate message
      const qiPercent = getCoreFillPercent(updatedCharacter.currentQi, updatedCharacter.coreCapacity);
      message = `🧘 Медитация завершена!\n\n`;
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
          const newMastery = Math.min(100, (cultivationTechnique.mastery || 0) + masteryGain);
          message += `\n   └─ Мастерство: ${cultivationTechnique.mastery || 0}% → ${newMastery}% (+${masteryGain}%)`;
        }
      }
      
      message += `\n\n🌊 Текущая Ци: ${updatedCharacter.currentQi}/${updatedCharacter.coreCapacity} (${qiPercent}%)`;
      message += `\n💚 Физ. усталость: ${updatedCharacter.fatigue.toFixed(0)}%`;
      message += `\n💜 Мент. усталость: ${updatedCharacter.mentalFatigue.toFixed(0)}% (+${result.fatigueGained.mental.toFixed(1)}% от концентрации)`;
      
      if (result.coreWasFilled) {
        message += `\n\n⚡ Ядро заполнено! Накопленная Ци увеличена.`;
      }
      
      if (timeResult.dayChanged) {
        message += `\n\n🌅 Наступил новый день!`;
      }
      
      return NextResponse.json({
        success: true,
        message,
        meditationType: 'accumulation',
        result: {
          qiGained: result.qiGained,
          duration: result.duration,
          coreWasFilled: result.coreWasFilled,
          breakdown: result.breakdown,
        },
        techniqueUsed: techniqueData ? {
          name: techniqueData.name,
          qiAbsorptionBonus: Math.round(qiAbsorptionBonus),
          unnoticeabilityBonus: Math.round(unnoticeabilityBonus),
        } : null,
        character: {
          id: updatedCharacter.id,
          currentQi: updatedCharacter.currentQi,
          coreCapacity: updatedCharacter.coreCapacity,
          fatigue: updatedCharacter.fatigue,
          mentalFatigue: updatedCharacter.mentalFatigue,
          accumulatedQi: updatedCharacter.accumulatedQi,
        },
        worldTime: formatWorldTimeForResponse(timeResult.newTime),
        timeAdvanced: {
          ticks: timeResult.ticksAdvanced,
          dayChanged: timeResult.dayChanged,
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
