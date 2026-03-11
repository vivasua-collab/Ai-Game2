# 👻 Система Души (Soul System)

**Версия:** 2.0  
**Создано:** 2026-03-06  
**Обновлено:** 2026-03-06  
**Статус:** Черновик  

---

## 📋 Обзор

Система "Душа" — это архитектура **только для живых (одушевлённых) объектов** мира культивации.

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
│   │   ✅ NPC (люди)                  │   │   ⬜ Руды                   │ │
│   │   ✅ Монстры                     │   │   ⬜ Деревья                │ │
│   │   ✅ Духи                        │   │   ⬜ Растения               │ │
│   │   ✅ Духовные артефакты          │   │   ⬜ Строения               │ │
│   │   ✅ Големы (конструкты)         │   │   ⬜ Предметы (обычные)     │ │
│   │                                  │   │                             │ │
│   │   Признаки:                      │   │   Признаки:                 │ │
│   │   • Душа (Soul)                  │   │   • Нет души                │ │
│   │   • Возможность двигаться        │   │   • Не двигаются сами       │ │
│   │   • Контроллер (player/ai)       │   │   • Пассивные               │ │
│   │   • Body + Qi + Mind             │   │   • Только физика           │ │
│   │                                  │   │                             │ │
│   └─────────────────────────────────┘   └─────────────────────────────┘ │
│                                                                          │
│   📖 SoulEntity → docs/soul-system.md                                   │
│   📖 PhysicalObject → docs/physical-object-system.md                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Живые объекты (SoulEntity)

Живые объекты — это сущности, обладающие **душой** и способностью **действовать**.

### Критерии "живости"

| Критерий | Описание |
|----------|----------|
| **Душа** | Наличие Soul-компонента |
| **Действие** | Способность совершать осознанные действия |
| **Контроллер** | Управляется player или ai |
| **Движение** | Способность перемещаться (опционально для духов) |

### Типы живых объектов

| Тип | Описание | Body | Qi | Mind | Примеры |
|-----|----------|------|-----|------|---------|
| `character` | Человек/гуманоид | ✅ organic | ✅ core | ✅ full | Игрок, NPC, старейшина |
| `creature` | Зверь/монстр | ✅ organic | ✅ core | ⚠️ instinct | Волк, паук, дракон |
| `spirit` | Дух/элементаль | ❌/ethereal | ✅ reservoir | ✅ full | Призрак, дух горы |
| `artifact` | Духовный артефакт | ✅ mineral | ✅ reservoir | ⚠️ simple | Разумный меч, голем |
| `construct` | Голем/механизм | ✅ construct | ✅ reservoir | ⚠️ simple | Каменный голем |

> ⚠️ = опционально/ограничено

---

## 🏗️ Архитектура SoulEntity

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SOUL ENTITY (ЖИВАЯ СУЩНОСТЬ)                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                       SOUL CORE (ОБЯЗАТЕЛЬНО)                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │     ID      │  │    Type     │  │ Controller  │              │   │
│  │  │  (unique)   │  │ (character, │  │ (player/ai) │              │   │
│  │  │             │  │  creature,  │  │             │              │   │
│  │  │             │  │  spirit...) │  │             │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│              ┌───────────────┼───────────────┐                          │
│              ▼               ▼               ▼                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │
│  │     BODY      │  │      QI       │  │    MIND       │               │
│  │  (опционально)│  │  (обязательно)│  │  (опционально)│               │
│  ├───────────────┤  ├───────────────┤  ├───────────────┤               │
│  │ • parts[]     │  │ • core или    │  │ • intelligence│               │
│  │ • size        │  │   reservoir   │  │ • memory[]    │               │
│  │ • material    │  │ • conductivity│  │ • personality │               │
│  │ • movement    │  │ • affinity    │  │ • skills[]    │               │
│  └───────────────┘  └───────────────┘  └───────────────┘               │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     ATTACHMENTS (слоты)                          │   │
│  │  • techniques[]    • inventory[]     • effects[]                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ ДУША (Soul Core)

