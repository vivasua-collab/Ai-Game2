/**
 * Cheat API - Level manipulation
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const LevelSchema = z.object({
  characterId: z.string(),
  level: z.number().min(1).max(9),
  subLevel: z.number().min(0).max(9),
  coreCapacity: z.number().min(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = LevelSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input' },
        { status: 400 }
      );
    }

    const { characterId, level, subLevel, coreCapacity } = validation.data;

    const character = await db.character.update({
      where: { id: characterId },
      data: {
        cultivationLevel: level,
        cultivationSubLevel: subLevel,
        coreCapacity,
        accumulatedQi: 0,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, character });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
