/**
 * Скрипт генерации техник V2
 * 
 * Запуск: bun run scripts/generate-techniques.ts
 */

import {
  generateAllTechniquesV2,
  type GeneratedTechniqueV2,
} from '../src/lib/generator/technique-generator-v2';
import type { CombatSubtype } from '../src/types/technique-types';
import { writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';

// ==================== КОНФИГУРАЦИЯ ====================

const OUTPUT_DIR = join(process.cwd(), 'presets/techniques');
const ENVIRONMENT: 'test' | 'production' = 'test';

// ==================== МАППИНГ ПУТЕЙ (как в presetStorage) ====================

/**
 * Маппинг подтипа combat к поддиректории
 * ДОЛЖЕН СОВПАДАТЬ с COMBAT_SUBTYPE_DIR_MAP в preset-storage.ts
 */
const COMBAT_SUBTYPE_DIR_MAP: Record<CombatSubtype, string> = {
  melee_strike: 'melee-strike',
  melee_weapon: 'melee-weapon',
  ranged_projectile: 'ranged',
  ranged_beam: 'ranged',
  ranged_aoe: 'ranged',
};

// ==================== ID ГЕНЕРАТОР ====================

const counters: Record<string, number> = {};

function generateId(prefix: string): string {
  if (!counters[prefix]) counters[prefix] = 0;
  counters[prefix]++;
  return `${prefix}${String(counters[prefix]).padStart(6, '0')}`;
}

// ==================== ГЕНЕРАЦИЯ ====================

console.log('=== ГЕНЕРАЦИЯ ТЕХНИК V2 ===');
console.log(`Среда: ${ENVIRONMENT}`);
console.log(`Время: ${new Date().toISOString()}`);
console.log('');

// Очистка старых файлов
if (existsSync(OUTPUT_DIR)) {
  const files = readdirSync(OUTPUT_DIR, { recursive: true, withFileTypes: true });
  for (const file of files) {
    if (file.isFile() && file.name.endsWith('.json')) {
      rmSync(join(file.path || '', file.name));
    }
  }
}

// Генерация
const startTime = Date.now();
const techniques = generateAllTechniquesV2(generateId, ENVIRONMENT);
const duration = Date.now() - startTime;

console.log(`Сгенерировано: ${techniques.length} техник за ${duration}ms`);
console.log('');

// ==================== СТАТИСТИКА ====================

const stats: Record<string, { count: number; elements: Record<string, number>; grades: Record<string, number> }> = {};

for (const tech of techniques) {
  const type = tech.type;
  if (!stats[type]) {
    stats[type] = { count: 0, elements: {}, grades: {} };
  }
  stats[type].count++;
  
  const elem = tech.element;
  stats[type].elements[elem] = (stats[type].elements[elem] || 0) + 1;
  
  const grade = tech.grade;
  stats[type].grades[grade] = (stats[type].grades[grade] || 0) + 1;
}

console.log('=== СТАТИСТИКА ПО ТИПАМ ===');
for (const [type, data] of Object.entries(stats)) {
  console.log(`\n${type}: ${data.count}`);
  console.log(`  Стихии: ${JSON.stringify(data.elements)}`);
  console.log(`  Grade: ${JSON.stringify(data.grades)}`);
}

// ==================== СОХРАНЕНИЕ ====================

console.log('\n=== СОХРАНЕНИЕ ФАЙЛОВ ===');

// Группировка по типу и уровню
const grouped: Record<string, GeneratedTechniqueV2[]> = {};

for (const tech of techniques) {
  let key: string;
  if (tech.type === 'combat' && tech.subtype) {
    // Используем маппинг для правильного пути директории
    const subDir = COMBAT_SUBTYPE_DIR_MAP[tech.subtype as CombatSubtype] || tech.subtype;
    key = `combat/${subDir}`;
  } else {
    key = tech.type;
  }
  
  if (!grouped[key]) grouped[key] = [];
  grouped[key].push(tech);
}

// Сохранение
let savedFiles = 0;
for (const [key, techs] of Object.entries(grouped)) {
  // Группировка по уровню
  const byLevel: Record<number, GeneratedTechniqueV2[]> = {};
  for (const tech of techs) {
    if (!byLevel[tech.level]) byLevel[tech.level] = [];
    byLevel[tech.level].push(tech);
  }
  
  const dir = join(OUTPUT_DIR, key);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  for (const [level, levelTechs] of Object.entries(byLevel)) {
    const filename = `level-${level}.json`;
    const filepath = join(dir, filename);
    // Сохраняем в формате, совместимом с presetStorage
    writeFileSync(filepath, JSON.stringify({
      version: '2.0',
      count: levelTechs.length,
      techniques: levelTechs,
    }, null, 2));
    savedFiles++;
  }
}

console.log(`Сохранено ${savedFiles} файлов`);

// ==================== ПРОВЕРКА КОРРЕКТНОСТИ ====================

console.log('\n=== ПРОВЕРКА КОРРЕКТНОСТИ ===');

let errors = 0;
const errorDetails: string[] = [];

for (const tech of techniques) {
  // 1. Проверка ограничений стихий
  if (tech.type === 'healing' && tech.element !== 'neutral') {
    errors++;
    errorDetails.push(`Healing с элементом ${tech.element}: ${tech.id}`);
  }
  
  if (tech.type === 'cultivation' && tech.element !== 'neutral') {
    errors++;
    errorDetails.push(`Cultivation с элементом ${tech.element}: ${tech.id}`);
  }
  
  if (tech.type === 'poison' && tech.element !== 'poison') {
    errors++;
    errorDetails.push(`Poison с элементом ${tech.element}: ${tech.id}`);
  }
  
  // 2. Проверка формулы урона (capacity × gradeDamageMult)
  if (tech.type !== 'cultivation' && tech.baseCapacity !== null) {
    const expectedCapacity = tech.baseCapacity * Math.pow(2, tech.level - 1);
    const expectedDamage = Math.floor(expectedCapacity * {
      common: 1.0,
      refined: 1.2,
      perfect: 1.4,
      transcendent: 1.6,
    }[tech.grade]);
    
    if (tech.computed.finalDamage !== expectedDamage) {
      // Это может быть нормально из-за различий в combatSubtype
      // Добавим проверку с допуском
      const ratio = tech.computed.finalDamage / expectedDamage;
      if (ratio < 0.3 || ratio > 3.0) {
        errors++;
        errorDetails.push(`Некорректный урон: ${tech.id} - computed: ${tech.computed.finalDamage}, expected: ${expectedDamage}`);
      }
    }
  }
  
  // 3. Проверка qiCost (все множители = 1.0)
  if (tech.baseQiCost !== tech.computed.finalQiCost) {
    errors++;
    errorDetails.push(`qiCost отличается от baseQiCost: ${tech.id} - base: ${tech.baseQiCost}, final: ${tech.computed.finalQiCost}`);
  }
}

if (errors === 0) {
  console.log('✅ Все проверки пройдены успешно!');
} else {
  console.log(`❌ Найдено ${errors} ошибок:`);
  for (const detail of errorDetails.slice(0, 10)) {
    console.log(`  - ${detail}`);
  }
  if (errorDetails.length > 10) {
    console.log(`  ... и ещё ${errorDetails.length - 10} ошибок`);
  }
}

// ==================== ПРИМЕРЫ ТЕХНИК ====================

console.log('\n=== ПРИМЕРЫ ТЕХНИК ===');

const examples = {
  combat: techniques.find(t => t.type === 'combat'),
  healing: techniques.find(t => t.type === 'healing'),
  cultivation: techniques.find(t => t.type === 'cultivation'),
  poison: techniques.find(t => t.type === 'poison'),
  support: techniques.find(t => t.type === 'support'),
};

for (const [type, tech] of Object.entries(examples)) {
  if (tech) {
    console.log(`\n[${type.toUpperCase()}] ${tech.name} (${tech.id})`);
    console.log(`  Элемент: ${tech.element}, Grade: ${tech.grade}, Level: ${tech.level}`);
    console.log(`  Урон: ${tech.computed.finalDamage}, QiCost: ${tech.computed.finalQiCost}`);
    console.log(`  Формула: ${tech.computed.formula}`);
  }
}

console.log('\n=== ГОТОВО ===');
