# ⚔️ План: Боевая система v4.0

**Дата:** 2026-03-22
**Версия:** 3.0
**Статус:** ✅ Этап 1-7 завершены (Event Bus интегрирован)

---

## 📋 Обзор

Документ описывает план интеграции Level Suppression и Qi Buffer в боевую систему.

### ⚠️ ВАЖНО: Часть работы УЖЕ ВЫПОЛНЕНА

В рамках чекпоинта `checkpoint_03_22_Body_update.md` уже реализованы:
- ✅ `level-suppression.ts` — константы и функции
- ✅ `qi-buffer-config.ts` — конфигурация
- ✅ `qi-buffer.ts` — функции обработки
- ✅ `damage-pipeline.ts` — полный pipeline
- ✅ Интеграция в `combat-system.ts`
- ✅ Интеграция в `npc-damage-calculator.ts`
- ✅ Типы `AttackType`, `isUltimate`

---

## 1️⃣ ИЕРАРХИЯ ОБНОВЛЕНИЙ

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ИЕРАРХИЯ БОЕВОЙ СИСТЕМЫ                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  УРОВЕНЬ 1: Константы (новые) — ✅ ЗАВЕРШЕНО                        │
│  ├── level-suppression.ts — Таблица подавления                      │
│  └── qi-buffer-config.ts — Конфигурация буфера                      │
│                                                                      │
│  УРОВЕНЬ 2: Функции расчёта — ✅ ЗАВЕРШЕНО                          │
│  ├── calculateLevelSuppression() — Расчёт множителя                 │
│  ├── processQiDamage() — Обработка Qi Buffer                        │
│  └── processDamagePipeline() — Полный pipeline                      │
│                                                                      │
│  УРОВЕНЬ 3: Интеграция — ✅ ЗАВЕРШЕНО                               │
│  ├── combat-system.ts — Интеграция player combat                    │
│  └── npc-damage-calculator.ts — Интеграция NPC combat               │
│                                                                      │
│  УРОВЕНЬ 4: API и UI — ⚠️ ЧАСТИЧНО ВЫПОЛНЕНО                        │
│  ├── /api/game/event — ✅ Существует (Event Bus)                    │
│  ├── combat:damage_dealt handler — ✅ Существует                    │
│  ├── Level Suppression в handler — ✅ Интегрирован (v3.3.0)         │
│  ├── Qi Buffer в handler — ✅ Интегрирован (v3.3.0)                 │
│  ├── BodyStatusPanel.tsx — ✅ Существует                            │
│  ├── DamageFlowDisplay.tsx — 🔜 Не создан                           │
│  ├── LevelSuppressionIndicator.tsx — 🔜 Не создан                   │
│  └── QiBufferStatus.tsx — 🔜 Не создан                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ ВЫПОЛНЕННЫЕ ЗАДАЧИ ✅

### 2.1 level-suppression.ts — ✅ Создан

**Расположение:** `src/lib/constants/level-suppression.ts`

**Реализовано:**
- `AttackType` тип
- `SuppressionValues` интерфейс
- `LEVEL_SUPPRESSION_TABLE` константа
- `calculateLevelSuppression()` функция
- `calculateLevelSuppressionFull()` функция с полным результатом
- `isTargetImmune()` функция
- `getSuppressionDescription()` функция

### 2.2 qi-buffer-config.ts — ✅ Создан

**Расположение:** `src/lib/constants/qi-buffer-config.ts`

**Реализовано:**
- `QiBufferConfig` интерфейс
- `QI_BUFFER_CONFIG` константа (90% absorption, 10% piercing)
- `hasQiForBuffer()` функция
- `calculateRequiredQi()` функция
- `calculatePiercingDamage()` функция
- `calculateAbsorbableDamage()` функция

### 2.3 qi-buffer.ts — ✅ Создан

**Расположение:** `src/lib/game/qi-buffer.ts`

