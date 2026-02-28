# ⚔️ Оффлайн Генератор Техник

**Версия:** 1.0  
**Создано:** 2026-02-28  
**Статус:** Черновик

---

## 📋 Обзор

Оффлайн генератор техник — модуль для процедурной генерации техник культивации без использования LLM. Генератор создаёт уникальные техники на основе:
- Шаблонов и компонентов
- Балансовых формул
- Контекста персонажа
- Рандомизации с контролем качества

### Принципы генерации

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     АРХИТЕКТУРА ГЕНЕРАТОРА                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│   │   КОНТЕКСТ   │ -> │   ШАБЛОНЫ    │ -> │   ГЕНЕРАЦИЯ  │              │
│   │  персонажа   │    │  компонентов │    │   техники    │              │
│   └──────────────┘    └──────────────┘    └──────────────┘              │
│          │                   │                   │                       │
│          ▼                   ▼                   ▼                       │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│   │ Уровень      │    │ Названия     │    │ Эффекты      │              │
│   │ Элемент      │    │ Описания     │    │ Стоимость    │              │
│   │ Стиль боя    │    │ Визуализация │    │ Требования   │              │
│   └──────────────┘    └──────────────┘    └──────────────┘              │
│                                                  │                       │
│                                                  ▼                       │
│                                          ┌──────────────┐              │
│                                          │  ВАЛИДАЦИЯ   │              │
│                                          │  БАЛАНСИРОВКА│              │
│                                          └──────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ СТРУКТУРА ТЕХНИКИ

### 1.1 Полная модель техники

```typescript
interface GeneratedTechnique {
  // === ИДЕНТИФИКАЦИЯ ===
  id: string;                    // Генерируемый ID
  name: string;                  // Сгенерированное название
  nameEn?: string;               // Английское название
  description: string;           // Описание
  
  // === КЛАССИФИКАЦИЯ ===
  type: TechniqueType;           // combat | cultivation | support | movement | sensory | healing
  subtype?: CombatTechniqueType; // Для боевых техник
  element: TechniqueElement;     // Стихия
  rarity: TechniqueRarity;       // common | uncommon | rare | legendary
  category: PresetCategory;      // basic | advanced | master | legendary
  
  // === УРОВЕНЬ ===
  level: number;                 // 1-9
  minCultivationLevel: number;   // Минимальный уровень культивации
  maxLevel: number;              // Максимальный уровень развития
  canEvolve: boolean;            // Можно ли развивать
  
  // === ЗАТРАТЫ ===
  qiCost: number;                // Стоимость Ци
  fatigueCost: {
    physical: number;            // Физическая усталость
    mental: number;              // Ментальная усталость
  };
  
  // === ТРЕБОВАНИЯ ===
  requirements?: {
    cultivationLevel?: number;
    stats?: {
      strength?: number;
      agility?: number;
      intelligence?: number;
      conductivity?: number;
    };
    skills?: string[];
    prerequisiteTechniques?: string[];  // Новое: требуемые техники
  };
  
  // === МАСШТАБИРОВАНИЕ ===
  scaling: TechniqueScaling;
  
  // === ЭФФЕКТЫ ===
  effects: TechniqueEffects;
  
  // === МАСТЕРСТВО ===
  masteryBonus: number;          // Множитель при 100% мастерства
  
  // === МЕТАДАННЫЕ ГЕНЕРАЦИИ ===
  generationMeta: {
    seed: number;                // Seed для воспроизводимости
    template: string;            // ID использованного шаблона
    components: string[];        // ID использованных компонентов
    generatedAt: Date;
    generatorVersion: string;
  };
}
```

### 1.2 Расширенные эффекты (предложение)

