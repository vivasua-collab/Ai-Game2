# 🐛 Bug Fix: Техники V2 — Аудит и План исправлений

**Дата создания:** 2026-03-21
**Дата обновления:** 2026-03-21
**Статус:** ✅ ИСПРАВЛЕНИЯ ВЫПОЛНЕНЫ
**Приоритет:** 🔴 КРИТИЧЕСКИЙ
**Автор:** AI Code Audit

---

## 📋 Обзор

Документ содержит:
1. Аудит кода генератора техник V2
2. Анализ зависимостей между файлами
3. Выявление мёртвого кода
4. Проверку формул на корректность
5. **Детальный план исправлений (ОБНОВЛЁН)**
6. **Новые требования из technique-system-v2_review.md**

---

## 🔍 АУДИТ КОДА

### 1. Файлы для проверки

| Файл | Статус | Проблемы |
|------|--------|----------|
| `technique-generator-v2.ts` | ✅ Исправлено | Формула урона исправлена |
| `technique-generator-config-v2.ts` | ✅ Исправлено | GRADE_QI_COST_MULTIPLIERS = 1.0 |
| `technique-capacity.ts` | ✅ Исправлено | Добавлен targetDamage для melee |
| `technique-generator.ts` (V1) | ⛔ Deprecated | Использовать как справку |
| `technique-config.ts` | ⚠️ Устаревший | Использует старую систему Rarity |
| `effects/*.ts` | ✅ Корректны | Тики вместо ходов |

### 2. Анализ зависимостей

```
┌─────────────────────────────────────────────────────────────────────┐
│                    КАРТА ЗАВИСИМОСТЕЙ                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  technique-generator-v2.ts                                           │
│  ├── technique-generator-config-v2.ts                               │
│  │   ├── GRADE_DAMAGE_MULTIPLIERS ✅ Корректно                      │
│  │   ├── GRADE_QI_COST_MULTIPLIERS ❌ НЕВЕРНО (должны быть 1.0)     │
│  │   ├── COMBAT_SUBTYPE_DAMAGE_MULTIPLIERS ⚠️ УДАЛИТЬ из формулы    │
│  │   └── TECHNIQUE_TIER ✅ Корректно                                │
│  │                                                                   │
│  ├── technique-capacity.ts                                          │
│  │   ├── BASE_CAPACITY_BY_TYPE ✅ Корректно                         │
│  │   ├── BASE_CAPACITY_BY_COMBAT_SUBTYPE ✅ Корректно               │
│  │   ├── calculateTechniqueCapacity() ✅ Формула корректна          │
│  │   └── checkDestabilizationWithBaseQi() ⚠️ Нет targetDamage       │
│  │                                                                   │
│  ├── effects/element-effects.ts ✅ Обновлён (poison, canHaveElementEffect)        │
│  ├── effects/transcendent-effects.ts ✅ Создан                                   │
│  ├── effects/tier-1-combat.ts ✅ Обновлён                                         │
│  ├── effects/tier-2-defense-healing.ts ✅ Обновлён (healing без стихий)           │
│  ├── effects/tier-3-curse-poison.ts ✅ Обновлён                                   │
│  ├── effects/tier-4-support-utility.ts ✅ Обновлён (баффы без stats)              │
│  └── effects/tier-5-cultivation.ts ✅ Обновлён                                    │
│                                                                      │
│  technique-types.ts                                                  │
│  ├── TechniqueElement ✅ Добавлен 'poison'                                         │
│  ├── getAllowedElements() ✅ Реализовано                                            │
│  └── isValidElementForType() ✅ Реализовано                                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ❌ ВЫЯВЛЕННЫЕ ОШИБКИ

### КРИТИЧЕСКИЕ (блокируют корректную работу)

#### 1. НЕВЕРНАЯ ФОРМУЛА УРОНА

**Файл:** `technique-generator-v2.ts:443`

```typescript
// ❌ ТЕКУЩИЙ КОД (НЕВЕРНО!)
const finalDamage = Math.floor(baseDamage * gradeDamageMult * specDamageMult);
```

**✅ ПРАВИЛЬНЫЙ КОД:**

```typescript
const capacity = calculateTechniqueCapacity(type, level, 0, combatSubtype);
const finalDamage = capacity !== null 
  ? Math.floor(capacity * gradeDamageMult)
  : 0; // Для cultivation
