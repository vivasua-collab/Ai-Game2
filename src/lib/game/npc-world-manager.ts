/**
 * ============================================================================
 * NPC WORLD MANAGER - Управление NPC в мире
 * ============================================================================
 * 
 * Расширение TruthSystem для работы с NPC.
 * Хранит состояние всех NPC в мире и управляет их жизненным циклом.
 * 
 * @see src/lib/game/truth-system.ts
 * @see src/lib/game/types/world-state.ts
 */

import type {
  NPCState,
  NPCAction,
  WorldState,
  WorldEvent,
  PlayerWorldState,
  LocationState,
} from './types';
import {
  createNPCStateFromTempNPC,
  createEmptyNPCState,
  createInitialWorldState,
  createLocationState,
  createPlayerWorldState,
  createWorldEvent,
  getNPCsInLocation,
  getPlayersInLocation,
  addWorldEvent,
} from './types';
import type { TempNPC } from '@/types/temp-npc';

// ==================== SINGLETON ====================

const globalForNPCWorld = globalThis as unknown as {
  npcWorldManager: NPCWorldManager | undefined;
};

// ==================== CLASS ====================

/**
 * NPCWorldManager - Управление состоянием NPC в мире
 * 
 * Интегрируется с TruthSystem для хранения NPC.
 * Предоставляет CRUD операции и поиск NPC.
 */
export class NPCWorldManager {
  private static instance: NPCWorldManager;

  // Глобальное состояние мира
  private worldState: WorldState;

  // Индексы для быстрого поиска
  private npcByLocation: Map<string, Set<string>> = new Map(); // locationId -> npcIds
  private playerByLocation: Map<string, Set<string>> = new Map(); // locationId -> playerIds

  private constructor() {
    this.worldState = createInitialWorldState();
  }

  static getInstance(): NPCWorldManager {
    if (!this.instance) {
      this.instance = new NPCWorldManager();
    }
    return this.instance;
  }

  // ==================== NPC CRUD ====================

  /**
   * Добавить NPC в мир
   */
  addNPC(npc: NPCState): void {
    this.worldState.npcs.set(npc.id, npc);
    
    // Обновляем индекс локации
    if (!this.npcByLocation.has(npc.locationId)) {
      this.npcByLocation.set(npc.locationId, new Set());
    }
    this.npcByLocation.get(npc.locationId)!.add(npc.id);
    
    // Обновляем локацию
    const location = this.worldState.locations.get(npc.locationId);
    if (location && !location.npcIds.includes(npc.id)) {
      location.npcIds.push(npc.id);
    }
    
    // Добавляем событие
    addWorldEvent(this.worldState, createWorldEvent('npc:spawn', npc.locationId, {
      npcId: npc.id,
      npcName: npc.name,
    }));
    
    console.log(`[NPCWorldManager] Added NPC: ${npc.name} (${npc.id}) to location ${npc.locationId}`);
  }

  /**
   * Добавить NPC из TempNPC
   */
  addNPCFromTemp(tempNPC: TempNPC): NPCState {
    const npcState = createNPCStateFromTempNPC({
      id: tempNPC.id,
      name: tempNPC.name,
      speciesId: tempNPC.speciesId,
      speciesType: tempNPC.speciesType,
      roleId: tempNPC.roleId,
      soulType: tempNPC.soulType,
      controller: tempNPC.controller,
      mind: tempNPC.mind,
      cultivation: tempNPC.cultivation,
      position: tempNPC.position,
      locationId: tempNPC.locationId,
      bodyState: tempNPC.bodyState,
      cultivation_qi: { currentQi: tempNPC.currentQi },
      personality: tempNPC.personality,
      collision: tempNPC.collision,
      interactionZones: tempNPC.interactionZones,
      aiConfig: tempNPC.aiConfig,
    });
    
    this.addNPC(npcState);
    return npcState;
  }

  /**
   * Получить NPC по ID
   */
  getNPC(npcId: string): NPCState | null {
    return this.worldState.npcs.get(npcId) || null;
  }

  /**
   * Обновить NPC
   */
  updateNPC(npcId: string, updates: Partial<NPCState>): NPCState | null {
    const npc = this.worldState.npcs.get(npcId);
    if (!npc) return null;
    
    // Проверяем смену локации
    if (updates.locationId && updates.locationId !== npc.locationId) {
      this.moveNPCToLocation(npc, updates.locationId);
    }
    
    // Применяем обновления
    Object.assign(npc, updates);
    
    return npc;
  }

