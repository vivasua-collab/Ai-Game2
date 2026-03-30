# Checkpoint: NPC AI Movement Fix

**Date:** 2024-03-24
**Status:** ✅ Resolved
**Priority:** High

## Problem

NPCs in LocationScene were not moving despite being spawned correctly. Server logs showed:
```
[NPCAIManager] Tick 127: allNPCs = 9, activeNPCs = 0, playerPos = N/A
```

## Root Cause Analysis

### Issue 1: Player Position Not Transmitted

**Symptoms:**
- `playerPos=(undefined, undefined)` in server logs
- NPCs could not be activated because activation requires player position

**Cause:**
`AIPollingClient.lastPlayerPosition` was `null` when `performTick()` was called, so player position was never sent to server.

**Fix:**
```typescript
// ai-polling-client.ts
// Always send position, use fallback if null
const playerPos = this.lastPlayerPosition || { x: 800, y: 600 };
body.playerX = playerPos.x;
body.playerY = playerPos.y;
```

Also added fallback in `NPCAIManager`:
```typescript
const effectivePlayerPos = playerPosition || { x: 800, y: 600 };
```

### Issue 2: Singleton Not Working in Next.js

**Symptoms:**
```
[BroadcastManager] pollEvents: queue for sessionId = not found
[BroadcastManager] addToQueue: added event ... queue size now: 47
```

Two separate instances of `BroadcastManager` existed:
- One for `NPCAIManager` (adding events)
- One for `/api/ai/events` (reading events)

**Cause:**
Original singleton used `private static instance` which doesn't work reliably in Next.js/Turbopack due to module caching.

**Fix:**
Changed to `globalThis` pattern:
```typescript
const globalForBroadcastManager = globalThis as unknown as {
  broadcastManager: BroadcastManager | undefined;
};

static getInstance(): BroadcastManager {
  if (!globalForBroadcastManager.broadcastManager) {
    globalForBroadcastManager.broadcastManager = new BroadcastManager();
  }
  return globalForBroadcastManager.broadcastManager;
}
```

## Files Modified

1. **src/lib/game/ai/client/ai-polling-client.ts**
   - Added fallback position (800, 600)
   - Added debug logging

2. **src/lib/game/ai/server/npc-ai-manager.ts**
   - Added `effectivePlayerPos` fallback
   - Changed activation logic to always use effective position
   - Added logging for activation count

3. **src/lib/game/ai/server/broadcast-manager.ts**
   - Fixed singleton using `globalThis`
   - Added comprehensive debug logging

## Results

### Before Fix
```
[NPCAIManager] Tick: allNPCs = 9, activeNPCs = 0, playerPos = N/A
[BroadcastManager] pollEvents: queue not found
```

### After Fix
```
[NPCAIManager] After activation: 9 active NPCs
[NPCAIManager] GENERATING ATTACK for NPC "Лин"
[BroadcastManager] pollEvents: returning 5 events from global queue
```

## Architecture Notes

### AI Event Flow (HTTP-only)

```
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  POST /api/ai/update                                        │
│      │                                                      │
│      └─► NPCAIManager.updateAllNPCs()                       │
│               │                                             │
│               ├─► Activate NPCs near player                 │
│               ├─► Generate actions (chase/attack/flee)     │
│               └─► BroadcastManager.endBatch()              │
│                       │                                     │
│                       └─► globalEventQueue.push(events)    │
│                                                             │
│  GET /api/ai/events                                         │
│      │                                                      │
│      └─► BroadcastManager.pollEvents()                      │
│               │                                             │
│               └─► Return & clear globalEventQueue          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (BROWSER)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AIPollingClient                                            │
│      │                                                      │
│      ├─► performTick() every 1000ms                         │
│      │       └─► POST /api/ai/update                        │
│      │               with playerX, playerY                  │
│      │                                                      │
│      └─► pollEvents() every 100ms                           │
│              └─► GET /api/ai/events                         │
│                      └─► window.dispatchEvent(events)       │
│                                                             │
│  LocationScene                                              │
│      │                                                      │
│      └─► handleServerNPCAction()                            │
│              └─► NPCSprite.executeServerAction()            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Singleton Pattern in Next.js

Must use `globalThis` for singletons that need to be shared across modules:

```typescript
// ✅ CORRECT - Works in Next.js
const globalForX = globalThis as unknown as { x: X | undefined };
static getInstance() {
  if (!globalForX.x) globalForX.x = new X();
  return globalForX.x;
}

// ❌ WRONG - Creates separate instances
private static instance: X;
static getInstance() {
  if (!this.instance) this.instance = new X();
  return this.instance;
}
```

## Testing

1. Start dev server: `bun run dev`
2. Open game at http://localhost:3000
3. Click on location to enter LocationScene
4. NPCs should spawn and move within 1-2 seconds
5. Check logs for "GENERATING ATTACK" or "EXECUTE ACTION"

## Related Documentation

- `docs/ARCHITECTURE_cloud.md` - HTTP-only AI architecture
- `src/lib/game/ai/server/npc-ai-manager.ts` - Main AI controller
- `src/lib/game/ai/client/ai-polling-client.ts` - HTTP polling client
