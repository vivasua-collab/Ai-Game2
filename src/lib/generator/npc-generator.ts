/**
 * ============================================================================
 * ОФФЛАЙН ГЕНЕРАТОР NPC v2.1 - ФОРМУЛЫ LORE
 * ============================================================================
 * 
 * Процедурная генерация неигровых персонажей без использования LLM.
 * 
 * Принципы:
 * - Deterministic generation via seed
 * - Species + Role = Stats, Techniques, Equipment
 * - Inventory from existing consumables pool (CRITICAL!)
 * - Формулы из Lore: плотность Ци, рост ядра, характеристики
 * 
 * Архитектура:
 * 1. Context Input -> 2. Species Selection -> 3. Role Selection
 *      ↓                    ↓                      ↓
 * 4. Stats Generation -> 5. Cultivation -> 6. Body Creation
 *      ↓                    ↓                      ↓
 * 7. Personality -> 8. Techniques -> 9. Equipment -> 10. Inventory (FROM POOL)
 * 
 * v2.1: Интеграция формул из Lore (start_lore.md)
 * - Плотность Ци = 2^(уровень-1)
 * - Ёмкость ядра = объём × множители × плотность
 * - Проводимость = объём ядра / 360 сек
 */

import {
  SPECIES_PRESETS,
  ROLE_PRESETS,
  PERSONALITY_PRESETS,
  type SpeciesPreset,
  type RolePreset,
  type PersonalityPreset,
  type SpeciesType,
  type BodyTemplate,
  type SizeClass,
  type Range,
} from '@/data/presets';
import {
  getQiDensity,
  calculateCoreCapacity,
  calculateMeridianConductivity,
  calculateMeridianBuffer,
  calculateStats as loreCalculateStats,
  calculateSubLevelGrowth,
  calculateMainLevelMultiplier,
  QI_DENSITY_TABLE,
  STAT_MULTIPLIERS_BY_LEVEL,
  CORE_VOLUME_RANGES,
  STAT_RANGES,
  getStatBoundsByLevel,
  randomInRange as loreRandomInRange,
} from './lore-formulas';
import {
  getSpeciesById,
  getSpeciesByType,
  getAllSpecies,
} from '@/data/presets/species-presets';
import {
  getRoleById,
  getRolesByType,
  getAllRoles,
} from '@/data/presets/role-presets';
import {
  getPersonalityById,
  getCompatiblePersonalities,
  getRandomCompatiblePersonality,
} from '@/data/presets/personality-presets';
import { generatedObjectsLoader } from './generated-objects-loader';
import { NPC_PREFIX } from './id-config';

// ==================== ТИПЫ ====================

/**
 * Типы ролей (совместимость)
 */
export type RoleType = 'sect' | 'profession' | 'social' | 'combat';

/**
 * Контекст генерации NPC
 */
export interface NPCGenerationContext {
  locationId?: string;
  regionType?: string;
  sectId?: string;
  sectRole?: string;
  speciesType?: SpeciesType;
  roleType?: string;
  cultivationLevel?: number | Range;
  difficulty?: 'easy' | 'medium' | 'hard' | 'boss';
  seed?: number;
}

/**
 * Сгенерированный NPC
 */
export interface GeneratedNPC {
  id: string;
  name: string;
  title?: string;
  age: number;
  gender: 'male' | 'female' | 'none';
  
  speciesId: string;
  roleId: string;
  
  stats: {
    strength: number;
    agility: number;
    intelligence: number;
    vitality: number;
  };
  
  cultivation: {
    level: number;
    subLevel: number;
    coreCapacity: number;       // Полная ёмкость ядра в единицах Ци
    currentQi: number;           // Текущее количество Ци
    coreQuality: number;         // Качество ядра (влияет на скорость развития)
    baseVolume: number;          // Базовый объём ядра (100-2000 для человека)
    qiDensity: number;           // Плотность Ци = 2^(level-1)
    meridianConductivity: number; // Проводимость меридиан = объём/360
    meridianBuffer: number;      // Буфер меридиан = проводимость × 5
  };
  
  bodyState: BodyState;
  
  personality: {
    traits: string[];
    motivation: string;
    dominantEmotion: string;
    disposition: number;
  };
  
  techniques: string[];
  equipment: Record<string, string | null>;
  inventory: Array<{ id: string; quantity: number }>;
  
  resources: {
    spiritStones: number;
    contributionPoints: number;
  };
  
