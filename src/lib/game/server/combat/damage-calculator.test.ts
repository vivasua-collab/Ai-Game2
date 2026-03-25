/**
 * ============================================================================
 * ТЕСТЫ СЕРВЕРНОЙ БОЕВОЙ СИСТЕМЫ (Server Combat System)
 * ============================================================================
 * 
 * Запуск: bun run src/lib/game/server/combat/damage-calculator.test.ts
 * 
 * Тестирует:
 * - calculateTechniqueDamage (Архитектура "Матрёшка")
 * - calculateLevelSuppression
 * - processQiDamage (Qi Buffer)
 * - calculateDestabilization
 * - processDamagePipeline
 * 
 * @see docs/checkpoints/checkpoint_03_25_phase1_combat.md
 */

import {
  calculateTechniqueDamage,
  calculateLevelSuppression,
  calculateLevelSuppressionFull,
  processQiDamage,
  calculateDestabilization,
  processDamagePipeline,
  calculateFinalDamageQuick,
  canDamageTarget,
} from './damage-calculator';
import {
  calculateQiDensity,
  QI_DENSITY_TABLE,
  LEVEL_SUPPRESSION_TABLE,
  GRADE_DAMAGE_MULTIPLIERS,
  BASE_CAPACITY_BY_TYPE,
  BASE_CAPACITY_BY_COMBAT_SUBTYPE,
  ULTIMATE_CHANCE_BY_GRADE,
  ULTIMATE_DAMAGE_MULTIPLIER,
  ULTIMATE_QI_COST_MULTIPLIER,
  MATERIAL_DAMAGE_REDUCTION,
} from '../types';

