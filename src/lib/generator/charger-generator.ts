/**
 * ============================================================================
 * ГЕНЕРАТОР ЗАРЯДНИКОВ
 * ============================================================================
 * 
 * Процедурная генерация зарядников (устройств для поглощения Ци из камней).
 * 
 * Префикс ID: CH (CH_000001, CH_000002, ...)
 * 
 * ⚠️ ВАЖНО: Эффективность ≤ 100%!
 * Сохранение Ци строго соблюдается!
 * 
 * Концепция:
 * - Отдельный слот — не привязан к части тела
 * - Заряжается в инвентаре — не в бою
 * - Вставляется в слот — до исчерпания камней
 * 
 * Пример работы:
 * Зарядник (efficiency = 80%):
 * - Камень: 1000 ед Ци
 * - Практик получит: 800 ед Ци
 * - Потери: 200 ед Ци (рассеиваются)
 */

import type { QiStone } from './qi-stone-generator';

// ==================== ТИПЫ ====================

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/**
 * Зарядник
 * ⚠️ Эффективность ≤ 100% — сохранение Ци обязательно!
 */
export interface Charger {
  id: string;                    // CH_XXXXXX
  name: string;
  nameEn: string;
  description: string;
  
  // Параметры
  capacity: number;              // Сколько камней вмещает
  efficiency: number;            // 0.5 - 1.0 (50% - 100%) — НИКОГДА > 100%!
  chargeRate: number;            // Скорость отдачи Ци (ед/сек)
  
  // Состояние
  installed: boolean;
  installedStones: QiStone[];
  totalQiRemaining: number;
  
  // Требования
  requirements: {
    cultivationLevel?: number;
  };
  
  // Редкость
  rarity: Rarity;
  
  // Улучшения (битовое поле)
  upgradeFlags: number;          // 0-15 (4 бита)
  
  // Уровень
  level: number;
}

/**
 * Параметры генерации
 */
export interface ChargerGenerationOptions {
  rarity?: Rarity;
  level?: number;
  minLevel?: number;
  maxLevel?: number;
  count?: number;
  mode: 'replace' | 'append';
  // Ограничения
  minEfficiency?: number;
  maxEfficiency?: number;
  minCapacity?: number;
  maxCapacity?: number;
}

/**
 * Результат генерации
 */
export interface ChargerGenerationResult {
  success: boolean;
  generated: number;
  total: number;
  chargers: Charger[];
  errors: string[];
  warnings: string[];
}

// ==================== КОНСТАНТЫ ====================

const RARITY_MULTIPLIERS: Record<Rarity, {
  efficiencyBonus: number;
  capacityBonus: number;
  chargeRateBonus: number;
  weight: number;
}> = {
  common:     { efficiencyBonus: 0, capacityBonus: 0, chargeRateBonus: 0, weight: 50 },
  uncommon:   { efficiencyBonus: 0.05, capacityBonus: 1, chargeRateBonus: 0.5, weight: 30 },
  rare:       { efficiencyBonus: 0.1, capacityBonus: 2, chargeRateBonus: 1, weight: 15 },
  legendary:  { efficiencyBonus: 0.15, capacityBonus: 3, chargeRateBonus: 2, weight: 5 },
};

const LEVEL_CONFIGS: Record<number, {
  baseCapacity: number;
  baseEfficiency: number;
  baseChargeRate: number;
}> = {
  1: { baseCapacity: 1, baseEfficiency: 0.5, baseChargeRate: 2 },
  2: { baseCapacity: 1, baseEfficiency: 0.55, baseChargeRate: 3 },
  3: { baseCapacity: 2, baseEfficiency: 0.6, baseChargeRate: 4 },
  4: { baseCapacity: 2, baseEfficiency: 0.65, baseChargeRate: 5 },
  5: { baseCapacity: 3, baseEfficiency: 0.7, baseChargeRate: 6 },
  6: { baseCapacity: 3, baseEfficiency: 0.75, baseChargeRate: 8 },
  7: { baseCapacity: 4, baseEfficiency: 0.8, baseChargeRate: 10 },
  8: { baseCapacity: 4, baseEfficiency: 0.85, baseChargeRate: 12 },
  9: { baseCapacity: 5, baseEfficiency: 0.9, baseChargeRate: 15 },
};

const NAME_PARTS = {
  adjectives: ['Простой', 'Улучшенный', 'Мощный', 'Древний', 'Мастерский', 'Легендарный'],
  nouns: ['Зарядник', 'Накопитель', 'Резервуар', 'Концентратор', 'Усилитель'],
};

// ⚠️ МАКСИМАЛЬНАЯ ЭФФЕКТИВНОСТЬ = 100%
const MAX_EFFICIENCY = 1.0;
const MIN_EFFICIENCY = 0.5;

// Счётчик ID
let chargerCounter = 0;

// ==================== УТИЛИТЫ ====================

function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
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

function generateChargerId(): string {
  chargerCounter++;
  return `CH_${chargerCounter.toString().padStart(6, '0')}`;
}

function generateName(level: number, rarity: Rarity, rng: () => number): { name: string; nameEn: string } {
  const adj = NAME_PARTS.adjectives[Math.floor(rng() * NAME_PARTS.adjectives.length)];
  const noun = NAME_PARTS.nouns[Math.floor(rng() * NAME_PARTS.nouns.length)];
  
  const name = `${adj} ${noun}`;
  const nameEn = `${adj} Charger`;
  
  return { name, nameEn };
}

