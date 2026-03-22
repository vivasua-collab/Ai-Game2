/**
 * API для чит-команд (только для тестирования)
 *
 * POST /api/cheats - Выполнить чит-команду
 * GET /api/cheats - Получить справку по командам
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  executeCheat,
  isCheatsEnabled,
  CHEAT_COMMANDS_HELP,
  type CheatCommand,
} from '@/services/cheats.service';
import { logInfo, logWarn } from '@/lib/logger';
import {
  cheatRequestSchema,
  validateOrError,
  validationErrorResponse,
} from '@/lib/validations/game';

/**
 * GET /api/cheats
 * Получить справку по командам
 */
export async function GET() {
  if (!isCheatsEnabled()) {
    return NextResponse.json({
      enabled: false,
      message: '⛔ Читы отключены. Установите NODE_ENV=development или ENABLE_CHEATS=true',
    });
  }

  return NextResponse.json({
    enabled: true,
    message: '✅ Читы активны',
    help: CHEAT_COMMANDS_HELP,
    commands: [
      { cmd: 'set_level', params: ['level', 'subLevel'], desc: 'Установить уровень культивации' },
      { cmd: 'add_qi', params: ['amount'], desc: 'Добавить Ци' },
      { cmd: 'set_qi', params: ['amount'], desc: 'Установить Ци' },
      { cmd: 'add_stat', params: ['stat', 'amount'], desc: 'Добавить к характеристике' },
      { cmd: 'set_stat', params: ['stat', 'value'], desc: 'Установить характеристику' },
      { cmd: 'add_fatigue', params: ['physical', 'mental'], desc: 'Добавить усталость' },
      { cmd: 'reset_fatigue', params: [], desc: 'Сбросить усталость' },
      { cmd: 'give_technique', params: ['techniqueId'], desc: 'Изучить технику' },
      { cmd: 'gen_techniques', params: ['level', 'count'], desc: 'Сгенерировать пул техник' },
      { cmd: 'add_insight', params: ['amount'], desc: 'Добавить прозрение' },
      { cmd: 'breakthrough', params: [], desc: 'Мгновенный прорыв' },
      { cmd: 'set_time', params: ['hour', 'day', 'month', 'year'], desc: 'Установить время' },
      { cmd: 'add_resources', params: ['points', 'stones'], desc: 'Добавить ресурсы' },
      { cmd: 'add_qi_stone', params: ['quality', 'quantity'], desc: 'Добавить Камень Ци' },
      { cmd: 'full_restore', params: [], desc: 'Полное восстановление' },
      { cmd: 'god_mode', params: [], desc: 'Бессмертие' },
    ],
  });
}

/**
 * POST /api/cheats
 * Выполнить чит-команду
 */
export async function POST(request: NextRequest) {
  if (!isCheatsEnabled()) {
    return NextResponse.json({
      success: false,
      message: '⛔ Читы отключены',
    }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Zod validation
    const validation = validateOrError(cheatRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(validationErrorResponse(validation.error), { status: 400 });
    }
    
    const { command, characterId, params } = validation.data;

    await logInfo('CHEATS', `Executing: ${command}`, { characterId, params });

    const result = await executeCheat(
      command as CheatCommand,
      characterId,
      params
    );

    return NextResponse.json(result);
  } catch (error) {
    await logWarn('CHEATS', 'Cheat API error', { error });
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
    }, { status: 500 });
  }
}