```typescript
interface ExtendedTechniqueEffects extends TechniqueEffects {
  // === СУЩЕСТВУЮЩИЕ ===
  damage?: number;
  healing?: number;
  qiRegen?: number;
  qiRegenPercent?: number;
  unnoticeability?: number;
  castSpeed?: number;
  duration?: number;
  distance?: number;
  statModifiers?: StatModifiers;
  
  // === БОЕВЫЕ ===
  combatType?: CombatTechniqueType;
  range?: CombatRange;
  contactRequired?: boolean;
  aoeRadius?: number;
  elementalEffect?: ElementalEffect;
  dodgeChance?: number;
  penetration?: number;
  
  // === ЗАЩИТНЫЕ ===
  damageReduction?: number;
  blockChance?: number;
  durability?: number;
  shieldHP?: number;
  regeneration?: number;
  qiDrainPerHit?: number;
  counterBonus?: number;
  
  // === НОВЫЕ (предложение) ===
  
  // Область действия
  targetingType?: 'single' | 'area' | 'self' | 'ally' | 'cone' | 'line';
  targetingRange?: number;       // Дальность выбора цели
  targetingRadius?: number;      // Радиус AOE
  
  // Модификаторы цели
  debuffs?: TechniqueDebuff[];
  buffs?: TechniqueBuff[];
  
  // Кулдаун и перезарядка
  cooldown?: number;             // Кулдаун в секундах (для особо мощных)
  charges?: number;              // Количество зарядов
  chargeRegen?: number;          // Восстановление зарядов в минуту
  
  // Условия применения
  conditions?: TechniqueCondition[];
  
  // Взаимодействия
  synergies?: TechniqueSynergy[];
  counters?: string[];           // ID техник, которые контрят эту
}

// Дебаффы
interface TechniqueDebuff {
  type: DebuffType;
  value: number;
  duration: number;              // В минутах
  stacking?: boolean;
  maxStacks?: number;
}

type DebuffType = 
  | 'slow'           // Замедление движения
  | 'weakness'       // Снижение урона
  | 'vulnerability'  // Увеличение получаемого урона
  | 'silence'        // Блокировка техник
  | 'root'           // Обездвиживание
  | 'blind'          // Слепота
  | 'poison'         // Яд (DoT)
  | 'burn'           // Горение (DoT от огня)
  | 'freeze'         // Заморозка
  | 'shock'          // Шок (прерывание действий)
  | 'curse';         // Проклятие (различные эффекты)

// Баффы
interface TechniqueBuff {
  type: BuffType;
  value: number;
  duration: number;
  stacking?: boolean;
  maxStacks?: number;
}

type BuffType = 
  | 'speed'          // Скорость движения
  | 'power'          // Урон
  | 'defense'        // Защита
  | 'regeneration'   // Регенерация HP
  | 'qiRegen'        // Регенерация Ци
  | 'immunity'       // Иммунитет к дебаффам
  | 'invisibility'   // Невидимость
  | 'shield'         // Щит
  | 'clarity';       // Ясность ума (снижение ментальной усталости)

// Условия применения
interface TechniqueCondition {
  type: ConditionType;
  value?: number;
  target?: 'self' | 'target' | 'area';
}

type ConditionType = 
  | 'qiAbove'        // Ци выше X%
  | 'qiBelow'        // Ци ниже X%
  | 'healthAbove'    // HP выше X%
  | 'healthBelow'    // HP ниже X%
  | 'fatigueBelow'   // Усталость ниже X%
  | 'inCombat'       // В бою
  | 'outOfCombat'    // Вне боя
  | 'indoors'        // В помещении
  | 'outdoors'       // На открытом воздухе
  | 'daytime'        // Днём
  | 'nighttime'      // Ночью
  | 'elementPresent' // Присутствует элемент
  | 'terrainType';   // Тип местности

// Синергии
interface TechniqueSynergy {
  techniqueId?: string;           // Конкретная техника
  techniqueType?: TechniqueType;  // Или тип техник
  element?: TechniqueElement;     // Или элемент
  bonus: {
    damageMultiplier?: number;
    qiCostReduction?: number;
    castTimeReduction?: number;
    effectDurationBonus?: number;
  };
}
```

---

## 2️⃣ КОМПОНЕНТЫ ГЕНЕРАЦИИ

### 2.1 Шаблоны названий

```typescript
interface NameTemplate {
  id: string;
  type: TechniqueType;
  subtype?: CombatTechniqueType;
  element?: TechniqueElement;
  
  // Паттерны: {adj} {noun}, {noun} {of} {element}, {verb} {noun}
  patterns: NamePattern[];
  
  // Словари компонентов
  adjectives: Record<TechniqueElement, string[]>;
  nouns: Record<TechniqueType, string[]>;
  verbs: Record<TechniqueType, string[]>;
  
  // Стиль
  style: 'aggressive' | 'defensive' | 'mystical' | 'practical';
}

interface NamePattern {
  template: string;              // "{adj} {noun}" или "{verb} {element}"
  weight: number;                // Вес при выборе
  minLevel?: number;             // Минимальный уровень техники
  maxLevel?: number;             // Максимальный уровень
  rarity?: TechniqueRarity[];    // Доступные редкости
}

// Примеры шаблонов
const NAME_TEMPLATES: NameTemplate[] = [
  // Боевые техники ближнего боя
  {
    id: 'melee_aggressive',
    type: 'combat',
    subtype: 'melee_strike',
    patterns: [
      { template: '{adj} {noun}', weight: 40 },
      { template: '{verb} {noun}', weight: 30 },
      { template: '{element} {noun}', weight: 20 },
      { template: '{noun} {of} {element}', weight: 10, minLevel: 4 },
    ],
    adjectives: {
      fire: ['Пылающий', 'Огненный', 'Раскалённый', 'Пожирающий'],
      water: ['Ледяной', 'Струящийся', 'Холодный', 'Пронзающий'],
      earth: ['Тяжёлый', 'Каменный', 'Сокрушающий', 'Неизбежный'],
      air: ['Стремительный', 'Вихревой', 'Невидимый', 'Порывистый'],
      lightning: ['Молниеносный', 'Искрящийся', 'Громовой', 'Ослепляющий'],
      void: ['Бесплотный', 'Теневой', 'Пустотный', 'Забвенный'],
      neutral: ['Усиленный', 'Концентрированный', 'Простой', 'Истинный'],
    },
    nouns: {
      combat: ['Удар', 'Кулак', 'Ладонь', 'Удар', 'Толчок', 'Взрыв'],
      cultivation: [],
      support: [],
      movement: [],
      sensory: [],
      healing: [],
    },
    verbs: {
      combat: ['Сокрушающий', 'Пронзающий', 'Разящий', 'Обжигающий'],
      cultivation: [],
      support: [],
      movement: [],
      sensory: [],
      healing: [],
    },
    style: 'aggressive',
  },
  // ... другие шаблоны
];
```

