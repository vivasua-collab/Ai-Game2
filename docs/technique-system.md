# 🎯 Система техник: Генератор и расчёты

**Версия:** 2.0
**Обновлено:** 2026-03-13
**Статус:** ✅ Реализовано

---

## 📋 Обзор

Документ описывает:
1. Генератор техник (procedure generation)
2. Систему структурной ёмкости (capacity)
3. Формулы расчёта урона
4. Систему мастерства
5. Эффекты по типам техник

---

## 1️⃣ СТРУКТУРНАЯ ЁМКОСТЬ (Capacity)

### 1.1 Принцип

Каждая техника имеет внутреннюю "структурную ёмкость" — максимум Ци, который она может безопасно обработать.

```typescript
// Формула: 50 × 2^(level-1)
const TECHNIQUE_BASE_CAPACITY: Record<number, number> = {
  1: 50, 2: 100, 3: 200, 4: 400, 5: 800,
  6: 1600, 7: 3200, 8: 6400, 9: 12800,
};
```

### 1.2 Таблица ёмкости

| Уровень | Базовая ёмкость | С 100% мастерства |
|---------|-----------------|-------------------|
| L1 | 50 Ци | 75 Ци |
| L5 | 800 Ци | 1200 Ци |
| L9 | 12800 Ци | 19200 Ци |

### 1.3 Дестабилизация

При превышении ёмкости > 110%:
- Эффективность ограничена ёмкостью
- Излишек Ци → обратный удар (backlash)
- backlash = (qiInput - capacity) × 0.5

```typescript
// Реализация: src/lib/game/techniques.ts
export function checkDestabilization(qiInput: number, capacity: number) {
  if (qiInput <= capacity) {
    return { isDestabilized: false, effectiveQi: qiInput, backlashDamage: 0 };
  }
  if (qiInput <= capacity * 1.1) {
    return { isDestabilized: false, effectiveQi: capacity, backlashDamage: 0 };
  }
  return {
    isDestabilized: true,
    effectiveQi: capacity,
    backlashDamage: Math.floor((qiInput - capacity) * 0.5)
  };
}
```

---

## 2️⃣ КАЧЕСТВО ЦИ (Qi Density)

### 2.1 Формула

```
qiDensity = 2^(cultivationLevel - 1)
```

| Уровень культивации | Плотность Ци |
|--------------------|--------------|
| L1 | 1 |
| L2 | 2 |
| L3 | 4 |
| L5 | 16 |
| L9 | 256 |

### 2.2 Эффективность техники

```
Эффективность = qiSpent × qiDensity
```

**Пример:** Техника с qiCost = 50
- L1 практик: 50 × 1 = 50 единиц
- L5 практик: 50 × 16 = 800 единиц
- L9 практик: 50 × 256 = 12800 единиц

---

## 3️⃣ БАЗОВЫЕ ЗНАЧЕНИЯ ТЕХНИК

### 3.1 Базовый урон

```typescript
const TECHNIQUE_BASE_DAMAGE: Record<number, number> = {
  1: 10, 2: 15, 3: 22, 4: 33, 5: 50,
  6: 75, 7: 112, 8: 168, 9: 250,
};
// Рост ~×25 от L1 до L9 (×1.5 за уровень)
```

### 3.2 Базовая стоимость Ци

```typescript
const TECHNIQUE_BASE_QI_COST: Record<number, number> = {
  1: 10, 2: 15, 3: 22, 4: 33, 5: 50,
  6: 75, 7: 110, 8: 165, 9: 250,
};
```

---

## 4️⃣ СИСТЕМА МАСТЕРСТВА

### 4.1 Прирост мастерства

```typescript
// Убывающая отдача
masteryGained = max(0.1, baseGain × (1 - currentMastery / 100))

// Примеры:
// При 0%:   masteryGained = 1.0 (быстрое развитие)
// При 50%:  masteryGained = 0.5 (среднее развитие)
// При 90%:  masteryGained = 0.1 (медленное развитие)
```

### 4.2 Влияние мастерства

