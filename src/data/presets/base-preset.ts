/**
 * ============================================================================
 * БАЗОВЫЙ ИНТЕРФЕЙС ПРЕСЕТОВ
 * ============================================================================
 * 
 * Единый формат для всех типов пресетов в игре:
 * - Техники (активные способности)
 * - Навыки (пассивные способности)
 * - Формации (объекты мира)
 * - Предметы (инвентарь)
 * - Персонажи (стартовые наборы)
 * 
 * Все пресеты следуют единой структуре с общими полями.
 * 
 * ============================================================================
 */

// ============================================
// ТИПЫ
// ============================================

/**
 * Категория пресета для UI и балансировки
 */
export type PresetCategory = "basic" | "advanced" | "master" | "legendary";

/**
 * Редкость предмета/техники
 */
export type PresetRarity = "common" | "uncommon" | "rare" | "legendary";

/**
 * Элемент/стихия
 */
export type PresetElement = "fire" | "water" | "earth" | "air" | "lightning" | "void" | "neutral";

/**
 * Требования для использования/изучения
 */
export interface PresetRequirements {
  cultivationLevel?: number;
  stats?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  };
  skills?: string[];
  materials?: string[];
  qiCost?: number;
}

/**
 * Стоимость изучения/получения
 */
export interface PresetCost {
  contributionPoints?: number;
  spiritStones?: number;
  qi?: number;
}

/**
 * Источник получения
 */
export type PresetSource = "preset" | "sect" | "scroll" | "insight" | "npc" | "created" | "drop";

// ============================================
// БАЗОВЫЙ ИНТЕРФЕЙС
// ============================================

/**
 * Базовый интерфейс для всех пресетов
 * 
 * Обязательные поля:
 * - id: уникальный идентификатор
 * - name: название на русском
 * - description: описание
 * - category: категория для UI
 * - rarity: редкость
 */
export interface BasePreset {
  // === ИДЕНТИФИКАЦИЯ ===
  id: string;
  name: string;
  nameEn?: string;  // Английское название (опционально)
  description: string;
  
  // === КЛАССИФИКАЦИЯ ===
  category: PresetCategory;
  rarity: PresetRarity;
  
  // === ТРЕБОВАНИЯ ===
  requirements?: PresetRequirements;
  
  // === СТОИМОСТЬ ===
  cost?: PresetCost;
  
  // === ИСТОЧНИК ===
  sources?: PresetSource[];
  
  // === МЕТАДАННЫЕ ===
  tags?: string[];
  icon?: string;
  deprecated?: boolean;
}

// ============================================
// ТИПЫ ПРЕСЕТОВ
// ============================================

/**
 * Типы пресетов в игре
 */
export type PresetType = "technique" | "skill" | "formation" | "item" | "character";

/**
 * Информация о типе пресета для UI
 */
export interface PresetTypeInfo {
  type: PresetType;
  label: string;
  labelRu: string;
  description: string;
}

/**
 * Информация о категориях
 */
export const PRESET_CATEGORIES: Record<PresetCategory, { label: string; labelRu: string; color: string }> = {
  basic: { label: "Basic", labelRu: "Базовый", color: "text-gray-400" },
  advanced: { label: "Advanced", labelRu: "Продвинутый", color: "text-blue-400" },
  master: { label: "Master", labelRu: "Мастерский", color: "text-purple-400" },
  legendary: { label: "Legendary", labelRu: "Легендарный", color: "text-amber-400" },
};

/**
 * Информация о редкости
 */
export const PRESET_RARITIES: Record<PresetRarity, { label: string; labelRu: string; color: string; multiplier: number }> = {
  common: { label: "Common", labelRu: "Обычная", color: "text-gray-400", multiplier: 1.0 },
  uncommon: { label: "Uncommon", labelRu: "Необычная", color: "text-green-400", multiplier: 1.25 },
  rare: { label: "Rare", labelRu: "Редкая", color: "text-blue-400", multiplier: 1.5 },
  legendary: { label: "Legendary", labelRu: "Легендарная", color: "text-amber-400", multiplier: 2.0 },
};

/**
 * Информация о стихиях
 */
