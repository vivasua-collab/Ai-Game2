# ФАЗА 1: Расширение SessionState

**Дата:** 2026-03-27 07:55 UTC
**Дата обновления:** 2026-03-27 12:35 UTC
**Статус:** ✅ ЗАВЕРШЕНА
**Дата завершения:** 2026-03-27 14:10 UTC
**Зависит от:** Фаза 0 (Аудит)
**Координатор:** `checkpoint_03_27_npc_redesign.md`

---

## 🎯 ЦЕЛЬ ФАЗЫ

Добавить поддержку NPC в SessionState без нарушения существующего функционала.

---

## 🔍 РАСШИРЕННОЕ ИССЛЕДОВАНИЕ

### Аудит файла truth-system.ts

**Файл:** `src/lib/game/truth-system.ts`
**Строк:** 1198
**Класс:** `TruthSystemImpl`

#### 1.1 Текущий SessionState (строки 35-59)

```typescript
export interface SessionState {
  sessionId: string;
  characterId: string;
  character: CharacterState;        // ✅ Работает
  worldTime: WorldTimeState;         // ✅ Работает
  worldState: Record<string, unknown>; // ✅ Работает
  currentLocation: LocationState | null; // ✅ Работает
  inventory: InventoryItemState[];   // ✅ Работает
  techniques: TechniqueState[];      // ✅ Работает
  lastSavedAt: Date;
  isDirty: boolean;
  loadedAt: Date;
}
```

**Анализ:**
- Все существующие поля работают корректно
- НЕТ конфликтов с NPC
- NPC можно добавить как новые поля

#### 1.2 Singleton реализация (строки 175-195)

```typescript
class TruthSystemImpl {
  private static instance: TruthSystemImpl;
  
  static getInstance(): TruthSystemImpl {
    if (!this.instance) {
      this.instance = new TruthSystemImpl();
    }
    return this.instance;
  }
}
```

**Анализ:**
- ⚠️ Использует `static instance`, а не `globalThis`
- ⚠️ Может быть проблема в Next.js Dev Mode
- ✅ НО: TruthSystem уже работает (проверено на character)

**Важно:** TruthSystem работает, потому что loadSession() вызывается при каждом запросе если сессия не загружена. NPC будут работать аналогично.

#### 1.3 Метод loadSession() (строки 203-291)

```typescript
async loadSession(sessionId: string): Promise<TruthResult<SessionState>> {
  // 1. Проверяем кэш
  const existingSession = this.sessions.get(sessionId);
  if (existingSession) {
    return { success: true, data: existingSession };
  }
  
  // 2. Загружаем из БД
  // 3. Формируем sessionState
  // 4. Сохраняем в память
  this.sessions.set(sessionId, sessionState);
}
```

**Анализ:**
- Кэширование работает
- При loadSession нужно инициализировать NPC Map-ы
- NPC не требуют загрузки из БД (временные)

#### 1.4 Автосохранение (строки 982-1004)

```typescript
private startAutoSave(sessionId: string): void {
  const timer = setInterval(async () => {
    const session = this.sessions.get(sessionId);
    if (session && session.isDirty) {
      await this.quickSave(sessionId);
    }
  }, this.autoSaveInterval);
}
```

**Анализ:**
- NPC временные, не требуют сохранения в БД
- Можно игнорировать NPC при autosave
- Или добавить опциональное сохранение

### NPCState типы (npc-state.ts)

**Файл:** `src/lib/game/types/npc-state.ts`
**Строк:** 300

#### NPCState интерфейс (строки 71-141)

```typescript
export interface NPCState {
  id: string;
  name: string;
  locationId: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  isActive: boolean;
  aiState: NPCActionType;
  // ... ещё много полей
}
```

**Анализ:**
- Полный интерфейс уже определён
- Нужен импорт в truth-system.ts
- Совместим с TempNPC через конвертацию

---

## 📁 ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

| Файл | Изменение | Риск |
|------|-----------|------|
| `src/lib/game/truth-system.ts` | Добавить NPC поля в SessionState | Низкий |
| `src/lib/game/types/index.ts` | Экспортировать NPCState | Низкий |

---

## 📐 ИЗМЕНЕНИЯ В КОДЕ

### 1. Обновление SessionState интерфейса

**Файл:** `src/lib/game/truth-system.ts`

**Было (строки 35-59):**
```typescript
export interface SessionState {
  sessionId: string;
  characterId: string;
  character: CharacterState;
  worldTime: WorldTimeState;
  worldState: Record<string, unknown>;
  currentLocation: LocationState | null;
  inventory: InventoryItemState[];
  techniques: TechniqueState[];
  lastSavedAt: Date;
  isDirty: boolean;
  loadedAt: Date;
}
```

**Стало:**
```typescript
import type { NPCState } from './types/npc-state';

export interface SessionState {
  sessionId: string;
  characterId: string;
  character: CharacterState;
  worldTime: WorldTimeState;
  worldState: Record<string, unknown>;
  currentLocation: LocationState | null;
  inventory: InventoryItemState[];
  techniques: TechniqueState[];
  
  // === НОВОЕ: NPC ===
  npcs: Map<string, NPCState>;                      // npcId → NPCState
  npcIndexByLocation: Map<string, Set<string>>;     // locationId → Set<npcId>
  npcIndexByActivation: Map<string, Set<string>>;   // 'active' | 'inactive' → Set<npcId>
  
  lastSavedAt: Date;
  isDirty: boolean;
  loadedAt: Date;
}
```

**Изменения:**
- Добавить импорт NPCState
- Добавить 3 новых поля для NPC

### 2. Обновление loadSession()

**Файл:** `src/lib/game/truth-system.ts`
**Метод:** `loadSession()` (строки 203-291)

