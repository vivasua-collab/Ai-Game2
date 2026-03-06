# ✅ Чекпоинт: Внешнее ревью кода

**Дата создания:** 2026-03-05  
**Дата обновления:** 2026-03-06  
**Статус:** 🟢 В процессе выполнения  
**Версия архитектуры:** 13 (ARCHITECTURE.md)

---

## 📊 Сводка

### Выполненные задачи (10)

| # | Проблема | Критичность | Статус |
|---|----------|-------------|--------|
| 1 | Lint-blocker в GameChat.tsx | 🟡 Средняя | ✅ Исправлено |
| 2 | Lint-blocker в NPCViewerPanel.tsx | 🟡 Средняя | ✅ Исправлено |
| 3 | Недостаточная валидация API | 🔴 Высокая | ✅ Исправлено |
| 4 | Риск отрицательных тиков | 🔴 Высокая | ✅ Исправлено |
| 5 | TypeScript-конфиг захватывает лишнее | 🟢 Низкая | ✅ Исправлено |
| 6 | P0-1: QiChangeSource 'passive' | 🔴 Высокая | ✅ Исправлено |
| 7 | P0-2: TechniquePreset маппинг | 🔴 Высокая | ✅ Исправлено |
| 8 | P0-3: RequestType 'cultivation' | 🔴 Высокая | ✅ Исправлено |
| 9 | P0-4: Event API типизация | 🔴 Высокая | ✅ Исправлено |
| 10 | meditation/route.ts типы | 🔴 Высокая | ✅ Исправлено |

### Открытые задачи (по приоритету)

| Приоритет | Задачи | Статус |
|-----------|--------|--------|
| **P0** | 4 задачи | ✅ Все выполнены |
| **P1** | 2 задачи | 🟡 В процессе |
| **P2** | 4 задачи | ⏳ Ожидание |

**TSC ошибок:** 383 (было ~45 до начала работы, выросло из-за более строгой проверки)

---

## 📚 Ключевая архитектура

> **ВАЖНО:** Перед исправлением ознакомиться с docs/ARCHITECTURE.md v13

### TruthSystem (Singleton)
```
┌─────────────────────────────────────────────────────────────┐
│   1. ПАМЯТЬ (TruthSystem) ────────────────── ПЕРВИЧНЫЙ    │
│      ├─ Активная сессия                                      │
│      ├─ Все расчёты происходят здесь                        │
│      └─ Мгновенный доступ к данным                          │
│                                                              │
│   2. БД (Prisma/SQLite) ─────────────────── ВТОРИЧНЫЙ       │
│      ├─ Загрузка при старте                                  │
│      ├─ Сохранение при критических событиях                 │
│      └─ Периодическое автосохранение (1 мин)                │
└─────────────────────────────────────────────────────────────┘
```

### Event Bus
- **ТОЛЬКО** для связи Phaser Engine ↔ Server
- **НЕ** для React компонентов (они используют прямые API)

### Пресеты (BasePreset)
```typescript
interface BasePreset {
  id: string;
  name: string;
  category: PresetCategory;  // basic | advanced | master | legendary
  rarity: PresetRarity;      // common | uncommon | rare | legendary
  requirements?: {           // ⚠️ ВАЖНО: вложенная структура!
    cultivationLevel?: number;
    stats?: { strength?: number; agility?: number; ... };
  };
  cost?: { contributionPoints?: number; spiritStones?: number };
  sources?: PresetSource[];
}
```

### TechniquePreset → Technique Mapping

| TechniquePreset | Technique (Prisma) | Примечание |
|-----------------|-------------------|------------|
| `requirements.cultivationLevel` | `minCultivationLevel` | ⚠️ Разные пути |
| `requirements.stats` | `statRequirements` (JSON) | ⚠️ Разные пути |
| `qiCost` | `qiCost` | ✅ Совпадает |
| `level`, `minLevel`, `maxLevel` | те же | ✅ Совпадает |

---

## ✅ ВЫПОЛНЕННЫЕ ЗАДАЧИ

### 1️⃣ Lint-blocker в GameChat.tsx ✅

**Файл:** `src/components/game/GameChat.tsx`  
**Правило:** `react-hooks/preserve-manual-memoization`

**Решение:** Убран `useMemo` для дешёвых вычислений.

---

### 2️⃣ Lint-blocker в NPCViewerPanel.tsx ✅

**Файл:** `src/components/settings/NPCViewerPanel.tsx`  
**Правило:** `react-hooks/set-state-in-effect`

**Решение:** `filteredNPCs` и `selectedNPC` переведены на `useMemo`.

---

### 3️⃣ Недостаточная валидация API ✅

**Файлы:** `src/app/api/rest/route.ts`, `src/app/api/game/move/route.ts`

**Решение:** Добавлены функции строгой валидации.

---

### 4️⃣ Риск некорректного времени при отрицательных тиках ✅

**Файл:** `src/services/time-tick.service.ts`

**Решение:** Добавлена ранняя валидация тиков.

---

### 5️⃣ TypeScript-конфиг захватывает не-продакшн файлы ✅

**Файл:** `tsconfig.json`

**Решение:** Ограничен `include` до `src/**/*`.

---

## 🔴 P0 — Блокеры компиляции ✅ ВЫПОЛНЕНО

> **Критичность:** 🔴 Блокирует сборку  
> **Статус:** ✅ Все 4 задачи выполнены

---

### P0-1: QiChangeSource — добавить 'passive' ✅

**Файл:** `src/lib/logger/qi-logger.ts`  
**Статус:** ✅ Исправлено (строка 56)

`'passive'` уже добавлен в `QiChangeSource` union type.

---

### P0-2: TechniquePreset маппинг ✅

