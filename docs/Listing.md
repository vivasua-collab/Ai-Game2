# 📚 Перечень документации проекта Cultivation World Simulator

**Последнее обновление:** 2026-03-24 16:55 UTC
**Файлов в /docs:** 47

---

## 📁 Начало работы (3 файла)

| Файл | Описание | Токены |
|------|----------|--------|
| [start_lore.md](./start_lore.md) | Лор мира культивации, система Ци, география | ~6 800 |
| [INSTALL.md](./INSTALL.md) | Установка, запуск, скрипты, troubleshooting | ~5 300 |
| [PHASER_STACK.md](./PHASER_STACK.md) | Стек Phaser 3, SSR, генерация текстур | ~1 700 |

---

## 📁 Архитектура (7 файлов)

| Файл | Описание | Токены |
|------|----------|--------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | **Общая архитектура v19, Truth System, Event Bus, TickTimer** | ~10 500 |
| [ARCHITECTURE_code_base.md](./ARCHITECTURE_code_base.md) | **Примеры кода для архитектуры (NEW)** | ~1 200 |
| [TIME_SYSTEM.md](./TIME_SYSTEM.md) | **Документация системы времени TickTimer (NEW)** | ~2 500 |
| [sector-architecture.md](./sector-architecture.md) | Архитектура мира и секторов (RimWorld-style) | ~5 100 |
| [FUNCTIONS.md](./FUNCTIONS.md) | Справочник функций и API | ~13 000 |
| [inventory-system.md](./inventory-system.md) | Система инвентаря | ~3 500 |
| [event-bus-system.md](./event-bus-system.md) | Шина событий Phaser ↔ Server | ~1 800 |

---

## 📁 Сущности (5 файлов)

| Файл | Описание | Токены |
|------|----------|--------|
| [body.md](./body.md) | Система тела (Kenshi-style), конечности | ~2 000 |
| [equip.md](./equip.md) | Система экипировки | ~10 000 |
| [equip-v2.md](./equip-v2.md) | Экипировка v2 (Grade System) | ~2 900 |
| [soul-system.md](./soul-system.md) | SoulEntity + PhysicalObject | ~1 800 |
| [random_npc.md](./random_npc.md) | Генерация NPC | ~7 400 |

---

## 📁 Игровые системы (20 файлов)

| Файл | Описание | Токены |
|------|----------|--------|
| [technique-system-v2.md](./technique-system-v2.md) | Система техник v2.1 (Grade + Capacity System) | ~4 500 |
| [generators.md](./generators.md) | Все генераторы системы | ~3 900 |
| [charger.md](./charger.md) | Зарядник Ци | ~12 500 |
| [qi_stone.md](./qi_stone.md) | Камни Ци | ~8 100 |
| [combat-system.md](./combat-system.md) | Боевая система | ~2 100 |
| [faction-system.md](./faction-system.md) | Система фракций | ~5 500 |
| [relations-system.md](./relations-system.md) | Система отношений | ~7 200 |
| [TEST_WORLD_TARGETS.md](./TEST_WORLD_TARGETS.md) | Тестовый полигон | ~4 500 |
| [vitality-hp-system.md](./vitality-hp-system.md) | Система HP | ~1 400 |
| [DAMAGE_FORMULAS_PROPOSAL.md](./DAMAGE_FORMULAS_PROPOSAL.md) | Предложение по формулам урона | ~2 600 |
| [weapon-armor-system.md](./weapon-armor-system.md) | Теория: Оружие и броня | ~20 300 |
| [materials.md](./materials.md) | Система материалов | ~8 900 |
| [bonuses.md](./bonuses.md) | Единая система бонусов | ~2 500 |
| [ENVIRONMENT_SYSTEM_PLAN.md](./ENVIRONMENT_SYSTEM_PLAN.md) | План системы окружения | ~8 700 |
| [TRAINING_GROUND_ROADMAP.md](./TRAINING_GROUND_ROADMAP.md) | План тренировочного полигона | ~2 400 |
| [condition-system.md](./condition-system.md) | Система состояний | ~2 700 |
| [stat-development-system.md](./stat-development-system.md) | Развитие характеристик | ~2 800 |
| [stat-threshold-system.md](./stat-threshold-system.md) | Пороги развития | ~4 300 |
| [body-development-analysis.md](./body-development-analysis.md) | Анализ развития тела | ~6 200 |
| [development-1000-days-calculation.md](./development-1000-days-calculation.md) | Расчёт развития на 1000 дней | ~4 100 |

