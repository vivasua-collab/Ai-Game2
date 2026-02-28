/**
 * Movement API Endpoint
 * 
 * Handles player movement with time advancement.
 * Each tile moved = 1 tick (1 minute) of game time.
 * 
 * Использует ЕДИНЫЙ сервис обработки тиков времени (time-tick.service.ts)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { quickProcessQiTick } from '@/services/time-tick.service';
import { formatWorldTimeForResponse } from '@/lib/game/time-db';
import { ACTION_TICK_COSTS } from '@/lib/game/constants';

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
            cultivationLevel: true,
            conductivityMeditations: true,
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

    // === ИСПОЛЬЗУЕМ ЕДИНЫЙ СЕРВИС ОБРАБОТКИ ТИКОВ ===
    const tickResult = await quickProcessQiTick(character.id, sessionId, totalTicks);

    if (!tickResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to process time tick' },
        { status: 500 }
      );
    }

    // Get updated world time
    const updatedSession = await db.gameSession.findUnique({
      where: { id: sessionId },
      select: { worldYear: true, worldMonth: true, worldDay: true, worldHour: true, worldMinute: true },
    });

    return NextResponse.json({
      success: true,
      timeAdvanced: true,
      ticksAdvanced: totalTicks,
      worldTime: updatedSession ? formatWorldTimeForResponse({
        year: updatedSession.worldYear,
        month: updatedSession.worldMonth,
        day: updatedSession.worldDay,
        hour: updatedSession.worldHour,
        minute: updatedSession.worldMinute,
        totalMinutes: updatedSession.worldHour * 60 + updatedSession.worldMinute,
      }) : null,
      dayChanged: tickResult.dayChanged,
      qiEffects: {
        passiveGain: tickResult.qiEffects.passiveGain,
        dissipation: tickResult.qiEffects.dissipation,
        finalQi: tickResult.qiEffects.finalQi,
      },
      conductivityInfo: tickResult.conductivityInfo,
    });

  } catch (error) {
    console.error('Move API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
