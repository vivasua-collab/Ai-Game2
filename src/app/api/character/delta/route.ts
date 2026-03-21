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
import type { DeltaSource } from '@/types/stat-development';
import {
  characterDeltaPostSchema,
  characterStatsQuerySchema,
  validateOrError,
  validationErrorResponse,
} from '@/lib/validations/game';

/**
 * GET /api/character/delta?characterId=xxx
 * 
 * Get character's current stats development
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const characterId = searchParams.get('characterId');
  
  // Validate query params
  const validation = validateOrError(characterStatsQuerySchema, { characterId });
  if (!validation.success) {
    return NextResponse.json(validationErrorResponse(validation.error), { status: 400 });
  }

  try {
    const character = await db.character.findUnique({
      where: { id: validation.data.characterId },
      select: { 
        statsDevelopment: true,
        strength: true,
        agility: true,
        intelligence: true,
        health: true,
      },
    });

    if (!character) {
      return NextResponse.json(
        { success: false, error: 'Персонаж не найден' },
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
        health: character.health,
      },
    });
    
  } catch (error) {
    console.error('[API] GET /api/character/delta error:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
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
    
    // Zod validation
    const validation = validateOrError(characterDeltaPostSchema, body);
    if (!validation.success) {
      return NextResponse.json(validationErrorResponse(validation.error), { status: 400 });
    }
    
    const { characterId, statName, amount, source } = validation.data;
    
    // Import and call addStatDelta
    const { addStatDelta } = await import('@/lib/game/stat-truth');
    
    // Cast source to DeltaSource type
    const deltaSource = (source || 'event_reward') as DeltaSource;
    
    const result = await addStatDelta(
      characterId,
      statName,
      amount,
      deltaSource
    );
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] POST /api/character/delta error:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
