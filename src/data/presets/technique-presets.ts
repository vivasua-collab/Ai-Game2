/**
 * ============================================================================
 * ПРЕСЕТЫ ТЕХНИК (Единый формат)
 * ============================================================================
 * 
 * Техники - это активные способности, используемые практиком:
 * - combat: Боевые (атаки, защита)
 * - cultivation: Культивационные (накопление Ци)
 * - support: Вспомогательные (баффы, дебаффы)
 * - movement: Передвижения (ускорение, полёт, телепортация)
 * - sensory: Восприятия (обнаружение, анализ)
 * - healing: Исцеления (восстановление здоровья)
 * 
 * Уровни техник: 1-9
 * Уровни развития: minLevel → maxLevel
 * 
 * ============================================================================
 */

import type { BasePreset, PresetCategory, PresetRarity, PresetElement, PresetSource } from "./base-preset";

// ============================================
// ТИПЫ ТЕХНИК (импорт из единого источника)
// ============================================

import type {
  TechniqueType,
  CombatSubtype,
  DefenseSubtype,
} from '@/types/technique-types';

// Реэкспорт для удобства
export type { TechniqueType, CombatSubtype, DefenseSubtype } from '@/types/technique-types';

/**
 * @deprecated Используйте CombatSubtype из '@/types/technique-types'
 * Алиас для обратной совместимости с legacy пресетами
 */
export type CombatTechniqueType = 
  | CombatSubtype
  | "defense_block"      // Блок (снижение урона) - legacy
  | "defense_shield"     // Энергетический щит (поглощение) - legacy  
  | "defense_dodge";     // Уклонение (реакция) - legacy

/**
 * Масштабирование от характеристик
 */
export interface TechniqueScaling {
  strength?: number;      // +X% эффекта за единицу силы выше 10
  agility?: number;
  intelligence?: number;
  conductivity?: number;  // +X% за каждую единицу проводимости
}

/**
 * Параметры дальности для боевых техник
 */
export interface CombatRange {
  fullDamage: number;   // Дальность полного урона (м)
  halfDamage: number;   // Дальность 50% урона (м)
  max: number;          // Максимальная дальность (м) - после урон = 0
}

/**
 * Элементальный эффект
 */
export interface ElementalEffect {
  type: PresetElement;
  damagePerTurn?: number;  // Урон за ход (DoT)
  duration: number;        // Длительность эффекта
}

/**
 * Эффекты техники
 */
export interface TechniqueEffects {
  damage?: number;
  healing?: number;
  qiRegen?: number;         // Legacy: фиксированное значение Ци
  qiRegenPercent?: number;  // Процент к поглощению Ци (для техник культивации)
  unnoticeability?: number; // Процент снижения шанса прерывания (1-5%)
  castSpeed?: number;       // Скорость каста (зависит от проводимости)
  duration?: number;        // В минутах
  distance?: number;        // Дальность (в метрах) - legacy
  statModifiers?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
  };
  // === БОЕВЫЕ ТЕХНИКИ ===
  combatType?: CombatTechniqueType;     // Тип боевой техники
  range?: CombatRange;                   // Параметры дальности
  contactRequired?: boolean;             // Требует контакта
  aoeRadius?: number;                    // Радиус AOE (м)
  elementalEffect?: ElementalEffect;     // Элементальный эффект
  dodgeChance?: number;                  // Шанс уклонения (для projectile)
  penetration?: number;                  // Пробитие защиты (%)
  // === ЗАЩИТНЫЕ ТЕХНИКИ ===
  damageReduction?: number;   // Снижение урона (%)
  blockChance?: number;       // Шанс блока (%)
  durability?: number;        // Прочность блока
  shieldHP?: number;          // Здоровье щита
  regeneration?: number;      // Регенерация щита/ход
  qiDrainPerHit?: number;     // Расход Ци при попадании
  counterBonus?: number;      // Бонус к контратаке (%)
}

/**
 * Затраты на использование
 */
export interface TechniqueFatigueCost {
  physical: number;
  mental: number;
}

/**
 * Пресет техники (Единый формат)
 */
export interface TechniquePreset extends BasePreset {
  // === ТИП ТЕХНИКИ (обязательно) ===
  techniqueType: TechniqueType;
  
  // === ЭЛЕМЕНТ (обязательно) ===
  element: PresetElement;
  
