/**
 * ============================================================================
 * ПРЕДУСТАНОВЛЕННЫЕ NPC (PRESET NPC)
 * ============================================================================
 * 
 * Уникальные персонажи с фиксированной историей, квестами и характеристиками.
 * Сохраняются в базе данных и загружаются при инициализации сессии.
 */

import type { SpeciesType } from '@/data/presets';

// ==================== PRESET NPC ====================

/**
 * Предустановленный NPC — уникальный персонаж мира
 */
export interface PresetNPC {
  // === Идентификация ===
  id: string;                      // NPC_PRESET_XXXXX
  isPreset: true;
  
  // === Базовые данные ===
  name: string;                    // "Мастер Фэн"
  title?: string;                  // "Старейшина Секты Небесного Меча"
  nameEn?: string;                 // "Master Feng"
  age: number;
  gender: 'male' | 'female' | 'none';
  
  // === Биография ===
  backstory: string;
  personality: PresetPersonality;
  
  // === Вид и роль ===
  speciesId: string;               // human, elf, etc.
  speciesType: SpeciesType;
  roleId: string;                  // elder, merchant, etc.
  
  // === Характеристики ===
  stats: PresetNPCStats;
  
  // === Культивация ===
  cultivation: PresetCultivation;
  
  // === Принадлежность ===
  sectId?: string;
  sectRole?: SectRole;
  factionId?: string;
  nationId?: string;
  
  // === Техники ===
  techniques: string[];            // ID техник из пресетов/генератора
  
  // === Экипировка ===
  equipment: PresetEquipment;
  
  // === Инвентарь ===
  inventory?: PresetInventoryItem[];
  
  // === Ресурсы ===
  resources: PresetResources;
  
  // === Квесты ===
  quests?: QuestReference[];
  
  // === Отношения ===
  relations: PresetRelations;
  
  // === Мета-информация ===
  category: PresetNPCCategory;
  rarity: PresetNPCRarity;
  importance: NPCImportance;
  tags: string[];
  
  // === Генерация ===
  generatedAt?: string;
  generatorVersion?: string;
}

// ==================== ТИПЫ ====================

export type SectRole = 
  | 'candidate'        // Кандидат
  | 'outer_disciple'   // Внешний ученик
  | 'inner_disciple'   // Внутренний ученик
  | 'core_member'      // Ключевой ученик
  | 'elder'            // Старейшина
  | 'sect_master'      // Мастер секты
  | 'instructor'       // Инструктор
  | 'alchemist'        // Алхимик секты
  | 'guard'            // Страж
  | 'servant';         // Слуга

export type PresetNPCCategory =
  | 'story'            // Сюжетный персонаж
  | 'sect_elder'       // Старейшина секты
  | 'merchant'         // Торговец
  | 'quest_giver'      // Квестодатель
  | 'instructor'       // Учитель
  | 'antagonist'       // Антагонист
  | 'ally';            // Союзник

export type PresetNPCRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export type NPCImportance = 'minor' | 'normal' | 'important' | 'critical';

// ==================== СТРУКТУРЫ ====================

export interface PresetNPCStats {
  strength: number;
  agility: number;
  intelligence: number;
  conductivity: number;
  vitality?: number;
}

export interface PresetCultivation {
  level: number;           // 1-9
  subLevel: number;        // 0-9
  coreCapacity: number;
  currentQi: number;
  coreQuality?: number;
  baseVolume?: number;
  qiDensity?: number;
  meridianConductivity?: number;
}

export interface PresetPersonality {
  traits: string[];
  motivation: string;
  dominantEmotion: string;
  speechStyle?: string;
  quirks?: string[];
}

export interface PresetEquipment {
  weapon?: string;         // ID предмета
  armor?: string;
  helmet?: string;
  boots?: string;
  gloves?: string;
  accessory1?: string;
  accessory2?: string;
  
  // Одеяние секты
  sectAttire?: boolean;
}

export interface PresetInventoryItem {
  id: string;
  quantity: number;
}

export interface PresetResources {
  spiritStones: number;
  contributionPoints: number;
}

export interface QuestReference {
  questId: string;
  role: 'giver' | 'target' | 'rewarder';
  condition?: string;      // Условие доступности квеста
}

export interface PresetRelations {
  // Личные отношения к другим сущностям
  characters?: Record<string, number>;   // { characterId: disposition }
  npcs?: Record<string, number>;         // { npcId: disposition }
  sects?: Record<string, number>;        // { sectId: disposition }
  factions?: Record<string, number>;     // { factionId: disposition }
  
  // Базовое отношение к игроку
  defaultPlayerDisposition?: number;
}

// ==================== УТИЛИТЫ ====================

const PRESET_NPC_PREFIX = 'NPC_PRESET_';

