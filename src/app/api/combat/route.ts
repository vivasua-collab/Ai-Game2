/**
 * ============================================================================
 * COMBAT API - Endpoint для боевых действий
 * ============================================================================
 * 
 * Обрабатывает:
 * - technique:use - использование техники
 * - combat:hit - попадание техники
 * - npc:attack - атака NPC
 * 
 * @see docs/checkpoints/checkpoint_03_25_phase1_combat.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  combatService,
  type TechniqueUseResult,
  type CombatResult,
} from '@/lib/game/server/combat';

// ==================== HANDLERS ====================

/**
 * POST /api/combat/technique/use
 * 
 * Использование техники игроком
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'technique:use':
        return handleTechniqueUse(body);
      
      case 'combat:hit':
        return handleCombatHit(body);
      
      case 'npc:attack':
        return handleNPCAttack(body);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Combat API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Обработать использование техники
 */
async function handleTechniqueUse(data: {
  sessionId: string;
  characterId: string;
  techniqueId: string;
  techniqueLevel: number;
  techniqueGrade: 'common' | 'refined' | 'perfect' | 'transcendent';
  techniqueType: string;
  combatSubtype?: string;
  element: string;
  mastery: number;
  targetX: number;
  targetY: number;
  qiInput?: number;
  attackerX: number;
  attackerY: number;
  cultivationLevel: number;
  currentQi: number;
  maxQi: number;
  isUltimate?: boolean;
}): Promise<NextResponse> {
  
  const result = combatService.useTechnique({
    sessionId: data.sessionId,
    characterId: data.characterId,
    techniqueId: data.techniqueId,
    techniqueLevel: data.techniqueLevel,
    techniqueGrade: data.techniqueGrade,
    techniqueType: data.techniqueType,
    combatSubtype: data.combatSubtype as any,
    element: data.element,
    mastery: data.mastery,
    targetX: data.targetX,
    targetY: data.targetY,
    qiInput: data.qiInput,
    attackerX: data.attackerX,
    attackerY: data.attackerY,
    cultivationLevel: data.cultivationLevel,
    currentQi: data.currentQi,
    maxQi: data.maxQi,
    isUltimate: data.isUltimate,
  });
  
  return NextResponse.json(result);
}

/**
 * Обработать попадание техники
 */
async function handleCombatHit(data: {
  attackerId: string;
  targetId: string;
  damage: number;
  techniqueLevel: number;
  attackerLevel: number;
  element: string;
  isUltimate?: boolean;
}): Promise<NextResponse> {
  
  const result = combatService.applyTechniqueHit(
    data.attackerId,
    data.targetId,
    data.damage,
    data.techniqueLevel,
    data.attackerLevel,
    data.element,
    data.isUltimate ?? false
  );
  
  return NextResponse.json(result);
}

/**
 * Обработать атаку NPC
 */
async function handleNPCAttack(data: {
  npcId: string;
  targetId: string;
  damage: number;
  attackType: 'melee' | 'ranged';
  npcX: number;
  npcY: number;
  targetX: number;
  targetY: number;
}): Promise<NextResponse> {
  
  const result = combatService.processNPCAttack({
    npcId: data.npcId,
    targetId: data.targetId,
    damage: data.damage,
    attackType: data.attackType,
    npcX: data.npcX,
    npcY: data.npcY,
    targetX: data.targetX,
    targetY: data.targetY,
  });
  
  return NextResponse.json(result);
}

/**
 * GET /api/combat
 * 
 * Получить статистику CombatService
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    stats: combatService.getStats(),
  });
}
