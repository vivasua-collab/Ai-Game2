/**
 * Системный промпт для ИИ-гейм-мастера
 *
 * НОВОЕ: Использует модульную систему промптов из src/prompts/
 * - Шаблоны в .md файлах (templates/)
 * - Сборка с плейсхолдерами (builder.ts)
 * - Кэширование для экономии токенов (cache.ts)
 */

import { Prompts, buildGameMasterPrompt as buildGMFromTemplates, buildStartPrompt, type PromptContext } from '@/prompts';
import { getAllWorldRules } from '../memory-containers';
import { CULTIVATION_LEVELS } from '../cultivation-levels';

// ============================================
// ФУНКЦИИ ФОРМИРОВАНИЯ СЕКЦИЙ
// ============================================

/**
 * Формирование секции уровней культивации (сжатый формат)
 */
function buildCultivationSection(): string {
  // Сжатый формат: каждая техника на одной строке
  const levelsText = CULTIVATION_LEVELS.map((level) => {
    const agingText = level.agingFactor === 0
      ? "остановлено"
      : `${level.agingFactor}x`;

    return `L${level.level}:${level.nameRu}|Qi:${level.qiDensity}|Aging:${agingText}|Abilities:${level.abilities.slice(0, 2).join(',')}`;
  }).join('\n');

  return `=== УРОВНИ КУЛЬТИВАЦИИ ===
${levelsText}

ФОРМУЛЫ:
- Плотность: Qi(x) = 2^(x-1)
- Прорыв малый: ядро × 10
- Прорыв большой: ядро × 100
- Генерация: 10%/сутки`;
}

/**
 * Формирование секции правил мира
 */
function buildWorldRulesSection(): string {
  return getAllWorldRules();
}

// ============================================
// ОСНОВНЫЕ ФУНКЦИИ СБОРКИ
// ============================================

/**
 * Полный промпт GM (для новой сессии)
 * Использует кэширование
 */
export function buildGameMasterPromptCached(customInstructions?: string): string {
  const worldRules = buildWorldRulesSection();
  const cultivationLevels = buildCultivationSection();

  // Собираем промпт
  const prompt = buildGMFromTemplates({
    worldRules,
    cultivationLevels,
    customInstructions,
  });

  // Кэшируем
  const cached = Prompts.cache(prompt, { type: 'game-master' });

  return cached.content;
}

/**
 * Сокращённый промпт (для продолжения сессии)
 * Только изменившийся контекст
 */
export function buildMinimalPrompt(context: {
  character: PromptContext;
  location?: PromptContext;
  recentEvents?: string[];
}): string {
  const parts: string[] = [];

  // Контекст персонажа
  parts.push(Prompts.buildCharacter(context.character));

  // Контекст локации
  if (context.location) {
    parts.push(Prompts.inject(
      Prompts.get('injections', 'location-context'),
      { location: context.location }
    ));
  }

  // Последние события
  if (context.recentEvents && context.recentEvents.length > 0) {
    parts.push(`=== ПОСЛЕДНИЕ СОБЫТИЯ ===\n${context.recentEvents.join('\n')}`);
  }

  return parts.join('\n\n');
}

/**
 * Промпт для старта в секте
 */
export function buildSectStartPrompt(): string {
  return buildStartPrompt('sect');
}

/**
 * Промпт для случайного старта
 */
export function buildRandomStartPrompt(): string {
  return buildStartPrompt('random');
}

/**
 * Промпт для кастомного старта
 */
export function buildCustomStartPrompt(config: {
  location?: string;
  age?: number;
  coreCapacity?: number;
  knowsAboutSystem?: boolean;
}): string {
  return buildStartPrompt('custom', config);
}

/**
 * Основная функция сборки промпта GM
 * Псевдоним для buildGameMasterPromptCached (для удобства импорта)
 */
export function buildGameMasterPrompt(customInstructions?: string): string {
  return buildGameMasterPromptCached(customInstructions);
}

// ============================================
// ЭКСПОРТ КОНСТАНТ (для совместимости)
// ============================================

// Базовая часть промпта (загружается из файла)
export const BASE_PROMPT = Prompts.get('system', 'base');

// Секция правил мира
export const WORLD_RULES_SECTION = buildWorldRulesSection();

// Секция уровней культивации
export const CULTIVATION_SECTION = buildCultivationSection();

// Секция команд
export const COMMANDS_SECTION = Prompts.get('system', 'commands');

// Формат вывода
export const OUTPUT_FORMAT = Prompts.get('system', 'output-format');
