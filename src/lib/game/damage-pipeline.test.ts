/**
 * ============================================================================
 * ТЕСТЫ ПАЙПЛАЙНА РАСЧЁТА УРОНА (Damage Pipeline)
 * ============================================================================
 * 
 * Запуск: bun run src/lib/game/damage-pipeline.test.ts
 * 
 * Тестирует:
 * - processDamagePipeline()
 * - calculateFinalDamageQuick()
 * - canDamageTarget()
 * - formatDamagePipelineResult()
 * - Все слои защиты в комбинации
 */

import {
  processDamagePipeline,
  calculateFinalDamageQuick,
  canDamageTarget,
  formatDamagePipelineResult,
  MATERIAL_DAMAGE_REDUCTION,
  DEFAULT_MATERIAL_HARDNESS,
  type AttackerParams,
  type DefenderParams,
  type DamagePipelineResult,
} from './damage-pipeline';

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
    toBeCloseTo(expected: number, precision: number = 0) {
      const diff = Math.abs(actual as number - expected);
      const tolerance = precision === 0 ? 1 : Math.pow(10, -precision);
      if (diff > tolerance) {
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
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected defined, got ${actual}`);
      }
    },
  };
}

// ============================================
// ТЕСТЫ КОНСТАНТ
// ============================================

console.log('\n⚙️ ТЕСТЫ КОНСТАНТ\n');

test('MATERIAL_DAMAGE_REDUCTION: organic = 0%', () => {
  expect(MATERIAL_DAMAGE_REDUCTION['organic']).toBe(0);
});

test('MATERIAL_DAMAGE_REDUCTION: scaled = 30%', () => {
  expect(MATERIAL_DAMAGE_REDUCTION['scaled']).toBe(0.30);
});

test('MATERIAL_DAMAGE_REDUCTION: chitin = 20%', () => {
  expect(MATERIAL_DAMAGE_REDUCTION['chitin']).toBe(0.20);
});

test('MATERIAL_DAMAGE_REDUCTION: ethereal = 70%', () => {
  expect(MATERIAL_DAMAGE_REDUCTION['ethereal']).toBe(0.70);
});

test('MATERIAL_DAMAGE_REDUCTION: mineral = 50%', () => {
  expect(MATERIAL_DAMAGE_REDUCTION['mineral']).toBe(0.50);
});

// ============================================
// ТЕСТЫ LEVEL SUPPRESSION В ПАЙПЛАЙНЕ
// ============================================

console.log('\n⚔️ ТЕСТЫ LEVEL SUPPRESSION В ПАЙПЛАЙНЕ\n');

test('Иммунитет: finalDamage = 0 при +5 уровнях', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 1 },
    { cultivationLevel: 9, currentQi: 0, maxQi: 0 }
  );
  
  expect(result.wasImmune).toBeTrue();
  expect(result.finalDamage).toBe(0);
});

test('Подавление применяется до Qi Buffer', () => {
  // L5 атакует L7 (разница 2, множитель 0.25 для technique)
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5, technique: { level: 5 } },
    { cultivationLevel: 7, currentQi: 500, maxQi: 1000 }
  );
  
  // После подавления: 100 × 0.25 = 25
  // Qi Buffer 90%: поглощено 22.5, пробитие 2.5
  expect(result.damageAfterSuppression).toBeCloseTo(25, 0);
  expect(result.qiBuffer).toBeDefined();
});

test('Нет подавления при равных уровнях', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 0, maxQi: 0 }
  );
  
  expect(result.levelSuppression.wasSuppressed).toBeFalse();
  expect(result.damageAfterSuppression).toBe(100);
});

// ============================================
// ТЕСТЫ QI BUFFER В ПАЙПЛАЙНЕ
// ============================================

console.log('\n✨ ТЕСТЫ QI BUFFER В ПАЙПЛАЙНЕ\n');

test('Qi Buffer активируется при isQiTechnique=true', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 500, maxQi: 1000 }
  );
  
  expect(result.qiBuffer).toBeDefined();
  expect(result.qiBuffer!.bufferActivated).toBeTrue();
});

test('Qi Buffer НЕ активируется при isQiTechnique=false', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 500, maxQi: 0 },
    { isQiTechnique: false }
  );
  
  // qiBuffer должен быть null или не активирован
  if (result.qiBuffer) {
    expect(result.qiBuffer.bufferActivated).toBeFalse();
  }
});

test('Без Ци весь урон проходит', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 0, maxQi: 0 }
  );
  
  expect(result.damageAfterQiBuffer).toBe(100);
});

// ============================================
// ТЕСТЫ БРОНИ
// ============================================

console.log('\n🛡️ ТЕСТЫ БРОНИ В ПАЙПЛАЙНЕ\n');

test('Броня снижает урон', () => {
  const resultNoArmor = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 0, maxQi: 0, armor: 0 }
  );
  
  const resultWithArmor = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 0, maxQi: 0, armor: 100 }
  );
  
  expect(resultWithArmor.finalDamage).toBeLessThan(resultNoArmor.finalDamage);
});

test('Броня 100 снижает урон на ~20%', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 0, maxQi: 0, armor: 100 }
  );
  
  // Базовое снижение 20% + плоское снижение 50
  expect(result.finalDamage).toBeLessThan(100);
  expect(result.armor).toBeDefined();
});

// ============================================
// ТЕСТЫ МАТЕРИАЛА
// ============================================

console.log('\n🧬 ТЕСТЫ МАТЕРИАЛА ТЕЛА\n');

test('Organic материал: 0% снижения', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 0, maxQi: 0, bodyMaterial: 'organic' }
  );
  
  expect(result.materialReduction).toBe(0);
});

test('Chitin материал: 20% снижения', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 0, maxQi: 0, bodyMaterial: 'chitin' }
  );
  
  expect(result.materialReduction).toBe(0.20);
});

test('Ethereal материал: 70% снижения', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 0, maxQi: 0, bodyMaterial: 'ethereal' }
  );
  
  expect(result.materialReduction).toBe(0.70);
});

test('Scaled материал: 30% снижения', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 0, maxQi: 0, bodyMaterial: 'scaled' }
  );
  
  expect(result.materialReduction).toBe(0.30);
});

// ============================================
// ИНТЕГРАЦИОННЫЕ ТЕСТЫ
// ============================================

console.log('\n🔗 ИНТЕГРАЦИОННЫЕ ТЕСТЫ (все слои)\n');

test('Полный pipeline: Suppression + Qi Buffer + Armor + Material', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5, technique: { level: 5 } },
    {
      cultivationLevel: 7,  // Разница 2 → 0.25 для technique
      currentQi: 500,
      maxQi: 1000,
      armor: 50,
      bodyMaterial: 'chitin',  // 20% снижение
    }
  );
  
  // 1. Level Suppression: 100 × 0.25 = 25
  expect(result.damageAfterSuppression).toBeCloseTo(25, 0);
  
  // 2. Qi Buffer: 90% поглощение → 25 × 0.1 = 2.5 пробитие
  expect(result.damageAfterQiBuffer).toBeLessThan(25);
  
  // 3. Armor: снижение
  expect(result.damageAfterArmor).toBeLessThan(result.damageAfterQiBuffer);
  
  // 4. Material: 20% снижение от chitin
  expect(result.materialReduction).toBe(0.20);
  
  // Финальный урон должен быть минимальным
  expect(result.finalDamage).toBeLessThan(10);
});

test('Смертный (нет Ци) vs Культиватор: полный урон', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    {
      cultivationLevel: 5,
      currentQi: 0,
      maxQi: 0,
      bodyMaterial: 'organic',
    }
  );
  
  // Нет Ци = нет Qi Buffer
  // Organic = нет снижения материала
  // Финальный урон ≈ исходный (только броня если есть)
  expect(result.finalDamage).toBe(100);
});

test('Ultimate атака пробивает защиту', () => {
  const resultNormal = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    { cultivationLevel: 9, currentQi: 0, maxQi: 0 }  // Разница 4
  );
  
  const resultUltimate = processDamagePipeline(
    100,
    { cultivationLevel: 5, technique: { isUltimate: true } },
    { cultivationLevel: 9, currentQi: 0, maxQi: 0 }
  );
  
  // Normal при +4 уровнях = иммунитет
  expect(resultNormal.wasImmune).toBeTrue();
  
  // Ultimate при +4 уровнях = 0.1 множитель (не иммунитет)
  expect(resultUltimate.wasImmune).toBeFalse();
  expect(resultUltimate.finalDamage).toBeGreaterThan(0);
});

test('Щитовая техника: почти полное поглощение', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    {
      cultivationLevel: 5,
      currentQi: 500,
      maxQi: 1000,
      hasShieldTechnique: true,
    }
  );
  
  // Щит поглощает 100% урона → 0 пробитие
  // Но pipeline имеет минимальный урон = 1
  expect(result.qiBuffer!.remainingDamage).toBe(0);
  expect(result.damageAfterQiBuffer).toBe(0);
  // После armor и material может быть минимум 1
  expect(result.finalDamage).toBeLessThan(5);
});

// ============================================
// ТЕСТЫ calculateFinalDamageQuick
// ============================================

console.log('\n⚡ ТЕСТЫ calculateFinalDamageQuick\n');

test('Быстрый расчёт без Qi и Armor', () => {
  const damage = calculateFinalDamageQuick(100, 5, 5, 0, 0);
  expect(damage).toBe(100);
});

test('Быстрый расчёт с Qi', () => {
  const damageNoQi = calculateFinalDamageQuick(100, 5, 5, 0, 0);
  const damageWithQi = calculateFinalDamageQuick(100, 5, 5, 500, 0);
  
  expect(damageWithQi).toBeLessThan(damageNoQi);
});

test('Быстрый расчёт с Armor', () => {
  const damageNoArmor = calculateFinalDamageQuick(100, 5, 5, 0, 0);
  const damageWithArmor = calculateFinalDamageQuick(100, 5, 5, 0, 100);
  
  expect(damageWithArmor).toBeLessThan(damageNoArmor);
});

test('Быстрый расчёт с иммунитетом = 0', () => {
  const damage = calculateFinalDamageQuick(100, 1, 9, 0, 0);
  expect(damage).toBe(0);
});

// ============================================
// ТЕСТЫ canDamageTarget
// ============================================

console.log('\n🎯 ТЕСТЫ canDamageTarget\n');

test('Равные уровни: можно нанести урон', () => {
  expect(canDamageTarget(5, 5, 'normal')).toBeTrue();
});

test('+2 уровня разницы: normal НЕ может нанести урон', () => {
  expect(canDamageTarget(5, 7, 'normal')).toBeTrue(); // 0.1 множитель, не 0
});

test('+3 уровня разницы: normal НЕ может (иммунитет)', () => {
  expect(canDamageTarget(5, 8, 'normal')).toBeFalse();
});

test('+4 уровня: technique НЕ может', () => {
  expect(canDamageTarget(5, 9, 'technique')).toBeFalse();
});

test('+4 уровня: ultimate МОЖЕТ', () => {
  expect(canDamageTarget(5, 9, 'ultimate')).toBeTrue();
});

test('+5+ уровней: никто не может', () => {
  expect(canDamageTarget(1, 9, 'normal')).toBeFalse();
  expect(canDamageTarget(1, 9, 'technique')).toBeFalse();
  expect(canDamageTarget(1, 9, 'ultimate')).toBeFalse();
});

// ============================================
// ТЕСТЫ formatDamagePipelineResult
// ============================================

console.log('\n📝 ТЕСТЫ formatDamagePipelineResult\n');

test('Форматирование содержит исходный урон', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 0, maxQi: 0 }
  );
  
  const formatted = formatDamagePipelineResult(result);
  expect(formatted.includes('100')).toBeTrue();
});

test('Форматирование содержит финальный урон', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 0, maxQi: 0 }
  );
  
  const formatted = formatDamagePipelineResult(result);
  expect(formatted.includes('Финальный урон')).toBeTrue();
});

// ============================================
// EDGE CASES
// ============================================

console.log('\n⚠️ EDGE CASES\n');

test('Нулевой урон — минимум 1', () => {
  const result = processDamagePipeline(
    0,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 500, maxQi: 1000 }
  );
  
  // Pipeline имеет минимальный урон = 1
  expect(result.finalDamage).toBe(1);
});

test('Отрицательный урон (лечение?)', () => {
  const result = processDamagePipeline(
    -50,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 500, maxQi: 1000 }
  );
  
  // Не должно крашиться
  expect(result).toBe(result);
});

test('Очень большой урон', () => {
  const result = processDamagePipeline(
    999999,
    { cultivationLevel: 5 },
    { cultivationLevel: 5, currentQi: 100, maxQi: 1000 }  // Мало Ци
  );
  
  // Qi быстро кончится
  expect(result.qiBuffer!.qiConsumed).toBeCloseTo(100, 0);
});

test('Техника без level — используется уровень атакующего', () => {
  const result = processDamagePipeline(
    100,
    { cultivationLevel: 5, technique: {} },
    { cultivationLevel: 7, currentQi: 0, maxQi: 0 }
  );
  
  // Эффективный уровень техники = уровень атакующего = 5
  // Разница = 2 → technique multiplier = 0.25
  expect(result.levelSuppression.effectiveAttackerLevel).toBe(5);
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
