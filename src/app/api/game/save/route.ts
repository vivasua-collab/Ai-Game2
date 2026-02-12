import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - получить список сохранений
export async function GET(request: NextRequest) {
  try {
    const sessions = await db.gameSession.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        character: {
          select: {
            id: true,
            age: true,
            cultivationLevel: true,
            cultivationSubLevel: true,
            currentQi: true,
            coreCapacity: true,
          },
        },
      },
      take: 10,
    });

    const saves = sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      startVariant: session.startVariant,
      worldYear: session.worldYear,
      worldMonth: session.worldMonth,
      worldDay: session.worldDay,
      daysSinceStart: session.daysSinceStart,
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
    const { sessionId, isPaused } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

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
