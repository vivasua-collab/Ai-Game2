/**
 * ============================================================================
 * BROADCAST MANAGER - HTTP-Only Event Queue для AI
 * ============================================================================
 * 
 * Управляет очередью событий npc:action, npc:spawn, npc:despawn
 * для HTTP polling клиентом.
 * 
 * Архитектура HTTP-Only (WebSocket удалён):
 * - События сохраняются в очереди по sessionId
 * - Клиент забирает через GET /api/ai/events
 * - Очередь очищается после чтения
 * 
 * @see docs/ARCHITECTURE_cloud.md
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

// ==================== КОНСТАНТЫ ====================

/**
 * Максимальное количество событий в очереди на сессию
 */
const MAX_EVENTS_PER_SESSION = 100;

/**
 * Время жизни события (мс) - 5 минут
 */
const EVENT_TTL_MS = 5 * 60 * 1000;

// ==================== КЛАСС ====================

// ==================== SINGLETON WITH GLOBAL THIS ====================

// В Next.js/Turbopack singleton должен использовать globalThis
// иначе разные модули получат разные инстансы!
const globalForBroadcastManager = globalThis as unknown as {
  broadcastManager: BroadcastManager | undefined;
};

/**
 * BroadcastManager - singleton для управления очередью AI событий
 * 
 * HTTP-Only Single-Player версия:
 * - Одна глобальная очередь событий (single-player)
 * - События сохраняются в памяти
 * - Клиент polling через /api/ai/events
 * - Автоматическая очистка старых событий
 */
export class BroadcastManager {
  // Глобальная очередь событий (single-player)
  private globalEventQueue: BroadcastEvent[] = [];
  
  // Очереди событий по sessionId (для совместимости)
  private eventQueues: Map<string, BroadcastEvent[]> = new Map();
  
  // Время последнего доступа (для cleanup)
  private lastAccess: Map<string, number> = new Map();
  
  // Batch режим
  private isBatching: boolean = false;
  private batchQueue: BroadcastEvent[] = [];
  
  // Текущий sessionId (single-player)
  private currentSessionId: string = 'default';
  private currentBatchSessionId: string = 'default';
  
  private constructor() {
    console.log('[BroadcastManager] Constructor called - new instance created!');
  }
  
  static getInstance(): BroadcastManager {
    if (!globalForBroadcastManager.broadcastManager) {
      console.log('[BroadcastManager] Creating new singleton instance');
      globalForBroadcastManager.broadcastManager = new BroadcastManager();
    }
    return globalForBroadcastManager.broadcastManager;
  }
  
  // ==================== PUBLIC API - HTTP ====================
  
  /**
   * Получить события из глобальной очереди (single-player)
   * 
   * После чтения события удаляются из очереди!
   */
  pollGlobalEvents(): BroadcastEvent[] {
    this.cleanupIfNeeded();
    
    console.log(`[BroadcastManager] pollGlobalEvents: globalQueue length = ${this.globalEventQueue.length}`);
    
    if (this.globalEventQueue.length === 0) {
      return [];
    }
    
    // Возвращаем копию и очищаем очередь
    const events = [...this.globalEventQueue];
    this.globalEventQueue = [];
    
    console.log(`[BroadcastManager] pollGlobalEvents: returning ${events.length} events`);
    
    return events;
  }
  
  /**
   * Получить события для сессии (HTTP polling)
   * 
   * После чтения события удаляются из очереди!
   */
  pollEvents(sessionId: string): BroadcastEvent[] {
    console.log(`[BroadcastManager] pollEvents called with sessionId=${sessionId}`);
    this.cleanupIfNeeded();
    
    // Сначала проверяем глобальную очередь
    if (this.globalEventQueue.length > 0) {
      console.log(`[BroadcastManager] pollEvents: returning ${this.globalEventQueue.length} events from global queue`);
      return this.pollGlobalEvents();
    }
    
    const queue = this.eventQueues.get(sessionId);
    console.log(`[BroadcastManager] pollEvents: queue for ${sessionId} = ${queue ? queue.length : 'not found'}`);
    
    if (!queue || queue.length === 0) {
      // DEBUG: Показываем доступные очереди
      const availableQueues = Array.from(this.eventQueues.keys());
      if (availableQueues.length > 0) {
        console.log(`[BroadcastManager] pollEvents: no events for sessionId=${sessionId}, available queues: ${availableQueues.join(', ')}`);
      }
      return [];
    }
    
    // Обновляем время доступа
    this.lastAccess.set(sessionId, Date.now());
    
    // Возвращаем копию и очищаем очередь
    const events = [...queue];
    queue.length = 0; // Очищаем массив
    
    // DEBUG: Логируем что возвращаем
    if (events.length > 0) {
      console.log(`[BroadcastManager] pollEvents: returning ${events.length} events for sessionId=${sessionId}`);
    }
    
    return events;
  }
  
