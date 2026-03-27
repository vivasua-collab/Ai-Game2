/**
 * ============================================================================
 * ЭФФЕКТЫ TIER 3: CURSE & POISON
 * ============================================================================
 *
 * DoT (Damage over Time) и дебаффы:
 * - poison: Урон здоровью или Ци за ТИК
 * - debuff: Снижение характеристик
 * - slow: Замедление
 *
 * Длительность указывается в ТИКАХ (1 тик = 1 минута).
 *
 * @see docs/checkpoints/checkpoint_03_21_generator_V2.md
 * @see docs/technique-system-v2.md#9.3
 */

import type { TechniqueGrade } from '@/types/grade';
import type { TechniqueElement } from '@/types/technique-types';
import { 
  getElementEffect,
  hasElementEffect,
  type ElementEffect 
} from './element-effects';
import { 
  getTranscendentEffect,
  type TranscendentEffect 
} from './transcendent-effects';

// ==================== ТИПЫ ====================

export interface CursePoisonEffectParams {
  grade: TechniqueGrade;
  level: number;
  type: 'curse' | 'poison';
  element: TechniqueElement;
}

/**
 * Эффект яда (DoT)
 * 
 * Длительность в ТИКАХ!
 */
export interface PoisonEffect {
  poisonDamage: number;     // Урон за тик
  poisonDuration: number;   // Количество тиков
  poisonType: 'body' | 'qi'; // Тип урона
}

/**
 * Эффект проклятия (дебафф)
 * 
 * Длительность в ТИКАХ!
 */
export interface CurseEffect {
  debuffStat: string;       // Снижаемая характеристика
  debuffAmount: number;     // Величина снижения
  debuffDuration: number;   // Длительность в ТИКАХ
}

/**
 * Эффект замедления
 * 
 * Длительность в ТИКАХ!
 */
export interface SlowEffect {
  slowPercent: number;      // % замедления
  slowDuration: number;     // Длительность в ТИКАХ
}

// ==================== КОНСТАНТЫ ====================

/**
 * Базовый урон яда по уровню (за ТИК)
 */
export const POISON_BASE_DAMAGE: Record<number, number> = {
  1: 3,
  2: 5,
  3: 8,
  4: 12,
  5: 18,
  6: 25,
  7: 35,
  8: 48,
  9: 65,
};

/**
 * Типы дебаффов проклятий
 */
export const CURSE_TYPES = {
  weakness: { stat: 'strength', description: 'Слабость' },
  slowness: { stat: 'agility', description: 'Замедление' },
  blindness: { stat: 'intelligence', description: 'Слепота' },
  silence: { stat: 'conductivity', description: 'Молчание' },
} as const;

/**
 * Базовая длительность в ТИКАХ
 */
export const BASE_DURATION_TICKS = {
  short: 2,    // 2 тика = 2 минуты
  medium: 4,   // 4 тика = 4 минуты
  long: 6,     // 6 тиков = 6 минут
} as const;

// ==================== ГЕНЕРАЦИЯ ЭФФЕКТОВ ====================

/**
 * Генерация эффектов для curse/poison техник
 * 
 * Возвращает:
 * - effects: Флаги активных эффектов
 * - effectValues: Значения эффектов (длительность в ТИКАХ)
 * - activeEffects: Массив активных эффектов с метаданными
 */
