# ФАЗА 7: Интеграция TickTimer - Этапы реализации

**Статус:** ✅ ЗАВЕРШЕНО (7/7 этапов)
**Дата создания:** 2026-03-24
**Дата обновления:** 2026-03-24
**Родитель:** checkpoint_03_24_tick_timer_phase_6.md (детальный анализ)
**Риск:** 🟠 Высокий
**Зависимость:** Фаза 5 завершена

---

## 🎯 ЦЕЛЬ ФАЗЫ

Последовательная интеграция всех систем времени в TickTimer с промежуточным тестированием каждого этапа.

---

## 📊 СВОДКА ПРОГРЕССА

| Этап | Описание | Приоритет | Время | Статус |
|------|----------|-----------|-------|--------|
| 7.1 | Расширить GameTime | P0 | 1.5ч | ✅ ЗАВЕРШЕНО |
| 7.2 | QiTickProcessor | P0 | 2ч | ✅ ЗАВЕРШЕНО |
| 7.3 | TruthSystem Sync | P0 | 2ч | ✅ ЗАВЕРШЕНО |
| 7.4 | Meditation API | P0 | 2ч | ✅ ЗАВЕРШЕНО |
| 7.5 | Rest API | P0 | 1.5ч | ✅ ЗАВЕРШЕНО |
| 7.6 | DB оптимизация | P1 | 1ч | ✅ ЗАВЕРШЕНО |
| 7.7 | Очистка кода | P2 | 1ч | ✅ ЗАВЕРШЕНО |

**Прогресс:** 7/7 этапов (100%)
**Завершено:** 2026-03-24

---

## ✅ ЭТАП 7.1: Расширение GameTime — ЗАВЕРШЕНО

**Commit:** cfa09c8

**Выполнено:**
- [x] Добавлены `year`, `month`, `season` в GameTime интерфейс
- [x] Обновлён `_calculateGameTime()` для расчёта полной даты
- [x] START_YEAR = 1864 (Э.С.М.)
- [x] Добавлены утилиты: `getTimeOfDay()`, `getSeasonFromMonth()`, `formatGameDateTime()`

**Файлы:**
- `src/stores/time.store.ts` — обновлён

---

## ✅ ЭТАП 7.2: QiTickProcessor — ЗАВЕРШЕНО

**Commit:** cfa09c8

**Выполнено:**
- [x] Создан `src/lib/game/qi-tick-processor.ts`
- [x] Создан `src/app/api/qi/tick/route.ts`
- [x] Batch обработка каждые 10 тиков
- [x] Интегрирован в TickTimer через `setQiProcessor()`

**Файлы:**
- `src/lib/game/qi-tick-processor.ts` — новый
- `src/app/api/qi/tick/route.ts` — новый
- `src/lib/tick-timer.ts` — обновлён

---

## ✅ ЭТАП 7.3: TruthSystem Sync — ЗАВЕРШЕНО

**Commit:** cfa09c8

**Выполнено:**
- [x] Добавлен `setupTickTimerSync()` для слушания game:tick
- [x] Добавлен `syncWorldTime()` для синхронизации с time.store
- [x] Batch сохранение каждые 60 тиков (1 мин реального времени)
- [x] Удалена зависимость от setInterval автосохранения

**Файлы:**
- `src/lib/game/truth-system.ts` — обновлён

---

## ✅ ЭТАП 7.4: Миграция Meditation API — ЗАВЕРШЕНО

**Commit:** e195152
**Время:** 2ч
**Тип:** Серверная миграция

**Задача:** Убрать дублирование времени в медитации

**Проблема:**
```typescript
// ДВА вызова для продвижения времени!
await advanceWorldTime(sessionId, minutes);  // БД
truthSystem.advanceTime(sessionId, minutes);  // память
```

**Решение:**
- Удалён импорт `advanceWorldTime` из meditation/route.ts
- Заменены 3 вызова `advanceWorldTime()` на `truthSystem.advanceTime()`
- Время теперь управляется ТОЛЬКО через TruthSystem
- TruthSystem синхронизируется с TickTimer через game:tick

**Файлы:**
- `src/app/api/meditation/route.ts` — обновлён

