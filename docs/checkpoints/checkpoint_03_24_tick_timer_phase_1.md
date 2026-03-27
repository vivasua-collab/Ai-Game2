# ФАЗА 1: Zustand Store (Без таймера)

**Статус:** ✅ ЗАВЕРШЕНО
**Дата завершения:** 2026-03-24
**Риск:** 🟢 Низкий
**Время оценки:** 15-20 минут

---

## 🎯 ЦЕЛЬ ФАЗЫ

Создать **Zustand store** для управления временем, **БЕЗ** реализации самого таймера.

Это позволит:
- Проверить что store работает корректно
- Убедиться что UI может читать/писать состояние
- Зафиксировать типы и интерфейсы

---

## 📁 СОЗДАВАЕМЫЕ ФАЙЛЫ

### 1. `src/stores/time.store.ts`

```typescript
// ТИПЫ
interface GameTime {
  totalMinutes: number;    // Общее количество игровых минут
  day: number;             // Текущий день
  hour: number;            // Текущий час (0-23)
  minute: number;          // Текущая минута (0-59)
}

interface TickSpeedConfig {
  id: TickSpeedId;
  label: string;
  minutesPerTick: number;  // Игровых минут за 1 тик
  description: string;
}

type TickSpeedId = 
  | 'superSuperSlow' 
  | 'superSlow' 
  | 'slow' 
  | 'normal' 
  | 'fast' 
  | 'ultra';

// STORE
interface TimeStore {
  // === STATE ===
  isPaused: boolean;
  isRunning: boolean;
  tickCount: number;
  speed: TickSpeedId;
  gameTime: GameTime;
  
  // === SPEED CONFIG ===
  speeds: Record<TickSpeedId, TickSpeedConfig>;
  
  // === ACTIONS ===
  togglePause: () => void;
  setSpeed: (speed: TickSpeedId) => void;
  
  // === INTERNAL ===
  _calculateGameTime: (totalMinutes: number) => GameTime;
  _incrementTick: () => void;
}
```

### 2. Конфигурация скоростей

```typescript
export const TICK_SPEEDS: Record<TickSpeedId, TickSpeedConfig> = {
  superSuperSlow: {
    id: 'superSuperSlow',
    label: 'Бой',
    minutesPerTick: 0.25, // 15 секунд = 0.25 минуты
    description: '1 тик = 15 сек игрового времени'
  },
  superSlow: {
    id: 'superSlow',
    label: 'Точный',
    minutesPerTick: 0.5, // 30 секунд = 0.5 минуты
    description: '1 тик = 30 сек игрового времени'
  },
  slow: {
    id: 'slow',
    label: 'Медленный',
    minutesPerTick: 1,
    description: '1 тик = 1 минута игрового времени'
  },
  normal: {
    id: 'normal',
    label: 'Обычный',
    minutesPerTick: 5,
    description: '1 тик = 5 минут игрового времени'
  },
  fast: {
    id: 'fast',
    label: 'Быстрый',
    minutesPerTick: 15,
    description: '1 тик = 15 минут игрового времени'
  },
  ultra: {
    id: 'ultra',
    label: 'Медитация',
    minutesPerTick: 60,
    description: '1 тик = 1 час игрового времени'
  }
};
```

### 3. Начальное состояние

```typescript
const initialState = {
  isPaused: true,        // Игра начинается на паузе
  isRunning: false,      // Таймер не запущен
  tickCount: 0,
  speed: 'normal' as TickSpeedId,
  gameTime: {
    totalMinutes: 0,
    day: 1,
    hour: 6,             // Начинаем в 6:00 утра
    minute: 0
  }
};
```

---

## 📝 ЧЕК-ЛИСТ РЕАЛИЗАЦИИ

```
□ Создать файл src/stores/time.store.ts
□ Определить типы (GameTime, TickSpeedConfig, TickSpeedId)
□ Создать конфиг TICK_SPEEDS
□ Реализовать Zustand store с initialState
□ Реализовать togglePause()
□ Реализовать setSpeed()
□ Реализовать _calculateGameTime()
□ Экспортировать store и типы
```

---

## 🧪 ТЕСТЫ ФАЗЫ 1

### Тест 1.1: Базовая работоспособность
```bash
# Запуск проекта
bun run dev

# Ожидается:
□ Проект запускается без ошибок
□ Страница загружается
□ Phaser работает (как и раньше)
```

### Тест 1.2: Store доступен
```typescript
// В консоли браузера:
import { useTimeStore } from '@/stores/time.store';

// Проверить:
const state = useTimeStore.getState();
console.log(state);

// Ожидается:
□ isPaused: true
□ isRunning: false
□ tickCount: 0
□ speed: 'normal'
□ gameTime: { totalMinutes: 0, day: 1, hour: 6, minute: 0 }
```

### Тест 1.3: Actions работают
```typescript
// В консоли браузера:
const store = useTimeStore.getState();

// Тест togglePause:
store.togglePause();
console.log(useTimeStore.getState().isPaused); // false
store.togglePause();
console.log(useTimeStore.getState().isPaused); // true

// Тест setSpeed:
store.setSpeed('fast');
console.log(useTimeStore.getState().speed); // 'fast'

// Ожидается:
□ togglePause() переключает isPaused
□ setSpeed() меняет скорость
□ speeds содержит все 6 скоростей
```

### Тест 1.4: Вычисление времени
```typescript
// В консоли браузера:
const store = useTimeStore.getState();

const time1 = store._calculateGameTime(0);
// { day: 1, hour: 0, minute: 0 }

const time2 = store._calculateGameTime(60);
// { day: 1, hour: 1, minute: 0 }

const time3 = store._calculateGameTime(1440);
// { day: 2, hour: 0, minute: 0 }

// Ожидается:
□ 60 минут = 1 час
□ 1440 минут = 1 день
□ Корректный переход на следующий день
```

---

## ⚠️ ЧТО НЕ ДЕЛАЕМ В ЭТОЙ ФАЗЕ

- ❌ НЕ создаём таймер (setInterval)
- ❌ НЕ интегрируем с Phaser
- ❌ НЕ создаём UI компоненты
- ❌ НЕ подключаем к TruthSystem
- ❌ НЕ меняем существующие файлы

---

## 🔄 ОТКАТ

Если тесты не проходят:

```bash
# Удалить созданный файл
rm src/stores/time.store.ts

# Вернуться к исходному состоянию
git status
```

---

## ✅ КРИТЕРИИ ПЕРЕХОДА К ФАЗЕ 2

1. ✅ Все тесты Фазы 1 проходят
2. ✅ Проект работает как прежде
3. ✅ Store корректно экспортируется
4. ✅ Типы определены правильно

---

**Следующий шаг:** После успешного прохождения тестов → Фаза 2
