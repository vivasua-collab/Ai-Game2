# ФАЗА 4: UI Controls + Cleanup

**Статус:** ✅ ЗАВЕРШЕНО
**Дата завершения:** 2026-03-24
**Риск:** 🟡 Средний
**Зависимость:** Фаза 3 завершена успешно

---

## 🎯 ЦЕЛЬ ФАЗЫ

1. Создать UI компоненты для управления временем
2. Интегрировать с существующим UI
3. Удалить старый код (auto-tick.ts, useAutoTick.ts)
4. Финальное тестирование всей системы

---

## 📁 СОЗДАВАЕМЫЕ ФАЙЛЫ

### 1. `src/hooks/useTickTimer.ts`

```typescript
import { useEffect, useCallback } from 'react';
import { useTimeStore } from '@/stores/time.store';
import { tickTimer } from '@/lib/tick-timer';

export function useTickTimer() {
  const { 
    isPaused, 
    isRunning, 
    tickCount, 
    speed, 
    gameTime, 
    speeds,
    togglePause, 
    setSpeed 
  } = useTimeStore();

  // Запустить таймер при первом использовании
  useEffect(() => {
    // Автостарт если не запущен
    if (!isRunning && !isPaused) {
      tickTimer.start();
    }
  }, []);

  // Управление
  const start = useCallback(() => {
    tickTimer.start();
  }, []);

  const pause = useCallback(() => {
    tickTimer.pause();
  }, []);

  const resume = useCallback(() => {
    tickTimer.resume();
  }, []);

  const stop = useCallback(() => {
    tickTimer.stop();
  }, []);

  const cycleSpeed = useCallback(() => {
    const speedIds = Object.keys(speeds) as Array<keyof typeof speeds>;
    const currentIndex = speedIds.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speedIds.length;
    setSpeed(speedIds[nextIndex]);
  }, [speed, speeds, setSpeed]);

  return {
    // State
    isPaused,
    isRunning,
    tickCount,
    speed,
    gameTime,
    speeds,
    
    // Computed
    speedConfig: speeds[speed],
    formattedTime: formatGameTime(gameTime),
    
    // Actions
    start,
    pause,
    resume,
    stop,
    togglePause,
    setSpeed,
    cycleSpeed
  };
}

function formatGameTime(gameTime: { day: number; hour: number; minute: number }): string {
  const hourStr = String(gameTime.hour).padStart(2, '0');
  const minStr = String(gameTime.minute).padStart(2, '0');
  return `День ${gameTime.day}, ${hourStr}:${minStr}`;
}
```

### 2. `src/components/TickTimerControls.tsx`

```tsx
'use client';

import { useTickTimer } from '@/hooks/useTickTimer';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Gauge 
} from 'lucide-react';

export function TickTimerControls() {
  const {
    isPaused,
    tickCount,
    speed,
    speeds,
    formattedTime,
    speedConfig,
    togglePause,
    setSpeed,
    cycleSpeed
  } = useTickTimer();

  return (
    <div className="flex items-center gap-2 p-2 bg-black/50 rounded-lg">
      {/* Время */}
      <div className="text-white text-sm font-mono mr-2">
        {formattedTime}
      </div>

      {/* Пауза/Старт */}
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePause}
        className="text-white hover:bg-white/20"
      >
        {isPaused ? (
          <Play className="h-4 w-4" />
        ) : (
          <Pause className="h-4 w-4" />
        )}
      </Button>

      {/* Скорость */}
      <Button
        variant="ghost"
        size="sm"
        onClick={cycleSpeed}
        className="text-white hover:bg-white/20"
        title={`${speedConfig.label}: ${speedConfig.description}`}
      >
        <Gauge className="h-4 w-4 mr-1" />
        <span className="text-xs">{speedConfig.label}</span>
      </Button>

      {/* Счётчик тиков (для отладки) */}
      <div className="text-white/50 text-xs ml-2">
        #{tickCount}
      </div>
    </div>
  );
}

// === АЛЬТЕРНАТИВА: Dropdown для выбора скорости ===

export function SpeedSelector() {
  const { speed, speeds, setSpeed } = useTickTimer();

  return (
    <select
      value={speed}
      onChange={(e) => setSpeed(e.target.value as any)}
      className="bg-black/50 text-white text-sm rounded px-2 py-1"
    >
      {Object.entries(speeds).map(([id, config]) => (
        <option key={id} value={id}>
          {config.label} ({config.description})
        </option>
      ))}
    </select>
  );
}
```

---

## 📁 ИЗМЕНЯЕМЫЕ ФАЙЛЫ

### 1. `src/app/page.tsx` (или основной layout)

```tsx
// Добавить импорт
import { TickTimerControls } from '@/components/TickTimerControls';

// Добавить в UI (примерная позиция)
<div className="fixed top-2 right-2 z-50">
  <TickTimerControls />
</div>
```

### 2. Интеграция с TruthSystem

```typescript
// В src/lib/truth-system.ts

// Добавить подписку на game:tick
private setupTickListener(): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('game:tick', (event: Event) => {
      const customEvent = event as CustomEvent<TickEventDetail>;
      this.onTick(customEvent.detail);
    });
  }
}

private onTick(detail: TickEventDetail): void {
  // Обновить внутреннее состояние
  this.currentGameTime = detail.gameTime;
  
  // Триггернуть события которые зависят от времени
  // Например: голод, усталость, регенерация
  this.processTimeBasedEffects(detail);
}
```

