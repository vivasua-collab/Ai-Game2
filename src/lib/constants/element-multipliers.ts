/**
 * ============================================================================
 * МНОЖИТЕЛИ ЭЛЕМЕНТОВ
 * ============================================================================
 * 
 * Единый источник истины для механических параметров элементов.
 * 
 * ⚠️ ВСЕ МНОЖИТЕЛИ = 1.0 (базовый уровень)
 * Система бонусов будет разработана позже для экипировки.
 * 
 * @see src/lib/constants/elements.ts - базовые константы (названия, цвета)
 * @see src/lib/constants/element-compatibility.ts - совместимость
 */

import { Element } from './elements';

// ==================== МНОЖИТЕЛИ УРОНА ====================

/**
 * Множитель урона по элементу
 * 
 * ⚠️ ВСЕ = 1.0 (базовый уровень)
 * 
 * Влияет на базовый урон атакующих техник.
 * Система бонусов будет разработана позже.
 */
export const ELEMENT_DAMAGE_MULTIPLIER: Record<Element, number> = {
  fire: 1.0,
  water: 1.0,
  earth: 1.0,
  air: 1.0,
  lightning: 1.0,
  void: 1.0,
  neutral: 1.0,
} as const;

// ==================== МНОЖИТЕЛИ ЗАЩИТЫ ====================

/**
 * Множитель защиты по элементу
 * 
 * ⚠️ ВСЕ = 1.0 (базовый уровень)
 * 
 * Влияет на эффективность щитов и барьеров.
 * Система бонусов будет разработана позже.
 */
export const ELEMENT_DEFENSE_MULTIPLIER: Record<Element, number> = {
  fire: 1.0,
  water: 1.0,
  earth: 1.0,
  air: 1.0,
  lightning: 1.0,
  void: 1.0,
  neutral: 1.0,
} as const;

// ==================== МНОЖИТЕЛИ СТОИМОСТИ ЦИ ====================

/**
 * Множитель стоимости Ци по элементу
 * 
 * ⚠️ ВСЕ = 1.0 (базовый уровень)
 * 
 * Влияет на qiCost техник.
 * Система бонусов будет разработана позже.
 */
export const ELEMENT_QI_COST_MULTIPLIER: Record<Element, number> = {
  fire: 1.0,
  water: 1.0,
  earth: 1.0,
  air: 1.0,
  lightning: 1.0,
  void: 1.0,
  neutral: 1.0,
} as const;

// ==================== ЭФФЕКТЫ ЭЛЕМЕНТОВ ====================

/**
 * Возможные эффекты по элементу
 * 
 * Используется для определения эффектов, которые может вызывать техника.
 */
export const ELEMENT_EFFECTS: Record<Element, string[]> = {
  fire: ['burning', 'heat'],
  water: ['freezing', 'slow', 'flow'],
  earth: ['shield', 'knockback', 'stability', 'weight'],
  air: ['knockback', 'slow', 'speed', 'lightness'],
  lightning: ['stun', 'pierce', 'chain'],
  void: ['pierce', 'leech', 'debuff', 'drain'],
  neutral: [],
} as const;

// ==================== УТИЛИТЫ ====================

/**
 * Получить множитель урона для элемента
 */
export function getElementDamageMultiplier(element: Element): number {
  return ELEMENT_DAMAGE_MULTIPLIER[element] ?? 1.0;
}

/**
 * Получить множитель защиты для элемента
 */
export function getElementDefenseMultiplier(element: Element): number {
  return ELEMENT_DEFENSE_MULTIPLIER[element] ?? 1.0;
}

/**
 * Получить множитель стоимости Ци для элемента
 */
export function getElementQiCostMultiplier(element: Element): number {
  return ELEMENT_QI_COST_MULTIPLIER[element] ?? 1.0;
}

/**
 * Проверить, имеет ли элемент определённый эффект
 */
export function elementHasEffect(element: Element, effect: string): boolean {
  return ELEMENT_EFFECTS[element]?.includes(effect) ?? false;
}

/**
 * Получить все эффекты элемента
 */
export function getElementEffects(element: Element): string[] {
  return ELEMENT_EFFECTS[element] ?? [];
}