  /**
   * Получить события для локации (все сессии в локации)
   */
  pollEventsForLocation(locationId: string, sessionIds: string[]): BroadcastEvent[] {
    const allEvents: BroadcastEvent[] = [];
    
    for (const sessionId of sessionIds) {
      const events = this.pollEvents(sessionId);
      // Фильтруем по локации
      const locationEvents = events.filter(e => e.locationId === locationId);
      allEvents.push(...locationEvents);
    }
    
    // Сортируем по времени
    allEvents.sort((a, b) => a.timestamp - b.timestamp);
    
    return allEvents;
  }
  
  /**
   * Проверить наличие событий
   */
  hasEvents(sessionId: string): boolean {
    const queue = this.eventQueues.get(sessionId);
    return queue !== undefined && queue.length > 0;
  }
  
  /**
   * Количество событий в очереди
   */
  getQueueLength(sessionId: string): number {
    return this.eventQueues.get(sessionId)?.length ?? 0;
  }
  
  // ==================== NPC EVENTS ====================
  
  /**
   * Отправить действие NPC (single-player версия)
   * Для multi-player используйте broadcastNPCAction(sessionId, locationId, data)
   */
  broadcastNPCAction(sessionIdOrLocationId: string, locationIdOrData: string | NPCActionEvent, data?: NPCActionEvent): void {
    if (typeof locationIdOrData === 'string') {
      // Multi-player signature: (sessionId, locationId, data)
      this.broadcast(sessionIdOrLocationId, 'npc:action', data!, locationIdOrData);
    } else {
      // Single-player signature: (locationId, data)
      this.broadcast(this.currentSessionId, 'npc:action', locationIdOrData, sessionIdOrLocationId);
    }
  }
  
  /**
   * Отправить спавн NPC
   */
  broadcastNPCSpawn(sessionId: string, locationId: string, data: NPCSpawnEvent): void {
    this.broadcast(sessionId, 'npc:spawn', data, locationId);
  }
  
  /**
   * Отправить деспавн NPC
   */
  broadcastNPCDespawn(sessionId: string, locationId: string, data: NPCDespawnEvent): void {
    this.broadcast(sessionId, 'npc:despawn', data, locationId);
  }
  
  /**
   * Отправить обновление NPC
   */
  broadcastNPCUpdate(sessionId: string, locationId: string, npcId: string, changes: Partial<NPCState>): void {
    this.broadcast(sessionId, 'npc:update', { npcId, changes }, locationId);
  }
  
  // ==================== COMBAT EVENTS ====================
  
  /**
   * Отправить событие атаки (single-player версия)
   * Для multi-player используйте broadcastCombatAttack(sessionId, locationId, data)
   */
  broadcastCombatAttack(sessionIdOrLocationId: string, locationIdOrData: string | {
    attackerId: string;
    targetId: string;
    techniqueId?: string;
    timestamp: number;
  }, data?: {
    attackerId: string;
    targetId: string;
    techniqueId?: string;
    timestamp: number;
  }): void {
    if (typeof locationIdOrData === 'string') {
      // Multi-player signature
      this.broadcast(sessionIdOrLocationId, 'combat:attack', data!, locationIdOrData);
    } else {
      // Single-player signature: (locationId, data)
      this.broadcast(this.currentSessionId, 'combat:attack', locationIdOrData, sessionIdOrLocationId);
    }
  }
  
  /**
   * Отправить событие попадания
   */
  broadcastCombatHit(sessionId: string, locationId: string, data: CombatHitEvent): void {
    this.broadcast(sessionId, 'combat:hit', data, locationId);
  }
  
  // ==================== WORLD EVENTS ====================
  
  /**
   * Отправить синхронизацию мира
   */
  broadcastWorldSync(sessionId: string, locationId: string, data: {
    npcs: NPCState[];
    time: unknown;
  }): void {
    this.broadcast(sessionId, 'world:sync', data, locationId);
  }
  
