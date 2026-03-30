/**
 * API: /api/npc/state
 * 
 * CRUD операции для NPC в мире.
 * 
 * ИЗМЕНЕНО (Фаза 6): Использует TruthSystem вместо NPCWorldManager
 * 
 * GET  ?sessionId=xxx&locationId=yyy - Получить всех NPC в локации
 * GET  ?sessionId=xxx&npcId=yyy      - Получить конкретного NPC
 * POST   { sessionId, npc }          - Добавить NPC в мир
 * PATCH  { sessionId, npcId, updates } - Обновить NPC
 * DELETE ?sessionId=xxx&npcId=yyy    - Удалить NPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { TruthSystem } from '@/lib/game/truth-system';
import type { NPCState } from '@/lib/game/types';

// ==================== GET ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const locationId = searchParams.get('locationId');
    const npcId = searchParams.get('npcId');

    const truthSystem = TruthSystem.getInstance();

    // Получить конкретного NPC
    if (sessionId && npcId) {
      const npc = truthSystem.getNPC(sessionId, npcId);
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
      const npcs = truthSystem.getNPCsByLocation(sessionId, locationId);
      
      return NextResponse.json({
        success: true,
        npcs,
        count: npcs.length,
        source: 'truth_system',
      });
    }

    // Получить всех NPC в сессии
    if (sessionId) {
      const npcs = truthSystem.getAllNPCs(sessionId);
      return NextResponse.json({
        success: true,
        npcs,
        count: npcs.length,
        source: 'truth_system',
      });
    }

    // Получить статистику
    if (sessionId) {
      const stats = truthSystem.getNPCStats(sessionId);
      return NextResponse.json({
        success: true,
        stats,
      });
    }

    return NextResponse.json(
      { success: false, error: 'sessionId is required' },
      { status: 400 }
    );
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
    const { sessionId, npc, npcs } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const truthSystem = TruthSystem.getInstance();

    // Добавить несколько NPC сразу (batch)
    if (npcs && Array.isArray(npcs)) {
      const result = truthSystem.addNPCs(sessionId, npcs);
      
      return NextResponse.json({
        success: true,
        added: result.data,
        message: `Added ${result.data} NPCs to session`,
      });
    }

    // Добавить один NPC напрямую (из NPCState)
    if (npc) {
      const result = truthSystem.addNPC(sessionId, npc as NPCState);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        npc: result.data,
        message: `NPC "${result.data!.name}" added to session`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Missing required fields: npc OR npcs' },
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
    const { sessionId, npcId, updates } = body;

    if (!sessionId || !npcId || !updates) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: sessionId, npcId, updates' },
        { status: 400 }
      );
    }

    const truthSystem = TruthSystem.getInstance();
    const result = truthSystem.updateNPC(sessionId, npcId, updates);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      npc: result.data,
      message: `NPC "${result.data!.name}" updated`,
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

    if (!sessionId || !npcId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: sessionId, npcId' },
        { status: 400 }
      );
    }

    const truthSystem = TruthSystem.getInstance();
    const result = truthSystem.removeNPC(sessionId, npcId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      npc: result.data,
      message: `NPC "${result.data!.name}" removed`,
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
