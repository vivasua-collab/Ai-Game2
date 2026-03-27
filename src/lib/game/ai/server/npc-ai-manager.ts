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
    
    // === DEBUG: Логируем состояние мира ===
    console.log(`[NPCAIManager] Tick ${this.tickCount}: worldState.npcs.size = ${worldState.npcs.size}, players = ${worldState.players.size}`);
    
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
    
    // === DEBUG ===
    if (players.length > 0) {
      console.log(`[NPCAIManager] findNearbyPlayers: npc=${npc.name} at (${npc.x}, ${npc.y}), ${players.length} players in location`);
      for (const player of players) {
        const dx = player.x - npc.x;
        const dy = player.y - npc.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        console.log(`[NPCAIManager] Player ${player.id} at (${player.x}, ${player.y}), distance=${distance.toFixed(0)}, activationRadius=${ACTIVATION_RADIUS}`);
      }
    }
    
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
   * 
   * АРХИТЕКТУРА: "Божество → Облако → Земля"
   * Земля (сервер) полностью управляет поведением NPC.
   * 
   * Логика:
   * 1. Spinal AI - рефлекторные реакции (dodge, flinch, flee)
   * 2. Proactive AI - активные действия (chase, attack, patrol, move)
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
    
    // Находим ближайшего игрока
    const nearestPlayer = this.findNearestPlayer(npc, nearbyPlayers);
    const distance = nearestPlayer ? this.calculateDistance(npc, nearestPlayer) : Infinity;
    
    // === ШАГ 1: Рефлекторные реакции (Spinal AI) ===
    let signal = null;
    
    if (nearestPlayer) {
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
    
    // Обновляем Spinal AI (рефлексы)
    const reflexAction = entry.controller.update(1000, npc, signal);
    
    // Если есть рефлекторное действие - выполняем его
    if (reflexAction && reflexAction.type !== 'idle') {
      this.executeAction(npc, reflexAction);
      entry.totalUpdates++;
      entry.lastUpdateTime = Date.now();
      return;
    }
    
    // === ШАГ 2: Проактивные действия (Proactive AI) ===
    // Выполняем если нет рефлекторных реакций
    
    const proactiveAction = this.generateProactiveAction(npc, nearestPlayer, distance);
    
    if (proactiveAction) {
      this.executeAction(npc, proactiveAction);
      entry.totalUpdates++;
      entry.lastUpdateTime = Date.now();
    }
  }
  
  /**
   * Генерация проактивного действия NPC
   * 
   * Это основная логика поведения NPC:
   * - Агрессивные NPC преследуют игрока
   * - Враги атакуют в ближнем бою
   * - Пассивные NPC патрулируют или стоят
   */
  private generateProactiveAction(
    npc: NPCState,
    nearestPlayer: PlayerWorldState | null,
    distance: number
  ): NPCAction | null {
    const now = Date.now();
    const ATTACK_COOLDOWN = 1500; // 1.5 секунды между атаками
    
    // === АГРЕССИВНОЕ ПОВЕДЕНИЕ ===
    if (nearestPlayer && npc.aggressionLevel > 30) {
      // Устанавливаем цель
      npc.targetId = nearestPlayer.id;
      
      // В радиусе атаки - атакуем!
      if (distance <= (npc.attackRange || 50)) {
        // Проверяем кулдаун атаки
        if (!npc.lastAttackTime || now - npc.lastAttackTime > ATTACK_COOLDOWN) {
          npc.lastAttackTime = now;
          
          return {
            type: 'attack',
            target: { x: nearestPlayer.x, y: nearestPlayer.y },
            startTime: now,
            duration: 500,
            params: {
              targetId: nearestPlayer.id,
              damage: this.calculateAttackDamage(npc),
            },
          };
        }
      }
      
      // В радиусе преследования - преследуем!
      if (distance <= (npc.agroRadius || AGRO_RADIUS) * 2) {
        // Вычисляем следующую позицию на пути к игроку
        const speed = npc.chaseSpeed || 100; // пикселей за тик
        const targetPos = this.calculateChasePosition(
          npc.x, npc.y,
          nearestPlayer.x, nearestPlayer.y,
          speed
        );
        
        return {
          type: 'chase',
          target: targetPos,
          startTime: now,
          duration: 1000, // 1 тик = 1 секунда
          params: {
            targetId: nearestPlayer.id,
            speed: speed,
          },
        };
      }
    }
    
    // === ПАТРУЛИРОВАНИЕ (для охранников и монстров) ===
    if (!nearestPlayer || distance > PERCEPTION_RADIUS) {
      // Сбрасываем цель
      npc.targetId = null;
      
      // Охранники и монстры патрулируют
      if (npc.roleId?.includes('guard') || npc.roleId?.includes('monster') || 
          npc.speciesType === 'beast') {
        // Генерируем точку патрулирования
        const patrolTarget = this.generatePatrolTarget(npc);
        
        if (patrolTarget) {
          return {
            type: 'patrol',
            target: patrolTarget,
            startTime: now,
            duration: 2000,
            params: {
              speed: npc.patrolSpeed || 50,
            },
          };
        }
      }
    }
    
    // === IDLE по умолчанию ===
    // Если нет других действий - стоим на месте
    if (Math.random() < 0.1) { // Только 10% шанс отправить idle
      return {
        type: 'idle',
        startTime: now,
        duration: 1000,
      };
    }
    
    return null;
  }
  
  /**
   * Вычислить позицию преследования
   */
  private calculateChasePosition(
    fromX: number, fromY: number,
    toX: number, toY: number,
    speed: number
  ): { x: number; y: number } {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= speed) {
      // Уже близко - двигаемся к цели
      return { x: toX, y: toY };
    }
    
    // Двигаемся на speed пикселей к цели
    const ratio = speed / distance;
    return {
      x: Math.round(fromX + dx * ratio),
      y: Math.round(fromY + dy * ratio),
    };
  }
  
  /**
   * Сгенерировать точку патрулирования
   */
  private generatePatrolTarget(npc: NPCState): { x: number; y: number } | null {
    const patrolRadius = npc.patrolRadius || 100;
    
    // Случайная точка в радиусе патрулирования от начальной позиции
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * patrolRadius;
    
    // Используем текущую позицию как центр патрулирования
    // (в идеале нужно хранить homePosition)
    const baseX = npc.x;
    const baseY = npc.y;
    
    const targetX = Math.round(baseX + Math.cos(angle) * distance);
    const targetY = Math.round(baseY + Math.sin(angle) * distance);
    
    // Проверяем что не слишком далеко от текущей позиции
    const distFromCurrent = Math.sqrt(
      (targetX - npc.x) ** 2 + (targetY - npc.y) ** 2
    );
    
    if (distFromCurrent < 30) {
      return null; // Слишком близко - не двигаемся
    }
    
    return { x: targetX, y: targetY };
  }
  
  /**
   * Рассчитать урон атаки NPC
   */
  private calculateAttackDamage(npc: NPCState): number {
    // Базовый урон зависит от уровня
    const baseDamage = 5 + (npc.level || 1) * 2;
    
    // Модификатор от силы
    const strengthMod = ((npc as any).stats?.strength || 10) / 10;
    
    return Math.round(baseDamage * strengthMod);
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
