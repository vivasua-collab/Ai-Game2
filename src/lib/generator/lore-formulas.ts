/**
 * ============================================================================
 * ФОРМУЛЫ LORE - Расчёты для мира культивации
 * ============================================================================
 * 
 * Основано на документации start_lore.md
 * 
 * Ключевые формулы:
 * - Плотность Ци = 2^(уровень-1)
 * - Ёмкость ядра = объём × плотность
 * - Проводимость = объём ядра / 360 сек
 * - Рост ядра: +10% за ступень, +10% за уровень
 */

// ==================== ПЛОТНОСТЬ ЦИ ====================

/**
 * Импорт из единого источника истины
 * 
 * @see src/lib/constants/technique-capacity.ts
 */
import { 
  QI_DENSITY_TABLE, 
  calculateQiDensity 
} from '@/lib/constants/technique-capacity';

// Re-export для обратной совместимости
export { QI_DENSITY_TABLE, calculateQiDensity as getQiDensity };

// ==================== ОБЪЁМ ЯДРА ====================

/**
 * Базовый диапазон объёма ядра по расам
 * Из Lore:
 * - Человек: 100-2000
 * - Древние расы: 100-100000
 * - Монстры: 100-10000
 */
export const CORE_VOLUME_RANGES = {
  human: { min: 100, max: 2000 },
  ancient: { min: 100, max: 100000 },
  beast: { min: 100, max: 10000 },
  spirit: { min: 500, max: 50000 },
} as const;

/**
 * Рассчитать рост объёма ядра от ступеней
 * Каждая ступень даёт +10% роста (округление вверх)
 * 
 * @param baseVolume - базовый объём ядра
 * @param subLevel - ступень (0-9)
 * @returns объём с учётом ступеней
 */
export function calculateSubLevelGrowth(baseVolume: number, subLevel: number): number {
  let volume = baseVolume;
  for (let i = 0; i < subLevel; i++) {
    volume = Math.ceil(volume * 1.1);
  }
  return volume;
}

/**
 * Рассчитать рост объёма ядра от основного уровня
 * Каждый основной уровень даёт +10% роста (округление вверх)
 * Но это применяется к уже накопленному объёму
 * 
 * @param volumeAfterSubLevels - объём после роста от ступеней
 * @param mainLevel - основной уровень (1-9)
 * @returns множитель роста от уровня
 */
export function calculateMainLevelMultiplier(mainLevel: number): number {
  // Накопительный множитель: 1.1^(level-1)
  // Уровень 1 = 1.0, Уровень 7 ≈ 1.77, Уровень 9 ≈ 2.14
  return Math.pow(1.1, mainLevel - 1);
}

/**
 * Полный расчёт ёмкости ядра
 * 
 * Формула из Lore:
 * ёмкость = (базовый объём × множитель_ступеней) × множитель_уровня × плотность_Ци
 * 
 * @param baseVolume - стартовый объём ядра (100-2000 для человека)
 * @param level - основной уровень (1-9)
 * @param subLevel - ступень (0-9)
 * @returns полная ёмкость ядра в единицах Ци
 */
export function calculateCoreCapacity(baseVolume: number, level: number, subLevel: number): number {
  // Рост от ступеней
  const volumeWithSubLevels = calculateSubLevelGrowth(baseVolume, subLevel);
  
  // Множитель от основного уровня
  const levelMultiplier = calculateMainLevelMultiplier(level);
  
  // Плотность Ци
  const density = calculateQiDensity(level);
  
  // Итоговая ёмкость
  // Примечание: плотность влияет на то, сколько Ци можно хранить в том же объёме
  // Поэтому ёмкость = объём × плотность
  return Math.floor(volumeWithSubLevels * levelMultiplier * density);
}

// ==================== ПРОВОДИМОСТЬ МЕРИДИАН ====================

/**
 * Рассчитать проводимость меридиан
 * Формула из Lore: проводимость = объём ядра / 360 сек
 * 
 * @param coreVolume - текущий объём ядра (не ёмкость!)
 * @returns проводимость в ед/сек
 */
export function calculateMeridianConductivity(coreVolume: number): number {
  return coreVolume / 360;
}

/**
 * Запасаемый объём Ци в меридианах
 * Формула: запас = проводимость × 5 секунд
 * 
 * @param conductivity - проводимость меридиан
 * @returns объём Ци в меридианах
 */
export function calculateMeridianBuffer(conductivity: number): number {
  return Math.floor(conductivity * 5);
}

// ==================== ХАРАКТЕРИСТИКИ ====================

