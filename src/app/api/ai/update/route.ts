/**
 * AI Update API - Простой endpoint для обновления NPC
 * 
 * Заменяет проблемный /api/ai/tick
 */

import { NextRequest, NextResponse } from 'next/server';
import { TruthSystem } from '@/lib/game/truth-system';
import type { NPCState } from '@/lib/game/types';

// Константы
const ACTIVATION_RADIUS = 500;

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
    
    // Получаем NPC в локации
    const targetLocationId = locationId || session?.currentLocation?.id;
    let npcs: NPCState[] = [];
    let activeCount = 0;
    
    if (targetLocationId) {
      npcs = truthSystem.getNPCsByLocation(sessionId, targetLocationId);
      
      // Активируем NPC рядом с игроком
      if (playerX !== undefined && playerY !== undefined) {
        for (const npc of npcs) {
          const dx = npc.x - playerX;
          const dy = npc.y - playerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance <= ACTIVATION_RADIUS && !npc.isActive) {
            npc.isActive = true;
            npc.lastActiveTime = Date.now();
            activeCount++;
          }
        }
      }
    }
    
    // Получаем статистику
    const stats = truthSystem.getNPCStats(sessionId);
    
    // Простое движение для активных NPC (квадрат)
    const allNpcs = truthSystem.getActiveNPCs(sessionId);
    for (const npc of allNpcs) {
      if (npc.isDead) continue;
      
      // Простейшее движение: небольшой сдвиг позиции
      const time = Date.now();
      const phase = Math.floor(time / 1000) % 4; // Меняем направление каждую секунду
      const speed = 50; // пикселей за тик
      
      let dx = 0, dy = 0;
      switch (phase) {
        case 0: dx = speed; break;  // вправо
        case 1: dy = speed; break;  // вниз
        case 2: dx = -speed; break; // влево
        case 3: dy = -speed; break; // вверх
      }
      
      const newX = Math.max(50, Math.min(1550, npc.x + dx));
      const newY = Math.max(50, Math.min(1150, npc.y + dy));
      
      truthSystem.updateNPC(sessionId, npc.id, {
        x: newX,
        y: newY,
        aiState: 'patrol',
      });
    }
    
    return NextResponse.json({
      success: true,
      processedNPCs: allNpcs.length,
      activatedNPCs: activeCount,
      totalInLocation: npcs.length,
      tickTime: Date.now() - startTime,
      stats: {
        totalNPCs: stats.total,
        activeNPCs: stats.active,
        inactiveNPCs: stats.inactive,
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
