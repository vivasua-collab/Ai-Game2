/**
 * ============================================================================
 * ОФФЛАЙН ГЕНЕРАТОР NPC
 * ============================================================================
 * 
 * Процедурная генерация неигровых персонажей без использования LLM.
 * 
 * Принципы:
 * - Detеrministic generation via seed
 * - Species + Role = Stats, Techniques, Equipment
 * - Inventory from existing consumables pool (CRITICAL!)
 * 
 * Архитектура:
 * 1. Context Input -> 2. Species Selection -> 3. Role Selection
 *      ↓                    ↓                      ↓
 * 4. Stats Generation -> 5. Cultivation -> 6. Body Creation
 *      ↓                    ↓                      ↓
 * 7. Personality -> 8. Techniques -> 9. Equipment -> 10. Inventory (FROM POOL)
 */

// ==================== ТИПЫ ====================

/**
 * Типы видов
 */
export type SpeciesType = 'humanoid' | 'beast' | 'spirit' | 'hybrid' | 'aberration';

/**
 * Шаблоны тела
 */
export type BodyTemplate = 'humanoid' | 'beast_quadruped' | 'beast_bird' | 'beast_serpentine' | 'spirit';

/**
 * Класс размера
 */
export type SizeClass = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

/**
 * Типы ролей
 */
export type RoleType = 'sect' | 'profession' | 'social' | 'combat';

/**
 * Диапазон значений
 */
export interface Range {
  min: number;
  max: number;
}

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
    coreCapacity: number;
    currentQi: number;
    coreQuality: number;
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
 * Префикс ID для NPC
 */
export const NPC_PREFIX = 'NP';

/**
 * Версия генератора
 */
const GENERATOR_VERSION = '1.0.0';

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

// ==================== ЗАГЛУШКИ ДЛЯ ПРЕСЕТОВ (Agent-1) ====================

/**
 * Временные пресеты видов (пока Agent-1 не создаст полноценные)
 */
const TEMP_SPECIES_PRESETS: Record<string, {
  id: string;
  name: string;
  type: SpeciesType;
  bodyTemplate: BodyTemplate;
  sizeClass: SizeClass;
  baseStats: { strength: Range; agility: Range; intelligence: Range; vitality: Range };
}> = {
  human: {
    id: 'human',
    name: 'Человек',
    type: 'humanoid',
    bodyTemplate: 'humanoid',
    sizeClass: 'medium',
    baseStats: {
      strength: { min: 5, max: 20 },
      agility: { min: 5, max: 20 },
      intelligence: { min: 5, max: 25 },
      vitality: { min: 5, max: 18 },
    },
  },
  wolf: {
    id: 'wolf',
    name: 'Волк',
    type: 'beast',
    bodyTemplate: 'beast_quadruped',
    sizeClass: 'medium',
    baseStats: {
      strength: { min: 10, max: 30 },
      agility: { min: 15, max: 35 },
      intelligence: { min: 3, max: 10 },
      vitality: { min: 10, max: 25 },
    },
  },
  fire_spirit: {
    id: 'fire_spirit',
    name: 'Огненный дух',
    type: 'spirit',
    bodyTemplate: 'spirit',
    sizeClass: 'medium',
    baseStats: {
      strength: { min: 10, max: 50 },
      agility: { min: 20, max: 60 },
      intelligence: { min: 10, max: 40 },
      vitality: { min: 30, max: 100 },
    },
  },
};

/**
 * Временные пресеты ролей
 */
