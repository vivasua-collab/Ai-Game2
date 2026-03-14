# 🎯 Единая система бонусов (Bonus Registry)

**Версия:** 2.0
**Создано:** 2026-03-14
**Обновлено:** 2026-03-14
**Статус:** 📋 Теоретические изыскания

---

## 📋 Обзор

Документ описывает **единую систему ID бонусов** для всех типов объектов игры:
- **Экипировка** (оружие, броня, украшения, зарядники)
- **Техники** (боевые, защитные, поддержки)
- **Формации** (боевые, медитационные)
- **Артефакты** (пассивные, активные)
- **Импланты** (части тела)
- **Состояния** (баффы, дебаффы, эффекты)

### Ключевые принципы

1. **ID-ификация** — каждый бонус имеет уникальный строковый ID
2. **Группировка** — бонусы группируются по категориям применения
3. **Масштабируемость** — бонусы имеют базовое значение и масштабирование
4. **Совместимость** — система определяет, какие бонусы применимы к каким объектам
5. **Унификация** — единый источник типов в `src/types/bonus-registry.ts`

---

## 🏗️ АРХИТЕКТУРА ГЕНЕРАЦИИ ("МАТРЁШКА")

### Принцип многослойной надстройки

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    АРХИТЕКТУРА ГЕНЕРАЦИИ ОБЪЕКТОВ                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  1. БАЗОВЫЙ ОБЪЕКТ (Base Object) — привязан к УРОВНЮ             │   │
│   │     • Тип объекта (weapon, technique, formation...)             │   │
│   │     • Уровень (1-9)                                             │   │
│   │     • Базовые параметры (damage, defense, qiCost...)            │   │
│   │     • Базовый материал (дерево, железо, камень)                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              +                                            │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  2. МАТЕРИАЛ (Material Overlay) — надстройка                     │   │
│   │     • ID материала (iron, spirit_iron, star_metal...)           │   │
│   │     • Тир материала (T1-T5)                                     │   │
│   │     • Бонусы от материала (см. materials.md)                    │   │
│   │     • Проводимость Ци, прочность, вес                           │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              +                                            │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  3. ГРЕЙД / РЕДКОСТЬ (Grade/Rarity Overlay) — надстройка         │   │
│   │     • Грейд (damaged → common → refined → perfect → transcendent)│   │
│   │     • Множители параметров (×0.5 ... ×4.0)                      │   │
│   │     • Дополнительные бонусы (через BonusRegistry)               │   │
│   │     • Специальные эффекты                                       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              =                                            │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  ИТОГОВЫЙ ОБЪЕКТ                                                 │   │
│   │  EffectiveStats = Base × MaterialBonuses × GradeMultipliers     │   │
│   │  Bonuses = BaseBonuses + MaterialBonuses + GradeBonuses         │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Пример: Железный меч L3, Refined

```
1. Базовый объект (Sword L3):
   - baseDamage: 25
   - baseDurability: 100
   - baseMaterial: iron (T1)

2. Материал: Iron
   - durabilityBonus: +30
   - qiConductivity: 0.5
   - weightMultiplier: 1.0

3. Грейд: Refined
   - damageMultiplier: ×1.3
   - durabilityMultiplier: ×1.5
   - bonusSlots: 1-2
   - specialEffectChance: 20%

ИТОГО:
   - damage: 25 × 1.3 = 32
   - durability: (100 + 30) × 1.5 = 195
   - bonuses: [+2 Сила] (от грейда)
   - qiConductivity: 0.5 (от материала)
```

---

## 1️⃣ ФАЙЛ ТИПОВ

### Расположение

**`src/types/bonus-registry.ts`** — единый источник типов для бонусов.

Этот файл:
- Импортируется всеми генераторами
- Унифицирован с `src/lib/generator/technique-config.ts` (BonusType)
- Используется в BonusRegistry классе

### Связь с technique-config.ts

Текущий `BonusType` в technique-config.ts будет расширен и интегрирован:

```typescript
// src/lib/generator/technique-config.ts (текущее)
export type BonusType = 
  | 'damage' | 'shieldHP' | 'healAmount' | 'qiRegen'
  | 'range' | 'duration' | 'critChance' | 'critDamage'
  | 'penetration' | 'effectPower' | 'cooldownReduce' | 'qiCostReduce';

// src/types/bonus-registry.ts (новое, унифицированное)
// BonusType ⊂ BonusCategory
// Все BonusType из technique-config.ts маппятся в category: 'combat' | 'defense' | 'qi' | 'special'
```

---

## 2️⃣ СТРУКТУРА ТИПОВ

### 2.1 Основные типы

