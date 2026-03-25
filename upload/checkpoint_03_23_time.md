# 🎯 Checkpoint: Time System Integration

**Дата:** 2026-03-23 16:33:40 UTC
**Версия:** 2.0
**Статус:** ✅ РЕАЛИЗАЦИЯ ЗАВЕРШЕНА
**Теория:** `docs/time-system-analysis.md`
**Базовая реализация:** `docs/checkpoints/checkpoint_03_23_autotik.md`

---

## 📋 Задачи

### ✅ Базовая реализация (ВЫПОЛНЕНО)
- [x] AutoTickGenerator — генератор тиков
- [x] TimeConverter — конвертация секунды ↔ тики
- [x] PauseButton, SpeedSelector, TimeDisplay — UI компоненты
- [x] useAutoTick, useAutoTickHotkeys — React hooks

### ✅ Интеграция (РЕАЛИЗОВАНО)

| ID | Задача | Приоритет | Статус |
|----|--------|-----------|--------|
| T1 | Интеграция с LocationScene.ts — подписка на game:tick | P0 | ✅ |
| T2 | Интеграция с TruthSystem — обновление времени на сервере | P0 | ✅ |
| T3 | Сохранение скорости — персистентность настроек | P1 | ✅ |

---

## 🏗️ Архитектура интеграции

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TIME INTEGRATION FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   AutoTickGenerator                                                 │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  setInterval → processTick() → emit('tick:auto', event)     │  │
│   │                           ↓                                  │  │
│   │  window.dispatchEvent('game:tick', event)                   │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│            ┌─────────────────┼─────────────────┐                   │
│            ▼                 ▼                 ▼                   │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐             │
│   │LocationScene│   │ TruthSystem │   │   Browser   │             │
│   │  (Phaser)   │   │  (Server)   │   │  Storage    │             │
│   └─────────────┘   └─────────────┘   └─────────────┘             │
│         │                 │                 │                      │
│         ▼                 ▼                 ▼                      │
│   Пауза физики     advanceTime()    localStorage                  │
│   Пауза tweens     saveToDB()       tickSpeed                     │
│   AI тики          WorldTimeState   isPaused                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📝 T1: Интеграция с LocationScene.ts

### Анализ текущего состояния

**Файл:** `src/game/scenes/LocationScene.ts`

**Уже есть:**
- AI Event Handlers (boundNPCMove, boundNPCAttack, boundAITick)
- Window event listeners (npc:move, npc:attack, npc_ai:tick)
- NPC behavior update (updateNPCBehavior)
- Arcade Physics для игрока и NPC

**Требуется добавить:**
- Подписка на `game:tick` события
- Пауза физики при `tick:pause`
- Продолжение физики при `tick:resume`
- Опционально: пауза tweens

### Реализация

#### 1.1 Добавить свойства для управления паузой

```typescript
// === Time System Integration ===
private boundGameTick: ((event: Event) => void) | null = null;
private boundTickPause: ((event: Event) => void) | null = null;
private boundTickResume: ((event: Event) => void) | null = null;
private isTimePaused: boolean = false;
```

#### 1.2 Добавить подписку на события времени в setupAI()

```typescript
// В конец метода setupAI()

// === Time System Integration ===
this.boundGameTick = ((event: Event) => {
  const customEvent = event as CustomEvent;
  const data = customEvent.detail;
  this.onGameTick(data);
}) as EventListener;

this.boundTickPause = (() => {
  this.onTimePause();
}) as EventListener;

this.boundTickResume = (() => {
  this.onTimeResume();
}) as EventListener;

window.addEventListener('game:tick', this.boundGameTick);
window.addEventListener('tick:pause', this.boundTickPause);
window.addEventListener('tick:resume', this.boundTickResume);

console.log('[LocationScene] Time system listeners registered');
```

#### 1.3 Добавить методы обработки тиков

