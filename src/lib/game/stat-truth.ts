/**
 * Stat Delta - Truth System Integration
 * 
 * Provides functions for adding stat development delta to characters.
 * Used by Event Bus handlers for combat delta generation.
 * 
 * @see src/lib/game/stat-development.ts - Core delta functions
 * @see src/types/stat-development.ts - Type definitions
 * @see docs/implementation/phase-9-delta-integration.md
 */

import { db } from '@/lib/db';
import { 
  addDeltaToStats, 
  createInitialStatsDevelopment 
} from './stat-development';
import type { 
  StatName, 
  DeltaSource, 
  StatDevelopment, 
  CharacterStatsDevelopment 
} from '@/types/stat-development';

// ==================== MAIN FUNCTION ====================

/**
 * Add virtual delta to a character's stat
 * 
 * Updates the character's statsDevelopment JSON in the database.
 * Creates initial stats if not present.
 * 
 * @param characterId - Character's database ID
 * @param statName - Target stat (strength, agility, intelligence, vitality)
 * @param amount - Delta amount to add
 * @param source - Source of the delta (for tracking)
 * @returns Result with success status and updated stat
 */
export async function addStatDelta(
  characterId: string,
  statName: StatName,
  amount: number,
  source: DeltaSource
): Promise<{ success: boolean; stat?: StatDevelopment; error?: string }> {
  try {
    // Get character's current statsDevelopment
    const character = await db.character.findUnique({
      where: { id: characterId },
      select: { statsDevelopment: true },
    });

    if (!character) {
      return { success: false, error: 'Character not found' };
    }

    // Parse or create stats
    let stats: CharacterStatsDevelopment;
    try {
      const parsed = JSON.parse(character.statsDevelopment || '{}');
      // Validate structure
      if (!parsed.strength || !parsed.agility || !parsed.intelligence || !parsed.vitality) {
        stats = createInitialStatsDevelopment();
      } else {
        stats = parsed;
      }
    } catch {
      stats = createInitialStatsDevelopment();
    }

    // Add delta
    const { stats: newStats, result } = addDeltaToStats(stats, statName, amount, source);

    // Save to database
    await db.character.update({
      where: { id: characterId },
      data: { statsDevelopment: JSON.stringify(newStats) },
    });

    return { success: true, stat: result.stat };
    
  } catch (error) {
    console.error('[stat-truth] addStatDelta error:', error);
    return { success: false, error: String(error) };
  }
}

// ==================== BATCH OPERATIONS ====================

/**
 * Add delta to multiple stats at once
 * 
 * @param characterId - Character's database ID
 * @param deltas - Array of { statName, amount, source }
 * @returns Updated stats or error
 */
export async function addMultipleStatDeltas(
  characterId: string,
  deltas: Array<{ statName: StatName; amount: number; source: DeltaSource }>
): Promise<{ success: boolean; stats?: CharacterStatsDevelopment; error?: string }> {
  try {
    const character = await db.character.findUnique({
      where: { id: characterId },
      select: { statsDevelopment: true },
    });

    if (!character) {
      return { success: false, error: 'Character not found' };
    }

    let stats: CharacterStatsDevelopment;
    try {
      const parsed = JSON.parse(character.statsDevelopment || '{}');
      if (!parsed.strength) {
        stats = createInitialStatsDevelopment();
      } else {
        stats = parsed;
      }
    } catch {
      stats = createInitialStatsDevelopment();
    }

    // Apply all deltas
    for (const { statName, amount, source } of deltas) {
      const result = addDeltaToStats(stats, statName, amount, source);
      stats = result.stats;
    }

    await db.character.update({
      where: { id: characterId },
      data: { statsDevelopment: JSON.stringify(stats) },
    });

    return { success: true, stats };
    
  } catch (error) {
    console.error('[stat-truth] addMultipleStatDeltas error:', error);
    return { success: false, error: String(error) };
  }
}

// ==================== GETTERS ====================

/**
 * Get character's current stats development
 * 
 * @param characterId - Character's database ID
 * @returns Stats development or error
 */
