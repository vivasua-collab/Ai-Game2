/**
 * ============================================================================
 * API: AI PLAYER POSITION - Обновление позиции игрока для AI
 * ============================================================================
 *
 * Клиент отправляет позицию игрока на сервер для AI расчётов.
 *
 * ИЗМЕНЕНО (Фаза 5): Использует TruthSystem вместо NPCWorldManager
 *
 * @see docs/ARCHITECTURE_cloud.md
 * @see src/lib/game/ai/server/npc-ai-manager.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { TruthSystem } from '@/lib/game/truth-system';

// ==================== КОНСТАНТЫ ====================

const ACTIVATION_RADIUS = 300; // Радиус активации NPC
const MAX_DISTANCE = 500; // Макс. дистанция для деактивации

// ==================== POST ====================

/**
 * POST /api/ai/player-position
 *
 * Обновить позицию игрока и активировать/деактивировать NPC.
 *
 * Body:
 * - sessionId: string (обязательно)
 * - x: number
 * - y: number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, x, y } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const truthSystem = TruthSystem.getInstance();

    // Проверяем сессию
    const session = truthSystem.getSessionState(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const characterId = session.character?.id;
    const locationId = session.currentLocation?.id;

    if (!characterId) {
      return NextResponse.json(
        { error: 'Character not found in session' },
        { status: 404 }
      );
    }

    // Сохраняем позицию игрока в TruthSystem
    truthSystem.updatePlayerPosition(sessionId, x, y);

    // Активируем NPC вокруг новой позиции
    const activated = locationId
      ? truthSystem.activateNearbyNPCs(sessionId, x, y, ACTIVATION_RADIUS, locationId)
      : [];

    // Деактивируем далёких NPC
    const deactivated = locationId
      ? truthSystem.deactivateFarNPCs(sessionId, x, y, MAX_DISTANCE, locationId)
      : 0;

    return NextResponse.json({
      success: true,
      playerId: characterId,
      x,
      y,
      activated: activated.length,
      deactivated,
    });
  } catch (error) {
    console.error('[API:ai/player-position] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update player position' },
      { status: 500 }
    );
  }
}
