# ROADMAP: Порядок внедрения

**Для:** ИИ-агент
**Обновлено:** 2026-03-14

---

## COMPLETED PHASES

```
Phase 8 → Phase 9 → Phase 14 → Phase 7
```

| Phase | Description | Status | Completed |
|-------|-------------|--------|-----------|
| Phase 8 | Hand Combat System | ✅ DONE | 2026-03-14 |
| Phase 9 | Delta Development Integration | ✅ DONE | 2026-03-14 |
| Phase 14 | NPC Collision & Combat | ✅ DONE | 2026-03-14 |
| Phase 7 | UI Stats Components | ✅ DONE | 2026-03-14 |

---

## 🏗️ НОВАЯ АРХИТЕКТУРА ГЕНЕРАЦИИ ("МАТРЁШКА")

### Принцип многослойной надстройки

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    АРХИТЕКТУРА ГЕНЕРАЦИИ ОБЪЕКТОВ                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  1. БАЗОВЫЙ ОБЪЕКТ (Base Object) — привязан к УРОВНЮ             │   │
│   │     • Тип объекта (weapon, technique, formation...)             │   │
│   │     • Уровень (1-9)                                             │   │
│   │     • Базовые параметры (damage, defense, qiCost...)            │   │
│   │     • Базовый материал (дерево, железо, камень)                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              +                                            │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  2. МАТЕРИАЛ (Material Overlay) — надстройка                     │   │
│   │     • ID материала (iron, spirit_iron, star_metal...)           │   │
│   │     • Тир материала (T1-T5)                                     │   │
│   │     • Бонусы от материала (см. materials.md)                    │   │
│   │     • Проводимость Ци, прочность, вес                           │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              +                                            │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  3. ГРЕЙД / РЕДКОСТЬ (Grade/Rarity Overlay) — надстройка         │   │
│   │     • Грейд (damaged → common → refined → perfect → transcendent)│   │
│   │     • Множители параметров (×0.5 ... ×4.0)                      │   │
│   │     • Дополнительные бонусы (через BonusRegistry)               │   │
│   │     • Специальные эффекты                                       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              =                                            │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  ИТОГОВЫЙ ОБЪЕКТ                                                 │   │
│   │  EffectiveStats = Base × MaterialBonuses × GradeMultipliers     │   │
│   │  Bonuses = BaseBonuses + MaterialBonuses + GradeBonuses         │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Ключевые компоненты системы

| Компонент | Файл | Назначение |
|-----------|------|------------|
| **BonusRegistry** | `src/types/bonus-registry.ts` | Единая система бонусов для всех объектов |
| **MaterialsRegistry** | `src/lib/data/materials-registry.ts` | Реестр материалов (T1-T5) |
| **GradeSystem** | `src/lib/game/grade-system.ts` | Система грейдов экипировки |
| **DurabilitySystem** | `src/lib/game/durability-system.ts` | Прочность и износ |
| **ConditionSystem** | `src/lib/game/condition-system.ts` | Состояния (баффы/дебаффы) |

---

## CURRENT PHASE

### Phase 15: Equipment Grade System

**Приоритет:** P1
**Статус:** 📋 Ready to implement
**Зависимости:** Phase 7, Phase 8

**Компоненты:**
- [x] 15.0 BonusRegistry — Создан `src/types/bonus-registry.ts`
- [ ] 15.1 Система материалов (materials.md)
- [ ] 15.2 Система грейдов
- [ ] 15.3 Система прочности
- [ ] 15.4 Система ремонта
- [ ] 15.5 Генераторы экипировки v2
- [ ] 15.6 Интеграция в игровой движок
- [ ] 15.7 UI компонентов экипировки

---

## DETAILED IMPLEMENTATION PLAN

### 📦 Phase 15.0: BonusRegistry (ВЫПОЛНЕНО ✅)

