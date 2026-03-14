# 📋 Checkpoint 03.14 — План рефакторинга и развития

**Дата создания:** 2026-03-14
**Ветка:** main2d4
**Статус:** 🔄 В работе

---

## 🔍 Результаты анализа кода

### 1. Дублирующиеся функции

| Функция | Файлы-дубликаты | Рекомендация |
|---------|-----------------|--------------|
| `getTimeOfDay` | `meditation-interruption.ts`, `time-system.ts`, `world.service.ts`, `chat/utils/time-utils.ts` | Унифицировать в `time-system.ts` |
| `getSeason` / `getSeasonName` | `time-system.ts`, `chat/utils/time-utils.ts` | Унифицировать в `time-system.ts` |
| `formatTime` | `qi-shared.ts`, `time-system.ts` | Разные сигнатуры - оставить обе |

### 2. Система прерываний медитации

**Статус:** ⚠️ Отключена (заглушка)

```typescript
// src/app/api/meditation/route.ts:297
const MEDITATION_INTERRUPTIONS_ENABLED = false;
```

**UI:** Сообщение "⚠️ Возможны прерывания (N проверок)" в RestDialog.tsx — оставить как заглушку.

**Действие:** Не трогать до отдельного распоряжения.

---

### 3. Передача дельты от движка в TruthSystem

**Проблема:** В combat handler есть генерация дельты, но нет её применения к персонажу.

```typescript
// src/lib/game/combat-system.ts
export function generateAttackDelta(...) // ✅ Есть
export function createCombatDeltaAction(...) // ✅ Есть

// Но в handlers/combat.ts НЕТ вызова addStatDelta из stat-truth.ts!
```

**Требуется:** Интегрировать вызов `addStatDelta()` после успешной атаки.

---

### 4. Система коллизий NPC

**Статус:** ✅ Реализовано

Файл: `src/lib/game/npc-collision.ts`

Функции:
- `checkNPCCollision()` — проверка столкновения
- `applyCollisionPush()` — выталкивание
- `calculateCollisionConfig()` — конфигурация
- `calculateInteractionZones()` — зоны взаимодействия
- `checkPlayerInteraction()` — взаимодействие с игроком

**Но:** Требуется интеграция в движок Phaser через Event Bus.

---

### 5. ⚠️ КРИТИЧНО: Таймаут кулачного боя

**Проблема:** При зажатой кнопке атаки (pointerdown) игрок может нанести огромный урон (до 1000+) без таймаута.

**Расположение:** `src/game/scenes/LocationScene.ts:800`

```typescript
private performAttack(): void {
  const attackRange = 150, attackAngle = 60, attackDamage = 50;
  // ❌ НЕТ проверки lastAttackTime!
  for (const target of this.targets) {
    if (this.checkAttackHit(...)) {
      this.damageTarget(target, attackDamage, 'normal');
    }
  }
}
```

**Вызов:** `src/game/scenes/LocationScene.ts:576`
```typescript
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  if (pointer.leftButtonDown()) this.performAttack();
});
```

**Решение:**
1. Добавить поле `lastAttackTime: number` в класс
2. Добавить константу `ATTACK_COOLDOWN = 500` (мс)
3. Проверять таймаут перед атакой

```typescript
// Предлагаемая реализация:
private lastAttackTime: number = 0;
private static readonly ATTACK_COOLDOWN = 500; // 0.5 сек

private performAttack(): void {
  const now = Date.now();
  if (now - this.lastAttackTime < LocationScene.ATTACK_COOLDOWN) {
    return; // Кулдаун не прошёл
  }
  this.lastAttackTime = now;
  // ... остальной код атаки
}
```

---

### 6. Первый слот игрока (Slot 0)

**Статус:** ✅ Ограничение реализовано

**Расположение:** `src/app/api/technique/slot/route.ts:113-129`

