import { NextRequest, NextResponse } from 'next/server';
import {
  generateFullNPC,
  benchmarkGenerationForLevel,
  type FullNPCGenerationResult,
} from '@/lib/generator/npc-full-generator';

/**
 * GET /api/generator/npc-full
 * 
 * Query params:
 * - action: 'generate' | 'benchmark' | 'benchmarkLevel'
 * - level: number (1-9) - уровень культивации
 * - iterations: number - количество итераций для бенчмарка
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'generate';
    const level = parseInt(searchParams.get('level') || '9');
    const iterations = parseInt(searchParams.get('iterations') || '10');

    // Валидация
    if (level < 1 || level > 9) {
      return NextResponse.json(
        { success: false, error: 'Level must be between 1 and 9' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'generate': {
        // Генерация одного NPC с полным набором
        const result = generateFullNPC({
          cultivationLevel: level,
          forceFullEquipment: true,
          forceAllTechniqueSlots: true,
        });

        return NextResponse.json({
          success: result.success,
          npc: result.npc ? {
            id: result.npc.id,
            name: result.npc.name,
            cultivation: result.npc.cultivation,
            speciesId: result.npc.speciesId,
            roleId: result.npc.roleId,
          } : null,
          summary: {
            techniqueCount: result.techniques.length,
            formationCount: result.formations.length,
            equipmentSlots: Object.keys(result.equipment).filter(k => result.equipment[k as keyof typeof result.equipment]).length,
            inventoryItems: result.inventory.length,
          },
          timing: result.timing,
          meta: result.meta,
          errors: result.errors,
        });
      }

      case 'benchmarkLevel': {
        // Бенчмарк для конкретного уровня
        const benchmark = benchmarkGenerationForLevel(level, iterations);

        return NextResponse.json({
          success: true,
          benchmark: {
            level: benchmark.level,
            iterations: benchmark.iterations,
            totalTime: `${benchmark.totalMs}ms`,
            averageTime: `${benchmark.averageMs.toFixed(2)}ms`,
            minTime: `${benchmark.minMs}ms`,
            maxTime: `${benchmark.maxMs}ms`,
            components: {
              baseNPC: `${benchmark.components.baseNPC.avg.toFixed(2)}ms`,
              techniques: `${benchmark.components.techniques.avg.toFixed(2)}ms`,
              formations: `${benchmark.components.formations.avg.toFixed(2)}ms`,
              equipment: `${benchmark.components.equipment.avg.toFixed(2)}ms`,
              inventory: `${benchmark.components.inventory.avg.toFixed(2)}ms`,
            },
            techniqueCount: benchmark.techniqueCount,
            formationCount: benchmark.formationCount,
          },
        });
      }

      case 'benchmark': {
        // Полный бенчмарк по всем уровням
        const levels = [1, 3, 5, 7, 9];
        const results: Record<number, ReturnType<typeof benchmarkGenerationForLevel>> = {};

        for (const lvl of levels) {
          results[lvl] = benchmarkGenerationForLevel(lvl, 5);
        }

        return NextResponse.json({
          success: true,
          benchmark: 'full',
          results: Object.fromEntries(
            Object.entries(results).map(([lvl, data]) => [
              lvl,
              {
                averageTime: `${data.averageMs.toFixed(2)}ms`,
                techniques: data.techniqueCount,
                formations: data.formationCount,
              }
            ])
          ),
          summary: {
            description: 'NPC generation speed test by cultivation level',
            level9WithFullSet: `${results[9].averageMs.toFixed(2)}ms average`,
            components: results[9].components,
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action. Use: generate, benchmark, benchmarkLevel' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[NPC Full Generator API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