  generationMeta: {
    seed: number;
    generatedAt: string;
    version: string;
  };
}

/**
 * Состояние тела (упрощённое для NPC)
 */
export interface BodyState {
  parts: Record<string, BodyPartState>;
  activeBleeds: string[];
  activeAttachments: string[];
  isDead: boolean;
}

/**
 * Состояние части тела
 */
export interface BodyPartState {
  functionalHP: number;
  maxFunctionalHP: number;
  structuralHP: number;
  maxStructuralHP: number;
  status: 'healthy' | 'damaged' | 'crippled' | 'paralyzed' | 'severed';
  regenerationRate: number;
}

// ==================== КОНСТАНТЫ ====================

/**
 * Версия генератора
 */
const GENERATOR_VERSION = '2.1.0-lore';

/**
 * Множители размера для HP
 */
const SIZE_MULTIPLIERS: Record<SizeClass, number> = {
  tiny: 0.5,
  small: 0.75,
  medium: 1.0,
  large: 1.5,
  huge: 2.0,
};

// ==================== УТИЛИТЫ ====================

/**
 * Детерминированный генератор случайных чисел
 */
export function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/**
 * Случайное число в диапазоне
 */
function randomInRange(range: Range, rng: () => number): number {
  return range.min + Math.floor(rng() * (range.max - range.min + 1));
}

/**
 * Случайный элемент массива
 */
function randomElement<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Генерация ID
 */
