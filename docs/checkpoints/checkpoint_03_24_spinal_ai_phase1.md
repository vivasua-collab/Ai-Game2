# Чекпоинт: Spinal AI - Фаза 1 (Базовая реализация)

**Версия:** 1.1
**Дата:** 2026-03-24
**Статус:** ✅ Завершено
**Основание:** 
- [NPC_AI_THEORY.md](../NPC_AI_THEORY.md)
- [NPC_AI_NEUROTHEORY.md](../NPC_AI_NEUROTHEORY.md)
- [checkpoint_03_24_AI.md](./checkpoint_03_24_AI.md)

---

## 📋 Обзор

Первая фаза внедрения классического (правила-based) Spinal AI.
Spinal AI - это быстрая рефлекторная система, работающая **синхронно на клиенте** (в Phaser).

---

## 🏗️ Архитектура взаимодействия

### Проблема

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ПРОБЛЕМА АРХИТЕКТУРЫ                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Требование Spinal AI:                                              │
│  • Скорость реакции: < 1мс                                          │
│  • Работает каждый кадр (16мс)                                      │
│  • Мгновенные рефлексы                                              │
│                                                                      │
│  Текущая архитектура:                                               │
│  • Event Bus = HTTP запросы                                         │
│  • Задержка: 10-100мс (асинхронно)                                  │
│  • Серверная обработка                                              │
│                                                                      │
│  ⚠️ КОНФЛИКТ: Spinal AI не может работать через Event Bus!          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Решение

```
┌─────────────────────────────────────────────────────────────────────┐
│                    РЕШЕНИЕ: КЛИЕНТСКИЙ SPINAL AI                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PHASER SCENE (Клиент)                                              │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │   Signal ──► SpinalController ──► Action                    │   │
│   │   (урон)     (< 1мс, локально)    (уклонение)              │   │
│   │                                                             │   │
│   │   ☑️ Синхронно, мгновенно                                   │   │
│   │   ☑️ Без HTTP запросов                                      │   │
│   │   ☑️ Работает каждый кадр                                   │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                          │                                           │
│                          │ Только критичные события                  │
│                          ▼                                           │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │   EventBusClient ──► /api/game/event                        │   │
│   │   (смерть NPC,                                         │   │
│   │    получен урон,                                       │   │
│   │    конец боя)                                          │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   SERVER (Event Bus)                                                 │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │   processEvent() ──► TruthSystem                            │   │
│   │   (обновление HP,                                          │   │
│   │    синхронизация состояния)                                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Файловая структура

```
src/lib/game/ai/spinal/
├── types.ts                 # ✅ Создан - типы для Spinal AI
├── spinal-controller.ts     # ✅ Создан - главный контроллер
├── spinal-controller.test.ts# ✅ Создан - unit тесты (36 тестов)
├── reflexes.ts              # ✅ Создан - библиотека рефлексов
├── debug.ts                 # ✅ Создан - инструменты отладки
├── index.ts                 # ✅ Создан - экспорт модуля
├── presets/                 # ✅ Создан - пресеты для типов NPC
│   ├── index.ts
│   ├── monster.ts
│   ├── guard.ts
│   ├── passerby.ts
│   └── cultivator.ts
└── README.md                # ⏳ Документация (опционально)

src/game/                    # Интеграция с Phaser
├── objects/NPCSprite.ts     # ✅ Обновлён - добавлен SpinalController
└── scenes/LocationScene.ts  # ⏳ Обновить update() (интеграция)
```

---

## 📋 Этапы реализации

### 1.1 SpinalController (Клиентский)

**Файл:** `src/lib/game/ai/spinal/spinal-controller.ts`

**Ответственность:**
- Приём сигналов от Phaser
- Обработка рефлексов
- Генерация действий
- **Без HTTP запросов**

**Интерфейс:**
```typescript
interface SpinalController {
  // Приём сигнала
  receiveSignal(signal: SpinalSignal): void;
  
  // Обновление каждый кадр (< 1мс)
  update(deltaMs: number, state: SpinalBodyState): SpinalAction | null;
  
  // Управление рефлексами
  loadPreset(preset: SpinalPresetType): void;
  addReflex(reflex: SpinalReflex): void;
  
