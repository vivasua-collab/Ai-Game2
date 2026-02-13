# Code Duplication Analysis Report
## Frontend-Backend Logic Duplication in ai-game2

**Analysis Date:** 2025-01-10
**Target Directory:** `/home/z/ai-game2-repo`
**Files Analyzed:**
- `src/lib/game/qi-client.ts` (client-side Qi calculations)
- `src/lib/game/qi-system.ts` (server-side Qi calculations)
- `src/hooks/useGame.ts` (client hook with logic)
- `src/app/api/chat/route.ts` (API with logic)

---

## Executive Summary

**Critical Issue:** The codebase has significant logic duplication between client and server for Qi (energy) calculations, breakthrough mechanics, and state management. This creates:
1. **Maintenance burden** - changes must be made in multiple places
2. **Risk of desynchronization** - client and server may produce different results
3. **Bug hiding spots** - identical bugs may exist in both copies
4. **Inconsistent behavior** - some calculations differ slightly between client and server

---

## 1. Duplicated Functions Analysis

### 1.1 COMPLETELY DUPLICATED FUNCTIONS

#### `calculateCoreGenerationRate()` - IDENTICAL

**Location:**
- `qi-client.ts:49-55`
- `qi-system.ts:52-56`

**Code (both files):**
```typescript
export function calculateCoreGenerationRate(character: Character): number {
  const baseGeneration = character.coreCapacity * 0.1;
  return baseGeneration / SECONDS_PER_DAY;
}
```

**Issue:** 100% identical code. Any change must be made twice.

---

#### `calculateBreakthroughRequirements()` - IDENTICAL

**Location:**
- `qi-client.ts:368-395`
- `qi-system.ts:228-263`

**Code (logic identical, minor formatting differences):**
```typescript
export function calculateBreakthroughRequirements(character: Character) {
  const currentLevel = character.cultivationLevel;
  const currentSubLevel = character.cultivationSubLevel;
  
  const requiredFills = currentLevel * 10 + currentSubLevel;
  const currentFills = Math.floor(character.accumulatedQi / character.coreCapacity);
  const fillsNeeded = Math.max(0, requiredFills - currentFills);
  
  return {
    requiredFills,
    currentFills,
    fillsNeeded,
    requiredQi: requiredFills * character.coreCapacity,
    currentAccumulated: character.accumulatedQi,
    canAttempt: currentFills >= requiredFills,
  };
}
```

**Issue:** Same logic duplicated. Return type is duplicate interface definition.

---

#### `attemptBreakthrough()` - NEARLY IDENTICAL

**Location:**
- `qi-client.ts:413-469`
- `qi-system.ts:276-334`

**Differences:**
- Server version adds `getCultivationLevelName()` helper
- Server message includes level name: `🌟 Большой прорыв! Уровень ${newLevel} (${getCultivationLevelName(newLevel)})!`
- Client message: `🌟 Большой прорыв! Уровень ${newLevel}!`

**Risk:** Breakthrough logic could diverge, causing different behaviors.

---

### 1.2 PARTIALLY DUPLICATED FUNCTIONS (WITH DIFFERENCES)

#### `calculateEnvironmentalAbsorptionRate()` - DIFFERENT IMPLEMENTATIONS

**qi-client.ts:62-75:**
```typescript
export function calculateEnvironmentalAbsorptionRate(
  character: Character,
  location: Location | null
): number {
  const conductivity = character.conductivity;
  const qiDensity = location?.qiDensity || 20;
  
  // Client: NO level multiplier
  return (qiDensity * conductivity) / SECONDS_PER_DAY;
}
```

**qi-system.ts:63-78:**
```typescript
export function calculateEnvironmentalAbsorptionRate(
  character: Character,
  location: Location | null
): number {
  const conductivity = character.conductivity;
  const qiDensity = location?.qiDensity || 20;
  
  // Server: HAS levelMultiplier
  const levelInfo = CULTIVATION_LEVELS.find(l => l.level === character.cultivationLevel);
  const levelMultiplier = levelInfo?.conductivityMultiplier || 1;
  
  return (qiDensity * conductivity * levelMultiplier) / SECONDS_PER_DAY;
}
```

**CRITICAL BUG:** Server applies `levelMultiplier` but client does NOT. This means:
- Server calculates HIGHER absorption rates for higher level cultivators
- Client calculates LOWER rates
- **Values will differ between client preview and actual result**

---

#### `calculatePassiveQiGain()` - DIFFERENT RETURN TYPES

**qi-client.ts:218-265** returns `QiCalculationResult`:
```typescript
export function calculatePassiveQiGain(
  character: Character,
  deltaTimeSeconds: number
): QiCalculationResult {
  // Returns detailed object with:
  // - newQi, qiGained, qiLost, overflow, rate
  // - breakdown: { coreGeneration, environmentalAbsorption }
}
```

