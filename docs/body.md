# 🦴 Концепция Тела (Body Concept)

**Версия:** 1.1  
**Создано:** 2026-02-28  
**Статус:** Черновик  
**Последнее обновление:** Добавлены сердце, система приживления, привязка к ТИКАМ

---

## 📋 Обзор

Документ описывает универсальную систему конструирования тел для:
- **NPC** — неигровых персонажей
- **Монстров** — враждебных существ
- **Духов** — нематериальных сущностей
- **Игроков** — при генерации персонажа

### Цели системы

1. **Модульность** — сборка любого существа из базовых компонентов
2. **Наследование** — свойства вида влияют на тело и способности
3. **Секторные повреждения** — подготовка к системе хитбоксов частей тела
4. **Масштабируемость** — поддержка от мыши до титана

---

## 🏗️ Архитектура системы

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          СУЩНОСТЬ (Entity)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│  │    ВИД       │   │    ТЕЛО      │   │    ДУХ       │                │
│  │  (Species)   │ → │    (Body)    │   │   (Spirit)   │                │
│  └──────────────┘   └──────────────┘   └──────────────┘                │
│         │                  │                   │                         │
│         ▼                  ▼                   ▼                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│  │    Тип       │   │   Физика     │   │    Ядро      │                │
│  │  Возможности │   │   Размеры    │   │  Меридианы   │                │
│  │  Навыки      │   │   Конечности │   │  Интеллект   │                │
│  └──────────────┘   └──────────────┘   └──────────────┘                │
│                                                                          │
│                     ┌──────────────────────┐                            │
│                     │  ВРОЖДЁННЫЕ ТЕХНИКИ  │                            │
│                     │  (InnateTechniques)  │                            │
│                     └──────────────────────┘                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ ВИД (Species)

Вид определяет фундаментальную природу существа и набор базовых возможностей.

### 1.1 Типы видов

```typescript
type SpeciesType = 
  | 'humanoid'    // Человекоподобные (человек, эльф, демон-гуманоид)
  | 'beast'       // Звери (волк, медведь, дракон)
  | 'spirit'      // Духи (призрак, элементаль, божество)
  | 'hybrid'      // Гибриды (кентавр, русалка, оборотень)
  | 'aberration'; // Аберрации (хтонь, мутанты, порождения хаоса)
```

### 1.2 Подтипы видов

```typescript
interface SpeciesSubtype {
  humanoid: [
    'human',        // Человек
    'elf',          // Эльф (древняя раса)
    'demon',        // Демон-гуманоид
    'giant',        // Великан
    'dwarf',        // Карлик
    'beastkin',     // Зверолюд (кошколюд, волколюд)
  ];
  beast: [
    'predator',     // Хищник (волк, тигр, медведь)
    'herbivore',    // Травоядное (олень, бизон)
    'reptile',      // Рептилия (змея, ящерица)
    'bird',         // Птица (орёл, ворон)
    'aquatic',      // Водное (рыба, кит)
    'insect',       // Насекомое (паук, скорпион)
    'dragon',       // Дракон (особый класс)
    'legendary',    // Легендарный зверь (цилинь, феникс)
  ];
  spirit: [
    'ghost',        // Призрак (бесплотный)
    'elemental',    // Элементаль (огонь, вода, земля, воздух)
    'divine',       // Божество (низшее, высшее)
    'demonic',      // Демонический дух
    'nature',       // Дух природы (лесной, горный)
  ];
  hybrid: [
    'centaur',      // Кентавр (человек + конь)
    'mermaid',      // Русалка (человек + рыба)
    'werewolf',     // Оборотень (человек + волк)
    'harpy',        // Гарпия (человек + птица)
    'lamia',        // Ламия (человек + змея)
    'sphinx',       // Сфинкс (человек + лев + орёл)
  ];
  aberration: [
    'chaos',        // Порождение хаоса
    'cthonian',     // Хтонь (порождённая высоким фоном Ци)
    'mutant',       // Мутант
    'construct',    // Конструкт (голем, созданный объект)
  ];
}
```

### 1.3 Свойства вида

```typescript
interface SpeciesProperties {
  // === ИДЕНТИФИКАЦИЯ ===
  id: string;                    // Уникальный ID вида
  name: string;                  // Название вида
  type: SpeciesType;             // Тип вида
  subtype: string;               // Подтип
  
  // === БАЗОВЫЕ ХАРАКТЕРИСТИКИ ===
  baseStats: {
    strength: Range;             // Диапазон силы (min-max)
    agility: Range;              // Диапазон ловкости
    intelligence: Range;         // Диапазон интеллекта
    vitality: Range;             // Диапазон жизненной силы
  };
  
  // === СПОСОБНОСТИ ===
  capabilities: {
    canCultivate: boolean;       // Может культивировать
    innateQiGeneration: boolean; // Врождённая генерация Ци
    speechCapable: boolean;      // Может говорить
    toolUse: boolean;            // Может использовать инструменты
    learningRate: number;        // Скорость обучения (0.1 - 2.0)
  };
  
  // === СТАРЕНИЕ ===
  aging: {
    lifespan: number;            // Максимальная продолжительность (годы)
    maturityAge: number;         // Возраст зрелости
    declineAge: number;          // Возраст старения
    agingModifier: number;       // Множитель старения для культиваторов
  };
  
  // === КУЛЬТИВАЦИЯ ===
  cultivation: {
    coreCapacityBase: Range;     // Базовая ёмкость ядра
    coreQualityRange: Range;     // Диапазон качества ядра
    conductivityBase: number;    // Базовая проводимость
    breakthroughMultiplier: number; // Множитель сложности прорыва
    maxCultivationLevel: number; // Максимальный уровень культивации (обычно 9)
  };
  
  // === ТИПЫ ПЕРЕДВИЖЕНИЯ ===
  movementTypes: MovementType[];
  
  // === ВРОЖДЁННЫЕ НАВЫКИ ===
  innateSkills: string[];        // ID врождённых навыков
  
  // === ВРОЖДЁННЫЕ ТЕХНИКИ ===
  innateTechniques: InnateTechniqueGrant[];
  
  // === ОСОБЕННОСТИ ===
  traits: SpeciesTrait[];        // Особенности вида
  weaknesses: string[];          // Слабости
  resistances: string[];         // Сопротивления
}

type MovementType = 
  | 'biped'        // Двуногое (2 ноги)
  | 'quadruped'    // Четвероногое (4 ноги)
  | 'multiped'     // Многоногое (6+ ног)
  | 'serpentine'   // Змееподобное (без ног)
  | 'flight'       // Полёт (крылья)
  | 'swim_surface' // Плавание по поверхности
  | 'swim_underwater' // Подводное плавание
  | 'levitation'   // Левитация (магический полёт)
  | 'burrow';      // Закапывание

interface Range {
  min: number;
  max: number;
}
```

### 1.4 Примеры видов

