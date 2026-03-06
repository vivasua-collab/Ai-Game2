/**
 * ============================================================================
 * ПРЕСЕТЫ РОЛЕЙ (Role Presets)
 * ============================================================================
 * 
 * Роли определяют социальную функцию NPC:
 * - sect: Роли в секте (ученик, старейшина, мастер)
 * - profession: Профессии (торговец, кузнец, целитель)
 * - social: Социальный статус (дворянин, нищий, путник)
 * - combat: Боевые роли (страж, наёмник, бандит)
 * 
 * Каждая роль влияет на:
 * - Требования к уровню культивации
 * - Модификаторы характеристик
 * - Доступные техники
 * - Начальное снаряжение
 * - Инвентарь и ресурсы
 * 
 * ============================================================================
 */

import type { BasePreset } from "./base-preset";
import type { SpeciesType } from "./species-presets";

// ============================================
// ТИПЫ
// ============================================

/**
 * Тип роли
 */
export type RoleType = 
  | "sect"       // Роль в секте
  | "profession" // Профессия
  | "social"     // Социальный статус
  | "combat";    // Боевая роль

/**
 * Диапазон значений
 */
export interface Range {
  min: number;
  max: number;
}

/**
 * Требования к роли
 */
export interface RoleRequirements {
  minCultivationLevel?: number;
  maxCultivationLevel?: number;
  speciesType?: SpeciesType[];
  minAge?: number;
  maxAge?: number;
}

/**
 * Модификаторы характеристик
 */
export interface StatModifiers {
  strength?: number;
  agility?: number;
  intelligence?: number;
  vitality?: number;
}

/**
 * Техники роли
 */
export interface RoleTechniques {
  guaranteed?: string[];
  possible?: string[];
  count?: number;
}

/**
 * Снаряжение роли
 */
export interface RoleEquipment {
  weapon?: string | string[];
  armor?: string | string[];
  accessories?: string[];
}

/**
 * Расходники в инвентаре
 */
export interface InventoryConsumable {
  type: string;
  count: Range;
}

/**
 * Камни Ци в инвентаре
 */
export interface InventoryQiStone {
  quality: string;
  count: Range;
}

/**
 * Инвентарь роли
 */
export interface RoleInventory {
  consumables: InventoryConsumable[];
  qiStones?: InventoryQiStone[];
}

/**
 * Ресурсы роли
 */
export interface RoleResources {
  spiritStones?: Range;
  contributionPoints?: Range;
}

/**
 * Интерфейс пресета роли
 */
export interface RolePreset extends BasePreset {
  // === ТИП РОЛИ ===
  type: RoleType;
  
  // === ТРЕБОВАНИЯ ===
  requirements?: RoleRequirements;
  
  // === МОДИФИКАТОРЫ ХАРАКТЕРИСТИК ===
  statModifiers?: StatModifiers;
  
  // === ТЕХНИКИ ===
  techniques?: RoleTechniques;
  
  // === СНАРЯЖЕНИЕ ===
  equipment?: RoleEquipment;
  
  // === ИНВЕНТАРЬ ===
  inventory?: RoleInventory;
  
  // === РЕСУРСЫ ===
  resources?: RoleResources;
  
  // === ВЕСА ЛИЧНОСТЕЙ ===
  personalityWeights?: Record<string, number>;
  
  // === ОСОБЕННОСТИ ===
  specialAbilities?: string[];
}

// ============================================
// РОЛИ СЕКТЫ
// ============================================

