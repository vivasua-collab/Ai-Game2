# ФАЗА 2: Tick Timer Класс

**Статус:** ✅ ЗАВЕРШЕНО
**Дата завершения:** 2026-03-24
**Риск:** 🟡 Средний
**Зависимость:** Фаза 1 завершена успешно

---

## 🎯 ЦЕЛЬ ФАЗЫ

Создать **TickTimer класс**, который:
- Запускает setInterval с интервалом 1000мс (1 секунда)
- Генерирует события через window.dispatchEvent
- Интегрирован с time.store.ts

---

## 📐 ПРИНЦИП РАБОТЫ

```
┌─────────────────────────────────────────────────────────────┐
│                     TickTimer Flow                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  start() ──► setInterval(1000ms)                            │
│                   │                                         │
│                   ▼                                         │
│             processTick()                                   │
│                   │                                         │
│                   ├─► timeStore._incrementTick()            │
│                   │                                         │
│                   ├─► window.dispatchEvent('game:tick')     │
│                   │                                         │
│                   └─► console.log('[TickTimer] tick #N')    │
│                                                             │
│  pause() ──► clearInterval()                                │
│           ──► window.dispatchEvent('game:pause')            │
│                                                             │
│  resume() ──► start()                                       │
│            ──► window.dispatchEvent('game:resume')          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 СОЗДАВАЕМЫЕ ФАЙЛЫ

### 1. `src/lib/tick-timer.ts`

```typescript
import { useTimeStore } from '@/stores/time.store';

interface TickEventDetail {
  tickCount: number;
  gameTime: {
    day: number;
    hour: number;
    minute: number;
    totalMinutes: number;
  };
  speed: string;
  minutesPerTick: number;
  timestamp: number;
}

class TickTimer {
  private static instance: TickTimer | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 1000; // 1 секунда - ФИКСИРОВАНО

  private constructor() {
    // Singleton
  }

  static getInstance(): TickTimer {
    if (!TickTimer.instance) {
      TickTimer.instance = new TickTimer();
    }
    return TickTimer.instance;
  }

  // === PUBLIC API ===

  start(): void {
    if (this.intervalId !== null) {
      console.warn('[TickTimer] Already running');
      return;
    }

    console.log('[TickTimer] Starting...');
    
    this.intervalId = setInterval(() => {
      this.processTick();
    }, this.INTERVAL_MS);

    // Обновить store
    const store = useTimeStore.getState();
    useTimeStore.setState({ 
      isRunning: true, 
      isPaused: false 
    });

    // Emit event
    this.emitEvent('timer:start', {
      tickCount: store.tickCount,
      timestamp: Date.now()
    });
  }

  pause(): void {
    if (this.intervalId === null) {
      console.warn('[TickTimer] Not running');
      return;
    }

    console.log('[TickTimer] Pausing...');
    
    clearInterval(this.intervalId);
    this.intervalId = null;

    const store = useTimeStore.getState();
    useTimeStore.setState({ 
      isPaused: true 
    });

    // Emit event
    this.emitEvent('timer:pause', {
      tickCount: store.tickCount,
      gameTime: store.gameTime,
      timestamp: Date.now()
    });
  }

  resume(): void {
    if (this.intervalId !== null) {
      console.warn('[TickTimer] Already running');
      return;
    }

    console.log('[TickTimer] Resuming...');
    
    this.intervalId = setInterval(() => {
      this.processTick();
    }, this.INTERVAL_MS);

    const store = useTimeStore.getState();
    useTimeStore.setState({ 
      isPaused: false,
      isRunning: true 
    });

    // Emit event
    this.emitEvent('timer:resume', {
      tickCount: store.tickCount,
      timestamp: Date.now()
    });
  }

  stop(): void {
    if (this.intervalId === null) return;

    console.log('[TickTimer] Stopping...');
    
    clearInterval(this.intervalId);
    this.intervalId = null;

    useTimeStore.setState({ 
      isRunning: false, 
      isPaused: true 
    });
  }

  // === INTERNAL ===