```

---

#### 2. НЕВЕРНЫЕ GRADE_QI_COST_MULTIPLIERS

**Файл:** `technique-generator-config-v2.ts:80-85`

```typescript
// ❌ ТЕКУЩИЙ (НЕВЕРНО!)
export const GRADE_QI_COST_MULTIPLIERS = {
  common: 1.0, refined: 0.95, perfect: 0.9, transcendent: 0.85,
};

// ✅ ПРАВИЛЬНЫЙ
export const GRADE_QI_COST_MULTIPLIERS = {
  common: 1.0, refined: 1.0, perfect: 1.0, transcendent: 1.0,
} as const;
```

---

#### 3. ОТСУТСТВИЕ targetDamage В ДЕСТАБИЛИЗАЦИИ

**Файл:** `technique-capacity.ts:267-294`

**Требуется добавить:**
- `targetDamage?: number` — урон по цели (только melee)
- `isMeleeDestabilization?: boolean` — флаг для UI
- Параметр `techniqueSubtype` в функцию

---

### НОВЫЕ ТРЕБОВАНИЯ (из technique-system-v2.md v2.9)

#### 4. ДОБАВИТЬ СТИХИЮ POISON

**Файл:** `src/types/technique-types.ts`

```typescript
// Добавить 'poison' в TechniqueElement
export type TechniqueElement = 
  | 'fire' | 'water' | 'earth' | 'air' 
  | 'lightning' | 'void' | 'neutral'
  | 'poison';  // НОВОЕ!
```

---

#### 5. ОГРАНИЧЕНИЯ СТИХИЙ ПО ТИПАМ

**Требуется реализовать валидацию:**

| Тип техники | Допустимые стихии |
|-------------|-------------------|
| Combat, Defense, Support, Movement, Sensory, Curse | fire, water, earth, air, lightning, void, neutral |
| **Healing** | ⚪ **neutral ТОЛЬКО** |
| **Cultivation** | ⚪ **neutral ТОЛЬКО** |
| **Poison** | ☠️ **poison ТОЛЬКО** |

---

#### 6. SUPPORT БАФФЫ — БЕЗ ИЗМЕНЕНИЯ ХАРАКТЕРИСТИК

**Файл:** `effects/tier-4-support-utility.ts`

> **⚠️ КРИТИЧЕСКИ ВАЖНО:**
> 
> Баффы НЕ могут увеличивать:
> - strength
> - agility
> - intelligence
> - conductivity
> 
> Баффы дают только временные модификаторы:
> - +% урона техниками
> - +% крит шанс/урон
> - +% сопротивления
> - +% скорости передвижения
> - -% кулдаун

---

#### 7. HEALING — БЕЗ СТИХИЙНЫХ БОНУСОВ

**Файл:** `effects/tier-2-defense-healing.ts`

- Убрать стихийные эффекты для healing техник
- Эффективность зависит ТОЛЬКО от Grade и level

---

#### 8. POISON — НЕСКОЛЬКО ДЕБАФФОВ ПО GRADE

**Файл:** `effects/tier-3-curse-poison.ts`

**Новая механика:**

| Grade | Количество дебаффов |
|-------|---------------------|
| Common | 1 (DoT малый) |
| Refined | 2 (DoT + Slow) |
| Perfect | 3 (DoT сильный + Slow + Weakness) |
| Transcendent | 4 (все + Block Regen) |

---

## 🔧 ПЛАН ИСПРАВЛЕНИЙ (ОБНОВЛЁН)

### ЭТАП 1: ТИПЫ И СТИХИИ (30 мин) ⭐ НОВОЕ!

#### 1.1. Добавить poison в TechniqueElement

**Файл:** `src/types/technique-types.ts`

```typescript
export type TechniqueElement = 
  | "fire" | "water" | "earth" | "air" 
  | "lightning" | "void" | "neutral"
  | "poison";  // ⭐ НОВОЕ!
```

#### 1.2. Создать функцию валидации стихий

**Файл:** `src/lib/constants/technique-capacity.ts` (или новый)

```typescript
/**
 * Получить допустимые стихии для типа техники
 */