**Файлы:**
- `src/types/bonus-registry.ts` — Единый источник типов ✅
- `docs/bonuses.md` — Документация v2.0 ✅

**Выполнено:**
```
[x] 1. Создать src/types/bonus-registry.ts с интерфейсами
[x] 2. Определить 8 категорий бонусов: stat, combat, defense, qi, elemental, condition, special, utility
[x] 3. Добавить категорию CONDITION (состояния):
    - 8 баффов: haste, regeneration, clarity, fortify, berserk, invisibility, shield, reflect
    - 10 дебаффов: burning, freezing, poison, stun, slow, weakness, silence, bleed, curse, fear
[x] 4. Определить интерфейсы: BonusDefinition, GeneratedBonus, ActiveCondition
[x] 5. Создать маппинг BonusType → BonusCategory для унификации с technique-config.ts
[x] 6. Добавить утилиты: isBuffCondition, isDebuffCondition, isDotCondition
[x] 7. Проверить lint (0 errors)
```

**Результат:**
- Единый файл типов для всех бонусов
- Категория CONDITION готова к интеграции
- Обратная совместимость с technique-config.ts

---

### 📦 Phase 15.1: Система материалов

**Файлы:**
- `src/lib/data/materials-registry.ts` — Реестр материалов
- `src/types/materials.ts` — Типы материалов
- `prisma/schema.prisma` — Таблица Material

**Задачи:**
```
[ ] 1. Создать src/types/materials.ts с интерфейсами
    - MaterialDefinition
    - MaterialTier (T1-T5)
    - MaterialProperties (durability, qiConductivity, weight)
[ ] 2. Создать src/lib/data/materials-registry.ts с реестром
    - MaterialsRegistry класс
    - getMaterialById()
    - getMaterialsByTier()
    - getDefaultMaterial()
[ ] 3. Добавить все материалы (5 тиров × ~6 материалов)
    - T1: Iron, Leather, Cloth, Wood, Stone, Bone
    - T2: Steel, Bronze, Silk, Hardwood, Marble, Ivory
    - T3: Spirit Iron, Cold Iron, Spirit Silk, Ironwood, Jade, Spirit Bone
    - T4: Star Metal, Dragon Bone, Heavenly Silk, Void Wood, Spirit Crystal
    - T5: Void Matter, Chaos Matter, Primordial Essence
[ ] 4. Добавить таблицу Material в Prisma schema (опционально, если нужны динамические материалы)
[ ] 5. Создать seed-materials.ts для начальных данных
[ ] 6. Проверить lint
```

**Результат:**
- Материалы доступны через materialsRegistry.get(id)
- Тир материала влияет на базовые параметры

---

### 📦 Phase 15.2: Система грейдов

**Файлы:**
- `src/types/equipment-v2.ts` — Новые интерфейсы
- `src/lib/game/grade-system.ts` — Логика грейдов

**Задачи:**
```
[ ] 1. Создать src/types/equipment-v2.ts
    - EquipmentGrade тип (damaged, common, refined, perfect, transcendent)
    - GradeOverlay интерфейс
    - GradeChangeEvent интерфейс
    - GRADE_CONFIG константы (множители, цвета, иконки)
[ ] 2. Создать src/lib/game/grade-system.ts
    - calculateGradeMultiplier(grade) — множитель параметров
    - generateBonusStatsForGrade(grade, level, rng) — бонусы от грейда
    - canUpgradeGrade(current, materials, skill) — проверка возможности
    - upgradeGrade(equipment, materials) — повышение грейда
    - downgradeGrade(equipment, reason) — понижение грейда
    - getGradeInfo(grade) — информация для UI
[ ] 3. Интегрировать с BonusRegistry
    - Использовать generateBonuses() для бонусов грейда
[ ] 4. Проверить lint
```

