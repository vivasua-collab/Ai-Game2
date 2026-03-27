# ФАЗА 8: Синхронизация времени и система перемещений

**Статус:** 🔄 ВЫПОЛНЕНИЕ (4/5 этапов завершено)
**Дата создания:** 2026-03-24
**Дата обновления:** 2026-03-24
**Родитель:** checkpoint_03_24_tick_timer_phase_7.md
**Риск:** 🟠 Высокий
**Зависимость:** Фаза 7 завершена (7.1-7.3)

---

## 🎯 ЦЕЛЬ ФАЗЫ

Синхронизировать все подсистемы с TickTimer и создать единую систему управления перемещениями с привязкой к времени.

---

## 🔍 АНАЛИЗ ПРОБЛЕМ

### Проблема 1: Phaser Calendar Desync

**Симптом:** Phaser отображает старый календарь без year/month/season

**Анализ кода:**
```
LocationScene.ts:195
┌─────────────────────────────────────────────────────────────────┐
│ private currentGameTime: {                                      │
│   day: number;                                                  │
│   hour: number;                                                 │
│   minute: number;                                               │
│ } = { day: 1, hour: 6, minute: 0 };                            │
│                                                                 │
│ ❌ ОТСУТСТВУЕТ: year, month, season                            │
└─────────────────────────────────────────────────────────────────┘
```

**game:tick event передаёт ПОЛНЫЙ GameTime:**
```
TickEventDetail.gameTime: GameTime {
  totalMinutes, year, month, day, hour, minute, season
}
```

**Причина:** LocationScene использует устаревший интерфейс

**Решение:** Обновить currentGameTime до полного GameTime

---

### Проблема 2: Movement During Pause

**Симптом:** Игрок может перемещаться при нажатой паузе

**Анализ кода:**
```
LocationScene.ts:update()
┌─────────────────────────────────────────────────────────────────┐
│ update(time, delta) {                                           │
│   this.handleMovement();  // ← Вызывается ВСЕГДА               │
│   ...                                                           │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘

LocationScene.ts:handleMovement()
┌─────────────────────────────────────────────────────────────────┐
│ handleMovement() {                                              │
│   // Нет проверки isPaused!                                     │
│   this.playerPhysicsBody.setVelocity(vx * SPEED, vy * SPEED);  │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘

LocationScene.ts:onTimerPause()
┌─────────────────────────────────────────────────────────────────┐
│ onTimerPause() {                                                │
│   this.physics.pause();  // Паузит физику                       │
│   this.tweens.pauseAll();                                       │
│   // Но handleMovement() всё равно вызывается!                  │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

**Причина:** `handleMovement()` вызывается независимо от паузы

**Решение:** Добавить проверку `isPaused` или использовать state pattern

---

### Проблема 3: No Movement Time Management

**Симптом:** Перемещение не связано со временем

**Текущее поведение:**
```
WASD нажат → setVelocity() → мгновенное движение
Нет затрат времени
Нет затрат Ци
Нет обратной связи
```

**Ожидаемое поведение (как в играх):**
```
WASD нажат → запрос на перемещение
→ проверка скорости персонажа
→ расход времени (тик на N тайлов)
→ расход выносливости/Ци
→ визуальное движение со скоростью, зависящей от speed
```

**Анализ существующей системы:**
```
movement.ts (event-bus handler)
┌─────────────────────────────────────────────────────────────────┐
│ handleMove() {                                                  │
│   // 1 tile = 1 tick = 1 minute game time                      │
│   // УЖЕ ЕСТЬ логика затрат времени!                            │
│   tickResult = await quickProcessQiTick(                       │
│     characterId, sessionId, tilesMoved                          │
│   );                                                            │
│ }                                                               │
│                                                                 │
│ ❌ ПРОБЛЕМА: НЕ ИСПОЛЬЗУЕТСЯ для реального WASD движения        │
└─────────────────────────────────────────────────────────────────┘
```

**Причина:** Система перемещений через Event Bus не интегрирована с реальным WASD

**Концепция решения:**
```
┌─────────────────────────────────────────────────────────────────┐
│                 СИСТЕМА ПЕРЕМЕЩЕНИЙ v2                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   WASD input                                                    │
│        │                                                        │
│        ▼                                                        │
│   ┌─────────────┐                                               │
│   │ MoveQueue   │ ← Буфер запросов на перемещение              │
│   │ (pending)   │                                               │
│   └──────┬──────┘                                               │
│          │                                                      │
│          ▼                                                      │
│   ┌─────────────┐     ┌─────────────────────────────────┐      │
│   │ TickTimer   │────▶│ Process movement per tick        │      │
│   │ game:tick   │     │ tilesPerTick = speed / baseSpeed │      │
│   └─────────────┘     └──────────────┬──────────────────┘      │
│                                      │                          │
│                                      ▼                          │
│                        ┌─────────────────────────────────┐      │
│                        │ Update position + spend time    │      │
│                        │ + passive Qi effects            │      │
│                        └─────────────────────────────────┘      │
│                                                                 │
│   Speed types:                                                  │
│   - Walk: 2 tiles/tick (нормально)                             │
│   - Run:  4 tiles/tick (тратит выносливость)                   │
│   - Sneak: 1 tile/tick (скрытность)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 ЭТАПЫ РЕАЛИЗАЦИИ