### 2.2 Шаблоны описаний

```typescript
interface DescriptionTemplate {
  id: string;
  type: TechniqueType;
  
  // Паттерны описания
  intro: string[];               // Вступление
  effect: string[];              // Описание эффекта
  cost: string[];                // Описание затрат (опционально)
  warning: string[];             // Предупреждение (опционально)
  
  // Переменные: {damage}, {element}, {duration}, {qiCost}
}

const DESCRIPTION_TEMPLATES: DescriptionTemplate[] = [
  {
    id: 'melee_damage',
    type: 'combat',
    intro: [
      'Базовая техника ближнего боя.',
      'Простая, но эффективная техника.',
      'Основной приём для начинающих практиков.',
    ],
    effect: [
      'Наносит {damage} единиц урона.',
      'Наносит {damage} урона, усиленного {element} Ци.',
      'Концентрирует Ци в руке для удара силой {damage}.',
    ],
    cost: [
      'Требует {qiCost} единиц Ци.',
      'Расходует {qiCost} Ци.',
    ],
    warning: [
      'Требует физического контакта с целью.',
      'Неэффективна против бронированных целей.',
    ],
  },
];
```

### 2.3 Библиотека эффектов

```typescript
interface EffectLibrary {
  // Базовые эффекты по типу
  baseEffects: Record<TechniqueType, BaseEffectConfig[]>;
  
  // Элементальные модификаторы
  elementalModifiers: Record<TechniqueElement, ElementalModifier>;
  
  // Редкостные модификаторы
  rarityMultipliers: Record<TechniqueRarity, RarityConfig>;
  
  // Уровневые коэффициенты
  levelScaling: LevelScalingConfig;
}

interface BaseEffectConfig {
  id: string;
  name: string;
  type: TechniqueType;
  subtype?: CombatTechniqueType;
  
  // Базовые значения (для level 1)
  baseValues: {
    damage?: number;
    healing?: number;
    qiRegen?: number;
    duration?: number;
    range?: number;
    shieldHP?: number;
    damageReduction?: number;
    // ...
  };
  
  // Масштабирование по уровню
  scaling: {
    damage?: number;      // +X за уровень
    healing?: number;
    qiCost?: number;      // Множитель: 1.2 = +20% за уровень
    duration?: number;
  };
  
  // Вес при генерации
  weight: number;
  
  // Требования
  requirements?: {
    minLevel?: number;
    maxLevel?: number;
    rarity?: TechniqueRarity[];
  };
}

// Пример библиотеки
const EFFECT_LIBRARY: EffectLibrary = {
  baseEffects: {
    combat: [
      {
        id: 'simple_strike',
        name: 'Простой удар',
        type: 'combat',
        subtype: 'melee_strike',
        baseValues: { damage: 15 },
        scaling: { damage: 5, qiCost: 1.15 },
        weight: 100,
      },
      {
        id: 'power_strike',
        name: 'Мощный удар',
        type: 'combat',
        subtype: 'melee_strike',
        baseValues: { damage: 30 },
        scaling: { damage: 8, qiCost: 1.2 },
        weight: 60,
        requirements: { minLevel: 3 },
      },
      {
        id: 'qi_projectile',
        name: 'Ци-снаряд',
        type: 'combat',
        subtype: 'ranged_projectile',
        baseValues: { damage: 12, range: 30 },
        scaling: { damage: 4, qiCost: 1.2 },
        weight: 80,
      },
      {
        id: 'fireball',
        name: 'Огненный шар',
        type: 'combat',
        subtype: 'ranged_projectile',
        baseValues: { damage: 25, range: 45, aoeRadius: 2 },
        scaling: { damage: 7, qiCost: 1.25 },
        weight: 50,
        requirements: { minLevel: 2 },
      },
      {
        id: 'basic_block',
        name: 'Базовый блок',
        type: 'combat',
        subtype: 'defense_block',
        baseValues: { damageReduction: 30, blockChance: 60, durability: 30 },
        scaling: { damageReduction: 5, qiCost: 1.1 },
        weight: 90,
      },
      {
        id: 'energy_shield',
        name: 'Энергетический щит',
        type: 'combat',
        subtype: 'defense_shield',
        baseValues: { shieldHP: 40, duration: 5 },
        scaling: { shieldHP: 10, qiCost: 1.2 },
        weight: 70,
        requirements: { minLevel: 2 },
      },
    ],
    cultivation: [
      {
        id: 'basic_breathing',
        name: 'Базовое дыхание',
        type: 'cultivation',
        baseValues: { qiRegenPercent: 5 },
        scaling: { qiRegenPercent: 1 },
        weight: 100,
      },
    ],
    // ... другие типы
  },
  
  elementalModifiers: {
    fire: {
      damageBonus: 1.15,           // +15% урона
      elementalEffect: { type: 'fire', damagePerTurn: 3, duration: 2 },
      descriptionBonus: 'Поджигает цель.',
    },
    water: {
      damageBonus: 1.0,
      elementalEffect: { type: 'water', debuff: 'slow', duration: 1 },
      descriptionBonus: 'Замедляет цель.',
    },
    earth: {
      damageBonus: 1.25,           // +25% урона, но медленнее
      castSpeedPenalty: 1.2,       // +20% время каста
      descriptionBonus: 'Тяжёлый, сокрушающий удар.',
    },
    air: {
      damageBonus: 0.9,            // -10% урона
      castSpeedBonus: 0.8,         // -20% время каста
      descriptionBonus: 'Быстрый, едва видимый удар.',
    },
    lightning: {
      damageBonus: 1.3,            // +30% урона
      qiCostMultiplier: 1.2,       // +20% стоимости
      elementalEffect: { type: 'lightning', debuff: 'shock', duration: 1 },
      descriptionBonus: 'Ослепляет и шокирует.',
    },
    void: {
      damageBonus: 1.5,            // +50% урона
      qiCostMultiplier: 1.5,       // +50% стоимости
      penetration: 25,             // 25% пробития
      requirements: { minLevel: 5 },
      descriptionBonus: 'Игнорирует часть защиты.',
    },
    neutral: {
      damageBonus: 1.0,
      descriptionBonus: '',
    },
  },
  
  rarityMultipliers: {
    common: { effectMultiplier: 1.0, qiCostMultiplier: 1.0 },
    uncommon: { effectMultiplier: 1.25, qiCostMultiplier: 1.15 },
    rare: { effectMultiplier: 1.5, qiCostMultiplier: 1.3 },
    legendary: { effectMultiplier: 2.0, qiCostMultiplier: 1.5 },
  },
  
  levelScaling: {
    // Коэффициенты масштабирования от уровня техники
    damagePerLevel: 1.1,           // +10% урона за уровень
    qiCostPerLevel: 1.15,          // +15% стоимости за уровень
    durationPerLevel: 1.05,        // +5% длительности за уровень
  },
};
```

