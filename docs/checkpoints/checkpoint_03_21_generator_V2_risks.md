# ⚠️ Анализ рисков: Генератор техник V2

**Дата создания:** 2026-03-21
**Статус:** 📋 АНАЛИЗ ЗАВИСИМОСТЕЙ
**Автор:** AI Code Audit

---

## 📊 КАРТА ЗАВИСИМОСТЕЙ

### Файлы с ПРЯМЫМИ импортами из V1

| # | Файл | Импорты | Критичность |
|---|------|---------|-------------|
| 1 | `src/app/api/generator/techniques/route.ts` | `generateAllTechniques`, `generateTechniquesForLevel`, `generateTechniquesWithOptions`, `getGenerationStats`, `TechniqueType`, `CombatSubtype` | 🔴 КРИТИЧНО |
| 2 | `src/lib/generator/generated-objects-loader.ts` | `generateTechnique`, `TechniqueType` | 🔴 КРИТИЧНО |
| 3 | `src/components/settings/TechniqueGeneratorPanel.tsx` | `Rarity`, `TechniqueType`, `CombatSubtype` | 🟠 ВЫСОКО |
| 4 | `src/services/technique-pool.service.ts` | использует `generatedObjectsLoader` | 🟡 СРЕДНЕ |

### Файлы с КОСВЕННЫМИ зависимостями

| # | Файл | Зависимость | Влияние |
|---|------|-------------|---------|
| 1 | `src/lib/constants/technique-capacity.ts` | Типы из V1 | Низкое |
| 2 | `src/types/technique-types.ts` | Единый источник типов | Низкое |
| 3 | `src/types/grade.ts` | Система Grade | Низкое |
| 4 | `src/lib/generator/preset-storage.ts` | Сохранение JSON | Среднее |

### JSON данные

| Путь | Количество | Действие |
|------|------------|----------|
| `presets/techniques/**/*.json` | 64 файла, ~19 000 техник | Удалить и перегенерировать |
| `presets/manifest.json` | 1 файл | Перегенерировать |

---

## 🔴 КРИТИЧЕСКИЕ ТОЧКИ ОТКАЗА

### 1. API Route: `/api/generator/techniques`

**Файл:** `src/app/api/generator/techniques/route.ts`

**Используемые функции V1:**
```typescript
import {
  generateAllTechniques,           // ⚠️ ГЕНЕРАЦИЯ
  generateTechniquesForLevel,      // ⚠️ ГЕНЕРАЦИЯ
  generateTechniquesWithOptions,   // ⚠️ ГЕНЕРАЦИЯ
  getGenerationStats,              // ℹ️ СТАТИСТИКА
  type TechniqueType,              // ℹ️ ТИП
  type CombatSubtype,              // ℹ️ ТИП
} from '@/lib/generator/technique-generator';
```

**Что сломается:**
- `POST /api/generator/techniques` → action: generate, append
- `GET /api/generator/techniques` → action: stats

**Решение:**
```typescript
// V2: Замена импорта
import {
  generateAllTechniquesV2,
  generateTechniquesForLevelV2,
  generateTechniquesWithOptionsV2,
  getGenerationStatsV2,
  type TechniqueType,
  type CombatSubtype,
} from '@/lib/generator/technique-generator-v2';
```

**Действия:**
1. Создать V2 с аналогичными сигнатурами функций
2. Заменить импорт в route.ts
3. Протестировать API endpoints

---

### 2. Generated Objects Loader

**Файл:** `src/lib/generator/generated-objects-loader.ts`

**Используемые функции V1:**
```typescript
import {
  generateTechnique,    // ⚠️ ГЕНЕРАЦИЯ ОДНОЙ ТЕХНИКИ
  type TechniqueType,   // ℹ️ ТИП
} from './technique-generator';
```

**Что сломается:**
- Автогенерация техник при пустой базе (метод `autoGenerateTechniques()`)
- Конвертация техник (метод `convertToGenerated()`)

**Код V1 (строки 224-231):**
```typescript
const technique = generateTechnique(
  id,
  'combat',
  element,
  1, // level
  Date.now() + counter, // seed
  { combatSubtype: subtype } // ЯВНО указываем подтип!
);
```

**Решение:**
```typescript
// V2: Замена
import { generateTechniqueV2 } from './technique-generator-v2';

const technique = generateTechniqueV2({
  id,
  type: 'combat',
  element,
  level: 1,
  seed: Date.now() + counter,
  options: { combatSubtype: subtype }
});
```