#### Человек (Human)
```typescript
{
  id: 'human',
  name: 'Человек',
  type: 'humanoid',
  subtype: 'human',
  
  baseStats: {
    strength: { min: 5, max: 20 },
    agility: { min: 5, max: 20 },
    intelligence: { min: 5, max: 25 },
    vitality: { min: 5, max: 18 },
  },
  
  capabilities: {
    canCultivate: true,
    innateQiGeneration: false,
    speechCapable: true,
    toolUse: true,
    learningRate: 1.0,
  },
  
  aging: {
    lifespan: 100,
    maturityAge: 18,
    declineAge: 60,
    agingModifier: 1.0,
  },
  
  cultivation: {
    coreCapacityBase: { min: 100, max: 2000 },
    coreQualityRange: { min: 1, max: 10 },
    conductivityBase: 1.0,
    breakthroughMultiplier: 1.0,
    maxCultivationLevel: 9,
  },
  
  movementTypes: ['biped'],
  innateSkills: ['basic_speech', 'basic_craft'],
  innateTechniques: [],
  traits: ['adaptive', 'social'],
  weaknesses: [],
  resistances: [],
}
```

#### Древний Дракон (Ancient Dragon)
```typescript
{
  id: 'ancient_dragon',
  name: 'Древний Дракон',
  type: 'beast',
  subtype: 'dragon',
  
  baseStats: {
    strength: { min: 100, max: 500 },
    agility: { min: 30, max: 100 },
    intelligence: { min: 50, max: 200 },
    vitality: { min: 200, max: 1000 },
  },
  
  capabilities: {
    canCultivate: true,
    innateQiGeneration: true,
    speechCapable: true,
    toolUse: false,
    learningRate: 0.5,  // Медленнее учится, но живёт дольше
  },
  
  aging: {
    lifespan: 10000,
    maturityAge: 500,
    declineAge: 8000,
    agingModifier: 0.1,  // Очень медленное старение
  },
  
  cultivation: {
    coreCapacityBase: { min: 5000, max: 100000 },
    coreQualityRange: { min: 5, max: 15 },
    conductivityBase: 5.0,
    breakthroughMultiplier: 2.0,  // Сложнее прорываться
    maxCultivationLevel: 9,
  },
  
  movementTypes: ['quadruped', 'flight', 'swim_surface'],
  innateSkills: ['dragon_breath', 'dragon_scales', 'fear_aura'],
  innateTechniques: [
    { id: 'dragon_flame', unlockLevel: 0 },     // С рождения
    { id: 'dragon_roar', unlockLevel: 3 },      // Уровень культивации 3
    { id: 'dragon_form', unlockLevel: 6 },      // Уровень культивации 6
  ],
  traits: ['ancient', 'proud', 'territorial'],
  weaknesses: ['dragon_slayer_techniques'],
  resistances: ['fire', 'mental'],
}
```

#### Элементаль Огня (Fire Elemental)
```typescript
{
  id: 'fire_elemental',
  name: 'Огненный Элементаль',
  type: 'spirit',
  subtype: 'elemental',
  
  baseStats: {
    strength: { min: 10, max: 80 },
    agility: { min: 20, max: 100 },
    intelligence: { min: 10, max: 50 },
    vitality: { min: 50, max: 300 },
  },
  
  capabilities: {
    canCultivate: true,
    innateQiGeneration: true,
    speechCapable: false,
    toolUse: false,
    learningRate: 0.3,
  },
  
  aging: {
    lifespan: 1000,
    maturityAge: 100,
    declineAge: 800,
    agingModifier: 0.5,
  },
  
  cultivation: {
    coreCapacityBase: { min: 500, max: 5000 },
    coreQualityRange: { min: 3, max: 8 },
    conductivityBase: 3.0,
    breakthroughMultiplier: 1.5,
    maxCultivationLevel: 7,  // Максимум 7 уровень
  },
  
  movementTypes: ['levitation'],
  innateSkills: ['fire_immunity', 'heat_absorption'],
  innateTechniques: [
    { id: 'fireball', unlockLevel: 0 },
    { id: 'fire_wall', unlockLevel: 2 },
    { id: 'inferno', unlockLevel: 5 },
  ],
  traits: ['incorporeal', 'elemental_fire'],
  weaknesses: ['water', 'void'],
  resistances: ['fire', 'heat'],
}
```

---

## 2️⃣ ТЕЛО (Body)

Тело — физическая оболочка существа. Определяет размер, конечности, способ передвижения.

### 2.1 Структура тела

```typescript
interface BodyStructure {
  // === ИДЕНТИФИКАЦИЯ ===
  speciesId: string;             // Ссылка на вид
  bodyVariant: string;           // Вариант тела (альбинос, крупный, мелкий)
  
  // === РАЗМЕРЫ ===
  size: BodySize;
  
  // === ЧАСТИ ТЕЛА ===
  bodyParts: BodyPart[];
  
  // === ТИПЫ ПЕРЕДВИЖЕНИЯ ===
  movement: MovementCapabilities;
  
  // === ВЕС И МАССА ===
  mass: MassProperties;
  
  // === МАТЕРИАЛ ТЕЛА ===
  material: BodyMaterial;
}

// === РАЗМЕРЫ ===
interface BodySize {
  sizeClass: SizeClass;          // Класс размера
  height: number;                // Высота (см)
  length: number;                // Длина (см) — для зверей
  width: number;                 // Ширина (см)
  volume: number;                // Объём (литры) — вычисляется
  
  // Хитбокс
  hitboxRadius: number;          // Радиус основного хитбокса (м)
}

type SizeClass = 
  | 'tiny'       // Крошечный (мышь, насекомое) < 30 см
  | 'small'      // Маленький (кошка, собака) 30-60 см
  | 'medium'     // Средний (человек) 60-180 см
  | 'large'      // Большой (медведь, лошадь) 1.8-3 м
  | 'huge'       // Огромный (слон) 3-10 м
  | 'gargantuan' // Гигантский (кит, дракон) 10-30 м
  | 'colossal';  // Колоссальный (левиафан) 30+ м

// Множители характеристик по размеру
const SIZE_MULTIPLIERS: Record<SizeClass, StatMultiplier> = {
  tiny:     { strength: 0.1, vitality: 0.1, coreCapacity: 0.5 },
  small:    { strength: 0.3, vitality: 0.3, coreCapacity: 0.7 },
  medium:   { strength: 1.0, vitality: 1.0, coreCapacity: 1.0 },
  large:    { strength: 2.0, vitality: 2.5, coreCapacity: 2.0 },
  huge:     { strength: 5.0, vitality: 6.0, coreCapacity: 5.0 },
  gargantuan: { strength: 15.0, vitality: 20.0, coreCapacity: 15.0 },
  colossal: { strength: 50.0, vitality: 100.0, coreCapacity: 50.0 },
};
```

### 2.2 Части тела

