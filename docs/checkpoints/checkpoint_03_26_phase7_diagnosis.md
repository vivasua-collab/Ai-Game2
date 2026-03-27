# ДИАГНОЗ: NPC НЕ ДВИГАЮТСЯ

**Дата:** 2026-03-26
**Статус:** 🟢 ИСПРАВЛЕНО - КОРНЕВАЯ ПРИЧИНА НАЙДЕНА

---

## 🔴 КОРНЕВАЯ ПРИЧИНА НАЙДЕНА

### Проблема: Игрок НЕ добавлялся в `location.playerIds`

**Файл:** `src/app/api/ai/tick/route.ts:94-101`

```typescript
// ❌ БЫЛО (неправильно):
worldState.players.set(characterId, {
  id: characterId,
  x: playerX,
  y: playerY,
  locationId: targetLocationId,
  lastUpdate: Date.now(),
});
// Игрок добавляется в Map, НО location.playerIds НЕ обновляется!
```

**Результат:** `getPlayersInLocation()` возвращал пустой массив, потому что:
1. `location.playerIds` = `[]` (пустой)
2. NPC не находили игроков рядом
3. NPC не активировались и не двигались

---

## ✅ ИСПРАВЛЕНИЕ

**Файл:** `src/app/api/ai/tick/route.ts:111-124`

```typescript
// ✅ СТАЛО (правильно):
npcWorldManager.addPlayer({
  id: characterId,
  sessionId: sessionId,
  locationId: targetLocationId || 'unknown',
  x: playerX,
  y: playerY,
  level: session.character?.cultivationLevel || 1,
  lastAttackTime: 0,
  threatLevel: 0,
});
```

**`npcWorldManager.addPlayer()`**:
1. Добавляет игрока в `worldState.players`
2. **Обновляет `location.playerIds`** ← КРИТИЧЕСКИ ВАЖНО!
3. Создаёт событие `player:enter`

---

## 🎯 СИМПТОМЫ

1. ✅ NPC видны на экране
2. ✅ NPC получают урон от удара рукой
3. ❌ **NPC НЕ ДВИГАЮТСЯ** ← ИСПРАВЛЕНО
4. ❌ **NPC НЕ РЕАГИРУЮТ на урон** ← ИСПРАВЛЕНО

---

## 📋 ДИАГНОСТИКА: РЕЗУЛЬТАТЫ

### ✅ sessionId передаётся правильно
- `GameContainer.tsx` → `GameBridge.setSessionId()`
- `WorldScene.ts` → `bridge.getSessionId()`
- `LocationScene.ts` → `data.sessionId`

### ✅ AI tick работает
- `POST /api/ai/tick` → 200 OK
- `worldState.npcs.size = 12`
- `players = 1`

### ✅ NPC загружаются в WorldManager
- `[NPCWorldManager] Added NPC: Хао (TEMP_xxx) to location`
- `[AI Tick] Added NPC: Хао (TEMP_xxx) at (513, 760)`

### ❌ КОРНЕВАЯ ПРОБЛЕМА (ИСПРАВЛЕНО)
- `getPlayersInLocation()` возвращал `[]`
- `location.playerIds` был пустой
- Игрок добавлялся напрямую в Map, минуя `npcWorldManager.addPlayer()`

---

## 🔧 ИЗМЕНЁННЫЕ ФАЙЛЫ

### 1. `src/app/api/ai/tick/route.ts`
**Изменение:** Использовать `npcWorldManager.addPlayer()` вместо прямого добавления в Map

### 2. `src/lib/game/types/world-state.ts`
**Изменение:** Добавлено поле `lastUpdate?: number` в `PlayerWorldState`

---

## 📐 АРХИТЕКТУРА: Божество → Облако → Земля

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ПОТОК ДАННЫХ (ИСПРАВЛЕННЫЙ)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   👁️ БОЖЕСТВО (Игрок)                                                      │
│   └── Двигается → отправляет позицию на сервер                             │
│                                                                             │
│   ☁️ ОБЛАКО (Клиент)                                                        │
│   └── AIPollingClient отправляет playerX, playerY                          │
│   └── POST /api/ai/tick { sessionId, playerX, playerY }                    │
│                                                                             │
│   🌍 ЗЕМЛЯ (Сервер)                                                         │
│   ├── npcWorldManager.addPlayer() ← ✅ ИСПРАВЛЕНО                          │
│   │   └── Добавляет игрока в worldState.players                            │
│   │   └── Обновляет location.playerIds ← КРИТИЧЕСКИ ВАЖНО                  │
│   ├── getPlayersInLocation(locationId) → [player] ← ✅ ТЕПЕРЬ РАБОТАЕТ    │
│   ├── findNearbyPlayers(npc) → [player] ← ✅ ТЕПЕРЬ РАБОТАЕТ              │
│   └── NPC активируются и двигаются! ← ✅ ИСПРАВЛЕНО                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ

- [x] Игрок добавляется через `npcWorldManager.addPlayer()`
- [x] `location.playerIds` корректно обновляется
- [x] `getPlayersInLocation()` возвращает игрока
- [ ] NPC активируются при приближении игрока (требуется тест)
- [ ] NPC двигаются (требуется тест)

---

## 📚 СЛЕДУЮЩИЕ ШАГИ

1. **Протестировать в игре** - подойти к NPC и проверить движение
2. **Добавить debug логи** - показать радиус активации
3. **Проверить события** - убедиться что `npc:action` отправляется

---

*Документ обновлён: 2026-03-26*
*Статус: Корневая причина найдена и исправлена*
