/**
 * ============================================================================
 * ТИПЫ ВРЕМЕННЫХ NPC ("СТАТИСТОВ")
 * ============================================================================
 * 
 * Временные NPC существуют только в памяти сессии и не сохраняются в базу.
 * Генерируются при входе в локацию, удаляются при выходе или смерти.
 */

import type { SpeciesType } from '@/data/presets';

// ==================== TEMP ITEM ====================

/**
 * Временный предмет (существует только у статиста)
 */
export interface TempItem {
  id: string;                    // TEMP_ITEM_XXXXXX
  name: string;
  nameId?: string;               // ID пресета (если есть)
  type: TempItemType;
  category: TempItemCategory;
  rarity: TempItemRarity;
  icon?: string;
  
  // Статы предмета
  stats: TempItemStats;
  
  // Эффекты (для расходников)
  effects?: TempItemEffect[];
  
  // Заряды (для расходников)
  charges?: number;
  maxCharges?: number;
  
  // Стоимость
  value?: number;
  
  // Требования
  requirements?: {
    level?: number;
    strength?: number;
    agility?: number;
    intelligence?: number;
  };
}

export type TempItemType = 'weapon' | 'armor' | 'consumable' | 'accessory' | 'material';
export type TempItemCategory = 
  | 'weapon_sword' | 'weapon_spear' | 'weapon_staff' | 'weapon_fist'
  | 'armor_torso' | 'armor_head' | 'armor_legs' | 'armor_feet'
  | 'consumable_pill' | 'consumable_potion' | 'consumable_food'
  | 'accessory_ring' | 'accessory_amulet' | 'accessory_charm'
  | 'material_essence' | 'material_core' | 'material_herb';
export type TempItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface TempItemStats {
  damage?: number;
  defense?: number;
  qiBonus?: number;
  healthBonus?: number;
  fatigueReduction?: number;
  conductivityBonus?: number;
}

export interface TempItemEffect {
  type: TempEffectType;
  value: number;
  duration?: number;            // Длительность в минутах (для баффов)
}

export type TempEffectType = 
  | 'heal' | 'qi_restore' | 'fatigue_restore'
  | 'strength_boost' | 'agility_boost' | 'intelligence_boost'
  | 'damage_boost' | 'defense_boost' | 'speed_boost';

// ==================== TEMP NPC ====================

/**
 * SoulEntity типы для совместимости
 */
export type SoulType = 'character' | 'creature' | 'spirit' | 'construct';
export type SoulController = 'player' | 'ai';
export type MindComplexity = 'full' | 'instinct' | 'simple';

/**
 * Конфигурация ИИ поведения
 */
export interface AIBehaviorConfig {
  agroRadius: number;        // Радиус агрессии (в пикселях)
  patrolRadius: number;      // Радиус патрулирования
  fleeThreshold: number;     // % HP для бегства (0-1)
  attackRange: number;       // Дистанция атаки
  chaseSpeed: number;        // Скорость преследования
  patrolSpeed: number;       // Скорость патруля
}

/**
 * Конфигурация коллизии NPC
 */
export interface CollisionConfig {
  radius: number;              // Радиус коллизии (пиксели)
  height: number;             // Высота (для 3D коллизии, см)
  weight: number;             // Вес (для толкания, кг)
}

/**
 * Зоны взаимодействия NPC
 */
export interface InteractionZones {
  talk: number;               // Радиус разговора (пиксели)
  trade: number;              // Радиус торговли
  agro: number;               // Радиус агрессии
  flee: number;               // Радиус бегства
  perception: number;         // Радиус восприятия
}

/**
 * Временный NPC (статист) - существует только в памяти
 */
export interface TempNPC {
  // === Идентификация ===
  id: string;                    // TEMP_XXXXXX (не в базе)
  isTemporary: true;             // Флаг для отличия от персистентных
  