---

## 📁 УДАЛЯЕМЫЕ ФАЙЛЫ

После успешного тестирования:

```
□ src/lib/auto-tick.ts (если существует)
□ src/hooks/useAutoTick.ts (если существует)
□ src/components/GameTimeSync.tsx (если существует и не нужен)
□ src/lib/time-integration.ts (если существует и заменён)
```

**Важно:** Удалять только после проверки что новый код работает!

---

## 📝 ЧЕК-ЛИСТ РЕАЛИЗАЦИИ

```
□ Создать src/hooks/useTickTimer.ts
  □ Экспортировать useTickTimer hook
  □ Добавить форматирование времени
  □ Добавить cycleSpeed()
□ Создать src/components/TickTimerControls.tsx
  □ Кнопка Play/Pause
  □ Отображение времени
  □ Выбор скорости
  □ Счётчик тиков (опционально)
□ Интегрировать в page.tsx
  □ Добавить импорт
  □ Добавить компонент в UI
□ Добавить подписку TruthSystem (если нужно)
□ Протестировать интеграцию
□ Удалить старые файлы
□ Протестировать после удаления
```

---

## 🧪 ТЕСТЫ ФАЗЫ 4

### Тест 4.1: UI компонент отображается
```bash
bun run dev

# Ожидается:
□ TickTimerControls виден в UI
□ Отображается время: "День 1, 06:00"
□ Кнопка Play видна
□ Кнопка скорости видна
```

### Тест 4.2: UI управляет таймером
```
□ Клик Play → таймер запускается
□ Кнопка меняется на Pause
□ Клик Pause → таймер останавливается
□ Время обновляется каждую секунду
□ tickCount увеличивается
```

### Тест 4.3: Выбор скорости
```
□ Клик по скорости → переключает на следующую
□ Лейбл скорости меняется
□ Время начинает идти с новой скоростью
□ Dropdown (если есть) показывает все 6 скоростей
```

### Тест 4.4: После удаления старых файлов
```bash
# После удаления auto-tick.ts и useAutoTick.ts:
bun run dev

# Ожидается:
□ Проект запускается без ошибок
□ Нет import ошибок
□ Функциональность сохранена
□ Нет warnings в консоли
```

### Тест 4.5: Полная интеграция
```
□ React UI показывает время
□ Phaser получает тики
□ Pause останавливает Phaser
□ Resume продолжает Phaser
□ Скорость меняется корректно
□ TruthSystem получает обновления
```

### Тест 4.6: Горячие клавиши (если реализованы)
```
□ Пробел → togglePause
□ + / - → изменить скорость
□ Работают независимо от фокуса
```

---

## 🎯 ФИНАЛЬНАЯ ПРОВЕРКА

### Чек-лист всей системы

```
□ 1 ТИК = 1 СЕКУНДА реального времени
□ isPaused: true по умолчанию
□ togglePause() работает
□ 6 скоростей работают корректно:
  □ superSuperSlow: 15 сек/тик
  □ superSlow: 30 сек/тик
  □ slow: 1 мин/тик
  □ normal: 5 мин/тик
  □ fast: 15 мин/тик
  □ ultra: 60 мин/тик
□ React UI синхронизирован
□ Phaser получает события
□ Pause/resume синхронизированы
□ Нет утечек памяти
□ Нет ошибок в консоли
□ Стабильная работа при длительном тесте (5+ минут)
```

---

## 📊 СРАВНЕНИЕ: ДО И ПОСЛЕ

| Аспект | До (auto-tick.ts) | После (tick-timer.ts) |
|--------|-------------------|----------------------|
| Канал событий | EventEmitter + window (mix) | Только window |
| Точка истины | Разрозненная | Zustand store |
| Инициализация | Не гарантирована | В store |
| Error handling | Нет | try-catch |
| Логирование | Минимальное | Подробное |
| Очистка | Нет | removeEventListener |

---

## 🔄 ОТКАТ

Если что-то сломалось:

```bash
# Полный откат к началу Фазы 4
git checkout -- .

# Или вернуть удалённые файлы
git checkout HEAD -- src/lib/auto-tick.ts
git checkout HEAD -- src/hooks/useAutoTick.ts

# Проверить статус
git status
```

---

## ✅ ЗАВЕРШЕНИЕ

После успешного прохождения всех тестов:

1. **Зафиксировать изменения:**
```bash
git add .
git commit -m "feat(time): implement TickTimer system

- Add time.store.ts (Zustand)
- Add tick-timer.ts (window events only)
- Add useTickTimer hook
- Add TickTimerControls UI component
- Integrate with Phaser LocationScene
- Remove deprecated auto-tick.ts

Fixes: Event channel mismatch issue
"
```

2. **Обновить документацию:**
- Обновить `docs/ARCHITECTURE.md` (если нужно)
- Создать `docs/tick-timer-system.md` (если нужно)

3. **Push в ветку:**
```bash
git push origin main2d6
```

---

**Поздравляем! 🎉 TickTimer система успешно внедрена!**
