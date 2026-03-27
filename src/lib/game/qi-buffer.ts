/**
 * ============================================================================
 * БУФЕР ЦИ (Qi Buffer System)
 * ============================================================================
 * 
 * Реализует механику поглощения урона через Ци:
 * - Сырая Ци: поглощает 90% урона, 10% ВСЕГДА пробивает
 * - Щитовая техника: поглощает 100% урона (1:1 соотношение)
 * 
 * @see docs/body_review.md - Секция 3: Ци как буфер урона
 * @see src/lib/constants/qi-buffer-config.ts
 * 
 * Версия: 1.0.0
 */

import {
  QI_BUFFER_CONFIG,
  type QiBufferConfig,
  hasQiForBuffer,
} from '@/lib/constants/qi-buffer-config';

// ==================== ТИПЫ ====================

/**
 * Результат обработки урона через буфер Ци
 */
export interface QiDamageResult {
  /** Потраченное Ци */
  qiConsumed: number;
  
  /** Поглощённый урон */
  absorbedDamage: number;
  
  /** Оставшийся урон (пробитие) */
  remainingDamage: number;
  
  /** Урон, который ВСЕГДА пробивает (10% для сырой Ци) */
  piercingDamage: number;
  
  /** Был ли использован буфер */
  bufferActivated: boolean;
  
  /** Хватало ли Ци для полного поглощения */
  qiSufficient: boolean;
  
  /** Использовалась ли щитовая техника */
  usedShieldTechnique: boolean;
}

/**
 * Параметры для обработки урона через Ци
 */
export interface QiDamageParams {
  /** Входящий урон */
  incomingDamage: number;
  
  /** Текущее количество Ци */
  currentQi: number;
  
  /** Максимальное количество Ци (для информации) */
  maxQi?: number;
  
  /** Активна ли щитовая техника */
  hasShieldTechnique?: boolean;
  