**Реализовано:**
- `processQiDamage()` — основная функция с механикой 90%
- `processShieldTechnique()` — 100% поглощение
- `processRawQi()` — 90% поглощение, 10% пробитие
- `calculateHitsUntilDepletion()` — расчёт ударов до истощения
- `formatQiDamageResult()` — для UI

### 2.4 damage-pipeline.ts — ✅ Создан

**Расположение:** `src/lib/game/damage-pipeline.ts`

**Реализовано:**
- `processDamagePipeline()` — полный pipeline 10 слоёв
- `calculateFinalDamageQuick()` — упрощённый расчёт
- `canDamageTarget()` — проверка возможности урона
- `formatDamagePipelineResult()` — для UI
- Константы `MATERIAL_DAMAGE_REDUCTION`, `DEFAULT_MATERIAL_HARDNESS`

### 2.5 combat-system.ts — ✅ Интегрирован

**Изменения:**
- Добавлены импорты Level Suppression
- Добавлен параметр `defenderLevel` в `calculateTechniqueDamageFull()`
- Добавлены поля в `TechniqueDamageResult`: `levelSuppression`, `damageAfterSuppression`
- Обратная совместимость сохранена (опциональные параметры)

### 2.6 npc-damage-calculator.ts — ✅ Интегрирован

**Изменения:**
- Добавлены импорты Level Suppression и Qi Buffer
- Добавлены поля в `PlayerDefenseStats`: `cultivationLevel`, `currentQi`, `maxQi`, `hasShieldTechnique`
- Добавлены поля в `DamageResult`: `levelSuppression`, `qiBuffer`, `damageBeforeQiBuffer`
- Level Suppression применяется перед Qi Buffer
- Qi Buffer применяется только для техник Ци
- `meridianBuffer` deprecated для Qi атак (используется только для физических)

---

## 3️⃣ АУДИТ КОДА — ЧТО УЖЕ СУЩЕСТВУЕТ ⚠️

### 3.1 API для combat — ✅ СУЩЕСТВУЕТ (Event Bus)

**Файл:** `src/app/api/game/event/route.ts`

**События:**
- `technique:use` — использование техники
- `combat:damage_dealt` — нанесение урона

**Handler:** `src/lib/game/event-bus/handlers/combat.ts`

**Что уже делает:**
- ✅ Проверка техники в БД
- ✅ Проверка знания техники персонажем
- ✅ Проверка и списание Ци
- ✅ Расчёт урона (qiDensity, capacity, statMult, masteryMult, gradeMult)
- ✅ Проверка дестабилизации
- ✅ Обработка урона по TempNPC
- ✅ Визуальные команды (show_damage, show_effect)
- ✅ **Level Suppression** — интегрирован (v3.3.0)
- ✅ **Qi Buffer 90%** — интегрирован (v3.3.0)
- ✅ **Иммунитет** при подавлении

**TODO (P2):**
- 🔜 processDamagePipeline() не используется (опционально)
- 🔜 Тестирование Event Bus

### 3.2 UI компоненты — ⚠️ ЧАСТИЧНО СУЩЕСТВУЮТ

#### Существующие компоненты:

**BodyStatusPanel.tsx** — ✅ Полностью реализован
- Расположение: `src/components/game/BodyStatusPanel.tsx`
- Функционал:
  - Двойная HP полоска (functional/structural)
  - Панель сердца
  - Панель кровотечений
  - Панель приживления
  - Статус частей тела (healthy, damaged, crippled, paralyzed, severed)

**BodyDoll.tsx** — ✅ Существует
- Расположение: `src/components/game/BodyDoll.tsx`
- Визуальное отображение тела

#### Отсутствующие компоненты:

| Компонент | Статус | Описание |
|-----------|--------|----------|
| DamageFlowDisplay.tsx | 🔜 Не создан | Визуализация pipeline урона |
| LevelSuppressionIndicator.tsx | 🔜 Не создан | Индикатор подавления |
| QiBufferStatus.tsx | 🔜 Не создан | Статус Qi Buffer |

### 3.3 AOE обработка — ✅ ЧАСТИЧНО РЕАЛИЗОВАНО

**Файл:** `src/lib/game/damage-pipeline.ts`