```typescript
/**
 * Обработка игрового тика от AutoTickGenerator
 */
private onGameTick(event: { tickCount: number; minutesPerTick: number }): void {
  if (this.isTimePaused) return;
  
  // Триггер AI update для всех NPC
  for (const [id, npc] of this.npcs) {
    this.updateNPCBehavior(npc);
  }
  
  // Обновляем счетчик тиков для логирования
  if (event.tickCount % 60 === 0) {
    console.log(`[LocationScene] Game tick: ${event.tickCount}, ${event.minutesPerTick} min/tick`);
  }
}

/**
 * Пауза времени — остановить физику и анимации
 */
private onTimePause(): void {
  if (this.isTimePaused) return;
  
  this.isTimePaused = true;
  
  // Пауза физики
  this.physics.pause();
  
  // Пауза всех tweens (опционально)
  this.tweens.pauseAll();
  
  console.log('[LocationScene] Time paused - physics and tweens stopped');
}

/**
 * Продолжение времени — восстановить физику и анимации
 */
private onTimeResume(): void {
  if (!this.isTimePaused) return;
  
  this.isTimePaused = false;
  
  // Продолжение физики
  this.physics.resume();
  
  // Продолжение tweens
  this.tweens.resumeAll();
  
  console.log('[LocationScene] Time resumed - physics and tweens active');
}
```

#### 1.4 Обновить cleanup в shutdown()

```typescript
// В методе shutdown() добавить:

// === Time System Cleanup ===
if (this.boundGameTick) {
  window.removeEventListener('game:tick', this.boundGameTick);
  this.boundGameTick = null;
}
if (this.boundTickPause) {
  window.removeEventListener('tick:pause', this.boundTickPause);
  this.boundTickPause = null;
}
if (this.boundTickResume) {
  window.removeEventListener('tick:resume', this.boundTickResume);
  this.boundTickResume = null;
}
```

#### 1.5 Пропуск update() при паузе

```typescript
// В начале метода update():

update(time: number, delta: number): void {
  // Пропуск обновления при паузе времени
  if (this.isTimePaused) return;
  
  // ... остальной код update()
}
```

---

## 📝 T2: Интеграция с TruthSystem

### Анализ текущего состояния

**Файл:** `src/lib/game/truth-system.ts`

**Уже есть:**
- `advanceTime(sessionId, minutes)` — продвигает время
- `getWorldTime(sessionId)` — получает время
- `saveToDatabase(sessionId)` — сохранение в БД
- `quickSave(sessionId)` — быстрое сохранение
- Auto-save таймер (каждые 1-2 минуты)

**Требуется добавить:**
- Подписка на `tick:auto` события от AutoTickGenerator
- Вызов `advanceTime()` при каждом тике
- Опционально: batch сохранение (не на каждый тик)

### Реализация

#### 2.1 Создать TimeIntegrationService

**Файл:** `src/lib/game/time-integration.ts`

