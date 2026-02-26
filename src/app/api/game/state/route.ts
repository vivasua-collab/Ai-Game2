import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  loadGameSchema,
  validateOrError,
  validationErrorResponse,
} from "@/lib/validations/game";

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

    const session = await db.gameSession.findUnique({
      where: { id: validation.data.sessionId },
      include: {
        character: {
          include: {
            currentLocation: true,
            sect: true,
            inventory: true,
            techniques: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 10, // Оптимизация: берём только нужное количество
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
        recentMessages: session.messages.reverse(), // Уже ограничено take: 10
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