  private processTick(): void {
    try {
      const store = useTimeStore.getState();
      
      // Не тикать если на паузе (двойная проверка)
      if (store.isPaused) {
        return;
      }

      // Получить конфиг текущей скорости
      const speedConfig = store.speeds[store.speed];
      const minutesPerTick = speedConfig.minutesPerTick;

      // Обновить gameTime
      const newTotalMinutes = store.gameTime.totalMinutes + minutesPerTick;
      const newGameTime = store._calculateGameTime(newTotalMinutes);

      // Обновить store
      const newTickCount = store.tickCount + 1;
      
      useTimeStore.setState({
        tickCount: newTickCount,
        gameTime: {
          ...newGameTime,
          totalMinutes: newTotalMinutes
        }
      });

      // Логирование (для отладки)
      console.log(`[TickTimer] Tick #${newTickCount} | Game: Day ${newGameTime.day}, ${newGameTime.hour}:${String(newGameTime.minute).padStart(2, '0')} | Speed: ${speedConfig.id}`);

      // Emit game:tick event для Phaser и других listeners
      this.emitEvent('game:tick', {
        tickCount: newTickCount,
        gameTime: {
          ...newGameTime,
          totalMinutes: newTotalMinutes
        },
        speed: store.speed,
        minutesPerTick: minutesPerTick,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('[TickTimer] Error in processTick:', error);
    }
  }

  private emitEvent(eventName: string, detail: any): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
  }
}

// Export singleton
export const tickTimer = TickTimer.getInstance();
export type { TickEventDetail };
```

### 2. Обновление `src/stores/time.store.ts`

Добавить метод `_incrementTick` (если не добавлен в Фазе 1):

```typescript
// Добавить в store:
_incrementTick: () => {
  const state = get();
  const speedConfig = state.speeds[state.speed];
  const newTotalMinutes = state.gameTime.totalMinutes + speedConfig.minutesPerTick;
  
  set({
    tickCount: state.tickCount + 1,
    gameTime: {
      ...state._calculateGameTime(newTotalMinutes),
      totalMinutes: newTotalMinutes
    }
  });
}
```

---

## 📝 ЧЕК-ЛИСТ РЕАЛИЗАЦИИ

```
□ Создать файл src/lib/tick-timer.ts
□ Реализовать singleton pattern
□ Реализовать start() с setInterval(1000ms)
□ Реализовать pause() с clearInterval()
□ Реализовать resume()
□ Реализовать stop()
□ Реализовать processTick() с:
  □ Проверкой isPaused
  □ Вычислением нового gameTime
  □ Emit 'game:tick' event через window
  □ Error handling (try-catch)
□ Добавить логирование для отладки
□ Экспортировать tickTimer singleton
```

---

## 🧪 ТЕСТЫ ФАЗЫ 2

### Тест 2.1: Базовая работоспособность
```bash
bun run dev

# Ожидается:
□ Проект запускается без ошибок
□ Страница загружается
□ Phaser работает (как и раньше)
```

### Тест 2.2: TickTimer доступен
```typescript
// В консоли браузера:
import { tickTimer } from '@/lib/tick-timer';

console.log(tickTimer);

// Ожидается:
□ Объект с методами: start, pause, resume, stop
```

### Тест 2.3: Ручной запуск таймера
```typescript
// В консоли браузера:
import { tickTimer } from '@/lib/tick-timer';
import { useTimeStore } from '@/stores/time.store';

// Запустить таймер
tickTimer.start();

// Подождать 5 секунд...

// Проверить store
console.log(useTimeStore.getState());

// Ожидается:
□ tickCount: 5 (или около того)
□ isRunning: true
□ isPaused: false
□ gameTime увеличился
□ Логи в консоли: [TickTimer] Tick #1, #2, ...
```

### Тест 2.4: Пауза и продолжение
```typescript
// В консоли браузера:
tickTimer.pause();
console.log(useTimeStore.getState().isPaused); // true

// Подождать 3 секунды...
// Тиков НЕ должно быть

tickTimer.resume();
// Подождать 3 секунды...
// Тики должны продолжиться

// Ожидается:
□ pause() останавливает тики
□ resume() продолжает тики
□ tickCount не увеличивается во время паузы
```

### Тест 2.5: Window events
```typescript
// В консоли браузера:
window.addEventListener('game:tick', (e) => {
  console.log('Event received:', e.detail);
});

tickTimer.start();

// Ожидается:
□ События 'game:tick' приходят каждую секунду
□ detail содержит tickCount, gameTime, speed, timestamp
```

### Тест 2.6: Разные скорости
```typescript
// В консоли браузера:
import { useTimeStore } from '@/stores/time.store';

// Установить ultra скорость
useTimeStore.getState().setSpeed('ultra');

tickTimer.start();

// Подождать 3 тика, проверить gameTime
// При ultra: 1 тик = 60 минут
// 3 тика = 180 минут = 3 часа

// Ожидается:
□ При ultra gameTime.hour увеличивается на 1 каждый тик
□ При slow gameTime.minute увеличивается на 1 каждый тик
□ При normal gameTime.minute увеличивается на 5 каждый тик
```

---

## ⚠️ ЧТО НЕ ДЕЛАЕМ В ЭТОЙ ФАЗЕ

- ❌ НЕ интегрируем с Phaser scenes
- ❌ НЕ создаём UI компоненты
- ❌ НЕ подключаем к TruthSystem
- ❌ НЕ удаляем auto-tick.ts (пока)

---

## 🔄 ОТКАТ

Если тесты не проходят:

```bash
# Удалить созданный файл
rm src/lib/tick-timer.ts

# Если меняли time.store.ts - вернуть изменения
git checkout -- src/stores/time.store.ts

# Проверить состояние
git status
```

---

## ✅ КРИТЕРИИ ПЕРЕХОДА К ФАЗЕ 3

1. ✅ Все тесты Фазы 2 проходят
2. ✅ Тики идут каждую секунду
3. ✅ Pause/resume работают корректно
4. ✅ Window events отправляются
5. ✅ Проект работает стабильно

---

**Следующий шаг:** После успешного прохождения тестов → Фаза 3 (Интеграция с Phaser)
