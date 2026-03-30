/**
 * ============================================================================
 * NPC AI CONTROLLER - ИИ поведение временных NPC
 * ============================================================================
 * 
 * Реализует ИИ поведение для TempNPC:
 * - Патрулирование
 * - Преследование игрока
 * - Атака
 * - Бегство при низком HP
 * 
 * АРХИТЕКТУРА: Все взаимодействия через Event Bus!
 * 
 * Версия: 1.0.0
 */

import type { TempNPC, AIBehaviorConfig } from '@/types/temp-npc';
import { EventBus } from '@/lib/game/event-bus';
import type { NPCMoveEvent, NPCAttackPlayerEvent, NPCStateChangeEvent } from '@/lib/game/events/game-events';
import { sessionNPCManager } from '@/lib/game/session-npc-manager';
import { TRAINING_GROUND_CONFIG } from '@/types/temp-npc';
import { DEFAULT_LOCATION_ID } from '@/data/presets/location-presets';

// ==================== ТИПЫ ====================

export interface NPCBehaviorState {
  npcId: string;
  currentState: 'idle' | 'patrol' | 'chase' | 'attack' | 'flee';
  targetId?: string;
  lastStateChange: number;
  patrolPoints?: { x: number; y: number }[];
  currentPatrolIndex: number;
}

// BehaviorConfig использует те же поля что и AIBehaviorConfig
export type BehaviorConfig = AIBehaviorConfig;

export interface PlayerPosition {
  id: string;
  x: number;
  y: number;
}

export interface NPCMoveEventData {
  npcId: string;
  targetX: number;
  targetY: number;
  speed: number;
}

export interface NPCAttackEventData {
  npcId: string;
  targetId: string;
  techniqueId?: string;
  damage?: number;
}

export interface NPCStateChangeEventData {
  npcId: string;
  oldState?: string;
  newState: NPCBehaviorState['currentState'];
}

export interface NPCAITickData {
  timestamp: number;
}

// ==================== КОНСТАНТЫ ====================

const DEFAULT_BEHAVIOR: BehaviorConfig = {
  agroRadius: 200,       // 200 пикселей (~6 метров)
  patrolRadius: 100,     // 100 пикселей (~3 метра)
  fleeThreshold: 0.2,    // 20% HP
  attackRange: 50,       // 50 пикселей (~1.5 метра)
  chaseSpeed: 150,       // пиксели/секунда
  patrolSpeed: 50,       // пиксели/секунда
};

// ==================== ЭМИТТЕР СОБЫТИЙ ====================

type AIEventHandler = (event: string, data: unknown) => void;
let globalEventHandler: AIEventHandler | null = null;

export function setAIEventHandler(handler: AIEventHandler): void {
  globalEventHandler = handler;
}

function emitAIEvent(event: string, data: unknown): void {
  if (globalEventHandler) {
    globalEventHandler(event, data);
  }
  // Также отправляем через window для клиентской части
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
}

// ==================== КЛАСС КОНТРОЛЛЕРА ====================
export class NPCAIController {
  private states: Map<string, NPCBehaviorState> = new Map();
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private tickCallbacks: Set<(npcs: TempNPC[], players: PlayerPosition[]) => void> = new Set();
  
  constructor() {
    this.startUpdateLoop();
  }
  
  // ==================== PUBLIC METHODS ====================
  
  /**
   * Регистрация NPC в ИИ контроллере
   */
  registerNPC(npc: TempNPC, config?: Partial<BehaviorConfig>): void {
    const behaviorConfig = { ...DEFAULT_BEHAVIOR, ...config };
    
    // Сохранить конфиг в NPC
    npc.aiConfig = behaviorConfig;
    
    this.states.set(npc.id, {
      npcId: npc.id,
      currentState: 'idle',
      lastStateChange: Date.now(),
      patrolPoints: this.generatePatrolPoints(npc, behaviorConfig.patrolRadius),
      currentPatrolIndex: 0,
    });
    
    console.log(`[NPCAI] Registered NPC ${npc.id} with behavior config`);
  }
  
