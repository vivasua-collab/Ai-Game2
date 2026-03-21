/**
 * ============================================================================
 * СИСТЕМА КОЛЛИЗИЙ NPC
 * ============================================================================
 * 
 * Обеспечивает:
 * - Обнаружение столкновений между NPC
 * - Выталкивание при коллизии
 * - Расчёт зон взаимодействия
 * - Проверка взаимодействия с игроком
 * 
 * Основные параметры:
 * - Collision radius: зависит от размера существа
 * - Interaction zones: зависят от типа NPC (торговец, страж и т.д.)
 */

import {
  type TempNPC,
  type CollisionConfig,
  type InteractionZones,
} from '@/types/temp-npc';

// ==================== ТИПЫ ====================

/**
 * Результат проверки коллизии
 */
export interface CollisionResult {
  collided: boolean;
  overlap: number;              // Величина перекрытия (пиксели)
  pushX: number;                // Вектор выталкивания X
  pushY: number;                // Вектор выталкивания Y
  distance: number;             // Расстояние между центрами
}

/**
 * Результат проверки взаимодействия
 */
export interface InteractionResult {
  canTalk: boolean;
  canTrade: boolean;
  isAggro: boolean;
  isFleeing: boolean;
  isPerceived: boolean;
  distance: number;
}

/**
 * Позиция сущности
 */
export interface Position {
  x: number;
  y: number;
}

// ==================== КОНСТАНТЫ ====================

/**
 * Базовый радиус коллизии по видам (в пикселях)
 * 1 метр ≈ 33 пикселя (при масштабе 32px/метр)
 */
const SPECIES_COLLISION_RADIUS: Record<string, number> = {
  // Гуманоиды
  human: 15,          // ~0.5 метра
  elf: 14,            // чуть меньше
  dwarf: 12,          // компактные
  giant: 30,          // крупные
  // Звери
  wolf: 20,           // большой зверь
  tiger: 25,          // крупный хищник
  bear: 30,           // очень крупный
  snake: 12,          // змея (узкая)
  eagle: 18,          // птица
  // Духи (меньше коллизия)
  ghost: 10,
  fire_elemental: 12,
  water_elemental: 12,
  wind_spirit: 8,
  // Драконы
  dragon: 50,
  dragon_beast: 40,
};

/**
 * Базовые зоны взаимодействия (в пикселях)
 */
const BASE_INTERACTION_ZONES: InteractionZones = {
  talk: 50,          // ~1.5 метра - комфортная дистанция разговора
  trade: 40,          // ~1.2 метра - дистанция торговли
  agro: 200,          // ~6 метров - радиус агрессии
  flee: 150,          // ~4.5 метра - радиус бегства
  perception: 300,    // ~9 метров - радиус восприятия
};

/**
 * Модификаторы зон взаимодействия по ролям
 */
const ROLE_ZONE_MODIFIERS: Record<string, Partial<InteractionZones>> = {
  // Торговцы - увеличенный радиус торговли
  merchant: { trade: 60, talk: 60 },
  innkeeper: { trade: 55, talk: 55 },
  alchemist: { trade: 50, talk: 50 },
  blacksmith: { trade: 50, talk: 45 },
  
  // Стражи - увеличенный радиус агрессии
  guard_combat: { agro: 250, flee: 0, perception: 350 },
  guard_patrol: { agro: 200, perception: 350 },
  
  // Убийцы - скрытные
  assassin: { agro: 100, perception: 400, talk: 30 },
  
  // Звери - не разговаривают и не торгуют
  beast: { talk: 0, trade: 0, agro: 150 },
  monster: { talk: 0, trade: 0, agro: 200 },
  
  // Руководители сект
  sect_master: { talk: 70, trade: 50, perception: 400 },
  elder: { talk: 65, trade: 45, perception: 350 },
  
  // Ученики
  outer_disciple: { talk: 45, agro: 100 },
  inner_disciple: { talk: 50, agro: 120 },
  core_member: { talk: 55, agro: 150 },
};

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Проверка коллизии между двумя NPC
 */
