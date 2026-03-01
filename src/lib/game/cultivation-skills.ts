/**
 * Система пассивных навыков культивации
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

// ============================================
// ИНТЕРФЕЙСЫ НАВЫКОВ
// ============================================

export interface CultivationSkill {
  id: string;
  name: string;
  nameRu: string;
  description: string;
  maxLevel: number;
  effects: {
    interruptionModifier?: number;    // Множитель шанса прерывания (0.8 = -20%)
    qiAbsorptionBonus?: number;       // Бонус к поглощению Ци (%)
    meditationSpeedBonus?: number;    // Бонус к скорости медитации (%)
    fatigueReliefBonus?: number;      // Бонус к снятию усталости (%)
    dangerDetectionRange?: number;    // Дальность обнаружения опасности
  };
  prerequisites?: {
    cultivationLevel?: number;
    skills?: string[];
  };
}

// ============================================
// СПИСОК НАВЫКОВ КУЛЬТИВАЦИИ
// ============================================

export const CULTIVATION_SKILLS: CultivationSkill[] = [
  {
    id: "deep_meditation",
    name: "Deep Meditation",
    nameRu: "Глубокая медитация",
    description: "Погружение в состояние глубокого покоя, снижающее вероятность прерывания.",
    maxLevel: 5,
    effects: {
      interruptionModifier: 0.8, // -20% за уровень
      fatigueReliefBonus: 0.1,   // +10% к снятию усталости за уровень
    },
    prerequisites: {
      cultivationLevel: 1,
    },
  },
  {
    id: "qi_perception",
    name: "Qi Perception",
    nameRu: "Восприятие Ци",
    description: "Улучшенное чувствование потоков Ци, увеличивающее поглощение.",
    maxLevel: 5,
    effects: {
      qiAbsorptionBonus: 0.15, // +15% за уровень
      dangerDetectionRange: 50, // +50м за уровень
    },
    prerequisites: {
      cultivationLevel: 2,
    },
  },
  {
    id: "concentration",
    name: "Concentration",
    nameRu: "Концентрация",
    description: "Сосредоточенность разума, ускоряющая накопление Ци.",
    maxLevel: 5,
    effects: {
      meditationSpeedBonus: 0.1, // +10% за уровень
      interruptionModifier: 0.95, // -5% за уровень
    },
    prerequisites: {
      cultivationLevel: 2,
    },
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
  },
  {
    id: "danger_sense",
    name: "Danger Sense",
    nameRu: "Чутьё опасности",
    description: "Интуитивное ощущение приближающейся угрозы.",
    maxLevel: 3,
    effects: {
      interruptionModifier: 0.85, // -15% за уровень
      dangerDetectionRange: 100, // +100м за уровень
    },
    prerequisites: {
      cultivationLevel: 3,
      skills: ["qi_perception"],
    },
  },
];

// ============================================
// ФУНКЦИИ РАСЧЁТА НАВЫКОВ
// ============================================

/**
 * Получение эффекта навыка на определённом уровне
 */
export function getSkillEffect(
  skillId: string,
  level: number
): CultivationSkill["effects"] | null {
  const skill = CULTIVATION_SKILLS.find(s => s.id === skillId);
  if (!skill || level < 1 || level > skill.maxLevel) return null;
  
  // Возвращаем эффекты, умноженные на уровень
  const result: CultivationSkill["effects"] = {};
  
  for (const [key, value] of Object.entries(skill.effects)) {
    if (typeof value === "number") {
      // Для interruptionModifier - умножаем эффект на уровень
      if (key === "interruptionModifier") {
        result[key] = 1 - (1 - value) * level;
      } else {
        result[key] = value * level;
      }
    }
  }
  
  return result;
}

/**
 * Расчёт множителя прерывания от всех навыков персонажа
 */
export function calculateSkillsInterruptionModifier(
  characterSkills: Record<string, number>
): number {
  let totalModifier = 1.0;
  
  for (const [skillId, level] of Object.entries(characterSkills)) {
    const effect = getSkillEffect(skillId, level);
    if (effect?.interruptionModifier) {
      totalModifier *= effect.interruptionModifier;
    }
  }
  
  return totalModifier;
}

/**
 * Получение информации о навыке
 */
export function getSkillById(skillId: string): CultivationSkill | undefined {
  return CULTIVATION_SKILLS.find(s => s.id === skillId);
}

/**
 * Проверка доступности навыка для изучения
 */
export function canLearnSkill(
  skillId: string,
  cultivationLevel: number,
  learnedSkills: Record<string, number>
): { canLearn: boolean; reason?: string } {
  const skill = getSkillById(skillId);
  if (!skill) {
    return { canLearn: false, reason: "Навык не найден" };
  }
  
  // Проверка уровня культивации
  if (skill.prerequisites?.cultivationLevel && 
      cultivationLevel < skill.prerequisites.cultivationLevel) {
    return { 
      canLearn: false, 
      reason: `Требуется уровень культивации ${skill.prerequisites.cultivationLevel}` 
    };
  }
  
  // Проверка требуемых навыков
  if (skill.prerequisites?.skills) {
    for (const requiredSkill of skill.prerequisites.skills) {
      if (!learnedSkills[requiredSkill]) {
        const requiredSkillInfo = getSkillById(requiredSkill);
        return { 
          canLearn: false, 
          reason: `Требуется навык: ${requiredSkillInfo?.nameRu || requiredSkill}` 
        };
      }
    }
  }
  
  return { canLearn: true };
}

/**
 * Получение списка доступных для изучения навыков
 */
export function getAvailableSkills(
  cultivationLevel: number,
  learnedSkills: Record<string, number>
): CultivationSkill[] {
  return CULTIVATION_SKILLS.filter(skill => {
    // Уже изучен на максимальном уровне
    if (learnedSkills[skill.id] === skill.maxLevel) {
      return false;
    }
    
    // Проверяем требования
    const check = canLearnSkill(skill.id, cultivationLevel, learnedSkills);
    return check.canLearn;
  });
}