Базовый компонент. **Обязателен для всех живых объектов.**

### 1.1 Интерфейс

```typescript
/**
 * Типы живых душ
 */
type SoulType = 
  | 'character'    // Персонаж (человек, гуманоид)
  | 'creature'     // Существо (зверь, монстр)
  | 'spirit'       // Дух (призрак, элементаль)
  | 'artifact'     // Духовный артефакт (разумный предмет)
  | 'construct';   // Конструкт (голем)

/**
 * Статус души
 */
type SoulStatus = 
  | 'active'       // Активна
  | 'dormant'      // Спит
  | 'sealed'       // Запечатана
  | 'dissolving'   // Распадается
  | 'ascended';    // Вознесена

/**
 * Кто управляет душой (ТОЛЬКО player или ai для живых!)
 */
type ControllerType = 
  | 'player'       // Управляется игроком
  | 'ai';          // Управляется ИИ (NPC, монстры, духи)

/**
 * Базовая душа
 */
interface Soul {
  // === ИДЕНТИФИКАЦИЯ ===
  id: string;                    // Уникальный ID
  name: string;                  // Имя/название
  soulType: SoulType;            // Тип души
  
  // === УПРАВЛЕНИЕ ===
  controller: ControllerType;    // Кто управляет (player или ai)
  playerId?: string;             // ID игрока (если controller='player')
  aiProfile?: string;            // Профиль ИИ (если controller='ai')
  
  // === МЕТАДАННЫЕ ===
  createdAt: Date;
  updatedAt: Date;
  source: 'generated' | 'preset' | 'player';
  
  // === СТАТУС ===
  status: SoulStatus;
  
  // === КОМПОНЕНТЫ ===
  hasBody: boolean;              // Имеет тело? (нет у духов)
  hasQi: boolean;                // Имеет Ци? (всегда true для живых)
  hasMind: boolean;              // Имеет разум? (опционально)
  
  // === ПОЗИЦИЯ ===
  worldPosition: WorldPosition;  // Где находится в мире
  
  // === ССЫЛКИ ===
  parentId?: string;             // Родительская душа
  childrenIds?: string[];        // Дочерние души
}
```

### 1.2 Примеры

```typescript
// Игрок-персонаж
const playerCharacter: Soul = {
  id: 'CHAR_001',
  name: 'Ли Вэй',
  soulType: 'character',
  controller: 'player',
  playerId: 'user_12345',
  status: 'active',
  hasBody: true,
  hasQi: true,
  hasMind: true,
};

// NPC-старейшина
const npcElder: Soul = {
  id: 'NPC_042',
  name: 'Старейшина Чэнь',
  soulType: 'character',
  controller: 'ai',
  aiProfile: 'elder_wise',
  status: 'active',
  hasBody: true,
  hasQi: true,
  hasMind: true,
};

// Монстр
const monsterWolf: Soul = {
  id: 'MON_100',
  name: 'Теневой Волк',
  soulType: 'creature',
  controller: 'ai',
  aiProfile: 'aggressive_predator',
  status: 'active',
  hasBody: true,
  hasQi: true,
  hasMind: false,  // Только инстинкты
};

// Дух
const spiritMountain: Soul = {
  id: 'SPIRIT_001',
  name: 'Дух Гор',
  soulType: 'spirit',
  controller: 'ai',
  aiProfile: 'ancient_guardian',
  status: 'active',
  hasBody: false,  // Бестелесный
  hasQi: true,
  hasMind: true,
};

// Разумный меч (духовный артефакт)
const artifactSword: Soul = {
  id: 'ART_001',
  name: 'Клинок Душ',
  soulType: 'artifact',
  controller: 'ai',
  aiProfile: 'sentient_weapon',
  status: 'active',
  hasBody: true,  // Физическая форма
  hasQi: true,
  hasMind: true,  // Ограниченный разум
};
```

