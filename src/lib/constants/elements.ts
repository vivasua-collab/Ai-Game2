/**
 * ============================================================================
 * УНИФИЦИРОВАННАЯ СИСТЕМА ЭЛЕМЕНТОВ
 * ============================================================================
 * 
 * Единая точка для констант элементов (огонь, вода, земля и т.д.)
 * 
 * Использование:
 * - ELEMENT_NAMES — русские названия с emoji
 * - ELEMENT_ICONS — только emoji
 * - ELEMENT_COLORS — hex цвета
 * - ELEMENT_LUCIDE_ICONS — Lucide React компоненты
 */

import type { LucideIcon } from 'lucide-react';
import { Flame, Droplet, Mountain, Wind, Zap, Circle, Sparkles } from 'lucide-react';

// ==================== ТИПЫ ====================

/**
 * Тип элемента
 */
export type Element = 'fire' | 'water' | 'earth' | 'air' | 'lightning' | 'void' | 'neutral';

/**
 * Все элементы (массив)
 */
export const ELEMENTS: Element[] = ['fire', 'water', 'earth', 'air', 'lightning', 'void', 'neutral'];

// ==================== НАЗВАНИЯ ====================

/**
 * Русские названия элементов (без emoji)
 */
export const ELEMENT_NAMES_RU: Record<Element, string> = {
  fire: 'Огонь',
  water: 'Вода',
  earth: 'Земля',
  air: 'Воздух',
  lightning: 'Молния',
  void: 'Пустота',
  neutral: 'Нейтральный',
};

/**
 * Русские названия элементов с emoji
 */
export const ELEMENT_NAMES: Record<Element, string> = {
  fire: '🔥 Огонь',
  water: '💧 Вода',
  earth: '🪨 Земля',
  air: '💨 Воздух',
  lightning: '⚡ Молния',
  void: '🌑 Пустота',
  neutral: '⚪ Нейтральный',
};

// ==================== ИКОНКИ ====================

/**
 * Emoji иконки элементов
 */
export const ELEMENT_ICONS: Record<Element, string> = {
  fire: '🔥',
  water: '💧',
  earth: '🪨',
  air: '💨',
  lightning: '⚡',
  void: '🌑',
  neutral: '⚪',
};

/**
 * Lucide React иконки элементов
 */
export const ELEMENT_LUCIDE_ICONS: Record<Element, LucideIcon> = {
  fire: Flame,
  water: Droplet,
  earth: Mountain,
  air: Wind,
  lightning: Zap,
  void: Sparkles,
  neutral: Circle,
};

// ==================== ЦВЕТА ====================

/**
 * Hex цвета элементов
 */
export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#ef4444',     // red-500
  water: '#3b82f6',    // blue-500
  earth: '#a16207',    // brown-ish
  air: '#94a3b8',      // slate-400
  lightning: '#eab308', // yellow-500
  void: '#7c3aed',     // violet-600
  neutral: '#6b7280',  // gray-500
};

/**
 * Tailwind классы для текста по элементу
 */
export const ELEMENT_TEXT_COLORS: Record<Element, string> = {
  fire: 'text-red-500',
  water: 'text-blue-500',
  earth: 'text-amber-700',
  air: 'text-slate-400',
  lightning: 'text-yellow-500',
  void: 'text-violet-600',
  neutral: 'text-gray-500',
};

/**
 * Phaser hex числа для элементов
 */
export const ELEMENT_COLORS_PHASER: Record<Element, number> = {
  fire: 0xef4444,
  water: 0x3b82f6,
  earth: 0xa16207,
  air: 0x94a3b8,
  lightning: 0xeab308,
  void: 0x7c3aed,
  neutral: 0x6b7280,
};

// ==================== УТИЛИТЫ ====================

/**
 * Получить название элемента
 */
export function getElementName(element: Element, withEmoji: boolean = true): string {
  return withEmoji ? ELEMENT_NAMES[element] : ELEMENT_NAMES_RU[element];
}

/**
 * Получить иконку элемента
 */
export function getElementIcon(element: Element): string {
  return ELEMENT_ICONS[element];
}

/**
 * Проверить валидность элемента
 */
export function isValidElement(value: string): value is Element {
  return ELEMENTS.includes(value as Element);
}

/**
 * Парсить строку в Element (с fallback)
 */
export function parseElement(value: string, fallback: Element = 'neutral'): Element {
  if (isValidElement(value)) return value;
  return fallback;
}
