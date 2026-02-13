/**
 * Система навыков и формаций для культивации
 * 
 * Навыки:
 * - Глубокая медитация: снижает шанс прерывания
 * - Восприятие Ци: увеличивает поглощение
 * - Концентрация: ускоряет накопление
 * 
 * Формации:
 * - Защитный круг: значительно снижает шанс прерывания
 * - Конденсатор Ци: увеличивает поглощение
 * - Барьер духа: отпугивает существ
 */

// ============================================
// НАВЫКИ КУЛЬТИВАЦИИ
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
    fatigueReliefBonus?: number;       // Бонус к снятию усталости (%)
    dangerDetectionRange?: number;    // Дальность обнаружения опасности
  };
  prerequisites?: {
    cultivationLevel?: number;
    skills?: string[];
  };
}

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
// ФОРМАЦИИ
// ============================================

export type FormationType = "protective_circle" | "qi_condenser" | "spirit_barrier" | "elemental_harmony";

export interface Formation {
  id: FormationType;
  name: string;
  nameRu: string;
  description: string;
  setupTime: number;              // Время установки (минуты)
  duration: number;               // Длительность (часы), 0 = постоянная
  qualityLevels: number;          // Количество уровней качества (1-5)
  effects: {
    interruptionReduction: number; // Снижение шанса прерывания (% за уровень)
    qiBonus?: number;              // Бонус к поглощению Ци (% за уровень)
    spiritRepel?: number;          // Отпугивание духов (% за уровень)
    fatigueReduction?: number;     // Снижение усталости (% за уровень)
  };
  requirements: {
    qiCost: number;               // Затраты Ци на создание
    materials?: string[];         // Необходимые материалы
    cultivationLevel?: number;    // Минимальный уровень
  };
}

export const FORMATIONS: Formation[] = [
  {
    id: "protective_circle",
    name: "Protective Circle",
    nameRu: "Защитный круг",
    description: "Простой защитный контур, отгоняющий мелких существ.",
    setupTime: 15,
    duration: 8,
    qualityLevels: 5,
    effects: {
      interruptionReduction: 30, // -30% за уровень качества
      spiritRepel: 10,           // +10% за уровень
    },
    requirements: {
      qiCost: 50,
      cultivationLevel: 1,
    },
  },
  {
    id: "qi_condenser",
    name: "Qi Condenser",
    nameRu: "Конденсатор Ци",
    description: "Формация для концентрации потоков Ци в одной точке.",
    setupTime: 30,
    duration: 6,
    qualityLevels: 5,
    effects: {
      interruptionReduction: 15,
      qiBonus: 20, // +20% к поглощению за уровень
    },
    requirements: {
      qiCost: 100,
      cultivationLevel: 2,
    },
  },
  {
    id: "spirit_barrier",
    name: "Spirit Barrier",
    nameRu: "Барьер духа",
    description: "Мощная защита от духовных сущностей и призраков.",
    setupTime: 45,
    duration: 12,
    qualityLevels: 3,
    effects: {
      interruptionReduction: 40,
      spiritRepel: 50,
    },
    requirements: {
      qiCost: 200,
      cultivationLevel: 4,
      materials: ["духовный камень", "святая вода"],
    },
  },
  {
    id: "elemental_harmony",
    name: "Elemental Harmony",
    nameRu: "Гармония стихий",
    description: "Высшая формация, сочетающая защиту и накопление Ци.",
    setupTime: 60,
    duration: 24,
    qualityLevels: 3,
    effects: {
      interruptionReduction: 60,
      qiBonus: 30,
      fatigueReduction: 25,
    },
    requirements: {
      qiCost: 500,
      cultivationLevel: 6,
      materials: ["кристалл стихий", "эссенция лунного света"],
    },
  },
];

// ============================================
// ФУНКЦИИ РАСЧЁТА
// ============================================

/**
 * Получение эффекта навыка
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
 * Расчёт множителя прерывания от всех навыков
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
 * Получение эффекта формации
 */
export function getFormationEffect(
  formationId: FormationType,
  quality: number
): Formation["effects"] | null {
  const formation = FORMATIONS.find(f => f.id === formationId);
  if (!formation || quality < 1 || quality > formation.qualityLevels) return null;
  
  // Возвращаем эффекты, умноженные на качество
  const result: Formation["effects"] = {};
  
  for (const [key, value] of Object.entries(formation.effects)) {
    if (typeof value === "number") {
      result[key] = value * quality;
    }
  }
  
  return result;
}

/**
 * Расчёт множителя прерывания от формации
 */
export function calculateFormationInterruptionModifier(
  formationId: FormationType | null,
  quality: number
): number {
  if (!formationId) return 1.0;
  
  const effect = getFormationEffect(formationId, quality);
  if (!effect) return 1.0;
  
  // Преобразуем процент снижения в множитель
  return 1 - (effect.interruptionReduction / 100);
}

/**
 * Проверка возможности создания формации
 */
export function canCreateFormation(
  formationId: FormationType,
  character: {
    currentQi: number;
    cultivationLevel: number;
    inventory?: string[];
  }
): { canCreate: boolean; reason?: string } {
  const formation = FORMATIONS.find(f => f.id === formationId);
  if (!formation) {
    return { canCreate: false, reason: "Формация не найдена" };
  }
  
  // Проверка уровня культивации
  if (formation.requirements.cultivationLevel && 
      character.cultivationLevel < formation.requirements.cultivationLevel) {
    return { 
      canCreate: false, 
      reason: `Требуется уровень культивации ${formation.requirements.cultivationLevel}` 
    };
  }
  
  // Проверка Ци
  if (character.currentQi < formation.requirements.qiCost) {
    return { 
      canCreate: false, 
      reason: `Недостаточно Ци: нужно ${formation.requirements.qiCost}` 
    };
  }
  
  // Проверка материалов
  if (formation.requirements.materials) {
    const inventory = character.inventory || [];
    for (const material of formation.requirements.materials) {
      if (!inventory.includes(material)) {
        return { 
          canCreate: false, 
          reason: `Необходим материал: ${material}` 
        };
      }
    }
  }
  
  return { canCreate: true };
}

/**
 * Получение списка доступных формаций для персонажа
 */
export function getAvailableFormations(
  character: {
    cultivationLevel: number;
    currentQi: number;
  }
): Formation[] {
  return FORMATIONS.filter(f => {
    if (f.requirements.cultivationLevel && 
        character.cultivationLevel < f.requirements.cultivationLevel) {
      return false;
    }
    return true;
  });
}

// Экспорт для использования в других модулях
export { CULTIVATION_SKILLS, FORMATIONS };
