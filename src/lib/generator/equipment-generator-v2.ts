/**
 * EQUIPMENT GENERATOR V2 - ОРКЕСТРАТОР
 * 
 * Архитектура "Матрёшка":
 * 
 *   Базовый объект → Материал → Грейд → Итоговый объект
 * 
 *   EffectiveStats = Base × MaterialProperties × GradeMultipliers
 *   Bonuses = BaseBonuses + MaterialBonuses + GradeBonuses
 *   Durability = calculateDurability(material, grade)
 * 
 * === ИНТЕГРАЦИЯ С СУЩЕСТВУЮЩЕЙ СИСТЕМОЙ ===
 * 
 * - Совместим с TempItem (types/temp-npc.ts)
 * - Использует materialsRegistry (Phase 15.1)
 * - Использует grade-system (Phase 15.2)
 * - Использует durability-system (Phase 15.3)
 */

import {
  EquipmentType,
  EquipmentGrade,
  GeneratedEquipmentV2,
  EquipmentGenerationOptions,
  GeneratedBonus,
  EffectiveStats,
  EquipmentRequirements,
} from '@/types/equipment-v2';
import { MaterialDefinition, MaterialTier } from '@/types/materials';
import { materialsRegistry } from '@/lib/data/materials-registry';
import { 
  GRADE_CONFIGS, 
  GRADE_ORDER, 
  calculateGradeMultiplier,
  getBonusCountForGrade,
} from '@/lib/game/grade-system';
import { bonusRegistry } from '@/lib/data/bonus-registry-runtime';
import { 
  createDurabilityState, 
  DurabilityState 
} from '@/lib/game/durability-system';
import { seededRandom, randomInt, Rarity } from './base-item-generator';
import {
  getNextWeaponId,
  getNextArmorId,
  getNextChargerId,
  getNextAccessoryId,
  getNextArtifactId,
  getNextItemId,
} from './id-counters';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  EquipmentType,
  EquipmentGrade,
  GeneratedEquipmentV2,
  EquipmentGenerationOptions,
  GeneratedBonus,
  EffectiveStats,
};

// ============================================================================
// SUB-GENERATOR TYPES
// ============================================================================

/**
 * Базовые параметры по типу и уровню
 */
export interface BaseStats {
  damage: number;
  defense: number;
  qiConductivity: number;
  weight: number;
}

/**
 * Контекст генерации (внутренний)
 */
