/**
 * ============================================================================
 * ПРЕСЕТЫ ФОРМАЦИЙ (Единый формат)
 * ============================================================================
 * 
 * Формации - это объекты мира, создаваемые практиком:
 * - Защитный круг: снижает шанс прерывания медитации
 * - Конденсатор Ци: увеличивает поглощение
 * - Барьер духа: отпугивает существ
 * - Гармония стихий: высшая формация
 * 
 * Особенности:
 * - Требуют затраты Ци на создание
 * - Имеют время установки и длительность
 * - Качество формации влияет на силу эффектов
 * - Продвинутые формации требуют материалы
 * 
 * ============================================================================
 */

import type { BasePreset, PresetCategory, PresetRarity, PresetSource } from "./base-preset";

// ============================================
// ТИПЫ ФОРМАЦИЙ
// ============================================

/**
 * Тип формации
 */
export type FormationType = 
  | "protective_circle" 
  | "qi_condenser" 
  | "spirit_barrier" 
  | "elemental_harmony"
  | "qi_well"
  | "five_elements_circle"
  | "void_sanctuary"
  | "eternal_meditation_circle";

/**
 * Эффекты формации
 */
export interface FormationEffects {
  interruptionReduction: number; // Снижение шанса прерывания (% за уровень качества)
  qiBonus?: number;              // Бонус к поглощению Ци (% за уровень)
  spiritRepel?: number;          // Отпугивание духов (% за уровень)
  fatigueReduction?: number;     // Снижение усталости (% за уровень)
}

/**
 * Пресет формации (Единый формат)
 */
export interface FormationPreset extends BasePreset {
  // === ТИП ФОРМАЦИИ ===
  formationType: FormationType;
  
  // === ВРЕМЯ И ДЛИТЕЛЬНОСТЬ ===
  setupTime: number;       // Время установки (минуты)
  duration: number;        // Длительность (часы), 0 = постоянная
  
  // === КАЧЕСТВО ===
  qualityLevels: number;   // Количество уровней качества (1-5)
  
  // === ЭФФЕКТЫ ===
  formationEffects: FormationEffects;
  
  // === СЛОЖНОСТЬ ===
  difficulty: number;      // 1-10, влияет на шанс успеха создания
  
  // === ОПЫТ ===
  creationExp: number;     // Опыт создания для прокачки навыка формаций
}

// ============================================
// БАЗОВЫЕ ФОРМАЦИИ
// ============================================

export const BASIC_FORMATIONS: FormationPreset[] = [
  {
    id: "protective_circle",
    name: "Защитный круг",
    nameEn: "Protective Circle",
    description: "Простой защитный контур, отгоняющий мелких существ. Базовая защита для медитации.",
    category: "basic",
    rarity: "common",
    formationType: "protective_circle",
    setupTime: 15,
    duration: 8,
    qualityLevels: 5,
    formationEffects: {
      interruptionReduction: 30, // -30% за уровень качества
      spiritRepel: 10,           // +10% за уровень
    },
    requirements: {
      cultivationLevel: 1,
      qiCost: 50,
    },
    difficulty: 1,
    creationExp: 10,
    sources: ["preset", "sect"],
    icon: "⭕",
  },
  {
    id: "qi_condenser",
    name: "Конденсатор Ци",
    nameEn: "Qi Condenser",
    description: "Формация для концентрации потоков Ци в одной точке. Увеличивает поглощение.",
    category: "basic",
    rarity: "uncommon",
    formationType: "qi_condenser",
    setupTime: 30,
    duration: 6,
    qualityLevels: 5,
    formationEffects: {
      interruptionReduction: 15,
      qiBonus: 20, // +20% к поглощению за уровень
    },
    requirements: {
      cultivationLevel: 2,
      qiCost: 100,
    },
    difficulty: 2,
    creationExp: 20,
    sources: ["sect", "scroll"],
    cost: {
      contributionPoints: 15,
    },
    icon: "💠",
  },
];

// ============================================
// ПРОДВИНУТЫЕ ФОРМАЦИИ
// ============================================

export const ADVANCED_FORMATIONS: FormationPreset[] = [
  {
    id: "spirit_barrier",
    name: "Барьер духа",
    nameEn: "Spirit Barrier",
    description: "Мощная защита от духовных сущностей и призраков. Требует специальные материалы.",
    category: "advanced",
    rarity: "rare",
    formationType: "spirit_barrier",
    setupTime: 45,
    duration: 12,
    qualityLevels: 3,
    formationEffects: {
      interruptionReduction: 40,
      spiritRepel: 50,
    },
    requirements: {
      cultivationLevel: 4,
      qiCost: 200,
      materials: ["духовный камень", "святая вода"],
    },
    difficulty: 5,
    creationExp: 50,
    sources: ["sect", "scroll"],
    cost: {
      contributionPoints: 50,
      spiritStones: 20,
    },
    icon: "👻",
  },
  {
    id: "qi_well",
    name: "Колокол Ци",
    nameEn: "Qi Well",
    description: "Формация, создающая область с повышенной плотностью Ци. Долгосрочное накопление.",
    category: "advanced",
    rarity: "rare",
    formationType: "qi_well",
    setupTime: 60,
    duration: 24,
    qualityLevels: 4,
    formationEffects: {
      interruptionReduction: 20,
      qiBonus: 35,
      fatigueReduction: 10,
    },
    requirements: {
      cultivationLevel: 5,
      qiCost: 300,
      materials: ["кристалл Ци"],
    },
    difficulty: 6,
    creationExp: 80,
    sources: ["scroll"],
    cost: {
      contributionPoints: 80,
      spiritStones: 30,
    },
    icon: "🔮",
  },
  {
    id: "five_elements_circle",
    name: "Круг пяти стихий",
    nameEn: "Five Elements Circle",
    description: "Сбалансированная формация, усиливающая все аспекты культивации.",
    category: "advanced",
    rarity: "rare",
    formationType: "five_elements_circle",
    setupTime: 45,
    duration: 10,
    qualityLevels: 4,
    formationEffects: {
      interruptionReduction: 35,
      qiBonus: 25,
      fatigueReduction: 15,
    },
    requirements: {
      cultivationLevel: 4,
      qiCost: 250,
      materials: ["камень огня", "камень воды", "камень земли", "камень воздуха"],
    },
    difficulty: 5,
    creationExp: 60,
    sources: ["scroll"],
    cost: {
      contributionPoints: 60,
      spiritStones: 25,
    },
    icon: "⭐",
  },
];

