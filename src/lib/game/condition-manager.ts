/**
 * CONDITION MANAGER
 * 
 * Управление активными состояниями на сущностях.
 * 
 * === ФУНКЦИИ ===
 * 
 * - applyCondition(): Наложение состояния
 * - removeCondition(): Снятие состояния
 * - tickConditions(): Обработка тиков (DoT, HoT)
 * - checkConditionExpiry(): Проверка истечения
 * - checkConditionIncompatibility(): Проверка несовместимости
 */

import { ActiveCondition, ConditionTickResult } from '@/types/bonus-registry';
import { conditionRegistry, ConditionDefinition } from './condition-registry';

// ============================================================================
// TYPES
// ============================================================================

export interface ConditionTarget {
  id: string;
  health: number;
  maxHealth: number;
  conditions: ActiveCondition[];
  
  // Для расширенной обработки
  qi?: number;
  shield?: number;
}

export interface ApplyConditionResult {
  success: boolean;
  condition?: ActiveCondition;
  removedConditions?: string[];
  reason?: string;
}

export interface TickResult {
  targetId: string;
  totalDamage: number;
  totalHealing: number;
  expiredConditions: string[];
  tickResults: ConditionTickResult[];
}

// ============================================================================
// CONDITION MANAGER CLASS
// ============================================================================

class ConditionManagerClass {
  
  // ==================== APPLY CONDITIONS ====================
  
  /**
   * Наложить состояние на цель
   */
  applyCondition(
    target: ConditionTarget,
    conditionId: string,
    source: ActiveCondition['source'],
    sourceId?: string,
    value?: number,
    duration?: number
  ): ApplyConditionResult {
    const def = conditionRegistry.get(conditionId);
    
    if (!def) {
      return { success: false, reason: `Unknown condition: ${conditionId}` };
    }
    
    // Проверка несовместимости
    const incompatible = this.findIncompatible(target, conditionId);
    if (incompatible.length > 0) {
      // Удаляем несовместимые состояния
      for (const inc of incompatible) {
        this.removeCondition(target, inc);
      }
    }
    
    // Проверка существующего состояния
    const existing = target.conditions.find(c => c.id === conditionId);
    
    if (existing && def.canStack) {
      // Увеличиваем стаки
      const maxStacks = def.maxStacks ?? 5;
      existing.stacks = Math.min((existing.stacks ?? 1) + 1, maxStacks);
      existing.duration = duration ?? def.defaultDuration; // Обновляем длительность
      existing.maxDuration = existing.duration;
      
      return { 
        success: true, 
        condition: existing,
        removedConditions: incompatible,
      };
    }
    
    if (existing && !def.canStack) {
      // Обновляем длительность
      existing.duration = duration ?? def.defaultDuration;
      existing.maxDuration = existing.duration;
      existing.value = value ?? existing.value;
      
      return { 
        success: true, 
        condition: existing,
        removedConditions: incompatible,
      };
    }
    
    // Создаём новое состояние
    const newCondition = conditionRegistry.createActive(
      conditionId,
      source,
      sourceId,
      value,
      duration
    );
    
    if (!newCondition) {
      return { success: false, reason: 'Failed to create condition' };
    }
    
    target.conditions.push(newCondition);
    
    return { 
      success: true, 
      condition: newCondition,
      removedConditions: incompatible,
    };
  }
  
  /**
   * Найти несовместимые состояния
   */
  private findIncompatible(target: ConditionTarget, conditionId: string): string[] {
    const def = conditionRegistry.get(conditionId);
    if (!def) return [];
    
    const incompatible: string[] = [];
    
    for (const active of target.conditions) {
      // Проверяем, является ли активное состояние несовместимым с новым
      if (def.incompatibleWith.includes(active.id)) {
        incompatible.push(active.id);
      }
      
      // Проверяем обратную несовместимость
      const activeDef = conditionRegistry.get(active.id);
      if (activeDef?.incompatibleWith.includes(conditionId)) {
        if (!incompatible.includes(active.id)) {
          incompatible.push(active.id);
        }
      }
    }
    
    return incompatible;
  }
  
  // ==================== REMOVE CONDITIONS ====================
  /**
   * Снять состояние с цели
   */
  removeCondition(target: ConditionTarget, conditionId: string): boolean {
    const index = target.conditions.findIndex(c => c.id === conditionId);
    
    if (index === -1) return false;
    
    target.conditions.splice(index, 1);
    return true;
  }
  
  /**
   * Снять все состояния определённого типа
   */
  removeConditionsByType(target: ConditionTarget, type: 'buff' | 'debuff'): string[] {
    const removed: string[] = [];
    
    const defs = type === 'buff' 
      ? conditionRegistry.getBuffs() 
      : conditionRegistry.getDebuffs();
    
    const ids = new Set(defs.map(d => d.id));
    
    target.conditions = target.conditions.filter(c => {
      if (ids.has(c.id)) {
        removed.push(c.id);
        return false;
      }
      return true;
    });
    
    return removed;
  }
  
