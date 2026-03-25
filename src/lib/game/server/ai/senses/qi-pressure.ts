/**
 * ============================================================================
 * QI PRESSURE - Давление Ци (Qi Pressure / Spiritual Sense)
 * ============================================================================
 * 
 * Механика определения превосходства культиваторов:
 * - 7 уровней давления: supreme, superior, stronger, equal, weaker, inferior, insignificant
 * - Влияние на поведение NPC (страх, бегство, паралич)
 * - Модификаторы боя и диалогов
 * 
 * Названия в жанре культивации:
 * - Qi Pressure (Давление Ци) — стандартный термин
 * - Spiritual Sense (Духовное чувство) — для средних уровней
 * - Divine Sense (Божественное чувство) — для L7+
 * 
 * @see docs/checkpoints/checkpoint_03_25_phase1_combat.md - Секция 5: Qi Sense и Qi Pressure
 */

import type { PressureType, QiPressureResult, NPCBehaviorModifier } from './types';
import { PRESSURE_BEHAVIOR } from './types';

// ==================== ТИПЫ ====================

/**
 * Параметры для расчёта давления Ци
 */
export interface QiPressureParams {
  /** Уровень культивации сенсора (того, кто чувствует) */
  sensorLevel: number;
  
  /** Уровень культивации цели (того, кого чувствуют) */
  targetLevel: number;
  
  /** Расстояние до цели в метрах */
  distance?: number;
  
  /** Радиус Qi Sense сенсора */
  qiSenseRange?: number;
  
  /** Пассивно ли восприятие (без активного сканирования) */
  isPassive?: boolean;
  
  /** Активен ли Divine Sense (L7+) */
  hasDivineSense?: boolean;
}

/**
 * Результат давления Ци
 */
export interface QiPressureResultFull extends QiPressureResult {
  /** Тип давления */
  type: PressureType;
  
  /** Разница уровней */
  levelDifference: number;
  
  /** Модификатор поведения */
  behavior: NPCBehaviorModifier;
  
  /** Обнаружен ли сенсор целью */
  sensorDetected: boolean;
  
  /** Расстояние */
  distance: number;
  