```typescript
// === ПРОВЕРКА ДЛЯ СЛОТА 1 (только техники тела) ===
if (slotIndex === 0) {
  // Слот 1 - только для техник тела (melee_strike = удары руками/ногами)
  const technique = charTech.technique;
  const subtype = technique.subtype;
  
  // Разрешён только подтип melee_strike (техники тела)
  if (subtype !== 'melee_strike') {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Слот 1 предназначен только для техник тела (удары руками/ногами)' 
      },
      { status: 400 }
    );
  }
}
```

**Совместимые техники:**
- Только `subtype: 'melee_strike'` (удары руками/ногами)
- НЕ подходят: `melee_weapon`, `ranged_*`, `defense_*`

**Почему так:** Первый слот — для базовых техник тела, которые всегда доступны.

---

### 7. Базовый урон кулачного боя

**Текущее значение:** `attackDamage = 50` (hardcoded в LocationScene)

**Источник урона в техниках:** `src/lib/game/combat-system.ts`

```typescript
// Базовый урон техник по уровню:
const TECHNIQUE_BASE_DAMAGE: Record<number, number> = {
  1: 10, 2: 15, 3: 22, 4: 33, 5: 50,
  // ...
};

// Масштабирование melee_strike:
SCALING_COEFFICIENTS = {
  melee_strike: {
    strength: 0.05,      // 5% за единицу выше 10
    agility: 0.025,      // 2.5% за единицу
  }
}
```

**Формула итогового урона:**
```
finalDamage = baseDamage × statMultiplier × masteryMultiplier × qiMultiplier
```

**Проблема:** В LocationScene урон не зависит от характеристик персонажа!

**Решение:**
1. Получать характеристики персонажа через GameBridge
2. Рассчитывать урон по формуле из combat-system.ts
3. Или использовать технику из слота 1

---

## 📋 План работ

### Phase 7: UI компоненты (priority: P2)

**Файл:** `docs/implementation/phase-7-ui.md`

#### Компоненты для создания

- [ ] **StatProgressBar** — прогресс характеристики
- [ ] **StatsDevelopmentPanel** — панель всех характеристик
- [ ] **TrainingSelection** — выбор типа тренировки
- [ ] **SleepConsolidationResult** — результаты сна
- [ ] **ThresholdTable** — таблица порогов

**Целевая директория:** `src/components/stats/`

---

### Phase 8: Исправление таймаута атаки (priority: P0) ⚠️ КРИТИЧНО

**Задачи:**

1. **Добавить кулдаун атаки**
   - [ ] Добавить `lastAttackTime: number` в LocationScene
   - [ ] Добавить `ATTACK_COOLDOWN = 500` (0.5 сек)
   - [ ] Проверять таймаут в `performAttack()`

2. **Интегрировать расчёт урона**
   - [ ] Получать силу/ловкость персонажа
   - [ ] Использовать формулу из combat-system.ts
   - [ ] Учитывать технику из слота 1

3. **Визуальная индикация**
   - [ ] Показывать кулдаун на UI
   - [ ] Звук/эффект при попытке атаки в кулдауне

---

### Phase 9: Интеграция дельты развития (priority: P0)

**Задачи:**

1. **Интеграция в combat handler**
   - [ ] Импортировать `addStatDelta` из `stat-truth.ts`
   - [ ] После успешной атаки → вызывать `addStatDelta()`
   - [ ] После блока → вызывать с `combat_block`
   - [ ] После уклонения → вызывать с `combat_dodge`

2. **Интеграция в Event Bus**
   - [ ] Добавить событие `stat:delta_add`
   - [ ] Создать handler в `handlers/stat.ts`
   - [ ] Связать с TruthSystem

3. **Тестирование**
   - [ ] Проверить накопление дельты после боя
   - [ ] Проверить закрепление при сне

---

### Phase 10: Рефакторинг дубликатов (priority: P2)

1. **Унификация getTimeOfDay**
   - [ ] Оставить реализацию в `time-system.ts`
   - [ ] Удалить из `meditation-interruption.ts`
   - [ ] Удалить из `world.service.ts`
   - [ ] Обновить импорты

2. **Унификация getSeason**
   - [ ] Оставить в `time-system.ts`
   - [ ] Обновить `chat/utils/time-utils.ts` → импорт

