/**
 * ============================================================================
 * ПРЕСЕТЫ НАВЫКОВ КУЛЬТИВАЦИИ (Единый формат)
 * ============================================================================
 * 
 * Навыки культивации - это пассивные способности, улучшающие практику:
 * - Глубокая медитация: снижает шанс прерывания
 * - Восприятие Ци: увеличивает поглощение
 * - Концентрация: ускоряет накопление
 * - Духовный щит: защита от духовных сущностей
 * - Чутьё опасности: обнаружение угроз
 * 
 * Особенности:
 * - Каждый навык имеет уровень (1-maxLevel)
 * - Навыки требуют определённый уровень культивации
 * - Некоторые навыки требуют изучение предыдущих
 * 
 * ============================================================================
 */

import type { BasePreset, PresetCategory, PresetRarity, PresetSource } from "./base-preset";

// ============================================
// ТИПЫ НАВЫКОВ
// ============================================

/**
 * Эффекты навыка (множители)
 */
export interface SkillEffects {
  interruptionModifier?: number;    // Множитель прерывания (< 1 = лучше)
  qiAbsorptionBonus?: number;       // Бонус к поглощению Ци
  meditationSpeedBonus?: number;    // Бонус к скорости медитации
  fatigueReliefBonus?: number;      // Бонус к снятию усталости
  dangerDetectionRange?: number;    // Дальность обнаружения опасности (м)
}

/**
 * Пресет навыка (Единый формат)
 */
export interface SkillPreset extends BasePreset {
  // === УРОВЕНЬ НАВЫКА ===
  maxLevel: number;        // Максимальный уровень навыка
  
  // === ЭФФЕКТЫ ===
  skillEffects: SkillEffects;
  
  // === ИСТОЧНИКИ ИЗУЧЕНИЯ ===
  learnSources?: PresetSource[];
}

// ============================================
// БАЗОВЫЕ НАВЫКИ
// ============================================

export const BASIC_SKILLS: SkillPreset[] = [
  {
    id: "deep_meditation",
    name: "Глубокая медитация",
    nameEn: "Deep Meditation",
    description: "Погружение в состояние глубокого покоя, снижающее вероятность прерывания медитации.",
    category: "basic",
    rarity: "common",
    maxLevel: 5,
    skillEffects: {
      interruptionModifier: 0.8,  // -20% за уровень
      fatigueReliefBonus: 0.1,    // +10% к снятию усталости за уровень
    },
    requirements: {
      cultivationLevel: 1,
    },
    sources: ["sect"],
    cost: {
      contributionPoints: 0, // Бесплатно для учеников
    },
    learnSources: ["sect"],
    icon: "🧘",
  },
  {
    id: "qi_perception",
    name: "Восприятие Ци",
    nameEn: "Qi Perception",
    description: "Улучшенное чувствование потоков Ци, увеличивающее поглощение из окружения.",
    category: "basic",
    rarity: "common",
    maxLevel: 5,
    skillEffects: {
      qiAbsorptionBonus: 0.15,   // +15% за уровень
      dangerDetectionRange: 50,  // +50м за уровень
    },
    requirements: {
      cultivationLevel: 2,
    },
    sources: ["sect", "scroll"],
    cost: {
      contributionPoints: 10,
    },
    learnSources: ["sect", "scroll"],
    icon: "👁️",
  },
  {
    id: "concentration",
    name: "Концентрация",
    nameEn: "Concentration",
    description: "Сосредоточенность разума, ускоряющая накопление Ци во время медитации.",
    category: "basic",
    rarity: "common",
    maxLevel: 5,
    skillEffects: {
      meditationSpeedBonus: 0.1,   // +10% за уровень
      interruptionModifier: 0.95,  // -5% за уровень
    },
    requirements: {
      cultivationLevel: 2,
    },
    sources: ["sect", "scroll"],
    cost: {
      contributionPoints: 10,
    },
    learnSources: ["sect", "scroll"],
    icon: "🎯",
  },
];

