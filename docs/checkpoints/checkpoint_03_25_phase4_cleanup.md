# ФАЗА 4: Cleanup - Очистка и Финализация

**Версия:** 1.0
**Дата:** 2026-03-25
**Статус:** 📋 ПЛАНИРОВАНИЕ
**Приоритет:** 🟡 СРЕДНИЙ
**Время:** 1-2 дня
**Зависимости:** Фаза 1, Фаза 2, Фаза 3

---

## 🎯 ЦЕЛЬ ФАЗЫ

Очистить клиент от всей бизнес-логики, удалить дублирующийся код, обновить документацию.

### Принцип

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ПРИНЦИП CLEANUP                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ДО:                                                                       │
│   ├── Клиент содержит остатки бизнес-логики                                │
│   ├── Дублирование кода между клиентом и сервером                          │
│   ├── Неиспользуемые функции                                               │
│   └── Устаревшая документация                                              │
│                                                                             │
│   ПОСЛЕ:                                                                    │
│   ├── Клиент = чистый rendering + input                                    │
│   ├── Сервер = вся бизнес-логика                                           │
│   ├── Нет дублирования                                                     │
│   └── Документация актуальна                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 ЗАДАЧИ ОЧИСТКИ

### 1. Удаление клиентской логики

#### Файлы для упрощения

| Файл | Что удалить | Что оставить |
|------|-------------|--------------|
| `TechniqueSlotsManager.ts` | `calculateDamage()`, Qi операции | UI слоты, emit `technique:use` |
| `ProjectileManager.ts` | расчёт урона, применение урона | создание визуала снаряда |
| `NPCSprite.ts` | `takeDamage()`, `updateSpinalAI()`, AI код | `executeServerAction()`, визуал |
| `LocationScene.ts` | `updateAI()`, AI обновления | rendering, input handling |
| `damage-pipeline.ts` | ВЕСЬ файл (мигрирован) | - |
| `npc-damage-calculator.ts` | ВЕСЬ файл (мигрирован) | - |
| `combat-system.ts` (клиент) | Расчёт урона | API для UI (если нужен) |

#### Функции для удаления

```typescript
// УДАЛИТЬ из клиента:

// TechniqueSlotsManager.ts
calculateDamage(technique: Technique): number  // Мигрировано на сервер
calculateQiDensity(level: number): number      // Мигрировано на сервер
checkDestabilization(qiInput: number): boolean // Мигрировано на сервер

// ProjectileManager.ts
applyDamageToTarget(target: NPCSprite, damage: number): void  // Мигрировано
calculateHitResult(projectile: Projectile, target: NPCSprite): HitResult  // Мигрировано

// NPCSprite.ts
takeDamage(damage: number): void               // Мигрировано на сервер
updateSpinalAI(): void                         // Мигрировано на сервер
generateSpinalSignal(type: string): void       // Мигрировано на сервер
executeSpinalAction(action: SpinalAction): void // Заменено на executeServerAction

// LocationScene.ts
updateAI(): void                               // Мигрировано на сервер
updateNPCBehavior(npc: NPCSprite): void        // Мигрировано на сервер

// damage-pipeline.ts (ВЕСЬ ФАЙЛ)
processDamagePipeline(...): DamageResult       // Мигрировано на сервер
calculateLevelSuppression(...): number         // Мигрировано на сервер

// npc-damage-calculator.ts (ВЕСЬ ФАЙЛ)
calculateDamageFromNPC(...): number            // Мигрировано на сервер
```

---

### 2. Упрощение клиентских классов

#### `TechniqueSlotsManager.ts` (ПОСЛЕ)

