import { NextRequest, NextResponse } from "next/server";
import {
  getDatabaseInfo,
  needsMigration,
  runMigration,
  createBackup,
  getBackups,
  restoreFromBackup,
  SCHEMA_VERSION,
} from "@/lib/migrations";
import { logInfo, logError } from "@/lib/logger";

// GET - получить информацию о базе данных
export async function GET() {
  try {
    const info = await getDatabaseInfo();
    const needsUpdate = await needsMigration();

    return NextResponse.json({
      success: true,
      database: {
        ...info,
        schemaVersion: SCHEMA_VERSION,
        needsMigration: needsUpdate,
        sizeFormatted: formatBytes(info.size),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - выполнить миграцию или создать бэкап
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "migrate";

    switch (action) {
      case "migrate": {
        await logInfo("DATABASE", "Starting migration");
        const result = await runMigration();

        if (result.success) {
          await logInfo("DATABASE", "Migration completed", {
            fromVersion: result.fromVersion,
            toVersion: result.toVersion,
          });
        } else {
          await logError("DATABASE", "Migration failed", { error: result.error });
        }

        return NextResponse.json({ success: result.success, result });
      }

      case "backup": {
        await logInfo("DATABASE", "Creating manual backup");
        const backupPath = await createBackup();

        return NextResponse.json({
          success: true,
          backup: {
            path: backupPath,
            name: backupPath.split("/").pop(),
          },
        });
      }

      case "restore": {
        const { backupName } = body;
        if (!backupName) {
          return NextResponse.json(
            { success: false, error: "backupName is required" },
            { status: 400 }
          );
        }

        await logInfo("DATABASE", "Restoring from backup", { backupName });
        await restoreFromBackup(backupName);

        return NextResponse.json({
          success: true,
          message: `Restored from ${backupName}`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    await logError("DATABASE", "Migration API error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - удалить старые бэкапы
export async function DELETE() {
  try {
    const backups = getBackups();
    const keepCount = 3;
    const deletedCount = Math.max(0, backups.length - keepCount);

    // Импортируем функцию очистки
    const { cleanupOldBackups } = await import("@/lib/migrations");
    cleanupOldBackups(keepCount);

    return NextResponse.json({
      success: true,
      deletedCount,
      remainingCount: Math.min(backups.length, keepCount),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
