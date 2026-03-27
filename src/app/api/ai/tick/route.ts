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
 * ИЗМЕНЕНО (Фаза 5): Использует TruthSystem вместо NPCWorldManager
 *
 * @see docs/ARCHITECTURE_cloud.md
 * @see src/lib/game/ai/server/npc-ai-manager.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNPCAIManager } from '@/lib/game/ai/server';
import { TruthSystem } from '@/lib/game/truth-system';

// ==================== КОНСТАНТЫ ====================

const ACTIVATION_RADIUS = 500; // Радиус активации NPC (увеличен для покрытия)
const MAX_DISTANCE = 800; // Макс. дистанция для деактивации

// ==================== POST ====================

/**
 * POST /api/ai/tick
 *
 * Выполнить AI tick для указанной сессии.
 *
 * Body:
 * - sessionId: string (обязательно) - ID сессии
 * - playerX?: number - позиция игрока X
 * - playerY?: number - позиция игрока Y
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
    const { sessionId, playerX, playerY } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const truthSystem = TruthSystem.getInstance();
    const npcAIManager = getNPCAIManager();

    // Проверяем/загружаем сессию
    let session = truthSystem.getSessionState(sessionId);
    if (!session) {
      const result = await truthSystem.loadSession(sessionId);
      if (!result.success) {
        return NextResponse.json(
          { error: 'Session not found in database' },
          { status: 404 }
        );
      }
      session = truthSystem.getSessionState(sessionId);
    }

    const targetLocationId = session?.currentLocation?.id;

    console.log(`[API:ai/tick] sessionId=${sessionId}, locationId=${targetLocationId}, playerPos=(${playerX}, ${playerY})`);

    // === АКТИВАЦИЯ NPC ВОКРУГ ИГРОКА ===
    if (targetLocationId && playerX !== undefined && playerY !== undefined) {
      const activatedNPCs = truthSystem.activateNearbyNPCs(
        sessionId,
        playerX,
        playerY,
        ACTIVATION_RADIUS,
        targetLocationId
      );

      console.log(`[API:ai/tick] Activated ${activatedNPCs.length} NPCs near player`);
    }

    // === ВЫПОЛНЯЕМ AI TICK ===
    // ИСПРАВЛЕНО: Передаём позицию игрока в AI manager
    await npcAIManager.updateAllNPCs(sessionId, playerX !== undefined && playerY !== undefined ? { x: playerX, y: playerY } : undefined);

    // === ДЕАКТИВАЦИЯ ДАЛЁКИХ NPC ===
    if (targetLocationId && playerX !== undefined && playerY !== undefined) {
      const deactivatedCount = truthSystem.deactivateFarNPCs(
        sessionId,
        playerX,
        playerY,
        MAX_DISTANCE,
        targetLocationId
      );

      if (deactivatedCount > 0) {
        console.log(`[API:ai/tick] Deactivated ${deactivatedCount} far NPCs`);
      }
    }

    // Получаем статистику
    const stats = truthSystem.getNPCStats(sessionId);
    const aiStats = npcAIManager.getStats(sessionId);
    const tickTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processedNPCs: stats.active,
      tickTime,
      stats: {
        totalNPCs: stats.total,
        activeNPCs: stats.active,
        inactiveNPCs: stats.inactive,
        totalUpdates: aiStats.totalUpdates,
        avgUpdateTime: aiStats.avgUpdateTime,
      },
      locations: stats.byLocation,
    });
  } catch (error) {
    console.error('[API:ai/tick] Error:', error);
    return NextResponse.json(
      { error: 'Failed to execute AI tick' },
      { status: 500 }
    );
  }
}

// ==================== GET ====================

/**
 * GET /api/ai/tick
 *
 * Получить статистику AI без выполнения тика.
 *
 * Query params:
 * - sessionId: string (обязательно) - ID сессии
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

    const truthSystem = TruthSystem.getInstance();
    const npcAIManager = getNPCAIManager();

    // Проверяем, загружена ли сессия
    const session = truthSystem.getSessionState(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not loaded. Call POST first.' },
        { status: 404 }
      );
    }

    const stats = truthSystem.getNPCStats(sessionId);
    const aiStats = npcAIManager.getStats(sessionId);

    return NextResponse.json({
      success: true,
      stats: {
        totalNPCs: stats.total,
        activeNPCs: stats.active,
        inactiveNPCs: stats.inactive,
        totalUpdates: aiStats.totalUpdates,
        avgUpdateTime: aiStats.avgUpdateTime,
      },
      byLocation: stats.byLocation,
    });
  } catch (error) {
    console.error('[API:ai/tick] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI stats' },
      { status: 500 }
    );
  }
}