```typescript
interface BodyPart {
  id: string;                    // ID части
  name: string;                  // Название
  type: BodyPartType;            // Тип
  quantity: number;              // Количество
  
  // Размеры
  size: {
    length: number;              // Длина (см)
    width: number;               // Ширина (см)
    hitboxRadius: number;        // Радиус хитбокса (м)
  };
  
  // Прочность
  durability: {
    maxHP: number;               // Максимальное HP части
    currentHP: number;           // Текущее HP
    armor: number;               // Броня
    damageThreshold: number;     // Порог урона для отрубания
  };
  
  // Функции
  functions: BodyPartFunction[]; // Функции части
  
  // Состояние
  status: BodyPartStatus;
  
  // Зависимости
  dependsOn?: string[];          // Зависит от других частей
  children?: string[];           // Дочерние части
}

type BodyPartType = 
  | 'head'           // Голова
  | 'torso'          // Торс
  | 'heart'          // ❤️ Сердце (только красная HP, доступно при lvl 5+)
  | 'arm'            // Рука/передняя лапа
  | 'hand'           // Кисть/лапа
  | 'leg'            // Нога/задняя лапа
  | 'foot'           // Стопа
  | 'wing'           // Крыло
  | 'tail'           // Хвост
  | 'horn'           // Рог
  | 'claw'           // Коготь
  | 'fang'           // Клык
  | 'eye'            // Глаз
  | 'ear'            // Ухо
  | 'tentacle'       // Щупальце
  | 'pincer'         // Клешня
  | 'special';       // Особая часть

type BodyPartFunction = 
  | 'movement'       // Передвижение
  | 'manipulation'   // Манипуляция предметами
  | 'attack'         // Атака
  | 'defense'        // Защита
  | 'sensory'        // Восприятие
  | 'flight'         // Полёт
  | 'swimming'       // Плавание
  | 'breathing'      // Дыхание
  | 'circulation'    // Кровообращение
  | 'digestion'      // Пищеварение
  | 'reproduction'   // Размножение
  | 'qi_channel';    // Канал Ци

type BodyPartStatus = 
  | 'healthy'        // Здорова
  | 'damaged'        // Повреждена (50-99% HP)
  | 'crippled'       // Изуродована (1-49% HP)
  | 'severed'        // Отрублена
  | 'infected'       // Инфицирована
  | 'regenerating';  // Регенерирует
```

### 2.3 Части тела по умолчанию (для человека)

```typescript
const HUMAN_BODY_PARTS: BodyPart[] = [
  {
    id: 'head',
    name: 'Голова',
    type: 'head',
    quantity: 1,
    size: { length: 25, width: 18, hitboxRadius: 0.15 },
    durability: { maxHP: 50, currentHP: 50, armor: 0, damageThreshold: 100 },
    functions: ['sensory', 'breathing', 'qi_channel'],
    status: 'healthy',
    children: ['left_eye', 'right_eye', 'left_ear', 'right_ear'],
  },
  {
    id: 'torso',
    name: 'Торс',
    type: 'torso',
    quantity: 1,
    size: { length: 50, width: 40, hitboxRadius: 0.3 },
    durability: { maxHP: 100, currentHP: 100, armor: 0, damageThreshold: 200 },
    functions: ['circulation', 'digestion', 'qi_channel'],
    status: 'healthy',
    children: ['left_arm', 'right_arm', 'left_leg', 'right_leg'],
  },
  {
    id: 'left_arm',
    name: 'Левая рука',
    type: 'arm',
    quantity: 1,
    size: { length: 60, width: 10, hitboxRadius: 0.08 },
    durability: { maxHP: 40, currentHP: 40, armor: 0, damageThreshold: 80 },
    functions: ['manipulation', 'attack', 'qi_channel'],
    status: 'healthy',
    dependsOn: ['torso'],
    children: ['left_hand'],
  },
  // ... другие части
];
```

### 2.4 Передвижение

```typescript
interface MovementCapabilities {
  types: MovementType[];         // Доступные типы
  primary: MovementType;         // Основной тип
  
  // Скорости
  speeds: {
    walk: number;                // Скорость ходьбы (м/с)
    run: number;                 // Скорость бега (м/с)
    swim: number;                // Скорость плавания (м/с)
    fly: number;                 // Скорость полёта (м/с)
    burrow: number;              // Скорость закапывания (м/с)
  };
  
  // Способности
  abilities: {
    canJump: boolean;
    jumpHeight: number;          // Высота прыжка (м)
    canClimb: boolean;
    climbSpeed: number;          // Скорость лазания (м/с)
    canGlide: boolean;
    glideSpeed: number;          // Скорость планирования (м/с)
  };
  
  // Требования к частям тела
  requirements: MovementRequirement[];
}

interface MovementRequirement {
  type: MovementType;
  requiredParts: string[];       // ID необходимых частей
  minQuantity: number;           // Минимальное количество
}

// Пример: Утка (ходит, плавает, летает, ныряет)
const DUCK_MOVEMENT: MovementCapabilities = {
  types: ['biped', 'swim_surface', 'swim_underwater', 'flight'],
  primary: 'biped',
  speeds: {
    walk: 0.5,
    run: 1.0,
    swim: 1.5,
    fly: 15.0,
    burrow: 0,
  },
  abilities: {
    canJump: true,
    jumpHeight: 0.3,
    canClimb: false,
    climbSpeed: 0,
    canGlide: true,
    glideSpeed: 10.0,
  },
  requirements: [
    { type: 'biped', requiredParts: ['leg'], minQuantity: 2 },
    { type: 'swim_surface', requiredParts: ['foot'], minQuantity: 2 },
    { type: 'flight', requiredParts: ['wing'], minQuantity: 2 },
  ],
};
```

### 2.5 Масса

```typescript
interface MassProperties {
  baseMass: number;              // Базовая масса (кг)
  density: number;               // Плотность (кг/л) — обычно ~1.0 для органики
  totalMass: number;             // Итоговая масса (кг)
  
  // Распределение по частям
  distribution: Record<string, number>; // ID части -> % массы
  
  // Влияние
  effects: {
    encumbranceCapacity: number; // Грузоподъёмность (кг)
    fallDamageMultiplier: number; // Множитель урона от падения
    swimmingPenalty: number;     // Штраф к плаванию
  };
}

// Формула массы
function calculateMass(size: BodySize, density: number): number {
  // Объём в литрах (приближённо как эллипсоид)
  const volume = (4/3) * Math.PI * 
    (size.height/200) * (size.width/200) * (size.length/200) * 1000;
  
  return volume * density;
}
```

### 2.6 Материал тела

