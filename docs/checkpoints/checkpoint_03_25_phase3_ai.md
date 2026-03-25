# ФАЗА 3: Server AI - Серверная Миграция AI

**Версия:** 1.1
**Дата:** 2026-03-25
**Статус:** ✅ ЗАВЕРШЕНА
**Приоритет:** 🟠 ВЫСОКИЙ
**Время:** 3-4 дня
**Зависимости:** Фаза 1 (Combat API), Фаза 2 (Techniques)

---

## 🎯 ЦЕЛЬ ФАЗЫ

Перенести ВСЕ AI решения на сервер. NPC управляются сервером через tick loop. Клиент ТОЛЬКО отображает действия NPC.

### Принцип

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ПРИНЦИП SERVER AI                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ДО (НЕПРАВИЛЬНО):                                                         │
│   Клиент: каждый кадр обновляет NPC AI                                      │
│   ├── NPCSprite.updateSpinalAI()  ← AI на клиенте                          │
│   ├── SpinalController.update()   ← решения на клиенте                     │
│   └── executeSpinalAction()       ← выполнение на клиенте                  │
│   ⚠️ ЧИТ: подмена AI поведения                                             │
│                                                                             │
│   ПОСЛЕ (ПРАВИЛЬНО):                                                        │
│   Сервер: каждый тик обновляет NPC AI                                       │
│   ├── AIManager.updateNPCs()               ← AI на сервере                 │
│   ├── SpinalController.update()            ← решения на сервере            │
│   └── broadcast npc:action { id, action }  ← отправка на клиент            │
│   Клиент: получает действие и отображает                                    │
│   └── NPCSprite.executeServerAction()      ← ТОЛЬКО визуал                 │
│   ✅ AI решения ТОЛЬКО на сервере                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 ФАЙЛЫ ДЛЯ СОЗДАНИЯ

### 1. `src/lib/game/server/ai/types.ts`

```typescript
// Типы для AI системы

export interface NPCAIState {
  id: string;
  name: string;
  role: 'monster' | 'guard' | 'passerby' | 'cultivator';
  
  // Позиция
  locationId: string;
  x: number;
  y: number;
  
  // Боевое состояние
  hp: number;
  maxHp: number;
  qi: number;
  maxQi: number;
  
  // AI состояние
  isActive: boolean;
  currentAction: NPCAction | null;
  actionQueue: NPCAction[];
  
  // Spinal AI
  spinalState: SpinalAIState;
  
  // Агрессия
  threatLevel: number;
  targetId: string | null;
  lastAttackTime: number;
  
  // Сенсоры
  sensorRange: number;
  attackRange: number;
  visibleTargets: string[];
}

export interface NPCAction {
  type: NPCActionType;
  data: Record<string, unknown>;
  timestamp: number;
}

export type NPCActionType = 
  | 'move'
  | 'attack'
  | 'flee'
  | 'idle'
  | 'patrol'
  | 'chase'
  | 'dodge'
  | 'flinch'
  | 'qi_shield'
  | 'alert';

export interface SpinalAIState {
  pendingSignals: SpinalSignal[];
  activeReflexes: string[];
  lastUpdate: number;
  configuration: SpinalConfiguration;
}

export interface SpinalSignal {
  type: 'damage' | 'threat' | 'opportunity' | 'environment';
  intensity: number;  // 0-1
  data: Record<string, unknown>;
}

export interface SpinalConfiguration {
  fleeThreshold: number;     // HP % для бегства
  aggressiveness: number;    // 0-1
  cautionLevel: number;      // 0-1
  socialBehavior: 'solitary' | 'pack' | 'territorial';
}
```

### 2. `src/lib/game/server/ai/spinal-server.ts`

