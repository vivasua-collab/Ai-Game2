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
 */

import type { Character, Location, WorldTime } from "@/hooks/useGame";
import type { Technique } from "./technique-system";

// Типы запросов
export type RequestType =
  | "status"           // Статус персонажа - ЛОКАЛЬНО
  | "techniques"       // Список техник - ЛОКАЛЬНО
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

// Результат маршрутизации
export interface RoutingResult {
  useLLM: boolean;
  localData?: unknown;
  llmPrompt?: string;
  reason: string;
}

// Определение типа запроса
export function identifyRequestType(input: string): RequestType {
  const lowerInput = input.toLowerCase().trim();
  
  // Статус персонажа
  if (/^(статус|status|мой статус|показать статус|!\s*статус)/.test(lowerInput)) {
    return "status";
  }
  
  // Список техник
  if (/^(техники|skills|скилы|мои техники|список техник|!\s*техники)/.test(lowerInput)) {
    return "techniques";
  }
  
  // Инвентарь
  if (/^(инвентарь|inventory|рюкзак|вещи|!\s*инвентарь)/.test(lowerInput)) {
    return "inventory";
  }
  
  // Характеристики
  if (/^(характеристики|stats|параметры|статы|!\s*характеристики)/.test(lowerInput)) {
    return "stats";
  }
  
  // Информация о локации
  if (/^(где я|локация|место|описание места|!\s*локация)/.test(lowerInput)) {
    return "location_info";
  }
  
  // Медитация (культивация)
  if (/медитир|культивир|накоп.*ци|прорыв/.test(lowerInput)) {
    return "cultivation";
  }
  
  // Бой
  if (/атак|бой|сража|удар|защит/.test(lowerInput)) {
    return "combat";
  }
  
  // Диалог (есть кавычки или обращение)
  if (/[«"']|скажи|спроси|ответь|говори/.test(lowerInput)) {
    return "dialogue";
  }
  
  // Команды с префиксом
  if (lowerInput.startsWith("!!") || lowerInput.startsWith("--")) {
    return "action";
  }
  
  // Создание
  if (/создай|изобрет|разработ|новая техника/.test(lowerInput)) {
    return "creation";
  }
  
  // По умолчанию - повествование
  return "narration";
}

// Маршрутизация запроса
export function routeRequest(
  input: string,
  character: Character | null,
  location: Location | null,
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
      // Культивация: локальные расчёты + LLM для описания
      return {
        useLLM: true,
        llmPrompt: `Действие культивации: ${input}. Используй локальные расчёты для Ци и усталости.`,
        reason: "Культивация: расчёты локально, описание через LLM",
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

// Построение ответа о статусе
function buildStatusResponse(
  character: Character | null,
  worldTime: WorldTime | null
): object {
  if (!character) {
    return { error: "Персонаж не найден" };
  }
  
  return {
    type: "status",
    character: {
      cultivation: `${character.cultivationLevel}.${character.cultivationSubLevel}`,
      qi: {
        current: character.currentQi,
        max: character.coreCapacity,
        percent: Math.round((character.currentQi / character.coreCapacity) * 100),
      },
      health: character.health,
      fatigue: character.fatigue,
      age: character.age,
    },
    worldTime: worldTime ? {
      year: worldTime.year,
      month: worldTime.month,
      day: worldTime.day,
      time: `${worldTime.hour}:${worldTime.minute.toString().padStart(2, "0")}`,
      season: worldTime.season,
    } : null,
  };
}

// Построение ответа о техниках
function buildTechniquesResponse(techniques: Technique[]): object {
  return {
    type: "techniques",
    count: techniques.length,
    techniques: techniques.map(t => ({
      name: t.name,
      type: t.type,
      element: t.element,
      qiCost: t.qiCost,
      mastery: t.masteryProgress,
    })),
    message: techniques.length === 0 
      ? "Нет изученных техник" 
      : `Изучено техник: ${techniques.length}`,
  };
}

// Построение ответа о характеристиках
function buildStatsResponse(character: Character | null): object {
  if (!character) {
    return { error: "Персонаж не найден" };
  }
  
  return {
    type: "stats",
    stats: {
      strength: character.strength,
      agility: character.agility,
      intelligence: character.intelligence,
      conductivity: character.conductivity,
    },
    core: {
      capacity: character.coreCapacity,
      currentQi: character.currentQi,
      accumulatedQi: character.accumulatedQi,
    },
  };
}

// Построение ответа о локации
function buildLocationResponse(location: Location | null): object {
  if (!location) {
    return { error: "Локация не определена" };
  }
  
  return {
    type: "location",
    location: {
      name: location.name,
      terrainType: location.terrainType,
      qiDensity: location.qiDensity,
      distanceFromCenter: location.distanceFromCenter,
    },
  };
}

// Проверка, нужен ли LLM для запроса
export function needsLLM(input: string): boolean {
  const requestType = identifyRequestType(input);
  const localTypes: RequestType[] = ["status", "techniques", "inventory", "stats", "location_info"];
  return !localTypes.includes(requestType);
}
