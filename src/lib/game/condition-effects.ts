/**
 * CONDITION EFFECTS
 * 
 * Применение эффектов состояний в бою.
 * 
 * === ФУНКЦИИ ===
 * 
 * - processConditionTick(): Обработка тика состояния
 * - calculateConditionDamage(): Расчёт урона DoT
 * - applyConditionModifiers(): Применение модификаторов
 * - processBuffs(): Обработка баффов
 * - processDebuffs(): Обработка дебаффов
 * 
 * === ИНТЕГРАЦИЯ С БОЕВОЙ СИСТЕМОЙ ===
 * 
 * 1. При атаке: проверить silence, stun
 * 2. При получении урона: проверить shield, reflect
 * 3. Каждый тик: обработать DoT, HoT
 */

import { ActiveCondition, ConditionTickResult } from '@/types/bonus-registry';
import { conditionRegistry, ConditionDefinition } from './condition-registry';
import { conditionManager, ConditionTarget } from './condition-manager';

// ============================================================================
// TYPES
// ============================================================================

export interface CombatEntity {
  id: string;
  health: number;
  maxHealth: number;
  conditions: ActiveCondition[];
  
  // Боевые параметры
  baseDamage: number;
  baseDefense: number;
  baseSpeed: number;
  qi?: number;
  maxQi?: number;
  shield?: number;
  
  // Для обработчика
  onDamage?: (amount: number, source: string) => void;
  onHeal?: (amount: number, source: string) => void;
  onConditionApplied?: (condition: ActiveCondition) => void;
  onConditionRemoved?: (conditionId: string) => void;
}

export interface ConditionEffectResult {
  damage: number;
  healing: number;
  shieldDamage: number;
  reflectedDamage: number;
  effects: AppliedEffect[];
  expiredConditions: string[];
}

export interface AppliedEffect {
  conditionId: string;
  type: 'dot' | 'hot' | 'buff' | 'debuff' | 'shield' | 'reflect';
  value: number;
  description: string;
}

export interface DamageModifiers {
  damageMultiplier: number;
  defenseMultiplier: number;
  speedMultiplier: number;
  critChance: number;
  critDamage: number;
  armorPenetration: number;
  lifeSteal: number;
  thorns: number;
}

// ============================================================================
// CONDITION EFFECTS CLASS
// ============================================================================

class ConditionEffectsClass {

  // ==================== MAIN PROCESSORS ====================

  /**
   * Обработать все эффекты состояний за тик
   */
  processTick(entity: CombatEntity, deltaTime: number = 1000): ConditionEffectResult {
    const result: ConditionEffectResult = {
      damage: 0,
      healing: 0,
      shieldDamage: 0,
      reflectedDamage: 0,
      effects: [],
      expiredConditions: [],
    };

    const now = Date.now();

    for (const condition of entity.conditions) {
      const def = conditionRegistry.get(condition.id);
      if (!def) continue;

      // Проверка интервала тика
      const tickInterval = condition.tickInterval ?? 1000;
      const timeSinceLastTick = now - (condition.lastTick ?? now);

      if (timeSinceLastTick < tickInterval) {
        continue;
      }

      // Обновляем время последнего тика
      condition.lastTick = now;

      // Обрабатываем эффекты по типу
      this.processConditionEffect(entity, condition, def, result);
    }

    // Проверяем истечение состояний
    result.expiredConditions = this.checkExpiry(entity, deltaTime);

    // Применяем результаты
    this.applyResults(entity, result);

    return result;
  }

  /**
   * Обработать эффект одного состояния
   */
  private processConditionEffect(
    entity: CombatEntity,
    condition: ActiveCondition,
    def: ConditionDefinition,
    result: ConditionEffectResult
  ): void {
    // DoT (Damage over Time)
    if (def.damagePerTick && def.damagePerTick > 0) {
      const damage = this.calculateDoTDamage(condition, def);
      result.damage += damage;
      result.effects.push({
        conditionId: condition.id,
        type: 'dot',
        value: damage,
        description: `${def.name}: ${damage} урона`,
      });
    }

    // HoT (Heal over Time)
    if (def.healPerTick && def.healPerTick > 0) {
      const healing = this.calculateHoTHealing(condition, def);
      result.healing += healing;
      result.effects.push({
        conditionId: condition.id,
        type: 'hot',
        value: healing,
        description: `${def.name}: ${healing} лечения`,
      });
    }

    // Shield absorption (обрабатывается при получении урона, здесь только тик)
    if (condition.id === 'condition_shield') {
      result.effects.push({
        conditionId: condition.id,
        type: 'shield',
        value: entity.shield ?? 0,
        description: `Щит активен: ${entity.shield ?? 0} HP`,
      });
    }

    // Reflect (обрабатывается при получении урона)
    if (condition.id === 'condition_reflect') {
      result.effects.push({
        conditionId: condition.id,
        type: 'reflect',
        value: def.damageReduction ?? 20,
        description: `Отражение: ${def.damageReduction ?? 20}%`,
      });
    }
  }

