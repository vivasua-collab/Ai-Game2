# Чекпоинт: Исправление скорости и ограничение ultra-режима

**Дата создания**: 2026-03-24 16:51 UTC
**Дата обновления**: 2026-03-24 19:45 UTC
**Статус**: 🟢 Выполнено
**Приоритет**: P0 (критический)

---

## 📋 ИСТОРИЯ ИЗМЕНЕНИЙ

### Версия 1.0 (2026-03-24 16:51)
- ✅ Исправлена инверсия скорости движения
- ✅ Использована функция `scaleMovementSpeedInverse()`

### Версия 2.0 (2026-03-24 19:30) - ТЕКУЩАЯ
- ✅ Пересмотр множителей скорости: normal = 1 мин/тик
- ✅ Удалён режим "Точный" (superSlow)
- ✅ slow теперь 0.5 мин/тик (как бывший "Точный")
- ✅ Ограничение ultra скорости на локации (кроме медитации)
- ✅ Диалог предупреждения для ultra скорости
- 🐛 **ИСПРАВЛЕНО**: Двойной вызов `advanceTime` в time-tick.service.ts
- 🐛 **ИСПРАВЛЕНО**: Null pointer в PhaserGame.tsx (physics.resume/pause)

---

## 🔴 ПРОБЛЕМА #1: ИНВЕРСИЯ СКОРОСТИ ДВИЖЕНИЯ (ИСПРАВЛЕНО)

**Статус**: ✅ Исправлено в версии 1.0

**Симптомы**:
- При медленной скорости времени (slow) игрок двигался слишком быстро
- При быстрой скорости времени (fast) игрок двигался слишком медленно

**Корневая причина**:
Неправильная формула масштабирования скорости в функции `scaleMovementSpeed()`.

**Решение**: Использовать `scaleMovementSpeedInverse()`

```typescript
// ПРАВИЛЬНАЯ формула:
export function scaleMovementSpeedInverse(baseSpeed: number, speed: TickSpeedId): number {
  return baseSpeed / TIME_SCALING_FACTORS[speed];
}
```

---

## 🔴 ПРОБЛЕМА #2: НЕОПТИМАЛЬНАЯ БАЗОВАЯ СКОРОСТЬ

**Статус**: 🔄 В процессе

**Требование пользователя**:
> Обычная скорость должна быть 1 тик = 1 минута, во избежании лагов

**Анализ**:
Текущая конфигурация:
- normal = 5 мин/тик → за 1 секунду реального времени проходит 5 минут игрового
- Это может вызывать визуальные "прыжки" времени на UI

Новое требование:
- normal = 1 мин/тик → плавное обновление времени каждую секунду

**Влияние на TIME_SCALING_FACTORS**:

| Speed | minutesPerTick | Factor | Description |
|-------|----------------|--------|-------------|
| superSuperSlow | 0.25 (15 сек) | 4.0 | Боевой режим |
| slow | 0.5 (30 сек) | 2.0 | Медленный (бывший "Точный") |
| normal | 1 мин | 1.0 | Обычный |
| fast | 5 мин | 0.2 | Путешествие |
| ultra | 60 мин (1 час) | 0.017 | Медитация (ограничено!) |

**Изменения v2.0**:
- ❌ Удалён режим `superSlow` (Точный)
- ✅ `slow` теперь 0.5 мин/тик (параметры бывшего "Точного")

---

## 🔴 ПРОБЛЕМА #3: ULTRA СКОРОСТЬ НА ЛОКАЦИИ

**Статус**: ⏳ Требует реализации

**Требование пользователя**:
> Максимальную скорость нельзя включить на локации (или выводить предупреждение для включения, если да - включать, если нет, оставаться на текущей скорости), кроме момента медитации

**Реализация**:
1. Проверка в `setSpeed()` - запрет ultra на локации
2. Исключение для медитации (флаг `allowUltraSpeed`)
3. Диалог подтверждения для ultra скорости

### Таблица скоростей с ограничениями:

| Speed | На локации | При медитации | В путешествии |
|-------|-----------|---------------|---------------|
| superSuperSlow | ✅ Разрешено | ✅ | ✅ |
| superSlow | ✅ Разрешено | ✅ | ✅ |
| slow | ✅ Разрешено | ✅ | ✅ |
| normal | ✅ Разрешено | ✅ | ✅ |
| fast | ✅ Разрешено | ✅ | ✅ |
| ultra | ⚠️ С предупреждением | ✅ Разрешено | ✅ Разрешено |

---

## 📝 ЗАДАЧИ