**Множители грейдов:**
| Grade | Durability | Damage | Bonuses |
|-------|------------|--------|---------|
| damaged | ×0.5 | ×0.8 | 0 |
| common | ×1.0 | ×1.0 | 0-1 |
| refined | ×1.5 | ×1.3 | 1-2 |
| perfect | ×2.5 | ×1.7 | 2-4 |
| transcendent | ×4.0 | ×2.5 | 4-6 |

---

### 📦 Phase 15.3: Система прочности

**Файлы:**
- `src/lib/game/durability-system.ts` — Логика прочности
- `src/types/equipment-v2.ts` — DurabilityState интерфейс

**Задачи:**
```
[ ] 1. Добавить DurabilityState в equipment-v2.ts
    - current: number — текущая прочность
    - max: number — максимальная прочность
    - condition: 'pristine' | 'good' | 'worn' | 'damaged' | 'broken'
    - repairCount: number — количество ремонтов
    - lastRepairQuality: number — качество последнего ремонта
[ ] 2. Создать src/lib/game/durability-system.ts
    - calculateMaxDurability(material, grade, level)
    - loseDurability(equipment, action, damageAbsorbed)
    - calculateCondition(durability) — состояние в %
    - getEffectivenessMultiplier(condition) — множитель эффективности
    - isBroken(equipment) — проверка поломки
[ ] 3. Определить DURABILITY_LOSS_BY_ACTION
    - attack: 0.1
    - block: 0.3
    - parry: 0.2
    - damageTaken: 0.5
[ ] 4. Проверить lint
```

**Шкала состояния:**
| Condition | % Durability | Effectiveness |
|-----------|--------------|---------------|
| pristine | 100-90% | 100% |
| good | 89-70% | 95% |
| worn | 69-50% | 85% |
| damaged | 49-20% | 70% |
| broken | <20% | 50% (и растёт) |

---

### 📦 Phase 15.4: Система ремонта

**Файлы:**
- `src/lib/game/repair-system.ts` — Логика ремонта

**Задачи:**
```
[ ] 1. Создать src/lib/game/repair-system.ts
    - RepairOptions интерфейс (materials, skill, method)
    - RepairResult интерфейс (success, quality, durabilityRestored)
    - repairEquipment(equipment, options) — основной метод
    - calculateRepairQuality(options) — качество ремонта
    - shouldDowngrade(quality) — риск понижения грейда
    - performDowngrade(equipment, newDurability) — понижение
[ ] 2. Методы ремонта:
    - field_repair: +25%, качество 40%, риск понижения 30%
    - proper_repair: +50%, качество 70%, риск 15%
    - master_repair: +80%, качество 90%, риск 5%
    - divine_repair: +100%, качество 100%, риск 0%
[ ] 3. Интегрировать с grade-system.ts
[ ] 4. Проверить lint
```

---

### 📦 Phase 15.5: Генераторы экипировки v2

**Файлы:**
- `src/lib/generator/weapon-generator-v2.ts`
- `src/lib/generator/armor-generator-v2.ts`
- `src/lib/generator/equipment-generator-v2.ts` (оркестратор)
- `src/lib/generator/base-item-generator-v2.ts`

**Архитектура генерации (Матрёшка):**
```typescript
function generateEquipmentV2(options: EquipmentOptions): Equipment {
  // 1. Базовый объект (уровень)
  const base = generateBaseObject(options.type, options.level);
  
  // 2. Материал (надстройка)
  const material = materialsRegistry.get(options.materialId || selectMaterial(options.level));
  
  // 3. Грейд (надстройка)
  const grade = selectGrade(options);
  
  // 4. Бонусы через BonusRegistry
  const bonuses = generateBonuses(
    options.type,
    options.level,
    grade,
    GRADE_MULTIPLIERS[grade],
    options.rng
  );
  
  // 5. Итоговые параметры
  return {
    id: generateId(),
    type: options.type,
    level: options.level,
    materialId: material.id,
    grade,
    bonuses,
    durability: calculateDurability(material, grade),
  };
}
```