```typescript
/**
 * Серверный Spinal AI Controller
 * Мигрировано из: src/lib/game/ai/spinal/spinal-controller.ts
 */

import { NPCAIState, SpinalSignal, NPCAction, SpinalConfiguration } from './types';

export class SpinalServerController {
  
  /**
   * Обновить Spinal AI для NPC
   */
  update(npc: NPCAIState, context: AIContext): NPCAction | null {
    // 1. Обработка pending signals
    this.processSignals(npc);
    
    // 2. Проверка рефлексов
    const reflexAction = this.checkReflexes(npc, context);
    if (reflexAction) {
      return reflexAction;
    }
    
    // 3. Обычное поведение
    return this.decideAction(npc, context);
  }

  /**
   * Обработка сигналов
   */
  private processSignals(npc: NPCAIState): void {
    const signals = npc.spinalState.pendingSignals;
    
    // Сортировка по интенсивности
    signals.sort((a, b) => b.intensity - a.intensity);
    
    // Обработка высокоинтенсивных сигналов
    for (const signal of signals) {
      if (signal.intensity > 0.7) {
        this.triggerHighPriorityResponse(npc, signal);
      }
    }
    
    // Очистка обработанных сигналов
    npc.spinalState.pendingSignals = signals.filter(s => s.intensity > 0.3);
  }

  /**
   * Проверка рефлексов
   */
  private checkReflexes(npc: NPCAIState, context: AIContext): NPCAction | null {
    const config = npc.spinalState.configuration;
    
    // Рефлекс: бегство при низком HP
    if (npc.hp / npc.maxHp < config.fleeThreshold) {
      return {
        type: 'flee',
        data: { reason: 'low_hp' },
        timestamp: Date.now(),
      };
    }
    
    // Рефлекс: уклонение от атаки
    if (context.incomingAttack) {
      const dodgeChance = config.cautionLevel * 0.5;
      if (Math.random() < dodgeChance) {
        return {
          type: 'dodge',
          data: { direction: this.calculateDodgeDirection(context.incomingAttack) },
          timestamp: Date.now(),
        };
      }
    }
    
    // Рефлекс: реакция на урон
    if (context.recentDamage && context.recentDamage > 0) {
      return {
        type: 'flinch',
        data: { damage: context.recentDamage },
        timestamp: Date.now(),
      };
    }
    
    return null;
  }

  /**
   * Принятие решения о действии
   */
  private decideAction(npc: NPCAIState, context: AIContext): NPCAction {
    const config = npc.spinalState.configuration;
    
    // Если есть цель - атаковать или преследовать
    if (npc.targetId && context.targetPosition) {
      const distance = this.calculateDistance(npc, context.targetPosition);
      
      if (distance <= npc.attackRange) {
        // В пределах атаки
        if (Math.random() < config.aggressiveness) {
          return {
            type: 'attack',
            data: { targetId: npc.targetId },
            timestamp: Date.now(),
          };
        }
      } else {
        // Преследование
        return {
          type: 'chase',
          data: { targetId: npc.targetId, targetPosition: context.targetPosition },
          timestamp: Date.now(),
        };
      }
    }
    
    // Патрулирование
    if (npc.role === 'guard' || npc.role === 'monster') {
      return this.decidePatrolAction(npc, context);
    }
    
    // По умолчанию - idle
    return {
      type: 'idle',
      data: {},
      timestamp: Date.now(),
    };
  }

  /**
   * Генерация сигнала от урона
   */
  generateDamageSignal(damage: number, maxHp: number): SpinalSignal {
    return {
      type: 'damage',
      intensity: Math.min(1, damage / (maxHp * 0.2)), // 20% HP = intensity 1
      data: { damage },
    };
  }

  private triggerHighPriorityResponse(npc: NPCAIState, signal: SpinalSignal): void {
    // Добавить рефлекс в activeReflexes
    if (!npc.spinalState.activeReflexes.includes(signal.type)) {
      npc.spinalState.activeReflexes.push(signal.type);
    }
  }

  private calculateDodgeDirection(attack: IncomingAttack): { x: number; y: number } {
    // Перпендикулярно направлению атаки
    return {
      x: attack.direction.y,
      y: -attack.direction.x,
    };
  }

  private calculateDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  private decidePatrolAction(npc: NPCAIState, context: AIContext): NPCAction {
    // Логика патрулирования
    // TODO: реализовать
    return {
      type: 'patrol',
      data: {},
      timestamp: Date.now(),
    };
  }
}

interface AIContext {
  players: PlayerPosition[];
  otherNPCs: NPCAIState[];
  targetPosition?: { x: number; y: number };
  incomingAttack?: IncomingAttack;
  recentDamage?: number;
}

interface IncomingAttack {
  direction: { x: number; y: number };
  damage: number;
}

interface PlayerPosition {
  id: string;
  x: number;
  y: number;
}
```

