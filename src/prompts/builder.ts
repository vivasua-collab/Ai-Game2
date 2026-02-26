/**
 * Сборщик промптов
 *
 * Комбинирует шаблоны с динамическими данными через плейсхолдеры.
 * Поддерживает вложенные инъекции и условные блоки.
 */

import { getTemplateContent, type PromptCategory } from './loader';

// Типы для контекста подстановки
export interface PromptContext {
  [key: string]: string | number | boolean | PromptContext | PromptContext[];
}

// Регулярное выражение для плейсхолдеров: {{variable}} или {{object.property}}
const PLACEHOLDER_REGEX = /\{\{(\w+(?:\.\w+)*)\}\}/g;

// Регулярное выражение для условных блоков: {{#if condition}}...{{/if}}
const CONDITIONAL_REGEX = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

// Регулярное выражение для итераций: {{#each items}}...{{/each}}
const EACH_REGEX = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

/**
 * Получить значение по пути из объекта
 */
function getValueByPath(obj: PromptContext, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Форматирование значения для подстановки
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(formatValue).join(', ');
  }
  return JSON.stringify(value);
}

/**
 * Замена плейсхолдеров в тексте
 */
export function replacePlaceholders(
  template: string,
  context: PromptContext
): string {
  // Обрабатываем условные блоки
  let result = template.replace(CONDITIONAL_REGEX, (_, condition: string, content: string) => {
    const value = getValueByPath(context, condition);
    return value ? content : '';
  });

  // Обрабатываем итерации
  result = result.replace(EACH_REGEX, (_, arrayName: string, itemTemplate: string) => {
    const array = getValueByPath(context, arrayName);
    if (!Array.isArray(array)) {
      return '';
    }

    return array.map((item, index) => {
      let itemResult = itemTemplate;
      // Замена {{this}} на текущий элемент
      itemResult = itemResult.replace(/\{\{this\}\}/g, formatValue(item));
      // Замена {{@index}} на индекс
      itemResult = itemResult.replace(/\{\{@index\}\}/g, String(index));
      // Замена остальных плейсхолдеров
      if (typeof item === 'object' && item !== null) {
        itemResult = replacePlaceholders(itemResult, item as PromptContext);
      }
      return itemResult;
    }).join('');
  });

  // Заменяем простые плейсхолдеры
  result = result.replace(PLACEHOLDER_REGEX, (_, path: string) => {
    const value = getValueByPath(context, path);
    return formatValue(value);
  });

  return result;
}

/**
 * Сборка промпта из нескольких секций
 */
export interface PromptSection {
  category: PromptCategory;
  name: string;
  context?: PromptContext;
}

export function buildPrompt(
  sections: PromptSection[],
  separator: string = '\n\n'
): string {
  return sections
    .map(({ category, name, context }) => {
      let content = getTemplateContent(category, name);
      if (context) {
        content = replacePlaceholders(content, context);
      }
      return content;
    })
    .filter(Boolean)
    .join(separator);
}

/**
 * Сборка полного промпта GM
 */
export function buildGameMasterPrompt(options: {
  worldRules?: string;
  cultivationLevels?: string;
  customInstructions?: string;
}): string {
  const sections: PromptSection[] = [
    { category: 'system', name: 'base' },
    {
      category: 'system',
      name: 'world-rules',
      context: { WORLD_RULES: options.worldRules || '' },
    },
  ];

  // Добавляем уровни культивации если есть
  if (options.cultivationLevels) {
    sections.push({
      category: 'injections',
      name: 'cultivation-levels',
      context: { LEVELS_DATA: options.cultivationLevels },
    });
  }

  // Добавляем команды и формат вывода
  sections.push(
    { category: 'system', name: 'commands' },
    { category: 'system', name: 'output-format' }
  );

  let prompt = buildPrompt(sections);

  // Добавляем кастомные инструкции
  if (options.customInstructions) {
    prompt += `\n\n# ДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ\n\n${options.customInstructions}`;
  }

  return prompt;
}

/**
 * Сборка промпта для стартового сценария
 */
export function buildStartPrompt(
  scenario: 'sect' | 'random' | 'custom',
  options?: {
    location?: string;
    age?: number;
    coreCapacity?: number;
    knowsAboutSystem?: boolean;
  }
): string {
  // Базовый GM промпт
  let prompt = buildGameMasterPrompt({});

  // Добавляем сценарий
  const scenarioContext: PromptContext = {
    location: options?.location || 'случайная',
    age: options?.age || 16,
    coreCapacity: options?.coreCapacity || 1000,
    knowsAboutSystem: options?.knowsAboutSystem ? 'да' : 'нет',
  };

  const scenarioName = scenario === 'custom' ? 'custom-start' :
                        scenario === 'sect' ? 'sect-start' : 'random-start';

  prompt += '\n\n' + replacePlaceholders(
    getTemplateContent('scenarios', scenarioName),
    scenarioContext
  );

  return prompt;
}

/**
 * Сборка промпта для генерации техник
 */
export function buildTechniqueGenerationPrompt(options: {
  type: string;
  element: string;
  level: number;
  rarity: string;
  count: number;
  characterContext: PromptContext;
}): string {
  const context: PromptContext = {
    type: options.type,
    element: options.element,
    level: options.level,
    rarity: options.rarity,
    count: options.count,
    characterContext: JSON.stringify(options.characterContext),
  };

  return replacePlaceholders(
    getTemplateContent('system', 'technique-generation'),
    context
  );
}

/**
 * Инъекция состояния персонажа
 */
export function buildCharacterContextPrompt(character: PromptContext): string {
  const cultivationLevelName = getCultivationLevelName(
    character.cultivationLevel as number
  );
  const qiPercent = Math.round(
    ((character.currentQi as number) / (character.coreCapacity as number)) * 100
  );

  return replacePlaceholders(
    getTemplateContent('injections', 'character-state'),
    {
      character,
      cultivationLevelName,
      qiPercent,
    }
  );
}

/**
 * Получить название уровня культивации
 */
function getCultivationLevelName(level: number): string {
  const names: Record<number, string> = {
    1: 'Закалка тела',
    2: 'Конденсация Ци',
    3: 'Основание',
    4: 'Золотое ядро',
    5: 'Душа',
    6: 'Дух',
    7: 'Разъединение',
    8: 'Бессмертие',
    9: 'Великий мудрец',
  };
  return names[level] || 'Неизвестно';
}
