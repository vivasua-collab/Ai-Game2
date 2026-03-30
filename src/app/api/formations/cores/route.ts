import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generateFormationCore,
  getAvailableCoresForLevel,
  getCoreInfo,
} from '@/lib/formations/formation-core-generator';
import { getCharacterCores, createCoreForCharacter } from '@/lib/formations/formation-manager';

/**
 * GET /api/formations/cores - Получение ядер
 * Query params:
 * - characterId: string (optional) - получить ядра персонажа
 * - level: number (optional) - получить доступные ядра для уровня
 * - variant: string (optional) - получить информацию о конкретном ядре
 * - coreType: string (optional) - тип ядра для variant
 */
export async function GET(request: NextRequest) {
  try {
    const characterId = request.nextUrl.searchParams.get('characterId');
    const level = request.nextUrl.searchParams.get('level');
    const variant = request.nextUrl.searchParams.get('variant');
    const coreType = request.nextUrl.searchParams.get('coreType') as 'disk' | 'altar' | null;
    
    // Получение ядер персонажа
    if (characterId) {
      const cores = await getCharacterCores(characterId);
      return NextResponse.json({ cores });
    }
    
    // Получение доступных ядер для уровня
    if (level) {
      const levelNum = parseInt(level, 10);
      const availableCores = getAvailableCoresForLevel(levelNum);
      return NextResponse.json({ availableCores });
    }
    
    // Получение информации о конкретном ядре
    if (variant && coreType) {
      const info = getCoreInfo(variant, coreType);
      return NextResponse.json(info);
    }
    
    // Получение всех ядер (для админки)
    const allCores = await db.formationCore.findMany({
      include: {
        character: { select: { id: true, name: true } },
        activeFormation: { include: { technique: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    
    return NextResponse.json({ cores: allCores });
  } catch (error) {
    console.error('Error fetching cores:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/formations/cores - Создание нового ядра
 * Body: {
 *   level: number;
 *   characterId?: string;
 *   coreType?: 'disk' | 'altar';
 *   variant?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, characterId, coreType, variant } = body;
    
    if (!level) {
      return NextResponse.json(
        { error: 'level обязателен' },
        { status: 400 }
      );
    }
    
    // Генерация данных ядра
    const coreData = generateFormationCore(level, {
      preferType: coreType,
      variant,
      characterId,
    });
    
    // Создание в БД
    const core = await db.formationCore.create({
      data: coreData,
    });
    
    return NextResponse.json({ core });
  } catch (error) {
    console.error('Error creating core:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/formations/cores - Удаление ядра
 * Query params:
 * - id: string (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'id обязателен' },
        { status: 400 }
      );
    }
    
    const core = await db.formationCore.findUnique({
      where: { id },
    });
    
    if (!core) {
      return NextResponse.json(
        { error: 'Ядро не найдено' },
        { status: 404 }
      );
    }
    
    if (core.isImbued) {
      return NextResponse.json(
        { error: 'Нельзя удалить ядро с внедрённой формацией' },
        { status: 400 }
      );
    }
    
    await db.formationCore.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting core:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 400 }
    );
  }
}
