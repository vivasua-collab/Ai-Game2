/**
 * Симуляция развития характеристик
 *
 * Версия: 1.0
 * Цель: Подтвердить баланс системы развития
 *
 * Ожидаемые результаты (из docs/development-1000-days-calculation.md):
 * - 1000 дней: достижим стат ~55
 * - 10000 дней: достижим стат ~125
 */

import type { StatName, StatDevelopment, CharacterStatsDevelopment } from '@/types/stat-development';
import {
  calculateStatThreshold,
  daysToAdvance,
  createInitialStatDevelopment,
  advanceStatAll,
  applyAllAdvancements,
} from './stat-threshold';
import {
  addVirtualDelta,
  calculateMaxConsolidation,
} from './stat-development';
import { STAT_DEVELOPMENT_CONSTANTS } from './constants';

// ==================== КОНФИГУРАЦИЯ СИМУЛЯЦИИ ====================

export interface SimulationConfig {
  /** Дни симуляции */
  totalDays: number;

  /** Процент активных дней */
  activeDaysRatio: number;

  /** Ежедневное закрепление (кап за 8ч сна) */
  dailyConsolidation: number;

  /** Фокусная характеристика (null = равномерно) */
  focusedStat: StatName | null;

  /** Начальные статы */
  initialStats: Record<StatName, number>;
}

const DEFAULT_CONFIG: SimulationConfig = {
  totalDays: 1000,
  activeDaysRatio: 0.75,
  dailyConsolidation: STAT_DEVELOPMENT_CONSTANTS.MAX_CONSOLIDATION_PER_SLEEP,
  focusedStat: 'strength',
  initialStats: {
    strength: 10,
    agility: 10,
    intelligence: 10,
    vitality: 10,
  },
};

// ==================== РЕЗУЛЬТАТЫ СИМУЛЯЦИИ ====================

export interface SimulationDay {
  day: number;
  stats: Record<StatName, number>;
  virtualDeltas: Record<StatName, number>;
  advancements: Record<StatName, number>;
}

export interface SimulationResult {
  config: SimulationConfig;
  days: SimulationDay[];
  finalStats: Record<StatName, number>;
  totalAdvancements: Record<StatName, number>;
  summary: {
    reachableStat: number;
    daysPerAdvancement: number;
    thresholdAnalysis: Array<{
      stat: number;
      threshold: number;
      daysToNext: number;
    }>;
  };
}

// ==================== СИМУЛЯЦИЯ ====================

/**
 * Запускает симуляцию развития
 */
export function runSimulation(config: SimulationConfig = DEFAULT_CONFIG): SimulationResult {
  const stats: Record<StatName, StatDevelopment> = {
    strength: createInitialStatDevelopment(config.initialStats.strength),
    agility: createInitialStatDevelopment(config.initialStats.agility),
    intelligence: createInitialStatDevelopment(config.initialStats.intelligence),
    vitality: createInitialStatDevelopment(config.initialStats.vitality),
  };

  const totalAdvancements: Record<StatName, number> = {
    strength: 0,
    agility: 0,
    intelligence: 0,
    vitality: 0,
  };

  const days: SimulationDay[] = [];

  const activeDays = Math.floor(config.totalDays * config.activeDaysRatio);

  for (let day = 1; day <= config.totalDays; day++) {
    const isActiveDay = day <= activeDays;

    if (isActiveDay) {
      // Добавляем виртуальную дельту
      if (config.focusedStat) {
        // Фокусная тренировка — весь прогресс в один стат
        const result = addVirtualDelta(
          stats[config.focusedStat],
          config.dailyConsolidation,
          'training'
        );
        stats[config.focusedStat] = result.stat;
        totalAdvancements[config.focusedStat] += result.advancementCount;
      } else {
        // Равномерное распределение
        const deltaPerStat = config.dailyConsolidation / 4;
        for (const statName of Object.keys(stats) as StatName[]) {
          const result = addVirtualDelta(
            stats[statName],
            deltaPerStat,
            'training'
          );
          stats[statName] = result.stat;
          totalAdvancements[statName] += result.advancementCount;
        }
      }
    }

    // Логируем каждый 100-й день
    if (day % 100 === 0 || day === config.totalDays) {
      days.push({
        day,
        stats: {
          strength: stats.strength.current,
          agility: stats.agility.current,
          intelligence: stats.intelligence.current,
          vitality: stats.vitality.current,
        },
        virtualDeltas: {
          strength: stats.strength.virtualDelta,
          agility: stats.agility.virtualDelta,
          intelligence: stats.intelligence.virtualDelta,
          vitality: stats.vitality.virtualDelta,
        },
        advancements: { ...totalAdvancements },
      });
    }
  }

  // Определяем достижимый стат
  const focusedFinal = config.focusedStat
    ? stats[config.focusedStat].current
    : Math.max(...Object.values(stats).map((s) => s.current));

  // Анализ порогов
  const thresholdAnalysis = [];
  for (let stat = 10; stat <= focusedFinal + 20; stat++) {
    thresholdAnalysis.push({
      stat,
      threshold: calculateStatThreshold(stat),
      daysToNext: daysToAdvance(
        stat,
        config.dailyConsolidation,
        config.activeDaysRatio
      ),
    });
  }

  return {
    config,
    days,
    finalStats: {
      strength: stats.strength.current,
      agility: stats.agility.current,
      intelligence: stats.intelligence.current,
      vitality: stats.vitality.current,
    },
    totalAdvancements,
    summary: {
      reachableStat: focusedFinal,
      daysPerAdvancement: config.totalDays / (focusedFinal - 10),
      thresholdAnalysis,
    },
  };
}

