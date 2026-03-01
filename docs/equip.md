# ⚔️ Система Экипировки и Брони

**Версия:** 1.0  
**Создано:** 2026-02-28  
**Статус:** Черновик

---

## 📋 Обзор

Документ описывает систему экипировки, брони и снаряжения для:
- **Игроков** — экипировка персонажа
- **NPC** — снаряжение неигровых персонажей
- **Монстров** — естественная броня и артефакты

### Связь с концепцией тела

Экипировка связывается с **частями тела** (BodyPart) и может:
- Защищать определённые части (броня)
- Усиливать части (перчатки → урон рук)
- Заменять функции (протез вместо руки)

---

## 🏗️ Архитектура системы

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ЭКИПИРОВКА (Equipment)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    0. ТИП ЭКИПИРОВКИ (Type)                       │   │
│  │  ├── wearable     — Носимое (броня, одежда, украшения)           │   │
│  │  ├── consumable   — Расходуемое (таблетки, свитки)               │   │
│  │  ├── weapon       — Оружие                                       │   │
│  │  ├── artifact     — Артефакт (постоянный эффект)                 │   │
│  │  ├── tool         — Инструмент (многоразовое использование)      │   │
│  │  └── implant      — Имплант (вживляется в тело)                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    1. РЕДКОСТЬ (Rarity)                           │   │
│  │  ├── common       — Обычная • 0-1 доп. параметров                │   │
│  │  ├── uncommon     — Необычная • 1-2 доп. параметров              │   │
│  │  ├── rare         — Редкая • 2-3 доп. параметров                 │   │
│  │  ├── legendary    — Легендарная • 3-5 доп. параметров            │   │
│  │  └── divine       — Божественная • 5-8 доп. параметров           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    2. ФИЗИКА (Physical)                           │   │
│  │  ├── weight       — Вес (кг)                                     │   │
│  │  ├── size         — Размер (tiny/small/medium/large/huge)        │   │
│  │  ├── durability   — Прочность                                    │   │
│  │  └── material     — Материал                                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    3. БОНУСЫ (Bonuses)                            │   │
│  │  ├── stats        — К характеристикам (сила, ловкость, ...)      │   │
│  │  ├── combat       — К боевые параметры (урон, защита, ...)       │   │
│  │  ├── cultivation  — К культивации (проводимость, Ци, ...)        │   │
│  │  └── special      — Особые эффекты                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    4. ТЕХНИКИ (Techniques)                        │   │
│  │  ├── granted      — Даруемые техники                             │   │
│  │  ├── charges      — Количество зарядов                           │   │
│  │  ├── recharge     — Перезарядка (Ци, время, квест)               │   │
│  │  └── requirements — Требования для использования                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    5. ДОПОЛНИТЕЛЬНОЕ (Additional)                 │   │
│  │  ├── slots        — Слоты экипировки                             │   │
│  │  ├── requirements — Требования к носителю                        │   │
│  │  ├── set_bonuses  — Сетовые бонусы                               │   │
│  │  ├── enhancement  — Улучшение/заточка                            │   │
│  │  └── degradation  — Износ и ремонт                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 0️⃣ ТИП ЭКИПИРОВКИ (Equipment Type)

### 0.1 Основные типы

```typescript
type EquipmentType = 
  | 'wearable'     // Носимое
  | 'weapon'       // Оружие
  | 'consumable'   // Расходуемое
  | 'artifact'     // Артефакт
  | 'tool'         // Инструмент
  | 'implant';     // Имплант
```

### 0.2 Носимое (Wearable)

Подтипы носимого снаряжения:

```typescript
type WearableSubtype = 
  // === БРОНЯ ===
  | 'armor_head'       // Шлем / головной убор
  | 'armor_torso'      // Нагрудник / кираса
  | 'armor_arms'       // Наручи / наручи
  | 'armor_hands'      // Перчатки / рукавицы
  | 'armor_legs'       // Поножи / набедренники
  | 'armor_feet'       // Сапоги / обувь
  | 'armor_full'       // Полный доспех (занимает все слоты)
  
  // === ОДЕЖДА ===
  | 'clothing_head'    // Капюшон, шляпа
  | 'clothing_body'    // Робa, плащ, куртка
  | 'clothing_cloak'   // Плащ (поверх всего)
  | 'clothing_belt'    // Пояс
  
  // === УКРАШЕНИЯ ===
  | 'jewelry_ring'     // Кольцо
  | 'jewelry_necklace' // Ожерелье / амулет
  | 'jewelry_earring'  // Серьга
  | 'jewelry_bracelet' // Браслет
  
  // === ЩИТЫ ===
  | 'shield_small'     // Малый щит (баклер)
  | 'shield_medium'    // Средний щит
  | 'shield_large'     // Большой щит (павеза)
  | 'shield_tower';    // Башенный щит
```

### 0.3 Оружие (Weapon)

```typescript
type WeaponSubtype =
  // === БЛИЖНИЙ БОЙ ===
  | 'weapon_unarmed'     // Кастеты, когти
  | 'weapon_dagger'      // Кинжал
  | 'weapon_sword'       // Меч
  | 'weapon_greatsword'  // Двуручный меч
  | 'weapon_axe'         // Топор
  | 'weapon_mace'        // Булава
  | 'weapon_spear'       // Копьё
  | 'weapon_staff'       // Посох
  | 'weapon_polearm'     // Древковое оружие
  
  // === ДАЛЬНИЙ БОЙ ===
  | 'weapon_bow'         // Лук
  | 'weapon_crossbow'    // Арбалет
  | 'weapon_thrown'      // Метательное оружие
  
  // === МАГИЧЕСКОЕ ===
  | 'weapon_focus'       // Магический фокус (орб, жезл)
  | 'weapon_talisman'    // Талисман
  | 'weapon_seal';       // Печать
```

### 0.4 Расходуемое (Consumable)

```typescript
type ConsumableSubtype =
  | 'consumable_pill'      // Таблетка
  | 'consumable_potion'    // Зелье
  | 'consumable_scroll'    // Свиток (одноразовая техника)
  | 'consumable_talisman'  // Талисман (одноразовый эффект)
  | 'consumable_food'      // Еда
  | 'consumable_drink';    // Напиток
```

### 0.5 Артефакт (Artifact)

```typescript
type ArtifactSubtype =
  | 'artifact_passive'     // Пассивный эффект при ношении
  | 'artifact_active'      // Активируемый эффект
  | 'artifact_soulbound'   // Связанный с душой
  | 'artifact_cursed';     // Проклятый (нельзя снять)
```

### 0.6 Инструмент (Tool)

