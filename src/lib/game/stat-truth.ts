/**
 * ============================================================================
 * STAT DEVELOPMENT TRUTH SYSTEM - Расширение TruthSystem для работы со статами
 * ============================================================================
 * 
 * Интеграция Stat Development с Truth System.
 * Предоставляет методы для работы с развитием характеристик.
 * 
 * Версия: 1.0.0
 * ============================================================================
 */

import { TruthSystem } from './truth-system';
import type { StatName, CharacterStatsDevelopment, StatDevelopment, AddDeltaResult, DeltaSource } from '@/types/stat-development';
import {
  addVirtualDelta,
  processSleep,
  calculateMaxConsolidation,
  calculateFatiguePenalty,
} from './stat-development';
import {
  createInitialStatsDevelopment,
  deserializeStatsDevelopment,
  serializeStatsDevelopment,
} from './stat-threshold';
import { STAT_DEVELOPMENT_CONSTANTS } from './constants';

// ==================== РАСШИРЕНИЕ TRUTH SYSTEM ====================

/**
 * Получить развитие характеристик персонажа
 * 
 * Если поле statsDevelopment отсутствует, создаётся начальное состояние.
 */
export function getStatsDevelopment(sessionId: string): CharacterStatsDevelopment {
  const session = TruthSystem.getSessionState(sessionId);
  
  if (!session) {
    console.warn('[StatTruth] Session not loaded:', sessionId);
    return createInitialStatsDevelopment();
  }
  
  // Проверяем, есть ли кастомное поле statsDevelopment
  const character = session.character as any;
  
  if (character.statsDevelopment) {
    if (typeof character.statsDevelopment === 'string') {
      return deserializeStatsDevelopment(character.statsDevelopment);
    }
    return character.statsDevelopment as CharacterStatsDevelopment;
  }
  
  // Создаём начальное состояние на основе текущих статов
  const initial = createInitialStatsDevelopment();
  
  // Устанавливаем текущие значения
  initial.strength.current = session.character.strength;
  initial.agility.current = session.character.agility;
  initial.intelligence.current = session.character.intelligence;
  initial.vitality.current = 10; // vitality не хранится в CharacterState
  
  return initial;
}

/**
 * Сохранить развитие характеристик
 */
export function setStatsDevelopment(
  sessionId: string,
  stats: CharacterStatsDevelopment
): void {
  const session = TruthSystem.getSessionState(sessionId);
  
  if (!session) {
    console.warn('[StatTruth] Session not loaded:', sessionId);
    return;
  }
  
  // Сохраняем в расширенном поле
  (session.character as any).statsDevelopment = stats;
  
  // Обновляем основные статы для совместимости
  session.character.strength = stats.strength.current;
  session.character.agility = stats.agility.current;
  session.character.intelligence = stats.intelligence.current;
  
  session.isDirty = true;
}

/**
 * Добавить виртуальную дельту к характеристике
 * 
 * @returns Результат добавления (с информацией о повышении)
 */
export function addStatDelta(
  sessionId: string,
  targetStat: StatName,
  amount: number,
  source: DeltaSource
): AddDeltaResult {
  const stats = getStatsDevelopment(sessionId);
  const result = addVirtualDelta(stats[targetStat], amount, source);
  
  // Обновляем статы
  const updatedStats = {
    ...stats,
    [targetStat]: result.stat,
  };
  
  setStatsDevelopment(sessionId, updatedStats);
  
  // Логируем если было повышение
  if (result.advanced) {
    console.log(
      `[StatTruth] ${targetStat} advanced from ${result.stat.current - result.advancementCount} to ${result.stat.current} (${result.advancementCount} times)`
    );
  }
  
  return result;
}

/**
 * Обработать сон и закрепление
 * 
 * @returns Результаты закрепления по всем статам
 */
