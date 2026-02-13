/**
 * Схемы валидации для игровых действий
 * Zod schemas for Game API validation
 */

import { z } from 'zod';

// ==================== ВАРИАНТЫ СТАРТА ====================

/**
 * Варианты старта игры
 * 1 - В секте (амнезия, кандидат)
 * 2 - Свободный старт (случайная локация)
 * 3 - Кастомный (полный контроль)
 */
export const StartVariantSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
], {
  errorMap: () => ({ message: 'Вариант старта должен быть 1, 2 или 3' }),
});

// ==================== СХЕМЫ ЗАПРОСОВ ====================

/**
 * Схема запроса для старта новой игры
 */
export const StartGameRequestSchema = z.object({
  variant: StartVariantSchema,
  customConfig: z.record(z.string(), z.unknown()).optional(),
  characterName: z.string()
    .min(1, 'Имя не может быть пустым')
    .max(50, 'Имя слишком длинное (макс. 50 символов)')
    .regex(/^[\p{L}\s\-']+$/u, 'Имя может содержать только буквы, пробелы, дефисы и апострофы')
    .optional(),
});

/**
 * Схема запроса для загрузки сохранения
 */
export const LoadGameRequestSchema = z.object({
  sessionId: z.string().cuid('Неверный формат ID сессии'),
});

/**
 * Схема запроса для сохранения игры
 */
export const SaveGameRequestSchema = z.object({
  sessionId: z.string().cuid('Неверный формат ID сессии'),
  isPaused: z.boolean().optional(),
});

/**
 * Схема запроса для получения состояния игры
 */
export const GameStateRequestSchema = z.object({
  sessionId: z.string().cuid('Неверный формат ID сессии'),
});

// ==================== СХЕМЫ КОНФИГУРАЦИИ ====================

/**
 * Схема кастомной конфигурации для старта
 */
export const CustomConfigSchema = z.object({
  // Характеристики
  strength: z.number().min(5).max(20).optional(),
  agility: z.number().min(5).max(20).optional(),
  intelligence: z.number().min(5).max(20).optional(),
  
  // Локация
  locationType: z.enum([
    'mountain', 'forest', 'plains', 'desert', 'sea', 'city'
  ]).optional(),
  
  // Начальные условия
  startWithAmnesia: z.boolean().optional(),
  knowsAboutSystem: z.boolean().optional(),
  
  // Сложность
  difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
});

// ==================== СХЕМЫ ОТВЕТОВ ====================

/**
 * Схема персонажа в ответе
 */
export const CharacterResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().int().positive(),
  cultivationLevel: z.number().int().min(1).max(9),
  cultivationSubLevel: z.number().int().min(0).max(9),
  currentQi: z.number().min(0),
  coreCapacity: z.number().int().positive(),
  accumulatedQi: z.number().min(0),
  health: z.number().min(0).max(100),
  fatigue: z.number().min(0).max(100),
  mentalFatigue: z.number().min(0).max(100),
  hasAmnesia: z.boolean(),
  knowsAboutSystem: z.boolean(),
  currentLocation: z.object({
    id: z.string(),
    name: z.string(),
    qiDensity: z.number().positive(),
    terrainType: z.string(),
    distanceFromCenter: z.number().min(0),
  }).nullable().optional(),
});

/**
 * Схема сессии в ответе
 */
export const SessionResponseSchema = z.object({
  id: z.string(),
  character: CharacterResponseSchema,
  worldYear: z.number().int().positive(),
  worldMonth: z.number().int().min(1).max(12),
  worldDay: z.number().int().min(1).max(30),
  worldHour: z.number().int().min(0).max(23),
  worldMinute: z.number().int().min(0).max(59),
  isPaused: z.boolean(),
  daysSinceStart: z.number().int().min(0),
});

/**
 * Схема ответа для старта игры
 */
export const StartGameResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  session: SessionResponseSchema.optional(),
  openingNarration: z.string().optional(),
});

/**
 * Схема ответа для загрузки игры
 */
export const LoadGameResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  session: z.object({
    character: CharacterResponseSchema,
    worldTime: z.object({
      year: z.number(),
      month: z.number(),
      day: z.number(),
      hour: z.number(),
      minute: z.number(),
      formatted: z.string(),
      season: z.string(),
    }),
    recentMessages: z.array(z.object({
      id: z.string(),
      type: z.string(),
      sender: z.string().nullable(),
      content: z.string(),
      createdAt: z.string(),
    })),
    isPaused: z.boolean(),
    daysSinceStart: z.number(),
  }).optional(),
});

// ==================== СХЕМЫ СОХРАНЕНИЙ ====================

/**
 * Схема данных сохранения для списка
 */
export const SaveDataSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  worldId: z.string(),
  worldName: z.string(),
  startVariant: z.number().int().min(1).max(3),
  startType: z.string(),
  startTypeLabel: z.string(),
  worldYear: z.number().int(),
  worldMonth: z.number().int(),
  worldDay: z.number().int(),
  worldHour: z.number().int(),
  worldMinute: z.number().int(),
  daysSinceStart: z.number().int(),
  character: z.object({
    id: z.string(),
    name: z.string(),
    age: z.number().int(),
    cultivationLevel: z.number().int(),
    cultivationSubLevel: z.number().int(),
    currentQi: z.number(),
    coreCapacity: z.number().int(),
    health: z.number(),
    fatigue: z.number(),
    mentalFatigue: z.number(),
  }),
});

// ==================== ТИПЫ ====================

export type StartGameRequest = z.infer<typeof StartGameRequestSchema>;
export type LoadGameRequest = z.infer<typeof LoadGameRequestSchema>;
export type SaveGameRequest = z.infer<typeof SaveGameRequestSchema>;
export type GameStateRequest = z.infer<typeof GameStateRequestSchema>;
export type CustomConfig = z.infer<typeof CustomConfigSchema>;
export type SaveData = z.infer<typeof SaveDataSchema>;
export type StartGameResponse = z.infer<typeof StartGameResponseSchema>;
export type LoadGameResponse = z.infer<typeof LoadGameResponseSchema>;
export type CharacterResponse = z.infer<typeof CharacterResponseSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
