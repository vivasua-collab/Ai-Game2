# ⚔️ Система Оружия и Брони — Теоретические изыскания

**Версия:** 1.0
**Создано:** 2026-03-14
**Статус:** 📋 Теоретические изыскания

---

## 📋 Обзор

Документ содержит теоретический анализ системы оружия и брони для мира культивации. Рассматриваются несколько вариантов реализации каждой механики.

---

## 1️⃣ СИСТЕМА ПРОЧНОСТИ (DURABILITY)

### 1.1 Параметры прочности

```typescript
interface DurabilityProps {
  current: number;      // Текущая прочность (0-max)
  max: number;          // Максимальная прочность
  hardness: number;     // Твёрдость материала (1-10)
  flexibility: number;  // Гибкость (0-1), влияет на шанс сломаться
}
```

### 1.2 Варианты потери прочности

**ВАРИАНТ A: При каждом использовании**
```
durabilityLoss = baseLoss × (1 - flexibility) × hardnessFactor
```
- Каждая атака/блок теряет 0.1-1.0 прочности
- Зависит от материала
- Простая реализация

**ВАРИАНТ B: При получении урона выше порога**
```
if (damageAbsorbed > hardness × 10) {
  durabilityLoss = damageAbsorbed / hardness / 10
}
```
- Прочность теряется только при сильных ударах
- Твёрдые материалы теряют меньше
- Более реалистично

**ВАРИАНТ C: Комбинированный**
```
// Базовый износ
baseLoss = 0.01 × actionCount

// Ударный износ
if (damageAbsorbed > threshold) {
  impactLoss = (damageAbsorbed - threshold) / hardness
}

totalLoss = baseLoss + impactLoss
```

### 1.3 Условия поломки

| Состояние | Прочность | Эффект |
|-----------|-----------|--------|
| Pristine | 100% | Полная эффективность |
| Good | 75-99% | Эффективность × 0.95 |
| Worn | 50-74% | Эффективность × 0.85 |
| Damaged | 25-49% | Эффективность × 0.70 |
| Critical | 1-24% | Эффективность × 0.50, шанс сломаться |
| Broken | 0% | Невозможно использовать |

**Шанс сломаться при Critical:**
```
breakChance = (1 - durability/maxDurability) × 0.1 × hitCount
// При 0% durability: 10% за каждый удар
```

### 1.4 Ремонт

**ВАРИАНТ A: NPC-кузнец**
- Фиксированная стоимость
- Восстановление до 100%
- Требует материалов

**ВАРИАНТ B: Самостоятельный ремонт**
```
repairAmount = skill × materials × time
maxRepair = originalMaxDurability × 0.9 // Теряется 10% макс.
```

**ВАРИАНТ C: Ци-ремонт (для духовного оружия)**
```
qiCost = (maxDurability - currentDurability) × qiDensity
// Высокие уровни культивации могут чинить духовным железом
```

---

## 2️⃣ ОРУЖИЕ И УРОН

### 2.1 Классификация оружия

```typescript
type WeaponClass = 
  | 'unarmed'      // Без оружия (кулаки, когти)
  | 'light'        // Лёгкое (кинжалы, короткие мечи)
  | 'medium'       // Среднее (мечи, топоры, копья)
  | 'heavy'        // Тяжёлое (двуручники, молоты)
  | 'ranged'       // Дальнобойное (луки, арбалеты)
  | 'magic';       // Магическое (посохи, жезлы)
```

### 2.2 Параметры оружия

```typescript
interface WeaponStats {
  // Базовый урон
  baseDamage: number;
  damageType: 'slashing' | 'piercing' | 'blunt' | 'elemental';
  
  // Модификаторы атаки
  attackSpeed: number;      // 0.5-2.0 (количество атак в секунду)
  range: number;            // 0.5-3.0 метра
  penetration: number;      // 0-100 (пробитие брони)
  
  // Требования
  strengthReq: number;      // Минимальная сила
  agilityReq: number;       // Минимальная ловкость
  
  // Прочность
  durability: DurabilityProps;
  
  // Слот 1 интеграция
  techniqueBonus?: {
    damageMultiplier: number;  // Бонус к урону техники
    qiCostReduction: number;   // Снижение стоимости Ци
  };
}
```

### 2.3 Расчёт урона оружия

**ВАРИАНТ A: Аддитивный**
```
totalDamage = handDamage + weaponDamage
handDamage = 3 + (STR-10) × 0.3
weaponDamage = baseWeaponDamage × conditionMultiplier × statScaling
```

