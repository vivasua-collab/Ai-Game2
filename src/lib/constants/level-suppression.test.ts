/**
 * ============================================================================
 * ТЕСТЫ СИСТЕМЫ ПОДАВЛЕНИЯ УРОВНЕМ (Level Suppression)
 * ============================================================================
 * 
 * Запуск: bun run src/lib/constants/level-suppression.test.ts
 * 
 * Тестирует:
 * - calculateLevelSuppression()
 * - calculateLevelSuppressionFull()
 * - isTargetImmune()
 * - getSuppressionDescription()
 */

import {
  LEVEL_SUPPRESSION_TABLE,
  MAX_LEVEL_DIFFERENCE,
  calculateLevelSuppression,
  calculateLevelSuppressionFull,
  isTargetImmune,
  getSuppressionDescription,
  SUPPRESSION_EXAMPLES,
  type LevelSuppressionResult,
} from './level-suppression';
import type { AttackType } from '@/types/technique-types';

// ============================================
// УТИЛИТЫ ДЛЯ ТЕСТИРОВАНИЯ
// ============================================

interface TestResult {
  name: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true, expected: null, actual: null });
    console.log(`✅ ${name}`);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    results.push({ name, passed: false, expected: null, actual: null, error });
    console.log(`❌ ${name}: ${error}`);
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual(expected: T) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeCloseTo(expected: number, precision: number = 0) {
      const diff = Math.abs(actual as number - expected);
      if (diff > Math.pow(10, -precision)) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if ((actual as number) <= expected) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if ((actual as number) >= expected) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    },
    toBeTrue() {
      if (actual !== true) {
        throw new Error(`Expected true, got ${actual}`);
      }
    },
    toBeFalse() {
      if (actual !== false) {
        throw new Error(`Expected false, got ${actual}`);
      }
    },
  };
}

// ============================================
// ТЕСТЫ ТАБЛИЦЫ ПОДАВЛЕНИЯ
// ============================================

console.log('\n📊 ТЕСТЫ ТАБЛИЦЫ ПОДАВЛЕНИЯ\n');

test('LEVEL_SUPPRESSION_TABLE: разница 0 = множители 1.0', () => {
  expect(LEVEL_SUPPRESSION_TABLE[0].normal).toBe(1.0);
  expect(LEVEL_SUPPRESSION_TABLE[0].technique).toBe(1.0);
  expect(LEVEL_SUPPRESSION_TABLE[0].ultimate).toBe(1.0);
});

test('LEVEL_SUPPRESSION_TABLE: разница 1 = normal 0.5, technique 0.75', () => {
  expect(LEVEL_SUPPRESSION_TABLE[1].normal).toBe(0.5);
  expect(LEVEL_SUPPRESSION_TABLE[1].technique).toBe(0.75);
  expect(LEVEL_SUPPRESSION_TABLE[1].ultimate).toBe(1.0);
});

test('LEVEL_SUPPRESSION_TABLE: разница 2 = normal 0.1, technique 0.25', () => {
  expect(LEVEL_SUPPRESSION_TABLE[2].normal).toBe(0.1);
  expect(LEVEL_SUPPRESSION_TABLE[2].technique).toBe(0.25);
  expect(LEVEL_SUPPRESSION_TABLE[2].ultimate).toBe(0.5);
});

test('LEVEL_SUPPRESSION_TABLE: разница 3 = normal 0.0 (иммунитет)', () => {
  expect(LEVEL_SUPPRESSION_TABLE[3].normal).toBe(0.0);
  expect(LEVEL_SUPPRESSION_TABLE[3].technique).toBe(0.05);
  expect(LEVEL_SUPPRESSION_TABLE[3].ultimate).toBe(0.25);
});

test('LEVEL_SUPPRESSION_TABLE: разница 5 = полный иммунитет', () => {
  expect(LEVEL_SUPPRESSION_TABLE[5].normal).toBe(0.0);
  expect(LEVEL_SUPPRESSION_TABLE[5].technique).toBe(0.0);
  expect(LEVEL_SUPPRESSION_TABLE[5].ultimate).toBe(0.0);
});

test('MAX_LEVEL_DIFFERENCE = 5', () => {
  expect(MAX_LEVEL_DIFFERENCE).toBe(5);
});

// ============================================
// ТЕСТЫ calculateLevelSuppression()
// ============================================

console.log('\n⚔️ ТЕСТЫ calculateLevelSuppression()\n');

test('Равные уровни = множитель 1.0', () => {
  expect(calculateLevelSuppression(5, 5, 'normal')).toBe(1.0);
  expect(calculateLevelSuppression(9, 9, 'technique')).toBe(1.0);
  expect(calculateLevelSuppression(1, 1, 'ultimate')).toBe(1.0);
});

