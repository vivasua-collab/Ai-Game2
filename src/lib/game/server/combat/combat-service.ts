/**
 * ============================================================================
 * COMBAT SERVICE - Серверный сервис боевой системы
 * ============================================================================
 * 
 * Централизованный сервис для обработки боевых действий.
 * Все расчёты происходят ТОЛЬКО на сервере.
 * 
 * Интегрирует:
 * - DamageCalculator (расчёт урона)
 * - TruthSystem (состояние персонажей)
 * - WebSocket (broadcast событий)
 * 
 * @see docs/checkpoints/checkpoint_03_25_phase1_combat.md
 */

import { 
  calculateTechniqueDamage,
  processDamagePipeline,
  type TechniqueDamageParams,
  type DamagePipelineParams,
} from './damage-calculator';
import type {
  CombatResult,
  TechniqueUseResult,
  AttackerParams,
  DefenderParams,
  CombatSubtype,
  ProjectileData,
} from './types';
import { BASE_CAPACITY_BY_COMBAT_SUBTYPE, GRADE_QI_COST_MULTIPLIERS } from './types';

// ==================== ТИПЫ ====================

/**
 * Параметры для использования техники
 */
export interface UseTechniqueParams {
  /** ID сессии игрока */
  sessionId: string;
  /** ID персонажа */
  characterId: string;
  /** ID техники */
  techniqueId: string;
  /** Уровень техники */
  techniqueLevel: number;
  /** Grade техники */
  techniqueGrade: 'common' | 'refined' | 'perfect' | 'transcendent';
  /** Тип техники */
  techniqueType: string;
  /** Подтип combat (если combat) */
  combatSubtype?: CombatSubtype;
  /** Элемент */
  element: string;
  /** Мастерство (0-100) */
  mastery: number;
  /** Целевая позиция X */
  targetX: number;
  /** Целевая позиция Y */
  targetY: number;
  /** Влитое Qi (опционально) */
  qiInput?: number;
  /** Позиция атакующего X */
  attackerX: number;
  /** Позиция атакующего Y */
  attackerY: number;
  /** Уровень культивации */
  cultivationLevel: number;
  /** Текущее Qi */
  currentQi: number;
  /** Максимальное Qi */
  maxQi: number;
  /** Is Ultimate */
  isUltimate?: boolean;
}

/**
 * Параметры для атаки NPC
 */
export interface NPCAttackParams {
  npcId: string;
  targetId: string;
  damage: number;
  attackType: 'melee' | 'ranged';
  npcX: number;
  npcY: number;
  targetX: number;
  targetY: number;
}

/**
 * Состояние персонажа для боя
 */
export interface CharacterCombatState {
  id: string;
  currentHp: number;
  maxHp: number;
  currentQi: number;
  maxQi: number;
  cultivationLevel: number;
  bodyMaterial?: string;
  armor?: number;
  position: { x: number; y: number };
}

/**
 * Состояние NPC для боя
 */
export interface NPCCombatState {
  id: string;
  name: string;
  currentHp: number;
  maxHp: number;
  currentQi: number;
  maxQi: number;
  cultivationLevel: number;
  bodyMaterial?: string;
  armor?: number;
  position: { x: number; y: number };
  isAggressive?: boolean;
}

// ==================== КЭШ СОСТОЯНИЙ ====================

/**
 * Кэш состояний персонажей
 */
const characterStates = new Map<string, CharacterCombatState>();

/**
 * Кэш состояний NPC
 */
const npcStates = new Map<string, NPCCombatState>();

// ==================== ОСНОВНОЙ СЕРВИС ====================

/**
 * Combat Service
 * 
 * Главный класс для обработки боевых действий на сервере.
 */
export class CombatService {
  private static instance: CombatService;
  
  // Callback для broadcast
  private broadcastCallback?: (event: string, data: unknown) => void;
  
  private constructor() {}
  
  static getInstance(): CombatService {
    if (!CombatService.instance) {
      CombatService.instance = new CombatService();
    }
    return CombatService.instance;
  }
  
