/**
 * ============================================================================
 * ПРЕСЕТЫ КАМНЕЙ - Rock Presets
 * ============================================================================
 * 
 * Препятствия из камня разных размеров.
 * Используются для создания естественных барьеров.
 */

import type { ObstaclePreset } from '@/types/environment';

/**
 * Пресеты камней
 * 
 * Иерархия размеров:
 * - rock_small: 0.5м, можно перепрыгнуть
 * - rock_medium: 1.0м, блокирует движение, разрушаем
 * - rock_large: 2.0м, блокирует, трудно разрушить
 * - boulder: 3.0м+, неразрушаем
 */
export const ROCK_PRESETS: ObstaclePreset[] = [
  // ==================== МАЛЫЕ КАМНИ ====================
  {
    id: 'rock_small_01',
    name: 'Малый камень',
    nameEn: 'Small Rock',
    description: 'Небольшой камень, можно обойти или перепрыгнуть',
    
    type: 'rock_small',
    category: 'obstacle',
    rarity: 'common',
    
    width: 0.5,
    height: 0.3,
    
    isBlocking: false,
    movementPenalty: 0.1,  // Небольшое замедление
    collisionShape: 'circle',
    
    visual: {
      baseColor: 0x6b7280,      // Серый
      highlightColor: 0x9ca3af, // Светло-серый
      shadowColor: 0x374151,    // Тёмно-серый
      shape: 'circle',
      texture: 'rough',
    },
    
    isDestructible: false,
    health: 100,
    defense: 50,
  },
  
  {
    id: 'rock_small_02',
    name: 'Осколок камня',
    nameEn: 'Stone Fragment',
    description: 'Острые осколки камня, замедляют движение',
    
    type: 'rock_small',
    category: 'obstacle',
    rarity: 'common',
    
    width: 0.4,
    height: 0.25,
    
    isBlocking: false,
    movementPenalty: 0.15,
    collisionShape: 'circle',
    
    visual: {
      baseColor: 0x78716c,
      highlightColor: 0xa8a29e,
      shadowColor: 0x44403c,
      shape: 'angular',
      texture: 'rough',
    },
    
    isDestructible: false,
    health: 80,
    defense: 40,
  },
  
  // ==================== СРЕДНИЕ КАМНИ ====================
  {
    id: 'rock_medium_01',
    name: 'Камень',
    nameEn: 'Rock',
    description: 'Обычный камень среднего размера. Блокирует путь, но можно разрушить.',
    
    type: 'rock_medium',
    category: 'obstacle',
    rarity: 'common',
    
    width: 1.0,
    height: 0.6,
    
    isBlocking: true,
    movementPenalty: 0,
    collisionShape: 'circle',
    
    visual: {
      baseColor: 0x4b5563,
      highlightColor: 0x6b7280,
      shadowColor: 0x1f2937,
      shape: 'irregular',
      texture: 'rough',
    },
    
    isDestructible: true,
    health: 500,
    defense: 80,
    
    dropOnDestroy: [
      {
        itemId: 'stone_fragment',
        quantityMin: 1,
        quantityMax: 3,
        chance: 0.8,
      },
    ],
  },
  
  {
    id: 'rock_medium_02',
    name: 'Плоский камень',
    nameEn: 'Flat Rock',
    description: 'Плоский камень, можно использовать как укрытие',
    
    type: 'rock_medium',
    category: 'obstacle',
    rarity: 'common',
    
    width: 1.2,
    height: 0.4,
    
    isBlocking: true,
    movementPenalty: 0,
    collisionShape: 'rectangle',
    
    visual: {
      baseColor: 0x52525b,
      highlightColor: 0x71717a,
      shadowColor: 0x27272a,
      shape: 'angular',
      texture: 'smooth',
    },
    
    isDestructible: true,
    health: 400,
    defense: 60,
    
    dropOnDestroy: [
      {
        itemId: 'stone_fragment',
        quantityMin: 2,
        quantityMax: 4,
        chance: 0.9,
      },
    ],
  },
  
  // ==================== БОЛЬШИЕ КАМНИ ====================
  {
    id: 'rock_large_01',
    name: 'Большой камень',
    nameEn: 'Large Rock',
    description: 'Крупный валун. Требует значительных усилий для разрушения.',
    
    type: 'rock_large',
    category: 'obstacle',
    rarity: 'uncommon',
    
    width: 2.0,
    height: 1.5,
    
    isBlocking: true,
    movementPenalty: 0,
    collisionShape: 'circle',
    
    visual: {
      baseColor: 0x374151,
      highlightColor: 0x4b5563,
      shadowColor: 0x111827,
      shape: 'irregular',
      texture: 'rough',
    },
    
    isDestructible: true,
    health: 2000,
    defense: 100,
    
    dropOnDestroy: [
      {
        itemId: 'stone_fragment',
        quantityMin: 5,
        quantityMax: 10,
        chance: 1.0,
      },
      {
        itemId: 'iron_ore',
        quantityMin: 1,
        quantityMax: 2,
        chance: 0.2,
      },
    ],
  },
  
  {
    id: 'rock_large_02',
    name: 'Скальный выступ',
    nameEn: 'Rock Outcrop',
    description: 'Выступ скалы. Даёт хорошее укрытие от атак.',
    
    type: 'rock_large',
    category: 'obstacle',
    rarity: 'uncommon',
    
    width: 2.5,
    height: 1.8,
    
    isBlocking: true,
    movementPenalty: 0,
    collisionShape: 'polygon',
    
    visual: {
      baseColor: 0x3f3f46,
      highlightColor: 0x52525b,
      shadowColor: 0x18181b,
      shape: 'angular',
      texture: 'rough',
    },
    
    isDestructible: true,
    health: 3000,
    defense: 150,
    
    dropOnDestroy: [
      {
        itemId: 'stone_fragment',
        quantityMin: 8,
        quantityMax: 15,
        chance: 1.0,
      },
    ],
  },
  
  // ==================== ВАЛУНЫ ====================
  {
    id: 'boulder_01',
    name: 'Валун',
    nameEn: 'Boulder',
    description: 'Огромный валун. Невозможно разрушить обычными средствами.',
    
    type: 'boulder',
    category: 'obstacle',
    rarity: 'rare',
    
    width: 3.0,
    height: 2.5,
    
    isBlocking: true,
    movementPenalty: 0,
    collisionShape: 'circle',
    
    visual: {
      baseColor: 0x1f2937,
      highlightColor: 0x374151,
      shadowColor: 0x0f172a,
      shape: 'irregular',
      texture: 'rough',
    },
    
    isDestructible: false,
    health: 10000,
    defense: 200,
  },
  
  {
    id: 'boulder_02',
    name: 'Древний валун',
    nameEn: 'Ancient Boulder',
    description: 'Древний валун с прожилками духовной энергии. Излучает слабое свечение.',
    
    type: 'boulder',
    category: 'obstacle',
    rarity: 'legendary',
    
    width: 4.0,
    height: 3.0,
    
    isBlocking: true,
    movementPenalty: 0,
    collisionShape: 'circle',
    
    visual: {
      baseColor: 0x1e1b4b,
      highlightColor: 0x312e81,
      shadowColor: 0x0c0a1e,
      shape: 'irregular',
      texture: 'crystalline',
    },
    
    isDestructible: false,
    health: 50000,
    defense: 500,
  },
  
  // ==================== ОВРАГИ ====================
  {
    id: 'ravine_01',
    name: 'Овраг',
    nameEn: 'Ravine',
    description: 'Неглубокий овраг. Можно пройти, но с замедлением.',
    
    type: 'ravine',
    category: 'obstacle',
    rarity: 'common',
    
    width: 2.0,
    height: 0.5,
    
    isBlocking: false,
    movementPenalty: 0.4,  // Значительное замедление
    collisionShape: 'rectangle',
    
    visual: {
      baseColor: 0x292524,
      highlightColor: 0x44403c,
      shadowColor: 0x0c0a09,
      shape: 'irregular',
      texture: 'rough',
    },
    
    isDestructible: false,
    health: 1000,
    defense: 0,
  },
  
  // ==================== СКАЛЫ ====================
  {
    id: 'cliff_01',
    name: 'Скала',
    nameEn: 'Cliff',
    description: 'Вертикальная скала. Непроходима.',
    
    type: 'cliff',
    category: 'obstacle',
    rarity: 'uncommon',
    
    width: 1.5,
    height: 5.0,
    
    isBlocking: true,
    movementPenalty: 0,
    collisionShape: 'rectangle',
    
    visual: {
      baseColor: 0x292524,
      highlightColor: 0x44403c,
      shadowColor: 0x0c0a09,
      shape: 'angular',
      texture: 'rough',
    },
    
    isDestructible: false,
    health: 100000,
    defense: 1000,
  },
];

