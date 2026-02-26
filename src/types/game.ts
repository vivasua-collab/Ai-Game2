/**
 * Общие типы игры
 * Единый источник типов для фронтенда и бэкенда
 */

import type { SessionId, CharacterId, LocationId, MessageId, SectId } from './branded';

// ==================== ПЕРСОНАЖ ====================

export interface Character {
  id: CharacterId;
  name: string;
  age: number;
  
  // Культивация
  cultivationLevel: number;      // Основной уровень (1-9)
  cultivationSubLevel: number;   // Под-уровень (0-9)
  
  // Ядро и Ци
  coreCapacity: number;          // Ёмкость ядра (ед)
  coreQuality: number;           // Качество ядра
  currentQi: number;             // Текущее количество Ци
  accumulatedQi: number;         // Накопленная для прорыва Ци
  
  // Характеристики
  strength: number;
  agility: number;
  intelligence: number;
  conductivity: number;          // Проводимость меридиан (ед/сек)
  
  // Физиология
  health: number;                // Здоровье (%)
  fatigue: number;               // Физическая усталость (%)
  mentalFatigue: number;         // Ментальная усталость (%)
  
  // Память и система
  hasAmnesia: boolean;
  knowsAboutSystem: boolean;
  
  // Принадлежность
  sectRole: string | null;
  currentLocationId?: LocationId;
  currentLocation?: Location;
  sectId?: SectId;
  sect?: Sect;
  
  // Навыки культивации (JSON)
  cultivationSkills?: Record<string, number>;
  
  // Понимание Ци (система прозрения)
  qiUnderstanding?: number;
  qiUnderstandingCap?: number;
  
  // Множители
  fatigueRecoveryMultiplier?: number;
  
  // Ресурсы
  contributionPoints?: number;
  spiritStones?: number;
  
  // Навыки
  skills?: Record<string, number>;
}

// ==================== ЛОКАЦИЯ ====================

export interface Location {
  id: LocationId;
  name: string;
  distanceFromCenter: number;
  qiDensity: number;
  terrainType: string;
  // Новые поля для системы карты
  locationType?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  z?: number;
  qiFlowRate?: number;
  description?: string;
}

// ==================== СЕКТА ====================

export interface Sect {
  id: SectId;
  name: string;
  description?: string;
  powerLevel: number;
}

// ==================== ВРЕМЯ МИРА ====================

export interface WorldTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  formatted: string;
  season: string;
}

// ==================== СООБЩЕНИЯ ====================

export interface Message {
  id: MessageId;
  type: string;
  sender: string | null;
  content: string;
  createdAt: string;
}

// ==================== ИГРОВОЕ СОСТОЯНИЕ ====================

export interface GameState {
  sessionId: SessionId | null;
  isLoading: boolean;
  error: string | null;
  character: Character | null;
  worldTime: WorldTime | null;
  location: Location | null;
  messages: Message[];
  isPaused: boolean;
  daysSinceStart: number;
  // Новые поля
  inventory: InventoryItem[];
  techniques: CharacterTechnique[];
  skills: CharacterSkill[];
}

// ==================== ТИПЫ ДЕЙСТВИЙ ====================

export type GameActionType = 
  | 'message'           // Обычное сообщение/действие
  | 'meditation'        // Медитация
  | 'breakthrough'      // Попытка прорыва
  | 'combat'            // Бой
  | 'travel'            // Путешествие
  | 'status'            // Запрос статуса
  | 'techniques'        // Запрос техник
  | 'inventory'         // Запрос инвентаря
  | 'location'          // Запрос локации
  | 'world_restart';    // Перезапуск мира

export interface GameAction {
  type: GameActionType;
  payload?: Record<string, unknown>;
}

// ==================== ОТВЕТ СЕРВЕРА ====================

export interface ServerResponse {
  success: boolean;
  error?: string;
  response: {
    type: string;
    content: string;
    
    // Обновлённое состояние персонажа (сервер - источник истины!)
    characterState?: Partial<Character>;
    
    // Обновление времени
    timeAdvance?: {
      minutes?: number;
      hours?: number;
      days?: number;
    };
    
    // Специальные флаги
    requiresRestart?: boolean;
    interruption?: {
      event: unknown;
      options: unknown[];
    };
  };
  updatedTime?: WorldTime & { daysSinceStart: number };
}

// ==================== ТИПЫ ДЛЯ РАСЧЁТОВ ====================

export interface BreakthroughRequirements {
  requiredFills: number;      // Сколько заполнений нужно
  currentFills: number;       // Сколько уже накоплено
  fillsNeeded: number;        // Сколько ещё осталось
  requiredQi: number;         // Сколько Ци нужно
  currentAccumulated: number; // Сколько накоплено
  canAttempt: boolean;
}

export interface BreakthroughResult {
  success: boolean;
  newLevel: number;
  newSubLevel: number;
  newCoreCapacity: number;
  qiConsumed: number;
  fatigueGained: { physical: number; mental: number };
  message: string;
}

export interface MeditationResult {
  success: boolean;
  qiGained: number;
  accumulatedQiGained: number;
  coreWasFilled: boolean;
  duration: number;
  wasInterrupted: boolean;
  interruptionReason?: string;
  fatigueGained: {
    physical: number;
    mental: number;
  };
  breakdown?: {
    coreGeneration: number;
    environmentalAbsorption: number;
  };
}

export interface QiRates {
  coreGeneration: number;       // Ци/секунду от ядра
  environmentalAbsorption: number; // Ци/секунду из среды
  total: number;                // Суммарно
}

