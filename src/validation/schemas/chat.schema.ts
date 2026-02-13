/**
 * Схемы валидации для API чата
 * Zod schemas for Chat API validation
 */

import { z } from 'zod';

// ==================== БАЗОВЫЕ СХЕМЫ ====================

/**
 * Валидация ID сессии (CUID формат)
 */
export const SessionIdSchema = z.string().cuid('Неверный формат ID сессии');

/**
 * Валидация сообщения пользователя
 */
export const MessageSchema = z.string()
  .min(1, 'Сообщение не может быть пустым')
  .max(10000, 'Сообщение слишком длинное (макс. 10000 символов)')
  .trim();

// ==================== СХЕМЫ ЗАПРОСОВ ====================

/**
 * Схема запроса для API чата
 */
export const ChatRequestSchema = z.object({
  sessionId: SessionIdSchema,
  message: MessageSchema,
});

/**
 * Схема запроса для проверки мира (--ПМ)
 */
export const WorldCheckRequestSchema = z.object({
  sessionId: SessionIdSchema,
});

/**
 * Схема запроса для перезапуска мира
 */
export const WorldRestartRequestSchema = z.object({
  sessionId: SessionIdSchema,
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Требуется подтверждение перезапуска' }),
  }),
});

// ==================== СХЕМЫ ОТВЕТОВ ====================

/**
 * Схема продвижения времени
 */
export const TimeAdvanceSchema = z.object({
  minutes: z.number().int().min(0).optional(),
  hours: z.number().int().min(0).optional(),
  days: z.number().int().min(0).optional(),
});

/**
 * Схема обновлённого времени
 */
export const UpdatedTimeSchema = z.object({
  year: z.number().int().min(0),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(30),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  daysSinceStart: z.number().int().min(0),
});

/**
 * Схема состояния персонажа (частичная)
 */
export const CharacterStateSchema = z.object({
  currentQi: z.number().min(0).optional(),
  accumulatedQi: z.number().min(0).optional(),
  fatigue: z.number().min(0).max(100).optional(),
  mentalFatigue: z.number().min(0).max(100).optional(),
  health: z.number().min(0).max(100).optional(),
  cultivationLevel: z.number().int().min(1).max(9).optional(),
  cultivationSubLevel: z.number().int().min(0).max(9).optional(),
  coreCapacity: z.number().int().positive().optional(),
});

/**
 * Схема ответа сервера
 */
export const ChatResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  response: z.object({
    type: z.enum(['narration', 'system', 'error', 'interruption']),
    content: z.string(),
    characterState: CharacterStateSchema.optional(),
    timeAdvance: TimeAdvanceSchema.optional(),
    requiresRestart: z.boolean().optional(),
    interruption: z.object({
      event: z.unknown(),
      options: z.array(z.unknown()),
    }).optional(),
  }),
  updatedTime: UpdatedTimeSchema.nullable(),
});

// ==================== ТИПЫ ====================

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type CharacterState = z.infer<typeof CharacterStateSchema>;
export type TimeAdvance = z.infer<typeof TimeAdvanceSchema>;
export type UpdatedTime = z.infer<typeof UpdatedTimeSchema>;

// ==================== УТИЛИТЫ ====================

/**
 * Безопасный парсинг с логированием ошибок
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details?: unknown } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    error: 'Validation failed',
    details: result.error.flatten(),
  };
}

/**
 * Форматирование ошибок валидации для ответа API
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }
  
  return formatted;
}