// ============================================
// ПРОДВИНУТЫЕ НАВЫКИ
// ============================================

export const ADVANCED_SKILLS: SkillPreset[] = [
  {
    id: "danger_sense",
    name: "Чутьё опасности",
    nameEn: "Danger Sense",
    description: "Интуитивное ощущение приближающейся угрозы во время медитации.",
    category: "advanced",
    rarity: "uncommon",
    maxLevel: 3,
    skillEffects: {
      interruptionModifier: 0.85, // -15% за уровень
      dangerDetectionRange: 100,  // +100м за уровень
    },
    requirements: {
      cultivationLevel: 3,
      skills: ["qi_perception"],
    },
    sources: ["sect", "scroll"],
    cost: {
      contributionPoints: 30,
      spiritStones: 5,
    },
    learnSources: ["sect", "scroll"],
    icon: "⚠️",
  },
  {
    id: "spirit_shield",
    name: "Духовный щит",
    nameEn: "Spirit Shield",
    description: "Пассивная защита от духовных сущностей во время медитации.",
    category: "advanced",
    rarity: "uncommon",
    maxLevel: 3,
    skillEffects: {
      interruptionModifier: 0.7, // -30% за уровень (только для духов)
    },
    requirements: {
      cultivationLevel: 4,
      skills: ["deep_meditation"],
    },
    sources: ["sect", "scroll"],
    cost: {
      contributionPoints: 50,
      spiritStones: 10,
    },
    learnSources: ["sect", "scroll"],
    icon: "🛡️",
  },
  {
    id: "qi_circulation",
    name: "Циркуляция Ци",
    nameEn: "Qi Circulation",
    description: "Автоматическая циркуляция Ци по меридианам, ускоряющая восстановление.",
    category: "advanced",
    rarity: "uncommon",
    maxLevel: 5,
    skillEffects: {
      qiAbsorptionBonus: 0.1,
      fatigueReliefBonus: 0.05,
    },
    requirements: {
      cultivationLevel: 3,
      skills: ["qi_perception"],
    },
    sources: ["sect"],
    cost: {
      contributionPoints: 40,
    },
    learnSources: ["sect"],
    icon: "🔄",
  },
];

// ============================================
// МАСТЕРСКИЕ НАВЫКИ
// ============================================

export const MASTER_SKILLS: SkillPreset[] = [
  {
    id: "mind_calm",
    name: "Покой разума",
    nameEn: "Mind Calm",
    description: "Полная ментальная устойчивость. Усталость накопления снижена вдвое.",
    category: "master",
    rarity: "rare",
    maxLevel: 3,
    skillEffects: {
      interruptionModifier: 0.6,
      fatigueReliefBonus: 0.2,
    },
    requirements: {
      cultivationLevel: 6,
      skills: ["deep_meditation", "concentration"],
    },
    sources: ["sect", "insight"],
    cost: {
      contributionPoints: 100,
      spiritStones: 50,
    },
    learnSources: ["sect", "insight"],
    icon: "😌",
  },
  {
    id: "qi_mastery",
    name: "Мастерство Ци",
    nameEn: "Qi Mastery",
    description: "Глубокое понимание Ци. Значительно увеличивает эффективность всех техник.",
    category: "master",
    rarity: "rare",
    maxLevel: 5,
    skillEffects: {
      qiAbsorptionBonus: 0.25,
      meditationSpeedBonus: 0.15,
    },
    requirements: {
      cultivationLevel: 7,
      skills: ["qi_perception", "qi_circulation", "concentration"],
    },
    sources: ["insight"],
    cost: {
      contributionPoints: 200,
      spiritStones: 100,
    },
    learnSources: ["insight"],
    icon: "🌟",
  },
  {
    id: "void_perception",
    name: "Восприятие пустоты",
    nameEn: "Void Perception",
    description: "Способность чувствовать потоки пустоты. Доступ к техникам пустоты.",
    category: "master",
    rarity: "legendary",
    maxLevel: 3,
    skillEffects: {
      dangerDetectionRange: 500,
      interruptionModifier: 0.5,
    },
    requirements: {
      cultivationLevel: 8,
      skills: ["qi_mastery", "danger_sense"],
    },
    sources: ["insight"],
    cost: {
      spiritStones: 500,
    },
    learnSources: ["insight"],
    icon: "🌀",
  },
];

