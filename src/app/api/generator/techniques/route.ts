import { NextRequest, NextResponse } from 'next/server';
import { 
  generateAllTechniques, 
  generateTechniquesForLevel,
  generateTechniquesWithOptions,
  getGenerationStats,
  type TechniqueType,
  type CombatSubtype,
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
  type TechniqueType as IdTechniqueType,
} from '@/lib/generator/id-config';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  try {
    switch (action) {
      case 'manifest':
        const manifest = await presetStorage.getManifest();
        return NextResponse.json({ success: true, manifest });
        
      case 'stats':
        return NextResponse.json({
          success: true,
          stats: {
            techniques: getGenerationStats(),
            formations: getFormationStats(),
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
      // Новые параметры для очистки
      scope,           // 'all' | 'type' | 'subtype'
      targetType,      // Тип техники для очистки
      targetSubtype,   // Подтип combat для очистки
    } = body;
    
    await presetStorage.initialize();
    
    switch (action) {
      case 'generate': {
        // Генерация техник с опциями
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
            message: result.success 
              ? `Сгенерировано ${result.generated} техник`
              : `Ошибка: ${result.errors.join(', ')}`,
          });
        }
        
        // Простая генерация (все или по уровню)
        const techniques = level 
          ? generateTechniquesForLevel(level)
          : generateAllTechniques();
        
        // Перегенерация ID с использованием новой системы
        const techniquesWithNewIds = techniques.map(t => {
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
          generated: techniques.length,
          message: level 
            ? `Сгенерировано ${techniques.length} техник для уровня ${level}`
            : `Сгенерировано ${techniques.length} техник для всех уровней`,
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
        
        // Определяем область очистки
        if (scope === 'type' && targetType) {
          // Очистка по типу
          clearResult = await presetStorage.clearByType(
            targetType as TechniqueType,
            preserveCounters
          );
        } else if (scope === 'subtype' && targetSubtype) {
          // Очистка по подтипу combat
          clearResult = await presetStorage.clearBySubtype(
            targetSubtype as CombatSubtype,
            preserveCounters
          );
        } else {
          // Полная очистка (по умолчанию)
          clearResult = await presetStorage.clearAll(preserveCounters);
        }
        
        // Формируем сообщение
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