  // === УРОВЕНЬ ТЕХНИКИ ===
  level: number;          // Текущий уровень техники (1-9)
  minLevel: number;       // Минимальный уровень развития
  maxLevel: number;       // Максимальный уровень развития
  canEvolve?: boolean;    // Можно ли развивать (default: true)
  
  // === ЗАТРАТЫ НА ИСПОЛЬЗОВАНИЕ ===
  qiCost: number;
  fatigueCost: TechniqueFatigueCost;
  
  /**
   * Базовая структурная ёмкость техники (опционально)
   * Если не указана - рассчитывается из типа и подтипа при конвертации
   * @see getBaseCapacity в technique-capacity.ts
   */
  baseCapacity?: number;
  
  // === МАСШТАБИРОВАНИЕ ===
  scaling?: TechniqueScaling;
  
  // === ЭФФЕКТЫ ===
  effects: TechniqueEffects;
  
  // === МАСТЕРСТВО ===
  masteryBonus: number;   // Множитель при 100% мастерства
}

// ============================================
// БАЗОВЫЕ ТЕХНИКИ
// ============================================

export const BASIC_TECHNIQUES: TechniquePreset[] = [
  {
    id: "breath_of_qi",
    name: "Дыхание Ци",
    nameEn: "Breath of Qi",
    description: "Базовая техника накопления Ци. Основа практики для любого культиватора. Увеличивает поглощение Ци из среды и снижает шанс быть замеченным существами.",
    category: "basic",
    rarity: "common",
    techniqueType: "cultivation",
    element: "neutral",
    level: 1,
    minLevel: 1,
    maxLevel: 9,
    canEvolve: true,
    requirements: {
      cultivationLevel: 1,
    },
    qiCost: 0,
    fatigueCost: { physical: 0.05, mental: 0.1 },
    scaling: {
      intelligence: 0.02,
      conductivity: 0.1,
    },
    effects: { 
      qiRegen: 5,
      qiRegenPercent: 5,
      unnoticeability: 3
    },
    masteryBonus: 0.5,
    sources: ["preset", "sect"],
    icon: "🧘",
  },
  {
    id: "greedy_absorption",
    name: "Жадное поглощение",
    nameEn: "Greedy Absorption",
    description: "Агрессивная техника накопления Ци. Даёт значительный бонус к поглощению, но делает практика более заметным для существ из-за активного забора энергии.",
    category: "basic",
    rarity: "common",
    techniqueType: "cultivation",
    element: "neutral",
    level: 1,
    minLevel: 1,
    maxLevel: 9,
    canEvolve: true,
    requirements: {
      cultivationLevel: 1,
    },
    qiCost: 0,
    fatigueCost: { physical: 0.08, mental: 0.15 },
    scaling: {
      intelligence: 0.03,
      conductivity: 0.15,
    },
    effects: { 
      qiRegen: 10,
      qiRegenPercent: 10,
      unnoticeability: -5  // Отрицательное значение = повышает заметность
    },
    masteryBonus: 0.6,
    sources: ["preset", "sect"],
    icon: "🌀",
  },
  // === БОЕВЫЕ ТЕХНИКИ: БЛИЖНИЙ БОЙ ===
  {
    id: "reinforced_strike",
    name: "Усиленный удар",
    nameEn: "Reinforced Strike",
    description: "Простой удар с использованием Ци. Первая боевая техника ближнего боя.",
    category: "basic",
    rarity: "common",
    techniqueType: "combat",
    element: "neutral",
    level: 1,
    minLevel: 1,
    maxLevel: 5,
    canEvolve: true,
    requirements: {
      cultivationLevel: 1,
      stats: { strength: 8 },
    },
    qiCost: 5,
    fatigueCost: { physical: 2, mental: 1 },
    scaling: {
      strength: 0.05,
    },
    effects: { 
      damage: 15,
      combatType: "melee_strike",
      contactRequired: true,
      range: { fullDamage: 2, halfDamage: 2, max: 2 }  // Только контакт
    },
    masteryBonus: 0.3,
    sources: ["preset", "sect"],
    icon: "👊",
  },
  // === БОЕВЫЕ ТЕХНИКИ: ДАЛЬНИЙ БОЙ ===
  {
    id: "qi_bullet",
    name: "Ци-снаряд",
    nameEn: "Qi Bullet",
    description: "Базовая дистанционная атака. Выпускает сгусток Ци, который летит по прямой. Урон падает с расстоянием.",
    category: "basic",
    rarity: "common",
    techniqueType: "combat",
    element: "neutral",
    level: 1,
    minLevel: 1,
    maxLevel: 5,
    canEvolve: true,
    requirements: {
      cultivationLevel: 1,
      stats: { conductivity: 0.2 },
    },
    qiCost: 8,
    fatigueCost: { physical: 1, mental: 2 },
    scaling: {
      conductivity: 0.08,
    },
    effects: { 
      damage: 12,
      combatType: "ranged_projectile",
      range: { fullDamage: 10, halfDamage: 20, max: 30 },
      dodgeChance: 0.15  // 15% шанс уклонения
    },
    masteryBonus: 0.25,
    sources: ["preset", "sect"],
    icon: "💠",
  },
];

