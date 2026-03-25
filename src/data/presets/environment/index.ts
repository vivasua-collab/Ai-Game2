/**
 * ============================================================================
 * ОКРУЖЕНИЕ - Environment Presets Index
 * ============================================================================
 * 
 * Единый экспорт всех пресетов окружения.
 */

// Типы
export type {
  EnvironmentCategory,
  EnvironmentRarity,
  CollisionShape,
  ObstacleType,
  ObstaclePreset,
  TreeType,
  TreePreset,
  OreType,
  OrePreset,
  WoodenBuildingType,
  BuildingPartPreset,
  EnvironmentObjectState,
  EnvironmentGenerationConfig,
  GeneratedEnvironment,
} from '@/types/environment';

export {
  isEnvironmentId,
  generateEnvironmentId,
} from '@/types/environment';

// Пресеты камней
export {
  ROCK_PRESETS,
  getRockPreset,
  getRockPresetsByType,
  getDestructibleRocks,
  getRockPresetsByRarity,
  ROCK_SPAWN_WEIGHTS,
  selectRandomRockPreset,
} from './rock-presets';

// Пресеты деревьев
export {
  TREE_PRESETS,
  getTreePreset,
  getTreePresetsByType,
  getSpiritualTrees,
  getTreesWithCover,
  TREE_SPAWN_WEIGHTS,
  selectRandomTreePreset,
  TREES_BY_BIOME,
} from './tree-presets';

// Пресеты руд
export {
  ORE_PRESETS,
  getOrePreset,
  getOrePresetsByType,
  getOreByRequiredLevel,
  getGlowingOres,
  ORE_SPAWN_WEIGHTS,
  selectRandomOrePreset,
  ORE_BY_DEPTH,
} from './ore-presets';

// Пресеты строений
export {
  BUILDING_PART_PRESETS,
  getBuildingPartPreset,
  getBuildingPartPresetsByType,
  getPassableBuildingParts,
  getOpenableBuildingParts,
  getCoverBuildingParts,
  BUILDING_SPAWN_WEIGHTS,
  SIMPLE_BUILDING_KIT,
  REINFORCED_BUILDING_KIT,
} from './building-presets';

// ==================== УТИЛИТЫ ====================

import { ROCK_PRESETS } from './rock-presets';
import { TREE_PRESETS } from './tree-presets';
import { ORE_PRESETS } from './ore-presets';
import { BUILDING_PART_PRESETS } from './building-presets';

import type { 
  ObstaclePreset, 
  TreePreset, 
  OrePreset, 
  BuildingPartPreset 
} from '@/types/environment';

/**
 * Все пресеты окружения в одном массиве
 */
export const ALL_ENVIRONMENT_PRESETS = {
  obstacles: ROCK_PRESETS,
  trees: TREE_PRESETS,
  ores: ORE_PRESETS,
  buildings: BUILDING_PART_PRESETS,
};

/**
 * Получить пресет по ID (поиск по всем типам)
 */
export function getEnvironmentPresetById(id: string): 
  | ObstaclePreset 
  | TreePreset 
  | OrePreset 
  | BuildingPartPreset 
  | undefined {
  return (
    ROCK_PRESETS.find(p => p.id === id) ||
    TREE_PRESETS.find(p => p.id === id) ||
    ORE_PRESETS.find(p => p.id === id) ||
    BUILDING_PART_PRESETS.find(p => p.id === id)
  );
}

/**
 * Получить пресеты по категории
 */
export function getEnvironmentPresetsByCategory(category: string): (
  | ObstaclePreset 
  | TreePreset 
  | OrePreset 
  | BuildingPartPreset
)[] {
  const result: (
    | ObstaclePreset 
    | TreePreset 
    | OrePreset 
    | BuildingPartPreset
  )[] = [];
  
  if (category === 'obstacle') {
    result.push(...ROCK_PRESETS);
  }
  if (category === 'resource') {
    result.push(
      ...TREE_PRESETS.filter(t => t.category === 'resource'),
      ...ORE_PRESETS.filter(o => o.category === 'resource')
    );
  }
  if (category === 'building') {
    result.push(...BUILDING_PART_PRESETS);
  }
  
  return result;
}

/**
 * Количество пресетов
 */
export const ENVIRONMENT_PRESETS_COUNT = {
  obstacles: ROCK_PRESETS.length,
  trees: TREE_PRESETS.length,
  ores: ORE_PRESETS.length,
  buildings: BUILDING_PART_PRESETS.length,
  total: ROCK_PRESETS.length + TREE_PRESETS.length + ORE_PRESETS.length + BUILDING_PART_PRESETS.length,
};