export async function getStatsDevelopment(
  characterId: string
): Promise<{ success: boolean; stats?: CharacterStatsDevelopment; error?: string }> {
  try {
    const character = await db.character.findUnique({
      where: { id: characterId },
      select: { statsDevelopment: true },
    });

    if (!character) {
      return { success: false, error: 'Character not found' };
    }

    let stats: CharacterStatsDevelopment;
    try {
      const parsed = JSON.parse(character.statsDevelopment || '{}');
      if (!parsed.strength) {
        stats = createInitialStatsDevelopment();
      } else {
        stats = parsed;
      }
    } catch {
      stats = createInitialStatsDevelopment();
    }

    return { success: true, stats };
    
  } catch (error) {
    console.error('[stat-truth] getStatsDevelopment error:', error);
    return { success: false, error: String(error) };
  }
}

// ==================== SLEEP CONSOLIDATION ====================

/**
 * Process sleep consolidation for character
 * 
 * @param characterId - Character's database ID
 * @param sleepHours - Hours of sleep
 * @returns Consolidation result
 */
export async function processSleepConsolidation(
  characterId: string,
  sleepHours: number
): Promise<{ 
  success: boolean; 
  result?: {
    stats: CharacterStatsDevelopment;
    totalAdvancements: number;
    message: string;
  };
  error?: string 
}> {
  try {
    const { processSleep, formatSleepResultMessage } = await import('./stat-development');
    
    const character = await db.character.findUnique({
      where: { id: characterId },
      select: { statsDevelopment: true },
    });

    if (!character) {
      return { success: false, error: 'Character not found' };
    }

    const { updatedStatsData, result, updatedStats } = processSleep(
      character.statsDevelopment || '{}',
      sleepHours
    );

    // Update character with consolidated stats
    await db.character.update({
      where: { id: characterId },
      data: {
        statsDevelopment: updatedStatsData,
        // Update base stats if they advanced
        strength: updatedStats.strength.current,
        agility: updatedStats.agility.current,
        intelligence: updatedStats.intelligence.current,
        vitality: updatedStats.vitality.current,
      },
    });

    return {
      success: true,
      result: {
        stats: updatedStats,
        totalAdvancements: result.totalAdvancements,
        message: formatSleepResultMessage(result),
      },
    };
    
  } catch (error) {
    console.error('[stat-truth] processSleepConsolidation error:', error);
    return { success: false, error: String(error) };
  }
}

// ==================== FATIGUE PENALTY ====================

/**
 * Calculate fatigue penalty for stat development
 * 
 * Higher fatigue = less effective training/development.
 * 
 * Formula:
 * - 0-30% fatigue: no penalty (1.0)
 * - 30-60% fatigue: linear reduction (1.0 -> 0.7)
 * - 60-90% fatigue: steeper reduction (0.7 -> 0.3)
 * - 90-100% fatigue: severe reduction (0.3 -> 0.1)
 * 
 * @param physicalFatigue - Physical fatigue (0-100)
 * @param mentalFatigue - Mental fatigue (0-100)
 * @returns Penalty multiplier (0.1 - 1.0)
 */
export function calculateFatiguePenaltyForDevelopment(
  physicalFatigue: number,
  mentalFatigue: number
): number {
  // Average both fatigues
  const avgFatigue = (physicalFatigue + mentalFatigue) / 2;
  
  // Clamp to 0-100
  const fatigue = Math.max(0, Math.min(100, avgFatigue));
  
  if (fatigue <= 30) {
    // No penalty
    return 1.0;
  } else if (fatigue <= 60) {
    // Linear: 30% -> 0.7 multiplier
    const progress = (fatigue - 30) / 30; // 0-1
    return 1.0 - progress * 0.3;
  } else if (fatigue <= 90) {
    // Steeper: 60% -> 0.3 multiplier
    const progress = (fatigue - 60) / 30; // 0-1
    return 0.7 - progress * 0.4;
  } else {
    // Severe: 90% -> 0.1 multiplier
    const progress = (fatigue - 90) / 10; // 0-1
    return 0.3 - progress * 0.2;
  }
}
