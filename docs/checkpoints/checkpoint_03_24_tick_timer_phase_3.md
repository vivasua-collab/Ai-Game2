# ФАЗА 3: Интеграция с Phaser

**Статус:** ✅ ЗАВЕРШЕНО
**Дата завершения:** 2026-03-24
**Риск:** 🟠 Высокий
**Зависимость:** Фаза 2 завершена успешно

---

## ⚠️ ВАЖНОЕ ПРЕДУПРЕЖДЕНИЕ

Эта фаза - **самая рискованная**. Именно здесь предыдущая реализация сломалась.

**Ключевой урок из анализа:**
> Phaser слушает `window.addEventListener`, но предыдущий auto-tick отправлял pause/resume через `EventEmitter.emit()` - события НЕ доходили до Phaser.

**Решение:** ВСЕ события отправляем через `window.dispatchEvent`.

---

## 🎯 ЦЕЛЬ ФАЗЫ

Интегрировать TickTimer с Phaser:
- LocationScene получает события 'game:tick'
- Phaser реагирует на pause/resume
- Синхронизация состояния между React и Phaser

---

## 📐 СХЕМА ИНТЕГРАЦИИ

```
┌─────────────────────────────────────────────────────────────────┐
│                    ИНТЕГРАЦИЯ PHASER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   React UI                    Phaser LocationScene              │
│   ─────────                   ─────────────────────             │
│                                                                 │
│   useTimeStore                window.addEventListener           │
│       │                           │                             │
│       │                           ├─► 'game:tick' → onTick()   │
│       │                           │                             │
│       │                           ├─► 'timer:pause' → pause()  │
│       │                           │                             │
│       │                           └─► 'timer:resume' → resume()'│
│       │                                                         │
│       │                                                         │
│   tickTimer                   physics / tweens                  │
│       │                           │                             │
│       ├─► window.dispatchEvent    │                             │
│       │   'game:tick'             │                             │
│       │                           │                             │
│       ├─► window.dispatchEvent    │                             │
│       │   'timer:pause'           │                             │
│       │                           │                             │
│       └─► window.dispatchEvent    │                             │
│           'timer:resume'          │                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 ИЗМЕНЯЕМЫЕ ФАЙЛЫ

### 1. `src/phaser/scenes/LocationScene.ts`

**Добавить подписки на window события:**

```typescript
// === В create() или setupAI() ===

// Привязать методы
this.boundOnGameTick = this.onGameTick.bind(this);
this.boundOnTimerPause = this.onTimerPause.bind(this);
this.boundOnTimerResume = this.onTimerResume.bind(this);

// Подписаться на window события
window.addEventListener('game:tick', this.boundOnGameTick);
window.addEventListener('timer:pause', this.boundOnTimerPause);
window.addEventListener('timer:resume', this.boundOnTimerResume);

// === Добавить методы ===

private onGameTick(event: Event): void {
  const customEvent = event as CustomEvent<TickEventDetail>;
  const { tickCount, gameTime, speed } = customEvent.detail;
  
  // Обновить внутреннее состояние сцены
  this.currentGameTime = gameTime;
  
  // Триггернуть обновление NPC, погоды, и т.д.
  this.events.emit('time-updated', gameTime);
  
  console.log(`[LocationScene] Tick #${tickCount}, Game Time: ${gameTime.hour}:${gameTime.minute}`);
}

private onTimerPause(_event: Event): void {
  console.log('[LocationScene] Timer paused');
  
  // Поставить на паузу physics и tweens
  this.physics.pause();
  this.tweens.pauseAll();
  
  this.events.emit('timer-paused');
}

private onTimerResume(_event: Event): void {
  console.log('[LocationScene] Timer resumed');
  
  // Возобновить physics и tweens
  this.physics.resume();
  this.tweens.resumeAll();
  
  this.events.emit('timer-resumed');
}

// === В shutdown() или destroy() ===

// Отписаться от событий
window.removeEventListener('game:tick', this.boundOnGameTick);
window.removeEventListener('timer:pause', this.boundOnTimerPause);
window.removeEventListener('timer:resume', this.boundOnTimerResume);
```

### 2. Объявления типов (если нужно)

```typescript
// В начале файла
import type { TickEventDetail } from '@/lib/tick-timer';

// Или определить локально
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
```

---

## 📝 ЧЕК-ЛИСТ РЕАЛИЗАЦИИ

```
□ Прочитать текущий LocationScene.ts
□ Найти метод create() или setupAI()
□ Добавить bound методы для event handlers
□ Добавить window.addEventListener для:
  □ 'game:tick'
  □ 'timer:pause'
  □ 'timer:resume'
□ Реализовать onGameTick()
  □ Сохранить gameTime в сцену
  □ Emit внутреннее событие 'time-updated'
□ Реализовать onTimerPause()
  □ this.physics.pause()
  □ this.tweens.pauseAll()
□ Реализовать onTimerResume()
  □ this.physics.resume()
  □ this.tweens.resumeAll()
