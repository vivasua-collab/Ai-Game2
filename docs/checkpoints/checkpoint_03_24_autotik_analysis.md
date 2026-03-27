# Анализ: Почему AutoTick сломал проект

**Дата:** 2024-03-24
**Ветка:** main2d6
**Анализируемый коммит:** 2b95b7f (удалён из main2d5)

---

## 📊 СВОДКА ПРОБЛЕМ

| # | Проблема | Критичность | Файлов затронуто |
|---|----------|-------------|------------------|
| 1 | **Event Channel Mismatch** | 🔴 Критическая | auto-tick.ts, LocationScene.ts |
| 2 | **Инициализация не гарантирована** | 🟠 Высокая | GameTimeSync.tsx, time-integration.ts |
| 3 | **Отсутствие error handling** | 🟡 Средняя | auto-tick.ts |
| 4 | **Мёртвый код** | 🟢 Низкая | useAutoTick.ts |

---

## 🔴 ПРОБЛЕМА #1: Event Channel Mismatch

### Симптом
Игра показывает чёрный экран или зависает. Время не идёт.

### Корневая причина

**В `auto-tick.ts` (строки processTick и pause/resume):**

```typescript
// ✅ РАБОТАЕТ - game:tick отправляется через window
private processTick(): void {
  // ...
  window.dispatchEvent(new CustomEvent('game:tick', { detail: event }));
}

// ❌ НЕ РАБОТАЕТ - pause/resume ТОЛЬКО через EventEmitter
pause(): void {
  this.emit('tick:pause', { tickCount, timestamp });  // ← Только EventEmitter!
  // НЕТ window.dispatchEvent!
}

resume(): void {
  this.emit('tick:resume', { tickCount, timestamp });  // ← Только EventEmitter!
  // НЕТ window.dispatchEvent!
}
```

**В `LocationScene.ts` (строки setupAI):**

```typescript
// ✅ Слушает window события
window.addEventListener('game:tick', this.boundGameTick);    // Приходит!
window.addEventListener('tick:pause', this.boundTickPause);  // НЕ приходит!
window.addEventListener('tick:resume', this.boundTickResume);// НЕ приходит!
```

### Результат рассинхронизации

```
┌─────────────────────────────────────────────────────────────────────┐
│                      РАССИНХРОНИЗАЦИЯ                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  React UI (PauseButton)          Phaser (LocationScene)             │
│  ─────────────────────           ─────────────────────              │
│                                                                     │
│  1. User clicks Pause                                                │
│       │                                                             │
│       ▼                                                             │
│  2. autoTick.pause() called                                         │
│       │                                                             │
│       ├──────────────────► EventEmitter.emit('tick:pause')          │
│       │                      │                                      │
│       │                      ▼                                      │
│       │                 useAutoTick receives                         │
│       │                 isPaused = true ✅                          │
│       │                                                             │
│       │                      X  (window.dispatchEvent НЕ вызван!)   │
│       │                                                             │
│       │                      X  LocationScene НЕ получает событие!  │
│       │                                                             │
│       │                      ▼                                      │
│       │                 Phaser продолжает работать                   │
│       │                 physics.resume() активен                     │
│       │                 tweens продолжаются                          │
│                                                                     │
│  РЕЗУЛЬТАТ:                                                         │
│  - React думает что пауза активна                                   │
│  - Phaser продолжает работать                                       │
│  - При следующем тике: onGameTick() игнорируется (isPaused=false)   │
│  - Полный рассинхрон состояния!                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Попытка исправления предыдущим агентом

```typescript
// Добавлено в pause():
if (typeof window !== 'undefined') {
  window.dispatchEvent(new CustomEvent('tick:pause', {...}));
}
```

**Почему пользователь отклонил:**
> "Говно обновление, ОТКАТЫВАЕМ все обратно"

Вероятно, это исправление создало другие проблемы или не решило основную.

---

## 🟠 ПРОБЛЕМА #2: Инициализация не гарантирована

### Код GameTimeSync.tsx

```typescript
// Компонент монтируется, но что если sessionId ещё не загружен?
useEffect(() => {
  if (sessionId) {
    timeIntegration.initialize(sessionId);  // ← А если нет sessionId?
  }
}, [sessionId]);
```

### Возможные сценарии отказа

1. **sessionId undefined при первом рендере** — timeIntegration не инициализирован
2. **Компонент размонтируется до инициализации** — утечка ресурсов
3. **Race condition между React mount и Phaser init**

---

## 🟡 ПРОБЛЕМА #3: Отсутствие Error Handling

### В auto-tick.ts

```typescript
start(): void {
  this.intervalId = setInterval(() => {
    this.processTick();  // ← Без try-catch!
  }, config.realIntervalMs);
}

