# ДИАГНОЗ: NPC НЕ ДВИГАЮТСЯ

**Дата:** 2026-03-26
**Статус:** 🟢 ИСПРАВЛЕНО - Требует перезапуска сервера

---

## 🔄 ИЗМЕНЕНИЯ В КОММИТЕ 0441685

### Исправлены ошибки импортов и типы:

1. **`src/app/api/ai/tick/route.ts`**:
   - Добавлен импорт `getNPCWorldManager`
   - Исправлено: `session.character?.id` → `session.characterId`
   - Добавлено поле `lastUpdate` при создании игрока

2. **`src/app/api/ai/events/route.ts`**:
   - Исправлен импорт: `getTruthSystem` → `TruthSystem`
   - Исправлен метод: `getSession` → `getSessionState`

3. **`src/app/api/ai/player-position/route.ts`**:
   - Исправлен импорт: `getTruthSystem` → `TruthSystem`
   - Исправлен метод: `getSession` → `getSessionState`

---

## 🔄 ИЗМЕНЕНИЯ В КОММИТЕ 8f39459

### КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Порядок создания локации

**Проблема:**
- Игрок добавлялся в `worldState.players` ДО создания локации
- `npcWorldManager.addPlayer()` пытался добавить в `location.playerIds`, но локации не существовало!
- Результат: `getPlayersInLocation()` возвращал пустой массив
- NPC AI Manager не видел игроков → NPC не активировались

**Исправление:**
```typescript
// === ШАГ 1: СНАЧАЛА СОЗДАЁМ ЛОКАЦИЮ ЕСЛИ НЕТ ===
// Это критически важно! Без локации игрок не будет добавлен в location.playerIds
const worldState = npcWorldManager.getWorldState();
if (targetLocationId && !worldState.locations.has(targetLocationId)) {
  npcWorldManager.addLocation({...});
}

// === ШАГ 2: ОБНОВЛЯЕМ ПОЗИЦИЮ ИГРОКА ===
// Теперь локация существует, addPlayer() корректно обновит location.playerIds
```

**Файлы изменены:**
- `src/app/api/ai/tick/route.ts` - добавлено создание локации ПЕРЕД операциями с игроком

---

## 🔄 ИЗМЕНЕНИЯ В ВЕРСИИ c1c138f

### Добавлено debug логирование:

1. **`src/app/api/ai/tick/route.ts`**:
   - Логирование состояния `location.playerIds` до/после добавления игрока
   - Логирование количества NPC в `worldState.npcs.size`
   - Использование `npcWorldManager` из `npcAIManager` (единый singleton)

2. **`src/lib/game/ai/server/npc-ai-manager.ts`**:
   - Подробное логирование в `findNearbyPlayers()`
   - Логирование выполнения действий в `executeAction()`

3. **`src/lib/game/ai/client/ai-polling-client.ts`**:
   - Включён debug режим по умолчанию

4. **`src/app/api/ai/events/route.ts`**:
   - Исправлен импорт `TruthSystem` вместо `getTruthSystem`

---

## 🔴 КОРНЕВЫЕ ПРИЧИНЫ (ИСПРАВЛЕНЫ)

### Причина #1: Разные singleton в Next.js dev mode

**Проблема:**
- `route.ts` использует `getNPCWorldManager()` - один singleton
- `npcAIManager` использует `this.npcWorldManager = getNPCWorldManager()` - другой singleton
- В dev mode это РАЗНЫЕ объекты!

**Исправлено:**
```typescript
// route.ts - используем npcWorldManager ИЗ npcAIManager
const npcWorldManager = (npcAIManager as any).npcWorldManager;
```

### Причина #2: Ошибка компиляции в /api/ai/events

**Проблема:**
```typescript
import { getTruthSystem } from '@/lib/game/truth-system';
// getTruthSystem не существует!
```

**Исправлено:**
```typescript
import { TruthSystem } from '@/lib/game/truth-system';
const truthSystem = TruthSystem.getInstance();
```

### Причина #3: Локация создавалась ПОСЛЕ добавления игрока

**Проблема:**
- `npcWorldManager.addPlayer()` пытается добавить в `location.playerIds`
- Но локация не существует → тихо игнорируется
- `getPlayersInLocation()` возвращает [] 
- NPC не активируются

**Исправлено:** Создаём локацию ПЕРЕД добавлением игрока

---

## 🎯 СИМПТОМЫ

1. ✅ NPC видны на экране
2. ✅ NPC получают урон от удара рукой
3. 🔄 **NPC НЕ ДВИГАЮТСЯ** ← Исправлено, требует тестирования
4. 🔄 **NPC НЕ РЕАГИРУЮТ на урон** ← Исправлено, требует тестирования

---

## 📋 ДИАГНОСТИКА: РЕЗУЛЬТАТЫ ТЕСТОВ

### Тест /api/temp-npc
- ✅ Возвращает 4 NPC для sessionId `cmn5s3fco0002p7zwk4zqd14n`
- ✅ locationId = `training_ground`
- ✅ Позиции NPC заданы

### Тест /api/ai/tick
- 🔄 Теперь должен показывать `location.playerIds > 0`
- 🔄 NPC должны активироваться

---

## 🔧 СЛЕДУЮЩИЕ ШАГИ

1. ✅ Исправить порядок создания локации
2. ⏳ Протестировать в игре - проверить логи сервера
3. ⏳ Убедиться что `location.playerIds.length > 0`
4. ⏳ Проверить что NPC активируются и двигаются

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ

- [x] NPC загружаются в WorldManager (`totalNPCs > 0`)
- [x] Локация создаётся ПЕРЕД добавлением игрока
- [ ] location.playerIds содержит ID игрока
- [ ] NPC активируются при приближении игрока
- [ ] NPC двигаются (chase, patrol)
- [ ] NPC реагируют на урон

---

## 📊 АРХИТЕКТУРА

```
AIPollingClient (клиент, 100ms)
    ↓ POST /api/ai/tick
tick/route.ts (сервер)
    1. Создаём локацию если нет
    2. Добавляем игрока в location.playerIds
    3. Загружаем NPC через loadNPCsToWorldManager()
    4. npcAIManager.updateAllNPCs()
       ↓
    findNearbyPlayers(npc) 
       → getPlayersInLocation(npc.locationId)
       → теперь вернёт игрока! ✅
    executeAction() 
       → broadcastManager.broadcastNPCAction()
    ↓ GET /api/ai/events
AIPollingClient.pollEvents()
    ↓ window.dispatchEvent('npc:server-action')
LocationScene.handleServerNPCAction()
    ↓
NPCSprite.executeServerAction()
    → moveTo(), attack(), patrol()
```

---

*Документ обновлён: 2026-03-26*
*Статус: Критическое исправление применено, требуется тестирование*
