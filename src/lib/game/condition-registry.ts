/**
 * CONDITION REGISTRY
 * 
 * Runtime реестр состояний (баффов и дебаффов).
 * 
 * === АРХИТЕКТУРА ===
 * 
 * Состояния накладываются через техники Ци и экипировку.
 * Эффект зависит от количества вложенной Ци и качества ядра практика.
 * 
 * === БАФФЫ ===
 * - haste: +30% скорость атаки
 * - regeneration: +10 HP/тик
 * - clarity: +50% регенерация Ци
 * - fortify: +30% защита
 * - berserk: +50% урон, -20% защита
 * - invisibility: Невидимость
 * - shield: Поглощает N урона
 * - reflect: Отражает 20% урона
 * 
 * === ДЕБАФФЫ ===
 * - burning: 5 урона/тик (огонь)
 * - freezing: -50% скорость, может заморозить
 * - poison: 3 урона/тик, стакается
 * - stun: Оглушение (нет действий)
 * - slow: -30% скорость
 * - weakness: -20% урон
 * - silence: Нельзя использовать техники
 * - bleed: 4 урона/тик, игнорирует броню
 * - curse: -20% все характеристики
 * - fear: Бегство от источника
 */

import {
  BonusDefinition,
  ActiveCondition,
  ConditionTickResult,
  Element,
} from '@/types/bonus-registry';

// ============================================================================
// TYPES
// ============================================================================

export type ConditionType = 'buff' | 'debuff';

export interface ConditionDefinition {
  id: string;
  name: string;
  nameEn: string;
  type: ConditionType;
  element?: Element;
  
  // Эффекты
  damagePerTick?: number;         // DoT урон за тик
  healPerTick?: number;           // HoT лечение за тик
  slowPercent?: number;           // Замедление %
  speedBonus?: number;            // Бонус скорости %
  damageBonus?: number;           // Бонус урона %
  damageReduction?: number;       // Снижение урона %
  defenseBonus?: number;          // Бонус защиты %
  defenseReduction?: number;      // Снижение защиты %
  statReduction?: number;         // Снижение всех характеристик %
  
  // Механика
  canStack?: boolean;             // Можно ли стакать
  maxStacks?: number;             // Максимум стаков
  tickInterval: number;           // Интервал тика (мс)
  defaultDuration: number;        // Длительность по умолчанию (мс)
  
  // Конфликты
  incompatibleWith: string[];
  
  // UI
  icon: string;
  color: string;
  description: string;
}

// ============================================================================
// CONDITION DEFINITIONS
// ============================================================================