```typescript
interface BodyMaterial {
  primary: MaterialType;         // Основной материал
  secondary?: MaterialType;      // Вторичный материал
  
  properties: {
    hardness: number;            // Твёрдость (1-10)
    flexibility: number;         // Гибкость (1-10)
    qiConductivity: number;      // Проводимость Ци (0.1-5.0)
    regeneration: number;        // Регенерация (HP/час)
    immuneTo: string[];          // Иммунитеты
    vulnerableTo: string[];      // Уязвимости
  };
}

type MaterialType = 
  | 'flesh'          // Плоть (обычное органическое тело)
  | 'scaled'         // Чешуйчатое (драконы, змеи)
  | 'fur'            // Меховое (звери)
  | 'feathered'      // Пернатое (птицы)
  | 'carapace'       // Панцирное (насекомые, черепахи)
  | 'ethereal'       // Эфирное (призраки, духи)
  | 'elemental'      // Элементальное (огонь, вода, и т.д.)
  | 'mineral'        // Минеральное (големы)
  | 'chaos';         // Хаотичное (хтонь)
```

---

## 3️⃣ ДУХ (Spirit) — Ядро, Меридианы, Интеллект

Духовная составляющая существа. Определяет способность использовать Ци.

### 3.1 Структура духа

```typescript
interface SpiritStructure {
  // === ЯДРО ===
  core: CoreProperties;
  
  // === МЕРИДИАНЫ ===
  meridians: MeridianSystem;
  
  // === ИНТЕЛЛЕКТ ===
  mind: MindProperties;
  
  // === ДУША ===
  soul: SoulProperties;
}
```

### 3.2 Ядро

```typescript
interface CoreProperties {
  // === БАЗОВЫЕ ПАРАМЕТРЫ ===
  capacity: number;              // Ёмкость ядра (единиц Ци)
  quality: number;               // Качество ядра (1-10+)
  
  // === ТЕКУЩЕЕ СОСТОЯНИЕ ===
  currentQi: number;             // Текущее количество Ци
  accumulatedQi: number;         // Накопленная Ци (для прорыва)
  
  // === ГЕНЕРАЦИЯ ===
  generation: {
    base: number;                // Базовая скорость генерации (Ци/сек)
    modifier: number;            // Множитель от уровня культивации
  };
  
  // === СОСТОЯНИЕ ===
  status: CoreStatus;
  
  // === МИКРО-ЯДРО ===
  microCore: {
    connected: boolean;          // Подключено к Сердцу Мира
    channelDepth: number;        // Глубина канала
  };
}

type CoreStatus = 
  | 'forming'        // Формируется (не у культиваторов)
  | 'stable'         // Стабильное
  | 'expanded'       // Расширенное (после прорыва)
  | 'crystallizing'  // Кристаллизуется (высокий уровень)
  | 'transcendent';  // Трансцендентное (9+ уровень)

// Формула ёмкости ядра
function calculateCoreCapacity(
  speciesBase: Range,
  quality: number,
  cultivationLevel: number,
  subLevel: number
): number {
  // Базовая ёмкость от вида и качества
  let capacity = (speciesBase.min + speciesBase.max) / 2 * quality;
  
  // Множитель от уровня культивации (~10% за подуровень)
  capacity *= Math.pow(1.1, cultivationLevel * 10 + subLevel);
  
  return Math.floor(capacity);
}
```

### 3.3 Система меридиан

```typescript
interface MeridianSystem {
  // === ОСНОВНОЙ КАНАЛ ===
  mainChannel: {
    conductivity: number;        // Проводимость (Ци/сек)
    capacity: number;            // Объём буфера (Ци)
    status: MeridianStatus;
  };
  
  // === МЕРИДИАНЫ ===
  channels: Meridian[];
  
  // === УЗЛЫ ВЫВОДА ===
  outputNodes: OutputNode[];
  
  // === РАЗВИТИЕ ===
  development: {
    expansions: number;          // Количество расширений
    meditations: number;         // Медитаций на проводимость
    maxConductivity: number;     // Макс. достижимая проводимость
  };
}

interface Meridian {
  id: string;
  name: string;
  type: MeridianType;
  
  properties: {
    length: number;              // Длина (см)
    conductivity: number;        // Проводимость
    capacity: number;            // Ёмкость буфера
  };
  
  status: MeridianStatus;
  
  // Связь с частями тела
  connectedParts: string[];
}

type MeridianType = 
  | 'primary'        // Основной (позвоночник)
  | 'secondary'      // Вторичный (конечности)
  | 'tertiary'       // Третичный (мелкие каналы)
  | 'output';        // Выводной (на поверхность)

type MeridianStatus = 
  | 'blocked'        // Заблокирован
  | 'narrow'         // Узкий
  | 'normal'         // Нормальный
  | 'expanded'       // Расширенный
  | 'reinforced';    // Укреплённый

interface OutputNode {
  id: string;
  location: string;              // ID части тела
  type: 'primary' | 'secondary';
  maxOutput: number;             // Макс. вывод Ци/сек
  status: 'inactive' | 'active' | 'damaged';
}

// Базовая проводимость по видам
const BASE_CONDUCTIVITY: Record<SpeciesType, number> = {
  humanoid: 1.0,
  beast: 0.5,      // Звери медленнее пропускают Ци
  spirit: 3.0,     // Духи быстрее
  hybrid: 1.0,
  aberration: 0.3, // Хтонь очень медленно
};
```

### 3.4 Интеллект и Разум

```typescript
interface MindProperties {
  // === БАЗОВЫЙ ИНТЕЛЛЕКТ ===
  intelligence: number;          // IQ (5-200+)
  
  // === СПОСОБНОСТИ ===
  capabilities: {
    reasoning: number;           // Логика (0-100)
    memory: number;              // Память (0-100)
    learning: number;            // Обучение (0-100)
    creativity: number;          // Креативность (0-100)
    focus: number;               // Концентрация (0-100)
  };
  
  // === КОНТРОЛЬ ЦИ ===
  qiControl: {
    precision: number;           // Точность (0-100)
    efficiency: number;          // Эффективность (0-100)
    maxTechniqueLevel: number;   // Макс. уровень техники
    simultaneousTechniques: number; // Одновременных техник
  };
  
  // === СОСТОЯНИЕ РАЗУМА ===
  status: {
    sanity: number;              // Рассудок (0-100)
    clarity: number;             // Ясность (0-100)
    mentalFatigue: number;       // Ментальная усталость (0-100)
    dominantEmotion: string;     // Доминирующая эмоция
  };
  
  // === ВОСПРИЯТИЕ ===
  perception: {
    qiSensitivity: number;       // Чувствительность к Ци (м)
    dangerSense: number;         // Чутьё опасности (м)
    spiritualSight: boolean;     // Духовное зрение
    truthPerception: number;     // Восприятие правды (%)
  };
}

// Формула контроля Ци от интеллекта
function calculateQiControl(intelligence: number, cultivationLevel: number): QiControlResult {
  return {
    precision: Math.min(100, intelligence * 0.5 + cultivationLevel * 5),
    efficiency: Math.min(100, intelligence * 0.3 + cultivationLevel * 3),
    maxTechniqueLevel: Math.floor(intelligence / 10),
    simultaneousTechniques: Math.max(1, Math.floor(intelligence / 25)),
  };
}
```

