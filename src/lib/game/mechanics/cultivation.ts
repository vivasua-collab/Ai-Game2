/**
 * ============================================================================
 * МЕХАНИКА КУЛЬТИВАЦИИ (CULTIVATION TECHNIQUES)
 * ============================================================================
 * 
 * Техники культивации — пассивные техники для поглощения Ци.
 * 
 * Ключевые особенности:
 * - qiCost = 0 (пассивная техника)
 * - baseCapacity = null (не использует ёмкость)
 * - Активируются во время медитации/отдыха
 * 
 * Параметры по Grade:
 * - qiBonus: +% к скорости поглощения
 * - gradient: множитель градиента (усиление в богатых Ци местах)
 * - unnoticeability: -% к прерыванию
 * 
 * @see src/lib/constants/technique-capacity.ts
 * @see docs/checkpoints/checkpoint_03_20_technique.md
 */

import type { TechniqueGrade } from '@/types/grade';
import {
  CULTIVATION_BONUS_BY_GRADE,
  calculateQiDensity,
} from '@/lib/constants/technique-capacity';

// ==================== ТИПЫ ====================

/**
 * Состояние активной культивации
 */
export interface CultivationState {
  /** ID техники культивации */
  techniqueId: string;
  /** ID персонажа */
  characterId: string;
  /** Grade техники */
  grade: TechniqueGrade;
  /** Уровень техники */
  techniqueLevel: number;
  /** Элемент техники */
  element: string;
  
  /** Время начала культивации */
  startedAt: number;
  /** Накопленное Ци за сессию */
  qiAbsorbed: number;
  /** Активна ли культивация */
  isActive: boolean;
}

/**
 * Результат поглощения Ци
 */
export interface QiAbsorptionResult {
  /** Базовое поглощение */
  baseAbsorption: number;
  /** Бонус от техники */
  techniqueBonus: number;
  /** Бонус от градиента (окружающая среда) */
  gradientBonus: number;
  /** Итого поглощено */
  totalAbsorbed: number;
}

/**
 * Результат проверки прерывания
 */
export interface InterruptionCheckResult {
  /** Было ли прервано */
  interrupted: boolean;
  /** Базовый шанс прерывания */
  baseChance: number;
  /** Шанс после модификаторов */
  modifiedChance: number;
  /** Причина (если прервано) */
  reason?: string;
}

/**
 * Параметры окружающей среды для культивации
 */
export interface CultivationEnvironment {
  /** Плотность Ци в месте культивации */
  environmentalQi: number;
  /** Наличие артефактов/формаций */
  hasArtifacts: boolean;
  /** Уровень шума/опасности */
  dangerLevel: number;
}

// ==================== ФУНКЦИИ ====================

/**
 * Начать культивацию
 */
export function startCultivation(
  techniqueId: string,
  characterId: string,
  grade: TechniqueGrade,
  techniqueLevel: number,
  element: string
): CultivationState {
  return {
    techniqueId,
    characterId,
    grade,
    techniqueLevel,
    element,
    startedAt: Date.now(),
    qiAbsorbed: 0,
    isActive: true,
  };
}

/**
 * Рассчитать поглощение Ци за тик
 * 
 * Формула:
 * baseAbsorption = baseRate × (1 + qiBonus)
 * gradientBonus = environmentalQi × gradient × gradeGradient
 * total = baseAbsorption + gradientBonus
 * 
 * @param baseRate Базовая скорость поглощения (от ядра)
 * @param state Состояние культивации
 * @param environment Параметры окружающей среды
 * @param cultivationLevel Уровень культивации персонажа
 */
