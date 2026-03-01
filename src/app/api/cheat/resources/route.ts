/**
 * Cheat API - Resources manipulation
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const ResourcesSchema = z.object({
  characterId: z.string(),
  spiritStones: z.number().min(0).optional(),
  contributionPoints: z.number().min(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = ResourcesSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }

    const { characterId, spiritStones, contributionPoints } = validation.data;

    // Get current values
    const char = await db.character.findUnique({
      where: { id: characterId },
      select: { spiritStones: true, contributionPoints: true },
    });

    if (!char) {
      return NextResponse.json({ success: false, error: 'Character not found' }, { status: 404 });
    }

    const character = await db.character.update({
      where: { id: characterId },
      data: {
        spiritStones: (char.spiritStones || 0) + (spiritStones || 0),
        contributionPoints: (char.contributionPoints || 0) + (contributionPoints || 0),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      resources: { 
        spiritStones: character.spiritStones, 
        contributionPoints: character.contributionPoints 
      } 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
