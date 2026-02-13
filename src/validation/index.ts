/**
 * Модуль валидации
 * Экспорт всех схем Zod
 */

// Схемы чата
export {
  SessionIdSchema,
  MessageSchema,
  ChatRequestSchema,
  ChatResponseSchema,
  WorldCheckRequestSchema,
  WorldRestartRequestSchema,
  TimeAdvanceSchema,
  UpdatedTimeSchema,
  CharacterStateSchema,
  safeParse,
  formatValidationErrors,
  type ChatRequest,
  type ChatResponse,
  type CharacterState,
  type TimeAdvance,
  type UpdatedTime,
} from './schemas/chat.schema';

// Схемы игры
export {
  StartVariantSchema,
  StartGameRequestSchema,
  LoadGameRequestSchema,
  SaveGameRequestSchema,
  GameStateRequestSchema,
  CustomConfigSchema,
  StartGameResponseSchema,
  LoadGameResponseSchema,
  SaveDataSchema,
  SessionResponseSchema,
  CharacterResponseSchema,
  type StartGameRequest,
  type LoadGameRequest,
  type SaveGameRequest,
  type GameStateRequest,
  type CustomConfig,
  type SaveData,
  type StartGameResponse,
  type LoadGameResponse,
  type CharacterResponse,
  type SessionResponse,
} from './schemas/game.schema';

// Схемы персонажа
export {
  CharacterIdSchema,
  LocationIdSchema,
  SectIdSchema,
  CultivationLevelSchema,
  CultivationSubLevelSchema,
  PercentageSchema,
  UpdateCharacterSchema,
  CreateCharacterSchema,
  UpdateStatsSchema,
  UpdateQiSchema,
  UpdatePhysiologySchema,
  UpdateCultivationSchema,
  BreakthroughValidationSchema,
  MeditationValidationSchema,
  asCharacterId,
  asLocationId,
  isCharacterId,
  asPercentage,
  calculateEffectiveLevel,
  type CharacterId,
  type LocationId,
  type SectId,
  type CultivationLevel,
  type CultivationSubLevel,
  type Percentage,
  type UpdateCharacter,
  type CreateCharacter,
} from './schemas/character.schema';
