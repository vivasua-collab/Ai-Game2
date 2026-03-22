# Checkpoint: Правки оркестратора NPC

**Дата:** 2026-03-22
**Статус:** 🔄 Частично выполнено
**Версия:** 1.1
**Аудит завершён:** 2026-03-22 18:00 UTC

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
├── generateTechnique() из technique-generator.ts — ⚠️ V1 DEPRECATED!
├── generateFormation() из formation-generator.ts
└── generateFullEquipmentForNPC() из equipment-generator.ts
    ├── generateEquipmentV2() → ✅ Генерирует на лету
    └── generateInventoryForNPC() → ⚠️ НЕ ВЫЗЫВАЕТСЯ!
```

### 1.2 Найденные проблемы

| Компонент | Статус | Проблема |
|-----------|--------|----------|
| `presets/formations/` | ❌ | Директория отсутствует |
| `presets/items/consumable.json` | ❌ | Файл отсутствует |
| `loadObjects('consumables')` | ❌ | Возвращает [] |
| `generateInventoryFromPool()` | ❌ | Всегда пустой инвентарь |
| `generateInventoryForNPC()` | ⚠️ | Не вызывается в оркестраторе |
| `generateTechnique` (V1) | ⚠️ | Использует deprecated генератор |
| Автогенерация формаций | ❌ | Не реализована |
| Автогенерация расходников | ❌ | Не реализована |

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

---

## 2. ЗАДАЧИ

### 2.1 КРИТИЧНО: Генератор техник V2 (Приоритет: HIGH)

#### 2.1.1 Проблема

```typescript
// npc-full-generator.ts:184
import { generateTechnique, ... } from './technique-generator';
//                                                    ^^^^^^^^^^^^^^^^
// technique-generator.ts ПОМЕЧЕН КАК @deprecated
```

**V1 генератор:** Нарушает принцип "Матрёшка" (baseDamage ≠ qiCost)

#### 2.1.2 Решение

Заменить на V2:

```typescript
// ТЕКУЩИЙ КОД:
import { generateTechnique } from './technique-generator';

// ИСПРАВЛЕННЫЙ КОД:
import { generateTechniqueV2 } from './technique-generator-v2';

// В цикле генерации:
const technique = generateTechniqueV2({
  id,
  type,
  element,
  level: baseNPC.cultivation.level,
  seed: seed + i * 1000,
});
```

**Файл:** `src/lib/generator/npc-full-generator.ts`
**Строки:** 184, 194-207
**Оценка:** 30 минут

---

### 2.2 КРИТИЧНО: Инвентарь NPC (Приоритет: HIGH)

#### 2.2.1 Проблема

```typescript
// npc-generator.ts:690 - НЕ РАБОТАЕТ
async function generateInventoryFromPool(npc: GeneratedNPC) {
  const consumables = await generatedObjectsLoader.loadObjects('consumables');
  // ВСЕГДА ПУСТО - нет consumable.json
}

// equipment-generator.ts:215 - НЕ ВЫЗЫВАЕТСЯ
export function generateInventoryForNPC(context: InventoryGenerationContext): TempItem[] {
  // Работает, но оркестратор не вызывает!
}
```

#### 2.2.2 Решение

**Вариант A: Быстрое исправление**

```typescript
// npc-full-generator.ts
// После строки 237 (timing.equipment):

// ========== 6. Генерация инвентаря ==========
const inventoryStart = performance.now();

import { generateInventoryForNPC, NON_COMBAT_ROLES, getWealthByRole } from './equipment-generator';

const inventoryContext: InventoryGenerationContext = {
  cultivationLevel: tempNPC.cultivation.level,
  speciesId: tempNPC.speciesId,
  roleId: tempNPC.roleId,
  wealth: getWealthByRole(tempNPC.roleId),
  combatant: !NON_COMBAT_ROLES.includes(tempNPC.roleId),
  rng,
};
const generatedInventory = generateInventoryForNPC(inventoryContext);
inventory.push(...generatedInventory);

timing.inventory = performance.now() - inventoryStart;
```

**Файл:** `src/lib/generator/npc-full-generator.ts`
**Оценка:** 1 час

---

### 2.3 ВАЖНО: Формации NPC (Приоритет: MEDIUM)

#### 2.3.1 Текущее состояние

```typescript
// npc-full-generator.ts:203-222
const formationSlots = calculateFormationSlots(baseNPC.cultivation.level);

for (let i = 0; i < formationSlots; i++) {
  const formation = generateFormation(id, type, level, seed);
  formations.push(formation);  // ✅ Генерирует на лету
}
```

**Генерация работает**, но:
- Нет сохранения в `presets/formations/`
- `generatedObjectsLoader.loadFormations()` возвращает []
- Если другой код использует loader - получит пустой массив

#### 2.3.2 Решение (опционально)

Использовать новый API формаций из Formations checkpoint:

```typescript
// Вместо generateFormation():
import { generateFormationCore } from './formation-core-generator';
import { FormationManager } from '@/lib/formations/formation-manager';