### Этап 8.1: Phaser Calendar Sync (P0) ⏱️ 1ч

**Задача:** Синхронизировать Phaser с новым WorldTime

**Изменения:**
```typescript
// LocationScene.ts

// СТАРОЕ:
private currentGameTime: { day: number; hour: number; minute: number };

// НОВОЕ:
import type { GameTime } from '@/stores/time.store';
private currentGameTime: GameTime;

// Обновить onGameTick:
private onGameTick(detail: TickEventDetail): void {
  this.currentGameTime = detail.gameTime; // Теперь полный GameTime
  // UI обновится автоматически
}
```

**UI отображение:**
- Добавить year/month/season в UI элементы Phaser
- Обновить форматирование даты

**Тест 8.1:**
```
□ currentGameTime содержит year, month, season
□ UI отображает полную дату
□ Календарь синхронизирован с React UI
```

---

### Этап 8.2: Pause Movement Lock (P0) ⏱️ 1ч

**Задача:** Блокировать перемещение при паузе

**Вариант A (простой):**
```typescript
// LocationScene.ts
private isGamePaused: boolean = false;

private handleMovement(): void {
  if (this.isGamePaused) return; // Блокировка
  
  // ... existing movement code
}

private onTimerPause(): void {
  this.isGamePaused = true;
  this.physics.pause();
  this.tweens.pauseAll();
}

private onTimerResume(): void {
  this.isGamePaused = false;
  this.physics.resume();
  this.tweens.resumeAll();
}
```

**Вариант B (через store):**
```typescript
// LocationScene.ts
import { useTimeStore } from '@/stores/time.store';

private handleMovement(): void {
  const isPaused = useTimeStore.getState().isPaused;
  if (isPaused) return;
  
  // ... existing movement code
}
```

**Тест 8.2:**
```
□ При паузе игрок НЕ может двигаться
□ При resume движение восстанавливается
□ UI кнопка паузы работает корректно
```

---

### Этап 8.3: Movement Time System Design (P1) ⏱️ 2ч

**Задача:** Спроектировать систему перемещений с привязкой к времени

