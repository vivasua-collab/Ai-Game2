# 📋 Checkpoint 03.14 — План рефакторинга и развития

**Дата создания:** 2026-03-14
**Ветка:** main2d4
**Статус:** 🔄 В работе
**Последнее обновление:** 2026-03-14 (Weapon-Armor System Analysis)

---

## ✅ Статус реализации Phases

### Phase 8: Hand Combat System — ✅ ВЫПОЛНЕНО

| Задача | Статус | Файл |
|--------|--------|------|
| Добавить `lastAttackTime` | ✅ | `LocationScene.ts:119` |
| Добавить `canAttack()` check | ✅ | `LocationScene.ts:855` |
| Формула урона от STR | ✅ | `hand-combat.ts:39-42` |
| Формула кулдауна от AGI | ✅ | `hand-combat.ts:52-55` |
| Интеграция в LocationScene | ✅ | `LocationScene.ts:843-884` |
| Отправка на сервер | ✅ | `LocationScene.ts:890-900` |

**Формулы:**
```
handDamage = 3 + (STR-10) × 0.3
cooldown = max(200ms, 1000ms - (AGI-10) × 15ms)
```

---

### Phase 9: Delta Development Integration — ✅ ВЫПОЛНЕНО

| Задача | Статус | Файл |
|--------|--------|------|
| Создать `stat-truth.ts` | ✅ | `src/lib/game/stat-truth.ts` |
| Создать API `/api/character/delta` | ✅ | `src/app/api/character/delta/route.ts` |
| Создать API `/api/character/stats` | ✅ | `src/app/api/character/stats/route.ts` |
| Интегрировать в combat handler | ✅ | `handlers/combat.ts:384-414, 599-624` |
| `addStatDelta()` вызов | ✅ | `handlers/combat.ts:402-408` |
| `generateAttackDelta()` вызов | ✅ | `handlers/combat.ts:389-393` |
| `calculateFatiguePenalty()` | ✅ | `handlers/combat.ts:396-399` |

---

### Phase 7: UI Stats Components — ✅ ВЫПОЛНЕНО

| Компонент | Статус | Файл |
|-----------|--------|------|
| StatIcon | ✅ | `src/components/stats/StatIcon.tsx` |
| StatProgressBar | ✅ | `src/components/stats/StatProgressBar.tsx` |
| StatsDevelopmentPanel | ✅ | `src/components/stats/StatsDevelopmentPanel.tsx` |
| TrainingSelection | ✅ | `src/components/stats/TrainingSelection.tsx` |
| SleepConsolidationResult | ✅ | `src/components/stats/SleepConsolidationResult.tsx` |
| ThresholdTable | ✅ | `src/components/stats/ThresholdTable.tsx` |
| index.ts (exports) | ✅ | `src/components/stats/index.ts` |

---

### Phase 14: NPC Collision & Combat — ✅ ВЫПОЛНЕНО

| Задача | Статус |
|--------|--------|
| Ручная проверка коллизии в `handleMovement()` | ✅ |
| Константы `NPC_COLLISION_RADIUS = 25`, `PLAYER_COLLISION_RADIUS = 15` | ✅ |
| Цикл по `this.npcs` в `performAttack()` | ✅ |
| Функция `damageNPC()` с визуальным эффектом | ✅ |
| Функция `handleNPCDeath()` с анимацией смерти | ✅ |
| Поля LocationNPC: `hitboxRadius`, `hp`, `maxHp` | ✅ |
| Re-export `createInitialStatsDevelopment` | ✅ |

---

## 🔴 КРИТИЧЕСКИЕ БАГИ — ИСПРАВЛЕНЫ

### BUG #1: NPC Collision Missing — ✅ ИСПРАВЛЕНО

**Проблема:** Игрок проходил сквозь NPC

**Решение:** Ручная проверка коллизии в `handleMovement()`

### BUG #2: Attack на NPC — ✅ ИСПРАВЛЕНО

**Проблема:** Атака не наносила урон NPC

**Решение:** Добавлен цикл по NPC в `performAttack()`

---

## 📊 Приоритеты (обновлённые)

| Приоритет | Фаза | Описание | Статус |
|-----------|------|----------|--------|
| P0 ✅ | Phase 14 | NPC Collision & Combat | ✅ DONE |
| P0 ✅ | Phase 8 | Система атак руками | ✅ DONE |
| P0 ✅ | Phase 9 | Интеграция дельты развития | ✅ DONE |
| P1 | Phase 15 | Оружие и броня | 📋 Теоретические изыскания |
| P1 | Phase 11 | Боевая система — улучшения | pending |
| P2 ✅ | Phase 7 | UI компоненты | ✅ DONE |
| P2 | Phase 10 | Рефакторинг дубликатов | pending |
| P2 | Phase 13 | Формации | pending |

---

## 📋 ПЛАНЫ ВНЕДРЕНИЯ (для ИИ-агентов)

> ⚠️ **Внимание:** Это рабочие планы внедрения, не входят в перечень документации (Listing.md)

| Файл | Описание | Приоритет | Статус |
|------|----------|-----------|--------|
| [roadmap.md](../implementation/roadmap.md) | 🗺️ Дорожная карта | — | ✅ |

