/**
 * ============================================================================
 * ГЕНЕРАТОР АКСЕССУАРОВ
 * ============================================================================
 * 
 * Процедурная генерация аксессуаров: кольца, амулеты, талисманы.
 * 
 * Префикс ID: AC (AC_000001, AC_000002, ...)
 * 
 * Типы аксессуаров:
 * - ring (кольца) — бонусы к характеристикам
 * - amulet (амулеты) — специальные бонусы
 * - talisman (талисманы) — одноразовые, ситуативные эффекты
 * 
 * ВАЖНО: Талисманы:
 * - ❌ НЕ добавляют Ци
 * - ❌ НЕ дают бонусы к статам
 * - ✅ Одноразовые
 * - ✅ Минимальное время действия
 * - ✅ Ситуативное использование
 */

// ==================== ТИПЫ ====================

export type AccessoryType = 'ring' | 'amulet' | 'talisman';

export type AccessorySlot =
  | 'ring_left_1'
  | 'ring_left_2'
  | 'ring_right_1'
  | 'ring_right_2'
  | 'amulet'
  | 'talisman_1'
  | 'talisman_2';

export type TalismanEffectType =
  | 'detection'       // Обнаружение (врагов, ловушек, Ци)
  | 'protection'      // Кратковременный щит
  | 'enhancement'     // Усиление восприятия
  | 'concealment'     // Сокрытие присутствия
  | 'barrier'         // Временный барьер
  | 'purification';   // Очистка от лёгких эффектов

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface SpecialBonus {
  type: string;
  value: number;
  description: string;
}

/**
 * Базовый аксессуар (кольцо, амулет)
 */
export interface Accessory {
  id: string;                    // AC_XXXXXX
  name: string;
  nameEn: string;
  description: string;
  type: AccessoryType;
  slot: AccessorySlot;
  bonuses: {
    stats: {
      strength?: number;
      agility?: number;
      intelligence?: number;
      conductivity?: number;
    };
    special?: SpecialBonus[];
  };
  rarity: Rarity;
  upgradeFlags: number;          // 0-15 (битовое поле)
  setId?: string;
  isSetItem: boolean;
  level: number;                 // Уровень предмета (1-9)
}

/**
 * Талисман (особый тип аксессуара)
 */
export interface Talisman extends Omit<Accessory, 'bonuses'> {
  type: 'talisman';
  // ❌ НЕ добавляют Ци
  // ❌ НЕ дают бонусы к статам
  // ✅ Одноразовые
  // ✅ Минимальное время действия
  // ✅ Ситуативное использование
  effect: {
    type: TalismanEffectType;
    duration: number;       // секунды (минимальное)
    radius?: number;        // радиус действия (если AoE)
  };
  isConsumable: true;
  maxUses: 1;
  currentUses: number;
  // bonuses наследуется от Omit<Accessory, 'bonuses'> и не существует в Talisman
}

export type GeneratedAccessory = Accessory | Talisman;

/**
 * Параметры генерации
 */
export interface AccessoryGenerationOptions {
  type?: AccessoryType;
  rarity?: Rarity;
  level?: number;
  minLevel?: number;
  maxLevel?: number;
  count?: number;
  mode: 'replace' | 'append';
  talismanEffect?: TalismanEffectType;
}

/**
 * Результат генерации
 */
export interface AccessoryGenerationResult {
  success: boolean;
  generated: number;
  total: number;
  accessories: GeneratedAccessory[];
  errors: string[];
  warnings: string[];
}

// ==================== КОНСТАНТЫ ====================

const RARITY_MULTIPLIERS: Record<Rarity, {
  statMult: number;
  specialChance: number;
  maxSpecials: number;
  weight: number;
}> = {
  common:     { statMult: 1.0, specialChance: 0.1, maxSpecials: 0, weight: 50 },
  uncommon:   { statMult: 1.2, specialChance: 0.3, maxSpecials: 1, weight: 30 },
  rare:       { statMult: 1.5, specialChance: 0.5, maxSpecials: 2, weight: 15 },
  legendary:  { statMult: 2.0, specialChance: 0.8, maxSpecials: 3, weight: 5 },
};

