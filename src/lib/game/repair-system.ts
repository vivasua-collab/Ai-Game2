/**
 * REPAIR SYSTEM
 * 
 * Система ремонта экипировки с риском понижения грейда.
 * 
 * === МЕТОДЫ РЕМОНТА ===
 * 
 * 1. Полевой ремонт (field_repair)
 *    - +25% прочности
 *    - Качество: 40%
 *    - Риск понижения: 30%
 *    - Требования: железо, 0 навык
 *    - Стоимость: 10 золотых
 * 
 * 2. Правильный ремонт (proper_repair)
 *    - +50% прочности
 *    - Качество: 70%
 *    - Риск понижения: 15%
 *    - Требования: сталь, кожа, 20 навык
 *    - Стоимость: 50 золотых
 * 
 * 3. Мастерский ремонт (master_repair)
 *    - +80% прочности
 *    - Качество: 90%
 *    - Риск понижения: 5%
 *    - Требования: духовное железо, духовный шёлк, 50 навык
 *    - Стоимость: 200 золотых
 * 
 * 4. Божественный ремонт (divine_repair)
 *    - +100% прочности
 *    - Качество: 100%
 *    - Риск понижения: 0%
 *    - Требования: звёздный металл, небесный шёлк, 80 навык
 *    - Стоимость: 1000 золотых
 * 
 * === ПРАВИЛА ПОНИЖЕНИЯ ГРЕЙДА ===
 * 
 * - Понижение возможно при качестве < 70% и >= 3 ремонтов
 * - Риск растёт с количеством ремонтов (+5% за каждый)
 * - damaged нельзя понизить дальше
 */

import {
  RepairMethod,
  RepairMethodConfig,
  RepairOptions,
  RepairResult,
  DurabilityState,
  EquipmentGrade,
} from '@/types/equipment-v2';
import {
  restoreDurability,
  getDurabilityPercent,
} from './durability-system';
import { downgradeGrade, GRADE_CONFIGS } from './grade-system';

// ============================================================================
// REPAIR METHOD CONFIGURATIONS
// ============================================================================

/**
 * Конфигурации методов ремонта
 */