  /** Кастомная конфигурация (для тестов) */
  config?: QiBufferConfig;
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Обработать урон через буфер Ци
 * 
 * Механика v5.0:
 * - Сырая Ци: 90% поглощение, 10% пробитие ВСЕГДА
 * - Щитовая техника: 100% поглощение
 * 
 * @param params - параметры обработки
 * @returns результат обработки
 * 
 * @example
 * // Сырая Ци, достаточно
 * processQiDamage({ incomingDamage: 100, currentQi: 500 })
 * // → { qiConsumed: 270, absorbedDamage: 90, remainingDamage: 10, ... }
 * 
 * @example
 * // Щитовая техника
 * processQiDamage({ incomingDamage: 100, currentQi: 500, hasShieldTechnique: true })
 * // → { qiConsumed: 100, absorbedDamage: 100, remainingDamage: 0, ... }
 */
export function processQiDamage(params: QiDamageParams): QiDamageResult {
  const {
    incomingDamage,
    currentQi,
    hasShieldTechnique = false,
    config = QI_BUFFER_CONFIG,
  } = params;
  
  // Если Ци недостаточно для активации буфера
  if (!hasQiForBuffer(currentQi)) {
    return {
      qiConsumed: 0,
      absorbedDamage: 0,
      remainingDamage: incomingDamage,
      piercingDamage: incomingDamage,
      bufferActivated: false,
      qiSufficient: false,
      usedShieldTechnique: false,
    };
  }
  
  if (hasShieldTechnique) {
    // === ЩИТОВАЯ ТЕХНИКА: 100% поглощение ===
    return processShieldTechnique(incomingDamage, currentQi, config);
  } else {
    // === СЫРАЯ ЦИ: 90% поглощение, 10% пробитие ===
    return processRawQi(incomingDamage, currentQi, config);
  }
}

/**
 * Обработать урон через сырую Ци (без щитовой техники)
 * 
 * Механика:
 * - 90% урона можно поглотить (3 Ци за 1 урон)
 * - 10% урона ВСЕГДА пробивает
 */
function processRawQi(
  incomingDamage: number,
  currentQi: number,
  config: QiBufferConfig
): QiDamageResult {
  // Урон, который можно поглотить сырой Ци (90%)
  const absorbableDamage = incomingDamage * config.rawQiAbsorptionPercent;
  
  // Урон, который ВСЕГДА пробивает (10%)
  const piercingDamage = incomingDamage * (1 - config.rawQiAbsorptionPercent);
  
  // Требуемое Ци для поглощения 90%
  const requiredQi = absorbableDamage * config.baseQiAbsorptionRatio;
  
  if (currentQi >= requiredQi) {
    // Достаточно Ци для поглощения 90%
    return {
      qiConsumed: requiredQi,
      absorbedDamage: absorbableDamage,
      remainingDamage: piercingDamage,  // 10% всегда пробивает
      piercingDamage,
      bufferActivated: true,
      qiSufficient: true,
      usedShieldTechnique: false,
    };
  } else {
    // Недостаточно Ци — поглощаем сколько можем
    const absorbedDamage = currentQi / config.baseQiAbsorptionRatio;
    const notAbsorbed = absorbableDamage - absorbedDamage;
    
    return {
      qiConsumed: currentQi,
      absorbedDamage,
      remainingDamage: notAbsorbed + piercingDamage,
      piercingDamage,
      bufferActivated: true,
      qiSufficient: false,
      usedShieldTechnique: false,
    };
  }
}

/**
 * Обработать урон через щитовую технику
 * 
 * Механика:
 * - 100% поглощение
 * - 1 Ци за 1 урон (эффективнее сырой Ци!)
 */
function processShieldTechnique(
  incomingDamage: number,
  currentQi: number,
  config: QiBufferConfig
): QiDamageResult {
  const absorptionRatio = config.shieldTechniqueMultiplier;  // 1.0
  const requiredQi = incomingDamage * absorptionRatio;
  
  if (currentQi >= requiredQi) {
    // Полное поглощение щитом
    return {
      qiConsumed: requiredQi,
      absorbedDamage: incomingDamage,
      remainingDamage: 0,
      piercingDamage: 0,
      bufferActivated: true,
      qiSufficient: true,
      usedShieldTechnique: true,
    };
  } else {
    // Частичное поглощение (Ци кончилось)
    const absorbedDamage = currentQi / absorptionRatio;
    
    return {
      qiConsumed: currentQi,
      absorbedDamage,
      remainingDamage: incomingDamage - absorbedDamage,
      piercingDamage: 0,
      bufferActivated: true,
      qiSufficient: false,
      usedShieldTechnique: true,
    };
  }
}

// ==================== УТИЛИТЫ ====================

/**
 * Рассчитать, сколько ударов выдержит буфер Ци
 * 
 * @param currentQi - текущее количество Ци
 * @param damagePerHit - урон за удар
 * @param hasShieldTechnique - активна ли щитовая техника
 * @returns примерное количество ударов
 */
export function calculateHitsUntilDepletion(
  currentQi: number,
  damagePerHit: number,
  hasShieldTechnique: boolean = false
): number {
  if (damagePerHit <= 0) return Infinity;
  
  const result = processQiDamage({
    incomingDamage: damagePerHit,
    currentQi,
    hasShieldTechnique,
  });
  
  // Если урон полностью поглощается
  if (result.remainingDamage === 0 && result.qiConsumed > 0) {
    return Math.floor(currentQi / result.qiConsumed);
  }
  
  // Если есть пробитие — считаем до истощения Ци
  if (result.qiConsumed > 0) {
    return Math.floor(currentQi / result.qiConsumed);
  }
  
  return 0;
}

/**
 * Форматировать результат для отображения
 * 
 * @param result - результат обработки
 * @returns строка для UI
 */
export function formatQiDamageResult(result: QiDamageResult): string {
  if (!result.bufferActivated) {
    return `Урон прошёл напрямую (нет Ци)`;
  }
  
  const lines: string[] = [];
  
  if (result.usedShieldTechnique) {
    lines.push(`🛡️ Щит: поглощено ${result.absorbedDamage}`);
  } else {
    lines.push(`✨ Ци: поглощено ${Math.floor(result.absorbedDamage)} (90%)`);
    if (result.piercingDamage > 0) {
      lines.push(`⚡ Пробитие: ${Math.floor(result.piercingDamage)} (10%)`);
    }
  }
  
  lines.push(`💫 Ци потрачено: ${Math.floor(result.qiConsumed)}`);
  
  if (result.remainingDamage > 0) {
    lines.push(`❤️ Урон в HP: ${Math.floor(result.remainingDamage)}`);
  }
  
  return lines.join('\n');
}

/**
 * Проверить, является ли атака техникой Ци
 * 
 * Только техники Ци могут быть поглощены буфером Ци.
 * Физические атаки проходят напрямую.
 * 
 * @param attackType - тип атаки
 * @returns true если атака является техникой Ци
 */
export function isQiTechniqueAttack(attackType: 'physical' | 'qi' | 'mixed'): boolean {
  return attackType === 'qi' || attackType === 'mixed';
}

// ==================== ЭКСПОРТ ====================

export {
  QI_BUFFER_CONFIG,
  type QiBufferConfig,
  hasQiForBuffer,
} from '@/lib/constants/qi-buffer-config';
