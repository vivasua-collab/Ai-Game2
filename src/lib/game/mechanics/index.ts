/**
 * ============================================================================
 * ЭКСПОРТ СПЕЦИАЛЬНЫХ МЕХАНИК
 * ============================================================================
 */

export {
  // Типы
  type ShieldState,
  type ShieldAbsorptionResult,
  type ShieldUpdateResult,
  
  // Функции
  createShield,
  updateShieldPerTurn,
  applyDamageToShield,
  repairShield,
  canShieldAbsorb,
  getShieldIntegrityPercent,
  deactivateShield,
  
  // Константы
  SHIELD_DECAY_RATE,
  SHIELD_SUSTAIN_BY_GRADE,
} from './shield';

export {
  // Типы
  type CultivationState,
  type QiAbsorptionResult,
  type InterruptionCheckResult,
  type CultivationEnvironment,
  
  // Функции
  startCultivation,
  calculateQiAbsorption,
  checkInterruption,
  applyAbsorption,
  endCultivation,
  getCultivationBonuses,
  calculateCultivationEfficiency,
  canCultivate,
  
  // Константы
  CULTIVATION_BONUS_BY_GRADE,
} from './cultivation';