```typescript
// src/types/bonus-registry.ts

/**
 * Категории бонусов
 */
export type BonusCategory = 
  | 'stat'           // Характеристики (сила, ловкость, интеллект)
  | 'combat'         // Боевые параметры (урон, крит, пробитие)
  | 'defense'        // Защита (броня, уклонение, HP)
  | 'qi'             // Ци и культивация
  | 'elemental'      // Элементальные (урон/сопротивление элементам)
  | 'condition'      // Состояния (горение, заморозка, отравление)
  | 'special'        // Особые эффекты (вампиризм, отражение)
  | 'utility';       // Утилити (скорость, скрытность)

/**
 * Подкатегории бонусов
 */
export type BonusSubcategory = 
  | 'primary'        // Первичные (сила, ловкость)
  | 'secondary'      // Вторичные (урон, защита)
  | 'resistance'     // Сопротивления
  | 'regeneration'   // Регенерация
  | 'modifier'       // Модификаторы
  | 'buff'           // Баффы (положительные состояния)
  | 'debuff';        // Дебаффы (отрицательные состояния)

/**
 * Тип значения бонуса
 */
export type BonusValueType = 
  | 'flat'           // Абсолютное значение (+10)
  | 'percent'        // Процент (+10%)
  | 'multiplier';    // Множитель (×1.5)

/**
 * Объекты, к которым применимы бонусы
 */
export type ApplicableTarget = 
  | 'weapon'         // Оружие
  | 'armor'          // Броня
  | 'jewelry'        // Украшения
  | 'charger'        // Зарядники
  | 'technique'      // Техники
  | 'formation'      // Формации
  | 'artifact'       // Артефакты
  | 'implant'        // Импланты
  | 'tool'           // Инструменты
  | 'condition';     // Состояния (баффы/дебаффы)

/**
 * Редкость (унифицирована)
 */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/**
 * Элементы (для elemental бонусов)
 */
export type Element = 'fire' | 'water' | 'earth' | 'air' | 'lightning' | 'void' | 'neutral';
```

### 2.2 Интерфейс бонуса

```typescript
/**
 * Полное определение бонуса
 */
export interface BonusDefinition {
  // === ИДЕНТИФИКАЦИЯ ===
  id: string;                    // Уникальный ID (например, "stat_strength_flat")
  name: string;                  // Отображаемое имя
  nameEn: string;                // Английское имя
  
  // === КЛАССИФИКАЦИЯ ===
  category: BonusCategory;       // Категория бонуса
  subcategory: BonusSubcategory; // Подкатегория
  valueType: BonusValueType;     // Тип значения
  
  // === ЭЛЕМЕНТ (только для elemental) ===
  element?: Element;
  
  // === ПАРАМЕТРЫ ===
  baseValue: number;             // Базовое значение
  scalingPerLevel: number;       // Масштабирование за уровень
  maxValue?: number;             // Максимальное значение
  minValue?: number;             // Минимальное значение
  
  // === ПРИМЕНИМОСТЬ ===
  applicableTo: ApplicableTarget[]; // К каким объектам применим
  
  // === КОНФЛИКТЫ ===
  incompatibleWith: string[];    // Несовместимые бонусы
  
  // === ОТОБРАЖЕНИЕ ===
  displayFormat: string;         // Формат отображения ({value}%)
  icon?: string;                 // Иконка
  
  // === РЕДКОСТЬ ===
  minRarity: Rarity;             // Минимальная редкость для появления
  weight: number;                // Вес для случайного выбора
}
```

---

## 3️⃣ КАТЕГОРИИ БОНУСОВ

### 3.1 STAT (Характеристики)

| ID | Название | Тип | База | За уровень | Цели |
|----|----------|-----|------|------------|------|
| `stat_strength_flat` | Сила | flat | 1 | +0.5 | weapon, armor, jewelry, implant |
| `stat_strength_percent` | Сила | percent | 2 | +0.5 | jewelry, artifact |
| `stat_agility_flat` | Ловкость | flat | 1 | +0.5 | weapon, armor, jewelry |
| `stat_agility_percent` | Ловкость | percent | 2 | +0.5 | jewelry, artifact |
| `stat_intelligence_flat` | Интеллект | flat | 1 | +0.5 | jewelry, artifact |
| `stat_intelligence_percent` | Интеллект | percent | 2 | +0.5 | jewelry, artifact |
| `stat_vitality_flat` | Жизненная сила | flat | 1 | +0.5 | armor, jewelry, implant |
| `stat_vitality_percent` | Жизненная сила | percent | 2 | +0.5 | jewelry, artifact |
| `stat_conductivity_flat` | Проводимость | flat | 0.5 | +0.2 | weapon, charger, jewelry |

### 3.2 COMBAT (Боевые параметры)