**Задачи:**
```
[ ] 1. Рефакторинг base-item-generator.ts
    - Добавить поддержку MaterialDefinition
    - Добавить поддержку GradeOverlay
    - Использовать BonusRegistry для бонусов
[ ] 2. Создать weapon-generator-v2.ts
    - Двухэтапная генерация (base + grade)
    - Интеграция с materialsRegistry
    - Расчёт durability через durability-system
[ ] 3. Создать armor-generator-v2.ts по аналогии
[ ] 4. Создать charger-generator-v2.ts
    - Проводимость Ци от материала
    - Слоты от грейда
[ ] 5. Обновить equipment-generator.ts
    - Использовать v2 генераторы
    - Конвертировать в TempItem с новыми полями
[ ] 6. Проверить lint
[ ] 7. Протестировать генерацию 100 предметов
```

---

### 📦 Phase 15.6: Интеграция в БД

**Файлы:**
- `prisma/schema.prisma` — Расширение InventoryItem

**Задачи:**
```
[ ] 1. Добавить поля в InventoryItem:
    - materialId: String
    - grade: EquipmentGrade @default(common)
    - gradeHistory: String // JSON
    - durability: Int
    - maxDurability: Int
    - condition: String
    - repairCount: Int @default(0)
    - bonusStats: String // JSON — GeneratedBonus[]
    - specialEffects: String // JSON
    - grantedTechniques: String // JSON
[ ] 2. Создать миграцию
[ ] 3. Обновить API inventory
    - /api/inventory/equip
    - /api/inventory/repair
    - /api/inventory/upgrade-grade
[ ] 4. Обновить шину данных (FUNCTIONS.md)
[ ] 5. Проверить lint
[ ] 6. Запустить bun run db:push
```

---

### 📦 Phase 15.7: UI компонентов экипировки

**Файлы:**
- `src/components/equipment/EquipmentCard.tsx`
- `src/components/equipment/EquipmentDetail.tsx`
- `src/components/equipment/RepairDialog.tsx`
- `src/components/equipment/UpgradeDialog.tsx`

**Задачи:**
```
[ ] 1. Создать EquipmentCard.tsx
    - Отображение грейда (цвет)
    - Отображение прочности (полоска)
    - Отображение материала
    - Отображение бонусов из BonusRegistry
[ ] 2. Создать EquipmentDetail.tsx
    - Полная информация о предмете
    - История изменений грейда
    - Требования
    - Применённые состояния (conditions)
[ ] 3. Создать RepairDialog.tsx
    - Выбор метода ремонта
    - Предпросмотр результата
    - Предупреждение о риске понижения
[ ] 4. Создать UpgradeDialog.tsx
    - Требования к материалам
    - Шанс успеха
    - Предпросмотр возможных бонусов
[ ] 5. Проверить lint
```

**Цвета грейдов:**
| Grade | Цвет Tailwind | Цвет hex |
|-------|---------------|----------|
| damaged | text-red-400 | #f87171 |
| common | text-gray-400 | #9ca3af |
| refined | text-green-400 | #4ade80 |
| perfect | text-blue-400 | #60a5fa |
| transcendent | text-amber-400 | #fbbf24 |

---

## NEXT PHASES (после Phase 15)

| Phase | Description | Priority | Status |
|-------|-------------|----------|--------|
| Phase 16 | Unified Bonus System | P1 | ✅ Частично выполнено (BonusRegistry создан) |
| Phase 17 | Technique System v2 | P1 | 📋 Ready to implement |
| Phase 18 | Condition System | P1 | 📋 Ready to implement (типы созданы) |
| Phase 11 | Combat Improvements | P1 | pending |
| Phase 19 | Charger System Integration | P1 | pending |
| Phase 10 | Refactoring Duplicates | P2 | pending |
| Phase 20 | Formation System | P2 | pending |
| Phase 21 | Artifact System | P2 | pending |
| Phase 22 | Implant System | P2 | pending |

