/**
 * ============================================================================
 * ТЕСТЫ БУФЕРА ЦИ (Qi Buffer System)
 * ============================================================================
 * 
 * Запуск: bun run src/lib/game/qi-buffer.test.ts
 * 
 * Тестирует:
 * - processQiDamage()
 * - processShieldTechnique()
 * - calculateHitsUntilDepletion()
 * - QI_BUFFER_CONFIG значения
 */

import {
  processQiDamage,
  calculateHitsUntilDepletion,
  formatQiDamageResult,
  isQiTechniqueAttack,
  QI_BUFFER_CONFIG,
  type QiDamageResult,
} from './qi-buffer';
import {
  QI_BUFFER_EXAMPLES,
  calculateRequiredQi,
  calculatePiercingDamage,
  calculateAbsorbableDamage,
  hasQiForBuffer,
} from '@/lib/constants/qi-buffer-config';

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
      const tolerance = precision === 0 ? 0.5 : Math.pow(10, -precision);
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
  };
}

// ============================================
// ТЕСТЫ КОНФИГУРАЦИИ
// ============================================

console.log('\n⚙️ ТЕСТЫ QI_BUFFER_CONFIG\n');

test('baseQiAbsorptionRatio = 3.0 (3 Ци за 1 поглощённый урон)', () => {
  expect(QI_BUFFER_CONFIG.baseQiAbsorptionRatio).toBe(3.0);
});

test('rawQiAbsorptionPercent = 0.90 (90% поглощение)', () => {
  expect(QI_BUFFER_CONFIG.rawQiAbsorptionPercent).toBe(0.90);
});

test('shieldTechniqueMultiplier = 1.0 (эффективнее сырой Ци)', () => {
  expect(QI_BUFFER_CONFIG.shieldTechniqueMultiplier).toBe(1.0);
});

test('shieldAbsorptionPercent = 1.0 (100% поглощение)', () => {
  expect(QI_BUFFER_CONFIG.shieldAbsorptionPercent).toBe(1.0);
});

test('minQiForBuffer = 10', () => {
  expect(QI_BUFFER_CONFIG.minQiForBuffer).toBe(10);
});

// ============================================
// ТЕСТЫ СЫРОЙ ЦИ (90% поглощение)
// ============================================

console.log('\n✨ ТЕСТЫ СЫРОЙ ЦИ (90% поглощение)\n');

test('100 урона, 500 Ци: поглощено 90, пробитие 10', () => {
  const result = processQiDamage({
    incomingDamage: 100,
    currentQi: 500,
    maxQi: 1000,
    hasShieldTechnique: false,
  });
  
  expect(result.absorbedDamage).toBeCloseTo(90, 0);
  expect(result.remainingDamage).toBeCloseTo(10, 0);
  expect(result.piercingDamage).toBeCloseTo(10, 0);
  expect(result.usedShieldTechnique).toBeFalse();
});

test('Ци тратится 3:1 (270 Ци за 90 поглощённого урона)', () => {
  const result = processQiDamage({
    incomingDamage: 100,
    currentQi: 500,
    maxQi: 1000,
    hasShieldTechnique: false,
  });
  
  // 90 урона × 3.0 = 270 Ци
  expect(result.qiConsumed).toBeCloseTo(270, 0);
});

test('10% ВСЕГДА пробивает (piercing damage)', () => {
  // Даже при бесконечной Ци 10% пробивает
  const result = processQiDamage({
    incomingDamage: 100,
    currentQi: 99999,
    maxQi: 99999,
    hasShieldTechnique: false,
  });
  
  expect(result.piercingDamage).toBeCloseTo(10, 0);
  expect(result.remainingDamage).toBeCloseTo(10, 0);
});

test('200 урона: поглощено 180, пробитие 20', () => {
  const result = processQiDamage({
    incomingDamage: 200,
    currentQi: 1000,
    maxQi: 1000,
    hasShieldTechnique: false,
  });
  
  expect(result.absorbedDamage).toBeCloseTo(180, 0);
  expect(result.remainingDamage).toBeCloseTo(20, 0);
  expect(result.qiConsumed).toBeCloseTo(540, 0); // 180 × 3
});

// ============================================
// ТЕСТЫ ОГРАНИЧЕНИЯ ЦИ
// ============================================

console.log('\n🔋 ТЕСТЫ ОГРАНИЧЕНИЯ ЦИ\n');

