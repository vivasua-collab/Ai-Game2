/**
 * Константы системы формаций
 * Источник: docs/formation_analysis.md v4.1, docs/formation_drain_system.md v1.0
 */

// ==================== СТОИМОСТЬ КОНТУРА ====================
// contourQi — Ци на прорисовку контура
// Формула: 80 × 2^(level-1)

export const CONTOUR_QI_BY_LEVEL: Record<number, number> = {
  1: 80,
  2: 160,
  3: 320,
  4: 640,
  5: 1280,
  6: 2560,
  7: 5120,
  8: 10240,
  9: 20480,
} as const;

// ==================== МНОЖИТЕЛИ ЁМКОСТИ ====================

export const CAPACITY_MULTIPLIER_BY_SIZE = {
  small: 10,
  medium: 50,
  large: 200,
  great: 1000,
} as const;

export const HEAVY_CAPACITY_MULTIPLIER = 10000;

// ==================== УТЕЧКА ЦИ ====================
// Система тиков: 1 тик = 1 минута игрового времени

// Интервал утечки в тиках (каждые N тиков происходит потеря)
export const DRAIN_INTERVAL_BY_LEVEL: Record<number, number> = {
  1: 60,   // каждый час
  2: 50,   // каждые 50 минут
  3: 40,   // каждые 40 минут
  4: 30,   // каждые 30 минут
  5: 20,   // каждые 20 минут
  6: 15,   // каждые 15 минут
  7: 10,   // каждые 10 минут
  8: 8,    // каждые 8 минут
  9: 5,    // каждые 5 минут
} as const;

// Количество Ци за раз по размеру
export const DRAIN_AMOUNT_BY_SIZE = {
  small: 1,
  medium: 3,
  large: 10,
  great: 30,
} as const;

export const DRAIN_AMOUNT_HEAVY = 100;

// ==================== КОЭФФИЦИЕНТ ЗАТРАТ ЦИ НА УРОН ====================
// Для барьеров: 1 урон = X Ци

export const QI_COST_RATIO_BY_LEVEL: Record<number, number> = {
  1: 1.0,
  2: 0.875,
  3: 0.75,
  4: 0.625,
  5: 0.5,
  6: 0.4375,
  7: 0.375,
  8: 0.3125,
  9: 0.25,
} as const;

// ==================== МАКСИМУМ ПОМОЩНИКОВ ====================

export const MAX_HELPERS_BY_SIZE = {
  small: 2,
  medium: 5,
  large: 10,
  great: 20,
} as const;

export const MAX_HELPERS_HEAVY = 50;

// ==================== РАДИУСЫ ====================

export const RADIUS_BY_SIZE = {
  small: { creation: 10, effect: 50 },
  medium: { creation: 20, effect: 200 },
  large: { creation: 30, effect: 600 },
  great: { creation: 50, effect: 1000 },
} as const;

export const RADIUS_HEAVY = { creation: 100, effect: 5000 };

// ==================== ТИПЫ ФОРМАЦИЙ ====================

export type FormationType = 
  | 'barrier'      // Барьер
  | 'trap'         // Ловушка
  | 'amplification' // Усиление
  | 'suppression'  // Подавление
  | 'summoning'    // Призыв
  | 'transport';   // Телепорт

export type FormationSize = 'small' | 'medium' | 'large' | 'great' | 'heavy';

export type FormationStage = 
  | 'drawing'    // Прорисовка контура
  | 'imbuing'    // Внедрение в ядро
  | 'mounting'   // Монтаж алтаря
  | 'filling'    // Наполнение Ци
  | 'active'     // Активна
  | 'depleted';  // Истощена

// ==================== ТИПЫ ЯДЕР ====================

export type CoreType = 'disk' | 'altar';
export type DiskVariant = 'stone' | 'jade' | 'iron' | 'spirit_iron';
export type AltarVariant = 'jade' | 'crystal' | 'spirit_crystal' | 'dragon_bone';

// ==================== КОНФИГУРАЦИЯ ЯДЕР ====================

export interface CoreConfig {
  levelRange: [number, number];
  maxSlots: number;
  conductivity: number;
  capacity: number;
  craftSkill?: string;
  difficulty: number;
  isStationary?: boolean;
}

export const DISK_CORE_CONFIGS: Record<DiskVariant, CoreConfig> = {
  stone: {
    levelRange: [1, 2],
    maxSlots: 1,
    conductivity: 5,
    capacity: 10_000,
    craftSkill: 'masonry',
    difficulty: 1,
  },
  jade: {
    levelRange: [2, 4],
    maxSlots: 1,
    conductivity: 10,
    capacity: 50_000,
    craftSkill: 'jewelry',
    difficulty: 2,
  },
  iron: {
    levelRange: [3, 5],
    maxSlots: 2,
    conductivity: 15,
    capacity: 200_000,
    craftSkill: 'smithing',
    difficulty: 3,
  },
  spirit_iron: {
    levelRange: [4, 6],
    maxSlots: 3,
    conductivity: 25,
    capacity: 500_000,
    craftSkill: 'spirit_smithing',
    difficulty: 5,
  },
} as const;

