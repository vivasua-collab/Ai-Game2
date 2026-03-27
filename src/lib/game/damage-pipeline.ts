/**
 * ============================================================================
 * ПАЙПЛАЙН РАСЧЁТА УРОНА (Damage Pipeline)
 * ============================================================================
 * 
 * Объединяет все слои защиты в единую систему:
 * 1. Исходный урон
 * 2. Level Suppression (подавление уровнем)
 * 3. Определение части тела
 * 4. Активная защита (уклонение, парирование, блок)
 * 5. Qi Buffer (поглощение Ци)
 * 6. Покрытие брони
 * 7. Снижение бронёй
 * 8. Материал тела
 * 9. Распределение по HP
 * 10. Последствия
 * 
 * @see docs/body_armor.md - Секция 1: Архитектура Слоёв Защиты
 * @see docs/checkpoints/checkpoint_03_22_Body_update.md
 * 
 * Версия: 1.0.0
 */

import type { AttackType } from '@/types/technique-types';
import { determineAttackType } from '@/types/technique-types';
import {
  calculateLevelSuppression,
  calculateLevelSuppressionFull,
  type LevelSuppressionResult,
} from '@/lib/constants/level-suppression';
import {
  processQiDamage,
  type QiDamageResult,
} from './qi-buffer';

// ==================== ТИПЫ ====================

/**
 * Параметры атакующего
 */
export interface AttackerParams {
  /** ID атакующего */
  id?: string;
  /** Уровень культивации */
  cultivationLevel: number;
  /** Используемая техника (опционально) */
  technique?: {
    level?: number;
    isUltimate?: boolean;
  };
  /** Элемент атаки */
  element?: string;
}

/**
 * Параметры защитника
 */
export interface DefenderParams {
  /** ID защитника */
  id?: string;
  /** Уровень культивации */
  cultivationLevel: number;
  /** Текущее количество Ци */
  currentQi: number;
  /** Максимальное количество Ци */
  maxQi: number;
  /** Активна ли щитовая техника */
  hasShieldTechnique?: boolean;
  /** Значение брони */
  armor?: number;
  /** Материал тела (для снижения урона) */
  bodyMaterial?: 'organic' | 'scaled' | 'chitin' | 'ethereal' | 'mineral' | 'chaos';
  /** Твёрдость материала */
  materialHardness?: number;
}

/**
 * Результат слоя активной защиты
 */
export interface ActiveDefenseResult {
  /** Тип сработавшей защиты */
  type: 'dodge' | 'parry' | 'block' | null;
  /** Успешность */
  success: boolean;
  /** Снижение урона (0-1) */
  damageReduction: number;
  /** Сообщение */
  message: string;
}

/**
 * Результат слоя брони
 */
export interface ArmorResult {
  /** Покрытие сработало */
  coverageTriggered: boolean;
  /** Снижение урона */
  damageReduction: number;
  /** Пробитие */
  penetration: number;
  /** Урон после брони */
  remainingDamage: number;
}

/**
 * Полный результат пайплайна урона
 */
export interface DamagePipelineResult {
  // === Исходные данные ===
  /** Исходный урон */
  rawDamage: number;
  
  // === Слой 2: Level Suppression ===
  /** Результат подавления уровнем */
  levelSuppression: LevelSuppressionResult;
  /** Урон после подавления */
  damageAfterSuppression: number;
  
  // === Слой 4: Активная защита ===
  /** Результат активной защиты */
  activeDefense: ActiveDefenseResult | null;
  /** Урон после активной защиты */
  damageAfterActiveDefense: number;
  
  // === Слой 5: Qi Buffer ===
  /** Результат буфера Ци */
  qiBuffer: QiDamageResult | null;
  /** Урон после буфера Ци */
  damageAfterQiBuffer: number;
  
  // === Слой 6-7: Броня ===
  /** Результат брони */
  armor: ArmorResult | null;
  /** Урон после брони */
  damageAfterArmor: number;
  
  // === Слой 8: Материал тела ===
  /** Снижение от материала */
  materialReduction: number;
  /** Финальный урон */
  finalDamage: number;
  
  // === Метаданные ===
  /** Атака была полностью заблокирована */
  wasFullyBlocked: boolean;
  /** Цель иммунна к атаке */
  wasImmune: boolean;
  /** Сообщение для UI */
  message: string;
}

// ==================== КОНСТАНТЫ ====================

/**
 * Снижение урона от материала тела
 */
