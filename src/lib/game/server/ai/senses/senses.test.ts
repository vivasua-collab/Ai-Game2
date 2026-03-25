/**
 * ============================================================================
 * ТЕСТЫ SENSES SYSTEM (Система чувств NPC)
 * ============================================================================
 * 
 * Запуск: bun run src/lib/game/server/ai/senses/senses.test.ts
 * 
 * Тестирует:
 * - PERCEPTION_CENTERS конфигурацию
 * - determinePressureType (7 уровней давления)
 * - calculateQiPressure
 * - calculateSensesConfig
 * - detectTarget
 * 
 * @see docs/checkpoints/checkpoint_03_25_phase1_combat.md
 */

import {
  PERCEPTION_CENTERS,
  getPerceptionCenter,
  canUseVision,
  canUseQiPerception,
  getFieldOfView,
  isInFieldOfView,
  determinePressureType,
  calculateQiPressure,
  canSenseTarget,
  getDialogueModifier,
  calculateSensesConfig,
  detectTarget,
  PRESSURE_TYPE_NAMES,
} from './index';
import type { PressureType } from './types';

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
// ТЕСТЫ PERCEPTION_CENTERS
// ============================================

console.log('\n👁️ ТЕСТЫ PERCEPTION_CENTERS\n');

test('humanoid: head, visual, 120° FOV', () => {
  const config = PERCEPTION_CENTERS['humanoid'];
  expect(config.bodyPart).toBe('head');
  expect(config.perceptionType).toBe('visual');
  expect(config.fieldOfView).toBe(120);
  expect(config.directionality).toBe('frontal');
});

test('bird: head, visual, 240° FOV (широкое)', () => {
  const config = PERCEPTION_CENTERS['bird'];
  expect(config.bodyPart).toBe('head');
  expect(config.perceptionType).toBe('visual');
  expect(config.fieldOfView).toBe(240);
});

test('amorphous: core, qi_based, omnidirectional', () => {
  const config = PERCEPTION_CENTERS['amorphous'];
  expect(config.bodyPart).toBe('core');
  expect(config.perceptionType).toBe('qi_based');
  expect(config.directionality).toBe('omnidirectional');
});

test('serpentine: head, thermal, 100° FOV', () => {
  const config = PERCEPTION_CENTERS['serpentine'];
  expect(config.bodyPart).toBe('head');
  expect(config.perceptionType).toBe('thermal');
  expect(config.fieldOfView).toBe(100);
});

test('arthropod: cephalothorax, 360° FOV', () => {
  const config = PERCEPTION_CENTERS['arthropod'];
  expect(config.bodyPart).toBe('cephalothorax');
  expect(config.directionality).toBe('omnidirectional');
  expect(config.fieldOfView).toBe(360);
});

// ============================================
// ТЕСТЫ ФУНКЦИЙ ВОСПРИЯТИЯ
// ============================================

console.log('\n🔧 ТЕСТЫ ФУНКЦИЙ ВОСПРИЯТИЯ\n');

test('canUseVision: humanoid=true, amorphous=false', () => {
  expect(canUseVision('humanoid')).toBeTrue();
  expect(canUseVision('amorphous')).toBeFalse();
});

test('canUseQiPerception: amorphous=true, humanoid=false', () => {
  expect(canUseQiPerception('amorphous')).toBeTrue();
  expect(canUseQiPerception('serpentine')).toBeTrue(); // thermal
  expect(canUseQiPerception('humanoid')).toBeFalse();
});

test('getFieldOfView: bird=240°, humanoid=120°', () => {
  expect(getFieldOfView('bird')).toBe(240);
  expect(getFieldOfView('humanoid')).toBe(120);
});

test('isInFieldOfView: цель перед наблюдателем', () => {
  const result = isInFieldOfView(
    { x: 0, y: 0 },  // Позиция наблюдателя
    0,                // Направление: вправо
    { x: 10, y: 0 },  // Цель справа
    'humanoid'        // 120° FOV
  );
  expect(result).toBeTrue();
});

test('isInFieldOfView: цель позади наблюдателя', () => {
  const result = isInFieldOfView(
    { x: 0, y: 0 },  // Позиция наблюдателя
    0,                // Направление: вправо
    { x: -10, y: 0 }, // Цель слева (позади)
    'humanoid'        // 120° FOV (перед)
  );
  expect(result).toBeFalse();
});

