# КООРДИНАТОР: Переделка системы NPC (Вариант A)

**Дата создания:** 2026-03-27 07:50 UTC
**Дата обновления:** 2026-03-27 12:30 UTC
**Статус:** 📋 Планирование завершено - готов к выполнению
**Архитектура:** ARCHITECTURE_cloud.md (новейшая, 2026-03-25)

---

## 🎯 ЦЕЛЬ

Интегрировать NPC в TruthSystem как единый источник истины, согласно принципу:
> 🌍 ЗЕМЛЯ (Сервер - TruthSystem) - Хранит состояние (HP, Qi, NPC, мир)

---

## 📊 РАСШИРЕННЫЙ АУДИТ КОДА (2026-03-27 12:30)

### 1. TruthSystem (truth-system.ts) - 1198 строк

**Текущее состояние SessionState (строки 35-59):**
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

**Ключевые наблюдения:**
- ✅ Singleton работает через `static instance` (строки 175-195)
- ✅ `loadSession()` создаёт SessionState (строки 203-291)
- ✅ Автосохранение реализовано (строки 982-1004)
- ❌ **НЕТ поддержки NPC** - нужно добавить

**Методы, которые нужно добавить:**
- `addNPC(sessionId, npc)` 
- `getNPC(sessionId, npcId)`
- `getNPCsByLocation(sessionId, locationId)`
- `updateNPC(sessionId, npcId, updates)`
- `removeNPC(sessionId, npcId)`
- `activateNearbyNPCs(sessionId, x, y, radius)`

### 2. SessionNPCManager (session-npc-manager.ts) - 800 строк

**Текущее состояние:**
- ✅ Singleton через `globalThis` (строки 50-62)
- ✅ Генерация NPC работает (строки 83-135)
- ✅ Хранение: `Map<sessionId, Map<locationId, TempNPC[]>>`
- ❌ **Собственное хранилище** - не интегрировано с TruthSystem
- ❌ **Возврат TempNPC** - нужен NPCState для AI

**Критичные методы:**
- `initializeLocation()` - генерирует TempNPC[]
- `getLocationNPCs()` - возвращает TempNPC[]
- `updateNPC()` - обновляет TempNPC

### 3. NPCWorldManager (npc-world-manager.ts) - 460 строк

**Текущее состояние:**
- ⚠️ Singleton через `static instance` (строки 48-67) - **НЕ globalThis!**
- ⚠️ Хранение: `WorldState.npcs: Map<npcId, NPCState>`
- ❌ **НЕ синхронизирован с SessionNPCManager**
- ❌ **Всегда пустой** - NPC никогда не добавляются

**Причина проблемы:**
- SessionNPCManager генерирует TempNPC
- NPCAIManager читает из NPCWorldManager
- Они НЕ связаны!

### 4. NPCAIManager (npc-ai-manager.ts) - 614 строк

**Текущее состояние:**
- ✅ Singleton через `static instance` (строки 52-77)
- ❌ Читает из `npcWorldManager.getWorldState().npcs` (строка 88)
- ❌ **totalNPCs = 0 всегда** - источник пуст

**Ключевая логика:**
```typescript
// Строка 88-91
const worldState = this.npcWorldManager.getWorldState();
console.log(`[NPCAIManager] Tick ${this.tickCount}: worldState.npcs.size = ${worldState.npcs.size}`);
// Вывод: worldState.npcs.size = 0
```

### 5. NPCState Types (npc-state.ts) - 300 строк

**Текущее состояние:**
- ✅ NPCState интерфейс определён полностью (строки 71-141)
- ✅ `createNPCStateFromTempNPC()` - конвертация работает (строки 148-238)
- ✅ `createEmptyNPCState()` - фабрика есть (строки 253-300)

**Совместимость:** ✅ TempNPC → NPCState конвертация уже есть

---

## 📐 КОРНЕВАЯ ПРИЧИНА ПРОБЛЕМЫ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    КОРНЕВАЯ ПРИЧИНА                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. SessionNPCManager                                                      │
│      ├── Singleton: globalThis.sessionNPCManager                            │
│      ├── Хранилище: Map<sessionId, Map<locationId, TempNPC[]>>              │
│      ├── Генерация: ✅ Работает                                             │
│      └── NPC: 5 NPC в сессии                                                │
│                                                                             │
│   2. NPCWorldManager                                                        │
│      ├── Singleton: static instance (НЕ globalThis!)                        │
│      ├── Хранилище: WorldState.npcs: Map<npcId, NPCState>                   │
│      ├── Генерация: ❌ НЕТ                                                  │
│      └── NPC: 0 всегда                                                      │
│                                                                             │
│   3. NPCAIManager                                                           │
│      ├── Читает из: NPCWorldManager                                         │
│      └── Результат: 0 NPC для обработки                                     │
│                                                                             │
│   ─────────────────────────────────────────────────────────────────────     │
│   ПРОБЛЕМА: Два singleton-а НЕ связаны!                                     │
│   SessionNPCManager генерирует NPC, но NPCWorldManager пуст.                │
│   NPCAIManager читает из пустого NPCWorldManager.                           │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 ФАЗЫ РЕАЛИЗАЦИИ