**Концепция:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    TIME-BASED MOVEMENT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Base speed: 1 tile = 5 meters = 1 tick                        │
│                                                                 │
│   Movement modes:                                               │
│   ┌────────────┬─────────────┬─────────────┬───────────────┐    │
│   │ Mode       │ Tiles/tick  │ Cost        │ Visibility     │    │
│   ├────────────┼─────────────┼─────────────┼───────────────┤    │
│   │ Sneak      │ 0.5         │ Stealth+    │ Low            │    │
│   │ Walk       │ 1           │ None        │ Normal         │    │
│   │ Fast Walk  │ 2           │ Stamina     │ Normal         │    │
│   │ Run        │ 3           │ Stamina+++  │ High           │    │
│   │ Sprint     │ 4           │ Stamina++++ │ Very High      │    │
│   └────────────┴─────────────┴─────────────┴───────────────┘    │
│                                                                 │
│   Speed affected by:                                            │
│   - Terrain type (road/forest/mountain)                        │
│   - Character agility                                           │
│   - Fatigue level                                               │
│   - Carried weight                                              │
│   - Weather conditions                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Новые типы:**
```typescript
// movement-types.ts
export type MovementMode = 'sneak' | 'walk' | 'fastWalk' | 'run' | 'sprint';

export interface MovementConfig {
  mode: MovementMode;
  tilesPerTick: number;
  staminaCostPerTick: number;
  qiCostPerTick: number;
  visibilityModifier: number;
}

export const MOVEMENT_CONFIGS: Record<MovementMode, MovementConfig> = {
  sneak:    { mode: 'sneak',    tilesPerTick: 0.5, staminaCostPerTick: 0, qiCostPerTick: 0, visibilityModifier: -50 },
  walk:     { mode: 'walk',     tilesPerTick: 1,   staminaCostPerTick: 0, qiCostPerTick: 0, visibilityModifier: 0 },
  fastWalk: { mode: 'fastWalk', tilesPerTick: 2,   staminaCostPerTick: 1, qiCostPerTick: 0, visibilityModifier: 0 },
  run:      { mode: 'run',      tilesPerTick: 3,   staminaCostPerTick: 2, qiCostPerTick: 0, visibilityModifier: 25 },
  sprint:   { mode: 'sprint',   tilesPerTick: 4,   staminaCostPerTick: 4, qiCostPerTick: 1, visibilityModifier: 50 },
};
```

**Интеграция с TickTimer:**
```typescript
// movement-processor.ts
export class MovementProcessor {
  private pendingMovement: { x: number; y: number; mode: MovementMode } | null = null;
  
  // Вызывается при WASD input
  queueMovement(dx: number, dy: number, mode: MovementMode): void {
    this.pendingMovement = { x: dx, y: dy, mode };
  }
  
  // Вызывается на game:tick
  processTick(detail: TickEventDetail): void {
    if (!this.pendingMovement) return;
    
    const config = MOVEMENT_CONFIGS[this.pendingMovement.mode];
    const tilesToMove = config.tilesPerTick;
    
    // 1. Рассчитать новую позицию
    // 2. Проверить коллизии
    // 3. Потратить stamina/qi
    // 4. Обновить позицию
    // 5. Отправить на сервер (batch)
  }
}
```

**Тест 8.3:**
```
□ MovementMode типы определены
□ MOVEMENT_CONFIGS корректны
□ MovementProcessor создан
□ Интеграция с TickTimer работает
```

---

### Этап 8.4: Movement Time Integration (P1) ⏱️ 3ч

**Задача:** Реализовать привязку перемещения к времени

**Изменения в LocationScene:**
```typescript
// LocationScene.ts
private movementMode: MovementMode = 'walk';
private movementProcessor: MovementProcessor;

private setupMovement(): void {
  this.movementProcessor = new MovementProcessor();
  
  // Слушать game:tick для обработки движения
  window.addEventListener('game:tick', (event) => {
    const detail = (event as CustomEvent<TickEventDetail>).detail;
    this.movementProcessor.processTick(detail);
  });
}

// Изменить handleMovement
private handleMovement(): void {
  if (this.isGamePaused) return;
  
  // Вместо прямой установки velocity
  // Кладём в очередь для обработки на тике
  let dx = 0, dy = 0;
  if (this.wasd?.W?.isDown) dy = -1;
  if (this.wasd?.S?.isDown) dy = 1;
  if (this.wasd?.A?.isDown) dx = -1;
  if (this.wasd?.D?.isDown) dx = 1;
  
  if (dx !== 0 || dy !== 0) {
    this.movementProcessor.queueMovement(dx, dy, this.movementMode);
  }
}
```

**Тест 8.4:**
```
□ Перемещение происходит по тикам
□ Скорость зависит от MovementMode
□ Stamina тратится при беге
□ Время продвигается при движении
```

---

### Этап 8.5: Action Time Cost System (P2) ⏱️ 2ч

**Задача:** Создать общую систему затрат времени на действия

