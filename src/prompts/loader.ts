/**
 * Загрузчик шаблонов промптов
 *
 * Загружает .md файлы из templates/ и кэширует их.
 * Поддерживает горячую перезагрузку в development режиме.
 */

import { readFileSync, existsSync, watch } from 'fs';
import { join } from 'path';

// Типы
export type PromptCategory = 'system' | 'scenarios' | 'injections';

export interface PromptTemplate {
  name: string;
  category: PromptCategory;
  content: string;
  loadedAt: Date;
}

// Кэш загруженных шаблонов
const templateCache = new Map<string, PromptTemplate>();

// Базовый путь к шаблонам
const TEMPLATES_DIR = join(process.cwd(), 'src', 'prompts', 'templates');

// Флаг режима разработки
const isDev = process.env.NODE_ENV === 'development';

/**
 * Загрузить шаблон из файла
 */
export function loadTemplate(
  category: PromptCategory,
  name: string
): PromptTemplate {
  const cacheKey = `${category}/${name}`;

  // Проверяем кэш
  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey)!;
  }

  // Путь к файлу
  const filePath = join(TEMPLATES_DIR, category, `${name}.md`);

  if (!existsSync(filePath)) {
    throw new Error(`Template not found: ${cacheKey}`);
  }

  // Читаем файл
  const content = readFileSync(filePath, 'utf-8');

  // Создаём объект шаблона
  const template: PromptTemplate = {
    name,
    category,
    content,
    loadedAt: new Date(),
  };

  // Кэшируем
  templateCache.set(cacheKey, template);

  return template;
}

/**
 * Получить содержимое шаблона как строку
 */
export function getTemplateContent(
  category: PromptCategory,
  name: string
): string {
  return loadTemplate(category, name).content;
}

/**
 * Очистить кэш шаблонов
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

/**
 * Перезагрузить конкретный шаблон
 */
export function reloadTemplate(
  category: PromptCategory,
  name: string
): PromptTemplate {
  const cacheKey = `${category}/${name}`;
  templateCache.delete(cacheKey);
  return loadTemplate(category, name);
}

/**
 * Получить все загруженные шаблоны
 */
export function getLoadedTemplates(): PromptTemplate[] {
  return Array.from(templateCache.values());
}

/**
 * Инициализация наблюдателя за файлами (dev режим)
 */
export function initTemplateWatcher(): void {
  if (!isDev) return;

  // Наблюдаем за изменениями в директории шаблонов
  watch(TEMPLATES_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename || !filename.endsWith('.md')) return;

    // Парсим путь: system/base.md -> ['system', 'base']
    const parts = filename.replace(/\\/g, '/').split('/');
    if (parts.length !== 2) return;

    const [category, file] = parts;
    const name = file.replace('.md', '');

    // Удаляем из кэша для перезагрузки при следующем запросе
    const cacheKey = `${category}/${name}`;
    templateCache.delete(cacheKey);

    console.log(`[Prompts] Template updated: ${cacheKey}`);
  });
}

// Автоматическая инициализация в dev режиме
if (isDev) {
  initTemplateWatcher();
}
