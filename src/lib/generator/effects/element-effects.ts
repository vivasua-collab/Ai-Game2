/**
 * ============================================================================
 * СТИХИЙНЫЕ ЭФФЕКТЫ ДЛЯ ТЕХНИК
 * ============================================================================
 * 
 * Эффекты определяются стихией техники и её типом.
 * Длительность указывается в ТИКАХ (1 тик = 1 минута игрового времени).
 * 
 * @see docs/technique-system-v2.md#9.3
 */

import type { TechniqueElement } from '@/types/technique-types';
import type { TechniqueGrade } from '@/types/grade';

// ==================== ТИПЫ ====================

/**
 * Время в ТИКАХ (1 тик = 1 минута)
 */
export interface ElementEffect {
  type: string;
  value: number;
  duration?: number;  // В тиках!
  description: string;
}

/**
 * Сила эффекта от Grade
 */
export const GRADE_EFFECT_POWER: Record<TechniqueGrade, number> = {
  common: 0,       // 0% — нет эффекта
  refined: 0.5,    // 50% силы
  perfect: 1.0,    // 100% силы
  transcendent: 1.5, // 150% силы
};

// ==================== АТАКУЮЩИЕ ЭФФЕКТЫ ====================

/**
 * Стихийные эффекты для атакующих техник
 */
export const ELEMENT_ATTACK_EFFECTS: Record<TechniqueElement, ElementEffect> = {
  fire: {
    type: 'burn',
    value: 5, // 5% урона за тик
    duration: 3, // 3 тика
    description: 'Горение: 5% урона за тик, 3 тика',
  },
  water: {
    type: 'slow',
    value: 20, // -20% скорости
    duration: 2, // 2 тика
    description: 'Замедление: -20% скорости, 2 тика',
  },
  earth: {
    type: 'stun',
    value: 15, // 15% шанс
    duration: 1, // 1 тик
    description: 'Оглушение: 15% шанс на 1 тик',
  },
  air: {
    type: 'knockback',
    value: 3, // 3 клетки
    description: 'Отталкивание: 3 клетки',
  },
  lightning: {
    type: 'chain',
    value: 50, // 50% урона
    description: 'Цепной урон: 50% урона по 2 соседним целям',
  },
  void: {
    type: 'pierce',
    value: 30, // +30% пробития
    description: 'Пробитие: +30% пробития брони',
  },
  neutral: {
    type: 'none',
    value: 0,
    description: 'Без стихийного эффекта',
  },
  poison: {
    type: 'poison_dot',
    value: 5,
    duration: 5,
    description: 'Отравление: 5% урона за тик, 5 тиков',
  },
};

// ==================== ЗАЩИТНЫЕ ЭФФЕКТЫ ====================

/**
 * Стихийные эффекты для защитных техник
 */
export const ELEMENT_DEFENSE_EFFECTS: Record<TechniqueElement, ElementEffect> = {
  fire: {
    type: 'reflect',
    value: 20, // 20% отражения
    description: 'Огненный щит: отражает 20% урона атакующему',
  },
  water: {
    type: 'absorb_fire',
    value: 50, // +50% поглощения огня
    description: 'Водяной щит: +50% поглощения урона огнём',
  },
  earth: {
    type: 'fortify',
    value: 30, // +30% прочность
    description: 'Каменный щит: +30% прочность щита',
  },
  air: {
    type: 'evasion',
    value: 20, // +20% уклонение
    description: 'Воздушный щит: +20% уклонение',
  },
  lightning: {
    type: 'shock',
    value: 100, // 100% шанс шока
    description: 'Грозовой щит: шок атакующего при ударе',
  },
  void: {
    type: 'nullify',
    value: 50, // 50% поглощения
    description: 'Пустотный щит: поглощает 50% магического урона',
  },
  neutral: {
    type: 'none',
    value: 0,
    description: 'Базовый щит без эффектов',
  },
  poison: {
    type: 'none',
    value: 0,
    description: 'Poison не используется для защиты',
  },
};

