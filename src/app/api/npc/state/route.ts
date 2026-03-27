/**
 * API: /api/npc/state
 * 
 * CRUD операции для NPC в мире.
 * 
 * GET  ?sessionId=xxx&locationId=yyy - Получить всех NPC в локации
 * GET  ?npcId=xxx                     - Получить конкретного NPC
 * POST   { sessionId, npc }           - Добавить NPC в мир
 * PATCH  { npcId, updates }           - Обновить NPC
 * DELETE ?npcId=xxx                   - Удалить NPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNPCWorldManager } from '@/lib/game/npc-world-manager';
import { getSessionNPCManager, applyAIConfigToNPC } from '@/lib/game/session-npc-manager';
import type { NPCState } from '@/lib/game/types';

// ==================== GET ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const locationId = searchParams.get('locationId');
    const npcId = searchParams.get('npcId');

    const npcWorldManager = getNPCWorldManager();

    // Получить конкретного NPC
    if (npcId) {
      const npc = npcWorldManager.getNPC(npcId);
      if (!npc) {
        return NextResponse.json(
          { success: false, error: 'NPC not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, npc });
    }

    // Получить всех NPC в локации
    if (sessionId && locationId) {
      const npcs = npcWorldManager.getNPCsInLocation(locationId);
      
      // Если NPC нет в WorldManager, загружаем из SessionNPCManager
      if (npcs.length === 0) {
        const sessionNPCManager = getSessionNPCManager();
        const tempNPCs = sessionNPCManager.getLocationNPCs(sessionId, locationId);
        
        // Конвертируем TempNPC в NPCState и добавляем в WorldManager
        for (const tempNPC of tempNPCs) {
          // Убедимся что AI конфиг применён
          if (!tempNPC.aiConfig) {
            applyAIConfigToNPC(tempNPC);
          }
          npcWorldManager.addNPCFromTempNPC(tempNPC);
        }
        
        const refreshedNpcs = npcWorldManager.getNPCsInLocation(locationId);
        return NextResponse.json({
          success: true,
          npcs: refreshedNpcs,
          count: refreshedNpcs.length,
          source: 'session_manager',
        });
      }
      
      return NextResponse.json({
        success: true,
        npcs,
        count: npcs.length,
        source: 'world_manager',
      });
    }

    // Получить статистику
    const stats = npcWorldManager.getStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /npc/state GET]', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ==================== POST ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, npc, tempNPCId } = body;

    const npcWorldManager = getNPCWorldManager();

    // Добавить NPC из TempNPC (по ID)
    if (sessionId && tempNPCId) {
      const sessionNPCManager = getSessionNPCManager();
      const tempNPC = sessionNPCManager.getNPC(sessionId, tempNPCId);
      
      if (!tempNPC) {
        return NextResponse.json(
          { success: false, error: 'TempNPC not found' },
          { status: 404 }
        );
      }
      
      // Убедимся что AI конфиг применён
      if (!tempNPC.aiConfig) {
        applyAIConfigToNPC(tempNPC);
      }
      
      const npcState = npcWorldManager.addNPCFromTempNPC(tempNPC);
      
      return NextResponse.json({
        success: true,
        npc: npcState,
        message: `NPC "${npcState.name}" added to world`,
      });
    }

    // Добавить NPC напрямую (из NPCState)
    if (npc) {
      npcWorldManager.addNPC(npc);
      
      return NextResponse.json({
        success: true,
        npc,
        message: `NPC "${npc.name}" added to world`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Missing required fields: sessionId + tempNPCId OR npc' },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /npc/state POST]', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ==================== PATCH ====================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { npcId, updates } = body;

    if (!npcId || !updates) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: npcId, updates' },
        { status: 400 }
      );
    }

    const npcWorldManager = getNPCWorldManager();
    const updatedNPC = npcWorldManager.updateNPC(npcId, updates);

    if (!updatedNPC) {
      return NextResponse.json(
        { success: false, error: 'NPC not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      npc: updatedNPC,
      message: `NPC "${updatedNPC.name}" updated`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /npc/state PATCH]', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ==================== DELETE ====================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const npcId = searchParams.get('npcId');
    const sessionId = searchParams.get('sessionId');

    if (!npcId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: npcId' },
        { status: 400 }
      );
    }

    const npcWorldManager = getNPCWorldManager();
    const removedNPC = npcWorldManager.removeNPC(npcId);

    if (!removedNPC) {
      return NextResponse.json(
        { success: false, error: 'NPC not found' },
        { status: 404 }
      );
    }

    // Если есть sessionId, удаляем также из SessionNPCManager
    if (sessionId) {
      const sessionNPCManager = getSessionNPCManager();
      sessionNPCManager.removeNPC(sessionId, npcId);
    }

    return NextResponse.json({
      success: true,
      npc: removedNPC,
      message: `NPC "${removedNPC.name}" removed`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /npc/state DELETE]', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
