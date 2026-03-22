/**
 * ============================================================================
 * ЭФФЕКТЫ TIER 4: SUPPORT, MOVEMENT, SENSORY
 * ============================================================================
 *
 * Баффы и утилити:
 * - buff: Усиление характеристик
 * - speed: Увеличение скорости
 * - sense: Улучшение восприятия
 *
 * Длительность указывается в ТИКАХ (1 тик = 1 минута).
 *
 * @see docs/checkpoints/checkpoint_03_21_generator_V2.md
 * @see docs/technique-system-v2.md#9.3
 */

import type { TechniqueGrade } from '@/types/grade';
import type { TechniqueElement, TechniqueType } from '@/types/technique-types';
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

export interface SupportUtilityEffectParams {
  grade: TechniqueGrade;
  level: number;
  type: 'support' | 'movement' | 'sensory';
  element: TechniqueElement;
}

/**
 * Эффект баффа
 * 
 * ⚠️ ВАЖНО: Support баффы НЕ могут увеличивать физические характеристики!
 * Только временные модификаторы.
 * 
 * Длительность в ТИКАХ!
 */
export interface BuffEffect {
  buffType: 'damage_percent' | 'crit_chance' | 'crit_damage' | 'resistance' | 'speed' | 'pierce';
  buffAmount: number;       // Величина усиления (%)
  buffDuration: number;     // Длительность в ТИКАХ
}

/**
 * Эффект скорости
 * 
 * Длительность в ТИКАХ!
 */
export interface SpeedEffect {
  speedBonus: number;       // % увеличения скорости
  speedDuration: number;    // Длительность в ТИКАХ
  dashDistance?: number;    // Дистанция рывка (для movement)
}

/**
 * Эффект восприятия
 * 
 * Длительность в ТИКАХ!
 */
export interface SenseEffect {
  senseRange: number;       // Радиус восприятия
  senseType: string;        // Тип восприятия
  senseDuration: number;    // Длительность в ТИКАХ
}

// ==================== КОНСТАНТЫ ====================

/**
 * Базовые значения баффа по уровню
 * 
 * Длительность в ТИКАХ!
 */
export const BUFF_BASE_VALUES: Record<number, { amount: number; duration: number }> = {
  1: { amount: 5, duration: 3 },    // 3 тика
  2: { amount: 8, duration: 4 },
  3: { amount: 12, duration: 5 },
  4: { amount: 17, duration: 6 },
  5: { amount: 23, duration: 8 },
  6: { amount: 30, duration: 10 },
  7: { amount: 38, duration: 12 },
  8: { amount: 47, duration: 15 },
  9: { amount: 57, duration: 18 },
};

/**
 * Типы восприятия
 */
export const SENSE_TYPES = {
  qi: { description: 'Чувство Ци', reveals: 'Ци противников' },
  life: { description: 'Чувство жизни', reveals: 'Живые существа' },
  danger: { description: 'Чутьё опасности', reveals: 'Угрозы' },
  truth: { description: 'Глаз истины', reveals: 'Скрытое' },
} as const;

/**
 * Базовая длительность в ТИКАХ
 */
const BASE_DURATION_TICKS = {
  short: 3,
  medium: 5,
  long: 8,
} as const;

// ==================== ГЕНЕРАЦИЯ ЭФФЕКТОВ ====================

export interface SupportUtilityEffectResult {
  effects: Record<string, boolean>;
  effectValues: Record<string, number | string>;
  activeEffects: Array<{
    type: string;
    value: number;
    duration?: number; // В ТИКАХ!
    category: 'buff' | 'movement' | 'sense' | 'element' | 'transcendent';
  }>;
}

/**
 * Генерация эффектов для support/movement/sensory
 */