export const ALTAR_CORE_CONFIGS: Record<AltarVariant, CoreConfig> = {
  jade: {
    levelRange: [5, 6],
    maxSlots: 3,
    conductivity: 40,
    capacity: 5_000_000,
    difficulty: 6,
    isStationary: true,
  },
  crystal: {
    levelRange: [6, 7],
    maxSlots: 5,
    conductivity: 55,
    capacity: 20_000_000,
    difficulty: 7,
    isStationary: true,
  },
  spirit_crystal: {
    levelRange: [7, 8],
    maxSlots: 8,
    conductivity: 75,
    capacity: 50_000_000,
    difficulty: 8,
    isStationary: true,
  },
  dragon_bone: {
    levelRange: [8, 9],
    maxSlots: 10,
    conductivity: 100,
    capacity: 200_000_000,
    difficulty: 9,
    isStationary: true,
  },
} as const;

// ==================== ФУНКЦИИ РАСЧЁТА ====================

/**
 * Расчёт ёмкости формации
 */
export function calculateCapacity(
  level: number,
  size: FormationSize,
  isHeavy: boolean = false
): number {
  const contourQi = CONTOUR_QI_BY_LEVEL[level] || 80;
  
  if (isHeavy && level >= 6) {
    return contourQi * HEAVY_CAPACITY_MULTIPLIER;
  }
  
  const multiplier = CAPACITY_MULTIPLIER_BY_SIZE[size as keyof typeof CAPACITY_MULTIPLIER_BY_SIZE];
  return contourQi * (multiplier || 10);
}

/**
 * Расчёт параметров утечки
 */
export function calculateDrainParams(
  level: number,
  size: FormationSize,
  isHeavy: boolean = false
): { drainInterval: number; drainAmount: number; drainPerHour: number } {
  const drainInterval = DRAIN_INTERVAL_BY_LEVEL[level] || 60;
  
  const drainAmount = isHeavy
    ? DRAIN_AMOUNT_HEAVY
    : DRAIN_AMOUNT_BY_SIZE[size as keyof typeof DRAIN_AMOUNT_BY_SIZE] || 1;
  
  // Утечка в час: (60 / интервал) × количество
  const drainsPerHour = 60 / drainInterval;
  const drainPerHour = Math.floor(drainsPerHour) * drainAmount;
  
  return { drainInterval, drainAmount, drainPerHour };
}

/**
 * Расчёт времени прорисовки/внедрения
 */
export function calculateDrawTime(
  level: number,
  conductivity: number,
  qiDensity: number
): number {
  const contourQi = CONTOUR_QI_BY_LEVEL[level] || 80;
  if (conductivity <= 0 || qiDensity <= 0) return Infinity;
  return contourQi / (conductivity * qiDensity); // секунд
}

/**
 * Расчёт времени жизни формации без подпитки
 */
export function calculateTimeToDepletion(
  capacity: number,
  drainPerHour: number
): { hours: number; days: number; years: number; formatted: string } {
  if (drainPerHour <= 0) {
    return { hours: Infinity, days: Infinity, years: Infinity, formatted: '∞' };
  }
  
  const hours = capacity / drainPerHour;
  const days = hours / 24;
  const years = days / 365;
  
  let formatted: string;
  if (years >= 1) {
    formatted = `${years.toFixed(1)} года`;
  } else if (days >= 1) {
    formatted = `${Math.floor(days)} дней`;
  } else {
    formatted = `${Math.floor(hours)} часов`;
  }
  
  return { hours, days, years, formatted };
}

/**
 * Расчёт qiCostRatio для барьера
 */
export function getQiCostRatio(level: number): number {
  return QI_COST_RATIO_BY_LEVEL[level] || 1.0;
}

/**
 * Проверка активации формации
 */
export function canActivate(currentQi: number, maxCapacity: number): boolean {
  return currentQi >= maxCapacity;
}

// ==================== NAMES ====================

/**
 * Названия ядер для UI
 */
export const CORE_NAMES: Record<string, string> = {
  // Диски
  stone: 'Каменный диск',
  jade: 'Нефритовый диск',
  iron: 'Железный диск',
  spirit_iron: 'Духовно-железный диск',
  // Алтари
  jade_altar: 'Нефритовый алтарь',
  crystal_altar: 'Кристаллический алтарь',
  spirit_crystal_altar: 'Духовно-кристаллический алтарь',
  dragon_bone_altar: 'Алтарь из кости дракона',
} as const;

// ==================== HELPER FUNCTIONS ====================

/**
 * Получить доступные ядра для уровня культивации
 */
export function getAvailableCoresForLevel(level: number): Array<{
  coreType: 'disk' | 'altar';
  variant: string;
  name: string;
  description: string;
}> {
  const result: Array<{
    coreType: 'disk' | 'altar';
    variant: string;
    name: string;
    description: string;
  }> = [];

  // Диски
  for (const [variant, config] of Object.entries(DISK_CORE_CONFIGS)) {
    const [min, max] = config.levelRange;
    if (level >= min && level <= max) {
      const key = variant;
      result.push({
        coreType: 'disk',
        variant,
        name: CORE_NAMES[key] || variant,
        description: `Ур. ${min}-${max} • ${config.maxSlots} слот • Проводимость: ${config.conductivity}`,
      });
    }
  }

  // Алтари (только с уровня 5+)
  if (level >= 5) {
    for (const [variant, config] of Object.entries(ALTAR_CORE_CONFIGS)) {
      const [min, max] = config.levelRange;
      if (level >= min && level <= max) {
        const key = `${variant}_altar`;
        result.push({
          coreType: 'altar',
          variant,
          name: CORE_NAMES[key] || variant,
          description: `Ур. ${min}-${max} • ${config.maxSlots} слот • Проводимость: ${config.conductivity} • Стационарный`,
        });
      }
    }
  }

  return result;
}
