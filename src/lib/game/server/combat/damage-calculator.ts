/**
 * ============================================================================
 * DAMAGE PIPELINE - Полный пайплайн урона (10 слоёв)
 * ============================================================================
 * 
 * Объединяет все слои защиты в единую систему:
 * 1. Исходный урон (capacity × gradeMult)
 * 2. Level Suppression (подавление уровнем)
 * 3. Определение части тела
 * 4. Активная защита (уклонение, парирование, блок)
 * 5. Qi Buffer (поглощение Ци - 90%!)
 * 6. Покрытие брони
 * 7. Снижение бронёй
 * 8. Материал тела
 * 9. Распределение по HP
 * 10. Последствия
 * 
 * @see docs/body_armor.md - Архитектура слоёв защиты
 * @see docs/technique-system-v2.md - Формулы урона
 */

import type {
  AttackerParams,
  DefenderParams,
  CombatResult,
  CombatEffect,
  LevelSuppressionResult,
  QiBufferResult,
  DestabilizationResult,
  BodyMaterial,
  AttackType,
  TechniqueGrade,
  CombatSubtype,
  TechniqueElement,
} from '../types';
import {
  MATERIAL_DAMAGE_REDUCTION,
  LEVEL_SUPPRESSION_TABLE,
  GRADE_DAMAGE_MULTIPLIERS,
  BASE_CAPACITY_BY_TYPE,
  BASE_CAPACITY_BY_COMBAT_SUBTYPE,
  ULTIMATE_DAMAGE_MULTIPLIER,
  ULTIMATE_QI_COST_MULTIPLIER,
} from '../types';

// ==================== ТИПЫ ====================

/**
 * Результат слоя активной защиты
 */
export interface ActiveDefenseResult {
  type: 'dodge' | 'parry' | 'block' | null;
  success: boolean;
  damageReduction: number;
  message: string;
}

/**
 * Результат слоя брони
 */
export interface ArmorResult {
  coverageTriggered: boolean;
  damageReduction: number;
  penetration: number;
  remainingDamage: number;
}

/**
 * Полный результат пайплайна урона
 */
export interface DamagePipelineResult {
  // Исходные данные
  rawDamage: number;
  
  // Слой 2: Level Suppression
  levelSuppression: LevelSuppressionResult;
  damageAfterSuppression: number;
  
  // Слой 4: Активная защита
  activeDefense: ActiveDefenseResult | null;
  damageAfterActiveDefense: number;
  
  // Слой 5: Qi Buffer
  qiBuffer: QiBufferResult | null;
  damageAfterQiBuffer: number;
  
  // Слой 6-7: Броня
  armor: ArmorResult | null;
  damageAfterArmor: number;
  
  // Слой 8: Материал тела
  materialReduction: number;
  finalDamage: number;
  
  // Метаданные
  wasFullyBlocked: boolean;
  wasImmune: boolean;
  message: string;
}

/**
 * Параметры для пайплайна урона
 */
export interface DamagePipelineParams {
  rawDamage: number;
  attacker: AttackerParams;
  defender: DefenderParams;
  options?: {
    activeDefense?: ActiveDefenseResult | null;
    attackType?: AttackType;
    techniqueLevel?: number;
    isUltimate?: boolean;
    isQiTechnique?: boolean;
    armorCoverageTriggered?: boolean;
    element?: string;
  };
}

// ==================== LEVEL SUPPRESSION ====================

/**
 * Рассчитать подавление уровнем
 * 
 * @see docs/technique-system-v2.md - Секция 14
 */
export function calculateLevelSuppression(
  attackerLevel: number,
  defenderLevel: number,
  attackType: AttackType = 'technique'
): number {
  const levelDiff = Math.max(0, defenderLevel - attackerLevel);
  const cappedDiff = Math.min(levelDiff, 5) as keyof typeof LEVEL_SUPPRESSION_TABLE;
  
  return LEVEL_SUPPRESSION_TABLE[cappedDiff]?.[attackType] ?? 0;
}

/**
 * Полный расчёт подавления уровнем
 */