### 3. `src/lib/game/server/ai/npc-ai-manager.ts`

```typescript
/**
 * Менеджер NPC AI на сервере
 */

import { SpinalServerController } from './spinal-server';
import { NPCAIState, NPCAction } from './types';
import { TruthSystem } from '@/lib/game/truth-system';

export class NPCAIManager {
  private spinalController: SpinalServerController;
  private truthSystem: TruthSystem;
  private tickInterval: NodeJS.Timeout | null = null;
  private npcs: Map<string, NPCAIState> = new Map();

  constructor() {
    this.spinalController = new SpinalServerController();
    this.truthSystem = TruthSystem.getInstance();
  }

  /**
   * Запустить AI tick loop
   */
  startTickLoop(tickMs: number = 1000): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }

    this.tickInterval = setInterval(() => {
      this.processTick();
    }, tickMs);
  }

  /**
   * Остановить AI tick loop
   */
  stopTickLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Обработка одного тика
   */
  private processTick(): void {
    const actions: Array<{ npcId: string; action: NPCAction }> = [];

    for (const [npcId, npc] of this.npcs) {
      if (!npc.isActive) continue;

      // Получить контекст для AI
      const context = this.buildAIContext(npc);

      // Обновить AI
      const action = this.spinalController.update(npc, context);

      if (action) {
        // Выполнить действие
        this.executeAction(npc, action);
        actions.push({ npcId, action });
      }
    }

    // Broadcast действий
    this.broadcastActions(actions);
  }

  /**
   * Построить контекст для AI
   */
  private buildAIContext(npc: NPCAIState): AIContext {
    // Получить позиции игроков и других NPC
    const players = this.getVisiblePlayers(npc);
    const otherNPCs = this.getVisibleNPCs(npc);

    return {
      players,
      otherNPCs,
      targetPosition: this.getTargetPosition(npc),
      incomingAttack: undefined, // TODO: detect
      recentDamage: undefined,   // TODO: track
    };
  }

  /**
   * Выполнить действие NPC
   */
  private executeAction(npc: NPCAIState, action: NPCAction): void {
    switch (action.type) {
      case 'move':
        this.executeMove(npc, action.data);
        break;
      case 'attack':
        this.executeAttack(npc, action.data);
        break;
      case 'flee':
        this.executeFlee(npc, action.data);
        break;
      case 'chase':
        this.executeChase(npc, action.data);
        break;
      // ... другие действия
    }
  }

  /**
   * Зарегистрировать NPC
   */
  registerNPC(npc: NPCAIState): void {
    this.npcs.set(npc.id, npc);
  }

  /**
   * Удалить NPC
   */
  unregisterNPC(npcId: string): void {
    this.npcs.delete(npcId);
  }

  /**
   * Обновить NPC от внешнего события (например, урон)
   */
  updateNPCFromEvent(npcId: string, event: NPCEvent): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    if (event.type === 'damage') {
      // Добавить сигнал в Spinal
      const signal = this.spinalController.generateDamageSignal(
        event.damage,
        npc.maxHp
      );
      npc.spinalState.pendingSignals.push(signal);
      
      // Обновить HP
      npc.hp = event.newHp;
    }
  }

  // Broadcast через callback (устанавливается извне)
  onActions?: (actions: Array<{ npcId: string; action: NPCAction }>) => void;

  private broadcastActions(actions: Array<{ npcId: string; action: NPCAction }>): void {
    if (this.onActions) {
      this.onActions(actions);
    }
  }

  private executeMove(npc: NPCAIState, data: Record<string, unknown>): void {
    const { x, y } = data as { x: number; y: number };
    npc.x = x;
    npc.y = y;
    this.truthSystem.updateNPC(npc.id, { x, y });
  }

  private executeAttack(npc: NPCAIState, data: Record<string, unknown>): void {
    const { targetId } = data as { targetId: string };
    // Использовать CombatService для атаки
    // TODO: интеграция с CombatService
    npc.lastAttackTime = Date.now();
  }

  private executeFlee(npc: NPCAIState, data: Record<string, unknown>): void {
    // Логика бегства
    const fleeDirection = this.calculateFleeDirection(npc);
    npc.x += fleeDirection.x * 50;
    npc.y += fleeDirection.y * 50;
  }

  private executeChase(npc: NPCAIState, data: Record<string, unknown>): void {
    const { targetPosition } = data as { targetPosition: { x: number; y: number } };
    // Движение к цели
    const dx = targetPosition.x - npc.x;
    const dy = targetPosition.y - npc.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      npc.x += (dx / dist) * 30; // Скорость
      npc.y += (dy / dist) * 30;
    }
  }

  private getVisiblePlayers(npc: NPCAIState): PlayerPosition[] {
    // Получить игроков в радиусе сенсора
    // TODO: реализовать через TruthSystem
    return [];
  }

  private getVisibleNPCs(npc: NPCAIState): NPCAIState[] {
    // Получить других NPC в радиусе сенсора
    return [];
  }

  private getTargetPosition(npc: NPCAIState): { x: number; y: number } | undefined {
    // Получить позицию цели
    // TODO: реализовать
    return undefined;
  }

  private calculateFleeDirection(npc: NPCAIState): { x: number; y: number } {
    // Направление от угрозы
    return { x: -1, y: 0 }; // TODO: реальный расчёт
  }
}

interface NPCEvent {
  type: 'damage' | 'heal' | 'status';
  damage?: number;
  newHp?: number;
}
```