  // ==================== DAMAGE CALCULATIONS ====================

  /**
   * Рассчитать урон DoT
   */
  calculateDoTDamage(condition: ActiveCondition, def: ConditionDefinition): number {
    let damage = def.damagePerTick ?? 0;

    // Увеличение от стаков
    if (def.canStack && condition.stacks) {
      damage *= condition.stacks;
    }

    // Увеличение от value (силы эффекта)
    if (condition.value && condition.value > 0) {
      damage = Math.floor(damage * (condition.value / 10));
    }

    return damage;
  }

  /**
   * Рассчитать лечение HoT
   */
  calculateHoTHealing(condition: ActiveCondition, def: ConditionDefinition): number {
    let healing = def.healPerTick ?? 0;

    // Увеличение от value (силы эффекта)
    if (condition.value && condition.value > 0) {
      healing = Math.floor(healing * (condition.value / 10));
    }

    return healing;
  }

  /**
   * Применить входящий урон с учётом состояний
   */
  processIncomingDamage(
    entity: CombatEntity,
    damage: number,
    source?: CombatEntity
  ): {
    finalDamage: number;
    shieldAbsorbed: number;
    reflectedDamage: number;
    conditionsTriggered: string[];
  } {
    const result = {
      finalDamage: damage,
      shieldAbsorbed: 0,
      reflectedDamage: 0,
      conditionsTriggered: [],
    };

    // Проверяем щит
    if (entity.shield && entity.shield > 0) {
      if (entity.shield >= damage) {
        result.shieldAbsorbed = damage;
        entity.shield -= damage;
        result.finalDamage = 0;
      } else {
        result.shieldAbsorbed = entity.shield;
        result.finalDamage = damage - entity.shield;
        entity.shield = 0;
      }
      result.conditionsTriggered.push('condition_shield');
    }

    // Проверяем отражение
    const reflectCondition = entity.conditions.find(c => c.id === 'condition_reflect');
    if (reflectCondition && source && result.finalDamage > 0) {
      const def = conditionRegistry.get('condition_reflect');
      const reflectPercent = def?.damageReduction ?? 20;
      result.reflectedDamage = Math.floor(result.finalDamage * reflectPercent / 100);
      result.conditionsTriggered.push('condition_reflect');
    }

    // Проверяем снижение урона (fortify)
    const fortifyCondition = entity.conditions.find(c => c.id === 'condition_fortify');
    if (fortifyCondition && result.finalDamage > 0) {
      const def = conditionRegistry.get('condition_fortify');
      const reduction = def?.damageReduction ?? 10;
      result.finalDamage = Math.floor(result.finalDamage * (1 - reduction / 100));
      result.conditionsTriggered.push('condition_fortify');
    }

    // Проклятие увеличивает получаемый урон
    const curseCondition = entity.conditions.find(c => c.id === 'condition_curse');
    if (curseCondition && result.finalDamage > 0) {
      const def = conditionRegistry.get('condition_curse');
      const reduction = def?.statReduction ?? 20;
      result.finalDamage = Math.floor(result.finalDamage * (1 + reduction / 100));
      result.conditionsTriggered.push('condition_curse');
    }

    return result;
  }

