/**
 * ============================================================================
 * СЕРВЕРНАЯ БОЕВАЯ СИСТЕМА - ЭКСПОРТЫ
 * ============================================================================
 */

// Damage Calculator
export {
  damageCalculator,
  DamageCalculator,
  calculateTechniqueDamage,
  calculateLevelSuppression,
  calculateQiBuffer,
  calculateDestabilization,
  processDamagePipeline,
  type TechniqueDamageParams,
  type TechniqueDamageResult,
  type DamagePipelineParams,
} from './damage-calculator';

// Combat Service
export {
  combatService,
  CombatService,
  type UseTechniqueParams,
  type NPCAttackParams,
  type CharacterCombatState,
  type NPCCombatState,
} from './combat-service';

// Re-export types
export * from '../types';