**Тест 7.4:**
```
✅ Медитация работает через API
✅ Время продвигается корректно
✅ Ци накапливается
✅ Нет дублирования вызовов времени
✅ TruthSystem обновлён
```

---

## ✅ ЭТАП 7.5: Миграция Rest API — ЗАВЕРШЕНО

**Commit:** e195152
**Время:** 1.5ч
**Тип:** Серверная миграция

**Задача:** Убрать дублирование времени в отдыхе

**Проблема:**
```typescript
// time-tick.service.ts
const timeResult = await advanceWorldTime(sessionId, ticks);
```

**Решение:**
- Удалён импорт `advanceWorldTime` из time-tick.service.ts
- Заменён вызов на `truthSystem.advanceTime(sessionId, ticks)`
- Rest API теперь использует единую точку времени

**Файлы:**
- `src/services/time-tick.service.ts` — обновлён

**Тест 7.5:**
```
✅ Отдых работает через API
✅ Время продвигается корректно
✅ Усталость восстанавливается
✅ Нет дублирования вызовов времени
```

---

## ✅ ЭТАП 7.6: DB оптимизация (P1) — ЗАВЕРШЕНО

**Архитектура решения (клиент-сервер):**

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEDITATION FLOW v2                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   CLIENT (React UI):                                            │
│   1. Пользователь выбирает длительность медитации               │
│   2. UI отправляет запрос: POST /api/meditation                 │
│   3. UI показывает прогресс-бар                                 │
│                                                                 │
│   SERVER (API Route):                                           │
│   1. Получает durationMinutes                                   │
│   2. Рассчитывает ticks = durationMinutes / minutesPerTick      │
│   3. Выполняет расчеты:                                         │
│      - Накопление Ци (кондуктивность × время)                   │
│      - Восстановление ментальной усталости                      │
│      - Возможные события медитации (прорыв, помехи)             │
│   4. Обновляет БД (batch)                                       │
│   5. Возвращает результат клиенту                               │
│                                                                 │
│   ВАЖНО: НЕ использовать time.store._incrementTick()!           │
│   Медитация — это "прыжок" во времени, не реальный тик.         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Изменения:**

1. **Сервер (API):**
```typescript
// src/app/api/meditation/route.ts

export async function POST(request: Request) {
  const { sessionId, characterId, durationMinutes } = await request.json();

  // Расчёт на сервере
  const ticks = Math.ceil(durationMinutes / 60); // ultra speed
  const qiGain = calculateMeditationQi(character, ticks);
  const fatigueRecovery = calculateFatigueRecovery(durationMinutes);

  // Обновить БД
  await prisma.$transaction([
    prisma.character.update({
      where: { id: characterId },
      data: {
        currentQi: { increment: qiGain },
        mentalFatigue: { decrement: fatigueRecovery },
      }
    }),
    advanceWorldTime(sessionId, durationMinutes),
  ]);

  // Обновить TruthSystem
  truthSystem.advanceTime(sessionId, durationMinutes);

  return json({ success: true, qiGain, fatigueRecovery });
}
```

2. **Клиент (UI):**
```typescript
// После успешного API вызова - обновить time.store
const result = await fetch('/api/meditation', { ... });
if (result.success) {
  // Синхронизировать UI с серверным временем
  useTimeStore.getState()._syncFromServer(result.newWorldTime);
}
```

**Тест 7.4:**
```
□ Медитация работает через API
□ Время продвигается на сервере
□ Ци накапливается корректно
□ UI синхронизируется после завершения
□ TruthSystem обновлён
```

---

## ✅ ЭТАП 7.6: DB оптимизация (P1) — ЗАВЕРШЕНО

**Реализовано:** В TruthSystem уже есть batch сохранение:
```typescript
// truth-system.ts
private tickCounter: number = 0;
private readonly SAVE_INTERVAL: number = 60; // 1 минута реального времени

private onGameTick(sessionId: string, detail: { gameTime: unknown; tickCount: number }): void {
  // Sync worldTime from gameTime
  // ...
  
  // Batch save every N ticks
  if (this.tickCounter >= this.SAVE_INTERVAL) {
    this.tickCounter = 0;
    if (session.isDirty) {
      this.quickSave(sessionId);
    }
  }
}
```