const SECT_ROLES: RolePreset[] = [
  {
    id: "candidate",
    name: "Кандидат",
    nameEn: "Candidate",
    description: "Недавно принятый в секту. Проходит испытательный срок.",
    category: "basic",
    rarity: "common",
    type: "sect",
    requirements: {
      minCultivationLevel: 0,
      maxCultivationLevel: 1,
      speciesType: ["humanoid"],
    },
    statModifiers: {
      strength: 0,
      agility: 0,
      intelligence: 1,
      vitality: 0,
    },
    techniques: {
      guaranteed: ["breath_of_qi"],
      possible: ["reinforced_strike"],
      count: 1,
    },
    equipment: {
      weapon: "category_practice_weapon",
      armor: "category_clothes",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 0, max: 2 } },
      ],
    },
    resources: {
      spiritStones: { min: 0, max: 5 },
      contributionPoints: { min: 0, max: 5 },
    },
    personalityWeights: {
      ambitious_disciple: 3,
      friendly_traveler: 2,
    },
    icon: "🎓",
  },
  {
    id: "outer_disciple",
    name: "Внешний ученик",
    nameEn: "Outer Disciple",
    description: "Полноценный ученик секты. Выполняет поручения и тренируется.",
    category: "basic",
    rarity: "common",
    type: "sect",
    requirements: {
      minCultivationLevel: 1,
      maxCultivationLevel: 3,
      speciesType: ["humanoid"],
    },
    statModifiers: {
      strength: 1,
      agility: 1,
      intelligence: 2,
      vitality: 1,
    },
    techniques: {
      guaranteed: ["breath_of_qi", "reinforced_strike"],
      possible: ["qi_bullet", "turtle_stance"],
      count: 2,
    },
    equipment: {
      weapon: "category_sword",
      armor: "category_light",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 1, max: 3 } },
        { type: "pill_qi", count: { min: 0, max: 2 } },
      ],
      qiStones: [{ quality: "stone", count: { min: 1, max: 5 } }],
    },
    resources: {
      spiritStones: { min: 5, max: 30 },
      contributionPoints: { min: 10, max: 50 },
    },
    personalityWeights: {
      ambitious_disciple: 4,
      friendly_traveler: 2,
      cynical_elder: 1,
    },
    icon: "🥋",
  },
  {
    id: "inner_disciple",
    name: "Внутренний ученик",
    nameEn: "Inner Disciple",
    description: "Продвинутый ученик. Имеет доступ к секретным техникам.",
    category: "advanced",
    rarity: "uncommon",
    type: "sect",
    requirements: {
      minCultivationLevel: 3,
      maxCultivationLevel: 5,
      speciesType: ["humanoid"],
    },
    statModifiers: {
      strength: 2,
      agility: 2,
      intelligence: 3,
      vitality: 2,
    },
    techniques: {
      guaranteed: ["breath_of_qi", "reinforced_strike"],
      possible: ["fire_strike", "water_shield", "wind_speed", "qi_healing"],
      count: 3,
    },
    equipment: {
      weapon: "category_sword",
      armor: "category_medium",
      accessories: ["category_ring"],
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 2, max: 5 } },
        { type: "pill_qi", count: { min: 1, max: 4 } },
      ],
      qiStones: [{ quality: "stone", count: { min: 3, max: 10 } }],
    },
    resources: {
      spiritStones: { min: 30, max: 150 },
      contributionPoints: { min: 50, max: 200 },
    },
    personalityWeights: {
      ambitious_disciple: 3,
      wise_mentor: 2,
      ruthless_warrior: 2,
    },
    icon: "⚔️",
  },
  {
    id: "core_member",
    name: "Член ядра",
    nameEn: "Core Member",
    description: "Элита секты. Личные ученики старейшин.",
    category: "advanced",
    rarity: "rare",
    type: "sect",
    requirements: {
      minCultivationLevel: 5,
      maxCultivationLevel: 6,
      speciesType: ["humanoid"],
    },
    statModifiers: {
      strength: 4,
      agility: 3,
      intelligence: 4,
      vitality: 3,
    },
    techniques: {
      guaranteed: ["breath_of_qi", "fire_ball"],
      possible: ["lightning_flash", "earth_armor", "mental_shield"],
      count: 4,
    },
    equipment: {
      weapon: "category_sword",
      armor: "category_heavy",
      accessories: ["category_ring", "category_amulet"],
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 3, max: 8 } },
        { type: "pill_qi", count: { min: 2, max: 6 } },
      ],
      qiStones: [
        { quality: "stone", count: { min: 5, max: 15 } },
        { quality: "crystal", count: { min: 0, max: 3 } },
      ],
    },
    resources: {
      spiritStones: { min: 100, max: 500 },
      contributionPoints: { min: 200, max: 1000 },
    },
    personalityWeights: {
      ambitious_disciple: 2,
      wise_mentor: 3,
      ruthless_warrior: 3,
    },
    icon: "💎",
  },
  {
    id: "elder",
    name: "Старейшина",
    nameEn: "Elder",
    description: "Наставник и управитель секты. Мастер своего дела.",
    category: "master",
    rarity: "rare",
    type: "sect",
    requirements: {
      minCultivationLevel: 5,
      maxCultivationLevel: 8,
      speciesType: ["humanoid"],
      minAge: 100,
    },
    statModifiers: {
      strength: 3,
      agility: 2,
      intelligence: 8,
      vitality: 5,
    },
    techniques: {
      guaranteed: ["breath_of_qi", "mental_shield"],
      possible: ["lightning_flash", "earth_armor", "qi_healing", "void_step"],
      count: 5,
    },
    equipment: {
      weapon: "category_staff",
      armor: "category_robe",
      accessories: ["category_ring", "category_amulet"],
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 5, max: 10 } },
        { type: "pill_qi", count: { min: 5, max: 10 } },
        { type: "elixir_cultivation", count: { min: 0, max: 2 } },
      ],
      qiStones: [
        { quality: "stone", count: { min: 10, max: 30 } },
        { quality: "crystal", count: { min: 3, max: 10 } },
      ],
    },
    resources: {
      spiritStones: { min: 500, max: 2000 },
      contributionPoints: { min: 2000, max: 10000 },
    },
    personalityWeights: {
      wise_mentor: 4,
      cynical_elder: 3,
      mysterious_hermit: 2,
    },
    icon: "🧙",
  },
  {
    id: "sect_master",
    name: "Мастер секты",
    nameEn: "Sect Master",
    description: "Глава секты. Легендарный культиватор.",
    category: "legendary",
    rarity: "legendary",
    type: "sect",
    requirements: {
      minCultivationLevel: 7,
      maxCultivationLevel: 9,
      speciesType: ["humanoid"],
      minAge: 200,
    },
    statModifiers: {
      strength: 5,
      agility: 5,
      intelligence: 12,
      vitality: 8,
    },
    techniques: {
      guaranteed: ["breath_of_qi", "void_step", "mental_shield"],
      possible: ["spatial_shift", "heavenly_transmission", "void_march"],
      count: 7,
    },
    equipment: {
      weapon: "category_legendary",
      armor: "category_legendary",
      accessories: ["category_legendary", "category_legendary"],
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 10, max: 20 } },
        { type: "pill_qi", count: { min: 10, max: 20 } },
        { type: "elixir_cultivation", count: { min: 2, max: 5 } },
      ],
      qiStones: [
        { quality: "stone", count: { min: 50, max: 100 } },
        { quality: "crystal", count: { min: 10, max: 30 } },
        { quality: "core", count: { min: 1, max: 5 } },
      ],
    },
    resources: {
      spiritStones: { min: 5000, max: 50000 },
      contributionPoints: { min: 50000, max: 500000 },
    },
    personalityWeights: {
      wise_mentor: 5,
      mysterious_hermit: 3,
    },
    icon: "👑",
  },
  {
    id: "instructor",
    name: "Инструктор",
    nameEn: "Instructor",
    description: "Учитель боевых искусств. Обучает учеников.",
    category: "advanced",
    rarity: "uncommon",
    type: "sect",
    requirements: {
      minCultivationLevel: 4,
      maxCultivationLevel: 6,
      speciesType: ["humanoid"],
    },
    statModifiers: {
      strength: 5,
      agility: 4,
      intelligence: 3,
      vitality: 4,
    },
    techniques: {
      guaranteed: ["breath_of_qi", "reinforced_strike", "turtle_stance"],
      possible: ["fire_strike", "ghost_shadow"],
      count: 4,
    },
    equipment: {
      weapon: "category_staff",
      armor: "category_medium",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 2, max: 5 } },
      ],
      qiStones: [{ quality: "stone", count: { min: 5, max: 15 } }],
    },
    resources: {
      spiritStones: { min: 50, max: 200 },
      contributionPoints: { min: 100, max: 500 },
    },
    personalityWeights: {
      wise_mentor: 4,
      cynical_elder: 2,
      ruthless_warrior: 2,
    },
    icon: "🥋",
  },
  {
    id: "sect_alchemist",
    name: "Алхимик секты",
    nameEn: "Sect Alchemist",
    description: "Мастер зелий и эликсиров. Создаёт таблетки.",
    category: "advanced",
    rarity: "uncommon",
    type: "sect",
    requirements: {
      minCultivationLevel: 3,
      maxCultivationLevel: 6,
      speciesType: ["humanoid"],
    },
    statModifiers: {
      strength: 0,
      agility: 1,
      intelligence: 6,
      vitality: 2,
    },
    techniques: {
      guaranteed: ["breath_of_qi", "qi_healing"],
      possible: ["water_shield", "mental_shield"],
      count: 2,
    },
    equipment: {
      weapon: "category_staff",
      armor: "category_robe",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 10, max: 30 } },
        { type: "pill_qi", count: { min: 5, max: 15 } },
        { type: "elixir_cultivation", count: { min: 1, max: 5 } },
      ],
      qiStones: [{ quality: "stone", count: { min: 10, max: 30 } }],
    },
    resources: {
      spiritStones: { min: 100, max: 500 },
      contributionPoints: { min: 150, max: 600 },
    },
    personalityWeights: {
      eccentric_scholar: 4,
      kind_healer: 3,
      wise_mentor: 2,
    },
    icon: "⚗️",
  },
  {
    id: "sect_guard",
    name: "Страж секты",
    nameEn: "Sect Guard",
    description: "Защитник секты. Патрулирует территорию.",
    category: "basic",
    rarity: "common",
    type: "sect",
    requirements: {
      minCultivationLevel: 2,
      maxCultivationLevel: 5,
      speciesType: ["humanoid"],
    },
    statModifiers: {
      strength: 4,
      agility: 2,
      intelligence: 1,
      vitality: 4,
    },
    techniques: {
      guaranteed: ["breath_of_qi", "reinforced_strike", "turtle_stance"],
      possible: ["iron_wall"],
      count: 2,
    },
    equipment: {
      weapon: "category_spear",
      armor: "category_heavy",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 2, max: 5 } },
      ],
      qiStones: [{ quality: "stone", count: { min: 2, max: 8 } }],
    },
    resources: {
      spiritStones: { min: 20, max: 80 },
      contributionPoints: { min: 30, max: 100 },
    },
    personalityWeights: {
      loyal_guard: 5,
      friendly_traveler: 1,
    },
    icon: "🛡️",
  },
  {
    id: "servant",
    name: "Слуга",
    nameEn: "Servant",
    description: "Обслуживающий персонал секты. Готовит, убирает.",
    category: "basic",
    rarity: "common",
    type: "sect",
    requirements: {
      minCultivationLevel: 0,
      maxCultivationLevel: 2,
    },
    statModifiers: {
      strength: 1,
      agility: 1,
      intelligence: 0,
      vitality: 1,
    },
    techniques: {
      guaranteed: ["breath_of_qi"],
      count: 1,
    },
    equipment: {
      armor: "category_clothes",
    },
    inventory: {
      consumables: [
        { type: "food", count: { min: 1, max: 3 } },
      ],
    },
    resources: {
      spiritStones: { min: 0, max: 10 },
      contributionPoints: { min: 0, max: 5 },
    },
    personalityWeights: {
      lazy_servant: 4,
      friendly_traveler: 2,
    },
    icon: "🧹",
  },
];

