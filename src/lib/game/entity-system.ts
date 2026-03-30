/**
 * Система встреченных персонажей и монстров
 * 
 * Концепция:
 * - Сущности сохраняются при первой встрече
 * - Имеют "свежесть" - забываются если давно не встречались
 * - Важные NPC не забываются
 * - Монстры забываются быстрее NPC
 */

import type { Character } from "@/types/game";

// Типы сущностей
export type EntityType = "npc" | "monster" | "animal" | "spirit";

// Ранг важности
export type EntityImportance = "minor" | "normal" | "important" | "critical";

// Интерфейс встреченной сущности
export interface EncounteredEntity {
  id: string;
  name: string;
  type: EntityType;
  
  // Характеристики (для монстров/духов)
  cultivationLevel?: number;
  cultivationSubLevel?: number;
  power?: number; // Общая сила (для монстров)
  
  // Описание
  title?: string;
  description?: string;
  
  // Отношения
  disposition: number; // -100 до 100 (враждебный до дружелюбный)
  
  // Память
  importance: EntityImportance;
  encounterCount: number;
  lastEncounterDate: Date;
  firstEncounterDate: Date;
  
  // Воспоминания
  memories: EntityMemory[];
  
  // Местоположение
  lastLocationId?: string;
  homeLocationId?: string;
  
  // Дополнительные данные
  tags: string[];
  customData?: Record<string, unknown>;
}

// Воспоминание о взаимодействии
export interface EntityMemory {
  id: string;
  date: Date;
  type: "dialogue" | "combat" | "trade" | "quest" | "social";
  summary: string;
  impact: number; // Влияние на disposition (-10 до +10)
}

// Параметры забывания
interface ForgetfulnessRules {
  maxAge: number;           // Дней до забывания
  decayRate: number;        // Скорость затухания памяти
  importantMultiplier: number; // Множитель для важных
}

const FORGETFULNESS: Record<EntityImportance, ForgetfulnessRules> = {
  minor: { maxAge: 30, decayRate: 0.1, importantMultiplier: 0.5 },
  normal: { maxAge: 90, decayRate: 0.05, importantMultiplier: 1 },
  important: { maxAge: 365, decayRate: 0.02, importantMultiplier: 2 },
  critical: { maxAge: Infinity, decayRate: 0, importantMultiplier: Infinity },
};