```typescript
type ToolSubtype =
  | 'tool_crafting'     // Ремесленный инструмент
  | 'tool_gathering'    // Инструмент сбора
  | 'tool_exploration'  // Инструмент исследования
  | 'tool_medical';     // Медицинский инструмент
```

### 0.7 Имплант (Implant)

```typescript
type ImplantSubtype =
  | 'implant_eye'       // Глазной имплант
  | 'implant_limbs'     // Конечность (протез)
  | 'implant_internal'  // Внутренний орган
  | 'implant_neural'    // Нейронный имплант
  | 'implant_core';     // Имплант ядра
```

---

## 1️⃣ РЕДКОСТЬ (Rarity)

### 1.1 Уровни редкости

```typescript
type EquipmentRarity = 
  | 'common'      // Обычная
  | 'uncommon'    // Необычная
  | 'rare'        // Редкая
  | 'legendary'   // Легендарная
  | 'divine';     // Божественная
```

### 1.2 Влияние редкости на параметры

```typescript
interface RarityProperties {
  name: string;
  color: string;              // Цвет в UI
  minBonusStats: number;      // Мин. бонусов к характеристикам
  maxBonusStats: number;      // Макс. бонусов к характеристикам
  minSpecialEffects: number;  // Мин. особых эффектов
  maxSpecialEffects: number;  // Макс. особых эффектов
  minGrantedTechniques: number; // Мин. даруемых техник
  maxGrantedTechniques: number; // Макс. даруемых техник
  dropChance: number;         // Шанс выпадения (%)
  maxEnhancementLevel: number; // Макс. уровень улучшения
}

const RARITY_PROPERTIES: Record<EquipmentRarity, RarityProperties> = {
  common: {
    name: 'Обычная',
    color: 'text-gray-400',
    minBonusStats: 0,
    maxBonusStats: 1,
    minSpecialEffects: 0,
    maxSpecialEffects: 0,
    minGrantedTechniques: 0,
    maxGrantedTechniques: 0,
    dropChance: 60,
    maxEnhancementLevel: 3,
  },
  uncommon: {
    name: 'Необычная',
    color: 'text-green-400',
    minBonusStats: 1,
    maxBonusStats: 2,
    minSpecialEffects: 0,
    maxSpecialEffects: 1,
    minGrantedTechniques: 0,
    maxGrantedTechniques: 1,
    dropChance: 25,
    maxEnhancementLevel: 5,
  },
  rare: {
    name: 'Редкая',
    color: 'text-blue-400',
    minBonusStats: 2,
    maxBonusStats: 3,
    minSpecialEffects: 1,
    maxSpecialEffects: 2,
    minGrantedTechniques: 0,
    maxGrantedTechniques: 1,
    dropChance: 10,
    maxEnhancementLevel: 7,
  },
  legendary: {
    name: 'Легендарная',
    color: 'text-amber-400',
    minBonusStats: 3,
    maxBonusStats: 5,
    minSpecialEffects: 2,
    maxSpecialEffects: 3,
    minGrantedTechniques: 1,
    maxGrantedTechniques: 2,
    dropChance: 4,
    maxEnhancementLevel: 9,
  },
  divine: {
    name: 'Божественная',
    color: 'text-purple-400',
    minBonusStats: 5,
    maxBonusStats: 8,
    minSpecialEffects: 3,
    maxSpecialEffects: 5,
    minGrantedTechniques: 2,
    maxGrantedTechniques: 3,
    dropChance: 1,
    maxEnhancementLevel: 12,
  },
};
```

### 1.3 Генерация параметров по редкости

```typescript
function generateBonusStats(rarity: EquipmentRarity): EquipmentBonus[] {
  const props = RARITY_PROPERTIES[rarity];
  const numStats = randomInt(props.minBonusStats, props.maxBonusStats);
  
  const availableStats: EquipmentBonusType[] = [
    'strength', 'agility', 'intelligence', 'vitality',
    'conductivity', 'qiMax', 'qiRegen', 'healthMax',
    'armor', 'damage', 'critChance', 'critDamage',
  ];
  
  const bonuses: EquipmentBonus[] = [];
  const usedStats = new Set<string>();
  
  for (let i = 0; i < numStats; i++) {
    const available = availableStats.filter(s => !usedStats.has(s));
    const stat = randomChoice(available);
    usedStats.add(stat);
    
    const value = generateStatValue(stat, rarity);
    bonuses.push({ type: stat, value, isPercent: isPercentStat(stat) });
  }
  
  return bonuses;
}

function generateStatValue(stat: string, rarity: EquipmentRarity): number {
  const baseValues: Record<string, number> = {
    strength: 2,
    agility: 2,
    intelligence: 2,
    vitality: 2,
    conductivity: 0.1,
    qiMax: 50,
    qiRegen: 0.5,
    healthMax: 10,
    armor: 2,
    damage: 3,
    critChance: 2,
    critDamage: 5,
  };
  
  const rarityMultipliers: Record<EquipmentRarity, number> = {
    common: 1.0,
    uncommon: 1.5,
    rare: 2.0,
    legendary: 3.0,
    divine: 5.0,
  };
  
  const base = baseValues[stat] || 1;
  const mult = rarityMultipliers[rarity];
  const variance = 0.2; // ±20%
  
  return base * mult * (1 + (Math.random() * 2 - 1) * variance);
}
```

---

## 2️⃣ ФИЗИКА (Physical Properties)

### 2.1 Вес и размеры

```typescript
interface PhysicalProperties {
  // === ВЕС ===
  weight: number;              // Вес (кг)
  weightClass: WeightClass;    // Класс веса
  
  // === РАЗМЕР ===
  size: EquipmentSize;         // Размер
  volume: number;              // Объём (литры)
  
  // === ПРОЧНОСТЬ ===
  durability: DurabilityProps;
  
  // === МАТЕРИАЛ ===
  material: MaterialType;
  materialQuality: number;     // Качество материала (1-10)
}

type WeightClass = 
  | 'negligible'  // Пренебрежимый (< 0.1 кг)
  | 'light'       // Лёгкий (0.1 - 2 кг)
  | 'medium'      // Средний (2 - 10 кг)
  | 'heavy'       // Тяжёлый (10 - 30 кг)
  | 'very_heavy'  // Очень тяжёлый (30 - 100 кг)
  | 'massive';    // Массивный (100+ кг)

type EquipmentSize = 
  | 'tiny'        // Крошечный (кольцо, таблетка)
  | 'small'       // Маленький (кинжал, перчатки)
  | 'medium'      // Средний (меч, шлем)
  | 'large'       // Большой (двуручник, полная броня)
  | 'huge';       // Огромный (осадное орудие)
```

