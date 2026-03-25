/**
 * Динамический маршрутизатор запросов
 * 
 * Определяет, какие запросы обрабатывать локально (без LLM):
 * - Запрос статуса персонажа
 * - Запрос списка техник
 * - Запрос информации о локации
 * - Простые вычисления
 * 
 * LLM вызывается только для:
 * - Генерации повествования
 * - Диалогов с NPC
 * - Сложных взаимодействий
 * - Создания контента
 * 
 * @module request-router
 */

import type { Character, WorldTime } from "@/types/game";
import type { LocationData } from "@/types/game-shared";
import type { Technique } from "./techniques";
import {
  buildStatusResponse,
  buildTechniquesResponse,
  buildStatsResponse,
  buildLocationResponse,
} from "./response-builders";

// ==================== ТИПЫ ====================

/**
 * Типы запросов
 */
export type RequestType =
  | "status"           // Статус персонажа - ЛОКАЛЬНО
  | "techniques"       // Список техник - ЛОКАЛЬНО
  | "location"         // Информация о локации (коротко) - ЛОКАЛЬНО
  | "location_info"    // Информация о локации - ЛОКАЛЬНО
  | "inventory"        // Инвентарь - ЛОКАЛЬНО
  | "stats"            // Характеристики - ЛОКАЛЬНО
  | "narration"        // Повествование - LLM
  | "dialogue"         // Диалог - LLM
  | "action"           // Действие - LLM (с локальными расчётами)
  | "combat"           // Бой - ГИБРИД
  | "cultivation"      // Культивация - ГИБРИД
  | "exploration"      // Исследование - LLM
  | "creation";        // Создание контента - LLM

/**
 * Результат маршрутизации
 */
export interface RoutingResult {
  useLLM: boolean;
  localData?: unknown;
  llmPrompt?: string;
  reason: string;
}

// ==================== КОНСТАНТЫ ПАТТЕРНОВ ====================

/**
 * Паттерны для определения типа запроса
 * Все паттерны работают с текстом в нижнем регистре
 */