// ============================================
// ПРОДВИНУТЫЕ ТЕХНИКИ
// ============================================

export const ADVANCED_TECHNIQUES: TechniquePreset[] = [
  {
    id: "mental_shield",
    name: "Ментальный щит",
    nameEn: "Mental Shield",
    description: "Защита от ментальных атак и духовного давления.",
    category: "advanced",
    rarity: "uncommon",
    techniqueType: "support",
    element: "neutral",
    level: 2,
    minLevel: 1,
    maxLevel: 6,
    canEvolve: true,
    requirements: {
      cultivationLevel: 2,
      stats: { intelligence: 12 },
    },
    qiCost: 10,
    fatigueCost: { physical: 0.5, mental: 3 },
    scaling: {
      intelligence: 0.03,
      conductivity: 0.05,
    },
    effects: { duration: 10 },
    masteryBonus: 0.4,
    sources: ["sect", "scroll"],
    cost: {
      contributionPoints: 20,
    },
    icon: "🛡️",
  },
  {
    id: "wind_speed",
    name: "Скорость ветра",
    nameEn: "Wind Speed",
    description: "Временное усиление скорости движения.",
    category: "advanced",
    rarity: "uncommon",
    techniqueType: "movement",
    element: "air",
    level: 2,
    minLevel: 1,
    maxLevel: 5,
    canEvolve: true,
    requirements: {
      cultivationLevel: 2,
      stats: { agility: 12 },
    },
    qiCost: 15,
    fatigueCost: { physical: 3, mental: 2 },
    scaling: {
      agility: 0.04,
    },
    effects: {
      duration: 5,
      statModifiers: { agility: 20 },
    },
    masteryBonus: 0.35,
    sources: ["sect", "scroll"],
    cost: {
      contributionPoints: 25,
    },
    icon: "💨",
  },
  {
    id: "qi_healing",
    name: "Лечение Ци",
    nameEn: "Qi Healing",
    description: "Восстановление здоровья с помощью Ци.",
    category: "advanced",
    rarity: "rare",
    techniqueType: "healing",
    element: "neutral",
    level: 3,
    minLevel: 1,
    maxLevel: 7,
    canEvolve: true,
    requirements: {
      cultivationLevel: 3,
      stats: { intelligence: 14, conductivity: 0.5 },
    },
    qiCost: 30,
    fatigueCost: { physical: 1, mental: 5 },
    scaling: {
      intelligence: 0.03,
      conductivity: 0.1,
    },
    effects: { healing: 25 },
    masteryBonus: 0.5,
    sources: ["sect", "scroll"],
    cost: {
      contributionPoints: 50,
      spiritStones: 10,
    },
    icon: "💚",
  },
  {
    id: "fire_strike",
    name: "Огненный удар",
    nameEn: "Fire Strike",
    description: "Контактный удар, усиленный огненной Ци. Поджигает цель.",
    category: "advanced",
    rarity: "uncommon",
    techniqueType: "combat",
    element: "fire",
    level: 2,
    minLevel: 1,
    maxLevel: 6,
    canEvolve: true,
    requirements: {
      cultivationLevel: 2,
      stats: { strength: 10, conductivity: 0.3 },
    },
    qiCost: 15,
    fatigueCost: { physical: 3, mental: 2 },
    scaling: {
      strength: 0.04,
      conductivity: 0.08,
    },
    effects: { 
      damage: 25,
      combatType: "melee_strike",
      contactRequired: true,
      range: { fullDamage: 2, halfDamage: 2, max: 2 },
      elementalEffect: {
        type: "fire",
        damagePerTurn: 5,
        duration: 2
      }
    },
    masteryBonus: 0.4,
    sources: ["sect", "scroll"],
    cost: {
      contributionPoints: 30,
    },
    icon: "🔥",
  },
  {
    id: "blazing_blade",
    name: "Пылающий клинок",
    nameEn: "Blazing Blade",
    description: "Усиление оружия огненной Ци. Добавляет огненный урон к атакам.",
    category: "advanced",
    rarity: "uncommon",
    techniqueType: "combat",
    element: "fire",
    level: 2,
    minLevel: 1,
    maxLevel: 5,
    canEvolve: true,
    requirements: {
      cultivationLevel: 2,
      stats: { conductivity: 0.4 },
    },
    qiCost: 20,
    fatigueCost: { physical: 1, mental: 3 },
    scaling: {
      conductivity: 0.06,
    },
    effects: { 
      damage: 12,
      combatType: "melee_weapon",
      duration: 5,
      elementalEffect: {
        type: "fire",
        damagePerTurn: 3,
        duration: 1
      }
    },
    masteryBonus: 0.35,
    sources: ["sect", "scroll"],
    cost: {
      contributionPoints: 35,
    },
    icon: "🗡️",
  },
  {
    id: "fire_ball",
    name: "Огненный шар",
    nameEn: "Fire Ball",
    description: "Дистанционная атака огнём. Выпускает огненный шар, который взрывается при попадании.",
    category: "advanced",
    rarity: "uncommon",
    techniqueType: "combat",
    element: "fire",
    level: 2,
    minLevel: 1,
    maxLevel: 6,
    canEvolve: true,
    requirements: {
      cultivationLevel: 2,
      stats: { conductivity: 0.5 },
    },
    qiCost: 18,
    fatigueCost: { physical: 1, mental: 4 },
    scaling: {
      conductivity: 0.1,
    },
    effects: { 
      damage: 30,
      combatType: "ranged_projectile",
      range: { fullDamage: 15, halfDamage: 30, max: 45 },
      aoeRadius: 2,
      dodgeChance: 0.1,
      elementalEffect: {
        type: "fire",
        damagePerTurn: 5,
        duration: 2
      }
    },
    masteryBonus: 0.4,
    sources: ["sect", "scroll"],
    cost: {
      contributionPoints: 40,
    },
    icon: "🔥",
  },
  {
    id: "water_shield",
    name: "Водяной щит",
    nameEn: "Water Shield",
    description: "Защитный барьер из водяной Ци. Поглощает урон за счёт щита.",
    category: "advanced",
    rarity: "uncommon",
    techniqueType: "combat",
    element: "water",
    level: 2,
    minLevel: 1,
    maxLevel: 5,
    canEvolve: true,
    requirements: {
      cultivationLevel: 2,
      stats: { intelligence: 12, conductivity: 0.4 },
    },
    qiCost: 20,
    fatigueCost: { physical: 1, mental: 3 },
    scaling: {
      intelligence: 0.05,
    },
    effects: { 
      combatType: "defense_shield",
      shieldHP: 50,
      regeneration: 5,
      qiDrainPerHit: 3,
      duration: 5 
    },
    masteryBonus: 0.35,
    sources: ["sect", "scroll"],
    cost: {
      contributionPoints: 30,
    },
    icon: "💧",
  },
  // === ЗАЩИТНЫЕ ТЕХНИКИ ===
  {
    id: "turtle_stance",
    name: "Стойка черепахи",
    nameEn: "Turtle Stance",
    description: "Защитная стойка, значительно снижающая входящий урон. Требует оружие или щит.",
    category: "basic",
    rarity: "common",
    techniqueType: "combat",
    element: "earth",
    level: 1,
    minLevel: 1,
    maxLevel: 5,
    canEvolve: true,
    requirements: {
      cultivationLevel: 1,
      stats: { strength: 8 },
    },
    qiCost: 10,
    fatigueCost: { physical: 3, mental: 1 },
    scaling: {
      intelligence: 0.05,
    },
    effects: { 
      combatType: "defense_block",
      damageReduction: 40,
      blockChance: 70,
      durability: 50,
      duration: 1
    },
    masteryBonus: 0.3,
    sources: ["preset", "sect"],
    icon: "🛡️",
  },
  {
    id: "ghost_shadow",
    name: "Тень призрака",
    nameEn: "Ghost Shadow",
    description: "Техника уклонения. Увеличивает шанс избежать атаки.",
    category: "advanced",
    rarity: "uncommon",
    techniqueType: "combat",
    element: "air",
    level: 2,
    minLevel: 1,
    maxLevel: 5,
    canEvolve: true,
    requirements: {
      cultivationLevel: 2,
      stats: { agility: 12, intelligence: 10 },
    },
    qiCost: 15,
    fatigueCost: { physical: 5, mental: 2 },
    scaling: {
      intelligence: 0.05,
    },
    effects: { 
      combatType: "defense_dodge",
      dodgeChance: 25,
      counterBonus: 15,
      duration: 3
    },
    masteryBonus: 0.35,
    sources: ["sect", "scroll"],
    cost: {
      contributionPoints: 35,
    },
    icon: "👻",
  },
  {
    id: "iron_wall",
    name: "Железная стена",
    nameEn: "Iron Wall",
    description: "Мощный блок, способный выдержать значительный урон.",
    category: "advanced",
    rarity: "rare",
    techniqueType: "combat",
    element: "earth",
    level: 3,
    minLevel: 1,
    maxLevel: 6,
    canEvolve: true,
    requirements: {
      cultivationLevel: 3,
      stats: { strength: 14, intelligence: 12 },
    },
    qiCost: 25,
    fatigueCost: { physical: 4, mental: 2 },
    scaling: {
      intelligence: 0.05,
    },
    effects: { 
      combatType: "defense_block",
      damageReduction: 60,
      blockChance: 85,
      durability: 100,
      duration: 1
    },
    masteryBonus: 0.4,
    sources: ["scroll", "insight"],
    cost: {
      contributionPoints: 60,
      spiritStones: 10,
    },
    icon: "🏰",
  },
];

