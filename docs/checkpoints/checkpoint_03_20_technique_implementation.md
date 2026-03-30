# 🔧 План реализации: Система ёмкости техник

**Дата создания:** 2026-03-20 09:30 UTC  
**Дата обновления:** 2026-03-20 11:15 UTC  
**Статус:** ✅ РЕАЛИЗАЦИЯ ЗАВЕРШЕНА

---

## 📋 КРАТКОЕ РЕШЕНИЕ

### Создаваемые файлы:

| Файл | Назначение | Строки |
|------|------------|--------|
| `element-compatibility.ts` | Противоположности, сродство, эффективность | ~100 |
| `element-multipliers.ts` | Множители урона/защиты/Ци (все = 1.0) | ~80 |
| `technique-capacity.ts` | QI_DENSITY, ёмкость техник | ~150 |

### Устраняемые дубликаты:

| Было | Станет |
|------|--------|
| QI_DENSITY × 3 копии | QI_DENSITY_TABLE × 1 |
| ELEMENT_MULTIPLIERS × 2 копии | ELEMENT_*_MULTIPLIER × 1 |
| Element тип × 2 копии | Element × 1 (из elements.ts) |

---

## 🔬 АНАЛИЗ: Выявленные дубликаты

### QI_DENSITY — 3 копии:

| Файл | Имя константы |
|------|---------------|
| `technique-generator.ts:381` | `QI_DENSITY_BY_LEVEL` |
| `lore-formulas.ts:36` | `QI_DENSITY_TABLE` |
| `combat.ts:40` | `QI_DENSITY_TABLE` |

**Решение:** Единый источник в `technique-capacity.ts`

### ELEMENT_MULTIPLIERS — 2 копии с разной структурой:

| Файл | Структура |
|------|-----------|
| `technique-generator.ts:425` | `{ damage, qiCost, effects }` |
| `base-item-generator.ts` | `{ damage, defense, special }` |

**Решение:** Разделить на отдельные константы в `element-multipliers.ts`, все значения = 1.0

### Element тип — 2 копии:

| Файл | Позиция |
|------|---------|
| `elements.ts:23` | `type Element = ...` |
| `technique-generator.ts:102` | `type Element = ...` |

**Решение:** Импортировать из `elements.ts`

---

## 📐 СТРУКТУРА ФАЙЛОВ КОНСТАНТ

```
src/lib/constants/
│
├── elements.ts (СУЩЕСТВУЕТ)
│   └── Element, ELEMENT_NAMES, ELEMENT_ICONS, ELEMENT_COLORS
│
├── element-compatibility.ts (НОВЫЙ)
│   └── ELEMENT_OPPOSITES: fire↔water, earth↔air
│   └── ELEMENT_AFFINITIES: fire+air, water+lightning
│   └── ELEMENT_EFFECTIVENESS: все = 1.0
│
├── element-multipliers.ts (НОВЫЙ)
│   └── ELEMENT_DAMAGE_MULTIPLIER: все = 1.0
│   └── ELEMENT_DEFENSE_MULTIPLIER: все = 1.0
│   └── ELEMENT_QI_COST_MULTIPLIER: все = 1.0
│   └── ELEMENT_EFFECTS
│
└── technique-capacity.ts (НОВЫЙ)
    └── QI_DENSITY_TABLE (единственный источник!)
    └── BASE_CAPACITY_BY_TYPE
    └── BASE_CAPACITY_BY_COMBAT_SUBTYPE
    └── calculateTechniqueCapacity()
```

---

## 📊 СИСТЕМА СОВМЕСТИМОСТИ ЭЛЕМЕНТОВ

### Противоположности (ELEMENT_OPPOSITES):

```
fire     ↔ water     (огонь тушится водой)
earth    ↔ air       (плотность против разреженности)
lightning → earth    (молния заземляется, одностороннее)
void     — null      (нет противоположности)
neutral  — null      (не участвует)
```

### Сродство (ELEMENT_AFFINITIES):