**Добавить в создание sessionState (после строки 270):**

```typescript
const sessionState: SessionState = {
  sessionId: dbSession.id,
  characterId: dbSession.characterId,
  character: this.mapCharacterToState(dbSession.character),
  worldTime: { ... },
  worldState: JSON.parse(dbSession.worldState || '{}'),
  currentLocation: ...,
  inventory: inventory.map(this.mapInventoryItemToState),
  techniques: techniques.map(this.mapTechniqueToState),

  // === НОВОЕ: Инициализация NPC ===
  npcs: new Map(),
  npcIndexByLocation: new Map(),
  npcIndexByActivation: new Map([
    ['active', new Set()],
    ['inactive', new Set()],
  ]),

  lastSavedAt: new Date(),
  isDirty: false,
  loadedAt: new Date(),
};
```

### 3. Экспорт типа NPCState

**Файл:** `src/lib/game/types/index.ts`

**Добавить:**
```typescript
export type { NPCState, NPCAction, NPCActionType } from './npc-state';
export { createNPCStateFromTempNPC, createEmptyNPCState } from './npc-state';
```

---

## ⚠️ ВОЗМОЖНЫЕ ОШИБКИ

### Ошибка 1: TypeScript - Cannot find name 'NPCState'

**Причина:** Не добавлен импорт в truth-system.ts
**Решение:** Добавить `import type { NPCState } from './types/npc-state';`

### Ошибка 2: Type 'Map<string, NPCState>' is not assignable

**Причина:** NPCState не экспортирован
**Решение:** Добавить экспорт в types/index.ts

### Ошибка 3: Property 'npcs' does not exist on type 'SessionState'

**Причина:** Интерфейс не обновлён
**Решение:** Добавить поля в interface SessionState

### Ошибка 4: Cannot read property 'get' of undefined

**Причина:** Map не инициализирован в loadSession
**Решение:** Добавить инициализацию `npcs: new Map()` в loadSession

---

## ✅ ЧЕК-ЛИСТ ВЫПОЛНЕНИЯ

### Изменения в truth-system.ts

- [x] Добавить импорт `NPCState` из `./types/npc-state`
- [x] Добавить `npcs: Map<string, NPCState>` в SessionState
- [x] Добавить `npcIndexByLocation: Map<string, Set<string>>` в SessionState
- [x] Добавить `npcIndexByActivation: Map<string, Set<string>>` в SessionState
- [x] Инициализировать все Map-ы в `loadSession()`

### Изменения в types/index.ts

- [x] Уже экспортируется (проверено: NPCState, NPCAction, NPCActionType, createNPCStateFromTempNPC, createEmptyNPCState)

---

## 🧪 ТЕСТИРОВАНИЕ ПОСЛЕ ФАЗЫ

### Тест 1: Компиляция

```bash
bun run lint
```

**Ожидается:** 0 errors, 0 warnings

### Тест 2: Запуск сервера

```bash
bun run dev
```

**Ожидается:** Сервер запускается без ошибок

### Тест 3: Загрузка сессии

```bash
curl "http://localhost:3000/api/game/state?sessionId=TEST_SESSION_ID"
```

**Ожидается:**
```json
{
  "success": true,
  "session": {
    "sessionId": "TEST_SESSION_ID",
    ...
  }
}
```

### Тест 4: Проверка NPC Map

В консоли сервера после загрузки сессии должно быть:
```
[TruthSystem] Session loaded: TEST_SESSION_ID
```

И при проверке:
```typescript
const session = truthSystem.getSessionState(sessionId);
console.log(session.npcs instanceof Map); // true
console.log(session.npcs.size); // 0 (пока пусто)
```

---

## ⚠️ РИСКИ

| Риск | Митигация |
|------|-----------|
| Нарушение существующего кода | Только добавление новых полей, без изменения существующих |
| Ошибки типов | Полный тип NPCState уже определён в `types/npc-state.ts` |
| Инициализация в старых сессиях | Map инициализируется при loadSession(), старые сессии не сломаются |
| Регрессия в saveToDatabase | NPC не сохраняются в БД, quickSave() не трогаем |

---

## 📝 ПРИМЕЧАНИЯ

- Эта фаза **только добавляет** поля, не меняет логику
- NPC пока не добавляются, только структура готова
- Следующая фаза добавит методы для работы с NPC
- **Важно:** NPC не требуют сохранения в БД - это временные сущности

---

## ✅ КРИТЕРИИ ЗАВЕРШЕНИЯ

- [x] Код компилируется без ошибок (lint: 0 errors, 3 warnings - pre-existing)
- [x] Сервер запускается
- [x] Сессия загружается без ошибок ([TruthSystem] Session loaded: cmn5s3fco0002p7zwk4zqd14n)
- [x] sessionState.npcs instanceof Map === true
- [x] sessionState.npcs.size === 0 (пока пусто)

---

## 📝 ЗАПИСЬ В WORKLOG

После выполнения фазы добавить в `/home/z/my-project/worklog.md`:

```markdown
---
Task ID: phase-1
Agent: Main
Task: Расширение SessionState для NPC

Work Log:
- Добавлены поля npcs, npcIndexByLocation, npcIndexByActivation в SessionState
- Инициализированы Map-ы в loadSession()
- Добавлены экспорты NPCState в types/index.ts

Stage Summary:
- SessionState готова для хранения NPC
- Код компилируется без ошибок
- Сервер запускается
```

---

*Фаза 1 создана: 2026-03-27 07:55 UTC*
*Расширенное исследование: 2026-03-27 12:35 UTC*
*ЗАВЕРШЕНА: 2026-03-27 14:10 UTC*