```typescript
/**
 * TechniqueSlotsManager - ТОЛЬКО UI
 * Вся логика на сервере
 */
export class TechniqueSlotsManager {
  private socket: GameSocket;
  private techniques: Map<string, TechniqueSlotUI>;

  /**
   * Использовать технику
   * ТОЛЬКО отправляет запрос на сервер
   */
  async use(techniqueId: string, targetX: number, targetY: number): Promise<void> {
    // Проверка UI (быстрая)
    const slot = this.techniques.get(techniqueId);
    if (!slot || slot.isOnCooldown) {
      return;
    }

    // Отправить на сервер
    this.socket.emit('technique:use', {
      techniqueId,
      targetX,
      targetY,
    });

    // UI: показать cooldown (optimistic)
    slot.startCooldown();
  }

  /**
   * Обработать результат от сервера
   */
  handleResult(result: TechniqueResult): void {
    if (result.success) {
      // Обновить Qi бар от сервера
      this.updateQiBar(result.currentQi);
      
      // Создать визуал снаряда
      this.createProjectileVisual(result.projectile);
    } else {
      // Показать ошибку
      this.showError(result.reason);
      
      // Отменить cooldown
      const slot = this.techniques.get(result.techniqueId);
      if (slot) slot.cancelCooldown();
    }
  }
}
```

#### `ProjectileManager.ts` (ПОСЛЕ)

```typescript
/**
 * ProjectileManager - ТОЛЬКО ВИЗУАЛ
 * Вся логика на сервере
 */
export class ProjectileManager {
  private scene: Phaser.Scene;
  private socket: GameSocket;

  /**
   * Создать визуал снаряда (данные от сервера)
   */
  createProjectile(data: ServerProjectileData): void {
    const projectile = this.scene.add.sprite(
      data.startX,
      data.startY,
      'projectile'
    );

    // Настроить визуал
    projectile.setTint(this.getColor(data.element));
    projectile.setScale(data.size / 24);

    // Движение к цели (только визуал)
    this.scene.physics.moveTo(
      projectile,
      data.targetX,
      data.targetY,
      data.speed
    );

    // При попадании - уведомить сервер
    this.scene.physics.add.overlap(projectile, this.npcGroup, (proj, npc) => {
      // НЕ применять урон!
      // Только отправить событие на сервер
      this.socket.emit('technique:hit', {
        techniqueId: data.techniqueId,
        targetId: npc.id,
        damage: data.damage, // Урон от сервера
      });

      // Удалить визуал снаряда
      projectile.destroy();
    });
  }
}
```

#### `NPCSprite.ts` (ПОСЛЕ)

```typescript
/**
 * NPCSprite - ТОЛЬКО ВИЗУАЛ
 * Вся логика на сервере
 */
export class NPCSprite extends Phaser.Physics.Arcade.Sprite {
  private hpBar: Phaser.GameObjects.Graphics;

  /**
   * Выполнить действие от сервера
   */
  executeServerAction(action: NPCAction): void {
    switch (action.type) {
      case 'move':
        this.moveTo(action.data.x, action.data.y);
        break;
        
      case 'attack':
        this.playAttackAnimation();
        break;
        
      case 'flee':
        this.playFleeAnimation();
        break;
        
      case 'dodge':
        this.playDodgeAnimation(action.data);
        break;
        
      case 'flinch':
        this.playFlinchAnimation();
        break;
        
      case 'death':
        this.playDeathAnimation();
        break;
        
      case 'idle':
        this.playIdleAnimation();
        break;
    }
  }

  /**
   * Применить обновление от сервера
   */
  applyServerUpdate(update: NPCUpdate): void {
    // HP
    if (update.hp !== undefined) {
      this.hp = update.hp;
      this.updateHpBar();
    }
    
    // Позиция
    if (update.x !== undefined && update.y !== undefined) {
      this.setPosition(update.x, update.y);
    }
    
    // Статус
    if (update.status === 'dead') {
      this.playDeathAnimation();
    }
  }

  // Визуальные методы
  private updateHpBar(): void { /* ... */ }
  private playAttackAnimation(): void { /* ... */ }
  private playFleeAnimation(): void { /* ... */ }
  private playDodgeAnimation(data: unknown): void { /* ... */ }
  private playFlinchAnimation(): void { /* ... */ }
  private playDeathAnimation(): void { /* ... */ }
  private playIdleAnimation(): void { /* ... */ }
}
```

#### `LocationScene.ts` (ПОСЛЕ)

