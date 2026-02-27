import { NextRequest, NextResponse } from 'next/server';
import { 
  generateAllTechniques, 
  generateTechniquesForLevel,
  getTechniqueCountForLevel,
  getTotalTechniqueCount,
} from '@/lib/generator/technique-generator';
import { presetStorage } from '@/lib/generator/preset-storage';

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
            totalTechniques: getTotalTechniqueCount(),
            byLevel: Object.fromEntries(
              Array.from({ length: 9 }, (_, i) => [i + 1, getTechniqueCountForLevel(i + 1)])
            ),
          },
        });
        
      case 'list':
        const level = parseInt(searchParams.get('level') || '0');
        if (level > 0) {
          const techniques = await presetStorage.getTechniquesByLevel(level);
          return NextResponse.json({ success: true, techniques, count: techniques.length });
        } else {
          const techniques = await presetStorage.loadTechniques();
          return NextResponse.json({ success: true, techniques, count: techniques.length });
        }
        
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
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Unknown action. Use: manifest, stats, list, get, check' 
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
    const { action, level } = body;
    
    await presetStorage.initialize();
    
    switch (action) {
      case 'generate':
        const techniques = level 
          ? generateTechniquesForLevel(level)
          : generateAllTechniques();
        
        await presetStorage.saveTechniques(techniques);
        
        return NextResponse.json({
          success: true,
          generated: techniques.length,
          message: level 
            ? `Сгенерировано ${techniques.length} техник для уровня ${level}`
            : `Сгенерировано ${techniques.length} техник для всех уровней`,
        });
        
      case 'clear':
        presetStorage.clearCache();
        return NextResponse.json({
          success: true,
          message: 'Кэш очищен',
        });
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Unknown action. Use: generate, clear' 
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
