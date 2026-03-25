/**
 * ============================================================================
 * СКРИПТ ГЕНЕРАЦИИ ТЕХНИК V2
 * ============================================================================
 * 
 * Запуск: bun run scripts/generate-techniques-v2.ts
 * 
 * Генерирует техники с использованием V2 генератора.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  generateAllTechniquesV2,
  type GeneratedTechniqueV2,
} from '../src/lib/generator/technique-generator-v2';

// ==================== КОНФИГУРАЦИЯ ====================

const PRESETS_DIR = path.join(process.cwd(), 'presets', 'techniques');
const ENVIRONMENT = 'test'; // 'test' или 'production'

// ==================== СЧЁТЧИКИ ID ====================

const idCounters: Record<string, number> = {};

function generateId(prefix: string): string {
  if (!idCounters[prefix]) {
    idCounters[prefix] = 1;
  }
  const id = `${prefix}_${idCounters[prefix].toString().padStart(6, '0')}`;
  idCounters[prefix]++;
  return id;
}

// ==================== КОНВЕРТАЦИЯ V2 → JSON ====================

interface TechniqueJsonFile {
  version: string;
  type: string;
  subtype?: string;
  level: number;
  count: number;
  techniques: Array<Record<string, unknown>>;
  generatedAt: string;
  generatorVersion: string;
}

function techniqueToJson(tech: GeneratedTechniqueV2): Record<string, unknown> {
  // Конвертация Grade в Rarity для совместимости
  const gradeToRarity: Record<string, string> = {
    common: 'common',
    refined: 'uncommon',
    perfect: 'rare',
    transcendent: 'legendary',
  };

  return {
    id: tech.id,
    name: tech.name,
    nameEn: tech.nameEn,
    description: tech.description,
    type: tech.type,
    subtype: tech.subtype,
    element: tech.element,
    level: tech.level,
    grade: tech.grade,
    rarity: gradeToRarity[tech.grade] || 'common',

    // Базовые параметры V2
    baseQiCost: tech.baseQiCost,
    baseDamage: tech.baseDamage, // = qiCost!
    baseRange: tech.baseRange,
    baseCapacity: tech.baseCapacity,

    // Вычисленные параметры
    computed: {
      finalDamage: tech.computed.finalDamage,
      finalQiCost: tech.computed.finalQiCost,
      finalRange: tech.computed.finalRange,
      formula: tech.computed.formula,
      activeEffects: tech.computed.activeEffects,
    },

    // Модификаторы
    modifiers: tech.modifiers,

    // Дополнительные поля
    weaponCategory: tech.weaponCategory,
    weaponType: tech.weaponType,
    damageFalloff: tech.damageFalloff,
    isRangedQi: tech.isRangedQi,

    // Требования
    minCultivationLevel: tech.minCultivationLevel,
    statRequirements: tech.statRequirements,

    // Метаданные
    meta: tech.meta,
  };
}

// ==================== СОХРАНЕНИЕ В ФАЙЛЫ ====================

async function saveTechniques(techniques: GeneratedTechniqueV2[]): Promise<void> {
  // Группируем по типу, подтипу и уровню
  const grouped = new Map<string, GeneratedTechniqueV2[]>();

  for (const tech of techniques) {
    const key = tech.subtype
      ? `${tech.type}/${tech.subtype}/${tech.level}`
      : `${tech.type}/${tech.level}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(tech);
  }

  // Создаём директории и сохраняем
  for (const [key, techs] of grouped.entries()) {
    const parts = key.split('/');
    let filePath: string;

    if (parts.length === 3) {
      // combat/subtype/level -> combat/subtype/level-N.json
      const [type, subtype, level] = parts;
      const subDir = subtype.replace(/_/g, '-'); // melee_strike -> melee-strike
      filePath = path.join(PRESETS_DIR, type, subDir, `level-${level}.json`);
    } else {
      // type/level -> type/level-N.json
      const [type, level] = parts;
      filePath = path.join(PRESETS_DIR, type, `level-${level}.json`);
    }

    const jsonFile: TechniqueJsonFile = {
      version: '4.0.0',
      type: techs[0].type,
      subtype: techs[0].subtype,
      level: techs[0].level,
      count: techs.length,
      techniques: techs.map(techniqueToJson),
      generatedAt: new Date().toISOString(),
      generatorVersion: 'V2',
    };

    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(jsonFile, null, 2), 'utf-8');
      console.log(`✅ Saved: ${filePath} (${techs.length} techniques)`);
    } catch (error) {
      console.error(`❌ Failed to save ${filePath}:`, error);
    }
  }
}

// ==================== ОБНОВЛЕНИЕ МАНИФЕСТА ====================

async function updateManifest(techniques: GeneratedTechniqueV2[]): Promise<void> {
  const manifestPath = path.join(process.cwd(), 'presets', 'manifest.json');

  const byType: Record<string, number> = {};
  const byLevel: Record<number, number> = {};
  const byElement: Record<string, number> = {};
  const byGrade: Record<string, number> = {};

  for (const tech of techniques) {
    byType[tech.type] = (byType[tech.type] || 0) + 1;
    byLevel[tech.level] = (byLevel[tech.level] || 0) + 1;
    byElement[tech.element] = (byElement[tech.element] || 0) + 1;
    byGrade[tech.grade] = (byGrade[tech.grade] || 0) + 1;
  }

  const manifest = {
    version: '4.0.0',
    generatedAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
    generator: 'V2',
    principles: [
      'baseDamage = qiCost',
      'Formula-based generation',
      'Matryoshka architecture compliance',
    ],
    techniques: {
      total: techniques.length,
      byLevel,
      byType,
      byElement,
      byGrade,
    },
    formations: { total: 0, byLevel: {}, byType: {} },
    items: { total: 0 },
    npcs: { total: 0 },
  };

  try {
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`\n📋 Manifest updated: ${manifestPath}`);
  } catch (error) {
    console.error('Failed to update manifest:', error);
  }
}

// ==================== ГЛАВНАЯ ФУНКЦИЯ ====================

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('🚀 Генерация техник V2');
  console.log('='.repeat(60));
  console.log(`📁 Presets dir: ${PRESETS_DIR}`);
  console.log(`🔧 Environment: ${ENVIRONMENT}`);
  console.log('');

  console.log('⚡ Generating techniques...');
  const startTime = Date.now();

  const techniques = generateAllTechniquesV2(
    (prefix) => generateId(prefix),
    ENVIRONMENT as 'test' | 'production'
  );

  const duration = Date.now() - startTime;
  console.log(`✅ Generated ${techniques.length} techniques in ${duration}ms`);

  // Статистика
  const stats = {
    byType: {} as Record<string, number>,
    byGrade: {} as Record<string, number>,
  };

  for (const tech of techniques) {
    stats.byType[tech.type] = (stats.byType[tech.type] || 0) + 1;
    stats.byGrade[tech.grade] = (stats.byGrade[tech.grade] || 0) + 1;
  }

  console.log('\n📊 Статистика по типам:');
  for (const [type, count] of Object.entries(stats.byType).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${type}: ${count}`);
  }

  console.log('\n📊 Статистика по Grade:');
  for (const [grade, count] of Object.entries(stats.byGrade)) {
    console.log(`   ${grade}: ${count}`);
  }

  // Сохраняем
  console.log('\n💾 Saving to JSON files...');
  await saveTechniques(techniques);

  // Обновляем манифест
  await updateManifest(techniques);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Генерация завершена!');
  console.log(`📊 Всего техник: ${techniques.length}`);
  console.log(`⏱️  Время: ${duration}ms`);
  console.log('='.repeat(60));
}

main().catch(console.error);