---

## Phase 16: Unified Bonus System (ЧАСТИЧНО ВЫПОЛНЕНО)

**Приоритет:** P1
**Статус:** ✅ Частично выполнено
**Зависимости:** Phase 15

**Выполнено:**
```
[x] 1. Создать src/types/bonus-registry.ts с интерфейсами
[x] 2. Определить 8 категорий бонусов
[x] 3. Добавить категорию CONDITION (18 состояний)
[x] 4. Создать маппинг BonusType → BonusCategory
[x] 5. Добавить утилиты для состояний
```

**Осталось:**
```
[ ] 6. Создать src/lib/data/bonus-registry.ts (Runtime)
    - BonusRegistry класс
    - Регистрация всех бонусов
    - Функции генерации
[ ] 7. Интегрировать с equipment-generator-v2
[ ] 8. Интегрировать с technique-generator
[ ] 9. Проверить lint
```

---

## Phase 17: Technique System v2

**Приоритет:** P1
**Статус:** 📋 Ready to implement
**Зависимости:** Phase 16

**Компоненты:**
- [ ] 17.1 Рефакторинг technique-generator
- [ ] 17.2 Система развития уровня техники
- [ ] 17.3 Интеграция BonusRegistry
- [ ] 17.4 Обновление Prisma схемы
- [ ] 17.5 UI техник

**Ключевые решения:**
- **Редкость техники НЕ изменяется** — определяется при создании
- **Уровень техники развивается** — через накопление опыта
- **Мастерство влияет** — на эффективность и стоимость
- **Бонусы через BonusRegistry** — унификация с экипировкой

**Файлы:**
- `src/lib/generator/technique-generator-v2.ts`
- `src/lib/game/technique-development.ts`
- `src/types/technique-v2.ts`

**Задачи:**
```
[ ] 1. Создать src/types/technique-v2.ts
    - TechniqueDevelopment интерфейс
    - TechniqueLevelBonuses
[ ] 2. Создать src/lib/game/technique-development.ts
    - getExperienceForLevel()
    - developTechnique()
    - calculateLevelBonuses()
[ ] 3. Рефакторинг technique-generator.ts
    - Интеграция с BonusRegistry
    - Двухэтапная генерация (base + bonuses)
[ ] 4. Обновить Prisma схему
    - Добавить experience, levelBonuses
[ ] 5. Обновить API техник
[ ] 6. Создать UI развития техник
[ ] 7. Проверить lint
```

---

## Phase 18: Condition System (Состояния)

**Приоритет:** P1
**Статус:** 📋 Ready to implement (типы созданы)
**Зависимости:** Phase 16

**Компоненты:**
- [ ] 18.1 ConditionRegistry — Runtime реестр состояний
- [ ] 18.2 ConditionManager — Управление активными состояниями
- [ ] 18.3 ConditionEffects — Применение эффектов в бою
- [ ] 18.4 UI состояний

**Файлы:**
- `src/lib/game/condition-registry.ts`
- `src/lib/game/condition-manager.ts`
- `src/lib/game/condition-effects.ts`

**Задачи:**
```
[ ] 1. Создать src/lib/game/condition-registry.ts
    - Регистрация всех состояний из BonusRegistry
    - getConditionById()
    - getConditionsByType(buff/debuff)
[ ] 2. Создать src/lib/game/condition-manager.ts
    - applyCondition(target, conditionId, source)
    - removeCondition(target, conditionId)
    - tickConditions(target) — обработка тиков
    - checkConditionExpiry(target)
[ ] 3. Создать src/lib/game/condition-effects.ts
    - processConditionTick() — DoT, HoT, slow, etc.
    - calculateConditionDamage()
    - applyConditionModifiers()
[ ] 4. Интегрировать с боевой системой
[ ] 5. Создать UI состояний
[ ] 6. Проверить lint
```

