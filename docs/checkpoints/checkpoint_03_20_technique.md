# 🔧 План внедрения: Система ёмкости техник

**Дата:** 2026-03-20 08:30 UTC
**Дата обновления:** 2026-03-20 11:30 UTC  
**Статус:** ✅ РЕАЛИЗАЦИЯ ЗАВЕРШЕНА

---

## 📋 ОБЗОР КОНЦЕПЦИИ

### Принятая модель:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     СИСТЕМА ЁМКОСТИ ТЕХНИК                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. БАЗОВОЕ ЦИ = qiCost × qiDensity                                         │
│     → Входящее Ци в "базовых единицах"                                       │
│     → qiDensity = 2^(cultivationLevel - 1)                                  │
│                                                                              │
│  2. ЁМКОСТЬ = baseCapacityByType × 2^(techniqueLevel - 1)                   │
│     → baseCapacity зависит от типа техники                                   │
│     → L1 техника = baseCapacity, L9 = baseCapacity × 256                    │
│                                                                              │
│  3. ДЕСТАБИЛИЗАЦИЯ при baseQi > capacity × 1.1                              │
│     → effectiveQi = min(baseQi, capacity)                                   │
│     → backlash = (excess × 0.5) урона себе                                  │
│                                                                              │
│  4. УРОН = effectiveQi × statMult × masteryMult × gradeMult                 │
│     → Урон в "базовых единицах Ци"                                          │
│     → БЕЗ повторного умножения на qiDensity!                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### BaseCapacity по типам:

| Группа | Типы | baseCapacity |
|--------|------|--------------|
| Максимальная | FM (formation) | 80 |
| Очень высокая | DF (defense) | 72 |
| Высокая | MS (melee_strike) | 64 |
| Повышенная | SP, HL | 56 |
| Средняя | MW (melee_weapon) | 48 |
| Ниже средней | MV, CR, PN | 40 |
| Низкая | RG, SN | 32 |
| Пассивная | CU (cultivation) | — |

---

## 🗺️ КАРТА ВНЕДРЕНИЯ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ЭТАПЫ ВНЕДРЕНИЯ                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ЭТАП 1: КОНСТАНТЫ И ТИПЫ                                                    │
│  ├─ 1.1 BASE_CAPACITY_BY_TYPE                                               │
│  ├─ 1.2 BASE_CAPACITY_BY_COMBAT_SUBTYPE                                     │
│  └─ 1.3 CULTIVATION_BONUS_BY_GRADE                                          │
│                                                                              │
│  ЭТАП 2: ГЕНЕРАТОРЫ                                                          │
│  ├─ 2.1 technique-generator.ts                                              │
│  ├─ 2.2 Удаление TECHNIQUE_BASE_DAMAGE                                      │
│  └─ 2.3 Добавление baseCapacity в генерацию                                 │
│                                                                              │
│  ЭТАП 3: РАСЧЁТ ЁМКОСТИ                                                      │
│  ├─ 3.1 calculateTechniqueCapacity()                                        │
│  ├─ 3.2 getBaseCapacity()                                                   │
│  └─ 3.3 isPassiveTechnique()                                                │
│                                                                              │
│  ЭТАП 4: БОЕВАЯ СИСТЕМА                                                      │
│  ├─ 4.1 baseQiInput = qiCost × qiDensity                                    │
│  ├─ 4.2 checkDestabilization(baseQiInput, capacity)                         │
│  └─ 4.3 damage = effectiveQi (БЕЗ × qiDensity)                              │
│                                                                              │
│  ЭТАП 5: СПЕЦИАЛЬНЫЕ МЕХАНИКИ                                               │
│  ├─ 5.1 Defense: щиты с подпиткой                                           │
│  ├─ 5.2 Cultivation: бонусы к поглощению                                    │
│  └─ 5.3 Formation: отдельный анализ                                         │
│                                                                              │
│  ЭТАП 6: UI И ОТОБРАЖЕНИЕ                                                    │
│  ├─ 6.1 Отображение capacity в UI                                           │
│  ├─ 6.2 Предупреждение о дестабилизации                                     │
│  └─ 6.3 Визуализация эффективного Ци                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 ЭТАП 1: КОНСТАНТЫ И ТИПЫ