  /**
   * Установить callback для broadcast
   */
  setBroadcastCallback(callback: (event: string, data: unknown) => void): void {
    this.broadcastCallback = callback;
  }
  
  // ==================== УПРАВЛЕНИЕ СОСТОЯНИЕМ ====================
  
  /**
   * Зарегистрировать персонажа
   */
  registerCharacter(state: CharacterCombatState): void {
    characterStates.set(state.id, state);
  }
  
  /**
   * Зарегистрировать NPC
   */
  registerNPC(state: NPCCombatState): void {
    npcStates.set(state.id, state);
  }
  
  /**
   * Получить состояние персонажа
   */
  getCharacter(id: string): CharacterCombatState | undefined {
    return characterStates.get(id);
  }
  
  /**
   * Получить состояние NPC
   */
  getNPC(id: string): NPCCombatState | undefined {
    return npcStates.get(id);
  }
  
  /**
   * Обновить состояние персонажа
   */
  updateCharacter(id: string, updates: Partial<CharacterCombatState>): void {
    const state = characterStates.get(id);
    if (state) {
      characterStates.set(id, { ...state, ...updates });
    }
  }
  
  /**
   * Обновить состояние NPC
   */
  updateNPC(id: string, updates: Partial<NPCCombatState>): void {
    const state = npcStates.get(id);
    if (state) {
      npcStates.set(id, { ...state, ...updates });
    }
  }
  
  /**
   * Удалить персонажа
   */
  removeCharacter(id: string): void {
    characterStates.delete(id);
  }
  
  /**
   * Удалить NPC
   */
  removeNPC(id: string): void {
    npcStates.delete(id);
  }
  
  // ==================== ИСПОЛЬЗОВАНИЕ ТЕХНИКИ ====================
  
  /**
   * Использовать технику игроком
   * 
   * Это главная функция для обработки техник на сервере.
   * 
   * @returns результат использования техники
   */
  useTechnique(params: UseTechniqueParams): TechniqueUseResult {
    const {
      sessionId,
      characterId,
      techniqueId,
      techniqueLevel,
      techniqueGrade,
      techniqueType,
      combatSubtype,
      element,
      mastery,
      targetX,
      targetY,
      qiInput,
      attackerX,
      attackerY,
      cultivationLevel,
      currentQi,
      maxQi,
      isUltimate = false,
    } = params;
    
    // === 1. РАССЧИТАТЬ УРОН ТЕХНИКИ ===
    
    const damageParams: TechniqueDamageParams = {
      techniqueLevel,
      techniqueType,
      combatSubtype,
      grade: techniqueGrade,
      mastery,
      cultivationLevel,
      isUltimate,
      qiInput,
    };
    
    const damageResult = calculateTechniqueDamage(damageParams);
    
    // === 2. РАССЧИТАТЬ СТОИМОСТЬ QI ===
    
    let qiCost = damageResult.qiCost;
    
    // Ultimate техники стоят +50% Qi
    if (isUltimate) {
      qiCost = Math.floor(qiCost * 1.5);
    }
    
    // Если передано qiInput - использовать его
    if (qiInput !== undefined) {
      qiCost = Math.min(qiInput, qiCost);
    }
    
    // === 3. ПРОВЕРИТЬ ДОСТАТОЧНОСТЬ QI ===
    
    if (currentQi < qiCost) {
      return {
        success: false,
        reason: `Недостаточно Qi (нужно: ${qiCost}, есть: ${currentQi})`,
      };
    }
    
    // === 4. СПИСАТЬ QI ===
    
    const newQi = currentQi - qiCost;
    this.updateCharacter(characterId, { currentQi: newQi });
    
    // === 5. СОЗДАТЬ ДАННЫЕ СНАРЯДА ===
    
    // Определить тип снаряда
    const isMelee = combatSubtype?.startsWith('melee') ?? false;
    
    const projectile: ProjectileData = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      techniqueId,
      element,
      speed: isMelee ? 0 : 300, // Melee - мгновенный
      size: getProjectileSize(techniqueType, combatSubtype),
      color: getElementColor(element),
      startX: attackerX,
      startY: attackerY,
      targetX,
      targetY,
    };
    
