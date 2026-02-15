/**
 * API для работы с пулом техник
 *
 * POST /api/techniques/pool - Генерация нового пула
 * GET /api/techniques/pool - Получение активного пула
 * PUT /api/techniques/pool - Выбор/раскрытие техники
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generateTechniquePool,
  getActivePool,
  selectTechniqueFromPool,
  revealTechnique,
  type TriggerType,
} from '@/services/technique-pool.service';
import { logError } from '@/lib/logger';

/**
 * GET /api/techniques/pool
 * Получить активный пул техник для персонажа
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');

    if (!characterId) {
      return NextResponse.json(
        { error: 'characterId обязателен' },
        { status: 400 }
      );
    }

    const pool = await getActivePool(characterId);

    return NextResponse.json({
      success: true,
      pool: pool ? {
        poolId: pool.poolId,
        techniques: pool.techniques.map(t => ({
          id: t.id,
          isRevealed: t.isRevealed,
          // Раскрываем только базовую инфу если ещё не раскрыто
          technique: t.isRevealed ? t.technique : {
            name: '???',
            type: t.technique.type,
            element: t.technique.element,
            rarity: t.technique.rarity,
          },
        })),
      } : null,
    });
  } catch (error) {
    await logError('API', 'Failed to get technique pool', { error });
    return NextResponse.json(
      { error: 'Ошибка получения пула техник' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/techniques/pool
 * Сгенерировать новый пул техник
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      characterId,
      targetLevel,
      triggerType,
      count,
      preferredType,
      preferredElement,
    } = body;

    if (!characterId || !targetLevel || !triggerType) {
      return NextResponse.json(
        { error: 'characterId, targetLevel и triggerType обязательны' },
        { status: 400 }
      );
    }

    // Проверяем существование персонажа
    const character = await db.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return NextResponse.json(
        { error: 'Персонаж не найден' },
        { status: 404 }
      );
    }

    // Генерируем пул
    const result = await generateTechniquePool({
      characterId,
      targetLevel: parseInt(targetLevel),
      triggerType: triggerType as TriggerType,
      count: count ? parseInt(count) : undefined,
      preferredType,
      preferredElement,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      poolId: result.poolId,
      techniques: result.techniques?.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        element: t.element,
        rarity: t.rarity,
        qiCost: t.qiCost,
      })),
    });
  } catch (error) {
    await logError('API', 'Failed to generate technique pool', { error });
    return NextResponse.json(
      { error: 'Ошибка генерации пула техник' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/techniques/pool
 * Выбрать технику из пула или раскрыть
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, poolItemId, characterId } = body;

    if (!poolItemId) {
      return NextResponse.json(
        { error: 'poolItemId обязателен' },
        { status: 400 }
      );
    }

    if (action === 'reveal') {
      // Раскрыть технику
      const technique = await revealTechnique(poolItemId);

      if (!technique) {
        return NextResponse.json(
          { error: 'Техника не найдена' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        technique,
      });
    }

    if (action === 'select') {
      // Выбрать технику
      if (!characterId) {
        return NextResponse.json(
          { error: 'characterId обязателен для выбора' },
          { status: 400 }
        );
      }

      const result = await selectTechniqueFromPool(poolItemId, characterId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        technique: result.technique,
        learnedId: result.learnedId,
        remaining: result.remaining,
      });
    }

    return NextResponse.json(
      { error: 'Неизвестное действие. Используйте "reveal" или "select"' },
      { status: 400 }
    );
  } catch (error) {
    await logError('API', 'Failed to process technique pool action', { error });
    return NextResponse.json(
      { error: 'Ошибка обработки действия' },
      { status: 500 }
    );
  }
}