**ВАРИАНТ B: Мультипликативный**
```
totalDamage = handDamage × weaponMultiplier
weaponMultiplier = 1 + (weaponDamage / 10)
// Оружие — множитель к руке, не добавка
```

**ВАРИАНТ C: Гибридный**
```
baseDamage = max(handDamage, weaponDamage × 0.5)
bonusDamage = weaponDamage × statScaling
totalDamage = baseDamage + bonusDamage

// Оружие всегда даёт минимум половину своего урона
// Плюс бонус от характеристик
```

### 2.4 Влияние на слот 1 (melee_strike техники)

```typescript
// Оружие с melee_strike техникой
function calculateWeaponTechniqueDamage(
  weapon: Weapon,
  technique: Technique,
  character: Character
): number {
  // Базовый урон техники
  const techDamage = calculateTechniqueDamage(technique, character);
  
  // Бонус от оружия
  const weaponBonus = weapon.baseDamage * (weapon.techniqueBonus?.damageMultiplier || 1);
  
  // Итог
  return techDamage + weaponBonus;
}
```

---

## 3️⃣ БРОНЯ И ЗАЩИТА

### 3.1 Части брони и защищаемые области

| Часть брони | Защищаемые части тела | Слот экипировки |
|-------------|----------------------|-----------------|
| Шлем (armor_head) | head | head |
| Нагрудник (armor_torso) | torso, heart | torso |
| Наручи (armor_arms) | left_arm, right_arm | arms |
| Перчатки (armor_hands) | left_hand, right_hand | hands |
| Поножи (armor_legs) | left_leg, right_leg | legs |
| Сапоги (armor_feet) | left_foot, right_foot | feet |
| Полный доспех (armor_full) | Все части | torso + conflicts |

### 3.2 Параметры брони

```typescript
interface ArmorStats {
  // Защита
  armor: number;           // Базовая броня (1-100)
  damageReduction: number; // Снижение урона % (0-80)
  
  // Покрытие
  coverage: number;        // % площади защищаемой части (50-100)
  
  // Типы урона
  resistances: {
    slashing: number;      // Сопротивление рубящему
    piercing: number;      // Сопротивление колющему
    blunt: number;         // Сопротивление дробящему
    elemental: number;     // Сопротивление стихиям
  };
  
  // Штрафы
  moveSpeedPenalty: number;  // Снижение скорости
  dodgePenalty: number;      // Штраф к уклонению
  qiFlowPenalty: number;     // Штраф к проводимости Ци
  
  // Прочность
  durability: DurabilityProps;
}
```

### 3.3 Порядок расчёта урона (8 слоёв)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ПОРЯДОК РАСЧЁТА УРОНА                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. ИСХОДНЫЙ УРОН                                                        │
│     rawDamage = handDamage + weaponDamage + techniqueDamage              │
│                                                                          │
│  2. ОПРЕДЕЛЕНИЕ ЧАСТИ ТЕЛА                                               │
│     hitPart = rollBodyPartHit(attacker, target)                         │
│                                                                          │
│  3. ПРОВЕРКА УКЛОНЕНИЯ                                                   │
│     if (random() < dodgeChance) → damage = 0, END                       │
│                                                                          │
│  4. ПРОВЕРКА БЛОКА                                                       │
│     if (isBlocking && random() < blockChance) {                         │
│       damage ×= (1 - blockEffectiveness)                                │
│       durabilityLoss++                                                   │
│     }                                                                    │
│                                                                          │
│  5. БРОНЯ ЧАСТИ ТЕЛА                                                     │
│     armor = getEquippedArmorForPart(hitPart)                            │
│     if (random() < armor.coverage) {                                    │
│       damageReduction = calculateArmorReduction(armor, damageType)      │
│       damage ×= (1 - damageReduction)                                   │
│       armor.durability.current -= damage × 0.1                          │
│     }                                                                    │
│                                                                          │
│  6. ПРОБИТИЕ БРОНИ                                                       │
│     penetration = weapon.penetration + attackerSTR × 0.5                │
│     effectiveArmor = max(0, armor.armor - penetration)                  │
│     damage -= effectiveArmor × 0.5                                      │
│                                                                          │
│  7. МАТЕРИАЛ ТЕЛА                                                        │
│     materialReduction = getMaterialReduction(target.bodyMaterial)       │
│     damage ×= (1 - materialReduction)                                   │
│                                                                          │
│  8. ФИНАЛЬНЫЙ УРОН                                                       │
│     finalDamage = max(1, floor(damage))                                 │
│     applyDamageToBodyPart(target, hitPart, finalDamage)                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4️⃣ ШАНСЫ ПОПАДАНИЯ ПО ЧАСТЯМ ТЕЛА

