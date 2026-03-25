/**
 * ============================================================================
 * КОНФИГУРАЦИЯ ГЕНЕРАТОРА ТЕХНИК V2
 * ============================================================================
 *
 * Принципы V2:
 * - qiCost = baseCapacity(type) × 2^(level-1)
 * - damage = capacity × gradeMult
 * - capacity = baseCapacity × 2^(level-1) × masteryBonus
 *
 * @see docs/technique-system-v2.md
 * @see docs/matryoshka-architecture.md
 */

import type { TechniqueGrade } from '@/types/grade';
import type {
  TechniqueType,
  CombatSubtype,
  TechniqueElement,
} from '@/types/technique-types';

// ==================== СЛОЙ 1: БАЗА ====================

/**
 * Расчёт затрат Ци на технику
 *
 * Формула из документации:
 * qiCost = baseCapacity(type) × 2^(level-1)
 *
 * Где baseCapacity берётся из констант по типу техники.
 * masteryBonus НЕ учитывается в qiCost - это базовые затраты.
 *
 * Для cultivation: qiCost = 0 (пассивная техника)
 *
 * @param baseCapacity - базовая ёмкость типа техники
 * @param level - уровень техники (1-9)
 * @returns затраты Ци или 0 для пассивных техник
 */
export function calculateQiCost(baseCapacity: number | null, level: number): number {
  if (baseCapacity === null) return 0; // cultivation
  return Math.floor(baseCapacity * Math.pow(2, level - 1));
}

/**
 * Расчёт урона техники
 *
 * Формула из документации:
 * damage = capacity × gradeMult
 *
 * Где capacity = baseCapacity × 2^(level-1) × masteryBonus
 *
 * @param capacity - ёмкость техники (с учётом mastery)
 * @param gradeMult - множитель Grade (1.0 ~ 1.6)
 * @returns итоговый урон
 */
export function calculateDamage(capacity: number, gradeMult: number): number {
  return Math.floor(capacity * gradeMult);
}

// ==================== СЛОЙ 2: ГРЕЙД ====================

/**
 * Множители урона по Grade (НЕ зависит от уровня!)
 *
 * @see src/types/grade.ts
 * @see docs/technique-system-v2.md
 */
export const GRADE_DAMAGE_MULTIPLIERS: Record<TechniqueGrade, number> = {
  common: 1.0,
  refined: 1.2,
  perfect: 1.4,
  transcendent: 1.6,
} as const;

/**
 * Множители стоимости Ци по Grade
 * 
 * ⚠️ ВАЖНО: Стоимость Ци НЕ зависит от Grade!
 * Все значения = 1.0
 * 
 * @see docs/technique-system-v2.md#1.2
 */
export const GRADE_QI_COST_MULTIPLIERS: Record<TechniqueGrade, number> = {
  common: 1.0,
  refined: 1.0,
  perfect: 1.0,
  transcendent: 1.0,
} as const;

/**
 * Распределение Grade при генерации
 */
export const GRADE_DISTRIBUTION: Record<TechniqueGrade, number> = {
  common: 60,      // 60%
  refined: 28,     // 28%
  perfect: 10,     // 10%
  transcendent: 2, // 2%
} as const;

// ==================== СЛОЙ 3: СПЕЦИАЛИЗАЦИЯ ====================

/**
 * Множители урона для подтипов атакующих техник
 *
 * melee_strike — самый сильный (×1.5)
 * melee_weapon — зависит от оружия
 * ranged_* — рассеивание Ци
 */
export const COMBAT_SUBTYPE_DAMAGE_MULTIPLIERS: Record<CombatSubtype, number> = {
  melee_strike: 1.5,      // Самый сильный — Ци в теле
  melee_weapon: 1.0,      // Базовый — через оружие
  ranged_projectile: 0.9, // Снаряд теряет Ци
  ranged_beam: 0.85,      // Луч рассеивается
  ranged_aoe: 0.8,        // Область — максимальное рассеивание
} as const;

/**
 * Базовая дальность по подтипу
 */
export const COMBAT_SUBTYPE_BASE_RANGE: Record<CombatSubtype, number> = {
  melee_strike: 0.5,      // Диаметр тела
  melee_weapon: 1.0,      // Длина оружия (базовая)
  ranged_projectile: 15,  // Снаряд
  ranged_beam: 20,        // Луч
  ranged_aoe: 10,         // Область (радиус)
} as const;

// ==================== СИСТЕМА TIER ====================

/**
 * Tier для типов техник
 *
 * Определяет сложность эффектов:
 * - Tier 1: Только множители (combat)
 * - Tier 2: Событийные эффекты (defense, healing)
 * - Tier 3: DoT и дебаффы (curse, poison)
 * - Tier 4: Баффы и утилити (support, movement, sensory)
 * - Tier 5: Специальные (cultivation)
 */
export type EffectTier = 1 | 2 | 3 | 4 | 5;

export const TECHNIQUE_TIER: Record<TechniqueType, EffectTier> = {
  combat: 1,
  defense: 2,
  healing: 2,
  curse: 3,
  poison: 3,
  support: 4,
  movement: 4,
  sensory: 4,
  cultivation: 5,
} as const;

