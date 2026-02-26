/**
 * ============================================================================
 * ПРЕСЕТЫ ТЕХНИК
 * ============================================================================
 * 
 * ИНСТРУКЦИЯ ПО СОЗДАНИЮ ТЕХНИК:
 * 
 * 1. ОПРЕДЕЛИТЕ ТИП ТЕХНИКИ:
 *    - combat: Боевые (атаки, защита)
 *    - cultivation: Культивационные (накопление Ци)
 *    - support: Вспомогательные (баффы, дебаффы)
 *    - movement: Передвижения (ускорение, полёт, телепортация)
 *    - sensory: Восприятия (обнаружение, анализ)
 *    - healing: Исцеления (восстановление здоровья)
 * 
 * 2. ОПРЕДЕЛИТЕ УРОВЕНЬ ТЕХНИКИ:
 *    - level: Текущий уровень (1-9)
 *    - minLevel: Минимальный уровень развития
 *    - maxLevel: Максимальный уровень развития
 *    - Некоторые техники нельзя развить до 9-го уровня!
 * 
 * 3. УСТАНОВИТЕ ТРЕБОВАНИЯ К ХАРАКТЕРИСТИКАМ:
 *    - Физические техники: strength, agility
 *    - Техники Ци: intelligence, conductivity
 * 
 * 4. НАСТРОЙТЕ МАСШТАБИРОВАНИЕ (statScaling):
 *    - strength: +X% эффекта за каждую единицу выше 10
 *    - intelligence: +X% эффекта за каждую единицу выше 10
 *    - conductivity: +X% эффекта за каждую единицу проводимости
 * 
 * ============================================================================
 */

import type { 
  TechniqueType, 
  TechniqueRarity, 
  TechniqueElement 
} from "@/lib/game/techniques";

// ============================================
// ИНТЕРФЕЙС ПРЕСЕТА ТЕХНИКИ
// ============================================

export interface TechniquePreset {
  id: string;
  name: string;
  nameRu?: string;
  description: string;
  
  // Классификация
  type: TechniqueType;
  element: TechniqueElement;
  rarity: TechniqueRarity;
  level: number;  // Текущий уровень техники (1-9)
  
  // Схема развития техники
  minLevel: number;  // Минимальный уровень (обычно 1)
  maxLevel: number;  // Максимальный уровень развития (1-9)
  canEvolve?: boolean;  // Можно ли развивать технику (default: true)
  
  // Требования
  minCultivationLevel: number;
  qiCost: number;
  fatigueCost: {
    physical: number;
    mental: number;
  };
  
  // Требования к характеристикам (для изучения)
  statRequirements?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  };
  
  // Масштабирование от характеристик
  statScaling?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  };
  
  // Эффекты
  effects: {
    damage?: number;
    healing?: number;
    qiRegen?: number;
    duration?: number;
    distance?: number;  // Дальность телепортации (в метрах)
    statModifiers?: {
      strength?: number;
      agility?: number;
      intelligence?: number;
    };
  };
  
  // Мастерство
  masteryBonus: number;
  
  // Категория для UI
  category?: "basic" | "advanced" | "rare" | "legendary";
}

// ============================================
// БАЗОВЫЕ ТЕХНИКИ (получаются автоматически)
// ============================================

export const BASIC_TECHNIQUES: TechniquePreset[] = [
  {
    id: "breath_of_qi",
    name: "Дыхание Ци",
    description: "Базовая техника накопления Ци. Основа практики для любого культиватора.",
    type: "cultivation",
    element: "neutral",
    rarity: "common",
    level: 1,
    minLevel: 1,
    maxLevel: 9,  // Можно развить до максимума
    minCultivationLevel: 1,
    qiCost: 0,
    fatigueCost: { physical: 0.05, mental: 0.1 },
    statScaling: {
      intelligence: 0.02,
      conductivity: 0.1,
    },
    effects: { qiRegen: 5 },
    masteryBonus: 0.5,
    category: "basic",
  },
  {
    id: "reinforced_strike",
    name: "Усиленный удар",
    description: "Простой удар с использованием Ци. Первая боевая техника.",
    type: "combat",
    element: "neutral",
    rarity: "common",
    level: 1,
    minLevel: 1,
    maxLevel: 5,  // Ограничено до 5 уровня
    minCultivationLevel: 1,
    qiCost: 5,
    fatigueCost: { physical: 2, mental: 1 },
    statRequirements: { strength: 8 },
    statScaling: {
      strength: 0.05,
    },
    effects: { damage: 15 },
    masteryBonus: 0.3,
    category: "basic",
  },
];

// ============================================
// ПРОДВИНУТЫЕ ТЕХНИКИ (изучаются у NPC или из свитков)
// ============================================

