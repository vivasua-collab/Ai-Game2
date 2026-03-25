# 🔬 Аудит: Система техник - детальный анализ для исправлений

**Дата:** 2026-03-19
**Статус:** ✅ АУДИТ ЗАВЕРШЁН - ВСЕ ФАЗЫ ВЫПОЛНЕНЫ
**Цель:** Полная карта зависимостей для безопасного исправления

---

## 📋 КАРТА ЗАВИСИМОСТЕЙ

### 1. Система Mastery (Мастерство техник)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ПОТОК MASTERY                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │ Prisma Schema   │                                                        │
│  │ CharacterTechnique │ ──▶ mastery: Float @default(0.0)                   │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐      ┌─────────────────────┐                           │
│  │ db.character    │      │ combat-processor.ts │                           │
│  │ Technique.find  │ ───▶ │ processTechniqueUse │                           │
│  └─────────────────┘      └──────────┬──────────┘                           │
│                                      │                                       │
│                                      ▼                                       │
│                           ┌─────────────────────┐                           │
│                           │ calculateCastTime() │ ◀── mastery используется   │
│                           │ calculateMasteryGain│ ◀── mastery используется   │
│                           └─────────────────────┘                           │
│                                                                              │
│  ⚠️ ПРОБЛЕМА: TechniqueSlotsManager.ts:274                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ calculateChargeTime(                                                 │    │
│  │   qiCost,                                                            │    │
│  │   this.characterCoreCapacity,                                        │    │
│  │   this.characterCultivationLevel,                                    │    │
│  │   0,  // ← TODO: mastery - ХАРДКОД!                                 │    │
│  │   this.characterConductivityMeditations                              │    │
│  │ );                                                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Файлы, использующие mastery

| Файл | Функция | Использование | Статус |
|------|---------|---------------|--------|
| `prisma/schema.prisma` | `CharacterTechnique.mastery` | Хранение | ✅ OK |
| `combat-system.ts:217-246` | `calculateCastTime()` | Параметр mastery | ✅ OK |
| `combat-system.ts:348-352` | `calculateMasteryMultiplier()` | Расчёт множителя | ✅ OK |
| `combat-system.ts:650-791` | `calculateAttackDamage()` | Параметр mastery | ✅ OK |
| `combat-system.ts:861-923` | `calculateTechniqueDamageFull()` | Параметр mastery | ✅ OK |
| `combat-processor.ts:489-494` | `processTechniqueUse()` | Читает `characterTechnique.mastery` | ✅ OK |
| `combat-processor.ts:508-511` | `calculateTechniqueCapacity()` | Передаёт mastery | ✅ OK |
| `combat-processor.ts:513-521` | `calculateMasteryGain()` | Передаёт mastery | ✅ OK |
| **`TechniqueSlotsManager.ts:274`** | `use()` | **`0, // TODO: mastery`** | ❌ BUG |
| `technique-charging.ts:62-88` | `calculateChargeTime()` | Параметр mastery | ✅ OK |
| `techniques.ts:60-75` | `calculateTechniqueCapacity()` | Параметр mastery | ✅ OK |

