/**
 * ============================================================================
 * ПРЕСЕТЫ СТРОЕНИЙ - Building Presets
 * ============================================================================
 * 
 * Деревянные строения: стены, двери, окна.
 * Являются частью карты, а не отдельными локациями.
 */

import type { BuildingPartPreset } from '@/types/environment';

/**
 * Пресеты частей строений
 */
export const BUILDING_PART_PRESETS: BuildingPartPreset[] = [
  // ==================== СТЕНЫ ====================
  {
    id: 'wall_wooden_01',
    name: 'Деревянная стена',
    nameEn: 'Wooden Wall',
    description: 'Базовая деревянная стена. Блокирует проход.',
    
    type: 'wall_wooden',
    category: 'building',
    
    width: 1.0,
    height: 2.5,
    depth: 0.2,
    
    properties: {
      isPassable: false,
      isOpenable: false,
      isTransparent: false,
      isClimbable: false,
      providesCover: true,
    },
    
    initialState: 'closed',
    
    visual: {
      primaryColor: 0x8b4513,
      secondaryColor: 0x5c4033,
      borderColor: 0x4a3728,
      pattern: 'planks',
    },
    
    health: 500,
    defense: 30,
    isDestructible: true,
    
    buildCost: [
      { material: 'wood', quantity: 10 },
    ],
  },
  
  {
    id: 'wall_wooden_reinforced_01',
    name: 'Усиленная деревянная стена',
    nameEn: 'Reinforced Wooden Wall',
    description: 'Деревянная стена с железными накладками. Прочнее обычной.',
    
    type: 'wall_wooden',
    category: 'building',
    
    width: 1.0,
    height: 2.5,
    depth: 0.25,
    
    properties: {
      isPassable: false,
      isOpenable: false,
      isTransparent: false,
      isClimbable: false,
      providesCover: true,
    },
    
    initialState: 'closed',
    
    visual: {
      primaryColor: 0x6b4423,
      secondaryColor: 0x8b6914,
      borderColor: 0x4a3020,
      pattern: 'planks',
    },
    
    health: 1000,
    defense: 60,
    isDestructible: true,
    
    buildCost: [
      { material: 'wood', quantity: 15 },
      { material: 'iron_ore', quantity: 3 },
    ],
  },
  
  // ==================== ДВЕРИ ====================
  {
    id: 'door_wooden_01',
    name: 'Деревянная дверь',
    nameEn: 'Wooden Door',
    description: 'Обычная деревянная дверь. Можно открыть и закрыть.',
    
    type: 'door_wooden',
    category: 'building',
    
    width: 1.0,
    height: 2.2,
    depth: 0.1,
    
    properties: {
      isPassable: true,
      isOpenable: true,
      isTransparent: false,
      isClimbable: false,
      providesCover: true,
    },
    
    initialState: 'closed',
    
    visual: {
      primaryColor: 0xa0522d,
      secondaryColor: 0x5c4033,
      borderColor: 0x4a3728,
      pattern: 'planks',
    },
    
    health: 200,
    defense: 20,
    isDestructible: true,
    
    buildCost: [
      { material: 'wood', quantity: 8 },
    ],
  },
  
  {
    id: 'door_wooden_iron_01',
    name: 'Железная дверь',
    nameEn: 'Iron Door',
    description: 'Железная дверь. Прочная, можно запереть.',
    
    type: 'door_wooden',
    category: 'building',
    
    width: 1.0,
    height: 2.3,
    depth: 0.15,
    
    properties: {
      isPassable: true,
      isOpenable: true,
      isTransparent: false,
      isClimbable: false,
      providesCover: true,
    },
    
    initialState: 'closed',
    
    visual: {
      primaryColor: 0x4a4a4a,
      secondaryColor: 0x6b6b6b,
      borderColor: 0x3d3d3d,
      pattern: 'none',
    },
    
    health: 800,
    defense: 80,
    isDestructible: true,
    
    buildCost: [
      { material: 'wood', quantity: 5 },
      { material: 'iron_ore', quantity: 10 },
    ],
  },
  
  // ==================== ОКНА ====================
  {
    id: 'window_wooden_01',
    name: 'Окно со ставнями',
    nameEn: 'Window with Shutters',
    description: 'Деревянное окно со ставнями. Можно открыть для обзора.',
    
    type: 'window_wooden',
    category: 'building',
    
    width: 1.0,
    height: 1.0,
    depth: 0.1,
    
    properties: {
      isPassable: false,
      isOpenable: true,
      isTransparent: true,
      isClimbable: false,
      providesCover: false,
    },
    
    initialState: 'closed',
    
    visual: {
      primaryColor: 0x8b4513,
      secondaryColor: 0x87ceeb,  // Стекло
      borderColor: 0x5c4033,
      pattern: 'planks',
    },
    
    health: 100,
    defense: 10,
    isDestructible: true,
    
    buildCost: [
      { material: 'wood', quantity: 5 },
    ],
  },
  
  // ==================== ЗАБОРЫ ====================
  {
    id: 'fence_wooden_01',
    name: 'Деревянный забор',
    nameEn: 'Wooden Fence',
    description: 'Низкий деревянный забор. Просматривается, можно перелезть.',
    
    type: 'fence_wooden',
    category: 'building',
    
    width: 1.0,
    height: 1.2,
    depth: 0.1,
    
    properties: {
      isPassable: false,
      isOpenable: false,
      isTransparent: true,
      isClimbable: true,
      providesCover: false,
    },
    
    initialState: 'closed',
    
    visual: {
      primaryColor: 0xdeb887,
      secondaryColor: 0x8b4513,
      borderColor: 0x5c4033,
      pattern: 'planks',
    },
    
    health: 100,
    defense: 10,
    isDestructible: true,
    
    buildCost: [
      { material: 'wood', quantity: 4 },
    ],
  },
  
  // ==================== ВОРОТА ====================
  {
    id: 'gate_wooden_01',
    name: 'Деревянные ворота',
    nameEn: 'Wooden Gate',
    description: 'Широкие деревянные ворота. Для прохода групп людей.',
    
    type: 'gate_wooden',
    category: 'building',
    
    width: 3.0,
    height: 2.5,
    depth: 0.3,
    
    properties: {
      isPassable: true,
      isOpenable: true,
      isTransparent: false,
      isClimbable: false,
      providesCover: true,
    },
    
    initialState: 'open',
    
    visual: {
      primaryColor: 0x8b4513,
      secondaryColor: 0x5c4033,
      borderColor: 0x4a3728,
      pattern: 'planks',
    },
    
    health: 800,
    defense: 50,
    isDestructible: true,
    
    buildCost: [
      { material: 'wood', quantity: 25 },
    ],
  },
  
  // ==================== ПОЛ ====================
  {
    id: 'floor_wooden_01',
    name: 'Деревянный пол',
    nameEn: 'Wooden Floor',
    description: 'Деревянный настил. Не блокирует движение.',
    
    type: 'floor_wooden',
    category: 'building',
    
    width: 1.0,
    height: 0.1,
    depth: 1.0,
    
    properties: {
      isPassable: true,
      isOpenable: false,
      isTransparent: true,
      isClimbable: false,
      providesCover: false,
    },
    
    initialState: 'open',
    
    visual: {
      primaryColor: 0x8b7355,
      secondaryColor: 0x6b5344,
      borderColor: 0x5c4033,
      pattern: 'planks',
    },
    
    health: 200,
    defense: 0,
    isDestructible: true,
    
    buildCost: [
      { material: 'wood', quantity: 3 },
    ],
  },
  
  // ==================== КРЫША ====================
  {
    id: 'roof_thatch_01',
    name: 'Соломенная крыша',
    nameEn: 'Thatch Roof',
    description: 'Крыша из соломы. Защищает от погоды.',
    
    type: 'roof_thatch',
    category: 'building',
    
    width: 2.0,
    height: 0.3,
    depth: 2.0,
    
    properties: {
      isPassable: false,
      isOpenable: false,
      isTransparent: false,
      isClimbable: false,
      providesCover: true,
    },
    
    initialState: 'closed',
    
    visual: {
      primaryColor: 0xdaa520,
      secondaryColor: 0xb8860b,
      borderColor: 0x8b6914,
      pattern: 'thatch',
    },
    
    health: 150,
    defense: 10,
    isDestructible: true,
    
    buildCost: [
      { material: 'thatch', quantity: 10 },
    ],
  },
  
  // ==================== СТОЛБЫ ====================
  {
    id: 'pillar_wooden_01',
    name: 'Деревянный столб',
    nameEn: 'Wooden Pillar',
    description: 'Опорный столб из дерева. Не блокирует полностью.',
    
    type: 'pillar_wooden',
    category: 'building',
    
    width: 0.3,
    height: 3.0,
    depth: 0.3,
    
    properties: {
      isPassable: false,
      isOpenable: false,
      isTransparent: true,
      isClimbable: false,
      providesCover: true,
    },
    
    initialState: 'closed',
    
    visual: {
      primaryColor: 0x8b4513,
      secondaryColor: 0x5c4033,
      borderColor: 0x4a3728,
      pattern: 'logs',
    },
    
    health: 400,
    defense: 30,
    isDestructible: true,
    
    buildCost: [
      { material: 'wood', quantity: 5 },
    ],
  },
];

