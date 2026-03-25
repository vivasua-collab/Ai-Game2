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
 * 
 * ИНТЕГРАЦИЯ TRUTHSYSTEM:
 * - Читает данные из памяти (ПАМЯТЬ ПЕРВИЧНА!)
 * - Обновляет данные через TruthSystem
 * - БД обновляется только через автосохранение TruthSystem
 * 
 * Phase 7.5: Time migration
 * - Убран прямой вызов advanceWorldTime() из time-db.ts
 * - Время обновляется только через TruthSystem.advanceTime()
 * - TruthSystem синхронизируется с TickTimer через game:tick
 * 
 * @module time-tick-service
 * @updated 2026-03-24
 */

import { db } from '@/lib/db';
import { TruthSystem } from '@/lib/game/truth-system';
import { logQiChange } from '@/lib/logger/qi-logger';
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
import { calculateTotalConductivity, getBaseConductivity, getMaxConductivityMeditations } from '@/lib/game/conductivity-system';
// Phase 7.5: Removed advanceWorldTime import - time managed by TruthSystem

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

// Максимальное количество тиков за один запрос (anti-abuse: 1 день = 1440 минут)
const MAX_TICKS_PER_REQUEST = 1440;

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Обработать эффекты тиков времени
 * 
 * ЕДИНАЯ ФУНКЦИЯ для всех эффектов, связанных со временем.
 * Вызывается из всех API, которые продвигают время.
 * 
 * ВАЖНО: Использует TruthSystem для чтения/записи данных!
 * ПАМЯТЬ ПЕРВИЧНА, БД - вторична.
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
  
  // === РАННЯЯ ВАЛИДАЦИЯ ТИКОВ ===
  // Защита от NaN, Infinity, отрицательных и нулевых значений
  if (typeof ticks !== 'number' || !Number.isFinite(ticks)) {
    console.error(`[time-tick] Invalid ticks: ${ticks} (NaN/Infinity not allowed)`);
    return {
      success: false,
      ticksAdvanced: 0,
      dayChanged: false,
      qiEffects: { passiveGain: 0, dissipation: 0, finalQi: 0 },
    };
  }
  
  if (!Number.isInteger(ticks)) {
    console.error(`[time-tick] Non-integer ticks: ${ticks}`);
    return {
      success: false,
      ticksAdvanced: 0,
      dayChanged: false,
      qiEffects: { passiveGain: 0, dissipation: 0, finalQi: 0 },
    };
  }
  
  if (ticks <= 0) {
    console.error(`[time-tick] Non-positive ticks: ${ticks}`);
    return {
      success: false,
      ticksAdvanced: 0,
      dayChanged: false,
      qiEffects: { passiveGain: 0, dissipation: 0, finalQi: 0 },
    };
  }
  
  if (ticks > MAX_TICKS_PER_REQUEST) {
    console.error(`[time-tick] Excessive ticks: ${ticks} > ${MAX_TICKS_PER_REQUEST}`);
    return {
      success: false,
      ticksAdvanced: 0,
      dayChanged: false,
      qiEffects: { passiveGain: 0, dissipation: 0, finalQi: 0 },
    };
  }
  
  // === ИСПОЛЬЗУЕМ TRUTHSYSTEM (ПАМЯТЬ ПЕРВИЧНА!) ===
  const truthSystem = TruthSystem.getInstance();
  
  // Получаем сессию из памяти
  let sessionState = truthSystem.getSessionState(sessionId);
  
  // Если сессия не в памяти - загружаем
  if (!sessionState) {
    const loadResult = await truthSystem.loadSession(sessionId);
    if (!loadResult.success || !loadResult.data) {
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
    sessionState = loadResult.data;
  }
  
  const character = sessionState.character;
  
  // Phase 7.5: Продвигаем время через TruthSystem
  const timeResult = truthSystem.advanceTime(sessionId, ticks);
  
  // === РАСЧЁТ ЦИ ===
  let currentQi = character.currentQi;
  const previousQi = currentQi;
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
    
    // Логируем рассеивание
    if (dissipation > 0) {
      logQiChange(sessionId, character.id, {
        oldQi: previousQi,
        newQi: currentQi,
        source: 'dissipation',
        reason: `passive dissipation over ${durationSeconds}s`,
        details: { dissipated: dissipation, durationSeconds },
      });
    }
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
    
    const oldQi = currentQi;
    currentQi = Math.min(
      character.coreCapacity * QI_CONSTANTS.PASSIVE_QI_CAP, // Кап 90%
      currentQi + passiveGain
    );
    
    // Логируем пассивный прирост
    if (passiveGain > 0) {
      logQiChange(sessionId, character.id, {
        oldQi: oldQi,
        newQi: currentQi,
        source: 'passive',
        reason: `core generation over ${durationSeconds}s`,
        details: { passiveGain, durationSeconds },
      });
    }
  }
  
  // === ОБНОВЛЯЕМ ЧЕРЕЗ TRUTHSYSTEM ===
  // ВАЖНО: Не трогаем accumulatedQi! Только currentQi
  truthSystem.updateCharacter(sessionId, {
    currentQi: Math.floor(currentQi),
  }, 'time-tick: passive qi');
  
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
    
    // Обновляем усталость через TruthSystem
    const fatigueResult = truthSystem.recoverFatigue(sessionId, physicalRecovery, mentalRecovery);
    
    if (fatigueResult.success && fatigueResult.data) {
      fatigueEffects = {
        physicalRecovery,
        mentalRecovery,
        finalPhysical: fatigueResult.data.fatigue,
        finalMental: fatigueResult.data.mentalFatigue,
      };
    }
  }
  
  // === ИНФОРМАЦИЯ О ПРОВОДИМОСТИ ===
  const conductivity = calculateTotalConductivity(
    character.coreCapacity,
    character.cultivationLevel,
    character.conductivityMeditations || 0
  );
  
  // Используем единую функцию из conductivity-system.ts
  const baseConductivity = getBaseConductivity(character.coreCapacity);
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
  
  // Используем единые функции из conductivity-system.ts
  const baseConductivity = getBaseConductivity(character.coreCapacity);
  const totalConductivity = calculateTotalConductivity(
    character.coreCapacity,
    character.cultivationLevel,
    character.conductivityMeditations || 0
  );
  
  const maxMeditations = getMaxConductivityMeditations(character.cultivationLevel);
  
  return {
    base: baseConductivity,
    total: totalConductivity,
    meditationBonus: totalConductivity - baseConductivity,
    meditationCount: character.conductivityMeditations || 0,
    maxMeditations,
  };
}
