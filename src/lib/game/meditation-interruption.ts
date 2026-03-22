/**
 * Система прерывания медитации
 * 
 * Факторы шанса прерывания:
 * 1. Тип локации (открытая/закрытая/опасная)
 * 2. Уровень культивации персонажа vs уровень опасности локации
 * 3. Время суток
 * 4. Навыки персонажа (Глубокая медитация)
 * 5. Формации (защитный круг)
 * 
 * Логика: никто не потревожит практика 9.0 в локации 6.0
 */

import type { Character, WorldTime } from "@/types/game";
import type { LocationData } from "@/types/game-shared";

import { 
  calculateSkillsInterruptionModifier
} from "./cultivation-skills";
import { 
  calculateFormationInterruptionModifier,
  type FormationType
} from "./formations";
import {
  MEDITATION_INTERRUPTION_LOCATION_CHANCE,
  MEDITATION_INTERRUPTION_TIME_MODIFIERS,
} from "./constants";

// ============================================
// ТИПЫ И ИНТЕРФЕЙСЫ
// ============================================

export type LocationDanger = "safe" | "low" | "medium" | "high" | "extreme";

export interface InterruptionEvent {
  id: string;
  type: "creature" | "person" | "phenomenon" | "spirit" | "rare";
  subType: string;
  dangerLevel: number; // 1-10
  description: string;
  canIgnore: boolean;   // Можно ли игнорировать
  canHide: boolean;     // Можно ли скрыться
  rewards?: {
    qi?: number;
    item?: string;
    technique?: string;
    information?: string;
  };
}

export interface InterruptionCheckResult {
  interrupted: boolean;
  event: InterruptionEvent | null;
  checkHour: number;    // На каком часу произошло
  baseChance: number;   // Базовый шанс
  finalChance: number;  // Итоговый шанс после модификаторов
  modifiers: {
    location: number;
    cultivation: number;
    timeOfDay: number;
    skills: number;
    formation: number;
  };
}

// ============================================
// КОНСТАНТЫ (импортированы из constants.ts)
// ============================================

// Используем MEDITATION_INTERRUPTION_LOCATION_CHANCE и MEDITATION_INTERRUPTION_TIME_MODIFIERS
// из constants.ts - единый источник констант

// ============================================
// ТАБЛИЦА СОБЫТИЙ ПРЕРЫВАНИЯ
// ============================================

