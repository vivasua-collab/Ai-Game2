/**
 * API для управления состояниями (баффы/дебаффы)
 * 
 * GET  - Получить все доступные состояния
 * POST - Применить состояние к цели
 * DELETE - Снять состояние с цели
 */

import { NextRequest, NextResponse } from 'next/server';
import { conditionRegistry, conditionManager } from '@/lib/game';
import {
  conditionsApplySchema,
  conditionsDeleteSchema,
  validateOrError,
  validationErrorResponse,
} from '@/lib/validations/game';
import type { ActiveCondition } from '@/types/bonus-registry';

// ============================================================================
// GET - Получить все состояния или состояния цели
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'buff' | 'debuff'
  const id = searchParams.get('id');

  // Получить конкретное состояние
  if (id) {
    const condition = conditionRegistry.get(id);
    if (!condition) {
      return NextResponse.json(
        { error: 'Condition not found', id },
        { status: 404 }
      );
    }
    return NextResponse.json({ condition });
  }

  // Получить по типу
  if (type === 'buff') {
    return NextResponse.json({
      conditions: conditionRegistry.getBuffs(),
    });
  }

  if (type === 'debuff') {
    return NextResponse.json({
      conditions: conditionRegistry.getDebuffs(),
    });
  }

  // Получить все
  return NextResponse.json({
    conditions: conditionRegistry.getAll(),
    buffs: conditionRegistry.getBuffs(),
    debuffs: conditionRegistry.getDebuffs(),
    count: {
      total: conditionRegistry.getAll().length,
      buffs: conditionRegistry.getBuffs().length,
      debuffs: conditionRegistry.getDebuffs().length,
    },
  });
}

// ============================================================================
// POST - Применить состояние
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zod validation
    const validation = validateOrError(conditionsApplySchema, body);
    if (!validation.success) {
      return NextResponse.json(validationErrorResponse(validation.error), { status: 400 });
    }
    
    const {
      targetId,
      conditionId,
      source,
      sourceId,
      value,
      duration,
    } = validation.data;

    // Проверка существования состояния
    const conditionDef = conditionRegistry.get(conditionId);
    if (!conditionDef) {
      return NextResponse.json(
        { error: 'Unknown condition', conditionId },
        { status: 400 }
      );
    }

    // Создаём условную цель (в реальном приложении здесь будет загрузка из БД)
    const target = {
      id: targetId,
      health: 100,
      maxHealth: 100,
      conditions: [] as ActiveCondition[],
    };

    // Применяем состояние
    const result = conditionManager.applyCondition(
      target,
      conditionId,
      source,
      sourceId,
      value,
      duration
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.reason ?? 'Failed to apply condition' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      condition: result.condition,
      removedConditions: result.removedConditions,
      message: `Applied ${conditionDef.name} to ${targetId}`,
    });

  } catch (error) {
    console.error('[Conditions API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Снять состояние
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query params for validation
    const queryParams = {
      targetId: searchParams.get('targetId'),
      conditionId: searchParams.get('conditionId'),
      clearAll: searchParams.get('clearAll'),
      type: searchParams.get('type'),
    };
    
    // Zod validation
    const validation = validateOrError(conditionsDeleteSchema, queryParams);
    if (!validation.success) {
      return NextResponse.json(validationErrorResponse(validation.error), { status: 400 });
    }
    
    const { targetId, conditionId, clearAll, type } = validation.data;

    // Создаём условную цель
    const target = {
      id: targetId,
      health: 100,
      maxHealth: 100,
      conditions: [] as ActiveCondition[],
    };

    // Очистить все состояния
    if (clearAll) {
      const removed = conditionManager.clearAllConditions(target);
      return NextResponse.json({
        success: true,
        removed,
        message: `Cleared all conditions from ${targetId}`,
      });
    }

    // Очистить по типу
    if (type) {
      const removed = conditionManager.removeConditionsByType(target, type);
      return NextResponse.json({
        success: true,
        removed,
        message: `Cleared all ${type}s from ${targetId}`,
      });
    }

    // Снять конкретное состояние
    if (!conditionId) {
      return NextResponse.json(
        { error: 'Missing conditionId or clearAll/type parameter' },
        { status: 400 }
      );
    }

    const removed = conditionManager.removeCondition(target, conditionId);

    if (!removed) {
      return NextResponse.json(
        { error: 'Condition not found on target', conditionId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      removed: conditionId,
      message: `Removed ${conditionId} from ${targetId}`,
    });

  } catch (error) {
    console.error('[Conditions API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