**Тест 7.6:**
```
✅ Время НЕ записывается при каждом тике
✅ Запись происходит каждые 60 тиков (1 минута)
✅ Пауза триггерит сохранение через quickSave
✅ Нет лишних запросов к БД
```

---

## ✅ ЭТАП 7.7: Очистка старого кода (P2) — ЗАВЕРШЕНО

**Анализ:** Старые файлы НЕЛЬЗЯ удалить, т.к. содержат нужную функциональность:

**time-system.ts — используется:**
- `formatTime()`, `formatDate()`, `formatDuration()` — UI компоненты
- `roundMeditationTime()` — RestDialog
- `WorldTime` тип — несколько компонентов

**time-tick.service.ts — используется:**
- `processTimeTickEffects()` — /api/rest/route.ts
- `quickProcessQiTick()` — /api/game/move/route.ts, event-bus/handlers/movement.ts

**Ключевое изменение:**
- ❌ Удалён прямой вызов `advanceWorldTime()` из time-db.ts
- ✅ Время управляется через `TruthSystem.advanceTime()`
- ✅ TruthSystem синхронизируется с TickTimer через game:tick

**Тест 7.7:**
```
✅ advanceWorldTime() НЕ вызывается напрямую в API
✅ Все API используют TruthSystem.advanceTime()
✅ time-system.ts используется только для утилит форматирования
✅ time-tick.service.ts используется для расчётов Ци/усталости
```

---

## 🔧 ДОПОЛНИТЕЛЬНЫЕ СИСТЕМЫ (НЕ ТРЕБУЮТ МИГРАЦИИ)

Эти системы уже работают корректно с deltaTime/tick:

| Файл | Статус | Примечание |
|------|--------|------------|
| condition-manager.ts | ✅ OK | tickConditions(deltaTime) |
| condition-effects.ts | ✅ OK | processTick(deltaTime) |
| training-system.ts | ✅ OK | processTrainingTick() |
| bleeding-system.ts | ✅ OK | processAllBleedings() |
| npc-ai.ts | ⚠️ Внимание | Свой setInterval — можно мигрировать позже |

---

## ⚠️ РИСКИ

1. **Поломка медитации** — тестировать параллельно
2. **Рассинхронизация времени** — единая точка истины (time.store)
3. **Потеря данных** — backup БД перед миграцией

---

## 📂 ЗАТРАГИВАЕМЫЕ ФАЙЛЫ

### Новые файлы (созданы)
- `src/lib/game/qi-tick-processor.ts` ✅
- `src/app/api/qi/tick/route.ts` ✅

### Изменяемые файлы
- `src/stores/time.store.ts` ✅ (7.1)
- `src/lib/tick-timer.ts` ✅ (7.2)
- `src/lib/game/truth-system.ts` ✅ (7.3)
- `src/app/api/meditation/route.ts` (7.4)
- `src/app/api/rest/route.ts` (7.5)

### Деактивируемые файлы (7.7)
- `src/services/time-tick.service.ts`
- `src/lib/game/time-system.ts`

---

## 🔗 СВЯЗЬ С PHASE 8

**Координация работ:**

```
Phase 7 (серверные API):
├── 7.4 Meditation API ────► Серверные расчёты
├── 7.5 Rest API ──────────► Серверные расчёты
├── 7.6 DB оптимизация ────► Batch сохранение
└── 7.7 Cleanup ───────────► Удаление старого кода

Phase 8 (клиентские фиксы):
├── 8.1 Phaser Calendar Sync ► Использует GameTime из 7.1 ✅
├── 8.2 Pause Movement Lock ► Независимо
├── 8.3 Movement System ───► Независимо
└── 8.4-8.5 Action Queue ──► Зависит от 7.4-7.5

РЕКОМЕНДАЦИЯ:
Сначала завершить 8.1-8.2 (клиентские фиксы),
затем 7.4-7.5 (серверные миграции).
```

---

**Следующий шаг:** Phase 8.3 (Movement Time System)

*Дата обновления:* 2026-03-24