const REQUEST_PATTERNS = {
  /** Статус персонажа */
  status: /^(статус|status|мой статус|показать статус|!\s*статус|!\s*status)$/,
  
  /** Список техник */
  techniques: /^(техники|skills|скилы|скилл|мои техники|список техник|!\s*техники|!\s*skills)$/,
  
  /** Инвентарь */
  inventory: /^(инвентарь|inventory|рюкзак|вещи|!\s*инвентарь|!\s*inventory)$/,
  
  /** Характеристики */
  stats: /^(характеристики|stats|параметры|статы|!\s*характеристики|!\s*stats|!\s*параметры)$/,
  
  /** Информация о локации */
  location_info: /^(где я|где я нахожусь|что вокруг|где нахожусь|локация|место|описание места|мо[ёе] местоположение|!\s*локация)$/,
  
  /** Медитация (культивация) */
  cultivation: /медитир|культивир|накоп.*ци|прорыв/,
  
  /** Бой */
  combat: /атак|бой|сража|удар|защит/,
  
  /** Диалог */
  dialogue: /[«"']|скажи|спроси|ответь|говори/,
  
  /** Создание */
  creation: /создай|изобрет|разработ|новая техника/,
} as const;

/** Типы запросов, обрабатываемые локально */
const LOCAL_REQUEST_TYPES: RequestType[] = [
  "status",
  "techniques",
  "inventory",
  "stats",
  "location_info",
  "cultivation"  // Обрабатывается в chat/route.ts БЕЗ LLM (кроме прерываний)
];

// ==================== ФУНКЦИИ МАРШРУТИЗАЦИИ ====================

/**
 * Определение типа запроса по входному тексту
 * 
 * @param input - Входной текст запроса
 * @returns Тип запроса
 */
export function identifyRequestType(input: string): RequestType {
  const lowerInput = input.toLowerCase().trim();
  
  // Проверка статических паттернов
  if (REQUEST_PATTERNS.status.test(lowerInput)) return "status";
  if (REQUEST_PATTERNS.techniques.test(lowerInput)) return "techniques";
  if (REQUEST_PATTERNS.inventory.test(lowerInput)) return "inventory";
  if (REQUEST_PATTERNS.stats.test(lowerInput)) return "stats";
  if (REQUEST_PATTERNS.location_info.test(lowerInput)) return "location_info";
  
  // Проверка динамических паттернов
  if (REQUEST_PATTERNS.cultivation.test(lowerInput)) return "cultivation";
  if (REQUEST_PATTERNS.combat.test(lowerInput)) return "combat";
  if (REQUEST_PATTERNS.dialogue.test(lowerInput)) return "dialogue";
  if (REQUEST_PATTERNS.creation.test(lowerInput)) return "creation";
  
  // Команды с префиксом
  if (lowerInput.startsWith("!!") || lowerInput.startsWith("--")) {
    return "action";
  }
  
  // По умолчанию - повествование
  return "narration";
}

/**
 * Маршрутизация запроса
 * 
 * @param input - Входной текст запроса
 * @param character - Данные персонажа
 * @param location - Данные о локации
 * @param worldTime - Мировое время
 * @param techniques - Изученные техники
 * @returns Результат маршрутизации
 */
export function routeRequest(
  input: string,
  character: Character | null,
  location: LocationData | null,
  worldTime: WorldTime | null,
  techniques: Technique[] = []
): RoutingResult {
  const requestType = identifyRequestType(input);
  
  switch (requestType) {
    case "status":
      return {
        useLLM: false,
        localData: buildStatusResponse(character, worldTime),
        reason: "Запрос статуса обрабатывается локально",
      };
      
    case "techniques":
      return {
        useLLM: false,
        localData: buildTechniquesResponse(techniques),
        reason: "Список техник извлекается из локального хранилища",
      };
      
    case "inventory":
      return {
        useLLM: false,
        localData: { items: [], message: "Инвентарь пуст" },
        reason: "Инвентарь извлекается из локального хранилища",
      };
      
    case "stats":
      return {
        useLLM: false,
        localData: buildStatsResponse(character),
        reason: "Характеристики извлекаются из локального хранилища",
      };
      
    case "location_info":
      return {
        useLLM: false,
        localData: buildLocationResponse(location),
        reason: "Информация о локации извлекается из локального хранилища",
      };
      
    case "cultivation":
      // Культивация: ПОЛНОСТЬЮ локально (кроме прерываний медитации)
      // Прерывания обрабатываются отдельно в chat/route.ts
      return {
        useLLM: false,
        localData: { message: "Медитация обрабатывается локально" },
        reason: "Культивация: расчёты Ци и прорыв обрабатываются локально в chat/route.ts",
      };
      
    case "combat":
      // Бой: локальные расчёты урона + LLM для описания
      return {
        useLLM: true,
        llmPrompt: `Боевое действие: ${input}. Используй локальные расчёты для урона и затрат Ци.`,
        reason: "Бой: расчёты локально, описание через LLM",
      };
      
    case "dialogue":
      return {
        useLLM: true,
        llmPrompt: input,
        reason: "Диалог требует генерации через LLM",
      };
      
    case "creation":
      return {
        useLLM: true,
        llmPrompt: `Создание: ${input}. После генерации сохранить в базу техник.`,
        reason: "Создание контента требует LLM",
      };
      
    case "action":
      return {
        useLLM: true,
        llmPrompt: input,
        reason: "Действие требует генерации через LLM",
      };
      
    case "narration":
    case "exploration":
    default:
      return {
        useLLM: true,
        llmPrompt: input,
        reason: "Требуется генерация повествования через LLM",
      };
  }
}

/**
 * Проверка, нужен ли LLM для обработки запроса
 * 
 * @param input - Входной текст запроса
 * @returns true если нужен LLM, false если достаточно локальной обработки
 */
export function needsLLM(input: string): boolean {
  const requestType = identifyRequestType(input);
  return !LOCAL_REQUEST_TYPES.includes(requestType);
}
