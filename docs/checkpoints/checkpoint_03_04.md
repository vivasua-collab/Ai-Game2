# 📋 Checkpoint 03.04 — Система окружения

**Дата:** 2026-03-04
**Ветка:** main2d4
**Статус:** 🔄 В разработке (Environment System)

---

## 🌳 Текущая задача: Система окружения

### Цель
Создать систему окружения для тестового полигона — место обкатки механик перед внедрением в основную игру.

### Выполнено

| # | Задача | Статус | Файл |
|---|--------|--------|------|
| 1 | Обновить PROJECT_ROADMAP.md | ✅ Готово | `docs/PROJECT_ROADMAP.md` |
| 2 | Создать типы окружения | ✅ Готово | `src/types/environment.ts` |
| 3 | Пресеты камней | ✅ Готово | `src/data/presets/environment/rock-presets.ts` |
| 4 | Пресеты деревьев | ✅ Готово | `src/data/presets/environment/tree-presets.ts` |
| 5 | Пресеты руд | ✅ Готово | `src/data/presets/environment/ore-presets.ts` |
| 6 | Пресеты строений | ✅ Готово | `src/data/presets/environment/building-presets.ts` |
| 7 | Индекс окружения | ✅ Готово | `src/data/presets/environment/index.ts` |
| 8 | Генератор текстур | ✅ Готово | `src/game/services/environment-texture-generator.ts` |
| 9 | Environment Manager | ✅ Готово | `src/game/services/environment-manager.ts` |
| 10 | Event Bus Client (env events) | ✅ Готово | `src/lib/game/event-bus/client.ts` |
| 11 | Интеграция в PhaserGame | ✅ Готово | `src/components/game/PhaserGame.tsx` |
| 12 | Физика столкновений | ✅ Готово | В PhaserGame.tsx (update loop) |

### Пресеты окружения

**Камни (9 типов):**
- `rock_small` ×2 — проходимые, замедление
- `rock_medium` ×2 — блокируют, разрушаемы
- `rock_large` ×2 — блокируют, трудно разрушить
- `boulder` ×2 — неразрушаемые валуны
- `ravine` ×1 — овраг, замедление
- `cliff` ×1 — непроходимая скала

**Деревья (6 типов):**
- `pine` ×2 — сосна, мягкая древесина
- `oak` ×1 — дуб, качественная древесина
- `willow` ×1 — ива, укрытие
- `bamboo` ×1 — бамбук, быстрый респаун
- `spirit_tree` ×1 — духовное дерево, редкое
- `dead_tree` ×1 — сухое дерево

**Руды (7 типов):**
- `iron_ore` — железо, базовая
- `copper_ore` — медь, мягкая
- `silver_ore` — серебро, редкая
- `gold_ore` — золото, редкая
- `jade_ore` — нефрит, для артефактов
- `spirit_ore` — духовная руда, легендарная
- `crystal` — кристалл Ци, собирается руками

**Строения (9 типов):**
- `wall_wooden` ×2 — стены
- `door_wooden` ×2 — двери
- `window_wooden` ×1 — окна
- `fence_wooden` ×1 — забор
- `gate_wooden` ×1 — ворота
- `floor_wooden` ×1 — пол
- `roof_thatch` ×1 — крыша
- `pillar_wooden` ×1 — столб

---

## 🔍 Анализ предыдущих чекпоинтов

### checkpoint29.md — Системы предметов
**Статус:** ✅ ПОЧТИ ПОЛНОСТЬЮ РЕАЛИЗОВАНО

| Задача | Статус в чекпоинте | Фактический статус | Файл |
|--------|-------------------|-------------------|------|
| Генератор оружия | ⬜ Не выполнено | ✅ **РЕАЛИЗОВАНО** | `weapon-generator.ts` + `WeaponGeneratorPanel.tsx` |
| Генератор брони | ⬜ Не выполнено | ✅ **РЕАЛИЗОВАНО** | `armor-generator.ts` + `ArmorGeneratorPanel.tsx` |
| Генератор аксессуаров | ⬜ Не выполнено | ✅ **РЕАЛИЗОВАНО** | `accessory-generator.ts` + `AccessoryGeneratorPanel.tsx` |
| Генератор расходников | ⬜ Не выполнено | ✅ **РЕАЛИЗОВАНО** | `consumable-generator.ts` + `ConsumableGeneratorPanel.tsx` |
| Генератор камней Ци | ⬜ Не выполнено | ✅ **РЕАЛИЗОВАНО** | `qi-stone-generator.ts` + `QiStoneGeneratorPanel.tsx` |
| Генератор зарядников | ⬜ Не выполнено | ✅ **РЕАЛИЗОВАНО** | `charger-generator.ts` + `ChargerGeneratorPanel.tsx` |
| Генератор имён с родом | ⬜ Не выполнено | ✅ **РЕАЛИЗОВАНО** | `name-generator.ts` |
| BaseItemGenerator | ⬜ Не выполнено | ✅ **РЕАЛИЗОВАНО** | `base-item-generator.ts` |
| Улучшения (биты 0-15) | ⬜ Не выполнено | ✅ **РЕАЛИЗОВАНО** | В интерфейсах генераторов |
| Система сетов | ⬜ Отложено | ⬜ Отложено | Заглушки в интерфейсах |