export const MATERIAL_DAMAGE_REDUCTION: Record<string, number> = {
  organic: 0,      // 0%
  scaled: 0.30,    // 30%
  chitin: 0.20,    // 20%
  ethereal: 0.70,  // 70% (физический урон)
  mineral: 0.50,   // 50%
  chaos: 0.20,     // 20%
} as const;

/**
 * Твёрдость материала по умолчанию
 */
export const DEFAULT_MATERIAL_HARDNESS: Record<string, number> = {
  organic: 3,
  scaled: 6,
  chitin: 5,
  ethereal: 1,
  mineral: 8,
  chaos: 5,
} as const;

// ==================== ОСНОВНАЯ ФУНКЦИЯ ====================

/**
 * Обработать урон через все слои защиты
 * 
 * Порядок:
 * 1. Level Suppression
 * 2. Активная защита (опционально)
 * 3. Qi Buffer (для техник Ци)
 * 4. Броня
 * 5. Материал тела
 * 
 * @param rawDamage - исходный урон
 * @param attacker - параметры атакующего
 * @param defender - параметры защитника
 * @param options - дополнительные опции
 * @returns полный результат пайплайна
 */
export function processDamagePipeline(
  rawDamage: number,
  attacker: AttackerParams,
  defender: DefenderParams,
  options?: {
    /** Результат активной защиты (если уже рассчитан) */
    activeDefense?: ActiveDefenseResult | null;
    /** Является ли атака техникой Ци */
    isQiTechnique?: boolean;
    /** Покрытие брони сработало */
    armorCoverageTriggered?: boolean;
  }
): DamagePipelineResult {
  const {
    activeDefense = null,
    isQiTechnique = true,
    armorCoverageTriggered = true,
  } = options || {};
  
  let damage = rawDamage;
  let message = '';
  
  // ========================================
  // СЛОЙ 2: LEVEL SUPPRESSION
  // ========================================
  const attackType: AttackType = determineAttackType(
    attacker.technique !== undefined,
    attacker.technique
  );
  
  const levelSuppression = calculateLevelSuppressionFull(
    attacker.cultivationLevel,
    defender.cultivationLevel,
    attackType,
    attacker.technique?.level
  );
  
  damage *= levelSuppression.multiplier;
  const damageAfterSuppression = damage;
  
  // Проверка на иммунитет
  if (levelSuppression.multiplier === 0) {
    return {
      rawDamage,
      levelSuppression,
      damageAfterSuppression: 0,
      activeDefense: null,
      damageAfterActiveDefense: 0,
      qiBuffer: null,
      damageAfterQiBuffer: 0,
      armor: null,
      damageAfterArmor: 0,
      materialReduction: 0,
      finalDamage: 0,
      wasFullyBlocked: true,
      wasImmune: true,
      message: `Цель иммунна (+${levelSuppression.levelDifference} ур.)`,
    };
  }
  
  // ========================================
  // СЛОЙ 4: АКТИВНАЯ ЗАЩИТА
  // ========================================
  if (activeDefense && activeDefense.success) {
    damage *= (1 - activeDefense.damageReduction);
  }
  const damageAfterActiveDefense = damage;
  
  // ========================================
  // СЛОЙ 5: QI BUFFER (только для техник Ци)
  // ========================================
  let qiBuffer: QiDamageResult | null = null;
  
  if (isQiTechnique && defender.currentQi > 0) {
    qiBuffer = processQiDamage({
      incomingDamage: damage,
      currentQi: defender.currentQi,
      maxQi: defender.maxQi,
      hasShieldTechnique: defender.hasShieldTechnique || false,
    });
    
    damage = qiBuffer.remainingDamage;
  }
  
  const damageAfterQiBuffer = damage;
  
  // ========================================
  // СЛОЙ 6-7: БРОНЯ
  // ========================================
  let armor: ArmorResult | null = null;
  
  if (defender.armor && defender.armor > 0 && armorCoverageTriggered) {
    // Снижение урона бронёй (процентное)
    const damageReduction = 0.2; // Базовое 20%
    const reduction = Math.min(0.8, damageReduction); // Кап 80%
    
    // Плоское снижение
    const flatReduction = defender.armor * 0.5;
    
    damage = Math.max(1, damage * (1 - reduction) - flatReduction);
    
    armor = {
      coverageTriggered: armorCoverageTriggered,
      damageReduction: reduction,
      penetration: 0,
      remainingDamage: damage,
    };
  }
  
  const damageAfterArmor = damage;
  
  // ========================================
  // СЛОЙ 8: МАТЕРИАЛ ТЕЛА
  // ========================================
  const bodyMaterial = defender.bodyMaterial || 'organic';
  const materialReduction = MATERIAL_DAMAGE_REDUCTION[bodyMaterial] || 0;
  
  damage = Math.max(1, damage * (1 - materialReduction));
  
  // ========================================
  // ФИНАЛЬНЫЙ РЕЗУЛЬТАТ
  // ========================================
  const finalDamage = Math.floor(damage);
  const wasFullyBlocked = finalDamage === 0;
  
  // Формирование сообщения
  const parts: string[] = [];
  
  if (levelSuppression.wasSuppressed) {
    parts.push(`Подавление: ${Math.round(levelSuppression.multiplier * 100)}%`);
  }
  
  if (qiBuffer && qiBuffer.bufferActivated) {
    parts.push(`Ци: -${Math.floor(qiBuffer.qiConsumed)}`);
  }
  
  if (armor && armor.coverageTriggered) {
    parts.push(`Броня: -${Math.round(armor.damageReduction * 100)}%`);
  }
  
  if (materialReduction > 0) {
    parts.push(`Материал: -${Math.round(materialReduction * 100)}%`);
  }
  
  message = parts.length > 0
    ? `${finalDamage} урона (${parts.join(', ')})`
    : `${finalDamage} урона`;
  
  return {
    rawDamage,
    levelSuppression,
    damageAfterSuppression,
    activeDefense,
    damageAfterActiveDefense,
    qiBuffer,
    damageAfterQiBuffer,
    armor,
    damageAfterArmor,
    materialReduction,
    finalDamage,
    wasFullyBlocked,
    wasImmune: false,
    message,
  };
}