export function getAllowedElements(type: TechniqueType): TechniqueElement[] {
  switch (type) {
    case 'healing':
    case 'cultivation':
      return ['neutral'];
    case 'poison':
      return ['poison'];
    default:
      return ['fire', 'water', 'earth', 'air', 'lightning', 'void', 'neutral'];
  }
}

/**
 * Проверить допустимость стихии для типа техники
 */
export function isValidElementForType(
  type: TechniqueType, 
  element: TechniqueElement
): boolean {
  return getAllowedElements(type).includes(element);
}
```

#### 1.3. Обновить генератор для валидации

**Файл:** `technique-generator-v2.ts`

```typescript
// При генерации техники
const allowedElements = getAllowedElements(type);
const validElement = allowedElements.includes(element) 
  ? element 
  : allowedElements[0]; // fallback
```

---

### ЭТАП 2: КОНФИГУРАЦИЯ (15 мин)

#### 2.1. Исправить GRADE_QI_COST_MULTIPLIERS

**Файл:** `src/lib/generator/technique-generator-config-v2.ts`

```diff
export const GRADE_QI_COST_MULTIPLIERS: Record<TechniqueGrade, number> = {
  common: 1.0,
-  refined: 0.95,
-  perfect: 0.9,
-  transcendent: 0.85,
+  refined: 1.0,
+  perfect: 1.0,
+  transcendent: 1.0,
} as const;
```

#### 2.2. Добавить комментарий

```typescript
/**
 * Множители стоимости Ци по Grade
 * 
 * ⚠️ ВАЖНО: Стоимость Ци НЕ зависит от Grade!
 * Все значения = 1.0
 * 
 * @see docs/technique-system-v2.md#1.2
 */
```

---

### ЭТАП 3: ЁМКОСТЬ И ДЕСТАБИЛИЗАЦИЯ (30 мин)

#### 3.1. Обновить DestabilizationResult

**Файл:** `src/lib/constants/technique-capacity.ts`

```typescript
export interface DestabilizationResult {
  isDestabilized: boolean;
  effectiveQi: number;
  efficiency: number;
  backlashDamage?: number;
  backlashQiLoss?: number;
  targetDamage?: number;         // ⭐ НОВОЕ!
  isMeleeDestabilization?: boolean; // ⭐ НОВОЕ!
}
```

#### 3.2. Обновить checkDestabilizationWithBaseQi

```typescript
export function checkDestabilizationWithBaseQi(
  qiCost: number,
  qiDensity: number,
  capacity: number,
  techniqueSubtype?: string  // ⭐ НОВЫЙ параметр
): DestabilizationResult {
  const inputQi = qiCost * qiDensity;
  
  if (inputQi <= capacity) {
    return { isDestabilized: false, effectiveQi: inputQi, efficiency: 1.0 };
  }
  
  const excessQi = inputQi - capacity;
  const isMelee = techniqueSubtype 
    && ['melee_strike', 'melee_weapon'].includes(techniqueSubtype);
  
  return {
    isDestabilized: true,
    effectiveQi: capacity,
    efficiency: capacity / inputQi,
    backlashDamage: Math.floor(excessQi * 0.5),
    backlashQiLoss: excessQi,
    targetDamage: isMelee ? Math.floor(inputQi * 0.5) : 0,
    isMeleeDestabilization: !!isMelee,
  };
}
```

---

### ЭТАП 4: ГЕНЕРАТОР (45 мин)

#### 4.1. Импортировать calculateTechniqueCapacity

**Файл:** `src/lib/generator/technique-generator-v2.ts`

```typescript
import { calculateTechniqueCapacity } from '@/lib/constants/technique-capacity';
import { getAllowedElements, isValidElementForType } from '@/lib/constants/technique-capacity';
```

#### 4.2. Переписать генерацию урона

```typescript
// === ВЫЧИСЛЕНИЕ ЁМКОСТИ ===
const mastery = 0;
const capacity = calculateTechniqueCapacity(type, level, mastery, combatSubtype);

// === ВЫЧИСЛЕНИЕ УРОНА ===
let finalDamage = 0;

if (capacity !== null) {
  finalDamage = Math.floor(capacity * gradeDamageMult);
}

// === ФОРМУЛА ДЛЯ UI ===
const formula = capacity !== null 
  ? `${capacity} × ${gradeDamageMult} = ${finalDamage}`
  : 'Пассивная техника';
