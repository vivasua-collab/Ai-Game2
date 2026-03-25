/**
 * ============================================================================
 * NPC AI MANAGER - Главный менеджер серверного AI для NPC
 * ============================================================================
 * 
 * Управляет AI всех NPC на сервере:
 * - Активация/деактивация NPC при приближении игрока
 * - Обновление AI каждый тик
 * - Интеграция с SpinalController
 * - Отправка действий через BroadcastManager
 * 
 * @see docs/checkpoints/checkpoint_03_25_AI_server_implementation_plan.md
 */

import { getNPCWorldManager } from '@/lib/game/npc-world-manager';
import type { NPCState, NPCAction, PlayerWorldState } from '@/lib/game/types';
import { 
  SpinalServerController, 
  createSpinalServerController,
  createAttackSignal,
  createPlayerNearbySignal,
} from './spinal-server';
import { getBroadcastManager } from './broadcast-manager';

// ==================== ТИПЫ ====================

interface NPCAIEntry {
  controller: SpinalServerController;
  lastUpdateTime: number;
  totalUpdates: number;
}

interface AIStats {
  totalNPCs: number;
  activeNPCs: number;
  totalUpdates: number;
  avgUpdateTime: number;
}

// ==================== КОНСТАНТЫ ====================

const ACTIVATION_RADIUS = 300; // Радиус активации NPC при приближении игрока
const PERCEPTION_RADIUS = 400; // Радиус восприятия NPC
const AGRO_RADIUS = 150; // Радиус агрессии
const MAX_UPDATE_TIME_MS = 100; // Максимальное время обновления всех NPC

// ==================== КЛАСС ====================

/**
 * NPCAIManager - Singleton менеджер серверного AI
 */
export class NPCAIManager {
  private static instance: NPCAIManager;
  
  // Контроллеры AI для каждого NPC
  private controllers: Map<string, NPCAIEntry> = new Map();
  
  // Ссылки на другие менеджеры
  private npcWorldManager = getNPCWorldManager();
  private broadcastManager = getBroadcastManager();
  
  // Статистика
  private tickCount: number = 0;
  private lastTickTime: number = 0;
  private totalTickTime: number = 0;
  
  // Флаги
  private isRunning: boolean = false;
  
  private constructor() {}
  
  static getInstance(): NPCAIManager {
    if (!this.instance) {
      this.instance = new NPCAIManager();
    }
    return this.instance;
  }
  
  // ==================== PUBLIC API ====================
  
  /**
   * Обновить всех NPC (вызывается каждый тик)
   */
  async updateAllNPCs(): Promise<void> {
    const startTime = Date.now();
    this.tickCount++;
    
    const worldState = this.npcWorldManager.getWorldState();
    
    // Начинаем batch режим для отправки событий
    this.broadcastManager.startBatch();
    
    try {
      // Проходим по всем NPC
      for (const [npcId, npc] of worldState.npcs) {
        // Пропускаем мёртвых NPC
        if (npc.isDead) continue;
        
        // Находим ближайших игроков
        const nearbyPlayers = this.findNearbyPlayers(npc);
        
        if (nearbyPlayers.length > 0) {
          // Активируем NPC
          if (!npc.isActive) {
            this.activateNPC(npc);
          }
          
          // Обновляем AI
          await this.updateActiveNPC(npc, nearbyPlayers);
        } else {
          // Деактивируем NPC
          if (npc.isActive && Date.now() - npc.lastActiveTime > 30000) {
            this.deactivateNPC(npc);
          }
        }
      }
    } finally {
      // Отправляем все накопленные события
      this.broadcastManager.endBatch();
    }
    
    // Обновляем статистику
    const tickTime = Date.now() - startTime;
    this.lastTickTime = tickTime;
    this.totalTickTime += tickTime;
    
    // Логируем медленные тики
    if (tickTime > MAX_UPDATE_TIME_MS) {
      console.warn(`[NPCAIManager] Tick ${this.tickCount} took ${tickTime}ms (max: ${MAX_UPDATE_TIME_MS}ms)`);
    }
  }
  
  /**
   * Получить контроллер NPC
   */
  getController(npcId: string): SpinalServerController | null {
    return this.controllers.get(npcId)?.controller || null;
  }
  
  /**
   * Создать контроллер для NPC
   */
  createController(npc: NPCState): SpinalServerController {
    const controller = createSpinalServerController(npc.id, npc.spinalPreset);
    
    this.controllers.set(npc.id, {
      controller,
      lastUpdateTime: 0,
      totalUpdates: 0,
    });
    
    return controller;
  }
  
  /**
   * Удалить контроллер NPC
   */
  removeController(npcId: string): void {
    this.controllers.delete(npcId);
  }
  