  /**
   * Массовая регистрация NPC
   */
  registerNPCs(npcs: TempNPC[], config?: Partial<BehaviorConfig>): void {
    for (const npc of npcs) {
      this.registerNPC(npc, config);
    }
  }
  
  /**
   * Обновление состояния ИИ для одного NPC
   */
  updateNPC(npc: TempNPC, players: PlayerPosition[]): void {
    const state = this.states.get(npc.id);
    if (!state) return;
    
    const config = npc.aiConfig ?? DEFAULT_BEHAVIOR;
    const npcX = npc.position?.x ?? 0;
    const npcY = npc.position?.y ?? 0;
    
    // 1. Проверка бегства (приоритет)
    const hpPercent = npc.bodyState.health / npc.bodyState.maxHealth;
    
    if (hpPercent <= config.fleeThreshold) {
      this.changeState(state, 'flee');
      this.executeFlee(npc, state, players);
      return;
    }
    
    // 2. Поиск ближайшего игрока
    const nearestPlayer = this.findNearestPlayer(npcX, npcY, players, config.agroRadius);
    
    // 3. Принятие решения
    if (nearestPlayer) {
      const distance = this.distance(npcX, npcY, nearestPlayer.x, nearestPlayer.y);
      
      if (distance <= config.attackRange) {
        this.changeState(state, 'attack');
        this.executeAttack(npc, nearestPlayer);
      } else {
        this.changeState(state, 'chase');
        this.executeChase(npc, state, nearestPlayer, config);
      }
    } else {
      // Нет игроков в зоне агрессии - патрулирование
      this.changeState(state, 'patrol');
      this.executePatrol(npc, state, config);
    }
  }
  
  /**
   * Обновление всех NPC
   */
  updateAllNPCs(npcs: TempNPC[], players: PlayerPosition[]): void {
    for (const npc of npcs) {
      if (!npc.bodyState.isDead && !npc.bodyState.isUnconscious) {
        this.updateNPC(npc, players);
      }
    }
  }
  
  /**
   * Удаление NPC из ИИ
   */
  unregisterNPC(npcId: string): void {
    this.states.delete(npcId);
    console.log(`[NPCAI] Unregistered NPC ${npcId}`);
  }
  
  /**
   * Получение состояния NPC
   */
  getNPCState(npcId: string): NPCBehaviorState | undefined {
    return this.states.get(npcId);
  }
  
  /**
   * Остановка ИИ контроллера
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.states.clear();
    console.log('[NPCAI] Controller stopped');
  }
  
  /**
   * Очистка всех состояний
   */
  clear(): void {
    this.states.clear();
    console.log('[NPCAI] Controller cleared');
  }
  
  // ==================== PRIVATE METHODS ====================
  
  /**
   * Генерация точек патрулирования
   */
  private generatePatrolPoints(
    npc: TempNPC,
    radius: number
  ): { x: number; y: number }[] {
    const baseX = npc.position?.x ?? 0;
    const baseY = npc.position?.y ?? 0;
    const points: { x: number; y: number }[] = [];
    
    // Генерация 3-5 точек патруля
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      points.push({
        x: baseX + Math.cos(angle) * radius * (0.5 + Math.random() * 0.5),
        y: baseY + Math.sin(angle) * radius * (0.5 + Math.random() * 0.5),
      });
    }
    