**Вывод:** checkpoint29 был реализован, но не обновлён.

---

### checkpoint30.md — Формулы Lore в NPC Generator
**Статус:** 🟡 ЧАСТИЧНО ВЫПОЛНЕНО

| Задача | Статус | Файл/Примечание |
|--------|--------|-----------------|
| lore-formulas.ts | ✅ Готово | `src/lib/generator/lore-formulas.ts` |
| Интеграция в npc-generator.ts | ✅ Готово | v2.1.0-lore |
| NPCViewerDialog обновлён | ✅ Готово | Новые поля отображаются |
| Тестирование разных уровней | ⬜ **НЕ ВЫПОЛНЕНО** | Требуется проверка |
| Проверка баланса | ⬜ **НЕ ВЫПОЛНЕНО** | Требуется анализ |
| Валидация в API | ⬜ **НЕ ВЫПОЛНЕНО** | Требуется добавление |
| Интеграция в боевую систему | ⬜ **НЕ ВЫПОЛНЕНО** | Требуется работа |

---

### checkpoint30_Npc_Rnd.md — Временные NPC
**Статус:** 🟡 ЧАСТИЧНО ВЫПОЛНЕНО

| Задача | Статус | Файл |
|--------|--------|------|
| TempNPC типы | ✅ Готово | `src/types/temp-npc.ts` |
| SessionNPCManager | ✅ Готово | `src/lib/game/session-npc-manager.ts` |
| LocationNPCConfig пресеты | ✅ Готово | В типах |
| API /api/temp-npc | ✅ Готово | `src/app/api/temp-npc/route.ts` |
| Генерация экипировки | ✅ Готово | Через generatedObjectsLoader |
| Интеграция с боевой системой | ⬜ **НЕ ВЫПОЛНЕНО** | Требуется работа |
| UI отображения статистов | 🟡 Частично | NPCViewerDialog |
| Интеграция с перемещением | ⬜ **НЕ ВЫПОЛНЕНО** | Требуется работа |

---

### checkpoint32.md — NPC в сессии и фракции
**Статус:** 🟡 ЧАСТИЧНО ВЫПОЛНЕНО

| Задача | Статус | Примечание |
|--------|--------|------------|
| Preset NPC система | ✅ Готово | preset-npc-spawner.ts |
| 5 тестовых NPC | ✅ Готово | presets/npcs/preset/story.json |
| Схема отношений | ✅ Документировано | relations-system.md |
| Система фракций | ✅ Документировано | faction-system.md |
| API отношений фракций | ⬜ **НЕ ВЫПОЛНЕНО** | Требуется реализация |
| Prisma модели (Nation, Faction) | ⬜ **НЕ ВЫПОЛНЕНО** | Только документация |

---

### chekpoint30.md (Code Review)
**Статус:** 🟡 ЧАСТИЧНО ВЫПОЛНЕНО

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| Токен в .gitignore | 🔴 Критический | ✅ Исправлено |
| Удалить deprecated функции | 🟡 Средний | ⬜ Не выполнено |
| Вынести calculateUpdatedTime | 🟡 Средний | ⬜ Не выполнено |
| Добавить Vitest | 🟡 Средний | ⬜ Не выполнено |
| Unit-тесты | 🟡 Средний | ⬜ Не выполнено |
| Рефакторинг globals PhaserGame | 🟢 Низкий | ⬜ Не выполнено |

---

## 📊 Сводка невыполненных задач

### 🔴 Критический приоритет

| # | Задача | Источник | Описание |
|---|--------|----------|----------|
| K1 | API отношений фракций | checkpoint32 | `/api/relations/check`, `/api/factions/...` |
| K2 | Интеграция TempNPC в бой | checkpoint30_Npc_Rnd | Временные NPC как цели в бою |

### 🟡 Средний приоритет