```typescript
/**
 * LocationScene - ТОЛЬКО RENDERING + INPUT
 * Вся логика на сервере
 */
export class LocationScene extends Phaser.Scene {
  private socket: GameSocket;
  private npcs: Map<string, NPCSprite>;

  create() {
    // Rendering setup
    this.createTilemap();
    this.createPlayer();
    
    // Input handling
    this.setupInput();
    
    // WebSocket listeners
    this.setupSocketListeners();
  }

  update() {
    // ТОЛЬКО rendering и input
    this.handleInput();
    this.updateCamera();
    
    // НЕТ AI обновлений!
    // НЕТ логики боя!
  }

  private setupSocketListeners() {
    // NPC действия
    this.socket.on('npc:action', (data) => {
      const npc = this.npcs.get(data.npcId);
      if (npc) {
        npc.executeServerAction(data.action);
      }
    });

    // NPC обновления
    this.socket.on('npc:update', (data) => {
      const npc = this.npcs.get(data.npcId);
      if (npc) {
        npc.applyServerUpdate(data.changes);
      }
    });

    // Результаты боя
    this.socket.on('combat:result', (data) => {
      this.handleCombatResult(data);
    });

    // Результаты техник
    this.socket.on('technique:result', (data) => {
      this.techniqueManager.handleResult(data);
    });
  }

  private handleInput() {
    // Движение игрока
    if (this.cursors.left.isDown) {
      this.socket.emit('player:move', { direction: 'left' });
    }
    // ... другие направления
    
    // Атака
    if (this.attackKey.isDown) {
      this.socket.emit('player:attack', { targetId: this.getTargetId() });
    }
  }
}
```

---

### 3. Удаление файлов

#### Файлы для полного удаления

```
src/lib/game/damage-pipeline.ts        → Мигрирован в server/combat/damage-calculator.ts
src/lib/game/npc-damage-calculator.ts  → Интегрирован в server/combat/damage-calculator.ts
src/lib/game/ai/spinal/                → Мигрирован в server/ai/spinal-server.ts
```

#### Файлы для депрекейта (оставить заглушки)

```typescript
// src/lib/game/damage-pipeline.ts
/**
 * @deprecated Мигрировано в src/lib/game/server/combat/damage-calculator.ts
 * Этот файл будет удалён в следующей версии.
 */
export { processDamagePipeline } from '@/lib/game/server/combat/damage-calculator';
```

---

### 4. Обновление документации

#### Файлы для обновления

| Документ | Что обновить |
|----------|--------------|
| `docs/ARCHITECTURE.md` | Добавить секцию о серверной архитектуре |
| `docs/architecture-analysis.md` | Обновить схему клиент-сервер |
| `docs/FUNCTIONS.md` | Переместить функции в серверную секцию |
| `docs/PHASER_STACK.md` | Уточнить роль Phaser (только визуал) |

#### Новые документы

| Документ | Назначение |
|----------|------------|
| `docs/SERVER_ARCHITECTURE.md` | Полное описание серверной архитектуры |
| `docs/WEBSOCKET_PROTOCOL.md` | Спецификация WebSocket событий |
| `docs/MIGRATION_GUIDE.md` | Руководство по миграции (для будущих изменений) |

---

## 🧪 МЕТОДЫ ТЕСТИРОВАНИЯ

### Тест 1: Поиск остатков логики

**Цель:** Убедиться, что на клиенте нет бизнес-логики

**Метод:**
1. Поиск по ключевым словам:
   ```bash
   grep -r "calculateDamage" src/game/
   grep -r "takeDamage" src/game/
   grep -r "updateAI" src/game/
   grep -r "spinalController" src/game/
   grep -r "hp -= " src/game/
   grep -r "currentQi -=" src/game/
   ```
2. Проверить, что все результаты - комментарии или заглушки

**Критерий:**
- ✅ Нет функций `calculateDamage` в src/game/
- ✅ Нет функций `takeDamage` в src/game/
- ✅ Нет функций `updateAI` в src/game/
- ✅ Нет `hp -=` в src/game/
- ✅ Нет `currentQi -=` в src/game/

### Тест 2: Полное игровое тестирование

**Цель:** Проверить, что игра работает после очистки

