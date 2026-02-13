import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SessionIdSchema, formatValidationErrors } from "@/validation";
import { logError, logWarn } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    // === ВАЛИДАЦИЯ ===
    const parseResult = SessionIdSchema.safeParse(sessionId);
    if (!parseResult.success) {
      const errors = formatValidationErrors(parseResult.error);
      await logWarn("API", "State request validation failed", { errors });
      return NextResponse.json(
        { 
          success: false,
          error: "Validation failed", 
          details: errors,
        },
        { status: 400 }
      );
    }

    const validatedSessionId = parseResult.data;

    const session = await db.gameSession.findUnique({
      where: { id: validatedSessionId },
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
          take: 50,
        },
        events: {
          where: { processed: false },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { 
          success: false,
          error: "Session not found" 
        },
        { status: 404 }
      );
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
        recentMessages: session.messages.slice(0, 10).reverse(),
        pendingEvents: session.events,
      },
    });
  } catch (error) {
    await logError("API", "Get state error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