test('isInFieldOfView: amorphous видит везде', () => {
  // amorphous - omnidirectional
  expect(isInFieldOfView({ x: 0, y: 0 }, 0, { x: 10, y: 0 }, 'amorphous')).toBeTrue();
  expect(isInFieldOfView({ x: 0, y: 0 }, 0, { x: -10, y: 0 }, 'amorphous')).toBeTrue();
  expect(isInFieldOfView({ x: 0, y: 0 }, 0, { x: 0, y: 10 }, 'amorphous')).toBeTrue();
});

// ============================================
// ТЕСТЫ QI PRESSURE (7 УРОВНЕЙ)
// ============================================

console.log('\n⚡ ТЕСТЫ QI PRESSURE (7 уровней)\n');

test('determinePressureType: +5 уровней = supreme', () => {
  expect(determinePressureType(1, 6)).toBe('supreme');
  expect(determinePressureType(3, 8)).toBe('supreme');
});

test('determinePressureType: +3 уровня = superior', () => {
  expect(determinePressureType(1, 4)).toBe('superior');
  expect(determinePressureType(5, 8)).toBe('superior');
});

test('determinePressureType: +1 уровень = stronger', () => {
  expect(determinePressureType(1, 2)).toBe('stronger');
  expect(determinePressureType(5, 6)).toBe('stronger');
});

test('determinePressureType: 0 уровней = equal', () => {
  expect(determinePressureType(1, 1)).toBe('equal');
  expect(determinePressureType(5, 5)).toBe('equal');
  expect(determinePressureType(5, 6)).not.toBe('equal');
});

test('determinePressureType: -1 уровень = weaker', () => {
  expect(determinePressureType(2, 1)).toBe('weaker');
  expect(determinePressureType(6, 5)).toBe('weaker');
});

test('determinePressureType: -3 уровня = inferior', () => {
  expect(determinePressureType(4, 1)).toBe('inferior');
  expect(determinePressureType(8, 5)).toBe('inferior');
});

test('determinePressureType: -5 уровней = insignificant', () => {
  expect(determinePressureType(6, 1)).toBe('insignificant');
  expect(determinePressureType(9, 4)).toBe('insignificant');
});

// ============================================
// ТЕСТЫ РАСЧЁТА ДАВЛЕНИЯ ЦИ
// ============================================

console.log('\n📊 ТЕСТЫ РАСЧЁТА ДАВЛЕНИЯ ЦИ\n');

test('calculateQiPressure: supreme давление', () => {
  const result = calculateQiPressure({
    sensorLevel: 1,
    targetLevel: 7,
  });
  
  expect(result.type).toBe('supreme');
  expect(result.fear).toBeCloseTo(1.0, 0.1);
  expect(result.fleeChance).toBeCloseTo(0.9, 0.1);
  expect(result.paralysisChance).toBeCloseTo(0.5, 0.1);
  expect(result.attackPenalty).toBeCloseTo(-0.8, 0.1);
});

test('calculateQiPressure: equal давление', () => {
  const result = calculateQiPressure({
    sensorLevel: 5,
    targetLevel: 5,
  });
  
  expect(result.type).toBe('equal');
  expect(result.fear).toBe(0);
  expect(result.fleeChance).toBe(0);
  expect(result.paralysisChance).toBe(0);
  expect(result.attackPenalty).toBe(0);
});

test('calculateQiPressure: insignificant давление', () => {
  const result = calculateQiPressure({
    sensorLevel: 7,
    targetLevel: 1,
  });
  
  expect(result.type).toBe('insignificant');
  expect(result.fear).toBe(0);
  expect(result.attackPenalty).toBeCloseTo(0.3, 0.1);
});

test('calculateQiPressure: расстояние влияет на интенсивность', () => {
  const resultClose = calculateQiPressure({
    sensorLevel: 1,
    targetLevel: 5,
    distance: 10,
    qiSenseRange: 50,
  });
  
  const resultFar = calculateQiPressure({
    sensorLevel: 1,
    targetLevel: 5,
    distance: 100,
    qiSenseRange: 50,
  });
  
  // Ближе = сильнее давление
  expect(resultClose.inQiSenseRange).toBeTrue();
  expect(resultFar.inQiSenseRange).toBeFalse();
});

