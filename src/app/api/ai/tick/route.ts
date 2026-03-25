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
import { TruthSystem } from '@/lib/game/truth-system';
import { getNPCWorldManager } from '@/lib/game/npc-world-manager';
import { sessionNPCManager } from '@/lib/game/session-npc-manager';
import { db } from '@/lib/db';

/**
 * POST /api/ai/tick
 *
 * Выполнить AI tick для указанной сессии.
 *
 * Body:
 * - sessionId: string (обязательно) - ID сессии
 * - locationId?: string - ID локации (опционально, берётся из сессии)
 * - playerX?: number - позиция игрока X
 * - playerY?: number - позиция игрока Y
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
    const { sessionId, locationId, playerX, playerY, deltaMs = 1000 } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Получаем менеджеры
    const npcAIManager = getNPCAIManager();
    const truthSystem = TruthSystem.getInstance();
    const npcWorldManager = getNPCWorldManager();

    // Проверяем/загружаем сессию
    let session = truthSystem.getSessionState(sessionId);
    if (!session) {
      // Пытаемся загрузить сессию из БД
      const result = await truthSystem.loadSession(sessionId);
      if (!result.success) {
        return NextResponse.json(
          { error: 'Session not found in database' },
          { status: 404 }
        );
      }
      session = truthSystem.getSessionState(sessionId);
    }

    // Получаем locationId из сессии если не передан
    const targetLocationId = locationId || session.character?.currentLocationId;
    const characterId = session.character?.id;

    // Обновляем позицию игрока в WorldState
    if (characterId && playerX !== undefined && playerY !== undefined) {
      const worldState = npcWorldManager.getWorldState();
      const existingPlayer = worldState.players.get(characterId);
      
      if (existingPlayer) {
        existingPlayer.x = playerX;
        existingPlayer.y = playerY;
        existingPlayer.lastUpdate = Date.now();
      } else {
        worldState.players.set(characterId, {
          id: characterId,
          x: playerX,
          y: playerY,
          locationId: targetLocationId,
          lastUpdate: Date.now(),
        });
      }
    }

    // === ЗАГРУЗКА NPC В WORLDMANAGER ===
    // Загружаем NPC для текущей локации если они ещё не в WorldManager
    if (targetLocationId) {
      await loadNPCsToWorldManager(sessionId, targetLocationId, npcWorldManager);
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
        totalNPCs: worldState.npcs.size,
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

/**
 * Загрузить NPC в WorldManager для указанной локации
 */
async function loadNPCsToWorldManager(
  sessionId: string,
  locationId: string,
  npcWorldManager: ReturnType<typeof getNPCWorldManager>
): Promise<void> {
  const worldState = npcWorldManager.getWorldState();
  
  // 1. Загружаем TempNPC из sessionNPCManager
  const tempNPCs = sessionNPCManager.getLocationNPCs(sessionId, locationId);
  
  for (const tempNPC of tempNPCs) {
    // Проверяем, не загружен ли уже
    if (worldState.npcs.has(tempNPC.id)) continue;
    
    // Конвертируем TempNPC в NPCState
    const npcState = npcWorldManager.addNPCFromTemp(tempNPC);
  }
  
  // 2. Загружаем Preset NPC из БД
  const dbNpcs = await db.nPC.findMany({
    where: { sessionId, locationId },
  });
  
  for (const dbNpc of dbNpcs) {
    // Проверяем, не загружен ли уже
    if (worldState.npcs.has(dbNpc.id)) continue;
    
    // Добавляем из БД
    npcWorldManager.addNPC({
      id: dbNpc.id,
      name: dbNpc.name,
      speciesId: 'human',
      speciesType: 'humanoid',
      roleId: dbNpc.role || 'unknown',
      soulType: 'character',
      controller: 'ai',
      mind: 'mortal',
      level: dbNpc.cultivationLevel,
      subLevel: dbNpc.cultivationSubLevel,
      locationId: dbNpc.locationId || locationId,
      x: 400 + Math.random() * 200, // TODO: загружать из БД
      y: 300 + Math.random() * 200,
      facing: 0,
      health: dbNpc.health || 100,
      maxHealth: dbNpc.maxHealth || 100,
      qi: dbNpc.currentQi || 0,
      maxQi: dbNpc.coreCapacity || 100,
      disposition: 50,
      aggressionLevel: 0,
      fleeThreshold: 20,
      isActive: false,
      aiState: 'idle',
      currentAction: null,
      actionQueue: [],
      spinalState: {
        pendingSignals: [],
        activeReflexes: [],
        lastUpdate: Date.now(),
        configuration: {
          fleeThreshold: 20,
          aggressiveness: 0.5,
          cautionLevel: 0.5,
          socialBehavior: 'solitary',
        },
      },
      spinalPreset: 'basic',
      threatLevel: 0,
      targetId: null,
      lastActiveTime: 0,
      lastSeenPlayers: {},
      collisionRadius: 20,
      agroRadius: 150,
      perceptionRadius: 300,
      isDead: false,
      isUnconscious: false,
      canTalk: true,
      canTrade: false,
    });
  }
  
  // 3. Добавляем локацию если нет
  if (!worldState.locations.has(locationId)) {
    npcWorldManager.addLocation({
      id: locationId,
      name: 'Unknown Location',
      type: 'outdoor',
      bounds: { x: 0, y: 0, width: 1200, height: 800 },
      npcIds: [...tempNPCs.map(n => n.id), ...dbNpcs.map(n => n.id)],
    });
  }
}