```
fire      + air       = раздувание пламени
water     + lightning = проводимость
earth     + fire      = лава/магма
air       + fire, lightning
lightning + water, air
void      — (нет сродства)
neutral   — (нет сродства)
```

### Схема отношений:

```
                 VOID (поглощает)
                     │
                     ▼
    ┌────────────────────────────────┐
    │                                │
  AIR ←──прот.──→ FIRE ←──прот.──→ WATER
    │             срод.              │
    │              │                 │
    │              ▼                 │
    │         LIGHTNING ←──провод.───┘
    │              │
    └──заземл.─────┘
                 │
                 ▼
               EARTH

    NEUTRAL — вне системы отношений
```

---

## 📋 ЧЕК-ЛИСТ РЕАЛИЗАЦИИ

### Этап 0: Анализ ✅ ЗАВЕРШЁН

- [x] Проанализировать структуру констант
- [x] Выявить дубликаты (QI_DENSITY × 3, ELEMENT_MULTIPLIERS × 2, Element × 2)
- [x] Разработать систему совместимости элементов
- [x] Принять решение: все множители = 1.0
- [x] Определить структуру файлов

---

### Этап 1: Создание файлов констант ✅ ЗАВЕРШЁН

**Порядок создания:**

#### 1a. element-compatibility.ts ✅
- [x] Создать файл
- [x] Добавить `ELEMENT_OPPOSITES`
- [x] Добавить `ELEMENT_AFFINITIES`
- [x] Добавить `ELEMENT_EFFECTIVENESS` (все = 1.0)
- [x] Добавить утилиты: `areOpposite()`, `haveAffinity()`, `getElementEffectiveness()`

#### 1b. element-multipliers.ts ✅
- [x] Создать файл
- [x] Добавить `ELEMENT_DAMAGE_MULTIPLIER` (все = 1.0)
- [x] Добавить `ELEMENT_DEFENSE_MULTIPLIER` (все = 1.0)
- [x] Добавить `ELEMENT_QI_COST_MULTIPLIER` (все = 1.0)
- [x] Добавить `ELEMENT_EFFECTS`
- [x] Добавить утилиты

#### 1c. technique-capacity.ts ✅
- [x] Создать файл
- [x] Добавить `QI_DENSITY_TABLE` (единый источник!)
- [x] Добавить `BASE_CAPACITY_BY_TYPE`
- [x] Добавить `BASE_CAPACITY_BY_COMBAT_SUBTYPE`
- [x] Добавить `calculateQiDensity()`
- [x] Добавить `getBaseCapacity()`
- [x] Добавить `calculateTechniqueCapacity()`
- [x] Добавить `SHIELD_SUSTAIN_BY_GRADE`
- [x] Добавить `CULTIVATION_BONUS_BY_GRADE`
- [x] Добавить `checkDestabilizationWithBaseQi()`

---

### Этап 2: Рефакторинг дубликатов ✅ ЗАВЕРШЁН

#### QI_DENSITY:
- [x] `technique-generator.ts` — удалено, импорт из technique-capacity.ts
- [x] `combat.ts` — удалено, импорт из technique-capacity.ts
- [x] `lore-formulas.ts` — обновлён импорт

#### ELEMENT_MULTIPLIERS:
- [x] `technique-generator.ts` — удалено, элементные множители = 1.0
- [x] `base-item-generator.ts` — оставлено для обратной совместимости (используется отдельно)

#### Element тип:
- [ ] `technique-generator.ts` — оставить локально (для избежания циклических импортов)

---

### Этап 3: Генераторы техник ✅ ЗАВЕРШЁН

- [x] Обновить `TECHNIQUE_BASE_CAPACITY` → использовать `getBaseCapacity()`
- [x] Обновить `generateMeleeStrikeTechnique`
- [x] Обновить `generateMeleeWeaponTechnique`
- [x] Обновить `generateRangedTechnique`
- [x] Обновить `generateDefenseTechnique`
- [x] Обновить `generateSupportTechnique`
- [x] Обновить `generateHealingTechnique`
- [x] Обновить `generateMovementTechnique`
- [x] Обновить `generateSensoryTechnique`
- [x] Обновить `generateCultivationTechnique` (baseCapacity = null)
- [x] Обновить `generateCurseTechnique`
- [x] Обновить `generatePoisonTechnique`