test('Недостаточно Ци: поглощается пропорционально', () => {
  // 100 урона, нужно 270 Ци для полного поглощения 90%
  // Есть только 150 Ци → поглощено 50 урона
  const result = processQiDamage({
    incomingDamage: 100,
    currentQi: 150,
    maxQi: 1000,
    hasShieldTechnique: false,
  });
  
  expect(result.qiConsumed).toBeCloseTo(150, 0);
  expect(result.absorbedDamage).toBeCloseTo(50, 0);
  // Пробитие = (90 - 50) + 10 = 50
  expect(result.remainingDamage).toBeCloseTo(50, 0);
  expect(result.qiSufficient).toBeFalse();
});

test('Ци = 0: весь урон проходит', () => {
  const result = processQiDamage({
    incomingDamage: 100,
    currentQi: 0,
    maxQi: 1000,
    hasShieldTechnique: false,
  });
  
  expect(result.bufferActivated).toBeFalse();
  expect(result.absorbedDamage).toBe(0);
  expect(result.remainingDamage).toBe(100);
});

test('Ци < minQiForBuffer: буфер не активируется', () => {
  const result = processQiDamage({
    incomingDamage: 100,
    currentQi: 5, // < 10
    maxQi: 1000,
    hasShieldTechnique: false,
  });
  
  expect(result.bufferActivated).toBeFalse();
});

test('Ци = minQiForBuffer: буфер активируется', () => {
  const result = processQiDamage({
    incomingDamage: 10, // малый урон
    currentQi: 10, // ровно minQiForBuffer
    maxQi: 1000,
    hasShieldTechnique: false,
  });
  
  expect(result.bufferActivated).toBeTrue();
});

// ============================================
// ТЕСТЫ ЩИТОВОЙ ТЕХНИКИ
// ============================================

console.log('\n🛡️ ТЕСТЫ ЩИТОВОЙ ТЕХНИКИ\n');

test('Щит: 100% поглощение, 0% пробитие', () => {
  const result = processQiDamage({
    incomingDamage: 100,
    currentQi: 500,
    maxQi: 1000,
    hasShieldTechnique: true,
  });
  
  expect(result.absorbedDamage).toBe(100);
  expect(result.remainingDamage).toBe(0);
  expect(result.piercingDamage).toBe(0);
  expect(result.usedShieldTechnique).toBeTrue();
});

test('Щит: 1 Ци за 1 урон (эффективнее сырой Ци)', () => {
  const result = processQiDamage({
    incomingDamage: 100,
    currentQi: 500,
    maxQi: 1000,
    hasShieldTechnique: true,
  });
  
  // Сырая Ци: 270 за 90 поглощения (3:1)
  // Щит: 100 за 100 поглощения (1:1) — в 3 раза эффективнее!
  expect(result.qiConsumed).toBe(100);
});

test('Щит при нехватке Ци: частичное поглощение', () => {
  const result = processQiDamage({
    incomingDamage: 100,
    currentQi: 50,
    maxQi: 1000,
    hasShieldTechnique: true,
  });
  
  expect(result.qiConsumed).toBe(50);
  expect(result.absorbedDamage).toBe(50);
  expect(result.remainingDamage).toBe(50);
  expect(result.qiSufficient).toBeFalse();
});

test('Щит эффективнее сырой Ци в 3 раза', () => {
  const rawQiResult = processQiDamage({
    incomingDamage: 100,
    currentQi: 500,
    maxQi: 1000,
    hasShieldTechnique: false,
  });
  
  const shieldResult = processQiDamage({
    incomingDamage: 100,
    currentQi: 500,
    maxQi: 1000,
    hasShieldTechnique: true,
  });
  
  // Сырая Ци тратит 270, Щит тратит 100
  expect(rawQiResult.qiConsumed).toBeGreaterThan(shieldResult.qiConsumed);
  // Но сырая Ци пропускает 10 урона, щит — 0
  expect(rawQiResult.remainingDamage).toBeGreaterThan(shieldResult.remainingDamage);
});

// ============================================
// ТЕСТЫ ИЗ QI_BUFFER_EXAMPLES
// ============================================

console.log('\n📚 ТЕСТЫ ИЗ QI_BUFFER_EXAMPLES\n');

test('QI_BUFFER_EXAMPLES: все примеры корректны', () => {
  for (const example of QI_BUFFER_EXAMPLES) {
    const result = processQiDamage({
      incomingDamage: example.damage,
      currentQi: example.currentQi,
      hasShieldTechnique: example.hasShieldTechnique,
    });
    
    const expected = example.expected;
    
    // Проверяем qiConsumed
    if (Math.abs(result.qiConsumed - expected.qiConsumed) > 1) {
      throw new Error(
        `Example "${example.scenario}": qiConsumed expected ${expected.qiConsumed}, got ${result.qiConsumed}`
      );
    }
    
    // Проверяем absorbedDamage
    if (Math.abs(result.absorbedDamage - expected.absorbedDamage) > 1) {
      throw new Error(
        `Example "${example.scenario}": absorbedDamage expected ${expected.absorbedDamage}, got ${result.absorbedDamage}`
      );
    }
    
    // Проверяем remainingDamage
    if (Math.abs(result.remainingDamage - expected.remainingDamage) > 1) {
      throw new Error(
        `Example "${example.scenario}": remainingDamage expected ${expected.remainingDamage}, got ${result.remainingDamage}`
      );
    }
  }
});

