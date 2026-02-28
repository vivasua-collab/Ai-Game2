/**
 * Rest API Endpoint
 * 
 * Система отдыха и сна для восстановления усталости.
 * - Лёгкий отдых: восстановление физическое и ментальное (медленно)
 * - Сон: полное восстановление (быстро, но требует больше времени)
 * 
 * Использует ЕДИНЫЙ сервис обработки тиков времени (time-tick.service.ts)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processTimeTickEffects } from '@/services/time-tick.service';
import { formatWorldTimeForResponse } from '@/lib/game/time-db';

interface RestRequest {
  characterId: string;
  durationMinutes: number;
  restType: 'light' | 'sleep';
}

// Минимальное время сна (4 часа = 240 минут)
const MIN_SLEEP_DURATION = 240;
// Максимальное время отдыха (8 часов = 480 минут)
const MAX_REST_DURATION = 480;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RestRequest;
    const { characterId, durationMinutes, restType } = body;

    // Валидация
    if (!characterId || !durationMinutes || !restType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['light', 'sleep'].includes(restType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid restType. Must be "light" or "sleep"' },
        { status: 400 }
      );
    }

    if (restType === 'sleep' && durationMinutes < MIN_SLEEP_DURATION) {
      return NextResponse.json(
        { success: false, error: `Минимальное время сна: ${MIN_SLEEP_DURATION / 60} часа` },
        { status: 400 }
      );
    }

    if (durationMinutes > MAX_REST_DURATION) {
      return NextResponse.json(
        { success: false, error: `Максимальное время отдыха: ${MAX_REST_DURATION / 60} часов` },
        { status: 400 }
      );
    }

    // Получаем персонажа с сессией
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

    // === ИСПОЛЬЗУЕМ ЕДИНЫЙ СЕРВИС ОБРАБОТКИ ТИКОВ ===
    const tickResult = await processTimeTickEffects({
      characterId,
      sessionId: session.id,
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

    // Получаем обновлённого персонажа
    const updatedCharacter = await db.character.findUnique({
      where: { id: characterId },
      select: {
        currentQi: true,
        coreCapacity: true,
        fatigue: true,
        mentalFatigue: true,
      },
    });

    if (!updatedCharacter) {
      return NextResponse.json(
        { success: false, error: 'Character not found after update' },
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
      message += `\n💚 Физ. усталость: ${tickResult.fatigueEffects.finalPhysical.toFixed(0)}% (-${tickResult.fatigueEffects.physicalRecovery.toFixed(1)}%)\n`;
      message += `💜 Мент. усталость: ${tickResult.fatigueEffects.finalMental.toFixed(0)}% (-${tickResult.fatigueEffects.mentalRecovery.toFixed(1)}%)\n`;
    }
    
    // Эффекты Ци
    if (tickResult.qiEffects.passiveGain > 0) {
      message += `💫 Ци: ${updatedCharacter.currentQi}/${updatedCharacter.coreCapacity} (+${tickResult.qiEffects.passiveGain} от ядра)\n`;
    }
    
    // Рассеивание избыточной Ци
    if (tickResult.qiEffects.dissipation > 0) {
      message += `💨 Рассеяно избыточной Ци: -${tickResult.qiEffects.dissipation}\n`;
    }

    if (tickResult.dayChanged) {
      message += `\n🌅 Наступил новый день!`;
    }

    // Информация о проводимости
    const worldTime = await db.gameSession.findUnique({
      where: { id: session.id },
      select: { worldYear: true, worldMonth: true, worldDay: true, worldHour: true, worldMinute: true },
    });

    return NextResponse.json({
      success: true,
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
        fatigue: updatedCharacter.fatigue,
        mentalFatigue: updatedCharacter.mentalFatigue,
        currentQi: updatedCharacter.currentQi,
        coreCapacity: updatedCharacter.coreCapacity,
      },
      worldTime: worldTime ? formatWorldTimeForResponse({
        year: worldTime.worldYear,
        month: worldTime.worldMonth,
        day: worldTime.worldDay,
        hour: worldTime.worldHour,
        minute: worldTime.worldMinute,
        totalMinutes: worldTime.worldHour * 60 + worldTime.worldMinute,
      }) : null,
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