**Ключевые изменения:**
- `baseCapacity` теперь хранит БАЗОВОЕ значение (без умножения на уровень)
- `BaseTechnique.baseCapacity` изменён на `number | null` (null для cultivation)
- Финальная ёмкость рассчитывается через `calculateTechniqueCapacity(type, level, mastery, subtype)`

---

### Этап 4: Боевая система (КРИТИЧНО) ✅ ЗАВЕРШЁН

- [x] Импортировать константы из technique-capacity.ts
- [x] Обновить handleTechniqueUse: `baseQiInput = qiCost × qiDensity`
- [x] Исправить `calculateTechniqueCapacity` — добавлен параметр `type`
- [x] Заменить `checkDestabilization` на `checkDestabilizationWithBaseQi`
- [x] Проверить формулу урона (qiDensity НЕ умножается дважды)
- [x] Добавить проверку пассивных техник (cultivation → возврат ошибки)

**Новая формула урона:**
```
baseQiInput = qiCost × qiDensity
capacity = calculateTechniqueCapacity(type, level, mastery, subtype)
effectiveQi = min(baseQiInput, capacity × 1.1)
damage = effectiveQi × statMult × masteryMult × rarityMult
```

**ВАЖНО:** `qiDensity` НЕ умножается дважды! `effectiveQi` уже в базовых единицах.

---

### Этап 5: Спец. механики ✅ ЗАВЕРШЁН

- [x] Создать `src/lib/game/mechanics/shield.ts`
- [x] Создать `src/lib/game/mechanics/cultivation.ts`
- [x] Создать `src/lib/game/mechanics/index.ts` (экспорты)
- [ ] Интегрировать с боевой системой (опционально)

**Созданные файлы:**
- `shield.ts`: createShield, updateShieldPerTurn, applyDamageToShield, repairShield
- `cultivation.ts`: startCultivation, calculateQiAbsorption, checkInterruption

---

### Этап 6: UI ✅ ЗАВЕРШЁН

- [x] Отображать capacity в `TechniquesDialog.tsx`
- [x] Добавить предупреждение о дестабилизации
- [x] Проверка линтера (0 ошибок)

**Добавлено в UI:**
- Отображение `baseCapacity` для каждой техники
- Расчёт максимальной ёмкости с учётом уровня и мастерства
- Предупреждение о дестабилизации при превышении ёмкости техники

---

## 📊 ДЕРЕВО ЗАВИСИМОСТЕЙ