  /**
   * Снять все состояния от источника
   */
  removeConditionsBySource(target: ConditionTarget, sourceId: string): string[] {
    const removed: string[] = [];
    
    target.conditions = target.conditions.filter(c => {
      if (c.sourceId === sourceId) {
        removed.push(c.id);
        return false;
      }
      return true;
    });
    
    return removed;
  }
  
  /**
   * Очистить все состояния
   */
  clearAllConditions(target: ConditionTarget): string[] {
    const removed = target.conditions.map(c => c.id);
    target.conditions = [];
    return removed;
  }
  
  // ==================== TICK PROCESSING ====================
  
  /**
   * Обработать тики всех состояний
   */
  tickConditions(target: ConditionTarget, deltaTime: number = 1000): TickResult {
    const result: TickResult = {
      targetId: target.id,
      totalDamage: 0,
      totalHealing: 0,
      expiredConditions: [],
      tickResults: [],
    };
    
    const now = Date.now();
    
    for (const condition of target.conditions) {
      // Проверка тика
      const tickInterval = condition.tickInterval ?? 1000;
      const timeSinceLastTick = now - (condition.lastTick ?? now);
      
      if (timeSinceLastTick < tickInterval) {
        continue;
      }
      
      // Обновляем время последнего тика
      condition.lastTick = now;
      
      // Обрабатываем тик
      const tickResult = this.processConditionTick(target, condition);
      result.tickResults.push(tickResult);
      
      // Суммируем урон и лечение
      if (tickResult.damage > 0) {
        result.totalDamage += tickResult.damage;
      }
      if (tickResult.healAmount && tickResult.healAmount > 0) {
        result.totalHealing += tickResult.healAmount;
      }
    }
    
    // Применяем урон и лечение
    if (result.totalDamage > 0) {
      target.health = Math.max(0, target.health - result.totalDamage);
    }
    if (result.totalHealing > 0) {
      target.health = Math.min(target.maxHealth, target.health + result.totalHealing);
    }
    
    // Проверяем истечение
    result.expiredConditions = this.checkConditionExpiry(target, deltaTime);
    
    return result;
  }
  
  /**
   * Обработать тик одного состояния
   */
  private processConditionTick(
    target: ConditionTarget,
    condition: ActiveCondition
  ): ConditionTickResult {
    const def = conditionRegistry.get(condition.id);
    
    if (!def) {
      return { damage: 0, effect: 'none' };
    }
    
    const result: ConditionTickResult = {
      damage: 0,
      effect: 'none',
    };
    
    // DoT (damage over time)
    if (def.damagePerTick) {
      result.damage = conditionRegistry.calculateDoTDamage(condition);
      result.effect = 'dot';
    }
    
    // HoT (heal over time)
    if (def.healPerTick) {
      result.healAmount = conditionRegistry.calculateHoTHealing(condition);
      result.effect = 'buff';
    }
    
    // Slow (замедление)
    if (def.slowPercent) {
      result.slowPercent = def.slowPercent;
      result.effect = 'slow';
    }
    
    // Stun (оглушение) - проверка при каждом тике
    if (condition.id === 'condition_stun') {
      result.effect = 'stun';
      result.duration = condition.duration;
    }
    
    return result;
  }
  
  // ==================== EXPIRY ====================
  
  /**
   * Проверить истечение состояний
   */
  checkConditionExpiry(target: ConditionTarget, deltaTime: number): string[] {
    const expired: string[] = [];
    
    target.conditions = target.conditions.filter(condition => {
      condition.duration -= deltaTime;
      
      if (condition.duration <= 0) {
        expired.push(condition.id);
        return false;
      }
      
      return true;
    });
    
    return expired;
  }
  
  // ==================== QUERIES ====================
  
  /**
   * Проверить наличие состояния
   */
  hasCondition(target: ConditionTarget, conditionId: string): boolean {
    return target.conditions.some(c => c.id === conditionId);
  }
  
  /**
   * Получить состояние по ID
   */
  getCondition(target: ConditionTarget, conditionId: string): ActiveCondition | undefined {
    return target.conditions.find(c => c.id === conditionId);
  }
  
  /**
   * Получить все баффы
   */
  getBuffs(target: ConditionTarget): ActiveCondition[] {
    const buffIds = new Set(conditionRegistry.getBuffs().map(d => d.id));
    return target.conditions.filter(c => buffIds.has(c.id));
  }
  
  /**
   * Получить все дебаффы
   */
  getDebuffs(target: ConditionTarget): ActiveCondition[] {
    const debuffIds = new Set(conditionRegistry.getDebuffs().map(d => d.id));
    return target.conditions.filter(c => debuffIds.has(c.id));
  }
  
