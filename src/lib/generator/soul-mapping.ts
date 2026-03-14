/**
 * ============================================================================
 * SOUL MAPPING - Маппинг Species → Soul
 * ============================================================================
 * 
 * Определяет соответствие между типом вида (SpeciesType) и 
 * параметрами SoulEntity (soulType, mind).
 * 
 * Используется при генерации TempNPC для обеспечения совместимости
 * с SoulEntity архитектурой.
 */

import type { SpeciesType } from '@/data/presets';

/**
 * Результат маппинга - параметры для SoulEntity
 */
export interface SoulMapping {
  soulType: 'character' | 'creature' | 'spirit' | 'construct';
  mind: 'full' | 'instinct' | 'simple';
}

/**
 * Таблица маппинга Species → Soul
 * 
 * Правила:
 * - humanoid → character + full mind (игрок, NPC)
 * - beast → creature + instinct mind (монстры)
 * - spirit → spirit + full mind (духи, призраки)
 * - hybrid → character + full mind (кентавр, оборотень)
 * - aberration → construct + simple mind (големы, мутанты)
 */
export const SPECIES_TO_SOUL: Record<SpeciesType, SoulMapping> = {
  humanoid: { 
    soulType: 'character', 
    mind: 'full' 
  },
  beast: { 
    soulType: 'creature', 
    mind: 'instinct' 
  },
  spirit: { 
    soulType: 'spirit', 
    mind: 'full' 
  },
  hybrid: { 
    soulType: 'character', 
    mind: 'full' 
  },
  aberration: { 
    soulType: 'construct', 
    mind: 'simple' 
  },
};

/**
 * Получить параметры SoulEntity для вида
 * 
 * @param species - Тип вида (humanoid, beast, spirit, hybrid, aberration)
 * @returns SoulMapping с soulType и mind
 */
export function getSoulFromSpecies(species: SpeciesType): SoulMapping {
  return SPECIES_TO_SOUL[species] ?? { 
    soulType: 'creature', 
    mind: 'instinct' 
  };
}

/**
 * Проверка возможности полноценного разума
 * (для диалогов, торговли, обучения)
 */
export function hasFullMind(species: SpeciesType): boolean {
  const mapping = getSoulFromSpecies(species);
  return mapping.mind === 'full';
}

/**
 * Проверка возможности речи
 */
export function canSpeak(species: SpeciesType): boolean {
  // Гуманоиды, духи и гибриды могут говорить
  return ['humanoid', 'spirit', 'hybrid'].includes(species);
}

/**
 * Проверка возможности использования инструментов
 */
export function canUseTools(species: SpeciesType): boolean {
  // Только гуманоиды и гибриды
  return ['humanoid', 'hybrid'].includes(species);
}