export function calculateLevelSuppressionFull(
  attackerLevel: number,
  defenderLevel: number,
  attackType: AttackType = 'technique',
  techniqueLevel?: number
): LevelSuppressionResult {
  const levelDifference = defenderLevel - attackerLevel;
  const absDiff = Math.max(0, levelDifference);
  const cappedDiff = Math.min(absDiff, 5) as keyof typeof LEVEL_SUPPRESSION_TABLE;
  
  const multiplier = LEVEL_SUPPRESSION_TABLE[cappedDiff]?.[attackType] ?? 0;
  
  return {
    levelDifference,
    multiplier,
    wasSuppressed: multiplier < 1.0,
    attackType,
  };
}

// ==================== QI BUFFER ====================

/**
 * Обработать урон через Qi Buffer
 * 
 * Qi Buffer поглощает 90% урона!
 * С щитовой техникой - 95%!
 * 
 * @see docs/body_armor.md - Qi Buffer
 */
export function processQiDamage(params: {
  incomingDamage: number;
  currentQi: number;
  maxQi?: number;
  hasShieldTechnique?: boolean;
}): QiBufferResult {
  const { incomingDamage, currentQi, hasShieldTechnique = false } = params;
  
  // Нет Qi - нет поглощения
  if (currentQi <= 0) {
    return {
      bufferActivated: false,
      absorbedDamage: 0,
      qiConsumed: 0,
      remainingQi: currentQi,
      remainingDamage: incomingDamage,
    };
  }
  
  // Qi Buffer поглощает 90% урона
  // С щитовой техникой - 95%
  const absorptionRate = hasShieldTechnique ? 0.95 : 0.90;
  
  // Сколько урона можно поглотить
  const maxAbsorbable = incomingDamage * absorptionRate;
  
  // Qi тратится 1:1 с поглощённым уроном
  const qiConsumed = Math.min(currentQi, maxAbsorbable);
  
  // Поглощённый урон = потраченное Qi
  const absorbedDamage = qiConsumed;
  
  // Оставшийся урон
  const remainingDamage = Math.max(0, incomingDamage - absorbedDamage);
  
  return {
    bufferActivated: true,
    absorbedDamage,
    qiConsumed,
    remainingQi: currentQi - qiConsumed,
    remainingDamage,
  };
}

// ==================== TECHNIQUE DAMAGE ====================

/**
 * Параметры для расчёта урона техники
 */
export interface TechniqueDamageParams {
  techniqueLevel: number;
  techniqueType: string;
  combatSubtype?: CombatSubtype;
  grade: TechniqueGrade;
  mastery: number;
  cultivationLevel: number;
  isUltimate?: boolean;
  qiInput?: number;
}

/**
 * Результат расчёта урона техники
 */
export interface TechniqueDamageResult {
  baseCapacity: number;
  capacity: number;
  qiCost: number;
  baseDamage: number;
  gradeMultiplier: number;
  ultimateMultiplier: number;
  finalDamage: number;
  formula: string;
}

/**
 * Рассчитать урон техники
 * 
 * Формула: finalDamage = capacity × gradeMult × ultimateMult
 * 
 * @see docs/technique-system-v2.md - Секция 6
 */
export function calculateTechniqueDamage(params: TechniqueDamageParams): TechniqueDamageResult {
  const {
    techniqueLevel,
    techniqueType,
    combatSubtype,
    grade,
    mastery,
    cultivationLevel,
    isUltimate = false,
    qiInput,
  } = params;
  
  // === БАЗОВАЯ ЁМКОСТЬ ===
  
  let baseCapacity = BASE_CAPACITY_BY_TYPE[techniqueType as keyof typeof BASE_CAPACITY_BY_TYPE] ?? 48;
  
  // Для combat - переопределяем по подтипу
  if (techniqueType === 'combat' && combatSubtype) {
    baseCapacity = BASE_CAPACITY_BY_COMBAT_SUBTYPE[combatSubtype] ?? 48;
  }
  
  // Cultivation - пассивная
  if (techniqueType === 'cultivation') {
    return {
      baseCapacity: 0,
      capacity: 0,
      qiCost: 0,
      baseDamage: 0,
      gradeMultiplier: 1,
      ultimateMultiplier: 1,
      finalDamage: 0,
      formula: 'cultivation: passive, no damage',
    };
  }
  
  // === ЁМКОСТЬ ===
  // capacity = baseCapacity × 2^(level-1) × masteryBonus
  
  const levelMultiplier = Math.pow(2, techniqueLevel - 1);
  const masteryBonus = 1 + (mastery / 100) * 0.5; // +0.5% за каждый % мастерства
  
  const capacity = Math.floor(baseCapacity * levelMultiplier * masteryBonus);
  
  // === QI COST ===
  // qiCost = baseCapacity × 2^(level-1)
  
  const qiCost = Math.floor(baseCapacity * levelMultiplier);
  
  // === GRADE MULTIPLIER ===
  
  const gradeMultiplier = GRADE_DAMAGE_MULTIPLIERS[grade];
  
  // === ULTIMATE MULTIPLIER ===
  
  const ultimateMultiplier = isUltimate ? ULTIMATE_DAMAGE_MULTIPLIER : 1.0;
  
  // === ФИНАЛЬНЫЙ УРОН ===
  
  const baseDamage = capacity;
  const finalDamage = Math.floor(capacity * gradeMultiplier * ultimateMultiplier);
  
  // Формула для UI
  const formula = isUltimate
    ? `${capacity} × ${gradeMultiplier} × ${ultimateMultiplier} (Ultimate!) = ${finalDamage}`
    : `${capacity} × ${gradeMultiplier} = ${finalDamage}`;
  
  return {
    baseCapacity,
    capacity,
    qiCost,
    baseDamage,
    gradeMultiplier,
    ultimateMultiplier,
    finalDamage,
    formula,
  };
}

