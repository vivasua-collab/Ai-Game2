/**
 * Валидация размера запроса
 * 
 * Защита от DoS атак через ограничение размера payload
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Лимиты размера запроса в байтах
 */
export const REQUEST_SIZE_LIMITS = {
  /** Дефолтный лимит: 1MB */
  DEFAULT: 1024 * 1024,
  /** Чат сообщения: 1MB (длинные сообщения + история) */
  CHAT: 1024 * 1024,
  /** Запуск игры: 1MB (кастомные конфиги) */
  GAME_START: 1024 * 1024,
  /** Передвижение: 100KB (минимальный payload) */
  MOVEMENT: 100 * 1024,
  /** Техники: 100KB */
  TECHNIQUE: 100 * 1024,
  /** Инвентарь: 256KB */
  INVENTORY: 256 * 1024,
  /** Медитация: 100KB */
  MEDITATION: 100 * 1024,
} as const;

/**
 * Результат валидации размера запроса
 */
export interface RequestSizeValidationResult {
  /** Прошла ли валидация */
  valid: boolean;
  /** Размер запроса в байтах */
  contentLength: number;
  /** Максимальный разрешённый размер */
  maxSize: number;
}

/**
 * Проверить размер запроса по заголовку Content-Length
 * 
 * @param request - Next.js запрос
 * @param maxSize - Максимальный размер в байтах
 * @returns Результат валидации
 */
export function validateRequestSize(
  request: NextRequest,
  maxSize: number = REQUEST_SIZE_LIMITS.DEFAULT
): RequestSizeValidationResult {
  const contentLengthHeader = request.headers.get('content-length');
  const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
  
  // Если Content-Length отсутствует, считаем что валидация пройдена
  // (Next.js прочитает тело и проверит размер при парсинге)
  if (!contentLengthHeader || isNaN(contentLength)) {
    return {
      valid: true,
      contentLength: 0,
      maxSize,
    };
  }
  
  return {
    valid: contentLength <= maxSize,
    contentLength,
    maxSize,
  };
}

/**
 * Создать ответ с ошибкой 413 Payload Too Large
 * 
 * @param contentLength - Размер запроса
 * @param maxSize - Максимальный размер
 * @returns JSON ответ с ошибкой
 */
export function payloadTooLargeResponse(
  contentLength: number,
  maxSize: number
): NextResponse {
  return NextResponse.json(
    {
      error: "Payload Too Large",
      message: `Размер запроса (${formatBytes(contentLength)}) превышает лимит (${formatBytes(maxSize)})`,
      contentLength,
      maxSize,
    },
    { status: 413 }
  );
}

/**
 * Форматирование размера в читаемый вид
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
