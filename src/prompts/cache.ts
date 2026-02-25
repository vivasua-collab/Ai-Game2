/**
 * Кэш промптов
 *
 * Кэширует собранные промпты для:
 * - Избежания повторной сборки
 * - Отправки system prompt только один раз за сессию
 * - Сокращения токенов при повторных запросах
 */

// Типы
export interface CachedPrompt {
  id: string;
  content: string;
  tokenCount: number;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  metadata?: Record<string, unknown>;
}

export interface SessionPromptCache {
  sessionId: string;
  systemPromptId: string | null;
  systemPromptSent: boolean;
  createdAt: Date;
}

// Глобальный кэш промптов
const promptCache = new Map<string, CachedPrompt>();

// Кэш сессий (для отслеживания отправки system prompt)
const sessionCache = new Map<string, SessionPromptCache>();

// Максимальный размер кэша (количество промптов)
const MAX_CACHE_SIZE = 100;

// Время жизни кэша (миллисекунды)
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

/**
 * Генерация уникального ID для промпта
 */
function generatePromptId(content: string, metadata?: Record<string, unknown>): string {
  // Простой хэш на основе содержимого
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const metadataHash = metadata ? JSON.stringify(metadata).length : 0;
  return `prompt_${Math.abs(hash)}_${metadataHash}`;
}

/**
 * Подсчёт токенов (приблизительный)
 */
function countTokens(text: string): number {
  const russianChars = (text.match(/[а-яёА-ЯЁ]/g) || []).length;
  const otherChars = text.length - russianChars;
  return Math.ceil(russianChars / 2 + otherChars / 4);
}

/**
 * Очистка устаревших записей
 */
function cleanupExpired(): void {
  const now = Date.now();

  for (const [id, prompt] of promptCache.entries()) {
    if (now - prompt.createdAt.getTime() > CACHE_TTL) {
      promptCache.delete(id);
    }
  }

  for (const [sessionId, session] of sessionCache.entries()) {
    if (now - session.createdAt.getTime() > CACHE_TTL) {
      sessionCache.delete(sessionId);
    }
  }
}

/**
 * Получить или создать кэшированный промпт
 */
export function getOrSetPrompt(
  content: string,
  metadata?: Record<string, unknown>
): CachedPrompt {
  cleanupExpired();

  const id = generatePromptId(content, metadata);

  // Проверяем кэш
  if (promptCache.has(id)) {
    const cached = promptCache.get(id)!;
    cached.lastAccessedAt = new Date();
    cached.accessCount++;
    return cached;
  }

  // Проверяем размер кэша
  if (promptCache.size >= MAX_CACHE_SIZE) {
    // Удаляем самые старые/неиспользуемые
    const entries = Array.from(promptCache.entries());
    entries.sort((a, b) => a[1].lastAccessedAt.getTime() - b[1].lastAccessedAt.getTime());

    const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2));
    for (const [key] of toRemove) {
      promptCache.delete(key);
    }
  }

  // Создаём новую запись
  const cached: CachedPrompt = {
    id,
    content,
    tokenCount: countTokens(content),
    createdAt: new Date(),
    lastAccessedAt: new Date(),
    accessCount: 1,
    metadata,
  };

  promptCache.set(id, cached);
  return cached;
}

/**
 * Инициализация сессии
 */
export function initSession(sessionId: string): SessionPromptCache {
  cleanupExpired();

  if (sessionCache.has(sessionId)) {
    return sessionCache.get(sessionId)!;
  }

  const session: SessionPromptCache = {
    sessionId,
    systemPromptId: null,
    systemPromptSent: false,
    createdAt: new Date(),
  };

  sessionCache.set(sessionId, session);
  return session;
}

/**
 * Привязка system prompt к сессии
 */
export function bindSystemPrompt(
  sessionId: string,
  promptId: string
): void {
  const session = initSession(sessionId);
  session.systemPromptId = promptId;
}

/**
 * Отметить system prompt как отправленный
 */
export function markSystemPromptSent(sessionId: string): void {
  const session = initSession(sessionId);
  session.systemPromptSent = true;
}

/**
 * Проверить, был ли отправлен system prompt
 */
export function wasSystemPromptSent(sessionId: string): boolean {
  const session = sessionCache.get(sessionId);
  return session?.systemPromptSent ?? false;
}

/**
 * Получить system prompt для сессии
 */
export function getSystemPromptForSession(sessionId: string): CachedPrompt | null {
  const session = sessionCache.get(sessionId);
  if (!session?.systemPromptId) {
    return null;
  }
  return promptCache.get(session.systemPromptId) ?? null;
}

/**
 * Очистка кэша сессии
 */
export function clearSessionCache(sessionId: string): void {
  sessionCache.delete(sessionId);
}

/**
 * Полная очистка кэша
 */
export function clearAllCaches(): void {
  promptCache.clear();
  sessionCache.clear();
}

/**
 * Статистика кэша
 */
export function getCacheStats(): {
  promptCount: number;
  sessionCount: number;
  totalTokens: number;
  totalAccessCount: number;
  hitRate: number;
} {
  let totalTokens = 0;
  let totalAccessCount = 0;
  let totalHits = 0;

  for (const prompt of promptCache.values()) {
    totalTokens += prompt.tokenCount;
    totalAccessCount += prompt.accessCount;
    if (prompt.accessCount > 1) {
      totalHits += prompt.accessCount - 1;
    }
  }

  const hitRate = totalAccessCount > 0
    ? Math.round((totalHits / totalAccessCount) * 100)
    : 0;

  return {
    promptCount: promptCache.size,
    sessionCount: sessionCache.size,
    totalTokens,
    totalAccessCount,
    hitRate,
  };
}

/**
 * Экспорт для мониторинга
 */
export function getCacheEntries(): { prompts: CachedPrompt[]; sessions: SessionPromptCache[] } {
  return {
    prompts: Array.from(promptCache.values()),
    sessions: Array.from(sessionCache.values()),
  };
}
