/**
 * Qi Tick API
 *
 * Batch process Qi effects for accumulated ticks.
 * Called by QiTickProcessor on client side.
 *
 * POST /api/qi/tick
 * Body: { sessionId, characterId, ticks }
 */

import { NextRequest, NextResponse } from 'next/server';
import { TruthSystem } from '@/lib/game/truth-system';
import {
  calculateCoreGenerationRate,
  calculatePassiveQiGain,
  calculatePassiveQiDissipation,
} from '@/lib/game/qi-shared';
import { calculateTotalConductivity } from '@/lib/game/conductivity-system';
import { QI_CONSTANTS } from '@/lib/game/constants';
import { logQiChange } from '@/lib/logger/qi-logger';

// ==================== TYPES ====================

interface QiTickRequest {
  sessionId: string;
  characterId: string;
  ticks: number;
}

interface QiTickResponse {
  success: boolean;
  passiveGain: number;
  dissipation: number;
  finalQi: number;
  ticksProcessed: number;
}

// ==================== POST HANDLER ====================

export async function POST(request: NextRequest): Promise<NextResponse<QiTickResponse>> {
  try {
    const body = await request.json() as QiTickRequest;
    const { sessionId, characterId, ticks } = body;

    // Validation
    if (!sessionId || !characterId) {
      return NextResponse.json(
        { success: false, passiveGain: 0, dissipation: 0, finalQi: 0, ticksProcessed: 0 },
        { status: 400 }
      );
    }

    if (!Number.isFinite(ticks) || ticks <= 0 || ticks > 1440) {
      console.error(`[Qi Tick API] Invalid ticks: ${ticks}`);
      return NextResponse.json(
        { success: false, passiveGain: 0, dissipation: 0, finalQi: 0, ticksProcessed: 0 },
        { status: 400 }
      );
    }

    // Get TruthSystem instance
    const truthSystem = TruthSystem.getInstance();

    // Load session if not in memory
    let sessionState = truthSystem.getSessionState(sessionId);
    if (!sessionState) {
      const loadResult = await truthSystem.loadSession(sessionId);
      if (!loadResult.success || !loadResult.data) {
        return NextResponse.json(
          { success: false, passiveGain: 0, dissipation: 0, finalQi: 0, ticksProcessed: 0 },
          { status: 404 }
        );
      }
      sessionState = loadResult.data;
    }

    const character = sessionState.character;
    let currentQi = character.currentQi;
    const previousQi = currentQi;
    let passiveGain = 0;
    let dissipation = 0;

    // Duration in seconds (1 tick = 1 minute = 60 seconds)
    const durationSeconds = ticks * 60;

    // 1. Passive dissipation if over capacity
    if (currentQi > character.coreCapacity) {
      const conductivity = calculateTotalConductivity(
        character.coreCapacity,
        character.cultivationLevel,
        character.conductivityMeditations || 0
      );

      const dissipationResult = calculatePassiveQiDissipation(
        currentQi,
        character.coreCapacity,
        conductivity,
        durationSeconds
      );

      currentQi = dissipationResult.newQi;
      dissipation = dissipationResult.dissipated;

      if (dissipation > 0) {
        logQiChange(sessionId, characterId, {
          oldQi: previousQi,
          newQi: currentQi,
          source: 'dissipation',
          reason: `batch dissipation over ${durationSeconds}s`,
          details: { dissipated: dissipation, ticks },
        });
      }
    }

    // 2. Passive generation if below capacity
    if (currentQi < character.coreCapacity) {
      const coreGenerationRate = calculateCoreGenerationRate(character.coreCapacity);
      passiveGain = calculatePassiveQiGain(
        currentQi,
        character.coreCapacity,
        coreGenerationRate,
        durationSeconds
      );

      const oldQi = currentQi;
      currentQi = Math.min(
        character.coreCapacity * QI_CONSTANTS.PASSIVE_QI_CAP, // 90% cap
        currentQi + passiveGain
      );
      passiveGain = currentQi - oldQi; // Actual gain after cap

      if (passiveGain > 0) {
        logQiChange(sessionId, characterId, {
          oldQi: oldQi,
          newQi: currentQi,
          source: 'passive',
          reason: `batch generation over ${durationSeconds}s`,
          details: { passiveGain, ticks },
        });
      }
    }

    // Update through TruthSystem
    truthSystem.updateCharacter(sessionId, {
      currentQi: Math.floor(currentQi),
    }, 'qi-tick-api: batch update');

    console.log(
      `[Qi Tick API] Processed ${ticks} ticks: ` +
      `gain=${Math.floor(passiveGain)}, dissipation=${Math.floor(dissipation)}, ` +
      `finalQi=${Math.floor(currentQi)}`
    );

    return NextResponse.json({
      success: true,
      passiveGain: Math.floor(passiveGain),
      dissipation: Math.floor(dissipation),
      finalQi: Math.floor(currentQi),
      ticksProcessed: ticks,
    });

  } catch (error) {
    console.error('[Qi Tick API] Error:', error);
    return NextResponse.json(
      { success: false, passiveGain: 0, dissipation: 0, finalQi: 0, ticksProcessed: 0 },
      { status: 500 }
    );
  }
}
