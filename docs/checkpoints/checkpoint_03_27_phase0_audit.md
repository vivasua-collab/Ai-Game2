# ФАЗА 0: Аудит и планирование

**Дата:** 2026-03-27 07:50 UTC
**Статус:** 🔄 В процессе
**Координатор:** `checkpoint_03_27_npc_redesign.md`

---

## 🎯 ЦЕЛЬ ФАЗЫ

Провести полный аудит текущего кода и создать детальный план изменений.

---

## ✅ ЧЕК-ЛИСТ АУДИТА

### 1. TruthSystem (src/lib/game/truth-system.ts)

- [x] Прочитан файл (1222 строки)
- [x] SessionState структура определена
- [x] Singleton работает правильно (globalThis)
- [x] Методы для character, techniques, inventory, location существуют
- [ ] **НУЖНО:** Добавить поддержку NPC

**Текущий SessionState:**
```typescript
interface SessionState {
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

**Требуемый SessionState:**
```typescript
interface SessionState {
  // ... существующие поля ...
  
  // НОВОЕ: NPC
  npcs: Map<string, NPCState>;                      // npcId → NPCState
  npcIndexByLocation: Map<string, Set<string>>;     // locationId → npcIds
}
```

---

### 2. SessionNPCManager (src/lib/game/session-npc-manager.ts)

- [x] Прочитан файл (800 строк)
- [x] Singleton через globalThis
- [x] Хранилище: `Map<sessionId, Map<locationId, TempNPC[]>>`
- [x] Генерация NPC работает
- [x] Методы: `initializeLocation`, `getLocationNPCs`, `updateNPC`, `removeNPC`

**Проблема:** Собственное хранилище, не интегрировано с TruthSystem

**Решение:** 
- Убрать собственное хранилище
- После генерации сохранять в TruthSystem
- Делегировать чтение в TruthSystem

---

### 3. NPCWorldManager (src/lib/game/npc-world-manager.ts)

- [x] Прочитан файл (460 строк)
- [x] Singleton через static instance
- [x] Хранилище: `WorldState.npcs: Map<npcId, NPCState>`
- [x] Методы: `addNPC`, `getNPC`, `updateNPC`, `removeNPC`, `getNPCsInLocation`

**Проблема:** 
- Другой singleton (не globalThis)
- Не синхронизирован с SessionNPCManager
- totalNPCs = 0 всегда

**Решение:** 
- Полностью удалить
- Перенести функционал в TruthSystem

---

### 4. NPCAIManager (src/lib/game/ai/server/npc-ai-manager.ts)

- [x] Прочитан файл (614 строк)
- [x] Singleton через static instance
- [x] Читает NPC из `this.npcWorldManager.getWorldState().npcs`
- [x] AI логика: `updateAllNPCs`, `activateNPC`, `executeAction`

**Проблема:** 
- Читает из NPCWorldManager (который пуст)
- Не имеет доступа к SessionNPCManager

**Решение:**
- Читать из `TruthSystem.getSessionState(sessionId).npcs`
- Требуется передавать sessionId в методы

---

### 5. NPCState Types (src/lib/game/types/npc-state.ts)

- [x] Прочитан файл (300 строк)
- [x] NPCState интерфейс определён полностью
- [x] `createNPCStateFromTempNPC()` - конвертация TempNPC → NPCState
- [x] `createEmptyNPCState()` - фабрика пустого NPC

**Совместимость:** ✅ TempNPC → NPCState конвертация уже есть

---

### 6. API Routes

#### /api/ai/tick/route.ts
- [x] Прочитан
- [x] Вызывает `npcAIManager.updateAllNPCs()`
- [x] Пытается загрузить NPC через `loadNPCsToWorldManager()`
- [x] Проблема: не находит NPC

#### /api/temp-npc/route.ts
- [x] Прочитан
- [x] Генерирует NPC через `sessionNPCManager.initializeLocation()`
- [x] Возвращает NPC клиенту
- [x] Проблема: NPC не попадают в AI

#### /api/npc/state/route.ts
- [ ] Нужно проверить

#### /api/ai/player-position/route.ts
- [x] Упоминается в grep
- [ ] Нужно проверить

---

## 📋 КОНЕЧНЫЙ ПЛАН

### Фаза 1: Расширение SessionState
**Файл:** `checkpoint_03_27_phase1_session_state.md`

1. Добавить `npcs: Map<string, NPCState>` в SessionState
2. Добавить `npcIndexByLocation: Map<string, Set<string>>` в SessionState
3. Обновить `loadSession()` для инициализации NPC Map

### Фаза 2: NPC API в TruthSystem
**Файл:** `checkpoint_03_27_phase2_truth_npc_api.md`

1. Добавить методы:
   - `addNPC(sessionId, npc: NPCState)`
   - `getNPC(sessionId, npcId)`
   - `getNPCsByLocation(sessionId, locationId)`
   - `updateNPC(sessionId, npcId, updates)`
   - `removeNPC(sessionId, npcId)`
   - `activateNearbyNPCs(sessionId, x, y, radius)`
2. Добавить индексы для быстрого поиска

### Фаза 3: Модификация SessionNPCManager
**Файл:** `checkpoint_03_27_phase3_session_manager.md`

1. Удалить `private npcs: Map<...>`
2. Изменить `initializeLocation()`:
   - Генерировать TempNPC
   - Конвертировать в NPCState
   - Сохранять через `TruthSystem.addNPC()`
3. Делегировать чтение в TruthSystem

### Фаза 4: Модификация NPCAIManager
**Файл:** `checkpoint_03_27_phase4_ai_manager.md`

1. Удалить ссылку на `npcWorldManager`
2. Добавить `sessionId` в методы
3. Читать NPC из `TruthSystem.getSessionState(sessionId).npcs`

### Фаза 5: Обновление API Routes
**Файл:** `checkpoint_03_27_phase5_api_routes.md`

1. `/api/ai/tick` - использовать TruthSystem
2. `/api/temp-npc` - делегировать в TruthSystem
3. `/api/npc/*` - обновить источники

### Фаза 6: Удаление NPCWorldManager
**Файл:** `checkpoint_03_27_phase6_cleanup.md`

1. Удалить `src/lib/game/npc-world-manager.ts`
2. Обновить все импорты
3. Удалить из `types/index.ts`

### Фаза 7: Тестирование
**Файл:** `checkpoint_03_27_phase7_testing.md`

1. Проверить генерацию NPC
2. Проверить AI tick
3. Проверить движение NPC
4. Проверить боевые действия

---

## ⚠️ КРИТИЧЕСКИЕ МОМЕНТЫ

### Singleton между workers

**Проблема:** Next.js Dev mode использует Turbopack с workers

**Решение:** TruthSystem уже использует `globalThis`:
```typescript
const globalForTruth = globalThis as unknown as {
  truthSystem: TruthSystemImpl | undefined;
};
```

Это работает! Проверено SessionState.character.

### Совместимость типов

**TempNPC → NPCState:**
```typescript
// Уже существует в types/npc-state.ts
function createNPCStateFromTempNPC(tempNPC: {...}): NPCState
```

### Сохранение в БД

NPC не требуют немедленного сохранения (временные).
При необходимости можно добавить в `saveToDatabase()`.

---

## ✅ КРИТЕРИИ ЗАВЕРШЕНИЯ ФАЗЫ 0

- [x] Все файлы прочитаны и проанализированы
- [x] Проблемы идентифицированы
- [x] План по фазам создан
- [x] Риски оценены
- [ ] Чекпоинты для всех фаз созданы

---

## 📝 СЛЕДУЮЩИЙ ШАГ

Создать чекпоинты для Фаз 1-7.

---

*Фаза 0 создана: 2026-03-27 07:50 UTC*