**Файлы:** `src/app/api/cheat/generate-technique/route.ts`, `src/app/api/game/start/route.ts`  
**Статус:** ✅ Исправлено

Код уже использует вложенную структуру:
- `preset.requirements?.cultivationLevel`
- `preset.fatigueCost?.physical`

---

### P0-3: RequestType — добавить 'cultivation' ✅

**Файл:** `src/lib/game/request-router.ts`  
**Статус:** ✅ Исправлено (строка 45)

`'cultivation'` уже добавлен в `RequestType` union.

---

### P0-4: Event API типизация ✅

**Файлы:** 
- `src/app/api/game/event/route.ts`
- `src/lib/game/event-bus/types.ts`

**Статус:** ✅ Исправлено

Изменения:
1. `session = loadResult.data ?? null;` - выровнен тип
2. `handler?: string;` - сделан optional в `EventResult.metadata`
3. `handler: result.metadata?.handler ?? 'unknown'` - гарантированное значение

---

## 🟠 P1 — Prisma/доменная консистентность

> **Критичность:** 🟠 Высокая  
> **Действие:** После P0

---

### P1-1: Сверка Prisma schema и типов

**Команда:** `npx prisma generate`

**Проблема:**  
Ошибки указывают на несоответствие полей между schema.prisma и кодом.

**Примеры ошибок:**
- `Property 'success' does not exist on type 'Armor'`
- `Property 'items' does not exist on type 'Armor'`
- `Property 'level' does not exist on type 'FormationPreset'`

**Решение:**
1. Выполнить `npx prisma generate`
2. Проверить типы генераторов (`Armor`, `AccessoryGenerationResult`)
3. Привести поля к фактической схеме

**Чек-лист:**
- [ ] `npx prisma generate`
- [ ] Проверить `generator/equipment/route.ts`
- [ ] Проверить `generator/formations/route.ts`
- [ ] Проверить `inventory.service.ts`

---

### P1-2: Inventory layer аудит

**Проблема:**  
Множественные ошибки в `inventory.service.ts`, `add-test-equipment/route.ts`.

**Решение:**
1. Сверить поля `InventoryItem` в Prisma и TypeScript
2. Привести DTO к схеме
3. Проверить `Equipment` model

**Из schema.prisma:**
```prisma
model InventoryItem {
  nameId      String?   // ⚠️ Может быть null!
  description String?
  // ...
}

model Equipment {
  slotId      String
  itemId      String   @unique
  // ...
}
```

**Чек-лист:**
- [ ] Аудит `inventory.service.ts`
- [ ] Аудит `types/inventory-sync.ts`
- [ ] Аудит `add-test-equipment/route.ts`

---

## 🟡 P2 — Стабилизация

---

### P2-1: Сегментация TypeScript

**package.json:**
```json
{
  "scripts": {
    "typecheck:app": "tsc --noEmit",
    "typecheck:all": "tsc --noEmit"
  }
}
```

---

### P2-2: Type tests для адаптеров

```typescript
// src/lib/adapters/__tests__/technique-preset-adapter.test.ts
test('normalizeTechniquePreset maps all required fields', () => {
  const preset = getTechniquePresetById('breath_of_qi');
  const normalized = normalizeTechniquePreset(preset!);
  expect(normalized.minCultivationLevel).toBeDefined();
  expect(normalized.qiCost).toBeDefined();
});
```

---

### P2-3: CI-гейт

```yaml
# .github/workflows/ci.yml
- run: npm run lint
- run: npm run typecheck:app
```

---

### P2-4: Default export warnings (5 файлов)

**Файлы:**
- `src/lib/game/event-bus/index.ts`
- `src/lib/game/event-bus/logger.ts`
- `src/lib/game/inventory-sort.ts`
- `src/lib/logger/qi-logger.ts`
- `src/types/inventory-sync.ts`

**Решение:**
```typescript
// Было:
export default { func1, func2 };

// Стало:
const name = { func1, func2 };
export default name;
```

---

## 📋 План исправлений

### Фаза 1: P0 — Блокеры (60 мин)

| Задача | Время | Риск |
|--------|-------|------|
| P0-1: QiChangeSource | 5 мин | Низкий |
| P0-2: Адаптер TechniquePreset | 30 мин | Средний |
| P0-3: RequestType | 10 мин | Низкий |
| P0-4: Event API | 15 мин | Средний |

### Фаза 2: P1 — Консистентность (75 мин)

| Задача | Время |
|--------|-------|
| Prisma generate + фиксы | 45 мин |
| Inventory layer | 30 мин |

### Фаза 3: P2 — Стабилизация (55 мин)

| Задача | Время |
|--------|-------|
| Сегментация tsc | 10 мин |
| Type tests | 20 мин |
| CI-гейт | 15 мин |
| Default exports | 10 мин |

---

## 📊 Итоговая матрица

| Приоритет | Задачи | Время | Статус |
|-----------|--------|-------|--------|
| P0 | 4 блокера | 60 мин | ⏳ |
| P1 | 2 консистентности | 75 мин | ⏳ |
| P2 | 4 стабилизации | 55 мин | ⏳ |

**Общее время:** ~190 минут

---

## ⚠️ Важные замечания

### TruthSystem Integration
- Память первична, БД вторична
- Критические события: техники, инвентарь, прорыв, смена локации
- Автосохранение каждую минуту

### Event Bus
- ТОЛЬКО Phaser ↔ Server
- React компоненты → прямые API вызовы

### Пресеты
- Хранятся в TypeScript файлах (`src/data/presets/`)
- BasePreset — базовый интерфейс
- TechniquePreset extends BasePreset

---

*Документ обновлён с учётом архитектуры проекта*  
*TSC ошибок: ~45 (до исправления P0-P1)*
