# 🔧 Аудит и План миграции генераторов

**Дата:** 2026-03-22
**Версия:** 1.0
**Статус:** 📋 Аудит завершён

---

## 1. РЕЗУЛЬТАТЫ АУДИТА

### 1.1 Карта использования генераторов

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    КАРТА ИСПОЛЬЗОВАНИЯ ГЕНЕРАТОРОВ                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  technique-generator.ts (V1) — @deprecated                                       │
│  ├── npc-full-generator.ts — ❌ КРИТИЧНО! Использует generateTechnique()         │
│  ├── preset-storage.ts — ✅ Только импорт типов                                  │
│  ├── weapon-config.ts — ✅ Только импорт CombatSubtype                           │
│  ├── technique-config.ts — ✅ Только импорт типов                                │
│  ├── id-config.ts — ✅ Только реэкспорт типов                                   │
│  └── api/generator/techniques/route.ts — ⚠️ Для совместимости (deprecated path) │
│                                                                                  │
│  technique-generator-v2.ts (V2) — АКТУАЛЬНЫЙ                                     │
│  ├── generated-objects-loader.ts — ✅ Использует generateTechniqueV2()           │
│  └── api/generator/techniques/route.ts — ✅ По умолчанию (DEFAULT_VERSION = 2)   │
│                                                                                  │
│  formation-generator.ts (БОЕВЫЕ ФОРМАЦИИ)                                        │
│  ├── npc-full-generator.ts — ⚠️ Использует для NPC (другая система)             │
│  └── api/generator/techniques/route.ts — ⚠️ Для совместимости                  │
│                                                                                  │
│  formation-core-generator.ts (МЕДИТАТИВНЫЕ ФОРМАЦИИ)                             │
│  ├── formations/formation-manager.ts — ✅ Новая система                          │
│  └── api/formations/cores/route.ts — ✅ Новая система                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Критические проблемы

| ID | Проблема | Файл | Критичность |
|----|----------|------|-------------|
| P1 | Использует V1 `generateTechnique()` | npc-full-generator.ts:184 | 🔴 КРИТИЧНО |
| P2 | Нет инвентаря у NPC | npc-full-generator.ts | 🔴 КРИТИЧНО |
| P3 | Нет расходников в presets/ | generated-objects-loader.ts | 🟠 ВЫСОКО |
| P4 | Две системы формаций | formation-generator.ts vs formations/ | 🟡 СРЕДНЕ |

### 1.3 Что УЖЕ работает корректно

| Компонент | Файл | Статус |
|-----------|------|--------|
| API V2 по умолчанию | api/generator/techniques/route.ts | ✅ DEFAULT_VERSION = 2 |
| Автогенерация V2 | generated-objects-loader.ts | ✅ generateTechniqueV2() |
| Новые формации | src/lib/formations/ | ✅ Phase 1-3 завершены |
| Preset storage | preset-storage.ts | ✅ Работает с V2 форматом |

---

## 2. ПЛАН МИГРАЦИИ

### Принцип: Документация → Код → Интеграция → UI

---

## Phase 1: Подготовка (30 минут)

### 1.1. Проверка совместимости типов

**Задача:** Убедиться что `GeneratedTechnique` (V1) совместим с `GeneratedTechniqueV2` (V2)

**Файлы для анализа:**
- `src/lib/generator/technique-generator.ts` (V1 типы)
- `src/lib/generator/technique-generator-v2.ts` (V2 типы)
- `src/types/temp-npc.ts` (TempNPC.techniqueData)

**Критичные различия:**

| Поле | V1 | V2 | Совместимость |
|------|----|----|---------------|
| grade | `TechniqueGrade?` | `TechniqueGrade` | ✅ Совместимо |
| baseCapacity | `number | null` | `number` | ⚠️ V1 nullable |
| computed.finalDamage | `number` | `number` | ✅ Совместимо |
| computed.formula | НЕТ | `string` | ⚠️ Только V2 |
| isUltimate | НЕТ | `boolean?` | ⚠️ Только V2 |

**Решение:** V2 расширяет V1, обратная совместимость сохраняется.

### 1.2. Создать маппинг V1 → V2

**Новый файл:** `src/lib/generator/technique-compat.ts`

