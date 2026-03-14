/**
 * Система кровотечений
 * Урон за ТИК, типы кровотечений, сопротивление культивации
 */

import type {
  BleedingEffect,
  BleedingType,
  BodyStructure,
  BodyPart,
  DamageResult,
  LimbStatus,
} from '@/types/body';

// ==================== КОНСТАНТЫ КРОВОТЕЧЕНИЙ ====================

/**
 * Параметры типов кровотечений
 */
export const BLEEDING_PARAMS: Record<BleedingType, {
  damagePerTick: number;
  baseDuration: number; // В ТИКАХ, -1 = постоянно
  description: string;
}> = {
  none: {
    damagePerTick: 0,
    baseDuration: 0,
    description: 'Нет кровотечения',
  },
  minor: {
    damagePerTick: 0.5,
    baseDuration: 30, // 30 минут
    description: 'Лёгкое кровотечение',
  },
  moderate: {
    damagePerTick: 1.0,
    baseDuration: 60, // 1 час
    description: 'Умеренное кровотечение',
  },
  severe: {
    damagePerTick: 2.0,
    baseDuration: -1, // Пока не вылечено
    description: 'Сильное кровотечение',
  },
  critical: {
    damagePerTick: 3.0,
    baseDuration: -1, // Пока не вылечено
    description: 'Критическое кровотечение',
  },
  arterial: {
    damagePerTick: 5.0,
    baseDuration: -1, // Пока не вылечено
    description: 'Артериальное кровотечение',
  },
};

/**
 * Сопротивление кровотечению по уровню культивации
 */
export const BLEEDING_RESISTANCE_BY_LEVEL: Record<number, number> = {
  1: 0,      // 0%
  2: 0.1,    // 10%
  3: 0.2,    // 20%
  4: 0.35,   // 35%
  5: 0.5,    // 50%
  6: 0.65,   // 65%
  7: 0.8,    // 80%
  8: 0.9,    // 90%
  9: 1.0,    // 100% - бессмертие тела
};

/**
 * Пороги урона для определения типа кровотечения
 */
export const BLEEDING_DAMAGE_THRESHOLDS = {
  /** Урон < 10% max HP */
  minorThreshold: 0.1,
  /** Урон 10-30% max HP */
  moderateThreshold: 0.3,
  /** Урон 30-60% max HP */
  severeThreshold: 0.6,
};

// ==================== ОПРЕДЕЛЕНИЕ КРОВОТЕЧЕНИЯ ====================

/**
 * Определяет тип кровотечения по урону
 */
export function determineBleedingType(
  damageDealt: number,
  maxHP: number,
  previousStatus: LimbStatus,
  newStatus: LimbStatus,
  severed: boolean
): BleedingType {
  // Отрубание = артериальное
  if (severed) {
    return 'arterial';
  }
  
  // Критическое состояние
  if (newStatus === 'critical') {
    return 'critical';
  }
  
  // Паралич = сильное
  if (newStatus === 'paralyzed' && previousStatus !== 'paralyzed') {
    return 'severe';
  }
  
  // По проценту урона
  const damagePercent = maxHP > 0 ? damageDealt / maxHP : 0;
  
  if (damagePercent >= BLEEDING_DAMAGE_THRESHOLDS.severeThreshold) {
    return 'moderate';
  }
  
  if (damagePercent >= BLEEDING_DAMAGE_THRESHOLDS.moderateThreshold) {
    return 'minor';
  }
  
  if (damagePercent >= BLEEDING_DAMAGE_THRESHOLDS.minorThreshold) {
    return 'minor';
  }
  
  return 'none';
}

/**
 * Создаёт эффект кровотечения
 */
export function createBleedingEffect(
  type: BleedingType,
  sourcePartId: string,
  currentTick: number
): BleedingEffect | null {
  if (type === 'none') {
    return null;
  }
  
  const params = BLEEDING_PARAMS[type];
  
  return {
    id: `bleed_${sourcePartId}_${currentTick}`,
    type,
    damagePerTick: params.damagePerTick,
    remainingDuration: params.baseDuration,
    sourcePartId,
    startedAt: currentTick,
    source: 'damage',
  };
}

/**
 * Создаёт кровотечение для результата урона
 */
export function createBleedingFromDamage(
  damageResult: DamageResult,
  part: BodyPart,
  currentTick: number
): BleedingEffect | null {
  const maxHP = part.hp.functional.max + part.hp.structural.max;
  
  const bleedingType = determineBleedingType(
    damageResult.totalDamage,
    maxHP,
    damageResult.previousStatus,
    damageResult.newStatus,
    damageResult.severed
  );
  
  return createBleedingEffect(bleedingType, part.id, currentTick);
}

// ==================== ПРИМЕНЕНИЕ КРОВОТЕЧЕНИЯ ====================

/**
 * Применяет урон от кровотечения за ТИК
 */
export function applyBleedingDamage(
  body: BodyStructure,
  bleeding: BleedingEffect,
  cultivationLevel: number
): {
  damage: number;
  sourcePartId: string;
  stillActive: boolean;
} {
  // Сопротивление культивации
  const resistance = BLEEDING_RESISTANCE_BY_LEVEL[cultivationLevel] || 0;
  const effectiveDamage = bleeding.damagePerTick * (1 - resistance);
  
  // Применяем урон к торсу (общая потеря крови)
  const torso = body.parts.get('torso');
  if (torso) {
    // Урон идёт в функциональную HP торса
    torso.hp.functional.current = Math.max(
      0,
      torso.hp.functional.current - effectiveDamage
    );
    torso.status = getLimbStatusFromHP(torso.hp);
  }
  
  // Также уменьшаем HP сердца пропорционально
  const heartDamage = effectiveDamage * 0.1; // 10% идёт в сердце
  body.heart.hp.current = Math.max(
    0,
    body.heart.hp.current - heartDamage
  );
  
  // Уменьшаем длительность
  if (bleeding.remainingDuration > 0) {
    bleeding.remainingDuration--;
  }
  
  // Проверяем, всё ли ещё активно
  const stillActive = bleeding.remainingDuration !== 0;
  
  return {
    damage: effectiveDamage,
    sourcePartId: bleeding.sourcePartId,
    stillActive,
  };
}