const INTERRUPTION_EVENTS: InterruptionEvent[] = [
  // === СУЩЕСТВА (creature) ===
  {
    id: "wild_wolf",
    type: "creature",
    subType: "wolf",
    dangerLevel: 2,
    description: "Дикий волк, привлечённый твоей энергией",
    canIgnore: false,
    canHide: true,
  },
  {
    id: "spirit_beast",
    type: "creature",
    subType: "spirit_beast",
    dangerLevel: 5,
    description: "Духовный зверь, почувствовавший концентрацию Ци",
    canIgnore: false,
    canHide: true,
  },
  {
    id: "qi_snake",
    type: "creature",
    subType: "snake",
    dangerLevel: 3,
    description: "Ядовитая змея, attracted to warm Qi",
    canIgnore: true,
    canHide: true,
  },
  {
    id: "demon_beast",
    type: "creature",
    subType: "demon",
    dangerLevel: 7,
    description: "Демонический зверь из глубин",
    canIgnore: false,
    canHide: false,
  },
  
  // === ЛЮДИ (person) ===
  {
    id: "wandering_cultivator",
    type: "person",
    subType: "cultivator",
    dangerLevel: 3,
    description: "Странствующий культиватор",
    canIgnore: true,
    canHide: true,
    rewards: { information: "вести из других земель" },
  },
  {
    id: "bandit_scout",
    type: "person",
    subType: "bandit",
    dangerLevel: 4,
    description: "Разведчик бандитов",
    canIgnore: false,
    canHide: true,
  },
  {
    id: "merchant_caravan",
    type: "person",
    subType: "merchant",
    dangerLevel: 1,
    description: "Торговый караван на привале",
    canIgnore: true,
    canHide: false,
    rewards: { item: "возможность торговли" },
  },
  {
    id: "sect_disciple",
    type: "person",
    subType: "sect_member",
    dangerLevel: 2,
    description: "Ученик соседней секты",
    canIgnore: true,
    canHide: true,
  },
  {
    id: "hostile_cultivator",
    type: "person",
    subType: "enemy",
    dangerLevel: 6,
    description: "Враждебный культиватор",
    canIgnore: false,
    canHide: false,
  },
  
  // === ЯВЛЕНИЯ (phenomenon) ===
  {
    id: "qi_storm",
    type: "phenomenon",
    subType: "storm",
    dangerLevel: 5,
    description: "Буря Ци в атмосфере",
    canIgnore: false,
    canHide: false,
    rewards: { qi: 50 }, // Можно поглотить часть
  },
  {
    id: "spirit_rain",
    type: "phenomenon",
    subType: "weather",
    dangerLevel: 1,
    description: "Духовный дождь",
    canIgnore: true,
    canHide: false,
    rewards: { qi: 20 },
  },
  {
    id: "earthquake",
    type: "phenomenon",
    subType: "natural",
    dangerLevel: 4,
    description: "Подземные толчки",
    canIgnore: false,
    canHide: false,
  },
  
  // === ДУХИ (spirit) ===
  {
    id: "location_spirit",
    type: "spirit",
    subType: "guardian",
    dangerLevel: 3,
    description: "Дух-хранитель этого места",
    canIgnore: true,
    canHide: false,
    rewards: { information: "секреты местности" },
  },
  {
    id: "ghost",
    type: "spirit",
    subType: "ghost",
    dangerLevel: 4,
    description: "Беспокойный дух",
    canIgnore: false,
    canHide: true,
  },
  {
    id: "ancestral_spirit",
    type: "spirit",
    subType: "ancestor",
    dangerLevel: 1,
    description: "Дух предков-культиваторов",
    canIgnore: true,
    canHide: false,
    rewards: { technique: "намёк на технику" },
  },
  
  // === РЕДКИЕ (rare) ===
  {
    id: "hidden_treasure",
    type: "rare",
    subType: "treasure",
    dangerLevel: 1,
    description: "Сокрытое сокровище",
    canIgnore: true,
    canHide: false,
    rewards: { item: "артефакт или ресурс" },
  },
  {
    id: "master_passing",
    type: "rare",
    subType: "master",
    dangerLevel: 1,
    description: "Мастер-культиватор, проходящий мимо",
    canIgnore: true,
    canHide: true,
    rewards: { technique: "возможность учиться" },
  },
  {
    id: "breakthrough_opportunity",
    type: "rare",
    subType: "opportunity",
    dangerLevel: 2,
    description: "Благоприятное стечение энергий",
    canIgnore: true,
    canHide: false,
    rewards: { qi: 100 },
  },
];

// ============================================
// ФУНКЦИИ РАСЧЁТА
// ============================================

/**
 * Определение времени суток
 */
export function getTimeOfDay(hour: number): string {
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "day";
  if (hour >= 17 && hour < 19) return "evening";
  if (hour >= 19 && hour < 21) return "dusk";
  return "night";
}

/**
 * Определение уровня опасности локации на основе qiDensity и distanceFromCenter
 */
export function getLocationDangerLevel(location: LocationData | null): number {
  if (!location) return 3; // Средняя опасность по умолчанию
  
  const { qiDensity, distanceFromCenter } = location;
  
  // Чем дальше от центра цивилизации, тем опаснее
  // Чем выше плотность Ци, тем сильнее существа
  const distanceFactor = Math.floor(distanceFromCenter / 20000); // 0-5
  const densityFactor = Math.floor(qiDensity / 30); // 0-4
  
  // Итоговый уровень опасности (1-10)
  return Math.min(10, Math.max(1, 1 + distanceFactor + densityFactor));
}

/**
 * Получение базового шанса прерывания для локации
 */
export function getLocationBaseChance(location: LocationData | null): number {
  if (!location) return 0.15;
  
  // Определяем тип локации по terrainType
  const terrainType = location.terrainType || "plains";
  
  // Прямое сопоставление
  if (MEDITATION_INTERRUPTION_LOCATION_CHANCE[terrainType]) {
    return MEDITATION_INTERRUPTION_LOCATION_CHANCE[terrainType];
  }
  
  // Fallback на основе расстояния от центра
  if (location.distanceFromCenter > 90000) return 0.50;
  if (location.distanceFromCenter > 70000) return 0.35;
  if (location.distanceFromCenter > 50000) return 0.25;
  if (location.distanceFromCenter > 30000) return 0.15;
  return 0.10;
}

