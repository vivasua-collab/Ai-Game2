# Checkpoint: Правки оркестратора NPC

**Дата:** 2026-03-22
**Статус:** 📋 Готов к выполнению
**Версия:** 2.0
**Аудит завершён:** 2026-03-22 20:00 UTC
**План миграции:** `checkpoint_03_22_Generator_Migration.md`

---

## ⚠️ ВАЖНО: Принцип выполнения

**Порядок: Документация → Код → Интеграция → UI**

Все изменения должны следовать этому принципу!

---

## 1. РЕЗУЛЬТАТЫ АУДИТА

### 1.1 Архитектура оркестратора

```
npc-full-generator.ts (ОРКЕСТРАТОР)
├── generateNPC() из npc-generator.ts
│   ├── selectSpecies()
│   ├── selectRole()
│   ├── generateCultivation()
│   ├── generateStats()
│   ├── createBodyForSpecies()      — ✅ bodyMaterial, morphology добавлены
│   ├── selectPersonality()
│   ├── selectTechniques()
│   └── generateInventoryFromPool() → ❌ ПУСТО
│
├── generateTechnique() из technique-generator.ts — ❌ V1 DEPRECATED!
├── generateFormation() из formation-generator.ts — ✅ Боевые формации (OK)
└── generateFullEquipmentForNPC() из equipment-generator.ts
    ├── generateEquipmentV2() → ✅ Генерирует на лету
    └── generateInventoryForNPC() → ❌ НЕ ВЫЗЫВАЕТСЯ!
```

### 1.2 Карта проблем

| ID | Проблема | Файл | Приоритет |
|----|----------|------|-----------|
| P1 | `generateTechnique` (V1 deprecated) | npc-full-generator.ts:184 | 🔴 КРИТИЧНО |
| P2 | `generateInventoryForNPC()` не вызывается | npc-full-generator.ts | 🔴 КРИТИЧНО |
| P3 | Нет файла consumables в presets/ | generated-objects-loader.ts | 🟠 ВЫСОКО |
| P4 | `loadObjects('consumables')` возвращает [] | npc-generator.ts:690 | 🟠 ВЫСОКО |

### 1.3 Что УЖЕ исправлено (в других чекпоинтах)

| Компонент | Чекпоинт | Статус |
|-----------|----------|--------|
| `bodyMaterial` в BodyState | Generators | ✅ Добавлен |
| `morphology` в BodyState | Generators | ✅ Добавлен |
| `beast_arthropod` template | Generators | ✅ Добавлен |
| `material` в TempBodyState | Generators | ✅ Добавлен |
| `MATERIAL_DAMAGE_REDUCTION` | Combat | ✅ Интегрирован |
| FormationCore model | Formations | ✅ Создан |
| ActiveFormation model | Formations | ✅ Создан |
| Formation API | Formations | ✅ Создан |
| API V2 по умолчанию | Generators | ✅ DEFAULT_VERSION = 2 |
| Автогенерация V2 | generated-objects-loader | ✅ generateTechniqueV2() |

---

## 2. ПЛАН ВЫПОЛНЕНИЯ

### Phase 1: Совместимость типов (30 мин) ⏳

**Создать:** `src/lib/generator/technique-compat.ts`

```typescript
/**
 * Утилиты совместимости V1 ↔ V2
 * 
 * V2 расширяет V1, обратная совместимость сохраняется.
 */

import type { GeneratedTechnique as V1Technique } from './technique-generator';
import type { GeneratedTechniqueV2 } from './technique-generator-v2';

/**
 * Конвертировать V2 технику в формат V1
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
    baseDuration: 0,
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

**Критерий готовности:**
- [ ] Файл создан
- [ ] Lint: 0 ошибок

---

### Phase 2: Миграция NPC генератора (1 час) ⏳

**Файл:** `src/lib/generator/npc-full-generator.ts`

#### 2.1. Заменить импорт

**Было:**
```typescript
import {
  generateTechnique,
  type GeneratedTechnique,
  type TechniqueType,
  type Element,
} from './technique-generator';
```

**Стало:**
```typescript
import {
  generateTechniqueV2,
  type GeneratedTechniqueV2,
  type TechniqueType,
  type Element,
} from './technique-generator-v2';
import { v2ToV1 } from './technique-compat';

// Для совместимости с существующим кодом
type GeneratedTechnique = GeneratedTechniqueV2;
```

#### 2.2. Заменить вызов функции

**Было (строки 184-190):**
```typescript
const technique = generateTechnique(
  id,
  type,
  element,
  baseNPC.cultivation.level,
  seed + i * 1000
);
```

**Стало:**
```typescript
const techniqueV2 = generateTechniqueV2({
  id,
  type,
  element,
  level: baseNPC.cultivation.level,
  seed: seed + i * 1000,
  combatSubtype: type === 'combat' ? 'melee_strike' : undefined,
});

const technique = v2ToV1(techniqueV2);
```

#### 2.3. Добавить генерацию инвентаря

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
tempNPC.quickSlots = generatedInventory.slice(0, 4).map(item => item || null);
inventory.push(...generatedInventory);

timing.inventory = performance.now() - inventoryStart;
```

