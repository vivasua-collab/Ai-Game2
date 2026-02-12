import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  setLoggingEnabled,
  isLoggingEnabledGlobal,
  setLogLevel,
  getLogLevel,
  getLogBuffer,
  clearLogBuffer,
  type LogLevel,
} from "@/lib/logger";

// GET - получить логи из базы данных
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const includeBuffer = searchParams.get("buffer") === "true";

    // Формируем фильтры
    const where: Record<string, unknown> = {};
    if (level) where.level = level;
    if (category) where.category = category;

    // Получаем логи из БД
    const dbLogs = await db.systemLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    // Формируем ответ
    const response: Record<string, unknown> = {
      success: true,
      settings: {
        enabled: isLoggingEnabledGlobal(),
        level: getLogLevel(),
      },
      database: {
        total: await db.systemLog.count({ where }),
        logs: dbLogs.map((log) => ({
          id: log.id,
          timestamp: log.createdAt.toISOString(),
          level: log.level,
          category: log.category,
          message: log.message,
          details: log.details ? JSON.parse(log.details) : null,
          sessionId: log.sessionId,
          duration: log.duration,
        })),
      },
    };

    // Добавляем буфер если запрошено
    if (includeBuffer) {
      response.buffer = getLogBuffer().map((log) => ({
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        category: log.category,
        message: log.message,
        details: log.details ? JSON.parse(log.details) : null,
        sessionId: log.sessionId,
        duration: log.duration,
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get logs API error:", error);
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

// POST - управление настройками логирования
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, enabled, level } = body;

    switch (action) {
      case "toggle":
        if (typeof enabled === "boolean") {
          setLoggingEnabled(enabled);
        }
        break;

      case "setLevel":
        if (level && ["ERROR", "WARN", "INFO", "DEBUG"].includes(level)) {
          setLogLevel(level as LogLevel);
        }
        break;

      case "clearBuffer":
        clearLogBuffer();
        break;

      case "clearDatabase":
        await db.systemLog.deleteMany({});
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Unknown action" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      settings: {
        enabled: isLoggingEnabledGlobal(),
        level: getLogLevel(),
      },
    });
  } catch (error) {
    console.error("Post logs API error:", error);
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

// DELETE - очистить логи
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clearAll = searchParams.get("all") === "true";
    const olderThan = searchParams.get("olderThan");

    if (clearAll) {
      await db.systemLog.deleteMany({});
      clearLogBuffer();
    } else if (olderThan) {
      const date = new Date(olderThan);
      await db.systemLog.deleteMany({
        where: {
          createdAt: { lt: date },
        },
      });
    } else {
      // По умолчанию удаляем логи старше 7 дней
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      await db.systemLog.deleteMany({
        where: {
          createdAt: { lt: weekAgo },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Logs cleared",
    });
  } catch (error) {
    console.error("Delete logs API error:", error);
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