### 3.5 Душа

```typescript
interface SoulProperties {
  // === СУЩНОСТЬ ===
  essence: {
    type: SoulType;
    strength: number;            // Сила души (1-100)
    age: number;                 // Возраст души (перерождения)
  };
  
  // === КАРМА ===
  karma: {
    positive: number;
    negative: number;
    balance: number;             // positive - negative
  };
  
  // === СВЯЗИ ===
  bonds: SoulBond[];
  
  // === СПОСОБНОСТИ ===
  abilities: {
    reincarnation: boolean;      // Может перерождаться
    possession: boolean;         // Может вселяться
    astralProjection: boolean;   // Астральная проекция
  };
}

type SoulType = 
  | 'mortal'         // Смертная душа
  | 'awakened'       // Пробуждённая (культиватор)
  | 'ancient'        // Древняя (много перерождений)
  | 'divine'         // Божественная
  | 'corrupted';     // Искажённая (тёмные практики)
```

---

## 4️⃣ ВРОЖДЁННЫЕ ТЕХНИКИ (Innate Techniques)

Техники, доступные существу при рождении или открывающиеся при развитии.

### 4.1 Структура

```typescript
interface InnateTechniqueGrant {
  techniqueId: string;           // ID техники
  unlockLevel: number;           // Уровень культивации для открытия
  mastery: number;               // Начальное мастерство (%)
  variant?: string;              // Вариант техники (усиленный, ослабленный)
  
  // Условия открытия
  conditions?: {
    minAge?: number;             // Минимальный возраст
    minStat?: { stat: string; value: number };
    event?: string;              // Требуемое событие
  };
  
  // Модификаторы
  modifiers?: {
    costMultiplier: number;      // Множитель стоимости Ци
    powerMultiplier: number;     // Множитель силы
    cooldownMultiplier: number;  // Множитель времени каста
  };
}

interface InnateTechniquesConfig {
  // При рождении
  atBirth: InnateTechniqueGrant[];
  
  // При развитии
  atCultivationLevel: Record<number, InnateTechniqueGrant[]>;
  
  // При событиях
  onEvent: Record<string, InnateTechniqueGrant[]>;
  
  // Эволюция
  evolution: {
    triggerLevel: number;
    transformsFrom: string;      // ID базовой техники
    transformsTo: string;        // ID улучшенной техники
  }[];
}
```

### 4.2 Примеры по видам

```typescript
// Волк (Beast - Predator)
const WOLF_INNATE_TECHNIQUES: InnateTechniquesConfig = {
  atBirth: [
    { techniqueId: 'bite', unlockLevel: 0, mastery: 50 },
    { techniqueId: 'claw_swipe', unlockLevel: 0, mastery: 40 },
    { techniqueId: 'howl', unlockLevel: 0, mastery: 30 },
  ],
  atCultivationLevel: {
    2: [{ techniqueId: 'pack_call', unlockLevel: 2, mastery: 20 }],
    4: [{ techniqueId: 'alpha_roar', unlockLevel: 4, mastery: 10 }],
    6: [{ techniqueId: 'moon_fury', unlockLevel: 6, mastery: 5 }],
  },
  onEvent: {
    'first_kill': [{ techniqueId: 'blood_scent', unlockLevel: 0, mastery: 30 }],
    'full_moon': [{ techniqueId: 'moon_boost', unlockLevel: 0, mastery: 50 }],
  },
  evolution: [
    { triggerLevel: 5, transformsFrom: 'bite', transformsTo: 'crushing_jaws' },
    { triggerLevel: 7, transformsFrom: 'howl', transformsTo: 'soul_howl' },
  ],
};

// Дух Воды (Spirit - Elemental)
const WATER_SPIRIT_TECHNIQUES: InnateTechniquesConfig = {
  atBirth: [
    { techniqueId: 'water_blast', unlockLevel: 0, mastery: 60 },
    { techniqueId: 'water_form', unlockLevel: 0, mastery: 80 },
    { techniqueId: 'drown', unlockLevel: 0, mastery: 30 },
  ],
  atCultivationLevel: {
    3: [{ techniqueId: 'water_prison', unlockLevel: 3, mastery: 20 }],
    5: [{ techniqueId: 'tidal_wave', unlockLevel: 5, mastery: 10 }],
    7: [{ techniqueId: 'summon_water_elemental', unlockLevel: 7, mastery: 5 }],
  },
  evolution: [
    { triggerLevel: 6, transformsFrom: 'water_blast', transformsTo: 'hydro_cannon' },
  ],
};
```

---

## 5️⃣ СИСТЕМА СЕКТОРНЫХ ПОВРЕЖДЕНИЙ (Sectored Damage)

> **Статус:** 🔧 В разработке  
> **Приоритет:** Высокий  
> **Детальный план:** [checkpoint28-limbs-system.md](../checkpoint28-limbs-system.md)

### 5.0 Система двойной HP конечностей (Kenshi-style)

> **Основная статья:** [checkpoint28-limbs-system.md](../checkpoint28-limbs-system.md)

Каждая часть тела имеет **двойную HP полоску**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    HP КОНЕЧНОСТИ (Пример: Рука)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ████████████████████░░░░░░░░░░░░░░░░░░░░  Красная полоска (40)        │
│   │←── Функциональная HP ──→│                (функционирует)            │
│                                                                          │
│   ████████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│   │←────────── Структурная HP (80) ──────────────→│                      │
│                                                   (целостность)          │
│                                                                          │
│   Соотношение: Структурная HP = Функциональная HP × 2                    │
│   ИСКЛЮЧЕНИЕ: Сердце имеет только красную HP!                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Ключевые механики:**
1. **Красная HP** — функциональность конечности. При 0 — паралич.
2. **Чёрная HP** — структурная целостность. При 0 — отрубание.
3. **Кровотечение** — зависит от степени повреждения (урон за ТИК).
4. **Регенерация** — сначала чёрная, потом красная (HP за ТИК).
5. **Приживление** — возможность приживить чужую конечность.
6. **Сердце** — особая часть тела, только красная HP.

**⏱️ Понятие ТИКА:**
- 1 ТИК = 1 минута игрового времени
- Все временные расчёты привязаны к ТИКАМ
- Длительность ТИКА может быть изменена
- Все формулы используют ТИК как единицу

**Сердце (особая часть):**
- Только функциональная HP (80)
- Доступно для атаки при: атакующий 5+ уровень, торс в чёрной зоне
- При HP = 0 → смерть

### 5.1 Концепция

Каждая часть тела имеет:
- Собственный хитбокс
- Двойное здоровье (функциональное + структурное)
- Функциональные последствия повреждения
- Систему кровотечений