---

## 2️⃣ ТЕЛО (Body Component)

Физическая оболочка. **Опционально** (нет у духов).

### 2.1 Интерфейс

```typescript
/**
 * Компонент тела
 */
interface BodyComponent {
  soulId: string;
  
  // === ТИП ===
  bodyType: BodyType;
  species?: string;              // ID вида
  
  // === РАЗМЕР ===
  size: BodySize;
  
  // === ЧАСТИ ТЕЛА (Kenshi-style) ===
  parts: Map<string, BodyPart>;
  heart: HeartProperties;
  
  // === МАТЕРИАЛ ===
  material: BodyMaterial;
  
  // === ПЕРЕДВИЖЕНИЕ ===
  movement?: MovementCapabilities;
  
  // === СОСТОЯНИЕ ===
  isAlive: boolean;
  canAct: boolean;
}

/**
 * Тип телесности
 */
type BodyType = 
  | 'organic'      // Органическое (плоть, кровь)
  | 'ethereal'     // Эфирное (призрак)
  | 'elemental'    // Элементальное (огонь, вода)
  | 'mineral'      // Минеральное (артефакты)
  | 'construct';   // Конструкт (голем)
```

### 2.2 Тело персонажа

```typescript
const cultivatorBody: BodyComponent = {
  soulId: 'CHAR_001',
  bodyType: 'organic',
  species: 'human',
  
  size: {
    sizeClass: 'medium',
    height: 175,
    width: 50,
    hitboxRadius: 0.3,
  },
  
  parts: new Map([
    ['head', { id: 'head', type: 'head', hp: {...}, ... }],
    ['torso', { id: 'torso', type: 'torso', hp: {...}, ... }],
    ['left_arm', { id: 'left_arm', type: 'arm', hp: {...}, ... }],
    // ...
  ]),
  
  heart: { hp: { max: 80, current: 80 }, vulnerable: false },
  
  material: {
    type: 'flesh',
    hardness: 3,
    flexibility: 6,
    qiConductivity: 1.0,
  },
  
  movement: {
    types: ['biped'],
    speeds: { walk: 1.5, run: 4.0 },
  },
  
  isAlive: true,
  canAct: true,
};
```

---

## 3️⃣ ЦИ (Qi Component)

Система энергии. **Обязательно для всех живых**.

### 3.1 Интерфейс

```typescript
/**
 * Компонент Ци
 */
interface QiComponent {
  soulId: string;
  
  // === ЯДРО (для культиваторов) ===
  core?: CoreState;
  
  // === РЕЗЕРВУАР (для духов/артефактов) ===
  reservoir?: QiReservoir;
  
  // === АТРИБУТЫ ===
  attributes: QiAttributes;
}

/**
 * Ядро культиватора
 */
interface CoreState {
  capacity: number;              // Максимум Ци
  quality: number;               // Качество ядра (1-10+)
  current: number;               // Текущее Ци
  accumulated: number;           // Накопленное (для прорыва)
  baseGeneration: number;        // Генерация Ци/тик
  status: CoreStatus;
  cultivationLevel: number;
  cultivationSubLevel: number;
}

/**
 * Резервуар (для духов и артефактов)
 */
interface QiReservoir {
  capacity: number;
  current: number;
  regeneration: number;
  canRecharge: boolean;
}

/**
 * Атрибуты Ци
 */
interface QiAttributes {
  conductivity: number;          // Проводимость
  affinity: Element[];           // Сродство с элементами
  purity: number;                // Чистота Ци (0-100%)
}
```

### 3.2 Ци персонажа

```typescript
const cultivatorQi: QiComponent = {
  soulId: 'CHAR_001',
  
  core: {
    capacity: 1000,
    quality: 5,
    current: 850,
    accumulated: 150,
    baseGeneration: 0.5,
    status: 'stable',
    cultivationLevel: 2,
    cultivationSubLevel: 3,
  },
  
  reservoir: undefined,  // Использует ядро
  
  attributes: {
    conductivity: 2.5,
    affinity: ['neutral'],
    purity: 60,
  },
};
```