// ==================== DESTABILIZATION ====================

/**
 * Рассчитать дестабилизацию (переполнение Ци)
 * 
 * При qiInput > capacity:
 * - Излишки Qi рассеиваются
 * - Урон практику = excessQi × 0.5
 * - Урон по цели (melee) = inputQi × 0.5
 * - Урон по цели (ranged) = 0
 * 
 * @see docs/technique-system-v2.md - Секция 3: Дестабилизация
 */
export function calculateDestabilization(
  qiInput: number,
  capacity: number,
  isMelee: boolean
): DestabilizationResult {
  // Нет переполнения
  if (qiInput <= capacity) {
    return {
      overflow: false,
      excessQi: 0,
      backlashDamage: 0,
      targetDamage: 0,
      dissipatedQi: 0,
    };
  }
  
  // Переполнение!
  const excessQi = qiInput - capacity;
  
  // Урон практику = 50% от излишков
  const backlashDamage = Math.floor(excessQi * 0.5);
  
  // Урон по цели (только melee!)
  const targetDamage = isMelee ? Math.floor(qiInput * 0.5) : 0;
  
  // Рассеянное Qi
  const dissipatedQi = excessQi;
  
  return {
    overflow: true,
    excessQi,
    backlashDamage,
    targetDamage,
    dissipatedQi,
  };
}

// ==================== MAIN PIPELINE ====================

/**
 * Обработать урон через все слои защиты
 * 
 * @see docs/body_armor.md - Архитектура слоёв защиты
 */
