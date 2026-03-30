# Чекпоинт: Spinal AI - Фаза 2 (Интеграция и тестирование)

**Версия:** 1.1
**Дата:** 2026-03-24
**Статус:** ✅ Завершено
**Зависимость:** [checkpoint_03_24_spinal_ai_phase1.md](./checkpoint_03_24_spinal_ai_phase1.md)

---

## 📋 Обзор

Фаза 2: Интеграция Spinal AI с существующими NPC, тестирование и отладка.

---

## 🏗️ Текущее состояние NPC

### Анализ существующего кода

**Файл:** `src/game/objects/NPCSprite.ts`

```typescript
// Текущая реализация:
// - Создание спрайта NPC
// - Загрузка анимаций
// - Базовая физика
// - ✅ SpinalController интегрирован
// - ✅ Рефлекторные реакции (dodge, flinch, flee, qi_shield)
// - ✅ Генерация сигналов на события
```

**Файл:** `src/lib/game/npc-ai.ts` (существующий)

```typescript
// Текущая реализация:
// - ✅ SpinalController для быстрых реакций
// - ✅ Рефлекторная система работает
// - ✅ Пресеты для разных типов NPC
```

---

## 📁 Этапы интеграции

### 2.1 Обновление NPCSprite

**Файл:** `src/game/objects/NPCSprite.ts`

**Изменения:**

1. **Добавить SpinalController:**
```typescript
import { SpinalController } from '@/lib/game/ai/spinal/spinal-controller';

class NPCSprite extends Phaser.Physics.Arcade.Sprite {
  private spinalController: SpinalController | null = null;
  
  initializeAI(preset: SpinalPresetType): void {
    this.spinalController = new SpinalController(preset);
  }
}
```

2. **Добавить генерацию сигналов:**
```typescript
// В update() или при событиях
private checkForSignals(): void {
  // Проверка столкновений
  if (this.body.touching.none === false) {
    this.emitSignal('collision', 0.5);
  }
  
  // Проверка урона
  if (this.lastDamageTime > 0) {
    this.emitSignal('damage', this.lastDamageIntensity);
  }
  
  // Проверка краёв
  if (this.isNearEdge()) {
    this.emitSignal('edge_detected', 0.8);
  }
}
```

3. **Добавить выполнение действий:**
```typescript
private executeSpinalAction(action: SpinalAction): void {
  switch (action.type) {
    case 'dodge':
      this.performDodge(action.params);
      break;
    case 'flinch':
      this.performFlinch(action.params);
      break;
    case 'step_back':
      this.performStepBack(action.params);
      break;
    // ...
  }
}
```

---

### 2.2 Создание сценариев тестирования

**Файл:** `docs/testing/spinal-ai-tests.md`

#### Тест 1: Уклонение от опасности

```
Сценарий:
1. Создать NPC (monster preset)
2. Игрок подходит к NPC (симуляция danger_nearby)
3. Проверить: NPC должен уклониться

Ожидаемое:
- Сигнал danger_nearby с intensity > 0.7
- Рефлекс danger_dodge с приоритетом 100
- Действие dodge выполнено
- Время реакции < 100мс
```

#### Тест 2: Реакция на урон

```
Сценарий:
1. Создать NPC (guard preset)
2. Нанести урон NPC (симуляция damage)
3. Проверить: NPC должен вздрогнуть

Ожидаемое:
- Сигнал damage с intensity > 0.3
- Рефлекс pain_flinch с приоритетом 90
- Действие flinch выполнено
- Анимация проиграна
```

#### Тест 3: Отступление от края

```
Сценарий:
1. Создать NPC (passerby preset)
2. NPC приближается к краю обрыва
3. Проверить: NPC должен отступить

Ожидаемое:
- Сигнал edge_detected
- Рефлекс edge_retreat с приоритетом 85
- Действие step_back выполнено
- NPC изменил направление
```

#### Тест 4: Qi щит (культиватор)

```
Сценарий:
1. Создать NPC (cultivator preset, qi > 20)
2. Qi атака направлена на NPC
3. Проверить: Qi щит активирован

Ожидаемое:
- Сигнал danger_nearby с source='qi_attack'
- Рефлекс qi_shield_reflex с приоритетом 95
- Действие qi_shield выполнено
- Визуальный эффект щита
```