**Критерии готовности:**
- [ ] Импорт V2 добавлен
- [ ] generateTechniqueV2 используется
- [ ] Инвентарь генерируется
- [ ] Lint: 0 ошибок

---

### Phase 3: Автогенерация расходников (1-2 часа) 📋

**Файл:** `src/lib/generator/generated-objects-loader.ts`

#### 3.1. Добавить автогенерацию в loadObjects()

**Текущий код (строки 647-681):**
```typescript
async loadObjects(type: string): Promise<GeneratedItem[]> {
  if (type === 'consumables') {
    const { objects: items } = await this.loadItems();
    return items.filter(i => i.type === 'consumable');
  }
  // ...
}
```

**Новый код:**
```typescript
async loadObjects(type: string): Promise<GeneratedItem[]> {
  if (type === 'consumables') {
    const { objects: items } = await this.loadItems();
    const consumables = items.filter(i => i.type === 'consumable');
    
    // АВТОГЕНЕРАЦИЯ: если пусто
    if (consumables.length === 0 && !this.isGenerating) {
      const { generateConsumablesForLevel } = await import('./consumable-generator');
      const generated = generateConsumablesForLevel(1);
      await this.saveAutoGeneratedItems(generated, 'consumables');
      return generated;
    }
    
    return consumables;
  }
  // ...
}
```

#### 3.2. Добавить функцию сохранения

```typescript
private async saveAutoGeneratedItems(items: GeneratedItem[], category: string): Promise<void> {
  const filePath = path.join(ITEMS_DIR, `${category}.json`);
  
  try {
    await fs.mkdir(ITEMS_DIR, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify({
      version: '1.0',
      category,
      count: items.length,
      items,
      autoGenerated: true,
      generatedAt: new Date().toISOString(),
    }, null, 2), 'utf-8');
    
    this.itemsCache = null; // Сбросить кэш
  } catch (error) {
    console.error(`[GeneratedObjectsLoader] Failed to save ${category}:`, error);
  }
}
```

**Критерии готовности:**
- [ ] Автогенерация работает
- [ ] loadObjects('consumables') возвращает массив
- [ ] Файл создаётся в presets/items/consumables.json

---

### Phase 4: Очистка deprecated кода (30 мин) 📋

#### 4.1. Обновить JSDoc в technique-generator.ts

**Текущий (строки 1-16):**
```typescript
/**
 * @deprecated Используйте technique-generator-v2.ts
 */
```

**Без изменений - уже помечен как deprecated.**

#### 4.2. Обновить документацию

**Файл:** `docs/generators.md`

Добавить секцию статуса генераторов.

**Критерии готовности:**
- [ ] Документация обновлена

---

## 3. ТЕСТИРОВАНИЕ

### 3.1. Проверка генерации NPC

```typescript
// Тест V2 генерации
const result = generateFullNPC({
  cultivationLevel: 5,
  roleType: 'warrior',
  seed: 12345,
});

// Проверки:
expect(result.success).toBe(true);
expect(result.techniques.length).toBeGreaterThan(0);
expect(result.techniques[0]).toHaveProperty('grade'); // V2 имеет grade
expect(result.inventory.length).toBeGreaterThan(0); // Инвентарь
```

### 3.2. Проверка инвентаря

```typescript
// Тест расходников
const items = await generatedObjectsLoader.loadObjects('consumables');
expect(items.length).toBeGreaterThan(0);
expect(items[0].type).toBe('consumable');
```

---

## 4. КРИТЕРИИ ГОТОВНОСТИ

### Phase 1:
- [ ] `technique-compat.ts` создан
- [ ] Lint: 0 ошибок

### Phase 2:
- [ ] NPC используют V2 техники
- [ ] NPC получают инвентарь
- [ ] Lint: 0 ошибок

### Phase 3:
- [ ] loadObjects('consumables') работает
- [ ] Автогенерация расходников

### Phase 4:
- [ ] Документация обновлена

---

## 5. РИСКИ

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Несовместимость V1/V2 | Низкая | Среднее | technique-compat.ts |
| Регрессия NPC | Средняя | Высокое | Тестирование |
| Пустой инвентарь | Средняя | Низкое | Автогенерация |

---

## 6. ССЫЛКИ

### Документация
- **План миграции:** `docs/checkpoints/checkpoint_03_22_Generator_Migration.md`
- **V2 генератор:** `docs/checkpoints/checkpoint_03_21_generator_V2.md`
- **Bug fix:** `docs/checkpoints/checkpoint_03_21_bug-fix.md`

### Код
- **Оркестратор:** `src/lib/generator/npc-full-generator.ts`
- **V1 (deprecated):** `src/lib/generator/technique-generator.ts`
- **V2 (актуальный):** `src/lib/generator/technique-generator-v2.ts`
- **Загрузчик:** `src/lib/generator/generated-objects-loader.ts`
- **Экипировка:** `src/lib/generator/equipment-generator.ts`

---

*Чекпоинт создан: 2026-03-22*
*Обновлён: 2026-03-22 20:00 UTC*
*Версия: 2.0*
*Статус: 📋 Готов к выполнению*
