/**
 * Генератор ядер формаций
 * Источник: docs/formation_unified.md v4.1
 * 
 * Ядра формаций:
 * - Диски (L1-L6): переносные, малая ёмкость
 * - Алтари (L5-L9): стационарные, большая ёмкость
 */

import {
  CoreType,
  DiskVariant,
  AltarVariant,
  DISK_CORE_CONFIGS,
  ALTAR_CORE_CONFIGS,
} from './formation-constants';

// ==================== ТИПЫ ====================

export interface GeneratedCoreData {
  coreType: CoreType;
  variant: string;
  levelMin: number;
  levelMax: number;
  maxSlots: number;
  baseConductivity: number;
  maxCapacity: number;
  isImbued: boolean;
  craftSkill: string | null;
  craftDifficulty: number;
  isStationary: boolean;
  locationId: string | null;
  characterId: string | null;
}

// ==================== КОНСТАНТЫ НАЗВАНИЙ ====================

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
};

export const CORE_DESCRIPTIONS: Record<string, string> = {
  // Диски
  stone: 'Простой каменный диск для базовых формаций. Подходит для начинающих практиков.',
  jade: 'Нефритовый диск с хорошей проводимостью Ци. Популярен среди практиков среднего уровня.',
  iron: 'Железный диск с двумя слотами для камней Ци. Надёжный выбор для боевых формаций.',
  spirit_iron: 'Мощный диск из духовного железа. Три слота, высокая проводимость.',
  
  // Алтари
  jade_altar: 'Стационарный нефритовый алтарь для формаций уровня секты.',
  crystal_altar: 'Кристаллический алтарь для великих формаций. Пять слотов для камней Ци.',
  spirit_crystal_altar: 'Духовно-кристаллический алтарь для легендарных формаций. Может быть оснащён контуром сбора Ци.',
  dragon_bone_altar: 'Алтарь из кости дракона — вершина инженерии формаций. Десять слотов, идеальная проводимость.',
};

// ==================== ГЕНЕРАЦИЯ ЯДРА ====================

/**
 * Генерация случайного ядра по уровню
 */
export function generateFormationCore(
  level: number,
  options: {
    preferType?: CoreType;
    variant?: string;
    characterId?: string;
    locationId?: string;
  } = {}
): GeneratedCoreData {
  const { preferType, variant, characterId, locationId } = options;
  
  // Определение типа ядра
  let coreType: CoreType;
  let selectedVariant: string;
  
  if (variant) {
    // Если указан конкретный вариант
    if (variant in DISK_CORE_CONFIGS) {
      coreType = 'disk';
      selectedVariant = variant;
    } else if (variant in ALTAR_CORE_CONFIGS) {
      coreType = 'altar';
      selectedVariant = variant;
    } else {
      // Попытка определить тип по названию
      if (variant.includes('altar')) {
        coreType = 'altar';
        selectedVariant = variant.replace('_altar', '') as AltarVariant;
      } else {
        coreType = 'disk';
        selectedVariant = variant;
      }
    }
  } else {
    // Авто-выбор по уровню
    if (preferType) {
      coreType = preferType;
    } else {
      // Алтари доступны с L5+
      coreType = level >= 5 ? 'altar' : 'disk';
    }
    
    // Выбор варианта по уровню
    selectedVariant = selectVariantByLevel(level, coreType);
  }
  
  // Получение конфигурации
  const config = coreType === 'disk'
    ? DISK_CORE_CONFIGS[selectedVariant as DiskVariant]
    : ALTAR_CORE_CONFIGS[selectedVariant as AltarVariant];
  
  if (!config) {
    throw new Error(`Unknown core variant: ${selectedVariant}`);
  }
  
  // Формирование данных
  return {
    coreType,
    variant: selectedVariant,
    levelMin: config.levelRange[0],
    levelMax: config.levelRange[1],
    maxSlots: config.maxSlots,
    baseConductivity: config.conductivity,
    maxCapacity: config.capacity,
    isImbued: false,
    craftSkill: config.craftSkill || null,
    craftDifficulty: config.difficulty,
    isStationary: config.isStationary ?? false,
    locationId: locationId ?? null,
    characterId: characterId ?? null,
  };
}

