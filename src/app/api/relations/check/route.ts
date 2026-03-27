import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface CheckRelationsParams {
  sourceId: string;
  targetId: string;
  context?: string;
}

/**
 * Проверка отношений между фракциями/нациями
 * POST /api/relations/check
 * 
 * Body: { sourceId, targetId, context? }
 * Response: { relationType, strength, modifiers }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CheckRelationsParams;
    const { sourceId, targetId, context } = body;
    
    if (!sourceId || !targetId) {
      return NextResponse.json(
        { error: 'sourceId and targetId required' },
        { status: 400 }
      );
    }
    
    // Поиск прямого отношения
    const relation = await db.factionRelation.findFirst({
      where: {
        OR: [
          { sourceId, targetId },
          { sourceId: targetId, targetId: sourceId },
        ],
      },
    });
    
    if (!relation) {
      return NextResponse.json({
        relationType: 'neutral',
        strength: 0,
        context,
      });
    }
    
    // Инверсия для обратного отношения
    const isDirect = relation.sourceId === sourceId;
    const strength = isDirect ? relation.strength : -relation.strength;
    
    let relationType = 'neutral';
    if (strength > 50) relationType = 'ally';
    else if (strength < -50) relationType = 'enemy';
    else if (strength < 0) relationType = 'hostile';
    else if (strength > 0) relationType = 'friendly';
    
    return NextResponse.json({
      relationType,
      strength,
      context,
    });
  } catch (error) {
    console.error('Relations check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