---

## 3️⃣ АЛГОРИТМ ГЕНЕРАЦИИ

### 3.1 Основной процесс

```typescript
interface GenerationContext {
  // Параметры персонажа
  character: {
    cultivationLevel: number;
    element?: TechniqueElement;      // Предпочтительный элемент
    combatStyle?: CombatStyle;       // Предпочтительный стиль
    statDistribution: {
      strength: number;
      agility: number;
      intelligence: number;
      conductivity: number;
    };
    existingTechniques: string[];    // ID изученных техник
  };
  
  // Параметры генерации
  targetLevel?: number;              // Целевой уровень техники
  preferredType?: TechniqueType;
  preferredElement?: TechniqueElement;
  rarity?: TechniqueRarity;
  count: number;                     // Количество техник для генерации
  
  // Seed для воспроизводимости
  seed?: number;
}

type CombatStyle = 'aggressive' | 'defensive' | 'balanced' | 'ranged' | 'support';

/**
 * Основная функция генерации
 */
function generateTechniques(context: GenerationContext): GeneratedTechnique[] {
  const rng = seededRandom(context.seed);
  const results: GeneratedTechnique[] = [];
  
  for (let i = 0; i < context.count; i++) {
    // 1. Определяем базовые параметры
    const level = context.targetLevel ?? inferLevel(context.character);
    const type = context.preferredType ?? selectType(context, rng);
    const rarity = context.rarity ?? selectRarity(level, rng);
    const element = context.preferredElement ?? selectElement(context, rng);
    
    // 2. Выбираем базовый эффект
    const baseEffect = selectBaseEffect(type, level, rarity, rng);
    
    // 3. Применяем элементальный модификатор
    const elementMod = EFFECT_LIBRARY.elementalModifiers[element];
    
    // 4. Рассчитываем числовые значения
    const values = calculateValues(baseEffect, level, rarity, elementMod);
    
    // 5. Генерируем название и описание
    const name = generateName(type, element, baseEffect, rng);
    const description = generateDescription(baseEffect, values, element, rng);
    
    // 6. Определяем требования
    const requirements = generateRequirements(baseEffect, level, context.character);
    
    // 7. Валидация и балансировка
    const technique = assembleTechnique({
      name,
      description,
      type,
      element,
      rarity,
      level,
      values,
      requirements,
      seed: rng.seed,
    });
    
    // 8. Финальная валидация
    const validated = validateAndBalance(technique);
    
    results.push(validated);
  }
  
  return results;
}
```