### 2.2 Влияние веса

```typescript
interface WeightEffects {
  // Штраф к скорости
  speedPenalty: number;        // % снижения скорости
  
  // Штраф к уклонению
  dodgePenalty: number;        // % снижения уклонения
  
  // Бонус к стабильности
  stabilityBonus: number;      // % сопротивления отбрасыванию
  
  // Усталость при ношении
  fatiguePerHour: number;      // % усталости в час
  
  // Требования к силе
  strengthRequirement: number; // Минимальная сила
}

function calculateWeightEffects(
  weight: number, 
  characterStrength: number
): WeightEffects {
  const basePenalty = Math.max(0, (weight - 5) / 50); // 1% за каждые 0.5 кг сверх 5 кг
  
  // Сила снижает штрафы
  const strengthReduction = Math.max(0, characterStrength - 10) * 0.05; // 5% за каждую единицу силы выше 10
  
  const effectivePenalty = Math.max(0, basePenalty * (1 - strengthReduction));
  
  return {
    speedPenalty: effectivePenalty,
    dodgePenalty: effectivePenalty * 0.5,
    stabilityBonus: Math.min(50, weight / 2), // 1% за каждые 2 кг
    fatiguePerHour: Math.max(0, (weight - 20) * 0.1), // Усталость при весе > 20 кг
    strengthRequirement: Math.floor(weight / 3),
  };
}
```

### 2.3 Прочность

```typescript
interface DurabilityProps {
  current: number;             // Текущая прочность
  max: number;                 // Максимальная прочность
  degradationRate: number;     // Скорость износа (% за использование)
  repairCost: number;          // Стоимость ремонта (духовные камни)
  
  // Состояние
  condition: EquipmentCondition;
}

type EquipmentCondition = 
  | 'pristine'    // Идеальное (100%)
  | 'excellent'   // Отличное (80-99%)
  | 'good'        // Хорошее (60-79%)
  | 'worn'        // Поношенное (40-59%)
  | 'damaged'     // Повреждённое (20-39%)
  | 'broken';     // Сломанное (< 20%)

// Влияние состояния на эффективность
function getConditionMultiplier(condition: EquipmentCondition): number {
  const multipliers: Record<EquipmentCondition, number> = {
    pristine: 1.0,
    excellent: 0.95,
    good: 0.85,
    worn: 0.7,
    damaged: 0.5,
    broken: 0.2,
  };
  return multipliers[condition];
}
```

### 2.4 Материалы

```typescript
type MaterialType = 
  // === ОРГАНИЧЕСКИЕ ===
  | 'leather'      // Кожа
  | 'silk'         // Шёлк
  | 'cloth'        // Ткань
  | 'bone'         // Кость
  | 'wood'         // Дерево
  
  // === МЕТАЛЛЫ ===
  | 'iron'         // Железо
  | 'steel'        // Сталь
  | 'bronze'       // Бронза
  | 'silver'       // Серебро
  | 'gold'         // Золото
  
  // === ОСОБЫЕ ===
  | 'spirit_iron'     // Духовное железо
  | 'cold_iron'       // Холодное железо
  | 'star_metal'      // Звёздный металл
  | 'dragon_bone'     // Кость дракона
  | 'spirit_crystal'  // Духовный кристалл
  
  // === МАГИЧЕСКИЕ ===
  | 'void_matter'     // Материя пустоты
  | 'elemental'       // Элементальная материя
  | 'chaos_matter';   // Материя хаоса

interface MaterialProperties {
  name: string;
  baseArmor: number;          // Базовая броня
  baseDurability: number;     // Базовая прочность
  weightMultiplier: number;   // Множитель веса
  qiConductivity: number;     // Проводимость Ци
  elementalAffinity?: PresetElement; // Элементальное сродство
  specialProperties: string[];
}

const MATERIALS: Record<MaterialType, MaterialProperties> = {
  leather: {
    name: 'Кожа',
    baseArmor: 5,
    baseDurability: 50,
    weightMultiplier: 0.8,
    qiConductivity: 0.8,
    specialProperties: ['flexible', 'quiet'],
  },
  steel: {
    name: 'Сталь',
    baseArmor: 15,
    baseDurability: 100,
    weightMultiplier: 1.0,
    qiConductivity: 0.5,
    specialProperties: ['sturdy', 'magnetic'],
  },
  spirit_iron: {
    name: 'Духовное железо',
    baseArmor: 25,
    baseDurability: 150,
    weightMultiplier: 0.7,
    qiConductivity: 1.5,
    specialProperties: ['qi_reactive', 'self_repair'],
  },
  dragon_bone: {
    name: 'Кость дракона',
    baseArmor: 40,
    baseDurability: 300,
    weightMultiplier: 0.5,
    qiConductivity: 3.0,
    elementalAffinity: 'neutral',
    specialProperties: ['indestructible', 'qi_amplifier', 'ancient'],
  },
  // ... другие материалы
};
```

---

## 3️⃣ БОНУСЫ (Bonuses)

### 3.1 Типы бонусов

```typescript
type EquipmentBonusType = 
  // === ХАРАКТЕРИСТИКИ ===
  | 'strength'           // Сила
  | 'agility'            // Ловкость
  | 'intelligence'       // Интеллект
  | 'vitality'           // Жизненная сила
  
  // === ЦИ И КУЛЬТИВАЦИЯ ===
  | 'qiMax'              // Максимальная Ци
  | 'qiRegen'            // Регенерация Ци (%/час)
  | 'conductivity'       // Проводимость меридиан
  | 'coreCapacity'       // Ёмкость ядра
  | 'breakthroughChance' // Шанс прорыва (%)
  
  // === БОЕВЫЕ ===
  | 'damage'             // Урон
  | 'armor'              // Броня
  | 'armorPenetration'   // Пробитие брони
  | 'critChance'         // Шанс крита
  | 'critDamage'         // Крит. урон
  | 'dodgeChance'        // Шанс уклонения
  | 'blockChance'        // Шанс блока
  | 'blockEffectiveness' // Эффективность блока
  
  // === ЗАЩИТНЫЕ ===
  | 'healthMax'          // Максимальное здоровье
  | 'healthRegen'        // Регенерация здоровья
  | 'resistance_physical' // Сопротивление физике
  | 'resistance_fire'    // Сопротивление огню
  | 'resistance_water'   // Сопротивление воде
  | 'resistance_earth'   // Сопротивление земле
  | 'resistance_air'     // Сопротивление воздуху
  | 'resistance_void'    // Сопротивление пустоте
  
  // === СПЕЦИАЛЬНЫЕ ===
  | 'moveSpeed'          // Скорость движения
  | 'attackSpeed'        // Скорость атаки
  | 'castSpeed'          // Скорость каста
  | 'perception'         // Восприятие
  | 'stealth'            // Скрытность
  | 'intimidation';      // Запугивание

interface EquipmentBonus {
  type: EquipmentBonusType;
  value: number;
  isPercent: boolean;         // true = процентный, false = абсолютный
  condition?: BonusCondition; // Условие активации
}

interface BonusCondition {
  type: 'combat' | 'cultivation' | 'time' | 'location' | 'enemy_type';
  value: any;
}
```

