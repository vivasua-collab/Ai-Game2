/**
 * ============================================================================
 * API: AI TICK - Запуск AI tick loop
 * ============================================================================
 *
 * Запускает обновление AI для всех NPC.
 *
 * В HTTP-only архитектуре tick вызывается:
 * 1. Автоматически при запросе состояния игры
 * 2. По таймеру на клиенте (опционально)
 * 3. Явно через этот endpoint
 *
 * 1 TICK = 1 СЕКУНДА реального времени
 *
 * @see docs/ARCHITECTURE_cloud.md
 * @see src/lib/game/ai/server/npc-ai-manager.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNPCAIManager } from '@/lib/game/ai/server';
import { getTruthSystem } from '@/lib/game/truth-system';
import { getNPCWorldManager } from '@/lib/game/npc-world-manager';

/**
 * POST /api/ai/tick
 *
 * Выполнить AI tick для указанной сессии.
 *
 * Body:
 * - sessionId: string (обязательно) - ID сессии
 * - deltaMs?: number - время с последнего тика (по умолчанию 1000мс)
 *
 * Response:
 * - success: boolean
 * - processedNPCs: number - количество обработанных NPC
 * - tickTime: number - время выполнения тика в мс
 * - stats: AIStats - статистика AI
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { sessionId, deltaMs = 1000 } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Получаем менеджеры
    const npcAIManager = getNPCAIManager();
    const truthSystem = getTruthSystem();
    const npcWorldManager = getNPCWorldManager();

    // Проверяем сессию
    const session = truthSystem.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Обновляем время мира
    npcWorldManager.incrementTick();

    // Запускаем batch режим для событий
    const broadcastManager = npcAIManager['broadcastManager'];
    broadcastManager.startBatch(sessionId);

    try {
      // Выполняем AI tick
      await npcAIManager.updateAllNPCs();
    } finally {
      // Завершаем batch и отправляем события
      broadcastManager.endBatch();
    }

    // Получаем статистику
    const stats = npcAIManager.getStats();
    const tickTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processedNPCs: stats.activeNPCs,
      tickTime,
      tick: npcWorldManager.getWorldState().tickCount,
      stats: {
        totalNPCs: stats.totalNPCs,
        activeNPCs: stats.activeNPCs,
        totalUpdates: stats.totalUpdates,
        avgUpdateTime: stats.avgUpdateTime,
      },
    });
  } catch (error) {
    console.error('[API:ai/tick] Error:', error);
    return NextResponse.json(
      { error: 'Failed to execute AI tick' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/tick
 *
 * Получить статистику AI без выполнения тика.
 */
export async function GET(request: NextRequest) {
  try {
    const npcAIManager = getNPCAIManager();
    const npcWorldManager = getNPCWorldManager();

    const stats = npcAIManager.getStats();
    const worldState = npcWorldManager.getWorldState();

    return NextResponse.json({
      success: true,
      stats: {
        totalNPCs: stats.totalNPCs,
        activeNPCs: stats.activeNPCs,
        totalUpdates: stats.totalUpdates,
        avgUpdateTime: stats.avgUpdateTime,
      },
      world: {
        tick: worldState.tickCount,
        lastUpdate: worldState.lastUpdateTime,
        totalPlayers: worldState.players.size,
        totalLocations: worldState.locations.size,
      },
    });
  } catch (error) {
    console.error('[API:ai/tick] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI stats' },
      { status: 500 }
    );
  }
}