export interface GenerationContext {
  options: EquipmentGenerationOptions;
  rng: () => number;
  material: MaterialDefinition;
  grade: EquipmentGrade;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Главный генератор экипировки v2
 * 
 * @param options - Опции генерации
 * @returns Сгенерированная экипировка
 */
export function generateEquipmentV2(
  options: EquipmentGenerationOptions
): GeneratedEquipmentV2 {
  const rng = createRNG(options.seed);
  
  // 1. Выбор материала
  const material = selectMaterial(options, rng);
  
  // 2. Выбор грейда
  const grade = selectGrade(options, rng);
  
  // 3. Создание контекста
  const ctx: GenerationContext = {
    options,
    rng,
    material,
    grade,
  };
  
  // 4. Генерация по типу
  switch (options.type) {
    case 'weapon':
      return generateWeaponV2(ctx);
    case 'armor':
      return generateArmorV2(ctx);
    case 'charger':
      return generateChargerV2(ctx);
    case 'accessory':
      return generateAccessoryV2(ctx);
    case 'artifact':
      return generateArtifactV2(ctx);
    default:
      throw new Error(`Unknown equipment type: ${options.type}`);
  }
}

// ============================================================================
// WEAPON GENERATOR V2
// ============================================================================

function generateWeaponV2(ctx: GenerationContext): GeneratedEquipmentV2 {
  const { options, rng, material, grade } = ctx;
  const level = options.level;
  
  // 1. Базовые параметры оружия
  const baseStats = getWeaponBaseStats(level, rng);
  
  // 2. Применение материала
  const materialStats = applyMaterialToWeapon(baseStats, material);
  
  // 3. Применение грейда
  const effectiveStats = applyGradeToStats(materialStats, grade, 'weapon');
  
  // 4. Прочность
  const durability = createDurabilityState(material, grade, level);
  
  // 5. Бонусы
  const bonuses = generateEquipmentBonuses(grade, level, 'weapon', rng);
  
  // 6. Название
  const name = generateWeaponName(material.name, grade, level, rng);
  
  // 7. Требования
  const requirements = generateWeaponRequirements(level, effectiveStats);
  
  // 8. Стоимость
  const value = calculateEquipmentValue(effectiveStats, material, grade, level);
  
  return {
    id: getEquipmentId('weapon'),
    type: 'weapon',
    name,
    level,
    materialId: material.id,
    material,
    grade,
    gradeConfig: GRADE_CONFIGS[grade],
    effectiveStats,
    durability,
    bonuses,
    specialEffects: [],
    requirements,
    value,
  };
}

// ============================================================================
// ARMOR GENERATOR V2
// ============================================================================

function generateArmorV2(ctx: GenerationContext): GeneratedEquipmentV2 {
  const { options, rng, material, grade } = ctx;
  const level = options.level;
  
  // 1. Базовые параметры брони
  const baseStats = getArmorBaseStats(level, rng);
  
  // 2. Применение материала
  const materialStats = applyMaterialToArmor(baseStats, material);
  
  // 3. Применение грейда
  const effectiveStats = applyGradeToStats(materialStats, grade, 'armor');
  
  // 4. Прочность
  const durability = createDurabilityState(material, grade, level);
  
  // 5. Бонусы
  const bonuses = generateEquipmentBonuses(grade, level, 'armor', rng);
  
  // 6. Название
  const name = generateArmorName(material.name, grade, level, rng);
  
  // 7. Требования
  const requirements = generateArmorRequirements(level, effectiveStats);
  
  // 8. Стоимость
  const value = calculateEquipmentValue(effectiveStats, material, grade, level);
  
  return {
    id: getEquipmentId('armor'),
    type: 'armor',
    name,
    level,
    materialId: material.id,
    material,
    grade,
    gradeConfig: GRADE_CONFIGS[grade],
    effectiveStats,
    durability,
    bonuses,
    specialEffects: [],
    requirements,
    value,
  };
}

// ============================================================================
// CHARGER GENERATOR V2
// ============================================================================

function generateChargerV2(ctx: GenerationContext): GeneratedEquipmentV2 {
  const { options, rng, material, grade } = ctx;
  const level = options.level;
  
  // 1. Базовые параметры зарядника
  const baseStats = getChargerBaseStats(level);
  
  // 2. Применение материала (проводимость Ци — основной параметр)
  const materialStats = applyMaterialToCharger(baseStats, material);
  
  // 3. Применение грейда
  const effectiveStats = applyGradeToStats(materialStats, grade, 'charger');
  
  // 4. Прочность
  const durability = createDurabilityState(material, grade, level);
  
  // 5. Бонусы
  const bonuses = generateEquipmentBonuses(grade, level, 'charger', rng);
  
  // 6. Слоты для техник
  const slots = getSlotsByGrade(grade);
  
  // 7. Название
  const name = generateChargerName(material.name, grade, level, rng);
  
  // 8. Требования
  const requirements = generateChargerRequirements(level);
  
  // 9. Стоимость (зарядники дороже)
  const value = Math.floor(calculateEquipmentValue(effectiveStats, material, grade, level) * 1.5);
  
  return {
    id: getEquipmentId('charger'),
    type: 'charger',
    name,
    level,
    materialId: material.id,
    material,
    grade,
    gradeConfig: GRADE_CONFIGS[grade],
    effectiveStats,
    durability,
    bonuses,
    specialEffects: [`slots:${slots}`],
    requirements,
    value,
  };
}

// ============================================================================
// ACCESSORY GENERATOR V2
// ============================================================================

function generateAccessoryV2(ctx: GenerationContext): GeneratedEquipmentV2 {
  const { options, rng, material, grade } = ctx;
  const level = options.level;
  
  const baseStats: BaseStats = {
    damage: 0,
    defense: 0,
    qiConductivity: material.properties.qiConductivity * 0.5,
    weight: 0.1,
  };
  
  const effectiveStats = applyGradeToStats(baseStats, grade, 'accessory');
  const durability = createDurabilityState(material, grade, level);
  const bonuses = generateEquipmentBonuses(grade, level, 'accessory', rng);
  const name = generateAccessoryName(material.name, grade, level, rng);
  const requirements: EquipmentRequirements = { level: Math.max(1, level - 2) };
  const value = calculateEquipmentValue(effectiveStats, material, grade, level);
  
  return {
    id: getEquipmentId('accessory'),
    type: 'accessory',
    name,
    level,
    materialId: material.id,
    material,
    grade,
    gradeConfig: GRADE_CONFIGS[grade],
    effectiveStats,
    durability,
    bonuses,
    specialEffects: [],
    requirements,
    value,
  };
}

// ============================================================================
// ARTIFACT GENERATOR V2
// ============================================================================

function generateArtifactV2(ctx: GenerationContext): GeneratedEquipmentV2 {
  const { options, rng, material, grade } = ctx;
  const level = options.level;
  
  // Артефакты имеют усиленные параметры
  const baseStats: BaseStats = {
    damage: level * 3,
    defense: level * 2,
    qiConductivity: material.properties.qiConductivity,
    weight: 0.5,
  };
  
  const effectiveStats = applyGradeToStats(baseStats, grade, 'artifact');
  const durability = createDurabilityState(material, grade, level);
  const bonuses = generateEquipmentBonuses(grade, level, 'artifact', rng);
  const name = `Артефакт ${material.name}`;
  const requirements: EquipmentRequirements = { 
    level: Math.max(1, level - 1),
    intelligence: level * 5,
  };
  const value = Math.floor(calculateEquipmentValue(effectiveStats, material, grade, level) * 2);
  
  return {
    id: getEquipmentId('artifact'),
    type: 'artifact',
    name,
    level,
    materialId: material.id,
    material,
    grade,
    gradeConfig: GRADE_CONFIGS[grade],
    effectiveStats,
    durability,
    bonuses,
    specialEffects: ['unique_effect'],
    requirements,
    value,
  };
}

// ============================================================================
// BASE STATS
// ============================================================================

function getWeaponBaseStats(level: number, rng: () => number): BaseStats {
  const baseDamage = 10 + level * 5 + Math.floor(rng() * 5);
  return {
    damage: baseDamage,
    defense: 0,
    qiConductivity: 0,
    weight: 2.0 + rng() * 1.5,
  };
}

function getArmorBaseStats(level: number, rng: () => number): BaseStats {
  const baseDefense = 5 + level * 3 + Math.floor(rng() * 3);
  return {
    damage: 0,
    defense: baseDefense,
    qiConductivity: 0,
    weight: 4.0 + rng() * 2.0,
  };
}

function getChargerBaseStats(level: number): BaseStats {
  return {
    damage: 0,
    defense: 0,
    qiConductivity: 30 + level * 10,
    weight: 0.5,
  };
}

// ============================================================================
// MATERIAL APPLICATION
// ============================================================================

function applyMaterialToWeapon(base: BaseStats, material: MaterialDefinition): BaseStats {
  const damageBonus = material.bonuses.find(b => b.type === 'combat_damage')?.value ?? 0;
  
  return {
    damage: base.damage + damageBonus,
    defense: base.defense,
    qiConductivity: material.properties.qiConductivity,
    weight: material.properties.weight,
  };
}

function applyMaterialToArmor(base: BaseStats, material: MaterialDefinition): BaseStats {
  const defenseBonus = material.bonuses.find(b => b.type === 'defense_armor')?.value ?? 0;
  
  return {
    damage: base.damage,
    defense: base.defense + defenseBonus,
    qiConductivity: material.properties.qiConductivity,
    weight: material.properties.weight,
  };
}

function applyMaterialToCharger(base: BaseStats, material: MaterialDefinition): BaseStats {
  return {
    damage: 0,
    defense: 0,
    qiConductivity: material.properties.qiConductivity,
    weight: material.properties.weight,
  };
}

// ============================================================================
// GRADE APPLICATION
// ============================================================================

function applyGradeToStats(
  stats: BaseStats,
  grade: EquipmentGrade,
  type: EquipmentType
): EffectiveStats {
  const config = GRADE_CONFIGS[grade];
  
  const damageMultiplier = type === 'weapon' ? config.damageMultiplier : 1;
  const defenseMultiplier = type === 'armor' ? config.durabilityMultiplier : 1;
  const qiMultiplier = type === 'charger' ? (1 + config.damageMultiplier * 0.3) : 1;
  
  return {
    damage: Math.floor(stats.damage * damageMultiplier),
    defense: Math.floor(stats.defense * defenseMultiplier),
    qiConductivity: Math.floor(stats.qiConductivity * qiMultiplier),
    weight: Math.round(stats.weight * 100) / 100,
  };
}

// ============================================================================
// BONUSES
// ============================================================================

function generateEquipmentBonuses(
  grade: EquipmentGrade,
  level: number,
  type: EquipmentType,
  rng: () => number
): GeneratedBonus[] {
  const count = getBonusCountForGrade(grade, rng);
  return bonusRegistry.generate(type, level, grade, count, rng);
}

// ============================================================================
// NAMES
// ============================================================================

const WEAPON_TYPES = ['Меч', 'Клинок', 'Сабля', 'Катана', 'Копьё', 'Посох', 'Топор'];
const ARMOR_TYPES = ['Нагрудник', 'Кираса', 'Доспех', 'Броня', 'Мантия'];

function generateWeaponName(
  materialName: string,
  grade: EquipmentGrade,
  level: number,
  rng: () => number
): string {
  const weaponType = WEAPON_TYPES[Math.floor(rng() * WEAPON_TYPES.length)];
  const config = GRADE_CONFIGS[grade];
  
  if (grade === 'damaged') {
    return `Сломанный ${weaponType.toLowerCase()} из ${materialName.toLowerCase()}`;
  }
  if (grade === 'common') {
    return `${weaponType} из ${materialName.toLowerCase()}`;
  }
  return `${config.name} ${weaponType.toLowerCase()} из ${materialName.toLowerCase()}`;
}

function generateArmorName(
  materialName: string,
  grade: EquipmentGrade,
  level: number,
  rng: () => number
): string {
  const armorType = ARMOR_TYPES[Math.floor(rng() * ARMOR_TYPES.length)];
  const config = GRADE_CONFIGS[grade];
  
  if (grade === 'damaged') {
    return `Повреждённый ${armorType.toLowerCase()} из ${materialName.toLowerCase()}`;
  }
  if (grade === 'common') {
    return `${armorType} из ${materialName.toLowerCase()}`;
  }
  return `${config.name} ${armorType.toLowerCase()} из ${materialName.toLowerCase()}`;
}

function generateChargerName(
  materialName: string,
  grade: EquipmentGrade,
  level: number,
  rng: () => number
): string {
  const config = GRADE_CONFIGS[grade];
  const base = `Зарядник из ${materialName.toLowerCase()}`;
  
  if (grade === 'damaged') return `Треснувший ${base.toLowerCase()}`;
  if (grade === 'common') return base;
  return `${config.name} ${base.toLowerCase()}`;
}

function generateAccessoryName(
  materialName: string,
  grade: EquipmentGrade,
  level: number,
  rng: () => number
): string {
  const types = ['Кольцо', 'Амулет', 'Браслет', 'Серьга'];
  const type = types[Math.floor(rng() * types.length)];
  const config = GRADE_CONFIGS[grade];
  
  if (grade === 'damaged') return `Повреждённое ${type.toLowerCase()} из ${materialName.toLowerCase()}`;
  if (grade === 'common') return `${type} из ${materialName.toLowerCase()}`;
  return `${config.name} ${type.toLowerCase()} из ${materialName.toLowerCase()}`;
}

// ============================================================================
// REQUIREMENTS
// ============================================================================

function generateWeaponRequirements(
  level: number,
  stats: EffectiveStats
): EquipmentRequirements {
  return {
    level: Math.max(1, level - 2),
    strength: Math.floor(stats.damage * 0.3),
  };
}

function generateArmorRequirements(
  level: number,
  stats: EffectiveStats
): EquipmentRequirements {
  return {
    level: Math.max(1, level - 2),
    vitality: Math.floor(stats.defense * 0.2),
  };
}

function generateChargerRequirements(level: number): EquipmentRequirements {
  return {
    level: Math.max(1, level - 2),
    intelligence: level * 3,
  };
}

// ============================================================================
// VALUE CALCULATION
// ============================================================================

function calculateEquipmentValue(
  stats: EffectiveStats,
  material: MaterialDefinition,
  grade: EquipmentGrade,
  level: number
): number {
  const config = GRADE_CONFIGS[grade];
  
  const baseValue = (stats.damage + stats.defense + stats.qiConductivity) * 10;
  const materialMultiplier = material.tier * 0.5 + 1;
  const gradeMultiplier = config.damageMultiplier;
  const levelMultiplier = level * 0.3 + 1;
  
  return Math.floor(baseValue * materialMultiplier * gradeMultiplier * levelMultiplier);
}

// ============================================================================
// HELPERS
// ============================================================================

function createRNG(seed?: number): () => number {
  if (seed !== undefined) {
    return seededRandom(seed);
  }
  return Math.random;
}

function selectMaterial(
  options: EquipmentGenerationOptions,
  rng: () => number
): MaterialDefinition {
  // Если указан конкретный материал
  if (options.materialId) {
    const material = materialsRegistry.get(options.materialId);
    if (material) return material;
  }
  
  // Выбор по уровню
  const tier = getTierForLevel(options.level);
  
  // Весовой выбор по редкости
  const materials = materialsRegistry.getByTier(tier);
  if (materials.length === 0) {
    return materialsRegistry.getDefault(1);
  }
  
  const weighted = materials.flatMap(m =>
    Array(Math.max(1, Math.floor(m.rarity))).fill(m)
  );
  
  const index = Math.floor(rng() * weighted.length);
  return weighted[index] ?? materials[0];
}

function selectGrade(
  options: EquipmentGenerationOptions,
  rng: () => number
): EquipmentGrade {
  // Если указан конкретный грейд
  if (options.grade) {
    return options.grade;
  }
  
  // Распределение по уровню
  const distributions: Record<number, Record<EquipmentGrade, number>> = {
    1: { damaged: 30, common: 60, refined: 10, perfect: 0, transcendent: 0 },
    3: { damaged: 10, common: 50, refined: 35, perfect: 5, transcendent: 0 },
    5: { damaged: 5, common: 30, refined: 45, perfect: 20, transcendent: 0 },
    7: { damaged: 0, common: 20, refined: 40, perfect: 35, transcendent: 5 },
    9: { damaged: 0, common: 10, refined: 30, perfect: 40, transcendent: 20 },
  };
  
  const levels = Object.keys(distributions).map(Number).sort((a, b) => a - b);
  const closest = levels.reduce((p, c) => Math.abs(c - options.level) < Math.abs(p - options.level) ? c : p);
  const dist = distributions[closest];
  
  const roll = rng() * 100;
  let cumulative = 0;
  
  for (const [grade, chance] of Object.entries(dist)) {
    cumulative += chance;
    if (roll <= cumulative) {
      return grade as EquipmentGrade;
    }
  }
  
  return 'common';
}

function getTierForLevel(level: number): MaterialTier {
  if (level >= 9) return 5;
  if (level >= 7) return 4;
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
}

function getSlotsByGrade(grade: EquipmentGrade): number {
  const slots: Record<EquipmentGrade, number> = {
    damaged: 0,
    common: 1,
    refined: 2,
    perfect: 3,
    transcendent: 4,
  };
  return slots[grade];
}

/**
 * Получить ID для типа экипировки
 */
function getEquipmentId(type: EquipmentType): string {
  switch (type) {
    case 'weapon':
      return getNextWeaponId();
    case 'armor':
      return getNextArmorId();
    case 'charger':
      return getNextChargerId();
    case 'accessory':
      return getNextAccessoryId();
    case 'artifact':
      return getNextArtifactId();
    default:
      return getNextItemId();
  }
}

// ============================================================================
// BATCH GENERATION
// ============================================================================

/**
 * Генерация нескольких предметов
 */
export function generateEquipmentBatch(
  count: number,
  options: Omit<EquipmentGenerationOptions, 'seed'>,
  seed?: number
): GeneratedEquipmentV2[] {
  const results: GeneratedEquipmentV2[] = [];
  let currentSeed = seed ?? Date.now();
  
  for (let i = 0; i < count; i++) {
    const item = generateEquipmentV2({
      ...options,
      seed: currentSeed + i,
    });
    results.push(item);
  }
  
  return results;
}

// ============================================================================
// CONVERSION TO TEMP ITEM (для совместимости)
// ============================================================================

import { TempItem, generateTempItemId } from '@/types/temp-npc';

/**
 * Конвертация GeneratedEquipmentV2 в TempItem
 * Для интеграции с существующей системой
 */
export function convertToTempItem(equipment: GeneratedEquipmentV2): TempItem {
  const rarityMap: Record<EquipmentGrade, Rarity> = {
    damaged: 'common',
    common: 'common',
    refined: 'uncommon',
    perfect: 'rare',
    transcendent: 'legendary',
  };
  
  return {
    id: generateTempItemId(),
    name: equipment.name,
    nameId: equipment.id,
    type: equipment.type,
    category: `${equipment.type}_${equipment.materialId}` as any,
    rarity: rarityMap[equipment.grade],
    icon: undefined,
    stats: {
      damage: equipment.effectiveStats.damage || undefined,
      defense: equipment.effectiveStats.defense || undefined,
      qiBonus: equipment.effectiveStats.qiConductivity || undefined,
      healthBonus: undefined,
      fatigueReduction: undefined,
      conductivityBonus: equipment.effectiveStats.qiConductivity || undefined,
    },
    effects: equipment.bonuses.map(b => ({
      type: b.type,
      value: b.value,
    })),
    charges: undefined,
    maxCharges: undefined,
    value: equipment.value,
    requirements: equipment.requirements,
  };
}
