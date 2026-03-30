/**
 * WEAPON GENERATOR V2
 * 
 * Специализированный генератор оружия с архитектурой "Матрёшка".
 * 
 * Особенности оружия:
 * - Базовый урон зависит от уровня и типа оружия
 * - Материал влияет на урон и проводимость Ци
 * - Грейд влияет на множитель урона
 * - Оружие может иметь элементальный урон
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
import { getNextWeaponId } from './id-counters';

// ============================================================================
// TYPES
// ============================================================================

export type WeaponType = 
  | 'sword'    // Меч
  | 'blade'    // Клинок
  | 'spear'    // Копьё
  | 'staff'    // Посох
  | 'axe'      // Топор
  | 'dagger'   // Кинжал
  | 'bow';     // Лук

export type WeaponElement = 
  | 'neutral'
  | 'fire'
  | 'water'
  | 'earth'
  | 'air'
  | 'lightning'
  | 'ice'
  | 'void';

export interface WeaponGenerationOptions {
  level: number;
  weaponType?: WeaponType;
  element?: WeaponElement;
  materialId?: string;
  grade?: EquipmentGrade;
  seed?: number;
}

// ============================================================================
// WEAPON CONFIGURATIONS
// ============================================================================

const WEAPON_CONFIGS: Record<WeaponType, {
  nameVariants: string[];
  baseDamage: number;
  baseWeight: number;
  baseRange: number;
  attackSpeed: number;
  critChance: number;
  critDamage: number;
}> = {
  sword: {
    nameVariants: ['Меч', 'Клинок', 'Рапира', 'Шпага'],
    baseDamage: 12,
    baseWeight: 2.0,
    baseRange: 1.0,
    attackSpeed: 1.0,
    critChance: 5,
    critDamage: 150,
  },
  blade: {
    nameVariants: ['Сабля', 'Катана', 'Дао', 'Полуторный меч'],
    baseDamage: 15,
    baseWeight: 2.5,
    baseRange: 1.2,
    attackSpeed: 0.9,
    critChance: 8,
    critDamage: 170,
  },
  spear: {
    nameVariants: ['Копьё', 'Пика', 'Алебарда', 'Глефа'],
    baseDamage: 14,
    baseWeight: 3.0,
    baseRange: 2.0,
    attackSpeed: 0.85,
    critChance: 6,
    critDamage: 160,
  },
  staff: {
    nameVariants: ['Посох', 'Жезл', 'Скипетр'],
    baseDamage: 8,
    baseWeight: 1.5,
    baseRange: 1.5,
    attackSpeed: 1.1,
    critChance: 3,
    critDamage: 130,
  },
  axe: {
    nameVariants: ['Топор', 'Секира', 'Бородатый топор'],
    baseDamage: 18,
    baseWeight: 4.0,
    baseRange: 0.8,
    attackSpeed: 0.7,
    critChance: 10,
    critDamage: 200,
  },
  dagger: {
    nameVariants: ['Кинжал', 'Нож', 'Стилет'],
    baseDamage: 7,
    baseWeight: 0.5,
    baseRange: 0.5,
    attackSpeed: 1.5,
    critChance: 12,
    critDamage: 180,
  },
  bow: {
    nameVariants: ['Лук', 'Арбалет', 'Длинный лук'],
    baseDamage: 10,
    baseWeight: 1.0,
    baseRange: 10.0,
    attackSpeed: 0.8,
    critChance: 7,
    critDamage: 160,
  },
};

const ELEMENT_CONFIGS: Record<WeaponElement, {
  name: string;
  damageBonus: number;
  color: string;
}> = {
  neutral: { name: '', damageBonus: 0, color: '' },
  fire: { name: 'Огненный', damageBonus: 5, color: 'text-orange-400' },
  water: { name: 'Водяной', damageBonus: 3, color: 'text-blue-400' },
  earth: { name: 'Земляной', damageBonus: 4, color: 'text-amber-600' },
  air: { name: 'Воздушный', damageBonus: 2, color: 'text-cyan-400' },
  lightning: { name: 'Грозовой', damageBonus: 6, color: 'text-yellow-400' },
  ice: { name: 'Ледяной', damageBonus: 4, color: 'text-blue-200' },
  void: { name: 'Пустотный', damageBonus: 8, color: 'text-purple-400' },
};

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export function generateWeaponV2(options: WeaponGenerationOptions): GeneratedEquipmentV2 {
  const rng = seededRandom(options.seed ?? Date.now());
  const level = options.level;
  
  // 1. Выбор типа оружия
  const weaponType = options.weaponType ?? selectWeaponType(rng);
  const weaponConfig = WEAPON_CONFIGS[weaponType];
  
  // 2. Выбор элемента
  const element = options.element ?? selectElement(rng);
  const elementConfig = ELEMENT_CONFIGS[element];
  
  // 3. Выбор материала
  const material = options.materialId
    ? materialsRegistry.get(options.materialId)!
    : selectWeaponMaterial(level, rng);
  
  // 4. Выбор грейда
  const grade = options.grade ?? selectGrade(level, rng);
  const gradeConfig = GRADE_CONFIGS[grade];
  
  // 5. Базовые параметры
  const baseDamage = weaponConfig.baseDamage + level * 4 + Math.floor(rng() * 5);
  const baseWeight = weaponConfig.baseWeight + (rng() - 0.5) * 0.5;
  
  // 6. Применение материала
  const materialDamageBonus = material.bonuses.find(b => b.type === 'combat_damage')?.value ?? 0;
  const materialDamage = baseDamage + materialDamageBonus + elementConfig.damageBonus;
  
  // 7. Применение грейда
  const effectiveDamage = Math.floor(materialDamage * gradeConfig.damageMultiplier);
  const effectiveWeight = Math.round(baseWeight * 100) / 100;
  
  const effectiveStats: EffectiveStats = {
    damage: effectiveDamage,
    defense: 0,
    qiConductivity: Math.floor(material.properties.qiConductivity * 0.5),
    weight: effectiveWeight,
  };
  
  // 8. Прочность
  const durability = createDurabilityState(material, grade, level);
  
  // 9. Бонусы
  const bonuses = generateWeaponBonuses(grade, level, weaponConfig, element, rng);
  
  // 10. Название
  const name = generateWeaponName(
    weaponConfig.nameVariants,
    material.name,
    grade,
    elementConfig.name,
    rng
  );
  
  // 11. Требования
  const requirements: EquipmentRequirements = {
    level: Math.max(1, level - 2),
    strength: Math.floor(effectiveDamage * 0.2),
    agility: weaponType === 'dagger' || weaponType === 'bow' ? level * 2 : undefined,
  };
  
  // 12. Стоимость
  const value = calculateWeaponValue(effectiveStats, material, grade, level, element);
  
  return {
    id: getNextWeaponId(),
    type: 'weapon',
    name,
    level,
    materialId: material.id,
    material,
    grade,
    gradeConfig: gradeConfig,
    effectiveStats,
    durability,
    bonuses,
    specialEffects: element !== 'neutral' ? [`elemental_${element}`] : [],
    requirements,
    value,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function selectWeaponType(rng: () => number): WeaponType {
  const types = Object.keys(WEAPON_CONFIGS) as WeaponType[];
  return types[Math.floor(rng() * types.length)];
}

function selectElement(rng: () => number): WeaponElement {
  const roll = rng() * 100;
  
  // 60% neutral, 40% elemental
  if (roll < 60) return 'neutral';
  
  const elements: WeaponElement[] = ['fire', 'water', 'earth', 'air', 'lightning', 'ice', 'void'];
  return elements[Math.floor(rng() * elements.length)];
}

function selectWeaponMaterial(level: number, rng: () => number): MaterialDefinition {
  const tier = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1;
  const materials = materialsRegistry.getByTier(tier).filter(m => m.category === 'metal');
  
  if (materials.length === 0) {
    return materialsRegistry.getDefault(tier);
  }
  
  const weighted = materials.flatMap(m =>
    Array(Math.max(1, Math.floor(m.rarity))).fill(m)
  );
  
  return weighted[Math.floor(rng() * weighted.length)] ?? materials[0];
}

function selectGrade(level: number, rng: () => number): EquipmentGrade {
  const distributions = {
    1: { damaged: 30, common: 60, refined: 10, perfect: 0, transcendent: 0 },
    3: { damaged: 10, common: 50, refined: 35, perfect: 5, transcendent: 0 },
    5: { damaged: 5, common: 30, refined: 45, perfect: 20, transcendent: 0 },
    7: { damaged: 0, common: 20, refined: 40, perfect: 35, transcendent: 5 },
    9: { damaged: 0, common: 10, refined: 30, perfect: 40, transcendent: 20 },
  };
  
  const levels = [1, 3, 5, 7, 9];
  const closest = levels.reduce((p, c) => Math.abs(c - level) < Math.abs(p - level) ? c : p);
  const dist = distributions[closest as keyof typeof distributions];
  
  const roll = rng() * 100;
  let cumulative = 0;
  
  for (const [grade, chance] of Object.entries(dist)) {
    cumulative += chance;
    if (roll <= cumulative) return grade as EquipmentGrade;
  }
  
  return 'common';
}

function generateWeaponBonuses(
  grade: EquipmentGrade,
  level: number,
  weaponConfig: typeof WEAPON_CONFIGS[WeaponType],
  element: WeaponElement,
  rng: () => number
): GeneratedBonus[] {
  const config = GRADE_CONFIGS[grade];
  const [minCount, maxCount] = config.bonusCount;
  const count = minCount + Math.floor(rng() * (maxCount - minCount + 1));
  
  const bonuses: GeneratedBonus[] = [];
  
  // Базовые бонусы оружия
  const baseBonuses = [
    { type: 'combat_crit_chance', value: weaponConfig.critChance + level },
    { type: 'combat_crit_damage', value: weaponConfig.critDamage },
    { type: 'combat_attack_speed', value: Math.floor(weaponConfig.attackSpeed * 10) },
  ];
  
  // Элементальный бонус
  if (element !== 'neutral') {
    baseBonuses.push({ type: `elemental_${element}`, value: level * 2 });
  }
  
  for (let i = 0; i < count && i < baseBonuses.length; i++) {
    const bonus = baseBonuses[i];
    bonuses.push({
      id: `${bonus.type}_${Date.now()}_${i}`,
      type: bonus.type,
      category: bonus.type.startsWith('elemental') ? 'elemental' : 'combat',
      value: bonus.value,
      isMultiplier: bonus.type === 'combat_attack_speed',
      source: 'grade',
    });
  }
  
  return bonuses;
}

function generateWeaponName(
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
    name += `Сломанный ${baseName.toLowerCase()} из ${materialName.toLowerCase()}`;
  } else if (grade === 'common') {
    name += `${baseName} из ${materialName.toLowerCase()}`;
  } else {
    name += `${gradeConfig.name} ${baseName.toLowerCase()} из ${materialName.toLowerCase()}`;
  }
  
  return name;
}

function calculateWeaponValue(
  stats: EffectiveStats,
  material: MaterialDefinition,
  grade: EquipmentGrade,
  level: number,
  element: WeaponElement
): number {
  const config = GRADE_CONFIGS[grade];
  
  const baseValue = stats.damage * 15;
  const materialMultiplier = material.tier * 0.5 + 1;
  const gradeMultiplier = config.damageMultiplier;
  const levelMultiplier = level * 0.3 + 1;
  const elementMultiplier = element !== 'neutral' ? 1.2 : 1;
  
  return Math.floor(baseValue * materialMultiplier * gradeMultiplier * levelMultiplier * elementMultiplier);
}