const TEMP_ROLE_PRESETS: Record<string, {
  id: string;
  name: string;
  type: RoleType;
  statModifiers?: { strength?: number; agility?: number; intelligence?: number; vitality?: number };
  techniques?: string[];
}> = {
  elder: {
    id: 'elder',
    name: 'Старейшина',
    type: 'sect',
    statModifiers: { intelligence: 5, vitality: 3 },
  },
  inner_disciple: {
    id: 'inner_disciple',
    name: 'Внутренний ученик',
    type: 'sect',
    statModifiers: { strength: 2, agility: 2 },
  },
  outer_disciple: {
    id: 'outer_disciple',
    name: 'Внешний ученик',
    type: 'sect',
  },
  merchant: {
    id: 'merchant',
    name: 'Торговец',
    type: 'profession',
    statModifiers: { intelligence: 3, agility: 1 },
  },
  bandit: {
    id: 'bandit',
    name: 'Бандит',
    type: 'combat',
    statModifiers: { strength: 4, agility: 2 },
  },
  wild_beast: {
    id: 'wild_beast',
    name: 'Дикий зверь',
    type: 'combat',
    statModifiers: { strength: 5, agility: 3 },
  },
};

/**
 * Временные пресеты личностей
 */
const TEMP_PERSONALITY_PRESETS = [
  { traits: ['храбрый', 'честный'], motivations: ['защита слабых'], emotions: ['решимость'] },
  { traits: ['хитрый', 'осторожный'], motivations: ['накопление силы'], emotions: ['любопытство'] },
  { traits: ['спокойный', 'мудрый'], motivations: ['постижение истины'], emotions: ['спокойствие'] },
  { traits: ['агрессивный', 'нетерпеливый'], motivations: ['доминирование'], emotions: ['гнев'] },
  { traits: ['добрый', 'отзывчивый'], motivations: ['помощь другим'], emotions: ['радость'] },
];

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Выбор вида по контексту
 */
function selectSpecies(context: NPCGenerationContext, rng: () => number): typeof TEMP_SPECIES_PRESETS[string] {
  const candidates = Object.values(TEMP_SPECIES_PRESETS);
  
  if (context.speciesType) {
    const filtered = candidates.filter(s => s.type === context.speciesType);
    if (filtered.length > 0) {
      return randomElement(filtered, rng);
    }
  }
  
  return randomElement(candidates, rng);
}

/**
 * Выбор роли по контексту и виду
 */
function selectRole(
  context: NPCGenerationContext,
  species: typeof TEMP_SPECIES_PRESETS[string],
  rng: () => number
): typeof TEMP_ROLE_PRESETS[string] {
  if (context.roleType && TEMP_ROLE_PRESETS[context.roleType]) {
    return TEMP_ROLE_PRESETS[context.roleType];
  }
  
  // Для зверей выбираем только боевые роли
  if (species.type === 'beast') {
    return TEMP_ROLE_PRESETS['wild_beast'];
  }
  
  const candidates = Object.values(TEMP_ROLE_PRESETS);
  return randomElement(candidates, rng);
}

/**
 * Генерация характеристик
 */
function generateStats(
  species: typeof TEMP_SPECIES_PRESETS[string],
  role: typeof TEMP_ROLE_PRESETS[string],
  rng: () => number
): GeneratedNPC['stats'] {
  const baseStats = species.baseStats;
  const modifiers = role.statModifiers || {};
  
  return {
    strength: randomInRange(baseStats.strength, rng) + (modifiers.strength || 0),
    agility: randomInRange(baseStats.agility, rng) + (modifiers.agility || 0),
    intelligence: randomInRange(baseStats.intelligence, rng) + (modifiers.intelligence || 0),
    vitality: randomInRange(baseStats.vitality, rng) + (modifiers.vitality || 0),
  };
}

/**
 * Генерация культивации
 */
function generateCultivation(
  context: NPCGenerationContext,
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
  
  const subLevel = Math.floor(rng() * 10);
  const baseCapacity = 100 + level * 50;
  const coreCapacity = baseCapacity + Math.floor(rng() * baseCapacity * 0.5);
  
  return {
    level,
    subLevel,
    coreCapacity,
    currentQi: Math.floor(coreCapacity * (0.5 + rng() * 0.5)),
    coreQuality: 1 + Math.floor(rng() * 5),
  };
}

