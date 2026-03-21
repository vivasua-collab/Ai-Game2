/**
 * ============================================================================
 * ГЕНЕРАТОР РАСХОДНЫХ МАТЕРИАЛОВ
 * ============================================================================
 * 
 * Процедурная генерация расходников: таблетки, эликсиры, еда, свитки.
 * 
 * Префикс ID: CS (CS_000001, CS_000002, ...)
 * 
 * ⚠️ ВАЖНО: Расходники НЕ добавляют Ци — это задача зарядников!
 * 
 * Типы расходников:
 * - pill (таблетки) — кратковременные баффы
 * - elixir (эликсиры) — долгосрочные эффекты
 * - food (еда) — восстановление
 * - scroll (свитки) — одноразовые эффекты
 * 
 * Пояс (Belt System):
 * - До 4 слотов быстрого доступа
 * - Активация: CTRL + цифра (1-4)
 */

import { seededRandom, hashString } from './base-item-generator';
import { getNextConsumableId, getCounter, setCounter, resetCounter } from './id-counters';

// ============================================================================
// СИСТЕМА GRADE (МАТРЁШКА)
// ============================================================================

import {
  ConsumableGrade,
  CONSUMABLE_GRADE_CONFIGS,
  RARITY_TO_TECHNIQUE_GRADE,
  TECHNIQUE_GRADE_TO_RARITY,
} from '@/types/grade';

import {
  selectConsumableGrade,
} from './grade-selector';

// Обратная совместимость: Rarity импортируется из @/types/rarity
import type { Rarity } from '@/types/rarity';
export type { Rarity }; // Re-export for consumers

// ==================== ТИПЫ ====================

export type ConsumableType = 'pill' | 'elixir' | 'food' | 'scroll';

export type ConsumableEffectType =
  | 'heal_hp'           // Восстановление здоровья
  | 'heal_stamina'      // Восстановление сил
  | 'buff_stat'         // Усиление характеристики
  | 'buff_resistance'   // Усиление сопротивления
  | 'cure'              // Лечение статуса
  | 'special';          // Особый эффект

// Rarity импортируется из @/types/rarity для обратной совместимости

/**
 * Эффект расходника
 */
export interface ConsumableEffect {
  type: ConsumableEffectType;
  value: number;
  duration?: number;     // в секундах (для баффов)
  stat?: string;         // для buff_stat
}

/**
 * Параметры использования
 */
export interface ConsumableUsage {
  castTime: number;      // время использования (сек)
  cooldown?: number;     // перезарядка (сек)
}

/**
 * Расходный материал
 */
export interface Consumable {
  id: string;            // CS_XXXXXX
  name: string;
  nameEn: string;
  description: string;
  type: ConsumableType;
  effect: ConsumableEffect;
  usage: ConsumableUsage;
  /** @deprecated Используйте grade. Оставлено для обратной совместимости. */
  rarity: Rarity;
  /** Грейд расходника (новая система) */
  grade?: ConsumableGrade;
  level: number;         // Уровень предмета (1-9)
  stackSize: number;     // Максимальный размер стака
  quantity?: number;     // Текущее количество
}

/**
 * Слот быстрого доступа пояса
 */
export interface QuickAccessSlot {
  slotIndex: number;     // 1-4
  item: Consumable | null;
  hotkey: string;        // "CTRL+1", "CTRL+2", "CTRL+3", "CTRL+4"
}

/**
 * Параметры генерации
 */
export interface ConsumableGenerationOptions {
  type?: ConsumableType;
  effectType?: ConsumableEffectType;
  /** @deprecated Используйте grade */
  rarity?: Rarity;
  /** Грейд расходника (новая система) */
  grade?: ConsumableGrade;
  level?: number;
  minLevel?: number;
  maxLevel?: number;
  count?: number;
  mode: 'replace' | 'append';
}

/**
 * Результат генерации
 */
