# 📍 Чекпоинт 28 - Итоговая интеграция

**Дата:** 2026-03-01
**Ветка:** main2d3
**Статус:** 🟢 Активная разработка

---

## 📋 Общий обзор

Чекпоинт 28 представляет собой комплексную интеграцию нескольких подсистем:

1. **TruthSystem** — единый источник истины в памяти
2. **Event Bus** — шина событий для связи Phaser ↔ Server (HTTP-based)
3. **Система инвентаря** — экипировка, хранилище, камни Ци
4. **Генератор техник** — категории оружия, новые ID префиксы

---

## ✅ ВЫПОЛНЕННЫЕ ЗАДАЧИ

### 1. TruthSystem Integration (checkpoint28.md → checkpoint28)

**Статус:** ✅ Полностью завершено

| API Route | TruthSystem | Статус |
|-----------|-------------|--------|
| `/api/game/start` | `loadSession()` | ✅ |
| `/api/game/state` | `getSessionState()` | ✅ |
| `/api/game/save` | `saveToDatabase()`, `quickSave()` | ✅ |
| `/api/game/move` | `advanceTime()`, `updateCharacter()` | ✅ |
| `/api/game/end` | `unloadSession()` | ✅ |
| `/api/rest` | `updateCharacter()`, `advanceTime()` | ✅ |
| `/api/meditation` | `addQi()`, `applyBreakthrough()`, `updateConductivity()` | ✅ |
| `/api/technique/use` | `spendQi()`, `updateFatigue()` | ✅ |
| `inventory.service` | `addQi()`, `recoverFatigue()` | ✅ |

**Ключевые методы TruthSystem:**
- `loadSession(sessionId)` — загрузка сессии в память
- `getSessionState(sessionId)` — получение состояния
- `addQi()`, `spendQi()` — операции с Ци
- `updateCharacter()` — обновление персонажа (только память)
- `applyBreakthrough()` — прорыв уровня (БД + память)
- `saveToDatabase()`, `quickSave()` — сохранение

---

### 2. Event Bus (checkpoint28-sub.md)

**Статус:** ✅ Завершено (WebSocket → HTTP)

#### ⚠️ Важно: Откат WebSocket

**Причина:** WebSocket требовал отдельный mini-service на порту 3003, что усложняло архитектуру и создавало проблемы с синхронизацией.

**Решение:** Переход на HTTP-based Event Bus:
- `POST /api/game/event` — единый эндпоинт
- `EventBusClient.sendEvent()` — клиентский метод
- Полная интеграция с Next.js без дополнительных сервисов

#### Архитектура Event Bus