  // === Пресеты (из базы пресетов) ===
  speciesId: string;             // human, elf, wolf, etc.
  speciesType: SpeciesType;      // humanoid, beast, spirit, etc.
  roleId: string;                // outer_disciple, bandit, etc.
  
  // === SoulEntity совместимость ===
  soulType: SoulType;            // character, creature, spirit, construct
  controller: 'ai';              // Временные NPC всегда под AI
  mind: MindComplexity;          // full, instinct, simple
  
  // === Позиция в мире ===
  position?: {
    x: number;                   // Позиция X в пикселях
    y: number;                   // Позиция Y в пикселях
  };
  
  // === ИИ конфигурация ===
  aiConfig?: AIBehaviorConfig;   // Настройки поведения ИИ
  
  // === Коллизия и взаимодействие ===
  collision: CollisionConfig;       // Настройки коллизии
  interactionZones: InteractionZones; // Зоны взаимодействия
  
  // === Генерируемые данные ===
  name: string;                  // Случайное имя
  gender: 'male' | 'female' | 'none';
  age: number;
  
  // === Характеристики (из формул Lore) ===
  stats: TempNPCStats;
  
  // === Культивация ===
  cultivation: TempCultivation;
  
  // === Тело (Kenshi-style) ===
  bodyState: TempBodyState;
  
  // === Экипировка и инвентарь ===
  equipment: TempEquipment;
  quickSlots: (TempItem | null)[];
  techniques: string[];          // ID техник из пула
  
  // === Личность (упрощённая) ===
  personality: TempPersonality;
  
  // === Ресурсы ===
  resources: TempResources;
  
  // === Контекст ===
  locationId: string;            // Текущая локация
  factionId?: string;            // ID фракции/секты (если есть)
  
  // === Генерация ===
  generatedAt: number;           // Timestamp генерации
  seed: number;                  // Seed для детерминизма
}

/**
 * Характеристики NPC
 */
export interface TempNPCStats {
  strength: number;
  agility: number;
  intelligence: number;
  vitality: number;
}

/**
 * Культивация NPC
 */
export interface TempCultivation {
  level: number;                 // Основной уровень (1-9)
  subLevel: number;              // Ступень (0-9)
  coreCapacity: number;          // Полная ёмкость ядра
  currentQi: number;             // Текущее Ци
  coreQuality: number;           // Качество ядра
  baseVolume: number;            // Базовый объём ядра
  qiDensity: number;             // Плотность Ци = 2^(level-1)
  meridianConductivity: number;  // Проводимость меридиан
}

/**
 * Материал тела (для снижения урона)
 */
export type BodyMaterial = 'organic' | 'scaled' | 'chitin' | 'ethereal' | 'mineral' | 'chaos';

/**
 * Морфология тела
 */
export type BodyMorphology = 'humanoid' | 'quadruped' | 'bird' | 'serpentine' | 'arthropod' | 'amorphous';

/**
 * Состояние тела (упрощённое для статистов)
 */
export interface TempBodyState {
  // Общее здоровье
  health: number;                // 0-100%
  maxHealth: number;             // 100 + бонусы
  
  // Части тела
  parts: Record<string, TempBodyPart>;
  
  // Статус
  isDead: boolean;
  isUnconscious: boolean;
  
  // Активные эффекты
  activeEffects: TempActiveEffect[];
  
  // Материал и морфология (для расчёта урона)
  material?: BodyMaterial;       // organic, chitin, ethereal, etc.
  morphology?: BodyMorphology;   // humanoid, arthropod, etc.
}

export interface TempBodyPart {
  name: string;
  health: number;                // 0-100%
  status: 'healthy' | 'damaged' | 'crippled' | 'severed';
  isVital: boolean;              // Голова, торс, сердце
}

export interface TempActiveEffect {
  type: string;
  value: number;
  remainingDuration: number;     // Минуты
  source: string;                // ID источника
}

/**
 * Экипировка NPC
 */
export interface TempEquipment {
  weapon?: TempItem;
  armor?: TempItem;
  helmet?: TempItem;
  boots?: TempItem;
  gloves?: TempItem;
  accessory1?: TempItem;
  accessory2?: TempItem;
}