### 3.3 Ци духа

```typescript
const spiritQi: QiComponent = {
  soulId: 'SPIRIT_001',
  
  core: undefined,  // Духи не культивируют
  
  reservoir: {
    capacity: 5000,
    current: 4500,
    regeneration: 10,
    canRecharge: true,
  },
  
  attributes: {
    conductivity: 5.0,  // Высокая проводимость
    affinity: ['earth', 'neutral'],
    purity: 80,
  },
};
```

---

## 4️⃣ РАЗУМ (Mind Component)

Сознание и память. **Опционально** (нет у простых монстров).

### 4.1 Интерфейс

```typescript
/**
 * Компонент разума
 */
interface MindComponent {
  soulId: string;
  
  // === ИНТЕЛЛЕКТ ===
  intelligence: {
    base: number;                // IQ (1-200+)
    reasoning: number;
    memory: number;
    learning: number;
    creativity: number;
    focus: number;
  };
  
  // === ПАМЯТЬ ===
  memory?: {
    shortTerm: string[];
    longTerm: string[];
  };
  
  // === ЛИЧНОСТЬ (для NPC/духов) ===
  personality?: {
    traits: string[];
    goals: string[];
    fears: string[];
  };
  
  // === НАВЫКИ ===
  skills: Record<string, number>;
  
  // === СОСТОЯНИЕ ===
  status: {
    sanity: number;              // Рассудок (0-100)
    clarity: number;             // Ясность (0-100)
    mentalFatigue: number;       // Усталость (0-100)
  };
}
```

---

## 5️⃣ ПОЛНАЯ СУЩНОСТЬ (SoulEntity)

```typescript
/**
 * Полная живая сущность
 */
interface SoulEntity {
  // === ДУША (обязательно) ===
  soul: Soul;
  
  // === КОМПОНЕНТЫ (опционально) ===
  body: BodyComponent | null;
  qi: QiComponent;
  mind: MindComponent | null;
  
  // === ПРИЛОЖЕНИЯ ===
  attachments: {
    techniques: TechniqueRef[];
    inventory: InventoryItem[];
    effects: ActiveEffect[];
    bonds: SoulBond[];
  };
}
```

---

## 6️⃣ МАТРИЦА КОМПОНЕНТОВ

| Тип | Soul | Body | Qi | Mind | Controller | Пример |
|-----|------|------|-----|------|------------|--------|
| **Персонаж-игрок** | ✅ | ✅ organic | ✅ core | ✅ full | `player` | Главный герой |
| **Персонаж-NPC** | ✅ | ✅ organic | ✅ core | ✅ full | `ai` | Старейшина |
| **Существо** | ✅ | ✅ organic | ✅ core | ⚠️ instinct | `ai` | Волк, монстр |
| **Дух** | ✅ | ❌/ethereal | ✅ reservoir | ✅ full | `ai`/`player` | Дух горы |
| **Артефакт** | ✅ | ✅ mineral | ✅ reservoir | ⚠️ simple | `ai` | Разумный меч |
| **Конструкт** | ✅ | ✅ construct | ✅ reservoir | ⚠️ simple | `ai`/`player` | Голем |

---

## 7️⃣ ПЕРЕКЛЮЧЕНИЕ КОНТРОЛЛЕРА

```typescript
/**
 * Сервис управления контролем
 */
class ControllerService {
  /**
   * Игрок вселяется в другую душу
   */
  static possess(
    playerSoul: SoulEntity, 
    targetSoul: SoulEntity
  ): PossessionResult {
    // Проверяем: цель должна быть живой (иметь разум)
    if (!targetSoul.mind) {
      return { success: false, error: 'Target has no mind to possess' };
    }
    
    // Сохраняем старую душу
    const previousSoulId = playerSoul.soul.id;
    
    // Освобождаем старую душу
    playerSoul.soul.controller = 'ai';
    playerSoul.soul.playerId = undefined;
    
    // Вселяемся в новую
    targetSoul.soul.controller = 'player';
    targetSoul.soul.playerId = playerSoul.soul.playerId;
    
    return { success: true, previousSoulId, newSoulId: targetSoul.soul.id };
  }
}
```

