/**
 * Сервис для работы с картой
 * Упрощённая версия без секторов/чанков
 */

import { db } from '@/lib/db';
import type { 
  MapLocation, 
  Building, 
  WorldObject,
  CreateBuildingParams,
  CreateWorldObjectParams,
  SearchResult 
} from '@/types/map';
import { getDistance3D, getDistanceFromCenter, type WorldPosition } from '@/lib/game/world-coordinates';

// ==================== LOCATION ====================

/**
 * Получить все локации в радиусе от точки
 */
export async function getLocationsInRadius(
  sessionId: string,
  center: WorldPosition,
  radiusMeters: number
): Promise<SearchResult<MapLocation>> {
  const locations = await db.location.findMany({
    where: { sessionId },
  });

  const filtered = locations.filter((loc) => {
    const distance = getDistance3D(center, {
      x: loc.x,
      y: loc.y,
      z: loc.z,
    });
    return distance <= radiusMeters;
  });

  return {
    items: filtered.map(mapLocationFromPrisma),
    center,
    radius: radiusMeters,
    totalFound: filtered.length,
  };
}

/**
 * Получить локацию по ID
 */
export async function getLocationById(id: string): Promise<MapLocation | null> {
  const location = await db.location.findUnique({
    where: { id },
  });
  
  return location ? mapLocationFromPrisma(location) : null;
}

/**
 * Получить локацию персонажа
 */
export async function getCharacterLocation(
  characterId: string
): Promise<MapLocation | null> {
  const character = await db.character.findUnique({
    where: { id: characterId },
    include: { currentLocation: true },
  });

  if (!character?.currentLocation) return null;
  
  return mapLocationFromPrisma(character.currentLocation);
}

/**
 * Создать новую локацию
 */
export async function createLocation(
  sessionId: string,
  data: {
    name: string;
    description?: string;
    x?: number;
    y?: number;
    z?: number;
    qiDensity?: number;
    qiFlowRate?: number;
    terrainType?: string;
    locationType?: string;
    width?: number;
    height?: number;
    parentLocationId?: string;
  }
): Promise<MapLocation> {
  const location = await db.location.create({
    data: {
      sessionId,
      name: data.name,
      description: data.description,
      x: data.x ?? 0,
      y: data.y ?? 0,
      z: data.z ?? 0,
      qiDensity: data.qiDensity ?? 100,
      qiFlowRate: data.qiFlowRate ?? 10,
      terrainType: data.terrainType ?? 'plains',
      locationType: data.locationType ?? 'area',
      width: data.width,
      height: data.height,
      parentLocationId: data.parentLocationId,
      distanceFromCenter: Math.round(
        Math.sqrt((data.x ?? 0) ** 2 + (data.y ?? 0) ** 2)
      ),
    },
  });

  return mapLocationFromPrisma(location);
}

// ==================== BUILDING ====================

/**
 * Получить все строения в локации
 */
export async function getBuildingsAtLocation(
  locationId: string
): Promise<Building[]> {
  const buildings = await db.building.findMany({
    where: { locationId },
  });

  return buildings.map(mapBuildingFromPrisma);
}

/**
 * Получить строение по ID
 */
export async function getBuildingById(id: string): Promise<Building | null> {
  const building = await db.building.findUnique({
    where: { id },
  });

  return building ? mapBuildingFromPrisma(building) : null;
}

/**
 * Создать строение
 */
export async function createBuilding(
  params: CreateBuildingParams
): Promise<Building> {
  const building = await db.building.create({
    data: {
      name: params.name,
      nameId: params.nameId,
      description: params.description,
      buildingType: params.buildingType,
      locationId: params.locationId,
      width: params.width ?? 10,
      length: params.length ?? 10,
      height: params.height ?? 3,
      isEnterable: params.isEnterable ?? true,
      qiBonus: params.qiBonus ?? 0,
      comfort: params.comfort ?? 0,
      defense: params.defense ?? 0,
      sectId: params.sectId,
    },
  });

  return mapBuildingFromPrisma(building);
}

/**
 * Получить комнаты внутри строения
 */
export async function getBuildingRooms(buildingId: string): Promise<MapLocation[]> {
  const rooms = await db.location.findMany({
    where: { buildingParentId: buildingId },
  });

  return rooms.map(mapLocationFromPrisma);
}

// ==================== WORLD OBJECT ====================

/**
 * Получить все объекты в локации
 */
export async function getObjectsAtLocation(
  locationId: string
): Promise<WorldObject[]> {
  const objects = await db.worldObject.findMany({
    where: { locationId },
  });

  return objects.map(mapWorldObjectFromPrisma);
}

/**
 * Получить объекты в радиусе от точки
 */
export async function getObjectsInRadius(
  center: WorldPosition,
  radiusMeters: number,
  objectType?: string
): Promise<SearchResult<WorldObject>> {
  const where = objectType ? { objectType } : {};
  
  const objects = await db.worldObject.findMany({ where });

  const filtered = objects.filter((obj) => {
    const distance = getDistance3D(center, {
      x: obj.x,
      y: obj.y,
      z: obj.z,
    });
    return distance <= radiusMeters;
  });

  return {
    items: filtered.map(mapWorldObjectFromPrisma),
    center,
    radius: radiusMeters,
    totalFound: filtered.length,
  };
}

/**
 * Получить объект по ID
 */