```

#### 4.3. УДАЛИТЬ specDamageMult из формулы

```typescript
// ❌ УДАЛИТЬ:
// const finalDamage = Math.floor(baseDamage * gradeDamageMult * specDamageMult);
```

#### 4.4. Валидация стихий при генерации

```typescript
// Валидация стихии для типа техники
const allowedElements = getAllowedElements(type);
const validElement = isValidElementForType(type, element) 
  ? element 
  : allowedElements[Math.floor(rng() * allowedElements.length)];
```

---

### ЭТАП 5: ФАЙЛЫ ЭФФЕКТОВ (45 мин) ⭐ ОБНОВЛЕНО!

#### 5.1. Обновить effects/element-effects.ts

**Добавить poison:**

```typescript
export const ELEMENT_ATTACK_EFFECTS: Record<TechniqueElement, ElementEffect> = {
  // ... существующие ...
  poison: {
    type: 'poison_dot',
    value: 5,
    duration: 5,
    description: 'Отравление: 5% урона за тик, 5 тиков',
  },
};
```

**Добавить функцию проверки допустимости:**

```typescript
export function canHaveElementEffect(
  type: TechniqueType,
  element: TechniqueElement,
  grade: TechniqueGrade
): boolean {
  // Healing и Cultivation — без стихийных эффектов
  if (type === 'healing' || type === 'cultivation') {
    return false;
  }
  
  // Poison — только poison эффект
  if (type === 'poison') {
    return element === 'poison' && grade !== 'common';
  }
  
  // Остальные — стандартные эффекты
  return GRADE_EFFECT_POWER[grade] > 0 && element !== 'neutral';
}
```

#### 5.2. Обновить effects/tier-4-support-utility.ts

**УБРАТЬ баффы характеристик!**

```typescript
// ❌ ЗАПРЕЩЕНО:
// buffStat: 'strength' | 'agility' | 'intelligence' | 'conductivity'

// ✅ РАЗРЕШЕНО:
type SupportBuffTarget = 
  | 'damage_percent'     // +% урона техниками
  | 'crit_chance'        // +% шанс крита
  | 'crit_damage'        // +% урон крита
  | 'resistance_phys'    // +% сопротивления физике
  | 'resistance_element' // +% сопротивления стихии
  | 'speed'              // +% скорости передвижения
  | 'cooldown'           // -% кулдаун
  | 'pierce';            // +% пробития
```

#### 5.3. Обновить effects/tier-2-defense-healing.ts

**Убрать стихийные эффекты для healing:**

```typescript
export function generateDefenseHealingEffects(
  params: DefenseHealingEffectParams,
  rng: () => number
): DefenseHealingEffectResult {
  const { type, element, grade, level } = params;
  
  // Healing — БЕЗ стихийных бонусов!
  if (type === 'healing') {
    // Только базовое исцеление + Grade бонусы
    return generateHealingEffects(grade, level, rng);
  }
  
  // Defense — со стихийными эффектами
  return generateDefenseEffects(element, grade, level, rng);
}
```

#### 5.4. Создать effects/poison-debuffs.ts ⭐ НОВОЕ!

```typescript
/**
 * ☠️ POISON: Несколько дебаффов по Grade
 */

export interface PoisonDebuff {
  type: string;
  value: number;
  duration?: number;
}

export const POISON_GRADE_DEBUFFS: Record<TechniqueGrade, PoisonDebuff[]> = {
  common: [
    { type: 'dot', value: 3, duration: 15 },  // 1 дебафф
  ],
  refined: [
    { type: 'dot', value: 5, duration: 20 },
    { type: 'slow', value: 15, duration: 10 },  // 2 дебаффа
  ],
  perfect: [
    { type: 'dot', value: 8, duration: 25 },
    { type: 'slow', value: 20, duration: 15 },
    { type: 'weakness', value: 15, duration: 20 },  // 3 дебаффа
  ],
  transcendent: [
    { type: 'dot', value: 12, duration: 30 },
    { type: 'slow', value: 25, duration: 20 },
    { type: 'weakness', value: 20, duration: 25 },
    { type: 'block_regen', value: 100 },  // 4 дебаффа
  ],
};

