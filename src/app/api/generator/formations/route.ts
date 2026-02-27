/**
 * API для работы с генератором формаций
 */

import { NextRequest, NextResponse } from 'next/server';
import { presetStorage } from '@/lib/generator/preset-storage';
import { generateFormationsForLevel, type FormationType } from '@/lib/generator/formation-generator';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    // Инициализация хранилища
    await presetStorage.initialize();

    if (action === 'list') {
      // Загрузка формаций из хранилища
      const formations = await loadFormationsFromStorage();
      
      return NextResponse.json({
        success: true,
        formations,
        total: formations.length,
      });
    }

    if (action === 'stats') {
      const formations = await loadFormationsFromStorage();
      
      const byLevel: Record<number, number> = {};
      const byType: Record<string, number> = {};
      
      for (const form of formations) {
        byLevel[form.level] = (byLevel[form.level] || 0) + 1;
        byType[form.type] = (byType[form.type] || 0) + 1;
      }
      
      return NextResponse.json({
        success: true,
        stats: {
          total: formations.length,
          byLevel,
          byType,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Неизвестное действие. Используйте: ?action=list или ?action=stats',
    });
  } catch (error) {
    console.error('[Formations API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      levels, 
      types, 
      mode = 'replace',
      countPerLevel,
    } = body;

    // Инициализация хранилища
    await presetStorage.initialize();

    const targetLevels = levels || [1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    const allFormations: unknown[] = [];
    const idCounter = { current: 0 };

    // Загружаем существующие если режим append
    if (mode === 'append') {
      const existing = await loadFormationsFromStorage();
      allFormations.push(...existing);
      // Обновляем счётчик
      const maxId = existing.reduce((max, f) => {
        const idNum = parseInt(f.id.split('_')[1]) || 0;
        return Math.max(max, idNum);
      }, 0);
      idCounter.current = maxId;
    }

    // Генерируем новые формации
    for (const level of targetLevels) {
      const count = countPerLevel?.[level] || Math.max(10, Math.floor(1000 / Math.pow(2, level - 1)));
      const formationsForLevel = generateFormationsForLevel(level, idCounter);
      allFormations.push(...formationsForLevel.slice(0, count));
    }

    // Сохраняем
    await presetStorage.saveFormations(allFormations, 'replace');

    return NextResponse.json({
      success: true,
      generated: allFormations.length,
      message: `Сгенерировано ${allFormations.length} формаций`,
    });
  } catch (error) {
    console.error('[Formations API] Generation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка генерации',
    }, { status: 500 });
  }
}

/**
 * Загрузка формаций из хранилища
 */
async function loadFormationsFromStorage(): Promise<Record<string, unknown>[]> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const formationsPath = path.join(process.cwd(), 'presets', 'formations', 'all.json');
  
  try {
    const content = await fs.readFile(formationsPath, 'utf-8');
    const data = JSON.parse(content);
    return data.formations || [];
  } catch {
    return [];
  }
}
