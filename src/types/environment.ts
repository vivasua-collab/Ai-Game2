/**
 * ============================================================================
 * ТИПЫ ОКРУЖЕНИЯ - Environment Types
 * ============================================================================
 * 
 * Система окружения для тестового полигона и основной игры.
 * Включает: препятствия, ресурсы, строения, декорации.
 */

// ==================== БАЗОВЫЕ ТИПЫ ====================

/**
 * Категория объекта окружения
 */
export type EnvironmentCategory = 
  | 'obstacle'     // Препятствие (камни, овраги, стены)
  | 'resource'     // Ресурс (деревья, руды)
  | 'building'     // Строение (часть карты)
  | 'decoration'   // Декорация (трава, цветы)
  | 'interactive'; // Интерактивный (сундуки, двери)

/**
 * Редкость объекта
 */
export type EnvironmentRarity = 
  | 'common'       // Обычный
  | 'uncommon'     // Необычный
  | 'rare'         // Редкий
  | 'legendary';   // Легендарный

/**
 * Форма коллизии
 */
export type CollisionShape = 
  | 'circle'       // Круг
  | 'rectangle'    // Прямоугольник
  | 'polygon';     // Полигон

// ==================== ПРЕПЯТСТВИЯ ====================

/**
 * Тип препятствия
 */
export type ObstacleType = 
  | 'rock_small'      // Малый камень (0.5м)
  | 'rock_medium'     // Средний камень (1м)
  | 'rock_large'      // Большой камень (2м)
  | 'boulder'         // Валун (3м+)
  | 'ravine'          // Овраг (проходимый с штрафом)
  | 'cliff';          // Скала (непроходимая)

/**
 * Пресет препятствия
 */
export interface ObstaclePreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  
  type: ObstacleType;
  category: EnvironmentCategory;
  rarity: EnvironmentRarity;
  
  // Размеры в метрах
  width: number;
  height: number;
  
  // Физика
  isBlocking: boolean;        // Блокирует движение
  movementPenalty: number;    // Штраф скорости (0-1)
  collisionShape: CollisionShape;
  
  // Визуал (для программной генерации)
  visual: {
    baseColor: number;        // Основной цвет (hex)
    highlightColor: number;   // Цвет блика
    shadowColor: number;      // Цвет тени
    shape: 'circle' | 'irregular' | 'angular';
    texture: 'smooth' | 'rough' | 'crystalline';
  };
  
  // Разрушаемость
  isDestructible: boolean;
  health: number;
  defense: number;
  
  // Дроп при разрушении
  dropOnDestroy?: {
    itemId: string;
    quantityMin: number;
    quantityMax: number;
    chance: number;  // 0-1
  }[];
}

// ==================== ДЕРЕВЬЯ ====================

/**
 * Тип дерева
 */
export type TreeType =
  | 'pine'             // Сосна (иголки, коническая крона)
  | 'oak'              // Дуб (широкая крона)
  | 'bamboo'           // Бамбук (тонкий, высокий)
  | 'willow'           // Ива (плакучая)
  | 'spirit_tree'      // Духовное дерево (особое)
  | 'dead_tree';       // Мёртвое дерево (сухое)

/**
 * Пресет дерева
 */
export interface TreePreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  
  type: TreeType;
  category: EnvironmentCategory;
  rarity: EnvironmentRarity;
  
  // Размеры в метрах
  trunkWidth: number;    // Толщина ствола
  trunkHeight: number;   // Высота ствола
  canopyRadius: number;  // Радиус кроны
  
  // Ресурс
  resource: {
    type: 'wood';
    yieldMin: number;
    yieldMax: number;
    quality: 'low' | 'medium' | 'high';
    requiredTool: 'axe' | 'hands';
    respawnTime: number;  // Минуты
  };
  
  // Физика
  isBlocking: boolean;     // Ствол блокирует движение
  providesCover: boolean;  // Крона даёт укрытие
  coverBonus: number;      // Бонус к защите в укрытии
  
  // Визуал
  visual: {
    trunkColor: number;
    trunkHighlight: number;
    canopyColor: number;
    canopyHighlight: number;
    hasLeaves: boolean;
    leafDensity: number;   // 0-1
  };
  
  // Здоровье
  health: number;
  defense: number;
  
  // Особые свойства
  isSpiritual: boolean;    // Духовное дерево
  qiRegenBonus?: number;   // Бонус к регенерации Ци рядом
}

// ==================== РУДЫ ====================

/**
 * Тип руды
 */
export type OreType =
  | 'iron_ore'         // Железная руда
  | 'copper_ore'       // Медная руда
  | 'silver_ore'       // Серебряная руда
  | 'gold_ore'         // Золотая руда
  | 'spirit_ore'       // Духовная руда (для артефактов)
  | 'jade_ore'         // Нефрит
  | 'crystal';         // Кристалл Ци

/**
 * Пресет рудного камня
 */
