/**
 * ============================================================================
 * ГЕНЕРАТОР ФОРМАЦИЙ
 * ============================================================================
 * 
 * Процедурная генерация формаций (боевых построений).
 * 
 * Типы формаций:
 * - Защитные (defensive) - защита участников
 * - Атакующие (offensive) - усиление атаки
 * - Поддержки (support) - усиление регенерации, Ци
 * - Специальные (special) - уникальные эффекты
 */

// ==================== ТИПЫ ====================

export type FormationType = 'defensive' | 'offensive' | 'support' | 'special';
export type FormationShape = 'circle' | 'triangle' | 'square' | 'line' | 'star' | 'custom';

export interface FormationPosition {
  x: number;      // Относительная позиция (-1 до 1)
  y: number;
  role: 'leader' | 'core' | 'support' | 'auxiliary';
}

export interface FormationEffects {
  // Защитные
  damageReduction?: number;       // % снижения урона
  damageSharing?: number;         // % распределения урона между участниками
  shieldHP?: number;              // HP общего щита
  
  // Атакующие
  damageBonus?: number;           // % бонуса к урону
  critChance?: number;            // % шанса крита
  attackSpeed?: number;           // % скорости атаки
  
  // Поддержки
  qiRegen?: number;               // Регенерация Ци
  hpRegen?: number;               // Регенерация HP
  fatigueReduction?: number;      // Снижение усталости
  
  // Специальные
  elementAmplify?: Element;       // Усиление элемента
  range?: number;                 // Радиус действия
  duration?: number;              // Длительность (минуты)
}

export interface FormationRequirements {
  minParticipants: number;
  maxParticipants: number;
  minCultivationLevel: number;
  recommendedElements?: Element[];
  incompatibleFormations?: string[];
}

export interface GeneratedFormation {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type: FormationType;
  shape: FormationShape;
  level: number;
  rarity: Rarity;
  
  positions: FormationPosition[];
  effects: FormationEffects;
  requirements: FormationRequirements;
  
  qiCostPerMinute: number;
  setupTime: number;  // Минуты для установки
  
  meta: {
    seed: number;
    generatedAt: string;
    generatorVersion: string;
  };
}

export type Element = 'fire' | 'water' | 'earth' | 'air' | 'lightning' | 'void' | 'neutral';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

// ==================== КОНСТАНТЫ ====================

const FORMATION_NAMES = {
  defensive: {
    prefixes: ['Стена', 'Барьер', 'Щит', 'Крепость', 'Бастион'],
    suffixes: ['Защиты', 'Охраны', 'Обороны', 'Покровительства'],
  },
  offensive: {
    prefixes: ['Копьё', 'Меч', 'Клинок', 'Стрела', 'Коготь'],
    suffixes: ['Нападения', 'Атаки', 'Разрушения', 'Ярости'],
  },
  support: {
    prefixes: ['Источник', 'Поток', 'Круг', 'Сфера', 'Аура'],
    suffixes: ['Восстановления', 'Гармонии', 'Баланса', 'Равновесия'],
  },
  special: {
    prefixes: ['Печать', 'Руна', 'Массив', 'Узор', 'Символ'],
    suffixes: ['Силы', 'Духа', 'Пустоты', 'Вечности'],
  },
};

