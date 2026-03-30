/**
 * ============================================================================
 * МЕХАНИКА ЩИТОВ (DEFENSE TECHNIQUES)
 * ============================================================================
 * 
 * Щиты — защитные техники, поглощающие урон.
 * 
 * Ключевые параметры:
 * - capacity: максимальный "запас прочности" щита
 * - currentCapacity: текущее состояние щита
 * - grade: влияет на подпитку от проводимости
 * 
 * Механики:
 * - Decay: щит истончается со временем (0.2% за ход)
 * - Sustain: щит подпитывается от проводимости (refined+)
 * - Absorption: щит поглощает урон, уменьшая capacity
 * 
 * @see src/lib/constants/technique-capacity.ts
 * @see docs/checkpoints/checkpoint_03_20_technique.md
 */

import type { TechniqueGrade } from '@/types/grade';
import {
  SHIELD_DECAY_RATE,
  SHIELD_SUSTAIN_BY_GRADE,
  calculateTechniqueCapacity,
  type CombatSubtype,
  type TechniqueType,
} from '@/lib/constants/technique-capacity';

// ==================== ТИПЫ ====================

/**
 * Состояние щита
 */
export interface ShieldState {
  /** Уникальный ID щита */
  id: string;
  /** ID техники */
  techniqueId: string;
  /** ID персонажа-владельца */
  characterId: string;
  
  /** Текущая ёмкость щита */
  currentCapacity: number;
  /** Максимальная ёмкость щита */
  maxCapacity: number;
  
  /** Grade техники */
  grade: TechniqueGrade;
  /** Элемент щита */
  element: string;
  
  /** Активен ли щит */
  isActive: boolean;
  
  /** Время создания (timestamp) */
  createdAt: number;
  /** Время последнего обновления */
  lastUpdatedAt: number;
}

/**
 * Результат поглощения урона щитом
 */
export interface ShieldAbsorptionResult {
  /** Поглощённый урон */
  blocked: number;
  /** Урон, прошедший сквозь щит */
  passed: number;
  /** Сломался ли щит */
  shieldBroken: boolean;
  /** Оставшаяся ёмкость */
  remainingCapacity: number;
}

/**
 * Результат обновления щита за ход
 */
export interface ShieldUpdateResult {
  /** Ёмкость до обновления */
  previousCapacity: number;
  /** Ёмкость после обновления */
  newCapacity: number;
  /** Потери от распада */
  decayLoss: number;
  /** Подпитка от проводимости */
  sustainGain: number;
  /** Изменение */
  netChange: number;
}

// ==================== ФУНКЦИИ ====================

/**
 * Создать новый щит
 * 
 * @param id Уникальный ID
 * @param techniqueId ID техники
 * @param characterId ID персонажа
 * @param grade Grade техники
 * @param element Элемент
 * @param techniqueLevel Уровень техники
 * @param mastery Мастерство техники
 */
export function createShield(
  id: string,
  techniqueId: string,
  characterId: string,
  grade: TechniqueGrade,
  element: string,
  techniqueLevel: number,
  mastery: number = 0
): ShieldState {
  // Рассчитываем ёмкость щита
  const capacity = calculateTechniqueCapacity(
    'defense' as TechniqueType,
    techniqueLevel,
    mastery
  );
  
  const maxCapacity = capacity ?? 72; // fallback для defense
  
  return {
    id,
    techniqueId,
    characterId,
    currentCapacity: maxCapacity,
    maxCapacity,
    grade,
    element,
    isActive: true,
    createdAt: Date.now(),
    lastUpdatedAt: Date.now(),
  };
}

/**
 * Обновить щит за ход
 * 
 * Логика:
 * 1. Щит истончается (decay) = 0.2% от maxCapacity
 * 2. Щит подпитывается (sustain) = % от conductivity × qiDensity
 * 
 * @param shield Текущее состояние щита
 * @param conductivity Проводимость персонажа
 * @param qiDensity Плотность Ци персонажа
 */
export function updateShieldPerTurn(
  shield: ShieldState,
  conductivity: number,
  qiDensity: number
): ShieldUpdateResult {
  const previousCapacity = shield.currentCapacity;
  
  // 1. Распад щита от времени
  const decayLoss = shield.maxCapacity * SHIELD_DECAY_RATE;
  
  // 2. Подпитка от проводимости (только для refined+)
  const sustainPercent = SHIELD_SUSTAIN_BY_GRADE[shield.grade];
  const sustainGain = conductivity * qiDensity * sustainPercent;
  
  // 3. Итоговое изменение
  const netChange = sustainGain - decayLoss;
  const newCapacity = Math.min(
    shield.maxCapacity,
    Math.max(0, shield.currentCapacity + netChange)
  );
  
  // Обновляем состояние
  shield.currentCapacity = newCapacity;
  shield.isActive = newCapacity > 0;
  shield.lastUpdatedAt = Date.now();
  
  return {
    previousCapacity,
    newCapacity,
    decayLoss,
    sustainGain,
    netChange,
  };
}

/**
 * Применить урон к щиту
 * 
 * @param shield Текущее состояние щита
 * @param damage Входящий урон
 */
export function applyDamageToShield(
  shield: ShieldState,
  damage: number
): ShieldAbsorptionResult {
  const blocked = Math.min(shield.currentCapacity, damage);
  const passed = damage - blocked;
  
  shield.currentCapacity -= blocked;
  shield.isActive = shield.currentCapacity > 0;
  shield.lastUpdatedAt = Date.now();
  
  return {
    blocked,
    passed,
    shieldBroken: shield.currentCapacity <= 0,
    remainingCapacity: shield.currentCapacity,
  };
}

/**
 * Восстановить щит (например, при повторном использовании техники)
 * 
 * @param shield Текущее состояние щита
 * @param percent Процент восстановления (0-1)
 */
export function repairShield(
  shield: ShieldState,
  percent: number = 1.0
): void {
  const restoreAmount = shield.maxCapacity * percent;
  shield.currentCapacity = Math.min(
    shield.maxCapacity,
    shield.currentCapacity + restoreAmount
  );
  shield.isActive = shield.currentCapacity > 0;
  shield.lastUpdatedAt = Date.now();
}

/**
 * Проверить, может ли щит поглотить урон
 */
export function canShieldAbsorb(shield: ShieldState, damage: number): boolean {
  return shield.isActive && shield.currentCapacity > 0 && damage > 0;
}

/**
 * Получить процент целостности щита
 */
export function getShieldIntegrityPercent(shield: ShieldState): number {
  if (shield.maxCapacity === 0) return 0;
  return (shield.currentCapacity / shield.maxCapacity) * 100;
}

/**
 * Деактивировать щит
 */
export function deactivateShield(shield: ShieldState): void {
  shield.isActive = false;
  shield.currentCapacity = 0;
  shield.lastUpdatedAt = Date.now();
}

// ==================== ЭКСПОРТ КОНСТАНТ ====================

export { SHIELD_DECAY_RATE, SHIELD_SUSTAIN_BY_GRADE };
