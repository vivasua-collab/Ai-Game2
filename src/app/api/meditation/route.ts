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
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { performMeditation } from '@/lib/game/qi-system';
import { getCoreFillPercent, calculateQiRates } from '@/lib/game/qi-shared';
import { QI_CONSTANTS, TIME_CONSTANTS } from '@/lib/game/constants';
import { advanceWorldTime, formatWorldTimeForResponse } from '@/lib/game/time-db';
import { 
  checkMeditationInterruption
} from '@/lib/game/meditation-interruption';
import type { LocationData } from '@/types/game-shared';
import type { Character, WorldTime } from '@/types/game';

interface MeditationRequest {
  characterId: string;
  durationMinutes: number;  // In ticks (1 tick = 1 minute)
  formationId?: string;     // Optional: active formation
  formationQuality?: number; // Optional: formation quality (1-5)
  techniqueId?: string;     // Optional: specific technique to use (overrides slot)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MeditationRequest;
    const { characterId, durationMinutes, formationId, formationQuality = 1, techniqueId } = body;
    
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
    
    // Get character with location and session
    // If techniqueId is provided, fetch that technique; otherwise use cultivation slot
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
                techniqueId: techniqueId,  // Specific technique requested
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
    
    // Get cultivation technique (either from specific ID or from slot)
    const cultivationTechnique = character.techniques[0];
    const techniqueData = cultivationTechnique?.technique;
    
    // Calculate technique bonuses
    let qiAbsorptionBonus = 0; // Percent bonus
    let unnoticeabilityBonus = 0; // Percent reduction to interruption chance
    
    if (techniqueData) {
      // Parse effects from technique
      const effects = techniqueData.effects ? JSON.parse(techniqueData.effects as string) : {};
      
      // Qi absorption bonus (qiRegenPercent or qiRegen as %)
      if (effects.qiRegenPercent) {
        qiAbsorptionBonus = effects.qiRegenPercent;
      } else if (effects.qiRegen) {
        // Legacy: interpret qiRegen as percentage for cultivation techniques
        qiAbsorptionBonus = effects.qiRegen;
      }
      
      // Unnoticeability bonus (reduces interruption chance)
      if (effects.unnoticeability) {
        unnoticeabilityBonus = effects.unnoticeability;
      }
      
      // Mastery increases effectiveness
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
    
    // Build location data for calculations
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
      // Default location data if no location assigned
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
    
    // === CHECK FOR INTERRUPTIONS (only for meditations >= 60 minutes) ===
    let interruptionResult = null;
    let actualDurationMinutes = durationMinutes;
    
    if (durationMinutes >= 60) {
      // Prepare character data for interruption check
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
      
      // Apply unnoticeability bonus from cultivation technique
      // Positive value = less noticeable, Negative value = more noticeable
      if (interruptionResult && unnoticeabilityBonus !== 0) {
        // unnoticeabilityBonus > 0 = снижает шанс прерывания
        // unnoticeabilityBonus < 0 = повышает шанс прерывания
        interruptionResult.finalChance *= (1 - unnoticeabilityBonus / 100);
        // Clamp to 0-100%
        interruptionResult.finalChance = Math.max(0, Math.min(100, interruptionResult.finalChance));
      }
      
      if (interruptionResult.interrupted && interruptionResult.event) {
        // Meditation was interrupted!
        actualDurationMinutes = interruptionResult.checkHour * 60;
      }
    }
    
    // Perform meditation calculation with technique bonuses
    const baseResult = performMeditation(
      character,
      location,
      actualDurationMinutes,
      'accumulation'
    );
    
    // Apply qi absorption bonus from cultivation technique
    let qiGainedWithBonus = baseResult.qiGained;
    if (qiAbsorptionBonus > 0 && baseResult.success) {
      qiGainedWithBonus = Math.floor(baseResult.qiGained * (1 + qiAbsorptionBonus / 100));
    }
    
    const result = {
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
    
    // Handle interruption case
    if (interruptionResult?.interrupted && interruptionResult.event) {
      const event = interruptionResult.event;
      const interruptedMessage = `⚠️ Медитация прервана на ${interruptionResult.checkHour}-м часу!\n\n` +
        `📜 Событие: ${event.description}\n` +
        `⚡ Уровень опасности: ${event.dangerLevel}/10\n\n` +
        `${event.canIgnore ? '💡 Можно проигнорировать и продолжить.' : ''}\n` +
        `${event.canHide ? '💡 Можно попытаться скрыться.' : ''}`;
      
      // Update character with partial gains
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
      
      // Advance time to point of interruption
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
    
    // Advance world time by meditation duration (in ticks)
    const timeResult = await advanceWorldTime(session.id, actualDurationMinutes);
    
    // Update character in database
    const newQi = Math.min(
      character.coreCapacity,
      character.currentQi + result.qiGained
    );
    
    // Медитация: физическая усталость НЕ меняется, ментальная - добавляется
    const newPhysicalFatigue = character.fatigue; // Не меняется
    const newMentalFatigue = Math.min(100, character.mentalFatigue + result.fatigueGained.mental); // Концентрация утомляет
    
    const updatedCharacter = await db.character.update({
      where: { id: characterId },
      data: {
        currentQi: newQi,
        fatigue: newPhysicalFatigue,
        mentalFatigue: newMentalFatigue,
        // If core was filled, add to accumulated Qi
        accumulatedQi: result.coreWasFilled 
          ? character.accumulatedQi + character.coreCapacity 
          : character.accumulatedQi,
      },
    });
    
    // === INCREASE TECHNIQUE MASTERY ===
    let masteryGain = 0;
    if (cultivationTechnique) {
      // Mastery gain: 0.1% per 30 minutes of meditation
      // More gain for longer meditations
      masteryGain = Math.round((actualDurationMinutes / 30) * 10) / 10; // 0.1 per 30 min
      
      // Cap mastery at 100%
      const newMastery = Math.min(100, (cultivationTechnique.mastery || 0) + masteryGain);
      
      await db.characterTechnique.update({
        where: { id: cultivationTechnique.id },
        data: { mastery: newMastery },
      });
      
      console.log(`[Meditation] Technique mastery: ${cultivationTechnique.mastery}% -> ${newMastery}% (+${masteryGain}%)`);
    }
    
    // Generate meditation message
    const qiPercent = getCoreFillPercent(updatedCharacter.currentQi, updatedCharacter.coreCapacity);
    let message = `🧘 Медитация завершена!\n\n`;
    message += `⏱️ Время: ${result.duration} минут (${Math.floor(result.duration / 60)} ч ${result.duration % 60} мин)\n`;
    message += `💫 Прирост Ци: +${result.qiGained}`;
    if (result.breakdown) {
      message += `\n   ├─ Ядро: +${result.breakdown.coreGeneration}`;
      message += `\n   └─ Среда: +${result.breakdown.environmentalAbsorption}`;
    }
    
    // Show technique bonuses if used
    if (techniqueData) {
      message += `\n\n📜 Техника: ${techniqueData.name}`;
      if (qiAbsorptionBonus !== 0) {
        message += `\n   ├─ Бонус поглощения: +${Math.round(qiAbsorptionBonus)}%`;
      }
      if (unnoticeabilityBonus !== 0) {
        // Positive = less noticeable (good), Negative = more noticeable (bad)
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
      // Updated world time
      worldTime: formatWorldTimeForResponse(timeResult.newTime),
      timeAdvanced: {
        ticks: timeResult.ticksAdvanced,
        dayChanged: timeResult.dayChanged,
      },
    });
    
  } catch (error) {
    console.error('Meditation API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