// ==================== УТИЛИТЫ ====================

/**
 * Быстрый расчёт финального урона
 * 
 * Упрощённая версия для случаев, когда не нужен детальный результат.
 * 
 * @param rawDamage - исходный урон
 * @param attackerLevel - уровень атакующего
 * @param defenderLevel - уровень защитника
 * @param defenderQi - Ци защитника
 * @param defenderArmor - броня защитника
 * @returns финальный урон
 */
export function calculateFinalDamageQuick(
  rawDamage: number,
  attackerLevel: number,
  defenderLevel: number,
  defenderQi: number = 0,
  defenderArmor: number = 0
): number {
  // Level suppression
  const attackType: AttackType = 'technique';
  const multiplier = calculateLevelSuppression(attackerLevel, defenderLevel, attackType);
  
  if (multiplier === 0) return 0;
  
  let damage = rawDamage * multiplier;
  
  // Qi buffer (сырая Ци, 90% поглощение)
  if (defenderQi > 0) {
    const qiResult = processQiDamage({
      incomingDamage: damage,
      currentQi: defenderQi,
      hasShieldTechnique: false,
    });
    damage = qiResult.remainingDamage;
  }
  
  // Armor
  if (defenderArmor > 0) {
    damage = Math.max(1, damage - defenderArmor * 0.5);
  }
  
  return Math.floor(damage);
}

/**
 * Проверить, может ли атака нанести урон
 * 
 * @param attackerLevel - уровень атакующего
 * @param defenderLevel - уровень защитника
 * @param attackType - тип атаки
 * @returns true если урон возможен
 */
export function canDamageTarget(
  attackerLevel: number,
  defenderLevel: number,
  attackType: AttackType
): boolean {
  const multiplier = calculateLevelSuppression(attackerLevel, defenderLevel, attackType);
  return multiplier > 0;
}

/**
 * Получить описание пайплайна для UI
 */
export function formatDamagePipelineResult(result: DamagePipelineResult): string {
  const lines: string[] = [];
  
  lines.push(`⚔️ Исходный урон: ${result.rawDamage}`);
  
  if (result.levelSuppression.wasSuppressed) {
    lines.push(`📊 Подавление: ×${result.levelSuppression.multiplier.toFixed(2)}`);
    lines.push(`   После подавления: ${Math.floor(result.damageAfterSuppression)}`);
  }
  
  if (result.qiBuffer && result.qiBuffer.bufferActivated) {
    lines.push(`✨ Ци-буфер:`);
    lines.push(`   Поглощено: ${Math.floor(result.qiBuffer.absorbedDamage)}`);
    lines.push(`   Ци потрачено: ${Math.floor(result.qiBuffer.qiConsumed)}`);
  }
  
  if (result.armor) {
    lines.push(`🛡️ Броня: -${Math.round(result.armor.damageReduction * 100)}%`);
  }
  
  if (result.materialReduction > 0) {
    lines.push(`🧬 Материал: -${Math.round(result.materialReduction * 100)}%`);
  }
  
  lines.push(`❤️ Финальный урон: ${result.finalDamage}`);
  
  return lines.join('\n');
}