    // === 6. ВЕРНУТЬ РЕЗУЛЬТАТ ===
    
    const result: TechniqueUseResult = {
      success: true,
      damage: damageResult.finalDamage,
      currentQi: newQi,
      projectile,
      qiCost,
      techniqueData: {
        capacity: damageResult.capacity,
        baseDamage: damageResult.baseDamage,
        gradeMultiplier: damageResult.gradeMultiplier,
        formula: damageResult.formula,
      },
    };
    
    // Broadcast для других игроков
    this.broadcast('technique:used', {
      characterId,
      techniqueId,
      damage: damageResult.finalDamage,
      projectile,
      qiCost,
      timestamp: Date.now(),
    });
    
    return result;
  }
  
  // ==================== ПОПАДАНИЕ ТЕХНИКИ ====================
  
  /**
   * Обработать попадание техники по цели
   */
  applyTechniqueHit(
    attackerId: string,
    targetId: string,
    techniqueDamage: number,
    techniqueLevel: number,
    attackerLevel: number,
    element: string,
    isUltimate: boolean = false
  ): CombatResult {
    // Получить атакующего
    const attacker = characterStates.get(attackerId) || npcStates.get(attackerId);
    if (!attacker) {
      return this.createFailedResult(attackerId, targetId, 'Атакующий не найден');
    }
    
    // Получить цель
    const target = characterStates.get(targetId) || npcStates.get(targetId);
    if (!target) {
      return this.createFailedResult(attackerId, targetId, 'Цель не найдена');
    }
    
    // Подготовить параметры
    const attackerParams: AttackerParams = {
      id: attackerId,
      cultivationLevel: attackerLevel,
      qiDensity: Math.pow(2, attackerLevel - 1),
      technique: {
        id: 'technique',
        level: techniqueLevel,
        grade: 'common', // Будет переопределено
        type: 'combat',
        element: element as any,
        isUltimate,
      },
      position: attacker.position,
    };
    
    const defenderParams: DefenderParams = {
      id: targetId,
      cultivationLevel: target.cultivationLevel,
      currentHp: target.currentHp,
      maxHp: target.maxHp,
      currentQi: target.currentQi,
      maxQi: target.maxQi,
      bodyMaterial: (target.bodyMaterial as any) || 'organic',
      armor: target.armor,
      position: target.position,
    };
    
    // Обработать через пайплайн
    const result = processDamagePipeline({
      rawDamage: techniqueDamage,
      attacker: attackerParams,
      defender: defenderParams,
      options: {
        attackType: isUltimate ? 'ultimate' : 'technique',
        techniqueLevel,
        isUltimate,
        isQiTechnique: true,
        element,
      },
    });
    
    // Обновить состояние цели
    if (result.success) {
      if (characterStates.has(targetId)) {
        this.updateCharacter(targetId, { currentHp: result.targetHp });
      } else {
        this.updateNPC(targetId, { currentHp: result.targetHp });
      }
      
      // Broadcast результата
      this.broadcast('combat:hit', {
        attackerId,
        targetId,
        damage: result.finalDamage,
        targetHp: result.targetHp,
        targetMaxHp: result.targetMaxHp,
        isDead: result.isDead,
        effects: result.effects,
        timestamp: result.timestamp,
      });
      
      // Если цель умерла
      if (result.isDead) {
        this.broadcast('entity:death', {
          entityId: targetId,
          killerId: attackerId,
          timestamp: Date.now(),
        });
      }
    }
    
    return result;
  }
  
  // ==================== АТАКА NPC ====================
  
  /**
   * Обработать атаку NPC
   */
  processNPCAttack(params: NPCAttackParams): CombatResult {
    const { npcId, targetId, damage, attackType, npcX, npcY, targetX, targetY } = params;
    
    // Получить NPC
    const npc = npcStates.get(npcId);
    if (!npc) {
      return this.createFailedResult(npcId, targetId, 'NPC не найден');
    }
    
    // Получить цель
    const target = characterStates.get(targetId);
    if (!target) {
      return this.createFailedResult(npcId, targetId, 'Игрок не найден');
    }
    
    // Рассчитать расстояние
    const distance = Math.sqrt(
      Math.pow(targetX - npcX, 2) + Math.pow(targetY - npcY, 2)
    );
    
    // Проверить дистанцию атаки
    const maxRange = attackType === 'melee' ? 80 : 300;
    if (distance > maxRange) {
      return this.createFailedResult(npcId, targetId, `Цель слишком далеко (${Math.round(distance)} > ${maxRange})`);
    }
    
    // Подготовить параметры
    const attackerParams: AttackerParams = {
      id: npcId,
      cultivationLevel: npc.cultivationLevel,
      position: { x: npcX, y: npcY },
    };
    
    const defenderParams: DefenderParams = {
      id: targetId,
      cultivationLevel: target.cultivationLevel,
      currentHp: target.currentHp,
      maxHp: target.maxHp,
      currentQi: target.currentQi,
      maxQi: target.maxQi,
      bodyMaterial: (target.bodyMaterial as any) || 'organic',
      armor: target.armor,
      position: { x: targetX, y: targetY },
    };
    
    // Обработать через пайплайн (NPC атака = normal attack)
    const result = processDamagePipeline({
      rawDamage: damage,
      attacker: attackerParams,
      defender: defenderParams,
      options: {
        attackType: 'normal',
        isQiTechnique: false,
      },
    });
    
    // Обновить состояние
    if (result.success) {
      this.updateCharacter(targetId, { currentHp: result.targetHp });
      
      this.broadcast('combat:npc-attack', {
        npcId,
        targetId,
        damage: result.finalDamage,
        attackType,
        targetHp: result.targetHp,
        targetMaxHp: result.targetMaxHp,
        timestamp: result.timestamp,
      });
    }
    
    return result;
  }
  
  // ==================== УТИЛИТЫ ====================
  
  /**
   * Создать результат неудачи
   */
  private createFailedResult(
    attackerId: string,
    targetId: string,
    reason: string
  ): CombatResult {
    return {
      success: false,
      reason,
      attackerId,
      targetId,
      rawDamage: 0,
      finalDamage: 0,
      targetHp: 0,
      targetMaxHp: 0,
      isDead: false,
      effects: [],
      timestamp: Date.now(),
    };
  }
  
  /**
   * Отправить broadcast событие
   */
  private broadcast(event: string, data: unknown): void {
    if (this.broadcastCallback) {
      this.broadcastCallback(event, data);
    }
  }
  
  /**
   * Получить статистику
   */
  getStats(): {
    charactersRegistered: number;
    npcsRegistered: number;
  } {
    return {
      charactersRegistered: characterStates.size,
      npcsRegistered: npcStates.size,
    };
  }
  
  /**
   * Очистить все состояния
   */
  clear(): void {
    characterStates.clear();
    npcStates.clear();
  }
}

// ==================== УТИЛИТЫ ====================

/**
 * Получить размер снаряда по типу техники
 */
function getProjectileSize(techniqueType: string, subtype?: CombatSubtype): number {
  if (subtype === 'melee_strike' || subtype === 'melee_weapon') {
    return 0; // Melee не имеет снаряда
  }
  
  const sizes: Record<string, number> = {
    combat: 24,
    defense: 32,
    healing: 20,
    support: 28,
    movement: 16,
    sensory: 12,
    curse: 24,
    poison: 18,
    formation: 48,
  };
  
  return sizes[techniqueType] ?? 24;
}

/**
 * Получить цвет стихии
 */
function getElementColor(element: string): string {
  const colors: Record<string, string> = {
    fire: '#ff4444',
    water: '#4488ff',
    earth: '#886644',
    air: '#88ff88',
    lightning: '#ffff44',
    void: '#9944ff',
    neutral: '#888888',
    poison: '#44ff44',
  };
  return colors[element] ?? colors.neutral;
}

// ==================== ЭКСПОРТ ====================

export const combatService = CombatService.getInstance();
