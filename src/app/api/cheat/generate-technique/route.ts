/**
 * Cheat API - Generate random technique
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { ALL_TECHNIQUE_PRESETS, TechniquePreset } from '@/data/presets/technique-presets';

const GenerateSchema = z.object({
  characterId: z.string(),
  type: z.enum(['random', 'combat', 'cultivation', 'support', 'movement']).optional(),
});

// Random technique names
const TECHNIQUE_NAMES = [
  "Дыхание дракона", "Поток ци", "Удар грома", "Щит духа",
  "Шаг ветра", "Взрыв пламени", "Ледяной захват", "Теневой удар",
  "Небесный удар", "Земляной барьер", "Водяной щит", "Огненная волна",
];

const ELEMENTS = ['fire', 'water', 'earth', 'air', 'lightning', 'void', 'neutral'] as const;
const TYPES = ['combat', 'cultivation', 'support', 'movement', 'sensory', 'healing'] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = GenerateSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }

    const { characterId, type } = validation.data;

    // Get character
    const char = await db.character.findUnique({
      where: { id: characterId },
      select: { cultivationLevel: true },
    });

    if (!char) {
      return NextResponse.json({ success: false, error: 'Character not found' }, { status: 404 });
    }

    // Pick a random technique from presets or generate one
    const availableTechniques = ALL_TECHNIQUE_PRESETS.filter(t => 
      t.minCultivationLevel <= char.cultivationLevel
    );

    let selectedTechnique: TechniquePreset;
    
    if (availableTechniques.length > 0 && Math.random() > 0.3) {
      // Use existing preset
      selectedTechnique = availableTechniques[Math.floor(Math.random() * availableTechniques.length)];
    } else {
      // Generate new technique
      const techType = type === 'random' 
        ? TYPES[Math.floor(Math.random() * TYPES.length)] 
        : type as typeof TYPES[number];
      
      selectedTechnique = {
        id: `gen_${Date.now()}`,
        name: TECHNIQUE_NAMES[Math.floor(Math.random() * TECHNIQUE_NAMES.length)],
        nameEn: 'Generated',
        description: 'Сгенерированная техника для тестирования.',
        category: 'advanced',
        rarity: ['common', 'uncommon', 'rare', 'legendary'][Math.floor(Math.random() * 4)] as TechniquePreset['rarity'],
        techniqueType: techType,
        element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)],
        level: Math.min(char.cultivationLevel + Math.floor(Math.random() * 2), 9),
        minLevel: 1,
        maxLevel: 9,
        canEvolve: true,
        minCultivationLevel: char.cultivationLevel,
        qiCost: Math.floor(Math.random() * 50) + 5,
        fatigueCost: { 
          physical: Math.random() * 5, 
          mental: Math.random() * 5 
        },
        effects: {
          damage: techType === 'combat' ? Math.floor(Math.random() * 30) + 10 : undefined,
          healing: techType === 'healing' ? Math.floor(Math.random() * 20) + 5 : undefined,
          qiRegenPercent: techType === 'cultivation' ? Math.floor(Math.random() * 10) + 2 : undefined,
        },
        masteryBonus: Math.random() * 0.5 + 0.2,
        sources: ['preset'],
      };
    }

    // Create technique in database
    const technique = await db.technique.create({
      data: {
        name: selectedTechnique.name,
        nameId: selectedTechnique.id,
        description: selectedTechnique.description,
        type: selectedTechnique.techniqueType,
        element: selectedTechnique.element,
        rarity: selectedTechnique.rarity,
        level: selectedTechnique.level,
        minLevel: selectedTechnique.minLevel,
        maxLevel: selectedTechnique.maxLevel,
        canEvolve: selectedTechnique.canEvolve ?? true,
        minCultivationLevel: selectedTechnique.minCultivationLevel,
        qiCost: selectedTechnique.qiCost,
        physicalFatigueCost: selectedTechnique.fatigueCost?.physical ?? 0,
        mentalFatigueCost: selectedTechnique.fatigueCost?.mental ?? 0,
        statRequirements: null,
        statScaling: selectedTechnique.scaling ? JSON.stringify(selectedTechnique.scaling) : null,
        effects: selectedTechnique.effects ? JSON.stringify(selectedTechnique.effects) : null,
        source: 'cheat',
      },
    });

    // Link to character
    await db.characterTechnique.create({
      data: {
        characterId,
        techniqueId: technique.id,
        mastery: 50,
        learningProgress: 100,
        learningSource: 'cheat',
      },
    });

    return NextResponse.json({ 
      success: true, 
      technique: {
        id: technique.id,
        name: technique.name,
        type: technique.type,
        level: technique.level,
      }
    });
  } catch (error) {
    console.error('Generate technique error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