---

## 📁 Планирование (2 файла)

| Файл | Описание | Токены |
|------|----------|--------|
| [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) | Roadmap проекта, история, планы | ~4 300 |
| [npc-session-integration.md](./npc-session-integration.md) | Интеграция NPC с сессиями | ~5 000 |

---

## 📁 Справка (5 файлов)

| Файл | Описание | Токены |
|------|----------|--------|
| [Listing.md](./Listing.md) | Этот файл | ~600 |
| [PROMPT-EXAMPLES.md](./PROMPT-EXAMPLES.md) | Примеры промптов | ~4 200 |
| [ui-terminology.md](./ui-terminology.md) | Терминология UI | ~2 800 |
| [PLAYER_SPRITES.md](./PLAYER_SPRITES.md) | Спрайты игрока | ~1 500 |
| [CHEATS.md](./CHEATS.md) | Чит-команды | ~700 |

---

## 📁 Прочее (2 файла)

| Файл | Описание | Токены |
|------|----------|--------|
| [phaser-game-analysis.md](./phaser-game-analysis.md) | Анализ Phaser игры | ~2 000 |
| [implementation-plan-body-development.md](./implementation-plan-body-development.md) | План развития тела | ~3 600 |

---

## 📂 Рабочие папки (не входят в документацию)

### checkpoints/ — Чекпоинты и планы внедрения

Рабочие документы для ИИ-агентов. Включает:
- **checkpoint_03_24_tick_timer_phase_6.md** — Анализ миграции системы времени
- **checkpoint_03_24_tick_timer_phase_7.md** — План реализации Phase 7

---

## 🆕 Последние обновления (2026-03-24)

| Компонент | Изменения |
|-----------|-----------|
| **TIME_SYSTEM.md** | ✅ Обновлено до v6.0: Time Scaling реализован и исправлен |
| **ARCHITECTURE.md** | ✅ Обновлено до v21: добавлены time-scaling.ts, action-speeds.ts, activity-manager.ts |
| **ARCHITECTURE_code_base.md** | ✅ Обновлено до v2.0: добавлены примеры Time Scaling |
| **FUNCTIONS.md** | ✅ Обновлено до v4.0: добавлены функции Time Scaling и Activity Manager |
| **PHASE3-PHASER-PROGRESS.md** | ✅ Добавлен этап 10: Time Scaling (завершён) |
| **checkpoint_03_24_tick_timer_fix_2.md** | ✅ Обновлено: история разработки с отметками о выполненных задачах |
| **checkpoint_03_24_tick_timer_fix_3.md** | ✅ Создано: исправление инверсии скорости |
| **time-scaling.ts** | ✅ Новый файл: масштабирование скорости и кулдаунов |
| **action-speeds.ts** | ✅ Новый файл: профили активностей |
| **activity-manager.ts** | ✅ Новый файл: менеджер автоматического переключения времени |
| **LocationScene.ts** | ✅ Исправлено: использована scaleMovementSpeedInverse |
| **PhaserGame.tsx** | ✅ Исправлено: использована scaleMovementSpeedInverse |

---

## 🔗 Связанные документы

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Основная архитектура
- [TIME_SYSTEM.md](./TIME_SYSTEM.md) — Система времени
- [FUNCTIONS.md](./FUNCTIONS.md) — Справочник функций

---

*Файл обновлён: 2026-03-24*