function generateNPCId(counter: number): string {
  return `${NPC_PREFIX}_${counter.toString().padStart(6, '0')}`;
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ВЫБОРА ====================

/**
 * Выбор вида по контексту
 */
function selectSpecies(context: NPCGenerationContext, rng: () => number): SpeciesPreset {
  let candidates: SpeciesPreset[];
  
  if (context.speciesType) {
    candidates = getSpeciesByType(context.speciesType);
    if (candidates.length === 0) {
      candidates = getAllSpecies();
    }
  } else {
    candidates = getAllSpecies();
  }
  
  return randomElement(candidates, rng);
}

/**
 * Выбор роли по контексту и виду
 */
function selectRole(
  context: NPCGenerationContext,
  species: SpeciesPreset,
  rng: () => number
): RolePreset {
  // Если указана конкретная роль
  if (context.roleType) {
    const role = getRoleById(context.roleType);
    if (role) return role;
  }
  
  // Фильтруем роли по совместимости с видом
  let candidates = getAllRoles();
  
  // Для зверей выбираем только боевые роли
  if (species.type === 'beast') {
    const beastRoles = candidates.filter(r => 
      r.type === 'combat' || 
      !r.requirements?.speciesType ||
      r.requirements.speciesType.includes(species.type)
    );
    if (beastRoles.length > 0) {
      candidates = beastRoles;
    }
  } else {
    // Для остальных видов фильтруем по требованиям
    candidates = candidates.filter(r => 
      !r.requirements?.speciesType ||
      r.requirements.speciesType.includes(species.type)
    );
  }
  
  if (candidates.length === 0) {
    candidates = getAllRoles();
  }
  
  return randomElement(candidates, rng);
}

/**
 * Выбор личности по роли
 */
function selectPersonality(role: RolePreset, rng: () => number): GeneratedNPC['personality'] {
  const personality = getRandomCompatiblePersonality(role.id);
  
  // Извлекаем эффекты черт для disposition
  let disposition = 50; // Нейтральное значение
  const traitEffects = personality.traits.reduce((acc, trait) => {
    return {
      dispositionModifier: acc.dispositionModifier + (trait.effects.dispositionModifier || 0),
    };
  }, { dispositionModifier: 0 });
  
  disposition = Math.max(0, Math.min(100, 50 + traitEffects.dispositionModifier));
  
  return {
    traits: personality.traits.map(t => t.name),
    motivation: randomElement(personality.motivations, rng),
    dominantEmotion: randomElement(personality.dominantEmotions, rng),
    disposition,
  };
}

/**
 * Округление до 0.01 (сотые доли)
 * Используется для характеристик, где целая часть - базовое значение,
 * а дробная - накопленный прогресс развития
 */
function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Генерация характеристик по формулам Lore
 * 
 * Из Lore:
 * - Обычный взрослый: 10-15
 * - Профессионал: 10-20
 * - Гений: до 25
 * - Множители по уровню культивации (STAT_MULTIPLIERS_BY_LEVEL)
 * 
 * Формат: ЦЕЛЫЕ единицы, дробные (сотые) зарезервированы для развития
 */
function generateStats(
  species: SpeciesPreset,
  role: RolePreset,
  cultivationLevel: number,
  rng: () => number
): GeneratedNPC['stats'] {
  const baseStats = species.baseStats;
  const modifiers = role.statModifiers || {};
  
  // Множитель из Lore (STAT_MULTIPLIERS_BY_LEVEL)
  const multiplier = STAT_MULTIPLIERS_BY_LEVEL[cultivationLevel] || 1.0;
  
  // Базовые значения из вида (целые числа)
  const baseStrength = randomInRange(baseStats.strength, rng);
  const baseAgility = randomInRange(baseStats.agility, rng);
  const baseIntelligence = randomInRange(baseStats.intelligence, rng);
  const baseVitality = randomInRange(baseStats.vitality, rng);
  
  // Применяем множитель уровня и модификаторы роли
  // Округляем до целых - базовое значение
  // Сотые доли (.00) зарезервированы для будущего развития
  const result = {
    strength: Math.round(baseStrength * multiplier) + (modifiers.strength || 0),
    agility: Math.round(baseAgility * multiplier) + (modifiers.agility || 0),
    intelligence: Math.round(baseIntelligence * multiplier) + (modifiers.intelligence || 0),
    vitality: Math.round(baseVitality * multiplier) + (modifiers.vitality || 0),
  };
  
  // Валидация по границам из Lore
  const bounds = getStatBoundsByLevel(cultivationLevel);
  
  // Форматируем до 0.01 для будущего развития
  return {
    strength: roundToHundredths(Math.max(bounds.strength.min, Math.min(bounds.strength.max, result.strength))),
    agility: roundToHundredths(Math.max(bounds.agility.min, Math.min(bounds.agility.max, result.agility))),
    intelligence: roundToHundredths(Math.max(bounds.intelligence.min, Math.min(bounds.intelligence.max, result.intelligence))),
    vitality: roundToHundredths(Math.max(bounds.vitality.min, Math.min(bounds.vitality.max, result.vitality))),
  };
}

/**
 * Генерация культивации по формулам Lore
 * 
 * Формулы из Lore:
 * - Плотность Ци = 2^(уровень-1)
 * - Ёмкость ядра = объём × рост_ступеней × рост_уровня × плотность
 * - Проводимость = объём / 360 сек
 * - Буфер меридиан = проводимость × 5 сек
 */
function generateCultivation(
  context: NPCGenerationContext,
  species: SpeciesPreset,
  rng: () => number
): GeneratedNPC['cultivation'] {
  let level: number;
  
  if (context.cultivationLevel !== undefined) {
    if (typeof context.cultivationLevel === 'number') {
      level = context.cultivationLevel;
    } else {
      level = randomInRange(context.cultivationLevel, rng);
    }
  } else {
    // По умолчанию 1-3 уровень
    level = 1 + Math.floor(rng() * 3);
  }
  
  // Ограничиваем уровнем вида
  level = Math.min(level, species.cultivation.maxCultivationLevel);
  
  // Ступень (0-9)
  const subLevel = Math.floor(rng() * 10);
  
  // ===== ФОРМУЛЫ LORE =====
  
  // 1. Базовый объём ядра (из вида или по умолчанию для расы)
  let baseVolume: number;
  if (species.cultivation.coreCapacityBase) {
    baseVolume = randomInRange(species.cultivation.coreCapacityBase, rng);
  } else {
    // Используем диапазон по типу расы
    const raceType = species.type === 'humanoid' ? 'human' : species.type === 'beast' ? 'beast' : 'spirit';
    const range = CORE_VOLUME_RANGES[raceType] || CORE_VOLUME_RANGES.human;
    baseVolume = Math.floor(range.min + rng() * (range.max - range.min));
  }
  
  // 2. Плотность Ци по уровню: 2^(level-1)
  const qiDensity = getQiDensity(level);
  
  // 3. Полная ёмкость ядра по формулам Lore
  // ёмкость = (базовый объём × рост от ступеней) × множитель уровня × плотность
  const coreCapacity = calculateCoreCapacity(baseVolume, level, subLevel);
  
  // 4. Проводимость меридиан = объём ядра / 360 сек
  const meridianConductivity = calculateMeridianConductivity(baseVolume);
  
  // 5. Буфер меридиан = проводимость × 5 сек
  const meridianBuffer = calculateMeridianBuffer(meridianConductivity);
  
  // 6. Качество ядра (влияет на скорость развития)
  const coreQuality = randomInRange(species.cultivation.coreQualityRange, rng);
  
  // 7. Текущее Ци (50-100% от ёмкости)
  const currentQi = Math.floor(coreCapacity * (0.5 + rng() * 0.5));
  
  return {
    level,
    subLevel,
    coreCapacity,
    currentQi,
    coreQuality,
    baseVolume,
    qiDensity,
    meridianConductivity,
    meridianBuffer,
  };
}

/**
 * Генерация экипировки
 */
function generateEquipment(
  role: RolePreset,
  cultivationLevel: number,
  rng: () => number
): Record<string, string | null> {
  const equipment: Record<string, string | null> = {};
  const roleEquipment = role.equipment;
  
  if (!roleEquipment) {
    return equipment;
  }
  
  // Обработка weapon (может быть string или string[])
  if (roleEquipment.weapon) {
    if (Array.isArray(roleEquipment.weapon)) {
      const selected = roleEquipment.weapon[Math.floor(rng() * roleEquipment.weapon.length)];
      equipment.weapon = typeof selected === 'string' && selected.startsWith('category_') ? null : selected || null;
    } else if (typeof roleEquipment.weapon === 'string') {
      equipment.weapon = roleEquipment.weapon.startsWith('category_') ? null : roleEquipment.weapon;
    }
  }
  
  // Обработка armor (может быть string или string[])
  if (roleEquipment.armor) {
    if (Array.isArray(roleEquipment.armor)) {
      const selected = roleEquipment.armor[Math.floor(rng() * roleEquipment.armor.length)];
      equipment.armor = typeof selected === 'string' && selected.startsWith('category_') ? null : selected || null;
    } else if (typeof roleEquipment.armor === 'string') {
      equipment.armor = roleEquipment.armor.startsWith('category_') ? null : roleEquipment.armor;
    }
  }
  
  // Accessories
  if (roleEquipment.accessories && roleEquipment.accessories.length > 0) {
    const selected = roleEquipment.accessories[Math.floor(rng() * roleEquipment.accessories.length)];
    equipment.accessory1 = typeof selected === 'string' && selected.startsWith('category_') ? null : selected;
  }
  
  return equipment;
}

/**
 * Генерация ресурсов
 */
function generateResources(role: RolePreset, rng: () => number): GeneratedNPC['resources'] {
  const resources = role.resources || {};
  
  return {
    spiritStones: resources.spiritStones 
      ? randomInRange(resources.spiritStones, rng) 
      : Math.floor(rng() * 50),
    contributionPoints: resources.contributionPoints 
      ? randomInRange(resources.contributionPoints, rng) 
      : Math.floor(rng() * 25),
  };
}

/**
 * Выбор техник
 */
function selectTechniques(
  role: RolePreset,
  cultivationLevel: number,
  rng: () => number
): string[] {
  const techniques: string[] = [];
  
  // Гарантированные техники
  if (role.techniques?.guaranteed) {
    techniques.push(...role.techniques.guaranteed);
  }
  
  // Возможные техники (случайный выбор)
  if (role.techniques?.possible && role.techniques.count) {
    const remaining = Math.max(0, role.techniques.count - techniques.length);
    if (remaining > 0) {
      const shuffled = [...role.techniques.possible].sort(() => rng() - 0.5);
      techniques.push(...shuffled.slice(0, remaining));
    }
  }
  
  return techniques;
}

/**
 * Генерация имени NPC
 */
function generateNPCName(
  species: SpeciesPreset,
  gender: 'male' | 'female' | 'none',
  rng: () => number
): string {
  const maleNames = ['Вэй', 'Лин', 'Чэнь', 'Фэн', 'Юнь', 'Лун', 'Мин', 'Хао'];
  const femaleNames = ['Мэй', 'Сю', 'Лань', 'Ин', 'Цзы', 'Юй', 'Хуа', 'Фэй'];
  const beastTitles = ['Острозуб', 'Быстроног', 'Тенекрад', 'Громолап', 'Смертоносец'];
  const spiritNames = ['Инферно', 'Пиро', 'Фламма', 'Аква', 'Зефир', 'Эфир'];
  
  if (species.type === 'beast') {
    return `${species.name} ${randomElement(beastTitles, rng)}`;
  }
  
  if (species.type === 'spirit') {
    return randomElement(spiritNames, rng);
  }
  
  if (gender === 'male') {
    return randomElement(maleNames, rng);
  } else if (gender === 'female') {
    return randomElement(femaleNames, rng);
  }
  
  return `NPC_${Math.floor(rng() * 10000)}`;
}

// ==================== ЭКСПОРТИРУЕМЫЕ ФУНКЦИИ ====================

// Глобальный счётчик для ID
let npcCounter = 1;

/**
 * Сбросить счётчик ID
 */
export function resetNPCCounter(): void {
  npcCounter = 1;
}

/**
 * Получить текущий счётчик
 */
export function getNPCCounter(): number {
  return npcCounter;
}

/**
 * Основная функция генерации NPC (синхронная версия)
 */
export function generateNPC(context: NPCGenerationContext): GeneratedNPC {
  const seed = context.seed ?? Date.now();
  const rng = seededRandom(seed);
  
  // 1. Выбор вида
  const species = selectSpecies(context, rng);
  
  // 2. Выбор роли
  const role = selectRole(context, species, rng);
  
  // 3. Генерация культивации (ПЕРЕД статами!)
  const cultivation = generateCultivation(context, species, rng);
  
  // 4. Генерация характеристик (с учётом уровня культивации)
  const stats = generateStats(species, role, cultivation.level, rng);
  
  // 5. Создание тела
  const bodyState = createBodyForSpecies(species, cultivation.level);
  
  // 6. Выбор личности
  const personality = selectPersonality(role, rng);
  
  // 7. Техники
  const techniques = selectTechniques(role, cultivation.level, rng);
  
  // 8. Ресурсы
  const resources = generateResources(role, rng);
  
  // 9. Экипировка
  const equipment = generateEquipment(role, cultivation.level, rng);
  
  // 10. Имя и пол
  const gender = rng() > 0.5 ? 'male' : 'female';
  const name = generateNPCName(species, gender, rng);
  
  // 11. ID
  const id = generateNPCId(npcCounter++);
  
  return {
    id,
    name,
    age: 15 + Math.floor(rng() * 100),
    gender,
    speciesId: species.id,
    roleId: role.id,
    stats,
    cultivation,
    bodyState,
    personality,
    techniques,
    equipment,
    inventory: [], // Будет заполнено из пула через generateNPCAsync
    resources,
    generationMeta: {
      seed,
      generatedAt: new Date().toISOString(),
      version: GENERATOR_VERSION,
    },
  };
}

/**
 * Асинхронная генерация NPC с инвентарём из пула
 */
export async function generateNPCAsync(
  context: NPCGenerationContext
): Promise<GeneratedNPC> {
  const npc = generateNPC(context);
  npc.inventory = await generateInventoryFromPool(npc);
  return npc;
}

/**
 * Генерация инвентаря из пула расходников (CRITICAL!)
 */
async function generateInventoryFromPool(npc: GeneratedNPC): Promise<Array<{ id: string; quantity: number }>> {
  const inventory: Array<{ id: string; quantity: number }> = [];
  
  try {
    // Загружаем расходники из сгенерированного пула
    const consumables = await generatedObjectsLoader.loadObjects('consumables');
    
    if (consumables.length === 0) {
      return inventory;
    }
    
    // Фильтруем по уровню
    const suitable = consumables.filter(c => {
      const consumableLevel = (c as { level?: number }).level || 1;
      const requiredLevel = (c as { requirements?: { cultivationLevel?: number } }).requirements?.cultivationLevel || 1;
      return consumableLevel <= npc.cultivation.level && requiredLevel <= npc.cultivation.level;
    });
    
    // Выбираем 1-3 случайных предмета
    const count = 1 + Math.floor(Math.random() * 3);
    const selected = suitable
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
    
    for (const item of selected) {
      inventory.push({
        id: (item as { id: string }).id,
        quantity: 1 + Math.floor(Math.random() * 3),
      });
    }
  } catch (error) {
    console.error('[NPCGenerator] Error loading inventory from pool:', error);
  }
  
  return inventory;
}

/**
 * Генерация нескольких NPC
 */
export function generateNPCs(context: NPCGenerationContext, count: number): GeneratedNPC[] {
  const npcs: GeneratedNPC[] = [];
  
  for (let i = 0; i < count; i++) {
    const npcContext = {
      ...context,
      seed: (context.seed ?? Date.now()) + i,
    };
    npcs.push(generateNPC(npcContext));
  }
  
  return npcs;
}

/**
 * Асинхронная генерация нескольких NPC
 */
export async function generateNPCsAsync(
  context: NPCGenerationContext,
  count: number
): Promise<GeneratedNPC[]> {
  const npcs: GeneratedNPC[] = [];
  
  for (let i = 0; i < count; i++) {
    const npcContext = {
      ...context,
      seed: (context.seed ?? Date.now()) + i,
    };
    npcs.push(await generateNPCAsync(npcContext));
  }
  
  return npcs;
}

/**
 * Генерация NPC для секты
 */
export function generateNPCForSect(
  sectId: string,
  role: string,
  levelRange?: Range
): GeneratedNPC {
  return generateNPC({
    sectId,
    roleType: role,
    cultivationLevel: levelRange,
  });
}

/**
 * Генерация врага
 */
export function generateEnemy(
  difficulty: 'easy' | 'medium' | 'hard' | 'boss',
  level: number
): GeneratedNPC {
  const levelMap = {
    easy: { min: Math.max(1, level - 1), max: level },
    medium: { min: level, max: level + 1 },
    hard: { min: level + 1, max: level + 2 },
    boss: { min: level + 2, max: level + 3 },
  };
  
  return generateNPC({
    difficulty,
    cultivationLevel: levelMap[difficulty],
    speciesType: Math.random() > 0.5 ? 'beast' : 'humanoid',
  });
}

// ==================== СИСТЕМА ТЕЛА ====================

/**
 * Создание тела для вида
 */
export function createBodyForSpecies(
  species: SpeciesPreset,
  cultivationLevel: number
): BodyState {
  const sizeMultiplier = SIZE_MULTIPLIERS[species.sizeClass] || 1;
  const cultivationBonus = 1 + (cultivationLevel - 1) * 0.1;
  
  const parts: Record<string, BodyPartState> = {};
  const templateParts = getTemplateParts(species.bodyTemplate);
  
  for (const partId of templateParts) {
    const baseHP = getBaseHP(partId, species.bodyTemplate);
    const maxHP = Math.floor(baseHP * sizeMultiplier * cultivationBonus);
    
    parts[partId] = {
      functionalHP: maxHP,
      maxFunctionalHP: maxHP,
      structuralHP: maxHP * 2,
      maxStructuralHP: maxHP * 2,
      status: 'healthy',
      regenerationRate: species.capabilities.canCultivate ? 0.1 : 0.05,
    };
  }
  
  return {
    parts,
    activeBleeds: [],
    activeAttachments: [],
    isDead: false,
  };
}

/**
 * Получить части тела по шаблону
 */
function getTemplateParts(template: BodyTemplate): string[] {
  const templates: Record<BodyTemplate, string[]> = {
    humanoid: ['head', 'torso', 'heart', 'left_arm', 'right_arm', 'left_hand', 'right_hand', 'left_leg', 'right_leg', 'left_foot', 'right_foot'],
    beast_quadruped: ['head', 'torso', 'heart', 'front_left_leg', 'front_right_leg', 'back_left_leg', 'back_right_leg', 'tail'],
    beast_bird: ['head', 'torso', 'heart', 'left_wing', 'right_wing', 'left_leg', 'right_leg'],
    beast_serpentine: ['head', 'torso', 'heart', 'body_segment_1', 'body_segment_2', 'tail'],
    spirit: ['core', 'essence'],
  };
  
  return templates[template] || templates.humanoid;
}

/**
 * Базовое HP для части тела
 */
function getBaseHP(partId: string, template: BodyTemplate): number {
  const baseHP: Record<string, number> = {
    head: 50,
    torso: 100,
    heart: 80,
    arm: 40,
    hand: 20,
    leg: 50,
    foot: 25,
    wing: 35,
    tail: 30,
    core: 100,
    essence: 200,
  };
  
  if (partId.includes('arm') || partId.includes('wing')) return baseHP.arm;
  if (partId.includes('hand') || partId.includes('foot')) return baseHP.hand;
  if (partId.includes('leg')) return baseHP.leg;
  if (partId.includes('tail') || partId.includes('segment')) return baseHP.tail;
  if (partId === 'core') return baseHP.core;
  if (partId === 'essence') return baseHP.essence;
  
  return baseHP[partId] || baseHP.torso;
}

// Экспорт типов для внешнего использования
export { SpeciesType, BodyTemplate, SizeClass, Range };