// ============================================
// ПРОФЕССИИ
// ============================================

const PROFESSION_ROLES: RolePreset[] = [
  {
    id: "merchant",
    name: "Торговец",
    nameEn: "Merchant",
    description: "Купец, торгующий товарами. Много ресурсов.",
    category: "basic",
    rarity: "common",
    type: "profession",
    statModifiers: {
      strength: 0,
      agility: 2,
      intelligence: 4,
      vitality: 1,
    },
    techniques: {
      guaranteed: ["breath_of_qi"],
      possible: ["wind_speed", "mental_shield"],
      count: 1,
    },
    equipment: {
      weapon: "category_dagger",
      armor: "category_clothes",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 3, max: 10 } },
        { type: "food", count: { min: 5, max: 20 } },
      ],
      qiStones: [{ quality: "stone", count: { min: 10, max: 50 } }],
    },
    resources: {
      spiritStones: { min: 100, max: 1000 },
    },
    personalityWeights: {
      greedy_merchant: 5,
      friendly_traveler: 2,
    },
    icon: "💰",
  },
  {
    id: "alchemist",
    name: "Алхимик",
    nameEn: "Alchemist",
    description: "Создатель зелий и эликсиров.",
    category: "advanced",
    rarity: "uncommon",
    type: "profession",
    requirements: {
      minCultivationLevel: 2,
    },
    statModifiers: {
      strength: 0,
      agility: 1,
      intelligence: 5,
      vitality: 2,
    },
    techniques: {
      guaranteed: ["breath_of_qi", "qi_healing"],
      possible: ["water_shield"],
      count: 2,
    },
    equipment: {
      weapon: "category_staff",
      armor: "category_robe",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 5, max: 20 } },
        { type: "pill_qi", count: { min: 3, max: 10 } },
        { type: "elixir_cultivation", count: { min: 0, max: 3 } },
      ],
    },
    resources: {
      spiritStones: { min: 50, max: 300 },
    },
    personalityWeights: {
      eccentric_scholar: 4,
      kind_healer: 3,
    },
    icon: "⚗️",
  },
  {
    id: "blacksmith",
    name: "Кузнец",
    nameEn: "Blacksmith",
    description: "Мастер оружия и доспехов.",
    category: "basic",
    rarity: "common",
    type: "profession",
    statModifiers: {
      strength: 5,
      agility: 1,
      intelligence: 2,
      vitality: 4,
    },
    techniques: {
      guaranteed: ["breath_of_qi", "reinforced_strike"],
      count: 1,
    },
    equipment: {
      weapon: "category_hammer",
      armor: "category_medium",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 1, max: 5 } },
      ],
    },
    resources: {
      spiritStones: { min: 30, max: 150 },
    },
    personalityWeights: {
      cynical_elder: 3,
      ruthless_warrior: 2,
    },
    icon: "🔨",
  },
  {
    id: "healer",
    name: "Целитель",
    nameEn: "Healer",
    description: "Лекарь, исцеляющий раны и болезни.",
    category: "advanced",
    rarity: "uncommon",
    type: "profession",
    requirements: {
      minCultivationLevel: 2,
    },
    statModifiers: {
      strength: 0,
      agility: 2,
      intelligence: 5,
      vitality: 2,
    },
    techniques: {
      guaranteed: ["breath_of_qi", "qi_healing"],
      possible: ["water_shield", "mental_shield"],
      count: 2,
    },
    equipment: {
      weapon: "category_staff",
      armor: "category_robe",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 10, max: 30 } },
        { type: "bandage", count: { min: 5, max: 15 } },
      ],
    },
    resources: {
      spiritStones: { min: 20, max: 100 },
    },
    personalityWeights: {
      kind_healer: 5,
      wise_mentor: 2,
    },
    icon: "💊",
  },
  {
    id: "scholar",
    name: "Учёный",
    nameEn: "Scholar",
    description: "Исследователь древних текстов и техник.",
    category: "advanced",
    rarity: "uncommon",
    type: "profession",
    requirements: {
      minCultivationLevel: 1,
    },
    statModifiers: {
      strength: 0,
      agility: 1,
      intelligence: 6,
      vitality: 1,
    },
    techniques: {
      guaranteed: ["breath_of_qi", "mental_shield"],
      possible: ["qi_healing"],
      count: 2,
    },
    equipment: {
      armor: "category_robe",
    },
    inventory: {
      consumables: [
        { type: "scroll", count: { min: 2, max: 10 } },
      ],
    },
    resources: {
      spiritStones: { min: 10, max: 50 },
    },
    personalityWeights: {
      eccentric_scholar: 5,
      wise_mentor: 3,
    },
    icon: "📚",
  },
  {
    id: "hunter",
    name: "Охотник",
    nameEn: "Hunter",
    description: "Охотник на зверей и монстров.",
    category: "basic",
    rarity: "common",
    type: "profession",
    statModifiers: {
      strength: 3,
      agility: 4,
      intelligence: 2,
      vitality: 3,
    },
    techniques: {
      guaranteed: ["breath_of_qi", "reinforced_strike"],
      possible: ["qi_bullet", "wind_speed"],
      count: 2,
    },
    equipment: {
      weapon: "category_bow",
      armor: "category_light",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 2, max: 6 } },
        { type: "trap", count: { min: 1, max: 5 } },
      ],
    },
    resources: {
      spiritStones: { min: 10, max: 60 },
    },
    personalityWeights: {
      mysterious_hermit: 3,
      ruthless_warrior: 2,
    },
    icon: "🏹",
  },
  {
    id: "farmer",
    name: "Фермер",
    nameEn: "Farmer",
    description: "Выращивает ресурсы и ингредиенты.",
    category: "basic",
    rarity: "common",
    type: "profession",
    statModifiers: {
      strength: 3,
      agility: 1,
      intelligence: 1,
      vitality: 3,
    },
    techniques: {
      guaranteed: ["breath_of_qi"],
      count: 1,
    },
    equipment: {
      weapon: "category_tool",
      armor: "category_clothes",
    },
    inventory: {
      consumables: [
        { type: "food", count: { min: 10, max: 30 } },
        { type: "seed", count: { min: 5, max: 20 } },
      ],
    },
    resources: {
      spiritStones: { min: 5, max: 30 },
    },
    personalityWeights: {
      friendly_traveler: 4,
      lazy_servant: 2,
    },
    icon: "🌾",
  },
  {
    id: "innkeeper",
    name: "Трактирщик",
    nameEn: "Innkeeper",
    description: "Владелец таверны или гостиницы.",
    category: "basic",
    rarity: "common",
    type: "profession",
    statModifiers: {
      strength: 2,
      agility: 2,
      intelligence: 3,
      vitality: 2,
    },
    techniques: {
      guaranteed: ["breath_of_qi"],
      count: 1,
    },
    equipment: {
      armor: "category_clothes",
    },
    inventory: {
      consumables: [
        { type: "food", count: { min: 10, max: 40 } },
        { type: "drink", count: { min: 5, max: 20 } },
      ],
    },
    resources: {
      spiritStones: { min: 20, max: 100 },
    },
    personalityWeights: {
      friendly_traveler: 4,
      greedy_merchant: 3,
    },
    icon: "🍺",
  },
];

