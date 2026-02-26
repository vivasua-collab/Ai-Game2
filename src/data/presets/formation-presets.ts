/**
 * Пресеты формаций (объекты мира)
 * 
 * Формации - это объекты мира, создаваемые практиком:
 * - Защитный круг: значительно снижает шанс прерывания
 * - Конденсатор Ци: увеличивает поглощение
 * - Барьер духа: отпугивает существ
 * - Гармония стихий: высшая формация
 * 
 * Особенности:
 * - Требуют затраты Ци на создание
 * - Имеют время установки и длительность
 * - Качество формации влияет на силу эффектов
 * - Продвинутые формации требуют материалы
 */

import type { Formation, FormationType } from "@/lib/game/formations";

// ============================================
// ИНТЕРФЕЙС ПРЕСЕТА ФОРМАЦИИ
// ============================================

export interface FormationPreset extends Formation {
  // Категория для UI
  category?: "basic" | "advanced" | "master";
  
  // Сложность создания (влияет на шанс успеха)
  difficulty?: number;  // 1-10
  
  // Опыт создания (для прокачки навыка формаций)
  creationExp?: number;
}

// ============================================
// БАЗОВЫЕ ФОРМАЦИИ (доступны с 1-2 уровня)
// ============================================

export const BASIC_FORMATIONS: FormationPreset[] = [
  {
    id: "protective_circle",
    name: "Protective Circle",
    nameRu: "Защитный круг",
    description: "Простой защитный контур, отгоняющий мелких существ. Базовая защита для медитации.",
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
    category: "basic",
    difficulty: 1,
    creationExp: 10,
  },
  {
    id: "qi_condenser",
    name: "Qi Condenser",
    nameRu: "Конденсатор Ци",
    description: "Формация для концентрации потоков Ци в одной точке. Увеличивает поглощение.",
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
    category: "basic",
    difficulty: 2,
    creationExp: 20,
  },
];

// ============================================
// ПРОДВИНУТЫЕ ФОРМАЦИИ (доступны с 3-5 уровня)
// ============================================

export const ADVANCED_FORMATIONS: FormationPreset[] = [
  {
    id: "spirit_barrier",
    name: "Spirit Barrier",
    nameRu: "Барьер духа",
    description: "Мощная защита от духовных сущностей и призраков. Требует специальные материалы.",
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
    category: "advanced",
    difficulty: 5,
    creationExp: 50,
  },
  {
    id: "qi_well",
    name: "Qi Well",
    nameRu: "Колокол Ци",
    description: "Формация, создающая область с повышенной плотностью Ци. Долгосрочное накопление.",
    setupTime: 60,
    duration: 24,
    qualityLevels: 4,
    effects: {
      interruptionReduction: 20,
      qiBonus: 35,
      fatigueReduction: 10,
    },
    requirements: {
      qiCost: 300,
      cultivationLevel: 5,
      materials: ["кристалл Ци"],
    },
    category: "advanced",
    difficulty: 6,
    creationExp: 80,
  },
  {
    id: "five_elements_circle",
    name: "Five Elements Circle",
    nameRu: "Круг пяти стихий",
    description: "Сбалансированная формация, усиливающая все аспекты культивации.",
    setupTime: 45,
    duration: 10,
    qualityLevels: 4,
    effects: {
      interruptionReduction: 35,
      qiBonus: 25,
      fatigueReduction: 15,
    },
    requirements: {
      qiCost: 250,
      cultivationLevel: 4,
      materials: ["камень огня", "камень воды", "камень земли", "камень воздуха"],
    },
    category: "advanced",
    difficulty: 5,
    creationExp: 60,
  },
];

// ============================================
// МАСТЕРСКИЕ ФОРМАЦИИ (доступны с 6+ уровня)
// ============================================

export const MASTER_FORMATIONS: FormationPreset[] = [
  {
    id: "elemental_harmony",
    name: "Elemental Harmony",
    nameRu: "Гармония стихий",
    description: "Высшая формация, сочетающая защиту и накопление Ци. Вершина искусства формаций.",
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
    category: "master",
    difficulty: 8,
    creationExp: 150,
  },
  {
    id: "void_sanctuary",
    name: "Void Sanctuary",
    nameRu: "Святилище пустоты",
    description: "Формация высшего уровня, создающая изолированное пространство. Полная защита.",
    setupTime: 120,
    duration: 48,
    qualityLevels: 2,
    effects: {
      interruptionReduction: 90,
      qiBonus: 50,
      fatigueReduction: 40,
    },
    requirements: {
      qiCost: 1000,
      cultivationLevel: 8,
      materials: ["сердце пустоты", "слеза дракона", "перо феникса"],
    },
    category: "master",
    difficulty: 10,
    creationExp: 300,
  },
  {
    id: "eternal_meditation_circle",
    name: "Eternal Meditation Circle",
    nameRu: "Круг вечной медитации",
    description: "Постоянная формация для секты или личной обители. Автономная работа.",
    setupTime: 180,
    duration: 0, // Постоянная
    qualityLevels: 3,
    effects: {
      interruptionReduction: 70,
      qiBonus: 40,
      fatigueReduction: 30,
    },
    requirements: {
      qiCost: 2000,
      cultivationLevel: 7,
      materials: ["ядро формации", "кристалл вечности", "духовная почва"],
    },
    category: "master",
    difficulty: 9,
    creationExp: 500,
  },
];

// ============================================
// ЭКСПОРТ ВСЕХ ФОРМАЦИЙ
// ============================================

export const ALL_FORMATION_PRESETS: FormationPreset[] = [
  ...BASIC_FORMATIONS,
  ...ADVANCED_FORMATIONS,
  ...MASTER_FORMATIONS,
];

// ============================================
// ФУНКЦИИ ПОИСКА
// ============================================

/**
 * Получить формацию по ID
 */
export function getFormationPresetById(id: FormationType): FormationPreset | undefined {
  return ALL_FORMATION_PRESETS.find(f => f.id === id);
}

/**
 * Получить базовые формации
 */
export function getBasicFormations(): FormationPreset[] {
  return BASIC_FORMATIONS;
}

/**
 * Получить формации, доступные для уровня культивации
 */
export function getAvailableFormationPresets(cultivationLevel: number): FormationPreset[] {
  return ALL_FORMATION_PRESETS.filter(f => {
    if (f.requirements.cultivationLevel && 
        cultivationLevel < f.requirements.cultivationLevel) {
      return false;
    }
    return true;
  });
}

/**
 * Получить формации по сложности
 */
export function getFormationsByDifficulty(maxDifficulty: number): FormationPreset[] {
  return ALL_FORMATION_PRESETS.filter(f => 
    (f.difficulty || 1) <= maxDifficulty
  );
}
