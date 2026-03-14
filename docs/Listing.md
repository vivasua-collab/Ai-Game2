# 📚 Перечень документации проекта Cultivation World Simulator

**Последнее обновление:** 2026-03-15
**Версия:** 23.0

---

## 📊 Общая статистика

| Метрика | Значение |
|---------|----------|
| Файлов в /docs | 38 |
| Файлов в /docs/checkpoints | 1 |
| Файлов в /docs/implementation | 2 |
| **Итого** | **41** |

---

## 📁 Полный перечень файлов (сортировка по категориям)

### 🚀 НАЧАЛО РАБОТЫ (3 файла)

| Файл | Назначение |
|------|------------|
| [start_lore.md](./start_lore.md) | Лор мира культивации |
| [INSTALL.md](./INSTALL.md) | Установка и запуск |
| [PHASER_STACK.md](./PHASER_STACK.md) | Стек Phaser 3 |

---

### 🏗️ АРХИТЕКТУРА (6 файлов)

| Файл | Назначение |
|------|------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Общая архитектура (v16) ✨ **Updated** |
| [sector-architecture.md](./sector-architecture.md) | Архитектура мира и секторов |
| [FUNCTIONS.md](./FUNCTIONS.md) | Справочник функций |
| [data-systems.md](./data-systems.md) | Хранение данных, ID, пресеты |
| [inventory-system.md](./inventory-system.md) | Система инвентаря |
| [worklog.md](./worklog.md) | Журнал выполнения задач |

---

### 🧬 КОНЦЕПЦИИ СУЩНОСТЕЙ (5 файлов)

| Файл | Назначение |
|------|------------|
| [body.md](./body.md) | Система тела (Kenshi-style) |
| [equip.md](./equip.md) | Система экипировки |
| [soul-system.md](./soul-system.md) | Система объектов (SoulEntity + PhysicalObject) |
| [random_npc.md](./random_npc.md) | Генерация NPC |
| [npc-session-integration.md](./npc-session-integration.md) | Интеграция NPC |

---

### ⚔️ ИГРОВЫЕ СИСТЕМЫ (15 файлов)

| Файл | Назначение |
|------|------------|
| [technique-system.md](./technique-system.md) | Система техник |
| [Technic-Generator.md](./Technic-Generator.md) | Генератор техник |
| [charger.md](./charger.md) | Зарядник Ци |
| [qi_stone.md](./qi_stone.md) | Камни Ци |
| [combat-system.md](./combat-system.md) | Боевая система |
| [faction-system.md](./faction-system.md) | Система фракций |
| [relations-system.md](./relations-system.md) | Система отношений |
| [TEST_WORLD_TARGETS.md](./TEST_WORLD_TARGETS.md) | Тестовый полигон |
| [vitality-hp-system.md](./vitality-hp-system.md) | Система HP |
| [TECHNIQUE_SCALING_LIMITS.md](./TECHNIQUE_SCALING_LIMITS.md) | Лимиты масштабирования техник |
| [DAMAGE_FORMULAS_PROPOSAL.md](./DAMAGE_FORMULAS_PROPOSAL.md) | Предложение по формулам урона |
| [body-development-analysis.md](./body-development-analysis.md) | Анализ системы развития тела |
| [stat-threshold-system.md](./stat-threshold-system.md) | Система порогов развития ✨ **NEW** |
| [development-1000-days-calculation.md](./development-1000-days-calculation.md) | Расчёты развития |
| [implementation-plan-body-development.md](./implementation-plan-body-development.md) | План внедрения развития тела ✨ **NEW** |

---

### 📋 ПЛАНИРОВАНИЕ (4 файла)

| Файл | Назначение |
|------|------------|
| [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) | Roadmap проекта |
| [ENVIRONMENT_SYSTEM_PLAN.md](./ENVIRONMENT_SYSTEM_PLAN.md) | План окружения |
| [PHASE3-PHASER-PROGRESS.md](./PHASE3-PHASER-PROGRESS.md) | Прогресс Phaser |
| [TRAINING_GROUND_ROADMAP.md](./TRAINING_GROUND_ROADMAP.md) | План полигона |

---

### 🔧 СПРАВКА (5 файлов)

| Файл | Назначение |
|------|------------|
| [Listing.md](./Listing.md) | Этот файл |
| [PROMPT-EXAMPLES.md](./PROMPT-EXAMPLES.md) | Примеры промптов |
| [ui-terminology.md](./ui-terminology.md) | Терминология UI |
| [PLAYER_SPRITES.md](./PLAYER_SPRITES.md) | Спрайты игрока |
| [CHEATS.md](./CHEATS.md) | Чит-команды |

---

### 📁 CHECKPOINTS (1 файл)

| Файл | Назначение |
|------|------------|
| [checkpoints/checkpoint_03.md](./checkpoints/checkpoint_03.md) | Сводка выполненных задач |

---

### 📁 IMPLEMENTATION (2 файла)

| Файл | Назначение |
|------|------------|
| [implementation/phase-7-ui.md](./implementation/phase-7-ui.md) | Фаза 7: UI компоненты (в работе) |

---

## 🆕 Изменения в версии 23.0

### Обновлено документов

- `ARCHITECTURE.md` → v16 — добавлена система развития характеристик
- `Listing.md` → v23.0 — актуализация списка файлов
- `checkpoints/checkpoint_03.md` — добавлены фазы развития тела

### Удалено файлов

- `docs/checkpoints/checkpoint_03_13_plan.md` — задачи выполнены
- `docs/checkpoints/checkpoint_03_13_training.md` — задачи выполнены
- `docs/checkpoints/checkpoint_03_14_plan.md` — задачи выполнены
- `docs/implementation/phase-1-types.md` — фаза выполнена
- `docs/implementation/phase-2-thresholds.md` — фаза выполнена
- `docs/implementation/phase-3-virtual-delta.md` — фаза выполнена
- `docs/implementation/phase-4-sleep-consolidation.md` — фаза выполнена
- `docs/implementation/phase-5-training.md` — фаза выполнена
- `docs/implementation/phase-6-combat-integration.md` — фаза выполнена
- `docs/implementation/phase-8-testing.md` — фаза выполнена

---

## 📝 Рекомендации по использованию

### Для новых разработчиков
1. **INSTALL.md** → **PHASER_STACK.md** → **start_lore.md**
2. Изучить **ARCHITECTURE.md** для понимания структуры
3. Прочитать **soul-system.md** и **body.md** для понимания сущностей

### Для AI-агентов
1. Изучить **PROJECT_ROADMAP.md** для текущего статуса
2. Использовать **FUNCTIONS.md** как справочник API
3. Изучить **data-systems.md** для хранения данных
4. Проверить **checkpoints/checkpoint_03.md** для контекста выполненных задач

---

## 📊 Статистика выполнения

| Категория | Выполнено | Всего |
|-----------|-----------|-------|
| Генераторы предметов | 12 | 12 |
| NPC система | 8 | 8 |
| Формулы Lore | 4 | 4 |
| Environment System | 12 | 12 |
| Code Review | 14 | 14 |
| Sandbox fix | 6 | 6 |
| Система техник | 12 | 12 |
| NPC Implementation | 20 | 20 |
| NPC Enhancement | 8 | 8 |
| Система развития тела | 14 | 15 |
| **Итого** | **110** | **111** |

---

*Файл обновлён: 2026-03-15*
