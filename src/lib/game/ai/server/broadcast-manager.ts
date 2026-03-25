/**
 * ============================================================================
 * BROADCAST MANAGER - Отправка действий NPC через WebSocket
 * ============================================================================
 * 
 * Управляет отправкой событий npc:action, npc:spawn, npc:despawn
 * через WebSocket сервер.
 * 
 * @see mini-services/game-ws/index.ts
 */

import type { NPCState, NPCAction } from '@/lib/game/types';

// ==================== ТИПЫ ====================

export interface BroadcastEvent {
  event: string;
  data: unknown;
  locationId: string;
  timestamp: number;
}

export interface NPCActionEvent {
  npcId: string;
  action: NPCAction;
  npcState?: Partial<NPCState>;
}

export interface NPCSpawnEvent {
  npc: NPCState;
}

export interface NPCDespawnEvent {
  npcId: string;
  reason?: string;
}

export interface CombatHitEvent {
  attackerId: string;
  targetId: string;
  damage: number;
  techniqueId?: string;
}

// ==================== КЛАСС ====================

/**
 * BroadcastManager - singleton для отправки событий WebSocket
 * 
 * Интегрируется с Socket.io сервером через setIO()
 */
export class BroadcastManager {
  private static instance: BroadcastManager;
  
  private io: any = null; // Socket.io Server
  private eventQueue: BroadcastEvent[] = [];
  private isBatching: boolean = false;
  
  private constructor() {}
  
  static getInstance(): BroadcastManager {
    if (!this.instance) {
      this.instance = new BroadcastManager();
    }
    return this.instance;
  }
  
  /**
   * Установить Socket.io сервер
   */
  setIO(io: any): void {
    this.io = io;
    console.log('[BroadcastManager] Socket.io server set');
    
    // Отправляем отложенные события
    this.flushQueue();
  }
  
  /**
   * Получить Socket.io сервер
   */
  getIO(): any {
    return this.io;
  }
  
  // ==================== NPC EVENTS ====================
  
  /**
   * Отправить действие NPC
   */
  broadcastNPCAction(locationId: string, data: NPCActionEvent): void {
    this.broadcast('npc:action', data, locationId);
  }
  
  /**
   * Отправить спавн NPC
   */
  broadcastNPCSpawn(locationId: string, data: NPCSpawnEvent): void {
    this.broadcast('npc:spawn', data, locationId);
  }
  
  /**
   * Отправить деспавн NPC
   */
  broadcastNPCDespawn(locationId: string, data: NPCDespawnEvent): void {
    this.broadcast('npc:despawn', data, locationId);
  }
  
  /**
   * Отправить обновление NPC
   */
  broadcastNPCUpdate(locationId: string, npcId: string, changes: Partial<NPCState>): void {
    this.broadcast('npc:update', { npcId, changes }, locationId);
  }
  
  // ==================== COMBAT EVENTS ====================
  
  /**
   * Отправить событие атаки
   */
  broadcastCombatAttack(locationId: string, data: {
    attackerId: string;
    targetId: string;
    techniqueId?: string;
    timestamp: number;
  }): void {
    this.broadcast('combat:attack', data, locationId);
  }
  
  /**
   * Отправить событие попадания
   */
  broadcastCombatHit(locationId: string, data: CombatHitEvent): void {
    this.broadcast('combat:hit', data, locationId);
  }
  
  // ==================== WORLD EVENTS ====================
  
  /**
   * Отправить синхронизацию мира
   */
  broadcastWorldSync(locationId: string, data: {
    npcs: NPCState[];
    time: any;
  }): void {
    this.broadcast('world:sync', data, locationId);
  }
  
  /**
   * Отправить тик мира всем клиентам
   */
  broadcastWorldTick(data: { tick: number; time: any }): void {
    if (this.io) {
      this.io.emit('world:tick', data);
    }
  }
  
  // ==================== CORE METHODS ====================
  
  /**
   * Отправить событие в локацию
   */
  broadcast(event: string, data: unknown, locationId: string): void {
    const eventObj: BroadcastEvent = {
      event,
      data,
      locationId,
      timestamp: Date.now(),
    };
    
    if (this.isBatching) {
      this.eventQueue.push(eventObj);
    } else {
      this.emitEvent(eventObj);
    }
  }
  
  /**
   * Начать batch режим (для накопления событий в тике)
   */
  startBatch(): void {
    this.isBatching = true;
  }
  
  /**
   * Закончить batch режим и отправить все события
   */
  endBatch(): void {
    this.isBatching = false;
    this.flushQueue();
  }
  
  /**
   * Отправить событие через Socket.io
   */
  private emitEvent(event: BroadcastEvent): void {
    if (!this.io) {
      // Сохраняем в очередь если io не установлен
      this.eventQueue.push(event);
      return;
    }
    
    // Отправляем в комнату локации
    const room = `location:${event.locationId}`;
    this.io.to(room).emit(event.event, event.data);
  }
  
  /**
   * Отправить все отложенные события
   */
  private flushQueue(): void {
    if (!this.io) return;
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      this.emitEvent(event);
    }
  }
  
  // ==================== STATS ====================
  
  /**
   * Получить статистику
   */
  getStats(): {
    isBatching: boolean;
    queueLength: number;
    hasIO: boolean;
  } {
    return {
      isBatching: this.isBatching,
      queueLength: this.eventQueue.length,
      hasIO: !!this.io,
    };
  }
}

// ==================== SINGLETON EXPORT ====================

export const broadcastManager = BroadcastManager.getInstance();

export function getBroadcastManager(): BroadcastManager {
  return BroadcastManager.getInstance();
}
