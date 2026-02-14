/**
 * Пресеты навыков культивации (пассивные способности)
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
 */

import type { CultivationSkill } from "@/lib/game/cultivation-skills";

// ============================================
// ИНТЕРФЕЙС ПРЕСЕТА НАВЫКА
// ============================================

export interface SkillPreset extends CultivationSkill {
  // Категория для UI
  category?: "basic" | "advanced" | "master";
  
  // Стоимость изучения (очки вклада или духовные камни)
  learnCost?: {
    contributionPoints?: number;
    spiritStones?: number;
  };
  
  // Источник изучения
  learnSource?: ("sect" | "scroll" | "insight")[];
}

// ============================================
// БАЗОВЫЕ НАВЫКИ (доступны с 1-2 уровня)
// ============================================

export const BASIC_SKILLS: SkillPreset[] = [
  {
    id: "deep_meditation",
    name: "Deep Meditation",
    nameRu: "Глубокая медитация",
    description: "Погружение в состояние глубокого покоя, снижающее вероятность прерывания медитации.",
    maxLevel: 5,
    effects: {
      interruptionModifier: 0.8,  // -20% за уровень
      fatigueReliefBonus: 0.1,    // +10% к снятию усталости за уровень
    },
    prerequisites: {
      cultivationLevel: 1,
    },
    category: "basic",
    learnCost: {
      contributionPoints: 0,  // Бесплатно для учеников
    },
    learnSource: ["sect"],
  },
  {
    id: "qi_perception",
    name: "Qi Perception",
    nameRu: "Восприятие Ци",
    description: "Улучшенное чувствование потоков Ци, увеличивающее поглощение из окружения.",
    maxLevel: 5,
    effects: {
      qiAbsorptionBonus: 0.15,  // +15% за уровень
      dangerDetectionRange: 50, // +50м за уровень
    },
    prerequisites: {
      cultivationLevel: 2,
    },
    category: "basic",
    learnCost: {
      contributionPoints: 10,
    },
    learnSource: ["sect", "scroll"],
  },
  {
    id: "concentration",
    name: "Concentration",
    nameRu: "Концентрация",
    description: "Сосредоточенность разума, ускоряющая накопление Ци во время медитации.",
    maxLevel: 5,
    effects: {
      meditationSpeedBonus: 0.1,   // +10% за уровень
      interruptionModifier: 0.95, // -5% за уровень
    },
    prerequisites: {
      cultivationLevel: 2,
    },
    category: "basic",
    learnCost: {
      contributionPoints: 10,
    },
    learnSource: ["sect", "scroll"],
  },
];

// ============================================
// ПРОДВИНУТЫЕ НАВЫКИ (доступны с 3-5 уровня)
// ============================================

export const ADVANCED_SKILLS: SkillPreset[] = [
  {
    id: "danger_sense",
    name: "Danger Sense",
    nameRu: "Чутьё опасности",
    description: "Интуитивное ощущение приближающейся угрозы во время медитации.",
    maxLevel: 3,
    effects: {
      interruptionModifier: 0.85, // -15% за уровень
      dangerDetectionRange: 100,  // +100м за уровень
    },
    prerequisites: {
      cultivationLevel: 3,
      skills: ["qi_perception"],
    },
    category: "advanced",
    learnCost: {
      contributionPoints: 30,
      spiritStones: 5,
    },
    learnSource: ["sect", "scroll"],
  },
  {
    id: "spirit_shield",
    name: "Spirit Shield",
    nameRu: "Духовный щит",
    description: "Пассивная защита от духовных сущностей во время медитации.",
    maxLevel: 3,
    effects: {
      interruptionModifier: 0.7, // -30% за уровень (только для духов)
    },
    prerequisites: {
      cultivationLevel: 4,
      skills: ["deep_meditation"],
    },
    category: "advanced",
    learnCost: {
      contributionPoints: 50,
      spiritStones: 10,
    },
    learnSource: ["sect", "scroll"],
  },
  {
    id: "qi_circulation",
    name: "Qi Circulation",
    nameRu: "Циркуляция Ци",
    description: "Автоматическая циркуляция Ци по меридианам, ускоряющая восстановление.",
    maxLevel: 5,
    effects: {
      qiAbsorptionBonus: 0.1,
      fatigueReliefBonus: 0.05,
    },
    prerequisites: {
      cultivationLevel: 3,
      skills: ["qi_perception"],
    },
    category: "advanced",
    learnCost: {
      contributionPoints: 40,
    },
    learnSource: ["sect"],
  },
];

// ============================================
// МАСТЕРСКИЕ НАВЫКИ (доступны с 6+ уровня)
// ============================================

export const MASTER_SKILLS: SkillPreset[] = [
  {
    id: "mind_calm",
    name: "Mind Calm",
    nameRu: "Покой разума",
    description: "Полная ментальная устойчивость. Усталость накопления снижена вдвое.",
    maxLevel: 3,
    effects: {
      interruptionModifier: 0.6,
      fatigueReliefBonus: 0.2,
    },
    prerequisites: {
      cultivationLevel: 6,
      skills: ["deep_meditation", "concentration"],
    },
    category: "master",
    learnCost: {
      contributionPoints: 100,
      spiritStones: 50,
    },
    learnSource: ["sect", "insight"],
  },
  {
    id: "qi_mastery",
    name: "Qi Mastery",
    nameRu: "Мастерство Ци",
    description: "Глубокое понимание Ци. Значительно увеличивает эффективность всех техник.",
    maxLevel: 5,
    effects: {
      qiAbsorptionBonus: 0.25,
      meditationSpeedBonus: 0.15,
    },
    prerequisites: {
      cultivationLevel: 7,
      skills: ["qi_perception", "qi_circulation", "concentration"],
    },
    category: "master",
    learnCost: {
      contributionPoints: 200,
      spiritStones: 100,
    },
    learnSource: ["insight"],
  },
  {
    id: "void_perception",
    name: "Void Perception",
    nameRu: "Восприятие пустоты",
    description: "Способность чувствовать потоки пустоты. Доступ к техникам пустоты.",
    maxLevel: 3,
    effects: {
      dangerDetectionRange: 500,
      interruptionModifier: 0.5,
    },
    prerequisites: {
      cultivationLevel: 8,
      skills: ["qi_mastery", "danger_sense"],
    },
    category: "master",
    learnCost: {
      spiritStones: 500,
    },
    learnSource: ["insight"],
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
    if (skill.prerequisites?.cultivationLevel && 
        cultivationLevel < skill.prerequisites.cultivationLevel) {
      return false;
    }
    
    // Проверка требуемых навыков
    if (skill.prerequisites?.skills) {
      for (const requiredSkill of skill.prerequisites.skills) {
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
export function getSkillsBySource(source: "sect" | "scroll" | "insight"): SkillPreset[] {
  return ALL_SKILL_PRESETS.filter(skill => 
    skill.learnSource?.includes(source)
  );
}
