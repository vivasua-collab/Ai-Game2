# 📋 Характеристики генераторов

**Версия:** 3.0  
**Создано:** 2026-03-19  
**Обновлено:** 2026-03-21  
**Статус:** ⚠️ V2 требует обновления до V5.0

---

## 📊 Сводная таблица

| Генератор | Объекты | Архитектура | Версия | Статус |
|-----------|--------|-------------|--------|--------|
| technique-generator-v2.ts | Техники | ✅ Матрёшка V2 | 5.0.0 | ⚠️ Требует обновления |
| technique-generator.ts | Техники | ⚠️ Устаревшая | 3.0 | ⛔ @deprecated |
| equipment-generator-v2.ts | Экипировка | ✅ Матрёшка | 2.0 | ✅ Основной |
| npc-generator.ts | NPC | ✅ Оркестратор | 2.1 | ✅ Основной |
| formation-generator.ts | Формации | ✅ Матрёшка | 1.0 | ✅ Основной |
| consumable-generator.ts | Расходники | ✅ Матрёшка | 1.0 | ✅ Основной |
| qi-stone-generator.ts | Камни Ци | ✅ Упрощённая | 1.0 | ✅ Основной |

---

## 1️⃣ technique-generator-v2.ts

### Назначение
Генерация техник культивации: combat, defense, cultivation, support, movement, sensory, healing, curse, poison.

### Версия
**5.0.0** — исправление формул согласно `docs/technique-system-v2.md`

### ⚠️ ФОРМУЛА УРОНА (КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ)

> **Урон = Ёмкость × Grade**

```
finalDamage = capacity × gradeMult

где:
  capacity = baseCapacity(type) × 2^(level-1) × masteryBonus
  gradeMult = множитель Grade (×1.0 ~ ×1.6)
```

### ❌ СТАРАЯ ФОРМУЛА (НЕВЕРНАЯ!)

```
// НЕВЕРНО! Не использовать!
finalDamage = qiSpent × gradeMult × specMult
```

### Архитектура V2

```
┌─────────────────────────────────────────────────────────────────┐
│                     ГЕНЕРАЦИЯ ТЕХНИКИ V5.0                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. ЁМКОСТЬ ТЕХНИКИ (ОСНОВА УРОНА!)                              │
│     - capacity = baseCapacity × 2^(level-1) × masteryBonus       │
│     - baseCapacity зависит от типа техники                       │
│                                                                  │
│  2. GRADE МНОЖИТЕЛЬ (НЕ зависит от уровня!)                     │
│     - common:      ×1.0 урона, qiCost ×1.0                       │
│     - refined:     ×1.2 урона, qiCost ×1.0                       │
│     - perfect:     ×1.4 урона, qiCost ×1.0                       │
│     - transcendent: ×1.6 урона, qiCost ×1.0                      │
│                                                                  │
│  3. СТИХИЙНЫЕ ЭФФЕКТЫ (Бонус 2)                                  │
│     - Определяются element + type                                │
│     - Длительность в ТИКАХ (1 тик = 1 минута)                    │
│                                                                  │
│  4. TRANSCENDENT-ЭФФЕКТЫ (Бонус 3, только transcendent)          │
│     - Уникальные свойства по стихии                              │
│                                                                  │
│  ИТОГ: finalDamage = capacity × gradeMult                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Общие модули (импорты)

```typescript
// Базовые утилиты
import { seededRandom, hashString } from './base-item-generator';

// Ёмкость техник
import { 
  getBaseCapacity, 
  calculateTechniqueCapacity,
  BASE_CAPACITY_BY_COMBAT_SUBTYPE 
} from '@/lib/constants/technique-capacity';

// ID система
import { getPrefixForTechniqueType, IdPrefix } from './id-config';

// Grade система
import { TechniqueGrade, TECHNIQUE_GRADE_ORDER } from '@/types/grade';

// Эффекты по Tier
import { 
  generateCombatEffects,
  generateDefenseHealingEffects,
  generateCursePoisonEffects,
  generateSupportUtilityEffects,
  generateCultivationEffects,
} from './effects';
```

### Множители Grade (КОРРЕКТНЫЕ)

```typescript
// Урон — основа формулы
export const GRADE_DAMAGE_MULTIPLIERS: Record<TechniqueGrade, number> = {
  common: 1.0,
  refined: 1.2,
  perfect: 1.4,
  transcendent: 1.6,
};

