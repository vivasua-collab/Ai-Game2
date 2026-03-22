/**
 * API для работы с генератором NPC
 * 
 * Endpoints:
 * - GET ?action=stats - статистика NPC
 * - GET ?action=list - список NPC
 * - POST {action: 'generate'} - генерация NPC
 * - POST {action: 'clear'} - очистка NPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { presetStorage } from '@/lib/generator/preset-storage';
import {
  generateNPC,
  generateNPCs,
  type NPCGenerationContext,
  type GeneratedNPC,
} from '@/lib/generator/npc-generator';
import { getAllSpecies, getSpeciesByType, type SpeciesType } from '@/data/presets/species-presets';
import { getAllRoles } from '@/data/presets/role-presets';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    await presetStorage.initialize();

    if (action === 'list') {
      const type = searchParams.get('type') || undefined;
      const limit = parseInt(searchParams.get('limit') || '100');
      const offset = parseInt(searchParams.get('offset') || '0');

      let npcs = await presetStorage.loadNPCs();

      // Deduplicate by ID
      const seenIds = new Set<string>();
      npcs = npcs.filter(npc => {
        const id = (npc as unknown as GeneratedNPC).id;
        if (seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });

      if (type) {
        npcs = npcs.filter(npc => (npc as unknown as GeneratedNPC).speciesId === type);
      }

      const paginated = npcs.slice(offset, offset + limit);

      return NextResponse.json({
        success: true,
        npcs: paginated,
        total: npcs.length,
        limit,
        offset,
      });
    }

    if (action === 'stats') {
      const npcs = await presetStorage.loadNPCs();
      const species = getAllSpecies();
      const roles = getAllRoles();

      const bySpeciesType: Record<string, number> = {};
      const byRoleType: Record<string, number> = {};
      const byLevel: Record<number, number> = {};

      for (const npc of npcs) {
        const n = npc as unknown as GeneratedNPC;
        bySpeciesType[n.speciesId] = (bySpeciesType[n.speciesId] || 0) + 1;
        byRoleType[n.roleId] = (byRoleType[n.roleId] || 0) + 1;
        if (n.cultivation?.level) {
          byLevel[n.cultivation.level] = (byLevel[n.cultivation.level] || 0) + 1;
        }
      }

      return NextResponse.json({
        success: true,
        stats: {
          total: npcs.length,
          bySpeciesType,
          byRoleType,
          byLevel,
          availableSpecies: species.length,
          availableRoles: roles.length,
        },
      });
    }

    if (action === 'presets') {
      const speciesType = searchParams.get('speciesType') as SpeciesType | null;
      
      const species = speciesType 
        ? getSpeciesByType(speciesType)
        : getAllSpecies();
      const roles = getAllRoles();

      return NextResponse.json({
        success: true,
        presets: {
          species: species.map(s => ({ id: s.id, name: s.name, type: s.type })),
          roles: roles.map(r => ({ id: r.id, name: r.name, type: r.type })),
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Неизвестное действие. Используйте: ?action=list|stats|presets',
    });
  } catch (error) {
    console.error('[NPC API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, context, count = 1, save = true, mode = 'replace' } = body;

    await presetStorage.initialize();

    // Очистка NPC
    if (action === 'clear') {
      const type = body.type;
      const result = await presetStorage.clearNPCs(type);

      return NextResponse.json({
        success: true,
        deletedFiles: result.deletedFiles,
        deletedObjects: result.deletedObjects,
        message: `Удалено ${result.deletedObjects} NPC`,
      });
    }

    // Генерация NPC
    if (action === 'generate') {
      const generationContext: NPCGenerationContext = context || {};
      
      if (!generationContext.seed) {
        generationContext.seed = Date.now();
      }

      // Generate NPCs
      const npcs = generateNPCs(generationContext, count);
      
      // Assign unique IDs from storage
      for (const npc of npcs) {
        npc.id = presetStorage.generateId('NP');
      }

      if (save) {
        await presetStorage.saveNPCs(npcs as unknown as Array<{ id: string; type?: string; [key: string]: unknown }>, mode);
        await presetStorage.saveCounters();
      }

      return NextResponse.json({
        success: true,
        npcs,
        count: npcs.length,
        message: `Сгенерировано ${npcs.length} NPC`,
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Неизвестное действие. Используйте: generate|clear',
    }, { status: 400 });
  } catch (error) {
    console.error('[NPC API] Generation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка генерации',
    }, { status: 500 });
  }
}