/**
 * Запускает серию симуляций для анализа
 */
export function runAnalysisSeries(): {
  simulation1000: SimulationResult;
  simulation10000: SimulationResult;
  comparison: {
    stat1000: number;
    stat10000: number;
    expected1000: number;
    expected10000: number;
    deviation1000: number;
    deviation10000: number;
  };
} {
  const config1000: SimulationConfig = {
    ...DEFAULT_CONFIG,
    totalDays: 1000,
  };

  const config10000: SimulationConfig = {
    ...DEFAULT_CONFIG,
    totalDays: 10000,
  };

  const simulation1000 = runSimulation(config1000);
  const simulation10000 = runSimulation(config10000);

  const expected1000 = 55; // Из документации
  const expected10000 = 125; // Из документации

  return {
    simulation1000,
    simulation10000,
    comparison: {
      stat1000: simulation1000.summary.reachableStat,
      stat10000: simulation10000.summary.reachableStat,
      expected1000,
      expected10000,
      deviation1000: Math.abs(simulation1000.summary.reachableStat - expected1000),
      deviation10000: Math.abs(simulation10000.summary.reachableStat - expected10000),
    },
  };
}

/**
 * Формирует отчёт симуляции
 */
export function formatSimulationReport(result: SimulationResult): string {
  const lines: string[] = [];

  lines.push('═'.repeat(60));
  lines.push('📊 ОТЧЁТ СИМУЛЯЦИИ РАЗВИТИЯ');
  lines.push('═'.repeat(60));
  lines.push('');

  lines.push('📋 Конфигурация:');
  lines.push(`   Дней: ${result.config.totalDays}`);
  lines.push(
    `   Активных дней: ${Math.floor(result.config.totalDays * result.config.activeDaysRatio)} (${result.config.activeDaysRatio * 100}%)`
  );
  lines.push(`   Ежедневное закрепление: +${result.config.dailyConsolidation}`);
  lines.push(`   Фокус: ${result.config.focusedStat || 'равномерно'}`);
  lines.push('');

  lines.push('📈 Финальные статы:');
  for (const [stat, value] of Object.entries(result.finalStats)) {
    const advancements = result.totalAdvancements[stat as StatName];
    lines.push(`   ${stat}: ${value} (+${advancements} повышений)`);
  }
  lines.push('');

  lines.push('📊 Сводка:');
  lines.push(`   Достижимый стат: ${result.summary.reachableStat}`);
  lines.push(`   Дней на +1 (среднее): ${result.summary.daysPerAdvancement.toFixed(1)}`);
  lines.push('');

  lines.push('📈 Прогресс по дням:');
  for (const day of result.days) {
    const focusedStat = result.config.focusedStat || 'strength';
    const stat = day.stats[focusedStat];
    lines.push(`   День ${day.day.toString().padStart(5)}: стат ${stat}`);
  }
  lines.push('');

  lines.push('🎯 Анализ порогов:');
  for (const entry of result.summary.thresholdAnalysis.slice(0, 10)) {
    lines.push(
      `   Стат ${entry.stat}: порог ${entry.threshold}, ${entry.daysToNext} дней до +1`
    );
  }
  lines.push('   ...');
  lines.push('');

  lines.push('═'.repeat(60));

  return lines.join('\n');
}

// ==================== ЭКСПОРТ ДЛЯ ТЕСТОВ ====================

export type { SimulationConfig, SimulationResult, SimulationDay };
