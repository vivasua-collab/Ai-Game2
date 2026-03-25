/**
 * ============================================================================
 * ЭФФЕКТЫ TIER 2: DEFENSE & HEALING
 * ============================================================================
 *
 * Событийные эффекты:
 * - shield: Щит, поглощающий урон
 * - heal: Мгновенное или постепенное исцеление
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
  canHaveElementEffect,
  type ElementEffect 
} from './element-effects';
import { 
  getTranscendentEffect,
  type TranscendentEffect 
} from './transcendent-effects';

// ==================== ТИПЫ ====================

export interface DefenseHealingEffectParams {
  grade: TechniqueGrade;
  level: number;
  type: 'defense' | 'healing';
  element: TechniqueElement;
}

/**
 * Эффект щита
 * 
 * Длительность в ТИКАХ!
 */
export interface ShieldEffect {
  shieldHP: number;
  shieldDuration: number; // В ТИКАХ! (0 = мгновенный)
  damageReduction?: number; // % снижения урона
  sustainRate?: number; // % подпитки за тик
}

/**
 * Эффект исцеления
 * 
 * Длительность в ТИКАХ!
 */
export interface HealEffect {
  healAmount: number;
  healDuration: number; // В ТИКАХ! (0 = мгновенное, >0 = HoT)
  healRange?: number; // радиус для AoE исцеления
}

// ==================== КОНСТАНТЫ ====================

/**
 * Базовые значения щита по уровню
 * 
 * duration в ТИКАХ!
 */
export const SHIELD_BASE_VALUES: Record<number, { hp: number; duration: number }> = {
  1: { hp: 20, duration: 3 },    // 3 тика
  2: { hp: 35, duration: 4 },
  3: { hp: 55, duration: 5 },
  4: { hp: 80, duration: 6 },
  5: { hp: 110, duration: 8 },
  6: { hp: 145, duration: 10 },
  7: { hp: 185, duration: 12 },
  8: { hp: 230, duration: 15 },
  9: { hp: 280, duration: 18 },
};

/**
 * Базовые значения исцеления по уровню
 */
export const HEAL_BASE_VALUES: Record<number, { amount: number }> = {
  1: { amount: 15 },
  2: { amount: 25 },
  3: { amount: 40 },
  4: { amount: 60 },
  5: { amount: 85 },
  6: { amount: 115 },
  7: { amount: 150 },
  8: { amount: 190 },
  9: { amount: 235 },
};

/**
 * Базовая длительность в ТИКАХ
 */
const BASE_DURATION_TICKS = {
  short: 3,
  medium: 5,
  long: 8,
} as const;

// ==================== ГЕНЕРАЦИЯ ЭФФЕКТОВ ====================

export interface DefenseHealingEffectResult {
  effects: Record<string, boolean>;
  effectValues: Record<string, number | string>;
  activeEffects: Array<{
    type: string;
    value: number;
    duration?: number; // В ТИКАХ!
    category: 'defense' | 'healing' | 'element' | 'transcendent';
  }>;
}

/**
 * Генерация эффектов для defense/healing техник
 * 
 * Длительность ВСЕГДА в ТИКАХ!
 */
export function generateDefenseHealingEffects(
  params: DefenseHealingEffectParams,
  rng: () => number
): DefenseHealingEffectResult {
  const { grade, level, type, element } = params;
  
  const effects: Record<string, boolean> = {};
  const effectValues: Record<string, number | string> = {};
  const activeEffects: DefenseHealingEffectResult['activeEffects'] = [];

  const gradeIndex = ['common', 'refined', 'perfect', 'transcendent'].indexOf(grade);
  const hasEffects = gradeIndex >= 1; // refined+

  if (hasEffects) {
    if (type === 'defense') {
      // === SHIELD ===
      effects.shield = true;

      const baseShield = SHIELD_BASE_VALUES[level] || SHIELD_BASE_VALUES[5];
      const gradeMult = 1 + gradeIndex * 0.3;
      
      effectValues.shieldHP = Math.floor(
        baseShield.hp * gradeMult * (0.8 + rng() * 0.4)
      );
      
      // Длительность в ТИКАХ
      effectValues.shieldDuration = Math.floor(
        baseShield.duration + rng() * BASE_DURATION_TICKS.short
      );

      // Damage Reduction для perfect+
      if (gradeIndex >= 2) {
        effectValues.damageReduction = Math.floor(10 + gradeIndex * 5);
      }

      // Sustain для transcendent
      if (gradeIndex >= 3) {
        effectValues.sustainRate = Math.floor(5 + rng() * 10);
      }
      
      activeEffects.push({
        type: 'shield',
        value: effectValues.shieldHP as number,
        duration: effectValues.shieldDuration as number,
        category: 'defense',
      });
    }

    if (type === 'healing') {
      // === HEAL ===
      effects.heal = true;

      const baseHeal = HEAL_BASE_VALUES[level] || HEAL_BASE_VALUES[5];
      const gradeMult = 1 + gradeIndex * 0.25;
      
      effectValues.healAmount = Math.floor(
        baseHeal.amount * gradeMult * (0.8 + rng() * 0.4)
      );

      // Длительность (HoT для высоких уровней)
      if (level >= 5 && gradeIndex >= 2) {
        // HoT: Длительность в ТИКАХ
        effectValues.healDuration = Math.floor(
          BASE_DURATION_TICKS.short + rng() * BASE_DURATION_TICKS.medium
        );
      } else {
        effectValues.healDuration = 0; // Мгновенное
      }

      // AoE для transcendent
      if (gradeIndex >= 3) {
        effectValues.healRange = Math.floor(5 + level * 2);
      }
      
      activeEffects.push({
        type: 'heal',
        value: effectValues.healAmount as number,
        duration: effectValues.healDuration as number,
        category: 'healing',
      });
    }
  }

  // === СТИХИЙНЫЙ ЭФФЕКТ ===
  // ⚠️ ВАЖНО: Healing техники НЕ имеют стихийных эффектов!
  // Только Defense техники получают стихийные эффекты
  
  if (type === 'defense' && hasElementEffect(element, grade)) {
    const elementEffect = getElementEffect(element, 'defense', grade);
    
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
  // ⚠️ ВАЖНО: Healing техники НЕ имеют transcendent-эффектов со стихиями!
  // Только Defense техники получают transcendent-эффекты
  
  if (grade === 'transcendent' && type === 'defense') {
    const transcendentEffect = getTranscendentEffect(element, 'defense');
    
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