**Реализовано:**
- `processDamagePipeline()` принимает опциональные параметры для разных целей
- Level Suppression применяется индивидуально при вызове функции
- Можно вызывать функцию в цикле для каждой цели AOE

**Не создано (опционально):**
- Специализированная функция `processAOEAttack()`

---

## 4️⃣ ОСТАВШИЕСЯ ЗАДАЧИ 🔜

### 4.1 Интеграция Level Suppression в Event Bus — ✅ ЗАВЕРШЕНО (v3.3.0)

**Файл:** `src/lib/game/event-bus/handlers/combat.ts`

**Реализовано:**
- ✅ Добавлен импорт `calculateLevelSuppression`, `calculateLevelSuppressionFull`, `isTargetImmune`
- ✅ Добавлен импорт `determineAttackType` из technique-types
- ✅ В `handleTempNPCDamageEvent` добавлен расчёт подавления
- ✅ Проверка иммунитета (return с isImmune: true)
- ✅ Применение множителя подавления к урону

### 4.2 Интеграция Qi Buffer в Event Bus — ✅ ЗАВЕРШЕНО (v3.3.0)

**Файл:** `src/lib/game/event-bus/handlers/combat.ts`

**Реализовано:**
- ✅ Добавлен импорт `processQiDamage`, `QiDamageResult`
- ✅ В `handleTempNPCDamageEvent` добавлена обработка Qi Buffer NPC
- ✅ Если у NPC есть Ци, 90% поглощается, 10% пробивает
- ✅ Данные о Qi Buffer возвращаются в response

### 4.3 UI компоненты — 🔜 P1

**Файлы для создания:**
- `src/components/game/DamageFlowDisplay.tsx`
- `src/components/game/LevelSuppressionIndicator.tsx`
- `src/components/game/QiBufferStatus.tsx`

### 4.4 Тестирование — 🔜 P2

**Файлы:**
- `src/lib/constants/level-suppression.test.ts`
- `src/lib/game/qi-buffer.test.ts`

---

## 5️⃣ ПОРЯДОК РЕАЛИЗАЦИИ (ОБНОВЛЁННЫЙ)

| Этап | Файл | Задачи | Статус |
|------|------|--------|--------|
| 1 | `level-suppression.ts` | Создать константы | ✅ Завершено |
| 2 | `qi-buffer-config.ts` | Создать конфиг | ✅ Завершено |
| 3 | `combat-system.ts` | Интегрировать suppression | ✅ Завершено |
| 4 | `combat-system.ts` | Интегрировать Qi Buffer | ✅ Завершено |
| 5 | `npc-damage-calculator.ts` | Интегрировать suppression | ✅ Завершено |
| 6 | `damage-pipeline.ts` | Создать pipeline | ✅ Завершено |
| 7 | `event-bus/handlers/combat.ts` | Интегрировать suppression | ✅ Завершено |
| 8 | `event-bus/handlers/combat.ts` | Интегрировать Qi Buffer | ✅ Завершено |
| 9 | UI компоненты | DamageFlowDisplay и др. | 🔜 P1 |

---

## 6️⃣ ТЕСТИРОВАНИЕ

### Unit тесты — 🔜 НЕ СОЗДАНЫ

```typescript
describe('Combat System with Level Suppression', () => {
  test('L7 attacker vs L9 defender (normal) = 0 damage', () => {
    const result = calculateLevelSuppression(7, 9, 'normal');
    expect(result).toBe(0);
  });
  
  test('L7 attacker vs L9 defender (technique L7) = 5% damage', () => {
    const result = calculateLevelSuppression(7, 9, 'technique', 7);
    expect(result).toBe(0.05);
  });
  
  test('L7 attacker vs L9 defender (technique L8) = 25% damage', () => {
    const result = calculateLevelSuppression(7, 9, 'technique', 8);
    expect(result).toBe(0.25);
  });
  
  test('Qi Buffer 90% absorption', () => {
    const result = processQiDamage({
      incomingDamage: 100,
      currentQi: 500,
      maxQi: 1000,
      hasShieldTechnique: false,
    });
    expect(result.absorbedDamage).toBeCloseTo(90, 0);
    expect(result.remainingDamage).toBeCloseTo(10, 0);
  });
});
```

