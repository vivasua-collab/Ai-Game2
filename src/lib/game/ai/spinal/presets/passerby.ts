/**
 * Passerby Preset - Трусливый прохожий
 * 
 * Характеристики:
 * - Высокая чувствительность к опасности
 * - Бегство вместо уклонения
 * - Паника при уроне
 */

import type { SpinalPreset } from '../types';
import { getPasserbyReflexes } from '../reflexes';

export const PASSERBY_PRESET: SpinalPreset = {
  type: 'passerby',
  name: 'Прохожий',
  
  reflexes: getPasserbyReflexes(),
  
  // Глобальные модификаторы
  globalIntensityModifier: 1.3,    // Усиливает сигналы опасности
  globalSpeedModifier: 1.1,        // Быстрее бежит
  
  // Пороги
  sensitivity: 1.5,                // Высокая чувствительность (трусливый)
};