export function checkNPCCollision(
  npc1: TempNPC,
  npc2: TempNPC
): CollisionResult {
  // Проверяем наличие позиций
  if (!npc1.position || !npc2.position) {
    return {
      collided: false,
      overlap: 0,
      pushX: 0,
      pushY: 0,
      distance: Infinity,
    };
  }
  
  // Вычисляем расстояние между центрами
  const dx = npc2.position.x - npc1.position.x;
  const dy = npc2.position.y - npc1.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Минимальная дистанция (сумма радиусов)
  const minDistance = npc1.collision.radius + npc2.collision.radius;
  
  // Проверяем коллизию
  if (distance >= minDistance) {
    return {
      collided: false,
      overlap: 0,
      pushX: 0,
      pushY: 0,
      distance,
    };
  }
  
  // Вычисляем перекрытие
  const overlap = minDistance - distance;
  
  // Вычисляем вектор выталкивания (нормализованный)
  const normalizedX = distance > 0 ? dx / distance : 0;
  const normalizedY = distance > 0 ? dy / distance : 1;
  
  // Выталкивание пропорционально весу
  const totalWeight = npc1.collision.weight + npc2.collision.weight;
  const pushRatio1 = npc2.collision.weight / totalWeight;
  const pushRatio2 = npc1.collision.weight / totalWeight;
  
  // Каждый NPC выталкивается в противоположную сторону
  // Возвращаем вектор для npc1 (от npc2)
  const pushX = -normalizedX * overlap * pushRatio1;
  const pushY = -normalizedY * overlap * pushRatio1;
  
  return {
    collided: true,
    overlap,
    pushX,
    pushY,
    distance,
  };
}

/**
 * Проверка коллизии NPC с позицией
 */
export function checkPositionCollision(
  npc: TempNPC,
  position: Position,
  radius: number
): CollisionResult {
  if (!npc.position) {
    return {
      collided: false,
      overlap: 0,
      pushX: 0,
      pushY: 0,
      distance: Infinity,
    };
  }
  
  const dx = position.x - npc.position.x;
  const dy = position.y - npc.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  const minDistance = npc.collision.radius + radius;
  
  if (distance >= minDistance) {
    return {
      collided: false,
      overlap: 0,
      pushX: 0,
      pushY: 0,
      distance,
    };
  }
  
  const overlap = minDistance - distance;
  const normalizedX = distance > 0 ? dx / distance : 0;
  const normalizedY = distance > 0 ? dy / distance : 1;
  
  return {
    collided: true,
    overlap,
    pushX: normalizedX * overlap,
    pushY: normalizedY * overlap,
    distance,
  };
}

/**
 * Проверка взаимодействия с игроком
 */
export function checkPlayerInteraction(
  npc: TempNPC,
  playerPosition: Position
): InteractionResult {
  if (!npc.position) {
    return {
      canTalk: false,
      canTrade: false,
      isAggro: false,
      isFleeing: false,
      isPerceived: false,
      distance: Infinity,
    };
  }
  
  const zones = npc.interactionZones;
  
  // Вычисляем расстояние
  const dx = playerPosition.x - npc.position.x;
  const dy = playerPosition.y - npc.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Проверяем каждую зону
  const canTalk = npc.personality.canTalk && distance <= zones.talk;
  const canTrade = npc.personality.canTrade && distance <= zones.trade;
  
  // Агрессия зависит от disposition
  const isHostile = npc.personality.aggressionLevel >= 50;
  const isAggro = isHostile && distance <= zones.agro;
  
  // Бегство при низком HP и высоком пороге бегства
  const healthPercent = npc.bodyState.health;
  const isFleeing = healthPercent < npc.personality.fleeThreshold && distance <= zones.flee;
  
  // Восприятие - NPC видит игрока
  const isPerceived = distance <= zones.perception;
  
  return {
    canTalk,
    canTrade,
    isAggro,
    isFleeing,
    isPerceived,
    distance,
  };
}

/**
 * Расчёт конфигурации коллизии для NPC
 */
export function calculateCollisionConfig(
  npc: TempNPC
): CollisionConfig {
  // Базовый радиус по виду
  const baseRadius = SPECIES_COLLISION_RADIUS[npc.speciesId] || 15;
  
  // Модификатор от уровня культивации (крупнее существа)
  const levelMod = 1 + (npc.cultivation.level - 1) * 0.02; // +2% за уровень
  
  // Модификатор от размера тела
  const sizeMod = npc.speciesType === 'beast' ? 1.2 : 
                  npc.speciesType === 'spirit' ? 0.8 : 1.0;
  
  const radius = Math.round(baseRadius * levelMod * sizeMod);
  
  // Высота зависит от типа
  const height = npc.speciesType === 'beast' ? 40 : 
                 npc.speciesType === 'spirit' ? 80 : 
                 180; // гуманоид
  
  // Вес зависит от размера и силы
  const baseWeight = npc.speciesType === 'beast' ? 50 :
                     npc.speciesType === 'spirit' ? 10 :
                     70;
  const weight = baseWeight + npc.stats.vitality * 0.5;
  
  return {
    radius,
    height,
    weight,
  };
}