// ============================================
// СОЦИАЛЬНЫЕ РОЛИ
// ============================================

const SOCIAL_ROLES: RolePreset[] = [
  {
    id: "noble",
    name: "Дворянин",
    nameEn: "Noble",
    description: "Аристократ с богатством и влиянием.",
    category: "advanced",
    rarity: "uncommon",
    type: "social",
    statModifiers: {
      strength: 1,
      agility: 2,
      intelligence: 4,
      vitality: 2,
    },
    techniques: {
      guaranteed: ["breath_of_qi"],
      possible: ["mental_shield", "wind_speed"],
      count: 2,
    },
    equipment: {
      weapon: "category_sword",
      armor: "category_robe",
      accessories: ["category_ring", "category_amulet"],
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 5, max: 15 } },
        { type: "elixir_cultivation", count: { min: 0, max: 2 } },
      ],
      qiStones: [{ quality: "stone", count: { min: 5, max: 20 } }],
    },
    resources: {
      spiritStones: { min: 200, max: 1000 },
    },
    personalityWeights: {
      arrogant_noble: 5,
      greedy_merchant: 2,
    },
    icon: "👑",
  },
  {
    id: "beggar",
    name: "Нищий",
    nameEn: "Beggar",
    description: "Бедняк без ресурсов. Выживает как может.",
    category: "basic",
    rarity: "common",
    type: "social",
    statModifiers: {
      strength: 0,
      agility: 2,
      intelligence: 1,
      vitality: 1,
    },
    techniques: {
      count: 0,
    },
    equipment: {
      armor: "category_rags",
    },
    inventory: {
      consumables: [
        { type: "food", count: { min: 0, max: 2 } },
      ],
    },
    resources: {
      spiritStones: { min: 0, max: 3 },
    },
    personalityWeights: {
      cynical_elder: 3,
      lazy_servant: 2,
    },
    icon: "🧎",
  },
  {
    id: "traveler",
    name: "Путник",
    nameEn: "Traveler",
    description: "Странник без постоянного дома.",
    category: "basic",
    rarity: "common",
    type: "social",
    statModifiers: {
      strength: 1,
      agility: 3,
      intelligence: 2,
      vitality: 2,
    },
    techniques: {
      guaranteed: ["breath_of_qi"],
      possible: ["wind_speed", "reinforced_strike"],
      count: 1,
    },
    equipment: {
      weapon: "category_staff",
      armor: "category_clothes",
    },
    inventory: {
      consumables: [
        { type: "food", count: { min: 2, max: 8 } },
        { type: "pill_healing", count: { min: 0, max: 3 } },
      ],
    },
    resources: {
      spiritStones: { min: 5, max: 30 },
    },
    personalityWeights: {
      friendly_traveler: 5,
      mysterious_hermit: 2,
    },
    icon: "🚶",
  },
  {
    id: "hermit",
    name: "Отшельник",
    nameEn: "Hermit",
    description: "Уединённый практик вдали от мира.",
    category: "master",
    rarity: "rare",
    type: "social",
    requirements: {
      minCultivationLevel: 4,
    },
    statModifiers: {
      strength: 2,
      agility: 2,
      intelligence: 6,
      vitality: 4,
    },
    techniques: {
      guaranteed: ["breath_of_qi", "mental_shield"],
      possible: ["qi_healing", "earth_armor", "void_step"],
      count: 3,
    },
    equipment: {
      weapon: "category_staff",
      armor: "category_robe",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 2, max: 8 } },
        { type: "pill_qi", count: { min: 2, max: 10 } },
      ],
      qiStones: [{ quality: "stone", count: { min: 5, max: 20 } }],
    },
    resources: {
      spiritStones: { min: 10, max: 100 },
    },
    personalityWeights: {
      mysterious_hermit: 5,
      wise_mentor: 3,
      eccentric_scholar: 2,
    },
    icon: "🧘",
  },
  {
    id: "refugee",
    name: "Беженец",
    nameEn: "Refugee",
    description: "Изгнанник, потерявший дом.",
    category: "basic",
    rarity: "common",
    type: "social",
    statModifiers: {
      strength: 1,
      agility: 2,
      intelligence: 1,
      vitality: 1,
    },
    techniques: {
      count: 0,
    },
    equipment: {
      armor: "category_clothes",
    },
    inventory: {
      consumables: [
        { type: "food", count: { min: 0, max: 3 } },
      ],
    },
    resources: {
      spiritStones: { min: 0, max: 5 },
    },
    personalityWeights: {
      cynical_elder: 3,
      friendly_traveler: 2,
    },
    icon: "🏃",
  },
  {
    id: "criminal",
    name: "Преступник",
    nameEn: "Criminal",
    description: "Нарушитель закона, скрывающийся от правосудия.",
    category: "basic",
    rarity: "common",
    type: "social",
    statModifiers: {
      strength: 2,
      agility: 4,
      intelligence: 2,
      vitality: 2,
    },
    techniques: {
      guaranteed: ["reinforced_strike"],
      possible: ["ghost_shadow", "wind_speed"],
      count: 1,
    },
    equipment: {
      weapon: "category_dagger",
      armor: "category_light",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 1, max: 5 } },
      ],
    },
    resources: {
      spiritStones: { min: 5, max: 50 },
    },
    personalityWeights: {
      hostile_bandit: 3,
      cunning_assassin: 2,
    },
    icon: "🎭",
  },
];