```typescript
/**
 * TimeIntegrationService - Интеграция AutoTick с TruthSystem
 * 
 * Связывает генератор тиков с серверным обновлением времени.
 * 
 * @see docs/checkpoints/checkpoint_03_23_time.md
 */

import { autoTick, AutoTickEvent } from './auto-tick';
import { TruthSystem } from './truth-system';

// ==================== ТИПЫ ====================

interface TimeIntegrationConfig {
  /** ID сессии для обновления времени */
  sessionId: string | null;
  
  /** Сохранять в БД каждые N тиков */
  saveEveryTicks: number;
  
  /** Включено ли обновление времени */
  enabled: boolean;
}

// ==================== СЕРВИС ====================

class TimeIntegrationServiceImpl {
  private static instance: TimeIntegrationServiceImpl | null = null;
  
  private config: TimeIntegrationConfig = {
    sessionId: null,
    saveEveryTicks: 30, // ~30 секунд при скорости normal
    enabled: false,
  };
  
  private tickCounter: number = 0;
  private boundTickHandler: ((event: AutoTickEvent) => void) | null = null;
  
  private constructor() {}
  
  static getInstance(): TimeIntegrationServiceImpl {
    if (!TimeIntegrationServiceImpl.instance) {
      TimeIntegrationServiceImpl.instance = new TimeIntegrationServiceImpl();
    }
    return TimeIntegrationServiceImpl.instance;
  }
  
  // ==================== УПРАВЛЕНИЕ ====================
  
  /**
   * Инициализировать интеграцию с сессией
   */
  initialize(sessionId: string): void {
    this.config.sessionId = sessionId;
    this.config.enabled = true;
    
    // Подписываемся на тики
    this.boundTickHandler = (event: AutoTickEvent) => this.handleTick(event);
    autoTick.on('tick:auto', this.boundTickHandler);
    
    console.log(`[TimeIntegration] Initialized for session: ${sessionId}`);
  }
  
  /**
   * Остановить интеграцию
   */
  shutdown(): void {
    if (this.boundTickHandler) {
      autoTick.off('tick:auto', this.boundTickHandler);
      this.boundTickHandler = null;
    }
    
    this.config.enabled = false;
    this.config.sessionId = null;
    this.tickCounter = 0;
    
    console.log('[TimeIntegration] Shutdown');
  }
  
  /**
   * Обновить sessionId
   */
  setSession(sessionId: string | null): void {
    this.config.sessionId = sessionId;
  }
  
  // ==================== ОБРАБОТКА ТИКОВ ====================
  
  /**
   * Обработка тика от AutoTickGenerator
   */
  private handleTick(event: AutoTickEvent): void {
    if (!this.config.enabled || !this.config.sessionId) return;
    
    const sessionId = this.config.sessionId;
    const minutes = event.minutesPerTick;
    
    // Продвигаем время в TruthSystem
    const result = TruthSystem.getInstance().advanceTime(sessionId, minutes);
    
    if (!result.success) {
      console.error('[TimeIntegration] Failed to advance time:', result.error);
      return;
    }
    
    this.tickCounter++;
    
    // Периодическое сохранение
    if (this.tickCounter % this.config.saveEveryTicks === 0) {
      this.saveTimeToDatabase(sessionId);
    }
    
    // Логирование каждые 60 тиков (~1 минута реального времени)
    if (this.tickCounter % 60 === 0) {
      const time = TruthSystem.getInstance().getWorldTime(sessionId);
      console.log(`[TimeIntegration] Time: ${time?.formatted}, ticks: ${this.tickCounter}`);
    }
  }
  
  /**
   * Сохранить время в БД
   */
  private async saveTimeToDatabase(sessionId: string): Promise<void> {
    try {
      await TruthSystem.getInstance().quickSave(sessionId);
      console.log('[TimeIntegration] Time saved to database');
    } catch (error) {
      console.error('[TimeIntegration] Failed to save time:', error);
    }
  }
  
  // ==================== СОСТОЯНИЕ ====================
  
  /**
   * Получить конфигурацию
   */
  getConfig(): TimeIntegrationConfig {
    return { ...this.config };
  }
  
  /**
   * Проверить, активна ли интеграция
   */
  isActive(): boolean {
    return this.config.enabled && this.config.sessionId !== null;
  }
  
  /**
   * Получить счетчик тиков
   */
  getTickCounter(): number {
    return this.tickCounter;
  }
}

// ==================== ЭКСПОРТ ====================

export const timeIntegration = TimeIntegrationServiceImpl.getInstance();
export default TimeIntegrationServiceImpl;
```

#### 2.2 Интегрировать в игру

**Вариант A:** При загрузке сессии в TruthSystem

```typescript
// В truth-system.ts, метод loadSession(), после успешной загрузки:

import { timeIntegration } from './time-integration';

// В конце loadSession():
timeIntegration.initialize(sessionId);
```

**Вариант B:** В React компоненте (рекомендуется)

```typescript
// В AppContext или GameProvider:

import { timeIntegration } from '@/lib/game/time-integration';

// При инициализации игры:
useEffect(() => {
  if (sessionId) {
    timeIntegration.initialize(sessionId);
  }
  
  return () => {
    timeIntegration.shutdown();
  };
}, [sessionId]);
```

---

## 📝 T3: Сохранение скорости — персистентность

### Анализ

**Требования:**
- Сохранять выбранную скорость в localStorage
- Восстанавливать скорость при загрузке игры
- Сохранять состояние паузы (опционально)

### Реализация

#### 3.1 Обновить time-converter.ts

Добавить методы для работы с localStorage:

```typescript
// В класс TimeConverter добавить:

private STORAGE_KEY = 'cultivation_time_settings';

/**
 * Сохранить настройки в localStorage
 */
saveToStorage(): void {
  if (typeof window === 'undefined') return;
  
  const settings = {
    speed: this.currentSpeed,
    minutesPerTick: this.minutesPerTick,
    savedAt: Date.now(),
  };
  
  try {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[TimeConverter] Failed to save settings:', e);
  }
}

/**
 * Загрузить настройки из localStorage
 */
loadFromStorage(): TickSpeed | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;
    
    const settings = JSON.parse(stored);
    
    // Проверяем валидность
    if (settings.speed && TICK_SPEEDS[settings.speed as TickSpeed]) {
      this.setSpeed(settings.speed as TickSpeed);
      return settings.speed as TickSpeed;
    }
  } catch (e) {
    console.warn('[TimeConverter] Failed to load settings:', e);
  }
  
  return null;
}
```

