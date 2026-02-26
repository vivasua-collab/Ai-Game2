/**
 * Technique Use API Endpoint
 * 
 * Использование изученной техники.
 * - Проверка возможности использования
 * - Списание Ци
 * - Применение эффектов
 * - Прирост мастерства
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { useTechnique as executeTechnique, canUseTechnique, calculateTechniqueEffectiveness } from '@/lib/game/techniques';

interface UseTechniqueRequest {
  characterId: string;
  techniqueId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as UseTechniqueRequest;
    const { characterId, techniqueId } = body;

    // Валидация
    if (!characterId || !techniqueId) {
      return NextResponse.json(
        { success: false, error: 'Missing characterId or techniqueId' },
        { status: 400 }
      );
    }

    // Получаем персонажа
    const character = await db.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      );
    }

    // Получаем технику персонажа
    const characterTechnique = await db.characterTechnique.findFirst({
      where: {
        characterId,
        techniqueId,
      },
      include: {
        technique: true,
      },
    });

    if (!characterTechnique) {
      return NextResponse.json(
        { success: false, error: 'Technique not learned' },
        { status: 404 }
      );
    }

    // Формируем объект техники для проверки
    const technique = {
      id: characterTechnique.technique.id,
      name: characterTechnique.technique.name,
      description: characterTechnique.technique.description || '',
      type: characterTechnique.technique.type as any,
      element: characterTechnique.technique.element as any,
      rarity: characterTechnique.technique.rarity as any,
      level: characterTechnique.technique.level,
      minCultivationLevel: characterTechnique.technique.minCultivationLevel,
      qiCost: characterTechnique.technique.qiCost,
      fatigueCost: characterTechnique.technique.fatigueCost as { physical: number; mental: number },
      statRequirements: characterTechnique.technique.statRequirements as any,
      statScaling: characterTechnique.technique.statScaling as any,
      effects: characterTechnique.technique.effects as any,
      masteryProgress: characterTechnique.mastery,
      masteryBonus: 0.5,
      source: 'preset' as const,
      createdAt: new Date(),
    };

    // Проверяем возможность использования
    const check = canUseTechnique(technique, character as any);
    if (!check.canUse) {
      return NextResponse.json({
        success: false,
        error: check.reason || 'Cannot use technique',
      });
    }

    // Выполняем технику
    const result = executeTechnique(technique, character as any);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.message,
      });
    }

    // Рассчитываем новые значения
    const newQi = Math.max(0, character.currentQi - result.qiSpent);
    const newFatigue = Math.min(100, character.fatigue + result.fatigueGained.physical);
    const newMentalFatigue = Math.min(100, character.mentalFatigue + result.fatigueGained.mental);
    const newMastery = Math.min(100, characterTechnique.mastery + result.masteryGained);

    // Обновляем персонажа в БД
    await db.character.update({
      where: { id: characterId },
      data: {
        currentQi: newQi,
        fatigue: newFatigue,
        mentalFatigue: newMentalFatigue,
      },
    });

    // Обновляем мастерство техники
    await db.characterTechnique.update({
      where: { id: characterTechnique.id },
      data: { mastery: newMastery },
    });

    // Обновляем здоровье если есть лечение
    if (result.effects.healing) {
      const healAmount = result.effects.healing;
      const newHealth = Math.min(100, character.health + healAmount);
      await db.character.update({
        where: { id: characterId },
        data: { health: newHealth },
      });
    }

    // Формируем сообщение
    let message = `⚡ Техника: ${technique.name}\n\n`;
    message += `Эффективность: ${Math.round(result.effectiveness * 100)}%\n`;
    message += `Затрачено Ци: ${result.qiSpent}\n`;
    message += `Мастерство: +${result.masteryGained.toFixed(1)}% (теперь ${newMastery.toFixed(0)}%)\n`;

    if (result.effects.damage) {
      message += `\n⚔️ Урон: ${result.effects.damage}`;
    }
    if (result.effects.healing) {
      message += `\n💚 Лечение: ${result.effects.healing}`;
    }
    if (result.effects.qiRegen) {
      message += `\n💫 Восстановление Ци: ${result.effects.qiRegen}`;
    }

    return NextResponse.json({
      success: true,
      message,
      result: {
        qiSpent: result.qiSpent,
        fatigueGained: result.fatigueGained,
        effects: result.effects,
        effectiveness: result.effectiveness,
        masteryGained: result.masteryGained,
        newMastery,
      },
      character: {
        id: character.id,
        currentQi: newQi,
        fatigue: newFatigue,
        mentalFatigue: newMentalFatigue,
      },
    });

  } catch (error) {
    console.error('Technique use error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