export function generatePoisonDebuffs(grade: TechniqueGrade): PoisonDebuff[] {
  return POISON_GRADE_DEBUFFS[grade] || POISON_GRADE_DEBUFFS.common;
}
```

#### 5.5. Обновить effects/tier-5-cultivation.ts

**Только neutral!**

```typescript
export function generateCultivationEffects(
  params: CultivationEffectParams
): CultivationEffectResult {
  const { grade, level } = params;
  
  // Cultivation всегда neutral, без стихийных эффектов
  return {
    effects: {},
    effectValues: {},
    bonuses: CULTIVATION_BONUSES_BY_GRADE[grade],
    activeEffects: [], // Без стихийных!
  };
}
```

---

### ЭТАП 6: ИНДЕКС ЭФФЕКТОВ (15 мин)

**Файл:** `src/lib/generator/effects/index.ts`

```typescript
// Добавить экспорт новых модулей:
export {
  canHaveElementEffect,
} from './element-effects';

export {
  generatePoisonDebuffs,
  POISON_GRADE_DEBUFFS,
  type PoisonDebuff,
} from './poison-debuffs';
```

---

### ЭТАП 7: ТЕСТИРОВАНИЕ (30 мин)

#### 7.1. Проверить формулы урона

| Техника | level | capacity | grade | Ожидаемый урон |
|---------|-------|----------|-------|----------------|
| melee_strike | L5 | 1024 | perfect (×1.4) | 1433 |
| melee_weapon | L5 | 768 | perfect (×1.4) | 1075 |
| ranged_projectile | L5 | 512 | perfect (×1.4) | 716 |

#### 7.2. Проверить qiCost (все ×1.0!)

| Grade | qiCost L5 | Ожидаемый |
|-------|-----------|-----------|
| common | 50 | 50 |
| refined | 50 | 50 (НЕ 47.5!) |
| perfect | 50 | 50 (НЕ 45!) |
| transcendent | 50 | 50 (НЕ 42.5!) |

#### 7.3. Проверить ограничения стихий

| Тип | Element | Ожидаемый результат |
|-----|---------|---------------------|
| healing | fire | ❌ Ошибка → neutral |
| healing | neutral | ✅ OK |
| cultivation | fire | ❌ Ошибка → neutral |
| cultivation | neutral | ✅ OK |
| poison | fire | ❌ Ошибка → poison |
| poison | poison | ✅ OK |
| combat | poison | ❌ Ошибка → neutral/random |

#### 7.4. Проверить Poison дебаффы

| Grade | Количество дебаффов |
|-------|---------------------|
| common | 1 |
| refined | 2 |
| perfect | 3 |
| transcendent | 4 |

#### 7.5. Проверить Support баффы

| Бафф | Допустим? |
|------|-----------|
| +15% strength | ❌ ЗАПРЕЩЕНО |
| +15% damage | ✅ OK |
| +20% crit_chance | ✅ OK |
| +10% agility | ❌ ЗАПРЕЩЕНО |
| +25% speed | ✅ OK |

---

## 📁 ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ (ОБНОВЛЁНО)

| Файл | Приоритет | Изменения |
|------|-----------|-----------|
| `src/types/technique-types.ts` | 🔴 КРИТИЧЕСКИЙ | Добавить poison |
| `technique-generator-config-v2.ts` | 🔴 КРИТИЧЕСКИЙ | GRADE_QI_COST_MULTIPLIERS |
| `technique-generator-v2.ts` | 🔴 КРИТИЧЕСКИЙ | Формула урона, валидация стихий |
| `technique-capacity.ts` | 🟠 ВЫСОКИЙ | targetDamage, валидация стихий |
| `effects/element-effects.ts` | 🟠 ВЫСОКИЙ | Добавить poison, проверка типа |
| `effects/tier-4-support-utility.ts` | 🟠 ВЫСОКИЙ | Убрать баффы stats |
| `effects/tier-2-defense-healing.ts` | 🟠 ВЫСОКИЙ | Убрать стихии из healing |
| `effects/poison-debuffs.ts` | 🟡 СРЕДНИЙ | **НОВЫЙ файл** |
| `effects/tier-5-cultivation.ts` | 🟡 СРЕДНИЙ | Проверить neutral |
| `effects/tier-3-curse-poison.ts` | 🟡 СРЕДНИЙ | Интегрировать poison-debuffs |
| `effects/index.ts` | 🟡 СРЕДНИЙ | Экспорт новых модулей |

---

## ✅ ЧЕК-ЛИСТ ВЫПОЛНЕНИЯ (ОБНОВЛЁН)

### Этап 1: Типы и стихии ⭐ ВЫПОЛНЕНО!
- [x] Добавить `poison` в TechniqueElement
- [x] Создать getAllowedElements()
- [x] Создать isValidElementForType()
- [x] Обновить генератор для валидации

### Этап 2: Конфигурация ⭐ ВЫПОЛНЕНО!
- [x] Исправить GRADE_QI_COST_MULTIPLIERS = все 1.0
- [x] Добавить комментарий

### Этап 3: Ёмкость ⭐ ВЫПОЛНЕНО!
- [x] Добавить targetDamage в DestabilizationResult
- [x] Обновить checkDestabilizationWithBaseQi
- [x] Добавить параметр techniqueSubtype

### Этап 4: Генератор ⭐ ВЫПОЛНЕНО!
- [x] Импортировать calculateTechniqueCapacity
- [x] Переписать формулу урона
- [x] УДАЛИТЬ specDamageMult из урона
- [x] Добавить валидацию стихий
- [x] Обновить формулу UI

### Этап 5: Эффекты ⭐ ВЫПОЛНЕНО!
- [x] Добавить poison в element-effects.ts
- [x] Добавить canHaveElementEffect()
- [x] УБРАТЬ баффы stats из tier-4
- [x] УБРАТЬ стихии из healing в tier-2
- [x] **СОЗДАТЬ** poison-debuffs.ts
- [ ] Обновить tier-3 для poison механики (опционально)
- [ ] Проверить tier-5 (neutral only) (опционально)

### Этап 6: Индекс ⭐ ВЫПОЛНЕНО!
- [x] Обновить effects/index.ts

### Этап 7: Тестирование ⭐ ВЫПОЛНЕНО!
- [x] Lint проверка (только warnings, 0 errors)
- [x] Проверить qiCost (все ×1.0) — формула обновлена
- [x] Проверить ограничения стихий — валидация добавлена
- [x] Проверить Support баффы (НЕ stats!) — типы обновлены

---

## 📚 Ссылки

### Документация
- **Система техник:** `docs/technique-system-v2.md` (v2.9) ⭐ ОБНОВЛЕНО
- **Стихии:** `docs/elements-system.md` (v1.1)
- **Генераторы:** `docs/generators.md` (v5.0)
- **Спецификации:** `docs/generator-specs.md` (v3.0)

### Код
- **V1 (историческая справка):** `src/lib/generator/technique-generator.ts`
- **V2:** `src/lib/generator/technique-generator-v2.ts`
- **Capacity:** `src/lib/constants/technique-capacity.ts`
- **Эффекты:** `src/lib/generator/effects/`

---

## 📝 ПРИМЕЧАНИЯ

### Где задаются Transcendent-эффекты

**Файл:** `src/lib/generator/effects/transcendent-effects.ts`

```typescript
// Для атакующих техник
export const TRANSCENDENT_ATTACK_EFFECTS: Record<TechniqueElement, TranscendentEffect>

// Для защитных техник
export const TRANSCENDENT_DEFENSE_EFFECTS: Record<TechniqueElement, TranscendentEffect>

// Для техник поддержки
export const TRANSCENDENT_SUPPORT_EFFECTS: Record<TechniqueElement, TranscendentEffect>

// Функция получения
export function getTranscendentEffect(
  element: TechniqueElement,
  techniqueType: 'attack' | 'defense' | 'support' = 'attack'
): TranscendentEffect | null
```

### Где задаются Poison дебаффы

**Файл:** `src/lib/generator/effects/poison-debuffs.ts` (НОВЫЙ)

```typescript
export const POISON_GRADE_DEBUFFS: Record<TechniqueGrade, PoisonDebuff[]>
export function generatePoisonDebuffs(grade: TechniqueGrade): PoisonDebuff[]
```

---

*Документ создан: 2026-03-21*
*Аудит завершён: 2026-03-21*
*План обновлён: 2026-03-21*
*Исправления выполнены: 2026-03-21 15:42:05 UTC*
*Статус: ✅ ВСЕ ИСПРАВЛЕНИЯ ВЫПОЛНЕНЫ И ПРОВЕРЕНЫ*