### Выполнено:
- [x] Исправить инверсию скорости (scaleMovementSpeedInverse)
- [x] Анализ текущей системы скоростей
- [x] Изменить normal: 5 мин/тик → 1 мин/тик
- [x] Пересчитать TIME_SCALING_FACTORS для новой базы (1/min)
- [x] Удалить режим "Точный" (superSlow)
- [x] Изменить slow: 1 мин/тик → 0.5 мин/тик
- [x] Добавить проверку на ultra скорость
- [x] Добавить диалог подтверждения для ultra (AlertDialog)
- [x] Интегрировать activityManager для определения режима

### Результаты:
✅ **Проблема #2 решена**: normal теперь 1 мин/тик (плавное время)
✅ **Проблема #3 решена**: ultra скорость требует подтверждения на локации
✅ **Проблема #4 решена**: Двойной advanceTime в time-tick.service.ts
✅ **Проблема #5 решена**: Null pointer в PhaserGame.tsx physics

---

## 🔴 ПРОБЛЕМА #4: ДВОЙНОЙ ADVANCE TIME (ПРЫЖКИ ВРЕМЕНИ)

**Статус**: ✅ Исправлено

**Симптомы**:
- Время произвольно прыгает на большее значение
- Затем возвращается обратно

**Корневая причина**:
В `src/services/time-tick.service.ts` функция `advanceTime` вызывалась **ДВАЖДЫ**:

```typescript
// Строка 181 - первый вызов:
const timeResult = truthSystem.advanceTime(sessionId, ticks);

// Строка 287 - второй вызов (ДУБЛИРОВАНИЕ!):
truthSystem.advanceTime(sessionId, ticks);  // ← УДАЛЕНО!
```

**Результат**: Время продвигалось ДВАЖДЫ за один тик!

**Решение**: Удалён дублирующий вызов на строке 287.

---

## 🔴 ПРОБЛЕМА #5: NULL POINTER В PHASER GAME

**Статус**: ✅ Исправлено

**Симптомы**:
```
Runtime TypeError
can't access property "resume", this.world is null
can't access property "pause", this.world is null
```

**Корневая причина**:
Обработчики событий таймера вызывали `scene.physics.pause()` и `scene.physics.resume()` 
без проверки существования physics world.

**Решение**:
```typescript
// До (ошибка):
scene.physics.pause();

// После (безопасно):
if (scene.physics?.world) {
  scene.physics.pause();
}
```

Исправлены: `handleTimerPause`, `handleTimerResume`, `handleTimerStart`
✅ Удалён лишний режим "Точный"
✅ slow = 0.5 мин/тик (как бывший "Точный")
✅ Исключение для медитации: ultra включается без диалога
✅ Исключение для отдыха: ultra включается без диалога

---

## 📊 АРХИТЕКТУРНЫЙ АНАЛИЗ ТАЙМЕРА

### Единый источник истины (Single Source of Truth)

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIME SYSTEM ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  useTimeStore (Zustand)                                         │
│  ├── isPaused: boolean                                          │
│  ├── isRunning: boolean                                         │
│  ├── speed: TickSpeedId                                         │
│  ├── gameTime: GameTime                                         │
│  └── tickCount: number                                          │
│                                                                 │
│  TickTimer (Singleton)                                          │
│  ├── interval: 1000ms (FIXED)                                   │
│  ├── start() → emits 'timer:start'                              │
│  ├── pause() → emits 'timer:pause'                              │
│  ├── resume() → emits 'timer:resume'                            │
│  └── processTick() → emits 'game:tick'                          │
│                                                                 │
│  Events (window.dispatchEvent)                                   │
│  ├── timer:start → Phaser.Resume                                │
│  ├── timer:pause → Phaser.Pause                                 │
│  ├── timer:resume → Phaser.Resume                               │
│  └── game:tick → Phaser.UpdateTime                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Фундаментальное правило

```
1 TICK = 1 SECOND REAL TIME (FIXED, NEVER CHANGES)

Variable: minutesPerTick = сколько игрового времени проходит за тик

ФИНАЛЬНАЯ КОНФИГУРАЦИЯ (v2.0):
| Speed | minutesPerTick | Factor | Description |
|-------|----------------|--------|-------------|
| superSuperSlow | 0.25 (15 сек) | 4.0 | Боевой режим |
| slow | 0.5 (30 сек) | 2.0 | Медленный (бывший "Точный") |
| normal | 1 мин | 1.0 | Обычный |
| fast | 5 мин | 0.2 | Путешествие |
| ultra | 60 мин (1 час) | 0.017 | Медитация (ограничено!) |
```

---

## 🔍 АУДИТ КОДА ТАЙМЕРА