export interface ConsumableGenerationResult {
  success: boolean;
  generated: number;
  total: number;
  consumables: Consumable[];
  errors: string[];
  warnings: string[];
}

// ==================== КОНСТАНТЫ ====================

// RARITY_MULTIPLIERS удалён - используйте CONSUMABLE_GRADE_CONFIGS из @/types/grade
// или CONSUMABLE_GRADE_EFFECT_MULTIPLIERS из ./grade-selector

const TYPE_CONFIGS: Record<ConsumableType, {
  name: string;
  nameEn: string;
  description: string;
  baseCastTime: number;
  defaultStackSize: number;
  possibleEffects: ConsumableEffectType[];
}> = {
  pill: {
    name: 'Таблетка',
    nameEn: 'Pill',
    description: 'Кратковременные баффы и восстановления',
    baseCastTime: 1,
    defaultStackSize: 20,
    possibleEffects: ['heal_hp', 'heal_stamina', 'buff_stat', 'buff_resistance'],
  },
  elixir: {
    name: 'Эликсир',
    nameEn: 'Elixir',
    description: 'Долгосрочные эффекты и усиления',
    baseCastTime: 2,
    defaultStackSize: 10,
    possibleEffects: ['buff_stat', 'buff_resistance', 'cure', 'special'],
  },
  food: {
    name: 'Еда',
    nameEn: 'Food',
    description: 'Восстановление здоровья и сил',
    baseCastTime: 3,
    defaultStackSize: 50,
    possibleEffects: ['heal_hp', 'heal_stamina'],
  },
  scroll: {
    name: 'Свиток',
    nameEn: 'Scroll',
    description: 'Одноразовые эффекты и способности',
    baseCastTime: 1,
    defaultStackSize: 5,
    possibleEffects: ['special', 'cure', 'buff_stat'],
  },
};

const EFFECT_CONFIGS: Record<ConsumableEffectType, {
  name: string;
  nameEn: string;
  description: string;
  baseValueByLevel: Record<number, number>;
  hasDuration: boolean;
  baseDuration?: number;
}> = {
  heal_hp: {
    name: 'Восстановление здоровья',
    nameEn: 'Heal HP',
    description: 'Восстанавливает здоровье',
    baseValueByLevel: {
      1: 10, 2: 20, 3: 35, 4: 55, 5: 80,
      6: 115, 7: 160, 8: 220, 9: 300,
    },
    hasDuration: false,
  },
  heal_stamina: {
    name: 'Восстановление сил',
    nameEn: 'Heal Stamina',
    description: 'Восстанавливает силы',
    baseValueByLevel: {
      1: 15, 2: 30, 3: 50, 4: 80, 5: 120,
      6: 170, 7: 230, 8: 300, 9: 400,
    },
    hasDuration: false,
  },
  buff_stat: {
    name: 'Усиление характеристики',
    nameEn: 'Buff Stat',
    description: 'Временно усиливает характеристику',
    baseValueByLevel: {
      1: 2, 2: 4, 3: 6, 4: 9, 5: 13,
      6: 18, 7: 25, 8: 34, 9: 45,
    },
    hasDuration: true,
    baseDuration: 60,
  },
  buff_resistance: {
    name: 'Усиление сопротивления',
    nameEn: 'Buff Resistance',
    description: 'Временно увеличивает сопротивление эффектам',
    baseValueByLevel: {
      1: 5, 2: 10, 3: 15, 4: 22, 5: 30,
      6: 40, 7: 52, 8: 66, 9: 85,
    },
    hasDuration: true,
    baseDuration: 120,
  },
  cure: {
    name: 'Лечение статуса',
    nameEn: 'Cure Status',
    description: 'Снимает негативный статус',
    baseValueByLevel: {
      1: 1, 2: 1, 3: 2, 4: 2, 5: 3,
      6: 3, 7: 4, 8: 4, 9: 5,
    },
    hasDuration: false,
  },
  special: {
    name: 'Особый эффект',
    nameEn: 'Special Effect',
    description: 'Уникальный эффект',
    baseValueByLevel: {
      1: 1, 2: 2, 3: 3, 4: 4, 5: 5,
      6: 6, 7: 7, 8: 8, 9: 9,
    },
    hasDuration: true,
    baseDuration: 30,
  },
};