test('Защитник выше на 1 уровень: normal 0.5', () => {
  expect(calculateLevelSuppression(5, 6, 'normal')).toBe(0.5);
});

test('Защитник выше на 1 уровень: technique 0.75', () => {
  expect(calculateLevelSuppression(5, 6, 'technique')).toBe(0.75);
});

test('Защитник выше на 1 уровень: ultimate 1.0', () => {
  expect(calculateLevelSuppression(5, 6, 'ultimate')).toBe(1.0);
});

test('Защитник выше на 2 уровня: normal 0.1', () => {
  expect(calculateLevelSuppression(5, 7, 'normal')).toBe(0.1);
});

test('Защитник выше на 3 уровня: normal 0.0 (иммунитет)', () => {
  expect(calculateLevelSuppression(5, 8, 'normal')).toBe(0.0);
});

test('Защитник выше на 5+ уровней: полный иммунитет', () => {
  expect(calculateLevelSuppression(1, 9, 'normal')).toBe(0.0);
  expect(calculateLevelSuppression(1, 9, 'technique')).toBe(0.0);
  expect(calculateLevelSuppression(1, 9, 'ultimate')).toBe(0.0);
});

// ============================================
// ТЕСТЫ TECHNIQUE ПРОБИТИЯ
// ============================================

console.log('\n🔮 ТЕСТЫ TECHNIQUE ПРОБИТИЯ\n');

test('Technique без уровня техники = базовый множитель', () => {
  // L5 атакует L7 (разница 2)
  expect(calculateLevelSuppression(5, 7, 'technique')).toBe(0.25);
});

test('Technique L5 пробивает +1 уровень (эффективно L5 vs L6)', () => {
  // Атакующий L5, техника L5, защитник L6
  // Эффективный уровень атакующего = max(5, 5) = 5
  // Разница = 6 - 5 = 1 → technique multiplier = 0.75
  expect(calculateLevelSuppression(5, 6, 'technique', 5)).toBe(0.75);
});

test('Technique L8 пробивает +3 уровня (эффективно L8 vs L9)', () => {
  // Атакующий L5, техника L8, защитник L9
  // Эффективный уровень атакующего = max(5, 8) = 8
  // Разница = 9 - 8 = 1 → technique multiplier = 0.75
  expect(calculateLevelSuppression(5, 9, 'technique', 8)).toBe(0.75);
});

test('Technique L9 атакует L9 = 1.0', () => {
  expect(calculateLevelSuppression(9, 9, 'technique', 9)).toBe(1.0);
});

test('Technique ниже уровня атакующего не уменьшает эффективность', () => {
  // Атакующий L9, техника L5, защитник L9
  // Эффективный уровень = max(9, 5) = 9
  // Разница = 0 → 1.0
  expect(calculateLevelSuppression(9, 9, 'technique', 5)).toBe(1.0);
});

// ============================================
// ТЕСТЫ ULTIMATE
// ============================================

console.log('\n⚡ ТЕСТЫ ULTIMATE АТАК\n');

test('Ultimate пробивает +4 уровня (L5 vs L9 = 0.1)', () => {
  // Разница 4 → ultimate = 0.1
  expect(calculateLevelSuppression(5, 9, 'ultimate')).toBe(0.1);
});

test('Ultimate L5 vs L10 (разница 5+) = 0.0', () => {
  expect(calculateLevelSuppression(5, 10, 'ultimate')).toBe(0.0);
});

test('Ultimate эффективнее normal при большой разнице', () => {
  const normalResult = calculateLevelSuppression(7, 9, 'normal');
  const ultimateResult = calculateLevelSuppression(7, 9, 'ultimate');
  expect(ultimateResult).toBeGreaterThan(normalResult);
});

test('Ultimate эффективнее technique при большой разнице', () => {
  const techniqueResult = calculateLevelSuppression(5, 9, 'technique');
  const ultimateResult = calculateLevelSuppression(5, 9, 'ultimate');
  expect(ultimateResult).toBeGreaterThan(techniqueResult);
});

// ============================================
// ТЕСТЫ isTargetImmune()
// ============================================

console.log('\n🛡️ ТЕСТЫ isTargetImmune()\n');

test('Равные уровни: не иммунен', () => {
  expect(isTargetImmune(5, 5, 'normal')).toBeFalse();
});

test('Защитник +3 уровня: иммунен к normal', () => {
  expect(isTargetImmune(5, 8, 'normal')).toBeTrue();
});

test('Защитник +3 уровня: не иммунен к technique', () => {
  expect(isTargetImmune(5, 8, 'technique')).toBeFalse();
});

test('Защитник +5 уровней: иммунен ко всему', () => {
  expect(isTargetImmune(1, 9, 'normal')).toBeTrue();
  expect(isTargetImmune(1, 9, 'technique')).toBeTrue();
  expect(isTargetImmune(1, 9, 'ultimate')).toBeTrue();
});