| ID | Название | Тип | База | За уровень | Цели |
|----|----------|-----|------|------------|------|
| `combat_damage_flat` | Урон | flat | 2 | +1 | weapon, technique |
| `combat_damage_percent` | Урон | percent | 3 | +1 | weapon, technique, artifact |
| `combat_penetration_flat` | Пробитие | flat | 1 | +0.5 | weapon |
| `combat_penetration_percent` | Пробитие | percent | 2 | +0.5 | weapon, technique |
| `combat_crit_chance` | Шанс крита | percent | 1 | +0.5 | weapon, jewelry |
| `combat_crit_damage` | Крит. урон | percent | 5 | +2 | weapon, artifact |
| `combat_attack_speed` | Скорость атаки | percent | 2 | +1 | weapon |
| `combat_range_flat` | Дальность | flat | 0.5 | +0.2 | weapon, technique |
| `combat_cooldown_reduce` | Снижение перезарядки | percent | 1 | +0.3 | technique |

### 3.3 DEFENSE (Защита)

| ID | Название | Тип | База | За уровень | Цели |
|----|----------|-----|------|------------|------|
| `defense_armor_flat` | Броня | flat | 2 | +1 | armor |
| `defense_armor_percent` | Броня | percent | 3 | +1 | armor, artifact |
| `defense_dodge_flat` | Уклонение | percent | 1 | +0.5 | armor, jewelry |
| `defense_block_flat` | Блок | percent | 2 | +1 | armor, weapon |
| `defense_hp_flat` | Здоровье | flat | 10 | +5 | armor, implant |
| `defense_hp_percent` | Здоровье | percent | 3 | +1 | armor, artifact |
| `defense_shield_hp` | HP щита | flat | 10 | +5 | technique, artifact |
| `defense_damage_reduction` | Снижение урона | percent | 2 | +0.5 | technique, artifact |

### 3.4 QI (Ци и культивация)

| ID | Название | Тип | База | За уровень | Цели |
|----|----------|-----|------|------------|------|
| `qi_max_flat` | Макс. Ци | flat | 20 | +10 | jewelry, charger, artifact |
| `qi_max_percent` | Макс. Ци | percent | 3 | +1 | jewelry, artifact |
| `qi_regen_flat` | Регенерация Ци | flat | 0.5 | +0.2 | jewelry, charger |
| `qi_regen_percent` | Регенерация Ци | percent | 2 | +0.5 | jewelry, artifact |
| `qi_cost_reduce` | Снижение стоимости | percent | 2 | +0.5 | technique, artifact |
| `qi_efficiency` | Эффективность Ци | percent | 3 | +1 | technique, charger |
| `qi_conductivity_bonus` | Бонус проводимости | percent | 1 | +0.3 | charger, jewelry |

### 3.5 ELEMENTAL (Элементальные)

| ID | Название | Тип | База | За уровень | Элемент |
|----|----------|-----|------|------------|---------|
| `elemental_fire_damage` | Урон огнём | percent | 3 | +1 | fire |
| `elemental_fire_resist` | Сопр. огню | percent | 3 | +1 | fire |
| `elemental_water_damage` | Урон водой | percent | 3 | +1 | water |
| `elemental_water_resist` | Сопр. воде | percent | 3 | +1 | water |
| `elemental_earth_damage` | Урон землёй | percent | 3 | +1 | earth |
| `elemental_earth_resist` | Сопр. земле | percent | 3 | +1 | earth |
| `elemental_air_damage` | Урон воздухом | percent | 3 | +1 | air |
| `elemental_air_resist` | Сопр. воздуху | percent | 3 | +1 | air |
| `elemental_lightning_damage` | Урон молнией | percent | 3 | +1 | lightning |
| `elemental_lightning_resist` | Сопр. молнии | percent | 3 | +1 | lightning |
| `elemental_void_damage` | Урон пустотой | percent | 5 | +2 | void |
| `elemental_void_resist` | Сопр. пустоте | percent | 5 | +2 | void |

### 3.6 CONDITION (Состояния) — НОВАЯ КАТЕГОРИЯ

#### 3.6.1 Положительные состояния (баффы)

| ID | Название | Тип | База | За уровень | Источник |
|----|----------|-----|------|------------|----------|
| `condition_haste` | Ускорение | percent | 10 | +2 | technique, artifact |
| `condition_regeneration` | Регенерация HP | flat | 2 | +0.5 | technique, healing |
| `condition_clarity` | Ясность ума | percent | 10 | +2 | technique, meditation |
| `condition_fortify` | Укрепление | percent | 5 | +1 | technique, defense |
| `condition_berserk` | Берсерк | percent | 15 | +3 | technique, curse |
| `condition_invisibility` | Невидимость | flat | 5 | +1 | technique, artifact |
| `condition_shield` | Энерг. щит | flat | 50 | +10 | technique, defense |
| `condition_reflect` | Отражение | percent | 10 | +2 | technique, artifact |

#### 3.6.2 Отрицательные состояния (дебаффы)