### 3.2 Расчёт числовых значений

```typescript
function calculateValues(
  baseEffect: BaseEffectConfig,
  level: number,
  rarity: TechniqueRarity,
  elementMod: ElementalModifier
): CalculatedValues {
  const rarityConfig = EFFECT_LIBRARY.rarityMultipliers[rarity];
  const levelScaling = EFFECT_LIBRARY.levelScaling;
  
  const result: CalculatedValues = {};
  
  // Урон
  if (baseEffect.baseValues.damage) {
    const baseDamage = baseEffect.baseValues.damage;
    const levelBonus = baseEffect.scaling.damage 
      ? baseEffect.scaling.damage * (level - 1) 
      : 0;
    const elementalBonus = baseDamage * (elementMod.damageBonus - 1);
    
    result.damage = Math.floor(
      (baseDamage + levelBonus + elementalBonus) 
      * rarityConfig.effectMultiplier 
      * Math.pow(levelScaling.damagePerLevel, level - 1)
    );
  }
  
  // Лечение
  if (baseEffect.baseValues.healing) {
    const baseHealing = baseEffect.baseValues.healing;
    const levelBonus = baseEffect.scaling.healing 
      ? baseEffect.scaling.healing * (level - 1) 
      : 0;
    
    result.healing = Math.floor(
      (baseHealing + levelBonus) 
      * rarityConfig.effectMultiplier
    );
  }
  
  // Стоимость Ци
  const baseQiCost = baseEffect.baseValues.qiCost ?? 10;
  const qiCostFromLevel = baseQiCost * Math.pow(
    baseEffect.scaling.qiCost ?? levelScaling.qiCostPerLevel, 
    level - 1
  );
  result.qiCost = Math.floor(
    qiCostFromLevel 
    * rarityConfig.qiCostMultiplier 
    * (elementMod.qiCostMultiplier ?? 1)
  );
  
  // Длительность
  if (baseEffect.baseValues.duration) {
    result.duration = Math.floor(
      baseEffect.baseValues.duration 
      * Math.pow(levelScaling.durationPerLevel, level - 1)
    );
  }
  
  // Дальность
  if (baseEffect.baseValues.range) {
    result.range = {
      fullDamage: baseEffect.baseValues.range,
      halfDamage: baseEffect.baseValues.range * 1.5,
      max: baseEffect.baseValues.range * 2,
    };
  }
  
  // Элементальный эффект
  if (elementMod.elementalEffect) {
    result.elementalEffect = {
      ...elementMod.elementalEffect,
      damagePerTurn: elementMod.elementalEffect.damagePerTurn 
        ? elementMod.elementalEffect.damagePerTurn * level 
        : undefined,
    };
  }
  
  return result;
}
```

### 3.3 Генерация требований

```typescript
function generateRequirements(
  baseEffect: BaseEffectConfig,
  level: number,
  character: GenerationContext['character']
): TechniqueRequirements {
  const requirements: TechniqueRequirements = {};
  
  // Уровень культивации
  requirements.cultivationLevel = Math.max(1, level - 1);
  
  // Характеристики
  requirements.stats = {};
  
  // Сила для melee
  if (baseEffect.subtype === 'melee_strike' || baseEffect.subtype === 'melee_weapon') {
    requirements.stats.strength = 8 + level * 2;
  }
  
  // Ловкость для ranged и dodge
  if (baseEffect.subtype?.startsWith('ranged') || baseEffect.subtype === 'defense_dodge') {
    requirements.stats.agility = 10 + level * 2;
  }
  
  // Интеллект для support, healing, cultivation
  if (['support', 'healing', 'cultivation'].includes(baseEffect.type)) {
    requirements.stats.intelligence = 10 + level * 2;
  }
  
  // Проводимость для техник Ци
  if (['combat', 'support'].includes(baseEffect.type)) {
    requirements.stats.conductivity = 0.2 + level * 0.1;
  }
  
  // Предшествующие техники для продвинутых
  if (level >= 4) {
    // Может требовать базовую технику того же типа
  }
  
  return requirements;
}
```

---

## 4️⃣ ВАЛИДАЦИЯ И БАЛАНС

### 4.1 Правила балансировки