| # | Задача | Источник | Описание |
|---|--------|----------|----------|
| M1 | Тестирование генерации NPC | checkpoint30 | Разные уровни культивации |
| M2 | Валидация характеристик NPC | checkpoint30 | API валидация |
| M3 | Интеграция формул Lore в бой | checkpoint30 | Использовать формулы в combat-system |
| M4 | Удалить deprecated функции | Code Review | qi-system.ts очистка |
| M5 | Вынести calculateUpdatedTime | Code Review | В time-utils.ts |
| M6 | Добавить тесты | Code Review | Vitest + критические функции |

### 🟢 Низкий приоритет

| # | Задача | Источник | Описание |
|---|--------|----------|----------|
| L1 | Система сетов | checkpoint29 | Полная реализация |
| L2 | Рефакторинг globals | Code Review | Инкапсуляция PhaserGame |
| L3 | World Map в Phaser | Roadmap | Карта мира |
| L3 | Combat Scene с AI | Roadmap | Полноценный бой |

---

## 🎯 План работ

### Фаза 1: Критические задачи (1-2 дня)

#### 1.1 API отношений фракций
```
□ Создать prisma модели: Nation, Faction (расширение Sect)
□ Миграция схемы
□ API: POST /api/relations/check
  - Параметры: sourceId, targetId, context
  - Возврат: disposition, attitude, actionAvailable
□ API: GET /api/factions/{id}
□ Интеграция в NPC interaction
```

#### 1.2 Интеграция TempNPC в бой
```
□ CombatScene распознаёт TEMP_ ID
□ handleCombatTarget поддерживает TempNPC
□ Система лута при убийстве
□ Очистка памяти при смерти
```

### Фаза 2: Средние задачи (3-5 дней)

#### 2.1 Тестирование NPC Generator
```
□ Создать тестовый скрипт
□ Генерация NPC уровней 1-9
□ Проверка формул:
  - Плотность Ци: 2^(level-1)
  - Статы: базовые × множитель_уровня
  - Ёмкость ядра
□ Документировать результаты
```

#### 2.2 Валидация NPC в API
```
□ Добавить Zod схему GeneratedNPC
□ Проверка диапазонов характеристик
□ Валидация уровня культивации
```

#### 2.3 Интеграция Lore в бой
```
□ Использовать qiDensity в расчёте урона
□ Формула проводимости для скорости атаки
□ Буфер меридиан для поглощения урона
```

#### 2.4 Техдолг
```
□ Удалить deprecated из qi-system.ts
□ Создать time-utils.ts
□ Перенести calculateUpdatedTime
```

### Фаза 3: Тестирование (1 неделя)

```
□ Настроить Vitest
□ Тесты для qi-shared.ts
□ Тесты для combat-system.ts
□ Тесты для fatigue-system.ts
□ Тесты для conductivity-system.ts
```

### Фаза 4: Расширение функционала (2+ недели)

```
□ Система сетов предметов
□ World Map в Phaser
□ Combat Scene с AI врагами
□ Рефакторинг PhaserGame globals
```

---

## 📁 Текущее состояние проекта

### Реализованные генераторы ✅

| Генератор | Файл | UI панель |
|-----------|------|-----------|
| Техники | `technique-generator.ts` | `TechniqueGeneratorPanel.tsx` |
| Оружие | `weapon-generator.ts` | `WeaponGeneratorPanel.tsx` |
| Броня | `armor-generator.ts` | `ArmorGeneratorPanel.tsx` |
| Аксессуары | `accessory-generator.ts` | `AccessoryGeneratorPanel.tsx` |
| Расходники | `consumable-generator.ts` | `ConsumableGeneratorPanel.tsx` |
| Камни Ци | `qi-stone-generator.ts` | `QiStoneGeneratorPanel.tsx` |
| Зарядники | `charger-generator.ts` | `ChargerGeneratorPanel.tsx` |
| NPC | `npc-generator.ts` | `NPCGeneratorPanel.tsx` |
| Формации | `formation-generator.ts` | - |

### API endpoints (46 штук)