/**
 * Выбор личности
 */
function selectPersonality(rng: () => number): GeneratedNPC['personality'] {
  const personality = randomElement(TEMP_PERSONALITY_PRESETS, rng);
  
  return {
    traits: personality.traits,
    motivation: randomElement(personality.motivations, rng),
    dominantEmotion: randomElement(personality.emotions, rng),
    disposition: Math.floor(rng() * 100),
  };
}

/**
 * Генерация ресурсов
 */
function generateResources(rng: () => number): GeneratedNPC['resources'] {
  return {
    spiritStones: Math.floor(rng() * 100),
    contributionPoints: Math.floor(rng() * 50),
  };
}

/**
 * Генерация имени NPC (заглушка - полная реализация в name-generator.ts)
 */
function generateTempName(
  species: typeof TEMP_SPECIES_PRESETS[string],
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
 * Основная функция генерации NPC
 */
export function generateNPC(context: NPCGenerationContext): GeneratedNPC {
  const seed = context.seed ?? Date.now();
  const rng = seededRandom(seed);
  
  // 1. Выбор вида
  const species = selectSpecies(context, rng);
  
  // 2. Выбор роли
  const role = selectRole(context, species, rng);
  
  // 3. Генерация характеристик
  const stats = generateStats(species, role, rng);
  
  // 4. Генерация культивации
  const cultivation = generateCultivation(context, rng);
  
  // 5. Создание тела (упрощённое)
  const bodyState = createBodyForSpecies(species, cultivation.level);
  
  // 6. Выбор личности
  const personality = selectPersonality(rng);
  
  // 7. Ресурсы
  const resources = generateResources(rng);
  
  // 8. Имя
  const gender = rng() > 0.5 ? 'male' : 'female';
  const name = generateTempName(species, gender, rng);
  
  // 9. ID
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
    techniques: role.techniques || [],
    equipment: {},
    inventory: [], // Будет заполнено из пула (CRITICAL!)
    resources,
    generationMeta: {
      seed,
      generatedAt: new Date().toISOString(),
      version: GENERATOR_VERSION,
    },
  };
}

/**
 * Генерация нескольких NPC
 */
export function generateNPCs(context: NPCGenerationContext, count: number): GeneratedNPC[] {
  const npcs: GeneratedNPC[] = [];
  
  for (let i = 0; i < count; i++) {
    // Увеличиваем seed для каждого NPC
    const npcContext = {
      ...context,
      seed: (context.seed ?? Date.now()) + i,
    };
    npcs.push(generateNPC(npcContext));
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
    roleType: 'bandit', // или 'wild_beast' для зверей
  });
}

// ==================== СИСТЕМА ТЕЛА (упрощённая) ====================

/**
 * Создание тела для вида (полная реализация в npc-body-system.ts)
 */
function createBodyForSpecies(
  species: typeof TEMP_SPECIES_PRESETS[string],
  cultivationLevel: number
): BodyState {
  const sizeMultiplier = SIZE_MULTIPLIERS[species.sizeClass] || 1;
  const cultivationBonus = 1 + (cultivationLevel - 1) * 0.1;
  
  const parts: Record<string, BodyPartState> = {};
  
  // Определяем части тела по шаблону
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
      regenerationRate: 0.1,
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
  
  // Определяем тип части
  if (partId.includes('arm') || partId.includes('wing')) return baseHP.arm;
  if (partId.includes('hand') || partId.includes('foot')) return baseHP.hand;
  if (partId.includes('leg')) return baseHP.leg;
  if (partId.includes('tail') || partId.includes('segment')) return baseHP.tail;
  if (partId === 'core') return baseHP.core;
  if (partId === 'essence') return baseHP.essence;
  
  return baseHP[partId] || baseHP.torso;
}

// Экспорт для расширения name-generator.ts
export { TEMP_SPECIES_PRESETS, TEMP_ROLE_PRESETS };
