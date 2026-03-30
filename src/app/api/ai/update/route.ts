/**
 * AI Update API - Обновление AI для NPC
 * 
 * ИСПОЛЬЗУЕТ NPCAIManager для полноценного AI:
 * - Активация NPC при приближении игрока
 * - Генерация действий (chase, attack, patrol, flee)
 * - Отправка событий через BroadcastManager
 * 
 * @see src/lib/game/ai/server/npc-ai-manager.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { TruthSystem } from '@/lib/game/truth-system';
import { getNPCAIManager } from '@/lib/game/ai/server';

// Константы
const ACTIVATION_RADIUS = 500;
const DEACTIVATION_RADIUS = 800;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { sessionId, playerX, playerY, locationId } = body;
    
    console.log(`[AI Update] sessionId=${sessionId}, playerPos=(${playerX}, ${playerY}), locationId=${locationId}`);
    
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    
    const truthSystem = TruthSystem.getInstance();
    const npcAIManager = getNPCAIManager();
    
    // Загружаем сессию если нужно
    let session = truthSystem.getSessionState(sessionId);
    if (!session) {
      const result = await truthSystem.loadSession(sessionId);
      if (!result.success) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      session = truthSystem.getSessionState(sessionId);
    }
    
    // Обновляем позицию игрока
    if (playerX !== undefined && playerY !== undefined) {
      truthSystem.updatePlayerPosition(sessionId, playerX, playerY);
    }
    
    // Получаем локацию
    const targetLocationId = locationId || session?.currentLocation?.id;
    
    // === QUICK FIX: Проверяем наличие NPC, если нет - создаём ===
    const initialStats = truthSystem.getNPCStats(sessionId);
    console.log(`[AI Update] Initial NPC stats: total=${initialStats.total}, active=${initialStats.active}`);
    
    if (initialStats.total === 0 && targetLocationId) {
      console.log(`[AI Update] No NPCs found for session ${sessionId}, creating NPCs for location ${targetLocationId}...`);
      
      try {
        // Импортируем SessionNPCManager динамически
        const { sessionNPCManager } = await import('@/lib/game/session-npc-manager');
        
        // Создаём NPC для локации
        const npcs = await sessionNPCManager.initializeLocation(
          sessionId,
          targetLocationId,
          'training_ground',  // Конфигурация для тестового полигона
          1  // playerLevel
        );
        
        console.log(`[AI Update] Created ${npcs.length} NPCs for session ${sessionId}`);
      } catch (createError) {
        console.error('[AI Update] Failed to create NPCs:', createError);
      }
    }
    
    // === АКТИВАЦИЯ NPC ВОКРУГ ИГРОКА ===
    let activatedCount = 0;
    if (targetLocationId && playerX !== undefined && playerY !== undefined) {
      activatedCount = truthSystem.activateNearbyNPCs(
        sessionId,
        playerX,
        playerY,
        ACTIVATION_RADIUS,
        targetLocationId
      );
      
      if (activatedCount > 0) {
        console.log(`[AI Update] Activated ${activatedCount} NPCs near player`);
      }
    }
    
    // === ВЫПОЛНЯЕМ AI TICK через NPCAIManager ===
    // Это ключевой вызов - он запускает весь AI (chase, attack, patrol, etc.)
    await npcAIManager.updateAllNPCs(
      sessionId, 
      playerX !== undefined && playerY !== undefined ? { x: playerX, y: playerY } : undefined
    );
    
    // === ДЕАКТИВАЦИЯ ДАЛЁКИХ NPC ===
    let deactivatedCount = 0;
    if (targetLocationId && playerX !== undefined && playerY !== undefined) {
      deactivatedCount = truthSystem.deactivateFarNPCs(
        sessionId,
        playerX,
        playerY,
        DEACTIVATION_RADIUS,
        targetLocationId
      );
      
      if (deactivatedCount > 0) {
        console.log(`[AI Update] Deactivated ${deactivatedCount} far NPCs`);
      }
    }
    
    // Получаем статистику
    const stats = truthSystem.getNPCStats(sessionId);
    const aiStats = npcAIManager.getStats(sessionId);
    
    return NextResponse.json({
      success: true,
      processedNPCs: stats.active,
      activatedNPCs: activatedCount,
      deactivatedNPCs: deactivatedCount,
      tickTime: Date.now() - startTime,
      stats: {
        totalNPCs: stats.total,
        activeNPCs: stats.active,
        inactiveNPCs: stats.inactive,
        totalUpdates: aiStats.totalUpdates,
        avgUpdateTime: aiStats.avgUpdateTime,
      },
    });
    
  } catch (error) {
    console.error('[AI Update] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update AI', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }
  
  const truthSystem = TruthSystem.getInstance();
  const stats = truthSystem.getNPCStats(sessionId);
  
  return NextResponse.json({
    success: true,
    stats,
  });
}
