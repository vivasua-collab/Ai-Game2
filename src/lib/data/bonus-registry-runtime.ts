/**
 * RUNTIME BONUS REGISTRY
 * 
 * Единый реестр бонусов для генерации экипировки, техник и артефактов.
 * 
 * === АРХИТЕКТУРА "МАТРЁШКА" ===
 * 
 * 1. Базовый объект (привязан к уровню)
 *    - Базовые параметры (damage, defense, qiCond)
 *    - Рассчитываются от уровня предмета
 * 
 * 2. Материал (надстройка, даёт бонусы)
 *    - Бонусы от типа материала
 *    - Множители от тира (T1-T5)
 * 
 * 3. Грейд/Редкость (множители и дополнительные бонусы)
 *    - Множители параметров
 *    - Дополнительные бонусы (0-6 в зависимости от грейда)
 */

import { 
  BonusCategory,
  GeneratedBonus,
} from '@/types/bonus-registry';

// ============================================================================
// RUNTIME TYPES
// ============================================================================

/**
 * Упрощённое определение бонуса для runtime
 * 
 * Используется для генерации бонусов без необходимости указывать
 * все поля полного BonusDefinition
 */
interface RuntimeBonusDefinition {
  id: string;
  category: BonusCategory;
  name: string;
  description?: string;
  baseValue: number;
  levelScaling?: number;
  isMultiplier?: boolean;
  variance?: number;
}

// ============================================================================
// RUNTIME REGISTRY CLASS
// ============================================================================

/**
 * Runtime реестр бонусов
 */
class BonusRegistryRuntime {
  private definitions: Map<string, RuntimeBonusDefinition> = new Map();
  private byCategory: Map<BonusCategory, RuntimeBonusDefinition[]> = new Map();
  
  /**
   * Зарегистрировать определение бонуса
   */
  register(definition: RuntimeBonusDefinition): void {
    this.definitions.set(definition.id, definition);
    
    const category = definition.category;
    if (!this.byCategory.has(category)) {
      this.byCategory.set(category, []);
    }
    this.byCategory.get(category)!.push(definition);
  }
  
  /**
   * Получить определение по ID
   */
  get(id: string): RuntimeBonusDefinition | undefined {
    return this.definitions.get(id);
  }
  
  /**
   * Получить все бонусы категории
   */
  getByCategory(category: BonusCategory): RuntimeBonusDefinition[] {
    return this.byCategory.get(category) ?? [];
  }
  
  /**
   * Проверить существование бонуса
   */
  has(id: string): boolean {
    return this.definitions.has(id);
  }
  
  /**
   * Получить все зарегистрированные бонусы
   */
  getAll(): RuntimeBonusDefinition[] {
    return Array.from(this.definitions.values());
  }
  
  /**
   * Сгенерировать бонусы для объекта
   */
  generate(
    objectType: string,
    level: number,
    grade: string,
    count: number,
    rng: () => number = Math.random
  ): GeneratedBonus[] {
    const applicableCategories = this.getApplicableCategories(objectType);
    const bonuses: GeneratedBonus[] = [];
    const usedTypes = new Set<string>();
    
    for (let i = 0; i < count; i++) {
      const category = this.selectCategory(applicableCategories, rng);
      const definitions = this.getByCategory(category).filter(
        d => !usedTypes.has(d.id)
      );
      
      if (definitions.length === 0) continue;
      
      const definition = definitions[Math.floor(rng() * definitions.length)];
      usedTypes.add(definition.id);
      
      const value = this.calculateValue(definition, level, grade, rng);
      
      bonuses.push({
        id: `${definition.id}_${Date.now()}_${i}`,
        name: definition.name,
        type: definition.id,
        value,
        valueType: definition.isMultiplier ? 'multiplier' : 'flat',
        displayText: `${definition.name}: ${value >= 0 ? '+' : ''}${value}${definition.isMultiplier ? '%' : ''}`,
        isMultiplier: definition.isMultiplier ?? false,
      });
    }
    
    return bonuses;
  }
  
