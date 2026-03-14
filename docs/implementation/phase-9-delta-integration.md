# PHASE 9: Delta Development Integration

**PRIORITY:** P0
**DEPENDS ON:** Phase 8
**TARGET:** Integrate stat development into combat

---

## DATA FLOW

```
Attack Event → Combat Handler → addStatDelta() → TruthSystem → DB
     ↓
generateXxxDelta()
     ↓
DeltaGeneratingAction
```

---

## EXISTING CODE (USE AS-IS)

**FILE:** `src/lib/game/combat-system.ts`

```typescript
// Already implemented - DO NOT MODIFY
generateAttackDelta(isCritical, weaponType, techniqueMultiplier): CombatDeltaResult
generateBlockedAttackDelta(weaponType): CombatDeltaResult
generateDefenseDelta(isParry): CombatDeltaResult
generateDodgeDelta(): CombatDeltaResult
createCombatDeltaAction(deltaResult, fatigue): DeltaGeneratingAction
```

**FILE:** `src/lib/game/constants.ts`

```typescript
// Already defined - DO NOT MODIFY
STAT_DEVELOPMENT_CONSTANTS.DELTA_SOURCES = {
  combat_hit: 0.001,
  combat_block: 0.0005,
  combat_dodge: 0.0007,
}
```

---

## FILES TO CREATE/MODIFY

### 1. CREATE: `src/lib/game/stat-truth.ts`

```typescript
/**
 * Stat Delta - Truth System Integration
 * @see src/lib/game/stat-development.ts
 * @see src/types/stat-development.ts
 */

import { db } from '@/lib/db';
import { addDeltaToStats, createInitialStatsDevelopment } from './stat-development';
import type { StatName, DeltaSource, StatDevelopment, CharacterStatsDevelopment } from '@/types/stat-development';

export async function addStatDelta(
  characterId: string,
  statName: StatName,
  amount: number,
  source: DeltaSource
): Promise<{ success: boolean; stat?: StatDevelopment; error?: string }> {
  try {
    const character = await db.character.findUnique({
      where: { id: characterId },
      select: { statsDevelopment: true },
    });

    if (!character) return { success: false, error: 'Character not found' };

    let stats: CharacterStatsDevelopment;
    try {
      stats = JSON.parse(character.statsDevelopment || '{}');
      if (!stats.strength) stats = createInitialStatsDevelopment();
    } catch {
      stats = createInitialStatsDevelopment();
    }

    const { stats: newStats, result } = addDeltaToStats(stats, statName, amount, source);

    await db.character.update({
      where: { id: characterId },
      data: { statsDevelopment: JSON.stringify(newStats) },
    });

    return { success: true, stat: result.stat };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
```

---

### 2. MODIFY: `src/lib/game/event-bus/handlers/combat.ts`

**ADD IMPORTS:**
```typescript
import { 
  generateAttackDelta, 
  generateBlockedAttackDelta,
  generateDefenseDelta,
  generateDodgeDelta,
  createCombatDeltaAction,
} from '../../combat-system';
import { addStatDelta } from '../../stat-truth';
import { calculateFatiguePenalty } from '../../stat-development';
```

**ADD TO ATTACK HANDLER:**
```typescript
// After successful attack
if (event.type === 'attack' && result.success) {
  const deltaResult = generateAttackDelta(
    result.isCritical || false,
    event.weaponType,
    event.techniqueMultiplier || 1.0
  );
  
  const fatiguePenalty = calculateFatiguePenalty(
    event.characterFatigue?.physical || 0,
    event.characterFatigue?.mental || 0
  );
  
  await addStatDelta(
    event.characterId,
    deltaResult.targetStat,
    deltaResult.deltaGained * fatiguePenalty,
    deltaResult.source
  );
}

// After successful block
if (event.type === 'block' && result.blocked) {
  const deltaResult = generateDefenseDelta(event.isParry || false);
  await addStatDelta(event.characterId, 'strength', deltaResult.deltaGained, 'combat_block');
}

// After successful dodge
if (event.type === 'dodge' && result.dodged) {
  const deltaResult = generateDodgeDelta();
  await addStatDelta(event.characterId, 'agility', deltaResult.deltaGained, 'combat_dodge');
}
```

---

### 3. CREATE: `src/app/api/character/delta/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const characterId = searchParams.get('characterId');
  if (!characterId) return NextResponse.json({ success: false, error: 'characterId required' }, { status: 400 });

  const character = await db.character.findUnique({
    where: { id: characterId },
    select: { statsDevelopment: true },
  });

  if (!character) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const stats = JSON.parse(character.statsDevelopment || '{}');
  return NextResponse.json({ success: true, statsDevelopment: stats });
}

export async function POST(request: NextRequest) {
  const { characterId, statName, amount, source } = await request.json();
  if (!characterId || !statName || amount === undefined) {
    return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
  }

  const { addStatDelta } = await import('@/lib/game/stat-truth');
  const result = await addStatDelta(characterId, statName, amount, source);
  return NextResponse.json(result);
}
```

---

### 4. MODIFY: Sleep Handler

**FILE:** Find sleep handler in `src/app/api/rest/route.ts` or similar

**ADD:**
```typescript
import { processSleep, formatSleepResultMessage } from '@/lib/game/stat-development';

// In sleep handler:
const { updatedStatsData, result, updatedStats } = processSleep(
  character.statsDevelopment || '{}',
  sleepHours
);

await db.character.update({
  where: { id: characterId },
  data: {
    statsDevelopment: updatedStatsData,
    strength: updatedStats.strength.current,
    agility: updatedStats.agility.current,
    intelligence: updatedStats.intelligence.current,
    vitality: updatedStats.vitality.current,
  },
});
```

---

## VALIDATION

```bash
bun run lint
```

**Test:**
- Attack 10x → check delta via API
- Sleep 8h → check stat increase

---

## RELATED DOCS

- [src/lib/game/stat-development.ts](../../../src/lib/game/stat-development.ts)
- [src/types/stat-development.ts](../../../src/types/stat-development.ts)
- [docs/stat-threshold-system.md](../../stat-threshold-system.md)

---

*END OF PHASE 9*