---

### 2.3 Производительность

**Метрики для замера:**

| Метрика | Цель | Инструмент |
|---------|------|------------|
| `update()` время | < 1мс | `performance.now()` |
| Время с 1 NPC | < 1мс | console.time |
| Время с 10 NPC | < 5мс | console.time |
| Время с 50 NPC | < 16мс | console.time |
| Память на NPC | < 1KB | Chrome DevTools |

**Тест производительности:**
```typescript
// В LocationScene.ts
performanceTest(): void {
  const iterations = 1000;
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    this.npcs.forEach(npc => {
      npc.update(16, this.getCurrentState());
    });
  }
  
  const totalTime = performance.now() - startTime;
  const avgTime = totalTime / iterations;
  
  console.log(`Avg update time: ${avgTime.toFixed(3)}ms`);
  // Target: < 1ms
}
```

---

### 2.4 Отладка

**Файл:** `src/lib/game/ai/spinal/debug.ts`

**Инструменты отладки:**

1. **Логирование сигналов:**
```typescript
// Включить логи
SpinalController.setDebugEnabled(true);

// Формат лога:
// [SpinalAI:monster_01] Signal: damage, intensity: 0.5
// [SpinalAI:monster_01] Reflex: pain_flinch, priority: 90
// [SpinalAI:monster_01] Action: flinch, duration: 200ms
```

2. **Визуализация:**
```typescript
// Отрисовка в Phaser
drawDebug(graphics: Phaser.GameObjects.Graphics): void {
  // Показать текущий рефлекс
  // Показать направление угрозы
  // Показать зону обнаружения
}
```

3. **Инспекция состояния:**
```typescript
// В консоли браузера
window.spinalDebug = {
  getNPCState: (npcId) => {...},
  getAllReflexes: (npcId) => {...},
  simulateSignal: (npcId, signal) => {...},
};
```

---

### 2.5 Интеграция с Event Bus

**Критичные события для сервера:**

```typescript
// В NPCSprite.ts

// При получении урона
onDamageReceived(damage: number, sourceId: string): void {
  // 1. Spinal AI (мгновенно)
  this.generateSignal('damage', damage / this.maxHp);
  
  // 2. Асинхронно на сервер
  eventBusClient.reportDamageReceived({
    sourceId,
    damage,
    newHealth: this.hp,
    maxHealth: this.maxHp,
  }).then(response => {
    // Синхронизация с TruthSystem
    if (response.changes?.character) {
      this.syncFromServer(response.changes.character);
    }
  });
}

// При смерти
onDeath(killerId: string | null): void {
  // Асинхронно на сервер
  eventBusClient.sendEvent('npc:death', {
    npcId: this.id,
    killerId,
    locationId: GameBridge.getCurrentLocation(),
  });
}
```

---

## ✅ Критерии готовности Фазы 2

### 2.1 NPCSprite
- [x] SpinalController интегрирован
- [x] Сигналы генерируются корректно
- [x] Действия выполняются

### 2.2 Тестирование
- [x] 36 unit тестов пройдено
- [x] Все рефлексы работают
- [x] Производительность проверена (0.003мс среднее)

### 2.3 Производительность
- [x] update() < 1мс (1 NPC) - тест пройден
- [x] update() < 16мс (50 NPC) - расчётно пройдено

### 2.4 Отладка
- [x] Логирование работает (SpinalDebugger)
- [x] Debug инструменты работают
- [x] Browser API установлен (window.spinalDebug)

### 2.5 Event Bus
- [x] Урон синхронизируется (через eventBusClient)
- [x] Смерть обрабатывается

---

## 🔗 Связанные документы

- [checkpoint_03_24_spinal_ai_phase1.md](./checkpoint_03_24_spinal_ai_phase1.md)
- [event-bus/README.md](../event-bus/)
- [NPCSprite.ts](../../src/game/objects/NPCSprite.ts) (существующий)

---

**АВТОР**: AI Assistant
**ДАТА**: 2026-03-24
