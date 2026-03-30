/**
 * Technique Use API Endpoint
 * 
 * Использование изученной техники.
 * - Проверка возможности использования
 * - Списание Ци
 * - Применение эффектов
 * - Проверка дестабилизации (превышение capacity)
 * - Прирост мастерства
 * 
 * ИНТЕГРАЦИЯ TRUTHSYSTEM:
 * - Проверяет наличие сессии в памяти (ПАМЯТЬ ПЕРВИЧНА!)
 * - Списание Ци через TruthSystem.spendQi()
 * - Обновление усталости через TruthSystem.updateFatigue()
 * - Мастерство - критическая операция, сохраняется в БД
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { useTechnique as executeTechnique, canUseTechnique } from '@/lib/game/techniques';
import { TruthSystem } from '@/lib/game/truth-system';
import {
  calculateQiDensity,
  calculateTechniqueCapacity,
  checkDestabilizationWithBaseQi,
  type CombatSubtype,
} from '@/lib/constants/technique-capacity';
import { safeJsonParse } from '@/lib/utils/json-utils';

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

    // === ПРОВЕРКА TRUTHSYSTEM (ПАМЯТЬ ПЕРВИЧНА!) ===
    const truthSystem = TruthSystem.getInstance();
    const memoryState = truthSystem.getSessionByCharacter(characterId);
    
    let sessionId: string | null = null;
    let source: 'memory' | 'database' = 'database';
    
    if (memoryState) {
      sessionId = memoryState.sessionId;
      source = 'memory';
    }

    // Получаем персонажа (из памяти или БД)
    let character;
    if (memoryState) {
      // Формируем объект character из состояния памяти
      character = {
        id: memoryState.character.id,
        name: memoryState.character.name,
        age: memoryState.character.age,
        cultivationLevel: memoryState.character.cultivationLevel,
        cultivationSubLevel: memoryState.character.cultivationSubLevel,
        coreCapacity: memoryState.character.coreCapacity,
        coreQuality: memoryState.character.coreQuality,
        currentQi: memoryState.character.currentQi,
        accumulatedQi: memoryState.character.accumulatedQi,
        strength: memoryState.character.strength,
        agility: memoryState.character.agility,
        intelligence: memoryState.character.intelligence,
        conductivity: memoryState.character.conductivity,
        health: memoryState.character.health,
        fatigue: memoryState.character.fatigue,
        mentalFatigue: memoryState.character.mentalFatigue,
        hasAmnesia: memoryState.character.hasAmnesia,
        knowsAboutSystem: memoryState.character.knowsAboutSystem,
        sectRole: memoryState.character.sectRole,
        currentLocationId: null,
        sectId: memoryState.character.sectId,
      };
    } else {
      // Загружаем из БД
      character = await db.character.findUnique({
        where: { id: characterId },
      });

      if (!character) {
        return NextResponse.json(
          { success: false, error: 'Character not found' },
          { status: 404 }
        );
      }
    }

    // Получаем технику персонажа (всегда из БД - мастерство хранится там)
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
    const tech = characterTechnique.technique;
    const technique = {
      id: tech.id,
      name: tech.name,
      description: tech.description || '',
      type: tech.type as any,
      subtype: tech.subtype as CombatSubtype | undefined,
      element: tech.element as any,
      rarity: tech.rarity as any,
      grade: tech.grade as any,
      level: tech.level,
      minCultivationLevel: tech.minCultivationLevel,
      qiCost: tech.qiCost,
      baseCapacity: tech.baseCapacity ?? 50, // ВАЖНО: добавляем baseCapacity
      fatigueCost: { 
        physical: tech.physicalFatigueCost ?? 0, 
        mental: tech.mentalFatigueCost ?? 0 
      },
      statRequirements: safeJsonParse(tech.statRequirements, undefined),
      statScaling: safeJsonParse(tech.statScaling, undefined),
      effects: safeJsonParse(tech.effects, {}),
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

    // === ПРОВЕРКА ДЕСТАБИЛИЗАЦИИ ===
    // Проверяем, не превышает ли затраченное Ци capacity техники
    const cultivationLevel = character.cultivationLevel;
    const qiDensity = calculateQiDensity(cultivationLevel);
    const capacity = calculateTechniqueCapacity(
      technique.type,
      technique.level,
      characterTechnique.mastery,
      technique.subtype
    );
    
    let isDestabilized = false;
    let backlashDamage = 0;
    
    if (capacity !== null) {
      // Техника имеет capacity (не пассивная)
      const stability = checkDestabilizationWithBaseQi(
        technique.qiCost,
        qiDensity,
        capacity
      );
      
      isDestabilized = stability.isDestabilized;
      backlashDamage = stability.backlashDamage ?? 0;
      
      if (isDestabilized && backlashDamage > 0) {
        // Наносим урон от дестабилизации
        const currentHealth = character.health;
        const newHealth = Math.max(0, currentHealth - backlashDamage);
        
        if (memoryState && sessionId) {
          truthSystem.updateCharacter(sessionId, { health: newHealth });
        } else {
          await db.character.update({
            where: { id: characterId },
            data: { health: newHealth },
          });
        }
      }
    }

    // Рассчитываем новые значения
    const fatigueGained = result.fatigueGained || { physical: 0, mental: 0 };
    const qiSpent = result.qiSpent;
    const newMastery = Math.min(100, characterTechnique.mastery + (result.masteryGained || 0));

    // === ОБНОВЛЕНИЕ ЧЕРЕЗ TRUTHSYSTEM (ПАМЯТЬ ПЕРВИЧНА!) ===
    if (memoryState && sessionId) {
      // Списываем Ци через TruthSystem
      const qiResult = truthSystem.spendQi(sessionId, qiSpent);
      if (!qiResult.success) {
        return NextResponse.json({
          success: false,
          error: qiResult.error || 'Not enough Qi',
        });
      }

      // Обновляем усталость через TruthSystem
      truthSystem.updateFatigue(sessionId, fatigueGained.physical, fatigueGained.mental);

      // Обновляем здоровье если есть лечение
      if (result.effects.healing) {
        const currentHealth = memoryState.character.health;
        truthSystem.updateCharacter(sessionId, {
          health: Math.min(100, currentHealth + result.effects.healing),
        });
      }
    } else {
      // Fallback: обновляем БД напрямую
      const newQi = Math.max(0, character.currentQi - qiSpent);
      const newFatigue = Math.min(100, character.fatigue + fatigueGained.physical);
      const newMentalFatigue = Math.min(100, character.mentalFatigue + fatigueGained.mental);

      await db.character.update({
        where: { id: characterId },
        data: {
          currentQi: newQi,
          fatigue: newFatigue,
          mentalFatigue: newMentalFatigue,
        },
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
    }

    // === МАСТЕРСТВО - КРИТИЧЕСКАЯ ОПЕРАЦИЯ (СОХРАНЯЕМ В БД) ===
    await db.characterTechnique.update({
      where: { id: characterTechnique.id },
      data: { mastery: newMastery },
    });

    // Получаем финальное состояние из памяти
    const finalState = sessionId ? truthSystem.getSessionState(sessionId) : null;
    const finalChar = finalState?.character || {
      currentQi: character.currentQi - qiSpent,
      fatigue: Math.min(100, character.fatigue + fatigueGained.physical),
      mentalFatigue: Math.min(100, character.mentalFatigue + fatigueGained.mental),
    };

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
    
    // Предупреждение о дестабилизации
    if (isDestabilized) {
      message += `\n\n⚠️ ДЕСТАБИЛИЗАЦИЯ! Обратный удар: ${backlashDamage} урона`;
    }

    return NextResponse.json({
      success: true,
      source, // Указываем источник данных
      message,
      result: {
        qiSpent: result.qiSpent,
        fatigueGained: result.fatigueGained,
        effects: result.effects,
        effectiveness: result.effectiveness,
        masteryGained: result.masteryGained,
        newMastery,
        isDestabilized,
        backlashDamage,
      },
      character: {
        id: characterId,
        currentQi: finalChar.currentQi,
        fatigue: finalChar.fatigue,
        mentalFatigue: finalChar.mentalFatigue,
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