### 3.2 Структура бонусов экипировки

```typescript
interface EquipmentBonuses {
  // === БАЗОВЫЕ БОНУСЫ ===
  stats: EquipmentBonus[];
  
  // === УСЛОВНЫЕ БОНУСЫ ===
  conditional: {
    inCombat?: EquipmentBonus[];      // Активны в бою
    outOfCombat?: EquipmentBonus[];   // Активны вне боя
    atNight?: EquipmentBonus[];       // Активны ночью
    atDay?: EquipmentBonus[];         // Активны днём
    lowHealth?: EquipmentBonus[];     // При низком HP
    fullQi?: EquipmentBonus[];        // При полной Ци
  };
  
  // === БОНУСЫ К ЧАСТЯМ ТЕЛА ===
  bodyPartBonuses?: {
    partId: string;
    bonuses: EquipmentBonus[];
  }[];
  
  // === БОНУСЫ К ТЕХНИКАМ ===
  techniqueBonuses?: {
    techniqueType?: TechniqueType;    // Тип техники
    element?: PresetElement;          // Элемент
    bonus: {
      damageMultiplier?: number;
      costReduction?: number;
      castSpeedMultiplier?: number;
    };
  }[];
}
```

### 3.3 Примеры бонусов

```typescript
// Пример: Кольцо силы
const ringOfStrength: EquipmentBonuses = {
  stats: [
    { type: 'strength', value: 5, isPercent: false },
    { type: 'critDamage', value: 10, isPercent: true },
  ],
};

// Пример: Огненный амулет
const fireAmulet: EquipmentBonuses = {
  stats: [
    { type: 'resistance_fire', value: 30, isPercent: true },
    { type: 'intelligence', value: 3, isPercent: false },
  ],
  techniqueBonuses: [
    {
      element: 'fire',
      bonus: {
        damageMultiplier: 1.25, // +25% урона к огненным техникам
      },
    },
  ],
};

// Пример: Боевая броня
const battleArmor: EquipmentBonuses = {
  stats: [
    { type: 'armor', value: 50, isPercent: false },
    { type: 'healthMax', value: 100, isPercent: false },
    { type: 'strength', value: 5, isPercent: false },
  ],
  conditional: {
    inCombat: [
      { type: 'critChance', value: 5, isPercent: true },
    ],
  },
};
```

---

## 4️⃣ ТЕХНИКИ (Granted Techniques)

### 4.1 Структура даруемых техник

```typescript
interface GrantedTechnique {
  techniqueId: string;         // ID техники
  
  // === ЗАРЯДЫ ===
  charges: ChargeSystem;
  
  // === ТРЕБОВАНИЯ ===
  requirements?: {
    cultivationLevel?: number;
    minStat?: { stat: string; value: number };
    qiCost?: number;           // Ци для активации
    healthCost?: number;       // HP для активации
  };
  
  // === МОДИФИКАТОРЫ ===
  modifiers?: {
    damageMultiplier?: number;
    costMultiplier?: number;
    cooldownMultiplier?: number;
    addedEffects?: TechniqueEffects;
  };
  
  // === АВТОАКТИВАЦИЯ ===
  autoActivate?: {
    trigger: 'onHit' | 'onDamage' | 'onLowHealth' | 'onBreakthrough';
    chance: number;            // % шанс автоактивации
  };
}

interface ChargeSystem {
  current: number;             // Текущие заряды
  max: number;                 // Максимальные заряды
  
  // === ПЕРЕЗАРЯДКА ===
  recharge: RechargeType;
}

type RechargeType = 
  | { type: 'none' }           // Не перезаряжается
  | { type: 'time'; hours: number } // Перезарядка временем
  | { type: 'qi'; amount: number }  // Перезарядка Ци
  | { type: 'spirit_stone'; amount: number } // Перезарядка камнями
  | { type: 'combat'; perKill: number } // Перезарядка за убийства
  | { type: 'meditation'; hours: number } // Перезарядка медитацией
  | { type: 'event'; eventId: string }; // Перезарядка событием
```

### 4.2 Примеры

```typescript
// Пример: Свиток Огненного шара (одноразовый)
const fireScroll: GrantedTechnique = {
  techniqueId: 'fire_ball',
  charges: {
    current: 1,
    max: 1,
    recharge: { type: 'none' },
  },
  requirements: {
    cultivationLevel: 1,
    qiCost: 10, // Дополнительная Ци для активации свитка
  },
  modifiers: {
    damageMultiplier: 0.8, // На 20% слабее базовой техники
  },
};

// Пример: Посох Молний (перезаряжается Ци)
const lightningStaff: GrantedTechnique = {
  techniqueId: 'lightning_bolt',
  charges: {
    current: 3,
    max: 5,
    recharge: { type: 'qi', amount: 50 }, // 50 Ци за заряд
  },
  requirements: {
    cultivationLevel: 3,
    qiCost: 20,
  },
  modifiers: {
    damageMultiplier: 1.2, // На 20% сильнее
  },
};

// Пример: Защитный амулет (автоактивация)
const protectiveAmulet: GrantedTechnique = {
  techniqueId: 'emergency_shield',
  charges: {
    current: 1,
    max: 1,
    recharge: { type: 'time', hours: 24 },
  },
  autoActivate: {
    trigger: 'onLowHealth', // При HP < 20%
    chance: 100,
  },
};

// Пример: Меч Крови (перезарядка за убийства)
const bloodSword: GrantedTechnique = {
  techniqueId: 'blood_drain',
  charges: {
    current: 0,
    max: 10,
    recharge: { type: 'combat', perKill: 1 },
  },
  requirements: {
    qiCost: 5,
  },
};
```

### 4.3 Интеграция с боевой системой