const CONDITION_DEFINITIONS: ConditionDefinition[] = [
  // ==================== БАФФЫ ====================
  
  {
    id: 'condition_haste',
    name: 'Ускорение',
    nameEn: 'Haste',
    type: 'buff',
    speedBonus: 30,
    tickInterval: 1000,
    defaultDuration: 10000,
    incompatibleWith: ['condition_slow'],
    icon: '⚡',
    color: 'text-yellow-400',
    description: 'Скорость атаки +30%',
  },
  
  {
    id: 'condition_regeneration',
    name: 'Регенерация',
    nameEn: 'Regeneration',
    type: 'buff',
    healPerTick: 10,
    tickInterval: 1000,
    defaultDuration: 15000,
    incompatibleWith: ['condition_poison', 'condition_bleed'],
    icon: '💚',
    color: 'text-green-400',
    description: 'Восстановление 10 HP/сек',
  },
  
  {
    id: 'condition_clarity',
    name: 'Ясность',
    nameEn: 'Clarity',
    type: 'buff',
    tickInterval: 1000,
    defaultDuration: 20000,
    incompatibleWith: ['condition_silence'],
    icon: '✨',
    color: 'text-purple-400',
    description: 'Регенерация Ци +50%',
  },
  
  {
    id: 'condition_fortify',
    name: 'Укрепление',
    nameEn: 'Fortify',
    type: 'buff',
    defenseBonus: 30,
    damageReduction: 10,
    tickInterval: 1000,
    defaultDuration: 12000,
    incompatibleWith: [],
    icon: '🛡️',
    color: 'text-blue-400',
    description: 'Защита +30%, снижение урона 10%',
  },
  
  {
    id: 'condition_berserk',
    name: 'Берсерк',
    nameEn: 'Berserk',
    type: 'buff',
    damageBonus: 50,
    defenseReduction: 20,
    tickInterval: 1000,
    defaultDuration: 8000,
    incompatibleWith: ['condition_weakness'],
    icon: '😤',
    color: 'text-red-400',
    description: 'Урон +50%, защита -20%',
  },
  
  {
    id: 'condition_invisibility',
    name: 'Невидимость',
    nameEn: 'Invisibility',
    type: 'buff',
    tickInterval: 1000,
    defaultDuration: 5000,
    incompatibleWith: [],
    icon: '👻',
    color: 'text-gray-400',
    description: 'Невидимость для врагов',
  },
  
  {
    id: 'condition_shield',
    name: 'Энергетический щит',
    nameEn: 'Energy Shield',
    type: 'buff',
    tickInterval: 1000,
    defaultDuration: 30000,
    incompatibleWith: [],
    icon: '🔵',
    color: 'text-cyan-400',
    description: 'Поглощает урон до разрушения',
  },
  
  {
    id: 'condition_reflect',
    name: 'Отражение',
    nameEn: 'Reflect',
    type: 'buff',
    tickInterval: 1000,
    defaultDuration: 15000,
    incompatibleWith: [],
    icon: '↩️',
    color: 'text-orange-400',
    description: 'Отражает 20% урона атакующему',
  },
  
  // ==================== ДЕБАФФЫ ====================
  
  {
    id: 'condition_burning',
    name: 'Горение',
    nameEn: 'Burning',
    type: 'debuff',
    element: 'fire',
    damagePerTick: 5,
    tickInterval: 500,
    defaultDuration: 6000,
    incompatibleWith: ['condition_freezing'],
    icon: '🔥',
    color: 'text-red-500',
    description: '5 урона огнём каждые 0.5 сек',
  },
  
  {
    id: 'condition_freezing',
    name: 'Заморозка',
    nameEn: 'Freezing',
    type: 'debuff',
    element: 'water',
    slowPercent: 50,
    tickInterval: 1000,
    defaultDuration: 4000,
    incompatibleWith: ['condition_burning', 'condition_haste'],
    icon: '❄️',
    color: 'text-cyan-300',
    description: 'Скорость -50%, шанс оглушения',
  },
  
  {
    id: 'condition_poison',
    name: 'Отравление',
    nameEn: 'Poison',
    type: 'debuff',
    element: 'void',
    damagePerTick: 3,
    canStack: true,
    maxStacks: 5,
    tickInterval: 1000,
    defaultDuration: 10000,
    incompatibleWith: ['condition_regeneration'],
    icon: '☠️',
    color: 'text-green-600',
    description: '3 урона/сек, стакается до 5',
  },
  
  {
    id: 'condition_stun',
    name: 'Оглушение',
    nameEn: 'Stun',
    type: 'debuff',
    element: 'lightning',
    tickInterval: 100,
    defaultDuration: 2000,
    incompatibleWith: [],
    icon: '💫',
    color: 'text-yellow-300',
    description: 'Невозможность действовать',
  },
  
  {
    id: 'condition_slow',
    name: 'Замедление',
    nameEn: 'Slow',
    type: 'debuff',
    slowPercent: 30,
    tickInterval: 1000,
    defaultDuration: 8000,
    incompatibleWith: ['condition_haste'],
    icon: '🐌',
    color: 'text-blue-300',
    description: 'Скорость -30%',
  },
  
  {
    id: 'condition_weakness',
    name: 'Слабость',
    nameEn: 'Weakness',
    type: 'debuff',
    damageBonus: -20,
    tickInterval: 1000,
    defaultDuration: 12000,
    incompatibleWith: ['condition_berserk'],
    icon: '😩',
    color: 'text-gray-400',
    description: 'Урон -20%',
  },
  
  {
    id: 'condition_silence',
    name: 'Безмолвие',
    nameEn: 'Silence',
    type: 'debuff',
    tickInterval: 1000,
    defaultDuration: 6000,
    incompatibleWith: ['condition_clarity'],
    icon: '🤐',
    color: 'text-purple-300',
    description: 'Невозможно использовать техники',
  },
  
  {
    id: 'condition_bleed',
    name: 'Кровотечение',
    nameEn: 'Bleed',
    type: 'debuff',
    damagePerTick: 4,
    tickInterval: 1000,
    defaultDuration: 8000,
    incompatibleWith: ['condition_regeneration'],
    icon: '🩸',
    color: 'text-red-600',
    description: '4 урона/сек, игнорирует броню',
  },
  
  {
    id: 'condition_curse',
    name: 'Проклятие',
    nameEn: 'Curse',
    type: 'debuff',
    element: 'void',
    statReduction: 20,
    tickInterval: 1000,
    defaultDuration: 20000,
    incompatibleWith: [],
    icon: '💀',
    color: 'text-violet-500',
    description: 'Все характеристики -20%',
  },
  
  {
    id: 'condition_fear',
    name: 'Страх',
    nameEn: 'Fear',
    type: 'debuff',
    tickInterval: 500,
    defaultDuration: 5000,
    incompatibleWith: [],
    icon: '😱',
    color: 'text-gray-500',
    description: 'Бегство от источника страха',
  },
];

