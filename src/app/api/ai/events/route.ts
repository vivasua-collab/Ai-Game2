/**
 * ============================================================================
 * API: AI EVENTS - HTTP Polling для AI событий
 * ============================================================================
 *
 * Клиент polling-ом получает события NPC AI:
 * - npc:action - действия NPC (move, attack, flee, etc.)
 * - npc:spawn - появление нового NPC
 * - npc:despawn - исчезновение NPC
 * - npc:update - обновление состояния NPC
 * - combat:attack - событие атаки
 * - combat:hit - событие попадания
 *
 * @see docs/ARCHITECTURE_cloud.md
 * @see src/lib/game/ai/server/broadcast-manager.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBroadcastManager } from '@/lib/game/ai/server';
import { getTruthSystem } from '@/lib/game/truth-system';

/**
 * GET /api/ai/events
 *
 * Получить накопленные AI события для сессии.
 * После чтения события удаляются из очереди.
 *
 * Query params:
 * - sessionId: string (обязательно) - ID сессии игрока
 *
 * Response:
 * - events: BroadcastEvent[] - массив событий
 * - tick: number - текущий тик мира
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Получаем события из BroadcastManager
    const broadcastManager = getBroadcastManager();
    const events = broadcastManager.pollEvents(sessionId);

    // Получаем текущий тик
    const truthSystem = getTruthSystem();
    const session = truthSystem.getSession(sessionId);
    const tick = session?.worldTime?.tick ?? 0;

    return NextResponse.json({
      success: true,
      events,
      tick,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[API:ai/events] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI events' },
      { status: 500 }
    );
  }
}