### 4. `src/lib/game/server/ai/ai-service.ts`

```typescript
/**
 * Главный AI сервис
 */

import { NPCAIManager } from './npc-ai-manager';
import { SpinalServerController } from './spinal-server';

export class AIService {
  private static instance: AIService;
  private npcManager: NPCAIManager;

  private constructor() {
    this.npcManager = new NPCAIManager();
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Запустить AI систему
   */
  start(tickMs: number = 1000): void {
    this.npcManager.startTickLoop(tickMs);
  }

  /**
   * Остановить AI систему
   */
  stop(): void {
    this.npcManager.stopTickLoop();
  }

  /**
   * Получить NPC Manager
   */
  getNPCManager(): NPCAIManager {
    return this.npcManager;
  }

  /**
   * Установить callback для broadcast
   */
  setBroadcastCallback(
    callback: (actions: Array<{ npcId: string; action: NPCAction }>) => void
  ): void {
    this.npcManager.onActions = callback;
  }
}
```

---

## 📁 ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

### 1. `mini-services/game-ws/index.ts`

**Добавить AI интеграцию:**

```typescript
import { AIService } from '@/lib/game/server';

const aiService = AIService.getInstance();

// Установить callback для broadcast
aiService.setBroadcastCallback((actions) => {
  for (const { npcId, action } of actions) {
    io.emit('npc:action', { npcId, action });
  }
});

// Запустить AI при старте сервера
aiService.start(1000); // 1 тик = 1 секунда

// При подключении игрока - зарегистрировать в AI
socket.on('player:connect', (data) => {
  // Загрузить NPC для локации
  const npcs = loadNPCsForLocation(data.locationId);
  for (const npc of npcs) {
    aiService.getNPCManager().registerNPC(npc);
  }
});

// При уроне NPC - обновить AI
socket.on('combat:result', (result) => {
  if (result.targetId.startsWith('npc_')) {
    aiService.getNPCManager().updateNPCFromEvent(result.targetId, {
      type: 'damage',
      damage: result.damage,
      newHp: result.targetHp,
    });
  }
});
```

