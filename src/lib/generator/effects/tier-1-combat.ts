/**
 * ============================================================================
 * ЭФФЕКТЫ TIER 1: COMBAT
 * ============================================================================
 *
 * Combat техники имеют:
 * 1. Множители урона (основные)
 * 2. Стихийные эффекты (от element)
 * 3. Transcendent-эффекты (только transcendent)
 *
 * Длительность указывается в ТИКАХ (1 тик = 1 минута).
 *
 * @see docs/checkpoints/checkpoint_03_21_generator_V2.md
 * @see docs/technique-system-v2.md#9.3
 */

import type { TechniqueGrade } from '@/types/grade';
import type { TechniqueElement, CombatSubtype } from '@/types/technique-types';
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

export interface CombatEffectParams {
  grade: TechniqueGrade;
  level: number;
  element: TechniqueElement;
  combatSubtype?: CombatSubtype;
}

export interface CombatEffectResult {
  effects: Record<string, boolean>;
  effectValues: Record<string, number>;
  bonuses: Record<string, number>;
  activeEffects: Array<{
    type: string;
    value: number;
    duration?: number; // В ТИКАХ!
    category: 'element' | 'transcendent';
  }>;
}

// ==================== БОНУСЫ GRADE ====================

/**
 * Бонусы combat техник по Grade
 * 
 * Эти бонусы применяются к множителю урона,
 * НЕ как отдельные эффекты.
 */
export const COMBAT_GRADE_BONUSES: Record<TechniqueGrade, {
  critChance: number;
  critDamage: number;
  piercePercent: number;
}> = {
  common: {
    critChance: 0,
    critDamage: 1.5,
    piercePercent: 0,
  },
  refined: {
    critChance: 5,
    critDamage: 1.75,
    piercePercent: 0,
  },
  perfect: {
    critChance: 10,
    critDamage: 2.0,
    piercePercent: 10,
  },
  transcendent: {
    critChance: 15,
    critDamage: 2.5,
    piercePercent: 20,
  },
};

// ==================== МНОЖИТЕЛИ ПОДТИПОВ ====================

/**
 * Множители урона для подтипов combat
 * 
 * ВАЖНО: Эти значения влияют на ЁМКОСТЬ техники,
 * НЕ напрямую на урон!
 * 
 * melee_strike — самая высокая ёмкость (Ци накапливается в теле)
 * ranged_* — низкая ёмкость (Ци рассеивается при полёте)
 */
export const COMBAT_SUBTYPE_CAPACITY_MODIFIERS: Record<CombatSubtype, number> = {
  melee_strike: 1.33,      // ×1.33 к базовой ёмкости
  melee_weapon: 1.0,       // Базовый
  ranged_projectile: 0.67, // ×0.67 (рассеивание)
  ranged_beam: 0.67,       // ×0.67 (рассеивание)
  ranged_aoe: 0.67,        // ×0.67 (рассеивание)
} as const;

/**
 * @deprecated Используйте COMBAT_SUBTYPE_CAPACITY_MODIFIERS
 * Эти множители НЕ применяются к урону напрямую!
 */
export const COMBAT_SUBTYPE_MULTIPLIERS = COMBAT_SUBTYPE_CAPACITY_MODIFIERS;

// ==================== ГЕНЕРАЦИЯ ЭФФЕКТОВ ====================

/**
 * Генерация эффектов для combat техники
 * 
 * Combat техники имеют:
 * 1. Стихийный эффект (если refined+ и element !== neutral)
 * 2. Transcendent-эффект (если grade = transcendent)
 */
export function generateCombatEffects(params: CombatEffectParams): CombatEffectResult {
  const { grade, level, element, combatSubtype } = params;
  
  const effects: Record<string, boolean> = {};
  const effectValues: Record<string, number> = {};
  const activeEffects: CombatEffectResult['activeEffects'] = [];

  // === 1. СТИХИЙНЫЙ ЭФФЕКТ ===
  // Применяется только для refined+ и element !== neutral
  
  if (hasElementEffect(element, grade)) {
    const elementEffect = getElementEffect(element, 'attack', grade);
    
    if (elementEffect && elementEffect.type !== 'none') {
      effects[elementEffect.type] = true;
      effectValues[`${elementEffect.type}Value`] = elementEffect.value;
      
      if (elementEffect.duration) {
        effectValues[`${elementEffect.type}Duration`] = elementEffect.duration; // В ТИКАХ!
      }
      
      activeEffects.push({
        type: elementEffect.type,
        value: elementEffect.value,
        duration: elementEffect.duration,
        category: 'element',
      });
    }
  }

  // === 2. TRANSCENDENT-ЭФФЕКТ ===
  // Только для transcendent Grade
  
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

  // === 3. БОНУСЫ GRADE ===
  const bonuses = COMBAT_GRADE_BONUSES[grade] || COMBAT_GRADE_BONUSES.common;

  return {
    effects,
    effectValues,
    bonuses,
    activeEffects,
  };
}

// ==================== ЭКСПОРТ КОНСТАНТ ====================

export const GRADE_BONUS_CRIT = {
  common: { chance: 0, damage: 1.5 },
  refined: { chance: 5, damage: 1.75 },
  perfect: { chance: 10, damage: 2.0 },
  transcendent: { chance: 15, damage: 2.5 },
} as const;