**qi-system.ts:384-405** returns `number`:
```typescript
export function calculatePassiveQiGain(
  character: Character,
  location: Location | null,  // Different signature!
  deltaTimeSeconds: number
): number {
  // Returns just the number
  return Math.floor(actualGain);
}
```

**Issue:** Different function signatures and return types. Cannot be swapped.

---

#### `calculateTimeToFull()` - SIMILAR WITH DIFFERENCES

**qi-client.ts:271-285:** References undefined `calculateQiRate()` (line 281)
```typescript
export function calculateTimeToFull(...): number {
  // ...
  const rate = calculateQiRate(character, location);  // NOT DEFINED IN FILE
}
```

**qi-system.ts:92-107:** Uses `calculateQiAccumulationRate()`
```typescript
export function calculateTimeToFull(...): number {
  // ...
  const rate = calculateQiAccumulationRate(character, location);
}
```

**Bug:** Client references non-existent function `calculateQiRate()`.

---

### 1.3 DUPLICATED CONSTANTS

**Both files define:**
```typescript
const SECONDS_PER_DAY = 86400;
const PASSIVE_QI_CAP = 0.9;
```

**Issue:** Magic numbers duplicated. If changed, must update both files.

---

## 2. State Management Duplication

### 2.1 Client-Side Local State

**useGame.ts:69-73:**
```typescript
export interface LocalQiState {
  currentQi: number;
  lastUpdate: number;
  pendingDelta: number;
}
```

**useGame.ts:85:**
```typescript
export interface GameState {
  // ...
  localQi: LocalQiState | null;  // Separate from character.currentQi
}
```

### 2.2 Dual State Management

The client maintains TWO sources of truth for Qi:

1. **Server state:** `character.currentQi` (from database)
2. **Local state:** `localQi.currentQi` (from client calculations)

**useGame.ts:265-309** shows the priority system:
```typescript
// === ЛОКАЛЬНЫЙ РАСЧЁТ ЦИ ===
// Приоритет: локальное состояние > данные от сервера
if (data.response.qiDelta && prev.localQi && prev.character) {
  const result = applyQiDelta(
    prev.localQi.currentQi,  // Uses LOCAL value
    qiDelta,
    prev.character.coreCapacity,
  );
  
  updatedLocalQi = {
    currentQi: result.newQi,
    lastUpdate: Date.now(),
  };
}
```

### 2.3 State Synchronization Issues

**Problem:** Server and client both calculate Qi changes:

**Client (useGame.ts):**
- Applies `qiDelta` from server response
- Uses `applyQiDelta()` from qi-client.ts
- Updates `localQi.currentQi`

**Server (route.ts):**
- Calculates meditation/breakthrough results
- Updates database directly
- Returns `qiDelta` to client

**Race Condition Risk:**
1. Client makes request
2. Server calculates and saves to DB
3. Client receives response and applies locally
4. If another request happens before sync, values may diverge

---

## 3. Data Flow Mapping

### 3.1 Current Data Flow

```
[Client Action] 
    ↓
[sendMessage() in useGame.ts]
    ↓
[POST /api/chat] 
    ↓
[route.ts] ─→ [Server Qi Calculations in qi-system.ts]
    ↓              ─→ performMeditation()
    ↓              ─→ attemptBreakthrough()
    ↓              ─→ calculatePassiveQiGain()
[Database Update] ─→ character.currentQi updated
    ↓
[Response with qiDelta]
    ↓
[Client updates localQi] ─→ [Client Qi Calculations in qi-client.ts]
    ↓                           ─→ applyQiDelta()
[UI Shows Result]              ─→ calculateBreakthroughRequirements()
```

### 3.2 Who Calculates What?

| Calculation | Location(s) | Who Runs It |
|-------------|-------------|-------------|
| Core generation rate | qi-client.ts, qi-system.ts | BOTH |
| Environmental absorption | qi-client.ts, qi-system.ts | BOTH (differently!) |
| Passive Qi gain | qi-client.ts, qi-system.ts | BOTH |
| Meditation Qi | qi-system.ts only | SERVER |
| Breakthrough requirements | qi-client.ts, qi-system.ts | BOTH |
| Breakthrough execution | qi-client.ts, qi-system.ts | BOTH |
| Time to full | qi-client.ts, qi-system.ts | BOTH |

---

## 4. Function Classification

### 4.1 CLIENT-ONLY FUNCTIONS (in qi-client.ts)

| Function | Purpose | Should Be Shared? |
|----------|---------|-------------------|
| `applyQiDelta()` | Apply server delta locally | YES - move to shared |
| `validateQiDelta()` | Validate LLM response | YES - move to shared |
| `createQiCost()` | Create cost delta | NO - client helper |
| `createQiGain()` | Create gain delta | NO - client helper |
| `formatQiRate()` | Format for display | NO - UI helper |
| `formatTime()` | Format for display | NO - UI helper |
| `calculateQiOverTime()` | UI preview | YES - share logic |