### 4.1 Базовые шансы (гуманоид)

```typescript
const BASE_BODY_PART_CHANCES: Record<BodyPartType, number> = {
  head: 5,        // 5% — маленькая мишень
  torso: 40,      // 40% — большая мишень
  heart: 2,       // 2% — только при открытой груди
  left_arm: 10,   // 10%
  right_arm: 10,  // 10%
  left_leg: 12,   // 12%
  right_leg: 12,  // 12%
  left_hand: 4,   // 4%
  right_hand: 4,  // 4%
  left_foot: 0.5, // 0.5%
  right_foot: 0.5 // 0.5%
};
```

### 4.2 Модификаторы от позиции

```typescript
// Атака сверху (прыжок, полёт)
positionModifier = {
  head: +10,
  torso: -5,
  legs: -10
};

// Атака снизу (подземный монстр)
positionModifier = {
  head: -10,
  legs: +15
};

// Атака сбоку (фланговая)
positionModifier = {
  left_arm: +10,  // если атака слева
  right_arm: +10, // если атака справа
};
```

### 4.3 Модификаторы от размера цели

```typescript
// Маленькая цель (tiny)
sizeModifier = { head: +5, torso: -10 };

// Огромная цель (huge)
sizeModifier = { legs: +10, torso: -10 };
```

### 4.4 Модификаторы от оружия

```typescript
// Кинжал — точные удары
weaponModifier = { head: +3, heart: +2, hands: +3 };

// Двуручный меч — размашистые удары
weaponModifier = { torso: +10, arms: +5, head: -5 };

// Копьё — колющие удары
weaponModifier = { torso: +5, heart: +3, head: -3 };
```

### 4.5 Прицельные удары

```typescript
interface AimedAttack {
  targetPart: BodyPartType;
  accuracyPenalty: number;  // -10% to -50% шанс попадания
  damageBonus: number;      // +10% to +50% урон при успехе
}

// Прицеливание в голову
aimedHead: {
  targetPart: 'head',
  accuracyPenalty: -30,
  damageBonus: +50
};
```

---

## 5️⃣ ЭКИП, НЕ УЧАСТВУЮЩИЙ В БОЮ

### 5.1 Полный список не-боевого эквипа

| Тип | Влияние | Почему не участвует |
|-----|---------|---------------------|
| jewelry_ring | +статы, +Ци | Не закрывает тело |
| jewelry_necklace | +статы, +резисты | Не закрывает тело |
| jewelry_earring | +восприятие | Не закрывает тело |
| jewelry_bracelet | +статы | Не закрывает тело |
| clothing_cloak | +скрытность | Ткань не защищает |
| clothing_belt | +инвентарь | Не закрывает тело |
| tool_crafting | — | Инструмент, не оружие |
| tool_gathering | — | Инструмент, не оружие |
| tool_medical | — | Инструмент, не оружие |
| consumable_* | — | Расходник |
| artifact_passive | +баффы | Артефакт, не броня |

### 5.2 Условное участие

| Тип | Условие участия |
|-----|-----------------|
| artifact_active | Участвует если активирован (дает щит) |
| implant_* | Участвует только: implant_limbs (протез руки/ноги) |
| shield_* | Участвует только при блоке |

---

## 6️⃣ ПЕРВИЧНЫЙ УРОН И ЕГО УМЕНЬШЕНИЕ

### 6.1 Слои защиты (5 слоёв)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        СЛОИ ЗАЩИТЫ (порядок)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  СЛОЙ 1: Активная защита (выбор игрока)                                  │
│  ├── Уклонение (dodge) → 0 урона при успехе                             │
│  ├── Блок щитом (shield block) → absorbedDamage, durability--          │
│  └── Парирование (parry) → counter-attack chance                        │
│                                                                          │
│  СЛОЙ 2: Пассивная защита Ци                                             │
│  ├── meridianBuffer → до 30% урона поглощается Ци                       │
│  └── qiShield (активная техника) → поглощает до shieldHP                │
│                                                                          │
│  СЛОЙ 3: Физическая броня                                                │
│  ├── coverage check → броня работает только при попадании              │
│  ├── damageReduction → % снижения урона                                 │
│  └── armor value → плоское вычитание урона                              │
│                                                                          │
│  СЛОЙ 4: Тело цели                                                       │
│  ├── materialReduction → кожа/чешуя/призрак                             │
│  ├── vitalityMultiplier → высокое vitality = больше HP                 │
│  └── cultivationBonus → культивация усиливает тело                      │
│                                                                          │
│  СЛОЙ 5: Внутренние механики                                             │
│  ├── redHP → функциональность части тела                                │
│  └── blackHP → структурная целостность                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Что получает первичный урон

