/**
 * Rest API Endpoint
 * 
 * Система отдыха и сна для восстановления усталости.
 * - Лёгкий отдых: восстановление физическое и ментальное (медленно)
 * - Сон: полное восстановление (быстро, но требует больше времени)
 * 
 * Использует ЕДИНЫЙ сервис обработки тиков времени (time-tick.service.ts)
 * 
 * ИНТЕГРАЦИЯ TRUTHSYSTEM:
 * - Проверяет наличие сессии в памяти (ПАМЯТЬ ПЕРВИЧНА!)
 * - processTimeTickEffects уже обновляет TruthSystem!
 * - Возвращает данные из памяти
 * 
 * @updated 2026-03-06 12:40 UTC
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processTimeTickEffects } from '@/services/time-tick.service';
import { TruthSystem } from '@/lib/game/truth-system';
import {
  restSchema,
  validateOrError,
  validationErrorResponse,
} from '@/lib/validations/game';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zod validation
    const validation = validateOrError(restSchema, body);
    if (!validation.success) {
      return NextResponse.json(validationErrorResponse(validation.error), { status: 400 });
    }
    
    const { characterId, durationMinutes, restType } = validation.data;

    // === ПРОВЕРКА TRUTHSYSTEM (ПАМЯТЬ ПЕРВИЧНА!) ===
    const truthSystem = TruthSystem.getInstance();
    const memoryState = truthSystem.getSessionByCharacter(characterId);
    
    let sessionId: string;
    let source: 'memory' | 'database' = 'database';
    
    if (memoryState) {
      // Сессия в памяти - используем данные из памяти
      sessionId = memoryState.sessionId;
      source = 'memory';
    } else {
      // Сессия не в памяти - загружаем из БД
      const character = await db.character.findUnique({
        where: { id: characterId },
        include: {
          sessions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!character) {
        return NextResponse.json(
          { success: false, error: 'Character not found' },
          { status: 404 }
        );
      }

      const session = character.sessions[0];
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'No active session' },
          { status: 404 }
        );
      }
      
      sessionId = session.id;
      
      // Загружаем сессию в TruthSystem для будущих запросов
      await truthSystem.loadSession(sessionId);
    }

    // === ИСПОЛЬЗУЕМ ЕДИНЫЙ СЕРВИС ОБРАБОТКИ ТИКОВ ===
    // ВАЖНО: processTimeTickEffects уже обновляет TruthSystem!
    // Не нужно дублировать вызовы updateCharacter или advanceTime
    const tickResult = await processTimeTickEffects({
      characterId,
      sessionId,
      ticks: durationMinutes,
      restType,
      applyPassiveQi: true,
      applyDissipation: true,
    });

    if (!tickResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to process time tick' },
        { status: 500 }
      );
    }

    // Получаем данные из памяти (ПЕРВИЧНЫЙ ИСТОЧНИК)
    const finalState = truthSystem.getSessionState(sessionId);
    const worldTimeFromMemory = truthSystem.getWorldTime(sessionId);

    if (!finalState || !worldTimeFromMemory) {
      return NextResponse.json(
        { success: false, error: 'Failed to get state from memory' },
        { status: 500 }
      );
    }

    // Формируем сообщение
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const timeStr = hours > 0 ? `${hours} ч ${minutes} мин` : `${minutes} мин`;

    let message = restType === 'sleep'
      ? `😴 Пробуждение после сна!\n\n`
      : `🌿 Отдых завершён!\n\n`;

    message += `⏱️ Время: ${timeStr}\n`;
    
    // Эффекты усталости
    if (tickResult.fatigueEffects) {
      message += `\n💚 Физ. усталость: ${finalState.character.fatigue.toFixed(0)}% (-${tickResult.fatigueEffects.physicalRecovery.toFixed(1)}%)\n`;
      message += `💜 Мент. усталость: ${finalState.character.mentalFatigue.toFixed(0)}% (-${tickResult.fatigueEffects.mentalRecovery.toFixed(1)}%)\n`;
    }
    
    // Эффекты Ци
    if (tickResult.qiEffects.passiveGain > 0) {
      message += `💫 Ци: ${finalState.character.currentQi}/${finalState.character.coreCapacity} (+${tickResult.qiEffects.passiveGain} от ядра)\n`;
    }
    
    // Рассеивание избыточной Ци
    if (tickResult.qiEffects.dissipation > 0) {
      message += `💨 Рассеяно избыточной Ци: -${tickResult.qiEffects.dissipation}\n`;
    }

    if (tickResult.dayChanged) {
      message += `\n🌅 Наступил новый день!`;
    }

    return NextResponse.json({
      success: true,
      source, // Указываем источник данных
      message,
      result: {
        duration: durationMinutes,
        restType,
        physicalRecovery: tickResult.fatigueEffects?.physicalRecovery.toFixed(1) || '0',
        mentalRecovery: tickResult.fatigueEffects?.mentalRecovery.toFixed(1) || '0',
        passiveQiGain: tickResult.qiEffects.passiveGain,
        qiDissipation: tickResult.qiEffects.dissipation,
      },
      character: {
        id: characterId,
        fatigue: finalState.character.fatigue,
        mentalFatigue: finalState.character.mentalFatigue,
        currentQi: finalState.character.currentQi,
        coreCapacity: finalState.character.coreCapacity,
        // Возвращаем accumulatedQi из памяти
        accumulatedQi: finalState.character.accumulatedQi,
      },
      worldTime: {
        year: worldTimeFromMemory.year,
        month: worldTimeFromMemory.month,
        day: worldTimeFromMemory.day,
        hour: worldTimeFromMemory.hour,
        minute: worldTimeFromMemory.minute,
        formatted: worldTimeFromMemory.formatted,
        season: worldTimeFromMemory.season,
        daysSinceStart: worldTimeFromMemory.daysSinceStart,
      },
      timeAdvanced: {
        ticks: tickResult.ticksAdvanced,
        dayChanged: tickResult.dayChanged,
      },
    });

  } catch (error) {
    console.error('Rest API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
