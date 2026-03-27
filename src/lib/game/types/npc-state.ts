/**
 * ============================================================================
 * NPC STATE - Состояние NPC для серверного AI
 * ============================================================================
 * 
 * Определяет структуру данных NPC для серверной обработки.
 * Используется в:
 * - TruthSystem для хранения состояния NPC
 * - NPCAIManager для обновления AI
 * - WebSocket для синхронизации с клиентом
 * 
 * @see docs/NPC_AI_THEORY.md
 */

import type { SpinalSignal, SpinalAction } from '../ai/spinal/types';

// ==================== ТИПЫ ДЕЙСТВИЙ ====================

/**
 * Типы действий NPC
 */
export type NPCActionType = 
  | 'idle'           // Стоит на месте
  | 'patrol'         // Патрулирует
  | 'move'           // Движется к точке
  | 'chase'          // Преследует цель
  | 'attack'         // Атакует
  | 'flee'           // Бежит
  | 'dodge'          // Уклоняется
  | 'flinch'         // Вздрогнул от урона
  | 'talk'           // Разговаривает
  | 'trade'          // Торговля
  | 'meditate'       // Медитирует
  | 'dead';          // Мёртв

/**
 * Действие NPC
 */
export interface NPCAction {
  type: NPCActionType;
  target?: { x: number; y: number } | string; // Координаты или ID цели
  params?: Record<string, unknown>;
  startTime: number;
  duration: number;
  sourceReflex?: string; // Если действие от рефлекса
}

/**
 * Состояние Spinal AI для NPC
 */
export interface SpinalAIState {
  activeReflexes: string[];
  cooldowns: Record<string, number>;
  lastSignal: SpinalSignal | null;
  lastAction: SpinalAction | null;
}

// ==================== ОСНОВНОЙ ИНТЕРФЕЙС ====================

/**
 * Полное состояние NPC для серверного AI
 * 
 * Включает:
 * - Идентификацию
 * - Позицию
 * - Состояние здоровья/ци
 * - AI состояние
 * - Spinal AI состояние
 * - Агрессию и угрозы
 */
export interface NPCState {
  // === Идентификация ===
  id: string;
  name: string;
  speciesId: string;
  speciesType: string;
  roleId: string;
  soulType: string;
  controller: 'ai' | 'player';
  mind: string;
  
  // === Уровень культивации ===
  level: number;
  subLevel: number;
  
  // === Позиция ===
  locationId: string;
  x: number;
  y: number;
  z?: number;
  
  // === Направление ===
  facing: number; // Угол в градусах
  
  // === Состояние ===
  health: number;
  maxHealth: number;
  qi: number;
  maxQi: number;
  
  // === Личность ===
  disposition: number;      // -100 до 100
  aggressionLevel: number;  // 0-100
  fleeThreshold: number;    // % HP для бегства
  
  // === AI состояние ===
  isActive: boolean;        // NPC активен (игрок рядом)
  aiState: NPCActionType;   // Текущее состояние AI
  currentAction: NPCAction | null;
  actionQueue: NPCAction[];
  
  // === Spinal AI (серверная версия) ===
  spinalState: SpinalAIState;
  spinalPreset: string;     // 'monster' | 'guard' | 'passerby' | 'cultivator'
  
  // === Агрессия и угрозы ===
  threatLevel: number;      // 0-100
  targetId: string | null;
  lastActiveTime: number;   // Timestamp
  lastSeenPlayers: Record<string, number>; // playerId -> timestamp
  
  // === Коллизия ===
  collisionRadius: number;
  agroRadius: number;
  perceptionRadius: number;
  
  // === Бой ===
  attackRange?: number;       // Радиус атаки
  lastAttackTime?: number;    // Время последней атаки
  
  // === Движение ===
  chaseSpeed?: number;        // Скорость преследования (пикселей/тик)
  patrolSpeed?: number;       // Скорость патрулирования
  patrolRadius?: number;      // Радиус патрулирования
  
  // === Флаги ===
  isDead: boolean;
  isUnconscious: boolean;
  canTalk: boolean;
  canTrade: boolean;
}

// ==================== ФАБРИКИ ====================

/**
 * Создать начальное состояние NPC из TempNPC
 */