| ID | Название | Тип | База | За уровень | Источник |
|----|----------|-----|------|------------|----------|
| `condition_burning` | Горение | flat | 2 | +0.5 | fire damage, technique |
| `condition_freezing` | Заморозка | percent | 20 | +5 | water damage, technique |
| `condition_poison` | Отравление | flat | 1 | +0.3 | technique, poison |
| `condition_stun` | Оглушение | flat | 0.5 | +0.1 | technique, combat |
| `condition_slow` | Замедление | percent | 20 | +5 | technique, curse |
| `condition_weakness` | Слабость | percent | 10 | +2 | technique, curse |
| `condition_silence` | Безмолвие | flat | 3 | +0.5 | technique, curse |
| `condition_bleed` | Кровотечение | flat | 1 | +0.3 | weapon, technique |
| `condition_curse` | Проклятие | percent | 10 | +2 | technique, curse |
| `condition_fear` | Страх | percent | 15 | +3 | technique, curse |

#### 3.6.3 Определения состояний

```typescript
const CONDITION_BONUSES: BonusDefinition[] = [
  // === ПОЛОЖИТЕЛЬНЫЕ (баффы) ===
  {
    id: 'condition_haste',
    name: 'Ускорение',
    nameEn: 'Haste',
    category: 'condition',
    subcategory: 'buff',
    valueType: 'percent',
    baseValue: 10,
    scalingPerLevel: 2,
    maxValue: 100,
    applicableTo: ['technique', 'artifact', 'condition'],
    incompatibleWith: ['condition_slow'],
    displayFormat: '+{value}% Скорость',
    minRarity: 'uncommon',
    weight: 40,
  },
  {
    id: 'condition_regeneration',
    name: 'Регенерация',
    nameEn: 'Regeneration',
    category: 'condition',
    subcategory: 'buff',
    valueType: 'flat',
    baseValue: 2,
    scalingPerLevel: 0.5,
    maxValue: 20,
    applicableTo: ['technique', 'condition'],
    incompatibleWith: ['condition_poison', 'condition_bleed'],
    displayFormat: '+{value} HP/сек',
    minRarity: 'uncommon',
    weight: 50,
  },
  {
    id: 'condition_shield',
    name: 'Энергетический щит',
    nameEn: 'Energy Shield',
    category: 'condition',
    subcategory: 'buff',
    valueType: 'flat',
    baseValue: 50,
    scalingPerLevel: 10,
    maxValue: 500,
    applicableTo: ['technique', 'artifact', 'condition'],
    incompatibleWith: [],
    displayFormat: 'Щит: {value} HP',
    minRarity: 'rare',
    weight: 30,
  },
  
  // === ОТРИЦАТЕЛЬНЫЕ (дебаффы) ===
  {
    id: 'condition_burning',
    name: 'Горение',
    nameEn: 'Burning',
    category: 'condition',
    subcategory: 'debuff',
    valueType: 'flat',
    baseValue: 2,
    scalingPerLevel: 0.5,
    maxValue: 50,
    element: 'fire',
    applicableTo: ['technique', 'weapon', 'condition'],
    incompatibleWith: ['condition_freezing'],
    displayFormat: 'Горение: {value} урона/сек',
    minRarity: 'uncommon',
    weight: 40,
  },
  {
    id: 'condition_freezing',
    name: 'Заморозка',
    nameEn: 'Freezing',
    category: 'condition',
    subcategory: 'debuff',
    valueType: 'percent',
    baseValue: 20,
    scalingPerLevel: 5,
    maxValue: 80,
    element: 'water',
    applicableTo: ['technique', 'condition'],
    incompatibleWith: ['condition_burning', 'condition_haste'],
    displayFormat: 'Заморозка: -{value}% скорость',
    minRarity: 'uncommon',
    weight: 35,
  },
  {
    id: 'condition_poison',
    name: 'Отравление',
    nameEn: 'Poison',
    category: 'condition',
    subcategory: 'debuff',
    valueType: 'flat',
    baseValue: 1,
    scalingPerLevel: 0.3,
    maxValue: 30,
    applicableTo: ['technique', 'weapon', 'condition'],
    incompatibleWith: ['condition_regeneration'],
    displayFormat: 'Отравление: {value} урона/сек',
    minRarity: 'common',
    weight: 60,
  },
  {
    id: 'condition_stun',
    name: 'Оглушение',
    nameEn: 'Stun',
    category: 'condition',
    subcategory: 'debuff',
    valueType: 'flat',
    baseValue: 0.5,
    scalingPerLevel: 0.1,
    maxValue: 3,
    applicableTo: ['technique', 'weapon', 'condition'],
    incompatibleWith: [],
    displayFormat: 'Оглушение: {value} сек',
    minRarity: 'rare',
    weight: 20,
  },
  {
    id: 'condition_slow',
    name: 'Замедление',
    nameEn: 'Slow',
    category: 'condition',
    subcategory: 'debuff',
    valueType: 'percent',
    baseValue: 20,
    scalingPerLevel: 5,
    maxValue: 80,
    applicableTo: ['technique', 'condition'],
    incompatibleWith: ['condition_haste'],
    displayFormat: 'Замедление: -{value}% скорость',
    minRarity: 'common',
    weight: 50,
  },
  {
    id: 'condition_bleed',
    name: 'Кровотечение',
    nameEn: 'Bleed',
    category: 'condition',
    subcategory: 'debuff',
    valueType: 'flat',
    baseValue: 1,
    scalingPerLevel: 0.3,
    maxValue: 20,
    applicableTo: ['weapon', 'technique', 'condition'],
    incompatibleWith: ['condition_regeneration'],
    displayFormat: 'Кровотечение: {value} урона/сек',
    minRarity: 'uncommon',
    weight: 45,
  },
  {
    id: 'condition_curse',
    name: 'Проклятие',
    nameEn: 'Curse',
    category: 'condition',
    subcategory: 'debuff',
    valueType: 'percent',
    baseValue: 10,
    scalingPerLevel: 2,
    maxValue: 50,
    applicableTo: ['technique', 'condition'],
    incompatibleWith: ['condition_fortify'],
    displayFormat: 'Проклятие: -{value}% характеристики',
    minRarity: 'rare',
    weight: 25,
  },
];
```

