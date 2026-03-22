/**
 * GRADE SYSTEM
 * 
 * Система грейдов (качества) экипировки.
 * 
 * === ОСНОВНЫЕ ПРИНЦИПЫ ===
 * 
 * 1. Грейд определяет качество изготовления предмета
 * 2. Грейд можно повысить (улучшение) или понизить (неудачный ремонт)
 * 3. Каждый грейд имеет множители параметров
 * 4. Высшие грейды дают больше бонусов
 * 
 * === ИЕРАРХИЯ ГРЕЙДОВ ===
 * 
 * damaged (Повреждённый)
 *   - ×0.5 прочности, ×0.8 урона
 *   - 0 бонусов
 *   - Получается при поломке или неудачном ремонте
 * 
 * common (Обычный)
 *   - ×1.0 прочности, ×1.0 урона
 *   - 0-1 бонус
 *   - Стандартное качество
 * 
 * refined (Улучшенный)
 *   - ×1.5 прочности, ×1.3 урона
 *   - 1-2 бонуса
 *   - Требует мастера-кузнеца
 * 
 * perfect (Совершенный)
 *   - ×2.5 прочности, ×1.7 урона
 *   - 2-4 бонуса
 *   - Требует великого мастера
 * 
 * transcendent (Превосходящий)
 *   - ×4.0 прочности, ×2.5 урона
 *   - 4-6 бонусов
 *   - Требует легендарного мастера + техники Ци
 */

import {
  EquipmentGrade,
  GradeConfig,
  GradeChangeEvent,
  GeneratedBonus,
  GRADE_ORDER,
} from '@/types/equipment-v2';

// Реэкспорт для обратной совместимости
export type { EquipmentGrade, GradeConfig, GradeChangeEvent, GeneratedBonus } from '@/types/equipment-v2';
export { GRADE_ORDER } from '@/types/equipment-v2';

// ============================================================================
// GRADE CONFIGURATIONS
// ============================================================================

/**
 * Конфигурации всех грейдов
 */