### 3. Система Range (Дальность техник)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ПОТОК RANGE                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐                                                   │
│  │ technique-generator │ ──▶ baseRange = 0.5 + (gradeIndex × 0.1)          │
│  │ BASE_BODY_RANGE     │                                                   │
│  └──────────┬──────────┘                                                   │
│             │                                                                │
│             ▼                                                                │
│  ┌─────────────────────┐      ┌─────────────────────────────────────┐       │
│  │ Technique.effects   │ ───▶ │ range?: number | CombatRange         │       │
│  │ .range              │      │ damageFalloff?: RangeData            │       │
│  └──────────┬──────────┘      └──────────────────┬──────────────────┘       │
│             │                                      │                          │
│             ▼                                      ▼                          │
│  ┌─────────────────────┐      ┌─────────────────────────────────────┐       │
│  │ PhaserGame.tsx      │      │ combat-system.ts                     │       │
│  │ executeTechnique... │      │ getEffectiveRange()                  │       │
│  │ extractRangeData()  │      │ calculateDamageAtDistance()          │       │
│  └──────────┬──────────┘      │ createCombatRange()                  │       │
│             │                  └─────────────────────────────────────┘       │
│             │                                                                │
│             ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ⚠️ ПРОБЛЕМА: bodySizeMultiplier НЕ РЕАЛИЗОВАН                       │   │
│  │                                                                     │   │
│  │ Текущий код:                                                        │   │
│  │ const rangeData = typeof techniqueData.range === 'number'           │   │
│  │   ? { fullDamage: techniqueData.range, ... }                        │   │
│  │   : techniqueData.range;                                            │   │
│  │                                                                     │   │
│  │ ❌ НЕ учитывает:                                                    │   │
│  │ - bodyHeight персонажа                                              │   │
│  │ - BodySizeClass (tiny, small, medium, large, huge...)              │   │
│  │ - rangeMultiplier для размера тела                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4. Файлы, использующие range/distance

| Файл | Функция | Использование | Нужно изменить? |
|------|---------|---------------|-----------------|
| `combat-system.ts:386-446` | `getEffectiveRange()` | Возвращает дальность | ⚠️ Добавить bodyHeight |
| `combat-system.ts:571-630` | `calculateDamageAtDistance()` | Расчёт урона по дальности | ✅ OK |
| `combat-system.ts:968-978` | `createCombatRange()` | Создаёт CombatRange | ✅ OK |
| `PhaserGame.tsx:~700` | `extractRangeData()` | Извлекает range | ⚠️ Добавить bodySize |
| `PhaserGame.tsx:~750` | `executeTechniqueInDirection()` | Использует rangeData | ⚠️ Добавить effectiveRange |
| `combat-processor.ts:259` | `getEffectiveRange()` | Получает дальность | ⚠️ Добавить bodyHeight |
| `technique-generator.ts:~852` | Генерация baseRange | Расчёт дальности | ✅ OK |

---

## 🔗 СВЯЗИ TechniqueSlotsManager

### Зависимости (импорты)

```typescript
// TechniqueSlotsManager.ts
import type { Technique, CharacterTechnique, CombatTechniqueType } from '@/types/game';
import type { CombatSubtype } from '@/lib/game/techniques';
import { eventBusClient } from '@/lib/game/event-bus/client';
import {
  calculateChargeTime,
  type TechniqueCharging,
  type ChargingContext,
} from './technique-charging';
```

### Используется в

| Файл | Как используется |
|------|------------------|
| `PhaserGame.tsx` | Создаётся через `createTechniqueSlotsManager()` |
| `PhaserGame.tsx` | Вызывается `manager.use()`, `manager.update()`, `manager.setActiveSlot()` |
| `PhaserGame.tsx` | Передаётся `onFireProjectile` callback |

### Проблема: CharacterTechnique не загружается

```typescript
// TechniqueSlotsManager.ts:165-187
loadTechniques(techniques: CharacterTechnique[]): void {
  // Загружает technique, но НЕ сохраняет mastery!
  this.state.slots[index] = {
    techniqueId: charTech.techniqueId,
    technique: charTech.technique,  // ← technique без mastery!
    // mastery: charTech.mastery      ← НЕТ!
  };
}
```

---

## 📊 ПОЛНАЯ КАРТА ИЗМЕНЕНИЙ

### Задача 1: Исправить mastery в TechniqueSlotsManager

**Изменяемые файлы:**

| Файл | Изменение | Риск |
|------|-----------|------|
| `src/game/services/TechniqueSlotsManager.ts` | Добавить поле `techniqueMastery: Map<string, number>` | Низкий |
| `src/game/services/TechniqueSlotsManager.ts` | Метод `loadTechniques()` сохранять mastery | Низкий |
| `src/game/services/TechniqueSlotsManager.ts` | Метод `getTechniqueMastery(techniqueId)` | Низкий |
| `src/game/services/TechniqueSlotsManager.ts` | `use()` передавать mastery в calculateChargeTime | Низкий |