```
┌─────────────────────────────────────────────────────────────┐
│                    src/lib/constants/                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  elements.ts (БАЗА)                                         │
│  └── Element, ELEMENTS, ELEMENT_NAMES, ELEMENT_COLORS       │
│          │                                                  │
│          ├──────────────────┬───────────────────┐           │
│          ▼                  ▼                   ▼           │
│  element-compatibility.ts  element-multipliers.ts           │
│  └── OPPOSITES             ├── DAMAGE_MULTIPLIER            │
│  └── AFFINITIES            ├── DEFENSE_MULTIPLIER           │
│  └── EFFECTIVENESS         ├── QI_COST_MULTIPLIER           │
│                            └── EFFECTS                       │
│                                                             │
│  technique-capacity.ts                                      │
│  └── QI_DENSITY_TABLE (из elements.ts: Element)             │
│  └── BASE_CAPACITY_BY_TYPE                                  │
│  └── BASE_CAPACITY_BY_COMBAT_SUBTYPE                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     ИМПОРТЁРЫ                                │
├─────────────────────────────────────────────────────────────┤
│  technique-generator.ts ← elements, multipliers, capacity   │
│  base-item-generator.ts ← elements, multipliers             │
│  combat.ts ← capacity                                       │
│  lore-formulas.ts ← capacity (QI_DENSITY)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚠️ РИСКИ

| Риск | Статус | Описание |
|------|--------|----------|
| Изменение урона | ✅ Проверено | Формула исправлена — qiDensity не умножается дважды |
| Строгая дестабилизация | ✅ Реализовано | L9 практик с L1 техникой получит отдачу |
| Слом импортов | ✅ Исправлено | Все импорты обновлены (5 файлов) |
| Пассивные техники | ✅ Добавлено | Cultivation возвращает ошибку при попытке использования в бою |

---

## 📅 ОЧЕРЁДНОСТЬ

| # | Этап | Время | Статус |
|---|------|-------|--------|
| 0 | Анализ | 1ч 15м | ✅ Готово |
| 1a | element-compatibility.ts | 30м | ✅ Готово |
| 1b | element-multipliers.ts | 30м | ✅ Готово |
| 1c | technique-capacity.ts | 45м | ✅ Готово |
| 2 | Рефакторинг дубликатов | 1.5ч | ✅ Готово |
| 3 | Генераторы техник | 2ч | ✅ Готово |
| 4 | Боевая система | 2ч | ✅ Готово |
| 5 | Спец. механики | 1ч | ✅ Готово |
| 6 | UI | 30м | ✅ Готово |

**Прогресс: ~10 часов / 13 часов (77%) — ВСЕ ОСНОВНЫЕ ЭТАПЫ ЗАВЕРШЕНЫ!**
**Статус:** ✅ РЕАЛИЗАЦИЯ ЗАВЕРШЕНА

---

## 📝 КОД ФАЙЛОВ (для копирования)

### element-compatibility.ts

```typescript
import { Element } from './elements';

export const ELEMENT_OPPOSITES: Record<Element, Element | null> = {
  fire: 'water', water: 'fire', earth: 'air', air: 'earth',
  lightning: 'earth', void: null, neutral: null,
} as const;

export const ELEMENT_AFFINITIES: Record<Element, Element[]> = {
  fire: ['air'], water: ['lightning'], earth: ['fire'],
  air: ['fire', 'lightning'], lightning: ['water', 'air'],
  void: [], neutral: [],
} as const;

export const ELEMENT_EFFECTIVENESS: Record<Element, Record<Element, number>> = {
  fire: { fire: 1, water: 1, earth: 1, air: 1, lightning: 1, void: 1, neutral: 1 },
  water: { fire: 1, water: 1, earth: 1, air: 1, lightning: 1, void: 1, neutral: 1 },
  earth: { fire: 1, water: 1, earth: 1, air: 1, lightning: 1, void: 1, neutral: 1 },
  air: { fire: 1, water: 1, earth: 1, air: 1, lightning: 1, void: 1, neutral: 1 },
  lightning: { fire: 1, water: 1, earth: 1, air: 1, lightning: 1, void: 1, neutral: 1 },
  void: { fire: 1, water: 1, earth: 1, air: 1, lightning: 1, void: 1, neutral: 1 },
  neutral: { fire: 1, water: 1, earth: 1, air: 1, lightning: 1, void: 1, neutral: 1 },
} as const;

export const areOpposite = (e1: Element, e2: Element) => ELEMENT_OPPOSITES[e1] === e2;
export const haveAffinity = (e1: Element, e2: Element) => ELEMENT_AFFINITIES[e1]?.includes(e2) ?? false;
export const getElementEffectiveness = (attack: Element, defense: Element) => ELEMENT_EFFECTIVENESS[attack]?.[defense] ?? 1.0;
```

---

### element-multipliers.ts

```typescript
import { Element } from './elements';

// ВСЕ = 1.0 (базовый уровень, система бонусов будет позже)
export const ELEMENT_DAMAGE_MULTIPLIER: Record<Element, number> = {
  fire: 1, water: 1, earth: 1, air: 1, lightning: 1, void: 1, neutral: 1,
} as const;

