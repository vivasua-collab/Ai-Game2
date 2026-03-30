# ЧЕКПОИНТ: 2026-03-26 - Серверная логика управления NPC

**Версия:** 1.0
**Дата:** 2026-03-26
**Статус:** 🔄 В РАБОТЕ
**Приоритет:** 🔴 КРИТИЧЕСКИЙ

---

## 🎯 ЦЕЛЬ

Перенести ВСЮ логику управления NPC на серверный слой "Земля":
- NPC AI (поведение, решения)
- NPC Actions (движение, атака, бегство)
- NPC Techniques и Inventory

На слое "Облако" (клиент) — только отображение и триггеры взаимодействий.

---

## 🔍 АНАЛИЗ ПРОБЛЕМЫ

### Симптомы
- ✅ NPC видны на экране
- ✅ NPC получают урон от удара рукой
- ❌ **NPC НЕ ДВИГАЮТСЯ**

### Корневая причина

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ПОЧЕМУ NPC НЕ ДВИГАЮТСЯ?                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. Серверный AI создан ✅                                                  │
│      ├── src/lib/game/ai/server/npc-ai-manager.ts                           │
│      ├── src/lib/game/ai/server/broadcast-manager.ts                        │
│      └── src/lib/game/ai/server/spinal-server.ts                            │
│                                                                              │
│   2. API endpoints созданы ✅                                                │
│      ├── POST /api/ai/tick - запуск AI tick                                 │
│      └── GET /api/ai/events - polling событий                               │
│                                                                              │
│   3. Клиентский polling создан ✅                                            │
│      └── src/lib/game/ai/client/ai-polling-client.ts                        │
│                                                                              │
│   4. НО! AIPollingClient НЕ ИНИЦИАЛИЗИРОВАН ❌                              │
│      └── LocationScene не запускает polling!                                │
│                                                                              │
│   5. НЕТ слушателя npc:server-action событий ❌                             │
│      └── NPCSprite.executeServerAction() никогда не вызывается!             │
│                                                                              │
│   ═════════════════════════════════════════════════════════════════════════  │
│                                                                              │
│   РЕЗУЛЬТАТ: Сервер вычисляет AI, но клиент НЕ ПОЛУЧАЕТ команды!            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Текущий поток данных (сломанный)

```
Сервер:
  npc-ai-manager.updateAllNPCs()
  └── spinal-server.update() для каждого NPC
      └── BroadcastManager.broadcastNPCAction()
          └── Событие в очередь событий ❌ НИКТО НЕ ЧИТАЕТ!

Клиент:
  LocationScene.updateAI()
  └── Синхронизация спрайтов
  └── НЕТ polling событий от сервера!
  └── NPCSprite.executeServerAction() НИКОГДА НЕ ВЫЗЫВАЕТСЯ
```

---

## 📋 ПЛАН ИСПРАВЛЕНИЯ

### Фаза 1: Интеграция AIPollingClient в LocationScene (КРИТИЧЕСКАЯ)

**Задачи:**
- [x] Проанализировать код
- [ ] Инициализировать AIPollingClient в LocationScene.create()
- [ ] Добавить слушатель `npc:server-action` событий
- [ ] Вызывать `NPCSprite.executeServerAction()` при получении событий
- [ ] Отправлять позицию игрока на сервер для AI

**Файлы для изменения:**
- `src/game/scenes/LocationScene.ts`

### Фаза 2: Проверка серверного AI

**Задачи:**
- [ ] Проверить, что NPC загружаются в NPCWorldManager
- [ ] Проверить, что AI tick обрабатывает NPC
- [ ] Проверить, что broadcast отправляет события

**Файлы для проверки:**
- `src/app/api/ai/tick/route.ts`
- `src/lib/game/ai/server/npc-ai-manager.ts`
- `src/lib/game/ai/server/broadcast-manager.ts`

### Фаза 3: Тестирование

**Задачи:**
- [ ] Проверить движение NPC при приближении игрока
- [ ] Проверить реакцию NPC на урон
- [ ] Проверить преследование и атаку

---

## 📐 АРХИТЕКТУРА: Божество → Облако → Земля

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ЦЕЛЕВАЯ АРХИТЕКТУРА                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   👁️ БОЖЕСТВО (Игрок)                                                       │
│   ├── Управляет аватаром в мире                                              │
│   ├── Принимает решения (атака, движение, отдых)                            │
│   └── Видит мир через "облако" (экран)                                      │
│                                                                              │
│   ☁️ ОБЛАКО (Браузер / Thin Client)                                         │
│   ├── Phaser: рендеринг, анимации, эффекты                                  │
│   ├── AIPollingClient: HTTP polling событий                                 │
│   ├── NPCSprite.executeServerAction(): выполнение команд сервера            │
│   └── ⚠️ НИКАКОЙ бизнес-логики                                              │
│                                                                              │
│   🌍 ЗЕМЛЯ (Сервер - TruthSystem)                                           │
│   ├── TruthSystem: хранит состояние (HP, Qi, NPC, мир)                      │
│   ├── NPCAIManager: управляет AI всех NPC                                   │
│   ├── SpinalServerController: принимает решения для NPC                     │
│   ├── BroadcastManager: отправляет события клиенту                          │
│   └── 1 TICK = 1 СЕКУНДА реального времени                                  │
│                                                                              │
│   ═════════════════════════════════════════════════════════════════════════  │
│                                                                              │
│   ПОТОК:                                                                     │
│   👁️ Игрок двигается → ☁️ Отправка позиции на сервер                       │
│   🌍 Сервер: AI решает что делать NPC → broadcast npc:action               │
│   ☁️ AIPollingClient получает событие → NPCSprite.executeServerAction()    │
│   👁️ Игрок видит движение NPC                                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 ИЗМЕНЁННЫЕ ФАЙЛЫ

