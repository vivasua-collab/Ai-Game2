/**
 * ============================================================================
 * СОВМЕСТИМОСТЬ И ПРОТИВОПОЛОЖНОСТИ ЭЛЕМЕНТОВ
 * ============================================================================
 * 
 * Определяет отношения между элементами для:
 * - Расчёта урона (эффективность атаки)
 * - Бонусов экипировки (сродство элементов)
 * - Системы сопротивлений (противоположности)
 * 
 * @see src/lib/constants/elements.ts - базовые константы (названия, цвета)
 * @see src/lib/constants/element-multipliers.ts - множители
 */

import { Element } from './elements';

// ==================== ПРОТИВОПОЛОЖНОСТИ ====================

/**
 * Противоположные элементы
 * 
 * Логика:
 * - fire ↔ water (огонь тушится водой)
 * - earth ↔ air (плотность против разреженности)
 * - lightning → earth (молния заземляется, одностороннее)
 * - void — не имеет прямой противоположности (поглощает всё)
 * - neutral — не участвует в системе противоположностей
 */
export const ELEMENT_OPPOSITES: Record<Element, Element | null> = {
  fire: 'water',     // Огонь противоположен воде
  water: 'fire',     // Вода противоположна огню
  earth: 'air',      // Земля противоположна воздуху
  air: 'earth',      // Воздух противоположен земле
  lightning: 'earth', // Молния заземляется
  void: null,        // Пустота не имеет противоположности
  neutral: null,     // Нейтральный не участвует
} as const;

/**
 * Проверить, являются ли элементы противоположными
 */
export function areOpposite(element1: Element, element2: Element): boolean {
  return ELEMENT_OPPOSITES[element1] === element2;
}

// ==================== СРОДСТВО (AFFINITY) ====================

/**
 * Сродство элементов
 * 
 * Элементы со сродством усиливают друг друга при комбинации.
 * Используется для:
 * - Бонусов экипировки (огненное оружие + воздушная броня)
 * - Комбинированных техник
 * 
 * Логика:
 * - fire + air = раздувание пламени
 * - water + lightning = проводимость
 * - earth + fire = лава/магма
 * - void + любой = частичное поглощение (ослабленное сродство)
 */
export const ELEMENT_AFFINITIES: Record<Element, Element[]> = {
  fire: ['air'],           // Воздух раздувает огонь
  water: ['lightning'],    // Вода проводит молнию
  earth: ['fire'],         // Огонь плавит землю в лаву
  air: ['fire', 'lightning'], // Воздух поддерживает огонь и молнию
  lightning: ['water', 'air'], // Молния проводит через воду и воздух
  void: [],                // Пустота поглощает, не имеет сродства
  neutral: [],             // Нейтральный не имеет сродства
} as const;

/**
 * Проверить, есть ли сродство между элементами
 */
export function haveAffinity(element1: Element, element2: Element): boolean {
  return ELEMENT_AFFINITIES[element1]?.includes(element2) ?? false;
}

// ==================== ЭФФЕКТИВНОСТЬ АТАКИ ====================

/**
 * Эффективность атаки элементом по элементу защиты
 * 
 * Матрица: атакующий элемент → защитный элемент → множитель
 * 
 * ⚠️ ВСЕ ЗНАЧЕНИЯ = 1.0 (базовый уровень)
 * 
 * Система будет разработана позже для бонусов экипировки.
 * 
 * Планируемая логика (НЕ РЕАЛИЗОВАНО):
 * - Противоположный элемент: 1.5x урона (вода по огню)
 * - Сродство: 0.8x урона (огонь по воздуху — они дружат)
 * - Void: 1.2x по всем (поглощение)
 * - Neutral: 1.0x по всем (базовый)
 */
export const ELEMENT_EFFECTIVENESS: Record<Element, Record<Element, number>> = {
  fire: {
    fire: 1.0, water: 1.0, earth: 1.0, air: 1.0, lightning: 1.0, void: 1.0, neutral: 1.0,
  },
  water: {
    fire: 1.0, water: 1.0, earth: 1.0, air: 1.0, lightning: 1.0, void: 1.0, neutral: 1.0,
  },
  earth: {
    fire: 1.0, water: 1.0, earth: 1.0, air: 1.0, lightning: 1.0, void: 1.0, neutral: 1.0,
  },
  air: {
    fire: 1.0, water: 1.0, earth: 1.0, air: 1.0, lightning: 1.0, void: 1.0, neutral: 1.0,
  },
  lightning: {
    fire: 1.0, water: 1.0, earth: 1.0, air: 1.0, lightning: 1.0, void: 1.0, neutral: 1.0,
  },
  void: {
    fire: 1.0, water: 1.0, earth: 1.0, air: 1.0, lightning: 1.0, void: 1.0, neutral: 1.0,
  },
  neutral: {
    fire: 1.0, water: 1.0, earth: 1.0, air: 1.0, lightning: 1.0, void: 1.0, neutral: 1.0,
  },
} as const;

/**
 * Получить множитель эффективности атаки
 * 
 * @param attackElement - элемент атакующей техники
 * @param defenseElement - элемент защиты цели
 * @returns множитель урона (пока всегда 1.0)
 */
export function getElementEffectiveness(
  attackElement: Element,
  defenseElement: Element
): number {
  return ELEMENT_EFFECTIVENESS[attackElement]?.[defenseElement] ?? 1.0;
}

// ==================== УТИЛИТЫ ====================

/**
 * Получить противоположный элемент
 */
export function getOppositeElement(element: Element): Element | null {
  return ELEMENT_OPPOSITES[element];
}

/**
 * Получить список элементов со сродством
 */
export function getAffinityElements(element: Element): Element[] {
  return ELEMENT_AFFINITIES[element] ?? [];
}

/**
 * Проверить, участвует ли элемент в системе противоположностей
 */
export function hasOpposite(element: Element): boolean {
  return ELEMENT_OPPOSITES[element] !== null;
}