private processTick(): void {
  this.emit('tick:auto', event);  // ← Если listener бросит исключение?
  window.dispatchEvent(...);       // ← Если window недоступен?
}
```

Любая ошибка в обработчике тика остановит всю систему молча.

---

## 🟢 ПРОБЛЕМА #4: Мёртвый код

### В useAutoTick.ts (по worklog)

```typescript
// useTimeSync hook - добавлен предыдущим агентом, но не используется
export function useTimeSync() {
  // ... синхронизация с Zustand ...
}
```

---

## 🏗️ АРХИТЕКТУРНЫЙ ДЕФЕКТ

### Главная ошибка проектирования

Система использует **ДВА РАЗНЫХ канала событий** без единой точки координации:

```
                    AutoTickGenerator
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼                               ▼
    EventEmitter (Node)            window (Browser)
    ───────────────────            ─────────────────
    tick:auto ✅                   game:tick ✅
    tick:pause ✅                  tick:pause ❌ (missing!)
    tick:resume ✅                 tick:resume ❌ (missing!)
    tick:start ✅                  (none)
    tick:stop ✅                   (none)
    speed:change ✅                (none)
           │                               │
           ▼                               ▼
    React Components                Phaser LocationScene
    (useAutoTick)                   (window.addEventListener)
```

### Почему это было спроектировано так?

Согласно checkpoint_03_23_autotik.md:

> "Phaser интеграция опциональна для базовой версии"

Это означает, что интеграция с Phaser была добавлена как afterthought, без пересмотра архитектуры событий.

---

## ✅ ПРАВИЛЬНОЕ РЕШЕНИЕ

### Вариант A: Единый канал событий (window)

```typescript
// auto-tick.ts - ВСЕ события через window
private emitWindowEvent(name: string, detail: any): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

// Заменить ВСЕ this.emit() на emitWindowEvent()
pause(): void {
  this.isPaused = true;
  this.emitWindowEvent('tick:pause', { tickCount, timestamp });
}

resume(): void {
  this.isPaused = false;
  this.emitWindowEvent('tick:resume', { tickCount, timestamp });
}
```

### Вариант B: Единый канал событий (EventBus singleton)

```typescript
// Создать глобальный EventBus
class EventBus {
  private static instance: EventBus;
  private emitter = new EventEmitter();

  // Единая точка для React и Phaser
  emit(event: string, data: any): void {
    this.emitter.emit(event, data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
  }
}
```

### Вариант C: Zustand как источник истины (рекомендуется)

```typescript
// stores/time.store.ts
interface TimeStore {
  isPaused: boolean;
  speed: TickSpeed;
  tickCount: number;
  togglePause: () => void;
  setSpeed: (speed: TickSpeed) => void;
}

// React и Phaser читают из одного store
// Phaser подписывается через subscribe()
```

---

## 📋 ПЛАН ИСПРАВЛЕНИЯ

### Фаза 1: Откат и стабилизация
- [x] Откат к рабочей версии (dfc4763)
- [x] Создание ветки main2d6

### Фаза 2: Архитектурные исправления

1. **Унификация канала событий**
   - [ ] Выбрать единый канал (window или Zustand)
   - [ ] Обновить auto-tick.ts
   - [ ] Обновить LocationScene.ts
   - [ ] Обновить useAutoTick.ts

2. **Инициализация**
   - [ ] Гарантировать sessionId перед start()
   - [ ] Добавить проверку готовности

3. **Error Handling**
   - [ ] Обернуть processTick в try-catch
   - [ ] Логировать ошибки

### Фаза 3: Тестирование
- [ ] Проверка pause/resume синхронизации
- [ ] Проверка смены скорости
- [ ] Проверка горячих клавиш

---

## 📚 Ссылки

| Документ | Назначение |
|----------|------------|
| checkpoint_03_23_autotik.md | План реализации (базовый) |
| checkpoint_03_23_review.md | Code review (исправления) |
| worklog.md | Логи предыдущего агента |
| time-system-analysis.md | Теория системы времени |

---

*Анализ выполнен: 2024-03-24*
*Для ветки: main2d6*