### 5.2 Структура секторов

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ХИТБОКСЫ ЧАСТЕЙ ТЕЛА                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                        ┌─────────┐                                      │
│                        │  HEAD   │  HP: 50  Radius: 0.15m              │
│                        │  ○ ○    │  - Глаза (зрение)                   │
│                        │   👃    │  - Уши (слух)                        │
│                        └────┬────┘                                      │
│                             │                                           │
│         ┌───────────────────┼───────────────────┐                      │
│         │                   │                   │                      │
│    ┌────┴────┐        ┌─────┴─────┐       ┌────┴────┐                 │
│    │ L.ARM   │        │   TORSO   │       │  R.ARM  │                 │
│    │  HP:40  │        │   HP:100  │       │  HP:40  │                 │
│    │ 0.08m   │        │   0.30m   │       │  0.08m  │                 │
│    └────┬────┘        └─────┬─────┘       └────┬────┘                 │
│         │                   │                   │                      │
│         │             ┌─────┴─────┐             │                      │
│         │             │  ❤️ HEART │ ← lvl 5+   │                      │
│         │             │  HP: 80   │  (only red)│                      │
│         │             └───────────┘             │                      │
│         │                   │                   │                      │
│    ┌────┴────┐              │              ┌────┴────┐                 │
│    │ L.HAND  │              │              │ R.HAND  │                 │
│    │  HP:20  │              │              │  HP:20  │                 │
│    │ 0.05m   │              │              │  0.05m  │                 │
│    └─────────┘              │              └─────────┘                 │
│                             │                                           │
│              ┌──────────────┴──────────────┐                           │
│              │                             │                           │
│         ┌────┴────┐                   ┌────┴────┐                      │
│         │  L.LEG  │                   │  R.LEG  │                      │
│         │  HP:50  │                   │  HP:50  │                      │
│         │  0.10m  │                   │  0.10m  │                      │
│         └────┬────┘                   └────┬────┘                      │
│              │                             │                           │
│         ┌────┴────┐                   ┌────┴────┐                      │
│         │ L.FOOT  │                   │ R.FOOT  │                      │
│         │  HP:25  │                   │  HP:25  │                      │
│         └─────────┘                   └─────────┘                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Механика повреждений

```typescript
interface SectoredDamageResult {
  // Попадание
  hit: {
    partId: string;              // ID поражённой части
    hitLocation: { x: number; y: number; }; // Точка попадания
    distance: number;            // Расстояние до центра хитбокса
  };
  
  // Урон
  damage: {
    raw: number;                 // Сырой урон
    armor: number;               // Поглощено бронёй
    final: number;               // Итоговый урон
    isCritical: boolean;         // Критическое попадание
    criticalMultiplier: number;  // Множитель крита
  };
  
  // Последствия
  effects: {
    partSevered: boolean;        // Часть отрублена
    partCrippled: boolean;       // Часть изуродована
    functionLoss: string[];      // Потерянные функции
    bleedDamage: number;         // Кровотечение (урон/сек)
    shockDamage: number;         // Шоковый урон по телу
  };
  
  // Специальные эффекты
  special?: {
    decapitation: boolean;       // Обезглавливание (смерть)
    organDamage: string[];       // Повреждённые органы
    internalBleeding: boolean;   // Внутреннее кровотечение
  };
}

// Расчёт повреждения части
function calculatePartDamage(
  part: BodyPart,
  attack: AttackData,
  attacker: Entity,
  target: Entity
): SectoredDamageResult {
  const result: SectoredDamageResult = {
    hit: { partId: part.id, hitLocation: { x: 0, y: 0 }, distance: 0 },
    damage: { raw: 0, armor: 0, final: 0, isCritical: false, criticalMultiplier: 1 },
    effects: { partSevered: false, partCrippled: false, functionLoss: [], bleedDamage: 0, shockDamage: 0 },
  };
  
  // 1. Расчёт сырого урона
  result.damage.raw = attack.baseDamage * calculateStatScaling(attacker, attack);
  
  // 2. Учёт брони
  result.damage.armor = Math.min(result.damage.raw, part.durability.armor);
  result.damage.final = result.damage.raw - result.damage.armor;
  
  // 3. Критическое попадание
  const critChance = calculateCritChance(attack, part);
  if (Math.random() < critChance) {
    result.damage.isCritical = true;
    result.damage.criticalMultiplier = 2.0;
    result.damage.final *= 2;
  }
  
  // 4. Проверка отрубания
  if (result.damage.final >= part.durability.damageThreshold) {
    result.effects.partSevered = true;
    result.effects.functionLoss = part.functions;
    result.effects.bleedDamage = result.damage.final * 0.1; // 10% в секунду
  }
  
  // 5. Проверка калечащего повреждения
  const newHP = part.durability.currentHP - result.damage.final;
  if (newHP < part.durability.maxHP * 0.5 && !result.effects.partSevered) {
    result.effects.partCrippled = true;
    // Теряется часть функций
    result.effects.functionLoss = part.functions.filter(() => Math.random() > 0.5);
  }
  
  // 6. Шоковый урон
  result.effects.shockDamage = result.damage.final * 0.1;
  
  // 7. Специальные случаи
  if (part.type === 'head' && result.effects.partSevered) {
    result.special = { decapitation: true, organDamage: [], internalBleeding: false };
  }
  
  return result;
}
```

### 5.4 Последствия потери частей

```typescript
const BODY_PART_LOSS_EFFECTS: Record<BodyPartType, PartLossEffect> = {
  head: {
    survivalChance: 0,           // 0% выживания
    immediateDeath: true,
    description: 'Обезглавливание — мгновенная смерть',
  },
  torso: {
    survivalChance: 0,
    immediateDeath: true,
    description: 'Уничтожение торса — мгновенная смерть',
  },
  heart: {
    survivalChance: 0,           // 0% выживания
    immediateDeath: true,
    description: 'Уничтожение сердца — мгновенная смерть',
    note: 'Доступно для атаки только при lvl 5+ атакующего и торсе в чёрной зоне',
  },
  arm: {
    survivalChance: 100,
    effects: [
      { type: 'stat_penalty', stat: 'strength', value: -30 },
      { type: 'lose_function', function: 'manipulation' },
      { type: 'technique_penalty', types: ['melee_weapon', 'defense_block'], penalty: -50 },
    ],
    description: 'Потеря руки — невозможность использовать двуручное оружие',
  },
  hand: {
    survivalChance: 100,
    effects: [
      { type: 'stat_penalty', stat: 'agility', value: -20 },
      { type: 'lose_function', function: 'manipulation', partial: true },
    ],
    description: 'Потеря кисти — штраф к манипуляции предметами',
  },
  leg: {
    survivalChance: 100,
    effects: [
      { type: 'stat_penalty', stat: 'agility', value: -40 },
      { type: 'speed_penalty', penalty: -50 },
      { type: 'lose_function', function: 'movement', partial: true },
    ],
    description: 'Потеря ноги — скорость -50%, невозможность бега',
  },
  foot: {
    survivalChance: 100,
    effects: [
      { type: 'stat_penalty', stat: 'agility', value: -15 },
      { type: 'speed_penalty', penalty: -30 },
    ],
    description: 'Потеря стопы — скорость -30%',
  },
  eye: {
    survivalChance: 100,
    effects: [
      { type: 'perception_penalty', type: 'vision', penalty: -50 },
      { type: 'accuracy_penalty', penalty: -20 },
    ],
    description: 'Потеря глаза — точность -20%, зрение -50%',
  },
  wing: {
    survivalChance: 100,
    effects: [
      { type: 'lose_function', function: 'flight' },
    ],
    description: 'Потеря крыла — невозможность полёта',
  },
  tail: {
    survivalChance: 100,
    effects: [
      { type: 'stat_penalty', stat: 'agility', value: -10 },
    ],
    description: 'Потеря хвоста — ловкость -10%',
  },
};
```