/**
 * Расчёт модификатора от уровня культивации
 * Культиватор высокого уровня в слабой локации почти не тревожим
 */
export function calculateCultivationModifier(
  character: Character,
  locationDangerLevel: number
): number {
  const charLevel = character.cultivationLevel + character.cultivationSubLevel / 10;
  const dangerLevel = locationDangerLevel;
  
  // Если персонаж сильнее локации - меньше шансов быть потревоженным
  if (charLevel > dangerLevel + 2) {
    // На 2+ уровня сильнее - существа боятся подходить
    return 0.1; // 90% снижение шанса
  } else if (charLevel > dangerLevel) {
    return 0.3; // 70% снижение
  } else if (charLevel < dangerLevel - 2) {
    // На 2+ уровня слабее - привлекает хищников
    return 2.0; // 100% увеличение шанса
  } else if (charLevel < dangerLevel) {
    return 1.5; // 50% увеличение
  }
  
  return 1.0; // Без изменений
}

/**
 * Модификатор от навыков персонажа
 */
export function calculateSkillModifier(character: Character): number {
  // Используем новую систему навыков
  const skills = (character as Character & { skills?: Record<string, number> }).skills || {};
  return calculateSkillsInterruptionModifier(skills);
}

/**
 * Модификатор от формации
 */
export function calculateFormationModifier(
  formationId: FormationType | null,
  quality: number = 1
): number {
  return calculateFormationInterruptionModifier(formationId, quality);
}

/**
 * Полный расчёт шанса прерывания
 */
export function calculateInterruptionChance(
  character: Character,
  location: LocationData | null,
  worldTime: WorldTime | null,
  options: {
    formationId?: FormationType;
    formationQuality?: number;
  } = {}
): {
  baseChance: number;
  finalChance: number;
  modifiers: {
    location: number;
    cultivation: number;
    timeOfDay: number;
    skills: number;
    formation: number;
  };
} {
  // Базовый шанс от типа локации
  const baseChance = getLocationBaseChance(location);
  
  // Уровень опасности локации
  const locationDanger = getLocationDangerLevel(location);
  
  // Модификаторы
  const cultivationMod = calculateCultivationModifier(character, locationDanger);
  
  const timeOfDay = worldTime ? getTimeOfDay(worldTime.hour) : "day";
  const timeMod = MEDITATION_INTERRUPTION_TIME_MODIFIERS[timeOfDay] || 1.0;
  
  const skillMod = calculateSkillModifier(character);
  const formationMod = calculateFormationModifier(
    options.formationId || null,
    options.formationQuality || 1
  );
  
  // Итоговый шанс
  const finalChance = baseChance * cultivationMod * timeMod * skillMod * formationMod;
  
  return {
    baseChance,
    finalChance: Math.max(0.01, Math.min(0.95, finalChance)), // 1%-95%
    modifiers: {
      location: 1.0, // Уже учтён в baseChance
      cultivation: cultivationMod,
      timeOfDay: timeMod,
      skills: skillMod,
      formation: formationMod,
    },
  };
}

/**
 * Проверка прерывания на каждом часу медитации
 * 
 * ПРАВИЛА:
 * - Медитации меньше 60 минут НЕ проверяются на прерывание
 * - Медитации >= 60 минут проверяются каждый полный час (на 60, 120, 180... минуте)
 * 
 * @param character - Персонаж
 * @param location - Локация
 * @param worldTime - Мировое время
 * @param durationMinutes - Длительность медитации в минутах
 * @param options - Дополнительные опции (формация)
 */
