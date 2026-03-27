/**
 * ============================================================================
 * SENSES TYPES - Типы системы чувств NPC
 * ============================================================================
 * 
 * Определяет структуру данных для системы чувств NPC:
 * - Vision (зрение)
 * - Hearing (слух)
 * - Pain (боль)
 * - Touch (осязание)
 * - QiSense (чувство Ци)
 * - QiPressure (давление Ци)
 * 
 * @see docs/checkpoints/checkpoint_03_25_phase1_combat.md - Секция: Система чувств NPC
 */

import type { BodyMorphology, BodyMaterial, SizeClass, SoulType } from '../types';

// ==================== ТИПЫ ЧУВСТВ ====================

/**
 * Тип чувства
 */
export type SenseType = 'vision' | 'hearing' | 'pain' | 'touch' | 'qiSense';

/**
 * Тип давления Ци
 */
export type PressureType = 
  | 'supreme'     // Цель на 5+ уровней выше — Верховный
  | 'superior'    // Цель на 3-4 уровня выше — Превосходящий
  | 'stronger'    // Цель на 1-2 уровня выше — Сильнее
  | 'equal'       // Равные уровни
  | 'weaker'      // Цель на 1-2 уровня ниже — Слабее
  | 'inferior'    // Цель на 3-4 уровня ниже — Низшая
  | 'insignificant'; // Цель на 5+ уровней ниже — Незначительный

/**
 * Тип восприятия
 */
export type PerceptionType = 
  | 'visual'         // Обычное зрение
  | 'qi_based'       // Qi-восприятие (для духов)
  | 'thermal'        // Тепловое зрение (змеи)
  | 'vibration'      // Виброчувствительность
  | 'omnidirectional'; // Всенаправленное

/**
 * Направленность восприятия
 */
export type Directionality = 
  | 'frontal'        // Фронтальное (перед собой)
  | 'omnidirectional' // Всенаправленное
  | 'hemispheric';   // Полушарное (перед + по бокам)

// ==================== КОНФИГУРАЦИИ ЧУВСТВ ====================

/**
 * Конфигурация зрения
 */
export interface VisionConfig {
  enabled: boolean;
  range: number;                // Метры
  fieldOfView: number;          // Градусы (120 = человек)
  nightPenalty: number;         // Снижение ночью (0.0 - 1.0)
  perceptionCenter: string;     // Часть тела для восприятия
}

/**
 * Конфигурация слуха
 */
export interface HearingConfig {
  enabled: boolean;
  range: number;
  sensitivity: number;          // Множитель громкости
}

/**
 * Конфигурация боли
 */
export interface PainConfig {
  enabled: boolean;
  threshold: number;            // Минимальный урон для реакции
  damageMultiplier: number;     // Множитель чувствительности к боли
}

/**
 * Конфигурация осязания
 */
export interface TouchConfig {
  enabled: boolean;
  range: number;                // 0 = только контакт
  sensitivity: number;          // Чувствительность к прикосновениям
}

/**
 * Конфигурация чувства Ци
 */
export interface QiSenseConfig {
  enabled: boolean;
  range: number;
  levelRequired: number;        // Минимальный уровень культивации
}

/**
 * Полная конфигурация чувств NPC
 */
export interface SensesConfig {
  vision: VisionConfig;
  hearing: HearingConfig;
  pain: PainConfig;
  touch: TouchConfig;
  qiSense: QiSenseConfig;
}

// ==================== ЦЕНТР ВОСПРИЯТИЯ ====================

/**
 * Конфигурация центра восприятия для морфологии
 */
export interface PerceptionCenterConfig {
  /** Часть тела, отвечающая за восприятие */
  bodyPart: string;
  
  /** Тип восприятия */
  perceptionType: PerceptionType;
  
  /** Зависимости от состояния части тела */
  damagePenalty: {
    damaged: number;    // Штраф при повреждении (0-1)
    crippled: number;   // Штраф при параличе (0-1)
    severed: number;    // Штраф при уничтожении (0-1)
  };
  
  /** Направленность восприятия */
  directionality: Directionality;
  
  /** Угол обзора (для directional) */
  fieldOfView?: number;  // градусы
}

// ==================== РЕЗУЛЬТАТЫ ЧУВСТВ ====================

/**
 * Обнаруженная цель
 */
export interface DetectedTarget {
  id: string;
  type: 'player' | 'npc' | 'creature';
  position: { x: number; y: number };
  distance: number;
  direction: number;           // Угол в градусах
  visibility: number;          // 0.0 - 1.0 (насколько хорошо видно)
}

/**
 * Результат работы чувства
 */
export interface SenseResult {
  type: SenseType;
  detected: boolean;
  targets: DetectedTarget[];
  intensity: number;            // 0.0 - 1.0
  timestamp: number;
  
  // Специфичные данные
  pressureType?: PressureType;  // Для Qi Sense
  perceptionCenterDamaged?: boolean;
  noiseType?: string;           // Для Hearing
  damageSource?: string;        // Для Pain
}

/**
 * Результат давления Ци
 */
export interface QiPressureResult {
  type: PressureType;
  levelDifference: number;
  fear: number;              // 0-1 уровень страха
  fleeChance: number;        // 0-1 шанс бегства
  paralysisChance: number;   // 0-1 шанс паралича
  attackPenalty: number;     // -1 to +0.3 модификатор атаки
  dialogueStyle: string;
}

