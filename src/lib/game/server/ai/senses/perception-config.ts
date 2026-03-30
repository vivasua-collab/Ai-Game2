/**
 * ============================================================================
 * PERCEPTION CONFIG - Конфигурация центров восприятия
 * ============================================================================
 * 
 * Определяет, как разные морфологии воспринимают мир:
 * - Какая часть тела отвечает за восприятие
 * - Тип восприятия (visual, qi_based, thermal, etc.)
 * - Штрафы при повреждении центра восприятия
 * - Угол обзора и направленность
 * 
 * @see docs/checkpoints/checkpoint_03_25_phase1_combat.md - Секция 3.2: Центр восприятия
 */

import type { BodyMorphology } from '../types';
import type { PerceptionCenterConfig, Directionality, PerceptionType } from './types';

// ==================== ЦЕНТРЫ ВОСПРИЯТИЯ ====================

/**
 * Карта центров восприятия по морфологии
 */
export const PERCEPTION_CENTERS: Record<BodyMorphology, PerceptionCenterConfig> = {
  humanoid: {
    bodyPart: 'head',
    perceptionType: 'visual',
    damagePenalty: {
      damaged: 0.5,    // -50% к чувствам
      crippled: 0.8,   // -80% к чувствам
      severed: 1.0,    // Полная слепота
    },
    directionality: 'frontal',
    fieldOfView: 120,  // 120° перед собой
  },
  
  quadruped: {
    bodyPart: 'head',
    perceptionType: 'visual',
    damagePenalty: {
      damaged: 0.5,
      crippled: 0.8,
      severed: 1.0,
    },
    directionality: 'frontal',
    fieldOfView: 180,  // Шире за счёт положения глаз
  },
  
  bird: {
    bodyPart: 'head',
    perceptionType: 'visual',
    damagePenalty: {
      damaged: 0.5,
      crippled: 0.8,
      severed: 1.0,
    },
    directionality: 'frontal',
    fieldOfView: 240,  // Очень широкое поле зрения
  },
  
  serpentine: {
    bodyPart: 'head',
    perceptionType: 'thermal',  // Тепловое зрение + обычное
    damagePenalty: {
      damaged: 0.5,
      crippled: 0.8,
      severed: 1.0,
    },
    directionality: 'frontal',
    fieldOfView: 100,
    // Особенность: thermal_sense работает от всего тела
  },
  
  arthropod: {
    bodyPart: 'cephalothorax',  // Головогрудь
    perceptionType: 'visual',   // Множество простых глаз
    damagePenalty: {
      damaged: 0.3,  // Много глаз — трудно повредить все
      crippled: 0.6,
      severed: 1.0,
    },
    directionality: 'omnidirectional',
    fieldOfView: 360,  // Всенаправленное
  },
  
  amorphous: {
    bodyPart: 'core',
    perceptionType: 'qi_based',  // Духи воспринимают через Qi
    damagePenalty: {
      damaged: 0.7,
      crippled: 0.9,
      severed: 1.0,
    },
    directionality: 'omnidirectional',
    // Нет глаз — всенаправленное Qi-восприятие
  },
  
  hybrid_centaur: {
    bodyPart: 'head',
    perceptionType: 'visual',
    damagePenalty: {
      damaged: 0.5,
      crippled: 0.8,
      severed: 1.0,
    },
    directionality: 'frontal',
    fieldOfView: 150,
  },
  
  hybrid_mermaid: {
    bodyPart: 'head',
    perceptionType: 'visual',
    damagePenalty: {
      damaged: 0.5,
      crippled: 0.8,
      severed: 1.0,
    },
    directionality: 'frontal',
    fieldOfView: 180,
  },
  
  hybrid_harpy: {
    bodyPart: 'head',
    perceptionType: 'visual',
    damagePenalty: {
      damaged: 0.5,
      crippled: 0.8,
      severed: 1.0,
    },
    directionality: 'frontal',
    fieldOfView: 270,  // Как у птиц
  },
  
  hybrid_lamia: {
    bodyPart: 'head',
    perceptionType: 'thermal',  // Как у змей
    damagePenalty: {
      damaged: 0.5,
      crippled: 0.8,
      severed: 1.0,
    },
    directionality: 'frontal',
    fieldOfView: 100,
  },
};