// Стоимость Ци — ВСЕГДА ×1.0!
export const GRADE_QI_COST_MULTIPLIERS: Record<TechniqueGrade, number> = {
  common: 1.0,
  refined: 1.0,     // Было 0.95 — НЕВЕРНО!
  perfect: 1.0,     // Было 0.9 — НЕВЕРНО!
  transcendent: 1.0, // Было 0.85 — НЕВЕРНО!
};
```

### ❌ УДАЛИТЬ (НЕ ИСПОЛЬЗОВАТЬ!)

```typescript
// НЕВЕРНЫЕ множители — удалить из формулы урона!
export const COMBAT_SUBTYPE_DAMAGE_MULTIPLIERS = {
  melee_strike: 1.5,      // НЕ применять к урону!
  melee_weapon: 1.0,
  ranged_projectile: 0.9,
  ranged_beam: 0.85,
  ranged_aoe: 0.8,
};
// Эти значения влияют ТОЛЬКО на ёмкость, НЕ на урон напрямую!
```

### Система тиков

> **1 тик = 1 минута игрового времени**

Эффекты длительностью:
- 3 тика = 3 минуты
- 5 тиков = 5 минут
- и т.д.

### Соответствие Матрёшке V2
✅ **Полное** — урон = capacity × gradeMult

---

## 2️⃣ technique-generator.ts (V1 — deprecated)

### ⚠️ СТАТУС: УСТАРЕВШИЙ!

Используйте `technique-generator-v2.ts` вместо этого файла.

### Проблемы V1

| # | Проблема | Критичность |
|---|----------|-------------|
| 1 | Неправильная формула урона | 🔴 КРИТИЧНО |
| 2 | 7+ хардкод таблиц | 🔴 КРИТИЧНО |
| 3 | ~19 000 техник (избыточно) | 🟠 ВЫСОКО |
| 4 | Несоответствие "Матрёшка" | 🟠 ВЫСОКО |

---

## 3️⃣ equipment-generator-v2.ts

### Назначение
Оркестратор генерации экипировки: weapon, armor, charger, accessory, artifact.

### Архитектура

```
Base → Material → Grade → Final
EffectiveStats = Base × MaterialProperties × GradeMultipliers
```

### Соответствие Матрёшке
✅ **Полное**

---

## 4️⃣ npc-generator.ts

### Назначение
Оркестратор генерации NPC с учётом вида, роли, культивации.

### Формулы культивации

```typescript
// Плотность Ци = 2^(level - 1)
qiDensity = Math.pow(2, cultivationLevel - 1);

// Объём ядра
coreVolume = baseVolume * qiDensity;

// Качество ядра
coreQuality = Math.floor(meridianConductivity * 10) / 10;
```

### Соответствие Матрёшке
✅ **Правильный оркестратор**

---

## 📁 Файлы эффектов (ТРЕБУЕТСЯ ОБНОВЛЕНИЕ!)

### Структура

```
src/lib/generator/effects/
├── index.ts              — Экспорт всех эффектов
├── tier-1-combat.ts      — Combat (НЕТ эффектов, только множители)
├── tier-2-defense-healing.ts — Defense & Healing
├── tier-3-curse-poison.ts    — Curse & Poison (DoT)
├── tier-4-support-utility.ts — Support, Movement, Sensory
└── tier-5-cultivation.ts     — Cultivation
```

### ⚠️ Необходимые обновления

| Файл | Изменение |
|------|-----------|
| `tier-1-combat.ts` | Добавить стихийные эффекты от element |
| `tier-2-defense-healing.ts` | Заменить ходы на тики, добавить element |
| `tier-3-curse-poison.ts` | Заменить ходы на тики |
| `tier-4-support-utility.ts` | Заменить ходы на тики |
| `tier-5-cultivation.ts` | OK (без ходов) |
| **НОВЫЙ** `element-effects.ts` | Стихийные эффекты по типу техники |
| **НОВЫЙ** `transcendent-effects.ts` | Transcendent-бонусы по стихии |

### Стихийные эффекты (атакующие)

| Стихия | Эффект | Длительность |
|--------|--------|--------------|
| 🔥 Огонь | Горение 5% урона/тик | 3 тика |
| 💧 Вода | Замедление -20% скорости | 2 тика |
| 🪨 Земля | Стан 15% шанс | 1 тик |
| 💨 Воздух | Отброс 3 клетки | — |
| ⚡ Молния | Цепной урон 50% по 2 целям | — |
| 🌑 Пустота | +30% пробития брони | — |

### Transcendent-эффекты

| Стихия | Transcendent-бонус |
|--------|-------------------|
| 🔥 Огонь | Горение по % от макс HP (игнорирует броню) |
| 💧 Вода | Замедление + потеря 5% Ци/тик движения |
| 🪨 Земля | Стан пробивает иммунитет |
| 💨 Воздух | Вихрь: 20% урона в зоне |
| ⚡ Молния | +25% урона каждой следующей цели |
| 🌑 Пустота | +50% урона по щитам |
| ⚪ Нейтральный | +10% пробития брони |

---

## 📚 Связанные документы

- [generators.md](./generators.md) — Документация генераторов V5
- [technique-system-v2.md](./technique-system-v2.md) — Система техник V2.8
- [matryoshka-architecture.md](./matryoshka-architecture.md) — Архитектура "Матрёшка"
- [checkpoints/checkpoint_03_21_bug-fix.md](./checkpoints/checkpoint_03_21_bug-fix.md) — План исправлений

---

*Документ создан: 2026-03-19*
*Обновлён: 2026-03-21 — исправлены формулы, добавлена система тиков*
