/**
 * Система промптов
 *
 * Экспортирует все модули для работы с промптами:
 * - loader: загрузка шаблонов из .md файлов
 * - builder: сборка промптов с плейсхолдерами
 * - optimizer: сжатие для экономии токенов
 * - cache: кэширование собранных промптов
 */

export * from './loader';
export * from './builder';
export * from './optimizer';
export * from './cache';

// Реэкспорт часто используемых функций
import { getTemplateContent, loadTemplate } from './loader';
import {
  buildPrompt,
  buildGameMasterPrompt,
  buildStartPrompt,
  buildTechniqueGenerationPrompt,
  buildCharacterContextPrompt,
  replacePlaceholders,
} from './builder';
import { optimizePrompt, estimateTokens, getOptimizationStats } from './optimizer';
import {
  getOrSetPrompt,
  initSession,
  bindSystemPrompt,
  markSystemPromptSent,
  wasSystemPromptSent,
  getSystemPromptForSession,
  getCacheStats,
} from './cache';

// Удобный объект для работы с промптами
export const Prompts = {
  // Загрузка
  load: loadTemplate,
  get: getTemplateContent,

  // Сборка
  build: buildPrompt,
  buildGM: buildGameMasterPrompt,
  buildStart: buildStartPrompt,
  buildTechniques: buildTechniqueGenerationPrompt,
  buildCharacter: buildCharacterContextPrompt,
  inject: replacePlaceholders,

  // Оптимизация
  optimize: optimizePrompt,
  tokens: estimateTokens,
  stats: getOptimizationStats,

  // Кэширование
  cache: getOrSetPrompt,
  session: initSession,
  bindSystem: bindSystemPrompt,
  markSent: markSystemPromptSent,
  wasSent: wasSystemPromptSent,
  getSystem: getSystemPromptForSession,
  cacheStats: getCacheStats,
};