/**
 * Получить пресет камня по ID
 */
export function getRockPreset(id: string): ObstaclePreset | undefined {
  return ROCK_PRESETS.find(preset => preset.id === id);
}

/**
 * Получить пресеты по типу
 */
export function getRockPresetsByType(type: ObstaclePreset['type']): ObstaclePreset[] {
  return ROCK_PRESETS.filter(preset => preset.type === type);
}

/**
 * Получить разрушаемые камни
 */
export function getDestructibleRocks(): ObstaclePreset[] {
  return ROCK_PRESETS.filter(preset => preset.isDestructible);
}

/**
 * Получить камни по редкости
 */
export function getRockPresetsByRarity(rarity: ObstaclePreset['rarity']): ObstaclePreset[] {
  return ROCK_PRESETS.filter(preset => preset.rarity === rarity);
}

/**
 * Весовые коэффициенты для случайной генерации
 */
export const ROCK_SPAWN_WEIGHTS: Record<ObstaclePreset['type'], number> = {
  rock_small: 40,    // 40% шанс
  rock_medium: 35,   // 35% шанс
  rock_large: 15,    // 15% шанс
  boulder: 5,        // 5% шанс
  ravine: 4,         // 4% шанс
  cliff: 1,          // 1% шанс
};

/**
 * Выбрать случайный пресет камня с учётом весов
 */
export function selectRandomRockPreset(random: number): ObstaclePreset {
  const totalWeight = Object.values(ROCK_SPAWN_WEIGHTS).reduce((a, b) => a + b, 0);
  let threshold = random * totalWeight;
  
  for (const [type, weight] of Object.entries(ROCK_SPAWN_WEIGHTS)) {
    threshold -= weight;
    if (threshold <= 0) {
      const presetsOfType = getRockPresetsByType(type as ObstaclePreset['type']);
      if (presetsOfType.length > 0) {
        return presetsOfType[Math.floor(Math.random() * presetsOfType.length)];
      }
    }
  }
  
  return ROCK_PRESETS[0];
}