export const REPAIR_METHODS: Record<RepairMethod, RepairMethodConfig> = {
  field_repair: {
    id: 'field_repair',
    name: 'Полевой ремонт',
    durabilityRestore: 25,
    quality: 40,
    downgradeRisk: 30,
    materialCost: ['iron'],
    skillRequired: 0,
    goldCost: 10,
    description: 'Быстрый ремонт в полевых условиях. Высокий риск понижения грейда.',
  },
  
  proper_repair: {
    id: 'proper_repair',
    name: 'Правильный ремонт',
    durabilityRestore: 50,
    quality: 70,
    downgradeRisk: 15,
    materialCost: ['steel', 'leather'],
    skillRequired: 20,
    goldCost: 50,
    description: 'Качественный ремонт в кузнице. Умеренный риск.',
  },
  
  master_repair: {
    id: 'master_repair',
    name: 'Мастерский ремонт',
    durabilityRestore: 80,
    quality: 90,
    downgradeRisk: 5,
    materialCost: ['spirit_iron', 'spirit_silk'],
    skillRequired: 50,
    goldCost: 200,
    description: 'Ремонт у мастера-кузнеца. Низкий риск.',
  },
  
  divine_repair: {
    id: 'divine_repair',
    name: 'Божественный ремонт',
    durabilityRestore: 100,
    quality: 100,
    downgradeRisk: 0,
    materialCost: ['star_metal', 'heavenly_silk'],
    skillRequired: 80,
    goldCost: 1000,
    description: 'Ремонт с использованием божественных техник. Безупречный результат.',
  },
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Получить конфигурацию метода ремонта
 * 
 * @param method - Метод ремонта
 * @returns Конфигурация метода
 */
export function getRepairMethodConfig(method: RepairMethod): RepairMethodConfig {
  return REPAIR_METHODS[method];
}

/**
 * Проверить возможность ремонта
 * 
 * @param durability - Состояние прочности
 * @param options - Опции ремонта
 * @returns Результат проверки
 */
export function canRepair(
  durability: DurabilityState,
  options: RepairOptions
): { canRepair: boolean; reason?: string } {
  const methodConfig = REPAIR_METHODS[options.method];
  
  // Проверка навыка
  if (options.skill < methodConfig.skillRequired) {
    return {
      canRepair: false,
      reason: `Требуется навык кузнеца: ${methodConfig.skillRequired}`,
    };
  }
  
  // Проверка материалов
  const hasMaterials = methodConfig.materialCost.every((m) =>
    options.materials.includes(m)
  );
  if (!hasMaterials) {
    return {
      canRepair: false,
      reason: `Требуются материалы: ${methodConfig.materialCost.join(', ')}`,
    };
  }
  
  // Проверка необходимости ремонта
  if (durability.current >= durability.max) {
    return { canRepair: false, reason: 'Предмет не требует ремонта' };
  }
  
  return { canRepair: true };
}

/**
 * Рассчитать качество ремонта
 * 
 * @param options - Опции ремонта
 * @returns Качество ремонта (0-100)
 */
export function calculateRepairQuality(options: RepairOptions): number {
  const methodConfig = REPAIR_METHODS[options.method];
  let quality = methodConfig.quality;
  
  // Бонус от навыка (+0.5% за каждый пункт свыше минимума)
  const skillBonus = Math.max(0, options.skill - methodConfig.skillRequired) * 0.5;
  quality += skillBonus;
  
  // Бонус от материалов более высокого тира
  // (проверяем, есть ли материалы лучше требуемых)
  const bonusFromMaterials = calculateMaterialBonus(options.materials, methodConfig.materialCost);
  quality += bonusFromMaterials;
  
  // Ограничение
  return Math.min(100, Math.max(0, Math.floor(quality)));
}

/**
 * Рассчитать бонус от материалов
 */
function calculateMaterialBonus(
  availableMaterials: string[],
  requiredMaterials: string[]
): number {
  // Материалы более высокого тира дают бонус
  const highTierMaterials = ['spirit_iron', 'spirit_silk', 'star_metal', 'heavenly_silk'];
  const bonus = availableMaterials.filter((m) => highTierMaterials.includes(m)).length;
  return bonus * 5;
}

/**
 * Проверить, нужно ли понижение грейда
 * 
 * @param quality - Качество ремонта
 * @param currentGrade - Текущий грейд
 * @param repairCount - Количество ремонтов
 * @param rng - Функция случайного числа
 * @returns true если нужно понизить
 */
export function shouldDowngrade(
  quality: number,
  currentGrade: EquipmentGrade,
  repairCount: number,
  rng: () => number = Math.random
): boolean {
  // Нельзя понизить damaged
  if (currentGrade === 'damaged') return false;
  
  // Риск растёт с количеством ремонтов
  const repairRisk = repairCount * 5;
  
  // Базовый риск зависит от качества
  const qualityRisk = Math.max(0, 100 - quality);
  
  // Общий риск
  const totalRisk = qualityRisk + repairRisk;
  
  // Проверка
  const roll = rng() * 100;
  return roll < totalRisk;
}

/**
 * Выполнить ремонт
 * 
 * @param durability - Текущее состояние прочности
 * @param grade - Текущий грейд
 * @param options - Опции ремонта
 * @param rng - Функция случайного числа
 * @returns Новое состояние и результат
 */
export function repairEquipment(
  durability: DurabilityState,
  grade: EquipmentGrade,
  options: RepairOptions,
  rng: () => number = Math.random
): { durability: DurabilityState; result: RepairResult } {
  // Проверка возможности
  const check = canRepair(durability, options);
  if (!check.canRepair) {
    throw new Error(check.reason);
  }
  
  const methodConfig = REPAIR_METHODS[options.method];
  const quality = calculateRepairQuality(options);
  
  // Расчёт восстановления прочности
  const restorePercent = methodConfig.durabilityRestore;
  const restoreAmount = Math.floor(durability.max * restorePercent / 100);
  
  // Проверка понижения грейда
  let newGrade = grade;
  let didDowngrade = false;
  
  // Риск понижения: базовый риск метода + модификаторы
  const effectiveDowngradeRisk = calculateDowngradeRisk(
    methodConfig.downgradeRisk,
    quality,
    durability.repairCount
  );
  
  const downgradeRoll = rng() * 100;
  if (downgradeRoll < effectiveDowngradeRisk && grade !== 'damaged') {
    newGrade = downgradeGrade(grade, 'repair');
    didDowngrade = true;
  }
  
  // Новое состояние прочности
  const newDurability = restoreDurability(durability, restoreAmount, quality);
  
  // Результат
  const result: RepairResult = {
    success: true,
    quality,
    durabilityRestored: restoreAmount,
    newGrade,
    didDowngrade,
    message: generateRepairMessage(quality, didDowngrade, restoreAmount, newDurability.current, newDurability.max),
  };
  
  return { durability: newDurability, result };
}

/**
 * Рассчитать эффективный риск понижения
 */
function calculateDowngradeRisk(
  baseRisk: number,
  quality: number,
  repairCount: number
): number {
  // Качество выше 90% — риск минимальный
  if (quality >= 90) return Math.max(0, baseRisk - 25);
  
  // Качество выше 70% — риск снижен
  if (quality >= 70) return Math.max(0, baseRisk - 10);
  
  // Качество ниже 70% — риск повышен
  const qualityPenalty = (70 - quality) * 0.5;
  
  // Штраф за количество ремонтов
  const repairPenalty = repairCount * 5;
  
  return baseRisk + qualityPenalty + repairPenalty;
}

/**
 * Сгенерировать сообщение о ремонте
 */
function generateRepairMessage(
  quality: number,
  didDowngrade: boolean,
  restored: number,
  current: number,
  max: number
): string {
  let message = '';
  
  if (quality >= 90) {
    message = `Превосходный ремонт! Восстановлено ${restored} прочности (${current}/${max}).`;
  } else if (quality >= 70) {
    message = `Хороший ремонт. Восстановлено ${restored} прочности (${current}/${max}).`;
  } else if (quality >= 50) {
    message = `Посредственный ремонт. Восстановлено ${restored} прочности (${current}/${max}).`;
  } else {
    message = `Плохой ремонт. Восстановлено всего ${restored} прочности (${current}/${max}).`;
  }
  
  if (didDowngrade) {
    message += ' ⚠️ Качество предмета ухудшилось!';
  }
  
  return message;
}

// ============================================================================
// AVAILABILITY
// ============================================================================

/**
 * Получить доступные методы ремонта
 * 
 * @param skill - Навык кузнеца
 * @param materials - Имеющиеся материалы
 * @returns Доступные методы
 */
export function getAvailableRepairMethods(
  skill: number,
  materials: string[]
): RepairMethodConfig[] {
  return Object.values(REPAIR_METHODS).filter((config) => {
    // Проверка навыка
    if (skill < config.skillRequired) return false;
    
    // Проверка материалов
    return config.materialCost.every((m) => materials.includes(m));
  });
}

/**
 * Получить рекомендованный метод ремонта
 * 
 * @param durability - Состояние прочности
 * @param grade - Текущий грейд
 * @param skill - Навык кузнеца
 * @param materials - Имеющиеся материалы
 * @returns Рекомендованный метод или null
 */
export function getRecommendedRepairMethod(
  durability: DurabilityState,
  grade: EquipmentGrade,
  skill: number,
  materials: string[]
): RepairMethodConfig | null {
  const available = getAvailableRepairMethods(skill, materials);
  
  if (available.length === 0) return null;
  
  // Сортируем по качеству (лучшее качество = меньше риск)
  const sorted = [...available].sort((a, b) => b.quality - a.quality);
  
  // Если предмет высокого грейда, рекомендуем метод с минимальным риском
  if (grade === 'transcendent' || grade === 'perfect') {
    return sorted[0]; // Лучшее качество
  }
  
  // Для damaged — рекомендуем любой доступный
  if (grade === 'damaged') {
    return sorted[sorted.length - 1]; // Дешёвый вариант
  }
  
  // Для среднего грейда — баланс цены и качества
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Предварительный расчёт результата ремонта
 * 
 * @param durability - Состояние прочности
 * @param method - Метод ремонта
 * @param skill - Навык кузнеца
 * @returns Предварительный расчёт
 */
export function previewRepairResult(
  durability: DurabilityState,
  method: RepairMethod,
  skill: number
): {
  estimatedQuality: number;
  estimatedRestore: number;
  downgradeRisk: number;
  goldCost: number;
  materialsNeeded: string[];
} {
  const methodConfig = REPAIR_METHODS[method];
  const estimatedQuality = calculateRepairQuality({
    method,
    materials: methodConfig.materialCost,
    skill,
    bonuses: [],
  });
  
  const estimatedRestore = Math.floor(
    durability.max * methodConfig.durabilityRestore / 100
  );
  
  const downgradeRisk = calculateDowngradeRisk(
    methodConfig.downgradeRisk,
    estimatedQuality,
    durability.repairCount
  );
  
  return {
    estimatedQuality,
    estimatedRestore,
    downgradeRisk,
    goldCost: methodConfig.goldCost,
    materialsNeeded: methodConfig.materialCost,
  };
}