// ============================================
// БОЕВЫЕ РОЛИ
// ============================================

const COMBAT_ROLES: RolePreset[] = [
  {
    id: "guard_combat",
    name: "Страж",
    nameEn: "Guard",
    description: "Защитник порядка. Средний уровень.",
    category: "basic",
    rarity: "common",
    type: "combat",
    requirements: {
      minCultivationLevel: 2,
      maxCultivationLevel: 5,
    },
    statModifiers: {
      strength: 4,
      agility: 2,
      intelligence: 1,
      vitality: 4,
    },
    techniques: {
      guaranteed: ["reinforced_strike", "turtle_stance"],
      possible: ["iron_wall"],
      count: 2,
    },
    equipment: {
      weapon: "category_spear",
      armor: "category_heavy",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 2, max: 6 } },
      ],
      qiStones: [{ quality: "stone", count: { min: 2, max: 8 } }],
    },
    resources: {
      spiritStones: { min: 20, max: 80 },
    },
    personalityWeights: {
      loyal_guard: 5,
      ruthless_warrior: 1,
    },
    icon: "🛡️",
  },
  {
    id: "bandit",
    name: "Бандит",
    nameEn: "Bandit",
    description: "Разбойник, нападающий на путников.",
    category: "basic",
    rarity: "common",
    type: "combat",
    requirements: {
      minCultivationLevel: 1,
      maxCultivationLevel: 5,
    },
    statModifiers: {
      strength: 4,
      agility: 3,
      intelligence: 1,
      vitality: 3,
    },
    techniques: {
      guaranteed: ["reinforced_strike"],
      possible: ["dirty_trick", "ghost_shadow"],
      count: 2,
    },
    equipment: {
      weapon: ["category_sword", "category_axe", "category_dagger"],
      armor: "category_light",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 1, max: 4 } },
      ],
      qiStones: [{ quality: "stone", count: { min: 1, max: 5 } }],
    },
    resources: {
      spiritStones: { min: 5, max: 50 },
    },
    personalityWeights: {
      hostile_bandit: 5,
      greedy_merchant: 2,
    },
    icon: "🗡️",
  },
  {
    id: "mercenary",
    name: "Наёмник",
    nameEn: "Mercenary",
    description: "Воин за деньги. Вариативный уровень.",
    category: "advanced",
    rarity: "uncommon",
    type: "combat",
    requirements: {
      minCultivationLevel: 2,
      maxCultivationLevel: 6,
    },
    statModifiers: {
      strength: 4,
      agility: 3,
      intelligence: 2,
      vitality: 3,
    },
    techniques: {
      guaranteed: ["reinforced_strike", "breath_of_qi"],
      possible: ["fire_strike", "wind_speed", "turtle_stance"],
      count: 3,
    },
    equipment: {
      weapon: ["category_sword", "category_axe", "category_spear"],
      armor: "category_medium",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 2, max: 8 } },
        { type: "pill_qi", count: { min: 0, max: 3 } },
      ],
      qiStones: [{ quality: "stone", count: { min: 3, max: 12 } }],
    },
    resources: {
      spiritStones: { min: 30, max: 150 },
    },
    personalityWeights: {
      ruthless_warrior: 4,
      greedy_merchant: 3,
    },
    icon: "⚔️",
  },
  {
    id: "assassin",
    name: "Убийца",
    nameEn: "Assassin",
    description: "Мастер скрытных убийств.",
    category: "advanced",
    rarity: "rare",
    type: "combat",
    requirements: {
      minCultivationLevel: 3,
      maxCultivationLevel: 7,
      speciesType: ["humanoid"],
    },
    statModifiers: {
      strength: 3,
      agility: 6,
      intelligence: 4,
      vitality: 2,
    },
    techniques: {
      guaranteed: ["ghost_shadow", "qi_bullet"],
      possible: ["lightning_flash", "wind_speed"],
      count: 3,
    },
    equipment: {
      weapon: "category_dagger",
      armor: "category_light",
      accessories: ["category_amulet"],
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 2, max: 5 } },
        { type: "poison", count: { min: 1, max: 5 } },
      ],
      qiStones: [{ quality: "stone", count: { min: 3, max: 15 } }],
    },
    resources: {
      spiritStones: { min: 50, max: 200 },
    },
    personalityWeights: {
      cunning_assassin: 5,
      mysterious_hermit: 2,
    },
    icon: "🗡️",
  },
  {
    id: "cultist",
    name: "Культист",
    nameEn: "Cultist",
    description: "Фанатик тёмной секты.",
    category: "advanced",
    rarity: "uncommon",
    type: "combat",
    requirements: {
      minCultivationLevel: 2,
      maxCultivationLevel: 6,
    },
    statModifiers: {
      strength: 2,
      agility: 2,
      intelligence: 4,
      vitality: 3,
    },
    techniques: {
      guaranteed: ["breath_of_qi"],
      possible: ["fire_ball", "mental_shield", "curse"],
      count: 2,
    },
    equipment: {
      weapon: "category_dagger",
      armor: "category_robe",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 1, max: 4 } },
      ],
      qiStones: [{ quality: "stone", count: { min: 2, max: 10 } }],
    },
    resources: {
      spiritStones: { min: 10, max: 80 },
    },
    personalityWeights: {
      pious_cultist: 5,
      hostile_bandit: 2,
    },
    icon: "🌑",
  },
  {
    id: "warrior",
    name: "Воин",
    nameEn: "Warrior",
    description: "Профессиональный боец. Сбалансированный.",
    category: "basic",
    rarity: "common",
    type: "combat",
    requirements: {
      minCultivationLevel: 1,
      maxCultivationLevel: 6,
    },
    statModifiers: {
      strength: 5,
      agility: 3,
      intelligence: 1,
      vitality: 4,
    },
    techniques: {
      guaranteed: ["reinforced_strike", "breath_of_qi"],
      possible: ["turtle_stance", "fire_strike", "iron_wall"],
      count: 2,
    },
    equipment: {
      weapon: ["category_sword", "category_axe"],
      armor: "category_medium",
    },
    inventory: {
      consumables: [
        { type: "pill_healing", count: { min: 2, max: 6 } },
      ],
      qiStones: [{ quality: "stone", count: { min: 2, max: 10 } }],
    },
    resources: {
      spiritStones: { min: 20, max: 100 },
    },
    personalityWeights: {
      ruthless_warrior: 4,
      loyal_guard: 2,
    },
    icon: "⚔️",
  },
];

