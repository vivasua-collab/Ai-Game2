/**
 * ============================================================================
 * ПРЕСЕТЫ ВИДОВ (Species Presets)
 * ============================================================================
 * 
 * ИЕРАРХИЯ ТИПОВ (см. docs/soul-system.md):
 * 
 * УРОВЕНЬ 1: SoulType (ПЕРВИЧНЫЙ) — character, creature, spirit, construct
 * УРОВЕНЬ 2: Morphology (ВТОРИЧНЫЙ) — humanoid, quadruped, bird, serpentine
 * УРОВЕНЬ 3: Species (КОНКРЕТНЫЙ) — human, elf, wolf, dragon
 * 
 * Каждый вид влияет на:
 * - Базовые характеристики (сила, ловкость, интеллект, жизнеспособность)
 * - Способности (культивация, речь, использование инструментов)
 * - Культивацию (ёмкость ядра, максимальный уровень)
 * - Тело (шаблон, размер, материал)
 * - Врождённые техники
 * - Слабости и сопротивления
 * 
 * ============================================================================
 */

import type { BasePreset } from "./base-preset";
import type { SoulType, BodyMorphology, BodyMaterial } from "@/types/entity-types";

// ============================================
// ТИПЫ
// ============================================

/**
 * Тип вида
 */
export type SpeciesType = 
  | "humanoid"    // Человекоподобные
  | "beast"       // Звери
  | "spirit"      // Духи
  | "hybrid"      // Гибриды
  | "aberration"; // Аберрации

/**
 * Подтипы гуманоидов
 */
export type HumanoidSubtype = 
  | "human"     // Человек
  | "elf"       // Эльф
  | "demon"     // Демон-гуманоид
  | "giant"     // Великан
  | "dwarf"     // Карлик
  | "beastkin"; // Зверолюд

/**
 * Подтипы зверей
 */
export type BeastSubtype = 
  | "predator"   // Хищник
  | "herbivore"  // Травоядное
  | "reptile"    // Рептилия
  | "bird"       // Птица
  | "aquatic"    // Водное
  | "insect"     // Насекомое
  | "arachnid"   // Паукообразное (пауки, скорпионы)
  | "myriapod"   // Многоногое (многоножки)
  | "dragon"     // Дракон
  | "legendary"; // Легендарный зверь

/**
 * Подтипы духов
 */
export type SpiritSubtype = 
  | "ghost"      // Призрак
  | "elemental"  // Элементаль
  | "divine"     // Божество
  | "demonic"    // Демонический дух
  | "nature";    // Дух природы

/**
 * Подтипы гибридов
 */
export type HybridSubtype = 
  | "centaur"  // Кентавр
  | "mermaid"  // Русалка
  | "werewolf" // Оборотень
  | "harpy"    // Гарпия
  | "lamia"    // Ламия
  | "sphinx";  // Сфинкс

/**
 * Подтипы аберраций
 */
export type AberrationSubtype = 
  | "chaos"      // Порождение хаоса
  | "cthonian"   // Хтонь
  | "mutant"     // Мутант
  | "construct"; // Конструкт

/**
 * Шаблон тела
 */
export type BodyTemplate = 
  | "humanoid"          // Гуманоидное тело
  | "beast_quadruped"   // Четвероногое
  | "beast_bird"        // Птица
  | "beast_serpentine"  // Змееподобное
  | "beast_arthropod"   // Членистоногое (пауки, многоножки, скорпионы)
  | "spirit";           // Бесплотное

/**
 * Класс размера
 */
export type SizeClass = 
  | "tiny"       // Крошечный (< 30 см)
  | "small"      // Маленький (30-60 см)
  | "medium"     // Средний (60-180 см)
  | "large"      // Большой (1.8-3 м)
  | "huge";      // Огромный (3-10 м)

/**
 * Диапазон значений
 */
export interface Range {
  min: number;
  max: number;
}

/**
 * Базовые характеристики вида
 */
export interface SpeciesBaseStats {
  strength: Range;     // Сила
  agility: Range;      // Ловкость
  intelligence: Range; // Интеллект
  vitality: Range;     // Жизнеспособность
}

/**
 * Способности вида
 */
export interface SpeciesCapabilities {
  canCultivate: boolean;       // Может культивировать
  innateQiGeneration: boolean; // Врождённая генерация Ци
  speechCapable: boolean;      // Может говорить
  toolUse: boolean;            // Может использовать инструменты
  learningRate: number;        // Скорость обучения (0.1 - 2.0)
}

/**
 * Параметры культивации вида
 */
export interface SpeciesCultivation {
  coreCapacityBase: Range;     // Базовая ёмкость ядра
  coreQualityRange: Range;     // Диапазон качества ядра
  conductivityBase: number;    // Базовая проводимость
  maxCultivationLevel: number; // Максимальный уровень культивации
}

/**
 * Врождённая техника
 */
export interface InnateTechnique {
  techniqueId: string;   // ID техники
  unlockLevel: number;   // Уровень культивации для открытия
  mastery: number;       // Начальное мастерство (%)
}

/**
 * Интерфейс пресета вида
 * 
 * @see docs/soul-system.md — документация иерархии
 */
export interface SpeciesPreset extends BasePreset {
  // === ИЕРАРХИЯ ТИПОВ ===
  /** УРОВЕНЬ 1: Тип души (ПЕРВИЧНЫЙ) */
  soulType: SoulType;
  /** УРОВЕНЬ 2: Морфология тела (ВТОРИЧНЫЙ) */
  morphology: BodyMorphology;
  /** УРОВЕНЬ 3: Подтип вида */
  subtype: string;
  
  // === УСТАРЕВШИЕ ПОЛЯ (для обратной совместимости) ===
  /** @deprecated Используйте soulType и morphology */
  type: SpeciesType;
  /** @deprecated Используйте morphology */
  bodyTemplate: BodyTemplate;
  
  // === МАТЕРИАЛ ТЕЛА ===
  /** Материал тела (organic, scaled, ethereal, mineral, chaos) */
  bodyMaterial: BodyMaterial;
  
  // === ХАРАКТЕРИСТИКИ ===
  baseStats: SpeciesBaseStats;
  
  // === СПОСОБНОСТИ ===
  capabilities: SpeciesCapabilities;
  
  // === КУЛЬТИВАЦИЯ ===
  cultivation: SpeciesCultivation;
  
  // === РАЗМЕР ===
  sizeClass: SizeClass;
  
