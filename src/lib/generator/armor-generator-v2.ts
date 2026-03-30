/**
 * ARMOR GENERATOR V2
 * 
 * Специализированный генератор брони с архитектурой "Матрёшка".
 * 
 * Особенности брони:
 * - Базовая защита зависит от уровня и типа брони
 * - Материал влияет на защиту и вес
 * - Грейд влияет на множитель защиты
 * - Броня может иметь сопротивления элементам
 */

import {
  EquipmentGrade,
  GeneratedEquipmentV2,
  GeneratedBonus,
  EffectiveStats,
  EquipmentRequirements,
} from '@/types/equipment-v2';
import { MaterialDefinition } from '@/types/materials';
import { materialsRegistry } from '@/lib/data/materials-registry';
import { GRADE_CONFIGS } from '@/lib/game/grade-system';
import { createDurabilityState } from '@/lib/game/durability-system';
import { seededRandom } from './base-item-generator';
import { getNextArmorId } from './id-counters';

// ============================================================================
// TYPES
// ============================================================================

export type ArmorSlot = 
  | 'head'     // Шлем
  | 'chest'    // Нагрудник
  | 'hands'    // Наручи
  | 'legs'     // Поножи
  | 'feet';    // Сапоги

export type ArmorType = 
  | 'light'    // Лёгкая
  | 'medium'   // Средняя
  | 'heavy';   // Тяжёлая

export interface ArmorGenerationOptions {
  level: number;
  slot?: ArmorSlot;
  armorType?: ArmorType;
  materialId?: string;
  grade?: EquipmentGrade;
  seed?: number;
}

// ============================================================================
// ARMOR CONFIGURATIONS
// ============================================================================

const SLOT_CONFIGS: Record<ArmorSlot, {
  nameVariants: Record<ArmorType, string[]>;
  baseDefense: number;
  baseWeight: number;
  coverage: number; // % тела
}> = {
  head: {
    nameVariants: {
      light: ['Капюшон', 'Обруч', 'Диадема'],
      medium: ['Шлем', 'Каска', 'Барбют'],
      heavy: ['Тяжёлый шлем', 'Армэ', 'Великий шлем'],
    },
    baseDefense: 8,
    baseWeight: 1.0,
    coverage: 10,
  },
  chest: {
    nameVariants: {
      light: ['Куртка', 'Рубаха', 'Брас'],
      medium: ['Кираса', 'Нагрудник', 'Кольчуга'],
      heavy: ['Латы', 'Бригантина', 'Панцирь'],
    },
    baseDefense: 20,
    baseWeight: 5.0,
    coverage: 40,
  },
  hands: {
    nameVariants: {
      light: ['Перчатки', 'Наручи', 'Напульсники'],
      medium: ['Рукавицы', 'Поножи рук', 'Браслеты'],
      heavy: ['Тяжёлые рукавицы', 'Латные перчатки'],
    },
    baseDefense: 6,
    baseWeight: 0.8,
    coverage: 10,
  },
  legs: {
    nameVariants: {
      light: ['Штаны', 'Поножи', 'Гамаши'],
      medium: ['Набедренники', 'Кольчужные штаны'],
      heavy: ['Латные поножи', 'Тяжёлые штаны'],
    },
    baseDefense: 12,
    baseWeight: 3.0,
    coverage: 25,
  },
  feet: {
    nameVariants: {
      light: ['Сапоги', 'Ботинки', 'Туфли'],
      medium: ['Сапоги с защитой', 'Бронированные ботинки'],
      heavy: ['Тяжёлые сапоги', 'Латные сапоги'],
    },
    baseDefense: 5,
    baseWeight: 1.5,
    coverage: 15,
  },
};