export function processSleepConsolidation(
  sessionId: string,
  sleepHours: number
): ReturnType<typeof processSleep> {
  const stats = getStatsDevelopment(sessionId);
  const statsData = serializeStatsDevelopment(stats);
  
  const result = processSleep(statsData, sleepHours);
  
  // Сохраняем обновлённые статы
  setStatsDevelopment(sessionId, result.updatedStats);
  
  // Обновляем базовые статы в CharacterState
  const session = TruthSystem.getSessionState(sessionId);
  if (session) {
    session.character.strength = result.updatedStats.strength.current;
    session.character.agility = result.updatedStats.agility.current;
    session.character.intelligence = result.updatedStats.intelligence.current;
    session.isDirty = true;
  }
  
  // Логируем повышения
  if (result.result.totalAdvancements > 0) {
    console.log(
      `[StatTruth] Sleep consolidation: ${result.result.totalAdvancements} advancements`
    );
  }
  
  return result;
}

/**
 * Получить информацию о прогрессе характеристики
 */
export function getStatProgress(sessionId: string, statName: StatName): {
  current: number;
  virtualDelta: number;
  threshold: number;
  progress: number;
} {
  const stats = getStatsDevelopment(sessionId);
  const stat = stats[statName];
  
  return {
    current: stat.current,
    virtualDelta: stat.virtualDelta,
    threshold: stat.threshold,
    progress: stat.threshold > 0 ? Math.min(1, stat.virtualDelta / stat.threshold) : 0,
  };
}

/**
 * Получить всё развитие персонажа для отправки клиенту
 */
export function getStatsDevelopmentForClient(sessionId: string): {
  stats: CharacterStatsDevelopment;
  progressInfo: Record<StatName, {
    current: number;
    progress: number;
    estimatedDaysToAdvance: number;
  }>;
} {
  const stats = getStatsDevelopment(sessionId);
  const statNames: StatName[] = ['strength', 'agility', 'intelligence', 'vitality'];
  
  const progressInfo: Record<StatName, {
    current: number;
    progress: number;
    estimatedDaysToAdvance: number;
  }> = {} as any;
  
  for (const name of statNames) {
    const stat = stats[name];
    const progress = stat.threshold > 0 ? stat.virtualDelta / stat.threshold : 0;
    
    // Расчёт дней до повышения
    const remainingDelta = stat.threshold - stat.virtualDelta;
    const dailyRate = STAT_DEVELOPMENT_CONSTANTS.MAX_CONSOLIDATION_PER_SLEEP * 0.75;
    const estimatedDays = remainingDelta > 0 ? Math.ceil(remainingDelta / dailyRate) : 0;
    
    progressInfo[name] = {
      current: stat.current,
      progress: Math.min(1, progress),
      estimatedDaysToAdvance: estimatedDays,
    };
  }
  
  return { stats, progressInfo };
}

// ==================== ЭКСПОРТ УТИЛИТ ====================

/**
 * Рассчитать дельту для боевого действия
 */
export function calculateCombatDelta(
  actionType: 'hit' | 'block' | 'dodge' | 'critical',
  fatiguePenalty: number = 1.0
): { targetStat: StatName; amount: number } {
  const sources = STAT_DEVELOPMENT_CONSTANTS.DELTA_SOURCES;
  
  switch (actionType) {
    case 'hit':
      return {
        targetStat: 'strength',
        amount: sources.combat_hit * fatiguePenalty,
      };
    case 'critical':
      return {
        targetStat: 'strength',
        amount: sources.combat_hit * 1.5 * fatiguePenalty,
      };
    case 'block':
      return {
        targetStat: 'strength',
        amount: sources.combat_block * fatiguePenalty,
      };
    case 'dodge':
      return {
        targetStat: 'agility',
        amount: sources.combat_dodge * fatiguePenalty,
      };
    default:
      return {
        targetStat: 'strength',
        amount: sources.combat_hit * fatiguePenalty,
      };
  }
}

/**
 * Рассчитать штраф усталости для развития
 */
export function calculateFatiguePenaltyForDevelopment(
  physicalFatigue: number,
  mentalFatigue: number
): number {
  return calculateFatiguePenalty(physicalFatigue, mentalFatigue);
}