/**
 * Выбор варианта по уровню
 */
function selectVariantByLevel(level: number, coreType: CoreType): string {
  if (coreType === 'disk') {
    // Найти все подходящие диски
    const availableVariants = Object.entries(DISK_CORE_CONFIGS)
      .filter(([_, config]) => level >= config.levelRange[0] && level <= config.levelRange[1])
      .map(([variant]) => variant);
    
    // Выбрать случайный или наиболее подходящий
    if (availableVariants.length > 0) {
      // Для диск: предпочитаем более высокий уровень
      return availableVariants[availableVariants.length - 1];
    }
    
    // Если нет подходящих, берём ближайший
    const allVariants = Object.entries(DISK_CORE_CONFIGS);
    const closest = allVariants.reduce((best, [variant, config]) => {
      const bestDiff = Math.abs(best[1].levelRange[0] - level);
      const currentDiff = Math.abs(config.levelRange[0] - level);
      return currentDiff < bestDiff ? [variant, config] as [string, typeof config] : best;
    });
    
    return closest[0];
  } else {
    // Алтари
    const availableVariants = Object.entries(ALTAR_CORE_CONFIGS)
      .filter(([_, config]) => level >= config.levelRange[0] && level <= config.levelRange[1])
      .map(([variant]) => variant);
    
    if (availableVariants.length > 0) {
      return availableVariants[availableVariants.length - 1];
    }
    
    // Если нет подходящих, берём ближайший
    const allVariants = Object.entries(ALTAR_CORE_CONFIGS);
    const closest = allVariants.reduce((best, [variant, config]) => {
      const bestDiff = Math.abs(best[1].levelRange[0] - level);
      const currentDiff = Math.abs(config.levelRange[0] - level);
      return currentDiff < bestDiff ? [variant, config] as [string, typeof config] : best;
    });
    
    return closest[0];
  }
}

/**
 * Проверка совместимости ядра и уровня формации
 */
export function isCoreCompatibleWithFormation(
  coreVariant: string,
  coreType: CoreType,
  formationLevel: number
): boolean {
  const config = coreType === 'disk'
    ? DISK_CORE_CONFIGS[coreVariant as DiskVariant]
    : ALTAR_CORE_CONFIGS[coreVariant as AltarVariant];
  
  if (!config) return false;
  
  return formationLevel >= config.levelRange[0] && formationLevel <= config.levelRange[1];
}

/**
 * Получение всех доступных ядер для уровня
 */
export function getAvailableCoresForLevel(level: number): Array<{
  variant: string;
  coreType: CoreType;
  name: string;
  description: string;
}> {
  const result: Array<{
    variant: string;
    coreType: CoreType;
    name: string;
    description: string;
  }> = [];
  
  // Диски
  for (const [variant, config] of Object.entries(DISK_CORE_CONFIGS)) {
    if (level >= config.levelRange[0] && level <= config.levelRange[1]) {
      result.push({
        variant,
        coreType: 'disk',
        name: CORE_NAMES[variant] || variant,
        description: CORE_DESCRIPTIONS[variant] || '',
      });
    }
  }
  
  // Алтари
  for (const [variant, config] of Object.entries(ALTAR_CORE_CONFIGS)) {
    if (level >= config.levelRange[0] && level <= config.levelRange[1]) {
      const key = `${variant}_altar`;
      result.push({
        variant,
        coreType: 'altar',
        name: CORE_NAMES[key] || variant,
        description: CORE_DESCRIPTIONS[key] || '',
      });
    }
  }
  
  return result;
}

/**
 * Получение информации о ядре
 */
export function getCoreInfo(variant: string, coreType: CoreType): {
  name: string;
  description: string;
  config: typeof DISK_CORE_CONFIGS[DiskVariant] | typeof ALTAR_CORE_CONFIGS[AltarVariant] | null;
} {
  const config = coreType === 'disk'
    ? DISK_CORE_CONFIGS[variant as DiskVariant]
    : ALTAR_CORE_CONFIGS[variant as AltarVariant];
  
  const key = coreType === 'altar' ? `${variant}_altar` : variant;
  
  return {
    name: CORE_NAMES[key] || variant,
    description: CORE_DESCRIPTIONS[key] || '',
    config: config || null,
  };
}