  /**
   * Рассчитать исходящий урон с учётом состояний
   */
  processOutgoingDamage(
    entity: CombatEntity,
    baseDamage: number
  ): {
    finalDamage: number;
    isCritical: boolean;
    conditionsTriggered: string[];
  } {
    const result = {
      finalDamage: baseDamage,
      isCritical: false,
      conditionsTriggered: [],
    };

    // Берсерк увеличивает урон
    const berserkCondition = entity.conditions.find(c => c.id === 'condition_berserk');
    if (berserkCondition) {
      const def = conditionRegistry.get('condition_berserk');
      const bonus = def?.damageBonus ?? 50;
      result.finalDamage = Math.floor(result.finalDamage * (1 + bonus / 100));
      result.conditionsTriggered.push('condition_berserk');
    }

    // Слабость уменьшает урон
    const weaknessCondition = entity.conditions.find(c => c.id === 'condition_weakness');
    if (weaknessCondition) {
      const def = conditionRegistry.get('condition_weakness');
      const reduction = Math.abs(def?.damageBonus ?? 20);
      result.finalDamage = Math.floor(result.finalDamage * (1 - reduction / 100));
      result.conditionsTriggered.push('condition_weakness');
    }

    // Проклятие уменьшает урон
    const curseCondition = entity.conditions.find(c => c.id === 'condition_curse');
    if (curseCondition) {
      const def = conditionRegistry.get('condition_curse');
      const reduction = def?.statReduction ?? 20;
      result.finalDamage = Math.floor(result.finalDamage * (1 - reduction / 100));
      result.conditionsTriggered.push('condition_curse');
    }

    return result;
  }

  // ==================== MODIFIERS ====================

  /**
   * Получить все модификаторы от состояний
   */
  getDamageModifiers(entity: CombatEntity): DamageModifiers {
    const modifiers: DamageModifiers = {
      damageMultiplier: 1.0,
      defenseMultiplier: 1.0,
      speedMultiplier: 1.0,
      critChance: 0,
      critDamage: 0,
      armorPenetration: 0,
      lifeSteal: 0,
      thorns: 0,
    };

    for (const condition of entity.conditions) {
      const def = conditionRegistry.get(condition.id);
      if (!def) continue;

      // Урон
      if (def.damageBonus && def.damageBonus > 0) {
        modifiers.damageMultiplier *= (1 + def.damageBonus / 100);
      } else if (def.damageBonus && def.damageBonus < 0) {
        modifiers.damageMultiplier *= (1 + def.damageBonus / 100);
      }

      // Защита
      if (def.defenseBonus && def.defenseBonus > 0) {
        modifiers.defenseMultiplier *= (1 + def.defenseBonus / 100);
      } else if (def.defenseReduction && def.defenseReduction > 0) {
        modifiers.defenseMultiplier *= (1 - def.defenseReduction / 100);
      }

      // Скорость
      if (def.speedBonus && def.speedBonus > 0) {
        modifiers.speedMultiplier *= (1 + def.speedBonus / 100);
      } else if (def.slowPercent && def.slowPercent > 0) {
        modifiers.speedMultiplier *= (1 - def.slowPercent / 100);
      }

      // Снижение всех характеристик
      if (def.statReduction && def.statReduction > 0) {
        modifiers.damageMultiplier *= (1 - def.statReduction / 100);
        modifiers.defenseMultiplier *= (1 - def.statReduction / 100);
        modifiers.speedMultiplier *= (1 - def.statReduction / 100);
      }
    }

    // Минимумы
    modifiers.damageMultiplier = Math.max(0.1, modifiers.damageMultiplier);
    modifiers.defenseMultiplier = Math.max(0.1, modifiers.defenseMultiplier);
    modifiers.speedMultiplier = Math.max(0.1, modifiers.speedMultiplier);

    return modifiers;
  }

  /**
   * Получить модификатор скорости
   */
  getSpeedModifier(entity: CombatEntity): number {
    let multiplier = 1.0;

    for (const condition of entity.conditions) {
      const def = conditionRegistry.get(condition.id);
      if (!def) continue;

      if (def.speedBonus) {
        multiplier *= (1 + def.speedBonus / 100);
      }
      if (def.slowPercent) {
        multiplier *= (1 - def.slowPercent / 100);
      }
      if (def.statReduction) {
        multiplier *= (1 - def.statReduction / 100);
      }
    }

    return Math.max(0.1, multiplier);
  }

  // ==================== STATE CHECKS ====================

  /**
   * Проверить, может ли сущность действовать
   */
  canAct(entity: CombatEntity): { canAct: boolean; reason?: string } {
    // Оглушение
    if (entity.conditions.some(c => c.id === 'condition_stun')) {
      return { canAct: false, reason: 'Оглушение' };
    }

    // Заморозка (может полностью заморозить при определённых условиях)
    const freezing = entity.conditions.find(c => c.id === 'condition_freezing');
    if (freezing) {
      // Шанс 20% быть полностью замороженным
      if (Math.random() < 0.2) {
        return { canAct: false, reason: 'Заморожен' };
      }
    }

    // Страх (может заставить бежать)
    if (entity.conditions.some(c => c.id === 'condition_fear')) {
      // 50% шанс, что существо в страхе и не может действовать нормально
      if (Math.random() < 0.5) {
        return { canAct: false, reason: 'Страх' };
      }
    }

    return { canAct: true };
  }

