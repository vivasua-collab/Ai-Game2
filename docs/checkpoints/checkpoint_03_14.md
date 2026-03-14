# 📋 Checkpoint 03.14 — План рефакторинга и развития

**Дата создания:** 2026-03-14
**Ветка:** main2d4
**Статус:** 🔄 В работе
**Последнее обновление:** 2026-03-14 (Phase 15 Planning)

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

### Phase 14: NPC Collision & Combat — ✅ ВЫПОЛНЕНО

| Задача | Статус |
|--------|--------|
| Ручная проверка коллизии в `handleMovement()` | ✅ |
| Константы `NPC_COLLISION_RADIUS = 25`, `PLAYER_COLLISION_RADIUS = 15` | ✅ |
| Цикл по `this.npcs` в `performAttack()` | ✅ |
| Функция `damageNPC()` с визуальным эффектом | ✅ |
| Функция `handleNPCDeath()` с анимацией смерти | ✅ |
| Поля LocationNPC: `hitboxRadius`, `hp`, `maxHp` | ✅ |
| Re-export `createInitialStatsDevelopment` | ✅ |

---

## 🔴 КРИТИЧЕСКИЕ БАГИ — ИСПРАВЛЕНЫ

### BUG #1: NPC Collision Missing — ✅ ИСПРАВЛЕНО

**Проблема:** Игрок проходил сквозь NPC

**Решение:** Ручная проверка коллизии в `handleMovement()`

### BUG #2: Attack на NPC — ✅ ИСПРАВЛЕНО

**Проблема:** Атака не наносила урон NPC

**Решение:** Добавлен цикл по NPC в `performAttack()`

---

## 📊 Приоритеты (обновлённые)

| Приоритет | Фаза | Описание | Статус |
|-----------|------|----------|--------|
| P0 ✅ | Phase 14 | NPC Collision & Combat | ✅ DONE |
| P0 ✅ | Phase 8 | Система атак руками | ✅ DONE |
| P0 ✅ | Phase 9 | Интеграция дельты развития | ✅ DONE |
| P1 | Phase 15 | Оружие и броня | 📋 Planning |
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
| [phase-15-weapon-armor-system.md](../implementation/phase-15-weapon-armor-system.md) | Оружие и броня | P1 | 📋 NEW |

---

## 🆕 PHASE 15: Оружие и Броня — Теоретические изыскания

### Ключевые решения для внедрения

#### 1. Система прочности (Durability)

**Выбор: ВАРИАНТ C (Комбинированный)**
```
totalLoss = baseLoss + impactLoss
baseLoss = 0.01 × actionCount
impactLoss = max(0, damageAbsorbed - threshold) / hardness
```

**Условия поломки:**
- Critical (1-24%): Шанс сломаться = (1 - durability/max) × 0.1 × hitCount
- Broken (0%): Невозможно использовать

**Ремонт:** Вариант B + C (самостоятельный + Ци-ремонт)

#### 2. Урон оружия

**Выбор: ВАРИАНТ C (Гибридный)**
```
baseDamage = max(handDamage, weaponDamage × 0.5)
bonusDamage = weaponDamage × statScaling
totalDamage = baseDamage + bonusDamage
```

#### 3. Распределение урона по HP

**Выбор: ВАРИАНТ C (Kenshi-style)**
```
redHP -= damage × 0.7
blackHP -= damage × 0.3
// При blackHP < 30% → шок, ускоренная потеря redHP
```

#### 4. Порядок расчёта урона

```
1. rawDamage = handDamage + weaponDamage + techniqueDamage
2. hitPart = rollBodyPartHit()
3. checkDodge() → damage = 0 if success
4. checkBlock() → damage *= (1 - effectiveness)
5. armor = getArmorForPart(hitPart)
   - coverage check (80% шанс работы брони)
   - damageReduction (% снижения)
   - penetration check (пробитие)
6. materialReduction (кожа/чешуя/призрак)
7. finalDamage = max(1, floor(damage))
8. applyDamageToBodyPart()
```

### Задачи Phase 15

| Subtask | Описание | Файлы |
|---------|----------|-------|
| 15A | Базовая структура | `types/equipment-stats.ts`, Prisma, `durability-system.ts` |
| 15B | Расчёт урона | `damage-calculation.ts`, `body-part-targeting.ts` |
| 15C | Броня | `armor-system.ts`, coverage, resistances |
| 15D | Интеграция | `LocationScene.ts`, UI инвентаря |

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

### Phase 14: NPC Collision & Combat
- **Модифицировано:** `src/game/scenes/LocationScene.ts`
- **Результат:**
  - Игрок не проходит сквозь NPC
  - Атаки наносят урон NPC
  - NPC умирают с анимацией

---

## 📝 Следующие шаги

1. **Phase 15 (P1)** — Оружие и броня
   - Изучить `phase-15-weapon-armor-system.md`
   - Выбрать финальные варианты реализации
   - Начать с 15A (базовая структура)

2. **Phase 11 (P1)** — Боевая система улучшения

---

*Документ создан: 2026-03-14*
*Агент: Main Agent*