const ARMOR_TYPE_CONFIGS: Record<ArmorType, {
  defenseMultiplier: number;
  weightMultiplier: number;
  evasionModifier: number;
  movementPenalty: number;
}> = {
  light: {
    defenseMultiplier: 0.8,
    weightMultiplier: 0.6,
    evasionModifier: 5,
    movementPenalty: 0,
  },
  medium: {
    defenseMultiplier: 1.0,
    weightMultiplier: 1.0,
    evasionModifier: 0,
    movementPenalty: 5,
  },
  heavy: {
    defenseMultiplier: 1.5,
    weightMultiplier: 1.8,
    evasionModifier: -10,
    movementPenalty: 10,
  },
};

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export function generateArmorV2(options: ArmorGenerationOptions): GeneratedEquipmentV2 {
  const rng = seededRandom(options.seed ?? Date.now());
  const level = options.level;
  
  // 1. Выбор слота
  const slot = options.slot ?? selectSlot(rng);
  const slotConfig = SLOT_CONFIGS[slot];
  
  // 2. Выбор типа брони
  const armorType = options.armorType ?? selectArmorType(rng);
  const typeConfig = ARMOR_TYPE_CONFIGS[armorType];
  
  // 3. Выбор материала
  const material = options.materialId
    ? materialsRegistry.get(options.materialId)!
    : selectArmorMaterial(level, armorType, rng);
  
  // 4. Выбор грейда
  const grade = options.grade ?? selectGrade(level, rng);
  const gradeConfig = GRADE_CONFIGS[grade];
  
  // 5. Базовые параметры
  const baseDefense = slotConfig.baseDefense + level * 3 + Math.floor(rng() * 3);
  const baseWeight = slotConfig.baseWeight * typeConfig.weightMultiplier;
  
  // 6. Применение материала
  const materialDefenseBonus = material.bonuses.find(b => b.type === 'defense_armor')?.value ?? 0;
  const materialDefense = (baseDefense + materialDefenseBonus) * typeConfig.defenseMultiplier;
  
  // 7. Применение грейда
  const effectiveDefense = Math.floor(materialDefense * gradeConfig.durabilityMultiplier);
  const effectiveWeight = Math.round(baseWeight + material.properties.weight * 0.5);
  
  const effectiveStats: EffectiveStats = {
    damage: 0,
    defense: effectiveDefense,
    qiConductivity: Math.floor(material.properties.qiConductivity * 0.3),
    weight: effectiveWeight,
  };
  
  // 8. Прочность
  const durability = createDurabilityState(material, grade, level);
  
  // 9. Бонусы
  const bonuses = generateArmorBonuses(grade, level, armorType, slotConfig.coverage, rng);
  
  // 10. Название
  const name = generateArmorName(
    slotConfig.nameVariants[armorType],
    material.name,
    grade,
    rng
  );
  
  // 11. Требования
  const requirements: EquipmentRequirements = {
    level: Math.max(1, level - 2),
    vitality: Math.floor(effectiveDefense * 0.15),
    strength: armorType === 'heavy' ? Math.floor(effectiveWeight * 2) : undefined,
  };
  
  // 12. Стоимость
  const value = calculateArmorValue(effectiveStats, material, grade, level, slot);
  
  return {
    id: getNextArmorId(),
    type: 'armor',
    name,
    level,
    materialId: material.id,
    material,
    grade,
    gradeConfig: gradeConfig,
    effectiveStats,
    durability,
    bonuses,
    specialEffects: [],
    requirements,
    value,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function selectSlot(rng: () => number): ArmorSlot {
  const slots = Object.keys(SLOT_CONFIGS) as ArmorSlot[];
  return slots[Math.floor(rng() * slots.length)];
}

function selectArmorType(rng: () => number): ArmorType {
  const roll = rng() * 100;
  if (roll < 35) return 'light';
  if (roll < 75) return 'medium';
  return 'heavy';
}

function selectArmorMaterial(level: number, armorType: ArmorType, rng: () => number): MaterialDefinition {
  const tier = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1;
  
  // Для брони используем органику и металлы
  const categories = armorType === 'light' 
    ? ['organic', 'wood'] as const
    : armorType === 'medium'
      ? ['metal', 'organic'] as const
      : ['metal', 'mineral'] as const;
  
  const materials = categories.flatMap(cat => materialsRegistry.getByCategory(cat))
    .filter(m => m.tier <= tier);
  
  if (materials.length === 0) {
    return materialsRegistry.getDefault(tier);
  }
  
  const weighted = materials.flatMap(m =>
    Array(Math.max(1, Math.floor(m.rarity))).fill(m)
  );
  
  return weighted[Math.floor(rng() * weighted.length)] ?? materials[0];
}

function selectGrade(level: number, rng: () => number): EquipmentGrade {
  const distributions: Record<number, Record<EquipmentGrade, number>> = {
    1: { damaged: 30, common: 60, refined: 10, perfect: 0, transcendent: 0 },
    3: { damaged: 10, common: 50, refined: 35, perfect: 5, transcendent: 0 },
    5: { damaged: 5, common: 30, refined: 45, perfect: 20, transcendent: 0 },
    7: { damaged: 0, common: 20, refined: 40, perfect: 35, transcendent: 5 },
    9: { damaged: 0, common: 10, refined: 30, perfect: 40, transcendent: 20 },
  };
  
  const levels = [1, 3, 5, 7, 9];
  const closest = levels.reduce((p, c) => Math.abs(c - level) < Math.abs(p - level) ? c : p);
  const dist = distributions[closest];
  
  const roll = rng() * 100;
  let cumulative = 0;
  
  for (const [grade, chance] of Object.entries(dist)) {
    cumulative += chance;
    if (roll <= cumulative) return grade as EquipmentGrade;
  }
  
  return 'common';
}

function generateArmorBonuses(
  grade: EquipmentGrade,
  level: number,
  armorType: ArmorType,
  coverage: number,
  rng: () => number
): GeneratedBonus[] {
  const config = GRADE_CONFIGS[grade];
  const [minCount, maxCount] = config.bonusCount;
  const count = minCount + Math.floor(rng() * (maxCount - minCount + 1));
  
  const bonuses: GeneratedBonus[] = [];
  
  const typeConfig = ARMOR_TYPE_CONFIGS[armorType];
  
  // Базовые бонусы брони
  const baseBonuses = [
    { type: 'defense_hp', value: Math.floor(coverage * level * 0.5) },
    { type: 'defense_evasion', value: typeConfig.evasionModifier },
    { type: 'defense_block', value: Math.floor(coverage * 0.1) },
  ];
  
  // Фильтруем бонусы с нулевым значением
  const validBonuses = baseBonuses.filter(b => b.value !== 0);
  
  for (let i = 0; i < count && i < validBonuses.length; i++) {
    const bonus = validBonuses[i];
    bonuses.push({
      id: `${bonus.type}_${Date.now()}_${i}`,
      type: bonus.type,
      category: 'defense',
      value: bonus.value,
      isMultiplier: false,
      source: 'grade',
    });
  }
  
  return bonuses;
}

function generateArmorName(
  nameVariants: string[],
  materialName: string,
  grade: EquipmentGrade,
  rng: () => number
): string {
  const baseName = nameVariants[Math.floor(rng() * nameVariants.length)];
  const gradeConfig = GRADE_CONFIGS[grade];
  
  if (grade === 'damaged') {
    return `Повреждённый ${baseName.toLowerCase()} из ${materialName.toLowerCase()}`;
  }
  if (grade === 'common') {
    return `${baseName} из ${materialName.toLowerCase()}`;
  }
  return `${gradeConfig.name} ${baseName.toLowerCase()} из ${materialName.toLowerCase()}`;
}

function calculateArmorValue(
  stats: EffectiveStats,
  material: MaterialDefinition,
  grade: EquipmentGrade,
  level: number,
  slot: ArmorSlot
): number {
  const config = GRADE_CONFIGS[grade];
  
  const slotMultipliers: Record<ArmorSlot, number> = {
    head: 0.8,
    chest: 1.5,
    hands: 0.6,
    legs: 1.0,
    feet: 0.7,
  };
  
  const baseValue = stats.defense * 10;
  const materialMultiplier = material.tier * 0.5 + 1;
  const gradeMultiplier = config.durabilityMultiplier;
  const levelMultiplier = level * 0.3 + 1;
  const slotMultiplier = slotMultipliers[slot];
  
  return Math.floor(baseValue * materialMultiplier * gradeMultiplier * levelMultiplier * slotMultiplier);
}
