/**
 * Оптимизатор промптов
 *
 * Сжимает промпты для экономии токенов:
 * - Удаление комментариев и лишних пробелов
 * - Сжатие JSON структур
 * - Аббревиатуры для повторяющихся терминов
 */

// Опции оптимизации
export interface OptimizerOptions {
  /** Удалить HTML-подобные комментарии */
  removeComments?: boolean;
  /** Удалить лишние пробелы и переносы строк */
  compactWhitespace?: boolean;
  /** Сжать JSON в одну строку */
  compactJson?: boolean;
  /** Использовать аббревиатуры */
  useAbbreviations?: boolean;
  /** Уровень агрессивности (1-3) */
  aggressiveness?: 1 | 2 | 3;
}

// Словарь аббревиатур
const ABBREVIATIONS: Record<string, string> = {
  'культивация': 'кул.',
  'культивации': 'кул.',
  'культивацией': 'кул.',
  'персонаж': 'перс.',
  'персонажа': 'перс.',
  'персонажу': 'перс.',
  'локация': 'лок.',
  'локации': 'лок.',
  'локацией': 'лок.',
  'уровень': 'ур.',
  'уровня': 'ур.',
  'уровне': 'ур.',
  'техника': 'техн.',
  'техники': 'техн.',
  'технике': 'техн.',
  'проводимость': 'пров.',
  'проводимости': 'пров.',
  'ёмкость': 'ёмк.',
  'ёмкости': 'ёмк.',
  'накопление': 'накоп.',
  'накопления': 'накоп.',
  'медитация': 'медит.',
  'медитации': 'медит.',
  'прорыв': 'прор.',
  'прорыва': 'прор.',
  'усталость': 'уст.',
  'усталости': 'уст.',
  'здоровье': 'здор.',
  'здоровья': 'здор.',
};

// Расширенный словарь для агрессивного режима
const ABBREVIATIONS_AGGRESSIVE: Record<string, string> = {
  ...ABBREVIATIONS,
  'восстановление': 'восст.',
  'восстановления': 'восст.',
  'использование': 'исп.',
  'использования': 'исп.',
  'эффективность': 'эффект.',
  'эффективности': 'эффект.',
  'требование': 'треб.',
  'требования': 'треб.',
  'возможность': 'возм.',
  'возможности': 'возм.',
  'способность': 'спос.',
  'способности': 'спос.',
  'характеристика': 'хар.',
  'характеристики': 'хар.',
};

/**
 * Удаление комментариев
 */
function removeComments(text: string): string {
  // Удаляем HTML-подобные комментарии <!-- ... -->
  let result = text.replace(/<!--[\s\S]*?-->/g, '');
  // Удаляем Markdown комментарии в начале строк (# Заголовок -> Заголовок для уровня 3+)
  // Но сохраняем заголовки ## и ###
  result = result.replace(/^####+\s*/gm, '');
  return result;
}

/**
 * Сжатие пробелов
 */
function compactWhitespace(text: string): string {
  // Заменяем множественные пробелы на один
  let result = text.replace(/[ \t]+/g, ' ');
  // Заменяем множественные переносы строк на два
  result = result.replace(/\n{3,}/g, '\n\n');
  // Удаляем пробелы в конце строк
  result = result.replace(/ +\n/g, '\n');
  // Удаляем пробелы в начале строк
  result = result.replace(/\n +/g, '\n');
  // Удаляем пробелы в начале и конце
  return result.trim();
}

/**
 * Сжатие JSON
 */
function compactJson(text: string): string {
  // Ищем блоки JSON и сжимаем их
  return text.replace(/```json\s*([\s\S]*?)```/g, (_, json: string) => {
    try {
      const parsed = JSON.parse(json);
      const compacted = JSON.stringify(parsed);
      return '```json\n' + compacted + '\n```';
    } catch {
      return '```json\n' + json.trim() + '\n```';
    }
  });
}

/**
 * Применение аббревиатур
 */
function applyAbbreviations(
  text: string,
  aggressiveness: number
): string {
  const abbr = aggressiveness >= 3 ? ABBREVIATIONS_AGGRESSIVE : ABBREVIATIONS;
  let result = text;

  // Сортируем по длине (длинные сначала) для избежания конфликтов
  const sortedKeys = Object.keys(abbr).sort((a, b) => b.length - a.length);

  for (const full of sortedKeys) {
    const short = abbr[full];
    // Заменяем только полные слова (с границами)
    const regex = new RegExp(`\\b${full}\\b`, 'g');
    result = result.replace(regex, short);
  }

  return result;
}

/**
 * Подсчёт примерного количества токенов
 * (приблизительно: 1 токен ≈ 4 символа для английского, 2 символа для русского)
 */
export function estimateTokens(text: string): number {
  // Подсчёт русских и английских символов
  const russianChars = (text.match(/[а-яёА-ЯЁ]/g) || []).length;
  const otherChars = text.length - russianChars;

  // Русский текст: ~2 символа на токен
  // Английский: ~4 символа на токен
  return Math.ceil(russianChars / 2 + otherChars / 4);
}

/**
 * Оптимизация промпта
 */
export function optimizePrompt(
  prompt: string,
  options: OptimizerOptions = {}
): { optimized: string; originalTokens: number; optimizedTokens: number; savings: number } {
  const {
    removeComments: doRemoveComments = true,
    compactWhitespace: doCompactWhitespace = true,
    compactJson: doCompactJson = true,
    useAbbreviations: doUseAbbreviations = false, // По умолчанию выключено - может ухудшить качество
    aggressiveness = 2,
  } = options;

  const originalTokens = estimateTokens(prompt);
  let result = prompt;

  // Применяем оптимизации
  if (doRemoveComments) {
    result = removeComments(result);
  }

  if (doCompactWhitespace) {
    result = compactWhitespace(result);
  }

  if (doCompactJson) {
    result = compactJson(result);
  }

  if (doUseAbbreviations) {
    result = applyAbbreviations(result, aggressiveness);
  }

  const optimizedTokens = estimateTokens(result);
  const savings = originalTokens - optimizedTokens;

  return {
    optimized: result,
    originalTokens,
    optimizedTokens,
    savings,
  };
}

/**
 * Статистика оптимизации
 */
export function getOptimizationStats(
  prompt: string,
  options: OptimizerOptions = {}
): string {
  const result = optimizePrompt(prompt, options);
  const savingsPercent = Math.round((result.savings / result.originalTokens) * 100);

  return `Токены: ${result.originalTokens} → ${result.optimizedTokens} (-${result.savings}, -${savingsPercent}%)`;
}