□ Добавить cleanup в shutdown()
  □ window.removeEventListener для всех событий
□ Добавить логирование для отладки
```

---

## 🧪 ТЕСТЫ ФАЗЫ 3

### Тест 3.1: Базовая работоспособность
```bash
bun run dev

# Ожидается:
□ Проект запускается без ошибок
□ Страница загружается
□ Phaser сцена отображается (НЕ чёрный экран!)
□ Спрайты видны
□ UI элементы работают
```

### Тест 3.2: Phaser получает тики
```typescript
// В консоли браузера запустить таймер:
tickTimer.start();

// Смотреть логи в консоли:
// Ожидается:
□ [TickTimer] Tick #1...
□ [LocationScene] Tick #1, Game Time: ...
□ Логи появляются каждую секунду
```

### Тест 3.3: Pause/Resume синхронизация
```typescript
// Запустить таймер
tickTimer.start();

// Подождать 3 секунды (3 тика)
// Проверить что physics активен (NPC двигаются)

// Нажать паузу
tickTimer.pause();

// Ожидается:
□ [LocationScene] Timer paused
□ NPC останавливаются
□ Анимации останавливаются

// Подождать 3 секунды
// Тиков НЕ должно быть

// Продолжить
tickTimer.resume();

// Ожидается:
□ [LocationScene] Timer resumed
□ NPC начинают двигаться
□ Тики продолжаются
□ tickCount увеличился (но не на время паузы)
```

### Тест 3.4: React UI синхронизирован
```typescript
// Используя UI (если есть) или консоль:

// Проверить начальное состояние
useTimeStore.getState().isPaused; // true

// Запустить
tickTimer.start();
useTimeStore.getState().isPaused; // false
useTimeStore.getState().isRunning; // true

// Поставить на паузу
tickTimer.pause();
useTimeStore.getState().isPaused; // true

// Ожидается:
□ React store и Phaser состояние синхронизированы
□ Нет рассинхронизации
```

### Тест 3.5: Смена скорости во время работы
```typescript
// Запустить таймер
tickTimer.start();

// Установить ultra
useTimeStore.getState().setSpeed('ultra');

// Подождать 3 тика
// При ultra: 3 тика = 3 часа игрового времени

// Проверить gameTime
console.log(useTimeStore.getState().gameTime);

// Ожидается:
□ Скорость меняется "на лету"
□ gameTime растёт быстрее при ultra
□ Phaser продолжает работать стабильно
```

### Тест 3.6: Стресс-тест
```bash
# Запустить таймер на 2 минуты
# Менять скорость каждые 10 секунд
# Ставить на паузу и снимать

# Ожидается:
□ Проект не падает
□ Память не утекает (проверить DevTools)
□ Нет ошибок в консоли
□ После всех манипуляций - стабильная работа
```

---

## ⚠️ ТИПИЧНЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### Проблема: Чёрный экран

**Признаки:** Phaser сцена не рендерится, только чёрный цвет.

**Возможные причины:**
1. Ошибка в LocationScene коде (синтаксическая)
2. Event handler бросает исключение
3. window не определён в SSR контексте

**Решение:**
```typescript
// Добавить проверки
if (typeof window !== 'undefined') {
  window.addEventListener(...);
}
```

### Проблема: Тики не приходят в Phaser

**Признаки:** React показывает тики, но Phaser молчит.

**Возможные причины:**
1. Listener добавлен до инициализации сцены
2. boundOnGameTick не привязан через bind(this)
3. Событие называется неправильно

**Решение:**
```typescript
// Проверить название события
window.dispatchEvent(new CustomEvent('game:tick', {...}));
//                                    ^^^^^^^^^^ должно совпадать
window.addEventListener('game:tick', ...);
//                       ^^^^^^^^^^
```

### Проблема: Рассинхронизация паузы

**Признаки:** React думает что пауза, но Phaser работает.

**Возможные причины:**
1. timer:pause не отправляется через window
2. Listener не добавлен в LocationScene

**Решение:** Убедиться что tick-timer.ts отправляет события через window.dispatchEvent.

---

## 🔄 ОТКАТ

Если тесты не проходят:

```bash
# Откатить изменения в LocationScene.ts
git checkout -- src/phaser/scenes/LocationScene.ts

# Если нужно - откатить tick-timer.ts
git checkout -- src/lib/tick-timer.ts

# Проверить состояние
git status
git log --oneline -5
```

---

## ✅ КРИТЕРИИ ПЕРЕХОДА К ФАЗЕ 4

1. ✅ Все тесты Фазы 3 проходят
2. ✅ Phaser получает события 'game:tick'
3. ✅ Pause/resume синхронизированы между React и Phaser
4. ✅ Нет чёрного экрана
5. ✅ Нет критических ошибок в консоли
6. ✅ NPC/анимации реагируют на паузу

---

**Следующий шаг:** После успешного прохождения тестов → Фаза 4 (UI Controls + cleanup)