    return points;
  }
  
  /**
   * Смена состояния
   */
  private changeState(state: NPCBehaviorState, newState: NPCBehaviorState['currentState']): void {
    if (state.currentState !== newState) {
      state.currentState = newState;
      state.lastStateChange = Date.now();
      
      emitAIEvent('npc:state_change', {
        npcId: state.npcId,
        oldState: state.currentState,
        newState,
      });
    }
  }
  
  /**
   * Выполнение атаки
   */
  private executeAttack(npc: TempNPC, target: PlayerPosition): void {
    emitAIEvent('npc:attack', {
      npcId: npc.id,
      targetId: target.id,
      techniqueId: npc.techniques?.[0], // Первая доступная техника
      damage: npc.stats?.strength * 2, // Базовый урон от NPC уровня
    });
  }
  
  /**
   * Преследование
   */
  private executeChase(
    npc: TempNPC,
    state: NPCBehaviorState,
    target: PlayerPosition,
    config: BehaviorConfig
  ): void {
    state.targetId = target.id;
    
    // Движение к цели
    emitAIEvent('npc:move', {
      npcId: npc.id,
      targetX: target.x,
      targetY: target.y,
      speed: config.chaseSpeed,
    });
  }
  
  /**
   * Патрулирование
   */
  private executePatrol(
    npc: TempNPC,
    state: NPCBehaviorState,
    config: BehaviorConfig
  ): void {
    if (!state.patrolPoints || state.patrolPoints.length === 0) return;
    
    const targetPoint = state.patrolPoints[state.currentPatrolIndex];
    const npcX = npc.position?.x ?? 0;
    const npcY = npc.position?.y ?? 0;
    
    // Достигли точки патруля?
    if (this.distance(npcX, npcY, targetPoint.x, targetPoint.y) < 10) {
      state.currentPatrolIndex = (state.currentPatrolIndex + 1) % state.patrolPoints.length;
    }
    
    const nextPoint = state.patrolPoints[state.currentPatrolIndex];
    
    emitAIEvent('npc:move', {
      npcId: npc.id,
      targetX: nextPoint.x,
      targetY: nextPoint.y,
      speed: config.patrolSpeed,
    });
  }
  
  /**
   * Бегство
   */
  private executeFlee(
    npc: TempNPC,
    state: NPCBehaviorState,
    players: PlayerPosition[]
  ): void {
    if (players.length === 0) return;
    
    // Бежать от ближайшего игрока
    const nearestPlayer = this.findNearestPlayer(
      npc.position?.x ?? 0,
      npc.position?.y ?? 0,
      players,
      Infinity
    );
    
    if (!nearestPlayer) return;
    
    // Направление ОТ игрока
    const dx = (npc.position?.x ?? 0) - nearestPlayer.x;
    const dy = (npc.position?.y ?? 0) - nearestPlayer.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    
    const fleeX = (npc.position?.x ?? 0) + (dx / dist) * 150;
    const fleeY = (npc.position?.y ?? 0) + (dy / dist) * 150;
    
    emitAIEvent('npc:move', {
      npcId: npc.id,
      targetX: fleeX,
      targetY: fleeY,
      speed: 200, // Быстрее обычного
    });
  }
  
  /**
   * Поиск ближайшего игрока в радиусе
   */
  private findNearestPlayer(
    x: number,
    y: number,
    players: PlayerPosition[],
    maxRadius: number
  ): PlayerPosition | null {
    let nearest: PlayerPosition | null = null;
    let minDist = maxRadius;
    
    for (const player of players) {
      const dist = this.distance(x, y, player.x, player.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = player;
      }
    }
    
    return nearest;
  }
  
  /**
   * Расстояние между точками
   */
  private distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
  
  /**
   * Запуск цикла обновления
   */
  private startUpdateLoop(): void {
    // 10 FPS для ИИ (каждые 100мс)
    this.updateInterval = setInterval(() => {
      emitAIEvent('npc_ai:tick', { timestamp: Date.now() });
    }, 100);
  }
}

// ==================== SINGLETON ====================
let controllerInstance: NPCAIController | null = null;
/**
 * Получить глобальный инстанс контроллера
 */
export function getNPCAIController(): NPCAIController {
  if (!controllerInstance) {
    controllerInstance = new NPCAIController();
  }
  return controllerInstance;
}
// Экспорт singleton для удобства
export const npcAIController = getNPCAIController();