// ============================================================================
// CONDITION REGISTRY CLASS
// ============================================================================

class ConditionRegistryClass {
  private conditions: Map<string, ConditionDefinition> = new Map();
  private buffs: ConditionDefinition[] = [];
  private debuffs: ConditionDefinition[] = [];
  
  constructor() {
    // Инициализация
    for (const def of CONDITION_DEFINITIONS) {
      this.conditions.set(def.id, def);
      
      if (def.type === 'buff') {
        this.buffs.push(def);
      } else {
        this.debuffs.push(def);
      }
    }
  }
  
  // ==================== GETTERS ====================
  
  /**
   * Получить определение состояния по ID
   */
  get(id: string): ConditionDefinition | undefined {
    return this.conditions.get(id);
  }
  
  /**
   * Получить все баффы
   */
  getBuffs(): ConditionDefinition[] {
    return [...this.buffs];
  }
  
  /**
   * Получить все дебаффы
   */
  getDebuffs(): ConditionDefinition[] {
    return [...this.debuffs];
  }
  
  /**
   * Получить все состояния
   */
  getAll(): ConditionDefinition[] {
    return [...this.conditions.values()];
  }
  
  /**
   * Проверить существование состояния
   */
  has(id: string): boolean {
    return this.conditions.has(id);
  }
  
  /**
   * Получить несовместимые состояния
   */
  getIncompatible(id: string): string[] {
    const def = this.conditions.get(id);
    return def?.incompatibleWith ?? [];
  }
  
  /**
   * Проверить совместимость двух состояний
   */
  areCompatible(id1: string, id2: string): boolean {
    const def1 = this.conditions.get(id1);
    const def2 = this.conditions.get(id2);
    
    if (!def1 || !def2) return true;
    
    return !def1.incompatibleWith.includes(id2) && 
           !def2.incompatibleWith.includes(id1);
  }
  
  /**
   * Получить состояния по элементу
   */
  getByElement(element: Element): ConditionDefinition[] {
    return [...this.conditions.values()].filter(
      c => c.element === element
    );
  }
  
  /**
   * Проверить, является ли состояние DoT
   */
  isDoT(id: string): boolean {
    const def = this.conditions.get(id);
    return def?.damagePerTick !== undefined && def.damagePerTick > 0;
  }
  
  /**
   * Проверить, является ли состояние HoT
   */
  isHoT(id: string): boolean {
    const def = this.conditions.get(id);
    return def?.healPerTick !== undefined && def.healPerTick > 0;
  }
  
