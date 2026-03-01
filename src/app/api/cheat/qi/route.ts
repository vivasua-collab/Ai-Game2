/**
 * Cheat API - Qi manipulation
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const QiSchema = z.object({
  characterId: z.string(),
  fill: z.boolean().optional(),
  value: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = QiSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }

    const { characterId, fill, value } = validation.data;

    // Get current capacity
    const char = await db.character.findUnique({
      where: { id: characterId },
      select: { coreCapacity: true },
    });

    if (!char) {
      return NextResponse.json({ success: false, error: 'Character not found' }, { status: 404 });
    }

    const newQi = fill ? char.coreCapacity : (value ?? char.coreCapacity);

    const character = await db.character.update({
      where: { id: characterId },
      data: {
        currentQi: Math.min(newQi, char.coreCapacity),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, qi: character.currentQi });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