// ==================== ЭФФЕКТЫ ПОДДЕРЖКИ ====================

/**
 * Стихийные эффекты для техник поддержки
 */
export const ELEMENT_SUPPORT_EFFECTS: Record<TechniqueElement, ElementEffect> = {
  fire: {
    type: 'damage_buff',
    value: 15, // +15% урона техниками
    duration: 5, // 5 тиков
    description: 'Огненный бафф: +15% урона техниками на 5 тиков',
  },
  water: {
    type: 'recovery_buff',
    value: 25, // +25% восстановления
    duration: 5,
    description: 'Водяной бафф: +25% скорости восстановления',
  },
  earth: {
    type: 'resistance_buff',
    value: 20, // +20% сопротивления
    duration: 5,
    description: 'Земляной бафф: +20% сопротивления на 5 тиков',
  },
  air: {
    type: 'speed_buff',
    value: 30, // +30% скорости
    duration: 3,
    description: 'Воздушный бафф: +30% скорости на 3 тика',
  },
  lightning: {
    type: 'crit_buff',
    value: 20, // +20% крит шанс
    duration: 4,
    description: 'Грозовой бафф: +20% шанс крита на 4 тика',
  },
  void: {
    type: 'pierce_buff',
    value: 25, // +25% пробития
    duration: 4,
    description: 'Пустотный бафф: +25% пробития на 4 тика',
  },
  neutral: {
    type: 'none',
    value: 0,
    description: 'Без стихийного баффа',
  },
  poison: {
    type: 'none',
    value: 0,
    description: 'Poison не используется для поддержки',
  },
};

// ==================== ФУНКЦИИ ====================

/**
 * Получить стихийный эффект для техники
 */
export function getElementEffect(
  element: TechniqueElement,
  techniqueType: 'attack' | 'defense' | 'support',
  grade: TechniqueGrade
): ElementEffect | null {
  const power = GRADE_EFFECT_POWER[grade];
  if (power === 0) return null;

  let baseEffect: ElementEffect;
  
  switch (techniqueType) {
    case 'attack':
      baseEffect = ELEMENT_ATTACK_EFFECTS[element];
      break;
    case 'defense':
      baseEffect = ELEMENT_DEFENSE_EFFECTS[element];
      break;
    case 'support':
      baseEffect = ELEMENT_SUPPORT_EFFECTS[element];
      break;
    default:
      return null;
  }

  if (!baseEffect || baseEffect.type === 'none') return null;

  return {
    ...baseEffect,
    value: Math.floor(baseEffect.value * power),
    duration: baseEffect.duration ? Math.ceil(baseEffect.duration * power) : undefined,
    description: baseEffect.description,
  };
}

/**
 * Проверить, есть ли у стихии эффект
 */
export function hasElementEffect(element: TechniqueElement, grade: TechniqueGrade): boolean {
  return GRADE_EFFECT_POWER[grade] > 0 && element !== 'neutral';
}

// ==================== ОГРАНИЧЕНИЯ ПО ТИПУ ====================

import type { TechniqueType } from '@/types/technique-types';

/**
 * Проверить, может ли техника иметь стихийный эффект
 * 
 * Правила:
 * - healing, cultivation → НЕТ стихийных эффектов (neutral only)
 * - poison → ТОЛЬКО poison эффект (особая стихия)
 * - остальные → стандартные стихийные эффекты
 */
export function canHaveElementEffect(
  type: TechniqueType,
  element: TechniqueElement,
  grade: TechniqueGrade
): boolean {
  // Healing и Cultivation — без стихийных эффектов!
  if (type === 'healing' || type === 'cultivation') {
    return false;
  }
  
  // Poison — только poison эффект
  if (type === 'poison') {
    return element === 'poison' && grade !== 'common';
  }
  
  // Остальные — стандартные эффекты
  return GRADE_EFFECT_POWER[grade] > 0 && element !== 'neutral' && element !== 'poison';
}
