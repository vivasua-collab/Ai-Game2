# 🧮 Алгоритмы и формулы: Unity Migration

**Версия:** 1.1  
**Дата:** 2026-03-30  
**Статус:** 📋 Дополнено данными из кода  
**Источники:** src/lib/*.ts, src/lib/constants/*.ts

---

## ⚠️ Важно

> **Это ЧЕРНОВИК теоретического документа.**  
> Документ будет перерабатываться в процессе разработки.  
> **НЕТ КОДА** — только теоретические описания алгоритмов.

---

## 📋 Обзор

Документ описывает ключевые алгоритмы и формулы из текущего проекта, которые необходимо реализовать в Unity.

---

## 1️⃣ Система подавления уровнем (Level Suppression)

### 1.1 Проблема

Qi Buffer с поглощением 90% позволяет практику L1 наносить урон практике L8.

### 1.2 Решение

Множитель подавления на основе разницы уровней культивации.

### 1.3 Таблица подавления

| Разница уровней | Normal | Technique | Ultimate |
|-----------------|--------|-----------|----------|
| 0 | ×1.0 | ×1.0 | ×1.0 |
| 1 | ×0.5 | ×0.75 | ×1.0 |
| 2 | ×0.1 | ×0.25 | ×0.5 |
| 3 | ×0.0 | ×0.05 | ×0.25 |
| 4 | ×0.0 | ×0.0 | ×0.1 |
| 5+ | ×0.0 | ×0.0 | ×0.0 |

### 1.4 Формула

```
effectiveAttackerLevel = max(attackerLevel, techniqueLevel)  // для техник
levelDiff = max(0, defenderLevel - effectiveAttackerLevel)
suppression = SUPPRESSION_TABLE[min(5, levelDiff)][attackType]
finalDamage = rawDamage × suppression
```

### 1.5 Типы атак

| Тип | Описание |
|-----|----------|
| normal | Обычная атака без техники |
| technique | Атака техникой (technique.level влияет) |
| ultimate | Ultimate-техника (особый флаг isUltimate) |

---

## 2️⃣ Буфер Ци (Qi Buffer)

### 2.1 Ключевая механика

- **Сырая Ци** — поглощает только 90% урона, 10% ВСЕГДА пробивает
- **Щитовая техника** — поглощает 100% урона, соотношение 1:1

### 2.2 Конфигурация

| Параметр | Сырая Ци | Щитовая техника |
|----------|----------|-----------------|
| Поглощение | 90% | 100% |
| Соотношение Ци:Урон | 3:1 | 1:1 |
| Пробитие | 10% ВСЕГДА | 0% |
| Мин. Ци для активации | 10 | 10 |

### 2.3 Формулы расчёта

**Требуемое Ци для поглощения:**
```
// Сырая Ци
absorbableDamage = damage × 0.90
requiredQi = absorbableDamage × 3.0

// Щит
requiredQi = damage × 1.0
```

**Пробивающий урон:**
```
// Сырая Ци
piercingDamage = damage × 0.10  // 10% ВСЕГДА

// Щит
piercingDamage = 0
```

### 2.4 Примеры

| Сценарий | Урон | Ци до | Ци после | Поглощено | В HP |
|----------|------|-------|----------|-----------|------|
| Сырая Ци, достаточно | 100 | 500 | 230 | 90 | 10 |
| Сырая Ци, мало | 100 | 150 | 0 | 50 | 50 |
| Щит, достаточно | 100 | 500 | 400 | 100 | 0 |
| Щит, мало | 100 | 50 | 0 | 50 | 50 |
| Нет Ци | 100 | 0 | 0 | 0 | 100 |

---

## 3️⃣ Ёмкость техник

### 3.1 Базовая ёмкость по типу

| Тип | Ёмкость |
|-----|---------|
| formation | 80 |
| defense | 72 |
| melee_strike | 64 |
| support | 56 |
| healing | 56 |
| melee_weapon | 48 |
| movement | 40 |
| curse | 40 |
| poison | 40 |
| sensory | 32 |
| ranged_* | 32 |
| cultivation | null (пассивная) |

### 3.2 Формула полной ёмкости

```
capacity = baseCapacity × 2^(level-1) × (1 + mastery × 0.5%)
```

### 3.3 Плотность Ци

```
qiDensity = 2^(cultivationLevel - 1)
```

| Уровень | Плотность |
|---------|-----------|
| 1 | 1 |
| 2 | 2 |
| 3 | 4 |
| 4 | 8 |
| 5 | 16 |
| 6 | 32 |
| 7 | 64 |
| 8 | 128 |
| 9 | 256 |

---

## 4️⃣ Расчёт урона техник

### 4.1 Основная формула

```
finalDamage = capacity × gradeMultiplier × ultimateMultiplier
```

### 4.2 Компоненты

**Capacity:**
```
baseCapacity = getBaseCapacity(techniqueType, combatSubtype)
levelMultiplier = 2^(techniqueLevel - 1)
masteryBonus = 1 + (mastery / 100) × 0.5

capacity = floor(baseCapacity × levelMultiplier × masteryBonus)
```

**Qi Cost:**
```
qiCost = floor(baseCapacity × levelMultiplier)
```

**Grade Multiplier:**
```
gradeMultiplier = GRADE_DAMAGE_MULTIPLIERS[grade]
// common: 1.0, refined: 1.3, perfect: 1.6, transcendent: 2.0
```

**Ultimate Multiplier:**
```
ultimateMultiplier = isUltimate ? 2.0 : 1.0
```

### 4.3 Дестабилизация

При qiInput > capacity:
```
excessQi = qiInput - capacity

// Урон практику
backlashDamage = floor(excessQi × 0.5)

// Урон по цели (только melee!)
targetDamage = isMelee ? floor(qiInput × 0.5) : 0

// Рассеянное Qi
dissipatedQi = excessQi
```

---

## 5️⃣ Пайплайн урона (10 слоёв)

### 5.1 Архитектура

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    ПОРЯДОК ПРОХОЖДЕНИЯ УРОНА (10 СЛОЁВ)                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  СЛОЙ 1: Исходный урон                                                               │
│  rawDamage = capacity × gradeMult × ultimateMult                                     │
│                                      ↓                                               │
│  СЛОЙ 2: Level Suppression                                                           │
│  damage ×= suppressionMultiplier                                                     │
│                                      ↓                                               │
│  СЛОЙ 3: Определение части тела                                                      │
│  hitPart = rollBodyPart()                                                            │
│                                      ↓                                               │
│  СЛОЙ 4: Активная защита                                                             │
│  dodge/parry/block → снижение урона                                                 │
│                                      ↓                                               │
│  СЛОЙ 5: Qi Buffer (только для техник Ци)                                           │
│  90% поглощение сырой Ци / 100% щит                                                  │
│                                      ↓                                               │
│  СЛОЙ 6: Покрытие брони                                                              │
│  if (random() < coverage) → СЛОЙ 7                                                   │
│                                      ↓                                               │
│  СЛОЙ 7: Снижение бронёй                                                             │
│  damage ×= (1 - damageReduction)                                                     │
│  damage -= effectiveArmor × 0.5                                                      │
│                                      ↓                                               │
│  СЛОЙ 8: Материал тела                                                               │
│  damage ×= (1 - materialReduction)                                                   │
│                                      ↓                                               │
│  СЛОЙ 9: Распределение по HP                                                         │
│  redHP -= damage × 0.7                                                               │
│  blackHP -= damage × 0.3                                                             │
│                                      ↓                                               │
│  СЛОЙ 10: Последствия                                                                │
│  кровотечение, шок, оглушение, смерть                                               │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Формулы по слоям

**Слой 4 — Активная защита:**
```
// Уклонение
dodgeChance = 5% + (AGI-10) × 0.5% - armorDodgePenalty

// Парирование
parryChance = weaponParryBonus + (AGI-10) × 0.3%

// Блок щитом
blockChance = shieldBlock + (STR-10) × 0.2%
```

**Слой 6-7 — Броня:**
```
// Покрытие
if (random() < armor.coverage) {
  // Процентное снижение (кап 80%)
  damageReduction = min(0.8, armor.damageReduction + materialBonus + gradeBonus)
  damage *= (1 - damageReduction)
  
  // Плоское вычитание
  penetration = weapon.penetration + attackerSTR × 0.5
  effectiveArmor = max(0, armor.armor - penetration)
  damage = max(1, damage - effectiveArmor × 0.5)
}
```

**Слой 8 — Материал тела:**
```
materialReduction = MATERIAL_DAMAGE_REDUCTION[bodyMaterial]
damage *= (1 - materialReduction)

// Значения:
// flesh: 0%, scaled: 30%, mineral: 50%, ethereal: 70%
```

---

## 6️⃣ Мягкие капы (Soft Caps)

### 6.1 Формула диминишинга

```
effectiveBonus = cap × (1 - e^(-bonus / (cap × decayRate)))
```

### 6.2 Конфигурация капов

| Переменная | Тип капа | Значение | Decay |
|------------|----------|----------|-------|
| speed | absolute | ±50% | 1.5 |
| attack_speed | positive | +75% | 1.2 |
| damage | positive | +100% | 1.0 |
| crit_chance | positive | +50% | 0.8 |
| crit_damage | positive | +150% | 1.0 |
| defense | positive | +80% | 1.2 |
| armor | positive | +200 | 1.5 |
| qi_cost | negative | -50% | 1.0 |
| qi_efficiency | positive | +50% | 1.0 |
| cooldown | negative | -60% | 1.2 |
| life_steal | positive | +30% | 0.8 |

---

## 7️⃣ Система прочности

### 7.1 Состояния

| Состояние | Прочность | Эффективность |
|-----------|-----------|---------------|
| Pristine | 100% | 100% |
| Excellent | 80-99% | 95% |
| Good | 60-79% | 85% |
| Worn | 40-59% | 70% |
| Damaged | 20-39% | 50% |
| Broken | <20% | 20% |

### 7.2 Потеря прочности

**Комбинированный метод:**
```
// Базовый износ
baseLoss = 0.01 × actionCount

// Ударный износ
if (damageAbsorbed > hardness × 10) {
  impactLoss = (damageAbsorbed - threshold) / hardness
}

totalLoss = baseLoss + impactLoss
```

### 7.3 Ремонт

| Метод | Результат |
|-------|-----------|
| NPC-кузнец | 100%, без риска |
| Самостоятельный | До 90%, риск понижения Grade |
| Ци-ремонт | Только для духовных материалов |

---

## 8️⃣ Шансы попадания по частям тела

### 8.1 Базовые шансы (гуманоид)

| Часть тела | Шанс |
|------------|------|
| head | 5% |
| torso | 40% |
| heart | 2% |
| left_arm | 10% |
| right_arm | 10% |
| left_leg | 12% |
| right_leg | 12% |
| left_hand | 4% |
| right_hand | 4% |
| left_foot | 0.5% |
| right_foot | 0.5% |

### 8.2 Модификаторы

**От позиции:**
- Атака сверху: head +10%, legs -10%
- Атака снизу: head -10%, legs +15%
- Атака сбоку: arm (со стороны) +10%

**От оружия:**
- Кинжал: head +3%, heart +2%, hands +3%
- Двуручный меч: torso +10%, arms +5%, head -5%
- Копьё: torso +5%, heart +3%, head -3%

---

## 9️⃣ Расчёт телесного урона (Kenshi-style)

### 9.1 Формула

```
damage = 0.7 × totalDamage  // Красная HP
damage = 0.3 × totalDamage  // Чёрная HP
```

### 9.2 Последствия

| Условие | Эффект |
|---------|--------|
| redHP ≤ 0 | Паралич части тела |
| blackHP ≤ 0 | Отрубание части тела |
| heart HP ≤ 0 | Смерть |
| head HP ≤ 0 | Смерть |

---

## 📁 Файловая структура Unity

### Основные файлы

| Файл | Назначение |
|------|------------|
| `Scripts/Combat/DamageCalculator.cs` | Расчёт урона |
| `Scripts/Combat/LevelSuppression.cs` | Подавление уровнем |
| `Scripts/Combat/QiBuffer.cs` | Буфер Ци |
| `Scripts/Combat/DefenseProcessor.cs` | Обработка защит |
| `Scripts/Combat/TechniqueCapacity.cs` | Ёмкость техник |

### Константы

| Файл | Назначение |
|------|------------|
| `Scripts/Constants/QiDensity.cs` | Таблица плотности Ци |
| `Scripts/Constants/TechniqueCapacity.cs` | Базовые ёмкости |
| `Scripts/Constants/LevelSuppression.cs` | Таблица подавления |
| `Scripts/Constants/SoftCaps.cs` | Мягкие капы |

---

## 🔟 Система элементов

### 10.1 Стихии

| Элемент | Русское название | Противоположность | Сродство |
|---------|------------------|-------------------|----------|
| fire | Огонь | water | air |
| water | Вода | fire | lightning |
| earth | Земля | air | fire |
| air | Воздух | earth | fire, lightning |
| lightning | Молния | earth (одностороннее) | water, air |
| void | Пустота | — | — |
| neutral | Нейтральный | — | — |

### 10.2 Множители эффективности атаки

**Противоположные элементы:**
- Атакующий элемент наносит ×1.5 урона противоположному

**Сродство:**
- Элементы со сродством ослабляют друг друга: ×0.8 урона

**Void:**
- Поглощает все элементы: ×1.2 урона по любому

**Neutral:**
- Базовый множитель: ×1.0 по всем

### 10.3 Эффекты элементов

| Элемент | Возможные эффекты |
|---------|-------------------|
| fire | burning, heat |
| water | freezing, slow, flow |
| earth | shield, knockback, stability, weight |
| air | knockback, slow, speed, lightness |
| lightning | stun, pierce, chain |
| void | pierce, leech, debuff, drain |
| neutral | — |

---

## 1️⃣1️⃣ Масштабирование от характеристик

### 11.1 Коэффициенты по типу атаки

| Тип атаки | Сила | Ловкость | Интеллект |
|-----------|------|----------|-----------|
| melee_strike | +5%/ед | +2.5%/ед | — |
| melee_weapon | +2.5%/ед | +5%/ед | — |
| ranged_projectile | — | +2.5%/ед | +5%/ед |
| ranged_beam | — | +2.5%/ед | +5%/ед |
| ranged_aoe | — | +2.5%/ед | +5%/ед |
| defense_block | — | — | +5%/ед |
| defense_shield | — | — | +5%/ед |
| defense_dodge | — | — | +5%/ед |

### 11.2 Формула масштабирования

```
statBonus = (characterStat - 10) × coefficient

// Пример: melee_strike, STR=15
statBonus = (15 - 10) × 0.05 = 0.25 (+25% урона)
```

---

## 1️⃣2️⃣ Время каста техник

### 12.1 Формула

```
baseTime = qiCost / conductivity
effectiveSpeed = conductivity × (1 + cultivationBonus) × (1 + masteryBonus)
effectiveTime = max(0.1, qiCost / effectiveSpeed)
```

### 12.2 Бонусы

| Источник | Бонус |
|----------|-------|
| Уровень культивации | +5% за уровень выше 1 |
| Мастерство техники | +1% за 1% мастерства |

### 12.3 Пример

```
// qiCost=50, conductivity=2.0, level=3, mastery=50%
cultivationBonus = (3-1) × 0.05 = 0.10
masteryBonus = 0.50
effectiveSpeed = 2.0 × 1.10 × 1.50 = 3.3
baseTime = 50 / 2.0 = 25 сек
effectiveTime = 50 / 3.3 = 15.15 сек
```

---

## 📚 Связанные документы

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Общая архитектура Unity
- [COMBAT_SYSTEM.md](./COMBAT_SYSTEM.md) — Боевая система
- [TECHNIQUE_SYSTEM.md](./TECHNIQUE_SYSTEM.md) — Система техник
- [DATA_MODELS.md](./DATA_MODELS.md) — Модели данных
- [CONFIGURATIONS.md](./CONFIGURATIONS.md) — Конфигурации

---

*Документ создан: 2026-03-30*  
*Статус: Черновик для доработки*  
*Только теория — код будет в отдельных файлах*
