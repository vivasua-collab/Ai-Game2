/**
 * Система усталости - серверная математика
 * 
 * Два типа усталости:
 * - Физическая: от действий с телом (движение, бой, физический труд)
 * - Ментальная: от действий с Ци (трата Ци, техники, культивация)
 * 
 * Влияние уровня культивации:
 * - Чем выше уровень, тем медленнее накапливается усталость
 * - Чем выше уровень, тем быстрее восстанавливается
 * - Практик 9-го уровня может не спать неделями!
 * 
 * Восстановление во сне (8 часов = ~50% для базового уровня)
 */

import type { Character, Location } from "@/types/game";
import { 
  FATIGUE_CONSTANTS, 
  FATIGUE_RECOVERY_BY_LEVEL, 
  FATIGUE_ACCUMULATION_BY_LEVEL 
} from "./constants";

// Типы действий для расчёта усталости
export type ActionType = 
  | "meditation_accumulation"
  | "meditation_breakthrough"
  | "combat_light"
  | "combat_heavy"
  | "technique_basic"
  | "technique_advanced"
  | "physical_travel"
  | "physical_labor"
  | "rest_light"
  | "rest_sleep"
  | "qi_expenditure";

// Параметры усталости для действий
interface FatigueRates {
  physicalPerMinute: number;
  mentalPerMinute: number;
}

// Таблица усталости для разных действий
// Отрицательные значения = восстановление
const FATIGUE_RATES: Record<ActionType, FatigueRates> = {
  meditation_accumulation: { physicalPerMinute: 0.05, mentalPerMinute: 0.1 }, // 3%/6% за час
  meditation_breakthrough: { physicalPerMinute: 0.05, mentalPerMinute: 0.2 }, // 3%/12% за час
  combat_light: { physicalPerMinute: 0.3, mentalPerMinute: 0.1 }, // 18%/6% за час
  combat_heavy: { physicalPerMinute: 0.5, mentalPerMinute: 0.2 }, // 30%/12% за час
  technique_basic: { physicalPerMinute: 0.1, mentalPerMinute: 0.15 }, // 6%/9% за час
  technique_advanced: { physicalPerMinute: 0.15, mentalPerMinute: 0.3 }, // 9%/18% за час
  physical_travel: { physicalPerMinute: 0.15, mentalPerMinute: 0.02 }, // 9%/1.2% за час
  physical_labor: { physicalPerMinute: 0.25, mentalPerMinute: 0.05 }, // 15%/3% за час
  // Восстановление - берём из констант
  rest_light: { 
    physicalPerMinute: -FATIGUE_CONSTANTS.REST_LIGHT_PHYSICAL, 
    mentalPerMinute: -FATIGUE_CONSTANTS.REST_LIGHT_MENTAL 
  },
  rest_sleep: { 
    physicalPerMinute: -FATIGUE_CONSTANTS.SLEEP_PHYSICAL_RECOVERY, 
    mentalPerMinute: -FATIGUE_CONSTANTS.SLEEP_MENTAL_RECOVERY 
  },
  qi_expenditure: { physicalPerMinute: 0.02, mentalPerMinute: 0.15 }, // трата Ци без медитации
};

// Результат расчёта усталости
export interface FatigueResult {
  physicalFatigue: number;
  mentalFatigue: number;
  physicalChange: number;
  mentalChange: number;
  warnings: string[];
  canPerform: boolean;
}

/**
 * Получить множитель накопления усталости для уровня персонажа
 */
export function getFatigueAccumulationMultiplier(cultivationLevel: number): number {
  return FATIGUE_ACCUMULATION_BY_LEVEL[cultivationLevel] || 1.0;
}

/**
 * Получить множитель восстановления усталости для уровня персонажа
 */
export function getFatigueRecoveryMultiplier(cultivationLevel: number): number {
  return FATIGUE_RECOVERY_BY_LEVEL[cultivationLevel] || 1.0;
}

