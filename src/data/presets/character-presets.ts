/**
 * ============================================================================
 * ПРЕСЕТЫ ПЕРСОНАЖЕЙ (Единый формат)
 * ============================================================================
 * 
 * Стартовые наборы для новых персонажей:
 * - sect: Начало в секте (есть наставник, доступ к обучению)
 * - random: Случайное начало (бродяга, без ресурсов)
 * - custom: Кастомный старт (особые условия)
 * 
 * Особенности:
 * - Каждый пресет определяет начальные характеристики
 * - Базовые техники и навыки
 * - Ресурсы и предметы
 * - Предысторию
 * 
 * ============================================================================
 */

import type { BasePreset, PresetCategory, PresetRarity } from "./base-preset";

// ============================================
// ТИПЫ
// ============================================

/**
 * Тип старта персонажа
 */
export type StartType = "sect" | "random" | "custom";

/**
 * Характеристики персонажа
 */
export interface CharacterStats {
  strength: number;
  agility: number;
  intelligence: number;
  conductivity: number;
}

/**
 * Параметры культивации
 */
export interface CharacterCultivation {
  level: number;
  subLevel: number;
  coreCapacity: number;
  currentQi?: number;
}

/**
 * Ресурсы персонажа
 */
export interface CharacterResources {
  contributionPoints?: number;
  spiritStones?: number;
  items?: string[];
}

/**
 * Рекомендуемая локация старта
 */
export interface SuggestedLocation {
  terrainType: string;
  distanceFromCenter: number;
}

/**
 * Пресет персонажа (Единый формат)
 */
export interface CharacterPreset extends BasePreset {
  // === ТИП СТАРТА ===
  startType: StartType;
  
  // === ХАРАКТЕРИСТИКИ ===
  stats: CharacterStats;
  
  // === КУЛЬТИВАЦИЯ ===
  cultivation: CharacterCultivation;
  
  // === ВОЗРАСТ ===
  age: number;
  
  // === НАВЫКИ (ID → уровень) ===
  skills: Record<string, number>;
  
  // === БАЗОВЫЕ ТЕХНИКИ ===
  baseTechniques: string[];
  
  // === ДОПОЛНИТЕЛЬНЫЕ ТЕХНИКИ ===
  bonusTechniques?: string[];
  
  // === ОСОБЕННОСТИ ===
  features: string[];
  
  // === РЕСУРСЫ ===
  resources?: CharacterResources;
  
  // === ПРЕДЫСТОРИЯ ===
  backstory?: string;
  
  // === РЕКОМЕНДУЕМАЯ ЛОКАЦИЯ ===
  suggestedLocation?: SuggestedLocation;
}