#### 3.2 Обновить auto-tick.ts

Добавить сохранение при смене скорости:

```typescript
// В метод setSpeed() добавить:

import { timeConverter } from './time-converter';

setSpeed(speed: TickSpeed): void {
  // ... существующий код ...
  
  // Сохраняем в localStorage
  timeConverter.saveToStorage();
}
```

#### 3.3 Обновить useAutoTick.ts

Добавить восстановление настроек при монтировании:

```typescript
// В useEffect добавить:

useEffect(() => {
  // ... существующий код ...
  
  // Восстанавливаем настройки из localStorage
  const savedSpeed = timeConverter.loadFromStorage();
  if (savedSpeed && savedSpeed !== autoTick.getSpeed()) {
    autoTick.setSpeed(savedSpeed);
  }
  
  // Автозапуск при монтировании (если не запущен)
  if (!autoTick.isRunning()) {
    autoTick.start();
    updateState();
  }
  
  // ... остальной код ...
}, []);
```

#### 3.4 Опционально: Сохранение состояния паузы

```typescript
// Добавить в AutoTickGenerator:

private PAUSE_STORAGE_KEY = 'cultivation_time_paused';

// При изменении паузы:
pause(): void {
  // ... существующий код ...
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(this.PAUSE_STORAGE_KEY, 'true');
  }
}

resume(): void {
  // ... существующий код ...
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem(this.PAUSE_STORAGE_KEY);
  }
}

// При инициализации:
private restorePauseState(): void {
  if (typeof window === 'undefined') return;
  
  const wasPaused = localStorage.getItem(this.PAUSE_STORAGE_KEY) === 'true';
  if (wasPaused) {
    this.isPaused = true;
  }
}
```

---

## 🧪 Тестирование

### Чек-лист

```
□ T1: LocationScene интеграция
  ├─ □ game:tick события приходят в сцену
  ├─ □ Физика ставится на паузу при tick:pause
  ├─ □ Физика продолжается при tick:resume
  ├─ □ Tweens ставятся на паузу
  ├─ □ update() пропускается при паузе
  └─ □ Cleanup при shutdown работает

□ T2: TruthSystem интеграция
  ├─ □ timeIntegration инициализируется с sessionId
  ├─ □ advanceTime вызывается при каждом тике
  ├─ □ Время в TruthSystem синхронизировано с AutoTick
  ├─ □ Периодическое сохранение в БД работает
  └─ □ Shutdown корректно отписывается от событий

□ T3: Персистентность скорости
  ├─ □ Скорость сохраняется в localStorage
  ├─ □ Скорость восстанавливается при загрузке
  ├─ □ Изменение скорости сохраняется
  └─ □ (Опционально) Состояние паузы сохраняется
```

### Команды проверки

```bash
# Lint
bun run lint

# Проверка в браузере
# 1. Открыть игру
# 2. Изменить скорость → перезагрузить → проверить восстановление
# 3. Нажать паузу → проверить остановку физики NPC
# 4. Проверить консоль на логи [TimeIntegration], [LocationScene]
```

---

## 📊 Оценка времени

| Задача | Время | Приоритет |
|--------|-------|-----------|
| T1: LocationScene интеграция | 2 часа | P0 |
| T2: TruthSystem интеграция | 1.5 часа | P0 |
| T3: Персистентность скорости | 30 мин | P1 |
| Тестирование | 1 час | P0 |
| **Итого** | **5 часов** | |

---

## 📚 Связанные документы

| Документ | Назначение |
|----------|------------|
| `docs/time-system-analysis.md` | Теория и архитектура |
| `docs/checkpoints/checkpoint_03_23_autotik.md` | Базовая реализация AutoTick |
| `docs/ARCHITECTURE.md` | Общая архитектура |
| `docs/npc-life-architecture.md` | NPC интеграция |

---

*Документ создан: 2026-03-23 16:33:40 UTC*
*Версия: 1.0*
*Статус: 🔜 ОЖИДАЕТ РЕАЛИЗАЦИИ*
