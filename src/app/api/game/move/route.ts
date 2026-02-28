/**
 * Movement API Endpoint
 * 
 * Handles player movement with time advancement.
 * Each tile moved = 1 tick (1 minute) of game time.
 * 
 * ИНТЕГРАЦИЯ TRUTHSYSTEM:
 * - Проверяет наличие сессии в памяти (ПАМЯТЬ ПЕРВИЧНА!)
 * - Использует quickProcessQiTick для эффеков времени
 * - Продвигает время через TruthSystem.advanceTime()
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { quickProcessQiTick } from '@/services/time-tick.service';
import { formatWorldTimeForResponse } from '@/lib/game/time-db';
import { ACTION_TICK_COSTS } from '@/lib/game/constants';
import { TruthSystem } from '@/lib/game/truth-system';

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

    // === ПРОВЕРКА TRUTHSYSTEM (ПАМЯТЬ ПЕРВИЧНА!) ===
    // TruthSystem is already a singleton instance
    const memoryState = TruthSystem.getSessionState(sessionId);
    
    let source: 'memory' | 'database' = 'database';
    let characterId: string;
    
    if (memoryState) {
      source = 'memory';
      characterId = memoryState.characterId;
    } else {
      // Загружаем из БД
      const session = await db.gameSession.findUnique({
        where: { id: sessionId },
        select: { characterId: true },
      });
      
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Session not found' },
          { status: 404 }
        );
      }
      
      characterId = session.characterId;
      
      // Загружаем сессию в память для будущих запросов
      await TruthSystem.loadSession(sessionId);
    }

    // Calculate ticks (1 tile = 1 tick per ACTION_TICK_COSTS.move_tile)
    const ticksPerTile = ACTION_TICK_COSTS.move_tile || 1;
    const totalTicks = Math.floor(tilesMoved * ticksPerTile);

    // Only advance time if there's actual movement
    if (totalTicks <= 0) {
      return NextResponse.json({
        success: true,
        source,
        timeAdvanced: false,
        message: 'No movement detected',
      });
    }

    // === ИСПОЛЬЗУЕМ ЕДИНЫЙ СЕРВИС ОБРАБОТКИ ТИКОВ ===
    const tickResult = await quickProcessQiTick(characterId, sessionId, totalTicks);

    if (!tickResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to process time tick' },
        { status: 500 }
      );
    }

    // === СИНХРОНИЗАЦИЯ С TRUTHSYSTEM ===
    // Продвигаем время в памяти
    TruthSystem.advanceTime(sessionId, totalTicks);
    
    // Обновляем Ци в памяти если было изменение
    if (tickResult.qiEffects.passiveGain > 0 || tickResult.qiEffects.dissipation > 0) {
      TruthSystem.updateCharacter(sessionId, {
        currentQi: tickResult.qiEffects.finalQi,
      });
    }

    // Получаем время из памяти (ПЕРВИЧНЫЙ ИСТОЧНИК)
    const worldTimeFromMemory = TruthSystem.getWorldTime(sessionId);

    return NextResponse.json({
      success: true,
      source, // Указываем источник данных
      timeAdvanced: true,
      ticksAdvanced: totalTicks,
      worldTime: worldTimeFromMemory ? {
        year: worldTimeFromMemory.year,
        month: worldTimeFromMemory.month,
        day: worldTimeFromMemory.day,
        hour: worldTimeFromMemory.hour,
        minute: worldTimeFromMemory.minute,
        formatted: worldTimeFromMemory.formatted,
        season: worldTimeFromMemory.season,
        daysSinceStart: worldTimeFromMemory.daysSinceStart,
      } : null,
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