---

## 8️⃣ ПРИМЕРЫ СУЩНОСТЕЙ

### 8.1 Персонаж-игрок

```typescript
const playerEntity: SoulEntity = {
  soul: {
    id: 'CHAR_001',
    name: 'Ли Вэй',
    soulType: 'character',
    controller: 'player',
    playerId: 'user_12345',
    status: 'active',
    hasBody: true,
    hasQi: true,
    hasMind: true,
    worldPosition: { locationId: 'LOC_001', x: 100, y: 50, z: 0 },
  },
  
  body: createHumanBody('CHAR_001'),
  qi: createCultivatorQi('CHAR_001'),
  mind: createHumanMind('CHAR_001'),
  
  attachments: {
    techniques: [],
    inventory: [],
    effects: [],
    bonds: [],
  },
};
```

### 8.2 Монстр

```typescript
const wolfEntity: SoulEntity = {
  soul: {
    id: 'MON_100',
    name: 'Теневой Волк',
    soulType: 'creature',
    controller: 'ai',
    aiProfile: 'aggressive_predator',
    status: 'active',
    hasBody: true,
    hasQi: true,
    hasMind: false,  // Инстинкты, не разум
    worldPosition: { locationId: 'LOC_005', x: 500, y: 300, z: 0 },
  },
  
  body: createWolfBody('MON_100'),
  qi: createCreatureQi('MON_100'),
  mind: null,  // Нет разума
  
  attachments: {
    techniques: [
      { id: 'bite', name: 'Укус', mastery: 60 },
    ],
    inventory: [],
    effects: [],
    bonds: [],
  },
};
```

### 8.3 Дух

```typescript
const spiritEntity: SoulEntity = {
  soul: {
    id: 'SPIRIT_001',
    name: 'Дух Гор',
    soulType: 'spirit',
    controller: 'ai',
    aiProfile: 'ancient_guardian',
    status: 'active',
    hasBody: false,
    hasQi: true,
    hasMind: true,
    worldPosition: { locationId: 'LOC_MOUNTAIN', x: 0, y: 1000, z: 0 },
  },
  
  body: null,  // Бестелесный
  qi: createSpiritQi('SPIRIT_001'),
  mind: createSpiritMind('SPIRIT_001'),
  
  attachments: {
    techniques: [
      { id: 'earthquake', name: 'Землетрясение', qiCost: 200 },
    ],
    inventory: [],
    effects: [],
    bonds: [],
  },
};
```

---

## 9️⃣ ОТЛИЧИЕ ОТ НЕЖИВЫХ ОБЪЕКТОВ

| Критерий | Живые (SoulEntity) | Неживые (PhysicalObject) |
|----------|-------------------|-------------------------|
| **Душа** | ✅ Есть | ❌ Нет |
| **Контроллер** | player / ai | none |
| **Действия** | Осознанные | Реактивные |
| **Движение** | Самостоятельное | Неподвижны |
| **Qi** | core или reservoir | reservoir (опционально) |
| **Mind** | Есть (опционально) | Нет |
| **Техники** | ✅ Могут использовать | ❌ Не могут |
| **Инвентарь** | ✅ Могут носить | ❌ Не могут |

---

## 🔗 СВЯЗАННЫЕ ДОКУМЕНТЫ

- **docs/physical-object-system.md** — Система неживых объектов
- **docs/body.md** — Детальное описание системы тела
- **docs/start_lore.md** — Лор мира культивации

---

**Система Души применяется только к живым объектам.**  
**Для неживых объектов используйте PhysicalObject.**
