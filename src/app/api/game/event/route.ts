/**
 * ============================================================================
 * GAME EVENT API - Эндпоинт Event Bus
 * ============================================================================
 * 
 * Единая точка входа для всех игровых событий.
 * 
 * Engine отправляет события через HTTP POST, Event Bus обрабатывает
 * и возвращает результат с визуальными командами.
 * 
 * POST /api/game/event
 * 
 * Версия: 2.0.0 (упрощённая архитектура)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processEvent } from '@/lib/game/event-bus/processor';
import { validateEvent } from '@/lib/game/event-bus/validator';
import { logEventReceived, logEventResult } from '@/lib/game/event-bus/logger';
import { TruthSystem } from '@/lib/game/truth-system';
import type { GameEvent } from '@/lib/game/events/game-events';
import type { EventResult } from '@/lib/game/event-bus/types';

// ==================== POST HANDLER ====================

export async function POST(request: NextRequest): Promise<NextResponse<EventResult>> {
  const startTime = Date.now();

  try {
    // Парсим тело запроса
    const body = await request.json();

    // Быстрая валидация структуры
    const validation = validateEvent(body);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        eventId: (body as { id?: string }).id || 'unknown',
        error: validation.error,
        commands: [],
      }, { status: 400 });
    }

    const event = body as GameEvent;

    // Get TruthSystem instance
    const truthSystem = TruthSystem.getInstance();

    // Проверяем, загружена ли сессия
    let session = truthSystem.getSessionState(event.sessionId);
    
    if (!session) {
      // Пробуем загрузить
      const loadResult = await truthSystem.loadSession(event.sessionId);
      
      if (!loadResult.success) {
        return NextResponse.json({
          success: false,
          eventId: event.id,
          error: 'Session not found. Start a game first.',
          commands: [],
        }, { status: 404 });
      }
      
      session = loadResult.data;
    }

    // Проверяем, что персонаж принадлежит сессии
    if (session!.characterId !== event.characterId) {
      return NextResponse.json({
        success: false,
        eventId: event.id,
        error: 'Character does not belong to session',
        commands: [],
      }, { status: 403 });
    }

    // Обрабатываем через Event Bus
    const result = await processEvent(event);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      ...result,
      metadata: {
        ...result.metadata,
        processingTimeMs: duration,
      },
    });

  } catch (error) {
    console.error('[GameEventAPI] Error:', error);
    
    return NextResponse.json({
      success: false,
      eventId: 'unknown',
      error: error instanceof Error ? error.message : 'Internal server error',
      commands: [],
    }, { status: 500 });
  }
}

// ==================== GET HANDLER (Status) ====================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // Get TruthSystem instance
  const truthSystem = TruthSystem.getInstance();

  switch (action) {
    case 'stats': {
      const { getStats } = await import('@/lib/game/event-bus/logger');
      return NextResponse.json({
        status: 'ok',
        stats: getStats(),
      });
    }

    case 'types': {
      const { getSupportedEventTypes } = await import('@/lib/game/event-bus/processor');
      return NextResponse.json({
        status: 'ok',
        supportedTypes: getSupportedEventTypes(),
      });
    }

    case 'session': {
      const sessionId = searchParams.get('sessionId');
      if (!sessionId) {
        return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
      }

      const session = truthSystem.getSessionState(sessionId);
      return NextResponse.json({
        loaded: !!session,
        sessionId,
        stats: session ? {
          characterId: session.characterId,
          isDirty: session.isDirty,
          lastSavedAt: session.lastSavedAt,
        } : null,
      });
    }

    default: {
      // Общая статистика
      const stats = truthSystem.getStats();
      
      return NextResponse.json({
        status: 'ok',
        timestamp: Date.now(),
        sessions: stats,
        message: 'Event Bus API is running. Use POST to send events.',
      });
    }
  }
}
