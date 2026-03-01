/**
 * Система приживления конечностей
 * Совместимость, свежесть, процесс приживления
 */

import type {
  AttachmentProcess,
  AttachmentCompatibility,
  AttachmentMetadata,
  LimbFreshness,
  BodyStructure,
  BodyPart,
  BodyPartType,
} from '@/types/body';

import { createLimbHP, getLimbStatus } from './body-system';

// ==================== КОНСТАНТЫ ПРИЖИВЛЕНИЯ ====================

/**
 * Максимальная разница в ступенях для приживления (в рамках одного уровня)
 */
export const MAX_STEP_DIFFERENCE = 3;

/**
 * Максимальное время свежести конечности (ТИКов)
 * 24 часа = 1440 тиков
 */
export const MAX_FRESH_LIMB_TICKS = 1440;

/**
 * Базовое время приживления (ТИКов)
 * 12 часов = 720 тиков
 */
export const BASE_ATTACHMENT_DURATION = 720;

/**
 * Множители времени приживления
 */
export const ATTACHMENT_DURATION_MODIFIERS = {
  /** За каждую ступень выше */
  perStepHigher: 100,
  /** За каждый уровень ниже */
  perLevelLower: 200,
  /** Бонус от уровня культивации */
  perCultivationLevel: -50,
  /** Минимальное время */
  minDuration: 100,
};

/**
 * Этапы приживления и их параметры
 */
export const ATTACHMENT_STAGES = {
  attaching: {
    progressStart: 0,
    progressEnd: 20,
    efficiencyPenalty: 100, // Конечность не работает
    qiDrainPerTick: 0.5,
  },
  adapting: {
    progressStart: 20,
    progressEnd: 60,
    efficiencyPenalty: 50,
    qiDrainPerTick: 0.3,
  },
  strengthening: {
    progressStart: 60,
    progressEnd: 100,
    efficiencyPenalty: 20,
    qiDrainPerTick: 0.1,
  },
  complete: {
    progressStart: 100,
    progressEnd: 100,
    efficiencyPenalty: 0,
    qiDrainPerTick: 0,
  },
  rejected: {
    progressStart: -1,
    progressEnd: -1,
    efficiencyPenalty: 0,
    qiDrainPerTick: 0,
  },
} as const;

// ==================== ПРОВЕРКА СОВМЕСТИМОСТИ ====================

/**
 * Проверяет совместимость конечности с реципиентом
 */
export function checkAttachmentCompatibility(
  recipientLevel: number,
  recipientStep: number,
  donorLevel: number,
  donorStep: number
): AttachmentCompatibility {
  // Правило 1: Нельзя приживить от практика полным уровнем выше
  if (donorLevel > recipientLevel) {
    return {
      canAttach: false,
      reason: `Конечность от практика уровнем выше (донор: ${donorLevel}, реципиент: ${recipientLevel})`,
      tierDifference: -1,
      durationMultiplier: 0,
    };
  }
  
  // Правило 2: В рамках одного уровня — максимум 3 ступени выше
  if (donorLevel === recipientLevel) {
    const stepDiff = donorStep - recipientStep;
    
    if (stepDiff > MAX_STEP_DIFFERENCE) {
      return {
        canAttach: false,
        reason: `Донор на ${stepDiff} ступеней выше в рамках одного уровня (макс: ${MAX_STEP_DIFFERENCE})`,
        tierDifference: stepDiff,
        durationMultiplier: 0,
      };
    }
    
    // Вычисляем множитель времени
    const durationMultiplier = stepDiff > 0 ? 1 + stepDiff * 0.5 : 1;
    
    return {
      canAttach: true,
      reason: stepDiff > 0
        ? `Конечность сильнее, время адаптации увеличено`
        : 'Конечность подходит',
      tierDifference: stepDiff,
      durationMultiplier,
    };
  }
  
  // Донор ниже уровнем — можно приживить, нужно подтягивать
  const levelDiff = recipientLevel - donorLevel;
  const durationMultiplier = 1 + levelDiff * 0.5;
  
  return {
    canAttach: true,
    reason: `Конечность слабее, нужна адаптация: ${levelDiff} уровней разницы`,
    tierDifference: -levelDiff,
    durationMultiplier,
  };
}

/**
 * Проверяет свежесть конечности
 */
export function checkLimbFreshness(
  severedAtTick: number,
  currentTick: number,
  source: 'living' | 'freshly_killed' | 'old_corpse'
): LimbFreshness {
  const ticksSinceSevered = currentTick - severedAtTick;
  const isFresh = ticksSinceSevered <= MAX_FRESH_LIMB_TICKS &&
    (source === 'living' || source === 'freshly_killed');
  
  return {
    isFresh,
    ticksSinceSevered,
    source,
  };
}

