import { NextRequest, NextResponse } from "next/server";
import {
  getDatabaseInfo,
  needsMigration,
  runMigration,
  createBackup,
  getBackups,
  restoreFromBackup,
  cleanupOldBackups,
  SCHEMA_VERSION,
  initializeDatabase,
} from "@/lib/migrations";
import { logInfo, logError } from "@/lib/logger";
import {
  databaseMigrateSchema,
  validateOrError,
  validationErrorResponse,
} from "@/lib/validations/game";

// GET - получить информацию о базе данных
export async function GET() {
  try {
    const info = await getDatabaseInfo();
    const migrationStatus = await needsMigration();

    return NextResponse.json({
      success: true,
      database: {
        ...info,
        schemaVersion: SCHEMA_VERSION,
        needsMigration: migrationStatus.status === "migrate",
        needsInit: migrationStatus.status === "init",
        migrationStatus: migrationStatus.status,
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
    
    // Zod validation
    const validation = validateOrError(databaseMigrateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        validationErrorResponse(validation.error),
        { status: 400 }
      );
    }
    
    const { action, backupName } = validation.data;

    switch (action) {
      case "init": {
        await logInfo("DATABASE", "Initializing new database");
        const result = await initializeDatabase();

        if (result.success) {
          await logInfo("DATABASE", "Database initialized successfully");
        } else {
          await logError("DATABASE", "Database initialization failed", { error: result.error });
        }

        return NextResponse.json({ success: result.success, error: result.error });
      }

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
        // backupName already validated by Zod refine
        await logInfo("DATABASE", "Restoring from backup", { backupName });
        await restoreFromBackup(backupName!);

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

// DELETE - удалить бэкапы
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backupName = searchParams.get("backupName");

    // Удаление конкретного бэкапа
    if (backupName) {
      const { deleteBackup } = await import("@/lib/migrations");
      const deleted = deleteBackup(backupName);

      if (deleted) {
        return NextResponse.json({
          success: true,
          message: `Backup ${backupName} deleted`,
        });
      } else {
        return NextResponse.json(
          { success: false, error: "Backup not found or could not be deleted" },
          { status: 404 }
        );
      }
    }

    // Удаление старых бэкапов (оставить последние N)
    const keepCount = parseInt(searchParams.get("keep") || "3");
    const backups = getBackups();
    const deletedCount = Math.max(0, backups.length - keepCount);

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