### 4.2 SERVER-ONLY FUNCTIONS (in qi-system.ts)

| Function | Purpose | Should Be Shared? |
|----------|---------|-------------------|
| `performMeditation()` | Execute meditation | NO - server action |
| `calculateQiCost()` | Action cost lookup | YES - share lookup |
| `getCultivationLevelName()` | Level name lookup | YES - share data |
| `calculateMeditationFatigue()` | Fatigue from meditation | YES - share logic |

### 4.3 DUPLICATED FUNCTIONS (need consolidation)

| Function | Files | Action Required |
|----------|-------|-----------------|
| `calculateCoreGenerationRate()` | both | MOVE to shared module |
| `calculateEnvironmentalAbsorptionRate()` | both | FIX then MOVE to shared |
| `calculateBreakthroughRequirements()` | both | MOVE to shared |
| `attemptBreakthrough()` | both | MOVE to shared |
| `calculateTimeToFull()` | both | FIX BUG then MOVE |
| `calculatePassiveQiGain()` | both | CONSOLIDATE signatures |
| `SECONDS_PER_DAY`, `PASSIVE_QI_CAP` | both | MOVE to shared constants |

---

## 5. Recommended Architecture Changes

### 5.1 Create Shared Qi Module

**New file:** `src/lib/game/qi-shared.ts`

```typescript
/**
 * Shared Qi calculations - used by both client and server
 * SINGLE SOURCE OF TRUTH for all Qi math
 */

// Constants
export const QI_CONSTANTS = {
  SECONDS_PER_DAY: 86400,
  PASSIVE_QI_CAP: 0.9,
  CORE_GENERATION_RATE: 0.1,  // 10% per day
};

// Shared types
export interface QiCalculationResult {
  newQi: number;
  qiGained: number;
  qiLost: number;
  overflow: number;
  rate: number;
  breakdown?: {
    coreGeneration: number;
    environmentalAbsorption: number;
  };
}

// Core calculations (SINGLE IMPLEMENTATION)
export function calculateCoreGenerationRate(coreCapacity: number): number {
  return (coreCapacity * QI_CONSTANTS.CORE_GENERATION_RATE) / QI_CONSTANTS.SECONDS_PER_DAY;
}

export function calculateEnvironmentalAbsorptionRate(
  conductivity: number,
  qiDensity: number,
  levelMultiplier: number = 1
): number {
  return (qiDensity * conductivity * levelMultiplier) / QI_CONSTANTS.SECONDS_PER_DAY;
}

export function calculateBreakthroughRequirements(
  cultivationLevel: number,
  cultivationSubLevel: number,
  accumulatedQi: number,
  coreCapacity: number
) {
  const requiredFills = cultivationLevel * 10 + cultivationSubLevel;
  const currentFills = Math.floor(accumulatedQi / coreCapacity);
  
  return {
    requiredFills,
    currentFills,
    fillsNeeded: Math.max(0, requiredFills - currentFills),
    requiredQi: requiredFills * coreCapacity,
    currentAccumulated: accumulatedQi,
    canAttempt: currentFills >= requiredFills,
  };
}

export function attemptBreakthrough(
  cultivationLevel: number,
  cultivationSubLevel: number,
  coreCapacity: number,
  accumulatedQi: number,
  levelNames: string[] = []
): { success: boolean; newLevel: number; newSubLevel: number; newCoreCapacity: number; qiConsumed: number; message: string } {
  // Single implementation
}
```

### 5.2 Refactor Client to Use Shared

**qi-client.ts (after refactor):**
```typescript
/**
 * Client-side Qi utilities
 * Re-exports shared calculations and adds UI-specific helpers
 */

// Re-export shared calculations
export {
  calculateCoreGenerationRate,
  calculateEnvironmentalAbsorptionRate,
  calculateBreakthroughRequirements,
  QI_CONSTANTS,
} from './qi-shared';

// Client-specific helpers (not duplicated)
export function formatQiRate(rate: number): string { /* ... */ }
export function formatTime(seconds: number): string { /* ... */ }

// Client-specific logic (validation)
export function validateQiDelta(delta: unknown): QiDelta | null { /* ... */ }
export function createQiCost(cost: number, reason: string): QiDelta { /* ... */ }
```

### 5.3 Refactor Server to Use Shared

**qi-system.ts (after refactor):**
```typescript
/**
 * Server-side Qi system
 * Uses shared calculations for game mechanics
 */

import {
  calculateCoreGenerationRate,
  calculateEnvironmentalAbsorptionRate,
  calculateBreakthroughRequirements,
  QI_CONSTANTS,
} from './qi-shared';

// Server-only: meditation execution
export function performMeditation(
  character: Character,
  location: Location | null,
  duration: number,
  type: MeditationType
): MeditationResult {
  // Uses shared functions for calculations
  const coreRate = calculateCoreGenerationRate(character.coreCapacity);
  // ...
}
```

