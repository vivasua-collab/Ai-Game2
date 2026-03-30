/**
 * ============================================================================
 * SPINAL SERVER - Адаптер SpinalController для сервера
 * ============================================================================
 * 
 * Адаптирует клиентский SpinalController для работы на сервере.
 * Использует NPCState вместо SpinalBodyState.
 * 
 * @see src/lib/game/ai/spinal/spinal-controller.ts
 * @see src/lib/game/types/npc-state.ts
 */

import { SpinalController, createSpinalController } from '../spinal/spinal-controller';
import type { SpinalSignal, SpinalAction, SpinalBodyState, SpinalPresetType } from '../spinal/types';
import type { NPCState, NPCAction } from '@/lib/game/types';

// ==================== ТИПЫ ====================

/**
 * Состояние NPC для Spinal AI (упрощённое)
 */
export interface SpinalNPCState {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  facing: number;
  hp: number;
  maxHp: number;
  qi: number;
  maxQi: number;
  isGrounded: boolean;
  isMoving: boolean;
  isInCombat: boolean;
  isSuppressed: boolean;
  isNearEdge: boolean;
  nearbyAllies: number;
  nearestThreat?: {
    id: string;
    position: { x: number; y: number };
    distance: number;
    level?: number;
  };
}

// ==================== КОНСТАНТЫ ====================

/**
 * Маппинг пресетов NPC на Spinal пресеты
 */
const NPC_PRESET_TO_SPINAL: Record<string, SpinalPresetType> = {
  'monster': 'monster',
  'guard': 'guard',
  'passerby': 'passerby',
  'cultivator': 'cultivator',
  // Fallback
  'civilian': 'passerby',
  'elder': 'cultivator',
  'patrol': 'guard',
};

// ==================== КЛАСС ====================

/**
 * SpinalServerController - серверная обёртка для SpinalController
 */
export class SpinalServerController {
  private controller: SpinalController;
  private npcId: string;
  private preset: SpinalPresetType;
  
  constructor(npcId: string, preset: string = 'passerby') {
    this.npcId = npcId;
    this.preset = NPC_PRESET_TO_SPINAL[preset] || 'passerby';
    this.controller = createSpinalController(npcId, this.preset);
  }
  
  /**
   * Обновить AI и получить действие
   */
  update(deltaMs: number, npc: NPCState, signal: SpinalSignal | null): NPCAction | null {
    // Конвертируем NPCState в SpinalBodyState
    const bodyState = this.npcStateToBodyState(npc);
    
    // Если есть сигнал, отправляем его
    if (signal) {
      this.controller.receiveSignal(signal);
    }
    
    // Получаем действие от SpinalController
    const spinalAction = this.controller.update(deltaMs, bodyState);
    
    if (spinalAction) {
      return this.convertToNPCAction(spinalAction, npc);
    }
    
    return null;
  }
  
  /**
   * Отправить сигнал в контроллер
   */
  receiveSignal(signal: SpinalSignal): void {
    this.controller.receiveSignal(signal);
  }
  
  /**
   * Загрузить другой пресет
   */
  loadPreset(preset: SpinalPresetType): void {
    this.controller.loadPreset(preset);
    this.preset = preset;
  }
  
  /**
   * Получить текущий пресет
   */
  getPreset(): SpinalPresetType {
    return this.preset;
  }
  
  /**
   * Сбросить состояние
   */
  reset(): void {
    this.controller.reset();
  }
  
  // ==================== PRIVATE ====================
  
  /**
   * Конвертация NPCState в SpinalBodyState
   */
  private npcStateToBodyState(npc: NPCState): SpinalBodyState {
    return {
      position: { x: npc.x, y: npc.y },
      velocity: { x: 0, y: 0 }, // TODO: добавить velocity в NPCState
      facing: npc.facing,
      hp: npc.health,
      maxHp: npc.maxHealth,
      qi: npc.qi,
      maxQi: npc.maxQi,
      isGrounded: true, // TODO: добавить в NPCState
      isMoving: npc.currentAction?.type === 'move' || npc.currentAction?.type === 'chase',
      isInCombat: npc.aiState === 'attack' || npc.aiState === 'chase',
      isSuppressed: false, // TODO: добавить в NPCState
      isNearEdge: false, // TODO: добавить в NPCState
      nearbyAllies: 0, // TODO: вычислять
      nearestThreat: npc.targetId ? {
        id: npc.targetId,
        position: { x: 0, y: 0 }, // TODO: получать из WorldState
        distance: 0,
      } : undefined,
    };
  }
  
  /**
   * Конвертация SpinalAction в NPCAction
   */
  private convertToNPCAction(spinalAction: SpinalAction, npc: NPCState): NPCAction {
    // Маппинг типов действий
    const actionTypeMap: Record<string, NPCAction['type']> = {
      'dodge': 'dodge',
      'flinch': 'flinch',
      'step_back': 'move',
      'stumble': 'flinch',
      'turn_to_sound': 'move',
      'balance': 'idle',
      'qi_shield': 'idle', // TODO: добавить qi_shield действие
      'freeze': 'idle',
      'flee': 'flee',
      'alert': 'idle',
    };
    
    const actionType = actionTypeMap[spinalAction.type] || 'idle';
    
    // Создаём NPCAction
    const npcAction: NPCAction = {
      type: actionType,
      startTime: Date.now(),
      duration: spinalAction.params.duration || 500,
      sourceReflex: spinalAction.sourceReflex,
    };
    
    // Добавляем параметры
    if (spinalAction.params.direction) {
      // Вычисляем целевую точку для движения
      const distance = spinalAction.params.distance || 50;
      npcAction.target = {
        x: npc.x + spinalAction.params.direction.x * distance,
        y: npc.y + spinalAction.params.direction.y * distance,
      };
    }
    
    if (spinalAction.params.speed) {
      npcAction.params = {
        speed: spinalAction.params.speed,
      };
    }
    
    return npcAction;
  }
}

// ==================== ФАБРИКИ ====================

/**
 * Создать SpinalServerController
 */
export function createSpinalServerController(npcId: string, preset?: string): SpinalServerController {
  return new SpinalServerController(npcId, preset);
}

/**
 * Создать SpinalSignal из данных игрока/NPC
 */
export function createSpinalSignal(
  type: SpinalSignal['type'],
  intensity: number,
  source: { id: string; x: number; y: number },
  target: { x: number; y: number }
): SpinalSignal {
  // Вычисляем направление от источника к цели
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  
  return {
    type,
    intensity,
    direction: { x: dx / len, y: dy / len },
    source: source.id,
    timestamp: Date.now(),
  };
}

/**
 * Создать сигнал атаки игрока
 */
export function createAttackSignal(
  playerId: string,
  playerX: number,
  playerY: number,
  npcX: number,
  npcY: number,
  damage: number
): SpinalSignal {
  return createSpinalSignal(
    'danger_nearby',
    Math.min(1.0, damage / 50), // Интенсивность зависит от урона
    { id: playerId, x: playerX, y: playerY },
    { x: npcX, y: npcY }
  );
}

/**
 * Создать сигнал игрока рядом
 */
export function createPlayerNearbySignal(
  playerId: string,
  playerX: number,
  playerY: number,
  npcX: number,
  npcY: number,
  distance: number,
  maxDistance: number = 300
): SpinalSignal {
  return createSpinalSignal(
    'player_nearby',
    1.0 - (distance / maxDistance), // Интенсивность убывает с расстоянием
    { id: playerId, x: playerX, y: playerY },
    { x: npcX, y: npcY }
  );
}