const STAT_RANGES_BY_LEVEL: Record<number, {
  minStat: number;
  maxStat: number;
}> = {
  1: { minStat: 1, maxStat: 3 },
  2: { minStat: 2, maxStat: 5 },
  3: { minStat: 3, maxStat: 7 },
  4: { minStat: 5, maxStat: 10 },
  5: { minStat: 7, maxStat: 14 },
  6: { minStat: 10, maxStat: 20 },
  7: { minStat: 14, maxStat: 28 },
  8: { minStat: 20, maxStat: 40 },
  9: { minStat: 28, maxStat: 56 },
};

const TALISMAN_EFFECTS: Record<TalismanEffectType, {
  name: string;
  nameEn: string;
  description: string;
  baseDuration: number;
  radius?: number;
}> = {
  detection: {
    name: 'Обнаружение',
    nameEn: 'Detection',
    description: 'Обнаруживает врагов, ловушки или скопления Ци в радиусе',
    baseDuration: 30,
    radius: 20,
  },
  protection: {
    name: 'Защита',
    nameEn: 'Protection',
    description: 'Создаёт кратковременный щит, поглощающий урон',
    baseDuration: 10,
  },
  enhancement: {
    name: 'Усиление',
    nameEn: 'Enhancement',
    description: 'Усиливает восприятие окружающего мира',
    baseDuration: 60,
    radius: 30,
  },
  concealment: {
    name: 'Сокрытие',
    nameEn: 'Concealment',
    description: 'Скрывает присутствие практика от обнаружения',
    baseDuration: 120,
  },
  barrier: {
    name: 'Барьер',
    nameEn: 'Barrier',
    description: 'Создаёт временный барьер, блокирующий проход',
    baseDuration: 30,
    radius: 3,
  },
  purification: {
    name: 'Очистка',
    nameEn: 'Purification',
    description: 'Очищает от лёгких негативных эффектов',
    baseDuration: 5,
  },
};

const NAME_PARTS = {
  rings: {
    adjectives: ['Тяжёлый', 'Лёгкий', 'Прочный', 'Изящный', 'Древний', 'Мистический'],
    nouns: ['Перстень', 'Кольцо', 'Обод', 'Символ', 'Знак', 'Печать'],
  },
  amulets: {
    adjectives: ['Сияющий', 'Тёмный', 'Защитный', 'Могущественный', 'Святой', 'Проклятый'],
    nouns: ['Амулет', 'Кулон', 'Ожерелье', 'Талисман', 'Оберег', 'Подвеска'],
  },
  talismans: {
    adjectives: ['Одноразовый', 'Временный', 'Мгновенный', 'Ситуативный', 'Экстренный'],
    nouns: ['Талисман', 'Амулет', 'Оберег', 'Печать', 'Символ'],
  },
};

const SPECIAL_BONUSES: Record<string, {
  name: string;
  description: string;
  valueRange: { min: number; max: number };
}> = {
  critChance: {
    name: 'Шанс крита',
    description: 'Увеличивает шанс критического удара',
    valueRange: { min: 2, max: 15 },
  },
  critDamage: {
    name: 'Урон крита',
    description: 'Увеличивает урон критического удара',
    valueRange: { min: 10, max: 50 },
  },
  qiRegen: {
    name: 'Регенерация Ци',
    description: 'Увеличивает скорость восстановления Ци',
    valueRange: { min: 1, max: 10 },
  },
  hpRegen: {
    name: 'Регенерация HP',
    description: 'Увеличивает скорость восстановления здоровья',
    valueRange: { min: 1, max: 5 },
  },
  dodgeChance: {
    name: 'Шанс уклонения',
    description: 'Увеличивает шанс уклонения от атак',
    valueRange: { min: 2, max: 12 },
  },
  resistance: {
    name: 'Сопротивление',
    description: 'Увеличивает сопротивление эффектам',
    valueRange: { min: 5, max: 25 },
  },
};

// Счётчик ID
let accessoryCounter = 0;

// ==================== УТИЛИТЫ ====================

function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function generateAccessoryId(): string {
  accessoryCounter++;
  return `AC_${accessoryCounter.toString().padStart(6, '0')}`;
}

