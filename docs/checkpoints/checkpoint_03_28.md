# Checkpoint 2025-03-28 - NPC & Server Issues Investigation

## Issues Reported
1. NPC не двигаются в TEST SCENE
2. NetworkError when attempting to fetch resource
3. Ошибка "Z" на экране

## Investigation Results

### 1. Error "Z" - Dev Server Crash

**Problem:** Чёрный экран с буквой "Z" вместо игры.

**Cause:** В контейнерной среде dev сервер падает из-за SIGHUP когда shell завершается.

**Solution (from docs/INSTALL.md):**
```bash
setsid -f bun run dev > dev.log 2>&1
```

**Status:** ✅ Исправлено - сервер работает на порту 3000

### 2. NPC Not Moving - Session Mismatch

**Problem:** NPC создаются, но не активируются в AI tick.

**Evidence:**
```
[SessionNPCManager] Generated 5 NPCs, saved 5 to TruthSystem
[NPCAIManager] Tick 1: activeNPCs = 0, playerPos = (700, 600)
```

**Root Cause:**
- NPC создаются в одной сессии через `/api/temp-npc`
- AI polling использует sessionId из другого источника
- `TruthSystem.loadSession()` инициализирует `npcs: new Map()` как пустой

**Key Code Locations:**
- `src/lib/game/truth-system.ts:290-296` - пустая инициализация NPC
- `src/lib/game/session-npc-manager.ts:143` - создание NPC
- `src/lib/game/ai/client/ai-polling-client.ts:106-118` - инициализация polling

### 3. NetworkError

**Likely Cause:** Dev сервер был упавшим при попытке fetch.

**Status:** ✅ Исправлено с запуском сервера

## Files Reviewed

1. **docs/INSTALL.md** - документация по ошибке "Z" и запуску
2. **src/lib/game/truth-system.ts** - хранилище сессий и NPC
3. **src/lib/game/ai/server/npc-ai-manager.ts** - AI менеджер
4. **src/lib/game/session-npc-manager.ts** - создание NPC
5. **src/lib/game/preset-npc-spawner.ts** - спавн preset NPC
6. **src/components/game/PhaserGame.tsx** - клиентский код
7. **src/game/scenes/LocationScene.ts** - игровая сцена
8. **src/app/api/ai/update/route.ts** - AI update API
9. **src/app/api/temp-npc/route.ts** - Temp NPC API

## Current Status

| Component | Status |
|-----------|--------|
| Dev Server | ✅ Running on port 3000 |
| NPC Creation | ✅ Working (5 NPCs created) |
| AI Polling | ❌ Not finding NPCs |
| NPC Movement | ❌ Not working |

## Next Steps

1. **Debug sessionId mismatch:**
   - Добавить логи в `loadTrainingNPCs` для отслеживания sessionId
   - Проверить что `AIPollingClient` использует тот же sessionId

2. **Persist NPCs:**
   - Сохранять NPC в БД при создании
   - Загружать NPC из БД в `TruthSystem.loadSession()`

3. **Verify fix:**
   - Проверить что AI tick находит NPC
   - Проверить что NPC двигаются к игроку

## Quick Fix Option

Добавить проверку в `/api/ai/update/route.ts`:

```typescript
// После загрузки сессии
const stats = truthSystem.getNPCStats(sessionId);
if (stats.total === 0 && locationId) {
  // NPCs не найдены - создаём заново
  const { sessionNPCManager } = await import('@/lib/game/session-npc-manager');
  await sessionNPCManager.initializeLocation(sessionId, locationId, 'training_ground', 1);
}
```

## Log Commands

```bash
# Запуск сервера
setsid -f bun run dev > dev.log 2>&1

# Проверка статуса
netstat -tlnp | grep 3000

# Просмотр логов
tail -f dev.log | grep -E "(NPC|sessionId|TrainingNPC)"
```