### Фаза 7: Исправление NPC Movement (19:45 UTC)

**Проблема:** NPC не двигаются и не реагируют на урон.

**Корневые причины найдены:**
1. Singleton `sessionNPCManager` НЕ работает между процессами в Next.js dev mode
2. `locationId` клиента (`training_ground`) != `locationId` сервера (DB ID)
3. Позиция игрока не отправлялась в AI tick

**Исправления:**

#### 1. `src/app/api/ai/tick/route.ts` - HTTP fallback для загрузки NPC
```typescript
// Пытаемся загрузить NPC через:
// 1. Singleton (тот же процесс)
// 2. getAllSessionNPCs (любая локация)
// 3. HTTP запрос к /api/temp-npc (другой процесс)
```

#### 2. `src/lib/game/ai/client/ai-polling-client.ts` - Синхронизация позиции
```typescript
// Добавлено:
private lastPlayerPosition: { x: number; y: number } | null = null;
updatePlayerPosition(x: number, y: number): void { ... }

// performTick() отправляет позицию игрока
body.playerX = this.lastPlayerPosition.x;
body.playerY = this.lastPlayerPosition.y;
```

#### 3. `src/game/scenes/LocationScene.ts` - Отправка позиции каждый кадр
```typescript
// update():
if (this.aiPollingClient?.isActive()) {
  this.aiPollingClient.updatePlayerPosition(this.playerX, this.playerY);
}
```

**Осталось сделать:**
- [ ] Триггеры урона на сервер (`/api/npc/damage`)
- [ ] Тест движения NPC

---

### Фаза 1: npc-ai-manager.ts - Добавлена проактивная логика AI

**Проблема:** SpinalController - это РЕФЛЕКТОРНАЯ система. Он генерирует только реакции (dodge, flinch, flee), но НЕ активные действия (chase, patrol, move).

**Решение:** Добавлена двухуровневая система AI:

```typescript
// === ШАГ 1: Рефлекторные реакции (Spinal AI) ===
const reflexAction = entry.controller.update(1000, npc, signal);
if (reflexAction && reflexAction.type !== 'idle') {
  this.executeAction(npc, reflexAction);
  return;
}

// === ШАГ 2: Проактивные действия (Proactive AI) ===
const proactiveAction = this.generateProactiveAction(npc, nearestPlayer, distance);
if (proactiveAction) {
  this.executeAction(npc, proactiveAction);
}
```

**Добавленные методы:**

1. `generateProactiveAction()` - генерирует активные действия:
   - Агрессивные NPC преследуют игрока (chase)
   - Враги атакуют в радиусе атаки (attack)
   - Охранники и монстры патрулируют (patrol)
   - По умолчанию - idle

2. `calculateChasePosition()` - вычисляет позицию преследования

3. `generatePatrolTarget()` - генерирует точку патрулирования

4. `calculateAttackDamage()` - рассчитывает урон атаки

### Фаза 2: npc-state.ts - Добавлены новые поля

```typescript
// === Бой ===
attackRange?: number;       // Радиус атаки
lastAttackTime?: number;    // Время последней атаки

// === Движение ===
chaseSpeed?: number;        // Скорость преследования
patrolSpeed?: number;       // Скорость патрулирования
patrolRadius?: number;      // Радиус патрулирования
```

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ

- [ ] AIPollingClient инициализирован в LocationScene
- [ ] Слушатели событий добавлены
- [ ] NPC двигаются при приближении игрока
- [ ] NPC реагируют на урон
- [ ] NPC преследуют игрока (если агрессивны)

---

## 📚 СВЯЗАННЫЕ ДОКУМЕНТЫ

- [ARCHITECTURE_cloud.md](../ARCHITECTURE_cloud.md) - Архитектура "Божество → Облако → Земля"
- [ARCHITECTURE_refact.md](../ARCHITECTURE_refact.md) - План рефакторинга
- [checkpoint_03_25_phase3_ai.md](./checkpoint_03_25_phase3_ai.md) - Серверный AI
- [checkpoint_03_25_phase4_cleanup.md](./checkpoint_03_25_phase4_cleanup.md) - Cleanup
- [checkpoint_03_26_History.md](./checkpoint_03_26_History.md) - История сессии

---

*Документ создан: 2026-03-26*
*Статус: В разработке*
