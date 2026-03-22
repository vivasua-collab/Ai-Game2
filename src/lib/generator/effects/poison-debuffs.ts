/**
 * ============================================================================
 * POISON ДЕБАФФЫ ПО GRADE
 * ============================================================================
 * 
 * Poison техники накладывают несколько дебаффов в зависимости от Grade.
 * Длительность указывается в ТИКАХ (1 тик = 1 минута игрового времени).
 * 
 * @see docs/technique-system-v2.md#7-poison
 */

import type { TechniqueGrade } from '@/types/grade';

// ==================== ТИПЫ ====================

/**
 * Структура дебаффа
 */
export interface PoisonDebuff {
  /** Тип дебаффа */
  type: 'dot' | 'slow' | 'weakness' | 'block_regen';
  /** Значение (процент или абсолютное) */
  value: number;
  /** Длительность в тиках */
  duration?: number;
  /** Описание */
  description: string;
}

// ==================== ДЕБАФФЫ ПО GRADE ====================

/**
 * Дебаффы Poison техник по Grade
 * 
 * Количество дебаффов:
 * - Common: 1 (DoT малый)
 * - Refined: 2 (DoT + Slow)
 * - Perfect: 3 (DoT сильный + Slow + Weakness)
 * - Transcendent: 4 (все + Block Regen)
 */
export const POISON_GRADE_DEBUFFS: Record<TechniqueGrade, PoisonDebuff[]> = {
  common: [
    { 
      type: 'dot', 
      value: 3, 
      duration: 15, 
      description: 'Отравление: 3% урона за тик, 15 тиков' 
    },
  ],
  refined: [
    { 
      type: 'dot', 
      value: 5, 
      duration: 20, 
      description: 'Отравление: 5% урона за тик, 20 тиков' 
    },
    { 
      type: 'slow', 
      value: 15, 
      duration: 10, 
      description: 'Замедление: -15% скорости, 10 тиков' 
    },
  ],
  perfect: [
    { 
      type: 'dot', 
      value: 8, 
      duration: 25, 
      description: 'Сильное отравление: 8% урона за тик, 25 тиков' 
    },
    { 
      type: 'slow', 
      value: 20, 
      duration: 15, 
      description: 'Замедление: -20% скорости, 15 тиков' 
    },
    { 
      type: 'weakness', 
      value: 15, 
      duration: 20, 
      description: 'Слабость: -15% урона, 20 тиков' 
    },
  ],
  transcendent: [
    { 
      type: 'dot', 
      value: 12, 
      duration: 30, 
      description: 'Смертельное отравление: 12% урона за тик, 30 тиков' 
    },
    { 
      type: 'slow', 
      value: 25, 
      duration: 20, 
      description: 'Глубокое замедление: -25% скорости, 20 тиков' 
    },
    { 
      type: 'weakness', 
      value: 20, 
      duration: 25, 
      description: 'Истощение: -20% урона, 25 тиков' 
    },
    { 
      type: 'block_regen', 
      value: 100, 
      description: 'Блокировка регенерации: 100%' 
    },
  ],
};

// ==================== ФУНКЦИИ ====================

/**
 * Получить дебаффы для Poison техники по Grade
 */
export function generatePoisonDebuffs(grade: TechniqueGrade): PoisonDebuff[] {
  return POISON_GRADE_DEBUFFS[grade] || POISON_GRADE_DEBUFFS.common;
}

/**
 * Получить количество дебаффов по Grade
 */
export function getPoisonDebuffCount(grade: TechniqueGrade): number {
  return POISON_GRADE_DEBUFFS[grade]?.length || 1;
}

/**
 * Проверить, есть ли у Poison техники конкретный тип дебаффа
 */
export function hasPoisonDebuffType(
  grade: TechniqueGrade, 
  debuffType: PoisonDebuff['type']
): boolean {
  const debuffs = POISON_GRADE_DEBUFFS[grade];
  return debuffs?.some(d => d.type === debuffType) ?? false;
}
