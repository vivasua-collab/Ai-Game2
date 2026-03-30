/**
 * Система формаций для культивации
 * 
 * Формации - это объекты мира, создаваемые практиком:
 * - Защитный круг: значительно снижает шанс прерывания
 * - Конденсатор Ци: увеличивает поглощение
 * - Барьер духа: отпугивает существ
 * - Гармония стихий: высшая формация
 * 
 * Формации требуют:
 * - Затрат Ци на создание
 * - Время на установку
 * - Материалы для продвинутых формаций
 */

// ============================================
// ТИПЫ ФОРМАЦИЙ
// ============================================

export type FormationType = 
  | "protective_circle" 
  | "qi_condenser" 
  | "spirit_barrier" 
  | "elemental_harmony"
  | "qi_well"
  | "five_elements_circle"
  | "void_sanctuary"
  | "eternal_meditation_circle";

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

// ============================================
// СПИСОК ФОРМАЦИЙ
// ============================================

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
// ФУНКЦИИ РАСЧЁТА ФОРМАЦИЙ
// ============================================

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
  const result: Formation["effects"] = {
    interruptionReduction: formation.effects.interruptionReduction * quality,
  };
  
  if (formation.effects.qiBonus) {
    result.qiBonus = formation.effects.qiBonus * quality;
  }
  if (formation.effects.spiritRepel) {
    result.spiritRepel = formation.effects.spiritRepel * quality;
  }
  if (formation.effects.fatigueReduction) {
    result.fatigueReduction = formation.effects.fatigueReduction * quality;
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
