import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  saveGameSchema,
  loadGameSchema,
  validateOrError,
  validationErrorResponse,
} from "@/lib/validations/game";
import { TruthSystem } from "@/lib/game/truth-system";

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
    console.error("Get saves API error:", error);
    return NextResponse.json(
      {
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

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Каскадное удаление настроено в Prisma схеме
    await db.gameSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({
      success: true,
      message: "Save deleted",
    });
  } catch (error) {
    console.error("Delete save API error:", error);
    return NextResponse.json(
      {
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
    
    // Zod validation
    const validation = validateOrError(saveGameSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        validationErrorResponse(validation.error),
        { status: 400 }
      );
    }
    
    const { sessionId, isPaused } = validation.data;

    const session = await db.gameSession.update({
      where: { id: sessionId },
      data: { isPaused },
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        isPaused: session.isPaused,
      },
    });
  } catch (error) {
    console.error("Update save API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Принудительное сохранение через TruthSystem
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, saveType = 'full' } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const truthSystem = TruthSystem.getInstance();
    const sessionState = truthSystem.getSessionState(sessionId);

    if (!sessionState) {
      // Сессия не в памяти - просто обновляем timestamp в БД
      await db.gameSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        source: "database",
        message: "Session not in memory, updated timestamp only",
      });
    }

    // Сессия в памяти - сохраняем через TruthSystem
    let result;
    if (saveType === 'quick') {
      result = await truthSystem.quickSave(sessionId);
    } else {
      result = await truthSystem.saveToDatabase(sessionId);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      source: "memory",
      saveType,
      savedAt: sessionState.lastSavedAt,
      stats: truthSystem.getStats(),
    });
  } catch (error) {
    console.error("Force save API error:", error);
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