**Действия:**
1. Изменить сигнатуру `generateTechniqueV2` на объектную (более явную)
2. Обновить вызовы в `autoGenerateTechniques()`
3. Протестировать автогенерацию

---

### 3. Technique Generator Panel

**Файл:** `src/components/settings/TechniqueGeneratorPanel.tsx`

**Используемые типы V1:**
```typescript
import { Rarity, TechniqueType, CombatSubtype } from '@/lib/generator/technique-generator';
```

**Что сломается:**
- Импорт типов — БУДЕТ РАБОТАТЬ (типы можно импортировать из V1)
- Но НЕЛЬЗЯ импортировать из V1 после deprecation!

**Решение:**
```typescript
// Импорт типов из единого источника
import type {
  TechniqueType,
  CombatSubtype,
} from '@/types/technique-types';
import type { Rarity } from '@/types/rarity';

// Или использовать систему Grade вместо Rarity
import type { TechniqueGrade } from '@/types/grade';
```

**Дополнительные изменения UI:**
- Убрать `damageVariance` слайдеры (не нужны в V2)
- Изменить `genCount` default с 50 на 10
- Добавить отображение формулы расчёта

---

## 🟠 ВЫСОКИЙ РИСК: Изменение баланса

### Проблема: baseDamage ≠ qiCost

**V1 (текущее):**
```json
{
  "baseDamage": 21,     // ❌ НЕПРАВИЛЬНО
  "baseQiCost": 10,
  "finalDamage": 21
}
```

**V2 (должно быть):**
```json
{
  "baseDamage": 10,     // ✅ = qiCost
  "baseQiCost": 10,
  "finalDamage": 10 × gradeMult × specMult
}
```

**Влияние на геймплей:**
- Снижение урона в ~2 раза для level 1 техник
- Изменение баланса боя
- Потребуется перебалансировка врагов

**Митигация:**
1. Создать тестовый стенд баланса
2. Сравнить V1 vs V2 урон
3. При необходимости — коэффициенты компенсации

---

## 🟡 СРЕДНИЙ РИСК: Структура JSON

### Изменение полей JSON

**V1 поля (пример из level-1.json):**
```json
{
  "id": "MS_000001",
  "baseDamage": 21,
  "baseQiCost": 10,
  "baseRange": 0.5,
  "baseCapacity": 64,
  "computed": {
    "finalDamage": 21,
    "finalQiCost": 10
  },
  "meta": { "generatorVersion": "3.0.0" }
}
```

**V2 поля (новые):**
```json
{
  "id": "MS_000001",
  "baseDamage": 10,        // = qiCost
  "baseQiCost": 10,
  "baseRange": 0.6,        // 0.5 + 0.1 × gradeIndex
  "baseCapacity": 64,
  "computed": {
    "finalDamage": 15,     // 10 × 1.0 × 1.5 (melee_strike)
    "finalQiCost": 10,
    "formula": "10 × 1.0 × 1.5 = 15"  // НОВОЕ: отображение формулы
  },
  "meta": { "generatorVersion": "4.0.0" }
}
```

**Влияние:**
- UI компоненты должны обрабатывать новые поля
- Старые JSON файлы станут несовместимы

**Митигация:**
1. Полное удаление старых JSON
2. Перегенерация через V2
3. Обновление UI для новых полей

---

## 🟢 НИЗКИЙ РИСК: Типы

### Единый источник типов

**Файл:** `src/types/technique-types.ts`

**Содержимое:**
```typescript
export type TechniqueType =
  | 'combat' | 'defense' | 'cultivation'
  | 'support' | 'movement' | 'sensory'
  | 'healing' | 'curse' | 'poison';

export type CombatSubtype =
  | 'melee_strike' | 'melee_weapon'
  | 'ranged_projectile' | 'ranged_beam' | 'ranged_aoe';
```

**Статус:** ✅ Не требует изменений

---

## 📋 ПОШАГОВЫЙ ПЛАН МИТИГАЦИИ

### Этап 1: Подготовка (БЕЗ ИЗМЕНЕНИЯ КОДА)

- [x] **1.1** Создать backup текущих JSON файлов ✅ (git history)
- [x] **1.2** Зафиксировать текущее состояние V1 в git ✅
- [x] **1.3** Создать ветку `feature/technique-generator-v2` ✅ (merged)