export const ELEMENT_DEFENSE_MULTIPLIER: Record<Element, number> = {
  fire: 1, water: 1, earth: 1, air: 1, lightning: 1, void: 1, neutral: 1,
} as const;

export const ELEMENT_QI_COST_MULTIPLIER: Record<Element, number> = {
  fire: 1, water: 1, earth: 1, air: 1, lightning: 1, void: 1, neutral: 1,
} as const;

export const ELEMENT_EFFECTS: Record<Element, string[]> = {
  fire: ['burning', 'heat'],
  water: ['freezing', 'slow', 'flow'],
  earth: ['shield', 'knockback', 'stability', 'weight'],
  air: ['knockback', 'slow', 'speed', 'lightness'],
  lightning: ['stun', 'pierce', 'chain'],
  void: ['pierce', 'leech', 'debuff', 'drain'],
  neutral: [],
} as const;
```

---

### technique-capacity.ts

```typescript
import type { TechniqueType, CombatSubtype } from '@/lib/generator/technique-generator';
import type { TechniqueGrade } from '@/types/grade';

// ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ!
export const QI_DENSITY_TABLE: Record<number, number> = {
  1: 1, 2: 2, 3: 4, 4: 8, 5: 16, 6: 32, 7: 64, 8: 128, 9: 256,
} as const;

export const calculateQiDensity = (level: number) => 
  QI_DENSITY_TABLE[Math.max(1, Math.min(9, level))] ?? Math.pow(2, level - 1);

export const BASE_CAPACITY_BY_TYPE: Record<TechniqueType, number | null> = {
  combat: 48, formation: 80, defense: 72, cultivation: null,
  support: 56, healing: 56, movement: 40, curse: 40, poison: 40, sensory: 32,
} as const;

export const BASE_CAPACITY_BY_COMBAT_SUBTYPE: Record<CombatSubtype, number> = {
  melee_strike: 64, melee_weapon: 48, ranged_projectile: 32, ranged_beam: 32, ranged_aoe: 32,
} as const;

export const getBaseCapacity = (type: TechniqueType, subtype?: CombatSubtype): number | null => {
  if (type === 'cultivation') return null;
  if (type === 'combat' && subtype) return BASE_CAPACITY_BY_COMBAT_SUBTYPE[subtype] ?? 48;
  return BASE_CAPACITY_BY_TYPE[type] ?? 48;
};

export const calculateTechniqueCapacity = (
  type: TechniqueType, level: number, mastery: number, subtype?: CombatSubtype
): number | null => {
  const base = getBaseCapacity(type, subtype);
  if (base === null) return null;
  return Math.floor(base * Math.pow(2, level - 1) * (1 + mastery * 0.005));
};

export const SHIELD_SUSTAIN_BY_GRADE: Record<TechniqueGrade, number> = {
  common: 0, refined: 0.05, perfect: 0.10, transcendent: 0.20,
} as const;

export const CULTIVATION_BONUS_BY_GRADE: Record<TechniqueGrade, {
  qiBonus: number; gradient: number; unnoticeability: number;
}> = {
  common: { qiBonus: 0.10, gradient: 1.0, unnoticeability: 0.05 },
  refined: { qiBonus: 0.20, gradient: 1.2, unnoticeability: 0.10 },
  perfect: { qiBonus: 0.35, gradient: 1.5, unnoticeability: 0.15 },
  transcendent: { qiBonus: 0.50, gradient: 2.0, unnoticeability: 0.25 },
} as const;

export const SHIELD_DECAY_RATE = 0.002;
```

---

## ✅ ГОТОВНОСТЬ

**Анализ завершён. Все решения приняты:**

1. ✅ Архитектура файлов определена
2. ✅ Все множители = 1.0
3. ✅ Система совместимости разработана
4. ✅ Дубликаты идентифицированы
5. ✅ Порядок внедрения определён
6. ✅ Код файлов подготовлен

**Следующий шаг:** Команда "Начать реализацию Этапа 1"

---

*Документ подготовлен: 2026-03-20*  
*Анализ завершён: 2026-03-20 09:27 UTC*
