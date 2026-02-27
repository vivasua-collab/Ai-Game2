/**
 * Сервис для работы с данными персонажа (техники и навыки)
 */

import { db } from "@/lib/db";
import type { CharacterTechnique, CharacterSkill, Technique, CultivationSkillData } from "@/types/game";
import { BASIC_TECHNIQUES, ALL_TECHNIQUE_PRESETS } from "@/data/presets/technique-presets";
import { ALL_SKILL_PRESETS } from "@/data/presets/skill-presets";

// ============================================
// ТЕХНИКИ
// ============================================

/**
 * Получить техники персонажа (изученные)
 */
export async function getCharacterTechniques(characterId: string): Promise<CharacterTechnique[]> {
  const techniques = await db.characterTechnique.findMany({
    where: { characterId },
    include: {
      technique: true,
    },
  });

  return techniques.map((t) => ({
    id: t.id,
    techniqueId: t.techniqueId,
    technique: mapTechniqueFromDb(t.technique),
    mastery: t.mastery,
    quickSlot: t.quickSlot,
    learningProgress: t.learningProgress,
    learningSource: t.learningSource,
  }));
}

/**
 * Получить базовые техники для нового персонажа
 */
export function getBasicTechniquesForNewCharacter(): Technique[] {
  return BASIC_TECHNIQUES.map((preset) => ({
    id: preset.id,
    name: preset.name,
    description: preset.description,
    type: preset.type,
    element: preset.element,
    rarity: preset.rarity,
    level: preset.level,
    minLevel: preset.minLevel,
    maxLevel: preset.maxLevel,
    qiCost: preset.qiCost,
    fatigueCost: preset.fatigueCost,
    minCultivationLevel: preset.minCultivationLevel,
    effects: preset.effects,
  }));
}

/**
 * Изучить технику для персонажа
 */
export async function learnTechnique(
  characterId: string,
  techniqueId: string,
  source: string = "preset"
): Promise<CharacterTechnique | null> {
  // Проверяем, не изучена ли уже
  const existing = await db.characterTechnique.findFirst({
    where: { characterId, techniqueId },
  });

  if (existing) {
    return null; // Уже изучена
  }

  // Проверяем, существует ли техника
  const technique = await db.technique.findUnique({
    where: { id: techniqueId },
  });

  if (!technique) {
    // Пробуем найти в пресетах
    const preset = ALL_TECHNIQUE_PRESETS.find((p) => p.id === techniqueId);
    if (preset) {
      // Создаём технику из пресета
      const created = await db.technique.create({
        data: {
          name: preset.name,
          nameId: preset.id,
          description: preset.description,
          type: preset.type,
          element: preset.element,
          rarity: preset.rarity,
          level: preset.level,
          minLevel: preset.minLevel,
          maxLevel: preset.maxLevel,
          canEvolve: preset.maxLevel > preset.minLevel,
          minCultivationLevel: preset.minCultivationLevel,
          qiCost: preset.qiCost,
          physicalFatigueCost: preset.fatigueCost.physical,
          mentalFatigueCost: preset.fatigueCost.mental,
          statRequirements: preset.statRequirements ? JSON.stringify(preset.statRequirements) : null,
          statScaling: preset.statScaling ? JSON.stringify(preset.statScaling) : null,
          effects: preset.effects ? JSON.stringify(preset.effects) : null,
          source: "preset",
        },
      });

      // Создаём связь с персонажем
      const learned = await db.characterTechnique.create({
        data: {
          characterId,
          techniqueId: created.id,
          mastery: 0,
          learningProgress: 100,
          learningSource: source,
        },
        include: { technique: true },
      });

      return {
        id: learned.id,
        techniqueId: learned.techniqueId,
        technique: mapTechniqueFromDb(learned.technique),
        mastery: learned.mastery,
        quickSlot: learned.quickSlot,
        learningProgress: learned.learningProgress,
        learningSource: learned.learningSource,
      };
    }
    return null;
  }

  // Создаём связь с персонажем
  const learned = await db.characterTechnique.create({
    data: {
      characterId,
      techniqueId: technique.id,
      mastery: 0,
      learningProgress: 100,
      learningSource: source,
    },
    include: { technique: true },
  });

  return {
    id: learned.id,
    techniqueId: learned.techniqueId,
    technique: mapTechniqueFromDb(learned.technique),
    mastery: learned.mastery,
    quickSlot: learned.quickSlot,
    learningProgress: learned.learningProgress,
    learningSource: learned.learningSource,
  };
}