/**
 * Проверка, является ли ID пресетом NPC
 */
export function isPresetNPCId(id: string): boolean {
  return id.startsWith(PRESET_NPC_PREFIX);
}

/**
 * Генерация ID для preset NPC
 */
export function generatePresetNPCId(counter: number): string {
  return `${PRESET_NPC_PREFIX}${counter.toString().padStart(5, '0')}`;
}

/**
 * Парсинг ID preset NPC
 */
export function parsePresetNPCId(id: string): { prefix: string; counter: number } | null {
  if (!isPresetNPCId(id)) return null;
  
  const counter = parseInt(id.replace(PRESET_NPC_PREFIX, ''), 10);
  return { prefix: PRESET_NPC_PREFIX, counter };
}

/**
 * Конвертация PresetNPC в данные для БД (Prisma NPC model)
 */
export function presetNPCToDBData(preset: PresetNPC, sessionId: string, locationId: string) {
  return {
    sessionId,
    isPreset: true,
    presetId: preset.id,
    name: preset.name,
    title: preset.title,
    age: preset.age,
    backstory: preset.backstory,
    cultivationLevel: preset.cultivation.level,
    cultivationSubLevel: preset.cultivation.subLevel,
    coreCapacity: preset.cultivation.coreCapacity,
    currentQi: preset.cultivation.currentQi,
    strength: preset.stats.strength,
    agility: preset.stats.agility,
    intelligence: preset.stats.intelligence,
    conductivity: preset.stats.conductivity,
    personality: JSON.stringify(preset.personality),
    motivation: preset.personality.motivation,
    disposition: preset.relations.defaultPlayerDisposition ?? 0,
    relations: JSON.stringify(preset.relations),
    // sectId не указываем как FK - секты из пресетов не существуют в БД
    // Секту нужно создавать отдельно или привязывать после создания
    sectId: null,
    role: preset.sectRole || null,
    factionId: preset.factionId || null,
    equipment: JSON.stringify(preset.equipment),
    techniques: JSON.stringify(preset.techniques),
    locationId,
  };
}

/**
 * Конвертация PresetNPC в формат для клиента
 */
export function presetNPCToClient(preset: PresetNPC): PresetNPCClientView {
  return {
    id: preset.id,
    isPreset: true,
    name: preset.name,
    title: preset.title,
    age: preset.age,
    gender: preset.gender,
    speciesId: preset.speciesId,
    roleId: preset.roleId,
    
    stats: preset.stats,
    cultivation: {
      level: preset.cultivation.level,
      subLevel: preset.cultivation.subLevel,
      coreCapacity: preset.cultivation.coreCapacity,
      currentQi: preset.cultivation.currentQi,
    },
    
    personality: {
      traits: preset.personality.traits,
      motivation: preset.personality.motivation,
    },
    
    sectId: preset.sectId,
    sectRole: preset.sectRole,
    
    equipment: preset.equipment,
    techniques: preset.techniques,
    
    importance: preset.importance,
    tags: preset.tags,
  };
}

/**
 * Сокращённый вид для клиента
 */
export interface PresetNPCClientView {
  id: string;
  isPreset: true;
  name: string;
  title?: string;
  age: number;
  gender: 'male' | 'female' | 'none';
  speciesId: string;
  roleId: string;
  
  stats: PresetNPCStats;
  cultivation: {
    level: number;
    subLevel: number;
    coreCapacity: number;
    currentQi: number;
  };
  
  personality: {
    traits: string[];
    motivation: string;
  };
  
  sectId?: string;
  sectRole?: string;
  
  equipment: PresetEquipment;
  techniques: string[];
  
  importance: NPCImportance;
  tags: string[];
}

// ==================== СПИСОК ДОСТУПНЫХ КАТЕГОРИЙ ====================

export const PRESET_NPC_CATEGORIES: Record<PresetNPCCategory, { name: string; description: string }> = {
  story: { name: 'Сюжетный персонаж', description: 'Ключевой персонаж сюжета' },
  sect_elder: { name: 'Старейшина секты', description: 'Руководитель секты' },
  merchant: { name: 'Торговец', description: 'Уникальный торговец' },
  quest_giver: { name: 'Квестодатель', description: 'Персонаж с квестами' },
  instructor: { name: 'Учитель', description: 'Обучает техникам' },
  antagonist: { name: 'Антагонист', description: 'Противник игрока' },
  ally: { name: 'Союзник', description: 'Помощник игрока' },
};

export const NPC_IMPORTANCE_INFO: Record<NPCImportance, { name: string; color: string }> = {
  minor: { name: 'Малозначимый', color: 'gray' },
  normal: { name: 'Обычный', color: 'white' },
  important: { name: 'Важный', color: 'yellow' },
  critical: { name: 'Критический', color: 'red' },
};
