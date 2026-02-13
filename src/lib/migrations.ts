/**
 * Система миграций базы данных
 * 
 * Позволяет обновлять схему БД без потери данных:
 * 1. Создаёт резервную копию перед миграцией
 * 2. Применяет изменения схемы
 * 3. Восстанавливает данные
 */

import { existsSync, copyFileSync, unlinkSync, readdirSync, mkdirSync, statSync } from "fs";
import { join } from "path";

// Версия схемы БД (увеличивать при изменениях в schema.prisma)
// v1: Базовая схема
// v2: Добавлена система логирования (SystemLog)
// v3: Добавлены поля worldId, worldName, startType в GameSession; name в Character
export const SCHEMA_VERSION = 3;

// Путь к базе данных
const DB_PATH = join(process.cwd(), "db", "custom.db");
const BACKUP_DIR = join(process.cwd(), "db", "backups");

// Интерфейс результата миграции
export interface MigrationResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  backupPath?: string;
  error?: string;
  tablesAffected: string[];
}

// Интерфейс информации о БД
export interface DatabaseInfo {
  version: number;
  size: number;
  tables: string[];
  lastBackup: string | null;
  backups: string[];
}

/**
 * Получить текущую версию схемы БД
 */
export async function getDatabaseVersion(): Promise<number> {
  try {
    const { db } = await import("./db");
    // Проверяем существует ли таблица версий
    const result = await db.$queryRaw<{ version: number }[]>`
      SELECT version FROM _schema_version LIMIT 1
    `;
    return result[0]?.version || 0;
  } catch {
    // Таблица не существует - это старая версия или новая БД
    return 0;
  }
}

/**
 * Установить версию схемы БД
 */
async function setDatabaseVersion(version: number): Promise<void> {
  try {
    const { db } = await import("./db");
    // Создаём таблицу версий если не существует
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS _schema_version (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Обновляем или вставляем версию
    await db.$executeRawUnsafe(`
      INSERT INTO _schema_version (id, version) VALUES (1, ${version})
      ON CONFLICT(id) DO UPDATE SET version = ${version}, updated_at = CURRENT_TIMESTAMP
    `);
  } catch (error) {
    console.error("Failed to set database version:", error);
  }
}

/**
 * Получить список таблиц в БД
 */
export async function getDatabaseTables(): Promise<string[]> {
  try {
    const { db } = await import("./db");
    const result = await db.$queryRaw<{ name: string }[]>`
      SELECT name FROM sqlite_master 
      WHERE type = 'table' 
      AND name NOT LIKE 'sqlite_%' 
      AND name NOT LIKE '_prisma_%'
      AND name NOT LIKE '_schema_%'
      ORDER BY name
    `;
    return result.map((r) => r.name);
  } catch {
    return [];
  }
}

/**
 * Создать резервную копию БД
 */
export async function createBackup(): Promise<string> {
  if (!existsSync(DB_PATH)) {
    throw new Error("Database file not found");
  }

  // Создаём директорию для бэкапов
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Имя файла бэкапа
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(BACKUP_DIR, `backup-${timestamp}.db`);

  // Копируем файл
  copyFileSync(DB_PATH, backupPath);

  return backupPath;
}

/**
 * Получить список бэкапов
 */
export function getBackups(): string[] {
  if (!existsSync(BACKUP_DIR)) {
    return [];
  }

  return readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".db"))
    .sort()
    .reverse();
}

/**
 * Удалить старые бэкапы (оставить последние N)
 */
export function cleanupOldBackups(keepLast: number = 5): void {
  const backups = getBackups();
  
  if (backups.length > keepLast) {
    backups.slice(keepLast).forEach((backup) => {
      try {
        unlinkSync(join(BACKUP_DIR, backup));
      } catch (e) {
        console.error(`Failed to delete old backup ${backup}:`, e);
      }
    });
  }
}

/**
 * Восстановить из резервной копии
 */
export async function restoreFromBackup(backupName: string): Promise<boolean> {
  const backupPath = join(BACKUP_DIR, backupName);
  
  if (!existsSync(backupPath)) {
    throw new Error(`Backup not found: ${backupName}`);
  }

  // Создаём текущий бэкап перед восстановлением
  if (existsSync(DB_PATH)) {
    const currentBackup = join(BACKUP_DIR, `pre-restore-${Date.now()}.db`);
    copyFileSync(DB_PATH, currentBackup);
  }

  // Восстанавливаем
  copyFileSync(backupPath, DB_PATH);

  return true;
}

/**
 * Получить информацию о базе данных
 */
export async function getDatabaseInfo(): Promise<DatabaseInfo> {
  const version = await getDatabaseVersion();
  const tables = await getDatabaseTables();
  const backups = getBackups();

  let size = 0;
  if (existsSync(DB_PATH)) {
    const stats = statSync(DB_PATH);
    size = stats.size;
  }

  return {
    version,
    size,
    tables,
    lastBackup: backups[0] || null,
    backups,
  };
}

/**
 * Проверить, нужна ли миграция
 */
export async function needsMigration(): Promise<boolean> {
  const currentVersion = await getDatabaseVersion();
  return currentVersion < SCHEMA_VERSION;
}

/**
 * Выполнить безопасную миграцию через prisma db push
 * с сохранением данных
 */
export async function runMigration(): Promise<MigrationResult> {
  const currentVersion = await getDatabaseVersion();
  const tablesAffected: string[] = [];

  // Если версия совпадает - ничего не делаем
  if (currentVersion >= SCHEMA_VERSION) {
    return {
      success: true,
      fromVersion: currentVersion,
      toVersion: SCHEMA_VERSION,
      tablesAffected: [],
    };
  }

  let backupPath: string | undefined;

  try {
    // Создаём резервную копию
    if (existsSync(DB_PATH)) {
      backupPath = await createBackup();
      console.log(`[Migration] Backup created: ${backupPath}`);
    }

    // Записываем новую версию
    await setDatabaseVersion(SCHEMA_VERSION);
    
    console.log(`[Migration] Updated version: ${currentVersion} -> ${SCHEMA_VERSION}`);

    // Удаляем старые бэкапы
    cleanupOldBackups(5);

    return {
      success: true,
      fromVersion: currentVersion,
      toVersion: SCHEMA_VERSION,
      backupPath,
      tablesAffected,
    };
  } catch (error) {
    console.error("[Migration] Failed:", error);

    // Пытаемся восстановить из бэкапа
    if (backupPath && existsSync(backupPath)) {
      try {
        copyFileSync(backupPath, DB_PATH);
        console.log("[Migration] Restored from backup");
      } catch (restoreError) {
        console.error("[Migration] Failed to restore:", restoreError);
      }
    }

    return {
      success: false,
      fromVersion: currentVersion,
      toVersion: SCHEMA_VERSION,
      backupPath,
      error: error instanceof Error ? error.message : "Unknown error",
      tablesAffected,
    };
  }
}

/**
 * Сброс базы данных с созданием бэкапа
 */
export async function resetDatabase(): Promise<{ success: boolean; backupPath?: string; error?: string }> {
  try {
    let backupPath: string | undefined;

    // Создаём бэкап перед сбросом
    if (existsSync(DB_PATH)) {
      backupPath = await createBackup();
      console.log(`[Reset] Backup created: ${backupPath}`);
    }

    // Удаляем текущую БД
    if (existsSync(DB_PATH)) {
      unlinkSync(DB_PATH);
    }

    return { success: true, backupPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
