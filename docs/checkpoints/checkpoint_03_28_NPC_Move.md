# NPC Movement Investigation - 2025-03-28

## Summary

**Problem:** NPC не двигаются и не реагируют на damage в TEST SCENE.

## Root Cause Analysis

### Issue 1: Dev Server Crash (Ошибка "Z")
- **Symptom:** Чёрный экран с буквой "Z" вместо игры
- **Cause:** Dev сервер падает в контейнерной среде
- **Solution:** Использовать `setsid -f bun run dev > dev.log 2>&1` (см. docs/INSTALL.md)

### Issue 2: NPC не найдены в TruthSystem
- **Symptom:** `[NPCAIManager] Tick 1: activeNPCs = 0`
- **Cause:** NPC создаются в одной сессии, но AI polling использует другой sessionId
- **Analysis:**
  1. `loadTrainingNPCs()` вызывает `/api/temp-npc` с `action: 'init'`
  2. NPC создаются через `SessionNPCManager.initializeLocation()`
  3. NPC добавляются в TruthSystem через `truthSystem.addNPC()`
  4. `[SessionNPCManager] Generated 5 NPCs, saved 5 to TruthSystem` - подтверждает создание
  5. НО `[NPCAIManager] Tick 1: activeNPCs = 0` - NPC не найдены!

### Key Files

```
NPC Creation Flow:
┌─────────────────────────────────────────────────────────────────┐
│ PhaserGame.tsx                                                  │
│   loadTrainingNPCs() → /api/temp-npc { action: 'init' }        │
│                           ↓                                     │
│ /api/temp-npc/route.ts                                         │
│   sessionNPCManager.initializeLocation(sessionId, ...)         │
│                           ↓                                     │
│ session-npc-manager.ts                                         │
│   truthSystem.addNPC(sessionId, npcState)                      │
│                           ↓                                     │
│ truth-system.ts                                                │
│   session.npcs.set(npc.id, npc)  ✅ NPC создан                 │
└─────────────────────────────────────────────────────────────────┘

AI Polling Flow:
┌─────────────────────────────────────────────────────────────────┐
│ LocationScene.ts                                                │
│   this.aiPollingClient.initialize(this.sessionId)              │
│   this.aiPollingClient.start()                                 │
│                           ↓                                     │
│ ai-polling-client.ts                                           │
│   POST /api/ai/update { sessionId, playerX, playerY }          │
│                           ↓                                     │
│ /api/ai/update/route.ts                                        │
│   npcAIManager.updateAllNPCs(sessionId, playerPosition)        │
│                           ↓                                     │
│ npc-ai-manager.ts                                              │
│   truthSystem.getAllNPCs(sessionId) → []  ❌ ПУСТО!            │
└─────────────────────────────────────────────────────────────────┘
```

## Suspected Problems

### 1. Session ID Mismatch
- `loadTrainingNPCs` использует `sessionId` из Zustand store
- `LocationScene` использует `sessionId` из scene data
- Эти значения могут отличаться!

### 2. Session Reload
- `TruthSystem.loadSession()` инициализирует `npcs: new Map()` как ПУСТОЙ
- Если сессия перезагружается между созданием NPC и AI tick, NPC теряются

### 3. Singleton Reset
- TruthSystem singleton может быть сброшен между запросами
- NPC создаются в одном запросе, AI tick в другом

## Recommended Solutions

### Option A: Persist NPCs in Database
```typescript
// В TruthSystem.loadSession() загружать NPC из БД
const dbNPCs = await db.nPC.findMany({ where: { sessionId } });
for (const dbNPC of dbNPCs) {
  const npcState = convertDBToNPCState(dbNPC);
  session.npcs.set(npcState.id, npcState);
}
```

### Option B: Ensure Session Persistence
```typescript
// В AIPollingClient проверить что сессия загружена
const session = truthSystem.getSessionState(sessionId);
if (!session || session.npcs.size === 0) {
  await truthSystem.loadSession(sessionId);
}
```

### Option C: Initialize NPCs in AI Update API
```typescript
// В /api/ai/update проверять и создавать NPC если нужно
const stats = truthSystem.getNPCStats(sessionId);
if (stats.total === 0) {
  await sessionNPCManager.initializeLocation(sessionId, locationId, 'training_ground', 1);
}
```

## Action Items

1. [ ] Добавить логирование sessionId в `loadTrainingNPCs` и `AIPollingClient`
2. [ ] Проверить что sessionId одинаковый во всех вызовах
3. [ ] Добавить persist NPC в БД при создании
4. [ ] Загружать NPC из БД в `TruthSystem.loadSession()`

## Test Commands

```bash
# Запуск dev сервера
setsid -f bun run dev > dev.log 2>&1

# Проверка логов
tail -50 dev.log | grep -E "(NPC|sessionId|TrainingNPC|NPCAIManager)"

# Проверка порта
netstat -tlnp | grep 3000
```

## References

- docs/INSTALL.md - решение ошибки "Z"
- src/lib/game/truth-system.ts - хранение NPC
- src/lib/game/ai/server/npc-ai-manager.ts - AI tick
- src/lib/game/session-npc-manager.ts - создание NPC