// Для NPC с формациями L5+:
if (baseNPC.cultivation.level >= 5) {
  // Генерация ядра формации
  const coreData = generateFormationCore(baseNPC.cultivation.level);
  // ... создание формации
}
```

**Оценка:** 2-3 часа (опционально)

---

### 2.4 ОПТИМИЗАЦИЯ: Удаление мёртвого кода (Приоритет: LOW)

#### 2.4.1 Функции для удаления/исправления

| Файл | Функция | Статус |
|------|---------|--------|
| npc-generator.ts | `generateInventoryFromPool()` | Исправить или удалить |
| technique-generator.ts | Весь файл | Оставить как deprecated, перевести импорты на V2 |

---

## 3. ПОРЯДОК РЕАЛИЗАЦИИ

### Phase 1: Быстрые исправления (1-2 часа)

1. [ ] Заменить `generateTechnique` на `generateTechniqueV2` в оркестраторе
2. [ ] Добавить вызов `generateInventoryForNPC()` в оркестратор
3. [ ] Протестировать генерацию NPC

### Phase 2: Инфраструктура (опционально, 2-3 часа)

1. [ ] Создать `presets/formations/` (см. checkpoint_03_22_Formations.md)
2. [ ] Добавить автогенерацию формаций в loader
3. [ ] Добавить автогенерацию расходников в loader
4. [ ] Обновить manifest.json

### Phase 3: Очистка (опционально, 1 час)

1. [ ] Удалить или пометить deprecated код
2. [ ] Обновить тесты

---

## 4. ТЕСТИРОВАНИЕ

### 4.1 Тесты для генератора техник V2

```typescript
describe('NPC Technique Generation with V2', () => {
  it('should use technique-generator-v2 for techniques', () => {
    const result = generateFullNPC({
      cultivationLevel: 5,
      roleType: 'warrior',
      seed: 12345,
    });
    
    // Проверить что техники соответствуют V2 формату
    expect(result.techniques[0]).toHaveProperty('capacity');
    expect(result.techniques[0]).toHaveProperty('grade');
    // V2 гарантирует baseDamage * mastery = qiCost
  });
});
```

### 4.2 Тесты для инвентаря

```typescript
describe('NPC Inventory Generation', () => {
  it('should generate inventory for combat NPC', () => {
    const result = generateFullNPC({
      cultivationLevel: 5,
      roleType: 'warrior',
      seed: 12345,
    });
    
    expect(result.inventory.length).toBeGreaterThan(0);
    expect(result.inventory.some(i => i.type === 'consumable')).toBe(true);
  });
  
  it('should have healing pills for combat roles', () => {
    const result = generateFullNPC({
      cultivationLevel: 3,
      roleType: 'combat',
    });
    
    const hasHealing = result.inventory.some(i => 
      i.category.includes('pill') || i.effects?.some(e => e.type === 'heal')
    );
    expect(hasHealing).toBe(true);
  });
});
```

---

## 5. РИСКИ

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Несовместимость V1/V2 техник | Средняя | Среднее | Проверить структуру GeneratedTechnique |
| Изменение структуры TempNPC | Низкая | Высокое | Проверить типы |
| Дублирование генерации | Низкая | Низкое | Флаг isGenerating в loader |

---

## 6. КРИТЕРИИ ГОТОВНОСТИ

### Phase 1:
- [ ] `generateFullNPC()` использует `generateTechniqueV2`
- [ ] `generateFullNPC()` вызывает `generateInventoryForNPC()`
- [ ] NPC получают расходники в quickSlots
- [ ] Нет ошибок при генерации
- [ ] Lint: 0 ошибок

### Phase 2:
- [ ] `presets/formations/` содержит файлы
- [ ] `loadObjects('consumables')` возвращает массив
- [ ] manifest.json актуален

---

## 7. ССЫЛКИ

### Код
- **Оркестратор:** `src/lib/generator/npc-full-generator.ts`
- **Базовый генератор:** `src/lib/generator/npc-generator.ts`
- **Экипировка:** `src/lib/generator/equipment-generator.ts`
- **Загрузчик:** `src/lib/generator/generated-objects-loader.ts`
- **Техники V2:** `src/lib/generator/technique-generator-v2.ts`

### Зависимости
- **Формации:** `docs/checkpoints/checkpoint_03_22_Formations.md`
- **Генераторы:** `docs/checkpoints/checkpoint_03_22_Generators.md`

---

## 8. ИСТОРИЯ ИЗМЕНЕНИЙ

| Дата | Изменение |
|------|-----------|
| 2026-03-22 09:06 | Первичный аудит |
| 2026-03-22 18:00 | Обновление после выполнения других чекпоинтов |

---

*Чекпоинт создан: 2026-03-22*
*Аудит выполнен: 2026-03-22 09:06:48 UTC*
*Обновлён: 2026-03-22 18:00 UTC*
*Статус: 🔄 Частично выполнено (Phase 1 pending)*