export const GRADE_CONFIGS: Record<EquipmentGrade, GradeConfig> = {
  damaged: {
    grade: 'damaged',
    name: 'Повреждённый',
    durabilityMultiplier: 0.5,
    damageMultiplier: 0.8,
    bonusCount: [0, 0],
    color: 'text-red-400',
    colorHex: '#f87171',
    icon: '⚠',
    upgradeChance: 100, // Всегда можно улучшить до common
    downgradeRisk: 0,
    description: 'Сломанный или повреждённый предмет. Требует ремонта.',
  },
  
  common: {
    grade: 'common',
    name: 'Обычный',
    durabilityMultiplier: 1.0,
    damageMultiplier: 1.0,
    bonusCount: [0, 1],
    color: 'text-gray-400',
    colorHex: '#9ca3af',
    icon: '○',
    upgradeChance: 60,
    downgradeRisk: 5,
    description: 'Стандартный предмет без особенностей.',
  },
  
  refined: {
    grade: 'refined',
    name: 'Улучшенный',
    durabilityMultiplier: 1.5,
    damageMultiplier: 1.3,
    bonusCount: [1, 2],
    color: 'text-green-400',
    colorHex: '#4ade80',
    icon: '◇',
    upgradeChance: 40,
    downgradeRisk: 15,
    description: 'Качественно изготовленный предмет.',
  },
  
  perfect: {
    grade: 'perfect',
    name: 'Совершенный',
    durabilityMultiplier: 2.5,
    damageMultiplier: 1.7,
    bonusCount: [2, 4],
    color: 'text-blue-400',
    colorHex: '#60a5fa',
    icon: '◆',
    upgradeChance: 20,
    downgradeRisk: 30,
    description: 'Идеальный предмет мастеров.',
  },
  
  transcendent: {
    grade: 'transcendent',
    name: 'Превосходящий',
    durabilityMultiplier: 4.0,
    damageMultiplier: 2.5,
    bonusCount: [4, 6],
    color: 'text-amber-400',
    colorHex: '#fbbf24',
    icon: '★',
    upgradeChance: 0, // Нельзя улучшить
    downgradeRisk: 50,
    description: 'Легендарный предмет древних мастеров.',
  },
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Получить конфигурацию грейда
 */
export function getGradeConfig(grade: EquipmentGrade): GradeConfig {
  return GRADE_CONFIGS[grade];
}

/**
 * Получить множитель параметров для грейда
 * 
 * @param grade - Грейд экипировки
 * @param paramType - Тип параметра ('durability' | 'damage')
 * @returns Множитель параметра
 */
export function calculateGradeMultiplier(
  grade: EquipmentGrade,
  paramType: 'durability' | 'damage'
): number {
  const config = GRADE_CONFIGS[grade];
  return paramType === 'durability'
    ? config.durabilityMultiplier
    : config.damageMultiplier;
}

/**
 * Получить количество бонусов для грейда
 * 
 * @param grade - Грейд экипировки
 * @param rng - Функция случайного числа
 * @returns Количество бонусов
 */
export function getBonusCountForGrade(
  grade: EquipmentGrade,
  rng: () => number = Math.random
): number {
  const config = GRADE_CONFIGS[grade];
  const [min, max] = config.bonusCount;
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Сгенерировать бонусы для грейда
 * 
 * @param grade - Грейд экипировки
 * @param level - Уровень предмета
 * @param itemType - Тип предмета
 * @param rng - Функция случайного числа
 * @returns Массив сгенерированных бонусов
 */
export function generateBonusStatsForGrade(
  grade: EquipmentGrade,
  level: number,
  itemType: string,
  rng: () => number = Math.random
): GeneratedBonus[] {
  const config = GRADE_CONFIGS[grade];
  const count = getBonusCountForGrade(grade, rng);
  
  if (count === 0) return [];
  
  const bonuses: GeneratedBonus[] = [];
  const availableTypes = getAvailableBonusTypes(itemType);
  
  for (let i = 0; i < count && availableTypes.length > 0; i++) {
    const typeIndex = Math.floor(rng() * availableTypes.length);
    const bonusType = availableTypes.splice(typeIndex, 1)[0];
    
    const baseValue = getBaseBonusValue(bonusType, level);
    const gradeMultiplier = config.damageMultiplier;
    const value = Math.floor(baseValue * gradeMultiplier);
    
    bonuses.push({
      id: `${bonusType}_${Date.now()}_${i}`,
      type: bonusType,
      category: getBonusCategory(bonusType),
      value,
      isMultiplier: false,
      source: 'grade',
    });
  }
  
  return bonuses;
}

/**
 * Проверить возможность улучшения грейда
 * 
 * @param current - Текущий грейд
 * @param materials - Имеющиеся материалы
 * @param skill - Навык кузнеца
 * @returns Результат проверки
 */
export function canUpgradeGrade(
  current: EquipmentGrade,
  materials: string[],
  skill: number
): { canUpgrade: boolean; reason?: string } {
  // Превосходящий нельзя улучшить
  if (current === 'transcendent') {
    return { canUpgrade: false, reason: 'Максимальный грейд' };
  }
  
  // Проверка материалов
  const requiredMaterials = getRequiredMaterialsForUpgrade(current);
  const hasMaterials = requiredMaterials.every((m) => materials.includes(m));
  if (!hasMaterials) {
    return { canUpgrade: false, reason: `Недостаточно материалов: ${requiredMaterials.join(', ')}` };
  }
  
  // Проверка навыка
  const requiredSkill = getRequiredSkillForUpgrade(current);
  if (skill < requiredSkill) {
    return { canUpgrade: false, reason: `Требуется навык кузнеца: ${requiredSkill}` };
  }
  
  return { canUpgrade: true };
}

/**
 * Попытка улучшения грейда
 * 
 * @param grade - Текущий грейд
 * @param materials - Используемые материалы
 * @param skill - Навык кузнеца
 * @param rng - Функция случайного числа
 * @returns Результат попытки
 */
export function attemptUpgrade(
  grade: EquipmentGrade,
  materials: string[],
  skill: number,
  rng: () => number = Math.random
): { success: boolean; newGrade: EquipmentGrade; event: GradeChangeEvent } {
  const check = canUpgradeGrade(grade, materials, skill);
  
  if (!check.canUpgrade) {
    throw new Error(check.reason);
  }
  
  const config = GRADE_CONFIGS[grade];
  const roll = rng() * 100;
  
  // Бонус от навыка (+0.5% за каждый пункт навыка свыше минимума)
  const requiredSkill = getRequiredSkillForUpgrade(grade);
  const skillBonus = (skill - requiredSkill) * 0.5;
  const effectiveChance = Math.min(95, config.upgradeChance + skillBonus);
  
  if (roll <= effectiveChance) {
    // Успех — повышение грейда
    const currentIndex = GRADE_ORDER.indexOf(grade);
    const newGrade = GRADE_ORDER[currentIndex + 1];
    
    return {
      success: true,
      newGrade,
      event: {
        from: grade,
        to: newGrade,
        reason: 'upgrade',
        timestamp: Date.now(),
      },
    };
  } else {
    // Неудача — риск понижения
    const damageRoll = rng() * 100;
    if (damageRoll <= config.downgradeRisk && grade !== 'damaged') {
      const currentIndex = GRADE_ORDER.indexOf(grade);
      const newGrade = GRADE_ORDER[currentIndex - 1];
      
      return {
        success: false,
        newGrade,
        event: {
          from: grade,
          to: newGrade,
          reason: 'downgrade',
          timestamp: Date.now(),
        },
      };
    }
    
    // Без изменений
    return {
      success: false,
      newGrade: grade,
      event: {
        from: grade,
        to: grade,
        reason: 'upgrade',
        timestamp: Date.now(),
      },
    };
  }
}

/**
 * Понизить грейд
 * 
 * @param grade - Текущий грейд
 * @param reason - Причина понижения
 * @returns Новый грейд
 */
export function downgradeGrade(
  grade: EquipmentGrade,
  reason: 'repair' | 'damage' = 'damage'
): EquipmentGrade {
  if (grade === 'damaged') return 'damaged';
  
  const currentIndex = GRADE_ORDER.indexOf(grade);
  return GRADE_ORDER[currentIndex - 1];
}

/**
 * Получить информацию о грейде для UI
 * 
 * @param grade - Грейд экипировки
 * @returns Информация для отображения
 */
export function getGradeInfo(grade: EquipmentGrade): {
  config: GradeConfig;
  nextGrade: EquipmentGrade | null;
  prevGrade: EquipmentGrade | null;
} {
  const config = GRADE_CONFIGS[grade];
  const currentIndex = GRADE_ORDER.indexOf(grade);
  
  return {
    config,
    nextGrade:
      currentIndex < GRADE_ORDER.length - 1
        ? GRADE_ORDER[currentIndex + 1]
        : null,
    prevGrade: currentIndex > 0 ? GRADE_ORDER[currentIndex - 1] : null,
  };
}

/**
 * Сравнить грейды
 * 
 * @param a - Первый грейд
 * @param b - Второй грейд
 * @returns -1 если a < b, 0 если равны, 1 если a > b
 */
export function compareGrades(a: EquipmentGrade, b: EquipmentGrade): number {
  const indexA = GRADE_ORDER.indexOf(a);
  const indexB = GRADE_ORDER.indexOf(b);
  return Math.sign(indexA - indexB);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Требуемые материалы для улучшения
 */
export function getRequiredMaterialsForUpgrade(grade: EquipmentGrade): string[] {
  const requirements: Record<EquipmentGrade, string[]> = {
    damaged: ['iron'], // Ремонт до common
    common: ['steel', 'leather'],
    refined: ['spirit_iron', 'spirit_silk'],
    perfect: ['star_metal', 'dragon_bone'],
    transcendent: [], // Нельзя улучшить
  };
  return requirements[grade];
}

/**
 * Требуемый навык для улучшения
 */
export function getRequiredSkillForUpgrade(grade: EquipmentGrade): number {
  const requirements: Record<EquipmentGrade, number> = {
    damaged: 0,
    common: 10,
    refined: 30,
    perfect: 60,
    transcendent: 100,
  };
  return requirements[grade];
}

/**
 * Доступные типы бонусов для типа предмета
 */
function getAvailableBonusTypes(itemType: string): string[] {
  const mapping: Record<string, string[]> = {
    weapon: [
      'combat_damage',
      'combat_crit_chance',
      'combat_crit_damage',
      'combat_armor_penetration',
      'combat_attack_speed',
      'elemental_fire',
      'elemental_cold',
      'elemental_lightning',
    ],
    armor: [
      'defense_armor',
      'defense_evasion',
      'defense_hp',
      'defense_block',
      'qi_regeneration',
    ],
    charger: [
      'qi_regeneration',
      'qi_cost_reduction',
      'qi_conductivity',
    ],
    accessory: [
      'utility_move_speed',
      'utility_pickup_range',
      'special_life_steal',
    ],
    artifact: [
      'special_thorns',
      'special_life_steal',
      'elemental_all',
    ],
  };
  
  return [...(mapping[itemType] ?? [])];
}

/**
 * Базовое значение бонуса по типу
 */
function getBaseBonusValue(bonusType: string, level: number): number {
  const baseValues: Record<string, number> = {
    combat_damage: 5 + level * 2,
    combat_crit_chance: 2 + level,
    combat_crit_damage: 10 + level * 3,
    combat_armor_penetration: 3 + level,
    combat_attack_speed: 2 + level * 0.5,
    defense_armor: 3 + level * 2,
    defense_evasion: 2 + level,
    defense_hp: 10 + level * 5,
    defense_block: 2 + level,
    qi_regeneration: 2 + level,
    qi_cost_reduction: 3 + level,
    qi_conductivity: 5 + level * 2,
    elemental_fire: 5 + level * 2,
    elemental_cold: 5 + level * 2,
    elemental_lightning: 5 + level * 2,
    elemental_all: 3 + level,
    utility_move_speed: 3 + level,
    utility_pickup_range: 5 + level * 2,
    special_life_steal: 2 + level * 0.5,
    special_thorns: 3 + level,
  };
  
  return Math.floor(baseValues[bonusType] ?? 5);
}

/**
 * Категория бонуса по типу
 */
function getBonusCategory(bonusType: string): string {
  if (bonusType.startsWith('combat_')) return 'combat';
  if (bonusType.startsWith('defense_')) return 'defense';
  if (bonusType.startsWith('qi_')) return 'qi';
  if (bonusType.startsWith('elemental_')) return 'elemental';
  if (bonusType.startsWith('utility_')) return 'utility';
  if (bonusType.startsWith('special_')) return 'special';
  return 'utility';
}