// ============================================
// МАСТЕРСКИЕ ТЕХНИКИ
// ============================================

export const MASTER_TECHNIQUES: TechniquePreset[] = [
  {
    id: "lightning_flash",
    name: "Молниеносный рывок",
    nameEn: "Lightning Flash",
    description: "Мгновенное перемещение на короткое расстояние.",
    category: "master",
    rarity: "rare",
    techniqueType: "movement",
    element: "air",
    level: 4,
    minLevel: 1,
    maxLevel: 6,
    canEvolve: true,
    requirements: {
      cultivationLevel: 4,
      stats: { agility: 18, conductivity: 1.0 },
    },
    qiCost: 50,
    fatigueCost: { physical: 5, mental: 8 },
    scaling: {
      agility: 0.05,
      conductivity: 0.12,
    },
    effects: {
      duration: 1,
      statModifiers: { agility: 50 },
    },
    masteryBonus: 0.6,
    sources: ["scroll", "insight"],
    cost: {
      contributionPoints: 100,
      spiritStones: 50,
    },
    icon: "⚡",
  },
  {
    id: "earth_armor",
    name: "Земляная броня",
    nameEn: "Earth Armor",
    description: "Мощная защита, усиливающая тело.",
    category: "master",
    rarity: "rare",
    techniqueType: "support",
    element: "earth",
    level: 3,
    minLevel: 1,
    maxLevel: 7,
    canEvolve: true,
    requirements: {
      cultivationLevel: 3,
      stats: { strength: 14, conductivity: 0.6 },
    },
    qiCost: 25,
    fatigueCost: { physical: 2, mental: 4 },
    scaling: {
      strength: 0.04,
      conductivity: 0.08,
    },
    effects: {
      duration: 15,
      statModifiers: { strength: 15 },
    },
    masteryBonus: 0.45,
    sources: ["scroll", "insight"],
    cost: {
      contributionPoints: 80,
      spiritStones: 30,
    },
    icon: "🪨",
  },
  {
    id: "void_step",
    name: "Шаг пустоты",
    nameEn: "Void Step",
    description: "Переход через пространство пустоты. Техника высшего уровня.",
    category: "master",
    rarity: "legendary",
    techniqueType: "movement",
    element: "void",
    level: 6,
    minLevel: 1,
    maxLevel: 9,
    canEvolve: true,
    requirements: {
      cultivationLevel: 6,
      stats: { intelligence: 20, conductivity: 2.0 },
    },
    qiCost: 100,
    fatigueCost: { physical: 10, mental: 15 },
    scaling: {
      intelligence: 0.06,
      conductivity: 0.15,
    },
    effects: {
      duration: 2,
    },
    masteryBonus: 0.8,
    sources: ["insight"],
    cost: {
      spiritStones: 200,
    },
    icon: "🌀",
  },
];