```typescript
// Использование даруемой техники
function useGrantedTechnique(
  equipment: Equipment,
  grantedTech: GrantedTechnique,
  character: Character,
  target?: Entity
): TechniqueResult {
  // 1. Проверка зарядов
  if (grantedTech.charges.current <= 0) {
    return { success: false, error: 'Нет зарядов' };
  }
  
  // 2. Проверка требований
  if (grantedTech.requirements) {
    const req = grantedTech.requirements;
    
    if (req.cultivationLevel && character.cultivationLevel < req.cultivationLevel) {
      return { success: false, error: `Требуется уровень культивации ${req.cultivationLevel}` };
    }
    
    if (req.qiCost && character.currentQi < req.qiCost) {
      return { success: false, error: 'Недостаточно Ци' };
    }
  }
  
  // 3. Получаем базовую технику
  const baseTechnique = getTechniquePresetById(grantedTech.techniqueId);
  if (!baseTechnique) {
    return { success: false, error: 'Техника не найдена' };
  }
  
  // 4. Применяем модификаторы
  const modifiedTechnique = applyTechniqueModifiers(baseTechnique, grantedTech.modifiers);
  
  // 5. Выполняем технику
  const result = executeTechnique(modifiedTechnique, character, target);
  
  // 6. Тратим заряд и Ци
  grantedTech.charges.current--;
  if (grantedTech.requirements?.qiCost) {
    character.currentQi -= grantedTech.requirements.qiCost;
  }
  
  return result;
}

// Перезарядка техник
function rechargeGrantedTechnique(
  grantedTech: GrantedTechnique,
  character: Character,
  method: RechargeType
): boolean {
  const recharge = grantedTech.charges.recharge;
  
  // Проверка типа перезарядки
  if (method.type !== (recharge as any).type) {
    return false;
  }
  
  // Проверка на полную зарядку
  if (grantedTech.charges.current >= grantedTech.charges.max) {
    return false;
  }
  
  switch (recharge.type) {
    case 'qi':
      if (character.currentQi >= recharge.amount) {
        character.currentQi -= recharge.amount;
        grantedTech.charges.current++;
        return true;
      }
      break;
      
    case 'spirit_stone':
      if (character.spiritStones >= recharge.amount) {
        character.spiritStones -= recharge.amount;
        grantedTech.charges.current++;
        return true;
      }
      break;
      
    case 'time':
    case 'meditation':
      // Обрабатывается системой времени
      break;
      
    case 'combat':
      // Обрабатывается при убийстве врага
      grantedTech.charges.current = Math.min(
        grantedTech.charges.max,
        grantedTech.charges.current + recharge.perKill
      );
      break;
  }
  
  return false;
}
```

---

## 5️⃣ ДОПОЛНИТЕЛЬНОЕ (Additional Properties)

### 5.1 Слоты экипировки

```typescript
type EquipmentSlot = 
  // === ОСНОВНЫЕ ===
  | 'head'         // Голова
  | 'torso'        // Торс
  | 'arms'         // Руки (наручи)
  | 'hands'        // Кисти (перчатки)
  | 'legs'         // Ноги
  | 'feet'         // Ступни
  
  // === ОДЕЖДА ===
  | 'body'         // Тело (роба, куртка)
  | 'cloak'        // Плащ (поверх)
  | 'belt'         // Пояс
  
  // === УКРАШЕНИЯ ===
  | 'ring_left'    // Кольцо левое
  | 'ring_right'   // Кольцо правое
  | 'necklace'     // Ожерелье
  | 'earring'      // Серьга
  
  // === ОРУЖИЕ ===
  | 'weapon_main'  // Основная рука
  | 'weapon_off'   // Вторичная рука
  | 'weapon_twohanded' // Двуручное оружие
  
  // === ИНВЕНТАРЬ ===
  | 'backpack'     // Рюкзак
  | 'pouch';       // Кошель

interface SlotProperties {
  slot: EquipmentSlot;
  allowedTypes: WearableSubtype[];
  requiredBodyParts?: string[];  // Требуемые части тела
  conflicts?: EquipmentSlot[];   // Конфликтующие слоты
}

const SLOT_PROPERTIES: Record<EquipmentSlot, SlotProperties> = {
  head: {
    slot: 'head',
    allowedTypes: ['armor_head', 'clothing_head'],
    requiredBodyParts: ['head'],
  },
  torso: {
    slot: 'torso',
    allowedTypes: ['armor_torso', 'armor_full'],
    requiredBodyParts: ['torso'],
    conflicts: ['body'],
  },
  hands: {
    slot: 'hands',
    allowedTypes: ['armor_hands'],
    requiredBodyParts: ['left_hand', 'right_hand'],
  },
  weapon_main: {
    slot: 'weapon_main',
    allowedTypes: ['weapon_dagger', 'weapon_sword', 'weapon_axe', /* ... */],
    conflicts: ['weapon_twohanded'],
  },
  // ... другие слоты
};
```

### 5.2 Требования к носителю

```typescript
interface EquipmentRequirements {
  // === УРОВЕНЬ КУЛЬТИВАЦИИ ===
  cultivationLevel?: number | { min: number; max?: number };
  
  // === ХАРАКТЕРИСТИКИ ===
  stats?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    vitality?: number;
    conductivity?: number;
  };
  
  // === ВИД ===
  species?: SpeciesType[] | 'any';
  
  // === ТЕХНИКИ ===
  knownTechniques?: string[];    // Должны быть изучены
  cultivationTechnique?: string; // Техника культивации
  
  // === ЧАСТИ ТЕЛА ===
  requiredBodyParts?: string[];  // Требуемые части тела
  intactBodyParts?: string[];    // Должны быть неповреждены
  
  // === РЕПУТАЦИЯ / СЕКТА ===
  sectRank?: string;
  reputation?: number;
  
  // === ДРУГОЕ ===
  level?: number;              // Общий уровень
  quests?: string[];           // Пройденные квесты
  achievements?: string[];     // Достижения
}

// Примеры требований
const legendarySwordRequirements: EquipmentRequirements = {
  cultivationLevel: { min: 5 },
  stats: {
    strength: 20,
    conductivity: 1.5,
  },
  knownTechniques: ['sword_intent'],
  intactBodyParts: ['right_arm', 'right_hand'],
};

const dragonArmorRequirements: EquipmentRequirements = {
  cultivationLevel: { min: 7 },
  species: ['human', 'elf', 'giant'],
  stats: {
    vitality: 50,
  },
  quests: ['slay_dragon'],
};
```

### 5.3 Сетовые бонусы