### Этап 2: Создание V2 (НОВЫЕ ФАЙЛЫ)

- [x] **2.1** Создать `src/lib/generator/technique-generator-v2.ts` ✅
  - Сигнатуры: `generateTechniqueV2`, `generateAllTechniquesV2`, etc.
  - Принцип: `baseDamage = qiCost`
  - Формулы вместо таблиц

- [x] **2.2** Создать `src/lib/generator/technique-generator-config-v2.ts` ✅
  - Конфигурация без хардкода
  - `TECHNIQUE_COUNT_LIMITS` для ограничения количества

- [x] **2.3** Создать `src/lib/generator/effects/` (по Tier) ✅
  - `tier-1-combat.ts` — пустой (нет эффектов)
  - `tier-2-defense-healing.ts`
  - `tier-3-curse-poison.ts`
  - `tier-4-support-utility.ts`
  - `tier-5-cultivation.ts`
  - `index.ts` — экспорт

### Этап 3: Обновление импортов (ВТОРОЙ ПРОХОД)

- [x] **3.1** Обновить `src/app/api/generator/techniques/route.ts` ✅
  - Заменить импорт на V2
  - DEFAULT_VERSION = 2

- [x] **3.2** Обновить `src/lib/generator/generated-objects-loader.ts` ✅
  - Заменить `generateTechnique` на `generateTechniqueV2`
  - Обновить сигнатуру вызова

- [x] **3.3** Обновить `src/components/settings/TechniqueGeneratorPanel.tsx` ✅
  - Импорт типов из `@/types/`
  - Убрать `damageVariance` для V2
  - Изменить default count на 10

- [x] **3.4** Добавить `@deprecated` в V1 ✅
  ```typescript
  /**
   * @deprecated Используйте technique-generator-v2.ts
   */
  ```

- [x] **3.5** Обновить `src/components/settings/SettingsPanel.tsx` ✅
  - Импорт типов из `@/types/technique-types` и `@/types/rarity`

### Этап 4: Очистка данных

- [x] **4.1** JSON файлы уже V2 (generatorVersion: 4.0.0) ✅
- [x] **4.2** Валидация новых JSON ✅ (baseDamage = qiCost)

### Этап 5: UI обновления

- [x] **5.1** `TechniqueGeneratorPanel.tsx` — V2 баннер ✅
- [x] **5.2** Выбор версии генератора ✅

### Этап 6: Тестирование

- [x] **6.1** Lint проверка — 0 errors ✅
- [ ] **6.2** Integration тесты API (опционально)
- [ ] **6.3** Сравнение V1 vs V2 баланса (опционально)

---

## 📊 МАТРИЦА РИСКОВ

| Риск | Вероятность | Влияние | Митигация | Статус |
|------|-------------|---------|-----------|--------|
| API сломан | Высокий | Критическое | Пошаговая замена импортов | 📋 Запланировано |
| Изменение баланса | Высокий | Высокое | Тесты, коэффициенты | 📋 Запланировано |
| Потеря данных JSON | Средний | Среднее | Backup перед удалением | 📋 Запланировано |
| Регрессия UI | Средний | Низкое | Пошаговое тестирование | 📋 Запланировано |
| Несовместимость типов | Низкий | Среднее | Единый источник типов | ✅ Решено |

---

## 📚 СВЯЗАННЫЕ ФАЙЛЫ

### Документация
- **Основной план:** `docs/checkpoints/checkpoint_03_21_generator_V2.md`
- **Матрёшка:** `docs/matryoshka-architecture.md`
- **Система V2:** `docs/technique-system-v2.md`

### Код V1 (историческая справка)
- **Генератор:** `src/lib/generator/technique-generator.ts` (~2000 строк)
- **Константы:** `src/lib/constants/technique-capacity.ts`

### Код V2 (будет создан)
- **Генератор V2:** `src/lib/generator/technique-generator-v2.ts`
- **Конфиг V2:** `src/lib/generator/technique-generator-config-v2.ts`
- **Эффекты:** `src/lib/generator/effects/*.ts`

---

*Анализ создан: 2026-03-21*
*Статус: АНАЛИЗ ЗАВЕРШЁН — ГОТОВО К РЕАЛИЗАЦИИ*
