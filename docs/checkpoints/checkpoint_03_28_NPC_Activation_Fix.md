# Чекпоинт: NPC Активация - ИСПРАВЛЕНО (Фаза 2)

**Дата создания:** 2026-03-28 11:45 UTC
**Статус:** ✅ ИСПРАВЛЕНО
**Проблема:** NPC не двигались и не реагировали на урон - `activeNPCs = 0`

---

## 🎯 ПРИЧИНА ОБРАЩЕНИЯ

Пользователь сообщил:
- "не работают NPC и дополнительно ошибка: NetworkError when attempting to fetch resource"

---

## 🔍 КОРНЕВЫЕ ПРИЧИНЫ

### 1. NPCAIManager проверял только АКТИВНЫХ NPC

**Проблема:** NPC создаются с `isActive: false`, но `updateAllNPCs()` получал только активных!

```javascript
// === БЫЛО (ОШИБКА) ===
const activeNPCs = truthSystem.getActiveNPCs(sessionId);

for (const npc of activeNPCs) {  // ← isActive=false NPC не попадают!
  if (nearbyPlayers.length > 0) {
    if (!npc.isActive) {
      this.activateNPC(sessionId, npc);  // ← Никогда не выполнится!
    }
  }
}
```

**Циклическая ошибка:**
1. NPC создаётся с `isActive: false`
2. `getActiveNPCs()` возвращает только `isActive: true` → пустой массив
3. Цикл не выполняется → NPC не активируются
4. NPC навсегда остаются `isActive: false`

### 2. Отсутствовала константа DEACTIVATION_RADIUS

---

## ✅ ИСПРАВЛЕНИЕ

### Файл: `src/lib/game/ai/server/npc-ai-manager.ts`

```typescript
// === КОНСТАНТЫ ===
const ACTIVATION_RADIUS = 500;
const DEACTIVATION_RADIUS = 800;  // ← ДОБАВЛЕНО

// === ИСПРАВЛЕНО: Получаем ВСЕХ NPC, не только активных ===
const allNPCs = truthSystem.getAllNPCs(sessionId);
const activeNPCs = truthSystem.getActiveNPCs(sessionId);

console.log(`[NPCAIManager] Tick: allNPCs = ${allNPCs.length}, activeNPCs = ${activeNPCs.length}`);

// === ШАГ 1: АКТИВАЦИЯ NPC (проходим по ВСЕМ NPC) ===
for (const npc of allNPCs) {
  if (npc.isDead) continue;
  
  if (playerPosition) {
    const dx = playerPosition.x - npc.x;
    const dy = playerPosition.y - npc.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Если игрок в радиусе активации - активируем NPC
    if (distance <= ACTIVATION_RADIUS) {
      if (!npc.isActive) {
        console.log(`[NPCAIManager] Activating NPC "${npc.name}" - distance: ${distance}`);
        this.activateNPC(sessionId, npc);
      }
    } else if (npc.isActive && distance > DEACTIVATION_RADIUS) {
      this.deactivateNPC(sessionId, npc);
    }
  }
}

// === ШАГ 2: ОБНОВЛЕНИЕ AI (только активные NPC) ===
const nowActiveNPCs = truthSystem.getActiveNPCs(sessionId);

for (const npc of nowActiveNPCs) {
  await this.updateActiveNPC(sessionId, npc, nearbyPlayers);
}
```

---

## 📊 РЕЗУЛЬТАТЫ

### ДО исправления:
```
[NPCAIManager] Tick 1: activeNPCs = 0, playerPos = (700, 600)
[NPCAIManager] Tick 2: activeNPCs = 0, playerPos = (700, 600)
```

