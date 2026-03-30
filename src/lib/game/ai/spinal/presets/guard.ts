/**
 * Guard Preset - Осторожный охранник
 * 
 * Характеристики:
 * - Осторожное уклонение
 * - Реакция на звуки
 * - Тревога при обнаружении игрока
 */

import type { SpinalPreset } from '../types';
import { getGuardReflexes } from '../reflexes';

export const GUARD_PRESET: SpinalPreset = {
  type: 'guard',
  name: 'Охранник',
  
  reflexes: getGuardReflexes(),
  
  // Глобальные модификаторы
  globalIntensityModifier: 1.0,
  globalSpeedModifier: 0.9,        // Медленнее, но точнее
  
  // Пороги
  sensitivity: 1.0,                // Нормальная чувствительность
};
