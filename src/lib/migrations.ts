/**
 * Система миграций базы данных
 * 
 * Позволяет обновлять схему БД без потери данных:
 * 1. Создаёт резервную копию перед миграцией
 * 2. Применяет изменения схемы
 * 3. Восстанавливает данные
 */

import { existsSync, copyFileSync, unlinkSync, readdirSync, mkdirSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

// Версия схемы БД (увеличивать при изменениях в schema.prisma)
// v1: Базовая схема
// v2: Добавлена система логирования (SystemLog)
// v3: Добавлены поля worldId, worldName, startType в GameSession; name в Character
// v4: Добавлены навыки культивации, система обучения техникам, 3D координаты, система усталости
// v5: Расширена модель InventoryItem (isConsumable, durability, qiCharge, effects, icon)
export const SCHEMA_VERSION = 5;

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
 * Проверить, существует ли файл базы данных
 */
export function databaseExists(): boolean {
  return existsSync(DB_PATH);
}

/**
 * Получить текущую версию схемы БД
 */
export async function getDatabaseVersion(): Promise<number> {
  try {
    // Если БД не существует, возвращаем -1 (признак отсутствия БД)
    if (!databaseExists()) {
      return -1;
    }
    
    const { db } = await import("./db");
    // Проверяем существует ли таблица версий
    const result = await db.$queryRaw<{ version: number }[]>`
      SELECT version FROM _schema_version LIMIT 1
    `;
    return result[0]?.version || 0;
  } catch {
    // Таблица не существует - это старая версия
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
 * @param type - тип бэкапа: 'auto' (обычный), 'mig' (перед миграцией), 'reset' (перед сбросом)
 */
export async function createBackup(type: 'auto' | 'mig' | 'reset' = 'auto'): Promise<string> {
  if (!existsSync(DB_PATH)) {
    throw new Error("Database file not found");
  }

  // Создаём директорию для бэкапов
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Имя файла бэкапа с типом
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const prefix = type === 'auto' ? 'backup' : `${type}-backup`;
  const backupPath = join(BACKUP_DIR, `${prefix}-${timestamp}.db`);

  // Копируем файл
  copyFileSync(DB_PATH, backupPath);

  return backupPath;
}

/**
 * Получить список бэкапов (все типы)
 */
export function getBackups(): string[] {
  if (!existsSync(BACKUP_DIR)) {
    return [];
  }

  return readdirSync(BACKUP_DIR)
    .filter((f) => (f.startsWith("backup-") || f.startsWith("mig-") || f.startsWith("reset-")) && f.endsWith(".db"))
    .sort()
    .reverse();
}

/**
 * Получить тип бэкапа из имени файла
 */
export function getBackupType(filename: string): 'auto' | 'mig' | 'reset' {
  if (filename.startsWith('mig-')) return 'mig';
  if (filename.startsWith('reset-')) return 'reset';
  return 'auto';
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
 * Удалить конкретный бэкап
 */
export function deleteBackup(backupName: string): boolean {
  const backupPath = join(BACKUP_DIR, backupName);
  
  if (!existsSync(backupPath)) {
    return false;
  }
  
  try {
    unlinkSync(backupPath);
    return true;
  } catch (e) {
    console.error(`Failed to delete backup ${backupName}:`, e);
    return false;
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
export async function getDatabaseInfo(): Promise<DatabaseInfo & { exists: boolean }> {
  const exists = databaseExists();
  const version = await getDatabaseVersion();
  const tables = exists ? await getDatabaseTables() : [];
  const backups = getBackups();

  let size = 0;
  if (exists) {
    const stats = statSync(DB_PATH);
    size = stats.size;
  }

  return {
    exists,
    version: version === -1 ? 0 : version,
    size,
    tables,
    lastBackup: backups[0] || null,
    backups,
  };
}

/**
 * Проверить, нужна ли миграция
 * Возвращает:
 *  - "none" - БД актуальна
 *  - "init" - БД не существует, нужна инициализация
 *  - "migrate" - БД существует, но старая версия
 */
export async function needsMigration(): Promise<{ status: "none" | "init" | "migrate"; currentVersion: number }> {
  const currentVersion = await getDatabaseVersion();
  
  // БД не существует
  if (currentVersion === -1) {
    return { status: "init", currentVersion: 0 };
  }
  
  // БД существует и актуальна
  if (currentVersion >= SCHEMA_VERSION) {
    return { status: "none", currentVersion };
  }
  
  // БД существует, но старая версия
  return { status: "migrate", currentVersion };
}

/**
 * Создать пустой файл для SQLite БД
 * Prisma создаст валидную структуру при подключении
 */
function createEmptySqliteDb(filePath: string): void {
  // Создаём абсолютно пустой файл
  // Prisma инициализирует его как валидную SQLite БД
  writeFileSync(filePath, Buffer.alloc(0));
}

/**
 * Инициализировать новую базу данных
 */
export async function initializeDatabase(): Promise<{ success: boolean; error?: string }> {
  try {
    const dbDir = join(process.cwd(), "db");
    const dbPath = join(dbDir, "custom.db");
    
    // 1. Создаём директорию для БД
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
      console.log(`[Init] Created db directory: ${dbDir}`);
    }
    
    // 2. Создаём директорию для бэкапов
    if (!existsSync(BACKUP_DIR)) {
      mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`[Init] Created backups directory: ${BACKUP_DIR}`);
    }

    // 3. Создаём пустой файл БД
    console.log(`[Init] Creating empty database file...`);
    createEmptySqliteDb(dbPath);
    console.log(`[Init] Created: ${dbPath}`);

    // 4. Запускаем prisma db push для создания таблиц
    console.log(`[Init] Running prisma db push...`);
    
    try {
      let pushCommand = "npx prisma db push --accept-data-loss --skip-generate";
      
      const hasBun = existsSync(join(process.cwd(), "bun.lock")) || 
                     existsSync(join(process.cwd(), "bun.lockb"));
      if (hasBun) {
        pushCommand = "bunx prisma db push --accept-data-loss --skip-generate";
      }
      
      console.log(`[Init] Command: ${pushCommand}`);
      
      execSync(pushCommand, {
        cwd: process.cwd(),
        stdio: "pipe",
        timeout: 120000,
        encoding: "utf-8",
      });
      
      console.log(`[Init] Schema created successfully`);
    } catch (e) {
      const error = e as { message?: string; stdout?: string; stderr?: string };
      console.log(`[Init] prisma db push error: ${error.message}`);
      if (error.stderr) console.log(`[Init] stderr: ${error.stderr}`);
    }

    // 5. Устанавливаем версию схемы
    await setDatabaseVersion(SCHEMA_VERSION);
    console.log(`[Init] Schema version set to ${SCHEMA_VERSION}`);

    // 6. Проверяем результат
    if (existsSync(dbPath)) {
      const stats = statSync(dbPath);
      console.log(`[Init] Database ready: ${dbPath} (${stats.size} bytes)`);
    }

    return { success: true };
  } catch (error) {
    console.error("[Init] Failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Выполнить безопасную миграцию через prisma db push
 * с сохранением данных
 */
export async function runMigration(): Promise<MigrationResult> {
  const currentVersion = await getDatabaseVersion();
  const tablesAffected: string[] = [];

  // Если БД не существует - это инициализация, не миграция
  if (currentVersion === -1) {
    const result = await initializeDatabase();
    return {
      success: result.success,
      fromVersion: 0,
      toVersion: SCHEMA_VERSION,
      error: result.error,
      tablesAffected: [],
    };
  }

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
    // Создаём резервную копию (с пометкой миграции)
    if (existsSync(DB_PATH)) {
      backupPath = await createBackup('mig');
      console.log(`[Migration] Backup created: ${backupPath}`);
    }

    // Запускаем prisma db push для применения изменений схемы
    try {
      console.log(`[Migration] Running prisma db push...`);
      execSync("bun run db:push", {
        cwd: process.cwd(),
        stdio: "pipe",
        timeout: 60000,
      });
      console.log(`[Migration] prisma db push completed`);
    } catch (e) {
      console.log(`[Migration] prisma db push warning:`, e);
      // Продолжаем даже если есть предупреждения
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

    // Создаём бэкап перед сбросом (с пометкой reset)
    if (existsSync(DB_PATH)) {
      backupPath = await createBackup('reset');
      console.log(`[Reset] Backup created: ${backupPath}`);
    }

    // Отключаем Prisma от базы
    try {
      const { db } = await import("./db");
      await db.$disconnect();
      console.log(`[Reset] Prisma disconnected`);
    } catch (e) {
      console.log(`[Reset] Disconnect warning:`, e);
    }

    // Удаляем текущую БД и связанные файлы
    const filesToDelete = [DB_PATH, DB_PATH + "-journal", DB_PATH + "-wal", DB_PATH + "-shm"];
    for (const file of filesToDelete) {
      if (existsSync(file)) {
        try {
          unlinkSync(file);
          console.log(`[Reset] Deleted: ${file}`);
        } catch (e) {
          console.log(`[Reset] Could not delete ${file}:`, e);
        }
      }
    }

    // Запускаем prisma db push для создания новой базы
    try {
      console.log(`[Reset] Running prisma db push...`);
      execSync("bun run db:push", {
        cwd: process.cwd(),
        stdio: "pipe",
        timeout: 60000,
      });
      console.log(`[Reset] Database recreated`);
    } catch (e) {
      console.log(`[Reset] db:push warning:`, e);
    }

    // Устанавливаем актуальную версию схемы
    await setDatabaseVersion(SCHEMA_VERSION);
    console.log(`[Reset] Schema version set to ${SCHEMA_VERSION}`);

    return { success: true, backupPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
