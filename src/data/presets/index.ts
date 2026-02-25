/**
 * Пресеты данных для игры
 * 
 * Этот модуль экспортирует все пресеты:
 * - Техники (активные способности)
 * - Навыки культивации (пассивные)
 * - Формации (объекты мира)
 * - Персонажи (стартовые наборы)
 */

import {
  getCharacterPresetById,
  type CharacterPreset,
} from "./character-presets";
import {
  getTechniquePresetById,
  getBasicTechniques,
  type TechniquePreset,
} from "./technique-presets";
import {
  getSkillPresetById,
  type SkillPreset,
} from "./skill-presets";

// ============================================
// ТЕХНИКИ
// ============================================

export {
  BASIC_TECHNIQUES,
  ADVANCED_TECHNIQUES,
  RARE_TECHNIQUES,
  ALL_TECHNIQUE_PRESETS,
  getTechniquePresetById,
  getTechniquePresetsByType,
  getTechniquePresetsByLevel,
  getTechniquePresetsByElement,
  getBasicTechniques,
  getAvailableTechniquePresets,
  type TechniquePreset,
} from "./technique-presets";

// ============================================
// НАВЫКИ КУЛЬТИВАЦИИ
// ============================================

export {
  BASIC_SKILLS,
  ADVANCED_SKILLS,
  MASTER_SKILLS,
  ALL_SKILL_PRESETS,
  getSkillPresetById,
  getBasicSkills,
  getAvailableSkillPresets,
  getSkillsBySource,
  type SkillPreset,
} from "./skill-presets";

// ============================================
// ФОРМАЦИИ
// ============================================

export {
  BASIC_FORMATIONS,
  ADVANCED_FORMATIONS,
  MASTER_FORMATIONS,
  ALL_FORMATION_PRESETS,
  getFormationPresetById,
  getBasicFormations,
  getAvailableFormationPresets,
  getFormationsByDifficulty,
  type FormationPreset,
} from "./formation-presets";

// ============================================
// ПЕРСОНАЖИ
// ============================================

export {
  CHARACTER_PRESETS,
  getCharacterPresetById,
  getCharacterPresetsByStartType,
  getDefaultSectPreset,
  getDefaultRandomPreset,
  getAllCharacterPresets,
  type CharacterPreset,
  type CharacterPresetStats,
  type CharacterPresetCultivation,
  type StartType,
} from "./character-presets";

// ============================================
// УТИЛИТЫ
// ============================================

/**
 * Получить все пресеты для нового персонажа
 */
export function getStarterPack(presetId: string): {
  preset: CharacterPreset | undefined;
  techniques: TechniquePreset[];
  skills: SkillPreset[];
} {
  const preset = getCharacterPresetById(presetId);
  if (!preset) {
    return {
      preset: undefined,
      techniques: getBasicTechniques(),
      skills: [],
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
  
  return { preset, techniques, skills };
}
