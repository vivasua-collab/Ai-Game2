/**
 * Zod Validation Schemas for API Routes
 *
 * Provides type-safe validation for all incoming API requests.
 * Uses safeParse to avoid throwing errors and return proper error messages.
 */

import { z } from 'zod';

// ==================== CHAT / MESSAGE ====================

/**
 * Schema for sending a message in the game chat
 */
export const sendMessageSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  message: z.string()
    .min(1, "Message is required")
    .max(4000, "Message is too long (max 4000 characters)"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ==================== GAME START ====================

/**
 * Schema for starting a new game
 */
export const startGameSchema = z.object({
  variant: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ], {
    errorMap: () => ({ message: "Variant must be 1, 2, or 3" }),
  }),
  customConfig: z.record(z.unknown()).optional(),
  characterName: z.string()
    .min(1, "Character name must be at least 1 character")
    .max(50, "Character name is too long (max 50 characters)")
    .optional(),
});

export type StartGameInput = z.infer<typeof startGameSchema>;

// ==================== GAME SAVE ====================

/**
 * Schema for saving game state
 */
export const saveGameSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  isPaused: z.boolean().optional(),
});

export type SaveGameInput = z.infer<typeof saveGameSchema>;

// ==================== GAME STATE / LOAD ====================

/**
 * Schema for loading game state (query params)
 */
export const loadGameSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

export type LoadGameInput = z.infer<typeof loadGameSchema>;

// ==================== LLM SETTINGS ====================

/**
 * Schema for LLM settings update
 */
export const llmSettingsSchema = z.object({
  provider: z.enum(['zai', 'ollama', 'openai', 'custom']).optional(),
  model: z.string().max(100).optional(),
  endpoint: z.string().url("Invalid endpoint URL").optional(),
  apiKey: z.string().max(500).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(100000).optional(),
});

export type LLMSettingsInput = z.infer<typeof llmSettingsSchema>;

// ==================== HELPER FUNCTIONS ====================

/**
 * Validates data against a Zod schema and returns a typed result.
 * Does not throw - returns success/error object.
 */
export function validateOrError<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; errors: z.ZodError['errors'] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors;
  const errorMessage = errors
    .map(e => `${e.path.join('.') || 'value'}: ${e.message}`)
    .join('; ');

  return { success: false, error: errorMessage, errors };
}

/**
 * Validates data and throws a formatted error if invalid.
 * Useful for API routes that want to return 400 on validation failure.
 */
export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMessage = result.error.errors
      .map(e => `${e.path.join('.') || 'value'}: ${e.message}`)
      .join('; ');
    throw new Error(`Validation error: ${errorMessage}`);
  }
  return result.data;
}

/**
 * Creates a standardized validation error response
 */
export function validationErrorResponse(error: string) {
  return {
    success: false,
    error,
    component: 'VALIDATION',
  };
}

// ==================== QUERY PARAM HELPERS ====================

/**
 * Schema for parsing query params (strings from URL)
 */
export const queryParamsSchema = z.object({
  sessionId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type QueryParams = z.infer<typeof queryParamsSchema>;

/**
 * Validates and coerces query parameters from URL search params
 */
export function parseQueryParams(params: URLSearchParams): QueryParams {
  const result = queryParamsSchema.safeParse({
    sessionId: params.get('sessionId') || undefined,
    limit: params.get('limit') || undefined,
    offset: params.get('offset') || undefined,
  });

  return result.success ? result.data : { limit: 50, offset: 0 };
}