```
┌─────────────────────────────────────────────────────────────────┐
│                        PHASER ENGINE                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1. Проверка Qi локально (быстрая проверка UI)             │  │
│  │ 2. Отправка technique:use через HTTP POST                 │  │
│  │ 3. Получение ответа (canUse, damageMultiplier, currentQi) │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP POST /api/game/event
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER (Event Bus)                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ handlers/combat.ts → handleTechniqueUse()                 │  │
│  │   ├─ Поиск техники в БД (technique.qiCost)                │  │
│  │   ├─ Проверка Qi через TruthSystem                        │  │
│  │   ├─ Списание Qi: TruthSystem.spendQi()                   │  │
│  │   └─ Возврат: canUse, damageMultiplier, currentQi         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### Файлы Event Bus

| Файл | Назначение |
|------|------------|
| `src/lib/game/event-bus/client.ts` | Клиент для отправки событий (HTTP) |
| `src/lib/game/event-bus/processor.ts` | Процессор событий |
| `src/lib/game/event-bus/handlers/combat.ts` | Обработка техник |
| `src/lib/game/event-bus/handlers/inventory.ts` | Обработка инвентаря |
| `src/lib/game/event-bus/handlers/body.ts` | Обработка повреждений тела |
| `src/app/api/game/event/route.ts` | API эндпоинт |

---

### 3. Система инвентаря (checkpoint28-inventar.md)

**Статус:** 🔄 87% завершено

| Этап | Статус | Прогресс |
|------|--------|----------|
| 1. База данных и типы | ✅ Завершён | 100% |
| 2. React InventoryDialog | ✅ Завершён | 100% |
| 3. API маршруты | ✅ Завершён | 100% |
| 4. Phaser Inventory Scene | ✅ Завершён | 100% |
| 5. Камни Ци | ✅ Завершён | 100% |
| 6. UI полировка | ✅ Завершён | 80% |
| 7. Синхронизация React ↔ Phaser | 🔄 В работе | 30% |

#### Камни Ци

| Тип | Ци | Редкость |
|-----|-----|----------|
| Осколок | 1,000 | common |
| Фрагмент | 10,000 | uncommon |
| Камень | 100,000 | rare |
| Кристалл | 1,000,000 | epic |
| Сердце | 10,000,000 | legendary |
| Ядро | 100,000,000 | mythic |

#### API маршруты инвентаря

- `/api/inventory` — список предметов
- `/api/inventory/state` — полное состояние
- `/api/inventory/equip` — экипировка
- `/api/inventory/move` — перемещение
- `/api/inventory/storage` — хранилище
- `/api/inventory/use` — использование
- `/api/inventory/add-qi-stone` — добавление камней Ци

---

### 4. Генератор техник (checkpoint28-techniques.md)

**Статус:** ✅ Завершено (v1.3)

#### Новые ID префиксы

| Старый | Новый | Описание |
|--------|-------|----------|
| TC | MS | Melee Strike — удар телом |
| TC | MW | Melee Weapon — оружейная техника |
| TC | RG | Ranged — дальняя атака |
| DF | DF | Defense — защита |
| HL | HL | Healing — лечение |

#### Категории оружия

| Категория | Типы оружия |
|-----------|------------|
| `one_handed_blade` | sword, blade, saber, dagger |
| `one_handed_blunt` | mace, hammer, club |
| `two_handed_heavy` | greatsword, greataxe, maul |
| `two_handed_polearm` | spear, halberd, glaive, staff |
| `light_fist` | fist, claw, knuckle |
| `exotic` | whip, chain, fan |

---

### 5. Система тела (checkpoint28-limbs-system.md)

**Статус:** 📝 Концептуализация

#### Ключевые механики (планируемые)

- Двойная HP (функциональная + структурная)
- Отрубание конечностей
- Кровотечения (minor → arterial)
- Регенерация (уровень 8+ — отрастание)
- Приживление чужих конечностей

---

## 🐛 ИСПРАВЛЕННЫЕ БАГИ

### 1. Двойное списание Ци

**Проблема:** При использовании техники Ци списывалась дважды:
1. `combat-processor.ts` → `TruthSystem.spendQi()` ✅
2. `event-processor.ts` → применял `changes.currentQi` повторно ❌

**Решение:** В `event-processor.ts` убрано повторное применение `changes.currentQi`.

### 2. Hardcoded Qi Cost

**Проблема:** Стоимость Ци была захардкожена (10, 20).

**Решение:** `qiCost` теперь читается из базы данных:
```typescript
const technique = await db.technique.findUnique({ where: { id: techniqueId } });
const qiCost = technique.qiCost ?? 0;
```

### 3. Qi Stones не добавлялись

**Проблема:** CheatMenuContent вызывал несуществующий API маршрут.

**Решение:** Добавлен `add_qi_stone` в `cheats.service.ts`.

### 4. Бонус проводимости при прорыве

**Проблема:** При прорыве уровня проводимость пересчитывалась БЕЗ учёта медитаций.

**Решение:** Добавлена передача `character.conductivityMeditations || 0`.

---

## 📁 Ключевые файлы

### TruthSystem

| Файл | Назначение |
|------|------------|
| `src/lib/game/truth-system.ts` | Ядро системы, singleton |

### Event Bus

| Файл | Назначение |
|------|------------|
| `src/lib/game/event-bus/client.ts` | HTTP клиент |
| `src/lib/game/event-bus/processor.ts` | Процессор событий |
| `src/lib/game/event-bus/handlers/*.ts` | Обработчики |
| `src/app/api/game/event/route.ts` | API эндпоинт |

### Инвентарь

| Файл | Назначение |
|------|------------|
| `src/components/game/InventoryDialog.tsx` | UI инвентаря |
| `src/components/game/BodyDoll.tsx` | Кукла тела |
| `src/services/inventory.service.ts` | Логика инвентаря |
| `src/types/inventory.ts` | Типы |
| `src/types/qi-stones.ts` | Камни Ци |

### Генератор техник

| Файл | Назначение |
|------|------------|
| `src/lib/generator/technique-generator.ts` | Генератор |
| `src/lib/generator/weapon-categories.ts` | Категории оружия |
| `src/lib/generator/preset-storage.ts` | Хранение пресетов |

---

## 📊 Статистика

| Метрика | Значение |
|---------|----------|
| Интегрировано API routes | 10/10 |
| Event Bus handlers | 4 (combat, inventory, body, movement) |
| Пресеты техник | 13+ |
| Пресеты предметов | 15+ |
| Новых ID префиксов | 5 (MS, MW, RG, DF, HL) |

---

## 🔜 ПЛАНИРУЕМЫЕ ЗАДАЧИ

### Высокий приоритет

1. [ ] **Синхронизация инвентаря React ↔ Phaser** (Этап 7)
   - Прозрачная двусторонняя связь ячеек
   - Обработка конфликтов

2. [ ] **Система тела (Kenshi-style)**
   - Двойная HP полоска
   - Отрубание конечностей
   - Кровотечения

### Средний приоритет

3. [ ] **World Map** — карта мира в Phaser
4. [ ] **Combat Scene** — полноценная сцена боя
5. [ ] **NPC** — отображение NPC в мире

### Низкий приоритет

6. [ ] UI анимации открытия/закрытия инвентаря
7. [ ] Контекстное меню (использовать, выбросить)
8. [ ] Миграция данных генератора техник

---

## 🔄 История изменений

| Дата | Изменение |
|------|-----------|
| 2026-02-28 | Интеграция TruthSystem во все API routes |
| 2026-02-28 | Создание Event Bus (HTTP-based) |
| 2026-02-28 | Система инвентаря и камней Ци |
| 2026-02-28 | Рефакторинг генератора техник |
| 2026-03-01 | **Откат WebSocket → HTTP Event Bus** |
| 2026-03-01 | Исправление двойного списания Ци |
| 2026-03-01 | Исправление hardcoded qiCost |
| 2026-03-01 | **Объединение checkpoint файлов в один** |

---

## 📚 Связанная документация

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — архитектура проекта
- [PROJECT_ROADMAP.md](./docs/PROJECT_ROADMAP.md) — дорожная карта
- [qi_stone.md](./docs/qi_stone.md) — камни Ци
- [equip.md](./docs/equip.md) — система экипировки
- [body.md](./docs/body.md) — система тела

---

*Файл объединяет информацию из:*
- `checkpoint28-inventar.md`
- `checkpoint28-limbs-system.md`
- `checkpoint28-solutions.md`
- `checkpoint28-sub.md`
- `checkpoint28-techniques.md`

*Последнее обновление: 2026-03-01*
