# ФАЗА 6: Удаление NPCWorldManager

**Дата:** 2026-03-27 08:05 UTC
**Дата обновления:** 2026-03-27 13:00 UTC
**Дата завершения:** 2026-03-27 16:45 UTC
**Статус:** ✅ ЗАВЕРШЕНА
**Зависит от:** Фаза 5 (все API routes обновлены)
**Координатор:** `checkpoint_03_27_npc_redesign.md`

---

## 🎯 ЦЕЛЬ ФАЗЫ

Удалить ставший ненужным NPCWorldManager и обновить все импорты.

---

## 🔍 РАСШИРЕННОЕ ИССЛЕДОВАНИЕ

### Поиск всех ссылок на NPCWorldManager

**Команды для поиска:**
```bash
rg "npc-world-manager" src/
rg "NPCWorldManager" src/
rg "getNPCWorldManager" src/
```

### Файлы с импортами NPCWorldManager

| Файл | Что импортируется |
|------|-------------------|
| `src/lib/game/ai/server/npc-ai-manager.ts` | getNPCWorldManager |
| `src/lib/game/types/index.ts` | NPCWorldManager exports |
| `src/lib/game/ai/server/index.ts` | getNPCWorldManager |

### Функционал для миграции

| Метод NPCWorldManager | Перенесён в TruthSystem |
|-----------------------|------------------------|
| `addNPC()` | ✅ `TruthSystem.addNPC()` |
| `getNPC()` | ✅ `TruthSystem.getNPC()` |
| `updateNPC()` | ✅ `TruthSystem.updateNPC()` |
| `removeNPC()` | ✅ `TruthSystem.removeNPC()` |
| `getNPCsInLocation()` | ✅ `TruthSystem.getNPCsByLocation()` |
| `addPlayer()` | ❌ Не нужен (single-player) |
| `getPlayer()` | ❌ Не нужен |
| `updatePlayerPosition()` | ❌ Не нужен |
| `removePlayer()` | ❌ Не нужен |
| `getPlayersInLocation()` | ❌ Не нужен |
| `addLocation()` | ❌ В SessionState.currentLocation |
| `getLocation()` | ❌ В SessionState.currentLocation |
| `getWorldState()` | ❌ `TruthSystem.getSessionState()` |
| `getActiveNPCs()` | ✅ `TruthSystem.getActiveNPCs()` |
| `activateNPC()` | ✅ `TruthSystem.updateNPC(isActive: true)` |
| `deactivateNPC()` | ✅ `TruthSystem.updateNPC(isActive: false)` |
| `getStats()` | ✅ `TruthSystem.getNPCStats()` |

---

## 📁 ФАЙЛЫ ДЛЯ УДАЛЕНИЯ

| Файл | Причина |
|------|---------|
| `src/lib/game/npc-world-manager.ts` | Функционал перенесён в TruthSystem |

---

## 📁 ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ (импорты)

| Файл | Изменение |
|------|-----------|
| `src/lib/game/types/index.ts` | Удалить экспорт NPCWorldManager |
| `src/lib/game/ai/server/index.ts` | Удалить экспорт |

---

## 📐 ПОШАГОВОЕ ВЫПОЛНЕНИЕ

### Шаг 1: Проверка отсутствия ссылок

**Перед удалением убедиться, что нет оставшихся импортов:**

```bash
# Поиск всех импортов NPCWorldManager
rg "npc-world-manager" src/
rg "NPCWorldManager" src/
rg "getNPCWorldManager" src/
```

**Ожидаемый результат:** 0 совпадений

**Если есть совпадения** - вернуться к Фазе 5.

### Шаг 2: Удаление файла

```bash
rm src/lib/game/npc-world-manager.ts
```

### Шаг 3: Обновление types/index.ts

**Было:**
```typescript
// Экспорт менеджеров мира
export { NPCWorldManager, getNPCWorldManager, npcWorldManager } from './npc-world-manager';
```

**Стало:**
```typescript
// NPCWorldManager удалён - используйте TruthSystem.npc*
// NPC функции перенесены в truth-system.ts
```

### Шаг 4: Обновление ai/server/index.ts

**Было:**
```typescript
// Экспорт NPC World Manager
export { NPCWorldManager, getNPCWorldManager } from '../npc-world-manager';
```

**Стало:**
```typescript
// NPCWorldManager удалён
// Используйте TruthSystem для работы с NPC
```

### Шаг 5: Проверка компиляции

```bash
bun run lint
```

**Ожидаемый результат:** 0 errors, 0 warnings

### Шаг 6: Проверка runtime

```bash
# Запустить сервер
bun run dev

# Проверить API
curl http://localhost:3000/api/ai/tick?sessionId=TEST
```

**Ожидаемый результат:**
- Сервер запускается без ошибок
- API отвечает без ошибок

---

## ⚠️ ВОЗМОЖНЫЕ ОШИБКИ

### Ошибка 1: Cannot find module 'npc-world-manager'

**Причина:** Остался импорт где-то в коде
**Решение:** Найти и удалить импорт через `rg "npc-world-manager"`