### Файл: `src/lib/constants/technique-capacity.ts` (НОВЫЙ)

```typescript
// ==================== ТИПЫ ====================

export type TechniqueType = 
  | 'combat' | 'defense' | 'cultivation' | 'support'
  | 'movement' | 'sensory' | 'healing' | 'curse' | 'poison' | 'formation';

export type CombatSubtype = 
  | 'melee_strike' | 'melee_weapon'
  | 'ranged_projectile' | 'ranged_beam' | 'ranged_aoe';

export type TechniqueGrade = 'common' | 'refined' | 'perfect' | 'transcendent';

// ==================== BASE CAPACITY ====================

/**
 * Базовая ёмкость техники по типу
 * CU (cultivation) — особый случай, не использует capacity!
 */
export const BASE_CAPACITY_BY_TYPE: Record<TechniqueType, number | null> = {
  combat: 48,       // Базовое, переопределяется по подтипу
  formation: 80,    // Максимальная — долгая установка
  defense: 72,      // Очень высокая — резервуар для блокирования
  cultivation: null, // Пассивная — не использует capacity
  support: 56,      // Повышенная — мягкое воздействие
  healing: 56,      // Повышенная — мягкое воздействие
  movement: 40,     // Ниже средней — выталкивание тела
  curse: 40,        // Ниже средней — пробитие защиты
  poison: 40,       // Ниже средней — скрытое внедрение
  sensory: 32,      // Низкая — расхождение веером
};

/**
 * Базовая ёмкость для подтипов атакующих техник
 */
export const BASE_CAPACITY_BY_COMBAT_SUBTYPE: Record<CombatSubtype, number> = {
  melee_strike: 64,      // Высокая — Ци в теле
  melee_weapon: 48,      // Средняя — через оружие
  ranged_projectile: 32, // Низкая — снаряд летит
  ranged_beam: 32,       // Низкая — луч рассеивается
  ranged_aoe: 32,        // Низкая — область
};

// ==================== CULTIVATION BONUSES ====================

/**
 * Параметры техники культивации по Grade
 */
export const CULTIVATION_BONUS_BY_GRADE: Record<TechniqueGrade, {
  qiBonus: number;        // +% к скорости поглощения
  gradient: number;       // Множитель градиента
  unnoticeability: number; // -% к прерыванию
}> = {
  common: { qiBonus: 0.10, gradient: 1.0, unnoticeability: 0.05 },
  refined: { qiBonus: 0.20, gradient: 1.2, unnoticeability: 0.10 },
  perfect: { qiBonus: 0.35, gradient: 1.5, unnoticeability: 0.15 },
  transcendent: { qiBonus: 0.50, gradient: 2.0, unnoticeability: 0.25 },
};

// ==================== DEFENSE (SHIELD) ====================

/**
 * Скорость истончения щита от времени
 */
export const SHIELD_DECAY_RATE = 0.002; // 0.2% от maxCapacity за ход

/**
 * Подпитка щита от проводимости по Grade
 * Проценты считаются ОТ conductivity × qiDensity
 */
export const SHIELD_SUSTAIN_BY_GRADE: Record<TechniqueGrade, number> = {
  common: 0,          // Нет подпитки
  refined: 0.10,      // 10% от conductivity × qiDensity
  perfect: 0.20,      // 20% от conductivity × qiDensity
  transcendent: 0.35, // 35% от conductivity × qiDensity
};

// ==================== QI DENSITY ====================

/**
 * Плотность Ци по уровню культивации
 * qiDensity = 2^(cultivationLevel - 1)
 */
export function calculateQiDensity(cultivationLevel: number): number {
  return Math.pow(2, cultivationLevel - 1);
}

// ==================== CAPACITY CALCULATION ====================

/**
 * Получить базовую ёмкость для техники
 * Возвращает null для пассивных техник (cultivation)
 */
export function getBaseCapacity(
  type: TechniqueType,
  combatSubtype?: CombatSubtype
): number | null {
  // Культивация — пассивная техника
  if (type === 'cultivation') {
    return null;
  }
  
  // Для атакующих техник — по подтипу
  if (type === 'combat' && combatSubtype) {
    return BASE_CAPACITY_BY_COMBAT_SUBTYPE[combatSubtype] || 48;
  }
  
  return BASE_CAPACITY_BY_TYPE[type] || 48;
}

/**
 * Проверить, является ли техника пассивной
 */
export function isPassiveTechnique(type: TechniqueType): boolean {
  return type === 'cultivation';
}

/**
 * Рассчитать полную ёмкость техники
 */
export function calculateTechniqueCapacity(
  type: TechniqueType,
  level: number,
  mastery: number,
  combatSubtype?: CombatSubtype
): number | null {
  const baseCapacity = getBaseCapacity(type, combatSubtype);
  
  if (baseCapacity === null) {
    return null; // Пассивная техника
  }
  
  const levelMultiplier = Math.pow(2, level - 1);
  const masteryBonus = 1 + (mastery / 100) * 0.5; // +50% при 100% mastery
  
  return Math.floor(baseCapacity * levelMultiplier * masteryBonus);
}
```

