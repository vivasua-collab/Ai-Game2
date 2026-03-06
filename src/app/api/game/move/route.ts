/**
 * Movement API Endpoint
 * 
 * Handles player movement with time advancement.
 * Each tile moved = 1 tick (1 minute) of game time.
 * 
 * ИНТЕГРАЦИЯ TRUTHSYSTEM:
 * - Проверяет наличие сессии в памяти (ПАМЯТЬ ПЕРВИЧНА!)
 * - Использует quickProcessQiTick для эффеков времени
 * - quickProcessQiTick уже обновляет TruthSystem!
 * 
 * @updated 2026-03-06 12:35 UTC
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { quickProcessQiTick } from '@/services/time-tick.service';
import { ACTION_TICK_COSTS } from '@/lib/game/constants';
import { TruthSystem } from '@/lib/game/truth-system';

interface MoveRequest {
  sessionId: string;
  tilesMoved: number;  // Number of tiles moved
}

// Максимальное количество тайлов за один запрос (anti-abuse)
const MAX_TILES_PER_MOVE = 1000;

/**
 * Строгая валидация запроса движения
 * Защита от NaN, Infinity, отрицательных и нецелых значений
 */
function validateMoveRequest(body: unknown): { valid: true; data: MoveRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  
  const { sessionId, tilesMoved } = body as Partial<MoveRequest>;
  
  // sessionId - обязательная строка
  if (typeof sessionId !== 'string' || sessionId.trim() === '') {
    return { valid: false, error: 'sessionId must be a non-empty string' };
  }
  
  // tilesMoved - число
  if (typeof tilesMoved !== 'number') {
    return { valid: false, error: 'tilesMoved must be a number' };
  }
  if (!Number.isFinite(tilesMoved)) {
    return { valid: false, error: 'tilesMoved must be a finite number (NaN/Infinity not allowed)' };
  }
  if (!Number.isInteger(tilesMoved)) {
    return { valid: false, error: 'tilesMoved must be an integer' };
  }
  if (tilesMoved < 0) {
    return { valid: false, error: 'tilesMoved must be non-negative' };
  }
  if (tilesMoved > MAX_TILES_PER_MOVE) {
    return { valid: false, error: `tilesMoved must not exceed ${MAX_TILES_PER_MOVE}` };
  }
  
  return { valid: true, data: { sessionId: sessionId.trim(), tilesMoved } };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Строгая валидация входных данных
    const validation = validateMoveRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }
    
    const { sessionId, tilesMoved } = validation.data;

    // === ПРОВЕРКА TRUTHSYSTEM (ПАМЯТЬ ПЕРВИЧНА!) ===
    const truthSystem = TruthSystem.getInstance();
    const memoryState = truthSystem.getSessionState(sessionId);
    
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
      await truthSystem.loadSession(sessionId);
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
    // ВАЖНО: quickProcessQiTick уже обновляет TruthSystem!
    // Не нужно дублировать вызовы advanceTime или updateCharacter
    const tickResult = await quickProcessQiTick(characterId, sessionId, totalTicks);

    if (!tickResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to process time tick' },
        { status: 500 }
      );
    }

    // Получаем время из памяти (ПЕРВИЧНЫЙ ИСТОЧНИК)
    const worldTimeFromMemory = truthSystem.getWorldTime(sessionId);
    
    // Получаем персонажа из памяти для возврата актуального accumulatedQi
    const characterFromMemory = truthSystem.getCharacter(sessionId);

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
      // Возвращаем accumulatedQi из памяти (чтобы клиент видел актуальное значение)
      character: characterFromMemory ? {
        currentQi: characterFromMemory.currentQi,
        accumulatedQi: characterFromMemory.accumulatedQi,
      } : null,
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
