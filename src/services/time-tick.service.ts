/**
 * Time Tick Service
 * 
 * ЕДИНАЯ ТОЧКА ОБРАБОТКИ ТИКОВ ВРЕМЕНИ
 * 
 * Все эффекты, связанные со временем, обрабатываются здесь:
 * - Пассивная генерация Ци ядром (до 90% ёмкости)
 * - Пассивное рассеивание избыточной Ци (свыше 100% ёмкости)
 * - Восстановление усталости
 * 
 * ВАЖНО: Все расчёты ядра и меридиан проводятся через qi-shared.ts и conductivity-system.ts
 */

import { db } from '@/lib/db';
import { 
  QI_CONSTANTS, 
  FATIGUE_CONSTANTS, 
  FATIGUE_RECOVERY_BY_LEVEL,
  FATIGUE_ACCUMULATION_BY_LEVEL,
} from '@/lib/game/constants';
import {
  calculateCoreGenerationRate,
  calculatePassiveQiGain,
  calculatePassiveQiDissipation,
  type QiDissipationResult,
} from '@/lib/game/qi-shared';
import { calculateTotalConductivity } from '@/lib/game/conductivity-system';
import { advanceWorldTime } from '@/lib/game/time-db';

// ==================== ТИПЫ ====================

export interface TimeTickResult {
  success: boolean;
  ticksAdvanced: number;
  dayChanged: boolean;
  
  // Эффекты Ци
  qiEffects: {
    passiveGain: number;      // Пассивная генерация ядром
    dissipation: number;      // Рассеивание избыточной Ци
    finalQi: number;          // Итоговое количество Ци
  };
  
  // Эффекты усталости
  fatigueEffects?: {
    physicalRecovery: number;
    mentalRecovery: number;
    finalPhysical: number;
    finalMental: number;
  };
  
  // Информация о проводимости (для справки)
  conductivityInfo?: {
    base: number;
    total: number;
    meditationBonus: number;
  };
}

export interface ProcessTimeTickOptions {
  characterId: string;
  ticks: number;              // Количество тиков (минут)
  sessionId: string;
  
