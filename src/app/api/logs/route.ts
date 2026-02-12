import { NextRequest, NextResponse } from "next/server";
import {
  setLoggingEnabled,
  isLoggingEnabledGlobal,
  setLogLevel,
  getLogLevel,
  getLogBuffer,
  clearLogBuffer,
  type LogLevel,
} from "@/lib/logger";

// Импорт базы данных с fallback
type SystemLogDelegate = {
  findMany: (args?: { orderBy?: { createdAt: string }; take?: number }) => Promise<Array<{
    id: string;
    createdAt: Date;
    level: string;
    category: string;
    message: string;
    details: string | null;
    stack: string | null;
    sessionId: string | null;
    duration: number | null;
  }>>;
  count: () => Promise<number>;
  deleteMany: (args?: { where?: { createdAt?: { lt: Date } } }) => Promise<unknown>;
};

type DbWithSystemLog = {
  systemLog?: SystemLogDelegate;
};

let db: DbWithSystemLog | null = null;

async function getDb(): Promise<DbWithSystemLog | null> {
  if (db !== null) return db;
  try {
    const dbModule = await import("@/lib/db");
    db = dbModule.db;
    return db;
  } catch {
    return null;
  }
}

// Проверка доступности SystemLog (динамическая)
function isSystemLogAvailable(database: DbWithSystemLog | null): boolean {
  return database !== null && typeof database.systemLog?.findMany === 'function';
}

// GET - получить логи
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    // Получаем буфер из памяти (всегда доступен)
    const bufferLogs = getLogBuffer().slice(-limit);

    // Пытаемся получить логи из БД
    let dbLogs: LogEntry[] = [];
    let dbTotal = 0;
    let dbAvailable = false;

    try {
      const database = await getDb();
      dbAvailable = isSystemLogAvailable(database);
      
      if (dbAvailable && database?.systemLog) {
        const dbResults = await database.systemLog.findMany({
          orderBy: { createdAt: "desc" },
          take: limit,
        });
        dbTotal = await database.systemLog.count();
        dbLogs = dbResults.map((log: { id: string; createdAt: Date; level: string; category: string; message: string; details: string | null; stack: string | null; sessionId: string | null; duration: number | null }) => ({
          id: log.id,
          timestamp: log.createdAt.toISOString(),
          level: log.level,
          category: log.category,
          message: log.message,
          details: log.details ? (() => { try { return JSON.parse(log.details); } catch { return log.details; } })() : null,
          stack: log.stack,
          sessionId: log.sessionId,
          duration: log.duration,
        }));
      }
    } catch (dbError) {
      console.warn("Database logs unavailable, using buffer only:", dbError instanceof Error ? dbError.message : "Unknown error");
    }

    // Объединяем логи (буфер имеет приоритет по времени)
    const allLogs = [...bufferLogs.map(log => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      category: log.category,
      message: log.message,
      details: log.details ? (() => { try { return JSON.parse(log.details); } catch { return log.details; } })() : null,
      stack: log.stack,
      sessionId: log.sessionId,
      duration: log.duration,
    })), ...dbLogs];

    // Убираем дубликаты
    const uniqueLogs = allLogs.filter((log, index, self) =>
      index === self.findIndex((l) => l.timestamp === log.timestamp && l.message === log.message)
    ).slice(0, limit);

    return NextResponse.json({
      success: true,
      settings: {
        enabled: isLoggingEnabledGlobal(),
        level: getLogLevel(),
      },
      database: {
        available: dbAvailable,
        total: dbTotal,
        logs: uniqueLogs,
      },
      buffer: {
        count: bufferLogs.length,
      },
    });
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
        try {
          const database = await getDb();
          if (isSystemLogAvailable(database) && database?.systemLog) {
            await database.systemLog.deleteMany({});
          }
        } catch (dbError) {
          console.warn("Failed to clear database logs:", dbError);
        }
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
      database: {
        available: isSystemLogAvailable(await getDb()),
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

    // Очищаем буфер
    clearLogBuffer();

    // Пытаемся очистить БД
    let dbAvailable = false;
    try {
      const database = await getDb();
      dbAvailable = isSystemLogAvailable(database);
      
      if (dbAvailable && database?.systemLog) {
        if (clearAll) {
          await database.systemLog.deleteMany({});
        } else if (olderThan) {
          const date = new Date(olderThan);
          await database.systemLog.deleteMany({
            where: {
              createdAt: { lt: date },
            },
          });
        } else {
          // По умолчанию удаляем логи старше 7 дней
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          await database.systemLog.deleteMany({
            where: {
              createdAt: { lt: weekAgo },
            },
          });
        }
      }
    } catch (dbError) {
      console.warn("Failed to clear database logs:", dbError);
    }

    return NextResponse.json({
      success: true,
      message: "Logs cleared",
      database: {
        available: dbAvailable,
      },
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