export function checkMeditationInterruption(
  character: Character,
  location: LocationData | null,
  worldTime: WorldTime | null,
  durationMinutes: number,
  options: {
    formationId?: FormationType;
    formationQuality?: number;
  } = {}
): InterruptionCheckResult {
  const chanceCalc = calculateInterruptionChance(character, location, worldTime, options);
  
  // Медитации меньше 1 часа НЕ проверяются на прерывание
  if (durationMinutes < 60) {
    return {
      interrupted: false,
      event: null,
      checkHour: 0,
      baseChance: chanceCalc.baseChance,
      finalChance: chanceCalc.finalChance,
      modifiers: chanceCalc.modifiers,
    };
  }
  
  // Проверяем только каждый ПОЛНЫЙ час (floor вместо ceil)
  const fullHours = Math.floor(durationMinutes / 60);
  
  for (let hour = 1; hour <= fullHours; hour++) {
    // Шанс за этот час
    const roll = Math.random();
    
    if (roll < chanceCalc.finalChance) {
      // Прерывание! Выбираем событие
      const event = selectInterruptionEvent(character, location);
      
      return {
        interrupted: true,
        event,
        checkHour: hour,
        baseChance: chanceCalc.baseChance,
        finalChance: chanceCalc.finalChance,
        modifiers: chanceCalc.modifiers,
      };
    }
  }
  
  // Медитация прошла без прерываний
  return {
    interrupted: false,
    event: null,
    checkHour: fullHours,
    baseChance: chanceCalc.baseChance,
    finalChance: chanceCalc.finalChance,
    modifiers: chanceCalc.modifiers,
  };
}

/**
 * Выбор события прерывания
 */
export function selectInterruptionEvent(
  character: Character,
  location: LocationData | null
): InterruptionEvent {
  const charLevel = character.cultivationLevel + character.cultivationSubLevel / 10;
  const locationDanger = getLocationDangerLevel(location);
  
  // Фильтруем события по уровню опасности
  // Событие не должно быть слишком слабым или слишком сильным
  const minDanger = Math.max(1, Math.floor(charLevel) - 2);
  const maxDanger = Math.min(10, Math.ceil(charLevel) + 2);
  
  const suitableEvents = INTERRUPTION_EVENTS.filter(
    e => e.dangerLevel >= minDanger && e.dangerLevel <= maxDanger
  );
  
  // Если нет подходящих - берём случайное
  const events = suitableEvents.length > 0 ? suitableEvents : INTERRUPTION_EVENTS;
  
  // Взвешенный выбор по типу
  const typeWeights = {
    creature: 30,    // 30%
    person: 25,      // 25%
    phenomenon: 20,  // 20%
    spirit: 15,      // 15%
    rare: 10,        // 10%
  };
  
  // Случайный выбор типа
  const typeRoll = Math.random() * 100;
  let cumulative = 0;
  let selectedType: InterruptionEvent["type"] = "creature";
  
  for (const [type, weight] of Object.entries(typeWeights)) {
    cumulative += weight;
    if (typeRoll < cumulative) {
      selectedType = type as InterruptionEvent["type"];
      break;
    }
  }
  
  // Выбираем событие выбранного типа
  const typeEvents = events.filter(e => e.type === selectedType);
  const finalEvents = typeEvents.length > 0 ? typeEvents : events;
  
  return finalEvents[Math.floor(Math.random() * finalEvents.length)];
}

/**
 * Генерация промпта для LLM при прерывании
 */
export function generateInterruptionPrompt(
  event: InterruptionEvent,
  character: Character,
  location: LocationData | null,
  hourOfInterruption: number
): string {
  return `
Твоя медитация прервана на ${hourOfInterruption}-м часу!

Событие: ${event.description}
Тип: ${event.type} (${event.subType})
Уровень опасности: ${event.dangerLevel}/10

Контекст:
- Персонаж: уровень ${character.cultivationLevel}.${character.cultivationSubLevel}
- Локация: ${location?.name || "неизвестно"}
- Ядро было частично заполнено

${event.canIgnore ? "Можно проигнорировать и продолжить медитацию." : ""}
${event.canHide ? "Можно попытаться скрыться." : ""}

Опиши сцену кратко (2-3 предложения), дай игроку понять ситуацию.
Не описывай действия игрока - только то, что он видит и слышит.
`;
}

/**
 * Экспорт констант для UI
 * INTERRUPTION_EVENTS - таблица событий прерывания
 * 
 * Для обратной совместимости реэкспортируем константы из constants.ts:
 * - LOCATION_BASE_CHANCE = MEDITATION_INTERRUPTION_LOCATION_CHANCE
 * - TIME_MODIFIERS = MEDITATION_INTERRUPTION_TIME_MODIFIERS
 */
export { INTERRUPTION_EVENTS };
export { 
  MEDITATION_INTERRUPTION_LOCATION_CHANCE as LOCATION_BASE_CHANCE,
  MEDITATION_INTERRUPTION_TIME_MODIFIERS as TIME_MODIFIERS,
} from "./constants";