/**
 * Базовые диапазоны характеристик по категориям
 * Из Lore:
 * - Дети: 0.1-5
 * - Подростки: 5-10
 * - Взрослые: 10-15
 * - Профессионалы: 10-20
 * - Гении: до 25
 */
export const STAT_RANGES = {
  child: { min: 0.1, max: 5 },
  teen: { min: 5, max: 10 },
  adult: { min: 10, max: 15 },
  professional: { min: 10, max: 20 },
  genius: { min: 20, max: 25 },
} as const;

/**
 * Множители характеристик по уровням культивации
 * 
 * Из Lore следует, что при повышении уровня:
 * - Меняются физиологические и метаболические параметры
 * - Уровни 4+: физические параметры превосходят человеческие пределы
 * 
 * Расчёт: базовые статы × множитель уровня
 */
export const STAT_MULTIPLIERS_BY_LEVEL: Record<number, number> = {
  1: 1.0,     // Обычный человек
  2: 1.1,     // Чуть выше
  3: 1.25,    // Предел человека
  4: 1.5,     // Превосходит человека
  5: 2.0,     // Сверхчеловек
  6: 3.0,     // Легендарный воин
  7: 5.0,     // Мастер
  8: 8.0,     // Великий мастер
  9: 15.0,    // Полубог
};

/**
 * Округление до 0.01 (сотые доли)
 * Целая часть - базовое значение, дробная - прогресс развития
 */
function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Рассчитать характеристики NPC по уровню культивации
 * 
 * @param baseStats - базовые характеристики (10-15 для обычного взрослого)
 * @param cultivationLevel - уровень культивации (1-9)
 * @param roleBonus - бонус от роли (опционально)
 * @returns итоговые характеристики (целые + 0.00 для развития)
 */
export function calculateStats(
  baseStats: { strength: number; agility: number; intelligence: number; vitality: number },
  cultivationLevel: number,
  roleBonus: { strength?: number; agility?: number; intelligence?: number; vitality?: number } = {}
): { strength: number; agility: number; intelligence: number; vitality: number } {
  const multiplier = STAT_MULTIPLIERS_BY_LEVEL[cultivationLevel] || 1.0;
  
  // Округляем до целых, добавляем 0.00 для будущего развития
  return {
    strength: roundToHundredths(Math.round(baseStats.strength * multiplier) + (roleBonus.strength || 0)),
    agility: roundToHundredths(Math.round(baseStats.agility * multiplier) + (roleBonus.agility || 0)),
    intelligence: roundToHundredths(Math.round(baseStats.intelligence * multiplier) + (roleBonus.intelligence || 0)),
    vitality: roundToHundredths(Math.round(baseStats.vitality * multiplier) + (roleBonus.vitality || 0)),
  };
}

// ==================== МЕХАНИКА ПРОРЫВА ====================

/**
 * Ци необходимая для прорыва
 * 
 * Малый уровень (ступень): ёмкость × 10
 * Большой уровень: ёмкость × 100
 * 
 * @param coreCapacity - текущая ёмкость ядра
 * @param isMajorLevel - прорыв на новый основной уровень
 */
export function calculateBreakthroughCost(coreCapacity: number, isMajorLevel: boolean): number {
  return coreCapacity * (isMajorLevel ? 100 : 10);
}

// ==================== ГЕНЕРАЦИЯ СЛУЧАЙНЫХ ЗНАЧЕНИЙ ====================

/**
 * Диапазон значений (для совместимости)
 */
export interface Range {
  min: number;
  max: number;
}

/**
 * Случайное число в диапазоне
 * @param minOrRange - либо минимальное значение, либо объект { min, max }
 * @param maxOrRng - либо максимальное значение, либо RNG функция
 * @param rng - RNG функция (если первые два параметра - числа)
 */
export function randomInRange(
  minOrRange: number | Range | [number, number],
  maxOrRng: number | (() => number),
  rng?: () => number
): number {
  let min: number, max: number, random: () => number;
  
  if (typeof minOrRange === 'number') {
    min = minOrRange;
    max = maxOrRng as number;
    random = rng ?? Math.random;
  } else if (Array.isArray(minOrRange)) {
    [min, max] = minOrRange;
    random = maxOrRng as () => number;
  } else {
    min = minOrRange.min;
    max = minOrRange.max;
    random = maxOrRng as () => number;
  }
  
  return min + Math.floor(random() * (max - min + 1));
}

/**
 * Случайное число с плавающей точкой в диапазоне
 */