function selectRarity(rng: () => number, forcedRarity?: Rarity): Rarity {
  if (forcedRarity) return forcedRarity;
  
  const roll = rng() * 100;
  let cumulative = 0;
  
  for (const [rarity, data] of Object.entries(RARITY_MULTIPLIERS)) {
    cumulative += data.weight;
    if (roll < cumulative) {
      return rarity as Rarity;
    }
  }
  return 'common';
}

// ==================== ГЕНЕРАЦИЯ ИМЁН ====================

function generateName(type: AccessoryType, rng: () => number): { name: string; nameEn: string } {
  const parts = NAME_PARTS[type === 'talisman' ? 'talismans' : type + 's' as keyof typeof NAME_PARTS] || NAME_PARTS.rings;
  const adj = parts.adjectives[Math.floor(rng() * parts.adjectives.length)];
  const noun = parts.nouns[Math.floor(rng() * parts.nouns.length)];
  
  const name = `${adj} ${noun}`;
  const nameEn = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  return { name, nameEn };
}

// ==================== ГЕНЕРАЦИЯ КОЛЕЦ И АМУЛЕТОВ ====================

function generateStandardAccessory(
  type: 'ring' | 'amulet',
  level: number,
  rarity: Rarity,
  seed: number
): Accessory {
  const rng = seededRandom(seed);
  const rarityMult = RARITY_MULTIPLIERS[rarity];
  const statRange = STAT_RANGES_BY_LEVEL[level] || STAT_RANGES_BY_LEVEL[1];
  
  // Генерация бонусов к характеристикам
  const stats: Accessory['bonuses']['stats'] = {};
  const numStats = type === 'amulet' ? 2 + Math.floor(rng() * 2) : 1 + Math.floor(rng() * 2);
  const statKeys = ['strength', 'agility', 'intelligence', 'conductivity'] as const;
  
  const selectedStats: (typeof statKeys[number])[] = [];
  for (let i = 0; i < numStats && selectedStats.length < statKeys.length; i++) {
    const availableStats = statKeys.filter(s => !selectedStats.includes(s));
    const stat = availableStats[Math.floor(rng() * availableStats.length)];
    selectedStats.push(stat);
    
    const baseValue = statRange.minStat + rng() * (statRange.maxStat - statRange.minStat);
    stats[stat] = Math.floor(baseValue * rarityMult.statMult);
  }
  
  // Генерация специальных бонусов
  const special: SpecialBonus[] = [];
  if (rng() < rarityMult.specialChance && rarityMult.maxSpecials > 0) {
    const numSpecials = Math.min(
      1 + Math.floor(rng() * rarityMult.maxSpecials),
      rarityMult.maxSpecials
    );
    
    const availableSpecials = Object.entries(SPECIAL_BONUSES);
    for (let i = 0; i < numSpecials && availableSpecials.length > 0; i++) {
      const idx = Math.floor(rng() * availableSpecials.length);
      const [key, bonus] = availableSpecials.splice(idx, 1)[0];
      
      const value = bonus.valueRange.min + rng() * (bonus.valueRange.max - bonus.valueRange.min);
      special.push({
        type: key,
        value: Math.floor(value),
        description: bonus.description,
      });
    }
  }
  
  // Выбор слота
  let slot: AccessorySlot;
  if (type === 'ring') {
    const ringSlots: AccessorySlot[] = ['ring_left_1', 'ring_left_2', 'ring_right_1', 'ring_right_2'];
    slot = ringSlots[Math.floor(rng() * ringSlots.length)];
  } else {
    slot = 'amulet';
  }
  
  const { name, nameEn } = generateName(type, rng);
  const id = generateAccessoryId();
  
  return {
    id,
    name,
    nameEn,
    description: `${name} уровня ${level}. Редкость: ${rarity}.`,
    type,
    slot,
    bonuses: {
      stats,
      special: special.length > 0 ? special : undefined,
    },
    rarity,
    upgradeFlags: 0,
    isSetItem: false,
    level,
  };
}

// ==================== ГЕНЕРАЦИЯ ТАЛИСМАНОВ ====================