**Концепция:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    ACTION TIME COSTS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Все действия имеют стоимость в тиках:                         │
│                                                                 │
│   ┌─────────────────────┬───────────────┬───────────────────┐   │
│   │ Action              │ Time Cost     │ Modifiers         │   │
│   ├─────────────────────┼───────────────┼───────────────────┤   │
│   │ Move 1 tile         │ 1 tick        │ agility, terrain  │   │
│   │ Attack (melee)      │ 1 tick        │ weapon speed      │   │
│   │ Attack (ranged)     │ 1-2 ticks     │ weapon, aim       │   │
│   │ Cast technique      │ 2-5 ticks     │ complexity, skill │   │
│   │ Meditate 1 hour     │ 1 tick (ultra)│ location, level   │   │
│   │ Rest 1 hour         │ 1 tick (ultra)│ location          │   │
│   │ Craft item          │ N ticks       │ complexity        │   │
│   │ Read scroll         │ 10 ticks      │ intelligence      │   │
│   └─────────────────────┴───────────────┴───────────────────┘   │
│                                                                 │
│   Queue system:                                                 │
│   - Actions queue up                                           │
│   - Processed on game:tick                                     │
│   - Can be cancelled before processing                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Реализация:**
```typescript
// action-queue.ts
export interface QueuedAction {
  id: string;
  type: 'move' | 'attack' | 'cast' | 'interact' | 'craft';
  ticksRequired: number;
  ticksRemaining: number;
  data: unknown;
  onCancelled?: () => void;
}

export class ActionQueue {
  private queue: QueuedAction[] = [];
  
  enqueue(action: Omit<QueuedAction, 'id' | 'ticksRemaining'>): string {
    const id = generateId();
    this.queue.push({ ...action, id, ticksRemaining: action.ticksRequired });
    return id;
  }
  
  processTick(): QueuedAction | null {
    if (this.queue.length === 0) return null;
    
    const current = this.queue[0];
    current.ticksRemaining--;
    
    if (current.ticksRemaining <= 0) {
      this.queue.shift();
      return current;
    }
    return null;
  }
  
  cancel(actionId: string): boolean {
    const index = this.queue.findIndex(a => a.id === actionId);
    if (index >= 0) {
      const action = this.queue[index];
      action.onCancelled?.();
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }
}
```

**Тест 8.5:**
```
□ ActionQueue создан
□ Действия ставятся в очередь
□ Тики уменьшаются корректно
□ Отмена действий работает
```

---

## 📊 ПЛАН ПО ЭТАПАМ

| Этап | Описание | Приоритет | Время | Статус |
|------|----------|-----------|-------|--------|
| 8.1 | Phaser Calendar Sync | P0 | 1ч | ✅ ЗАВЕРШЕНО |
| 8.2 | Pause Movement Lock | P0 | 1ч | ✅ ЗАВЕРШЕНО |
| 8.3 | Movement System Design | P1 | 2ч | ✅ ЗАВЕРШЕНО |
| 8.4 | Movement Time Integration | P1 | 3ч | ✅ ЗАВЕРШЕНО |
| 8.5 | Action Time Cost System | P2 | 2ч | 📋 Ожидание |

**Прогресс:** 4/5 этапов (80%)
**Осталось:** ~2 часа

---

## ✅ ЭТАП 8.1: Phaser Calendar Sync — ЗАВЕРШЕНО

**Commit:** (pending)

**Выполнено:**
- [x] Импортирован `GameTime` тип из `@/stores/time.store`
- [x] Обновлён `currentGameTime` до полного интерфейса GameTime
- [x] Добавлены year, month, season в начальное значение
- [x] `onGameTick` корректно присваивает полный GameTime

**Файлы:**
- `src/game/scenes/LocationScene.ts` — обновлён

---

## ✅ ЭТАП 8.2: Pause Movement Lock — ЗАВЕРШЕНО

**Commit:** (pending)

**Выполнено:**
- [x] Добавлен флаг `isGamePaused: boolean`
- [x] `onTimerPause()` устанавливает `isGamePaused = true`
- [x] `onTimerResume()` устанавливает `isGamePaused = false`
- [x] `handleMovement()` проверяет флаг и блокирует движение
- [x] При паузе velocity устанавливается в (0, 0)