```typescript
interface BalanceRules {
  // Максимальный урон по уровню
  maxDamage: Record<number, number>;
  
  // Максимальное лечение по уровню
  maxHealing: Record<number, number>;
  
  // Минимальная/максимальная стоимость Ци
  qiCostRange: Record<number, { min: number; max: number }>;
  
  // Максимальная длительность
  maxDuration: number;            // В минутах
  
  // Ограничения эффектов
  effectLimits: {
    damageReduction: number;      // Максимум 80%
    blockChance: number;          // Максимум 90%
    dodgeChance: number;          // Максимум 50%
    penetration: number;          // Максимум 50%
  };
}

const BALANCE_RULES: BalanceRules = {
  maxDamage: {
    1: 20,
    2: 35,
    3: 55,
    4: 80,
    5: 110,
    6: 150,
    7: 200,
    8: 270,
    9: 350,
  },
  maxHealing: {
    1: 15,
    2: 25,
    3: 40,
    4: 60,
    5: 85,
    6: 115,
    7: 150,
    8: 200,
    9: 260,
  },
  qiCostRange: {
    1: { min: 5, max: 15 },
    2: { min: 10, max: 25 },
    3: { min: 15, max: 40 },
    4: { min: 25, max: 60 },
    5: { min: 35, max: 85 },
    6: { min: 50, max: 120 },
    7: { min: 70, max: 170 },
    8: { min: 100, max: 250 },
    9: { min: 150, max: 400 },
  },
  maxDuration: 60,
  effectLimits: {
    damageReduction: 80,
    blockChance: 90,
    dodgeChance: 50,
    penetration: 50,
  },
};

function validateAndBalance(technique: GeneratedTechnique): GeneratedTechnique {
  const rules = BALANCE_rules;
  const level = technique.level;
  
  // Ограничиваем урон
  if (technique.effects.damage) {
    technique.effects.damage = Math.min(
      technique.effects.damage, 
      rules.maxDamage[level]
    );
  }
  
  // Ограничиваем лечение
  if (technique.effects.healing) {
    technique.effects.healing = Math.min(
      technique.effects.healing, 
      rules.maxHealing[level]
    );
  }
  
  // Ограничиваем стоимость Ци
  const qiRange = rules.qiCostRange[level];
  technique.qiCost = Math.max(
    qiRange.min, 
    Math.min(technique.qiCost, qiRange.max)
  );
  
  // Ограничиваем длительность
  if (technique.effects.duration) {
    technique.effects.duration = Math.min(
      technique.effects.duration, 
      rules.maxDuration
    );
  }
  
  // Ограничиваем эффекты защиты
  if (technique.effects.damageReduction) {
    technique.effects.damageReduction = Math.min(
      technique.effects.damageReduction, 
      rules.effectLimits.damageReduction
    );
  }
  
  if (technique.effects.blockChance) {
    technique.effects.blockChance = Math.min(
      technique.effects.blockChance, 
      rules.effectLimits.blockChance
    );
  }
  
  if (technique.effects.dodgeChance) {
    technique.effects.dodgeChance = Math.min(
      technique.effects.dodgeChance, 
      rules.effectLimits.dodgeChance
    );
  }
  
  if (technique.effects.penetration) {
    technique.effects.penetration = Math.min(
      technique.effects.penetration, 
      rules.effectLimits.penetration
    );
  }
  
  return technique;
}
```

### 4.2 Проверка уникальности

```typescript
function checkUniqueness(
  technique: GeneratedTechnique,
  existingTechniques: GeneratedTechnique[]
): { unique: boolean; similarTo?: string } {
  // Проверяем по названию
  const sameName = existingTechniques.find(
    t => t.name.toLowerCase() === technique.name.toLowerCase()
  );
  if (sameName) {
    return { unique: false, similarTo: sameName.id };
  }
  
  // Проверяем по похожести эффектов
  for (const existing of existingTechniques) {
    const similarity = calculateSimilarity(technique, existing);
    if (similarity > 0.85) {
      return { unique: false, similarTo: existing.id };
    }
  }
  
  return { unique: true };
}

function calculateSimilarity(
  a: GeneratedTechnique, 
  b: GeneratedTechnique
): number {
  let score = 0;
  let total = 0;
  
  // Тип
  if (a.type === b.type) score += 1;
  total += 1;
  
  // Подтип
  if (a.subtype && b.subtype && a.subtype === b.subtype) score += 1;
  total += 1;
  
  // Элемент
  if (a.element === b.element) score += 0.5;
  total += 0.5;
  
  // Эффекты
  const effectsA = Object.keys(a.effects);
  const effectsB = Object.keys(b.effects);
  const commonEffects = effectsA.filter(e => effectsB.includes(e));
  score += commonEffects.length / Math.max(effectsA.length, effectsB.length);
  total += 1;
  
  return score / total;
}
```

---

## 5️⃣ ИНТЕГРАЦИЯ С СИСТЕМОЙ

### 5.1 Prisma схема