---

## VALIDATION CHECKPOINTS

### После каждого sub-phase:

```bash
bun run lint
```

Expected: 0 errors

### После Phase 15 полностью:

```bash
# 1. Lint
bun run lint

# 2. Генерация тестовых предметов
bun run test:equipment-generation

# 3. Проверка API
curl -X POST /api/inventory/generate-test
```

---

## ТЕОРЕТИЧЕСКИЕ ИЗЫСКАНИЯ

| Файл | Описание | Статус |
|------|----------|--------|
| [../weapon-armor-system.md](../weapon-armor-system.md) | Оружие, броня, система грейдов | ✅ Завершено |
| [../equip.md](../equip.md) | Унифицированная система экипировки v3.0 | ✅ Завершено |
| [../materials.md](../materials.md) | Система материалов с ID | ✅ Завершено |
| [../bonuses.md](../bonuses.md) | Единая система бонусов v2.0 | ✅ Завершено |

---

## REQUIRED DOCS

### Combat System
- [../combat-system.md](../combat-system.md) — Боевая система
- [../body.md](../body.md) — Система тела
- [../technique-system.md](../technique-system.md) — Техники

### Stat Development
- [../stat-threshold-system.md](../stat-threshold-system.md) — Пороги развития
- [../FUNCTIONS.md](../FUNCTIONS.md) — API функций

### Equipment
- [../weapon-armor-system.md](../weapon-armor-system.md) — Система оружия, брони и грейдов
- [../equip.md](../equip.md) — Типы экипировки
- [../materials.md](../materials.md) — Система материалов
- [../charger.md](../charger.md) — Зарядники Ци

---

## RISK ASSESSMENT

### Высокий риск:
1. **Миграция данных** — Существующие предметы в инвентаре нужно обновить
2. **Обратная совместимость** — Старый UI может не отображать новые поля
3. **Производительность** — Многослойная генерация может быть медленной

### Митигация:
1. Создать скрипт миграции с дефолтными значениями
2. Оставить fallback для старых полей
3. Кэшировать результаты генерации

---

## ТИМЛИНЫ

| Sub-phase | Оценка времени | Сложность |
|-----------|----------------|-----------|
| 15.0 BonusRegistry | ✅ Выполнено | — |
| 15.1 Материалы | 2-3 часа | Средняя |
| 15.2 Грейды | 3-4 часа | Средняя |
| 15.3 Прочность | 2-3 часа | Средняя |
| 15.4 Ремонт | 3-4 часа | Средняя |
| 15.5 Генераторы v2 | 6-8 часов | Высокая |
| 15.6 Интеграция БД | 4-6 часов | Высокая |
| 15.7 UI | 6-8 часов | Средняя |
| **ИТОГО (Phase 15)** | **26-36 часов** | |
| Phase 16 (остаток) | 4-6 часов | Средняя |
| Phase 17 | 8-12 часов | Высокая |
| Phase 18 | 6-8 часов | Средняя |

---

## СВОДКА ВЫПОЛНЕННОГО

### Phase 15.0: BonusRegistry ✅

**Создано:**
- `src/types/bonus-registry.ts` — Единый источник типов
- `docs/bonuses.md` v2.0 — Документация с архитектурой "Матрёшка"

**Категории бонусов:**
1. **stat** — Характеристики (сила, ловкость, интеллект)
2. **combat** — Боевые (урон, крит, пробитие)
3. **defense** — Защита (броня, уклонение, HP)
4. **qi** — Ци и культивация
5. **elemental** — Элементальные
6. **condition** — Состояния (18: 8 баффов + 10 дебаффов)
7. **special** — Особые эффекты
8. **utility** — Утилити

**Унификация:**
- BonusType (technique-config.ts) ⊂ BonusCategory
- Маппинг для обратной совместимости
- Готово к интеграции с генераторами

---

*END OF ROADMAP*