export function createNPCStateFromTempNPC(tempNPC: {
  id: string;
  name: string;
  speciesId: string;
  speciesType: string;
  roleId: string;
  soulType: string;
  controller: string;
  mind: string;
  cultivation: { level: number; subLevel: number };
  position?: { x: number; y: number };
  locationId: string;
  bodyState: { health: number; maxHealth: number };
  cultivation_qi?: { currentQi: number; maxQi?: number };
  personality?: {
    disposition: number;
    aggressionLevel: number;
    fleeThreshold: number;
    canTalk?: boolean;
    canTrade?: boolean;
  };
  collision?: { radius: number };
  interactionZones?: { agro: number; perception: number };
  aiConfig?: { agroRadius?: number };
}): NPCState {
  return {
    // Идентификация
    id: tempNPC.id,
    name: tempNPC.name,
    speciesId: tempNPC.speciesId,
    speciesType: tempNPC.speciesType,
    roleId: tempNPC.roleId,
    soulType: tempNPC.soulType,
    controller: tempNPC.controller as 'ai' | 'player',
    mind: tempNPC.mind,
    
    // Уровень
    level: tempNPC.cultivation.level,
    subLevel: tempNPC.cultivation.subLevel,
    
    // Позиция
    locationId: tempNPC.locationId,
    x: tempNPC.position?.x ?? 0,
    y: tempNPC.position?.y ?? 0,
    z: 0,
    facing: 0,
    
    // Состояние
    health: tempNPC.bodyState.health,
    maxHealth: tempNPC.bodyState.maxHealth,
    qi: tempNPC.cultivation_qi?.currentQi ?? 100,
    maxQi: tempNPC.cultivation_qi?.maxQi ?? 100,
    
    // Личность
    disposition: tempNPC.personality?.disposition ?? 0,
    aggressionLevel: tempNPC.personality?.aggressionLevel ?? 0,
    fleeThreshold: tempNPC.personality?.fleeThreshold ?? 20,
    
    // AI состояние
    isActive: false,
    aiState: 'idle',
    currentAction: null,
    actionQueue: [],
    
    // Spinal AI
    spinalState: {
      activeReflexes: [],
      cooldowns: {},
      lastSignal: null,
      lastAction: null,
    },
    spinalPreset: determineSpinalPreset(tempNPC.roleId, tempNPC.speciesType),
    
    // Агрессия
    threatLevel: 0,
    targetId: null,
    lastActiveTime: 0,
    lastSeenPlayers: {},
    
    // Коллизия
    collisionRadius: tempNPC.collision?.radius ?? 15,
    agroRadius: tempNPC.aiConfig?.agroRadius ?? tempNPC.interactionZones?.agro ?? 200,
    perceptionRadius: tempNPC.interactionZones?.perception ?? 300,
    
    // Флаги
    isDead: false,
    isUnconscious: false,
    canTalk: tempNPC.personality?.canTalk ?? true,
    canTrade: tempNPC.personality?.canTrade ?? false,
  };
}

/**
 * Определить пресет Spinal AI по роли и виду
 */
function determineSpinalPreset(roleId: string, speciesType: string): string {
  if (roleId.includes('guard') || roleId.includes('patrol')) return 'guard';
  if (roleId.includes('monster') || speciesType === 'beast') return 'monster';
  if (roleId.includes('cultivator') || roleId.includes('elder')) return 'cultivator';
  return 'passerby';
}

/**
 * Создать NPCState из PresetNPC (для preset NPC из БД)
 * 
 * ВАЖНО: Preset NPC должны быть добавлены в TruthSystem для AI!
 */
export function createNPCStateFromPresetNPC(params: {
  id: string;                    // ID из БД
  presetId?: string;             // ID пресета
  name: string;
  speciesId: string;
  speciesType: string;
  roleId: string;
  cultivation: { level: number; subLevel: number; currentQi?: number; coreCapacity?: number };
  position: { x: number; y: number };
  locationId: string;
  stats?: { strength?: number; agility?: number; intelligence?: number };
  personality?: { disposition?: number; aggressionLevel?: number };
}): NPCState {
  return {
    id: params.id,
    name: params.name,
    speciesId: params.speciesId || 'human',
    speciesType: params.speciesType || 'human',
    roleId: params.roleId || 'civilian',
    soulType: 'mortal',
    controller: 'ai',
    mind: 'full',
    
    level: params.cultivation?.level ?? 1,
    subLevel: params.cultivation?.subLevel ?? 0,
    
    locationId: params.locationId,
    x: params.position.x,
    y: params.position.y,
    z: 0,
    facing: 0,
    
    health: 100,
    maxHealth: 100,
    qi: params.cultivation?.currentQi ?? 100,
    maxQi: params.cultivation?.coreCapacity ?? 100,
    
    disposition: params.personality?.disposition ?? 0,
    aggressionLevel: params.personality?.aggressionLevel ?? 
      (params.roleId?.includes('guard') || params.roleId?.includes('monster') ? 60 : 10),
    fleeThreshold: 20,
    
    isActive: false,  // Активируется когда игрок рядом
    aiState: 'idle',
    currentAction: null,
    actionQueue: [],
    
    spinalState: {
      activeReflexes: [],
      cooldowns: {},
      lastSignal: null,
      lastAction: null,
    },
    spinalPreset: determineSpinalPreset(params.roleId, params.speciesType),
    
    threatLevel: 0,
    targetId: null,
    lastActiveTime: 0,
    lastSeenPlayers: {},
    
    collisionRadius: 15,
    agroRadius: 200,
    perceptionRadius: 300,
    
    isDead: false,
    isUnconscious: false,
    canTalk: true,
    canTrade: params.roleId?.includes('merchant') ?? false,
  };
}

/**
 * Создать пустое состояние NPC (для инициализации)
 */
export function createEmptyNPCState(id: string): NPCState {
  return {
    id,
    name: 'Unknown',
    speciesId: 'human',
    speciesType: 'human',
    roleId: 'civilian',
    soulType: 'mortal',
    controller: 'ai',
    mind: 'full',
    level: 1,
    subLevel: 1,
    locationId: '',
    x: 0,
    y: 0,
    z: 0,
    facing: 0,
    health: 100,
    maxHealth: 100,
    qi: 100,
    maxQi: 100,
    disposition: 0,
    aggressionLevel: 0,
    fleeThreshold: 20,
    isActive: false,
    aiState: 'idle',
    currentAction: null,
    actionQueue: [],
    spinalState: {
      activeReflexes: [],
      cooldowns: {},
      lastSignal: null,
      lastAction: null,
    },
    spinalPreset: 'passerby',
    threatLevel: 0,
    targetId: null,
    lastActiveTime: 0,
    lastSeenPlayers: {},
    collisionRadius: 15,
    agroRadius: 200,
    perceptionRadius: 300,
    isDead: false,
    isUnconscious: false,
    canTalk: true,
    canTrade: false,
  };
}
