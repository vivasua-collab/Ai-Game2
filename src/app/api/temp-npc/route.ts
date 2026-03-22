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
 * - POST {action: 'update', sessionId, npcId, updates} - обновить NPC
 * - POST {action: 'clear', sessionId, locationId} - очистить локацию
 * - GET ?action=stats - статистика менеджера
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionNPCManager } from '@/lib/game/session-npc-manager';
import { LOCATION_NPC_PRESETS, tempNPCToClient } from '@/types/temp-npc';
import {
  tempNpcGetSchema,
  tempNpcActionSchema,
  validateOrError,
  validationErrorResponse,
} from '@/lib/validations/game';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Parse query params
  const queryParams = {
    action: searchParams.get('action'),
    sessionId: searchParams.get('sessionId'),
    locationId: searchParams.get('locationId'),
    npcId: searchParams.get('npcId'),
  };

  try {
    // Validate query params
    const validation = validateOrError(tempNpcGetSchema, queryParams);
    if (!validation.success) {
      return NextResponse.json(validationErrorResponse(validation.error), { status: 400 });
    }
    
    const { action, sessionId, locationId, npcId } = validation.data;

    switch (action) {
      case 'list': {
        if (!sessionId) {
          return NextResponse.json({
            success: false,
            error: 'sessionId обязателен',
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
            error: 'sessionId и npcId обязательны',
          }, { status: 400 });
        }
        
        const npc = sessionNPCManager.getNPC(sessionId, npcId);
        
        if (!npc) {
          return NextResponse.json({
            success: false,
            error: 'NPC не найден',
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
          error: 'Неизвестное действие. Используйте: list, get, stats, presets',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[TempNPC API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zod validation
    const validation = validateOrError(tempNpcActionSchema, body);
    if (!validation.success) {
      return NextResponse.json(validationErrorResponse(validation.error), { status: 400 });
    }
    
    const data = validation.data;

    switch (data.action) {
      case 'init': {
        const { sessionId, locationId, config, playerLevel } = data;
        
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
          message: `Сгенерировано ${npcs.length} временных NPC`,
        });
      }
      
      case 'remove': {
        const { sessionId, npcId } = data;
        
        const result = sessionNPCManager.removeNPC(sessionId, npcId);
        
        if (!result) {
          return NextResponse.json({
            success: false,
            error: 'NPC не найден или не временный',
          }, { status: 404 });
        }
        
        return NextResponse.json({
          success: true,
          loot: result.loot,
          xp: result.xp,
          message: `NPC удалён, выпало ${result.loot.length} предметов, ${result.xp} XP`,
        });
      }
      
      case 'update': {
        const { sessionId, npcId, updates } = data;
        
        const npc = sessionNPCManager.updateNPC(sessionId, npcId, updates || {});
        
        if (!npc) {
          return NextResponse.json({
            success: false,
            error: 'NPC не найден',
          }, { status: 404 });
        }
        
        return NextResponse.json({
          success: true,
          npc: tempNPCToClient(npc),
        });
      }
      
      case 'clear': {
        const { sessionId, locationId } = data;
        
        let count: number;
        
        if (locationId) {
          count = sessionNPCManager.clearLocation(sessionId, locationId);
          return NextResponse.json({
            success: true,
            removedCount: count,
            message: `Локация ${locationId} очищена, удалено ${count} NPC`,
          });
        } else {
          count = sessionNPCManager.clearSession(sessionId);
          return NextResponse.json({
            success: true,
            removedCount: count,
            message: `Сессия очищена, удалено ${count} NPC`,
          });
        }
      }
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Неизвестное действие. Используйте: init, remove, update, clear',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[TempNPC API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    }, { status: 500 });
  }
}