export const ADVANCED_TECHNIQUES: TechniquePreset[] = [
  {
    id: "mental_shield",
    name: "Ментальный щит",
    description: "Защита от ментальных атак и духовного давления.",
    type: "support",
    element: "neutral",
    rarity: "uncommon",
    level: 2,
    minLevel: 1,
    maxLevel: 6,
    minCultivationLevel: 2,
    qiCost: 10,
    fatigueCost: { physical: 0.5, mental: 3 },
    statRequirements: { intelligence: 12 },
    statScaling: {
      intelligence: 0.03,
      conductivity: 0.05,
    },
    effects: { duration: 10 },
    masteryBonus: 0.4,
    category: "advanced",
  },
  {
    id: "wind_speed",
    name: "Скорость ветра",
    description: "Временное усиление скорости движения.",
    type: "movement",
    element: "air",
    rarity: "uncommon",
    level: 2,
    minLevel: 1,
    maxLevel: 5,
    minCultivationLevel: 2,
    qiCost: 15,
    fatigueCost: { physical: 3, mental: 2 },
    statRequirements: { agility: 12 },
    statScaling: {
      agility: 0.04,
    },
    effects: {
      duration: 5,
      statModifiers: { agility: 20 },
    },
    masteryBonus: 0.35,
    category: "advanced",
  },
  {
    id: "qi_healing",
    name: "Лечение Ци",
    description: "Восстановление здоровья с помощью Ци.",
    type: "healing",
    element: "neutral",
    rarity: "rare",
    level: 3,
    minLevel: 1,
    maxLevel: 7,
    minCultivationLevel: 3,
    qiCost: 30,
    fatigueCost: { physical: 1, mental: 5 },
    statRequirements: { intelligence: 14, conductivity: 0.5 },
    statScaling: {
      intelligence: 0.03,
      conductivity: 0.1,
    },
    effects: { healing: 25 },
    masteryBonus: 0.5,
    category: "advanced",
  },
  {
    id: "fire_strike",
    name: "Огненный удар",
    description: "Удар, усиленный огненной Ци.",
    type: "combat",
    element: "fire",
    rarity: "uncommon",
    level: 2,
    minLevel: 1,
    maxLevel: 6,
    minCultivationLevel: 2,
    qiCost: 15,
    fatigueCost: { physical: 3, mental: 2 },
    statRequirements: { strength: 10, conductivity: 0.3 },
    statScaling: {
      strength: 0.04,
      conductivity: 0.08,
    },
    effects: { damage: 25 },
    masteryBonus: 0.4,
    category: "advanced",
  },
  {
    id: "water_shield",
    name: "Водяной щит",
    description: "Защитный барьер из водяной Ци.",
    type: "support",
    element: "water",
    rarity: "uncommon",
    level: 2,
    minLevel: 1,
    maxLevel: 5,
    minCultivationLevel: 2,
    qiCost: 12,
    fatigueCost: { physical: 1, mental: 3 },
    statRequirements: { intelligence: 12, conductivity: 0.4 },
    statScaling: {
      intelligence: 0.03,
      conductivity: 0.06,
    },
    effects: { duration: 8 },
    masteryBonus: 0.35,
    category: "advanced",
  },
];

// ============================================
// РЕДКИЕ ТЕХНИКИ (сложно получить)
// ============================================

export const RARE_TECHNIQUES: TechniquePreset[] = [
  {
    id: "lightning_flash",
    name: "Молниеносный рывок",
    description: "Мгновенное перемещение на короткое расстояние.",
    type: "movement",
    element: "air",
    rarity: "rare",
    level: 4,
    minLevel: 1,
    maxLevel: 6,
    minCultivationLevel: 4,
    qiCost: 50,
    fatigueCost: { physical: 5, mental: 8 },
    statRequirements: { agility: 18, conductivity: 1.0 },
    statScaling: {
      agility: 0.05,
      conductivity: 0.12,
    },
    effects: {
      duration: 1,
      statModifiers: { agility: 50 },
    },
    masteryBonus: 0.6,
    category: "rare",
  },
  {
    id: "earth_armor",
    name: "Земляная броня",
    description: "Мощная защита, усиливающая тело.",
    type: "support",
    element: "earth",
    rarity: "rare",
    level: 3,
    minLevel: 1,
    maxLevel: 7,
    minCultivationLevel: 3,
    qiCost: 25,
    fatigueCost: { physical: 2, mental: 4 },
    statRequirements: { strength: 14, conductivity: 0.6 },
    statScaling: {
      strength: 0.04,
      conductivity: 0.08,
    },
    effects: {
      duration: 15,
      statModifiers: { strength: 15 },
    },
    masteryBonus: 0.45,
    category: "rare",
  },
  {
    id: "void_step",
    name: "Шаг пустоты",
    description: "Переход через пространство пустоты. Техника высшего уровня.",
    type: "movement",
    element: "void",
    rarity: "legendary",
    level: 6,
    minLevel: 1,
    maxLevel: 9,
    minCultivationLevel: 6,
    qiCost: 100,
    fatigueCost: { physical: 10, mental: 15 },
    statRequirements: { intelligence: 20, conductivity: 2.0 },
    statScaling: {
      intelligence: 0.06,
      conductivity: 0.15,
    },
    effects: {
      duration: 2,
    },
    masteryBonus: 0.8,
    category: "rare",
  },
];