export async function getObjectById(id: string): Promise<WorldObject | null> {
  const object = await db.worldObject.findUnique({
    where: { id },
  });

  return object ? mapWorldObjectFromPrisma(object) : null;
}

/**
 * Создать объект на карте
 */
export async function createWorldObject(
  params: CreateWorldObjectParams
): Promise<WorldObject> {
  const object = await db.worldObject.create({
    data: {
      name: params.name,
      nameId: params.nameId,
      description: params.description,
      objectType: params.objectType,
      locationId: params.locationId,
      x: params.x ?? 0,
      y: params.y ?? 0,
      z: params.z ?? 0,
      isInteractable: params.isInteractable ?? true,
      isCollectible: params.isCollectible ?? false,
      isDestructible: params.isDestructible ?? true,
      resourceType: params.resourceType,
      resourceCount: params.resourceCount ?? 1,
      respawnTime: params.respawnTime ?? 0,
      icon: params.icon,
    },
  });

  return mapWorldObjectFromPrisma(object);
}

/**
 * Удалить объект
 */
export async function deleteWorldObject(id: string): Promise<boolean> {
  try {
    await db.worldObject.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Обновить состояние объекта (после сбора ресурса)
 */
export async function updateObjectState(
  id: string,
  data: Partial<{
    health: number;
    durability: number;
    resourceCount: number;
  }>
): Promise<WorldObject | null> {
  const object = await db.worldObject.update({
    where: { id },
    data,
  });

  return mapWorldObjectFromPrisma(object);
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

/**
 * Маппинг Prisma Location -> MapLocation
 */
function mapLocationFromPrisma(loc: {
  id: string;
  name: string;
  description: string | null;
  x: number;
  y: number;
  z: number;
  distanceFromCenter: number;
  qiDensity: number;
  qiFlowRate: number;
  terrainType: string;
  locationType: string;
  width: number | null;
  height: number | null;
}): MapLocation {
  return {
    id: loc.id as any,
    name: loc.name,
    description: loc.description ?? undefined,
    x: loc.x,
    y: loc.y,
    z: loc.z,
    distanceFromCenter: loc.distanceFromCenter,
    qiDensity: loc.qiDensity,
    qiFlowRate: loc.qiFlowRate,
    terrainType: loc.terrainType as any,
    locationType: loc.locationType as any,
    width: loc.width ?? undefined,
    height: loc.height ?? undefined,
  };
}

/**
 * Маппинг Prisma Building -> Building
 */
function mapBuildingFromPrisma(b: {
  id: string;
  name: string;
  nameId: string | null;
  description: string | null;
  buildingType: string;
  locationId: string;
  width: number;
  length: number;
  height: number;
  isEnterable: boolean;
  isOwned: boolean;
  ownerType: string | null;
  ownerId: string | null;
  qiBonus: number;
  comfort: number;
  defense: number;
  sectId: string | null;
}): Building {
  return {
    id: b.id,
    name: b.name,
    nameId: b.nameId ?? undefined,
    description: b.description ?? undefined,
    buildingType: b.buildingType as any,
    locationId: b.locationId as any,
    width: b.width,
    length: b.length,
    height: b.height,
    isEnterable: b.isEnterable,
    isOwned: b.isOwned,
    ownerType: (b.ownerType as any) ?? undefined,
    ownerId: b.ownerId ?? undefined,
    qiBonus: b.qiBonus,
    comfort: b.comfort,
    defense: b.defense,
    sectId: b.sectId as any ?? undefined,
  };
}

/**
 * Маппинг Prisma WorldObject -> WorldObject
 */
function mapWorldObjectFromPrisma(o: {
  id: string;
  name: string;
  nameId: string | null;
  description: string | null;
  objectType: string;
  locationId: string | null;
  x: number;
  y: number;
  z: number;
  isInteractable: boolean;
  isCollectible: boolean;
  isDestructible: boolean;
  health: number;
  maxHealth: number;
  durability: number;
  resourceType: string | null;
  resourceCount: number;
  respawnTime: number;
  inventory: string | null;
  icon: string | null;
}): WorldObject {
  return {
    id: o.id,
    name: o.name,
    nameId: o.nameId ?? undefined,
    description: o.description ?? undefined,
    objectType: o.objectType as any,
    locationId: (o.locationId as any) ?? undefined,
    x: o.x,
    y: o.y,
    z: o.z,
    isInteractable: o.isInteractable,
    isCollectible: o.isCollectible,
    isDestructible: o.isDestructible,
    health: o.health,
    maxHealth: o.maxHealth,
    durability: o.durability,
    resourceType: (o.resourceType as any) ?? undefined,
    resourceCount: o.resourceCount,
    respawnTime: o.respawnTime,
    inventory: o.inventory ? JSON.parse(o.inventory) : undefined,
    icon: o.icon ?? undefined,
  };
}

// ==================== ЭКСПОРТ СЕРВИСА ====================

export const mapService = {
  // Location
  getLocationsInRadius,
  getLocationById,
  getCharacterLocation,
  createLocation,
  
  // Building
  getBuildingsAtLocation,
  getBuildingById,
  createBuilding,
  getBuildingRooms,
  
  // WorldObject
  getObjectsAtLocation,
  getObjectsInRadius,
  getObjectById,
  createWorldObject,
  deleteWorldObject,
  updateObjectState,
};
