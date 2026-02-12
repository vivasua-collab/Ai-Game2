/**
 * Система усталости - клиентская математика
 * 
 * Два типа усталости:
 * - Физическая: от действий с телом (движение, бой, физический труд)
 * - Ментальная: от действий с Ци (трата Ци, техники, культивация)
 * 
 * Влияние:
 * - Влияет на эффективность действий
 * - При 100% физической - невозможны физические действия
 * - При 100% ментальной - невозможны действия с Ци
 * - Восстановление во сне
 */

import type { Character, Location } from "@/hooks/useGame";

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
const FATIGUE_RATES: Record<ActionType, FatigueRates> = {
  meditation_accumulation: { physicalPerMinute: 0.05, mentalPerMinute: 0.1 }, // 3%/6% за час
  meditation_breakthrough: { physicalPerMinute: 0.05, mentalPerMinute: 0.2 }, // 3%/12% за час
  combat_light: { physicalPerMinute: 0.3, mentalPerMinute: 0.1 }, // 18%/6% за час
  combat_heavy: { physicalPerMinute: 0.5, mentalPerMinute: 0.2 }, // 30%/12% за час
  technique_basic: { physicalPerMinute: 0.1, mentalPerMinute: 0.15 }, // 6%/9% за час
  technique_advanced: { physicalPerMinute: 0.15, mentalPerMinute: 0.3 }, // 9%/18% за час
  physical_travel: { physicalPerMinute: 0.15, mentalPerMinute: 0.02 }, // 9%/1.2% за час
  physical_labor: { physicalPerMinute: 0.25, mentalPerMinute: 0.05 }, // 15%/3% за час
  rest_light: { physicalPerMinute: -0.1, mentalPerMinute: -0.05 }, // восстановление
  rest_sleep: { physicalPerMinute: -0.5, mentalPerMinute: -0.4 }, // активное восстановление
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
  
  // Базовое изменение
  let physicalChange = rates.physicalPerMinute * durationMinutes;
  let mentalChange = rates.mentalPerMinute * durationMinutes;
  
  // Дополнительная ментальная усталость от траты Ци
  if (qiSpent > 0) {
    mentalChange += qiSpent * 0.01; // 1% ментальной усталости за 100 Ци
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
    if (physicalActions.includes(action) && newPhysical >= 90) {
      warnings.push("Критическая физическая усталость. Действие невозможно.");
      canPerform = false;
    }
    
    // Ментальные действия требуют ментальной энергии
    const mentalActions: ActionType[] = ["meditation_accumulation", "meditation_breakthrough", "technique_basic", "technique_advanced", "qi_expenditure"];
    if (mentalActions.includes(action) && newMental >= 90) {
      warnings.push("Критическая ментальная усталость. Действие невозможно.");
      canPerform = false;
    }
  }
  
  // Предупреждения
  if (newPhysical >= 70 && newPhysical < 90) {
    warnings.push("Высокая физическая усталость. Эффективность снижена.");
  }
  if (newMental >= 70 && newMental < 90) {
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

// Расчёт восстановления во сне
export function calculateRestRecovery(
  character: Character,
  durationMinutes: number,
  isSleep: boolean
): { physicalRecovered: number; mentalRecovered: number } {
  const rates = isSleep ? FATIGUE_RATES.rest_sleep : FATIGUE_RATES.rest_light;
  
  const physicalRecovered = Math.abs(rates.physicalPerMinute * durationMinutes);
  const mentalRecovered = Math.abs(rates.mentalPerMinute * durationMinutes);
  
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

// Автоматическое восстановление (каждый тик)
export function calculatePassiveRecovery(
  character: Character,
  deltaTimeMinutes: number
): { physicalRecovered: number; mentalRecovered: number } {
  // Пассивное восстановление очень медленное: 0.5% за час
  const passivePhysicalRate = 0.5 / 60; // за минуту
  const passiveMentalRate = 0.3 / 60;
  
  return {
    physicalRecovered: Math.min(passivePhysicalRate * deltaTimeMinutes, character.fatigue),
    mentalRecovered: Math.min(passiveMentalRate * deltaTimeMinutes, character.mentalFatigue),
  };
}
