# 🪨 Система Физических Объектов (Physical Object System)

**Версия:** 1.0  
**Создано:** 2026-03-06  
**Статус:** Черновик  

---

## 📋 Обзор

Система **PhysicalObject** — это архитектура для **неживых (пассивных) объектов** мира культивации.

### Разделение сущностей

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     ВСЕ ОБЪЕКТЫ МИРА                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────┐   ┌─────────────────────────────┐ │
│   │     ЖИВЫЕ (ОДУШЕВЛЁННЫЕ)        │   │   НЕ ЖИВЫЕ (ПАССИВНЫЕ)      │ │
│   │     SoulEntity                  │   │   PhysicalObject            │ │
│   ├─────────────────────────────────┤   ├─────────────────────────────┤ │
│   │                                  │   │                             │ │
│   │   ✅ Игрок                       │   │   ⬜ Камни                  │ │
│   │   ✅ NPC                         │   │   ⬜ Руды                   │ │
│   │   ✅ Монстры                     │   │   ⬜ Деревья                │ │
│   │   ✅ Духи                        │   │   ⬜ Растения               │ │
│   │   ✅ Духовные артефакты          │   │   ⬜ Строения               │ │
│   │                                  │   │   ⬜ Предметы               │ │
│   │                                  │   │   ⬜ Декорации              │ │
│   │                                  │   │                             │ │
│   │   📖 docs/soul-system.md         │   │   📖 ДАННЫЙ ДОКУМЕНТ       │ │
│   │                                  │   │                             │ │
│   └─────────────────────────────────┘   └─────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Что такое PhysicalObject?

**PhysicalObject** — это неживой объект, который:
- ❌ **Не имеет души**
- ❌ **Не может двигаться самостоятельно**
- ❌ **Не может совершать осознанные действия**
- ❌ **Не управляется игроком или ИИ**
- ✅ **Может иметь физическую форму**
- ✅ **Может взаимодействовать с миром (реактивно)**
- ✅ **Может хранить Ци (опционально)**

---

## 🏗️ Архитектура PhysicalObject

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PHYSICAL OBJECT (НЕЖИВОЙ ОБЪЕКТ)                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     BASE (ОБЯЗАТЕЛЬНО)                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │     ID      │  │    Name     │  │   Category  │              │   │
│  │  │  (unique)   │  │             │  │  (object/   │              │   │
│  │  │             │  │             │  │   resource) │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│              ┌───────────────┼───────────────┐                          │
│              ▼               ▼               ▼                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │
│  │    PHYSICS    │  │   DURABILITY  │  │   QI STORE    │               │
│  │  (обязательно)│  │   (опц.)      │  │   (опц.)      │               │
│  ├───────────────┤  ├───────────────┤  ├───────────────┤               │
│  │ • size        │  │ • hp          │  │ • capacity    │               │
│  │ • mass        │  │ • maxHp       │  │ • current     │               │
│  │ • material    │  │ • armor       │  │ • recharge    │               │
│  │ • solid       │  │ • destruct.   │  │ • affinity    │               │
│  └───────────────┘  └───────────────┘  └───────────────┘               │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     CONTENTS (опционально)                       │   │
│  │  • resources[]    • inventory[]     • interactions[]             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ БАЗОВЫЙ ИНТЕРФЕЙС