/**
 * Личность NPC
 */
export interface TempPersonality {
  disposition: number;           // -100 до 100 (отношение к игроку)
  aggressionLevel: number;       // 0-100 (0 = мирный, 100 = агрессивный)
  fleeThreshold: number;         // % HP при котором бежит (0-100)
  canTalk: boolean;              // Можно ли разговаривать
  canTrade: boolean;             // Можно ли торговать
  
  // Черты (из personality-presets)
  traits?: string[];
  motivation?: string;
  dominantEmotion?: string;
}

/**
 * Ресурсы NPC
 */
export interface TempResources {
  spiritStones: number;
  contributionPoints: number;
}

// ==================== LOCATION CONFIG ====================

/**
 * Конфигурация NPC для локации
 */
export interface LocationNPCConfig {
  // Идентификатор конфигурации
  id: string;
  name: string;
  description?: string;
  
  // Количество статистов
  population: {
    min: number;                 // Минимум в локации
    max: number;                 // Максимум в локации
    density?: number;            // На 1000 м² (для динамического расчёта)
  };
  
  // Ограничения по видам
  allowedSpecies: SpeciesWeight[];
  
  // Ограничения по ролям
  allowedRoles: RoleWeight[];
  
  // Диапазон уровней
  levelRange: {
    min: number;
    max: number;
    relativeToPlayer?: number;   // +-N уровней от игрока (если задано)
  };
  
  // Типы поведения
  behavior: {
    defaultDisposition: number;  // Базовое отношение
    agroRadius?: number;         // Радиус агрессии (метры)
    patrolRadius?: number;       // Радиус патрулирования
  };
  
  // Система лута
  loot: {
    dropRate: number;            // Базовый шанс дропа (0-1)
    dropFromEquipment: boolean;  // Дропать экипировку
    dropFromQuickSlots: boolean; // Дропать расходники
    bonusItems?: string[];       // Дополнительный лут
  };
  
  // Монстры (если есть)
  monsters?: {
    types: string[];             // ['wolf', 'tiger', 'bear']
    spawnRate: number;           // Шанс спавна при входе (0-1)
    levelVariance: number;       // Разброс уровней +-N
    aggressionOverride?: number; // Переопределение агрессии
  };
}

export interface SpeciesWeight {
  type: SpeciesType;
  weight: number;                // Вероятность (сумма всех = 100)
}

export interface RoleWeight {
  type: 'sect' | 'profession' | 'social' | 'combat';
  weight: number;                // Вероятность (сумма всех = 100)
}

// ==================== PRESETS ====================

/**
 * Предустановленные конфигурации локаций
 */