export interface OrePreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  
  type: OreType;
  category: EnvironmentCategory;
  rarity: EnvironmentRarity;
  
  // Размер
  size: 'small' | 'medium' | 'large';
  width: number;
  height: number;
  
  // Ресурс
  resource: {
    type: 'ore';
    oreType: OreType;
    yieldMin: number;
    yieldMax: number;
    quality: 'low' | 'medium' | 'high';
    requiredTool: 'pickaxe' | 'hammer' | 'hands';
    requiredLevel: number;  // Уровень культивации
    respawnTime: number;    // Минуты
  };
  
  // Физика
  isBlocking: boolean;
  collisionShape: CollisionShape;
  
  // Визуал
  visual: {
    baseColor: number;      // Цвет камня
    veinColor: number;      // Цвет прожилок
    glowColor?: number;     // Свечение (для особых руд)
    glowIntensity?: number; // Интенсивность свечения (0-1)
  };
  
  // Здоровье
  health: number;
  defense: number;
}

// ==================== СТРОЕНИЯ ====================

/**
 * Тип деревянного строения
 */
export type WoodenBuildingType =
  | 'wall_wooden'      // Деревянная стена
  | 'door_wooden'      // Деревянная дверь
  | 'window_wooden'    // Окно со ставнями
  | 'fence_wooden'     // Деревянный забор
  | 'gate_wooden'      // Деревянные ворота
  | 'floor_wooden'     // Деревянный пол
  | 'roof_thatch'      // Соломенная крыша
  | 'pillar_wooden';   // Деревянный столб

/**
 * Пресет части строения
 */
export interface BuildingPartPreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  
  type: WoodenBuildingType;
  category: EnvironmentCategory;
  
  // Размеры в метрах
  width: number;
  height: number;
  depth: number;    // Толщина
  
  // Свойства
  properties: {
    isPassable: boolean;      // Можно пройти
    isOpenable: boolean;      // Можно открыть/закрыть
    isTransparent: boolean;   // Просвечивает
    isClimbable: boolean;     // Можно залезть
    providesCover: boolean;   // Даёт укрытие
  };
  
  // Состояние (для дверей, окон)
  initialState: 'open' | 'closed';
  
  // Визуал
  visual: {
    primaryColor: number;
    secondaryColor: number;
    borderColor: number;
    pattern: 'planks' | 'logs' | 'thatch' | 'none';
  };
  
  // Здоровье
  health: number;
  defense: number;
  isDestructible: boolean;
  
  // Стоимость постройки
  buildCost?: {
    material: string;
    quantity: number;
  }[];
}

// ==================== ОБЪЕКТ МИРА ====================

/**
 * Состояние объекта окружения в мире
 */
export interface EnvironmentObjectState {
  id: string;
  presetId: string;
  presetType: 'obstacle' | 'tree' | 'ore' | 'building';
  
  // Позиция в метрах
  x: number;
  y: number;
  z?: number;
  
  // Состояние
  health: number;
  maxHealth: number;
  
  // Для ресурсов
  resourceAmount?: number;
  lastHarvestTime?: number;
  isDepleted?: boolean;
  
  // Для интерактивных объектов
  isOpen?: boolean;
  isLocked?: boolean;
  
  // Метаданные
  rotation?: number;
  scale?: number;
}

// ==================== ГЕНЕРАЦИЯ ====================

/**
 * Конфигурация генерации окружения
 */
export interface EnvironmentGenerationConfig {
  // Размер области в метрах
  width: number;
  height: number;
  
  // Тип местности
  terrainType: 'plains' | 'forest' | 'mountains' | 'desert' | 'swamp';
  
  // Плотность объектов (0-1)
  density: {
    rocks: number;
    trees: number;
    ores: number;
  };
  
  // Seed для детерминированной генерации
  seed?: number;
  
  // Ограничения
  constraints?: {
    excludeZones?: { x: number; y: number; radius: number }[];
    includeZones?: { x: number; y: number; radius: number }[];
  };
}

/**
 * Результат генерации окружения
 */
export interface GeneratedEnvironment {
  obstacles: EnvironmentObjectState[];
  trees: EnvironmentObjectState[];
  ores: EnvironmentObjectState[];
  buildings: EnvironmentObjectState[];
  
  // Метаданные
  seed: number;
  timestamp: number;
}

// ==================== УТИЛИТЫ ====================

/**
 * Проверка, является ли ID объектом окружения
 */
export function isEnvironmentId(id: string): boolean {
  return id.startsWith('ENV_') || 
         id.startsWith('ROCK_') || 
         id.startsWith('TREE_') || 
         id.startsWith('ORE_') || 
         id.startsWith('BLDG_');
}

/**
 * Генерация ID объекта окружения
 */
export function generateEnvironmentId(
  type: 'obstacle' | 'tree' | 'ore' | 'building',
  presetId: string
): string {
  const prefix = {
    obstacle: 'ROCK',
    tree: 'TREE',
    ore: 'ORE',
    building: 'BLDG',
  }[type];
  
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  
  return `${prefix}_${presetId}_${timestamp}_${random}`.toUpperCase();
}