/**
 * Расчёт зон взаимодействия для NPC
 */
export function calculateInteractionZones(
  npc: TempNPC
): InteractionZones {
  // Базовые зоны
  const base = { ...BASE_INTERACTION_ZONES };
  
  // Модификаторы по роли
  const roleMod = ROLE_ZONE_MODIFIERS[npc.roleId] || {};
  
  // Применяем модификаторы роли
  const zones: InteractionZones = {
    talk: roleMod.talk ?? base.talk,
    trade: roleMod.trade ?? base.trade,
    agro: roleMod.agro ?? base.agro,
    flee: roleMod.flee ?? base.flee,
    perception: roleMod.perception ?? base.perception,
  };
  
  // Модификаторы от уровня культивации
  // Более высокие существа лучше чувствуют
  const levelMod = 1 + (npc.cultivation.level - 1) * 0.05; // +5% за уровень
  
  zones.perception = Math.round(zones.perception * levelMod);
  
  // Модификаторы от интеллекта
  // Умные существа лучше воспринимают
  const intMod = 1 + (npc.stats.intelligence - 10) * 0.01;
  zones.perception = Math.round(zones.perception * intMod);
  
  // Если NPC не может говорить - зона разговора = 0
  if (!npc.personality.canTalk) {
    zones.talk = 0;
  }
  
  // Если NPC не может торговать - зона торговли = 0
  if (!npc.personality.canTrade) {
    zones.trade = 0;
  }
  
  return zones;
}

/**
 * Проверка коллизий NPC со всеми NPC в списке
 */
export function checkAllCollisions(
  npc: TempNPC,
  otherNPCs: TempNPC[]
): CollisionResult[] {
  const results: CollisionResult[] = [];
  
  for (const other of otherNPCs) {
    // Пропускаем самого себя
    if (other.id === npc.id) continue;
    
    const result = checkNPCCollision(npc, other);
    if (result.collided) {
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Применение выталкивания к позиции NPC
 */
export function applyCollisionPush(
  position: Position,
  collisions: CollisionResult[]
): Position {
  if (collisions.length === 0) {
    return position;
  }
  
  let totalPushX = 0;
  let totalPushY = 0;
  
  for (const collision of collisions) {
    totalPushX += collision.pushX;
    totalPushY += collision.pushY;
  }
  
  // Усредняем выталкивание если много коллизий
  const factor = collisions.length > 1 ? 0.7 : 1.0;
  
  return {
    x: position.x + totalPushX * factor,
    y: position.y + totalPushY * factor,
  };
}

/**
 * Проверка, находится ли позиция в зоне взаимодействия
 */
export function isInInteractionZone(
  npc: TempNPC,
  position: Position,
  zoneType: keyof InteractionZones
): boolean {
  if (!npc.position) return false;
  
  const zoneRadius = npc.interactionZones[zoneType];
  if (zoneRadius <= 0) return false;
  
  const dx = position.x - npc.position.x;
  const dy = position.y - npc.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance <= zoneRadius;
}

/**
 * Получение всех NPC в зоне взаимодействия
 */
export function getNPCsInZone(
  npcs: TempNPC[],
  position: Position,
  zoneType: keyof InteractionZones
): TempNPC[] {
  return npcs.filter(npc => isInInteractionZone(npc, position, zoneType));
}

/**
 * Получение ближайшего NPC для взаимодействия
 */
export function getNearestInteractableNPC(
  npcs: TempNPC[],
  position: Position,
  interactionType: 'talk' | 'trade' = 'talk'
): TempNPC | null {
  let nearest: TempNPC | null = null;
  let nearestDistance = Infinity;
  
  for (const npc of npcs) {
    if (!npc.position) continue;
    
    const zoneRadius = npc.interactionZones[interactionType];
    if (zoneRadius <= 0) continue;
    
    const dx = position.x - npc.position.x;
    const dy = position.y - npc.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= zoneRadius && distance < nearestDistance) {
      nearest = npc;
      nearestDistance = distance;
    }
  }
  
  return nearest;
}