// ============================================
// ЭКСПОРТ ВСЕХ НАВЫКОВ
// ============================================

export const ALL_SKILL_PRESETS: SkillPreset[] = [
  ...BASIC_SKILLS,
  ...ADVANCED_SKILLS,
  ...MASTER_SKILLS,
];

// ============================================
// ФУНКЦИИ ПОИСКА
// ============================================

/**
 * Получить навык по ID
 */
export function getSkillPresetById(id: string): SkillPreset | undefined {
  return ALL_SKILL_PRESETS.find(s => s.id === id);
}

/**
 * Получить базовые навыки (для стартовых персонажей)
 */
export function getBasicSkills(): SkillPreset[] {
  return BASIC_SKILLS;
}

/**
 * Получить навыки, доступные для уровня культивации
 */
export function getAvailableSkillPresets(
  cultivationLevel: number,
  learnedSkills: Record<string, number> = {}
): SkillPreset[] {
  return ALL_SKILL_PRESETS.filter(skill => {
    // Уже изучен на максимальном уровне
    if (learnedSkills[skill.id] === skill.maxLevel) {
      return false;
    }
    
    // Проверка уровня культивации
    if (skill.requirements?.cultivationLevel && 
        cultivationLevel < skill.requirements.cultivationLevel) {
      return false;
    }
    
    // Проверка требуемых навыков
    if (skill.requirements?.skills) {
      for (const requiredSkill of skill.requirements.skills) {
        if (!learnedSkills[requiredSkill]) {
          return false;
        }
      }
    }
    
    return true;
  });
}

/**
 * Получить навыки по источнику изучения
 */
export function getSkillsBySource(source: PresetSource): SkillPreset[] {
  return ALL_SKILL_PRESETS.filter(skill => 
    skill.learnSources?.includes(source)
  );
}

/**
 * Получить эффект навыка на определённом уровне
 */
export function getSkillEffectAtLevel(
  skillId: string,
  level: number
): SkillEffects | null {
  const skill = getSkillPresetById(skillId);
  if (!skill || level < 1 || level > skill.maxLevel) return null;
  
  const result: SkillEffects = {};
  
  if (skill.skillEffects.interruptionModifier) {
    result.interruptionModifier = 1 - (1 - skill.skillEffects.interruptionModifier) * level;
  }
  if (skill.skillEffects.qiAbsorptionBonus) {
    result.qiAbsorptionBonus = skill.skillEffects.qiAbsorptionBonus * level;
  }
  if (skill.skillEffects.meditationSpeedBonus) {
    result.meditationSpeedBonus = skill.skillEffects.meditationSpeedBonus * level;
  }
  if (skill.skillEffects.fatigueReliefBonus) {
    result.fatigueReliefBonus = skill.skillEffects.fatigueReliefBonus * level;
  }
  if (skill.skillEffects.dangerDetectionRange) {
    result.dangerDetectionRange = skill.skillEffects.dangerDetectionRange * level;
  }
  
  return result;
}

/**
 * Рассчитать множитель прерывания от навыков персонажа
 */
export function calculateSkillsInterruptionModifier(
  learnedSkills: Record<string, number>
): number {
  let modifier = 1.0;
  
  for (const [skillId, level] of Object.entries(learnedSkills)) {
    const effects = getSkillEffectAtLevel(skillId, level);
    if (effects?.interruptionModifier) {
      modifier *= effects.interruptionModifier;
    }
  }
  
  return modifier;
}