### 3.7 SPECIAL (Особые эффекты)

| ID | Название | Тип | Описание | Цели |
|----|----------|-----|----------|------|
| `special_leech` | Вампиризм | percent | Кража HP | weapon, technique |
| `special_knockback` | Отбрасывание | flat | Отталкивание | weapon, technique |
| `special_pierce` | Пробитие | percent | Игнор. брони | weapon, technique |
| `special_aoe` | AoE | flat | Область действия | technique |
| `special_reflect` | Отражение | percent | Отраж. урона | armor, technique |
| `special_chain` | Цепь | flat | Цепной удар | technique |
| `special_lifesteal` | Похищение жизни | percent | Лифтыл | weapon, technique |

### 3.8 UTILITY (Утилити)

| ID | Название | Тип | База | За уровень | Цели |
|----|----------|-----|------|------------|------|
| `utility_move_speed` | Скорость движения | percent | 2 | +1 | armor, jewelry |
| `utility_weight_capacity` | Вместимость | flat | 5 | +2 | charger, jewelry |
| `utility_gathering_speed` | Скорость сбора | percent | 5 | +2 | tool |
| `utility_crafting_speed` | Скорость крафта | percent | 5 | +2 | tool |
| `utility_stealth` | Скрытность | percent | 3 | +1 | armor, jewelry |
| `utility_perception` | Восприятие | percent | 3 | +1 | jewelry, implant |

---

## 4️⃣ РЕЕСТР БОНУСОВ (BonusRegistry)

### 4.1 Класс реестра

```typescript
// src/lib/game/bonus-registry.ts

import {
  BonusDefinition,
  BonusCategory,
  ApplicableTarget,
  Rarity,
} from '@/types/bonus-registry';

/**
 * Глобальный реестр бонусов
 */
class BonusRegistry {
  private bonuses: Map<string, BonusDefinition> = new Map();
  private byCategory: Map<BonusCategory, BonusDefinition[]> = new Map();
  private byTarget: Map<ApplicableTarget, BonusDefinition[]> = new Map();
  
  /**
   * Регистрация бонуса
   */
  register(bonus: BonusDefinition): void {
    this.bonuses.set(bonus.id, bonus);
    
    // Индексируем по категории
    const categoryList = this.byCategory.get(bonus.category) || [];
    categoryList.push(bonus);
    this.byCategory.set(bonus.category, categoryList);
    
    // Индексируем по целям
    for (const target of bonus.applicableTo) {
      const targetList = this.byTarget.get(target) || [];
      targetList.push(bonus);
      this.byTarget.set(target, targetList);
    }
  }
  
  /**
   * Массовая регистрация
   */
  registerAll(bonuses: BonusDefinition[]): void {
    bonuses.forEach(b => this.register(b));
  }
  
  /**
   * Получение бонуса по ID
   */
  get(id: string): BonusDefinition | undefined {
    return this.bonuses.get(id);
  }
  
  /**
   * Получение бонусов для объекта
   */
  getForTarget(target: ApplicableTarget): BonusDefinition[] {
    return this.byTarget.get(target) || [];
  }
  
  /**
   * Получение бонусов по категории
   */
  getByCategory(category: BonusCategory): BonusDefinition[] {
    return this.byCategory.get(category) || [];
  }
  
  /**
   * Случайный выбор бонуса для объекта
   */
  randomForTarget(
    target: ApplicableTarget,
    minRarity: Rarity,
    rng: () => number
  ): BonusDefinition | null {
    const eligible = this.getForTarget(target)
      .filter(b => this.rarityIndex(b.minRarity) <= this.rarityIndex(minRarity));
    
    if (eligible.length === 0) return null;
    
    // Взвешенный выбор
    const totalWeight = eligible.reduce((sum, b) => sum + b.weight, 0);
    let roll = rng() * totalWeight;
    
    for (const bonus of eligible) {
      roll -= bonus.weight;
      if (roll <= 0) return bonus;
    }
    
    return eligible[eligible.length - 1];
  }
  
  /**
   * Вычисление значения бонуса
   */
  calculateValue(
    bonusId: string,
    level: number,
    gradeMultiplier: number
  ): number {
    const bonus = this.get(bonusId);
    if (!bonus) return 0;
    
    let value = bonus.baseValue + (bonus.scalingPerLevel * level);
    value *= gradeMultiplier;
    
    if (bonus.maxValue) value = Math.min(value, bonus.maxValue);
    if (bonus.minValue) value = Math.max(value, bonus.minValue);
    
    return Math.floor(value);
  }
  
  /**
   * Проверка совместимости бонусов
   */
  areCompatible(bonusId1: string, bonusId2: string): boolean {
    const bonus1 = this.get(bonusId1);
    const bonus2 = this.get(bonusId2);
    
    if (!bonus1 || !bonus2) return true;
    
    return !bonus1.incompatibleWith.includes(bonusId2) &&
           !bonus2.incompatibleWith.includes(bonusId1);
  }
  
  /**
   * Индекс редкости
   */
  private rarityIndex(rarity: Rarity): number {
    return ['common', 'uncommon', 'rare', 'legendary'].indexOf(rarity);
  }
}

export const bonusRegistry = new BonusRegistry();
```