| Фаза | Название | Файл чекпоинта | Статус |
|------|----------|----------------|--------|
| 0 | Аудит и планирование | `checkpoint_03_27_phase0_audit.md` | ✅ Завершена |
| 1 | Расширение SessionState | `checkpoint_03_27_phase1_session_state.md` | ✅ Завершена |
| 2 | NPC API в TruthSystem | `checkpoint_03_27_phase2_truth_npc_api.md` | ✅ Завершена |
| 3 | Модификация SessionNPCManager | `checkpoint_03_27_phase3_session_manager.md` | ✅ Завершена |
| 4 | Модификация NPCAIManager | `checkpoint_03_27_phase4_ai_manager.md` | ✅ Завершена |
| 5 | Обновление API Routes | `checkpoint_03_27_phase5_api_routes.md` | ✅ Завершена |
| 6 | Удаление NPCWorldManager | `checkpoint_03_27_phase6_cleanup.md` | ✅ Завершена |
| 7 | Тестирование | `checkpoint_03_27_phase7_testing.md` | ✅ Завершена |

**Все чекпоинты созданы:** 2026-03-27 08:08 UTC
**Расширенное исследование добавлено:** 2026-03-27 12:30 UTC
**Фаза 1 завершена:** 2026-03-27 14:10 UTC
**Фаза 2 завершена:** 2026-03-27 14:25 UTC
**Фаза 3 завершена:** 2026-03-27 14:45 UTC
**Фаза 4 завершена:** 2026-03-27 15:05 UTC
**Фаза 5 завершена:** 2026-03-27 16:30 UTC
**Фаза 6 завершена:** 2026-03-27 16:45 UTC

**Общий объём работы:** ~6-8 часов

---

## 📊 ИТОГИ АУДИТА

### Выявленные проблемы

1. **Два singleton-а для NPC:**
   - SessionNPCManager (генерация + хранение)
   - NPCWorldManager (для AI - всегда пуст)

2. **Синхронизация не работает:**
   - loadNPCsToWorldManager() вызывается, но singleton пуст
   - HTTP запросы не помогают - workers не делят состояние

3. **NPCAIManager читает из пустого хранилища:**
   - `totalNPCs: 0` всегда

### Решение

Интегрировать NPC в TruthSystem:
- TruthSystem уже использует singleton → работает
- Добавить NPC в SessionState
- TruthSystem станет единым источником для AI

---

## 📐 ЗАВИСИМОСТИ ФАЗ

```
Фаза 1 (SessionState) ─┐
                        ├──▶ Фаза 3 (SessionNPCManager)
Фаза 2 (NPC API) ───────┘
                        │
                        ├──▶ Фаза 4 (NPCAIManager)
                        │
                        ├──▶ Фаза 5 (API Routes)
                        │
                        └──▶ Фаза 6 (Cleanup)
                                  │
                                  └──▶ Фаза 7 (Testing)
```

**Порядок выполнения:**
1. Фаза 1 и 2 могут выполняться параллельно
2. Фазы 3-5 зависят от 1 и 2
3. Фаза 6 после 3-5
4. Фаза 7 после всех

---

## ⚠️ РИСКИ И МИТИГАЦИЯ

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Singleton не работает между workers | Высокая | Высокое | TruthSystem уже работает, используем его |
| Регрессия в существующем коде | Средняя | Среднее | Поэтапное тестирование |
| Потеря данных NPC при миграции | Низкая | Высокое | Сохранение в БД при критических операциях |
| Несовместимость типов TempNPC/NPCState | Средняя | Среднее | Конвертация через createNPCStateFromTempNPC |
| Нарушение API контракта | Средняя | Высокое | Сохранить структуру ответов API |

---

## ✅ КРИТЕРИИ УСПЕХА

1. **NPC генерируются и сохраняются в TruthSystem**
2. **NPCAIManager читает NPC из TruthSystem** 
3. **totalNPCs > 0 в API ответе**
4. **NPC двигаются (серверный AI работает)**
5. **Все существующие тесты проходят**
6. **NPCWorldManager удалён**

---

## 📚 ССЫЛКИ НА ДОКУМЕНТАЦИЮ

- [ARCHITECTURE_cloud.md](../ARCHITECTURE_cloud.md) - Активная архитектура
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Базовая архитектура
- [INSTALL.md](../INSTALL.md) - Инструкция по запуску

---

## 📚 ПРЕДЫДУЩИЕ ВНЕДРЕНИЯ AI (ИСТОРИЯ)

Изучены чекпоинты предыдущих внедрений:
- `checkpoint_03_25_AI_server_fix.md` - Исправление WebSocket, урон на сервере
- `checkpoint_03_24_spinal_ai_phase1.md` - Базовый Spinal AI на клиенте
- `checkpoint_03_25_phase3_ai.md` - Миграция AI на сервер

**Ключевые уроки:**
1. Singleton через `static instance` НЕ работает в Next.js Dev Mode
2. Нужно использовать `globalThis` для singleton
3. TruthSystem уже работает правильно - используем его

---

*Координатор создан: 2026-03-27 07:50 UTC*
*Расширенное исследование: 2026-03-27 12:30 UTC*
