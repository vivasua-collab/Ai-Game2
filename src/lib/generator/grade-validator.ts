/**
 * ============================================================================
 * GRADE VALIDATOR - Валидация конфигураций Grade
 * ============================================================================
 * 
 * Модуль для валидации конфигураций Grade при загрузке.
 * 
 * Запускается автоматически в dev режиме.
 * В production валидация пропускается для производительности.
 */

import {
  TechniqueGrade,
  EquipmentGrade,
  FormationGrade,
  ConsumableGrade,
  TECHNIQUE_GRADE_CONFIGS,
  FORMATION_GRADE_CONFIGS,
  CONSUMABLE_GRADE_CONFIGS,
  TECHNIQUE_GRADE_ORDER,
  EQUIPMENT_GRADE_ORDER,
} from '../../types/grade';

import {
  UNIVERSAL_TECHNIQUE_DISTRIBUTION,
  UNIVERSAL_EQUIPMENT_DISTRIBUTION,
  TechniqueGradeDistribution,
  EquipmentGradeDistribution,
} from './grade-selector';

// ============================================================================
// ТИПЫ РЕЗУЛЬТАТОВ ВАЛИДАЦИИ
// ============================================================================

export interface ValidationError {
  category: string;
  grade: string;
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationWarning {
  category: string;
  grade: string;
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// ============================================================================
// ФУНКЦИИ ВАЛИДАЦИИ
// ============================================================================

/**
 * Валидация конфигурации грейда техники
 */
function validateTechniqueGradeConfig(grade: TechniqueGrade): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  const config = TECHNIQUE_GRADE_CONFIGS[grade];
  
  // Критические проверки
  
  // Множитель урона должен быть > 0
  if (config.damageMultiplier <= 0) {
    errors.push({
      category: 'technique',
      grade,
      field: 'damageMultiplier',
      message: 'damageMultiplier must be > 0',
      value: config.damageMultiplier,
    });
  }
  
  // Вес должен быть >= 0
  if (config.weight < 0) {
    errors.push({
      category: 'technique',
      grade,
      field: 'weight',
      message: 'weight must be >= 0',
      value: config.weight,
    });
  }
  
  // Максимум эффектов должен быть >= минимуму
  if (config.maxEffects < 0) {
    errors.push({
      category: 'technique',
      grade,
      field: 'maxEffects',
      message: 'maxEffects must be >= 0',
      value: config.maxEffects,
    });
  }
  
  // Предупреждения
  
  // transcendent не должен иметь upgradeChance > 0
  if (grade === 'transcendent' && config.weight > 10) {
    warnings.push({
      category: 'technique',
      grade,
      field: 'weight',
      message: 'transcendent grade weight is high (> 10%), may be unintended',
      value: config.weight,
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Валидация конфигурации грейда формации
 */
function validateFormationGradeConfig(grade: FormationGrade): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  const config = FORMATION_GRADE_CONFIGS[grade];
  
  if (config.effectMultiplier <= 0) {
    errors.push({
      category: 'formation',
      grade,
      field: 'effectMultiplier',
      message: 'effectMultiplier must be > 0',
      value: config.effectMultiplier,
    });
  }
  
  if (config.weight < 0) {
    errors.push({
      category: 'formation',
      grade,
      field: 'weight',
      message: 'weight must be >= 0',
      value: config.weight,
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Валидация конфигурации грейда расходника
 */
function validateConsumableGradeConfig(grade: ConsumableGrade): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  const config = CONSUMABLE_GRADE_CONFIGS[grade];
  
  if (config.effectMultiplier <= 0) {
    errors.push({
      category: 'consumable',
      grade,
      field: 'effectMultiplier',
      message: 'effectMultiplier must be > 0',
      value: config.effectMultiplier,
    });
  }
  
  if (config.weight < 0) {
    errors.push({
      category: 'consumable',
      grade,
      field: 'weight',
      message: 'weight must be >= 0',
      value: config.weight,
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Валидация распределения грейдов
 */
function validateDistribution(
  distribution: TechniqueGradeDistribution | EquipmentGradeDistribution,
  category: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  const weights = Object.values(distribution);
  const total = weights.reduce((sum, w) => sum + w, 0);
  
  // Сумма должна быть примерно 100 (допускаем погрешность 0.1)
  if (Math.abs(total - 100) > 0.1) {
    errors.push({
      category,
      grade: 'distribution',
      field: 'total',
      message: `Distribution total must be 100, got ${total.toFixed(2)}`,
      value: total,
    });
  }
  
  // Все веса должны быть >= 0
  for (const [grade, weight] of Object.entries(distribution)) {
    if (weight < 0) {
      errors.push({
        category,
        grade,
        field: 'weight',
        message: 'Weight must be >= 0',
        value: weight,
      });
    }
  }
  
  // Предупреждение о нулевых весах
  for (const [grade, weight] of Object.entries(distribution)) {
    if (weight === 0) {
      warnings.push({
        category,
        grade,
        field: 'weight',
        message: 'Weight is 0, this grade will never be selected',
        value: weight,
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Валидация порядка грейдов
 */
function validateGradeOrder(): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Проверка TECHNIQUE_GRADE_ORDER
  const expectedTechniqueOrder: TechniqueGrade[] = ['common', 'refined', 'perfect', 'transcendent'];
  if (JSON.stringify(TECHNIQUE_GRADE_ORDER) !== JSON.stringify(expectedTechniqueOrder)) {
    errors.push({
      category: 'order',
      grade: 'technique',
      field: 'TECHNIQUE_GRADE_ORDER',
      message: 'TECHNIQUE_GRADE_ORDER does not match expected order',
      value: { expected: expectedTechniqueOrder, actual: TECHNIQUE_GRADE_ORDER },
    });
  }
  
  // Проверка EQUIPMENT_GRADE_ORDER
  const expectedEquipmentOrder: EquipmentGrade[] = ['damaged', 'common', 'refined', 'perfect', 'transcendent'];
  if (JSON.stringify(EQUIPMENT_GRADE_ORDER) !== JSON.stringify(expectedEquipmentOrder)) {
    errors.push({
      category: 'order',
      grade: 'equipment',
      field: 'EQUIPMENT_GRADE_ORDER',
      message: 'EQUIPMENT_GRADE_ORDER does not match expected order',
      value: { expected: expectedEquipmentOrder, actual: EQUIPMENT_GRADE_ORDER },
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// ГЛАВНАЯ ФУНКЦИЯ ВАЛИДАЦИИ
// ============================================================================

/**
 * Валидировать все конфигурации Grade
 * 
 * Запускается автоматически при загрузке модуля в dev режиме.
 */
export function validateAllGradeConfigs(): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];
  
  // Валидация техник
  for (const grade of TECHNIQUE_GRADE_ORDER) {
    const result = validateTechniqueGradeConfig(grade);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }
  
  // Валидация формаций
  for (const grade of TECHNIQUE_GRADE_ORDER) {
    const result = validateFormationGradeConfig(grade as FormationGrade);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }
  
  // Валидация расходников
  for (const grade of TECHNIQUE_GRADE_ORDER) {
    const result = validateConsumableGradeConfig(grade as ConsumableGrade);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }
  
  // Валидация распределений
  const techDistResult = validateDistribution(UNIVERSAL_TECHNIQUE_DISTRIBUTION, 'technique_distribution');
  allErrors.push(...techDistResult.errors);
  allWarnings.push(...techDistResult.warnings);
  
  const equipDistResult = validateDistribution(UNIVERSAL_EQUIPMENT_DISTRIBUTION, 'equipment_distribution');
  allErrors.push(...equipDistResult.errors);
  allWarnings.push(...equipDistResult.warnings);
  
  // Валидация порядка
  const orderResult = validateGradeOrder();
  allErrors.push(...orderResult.errors);
  allWarnings.push(...orderResult.warnings);
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Вывести результаты валидации в консоль
 */
export function logValidationResults(result: ValidationResult): void {
  if (result.valid) {
    console.log('[GradeValidator] ✅ All grade configurations are valid');
  } else {
    console.error('[GradeValidator] ❌ Validation failed with errors:');
    for (const error of result.errors) {
      console.error(`  [${error.category}/${error.grade}] ${error.field}: ${error.message}`, error.value || '');
    }
  }
  
  if (result.warnings.length > 0) {
    console.warn('[GradeValidator] ⚠️ Warnings:');
    for (const warning of result.warnings) {
      console.warn(`  [${warning.category}/${warning.grade}] ${warning.field}: ${warning.message}`, warning.value || '');
    }
  }
}

// ============================================================================
// АВТОМАТИЧЕСКАЯ ВАЛИДАЦИЯ ПРИ ЗАГРУЗКЕ (dev mode)
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  const result = validateAllGradeConfigs();
  logValidationResults(result);
  
  if (!result.valid) {
    // В dev режиме выбрасываем ошибку при невалидной конфигурации
    throw new Error('[GradeValidator] Grade configuration validation failed. See console for details.');
  }
}

// Экспорт для ручного использования
export default {
  validateAllGradeConfigs,
  logValidationResults,
  validateTechniqueGradeConfig,
  validateFormationGradeConfig,
  validateConsumableGradeConfig,
  validateDistribution,
};