// ==================== ФУНКЦИИ ====================

/**
 * Получить конфигурацию центра восприятия для морфологии
 */
export function getPerceptionCenter(morphology: BodyMorphology): PerceptionCenterConfig {
  return PERCEPTION_CENTERS[morphology] || PERCEPTION_CENTERS.humanoid;
}

/**
 * Проверить, может ли морфология использовать зрение
 */
export function canUseVision(morphology: BodyMorphology): boolean {
  const config = PERCEPTION_CENTERS[morphology];
  return config.perceptionType === 'visual' || config.perceptionType === 'thermal';
}

/**
 * Проверить, может ли морфология использовать Qi-восприятие
 */
export function canUseQiPerception(morphology: BodyMorphology): boolean {
  const config = PERCEPTION_CENTERS[morphology];
  return config.perceptionType === 'qi_based' || config.perceptionType === 'thermal';
}

/**
 * Получить штраф к чувствам при повреждении части тела
 * 
 * @param morphology - Морфология NPC
 * @param damageLevel - Уровень повреждения: 'damaged' | 'crippled' | 'severed'
 * @returns Множитель штрафа (0.0 = нет штрафа, 1.0 = полная потеря)
 */
export function getPerceptionPenalty(
  morphology: BodyMorphology,
  damageLevel: 'damaged' | 'crippled' | 'severed'
): number {
  const config = PERCEPTION_CENTERS[morphology];
  return config.damagePenalty[damageLevel];
}

/**
 * Проверить, является ли восприятие всенаправленным
 */
export function isOmnidirectional(morphology: BodyMorphology): boolean {
  const config = PERCEPTION_CENTERS[morphology];
  return config.directionality === 'omnidirectional';
}

/**
 * Получить угол обзора для морфологии
 */
export function getFieldOfView(morphology: BodyMorphology): number {
  const config = PERCEPTION_CENTERS[morphology];
  return config.fieldOfView || 120;
}

/**
 * Проверить, находится ли цель в поле зрения
 * 
 * @param viewerPos - Позиция наблюдателя {x, y}
 * @param viewerFacing - Направление взгляда в градусах
 * @param targetPos - Позиция цели {x, y}
 * @param morphology - Морфология наблюдателя
 */
export function isInFieldOfView(
  viewerPos: { x: number; y: number },
  viewerFacing: number,
  targetPos: { x: number; y: number },
  morphology: BodyMorphology
): boolean {
  const config = PERCEPTION_CENTERS[morphology];
  
  // Всенаправленное восприятие — всегда видит
  if (config.directionality === 'omnidirectional') {
    return true;
  }
  
  // Рассчитать угол к цели
  const dx = targetPos.x - viewerPos.x;
  const dy = targetPos.y - viewerPos.y;
  const angleToTarget = Math.atan2(dy, dx) * (180 / Math.PI);
  
  // Нормализовать углы
  const normalizedFacing = ((viewerFacing % 360) + 360) % 360;
  const normalizedTarget = ((angleToTarget % 360) + 360) % 360;
  
  // Разница углов
  let angleDiff = Math.abs(normalizedTarget - normalizedFacing);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;
  
  // Проверить поле зрения
  const fov = config.fieldOfView || 120;
  return angleDiff <= fov / 2;
}

/**
 * Рассчитать эффективность восприятия с учётом повреждений
 * 
 * @param morphology - Морфология
 * @param bodyPartDamage - Карта повреждений частей тела
 */
export function calculatePerceptionEfficiency(
  morphology: BodyMorphology,
  bodyPartDamage: Record<string, 'healthy' | 'damaged' | 'crippled' | 'severed'>
): number {
  const config = PERCEPTION_CENTERS[morphology];
  const bodyPartStatus = bodyPartDamage[config.bodyPart] || 'healthy';
  
  if (bodyPartStatus === 'healthy') {
    return 1.0;
  }
  
  return 1.0 - config.damagePenalty[bodyPartStatus];
}