### 4.2 Инициализация

```typescript
// src/lib/game/bonus-registry-init.ts

import { bonusRegistry } from './bonus-registry';
import { STAT_BONUSES } from './bonuses/stat-bonuses';
import { COMBAT_BONUSES } from './bonuses/combat-bonuses';
import { DEFENSE_BONUSES } from './bonuses/defense-bonuses';
import { QI_BONUSES } from './bonuses/qi-bonuses';
import { ELEMENTAL_BONUSES } from './bonuses/elemental-bonuses';
import { CONDITION_BONUSES } from './bonuses/condition-bonuses';
import { SPECIAL_BONUSES } from './bonuses/special-bonuses';
import { UTILITY_BONUSES } from './bonuses/utility-bonuses';

/**
 * Инициализация реестра бонусов
 * Вызывается при старте приложения
 */
export function initializeBonusRegistry(): void {
  bonusRegistry.registerAll(STAT_BONUSES);
  bonusRegistry.registerAll(COMBAT_BONUSES);
  bonusRegistry.registerAll(DEFENSE_BONUSES);
  bonusRegistry.registerAll(QI_BONUSES);
  bonusRegistry.registerAll(ELEMENTAL_BONUSES);
  bonusRegistry.registerAll(CONDITION_BONUSES);
  bonusRegistry.registerAll(SPECIAL_BONUSES);
  bonusRegistry.registerAll(UTILITY_BONUSES);
  
  console.log(`[BonusRegistry] Registered ${bonusRegistry.getAll().length} bonuses`);
}
```

---

## 5️⃣ ПРАВИЛА ГЕНЕРАЦИИ БОНУСОВ

### 5.1 По типу объекта