// ============================================
// ТЕСТЫ DIALOGUE MODIFIER
// ============================================

console.log('\n💬 ТЕСТЫ DIALOGUE MODIFIER\n');

test('getDialogueModifier: supreme = trembling', () => {
  const mod = getDialogueModifier('supreme');
  expect(mod.style).toBe('trembling');
  expect(mod.respect).toBe(1.0);
});

test('getDialogueModifier: equal = normal', () => {
  const mod = getDialogueModifier('equal');
  expect(mod.style).toBe('normal');
  expect(mod.respect).toBe(0);
});

test('getDialogueModifier: insignificant = dismissive', () => {
  const mod = getDialogueModifier('insignificant');
  expect(mod.style).toBe('dismissive');
  expect(mod.respect).toBe(-1.0);
});

// ============================================
// ТЕСТЫ CALCULATE SENSES CONFIG
// ============================================

console.log('\n🔮 ТЕСТЫ CALCULATE SENSES CONFIG\n');

test('calculateSensesConfig: character humanoid medium', () => {
  const config = calculateSensesConfig({
    soulType: 'character',
    morphology: 'humanoid',
    sizeClass: 'medium',
    bodyMaterial: 'organic',
    cultivationLevel: 1,
    canCultivate: true,
  });
  
  expect(config.vision.enabled).toBeTrue();
  expect(config.vision.range).toBeGreaterThan(10);
  expect(config.hearing.enabled).toBeTrue();
  expect(config.pain.enabled).toBeTrue();
  expect(config.qiSense.enabled).toBeTrue();
});

test('calculateSensesConfig: spirit amorphous', () => {
  const config = calculateSensesConfig({
    soulType: 'spirit',
    morphology: 'amorphous',
    sizeClass: 'medium',
    bodyMaterial: 'ethereal',
    cultivationLevel: 5,
    canCultivate: true,
  });
  
  expect(config.vision.enabled).toBeFalse(); // amorphous не имеет глаз
  expect(config.pain.enabled).toBeFalse();   // ethereal не чувствует боль
  expect(config.qiSense.enabled).toBeTrue();
  expect(config.qiSense.range).toBeGreaterThan(50);
});

test('calculateSensesConfig: creature serpentine', () => {
  const config = calculateSensesConfig({
    soulType: 'creature',
    morphology: 'serpentine',
    sizeClass: 'small',
    bodyMaterial: 'scaled',
    cultivationLevel: 1,
    canCultivate: false,
  });
  
  expect(config.vision.enabled).toBeTrue();
  expect(config.vision.nightPenalty).toBeLessThan(0.5); // Змеи видят ночью
  expect(config.qiSense.enabled).toBeFalse(); // Не культивирует
});

// ============================================
// ТЕСТЫ DETECT TARGET
// ============================================

console.log('\n🎯 ТЕСТЫ DETECT TARGET\n');

test('detectTarget: цель в поле зрения', () => {
  const senses = calculateSensesConfig({
    soulType: 'character',
    morphology: 'humanoid',
    sizeClass: 'medium',
    bodyMaterial: 'organic',
    cultivationLevel: 1,
    canCultivate: true,
  });
  
  const result = detectTarget({
    npcPos: { x: 0, y: 0 },
    npcFacing: 0,
    npcSenses: senses,
    targetPos: { x: 10, y: 0 },
    targetQi: 50,
  });
  
  expect(result.detected).toBeTrue();
  expect(result.sense).toBe('vision');
});

test('detectTarget: цель позади - только Qi Sense', () => {
  const senses = calculateSensesConfig({
    soulType: 'character',
    morphology: 'humanoid',
    sizeClass: 'medium',
    bodyMaterial: 'organic',
    cultivationLevel: 3,
    canCultivate: true,
  });
  
  const result = detectTarget({
    npcPos: { x: 0, y: 0 },
    npcFacing: 0,  // Смотрит вправо
    npcSenses: senses,
    targetPos: { x: -10, y: 0 },  // Цель слева (позади)
    targetQi: 100,
  });
  
  expect(result.detected).toBeTrue();
  expect(result.sense).toBe('qiSense'); // Не видит, но чувствует Qi
});

// ============================================
// ИТОГИ
// ============================================

console.log('\n' + '='.repeat(50));
console.log('📊 ИТОГИ ТЕСТОВ SENSES SYSTEM');
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