**Метод:**
1. Создать нового персонажа
2. Перемещаться по локации
3. Атаковать NPC
4. Использовать техники
5. Получать урон от NPC
6. Убить NPC
7. Перезагрузить страницу

**Критерий:**
- ✅ Все базовые действия работают
- ✅ Урон корректен
- ✅ Qi списывается корректно
- ✅ NPC реагируют правильно
- ✅ Состояние сохраняется

### Тест 3: Тестирование читерства

**Цель:** Финальная проверка защиты от читов

**Метод:**
1. Попробовать подменить WebSocket сообщения
2. Попробовать изменить HP через console
3. Попробовать подменить урон

**Критерий:**
- ✅ Сервер отклоняет невалидные данные
- ✅ HP синхронизируется с сервером
- ✅ Урон рассчитывается на сервере

### Тест 4: Performance тест

**Цель:** Проверить производительность после очистки

**Метод:**
1. Создать сцену с 10 NPC
2. Измерить FPS
3. Измерить задержку WebSocket
4. Проверить использование памяти

**Критерий:**
- ✅ FPS >= 55
- ✅ WebSocket задержка < 100мс
- ✅ Память < 200MB

### Тест 5: Code review

**Цель:** Финальная проверка кода

**Метод:**
1. Проверить структуру файлов
2. Проверить imports
3. Проверить типы
4. Проверить комментарии

**Критерий:**
- ✅ Нет циклических зависимостей
- ✅ Все типы определены
- ✅ Нет TODO без issue
- ✅ Документация актуальна

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ ФАЗЫ 4

### Обязательные

- [ ] Удалены все файлы client-side логики
- [ ] Упрощены все клиентские классы
- [ ] Нет дублирования кода
- [ ] Документация обновлена
- [ ] Все тесты проходят

### Финальный чек-лист архитектуры

- [ ] **Сервер = Истина**: Все расчёты на сервере
- [ ] **Клиент = Отображение**: Только rendering и input
- [ ] **WebSocket = Real-time**: Все действия через WS
- [ ] **TruthSystem = State**: Единое состояние
- [ ] **No Cheating**: Защита от читов работает

### Метрики успеха

| Метрика | Значение |
|---------|----------|
| Строк кода на клиенте | -30% (удалена логика) |
| Строк кода на сервере | +20% (миграция) |
| WebSocket событий | 10+ типов |
| Время отклика | < 100мс |
| FPS | >= 55 |

---

## 📊 ПРОГРЕСС

| Задача | Статус | Время |
|--------|--------|-------|
| Удаление клиентской логики | 📋 | 3 часа |
| Упрощение классов | 📋 | 3 часа |
| Удаление файлов | 📋 | 1 час |
| Обновление документации | 📋 | 2 часа |
| Финальное тестирование | 📋 | 3 часа |

**Итого:** ~12 часов (1-2 дня)

---

## 🎉 ЗАВЕРШЕНИЕ РЕФАКТОРИНГА

После завершения Фазы 4 проект должен иметь:

### Архитектура

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ИТОГОВАЯ АРХИТЕКТУРА                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   СЕРВЕР (Единая точка истины)                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                      │   │
│   │   TruthSystem ─── Хранит ВСЁ состояние                              │   │
│   │   CombatService ─ Расчёт и применение урона                         │   │
│   │   TechniqueService ─ Техники и Qi                                   │   │
│   │   AIService ────── NPC AI и tick loop                               │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                  │ WebSocket                                │
│                                  ▼                                          │
│   КЛИЕНТ (Только отображение)                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                      │   │
│   │   Phaser ──────── Rendering + Animations                            │   │
│   │   Input ───────── Обработка нажатий → emit                          │   │
│   │   UI ──────────── HP/Qi бары, инвентарь                             │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Следующие шаги

1. ✅ Рефакторинг завершён
2. 📋 Следующие улучшения:
   - Оптимизация WebSocket
   - Кэширование на клиенте
   - Больше AI поведений
   - Новые техники

---

*Документ создан: 2026-03-25*
*Зависимости: Фаза 1, Фаза 2, Фаза 3*