export const PRESET_ELEMENTS: Record<PresetElement, { label: string; labelRu: string; icon: string; color: string }> = {
  fire: { label: "Fire", labelRu: "Огонь", icon: "🔥", color: "text-orange-500" },
  water: { label: "Water", labelRu: "Вода", icon: "💧", color: "text-blue-500" },
  earth: { label: "Earth", labelRu: "Земля", icon: "🪨", color: "text-amber-600" },
  air: { label: "Air", labelRu: "Воздух", icon: "💨", color: "text-cyan-400" },
  lightning: { label: "Lightning", labelRu: "Молния", icon: "⚡", color: "text-yellow-400" },
  void: { label: "Void", labelRu: "Пустота", icon: "🌀", color: "text-purple-500" },
  neutral: { label: "Neutral", labelRu: "Нейтральный", icon: "⚪", color: "text-gray-400" },
};

// ============================================
// УТИЛИТЫ
// ============================================

/**
 * Получить информацию о категории
 */
export function getCategoryInfo(category: PresetCategory) {
  return PRESET_CATEGORIES[category];
}

/**
 * Получить информацию о редкости
 */
export function getRarityInfo(rarity: PresetRarity) {
  return PRESET_RARITIES[rarity];
}

/**
 * Получить информацию о стихии
 */
export function getElementInfo(element: PresetElement) {
  return PRESET_ELEMENTS[element];
}

/**
 * Проверить доступность пресета для персонажа
 */
export function isPresetAvailable(
  preset: BasePreset,
  character: {
    cultivationLevel: number;
    strength: number;
    agility: number;
    intelligence: number;
    conductivity: number;
    learnedSkills?: Record<string, number>;
  }
): { available: boolean; reason?: string } {
  const req = preset.requirements;
  
  if (!req) return { available: true };
  
  // Проверка уровня культивации
  if (req.cultivationLevel && character.cultivationLevel < req.cultivationLevel) {
    return { available: false, reason: `Требуется уровень культивации ${req.cultivationLevel}` };
  }
  
  // Проверка характеристик
  if (req.stats) {
    if (req.stats.strength && character.strength < req.stats.strength) {
      return { available: false, reason: `Требуется сила: ${req.stats.strength}` };
    }
    if (req.stats.agility && character.agility < req.stats.agility) {
      return { available: false, reason: `Требуется ловкость: ${req.stats.agility}` };
    }
    if (req.stats.intelligence && character.intelligence < req.stats.intelligence) {
      return { available: false, reason: `Требуется интеллект: ${req.stats.intelligence}` };
    }
    if (req.stats.conductivity && character.conductivity < req.stats.conductivity) {
      return { available: false, reason: `Требуется проводимость: ${req.stats.conductivity}` };
    }
  }
  
  // Проверка навыков
  if (req.skills && character.learnedSkills) {
    for (const skillId of req.skills) {
      if (!character.learnedSkills[skillId]) {
        return { available: false, reason: `Требуется навык: ${skillId}` };
      }
    }
  }
  
  return { available: true };
}

/**
 * Фильтр пресетов по категории
 */
export function filterByCategory<T extends BasePreset>(presets: T[], category: PresetCategory): T[] {
  return presets.filter(p => p.category === category);
}

/**
 * Фильтр пресетов по редкости
 */
export function filterByRarity<T extends BasePreset>(presets: T[], rarity: PresetRarity): T[] {
  return presets.filter(p => p.rarity === rarity);
}

/**
 * Фильтр пресетов по уровню культивации
 */
export function filterByCultivationLevel<T extends BasePreset>(presets: T[], level: number): T[] {
  return presets.filter(p => {
    if (!p.requirements?.cultivationLevel) return true;
    return p.requirements.cultivationLevel <= level;
  });
}

/**
 * Получить пресет по ID
 */
export function getPresetById<T extends BasePreset>(presets: T[], id: string): T | undefined {
  return presets.find(p => p.id === id);
}

/**
 * Сортировка пресетов по категории
 */
export function sortByCategory<T extends BasePreset>(presets: T[]): T[] {
  const order: PresetCategory[] = ["basic", "advanced", "master", "legendary"];
  return [...presets].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
}

/**
 * Сортировка пресетов по редкости
 */
export function sortByRarity<T extends BasePreset>(presets: T[]): T[] {
  const order: PresetRarity[] = ["common", "uncommon", "rare", "legendary"];
  return [...presets].sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
}
