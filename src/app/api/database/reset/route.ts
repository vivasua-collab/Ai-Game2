import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { existsSync, unlinkSync, mkdirSync, copyFileSync } from "fs";
import { join } from "path";
import { logInfo, logError } from "@/lib/logger";

export async function POST() {
  try {
    await logInfo("SYSTEM", "Database reset requested");

    const dbPath = join(process.cwd(), "db", "custom.db");
    const dbDir = join(process.cwd(), "db");
    const backupDir = join(dbDir, "backups");

    // Создаём бэкап перед удалением
    let backupPath: string | undefined;
    if (existsSync(dbPath)) {
      // Создаём директорию для бэкапов
      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true });
      }

      // Создаём бэкап
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      backupPath = join(backupDir, `backup-${timestamp}.db`);
      copyFileSync(dbPath, backupPath);
      console.log(`Backup created: ${backupPath}`);
    }

    // Удаляем старые файлы базы
    const dbJournal = dbPath + "-journal";
    const dbWal = dbPath + "-wal";
    const dbShm = dbPath + "-shm";

    const filesToDelete = [dbPath, dbJournal, dbWal, dbShm];
    for (const file of filesToDelete) {
      if (existsSync(file)) {
        try {
          unlinkSync(file);
          console.log(`Deleted: ${file}`);
        } catch (e) {
          console.log(`Could not delete ${file}:`, e);
        }
      }
    }

    // Убеждаемся что папка существует
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    // Запускаем prisma db push для создания новой базы
    try {
      execSync("bun run db:push", {
        cwd: process.cwd(),
        stdio: "pipe",
        timeout: 30000,
      });
    } catch (e) {
      console.log("db:push error:", e);
    }

    await logInfo("SYSTEM", "Database reset completed", { backupPath });

    return NextResponse.json({
      success: true,
      message: "Database recreated successfully",
      backupPath,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await logError("DATABASE", `Database reset failed: ${errorMsg}`, {
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
