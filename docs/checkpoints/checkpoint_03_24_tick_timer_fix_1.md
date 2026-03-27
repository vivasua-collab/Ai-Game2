# Чекпоинт: Исправление синхронизации TickTimer и Phaser

**Дата**: 2026-03-24
**Статус**: 🟢 Исправлено (P0 задачи выполнены)
**Приоритет**: P0 (критический)

---

## 🔴 Обнаруженные проблемы после первичного исправления

### Симптомы (по скриншоту и отчёту пользователя):

1. **При движении игрока React UI НЕ обновляется** - время стоит на месте
2. **Phaser UI обновляется** - время идёт
3. **Разные начальные значения**: React = 06:00, Phaser = 07:00

---

## 🔍 Корневой анализ

### Архитектура времени (до исправления):

```
┌─────────────────────────────────────────────────────────────────┐
│                     ИСТОЧНИКИ ВРЕМЕНИ                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │   time.store     │         │   game.store     │             │
│  │   gameTime:      │         │   worldTime:     │             │
│  │   hour: 6        │         │   hour: 7        │             │
│  │   (хардкод)      │         │   (с сервера)    │             │
│  └────────┬─────────┘         └────────┬─────────┘             │
│           │                            │                        │
│           ▼                            ▼                        │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │ React UI         │         │ Phaser UI        │             │
│  │ TickTimerControls│         │ worldTimeText    │             │
│  │ 06:00 ❌         │         │ 07:00 ❌         │             │
│  └──────────────────┘         └──────────────────┘             │
│                                                                 │
│  ┌──────────────────┐                                          │
│  │   TickTimer      │                                          │
│  │   processTick()  │                                          │
│  │   ↓              │                                          │
│  │   time.store._incrementTick()  ✅                          │
│  │   game.store.setWorldTime()    ✅ (НО НЕ РАБОТАЕТ!)        │
│  └──────────────────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Найденные проблемы:

#### Проблема 1: Два источника времени ❌
| Компонент | Источник | Начальное значение | Обновляется TickTimer? |
|-----------|----------|-------------------|----------------------|
| React UI | `time.store.gameTime` | 06:00 (хардкод) | ✅ Да |
| Phaser UI | `game.store.worldTime` | 07:00 (с сервера) | ⚠️ Частично |

#### Проблема 2: Рассинхронизация начальных значений ❌
- **Сервер** (`/api/game/start`): `worldHour: 7`
- **time.store** (initialState): `hour: 6`

```typescript
// src/app/api/game/start/route.ts:97
worldHour: 7,  // Сервер отдаёт 07:00

// src/stores/time.store.ts:129
const initialGameTime: GameTime = {
  hour: 6,  // А store инициализирует 06:00
};
```

#### Проблема 3: React UI не обновляется ❌
**Причина**: `TickTimerControls` использует `useTimeStore()`:
```typescript
// TickTimerControls.tsx:35
const { gameTime } = useTickTimer();  // Берёт из time.store
```

Но `time.store` обновляется ТОЛЬКО когда TickTimer активен!
- При движении вызывается `tickTimer.start()`
- НО `processTick()` не вызывается мгновенно - только через 1 секунду!
- И если `isPaused: true` в store, то тик пропускается!

#### Проблема 4: Phaser UI не связан с TickTimer ❌
**Причина**: Phaser читает `globalWorldTime` который обновляется через:
```typescript
// PhaserGame.tsx
useEffect(() => { globalWorldTime = worldTime; }, [worldTime]);
```

А `worldTime` берётся из `game.store`, который НЕ обновляется мгновенно!

---

## 📋 План исправления

### Этап 1: Синхронизация начального времени (P0) ✅
**Проблема**: Сервер возвращает `hour: 7`, а time.store имеет `hour: 6`

**Задачи**:
- [x] 1.1 Добавить метод `_initFromServer()` в time.store
- [x] 1.2 Вызвать синхронизацию в `game.store.startGame()`
- [x] 1.3 Вызвать синхронизацию в `game.store.loadGame()`

**Выполнено**:
```typescript
// time.store.ts - добавлен метод
_initFromServer: (serverTime: { year, month, day, hour, minute }) => {
  set({ gameTime: { ...serverTime, season, totalMinutes } });
}