/**
 * Дать базовые техники новому персонажу
 */
export async function giveBasicTechniques(characterId: string): Promise<CharacterTechnique[]> {
  const results: CharacterTechnique[] = [];

  for (const preset of BASIC_TECHNIQUES) {
    const learned = await learnTechnique(characterId, preset.id, "preset");
    if (learned) {
      results.push(learned);
    }
  }

  return results;
}

// ============================================
// НАВЫКИ КУЛЬТИВАЦИИ
// ============================================

/**
 * Получить навыки персонажа
 */
export async function getCharacterSkills(characterId: string): Promise<CharacterSkill[]> {
  const character = await db.character.findUnique({
    where: { id: characterId },
    select: { cultivationSkills: true },
  });

  if (!character) {
    return [];
  }

  const skillsData = JSON.parse(character.cultivationSkills || "{}");

  return Object.entries(skillsData).map(([skillId, level]) => {
    const preset = ALL_SKILL_PRESETS.find((p) => p.id === skillId);
    return {
      skillId,
      level: level as number,
      skill: preset
        ? {
            id: preset.id,
            name: preset.name,
            nameRu: preset.nameRu,
            description: preset.description,
            maxLevel: preset.maxLevel,
            effects: preset.effects,
            prerequisites: preset.prerequisites,
          }
        : undefined,
    };
  });
}

/**
 * Обновить уровень навыка
 */
export async function updateSkillLevel(
  characterId: string,
  skillId: string,
  level: number
): Promise<boolean> {
  const character = await db.character.findUnique({
    where: { id: characterId },
    select: { cultivationSkills: true },
  });

  if (!character) return false;

  const skillsData = JSON.parse(character.cultivationSkills || "{}");
  skillsData[skillId] = level;

  await db.character.update({
    where: { id: characterId },
    data: { cultivationSkills: JSON.stringify(skillsData) },
  });

  return true;
}

/**
 * Дать базовые навыки новому персонажу
 */
export async function giveBasicSkills(characterId: string): Promise<void> {
  const basicSkills = {
    deep_meditation: 1,
    qi_perception: 1,
  };

  await db.character.update({
    where: { id: characterId },
    data: { cultivationSkills: JSON.stringify(basicSkills) },
  });
}

// ============================================
// ВСЁ ВМЕСТЕ
// ============================================

/**
 * Получить все данные персонажа (инвентарь, техники, навыки)
 */
export async function getCharacterFullData(characterId: string): Promise<{
  techniques: CharacterTechnique[];
  skills: CharacterSkill[];
}> {
  const [techniques, skills] = await Promise.all([
    getCharacterTechniques(characterId),
    getCharacterSkills(characterId),
  ]);

  return { techniques, skills };
}

// ============================================
// ХЕЛПЕРЫ
// ============================================

function mapTechniqueFromDb(t: {
  id: string;
  name: string;
  description: string;
  type: string;
  subtype?: string | null;
  element: string;
  rarity: string;
  level: number;
  minLevel: number;
  maxLevel: number;
  qiCost: number;
  physicalFatigueCost: number;
  mentalFatigueCost: number;
  minCultivationLevel: number;
  statRequirements?: string | null;
  statScaling?: string | null;
  effects?: string | null;
  computedValues?: string | null;
  modifiers?: string | null;
  weaponType?: string | null;
  isRangedQi?: boolean;
}): Technique {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    type: t.type as Technique["type"],
    subtype: t.subtype as Technique["subtype"],
    element: t.element as Technique["element"],
    rarity: t.rarity as Technique["rarity"],
    level: t.level,
    minLevel: t.minLevel,
    maxLevel: t.maxLevel,
    qiCost: t.qiCost,
    fatigueCost: {
      physical: t.physicalFatigueCost,
      mental: t.mentalFatigueCost,
    },
    minCultivationLevel: t.minCultivationLevel,
    statRequirements: t.statRequirements ? JSON.parse(t.statRequirements) : undefined,
    statScaling: t.statScaling ? JSON.parse(t.statScaling) : undefined,
    computed: t.computedValues ? JSON.parse(t.computedValues) : undefined,
    modifiers: t.modifiers ? JSON.parse(t.modifiers) : undefined,
    weaponType: t.weaponType ?? undefined,
    isRangedQi: t.isRangedQi ?? undefined,
    effects: t.effects ? JSON.parse(t.effects) : undefined,
  };
}
