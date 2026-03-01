import { NextRequest, NextResponse } from 'next/server';
import { mapService } from '@/services/map.service';
import { db } from '@/lib/db';

/**
 * GET /api/map
 * Получить информацию о карте и текущей локации
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action') || 'current';

    // Получить текущую локацию персонажа
    if (action === 'current' && characterId) {
      const character = await db.character.findUnique({
        where: { id: characterId },
        include: {
          currentLocation: true,
        },
      });

      if (!character) {
        return NextResponse.json(
          { success: false, error: 'Персонаж не найден' },
          { status: 404 }
        );
      }

      // Получить строения в текущей локации
      let buildings: any[] = [];
      if (character.currentLocationId) {
        buildings = await db.building.findMany({
          where: { locationId: character.currentLocationId },
        });
      }

      // Получить объекты в текущей локации
      let objects: any[] = [];
      if (character.currentLocationId) {
        objects = await db.worldObject.findMany({
          where: { locationId: character.currentLocationId },
        });
      }

      return NextResponse.json({
        success: true,
        location: character.currentLocation,
        buildings,
        objects,
      });
    }

    // Получить все локации сессии
    if (action === 'all' && sessionId) {
      const locations = await db.location.findMany({
        where: { sessionId },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({
        success: true,
        locations,
      });
    }

    // Получить локации в радиусе
    if (action === 'radius' && characterId) {
      const radius = parseInt(searchParams.get('radius') || '1000');

      const character = await db.character.findUnique({
        where: { id: characterId },
        include: { currentLocation: true },
      });

      if (!character?.currentLocation) {
        return NextResponse.json(
          { success: false, error: 'Локация не найдена' },
          { status: 404 }
        );
      }

      const result = await mapService.getLocationsInRadius(
        character.currentLocation.sessionId,
        {
          x: character.currentLocation.x,
          y: character.currentLocation.y,
          z: character.currentLocation.z,
        },
        radius
      );

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Не указаны необходимые параметры' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Map API error:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/map
 * Создать новую локацию, строение или объект
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (type === 'location') {
      const location = await mapService.createLocation(
        data.sessionId,
        data
      );
      return NextResponse.json({ success: true, location });
    }

    if (type === 'building') {
      const building = await mapService.createBuilding(data);
      return NextResponse.json({ success: true, building });
    }

    if (type === 'object') {
      const object = await mapService.createWorldObject(data);
      return NextResponse.json({ success: true, object });
    }

    return NextResponse.json(
      { success: false, error: 'Неизвестный тип' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Map API error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка создания' },
      { status: 500 }
    );
  }
}