export function generateCursePoisonEffects(
  params: CursePoisonEffectParams,
  rng: () => number
): {
  effects: Record<string, boolean>;
  effectValues: Record<string, number | string>;
  activeEffects: Array<{
    type: string;
    value: number;
    duration?: number; // В ТИКАХ!
    category: 'poison' | 'curse' | 'element' | 'transcendent';
  }>;
} {
  const { grade, level, type, element } = params;
  const effects: Record<string, boolean> = {};
  const effectValues: Record<string, number | string> = {};
  const activeEffects: Array<{
    type: string;
    value: number;
    duration?: number;
    category: 'poison' | 'curse' | 'element' | 'transcendent';
  }> = [];

  const gradeIndex = ['common', 'refined', 'perfect', 'transcendent'].indexOf(grade);
  const numEffects = Math.min(gradeIndex + 1, 3); // 1-3 эффекта

  // === ОСНОВНЫЕ ЭФФЕКТЫ ===
  
  const availableEffects = type === 'poison'
    ? ['poison', 'slow', 'debuff']
    : ['debuff', 'slow', 'poison'];

  const selectedEffects: string[] = [];

  for (let i = 0; i < numEffects; i++) {
    const effect = availableEffects[i];
    if (!selectedEffects.includes(effect)) {
      selectedEffects.push(effect);
    }
  }

  for (const effect of selectedEffects) {
    effects[effect] = true;

    switch (effect) {
      case 'poison':
        // DoT урон за ТИК
        const basePoisonDamage = POISON_BASE_DAMAGE[level] || (3 + level * 7);
        effectValues.poisonDamage = Math.floor(
          basePoisonDamage * (1 + gradeIndex * 0.2) * (0.8 + rng() * 0.4)
        );
        // Длительность в ТИКАХ
        effectValues.poisonDuration = Math.floor(
          BASE_DURATION_TICKS.short + level * 0.3 + rng() * 2
        );
        effectValues.poisonType = rng() > 0.7 ? 'qi' : 'body';
        
        activeEffects.push({
          type: 'poison',
          value: effectValues.poisonDamage as number,
          duration: effectValues.poisonDuration as number,
          category: 'poison',
        });
        break;

      case 'debuff':
        const stats = ['strength', 'agility', 'intelligence', 'conductivity'];
        effectValues.debuffStat = stats[Math.floor(rng() * stats.length)];
        effectValues.debuffAmount = Math.floor(5 + level * 3 + gradeIndex * 5);
        // Длительность в ТИКАХ
        effectValues.debuffDuration = Math.floor(
          BASE_DURATION_TICKS.short + rng() * BASE_DURATION_TICKS.medium
        );
        
        activeEffects.push({
          type: 'debuff',
          value: effectValues.debuffAmount as number,
          duration: effectValues.debuffDuration as number,
          category: 'curse',
        });
        break;

      case 'slow':
        effectValues.slowPercent = Math.floor(
          15 + level * 2 + gradeIndex * 5 + rng() * 10
        );
        // Длительность в ТИКАХ
        effectValues.slowDuration = Math.floor(
          BASE_DURATION_TICKS.short + rng() * BASE_DURATION_TICKS.short
        );
        
        activeEffects.push({
          type: 'slow',
          value: effectValues.slowPercent as number,
          duration: effectValues.slowDuration as number,
          category: 'curse',
        });
        break;
    }
  }

  // === СТИХИЙНЫЙ ЭФФЕКТ ===
  
  if (hasElementEffect(element, grade)) {
    const elementEffect = getElementEffect(element, 'attack', grade);
    
    if (elementEffect && elementEffect.type !== 'none') {
      effects[elementEffect.type] = true;
      effectValues[`${elementEffect.type}Value`] = elementEffect.value;
      
      if (elementEffect.duration) {
        effectValues[`${elementEffect.type}Duration`] = elementEffect.duration;
      }
      
      activeEffects.push({
        type: elementEffect.type,
        value: elementEffect.value,
        duration: elementEffect.duration,
        category: 'element',
      });
    }
  }

  // === TRANSCENDENT-ЭФФЕКТ ===
  
  if (grade === 'transcendent') {
    const transcendentEffect = getTranscendentEffect(element, 'attack');
    
    if (transcendentEffect) {
      effects[transcendentEffect.type] = true;
      effectValues[`${transcendentEffect.type}Value`] = transcendentEffect.value;
      
      activeEffects.push({
        type: transcendentEffect.type,
        value: transcendentEffect.value,
        category: 'transcendent',
      });
    }
  }

  return { effects, effectValues, activeEffects };
}