// Расчёт усталости от действия
export function calculateFatigueFromAction(
  character: Character,
  action: ActionType,
  durationMinutes: number,
  qiSpent: number = 0
): FatigueResult {
  const rates = FATIGUE_RATES[action];
  const warnings: string[] = [];
  let canPerform = true;
  
  // Получаем множители от уровня культивации
  const accumulationMultiplier = getFatigueAccumulationMultiplier(character.cultivationLevel);
  const recoveryMultiplier = getFatigueRecoveryMultiplier(character.cultivationLevel);
  
  // Базовое изменение
  let physicalChange = rates.physicalPerMinute * durationMinutes;
  let mentalChange = rates.mentalPerMinute * durationMinutes;
  
  // Применяем множители в зависимости от типа действия
  if (physicalChange > 0) {
    // Накопление усталости - чем выше уровень, тем медленнее накапливается
    physicalChange *= accumulationMultiplier;
  } else {
    // Восстановление - чем выше уровень, тем быстрее восстанавливается
    physicalChange *= recoveryMultiplier;
  }
  
  if (mentalChange > 0) {
    mentalChange *= accumulationMultiplier;
  } else {
    mentalChange *= recoveryMultiplier;
  }
  
  // Дополнительная ментальная усталость от траты Ци (также зависит от уровня)
  if (qiSpent > 0) {
    mentalChange += qiSpent * 0.01 * accumulationMultiplier; // 1% ментальной усталости за 100 Ци
  }
  
  // Новые значения с ограничением 0-100
  let newPhysical = character.fatigue + physicalChange;
  let newMental = character.mentalFatigue + mentalChange;
  
  // Ограничения
  newPhysical = Math.max(0, Math.min(100, newPhysical));
  newMental = Math.max(0, Math.min(100, newMental));
  
  // Проверка возможности выполнения
  if (action !== "rest_light" && action !== "rest_sleep") {
    // Физические действия требуют физической энергии
    const physicalActions: ActionType[] = ["combat_light", "combat_heavy", "physical_travel", "physical_labor"];
    if (physicalActions.includes(action) && newPhysical >= FATIGUE_CONSTANTS.CRITICAL_FATIGUE_THRESHOLD) {
      warnings.push("Критическая физическая усталость. Действие невозможно.");
      canPerform = false;
    }
    
    // Ментальные действия требуют ментальной энергии
    const mentalActions: ActionType[] = ["meditation_accumulation", "meditation_breakthrough", "technique_basic", "technique_advanced", "qi_expenditure"];
    if (mentalActions.includes(action) && newMental >= FATIGUE_CONSTANTS.CRITICAL_FATIGUE_THRESHOLD) {
      warnings.push("Критическая ментальная усталость. Действие невозможно.");
      canPerform = false;
    }
  }
  
  // Предупреждения
  if (newPhysical >= FATIGUE_CONSTANTS.HIGH_FATIGUE_THRESHOLD && newPhysical < FATIGUE_CONSTANTS.CRITICAL_FATIGUE_THRESHOLD) {
    warnings.push("Высокая физическая усталость. Эффективность снижена.");
  }
  if (newMental >= FATIGUE_CONSTANTS.HIGH_FATIGUE_THRESHOLD && newMental < FATIGUE_CONSTANTS.CRITICAL_FATIGUE_THRESHOLD) {
    warnings.push("Высокая ментальная усталость. Контроль Ци затруднён.");
  }
  
  return {
    physicalFatigue: newPhysical,
    mentalFatigue: newMental,
    physicalChange: newPhysical - character.fatigue,
    mentalChange: newMental - character.mentalFatigue,
    warnings,
    canPerform,
  };
}

// Расчёт восстановления во сне (с учётом уровня культивации)
export function calculateRestRecovery(
  character: Character,
  durationMinutes: number,
  isSleep: boolean
): { physicalRecovered: number; mentalRecovered: number } {
  const rates = isSleep ? FATIGUE_RATES.rest_sleep : FATIGUE_RATES.rest_light;
  
  // Применяем множитель восстановления от уровня культивации
  const recoveryMultiplier = getFatigueRecoveryMultiplier(character.cultivationLevel);
  
  const physicalRecovered = Math.abs(rates.physicalPerMinute * durationMinutes) * recoveryMultiplier;
  const mentalRecovered = Math.abs(rates.mentalPerMinute * durationMinutes) * recoveryMultiplier;
  
  return {
    physicalRecovered: Math.min(physicalRecovered, character.fatigue),
    mentalRecovered: Math.min(mentalRecovered, character.mentalFatigue),
  };
}

// Влияние усталости на эффективность
export interface EfficiencyModifiers {
  physicalEfficiency: number; // 0-1
  mentalEfficiency: number; // 0-1
  qiAccumulationModifier: number; // множитель
  combatEfficiency: number; // множитель
}

export function calculateEfficiencyModifiers(
  physicalFatigue: number,
  mentalFatigue: number
): EfficiencyModifiers {
  // Формула: эффективность = 1 - (усталость² / 10000)
  // При 50% усталости: 0.75 эффективности
  // При 80% усталости: 0.36 эффективности
  // При 100% усталости: 0 эффективности
  
  const physicalEfficiency = 1 - Math.pow(physicalFatigue, 2) / 10000;
  const mentalEfficiency = 1 - Math.pow(mentalFatigue, 2) / 10000;
  
  return {
    physicalEfficiency,
    mentalEfficiency,
    qiAccumulationModifier: mentalEfficiency,
    combatEfficiency: physicalEfficiency * mentalEfficiency,
  };
}

// Автоматическое восстановление (каждый тик) с учётом уровня культивации
export function calculatePassiveRecovery(
  character: Character,
  deltaTimeMinutes: number
): { physicalRecovered: number; mentalRecovered: number } {
  // Пассивное восстановление из констант (% в час → % в минуту)
  const passivePhysicalRate = FATIGUE_CONSTANTS.PASSIVE_PHYSICAL_RATE / 60;
  const passiveMentalRate = FATIGUE_CONSTANTS.PASSIVE_MENTAL_RATE / 60;
  
  // Применяем множитель восстановления от уровня культивации
  const recoveryMultiplier = getFatigueRecoveryMultiplier(character.cultivationLevel);
  
  return {
    physicalRecovered: Math.min(passivePhysicalRate * deltaTimeMinutes * recoveryMultiplier, character.fatigue),
    mentalRecovered: Math.min(passiveMentalRate * deltaTimeMinutes * recoveryMultiplier, character.mentalFatigue),
  };
}
