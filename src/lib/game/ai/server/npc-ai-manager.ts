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

import { TruthSystem } from '@/lib/game/truth-system';
import type { NPCState, NPCAction } from '@/lib/game/types';
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

const ACTIVATION_RADIUS = 500; // Радиус активации NPC при приближении игрока
const DEACTIVATION_RADIUS = 800; // Радиус деактивации NPC при удалении игрока
const PERCEPTION_RADIUS = 600; // Радиус восприятия NPC
const AGRO_RADIUS = 200; // Радиус агрессии
const MAX_UPDATE_TIME_MS = 100; // Максимальное время обновления всех NPC

// ==================== КЛАСС ====================

/**
 * NPCAIManager - Singleton менеджер серверного AI
 */
export class NPCAIManager {
  private static instance: NPCAIManager;
  
  // Контроллеры AI для каждого NPC
  private controllers: Map<string, NPCAIEntry> = new Map();
  
  // УДАЛЕНО (Фаза 4): private npcWorldManager = getNPCWorldManager();
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
   * Обновить всех NPC для указанной сессии (вызывается каждый тик)
   * 
   * ИЗМЕНЕНО (Фаза 4): Теперь требует sessionId, читает из TruthSystem
   * ИСПРАВЛЕНО: Принимает позицию игрока как параметр
   * ИСПРАВЛЕНО (Фаза 5): Сначала активирует NPC, потом обновляет AI
   */
  async updateAllNPCs(
    sessionId: string, 
    playerPosition?: { x: number; y: number }
  ): Promise<void> {
    const startTime = Date.now();
    this.tickCount++;
    
    const truthSystem = TruthSystem.getInstance();
    
    // === КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ ===
    // Получаем ВСЕХ NPC в локации (не только активных!)
    // Это позволяет активировать NPC когда игрок рядом
    const allNPCs = truthSystem.getAllNPCs(sessionId);
    const activeNPCs = truthSystem.getActiveNPCs(sessionId);
    
    // === DEBUG: Логируем состояние ===
    console.log(`[NPCAIManager] Tick ${this.tickCount}: allNPCs = ${allNPCs.length}, activeNPCs = ${activeNPCs.length}, playerPos = ${playerPosition ? `(${playerPosition.x.toFixed(0)}, ${playerPosition.y.toFixed(0)})` : 'N/A'}`);
    
    // === КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Если нет позиции игрока - используем центр мира ===
    const effectivePlayerPos = playerPosition || { x: 800, y: 600 };
    if (!playerPosition) {
      console.warn(`[NPCAIManager] No player position provided, using default center (800, 600)`);
    }
    
    // === КРИТИЧНО: Передаём sessionId в BroadcastManager! ===
    // Иначе события уйдут в очередь 'default' вместо реальной сессии
    this.broadcastManager.startBatch(sessionId);
    
    try {
      // === ШАГ 1: АКТИВАЦИЯ NPC (проходим по ВСЕМ NPC) ===
      // NPC с isActive=false не попадают в activeNPCs, поэтому проверяем всех
      for (const npc of allNPCs) {
        // Пропускаем мёртвых NPC
        if (npc.isDead) continue;
        
        // Проверяем дистанцию до игрока (используем effectivePlayerPos)
        const dx = effectivePlayerPos.x - npc.x;
        const dy = effectivePlayerPos.y - npc.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Если игрок в радиусе активации - активируем NPC
        if (distance <= ACTIVATION_RADIUS) {
          if (!npc.isActive) {
            console.log(`[NPCAIManager] Activating NPC "${npc.name}" (${npc.id}) - distance: ${distance.toFixed(0)}px`);
            this.activateNPC(sessionId, npc);
          }
        } else if (npc.isActive && distance > DEACTIVATION_RADIUS) {
          // Если игрок далеко - деактивируем
          this.deactivateNPC(sessionId, npc);
        }
      }
      
      // === ШАГ 2: ОБНОВЛЕНИЕ AI (только активные NPC) ===
      // После активации получаем обновлённый список активных NPC
      const nowActiveNPCs = truthSystem.getActiveNPCs(sessionId);
      console.log(`[NPCAIManager] After activation: ${nowActiveNPCs.length} active NPCs`);
      
      for (const npc of nowActiveNPCs) {
        // Пропускаем мёртвых NPC
        if (npc.isDead) continue;
        
        // Находим ближайших игроков (используем effectivePlayerPos)
        const nearbyPlayers = this.findNearbyPlayersWithPosition(npc, effectivePlayerPos);
        
        // Обновляем AI
        await this.updateActiveNPC(sessionId, npc, nearbyPlayers);
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
   * 
   * ИЗМЕНЕНО (Фаза 4): Добавлен sessionId, использует TruthSystem
   */
  handlePlayerAttack(
    sessionId: string,
    playerId: string,
    targetNpcId: string,
    damage: number,
    techniqueId?: string
  ): void {
    const truthSystem = TruthSystem.getInstance();
    const npc = truthSystem.getNPC(sessionId, targetNpcId);
    const player = this.getPlayerPosition(sessionId);
    
    if (!npc || !player) return;
    
    // Обновляем угрозу через TruthSystem
    truthSystem.updateNPC(sessionId, targetNpcId, {
      threatLevel: Math.min(100, npc.threatLevel + 30),
      targetId: playerId,
    });
    
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
   * 
   * ИЗМЕНЕНО (Фаза 4): Добавлен опциональный sessionId
   */
  getStats(sessionId?: string): AIStats {
    let totalUpdates = 0;
    let avgUpdateTime = 0;
    
    for (const entry of this.controllers.values()) {
      totalUpdates += entry.totalUpdates;
    }
    
    if (this.tickCount > 0) {
      avgUpdateTime = this.totalTickTime / this.tickCount;
    }
    
    let activeNPCs = 0;
    let totalNPCs = this.controllers.size;
    
    if (sessionId) {
      const truthSystem = TruthSystem.getInstance();
      const stats = truthSystem.getNPCStats(sessionId);
      activeNPCs = stats.active;
      totalNPCs = stats.total;
    }
    
    return {
      totalNPCs,
      activeNPCs,
      totalUpdates,
      avgUpdateTime,
    };
  }
  
  // ==================== PRIVATE METHODS ====================
  
  /**
   * Получить позицию игрока из сессии
   * 
   * В single-player игре только один игрок.
   * Позиция берётся из SessionState (playerX, playerY).
   * 
   * ИСПРАВЛЕНО: Теперь читает актуальную позицию из TruthSystem
   */
  private getPlayerPosition(sessionId: string): { id: string; x: number; y: number } | null {
    const truthSystem = TruthSystem.getInstance();
    const position = truthSystem.getPlayerPosition(sessionId);
    const session = truthSystem.getSessionState(sessionId);
    
    if (!session || !position) return null;
    
    return {
      id: session.characterId,
      x: position.x,
      y: position.y,
    };
  }
  
  /**
   * Найти ближайших игроков для NPC (с переданной позицией игрока)
   * 
   * ИСПРАВЛЕНО: Принимает позицию игрока как параметр вместо использования захардкоженной
   */
  private findNearbyPlayersWithPosition(
    npc: NPCState,
    playerPosition?: { x: number; y: number }
  ): { id: string; x: number; y: number }[] {
    if (!playerPosition) {
      return [];
    }
    
    // Проверяем дистанцию
    const dx = playerPosition.x - npc.x;
    const dy = playerPosition.y - npc.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // === DEBUG ===
    console.log(`[NPCAIManager] findNearbyPlayers: NPC "${npc.name}" at (${npc.x}, ${npc.y}), player at (${playerPosition.x}, ${playerPosition.y}), distance=${distance.toFixed(0)}, activationRadius=${ACTIVATION_RADIUS}`);
    
    if (distance <= ACTIVATION_RADIUS) {
      return [{
        id: 'player',
        x: playerPosition.x,
        y: playerPosition.y,
      }];
    }
    
    return [];
  }
  
  /**
   * Найти ближайших игроков для NPC
   * 
   * ИЗМЕНЕНО (Фаза 4): В single-player игре только один игрок
   */
  private findNearbyPlayers(
    sessionId: string, 
    npc: NPCState
  ): { id: string; x: number; y: number }[] {
    const player = this.getPlayerPosition(sessionId);
    
    if (!player) {
      return [];
    }
    
    // Проверяем дистанцию
    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // === DEBUG ===
    console.log(`[NPCAIManager] findNearbyPlayers: NPC "${npc.name}" at (${npc.x}, ${npc.y}), player at (${player.x}, ${player.y}), distance=${distance.toFixed(0)}, activationRadius=${ACTIVATION_RADIUS}`);
    
    if (distance <= ACTIVATION_RADIUS) {
      return [player];
    }
    
    return [];
  }
  
  /**
   * Активировать NPC
   * 
   * ИЗМЕНЕНО (Фаза 4): Обновляет через TruthSystem
   */
  private activateNPC(sessionId: string, npc: NPCState): void {
    const truthSystem = TruthSystem.getInstance();
    
    // Обновляем через TruthSystem
    truthSystem.updateNPC(sessionId, npc.id, {
      isActive: true,
      lastActiveTime: Date.now(),
    });
    
    // Создаём контроллер если нет
    if (!this.controllers.has(npc.id)) {
      this.createController(npc);
    }
    
    console.log(`[NPCAIManager] Activated NPC: ${npc.name} (${npc.id})`);
  }
  
  /**
   * Деактивировать NPC
   * 
   * ИЗМЕНЕНО (Фаза 4): Обновляет через TruthSystem
   */
  private deactivateNPC(sessionId: string, npc: NPCState): void {
    const truthSystem = TruthSystem.getInstance();
    
    // Обновляем через TruthSystem
    truthSystem.updateNPC(sessionId, npc.id, {
      isActive: false,
      aiState: 'idle',
      currentAction: null,
    });
    
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
   * 
   * ИЗМЕНЕНО (Фаза 4): Добавлен sessionId, использует TruthSystem
   */
  private async updateActiveNPC(
    sessionId: string,
    npc: NPCState,
    nearbyPlayers: { id: string; x: number; y: number }[]
  ): Promise<void> {
    // === ИСПРАВЛЕНО: Создаём контроллер если его нет ===
    let entry = this.controllers.get(npc.id);
    if (!entry) {
      console.log(`[NPCAIManager] Creating missing controller for NPC: ${npc.name} (${npc.id})`);
      this.createController(npc);
      entry = this.controllers.get(npc.id);
    }
    if (!entry) {
      console.error(`[NPCAIManager] Failed to create controller for NPC: ${npc.name}`);
      return;
    }
    
    // Обновляем время последнего обновления через TruthSystem
    const truthSystem = TruthSystem.getInstance();
    truthSystem.updateNPC(sessionId, npc.id, {
      lastActiveTime: Date.now(),
    });
    
    // Находим ближайшего игрока
    const nearestPlayer = this.findNearestPlayer(npc, nearbyPlayers);
    const distance = nearestPlayer ? this.calculateDistance(npc, nearestPlayer) : Infinity;
    
    // === ШАГ 1: Рефлекторные реакции (Spinal AI) ===
    // ТОЛЬКО для неагрессивных NPC! Агрессивные NPC должны атаковать, не dodge
    let signal = null;
    
    // ВАЖНО: Агрессивные NPC (aggressionLevel > 50) не dodge от игрока - они атакуют!
    const isAggressive = npc.aggressionLevel > 50 || 
                         npc.speciesType === 'beast' || 
                         npc.roleId?.includes('monster');
    
    if (nearestPlayer && !isAggressive) {
      // Неагрессивные NPC реагируют на опасность
      if (distance < AGRO_RADIUS) {
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
    
    // Обновляем Spinal AI (рефлексы) - только для неагрессивных NPC
    let reflexAction: NPCAction | null = null;
    if (!isAggressive) {
      reflexAction = entry.controller.update(1000, npc, signal);
      
      // Если есть рефлекторное действие - выполняем его
      if (reflexAction && reflexAction.type !== 'idle') {
        this.executeAction(sessionId, npc, reflexAction);
        entry.totalUpdates++;
        entry.lastUpdateTime = Date.now();
        return;
      }
    }
    
    // === ШАГ 2: Проактивные действия (Proactive AI) ===
    // Выполняем если нет рефлекторных реакций
    
    const proactiveAction = this.generateProactiveAction(npc, nearestPlayer, distance);
    
    if (proactiveAction) {
      this.executeAction(sessionId, npc, proactiveAction);
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
    nearestPlayer: { id: string; x: number; y: number } | null,
    distance: number
  ): NPCAction | null {
    const now = Date.now();
    const ATTACK_COOLDOWN = 1500; // 1.5 секунды между атаками
    
    // === DEBUG ===
    console.log(`[NPCAIManager] generateProactiveAction: npc="${npc.name}" aggression=${npc.aggressionLevel} distance=${distance.toFixed(0)} attackRange=${npc.attackRange || 50} agroRadius=${npc.agroRadius || AGRO_RADIUS} nearestPlayer=${nearestPlayer ? 'YES' : 'NO'}`);
    
    // === АГРЕССИВНОЕ ПОВЕДЕНИЕ ===
    if (nearestPlayer && npc.aggressionLevel > 30) {
      // Устанавливаем цель
      npc.targetId = nearestPlayer.id;
      
      // В радиусе атаки - атакуем!
      if (distance <= (npc.attackRange || 50)) {
        // Проверяем кулдаун атаки
        const timeSinceLastAttack = npc.lastAttackTime ? now - npc.lastAttackTime : Infinity;
        console.log(`[NPCAIManager] ATTACK RANGE: distance=${distance.toFixed(0)} <= ${npc.attackRange || 50}, cooldown=${timeSinceLastAttack.toFixed(0)}ms`);
        
        if (!npc.lastAttackTime || timeSinceLastAttack > ATTACK_COOLDOWN) {
          npc.lastAttackTime = now;
          console.log(`[NPCAIManager] GENERATING ATTACK for ${npc.name}`);
          
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
        } else {
          console.log(`[NPCAIManager] ATTACK ON COOLDOWN for ${npc.name}`);
        }
      }
      
      // В радиусе преследования - преследуем!
      const chaseRange = (npc.agroRadius || AGRO_RADIUS) * 2;
      console.log(`[NPCAIManager] CHASE CHECK: distance=${distance.toFixed(0)} <= ${chaseRange}`);
      
      if (distance <= chaseRange) {
        // Вычисляем следующую позицию на пути к игроку
        // Скорость: 250 пикселей в секунду (за тик = 250 пикселей)
        const speed = npc.chaseSpeed || 250; // УВЕЛИЧЕНА скорость!
        const targetPos = this.calculateChasePosition(
          npc.x, npc.y,
          nearestPlayer.x, nearestPlayer.y,
          speed
        );
        
        console.log(`[NPCAIManager] GENERATING CHASE for ${npc.name} to (${targetPos.x}, ${targetPos.y})`);
        
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
    players: { id: string; x: number; y: number }[]
  ): { id: string; x: number; y: number } | null {
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
  private calculateDistance(npc: NPCState, player: { x: number; y: number }): number {
    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Выполнить действие NPC
   * 
   * ИЗМЕНЕНО (Фаза 4): Сохраняет изменения через TruthSystem
   */
  private executeAction(sessionId: string, npc: NPCState, action: NPCAction): void {
    console.log(`[NPCAIManager] EXECUTE ACTION: NPC "${npc.name}" (${npc.id}) -> ${action.type} target=${JSON.stringify(action.target)}`);
    
    const truthSystem = TruthSystem.getInstance();
    
    // Подготавливаем обновления
    const updates: Partial<NPCState> = {
      currentAction: action,
      aiState: action.type,
    };
    
    // Обновляем позицию ТОЛЬКО для 'move' (завершённое движение)
    // Для 'chase' - НЕ обновляем позицию! Phaser на клиенте управляет движением
    if (action.type === 'move') {
      if (action.target && typeof action.target === 'object') {
        updates.x = action.target.x;
        updates.y = action.target.y;
        console.log(`[NPCAIManager] Updated NPC "${npc.name}" position to (${updates.x}, ${updates.y})`);
      }
    } else if (action.type === 'chase' || action.type === 'flee') {
      // Для chase и flee: НЕ обновляем позицию на сервере!
      // Phaser на клиенте сам управляет движением через setVelocity
      // Сервер только отправляет событие с целью
      console.log(`[NPCAIManager] NPC "${npc.name}" ${action.type} to (${action.target?.x}, ${action.target?.y}) - client will handle movement`);
    }
    
    // Применяем обновления через TruthSystem
    truthSystem.updateNPC(sessionId, npc.id, updates);
    
    // Обновляем локальную переменную для broadcast
    Object.assign(npc, updates);
    
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
    
    console.log(`[NPCAIManager] Broadcast action to location "${npc.locationId}"`);
  }
}

// ==================== SINGLETON EXPORT ====================

export const npcAIManager = NPCAIManager.getInstance();

export function getNPCAIManager(): NPCAIManager {
  return NPCAIManager.getInstance();
}