// Проверка, нужно ли забыть сущность
export function shouldForget(entity: EncounteredEntity): boolean {
  if (entity.importance === "critical") return false;
  
  const rules = FORGETFULNESS[entity.importance];
  const daysSinceLastEncounter = Math.floor(
    (Date.now() - entity.lastEncounterDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Важные сущности забываются медленнее
  const effectiveMaxAge = rules.maxAge * rules.importantMultiplier;
  
  return daysSinceLastEncounter > effectiveMaxAge;
}

// Расчёт "свежести" воспоминания
export function calculateMemoryFreshness(entity: EncounteredEntity): number {
  const rules = FORGETFULNESS[entity.importance];
  const daysSinceLastEncounter = Math.floor(
    (Date.now() - entity.lastEncounterDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceLastEncounter === 0) return 1.0;
  
  // Экспоненциальное затухание
  const freshness = Math.exp(-rules.decayRate * daysSinceLastEncounter);
  
  return Math.max(0, Math.min(1, freshness));
}

// Обновление при новой встрече
export function updateEntityOnEncounter(
  entity: EncounteredEntity,
  newDisposition: number,
  memory?: Omit<EntityMemory, "id" | "date">
): EncounteredEntity {
  return {
    ...entity,
    disposition: Math.max(-100, Math.min(100, 
      entity.disposition + (newDisposition - entity.disposition) * 0.3
    )),
    encounterCount: entity.encounterCount + 1,
    lastEncounterDate: new Date(),
    memories: memory 
      ? [...entity.memories, {
          ...memory,
          id: `mem-${Date.now()}`,
          date: new Date(),
        }]
      : entity.memories,
  };
}

// Создание новой сущности
export function createEntity(
  name: string,
  type: EntityType,
  options: Partial<EncounteredEntity> = {}
): EncounteredEntity {
  return {
    id: `entity-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    disposition: options.disposition ?? 0,
    importance: options.importance ?? "normal",
    encounterCount: 1,
    lastEncounterDate: new Date(),
    firstEncounterDate: new Date(),
    memories: [],
    tags: options.tags ?? [],
    ...options,
  };
}

// Генерация описания для LLM
export function generateEntityDescriptionForLLM(
  entity: EncounteredEntity,
  freshness: number
): string {
  const freshnessPercent = Math.round(freshness * 100);
  const dispositionDesc = entity.disposition > 50 
    ? "дружелюбный" 
    : entity.disposition > 0 
      ? "нейтральный" 
      : entity.disposition > -50 
        ? "настороженный" 
        : "враждебный";
  
  let description = `${entity.name}`;
  if (entity.title) description += ` (${entity.title})`;
  description += ` - ${entity.type}`;
  
  if (freshness < 0.3) {
    description += ` [Воспоминания тускнеют - ${freshnessPercent}% ясности]`;
  } else if (freshness < 0.7) {
    description += ` [Воспоминания свежи - ${freshnessPercent}% ясности]`;
  }
  
  description += `\nОтношение: ${dispositionDesc} (${entity.disposition})`;
  
  if (entity.memories.length > 0) {
    const recentMemories = entity.memories
      .slice(-3)
      .map(m => m.summary)
      .join("; ");
    description += `\nПоследние взаимодействия: ${recentMemories}`;
  }
  
  return description;
}

// Фильтрация сущностей по свежести памяти
export function filterByFreshness(
  entities: EncounteredEntity[],
  minFreshness: number = 0.1
): EncounteredEntity[] {
  return entities.filter(e => {
    if (e.importance === "critical") return true;
    return calculateMemoryFreshness(e) >= minFreshness;
  });
}

// Получение топ-N сущностей по важности
export function getTopEntities(
  entities: EncounteredEntity[],
  limit: number = 10
): EncounteredEntity[] {
  return [...entities]
    .sort((a, b) => {
      // Сначала по важности
      const importanceOrder = { critical: 0, important: 1, normal: 2, minor: 3 };
      const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
      if (importanceDiff !== 0) return importanceDiff;
      
      // Потом по свежести
      const freshnessDiff = calculateMemoryFreshness(b) - calculateMemoryFreshness(a);
      if (freshnessDiff !== 0) return freshnessDiff;
      
      // Потом по количеству встреч
      return b.encounterCount - a.encounterCount;
    })
    .slice(0, limit);
}

// Расчёт силы монстра для боя
export function calculateMonsterPower(
  entity: EncounteredEntity
): { attack: number; defense: number; health: number; qi: number } {
  const baseLevel = entity.cultivationLevel || 1;
  const baseSubLevel = entity.cultivationSubLevel || 0;
  const basePower = entity.power || 10;
  
  const levelMultiplier = 1 + (baseLevel - 1) * 0.5 + baseSubLevel * 0.05;
  
  return {
    attack: Math.floor(basePower * levelMultiplier * 1.2),
    defense: Math.floor(basePower * levelMultiplier * 0.8),
    health: Math.floor(100 * levelMultiplier),
    qi: Math.floor(50 * levelMultiplier),
  };
}

// Определение типа сущности из описания LLM
export function inferEntityType(description: string): EntityType {
  const lowerDesc = description.toLowerCase();
  
  if (/монстр|чудовище|зверь|демон| DEMON|monster|beast/.test(lowerDesc)) {
    return "monster";
  }
  if (/дух|призрак|сущность|spirit|ghost/.test(lowerDesc)) {
    return "spirit";
  }
  if (/животное|зверь|animal|волк|медвед|тигр|змея/.test(lowerDesc)) {
    return "animal";
  }
  return "npc";
}

// Определение важности сущности
export function inferEntityImportance(
  description: string,
  cultivationLevel?: number
): EntityImportance {
  const lowerDesc = description.toLowerCase();
  
  // Критичные сущности
  if (/глава|старейшин|мастер|учитель|master|elder|leader/.test(lowerDesc)) {
    return "critical";
  }
  
  // Важные сущности
  if (/наставник|друг|союзник|ally|friend|mentor/.test(lowerDesc) || 
      (cultivationLevel && cultivationLevel >= 5)) {
    return "important";
  }
  
  // Незначительные сущности
  if (/прохожий|странник|случайный|passerby|stranger/.test(lowerDesc)) {
    return "minor";
  }
  
  return "normal";
}
