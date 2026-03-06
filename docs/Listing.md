# 📚 Перечень документации проекта Cultivation World Simulator

**Последнее обновление:** 2026-03-04  
**Версия:** 17.0

Этот файл содержит полный перечень всех документов в папке `/docs` с описанием их назначения.

---

## 📊 Общая статистика

| Метрика | Значение |
|---------|----------|
| Файлов в /docs | 37 |
| Файлов в /docs/checkpoints | 6 |
| **Итого** | **43** |
| Категорий | 7 |

---

## 📁 Полный перечень файлов

### 🚀 НАЧАЛО РАБОТЫ (3 файла)

| Файл | Назначение | Статус |
|------|------------|--------|
| **[INSTALL.md](./INSTALL.md)** | Установка, настройка, запуск проекта, скрипты, устранение неполадок | ✅ ОБЯЗАТЕЛЕН |
| **[PHASER_STACK.md](./PHASER_STACK.md)** | Минимальный стек Phaser 3, используемые библиотеки, оптимизации | ✅ ОБЯЗАТЕЛЕН |
| **[start_lore.md](./start_lore.md)** | Лор мира культивации, контейнеры памяти, правила мира | ✅ ОБЯЗАТЕЛЕН |

---

### 🏗️ АРХИТЕКТУРА (6 файлов)

| Файл | Назначение | Статус |
|------|------------|--------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Общая архитектура, потоки данных, компоненты, Truth System | ✅ ОБЯЗАТЕЛЕН |
| **[FUNCTIONS.md](./FUNCTIONS.md)** | Справочник всех функций и типов, генератор техник, система Ци | ✅ ОБЯЗАТЕЛЕН |
| **[id-system.md](./id-system.md)** | Система идентификаторов (префиксы MS/MW/RG/DF, счётчики) | ✅ НЕОБХОДИМ |
| **[preset-storage.md](./preset-storage.md)** | Стратегия хранения пресетов (JSON vs БД) | ✅ НЕОБХОДИМ |
| **[inventory-system.md](./inventory-system.md)** | Система инвентаря (7x7 сетка, экипировка, хранилище) | ✅ НЕОБХОДИМ |
| **[database-analysis.md](./database-analysis.md)** | Комплексный анализ хранения данных (JSON vs SQLite) | ✅ ОБЯЗАТЕЛЕН |

---

### 📋 ПЛАНИРОВАНИЕ И СТАТУС (6 файлов)

| Файл | Назначение | Статус |
|------|------------|--------|
| **[PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md)** | История версий, текущий статус (v0.7.0), планы развития | ✅ ОБЯЗАТЕЛЕН |
| **[PHASE3-PHASER-PROGRESS.md](./PHASE3-PHASER-PROGRESS.md)** | Прогресс миграции на Phaser 3 (этапы 1-9 завершены) | ✅ НЕОБХОДИМ |
| **[TRAINING_GROUND_ROADMAP.md](./TRAINING_GROUND_ROADMAP.md)** | План тренировочного полигона | ✅ НЕОБХОДИМ |
| **[ENVIRONMENT_SYSTEM_PLAN.md](./ENVIRONMENT_SYSTEM_PLAN.md)** | План системы окружения (препятствия, деревья, руды) | ✅ НЕОБХОДИМ |
| **[ELECTRON_MIGRATION.md](./ELECTRON_MIGRATION.md)** | Анализ миграции на Electron (десктоп) | ⚠️ НА БУДУЩЕЕ |
| **[monetization.md](./monetization.md)** | Анализ вариантов монетизации (Standalone vs Web vs RimWorld мод) | ℹ️ СПРАВКА |

---

### ⚔️ ИГРОВЫЕ СИСТЕМЫ (10 файлов)

| Файл | Назначение | Статус |
|------|------------|--------|
| **[COMBAT_TECHNIQUES_SYSTEM.md](./COMBAT_TECHNIQUES_SYSTEM.md)** | Система боевых техник (melee/ranged/defense), время каста | ✅ ОБЯЗАТЕЛЕН |
| **[TEST_WORLD_TARGETS.md](./TEST_WORLD_TARGETS.md)** | Тестовый полигон, мишени, хитбоксы, метрическая система | ✅ НЕОБХОДИМ |
| **[Technic-Generator.md](./Technic-Generator.md)** | Оффлайн генератор техник (без LLM), пресеты, формулы | ✅ НЕОБХОДИМ |
| **[technique-types-extension.md](./technique-types-extension.md)** | Расширение классификации техник (проклятия, яды) | ⚠️ ЧЕРНОВИК |
| **[qi_stone.md](./qi_stone.md)** | Концепция Камней Ци (агрегатные состояния, физика) | ✅ НЕОБХОДИМ |
| **[charger.md](./charger.md)** | Концепция Зарядника Ци (буфер для камней) | ⚠️ ЧЕРНОВИК |
| **[vitality-hp-system.md](./vitality-hp-system.md)** | Система жизненной силы и HP | ✅ НЕОБХОДИМ |
| **[relations-system.md](./relations-system.md)** | Система отношений между персонажами | ⚠️ ПЛАН |
| **[faction-system.md](./faction-system.md)** | Система фракций | ⚠️ ПЛАН |
| **[npc-session-integration.md](./npc-session-integration.md)** | Интеграция NPC с сессиями | ✅ НЕОБХОДИМ |