const SHAPE_POSITIONS: Record<FormationShape, (count: number) => FormationPosition[]> = {
  circle: (count) => {
    const positions: FormationPosition[] = [{ x: 0, y: 0, role: 'leader' }];
    for (let i = 0; i < count - 1; i++) {
      const angle = (2 * Math.PI * i) / (count - 1);
      positions.push({
        x: Math.cos(angle) * 0.7,
        y: Math.sin(angle) * 0.7,
        role: i < Math.floor((count - 1) / 2) ? 'core' : 'support',
      });
    }
    return positions;
  },
  triangle: (count) => {
    const positions: FormationPosition[] = [{ x: 0, y: 0.5, role: 'leader' }];
    const rowSize = Math.ceil((count - 1) / 2);
    for (let i = 0; i < count - 1; i++) {
      const row = Math.floor(i / rowSize);
      const col = i % rowSize;
      positions.push({
        x: (col - rowSize / 2 + 0.5) * 0.4,
        y: -0.3 - row * 0.3,
        role: row === 0 ? 'core' : 'support',
      });
    }
    return positions;
  },
  square: (count) => {
    const positions: FormationPosition[] = [{ x: 0, y: 0, role: 'leader' }];
    const size = Math.ceil(Math.sqrt(count - 1));
    let added = 0;
    for (let x = -size / 2; x <= size / 2 && added < count - 1; x++) {
      for (let y = -size / 2; y <= size / 2 && added < count - 1; y++) {
        if (x === 0 && y === 0) continue;
        positions.push({
          x: x * 0.3,
          y: y * 0.3,
          role: Math.abs(x) <= 1 && Math.abs(y) <= 1 ? 'core' : 'support',
        });
        added++;
      }
    }
    return positions;
  },
  line: (count) => {
    const positions: FormationPosition[] = [];
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * 0.3;
      positions.push({
        x,
        y: 0,
        role: i === Math.floor(count / 2) ? 'leader' : i < count / 2 ? 'core' : 'support',
      });
    }
    return positions;
  },
  star: (count) => {
    const positions: FormationPosition[] = [{ x: 0, y: 0, role: 'leader' }];
    const points = Math.min(5, Math.floor((count - 1) / 2));
    for (let i = 0; i < points; i++) {
      const angle = (Math.PI / 2) + (2 * Math.PI * i) / points;
      positions.push({
        x: Math.cos(angle) * 0.8,
        y: Math.sin(angle) * 0.8,
        role: 'core',
      });
    }
    for (let i = 0; i < count - 1 - points; i++) {
      const angle = (Math.PI / 2) + (2 * Math.PI * i) / (count - 1 - points);
      positions.push({
        x: Math.cos(angle) * 0.4,
        y: Math.sin(angle) * 0.4,
        role: 'support',
      });
    }
    return positions;
  },
  custom: (count) => {
    const positions: FormationPosition[] = [];
    for (let i = 0; i < count; i++) {
      positions.push({
        x: (Math.random() - 0.5) * 1.5,
        y: (Math.random() - 0.5) * 1.5,
        role: i === 0 ? 'leader' : i < count / 3 ? 'core' : i < count * 2 / 3 ? 'support' : 'auxiliary',
      });
    }
    return positions;
  },
};

const BASE_EFFECTS: Record<FormationType, Record<number, FormationEffects>> = {
  defensive: {
    1: { damageReduction: 10, shieldHP: 20 },
    2: { damageReduction: 15, damageSharing: 10, shieldHP: 40 },
    3: { damageReduction: 20, damageSharing: 15, shieldHP: 60 },
    4: { damageReduction: 25, damageSharing: 20, shieldHP: 80 },
    5: { damageReduction: 30, damageSharing: 25, shieldHP: 100 },
  },
  offensive: {
    1: { damageBonus: 10 },
    2: { damageBonus: 15, critChance: 5 },
    3: { damageBonus: 20, critChance: 10, attackSpeed: 5 },
    4: { damageBonus: 25, critChance: 15, attackSpeed: 10 },
    5: { damageBonus: 30, critChance: 20, attackSpeed: 15 },
  },
  support: {
    1: { qiRegen: 1, hpRegen: 1 },
    2: { qiRegen: 2, hpRegen: 2, fatigueReduction: 5 },
    3: { qiRegen: 3, hpRegen: 3, fatigueReduction: 10 },
    4: { qiRegen: 4, hpRegen: 4, fatigueReduction: 15 },
    5: { qiRegen: 5, hpRegen: 5, fatigueReduction: 20 },
  },
  special: {
    1: { range: 10, duration: 5 },
    2: { range: 15, duration: 10, elementAmplify: 'fire' as Element },
    3: { range: 20, duration: 15, elementAmplify: 'lightning' as Element },
    4: { range: 25, duration: 20, elementAmplify: 'void' as Element },
    5: { range: 30, duration: 30, elementAmplify: 'void' as Element },
  },
};

// ==================== УТИЛИТЫ ====================

