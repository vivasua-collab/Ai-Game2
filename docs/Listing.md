# 📚 Перечень документации проекта Cultivation World Simulator

**Последнее обновление:** 2026-03-14
**Версия:** 22.0

---

## 📊 Общая статистика

| Метрика | Значение |
|---------|----------|
| Файлов в /docs | 33 |
| Файлов в /docs/checkpoints | 2 |
| **Итого** | **35** |

---

## 📁 Полный перечень файлов (сортировка по категориям)

### 🚀 НАЧАЛО РАБОТЫ (3 файла)

| Файл | Назначение |
|------|------------|
| [start_lore.md](./start_lore.md) | Лор мира культивации |
| [INSTALL.md](./INSTALL.md) | Установка и запуск |
| [PHASER_STACK.md](./PHASER_STACK.md) | Стек Phaser 3 |

---

### 🏗️ АРХИТЕКТУРА (5 файлов)

| Файл | Назначение |
|------|------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Общая архитектура (v15) ✨ **Updated** |
| [sector-architecture.md](./sector-architecture.md) | Архитектура мира и секторов (v1.1) ✨ **NEW** |
| [FUNCTIONS.md](./FUNCTIONS.md) | Справочник функций |
| [data-systems.md](./data-systems.md) | Хранение данных, ID, пресеты |
| [inventory-system.md](./inventory-system.md) | Система инвентаря |

---

### 🧬 КОНЦЕПЦИИ СУЩНОСТЕЙ (5 файлов)

| Файл | Назначение |
|------|------------|
| [body.md](./body.md) | Система тела (Kenshi-style) |
| [equip.md](./equip.md) | Система экипировки |
| [soul-system.md](./soul-system.md) | Система объектов (SoulEntity + PhysicalObject) |
| [random_npc.md](./random_npc.md) | Генерация NPC ✨ **Updated v2.0** |
| [npc-session-integration.md](./npc-session-integration.md) | Интеграция NPC ✨ **Updated v2.0** |

---

### ⚔️ ИГРОВЫЕ СИСТЕМЫ (11 файлов)

| Файл | Назначение |
|------|------------|
| [technique-system.md](./technique-system.md) | Система техник (объединённый) ✨ **NEW** |
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

---

### 📋 ПЛАНИРОВАНИЕ (4 файла)

| Файл | Назначение |
|------|------------|
| [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) | Roadmap проекта |
| [ENVIRONMENT_SYSTEM_PLAN.md](./ENVIRONMENT_SYSTEM_PLAN.md) | План окружения |
| [PHASE3-PHASER-PROGRESS.md](./PHASE3-PHASER-PROGRESS.md) | Прогресс Phaser |
| [TRAINING_GROUND_ROADMAP.md](./TRAINING_GROUND_ROADMAP.md) | План полигона |

---

### 🔧 СПРАВКА (5 файла)

| Файл | Назначение |
|------|------------|
| [Listing.md](./Listing.md) | Этот файл |
| [PROMPT-EXAMPLES.md](./PROMPT-EXAMPLES.md) | Примеры промптов |
| [ui-terminology.md](./ui-terminology.md) | Терминология UI |
| [PLAYER_SPRITES.md](./PLAYER_SPRITES.md) | Спрайты игрока |
| [CHEATS.md](./CHEATS.md) | Чит-команды |

---

### 📁 CHECKPOINTS (2 файла)

| Файл | Назначение |
|------|------------|
| [checkpoints/checkpoint_03.md](./checkpoints/checkpoint_03.md) | Сводка выполненных задач ✨ **Updated** |
| [checkpoints/checkpoint_03_13_plan.md](./checkpoints/checkpoint_03_13_plan.md) | План задач |

---

## 🆕 Изменения в версии 22.0

### Новые файлы (1)

- `sector-architecture.md` — архитектура мира и секторов (текущая реализация + планы)

### Обновлено документов

- `Listing.md` → v22.0 — добавлен sector-architecture.md
- `PROJECT_ROADMAP.md` → добавлена версия 0.8.0 с планом секторной системы

---

## 🆕 Изменения в версии 21.0

### Удалено файлов (5)

- `technique-generator-todo.md` — фаза выполнена
- `technique-generator-analysis.md` — объединён в technique-system.md
- `technique-generator-implementation.md` — объединён в technique-system.md
- `npc-generator-plan.md` — реализовано
- `checkpoints/rewrite.md` — план оптимизации выполнен

### Новые файлы (1)

- `technique-system.md` — объединённая документация по системе техник

### Обновлено документов

- `ARCHITECTURE.md` → v15 — добавлен soul-mapping.ts
- `Listing.md` → v21.0 — актуализация списка файлов

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
| **Итого** | **88** | **88** |

---

*Файл обновлён: 2026-03-13*
