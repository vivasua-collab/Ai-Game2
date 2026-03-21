import { NextRequest, NextResponse } from 'next/server';

// V2 Generator (основной)
import {
  generateAllTechniquesV2,
  generateTechniquesForLevelV2,
  generateTechniquesWithOptionsV2,
  getGenerationStatsV2,
  type TechniqueType,
  type CombatSubtype,
  type GeneratedTechniqueV2,
} from '@/lib/generator/technique-generator-v2';

// V1 Generator (@deprecated - только для совместимости)
import {
  generateAllTechniques,
  generateTechniquesForLevel,
  generateTechniquesWithOptions,
  getGenerationStats,
} from '@/lib/generator/technique-generator';

import {
  generateAllFormations,
  generateFormationsForLevel,
  getFormationStats,
} from '@/lib/generator/formation-generator';

import { presetStorage, type ClearResult } from '@/lib/generator/preset-storage';
import {
  getPrefixForTechniqueType,
  type IdPrefix,
} from '@/lib/generator/id-config';

// По умолчанию используем V2
const DEFAULT_VERSION = 2;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const version = parseInt(searchParams.get('version') || String(DEFAULT_VERSION)) as 1 | 2;

  try {
    switch (action) {
      case 'manifest':
        const manifest = await presetStorage.getManifest();
        return NextResponse.json({ success: true, manifest });

      case 'stats':
        return NextResponse.json({
          success: true,
          stats: {
            techniques: version === 2 ? getGenerationStatsV2() : getGenerationStats(),
            formations: getFormationStats(),
            generatorVersion: version,
          },
        });

      case 'list':
        const level = parseInt(searchParams.get('level') || '0');
        const type = searchParams.get('type') as 'technique' | 'formation' | null;
        const techniqueType = searchParams.get('techniqueType') as TechniqueType | null;
        const combatSubtype = searchParams.get('combatSubtype') as CombatSubtype | null;

        if (type === 'formation') {
          return NextResponse.json({
            success: true,
            formations: [],
            count: 0
          });
        }

        // Загрузка по типу/подтипу
        if (techniqueType === 'combat' && combatSubtype) {
          const techniques = await presetStorage.loadTechniquesBySubtype(combatSubtype);
          return NextResponse.json({ success: true, techniques, count: techniques.length });
        }

        if (techniqueType) {
          const techniques = await presetStorage.loadTechniquesByType(techniqueType);
          return NextResponse.json({ success: true, techniques, count: techniques.length });
        }

        if (level > 0) {
          const techniques = await presetStorage.getTechniquesByLevel(level);
          return NextResponse.json({ success: true, techniques, count: techniques.length });
        }

        const techniques = await presetStorage.loadTechniques();
        return NextResponse.json({ success: true, techniques, count: techniques.length });

      case 'get':
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
        }
        const technique = await presetStorage.getTechniqueById(id);
        if (!technique) {
          return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, technique });

      case 'check':
        const hasPresets = await presetStorage.hasGeneratedPresets();
        return NextResponse.json({ success: true, hasPresets });

      case 'storage':
        const storageStats = await presetStorage.analyzeStorage();
        return NextResponse.json({ success: true, storage: storageStats });

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action. Use: manifest, stats, list, get, check, storage'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[Generator API] GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      level,
      mode = 'replace',
      options,
      preserveCounters = true,
      version = DEFAULT_VERSION, // Версия генератора (1 или 2)
      environment = 'test', // Среда: test или production
      // Параметры для очистки
      scope,           // 'all' | 'type' | 'subtype'
      targetType,      // Тип техники для очистки
      targetSubtype,   // Подтип combat для очистки
    } = body;

    const useV2 = version === 2;

    await presetStorage.initialize();

    switch (action) {
      case 'generate': {
        // V2: Генерация с опциями
        if (useV2) {
          if (options) {
            const result = generateTechniquesWithOptionsV2(
              {
                ...options,
                mode: mode || 'replace',
                environment,
              },
              (prefix) => presetStorage.generateId(prefix as IdPrefix)
            );

            if (result.success && result.techniques.length > 0) {
              // Конвертируем V2 в формат для сохранения
              const techniquesForSave = result.techniques.map(convertV2ToStorage);
              await presetStorage.saveTechniques(techniquesForSave, mode);
            }

            return NextResponse.json({
              success: result.success,
              generated: result.generated,
              errors: result.errors,
              warnings: result.warnings,
              generatorVersion: 'V2',
              message: result.success
                ? `Сгенерировано ${result.generated} техник (V2)`
                : `Ошибка: ${result.errors.join(', ')}`,
            });
          }

          // Простая генерация V2
          const techniques = level
            ? generateTechniquesForLevelV2(level, (prefix) => presetStorage.generateId(prefix as IdPrefix))
            : generateAllTechniquesV2((prefix) => presetStorage.generateId(prefix as IdPrefix), environment);

          const techniquesForSave = techniques.map(convertV2ToStorage);
          await presetStorage.saveTechniques(techniquesForSave, mode);

          return NextResponse.json({
            success: true,
            generated: techniques.length,
            generatorVersion: 'V2',
            message: level
              ? `Сгенерировано ${techniques.length} техник V2 для уровня ${level}`
              : `Сгенерировано ${techniques.length} техник V2 для всех уровней`,
          });
        }

        // V1: Генерация с опциями (deprecated)
        if (options) {
          const result = generateTechniquesWithOptions(
            {
              ...options,
              mode: mode || 'replace',
            },
            (prefix) => presetStorage.generateId(prefix as IdPrefix)
          );

          if (result.success && result.techniques.length > 0) {
            await presetStorage.saveTechniques(result.techniques, mode);
          }

          return NextResponse.json({
            success: result.success,
            generated: result.generated,
            errors: result.errors,
            warnings: result.warnings,
            generatorVersion: 'V1 (deprecated)',
            message: result.success
              ? `Сгенерировано ${result.generated} техник (V1 deprecated)`
              : `Ошибка: ${result.errors.join(', ')}`,
          });
        }

        // V1: Простая генерация
        const techniquesV1 = level
          ? generateTechniquesForLevel(level)
          : generateAllTechniques();

        const techniquesWithNewIds = techniquesV1.map(t => {
          const prefix = getPrefixForTechniqueType(
            t.type as TechniqueType,
            t.subtype as CombatSubtype | undefined
          );
          return {
            ...t,
            id: presetStorage.generateId(prefix),
          };
        });

        await presetStorage.saveTechniques(techniquesWithNewIds, mode);

        return NextResponse.json({
          success: true,
          generated: techniquesV1.length,
          generatorVersion: 'V1 (deprecated)',
          message: level
            ? `Сгенерировано ${techniquesV1.length} техник V1 для уровня ${level}`
            : `Сгенерировано ${techniquesV1.length} техник V1 для всех уровней`,
        });
      }

      case 'generate_formations': {
        const formations = level
          ? generateFormationsForLevel(level)
          : generateAllFormations();

        const formationsWithNewIds = formations.map(f => ({
          ...f,
          id: presetStorage.generateId('FM'),
        }));

        await presetStorage.saveFormations(formationsWithNewIds, mode);

        return NextResponse.json({
          success: true,
          generated: formations.length,
          message: level
            ? `Сгенерировано ${formations.length} формаций для уровня ${level}`
            : `Сгенерировано ${formations.length} формаций для всех уровней`,
        });
      }

      case 'append': {
        const appendOptions = options || {};

        if (useV2) {
          const result = generateTechniquesWithOptionsV2(
            {
              ...appendOptions,
              mode: 'append',
              environment,
            },
            (prefix) => presetStorage.generateId(prefix as IdPrefix)
          );

          if (result.success && result.techniques.length > 0) {
            const techniquesForSave = result.techniques.map(convertV2ToStorage);
            await presetStorage.saveTechniques(techniquesForSave, 'append');
          }

          return NextResponse.json({
            success: result.success,
            generated: result.generated,
            generatorVersion: 'V2',
            message: result.success
              ? `Добавлено ${result.generated} техник (V2)`
              : `Ошибка: ${result.errors.join(', ')}`,
          });
        }

        const result = generateTechniquesWithOptions(
          {
            ...appendOptions,
            mode: 'append',
          },
          (prefix) => presetStorage.generateId(prefix as IdPrefix)
        );

        if (result.success && result.techniques.length > 0) {
          await presetStorage.saveTechniques(result.techniques, 'append');
        }

        return NextResponse.json({
          success: result.success,
          generated: result.generated,
          message: result.success
            ? `Добавлено ${result.generated} техник`
            : `Ошибка: ${result.errors.join(', ')}`,
        });
      }

      case 'clear': {
        let clearResult: ClearResult;

        if (scope === 'type' && targetType) {
          clearResult = await presetStorage.clearByType(
            targetType as TechniqueType,
            preserveCounters
          );
        } else if (scope === 'subtype' && targetSubtype) {
          clearResult = await presetStorage.clearBySubtype(
            targetSubtype as CombatSubtype,
            preserveCounters
          );
        } else {
          clearResult = await presetStorage.clearAll(preserveCounters);
        }

        let message = '';
        if (clearResult.clearedSubtype) {
          message = `Очищен подтип "${clearResult.clearedSubtype}". `;
        } else if (clearResult.clearedType) {
          message = `Очищен тип "${clearResult.clearedType}". `;
        }
        message += `Удалено ${clearResult.deletedFiles} файлов, ${clearResult.deletedObjects} объектов.`;

        if (preserveCounters) {
          message += ' Счётчики ID сохранены.';
        } else {
          message += ' Счётчики сброшены.';
        }

        return NextResponse.json({
          success: true,
          deletedFiles: clearResult.deletedFiles,
          deletedObjects: clearResult.deletedObjects,
          countersPreserved: clearResult.countersPreserved,
          clearedType: clearResult.clearedType,
          clearedSubtype: clearResult.clearedSubtype,
          message,
        });
      }

      case 'clear_cache':
        presetStorage.clearCache();
        return NextResponse.json({
          success: true,
          message: 'Кэш очищен',
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action. Use: generate, generate_formations, append, clear, clear_cache'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[Generator API] POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Конвертация V2 техники в формат для сохранения
 */
function convertV2ToStorage(technique: GeneratedTechniqueV2): Record<string, unknown> {
  return {
    id: technique.id,
    name: technique.name,
    nameEn: technique.nameEn,
    description: technique.description,
    type: technique.type,
    subtype: technique.subtype,
    element: technique.element,
    level: technique.level,
    grade: technique.grade,
    rarity: gradeToRarity(technique.grade), // Для совместимости

    // Базовые параметры V2
    baseQiCost: technique.baseQiCost,
    baseDamage: technique.baseDamage,
    baseRange: technique.baseRange,
    baseCapacity: technique.baseCapacity,

    // Вычисленные
    computed: {
      finalDamage: technique.computed.finalDamage,
      finalQiCost: technique.computed.finalQiCost,
      finalRange: technique.computed.finalRange,
      formula: technique.computed.formula,
      activeEffects: technique.computed.activeEffects,
    },

    // Модификаторы
    modifiers: technique.modifiers,

    // Дополнительные поля
    weaponCategory: technique.weaponCategory,
    weaponType: technique.weaponType,
    damageFalloff: technique.damageFalloff,
    isRangedQi: technique.isRangedQi,

    // Требования
    minCultivationLevel: technique.minCultivationLevel,
    statRequirements: technique.statRequirements,

    // Метаданные
    meta: technique.meta,
  };
}

/**
 * Конвертация Grade в Rarity (для совместимости)
 */
function gradeToRarity(grade: string): string {
  const mapping: Record<string, string> = {
    common: 'common',
    refined: 'uncommon',
    perfect: 'rare',
    transcendent: 'legendary',
  };
  return mapping[grade] || 'common';
}
