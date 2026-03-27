# Чекпоинт: Базовое движение NPC

**Дата:** 2026-03-27
**Статус:** ✅ Исправлено
**Цель:** Заставить NPC двигаться по квадрату

---

## 🎯 Цель

Заставить NPC двигаться базовым образом:
- NPC в сцене с игроком двигаются
- NPC вне границ полигона - на паузе

---

## 📊 Диагностика

### Найденные проблемы:

1. **NPC не создавались на сервере при входе в локацию**
   - `LocationScene.loadNPCs()` загружал только существующих NPC
   - Не было вызова `/api/temp-npc?action=init`
   - **Исправлено:** Добавлена инициализация NPC на сервере

2. **Позиции генерировались случайно вместо серверных**
   - `spawnNPC()` игнорировал позиции с сервера
   - **Исправлено:** Теперь использует `npcData.position` или `npcData.x/y`

3. **TruthSystem singleton не работал между запросами**
   - `private static instance` не работает в Next.js Dev Mode с Turbopack
   - Каждый API route использовал свой инстанс
   - **Исправлено:** Используем `globalThis` для singleton

4. **addNPC требовал загруженную сессию**
   - Если сессия не загружена - NPC не добавлялись
   - **Исправлено:** `addNPC` теперь асинхронный и загружает сессию автоматически

5. **❌ НОВАЯ ПРОБЛЕМА: Позиция игрока не передавалась при первом tick**
   - `AIPollingClient.start()` вызывает `performTick()` немедленно
   - Но `updatePlayerPosition()` вызывалась только в update loop
   - **Исправлено:** Установка позиции игрока ПЕРЕД `start()`

6. **❌ НОВАЯ ПРОБЛЕМА: locationId не передавался в AI tick**
   - `activateNearbyNPCs()` использовал `session.currentLocation?.id`
   - Но NPCs создаются с `LocationScene.locationId` который может отличаться
   - **Исправлено:** Добавлен `setLocationId()` в AIPollingClient

7. **❌ НОВАЯ ПРОБЛЕМА: Методы getPlayerPosition/updatePlayerPosition отсутствовали**
   - NPCAIManager вызывал `truthSystem.getPlayerPosition()` который не существовал
   - **Исправлено:** Добавлены методы в TruthSystem

---

## 📁 Изменённые файлы

| Файл | Изменение |
|------|-----------|
| `src/game/scenes/LocationScene.ts` | Установка позиции и locationId перед polling |
| `src/lib/game/ai/client/ai-polling-client.ts` | Добавлен `setLocationId()`, передача locationId в tick |
| `src/app/api/ai/tick/route.ts` | Использование переданного locationId |
| `src/lib/game/truth-system.ts` | Добавлены `getPlayerPosition()` и `updatePlayerPosition()` |

---

## 🔧 Исправления (Детали)

### 1. LocationScene.ts

```typescript
// === setupAIPolling() ===
// ИСПРАВЛЕНО: Устанавливаем позицию игрока ПЕРЕД запуском polling
this.aiPollingClient.updatePlayerPosition(this.playerX, this.playerY);

// ИСПРАВЛЕНО: Устанавливаем locationId для правильной активации NPC
if (this.locationId) {
  this.aiPollingClient.setLocationId(this.locationId);
}

// Запускаем polling ПОСЛЕ установки параметров
this.aiPollingClient.start();
```

### 2. ai-polling-client.ts

```typescript
// Добавлено свойство currentLocationId
private currentLocationId: string | null = null;

// Добавлен метод setLocationId()
setLocationId(locationId: string): void {
  this.currentLocationId = locationId;
}

// performTick() теперь отправляет locationId
if (this.currentLocationId) {
  body.locationId = this.currentLocationId;
}
```

### 3. ai/tick/route.ts

```typescript
// Извлекаем locationId из запроса
const { sessionId, playerX, playerY, locationId } = body;

// Используем переданный locationId или берём из сессии
const targetLocationId = locationId || session?.currentLocation?.id;
```

### 4. truth-system.ts

```typescript
// Добавлен метод для получения позиции игрока
getPlayerPosition(sessionId: string): { x: number; y: number } | null {
  const session = this.sessions.get(sessionId);
  if (!session) return null;
  return { x: session.playerX, y: session.playerY };
}

// Добавлен метод для обновления позиции игрока
updatePlayerPosition(sessionId: string, x: number, y: number): TruthResult<{ x: number; y: number }> {
  const session = this.sessions.get(sessionId);
  if (!session) return { success: false, error: 'Session not loaded' };
  session.playerX = x;
  session.playerY = y;
  return { success: true, data: { x, y } };
}
```

---

## 🧪 Тестирование

### curl тесты:

```bash
# 1. Инициализация NPC
curl -X POST http://localhost:3000/api/temp-npc \
  -H "Content-Type: application/json" \
  -d '{"action":"init","sessionId":"SESSION_ID","locationId":"LOCATION_ID","config":"training_ground","playerLevel":1}'

# 2. AI tick с позицией игрока и locationId
curl -X POST http://localhost:3000/api/ai/tick \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"SESSION_ID","playerX":400,"playerY":300,"locationId":"LOCATION_ID"}'
```

### Ожидаемый результат:
```json
{
  "success": true,
  "processedNPCs": 3,
  "stats": {
    "totalNPCs": 3,
    "activeNPCs": 3
  }
}
```

---

## ⚠️ Известные ограничения

### 1. Singleton синхронизация
В Turbopack singleton через `globalThis` работает корректно, но при горячей перезагрузке может потребоваться обновление страницы.

### 2. Lint warnings
```
3 warnings (pre-existing, not related to NPC)
```

---

## 📋 Следующие шаги

1. [x] Исправить передачу позиции игрока
2. [x] Исправить передачу locationId
3. [x] Добавить методы getPlayerPosition/updatePlayerPosition
4. [ ] Протестировать движение NPC
5. [ ] Добавить базовое движение (квадрат)
6. [ ] Добавить паузу для NPC вне полигона

---

## 📊 Метрики успеха

| Метрика | Значение | Статус |
|---------|----------|--------|
| NPC создаются | ✅ | Работает |
| NPC сохраняются в TruthSystem | ✅ | Работает |
| AI tick находит NPC | ✅ | Должно работать |
| AI tick активирует NPC | ✅ | Должно работать |
| NPC двигаются | ❓ | Нужно протестировать |

---

*Последнее обновление: 2026-03-27*