const NAME_PARTS = {
  pill: {
    adjectives: ['Малая', 'Средняя', 'Большая', 'Мощная', 'Древняя'],
    nouns: ['Таблетка', 'Пилюля', 'Шарик', 'Капсула'],
  },
  elixir: {
    adjectives: ['Слабый', 'Обычный', 'Крепкий', 'Мощный', 'Легендарный'],
    nouns: ['Эликсир', 'Настойка', 'Зелье', 'Напиток'],
  },
  food: {
    adjectives: ['Простой', 'Сытный', 'Питательный', 'Вкусный', 'Изысканный'],
    nouns: ['Хлеб', 'Мясо', 'Суп', 'Рис', 'Фрукт'],
  },
  scroll: {
    adjectives: ['Старый', 'Древний', 'Мистический', 'Святой', 'Проклятый'],
    nouns: ['Свиток', 'Сказание', 'Письмо', 'Гримуар'],
  },
};

const STATS = ['strength', 'agility', 'intelligence', 'conductivity'];

// ==================== УТИЛИТЫ ====================

// seededRandom и hashString импортируются из base-item-generator.ts

// selectRarity удалён - используйте selectConsumableGrade из ./grade-selector

function generateConsumableId(): string {
  return getNextConsumableId();
}

function generateName(type: ConsumableType, effect: ConsumableEffectType, rng: () => number): { name: string; nameEn: string } {
  const parts = NAME_PARTS[type];
  const adj = parts.adjectives[Math.floor(rng() * parts.adjectives.length)];
  const noun = parts.nouns[Math.floor(rng() * parts.nouns.length)];
  const effectName = EFFECT_CONFIGS[effect].name;
  
  const name = `${adj} ${noun} ${effectName}`;
  const nameEn = `${adj} ${noun} of ${EFFECT_CONFIGS[effect].nameEn}`;
  
  return { name, nameEn };
}

// ==================== ОСНОВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ ====================

/**
 * Генерация одного расходника
 */