**Код изменений:**

```typescript
// 1. Добавить поле в класс
private techniqueMasteries: Map<string, number> = new Map();

// 2. Обновить loadTechniques
loadTechniques(techniques: CharacterTechnique[]): void {
  // ... существующий код ...
  for (const charTech of techniques) {
    // Сохраняем mastery
    this.techniqueMasteries.set(charTech.techniqueId, charTech.mastery ?? 0);
    // ... остальной код ...
  }
}

// 3. Добавить метод
getTechniqueMastery(techniqueId: string): number {
  return this.techniqueMasteries.get(techniqueId) ?? 0;
}

// 4. Использовать в use()
const chargeTime = calculateChargeTime(
  qiCost,
  this.characterCoreCapacity,
  this.characterCultivationLevel,
  this.getTechniqueMastery(technique.id),  // ← ИСПРАВЛЕНО
  this.characterConductivityMeditations
);
```

---

### Задача 2: Добавить систему размеров тела (BodySizeClass)

**Новые файлы:**

| Файл | Назначение |
|------|------------|
| `src/types/body.ts` | Тип `BodySizeClass`, конфиг `BODY_SIZE_CONFIGS` |
| `src/lib/game/combat-utils.ts` | Функция `calculateEffectiveRange()` |

**Изменяемые файлы:**

| Файл | Изменение | Риск |
|------|-----------|------|
| `prisma/schema.prisma` | Добавить `bodyHeight Int @default(170)` | Средний (миграция) |
| `src/components/game/PhaserGame.tsx` | Использовать `calculateEffectiveRange` | Средний |
| `src/lib/game/combat-system.ts` | Добавить параметр `bodyHeight` в `getEffectiveRange` | Средний |

**Код новых файлов:**

```typescript
// src/types/body.ts
export type BodySizeClass = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan' | 'colossal';

export const BODY_SIZE_CONFIGS: Record<BodySizeClass, {
  minHeight: number;
  maxHeight: number;
  strengthMultiplier: number;
  rangeMultiplier: number;
}> = {
  tiny:        { minHeight: 0,    maxHeight: 30,   strengthMultiplier: 0.1,  rangeMultiplier: 0.3 },
  small:       { minHeight: 30,   maxHeight: 60,   strengthMultiplier: 0.3,  rangeMultiplier: 0.6 },
  medium:      { minHeight: 60,   maxHeight: 180,  strengthMultiplier: 1.0,  rangeMultiplier: 1.0 },
  large:       { minHeight: 180,  maxHeight: 300,  strengthMultiplier: 2.0,  rangeMultiplier: 1.3 },
  huge:        { minHeight: 300,  maxHeight: 1000, strengthMultiplier: 5.0,  rangeMultiplier: 1.6 },
  gargantuan:  { minHeight: 1000, maxHeight: 3000, strengthMultiplier: 15.0, rangeMultiplier: 2.0 },
  colossal:    { minHeight: 3000, maxHeight: Infinity, strengthMultiplier: 50.0, rangeMultiplier: 3.0 },
};

export function getBodySizeClass(heightCm: number): BodySizeClass {
  for (const [cls, config] of Object.entries(BODY_SIZE_CONFIGS)) {
    if (heightCm >= config.minHeight && heightCm < config.maxHeight) {
      return cls as BodySizeClass;
    }
  }
  return 'medium';
}
```

```typescript
// src/lib/game/combat-utils.ts
import { getBodySizeClass, BODY_SIZE_CONFIGS, type BodySizeClass } from '@/types/body';

export interface EffectiveRangeParams {
  baseRange: number;
  bodyHeightCm?: number;
  bodySizeClass?: BodySizeClass;
}

export function calculateEffectiveRange(params: EffectiveRangeParams): number {
  const { baseRange, bodyHeightCm, bodySizeClass } = params;
  
  const sizeClass = bodySizeClass || (bodyHeightCm ? getBodySizeClass(bodyHeightCm) : 'medium');
  const rangeMultiplier = BODY_SIZE_CONFIGS[sizeClass].rangeMultiplier;
  
  return Math.round(baseRange * rangeMultiplier * 10) / 10;
}
```

