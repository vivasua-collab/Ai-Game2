/**
 * JSON Utilities
 *
 * Безопасные функции для работы с JSON данными из БД
 */

/**
 * Безопасно распарсить JSON строку
 *
 * @param json - JSON строка или null
 * @param fallback - Значение по умолчанию при ошибке
 * @returns Распарсенное значение или fallback
 */
export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('[safeJsonParse] Failed to parse JSON:', {
      json: json.substring(0, 100) + (json.length > 100 ? '...' : ''),
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

/**
 * Безопасно сериализовать значение в JSON
 *
 * @param value - Значение для сериализации
 * @returns JSON строка или null при ошибке
 */
export function safeJsonStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('[safeJsonStringify] Failed to stringify:', {
      valueType: typeof value,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Проверить является ли строка валидным JSON
 */
export function isValidJson(json: string): boolean {
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}