  // === ВРОЖДЁННЫЕ ТЕХНИКИ ===
  innateTechniques?: InnateTechnique[];
  
  // === СТАРЕНИЕ ===
  aging?: {
    lifespan: number;      // Максимальная продолжительность (годы)
    maturityAge: number;   // Возраст зрелости
    declineAge: number;    // Возраст старения
  };
  
  // === СЛАБОСТИ И СОПРОТИВЛЕНИЯ ===
  weaknesses?: string[];
  resistances?: string[];
}

// ============================================
// ГУМАНОИДНЫЕ ВИДЫ
// ============================================

const HUMANOID_SPECIES: SpeciesPreset[] = [
  {
    id: "human",
    name: "Человек",
    nameEn: "Human",
    description: "Сбалансированный вид с высоким потенциалом к культивации. Основа большинства сект.",
    category: "basic",
    rarity: "common",
    type: "humanoid",
    subtype: "human",
    baseStats: {
      strength: { min: 5, max: 20 },
      agility: { min: 5, max: 20 },
      intelligence: { min: 5, max: 25 },
      vitality: { min: 5, max: 18 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: true,
      toolUse: true,
      learningRate: 1.0,
    },
    cultivation: {
      coreCapacityBase: { min: 100, max: 2000 },
      coreQualityRange: { min: 1, max: 100 },
      conductivityBase: 1.0,
      maxCultivationLevel: 9,
    },
    bodyTemplate: "humanoid",
    sizeClass: "medium",
    innateTechniques: [],
    aging: {
      lifespan: 100,
      maturityAge: 18,
      declineAge: 60,
    },
    weaknesses: [],
    resistances: [],
    icon: "👤",
  },
  {
    id: "elf",
    name: "Эльф",
    nameEn: "Elf",
    description: "Древняя раса с высоким интеллектом и ловкостью. Живут дольше людей, но медленнее обучаются.",
    category: "advanced",
    rarity: "uncommon",
    type: "humanoid",
    subtype: "elf",
    baseStats: {
      strength: { min: 3, max: 15 },
      agility: { min: 8, max: 30 },
      intelligence: { min: 10, max: 35 },
      vitality: { min: 4, max: 15 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: true,
      toolUse: true,
      learningRate: 0.8,
    },
    cultivation: {
      coreCapacityBase: { min: 150, max: 2500 },
      coreQualityRange: { min: 1, max: 100 },
      conductivityBase: 1.2,
      maxCultivationLevel: 8,
    },
    bodyTemplate: "humanoid",
    sizeClass: "medium",
    innateTechniques: [
      { techniqueId: "wind_speed", unlockLevel: 1, mastery: 20 },
    ],
    aging: {
      lifespan: 500,
      maturityAge: 50,
      declineAge: 400,
    },
    weaknesses: ["iron"],
    resistances: ["mental", "nature"],
    icon: "🧝",
  },
  {
    id: "demon_humanoid",
    name: "Демон-гуманоид",
    nameEn: "Demon",
    description: "Сильный вид с врождённой генерацией Ци. Часто агрессивны и склонны к тёмным практикам.",
    category: "advanced",
    rarity: "rare",
    type: "humanoid",
    subtype: "demon",
    baseStats: {
      strength: { min: 10, max: 35 },
      agility: { min: 5, max: 25 },
      intelligence: { min: 5, max: 20 },
      vitality: { min: 10, max: 30 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: true,
      speechCapable: true,
      toolUse: true,
      learningRate: 0.9,
    },
    cultivation: {
      coreCapacityBase: { min: 200, max: 4000 },
      coreQualityRange: { min: 1, max: 100 },
      conductivityBase: 1.5,
      maxCultivationLevel: 9,
    },
    bodyTemplate: "humanoid",
    sizeClass: "medium",
    innateTechniques: [
      { techniqueId: "fire_strike", unlockLevel: 1, mastery: 30 },
    ],
    aging: {
      lifespan: 300,
      maturityAge: 30,
      declineAge: 250,
    },
    weaknesses: ["holy", "light"],
    resistances: ["fire", "dark"],
    icon: "😈",
  },
  {
    id: "giant",
    name: "Великан",
    nameEn: "Giant",
    description: "Огромный вид с невероятной силой, но низкой ловкостью и интеллектом.",
    category: "advanced",
    rarity: "uncommon",
    type: "humanoid",
    subtype: "giant",
    baseStats: {
      strength: { min: 20, max: 80 },
      agility: { min: 2, max: 10 },
      intelligence: { min: 2, max: 12 },
      vitality: { min: 15, max: 50 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: true,
      toolUse: true,
      learningRate: 0.5,
    },
    cultivation: {
      coreCapacityBase: { min: 300, max: 6000 },
      coreQualityRange: { min: 1, max: 60 },
      conductivityBase: 0.8,
      maxCultivationLevel: 6,
    },
    bodyTemplate: "humanoid",
    sizeClass: "huge",
    innateTechniques: [],
    aging: {
      lifespan: 200,
      maturityAge: 40,
      declineAge: 160,
    },
    weaknesses: ["agility"],
    resistances: ["physical", "cold"],
    icon: "🧌",
  },
  {
    id: "beastkin",
    name: "Зверолюд",
    nameEn: "Beastkin",
    description: "Гибрид человека и зверя. Сочетает интеллект человека с инстинктами животного.",
    category: "basic",
    rarity: "uncommon",
    type: "humanoid",
    subtype: "beastkin",
    baseStats: {
      strength: { min: 6, max: 25 },
      agility: { min: 7, max: 28 },
      intelligence: { min: 4, max: 18 },
      vitality: { min: 6, max: 22 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: true,
      toolUse: true,
      learningRate: 0.9,
    },
    cultivation: {
      coreCapacityBase: { min: 100, max: 1800 },
      coreQualityRange: { min: 1, max: 80 },
      conductivityBase: 1.0,
      maxCultivationLevel: 8,
    },
    bodyTemplate: "humanoid",
    sizeClass: "medium",
    innateTechniques: [
      { techniqueId: "reinforced_strike", unlockLevel: 0, mastery: 40 },
    ],
    aging: {
      lifespan: 80,
      maturityAge: 15,
      declineAge: 55,
    },
    weaknesses: ["silver"],
    resistances: ["disease"],
    icon: "🐺",
  },
];

// ============================================
// ЗВЕРИНЫЕ ВИДЫ
// ============================================

const BEAST_SPECIES: SpeciesPreset[] = [
  // Хищники
  {
    id: "wolf",
    name: "Волк",
    nameEn: "Wolf",
    description: "Стайный хищник с высокой ловкостью. Способен к культивации.",
    category: "basic",
    rarity: "common",
    type: "beast",
    subtype: "predator",
    baseStats: {
      strength: { min: 8, max: 25 },
      agility: { min: 10, max: 30 },
      intelligence: { min: 3, max: 10 },
      vitality: { min: 8, max: 20 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: false,
      toolUse: false,
      learningRate: 0.7,
    },
    cultivation: {
      coreCapacityBase: { min: 50, max: 500 },
      coreQualityRange: { min: 1, max: 50 },
      conductivityBase: 0.8,
      maxCultivationLevel: 6,
    },
    bodyTemplate: "beast_quadruped",
    sizeClass: "medium",
    innateTechniques: [
      { techniqueId: "bite", unlockLevel: 0, mastery: 50 },
      { techniqueId: "claw_swipe", unlockLevel: 0, mastery: 40 },
    ],
    aging: {
      lifespan: 15,
      maturityAge: 2,
      declineAge: 10,
    },
    weaknesses: [],
    resistances: ["cold"],
    icon: "🐺",
  },
  {
    id: "tiger",
    name: "Тигр",
    nameEn: "Tiger",
    description: "Одиночный хищник с огромной силой. Один из сильнейших зверей.",
    category: "advanced",
    rarity: "uncommon",
    type: "beast",
    subtype: "predator",
    baseStats: {
      strength: { min: 15, max: 50 },
      agility: { min: 10, max: 35 },
      intelligence: { min: 4, max: 15 },
      vitality: { min: 12, max: 35 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: false,
      toolUse: false,
      learningRate: 0.6,
    },
    cultivation: {
      coreCapacityBase: { min: 100, max: 1500 },
      coreQualityRange: { min: 1, max: 70 },
      conductivityBase: 1.0,
      maxCultivationLevel: 7,
    },
    bodyTemplate: "beast_quadruped",
    sizeClass: "large",
    innateTechniques: [
      { techniqueId: "bite", unlockLevel: 0, mastery: 60 },
      { techniqueId: "claw_swipe", unlockLevel: 0, mastery: 55 },
      { techniqueId: "roar", unlockLevel: 2, mastery: 30 },
    ],
    aging: {
      lifespan: 25,
      maturityAge: 4,
      declineAge: 18,
    },
    weaknesses: [],
    resistances: ["fear"],
    icon: "🐅",
  },
  {
    id: "bear",
    name: "Медведь",
    nameEn: "Bear",
    description: "Мощный хищник с невероятной жизнеспособностью. Танк среди зверей.",
    category: "advanced",
    rarity: "uncommon",
    type: "beast",
    subtype: "predator",
    baseStats: {
      strength: { min: 20, max: 60 },
      agility: { min: 5, max: 20 },
      intelligence: { min: 3, max: 12 },
      vitality: { min: 20, max: 50 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: false,
      toolUse: false,
      learningRate: 0.5,
    },
    cultivation: {
      coreCapacityBase: { min: 150, max: 2000 },
      coreQualityRange: { min: 1, max: 60 },
      conductivityBase: 0.7,
      maxCultivationLevel: 6,
    },
    bodyTemplate: "beast_quadruped",
    sizeClass: "large",
    innateTechniques: [
      { techniqueId: "bite", unlockLevel: 0, mastery: 45 },
      { techniqueId: "claw_swipe", unlockLevel: 0, mastery: 50 },
    ],
    aging: {
      lifespan: 30,
      maturityAge: 5,
      declineAge: 22,
    },
    weaknesses: ["agility"],
    resistances: ["physical", "cold"],
    icon: "🐻",
  },
  // Рептилии
  {
    id: "snake",
    name: "Змея",
    nameEn: "Snake",
    description: "Змееподобный хищник с ядом. Быстрая и скрытная.",
    category: "basic",
    rarity: "common",
    type: "beast",
    subtype: "reptile",
    baseStats: {
      strength: { min: 4, max: 18 },
      agility: { min: 8, max: 30 },
      intelligence: { min: 2, max: 8 },
      vitality: { min: 5, max: 20 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: false,
      toolUse: false,
      learningRate: 0.6,
    },
    cultivation: {
      coreCapacityBase: { min: 40, max: 400 },
      coreQualityRange: { min: 1, max: 50 },
      conductivityBase: 0.9,
      maxCultivationLevel: 5,
    },
    bodyTemplate: "beast_serpentine",
    sizeClass: "small",
    innateTechniques: [
      { techniqueId: "bite", unlockLevel: 0, mastery: 60 },
      { techniqueId: "poison_spit", unlockLevel: 1, mastery: 40 },
    ],
    aging: {
      lifespan: 20,
      maturityAge: 3,
      declineAge: 15,
    },
    weaknesses: ["cold"],
    resistances: ["poison"],
    icon: "🐍",
  },
  {
    id: "lizard",
    name: "Ящерица",
    nameEn: "Lizard",
    description: "Четвероногая рептилия с регенерацией. Живучая и осторожная.",
    category: "basic",
    rarity: "common",
    type: "beast",
    subtype: "reptile",
    baseStats: {
      strength: { min: 5, max: 20 },
      agility: { min: 6, max: 22 },
      intelligence: { min: 2, max: 8 },
      vitality: { min: 8, max: 25 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: false,
      toolUse: false,
      learningRate: 0.5,
    },
    cultivation: {
      coreCapacityBase: { min: 40, max: 450 },
      coreQualityRange: { min: 1, max: 50 },
      conductivityBase: 0.8,
      maxCultivationLevel: 5,
    },
    bodyTemplate: "beast_quadruped",
    sizeClass: "small",
    innateTechniques: [
      { techniqueId: "bite", unlockLevel: 0, mastery: 40 },
      { techniqueId: "tail_whip", unlockLevel: 0, mastery: 35 },
    ],
    aging: {
      lifespan: 15,
      maturityAge: 2,
      declineAge: 10,
    },
    weaknesses: ["cold"],
    resistances: ["poison", "regeneration"],
    icon: "🦎",
  },
  // Птицы
  {
    id: "eagle",
    name: "Орёл",
    nameEn: "Eagle",
    description: "Хищная птица с острым зрением. Быстрая и смертоносная.",
    category: "basic",
    rarity: "common",
    type: "beast",
    subtype: "bird",
    baseStats: {
      strength: { min: 4, max: 15 },
      agility: { min: 12, max: 40 },
      intelligence: { min: 3, max: 12 },
      vitality: { min: 3, max: 12 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: false,
      toolUse: false,
      learningRate: 0.6,
    },
    cultivation: {
      coreCapacityBase: { min: 30, max: 300 },
      coreQualityRange: { min: 1, max: 50 },
      conductivityBase: 1.0,
      maxCultivationLevel: 5,
    },
    bodyTemplate: "beast_bird",
    sizeClass: "small",
    innateTechniques: [
      { techniqueId: "dive_attack", unlockLevel: 0, mastery: 50 },
      { techniqueId: "claw_swipe", unlockLevel: 0, mastery: 45 },
    ],
    aging: {
      lifespan: 25,
      maturityAge: 4,
      declineAge: 18,
    },
    weaknesses: ["physical"],
    resistances: ["air"],
    icon: "🦅",
  },
  {
    id: "hawk",
    name: "Ястреб",
    nameEn: "Hawk",
    description: "Быстрая хищная птица. Мастер стремительных атак.",
    category: "basic",
    rarity: "common",
    type: "beast",
    subtype: "bird",
    baseStats: {
      strength: { min: 3, max: 12 },
      agility: { min: 15, max: 45 },
      intelligence: { min: 3, max: 10 },
      vitality: { min: 2, max: 10 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: false,
      toolUse: false,
      learningRate: 0.7,
    },
    cultivation: {
      coreCapacityBase: { min: 25, max: 250 },
      coreQualityRange: { min: 1, max: 45 },
      conductivityBase: 1.1,
      maxCultivationLevel: 4,
    },
    bodyTemplate: "beast_bird",
    sizeClass: "small",
    innateTechniques: [
      { techniqueId: "dive_attack", unlockLevel: 0, mastery: 55 },
      { techniqueId: "claw_swipe", unlockLevel: 0, mastery: 40 },
    ],
    aging: {
      lifespan: 20,
      maturityAge: 2,
      declineAge: 14,
    },
    weaknesses: ["physical"],
    resistances: ["air"],
    icon: "🦅",
  },
  // Легендарные звери
  {
    id: "dragon_beast",
    name: "Дракон",
    nameEn: "Dragon",
    description: "Легендарный зверь с огромной силой и врождённой генерацией Ци. Вершина звериной культивации.",
    category: "legendary",
    rarity: "legendary",
    type: "beast",
    subtype: "dragon",
    baseStats: {
      strength: { min: 50, max: 200 },
      agility: { min: 20, max: 80 },
      intelligence: { min: 20, max: 100 },
      vitality: { min: 50, max: 200 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: true,
      speechCapable: true,
      toolUse: false,
      learningRate: 0.4,
    },
    cultivation: {
      coreCapacityBase: { min: 2000, max: 50000 },
      coreQualityRange: { min: 10, max: 100 },
      conductivityBase: 5.0,
      maxCultivationLevel: 9,
    },
    bodyTemplate: "beast_quadruped",
    sizeClass: "huge",
    innateTechniques: [
      { techniqueId: "dragon_breath", unlockLevel: 0, mastery: 70 },
      { techniqueId: "fire_ball", unlockLevel: 2, mastery: 50 },
      { techniqueId: "dragon_roar", unlockLevel: 4, mastery: 40 },
      { techniqueId: "dragon_form", unlockLevel: 6, mastery: 20 },
    ],
    aging: {
      lifespan: 10000,
      maturityAge: 500,
      declineAge: 8000,
    },
    weaknesses: ["dragon_slayer"],
    resistances: ["fire", "mental", "physical"],
    icon: "🐉",
  },
  {
    id: "phoenix",
    name: "Феникс",
    nameEn: "Phoenix",
    description: "Легендарный дух-зверь огня. Бессмертен через возрождение из пепла.",
    category: "legendary",
    rarity: "legendary",
    type: "beast",
    subtype: "legendary",
    baseStats: {
      strength: { min: 30, max: 120 },
      agility: { min: 30, max: 100 },
      intelligence: { min: 25, max: 80 },
      vitality: { min: 40, max: 150 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: true,
      speechCapable: true,
      toolUse: false,
      learningRate: 0.3,
    },
    cultivation: {
      coreCapacityBase: { min: 1500, max: 30000 },
      coreQualityRange: { min: 8, max: 100 },
      conductivityBase: 4.0,
      maxCultivationLevel: 9,
    },
    bodyTemplate: "beast_bird",
    sizeClass: "large",
    innateTechniques: [
      { techniqueId: "fire_ball", unlockLevel: 0, mastery: 70 },
      { techniqueId: "rebirth_flame", unlockLevel: 3, mastery: 50 },
      { techniqueId: "healing_flame", unlockLevel: 5, mastery: 40 },
    ],
    aging: {
      lifespan: 5000,
      maturityAge: 100,
      declineAge: 4000,
    },
    weaknesses: ["water", "void"],
    resistances: ["fire", "mental", "regeneration"],
    icon: "🔥",
  },
  // Членистоногие
  {
    id: "spider",
    name: "Паук",
    nameEn: "Spider",
    description: "Членистоногое с ядовитыми хелицерами и паутиной. Хитиновый экзоскелет.",
    category: "basic",
    rarity: "common",
    type: "beast",
    soulType: "creature",
    morphology: "arthropod",
    subtype: "arachnid",
    bodyMaterial: "chitin",
    baseStats: {
      strength: { min: 2, max: 10 },
      agility: { min: 8, max: 30 },
      intelligence: { min: 1, max: 5 },
      vitality: { min: 3, max: 15 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: false,
      toolUse: false,
      learningRate: 0.4,
    },
    cultivation: {
      coreCapacityBase: { min: 20, max: 200 },
      coreQualityRange: { min: 1, max: 30 },
      conductivityBase: 0.5,
      maxCultivationLevel: 3,
    },
    bodyTemplate: "beast_arthropod",
    sizeClass: "small",
    innateTechniques: [
      { techniqueId: "bite", unlockLevel: 0, mastery: 70 },
      { techniqueId: "web_shot", unlockLevel: 0, mastery: 50 },
    ],
    aging: {
      lifespan: 5,
      maturityAge: 1,
      declineAge: 3,
    },
    weaknesses: ["fire", "crushing"],
    resistances: ["poison"],
    icon: "🕷️",
  },
  {
    id: "giant_spider",
    name: "Гигантский Паук",
    nameEn: "Giant Spider",
    description: "Огромный паук со смертельным ядом и прочной паутиной. Опасный хищник.",
    category: "advanced",
    rarity: "uncommon",
    type: "beast",
    soulType: "creature",
    morphology: "arthropod",
    subtype: "arachnid",
    bodyMaterial: "chitin",
    baseStats: {
      strength: { min: 15, max: 50 },
      agility: { min: 20, max: 60 },
      intelligence: { min: 5, max: 20 },
      vitality: { min: 20, max: 60 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: false,
      toolUse: false,
      learningRate: 0.5,
    },
    cultivation: {
      coreCapacityBase: { min: 150, max: 1500 },
      coreQualityRange: { min: 1, max: 50 },
      conductivityBase: 0.6,
      maxCultivationLevel: 5,
    },
    bodyTemplate: "beast_arthropod",
    sizeClass: "medium",
    innateTechniques: [
      { techniqueId: "bite", unlockLevel: 0, mastery: 80 },
      { techniqueId: "web_shot", unlockLevel: 0, mastery: 70 },
      { techniqueId: "web_cage", unlockLevel: 2, mastery: 40 },
    ],
    aging: {
      lifespan: 20,
      maturityAge: 3,
      declineAge: 15,
    },
    weaknesses: ["fire", "crushing"],
    resistances: ["poison", "mental"],
    icon: "🕷️",
  },
  {
    id: "centipede",
    name: "Многоножка",
    nameEn: "Centipede",
    description: "Сегментированное членистоногое с множеством ног и ядовитыми жвалами. Высокая живучесть.",
    category: "basic",
    rarity: "common",
    type: "beast",
    soulType: "creature",
    morphology: "arthropod",
    subtype: "myriapod",
    bodyMaterial: "chitin",
    baseStats: {
      strength: { min: 3, max: 15 },
      agility: { min: 6, max: 25 },
      intelligence: { min: 1, max: 4 },
      vitality: { min: 5, max: 25 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: false,
      toolUse: false,
      learningRate: 0.4,
    },
    cultivation: {
      coreCapacityBase: { min: 25, max: 250 },
      coreQualityRange: { min: 1, max: 35 },
      conductivityBase: 0.5,
      maxCultivationLevel: 4,
    },
    bodyTemplate: "beast_arthropod",
    sizeClass: "small",
    innateTechniques: [
      { techniqueId: "bite", unlockLevel: 0, mastery: 60 },
      { techniqueId: "coil", unlockLevel: 0, mastery: 40 },
    ],
    aging: {
      lifespan: 10,
      maturityAge: 2,
      declineAge: 7,
    },
    weaknesses: ["fire", "crushing"],
    resistances: ["poison", "slashing"],
    icon: "🐛",
  },
  {
    id: "scorpion",
    name: "Скорпион",
    nameEn: "Scorpion",
    description: "Паукообразное с мощными клешнями и ядовитым жалом. Самый твёрдый хитин.",
    category: "basic",
    rarity: "uncommon",
    type: "beast",
    soulType: "creature",
    morphology: "arthropod",
    subtype: "arachnid",
    bodyMaterial: "chitin",
    baseStats: {
      strength: { min: 5, max: 25 },
      agility: { min: 5, max: 20 },
      intelligence: { min: 1, max: 5 },
      vitality: { min: 8, max: 30 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: false,
      toolUse: false,
      learningRate: 0.5,
    },
    cultivation: {
      coreCapacityBase: { min: 40, max: 400 },
      coreQualityRange: { min: 1, max: 40 },
      conductivityBase: 0.6,
      maxCultivationLevel: 4,
    },
    bodyTemplate: "beast_arthropod",
    sizeClass: "small",
    innateTechniques: [
      { techniqueId: "sting", unlockLevel: 0, mastery: 75 },
      { techniqueId: "claw_crush", unlockLevel: 0, mastery: 50 },
    ],
    aging: {
      lifespan: 15,
      maturityAge: 2,
      declineAge: 10,
    },
    weaknesses: ["fire", "flipped"],
    resistances: ["physical", "poison"],
    icon: "🦂",
  },
];

// ============================================
// ДУХОВНЫЕ ВИДЫ
// ============================================

const SPIRIT_SPECIES: SpeciesPreset[] = [
  // Элементали
  {
    id: "fire_elemental",
    name: "Огненный Элементаль",
    nameEn: "Fire Elemental",
    description: "Дух огня с врождённой генерацией Ци. Состоит из живого пламени.",
    category: "advanced",
    rarity: "rare",
    type: "spirit",
    subtype: "elemental",
    baseStats: {
      strength: { min: 10, max: 80 },
      agility: { min: 20, max: 100 },
      intelligence: { min: 10, max: 50 },
      vitality: { min: 50, max: 300 },
    },
    capabilities: {
      canCultivate: false,
      innateQiGeneration: true,
      speechCapable: false,
      toolUse: false,
      learningRate: 0,
    },
    cultivation: {
      coreCapacityBase: { min: 500, max: 5000 },
      coreQualityRange: { min: 50, max: 100 },
      conductivityBase: 2.0,
      maxCultivationLevel: 0,
    },
    bodyTemplate: "spirit",
    sizeClass: "medium",
    innateTechniques: [
      { techniqueId: "fire_ball", unlockLevel: 0, mastery: 80 },
      { techniqueId: "fire_wall", unlockLevel: 2, mastery: 60 },
    ],
    weaknesses: ["water", "void"],
    resistances: ["fire", "heat"],
    icon: "🔥",
  },
  {
    id: "water_elemental",
    name: "Водный Элементаль",
    nameEn: "Water Elemental",
    description: "Дух воды. Может менять форму и лечить раны.",
    category: "advanced",
    rarity: "rare",
    type: "spirit",
    subtype: "elemental",
    baseStats: {
      strength: { min: 5, max: 50 },
      agility: { min: 15, max: 80 },
      intelligence: { min: 15, max: 60 },
      vitality: { min: 40, max: 250 },
    },
    capabilities: {
      canCultivate: false,
      innateQiGeneration: true,
      speechCapable: false,
      toolUse: false,
      learningRate: 0,
    },
    cultivation: {
      coreCapacityBase: { min: 400, max: 4000 },
      coreQualityRange: { min: 50, max: 100 },
      conductivityBase: 2.0,
      maxCultivationLevel: 0,
    },
    bodyTemplate: "spirit",
    sizeClass: "medium",
    innateTechniques: [
      { techniqueId: "water_blast", unlockLevel: 0, mastery: 70 },
      { techniqueId: "water_shield", unlockLevel: 0, mastery: 60 },
      { techniqueId: "healing_wave", unlockLevel: 2, mastery: 50 },
    ],
    weaknesses: ["lightning", "void"],
    resistances: ["water", "physical"],
    icon: "💧",
  },
  {
    id: "wind_elemental",
    name: "Воздушный Элементаль",
    nameEn: "Wind Elemental",
    description: "Дух воздуха. Невероятно быстрый и неуловимый.",
    category: "advanced",
    rarity: "rare",
    type: "spirit",
    subtype: "elemental",
    baseStats: {
      strength: { min: 3, max: 30 },
      agility: { min: 30, max: 150 },
      intelligence: { min: 12, max: 55 },
      vitality: { min: 30, max: 200 },
    },
    capabilities: {
      canCultivate: false,
      innateQiGeneration: true,
      speechCapable: false,
      toolUse: false,
      learningRate: 0,
    },
    cultivation: {
      coreCapacityBase: { min: 300, max: 3500 },
      coreQualityRange: { min: 50, max: 100 },
      conductivityBase: 2.5,
      maxCultivationLevel: 0,
    },
    bodyTemplate: "spirit",
    sizeClass: "medium",
    innateTechniques: [
      { techniqueId: "wind_blade", unlockLevel: 0, mastery: 70 },
      { techniqueId: "wind_speed", unlockLevel: 0, mastery: 80 },
    ],
    weaknesses: ["earth", "void"],
    resistances: ["air", "physical"],
    icon: "💨",
  },
  // Призраки
  {
    id: "ghost",
    name: "Призрак",
    nameEn: "Ghost",
    description: "Бесплотный дух умершего. Может проходить сквозь материю.",
    category: "basic",
    rarity: "uncommon",
    type: "spirit",
    subtype: "ghost",
    baseStats: {
      strength: { min: 1, max: 10 },
      agility: { min: 10, max: 50 },
      intelligence: { min: 10, max: 60 },
      vitality: { min: 20, max: 100 },
    },
    capabilities: {
      canCultivate: false,
      innateQiGeneration: false,
      speechCapable: true,
      toolUse: false,
      learningRate: 0,
    },
    cultivation: {
      coreCapacityBase: { min: 50, max: 500 },
      coreQualityRange: { min: 1, max: 50 },
      conductivityBase: 0.5,
      maxCultivationLevel: 0,
    },
    bodyTemplate: "spirit",
    sizeClass: "medium",
    innateTechniques: [
      { techniqueId: "phase_through", unlockLevel: 0, mastery: 100 },
      { techniqueId: "fear_aura", unlockLevel: 0, mastery: 40 },
    ],
    weaknesses: ["light", "holy"],
    resistances: ["physical", "mental"],
    icon: "👻",
  },
  // Божественные духи
  {
    id: "celestial_spirit",
    name: "Небесный Дух",
    nameEn: "Celestial Spirit",
    description: "Высший дух с большим интеллектом. Служит посланником небес.",
    category: "master",
    rarity: "legendary",
    type: "spirit",
    subtype: "divine",
    baseStats: {
      strength: { min: 20, max: 100 },
      agility: { min: 25, max: 120 },
      intelligence: { min: 50, max: 200 },
      vitality: { min: 60, max: 300 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: true,
      speechCapable: true,
      toolUse: true,
      learningRate: 1.5,
    },
    cultivation: {
      coreCapacityBase: { min: 2000, max: 20000 },
      coreQualityRange: { min: 20, max: 100 },
      conductivityBase: 3.0,
      maxCultivationLevel: 9,
    },
    bodyTemplate: "spirit",
    sizeClass: "medium",
    innateTechniques: [
      { techniqueId: "light_beam", unlockLevel: 0, mastery: 70 },
      { techniqueId: "blessing", unlockLevel: 2, mastery: 60 },
      { techniqueId: "divine_shield", unlockLevel: 4, mastery: 50 },
    ],
    weaknesses: ["dark", "void"],
    resistances: ["mental", "holy", "physical"],
    icon: "✨",
  },
];

// ============================================
// ГИБРИДНЫЕ ВИДЫ
// ============================================

const HYBRID_SPECIES: SpeciesPreset[] = [
  {
    id: "centaur",
    name: "Кентавр",
    nameEn: "Centaur",
    description: "Гибрид человека и лошади. Быстрый и сильный воин.",
    category: "advanced",
    rarity: "uncommon",
    type: "hybrid",
    subtype: "centaur",
    baseStats: {
      strength: { min: 12, max: 40 },
      agility: { min: 10, max: 35 },
      intelligence: { min: 6, max: 20 },
      vitality: { min: 10, max: 30 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: true,
      toolUse: true,
      learningRate: 0.8,
    },
    cultivation: {
      coreCapacityBase: { min: 150, max: 2500 },
      coreQualityRange: { min: 1, max: 80 },
      conductivityBase: 1.0,
      maxCultivationLevel: 7,
    },
    bodyTemplate: "humanoid",
    sizeClass: "large",
    innateTechniques: [
      { techniqueId: "charge", unlockLevel: 0, mastery: 50 },
      { techniqueId: "reinforced_strike", unlockLevel: 0, mastery: 40 },
    ],
    aging: {
      lifespan: 150,
      maturityAge: 20,
      declineAge: 110,
    },
    weaknesses: ["enclosed_spaces"],
    resistances: ["stamina"],
    icon: "🏹",
  },
  {
    id: "mermaid",
    name: "Русалка",
    nameEn: "Mermaid",
    description: "Гибрид человека и рыбы. Повелительница вод.",
    category: "advanced",
    rarity: "uncommon",
    type: "hybrid",
    subtype: "mermaid",
    baseStats: {
      strength: { min: 6, max: 25 },
      agility: { min: 10, max: 35 },
      intelligence: { min: 8, max: 28 },
      vitality: { min: 7, max: 22 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: true,
      toolUse: true,
      learningRate: 0.9,
    },
    cultivation: {
      coreCapacityBase: { min: 120, max: 2200 },
      coreQualityRange: { min: 1, max: 85 },
      conductivityBase: 1.2,
      maxCultivationLevel: 7,
    },
    bodyTemplate: "humanoid",
    sizeClass: "medium",
    innateTechniques: [
      { techniqueId: "water_blast", unlockLevel: 0, mastery: 50 },
      { techniqueId: "water_shield", unlockLevel: 1, mastery: 40 },
    ],
    aging: {
      lifespan: 200,
      maturityAge: 25,
      declineAge: 160,
    },
    weaknesses: ["drought", "lightning"],
    resistances: ["water", "cold"],
    icon: "🧜",
  },
  {
    id: "werewolf",
    name: "Оборотень",
    nameEn: "Werewolf",
    description: "Человек, превращающийся в волка. Сочетает разум с звериной силой.",
    category: "advanced",
    rarity: "rare",
    type: "hybrid",
    subtype: "werewolf",
    baseStats: {
      strength: { min: 10, max: 35 },
      agility: { min: 8, max: 30 },
      intelligence: { min: 5, max: 20 },
      vitality: { min: 10, max: 28 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: true,
      toolUse: true,
      learningRate: 0.85,
    },
    cultivation: {
      coreCapacityBase: { min: 130, max: 2300 },
      coreQualityRange: { min: 1, max: 75 },
      conductivityBase: 1.0,
      maxCultivationLevel: 7,
    },
    bodyTemplate: "humanoid",
    sizeClass: "medium",
    innateTechniques: [
      { techniqueId: "bite", unlockLevel: 0, mastery: 50 },
      { techniqueId: "claw_swipe", unlockLevel: 0, mastery: 45 },
      { techniqueId: "wolf_form", unlockLevel: 2, mastery: 30 },
    ],
    aging: {
      lifespan: 120,
      maturityAge: 18,
      declineAge: 90,
    },
    weaknesses: ["silver", "moon_deprivation"],
    resistances: ["disease", "poison"],
    icon: "🐺",
  },
  {
    id: "harpy",
    name: "Гарпия",
    nameEn: "Harpy",
    description: "Гибрид человека и птицы. Летающий воин с острыми когтями.",
    category: "advanced",
    rarity: "uncommon",
    type: "hybrid",
    subtype: "harpy",
    baseStats: {
      strength: { min: 6, max: 22 },
      agility: { min: 12, max: 40 },
      intelligence: { min: 5, max: 18 },
      vitality: { min: 5, max: 18 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: true,
      toolUse: true,
      learningRate: 0.85,
    },
    cultivation: {
      coreCapacityBase: { min: 100, max: 1800 },
      coreQualityRange: { min: 1, max: 70 },
      conductivityBase: 1.1,
      maxCultivationLevel: 6,
    },
    bodyTemplate: "humanoid",
    sizeClass: "medium",
    innateTechniques: [
      { techniqueId: "dive_attack", unlockLevel: 0, mastery: 55 },
      { techniqueId: "claw_swipe", unlockLevel: 0, mastery: 50 },
      { techniqueId: "wind_speed", unlockLevel: 1, mastery: 35 },
    ],
    aging: {
      lifespan: 100,
      maturityAge: 15,
      declineAge: 75,
    },
    weaknesses: ["physical", "grounded"],
    resistances: ["air", "falling"],
    icon: "🦅",
  },
  {
    id: "lamia",
    name: "Ламия",
    nameEn: "Lamia",
    description: "Гибрид человека и змеи. Опасный хищник с ядом.",
    category: "advanced",
    rarity: "rare",
    type: "hybrid",
    subtype: "lamia",
    baseStats: {
      strength: { min: 8, max: 28 },
      agility: { min: 10, max: 35 },
      intelligence: { min: 7, max: 22 },
      vitality: { min: 8, max: 25 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: true,
      toolUse: true,
      learningRate: 0.9,
    },
    cultivation: {
      coreCapacityBase: { min: 110, max: 2000 },
      coreQualityRange: { min: 1, max: 75 },
      conductivityBase: 1.0,
      maxCultivationLevel: 7,
    },
    bodyTemplate: "beast_serpentine",
    sizeClass: "medium",
    innateTechniques: [
      { techniqueId: "bite", unlockLevel: 0, mastery: 55 },
      { techniqueId: "poison_spit", unlockLevel: 0, mastery: 45 },
      { techniqueId: "constrict", unlockLevel: 1, mastery: 40 },
    ],
    aging: {
      lifespan: 150,
      maturityAge: 20,
      declineAge: 110,
    },
    weaknesses: ["cold", "fire"],
    resistances: ["poison", "mental"],
    icon: "🐍",
  },
];

// ============================================
// АБЕРРАЦИИ
// ============================================

const ABERRATION_SPECIES: SpeciesPreset[] = [
  {
    id: "chaos_spawn",
    name: "Порождение Хаоса",
    nameEn: "Chaos Spawn",
    description: "Существо, рождённое из хаоса. Непредсказуемые характеристики.",
    category: "master",
    rarity: "rare",
    type: "aberration",
    subtype: "chaos",
    baseStats: {
      strength: { min: 1, max: 100 },
      agility: { min: 1, max: 100 },
      intelligence: { min: 1, max: 100 },
      vitality: { min: 1, max: 100 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: true,
      speechCapable: false,
      toolUse: false,
      learningRate: 0.3,
    },
    cultivation: {
      coreCapacityBase: { min: 100, max: 10000 },
      coreQualityRange: { min: 1, max: 100 },
      conductivityBase: 0.3,
      maxCultivationLevel: 8,
    },
    bodyTemplate: "spirit",
    sizeClass: "medium",
    innateTechniques: [],
    weaknesses: ["order", "holy"],
    resistances: ["chaos"],
    icon: "🌀",
  },
  {
    id: "cthonian",
    name: "Хтонь",
    nameEn: "Cthonian",
    description: "Порождение высокого фона Ци. Искажённая форма жизни.",
    category: "master",
    rarity: "rare",
    type: "aberration",
    subtype: "cthonian",
    baseStats: {
      strength: { min: 15, max: 60 },
      agility: { min: 5, max: 30 },
      intelligence: { min: 3, max: 25 },
      vitality: { min: 20, max: 80 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: true,
      speechCapable: false,
      toolUse: false,
      learningRate: 0.2,
    },
    cultivation: {
      coreCapacityBase: { min: 500, max: 8000 },
      coreQualityRange: { min: 5, max: 90 },
      conductivityBase: 0.5,
      maxCultivationLevel: 7,
    },
    bodyTemplate: "spirit",
    sizeClass: "large",
    innateTechniques: [
      { techniqueId: "qi_drain", unlockLevel: 0, mastery: 50 },
    ],
    weaknesses: ["pure_qi", "holy"],
    resistances: ["corruption", "mental"],
    icon: "👾",
  },
  {
    id: "mutant",
    name: "Мутант",
    nameEn: "Mutant",
    description: "Исказённый организм с вариативными мутациями.",
    category: "basic",
    rarity: "uncommon",
    type: "aberration",
    subtype: "mutant",
    baseStats: {
      strength: { min: 5, max: 30 },
      agility: { min: 5, max: 30 },
      intelligence: { min: 3, max: 20 },
      vitality: { min: 5, max: 30 },
    },
    capabilities: {
      canCultivate: true,
      innateQiGeneration: false,
      speechCapable: true,
      toolUse: true,
      learningRate: 0.6,
    },
    cultivation: {
      coreCapacityBase: { min: 80, max: 1500 },
      coreQualityRange: { min: 1, max: 70 },
      conductivityBase: 0.8,
      maxCultivationLevel: 6,
    },
    bodyTemplate: "humanoid",
    sizeClass: "medium",
    innateTechniques: [],
    weaknesses: ["stability"],
    resistances: ["radiation", "disease"],
    icon: "🧟",
  },
  {
    id: "golem",
    name: "Голем",
    nameEn: "Golem",
    description: "Конструкт из камня или металла. Не имеет Ци, но очень прочен.",
    category: "advanced",
    rarity: "uncommon",
    type: "aberration",
    subtype: "construct",
    baseStats: {
      strength: { min: 20, max: 60 },
      agility: { min: 2, max: 15 },
      intelligence: { min: 1, max: 10 },
      vitality: { min: 30, max: 100 },
    },
    capabilities: {
      canCultivate: false,
      innateQiGeneration: false,
      speechCapable: false,
      toolUse: false,
      learningRate: 0,
    },
    cultivation: {
      coreCapacityBase: { min: 0, max: 0 },
      coreQualityRange: { min: 0, max: 0 },
      conductivityBase: 0,
      maxCultivationLevel: 0,
    },
    bodyTemplate: "humanoid",
    sizeClass: "large",
    innateTechniques: [],
    weaknesses: ["magic", "disassembly"],
    resistances: ["physical", "poison", "mental"],
    icon: "🗿",
  },
];

// ============================================
// ЭКСПОРТ ВСЕХ ВИДОВ
// ============================================

export const SPECIES_PRESETS: SpeciesPreset[] = [
  ...HUMANOID_SPECIES,
  ...BEAST_SPECIES,
  ...SPIRIT_SPECIES,
  ...HYBRID_SPECIES,
  ...ABERRATION_SPECIES,
];

// ============================================
// ФУНКЦИИ ПОИСКА
// ============================================

/**
 * Получить вид по ID
 */
export function getSpeciesById(id: string): SpeciesPreset | undefined {
  return SPECIES_PRESETS.find(s => s.id === id);
}

/**
 * Получить виды по типу
 */
export function getSpeciesByType(type: SpeciesType): SpeciesPreset[] {
  return SPECIES_PRESETS.filter(s => s.type === type);
}

/**
 * Получить все виды
 */
export function getAllSpecies(): SpeciesPreset[] {
  return SPECIES_PRESETS;
}

/**
 * Получить виды по подтипу
 */
export function getSpeciesBySubtype(subtype: string): SpeciesPreset[] {
  return SPECIES_PRESETS.filter(s => s.subtype === subtype);
}

/**
 * Получить виды по размеру
 */
export function getSpeciesBySize(sizeClass: SizeClass): SpeciesPreset[] {
  return SPECIES_PRESETS.filter(s => s.sizeClass === sizeClass);
}

/**
 * Получить виды, способные к культивации
 */
export function getCultivableSpecies(): SpeciesPreset[] {
  return SPECIES_PRESETS.filter(s => s.capabilities.canCultivate);
}

/**
 * Получить виды с врождённой генерацией Ци
 */
export function getInnateQiSpecies(): SpeciesPreset[] {
  return SPECIES_PRESETS.filter(s => s.capabilities.innateQiGeneration);
}

/**
 * Получить виды по шаблону тела
 */
export function getSpeciesByBodyTemplate(template: BodyTemplate): SpeciesPreset[] {
  return SPECIES_PRESETS.filter(s => s.bodyTemplate === template);
}

/**
 * Получить гуманоидные виды
 */
export function getHumanoidSpecies(): SpeciesPreset[] {
  return HUMANOID_SPECIES;
}

/**
 * Получить звериные виды
 */
export function getBeastSpecies(): SpeciesPreset[] {
  return BEAST_SPECIES;
}

/**
 * Получить духовные виды
 */
export function getSpiritSpecies(): SpeciesPreset[] {
  return SPIRIT_SPECIES;
}

/**
 * Получить гибридные виды
 */
export function getHybridSpecies(): SpeciesPreset[] {
  return HYBRID_SPECIES;
}

/**
 * Получить аберрации
 */
export function getAberrationSpecies(): SpeciesPreset[] {
  return ABERRATION_SPECIES;
}

/**
 * Получить виды для определённого уровня культивации
 */
export function getSpeciesForCultivationLevel(level: number): SpeciesPreset[] {
  return SPECIES_PRESETS.filter(s => {
    if (!s.capabilities.canCultivate) return false;
    return s.cultivation.maxCultivationLevel >= level;
  });
}

/**
 * Получить случайный вид
 */
export function getRandomSpecies(): SpeciesPreset {
  return SPECIES_PRESETS[Math.floor(Math.random() * SPECIES_PRESETS.length)];
}

/**
 * Получить случайный вид по типу
 */
export function getRandomSpeciesByType(type: SpeciesType): SpeciesPreset {
  const species = getSpeciesByType(type);
  return species[Math.floor(Math.random() * species.length)];
}

/**
 * Статистика по видам
 */
export function getSpeciesStats(): {
  total: number;
  byType: Record<SpeciesType, number>;
  cultivable: number;
  innateQi: number;
} {
  const byType = {} as Record<SpeciesType, number>;
  const types: SpeciesType[] = ["humanoid", "beast", "spirit", "hybrid", "aberration"];
  
  for (const type of types) {
    byType[type] = getSpeciesByType(type).length;
  }
  
  return {
    total: SPECIES_PRESETS.length,
    byType,
    cultivable: getCultivableSpecies().length,
    innateQi: getInnateQiSpecies().length,
  };
}