---

## 6️⃣ ГЕНЕРАТОР СУЩЕСТВ (Entity Generator)

Утилиты для создания существ по параметрам.

### 6.1 Интерфейс генератора

```typescript
interface EntityGeneratorConfig {
  // Обязательные
  species: SpeciesType;
  subtype?: string;
  name?: string;
  
  // Размер
  size?: SizeClass | { class: SizeClass; variation: number };
  
  // Уровень культивации
  cultivationLevel?: number;
  subLevel?: number;
  
  // Характеристики
  stats?: Partial<StatsConfig>;
  
  // Модификаторы
  modifiers?: {
    strength?: number;           // Множитель (1.0 = норма)
    agility?: number;
    intelligence?: number;
    vitality?: number;
  };
  
  // Вариации
  variations?: {
    albino?: boolean;            // Альбинос
    giant?: boolean;             // Гигант
    mutant?: boolean;            // Мутант
    ancient?: boolean;           // Древний (старше, сильнее)
    corrupted?: boolean;         // Искажённый хаосом
  };
  
  // Принудительные техники
  forcedTechniques?: string[];
  
  // Имя генератора для воспроизводимости
  seed?: string;
}

interface StatsConfig {
  strength: number;
  agility: number;
  intelligence: number;
  vitality: number;
}

// Функция генерации
function generateEntity(config: EntityGeneratorConfig): GeneratedEntity {
  // 1. Получаем базовый вид
  const species = getSpeciesById(config.species, config.subtype);
  
  // 2. Определяем размер
  const size = determineSize(species, config.size, config.variations);
  
  // 3. Генерируем тело
  const body = generateBody(species, size, config.variations);
  
  // 4. Генерируем дух
  const spirit = generateSpirit(species, config.cultivationLevel, config.subLevel);
  
  // 5. Генерируем техники
  const techniques = generateInnateTechniques(
    species,
    config.cultivationLevel,
    config.forcedTechniques
  );
  
  // 6. Применяем модификаторы
  applyModifiers({ body, spirit, techniques }, config.modifiers, config.variations);
  
  // 7. Рассчитываем финальные характеристики
  const stats = calculateFinalStats(species, body, spirit, config.stats);
  
  return { species, body, spirit, techniques, stats };
}
```

### 6.2 Примеры генерации

```typescript
// Обычный волк
const wolf = generateEntity({
  species: 'beast',
  subtype: 'predator',
  name: 'Лесной волк',
  size: 'medium',
  cultivationLevel: 0,
});

// Древний дракон
const dragon = generateEntity({
  species: 'beast',
  subtype: 'dragon',
  name: 'Древний Красный Дракон',
  size: 'gargantuan',
  cultivationLevel: 6,
  subLevel: 5,
  variations: { ancient: true },
});

// Хтонь (аберрация)
const cthonian = generateEntity({
  species: 'aberration',
  subtype: 'cthonian',
  name: 'Порождение глубин',
  size: 'large',
  cultivationLevel: 3,
  variations: { corrupted: true, mutant: true },
});

// Кастомное существо
const custom = generateEntity({
  species: 'hybrid',
  subtype: 'centaur',
  name: 'Кентавр-воин',
  size: 'large',
  cultivationLevel: 2,
  stats: { strength: 25, agility: 18 },
  forcedTechniques: ['charge', 'trample'],
});
```

---

## 7️⃣ ИНТЕГРАЦИЯ С СУЩЕСТВУЮЩЕЙ СИСТЕМОЙ

### 7.1 Связь с Prisma Schema

```prisma
// prisma/schema.prisma

model Entity {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // === ВИД ===
  speciesId   String
  speciesType String   // humanoid, beast, spirit, hybrid, aberration
  subtype     String?
  
  // === ТЕЛО ===
  sizeClass   String   // tiny, small, medium, large, huge, gargantuan, colossal
  height      Int      // см
  mass        Float    // кг
  
  // === ДУХ ===
  cultivationLevel    Int      @default(1)
  cultivationSubLevel Int      @default(0)
  coreCapacity        Int
  coreQuality         Int
  currentQi           Int
  accumulatedQi       Int      @default(0)
  conductivity        Float
  
  // === ХАРАКТЕРИСТИКИ ===
  strength      Int
  agility       Int
  intelligence  Int
  vitality      Int
  
  // === СОСТОЯНИЕ ===
  health        Int
  maxHealth     Int
  fatigue       Float    @default(0)
  mentalFatigue Float    @default(0)
  
  // === ЧАСТИ ТЕЛА (JSON) ===
  bodyParts     Json     // BodyPart[]
  
  // === ВРОЖДЁННЫЕ ТЕХНИКИ (JSON) ===
  innateTechniques Json  // InnateTechniqueGrant[]
  
  // === СВЯЗИ ===
  locationId    String?
  location      Location? @relation(fields: [locationId], references: [id])
  techniques    EntityTechnique[]
  inventory     InventoryItem[]
  
  @@map("entities")
}

model Species {
  id          String   @id
  name        String
  type        String
  subtype     String
  
  // === БАЗОВЫЕ ХАРАКТЕРИСТИКИ ===
  strMin      Int
  strMax      Int
  agiMin      Int
  agiMax      Int
  intMin      Int
  intMax      Int
  vitMin      Int
  vitMax      Int
  
  // === КУЛЬТИВАЦИЯ ===
  coreCapMin      Int
  coreCapMax      Int
  coreQualMin     Int
  coreQualMax     Int
  baseConductivity Float
  maxCultLevel    Int      @default(9)
  
  // === СВОЙСТВА ===
  lifespan        Int
  canCultivate    Boolean  @default(true)
  canSpeak        Boolean  @default(false)
  canUseTools     Boolean  @default(false)
  
  // === ТИПЫ ПЕРЕДВИЖЕНИЯ ===
  movementTypes   Json     // MovementType[]
  
  // === ВРОЖДЁННЫЕ ===
  innateSkills    Json     // string[]
  innateTechniques Json    // InnateTechniqueGrant[]
  
  // === ОСОБЕННОСТИ ===
  traits          Json     // SpeciesTrait[]
  weaknesses      Json     // string[]
  resistances     Json     // string[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("species")
}
```

