/**
 * Session End API Endpoint
 *
 * Корректное завершение игровой сессии.
 * Сохраняет все несохранённые данные в БД перед выгрузкой из памяти.
 *
 * ИНТЕГРАЦИЯ TRUTHSYSTEM:
 * - Вызывает unloadSession() для сохранения и выгрузки
 * - Возвращает финальную статистику сессии
 */

import { NextRequest, NextResponse } from 'next/server';
import { TruthSystem } from '@/lib/game/truth-system';
import { db } from '@/lib/db';

interface EndSessionRequest {
  sessionId: string;
  reason?: 'user_exit' | 'timeout' | 'error' | 'manual';
}

/**
 * POST - Завершить сессию корректно
 *
 * Сохраняет все данные в БД и выгружает сессию из памяти.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EndSessionRequest;
    const { sessionId, reason = 'user_exit' } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    const truthSystem = TruthSystem.getInstance();
    const memoryState = truthSystem.getSessionState(sessionId);

    // Собираем статистику ПЕРЕД выгрузкой
    const stats = {
      wasInMemory: !!memoryState,
      wasDirty: memoryState?.isDirty ?? false,
      lastSavedAt: memoryState?.lastSavedAt?.toISOString() ?? null,
      loadedAt: memoryState?.loadedAt?.toISOString() ?? null,
      worldTime: memoryState?.worldTime ? {
        year: memoryState.worldTime.year,
        month: memoryState.worldTime.month,
        day: memoryState.worldTime.day,
        hour: memoryState.worldTime.hour,
        minute: memoryState.worldTime.minute,
        daysSinceStart: memoryState.worldTime.daysSinceStart,
      } : null,
    };

    // Выполняем выгрузку (сохранит в БД если isDirty)
    const result = await truthSystem.unloadSession(sessionId);

    if (!result.success) {
      console.error(`[GameEnd] Failed to unload session: ${result.error}`);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Обновляем статус сессии в БД (опционально)
    try {
      await db.gameSession.update({
        where: { id: sessionId },
        data: {
          // Можно добавить поле lastActiveAt или status если нужно
          updatedAt: new Date(),
        },
      });
    } catch {
      // Игнорируем ошибки обновления БД - главное данные сохранены
    }

    console.log(`[GameEnd] Session ended: ${sessionId}, reason: ${reason}`);

    return NextResponse.json({
      success: true,
      message: 'Session ended successfully',
      reason,
      stats,
    });

  } catch (error) {
    console.error('[GameEnd] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Принудительно завершить и удалить сессию
 *
 * Использовать только для администрирования.
 * Выгружает из памяти и опционально удаляет из БД.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const deleteFromDb = searchParams.get('deleteFromDb') === 'true';

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    const truthSystem = TruthSystem.getInstance();

    // Выгружаем из памяти
    await truthSystem.unloadSession(sessionId);

    // Опционально удаляем из БД
    if (deleteFromDb) {
      // Каскадное удаление обрабатывается Prisma
      await db.gameSession.delete({
        where: { id: sessionId },
      });
    }

    console.log(`[GameEnd] Session deleted: ${sessionId}, fromDb: ${deleteFromDb}`);

    return NextResponse.json({
      success: true,
      message: deleteFromDb
        ? 'Session deleted from memory and database'
        : 'Session unloaded from memory',
    });

  } catch (error) {
    console.error('[GameEnd] Delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
