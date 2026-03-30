/**
 * ============================================================================
 * WORLD STATE - Глобальное состояние мира
 * ============================================================================
 * 
 * Определяет структуру данных мира для серверной обработки.
 * Используется в:
 * - TruthSystem для хранения глобального состояния
 * - WebSocket для синхронизации с клиентом
 * - NPCAIManager для обновления NPC
 * 
 * @see docs/NPC_AI_THEORY.md
 */

import type { NPCState } from './npc-state';

// ==================== ВРЕМЯ МИРА ====================

/**
 * Состояние времени в мире
 */
export interface WorldTimeState {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  tickCount: number;
  lastTickTime: number;
}

/**
 * Создать начальное состояние времени
 */
export function createInitialWorldTime(): WorldTimeState {
  return {
    year: 1864, // Э.С.М. (Эпоха Смертных Миров)
    month: 1,
    day: 1,
    hour: 6,
    minute: 0,
    season: 'spring',
    tickCount: 0,
    lastTickTime: Date.now(),
  };
}

// ==================== СОБЫТИЯ МИРА ====================

/**
 * Типы событий в мире
 */
export type WorldEventType =
  | 'npc:spawn'
  | 'npc:despawn'
  | 'npc:death'
  | 'npc:action'
  | 'combat:start'
  | 'combat:end'
  | 'player:enter'
  | 'player:leave'
  | 'item:drop'
  | 'item:pickup';

/**
 * Событие в мире
 */
export interface WorldEvent {
  id: string;
  type: WorldEventType;
  timestamp: number;
  locationId: string;
  data: Record<string, unknown>;
}

/**
 * Создать событие мира
 */
export function createWorldEvent(
  type: WorldEventType,
  locationId: string,
  data: Record<string, unknown>
): WorldEvent {
  return {
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: Date.now(),
    locationId,
    data,
  };
}

// ==================== СОСТОЯНИЕ ЛОКАЦИИ ====================

/**
 * Состояние локации
 */
export interface LocationState {
  id: string;
  name: string;
  type: 'village' | 'city' | 'forest' | 'mountain' | 'dungeon' | 'sect';
  
  // NPC в локации
  npcIds: string[];
  
  // Игроки в локации
  playerIds: string[];
  
  // Активные события
  activeEvents: string[];
  
  // Метаданные
  lastActivityTime: number;
}

// ==================== СОСТОЯНИЕ ИГРОКА ====================

/**
 * Минимальное состояние игрока для AI
 */
export interface PlayerWorldState {
  id: string;
  sessionId: string;
  locationId: string;
  x: number;
  y: number;
  level: number;
  
  // Для агрессии NPC
  lastAttackTime: number;
  threatLevel: number; // Насколько игрок опасен для NPC
  
  // Метаданные
  lastUpdate?: number;
}

// ==================== ГЛОБАЛЬНОЕ СОСТОЯНИЕ МИРА ====================

/**
 * Полное состояние мира
 * 
 * Хранит:
 * - Всех NPC
 * - Всех игроков
 * - Все локации
 * - Время
 * - События
 */
export interface WorldState {
  // === Время ===
  time: WorldTimeState;
  
  // === NPC ===
  npcs: Map<string, NPCState>;
  
  // === Игроки ===
  players: Map<string, PlayerWorldState>;
  
  // === Локации ===
  locations: Map<string, LocationState>;
  
  // === События (последние 1000) ===
  events: WorldEvent[];
  
  // === Метаданные ===
  lastUpdateTime: number;
  tickCount: number;
}

// ==================== ФАБРИКИ ====================

/**
 * Создать начальное состояние мира
 */
export function createInitialWorldState(): WorldState {
  return {
    time: createInitialWorldTime(),
    npcs: new Map(),
    players: new Map(),
    locations: new Map(),
    events: [],
    lastUpdateTime: Date.now(),
    tickCount: 0,
  };
}

/**
 * Создать состояние локации
 */
export function createLocationState(
  id: string,
  name: string,
  type: LocationState['type']
): LocationState {
  return {
    id,
    name,
    type,
    npcIds: [],
    playerIds: [],
    activeEvents: [],
    lastActivityTime: Date.now(),
  };
}

/**
 * Создать состояние игрока
 */
export function createPlayerWorldState(
  id: string,
  sessionId: string,
  locationId: string,
  x: number = 0,
  y: number = 0,
  level: number = 1
): PlayerWorldState {
  return {
    id,
    sessionId,
    locationId,
    x,
    y,
    level,
    lastAttackTime: 0,
    threatLevel: 0,
  };
}

// ==================== УТИЛИТЫ ====================

/**
 * Получить NPC в локации
 */
export function getNPCsInLocation(
  worldState: WorldState,
  locationId: string
): NPCState[] {
  const location = worldState.locations.get(locationId);
  if (!location) return [];
  
  return location.npcIds
    .map(id => worldState.npcs.get(id))
    .filter((npc): npc is NPCState => npc !== undefined);
}

/**
 * Получить игроков в локации
 */
export function getPlayersInLocation(
  worldState: WorldState,
  locationId: string
): PlayerWorldState[] {
  const location = worldState.locations.get(locationId);
  if (!location || !location.playerIds) return [];
  
  return location.playerIds
    .map(id => worldState.players.get(id))
    .filter((player): player is PlayerWorldState => player !== undefined);
}

/**
 * Добавить событие в мир (с лимитом 1000)
 */
export function addWorldEvent(
  worldState: WorldState,
  event: WorldEvent
): void {
  worldState.events.push(event);
  
  // Храним только последние 1000 событий
  if (worldState.events.length > 1000) {
    worldState.events.shift();
  }
}

/**
 * Очистить старые события (старше 1 часа)
 */
export function cleanupOldEvents(worldState: WorldState): number {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const initialLength = worldState.events.length;
  
  worldState.events = worldState.events.filter(e => e.timestamp > oneHourAgo);
  
  return initialLength - worldState.events.length;
}

/**
 * Сериализация WorldState для WebSocket
 */
export function serializeWorldState(worldState: WorldState): {
  time: WorldTimeState;
  npcs: NPCState[];
  players: PlayerWorldState[];
  locations: LocationState[];
  lastUpdateTime: number;
  tickCount: number;
} {
  return {
    time: worldState.time,
    npcs: Array.from(worldState.npcs.values()),
    players: Array.from(worldState.players.values()),
    locations: Array.from(worldState.locations.values()),
    lastUpdateTime: worldState.lastUpdateTime,
    tickCount: worldState.tickCount,
  };
}

/**
 * Десериализация WorldState из WebSocket
 */
export function deserializeWorldState(data: {
  time: WorldTimeState;
  npcs: NPCState[];
  players: PlayerWorldState[];
  locations: LocationState[];
  lastUpdateTime: number;
  tickCount: number;
}): WorldState {
  const worldState = createInitialWorldState();
  
  worldState.time = data.time;
  worldState.lastUpdateTime = data.lastUpdateTime;
  worldState.tickCount = data.tickCount;
  
  for (const npc of data.npcs) {
    worldState.npcs.set(npc.id, npc);
  }
  
  for (const player of data.players) {
    worldState.players.set(player.id, player);
  }
  
  for (const location of data.locations) {
    worldState.locations.set(location.id, location);
  }
  
  return worldState;
}