  /**
   * Проверить, можно ли стакать состояние
   */
  isStackable(id: string): boolean {
    const def = this.conditions.get(id);
    return def?.canStack ?? false;
  }
  
  // ==================== CREATION ====================
  
  /**
   * Создать активное состояние
   */
  createActive(
    id: string,
    source: ActiveCondition['source'],
    sourceId?: string,
    value?: number,
    duration?: number
  ): ActiveCondition | null {
    const def = this.conditions.get(id);
    if (!def) return null;
    
    return {
      id,
      source,
      sourceId,
      value: value ?? def.damagePerTick ?? def.healPerTick ?? 1,
      duration: duration ?? def.defaultDuration,
      maxDuration: duration ?? def.defaultDuration,
      stacks: def.canStack ? 1 : undefined,
      tickInterval: def.tickInterval,
      lastTick: Date.now(),
    };
  }
  
  // ==================== CALCULATIONS ====================
  
  /**
   * Рассчитать итоговый урон DoT
   */
  calculateDoTDamage(condition: ActiveCondition): number {
    const def = this.conditions.get(condition.id);
    if (!def || !def.damagePerTick) return 0;
    
    let damage = def.damagePerTick;
    
    // Увеличение от стаков
    if (def.canStack && condition.stacks) {
      damage *= condition.stacks;
    }
    
    // Увеличение от value (силы эффекта)
    damage = Math.floor(damage * (condition.value / 10));
    
    return damage;
  }
  
  /**
   * Рассчитать итоговое лечение HoT
   */
  calculateHoTHealing(condition: ActiveCondition): number {
    const def = this.conditions.get(condition.id);
    if (!def || !def.healPerTick) return 0;
    
    let healing = def.healPerTick;
    
    // Увеличение от value (силы эффекта)
    healing = Math.floor(healing * (condition.value / 10));
    
    return healing;
  }
  
  /**
   * Получить все модификаторы от активных состояний
   */
  getActiveModifiers(
    conditions: ActiveCondition[]
  ): {
    damageBonus: number;
    damageReduction: number;
    defenseBonus: number;
    defenseReduction: number;
    speedBonus: number;
    slowPercent: number;
    statReduction: number;
  } {
    const result = {
      damageBonus: 0,
      damageReduction: 0,
      defenseBonus: 0,
      defenseReduction: 0,
      speedBonus: 0,
      slowPercent: 0,
      statReduction: 0,
    };
    
    for (const active of conditions) {
      const def = this.conditions.get(active.id);
      if (!def) continue;
      
      if (def.damageBonus) result.damageBonus += def.damageBonus;
      if (def.damageReduction) result.damageReduction += def.damageReduction;
      if (def.defenseBonus) result.defenseBonus += def.defenseBonus;
      if (def.defenseReduction) result.defenseReduction += def.defenseReduction;
      if (def.speedBonus) result.speedBonus += def.speedBonus;
      if (def.slowPercent) result.slowPercent += def.slowPercent;
      if (def.statReduction) result.statReduction += def.statReduction;
    }
    
    return result;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const conditionRegistry = new ConditionRegistryClass();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Получить название состояния для UI
 */
export function getConditionName(id: string): string {
  const def = conditionRegistry.get(id);
  return def?.name ?? id;
}

/**
 * Получить иконку состояния для UI
 */
export function getConditionIcon(id: string): string {
  const def = conditionRegistry.get(id);
  return def?.icon ?? '❓';
}

/**
 * Получить цвет состояния для UI
 */
export function getConditionColor(id: string): string {
  const def = conditionRegistry.get(id);
  return def?.color ?? 'text-gray-400';
}

/**
 * Форматировать состояние для отображения
 */
export function formatCondition(condition: ActiveCondition): string {
  const def = conditionRegistry.get(condition.id);
  if (!def) return condition.id;
  
  let text = `${def.icon} ${def.name}`;
  
  if (def.canStack && condition.stacks) {
    text += ` ×${condition.stacks}`;
  }
  
  const remainingSec = Math.ceil(condition.duration / 1000);
  text += ` (${remainingSec}с)`;
  
  return text;
}
