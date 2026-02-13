/**
 * Схемы валидации для сущности персонажа
 * Zod schemas for Character entity validation
 */

import { z } from 'zod';

// ==================== BRANDED TYPES ====================

/**
 * Branded type для ID персонажа
 * Предотвращает случайную передачу sessionId вместо characterId
 */
export const CharacterIdSchema = z.string().cuid().brand<'CharacterId'>();

/**
 * Branded type для ID локации
 */
export const LocationIdSchema = z.string().cuid().brand<'LocationId'>();

/**
 * Branded type для ID секты
 */
export const SectIdSchema = z.string().cuid().brand<'SectId'>();

// ==================== VALUE OBJECTS ====================

/**
 * Уровень культивации (1-9)
 */
export const CultivationLevelSchema = z.number()
  .int()
  .min(1, 'Уровень культивации должен быть от 1 до 9')
  .max(9, 'Уровень культивации должен быть от 1 до 9');

/**
 * Под-уровень культивации (0-9)
 */
export const CultivationSubLevelSchema = z.number()
  .int()
  .min(0, 'Под-уровень должен быть от 0 до 9')
  .max(9, 'Под-уровень должен быть от 0 до 9');

/**
 * Процент (0-100)
 */
export const PercentageSchema = z.number()
  .min(0, 'Значение должно быть от 0 до 100')
  .max(100, 'Значение должно быть от 0 до 100');

/**
 * Положительное число
 */
export const PositiveNumberSchema = z.number().positive();

/**
 * Положительное целое
 */
export const PositiveIntSchema = z.number().int().positive();

/**
 * Непустая строка
 */
export const NonEmptyStringSchema = z.string().min(1).trim();

// ==================== СХЕМЫ ОБНОВЛЕНИЯ ====================

/**
 * Схема обновления характеристик
 */
export const UpdateStatsSchema = z.object({
  strength: z.number().min(1).max(100).optional(),
  agility: z.number().min(1).max(100).optional(),
  intelligence: z.number().min(1).max(100).optional(),
  conductivity: z.number().min(0).max(10).optional(),
});

/**
 * Схема обновления Ци
 */
export const UpdateQiSchema = z.object({
  currentQi: z.number().min(0).optional(),
  accumulatedQi: z.number().min(0).optional(),
  coreCapacity: PositiveIntSchema.optional(),
});

/**
 * Схема обновления физиологии
 */
export const UpdatePhysiologySchema = z.object({
  health: PercentageSchema.optional(),
  fatigue: PercentageSchema.optional(),
  mentalFatigue: PercentageSchema.optional(),
});

/**
 * Схема обновления культивации
 */
export const UpdateCultivationSchema = z.object({
  cultivationLevel: CultivationLevelSchema.optional(),
  cultivationSubLevel: CultivationSubLevelSchema.optional(),
});

/**
 * Полная схема обновления персонажа
 */
export const UpdateCharacterSchema = z.object({
  name: NonEmptyStringSchema.max(50).optional(),
  ...UpdateStatsSchema.shape,
  ...UpdateQiSchema.shape,
  ...UpdatePhysiologySchema.shape,
  ...UpdateCultivationSchema.shape,
  hasAmnesia: z.boolean().optional(),
  knowsAboutSystem: z.boolean().optional(),
  sectRole: z.string().nullable().optional(),
  currentLocationId: LocationIdSchema.nullable().optional(),
  sectId: SectIdSchema.nullable().optional(),
});

// ==================== СХЕМЫ СОЗДАНИЯ ====================

/**
 * Схема создания персонажа (для тестов и сидирования)
 */
export const CreateCharacterSchema = z.object({
  name: NonEmptyStringSchema.max(50),
  age: z.number().int().min(10).max(1000),
  
  // Характеристики
  strength: z.number().min(1).max(100).default(10),
  agility: z.number().min(1).max(100).default(10),
  intelligence: z.number().min(1).max(100).default(10),
  conductivity: z.number().min(0).max(10).default(0),
  
  // Культивация
  cultivationLevel: CultivationLevelSchema.default(1),
  cultivationSubLevel: CultivationSubLevelSchema.default(0),
  
  // Ядро
  coreCapacity: PositiveIntSchema.default(1000),
  coreQuality: z.number().min(0.1).max(10).default(1),
  currentQi: z.number().min(0).default(0),
  accumulatedQi: z.number().min(0).default(0),
  
  // Физиология
  health: PercentageSchema.default(100),
  fatigue: PercentageSchema.default(0),
  mentalFatigue: PercentageSchema.default(0),
  
  // Память
  hasAmnesia: z.boolean().default(true),
  knowsAboutSystem: z.boolean().default(false),
});

// ==================== ВАЛИДАТОРЫ ====================

/**
 * Валидация прорыва
 */
export const BreakthroughValidationSchema = z.object({
  currentLevel: CultivationLevelSchema,
  currentSubLevel: CultivationSubLevelSchema,
  accumulatedQi: z.number().min(0),
  coreCapacity: PositiveIntSchema,
}).refine(
  (data) => {
    // Проверяем, достаточно ли накопленной Ци
    const requiredFills = data.currentLevel * 10 + data.currentSubLevel;
    const currentFills = Math.floor(data.accumulatedQi / data.coreCapacity);
    return currentFills >= requiredFills;
  },
  {
    message: 'Недостаточно накопленной Ци для прорыва',
  }
);

/**
 * Валидация медитации
 */
export const MeditationValidationSchema = z.object({
  characterId: CharacterIdSchema,
  duration: z.number().int().min(1).max(480), // до 8 часов
  type: z.enum(['accumulation', 'breakthrough']),
}).refine(
  (data) => {
    // Прорыв требует минимум 30 минут
    if (data.type === 'breakthrough' && data.duration < 30) {
      return false;
    }
    return true;
  },
  {
    message: 'Прорыв требует минимум 30 минут медитации',
  }
);

// ==================== ТИПЫ ====================

export type CharacterId = z.infer<typeof CharacterIdSchema>;
export type LocationId = z.infer<typeof LocationIdSchema>;
export type SectId = z.infer<typeof SectIdSchema>;
export type CultivationLevel = z.infer<typeof CultivationLevelSchema>;
export type CultivationSubLevel = z.infer<typeof CultivationSubLevelSchema>;
export type Percentage = z.infer<typeof PercentageSchema>;
export type UpdateCharacter = z.infer<typeof UpdateCharacterSchema>;
export type CreateCharacter = z.infer<typeof CreateCharacterSchema>;

// ==================== УТИЛИТЫ ====================

/**
 * Создание CharacterId из строки
 */
export function asCharacterId(id: string): CharacterId {
  return CharacterIdSchema.parse(id);
}

/**
 * Создание LocationId из строки
 */
export function asLocationId(id: string): LocationId {
  return LocationIdSchema.parse(id);
}

/**
 * Проверка, является ли строка CharacterId
 */
export function isCharacterId(value: unknown): value is CharacterId {
  return CharacterIdSchema.safeParse(value).success;
}

/**
 * Преобразование числа в Percentage с валидацией
 */
export function asPercentage(value: number): Percentage {
  return PercentageSchema.parse(value);
}

/**
 * Расчёт эффективного под-уровня (например, 6.5)
 */
export function calculateEffectiveLevel(
  level: CultivationLevel,
  subLevel: CultivationSubLevel
): number {
  return level + subLevel / 10;
}
