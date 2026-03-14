# ⚖️ Система ограничений масштабирования техник

**Версия:** 1.0  
**Дата:** 2026-03-11  
**Статус:** Проектирование

---

## 🎯 Проблема парадокса

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ПАРАДОКС ТЕХНИК                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Вопрос: Зачем учить новые техники, если старые делают всё лучше?   │
│                                                                      │
│  Пример:                                                             │
│  - "Огненный шар" L1, изучена мастером (100%), шкалируется до 10x  │
│  - "Пламенный шторм" L5, только изучена (0%), базовый урон выше     │
│                                                                      │
│  Практик L9 использует "Огненный шар" со 100 Ци:                    │
│  → Урон = 100 × 10 (масштаб) × 256 (qiDensity) = 256,000           │
│                                                                      │
│  Практик L9 использует "Пламенный шторм" со 100 Ци:                 │
│  → Урон = 100 × 1 × 256 = 25,600                                    │
│                                                                      │
│  Вывод: Старая техника в 10 раз сильнее новой! ❌                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Решение: Структурная ёмкость техники

### Принцип

**Каждая техника имеет "структурную ёмкость" — максимум Ци, который она может обработать.**

```
┌─────────────────────────────────────────────────────────────────────┐
│                   СТРУКТУРНАЯ ЁМКОСТЬ                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Техника = "Контейнер" для потока Ци                                 │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Уровень техники 1 (малый контейнер)                         │   │
│  │  ┌──────────────┐                                            │   │
│  │  │ 50 Ци макс   │ → При подаче 100 Ци: дестабилизация!      │   │
│  │  └──────────────┘                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Уровень техники 5 (средний контейнер)                       │   │
│  │  ┌────────────────────────┐                                  │   │
│  │  │ 400 Ци макс            │ → Может использовать больше Ци  │   │
│  │  └────────────────────────┘                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Уровень техники 9 (великий контейнер)                       │   │
│  │  ┌──────────────────────────────────────────┐                │   │
│  │  │ 3200 Ци макс                             │                │   │
│  │  └──────────────────────────────────────────┘                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📐 Формула структурной ёмкости

```typescript
/**
 * Структурная ёмкость техники
 * 
 * Максимум Ци, который техника может обработать без дестабилизации
 */
function calculateTechniqueCapacity(
  techniqueLevel: number,      // 1-9
  mastery: number = 0          // 0-100%
): number {
  // Базовая ёмкость: 50 × 2^(level-1)
  // L1 = 50, L2 = 100, L3 = 200, ..., L9 = 12,800
  const baseCapacity = 50 * Math.pow(2, techniqueLevel - 1);
  
  // Бонус от мастерства: +50% при 100% мастерства
  const masteryBonus = 1 + (mastery / 100) * 0.5;
  
  return Math.floor(baseCapacity * masteryBonus);
}

// Таблица ёмкости:
// L1: 50 Ци   (с 100% мастерства: 75)
// L2: 100 Ци  (с 100% мастерства: 150)
// L3: 200 Ци  (с 100% мастерства: 300)
// L4: 400 Ци  (с 100% мастерства: 600)
// L5: 800 Ци  (с 100% мастерства: 1200)
// L6: 1600 Ци (с 100% мастерства: 2400)
// L7: 3200 Ци (с 100% мастерства: 4800)
// L8: 6400 Ци (с 100% мастерства: 9600)
// L9: 12800 Ци (с 100% мастерства: 19200)
```

---

## 💥 Дестабилизация

### Механика

При превышении ёмкости техника становится нестабильной:

```typescript
interface DestabilizationResult {
  isDestabilized: boolean;
  efficiency: number;        // 0-1.0, сколько Ци реально использовано
  backlashDamage?: number;    // Урон от нестабильности
  backlashQiLoss?: number;    // Потеря Ци
  message: string;
}

function checkDestabilization(
  qiInput: number,           // Поданное Ци
  techniqueCapacity: number  // Ёмкость техники
): DestabilizationResult {
  
  // Запас прочности: 110% ёмкости без последствий
  const safeLimit = techniqueCapacity * 1.1;
  
  if (qiInput <= safeLimit) {
    return {
      isDestabilized: false,
      efficiency: 1.0,
      message: `Техника стабильна`
    };
  }
  
  // Степень перегрузки
  const overloadRatio = qiInput / techniqueCapacity;
  
  // Эффективность падает при перегрузке
  const efficiency = Math.max(0.1, techniqueCapacity / qiInput);
  
  // Обратный удар (backlash)
  const excessQi = qiInput - techniqueCapacity;
  const backlashDamage = Math.floor(excessQi * 0.5); // 50% излишка = урон
  const backlashQiLoss = excessQi; // Весь излишек теряется
  
  return {
    isDestabilized: true,
    efficiency,
    backlashDamage,
    backlashQiLoss,
    message: `Дестабилизация! Эффективность: ${Math.floor(efficiency * 100)}%`
  };
}
```

### Пример боя

```
Практик L9 использует "Огненный шар" (L1):
  - qiDensity = 256
  - techniqueCapacity = 50 (L1) × 1.5 (100% мастерство) = 75 Ци
  - Подано Ци: 500