**Все выполненные планы удалены из docs/implementation/**

---

## 📚 ТЕОРЕТИЧЕСКИЕ ИЗЫСКАНИЯ

> ⚠️ **Внимание:** Теоретические изыскания находятся в основной документации, НЕ в docs/implementation

| Файл | Описание | Статус |
|------|----------|--------|
| [weapon-armor-system.md](../weapon-armor-system.md) | 📋 Оружие и броня | ✅ Система Грейдов разработана |

### 🔬 Анализ предложения по разделению базы и редкости (2026-03-14)

**Предложение пользователя:**
> *"Разделение характеристик базового оружия, а редкость как надстройка — этим мы сможем реализовать потерю редкости при некачественном ремонте (понижение грейда) и упростить систему хранения и генерации оружия."*

**Результат анализа:**

| Аспект | Верность | Комментарий |
|--------|----------|-------------|
| Потеря редкости при ремонте | ✅ ВЕРНО | Архитектура позволяет понижать `gradeOverlay` без пересоздания предмета |
| Упрощение хранения | ⚠️ ЧАСТИЧНО | Хранение становится сложнее (два уровня), НО появляется возможность шаблонов |
| Упрощение генерации | ⚠️ ЧАСТИЧНО | Генерация становится двухэтапной, НО более гибкой |

**Сложность реализации:** 15-22 часа работы

**Рекомендация:** Полный вариант с разделением базы и грейда

### 🆕 Система Грейдов (2026-03-14)

**Уровни качества:**
1. **Damaged** (Повреждённый) — ×0.5 прочности, нельзя апгрейдить
2. **Common** (Обычный) — ×1.0 прочности, базовый
3. **Refined** (Улучшенный) — ×1.5 прочности, доп. характеристики
4. **Perfect** (Совершенный) — ×2.5 прочности, спецэффекты
5. **Transcendent** (Превосходящий) — ×4.0 прочности, даруемые техники

**Ключевые механики:**
- ✅ Апгрейд грейда (повышение качества) — 50-95% шанс успеха
- ✅ Понижение грейда при плохом ремонте — 25-40% риск
- ❌ Прокачка уровня НЕ реализуется — сохраняется мотивация искать новое снаряжение

### 🆕 Обновлённые документы (2026-03-14)

| Файл | Изменение |
|------|-----------|
| `docs/equip.md` | Полностью переписан под архитектуру "База + Грейд" |
| `docs/equip-v2.md` | Создан сборный файл с детальной спецификацией |
| `docs/weapon-armor-system.md` | Добавлены разделы 12-16 (Грейды, Апгрейд, Понижение) |

**Подробнее:** См. `docs/equip-v2.md` и `docs/weapon-armor-system.md` разделы 12-16

---

## ✅ Выполненные задачи (2026-03-14)

### Phase 8: Hand Combat System
- **Создано:** `src/lib/game/hand-combat.ts`
- **Модифицировано:** `src/game/scenes/LocationScene.ts`
- **Результат:**
  - Урон зависит от силы: `3 + (STR-10) * 0.3`
  - Кулдаун зависит от ловкости: `max(200ms, 1000ms - (AGI-10) * 15ms)`
  - Атаки отправляются на сервер через Event Bus

### Phase 9: Delta Development Integration
- **Создано:**
  - `src/lib/game/stat-truth.ts`
  - `src/app/api/character/delta/route.ts`
  - `src/app/api/character/stats/route.ts`
- **Модифицировано:** `src/lib/game/event-bus/handlers/combat.ts`
- **Результат:**
  - После успешной атаки добавляется виртуальная дельта
  - Штраф от усталости учитывается
  - API для получения/добавления дельты

### Phase 7: UI Stats Components
- **Создано:** `src/components/stats/` (6 файлов)
- **Результат:** UI компоненты для отображения развития характеристик

### Phase 14: NPC Collision & Combat
- **Модифицировано:** `src/game/scenes/LocationScene.ts`
- **Результат:**
  - Игрок не проходит сквозь NPC
  - Атаки наносят урон NPC
  - NPC умирают с анимацией

---

## 📝 Следующие шаги

### Phase 15: Оружие и броня (P1) — Теоретические изыскания завершены

**Документ:** `docs/weapon-armor-system.md` (разделы 9-11)

**Задачи определены:**
1. **Фаза 1:** Интерфейсы и типы (`src/types/equipment-v2.ts`)
2. **Фаза 2:** Рефакторинг генераторов (`weapon-generator-v2.ts`)
3. **Фаза 3:** Система прочности (`durability-system.ts`)
4. **Фаза 4:** Система ремонта (`repair-system.ts`)
5. **Фаза 5:** Интеграция с боевой системой

**Ключевые решения:**
- ✅ Редкость как надстройка (можно понижать при плохом ремонте)
- ✅ Прочность зависит от редкости (common: 50, legendary: 200)
- ✅ Комбинированный износ (базовый + ударный)
- ✅ Потеря бонусов при понижении редкости

**Для начала реализации:**
1. Изучить раздел 11 в `docs/weapon-armor-system.md`
2. Создать `src/types/equipment-v2.ts`
3. Начать с интерфейсов `WeaponBaseStats`, `RarityOverlay`, `DurabilityProps`

### Phase 11: Боевая система улучшения (P1)

Ожидает завершения Phase 15

---

*Документ создан: 2026-03-14*
*Агент: Main Agent*
