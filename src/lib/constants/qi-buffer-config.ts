/**
 * ============================================================================
 * КОНФИГУРАЦИЯ БУФЕРА ЦИ (Qi Buffer Config)
 * ============================================================================
 * 
 * Определяет параметры механики поглощения урона через Ци.
 * 
 * Ключевая механика v5.0:
 * - Сырая Ци поглощает ТОЛЬКО 90% урона (10% ВСЕГДА пробивает)
 * - Щитовая техника поглощает 100% урона (1:1 соотношение)
 * 
 * @see docs/body_review.md - Секция 3: Ци как буфер урона
 * @see docs/checkpoints/checkpoint_03_22_Body_update.md
 * 
 * Версия: 1.0.0
 */

// ==================== ТИПЫ ====================

/**
 * Конфигурация буфера Ци
 */
export interface QiBufferConfig {
  /** 
   * Соотношение Ци к поглощаемому урону (сырая Ци)
   * 3.0 = 1 поглощённый урон = 3 Ци
   */
  baseQiAbsorptionRatio: number;
  
  /**
   * Процент поглощения сырой Ци
   * 0.90 = 90% поглощается, 10% ВСЕГДА пробивает
   */
  rawQiAbsorptionPercent: number;
  
  /**
   * Соотношение Ци к поглощаемому урону (щитовая техника)
   * 1.0 = 1 поглощённый урон = 1 Ци (эффективнее!)
   */
  shieldTechniqueMultiplier: number;
  
  /**
   * Процент поглощения щитовой техникой
   * 1.0 = 100% поглощается
   */
  shieldAbsorptionPercent: number;
  
  /**
   * Минимальный порог Ци для активации буфера
   */
  minQiForBuffer: number;
}

// ==================== КОНСТАНТЫ ====================

/**
 * Основная конфигурация буфера Ци
 * 
 * @see docs/body_review.md - Секция 3.2
 */
export const QI_BUFFER_CONFIG: QiBufferConfig = {
  // Сырая Ци (без щитовой техники)
  baseQiAbsorptionRatio: 3.0,        // 1 урон = 3 Ци
  rawQiAbsorptionPercent: 0.90,      // 90% поглощение, 10% пробитие
  
  // Щитовая техника
  shieldTechniqueMultiplier: 1.0,    // 1 урон = 1 Ци (эффективнее!)
  shieldAbsorptionPercent: 1.0,      // 100% поглощение
  
  // Порог активации
  minQiForBuffer: 10,
} as const;

// ==================== ФУНКЦИИ ====================

/**
 * Получить конфигурацию буфера Ци
 * 
 * @returns конфигурация
 */
export function getQiBufferConfig(): QiBufferConfig {
  return { ...QI_BUFFER_CONFIG };
}

/**
 * Проверить, достаточно ли Ци для активации буфера
 * 
 * @param currentQi - текущее количество Ци
 * @returns true если достаточно для активации
 */
export function hasQiForBuffer(currentQi: number): boolean {
  return currentQi >= QI_BUFFER_CONFIG.minQiForBuffer;
}

/**
 * Рассчитать требуемое Ци для поглощения урона
 * 
 * @param damage - урон для поглощения
 * @param hasShieldTechnique - активна ли щитовая техника
 * @returns количество Ци для полного поглощения
 */
export function calculateRequiredQi(
  damage: number,
  hasShieldTechnique: boolean
): number {
  if (hasShieldTechnique) {
    // Щит: 1:1, поглощение 100%
    return damage * QI_BUFFER_CONFIG.shieldTechniqueMultiplier;
  } else {
    // Сырая Ци: 3:1, поглощение 90%
    const absorbableDamage = damage * QI_BUFFER_CONFIG.rawQiAbsorptionPercent;
    return absorbableDamage * QI_BUFFER_CONFIG.baseQiAbsorptionRatio;
  }
}

/**
 * Рассчитать урон, который ВСЕГДА пробивает (10% для сырой Ци)
 * 
 * @param damage - входящий урон
 * @param hasShieldTechnique - активна ли щитовая техника
 * @returns урон, который пробивает буфер
 */
export function calculatePiercingDamage(
  damage: number,
  hasShieldTechnique: boolean
): number {
  if (hasShieldTechnique) {
    // Щит: 0% пробитие
    return 0;
  } else {
    // Сырая Ци: 10% пробитие ВСЕГДА
    return damage * (1 - QI_BUFFER_CONFIG.rawQiAbsorptionPercent);
  }
}

/**
 * Рассчитать урон, который можно поглотить
 * 
 * @param damage - входящий урон
 * @param hasShieldTechnique - активна ли щитовая техника
 * @returns урон, который можно поглотить Ци
 */
export function calculateAbsorbableDamage(
  damage: number,
  hasShieldTechnique: boolean
): number {
  if (hasShieldTechnique) {
    // Щит: 100% поглощение
    return damage;
  } else {
    // Сырая Ци: 90% поглощение
    return damage * QI_BUFFER_CONFIG.rawQiAbsorptionPercent;
  }
}

// ==================== ПРИМЕРЫ ====================

/**
 * Примеры расчёта буфера Ци (для документации и тестов)
 * 
 * | Сценарий | Урон | Ци до | Ци после | Поглощено | Пробитие в HP |
 * |----------|------|-------|----------|-----------|---------------|
 * | Сырая Ци, достаточно | 100 | 500 | 230 | 90 (270 Ци) | 10 |
 * | Сырая Ци, мало | 100 | 150 | 0 | 50 (150 Ци) | 50 |
 * | Щит, достаточно | 100 | 500 | 400 | 100 (100 Ци) | 0 |
 * | Щит, мало | 100 | 50 | 0 | 50 (50 Ци) | 50 |
 * | Смертный (нет Ци) | 100 | 0 | 0 | 0 | 100 |
 */
export const QI_BUFFER_EXAMPLES = [
  {
    scenario: 'Сырая Ци, достаточно',
    damage: 100,
    currentQi: 500,
    hasShieldTechnique: false,
    expected: { qiConsumed: 270, absorbedDamage: 90, remainingDamage: 10 },
  },
  {
    scenario: 'Сырая Ци, мало',
    damage: 100,
    currentQi: 150,
    hasShieldTechnique: false,
    expected: { qiConsumed: 150, absorbedDamage: 50, remainingDamage: 50 },
  },
  {
    scenario: 'Щит, достаточно',
    damage: 100,
    currentQi: 500,
    hasShieldTechnique: true,
    expected: { qiConsumed: 100, absorbedDamage: 100, remainingDamage: 0 },
  },
  {
    scenario: 'Щит, мало',
    damage: 100,
    currentQi: 50,
    hasShieldTechnique: true,
    expected: { qiConsumed: 50, absorbedDamage: 50, remainingDamage: 50 },
  },
  {
    scenario: 'Смертный (нет Ци)',
    damage: 100,
    currentQi: 0,
    hasShieldTechnique: false,
    expected: { qiConsumed: 0, absorbedDamage: 0, remainingDamage: 100 },
  },
];