### 2. `src/game/objects/NPCSprite.ts`

**Изменения:**
- УБРАТЬ `updateSpinalAI()` 
- УБРАТЬ `takeDamage()` (если остался)
- ДОБАВИТЬ `executeServerAction()`

```typescript
// УДАЛИТЬ:
updateSpinalAI() {
  const action = this.spinalController.update(...);  // ❌ AI на клиенте
  this.executeSpinalAction(action);
}

// ДОБАВИТЬ:
executeServerAction(action: NPCAction) {
  switch (action.type) {
    case 'move':
      this.moveTo(action.data.x, action.data.y);
      break;
    case 'attack':
      this.playAttackAnimation(action.data.targetId);
      break;
    case 'flee':
      this.playFleeAnimation();
      this.moveTo(action.data.targetX, action.data.targetY);
      break;
    case 'dodge':
      this.playDodgeAnimation(action.data.direction);
      break;
    case 'flinch':
      this.playFlinchAnimation();
      break;
    case 'idle':
      this.playIdleAnimation();
      break;
  }
}
```

### 3. `src/game/scenes/LocationScene.ts`

**Изменения:**
- УБРАТЬ `updateAI()` из update loop
- ДОБАВИТЬ слушатель `npc:action`

```typescript
// УДАЛИТЬ из update():
updateAI() {
  for (const npc of this.npcs) {
    npc.updateSpinalAI();  // ❌ AI на клиенте
  }
}

// ДОБАВИТЬ в create():
setupAIListener() {
  this.gameSocket.on('npc:action', (data) => {
    const npc = this.npcs.get(data.npcId);
    if (npc) {
      npc.executeServerAction(data.action);
    }
  });
}
```

---

## 📡 WEBSOCKET ПРОТОКОЛ

### Новые события

#### `npc:action` (Сервер → Клиент, broadcast)

```typescript
{
  npcId: string;
  action: {
    type: 'move' | 'attack' | 'flee' | 'chase' | 'dodge' | 'flinch' | 'idle';
    data: Record<string, unknown>;
    timestamp: number;
  };
}
```

#### `npc:spawn` (Сервер → Клиент)

```typescript
{
  npc: {
    id: string;
    name: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    role: string;
  };
}
```

#### `npc:despawn` (Сервер → Клиент)

```typescript
{
  npcId: string;
  reason: 'death' | 'out_of_range' | 'despawned';
}
```

---

## 🧪 МЕТОДЫ ТЕСТИРОВАНИЯ

### Тест 1: AI работает на сервере

**Цель:** Убедиться, что AI решения принимаются на сервере

**Метод:**
1. Открыть DevTools → Network → WS
2. Наблюдать за `npc:action` событиями
3. Проверить, что действия приходят с сервера

**Критерий:**
- ✅ Регулярные `npc:action` события каждые ~1 сек
- ✅ Действия логичны (патруль, атака, бегство)
- ❌ Нет AI кода на клиенте

### Тест 2: NPC реакция на урон

**Цель:** Проверить, что NPC реагирует на урон через сервер

**Метод:**
1. Атаковать NPC
2. Наблюдать за `npc:action` с типом `flinch` или `flee`
3. Проверить HP пороги для бегства

**Критерий:**
- ✅ NPC получает `flinch` при уроне
- ✅ NPC пытается `flee` при низком HP
- ❌ Реакция приходит от сервера, не генерируется на клиенте

### Тест 3: NPC атака игрока

**Цель:** Проверить, что NPC атакует игрока через сервер

