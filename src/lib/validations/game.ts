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
  action: z.enum(['toggle', 'setLevel', 'clearBuffer', 'clearQiBuffer', 'clearAll', 'clearDatabase']),
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

// ==================== GAME MOVE ====================

/**
 * Schema для перемещения персонажа (time tick movement)
 * Каждый tile = 1 tick (1 минута игрового времени)
 */
export const gameMoveSchema = z.object({
  sessionId: z.string().min(1, "sessionId обязателен"),
  tilesMoved: z.number()
    .int("tilesMoved должно быть целым числом")
    .min(0, "tilesMoved не может быть отрицательным")
    .max(1000, "tilesMoved не может превышать 1000"),
});

export type GameMoveInput = z.infer<typeof gameMoveSchema>;

// ==================== REST ====================

/**
 * Schema для отдыха
 * - light: лёгкий отдых (от 1 минуты)
 * - sleep: сон (от 4 часов = 240 минут)
 */
export const restSchema = z.object({
  characterId: z.string().min(1, "characterId обязателен"),
  durationMinutes: z.number()
    .int("durationMinutes должно быть целым числом")
    .min(1, "Минимальное время отдыха: 1 минута")
    .max(480, "Максимальное время отдыха: 8 часов (480 минут)"),
  restType: z.enum(['light', 'sleep'], {
    errorMap: () => ({ message: "restType должен быть 'light' или 'sleep'" }),
  }),
}).refine(
  (data) => data.restType !== 'sleep' || data.durationMinutes >= 240,
  { message: "Минимальное время сна: 4 часа (240 минут)" }
);

export type RestInput = z.infer<typeof restSchema>;

// ==================== MEDITATION ====================

/**
 * Schema для медитации
 * - accumulation: накопительная медитация (требует durationMinutes)
 * - breakthrough: медитация на прорыв (игнорирует durationMinutes)
 * - conductivity: медитация на проводимость (игнорирует durationMinutes)
 */
export const meditationRequestSchema = z.object({
  characterId: z.string().min(1, "characterId обязателен"),
  durationMinutes: z.number()
    .int("durationMinutes должно быть целым числом")
    .min(1, "Минимальное время медитации: 1 минута")
    .max(480, "Максимальное время медитации: 8 часов (480 минут)")
    .optional(),
  meditationType: z.enum(['accumulation', 'breakthrough', 'conductivity'], {
    errorMap: () => ({ message: "meditationType должен быть 'accumulation', 'breakthrough' или 'conductivity'" }),
  }).optional().default('accumulation'),
  formationId: z.string().optional(),
  formationQuality: z.number().int().min(1).max(5).optional().default(1),
  techniqueId: z.string().optional(),
}).refine(
  (data) => data.meditationType !== 'accumulation' || data.durationMinutes !== undefined,
  { message: "durationMinutes обязательно для накопительной медитации" }
);

export type MeditationRequestInput = z.infer<typeof meditationRequestSchema>;

/**
 * @deprecated Используйте meditationRequestSchema
 */
export const meditationSchema = meditationRequestSchema;

// ==================== CONDITIONS ====================

/**
 * Schema для тика условий
 */
export const conditionsTickSchema = z.object({
  sessionId: z.string().min(1, "sessionId обязателен"),
  ticks: z.number().int().min(1).max(1000).optional().default(1),
});

export type ConditionsTickInput = z.infer<typeof conditionsTickSchema>;

/**
 * Schema для применения состояния (POST /api/conditions)
 */
export const conditionsApplySchema = z.object({
  targetId: z.string().min(1, "targetId обязателен"),
  conditionId: z.string().min(1, "conditionId обязателен"),
  source: z.enum(['technique', 'item', 'environment', 'event', 'system'], {
    errorMap: () => ({ message: "source должен быть одним из: technique, item, environment, event, system" }),
  }),
  sourceId: z.string().optional(),
  value: z.number().optional(),
  duration: z.number().int().positive().optional(),
});

export type ConditionsApplyInput = z.infer<typeof conditionsApplySchema>;

/**
 * Schema для удаления состояния (DELETE /api/conditions)
 */
export const conditionsDeleteSchema = z.object({
  targetId: z.string().min(1, "targetId обязателен"),
  conditionId: z.string().optional(),
  clearAll: z.coerce.boolean().optional().default(false),
  type: z.enum(['buff', 'debuff']).optional(),
}).refine(
  (data) => data.clearAll || data.type || data.conditionId,
  { message: "Необходимо указать conditionId, type или clearAll=true" }
);

export type ConditionsDeleteInput = z.infer<typeof conditionsDeleteSchema>;

// ==================== MAP ====================

/**
 * Schema для map actions
 */
export const mapActionSchema = z.object({
  action: z.enum(['list', 'get', 'create', 'update', 'delete']),
  sessionId: z.string().min(1, "sessionId обязателен"),
  locationId: z.string().optional(),
  locationData: z.object({
    name: z.string().min(1, "Название локации обязательно").max(100),
    description: z.string().max(1000).optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    terrainType: z.string().optional(),
  }).optional(),
});

export type MapActionInput = z.infer<typeof mapActionSchema>;

// ==================== NPC SPAWN ====================

/**
 * Schema для спавна NPC
 */