### Файлы с таймером/временем:

| Файл | Назначение | Статус |
|------|------------|--------|
| `src/stores/time.store.ts` | Zustand store для времени | ✅ Корректен |
| `src/lib/tick-timer.ts` | Singleton таймер | ✅ Корректен |
| `src/lib/game/time-scaling.ts` | Масштабирование скорости | ✅ Исправлено |
| `src/lib/game/activity-manager.ts` | Авто-переключение speed | ✅ Корректен |
| `src/lib/game/action-speeds.ts` | Профили активностей | ✅ Корректен |
| `src/game/scenes/LocationScene.ts` | Интеграция с Phaser | ✅ Исправлено |
| `src/components/game/PhaserGame.tsx` | Training Ground | ✅ Исправлено |

### Синхронизация React ↔ Phaser:

```
React UI                         Phaser Game
   │                                  │
   │  useTimeStore.getState()         │
   │         │                        │
   │         ▼                        │
   │  tickTimer.start() ──────────────┼──► window.dispatchEvent('timer:start')
   │         │                        │           │
   │         ▼                        │           ▼
   │  _setPaused(false)               │    onTimerStart()
   │  _setRunning(true)               │    ├── isGamePaused = false
   │                                  │    ├── physics.resume()
   │                                  │    └── tweens.resumeAll()
   │                                  │
   │  tickTimer.pause() ──────────────┼──► window.dispatchEvent('timer:pause')
   │         │                        │           │
   │         ▼                        │           ▼
   │  _setPaused(true)                │    onTimerPause()
   │                                  │    ├── isGamePaused = true
   │                                  │    ├── physics.pause()
   │                                  │    └── tweens.pauseAll()
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Тест-кейсы для проверки:

#### TC-1: Масштабирование скорости
1. Установить speed = normal → игрок двигается с базовой скоростью 200 px/sec
2. Установить speed = slow → та же скорость (factor = 1.0)
3. Установить speed = fast → игрок двигается быстрее (200 / 0.2 = 1000 px/sec)

#### TC-2: Ограничение ultra скорости
1. На локации: попытка включить ultra → показать диалог
2. В диалоге: "Да" → включить ultra, "Нет" → остаться на текущей
3. При медитации: ultra включается без диалога

#### TC-3: Авто-снятие паузы
1. Игра на паузе
2. Нажать WASD
3. Время должно начать идти
4. Персонаж должен двигаться

#### TC-4: Синхронизация React-Phaser
1. Время в React UI должно совпадать с временем в Phaser
2. При смене speed в UI, скорость персонажа должна меняться

---

## 📁 ИЗМЕНЁННЫЕ ФАЙЛЫ

### Версия 1.0:
1. **src/game/scenes/LocationScene.ts**
   - Заменён импорт `scaleMovementSpeed` → `scaleMovementSpeedInverse`
   - Исправлено масштабирование скорости игрока

2. **src/components/game/PhaserGame.tsx**
   - Заменён импорт `scaleMovementSpeed` → `scaleMovementSpeedInverse`
   - Исправлено масштабирование скорости игрока на Training Ground

### Версия 2.0 (выполнено):
1. **src/stores/time.store.ts**
   - Изменён `normal.minutesPerTick`: 5 → 1
   - Изменён `fast.minutesPerTick`: 15 → 5
   - ❌ Удалён режим `superSlow` (Точный)
   - ✅ Изменён `slow.minutesPerTick`: 1 → 0.5
   - Обновлены описания

2. **src/lib/game/time-scaling.ts**
   - Обновлены `TIME_SCALING_FACTORS` для новой базы (1/min)
   - Формула: `1 / minutesPerTick`
   - ❌ Удалён `superSlow` из факторов
   - ✅ `slow` теперь 2.0 (бывший superSlow)
   - Обновлена функция `isCombatSpeed()`

3. **src/components/game/TickTimerControls.tsx**
   - Добавлен импорт `activityManager` для определения режима
   - Добавлен импорт `AlertDialog` компоненты
   - Добавлена логика проверки ultra скорости
   - Добавлен диалог подтверждения для ultra скорости
   - Добавлен индикатор ⚠️ для ultra в селекторе

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ

1. ✅ Исправить инверсию скорости
2. ✅ Изменить normal на 1 мин/тик
3. ✅ Добавить ограничение ultra скорости
4. ✅ Добавить диалог подтверждения
5. ⏳ Протестировать на тренировочном полигоне
6. ⏳ Выгрузить на GitHub (ветка main2d6)

---

**АВТОР**: Claude Code
**ВЕРСИЯ**: 2.0
**СТАТУС**: 🟢 Выполнено