  /**
   * Удалить NPC
   */
  removeNPC(npcId: string): NPCState | null {
    const npc = this.worldState.npcs.get(npcId);
    if (!npc) return null;
    
    // Удаляем из индекса локации
    const locationNPCs = this.npcByLocation.get(npc.locationId);
    if (locationNPCs) {
      locationNPCs.delete(npcId);
    }
    
    // Удаляем из локации
    const location = this.worldState.locations.get(npc.locationId);
    if (location) {
      location.npcIds = location.npcIds.filter(id => id !== npcId);
    }
    
    // Удаляем из мира
    this.worldState.npcs.delete(npcId);
    
    // Добавляем событие
    addWorldEvent(this.worldState, createWorldEvent('npc:despawn', npc.locationId, {
      npcId: npc.id,
      npcName: npc.name,
      reason: 'removed',
    }));
    
    console.log(`[NPCWorldManager] Removed NPC: ${npc.name} (${npcId})`);
    return npc;
  }

  /**
   * Получить всех NPC в локации
   */
  getNPCsInLocation(locationId: string): NPCState[] {
    return getNPCsInLocation(this.worldState, locationId);
  }

  /**
   * Получить всех активных NPC
   */
  getActiveNPCs(): NPCState[] {
    return Array.from(this.worldState.npcs.values()).filter(npc => npc.isActive);
  }

  /**
   * Получить NPC по цели
   */
  getNPCsTargeting(targetId: string): NPCState[] {
    return Array.from(this.worldState.npcs.values()).filter(
      npc => npc.targetId === targetId
    );
  }

  // ==================== PLAYER OPERATIONS ====================

  /**
   * Добавить игрока в мир
   */
  addPlayer(player: PlayerWorldState): void {
    this.worldState.players.set(player.id, player);
    
    // Обновляем индекс локации
    if (!this.playerByLocation.has(player.locationId)) {
      this.playerByLocation.set(player.locationId, new Set());
    }
    this.playerByLocation.get(player.locationId)!.add(player.id);
    
    // Обновляем локацию
    const location = this.worldState.locations.get(player.locationId);
    if (location && !location.playerIds.includes(player.id)) {
      location.playerIds.push(player.id);
    }
    
    // Добавляем событие
    addWorldEvent(this.worldState, createWorldEvent('player:enter', player.locationId, {
      playerId: player.id,
    }));
    
    console.log(`[NPCWorldManager] Added player: ${player.id} to location ${player.locationId}`);
  }

  /**
   * Получить игрока по ID
   */
  getPlayer(playerId: string): PlayerWorldState | null {
    return this.worldState.players.get(playerId) || null;
  }

  /**
   * Обновить позицию игрока
   */
  updatePlayerPosition(playerId: string, x: number, y: number): void {
    const player = this.worldState.players.get(playerId);
    if (player) {
      player.x = x;
      player.y = y;
    }
  }

  /**
   * Удалить игрока
   */
  removePlayer(playerId: string): void {
    const player = this.worldState.players.get(playerId);
    if (!player) return;
    
    // Удаляем из индекса локации
    const locationPlayers = this.playerByLocation.get(player.locationId);
    if (locationPlayers) {
      locationPlayers.delete(playerId);
    }
    
    // Удаляем из локации
    const location = this.worldState.locations.get(player.locationId);
    if (location) {
      location.playerIds = location.playerIds.filter(id => id !== playerId);
    }
    
    // Удаляем из мира
    this.worldState.players.delete(playerId);
    
    // Добавляем событие
    addWorldEvent(this.worldState, createWorldEvent('player:leave', player.locationId, {
      playerId: player.id,
    }));
    
    console.log(`[NPCWorldManager] Removed player: ${playerId}`);
  }

  /**
   * Получить игроков в локации
   */
  getPlayersInLocation(locationId: string): PlayerWorldState[] {
    return getPlayersInLocation(this.worldState, locationId);
  }

  // ==================== LOCATION OPERATIONS ====================

  /**
   * Добавить локацию
   */
  addLocation(location: LocationState): void {
    this.worldState.locations.set(location.id, location);
    console.log(`[NPCWorldManager] Added location: ${location.name} (${location.id})`);
  }