export function randomFloat(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

// ==================== ТАБЛИЦА МИНИМУМОВ/МАКСИМУМОВ ПО УРОВНЯМ ====================

/**
 * Минимальные и максимальные значения характеристик по уровню культивации
 * Для валидации и генерации
 */
export function getStatBoundsByLevel(level: number): {
  strength: { min: number; max: number };
  agility: { min: number; max: number };
  intelligence: { min: number; max: number };
  vitality: { min: number; max: number };
  qi: { min: number; max: number };
} {
  const mult = STAT_MULTIPLIERS_BY_LEVEL[level] || 1.0;
  
  // Базовые значения: взрослый человек 10-15
  const baseMin = 10;
  const baseMax = 15;
  
  // Базовый объём ядра для человека
  const baseVolumeMin = 100;
  const baseVolumeMax = 2000;
  
  // Плотность Ци
  const density = QI_DENSITY_TABLE[level] || 1;
  
  // Минимальная ёмкость (базовый объём 100 × множитель уровня × плотность)
  const minCapacity = Math.floor(baseVolumeMin * Math.pow(1.1, level - 1) * density);
  
  // Максимальная ёмкость (базовый объём 2000 × множитель уровня × плотность)
  const maxCapacity = Math.floor(baseVolumeMax * Math.pow(1.1, level - 1) * density);
  
  return {
    strength: { min: Math.floor(baseMin * mult), max: Math.floor(25 * mult) },
    agility: { min: Math.floor(baseMin * mult), max: Math.floor(25 * mult) },
    intelligence: { min: Math.floor(baseMin * mult), max: Math.floor(25 * mult) },
    vitality: { min: Math.floor(baseMin * mult), max: Math.floor(25 * mult) },
    qi: { min: minCapacity, max: maxCapacity },
  };
}

/**
 * Полная таблица границ по всем уровням (для отладки и отображения)
 */
export function getAllLevelBounds(): Record<number, ReturnType<typeof getStatBoundsByLevel>> {
  const bounds: Record<number, ReturnType<typeof getStatBoundsByLevel>> = {};
  for (let level = 1; level <= 9; level++) {
    bounds[level] = getStatBoundsByLevel(level);
  }
  return bounds;
}

// ==================== СЛОТЫ ТЕХНИК ====================

/**
 * Рассчитать количество боевых слотов техник
 * Формула: 3 + (cultivationLevel - 1)
 * 
 * @param cultivationLevel Уровень культивации (1-9)
 * @returns Количество боевых слотов техник
 */
export function calculateTechniqueSlots(cultivationLevel: number): number {
  // Валидация уровня
  const level = Math.max(1, Math.min(9, cultivationLevel));
  return 3 + (level - 1);
}

/**
 * Таблица слотов техник по уровням
 * L1 = 3 слота
 * L3 = 5 слотов
 * L9 = 11 слотов
 */
export const TECHNIQUE_SLOTS_BY_LEVEL: Record<number, number> = {
  1: 3,
  2: 4,
  3: 5,
  4: 6,
  5: 7,
  6: 8,
  7: 9,
  8: 10,
  9: 11,
};

/**
 * Рассчитать слот культивации
 * Всегда 1 слот для техники культивации
 */
export function calculateCultivationSlot(): number {
  return 1;
}

// ==================== ПРИМЕРЫ РАСЧЁТОВ ====================

/**
 * Пример: NPC 7-го уровня, 3-я ступень, базовый объём ядра 1000
 * 
 * Плотность Ци: 2^(7-1) = 64
 * Рост от ступеней: 1000 × 1.1³ ≈ 1331
 * Множитель уровня: 1.1^6 ≈ 1.77
 * Ёмкость: 1331 × 1.77 × 64 ≈ 150,949 Ци
 * 
 * Характеристики: базовые 12 × множитель 5.0 = 60
 */
export function debugExampleNPC(): void {
  const level = 7;
  const subLevel = 3;
  const baseVolume = 1000;
  
  console.log('=== NPC 7-го уровня, 3-я ступень ===');
  console.log(`Базовый объём ядра: ${baseVolume}`);
  console.log(`Плотность Ци (уровень ${level}): ${calculateQiDensity(level)}`);
  console.log(`Множитель уровня: ${calculateMainLevelMultiplier(level).toFixed(2)}`);
  console.log(`Ёмкость ядра: ${calculateCoreCapacity(baseVolume, level, subLevel)}`);
  console.log(`Статы (базовые 12): ${JSON.stringify(calculateStats({ strength: 12, agility: 12, intelligence: 12, vitality: 12 }, level))}`);
  console.log(`Границы статов: ${JSON.stringify(getStatBoundsByLevel(level))}`);
}