---

## 📦 ЭТАП 2: ГЕНЕРАТОРЫ

### Файл: `src/lib/generator/technique-generator.ts`

#### 2.1 Удалить:

```typescript
// УДАЛИТЬ:
export const TECHNIQUE_BASE_DAMAGE: Record<number, number> = {
  1: 10, 2: 15, 3: 22, 4: 33, 5: 50,
  6: 75, 7: 112, 8: 168, 9: 250,
};
```

#### 2.2 Добавить в генерацию:

```typescript
import { 
  getBaseCapacity, 
  calculateTechniqueCapacity,
  isPassiveTechnique,
  CULTIVATION_BONUS_BY_GRADE
} from '@/lib/constants/technique-capacity';

function generateTechnique(params: TechniqueGenParams): Technique {
  // ... существующий код ...
  
  // Рассчитать baseCapacity
  const baseCapacity = getBaseCapacity(params.type, params.combatSubtype);
  
  // Для культивации — добавить бонусы
  if (params.type === 'cultivation') {
    const gradeBonuses = CULTIVATION_BONUS_BY_GRADE[params.grade];
    technique.qiAbsorptionBonus = gradeBonuses.qiBonus;
    technique.gradientStrength = gradeBonuses.gradient;
    technique.unnoticeabilityBonus = gradeBonuses.unnoticeability;
  }
  
  // Добавить baseCapacity в технику (для UI)
  technique.baseCapacity = baseCapacity;
  
  return technique;
}
```

---

## 📦 ЭТАП 3: РАСЧЁТ ЁМКОСТИ

### Файл: `src/lib/game/techniques.ts`

#### Обновить функцию:

```typescript
import { calculateTechniqueCapacity, calculateQiDensity } from '@/lib/constants/technique-capacity';

/**
 * Проверка дестабилизации с учётом базового Ци
 */
export function checkDestabilizationWithBaseQi(
  qiCost: number,           // Ци практики (в "игровых единицах")
  qiDensity: number,        // Плотность Ци практика
  capacity: number          // Ёмкость техники
): DestabilizationResult {
  // Ключевое изменение: baseQiInput вместо qiCost
  const baseQiInput = qiCost * qiDensity;
  
  const safeLimit = capacity * 1.1;
  
  if (baseQiInput <= safeLimit) {
    return {
      isDestabilized: false,
      effectiveQi: baseQiInput,
      efficiency: 1.0,
    };
  }
  
  const excessQi = baseQiInput - capacity;
  return {
    isDestabilized: true,
    effectiveQi: capacity,
    efficiency: capacity / baseQiInput,
    backlashDamage: Math.floor(excessQi * 0.5),
    backlashQiLoss: excessQi,
  };
}
```

---

## 📦 ЭТАП 4: БОЕВАЯ СИСТЕМА

### Файл: `src/lib/game/event-bus/handlers/combat.ts`

#### Обновить расчёт:

```typescript
// В handleTechniqueUse():

// 6.1. Рассчитать qiDensity практика
const qiDensity = calculateQiDensity(actor.cultivationLevel);

// 6.2. Рассчитать ёмкость техники
const capacity = calculateTechniqueCapacity(
  technique.type,
  technique.level,
  characterTechnique.mastery,
  technique.subtype as CombatSubtype
);

// 6.3. Для пассивных техник — другая логика
if (capacity === null) {
  // Cultivation: не используется в бою напрямую
  return { success: false, error: 'Пассивная техника' };
}

// 6.4. Проверка дестабилизации с базовым Ци
const stability = checkDestabilizationWithBaseQi(
  qiCost,
  qiDensity,
  capacity
);

// 6.5. Урон = эффективное базовое Ци
// ВАЖНО: НЕ умножаем на qiDensity — effectiveQi уже в базовых единицах!
const baseDamage = stability.effectiveQi;
const finalDamage = baseDamage * statMult * masteryMult * gradeMult;

// 6.6. Backlash при дестабилизации
if (stability.isDestabilized) {
  // Нанести урон себе
  actor.health -= stability.backlashDamage;
}
```

---

## 📦 ЭТАП 5: СПЕЦИАЛЬНЫЕ МЕХАНИКИ

### 5.1 Defense (щиты)

**Файл:** `src/lib/game/mechanics/shield.ts` (НОВЫЙ)

```typescript
import { SHIELD_DECAY_RATE, SHIELD_SUSTAIN_BY_GRADE } from '@/lib/constants/technique-capacity';

export interface ShieldState {
  id: string;
  techniqueId: string;
  
  currentCapacity: number;
  maxCapacity: number;
  
  grade: TechniqueGrade;
  isActive: boolean;
}

export function updateShieldPerTurn(
  shield: ShieldState,
  conductivity: number,
  qiDensity: number
): ShieldState {
  // Истончение от времени
  const decayLoss = shield.maxCapacity * SHIELD_DECAY_RATE;
  
  // Подпитка от проводимости
  const sustainPercent = SHIELD_SUSTAIN_BY_GRADE[shield.grade];
  const sustainAmount = conductivity * qiDensity * sustainPercent;
  
  // Итоговое изменение
  shield.currentCapacity = Math.min(
    shield.maxCapacity,
    Math.max(0, shield.currentCapacity - decayLoss + sustainAmount)
  );
  
  shield.isActive = shield.currentCapacity > 0;
  
  return shield;
}

export function applyDamageToShield(
  shield: ShieldState,
  damage: number
): { blocked: number; passed: number; shieldBroken: boolean } {
  const blocked = Math.min(shield.currentCapacity, damage);
  shield.currentCapacity -= blocked;
  
  return {
    blocked,
    passed: damage - blocked,
    shieldBroken: shield.currentCapacity <= 0,
  };
}
```

### 5.2 Cultivation (поглощение Ци)

**Файл:** `src/lib/game/mechanics/cultivation.ts` (НОВЫЙ)

```typescript
import { CULTIVATION_BONUS_BY_GRADE, calculateQiDensity } from '@/lib/constants/technique-capacity';

export interface CultivationState {
  techniqueId: string;
  grade: TechniqueGrade;
  qiAbsorptionBonus: number;
  gradientStrength: number;
  unnoticeabilityBonus: number;
}

export function calculateQiAbsorption(
  baseRate: number,           // Базовая скорость от ядра
  technique: CultivationState,
  environmentalQi: number     // Ци в окружающей среде
): number {
  const gradeBonuses = CULTIVATION_BONUS_BY_GRADE[technique.grade];
  
  // Базовое поглощение
  const baseAbsorption = baseRate * (1 + technique.qiAbsorptionBonus);
  
  // Бонус от градиента
  const gradientBonus = environmentalQi * technique.gradientStrength * gradeBonuses.gradient;
  
  return baseAbsorption + gradientBonus;
}

export function calculateInterruptionChance(
  baseChance: number,
  technique: CultivationState
): number {
  const gradeBonuses = CULTIVATION_BONUS_BY_GRADE[technique.grade];
  return Math.max(0, baseChance - technique.unnoticeabilityBonus);
}
```

### 5.3 Formation

**Отдельный анализ:** `docs/checkpoints/formation_analysis.md`

**НЕ включён в текущий план внедрения.**

---

## 📦 ЭТАП 6: UI И ОТОБРАЖЕНИЕ