Расчёт:
  1. Перегрузка: 500 > 75 × 1.1 = 82.5
  2. Дестабилизация! 
     - efficiency = 75 / 500 = 0.15 (15%)
     - Эффективное Ци = 500 × 0.15 = 75
  3. Backlash:
     - backlashDamage = (500 - 75) × 0.5 = 212 урона себе!
     - backlashQiLoss = 425 Ци потеряно
  
  4. Урон цели: 75 × 256 = 19,200
  
Итог: Вместо 128,000 урона — только 19,200 + 212 урона себе
```

---

## 📊 Сравнение техник разных уровней

### Сценарий: Практик L9 (qiDensity = 256)

| Техника | Уровень | Ёмкость (100% mast) | Макс урон (без дестаб.) | При 500 Ци |
|---------|---------|---------------------|-------------------------|------------|
| Огненный шар | L1 | 75 | 75 × 256 = 19,200 | Дестабилизация! |
| Пламя дракона | L3 | 300 | 300 × 256 = 76,800 | Дестабилизация! |
| Огненный шторм | L5 | 1200 | 1200 × 256 = 307,200 | Стабилен |
| Божественное пламя | L7 | 4800 | 4800 × 256 = 1,228,800 | Стабилен |
| Адское возмездие | L9 | 19200 | 19200 × 256 = 4,915,200 | Стабилен |

**Вывод:** Техники высоких уровней могут обрабатывать больше Ци, что даёт бóльший урон.

---

## 🔄 Развитие техники (Evolution)

### Текущая система (из Prisma schema)

```prisma
model Technique {
  level    Int     @default(1) // Текущий уровень (1-9)
  minLevel Int     @default(1) // Минимальный уровень
  maxLevel Int     @default(9) // Максимальный уровень развития
  canEvolve Boolean @default(true)
}
```

### Механика развития

```typescript
interface TechniqueEvolution {
  currentLevel: number;       // 1-9
  maxLevel: number;           // Предел развития
  evolutionProgress: number;  // 0-100%
  masteryAtCurrentLevel: number;
}

/**
 * Условия развития техники
 */
function canEvolveTechnique(
  technique: Technique,
  cultivator: Character
): { canEvolve: boolean; reason?: string } {
  
  // 1. Проверка максимального уровня
  if (technique.level >= technique.maxLevel) {
    return { canEvolve: false, reason: "Техника достигла предела развития" };
  }
  
  // 2. Требование мастерства 100%
  const characterTechnique = getCharacterTechnique(technique.id);
  if (characterTechnique.mastery < 100) {
    return { canEvolve: false, reason: `Требуется 100% мастерства (текущее: ${characterTechnique.mastery}%)` };
  }
  
  // 3. Требование уровня культивации
  const requiredLevel = technique.level + 1;
  if (cultivator.cultivationLevel < requiredLevel) {
    return { canEvolve: false, reason: `Требуется уровень культивации ${requiredLevel}` };
  }
  
  return { canEvolve: true };
}

/**
 * Развитие техники
 */
function evolveTechnique(
  technique: Technique,
  cultivator: Character
): EvolutionResult {
  
  const check = canEvolveTechnique(technique, cultivator);
  if (!check.canEvolve) {
    return { success: false, reason: check.reason };
  }
  
  // Повышение уровня техники
  technique.level += 1;
  
  // Сброс мастерства (изучение заново на новом уровне)
  const characterTechnique = getCharacterTechnique(technique.id);
  characterTechnique.mastery = 0;
  
  // Увеличение ёмкости (автоматически из нового уровня)
  const newCapacity = calculateTechniqueCapacity(technique.level, 0);
  
  return {
    success: true,
    newLevel: technique.level,
    newCapacity,
    message: `Техника "${technique.name}" развита до уровня ${technique.level}!`
  };
}
```

---

## 🎮 Итоговая формула урона

```typescript
/**
 * Полный расчёт урона техники
 */