```typescript
/**
 * Категория объекта
 */
type ObjectCategory = 
  | 'resource'      // Ресурс (руда, дерево)
  | 'container'     // Контейнер (сундук)
  | 'structure'     // Строение (дом, стена)
  | 'decoration'    // Декорация (камень)
  | 'plant'         // Растение
  | 'item';         // Предмет

/**
 * Базовый физический объект
 */
interface PhysicalObject {
  // === ИДЕНТИФИКАЦИЯ ===
  id: string;
  name: string;
  category: ObjectCategory;
  subType?: string;              // Подтип (iron_ore, oak_tree)
  
  // === МЕТАДАННЫЕ ===
  createdAt: Date;
  updatedAt: Date;
  source: 'generated' | 'preset' | 'player';
  
  // === ПОЗИЦИЯ ===
  worldPosition: WorldPosition;
  rotation?: number;             // Угол поворота (градусы)
  
  // === ФИЗИКА (обязательно) ===
  physics: PhysicsProperties;
  
  // === ПРОЧНОСТЬ (опционально) ===
  durability?: DurabilityState;
  
  // === ХРАНИЛИЩЕ ЦИ (опционально) ===
  qiStore?: QiStoreState;
  
  // === СОДЕРЖИМОЕ (опционально) ===
  contents?: ObjectContents;
  
  // === ВЗАИМОДЕЙСТВИЕ ===
  interactable: boolean;
  interactionType?: InteractionType;
}
```

---

## 2️⃣ ФИЗИЧЕСКИЕ СВОЙСТВА

```typescript
/**
 * Физические свойства
 */
interface PhysicsProperties {
  // === РАЗМЕР ===
  size: {
    sizeClass: SizeClass;
    height: number;              // см
    width: number;               // см
    depth?: number;              // см (для 3D)
    hitboxRadius: number;        // метры
  };
  
  // === МАССА ===
  mass: number;                  // кг
  
  // === МАТЕРИАЛ ===
  material: {
    type: MaterialType;
    hardness: number;            // 1-10
    flexibility: number;         // 1-10
    qiConductivity: number;      // 0-5
  };
  
  // === ФИЗИКА ===
  solid: boolean;                // Можно столкнуться
  movable: boolean;              // Можно сдвинуть
  destructible: boolean;         // Можно разрушить
  transparent: boolean;          // Прозрачный
  
  // === БЛОКИРОВКА ===
  blocksMovement: boolean;       // Блокирует движение
  blocksVision: boolean;         // Блокирует обзор
  blocksQi: boolean;             // Блокирует потоки Ци
}

/**
 * Класс размера
 */
type SizeClass = 
  | 'tiny'        // < 30 см (камешек)
  | 'small'       // 30-60 см
  | 'medium'      // 60-180 см (человек)
  | 'large'       // 1.8-3 м
  | 'huge'        // 3-10 м
  | 'gargantuan'  // 10-30 м
  | 'colossal';   // 30+ м

/**
 * Тип материала
 */
type MaterialType = 
  | 'stone'       // Камень
  | 'metal'       // Металл
  | 'wood'        // Дерево
  | 'crystal'     // Кристалл
  | 'earth'       // Земля
  | 'water'       // Вода
  | 'plant'       // Растение
  | 'cloth'       // Ткань
  | 'glass'       // Стекло
  | 'misc';       // Прочее
```

---

## 3️⃣ ПРОЧНОСТЬ

```typescript
/**
 * Состояние прочности
 */
interface DurabilityState {
  // === HP ===
  hp: number;
  maxHp: number;
  
  // === ЗАЩИТА ===
  armor: number;
  damageThreshold: number;       // Урон ниже игнорируется
  
  // === СОСТОЯНИЕ ===
  condition: ObjectCondition;
  
  // === РЕГЕНЕРАЦИЯ ===
  regeneration: number;          // HP/тик (обычно 0)
}

/**
 * Состояние объекта
 */
type ObjectCondition = 
  | 'pristine'     // Идеальное
  | 'good'         // Хорошее
  | 'worn'         // Потрёпанное
  | 'damaged'      // Повреждённое
  | 'broken'       // Сломанное
  | 'destroyed';   // Уничтоженное
```

---

## 4️⃣ ХРАНИЛИЩЕ ЦИ

Для объектов, которые могут накапливать Ци (кристаллы, особые камни, предметы силы).