```typescript
interface EquipmentSet {
  id: string;
  name: string;
  pieces: string[];            // ID предметов в сете
  
  // Бонусы за количество предметов
  setBonuses: {
    pieces: number;            // Количество предметов
    bonuses: EquipmentBonus[];
    grantedTechniques?: GrantedTechnique[];
  }[];
}

// Пример: Сет Огненного Владыки
const fireLordSet: EquipmentSet = {
  id: 'fire_lord',
  name: 'Сет Огненного Владыки',
  pieces: [
    'fire_lord_helmet',
    'fire_lord_armor',
    'fire_lord_gauntlets',
    'fire_lord_boots',
    'fire_lord_ring',
  ],
  setBonuses: [
    {
      pieces: 2,
      bonuses: [
        { type: 'resistance_fire', value: 20, isPercent: true },
      ],
    },
    {
      pieces: 3,
      bonuses: [
        { type: 'resistance_fire', value: 40, isPercent: true },
        { type: 'intelligence', value: 5, isPercent: false },
      ],
      grantedTechniques: [{
        techniqueId: 'fire_aura',
        charges: { current: -1, max: -1, recharge: { type: 'none' } }, // Пассивная
        modifiers: { damageMultiplier: 1.0 },
      }],
    },
    {
      pieces: 5,
      bonuses: [
        { type: 'resistance_fire', value: 80, isPercent: true },
        { type: 'intelligence', value: 15, isPercent: false },
        { type: 'critChance', value: 15, isPercent: true },
      ],
      grantedTechniques: [{
        techniqueId: 'inferno_domain',
        charges: { current: 3, max: 3, recharge: { type: 'qi', amount: 100 } },
        modifiers: { damageMultiplier: 1.5 },
      }],
    },
  ],
};

// Расчёт сетовых бонусов
function calculateSetBonuses(
  equippedItems: Equipment[]
): EquipmentBonus[] {
  const setCounts = new Map<string, number>();
  
  // Подсчёт предметов каждого сета
  for (const item of equippedItems) {
    if (item.setId) {
      setCounts.set(item.setId, (setCounts.get(item.setId) || 0) + 1);
    }
  }
  
  // Сбор бонусов
  const bonuses: EquipmentBonus[] = [];
  
  for (const [setId, count] of setCounts) {
    const set = getEquipmentSetById(setId);
    if (!set) continue;
    
    for (const setBonus of set.setBonuses) {
      if (count >= setBonus.pieces) {
        bonuses.push(...setBonus.bonuses);
      }
    }
  }
  
  return bonuses;
}
```

### 5.4 Улучшение (Enhancement)

```typescript
interface EnhancementSystem {
  currentLevel: number;        // Текущий уровень улучшения
  maxLevel: number;            // Максимальный уровень (зависит от редкости)
  
  // Бонусы за уровень
  levelBonuses: {
    level: number;
    bonuses: EquipmentBonus[];
  }[];
  
  // Стоимость улучшения
  upgradeCost: {
    spiritStones: number;
    materials?: { id: string; amount: number }[];
  };
  
  // Шанс успеха
  successChance: number;       // % успеха
  failurePenalty?: 'none' | 'downgrade' | 'destroy';
}

// Формула стоимости улучшения
function calculateUpgradeCost(
  equipment: Equipment,
  targetLevel: number
): UpgradeCost {
  const rarity = equipment.rarity;
  const baseCost = 10 * Math.pow(2, targetLevel);
  
  const rarityMultiplier: Record<EquipmentRarity, number> = {
    common: 1.0,
    uncommon: 1.5,
    rare: 2.5,
    legendary: 5.0,
    divine: 10.0,
  };
  
  return {
    spiritStones: Math.floor(baseCost * rarityMultiplier[rarity]),
    materials: getRequiredMaterials(equipment, targetLevel),
  };
}

// Формула шанса успеха
function calculateSuccessChance(
  equipment: Equipment,
  targetLevel: number
): number {
  const rarity = equipment.rarity;
  const baseChance = 100 - (targetLevel * 10);
  
  const rarityBonus: Record<EquipmentRarity, number> = {
    common: 0,
    uncommon: 5,
    rare: 10,
    legendary: 15,
    divine: 20,
  };
  
  return Math.max(5, Math.min(100, baseChance + rarityBonus[rarity]));
}

// Примеры улучшений
const enhancementLevels = [
  { level: 1, bonuses: [{ type: 'damage', value: 5, isPercent: true }] },
  { level: 2, bonuses: [{ type: 'damage', value: 10, isPercent: true }] },
  { level: 3, bonuses: [{ type: 'damage', value: 15, isPercent: true }, { type: 'critChance', value: 2, isPercent: true }] },
  { level: 4, bonuses: [{ type: 'damage', value: 20, isPercent: true }] },
  // ... до maxLevel
];
```

### 5.5 Износ и ремонт

```typescript
interface DegradationSystem {
  // При использовании
  useDegradation: {
    combatHit: number;         // % за удар в бою
    combatBlock: number;       // % за блок
    spellcast: number;         // % за использование техники
  };
  
  // По времени
  timeDegradation: {
    perDay: number;            // % в день
    conditions?: ('rain' | 'combat' | 'extreme_heat')[];
    conditionMultiplier: number;
  };
  
  // Ремонт
  repair: {
    costPerPoint: number;      // Духовные камни за 1% прочности
    npcRepair?: string;        // ID NPC для ремонта
    selfRepair?: {
      skill: string;
      materials: { id: string; amount: number }[];
    };
  };
}

// Обработка износа в бою
function applyCombatDegradation(
  equipment: Equipment,
  action: 'hit' | 'block' | 'cast'
): void {
  const degradation = equipment.degradationSystem;
  if (!degradation) return;
  
  let amount = 0;
  switch (action) {
    case 'hit':
      amount = degradation.useDegradation.combatHit;
      break;
    case 'block':
      amount = degradation.useDegradation.combatBlock;
      break;
    case 'cast':
      amount = degradation.useDegradation.spellcast;
      break;
  }
  
  equipment.durability.current = Math.max(
    0,
    equipment.durability.current - amount
  );
  
  // Обновляем состояние
  equipment.durability.condition = getConditionFromPercent(
    equipment.durability.current / equipment.durability.max * 100
  );
}
```

---

## 6️⃣ ПОЛНАЯ СТРУКТУРА ЭКИПИРОВКИ

### 6.1 Интерфейс

```typescript
interface Equipment {
  // === ИДЕНТИФИКАЦИЯ ===
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  icon?: string;
  
  // === 0. ТИП ===
  equipmentType: EquipmentType;
  subType: string;
  
  // === 1. РЕДКОСТЬ ===
  rarity: EquipmentRarity;
  category: PresetCategory;
  
  // === 2. ФИЗИКА ===
  physical: PhysicalProperties;
  
  // === 3. БОНУСЫ ===
  bonuses: EquipmentBonuses;
  
  // === 4. ТЕХНИКИ ===
  grantedTechniques?: GrantedTechnique[];
  
  // === 5. ДОПОЛНИТЕЛЬНОЕ ===
  slot: EquipmentSlot;
  requirements?: EquipmentRequirements;
  setId?: string;
  enhancement?: EnhancementSystem;
  degradation?: DegradationSystem;
  
  // === СТОИМОСТЬ ===
  sellPrice: number;
  buyPrice?: number;
  
  // === ИСТОЧНИКИ ===
  sources: PresetSource[];
  dropSources?: string[];      // От кого выпадает
  
  // === УНИКАЛЬНОСТЬ ===
  isUnique?: boolean;          // Может быть только один экземпляр
  isBound?: boolean;           // Привязан к персонажу
  boundTo?: string;            // ID персонажа
}
```

