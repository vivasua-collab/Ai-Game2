/**
 * ============================================================================
 * API: AI PLAYER POSITION - Обновление позиции игрока для AI
 * ============================================================================
 *
 * Клиент отправляет позицию игрока на сервер для AI расчётов.
 *
 * @see docs/ARCHITECTURE_cloud.md
 * @see src/lib/game/ai/server/npc-ai-manager.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNPCWorldManager } from '@/lib/game/npc-world-manager';
import { getTruthSystem } from '@/lib/game/truth-system';

/**
 * POST /api/ai/player-position
 *
 * Обновить позицию игрока в WorldState для AI расчётов.
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

    // Получаем менеджеры
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

    // Получаем characterId из сессии
    const characterId = session.character?.id;
    if (!characterId) {
      return NextResponse.json(
        { error: 'Character not found in session' },
        { status: 404 }
      );
    }

    // Обновляем позицию игрока в WorldState
    const worldState = npcWorldManager.getWorldState();
    const player = worldState.players.get(characterId);

    if (player) {
      player.x = x;
      player.y = y;
      player.lastUpdate = Date.now();
    } else {
      // Добавляем игрока если его нет
      worldState.players.set(characterId, {
        id: characterId,
        x,
        y,
        lastUpdate: Date.now(),
      });
    }

    return NextResponse.json({
      success: true,
      playerId: characterId,
      x,
      y,
    });
  } catch (error) {
    console.error('[API:ai/player-position] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update player position' },
      { status: 500 }
    );
  }
}
