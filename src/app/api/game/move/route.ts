/**
 * Movement API Endpoint
 * 
 * Handles player movement with time advancement.
 * Each tile moved = 1 tick (1 minute) of game time.
 * Includes passive Qi generation from core.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { advanceWorldTime, formatWorldTimeForResponse } from '@/lib/game/time-db';
import { ACTION_TICK_COSTS, QI_CONSTANTS } from '@/lib/game/constants';
import { calculateCoreGenerationRate, calculatePassiveQiGain } from '@/lib/game/qi-shared';

interface MoveRequest {
  sessionId: string;
  tilesMoved: number;  // Number of tiles moved
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MoveRequest;
    const { sessionId, tilesMoved } = body;

    // Validate
    if (!sessionId || typeof tilesMoved !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId or tilesMoved' },
        { status: 400 }
      );
    }

    // Get session with character
    const session = await db.gameSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        character: {
          select: {
            id: true,
            coreCapacity: true,
            currentQi: true,
          },
        },
      },
    });

    if (!session || !session.character) {
      return NextResponse.json(
        { success: false, error: 'Session or character not found' },
        { status: 404 }
      );
    }

    const character = session.character;

    // Calculate ticks (1 tile = 1 tick per ACTION_TICK_COSTS.move_tile)
    const ticksPerTile = ACTION_TICK_COSTS.move_tile || 1;
    const totalTicks = Math.floor(tilesMoved * ticksPerTile);

    // Only advance time if there's actual movement
    if (totalTicks <= 0) {
      return NextResponse.json({
        success: true,
        timeAdvanced: false,
        message: 'No movement detected',
      });
    }

    // Advance world time
    const timeResult = await advanceWorldTime(sessionId, totalTicks);

    // Calculate passive Qi gain during movement
    const durationSeconds = totalTicks * 60; // ticks to seconds
    const coreGenerationRate = calculateCoreGenerationRate(character.coreCapacity);
    const passiveQiGain = calculatePassiveQiGain(
      character.currentQi,
      character.coreCapacity,
      coreGenerationRate,
      durationSeconds
    );

    // Update character Qi if there's passive gain
    if (passiveQiGain > 0) {
      const newQi = Math.min(
        character.coreCapacity * QI_CONSTANTS.PASSIVE_QI_CAP, // Cap at 90%
        character.currentQi + passiveQiGain
      );

      await db.character.update({
        where: { id: character.id },
        data: { currentQi: Math.floor(newQi) },
      });
    }

    return NextResponse.json({
      success: true,
      timeAdvanced: true,
      ticksAdvanced: totalTicks,
      worldTime: formatWorldTimeForResponse(timeResult.newTime),
      dayChanged: timeResult.dayChanged,
      passiveQiGain,
    });

  } catch (error) {
    console.error('Move API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