---

### 🧬 КОНЦЕПЦИИ СУЩНОСТЕЙ (4 файла)

| Файл | Назначение | Статус |
|------|------------|--------|
| **[body.md](./body.md)** | Концепция Тела (Species, Body, Spirit), Kenshi-style повреждения | ✅ НЕОБХОДИМ |
| **[equip.md](./equip.md)** | Система экипировки и брони | ⚠️ ЧЕРНОВИК |
| **[random_npc.md](./random_npc.md)** | Генерация случайных NPC | ✅ НЕОБХОДИМ |
| **[npc-generator-plan.md](./npc-generator-plan.md)** | План генератора NPC | ⚠️ ПЛАН |

---

### 📊 АНАЛИЗ И ИССЛЕДОВАНИЯ (2 файла)

| Файл | Назначение | Статус |
|------|------------|--------|
| **[CODE-REVIEW.md](./CODE-REVIEW.md)** | Отчёт ревью кода (оценка 9.5/10) | ℹ️ АРХИВ |
| **[SPRITE_SIMPLIFICATION_PLAN.md](./SPRITE_SIMPLIFICATION_PLAN.md)** | План упрощения системы спрайтов | ⚠️ ПЛАН |

---

### 🔧 СПРАВКА (6 файлов)

| Файл | Назначение | Статус |
|------|------------|--------|
| **[CHEATS.md](./CHEATS.md)** | Чит-команды для тестирования | ✅ НЕОБХОДИМ |
| **[PROMPT-EXAMPLES.md](./PROMPT-EXAMPLES.md)** | Примеры промптов для LLM | ℹ️ СПРАВКА |
| **[LOCAL-ADVENTURE-GENERATOR.md](./LOCAL-ADVENTURE-GENERATOR.md)** | Концепт локального генератора приключений | ⚠️ НА БУДУЩЕЕ |
| **[ui-terminology.md](./ui-terminology.md)** | Терминология UI элементов | ✅ НЕОБХОДИМ |
| **[PLAYER_SPRITES.md](./PLAYER_SPRITES.md)** | Спрайты игрока | ✅ НЕОБХОДИМ |
| **[OPTIMIZATION-TECHNIQUES.ts](./OPTIMIZATION-TECHNIQUES.ts)** | Примеры оптимизации кода | ⚠️ ВРЕМЕННЫЙ |

---

### 📁 CHECKPOINTS (6 файлов)

| Файл | Назначение | Статус |
|------|------------|--------|
| **[checkpoints/checkpoint29.md](./checkpoints/checkpoint29.md)** | Контрольная точка 29 | 📋 ИСТОРИЯ |
| **[checkpoints/checkpoint30.md](./checkpoints/checkpoint30.md)** | Контрольная точка 30 | 📋 ИСТОРИЯ |
| **[checkpoints/checkpoint30_Npc_Rnd.md](./checkpoints/checkpoint30_Npc_Rnd.md)** | Генерация NPC | 📋 ИСТОРИЯ |
| **[checkpoints/checkpoint32.md](./checkpoints/checkpoint32.md)** | Контрольная точка 32 | 📋 ИСТОРИЯ |
| **[checkpoints/checkpoint_03_04.md](./checkpoints/checkpoint_03_04.md)** | Контрольная точка 03.04 | 📋 ИСТОРИЯ |

---

## 🎯 Категоризация по статусу

### ✅ ОБЯЗАТЕЛЬНЫЕ (10 файлов)

```
INSTALL.md              — Начало работы
PHASER_STACK.md         — Стек движка
ARCHITECTURE.md         — Архитектура проекта
FUNCTIONS.md            — API документация
PROJECT_ROADMAP.md      — Статус и планы
COMBAT_TECHNIQUES_SYSTEM.md — Боевая система
start_lore.md           — Лор мира
database-analysis.md    — Анализ хранения данных
```

### ✅ НЕОБХОДИМЫЕ (18 файлов)

```
PHASE3-PHASER-PROGRESS.md   — Прогресс Phaser
TEST_WORLD_TARGETS.md       — Тестовый полигон
body.md                     — Система тел
qi_stone.md                 — Физика Ци
Technic-Generator.md        — Генератор техник
CHEATS.md                   — Чит-команды
inventory-system.md         — Система инвентаря
ui-terminology.md           — Терминология UI
id-system.md                — Система ID
preset-storage.md           — Хранение пресетов
ENVIRONMENT_SYSTEM_PLAN.md  — План окружения
TRAINING_GROUND_ROADMAP.md  — План полигона
vitality-hp-system.md       — Система HP
random_npc.md               — Генерация NPC
npc-session-integration.md  — Интеграция NPC
PLAYER_SPRITES.md           — Спрайты игрока
```

