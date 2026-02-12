/**
 * Система окружения - влияние локации на персонажа
 * 
 * Параметры локации:
 * - qiDensity: плотность Ци (ед/м³) - влияет на скорость накопления
 * - qiFlowRate: скорость потока Ци (ед/сек) - для лей-линий
 * - distanceFromCenter: расстояние от центра мира (влияет на общую плотность Ци)
 * - terrainType: тип местности (влияет на бонусы/штрафы)
 */

import type { Character, Location } from "@/hooks/useGame";
import { CULTIVATION_LEVELS } from "@/data/cultivation-levels";

// Типы местности и их эффекты
export type TerrainType = 
  | "mountains"    // Горы - высокое Ци, сложная проходимость
  | "plains"       // Равнины - среднее Ци, легко идти
  | "forest"       // Лес - умеренное Ци, укрытие
  | "sea"          // Море - низкое Ци, водные техники усилены
  | "desert"       // Пустыня - очень низкое Ци, быстрая усталость
  | "swamp"        // Болото - нестабильное Ци, опасно
  | "city"         // Город - низкое Ци, удобства
  | "sect"         // Секта - высокое Ци, защита
  | "leyline"      // Лей-линия - очень высокое Ци
  | "void";        // Пустота - нет Ци, только внутреннее

// Эффекты местности
interface TerrainEffects {
  qiDensityModifier: number;     // Множитель плотности Ци
  fatigueModifier: number;        // Множитель усталости при движении
  cultivationBonus: number;       // Бонус к культивации
  dangerLevel: number;            // Уровень опасности (0-10)
  travelSpeedModifier: number;    // Множитель скорости передвижения
}

const TERRAIN_EFFECTS: Record<TerrainType, TerrainEffects> = {
  mountains: {
    qiDensityModifier: 1.5,
    fatigueModifier: 1.3,
    cultivationBonus: 0.1,
    dangerLevel: 4,
    travelSpeedModifier: 0.6,
  },
  plains: {
    qiDensityModifier: 1.0,
    fatigueModifier: 1.0,
    cultivationBonus: 0,
    dangerLevel: 2,
    travelSpeedModifier: 1.0,
  },
  forest: {
    qiDensityModifier: 1.2,
    fatigueModifier: 1.1,
    cultivationBonus: 0.05,
    dangerLevel: 3,
    travelSpeedModifier: 0.8,
  },
  sea: {
    qiDensityModifier: 0.7,
    fatigueModifier: 1.2,
    cultivationBonus: 0,
    dangerLevel: 5,
    travelSpeedModifier: 0.5,
  },
  desert: {
    qiDensityModifier: 0.4,
    fatigueModifier: 1.5,
    cultivationBonus: -0.1,
    dangerLevel: 6,
    travelSpeedModifier: 0.7,
  },
  swamp: {
    qiDensityModifier: 0.8,
    fatigueModifier: 1.4,
    cultivationBonus: 0,
    dangerLevel: 7,
    travelSpeedModifier: 0.5,
  },
  city: {
    qiDensityModifier: 0.5,
    fatigueModifier: 0.9,
    cultivationBonus: -0.05,
    dangerLevel: 2,
    travelSpeedModifier: 1.0,
  },
  sect: {
    qiDensityModifier: 2.0,
    fatigueModifier: 0.8,
    cultivationBonus: 0.2,
    dangerLevel: 1,
    travelSpeedModifier: 1.0,
  },
  leyline: {
    qiDensityModifier: 3.0,
    fatigueModifier: 0.7,
    cultivationBonus: 0.3,
    dangerLevel: 3,
    travelSpeedModifier: 1.0,
  },
  void: {
    qiDensityModifier: 0,
    fatigueModifier: 2.0,
    cultivationBonus: -0.5,
    dangerLevel: 10,
    travelSpeedModifier: 0.3,
  },
};

// Результат влияния окружения
export interface EnvironmentInfluence {
  effectiveQiDensity: number;      // Эффективная плотность Ци
  qiAccumulationModifier: number; // Итоговый множитель накопления
  fatigueModifier: number;         // Множитель усталости
  dangerLevel: number;             // Уровень опасности
  cultivationBonus: number;        // Бонус к культивации
  warnings: string[];              // Предупреждения
}