  // Опциональные параметры
  restType?: 'light' | 'sleep';  // Если указан - восстанавливается усталость
  applyPassiveQi?: boolean;       // Применять ли пассивную генерацию Ци (по умолчанию true)
  applyDissipation?: boolean;     // Применять ли рассеивание Ци (по умолчанию true)
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Обработать эффекты тиков времени
 * 
 * ЕДИНАЯ ФУНКЦИЯ для всех эффектов, связанных со временем.
 * Вызывается из всех API, которые продвигают время.
 */
export async function processTimeTickEffects(
  options: ProcessTimeTickOptions
): Promise<TimeTickResult> {
  const {
    characterId,
    ticks,
    sessionId,
    restType,
    applyPassiveQi = true,
    applyDissipation = true,
  } = options;
  
  // Получаем персонажа
  const character = await db.character.findUnique({
    where: { id: characterId },
    select: {
      id: true,
      coreCapacity: true,
      currentQi: true,
      cultivationLevel: true,
      conductivityMeditations: true,
      fatigue: true,
      mentalFatigue: true,
    },
  });
  
  if (!character) {
    return {
      success: false,
      ticksAdvanced: 0,
      dayChanged: false,
      qiEffects: {
        passiveGain: 0,
        dissipation: 0,
        finalQi: 0,
      },
    };
  }
  
  // Продвигаем мировое время
  const timeResult = await advanceWorldTime(sessionId, ticks);
  
  // === РАСЧЁТ ЦИ ===
  let currentQi = character.currentQi;
  let passiveGain = 0;
  let dissipation = 0;
  
  // Время в секундах (1 тик = 1 минута = 60 секунд)
  const durationSeconds = ticks * 60;
  
  // 1. Пассивное рассеивание избыточной Ци (если ядро переполнено)
  if (applyDissipation && currentQi > character.coreCapacity) {
    const conductivity = calculateTotalConductivity(
      character.coreCapacity,
      character.cultivationLevel,
      character.conductivityMeditations || 0
    );
    
    const dissipationResult = calculatePassiveQiDissipation(
      currentQi,
      character.coreCapacity,
      conductivity,
      durationSeconds
    );
    
    currentQi = dissipationResult.newQi;
    dissipation = dissipationResult.dissipated;
  }
  
  // 2. Пассивная генерация Ци ядром (только если НЕ переполнено и ниже 90%)
  if (applyPassiveQi && currentQi < character.coreCapacity) {
    const coreGenerationRate = calculateCoreGenerationRate(character.coreCapacity);
    passiveGain = calculatePassiveQiGain(
      currentQi,
      character.coreCapacity,
      coreGenerationRate,
      durationSeconds
    );
    
    currentQi = Math.min(
      character.coreCapacity * QI_CONSTANTS.PASSIVE_QI_CAP, // Кап 90%
      currentQi + passiveGain
    );
  }
  
  // === РАСЧЁТ УСТАЛОСТИ (если отдых) ===
  let fatigueEffects: TimeTickResult['fatigueEffects'] | undefined;
  
  if (restType) {
    const levelMultiplier = FATIGUE_RECOVERY_BY_LEVEL[character.cultivationLevel] || 1.0;
    
    let physicalRecovery: number;
    let mentalRecovery: number;
    
    if (restType === 'sleep') {
      physicalRecovery = ticks * FATIGUE_CONSTANTS.SLEEP_PHYSICAL_RECOVERY * levelMultiplier;
      mentalRecovery = ticks * FATIGUE_CONSTANTS.SLEEP_MENTAL_RECOVERY * levelMultiplier;
    } else {
      physicalRecovery = ticks * FATIGUE_CONSTANTS.REST_LIGHT_PHYSICAL * levelMultiplier;
      mentalRecovery = ticks * FATIGUE_CONSTANTS.REST_LIGHT_MENTAL * levelMultiplier;
    }
    
    const newPhysicalFatigue = Math.max(0, character.fatigue - physicalRecovery);
    const newMentalFatigue = Math.max(0, character.mentalFatigue - mentalRecovery);
    
    fatigueEffects = {
      physicalRecovery,
      mentalRecovery,
      finalPhysical: newPhysicalFatigue,
      finalMental: newMentalFatigue,
    };
    
    // Обновляем персонажа в БД
    await db.character.update({
      where: { id: characterId },
      data: {
        currentQi: Math.floor(currentQi),
        fatigue: newPhysicalFatigue,
        mentalFatigue: newMentalFatigue,
      },
    });
  } else {
    // Только обновляем Ци
    await db.character.update({
      where: { id: characterId },
      data: {
        currentQi: Math.floor(currentQi),
      },
    });
  }
  
  // === ИНФОРМАЦИЯ О ПРОВОДИМОСТИ ===
  const conductivity = calculateTotalConductivity(
    character.coreCapacity,
    character.cultivationLevel,
    character.conductivityMeditations || 0
  );
  
  const baseConductivity = character.coreCapacity / 360;
  const meditationBonus = conductivity - baseConductivity;
  
  return {
    success: true,
    ticksAdvanced: timeResult.ticksAdvanced,
    dayChanged: timeResult.dayChanged,
    qiEffects: {
      passiveGain: Math.floor(passiveGain),
      dissipation: Math.floor(dissipation),
      finalQi: Math.floor(currentQi),
    },
    fatigueEffects,
    conductivityInfo: {
      base: baseConductivity,
      total: conductivity,
      meditationBonus,
    },
  };
}

/**
 * Быстрое обновление Ци без отдыха
 * Используется при движении и других действиях
 */
export async function quickProcessQiTick(
  characterId: string,
  sessionId: string,
  ticks: number
): Promise<TimeTickResult> {
  return processTimeTickEffects({
    characterId,
    sessionId,
    ticks,
    applyPassiveQi: true,
    applyDissipation: true,
  });
}

/**
 * Получить текущую проводимость персонажа
 * Единая функция для всех API
 */
export async function getCharacterConductivity(characterId: string): Promise<{
  base: number;
  total: number;
  meditationBonus: number;
  meditationCount: number;
  maxMeditations: number;
}> {
  const character = await db.character.findUnique({
    where: { id: characterId },
    select: {
      coreCapacity: true,
      cultivationLevel: true,
      conductivityMeditations: true,
    },
  });
  
  if (!character) {
    return {
      base: 0,
      total: 0,
      meditationBonus: 0,
      meditationCount: 0,
      maxMeditations: 0,
    };
  }
  
  const baseConductivity = character.coreCapacity / 360;
  const totalConductivity = calculateTotalConductivity(
    character.coreCapacity,
    character.cultivationLevel,
    character.conductivityMeditations || 0
  );
  
  // Максимальное количество медитаций для уровня
  const maxMeditationsByLevel: Record<number, number> = {
    1: 5, 2: 10, 3: 15, 4: 20, 5: 25,
    6: 30, 7: 40, 8: 50, 9: 60,
  };
  
  return {
    base: baseConductivity,
    total: totalConductivity,
    meditationBonus: totalConductivity - baseConductivity,
    meditationCount: character.conductivityMeditations || 0,
    maxMeditations: maxMeditationsByLevel[character.cultivationLevel] || 5,
  };
}
