/**
 * ============================================================================
 * ТЕСТЫ СИСТЕМЫ CAPACITY
 * ============================================================================
 * 
 * Запуск: bun run src/lib/constants/technique-capacity.test.ts
 * 
 * Тестирует:
 * - calculateQiDensity()
 * - calculateTechniqueCapacity()
 * - checkDestabilizationWithBaseQi()
 * - getBaseCapacity()
 */

import {
  QI_DENSITY_TABLE,
  calculateQiDensity,
  calculateTechniqueCapacity,
  checkDestabilizationWithBaseQi,
  getBaseCapacity,
  isPassiveTechnique,
  BASE_CAPACITY_BY_TYPE,
  BASE_CAPACITY_BY_COMBAT_SUBTYPE,
} from './technique-capacity';
import type { TechniqueType, CombatSubtype } from '@/types/technique-types';

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
    toBeGreaterThan(expected: number) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${actual}`);
      }
    },
    notToBeNull() {
      if (actual === null) {
        throw new Error(`Expected not null`);
      }
    },
  };
}

// ============================================
// ТЕСТЫ QI_DENSITY
// ============================================

console.log('\n📊 ТЕСТЫ QI_DENSITY\n');

test('QI_DENSITY_TABLE: уровень 1 = 1', () => {
  expect(QI_DENSITY_TABLE[1]).toBe(1);
});

test('QI_DENSITY_TABLE: уровень 5 = 16', () => {
  expect(QI_DENSITY_TABLE[5]).toBe(16);
});

test('QI_DENSITY_TABLE: уровень 9 = 256', () => {
  expect(QI_DENSITY_TABLE[9]).toBe(256);
});

test('calculateQiDensity: возвращает 1 для уровня 1', () => {
  expect(calculateQiDensity(1)).toBe(1);
});

test('calculateQiDensity: возвращает 16 для уровня 5', () => {
  expect(calculateQiDensity(5)).toBe(16);
});

test('calculateQiDensity: возвращает 256 для уровня 9', () => {
  expect(calculateQiDensity(9)).toBe(256);
});

test('calculateQiDensity: ограничивает минимум на уровне 1', () => {
  expect(calculateQiDensity(0)).toBe(1);
  expect(calculateQiDensity(-5)).toBe(1);
});

test('calculateQiDensity: ограничивает максимум на уровне 9', () => {
  expect(calculateQiDensity(10)).toBe(256);
  expect(calculateQiDensity(100)).toBe(256);
});

// ============================================
// ТЕСТЫ BASE_CAPACITY
// ============================================

console.log('\n📦 ТЕСТЫ BASE_CAPACITY\n');

test('getBaseCapacity: cultivation возвращает null', () => {
  expect(getBaseCapacity('cultivation')).toBeNull();
});

test('getBaseCapacity: combat без subtype возвращает 48', () => {
  const result = getBaseCapacity('combat');
  expect(result).toBe(48);
});

test('getBaseCapacity: combat melee_strike возвращает 64', () => {
  const result = getBaseCapacity('combat', 'melee_strike');
  expect(result).toBe(64);
});

test('getBaseCapacity: combat melee_weapon возвращает 48', () => {
  const result = getBaseCapacity('combat', 'melee_weapon');
  expect(result).toBe(48);
});

test('getBaseCapacity: combat ranged_projectile возвращает 32', () => {
  const result = getBaseCapacity('combat', 'ranged_projectile');
  expect(result).toBe(32);
});

test('getBaseCapacity: defense возвращает 72', () => {
  const result = getBaseCapacity('defense');
  expect(result).toBe(72);
});

test('getBaseCapacity: formation возвращает 80', () => {
  const result = getBaseCapacity('formation');
  expect(result).toBe(80);
});

test('getBaseCapacity: support возвращает 56', () => {
  const result = getBaseCapacity('support');
  expect(result).toBe(56);
});

test('isPassiveTechnique: cultivation = true', () => {
  expect(isPassiveTechnique('cultivation')).toBe(true);
});

test('isPassiveTechnique: combat = false', () => {
  expect(isPassiveTechnique('combat')).toBe(false);
});

// ============================================
// ТЕСТЫ TECHNIQUE_CAPACITY
// ============================================

console.log('\n⚡ ТЕСТЫ TECHNIQUE_CAPACITY\n');

test('calculateTechniqueCapacity: cultivation возвращает null', () => {
  const result = calculateTechniqueCapacity('cultivation', 1, 0);
  expect(result).toBeNull();
});

test('calculateTechniqueCapacity: уровень 1, мастерство 0 = baseCapacity', () => {
  // combat без subtype = 48
  const result = calculateTechniqueCapacity('combat', 1, 0);
  expect(result).toBe(48);
});

test('calculateTechniqueCapacity: уровень 2 удваивает ёмкость', () => {
  // combat без subtype = 48 × 2 = 96
  const result = calculateTechniqueCapacity('combat', 2, 0);
  expect(result).toBe(96);
});

test('calculateTechniqueCapacity: уровень 5 ×16', () => {
  // combat без subtype = 48 × 16 = 768
  const result = calculateTechniqueCapacity('combat', 5, 0);
  expect(result).toBe(768);
});

test('calculateTechniqueCapacity: уровень 9 ×256', () => {
  // combat без subtype = 48 × 256 = 12288
  const result = calculateTechniqueCapacity('combat', 9, 0);
  expect(result).toBe(12288);
});

test('calculateTechniqueCapacity: мастерство 100 добавляет 50%', () => {
  // combat без subtype = 48 × 1 × 1.5 = 72
  const result = calculateTechniqueCapacity('combat', 1, 100);
  expect(result).toBe(72);
});

test('calculateTechniqueCapacity: уровень 5, мастерство 50', () => {
  // combat без subtype = 48 × 16 × 1.25 = 960
  const result = calculateTechniqueCapacity('combat', 5, 50);
  expect(result).toBe(960);
});

test('calculateTechniqueCapacity: melee_strike уровень 1', () => {
  // melee_strike = 64 × 1 × 1 = 64
  const result = calculateTechniqueCapacity('combat', 1, 0, 'melee_strike');
  expect(result).toBe(64);
});

test('calculateTechniqueCapacity: melee_strike уровень 9', () => {
  // melee_strike = 64 × 256 × 1 = 16384
  const result = calculateTechniqueCapacity('combat', 9, 0, 'melee_strike');
  expect(result).toBe(16384);
});

test('calculateTechniqueCapacity: ranged_projectile уровень 1', () => {
  // ranged_projectile = 32 × 1 × 1 = 32
  const result = calculateTechniqueCapacity('combat', 1, 0, 'ranged_projectile');
  expect(result).toBe(32);
});

// ============================================
// ТЕСТЫ ДЕСТАБИЛИЗАЦИИ
// ============================================

console.log('\n💥 ТЕСТЫ ДЕСТАБИЛИЗАЦИИ\n');

test('checkDestabilizationWithBaseQi: нормальное использование (ниже лимита)', () => {
  const result = checkDestabilizationWithBaseQi(10, 1, 100);
  expect(result.isDestabilized).toBe(false);
  expect(result.effectiveQi).toBe(10);
  expect(result.efficiency).toBe(1.0);
});

test('checkDestabilizationWithBaseQi: ровно 100% ёмкости', () => {
  const result = checkDestabilizationWithBaseQi(100, 1, 100);
  expect(result.isDestabilized).toBe(false);
  expect(result.effectiveQi).toBe(100);
});

test('checkDestabilizationWithBaseQi: 110% ёмкости (безопасный лимит)', () => {
  const result = checkDestabilizationWithBaseQi(110, 1, 100);
  expect(result.isDestabilized).toBe(false);
  expect(result.effectiveQi).toBe(110);
});

test('checkDestabilizationWithBaseQi: 111% ёмкости = дестабилизация', () => {
  const result = checkDestabilizationWithBaseQi(111, 1, 100);
  expect(result.isDestabilized).toBe(true);
  // effectiveQi ограничен capacity
  expect(result.effectiveQi).toBe(100);
  // backlash = (111 - 100) × 0.5 = 5.5 ≈ 5
  expect(result.backlashDamage).toBe(5);
});

test('checkDestabilizationWithBaseQi: 150% ёмкости', () => {
  const result = checkDestabilizationWithBaseQi(150, 1, 100);
  expect(result.isDestabilized).toBe(true);
  expect(result.effectiveQi).toBe(100);
  // backlash = (150 - 100) × 0.5 = 25
  expect(result.backlashDamage).toBe(25);
});

test('checkDestabilizationWithBaseQi: qiDensity влияет на расчёт', () => {
  // qiCost 10 × qiDensity 2 = 20 baseQiInput
  // capacity 100, safe limit 110
  const result = checkDestabilizationWithBaseQi(10, 2, 100);
  expect(result.isDestabilized).toBe(false);
  expect(result.effectiveQi).toBe(20);
});

test('checkDestabilizationWithBaseQi: qiDensity вызывает дестабилизацию', () => {
  // qiCost 60 × qiDensity 2 = 120 baseQiInput
  // capacity 100, safe limit 110
  const result = checkDestabilizationWithBaseQi(60, 2, 100);
  expect(result.isDestabilized).toBe(true);
  expect(result.effectiveQi).toBe(100);
  // backlash = (120 - 100) × 0.5 = 10
  expect(result.backlashDamage).toBe(10);
});

test('checkDestabilizationWithBaseQi: эффективность падает при дестабилизации', () => {
  // 150% capacity = эффективность ~67%
  const result = checkDestabilizationWithBaseQi(150, 1, 100);
  expect(result.isDestabilized).toBe(true);
  expect(result.efficiency).toBe(100 / 150); // ~0.67
});

// ============================================
// ИНТЕГРАЦИОННЫЕ ТЕСТЫ
// ============================================

console.log('\n🔗 ИНТЕГРАЦИОННЫЕ ТЕСТЫ\n');

test('ИНТЕГРАЦИЯ: Уровень 5 культиватора, техника уровня 3', () => {
  const cultivationLevel = 5;
  const techniqueLevel = 3;
  const mastery = 25;
  
  const qiDensity = calculateQiDensity(cultivationLevel);
  expect(qiDensity).toBe(16);
  
  const capacity = calculateTechniqueCapacity('combat', techniqueLevel, mastery, 'melee_strike');
  // melee_strike = 64 × 4 (L3) × 1.125 (25% mastery) = 288
  expect(capacity).toBe(288);
  
  // qiCost 20 × density 16 = 320 baseQiInput
  const result = checkDestabilizationWithBaseQi(20, qiDensity, capacity!);
  expect(result.isDestabilized).toBe(true); // 320 > 288 × 1.1 = 316.8
});

test('ИНТЕГРАЦИЯ: Уровень 9 культиватора, транцендентная техника', () => {
  const cultivationLevel = 9;
  const techniqueLevel = 9;
  const mastery = 100;
  
  const qiDensity = calculateQiDensity(cultivationLevel);
  expect(qiDensity).toBe(256);
  
  const capacity = calculateTechniqueCapacity('combat', techniqueLevel, mastery, 'melee_strike');
  // melee_strike = 64 × 256 (L9) × 1.5 (100% mastery) = 24576
  expect(capacity).toBe(24576);
  
  // qiCost 50 × density 256 = 12800 baseQiInput
  // capacity × 1.1 = 27033.6
  const result = checkDestabilizationWithBaseQi(50, qiDensity, capacity!);
  expect(result.isDestabilized).toBe(false); // 12800 < 27033.6
});

test('ИНТЕГРАЦИЯ: Защитная техника имеет высокую ёмкость', () => {
  const capacity = calculateTechniqueCapacity('defense', 5, 50);
  // defense = 72 × 16 (L5) × 1.25 (50% mastery) = 1440
  expect(capacity).toBe(1440);
});

test('ИНТЕГРАЦИЯ: Формация имеет максимальную ёмкость', () => {
  const capacity = calculateTechniqueCapacity('formation', 1, 0);
  // formation = 80
  expect(capacity).toBe(80);
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