---

## 7️⃣ КРИТЕРИИ ГОТОВНОСТИ

### Phase 1-3: Core Mechanics — ✅ ГОТОВО

- [x] Level Suppression работает для всех типов атак
- [x] Qi Buffer работает с механикой 90%
- [x] technique.level влияет на пробитие
- [x] Ultimate-техники пробивают +4 уровня
- [x] Интеграция в combat-system.ts
- [x] Интеграция в npc-damage-calculator.ts
- [x] Lint: 0 ошибок

### Phase 4: Event Bus Integration — ✅ ЗАВЕРШЕНО

- [x] Level Suppression в handleTempNPCDamageEvent()
- [x] Qi Buffer в обработке урона NPC
- [x] Иммунитет при подавлении
- [x] Данные о подавлении в response
- [ ] Тестирование Event Bus (P2)

### Phase 5: AOE — ✅ ЧАСТИЧНО ГОТОВО

- [x] Level Suppression применяется индивидуально
- [ ] Специализированная функция `processAOEAttack()` — опционально

### Phase 6: UI — ⚠️ ЧАСТИЧНО ГОТОВО

- [x] BodyStatusPanel.tsx — HP частей тела, кровотечения
- [ ] DamageFlowDisplay.tsx
- [ ] LevelSuppressionIndicator.tsx
- [ ] QiBufferStatus.tsx

---

## 8️⃣ СВЯЗЬ С ДРУГИМИ ЧЕКПОИНТАМИ

### Зависимости

| Чекпоинт | Статус | Влияние |
|----------|--------|---------|
| `checkpoint_03_22_Body_update.md` | ✅ Завершён | Предоставляет Level Suppression, Qi Buffer |
| `checkpoint_03_22_Formations.md` | 🔜 Не начат | Использует combat систему |
| `checkpoint_03_22_NPC_Orchestrator.md` | 🔜 Не начат | Интеграция NPC в combat |

### Следующие шаги

1. **Event Bus Integration** — добавить Level Suppression + Qi Buffer в handlers
2. **Generators** — интеграция техник с isUltimate флагом
3. **NPC_Orchestrator** — исправление генерации инвентаря
4. **Formations** — доработка системы формаций
5. **Combat UI** — визуализация pipeline урона

---

## 9️⃣ ССЫЛКИ

### Документация
- `docs/body_review.md` v5.0 — Qi Buffer 90%
- `docs/body_armor.md` v5.0 — Level Suppression
- `docs/technique-system-v2.md` v3.0 — Ultimate-техники
- `docs/NPC_COMBAT_INTERACTIONS.md` v3.0 — NPC combat

### Код — Создан
- `src/lib/constants/level-suppression.ts` — ✅
- `src/lib/constants/qi-buffer-config.ts` — ✅
- `src/lib/game/qi-buffer.ts` — ✅
- `src/lib/game/damage-pipeline.ts` — ✅

### Код — Изменён
- `src/lib/game/combat-system.ts` — ✅
- `src/lib/game/npc-damage-calculator.ts` — ✅
- `src/types/technique-types.ts` — ✅
- `src/types/game.ts` — ✅

### Код — Существует (Event Bus)
- `src/app/api/game/event/route.ts` — ✅ API endpoint
- `src/lib/game/event-bus/handlers/combat.ts` — ✅ Combat handler
- `src/components/game/BodyStatusPanel.tsx` — ✅ UI

### Код — Требует создания
- `src/components/game/DamageFlowDisplay.tsx` — 🔜
- `src/components/game/LevelSuppressionIndicator.tsx` — 🔜
- `src/components/game/QiBufferStatus.tsx` — 🔜

---

*План создан: 2026-03-22*
*Версия: 3.0*
*Статус: ✅ Все этапы завершены (UI компоненты — P1)*