export function generateConsumable(options: ConsumableGenerationOptions): Consumable {
  const seed = Date.now() + Math.random() * 1000000;
  const rng = seededRandom(seed);
  
  const level = options.level || options.minLevel || 1;
  
  // ========== ВЫБОР GRADE (НОВАЯ СИСТЕМА) ==========
  // Приоритет: grade > rarity → grade > случайный
  const grade = options?.grade ?? 
    (options?.rarity ? RARITY_TO_TECHNIQUE_GRADE[options.rarity] : undefined) ??
    selectConsumableGrade(undefined, rng);
  
  const gradeConfig = CONSUMABLE_GRADE_CONFIGS[grade];
  const rarity = TECHNIQUE_GRADE_TO_RARITY[grade]; // обратная совместимость
  const gradeMult = gradeConfig.effectMultiplier;
  
  // Определение типа
  let type: ConsumableType;
  if (options.type) {
    type = options.type;
  } else {
    const types: ConsumableType[] = ['pill', 'food', 'elixir', 'scroll'];
    type = types[Math.floor(rng() * types.length)];
  }
  
  const typeConfig = TYPE_CONFIGS[type];
  
  // Определение эффекта
  let effectType: ConsumableEffectType;
  if (options.effectType && typeConfig.possibleEffects.includes(options.effectType)) {
    effectType = options.effectType;
  } else {
    effectType = typeConfig.possibleEffects[Math.floor(rng() * typeConfig.possibleEffects.length)];
  }
  
  const effectConfig = EFFECT_CONFIGS[effectType];
  
  // Вычисление значения эффекта (с учётом Grade)
  const baseValue = effectConfig.baseValueByLevel[level] || effectConfig.baseValueByLevel[1];
  const effectValue = Math.floor(baseValue * gradeMult);
  
  // Длительность (если есть) - используем durationMultiplier из gradeConfig
  let duration: number | undefined;
  if (effectConfig.hasDuration && effectConfig.baseDuration) {
    duration = Math.floor(effectConfig.baseDuration * gradeConfig.durationMultiplier * (1 + level * 0.1));
  }
  
  // Стат для buff_stat
  let stat: string | undefined;
  if (effectType === 'buff_stat') {
    stat = STATS[Math.floor(rng() * STATS.length)];
  }
  
  // Время использования
  const castTime = typeConfig.baseCastTime + Math.floor(rng() * 2);
  
  // Перезарядка
  const cooldown = effectConfig.hasDuration ? 30 + Math.floor(rng() * 30) : 10 + Math.floor(rng() * 20);
  
  const { name, nameEn } = generateName(type, effectType, rng);
  const id = generateConsumableId();
  
  let description = effectConfig.description;
  if (stat) {
    description += ` (${stat})`;
  }
  if (duration) {
    description += `. Длительность: ${duration} сек.`;
  }
  
  return {
    id,
    name,
    nameEn,
    description,
    type,
    effect: {
      type: effectType,
      value: effectValue,
      duration,
      stat,
    },
    usage: {
      castTime,
      cooldown,
    },
    rarity,        // deprecated
    grade,         // новая система
    level,
    stackSize: typeConfig.defaultStackSize,
    quantity: 1,
  };
}

/**
 * Генерация нескольких расходников
 */
export function generateConsumables(
  count: number,
  options?: ConsumableGenerationOptions
): ConsumableGenerationResult {
  const consumables: Consumable[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (options?.mode === 'replace') {
    resetCounter('CS');
  }
  
  for (let i = 0; i < count; i++) {
    try {
      const consumable = generateConsumable(options || { mode: 'append' });
      consumables.push(consumable);
    } catch (error) {
      errors.push(`Ошибка генерации расходника ${i + 1}: ${error}`);
    }
  }
  
  return {
    success: errors.length === 0,
    generated: consumables.length,
    total: count,
    consumables,
    errors,
    warnings,
  };
}

/**
 * Сброс счётчика
 */
export function resetConsumableCounter(): void {
  resetCounter('CS');
}

/**
 * Получить текущее значение счётчика
 */
export function getConsumableCounter(): number {
  return getCounter('CS');
}

/**
 * Установить начальное значение счётчика
 */
export function setConsumableCounter(value: number): void {
  setCounter('CS', value);
}

/**
 * Получить список типов расходников для UI
 */
export function getConsumableTypes(): { id: ConsumableType; name: string; description: string }[] {
  return Object.entries(TYPE_CONFIGS).map(([id, config]) => ({
    id: id as ConsumableType,
    name: config.name,
    description: config.description,
  }));
}

/**
 * Получить список типов эффектов для UI
 */
export function getEffectTypes(): { id: ConsumableEffectType; name: string; description: string }[] {
  return Object.entries(EFFECT_CONFIGS).map(([id, config]) => ({
    id: id as ConsumableEffectType,
    name: config.name,
    description: config.description,
  }));
}

/**
 * Получить возможные эффекты для типа расходника
 */
export function getPossibleEffects(type: ConsumableType): ConsumableEffectType[] {
  return TYPE_CONFIGS[type].possibleEffects;
}

/**
 * Информация о поясе
 */
export const BELT_INFO = {
  quickAccessSlots: 4,
  hotkeys: ['CTRL+1', 'CTRL+2', 'CTRL+3', 'CTRL+4'],
  description: 'Пояс имеет до 4 слотов быстрого доступа для расходников. Активация: CTRL + цифра (1-4).',
};