// ==================== ИНВЕНТАРЬ ====================

export interface InventoryItem {
  id: string;
  name: string;
  nameId?: string;
  description?: string;
  type: "material" | "artifact" | "consumable" | "equipment" | "spirit_stone";
  rarity?: "common" | "uncommon" | "rare" | "legendary";
  icon?: string;
  quantity: number;
  isConsumable: boolean;
  useAction?: string;
  durability?: number;
  maxDurability?: number;
  qiCharge?: number;
  maxQiCharge?: number;
  effects?: Record<string, number>;
  properties?: Record<string, unknown>;
}

// ==================== ТЕХНИКИ ====================

/**
 * Флаги использования техник
 */
export type TechniqueUsageFlag = 
  | 'cultivation'  // Техника культивации - используется через слот при медитации
  | 'formation'    // Формация - можно использовать из меню
  | 'combat'       // Боевая техника - используется через слоты быстрого доступа
  | 'support'      // Поддержка - боевая слот
  | 'movement'     // Перемещение - боевой слот
  | 'sensory'      // Восприятие - боевой слот
  | 'healing';     // Исцеление - боевой слот

/**
 * Категория техники для UI
 */
export type TechniqueUICategory = 'cultivation' | 'formations' | 'combat';

/**
 * Определяет категорию UI для типа техники
 */
export function getTechniqueUICategory(type: string): TechniqueUICategory {
  if (type === 'cultivation') return 'cultivation';
  if (type === 'formation') return 'formations';
  return 'combat'; // combat, support, movement, sensory, healing
}

/**
 * Проверяет, можно ли использовать технику из меню
 * (только формации можно использовать напрямую)
 */
export function canUseTechniqueFromMenu(type: string): boolean {
  return type === 'formation';
}

/**
 * Проверяет, можно ли назначить технику в слот
 */
export function canAssignTechniqueToSlot(type: string): boolean {
  return type === 'cultivation' || 
         type === 'combat' || 
         type === 'support' || 
         type === 'movement' || 
         type === 'sensory' || 
         type === 'healing';
}

/**
 * Возвращает тип слота для техники
 */
export function getTechniqueSlotType(type: string): 'cultivation' | 'combat' | null {
  if (type === 'cultivation') return 'cultivation';
  if (['combat', 'support', 'movement', 'sensory', 'healing'].includes(type)) return 'combat';
  return null;
}

export interface Technique {
  id: string;
  name: string;
  description: string;
  type: "combat" | "cultivation" | "support" | "movement" | "sensory" | "healing" | "formation";
  element: "fire" | "water" | "earth" | "air" | "lightning" | "void" | "neutral";
  rarity: "common" | "uncommon" | "rare" | "legendary";
  level: number;
  minLevel: number;
  maxLevel: number;
  qiCost: number;
  fatigueCost: { physical: number; mental: number };
  minCultivationLevel: number;
  effects?: {
    damage?: number;
    healing?: number;
    qiRegen?: number;
    qiRegenPercent?: number;  // Процент к поглощению Ци (для техник культивации)
    unnoticeability?: number; // Процент снижения шанса прерывания
    castSpeed?: number;       // Скорость каста
    duration?: number;
    distance?: number;
    statModifiers?: Record<string, number>;
    // Для боевых техник
    isContact?: boolean;      // Контактная техника (требует близкого расстояния)
  };
}

export interface CharacterTechnique {
  id: string;
  techniqueId: string;
  technique: Technique;
  mastery: number;         // 0-100%
  quickSlot: number | null; // 0 = культивация, 1-12 = боевой слот, null = не назначен
  learningProgress: number; // 0-100%
  learningSource: string;
}

// ==================== СЛОТЫ ТЕХНИК ====================

/**
 * Базовое количество боевых слотов
 * Уровень 1 = 3 слота
 * Уровень 2 = 4 слота
 * Уровень N = 3 + (N-1) слотов
 */
export const BASE_COMBAT_SLOTS = 3;

/**
 * Возвращает количество боевых слотов для уровня культивации
 * Уровень 1 = 3 слота, Уровень 2 = 4 слота и т.д.
 */
export function getCombatSlotsCount(cultivationLevel: number): number {
  return BASE_COMBAT_SLOTS + Math.max(0, cultivationLevel - 1);
}

/**
 * Создаёт структуру слотов техник
 */
export function createTechniqueSlots(cultivationLevel: number): TechniqueSlots {
  const combatSlotCount = getCombatSlotsCount(cultivationLevel);
  return {
    cultivationSlot: null,
    combatSlots: Array(combatSlotCount).fill(null),
  };
}

/**
 * Слоты для быстрых техник
 */
export interface TechniqueSlots {
  cultivationSlot: string | null;     // ID техники культивации
  combatSlots: (string | null)[];     // Динамические боевые слоты
}

// ==================== НАВЫКИ КУЛЬТИВАЦИИ ====================

export interface CultivationSkillData {
  id: string;
  name: string;
  nameRu?: string;
  description: string;
  maxLevel: number;
  effects: {
    qiAbsorptionBonus?: number;
    meditationSpeedBonus?: number;
    interruptionModifier?: number;
    fatigueReliefBonus?: number;
    dangerDetectionRange?: number;
  };
  prerequisites?: {
    cultivationLevel?: number;
    skills?: string[];
  };
}

export interface CharacterSkill {
  skillId: string;
  level: number;
  skill?: CultivationSkillData;
}
