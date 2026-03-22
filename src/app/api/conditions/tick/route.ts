/**
 * API для обработки тиков состояний
 * 
 * POST - Обработать тик состояний для цели
 * GET - Получить модификаторы для цели
 */

import { NextRequest, NextResponse } from 'next/server';
import { conditionManager, conditionEffects } from '@/lib/game';
import type { ActiveCondition } from '@/types/bonus-registry';

// ============================================================================
// POST - Обработать тик
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      targetId,
      conditions,
      health,
      maxHealth,
      deltaTime,
      processEffects,
    } = body as {
      targetId: string;
      conditions: ActiveCondition[];
      health: number;
      maxHealth: number;
      deltaTime?: number;
      processEffects?: boolean;
    };

    // Валидация
    if (!targetId || !conditions || health === undefined || maxHealth === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: targetId, conditions, health, maxHealth' },
        { status: 400 }
      );
    }

    // Создаём цель для обработки
    const target = {
      id: targetId,
      health,
      maxHealth,
      conditions: [...conditions],
    };

    // Обрабатываем тик
    const tickResult = conditionManager.tickConditions(
      target,
      deltaTime ?? 1000
    );

    // Если нужны полные эффекты (CombatEntity)
    if (processEffects) {
      const combatEntity = {
        id: targetId,
        health,
        maxHealth,
        conditions: [...conditions],
        baseDamage: 10,
        baseDefense: 5,
        baseSpeed: 1,
      };

      const effectResult = conditionEffects.processTick(
        combatEntity,
        deltaTime ?? 1000
      );

      return NextResponse.json({
        success: true,
        tickResult: {
          targetId,
          totalDamage: effectResult.damage,
          totalHealing: effectResult.healing,
          expiredConditions: effectResult.expiredConditions,
          effects: effectResult.effects,
        },
        entity: {
          health: combatEntity.health,
          maxHealth: combatEntity.maxHealth,
          conditions: combatEntity.conditions,
        },
      });
    }

    return NextResponse.json({
      success: true,
      tickResult: {
        targetId,
        totalDamage: tickResult.totalDamage,
        totalHealing: tickResult.totalHealing,
        expiredConditions: tickResult.expiredConditions,
        tickResults: tickResult.tickResults,
      },
      target: {
        health: target.health,
        maxHealth: target.maxHealth,
        conditions: target.conditions,
      },
    });

  } catch (error) {
    console.error('[Conditions Tick API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Получить модификаторы для цели
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conditionsJson = searchParams.get('conditions');

  if (!conditionsJson) {
    return NextResponse.json(
      { error: 'Missing conditions parameter' },
      { status: 400 }
    );
  }

  try {
    const conditions = JSON.parse(conditionsJson) as ActiveCondition[];

    // Получаем модификаторы
    const modifiers = conditionManager.getActiveModifiers(conditions);

    // Получаем множители
    const target = {
      id: 'temp',
      health: 100,
      maxHealth: 100,
      conditions,
    };

    return NextResponse.json({
      modifiers,
      multipliers: {
        speed: conditionManager.getSpeedMultiplier(target),
        damage: conditionManager.getDamageMultiplier(target),
        defense: conditionManager.getDefenseMultiplier(target),
      },
      status: {
        isStunned: conditionManager.isStunned(target),
        isSlowed: conditionManager.isSlowed(target),
        canUseTechniques: conditionManager.canUseTechniques(target),
      },
    });

  } catch (error) {
    console.error('[Conditions Tick API] Parse error:', error);
    return NextResponse.json(
      { error: 'Invalid conditions JSON' },
      { status: 400 }
    );
  }
}