| Категория | Количество |
|-----------|------------|
| game/* | 5 |
| inventory/* | 8 |
| technique/* | 2 |
| generator/* | 4 |
| cheat* | 5 |
| Прочие | 22 |

### Компоненты UI

| Категория | Файлов |
|-----------|--------|
| game/ | 21 |
| settings/ | 12 |
| ui/ | shadcn/ui |

---

## 🔄 Рекомендации

1. **Обновить чекпоинты** — отметить выполненные задачи
2. **Создать систему автотестов** — критично для стабильности
3. **Документировать API** — Swagger/OpenAPI
4. **CI/CD pipeline** — автоматическая проверка

---

## 📝 Следующий чекпоинт

**Цель:** Фаза 1 — Критические задачи

1. API отношений фракций
2. Интеграция TempNPC в боевую систему

---

---

## 📝 Работа над окружением (2026-03-04)

### Созданные файлы

```
src/types/environment.ts                    # Типы окружения (395 строк)
src/data/presets/environment/
├── rock-presets.ts                         # 9 пресетов камней
├── tree-presets.ts                         # 6 пресетов деревьев
├── ore-presets.ts                          # 7 пресетов руд
├── building-presets.ts                     # 9 пресетов строений
└── index.ts                                # Единый экспорт

src/game/services/
├── environment-texture-generator.ts        # Генератор текстур (900+ строк)
└── environment-manager.ts                  # Менеджер окружения (550+ строк)

src/lib/game/event-bus/client.ts            # Добавлены методы окружения
src/components/game/PhaserGame.tsx          # Интеграция EnvironmentManager

docs/PROJECT_ROADMAP.md                     # Обновлён для v0.7.0
docs/ENVIRONMENT_SYSTEM_PLAN.md             # План системы окружения
```

### Реализованный функционал

#### 1. Генератор текстур (`environment-texture-generator.ts`)
- **Камни**: разные формы (круглые, угловатые, неровные), текстуры (шершавые, кристаллические), блики
- **Деревья**: 4 типа крон (сосна, бамбук, ива, округлая), стволы, духовное свечение
- **Руды**: рудные прожилки, свечение для особых руд, разные размеры
- **Строения**: паттерны (доски, брёвна, солома), детали (двери, окна, ворота)

#### 2. Environment Manager (`environment-manager.ts`)
- Инициализация пресетов
- Генерация тестового полигона (детерминированная с seed)
- Создание объектов (rock, tree, ore, building)
- Проверка столкновений
- Взаимодействие через Event Bus
- Применение урона и разрушение

#### 3. Event Bus интеграция
- `interactWithEnvironment()` - взаимодействие с объектами
- `enterZone()` / `leaveZone()` - вход/выход из зон
- `harvestResource()` - сбор ресурсов

#### 4. Физика столкновений
- Проверка столкновений в update loop
- Блокировка движения при коллизии
- Скольжение вдоль препятствий

### Конфигурация тестового полигона

```typescript
{
  width: 62.5м,    // 2000px
  height: 62.5м,   // 2000px
  rocks: 20,
  trees: 30,
  ores: 12,
  buildings: 8,
  seed: Date.now()
}
```

### Следующие шаги

1. **Визуальное тестирование** — проверить отображение в браузере
2. **Обработка взаимодействий** — серверная часть Event Bus для окружения
3. **Сбор ресурсов** — интеграция с инвентарём
4. **Звуковые эффекты** — звуки разрушения, рубки деревьев

---

## 🎨 Упрощение спрайтов персонажей (2026-03-04)

### Постановка задачи
Переход от 8 направлений к 2 (Восток/Запад) с отзеркаливанием.

### Экономия
- Фреймы: 8 → 1 (**87.5%**)
- Размер текстуры: 512×64 → 64×64
- Сложность рисования: ×8 → ×1

### Документация
**План внедрения:** `docs/SPRITE_SIMPLIFICATION_PLAN.md`

### Этапы
1. Новый генератор `createSimpleDirectionalSprite()` — 1 день
2. Модификация PhaserGame (flipX логика) — 1 день
3. Анимации (idle, walk, attack) — 2 дня
4. Интеграция AI-спрайтов — 1 день (опционально)

### Статус: ✅ РЕАЛИЗОВАНО

### Созданные файлы

```
src/game/services/sprite-loader.ts
├── createSimpleDirectionalSprite()     # Создание 1 спрайта (профиль влево)
├── createAllPlayerAnimations()         # Создание idle/walk/attack
├── shouldFlipSprite()                  # Определение flipX по углу
├── createPlayerAnimationDefs()         # Phaser анимации
└── drawCharacterProfileFrame()         # Отрисовка кадра персонажа
```

### Изменённые файлы

| Файл | Изменение |
|------|-----------|
| `src/components/game/PhaserGame.tsx` | preload() → createAllPlayerAnimations(), create() → createPlayerAnimationDefs(), update() → flipX логика |

### Результат

| Метрика | Было | Стало |
|---------|------|-------|
| Фреймы | 8 | 1 |
| Текстуры | 512×64 | 64×64 |
| Анимации | Нет | idle(4), walk(6), attack(4) |

### Следующие шаги

1. Тестирование в браузере
2. Добавление анимаций для действий (meditation, cultivation)

---

*Документ создан: 2026-03-04*
*Обновлён: 2026-03-04 (Environment System - COMPLETE)*
*Агент: Main Agent*
