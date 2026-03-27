/**
 * ============================================================================
 * SENSES SYSTEM - Система чувств NPC
 * ============================================================================
 * 
 * Экспорты модуля системы чувств:
 * - types: Типы и константы
 * - perception-config: Конфигурация центров восприятия
 * - qi-pressure: Давление Ци
 * 
 * @see docs/checkpoints/checkpoint_03_25_phase1_combat.md
 */

// Типы
export type {
  SenseType,
  PressureType,
  PerceptionType,
  Directionality,
  VisionConfig,
  HearingConfig,
  PainConfig,
  TouchConfig,
  QiSenseConfig,
  SensesConfig,
  PerceptionCenterConfig,
  DetectedTarget,
  SenseResult,
  QiPressureResult,
  NPCBehaviorModifier,
} from './types';

export {
  BASE_SENSE_RANGES,
  MORPHOLOGY_SENSE_MODIFIERS,
  SIZE_SENSE_MODIFIERS,
  MATERIAL_SENSE_MODIFIERS,
  PRESSURE_BEHAVIOR,
} from './types';

// Конфигурация восприятия
export {
  PERCEPTION_CENTERS,
  getPerceptionCenter,
  canUseVision,
  canUseQiPerception,
  getPerceptionPenalty,
  isOmnidirectional,
  getFieldOfView,
  isInFieldOfView,
  calculatePerceptionEfficiency,
} from './perception-config';

// Давление Ци
export type { QiPressureParams, QiPressureResultFull } from './qi-pressure';

export {
  determinePressureType,
  calculateQiPressure,
  canSenseTarget,
  getDialogueModifier,
  shouldFleeFromPressure,
  shouldBeParalyzed,
  applyQiPressure,
  PRESSURE_TYPE_NAMES,
} from './qi-pressure';

// ==================== ФУНКЦИИ РАСЧЁТА ЧУВСТВ ====================

import type { SoulType, BodyMorphology, SizeClass, BodyMaterial } from '../types';
import {
  BASE_SENSE_RANGES,
  MORPHOLOGY_SENSE_MODIFIERS,
  SIZE_SENSE_MODIFIERS,
  MATERIAL_SENSE_MODIFIERS,
  type SensesConfig,
  type VisionConfig,
  type HearingConfig,
  type PainConfig,
  type TouchConfig,
  type QiSenseConfig,
} from './types';
import { getFieldOfView, getPerceptionCenter } from './perception-config';

/**
 * Рассчитать полную конфигурацию чувств для NPC
 */
export function calculateSensesConfig(params: {
  soulType: SoulType;
  morphology: BodyMorphology;
  sizeClass: SizeClass;
  bodyMaterial: BodyMaterial;
  cultivationLevel: number;
  canCultivate: boolean;
}): SensesConfig {
  const { soulType, morphology, sizeClass, bodyMaterial, cultivationLevel, canCultivate } = params;
  
  // Базовые значения по SoulType
  const baseConfig = BASE_SENSE_RANGES[soulType] || BASE_SENSE_RANGES.character;
  
  // Модификаторы
  const morphMods = MORPHOLOGY_SENSE_MODIFIERS[morphology] || MORPHOLOGY_SENSE_MODIFIERS.humanoid;
  const sizeMods = SIZE_SENSE_MODIFIERS[sizeClass] || SIZE_SENSE_MODIFIERS.medium;
  const materialMods = MATERIAL_SENSE_MODIFIERS[bodyMaterial] || MATERIAL_SENSE_MODIFIERS.organic;
  
  // Расчёт зрения
  const visionRange = baseConfig.vision * morphMods.vision * sizeMods.vision;
  const vision: VisionConfig = {
    enabled: morphology !== 'amorphous' || soulType === 'spirit',
    range: visionRange,
    fieldOfView: getFieldOfView(morphology),
    nightPenalty: calculateNightPenalty(morphology, bodyMaterial),
    perceptionCenter: getPerceptionCenter(morphology).bodyPart,
  };
  
  // Расчёт слуха
  const hearingRange = baseConfig.hearing * morphMods.hearing * sizeMods.hearing;
  const hearing: HearingConfig = {
    enabled: true,
    range: hearingRange,
    sensitivity: materialMods.hearing,
  };
  
  // Расчёт боли
  const pain: PainConfig = {
    enabled: bodyMaterial !== 'ethereal',
    threshold: calculatePainThreshold(bodyMaterial),
    damageMultiplier: materialMods.pain,
  };
  
  // Расчёт осязания
  const touch: TouchConfig = {
    enabled: bodyMaterial !== 'ethereal',
    range: 0, // Только контакт
    sensitivity: materialMods.touch,
  };
  
  // Расчёт чувства Ци
  const qiSenseRange = baseConfig.qiSense * morphMods.qiSense * sizeMods.qiSense;
  const qiSense: QiSenseConfig = {
    enabled: canCultivate || soulType === 'spirit',
    range: qiSenseRange,
    levelRequired: canCultivate ? 1 : 0,
  };
  
  return {
    vision,
    hearing,
    pain,
    touch,
    qiSense,
  };
}

