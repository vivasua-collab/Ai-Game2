/**
 * Rest API Endpoint
 * 
 * Система отдыха и сна для восстановления усталости.
 * - Лёгкий отдых: восстановление физическое и ментальное (медленно)
 * - Сон: полное восстановление (быстро, но требует больше времени)
 * 
 * Также включает пассивное восстановление Ци ядром.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FATIGUE_CONSTANTS, FATIGUE_RECOVERY_BY_LEVEL, QI_CONSTANTS } from '@/lib/game/constants';
import { advanceWorldTime, formatWorldTimeForResponse } from '@/lib/game/time-db';
import { calculateCoreGenerationRate, calculatePassiveQiGain } from '@/lib/game/qi-shared';

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

    // Продвигаем мировое время
    const timeResult = await advanceWorldTime(session.id, durationMinutes);

    // Расчёт восстановления усталости
    const levelMultiplier = FATIGUE_RECOVERY_BY_LEVEL[character.cultivationLevel] || 1.0;

    let physicalRecovery: number;
    let mentalRecovery: number;

    if (restType === 'sleep') {
      // Сон: быстрое восстановление обоих типов
      physicalRecovery = durationMinutes * FATIGUE_CONSTANTS.SLEEP_PHYSICAL_RECOVERY * levelMultiplier;
      mentalRecovery = durationMinutes * FATIGUE_CONSTANTS.SLEEP_MENTAL_RECOVERY * levelMultiplier;
    } else {
      // Лёгкий отдых: медленное восстановление
      physicalRecovery = durationMinutes * FATIGUE_CONSTANTS.REST_LIGHT_PHYSICAL * levelMultiplier;
      mentalRecovery = durationMinutes * FATIGUE_CONSTANTS.REST_LIGHT_MENTAL * levelMultiplier;
    }

    // Применяем восстановление усталости (не может уйти ниже 0)
    const newPhysicalFatigue = Math.max(0, character.fatigue - physicalRecovery);
    const newMentalFatigue = Math.max(0, character.mentalFatigue - mentalRecovery);

    // === Пассивное восстановление Ци ядром ===
    const durationSeconds = durationMinutes * 60;
    const coreGenerationRate = calculateCoreGenerationRate(character.coreCapacity);
    const passiveQiGain = calculatePassiveQiGain(
      character.currentQi,
      character.coreCapacity,
      coreGenerationRate,
      durationSeconds
    );

    // Новое количество Ци (с капом 90% для пассивного)
    const qiCap = character.coreCapacity * QI_CONSTANTS.PASSIVE_QI_CAP;
    const newQi = Math.min(qiCap, character.currentQi + passiveQiGain);

    // Обновляем персонажа
    const updatedCharacter = await db.character.update({
      where: { id: characterId },
      data: {
        fatigue: newPhysicalFatigue,
        mentalFatigue: newMentalFatigue,
        currentQi: Math.floor(newQi),
      },
    });

    // Формируем сообщение
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const timeStr = hours > 0 ? `${hours} ч ${minutes} мин` : `${minutes} мин`;

    let message = restType === 'sleep'
      ? `😴 Пробуждение после сна!\n\n`
      : `🌿 Отдых завершён!\n\n`;

    message += `⏱️ Время: ${timeStr}\n`;
    message += `\n💚 Физ. усталость: ${updatedCharacter.fatigue.toFixed(0)}% (-${physicalRecovery.toFixed(1)}%)\n`;
    message += `💜 Мент. усталость: ${updatedCharacter.mentalFatigue.toFixed(0)}% (-${mentalRecovery.toFixed(1)}%)\n`;

    if (passiveQiGain > 0) {
      message += `💫 Ци: ${updatedCharacter.currentQi}/${updatedCharacter.coreCapacity} (+${Math.floor(passiveQiGain)} от ядра)\n`;
    }

    if (timeResult.dayChanged) {
      message += `\n🌅 Наступил новый день!`;
    }

    return NextResponse.json({
      success: true,
      message,
      result: {
        duration: durationMinutes,
        restType,
        physicalRecovery: physicalRecovery.toFixed(1),
        mentalRecovery: mentalRecovery.toFixed(1),
        passiveQiGain: Math.floor(passiveQiGain),
      },
      character: {
        id: updatedCharacter.id,
        fatigue: updatedCharacter.fatigue,
        mentalFatigue: updatedCharacter.mentalFatigue,
        currentQi: updatedCharacter.currentQi,
        coreCapacity: updatedCharacter.coreCapacity,
      },
      worldTime: formatWorldTimeForResponse(timeResult.newTime),
      timeAdvanced: {
        ticks: timeResult.ticksAdvanced,
        dayChanged: timeResult.dayChanged,
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