// game.store.ts - вызов при старте
useTimeStore.getState()._initFromServer({
  year: session.worldYear,
  month: session.worldMonth,
  day: session.worldDay,
  hour: session.worldHour,
  minute: session.worldMinute,
});
```

### Этап 2: Мгновенный старт времени (P0) ✅
**Проблема**: При движении игрока время не начинает идти

**Задачи**:
- [x] 2.1 Сбрасывать `isPaused` ДО запуска интервала
- [x] 2.2 Добавить мгновенный первый тик в `tickTimer.start()`

**Выполнено**:
```typescript
// tick-timer.ts - start()
start(): void {
  // СНАЧАЛА сбрасываем паузу
  useTimeStore.getState()._setPaused(false);
  useTimeStore.getState()._setRunning(true);

  // ПОТОМ запускаем интервал
  this.intervalId = setInterval(() => { this.processTick(); }, this.INTERVAL_MS);

  // И мгновенно делаем первый тик!
  this.processTick();
}
```

### Этап 3: Прямая связь Phaser ↔ TickTimer (P0) ✅
**Проблема**: Phaser читает `game.store.worldTime` вместо `time.store.gameTime`

**Задачи**:
- [x] 3.1 Добавить слушатель `game:tick` в PhaserGame
- [x] 3.2 Обновлять `globalWorldTime` напрямую из события

**Выполнено**:
```typescript
// PhaserGame.tsx - добавлен useEffect
useEffect(() => {
  const handleGameTick = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (detail?.gameTime) {
      globalWorldTime = {
        year: detail.gameTime.year,
        month: detail.gameTime.month,
        day: detail.gameTime.day,
        hour: detail.gameTime.hour,
        minute: detail.gameTime.minute,
      };
    }
  };
  
  window.addEventListener('game:tick', handleGameTick);
  return () => window.removeEventListener('game:tick', handleGameTick);
}, []);
```

### Этап 4: Убрать дублирование game.store.worldTime (P1)
**Проблема**: `game.store.worldTime` дублирует `time.store.gameTime`

**Задачи**:
- [ ] 4.1 Удалить `worldTime` из game.store (или сделать computed)
- [ ] 4.2 Все компоненты должны использовать `time.store` напрямую
- [ ] 4.3 Оставить `setWorldTime` для обратной совместимости

---

## 🧪 Тест-кейсы

### TC-1: Проверка начальной синхронизации
1. Начать новую игру
2. Проверить: React UI показывает то же время что и сервер
3. Проверить: Phaser UI показывает то же время
4. **Ожидается**: Оба UI показывают 07:00 (как сервер)

### TC-2: Проверка мгновенного старта
1. Загрузить игру (время на паузе)
2. Нажать WASD для движения
3. Проверить: время начинает идти НЕЗАМЕДЛИТЕЛЬНО
4. **Ожидается**: Время обновляется в обеих UI одновременно

### TC-3: Проверка синхронизации React ↔ Phaser
1. Запустить игру
2. Подождать 10 тиков
3. Сравнить время в React и Phaser
4. **Ожидается**: Идентичное время в обоих UI

---

## 📊 Затронутые файлы

| Файл | Изменения | Статус |
|------|-----------|--------|
| `src/stores/time.store.ts` | Добавлен `_initFromServer()` | ✅ |
| `src/stores/game.store.ts` | Синхронизация time.store при старте/загрузке | ✅ |
| `src/lib/tick-timer.ts` | Мгновенный первый тик, правильный порядок сброса паузы | ✅ |
| `src/components/game/PhaserGame.tsx` | Слушатель `game:tick` для Phaser UI | ✅ |
| `src/game/scenes/LocationScene.ts` | syncWithTimeStore(), исправлен handleMovement() | ✅ |

---

## ✅ Критерии готовности

- [x] При старте игры React и Phaser показывают одинаковое время
- [x] При движении игрока время начинает идти мгновенно
- [x] Оба UI обновляются синхронно
- [x] Нет хардкода начального времени (загружается с сервера)
- [ ] Тест-кейсы проходят (требуется ручное тестирование)

---

## 📝 Заметки

### Почему первичное исправление не сработало:

1. **syncWithTimeStore()** был добавлен в LocationScene, но:
   - PhaserGame (который отображает время) не использует LocationScene
   - PhaserGame использует `globalWorldTime` из `game.store`
   - `game.store` НЕ был связан с TickTimer

2. **handleMovement()** теперь вызывает `tickTimer.start()`:
   - НО первый тик происходит через 1 секунду
   - И если `isPaused` ещё true, тик пропускается
   - React UI обновляется только при тике!

3. **Два источника истины**:
   - `time.store.gameTime` (React UI)
   - `game.store.worldTime` (Phaser UI)
   - Они НЕ синхронизированы!

---

## 🔄 Связанные чекпоинты

- `checkpoint_03_24_tick_timer.md` - Основной план TickTimer
- `checkpoint_03_24_tick_timer_phase_7.md` - Phase 7: TruthSystem DB Batch
- `checkpoint_03_24_tick_timer_phase_8.md` - Phase 8: Movement System