function calculateTechniqueDamage(
  technique: Technique,
  cultivator: Character,
  qiInput: number,
  mastery: number
): DamageResult {
  
  // 1. Структурная ёмкость техники
  const capacity = calculateTechniqueCapacity(technique.level, mastery);
  
  // 2. Проверка дестабилизации
  const stability = checkDestabilization(qiInput, capacity);
  
  // 3. Эффективное Ци
  const effectiveQi = qiInput * stability.efficiency;
  
  // 4. Качество Ци практика (геометрический рост ×2)
  const qiDensity = Math.pow(2, cultivator.cultivationLevel - 1);
  
  // 5. Базовый урон = Ци × Качество
  let damage = effectiveQi * qiDensity;
  
  // 6. Масштабирование от характеристик
  const statMultiplier = calculateStatScaling(cultivator, technique);
  damage *= statMultiplier;
  
  // 7. Бонус от мастерства (эффективность использования)
  const masteryEfficiency = 1 + (mastery / 100) * 0.3;
  damage *= masteryEfficiency;
  
  // 8. Бонус от уровня техники (структ. ёмкость уже учтена)
  // Техники высоких уровней эффективнее используют Ци
  const levelEfficiency = 1 + (technique.level - 1) * 0.05; // +5% за уровень
  damage *= levelEfficiency;
  
  return {
    damage: Math.floor(damage),
    qiSpent: qiInput,
    effectiveQi,
    qiDensity,
    capacity,
    isDestabilized: stability.isDestabilized,
    backlashDamage: stability.backlashDamage,
    backlashQiLoss: stability.backlashQiLoss,
  };
}
```

---

## 📊 Финальная таблица примеров

### Практик L5 (qiDensity = 16), 100 Ци

| Техника | Уровень | Ёмкость | Мастерство | Урон цели | Backlash |
|---------|---------|---------|------------|-----------|----------|
| Огненный шар | L1 | 50 | 100% | 50×16×1.3×1.05 = 1,092 | Нет (50 < 55) |
| Пламя дракона | L3 | 300 | 50% | 100×16×1.15×1.15 = 2,116 | Нет |
| Огненный шторм | L5 | 1200 | 0% | 100×16×1.0×1.2 = 1,920 | Нет |

### Практик L9 (qiDensity = 256), 500 Ци

| Техника | Уровень | Ёмкость | Мастерство | Урон цели | Backlash |
|---------|---------|---------|------------|-----------|----------|
| Огненный шар | L1 | 75 | 100% | 75×256×1.3×1.05 = 26,208 | **212 урона!** |
| Пламя дракона | L3 | 300 | 100% | 300×256×1.3×1.15 = 114,048 | **100 урона!** |
| Огненный шторм | L5 | 1200 | 100% | 500×256×1.3×1.25 = 208,000 | Нет |
| Божественное пламя | L7 | 4800 | 100% | 500×256×1.3×1.35 = 224,640 | Нет |

---

## 🔗 Связи с другими системами

### 1. Lore (start_lore.md)
- qiDensity = 2^(level-1) — геометрический рост
- Эффективность = Ци × Качество — базовая формула

### 2. Combat Techniques (COMBAT_TECHNIQUES_SYSTEM.md)
- Типы техник (melee, ranged, defense)
- Время наполнения = qiCost / conductivity

### 3. Prisma Schema
- `Technique.level`, `maxLevel`, `canEvolve`
- `CharacterTechnique.mastery`, `learningProgress`

---

## ✅ Решение парадокса

```
┌─────────────────────────────────────────────────────────────────────┐
│                       ПАРАДОКС РЕШЁН                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Вопрос: Зачем учить новые техники?                                 │
│                                                                      │
│  Ответ:                                                              │
│  1. Техники низких уровней имеют малую ёмкость                      │
│  2. При превышении ёмкости — дестабилизация и backlash              │
│  3. Высокие техники безопасно обрабатывают больше Ци                │
│  4. Развитие техники повышает ёмкость (требует мастерства)         │
│                                                                      │
│  Итог: Высокие техники необходимы для безопасного использования     │
│        больших объёмов Ци на высоких уровнях культивации            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Реализация (TODO)

1. **Обновить `src/lib/game/combat-system.ts`**
   - Добавить `calculateTechniqueCapacity()`
   - Добавить `checkDestabilization()`
   - Обновить `calculateAttackDamage()`

2. **Обновить `src/lib/game/techniques.ts`**
   - Добавить `canEvolveTechnique()`
   - Добавить `evolveTechnique()`

3. **Обновить Prisma schema**
   - Добавить поле `evolutionProgress` в CharacterTechnique?

4. **Обновить документацию**
   - COMBAT_TECHNIQUES_SYSTEM.md
   - DAMAGE_FORMULAS_PROPOSAL.md

---

*Документ создан: 2026-03-11*
