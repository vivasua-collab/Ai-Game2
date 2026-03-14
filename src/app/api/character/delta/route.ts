/**
 * Character Delta API
 * 
 * GET - Get character's stats development
 * POST - Add delta to a stat
 * 
 * @see src/lib/game/stat-truth.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/character/delta?characterId=xxx
 * 
 * Get character's current stats development
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const characterId = searchParams.get('characterId');
  
  if (!characterId) {
    return NextResponse.json(
      { success: false, error: 'characterId required' },
      { status: 400 }
    );
  }

  try {
    const character = await db.character.findUnique({
      where: { id: characterId },
      select: { 
        statsDevelopment: true,
        strength: true,
        agility: true,
        intelligence: true,
        vitality: true,
      },
    });

    if (!character) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      );
    }

    // Parse stats development
    let statsDevelopment;
    try {
      statsDevelopment = JSON.parse(character.statsDevelopment || '{}');
    } catch {
      statsDevelopment = {};
    }

    return NextResponse.json({
      success: true,
      statsDevelopment,
      baseStats: {
        strength: character.strength,
        agility: character.agility,
        intelligence: character.intelligence,
        vitality: character.vitality,
      },
    });
    
  } catch (error) {
    console.error('[API] GET /api/character/delta error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/character/delta
 * 
 * Add delta to a character's stat
 * 
 * Body: { characterId, statName, amount, source }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { characterId, statName, amount, source } = body;
    
    // Validate required fields
    if (!characterId || !statName || amount === undefined) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: characterId, statName, amount' 
        },
        { status: 400 }
      );
    }
    
    // Validate stat name
    const validStats = ['strength', 'agility', 'intelligence', 'vitality'];
    if (!validStats.includes(statName)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid statName. Must be one of: ${validStats.join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }
    
    // Import and call addStatDelta
    const { addStatDelta } = await import('@/lib/game/stat-truth');
    
    const result = await addStatDelta(
      characterId,
      statName,
      amount,
      source || 'event_reward'
    );
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] POST /api/character/delta error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
