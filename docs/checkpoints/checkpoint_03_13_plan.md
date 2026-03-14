# 📋 План задач — Чекпоинт 03-13

**Дата создания:** 2026-03-13
**Ветка:** main2d4
**Статус:** 📝 План (ожидает выполнения)
**Приоритет:** 🔧 Улучшения и багфикс

---

## 🎯 Приоритет: Исправления и улучшения

**Все взаимодействия с системой истинности через Event Bus!**

---

## 📊 Сводка задач

| Приоритет | Категория | Задач | Время |
|-----------|-----------|-------|-------|
| 🟡 P2 | Техники (визуализация) | 2 | 4ч |
| 🟢 P3 | Улучшения | 2 | 3ч |
| **Итого** | | **4** | **7+ч** |

---

## ✅ ВЫПОЛНЕНО (checkpoint_03_13)

### ✅ NPC Implementation — все 4 фазы завершены

**Phase 1: SoulEntity + Training Ground Config** ✅
- [x] Добавлены SoulType, SoulController, MindComplexity в TempNPC
- [x] Создан soul-mapping.ts с SPECIES_TO_SOUL
- [x] SessionNPCManager использует getSoulFromSpecies()
- [x] Добавлена TRAINING_GROUND_CONFIG

**Phase 2: Combat Integration** ✅
- [x] isTempNPCId() + роутинг в combat handler
- [x] Создан temp-npc-combat.ts с боевой логикой
- [x] Интеграция с Event Bus

**Phase 3: AI Behavior + Wave System** ✅
- [x] Создан npc-ai.ts с NPCAIController
- [x] Реализованы поведения: idle/patrol/chase/attack/flee
- [x] Интеграция ИИ в LocationScene через Event Bus
- [x] Создан wave-manager.ts (опционально)

**Phase 4: Refactoring & Improvements** ✅
- [x] Prisma модели: Nation, Faction, FactionRelation
- [x] API /api/relations/check
- [x] Zod валидация NPC
- [x] Unit-тесты: 28 passed

### ✅ P3-2: Оптимизация AI tick rate
- [x] aiUpdateInterval: 100 (10 FPS) — реализовано

---

## 🟡 P2 — Техники (в процессе)

### P2-1: Визуализация дестабилизации техник
**Время:** 2 часа
**Зависимости:** Выполнено P0-1 (checkpoint_03_11)

**Файлы:**
- `src/game/scenes/LocationScene.ts`

**Задачи:**
- [ ] Эффект вспышки при дестабилизации
- [ ] Анимация backlash урона
- [ ] Предупреждение при >110% ёмкости
- [ ] Отображение ёмкости в UI

---

### P2-2: Система развития техник (Evolution)
**Время:** 2 часа
**Зависимости:** Выполнено P0-1 (checkpoint_03_11)

**Файлы:**
- `src/lib/game/techniques.ts`
- `src/lib/game/technique-learning.ts`

**Задачи:**
- [ ] `canEvolveTechnique()` — проверка условий
- [ ] `evolveTechnique()` — повышение уровня
- [ ] Условия: 100% мастерства, уровень культивации
- [ ] Сброс мастерства при развитии

**Отличие от существующего обучения:**
- Обучение = изучение новой техники (progress 0-100%)
- Эволюция = повышение УРОВНЯ техники (L1 → L2) при 100% мастерства

---

## 🟢 P3 — Улучшения

### P3-1: Расширение тестового покрытия
**Время:** 2 часа

**Задачи:**
- [ ] Тесты для WaveManager
- [ ] Тесты для NPCAIController
- [ ] Интеграционные тесты Event Bus

---

### P3-3: UI улучшения
**Время:** 1 час

**Задачи:**
- [ ] UI волн в Training Ground
- [ ] Счётчик врагов
- [ ] Индикатор агрессии

---

## 📐 Архитектура: Event Bus

```
┌─────────────────────────────────────────────────────────────────┐
│                        EVENT BUS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phaser Scene                Truth System                       │
│       │                           │                              │
│       │  combat:attack_temp_npc   │                              │
│       │ ─────────────────────────► │                              │
│       │                           │                              │
│       │  combat:result            │                              │
│       │ ◄───────────────────────── │                              │
│       │                           │                              │
│       │  npc:move                 │                              │
│       │ ◄───────────────────────── │  (AI Controller)            │
│       │                           │                              │
│       │  temp_npc:death           │                              │
│       │ ─────────────────────────► │                              │
│       │                           │                              │
│       │  loot, xp                 │                              │
│       │ ◄───────────────────────── │                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Правила:**
1. ❌ ПРЯМОЙ вызов SessionNPCManager из Phaser — ЗАПРЕЩЁН
2. ✅ Все запросы через Event Bus
3. ✅ Валидация на стороне процессора
4. ✅ Ответы через callback события

---

## 📚 Связанные документы

| Документ | Описание |
|----------|----------|
| `docs/soul-system.md` | Архитектура SoulEntity |
| `docs/TRAINING_GROUND_ROADMAP.md` | Roadmap тестового полигона |
| `docs/random_npc.md` | Концепция временных NPC |
| `docs/npc-session-integration.md` | Схема интеграции NPC |
| `docs/technique-system.md` | Система техник ✨ **NEW** |
| `docs/checkpoints/checkpoint_03.md` | Сводка выполненных задач |

---

*Документ обновлён: 2026-03-13*
*Удалены выполненные задачи (P3-2 AI tick rate)*