```typescript
/**
 * Хранилище Ци для неживых объектов
 */
interface QiStoreState {
  // === ЁМКОСТЬ ===
  capacity: number;              // Максимум Ци
  current: number;               // Текущее Ци
  
  // === ЗАРЯДКА ===
  canRecharge: boolean;          // Может заряжаться
  rechargeRate: number;          // Скорость зарядки от окружения
  lastRechargeAt?: Date;
  
  // === АТРИБУТЫ ===
  affinity: string[];            // Сродство с элементами
  purity: number;                // Чистота хранимой Ци
  
  // === ПОВЕДЕНИЕ ===
  dissipates: boolean;           // Растворяется ли Ци
  dissipateRate: number;         // Скорость растворения
}
```

---

## 5️⃣ СОДЕРЖИМОЕ

```typescript
/**
 * Содержимое объекта
 */
interface ObjectContents {
  // === РЕСУРСЫ (для добываемых объектов) ===
  resources?: {
    type: string;                // Тип ресурса
    amount: number;              // Количество
    quality: number;             // Качество (1-10)
  }[];
  
  // === ИНВЕНТАРЬ (для контейнеров) ===
  inventory?: InventoryItem[];
  
  // === ВМЕСТИМОСТЬ ===
  capacity?: number;             // Максимум слотов
  usedSlots?: number;            // Занято слотов
}

/**
 * Тип взаимодействия
 */
type InteractionType = 
  | 'mine'         // Добыча (руда)
  | 'harvest'      // Сбор (растения)
  | 'chop'         // Рубка (деревья)
  | 'open'         // Открыть (контейнеры)
  | 'use'          // Использовать
  | 'examine'      // Осмотреть
  | 'destroy';     // Разрушить
```

---

## 6️⃣ ТИПЫ НЕЖИВЫХ ОБЪЕКТОВ

### 6.1 Камень (Decoration)

```typescript
const rock: PhysicalObject = {
  id: 'OBJ_ROCK_001',
  name: 'Камень',
  category: 'decoration',
  subType: 'gray_rock',
  
  worldPosition: { locationId: 'LOC_001', x: 100, y: 50, z: 0 },
  
  physics: {
    size: { sizeClass: 'small', height: 30, width: 25, hitboxRadius: 0.15 },
    mass: 20,
    material: {
      type: 'stone',
      hardness: 7,
      flexibility: 1,
      qiConductivity: 0.1,
    },
    solid: true,
    movable: false,
    destructible: true,
    transparent: false,
    blocksMovement: true,
    blocksVision: false,
    blocksQi: false,
  },
  
  durability: {
    hp: 500,
    maxHp: 500,
    armor: 10,
    damageThreshold: 10,
    condition: 'pristine',
    regeneration: 0,
  },
  
  qiStore: {
    capacity: 50,
    current: 5,
    canRecharge: true,
    rechargeRate: 0.01,
    affinity: ['earth'],
    purity: 20,
    dissipates: true,
    dissipateRate: 0.001,
  },
  
  contents: undefined,
  interactable: false,
};
```

### 6.2 Руда (Resource)

```typescript
const ironOre: PhysicalObject = {
  id: 'OBJ_ORE_001',
  name: 'Железная руда',
  category: 'resource',
  subType: 'iron_ore',
  
  worldPosition: { locationId: 'LOC_CAVE', x: 200, y: 150, z: -10 },
  
  physics: {
    size: { sizeClass: 'medium', height: 80, width: 60, hitboxRadius: 0.4 },
    mass: 150,
    material: {
      type: 'metal',
      hardness: 8,
      flexibility: 2,
      qiConductivity: 0.5,
    },
    solid: true,
    movable: false,
    destructible: true,
    transparent: false,
    blocksMovement: true,
    blocksVision: false,
    blocksQi: false,
  },
  
  durability: {
    hp: 1000,
    maxHp: 1000,
    armor: 15,
    damageThreshold: 20,
    condition: 'pristine',
    regeneration: 0,
  },
  
  qiStore: {
    capacity: 100,
    current: 30,
    canRecharge: true,
    rechargeRate: 0.02,
    affinity: ['metal', 'earth'],
    purity: 40,
    dissipates: false,
    dissipateRate: 0,
  },
  
  contents: {
    resources: [
      { type: 'iron_ore', amount: 5, quality: 3 },
    ],
  },
  
  interactable: true,
  interactionType: 'mine',
};
```