  /** В пределах радиуса Qi Sense */
  inQiSenseRange: boolean;
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Определить тип давления Ци
 * 
 * @param sensorLevel - Уровень культивации сенсора (того, кто чувствует)
 * @param targetLevel - Уровень культивации цели (того, кого чувствуют)
 * @returns Тип давления
 */
export function determinePressureType(
  sensorLevel: number,
  targetLevel: number
): PressureType {
  const diff = targetLevel - sensorLevel;
  
  if (diff >= 5) return 'supreme';      // Цель на 5+ уровней выше — Верховный
  if (diff >= 3) return 'superior';     // Цель на 3-4 уровня выше — Превосходящий
  if (diff >= 1) return 'stronger';     // Цель на 1-2 уровня выше — Сильнее
  if (diff === 0) return 'equal';       // Равные уровни
  if (diff >= -2) return 'weaker';      // Цель на 1-2 уровня ниже — Слабее
  if (diff >= -4) return 'inferior';    // Цель на 3-4 уровня ниже — Низшая
  return 'insignificant';               // Цель на 5+ уровней ниже — Незначительный
}

/**
 * Рассчитать полное давление Ци
 */
export function calculateQiPressure(params: QiPressureParams): QiPressureResultFull {
  const {
    sensorLevel,
    targetLevel,
    distance = 0,
    qiSenseRange = 50,
    isPassive = true,
    hasDivineSense = false,
  } = params;
  
  const type = determinePressureType(sensorLevel, targetLevel);
  const behavior = PRESSURE_BEHAVIOR[type];
  const levelDifference = targetLevel - sensorLevel;
  const inQiSenseRange = distance <= qiSenseRange;
  
  // Базовые значения из поведения
  let fear = behavior.fear;
  let fleeChance = behavior.fleeChance;
  let paralysisChance = behavior.paralysisChance;
  let attackPenalty = behavior.attackPenalty;
  
  // Divine Sense (L7+) усиливает давление
  if (hasDivineSense && targetLevel >= 7) {
    fear = Math.min(1.0, fear * 1.3);
    paralysisChance = Math.min(1.0, paralysisChance * 1.5);
  }
  
  // Пассивное восприятие ослабляет эффект
  if (isPassive) {
    fear *= 0.7;
    fleeChance *= 0.7;
    paralysisChance *= 0.5;
  }
  
  // Расстояние влияет на интенсивность
  const distanceFactor = inQiSenseRange ? 1.0 : 0.5;
  fear *= distanceFactor;
  fleeChance *= distanceFactor;
  
  // Цель обнаруживает сенсора если:
  // - Цель выше уровнем (чувствует "взгляд")
  // - Или у цели есть Divine Sense
  const sensorDetected = targetLevel > sensorLevel || (targetLevel >= 7 && !isPassive);
  
  return {
    type,
    levelDifference,
    fear,
    fleeChance,
    paralysisChance,
    attackPenalty,
    behavior,
    sensorDetected,
    distance,
    inQiSenseRange,
    dialogue: behavior.dialogue,
  };
}

/**
 * Проверить, может ли сенсор обнаружить цель через Qi Sense
 */
export function canSenseTarget(
  sensorLevel: number,
  targetLevel: number,
  distance: number,
  qiSenseRange: number
): boolean {
  // Базовая проверка расстояния
  if (distance > qiSenseRange) {
    return false;
  }
  
  // Цель на 5+ уровней выше всегда обнаруживается (давление)
  if (targetLevel - sensorLevel >= 5) {
    return true;
  }
  
  // Цель на 5+ уровней ниже может быть незаметна
  if (sensorLevel - targetLevel >= 5) {
    // Только если активно сканирует
    return false;
  }
  
  return true;
}

/**
 * Получить модификатор диалога на основе давления
 */
export function getDialogueModifier(pressureType: PressureType): {
  style: string;
  greeting: string;
  respect: number; // -1 to 1
} {
  const dialogueStyles: Record<PressureType, { style: string; greeting: string; respect: number }> = {
    supreme: {
      style: 'trembling',
      greeting: 'П-простите, старший... Я не смею...',
      respect: 1.0,
    },
    superior: {
      style: 'deferential',
      greeting: 'Приветствую, старший. Чем могу служить?',
      respect: 0.8,
    },
    stronger: {
      style: 'cautious',
      greeting: 'Приветствую. Вы ищете что-то конкретное?',
      respect: 0.4,
    },
    equal: {
      style: 'normal',
      greeting: 'Приветствую, собрат по пути.',
      respect: 0,
    },
    weaker: {
      style: 'confident',
      greeting: 'О, путник. Нужна помощь?',
      respect: -0.2,
    },
    inferior: {
      style: 'arrogant',
      greeting: 'Что тебе нужно, смертный?',
      respect: -0.5,
    },
    insignificant: {
      style: 'dismissive',
      greeting: '*не обращает внимания*',
      respect: -1.0,
    },
  };
  
  return dialogueStyles[pressureType];
}

/**
 * Проверить, должен ли NPC бежать от давления
 */
export function shouldFleeFromPressure(pressureResult: QiPressureResultFull): boolean {
  if (pressureResult.fleeChance <= 0) return false;
  
  // Рандом с учётом страха
  const roll = Math.random();
  return roll < pressureResult.fleeChance;
}

/**
 * Проверить, должен ли NPC быть парализован страхом
 */
export function shouldBeParalyzed(pressureResult: QiPressureResultFull): boolean {
  if (pressureResult.paralysisChance <= 0) return false;
  
  const roll = Math.random();
  return roll < pressureResult.paralysisChance;
}

/**
 * Применить давление Ци к NPC
 * 
 * @returns Объект с модификаторами для NPC
 */
export function applyQiPressure(
  sensorLevel: number,
  targetLevel: number,
  npcDisposition: number = 0 // -100 to 100
): {
  actionModifier: number;
  willAttack: boolean;
  willFlee: boolean;
  isParalyzed: boolean;
  dialogueStyle: string;
} {
  const result = calculateQiPressure({
    sensorLevel,
    targetLevel,
  });
  
  // Влияние характера на поведение
  const dispositionModifier = npcDisposition / 100; // -1 to 1
  
  // Дружелюбный NPC менее склонен к страху
  const adjustedFear = result.fear * (1 - dispositionModifier * 0.5);
  const adjustedFleeChance = result.fleeChance * (1 - dispositionModifier * 0.7);
  
  // Враждебный NPC более склонен к атаке
  const willAttack = result.attackPenalty < 0 
    ? Math.random() < (0.3 + dispositionModifier * 0.3)
    : Math.random() < (0.7 + result.attackPenalty);
  
  return {
    actionModifier: result.attackPenalty,
    willAttack: result.type === 'inferior' || result.type === 'insignificant' 
      ? true 
      : willAttack,
    willFlee: Math.random() < adjustedFleeChance,
    isParalyzed: Math.random() < result.paralysisChance,
    dialogueStyle: result.behavior.dialogue,
  };
}

// ==================== ЭКСПОРТ КОНСТАНТ ====================

/**
 * Названия типов давления для UI
 */
export const PRESSURE_TYPE_NAMES: Record<PressureType, { en: string; ru: string }> = {
  supreme: { en: 'Supreme', ru: 'Верховный' },
  superior: { en: 'Superior', ru: 'Превосходящий' },
  stronger: { en: 'Stronger', ru: 'Сильнее' },
  equal: { en: 'Equal', ru: 'Равный' },
  weaker: { en: 'Weaker', ru: 'Слабее' },
  inferior: { en: 'Inferior', ru: 'Низший' },
  insignificant: { en: 'Insignificant', ru: 'Незначительный' },
};