function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function generateFormationName(type: FormationType, level: number, rng: () => number): { name: string; nameEn: string } {
  const patterns = FORMATION_NAMES[type];
  const prefix = patterns.prefixes[Math.floor(rng() * patterns.prefixes.length)];
  const suffix = patterns.suffixes[Math.floor(rng() * patterns.suffixes.length)];
  
  const patterns_arr = [
    `${prefix} ${suffix}`,
    `${suffix} ${prefix.toLowerCase()}`,
  ];
  
  const name = patterns_arr[Math.floor(rng() * patterns_arr.length)];
  return { name, nameEn: name };
}

// ==================== ГЕНЕРАЦИЯ ====================

export function generateFormation(
  id: string,
  type: FormationType,
  level: number,
  seed?: number
): GeneratedFormation {
  const actualSeed = seed ?? Date.now();
  const rng = seededRandom(actualSeed);
  
  // Выбираем форму
  const shapes: FormationShape[] = ['circle', 'triangle', 'square', 'line', 'star'];
  const shape = shapes[Math.floor(rng() * shapes.length)];
  
  // Количество участников
  const minParticipants = 2 + Math.floor(rng() * 2) + level;
  const maxParticipants = minParticipants + Math.floor(rng() * 4);
  
  // Генерируем позиции
  const positions = SHAPE_POSITIONS[shape](Math.floor((minParticipants + maxParticipants) / 2));
  
  // Базовые эффекты
  const baseEffects = BASE_EFFECTS[type][Math.min(level, 5)] || BASE_EFFECTS[type][5];
  const effects: FormationEffects = { ...baseEffects };
  
  // Добавляем случайные модификаторы
  if (rng() > 0.5 && level >= 2) {
    effects.range = 10 + Math.floor(rng() * level * 5);
  }
  if (rng() > 0.7 && level >= 3) {
    effects.duration = 5 + Math.floor(rng() * level * 5);
  }
  
  // Редкость
  const rarity: Rarity = level <= 1 ? 'common' : level <= 2 ? 'uncommon' : level <= 4 ? 'rare' : 'legendary';
  
  const { name, nameEn } = generateFormationName(type, level, rng);
  
  const description = `Формация "${name}" типа ${type}. ` +
    `Требует ${minParticipants}-${maxParticipants} участников. ` +
    `Уровень ${level}.`;
  
  return {
    id,
    name,
    nameEn,
    description,
    type,
    shape,
    level,
    rarity,
    positions,
    effects,
    requirements: {
      minParticipants,
      maxParticipants,
      minCultivationLevel: Math.max(1, level - 1),
    },
    qiCostPerMinute: 10 + level * 5,
    setupTime: 5 + level * 2,
    meta: {
      seed: actualSeed,
      generatedAt: new Date().toISOString(),
      generatorVersion: '1.0.0',
    },
  };
}

export function generateFormationsForLevel(level: number, idCounter?: { current: number }): GeneratedFormation[] {
  const types: FormationType[] = ['defensive', 'offensive', 'support', 'special'];
  const count = Math.max(10, Math.floor(1000 / Math.pow(2, level - 1))); // Больше формаций
  
  const formations: GeneratedFormation[] = [];
  const counter = idCounter || { current: 0 };
  
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const id = `FM_${(counter.current + i + 1).toString().padStart(6, '0')}`;
    formations.push(generateFormation(id, type, level));
  }
  
  if (idCounter) {
    idCounter.current += count;
  }
  
  return formations;
}

export function generateAllFormations(): GeneratedFormation[] {
  const all: GeneratedFormation[] = [];
  const counter = { current: 0 };
  
  for (let level = 1; level <= 9; level++) {
    all.push(...generateFormationsForLevel(level, counter));
  }
  return all;
}

export function getFormationCountForLevel(level: number): number {
  return Math.max(10, Math.floor(1000 / Math.pow(2, level - 1)));
}

export function getTotalFormationCount(): number {
  let total = 0;
  for (let level = 1; level <= 9; level++) {
    total += getFormationCountForLevel(level);
  }
  return total;
}

export function getFormationStats() {
  return {
    totalPossible: getTotalFormationCount(),
    byLevel: Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [i + 1, getFormationCountForLevel(i + 1)])
    ),
    types: ['defensive', 'offensive', 'support', 'special'] as FormationType[],
  };
}