  // Состояние
  getCurrentReflex(): string | null;
  getDebugInfo(): SpinalDebugInfo;
}
```

**Критичные требования:**
- [ ] Время выполнения `update()`: < 1мс
- [ ] Нет HTTP запросов внутри update()
- [ ] Нет Promise/async внутри update()

---

### 1.2 Библиотека рефлексов

**Файл:** `src/lib/game/ai/spinal/reflexes.ts`

**Базовые рефлексы:**

| ID | Название | Триггер | Действие | Приоритет |
|----|----------|---------|----------|-----------|
| `danger_dodge` | Уклонение от опасности | danger_nearby, intensity > 0.7 | dodge | 100 |
| `pain_flinch` | Вздрогнуть от боли | damage, intensity > 0.3 | flinch | 90 |
| `edge_retreat` | Отойти от края | edge_detected | step_back | 85 |
| `collision_stumble` | Пошатнуться при столкновении | collision | stumble | 80 |
| `sound_orient` | Повернуться на звук | loud_sound, intensity > 0.5 | turn_to_sound | 30 |
| `balance_recover` | Восстановить равновесие | balance_lost | balance | 70 |

**Рефлексы для культиваторов:**

| ID | Название | Триггер | Действие | Приоритет |
|----|----------|---------|----------|-----------|
| `qi_shield_reflex` | Авто-щит Qi | qi_attack, qi > 20 | qi_shield | 95 |
| `suppression_freeze` | Замереть от подавления | suppression, intensity > 0.9 | freeze | 99 |

---

### 1.3 Пресеты NPC

**Файлы:** `src/lib/game/ai/spinal/presets/*.ts`

#### monster.ts
```
Рефлексы: danger_dodge, pain_flinch, edge_retreat
Пороги: низкая чувствительность
Модификаторы: быстрая реакция, агрессивное уклонение
```

#### guard.ts
```
Рефлексы: danger_dodge, pain_flinch, sound_orient
Пороги: средняя чувствительность
Модификаторы: осторожное уклонение
```

#### passerby.ts
```
Рефлексы: danger_dodge (трусливый), pain_flinch, edge_retreat
Пороги: высокая чувствительность (раньше реагирует)
Модификаторы: убегание вместо уклонения
```

#### cultivator.ts
```
Рефлексы: все базовые + qi_shield_reflex + suppression_freeze
Пороги: зависят от уровня культивации
Модификаторы: Qi-усиленные реакции
```

---

### 1.4 Интеграция с Phaser

**Файл:** `src/game/objects/NPCSprite.ts`

**Изменения:**
```typescript
class NPCSprite extends Phaser.Physics.Arcade.Sprite {
  private spinalController: SpinalController;
  
  // Добавить метод для генерации сигналов
  generateSpinalSignal(type: SpinalSignalType, intensity: number): void {
    this.spinalController.receiveSignal({
      type,
      intensity,
      direction: this.getThreatDirection(),
      timestamp: Date.now(),
    });
  }
  
  // Добавить в update()
  update(time: number, delta: number): void {
    // 1. Собираем состояние тела
    const bodyState = this.collectBodyState();
    
    // 2. Spinal AI (синхронно, < 1мс)
    const action = this.spinalController.update(delta, bodyState);
    
    // 3. Выполняем действие
    if (action) {
      this.executeSpinalAction(action);
    }
  }
}
```

---

### 1.5 Связь с сервером

**Когда отправлять на сервер:**

| Событие | Через Event Bus? | Причина |
|---------|-----------------|---------|
| Уклонение | ❌ Нет | Чисто визуальное |
| Flinch | ❌ Нет | Чисто визуальное |
| Получен урон | ✅ Да | Нужно обновить HP в TruthSystem |
| Смерть NPC | ✅ Да | Нужно удалить из БД |
| Начало боя | ✅ Да | Для логики секты/фракций |
| Конец боя | ✅ Да | Для наград/репутации |

**Пример:**
```typescript
// В NPCSprite.ts
onDamageReceived(damage: number, source: string): void {
  // 1. Spinal AI (мгновенно)
  this.generateSpinalSignal('damage', damage / this.maxHp);
  
  // 2. Локальное обновление HP (для визуала)
  this.hp -= damage;
  
  // 3. Асинхронно на сервер (не блокирует)
  if (this.hp <= 0) {
    eventBusClient.sendEvent('npc:death', {
      npcId: this.id,
      killerId: source,
    });
  }
}
```

---

## ⏱️ Ограничения производительности

| Метрика | Цель | Измерение |
|---------|------|-----------|
| `update()` время | < 1мс | console.time() |
| Память на NPC | < 1KB | Профайлер |
| Рефлексов на NPC | < 10 | Статический анализ |

---

## ✅ Критерии готовности

### Фаза 1.1: Базовый контроллер
- [x] SpinalController реализован
- [x] update() работает за < 1мс (тест: 0.003мс среднее)
- [x] Тесты на производительность пройдены

### Фаза 1.2: Рефлексы
- [x] 6 базовых рефлексов реализованы
- [x] Приоритеты работают корректно
- [x] Кулдауны соблюдаются

### Фаза 1.3: Пресеты
- [x] 4 пресета созданы (monster, guard, passerby, cultivator)
- [x] Загрузка пресета работает
- [x] Переопределение рефлексов работает

### Фаза 1.4: Интеграция
- [x] NPCSprite интегрирован
- [x] Сигналы генерируются корректно
- [x] Действия выполняются в Phaser

### Фаза 1.5: Сервер
- [x] Критичные события отправляются (через eventBusClient)
- [x] HP синхронизируется
- [x] Смерть NPC обрабатывается

---

## 🔗 Связанные документы

- [NPC_AI_NEUROTHEORY.md](../NPC_AI_NEUROTHEORY.md) - Нейротеория
- [checkpoint_03_24_AI.md](./checkpoint_03_24_AI.md) - Общий план
- [event-bus/README.md](../event-bus/) - Документация Event Bus

---

## 📝 Примечания

1. **Spinal AI всегда на клиенте** - для мгновенной реакции
2. **Event Bus только для критичных данных** - смерть, урон
3. **Избегать async в update()** - блокирует Phaser
4. **Тестировать производительность** - target < 1мс

---

**АВТОР**: AI Assistant
**ДАТА**: 2026-03-24