/**
 * Полная проверка возможности приживления
 */
export function canAttachLimb(
  recipientLevel: number,
  recipientStep: number,
  donorLevel: number,
  donorStep: number,
  severedAtTick: number,
  currentTick: number,
  source: 'living' | 'freshly_killed' | 'old_corpse'
): {
  canAttach: boolean;
  compatibility: AttachmentCompatibility;
  freshness: LimbFreshness;
  reason?: string;
} {
  const compatibility = checkAttachmentCompatibility(
    recipientLevel,
    recipientStep,
    donorLevel,
    donorStep
  );
  
  const freshness = checkLimbFreshness(severedAtTick, currentTick, source);
  
  if (!compatibility.canAttach) {
    return {
      canAttach: false,
      compatibility,
      freshness,
      reason: compatibility.reason,
    };
  }
  
  if (!freshness.isFresh) {
    return {
      canAttach: false,
      compatibility,
      freshness,
      reason: 'Конечность несвежая (более 24 часов или от старого трупа)',
    };
  }
  
  return {
    canAttach: true,
    compatibility,
    freshness,
  };
}

// ==================== РАСЧЁТ ВРЕМЕНИ ПРИЖИВЛЕНИЯ ====================

/**
 * Вычисляет длительность приживления (в ТИКАХ)
 */
export function calculateAttachmentDuration(
  recipientLevel: number,
  recipientStep: number,
  donorLevel: number,
  donorStep: number
): number {
  let duration = BASE_ATTACHMENT_DURATION;
  
  // Бонус от уровня культивации реципиента
  duration += recipientLevel * ATTACHMENT_DURATION_MODIFIERS.perCultivationLevel;
  
  // Штраф за ступени выше (в рамках одного уровня)
  if (donorLevel === recipientLevel) {
    const stepDiff = Math.max(0, donorStep - recipientStep);
    duration += stepDiff * ATTACHMENT_DURATION_MODIFIERS.perStepHigher;
  }
  
  // Штраф за уровни ниже
  if (donorLevel < recipientLevel) {
    const levelDiff = recipientLevel - donorLevel;
    duration += levelDiff * ATTACHMENT_DURATION_MODIFIERS.perLevelLower;
  }
  
  return Math.max(ATTACHMENT_DURATION_MODIFIERS.minDuration, duration);
}

/**
 * Определяет текущий этап приживления
 */
export function getAttachmentStage(progress: number): AttachmentProcess['stage'] {
  if (progress >= 100) return 'complete';
  if (progress >= 60) return 'strengthening';
  if (progress >= 20) return 'adapting';
  return 'attaching';
}

/**
 * Вычисляет параметры этапа приживления
 */
export function getStageParams(stage: AttachmentProcess['stage']): {
  efficiencyPenalty: number;
  qiDrainPerTick: number;
} {
  return {
    efficiencyPenalty: ATTACHMENT_STAGES[stage].efficiencyPenalty,
    qiDrainPerTick: ATTACHMENT_STAGES[stage].qiDrainPerTick,
  };
}

// ==================== СОЗДАНИЕ ПРОЦЕССА ПРИЖИВЛЕНИЯ ====================

/**
 * Создаёт процесс приживления
 */
export function createAttachmentProcess(
  partId: string,
  currentTick: number,
  recipientLevel: number,
  recipientStep: number,
  donorLevel: number,
  donorStep: number,
  donorId?: string,
  donorName?: string
): AttachmentProcess {
  const duration = calculateAttachmentDuration(
    recipientLevel,
    recipientStep,
    donorLevel,
    donorStep
  );
  
  const compatibility = checkAttachmentCompatibility(
    recipientLevel,
    recipientStep,
    donorLevel,
    donorStep
  );
  
  return {
    id: `attach_${partId}_${currentTick}`,
    partId,
    startedAt: currentTick,
    duration,
    progress: 0,
    stage: 'attaching',
    efficiencyPenalty: ATTACHMENT_STAGES.attaching.efficiencyPenalty,
    qiDrainPerTick: ATTACHMENT_STAGES.attaching.qiDrainPerTick,
    donor: {
      id: donorId,
      cultivationLevel: donorLevel,
      cultivationStep: donorStep,
      name: donorName,
    },
    compatibility,
  };
}

/**
 * Создаёт метаданные приживлённой конечности
 */
export function createAttachmentMetadata(
  process: AttachmentProcess
): AttachmentMetadata {
  return {
    originalOwnerId: process.donor.id,
    donorCultivationLevel: process.donor.cultivationLevel,
    donorCultivationStep: process.donor.cultivationStep,
    startedAt: process.startedAt,
    duration: process.duration,
    progress: process.progress,
    status: process.stage,
  };
}

