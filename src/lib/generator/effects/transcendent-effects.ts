/**
 * ============================================================================
 * TRANSCENDENT-ЭФФЕКТЫ ДЛЯ ТЕХНИК
 * ============================================================================
 * 
 * Уникальные бонусы, доступные ТОЛЬКО для Grade = transcendent.
 * Добавляются как третий бонус к технике.
 * 
 * @see docs/technique-system-v2.md#9.5
 */

import type { TechniqueElement } from '@/types/technique-types';

// ==================== ТИПЫ ====================

export interface TranscendentEffect {
  type: string;
  value: number;
  description: string;
}

// ==================== TRANSCENDENT ЭФФЕКТЫ ПО СТИХИЯМ ====================

/**
 * Уникальные эффекты для Transcendent Grade
 * 
 * Каждый эффект добавляет уникальное свойство,
 * недоступное на других Grade.
 */
export const TRANSCENDENT_ATTACK_EFFECTS: Record<TechniqueElement, TranscendentEffect> = {
  fire: {
    type: 'burn_max_hp',
    value: 3, // 3% от максимального HP за тик
    description: 'Горение: урон в % от макс HP цели (игнорирует броню)',
  },
  water: {
    type: 'drain_qi_movement',
    value: 5, // 5% Ци за тик движения
    description: 'Водяной гнёт: цель теряет 5% Ци за каждый тик движения',
  },
  earth: {
    type: 'stun_pierce_immunity',
    value: 100, // 100% шанс пробить иммунитет
    description: 'Сейсмический удар: оглушение пробивает иммунитет к стану',
  },
  air: {
    type: 'vortex',
    value: 20, // 20% урона в зоне
    description: 'Вихрь: 20% урона всем целям в зоне отталкивания',
  },
  lightning: {
    type: 'chain_scaling',
    value: 25, // +25% за каждую цель
    description: 'Нарастающая цепь: +25% урона каждой следующей цели в цепи',
  },
  void: {
    type: 'shield_damage_bonus',
    value: 50, // +50% урона по щитам
    description: 'Разрушитель щитов: +50% урона по энергетическим щитам',
  },
  neutral: {
    type: 'armor_pierce',
    value: 10, // +10% пробития брони
    description: 'Чистый Ци: +10% пробития брони',
  },
};

/**
 * Transcendent эффекты для защитных техник
 */
export const TRANSCENDENT_DEFENSE_EFFECTS: Record<TechniqueElement, TranscendentEffect> = {
  fire: {
    type: 'burn_on_shield_break',
    value: 50, // 50% от HP щита как урон горением
    description: 'Огненный взрыв: при разрушении щит наносит 50% HP как урон горением',
  },
  water: {
    type: 'heal_on_absorb',
    value: 25, // 25% поглощённого урона в HP
    description: 'Живительная вода: 25% поглощённого урона конвертируется в HP',
  },
  earth: {
    type: 'damage_on_block',
    value: 30, // 30% заблокированного урона атакующему
    description: 'Шипы: 30% заблокированного урона возвращается атакующему',
  },
  air: {
    type: 'phase_shift',
    value: 1, // 1 тик неуязвимости
    description: 'Фазовый сдвиг: 1 тик неуязвимости после разрушения щита',
  },
  lightning: {
    type: 'discharge_on_break',
    value: 100, // 100% шока при разрушении
    description: 'Грозовой разряд: при разрушении щит шокирует всех в радиусе',
  },
  void: {
    type: 'absorb_qi',
    value: 30, // 30% урона конвертируется в Ци
    description: 'Пустотный поглотитель: 30% полученного урона конвертируется в Ци',
  },
  neutral: {
    type: 'reinforce',
    value: 50, // +50% HP щита
    description: 'Укрепление: +50% к базовому HP щита',
  },
};

/**
 * Transcendent эффекты для техник поддержки
 */
export const TRANSCENDENT_SUPPORT_EFFECTS: Record<TechniqueElement, TranscendentEffect> = {
  fire: {
    type: 'berserker',
    value: 50, // +50% урона при <30% HP
    description: 'Берсерк: +50% урона когда HP ниже 30%',
  },
  water: {
    type: 'purify',
    value: 100, // 100% снятие дебаффов
    description: 'Очищение: снимает все дебаффы при применении',
  },
  earth: {
    type: 'iron_skin',
    value: 25, // +25% сопротивления физическому урону
    description: 'Железная кожа: +25% сопротивления физическому урону (постоянно)',
  },
  air: {
    type: 'wind_walk',
    value: 100, // игнорирование угроз при движении
    description: 'Шаг ветра: игнорирование атак при движении 1 тик',
  },
  lightning: {
    type: 'quick_cast',
    value: 50, // -50% кулдаун следующей техники
    description: 'Быстрое плетение: -50% кулдаун следующей техники',
  },
  void: {
    type: 'mana_shield_convert',
    value: 100, // 100% Ци в HP при критическом состоянии
    description: 'Жертвенный щит: 100% Ци конвертируется в HP при HP < 10%',
  },
  neutral: {
    type: 'stat_mastery',
    value: 10, // +10% к базовым характеристикам
    description: 'Мастерство тела: +10% ко всем базовым характеристикам',
  },
};

// ==================== ФУНКЦИИ ====================

/**
 * Получить Transcendent-эффект для техники
 */
export function getTranscendentEffect(
  element: TechniqueElement,
  techniqueType: 'attack' | 'defense' | 'support' = 'attack'
): TranscendentEffect | null {
  switch (techniqueType) {
    case 'attack':
      return TRANSCENDENT_ATTACK_EFFECTS[element] || null;
    case 'defense':
      return TRANSCENDENT_DEFENSE_EFFECTS[element] || null;
    case 'support':
      return TRANSCENDENT_SUPPORT_EFFECTS[element] || null;
    default:
      return TRANSCENDENT_ATTACK_EFFECTS[element] || null;
  }
}

/**
 * Проверить, есть ли у стихии Transcendent-эффект
 */
export function hasTranscendentEffect(element: TechniqueElement): boolean {
  return element !== 'neutral';
}

/**
 * Получить описание Transcendent-эффекта
 */
export function getTranscendentEffectDescription(
  element: TechniqueElement,
  techniqueType: 'attack' | 'defense' | 'support' = 'attack'
): string {
  const effect = getTranscendentEffect(element, techniqueType);
  return effect?.description || 'Нет Transcendent-эффекта';
}