---

### Phase 11: Боевая система — улучшения (priority: P1)

#### Анализ типов техник

**Атакующие (combat):**
| Подтип | Механика | Статус |
|--------|----------|--------|
| `melee_strike` | Удар телом | ✅ |
| `melee_weapon` | Удар оружием | ✅ |
| `ranged_projectile` | Снаряд | ✅ |
| `ranged_beam` | Луч | ✅ |
| `ranged_aoe` | По площади | ✅ |

**Защитные (defense):**
| Подтип | Механика | Статус |
|--------|----------|--------|
| `defense_block` | Снижение урона % | ✅ |
| `defense_shield` | Поглощение HP | ⚠️ Требует доработки |
| `defense_dodge` | Шанс уклонения | ✅ |

#### Щит Ци — концепция

**Вопрос:** Полностью блокирует урон или ослабляет?

**Предложение:**
- **Щит Ци** — не блокирует, а **поглощает** урон
- HP щита = `qiSpent × qiDensity × masteryMultiplier`
- При HP щита = 0 → щит ломается
- Каждый удар тратит Qi на поддержание

**Формула:**
```typescript
shieldHP = qiSpent * qiDensity * (1 + mastery/100 * 0.5);
qiDrainPerHit = damageAbsorbed / qiDensity;
```

---

### Phase 12: NPC коллизии в движке (priority: P1)

**Задачи:**

1. **Event Bus интеграция**
   - [ ] Добавить событие `npc:check_collision`
   - [ ] Создать handler в `handlers/npc.ts`
   - [ ] Связать с `npc-collision.ts`

2. **Phaser интеграция**
   - [ ] В LocationScene вызвать проверку коллизий
   - [ ] Применять `applyCollisionPush()` при столкновении
   - [ ] Обновлять позиции NPC

3. **Зоны взаимодействия**
   - [ ] Показывать подсказку при входе в зону talk
   - [ ] Триггерить агрессию при входе в зону agro
   - [ ] Рассчитывать восприятие для AI

---

### Phase 13: Формации (priority: P2)

**Анализ:** Файл `src/lib/game/formations.ts`

**Типы формаций:**
| Тип | Эффект | Статус |
|-----|--------|--------|
| Защитный круг | Снижение прерываний | ✅ |
| Концентрации | +Ци накопление | ⚠️ |
| Скрытности | -Заметность | ⚠️ |
| Боевая | +Урон | ⚠️ |

**Требуется:**
- [ ] Проверить интеграцию с медитацией
- [ ] Проверить влияние на боевые характеристики
- [ ] Добавить UI для установки формаций

---

## 🔧 Проверка Event Bus

### Архитектура

```
Phaser Scene → Event Bus → Handler → Truth System → Response
```

### Текущие handlers

| Handler | Файл | Статус |
|---------|------|--------|
| Combat | `handlers/combat.ts` | ✅ |
| Body | `handlers/body.ts` | ✅ |
| Inventory | `handlers/inventory.ts` | ✅ |
| Movement | `handlers/movement.ts` | ✅ |
| Environment | `handlers/environment.ts` | ✅ |
| Stat | `handlers/stat.ts` | ✅ |

### Требуется проверить

1. [ ] Все ли события корректно обрабатываются
2. [ ] Возвращается ли результат в Phaser
3. [ ] Логируются ли ошибки
4. [ ] Нет ли блокирующих вызовов

---

## 📊 Приоритеты

| Приоритет | Фаза | Описание | Документ | Критичность |
|-----------|------|----------|----------|-------------|
| P0 | Phase 8 | Система атак руками | [phase-8-attack-system.md](../implementation/phase-8-attack-system.md) | 🔴 КРИТИЧНО |
| P0 | Phase 9 | Интеграция дельты развития | [phase-9-delta-integration.md](../implementation/phase-9-delta-integration.md) ✨ **NEW** | 🔴 ВАЖНО |
| P1 | Phase 11 | Боевая система — улучшения | — | 🟡 |
| P1 | Phase 12 | NPC коллизии в движке | — | 🟡 |
| P2 | Phase 7 | UI компоненты | [phase-7-ui.md](../implementation/phase-7-ui.md) | 🟢 |
| P2 | Phase 10 | Рефакторинг дубликатов | — | 🟢 |
| P2 | Phase 13 | Формации | — | 🟢 |