export function calculateQiAbsorption(
  baseRate: number,
  state: CultivationState,
  environment: CultivationEnvironment,
  cultivationLevel: number
): QiAbsorptionResult {
  const gradeBonuses = CULTIVATION_BONUS_BY_GRADE[state.grade];
  
  // 1. Базовое поглощение
  const qiBonus = gradeBonuses.qiBonus;
  const baseAbsorption = baseRate * (1 + qiBonus);
  
  // 2. Бонус от градиента
  const gradient = gradeBonuses.gradient;
  const qiDensity = calculateQiDensity(cultivationLevel);
  const gradientBonus = environment.environmentalQi * gradient * qiDensity;
  
  // 3. Бонус от артефактов
  const artifactBonus = environment.hasArtifacts ? baseAbsorption * 0.2 : 0;
  
  // 4. Итого
  const totalAbsorbed = baseAbsorption + gradientBonus + artifactBonus;
  
  return {
    baseAbsorption,
    techniqueBonus: baseRate * qiBonus,
    gradientBonus,
    totalAbsorbed,
  };
}

/**
 * Проверить прерывание культивации
 * 
 * @param baseChance Базовый шанс прерывания (0-1)
 * @param state Состояние культивации
 * @param environment Параметры окружающей среды
 */
export function checkInterruption(
  baseChance: number,
  state: CultivationState,
  environment: CultivationEnvironment
): InterruptionCheckResult {
  const gradeBonuses = CULTIVATION_BONUS_BY_GRADE[state.grade];
  
  // Модификаторы
  const unnoticeability = gradeBonuses.unnoticeability;
  const dangerModifier = environment.dangerLevel * 0.1;
  
  // Итоговый шанс
  const modifiedChance = Math.max(0, baseChance - unnoticeability + dangerModifier);
  
  // Проверка
  const roll = Math.random();
  const interrupted = roll < modifiedChance;
  
  return {
    interrupted,
    baseChance,
    modifiedChance,
    reason: interrupted ? 'Прерывание культивации' : undefined,
  };
}

/**
 * Применить поглощение Ци к состоянию
 */
export function applyAbsorption(
  state: CultivationState,
  absorbed: number
): void {
  if (state.isActive) {
    state.qiAbsorbed += absorbed;
  }
}

/**
 * Завершить культивацию
 */
export function endCultivation(state: CultivationState): number {
  const totalQi = state.qiAbsorbed;
  state.isActive = false;
  return totalQi;
}

/**
 * Получить бонусы техники культивации по Grade
 */
export function getCultivationBonuses(grade: TechniqueGrade) {
  return CULTIVATION_BONUS_BY_GRADE[grade];
}

/**
 * Рассчитать эффективность культивации
 * 
 * Возвращает множитель эффективности на основе:
 * - Grade техники
 * - Уровня техники
 * - Окружающей среды
 */
export function calculateCultivationEfficiency(
  state: CultivationState,
  environment: CultivationEnvironment
): number {
  const gradeBonuses = CULTIVATION_BONUS_BY_GRADE[state.grade];
  
  // Базовая эффективность
  let efficiency = 1.0 + gradeBonuses.qiBonus;
  
  // Бонус от уровня техники (+5% за уровень)
  efficiency += state.techniqueLevel * 0.05;
  
  // Бонус от окружающей среды
  efficiency += environment.environmentalQi * 0.01;
  
  // Штраф от опасности
  efficiency -= environment.dangerLevel * 0.05;
  
  return Math.max(0.1, efficiency);
}

/**
 * Проверить, может ли персонаж культивировать
 */
export function canCultivate(
  currentQi: number,
  maxQi: number,
  fatigue: number
): { canCultivate: boolean; reason?: string } {
  // Если Ци полное — нет смысла культивировать
  if (currentQi >= maxQi) {
    return { canCultivate: false, reason: 'Ци полностью восстановлено' };
  }
  
  // Если слишком уставший — сложно концентрироваться
  if (fatigue > 80) {
    return { canCultivate: false, reason: 'Слишком сильная усталость' };
  }
  
  return { canCultivate: true };
}

// ==================== ЭКСПОРТ КОНСТАНТ ====================

export { CULTIVATION_BONUS_BY_GRADE };