  /**
   * Отправить тик мира
   */
  broadcastWorldTick(sessionId: string, locationId: string, data: { tick: number; time: unknown }): void {
    this.broadcast(sessionId, 'world:tick', data, locationId);
  }
  
  // ==================== CORE METHODS ====================
  
  /**
   * Отправить событие в очередь сессии
   */
  broadcast(sessionId: string, event: string, data: unknown, locationId: string): void {
    const eventObj: BroadcastEvent = {
      event,
      data,
      locationId,
      timestamp: Date.now(),
    };
    
    if (this.isBatching && this.currentBatchSessionId === sessionId) {
      // Batch режим - накапливаем
      this.batchQueue.push(eventObj);
    } else {
      // Обычный режим - сразу в очередь
      this.addToQueue(sessionId, eventObj);
    }
  }
  
  /**
   * Начать batch режим (для накопления событий в тике)
   * 
   * @param sessionId - опционально, для single-player используется 'default'
   */
  startBatch(sessionId?: string): void {
    this.isBatching = true;
    this.currentBatchSessionId = sessionId || 'default';
    this.currentSessionId = sessionId || 'default';
    this.batchQueue = [];
  }
  
  /**
   * Закончить batch режим и отправить все события
   */
  endBatch(): void {
    if (!this.isBatching) {
      return;
    }
    
    console.log(`[BroadcastManager] endBatch: flushing ${this.batchQueue.length} events to sessionId=${this.currentBatchSessionId}`);
    
    // Добавляем все события в глобальную очередь
    for (const event of this.batchQueue) {
      this.globalEventQueue.push(event);
    }
    
    // Также добавляем в очередь сессии для совместимости
    for (const event of this.batchQueue) {
      this.addToQueue(this.currentSessionId, event);
    }
    
    // DEBUG: Показываем содержимое batch
    if (this.batchQueue.length > 0) {
      console.log(`[BroadcastManager] endBatch: events types: ${this.batchQueue.map(e => e.event).join(', ')}`);
    }
    
    // Сбрасываем состояние
    this.isBatching = false;
    this.batchQueue = [];
  }
  
  // ==================== PRIVATE METHODS ====================
  
  /**
   * Добавить событие в очередь сессии
   */
  private addToQueue(sessionId: string, event: BroadcastEvent): void {
    let queue = this.eventQueues.get(sessionId);
    
    if (!queue) {
      queue = [];
      this.eventQueues.set(sessionId, queue);
    }
    
    // Проверяем лимит
    if (queue.length >= MAX_EVENTS_PER_SESSION) {
      // Удаляем старые события
      queue.shift();
    }
    
    queue.push(event);
    this.lastAccess.set(sessionId, Date.now());
    
    // DEBUG
    console.log(`[BroadcastManager] addToQueue: added event '${event.event}' to sessionId=${sessionId}, queue size now: ${queue.length}`);
  }
  
  /**
   * Очистка старых очередей
   */
  private cleanupIfNeeded(): void {
    const now = Date.now();
    
    // Cleanup каждые ~100 вызовов
    if (Math.random() > 0.99) {
      this.cleanup();
    }
  }
  
  /**
   * Удалить старые очереди
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [sessionId, lastTime] of this.lastAccess) {
      if (now - lastTime > EVENT_TTL_MS) {
        this.eventQueues.delete(sessionId);
        this.lastAccess.delete(sessionId);
      }
    }
  }
  
  // ==================== STATS ====================
  
  /**
   * Получить статистику
   */
  getStats(): {
    isBatching: boolean;
    batchQueueLength: number;
    totalSessions: number;
    totalEvents: number;
  } {
    let totalEvents = 0;
    for (const queue of this.eventQueues.values()) {
      totalEvents += queue.length;
    }
    
    return {
      isBatching: this.isBatching,
      batchQueueLength: this.batchQueue.length,
      totalSessions: this.eventQueues.size,
      totalEvents,
    };
  }
  
  /**
   * Очистить все очереди
   */
  clear(): void {
    this.globalEventQueue = [];
    this.eventQueues.clear();
    this.lastAccess.clear();
    this.batchQueue = [];
    this.isBatching = false;
    this.currentBatchSessionId = 'default';
    this.currentSessionId = 'default';
  }
}

// ==================== SINGLETON EXPORT ====================

export const broadcastManager = BroadcastManager.getInstance();

export function getBroadcastManager(): BroadcastManager {
  return BroadcastManager.getInstance();
}
