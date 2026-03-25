/**
 * Типы для системы карты
 * Упрощённая версия без секторов/чанков
 */

import type { LocationId, SectId } from './branded';

// ==================== ТИПЫ ЛОКАЦИЙ ====================

/**
 * Тип локации для классификации
 */
export type LocationType = 'region' | 'area' | 'building' | 'room';

/**
 * Тип местности
 */
export type TerrainType = 
  | 'plains' 
  | 'mountains' 
  | 'forest' 
  | 'sea' 
  | 'desert' 
  | 'swamp'
  | 'tundra'
  | 'volcanic'
  | 'holy'
  | 'cursed';

// ==================== ТИПЫ СТРОЕНИЙ ====================

/**
 * Тип строения
 */
export type BuildingType = 
  | 'house' 
  | 'shop' 
  | 'temple' 
  | 'cave' 
  | 'tower' 
  | 'sect_hq'
  | 'inn'
  | 'warehouse'
  | 'alchemy_lab'
  | 'training_hall'
  | 'meditation_pavilion'
  | 'library';

/**
 * Тип владельца строения
 */
export type OwnerType = 'player' | 'npc' | 'sect';

// ==================== ТИПЫ ОБЪЕКТОВ ====================

/**
 * Тип объекта на карте
 */
export type ObjectType = 
  | 'resource'      // Ресурс для сбора (трава, руда)
  | 'container'     // Контейнер (сундук, труп)
  | 'interactable'  // Интерактивный объект (рычаг, дверь)
  | 'decoration';   // Декорация (неподвижная)

/**
 * Тип ресурса
 */
export type ResourceType = 
  | 'herb'     // Травы
  | 'ore'      // Руда
  | 'wood'     // Дерево
  | 'water'    // Вода
  | 'crystal'  // Кристаллы
  | 'spirit';  // Духовные материалы

// ==================== ИНТЕРФЕЙСЫ ====================

/**
 * Расширенная локация
 */
export interface MapLocation {
  id: LocationId;
  name: string;
  description?: string;
  
  // Координаты
  x: number;
  y: number;
  z: number;
  distanceFromCenter: number;
  
  // Характеристики
  qiDensity: number;
  qiFlowRate: number;
  terrainType: TerrainType;
  locationType: LocationType;
  
  // Размеры (для регионов)
  width?: number;
  height?: number;
  
  // Связи
  parentLocationId?: string;
  buildingParentId?: string;
}

/**
 * Строение на карте
 */
export interface Building {
  id: string;
  name: string;
  nameId?: string;
  description?: string;
  buildingType: BuildingType;
  
  // Координаты
  locationId: LocationId;
  
  // Размеры
  width: number;
  length: number;
  height: number;
  
  // Свойства
  isEnterable: boolean;
  isOwned: boolean;
  ownerType?: OwnerType;
  ownerId?: string;
  
  // Бонусы
  qiBonus: number;    // Бонус к медитации (%)
  comfort: number;    // Комфорт (восстановление)
  defense: number;    // Защита
  
  // Связи
  sectId?: SectId;
}

/**
 * Объект на карте
 */
export interface WorldObject {
  id: string;
  name: string;
  nameId?: string;
  description?: string;
  objectType: ObjectType;
  
  // Координаты
  locationId?: LocationId;
  x: number;
  y: number;
  z: number;
  
  // Свойства
  isInteractable: boolean;
  isCollectible: boolean;
  isDestructible: boolean;
  
  // Состояние
  health: number;
  maxHealth: number;
  durability: number;
  
  // Ресурсы
  resourceType?: ResourceType;
  resourceCount: number;
  respawnTime: number;  // в минутах
  
  // Контейнер
  inventory?: Record<string, unknown>;
  
  // Визуал
  icon?: string;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ТИПЫ ====================

/**
 * Результат поиска объектов в радиусе
 */
export interface SearchResult<T> {
  items: T[];
  center: { x: number; y: number; z: number };
  radius: number;
  totalFound: number;
}

/**
 * Параметры создания строения
 */
export interface CreateBuildingParams {
  name: string;
  nameId?: string;
  description?: string;
  buildingType: BuildingType;
  locationId: string;
  width?: number;
  length?: number;
  height?: number;
  isEnterable?: boolean;
  qiBonus?: number;
  comfort?: number;
  defense?: number;
  sectId?: string;
}

/**
 * Параметры создания объекта
 */
export interface CreateWorldObjectParams {
  name: string;
  nameId?: string;
  description?: string;
  objectType: ObjectType;
  locationId?: string;
  x?: number;
  y?: number;
  z?: number;
  isInteractable?: boolean;
  isCollectible?: boolean;
  isDestructible?: boolean;
  resourceType?: ResourceType;
  resourceCount?: number;
  respawnTime?: number;
  icon?: string;
}

// ==================== КОНСТАНТЫ ====================

/**
 * Названия типов локаций на русском
 */
export const LOCATION_TYPE_NAMES: Record<LocationType, string> = {
  region: 'Регион',
  area: 'Местность',
  building: 'Здание',
  room: 'Комната',
};

/**
 * Названия типов строений на русском
 */
export const BUILDING_TYPE_NAMES: Record<BuildingType, string> = {
  house: 'Дом',
  shop: 'Лавка',
  temple: 'Храм',
  cave: 'Пещера',
  tower: 'Башня',
  sect_hq: 'Штаб-квартира секты',
  inn: 'Постоялый двор',
  warehouse: 'Склад',
  alchemy_lab: 'Алхимическая лаборатория',
  training_hall: 'Тренировочный зал',
  meditation_pavilion: 'Павильон медитации',
  library: 'Библиотека',
};

/**
 * Названия типов объектов на русском
 */
export const OBJECT_TYPE_NAMES: Record<ObjectType, string> = {
  resource: 'Ресурс',
  container: 'Контейнер',
  interactable: 'Интерактивный объект',
  decoration: 'Декорация',
};

/**
 * Названия типов ресурсов на русском
 */
export const RESOURCE_TYPE_NAMES: Record<ResourceType, string> = {
  herb: 'Трава',
  ore: 'Руда',
  wood: 'Дерево',
  water: 'Вода',
  crystal: 'Кристалл',
  spirit: 'Духовный материал',
};