### ПОСЛЕ исправления:
```
[NPCAIManager] Tick 1: allNPCs = 3, activeNPCs = 0, playerPos = (700, 600)
[NPCAIManager] Activating NPC "Лун" (TEMP_xxx) - distance: 193px
[NPCAIManager] Activating NPC "Медведь Быстроног" (TEMP_xxx) - distance: 210px
[NPCAIManager] Activating NPC "Фэн" (TEMP_xxx) - distance: 241px
[NPCAIManager] GENERATING CHASE for Лун to (786, 565)
[NPCAIManager] GENERATING CHASE for Медведь Быстроног to (714, 491)
[NPCAIManager] GENERATING CHASE for Фэн to (773, 721)
[NPCAIManager] Broadcast action to location "training_ground"
```

**NPC успешно активируются и преследуют игрока!**

---

## 🔧 СВЯЗАННЫЕ ИСПРАВЛЕНИЯ

1. **TruthSystem.getAllNPCs()** - уже существует, возвращает всех NPC в сессии
2. **TruthSystem.getActiveNPCs()** - возвращает только `isActive: true`
3. **createNPCStateFromTempNPC()** - создаёт NPC с `isActive: false` (правильно!)

---

## 📐 АРХИТЕКТУРА АКТИВАЦИИ NPC

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ПОТОК АКТИВАЦИИ NPC                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. СОЗДАНИЕ NPC                                                            │
│      │                                                                       │
│      ├── SessionNPCManager.initializeLocation()                             │
│      │   └── truthSystem.addNPC(sessionId, npcState)                        │
│      │       └── npc.isActive = false  (по умолчанию)                        │
│      │                                                                       │
│   2. AI TICK (каждую секунду)                                                │
│      │                                                                       │
│      ├── getAllNPCs(sessionId) → все NPC в сессии                            │
│      │                                                                       │
│      ├── for (npc of allNPCs):                                               │
│      │   ├── distance = calculateDistance(npc, player)                       │
│      │   │                                                                   │
│      │   ├── if (distance <= 500 && !npc.isActive):                         │
│      │   │   └── activateNPC() → npc.isActive = true                         │
│      │   │                                                                   │
│      │   └── if (distance > 800 && npc.isActive):                           │
│      │       └── deactivateNPC() → npc.isActive = false                      │
│      │                                                                       │
│      └── getActiveNPCs() → только активные                                   │
│          └── for (npc of activeNPCs):                                        │
│              └── updateActiveNPC() → AI логика                               │
│                                                                              │
│   3. AI ДЕЙСТВИЯ                                                             │
│      │                                                                       │
│      ├── CHASE: если distance <= 200 и aggression > 30                      │
│      │   └── Генерирует точку ближе к игроку                                 │
│      │                                                                       │
│      ├── ATTACK: если distance <= attackRange                               │
│      │   └── Наносит урон игроку                                             │
│      │                                                                       │
│      └── PATROL: если нет игрока в радиусе                                   │
│          └── Случайное движение вокруг стартовой позиции                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ ИЗВЕСТНЫЕ ОШИБКИ

### NetworkError при fetch
**Причина:** Возможно связана с LLM API (ошибки 401)
```
Failed to make API request: Error: API request failed with status 401: {"error":"missing X-Token header"}
[ERROR] [LLM] LLM generation failed: Error: No LLM provider available
```
**Статус:** Не влияет на NPC движение, требует отдельного расследования

---

## 📁 ИЗМЕНЁННЫЕ ФАЙЛЫ

| Файл | Изменение |
|------|-----------|
| `src/lib/game/ai/server/npc-ai-manager.ts` | Исправлена логика активации NPC (проверяем всех, не только активных) |

---

## 🎯 СТАТУС КОМПОНЕНТОВ

| Компонент | Статус |
|-----------|--------|
| NPC создание | ✅ Работает |
| NPC активация при приближении | ✅ ИСПРАВЛЕНО |
| AI действия (chase, attack, patrol) | ✅ Работает |
| BroadcastManager события | ✅ Работает |
| Polling событий клиентом | ✅ Работает |
| SessionId синхронизация | ✅ Работает |
| Визуальное движение на клиенте | ⏳ Требует проверки |

---

*Чекпоинт создан: 2026-03-28 11:45 UTC*