  /**
   * Проверить, оглушена ли цель
   */
  isStunned(target: ConditionTarget): boolean {
    return this.hasCondition(target, 'condition_stun') ||
           this.hasCondition(target, 'condition_freezing');
  }
  
  /**
   * Проверить, замедлена ли цель
   */
  isSlowed(target: ConditionTarget): boolean {
    return this.hasCondition(target, 'condition_slow') ||
           this.hasCondition(target, 'condition_freezing');
  }
  
  /**
   * Проверить, может ли цель использовать техники
   */
  canUseTechniques(target: ConditionTarget): boolean {
    return !this.hasCondition(target, 'condition_silence') &&
           !this.hasCondition(target, 'condition_stun');
  }
  
  /**
   * Получить множитель скорости
   */
  getSpeedMultiplier(target: ConditionTarget): number {
    const modifiers = conditionRegistry.getActiveModifiers(target.conditions);
    
    // Базовая скорость = 1.0
    let multiplier = 1.0;
    
    // Применяем бонус скорости
    if (modifiers.speedBonus > 0) {
      multiplier *= (1 + modifiers.speedBonus / 100);
    }
    
    // Применяем замедление
    if (modifiers.slowPercent > 0) {
      multiplier *= (1 - modifiers.slowPercent / 100);
    }
    
    return Math.max(0.1, multiplier); // Минимум 10% скорости
  }
  
  /**
   * Получить множитель урона
   */
  getDamageMultiplier(target: ConditionTarget): number {
    const modifiers = conditionRegistry.getActiveModifiers(target.conditions);
    
    let multiplier = 1.0;
    
    if (modifiers.damageBonus !== 0) {
      multiplier *= (1 + modifiers.damageBonus / 100);
    }
    
    if (modifiers.statReduction > 0) {
      multiplier *= (1 - modifiers.statReduction / 100);
    }
    
    return Math.max(0.1, multiplier);
  }
  
  /**
   * Получить множитель защиты
   */
  getDefenseMultiplier(target: ConditionTarget): number {
    const modifiers = conditionRegistry.getActiveModifiers(target.conditions);
    
    let multiplier = 1.0;
    
    if (modifiers.defenseBonus !== 0) {
      multiplier *= (1 + modifiers.defenseBonus / 100);
    }
    
    if (modifiers.defenseReduction > 0) {
      multiplier *= (1 - modifiers.defenseReduction / 100);
    }
    
    return Math.max(0.1, multiplier);
  }
  
  /**
   * Получить все модификаторы от активных состояний
   * Wrapper for conditionRegistry.getActiveModifiers
   */
  getActiveModifiers(conditions: ActiveCondition[]): {
    damageBonus: number;
    damageReduction: number;
    defenseBonus: number;
    defenseReduction: number;
    speedBonus: number;
    slowPercent: number;
    statReduction: number;
  } {
    return conditionRegistry.getActiveModifiers(conditions);
  }
  
  // ==================== UTILITY ====================
  
  /**
   * Получить сводку состояний для UI
   */
  getConditionSummary(target: ConditionTarget): {
    buffs: { id: string; name: string; icon: string; remaining: number }[];
    debuffs: { id: string; name: string; icon: string; remaining: number }[];
    speedMultiplier: number;
    damageMultiplier: number;
    defenseMultiplier: number;
    isStunned: boolean;
    isSilenced: boolean;
  } {
    const buffs = this.getBuffs(target).map(c => {
      const def = conditionRegistry.get(c.id);
      return {
        id: c.id,
        name: def?.name ?? c.id,
        icon: def?.icon ?? '❓',
        remaining: Math.ceil(c.duration / 1000),
      };
    });
    
    const debuffs = this.getDebuffs(target).map(c => {
      const def = conditionRegistry.get(c.id);
      return {
        id: c.id,
        name: def?.name ?? c.id,
        icon: def?.icon ?? '❓',
        remaining: Math.ceil(c.duration / 1000),
      };
    });
    
    return {
      buffs,
      debuffs,
      speedMultiplier: this.getSpeedMultiplier(target),
      damageMultiplier: this.getDamageMultiplier(target),
      defenseMultiplier: this.getDefenseMultiplier(target),
      isStunned: this.isStunned(target),
      isSilenced: this.hasCondition(target, 'condition_silence'),
    };
  }
  
  /**
   * Сериализовать состояния для сохранения
   */
  serializeConditions(conditions: ActiveCondition[]): string {
    return JSON.stringify(conditions);
  }
  
  /**
   * Десериализовать состояния
   */
  deserializeConditions(json: string): ActiveCondition[] {
    try {
      return JSON.parse(json) as ActiveCondition[];
    } catch {
      return [];
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const conditionManager = new ConditionManagerClass();