export const LOCATION_NPC_PRESETS: Record<string, LocationNPCConfig> = {
  // Деревня / Маленькое поселение
  village: {
    id: 'village',
    name: 'Деревня',
    description: 'Мирное поселение с базовой инфраструктурой',
    population: { min: 5, max: 15, density: 10 },
    allowedSpecies: [
      { type: 'humanoid', weight: 90 },
      { type: 'beast', weight: 5 },
      { type: 'spirit', weight: 5 },
    ],
    allowedRoles: [
      { type: 'profession', weight: 40 },
      { type: 'social', weight: 30 },
      { type: 'sect', weight: 20 },
      { type: 'combat', weight: 10 },
    ],
    levelRange: { min: 1, max: 3 },
    behavior: {
      defaultDisposition: 50,
      patrolRadius: 50,
    },
    loot: {
      dropRate: 0.1,
      dropFromEquipment: false,
      dropFromQuickSlots: true,
      bonusItems: ['spirit_stone_small', 'common_herb'],
    },
  },
  
  // Город
  city: {
    id: 'city',
    name: 'Город',
    description: 'Крупный населённый пункт с рынком и управлением',
    population: { min: 20, max: 50, density: 20 },
    allowedSpecies: [
      { type: 'humanoid', weight: 85 },
      { type: 'spirit', weight: 10 },
      { type: 'hybrid', weight: 5 },
    ],
    allowedRoles: [
      { type: 'profession', weight: 35 },
      { type: 'sect', weight: 25 },
      { type: 'social', weight: 25 },
      { type: 'combat', weight: 15 },
    ],
    levelRange: { min: 1, max: 5 },
    behavior: {
      defaultDisposition: 40,
      patrolRadius: 100,
    },
    loot: {
      dropRate: 0.05,
      dropFromEquipment: false,
      dropFromQuickSlots: true,
      bonusItems: ['spirit_stone_medium', 'rare_material'],
    },
  },
  
  // Секта
  sect: {
    id: 'sect',
    name: 'Секта',
    description: 'Обитель культиваторов с иерархией',
    population: { min: 30, max: 80, density: 15 },
    allowedSpecies: [
      { type: 'humanoid', weight: 95 },
      { type: 'spirit', weight: 5 },
    ],
    allowedRoles: [
      { type: 'sect', weight: 80 },
      { type: 'profession', weight: 15 },
      { type: 'combat', weight: 5 },
    ],
    levelRange: { min: 1, max: 8 },
    behavior: {
      defaultDisposition: 30,
      patrolRadius: 200,
    },
    loot: {
      dropRate: 0.02,
      dropFromEquipment: false,
      dropFromQuickSlots: false,
      bonusItems: [],
    },
  },
  
  // Дикая местность
  wilderness: {
    id: 'wilderness',
    name: 'Дикая местность',
    description: 'Опасная территория с монстрами',
    population: { min: 3, max: 10, density: 2 },
    allowedSpecies: [
      { type: 'beast', weight: 70 },
      { type: 'humanoid', weight: 20 },
      { type: 'aberration', weight: 10 },
    ],
    allowedRoles: [
      { type: 'combat', weight: 80 },
      { type: 'social', weight: 20 },
    ],
    levelRange: { min: 2, max: 7, relativeToPlayer: 2 },
    behavior: {
      defaultDisposition: -30,
      agroRadius: 30,
      patrolRadius: 100,
    },
    loot: {
      dropRate: 0.3,
      dropFromEquipment: true,
      dropFromQuickSlots: true,
      bonusItems: ['beast_core', 'rare_material', 'spirit_stone_medium'],
    },
    monsters: {
      types: ['wolf', 'tiger', 'bear', 'snake'],
      spawnRate: 0.8,
      levelVariance: 2,
      aggressionOverride: 90,
    },
  },
  
  // Подземелье
  dungeon: {
    id: 'dungeon',
    name: 'Подземелье',
    description: 'Опасная зона с ценным лутом',
    population: { min: 5, max: 15, density: 5 },
    allowedSpecies: [
      { type: 'aberration', weight: 40 },
      { type: 'beast', weight: 35 },
      { type: 'spirit', weight: 25 },
    ],
    allowedRoles: [
      { type: 'combat', weight: 90 },
      { type: 'social', weight: 10 },
    ],
    levelRange: { min: 3, max: 9, relativeToPlayer: 3 },
    behavior: {
      defaultDisposition: -50,
      agroRadius: 50,
      patrolRadius: 30,
    },
    loot: {
      dropRate: 0.5,
      dropFromEquipment: true,
      dropFromQuickSlots: true,
      bonusItems: ['rare_weapon', 'legendary_material', 'spirit_stone_large'],
    },
  },
  
  // Рынок
  market: {
    id: 'market',
    name: 'Рынок',
    description: 'Торговая площадь',
    population: { min: 15, max: 40, density: 30 },
    allowedSpecies: [
      { type: 'humanoid', weight: 80 },
      { type: 'spirit', weight: 15 },
      { type: 'beast', weight: 5 },
    ],
    allowedRoles: [
      { type: 'profession', weight: 60 },
      { type: 'social', weight: 30 },
      { type: 'sect', weight: 10 },
    ],
    levelRange: { min: 1, max: 6 },
    behavior: {
      defaultDisposition: 60,
      patrolRadius: 50,
    },
    loot: {
      dropRate: 0.01,
      dropFromEquipment: false,
      dropFromQuickSlots: false,
      bonusItems: [],
    },
  },
  
  // Тренировочный полигон (для боевого тестирования)
  training_ground: {
    id: 'training_ground',
    name: 'Тренировочный полигон',
    description: 'Арена для боевых тренировок и испытаний',
    population: { min: 3, max: 6, density: 5 },
    allowedSpecies: [
      { type: 'beast', weight: 60 },
      { type: 'humanoid', weight: 30 },
      { type: 'aberration', weight: 10 },
    ],
    allowedRoles: [
      { type: 'combat', weight: 100 },
    ],
    levelRange: { min: 1, max: 9, relativeToPlayer: 2 },
    behavior: {
      defaultDisposition: -50,
      agroRadius: 50,
      patrolRadius: 30,
    },
    loot: {
      dropRate: 0.5,
      dropFromEquipment: true,
      dropFromQuickSlots: true,
      bonusItems: ['spirit_stone_medium', 'training_core'],
    },
    monsters: {
      types: ['wolf', 'tiger', 'bear', 'snake'],
      spawnRate: 0.9,
      levelVariance: 2,
      aggressionOverride: 90,
    },
  },
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Проверка, является ли ID временным
 */
export function isTempNPCId(id: string): boolean {
  return id.startsWith('TEMP_');
}

/**
 * Проверка, является ли ID временного предмета
 */
export function isTempItemId(id: string): boolean {
  return id.startsWith('TEMP_ITEM_');
}

/**
 * Генерация ID для временного NPC
 */
export function generateTempNPCId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `TEMP_${timestamp}_${random}`;
}

