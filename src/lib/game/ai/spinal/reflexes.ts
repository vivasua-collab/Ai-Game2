/**
 * ============================================================================
 * SPINAL AI - Reflexes Library
 * ============================================================================
 * 
 * Библиотека рефлексов для Spinal AI.
 * Рефлексы - это мгновенные автоматические реакции на сигналы.
 * 
 * @see docs/checkpoints/checkpoint_03_24_spinal_ai_phase1.md
 */

import type { SpinalReflex, SpinalActionType, SpinalSignalType } from './types';
import { SPINAL_CONSTANTS } from './types';

// ==================== REFLEX DEFINITIONS ====================

/**
 * Базовые рефлексы (доступны всем NPC)
 */
export const BASE_REFLEXES: Record<string, Omit<SpinalReflex, 'id'>> = {
  // Опасность - уклонение
  danger_dodge: {
    name: 'Уклонение от опасности',
    trigger: {
      signalType: 'danger_nearby',
      minIntensity: 0.7,
    },
    action: 'dodge',
    priority: 100,
    cooldown: SPINAL_CONSTANTS.DODGE_COOLDOWN,
  },
  
  // Боль - вздрогнуть
  pain_flinch: {
    name: 'Вздрогнуть от боли',
    trigger: {
      signalType: 'damage',
      minIntensity: 0.3,
    },
    action: 'flinch',
    priority: 90,
    cooldown: SPINAL_CONSTANTS.FLINCH_COOLDOWN,
    intensityModifier: 0.8,
  },
  
  // Край обрыва - отойти
  edge_retreat: {
    name: 'Отойти от края',
    trigger: {
      signalType: 'edge_detected',
      minIntensity: 0.5,
    },
    action: 'step_back',
    priority: 85,
    cooldown: SPINAL_CONSTANTS.STEP_BACK_COOLDOWN,
  },
  
  // Столкновение - пошатнуться
  collision_stumble: {
    name: 'Пошатнуться при столкновении',
    trigger: {
      signalType: 'collision',
      minIntensity: 0.4,
    },
    action: 'stumble',
    priority: 80,
    cooldown: 500,
  },
  
  // Громкий звук - повернуться
  sound_orient: {
    name: 'Повернуться на звук',
    trigger: {
      signalType: 'loud_sound',
      minIntensity: 0.5,
    },
    action: 'turn_to_sound',
    priority: 30,
    cooldown: 200,
  },
  
  // Потеря равновесия - восстановить
  balance_recover: {
    name: 'Восстановить равновесие',
    trigger: {
      signalType: 'balance_lost',
      minIntensity: 0.3,
    },
    action: 'balance',
    priority: 70,
    cooldown: 300,
  },
};

/**
 * Рефлексы для культиваторов (требуют Qi)
 */
export const CULTIVATOR_REFLEXES: Record<string, Omit<SpinalReflex, 'id'>> = {
  // Авто-щит Qi
  qi_shield_reflex: {
    name: 'Авто-щит Qi',
    trigger: {
      signalType: 'qi_attack',
      minIntensity: 0.3,
    },
    action: 'qi_shield',
    priority: 95,
    cooldown: 2000,
    requiresQi: 20,
  },
  
  // Подавление культивацией - замереть
  suppression_freeze: {
    name: 'Замереть от подавления',
    trigger: {
      signalType: 'suppression',
      minIntensity: 0.9,
    },
    action: 'freeze',
    priority: 99,
    cooldown: 500,
  },
};

/**
 * Рефлексы для монстров (агрессивные)
 */
export const MONSTER_REFLEXES: Record<string, Omit<SpinalReflex, 'id'>> = {
  // Монстр уклоняется быстрее
  monster_dodge: {
    name: 'Быстрое уклонение монстра',
    trigger: {
      signalType: 'danger_nearby',
      minIntensity: 0.5, // Более чувствительный
    },
    action: 'dodge',
    priority: 100,
    cooldown: 300, // Быстрее кулдаун
    speedModifier: 1.3, // Быстрее движение
  },
  
  // Агрессивная реакция на урон
  monster_pain: {
    name: 'Агрессивная реакция на боль',
    trigger: {
      signalType: 'damage',
      minIntensity: 0.2,
    },
    action: 'flinch',
    priority: 85,
    cooldown: 200,
    intensityModifier: 0.5, // Меньше flinch, быстрее контратака
  },
};

/**
 * Рефлексы для прохожих (трусливые)
 */
export const PASSERBY_REFLEXES: Record<string, Omit<SpinalReflex, 'id'>> = {
  // Трусливое бегство
  passerby_flee: {
    name: 'Трусливое бегство',
    trigger: {
      signalType: 'danger_nearby',
      minIntensity: 0.3, // Очень чувствительный
    },
    action: 'flee',
    priority: 95,
    cooldown: 1000,
    speedModifier: 1.2, // Бегут быстрее
  },
  
  // Паника при уроне
  passerby_panic: {
    name: 'Паника при уроне',
    trigger: {
      signalType: 'damage',
      minIntensity: 0.2,
    },
    action: 'flee',
    priority: 92,
    cooldown: 2000,
  },
};