function generateTalisman(
  level: number,
  rarity: Rarity,
  seed: number,
  forcedEffect?: TalismanEffectType
): Talisman {
  const rng = seededRandom(seed);
  
  // Выбор эффекта
  const effectTypes = Object.keys(TALISMAN_EFFECTS) as TalismanEffectType[];
  const effectType = forcedEffect || effectTypes[Math.floor(rng() * effectTypes.length)];
  const effectData = TALISMAN_EFFECTS[effectType];
  
  // Длительность зависит от уровня и редкости
  const rarityIndex = ['common', 'uncommon', 'rare', 'legendary'].indexOf(rarity);
  const duration = effectData.baseDuration * (1 + level * 0.2 + rarityIndex * 0.3);
  
  const { name, nameEn } = generateName('talisman', rng);
  const id = generateAccessoryId();
  
  // Выбор слота
  const talismanSlots: AccessorySlot[] = ['talisman_1', 'talisman_2'];
  const slot = talismanSlots[Math.floor(rng() * talismanSlots.length)];
  
  return {
    id,
    name: `${name} ${effectData.name}`,
    nameEn: `${nameEn} of ${effectData.nameEn}`,
    description: `${effectData.description}. Длительность: ${Math.floor(duration)} сек. Одноразовый.`,
    type: 'talisman',
    slot,
    effect: {
      type: effectType,
      duration: Math.floor(duration),
      radius: effectData.radius,
    },
    isConsumable: true,
    maxUses: 1,
    currentUses: 1,
    rarity,
    upgradeFlags: 0,
    isSetItem: false,
    level,
  };
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Генерация одного аксессуара
 */
export function generateAccessory(options: AccessoryGenerationOptions): GeneratedAccessory {
  const seed = Date.now() + Math.random() * 1000000;
  const rng = seededRandom(seed);
  
  const level = options.level || options.minLevel || 1;
  const rarity = selectRarity(rng, options.rarity);
  
  // Определение типа
  let type: AccessoryType;
  if (options.type) {
    type = options.type;
  } else {
    const types: AccessoryType[] = ['ring', 'ring', 'amulet', 'talisman']; // Кольца чаще
    type = types[Math.floor(rng() * types.length)];
  }
  
  if (type === 'talisman') {
    return generateTalisman(level, rarity, seed, options.talismanEffect);
  } else {
    return generateStandardAccessory(type, level, rarity, seed);
  }
}

/**
 * Генерация нескольких аксессуаров
 */
export function generateAccessories(
  count: number,
  options?: AccessoryGenerationOptions
): AccessoryGenerationResult {
  const accessories: GeneratedAccessory[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (options?.mode === 'replace') {
    accessoryCounter = 0;
  }
  
  for (let i = 0; i < count; i++) {
    try {
      const accessory = generateAccessory(options || { mode: 'append' });
      accessories.push(accessory);
    } catch (error) {
      errors.push(`Ошибка генерации аксессуара ${i + 1}: ${error}`);
    }
  }
  
  return {
    success: errors.length === 0,
    generated: accessories.length,
    total: count,
    accessories,
    errors,
    warnings,
  };
}

/**
 * Сброс счётчика
 */
export function resetAccessoryCounter(): void {
  accessoryCounter = 0;
}

/**
 * Получить текущее значение счётчика
 */
export function getAccessoryCounter(): number {
  return accessoryCounter;
}

/**
 * Установить начальное значение счётчика
 */
export function setAccessoryCounter(value: number): void {
  accessoryCounter = value;
}

/**
 * Получить список типов талисманов
 */
export function getTalismanEffectTypes(): TalismanEffectType[] {
  return Object.keys(TALISMAN_EFFECTS) as TalismanEffectType[];
}

/**
 * Получить информацию об эффекте талисмана
 */
export function getTalismanEffectInfo(type: TalismanEffectType) {
  return TALISMAN_EFFECTS[type];
}

/**
 * Получить список типов аксессуаров для UI
 */
export function getAccessoryTypes(): { id: AccessoryType; name: string; description: string }[] {
  return [
    { id: 'ring', name: 'Кольцо', description: 'Даёт бонусы к характеристикам. Можно носить до 4 штук.' },
    { id: 'amulet', name: 'Амулет', description: 'Даёт бонусы к характеристикам и специальные эффекты.' },
    { id: 'talisman', name: 'Талисман', description: 'Одноразовый аксессуар с ситуативным эффектом. Не даёт бонусов к статам.' },
  ];
}
