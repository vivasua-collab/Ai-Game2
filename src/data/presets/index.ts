/**
 * ============================================================================
 * ПРЕСЕТЫ ДАННЫХ ДЛЯ ИГРЫ (Единый формат)
 * ============================================================================
 * 
 * Этот модуль экспортирует все пресеты в унифицированном формате:
 * 
 * - Техники (активные способности)
 * - Навыки культивации (пассивные)
 * - Формации (объекты мира)
 * - Предметы (инвентарь)
 * - Персонажи (стартовые наборы)
 * 
 * Все пресеты следуют единому формату BasePreset с общими полями:
 * - id, name, nameEn, description
 * - category, rarity
 * - requirements, cost, sources
 * 
 * ============================================================================
 */

// ============================================
// БАЗОВЫЙ ИНТЕРФЕЙС
// ============================================

export {
  // Типы
  type PresetCategory,
  type PresetRarity,
  type PresetElement,
  type PresetSource,
  type PresetType,
  type BasePreset,
  type PresetRequirements,
  type PresetCost,
  type PresetTypeInfo,
  
  // Константы
  PRESET_CATEGORIES,
  PRESET_RARITIES,
  PRESET_ELEMENTS,
  
  // Функции
  getCategoryInfo,
  getRarityInfo,
  getElementInfo,
  isPresetAvailable,
  filterByCategory,
  filterByRarity,
  filterByCultivationLevel,
  getPresetById,
  sortByCategory,
  sortByRarity,
} from "./base-preset";

// ============================================
// ТЕХНИКИ
// ============================================

export {
  // Типы
  type TechniqueType,
  type TechniqueScaling,
  type TechniqueEffects,
  type TechniqueFatigueCost,
  type TechniquePreset,
  
  // Константы
  BASIC_TECHNIQUES,
  ADVANCED_TECHNIQUES,
  MASTER_TECHNIQUES,
  LEGENDARY_TECHNIQUES,
  ALL_TECHNIQUE_PRESETS,
  
  // Функции
  getTechniquePresetById,
  getTechniquePresetsByType,
  getTechniquePresetsByElement,
  getTechniquePresetsByLevel,
  getTechniquePresetsByCategory,
  getBasicTechniques,
  getAvailableTechniquePresets,
  getTeleportationTechniques,
  calculateTeleportDistance,
} from "./technique-presets";

// ============================================
// НАВЫКИ КУЛЬТИВАЦИИ
// ============================================

export {
  // Типы
  type SkillEffects,
  type SkillPreset,
  
  // Константы
  BASIC_SKILLS,
  ADVANCED_SKILLS,
  MASTER_SKILLS,
  ALL_SKILL_PRESETS,
  
  // Функции
  getSkillPresetById,
  getBasicSkills,
  getAvailableSkillPresets,
  getSkillsBySource,
  getSkillEffectAtLevel,
  calculateSkillsInterruptionModifier,
} from "./skill-presets";

// ============================================
// ФОРМАЦИИ
// ============================================

export {
  // Типы
  type FormationType,
  type FormationEffects,
  type FormationPreset,
  
  // Константы
  BASIC_FORMATIONS,
  ADVANCED_FORMATIONS,
  MASTER_FORMATIONS,
  ALL_FORMATION_PRESETS,
  
  // Функции
  getFormationPresetById,
  getBasicFormations,
  getAvailableFormationPresets,
  getFormationsByDifficulty,
  getFormationPresetsByType,
  getFormationEffects,
  calculateFormationInterruptionModifier,
} from "./formation-presets";

// ============================================
// ПРЕДМЕТЫ
// ============================================

export {
  // Типы
  type ItemType,
  type ItemUseAction,
  type ItemEffects,
  type ItemPreset,
  
  // Константы
  CONSUMABLE_ITEMS,
  SPIRIT_STONES,
  MATERIALS,
  ALL_ITEM_PRESETS,
  
  // Функции
  getItemPresetById,
  getItemPresetsByType,
  getConsumableItems,
  getSpiritStones,
  getMaterials,
  getBuyableItems,
  getItemPresetsByRarity,
} from "./item-presets";

// ============================================
// ПЕРСОНАЖИ
// ============================================

export {
  // Типы
  type StartType,
  type CharacterStats,
  type CharacterCultivation,
  type CharacterResources,
  type SuggestedLocation,
  type CharacterPreset,
  
  // Константы
  CHARACTER_PRESETS,
  
  // Функции
  getCharacterPresetById,
  getCharacterPresetsByStartType,
  getDefaultSectPreset,
  getDefaultRandomPreset,
  getAllCharacterPresets,
} from "./character-presets";

// ============================================
// УТИЛИТЫ
// ============================================

import { getTechniquePresetById, ALL_TECHNIQUE_PRESETS, type TechniquePreset } from "./technique-presets";
import { getSkillPresetById, ALL_SKILL_PRESETS, type SkillPreset } from "./skill-presets";
import { getCharacterPresetById, CHARACTER_PRESETS, type CharacterPreset } from "./character-presets";
import { getItemPresetById, ALL_ITEM_PRESETS, type ItemPreset } from "./item-presets";
import { getFormationPresetById, ALL_FORMATION_PRESETS, type FormationPreset } from "./formation-presets";
import type { BasePreset } from "./base-preset";

/**
 * Получить все пресеты в одном массиве
 */
export function getAllPresets(): BasePreset[] {
  return [
    ...ALL_TECHNIQUE_PRESETS,
    ...ALL_SKILL_PRESETS,
    ...ALL_FORMATION_PRESETS,
    ...ALL_ITEM_PRESETS,
    ...CHARACTER_PRESETS,
  ];
}

/**
 * Получить стартовый набор для нового персонажа
 */
export function getStarterPack(presetId: string): {
  preset: CharacterPreset | undefined;
  techniques: TechniquePreset[];
  skills: SkillPreset[];
  items: ItemPreset[];
} {
  const preset = getCharacterPresetById(presetId);
  
  if (!preset) {
    return {
      preset: undefined,
      techniques: getTechniquePresetById("breath_of_qi") 
        ? [getTechniquePresetById("breath_of_qi") as TechniquePreset] 
        : [],
      skills: [],
      items: [],
    };
  }
  
  // Собираем техники
  const techniques = [
    ...preset.baseTechniques.map((id) => getTechniquePresetById(id)).filter(Boolean) as TechniquePreset[],
    ...(preset.bonusTechniques || []).map((id) => getTechniquePresetById(id)).filter(Boolean) as TechniquePreset[],
  ];
  
  // Собираем навыки
  const skills = Object.keys(preset.skills)
    .map(id => getSkillPresetById(id))
    .filter(Boolean) as SkillPreset[];
  
  // Собираем предметы из ресурсов
  const items: ItemPreset[] = [];
  if (preset.resources?.items) {
    for (const itemName of preset.resources.items) {
      const item = getItemPresetById(itemName);
      if (item) items.push(item);
    }
  }
  
  return { preset, techniques, skills, items };
}

/**
 * Поиск пресета по ID (универсальный)
 */
export function findPresetById(id: string): BasePreset | undefined {
  return (
    getTechniquePresetById(id) ||
    getSkillPresetById(id) ||
    getFormationPresetById(id) ||
    getItemPresetById(id) ||
    getCharacterPresetById(id)
  );
}