### 7.2 Связь с боевой системой

```typescript
// Интеграция с combat-system.ts

interface Combatant {
  entity: Entity;
  availableParts: BodyPart[];   // Доступные для атаки части
  activeTechniques: Technique[];
  
  // Боевые параметры
  combatStats: {
    attackPower: number;
    defense: number;
    criticalChance: number;
    dodgeChance: number;
    blockChance: number;
  };
}

// Выбор цели для атаки
function selectTargetPart(
  attacker: Combatant,
  target: Combatant,
  technique: Technique
): BodyPart | null {
  // Для melee техник — случайная часть в досягаемости
  // Для ranged — зависит от точности
  
  const reachableParts = getReachableParts(target, technique);
  
  // Шанс попадания по каждой части
  const weightedParts = reachableParts.map(part => ({
    part,
    weight: calculateHitChance(attacker, target, part, technique),
  }));
  
  return weightedRandom(weightedParts);
}
```

---

## 8️⃣ ПРИМЕРЫ ПОЛНЫХ СУЩЕСТВ

### 8.1 Лесной волк (базовый монстр)

```yaml
entity:
  id: "forest_wolf_001"
  name: "Лесной волк"
  
species:
  type: beast
  subtype: predator
  name: "Волк"
  
body:
  sizeClass: medium
  height: 65
  length: 120
  mass: 45
  
  parts:
    - head: { hp: 30, armor: 0, hitbox: 0.12m }
    - torso: { hp: 60, armor: 2, hitbox: 0.25m }
    - leg_front_left: { hp: 25, armor: 0, hitbox: 0.06m }
    - leg_front_right: { hp: 25, armor: 0, hitbox: 0.06m }
    - leg_back_left: { hp: 25, armor: 0, hitbox: 0.06m }
    - leg_back_right: { hp: 25, armor: 0, hitbox: 0.06m }
    - tail: { hp: 15, armor: 0, hitbox: 0.05m }
  
  movement:
    types: [quadruped]
    walk: 1.5 m/s
    run: 12 m/s
    jump: 2m высота
  
spirit:
  cultivationLevel: 0
  coreCapacity: 150
  coreQuality: 2
  currentQi: 0
  conductivity: 0.5
  
  mind:
    intelligence: 8
    qiControl: { precision: 10, efficiency: 10 }
    
stats:
  strength: 18
  agility: 22
  intelligence: 8
  vitality: 20
  
innateTechniques:
  - bite: { damage: 15, type: melee, element: physical }
  - claw_swipe: { damage: 12, type: melee, element: physical }
  - howl: { type: support, effect: call_pack }
```

### 8.2 Культиватор-человек (игрок)

```yaml
entity:
  id: "player_001"
  name: "Ли Вэй"
  
species:
  type: humanoid
  subtype: human
  name: "Человек"
  
body:
  sizeClass: medium
  height: 175
  mass: 72
  
  parts:
    - head: { hp: 50, armor: 0, hitbox: 0.15m }
    - torso: { hp: 100, armor: 0, hitbox: 0.30m }
    - arm_left: { hp: 40, armor: 0, hitbox: 0.08m }
    - arm_right: { hp: 40, armor: 0, hitbox: 0.08m }
    - hand_left: { hp: 20, armor: 0, hitbox: 0.05m }
    - hand_right: { hp: 20, armor: 0, hitbox: 0.05m }
    - leg_left: { hp: 50, armor: 0, hitbox: 0.10m }
    - leg_right: { hp: 50, armor: 0, hitbox: 0.10m }
    - foot_left: { hp: 25, armor: 0, hitbox: 0.06m }
    - foot_right: { hp: 25, armor: 0, hitbox: 0.06m }
  
  movement:
    types: [biped]
    walk: 1.4 m/s
    run: 6 m/s
    jump: 0.5m высота
    
spirit:
  cultivationLevel: 2
  cultivationSubLevel: 5
  coreCapacity: 1200
  coreQuality: 5
  currentQi: 850
  accumulatedQi: 15000
  conductivity: 2.5
  
  meridians:
    mainChannel: { conductivity: 2.5, capacity: 12.5 }
    channels:
      - { type: primary, conductivity: 2.5 }
      - { type: secondary, quantity: 4, conductivity: 1.8 }
    outputNodes:
      - { location: hand_left, maxOutput: 2.0 }
      - { location: hand_right, maxOutput: 2.0 }
      - { location: foot_left, maxOutput: 1.0 }
      - { location: foot_right, maxOutput: 1.0 }
  
  mind:
    intelligence: 15
    qiControl: { precision: 45, efficiency: 35, maxTechniqueLevel: 3 }
    
stats:
  strength: 14
  agility: 12
  intelligence: 15
  vitality: 13
  
learnedTechniques:
  - basic_strike: { level: 2, mastery: 45 }
  - qi_blast: { level: 1, mastery: 20 }
  - iron_skin: { level: 1, mastery: 35 }
```

---

## 9️⃣ ПЛАН РЕАЛИЗАЦИИ

### Фаза 1: Базовая структура (Приоритет: Высокий)

1. **Типы и интерфейсы** — `src/types/body.ts`
   - BodyPart, BodyStructure, SpeciesProperties
   - SpiritStructure, CoreProperties, MeridianSystem

2. **Базовые виды** — `src/data/species/`
   - human.ts, wolf.ts, dragon.ts, elemental.ts
   - Пресеты для распространённых существ

3. **Генератор** — `src/lib/game/entity-generator.ts`
   - generateEntity()
   - calculateFinalStats()
   - applyModifiers()

### Фаза 2: Интеграция с БД (Приоритет: Средний)

1. **Prisma Schema** — обновление модели Character
2. **Миграция** — переход на новую структуру
3. **API** — эндпоинты для работы с существами

### Фаза 3: Боевая интеграция (Приоритет: Средний)

1. **Хитбоксы частей тела** — Phaser интеграция
2. **Секторные повреждения** — расчёт урона по частям
3. **Визуализация** — отображение повреждений

### Фаза 4: UI (Приоритет: Низкий)

1. **Экран создания** — выбор вида, настройка тела
2. **Экран статуса** — отображение частей тела
3. **Экран повреждений** — детализация ранений

---

## 🔗 Связанные документы

- [start_lore.md](./start_lore.md) — Лор мира культивации
- [COMBAT_TECHNIQUES_SYSTEM.md](./COMBAT_TECHNIQUES_SYSTEM.md) — Боевая система
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Архитектура проекта
- [FUNCTIONS.md](./FUNCTIONS.md) — Функции и типы
- [checkpoint28-limbs-system.md](../checkpoint28-limbs-system.md) — **Детальный план системы конечностей**

---

*Документ создан: 2026-02-28*  
*Версия: 1.1*