  /**
   * Обработать атаку игрока на NPC
   */
  handlePlayerAttack(
    playerId: string,
    targetNpcId: string,
    damage: number,
    techniqueId?: string
  ): void {
    const npc = this.npcWorldManager.getNPC(targetNpcId);
    const player = this.npcWorldManager.getPlayer(playerId);
    
    if (!npc || !player) return;
    
    // Обновляем угрозу
    npc.threatLevel = Math.min(100, npc.threatLevel + 30);
    npc.targetId = playerId;
    
    // Создаём сигнал атаки для Spinal AI
    const signal = createAttackSignal(
      playerId,
      player.x,
      player.y,
      npc.x,
      npc.y,
      damage
    );
    
    // Отправляем сигнал в контроллер
    const entry = this.controllers.get(targetNpcId);
    if (entry) {
      entry.controller.receiveSignal(signal);
    }
    
    // Отправляем событие атаки
    this.broadcastManager.broadcastCombatAttack(npc.locationId, {
      attackerId: playerId,
      targetId: targetNpcId,
      techniqueId,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Получить статистику AI
   */
  getStats(): AIStats {
    let totalUpdates = 0;
    let avgUpdateTime = 0;
    
    for (const entry of this.controllers.values()) {
      totalUpdates += entry.totalUpdates;
    }
    
    if (this.tickCount > 0) {
      avgUpdateTime = this.totalTickTime / this.tickCount;
    }
    
    return {
      totalNPCs: this.controllers.size,
      activeNPCs: this.npcWorldManager.getActiveNPCs().length,
      totalUpdates,
      avgUpdateTime,
    };
  }
  
  // ==================== PRIVATE METHODS ====================
  
  /**
   * Найти ближайших игроков
   */
  private findNearbyPlayers(npc: NPCState): PlayerWorldState[] {
    const players = this.npcWorldManager.getPlayersInLocation(npc.locationId);
    
    return players.filter(player => {
      const dx = player.x - npc.x;
      const dy = player.y - npc.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return distance <= ACTIVATION_RADIUS;
    });
  }
  
  /**
   * Активировать NPC
   */
  private activateNPC(npc: NPCState): void {
    npc.isActive = true;
    npc.lastActiveTime = Date.now();
    
    // Создаём контроллер если нет
    if (!this.controllers.has(npc.id)) {
      this.createController(npc);
    }
    
    console.log(`[NPCAIManager] Activated NPC: ${npc.name} (${npc.id})`);
  }
  
  /**
   * Деактивировать NPC
   */
  private deactivateNPC(npc: NPCState): void {
    npc.isActive = false;
    npc.aiState = 'idle';
    npc.currentAction = null;
    
    console.log(`[NPCAIManager] Deactivated NPC: ${npc.name} (${npc.id})`);
  }
  
  /**
   * Обновить активного NPC
   */
  private async updateActiveNPC(
    npc: NPCState,
    nearbyPlayers: PlayerWorldState[]
  ): Promise<void> {
    const entry = this.controllers.get(npc.id);
    if (!entry) return;
    
    // Обновляем время последнего обновления
    npc.lastActiveTime = Date.now();
    
    // Отмечаем игроков в зоне видимости
    for (const player of nearbyPlayers) {
      this.npcWorldManager.markPlayerSeen(npc.id, player.id);
    }
    
    // Генерируем сигнал от ближайшего игрока
    let signal = null;
    const nearestPlayer = this.findNearestPlayer(npc, nearbyPlayers);
    
    if (nearestPlayer) {
      const distance = this.calculateDistance(npc, nearestPlayer);
      
      // Если игрок очень близко - создаём сигнал опасности
      if (distance < AGRO_RADIUS && npc.aggressionLevel > 50) {
        signal = createPlayerNearbySignal(
          nearestPlayer.id,
          nearestPlayer.x,
          nearestPlayer.y,
          npc.x,
          npc.y,
          distance,
          AGRO_RADIUS
        );
        signal.type = 'danger_nearby';
      } else if (distance < PERCEPTION_RADIUS) {
        // Иначе просто сигнал что игрок рядом
        signal = createPlayerNearbySignal(
          nearestPlayer.id,
          nearestPlayer.x,
          nearestPlayer.y,
          npc.x,
          npc.y,
          distance,
          PERCEPTION_RADIUS
        );
      }
    }
    
    // Обновляем Spinal AI
    const action = entry.controller.update(1000, npc, signal);
    
    if (action) {
      // Выполняем действие
      this.executeAction(npc, action);
      
      // Обновляем статистику
      entry.totalUpdates++;
      entry.lastUpdateTime = Date.now();
    }
  }
  
  /**
   * Найти ближайшего игрока
   */
  private findNearestPlayer(
    npc: NPCState,
    players: PlayerWorldState[]
  ): PlayerWorldState | null {
    if (players.length === 0) return null;
    
    let nearest = players[0];
    let minDistance = this.calculateDistance(npc, nearest);
    
    for (let i = 1; i < players.length; i++) {
      const distance = this.calculateDistance(npc, players[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = players[i];
      }
    }
    
    return nearest;
  }
  
  /**
   * Вычислить расстояние
   */
  private calculateDistance(npc: NPCState, player: PlayerWorldState): number {
    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Выполнить действие NPC
   */
  private executeAction(npc: NPCState, action: NPCAction): void {
    // Обновляем состояние NPC
    npc.currentAction = action;
    npc.aiState = action.type;
    
    // Обновляем позицию если действие связано с движением
    if (action.type === 'move' || action.type === 'chase' || action.type === 'flee') {
      if (action.target && typeof action.target === 'object') {
        // Обновляем позицию (упрощённо)
        npc.x = action.target.x;
        npc.y = action.target.y;
      }
    }
    
    // Отправляем событие
    this.broadcastManager.broadcastNPCAction(npc.locationId, {
      npcId: npc.id,
      action,
      npcState: {
        x: npc.x,
        y: npc.y,
        aiState: npc.aiState,
      },
    });
  }
}

// ==================== SINGLETON EXPORT ====================

export const npcAIManager = NPCAIManager.getInstance();

export function getNPCAIManager(): NPCAIManager {
  return NPCAIManager.getInstance();
}