```typescript
/**
 * Утилиты совместимости V1 ↔ V2
 */

import type { GeneratedTechnique as V1Technique } from './technique-generator';
import type { GeneratedTechniqueV2 } from './technique-generator-v2';

/**
 * Конвертировать V2 технику в формат V1 для совместимости
 */
export function v2ToV1(technique: GeneratedTechniqueV2): V1Technique {
  return {
    id: technique.id,
    name: technique.name,
    nameEn: technique.nameEn,
    description: technique.description,
    type: technique.type,
    subtype: technique.subtype,
    element: technique.element,
    level: technique.level,
    rarity: gradeToRarity(technique.grade),
    grade: technique.grade,
    baseDamage: technique.baseDamage,
    baseQiCost: technique.baseQiCost,
    baseRange: technique.baseRange,
    baseDuration: 0, // V2 не использует
    baseCapacity: technique.baseCapacity,
    minCultivationLevel: technique.minCultivationLevel,
    statRequirements: technique.statRequirements,
    weaponCategory: technique.weaponCategory,
    weaponType: technique.weaponType,
    damageFalloff: technique.damageFalloff,
    isRangedQi: technique.isRangedQi,
    modifiers: technique.modifiers,
    computed: {
      finalDamage: technique.computed.finalDamage,
      finalQiCost: technique.computed.finalQiCost,
      finalRange: technique.computed.finalRange,
      finalDuration: 0,
      activeEffects: technique.computed.activeEffects,
    },
    meta: technique.meta,
  };
}

function gradeToRarity(grade: string): string {
  const mapping: Record<string, string> = {
    common: 'common',
    refined: 'uncommon',
    perfect: 'rare',
    transcendent: 'legendary',
  };
  return mapping[grade] || 'common';
}
```

---

## Phase 2: Миграция NPC генератора (1 час)

### 2.1. Заменить импорт V1 на V2

**Файл:** `src/lib/generator/npc-full-generator.ts`

**Текущий код (строки 21-26):**
```typescript
import {
  generateTechnique,
  type GeneratedTechnique,
  type TechniqueType,
  type Element,
} from './technique-generator';
```

**Новый код:**
```typescript
import {
  generateTechniqueV2,
  type GeneratedTechniqueV2,
  type TechniqueType,
  type Element,
} from './technique-generator-v2';
import { v2ToV1 } from './technique-compat';

// Для совместимости с существующим типом TempNPC
type GeneratedTechnique = GeneratedTechniqueV2;
```

### 2.2. Заменить вызов generateTechnique на generateTechniqueV2

**Текущий код (строки 183-191):**
```typescript
const technique = generateTechnique(
  id,
  type,
  element,
  baseNPC.cultivation.level,
  seed + i * 1000
);
```

**Новый код:**
```typescript
const techniqueV2 = generateTechniqueV2({
  id,
  type,
  element,
  level: baseNPC.cultivation.level,
  seed: seed + i * 1000,
  combatSubtype: type === 'combat' ? 'melee_strike' : undefined, // По умолчанию
});

// Конвертируем в V1 формат для совместимости с TempNPC
const technique = v2ToV1(techniqueV2);
```

### 2.3. Добавить генерацию инвентаря

**Добавить после строки 237:**

```typescript
// ========== 6. Генерация инвентаря ==========
const inventoryStart = performance.now();

import { 
  generateInventoryForNPC, 
  NON_COMBAT_ROLES, 
  getWealthByRole 
} from './equipment-generator';

const inventoryContext = {
  cultivationLevel: tempNPC.cultivation.level,
  speciesId: tempNPC.speciesId,
  roleId: tempNPC.roleId,
  wealth: getWealthByRole(tempNPC.roleId),
  combatant: !NON_COMBAT_ROLES.includes(tempNPC.roleId),
  rng,
};

const generatedInventory = generateInventoryForNPC(inventoryContext);

// Добавляем в quickSlots
tempNPC.quickSlots = generatedInventory.slice(0, 4).map(item => item || null);
inventory.push(...generatedInventory);

timing.inventory = performance.now() - inventoryStart;
```

---

## Phase 3: Инвентарь и расходники (1-2 часа)

### 3.1. Проблема

`loadObjects('consumables')` возвращает [] потому что:
1. Нет файла `presets/items/consumable.json`
2. Нет автогенерации расходников

### 3.2. Решение: Автогенерация расходников

**Файл:** `src/lib/generator/consumable-generator.ts` (существует)