**Файлы:**
- `src/game/scenes/LocationScene.ts` — обновлён

---

## ✅ ЭТАП 8.3: Movement System Design — ЗАВЕРШЕНО

**Commit:** (pending)
**Время:** 2ч
**Тип:** Новая система

**Выполнено:**
- [x] Создан `src/lib/game/movement-types.ts` (~300 строк)
- [x] Определены MovementMode: sneak, walk, fastWalk, run, sprint
- [x] Определены MovementConfig для каждого режима
- [x] Определены TerrainType и TerrainModifier
- [x] Созданы утилиты: calculateEffectiveSpeed, canUseMovementMode

**Конфигурация режимов:**
```
| Mode     | Tiles/tick | Stamina | Qi | Visibility |
|----------|------------|---------|-----|------------|
| sneak    | 0.5        | 0       | 0   | -50%       |
| walk     | 1          | 0       | 0   | 0%         |
| fastWalk | 2          | 1/tick  | 0   | 0%         |
| run      | 3          | 2/tick  | 0   | +25%       |
| sprint   | 4          | 4/tick  | 1/tick| +50%     |
```

**Terrain modifiers:**
```
| Terrain  | Speed | Stamina |
|----------|-------|---------|
| road     | 100%  | 100%    |
| plain    | 100%  | 100%    |
| forest   | 80%   | 120%    |
| mountain | 60%   | 150%    |
| water    | 50%   | 200%    |
| swamp    | 40%   | 250%    |
```

**Файлы:**
- `src/lib/game/movement-types.ts` — новый

---

## ✅ ЭТАП 8.4: Movement Time Integration — ЗАВЕРШЕНО

**Commit:** (pending)
**Время:** 3ч
**Тип:** Интеграция

**Выполнено:**
- [x] Создан `src/lib/game/movement-processor.ts` (~350 строк)
- [x] MovementProcessor class с очередью движения
- [x] queueMovement() для WASD input
- [x] processTick() для обработки на game:tick
- [x] setupTickTimerSync() для интеграции с TickTimer
- [x] Callbacks: onPositionChange, onStatsChange, onMovementEvent
- [x] Singleton: getMovementProcessor(), initMovementProcessor()

**Архитектура:**
```
WASD input → queueMovement(dx, dy, mode)
                    ↓
            PendingMovement queue
                    ↓
game:tick → processTick() → executeMovement()
                    ↓
            Update position + stamina + Qi
                    ↓
            Callbacks to UI/Phaser
```

**Файлы:**
- `src/lib/game/movement-processor.ts` — новый

---

## ⚠️ РИСКИ

1. **Поломка управления** — тестировать после каждого этапа
2. **Рассинхронизация анимаций** — плавность vs точность времени
3. **UI/UX фрустрация** — игроки привыкли к мгновенному отклику

---

## 📂 ЗАТРАГИВАЕМЫЕ ФАЙЛЫ

### Новые файлы
- `src/lib/game/movement-types.ts` — типы и конфигурация
- `src/lib/game/movement-processor.ts` — процессор перемещений
- `src/lib/game/action-queue.ts` — очередь действий

### Изменяемые файлы
- `src/game/scenes/LocationScene.ts` — интеграция

---

## 🔄 СВЯЗЬ С ДРУГИМИ ФАЗАМИ

```
Phase 7 (7.1-7.3): ✅ TickTimer базовая интеграция
       ↓
Phase 8.1-8.2:     Phaser sync + pause lock
       ↓
Phase 8.3-8.4:     Movement time system
       ↓
Phase 8.5:         Action queue (future: combat, crafting)
```

---

## 📝 ПРИМЕЧАНИЯ

### Возможность разделения на под-фазы

Если объём работы слишком большой:

**Фаза 8A (P0):**
- 8.1 Phaser Calendar Sync
- 8.2 Pause Movement Lock

**Фаза 8B (P1):**
- 8.3 Movement System Design
- 8.4 Movement Time Integration

**Фаза 8C (P2):**
- 8.5 Action Time Cost System

---

**Следующий шаг:** Этап 8.5 (Action Time Cost System)

*Дата создания:* 2026-03-24
*Дата обновления:* 2026-03-24