**Метод:**
1. Подойти к агрессивному NPC
2. Наблюдать за `npc:action` с типом `chase` и `attack`
3. Проверить получение урона

**Критерий:**
- ✅ NPC преследует игрока (`chase`)
- ✅ NPC атакует в пределах радиуса (`attack`)
- ✅ Игрок получает урон через `combat:result`

### Тест 4: NPC патрулирование

**Цель:** Проверить патрулирование NPC

**Метод:**
1. Наблюдать за NPC без угроз
2. Проверить `npc:action` с типом `patrol` или `idle`
3. Проверить движение по маршрутам

**Критерий:**
- ✅ NPC патрулирует территорию
- ✅ Движение синхронизировано с сервером
- ❌ Нет локального движения без сервера

### Тест 5: Отключение/подключение

**Цель:** Проверить, что мир продолжает жить без игрока

**Метод:**
1. Подключиться к игре
2. Наблюдать за NPC
3. Закрыть вкладку
4. Открыть снова через 30 сек
5. Проверить, что NPC переместились

**Критерий:**
- ✅ NPC продолжают существовать
- ✅ NPC переместились за время отсутствия
- ✅ Состояние мира синхронизировано

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ ФАЗЫ 3

### Обязательные

- [x] Создан `src/lib/game/ai/server/spinal-server.ts` - серверный адаптер SpinalController
- [x] Создан `src/lib/game/ai/server/npc-ai-manager.ts` - менеджер NPC AI на сервере
- [x] Создан `src/lib/game/ai/server/broadcast-manager.ts` - HTTP polling event queue
- [x] Создан `/api/ai/events` для HTTP polling AI событий
- [x] Создан `/api/ai/tick` для tick loop
- [x] AI tick loop работает через HTTP API
- [x] `executeServerAction()` добавлен в NPCSprite для серверных действий
- [x] `applyServerUpdate()` добавлен для синхронизации состояния
- [x] `updateAI()` в LocationScene отключён (только синхронизация спрайтов)

### Код ревью

- [x] Серверный AI код в `src/lib/game/ai/server/`
- [x] Клиентский AI код отключён но сохранён для обратной совместимости
- [x] Tick loop использует 1 тик = 1 сек
- [x] HTTP-only архитектура (WebSocket удалён)

### Файловая структура

```
src/lib/game/ai/server/
├── spinal-server.ts       ✅ Серверный SpinalController
├── npc-ai-manager.ts      ✅ Менеджер NPC AI
├── broadcast-manager.ts   ✅ HTTP polling event queue
└── index.ts               ✅ Экспорты

src/app/api/ai/
├── events/route.ts        ✅ GET /api/ai/events - polling
└── tick/route.ts          ✅ POST /api/ai/tick - tick loop
```

---

## 📊 ПРОГРЕСС

| Задача | Статус | Время |
|--------|--------|-------|
| Создать `spinal-server.ts` | ✅ | 4 часа |
| Создать `npc-ai-manager.ts` | ✅ | 4 часа |
| Создать `broadcast-manager.ts` | ✅ | 2 часа |
| Создать `/api/ai/events` | ✅ | 1 час |
| Создать `/api/ai/tick` | ✅ | 1 час |
| Обновить `NPCSprite.ts` | ✅ | 2 часа |
| Обновить `LocationScene.ts` | ✅ | 1 час |
| Тестирование | 🔄 | 2 часа |

**Итого:** ~17 часов

---

## 🚀 СЛЕДУЮЩАЯ ФАЗА

После завершения Фазы 3 → [checkpoint_03_25_phase4_cleanup.md](./checkpoint_03_25_phase4_cleanup.md)

---

## 📚 ЗАВИСИМОСТИ

- **Фаза 1:** Combat API (для NPC атак)
- **Фаза 2:** Techniques (для Qi способностей NPC)

---

*Документ создан: 2026-03-25*
*Зависимости: Фаза 1, Фаза 2*
