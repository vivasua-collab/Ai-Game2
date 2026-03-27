/**
 * CHARGER GENERATOR V2
 * 
 * Специализированный генератор зарядников Ци с архитектурой "Матрёшка".
 * 
 * Особенности зарядников:
 * - Проводимость Ци — основной параметр
 * - Количество слотов зависит от грейда
 * - Материал сильно влияет на проводимость
 * - Зарядники дороже другого оборудования
 * 
 * === ОБОСНОВАНИЕ ИЗ ЛОРА ===
 * 
 * - "Зарядник Ци — устройство для усиления и хранения техник"
 * - "Проводимость Ци материалов: обычные 5-30%, духовные 40-80%, небесные 90-100%"
 * - "Кристаллы Ци (духовные камни) плотность 1024 ед/см³"
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
import { getNextChargerId } from './id-counters';

// ============================================================================
// TYPES
// ============================================================================

export type ChargerType = 
  | 'ring'      // Кольцо
  | 'bracelet'  // Браслет
  | 'pendant'   // Кулон/Подвеска
  | 'orb'       // Сфера
  | 'talisman'; // Талисман

export type ChargerElement = 
  | 'neutral'
  | 'fire'
  | 'water'
  | 'earth'
  | 'air'
  | 'lightning'
  | 'ice'
  | 'yin'
  | 'yang';

export interface ChargerGenerationOptions {
  level: number;
  chargerType?: ChargerType;
  element?: ChargerElement;
  materialId?: string;
  grade?: EquipmentGrade;
  seed?: number;
}

// ============================================================================
// CHARGER CONFIGURATIONS
// ============================================================================

const CHARGER_TYPE_CONFIGS: Record<ChargerType, {
  nameVariants: string[];
  baseConductivity: number;
  baseWeight: number;
  slotCount: number;
  qiCapacity: number;
  recoveryRate: number;
}> = {
  ring: {
    nameVariants: ['Кольцо', 'Перстень', 'Печать'],
    baseConductivity: 25,
    baseWeight: 0.05,
    slotCount: 1,
    qiCapacity: 50,
    recoveryRate: 5,
  },
  bracelet: {
    nameVariants: ['Браслет', 'Наруч', 'Оберег'],
    baseConductivity: 35,
    baseWeight: 0.2,
    slotCount: 2,
    qiCapacity: 100,
    recoveryRate: 8,
  },
  pendant: {
    nameVariants: ['Кулон', 'Амулет', 'Подвеска'],
    baseConductivity: 45,
    baseWeight: 0.15,
    slotCount: 2,
    qiCapacity: 150,
    recoveryRate: 10,
  },
  orb: {
    nameVariants: ['Сфера', 'Шар', 'Кристалл'],
    baseConductivity: 60,
    baseWeight: 0.5,
    slotCount: 3,
    qiCapacity: 300,
    recoveryRate: 15,
  },
  talisman: {
    nameVariants: ['Талисман', 'Знак', 'Символ'],
    baseConductivity: 40,
    baseWeight: 0.1,
    slotCount: 1,
    qiCapacity: 80,
    recoveryRate: 12,
  },
};

const ELEMENT_CONFIGS: Record<ChargerElement, {
  name: string;
  conductivityBonus: number;
  qiCostReduction: number;
}> = {
  neutral: { name: '', conductivityBonus: 0, qiCostReduction: 0 },
  fire: { name: 'Огненный', conductivityBonus: 10, qiCostReduction: 5 },
  water: { name: 'Водяной', conductivityBonus: 8, qiCostReduction: 8 },
  earth: { name: 'Земляной', conductivityBonus: 5, qiCostReduction: 3 },
  air: { name: 'Воздушный', conductivityBonus: 15, qiCostReduction: 10 },
  lightning: { name: 'Грозовой', conductivityBonus: 12, qiCostReduction: 7 },
  ice: { name: 'Ледяной', conductivityBonus: 7, qiCostReduction: 6 },
  yin: { name: 'Инь', conductivityBonus: 20, qiCostReduction: 15 },
  yang: { name: 'Ян', conductivityBonus: 18, qiCostReduction: 12 },
};

// ============================================================================
// GRADE SLOT CONFIGURATION
// ============================================================================

const GRADE_SLOT_BONUS: Record<EquipmentGrade, number> = {
  damaged: 0,
  common: 1,
  refined: 2,
  perfect: 3,
  transcendent: 4,
};

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export function generateChargerV2(options: ChargerGenerationOptions): GeneratedEquipmentV2 {
  const rng = seededRandom(options.seed ?? Date.now());
  const level = options.level;
  
  // 1. Выбор типа зарядника
  const chargerType = options.chargerType ?? selectChargerType(rng);
  const typeConfig = CHARGER_TYPE_CONFIGS[chargerType];
  
  // 2. Выбор элемента
  const element = options.element ?? selectElement(rng);
  const elementConfig = ELEMENT_CONFIGS[element];
  
  // 3. Выбор материала (предпочтение кристаллам и высокопроводящим)
  const material = options.materialId
    ? materialsRegistry.get(options.materialId)!
    : selectChargerMaterial(level, rng);
  
  // 4. Выбор грейда
  const grade = options.grade ?? selectGrade(level, rng);
  const gradeConfig = GRADE_CONFIGS[grade];
  
  // 5. Базовые параметры
  const baseConductivity = typeConfig.baseConductivity + level * 10 + elementConfig.conductivityBonus;
  const baseWeight = typeConfig.baseWeight;
  const qiCapacity = typeConfig.qiCapacity + level * 50;
  const recoveryRate = typeConfig.recoveryRate + level * 2;
  
  // 6. Применение материала
  const materialConductivity = material.properties.qiConductivity;
  const effectiveConductivity = Math.floor(
    (baseConductivity + materialConductivity * 0.5) * (1 + gradeConfig.damageMultiplier * 0.3)
  );
  
  const effectiveStats: EffectiveStats = {
    damage: 0,
    defense: 0,
    qiConductivity: effectiveConductivity,
    weight: Math.round(baseWeight * 100) / 100,
  };
  
  // 7. Слоты для техник
  const baseSlots = typeConfig.slotCount;
  const gradeSlots = GRADE_SLOT_BONUS[grade];
  const totalSlots = baseSlots + Math.floor(gradeSlots * 0.5);
  
  // 8. Прочность
  const durability = createDurabilityState(material, grade, level);
  
  // 9. Бонусы
  const bonuses = generateChargerBonuses(grade, level, element, qiCapacity, recoveryRate, rng);
  
  // 10. Специальные эффекты
  const specialEffects = [
    `slots:${totalSlots}`,
    `qi_capacity:${qiCapacity}`,
    `recovery_rate:${recoveryRate}`,
  ];
  
  if (element !== 'neutral') {
    specialEffects.push(`elemental_${element}`);
  }
  
  // 11. Название
  const name = generateChargerName(
    typeConfig.nameVariants,
    material.name,
    grade,
    elementConfig.name,
    rng
  );
  
  // 12. Требования
  const requirements: EquipmentRequirements = {
    level: Math.max(1, level - 2),
    intelligence: level * 5,
    cultivationLevel: Math.max(1, level - 1),
  };
  
  // 13. Стоимость (зарядники дороже)
  const value = Math.floor(
    calculateChargerValue(effectiveStats, material, grade, level, totalSlots) * 1.5
  );
  
  return {
    id: getNextChargerId(),
    type: 'charger',
    name,
    level,
    materialId: material.id,
    material,
    grade,
    gradeConfig: gradeConfig,
    effectiveStats,
    durability,
    bonuses,
    specialEffects,
    requirements,
    value,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function selectChargerType(rng: () => number): ChargerType {
  const types = Object.keys(CHARGER_TYPE_CONFIGS) as ChargerType[];
  
  // Весовой выбор (сферы и кулонеы реже)
  const weights: Record<ChargerType, number> = {
    ring: 30,
    bracelet: 25,
    pendant: 20,
    orb: 10,
    talisman: 15,
  };
  
  const weighted = types.flatMap(t => Array(weights[t]).fill(t));
  return weighted[Math.floor(rng() * weighted.length)] ?? 'ring';
}

function selectElement(rng: () => number): ChargerElement {
  const roll = rng() * 100;
  
  // 50% neutral, 50% elemental
  if (roll < 50) return 'neutral';
  
  const elements: ChargerElement[] = ['fire', 'water', 'earth', 'air', 'lightning', 'ice', 'yin', 'yang'];
  
  // Инь и Ян редкие
  const weights = [15, 15, 10, 15, 12, 13, 5, 5];
  const weighted = elements.flatMap((e, i) => Array(weights[i]).fill(e));
  
  return weighted[Math.floor(rng() * weighted.length)] ?? 'neutral';
}

function selectChargerMaterial(level: number, rng: () => number): MaterialDefinition {
  const tier = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1;
  
  // Для зарядников предпочтительны кристаллы и высокопроводящие материалы
  const preferred = materialsRegistry.getByCategory('crystal');
  const alternatives = materialsRegistry.getByTier(tier)
    .filter(m => m.properties.qiConductivity >= 50);
  
  const candidates = [...preferred, ...alternatives].filter(m => m.tier <= tier);
  
  if (candidates.length === 0) {
    return materialsRegistry.getDefault(tier);
  }
  
  // Весовой выбор по проводимости
  const weighted = candidates.flatMap(m =>
    Array(Math.max(1, Math.floor(m.properties.qiConductivity / 10))).fill(m)
  );
  
  return weighted[Math.floor(rng() * weighted.length)] ?? candidates[0];
}

function selectGrade(level: number, rng: () => number): EquipmentGrade {
  // Зарядники чаще имеют высокий грейд
  const distributions: Record<number, Record<EquipmentGrade, number>> = {
    1: { damaged: 10, common: 60, refined: 25, perfect: 5, transcendent: 0 },
    3: { damaged: 5, common: 40, refined: 40, perfect: 15, transcendent: 0 },
    5: { damaged: 0, common: 25, refined: 45, perfect: 25, transcendent: 5 },
    7: { damaged: 0, common: 15, refined: 35, perfect: 35, transcendent: 15 },
    9: { damaged: 0, common: 5, refined: 25, perfect: 40, transcendent: 30 },
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

function generateChargerBonuses(
  grade: EquipmentGrade,
  level: number,
  element: ChargerElement,
  qiCapacity: number,
  recoveryRate: number,
  rng: () => number
): GeneratedBonus[] {
  const config = GRADE_CONFIGS[grade];
  const [minCount, maxCount] = config.bonusCount;
  const count = minCount + Math.floor(rng() * (maxCount - minCount + 1));
  
  const bonuses: GeneratedBonus[] = [];
  
  const baseBonuses = [
    { type: 'qi_regeneration', value: recoveryRate, category: 'qi' },
    { type: 'qi_cost_reduction', value: Math.floor(level * 1.5), category: 'qi' },
    { type: 'qi_max', value: Math.floor(qiCapacity * 0.1), category: 'qi' },
  ];
  
  if (element !== 'neutral') {
    baseBonuses.push({
      type: `elemental_${element}`,
      value: Math.floor(level * 2),
      category: 'elemental',
    });
  }
  
  for (let i = 0; i < count && i < baseBonuses.length; i++) {
    const bonus = baseBonuses[i];
    bonuses.push({
      id: `${bonus.type}_${Date.now()}_${i}`,
      type: bonus.type,
      category: bonus.category,
      value: bonus.value,
      isMultiplier: false,
      source: 'grade',
    });
  }
  
  return bonuses;
}

function generateChargerName(
  nameVariants: string[],
  materialName: string,
  grade: EquipmentGrade,
  elementPrefix: string,
  rng: () => number
): string {
  const baseName = nameVariants[Math.floor(rng() * nameVariants.length)];
  const gradeConfig = GRADE_CONFIGS[grade];
  
  let name = '';
  
  if (elementPrefix) {
    name = `${elementPrefix} `;
  }
  
  if (grade === 'damaged') {
    name += `Треснувший ${baseName.toLowerCase()} из ${materialName.toLowerCase()}`;
  } else if (grade === 'common') {
    name += `${baseName} из ${materialName.toLowerCase()}`;
  } else {
    name += `${gradeConfig.name} ${baseName.toLowerCase()} из ${materialName.toLowerCase()}`;
  }
  
  return name;
}

function calculateChargerValue(
  stats: EffectiveStats,
  material: MaterialDefinition,
  grade: EquipmentGrade,
  level: number,
  slots: number
): number {
  const config = GRADE_CONFIGS[grade];
  
  const baseValue = stats.qiConductivity * 12;
  const materialMultiplier = material.tier * 0.5 + 1;
  const gradeMultiplier = config.damageMultiplier;
  const levelMultiplier = level * 0.4 + 1;
  const slotMultiplier = 1 + slots * 0.2;
  
  return Math.floor(baseValue * materialMultiplier * gradeMultiplier * levelMultiplier * slotMultiplier);
}