---

## 📋 ПЛАНЫ ВНЕДРЕНИЯ (для ИИ-агентов)

> ⚠️ **Внимание:** Это рабочие планы внедрения, не входят в перечень документации (Listing.md)

| Файл | Описание | Приоритет | Статус |
|------|----------|-----------|--------|
| [roadmap.md](../implementation/roadmap.md) | 🗺️ Дорожная карта | — | ✅ |
| [phase-8-attack-system.md](../implementation/phase-8-attack-system.md) | Система атак руками | P0 🔴 | ✅ DONE |
| [phase-9-delta-integration.md](../implementation/phase-9-delta-integration.md) | Интеграция дельты | P0 🔴 | ✅ DONE |
| [phase-7-ui.md](../implementation/phase-7-ui.md) | UI компоненты | P2 🟢 | ✅ DONE |

---

## ✅ Выполненные задачи (2026-03-14)

### Phase 8: Hand Combat System
- **Создано:** `src/lib/game/hand-combat.ts`
- **Модифицировано:** `src/game/scenes/LocationScene.ts`
- **Результат:**
  - Урон зависит от силы: `3 + (STR-10) * 0.3`
  - Кулдаун зависит от ловкости: `max(200ms, 1000ms - (AGI-10) * 15ms)`
  - Атаки отправляются на сервер через Event Bus

### Phase 9: Delta Development Integration
- **Создано:**
  - `src/lib/game/stat-truth.ts`
  - `src/app/api/character/delta/route.ts`
  - `src/app/api/character/stats/route.ts`
- **Модифицировано:** `src/lib/game/event-bus/handlers/combat.ts`
- **Результат:**
  - После успешной атаки добавляется виртуальная дельта
  - Штраф от усталости учитывается
  - API для получения/добавления дельты

### Phase 7: UI Stats Components
- **Создано:** `src/components/stats/`
  - `StatIcon.tsx`
  - `StatProgressBar.tsx`
  - `StatsDevelopmentPanel.tsx`
  - `TrainingSelection.tsx`
  - `SleepConsolidationResult.tsx`
  - `ThresholdTable.tsx`
  - `index.ts`
- **Результат:** 6 UI компонентов для отображения развития характеристик

---

## 📝 План безопасного внедрения

### Принципы

1. **Минимальные изменения** — не трогать работающий код без необходимости
2. **Обратная совместимость** — новые функции не ломают старые
3. **Изолированные модули** — каждая фаза в своём файле
4. **Тестирование** — проверять после каждого изменения

### Порядок выполнения

```
Week 1:
├── Phase 8 (P0) — Таймаут атаки
│   ├── Добавить кулдаун
│   ├── Интегрировать расчёт урона
│   └── Тест в LocationScene
│
├── Phase 9 (P0) — Дельта развития
│   ├── Интеграция в combat handler
│   ├── Event Bus handler
│   └── Тест накопления

Week 2:
├── Phase 11 (P1) — Боевая система
│   ├── Щит Ци
│   ├── Обратный урон
│   └── Формулы
│
├── Phase 12 (P1) — NPC коллизии
│   ├── Event Bus
│   └── Phaser интеграция

Week 3:
├── Phase 7 (P2) — UI компоненты
├── Phase 10 (P2) — Рефакторинг
└── Phase 13 (P2) — Формации
```

---

## 📝 Следующие шаги

1. **Начать Phase 8** — исправить таймаут атаки (КРИТИЧНО)
2. **Параллельно Phase 9** — интеграция дельты
3. **Проверить Event Bus** — убедиться в работоспособности

---

*Документ создан: 2026-03-14*
*Агент: Main Agent*