// ============================================
// ЛЕГЕНДАРНЫЕ ТЕХНИКИ (телепортация и другие)
// ============================================

export const LEGENDARY_TECHNIQUES: TechniquePreset[] = [
  {
    id: "spatial_shift",
    name: "Пространственный сдвиг",
    description: "Телепортация в пределах видимости. Доступна с 7-го уровня культивации.",
    type: "movement",
    element: "void",
    rarity: "legendary",
    level: 7,
    minLevel: 7,
    maxLevel: 9,  // Развивается с 7 до 9 уровня
    minCultivationLevel: 7,
    qiCost: 200,
    fatigueCost: { physical: 15, mental: 25 },
    statRequirements: { intelligence: 25, conductivity: 3.0 },
    statScaling: {
      intelligence: 0.08,
      conductivity: 0.2,
    },
    effects: {
      distance: 1000,  // 1 км на 7-м уровне
    },
    masteryBonus: 1.0,
    category: "legendary",
  },
  {
    id: "heavenly_transmission",
    name: "Небесная передача",
    description: "Дальняя телепортация в ранее посещённые места. Требует метку места.",
    type: "movement",
    element: "void",
    rarity: "legendary",
    level: 8,
    minLevel: 8,
    maxLevel: 9,
    minCultivationLevel: 8,
    qiCost: 500,
    fatigueCost: { physical: 25, mental: 40 },
    statRequirements: { intelligence: 30, conductivity: 4.0 },
    statScaling: {
      intelligence: 0.1,
      conductivity: 0.25,
    },
    effects: {
      distance: 50000,  // 50 км на 8-м уровне
    },
    masteryBonus: 1.2,
    category: "legendary",
  },
  {
    id: "void_march",
    name: "Марш пустоты",
    description: "Мгновенная телепортация на любую дистанцию в пределах мира. Высшая техника перемещения.",
    type: "movement",
    element: "void",
    rarity: "legendary",
    level: 9,
    minLevel: 9,
    maxLevel: 9,  // Только 9-й уровень
    minCultivationLevel: 9,
    qiCost: 1000,
    fatigueCost: { physical: 40, mental: 60 },
    statRequirements: { intelligence: 35, conductivity: 5.0 },
    statScaling: {
      intelligence: 0.12,
      conductivity: 0.3,
    },
    effects: {
      distance: 500000,  // 500 км - в пределах мира
    },
    masteryBonus: 1.5,
    category: "legendary",
  },
];

// ============================================
// ЭКСПОРТ ВСЕХ ТЕХНИК
// ============================================

export const ALL_TECHNIQUE_PRESETS: TechniquePreset[] = [
  ...BASIC_TECHNIQUES,
  ...ADVANCED_TECHNIQUES,
  ...RARE_TECHNIQUES,
  ...LEGENDARY_TECHNIQUES,
];

// ============================================
// ФУНКЦИИ ПОИСКА
// ============================================

/**
 * Получить технику по ID
 */
export function getTechniquePresetById(id: string): TechniquePreset | undefined {
  return ALL_TECHNIQUE_PRESETS.find(t => t.id === id);
}

/**
 * Получить техники по типу
 */
export function getTechniquePresetsByType(type: TechniqueType): TechniquePreset[] {
  return ALL_TECHNIQUE_PRESETS.filter(t => t.type === type);
}

/**
 * Получить техники по уровню
 */
export function getTechniquePresetsByLevel(level: number): TechniquePreset[] {
  return ALL_TECHNIQUE_PRESETS.filter(t => t.level === level);
}

/**
 * Получить техники по элементу
 */
export function getTechniquePresetsByElement(element: TechniqueElement): TechniquePreset[] {
  return ALL_TECHNIQUE_PRESETS.filter(t => t.element === element);
}

/**
 * Получить базовые техники (для стартовых персонажей)
 */
export function getBasicTechniques(): TechniquePreset[] {
  return BASIC_TECHNIQUES;
}

/**
 * Получить техники, доступные для уровня культивации
 */
export function getAvailableTechniquePresets(cultivationLevel: number): TechniquePreset[] {
  return ALL_TECHNIQUE_PRESETS.filter(t => t.minCultivationLevel <= cultivationLevel);
}

/**
 * Получить техники телепортации (7+ уровень)
 */
export function getTeleportationTechniques(): TechniquePreset[] {
  return LEGENDARY_TECHNIQUES.filter(t => t.type === "movement" && t.effects.distance);
}

/**
 * Рассчитать дальность телепортации
 */
export function calculateTeleportDistance(technique: TechniquePreset, techniqueLevel: number): number {
  if (!technique.effects.distance) return 0;
  
  // Базовая дистанция умножается на уровень техники
  const baseDistance = technique.effects.distance;
  const levelMultiplier = 1 + (techniqueLevel - technique.minLevel) * 0.5;  // +50% за уровень
  
  return Math.floor(baseDistance * levelMultiplier);
}
