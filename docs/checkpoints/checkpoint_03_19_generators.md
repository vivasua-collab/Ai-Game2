# 🎲 Аудит генераторов - Итоговый отчёт

**Дата:** 2026-03-19  
**Статус:** ✅ Завершён

---

## 📁 Созданные документы

| Документ | Назначение |
|----------|------------|
| `docs/matryoshka-architecture.md` | Описание архитектуры "Матрёшка" |
| `docs/generator-specs.md` | Характеристики каждого генератора |

---

## 📊 Результаты аудита

### Обнаружено генераторов: 10

| Файл | Строк | Статус | Проблема |
|------|-------|--------|----------|
| technique-generator.ts | ~800 | ✅ Активен | — |
| weapon-generator-v2.ts | 381 | ❌ НЕ используется | Дублируется |
| armor-generator-v2.ts | 373 | ❌ НЕ используется | Дублируется |
| charger-generator-v2.ts | 420 | ❌ НЕ используется | Дублируется |
| equipment-generator-v2.ts | 783 | ⚠️ Содержит огрызок | Дублирует вместо делегирования |
| equipment-generator.ts | 509 | ✅ Активен | — |
| consumable-generator.ts | ~300 | ✅ Активен | — |
| qi-stone-generator.ts | ~200 | ⚠️ Только UI | — |
| formation-generator.ts | ~500 | ✅ Активен | — |
| npc-generator.ts | 882 | ✅ Активен | — |

---

## 🪆 Архитектура "Матрёшка"

Все генераторы используют слоистую архитектуру:

```
СЛОЙ 1: БАЗА      → Материал, Уровень, Базовые параметры
СЛОЙ 2: ГРЕЙД     → Множители качества
СЛОЙ 3: СПЕЦИФ.   → Тип предмета, эффекты
```

### Соответствие Матрёшке

| Генератор | Соответствие |
|-----------|--------------|
| technique-generator.ts | ✅ Полное |
| weapon-generator-v2.ts | ✅ Полное (но не используется) |
| armor-generator-v2.ts | ✅ Полное (но не используется) |
| charger-generator-v2.ts | ✅ Полное (но не используется) |
| equipment-generator-v2.ts | ❌ Нарушено (огрызок) |
| consumable-generator.ts | ✅ Полное |
| qi-stone-generator.ts | ✅ Упрощённая (без Grade) |
| formation-generator.ts | ✅ Полное |
| npc-generator.ts | ✅ Оркестратор |

---

## 📦 Общие модули

### base-item-generator.ts
- `seededRandom(seed)` — детерминированный RNG
- `hashString(str)` — хеширование
- `weightedSelect()` — выбор по весу
- `RARITY_MULTIPLIERS` — множители редкости

### grade-selector.ts
- `selectEquipmentGrade()` — выбор грейда экипировки
- `selectTechniqueGrade()` — выбор грейда техник
- `selectConsumableGrade()` — выбор грейда расходников
- Множители Grade для расчётов

### id-counters.ts
- `getNextWeaponId()` — WE_XXXXXX
- `getNextArmorId()` — AR_XXXXXX
- `getNextChargerId()` — CH_XXXXXX
- `getNextTechniqueId()` — XX_XXXXXX
- `getNextConsumableId()` — CS_XXXXXX

---

## 🔧 Потерянный функционал

### weapon-generator-v2.ts (не используется)
- **7 типов оружия**: sword, blade, spear, staff, axe, dagger, bow
- **8 элементов**: fire, water, earth, air, lightning, ice, void, neutral
- **Криты**: critChance 3-12%, critDamage 130-200%
- **Скорость атаки**: 0.7-1.5

### armor-generator-v2.ts (не используется)
- **5 слотов**: head, chest, hands, legs, feet
- **3 типа**: light, medium, heavy
- **Покрытие**: 10-40% тела
- **Штрафы**: evasionModifier, movementPenalty

### charger-generator-v2.ts (не используется)
- **5 типов**: ring, bracelet, pendant, orb, talisman
- **9 элементов** (включая Инь/Ян!)
- **Qi Capacity**: 50-300 + level×50
- **Recovery Rate**: 5-15 + level×2
- **Слоты техник**: 1-3 по типу

---

## ⚠️ Проблема equipment-generator-v2.ts

### Текущее состояние (НЕПРАВИЛЬНОЕ):
```typescript
// Строки 119-133
switch (options.type) {
  case 'weapon':
    return generateWeaponV2(ctx);   // ← Внутренняя функция
  case 'armor':
    return generateArmorV2(ctx);    // ← Внутренняя функция
  case 'charger':
    return generateChargerV2(ctx);  // ← Внутренняя функция
}
```

### Правильное решение:
```typescript
import { generateWeaponV2 as genWeapon } from './weapon-generator-v2';
import { generateArmorV2 as genArmor } from './armor-generator-v2';
import { generateChargerV2 as genCharger } from './charger-generator-v2';

switch (options.type) {
  case 'weapon':  return genWeapon(options);
  case 'armor':   return genArmor(options);
  case 'charger': return genCharger(options);
}
```

---

## 📚 Документация

- **Матрёшка**: `docs/matryoshka-architecture.md`
- **Характеристики**: `docs/generator-specs.md`
- **Экипировка**: `docs/equip-v2.md`
- **Техники**: `docs/technique-system-v2.md`

---

*Документ создан: 2026-03-19*