/**
 * Обрабатывает все активные кровотечения за ТИК
 */
export function processAllBleedings(
  body: BodyStructure,
  cultivationLevel: number,
  currentTick: number
): {
  totalDamage: number;
  processedCount: number;
  expiredBleeds: string[];
} {
  let totalDamage = 0;
  let processedCount = 0;
  const expiredBleeds: string[] = [];
  
  body.activeBleeds.forEach(bleeding => {
    const result = applyBleedingDamage(body, bleeding, cultivationLevel);
    totalDamage += result.damage;
    processedCount++;
    
    if (!result.stillActive) {
      expiredBleeds.push(bleeding.id);
    }
  });
  
  // Удаляем истёкшие кровотечения
  body.activeBleeds = body.activeBleeds.filter(
    b => !expiredBleeds.includes(b.id)
  );
  
  // Проверяем смерть
  if (body.heart.hp.current <= 0) {
    body.isDead = true;
    body.deathReason = 'Потеря крови';
  }
  
  return { totalDamage, processedCount, expiredBleeds };
}

// ==================== ОСТАНОВКА КРОВОТЕЧЕНИЯ ====================

/**
 * Методы остановки кровотечения
 */
export type BleedingStopMethod = 
  | 'bandage'        // Бинты
  | 'medicine'       // Лекарство
  | 'technique'      // Техника
  | 'cultivation'    // Культивация (авто)
  | 'natural';       // Естественное (время вышло)

/**
 * Останавливает кровотечение
 */
export function stopBleeding(
  body: BodyStructure,
  bleedingId: string,
  method: BleedingStopMethod
): {
  success: boolean;
  stoppedBleeding?: BleedingEffect;
} {
  const index = body.activeBleeds.findIndex(b => b.id === bleedingId);
  
  if (index === -1) {
    return { success: false };
  }
  
  const stopped = body.activeBleeds.splice(index, 1)[0];
  
  return {
    success: true,
    stoppedBleeding: stopped,
  };
}

/**
 * Останавливает все кровотечения определённого типа или слабее
 */
export function stopBleedingsUpTo(
  body: BodyStructure,
  maxType: BleedingType
): {
  stoppedCount: number;
  stoppedTypes: BleedingType[];
} {
  const typeOrder: BleedingType[] = ['minor', 'moderate', 'severe', 'critical', 'arterial'];
  const maxIndex = typeOrder.indexOf(maxType);
  
  const stoppedTypes: BleedingType[] = [];
  let stoppedCount = 0;
  
  body.activeBleeds = body.activeBleeds.filter(bleeding => {
    const bleedIndex = typeOrder.indexOf(bleeding.type);
    if (bleedIndex <= maxIndex) {
      stoppedCount++;
      if (!stoppedTypes.includes(bleeding.type)) {
        stoppedTypes.push(bleeding.type);
      }
      return false; // Удалить
    }
    return true; // Оставить
  });
  
  return { stoppedCount, stoppedTypes };
}

/**
 * Автоматическая остановка кровотечений для высокого уровня культивации
 */
export function autoStopBleedingsForCultivator(
  body: BodyStructure,
  cultivationLevel: number
): {
  stopped: boolean;
  stoppedCount: number;
} {
  // Уровень 7+ - автоматическая остановка кровотечений
  if (cultivationLevel < 7) {
    return { stopped: false, stoppedCount: 0 };
  }
  
  const { stoppedCount } = stopBleedingsUpTo(body, 'critical');
  
  return { stopped: true, stoppedCount };
}

// ==================== УТИЛИТЫ ====================

/**
 * Получает общее кровотечение за ТИК
 */
export function getTotalBleedingPerTick(body: BodyStructure): number {
  return body.activeBleeds.reduce(
    (sum, bleed) => sum + bleed.damagePerTick,
    0
  );
}

/**
 * Получает все кровотечения определённой части тела
 */
export function getBleedingsByPart(
  body: BodyStructure,
  partId: string
): BleedingEffect[] {
  return body.activeBleeds.filter(b => b.sourcePartId === partId);
}

/**
 * Проверяет, есть ли критические кровотечения
 */
export function hasCriticalBleeding(body: BodyStructure): boolean {
  return body.activeBleeds.some(
    b => b.type === 'critical' || b.type === 'arterial'
  );
}

/**
 * Вспомогательная функция для определения статуса
 */
function getLimbStatusFromHP(hp: { functional: { max: number; current: number }; structural: { max: number; current: number } }): LimbStatus {
  const funcPercent = hp.functional.max > 0 ? hp.functional.current / hp.functional.max : 0;
  const structPercent = hp.structural.max > 0 ? hp.structural.current / hp.structural.max : 1;
  
  if (hp.structural.current <= 0) return 'severed';
  if (funcPercent === 0) return structPercent <= 0.3 ? 'critical' : 'paralyzed';
  if (structPercent <= 0.3) return 'critical';
  if (funcPercent <= 0.5) return 'crippled';
  if (funcPercent <= 0.8) return 'damaged';
  return 'healthy';
}

/**
 * Экспортирует ID для импорта типа LimbStatus
 */
export type { LimbStatus } from '@/types/body';
