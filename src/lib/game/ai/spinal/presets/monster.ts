/**
 * Monster Preset - Агрессивный NPC
 * 
 * Характеристики:
 * - Быстрая реакция на опасность
 * - Низкая чувствительность к боли (продолжает атаковать)
 * - Агрессивное уклонение
 */

import type { SpinalPreset } from '../types';
import { getMonsterReflexes } from '../reflexes';

export const MONSTER_PRESET: SpinalPreset = {
  type: 'monster',
  name: 'Монстр',
  
  reflexes: getMonsterReflexes(),
  
  // Глобальные модификаторы
  globalIntensityModifier: 1.0,   // Нормальная интенсивность
  globalSpeedModifier: 1.2,        // Быстрее реакции
  
  // Пороги
  sensitivity: 0.9,                // Чуть ниже нормальной (агрессивный)
};