/**
 * Рассчитать штраф к зрению ночью
 */
function calculateNightPenalty(morphology: BodyMorphology, material: BodyMaterial): number {
  // Ночные хищники лучше видят ночью
  if (morphology === 'serpentine') return 0.3; // Только 30% штраф
  if (morphology === 'arthropod') return 0.5;  // 50% штраф
  
  // Эфирные существа не зависят от света
  if (material === 'ethereal') return 0;
  
  // Обычные существа
  return 0.7; // 70% штраф ночью
}

/**
 * Рассчитать порог боли
 */
function calculatePainThreshold(material: BodyMaterial): number {
  const thresholds: Record<BodyMaterial, number> = {
    organic: 5,
    scaled: 10,
    chitin: 8,
    ethereal: 0, // Не чувствуют боль
    mineral: 15,
    chaos: 10,
  };
  
  return thresholds[material] || 5;
}

/**
 * Проверить, обнаруживает ли NPC цель
 */
export function detectTarget(params: {
  npcPos: { x: number; y: number };
  npcFacing: number;
  npcSenses: SensesConfig;
  targetPos: { x: number; y: number };
  targetQi?: number;
  targetLevel?: number;
  isNight?: boolean;
  targetHidden?: boolean;
}): {
  detected: boolean;
  sense: 'vision' | 'hearing' | 'qiSense' | null;
  intensity: number;
} {
  const { npcPos, npcFacing, npcSenses, targetPos, targetQi, targetLevel, isNight, targetHidden } = params;
  
  // Расстояние до цели
  const dx = targetPos.x - npcPos.x;
  const dy = targetPos.y - npcPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Проверка зрения
  if (npcSenses.vision.enabled && !targetHidden) {
    if (distance <= npcSenses.vision.range) {
      // Проверка поля зрения
      const angleToTarget = Math.atan2(dy, dx) * (180 / Math.PI);
      const normalizedFacing = ((npcFacing % 360) + 360) % 360;
      const normalizedTarget = ((angleToTarget % 360) + 360) % 360;
      
      let angleDiff = Math.abs(normalizedTarget - normalizedFacing);
      if (angleDiff > 180) angleDiff = 360 - angleDiff;
      
      if (angleDiff <= npcSenses.vision.fieldOfView / 2) {
        const intensity = 1 - (distance / npcSenses.vision.range);
        const nightPenalty = isNight ? npcSenses.vision.nightPenalty : 0;
        
        return {
          detected: true,
          sense: 'vision',
          intensity: intensity * (1 - nightPenalty),
        };
      }
    }
  }
  
  // Проверка Qi Sense
  if (npcSenses.qiSense.enabled && targetQi && targetQi > 0) {
    if (distance <= npcSenses.qiSense.range) {
      const qiIntensity = targetQi / 100;
      return {
        detected: true,
        sense: 'qiSense',
        intensity: qiIntensity * (1 - distance / npcSenses.qiSense.range),
      };
    }
  }
  
  // Проверка слуха (если цель производит шум)
  // Упрощённо: считаем что цель производит шум
  if (npcSenses.hearing.enabled && distance <= npcSenses.hearing.range) {
    const intensity = (1 - distance / npcSenses.hearing.range) * npcSenses.hearing.sensitivity;
    return {
      detected: true,
      sense: 'hearing',
      intensity,
    };
  }
  
  return {
    detected: false,
    sense: null,
    intensity: 0,
  };
}