// ============================================
// ЛЕГЕНДАРНЫЕ ТЕХНИКИ (телепортация)
// ============================================

export const LEGENDARY_TECHNIQUES: TechniquePreset[] = [
  {
    id: "spatial_shift",
    name: "Пространственный сдвиг",
    nameEn: "Spatial Shift",
    description: "Телепортация в пределах видимости. Доступна с 7-го уровня культивации.",
    category: "legendary",
    rarity: "legendary",
    techniqueType: "movement",
    element: "void",
    level: 7,
    minLevel: 7,
    maxLevel: 9,
    canEvolve: true,
    requirements: {
      cultivationLevel: 7,
      stats: { intelligence: 25, conductivity: 3.0 },
    },
    qiCost: 200,
    fatigueCost: { physical: 15, mental: 25 },
    scaling: {
      intelligence: 0.08,
      conductivity: 0.2,
    },
    effects: {
      distance: 1000, // 1 км на 7-м уровне
    },
    masteryBonus: 1.0,
    sources: ["insight"],
    cost: {
      spiritStones: 500,
    },
    icon: "✨",
  },
  {
    id: "heavenly_transmission",
    name: "Небесная передача",
    nameEn: "Heavenly Transmission",
    description: "Дальняя телепортация в ранее посещённые места. Требует метку места.",
    category: "legendary",
    rarity: "legendary",
    techniqueType: "movement",
    element: "void",
    level: 8,
    minLevel: 8,
    maxLevel: 9,
    canEvolve: true,
    requirements: {
      cultivationLevel: 8,
      stats: { intelligence: 30, conductivity: 4.0 },
    },
    qiCost: 500,
    fatigueCost: { physical: 25, mental: 40 },
    scaling: {
      intelligence: 0.1,
      conductivity: 0.25,
    },
    effects: {
      distance: 50000, // 50 км на 8-м уровне
    },
    masteryBonus: 1.2,
    sources: ["insight"],
    cost: {
      spiritStones: 1000,
    },
    icon: "🌟",
  },
  {
    id: "void_march",
    name: "Марш пустоты",
    nameEn: "Void March",
    description: "Мгновенная телепортация на любую дистанцию в пределах мира. Высшая техника перемещения.",
    category: "legendary",
    rarity: "legendary",
    techniqueType: "movement",
    element: "void",
    level: 9,
    minLevel: 9,
    maxLevel: 9,
    canEvolve: false,
    requirements: {
      cultivationLevel: 9,
      stats: { intelligence: 35, conductivity: 5.0 },
    },
    qiCost: 1000,
    fatigueCost: { physical: 40, mental: 60 },
    scaling: {
      intelligence: 0.12,
      conductivity: 0.3,
    },
    effects: {
      distance: 500000, // 500 км - в пределах мира
    },
    masteryBonus: 1.5,
    sources: ["insight"],
    icon: "🌌",
  },
];