/**
 * ⚠️ ВАЛИДАЦИЯ: Эффективность НЕ может быть больше 100%!
 */
function validateEfficiency(efficiency: number): number {
  if (efficiency > MAX_EFFICIENCY) {
    console.warn(`⚠️ ВНИМАНИЕ: Эффективность ${efficiency} превышает 100%! Ограничено до ${MAX_EFFICIENCY}`);
    return MAX_EFFICIENCY;
  }
  if (efficiency < MIN_EFFICIENCY) {
    return MIN_EFFICIENCY;
  }
  return efficiency;
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Генерация одного зарядника
 */
export function generateCharger(options: ChargerGenerationOptions): Charger {
  const seed = Date.now() + Math.random() * 1000000;
  const rng = seededRandom(seed);
  
  const level = options.level || options.minLevel || 1;
  const rarity = selectRarity(rng, options.rarity);
  const rarityMult = RARITY_MULTIPLIERS[rarity];
  const levelConfig = LEVEL_CONFIGS[level] || LEVEL_CONFIGS[1];
  
  // Вычисление ёмкости
  let capacity = levelConfig.baseCapacity + rarityMult.capacityBonus + Math.floor(rng() * 2);
  if (options.minCapacity !== undefined) {
    capacity = Math.max(capacity, options.minCapacity);
  }
  if (options.maxCapacity !== undefined) {
    capacity = Math.min(capacity, options.maxCapacity);
  }
  
  // ⚠️ Вычисление эффективности (НИКОГДА > 100%!)
  let efficiency = levelConfig.baseEfficiency + rarityMult.efficiencyBonus + rng() * 0.05;
  if (options.minEfficiency !== undefined) {
    efficiency = Math.max(efficiency, options.minEfficiency);
  }
  if (options.maxEfficiency !== undefined) {
    efficiency = Math.min(efficiency, options.maxEfficiency);
  }
  // ВАЛИДАЦИЯ!
  efficiency = validateEfficiency(efficiency);
  
  // Вычисление скорости отдачи
  const chargeRate = Math.floor(
    (levelConfig.baseChargeRate + rarityMult.chargeRateBonus) * (1 + rng() * 0.2)
  );
  
  // Требования
  const cultivationLevel = Math.max(1, level - 1);
  
  const { name, nameEn } = generateName(level, rarity, rng);
  const id = generateChargerId();
  
  // Описание
  const efficiencyPercent = Math.floor(efficiency * 100);
  let description = `Зарядник уровня ${level}. `;
  description += `Вмещает ${capacity} камней Ци. `;
  description += `Эффективность: ${efficiencyPercent}%. `;
  description += `Скорость отдачи: ${chargeRate} ед/сек.`;
  
  if (efficiency < 1.0) {
    const lossPercent = 100 - efficiencyPercent;
    description += ` ⚠️ Потери: ${lossPercent}% Ци рассеивается.`;
  }
  
  return {
    id,
    name,
    nameEn,
    description,
    capacity,
    efficiency,
    chargeRate,
    installed: false,
    installedStones: [],
    totalQiRemaining: 0,
    requirements: {
      cultivationLevel,
    },
    rarity,
    upgradeFlags: 0,
    level,
  };
}

/**
 * Генерация нескольких зарядников
 */
export function generateChargers(
  count: number,
  options?: ChargerGenerationOptions
): ChargerGenerationResult {
  const chargers: Charger[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (options?.mode === 'replace') {
    chargerCounter = 0;
  }
  
  for (let i = 0; i < count; i++) {
    try {
      const charger = generateCharger(options || { mode: 'append' });
      chargers.push(charger);
    } catch (error) {
      errors.push(`Ошибка генерации зарядника ${i + 1}: ${error}`);
    }
  }
  
  return {
    success: errors.length === 0,
    generated: chargers.length,
    total: count,
    chargers,
    errors,
    warnings,
  };
}

/**
 * Сброс счётчика
 */
export function resetChargerCounter(): void {
  chargerCounter = 0;
}

/**
 * Получить текущее значение счётчика
 */
export function getChargerCounter(): number {
  return chargerCounter;
}

/**
 * Установить начальное значение счётчика
 */
export function setChargerCounter(value: number): void {
  chargerCounter = value;
}

/**
 * Рассчитать эффективную отдачу Ци
 */
export function calculateEffectiveQiOutput(charger: Charger, inputQi: number): {
  output: number;
  loss: number;
} {
  const output = Math.floor(inputQi * charger.efficiency);
  const loss = inputQi - output;
  
  return { output, loss };
}

/**
 * Получить информацию об ограничениях эффективности
 */
export function getEfficiencyInfo(): {
  max: number;
  min: number;
  warning: string;
} {
  return {
    max: MAX_EFFICIENCY,
    min: MIN_EFFICIENCY,
    warning: 'Эффективность НЕ может быть больше 100% — это нарушает закон сохранения Ци!',
  };
}

/**
 * Получить информацию о редкостях
 */
export function getRarityInfo(): { id: Rarity; name: string; efficiencyBonus: number }[] {
  return Object.entries(RARITY_MULTIPLIERS).map(([id, data]) => ({
    id: id as Rarity,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    efficiencyBonus: data.efficiencyBonus,
  }));
}