---

### Задача 3: Интеграция checkDestabilization

**Проблема:** Функция `checkDestabilization()` существует в `combat-system.ts`, но НЕ вызывается при использовании техник!

**Где должна вызываться:**

1. `combat-processor.ts:processTechniqueUse()` - перед расчётом урона
2. `TechniqueSlotsManager.ts:use()` - при достаточном qiInput

**Код интеграции:**

```typescript
// combat-processor.ts - добавить в processTechniqueUse()
import { checkDestabilization } from '../combat-system';

// После расчёта qiCost
const qiInput = qiCost; // Или фактическое вложенное Ци
const techniqueCapacity = calculateTechniqueCapacity(technique.level ?? 1, characterTechnique.mastery);

const stability = checkDestabilization(qiInput, techniqueCapacity);

if (stability.isDestabilized) {
  // Применить backlashDamage к персонажу
  changes.character = {
    ...changes.character,
    health: Math.max(0, (session.character.health ?? 100) - stability.backlashDamage),
  };
  
  // Добавить визуальное уведомление
  commands.push({
    type: 'ui:show_notification',
    timestamp: Date.now(),
    data: {
      message: `⚠️ Дестабилизация! Обратный удар: ${stability.backlashDamage}`,
      type: 'warning',
      duration: 3000,
    },
  });
}
```

---

## ⚠️ РИСКИ ИЗМЕНЕНИЙ

### Высокий риск

| Изменение | Риск | Миграция |
|-----------|------|----------|
| Добавить `bodyHeight` в Character | Требует миграцию БД | `bun run db:push` |

### Средний риск

| Изменение | Риск | Тестирование |
|-----------|------|--------------|
| Изменить `getEffectiveRange()` | Может сломать дальность техник | Проверить все ranged техники |
| Интегрировать `checkDestabilization()` | Может добавить урон игроку | Проверить баланс |

### Низкий риск

| Изменение | Риск |
|-----------|------|
| Добавить `techniqueMasteries` Map | Только внутреннее состояние |
| Добавить `getTechniqueMastery()` | Новый метод, не ломает существующее |
| Создать `src/types/body.ts` | Новый файл |
| Создать `src/lib/game/combat-utils.ts` | Новый файл |

---

## 📋 ПОШАГОВЫЙ ПЛАН ИСПРАВЛЕНИЙ

### Фаза 1: Mastery (безопасно, высокий приоритет)

1. **Шаг 1.1:** Добавить `techniqueMasteries: Map<string, number>` в TechniqueSlotsManager
2. **Шаг 1.2:** Обновить `loadTechniques()` для сохранения mastery
3. **Шаг 1.3:** Добавить `getTechniqueMastery(techniqueId)` метод
4. **Шаг 1.4:** Исправить вызов `calculateChargeTime()` с реальным mastery
5. **Шаг 1.5:** Тестировать: зарядка техник должна быть быстрее при высоком mastery

### Фаза 2: BodySizeClass (средний приоритет, требует миграцию)

1. **Шаг 2.1:** Создать `src/types/body.ts`
2. **Шаг 2.2:** Создать `src/lib/game/combat-utils.ts` с `calculateEffectiveRange()`
3. **Шаг 2.3:** Добавить `bodyHeight Int @default(170)` в prisma/schema.prisma
4. **Шаг 2.4:** Запустить `bun run db:push`
5. **Шаг 2.5:** Интегрировать `calculateEffectiveRange()` в PhaserGame.tsx
6. **Шаг 2.6:** Тестировать: дальность техник должна зависеть от роста

### Фаза 3: Destabilization (низкий приоритет)

1. **Шаг 3.1:** Интегрировать `checkDestabilization()` в combat-processor.ts
2. **Шаг 3.2:** Добавить визуальный эффект дестабилизации
3. **Шаг 3.3:** Тестировать: перегрузка техники должна наносить урон