// ============================================
// ТЕСТЫ УТИЛИТ
// ============================================

console.log('\n🔧 ТЕСТЫ УТИЛИТ\n');

test('calculateRequiredQi: сырая Ци для 100 урона = 270', () => {
  // 90 × 3 = 270
  expect(calculateRequiredQi(100, false)).toBe(270);
});

test('calculateRequiredQi: щит для 100 урона = 100', () => {
  expect(calculateRequiredQi(100, true)).toBe(100);
});

test('calculatePiercingDamage: сырая Ци = 10%', () => {
  expect(calculatePiercingDamage(100, false)).toBeCloseTo(10, 0);
});

test('calculatePiercingDamage: щит = 0%', () => {
  expect(calculatePiercingDamage(100, true)).toBe(0);
});

test('calculateAbsorbableDamage: сырая Ци = 90%', () => {
  expect(calculateAbsorbableDamage(100, false)).toBe(90);
});

test('calculateAbsorbableDamage: щит = 100%', () => {
  expect(calculateAbsorbableDamage(100, true)).toBe(100);
});

test('hasQiForBuffer: Ци >= 10 = true', () => {
  expect(hasQiForBuffer(10)).toBeTrue();
  expect(hasQiForBuffer(100)).toBeTrue();
});

test('hasQiForBuffer: Ци < 10 = false', () => {
  expect(hasQiForBuffer(0)).toBeFalse();
  expect(hasQiForBuffer(9)).toBeFalse();
});

// ============================================
// ТЕСТЫ calculateHitsUntilDepletion
// ============================================

console.log('\n🔢 ТЕСТЫ calculateHitsUntilDepletion\n');

test('Сырая Ци: примерное количество ударов', () => {
  // 500 Ци, 100 урона/удар
  // 100 урона → 270 Ци тратится за удар (для 90% поглощения)
  // 500 / 270 ≈ 1.85 → 1 удар
  const hits = calculateHitsUntilDepletion(500, 100, false);
  expect(hits).toBeGreaterThan(0);
  expect(hits).toBeLessThan(5);
});

test('Щит: больше ударов чем сырая Ци', () => {
  const rawHits = calculateHitsUntilDepletion(500, 100, false);
  const shieldHits = calculateHitsUntilDepletion(500, 100, true);
  
  // Щит эффективнее, выдержит больше ударов
  expect(shieldHits).toBeGreaterThan(rawHits);
});

test('0 урона = Infinity ударов', () => {
  const hits = calculateHitsUntilDepletion(500, 0, false);
  expect(hits).toBe(Infinity);
});

// ============================================
// ТЕСТЫ isQiTechniqueAttack
// ============================================

console.log('\n⚔️ ТЕСТЫ isQiTechniqueAttack\n');

test('qi атака = Qi техника', () => {
  expect(isQiTechniqueAttack('qi')).toBeTrue();
});

test('mixed атака = Qi техника', () => {
  expect(isQiTechniqueAttack('mixed')).toBeTrue();
});

test('physical атака ≠ Qi техника', () => {
  expect(isQiTechniqueAttack('physical')).toBeFalse();
});

// ============================================
// EDGE CASES
// ============================================

console.log('\n⚠️ EDGE CASES\n');

test('Отрицательный урон обрабатывается', () => {
  const result = processQiDamage({
    incomingDamage: -10,
    currentQi: 500,
    maxQi: 1000,
    hasShieldTechnique: false,
  });
  
  // Не должно крашиться
  expect(result).toBe(result); // Просто проверяем что не упало
});

test('Очень большой урон', () => {
  const result = processQiDamage({
    incomingDamage: 99999,
    currentQi: 500,
    maxQi: 1000,
    hasShieldTechnique: false,
  });
  
  // Ци кончится быстро
  expect(result.qiConsumed).toBe(500);
  expect(result.qiSufficient).toBeFalse();
});

test('Урон меньше piercing damage', () => {
  const result = processQiDamage({
    incomingDamage: 5, // Меньше чем piercing был бы для большего урона
    currentQi: 500,
    maxQi: 1000,
    hasShieldTechnique: false,
  });
  
  // 5 × 90% = 4.5 поглощается, 0.5 пробивает
  expect(result.absorbedDamage).toBeCloseTo(4.5, 1);
  expect(result.remainingDamage).toBeCloseTo(0.5, 1);
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