### 6.3 Дерево (Resource)

```typescript
const oakTree: PhysicalObject = {
  id: 'OBJ_TREE_001',
  name: 'Дуб',
  category: 'resource',
  subType: 'oak_tree',
  
  worldPosition: { locationId: 'LOC_FOREST', x: 500, y: 300, z: 0 },
  
  physics: {
    size: { sizeClass: 'large', height: 800, width: 200, hitboxRadius: 1.0 },
    mass: 2000,
    material: {
      type: 'wood',
      hardness: 4,
      flexibility: 3,
      qiConductivity: 0.8,
    },
    solid: true,
    movable: false,
    destructible: true,
    transparent: false,
    blocksMovement: true,
    blocksVision: true,
    blocksQi: false,
  },
  
  durability: {
    hp: 2000,
    maxHp: 2000,
    armor: 5,
    damageThreshold: 15,
    condition: 'pristine',
    regeneration: 0,
  },
  
  qiStore: {
    capacity: 200,
    current: 80,
    canRecharge: true,
    rechargeRate: 0.05,
    affinity: ['wood', 'nature'],
    purity: 50,
    dissipates: false,
    dissipateRate: 0,
  },
  
  contents: {
    resources: [
      { type: 'wood', amount: 20, quality: 4 },
      { type: 'leaves', amount: 50, quality: 2 },
    ],
  },
  
  interactable: true,
  interactionType: 'chop',
};
```

### 6.4 Строение (Structure)

```typescript
const woodenWall: PhysicalObject = {
  id: 'OBJ_WALL_001',
  name: 'Деревянная стена',
  category: 'structure',
  subType: 'wooden_wall',
  
  worldPosition: { locationId: 'LOC_SECT', x: 100, y: 100, z: 0 },
  rotation: 0,
  
  physics: {
    size: { sizeClass: 'large', height: 300, width: 200, hitboxRadius: 1.0 },
    mass: 500,
    material: {
      type: 'wood',
      hardness: 3,
      flexibility: 4,
      qiConductivity: 0.5,
    },
    solid: true,
    movable: false,
    destructible: true,
    transparent: false,
    blocksMovement: true,
    blocksVision: true,
    blocksQi: false,
  },
  
  durability: {
    hp: 500,
    maxHp: 500,
    armor: 5,
    damageThreshold: 10,
    condition: 'pristine',
    regeneration: 0,
  },
  
  qiStore: undefined,  // Стена не хранит Ци
  
  interactable: false,
};
```

### 6.5 Кристалл Ци (Resource с высоким Qi)

```typescript
const qiCrystal: PhysicalObject = {
  id: 'OBJ_CRYSTAL_001',
  name: 'Духовный кристалл',
  category: 'resource',
  subType: 'spirit_crystal',
  
  worldPosition: { locationId: 'LOC_CAVE_DEEP', x: 100, y: 200, z: -50 },
  
  physics: {
    size: { sizeClass: 'small', height: 15, width: 10, hitboxRadius: 0.1 },
    mass: 0.5,
    material: {
      type: 'crystal',
      hardness: 5,
      flexibility: 1,
      qiConductivity: 4.0,  // Высокая проводимость!
    },
    solid: true,
    movable: true,
    destructible: true,
    transparent: true,
    blocksMovement: false,
    blocksVision: false,
    blocksQi: false,
  },
  
  durability: {
    hp: 100,
    maxHp: 100,
    armor: 0,
    damageThreshold: 5,
    condition: 'pristine',
    regeneration: 0,
  },
  
  qiStore: {
    capacity: 500,
    current: 500,
    canRecharge: true,
    rechargeRate: 0.1,
    affinity: ['neutral'],
    purity: 90,  // Высокая чистота!
    dissipates: false,
    dissipateRate: 0,
  },
  
  contents: {
    resources: [
      { type: 'spirit_crystal', amount: 1, quality: 5 },
    ],
  },
  
  interactable: true,
  interactionType: 'mine',
};
```