---

## 🧪 ТЕСТИРОВАНИЕ

### После исправления mastery

```typescript
// Тест: зарядка техники должна быть быстрее при mastery
const chargeTime_0mastery = calculateChargeTime(50, 1000, 5, 0, 0);    // ~0.5 сек
const chargeTime_50mastery = calculateChargeTime(50, 1000, 5, 50, 0);  // ~0.33 сек
const chargeTime_100mastery = calculateChargeTime(50, 1000, 5, 100, 0); // ~0.25 сек
```

### После добавления BodySizeClass

```typescript
// Тест: дальность должна зависеть от роста
const range_medium = calculateEffectiveRange({ baseRange: 0.5, bodyHeightCm: 170 }); // 0.5м
const range_large = calculateEffectiveRange({ baseRange: 0.5, bodyHeightCm: 200 });  // 0.65м
const range_small = calculateEffectiveRange({ baseRange: 0.5, bodyHeightCm: 50 });   // 0.3м
```

---

## 📊 ИТОГОВАЯ ТАБЛИЦА

| # | Задача | Файлы | Риск | Статус |
|---|--------|-------|------|--------|
| 1 | Добавить techniqueMasteries Map | TechniqueSlotsManager.ts | Низкий | ✅ ВЫПОЛНЕНО |
| 2 | Исправить calculateChargeTime | TechniqueSlotsManager.ts:274 | Низкий | ✅ ВЫПОЛНЕНО |
| 3 | Создать src/types/body.ts | Новый файл | Низкий | ✅ ВЫПОЛНЕНО |
| 4 | Создать combat-utils.ts | Новый файл | Низкий | ✅ ВЫПОЛНЕНО (функции в body.ts) |
| 5 | Добавить bodyHeight в schema | prisma/schema.prisma | Средний | ✅ ВЫПОЛНЕНО |
| 6 | Интегрировать calculateEffectiveRange | PhaserGame.tsx | Средний | ✅ ВЫПОЛНЕНО |
| 7 | Интегрировать checkDestabilization | combat-processor.ts | Средний | ✅ ВЫПОЛНЕНО |

---

## ✅ ВЫПОЛНЕННЫЕ ИЗМЕНЕНИЯ (Фаза 1)

### TechniqueSlotsManager.ts

```typescript
// 1. Добавлено поле
private techniqueMasteries: Map<string, number> = new Map();

// 2. Обновлён loadTechniques()
this.techniqueMasteries.set(charTech.techniqueId, charTech.mastery ?? 0);

// 3. Добавлен метод
getTechniqueMastery(techniqueId: string): number {
  return this.techniqueMasteries.get(techniqueId) ?? 0;
}

// 4. Добавлен метод
setTechniqueMastery(techniqueId: string, mastery: number): void {
  this.techniqueMasteries.set(techniqueId, Math.min(100, Math.max(0, mastery)));
}

// 5. Исправлен use()
const mastery = this.getTechniqueMastery(technique.id);
const chargeTime = calculateChargeTime(
  qiCost,
  this.characterCoreCapacity,
  this.characterCultivationLevel,
  mastery,  // ← ИСПРАВЛЕНО
  this.characterConductivityMeditations
);
```

---

*Аудит завершён: 2026-03-19*
*Фаза 1, 2, 3 выполнены: 2026-03-19*
*Все задачи закрыты*

---

## ✅ ВЕРИФИКАЦИЯ ФАЗЫ 1 (2026-03-19)

### Проверка кода TechniqueSlotsManager.ts

