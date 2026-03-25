/**
 * ============================================================================
 * ЭФФЕКТЫ TIER 5: CULTIVATION
 * ============================================================================
 *
 * Специальные эффекты:
 * - qiRegen: Регенерация Ци
 * - efficiency: Снижение затрат Ци
 * - breakthrough: Помощь в прорыве
 *
 * @see docs/checkpoints/checkpoint_03_21_generator_V2.md
 */

import type { TechniqueGrade } from '@/types/grade';

/**
 * Параметры эффекта
 */
export interface CultivationEffectParams {
  grade: TechniqueGrade;
  level: number;
}

/**
 * Эффект регенерации Ци
 */
export interface QiRegenEffect {
  qiRegenPercent: number;   // % от максимального Ци за ход
  qiRegenFlat?: number;     // Фиксированная величина
}

/**
 * Эффект эффективности
 */
export interface EfficiencyEffect {
  qiCostReduction: number;  // % снижения затрат
  fatigueReduction?: number; // % снижения усталости
}

/**
 * Эффект прорыва
 */
export interface BreakthroughEffect {
  breakthroughBonus: number; // +% к шансу прорыва
  stabilityBonus?: number;   // +% к стабильности
}

/**
 * Генерация эффектов для cultivation
 */
export function generateCultivationEffects(
  params: CultivationEffectParams,
  rng: () => number
): {
  effects: Record<string, boolean>;
  effectValues: Record<string, number>;
} {
  const { grade, level } = params;
  const effects: Record<string, boolean> = {};
  const effectValues: Record<string, number> = {};

  const gradeIndex = ['common', 'refined', 'perfect', 'transcendent'].indexOf(grade);

  // === QI REGEN ===
  effects.qiRegen = true;

  const baseRegen = 2 + level * 0.5;
  effectValues.qiRegenPercent = Math.floor(baseRegen * (1 + gradeIndex * 0.3) * (0.8 + rng() * 0.4));

  // Фиксированная регенерация для высоких уровней
  if (level >= 5) {
    effectValues.qiRegenFlat = Math.floor(level * 2);
  }

  // === EFFICIENCY (refined+) ===
  if (gradeIndex >= 1) {
    effects.efficiency = true;

    const baseReduction = 5 + level * 1.5;
    effectValues.qiCostReduction = Math.floor(baseReduction * (1 + gradeIndex * 0.2));

    // Снижение усталости для perfect+
    if (gradeIndex >= 2) {
      effectValues.fatigueReduction = Math.floor(10 + gradeIndex * 5);
    }
  }

  // === BREAKTHROUGH (perfect+) ===
  if (gradeIndex >= 2) {
    effects.breakthrough = true;

    effectValues.breakthroughBonus = Math.floor(5 + level + gradeIndex * 5);

    // Стабильность для transcendent
    if (gradeIndex >= 3) {
      effectValues.stabilityBonus = Math.floor(10 + level * 2);
    }
  }

  // === MEDITATION BONUS ===
  effects.meditation = true;
  effectValues.meditationMultiplier = Math.floor(100 + gradeIndex * 25 + level * 10);

  return { effects, effectValues };
}

/**
 * Базовые значения регенерации по уровню
 */
export const QI_REGEN_BASE_VALUES: Record<number, { percent: number; flat: number }> = {
  1: { percent: 2, flat: 0 },
  2: { percent: 3, flat: 0 },
  3: { percent: 4, flat: 0 },
  4: { percent: 5, flat: 0 },
  5: { percent: 6, flat: 10 },
  6: { percent: 7, flat: 12 },
  7: { percent: 8, flat: 14 },
  8: { percent: 10, flat: 16 },
  9: { percent: 12, flat: 18 },
};

/**
 * Бонусы техник культивации по Grade
 *
 * @see src/lib/constants/technique-capacity.ts
 */
export const CULTIVATION_BONUSES_BY_GRADE: Record<TechniqueGrade, {
  qiBonus: number;        // +% к скорости поглощения
  gradient: number;       // Множитель градиента
  unnoticeability: number; // -% к обнаружению
}> = {
  common: {
    qiBonus: 0.10,
    gradient: 1.0,
    unnoticeability: 0.05,
  },
  refined: {
    qiBonus: 0.20,
    gradient: 1.2,
    unnoticeability: 0.10,
  },
  perfect: {
    qiBonus: 0.35,
    gradient: 1.5,
    unnoticeability: 0.15,
  },
  transcendent: {
    qiBonus: 0.50,
    gradient: 2.0,
    unnoticeability: 0.25,
  },
};