export function processDamagePipeline(params: DamagePipelineParams): CombatResult {
  const { rawDamage, attacker, defender, options = {} } = params;
  const {
    activeDefense = null,
    attackType = 'technique',
    techniqueLevel,
    isUltimate = false,
    isQiTechnique = true,
    armorCoverageTriggered = true,
    element,
  } = options;
  
  let damage = rawDamage;
  const effects: CombatEffect[] = [];
  
  // ========================================
  // СЛОЙ 2: LEVEL SUPPRESSION
  // ========================================
  
  const levelSuppression = calculateLevelSuppressionFull(
    attacker.cultivationLevel,
    defender.cultivationLevel,
    isUltimate ? 'ultimate' : attackType,
    techniqueLevel
  );
  
  damage *= levelSuppression.multiplier;
  const damageAfterSuppression = damage;
  
  // Иммунитет
  if (levelSuppression.multiplier === 0) {
    return {
      success: true,
      attackerId: attacker.id,
      targetId: defender.id,
      rawDamage,
      finalDamage: 0,
      levelSuppression,
      targetHp: defender.currentHp,
      targetMaxHp: defender.maxHp,
      isDead: false,
      effects: [],
      timestamp: Date.now(),
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
  // СЛОЙ 5: QI BUFFER (для техник Ци)
  // ========================================
  
  let qiBuffer: QiBufferResult | null = null;
  
  if (isQiTechnique && defender.currentQi > 0) {
    qiBuffer = processQiDamage({
      incomingDamage: damage,
      currentQi: defender.currentQi,
      maxQi: defender.maxQi,
      hasShieldTechnique: defender.hasShieldTechnique,
    });
    
    damage = qiBuffer.remainingDamage;
    
    if (qiBuffer.bufferActivated) {
      effects.push({
        type: 'qi_absorb',
        value: qiBuffer.absorbedDamage,
      });
    }
  }
  
  const damageAfterQiBuffer = damage;
  
  // ========================================
  // СЛОЙ 6-7: БРОНЯ
  // ========================================
  
  let armor: ArmorResult | null = null;
  
  if (defender.armor && defender.armor > 0 && armorCoverageTriggered) {
    // Процентное снижение (кап 80%)
    const percentReduction = Math.min(0.8, 0.2);
    
    // Плоское снижение
    const flatReduction = defender.armor * 0.5;
    
    damage = Math.max(1, damage * (1 - percentReduction) - flatReduction);
    
    armor = {
      coverageTriggered: armorCoverageTriggered,
      damageReduction: percentReduction,
      penetration: 0,
      remainingDamage: damage,
    };
    
    effects.push({
      type: 'armor',
      value: Math.round(percentReduction * 100),
    });
  }
  
  const damageAfterArmor = damage;
  
  // ========================================
  // СЛОЙ 8: МАТЕРИАЛ ТЕЛА
  // ========================================
  
  const bodyMaterial = defender.bodyMaterial || 'organic';
  const materialReduction = MATERIAL_DAMAGE_REDUCTION[bodyMaterial] || 0;
  
  damage = Math.max(1, damage * (1 - materialReduction));
  
  // ========================================
  // ФИНАЛЬНЫЙ УРОН
  // ========================================
  
  const finalDamage = Math.max(1, Math.floor(damage));
  
  // Расчёт нового HP
  const newHp = Math.max(0, defender.currentHp - finalDamage);
  const isDead = newHp <= 0;
  
  // Элементальный эффект
  if (element && finalDamage > 0) {
    effects.push({
      type: 'element',
      value: 0,
      element: element as TechniqueElement,
      duration: getEffectDuration(element),
    });
  }
  
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
  
  const message = parts.length > 0
    ? `${finalDamage} урона (${parts.join(', ')})`
    : `${finalDamage} урона`;
  
  return {
    success: true,
    attackerId: attacker.id,
    targetId: defender.id,
    rawDamage,
    finalDamage,
    levelSuppression,
    qiBuffer,
    targetHp: newHp,
    targetMaxHp: defender.maxHp,
    isDead,
    effects,
    timestamp: Date.now(),
    message,
  };
}

// ==================== УТИЛИТЫ ====================

/**
 * Получить длительность эффектов по стихии
 */
function getEffectDuration(element: string): number {
  const durations: Record<string, number> = {
    fire: 3,      // DoT 3 тика
    water: 2,     // Slow 2 тика
    earth: 1,     // Stun 1 тик
    air: 0,       // Instant knockback
    lightning: 0, // Instant chain
    void: 0,      // Instant penetration
    neutral: 0,
    poison: 5,    // DoT 5 тиков
  };
  return durations[element] ?? 0;
}

/**
 * Быстрый расчёт финального урона
 */
export function calculateFinalDamageQuick(
  rawDamage: number,
  attackerLevel: number,
  defenderLevel: number,
  defenderQi: number = 0,
  defenderArmor: number = 0
): number {
  // Level suppression
  const multiplier = calculateLevelSuppression(attackerLevel, defenderLevel, 'technique');
  
  if (multiplier === 0) return 0;
  
  let damage = rawDamage * multiplier;
  
  // Qi buffer (90% поглощение)
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
 * Форматировать результат для UI
 */
export function formatDamagePipelineResult(result: CombatResult): string {
  const lines: string[] = [];
  
  lines.push(`⚔️ Исходный урон: ${result.rawDamage}`);
  
  if (result.levelSuppression?.wasSuppressed) {
    lines.push(`📊 Подавление: ×${result.levelSuppression.multiplier.toFixed(2)}`);
  }
  
  if (result.qiBuffer?.bufferActivated) {
    lines.push(`✨ Ци-буфер:`);
    lines.push(`   Поглощено: ${Math.floor(result.qiBuffer.absorbedDamage)}`);
    lines.push(`   Ци потрачено: ${Math.floor(result.qiBuffer.qiConsumed)}`);
  }
  
  lines.push(`❤️ Финальный урон: ${result.finalDamage}`);
  
  return lines.join('\n');
}
