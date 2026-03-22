# Checkpoint: Правки оркестратора NPC

**Дата:** 2026-03-22
**Статус:** 📋 Планирование
**Аудит завершён:** 2026-03-22 09:06:48 UTC

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
│   ├── createBodyForSpecies()
│   ├── selectPersonality()
│   ├── selectTechniques()
│   └── generateInventoryFromPool() → ❌ ПУСТО
│
├── generateTechnique() из technique-generator.ts (V1 deprecated)
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
| Автогенерация формаций | ❌ | Не реализована |
| Автогенерация расходников | ❌ | Не реализована |

### 1.3 Мёртвый код

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

---

## 2. ЗАДАЧИ

### 2.1 КРИТИЧНО: Инвентарь NPC (Приоритет: HIGH)

#### 2.1.1 Вариант A: Исправить generateInventoryFromPool

**Проблема:** `loadObjects('consumables')` возвращает пустой массив.

**Решение 1:** Создать `presets/items/consumable.json` с предгенерированными расходниками.

**Решение 2:** Добавить автогенерацию расходников в `generated-objects-loader.ts`:

```typescript
// В класс GeneratedObjectsLoader добавить:
private async autoGenerateConsumables(): Promise<GeneratedItem[]> {
  // Аналогично autoGenerateTechniques
  // Генерировать pills, elixirs, food для уровней 1-9
}
```

#### 2.1.2 Вариант B: Использовать generateInventoryForNPC

**Проблема:** Функция существует, но не вызывается.

**Решение:** Изменить `npc-full-generator.ts`:

```typescript
// ТЕКУЩИЙ КОД (строка 233):
generateFullEquipmentForNPC(tempNPC, rng);
equipment = { ...tempNPC.equipment };

// ИСПРАВЛЕННЫЙ КОД:
generateFullEquipmentForNPC(tempNPC, rng);
equipment = { ...tempNPC.equipment };
inventory = generateInventoryForNPC({
  cultivationLevel: tempNPC.cultivation.level,
  speciesId: tempNPC.speciesId,
  roleId: tempNPC.roleId,
  wealth: getWealthByRole(tempNPC.roleId),
  combatant: !NON_COMBAT_ROLES.includes(tempNPC.roleId),
  rng,
});
```

#### 2.1.3 Рекомендуемое решение

**Комбинированный подход:**

1. **Быстрое исправление:** Использовать `generateInventoryForNPC()` в оркестраторе
2. **Долгосрочное:** Добавить автогенерацию расходников в loader

---

### 2.2 КРИТИЧНО: Формации NPC (Приоритет: HIGH)

#### 2.2.1 Проблема

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

#### 2.2.2 Решение

См. `checkpoint_03_22_Formations.md`:
1. Создать `presets/formations/`
2. Добавить автогенерацию в loader
3. Обновить manifest.json

---

### 2.3 ВАЖНО: Обновление генератора техник (Приоритет: MEDIUM)

#### 2.3.1 Проблема

```typescript
// npc-full-generator.ts:184
import { generateTechnique, ... } from './technique-generator';
//                                                    ^^^^^^^^^^^^^^^^
// technique-generator.ts ПОМЕЧЕН КАК @deprecated
```

**V1 генератор:** Нарушает принцип "Матрёшка" (baseDamage ≠ qiCost)

#### 2.3.2 Решение

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

---

### 2.4 ОПТИМИЗАЦИЯ: Удаление мёртвого кода (Приоритет: LOW)

#### 2.4.1 Функции для удаления/исправления

| Файл | Функция | Статус |
|------|---------|--------|
| npc-generator.ts | `generateInventoryFromPool()` | Исправить или удалить |
| technique-generator.ts | Весь файл | Оставить как deprecated, перевести импорты на V2 |

#### 2.4.2 Функции для использования

| Файл | Функция | Действие |
|------|---------|----------|
| equipment-generator.ts | `generateInventoryForNPC()` | Вызывать в оркестраторе |

---

## 3. ИЗМЕНЕНИЯ В ФАЙЛАХ

### 3.1 npc-full-generator.ts

