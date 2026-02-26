/**
 * Meditation API Endpoint
 * 
 * Direct meditation without LLM routing.
 * Synchronized with global time system (ticks).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { performMeditation } from '@/lib/game/qi-system';
import { getCoreFillPercent } from '@/lib/game/qi-shared';
import { QI_CONSTANTS, TIME_CONSTANTS } from '@/lib/game/constants';
import { advanceWorldTime, formatWorldTimeForResponse } from '@/lib/game/time-db';
import type { LocationData } from '@/types/game-shared';

interface MeditationRequest {
  characterId: string;
  durationMinutes: number;  // In ticks (1 tick = 1 minute)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MeditationRequest;
    const { characterId, durationMinutes } = body;
    
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
    const character = await db.character.findUnique({
      where: { id: characterId },
      include: {
        currentLocation: true,
        sessions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!character) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      );
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
    
    // Perform meditation calculation
    const result = performMeditation(
      character,
      location,
      durationMinutes,
      'accumulation'
    );
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.interruptionReason,
        result,
      });
    }
    
    // Advance world time by meditation duration (in ticks)
    const timeResult = await advanceWorldTime(session.id, durationMinutes);
    
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
    
    // Generate meditation message
    const qiPercent = getCoreFillPercent(updatedCharacter.currentQi, updatedCharacter.coreCapacity);
    let message = `🧘 Медитация завершена!\n\n`;
    message += `⏱️ Время: ${result.duration} минут (${Math.floor(result.duration / 60)} ч ${result.duration % 60} мин)\n`;
    message += `💫 Прирост Ци: +${result.qiGained}`;
    if (result.breakdown) {
      message += `\n   ├─ Ядро: +${result.breakdown.coreGeneration}`;
      message += `\n   └─ Среда: +${result.breakdown.environmentalAbsorption}`;
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