```prisma
// Техника (каталог)
model Technique {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Идентификация
  name          String
  nameId        String   @unique  // ID для генерации
  description   String
  
  // Классификация
  type          String   // combat, cultivation, support, movement, sensory, healing
  subtype       String?  // Для боевых: melee_strike, ranged_projectile, etc.
  element       String
  rarity        String
  category      String   // basic, advanced, master, legendary
  
  // Уровень
  level         Int
  minCultivationLevel Int
  maxLevel      Int      @default(9)
  canEvolve     Boolean  @default(true)
  
  // Затраты
  qiCost        Int
  physicalFatigueCost Float
  mentalFatigueCost   Float
  
  // Требования
  statRequirements String? // JSON
  skillRequirements String? // JSON
  prerequisiteTechniques String? // JSON array of technique IDs
  
  // Масштабирование
  statScaling   String?  // JSON
  
  // Эффекты
  effects       String   // JSON
  
  // Мастерство
  baseMasteryBonus Float  @default(0.3)
  
  // Источник
  source        String   // preset, generated, insight, scroll
  
  // Метаданные генерации
  generationSeed Int?
  generatorVersion String?
  
  // Связи
  learnedBy     CharacterTechnique[]
  inPools       TechniquePoolItem[]
  
  @@index([type, level])
  @@index([element])
  @@index([rarity])
  @@map("techniques")
}

// Пул техник (для выбора при прорыве)
model TechniquePool {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  
  characterId   String
  character     Character @relation(fields: [characterId], references: [id])
  
  targetLevel   Int
  triggerType   String   // breakthrough, insight, scroll, npc
  isConsumed    Boolean  @default(false)
  
  techniques    TechniquePoolItem[]
  
  @@map("technique_pools")
}

model TechniquePoolItem {
  id            String   @id @default(cuid())
  
  poolId        String
  pool          TechniquePool @relation(fields: [poolId], references: [id], onDelete: Cascade)
  
  techniqueId   String?
  technique     Technique? @relation(fields: [techniqueId], references: [id])
  
  techniqueData String   // JSON сгенерированной техники (до выбора)
  
  isRevealed    Boolean  @default(false)  // Игрок увидел описание
  isSelected    Boolean  @default(false)  // Игрок выбрал технику
  
  learnedTechniqueId String? // ID созданной CharacterTechnique
  
  @@map("technique_pool_items")
}
```

### 5.2 API эндпоинты

```typescript
// POST /api/technique/generate
interface GenerateTechniquesRequest {
  characterId: string;
  count?: number;                    // По умолчанию 5
  targetLevel?: number;
  preferredType?: TechniqueType;
  preferredElement?: TechniqueElement;
  rarity?: TechniqueRarity;
  seed?: number;                     // Для воспроизводимости
}

interface GenerateTechniquesResponse {
  success: boolean;
  poolId?: string;
  techniques?: GeneratedTechnique[];
  error?: string;
}

// GET /api/technique/pool/:characterId
interface GetPoolResponse {
  poolId: string;
  techniques: Array<{
    id: string;
    isRevealed: boolean;
    isSelected: boolean;
    technique?: Partial<GeneratedTechnique>; // Только если isRevealed
  }>;
}

// POST /api/technique/reveal
interface RevealRequest {
  poolItemId: string;
}

// POST /api/technique/select
interface SelectRequest {
  poolItemId: string;
  characterId: string;
}
```

### 5.3 Интеграция с существующим кодом

```typescript
// src/lib/game/technique-generator.ts

import { 
  generateTechniques, 
  type GenerationContext 
} from './technique-generator-core';
import { 
  validateNewTechnique, 
  generateTechniqueId 
} from './techniques';
import { db } from '@/lib/db';

export class TechniqueGenerator {
  /**
   * Сгенерировать пул техник для прорыва
   */
  static async generateForBreakthrough(
    characterId: string,
    newLevel: number
  ): Promise<TechniquePoolResult> {
    // Получаем персонажа
    const character = await db.character.findUnique({
      where: { id: characterId },
      include: {
        techniques: {
          include: { technique: true }
        }
      }
    });
    
    if (!character) {
      return { success: false, error: 'Персонаж не найден' };
    }
    
    // Формируем контекст
    const context: GenerationContext = {
      character: {
        cultivationLevel: character.cultivationLevel,
        statDistribution: {
          strength: character.strength,
          agility: character.agility,
          intelligence: character.intelligence,
          conductivity: character.conductivity,
        },
        existingTechniques: character.techniques.map(t => t.technique.nameId),
      },
      targetLevel: newLevel,
      count: 5,
    };
    
    // Генерируем
    const techniques = generateTechniques(context);
    
    // Создаём пул в БД
    const pool = await db.techniquePool.create({
      data: {
        characterId,
        targetLevel: newLevel,
        triggerType: 'breakthrough',
        techniques: {
          create: techniques.map(t => ({
            techniqueData: JSON.stringify(t),
          })),
        },
      },
      include: { techniques: true },
    });
    
    return {
      success: true,
      poolId: pool.id,
      techniques,
    };
  }
  
  /**
   * Сгенерировать технику прозрения
   */
  static generateInsightTechnique(
    character: GenerationContext['character'],
    level: number
  ): GeneratedTechnique {
    const context: GenerationContext = {
      character,
      targetLevel: level,
      count: 1,
      rarity: 'rare', // Техники прозрения всегда редкие
    };
    
    const techniques = generateTechniques(context);
    return techniques[0];
  }
}
```

---

## 6️⃣ ПРИМЕРЫ ГЕНЕРАЦИИ

### 6.1 Пример: Боевая техника 2-го уровня

