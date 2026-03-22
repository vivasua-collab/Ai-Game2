/**
 * ============================================================================
 * УТИЛИТЫ СОВМЕСТИМОСТИ V1 ↔ V2
 * ============================================================================
 *
 * Обеспечивает обратную совместимость при миграции с V1 на V2 генератор.
 *
 * V1 (technique-generator.ts) — @deprecated
 * V2 (technique-generator-v2.ts) — АКТУАЛЬНЫЙ
 *
 * Основные различия:
 * - V2: qiCost = baseCapacity × 2^(level-1)
 * - V2: damage = capacity × gradeMult
 * - V2: formula в computed
 * - V2: isUltimate флаг
 */

import type { GeneratedTechnique as V1Technique, TechniqueModifiers, ActiveEffect } from './technique-generator';
import type { GeneratedTechniqueV2, TechniqueModifiersV2 } from './technique-generator-v2';

// ============================================================================
// МАППИНГИ
// ============================================================================

/**
 * Конвертация Grade → Rarity для обратной совместимости
 */
const GRADE_TO_RARITY: Record<string, string> = {
  common: 'common',
  refined: 'uncommon',
  perfect: 'rare',
  transcendent: 'legendary',
};

/**
 * Конвертация Rarity → Grade
 */
const RARITY_TO_GRADE: Record<string, string> = {
  common: 'common',
  uncommon: 'refined',
  rare: 'perfect',
  legendary: 'transcendent',
};

// ============================================================================
// КОНВЕРТАЦИЯ V2 → V1
// ============================================================================

/**
 * Конвертировать V2 технику в формат V1 для совместимости с TempNPC
 *
 * @param technique - Техника в формате V2
 * @returns Техника в формате V1 (для TempNPC.techniqueData)
 */
export function v2ToV1(technique: GeneratedTechniqueV2): V1Technique {
  return {
    id: technique.id,
    name: technique.name,
    nameEn: technique.nameEn,
    description: technique.description,
    type: technique.type,
    subtype: technique.subtype,
    element: technique.element,
    level: technique.level,
    rarity: GRADE_TO_RARITY[technique.grade] || 'common',
    grade: technique.grade,
    baseDamage: technique.baseDamage,
    baseQiCost: technique.baseQiCost,
    baseRange: technique.baseRange,
    baseDuration: 0, // V2 не использует duration
    baseCapacity: technique.baseCapacity,
    minCultivationLevel: technique.minCultivationLevel,
    statRequirements: technique.statRequirements,
    weaponCategory: technique.weaponCategory,
    weaponType: technique.weaponType,
    damageFalloff: technique.damageFalloff,
    isRangedQi: technique.isRangedQi,
    modifiers: convertModifiersV2ToV1(technique.modifiers),
    computed: {
      finalDamage: technique.computed.finalDamage,
      finalQiCost: technique.computed.finalQiCost,
      finalRange: technique.computed.finalRange,
      finalDuration: 0,
      activeEffects: technique.computed.activeEffects,
    },
    meta: technique.meta,
  };
}

/**
 * Конвертировать модификаторы V2 → V1
 */
function convertModifiersV2ToV1(modifiers: TechniqueModifiersV2): TechniqueModifiers {
  const v1Modifiers: TechniqueModifiers = {
    effects: {},
    effectValues: {},
    penalties: {},
    bonuses: {},
  };

  // Эффекты
  for (const [key, value] of Object.entries(modifiers.effects)) {
    v1Modifiers.effects[key as keyof TechniqueModifiers['effects']] = value;
  }

  // Значения эффектов
  for (const [key, value] of Object.entries(modifiers.effectValues)) {
    (v1Modifiers.effectValues as Record<string, number | string>)[key] = value;
  }

  // Штрафы
  for (const [key, value] of Object.entries(modifiers.penalties)) {
    (v1Modifiers.penalties as Record<string, number>)[key] = value;
  }

  // Бонусы
  for (const [key, value] of Object.entries(modifiers.bonuses)) {
    (v1Modifiers.bonuses as Record<string, number>)[key] = value;
  }

  return v1Modifiers;
}

// ============================================================================
// ЭКСПОРТ МАППИНГОВ
// ============================================================================

export { GRADE_TO_RARITY, RARITY_TO_GRADE };
