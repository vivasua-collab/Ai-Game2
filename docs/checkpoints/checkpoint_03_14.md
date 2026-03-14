# 📋 Checkpoint 03.14 — План рефакторинга и развития

**Дата создания:** 2026-03-14
**Ветка:** main2d4
**Статус:** 🔄 В работе
**Последнее обновление:** 2026-03-14 (проверка реализации)

---

## ✅ Статус реализации Phases

### Phase 8: Hand Combat System — ✅ ВЫПОЛНЕНО

| Задача | Статус | Файл |
|--------|--------|------|
| Добавить `lastAttackTime` | ✅ | `LocationScene.ts:119` |
| Добавить `canAttack()` check | ✅ | `LocationScene.ts:855` |
| Формула урона от STR | ✅ | `hand-combat.ts:39-42` |
| Формула кулдауна от AGI | ✅ | `hand-combat.ts:52-55` |
| Интеграция в LocationScene | ✅ | `LocationScene.ts:843-884` |
| Отправка на сервер | ✅ | `LocationScene.ts:890-900` |

**Формулы:**
```
handDamage = 3 + (STR-10) × 0.3
cooldown = max(200ms, 1000ms - (AGI-10) × 15ms)
```

---

### Phase 9: Delta Development Integration — ✅ ВЫПОЛНЕНО

| Задача | Статус | Файл |
|--------|--------|------|
| Создать `stat-truth.ts` | ✅ | `src/lib/game/stat-truth.ts` |
| Создать API `/api/character/delta` | ✅ | `src/app/api/character/delta/route.ts` |
| Создать API `/api/character/stats` | ✅ | `src/app/api/character/stats/route.ts` |
| Интегрировать в combat handler | ✅ | `handlers/combat.ts:384-414, 599-624` |
| `addStatDelta()` вызов | ✅ | `handlers/combat.ts:402-408` |
| `generateAttackDelta()` вызов | ✅ | `handlers/combat.ts:389-393` |
| `calculateFatiguePenalty()` | ✅ | `handlers/combat.ts:396-399` |

---

### Phase 7: UI Stats Components — ✅ ВЫПОЛНЕНО

| Компонент | Статус | Файл |
|-----------|--------|------|
| StatIcon | ✅ | `src/components/stats/StatIcon.tsx` |
| StatProgressBar | ✅ | `src/components/stats/StatProgressBar.tsx` |
| StatsDevelopmentPanel | ✅ | `src/components/stats/StatsDevelopmentPanel.tsx` |
| TrainingSelection | ✅ | `src/components/stats/TrainingSelection.tsx` |
| SleepConsolidationResult | ✅ | `src/components/stats/SleepConsolidationResult.tsx` |
| ThresholdTable | ✅ | `src/components/stats/ThresholdTable.tsx` |
| index.ts (exports) | ✅ | `src/components/stats/index.ts` |

---

## 🔴 КРИТИЧЕСКИЕ БАГИ (найдены при проверке)

### BUG #1: NPC Collision Missing — ✅ ИСПРАВЛЕНО

**Проблема:** Игрок проходит сквозь NPC, не упирается в них.

**Анализ кода:**
```typescript
// LocationScene.ts:525 - NPC создаётся как Container
const container = this.add.container(npc.x, npc.y);
// НЕТ physics.add.existing(container)!

// LocationScene.ts:571 - setInteractive НЕ создаёт физическое тело!
body.setInteractive({ useHandCursor: true });
// Это только для mouse events, НЕ для collision!
```

**Решение:** Добавлена ручная проверка коллизии в `handleMovement()`:
```typescript
// Check collision with NPCs
for (const [id, npc] of this.npcs) {
  const distance = Math.sqrt(dx*dx + dy*dy);
  const minDistance = PLAYER_COLLISION_RADIUS + npc.hitboxRadius;
  if (distance < minDistance) {
    // Push player out of NPC
    newX += nx * overlap;
    newY += ny * overlap;
  }
}
```

---

