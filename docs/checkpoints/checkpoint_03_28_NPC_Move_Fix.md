# Чекпоинт: NPC Двигаются - ИСПРАВЛЕНО

**Дата создания:** 2026-03-28 10:00 UTC
**Статус:** ✅ ИСПРАВЛЕНО
**Проблема:** NPC не двигались на клиенте при работающем сервере

---

## 🎯 ЦЕЛЬ

Заставить NPC двигаться синхронизированно с сервером.

---

## 🔍 КОРНЕВАЯ ПРИЧИНА

**AIPollingClient singleton использовал СТАРЫЙ sessionId от предыдущей сессии!**

### Симптомы:
```
[AI Update] sessionId=cmn8zbmqf004in6d1tq8anui8, ...  ← СТАРЫЙ sessionId
[TruthSystem] Session loaded: cmna31z470002rg0cx1ml3nil  ← ПРАВИЛЬНЫЙ sessionId
[NPCAIManager] Tick 1: activeNPCs = 0  ← NPC не найдены в старой сессии!
```

### Техническое объяснение:

1. `AIPollingClient` - это singleton (`getAIPollingClient()`)
2. При смене сессии:
   - `initialize(newSessionId)` вызывается
   - НО polling уже запущен (`isRunning = true`)
   - `start()` игнорирует повторный запуск
   - **Интервалы используют старый sessionId**

3. NPC создаются в правильной сессии (`cmna31z47000...`)
4. AI tick запрашивается для старой сессии (`cmn8zbmqf...`)
5. NPC не найдены → `activeNPCs = 0` → NPC стоят

---

## ✅ ИСПРАВЛЕНИЕ

### Файл: `src/lib/game/ai/client/ai-polling-client.ts`

```typescript
// === ДО ===
initialize(sessionId: string): void {
  this.sessionId = sessionId;
  if (this.config.autoStart) {
    this.start();  // Игнорируется если isRunning = true
  }
}

// === ПОСЛЕ ===
initialize(sessionId: string): void {
  // ИСПРАВЛЕНО: Если sessionId изменился, останавливаем polling
  if (this.isRunning && this.sessionId !== sessionId) {
    this.log('[AIPollingClient] SessionId changed, stopping previous polling...');
    this.stop();
  }
  
  this.sessionId = sessionId;
  if (this.config.autoStart) {
    this.start();
  }
}

// Добавлен метод reset()
reset(): void {
  this.stop();
  this.sessionId = null;
  this.lastPlayerPosition = null;
  this.currentLocationId = null;
  this.lastTick = 0;
  this.eventHandlers.clear();
}
```

### Добавлена функция сброса singleton:

```typescript
export function resetAIPollingClient(): void {
  if (clientInstance) {
    clientInstance.reset();
    clientInstance = null;
  }
}
```

---

## 📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ

### ДО исправления:
```
[NPCAIManager] Tick 1: activeNPCs = 0, playerPos = (700, 600)
[NPCAIManager] Tick 2: activeNPCs = 0, playerPos = (700, 600)
```

### ПОСЛЕ исправления:
```
[NPCAIManager] Tick 1: activeNPCs = 0, playerPos = (700, 600)  ← Старый sessionId
[NPCAIManager] Tick 2: activeNPCs = 3, playerPos = (700, 600)  ← Правильный sessionId!

[NPCAIManager] GENERATING CHASE for Лун to (786, 565)
[NPCAIManager] GENERATING CHASE for Медведь Быстроног to (714, 491)
[NPCAIManager] GENERATING CHASE for Фэн to (773, 721)
[NPCAIManager] Broadcast action to location "training_ground"
```

**NPC успешно преследуют игрока!**

---

## 📁 ИЗМЕНЁННЫЕ ФАЙЛЫ

| Файл | Изменение |
|------|-----------|
| `src/lib/game/ai/client/ai-polling-client.ts` | Добавлена проверка смены sessionId, метод reset(), функция resetAIPollingClient() |
| `src/lib/game/ai/client/index.ts` | Добавлен экспорт resetAIPollingClient |

---

## 🎯 ЧТО ТЕПЕРЬ РАБОТАЕТ

| Компонент | Статус |
|-----------|--------|
| NPC генерация | ✅ Работает |
| NPC активация при приближении | ✅ Работает |
| AI действия (chase, attack, patrol) | ✅ Работает |
| BroadcastManager события | ✅ Работает |
| Polling событий клиентом | ✅ Работает |
| SessionId синхронизация | ✅ ИСПРАВЛЕНО |

---

## 🔜 СЛЕДУЮЩИЕ ШАГИ

1. **Протестировать визуальное движение NPC** на клиенте
2. **Добавить интерполяцию движения** для плавного визуала
3. **Оптимизировать polling** - возможно увеличить интервал для production
4. **Добавить тесты** для singleton переинициализации

---

## 📐 АРХИТЕКТУРНАЯ СХЕМА

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ПОТОК СОБЫТИЙ (ИСПРАВЛЕНО)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. ИНИЦИАЛИЗАЦИЯ СЕССИИ                                                    │
│      │                                                                       │
│      ├── page.tsx → useGameSessionId() → sessionId (ПРАВИЛЬНЫЙ)              │
│      │                                                                       │
│      ├── GameContainer.setSessionId(sessionId)                              │
│      │   └── GameBridge.setSessionId(sessionId)                              │
│      │                                                                       │
│      └── LocationScene.init({ sessionId })                                   │
│          └── AIPollingClient.initialize(sessionId)                           │
│              │                                                               │
│              ├── isRunning && oldSessionId !== newSessionId?                │
│              │   └── STOP polling ← ИСПРАВЛЕНО!                              │
│              │                                                               │
│              └── START polling with newSessionId                             │
│                                                                              │
│   2. AI TICK                                                                 │
│      │                                                                       │
│      ├── POST /api/ai/update { sessionId: правильный }                       │
│      │                                                                       │
│      ├── TruthSystem.getNPCs(sessionId) → NPC найдены!                       │
│      │                                                                       │
│      └── NPCAIManager.updateAllNPCs()                                        │
│          └── generateProactiveAction() → { type: 'chase', ... }              │
│                                                                              │
│   3. BROADCAST                                                               │
│      │                                                                       │
│      ├── BroadcastManager.broadcastNPCAction()                              │
│      │                                                                       │
│      └── Events → queue[sessionId]                                           │
│                                                                              │
│   4. КЛИЕНТ                                                                  │
│      │                                                                       │
│      ├── GET /api/ai/events?sessionId=...                                    │
│      │                                                                       │
│      ├── AIPollingClient.handleEvent()                                       │
│      │                                                                       │
│      └── NPCSprite.executeServerAction({ type: 'chase', ... })               │
│          └── performServerMove() → NPC ДВИГАЕТСЯ!                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 УРОКИ

1. **Singleton + Stateful = Danger** - Singleton'ы с состоянием требуют careful handling при смене контекста
2. **Всегда проверять sessionId** в логах при отладке многопользовательских систем
3. **Interval'ы не переинициализируются автоматически** - нужно явно останавливать

---

*Чекпоинт создан: 2026-03-28 10:00 UTC*
