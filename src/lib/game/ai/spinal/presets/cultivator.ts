/**
 * Cultivator Preset - Культиватор с Qi
 * 
 * Характеристики:
 * - Все базовые рефлексы
 * - Qi щит при атаке Qi
 * - Замерзание при подавлении культивацией
 * - Зависит от уровня культивации
 */

import type { SpinalPreset } from '../types';
import { getCultivatorReflexes } from '../reflexes';

export const CULTIVATOR_PRESET: SpinalPreset = {
  type: 'cultivator',
  name: 'Культиватор',
  
  reflexes: getCultivatorReflexes(),
  
  // Глобальные модификаторы
  globalIntensityModifier: 1.0,
  globalSpeedModifier: 1.0,
  
  // Пороги
  sensitivity: 1.0,                // Нормальная чувствительность
};

/**
 * Создать пресет культиватора с учётом уровня культивации
 */
export function createCultivatorPreset(cultivationLevel: number): SpinalPreset {
  // Чем выше уровень, тем лучше контроль Qi
  const qiControlFactor = Math.min(1.5, 0.8 + cultivationLevel * 0.05);
  
  return {
    ...CULTIVATOR_PRESET,
    name: `Культиватор (уровень ${cultivationLevel})`,
    globalSpeedModifier: qiControlFactor,
    // Высокие культиваторы менее чувствительны к боли
    sensitivity: Math.max(0.5, 1.0 - cultivationLevel * 0.05),
  };
}