```diff
// ИМПОРТЫ
- import { generateTechnique, ... } from './technique-generator';
+ import { generateTechniqueV2, ... } from './technique-generator-v2';
+ import { generateInventoryForNPC, NON_COMBAT_ROLES, getWealthByRole } from './equipment-generator';

// В функции generateFullNPC()

// После строки 237 (timing.equipment):
+ // ========== 6. Генерация инвентаря ==========
+ const inventoryStart = performance.now();
+ 
+ const inventoryContext: InventoryGenerationContext = {
+   cultivationLevel: tempNPC.cultivation.level,
+   speciesId: tempNPC.speciesId,
+   roleId: tempNPC.roleId,
+   wealth: getWealthByRole(tempNPC.roleId),
+   combatant: !NON_COMBAT_ROLES.includes(tempNPC.roleId),
+   rng,
+ };
+ const generatedInventory = generateInventoryForNPC(inventoryContext);
+ inventory.push(...generatedInventory);
+ addInventoryToNPC(tempNPC, generatedInventory);
+ 
+ timing.inventory = performance.now() - inventoryStart;
```

### 3.2 generated-objects-loader.ts

```diff
// Добавить метод автогенерации расходников
+ private async autoGenerateConsumables(): Promise<GeneratedItem[]> {
+   // Генерация pills, elixirs, food для уровней 1-9
+ }

// В loadObjects():
+ if (type === 'consumables') {
+   const { objects: items } = await this.loadItems();
+   const consumables = items.filter(i => i.type === 'consumable');
+   
+   // АВТОГЕНЕРАЦИЯ: если пусто - генерируем
+   if (consumables.length === 0 && !this.isGenerating) {
+     const generated = await this.autoGenerateConsumables();
+     return generated;
+   }
+   
+   return consumables;
+ }
```

---

## 4. ПОРЯДОК РЕАЛИЗАЦИИ

### Phase 1: Быстрые исправления (1-2 часа)

1. [ ] Добавить вызов `generateInventoryForNPC()` в оркестратор
2. [ ] Проверить что NPC получают инвентарь
3. [ ] Протестировать генерацию NPC

### Phase 2: Инфраструктура (2-3 часа)

1. [ ] Создать `presets/formations/` (см. checkpoint_03_22_Formations.md)
2. [ ] Добавить автогенерацию формаций в loader
3. [ ] Добавить автогенерацию расходников в loader
4. [ ] Обновить manifest.json

### Phase 3: Обновление генераторов (2-3 часа)

1. [ ] Перевести оркестратор на `generateTechniqueV2`
2. [ ] Проверить совместимость типов
3. [ ] Удалить или пометить deprecated код
4. [ ] Обновить тесты

---

## 5. ТЕСТИРОВАНИЕ

### 5.1 Тесты для инвентаря

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

### 5.2 Тесты для формаций

```typescript
describe('NPC Formation Generation', () => {
  it('should generate formations for L5+ NPC', () => {
    const result = generateFullNPC({
      cultivationLevel: 5,
      seed: 12345,
    });
    
    expect(result.formations.length).toBeGreaterThanOrEqual(1);
  });
  
  it('should have no formations for L1-4 NPC', () => {
    const result = generateFullNPC({
      cultivationLevel: 3,
    });
    
    expect(result.formations.length).toBe(0);
  });
});
```

---

## 6. РИСКИ

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Изменение структуры TempNPC | Низкая | Высокое | Проверить типы |
| Несовместимость V1/V2 техник | Средняя | Среднее | Проверить структуру GeneratedTechnique |
| Дублирование генерации | Низкая | Низкое | Флаг isGenerating в loader |

---

## 7. КРИТЕРИИ ГОТОВНОСТИ

### Phase 1:
- [ ] `generateFullNPC()` вызывает `generateInventoryForNPC()`
- [ ] NPC получают расходники в quickSlots
- [ ] Нет ошибок при генерации

### Phase 2:
- [ ] `presets/formations/` содержит файлы
- [ ] `loadObjects('consumables')` возвращает массив
- [ ] manifest.json актуален

### Phase 3:
- [ ] Оркестратор использует V2 генератор техник
- [ ] Deprecated код помечен или удалён
- [ ] Тесты проходят

---

## 8. ССЫЛКИ

- **Оркестратор:** `src/lib/generator/npc-full-generator.ts`
- **Базовый генератор:** `src/lib/generator/npc-generator.ts`
- **Экипировка:** `src/lib/generator/equipment-generator.ts`
- **Загрузчик:** `src/lib/generator/generated-objects-loader.ts`
- **Формации:** `docs/checkpoints/checkpoint_03_22_Formations.md`

---

*Чекпоинт создан: 2026-03-22*
*Аудит выполнен: 2026-03-22 09:06:48 UTC*