### BUG #2: Attack Doesn't Hit NPCs — ✅ ИСПРАВЛЕНО

**Проблема:** Атака не наносит урон NPC.

**Анализ кода:**
```typescript
// LocationScene.ts:865 - Цикл только по training targets!
for (const target of this.targets) {
  if (this.checkAttackHit(...)) {
    this.damageTarget(target, attackResult.damage, 'normal');
  }
}
// НЕТ цикла по this.npcs!
```

**Решение:** Добавлен цикл по NPC в `performAttack()`:
```typescript
// Apply damage to NPCs
for (const [id, npc] of this.npcs) {
  if (this.checkAttackHit(..., npc.hitboxRadius)) {
    this.damageNPC(npc, attackResult.damage);
    this.reportAttackToServer(npc.id, damage, 'temp_npc');
  }
}
```

---

## 📋 План исправления критических багов

### Phase 14: NPC Collision & Combat (P0) — ✅ ВЫПОЛНЕНО

**Задачи:**

1. **Добавить физическое тело NPC (или ручную коллизию)**
   - [x] Вариант B: Ручная проверка в `handleMovement()`
   - [x] Константы `NPC_COLLISION_RADIUS = 25`, `PLAYER_COLLISION_RADIUS = 15`

2. **Добавить урон по NPC в атаке**
   - [x] Добавлен цикл по `this.npcs` в `performAttack()`
   - [x] Добавлена функция `damageNPC()` с визуальным эффектом
   - [x] Добавлена функция `handleNPCDeath()` с анимацией смерти

3. **Обновить тип LocationNPC**
   - [x] Добавлены поля: `hitboxRadius`, `hp`, `maxHp`
   - [x] HP рассчитывается по уровню культивации

4. **Исправить экспорт**
   - [x] Добавлен re-export `createInitialStatsDevelopment` из `stat-development.ts`

---

## 🔍 Результаты анализа кода (исходные)

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

### 3. Система коллизий NPC

**Статус:** ✅ Библиотека создана, ❌ НЕ интегрирована

Файл: `src/lib/game/npc-collision.ts`

Функции:
- `checkNPCCollision()` — проверка столкновения
- `checkPositionCollision()` — проверка с позицией (ИСПОЛЬЗОВАТЬ!)
- `applyCollisionPush()` — выталкивание
- `calculateCollisionConfig()` — конфигурация
- `checkPlayerInteraction()` — взаимодействие с игроком

**Требуется:** Интеграция в LocationScene!

---

### 4. Первый слот игрока (Slot 0)

**Статус:** ✅ Ограничение реализовано

**Расположение:** `src/app/api/technique/slot/route.ts:113-129`

```typescript
if (slotIndex === 0) {
  if (subtype !== 'melee_strike') {
    return NextResponse.json({ error: 'Слот 1 предназначен только для техник тела' });
  }
}
```

**Совместимые техники:**
- Только `subtype: 'melee_strike'` (удары руками/ногами)

---

## 📊 Приоритеты (обновлённые)

| Приоритет | Фаза | Описание | Статус |
|-----------|------|----------|--------|
| P0 ✅ | Phase 14 | NPC Collision & Combat | ✅ DONE |
| P0 ✅ | Phase 8 | Система атак руками | ✅ DONE |
| P0 ✅ | Phase 9 | Интеграция дельты развития | ✅ DONE |
| P1 | Phase 11 | Боевая система — улучшения | pending |
| P2 ✅ | Phase 7 | UI компоненты | ✅ DONE |
| P2 | Phase 10 | Рефакторинг дубликатов | pending |
| P2 | Phase 13 | Формации | pending |

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
- **Создано:** `src/components/stats/` (6 файлов)
- **Результат:** UI компоненты для отображения развития характеристик

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

---

## 📝 Следующие шаги

1. **Phase 14 (P0)** — Исправить NPC Collision и Combat
2. **Проверить работоспособность** — протестировать в игре
3. **Phase 11 (P1)** — Боевая система улучшения

---

*Документ создан: 2026-03-14*
*Агент: Main Agent*