  /**
   * Получить применимые категории для типа объекта
   */
  private getApplicableCategories(objectType: string): BonusCategory[] {
    const mapping: Record<string, BonusCategory[]> = {
      weapon: ['combat', 'elemental', 'special'],
      armor: ['defense', 'elemental', 'special'],
      charger: ['qi', 'elemental', 'special'],
      technique: ['combat', 'qi', 'elemental', 'condition'],
      artifact: ['special', 'elemental'],
      accessory: ['utility', 'special', 'defense'],
    };
    
    return mapping[objectType] ?? ['utility'];
  }
  
  /**
   * Выбрать категорию (весовой выбор)
   */
  private selectCategory(
    categories: BonusCategory[], 
    rng: () => number
  ): BonusCategory {
    const weights: Partial<Record<BonusCategory, number>> = {
      combat: 30,
      defense: 30,
      qi: 20,
      qi_technique: 15,
      elemental: 15,
      condition: 10,
      special: 5,
      utility: 10,
    };
    
    const weighted = categories.flatMap(c => 
      Array(weights[c] ?? 1).fill(c)
    );
    
    return weighted[Math.floor(rng() * weighted.length)] ?? categories[0];
  }
  
  /**
   * Рассчитать значение бонуса
   */
  private calculateValue(
    definition: RuntimeBonusDefinition,
    level: number,
    grade: string,
    rng: () => number
  ): number {
    const baseValue = definition.baseValue ?? 1;
    const variance = definition.variance ?? 0.2;
    
    const levelBonus = level * (definition.levelScaling ?? 0.5);
    const gradeMultiplier = this.getGradeMultiplier(grade);
    const randomFactor = 1 - variance + (rng() * variance * 2);
    
    if (definition.isMultiplier) {
      // Для множителей — округление до сотых
      return Math.round((baseValue + levelBonus * 0.1) * 100) / 100;
    }
    
    // Для обычных значений — целое число
    return Math.floor((baseValue + levelBonus) * gradeMultiplier * randomFactor);
  }
  
  /**
   * Множитель грейда
   */
  private getGradeMultiplier(grade: string): number {
    const multipliers: Record<string, number> = {
      damaged: 0.5,
      common: 1.0,
      refined: 1.3,
      perfect: 1.7,
      transcendent: 2.5,
    };
    return multipliers[grade] ?? 1.0;
  }
  
