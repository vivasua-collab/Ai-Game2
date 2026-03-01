/**
 * Cheat API - Fatigue manipulation
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const FatigueSchema = z.object({
  characterId: z.string(),
  physical: z.number().min(0).max(100),
  mental: z.number().min(0).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = FatigueSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }

    const { characterId, physical, mental } = validation.data;

    const character = await db.character.update({
      where: { id: characterId },
      data: {
        fatigue: physical,
        mentalFatigue: mental,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      fatigue: { physical: character.fatigue, mental: character.mentalFatigue } 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
