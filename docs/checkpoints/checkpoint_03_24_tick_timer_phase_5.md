# ФАЗА 5: Исправления и Debug (Phase 4 Post-Fix)

**Статус:** ✅ ЗАВЕРШЕНО
**Дата:** 2026-03-24
**Риск:** 🟡 Средний

---

## 🎯 ЦЕЛЬ ФАЗЫ

Зафиксировать все изменения и исправления, сделанные после Phase 4, выявить проблемы интеграции нового TickTimer с существующей системой времени.

---

## 📝 ИСТОРИЯ ИЗМЕНЕНИЙ ПОСЛЕ PHASE 4

### Изменение 1: Исправление togglePause в hook

**Проблема:** 
- `togglePause()` в useTimeStore только менял флаг `isPaused`
- НЕ вызывал методы tickTimer.start()/pause()/resume()
- Таймер не запускался при нажатии кнопки Play

**Решение:**
```typescript
// useTickTimer.ts - Smart toggle
const togglePause = useCallback(() => {
  if (!isRunning) {
    tickTimer.start();  // Не запущен → запустить
  } else if (isPaused) {
    tickTimer.resume(); // На паузе → продолжить
  } else {
    tickTimer.pause();  // Работает → пауза
  }
}, [isRunning, isPaused]);
```

### Изменение 2: Добавлено логирование в TickTimerControls

**Проблема:** 
- Не было понятно, работает ли компонент

**Решение:**
```typescript
// Debug log
console.log('[TickTimerControls] Render:', { isPaused, isRunning, tickCount, speed, formattedTime });

const handleTogglePause = () => {
  console.log('[TickTimerControls] Toggle pause clicked, isPaused:', isPaused, 'isRunning:', isRunning);
  togglePause();
};
```

### Изменение 3: Исправлен SelectValue для отображения speedConfig.label

**Проблема:** 
- SelectValue показывал ID скорости вместо label

**Решение:**
```tsx
<SelectValue placeholder="Скорость">
  {speedConfig.label}
</SelectValue>
```

---

## 🚨 ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ

### Проблема 1: Две параллельные системы времени

**Новая система (TickTimer):**
| Файл | Функция |
|------|---------|
| `src/lib/tick-timer.ts` | Singleton с 1000ms интервалом |
| `src/stores/time.store.ts` | Zustand store |
| `src/hooks/useTickTimer.ts` | React hook |
| `src/components/game/TickTimerControls.tsx` | UI компонент |

**Старая система (WorldTime):**
| Файл | Функция |
|------|---------|
| `src/lib/game/time-system.ts` | WorldTime с year/month/day |
| `src/services/time-tick.service.ts` | processTimeTickEffects() |
| `src/lib/game/time-db.ts` | advanceWorldTime() - запись в БД |

**Конфликт:**
- Новая система НЕ интегрирована со старой
- Медитация использует СТАРУЮ систему
- Накопление Ци работает через СТАРУЮ систему
- БД обновляется только через СТАРУЮ систему

### Проблема 2: Медитация НЕ использует новый TickTimer

**Найдено в `/api/meditation/route.ts`:**
```typescript
// Продвигаем время в БД
await advanceWorldTime(sessionId, actualDurationMinutes);

// Продвигаем время в памяти
truthSystem.advanceTime(sessionId, actualDurationMinutes);
```

**Результат:**
- Медитация продвигает время через TruthSystem
- Новый TickTimer НЕ синхронизируется
- UI показывает время из нового store (не обновляется!)

### Проблема 3: Накопление Ци работает по старому таймеру

**Найдено в `time-tick.service.ts`:**
```typescript
export async function processTimeTickEffects(options) {
  // ...расчёт Ци...
  truthSystem.addQi(sessionId, passiveGain, 'passive', '...');
}
```

**Результат:**
- Пассивная генерация Ци работает через старый API
- Новый TickTimer не триггерит эти эффекты

### Проблема 4: Календарь (year/month/day) только в старой системе

**Старая система:**
```typescript
interface WorldTime {
  year: number;      // 1864
  month: number;     // 1-12
  day: number;       // 1-30
  hour: number;      // 0-23
  minute: number;    // 0-59
  totalMinutes: number;
}
```

**Новая система:**
```typescript
interface GameTime {
  totalMinutes: number;
  day: number;       // Только день
  hour: number;      // 0-23
  minute: number;    // 0-59
}
```

**Отсутствует:**
- year (год)
- month (месяц)
- season (сезон)

### Проблема 5: Запись в БД

**Старая система пишет в БД при каждом вызове:**
```typescript
// time-db.ts
await db.gameSession.update({
  where: { id: sessionId },
  data: {
    worldYear: newYear,
    worldMonth: newMonth,
    worldDay: newDay,
    worldHour: newHour,
    worldMinute: newMinute,
    daysSinceStart: session.daysSinceStart + additionalDays,
  },
});
```

**Новая система:**
- НЕ пишет в БД
- Время хранится только в Zustand store

---

## 📊 СРАВНЕНИЕ СИСТЕМ

| Аспект | Старая (WorldTime) | Новая (TickTimer) |
|--------|-------------------|-------------------|
| Календарь | ✅ year/month/day | ❌ Только day |
| Сезоны | ✅ spring/summer/autumn/winter | ❌ Нет |
| Время суток | ✅ night/dawn/morning/day/evening/dusk | ❌ Нет |
| Медитация | ✅ Интегрирована | ❌ Не используется |
| Ци накопление | ✅ Работает | ❌ Не используется |
| БД запись | ✅ Каждое действие | ❌ Нет |
| UI Controls | ❌ Нет | ✅ Есть |
| Pause/Resume | ❌ Нет | ✅ Есть |
| Скорости | ❌ Нет | ✅ 6 скоростей |

---

## ✅ КРИТЕРИИ ЗАВЕРШЕНИЯ ФАЗЫ 5

- [x] Зафиксированы все изменения после Phase 4
- [x] Выявлены проблемы интеграции двух систем
- [x] Задокументированы различия между системами
- [x] Определены задачи для Phase 6

---

## 📋 ПЕРЕХОД К ФАЗЕ 6

**Phase 6:** Миграция всех таймеров на единую систему TickTimer

См. `checkpoint_03_24_tick_timer_phase_6.md`

---

*Дата завершения:* 2026-03-24
*Следующий этап:* Phase 6 - Миграция