**Вход:**
```typescript
{
  character: {
    cultivationLevel: 2,
    statDistribution: { strength: 12, agility: 14, intelligence: 10, conductivity: 0.5 },
    existingTechniques: ['breath_of_qi', 'reinforced_strike'],
  },
  targetLevel: 2,
  preferredType: 'combat',
  count: 1,
  seed: 12345,
}
```

**Выход:**
```typescript
{
  id: 'whirlwind-palm-2',
  name: 'Вихревая ладонь',
  nameEn: 'Whirlwind Palm',
  description: 'Серия быстрых ударов, создающая воздушный вихрь. ' +
               'Наносит 32 единицы урона и имеет 15% шанс уклонения.',
  type: 'combat',
  subtype: 'melee_strike',
  element: 'air',
  rarity: 'uncommon',
  category: 'advanced',
  level: 2,
  minCultivationLevel: 1,
  maxLevel: 5,
  canEvolve: true,
  qiCost: 18,
  fatigueCost: { physical: 2.5, mental: 1.5 },
  requirements: {
    cultivationLevel: 2,
    stats: { agility: 14 },
  },
  scaling: {
    agility: 0.04,
    conductivity: 0.08,
  },
  effects: {
    damage: 32,
    combatType: 'melee_strike',
    contactRequired: true,
    range: { fullDamage: 2, halfDamage: 2, max: 2 },
    dodgeChance: 0.15,
  },
  masteryBonus: 0.35,
  generationMeta: {
    seed: 12345,
    template: 'melee_aggressive',
    components: ['whirlwind', 'palm', 'air'],
    generatedAt: '2026-02-28T...',
    generatorVersion: '1.0',
  },
}
```

### 6.2 Пример: Защитная техника 3-го уровня

**Вход:**
```typescript
{
  character: {
    cultivationLevel: 3,
    statDistribution: { strength: 10, agility: 12, intelligence: 16, conductivity: 0.8 },
    existingTechniques: ['breath_of_qi', 'water_shield'],
  },
  targetLevel: 3,
  preferredType: 'combat',
  preferredElement: 'water',
  count: 1,
  seed: 67890,
}
```

**Выход:**
```typescript
{
  id: 'frozen-barrier-3',
  name: 'Ледяной барьер',
  nameEn: 'Frozen Barrier',
  description: 'Создаёт защитный барьер из ледяной Ци. ' +
               'Поглощает 65 единиц урона, замедляет атакующих на 20%.',
  type: 'combat',
  subtype: 'defense_shield',
  element: 'water',
  rarity: 'rare',
  category: 'advanced',
  level: 3,
  minCultivationLevel: 2,
  maxLevel: 6,
  canEvolve: true,
  qiCost: 32,
  fatigueCost: { physical: 1, mental: 4 },
  requirements: {
    cultivationLevel: 3,
    stats: { intelligence: 16, conductivity: 0.6 },
    prerequisiteTechniques: ['water_shield'],
  },
  scaling: {
    intelligence: 0.05,
    conductivity: 0.1,
  },
  effects: {
    combatType: 'defense_shield',
    shieldHP: 65,
    regeneration: 8,
    qiDrainPerHit: 4,
    duration: 5,
    debuffs: [
      { type: 'slow', value: 20, duration: 1, stacking: false }
    ],
  },
  masteryBonus: 0.45,
  generationMeta: {
    seed: 67890,
    template: 'defensive_elemental',
    components: ['frozen', 'barrier', 'water'],
    generatedAt: '2026-02-28T...',
    generatorVersion: '1.0',
  },
}
```

---

## 7️⃣ ПЛАН РЕАЛИЗАЦИИ

### Фаза 1: Базовая структура (Приоритет: Высокий)
1. Создать интерфейсы и типы
2. Реализовать библиотеку эффектов
3. Создать базовую функцию генерации

### Фаза 2: Шаблоны (Приоритет: Высокий)
1. Реализовать генератор названий
2. Создать шаблоны описаний
3. Добавить элементальные модификаторы

### Фаза 3: Баланс (Приоритет: Высокий)
1. Реализовать систему балансировки
2. Добавить валидацию
3. Создать тесты для проверки генерации

### Фаза 4: Интеграция (Приоритет: Средний)
1. Интегрировать с Prisma
2. Создать API эндпоинты
3. Заменить fallback в technique-pool.service.ts

### Фаза 5: Расширение (Приоритет: Низкий)
1. Добавить новые типы эффектов
2. Реализовать синергии
3. Добавить условия применения

---

## 🔗 Связанные документы

- [docs/COMBAT_TECHNIQUES_SYSTEM.md](./COMBAT_TECHNIQUES_SYSTEM.md) — Система боевых техник
- [docs/FUNCTIONS.md](./FUNCTIONS.md) — Функции и типы проекта
- [src/data/presets/technique-presets.ts](../src/data/presets/technique-presets.ts) — Пресеты техник
- [src/lib/game/techniques.ts](../src/lib/game/techniques.ts) — Типы техник

---

*Документ создан: 2026-02-28*  
*Версия: 1.0*
