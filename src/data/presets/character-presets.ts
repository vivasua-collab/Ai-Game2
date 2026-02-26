/**
 * ============================================================================
 * ПРЕСЕТЫ ПЕРСОНАЖЕЙ
 * ============================================================================
 * 
 * ИНСТРУКЦИЯ ПО СОЗДАНИЮ СТАРТОВЫХ ПЕРСОНАЖЕЙ:
 * 
 * 1. ОПРЕДЕЛИТЕ ТИП СТАРТА:
 *    - sect: Начало в секте (есть наставник, доступ к обучению)
 *    - random: Случайное начало (бродяга, без ресурсов)
 *    - custom: Кастомный старт (особые условия)
 * 
 * 2. УСТАНОВИТЕ ХАРАКТЕРИСТИКИ:
 *    - Базовые: strength, agility, intelligence (обычно 8-14)
 *    - conductivity: проводимость (обычно 0.0-0.5 для старта)
 *    - cultivationLevel: уровень культивации (обычно 1.0 для старта)
 * 
 * 3. ОПРЕДЕЛИТЕ НАЧАЛЬНЫЕ НАВЫКИ:
 *    - skills: {"skill_id": level}
 *    - Базовые навыки: deep_meditation (уровень 1)
 * 
 * 4. ОПРЕДЕЛИТЕ НАЧАЛЬНЫЕ ТЕХНИКИ:
 *    - techniques: ["technique_id"]
 *    - Базовые техники: breath_of_qi, reinforced_strike
 * 
 * 5. ДОБАВЬТЕ ОСОБЕННОСТИ:
 *    - features: массив идентификаторов
 *    - amnesia: не помнит прошлое
 *    - fast_learner: +20% к изучению
 *    - gifted: бонус к характеристикам
 * 
 * ============================================================================
 */

// ============================================
// ТИПЫ
// ============================================

export type StartType = "sect" | "random" | "custom";

export interface CharacterPresetStats {
  strength: number;
  agility: number;
  intelligence: number;
  conductivity: number;
}

export interface CharacterPresetCultivation {
  level: number;
  subLevel: number;
  coreCapacity: number;
  currentQi?: number;
}

export interface CharacterPreset {
  id: string;
  name: string;
  description: string;
  startType: StartType;
  
  // Характеристики
  stats: CharacterPresetStats;
  
  // Культивация
  cultivation: CharacterPresetCultivation;
  
  // Возраст
  age: number;
  
  // Начальные навыки (ID → уровень)
  skills: Record<string, number>;
  
  // Базовые техники (получаются автоматически)
  baseTechniques: string[];
  
  // Дополнительные техники (опционально)
  bonusTechniques?: string[];
  
  // Особенности персонажа
  features: string[];
  
  // Ресурсы
  resources?: {
    contributionPoints?: number;
    spiritStones?: number;
    items?: string[];
  };
  
  // Лор/предыстория
  backstory?: string;
  
  // Рекомендуемая локация старта
  suggestedLocation?: {
    terrainType: string;
    distanceFromCenter: number;
  };
}

// ============================================
// ПРЕСЕТЫ
// ============================================

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: "sect_disciple",
    name: "Ученик секты",
    description: "Молодой культиватор, только принятый в небольшую секту. Есть наставник и доступ к базовым ресурсам.",
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
  },
  {
    id: "wandering_cultivator",
    name: "Странствующий практик",
    description: "Бродячий культиватор без привязанности к секте. Свобода, но нет поддержки.",
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
  },
  {
    id: "talented_youth",
    name: "Одарённый юноша",
    description: "Молодой гений с высоким потенциалом. Привлёк внимание секты своими способностями.",
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
  },
  {
    id: "fallen_noble",
    name: "Падший аристократ",
    description: "Бывший дворянин, потерявший всё. Имеет хорошее образование, но теперь вынужден начать с нуля.",
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
  },
  {
    id: "hardened_warrior",
    name: "Закалённый воин",
    description: "Бывший солдат, переживший множество битв. Сильное тело, но ментальные шрамы.",
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
  },
  {
    id: "spirit_touched",
    name: "Отмеченный духом",
    description: "Человек, переживший встречу с духом. Получил необычные способности, но и проклятие.",
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
