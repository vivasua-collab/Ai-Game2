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
    // ВАЖНО: Используем npcWorldManager ИЗ npcAIManager, а не отдельный singleton!
    // В Next.js dev mode singleton НЕ работает между процессами
    const npcWorldManager = (npcAIManager as any).npcWorldManager;

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
    // ВАЖНО: SessionState.currentLocation.id, не character.currentLocationId!
    const targetLocationId = locationId || session.currentLocation?.id;
    const characterId = session.character?.id;

    console.log(`[API:ai/tick] sessionId=${sessionId}, targetLocationId=${targetLocationId}, characterId=${characterId}`);

    // Обновляем позицию игрока в WorldState
    // ВАЖНО: Используем npcWorldManager для корректного обновления location.playerIds!
    if (characterId && playerX !== undefined && playerY !== undefined) {
      const worldState = npcWorldManager.getWorldState();
      const existingPlayer = worldState.players.get(characterId);

      // === DEBUG: Проверяем состояние location.playerIds ===
      const location = worldState.locations.get(targetLocationId);
      console.log(`[API:ai/tick] Location "${targetLocationId}" exists: ${!!location}, playerIds before: ${location?.playerIds?.length || 0}`);

      if (existingPlayer) {
        // Обновляем позицию существующего игрока
        existingPlayer.x = playerX;
        existingPlayer.y = playerY;
        existingPlayer.lastUpdate = Date.now();
        console.log(`[API:ai/tick] Updated existing player ${characterId} position to (${playerX}, ${playerY})`);

        // Проверяем смену локации
        if (existingPlayer.locationId !== targetLocationId && targetLocationId) {
          // Удаляем из старой локации
          const oldLocation = worldState.locations.get(existingPlayer.locationId);
          if (oldLocation && oldLocation.playerIds) {
            oldLocation.playerIds = oldLocation.playerIds.filter(id => id !== characterId);
            console.log(`[API:ai/tick] Removed player from old location ${existingPlayer.locationId}`);
          }

          // Добавляем в новую локацию
          existingPlayer.locationId = targetLocationId;
          const newLocation = worldState.locations.get(targetLocationId);
          if (newLocation && newLocation.playerIds && !newLocation.playerIds.includes(characterId)) {
            newLocation.playerIds.push(characterId);
            console.log(`[API:ai/tick] Added player to new location ${targetLocationId}`);
          }
        }
      } else {
        // Создаём нового игрока через npcWorldManager
        npcWorldManager.addPlayer({
          id: characterId,
          sessionId: sessionId,
          locationId: targetLocationId || 'unknown',
          x: playerX,
          y: playerY,
          level: session.character?.cultivationLevel || 1,
          lastAttackTime: 0,
          threatLevel: 0,
        });
        console.log(`[API:ai/tick] Added NEW player ${characterId} to location ${targetLocationId}`);
      }

      // === DEBUG: Проверяем состояние после обновления ===
      const locationAfter = worldState.locations.get(targetLocationId);
      console.log(`[API:ai/tick] Location "${targetLocationId}" playerIds after: ${locationAfter?.playerIds?.length || 0}, players in Map: ${worldState.players.size}`);
    } else {
      console.log(`[API:ai/tick] WARNING: No player position provided! characterId=${characterId}, playerX=${playerX}, playerY=${playerY}`);
    }

    // === ЗАГРУЗКА NPC В WORLDMANAGER ===
    // Загружаем NPC для текущей локации если они ещё не в WorldManager
    console.log(`[API:ai/tick] BEFORE loadNPCs: worldState.npcs.size=${npcWorldManager.getWorldState().npcs.size}`);
    
    if (targetLocationId) {
      await loadNPCsToWorldManager(sessionId, targetLocationId, npcWorldManager);
    }
    
    console.log(`[API:ai/tick] AFTER loadNPCs: worldState.npcs.size=${npcWorldManager.getWorldState().npcs.size}`);

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
    // ВАЖНО: Используем npcWorldManager ИЗ npcAIManager
    const npcWorldManager = (npcAIManager as any).npcWorldManager;

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
 * 
 * ВАЖНО: В Next.js dev mode singleton НЕ работает между процессами!
 * Используем HTTP запрос к /api/temp-npc для получения NPC.
 */
async function loadNPCsToWorldManager(
  sessionId: string,
  locationId: string,
  npcWorldManager: ReturnType<typeof getNPCWorldManager>
): Promise<void> {
  const worldState = npcWorldManager.getWorldState();
  
  console.log(`[AI Tick] Loading NPCs for session=${sessionId}, location=${locationId}`);
  
  // 1. Пытаемся загрузить через singleton (может работать в том же процессе)
  let tempNPCs = sessionNPCManager.getLocationNPCs(sessionId, locationId);
  console.log(`[AI Tick] Singleton NPCs for locationId=${locationId}: ${tempNPCs.length}`);
  
  // 2. Если singleton пуст для конкретной локации - пробуем ВСЕ NPC сессии
  //    (locationId может отличаться между клиентом и БД!)
  if (tempNPCs.length === 0) {
    tempNPCs = sessionNPCManager.getAllSessionNPCs(sessionId);
    console.log(`[AI Tick] All session NPCs: ${tempNPCs.length}`);
  }
  
  // 3. Если всё ещё пуст - пробуем HTTP запрос (другой процесс)
  if (tempNPCs.length === 0) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      
      // Сначала пробуем по locationId
      let response = await fetch(`${baseUrl}/api/temp-npc?action=list&sessionId=${sessionId}&locationId=${locationId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.npcs && data.npcs.length > 0) {
          tempNPCs = data.npcs;
          console.log(`[AI Tick] HTTP loaded NPCs for location: ${tempNPCs.length}`);
        }
      }
      
      // Если всё ещё пуст - загружаем все NPC сессии
      if (tempNPCs.length === 0) {
        response = await fetch(`${baseUrl}/api/temp-npc?action=list&sessionId=${sessionId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.npcs) {
            tempNPCs = data.npcs;
            console.log(`[AI Tick] HTTP loaded ALL session NPCs: ${tempNPCs.length}`);
          }
        }
      }
    } catch (error) {
      console.warn('[AI Tick] HTTP request error:', error);
    }
  }
  
  console.log(`[AI Tick] Processing ${tempNPCs.length} temp NPCs...`);
  
  for (const tempNPC of tempNPCs) {
    // Проверяем, не загружен ли уже
    if (worldState.npcs.has(tempNPC.id)) {
      console.log(`[AI Tick] NPC ${tempNPC.id} already loaded, skipping`);
      continue;
    }
    
    // Конвертируем TempNPC в NPCState
    const npcState = npcWorldManager.addNPCFromTemp(tempNPC);
    console.log(`[AI Tick] Added NPC: ${tempNPC.name} (${tempNPC.id}) at (${tempNPC.position?.x}, ${tempNPC.position?.y})`);
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
      playerIds: [],
      activeEvents: [],
      lastActivityTime: Date.now(),
    });
  }
}