### 6.2 Примеры экипировки

#### Обычный железный меч

```typescript
const ironSword: Equipment = {
  id: 'iron_sword',
  name: 'Железный меч',
  nameEn: 'Iron Sword',
  description: 'Простой железный меч. Надёжный, но без особых свойств.',
  icon: '🗡️',
  
  equipmentType: 'weapon',
  subType: 'weapon_sword',
  
  rarity: 'common',
  category: 'basic',
  
  physical: {
    weight: 2.5,
    weightClass: 'light',
    size: 'medium',
    volume: 1,
    durability: {
      current: 100,
      max: 100,
      degradationRate: 0.1,
      repairCost: 5,
      condition: 'pristine',
    },
    material: 'iron',
    materialQuality: 3,
  },
  
  bonuses: {
    stats: [
      { type: 'damage', value: 15, isPercent: false },
    ],
  },
  
  slot: 'weapon_main',
  
  sellPrice: 10,
  buyPrice: 25,
  sources: ['merchant', 'drop'],
  dropSources: ['bandit', 'guard'],
};
```

#### Редкий Меч Ветра

```typescript
const windBlade: Equipment = {
  id: 'wind_blade',
  name: 'Меч Ветра',
  nameEn: 'Wind Blade',
  description: 'Легкий клинок, зачарованный духом воздуха. Ускоряет атаки владельца.',
  icon: '🗡️',
  
  equipmentType: 'weapon',
  subType: 'weapon_sword',
  
  rarity: 'rare',
  category: 'master',
  
  physical: {
    weight: 1.5,
    weightClass: 'light',
    size: 'medium',
    volume: 0.8,
    durability: {
      current: 150,
      max: 150,
      degradationRate: 0.05,
      repairCost: 30,
      condition: 'pristine',
    },
    material: 'spirit_iron',
    materialQuality: 7,
  },
  
  bonuses: {
    stats: [
      { type: 'damage', value: 25, isPercent: false },
      { type: 'agility', value: 5, isPercent: false },
      { type: 'attackSpeed', value: 15, isPercent: true },
    ],
    techniqueBonuses: [
      {
        element: 'air',
        bonus: {
          damageMultiplier: 1.3,
          castSpeedMultiplier: 1.2,
        },
      },
    ],
  },
  
  grantedTechniques: [{
    techniqueId: 'wind_slash',
    charges: {
      current: 5,
      max: 5,
      recharge: { type: 'qi', amount: 30 },
    },
    requirements: {
      cultivationLevel: 2,
      qiCost: 15,
    },
    modifiers: {
      damageMultiplier: 1.0,
    },
  }],
  
  slot: 'weapon_main',
  requirements: {
    cultivationLevel: { min: 2 },
    stats: { agility: 12 },
  },
  
  enhancement: {
    currentLevel: 0,
    maxLevel: 7,
    levelBonuses: enhancementLevels,
    upgradeCost: { spiritStones: 100 },
    successChance: 100,
    failurePenalty: 'downgrade',
  },
  
  sellPrice: 200,
  buyPrice: 500,
  sources: ['drop', 'craft'],
  dropSources: ['wind_elemental', 'swordsman_master'],
};
```

#### Легендарная Броня Дракона

```typescript
const dragonArmor: Equipment = {
  id: 'dragon_scale_armor',
  name: 'Броня из чешуи дракона',
  nameEn: 'Dragon Scale Armor',
  description: 'Легендарная броня, выкованная из чешуи древнего дракона. Даёт невероятную защиту и силу.',
  icon: '🛡️',
  
  equipmentType: 'wearable',
  subType: 'armor_torso',
  
  rarity: 'legendary',
  category: 'legendary',
  
  physical: {
    weight: 15,
    weightClass: 'heavy',
    size: 'large',
    volume: 20,
    durability: {
      current: 500,
      max: 500,
      degradationRate: 0.02,
      repairCost: 100,
      condition: 'pristine',
    },
    material: 'dragon_bone',
    materialQuality: 10,
  },
  
  bonuses: {
    stats: [
      { type: 'armor', value: 100, isPercent: false },
      { type: 'healthMax', value: 200, isPercent: false },
      { type: 'strength', value: 10, isPercent: false },
      { type: 'vitality', value: 15, isPercent: false },
      { type: 'resistance_fire', value: 50, isPercent: true },
    ],
    conditional: {
      inCombat: [
        { type: 'armor', value: 20, isPercent: true },
        { type: 'intimidation', value: 30, isPercent: true },
      ],
      lowHealth: [
        { type: 'armor', value: 50, isPercent: true },
      ],
    },
  },
  
  grantedTechniques: [
    {
      techniqueId: 'dragon_breath',
      charges: {
        current: 3,
        max: 3,
        recharge: { type: 'spirit_stone', amount: 50 },
      },
      requirements: {
        cultivationLevel: 5,
        qiCost: 100,
      },
      modifiers: {
        damageMultiplier: 1.5,
      },
    },
    {
      techniqueId: 'dragon_fury',
      charges: {
        current: 1,
        max: 1,
        recharge: { type: 'combat', perKill: 0.1 }, // 10 убийств
      },
      autoActivate: {
        trigger: 'onLowHealth',
        chance: 50,
      },
    },
  ],
  
  slot: 'torso',
  requirements: {
    cultivationLevel: { min: 5 },
    stats: { strength: 25, vitality: 30 },
    quests: ['slay_dragon'],
  },
  
  setId: 'dragon_lord',
  
  enhancement: {
    currentLevel: 0,
    maxLevel: 9,
    levelBonuses: legendaryEnhancementLevels,
    upgradeCost: { spiritStones: 500 },
    successChance: 80,
    failurePenalty: 'downgrade',
  },
  
  degradation: {
    useDegradation: {
      combatHit: 0.02,
      combatBlock: 0.05,
      spellcast: 0,
    },
    timeDegradation: {
      perDay: 0,
    },
    repair: {
      costPerPoint: 5,
      npcRepair: 'master_blacksmith',
    },
  },
  
  sellPrice: 5000,
  sources: ['drop', 'craft'],
  dropSources: ['ancient_dragon'],
  isUnique: true,
};
```

