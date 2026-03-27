/**
 * Менеджер формаций
 * Источник: docs/formation_analysis.md v4.1, docs/formation_drain_system.md v1.0
 */

import { db } from '@/lib/db';
import {
  CONTOUR_QI_BY_LEVEL,
  CAPACITY_MULTIPLIER_BY_SIZE,
  HEAVY_CAPACITY_MULTIPLIER,
  DRAIN_INTERVAL_BY_LEVEL,
  DRAIN_AMOUNT_BY_SIZE,
  DRAIN_AMOUNT_HEAVY,
  QI_COST_RATIO_BY_LEVEL,
  RADIUS_BY_SIZE,
  RADIUS_HEAVY,
  FormationSize,
  FormationStage,
  calculateCapacity,
  calculateDrainParams,
  getQiCostRatio,
} from './formation-constants';

// ==================== ТИПЫ ====================

export interface CreateFormationParams {
  sessionId: string;
  techniqueId: string;
  creatorId: string;
  level: number;
  formationType: string;
  size: FormationSize;
  isHeavy?: boolean;
  locationId?: string;
  x?: number;
  y?: number;
  coreId?: string;
}

export interface JoinFillingParams {
  formationId: string;
  practitionerId: string;
  conductivity: number;
  qiDensity: number;
}