  /**
   * Получить информацию о бонусе для UI
   */
  getBonusInfo(bonusId: string): {
    name: string;
    description: string;
    category: BonusCategory;
  } | null {
    const def = this.definitions.get(bonusId);
    if (!def) return null;
    
    return {
      name: def.name,
      description: def.description ?? '',
      category: def.category,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const bonusRegistry = new BonusRegistryRuntime();

// ============================================================================
// DEFAULT BONUS DEFINITIONS
// ============================================================================

/**
 * Инициализация дефолтных бонусов
 */
function initializeDefaultBonuses(): void {
  // ==================== COMBAT BONUSES ====================
  
  bonusRegistry.register({
    id: 'combat_damage',
    category: 'combat',
    name: 'Урон',
    description: 'Увеличивает наносимый урон',
    baseValue: 5,
    levelScaling: 2,
    isMultiplier: false,
    variance: 0.25,
  });
  
  bonusRegistry.register({
    id: 'combat_crit_chance',
    category: 'combat',
    name: 'Шанс крита',
    description: 'Увеличивает шанс критического удара',
    baseValue: 2,
    levelScaling: 0.5,
    isMultiplier: false,
    variance: 0.3,
  });
  
  bonusRegistry.register({
    id: 'combat_crit_damage',
    category: 'combat',
    name: 'Урон крита',
    description: 'Увеличивает урон критического удара',
    baseValue: 10,
    levelScaling: 3,
    isMultiplier: false,
    variance: 0.2,
  });
  
  bonusRegistry.register({
    id: 'combat_armor_penetration',
    category: 'combat',
    name: 'Пробитие брони',
    description: 'Пробивает броню противника',
    baseValue: 5,
    levelScaling: 1,
    isMultiplier: false,
    variance: 0.25,
  });
  
  bonusRegistry.register({
    id: 'combat_attack_speed',
    category: 'combat',
    name: 'Скорость атаки',
    description: 'Увеличивает скорость атаки',
    baseValue: 3,
    levelScaling: 0.5,
    isMultiplier: false,
    variance: 0.2,
  });
  
  bonusRegistry.register({
    id: 'combat_range',
    category: 'combat',
    name: 'Дальность атаки',
    description: 'Увеличивает дальность атак',
    baseValue: 5,
    levelScaling: 1,
    isMultiplier: false,
    variance: 0.2,
  });
  
  // ==================== DEFENSE BONUSES ====================
  
  bonusRegistry.register({
    id: 'defense_armor',
    category: 'defense',
    name: 'Броня',
    description: 'Снижает получаемый физический урон',
    baseValue: 5,
    levelScaling: 2,
    isMultiplier: false,
    variance: 0.25,
  });
  
  bonusRegistry.register({
    id: 'defense_evasion',
    category: 'defense',
    name: 'Уклонение',
    description: 'Шанс уклониться от атаки',
    baseValue: 2,
    levelScaling: 0.5,
    isMultiplier: false,
    variance: 0.3,
  });
  
  bonusRegistry.register({
    id: 'defense_hp',
    category: 'defense',
    name: 'Здоровье',
    description: 'Увеличивает максимальное здоровье',
    baseValue: 20,
    levelScaling: 10,
    isMultiplier: false,
    variance: 0.2,
  });
  
  bonusRegistry.register({
    id: 'defense_block',
    category: 'defense',
    name: 'Блок',
    description: 'Шанс заблокировать атаку',
    baseValue: 3,
    levelScaling: 1,
    isMultiplier: false,
    variance: 0.25,
  });
  
  bonusRegistry.register({
    id: 'defense_resistance',
    category: 'defense',
    name: 'Сопротивление',
    description: 'Снижает эффекты контроля',
    baseValue: 5,
    levelScaling: 1,
    isMultiplier: false,
    variance: 0.25,
  });
  
  // ==================== QI BONUSES ====================
  
  bonusRegistry.register({
    id: 'qi_regeneration',
    category: 'qi',
    name: 'Регенерация Ци',
    description: 'Скорость восстановления Ци',
    baseValue: 2,
    levelScaling: 1,
    isMultiplier: false,
    variance: 0.25,
  });
  
  bonusRegistry.register({
    id: 'qi_cost_reduction',
    category: 'qi',
    name: 'Снижение стоимости Ци',
    description: 'Снижает стоимость техник в Ци',
    baseValue: 5,
    levelScaling: 1,
    isMultiplier: false,
    variance: 0.2,
  });
  
  bonusRegistry.register({
    id: 'qi_conductivity',
    category: 'qi',
    name: 'Проводимость Ци',
    description: 'Увеличивает проводимость меридиан',
    baseValue: 5,
    levelScaling: 2,
    isMultiplier: false,
    variance: 0.25,
  });
  
  bonusRegistry.register({
    id: 'qi_capacity',
    category: 'qi',
    name: 'Ёмкость ядра',
    description: 'Увеличивает ёмкость ядра Ци',
    baseValue: 50,
    levelScaling: 20,
    isMultiplier: false,
    variance: 0.2,
  });
  
  // ==================== ELEMENTAL BONUSES ====================
  
  bonusRegistry.register({
    id: 'elemental_fire',
    category: 'elemental',
    name: 'Огненная сила',
    description: 'Усиливает огненные техники',
    baseValue: 10,
    levelScaling: 3,
    isMultiplier: false,
    variance: 0.25,
  });
  
  bonusRegistry.register({
    id: 'elemental_cold',
    category: 'elemental',
    name: 'Ледяная сила',
    description: 'Усиливает ледяные техники',
    baseValue: 10,
    levelScaling: 3,
    isMultiplier: false,
    variance: 0.25,
  });
  
  bonusRegistry.register({
    id: 'elemental_lightning',
    category: 'elemental',
    name: 'Грозовая сила',
    description: 'Усиливает грозовые техники',
    baseValue: 10,
    levelScaling: 3,
    isMultiplier: false,
    variance: 0.25,
  });
  
  bonusRegistry.register({
    id: 'elemental_earth',
    category: 'elemental',
    name: 'Земляная сила',
    description: 'Усиливает земляные техники',
    baseValue: 10,
    levelScaling: 3,
    isMultiplier: false,
    variance: 0.25,
  });
  
  bonusRegistry.register({
    id: 'elemental_wind',
    category: 'elemental',
    name: 'Ветряная сила',
    description: 'Усиливает ветряные техники',
    baseValue: 10,
    levelScaling: 3,
    isMultiplier: false,
    variance: 0.25,
  });
  
  // ==================== SPECIAL BONUSES ====================
  
  bonusRegistry.register({
    id: 'special_life_steal',
    category: 'special',
    name: 'Вампиризм',
    description: 'Восстанавливает здоровье при нанесении урона',
    baseValue: 3,
    levelScaling: 0.5,
    isMultiplier: false,
    variance: 0.3,
  });
  
  bonusRegistry.register({
    id: 'special_thorns',
    category: 'special',
    name: 'Шипы',
    description: 'Отражает урон атакующему',
    baseValue: 5,
    levelScaling: 1,
    isMultiplier: false,
    variance: 0.25,
  });
  
  bonusRegistry.register({
    id: 'special_luck',
    category: 'special',
    name: 'Удача',
    description: 'Увеличивает шанс редких находок',
    baseValue: 5,
    levelScaling: 1,
    isMultiplier: false,
    variance: 0.3,
  });
  
  bonusRegistry.register({
    id: 'special_exp_bonus',
    category: 'special',
    name: 'Бонус опыта',
    description: 'Увеличивает получаемый опыт',
    baseValue: 5,
    levelScaling: 1,
    isMultiplier: false,
    variance: 0.2,
  });
  
  // ==================== UTILITY BONUSES ====================
  
  bonusRegistry.register({
    id: 'utility_move_speed',
    category: 'utility',
    name: 'Скорость передвижения',
    description: 'Увеличивает скорость передвижения',
    baseValue: 5,
    levelScaling: 1,
    isMultiplier: false,
    variance: 0.2,
  });
  
  bonusRegistry.register({
    id: 'utility_pickup_range',
    category: 'utility',
    name: 'Радиус подбора',
    description: 'Увеличивает радиус автоматического подбора',
    baseValue: 10,
    levelScaling: 2,
    isMultiplier: false,
    variance: 0.2,
  });
  
  bonusRegistry.register({
    id: 'utility_capacity',
    category: 'utility',
    name: 'Вместимость',
    description: 'Увеличивает вместимость хранилища',
    baseValue: 2,
    levelScaling: 0.5,
    isMultiplier: false,
    variance: 0.2,
  });
  
  bonusRegistry.register({
    id: 'utility_stealth',
    category: 'utility',
    name: 'Скрытность',
    description: 'Снижает шанс обнаружения',
    baseValue: 5,
    levelScaling: 1,
    isMultiplier: false,
    variance: 0.3,
  });
}

// Инициализация при импорте
initializeDefaultBonuses();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Получить название бонуса для UI
 */
export function getBonusDisplayName(bonusId: string): string {
  const info = bonusRegistry.getBonusInfo(bonusId);
  return info?.name ?? bonusId;
}

/**
 * Форматировать бонус для отображения
 */
export function formatBonusValue(bonus: GeneratedBonus): string {
  const sign = bonus.value >= 0 ? '+' : '';
  const name = bonus.name ?? getBonusDisplayName(bonus.type ?? bonus.id);
  
  if (bonus.isMultiplier) {
    return `${name}: ${sign}${bonus.value}%`;
  }
  
  return `${name}: ${sign}${bonus.value}`;
}