### Ошибка 2: 'NPCWorldManager' refers to a value, but is being used as a type

**Причина:** Type import остался
**Решение:** Удалить type import

### Ошибка 3: Property 'getWorldState' does not exist

**Причина:** Код пытается использовать NPCWorldManager
**Решение:** Заменить на `TruthSystem.getSessionState()`

### Ошибка 4: Сервер падает при запуске

**Причина:** Динамический импорт NPCWorldManager
**Решение:** Найти через grep и удалить

---

## ✅ ЧЕК-ЛИСТ ВЫПОЛНЕНИЯ

### Перед удалением

- [x] Проверить `rg "NPCWorldManager"` - 0 совпадений в активном коде
- [x] Проверить `rg "npc-world-manager"` - только в самом файле (удалён)
- [x] Проверить `rg "getNPCWorldManager"` - только в самом файле (удалён)

### Удаление

- [x] Удалить `src/lib/game/npc-world-manager.ts`
- [x] Обновить `src/app/api/npc/state/route.ts` - использовать TruthSystem
- [x] Проверить `src/lib/game/types/index.ts` - уже без NPCWorldManager
- [x] Проверить `src/lib/game/ai/server/index.ts` - уже без NPCWorldManager

### Проверка

- [x] `bun run lint` - 0 errors, 3 warnings (pre-existing)
- [x] Сервер запускается без ошибок
- [x] API работает

---

## 📊 ЧТО БЫЛО В NPCWorldManager (ИСТОРИЯ)

Для истории - функционал который был в NPCWorldManager:

| Метод | Перенесён в |
|-------|-------------|
| `addNPC()` | `TruthSystem.addNPC()` |
| `getNPC()` | `TruthSystem.getNPC()` |
| `updateNPC()` | `TruthSystem.updateNPC()` |
| `removeNPC()` | `TruthSystem.removeNPC()` |
| `getNPCsInLocation()` | `TruthSystem.getNPCsByLocation()` |
| `addPlayer()` | Убрано - персонаж в SessionState |
| `getPlayer()` | Убрано - не нужно для single-player |
| `updatePlayerPosition()` | `TruthSystem.activateNearbyNPCs()` |
| `removePlayer()` | Убрано - не нужно для single-player |
| `getPlayersInLocation()` | Убрано - single-player |
| `addLocation()` | В SessionState.currentLocation |
| `getLocation()` | В SessionState.currentLocation |
| `getWorldState()` | `TruthSystem.getSessionState()` |
| `getActiveNPCs()` | `TruthSystem.getActiveNPCs()` |
| `activateNPC()` | `TruthSystem.updateNPC(isActive: true)` |
| `deactivateNPC()` | `TruthSystem.updateNPC(isActive: false)` |
| `getStats()` | `TruthSystem.getNPCStats()` |

---

## 🧪 ТЕСТИРОВАНИЕ ПОСЛЕ ФАЗЫ

### Тест компиляции

```bash
bun run lint
```

**Ожидается:** No issues found

### Тест запуска сервера

```bash
bun run dev
```

**Ожидается:** Сервер запускается без ошибок

### Тест API

```bash
# Инициализация NPC
curl -X POST http://localhost:3000/api/temp-npc \
  -H "Content-Type: application/json" \
  -d '{"action": "init", "sessionId": "TEST", "locationId": "loc1", "config": "village", "playerLevel": 1}'

# AI tick
curl -X POST http://localhost:3000/api/ai/tick \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "TEST", "playerX": 400, "playerY": 300}'
```

**Ожидается:** NPC генерируются и AI работает

---

## ⚠️ РИСКИ

| Риск | Митигация |
|------|-----------|
| Остались скрытые импорты | grep перед удалением |
| Динамические импорты | Проверить runtime |
| Регрессия в тестах | Запустить все тесты |

---

## ✅ КРИТЕРИИ ЗАВЕРШЕНИЯ

- [x] Файл npc-world-manager.ts удалён
- [x] Нет ссылок на NPCWorldManager
- [x] Код компилируется (0 errors, 3 warnings)
- [x] Сервер запускается
- [x] API работает

---

## 📝 ЗАПИСЬ В WORKLOG

```markdown
---
Task ID: phase-6
Agent: Main
Task: Удаление NPCWorldManager

Work Log:
- Проверено отсутствие активных импортов NPCWorldManager
- Обновлён /api/npc/state/route.ts для использования TruthSystem
- Удалён файл src/lib/game/npc-world-manager.ts
- Проверены types/index.ts и ai/server/index.ts - уже чистые

Stage Summary:
- NPCWorldManager полностью удалён
- Весь функционал перенесён в TruthSystem
- Код компилируется (0 errors, 3 warnings)
- Сервер работает стабильно
```

---

*Фаза 6 создана: 2026-03-27 08:05 UTC*
*Расширенное исследование: 2026-03-27 13:00 UTC*
*ЗАВЕРШЕНА: 2026-03-27 16:45 UTC*