export function generateSupportUtilityEffects(
  params: SupportUtilityEffectParams,
  rng: () => number
): SupportUtilityEffectResult {
  const { grade, level, type, element } = params;
  
  const effects: Record<string, boolean> = {};
  const effectValues: Record<string, number | string> = {};
  const activeEffects: SupportUtilityEffectResult['activeEffects'] = [];

  const gradeIndex = ['common', 'refined', 'perfect', 'transcendent'].indexOf(grade);
  const baseValues = BUFF_BASE_VALUES[level] || BUFF_BASE_VALUES[5];

  switch (type) {
    case 'support':
      // === BUFF ===
      // ⚠️ ВАЖНО: Баффы НЕ затрагивают физические характеристики!
      // Только временные модификаторы: damage_percent, crit_chance, crit_damage, resistance, speed, pierce
      effects.buff = true;

      const buffTypes: BuffEffect['buffType'][] = [
        'damage_percent',
        'crit_chance',
        'crit_damage',
        'resistance',
        'speed',
        'pierce'
      ];
      effectValues.buffType = buffTypes[Math.floor(rng() * buffTypes.length)];

      effectValues.buffAmount = Math.floor(
        baseValues.amount * (1 + gradeIndex * 0.25) * (0.8 + rng() * 0.4)
      );
      // Длительность в ТИКАХ
      effectValues.buffDuration = Math.floor(
        baseValues.duration + rng() * BASE_DURATION_TICKS.short
      );

      // Дополнительный бафф для высоких Grade
      if (gradeIndex >= 2) {
        effects.secondBuff = true;
        const remainingTypes = buffTypes.filter(t => t !== effectValues.buffType);
        effectValues.secondBuffType = remainingTypes[Math.floor(rng() * remainingTypes.length)];
        effectValues.secondBuffAmount = Math.floor((effectValues.buffAmount as number) * 0.5);
        // Длительность в ТИКАХ
        effectValues.secondBuffDuration = effectValues.buffDuration;
      }
      
      activeEffects.push({
        type: 'buff',
        value: effectValues.buffAmount as number,
        duration: effectValues.buffDuration as number,
        category: 'buff',
      });
      break;

    case 'movement':
      // === SPEED / DASH ===
      effects.speed = true;

      const baseSpeed = 10 + level * 5;
      effectValues.speedBonus = Math.floor(
        baseSpeed * (1 + gradeIndex * 0.15)
      );
      // Длительность в ТИКАХ
      effectValues.speedDuration = Math.floor(
        BASE_DURATION_TICKS.short + rng() * BASE_DURATION_TICKS.short
      );

      // Рывок для refined+
      if (gradeIndex >= 1) {
        effects.dash = true;
        effectValues.dashDistance = Math.floor(3 + level + gradeIndex * 2);
      }

      // Телепортация для transcendent
      if (gradeIndex >= 3) {
        effects.teleport = true;
        effectValues.teleportDistance = Math.floor(10 + level * 2);
      }
      
      activeEffects.push({
        type: 'speed',
        value: effectValues.speedBonus as number,
        duration: effectValues.speedDuration as number,
        category: 'movement',
      });
      break;

    case 'sensory':
      // === SENSE ===
      effects.sense = true;

      const baseRange = 10 + level * 5;
      effectValues.senseRange = Math.floor(
        baseRange * (1 + gradeIndex * 0.2)
      );
      // Длительность в ТИКАХ
      effectValues.senseDuration = Math.floor(
        BASE_DURATION_TICKS.medium + level * 2
      );

      const senseTypes = ['qi', 'life', 'danger', 'truth'];
      effectValues.senseType = senseTypes[Math.floor(rng() * senseTypes.length)];

      // Дополнительный тип для perfect+
      if (gradeIndex >= 2) {
        effects.enhancedSense = true;
        effectValues.enhancedSenseDuration = effectValues.senseDuration;
      }
      
      activeEffects.push({
        type: 'sense',
        value: effectValues.senseRange as number,
        duration: effectValues.senseDuration as number,
        category: 'sense',
      });
      break;
  }

  // === СТИХИЙНЫЙ ЭФФЕКТ ===
  
  if (hasElementEffect(element, grade)) {
    const elementEffect = getElementEffect(element, 'support', grade);
    
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
    const transcendentEffect = getTranscendentEffect(element, 'support');
    
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