// ============================================
// УТИЛИТЫ ДЛЯ ТЕСТИРОВАНИЯ
// ============================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    results.push({ name, passed: false, error });
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
    toBeCloseTo(expected: number, tolerance: number = 1) {
      const diff = Math.abs(actual as number - expected);
      if (diff > tolerance) {
        throw new Error(`Expected ${expected}±${tolerance}, got ${actual}`);
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
      if (actual !== true) throw new Error(`Expected true, got ${actual}`);
    },
    toBeFalse() {
      if (actual !== false) throw new Error(`Expected false, got ${actual}`);
    },
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected defined, got ${actual}`);
      }
    },
  };
}

// ============================================
// ТЕСТЫ QI DENSITY (ПЛОТНОСТЬ ЦИ)
// ============================================

console.log('\n🌟 ТЕСТЫ QI DENSITY\n');

test('Qi Density L1 = 1', () => {
  expect(calculateQiDensity(1)).toBe(1);
  expect(QI_DENSITY_TABLE[1]).toBe(1);
});

test('Qi Density L5 = 16', () => {
  expect(calculateQiDensity(5)).toBe(16);
  expect(QI_DENSITY_TABLE[5]).toBe(16);
});

test('Qi Density L9 = 256', () => {
  expect(calculateQiDensity(9)).toBe(256);
  expect(QI_DENSITY_TABLE[9]).toBe(256);
});

test('Формула Qi Density = 2^(level-1)', () => {
  for (let level = 1; level <= 9; level++) {
    const expected = Math.pow(2, level - 1);
    expect(calculateQiDensity(level)).toBe(expected);
  }
});

// ============================================
// ТЕСТЫ LEVEL SUPPRESSION
// ============================================

console.log('\n⚔️ ТЕСТЫ LEVEL SUPPRESSION\n');

test('Равные уровни: множитель 1.0', () => {
  expect(LEVEL_SUPPRESSION_TABLE[0].normal).toBe(1.0);
  expect(LEVEL_SUPPRESSION_TABLE[0].technique).toBe(1.0);
  expect(LEVEL_SUPPRESSION_TABLE[0].ultimate).toBe(1.0);
});

test('+1 уровень: normal=0.5, technique=0.75, ultimate=1.0', () => {
  expect(LEVEL_SUPPRESSION_TABLE[1].normal).toBe(0.5);
  expect(LEVEL_SUPPRESSION_TABLE[1].technique).toBe(0.75);
  expect(LEVEL_SUPPRESSION_TABLE[1].ultimate).toBe(1.0);
});

test('+5 уровней: ПОЛНЫЙ ИММУНИТЕТ', () => {
  expect(LEVEL_SUPPRESSION_TABLE[5].normal).toBe(0.0);
  expect(LEVEL_SUPPRESSION_TABLE[5].technique).toBe(0.0);
  expect(LEVEL_SUPPRESSION_TABLE[5].ultimate).toBe(0.0);
});

test('calculateLevelSuppression: L5 атакует L7', () => {
  const mult = calculateLevelSuppression(5, 7, 'technique');
  expect(mult).toBe(0.25);
});

test('calculateLevelSuppressionFull: возвращает полную информацию', () => {
  const result = calculateLevelSuppressionFull(5, 7, 'technique');
  expect(result.levelDifference).toBe(2);
  expect(result.multiplier).toBe(0.25);
  expect(result.wasSuppressed).toBeTrue();
});

// ============================================
// ТЕСТЫ АРХИТЕКТУРЫ "МАТРЁШКА"
// ============================================

console.log('\n🪆 ТЕСТЫ АРХИТЕКТУРЫ "МАТРЁШКА"\n');

test('BASE_CAPACITY_BY_TYPE: formation=80', () => {
  expect(BASE_CAPACITY_BY_TYPE['formation']).toBe(80);
});

test('BASE_CAPACITY_BY_TYPE: combat=48', () => {
  expect(BASE_CAPACITY_BY_TYPE['combat']).toBe(48);
});

test('BASE_CAPACITY_BY_TYPE: cultivation=null (пассивная)', () => {
  expect(BASE_CAPACITY_BY_TYPE['cultivation']).toBe(null);
});

test('BASE_CAPACITY_BY_COMBAT_SUBTYPE: melee_strike=64', () => {
  expect(BASE_CAPACITY_BY_COMBAT_SUBTYPE['melee_strike']).toBe(64);
});

test('BASE_CAPACITY_BY_COMBAT_SUBTYPE: ranged_projectile=32', () => {
  expect(BASE_CAPACITY_BY_COMBAT_SUBTYPE['ranged_projectile']).toBe(32);
});

test('GRADE_DAMAGE_MULTIPLIERS: common=1.0', () => {
  expect(GRADE_DAMAGE_MULTIPLIERS['common']).toBe(1.0);
});

test('GRADE_DAMAGE_MULTIPLIERS: refined=1.2', () => {
  expect(GRADE_DAMAGE_MULTIPLIERS['refined']).toBe(1.2);
});

test('GRADE_DAMAGE_MULTIPLIERS: transcendent=1.6', () => {
  expect(GRADE_DAMAGE_MULTIPLIERS['transcendent']).toBe(1.6);
});

// ============================================
// ТЕСТЫ РАСЧЁТА УРОНА ТЕХНИКИ
// ============================================

console.log('\n⚔️ ТЕСТЫ РАСЧЁТА УРОНА ТЕХНИКИ\n');

test('Combat техника L1 common: базовый урон', () => {
  const result = calculateTechniqueDamage({
    techniqueLevel: 1,
    techniqueType: 'combat',
    combatSubtype: 'melee_strike',
    grade: 'common',
    mastery: 0,
    cultivationLevel: 1,
  });
  
  expect(result.baseCapacity).toBe(64);
  expect(result.finalDamage).toBe(64);
  expect(result.qiCost).toBe(64);
});

test('Combat техника L3 refined: множители', () => {
  const result = calculateTechniqueDamage({
    techniqueLevel: 3,
    techniqueType: 'combat',
    combatSubtype: 'melee_strike',
    grade: 'refined',
    mastery: 0,
    cultivationLevel: 3,
  });
  
  // baseCapacity=64, levelMultiplier=4, gradeMult=1.2
  expect(result.baseCapacity).toBe(64);
  expect(result.capacity).toBe(256);
  expect(result.gradeMultiplier).toBe(1.2);
  expect(result.finalDamage).toBe(307);
});

// ============================================
// ТЕСТЫ QI BUFFER
// ============================================

console.log('\n✨ ТЕСТЫ QI BUFFER\n');

test('Qi Buffer: 90% поглощение', () => {
  const result = processQiDamage({
    incomingDamage: 100,
    currentQi: 500,
    maxQi: 1000,
  });
  
  expect(result.bufferActivated).toBeTrue();
  expect(result.absorbedDamage).toBeCloseTo(90, 1);
  expect(result.remainingDamage).toBeCloseTo(10, 1);
});

test('Qi Buffer со щитом: 95% поглощение', () => {
  const result = processQiDamage({
    incomingDamage: 100,
    currentQi: 500,
    maxQi: 1000,
    hasShieldTechnique: true,
  });
  
  expect(result.absorbedDamage).toBeCloseTo(95, 1);
  expect(result.remainingDamage).toBeCloseTo(5, 1);
});

test('Qi Buffer при 0 Qi: не активируется', () => {
  const result = processQiDamage({
    incomingDamage: 100,
    currentQi: 0,
    maxQi: 0,
  });
  
  expect(result.bufferActivated).toBeFalse();
  expect(result.remainingDamage).toBe(100);
});

// ============================================
// ТЕСТЫ ДЕСТАБИЛИЗАЦИИ
// ============================================

console.log('\n💥 ТЕСТЫ ДЕСТАБИЛИЗАЦИИ\n');

test('Нет переполнения: дестабилизации нет', () => {
  const result = calculateDestabilization(50, 100, true);
  
  expect(result.overflow).toBeFalse();
  expect(result.backlashDamage).toBe(0);
  expect(result.targetDamage).toBe(0);
});

test('Переполнение melee: урон практику и цели', () => {
  const result = calculateDestabilization(150, 100, true);
  
  expect(result.overflow).toBeTrue();
  expect(result.excessQi).toBe(50);
  expect(result.backlashDamage).toBe(25); // 50 × 0.5
  expect(result.targetDamage).toBe(75);   // 150 × 0.5
});

test('Переполнение ranged: урон только практику', () => {
  const result = calculateDestabilization(150, 100, false);
  
  expect(result.overflow).toBeTrue();
  expect(result.backlashDamage).toBe(25); // 50 × 0.5
  expect(result.targetDamage).toBe(0);    // Ranged не передаёт урон
});

// ============================================
// ТЕСТЫ ULTIMATE
// ============================================

console.log('\n⚡ ТЕСТЫ ULTIMATE ТЕХНИК\n');

test('ULTIMATE_CHANCE: только transcendent = 5%', () => {
  expect(ULTIMATE_CHANCE_BY_GRADE['common']).toBe(0);
  expect(ULTIMATE_CHANCE_BY_GRADE['refined']).toBe(0);
  expect(ULTIMATE_CHANCE_BY_GRADE['perfect']).toBe(0);
  expect(ULTIMATE_CHANCE_BY_GRADE['transcendent']).toBe(0.05);
});

test('ULTIMATE_DAMAGE_MULTIPLIER = 1.3', () => {
  expect(ULTIMATE_DAMAGE_MULTIPLIER).toBe(1.3);
});

test('ULTIMATE_QI_COST_MULTIPLIER = 1.5', () => {
  expect(ULTIMATE_QI_COST_MULTIPLIER).toBe(1.5);
});

test('Ultimate пробивает +4 уровня (10% урона)', () => {
  const multNormal = calculateLevelSuppression(5, 9, 'normal');
  const multTechnique = calculateLevelSuppression(5, 9, 'technique');
  const multUltimate = calculateLevelSuppression(5, 9, 'ultimate');
  
  expect(multNormal).toBe(0);
  expect(multTechnique).toBe(0);
  expect(multUltimate).toBe(0.1);
});

// ============================================
// ТЕСТЫ MATERIAL DAMAGE REDUCTION
// ============================================

console.log('\n🧬 ТЕСТЫ MATERIAL DAMAGE REDUCTION\n');

test('Organic: 0% снижения', () => {
  expect(MATERIAL_DAMAGE_REDUCTION['organic']).toBe(0);
});

test('Scaled: 30% снижения', () => {
  expect(MATERIAL_DAMAGE_REDUCTION['scaled']).toBe(0.30);
});

test('Ethereal: 70% снижения', () => {
  expect(MATERIAL_DAMAGE_REDUCTION['ethereal']).toBe(0.70);
});

// ============================================
// ТЕСТЫ ПОЛНОГО PIPELINE
// ============================================

console.log('\n🔗 ТЕСТЫ ПОЛНОГО PIPELINE\n');

test('Pipeline: иммунитет при большом уровне', () => {
  const result = processDamagePipeline({
    rawDamage: 100,
    attacker: { id: 'a1', cultivationLevel: 1 },
    defender: { id: 'd1', cultivationLevel: 7, currentQi: 0, maxQi: 0 },
  });
  
  expect(result.success).toBeTrue();
  expect(result.finalDamage).toBe(0);
});

test('Pipeline: Qi Buffer применяется', () => {
  const result = processDamagePipeline({
    rawDamage: 100,
    attacker: { id: 'a1', cultivationLevel: 5 },
    defender: { id: 'd1', cultivationLevel: 5, currentQi: 500, maxQi: 1000 },
  });
  
  expect(result.qiBuffer).toBeDefined();
  expect(result.qiBuffer!.bufferActivated).toBeTrue();
});

// ============================================
// ТЕСТЫ canDamageTarget
// ============================================

console.log('\n🎯 ТЕСТЫ canDamageTarget\n');

test('canDamageTarget: равные уровни', () => {
  expect(canDamageTarget(5, 5, 'normal')).toBeTrue();
});

test('canDamageTarget: +3 уровня normal = false', () => {
  expect(canDamageTarget(5, 8, 'normal')).toBeFalse();
});

test('canDamageTarget: +4 уровня ultimate = true', () => {
  expect(canDamageTarget(5, 9, 'ultimate')).toBeTrue();
});

test('canDamageTarget: +5 уровней все = false', () => {
  expect(canDamageTarget(1, 7, 'ultimate')).toBeFalse();
});

// ============================================
// ИТОГИ
// ============================================

console.log('\n' + '='.repeat(50));
console.log('📊 ИТОГИ ТЕСТОВ СЕРВЕРНОЙ БОЕВОЙ СИСТЕМЫ');
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