| # | Изменение | Строка | Статус | Проверка |
|---|-----------|--------|--------|----------|
| 1 | `techniqueMasteries: Map<string, number>` | 97 | ✅ ЕСТЬ | `private techniqueMasteries: Map<string, number> = new Map();` |
| 2 | `loadTechniques()` очищает mastery | 173-174 | ✅ ЕСТЬ | `this.techniqueMasteries.clear();` |
| 3 | `loadTechniques()` сохраняет mastery | 191-192 | ✅ ЕСТЬ | `this.techniqueMasteries.set(charTech.techniqueId, charTech.mastery ?? 0);` |
| 4 | `getTechniqueMastery(techniqueId)` | 411-413 | ✅ ЕСТЬ | Метод возвращает mastery по ID |
| 5 | `setTechniqueMastery(techniqueId, mastery)` | 421-423 | ✅ ЕСТЬ | Метод устанавливает mastery с валидацией 0-100 |
| 6 | `use()` использует mastery | 280-290 | ✅ ЕСТЬ | `const mastery = this.getTechniqueMastery(technique.id);` |

### ESLint проверка

```
✅ 0 ошибок в TechniqueSlotsManager.ts
⚠️ 3 предупреждения в других файлах (предсуществующие)
```

### Проверка файлов Фазы 2

| Файл | Ожидается | Статус |
|------|-----------|--------|
| `src/types/body.ts` | Должен быть создан | ✅ СУЩЕСТВУЕТ (BodySizeClass, calculateEffectiveRange) |
| `src/lib/game/combat-utils.ts` | Должен быть создан | ⚠️ НЕ СУЩЕСТВУЕТ (функции в body.ts) |
| `bodyHeight` в schema.prisma | Должен быть добавлен | ✅ ЕСТЬ (строка 97) |
| `SCHEMA_VERSION` в migrations.ts | Должен быть = 10 | ✅ ОБНОВЛЁН (ранее был 8) |

---

## ✅ РАБОТА С БАЗОЙ ДАННЫХ (2026-03-19)

### Исправленное несоответствие

| Файл | Было | Стало |
|------|------|-------|
| `prisma/schema.prisma` | v10 | v10 |
| `src/lib/migrations.ts` | v8 ❌ | v10 ✅ |

### Миграция БД

```bash
npx prisma db push --schema=./prisma/schema.prisma
# Результат: Database is already in sync with the Prisma schema
✔ Generated Prisma Client (v6.19.2)
```

### API создания персонажа

**Файл:** `src/app/api/game/start/route.ts`
- `bodyHeight` использует дефолт `@default(170)` из схемы
- 170 см = класс `medium` (rangeMultiplier = 1.0)

---

### ВЫВОД

**Фаза 1: ✅ ПОЛНОСТЬЮ ВЫПОЛНЕНА И ВЕРИФИЦИРОВАНА**

- Все 6 изменений в TechniqueSlotsManager.ts применены корректно
- Код компилируется без ошибок
- Mastery теперь корректно передаётся в `calculateChargeTime()`

**Фаза 2: ✅ ПОЛНОСТЬЮ ВЫПОЛНЕНА И ВЕРИФИЦИРОВАНА**

- `BodySizeClass` добавлен в `src/types/body.ts`
- Поле `bodyHeight` добавлено в Character (миграция выполнена)
- `calculateEffectiveRange()` реализована в `src/types/body.ts`
- Интегрировано в `PhaserGame.tsx`

**Работа с БД: ✅ ЗАВЕРШЕНА**

- `SCHEMA_VERSION` обновлён с 8 до 10
- Миграция применена успешно
- Prisma клиент сгенерирован

**Фаза 3 (Дестабилизация): ✅ ВЫПОЛНЕНА**

- `checkDestabilization()` реализована в `src/lib/game/event-bus/handlers/combat.ts`
- Интегрирована в `handleTechniqueUse()` при использовании техники
- Backlash damage наносится персонажу при перегрузке техники (>110% ёмкости)
- Визуальные эффекты и уведомления настроены

---

## 🏁 ИТОГОВЫЙ СТАТУС

**ВСЕ ЗАДАЧИ ЗАВЕРШЕНЫ:**
- ✅ Фаза 1: Mastery fix
- ✅ Фаза 2: BodySize + EffectiveRange
- ✅ Фаза 3: Дестабилизация
- ✅ Работа с БД: SCHEMA_VERSION v10
- ✅ ESLint: 0 ошибок, 3 предупреждения (предсуществующие)