// ============================================
// ЭКСПОРТ ВСЕХ ТЕХНИК
// ============================================

export const ALL_TECHNIQUE_PRESETS: TechniquePreset[] = [
  ...BASIC_TECHNIQUES,
  ...ADVANCED_TECHNIQUES,
  ...MASTER_TECHNIQUES,
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
  return ALL_TECHNIQUE_PRESETS.filter(t => t.techniqueType === type);
}

/**
 * Получить техники по элементу
 */
export function getTechniquePresetsByElement(element: PresetElement): TechniquePreset[] {
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
  return ALL_TECHNIQUE_PRESETS.filter(t => {
    if (!t.requirements?.cultivationLevel) return true;
    return t.requirements.cultivationLevel <= cultivationLevel;
  });
}

/**
 * Получить техники телепортации (7+ уровень)
 */
export function getTeleportationTechniques(): TechniquePreset[] {
  return LEGENDARY_TECHNIQUES.filter(t => t.techniqueType === "movement" && t.effects.distance);
}

/**
 * Рассчитать дальность телепортации
 */
export function calculateTeleportDistance(technique: TechniquePreset, techniqueLevel: number): number {
  if (!technique.effects.distance) return 0;
  
  const baseDistance = technique.effects.distance;
  const levelMultiplier = 1 + (techniqueLevel - technique.minLevel) * 0.5; // +50% за уровень
  
  return Math.floor(baseDistance * levelMultiplier);
}

/**
 * Получить техники по уровню
 */
export function getTechniquePresetsByLevel(level: number): TechniquePreset[] {
  return ALL_TECHNIQUE_PRESETS.filter(t => t.level === level);
}

/**
 * Получить техники по категории
 */
export function getTechniquePresetsByCategory(category: PresetCategory): TechniquePreset[] {
  return ALL_TECHNIQUE_PRESETS.filter(t => t.category === category);
}