export const npcSpawnSchema = z.object({
  sessionId: z.string().min(1, "sessionId обязателен"),
  npcId: z.string().min(1, "npcId обязателен"),
  locationId: z.string().min(1, "locationId обязателен"),
  count: z.number().int().min(1).max(10).optional().default(1),
});

export type NpcSpawnInput = z.infer<typeof npcSpawnSchema>;

// ==================== TEMP NPC ====================

/**
 * Schema для GET запросов временных NPC
 * 
 * Примечание: searchParams.get() возвращает null если параметр не найден,
 * поэтому используем nullable() для конвертации null → undefined
 */
export const tempNpcGetSchema = z.object({
  action: z.enum(['list', 'get', 'stats', 'presets']).optional().nullable(),
  sessionId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  npcId: z.string().optional().nullable(),
}).transform(data => ({
  action: data.action ?? undefined,
  sessionId: data.sessionId ?? undefined,
  locationId: data.locationId ?? undefined,
  npcId: data.npcId ?? undefined,
}));

export type TempNpcGetInput = z.infer<typeof tempNpcGetSchema>;

/**
 * Schema для POST запросов временных NPC
 */
export const tempNpcActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('init'),
    sessionId: z.string().min(1, "sessionId обязателен"),
    locationId: z.string().min(1, "locationId обязателен"),
    config: z.string().optional().default('village'),
    playerLevel: z.number().int().min(1).max(9).optional().default(1),
  }),
  z.object({
    action: z.literal('remove'),
    sessionId: z.string().min(1, "sessionId обязателен"),
    npcId: z.string().min(1, "npcId обязателен"),
  }),
  z.object({
    action: z.literal('update'),
    sessionId: z.string().min(1, "sessionId обязателен"),
    npcId: z.string().min(1, "npcId обязателен"),
    updates: z.record(z.unknown()).optional(),
  }),
  z.object({
    action: z.literal('clear'),
    sessionId: z.string().min(1, "sessionId обязателен"),
    locationId: z.string().optional(),
  }),
  z.object({
    action: z.literal('regenerate-positions'),
    sessionId: z.string().min(1, "sessionId обязателен"),
    locationId: z.string().optional(),
    worldWidth: z.number().int().positive().optional(),
    worldHeight: z.number().int().positive().optional(),
  }),
]);

export type TempNpcActionInput = z.infer<typeof tempNpcActionSchema>;

/**
 * @deprecated Используйте tempNpcActionSchema
 */
export const tempNpcSchema = tempNpcActionSchema;

// ==================== CHARACTER DELTA ====================

/**
 * Schema для POST delta обновлений персонажа
 * Добавляет дельту к характеристике
 */
export const characterDeltaPostSchema = z.object({
  characterId: z.string().min(1, "characterId обязателен"),
  statName: z.enum(['strength', 'agility', 'intelligence', 'vitality'], {
    errorMap: () => ({ message: "statName должен быть одним из: strength, agility, intelligence, vitality" }),
  }),
  amount: z.number().positive("amount должно быть положительным числом"),
  source: z.string().optional().default('event_reward'),
});

export type CharacterDeltaPostInput = z.infer<typeof characterDeltaPostSchema>;

/**
 * @deprecated Используйте characterDeltaPostSchema
 */
export const characterDeltaSchema = characterDeltaPostSchema;

// ==================== CHARACTER STATS ====================

/**
 * Schema для GET данных персонажа (query params)
 */
export const characterStatsQuerySchema = z.object({
  characterId: z.string().min(1, "characterId обязателен"),
});

export type CharacterStatsQueryInput = z.infer<typeof characterStatsQuerySchema>;

/**
 * Schema для обновления статов персонажа
 */
export const characterStatsSchema = z.object({
  sessionId: z.string().min(1, "sessionId обязателен"),
  stats: z.object({
    strength: z.number().int().min(1).max(100).optional(),
    agility: z.number().int().min(1).max(100).optional(),
    intelligence: z.number().int().min(1).max(100).optional(),
    vitality: z.number().int().min(1).max(100).optional(),
  }),
});

export type CharacterStatsInput = z.infer<typeof characterStatsSchema>;

// ==================== RELATIONS CHECK ====================

/**
 * Schema для проверки отношений
 */
export const relationsCheckSchema = z.object({
  sessionId: z.string().min(1, "sessionId обязателен"),
  characterId: z.string().min(1, "characterId обязателен"),
  targetId: z.string().min(1, "targetId обязателен"),
  relationType: z.enum(['friend', 'enemy', 'neutral', 'all']).optional().default('all'),
});

export type RelationsCheckInput = z.infer<typeof relationsCheckSchema>;

// ==================== GENERATOR ====================

/**
 * Schema для генераторов
 */
export const generatorActionSchema = z.object({
  action: z.enum(['generate', 'list', 'stats', 'save', 'clear']),
  type: z.enum(['weapon', 'armor', 'accessory', 'charger', 'technique', 'npc', 'formation']).optional(),
  level: z.number().int().min(1).max(9).optional(),
  grade: z.enum(['damaged', 'common', 'refined', 'perfect', 'transcendent']).optional(),
  count: z.number().int().min(1).max(100).optional(),
  mode: z.enum(['replace', 'append']).optional(),
  seed: z.number().optional(),
});

export type GeneratorActionInput = z.infer<typeof generatorActionSchema>;

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
