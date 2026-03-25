import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  createFormationWithoutCore,
  createFormationWithCore,
  getSessionFormations,
  activateFormation,
  addQiToFormation,
  removeDepletedFormation,
} from '@/lib/formations/formation-manager';

/**
 * GET /api/formations - Получение формаций сессии
 * Query params:
 * - sessionId: string (required)
 * - stage: string (optional) - filter by stage
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const stage = request.nextUrl.searchParams.get('stage');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId обязателен' },
        { status: 400 }
      );
    }
    
    const where: { sessionId: string; stage?: string } = { sessionId };
    if (stage) {
      where.stage = stage;
    }
    
    const formations = await db.activeFormation.findMany({
      where,
      include: {
        technique: true,
        core: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Парсинг participants для каждого formation
    const formationsWithParsedParticipants = formations.map(f => ({
      ...f,
      participants: JSON.parse(f.participants),
    }));
    
    return NextResponse.json({ formations: formationsWithParsedParticipants });
  } catch (error) {
    console.error('Error fetching formations:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/formations - Создание новой формации
 * Body: {
 *   sessionId: string;
 *   techniqueId: string;
 *   creatorId: string;
 *   level: number;
 *   formationType: string;
 *   size: string;
 *   isHeavy?: boolean;
 *   locationId?: string;
 *   x?: number;
 *   y?: number;
 *   coreId?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      sessionId,
      techniqueId,
      creatorId,
      level,
      formationType,
      size,
      isHeavy = false,
      locationId,
      x,
      y,
      coreId,
    } = body;
    
    if (!sessionId || !techniqueId || !creatorId || !level || !formationType || !size) {
      return NextResponse.json(
        { error: 'Не все обязательные поля указаны' },
        { status: 400 }
      );
    }
    
    let formation;
    
    if (coreId) {
      formation = await createFormationWithCore({
        sessionId,
        techniqueId,
        creatorId,
        level,
        formationType,
        size,
        isHeavy,
        locationId,
        x: x || 0,
        y: y || 0,
        coreId,
      });
    } else {
      formation = await createFormationWithoutCore({
        sessionId,
        techniqueId,
        creatorId,
        level,
        formationType,
        size,
        isHeavy,
        locationId,
        x: x || 0,
        y: y || 0,
      });
    }
    
    return NextResponse.json({ formation });
  } catch (error) {
    console.error('Error creating formation:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 400 }
    );
  }
}

/**
 * PATCH /api/formations - Обновление формации
 * Body: {
 *   id: string;
 *   action: 'activate' | 'addQi' | 'remove';
 *   qiAmount?: number;
 *   practitionerId?: string;
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, qiAmount, practitionerId } = body;
    
    if (!id || !action) {
      return NextResponse.json(
        { error: 'id и action обязательны' },
        { status: 400 }
      );
    }
    
    switch (action) {
      case 'activate':
        await activateFormation(id);
        return NextResponse.json({ success: true, message: 'Формация активирована' });
        
      case 'addQi':
        if (!qiAmount || !practitionerId) {
          return NextResponse.json(
            { error: 'qiAmount и practitionerId обязательны для addQi' },
            { status: 400 }
          );
        }
        const result = await addQiToFormation(id, qiAmount, practitionerId);
        return NextResponse.json(result);
        
      case 'remove':
        await removeDepletedFormation(id);
        return NextResponse.json({ success: true, message: 'Формация удалена' });
        
      default:
        return NextResponse.json(
          { error: 'Неизвестное действие' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error updating formation:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/formations - Удаление формации
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
    
    await removeDepletedFormation(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting formation:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 400 }
    );
  }
}