// ============================================
// ПРЕСЕТЫ ПЕРСОНАЖЕЙ
// ============================================

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: "sect_disciple",
    name: "Ученик секты",
    nameEn: "Sect Disciple",
    description: "Молодой культиватор, только принятый в небольшую секту. Есть наставник и доступ к базовым ресурсам.",
    category: "basic",
    rarity: "common",
    startType: "sect",
    stats: {
      strength: 10,
      agility: 10,
      intelligence: 12,
      conductivity: 0.2,
    },
    cultivation: {
      level: 1,
      subLevel: 0,
      coreCapacity: 1000,
      currentQi: 0,
    },
    age: 16,
    skills: {
      "deep_meditation": 1,
    },
    baseTechniques: [
      "breath_of_qi",
      "reinforced_strike",
    ],
    features: ["amnesia"],
    resources: {
      contributionPoints: 10,
      spiritStones: 0,
      items: ["простая одежда", "деревянный меч"],
    },
    backstory: "Ты очнулся в небольшой секте. Старейшина говорит, что нашёл тебя без сознания у гор. Ты не помнишь своего прошлого.",
    suggestedLocation: {
      terrainType: "mountains",
      distanceFromCenter: 30000,
    },
    icon: "🏯",
  },
  {
    id: "wandering_cultivator",
    name: "Странствующий практик",
    nameEn: "Wandering Cultivator",
    description: "Бродячий культиватор без привязанности к секте. Свобода, но нет поддержки.",
    category: "basic",
    rarity: "common",
    startType: "random",
    stats: {
      strength: 11,
      agility: 12,
      intelligence: 10,
      conductivity: 0.3,
    },
    cultivation: {
      level: 1,
      subLevel: 2,
      coreCapacity: 1100,
      currentQi: 200,
    },
    age: 20,
    skills: {
      "deep_meditation": 1,
      "qi_perception": 1,
    },
    baseTechniques: [
      "breath_of_qi",
      "reinforced_strike",
    ],
    bonusTechniques: [
      "wind_speed",
    ],
    features: ["amnesia", "experienced"],
    resources: {
      contributionPoints: 0,
      spiritStones: 5,
      items: ["походная сумка", "карта региона"],
    },
    backstory: "Ты проснулся в лесу, не помня кто ты. Но твоё тело помнит основы культивации. Рядом лежит сумка с вещами.",
    suggestedLocation: {
      terrainType: "forest",
      distanceFromCenter: 50000,
    },
    icon: "🚶",
  },
  {
    id: "talented_youth",
    name: "Одарённый юноша",
    nameEn: "Talented Youth",
    description: "Молодой гений с высоким потенциалом. Привлёк внимание секты своими способностями.",
    category: "advanced",
    rarity: "uncommon",
    startType: "sect",
    stats: {
      strength: 9,
      agility: 10,
      intelligence: 14,
      conductivity: 0.5,
    },
    cultivation: {
      level: 1,
      subLevel: 0,
      coreCapacity: 1200,
      currentQi: 0,
    },
    age: 14,
    skills: {
      "deep_meditation": 2,
      "concentration": 1,
    },
    baseTechniques: [
      "breath_of_qi",
      "reinforced_strike",
    ],
    features: ["amnesia", "gifted", "fast_learner"],
    resources: {
      contributionPoints: 20,
      spiritStones: 0,
      items: ["одежда ученика", "учебник по медитации"],
    },
    backstory: "Ты был найден старейшиной секты. Твои способности к культивации поразительны для твоего возраста. Но прошлое - пустота.",
    suggestedLocation: {
      terrainType: "courtyard",
      distanceFromCenter: 20000,
    },
    icon: "⭐",
  },
  {
    id: "fallen_noble",
    name: "Падший аристократ",
    nameEn: "Fallen Noble",
    description: "Бывший дворянин, потерявший всё. Имеет хорошее образование, но теперь вынужден начать с нуля.",
    category: "advanced",
    rarity: "uncommon",
    startType: "random",
    stats: {
      strength: 10,
      agility: 11,
      intelligence: 13,
      conductivity: 0.25,
    },
    cultivation: {
      level: 1,
      subLevel: 1,
      coreCapacity: 1000,
      currentQi: 100,
    },
    age: 22,
    skills: {
      "deep_meditation": 1,
      "concentration": 1,
    },
    baseTechniques: [
      "breath_of_qi",
    ],
    bonusTechniques: [
      "mental_shield",
    ],
    features: ["amnesia", "educated"],
    resources: {
      contributionPoints: 0,
      spiritStones: 10,
      items: ["дорогой плащ (изношен)", "печатка с гербом"],
    },
    backstory: "Ты очнулся в городе, не помня своего имени. Твоя одежда и манеры выдают благородное происхождение. Но кто ты?",
    suggestedLocation: {
      terrainType: "village",
      distanceFromCenter: 10000,
    },
    icon: "👑",
  },
  {
    id: "hardened_warrior",
    name: "Закалённый воин",
    nameEn: "Hardened Warrior",
    description: "Бывший солдат, переживший множество битв. Сильное тело, но ментальные шрамы.",
    category: "advanced",
    rarity: "uncommon",
    startType: "random",
    stats: {
      strength: 14,
      agility: 12,
      intelligence: 9,
      conductivity: 0.15,
    },
    cultivation: {
      level: 1,
      subLevel: 0,
      coreCapacity: 1000,
      currentQi: 0,
    },
    age: 28,
    skills: {
      "deep_meditation": 1,
    },
    baseTechniques: [
      "breath_of_qi",
      "reinforced_strike",
    ],
    features: ["amnesia", "warrior_background"],
    resources: {
      contributionPoints: 0,
      spiritStones: 0,
      items: ["старый меч", "шрамы"],
    },
    backstory: "Ты проснулся на поле битвы среди тел. Ты не помнишь сражения, но твоё тело помнит бой. В руке - сломанный меч.",
    suggestedLocation: {
      terrainType: "plains",
      distanceFromCenter: 40000,
    },
    icon: "⚔️",
  },
  {
    id: "spirit_touched",
    name: "Отмеченный духом",
    nameEn: "Spirit Touched",
    description: "Человек, переживший встречу с духом. Получил необычные способности, но и проклятие.",
    category: "master",
    rarity: "rare",
    startType: "custom",
    stats: {
      strength: 9,
      agility: 10,
      intelligence: 12,
      conductivity: 0.4,
    },
    cultivation: {
      level: 1,
      subLevel: 0,
      coreCapacity: 1100,
      currentQi: 50,
    },
    age: 18,
    skills: {
      "deep_meditation": 1,
      "qi_perception": 2,
    },
    baseTechniques: [
      "breath_of_qi",
    ],
    bonusTechniques: [
      "water_shield",
    ],
    features: ["amnesia", "spirit_touched", "cursed"],
    resources: {
      contributionPoints: 0,
      spiritStones: 3,
      items: ["странный амулет"],
    },
    backstory: "Ты выжил после встречи с духом. Ты не помнишь что произошло, но иногда слышишь шёпот. Твоя проводимость к Ци изменилась.",
    suggestedLocation: {
      terrainType: "cave",
      distanceFromCenter: 60000,
    },
    icon: "👻",
  },
];

// ============================================
// ФУНКЦИИ ПОИСКА
// ============================================

/**
 * Получить пресет по ID
 */
export function getCharacterPresetById(id: string): CharacterPreset | undefined {
  return CHARACTER_PRESETS.find(p => p.id === id);
}

/**
 * Получить пресеты по типу старта
 */
export function getCharacterPresetsByStartType(startType: StartType): CharacterPreset[] {
  return CHARACTER_PRESETS.filter(p => p.startType === startType);
}

/**
 * Получить пресет для секты (по умолчанию)
 */
export function getDefaultSectPreset(): CharacterPreset {
  return CHARACTER_PRESETS.find(p => p.id === "sect_disciple") || CHARACTER_PRESETS[0];
}

/**
 * Получить пресет для случайного старта
 */
export function getDefaultRandomPreset(): CharacterPreset {
  const randomPresets = CHARACTER_PRESETS.filter(p => p.startType === "random");
  return randomPresets[Math.floor(Math.random() * randomPresets.length)] || CHARACTER_PRESETS[0];
}

/**
 * Получить все доступные пресеты
 */
export function getAllCharacterPresets(): CharacterPreset[] {
  return CHARACTER_PRESETS;
}