export interface DrainResult {
  drained: number;
  newQi: number;
  isDepleted: boolean;
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Создание формации без ядра (одноразовая)
 */
export async function createFormationWithoutCore(params: CreateFormationParams) {
  const {
    sessionId,
    techniqueId,
    creatorId,
    level,
    formationType,
    size,
    isHeavy = false,
    locationId,
    x = 0,
    y = 0,
  } = params;
  
  const contourQi = CONTOUR_QI_BY_LEVEL[level] || 80;
  const capacity = calculateCapacity(level, size, isHeavy);
  const drain = calculateDrainParams(level, size, isHeavy);
  const radius = isHeavy 
    ? RADIUS_HEAVY 
    : RADIUS_BY_SIZE[size as keyof typeof RADIUS_BY_SIZE] || RADIUS_BY_SIZE.small;
  const qiCostRatio = getQiCostRatio(level);
  
  const participants = [{
    practitionerId: creatorId,
    isCreator: true,
    conductivity: 0,
    qiDensity: 0,
    contribution: 0,
  }];
  
  return db.activeFormation.create({
    data: {
      sessionId,
      techniqueId,
      creatorId,
      level,
      formationType,
      size,
      isHeavy,
      currentQi: 0,
      maxCapacity: capacity,
      contourQi,
      creationRadius: radius.creation,
      effectRadius: radius.effect,
      drainInterval: drain.drainInterval,
      drainAmount: drain.drainAmount,
      drainPerHour: drain.drainPerHour,
      lastDrainTick: 0,
      qiCostRatio,
      stage: 'filling',
      locationId: locationId || null,
      x,
      y,
      participants: JSON.stringify(participants),
    },
    include: {
      technique: true,
    },
  });
}

/**
 * Создание формации с ядром (многоразовая)
 */
export async function createFormationWithCore(params: CreateFormationParams & { coreId: string }) {
  const { coreId, ...rest } = params;
  
  // Проверка ядра
  const core = await db.formationCore.findUnique({
    where: { id: coreId },
  });
  
  if (!core) {
    throw new Error('Ядро не найдено');
  }
  
  if (core.isImbued) {
    throw new Error('Ядро уже содержит формацию');
  }
  
  // Проверка совместимости
  if (params.level < core.levelMin || params.level > core.levelMax) {
    throw new Error(`Ядро подходит для формаций уровня ${core.levelMin}-${core.levelMax}`);
  }
  
  // Создание формации
  const formation = await createFormationWithoutCore(rest);
  
  // Обновление ядра
  await db.formationCore.update({
    where: { id: coreId },
    data: {
      isImbued: true,
      imbuedTechniqueId: params.techniqueId,
    },
  });
  
  // Связывание формации с ядром
  return db.activeFormation.update({
    where: { id: formation.id },
    data: { coreId },
    include: {
      technique: true,
      core: true,
    },
  });
}

/**
 * Присоединение к наполнению формации
 */
export async function joinFormationFilling(params: JoinFillingParams) {
  const { formationId, practitionerId, conductivity, qiDensity } = params;
  
  const formation = await db.activeFormation.findUnique({
    where: { id: formationId },
  });
  
  if (!formation) {
    throw new Error('Формация не найдена');
  }
  
  if (formation.stage !== 'filling') {
    throw new Error('Формация не в этапе наполнения');
  }
  
  const participants = JSON.parse(formation.participants);
  
  // Проверка: уже участвует?
  if (participants.some((p: { practitionerId: string }) => p.practitionerId === practitionerId)) {
    throw new Error('Вы уже участвуете в наполнении');
  }
  
  // Добавление участника
  participants.push({
    practitionerId,
    isCreator: false,
    conductivity,
    qiDensity,
    contribution: 0,
  });
  
  return db.activeFormation.update({
    where: { id: formationId },
    data: { participants: JSON.stringify(participants) },
  });
}

/**
 * Проверка утечки Ци
 */
export function checkFormationDrain(
  formation: {
    currentQi: number;
    maxCapacity: number;
    drainInterval: number;
    drainAmount: number;
    lastDrainTick: number;
  },
  currentGlobalTick: number
): DrainResult {
  const ticksPassed = currentGlobalTick - formation.lastDrainTick;
  
  if (ticksPassed < formation.drainInterval) {
    return { drained: 0, newQi: formation.currentQi, isDepleted: false };
  }
  
  const drainCount = Math.floor(ticksPassed / formation.drainInterval);
  const totalDrained = drainCount * formation.drainAmount;
  const newQi = Math.max(0, formation.currentQi - totalDrained);
  
  return {
    drained: Math.min(totalDrained, formation.currentQi),
    newQi,
    isDepleted: newQi === 0,
  };
}

/**
 * Обновление утечки формации
 */
export async function updateFormationDrain(
  formationId: string,
  currentGlobalTick: number
): Promise<DrainResult & { formationId: string }> {
  const formation = await db.activeFormation.findUnique({
    where: { id: formationId },
  });
  
  if (!formation) {
    throw new Error('Формация не найдена');
  }
  
  const drainResult = checkFormationDrain(formation, currentGlobalTick);
  
  if (drainResult.drained > 0) {
    await db.activeFormation.update({
      where: { id: formationId },
      data: {
        currentQi: drainResult.newQi,
        lastDrainTick: currentGlobalTick,
        stage: drainResult.isDepleted ? 'depleted' : formation.stage,
      },
    });
  }
  
  return { ...drainResult, formationId };
}

/**
 * Добавление Ци в формацию
 */
export async function addQiToFormation(
  formationId: string,
  qiAmount: number,
  practitionerId: string
): Promise<{ currentQi: number; maxCapacity: number; isFull: boolean }> {
  const formation = await db.activeFormation.findUnique({
    where: { id: formationId },
  });
  
  if (!formation) {
    throw new Error('Формация не найдена');
  }
  
  if (formation.stage !== 'filling') {
    throw new Error('Формация не в этапе наполнения');
  }
  
  // Обновление Ци
  const newQi = Math.min(formation.currentQi + qiAmount, formation.maxCapacity);
  const isFull = newQi >= formation.maxCapacity;
  
  // Обновление вклада участника
  const participants = JSON.parse(formation.participants);
  const participantIndex = participants.findIndex(
    (p: { practitionerId: string }) => p.practitionerId === practitionerId
  );
  
  if (participantIndex >= 0) {
    participants[participantIndex].contribution += qiAmount;
  }
  
  await db.activeFormation.update({
    where: { id: formationId },
    data: {
      currentQi: newQi,
      participants: JSON.stringify(participants),
      stage: isFull ? 'active' : 'filling',
    },
  });
  
  return {
    currentQi: newQi,
    maxCapacity: formation.maxCapacity,
    isFull,
  };
}

/**
 * Активация формации
 */
export async function activateFormation(formationId: string): Promise<boolean> {
  const formation = await db.activeFormation.findUnique({
    where: { id: formationId },
  });
  
  if (!formation) {
    throw new Error('Формация не найдена');
  }
  
  if (formation.currentQi < formation.maxCapacity) {
    throw new Error('Формация не полностью наполнена');
  }
  
  await db.activeFormation.update({
    where: { id: formationId },
    data: { stage: 'active' },
  });
  
  return true;
}

/**
 * Получение формаций сессии
 */
export async function getSessionFormations(sessionId: string) {
  return db.activeFormation.findMany({
    where: { sessionId },
    include: {
      technique: true,
      core: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Получение ядер персонажа
 */
export async function getCharacterCores(characterId: string) {
  return db.formationCore.findMany({
    where: { characterId },
    include: {
      activeFormation: {
        include: { technique: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Создание ядра в инвентаре
 */
export async function createCoreForCharacter(
  characterId: string,
  level: number,
  options: {
    coreType?: 'disk' | 'altar';
    variant?: string;
  } = {}
) {
  const { generateFormationCore } = await import('./formation-core-generator');
  const coreData = generateFormationCore(level, {
    ...options,
    characterId,
  });
  
  return db.formationCore.create({
    data: coreData,
  });
}

/**
 * Удаление истощённой формации
 */
export async function removeDepletedFormation(formationId: string) {
  const formation = await db.activeFormation.findUnique({
    where: { id: formationId },
  });
  
  if (!formation) {
    throw new Error('Формация не найдена');
  }
  
  if (formation.stage !== 'depleted') {
    throw new Error('Можно удалить только истощённую формацию');
  }
  
  // Если была с ядром - очищаем ядро
  if (formation.coreId) {
    await db.formationCore.update({
      where: { id: formation.coreId },
      data: {
        isImbued: false,
        imbuedTechniqueId: null,
      },
    });
  }
  
  await db.activeFormation.delete({
    where: { id: formationId },
  });
  
  return { success: true };
}