// ==================== ОБРАБОТКА ПРИЖИВЛЕНИЯ ====================

/**
 * Обновляет прогресс приживления за ТИК
 */
export function processAttachmentTick(
  process: AttachmentProcess
): {
  progress: number;
  stage: AttachmentProcess['stage'];
  qiDrained: number;
  completed: boolean;
  rejected: boolean;
} {
  if (process.stage === 'complete' || process.stage === 'rejected') {
    return {
      progress: process.progress,
      stage: process.stage,
      qiDrained: 0,
      completed: process.stage === 'complete',
      rejected: process.stage === 'rejected',
    };
  }
  
  // Прогресс
  const progressPerTick = 100 / process.duration;
  process.progress = Math.min(100, process.progress + progressPerTick);
  
  // Обновляем этап
  const newStage = getAttachmentStage(process.progress);
  process.stage = newStage;
  
  // Параметры этапа
  const stageParams = getStageParams(newStage);
  process.efficiencyPenalty = stageParams.efficiencyPenalty;
  process.qiDrainPerTick = stageParams.qiDrainPerTick;
  
  const completed = process.progress >= 100;
  
  return {
    progress: process.progress,
    stage: newStage,
    qiDrained: stageParams.qiDrainPerTick,
    completed,
    rejected: false,
  };
}

/**
 * Обрабатывает все активные приживления за ТИК
 */
export function processAllAttachments(
  body: BodyStructure,
  currentTick: number
): {
  totalQiDrained: number;
  completedIds: string[];
  rejectedIds: string[];
} {
  let totalQiDrained = 0;
  const completedIds: string[] = [];
  const rejectedIds: string[] = [];
  
  body.activeAttachments.forEach(process => {
    const result = processAttachmentTick(process);
    totalQiDrained += result.qiDrained;
    
    if (result.completed) {
      completedIds.push(process.id);
      
      // Обновляем часть тела
      const part = body.parts.get(process.partId);
      if (part) {
        part.efficiency = 100; // Полная эффективность
        part.attachment = createAttachmentMetadata(process);
      }
    }
    
    if (result.rejected) {
      rejectedIds.push(process.id);
    }
  });
  
  // Удаляем завершённые и отвергнутые
  body.activeAttachments = body.activeAttachments.filter(
    p => !completedIds.includes(p.id) && !rejectedIds.includes(p.id)
  );
  
  return { totalQiDrained, completedIds, rejectedIds };
}

// ==================== ПРИЖИВЛЕНИЕ КОНЕЧНОСТИ ====================

/**
 * Приживляет конечность к телу
 */
export function attachLimb(
  body: BodyStructure,
  partType: BodyPartType,
  partId: string,
  partName: string,
  currentTick: number,
  recipientLevel: number,
  recipientStep: number,
  donorLevel: number,
  donorStep: number,
  options?: {
    donorId?: string;
    donorName?: string;
    functions?: BodyPart['functions'];
    parent?: string;
    children?: string[];
  }
): {
  success: boolean;
  part?: BodyPart;
  process?: AttachmentProcess;
  reason?: string;
} {
  // Проверяем, есть ли уже такая часть (отрублена)
  const existingPart = body.parts.get(partId);
  if (existingPart && existingPart.status !== 'severed') {
    return {
      success: false,
      reason: 'Часть тела уже существует и не отрублена',
    };
  }
  
  // Создаём процесс приживления
  const process = createAttachmentProcess(
    partId,
    currentTick,
    recipientLevel,
    recipientStep,
    donorLevel,
    donorStep,
    options?.donorId,
    options?.donorName
  );
  
  // Создаём новую часть тела
  const newPart: BodyPart = {
    id: partId,
    name: partName,
    type: partType,
    hp: createLimbHP(100, 200), // Базовые HP, будут обновлены
    status: 'paralyzed', // Не работает пока приживается
    functions: options?.functions || [],
    efficiency: 0, // 0% пока приживается
    armor: 0,
    damageThreshold: 200,
    hitboxRadius: 0.1,
    parent: options?.parent,
    children: options?.children,
    attachment: createAttachmentMetadata(process),
  };
  
  // Добавляем часть и процесс
  body.parts.set(partId, newPart);
  body.activeAttachments.push(process);
  
  return {
    success: true,
    part: newPart,
    process,
  };
}

/**
 * Отменяет процесс приживления
 */