// Расчёт влияния окружения
export function calculateEnvironmentInfluence(
  location: Location,
  character: Character
): EnvironmentInfluence {
  const terrain = (location.terrainType || "plains") as TerrainType;
  const effects = TERRAIN_EFFECTS[terrain] || TERRAIN_EFFECTS.plains;
  const warnings: string[] = [];
  
  // Базовая плотность Ци локации
  const baseQiDensity = location.qiDensity || 20;
  
  // Влияние расстояния от центра мира
  // Центр: максимальное Ци, окраины: минимальное
  // Формула: 1 - (distance / 200000) с минимумом 0.1
  const distanceModifier = Math.max(0.1, 1 - location.distanceFromCenter / 200000);
  
  // Эффективная плотность Ци
  const effectiveQiDensity = baseQiDensity * effects.qiDensityModifier * distanceModifier;
  
  // Множитель накопления Ци
  // Зависит от: плотности Ци, уровня культивации, проводимости
  const levelInfo = CULTIVATION_LEVELS.find(l => l.level === character.cultivationLevel);
  const levelMultiplier = levelInfo?.conductivityMultiplier || 1;
  
  // Итоговый множитель: (эффективная плотность / 100) × уровень × бонус местности
  const qiAccumulationModifier = (effectiveQiDensity / 100) * levelMultiplier * (1 + effects.cultivationBonus);
  
  // Предупреждения
  if (effectiveQiDensity < 10) {
    warnings.push("Крайне низкая плотность Ци. Культивация затруднена.");
  }
  if (effects.dangerLevel >= 6) {
    warnings.push("Опасная местность. Риск случайных событий.");
  }
  if (terrain === "void") {
    warnings.push("Пустота. Ци недоступна извне. Возможно только внутреннее накопление.");
  }
  if (terrain === "leyline") {
    warnings.push("Лей-линия. Идеальное место для культивации.");
  }
  
  return {
    effectiveQiDensity,
    qiAccumulationModifier,
    fatigueModifier: effects.fatigueModifier,
    dangerLevel: effects.dangerLevel,
    cultivationBonus: effects.cultivationBonus,
    warnings,
  };
}

// Расчёт времени путешествия между локациями
export function calculateTravelTime(
  fromLocation: Location,
  toLocation: Location,
  character: Character
): { timeMinutes: number; fatigueCost: { physical: number; mental: number } } {
  // Расстояние (упрощённо - разница в дистанции от центра)
  const distance = Math.abs(fromLocation.distanceFromCenter - toLocation.distanceFromCenter);
  
  // Базовая скорость: 5 км/час = 5000 м/мин
  const baseSpeed = 5000;
  
  // Модификатор местности (среднее между двумя)
  const fromTerrain = (fromLocation.terrainType || "plains") as TerrainType;
  const toTerrain = (toLocation.terrainType || "plains") as TerrainType;
  const avgSpeedModifier = (
    (TERRAIN_EFFECTS[fromTerrain]?.travelSpeedModifier || 1) +
    (TERRAIN_EFFECTS[toTerrain]?.travelSpeedModifier || 1)
  ) / 2;
  
  // Модификатор от уровня культивации
  const levelModifier = 1 + character.cultivationLevel * 0.1;
  
  // Итоговое время
  const effectiveSpeed = baseSpeed * avgSpeedModifier * levelModifier;
  const timeMinutes = Math.ceil(distance / effectiveSpeed);
  
  // Усталость от путешествия
  const avgFatigueModifier = (
    (TERRAIN_EFFECTS[fromTerrain]?.fatigueModifier || 1) +
    (TERRAIN_EFFECTS[toTerrain]?.fatigueModifier || 1)
  ) / 2;
  
  const fatigueCost = {
    physical: timeMinutes * 0.1 * avgFatigueModifier,
    mental: timeMinutes * 0.02,
  };
  
  return { timeMinutes, fatigueCost };
}

// Обнаружение лей-линий (требует определённый уровень)
export function canDetectLeylines(character: Character): boolean {
  // Уровень 5+ может чувствовать лей-линии
  return character.cultivationLevel >= 5;
}

// Расчёт бонуса от лей-линии для прорыва
export function calculateLeylineBreakthroughBonus(
  location: Location,
  character: Character
): number {
  if (location.terrainType !== "leyline") return 0;
  
  // Бонус: +20% к шансу успешного прорыва
  // Требует уровень 3+
  if (character.cultivationLevel < 3) {
    return 0; // Не может использовать лей-линию
  }
  
  return 0.2; // 20% бонус
}

// Проверка доступности техник в зависимости от окружения
export function checkTechniqueAvailability(
  techniqueType: "water" | "fire" | "earth" | "air" | "void",
  location: Location
): { available: boolean; modifier: number } {
  const terrain = (location.terrainType || "plains") as TerrainType;
  
  // Водяные техники усилены на море
  if (techniqueType === "water" && terrain === "sea") {
    return { available: true, modifier: 1.5 };
  }
  
  // Огненные техники ослаблены на море
  if (techniqueType === "fire" && terrain === "sea") {
    return { available: true, modifier: 0.5 };
  }
  
  // В пустоте только void техники
  if (terrain === "void") {
    return { available: techniqueType === "void", modifier: 1.0 };
  }
  
  return { available: true, modifier: 1.0 };
}

// Экспорт типов и констант
export { TERRAIN_EFFECTS };
export type { TerrainEffects };