// ============================================
// ЭКСПОРТ ВСЕХ РОЛЕЙ
// ============================================

export const ROLE_PRESETS: RolePreset[] = [
  ...SECT_ROLES,
  ...PROFESSION_ROLES,
  ...SOCIAL_ROLES,
  ...COMBAT_ROLES,
];

// ============================================
// ФУНКЦИИ ПОИСКА
// ============================================

/**
 * Получить роль по ID
 */
export function getRoleById(id: string): RolePreset | undefined {
  return ROLE_PRESETS.find(r => r.id === id);
}

/**
 * Получить роли по типу
 */
export function getRolesByType(type: RoleType): RolePreset[] {
  return ROLE_PRESETS.filter(r => r.type === type);
}

/**
 * Получить все роли
 */
export function getAllRoles(): RolePreset[] {
  return ROLE_PRESETS;
}

/**
 * Получить роли секты
 */
export function getSectRoles(): RolePreset[] {
  return SECT_ROLES;
}

/**
 * Получить профессиональные роли
 */
export function getProfessionRoles(): RolePreset[] {
  return PROFESSION_ROLES;
}

/**
 * Получить социальные роли
 */
export function getSocialRoles(): RolePreset[] {
  return SOCIAL_ROLES;
}

/**
 * Получить боевые роли
 */
