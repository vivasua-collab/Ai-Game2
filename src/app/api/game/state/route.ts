import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  loadGameSchema,
  validateOrError,
  validationErrorResponse,
} from "@/lib/validations/game";
import { TruthSystem } from "@/lib/game/truth-system";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    // Zod validation for query params
    const validation = validateOrError(loadGameSchema, { sessionId });
    if (!validation.success) {
      return NextResponse.json(
        validationErrorResponse(validation.error),
        { status: 400 }
      );
    }

    // === ПРОВЕРЯЕМ TRUTH SYSTEM СНАЧАЛА ===
    // ПАМЯТЬ ПЕРВИЧНА - если сессия загружена, берём из памяти
    const truthSystem = TruthSystem.getInstance();
    const memoryState = truthSystem.getSessionState(validation.data.sessionId);

    if (memoryState) {
      // Возвращаем данные из памяти (истина!)
      const worldTime = {
        year: memoryState.worldTime.year,
        month: memoryState.worldTime.month,
        day: memoryState.worldTime.day,
        hour: memoryState.worldTime.hour,
        minute: memoryState.worldTime.minute,
        formatted: memoryState.worldTime.formatted,
        season: memoryState.worldTime.season,
      };

      const cultivationInfo = {
        level: memoryState.character.cultivationLevel,
        subLevel: memoryState.character.cultivationSubLevel,
        formatted: `${memoryState.character.cultivationLevel}.${memoryState.character.cultivationSubLevel}`,
        qiDensity: Math.pow(2, memoryState.character.cultivationLevel - 1),
        progressToNextSubLevel:
          memoryState.character.accumulatedQi /
          (memoryState.character.coreCapacity * 10),
        progressToNextMajorLevel:
          memoryState.character.accumulatedQi /
          (memoryState.character.coreCapacity * 100),
      };

      return NextResponse.json({
        success: true,
        source: "memory", // Указываем источник данных
        session: {
          id: memoryState.sessionId,
          isPaused: false, // Активная сессия
          daysSinceStart: memoryState.worldTime.daysSinceStart,
          worldTime,
          character: {
            id: memoryState.character.id,
            name: memoryState.character.name,
            age: memoryState.character.age,
            strength: memoryState.character.strength,
            agility: memoryState.character.agility,
            intelligence: memoryState.character.intelligence,
            conductivity: memoryState.character.conductivity,
            cultivationLevel: memoryState.character.cultivationLevel,
            cultivationSubLevel: memoryState.character.cultivationSubLevel,
            coreCapacity: memoryState.character.coreCapacity,
            coreQuality: memoryState.character.coreQuality,
            currentQi: memoryState.character.currentQi,
            accumulatedQi: memoryState.character.accumulatedQi,
            health: memoryState.character.health,
            fatigue: memoryState.character.fatigue,
            mentalFatigue: memoryState.character.mentalFatigue,
            sectId: memoryState.character.sectId,
            sectRole: memoryState.character.sectRole,
            contributionPoints: memoryState.character.contributionPoints,
            spiritStones: memoryState.character.spiritStones,
            // ВАЖНО: добавляем недостающие поля!
            conductivityMeditations: memoryState.character.conductivityMeditations,
            qiUnderstanding: memoryState.character.qiUnderstanding,
            qiUnderstandingCap: memoryState.character.qiUnderstandingCap,
            cultivationInfo,
            currentLocation: memoryState.currentLocation,
          },
          techniques: memoryState.techniques,
          inventory: memoryState.inventory,
        },
      });
    }

    // === ЕСЛИ НЕТ В ПАМЯТИ - ЗАГРУЖАЕМ ИЗ БД ===
    // И сразу загружаем в память для будущих запросов
    const session = await db.gameSession.findUnique({
      where: { id: validation.data.sessionId },
      include: {
        character: {
          include: {
            currentLocation: true,
            sect: true,
            inventory: true,
            techniques: {
              include: { technique: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        events: {
          where: { processed: false },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Загружаем в TruthSystem для будущих запросов
    await truthSystem.loadSession(validation.data.sessionId);

    // Форматируем время
    const worldTime = {
      year: session.worldYear,
      month: session.worldMonth,
      day: session.worldDay,
      hour: session.worldHour,
      minute: session.worldMinute,
      formatted: `${session.worldYear} Э.С.М., ${session.worldMonth} месяц, ${session.worldDay} день, ${session.worldHour}:${session.worldMinute.toString().padStart(2, "0")}`,
      season: session.worldMonth <= 6 ? "тёплый" : "холодный",
    };

    // Форматируем культивацию
    const cultivationInfo = {
      level: session.character.cultivationLevel,
      subLevel: session.character.cultivationSubLevel,
      formatted: `${session.character.cultivationLevel}.${session.character.cultivationSubLevel}`,
      qiDensity: Math.pow(2, session.character.cultivationLevel - 1),
      progressToNextSubLevel:
        session.character.accumulatedQi /
        (session.character.coreCapacity * 10),
      progressToNextMajorLevel:
        session.character.accumulatedQi /
        (session.character.coreCapacity * 100),
    };

    return NextResponse.json({
      success: true,
      source: "database", // Указываем источник данных
      session: {
        id: session.id,
        startVariant: session.startVariant,
        isPaused: session.isPaused,
        daysSinceStart: session.daysSinceStart,
        worldTime,
        character: {
          ...session.character,
          cultivationInfo,
        },
        recentMessages: session.messages.reverse(),
        pendingEvents: session.events,
      },
    });
  } catch (error) {
    console.error("Get state API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