| Мастерство | Множитель урона | Бонус ёмкости |
|------------|-----------------|---------------|
| 0% | ×1.00 | +0% |
| 25% | ×1.125 | +12.5% |
| 50% | ×1.25 | +25% |
| 100% | ×1.50 | +50% |

### 4.3 Расширенная формула прироста

Учитывает:
- Убывающую отдачу
- Эффективность использования (заполнение ёмкости)
- Разницу уровней техники и культивации
- Редкость техники

```typescript
// Реализация: src/lib/game/skeleton/combat-processor.ts
function calculateMasteryGain(params: {
  techniqueLevel: number;
  cultivationLevel: number;
  currentMastery: number;
  qiSpent: number;
  techniqueCapacity: number;
  techniqueRarity: Rarity;
}): number
```

---

## 5️⃣ РЕДКОСТЬ ТЕХНИК

### 5.1 Модификаторы

| Редкость | Урон | Стоимость Ци | Шанс эффекта | Макс. эффектов |
|----------|------|--------------|--------------|----------------|
| Common | ×0.8 | ×1.0 | ×0.5 | 1 |
| Uncommon | ×1.0 | ×0.95 | ×0.8 | 2 |
| Rare | ×1.25 | ×0.9 | ×1.2 | 3 |
| Legendary | ×1.6 | ×0.85 | ×1.5 | 4 |

### 5.2 Бонусы по слотам

- **Common:** 0 слотов
- **Uncommon:** 1 слот (+2-5 урона)
- **Rare:** 2 слота (+3-8 урона, +3-7% крит)
- **Legendary:** 3 слота (+5-15 урона, +5-12% крит, +10-25% пробития)

---

## 6️⃣ ТИПЫ ТЕХНИК

### 6.1 Префиксы ID

| Тип | Префикс | Описание |
|-----|---------|----------|
| Melee Strike | MS | Удар телом |
| Melee Weapon | MW | Удар с оружием |
| Ranged | RG | Дальнобойная |
| Defense | DF | Защитная |
| Cultivation | CU | Культивация |
| Support | SP | Поддержка |
| Movement | MV | Перемещение |
| Sensory | SN | Восприятие |
| Healing | HL | Исцеление |
| Curse | CR | Проклятие |
| Poison | PN | Яд |

### 6.2 Классификация по Tier эффектов

| Tier | Типы | Особенности |
|------|------|-------------|
| 1 | Combat (MS, MW, RG) | Только множители урона, без эффектов |
| 2 | Defense, Healing | Событийные эффекты (щит, лечение) |
| 3 | Curse, Poison | Доты и дебаффы |
| 4 | Support, Movement, Sensory | Баффы и утилити |
| 5 | Cultivation | Специальные (qiCost = 0) |

### 6.3 Доступные эффекты по типам

```typescript
const AVAILABLE_EFFECTS_BY_TYPE = {
  combat: [],           // НЕТ эффектов! Только урон
  defense: ['shield', 'buff'],
  healing: ['heal', 'buff'],
  curse: ['debuff', 'slow', 'stun', 'leech'],
  poison: ['poison', 'debuff'],
  support: ['buff', 'heal', 'shield'],
  movement: ['buff'],
  sensory: ['buff'],
  cultivation: [],
};
```

---

## 7️⃣ ПОЛНЫЙ РАСЧЁТ УРОНА

### 7.1 Иерархия расчёта

```
1. Структурная ёмкость → capacity = 50 × 2^(level-1) × masteryBonus
2. Эффективное Ци → effectiveQi = min(qiInput, capacity)
3. Качество Ци → qiDensity = 2^(cultivationLevel - 1)
4. Эффективность → effectiveness = effectiveQi × qiDensity
5. Множители → rarityMult × elementMult × statMult
6. Мастерство → masteryMult = 1 + (mastery/100) × 0.5
7. Итог → finalDamage = baseDamage × effectiveness × множители
```

### 7.2 Реализация