  /**
   * Проверить, может ли сущность использовать техники
   */
  canUseTechniques(entity: CombatEntity): { canUse: boolean; reason?: string } {
    // Безмолвие
    if (entity.conditions.some(c => c.id === 'condition_silence')) {
      return { canUse: false, reason: 'Безмолвие' };
    }

    // Оглушение также блокирует техники
    if (entity.conditions.some(c => c.id === 'condition_stun')) {
      return { canUse: false, reason: 'Оглушение' };
    }

    return { canUse: true };
  }

  /**
   * Проверить, является ли существо невидимым
   */
  isInvisible(entity: CombatEntity): boolean {
    return entity.conditions.some(c => c.id === 'condition_invisibility');
  }

  // ==================== UTILITY ====================

  /**
   * Проверить истечение состояний
   */
  private checkExpiry(entity: CombatEntity, deltaTime: number): string[] {
    const expired: string[] = [];

    entity.conditions = entity.conditions.filter(condition => {
      condition.duration -= deltaTime;

      if (condition.duration <= 0) {
        expired.push(condition.id);

        // Удаляем щит при истечении
        if (condition.id === 'condition_shield') {
          entity.shield = 0;
        }

        return false;
      }

      return true;
    });

    return expired;
  }

  /**
   * Применить результаты обработки
   */
  private applyResults(entity: CombatEntity, result: ConditionEffectResult): void {
    // Урон
    if (result.damage > 0) {
      entity.health = Math.max(0, entity.health - result.damage);
      entity.onDamage?.(result.damage, 'condition');
    }

    // Лечение
    if (result.healing > 0) {
      entity.health = Math.min(entity.maxHealth, entity.health + result.healing);
      entity.onHeal?.(result.healing, 'condition');
    }
  }

  // ==================== COMBAT INTEGRATION ====================

  /**
   * Создать цель для ConditionManager из CombatEntity
   */
  toConditionTarget(entity: CombatEntity): ConditionTarget {
    return {
      id: entity.id,
      health: entity.health,
      maxHealth: entity.maxHealth,
      conditions: entity.conditions,
      qi: entity.qi,
      shield: entity.shield,
    };
  }

  /**
   * Применить состояние к CombatEntity
   */
  applyCondition(
    entity: CombatEntity,
    conditionId: string,
    source: ActiveCondition['source'],
    sourceId?: string,
    value?: number,
    duration?: number
  ): boolean {
    const target = this.toConditionTarget(entity);
    const result = conditionManager.applyCondition(target, conditionId, source, sourceId, value, duration);

    if (result.success && result.condition) {
      // Синхронизируем обратно
      entity.conditions = target.conditions;

      // Особые эффекты при наложении
      if (conditionId === 'condition_shield') {
        const def = conditionRegistry.get(conditionId);
        entity.shield = (entity.shield ?? 0) + (value ?? def?.baseValue ?? 50);
      }

      entity.onConditionApplied?.(result.condition);
      return true;
    }

    return false;
  }

  /**
   * Снять состояние с CombatEntity
   */
  removeCondition(entity: CombatEntity, conditionId: string): boolean {
    const target = this.toConditionTarget(entity);
    const removed = conditionManager.removeCondition(target, conditionId);

    if (removed) {
      entity.conditions = target.conditions;

      // Удаляем щит
      if (conditionId === 'condition_shield') {
        entity.shield = 0;
      }

      entity.onConditionRemoved?.(conditionId);
      return true;
    }

    return false;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const conditionEffects = new ConditionEffectsClass();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Получить иконку типа эффекта
 */
export function getEffectTypeIcon(type: AppliedEffect['type']): string {
  const icons: Record<AppliedEffect['type'], string> = {
    dot: '🔥',
    hot: '💚',
    buff: '⬆️',
    debuff: '⬇️',
    shield: '🛡️',
    reflect: '↩️',
  };
  return icons[type];
}

/**
 * Получить цвет типа эффекта
 */
export function getEffectTypeColor(type: AppliedEffect['type']): string {
  const colors: Record<AppliedEffect['type'], string> = {
    dot: 'text-red-400',
    hot: 'text-green-400',
    buff: 'text-blue-400',
    debuff: 'text-orange-400',
    shield: 'text-cyan-400',
    reflect: 'text-purple-400',
  };
  return colors[type];
}