---

## 7️⃣ ИНТЕГРАЦИЯ С СИСТЕМОЙ

### 7.1 Prisma Schema

```prisma
model Equipment {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // === ИДЕНТИФИКАЦИЯ ===
  name        String
  nameEn      String?
  description String
  icon        String?
  
  // === ТИП ===
  equipmentType  String   // wearable, weapon, consumable, artifact, tool, implant
  subType        String
  
  // === РЕДКОСТЬ ===
  rarity      String   // common, uncommon, rare, legendary, divine
  category    String   // basic, advanced, master, legendary
  
  // === ФИЗИКА ===
  weight          Float
  weightClass     String
  size            String
  durabilityCurrent Int
  durabilityMax   Int
  material        String
  materialQuality Int
  
  // === БОНУСЫ (JSON) ===
  bonuses     Json     // EquipmentBonuses
  
  // === ТЕХНИКИ (JSON) ===
  grantedTechniques Json? // GrantedTechnique[]
  
  // === СЛОТ И ТРЕБОВАНИЯ ===
  slot          String
  requirements  Json?    // EquipmentRequirements
  setId         String?
  
  // === УЛУЧШЕНИЕ ===
  enhancementLevel Int @default(0)
  
  // === СТОИМОСТЬ ===
  sellPrice    Int
  buyPrice     Int?
  
  // === ПРИВЯЗКА ===
  isBound      Boolean @default(false)
  boundTo      String?
  
  // === СОСТОЯНИЕ ===
  charges      Json?    // Текущие заряды техник
  
  // === СВЯЗИ ===
  characterId  String?
  character    Character? @relation(fields: [characterId], references: [id])
  
  @@map("equipment")
}

model EquipmentSet {
  id          String   @id
  name        String
  pieces      Json     // string[]
  setBonuses  Json     // SetBonus[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("equipment_sets")
}

model Character {
  // ... существующие поля
  
  // Экипировка
  equipment   Equipment[]
  
  // Активная экипировка по слотам
  equippedItems Json?   // Record<EquipmentSlot, EquipmentId>
}
```

### 7.2 API Endpoints

```typescript
// GET /api/equipment
// Получить всю экипировку персонажа

// POST /api/equipment/equip
// Экипировать предмет
interface EquipRequest {
  characterId: string;
  equipmentId: string;
  slot?: EquipmentSlot;  // Опционально, если слот один возможен
}

// POST /api/equipment/unequip
// Снять предмет
interface UnequipRequest {
  characterId: string;
  slot: EquipmentSlot;
}

// POST /api/equipment/use-technique
// Использовать технику предмета
interface UseTechniqueRequest {
  characterId: string;
  equipmentId: string;
  techniqueIndex: number;
  targetId?: string;
}

// POST /api/equipment/recharge
// Перезарядить технику предмета
interface RechargeRequest {
  characterId: string;
  equipmentId: string;
  techniqueIndex: number;
  method: 'qi' | 'spirit_stone';
}

// POST /api/equipment/enhance
// Улучшить предмет
interface EnhanceRequest {
  characterId: string;
  equipmentId: string;
}

// POST /api/equipment/repair
// Починить предмет
interface RepairRequest {
  characterId: string;
  equipmentId: string;
  amount?: number;  // Сколько прочности восстановить
}
```

### 7.3 Расчёт итоговых характеристик

```typescript
function calculateFinalStats(
  character: Character,
  equippedItems: Equipment[]
): CharacterStats {
  // 1. Базовые характеристики
  let stats = { ...character.baseStats };
  
  // 2. Бонусы от экипировки
  for (const item of equippedItems) {
    const conditionMult = getConditionMultiplier(item.physical.durability.condition);
    
    for (const bonus of item.bonuses.stats) {
      const value = bonus.value * conditionMult;
      
      if (bonus.isPercent) {
        stats[bonus.type] *= (1 + value / 100);
      } else {
        stats[bonus.type] += value;
      }
    }
    
    // Бонусы за улучшение
    if (item.enhancement && item.enhancement.currentLevel > 0) {
      for (const levelBonus of item.enhancement.levelBonuses) {
        if (levelBonus.level <= item.enhancement.currentLevel) {
          for (const bonus of levelBonus.bonuses) {
            if (bonus.isPercent) {
              stats[bonus.type] *= (1 + bonus.value / 100);
            } else {
              stats[bonus.type] += bonus.value;
            }
          }
        }
      }
    }
  }
  
  // 3. Сетовые бонусы
  const setBonuses = calculateSetBonuses(equippedItems);
  for (const bonus of setBonuses) {
    if (bonus.isPercent) {
      stats[bonus.type] *= (1 + bonus.value / 100);
    } else {
      stats[bonus.type] += bonus.value;
    }
  }
  
  // 4. Штрафы за вес
  const totalWeight = equippedItems.reduce((sum, item) => sum + item.physical.weight, 0);
  const weightEffects = calculateWeightEffects(totalWeight, stats.strength);
  
  stats.moveSpeed *= (1 - weightEffects.speedPenalty / 100);
  stats.dodgeChance -= weightEffects.dodgePenalty;
  
  return stats;
}
```

---

## 8️⃣ ПЛАН РЕАЛИЗАЦИИ

### Фаза 1: Базовая структура (Приоритет: Высокий)

1. **Типы и интерфейсы** — `src/types/equipment.ts`
2. **Пресеты экипировки** — `src/data/presets/equipment-presets.ts`
3. **Базовые материалы** — `src/data/materials.ts`

### Фаза 2: Интеграция с БД (Приоритет: Высокий)

1. **Prisma Schema** — модели Equipment, EquipmentSet
2. **API** — базовые CRUD операции
3. **Инвентарь UI** — отображение экипировки

### Фаза 3: Боевая система (Приоритет: Средний)

1. **Слоты экипировки** — привязка к частям тела
2. **Бонусы в бою** — применение эффектов
3. **Даруемые техники** — интеграция с боевой системой

### Фаза 4: Продвинутые механики (Приоритет: Низкий)

1. **Улучшение** — система заточки
2. **Ремонт** — износ и восстановление
3. **Сетовые бонусы** — комплекты

---

## 🔗 Связанные документы

- [body.md](./body.md) — Концепция тела
- [COMBAT_TECHNIQUES_SYSTEM.md](./COMBAT_TECHNIQUES_SYSTEM.md) — Боевая система
- [start_lore.md](./start_lore.md) — Лор мира

---

*Документ создан: 2026-02-28*  
*Версия: 1.0*