// ============================================
// МАСТЕРСКИЕ ФОРМАЦИИ
// ============================================

export const MASTER_FORMATIONS: FormationPreset[] = [
  {
    id: "elemental_harmony",
    name: "Гармония стихий",
    nameEn: "Elemental Harmony",
    description: "Высшая формация, сочетающая защиту и накопление Ци. Вершина искусства формаций.",
    category: "master",
    rarity: "legendary",
    formationType: "elemental_harmony",
    setupTime: 60,
    duration: 24,
    qualityLevels: 3,
    formationEffects: {
      interruptionReduction: 60,
      qiBonus: 30,
      fatigueReduction: 25,
    },
    requirements: {
      cultivationLevel: 6,
      qiCost: 500,
      materials: ["кристалл стихий", "эссенция лунного света"],
    },
    difficulty: 8,
    creationExp: 150,
    sources: ["insight"],
    cost: {
      spiritStones: 100,
    },
    icon: "🌈",
  },
  {
    id: "void_sanctuary",
    name: "Святилище пустоты",
    nameEn: "Void Sanctuary",
    description: "Формация высшего уровня, создающая изолированное пространство. Полная защита.",
    category: "master",
    rarity: "legendary",
    formationType: "void_sanctuary",
    setupTime: 120,
    duration: 48,
    qualityLevels: 2,
    formationEffects: {
      interruptionReduction: 90,
      qiBonus: 50,
      fatigueReduction: 40,
    },
    requirements: {
      cultivationLevel: 8,
      qiCost: 1000,
      materials: ["сердце пустоты", "слеза дракона", "перо феникса"],
    },
    difficulty: 10,
    creationExp: 300,
    sources: ["insight"],
    cost: {
      spiritStones: 500,
    },
    icon: "🏛️",
  },
  {
    id: "eternal_meditation_circle",
    name: "Круг вечной медитации",
    nameEn: "Eternal Meditation Circle",
    description: "Постоянная формация для секты или личной обители. Автономная работа.",
    category: "master",
    rarity: "legendary",
    formationType: "eternal_meditation_circle",
    setupTime: 180,
    duration: 0, // Постоянная
    qualityLevels: 3,
    formationEffects: {
      interruptionReduction: 70,
      qiBonus: 40,
      fatigueReduction: 30,
    },
    requirements: {
      cultivationLevel: 7,
      qiCost: 2000,
      materials: ["ядро формации", "кристалл вечности", "духовная почва"],
    },
    difficulty: 9,
    creationExp: 500,
    sources: ["insight"],
    cost: {
      spiritStones: 300,
    },
    icon: "♾️",
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
export function getFormationPresetById(id: FormationType | string): FormationPreset | undefined {
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
    if (!f.requirements?.cultivationLevel) return true;
    return f.requirements.cultivationLevel <= cultivationLevel;
  });
}

/**
 * Получить формации по сложности
 */
export function getFormationsByDifficulty(maxDifficulty: number): FormationPreset[] {
  return ALL_FORMATION_PRESETS.filter(f => f.difficulty <= maxDifficulty);
}

/**
 * Получить формации по типу
 */
export function getFormationPresetsByType(type: FormationType): FormationPreset | undefined {
  return ALL_FORMATION_PRESETS.find(f => f.formationType === type);
}

/**
 * Получить эффекты формации с учётом качества
 */
export function getFormationEffects(formationId: string, quality: number): FormationEffects | null {
  const formation = getFormationPresetById(formationId);
  if (!formation || quality < 1 || quality > formation.qualityLevels) return null;
  
  const result: FormationEffects = {
    interruptionReduction: formation.formationEffects.interruptionReduction * quality,
  };
  
  if (formation.formationEffects.qiBonus) {
    result.qiBonus = formation.formationEffects.qiBonus * quality;
  }
  if (formation.formationEffects.spiritRepel) {
    result.spiritRepel = formation.formationEffects.spiritRepel * quality;
  }
  if (formation.formationEffects.fatigueReduction) {
    result.fatigueReduction = formation.formationEffects.fatigueReduction * quality;
  }
  
  return result;
}

/**
 * Рассчитать множитель прерывания от формации
 */
export function calculateFormationInterruptionModifier(
  formationId: string | null,
  quality: number
): number {
  if (!formationId) return 1.0;
  
  const effects = getFormationEffects(formationId, quality);
  if (!effects) return 1.0;
  
  return 1 - (effects.interruptionReduction / 100);
}