**Необходимо:**
1. Добавить функцию `generateConsumablesForLevel(level)`
2. Интегрировать с `generated-objects-loader.ts`

**Изменения в generated-objects-loader.ts:**

```typescript
// В loadObjects():
if (type === 'consumables') {
  const { objects: items } = await this.loadItems();
  const consumables = items.filter(i => i.type === 'consumable');
  
  // АВТОГЕНЕРАЦИЯ: если пусто - генерируем
  if (consumables.length === 0 && !this.isGenerating) {
    const { generateConsumablesForLevel } = await import('./consumable-generator');
    const generated = generateConsumablesForLevel(1); // Базовые расходники
    await this.saveAutoGeneratedItems(generated, 'consumables');
    return generated;
  }
  
  return consumables;
}
```

---

## Phase 4: Формации NPC (опционально, 2 часа)

### 4.1. Текущее состояние

NPC используют `formation-generator.ts` (боевые формации).
Новая система (`src/lib/formations/`) — для медитативных формаций.

### 4.2. Решение

**Не менять!** Это разные системы:
- `formation-generator.ts` → Боевые формации для NPC (defensive, offensive, support, special)
- `src/lib/formations/` → Медитативные формации (barrier, trap, amplification...)

---

## Phase 5: Очистка deprecated кода (30 минут)

### 5.1. Файлы для пометки как deprecated

| Файл | Действие |
|------|----------|
| `technique-generator.ts` | Оставить, добавить @deprecated в JSDoc |
| `technique-config.ts` | Оставить, только типы |

### 5.2. Обновить документацию

**Файл:** `docs/generators.md`

```markdown
## Статус генераторов

| Генератор | Версия | Статус |
|-----------|--------|--------|
| technique-generator.ts | V1 | @deprecated - использовать V2 |
| technique-generator-v2.ts | V2 | ✅ Актуальный |
| formation-generator.ts | V1 | ✅ Актуальный (боевые формации) |
| formation-core-generator.ts | V1 | ✅ Актуальный (медитативные) |
```

---

## 3. ПОРЯДОК ВЫПОЛНЕНИЯ

### Этап 1: Подготовка (30 мин)
- [ ] Создать `technique-compat.ts`
- [ ] Проверить совместимость типов

### Этап 2: Миграция NPC (1 час)
- [ ] Заменить импорт V1 → V2 в npc-full-generator.ts
- [ ] Заменить generateTechnique → generateTechniqueV2
- [ ] Добавить генерацию инвентаря

### Этап 3: Инвентарь (1-2 часа)
- [ ] Добавить автогенерацию расходников
- [ ] Интегрировать с generated-objects-loader.ts

### Этап 4: Очистка (30 мин)
- [ ] Обновить JSDoc deprecated
- [ ] Обновить документацию

---

## 4. КРИТЕРИИ ГОТОВНОСТИ

### Phase 1-2:
- [ ] NPC генерируются с V2 техниками
- [ ] Lint: 0 ошибок
- [ ] generateFullNPC() использует generateTechniqueV2
- [ ] NPC получают инвентарь

### Phase 3:
- [ ] loadObjects('consumables') возвращает массив
- [ ] NPC получают расходники

### Phase 4:
- [ ] Документация обновлена
- [ ] Deprecated код помечен

---

## 5. РИСКИ

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Несовместимость типов V1/V2 | Низкая | Среднее | technique-compat.ts |
| Регрессия в NPC генерации | Средняя | Высокое | Тестирование |
| Пустой инвентарь | Высокая | Низкое | Автогенерация |

---

## 6. ССЫЛКИ

### Чекпоинты
- `checkpoint_03_21_generator_V2.md` — V2 реализация
- `checkpoint_03_21_bug-fix.md` — Исправления V2
- `checkpoint_03_22_NPC_Orchestrator.md` — Аудит оркестратора

### Код
- `src/lib/generator/technique-generator.ts` (V1 deprecated)
- `src/lib/generator/technique-generator-v2.ts` (V2 актуальный)
- `src/lib/generator/npc-full-generator.ts` (ОРКЕСТРАТОР)
- `src/lib/generator/generated-objects-loader.ts` (ЗАГРУЗЧИК)

---

*Аудит проведён: 2026-03-22*
*Версия: 1.0*
*Статус: 📋 Готов к выполнению*