### ⚠️ ЧЕРНОВИКИ / НА БУДУЩЕЕ (8 файлов)

```
technique-types-extension.md  — Расширение типов техник
charger.md                    — Зарядник Ци
equip.md                      — Система экипировки
ELECTRON_MIGRATION.md         — Миграция на Electron
LOCAL-ADVENTURE-GENERATOR.md  — Генератор приключений
relations-system.md           — Система отношений
faction-system.md             — Система фракций
npc-generator-plan.md         — План генератора NPC
```

### ℹ️ СПРАВОЧНЫЕ (2 файла)

```
CODE-REVIEW.md           — Исторический отчёт
PROMPT-EXAMPLES.md       — Примеры промптов
monetization.md          — Анализ монетизации
```

---

## 🔗 Связи между документами

```
README.md (корень)
    │
    ├── worklog.md ─────────────────→ История работы
    │
    ├── docs/
    │   ├── INSTALL.md ───────────────→ Установка
    │   ├── ARCHITECTURE.md ──────────→ Архитектура
    │   │       ├── FUNCTIONS.md ─────→ Справочник функций
    │   │       └── id-system.md ─────→ Система ID
    │   │
    │   ├── PHASER_STACK.md ──────────→ Phaser стек
    │   │       └── PHASE3-PHASER-PROGRESS.md → Прогресс миграции
    │   │
    │   ├── PROJECT_ROADMAP.md ───────→ Roadmap
    │   │
    │   ├── Игровые системы/
    │   │   ├── COMBAT_TECHNIQUES_SYSTEM.md → Боевая система
    │   │   ├── Technic-Generator.md ───────→ Генератор техник
    │   │   ├── qi_stone.md ─────────────────→ Камни Ци
    │   │   └── ENVIRONMENT_SYSTEM_PLAN.md ─→ План окружения
    │   │
    │   ├── Концепции/
    │   │   ├── body.md ───────────────→ Тело (Species, Body, Spirit)
    │   │   ├── equip.md ──────────────→ Экипировка
    │   │   └── start_lore.md ─────────→ Лор мира
    │   │
    │   ├── Анализ/
    │   │   └── database-analysis.md ──→ Комплексный анализ БД
    │   │
    │   ├── Системы/
    │   │   ├── inventory-system.md ───→ Инвентарь
    │   │   └── ui-terminology.md ─────→ Терминология UI
    │   │
    │   └── Listing.md ────────────────→ Этот файл
```

---

## 📝 Рекомендации по использованию

### Для новых разработчиков
1. **README.md** → **INSTALL.md**
2. Изучить **ARCHITECTURE.md** для понимания структуры
3. Изучить **PHASER_STACK.md** для понимания 2D движка
4. Прочитать **start_lore.md** для понимания мира

### Для AI-агентов
1. Изучить **PROJECT_ROADMAP.md** для текущего статуса
2. Использовать **FUNCTIONS.md** как справочник
3. Изучить **id-system.md** для генерации ID
4. Изучить **ui-terminology.md** для единых терминов

### Для тестирования
1. Использовать **CHEATS.md** для быстрых тестов
2. Изучить **TEST_WORLD_TARGETS.md** для полигона
3. Проверить **COMBAT_TECHNIQUES_SYSTEM.md** для боёв

---

## 📜 История изменений

### Версия 17 (2026-03-04)
- ✅ Удалена папка docs/plans/ (5 файлов)
- ✅ Обновлена статистика (43 файла, 7 категорий)

### Версия 16 (2026-03-04)
- ✅ Удалён файл rimka.md
- ✅ Добавлены новые файлы: ENVIRONMENT_SYSTEM_PLAN.md, monetization.md, TRAINING_GROUND_ROADMAP.md
- ✅ Обновлена статистика (48 файлов)
- ✅ Переорганизованы категории

### Версия 15 (2026-03-01)
- ✅ Удалены файлы планов агентов: AGENT_1_PLAN.md, AGENT_2_PLAN.md
- ✅ Добавлены новые файлы: inventory-system.md, ui-terminology.md
- ✅ Добавлена категория "Планы" для docs/plans/

### Версия 14 (2026-02-28)
- ✅ Объединены файлы анализа БД → **database-analysis.md**
- ✅ Добавлен .git-connect в .gitignore (защита токена)

---

## 🗑️ Рекомендации по очистке

### Можно удалить:
- `OPTIMIZATION-TECHNIQUES.ts` — временный код-пример

### Требуют доработки (черновики):
- `technique-types-extension.md` — требует согласования
- `charger.md` — требует реализации
- `equip.md` — требует реализации
- `LOCAL-ADVENTURE-GENERATOR.md` — будущая фича

---

*Этот файл обновляется при добавлении или изменении документации.*