```typescript
/**
 * Правила генерации бонусов для разных типов объектов
 */
const BONUS_RULES_BY_TARGET: Record<ApplicableTarget, {
  minBonuses: Record<Rarity, number>;
  maxBonuses: Record<Rarity, number>;
  categories: BonusCategory[];
  excludeCategories: BonusCategory[];
}> = {
  weapon: {
    minBonuses: { common: 0, uncommon: 1, rare: 2, legendary: 3 },
    maxBonuses: { common: 1, uncommon: 2, rare: 3, legendary: 5 },
    categories: ['stat', 'combat', 'elemental', 'special', 'condition'],
    excludeCategories: ['defense', 'qi', 'utility'],
  },
  armor: {
    minBonuses: { common: 0, uncommon: 1, rare: 2, legendary: 3 },
    maxBonuses: { common: 1, uncommon: 2, rare: 4, legendary: 6 },
    categories: ['stat', 'defense', 'elemental', 'utility', 'condition'],
    excludeCategories: ['combat', 'special'],
  },
  jewelry: {
    minBonuses: { common: 0, uncommon: 1, rare: 2, legendary: 3 },
    maxBonuses: { common: 2, uncommon: 3, rare: 4, legendary: 6 },
    categories: ['stat', 'combat', 'defense', 'qi', 'elemental', 'utility'],
    excludeCategories: ['special', 'condition'],
  },
  charger: {
    minBonuses: { common: 0, uncommon: 1, rare: 2, legendary: 3 },
    maxBonuses: { common: 1, uncommon: 2, rare: 3, legendary: 4 },
    categories: ['stat', 'qi', 'utility'],
    excludeCategories: ['combat', 'defense', 'special', 'condition', 'elemental'],
  },
  technique: {
    minBonuses: { common: 0, uncommon: 1, rare: 2, legendary: 3 },
    maxBonuses: { common: 1, uncommon: 2, rare: 3, legendary: 4 },
    categories: ['combat', 'qi', 'elemental', 'special', 'condition'],
    excludeCategories: ['stat', 'defense', 'utility'],
  },
  formation: {
    minBonuses: { common: 1, uncommon: 2, rare: 3, legendary: 4 },
    maxBonuses: { common: 2, uncommon: 3, rare: 5, legendary: 8 },
    categories: ['stat', 'combat', 'defense', 'qi', 'elemental'],
    excludeCategories: ['special', 'utility', 'condition'],
  },
  artifact: {
    minBonuses: { common: 1, uncommon: 2, rare: 3, legendary: 4 },
    maxBonuses: { common: 2, uncommon: 4, rare: 6, legendary: 10 },
    categories: ['stat', 'combat', 'defense', 'qi', 'elemental', 'special', 'condition'],
    excludeCategories: ['utility'],
  },
  implant: {
    minBonuses: { common: 0, uncommon: 1, rare: 2, legendary: 3 },
    maxBonuses: { common: 1, uncommon: 2, rare: 4, legendary: 6 },
    categories: ['stat', 'defense', 'qi', 'utility'],
    excludeCategories: ['combat', 'elemental', 'special', 'condition'],
  },
  tool: {
    minBonuses: { common: 0, uncommon: 1, rare: 1, legendary: 2 },
    maxBonuses: { common: 1, uncommon: 2, rare: 3, legendary: 4 },
    categories: ['utility'],
    excludeCategories: ['stat', 'combat', 'defense', 'qi', 'elemental', 'special', 'condition'],
  },
  condition: {
    minBonuses: { common: 1, uncommon: 1, rare: 2, legendary: 3 },
    maxBonuses: { common: 2, uncommon: 3, rare: 4, legendary: 6 },
    categories: ['condition'],
    excludeCategories: ['stat', 'combat', 'defense', 'qi', 'elemental', 'special', 'utility'],
  },
};
```

### 5.2 Функция генерации

```typescript
/**
 * Результат генерации бонуса
 */
export interface GeneratedBonus {
  id: string;
  name: string;
  value: number;
  valueType: BonusValueType;
  displayText: string;
}

/**
 * Генерация бонусов для объекта
 */
export function generateBonuses(
  target: ApplicableTarget,
  level: number,
  rarity: Rarity,
  gradeMultiplier: number,
  rng: () => number
): GeneratedBonus[] {
  const rules = BONUS_RULES_BY_TARGET[target];
  const result: GeneratedBonus[] = [];
  
  // Определяем количество бонусов
  const minCount = rules.minBonuses[rarity];
  const maxCount = rules.maxBonuses[rarity];
  const count = minCount + Math.floor(rng() * (maxCount - minCount + 1));
  
  // Получаем доступные бонусы
  const eligibleBonuses = bonusRegistry.getForTarget(target)
    .filter(b => 
      rules.categories.includes(b.category) &&
      !rules.excludeCategories.includes(b.category) &&
      bonusRegistry.rarityIndex(b.minRarity) <= bonusRegistry.rarityIndex(rarity)
    );
  
  // Выбираем бонусы
  const usedIds = new Set<string>();
  
  for (let i = 0; i < count && eligibleBonuses.length > 0; i++) {
    // Фильтруем несовместимые
    const compatible = eligibleBonuses.filter(b =>
      !usedIds.has(b.id) &&
      !b.incompatibleWith.some(inc => usedIds.has(inc))
    );
    
    if (compatible.length === 0) break;
    
    // Взвешенный выбор
    const totalWeight = compatible.reduce((sum, b) => sum + b.weight, 0);
    let roll = rng() * totalWeight;
    
    let selected: BonusDefinition | null = null;
    for (const bonus of compatible) {
      roll -= bonus.weight;
      if (roll <= 0) {
        selected = bonus;
        break;
      }
    }
    
    if (!selected) selected = compatible[compatible.length - 1];
    
    usedIds.add(selected.id);
    
    // Вычисляем значение
    const value = bonusRegistry.calculateValue(selected.id, level, gradeMultiplier);
    
    result.push({
      id: selected.id,
      name: selected.name,
      value,
      valueType: selected.valueType,
      displayText: selected.displayFormat.replace('{value}', String(value)),
    });
  }
  
  return result;
}
```

---

## 6️⃣ УНИФИКАЦИЯ С TECHNIQUE-CONFIG.TS

### 6.1 Маппинг BonusType → BonusCategory

