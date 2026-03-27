/**
 * Spinal AI Presets - Index
 */

export { MONSTER_PRESET } from './monster';
export { GUARD_PRESET } from './guard';
export { PASSERBY_PRESET } from './passerby';
export { CULTIVATOR_PRESET, createCultivatorPreset } from './cultivator';

import type { SpinalPreset, SpinalPresetType } from '../types';
import { MONSTER_PRESET } from './monster';
import { GUARD_PRESET } from './guard';
import { PASSERBY_PRESET } from './passerby';
import { CULTIVATOR_PRESET } from './cultivator';

const PRESETS: Record<SpinalPresetType, SpinalPreset> = {
  monster: MONSTER_PRESET,
  guard: GUARD_PRESET,
  passerby: PASSERBY_PRESET,
  cultivator: CULTIVATOR_PRESET,
};

/**
 * Получить пресет по типу
 */
export function getPreset(type: SpinalPresetType): SpinalPreset | undefined {
  return PRESETS[type];
}

/**
 * Получить все пресеты
 */
export function getAllPresets(): Record<SpinalPresetType, SpinalPreset> {
  return { ...PRESETS };
}
