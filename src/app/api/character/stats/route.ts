/**
 * Character Stats API
 * 
 * GET - Get character's basic stats for combat system
 * 
 * Used by Phaser to get strength/agility for damage and cooldown calculations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/character/stats?characterId=xxx
 * 
 * Get character's stats for combat system
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
        name: true,
        cultivationLevel: true,
        strength: true,
        agility: true,
        intelligence: true,
        conductivity: true,
        currentQi: true,
        fatigue: true,
        mentalFatigue: true,
        statsDevelopment: true,
      },
    });

    if (!character) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      );
    }

    // Parse stats development if exists
    let statsDevelopment = null;
    if (character.statsDevelopment) {
      try {
        statsDevelopment = JSON.parse(character.statsDevelopment);
      } catch {
        // Ignore parse errors
      }
    }

    return NextResponse.json({
      success: true,
      character: {
        name: character.name,
        cultivationLevel: character.cultivationLevel,
        strength: character.strength,
        agility: character.agility,
        intelligence: character.intelligence,
        conductivity: character.conductivity,
        currentQi: character.currentQi,
        fatigue: character.fatigue,
        mentalFatigue: character.mentalFatigue,
      },
      statsDevelopment,
    });
    
  } catch (error) {
    console.error('[API] GET /api/character/stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
