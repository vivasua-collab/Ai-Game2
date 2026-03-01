/**
 * ============================================================================
 * API ВРЕМЕННЫХ NPC ("СТАТИСТОВ")
 * ============================================================================
 * 
 * Endpoints:
 * - GET ?sessionId&action=list&locationId=X - список NPC в локации
 * - GET ?sessionId&action=get&npcId=X - получить конкретного NPC
 * - POST {action: 'init', sessionId, locationId, config, playerLevel} - инициализация
 * - POST {action: 'remove', sessionId, npcId} - удалить NPC (смерть)
 * - POST {action: 'clear', sessionId, locationId} - очистить локацию
 * - GET ?action=stats - статистика менеджера
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionNPCManager } from '@/lib/game/session-npc-manager';
import { LOCATION_NPC_PRESETS, tempNPCToClient } from '@/types/temp-npc';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const sessionId = searchParams.get('sessionId');
  const locationId = searchParams.get('locationId');
  const npcId = searchParams.get('npcId');

  try {
    switch (action) {
      case 'list': {
        if (!sessionId) {
          return NextResponse.json({
            success: false,
            error: 'sessionId is required',
          }, { status: 400 });
        }
        
        const npcs = locationId
          ? sessionNPCManager.getLocationNPCs(sessionId, locationId)
          : sessionNPCManager.getAllSessionNPCs(sessionId);
        
        return NextResponse.json({
          success: true,
          npcs: npcs.map(tempNPCToClient),
          total: npcs.length,
        });
      }
      
      case 'get': {
        if (!sessionId || !npcId) {
          return NextResponse.json({
            success: false,
            error: 'sessionId and npcId are required',
          }, { status: 400 });
        }
        
        const npc = sessionNPCManager.getNPC(sessionId, npcId);
        
        if (!npc) {
          return NextResponse.json({
            success: false,
            error: 'NPC not found',
          }, { status: 404 });
        }
        
        return NextResponse.json({
          success: true,
          npc: tempNPCToClient(npc),
        });
      }
      
      case 'stats': {
        return NextResponse.json({
          success: true,
          stats: sessionNPCManager.getStats(),
          presets: Object.keys(LOCATION_NPC_PRESETS),
        });
      }
      
      case 'presets': {
        return NextResponse.json({
          success: true,
          presets: Object.keys(LOCATION_NPC_PRESETS),
          configs: LOCATION_NPC_PRESETS,
        });
      }
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action. Use: list, get, stats, presets',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[TempNPC API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, locationId, npcId, config, playerLevel, updates } = body;

    switch (action) {
      case 'init': {
        if (!sessionId || !locationId) {
          return NextResponse.json({
            success: false,
            error: 'sessionId and locationId are required',
          }, { status: 400 });
        }
        
        const npcs = await sessionNPCManager.initializeLocation(
          sessionId,
          locationId,
          config || 'village',
          playerLevel || 1
        );
        
        return NextResponse.json({
          success: true,
          npcs: npcs.map(tempNPCToClient),
          total: npcs.length,
          message: `Generated ${npcs.length} temporary NPCs`,
        });
      }
      
      case 'remove': {
        if (!sessionId || !npcId) {
          return NextResponse.json({
            success: false,
            error: 'sessionId and npcId are required',
          }, { status: 400 });
        }
        
        const result = sessionNPCManager.removeNPC(sessionId, npcId);
        
        if (!result) {
          return NextResponse.json({
            success: false,
            error: 'NPC not found or not temporary',
          }, { status: 404 });
        }
        
        return NextResponse.json({
          success: true,
          loot: result.loot,
          xp: result.xp,
          message: `NPC removed, dropped ${result.loot.length} items, ${result.xp} XP`,
        });
      }
      
      case 'update': {
        if (!sessionId || !npcId) {
          return NextResponse.json({
            success: false,
            error: 'sessionId and npcId are required',
          }, { status: 400 });
        }
        
        const npc = sessionNPCManager.updateNPC(sessionId, npcId, updates || {});
        
        if (!npc) {
          return NextResponse.json({
            success: false,
            error: 'NPC not found',
          }, { status: 404 });
        }
        
        return NextResponse.json({
          success: true,
          npc: tempNPCToClient(npc),
        });
      }
      
      case 'clear': {
        if (!sessionId) {
          return NextResponse.json({
            success: false,
            error: 'sessionId is required',
          }, { status: 400 });
        }
        
        let count: number;
        
        if (locationId) {
          count = sessionNPCManager.clearLocation(sessionId, locationId);
          return NextResponse.json({
            success: true,
            removedCount: count,
            message: `Cleared location ${locationId}, removed ${count} NPCs`,
          });
        } else {
          count = sessionNPCManager.clearSession(sessionId);
          return NextResponse.json({
            success: true,
            removedCount: count,
            message: `Cleared session, removed ${count} NPCs`,
          });
        }
      }
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action. Use: init, remove, update, clear',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[TempNPC API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
