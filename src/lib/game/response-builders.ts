/**
 * Построители ответов для локальных запросов
 * 
 * Этот модуль содержит функции для формирования структурированных ответов
 * на локальные запросы (без LLM):
 * - Статус персонажа
 * - Список техник
 * - Характеристики
 * - Информация о локации
 * 
 * @module response-builders
 */

import type { Character, WorldTime } from "@/types/game";
import type { LocationData } from "@/types/game-shared";
import type { Technique } from "./techniques";
import { getCultivationLevelName } from "./qi-shared";

// ==================== СТАТУС ПЕРСОНАЖА ====================

/**
 * Построение ответа о статусе персонажа
 * 
 * @param character - Данные персонажа
 * @param worldTime - Мировое время
 * @returns Структурированный объект со статусом
 */
export function buildStatusResponse(
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
      mentalFatigue: character.mentalFatigue,
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

// ==================== ТЕХНИКИ ====================

/**
 * Построение ответа о списке техник
 * 
 * @param techniques - Массив изученных техник
 * @returns Структурированный объект со списком техник
 */
export function buildTechniquesResponse(techniques: Technique[]): object {
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

// ==================== ХАРАКТЕРИСТИКИ ====================

/**
 * Построение ответа о характеристиках персонажа
 * 
 * @param character - Данные персонажа
 * @returns Структурированный объект с характеристиками
 */
export function buildStatsResponse(character: Character | null): object {
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
    cultivation: {
      level: character.cultivationLevel,
      subLevel: character.cultivationSubLevel,
      levelName: getCultivationLevelName(character.cultivationLevel),
    },
  };
}

// ==================== ЛОКАЦИЯ ====================

/**
 * Построение ответа о текущей локации
 * 
 * @param location - Данные о локации
 * @returns Структурированный объект с информацией о локации
 */
export function buildLocationResponse(location: LocationData | null): object {
  if (!location) {
    return { error: "Локация не определена" };
  }
  
  return {
    type: "location",
    location: {
      name: location.name,
      terrainType: location.terrainType,
      qiDensity: location.qiDensity,
      qiFlowRate: location.qiFlowRate,
      distanceFromCenter: location.distanceFromCenter,
    },
  };
}

// ==================== ИНВЕНТАРЬ ====================

/**
 * Построение ответа об инвентаре
 * 
 * @param items - Массив предметов
 * @returns Структурированный объект с инвентарём
 */
export function buildInventoryResponse(items: Array<{
  id: string;
  name: string;
  quantity: number;
  type: string;
}>): object {
  return {
    type: "inventory",
    count: items.length,
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      type: item.type,
    })),
    message: items.length === 0 
      ? "Инвентарь пуст" 
      : `Предметов: ${items.length}`,
  };
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
// getCultivationLevelName импортируется из qi-shared.ts
