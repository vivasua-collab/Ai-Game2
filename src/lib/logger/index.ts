/**
 * Система логирования для Cultivation World Simulator
 * 
 * Уровни логов:
 * - ERROR: Критические ошибки
 * - WARN: Предупреждения
 * - INFO: Информационные сообщения
 * - DEBUG: Отладочная информация
 */

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

export type LogCategory = 
  | "SYSTEM"         // Системные события
  | "API"            // API запросы
  | "LLM"            // LLM провайдеры
  | "GAME"           // Игровая логика
  | "DATABASE"       // База данных
  | "UI"             // Интерфейс
  | "AUTH"           // Авторизация (на будущее)
  | "CHEATS"         // Чит-команды
  | "TECHNIQUE_POOL" // Пул техник
  | "UNKNOWN";       // Неизвестно

export interface LogEntry {
  id?: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: string;          // JSON строка с деталями
  sessionId?: string;        // ID сессии игры
  userId?: string;           // ID пользователя (на будущее)
  stack?: string;            // Stack trace для ошибок
  duration?: number;         // Длительность операции в мс
}

// Глобальное состояние логирования
let isLoggingEnabled = true;
let logLevel: LogLevel = "INFO";

// Очередь логов в памяти (для быстрого доступа)
const logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * Установить включено ли логирование
 */
export function setLoggingEnabled(enabled: boolean): void {
  isLoggingEnabled = enabled;
}

/**
 * Получить состояние логирования
 */
export function isLoggingEnabledGlobal(): boolean {
  return isLoggingEnabled;
}

/**
 * Установить минимальный уровень логов
 */
export function setLogLevel(level: LogLevel): void {
  logLevel = level;
}

/**
 * Получить текущий уровень логов
 */
export function getLogLevel(): LogLevel {
  return logLevel;
}

/**
 * Приоритет уровней логов
 */
const LOG_PRIORITY: Record<LogLevel, number> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

/**
 * Проверить, нужно ли логировать данный уровень
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_PRIORITY[level] <= LOG_PRIORITY[logLevel];
}

/**
 * Форматирование даты для логов
 */
function formatTimestamp(date: Date): string {
  return date.toISOString();
}

/**
 * Основная функция логирования
 */
export async function log(
  level: LogLevel,
  category: LogCategory,
  message: string,
  options?: {
    details?: Record<string, unknown>;
    sessionId?: string;
    stack?: string;
    duration?: number;
    error?: Error | string;
    [key: string]: unknown;  // Разрешаем любые дополнительные поля
  }
): Promise<LogEntry | null> {
  if (!isLoggingEnabled || !shouldLog(level)) {
    return null;
  }

  // Извлекаем известные поля, остальные идут в details
  const { details, sessionId, stack, duration, error, ...rest } = options || {};

  const entry: LogEntry = {
    timestamp: new Date(),
    level,
    category,
    message,
    details: JSON.stringify({ ...details, ...rest }) || undefined,
    sessionId,
    stack: stack ?? (error instanceof Error ? error.stack : undefined),
    duration,
  };

  // Добавляем в буфер
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift();
  }

  // Вывод в консоль
  const consoleMsg = `[${formatTimestamp(entry.timestamp)}] [${level}] [${category}] ${message}`;
  
  switch (level) {
    case "ERROR":
      console.error(consoleMsg, options?.details || "");
      break;
    case "WARN":
      console.warn(consoleMsg, options?.details || "");
      break;
    case "DEBUG":
      console.debug(consoleMsg, options?.details || "");
      break;
    default:
      console.log(consoleMsg, options?.details || "");
  }

  // Сохранение в базу данных (только ERROR и WARN)
  if (level === "ERROR" || level === "WARN") {
    try {
      const { db } = await import("../db");
      await db.systemLog.create({
        data: {
          level,
          category,
          message,
          details: entry.details,
          sessionId: entry.sessionId,
          stack: entry.stack,
          duration: entry.duration,
        },
      });
    } catch (dbError) {
      // Если не удалось сохранить в БД, выводим в консоль
      console.error("Failed to save log to database:", dbError);
    }
  }

  return entry;
}

// Удобные функции для разных уровней

export async function logError(
  category: LogCategory,
  message: string,
  options?: {
    details?: Record<string, unknown>;
    sessionId?: string;
    error?: Error | string;
    [key: string]: unknown;
  }
): Promise<LogEntry | null> {
  const { error, ...rest } = options || {};
  const errorObj = error instanceof Error ? error : 
                   typeof error === 'string' ? new Error(error) : undefined;
  return log("ERROR", category, message, {
    ...rest,
    stack: errorObj?.stack,
    details: {
      ...(rest.details || {}),
      errorMessage: errorObj?.message ?? (typeof error === 'string' ? error : undefined),
    },
  });
}

export async function logWarn(
  category: LogCategory,
  message: string,
  options?: {
    details?: Record<string, unknown>;
    sessionId?: string;
    [key: string]: unknown;
  }
): Promise<LogEntry | null> {
  return log("WARN", category, message, options);
}

export async function logInfo(
  category: LogCategory,
  message: string,
  options?: {
    details?: Record<string, unknown>;
    sessionId?: string;
    [key: string]: unknown;
  }
): Promise<LogEntry | null> {
  return log("INFO", category, message, options);
}

export async function logDebug(
  category: LogCategory,
  message: string,
  options?: {
    details?: Record<string, unknown>;
    sessionId?: string;
    [key: string]: unknown;
  }
): Promise<LogEntry | null> {
  return log("DEBUG", category, message, options);
}

/**
 * Получить логи из буфера
 */
export function getLogBuffer(): LogEntry[] {
  return [...logBuffer];
}

/**
 * Очистить буфер логов
 */
export function clearLogBuffer(): void {
  logBuffer.length = 0;
}

/**
 * Измеритель времени выполнения
 */
export class LogTimer {
  private startTime: number;
  private category: LogCategory;
  private message: string;
  private sessionId?: string;

  constructor(category: LogCategory, message: string, sessionId?: string) {
    this.startTime = Date.now();
    this.category = category;
    this.message = message;
    this.sessionId = sessionId;
  }

  async end(level: LogLevel = "INFO", details?: Record<string, unknown>): Promise<LogEntry | null> {
    const duration = Date.now() - this.startTime;
    return log(level, this.category, this.message, {
      details,
      sessionId: this.sessionId,
      duration,
    });
  }
}

/**
 * Декоратор для логирования функций API
 */
export function withLogging<T extends (...args: unknown[]) => Promise<unknown>>(
  category: LogCategory,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    const timer = new LogTimer(category, `Function: ${fn.name || "anonymous"}`);
    try {
      const result = await fn(...args);
      await timer.end("DEBUG", { args: args.length, success: true });
      return result;
    } catch (error) {
      await timer.end("ERROR", {
        args: args.length,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }) as T;
}

// Экспорт типов и констант
export const LOG_LEVELS: LogLevel[] = ["ERROR", "WARN", "INFO", "DEBUG"];
export const LOG_CATEGORIES: LogCategory[] = [
  "SYSTEM",
  "API",
  "LLM",
  "GAME",
  "DATABASE",
  "UI",
  "AUTH",
  "CHEATS",
  "TECHNIQUE_POOL",
  "UNKNOWN",
];