export function cancelAttachment(
  body: BodyStructure,
  processId: string
): {
  success: boolean;
  removedPartId?: string;
} {
  const index = body.activeAttachments.findIndex(p => p.id === processId);
  
  if (index === -1) {
    return { success: false };
  }
  
  const process = body.activeAttachments.splice(index, 1)[0];
  
  // Удаляем часть тела
  body.parts.delete(process.partId);
  
  return {
    success: true,
    removedPartId: process.partId,
  };
}

// ==================== РЕГЕНЕРАЦИЯ КОНЕЧНОСТИ ====================

/**
 * Проверяет возможность регенерации отрубленной конечности
 */
export function canRegenerateLimb(
  cultivationLevel: number,
  hasRegenerationPractice: boolean,
  hasFormation: boolean
): {
  canRegenerate: boolean;
  reason?: string;
  durationMultiplier: number;
} {
  if (cultivationLevel < 8) {
    return {
      canRegenerate: false,
      reason: 'Требуется уровень культивации 8+',
      durationMultiplier: 0,
    };
  }
  
  const hasBoost = hasRegenerationPractice || hasFormation;
  
  return {
    canRegenerate: true,
    durationMultiplier: hasBoost ? 0.5 : 1,
  };
}

/**
 * Вычисляет длительность регенерации конечности (в ТИКАХ)
 */
export function calculateRegenerationDuration(
  cultivationLevel: number,
  partType: BodyPartType,
  hasFormation: boolean
): number {
  // Базовое время: 7 дней = 10080 тиков
  let duration = 10080;
  
  // Множитель уровня (8-9)
  duration -= (cultivationLevel - 8) * 2000;
  
  // Множитель типа части
  const typeMultipliers: Partial<Record<BodyPartType, number>> = {
    finger: 0.5,
    eye: 0.7,
    ear: 0.7,
    hand: 1.0,
    foot: 1.0,
    arm: 1.5,
    leg: 1.5,
    head: 2.0, // Только для высоких уровней, теоретически
  };
  
  duration *= typeMultipliers[partType] || 1;
  
  // Формация ускоряет
  if (hasFormation) {
    duration *= 0.5;
  }
  
  return Math.max(2000, Math.round(duration)); // Минимум ~1.4 дня
}

/**
 * Начинает процесс регенерации конечности
 */
export function startLimbRegeneration(
  body: BodyStructure,
  partId: string,
  partType: BodyPartType,
  cultivationLevel: number,
  currentTick: number,
  hasFormation: boolean = false
): {
  success: boolean;
  process?: AttachmentProcess;
  duration?: number;
  reason?: string;
} {
  const existingPart = body.parts.get(partId);
  
  // Часть должна быть отрублена
  if (existingPart && existingPart.status !== 'severed') {
    return {
      success: false,
      reason: 'Часть тела не отрублена',
    };
  }
  
  const duration = calculateRegenerationDuration(
    cultivationLevel,
    partType,
    hasFormation
  );
  
  // Создаём процесс "приживления" (регенерации)
  const process: AttachmentProcess = {
    id: `regen_${partId}_${currentTick}`,
    partId,
    startedAt: currentTick,
    duration,
    progress: 0,
    stage: 'attaching',
    efficiencyPenalty: 100,
    qiDrainPerTick: 1.0, // Регенерация требует больше Ци
    donor: {
      cultivationLevel,
      cultivationStep: 0,
    },
    compatibility: {
      canAttach: true,
      tierDifference: 0,
      durationMultiplier: hasFormation ? 0.5 : 1,
    },
  };
  
  // Создаём "растущую" часть тела
  const newPart: BodyPart = {
    id: partId,
    name: getPartName(partId),
    type: partType,
    hp: createLimbHP(1, 2), // Начинается с 1 HP
    status: 'paralyzed',
    functions: [],
    efficiency: 0,
    armor: 0,
    damageThreshold: 2,
    hitboxRadius: 0.05,
  };
  
  body.parts.set(partId, newPart);
  body.activeAttachments.push(process);
  
  return {
    success: true,
    process,
    duration,
  };
}

/**
 * Получает название части по ID
 */
function getPartName(partId: string): string {
  const names: Record<string, string> = {
    head: 'Голова',
    torso: 'Торс',
    left_arm: 'Левая рука',
    right_arm: 'Правая рука',
    left_hand: 'Левая кисть',
    right_hand: 'Правая кисть',
    left_leg: 'Левая нога',
    right_leg: 'Правая нога',
    left_foot: 'Левая стопа',
    right_foot: 'Правая стопа',
    left_eye: 'Левый глаз',
    right_eye: 'Правый глаз',
    left_ear: 'Левое ухо',
    right_ear: 'Правое ухо',
  };
  
  return names[partId] || partId;
}