### 5.4 Single Source of Truth for State

**Option A: Server-Authoritative (Recommended)**
- Client NEVER calculates final Qi values
- Client only displays server values
- Client can PREDICT but not AUTHORITATIVELY calculate

**Option B: Client-Predicted with Server Confirmation**
- Client predicts changes immediately
- Server confirms and corrects
- Requires optimistic update + rollback pattern

**Recommended approach:**

```typescript
// useGame.ts
const sendMessage = async (message: string) => {
  // Show immediate feedback (no local calculation)
  setState(prev => ({ ...prev, isPending: true }));
  
  const response = await fetch('/api/chat', { /* ... */ });
  const data = await response.json();
  
  // TRUST server response completely
  setState(prev => ({
    ...prev,
    character: {
      ...prev.character,
      currentQi: data.response.characterState.currentQi,  // Server value
      accumulatedQi: data.response.characterState.accumulatedQi,
    },
    // Remove localQi entirely
  }));
};
```

---

## 6. Priority Bug Fixes

### 6.1 CRITICAL: Environmental Absorption Discrepancy

**Issue:** Server applies `levelMultiplier` but client doesn't.

**Fix:**
```typescript
// qi-shared.ts
export function calculateEnvironmentalAbsorptionRate(
  conductivity: number,
  qiDensity: number,
  cultivationLevel: number  // Pass level, calculate multiplier inside
): number {
  const levelInfo = CULTIVATION_LEVELS.find(l => l.level === cultivationLevel);
  const levelMultiplier = levelInfo?.conductivityMultiplier || 1;
  
  return (qiDensity * conductivity * levelMultiplier) / QI_CONSTANTS.SECONDS_PER_DAY;
}
```

### 6.2 HIGH: Undefined Function in Client

**Issue:** `qi-client.ts:281` calls `calculateQiRate()` which doesn't exist.

**Fix:** Replace with proper function call or remove dead code.

### 6.3 MEDIUM: Signature Inconsistency

**Issue:** `calculatePassiveQiGain()` has different signatures in client vs server.

**Fix:** Standardize on server signature (includes location parameter).

---

## 7. Implementation Roadmap

### Phase 1: Create Shared Module (1-2 days)
1. Create `src/lib/game/qi-shared.ts`
2. Move constants and types
3. Move pure calculation functions
4. Add unit tests for shared functions

### Phase 2: Refactor Duplications (2-3 days)
1. Update `qi-client.ts` to use shared
2. Update `qi-system.ts` to use shared
3. Fix signature inconsistencies
4. Add integration tests

### Phase 3: State Management (2-3 days)
1. Decide on server-authoritative vs client-predicted
2. Remove `localQi` state if server-authoritative
3. Or implement optimistic updates pattern
4. Add sync validation tests

### Phase 4: Cleanup (1 day)
1. Remove dead code
2. Update imports across codebase
3. Update documentation
4. Add migration guide for future changes

---

## 8. Additional Findings

### 8.1 Type Duplication

**Character interface is defined in:**
- `useGame.ts:11-33`
- Implied in other files via `import type { Character } from "@/hooks/useGame"`

**Recommendation:** Move to `src/types/character.ts`

### 8.2 Missing Tests

No test files were found for:
- `qi-client.ts`
- `qi-system.ts`
- Fatigue calculations

**Recommendation:** Add unit tests before refactoring.

### 8.3 Documentation Comments

Both files have similar header comments explaining mechanics:
- Both explain the two Qi sources (core + environment)
- Both explain breakthrough mechanics
- Comments could be consolidated into shared documentation

---

## 9. Summary Table

| Issue | Severity | Effort | Status |
|-------|----------|--------|--------|
| `calculateCoreGenerationRate` duplicated | High | Low | Needs fix |
| `calculateEnvironmentalAbsorptionRate` differs | **Critical** | Medium | **Needs immediate fix** |
| `calculateBreakthroughRequirements` duplicated | High | Low | Needs fix |
| `attemptBreakthrough` duplicated | High | Medium | Needs fix |
| `calculateQiRate()` undefined in client | Medium | Low | Bug |
| Constants duplicated | Low | Low | Needs fix |
| State sync pattern unclear | High | High | Needs design |
| No unit tests | Medium | High | Recommended |
| Types duplicated | Low | Medium | Recommended |

---

**Report Generated By:** Claude AI Analysis
**Files Analyzed:** 4 core files + 6 supporting files
**Total Lines of Code Analyzed:** ~1,500 lines
**Duplicated Functions Found:** 6
**Critical Bugs Found:** 2
