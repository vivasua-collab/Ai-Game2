# 📋 TypeScript Stabilization Plan

**Дата:** 2026-03-16
**Статус:** 📋 План утверждён
**Источник:** checkpoint_03_15_review_2.md (Фаза 3, проблема #20)

---

## 📊 АНАЛИЗ ОШИБОК

### Общая статистика

**Команда:** `npx tsc --noEmit`
**Результат:** ~540 строк ошибок (150+ уникальных ошибок)

### Распределение по файлам

| Категория | Файлов | Ошибок | Приоритет |
|-----------|--------|--------|-----------|
| Bonus Registry | 1 | 39 | 🔴 Критичный |
| Combat System | 2 | 52 | 🟠 Высокий |
| Event Bus Handlers | 6 | 75+ | 🟠 Высокий |
| UI Components | 5 | 25+ | 🟡 Средний |
| API Routes | 10 | 40+ | 🟡 Средний |
| Generators | 4 | 15+ | 🟢 Низкий |
| Type Definitions | 3 | 20+ | 🔴 Критичный |

---

## 🔴 ФАЗА 1: КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ (P0)

### P0-1: BonusCategory — отсутствует 'qi'

**Файл:** `src/lib/data/bonus-registry-runtime.ts`
**Ошибок:** 15+

**Проблема:**
```typescript
// Текущее определение BonusCategory не включает 'qi'
type BonusCategory = 'physical' | 'mental' | 'spiritual' | ...;
// Но код использует:
bonusCategory: 'qi'  // ❌ Type '"qi"' is not assignable to type 'BonusCategory'
```

**Решение:**
```typescript
// В src/types/bonus-registry.ts или src/types/game.ts
export type BonusCategory = 
  | 'physical' | 'mental' | 'spiritual' 
  | 'qi' | 'health' | 'stamina'  // Добавить qi
  | ...;
```

**Оценка:** 30 минут

---

### P0-2: BonusDefinition — отсутствующие свойства

**Файл:** `src/lib/data/bonus-registry-runtime.ts`
**Ошибок:** 24+

**Проблема:**
```typescript
// Код использует:
bonusDef.description  // ❌ Property 'description' does not exist
bonusDef.isMultiplier // ❌ Property 'isMultiplier' does not exist
bonusDef.variance     // ❌ Property 'variance' does not exist
bonusDef.levelScaling // ❌ Property 'levelScaling' does not exist
```

**Решение:**
```typescript
// Обновить интерфейс BonusDefinition
interface BonusDefinition {
  // ... существующие поля ...
  description?: string;
  isMultiplier?: boolean;
  variance?: number;
  levelScaling?: number;
}
```

**Оценка:** 45 минут

---

### P0-3: GeneratedBonus — отсутствующие свойства

**Файл:** `src/lib/data/bonus-registry-runtime.ts`
**Ошибок:** 5+

**Проблема:**
```typescript
// Код использует:
bonus.type         // ❌ Property 'type' does not exist
bonus.isMultiplier // ❌ Property 'isMultiplier' does not exist
```

**Решение:**
```typescript
// Обновить интерфейс GeneratedBonus
interface GeneratedBonus {
  // ... существующие поля ...
  type?: string;
  isMultiplier?: boolean;
}
```

**Оценка:** 15 минут

---

### P0-4: Vitality — отсутствующее поле в Character

**Файл:** `src/app/api/character/delta/route.ts`, `src/app/api/npc/spawn/route.ts`
**Ошибок:** 3

**Проблема:**
```typescript
// Код использует character.vitality, но поле отсутствует в Prisma модели
character.vitality  // ❌ Property 'vitality' does not exist
```

**Решение (варианты):**

**A. Добавить vitality в Prisma schema:**
```prisma
model Character {
  // ... существующие поля ...
  vitality Int @default(100)
}
```
Затем: `bun run db:push`

**B. Использовать существующее поле (health):**
```typescript
// Заменить vitality на health в коде
```

**Оценка:** 1 час (включая миграцию)

---

## 🟠 ФАЗА 2: ВЫСОКИЙ ПРИОРИТЕТ (P1)

### P1-1: TruthSystem — отсутствующие методы

**Файл:** `src/app/api/inventory/sync/route.ts`
**Ошибок:** 12

**Проблема:**
```typescript
// Код вызывает методы, которых нет в TruthSystemImpl:
TruthSystem.isSessionLoaded(sessionId)  // ❌ does not exist
TruthSystem.loadSession(sessionId)       // ❌ does not exist
TruthSystem.getSessionState(sessionId)   // ❌ does not exist
TruthSystem.updateInventory(...)         // ❌ does not exist
```

**Решение:**
1. Проверить `src/lib/game/truth-system.ts`
2. Добавить недостающие методы ИЛИ
3. Удалить/закомментировать sync/route.ts если не используется

**Оценка:** 2 часа

---

### P1-2: ConditionManager — отсутствующий метод

**Файл:** `src/app/api/conditions/tick/route.ts`
**Ошибок:** 1

**Проблема:**
```typescript
conditionManager.getActiveModifiers()  // ❌ does not exist
```

**Решение:**
```typescript
// Добавить метод в ConditionManagerClass
getActiveModifiers(): Modifier[] {
  // Implementation
}
```

**Оценка:** 30 минут

---

### P1-3: ConditionDefinition — duplicate identifiers

**Файл:** `src/lib/game/condition-registry.ts`
**Ошибок:** 4

**Проблема:**
```typescript
// Duplicate identifier 'damagePerTick'
// Duplicate identifier 'healPerTick'
```

**Решение:**
Удалить дублирующиеся объявления в объекте.

**Оценка:** 10 минут

---

### P1-4: CombatRange type mismatch

**Файл:** `src/lib/game/combat-system.ts`
**Ошибок:** 8+

**Проблема:**
```typescript
// Функция ожидает CombatRange, но передаётся number
calculateDamage(attempt.range as number)  // ❌ Type 'number' is not assignable to 'CombatRange'
```

**Решение:**
```typescript
// Определить CombatRange как union type
type CombatRange = 1 | 2 | 3 | 4 | 5;
// Или использовать type assertion
calculateDamage(attempt.range as CombatRange);
```

**Оценка:** 30 минут

---

### P1-5: Event Bus Types

**Файл:** `src/lib/game/event-bus/handlers/body.ts`, `events/stat-events.ts`
**Ошибок:** 20+

**Проблемы:**
1. `DamageType` не экспортируется из `@/types/body`
2. `type` field не совпадает с ожидаемым типом события
3. SessionState используется неправильно

**Решение:**
```typescript
// 1. Экспортировать DamageType
export type DamageType = 'physical' | 'qi' | 'spiritual' | ...;

// 2. Исправить типы событий
const event: StatDeltaAddEvent = {
  type: 'stat:delta_add',  // Явный тип, не union
  // ...
};
```

**Оценка:** 2 часа

---

## 🟡 ФАЗА 3: СРЕДНИЙ ПРИОРИТЕТ (P2)

### P2-1: InventoryItem type mismatch

**Файл:** `src/hooks/useInventorySync.ts`
**Ошибок:** 3

**Проблема:**
```typescript
// Два разных типа InventoryItem в разных файлах
import { InventoryItem } from '@/types/game';      // Версия 1
import { InventoryItem } from '@/types/inventory'; // Версия 2
// Они несовместимы!
```

**Решение:**
Унифицировать типы — оставить один источник истины.

**Оценка:** 1 час

---

### P2-2: Technique.grade не существует

**Файл:** `src/app/api/techniques/pool/route.ts`
**Ошибок:** 2

**Проблема:**
```typescript
technique.grade  // ❌ Property 'grade' does not exist on type 'Technique'
```

**Решение:**
```typescript
// Добавить поле в тип Technique
interface Technique {
  // ... существующие поля ...
  grade?: TechniqueGrade;
}
```

**Оценка:** 15 минут

---

### P2-3: GeneratedNPC type issues

**Файл:** `src/app/api/generator/npc/route.ts`
**Ошибок:** 4

**Проблема:**
```typescript
// Type conversion fails
const npc = data as GeneratedNPC;  // ❌ Missing properties
```

**Решение:**
Добавить валидацию или исправить генератор.

**Оценка:** 1 час

---

### P2-4: UI Components type errors

**Файлы:** `RestDialog.tsx`, `PhaserGame.tsx`, `SettingsPanel.tsx`
**Ошибок:** 15+

**Проблемы:**
1. `SetStateAction<30>` — неправильный тип
2. `createFallbackPlayerTexture` — не существует
3. `RangeData` вместо `number`
4. `Rarity` не экспортируется

**Решение:**
Исправить типы по месту.

**Оценка:** 1.5 часа

---

## 🟢 ФАЗА 4: НИЗКИЙ ПРИОРИТЕТ (P3)

### P3-1: Chart component issues

**Файл:** `src/components/ui/chart.tsx`
**Ошибок:** 5

**Проблема:**
```typescript
props.payload  // ❌ Property 'payload' does not exist
props.label    // ❌ Property 'label' does not exist
```

**Решение:**
Обновить типы для recharts или использовать `any` как временное решение.

**Оценка:** 30 минут

---

### P3-2: LocationScene Phaser issues

**Файл:** `src/game/scenes/LocationScene.ts`
**Ошибок:** 3

**Проблема:**
```typescript
arc.setTint()     // ❌ setTint does not exist on type 'Arc'
arc.clearTint()   // ❌ clearTint does not exist
```

**Решение:**
```typescript
// Использовать type assertion или cast
(arc as Phaser.GameObjects.Shape).setTint(color);
```

**Оценка:** 15 минут

---

## 📋 ЧЕКЛИСТ ВЫПОЛНЕНИЯ

### Фаза 0: Подготовка
- [ ] Создать ветку `fix/typescript-stabilization`
- [ ] Запустить `npx tsc --noEmit > ts-errors-baseline.txt` для базовой линии

### Фаза 1: Критические (P0) — ~2.5 часа
- [ ] P0-1: Добавить 'qi' в BonusCategory
- [ ] P0-2: Добавить свойства в BonusDefinition
- [ ] P0-3: Добавить свойства в GeneratedBonus
- [ ] P0-4: Решить проблему vitality

### Фаза 2: Высокий приоритет (P1) — ~5.5 часов
- [ ] P1-1: Исправить TruthSystem методы
- [ ] P1-2: Добавить getActiveModifiers
- [ ] P1-3: Удалить duplicate identifiers
- [ ] P1-4: Исправить CombatRange типы
- [ ] P1-5: Исправить Event Bus типы

### Фаза 3: Средний приоритет (P2) — ~3.5 часа
- [ ] P2-1: Унифицировать InventoryItem тип
- [ ] P2-2: Добавить grade в Technique
- [ ] P2-3: Исправить GeneratedNPC типы
- [ ] P2-4: Исправить UI Components

### Фаза 4: Низкий приоритет (P3) — ~1 час
- [ ] P3-1: Исправить Chart component
- [ ] P3-2: Исправить LocationScene

### Фаза 5: Верификация
- [ ] Запустить `npx tsc --noEmit` — должно быть 0 ошибок
- [ ] Запустить `bun run lint` — должно быть 0 errors
- [ ] Проверить dev сервер
- [ ] Протестировать ключевые функции

---

## 📊 ОЦЕНКА ВРЕМЕНИ

| Фаза | Время | Приоритет |
|------|-------|-----------|
| P0 - Критические | 2.5 часа | 🔴 |
| P1 - Высокие | 5.5 часа | 🟠 |
| P2 - Средние | 3.5 часа | 🟡 |
| P3 - Низкие | 1 час | 🟢 |
| Верификация | 1 час | 🔵 |
| **Итого** | **13.5 часов** | |

---

## ⚠️ РИСКИ И ЗАВИСИМОСТИ

### Риски
1. **P0-4 (vitality)**: Может потребовать миграцию БД
2. **P1-1 (TruthSystem)**: Может быть dead code — нужно проверить использование
3. **P2-1 (InventoryItem)**: Может сломать существующий код при унификации

### Зависимости
1. Prisma schema должен быть синхронизирован с TypeScript типами
2. UI компоненты могут зависеть от старых типов

---

## 📝 ПРИМЕЧАНИЯ

### Стратегия исправлений
1. **Сначала типы**: Исправлять определения типов перед использованием
2. **Сначала интерфейсы**: Обновлять интерфейсы, затем реализации
3. **Type assertion**: Использовать `as any` только как временное решение
4. **Документация**: Комментировать неочевидные исправления

### Инструменты
- `npx tsc --noEmit` — проверка ошибок
- `bun run lint` — проверка код-стайла
- VS Code TypeScript Analyzer — инлайн подсказки

---

*Документ создан: 2026-03-16*
*Автор: ИИ-агент*
*Статус: Ожидает выполнения*