/**
 * Рефлексы для охранников (осторожные)
 */
export const GUARD_REFLEXES: Record<string, Omit<SpinalReflex, 'id'>> = {
  // Осторожное уклонение
  guard_dodge: {
    name: 'Осторожное уклонение',
    trigger: {
      signalType: 'danger_nearby',
      minIntensity: 0.6,
    },
    action: 'dodge',
    priority: 95,
    cooldown: 600,
    speedModifier: 0.9, // Медленнее, но точнее
  },
  
  // Тревога
  guard_alert: {
    name: 'Тревога',
    trigger: {
      signalType: 'player_nearby',
      minIntensity: 0.5,
    },
    action: 'alert',
    priority: 40,
    cooldown: 3000,
  },
};

// ==================== REFLEX LIBRARY ====================

/**
 * Полная библиотека рефлексов
 */
export const REFLEX_LIBRARY = {
  base: BASE_REFLEXES,
  cultivator: CULTIVATOR_REFLEXES,
  monster: MONSTER_REFLEXES,
  passerby: PASSERBY_REFLEXES,
  guard: GUARD_REFLEXES,
} as const;

// ==================== FACTORY FUNCTIONS ====================

/**
 * Создать рефлекс с ID
 */
export function createReflex(
  id: string,
  definition: Omit<SpinalReflex, 'id'>
): SpinalReflex {
  return {
    id,
    ...definition,
  };
}

/**
 * Получить рефлекс из библиотеки
 */
export function getReflex(category: keyof typeof REFLEX_LIBRARY, name: string): SpinalReflex | null {
  const categoryReflexes = REFLEX_LIBRARY[category];
  if (!categoryReflexes) return null;
  
  const definition = categoryReflexes[name];
  if (!definition) return null;
  
  return createReflex(name, definition);
}

/**
 * Получить все рефлексы категории
 */
export function getCategoryReflexes(category: keyof typeof REFLEX_LIBRARY): SpinalReflex[] {
  const categoryReflexes = REFLEX_LIBRARY[category];
  if (!categoryReflexes) return [];
  
  return Object.entries(categoryReflexes).map(([name, definition]) =>
    createReflex(name, definition)
  );
}

/**
 * Получить базовые рефлексы
 */
export function getBaseReflexes(): SpinalReflex[] {
  return getCategoryReflexes('base');
}

/**
 * Получить рефлексы для культиватора
 */
export function getCultivatorReflexes(): SpinalReflex[] {
  return [
    ...getBaseReflexes(),
    ...getCategoryReflexes('cultivator'),
  ];
}

/**
 * Получить рефлексы для монстра
 */
export function getMonsterReflexes(): SpinalReflex[] {
  return [
    // Монстры используют свои рефлексы вместо базовых
    createReflex('monster_dodge', MONSTER_REFLEXES.monster_dodge),
    createReflex('monster_pain', MONSTER_REFLEXES.monster_pain),
    createReflex('edge_retreat', BASE_REFLEXES.edge_retreat),
    createReflex('collision_stumble', BASE_REFLEXES.collision_stumble),
  ];
}

/**
 * Получить рефлексы для прохожего
 */
export function getPasserbyReflexes(): SpinalReflex[] {
  return [
    // Прохожие используют свои трусливые рефлексы
    createReflex('passerby_flee', PASSERBY_REFLEXES.passerby_flee),
    createReflex('passerby_panic', PASSERBY_REFLEXES.passerby_panic),
    createReflex('edge_retreat', BASE_REFLEXES.edge_retreat),
    createReflex('sound_orient', BASE_REFLEXES.sound_orient),
  ];
}

/**
 * Получить рефлексы для охранника
 */
export function getGuardReflexes(): SpinalReflex[] {
  return [
    createReflex('guard_dodge', GUARD_REFLEXES.guard_dodge),
    createReflex('guard_alert', GUARD_REFLEXES.guard_alert),
    createReflex('pain_flinch', BASE_REFLEXES.pain_flinch),
    createReflex('edge_retreat', BASE_REFLEXES.edge_retreat),
    createReflex('collision_stumble', BASE_REFLEXES.collision_stumble),
    createReflex('sound_orient', BASE_REFLEXES.sound_orient),
  ];
}

// ==================== CUSTOM REFLEX CREATOR ====================

/**
 * Создать кастомный рефлекс
 */
export function createCustomReflex(
  id: string,
  signalType: SpinalSignalType,
  action: SpinalActionType,
  options: {
    minIntensity?: number;
    maxIntensity?: number;
    priority?: number;
    cooldown?: number;
    speedModifier?: number;
    intensityModifier?: number;
    requiresQi?: number;
  } = {}
): SpinalReflex {
  return {
    id,
    name: id.replace(/_/g, ' '),
    trigger: {
      signalType,
      minIntensity: options.minIntensity ?? 0.5,
      maxIntensity: options.maxIntensity,
    },
    action,
    priority: options.priority ?? 50,
    cooldown: options.cooldown ?? 500,
    speedModifier: options.speedModifier,
    intensityModifier: options.intensityModifier,
    requiresQi: options.requiresQi,
  };
}
