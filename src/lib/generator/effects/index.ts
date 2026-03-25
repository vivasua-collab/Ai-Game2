/**
 * ============================================================================
 * ИНДЕКС ЭФФЕКТОВ ПО TIER
 * ============================================================================
 *
 * Экспорт всех эффектов для использования в генераторе V2.
 *
 * @see docs/checkpoints/checkpoint_03_21_generator_V2.md
 * @see docs/technique-system-v2.md
 */

// ==================== СТИХИЙНЫЕ ЭФФЕКТЫ (НОВОЕ!) ====================

export {
  getElementEffect,
  hasElementEffect,
  canHaveElementEffect,
  GRADE_EFFECT_POWER,
  ELEMENT_ATTACK_EFFECTS,
  ELEMENT_DEFENSE_EFFECTS,
  ELEMENT_SUPPORT_EFFECTS,
  type ElementEffect,
} from './element-effects';

// ==================== TRANSCENDENT-ЭФФЕКТЫ (НОВОЕ!) ====================

export {
  getTranscendentEffect,
  hasTranscendentEffect,
  getTranscendentEffectDescription,
  TRANSCENDENT_ATTACK_EFFECTS,
  TRANSCENDENT_DEFENSE_EFFECTS,
  TRANSCENDENT_SUPPORT_EFFECTS,
  type TranscendentEffect,
} from './transcendent-effects';

// ==================== TIER 1: COMBAT ====================

export {
  generateCombatEffects,
  COMBAT_GRADE_BONUSES,
  COMBAT_SUBTYPE_MULTIPLIERS,
  type CombatEffectParams,
} from './tier-1-combat';

// ==================== TIER 2: DEFENSE & HEALING ====================

export {
  generateDefenseHealingEffects,
  SHIELD_BASE_VALUES,
  HEAL_BASE_VALUES,
  type DefenseHealingEffectParams,
  type ShieldEffect,
  type HealEffect,
} from './tier-2-defense-healing';

// ==================== TIER 3: CURSE & POISON ====================

export {
  generateCursePoisonEffects,
  POISON_BASE_DAMAGE,
  CURSE_TYPES,
  type CursePoisonEffectParams,
  type PoisonEffect,
  type CurseEffect,
  type SlowEffect,
} from './tier-3-curse-poison';

// ==================== POISON ДЕБАФФЫ (НОВОЕ!) ====================

export {
  generatePoisonDebuffs,
  getPoisonDebuffCount,
  hasPoisonDebuffType,
  POISON_GRADE_DEBUFFS,
  type PoisonDebuff,
} from './poison-debuffs';

// ==================== TIER 4: SUPPORT, MOVEMENT, SENSORY ====================

export {
  generateSupportUtilityEffects,
  BUFF_BASE_VALUES,
  SENSE_TYPES,
  type SupportUtilityEffectParams,
  type BuffEffect,
  type SpeedEffect,
  type SenseEffect,
} from './tier-4-support-utility';

// ==================== TIER 5: CULTIVATION ====================

export {
  generateCultivationEffects,
  QI_REGEN_BASE_VALUES,
  CULTIVATION_BONUSES_BY_GRADE,
  type CultivationEffectParams,
  type QiRegenEffect,
  type EfficiencyEffect,
  type BreakthroughEffect,
} from './tier-5-cultivation';

// ==================== ТИПЫ ====================

export type { EffectTier } from '../technique-generator-config-v2';