---

## 7️⃣ СРАВНЕНИЕ SoulEntity vs PhysicalObject

| Критерий | SoulEntity (Живые) | PhysicalObject (Неживые) |
|----------|-------------------|-------------------------|
| **Душа** | ✅ Есть | ❌ Нет |
| **Контроллер** | player / ai | none |
| **Действия** | Осознанные | Нет |
| **Движение** | Самостоятельное | Неподвижен |
| **Разум** | Есть (опционально) | Нет |
| **Тело** | Body (parts, HP) | Physics + Durability |
| **Qi** | Core или Reservoir | QiStore (опционально) |
| **Техники** | ✅ Используют | ❌ Не могут |
| **Инвентарь** | ✅ Носит | ✅ Может содержать |
| **Взаимодействие** | Активное | Реактивное |
| **Примеры** | Игрок, NPC, дух | Камень, руда, дерево |

---

## 8️⃣ КОГДА ИСПОЛЬЗОВАТЬ КАЖДУЮ СИСТЕМУ

### Использовать SoulEntity (живые):

- ✅ Объект управляется игроком или ИИ
- ✅ Объект может двигаться самостоятельно
- ✅ Объект имеет сознание/инстинкты
- ✅ Объект может использовать техники
- ✅ Объект может культивировать

### Использовать PhysicalObject (неживые):

- ✅ Объект неподвижен
- ✅ Объект не имеет сознания
- ✅ Объект является ресурсом
- ✅ Объект является декорацией
- ✅ Объект является строением

### Пограничные случаи:

| Объект | Решение | Причина |
|--------|---------|---------|
| **Голем** | SoulEntity (construct) | Имеет контроллер, может действовать |
| **Разумный меч** | SoulEntity (artifact) | Имеет разум, может "говорить" |
| **Дерево-монстр** | SoulEntity (creature) | Может двигаться и атаковать |
| **Обычное дерево** | PhysicalObject | Неподвижно, без разума |
| **Кристалл Ци** | PhysicalObject | Неподвижен, хранит Ци |

---

## 9️⃣ ПРЕОБРАЗОВАНИЕ (если нужно)

В редких случаях объект может изменять свою природу:

```typescript
/**
 * Пробуждение объекта (PhysicalObject → SoulEntity)
 * Например: древний артефакт обретает душу
 */
function awakenObject(obj: PhysicalObject, soulType: SoulType): SoulEntity {
  return {
    soul: {
      id: obj.id,
      name: obj.name,
      soulType: soulType,
      controller: 'ai',
      status: 'active',
      hasBody: true,
      hasQi: !!obj.qiStore,
      hasMind: true,
    },
    body: convertToBody(obj.physics),
    qi: convertToQi(obj.qiStore),
    mind: createAwakenedMind(obj),
    attachments: { techniques: [], inventory: [], effects: [], bonds: [] },
  };
}

/**
 * Усмирение духа (SoulEntity → PhysicalObject)
 * Например: дух запечатан в камень
 */
function sealSpirit(soul: SoulEntity): PhysicalObject {
  return {
    id: soul.soul.id,
    name: `Запечатанный ${soul.soul.name}`,
    category: 'decoration',
    physics: createSealedPhysics(soul.body),
    qiStore: convertQiToStore(soul.qi),
    interactable: true,
    interactionType: 'examine',
  };
}
```

---

## 🔗 СВЯЗАННЫЕ ДОКУМЕНТЫ

- **docs/soul-system.md** — Система живых объектов
- **docs/environment-system.md** — Система окружения
- **docs/inventory-system.md** — Система инвентаря

---

**PhysicalObject — это основа для всех неживых объектов мира.**  
**Простая, но гибкая система без лишней сложности.**