  /**
   * Получить локацию
   */
  getLocation(locationId: string): LocationState | null {
    return this.worldState.locations.get(locationId) || null;
  }

  /**
   * Переместить NPC в другую локацию
   */
  private moveNPCToLocation(npc: NPCState, newLocationId: string): void {
    const oldLocationId = npc.locationId;
    
    // Удаляем из старой локации
    const oldLocationNPCs = this.npcByLocation.get(oldLocationId);
    if (oldLocationNPCs) {
      oldLocationNPCs.delete(npc.id);
    }
    
    const oldLocation = this.worldState.locations.get(oldLocationId);
    if (oldLocation) {
      oldLocation.npcIds = oldLocation.npcIds.filter(id => id !== npc.id);
    }
    
    // Добавляем в новую локацию
    if (!this.npcByLocation.has(newLocationId)) {
      this.npcByLocation.set(newLocationId, new Set());
    }
    this.npcByLocation.get(newLocationId)!.add(npc.id);
    
    const newLocation = this.worldState.locations.get(newLocationId);
    if (newLocation && !newLocation.npcIds.includes(npc.id)) {
      newLocation.npcIds.push(npc.id);
    }
    
    npc.locationId = newLocationId;
    
    console.log(`[NPCWorldManager] Moved NPC ${npc.name} from ${oldLocationId} to ${newLocationId}`);
  }

  // ==================== WORLD STATE ====================

  /**
   * Получить всё состояние мира
   */
  getWorldState(): WorldState {
    return this.worldState;
  }

  /**
   * Обновить время мира
   */
  updateWorldTime(time: Partial<WorldState['time']>): void {
    Object.assign(this.worldState.time, time);
    this.worldState.lastUpdateTime = Date.now();
  }

  /**
   * Инкремент тика
   */
  incrementTick(): void {
    this.worldState.tickCount++;
    this.worldState.lastUpdateTime = Date.now();
  }

  /**
   * Получить последние события
   */
  getRecentEvents(count: number = 50): WorldEvent[] {
    return this.worldState.events.slice(-count);
  }

  // ==================== AI HELPERS ====================

  /**
   * Активировать NPC (игрок рядом)
   */
  activateNPC(npcId: string): void {
    const npc = this.worldState.npcs.get(npcId);
    if (npc) {
      npc.isActive = true;
      npc.lastActiveTime = Date.now();
    }
  }

  /**
   * Деактивировать NPC (игрок ушёл)
   */
  deactivateNPC(npcId: string): void {
    const npc = this.worldState.npcs.get(npcId);
    if (npc) {
      npc.isActive = false;
    }
  }

  /**
   * Установить действие NPC
   */
  setNPCAction(npcId: string, action: NPCAction | null): void {
    const npc = this.worldState.npcs.get(npcId);
    if (npc) {
      npc.currentAction = action;
      if (action) {
        npc.aiState = action.type;
      } else {
        npc.aiState = 'idle';
      }
    }
  }

  /**
   * Обновить угрозу NPC
   */
  updateNPCThreat(npcId: string, threatLevel: number, targetId: string | null): void {
    const npc = this.worldState.npcs.get(npcId);
    if (npc) {
      npc.threatLevel = Math.max(0, Math.min(100, threatLevel));
      npc.targetId = targetId;
    }
  }

  /**
   * Отметить игрока в зоне видимости NPC
   */
  markPlayerSeen(npcId: string, playerId: string): void {
    const npc = this.worldState.npcs.get(npcId);
    if (npc) {
      npc.lastSeenPlayers[playerId] = Date.now();
    }
  }

  // ==================== STATS ====================

  /**
   * Получить статистику
   */
  getStats(): {
    totalNPCs: number;
    activeNPCs: number;
    totalPlayers: number;
    totalLocations: number;
    tickCount: number;
  } {
    return {
      totalNPCs: this.worldState.npcs.size,
      activeNPCs: this.getActiveNPCs().length,
      totalPlayers: this.worldState.players.size,
      totalLocations: this.worldState.locations.size,
      tickCount: this.worldState.tickCount,
    };
  }
}

// ==================== EXPORT ====================

export function getNPCWorldManager(): NPCWorldManager {
  return NPCWorldManager.getInstance();
}

export const npcWorldManager = getNPCWorldManager();