```typescript
// src/lib/generator/bonus-type-mapping.ts

import { BonusType } from './technique-config';
import { BonusCategory } from '@/types/bonus-registry';

/**
 * Маппинг типов бонусов из technique-config в категории бонус-реестра
 */
export const BONUS_TYPE_TO_CATEGORY: Record<BonusType, BonusCategory> = {
  damage: 'combat',
  shieldHP: 'defense',
  healAmount: 'defense',
  qiRegen: 'qi',
  range: 'combat',
  duration: 'special',
  critChance: 'combat',
  critDamage: 'combat',
  penetration: 'combat',
  effectPower: 'special',
  cooldownReduce: 'combat',
  qiCostReduce: 'qi',
};

/**
 * Маппинг BonusType в ID бонуса
 */
export const BONUS_TYPE_TO_ID: Record<BonusType, string> = {
  damage: 'combat_damage_flat',
  shieldHP: 'defense_shield_hp',
  healAmount: 'defense_hp_flat',
  qiRegen: 'qi_regen_flat',
  range: 'combat_range_flat',
  duration: 'special_duration',
  critChance: 'combat_crit_chance',
  critDamage: 'combat_crit_damage',
  penetration: 'combat_penetration_flat',
  effectPower: 'special_effect_power',
  cooldownReduce: 'combat_cooldown_reduce',
  qiCostReduce: 'qi_cost_reduce',
};

/**
 * Конвертация BonusSlot из technique-config в GeneratedBonus
 */
export function convertBonusSlotToGenerated(
  slot: BonusSlot,
  level: number,
  rng: () => number
): GeneratedBonus {
  const id = BONUS_TYPE_TO_ID[slot.type];
  const value = slot.minValue + Math.floor(rng() * (slot.maxValue - slot.minValue + 1));
  
  return {
    id,
    name: slot.label,
    value,
    valueType: 'flat', // Большинство бонусов техник - flat
    displayText: slot.description,
  };
}
```

### 6.2 Обновлённый technique-config.ts

```typescript
// Обновление: добавить импорт из bonus-registry

import { 
  BonusCategory, 
  BonusValueType, 
  ApplicableTarget,
  Rarity 
} from '@/types/bonus-registry';

// BonusType остаётся для совместимости с UI
// Но внутри используется BonusRegistry
```

---

## 7️⃣ СИСТЕМА СОСТОЯНИЙ (CONDITIONS)

### 7.1 Применение состояний

Состояния (conditions) могут быть:
- **Наложены техниками** — через бонусы `condition_*`
- **Наложены оружием** — при ударе с шансом
- **Наложены артефактами** — постоянный эффект
- **Наложены окружением** — погода, локация

### 7.2 Механика состояний

```typescript
/**
 * Активное состояние на персонаже
 */
export interface ActiveCondition {
  id: string;                    // ID состояния (condition_burning)
  source: 'technique' | 'weapon' | 'artifact' | 'environment';
  sourceId?: string;             // ID источника
  value: number;                 // Сила эффекта
  duration: number;              // Оставшееся время (сек)
  maxDuration: number;           // Максимальная длительность
  stacks?: number;               // Количество стаков (для stacking дебаффов)
  tickInterval?: number;         // Интервал тика (для DoT)
  lastTick?: number;             // Время последнего тика
}

/**
 * Обработка тика состояния
 */
export function processConditionTick(
  condition: ActiveCondition,
  target: Character
): ConditionTickResult {
  const definition = bonusRegistry.get(condition.id);
  if (!definition) return { damage: 0, effect: 'none' };
  
  // DoT эффекты (burning, poison, bleed)
  if (['condition_burning', 'condition_poison', 'condition_bleed'].includes(condition.id)) {
    return {
      damage: condition.value,
      effect: 'dot',
    };
  }
  
  // Замедление (freezing, slow)
  if (['condition_freezing', 'condition_slow'].includes(condition.id)) {
    return {
      damage: 0,
      effect: 'slow',
      slowPercent: condition.value,
    };
  }
  
  // Оглушение (stun)
  if (condition.id === 'condition_stun') {
    return {
      damage: 0,
      effect: 'stun',
      duration: condition.value,
    };
  }
  
  // Остальные
  return { damage: 0, effect: 'none' };
}
```

---

## 🔗 Связанные документы

- [equip.md](./equip.md) — Унифицированная система экипировки
- [materials.md](./materials.md) — Система материалов
- [technique-system.md](./technique-system.md) — Система техник
- [FUNCTIONS.md](./FUNCTIONS.md) — Функции и типы проекта

---

## 📝 История изменений

| Дата | Версия | Изменение |
|------|--------|-----------|
| 2026-03-14 | 1.0 | Создан документ |
| 2026-03-14 | 2.0 | Добавлена категория CONDITION, унификация с technique-config.ts, архитектура "матрёшка" |

---

*Документ создан: 2026-03-14*
*Обновлён: 2026-03-14*