// ==================== ОГРАНИЧЕНИЯ КОЛИЧЕСТВА ====================

/**
 * Лимиты генерации техник для тестовой среды
 *
 * V1: ~19 000 техник (избыточно)
 * V2: ~100-500 техник (достаточно для тестов)
 */
export const TECHNIQUE_COUNT_LIMITS = {
  test: {
    combat: {
      melee_strike: { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const, perLevel: 5 },
      melee_weapon: { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const, perLevel: 5 },
      ranged: { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const, perLevel: 3 },
    },
    defense: { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const, perLevel: 3 },
    healing: { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const, perLevel: 2 },
    support: { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const, perLevel: 2 },
    movement: { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const, perLevel: 2 },
    sensory: { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const, perLevel: 2 },
    curse: { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const, perLevel: 2 },
    poison: { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const, perLevel: 2 },
    cultivation: { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const, perLevel: 1 },
  },
  production: {
    combat: {
      melee_strike: { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const, perLevel: 15 },
      melee_weapon: { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const, perLevel: 15 },
      ranged: { levels: [1, 3, 5, 7, 9] as const, perLevel: 8 },
    },
    defense: { levels: [1, 3, 5, 7, 9] as const, perLevel: 5 },
    healing: { levels: [1, 3, 5, 7, 9] as const, perLevel: 5 },
    support: { levels: [1, 3, 5, 7, 9] as const, perLevel: 5 },
    movement: { levels: [1, 3, 5, 7, 9] as const, perLevel: 5 },
    sensory: { levels: [1, 3, 5, 7, 9] as const, perLevel: 5 },
    curse: { levels: [2, 4, 6, 8] as const, perLevel: 4 },
    poison: { levels: [2, 4, 6, 8] as const, perLevel: 4 },
    cultivation: { levels: [1, 3, 5, 7, 9] as const, perLevel: 3 },
  },
} as const;

// ==================== ЭЛЕМЕНТЫ ====================

/**
 * Список всех элементов
 * 
 * Внимание: poison — ограниченная стихия, только для типа poison!
 * @see src/types/technique-types.ts - getAllowedElements()
 */
export const ELEMENTS: TechniqueElement[] = [
  'fire',
  'water',
  'earth',
  'air',
  'lightning',
  'void',
  'neutral',
  'poison',
] as const;

/**
 * Множители элементов (ВСЕ = 1.0 в V2)
 *
 * Элементы влияют только на визуальные эффекты и названия,
 * НЕ на численные значения.
 * 
 * poison — специальная стихия для типа poison.
 */
export const ELEMENT_MULTIPLIERS: Record<TechniqueElement, number> = {
  fire: 1.0,
  water: 1.0,
  earth: 1.0,
  air: 1.0,
  lightning: 1.0,
  void: 1.0,
  neutral: 1.0,
  poison: 1.0,
} as const;

// ==================== ГЕНЕРАЦИЯ ИМЁН ====================

/**
 * Части имён для генерации
 */
export const NAME_PARTS = {
  elements: {
    fire: ['Огненный', 'Пылающий', 'Раскалённый', 'Пожирающий', 'Вулканический'],
    water: ['Ледяной', 'Струящийся', 'Холодный', 'Морской', 'Штормовой'],
    earth: ['Каменный', 'Тяжёлый', 'Горный', 'Неизбежный', 'Титанический'],
    air: ['Стремительный', 'Вихревой', 'Невидимый', 'Порывистый', 'Штормовой'],
    lightning: ['Молниеносный', 'Искрящийся', 'Громовой', 'Ослепляющий', 'Статический'],
    void: ['Бесплотный', 'Теневой', 'Пустотный', 'Забвенный', 'Эфирный'],
    neutral: ['Истинный', 'Чистый', 'Сфокусированный', 'Концентрированный', 'Базовый'],
    poison: ['Ядовитый', 'Токсичный', 'Отравляющий', 'Губительный', 'Смертоносный'],
  },
  nouns: {
    combat: ['Удар', 'Кулак', 'Ладонь', 'Толчок', 'Взрыв', 'Волна', 'Клинок', 'Укол'],
    defense: ['Щит', 'Стена', 'Барьер', 'Броня', 'Купол', 'Защита', 'Печать'],
    cultivation: ['Дыхание', 'Поток', 'Накопление', 'Концентрация', 'Медитация'],
    support: ['Барьер', 'Усиление', 'Защита', 'Стена'],
    movement: ['Шаг', 'Рывок', 'Смещение', 'Прыжок', 'Побег'],
    sensory: ['Взгляд', 'Чутьё', 'Восприятие', 'Обнаружение', 'Анализ'],
    healing: ['Исцеление', 'Восстановление', 'Регенерация', 'Обновление'],
    curse: ['Проклятие', 'Скверна', 'Печать', 'Порча', 'Оковы', 'Метка'],
    poison: ['Яд', 'Токсин', 'Отрава', 'Губитель', 'Разрушитель'],
  },
} as const;

// ==================== ВЕРСИЯ ====================

export const GENERATOR_VERSION = '4.0.0';