### 6.1 Отображение capacity

**Компонент:** `TechniqueDetailDialog.tsx`

```tsx
// Добавить отображение:
<div className="capacity-info">
  <span>Ёмкость: {technique.baseCapacity || 'Пассивная'}</span>
  {technique.baseCapacity && (
    <span>При L{technique.level}: {calculateTechniqueCapacity(...)} баз. Ци</span>
  )}
</div>
```

### 6.2 Предупреждение о дестабилизации

**В UI использования техники:**

```tsx
// Проверить перед использованием
const qiDensity = calculateQiDensity(character.cultivationLevel);
const baseQiInput = selectedQiCost * qiDensity;
const capacity = calculateTechniqueCapacity(...);

if (baseQiInput > capacity * 1.1) {
  showWarning('Дестабилизация! Щёлкните для снижения Ци.');
}
```

---

## 📊 ТАБЛИЦА ЗАДАЧ

| # | Этап | Задача | Приоритет | Статус |
|---|------|--------|-----------|--------|
| 1.1 | Константы | Создать technique-capacity.ts | 🔴 КРИТИЧНО | ⏳ |
| 1.2 | Константы | BASE_CAPACITY_BY_TYPE | 🔴 КРИТИЧНО | ⏳ |
| 1.3 | Константы | BASE_CAPACITY_BY_COMBAT_SUBTYPE | 🔴 КРИТИЧНО | ⏳ |
| 1.4 | Константы | CULTIVATION_BONUS_BY_GRADE | 🟡 ВАЖНО | ⏳ |
| 1.5 | Константы | SHIELD_SUSTAIN_BY_GRADE | 🟡 ВАЖНО | ⏳ |
| 2.1 | Генераторы | Удалить TECHNIQUE_BASE_DAMAGE | 🔴 КРИТИЧНО | ⏳ |
| 2.2 | Генераторы | Добавить baseCapacity в генерацию | 🔴 КРИТИЧНО | ⏳ |
| 2.3 | Генераторы | Добавить бонусы культивации | 🟡 ВАЖНО | ⏳ |
| 3.1 | Расчёт | calculateTechniqueCapacity() | 🔴 КРИТИЧНО | ⏳ |
| 3.2 | Расчёт | getBaseCapacity() | 🔴 КРИТИЧНО | ⏳ |
| 3.3 | Расчёт | isPassiveTechnique() | 🟡 ВАЖНО | ⏳ |
| 4.1 | Боевая | baseQiInput = qiCost × qiDensity | 🔴 КРИТИЧНО | ⏳ |
| 4.2 | Боевая | checkDestabilizationWithBaseQi() | 🔴 КРИТИЧНО | ⏳ |
| 4.3 | Боевая | damage = effectiveQi (БЕЗ × qiDensity) | 🔴 КРИТИЧНО | ⏳ |
| 5.1 | Спец.мех. | Shield mechanics | 🟡 ВАЖНО | ⏳ |
| 5.2 | Спец.мех. | Cultivation bonuses | 🟡 ВАЖНО | ⏳ |
| 5.3 | Спец.мех. | Formation (отдельно) | 🔵 БУДУЩЕЕ | ⏳ |
| 6.1 | UI | Отображение capacity | 🟢 ЖЕЛАТЕЛЬНО | ⏳ |
| 6.2 | UI | Предупреждение дестабилизации | 🟢 ЖЕЛАТЕЛЬНО | ⏳ |

---

## 📚 ССЫЛКИ

- **Итоговый анализ:** `docs/checkpoints/technique_damage_analysis.md`
- **Анализ формаций:** `docs/checkpoints/formation_analysis.md`
- **Система техник v2:** `docs/technique-system-v2.md`

---

## ⚠️ ОТЛОЖЕНО (Formation)

Формации требуют отдельной проработки:

1. Три типа ёмкости (creation, activation, formation)
2. Деградация формаций
3. Жизненный цикл формации

**См.:** `docs/checkpoints/formation_analysis.md`

---

*План создан: 2026-03-20 08:30 UTC*
*Статус: ТЕОРЕТИЧЕСКОЕ ПЛАНИРОВАНИЕ*