```typescript
// Файл: src/lib/game/techniques.ts
export function calculateTechniqueDamage(params: TechniqueDamageParams): TechniqueDamageResult {
  const { technique, cultivator, characterTechnique, qiInput } = params;
  
  // 1. Ёмкость
  const capacity = calculateTechniqueCapacity(technique.level, characterTechnique.mastery);
  
  // 2. Дестабилизация
  const { isDestabilized, effectiveQi, backlashDamage } = checkDestabilization(qiInput, capacity);
  
  // 3. Качество Ци
  const qiDensity = calculateQiDensity(cultivator.cultivationLevel);
  
  // 4. Эффективность
  const effectiveness = effectiveQi * qiDensity;
  
  // 5. Множители
  const statMult = calculateStatScaling(cultivator, technique);
  const masteryMult = 1 + (characterTechnique.mastery / 100) * 0.5;
  
  // 6. Итоговый урон
  const finalDamage = Math.floor(
    technique.baseDamage * statMult * masteryMult * (1 + effectiveness / 100)
  );
  
  return { damage: finalDamage, effectiveQi, qiDensity, capacity, isDestabilized, backlashDamage };
}
```

---

## 8️⃣ ПРИМЕРЫ РАСЧЁТА

### 8.1 L5 культиватор, 100 Ци

```
Культиватор: L5 (qiDensity = 16)
Вложено Ци: 100

──────────────────────────────────────────────────────────
Техника L1 (ёмкость = 50):
  effectiveQi = min(100, 50) = 50  (дестабилизация!)
  backlashDamage = (100 - 50) × 0.5 = 25 урона себе!
  
Техника L5 (ёмкость = 800):
  effectiveQi = min(100, 800) = 100  (стабильно)
  backlashDamage = 0

ВЫВОД: Техника L5 эффективнее, безопасна
──────────────────────────────────────────────────────────
```

### 8.2 L9 культиватор, 500 Ци

```
Культиватор: L9 (qiDensity = 256)
Вложено Ци: 500

Техника L5 (ёмкость = 800):
  effectiveness = 500 × 256 = 128,000
  
Техника L9 (ёмкость = 12,800):
  effectiveness = 500 × 256 = 128,000

ВЫВОД: При одинаковом Ци — одинаковая эффективность
Но L9 техника может безопасно принять больше Ци
```

---

## 9️⃣ АВТОГЕНЕРАЦИЯ

### 9.1 Принцип

При старте игры автоматически генерируются 90 техник (10 каждого типа).

### 9.2 Реализация

```typescript
// Файл: src/lib/generator/generated-objects-loader.ts
export async function autoGenerateTechniques(): Promise<GeneratedTechnique[]> {
  const techniques: GeneratedTechnique[] = [];
  
  for (const type of TECHNIQUE_TYPES) {
    for (let level = 1; level <= 9; level++) {
      const technique = generateTechnique({
        type,
        level,
        rarity: selectRarity(),
      });
      techniques.push(technique);
    }
  }
  
  return techniques; // 90 техник
}
```

### 9.3 Стартовые техники

Новый персонаж получает 3 случайные техники из сгенерированного пула:

```typescript
// Файл: src/app/api/game/start/route.ts
const startTechniques = selectStartTechniques(generatedTechniques, 3);
```

---

## 📁 ФАЙЛЫ СИСТЕМЫ

| Файл | Назначение |
|------|------------|
| `src/lib/generator/technique-generator.ts` | Генерация техник |
| `src/lib/generator/technique-config.ts` | Конфигурация типов и бонусов |
| `src/lib/game/techniques.ts` | Расчёт урона, ёмкости, мастерства |
| `src/lib/game/skeleton/combat-processor.ts` | Применение техник в бою |
| `prisma/schema.prisma` | Модель Technique с baseCapacity |

---

## 📚 Связанные документы

- [start_lore.md](./start_lore.md) — Лор мира культивации
- [TECHNIQUE_SCALING_LIMITS.md](./TECHNIQUE_SCALING_LIMITS.md) — Лимиты масштабирования
- [combat-system.md](./combat-system.md) — Боевая система

---

*Документ создан объединением technique-generator-analysis.md и technique-generator-implementation.md*
*Дата: 2026-03-13*