export function getCombatRoles(): RolePreset[] {
  return COMBAT_ROLES;
}

/**
 * Получить роли для уровня культивации
 */
export function getRolesForCultivationLevel(level: number): RolePreset[] {
  return ROLE_PRESETS.filter(r => {
    const req = r.requirements;
    if (!req) return true;
    if (req.minCultivationLevel !== undefined && level < req.minCultivationLevel) return false;
    if (req.maxCultivationLevel !== undefined && level > req.maxCultivationLevel) return false;
    return true;
  });
}

/**
 * Получить роли для вида
 */
export function getRolesForSpecies(speciesType: SpeciesType): RolePreset[] {
  return ROLE_PRESETS.filter(r => {
    const req = r.requirements;
    if (!req?.speciesType) return true;
    return req.speciesType.includes(speciesType);
  });
}

/**
 * Получить случайную роль
 */
export function getRandomRole(): RolePreset {
  return ROLE_PRESETS[Math.floor(Math.random() * ROLE_PRESETS.length)];
}

/**
 * Получить случайную роль по типу
 */
export function getRandomRoleByType(type: RoleType): RolePreset {
  const roles = getRolesByType(type);
  return roles[Math.floor(Math.random() * roles.length)];
}

/**
 * Получить совместимые личности для роли
 */
export function getCompatiblePersonalitiesForRole(roleId: string): string[] {
  const role = getRoleById(roleId);
  if (!role?.personalityWeights) return [];
  
  return Object.entries(role.personalityWeights)
    .filter(([, weight]) => weight >= 2)
    .map(([id]) => id);
}

/**
 * Статистика по ролям
 */
export function getRoleStats(): {
  total: number;
  byType: Record<RoleType, number>;
} {
  const byType = {} as Record<RoleType, number>;
  const types: RoleType[] = ["sect", "profession", "social", "combat"];
  
  for (const type of types) {
    byType[type] = getRolesByType(type).length;
  }
  
  return {
    total: ROLE_PRESETS.length,
    byType,
  };
}