/**
 * Модификатор поведения NPC от давления Ци
 */
export interface NPCBehaviorModifier {
  fear: number;
  fleeChance: number;
  paralysisChance: number;
  attackPenalty: number;
  dialogue: string;
}

// ==================== БАЗОВЫЕ РАДИУСЫ ====================

/**
 * Базовые радиусы чувств по SoulType (L1)
 */
export const BASE_SENSE_RANGES: Record<SoulType, {
  vision: number;
  hearing: number;
  qiSense: number;
}> = {
  character: { vision: 15, hearing: 20, qiSense: 50 },
  creature: { vision: 20, hearing: 30, qiSense: 30 },
  spirit: { vision: 10, hearing: 15, qiSense: 100 },
  construct: { vision: 8, hearing: 5, qiSense: 20 },
  artifact: { vision: 5, hearing: 0, qiSense: 50 },
};

/**
 * Модификаторы радиусов по Morphology (L2)
 */
export const MORPHOLOGY_SENSE_MODIFIERS: Record<BodyMorphology, {
  vision: number;
  hearing: number;
  qiSense: number;
}> = {
  humanoid: { vision: 1.0, hearing: 1.0, qiSense: 1.0 },
  quadruped: { vision: 1.3, hearing: 1.5, qiSense: 0.8 },
  bird: { vision: 2.0, hearing: 1.0, qiSense: 0.7 },
  serpentine: { vision: 0.5, hearing: 1.5, qiSense: 1.2 },
  arthropod: { vision: 0.3, hearing: 2.0, qiSense: 0.5 },
  amorphous: { vision: 0.0, hearing: 0.5, qiSense: 2.0 },
  hybrid_centaur: { vision: 1.2, hearing: 1.3, qiSense: 1.0 },
  hybrid_mermaid: { vision: 0.8, hearing: 1.5, qiSense: 1.0 },
  hybrid_harpy: { vision: 1.8, hearing: 1.0, qiSense: 0.8 },
  hybrid_lamia: { vision: 0.5, hearing: 1.3, qiSense: 1.2 },
};

/**
 * Модификаторы радиусов по SizeClass
 */
export const SIZE_SENSE_MODIFIERS: Record<SizeClass, {
  vision: number;
  hearing: number;
  qiSense: number;
}> = {
  tiny: { vision: 0.5, hearing: 1.0, qiSense: 0.5 },
  small: { vision: 0.75, hearing: 1.0, qiSense: 0.75 },
  medium: { vision: 1.0, hearing: 1.0, qiSense: 1.0 },
  large: { vision: 1.3, hearing: 1.2, qiSense: 1.2 },
  huge: { vision: 1.6, hearing: 1.5, qiSense: 1.5 },
};

/**
 * Модификаторы чувств по BodyMaterial
 */
export const MATERIAL_SENSE_MODIFIERS: Record<BodyMaterial, {
  vision: number;
  hearing: number;
  pain: number;
  touch: number;
  qiSense: number;
}> = {
  organic: { vision: 1.0, hearing: 1.0, pain: 1.0, touch: 1.0, qiSense: 1.0 },
  scaled: { vision: 0.9, hearing: 0.8, pain: 0.7, touch: 0.5, qiSense: 1.0 },
  chitin: { vision: 0.5, hearing: 1.5, pain: 0.5, touch: 0.3, qiSense: 0.8 },
  ethereal: { vision: 0.5, hearing: 0.7, pain: 0.0, touch: 0.0, qiSense: 2.0 },
  mineral: { vision: 0.3, hearing: 0.5, pain: 0.3, touch: 0.2, qiSense: 0.5 },
  chaos: { vision: 1.0, hearing: 1.0, pain: 0.5, touch: 0.5, qiSense: 1.0 },
};

// ==================== ДАВЛЕНИЕ ЦИ ====================

/**
 * Влияние давления Ци на поведение NPC
 */
export const PRESSURE_BEHAVIOR: Record<PressureType, NPCBehaviorModifier> = {
  supreme: {
    fear: 1.0,
    fleeChance: 0.9,
    paralysisChance: 0.5,
    attackPenalty: -0.8,
    dialogue: 'trembling',
  },
  superior: {
    fear: 0.7,
    fleeChance: 0.6,
    paralysisChance: 0.2,
    attackPenalty: -0.5,
    dialogue: 'deferential',
  },
  stronger: {
    fear: 0.4,
    fleeChance: 0.3,
    paralysisChance: 0,
    attackPenalty: -0.2,
    dialogue: 'cautious',
  },
  equal: {
    fear: 0,
    fleeChance: 0,
    paralysisChance: 0,
    attackPenalty: 0,
    dialogue: 'normal',
  },
  weaker: {
    fear: 0,
    fleeChance: 0,
    paralysisChance: 0,
    attackPenalty: 0.1,
    dialogue: 'confident',
  },
  inferior: {
    fear: 0,
    fleeChance: 0,
    paralysisChance: 0,
    attackPenalty: 0.2,
    dialogue: 'arrogant',
  },
  insignificant: {
    fear: 0,
    fleeChance: 0,
    paralysisChance: 0,
    attackPenalty: 0.3,
    dialogue: 'dismissive',
  },
};
