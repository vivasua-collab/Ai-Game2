import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  SaveGameRequestSchema, 
  SessionIdSchema, 
  formatValidationErrors 
} from "@/validation";
import { logError, logWarn } from "@/lib/logger";

// GET - получить список сохранений
export async function GET(request: NextRequest) {
  try {
    const sessions = await db.gameSession.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            age: true,
            cultivationLevel: true,
            cultivationSubLevel: true,
            currentQi: true,
            coreCapacity: true,
            health: true,
            fatigue: true,
            mentalFatigue: true,
          },
        },
      },
      take: 20,
    });

    const saves = sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      
      // Информация о мире
      worldId: session.worldId,
      worldName: session.worldName,
      
      // Тип старта
      startVariant: session.startVariant,
      startType: session.startType,
      startTypeLabel: getStartTypeLabel(session.startType),
      
      // Время в мире
      worldYear: session.worldYear,
      worldMonth: session.worldMonth,
      worldDay: session.worldDay,
      worldHour: session.worldHour,
      worldMinute: session.worldMinute,
      daysSinceStart: session.daysSinceStart,
      
      // Персонаж
      character: session.character,
    }));

    return NextResponse.json({
      success: true,
      saves,
    });
  } catch (error) {
    await logError("API", "Get saves error", {
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

// Вспомогательная функция для получения метки типа старта
function getStartTypeLabel(startType: string): string {
  const labels: Record<string, string> = {
    sect: "🏛️ Секта",
    random: "🌍 Свободный",
    custom: "⚙️ Кастомный",
  };
  return labels[startType] || "❓ Неизвестно";
}

// DELETE - удалить сохранение
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    // === ВАЛИДАЦИЯ ===
    const parseResult = SessionIdSchema.safeParse(sessionId);
    if (!parseResult.success) {
      const errors = formatValidationErrors(parseResult.error);
      await logWarn("API", "Delete save validation failed", { errors });
      return NextResponse.json(
        { 
          success: false,
          error: "Validation failed", 
          details: errors,
        },
        { status: 400 }
      );
    }

    // Каскадное удаление настроено в Prisma схеме
    await db.gameSession.delete({
      where: { id: parseResult.data },
    });

    return NextResponse.json({
      success: true,
      message: "Save deleted",
    });
  } catch (error) {
    await logError("API", "Delete save error", {
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

// PUT - обновить состояние паузы
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // === ВАЛИДАЦИЯ ===
    const parseResult = SaveGameRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = formatValidationErrors(parseResult.error);
      await logWarn("API", "Save game validation failed", { errors });
      return NextResponse.json(
        { 
          success: false,
          error: "Validation failed", 
          details: errors,
        },
        { status: 400 }
      );
    }

    const { sessionId, isPaused } = parseResult.data;

    const session = await db.gameSession.update({
      where: { id: sessionId },
      data: { isPaused: isPaused ?? undefined },
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        isPaused: session.isPaused,
      },
    });
  } catch (error) {
    await logError("API", "Update save error", {
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