test('Technique L9 пробивает иммунитет', () => {
  // L1 + техника L9 vs L9 = не иммунен
  expect(isTargetImmune(1, 9, 'technique', 9)).toBeFalse();
});

// ============================================
// ТЕСТЫ calculateLevelSuppressionFull()
// ============================================

console.log('\n📋 ТЕСТЫ calculateLevelSuppressionFull()\n');

test('Возвращает полный результат с метаданными', () => {
  const result = calculateLevelSuppressionFull(5, 7, 'technique');
  
  expect(result.levelDifference).toBe(2);
  expect(result.attackType).toBe('technique');
  expect(result.multiplier).toBe(0.25);
  expect(result.wasSuppressed).toBeTrue();
});

test('Равные уровни: wasSuppressed = false', () => {
  const result = calculateLevelSuppressionFull(5, 5, 'normal');
  expect(result.wasSuppressed).toBeFalse();
});

test('Эффективный уровень учитывает уровень техники', () => {
  const result = calculateLevelSuppressionFull(5, 9, 'technique', 8);
  // Эффективный уровень = max(5, 8) = 8
  // Разница = 9 - 8 = 1
  expect(result.effectiveAttackerLevel).toBe(8);
  expect(result.levelDifference).toBe(1);
});

test('Иммунитет корректно определяется', () => {
  const result = calculateLevelSuppressionFull(5, 9, 'normal');
  expect(result.multiplier).toBe(0);
});

// ============================================
// ТЕСТЫ getSuppressionDescription()
// ============================================

console.log('\n📝 ТЕСТЫ getSuppressionDescription()\n');

test('Нет подавления: "Нет подавления"', () => {
  const result = calculateLevelSuppressionFull(5, 5, 'normal');
  const desc = getSuppressionDescription(result);
  expect(desc).toBe('Нет подавления');
});

test('Иммунитет: "Иммунитет (+N ур.)"', () => {
  const result = calculateLevelSuppressionFull(5, 9, 'normal');
  const desc = getSuppressionDescription(result);
  expect(desc).toBe('Иммунитет (+4 ур.)');
});

test('Подавление: показывает процент и тип', () => {
  const result = calculateLevelSuppressionFull(5, 7, 'technique');
  const desc = getSuppressionDescription(result);
  expect(desc).toBe('Подавление +2 ур. (техника): 25% урона');
});

// ============================================
// ТЕСТЫ ИЗ SUPPRESSION_EXAMPLES
// ============================================

console.log('\n📚 ТЕСТЫ ИЗ SUPPRESSION_EXAMPLES\n');

test('SUPPRESSION_EXAMPLES: все примеры корректны', () => {
  for (const example of SUPPRESSION_EXAMPLES) {
    const result = calculateLevelSuppression(
      example.attackerLevel,
      example.defenderLevel,
      example.attackType,
      example.techniqueLevel
    );
    
    if (result !== example.expected) {
      throw new Error(
        `Example failed: L${example.attackerLevel} vs L${example.defenderLevel} ` +
        `${example.attackType}` +
        `${example.techniqueLevel ? ` L${example.techniqueLevel}` : ''} ` +
        `= expected ${example.expected}, got ${result}`
      );
    }
  }
});

// ============================================
// EDGE CASES
// ============================================

console.log('\n⚠️ EDGE CASES\n');

test('Уровни с дробной частью округляются', () => {
  // Math.floor в коде
  expect(calculateLevelSuppression(5.9, 6.1, 'normal')).toBe(0.5);
});

test('Отрицательные уровни обрабатываются', () => {
  // Разница = Math.max(0, ...) — не может быть отрицательной
  // При отрицательном защитнике разница = 0
  expect(calculateLevelSuppression(5, -1, 'normal')).toBe(1.0);
});

test('Атакующий выше защитника: нет подавления', () => {
  // Атакующий L9 vs защитник L5
  // Разница = Math.max(0, 5 - 9) = 0
  expect(calculateLevelSuppression(9, 5, 'normal')).toBe(1.0);
});

test('Очень большие уровни: ограничиваются таблицей', () => {
  // Разница 100 → ограничивается до 5
  expect(calculateLevelSuppression(1, 100, 'normal')).toBe(0.0);
});

// ============================================
// ИТОГИ
// ============================================

console.log('\n' + '='.repeat(50));
console.log('📊 ИТОГИ ТЕСТОВ');
console.log('='.repeat(50));

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`\n✅ Пройдено: ${passed}/${total}`);
console.log(`❌ Провалено: ${failed}/${total}`);

if (failed > 0) {
  console.log('\n❌ Проваленные тесты:');
  results
    .filter(r => !r.passed)
    .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
  process.exit(1);
} else {
  console.log('\n🎉 Все тесты пройдены!');
  process.exit(0);
}