/**
 * Генерация ID для временного предмета
 */
export function generateTempItemId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `TEMP_ITEM_${timestamp}_${random}`;
}

/**
 * Конвертация TempNPC в формат для клиента (без лишних данных)
 */
export function tempNPCToClient(npc: TempNPC): TempNPCClaintView {
  return {
    id: npc.id,
    isPreset: false,
    isTemporary: true,
    name: npc.name,
    speciesId: npc.speciesId,
    roleId: npc.roleId,
    gender: npc.gender,
    level: npc.cultivation.level,
    subLevel: npc.cultivation.subLevel,
    disposition: npc.personality.disposition,
    aggressionLevel: npc.personality.aggressionLevel,
    canTalk: npc.personality.canTalk,
    canTrade: npc.personality.canTrade,
    health: npc.bodyState.health,
    isDead: npc.bodyState.isDead,
    traits: npc.personality.traits,
    stats: npc.stats,
    cultivation: {
      level: npc.cultivation.level,
      subLevel: npc.cultivation.subLevel,
      coreCapacity: npc.cultivation.coreCapacity,
      currentQi: npc.cultivation.currentQi,
      qiDensity: npc.cultivation.qiDensity,
    },
    locationId: npc.locationId,
    techniques: npc.techniques,
    equipment: npc.equipment,
  };
}

/**
 * Сокращённый вид NPC для клиента
 */
export interface TempNPCClaintView {
  id: string;
  isPreset?: false;  // Временный NPC
  isTemporary?: true; // Явно указываем что временный
  name: string;
  speciesId: string;
  roleId: string;
  gender: 'male' | 'female' | 'none';
  level: number;
  subLevel: number;
  disposition: number;
  aggressionLevel: number;
  canTalk: boolean;
  canTrade: boolean;
  health: number;
  isDead: boolean;
  traits?: string[];
  stats: TempNPCStats;
  cultivation: {
    level: number;
    subLevel: number;
    coreCapacity: number;
    currentQi: number;
    qiDensity: number;
  };
  locationId?: string;
  techniques?: string[];
  equipment?: TempEquipment;
}
