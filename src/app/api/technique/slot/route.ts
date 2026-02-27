/**
 * API для управления слотами техник
 * 
 * PUT /api/technique/slot - назначить/очистить слот
 * Body: { characterId, slotType, slotIndex?, techniqueId (null для очистки) }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { characterId, slotType, slotIndex, techniqueId } = body;

    if (!characterId || !slotType) {
      return NextResponse.json(
        { success: false, error: 'Не указан characterId или slotType' },
        { status: 400 }
      );
    }

    // Получаем персонажа
    const character = await db.character.findUnique({
      where: { id: characterId },
      select: { id: true, cultivationLevel: true }
    });

    if (!character) {
      return NextResponse.json(
        { success: false, error: 'Персонаж не найден' },
        { status: 404 }
      );
    }

    // Базовое количество слотов = 3 + (уровень - 1)
    const combatSlotsCount = 3 + Math.max(0, character.cultivationLevel - 1);

    if (slotType === 'cultivation') {
      // Для техник культивации используем quickSlot = 0
      
      // Сначала сбрасываем quickSlot для всех техник культивации этого персонажа
      await db.characterTechnique.updateMany({
        where: {
          characterId,
          technique: { type: 'cultivation' }
        },
        data: { quickSlot: null }
      });

      // Если указана техника - назначаем
      if (techniqueId) {
        // Проверяем что техника существует и является техникой культивации
        const charTech = await db.characterTechnique.findFirst({
          where: { 
            characterId,
            techniqueId,
            technique: { type: 'cultivation' }
          },
          include: { technique: true }
        });
        
        if (!charTech) {
          return NextResponse.json(
            { success: false, error: 'Техника не найдена или не является техникой культивации' },
            { status: 400 }
          );
        }

        // Устанавливаем quickSlot = 0 для культивации
        await db.characterTechnique.update({
          where: { id: charTech.id },
          data: { quickSlot: 0 }
        });
      }
      
    } else if (slotType === 'combat') {
      if (slotIndex === undefined || slotIndex < 0 || slotIndex >= combatSlotsCount) {
        return NextResponse.json(
          { success: false, error: `Неверный индекс слота. Доступно слотов: ${combatSlotsCount}` },
          { status: 400 }
        );
      }

      // Сначала сбрасываем quickSlot для техники, которая сейчас в этом слоте
      await db.characterTechnique.updateMany({
        where: {
          characterId,
          quickSlot: slotIndex + 1 // quickSlot 1-indexed
        },
        data: { quickSlot: null }
      });

      // Если указана техника - назначаем
      if (techniqueId) {
        // Проверяем что техника существует и является боевой
        const charTech = await db.characterTechnique.findFirst({
          where: { 
            characterId,
            techniqueId,
            technique: { type: { in: ['combat', 'movement'] } }
          },
          include: { technique: true }
        });
        
        if (!charTech) {
          return NextResponse.json(
            { success: false, error: 'Техника не найдена или не является боевой техникой' },
            { status: 400 }
          );
        }

        // === ПРОВЕРКА ДЛЯ СЛОТА 1 (только ближний бой) ===
        if (slotIndex === 0) {
          // Слот 1 - только для техник ближнего боя (melee_strike, melee_weapon)
          const technique = charTech.technique;
          let effects: any = {};
          
          try {
            if (technique.effects) {
              effects = JSON.parse(technique.effects);
            }
          } catch {
            effects = {};
          }

          const combatType = effects.combatType;
          const allowedTypes = ['melee_strike', 'melee_weapon'];
          
          if (!combatType || !allowedTypes.includes(combatType)) {
            return NextResponse.json(
              { 
                success: false, 
                error: 'Слот 1 предназначен только для техник ближнего боя (удар рукой или оружие)' 
              },
              { status: 400 }
            );
          }
        }

        // Устанавливаем quickSlot
        await db.characterTechnique.update({
          where: { id: charTech.id },
          data: { quickSlot: slotIndex + 1 } // 1-indexed
        });
      }
      
    } else {
      return NextResponse.json(
        { success: false, error: 'Неверный тип слота. Используйте "cultivation" или "combat"' },
        { status: 400 }
      );
    }

    // Получаем обновлённые слоты
    const techniques = await db.characterTechnique.findMany({
      where: { characterId },
      include: { technique: true }
    });

    const slots = {
      cultivationSlot: techniques.find(t => t.quickSlot === 0 && t.technique.type === 'cultivation')?.techniqueId || null,
      combatSlots: Array(combatSlotsCount).fill(null).map((_, i) => 
        techniques.find(t => t.quickSlot === i + 1)?.techniqueId || null
      )
    };

    return NextResponse.json({
      success: true,
      message: techniqueId 
        ? 'Техника назначена в слот' 
        : 'Слот очищен',
      slots
    });

  } catch (error) {
    console.error('Error managing technique slot:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при управлении слотом' },
      { status: 500 }
    );
  }
}
