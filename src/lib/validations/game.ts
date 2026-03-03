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
 * Schema for custom game configuration
 * Validates all custom start parameters
 */
export const customConfigSchema = z.object({
  location: z.string().max(200).optional(),
  age: z.number().int().min(10).max(1000).optional(),
  coreCapacity: z.number().int().min(100).max(1000000).optional(),
  knowsAboutSystem: z.boolean().optional(),
  // startQi удалён - игрок всегда начинает с 0 Qi (дизайн игры культивации)
  strength: z.number().min(1).max(100).optional(),
  agility: z.number().min(1).max(100).optional(),
  intelligence: z.number().min(1).max(100).optional(),
});

export type CustomConfig = z.infer<typeof customConfigSchema>;

/**
 * Schema for starting a new game
 */
export const startGameSchema = z.object({
  variant: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
  customConfig: customConfigSchema.optional(),
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

// ==================== CHEATS ====================

/**
 * Допустимые чит-команды
 */
export const cheatCommands = [
  'set_level', 'breakthrough', 'add_qi', 'set_qi', 'full_restore',
  'god_mode', 'add_stat', 'set_stat', 'give_technique',
  'gen_techniques', 'reset_techniques', 'add_fatigue', 'reset_fatigue',
  'add_insight', 'set_time', 'add_resources'
] as const;

/**
 * Schema для API чит-команд
 */
export const cheatRequestSchema = z.object({
  command: z.enum(cheatCommands),
  characterId: z.string().min(1, "characterId is required"),
  params: z.record(z.string(), z.unknown()).optional().default({}),
});

export type CheatRequestInput = z.infer<typeof cheatRequestSchema>;

// ==================== INVENTORY ====================

/**
 * Schema для GET инвентаря (query params)
 */
export const inventoryQuerySchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
});

export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>;

/**
 * Schema для POST добавления предмета
 */
export const inventoryAddSchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
  presetId: z.string().optional(),
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['material', 'artifact', 'consumable', 'equipment', 'spirit_stone']).optional(),
  quantity: z.number().int().min(1).max(999).optional().default(1),
  rarity: z.enum(['common', 'uncommon', 'rare', 'legendary']).optional(),
  description: z.string().max(500).optional(),
  effects: z.record(z.string(), z.number()).optional(),
});

export type InventoryAddInput = z.infer<typeof inventoryAddSchema>;

/**
 * Schema для использования предмета
 */
export const inventoryUseSchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
  itemId: z.string().min(1, "itemId is required"),
});

export type InventoryUseInput = z.infer<typeof inventoryUseSchema>;

// ==================== TECHNIQUES POOL ====================

/**
 * Schema для GET пула техник (query params)
 */
export const techniquePoolQuerySchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
});

export type TechniquePoolQueryInput = z.infer<typeof techniquePoolQuerySchema>;

/**
 * Schema для генерации пула техник (POST)
 */
export const techniquePoolGenerateSchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
  targetLevel: z.coerce.number().int().min(1).max(9),
  triggerType: z.enum(['breakthrough', 'manual', 'event', 'reward']),
  count: z.coerce.number().int().min(1).max(10).optional(),
  preferredType: z.string().optional(),
  preferredElement: z.string().optional(),
});

export type TechniquePoolGenerateInput = z.infer<typeof techniquePoolGenerateSchema>;

/**
 * Schema для выбора техники из пула (PUT)
 */
export const techniquePoolActionSchema = z.object({
  action: z.enum(['reveal', 'select']),
  poolItemId: z.string().min(1, "poolItemId is required"),
  characterId: z.string().optional(), // Required for 'select' action
}).refine(
  (data) => data.action !== 'select' || data.characterId,
  { message: "characterId is required for 'select' action" }
);

export type TechniquePoolActionInput = z.infer<typeof techniquePoolActionSchema>;

// ==================== DATABASE MIGRATE ====================

/**
 * Schema для миграции БД (POST)
 */
export const databaseMigrateSchema = z.object({
  action: z.enum(['init', 'migrate', 'backup', 'restore']).default('migrate'),
  backupName: z.string().optional(), // Required for 'restore' action
}).refine(
  (data) => data.action !== 'restore' || data.backupName,
  { message: "backupName is required for 'restore' action" }
);

export type DatabaseMigrateInput = z.infer<typeof databaseMigrateSchema>;

// ==================== LOGS ====================

/**
 * Schema для GET логов (query params)
 */
export const logsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
  category: z.string().optional(),
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).optional(),
});

export type LogsQueryInput = z.infer<typeof logsQuerySchema>;

/**
 * Schema для управления логами (POST)
 */
export const logsActionSchema = z.object({
  action: z.enum(['toggle', 'setLevel', 'clearBuffer', 'clearDatabase']),
  enabled: z.boolean().optional(), // For 'toggle'
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).optional(), // For 'setLevel'
});

export type LogsActionInput = z.infer<typeof logsActionSchema>;

/**
 * Schema для DELETE логов (query params)
 */
export const logsDeleteSchema = z.object({
  all: z.coerce.boolean().optional().default(false),
  olderThan: z.string().optional(), // ISO date string
});

export type LogsDeleteInput = z.infer<typeof logsDeleteSchema>;

// ==================== CHARACTER DATA ====================

/**
 * Schema для GET данных персонажа (query params)
 */
export const characterDataQuerySchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
  type: z.enum(['techniques', 'skills', 'all']).optional().default('all'),
});

export type CharacterDataQueryInput = z.infer<typeof characterDataQuerySchema>;

// ==================== HELPER FUNCTIONS ====================

/**
 * Validates data against a Zod schema and returns a typed result.
 * Does not throw - returns success/error object.
 */
export function validateOrError<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; errors: z.ZodError['issues'] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues;
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
    const errorMessage = result.error.issues
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