**ВАРИАНТ A: redHP сначала**
```
// Урон сначала идёт в функциональную HP
// При достижении 0 redHP — часть тела парализована
// Избыток урона идёт в blackHP
if (damage > redHP) {
  overflowDamage = damage - redHP;
  redHP = 0;
  blackHP -= overflowDamage;
} else {
  redHP -= damage;
}
```

**ВАРИАНТ B: blackHP сначала (реалистичный)**
```
// Урон сначала идёт в структурную HP
// При достижении 0 blackHP — часть отрублена
// redHP снижается пропорционально blackHP
blackHP -= damage;
redHP = min(redHP, blackHP × 0.5);
```

**ВАРИАНТ C: Распределённый (Kenshi-style)**
```
// Урон распределяется: 70% в redHP, 30% в blackHP
redHP -= damage × 0.7;
blackHP -= damage × 0.3;

// При критических повреждениях
if (blackHP < maxBlackHP × 0.3) {
  // Ускоренная потеря redHP (шок)
  redHP -= damage × 0.2;
}
```

---

## 7️⃣ ПРИМЕРЫ РАСЧЁТА

### Пример 1: Удар мечом по бронированному человеку

```
Исходные данные:
- Атакующий: STR 20, меч (baseDamage 15, penetration 10)
- Цель: torso, железная броня (armor 30, coverage 80%, DR 20%)
- Урон: handDamage(6) + weaponDamage(15) = 21

Расчёт:
1. Roll bodyPart → torso (40% шанс)
2. Roll coverage → броня работает (80% шанс)
3. damageReduction = 21 × 0.2 = 4.2
4. damage = 21 - 4.2 = 16.8
5. penetration = 10 + (20-10) × 0.5 = 15
6. effectiveArmor = max(0, 30 - 15) = 15
7. damage = 16.8 - 15 × 0.5 = 9.3
8. finalDamage = max(1, floor(9.3)) = 9

Броня теряет: 9 × 0.1 = 0.9 прочности
```

### Пример 2: Удар кулаком по дракону

```
Исходные данные:
- Атакующий: STR 15, без оружия
- Цель: scales (materialReduction 30%), vitality 200
- Урон: handDamage = 3 + (15-10) × 0.3 = 4.5

Расчёт:
1. damage = 4.5
2. materialReduction = 4.5 × 0.3 = 1.35
3. damage = 4.5 - 1.35 = 3.15
4. finalDamage = max(1, floor(3.15)) = 3

Дракон почти не чувствует удара!
```

### Пример 3: Техника с оружием

```
Исходные данные:
- Атакующий: L5 культиватор, STR 25
- Оружие: Меч Дракона (baseDamage 50, techniqueBonus ×1.5)
- Техника: "Рубящий вихрь" L5 (baseDamage 75, qiCost 100)

Расчёт:
1. Техника: qiDensity = 16 (L5)
   effectiveness = 100 × 16 = 1600
   
2. Урон техники: 75 × (1 + 1600/1000) = 195

3. Бонус оружия: 50 × 1.5 = 75

4. Итоговый урон: 195 + 75 = 270
```

---

## 8️⃣ РЕКОМЕНДУЕМЫЕ ВАРИАНТЫ

На основе анализа рекомендуется:

| Механика | Рекомендуемый вариант | Обоснование |
|----------|----------------------|-------------|
| Потеря прочности | **ВАРИАНТ C** (Комбинированный) | Реалистичный + не слишком быстрый износ |
| Ремонт | **ВАРИАНТ B + C** | Самостоятельный + Ци-ремонт для высоких уровней |
| Урон оружия | **ВАРИАНТ C** (Гибридный) | Баланс между рукой и оружием |
| Распределение HP | **ВАРИАНТ C** (Kenshi-style) | Проверенная механика |

---

## 🔗 Связанные документы

- [equip.md](./equip.md) — Типы экипировки, слоты, материалы
- [body.md](./body.md) — Система тела, части тела, HP
- [combat-system.md](./combat-system.md) — Боевая система
- [DAMAGE_FORMULAS_PROPOSAL.md](./DAMAGE_FORMULAS_PROPOSAL.md) — Формулы урона
- [technique-system.md](./technique-system.md) — Техники, мастерство
- [vitality-hp-system.md](./vitality-hp-system.md) — Vitality и HP частей тела

---

*Документ создан: 2026-03-14*
*Статус: Теоретические изыскания для планирования*