/**
 * Получить пресет строения по ID
 */
export function getBuildingPartPreset(id: string): BuildingPartPreset | undefined {
  return BUILDING_PART_PRESETS.find(preset => preset.id === id);
}

/**
 * Получить пресеты по типу
 */
export function getBuildingPartPresetsByType(type: BuildingPartPreset['type']): BuildingPartPreset[] {
  return BUILDING_PART_PRESETS.filter(preset => preset.type === type);
}

/**
 * Получить проходимые элементы
 */
export function getPassableBuildingParts(): BuildingPartPreset[] {
  return BUILDING_PART_PRESETS.filter(preset => preset.properties.isPassable);
}

/**
 * Получить открываемые элементы
 */
export function getOpenableBuildingParts(): BuildingPartPreset[] {
  return BUILDING_PART_PRESETS.filter(preset => preset.properties.isOpenable);
}

/**
 * Получить элементы, дающие укрытие
 */
export function getCoverBuildingParts(): BuildingPartPreset[] {
  return BUILDING_PART_PRESETS.filter(preset => preset.properties.providesCover);
}

/**
 * Весовые коэффициенты для случайной генерации
 */
export const BUILDING_SPAWN_WEIGHTS: Record<BuildingPartPreset['type'], number> = {
  wall_wooden: 40,
  door_wooden: 15,
  window_wooden: 15,
  fence_wooden: 15,
  gate_wooden: 5,
  floor_wooden: 0,   // Не генерируется случайно
  roof_thatch: 0,    // Не генерируется случайно
  pillar_wooden: 10,
};

/**
 * Базовый набор для простой постройки
 */
export const SIMPLE_BUILDING_KIT: string[] = [
  'wall_wooden_01',
  'wall_wooden_01',
  'wall_wooden_01',
  'wall_wooden_01',
  'door_wooden_01',
  'window_wooden_01',
  'floor_wooden_01',
  'roof_thatch_01',
];

/**
 * Усиленный набор для укреплённой постройки
 */
export const REINFORCED_BUILDING_KIT: string[] = [
  'wall_wooden_reinforced_01',
  'wall_wooden_reinforced_01',
  'wall_wooden_reinforced_01',
  'wall_wooden_reinforced_01',
  'door_wooden_iron_01',
  'window_wooden_01',
  'floor_wooden_01',
  'roof_thatch_01',
];
