# 👻 Система Души (Soul System)

**Версия:** 1.2  
**Создано:** 2026-03-06  
**Обновлено:** 2026-03-06  
**Статус:** Черновик  

---

## 📋 Обзор

Система "Душа" — это базовая архитектура для **всех объектов в мире**, от живых существ до камней. Каждая сущность имеет:

1. **Душа (Soul)** — базовый объект с ID
2. **Тело (Body)** — опциональный компонент
3. **Ци (Qi)** — опциональный компонент
4. **Контроллер (Controller)** — кто управляет (игрок/AI)

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SOUL (ДУША)                                     │
│                       Базовый объект с ID                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                       SOUL CORE                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │     ID      │  │    Type     │  │   Metadata  │              │   │
│  │  │  (unique)   │  │ (soul_type) │  │  (created,  │              │   │
│  │  │             │  │             │  │   updated)  │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│              ┌───────────────┼───────────────┐                          │
│              ▼               ▼               ▼                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │
│  │     BODY      │  │      QI       │  │    MIND       │               │
│  │  (optional)   │  │  (optional)   │  │  (optional)   │               │
│  ├───────────────┤  ├───────────────┤  ├───────────────┤               │
│  │ • parts[]     │  │ • current     │  │ • memory[]    │               │
│  │ • size        │  │ • capacity    │  │ • skills[]    │               │
│  │ • material    │  │ • conductivity│  │ • personality │               │
│  │ • movement    │  │ • core        │  │ • relations[] │               │
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

## 1️⃣ ДУША (Soul)

Базовый объект. Минимальная единица мира.

### 1.1 Интерфейс

```typescript
/**
 * Типы душ
 */
type SoulType = 
  | 'character'    // Персонаж (человек, гуманоид)
  | 'creature'     // Существо (зверь, монстр)
  | 'spirit'       // Дух (призрак, элементаль)
  | 'plant'        // Растение
  | 'object'       // Объект (камень, дерево, предмет)
  | 'construct';   // Конструкт (голем, механизмы)

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
 * Кто управляет душой
 */
type ControllerType = 
  | 'player'       // Управляется игроком
  | 'ai'           // Управляется ИИ (NPC, монстры)
  | 'none';        // Нет управления (объекты, растения)

/**
 * Базовая душа
 */
interface Soul {
  // === ИДЕНТИФИКАЦИЯ ===
  id: string;                    // Уникальный ID (cUID2 или префикс+номер)
  name: string;                  // Имя/название
  soulType: SoulType;            // Тип души
  
  // === УПРАВЛЕНИЕ ===
  controller: ControllerType;    // Кто управляет
  playerId?: string;             // ID игрока (если controller='player')
  aiProfile?: string;            // Профиль ИИ (если controller='ai')
  
  // === МЕТАДАННЫЕ ===
  createdAt: Date;               // Дата создания
  updatedAt: Date;               // Дата обновления
  source: string;                // Источник (generated, preset, player)
  
  // === СТАТУС ===
  status: SoulStatus;
  
  // === КОМПОНЕНТЫ (опционально) ===
  hasBody: boolean;              // Имеет тело?
  hasQi: boolean;                // Имеет Ци?
  hasMind: boolean;              // Имеет разум?
  
  // === ПОЗИЦИЯ ===
  worldPosition?: WorldPosition; // Где находится в мире
  
  // === ССЫЛКИ ===
  parentId?: string;             // Родительская душа (для частей)
  childrenIds?: string[];        // Дочерние души
}

/**
 * Позиция в мире
 */
interface WorldPosition {
  locationId: string;
  x: number;                     // Метры
  y: number;
  z: number;
}
```

### 1.2 Примеры душ

```typescript
// Камень (минимальная душа, нет управления)
const stone: Soul = {
  id: 'OBJ_000001',
  name: 'Камень',
  soulType: 'object',
  controller: 'none',        // Нет управления
  status: 'dormant',
  hasBody: true,             // Тело = физическая форма
  hasQi: true,               // Резервуар Ци
  hasMind: false,            // Нет разума
};

// Игрок-персонаж (управляется человеком)
const playerCharacter: Soul = {
  id: 'cmmaewq7h...',
  name: 'Ли Вэй',
  soulType: 'character',
  controller: 'player',      // Управляется игроком
  playerId: 'user_12345',    // ID пользователя
  status: 'active',
  hasBody: true,
  hasQi: true,
  hasMind: true,
};

// NPC-персонаж (управляется ИИ)
const npcCharacter: Soul = {
  id: 'NPC_000042',
  name: 'Старейшина Чэнь',
  soulType: 'character',
  controller: 'ai',          // Управляется ИИ
  aiProfile: 'elder_wise',   // Профиль поведения
  status: 'active',
  hasBody: true,
  hasQi: true,
  hasMind: true,
};

// Игрок-существо (игра за зверя)
const playerCreature: Soul = {
  id: 'PC_000001',
  name: 'Теневой Волк',
  soulType: 'creature',
  controller: 'player',      // Игрок управляет существом!
  playerId: 'user_12345',
  status: 'active',
  hasBody: true,
  hasQi: true,
  hasMind: true,             // Разум развился
};

// Монстр (управляется ИИ)
const monsterCreature: Soul = {
  id: 'MON_000100',
  name: 'Древний Паук',
  soulType: 'creature',
  controller: 'ai',          // Управляется ИИ
  aiProfile: 'aggressive_predator',
  status: 'active',
  hasBody: true,
  hasQi: true,
  hasMind: false,            // Инстинкты, не разум
};

// Дух (может быть игроком или ИИ)
const playerSpirit: Soul = {
  id: 'SPIRIT_000001',
  name: 'Призрак Блуждающий',
  soulType: 'spirit',
  controller: 'player',      // Игрок стал духом!
  playerId: 'user_12345',
  status: 'active',
  hasBody: false,            // Бестелесный
  hasQi: true,
  hasMind: true,
};

// ИИ-дух
const aiSpirit: Soul = {
  id: 'SPIRIT_000042',
  name: 'Дух Гор',
  soulType: 'spirit',
  controller: 'ai',
  aiProfile: 'ancient_guardian',
  status: 'active',
  hasBody: false,
  hasQi: true,
  hasMind: true,
};
```

---

## 2️⃣ ТЕЛО (Body Component)

Физическая оболочка души. Опциональный компонент.

### 2.1 Интерфейс

```typescript
/**
 * Компонент тела
 */
interface BodyComponent {
  // === ПРИВЯЗКА ===
  soulId: string;                // ID души-владельца
  
  // === ТИП ===
  bodyType: BodyType;            // Тип телесности
  species?: string;              // ID вида (для живых)
  
  // === РАЗМЕР ===
  size: BodySize;
  
  // === ЧАСТИ ТЕЛА ===
  parts: BodyPart[];
  
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
  | 'mineral'      // Минеральное (камень, металл)
  | 'plant'        // Растительное
  | 'construct';   // Конструкт (голем)

/**
 * Материал тела
 */
interface BodyMaterial {
  type: MaterialType;
  hardness: number;              // 1-10
  flexibility: number;           // 1-10
  qiConductivity: number;        // 0.1-5.0
  immuneTo: string[];
  vulnerableTo: string[];
}

type MaterialType = 
  | 'flesh'          // Плоть
  | 'scaled'         // Чешуя
  | 'fur'            // Мех
  | 'feathered'      // Перья
  | 'carapace'       // Панцирь
  | 'ethereal'       // Эфир
  | 'elemental'      // Элемент
  | 'stone'          // Камень
  | 'metal'          // Металл
  | 'wood'           // Дерево
  | 'crystal';       // Кристалл
```

### 2.2 Тело камня

```typescript
const stoneBody: BodyComponent = {
  soulId: 'OBJ_000001',
  bodyType: 'mineral',
  
  size: {
    sizeClass: 'small',
    height: 30,
    width: 25,
    hitboxRadius: 0.15,
  },
  
  parts: [
    {
      id: 'main',
      name: 'Основная масса',
      type: 'mass',
      durability: {
        maxHP: 500,
        currentHP: 500,
        armor: 10,
        damageThreshold: 1000,  // Нельзя отрубить
      },
    },
  ],
  
  material: {
    type: 'stone',
    hardness: 7,
    flexibility: 1,
    qiConductivity: 0.1,  // Почти не проводит
    immuneTo: ['poison', 'mental'],
    vulnerableTo: ['earth_techniques'],
  },
  
  movement: undefined,  // Не двигается
  
  isAlive: false,
  canAct: false,
};
```

### 2.3 Тело культиватора

```typescript
const cultivatorBody: BodyComponent = {
  soulId: 'cmmaewq7h...',
  bodyType: 'organic',
  species: 'human',
  
  size: {
    sizeClass: 'medium',
    height: 175,
    width: 50,
    hitboxRadius: 0.3,
  },
  
  parts: [
    { id: 'head', type: 'head', ... },
    { id: 'torso', type: 'torso', ... },
    { id: 'heart', type: 'heart', ... },
    { id: 'left_arm', type: 'arm', ... },
    { id: 'right_arm', type: 'arm', ... },
    { id: 'left_leg', type: 'leg', ... },
    { id: 'right_leg', type: 'leg', ... },
  ],
  
  material: {
    type: 'flesh',
    hardness: 3,
    flexibility: 6,
    qiConductivity: 1.0,  // Базовая для человека
    immuneTo: [],
    vulnerableTo: [],
  },
  
  movement: {
    types: ['biped'],
    speeds: { walk: 1.5, run: 4.0, ... },
  },
  
  isAlive: true,
  canAct: true,
};
```

---

## 3️⃣ ЦИ (Qi Component)

Система энергии. Опциональный компонент.

### 3.1 Интерфейс

```typescript
/**
 * Компонент Ци
 */
interface QiComponent {
  // === ПРИВЯЗКА ===
  soulId: string;
  
  // === ЯДРО ===
  core: CoreState;
  
  // === МЕРИДИАНЫ ===
  meridians: MeridianSystem;
  
  // === РЕЗЕРВУАР ===
  reservoir: QiReservoir;
  
  // === АТРИБУТЫ ===
  attributes: QiAttributes;
}

/**
 * Состояние ядра
 */
interface CoreState {
  // === ЁМКОСТЬ ===
  capacity: number;              // Максимум Ци
  quality: number;               // Качество ядра (1-10+)
  
  // === ТЕКУЩЕЕ ===
  current: number;               // Текущее Ци
  accumulated: number;           // Накопленное (для прорыва)
  
  // === ГЕНЕРАЦИЯ ===
  baseGeneration: number;        // Базовая генерация (Ци/тик)
  
  // === СОСТОЯНИЕ ===
  status: CoreStatus;
  cultivationLevel: number;
  cultivationSubLevel: number;
}

type CoreStatus = 
  | 'forming'        // Формируется
  | 'stable'         // Стабильное
  | 'expanded'       // Расширенное
  | 'crystallizing'  // Кристаллизуется
  | 'transcendent';  // Трансцендентное

/**
 * Резервуар Ци (для духов и предметов)
 */
interface QiReservoir {
  capacity: number;              // Максимум
  current: number;               // Текущее
  regeneration: number;          // Регенерация/тик
  canRecharge: boolean;          // Может перезаряжаться
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

### 3.2 Ци камня (минимальное)

```typescript
const stoneQi: QiComponent = {
  soulId: 'OBJ_000001',
  
  core: {
    capacity: 0,         // Нет ядра!
    quality: 0,
    current: 0,
    accumulated: 0,
    baseGeneration: 0,
    status: 'forming',   // Никогда не сформируется
    cultivationLevel: 0,
    cultivationSubLevel: 0,
  },
  
  meridians: {
    mainChannel: null,   // Нет меридиан
    channels: [],
  },
  
  reservoir: {
    capacity: 50,        // Может хранить немного Ци
    current: 5,          // Случайный заряд
    regeneration: 0,     // Не регенерирует
    canRecharge: true,   // Можно зарядить извне
  },
  
  attributes: {
    conductivity: 0.1,   // Почти не проводит
    affinity: ['earth'],
    purity: 20,
  },
};
```

### 3.3 Ци культиватора

```typescript
const cultivatorQi: QiComponent = {
  soulId: 'cmmaewq7h...',
  
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
  
  meridians: {
    mainChannel: {
      conductivity: 2.5,
      capacity: 100,
      status: 'normal',
    },
    channels: [/* 12 основных меридиан */],
  },
  
  reservoir: {
    capacity: 0,         // Использует ядро
    current: 0,
    regeneration: 0,
    canRecharge: false,
  },
  
  attributes: {
    conductivity: 2.5,
    affinity: ['neutral'],
    purity: 60,
  },
};
```

---

## 4️⃣ РАЗУМ (Mind Component)

Сознание и память. Опциональный компонент.

### 4.1 Интерфейс

```typescript
/**
 * Компонент разума
 */
interface MindComponent {
  // === ПРИВЯЗКА ===
  soulId: string;
  
  // === ИНТЕЛЛЕКТ ===
  intelligence: MindStats;
  
  // === ПАМЯТЬ ===
  memory: MemorySystem;
  
  // === ЛИЧНОСТЬ ===
  personality?: PersonalityTraits;
  
  // === НАВЫКИ ===
  skills: SkillRegistry;
  
  // === СОСТОЯНИЕ ===
  status: MindStatus;
}

interface MindStats {
  base: number;                  // IQ (1-200+)
  reasoning: number;             // Логика
  memory: number;                // Память
  learning: number;              // Обучение
  creativity: number;            // Креативность
  focus: number;                 // Концентрация
}

interface MindStatus {
  sanity: number;                // Рассудок (0-100)
  clarity: number;               // Ясность (0-100)
  mentalFatigue: number;         // Усталость (0-100)
  dominantEmotion: string;
}
```

### 4.2 Разум vs Без разума

```typescript
// Камень - НЕТ разума
const stoneMind: MindComponent | null = null;

// Животное - ПРОСТОЙ разум
const wolfMind: MindComponent = {
  soulId: 'WOLF_000001',
  intelligence: {
    base: 15,
    reasoning: 10,
    memory: 30,
    learning: 40,
    creativity: 5,
    focus: 60,
  },
  memory: { /* инстинкты */ },
  skills: { hunting: 50, survival: 60 },
  status: { sanity: 100, clarity: 80, mentalFatigue: 0, dominantEmotion: 'hunger' },
};

// Культиватор - ПОЛНЫЙ разум
const cultivatorMind: MindComponent = {
  soulId: 'cmmaewq7h...',
  intelligence: {
    base: 85,
    reasoning: 70,
    memory: 80,
    learning: 90,
    creativity: 60,
    focus: 75,
  },
  memory: { /* полная память */ },
  personality: { /* черты характера */ },
  skills: { /* изученные техники */ },
  status: { sanity: 100, clarity: 90, mentalFatigue: 15, dominantEmotion: 'calm' },
};
```

---

## 5️⃣ СИСТЕМА КОМПОНЕНТОВ

### 5.1 Архитектура компонентов

```typescript
/**
 * Полная сущность = Душа + компоненты
 */
interface SoulEntity {
  soul: Soul;                    // ВСЕГДА есть
  
  body: BodyComponent | null;    // Опционально
  qi: QiComponent | null;        // Опционально
  mind: MindComponent | null;    // Опционально
  
  attachments: Attachments;      // Техники, инвентарь
}

/**
 * Вложения (общие для всех)
 */
interface Attachments {
  techniques: TechniqueRef[];    // Изученные техники
  inventory: InventorySlot[];    // Инвентарь
  effects: ActiveEffect[];       // Активные эффекты
  bonds: SoulBond[];             // Связи с другими душами
}
```

### 5.2 Матрица компонентов

| Тип души | Soul | Body | Qi | Mind | Controller | Пример |
|----------|------|------|-----|------|------------|--------|
| **Персонаж-игрок** | ✅ | ✅ | ✅ | ✅ | `player` | Главный герой |
| **Персонаж-NPC** | ✅ | ✅ | ✅ | ✅ | `ai` | Старейшина, торговец |
| **Существо-игрок** | ✅ | ✅ | ✅ | ✅ | `player` | Игра за волка |
| **Существо-монстр** | ✅ | ✅ | ✅ | ⚠️ | `ai` | Дикий зверь |
| **Дух-игрок** | ✅ | ❌ | ✅ | ✅ | `player` | Игрок-призрак |
| **Дух-ИИ** | ✅ | ❌ | ✅ | ✅ | `ai` | Элементаль |
| **Растение** | ✅ | ✅ | ⚠️ | ❌ | `none` | Дерево |
| **Объект** | ✅ | ✅ | ⚠️ | ❌ | `none` | Камень |
| **Конструкт** | ✅ | ✅ | ✅ | ⚠️ | `ai`/`player` | Голем |

> ⚠️ = опционально/ограничено

### 5.3 Система контроля

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      КТО УПРАВЛЯЕТ ДУШОЙ?                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────┐                                                    │
│   │    'player'     │  ← Игрок управляет через UI/клавиатуру            │
│   │                 │                                                    │
│   │  • Персонаж     │    - Полный контроль действий                      │
│   │  • Существо     │    - Решения принимает человек                     │
│   │  • Дух          │    - Может переключаться между душами              │
│   │  • Конструкт    │                                                    │
│   └─────────────────┘                                                    │
│                                                                          │
│   ┌─────────────────┐                                                    │
│   │      'ai'       │  ← ИИ управляет по скриптам/логике                │
│   │                 │                                                    │
│   │  • NPC          │    - aiProfile определяет поведение               │
│   │  • Монстры      │    - Реакции на события мира                       │
│   │  • Духи         │    - Диалоги, бои, патрулирование                  │
│   │  • Конструкт    │                                                    │
│   └─────────────────┘                                                    │
│                                                                          │
│   ┌─────────────────┐                                                    │
│   │     'none'      │  ← Нет управления (пассивные объекты)             │
│   │                 │                                                    │
│   │  • Объекты      │    - Камни, деревья, предметы                      │
│   │  • Растения     │    - Только физика и реакции                       │
│   │                 │                                                    │
│   └─────────────────┘                                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Переключение контроля

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
    // Проверяем возможность вселения
    if (!targetSoul.mind) {
      return { success: false, error: 'Target has no mind to possess' };
    }
    
    // Сохраняем старую душу игрока
    const previousSoulId = playerSoul.soul.id;
    
    // Освобождаем старую душу (становится AI или none)
    playerSoul.soul.controller = playerSoul.soul.soulType === 'character' ? 'ai' : 'none';
    playerSoul.soul.playerId = undefined;
    
    // Вселяемся в новую душу
    targetSoul.soul.controller = 'player';
    targetSoul.soul.playerId = playerSoul.soul.playerId;
    
    return { 
      success: true, 
      previousSoulId,
      newSoulId: targetSoul.soul.id 
    };
  }
  
  /**
   * Игрок покидает душу (выход из игры/смена персонажа)
   */
  static release(soul: SoulEntity): ReleaseResult {
    if (soul.soul.controller !== 'player') {
      return { success: false, error: 'Soul is not player-controlled' };
    }
    
    // Душа возвращается к AI или становится пассивной
    soul.soul.controller = soul.soul.soulType === 'character' ? 'ai' : 'none';
    soul.soul.playerId = undefined;
    
    return { success: true };
  }
}
```

---

## 6️⃣ ПРИМЕРЫ СУЩНОСТЕЙ

### 6.1 Камень (объект, нет контроля)

```typescript
const stoneEntity: SoulEntity = {
  soul: {
    id: 'OBJ_000001',
    name: 'Камень',
    soulType: 'object',
    controller: 'none',        // Нет управления
    status: 'dormant',
    hasBody: true,
    hasQi: true,               // Минимальный резервуар
    hasMind: false,
  },
  
  body: {
    soulId: 'OBJ_000001',
    bodyType: 'mineral',
    size: { sizeClass: 'small', height: 30, width: 25 },
    parts: [{ id: 'main', name: 'Основная масса', type: 'mass', ... }],
    material: { type: 'stone', hardness: 7, flexibility: 1, qiConductivity: 0.1, ... },
    isAlive: false,
    canAct: false,
  },
  
  qi: {
    soulId: 'OBJ_000001',
    core: { capacity: 0, quality: 0, current: 0, ... },
    reservoir: { capacity: 50, current: 5, regeneration: 0, ... },
    attributes: { conductivity: 0.1, affinity: ['earth'], purity: 20 },
  },
  
  mind: null,  // Нет разума
  
  attachments: {
    techniques: [],
    inventory: [],
    effects: [],
    bonds: [],
  },
};
```

### 6.2 Культиватор-игрок

```typescript
const playerCultivatorEntity: SoulEntity = {
  soul: {
    id: 'cmmaewq7h...',
    name: 'Ли Вэй',
    soulType: 'character',
    controller: 'player',      // Управляется игроком
    playerId: 'user_12345',
    status: 'active',
    hasBody: true,
    hasQi: true,
    hasMind: true,
  },
  
  body: {
    soulId: 'cmmaewq7h...',
    bodyType: 'organic',
    species: 'human',
    size: { sizeClass: 'medium', height: 175, width: 50 },
    parts: [/* голова, торс, сердце, руки, ноги */],
    material: { type: 'flesh', hardness: 3, flexibility: 6, qiConductivity: 1.0, ... },
    movement: { types: ['biped'], speeds: { walk: 1.5, run: 4.0, ... } },
    isAlive: true,
    canAct: true,
  },
  
  qi: {
    soulId: 'cmmaewq7h...',
    core: { capacity: 1000, quality: 5, current: 850, accumulated: 150, ... },
    meridians: { mainChannel: { conductivity: 2.5, ... }, channels: [...] },
    attributes: { conductivity: 2.5, affinity: ['neutral'], purity: 60 },
  },
  
  mind: {
    soulId: 'cmmaewq7h...',
    intelligence: { base: 85, reasoning: 70, memory: 80, ... },
    memory: { /* полная память */ },
    personality: { /* черты */ },
    skills: { /* техники */ },
    status: { sanity: 100, clarity: 90, mentalFatigue: 15, ... },
  },
  
  attachments: {
    techniques: [/* изученные техники */],
    inventory: [/* предметы */],
    effects: [/* активные эффекты */],
    bonds: [/* связи */],
  },
};
```

### 6.3 NPC-персонаж (управляется ИИ)

```typescript
const npcCultivatorEntity: SoulEntity = {
  soul: {
    id: 'NPC_000042',
    name: 'Старейшина Чэнь',
    soulType: 'character',
    controller: 'ai',           // Управляется ИИ
    aiProfile: 'elder_wise',    // Мудрый старец
    status: 'active',
    hasBody: true,
    hasQi: true,
    hasMind: true,
  },
  
  body: {
    soulId: 'NPC_000042',
    bodyType: 'organic',
    species: 'human',
    // ... как у игрока
  },
  
  qi: {
    soulId: 'NPC_000042',
    core: { capacity: 5000, quality: 8, current: 4500, ... },  // Высокий уровень
    // ...
  },
  
  mind: {
    soulId: 'NPC_000042',
    personality: {
      traits: ['wise', 'patient', 'protective'],
      goals: ['protect_sect', 'teach_disciples'],
      fears: ['sect_decline'],
    },
    // ...
  },
  
  attachments: { /* ... */ },
};
```

### 6.4 Игрок-существо (игра за волка)

```typescript
const playerCreatureEntity: SoulEntity = {
  soul: {
    id: 'PC_000001',
    name: 'Теневой Волк',
    soulType: 'creature',
    controller: 'player',       // Игрок управляет!
    playerId: 'user_12345',
    status: 'active',
    hasBody: true,
    hasQi: true,
    hasMind: true,              // Развитый разум
  },
  
  body: {
    soulId: 'PC_000001',
    bodyType: 'organic',
    species: 'shadow_wolf',
    
    size: {
      sizeClass: 'medium',
      height: 80,
      length: 150,              // Длина тела
      hitboxRadius: 0.5,
    },
    
    parts: [
      { id: 'head', type: 'head', ... },
      { id: 'torso', type: 'torso', ... },
      { id: 'front_left_leg', type: 'leg', ... },
      { id: 'front_right_leg', type: 'leg', ... },
      { id: 'back_left_leg', type: 'leg', ... },
      { id: 'back_right_leg', type: 'leg', ... },
      { id: 'tail', type: 'tail', ... },
    ],
    
    material: {
      type: 'fur',
      hardness: 2,
      flexibility: 7,
      qiConductivity: 1.5,      // Выше человеческой
    },
    
    movement: {
      types: ['quadruped'],
      speeds: { walk: 2.0, run: 8.0, swim: 1.0 },
      abilities: {
        canJump: true,
        jumpHeight: 2.0,
        canClimb: false,
      },
    },
  },
  
  qi: {
    soulId: 'PC_000001',
    core: { capacity: 800, quality: 4, current: 600, ... },
    attributes: {
      conductivity: 1.5,
      affinity: ['shadow', 'wind'],
      purity: 40,
    },
  },
  
  mind: {
    soulId: 'PC_000001',
    // Игрок управляет, но есть базовые инстинкты
    instincts: {
      hunting: 80,
      survival: 90,
      pack: 70,
    },
    // Разум игрока "переписывает" инстинкты
    playerOverride: true,
  },
  
  attachments: {
    // Врождённые техники волка
    techniques: [
      { id: 'bite', name: 'Укус', type: 'melee_strike', mastery: 60 },
      { id: 'claw_swipe', name: 'Удар когтями', type: 'melee_strike', mastery: 50 },
      { id: 'howl', name: 'Вой', type: 'support', mastery: 30 },
    ],
    // Волк не носит инвентарь в обычном смысле
    inventory: [],
    effects: [],
    bonds: [],  // Связи со стаей
  },
};
```

### 6.5 Дух-игрок (бестелесный)

```typescript
const playerSpiritEntity: SoulEntity = {
  soul: {
    id: 'SPIRIT_000001',
    name: 'Призрак Блуждающий',
    soulType: 'spirit',
    controller: 'player',
    playerId: 'user_12345',
    status: 'active',
    hasBody: false,             // БЕЗ тела!
    hasQi: true,
    hasMind: true,
  },
  
  body: null,                   // НЕТ тела
  
  qi: {
    soulId: 'SPIRIT_000001',
    core: { capacity: 2000, quality: 6, current: 1800, ... },
    // Духи имеют особую связь с Ци
    spiritQi: {
      canPhase: true,           // Проходить сквозь предметы
      canInvisibility: true,    // Невидимость
      canPossess: true,         // Вселяться в объекты
    },
  },
  
  mind: {
    soulId: 'SPIRIT_000001',
    // Память о прошлой жизни
    pastLifeMemory: {
      name: 'Ли Вэй',
      deathCause: 'cultivation_backlash',
      retainedMemories: ['techniques', 'relationships'],
    },
  },
  
  attachments: {
    // Духовные техники
    techniques: [
      { id: 'phase_through', name: 'Фазовый переход', type: 'movement', qiCost: 20 },
      { id: 'spirit_bolt', name: 'Духовный заряд', type: 'ranged', qiCost: 50 },
      { id: 'possess_object', name: 'Вселение', type: 'curse', qiCost: 100 },
    ],
    // Дух не имеет физического инвентаря
    inventory: [],
    effects: [],
    bonds: [],
  },
};
```

### 6.6 Дух-ИИ (охранник локации)

```typescript
const aiSpiritEntity: SoulEntity = {
  soul: {
    id: 'SPIRIT_000042',
    name: 'Дух Гор',
    soulType: 'spirit',
    controller: 'ai',
    aiProfile: 'ancient_guardian',
    status: 'active',
    hasBody: false,
    hasQi: true,
    hasMind: true,
  },
  
  body: null,
  
  qi: {
    soulId: 'SPIRIT_000042',
    core: { capacity: 5000, quality: 8, current: 4500, ... },
  },
  
  mind: {
    soulId: 'SPIRIT_000042',
    personality: {
      traits: ['ancient', 'territorial', 'protective'],
      goals: ['guard_mountain'],
      dialogue: 'ancient_spirit',
    },
  },
  
  attachments: {
    techniques: [/* силы природы */],
    inventory: [],
    effects: [],
    bonds: [],
  },
};
```

---

## 7️⃣ ИНТЕГРАЦИЯ С СУЩЕСТВУЮЩЕЙ АРХИТЕКТУРОЙ

### 7.1 TruthSystem Integration

```typescript
/**
 * Расширенное состояние сессии
 */
interface SessionStateV2 {
  sessionId: string;
  
  // Душа игрока
  playerSoul: SoulEntity;
  
  // Души в мире (NPC, монстры, объекты)
  worldSouls: Map<string, SoulEntity>;
  
  // Время
  worldTime: WorldTimeState;
  
  // Метаданные
  lastSavedAt: Date;
  isDirty: boolean;
}
```

### 7.2 Обновление CharacterState

```typescript
/**
 * Новый CharacterState = SoulEntity для персонажа
 */
interface CharacterStateV2 {
  // === SOUL ===
  id: string;
  name: string;
  soulType: 'character';
  status: SoulStatus;
  
  // === BODY (извлечено) ===
  body: {
    parts: BodyPartState[];
    size: BodySize;
    material: BodyMaterial;
    movement: MovementCapabilities;
  };
  
  // === QI (извлечено) ===
  qi: {
    core: CoreState;
    meridians: MeridianState;
    attributes: QiAttributes;
  };
  
  // === MIND (извлечено) ===
  mind: {
    intelligence: MindStats;
    memory: MemoryState;
    personality: PersonalityTraits;
    skills: Record<string, number>;
  };
  
  // === ATTACHMENTS ===
  techniques: TechniqueState[];
  inventory: InventoryItemState[];
  effects: ActiveEffectState[];
}
```

---

## 8️⃣ МАНИПУЛЯЦИИ С ДУШАМИ

### 8.1 Создание души

```typescript
/**
 * Фабрика душ
 */
class SoulFactory {
  /**
   * Создать камень (объект без управления)
   */
  static createStone(options: StoneOptions): SoulEntity {
    const id = generateId('OBJ');
    
    return {
      soul: {
        id,
        name: options.name || 'Камень',
        soulType: 'object',
        controller: 'none',        // Объекты не управляются
        status: 'dormant',
        hasBody: true,
        hasQi: true,
        hasMind: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'generated',
      },
      body: this.createMineralBody(id, options),
      qi: this.createReservoirQi(id, options),
      mind: null,
      attachments: { techniques: [], inventory: [], effects: [], bonds: [] },
    };
  }
  
  /**
   * Создать персонажа-игрока
   */
  static createPlayerCharacter(options: CharacterOptions): SoulEntity {
    const id = generateCuid();
    
    return {
      soul: {
        id,
        name: options.name,
        soulType: 'character',
        controller: 'player',      // Управляется игроком
        playerId: options.playerId,
        status: 'active',
        hasBody: true,
        hasQi: true,
        hasMind: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'player',
      },
      body: this.createOrganicBody(id, options),
      qi: this.createCoreQi(id, options),
      mind: this.createMind(id, options),
      attachments: { 
        techniques: options.startingTechniques || [], 
        inventory: options.startingInventory || [], 
        effects: [], 
        bonds: [] 
      },
    };
  }
  
  /**
   * Создать NPC-персонажа (управляется ИИ)
   */
  static createNPCCharacter(options: NPCOptions): SoulEntity {
    const id = generateId('NPC');
    
    return {
      soul: {
        id,
        name: options.name,
        soulType: 'character',
        controller: 'ai',          // Управляется ИИ
        aiProfile: options.aiProfile || 'default_npc',
        status: 'active',
        hasBody: true,
        hasQi: true,
        hasMind: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'generated',
      },
      body: this.createOrganicBody(id, options),
      qi: this.createCoreQi(id, options),
      mind: this.createNPCMind(id, options),
      attachments: { 
        techniques: options.techniques || [], 
        inventory: options.inventory || [], 
        effects: [], 
        bonds: [] 
      },
    };
  }
  
  /**
   * Создать существо (монстр или питомец)
   */
  static createCreature(options: CreatureOptions): SoulEntity {
    const prefix = options.controller === 'player' ? 'PC' : 'MON';
    const id = generateId(prefix);
    
    return {
      soul: {
        id,
        name: options.name,
        soulType: 'creature',
        controller: options.controller || 'ai',
        playerId: options.controller === 'player' ? options.playerId : undefined,
        aiProfile: options.controller === 'ai' ? options.aiProfile : undefined,
        status: 'active',
        hasBody: true,
        hasQi: true,
        hasMind: options.hasMind ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'generated',
      },
      body: this.createCreatureBody(id, options),
      qi: this.createCoreQi(id, options),
      mind: options.hasMind ? this.createCreatureMind(id, options) : null,
      attachments: { 
        techniques: options.innateTechniques || [], 
        inventory: [], 
        effects: [], 
        bonds: [] 
      },
    };
  }
  
  /**
   * Создать духа (игрок или ИИ)
   */
  static createSpirit(options: SpiritOptions): SoulEntity {
    const prefix = options.controller === 'player' ? 'SPIRIT' : 'SPIRIT';
    const id = generateId(prefix);
    
    return {
      soul: {
        id,
        name: options.name,
        soulType: 'spirit',
        controller: options.controller || 'ai',
        playerId: options.controller === 'player' ? options.playerId : undefined,
        aiProfile: options.controller === 'ai' ? options.aiProfile : undefined,
        status: 'active',
        hasBody: false,            // Духи бестелесны
        hasQi: true,
        hasMind: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'generated',
      },
      body: null,                  // НЕТ тела
      qi: this.createSpiritQi(id, options),
      mind: this.createSpiritMind(id, options),
      attachments: { 
        techniques: options.techniques || [], 
        inventory: [],             // Духи не носят вещи
        effects: [], 
        bonds: [] 
      },
    };
  }
}
```

### 8.2 Операции над душами

```typescript
/**
 * Сервис операций над душами
 */
class SoulOperations {
  /**
   * Передача Ци между душами
   */
  static transferQi(
    source: SoulEntity, 
    target: SoulEntity, 
    amount: number
  ): TransferResult {
    if (!source.qi || !target.qi) {
      return { success: false, error: 'One of souls has no Qi' };
    }
    
    // Расчёт с учётом проводимости
    const sourceConductivity = source.qi.attributes.conductivity;
    const targetConductivity = target.qi.attributes.conductivity;
    const efficiency = Math.min(sourceConductivity, targetConductivity);
    
    const actualTransfer = Math.floor(amount * efficiency);
    
    // Списываем из источника
    if (source.qi.core.current < amount) {
      return { success: false, error: 'Not enough Qi' };
    }
    source.qi.core.current -= amount;
    
    // Зачисляем в цель
    if (target.qi.core.capacity > 0) {
      target.qi.core.current = Math.min(
        target.qi.core.capacity, 
        target.qi.core.current + actualTransfer
      );
    } else {
      target.qi.reservoir.current = Math.min(
        target.qi.reservoir.capacity,
        target.qi.reservoir.current + actualTransfer
      );
    }
    
    return { success: true, transferred: actualTransfer, lost: amount - actualTransfer };
  }
  
  /**
   * Вселение духа в объект
   */
  static possessObject(
    spirit: SoulEntity, 
    target: SoulEntity
  ): PossessionResult {
    if (spirit.soul.soulType !== 'spirit') {
      return { success: false, error: 'Only spirits can possess' };
    }
    
    if (!target.body) {
      return { success: false, error: 'Target has no body to possess' };
    }
    
    // Связываем души
    spirit.soul.parentId = target.soul.id;
    target.soul.childrenIds = [...(target.soul.childrenIds || []), spirit.soul.id];
    
    // Дух получает контроль над телом
    target.attachments.bonds.push({
      soulId: spirit.soul.id,
      type: 'possession',
      strength: 100,
    });
    
    // Объект получает разум духа
    // (временно заменяет null mind на mind духа)
    
    return { success: true };
  }
  
  /**
   * Разрушение души
   */
  static dissolveSoul(soul: SoulEntity): DissolveResult {
    // Освобождаем компоненты
    if (soul.body) {
      // Тело остаётся как труп/объект
    }
    
    if (soul.qi) {
      // Ци рассеивается в мир
    }
    
    if (soul.mind) {
      // Память теряется
    }
    
    // Удаляем душу
    soul.soul.status = 'dissolved';
    
    return { success: true };
  }
}
```

---

## 9️⃣ СЦЕНАРИИ ИСПОЛЬЗОВАНИЯ

### 9.1 Смена персонажа (игрок вселяется в NPC)

```typescript
// Игрок хочет управлять NPC (например, при смерти основного персонажа)
const player = session.playerSoul;
const npc = world.getNPC('NPC_000042');

const result = ControllerService.possess(player, npc);
if (result.success) {
  // Старый персонаж игрока становится NPC
  // Игрок теперь управляет NPC
  session.playerSoul = npc;
}
```

### 9.2 Игра за существо (трансформация)

```typescript
// Персонаж использует технику трансформации в волка
const player = session.playerSoul;

// Создаём тело волка
const wolfBody = SoulFactory.createCreature({
  name: `${player.soul.name} (форма волка)`,
  species: 'shadow_wolf',
  controller: 'player',
  playerId: player.soul.playerId,
  hasMind: true,
  innateTechniques: player.attachments.techniques,  // Сохраняем техники
});

// Переносим сознание
ControllerService.possess(player, wolfBody);

// Тело человека остаётся без сознания (controller='none')
player.soul.controller = 'none';
player.body!.canAct = false;
```

### 9.3 Смерть и становление духом

```typescript
// При смерти персонажа
function onPlayerDeath(character: SoulEntity) {
  // Создаём духа на основе персонажа
  const spirit = SoulFactory.createSpirit({
    name: `Призрак ${character.soul.name}`,
    controller: 'player',
    playerId: character.soul.playerId,
    
    // Сохраняем часть характеристик
    qiCapacity: character.qi!.core.capacity * 0.5,
    techniques: character.attachments.techniques.filter(t => t.type === 'spirit'),
    
    pastLife: {
      soulId: character.soul.id,
      name: character.soul.name,
      deathDate: new Date(),
    },
  });
  
  // Тело остаётся как труп
  character.soul.controller = 'none';
  character.soul.status = 'dissolving';
  character.body!.isAlive = false;
  
  // Игрок теперь дух
  session.playerSoul = spirit;
}
```

### 9.4 Вселение духа в объект

```typescript
// Игрок-дух вселяется в каменный голем
const spirit = session.playerSoul;  // controller='player', soulType='spirit'
const golem = world.getObject('GOLEM_001');

// Если объект позволяет вселение
if (golem.soul.soulType === 'construct' && !golem.mind) {
  // Дух получает контроль над конструктами
  golem.soul.controller = 'player';
  golem.soul.playerId = spirit.soul.playerId;
  golem.mind = spirit.mind;  // Переносим разум
  
  // Дух теряет свою сущность
  spirit.soul.controller = 'none';
  spirit.soul.status = 'merged';
  
  session.playerSoul = golem;
}
```

### 9.5 NPC получает самосознание

```typescript
// При достижении высокого уровня культивации NPC может "проснуться"
const npc = world.getNPC('NPC_000042');

if (npc.qi!.core.cultivationLevel >= 7 && npc.soul.controller === 'ai') {
  // NPC может получить игрока (если был игроком ранее)
  // или остаться под AI с улучшенным профилем
  
  npc.aiProfile = 'enlightened_master';  // Улучшенный ИИ
  npc.mind!.personality.awakened = true;
}
```

### 9.6 Приручение существа

```typescript
// Игрок приручает дикого волка
const wildWolf = world.getCreature('MON_000100');
const player = session.playerSoul;

if (player.qi!.core.cultivationLevel >= wildWolf.qi!.core.cultivationLevel) {
  // Устанавливаем связь
  wildWolf.attachments.bonds.push({
    soulId: player.soul.id,
    type: 'master_servant',
    strength: 80,
  });
  
  // Существо остаётся под AI, но подчиняется игроку
  wildWolf.aiProfile = 'tamed_creature';
  wildWolf.soul.parentId = player.soul.id;
  
  // Игрок может давать команды
  player.attachments.bonds.push({
    soulId: wildWolf.soul.id,
    type: 'pet',
    strength: 80,
  });
}
```

### 9.7 Зарядка камня Ци

```typescript
// Игрок передаёт Ци камню
const stone = world.getObject('OBJ_000001');
const player = session.playerSoul;

const result = SoulOperations.transferQi(player, stone, 100);
// Результат: transferred: 10, lost: 90 (из-за низкой проводимости камня)
```

### 9.8 Создание голема

```typescript
// 1. Создаём тело из камня
const golemBody = SoulFactory.createStone({ name: 'Каменный голем' });

// 2. Создаём дух-ядро
const coreSpirit = SoulFactory.createSpirit({ 
  name: 'Дух Голема',
  controller: 'ai',
  aiProfile: 'golem_guardian',
  qiCapacity: 500,
});

// 3. Вселяем дух в тело
SoulOperations.possessObject(coreSpirit, golemBody);

// Результат: Голем с телом камня, разумом духа и Ци
```

---

## 📊 СРАВНЕНИЕ С СУЩЕСТВУЮЩЕЙ АРХИТЕКТУРОЙ

| Аспект | Было | Станет |
|--------|------|--------|
| **Character** | Единый монолитный объект | Soul + Body + Qi + Mind + Controller |
| **NPC** | EntitySystem (отдельно) | SoulEntity с controller='ai' |
| **Монстры** | EntitySystem | SoulEntity с soulType='creature', controller='ai' |
| **Игрок** | Только character | Любой тип души с controller='player' |
| **Объекты** | Не было системы | SoulEntity с controller='none' |
| **Духи** | Не было системы | SoulEntity с soulType='spirit' |
| **Ци** | Только у персонажа | Компонент QiComponent у любой души |
| **Тело** | Только у персонажа | Компонент BodyComponent у любой души |
| **Смена персонажа** | Невозможно | ControllerService.possess() |

---

## 🚀 ПЛАН РЕАЛИЗАЦИИ

### Фаза 1: Базовая структура (типы)
1. Создать типы `Soul`, `SoulEntity`, `SoulType`, `ControllerType`
2. Создать интерфейсы компонентов `BodyComponent`, `QiComponent`, `MindComponent`
3. Добавить поле `controller` в `Soul` интерфейс
4. Обновить `CharacterState` до `SoulEntity`

### Фаза 2: Фабрика душ
1. Реализовать `SoulFactory` с методами:
   - `createPlayerCharacter()` - игрок-персонаж
   - `createNPCCharacter()` - NPC под ИИ
   - `createCreature()` - существо (игрок или ИИ)
   - `createSpirit()` - дух (игрок или ИИ)
   - `createObject()` - объект без управления
2. Интегрировать с существующими генераторами

### Фаза 3: Сервис контроля
1. Реализовать `ControllerService`:
   - `possess()` - вселение игрока в душу
   - `release()` - освобождение души
   - `transfer()` - переключение между душами
2. Добавить проверку прав на управление

### Фаза 4: Операции над душами
1. Реализовать `SoulOperations`
2. Добавить передачу Ци между душами
3. Добавить вселение/изгнание духов
4. Добавить создание/уничтожение душ

### Фаза 5: Интеграция с TruthSystem
1. Обновить `TruthSystem` для работы с `SoulEntity`
2. Добавить `playerSoul` вместо `character`
3. Добавить `worldSouls: Map<string, SoulEntity>` для мира
4. Обновить API эндпоинты

### Фаза 6: UI обновления
1. Добавить UI для отображения типа души
2. Добавить индикатор controller (игрок/AI)
3. Добавить интерфейс смены персонажа (для debugging/admin)
4. Обновить панель статуса для разных типов душ

---

## 📚 ПРИЛОЖЕНИЕ A: Сопоставление с существующими системами

### A.1 Система ID (id-system.md)

| Категория | Префикс | Пример | В Soul System |
|-----------|---------|--------|---------------|
| **Техника (удар телом)** | MS | MS_000512 | `attachments.techniques[]` |
| **Техника (оружейная)** | MW | MW_000042 | `attachments.techniques[]` |
| **Техника (дальняя)** | RG | RG_000123 | `attachments.techniques[]` |
| **Техника (защитная)** | DF | DF_000042 | `attachments.techniques[]` |
| **Техника (культивация)** | CU | CU_000010 | `attachments.techniques[]` |
| **Оружие** | WP | WP_000042 | `attachments.inventory[]` |
| **Броня** | AR | AR_000123 | `attachments.inventory[]` |
| **Аксессуар** | AC | AC_000007 | `attachments.inventory[]` |
| **Расходник** | CS | CS_000512 | `attachments.inventory[]` |
| **Камень Ци** | QS | QS_000033 | `attachments.inventory[]` |
| **NPC (сгенерированный)** | NP | NP_000042 | `soul.id` (controller='ai') |
| **NPC Preset** | NPC_PRESET | NPC_PRESET_00001 | `soul.id` (сюжетные) |
| **Temp NPC** | TEMP | TEMP_083452 | `soul.id` (временные) |
| **Монстр** | MON | MON_000100 | `soul.id` (soulType='creature') |
| **Игрок** | cUID2 | cmmaewq7h... | `soul.id` (controller='player') |
| **Формация** | FM | FM_000001 | `attachments.effects[]` |

### A.2 Система видов (body.md)

Существующая структура `SpeciesProperties` трансформируется в:

```typescript
// БЫЛО (body.md)
interface SpeciesProperties {
  id: string;                    // 'human', 'shadow_wolf'
  type: SpeciesType;             // humanoid, beast, spirit, hybrid, aberration
  subtype: string;               // human, predator, elemental
  baseStats: { ... };
  cultivation: { 
    coreCapacityBase: Range;
    coreQualityRange: Range;
    conductivityBase: number;
  };
  movementTypes: MovementType[];
  innateTechniques: InnateTechniqueGrant[];
}

// СТАНОВИТСЯ (Soul System)
interface SpeciesPreset {
  id: string;                    // → SoulEntity.soul.speciesId
  
  // Ссылки на типы компонентов
  bodyTypeId: string;            // → BodyComponent.bodyTypeId
  materialTypeId: string;        // → BodyComponent.materialTypeId
  qiSystemTypeId: string;        // → QiComponent.systemTypeId
  coreTypeId: string;            // → QiComponent.coreTypeId
  mindTypeId: string;            // → MindComponent.mindTypeId
  
  // Параметры для генерации инстанса
  baseStatsRange: StatRange;
  cultivation: CultivationRange;
  movementTypes: MovementType[];
  innateTechniques: InnateTechniqueGrant[];
}
```

### A.3 Система экипировки (equip.md)

```typescript
// Материалы из equip.md → Справочник типов материалов
const MATERIAL_TYPES: Record<string, MaterialTypeConfig> = {
  // === Из equip.md ===
  'leather': {
    id: 'leather',
    name: 'Кожа',
    bodyMaterialType: 'fur',          // → BodyComponent.materialTypeId
    hardness: 3,
    qiConductivity: 0.8,
  },
  'steel': {
    id: 'steel',
    name: 'Сталь',
    bodyMaterialType: 'mineral',
    hardness: 6,
    qiConductivity: 0.5,
  },
  'spirit_iron': {
    id: 'spirit_iron',
    name: 'Духовное железо',
    bodyMaterialType: 'mineral',
    hardness: 7,
    qiConductivity: 1.5,
  },
  'dragon_bone': {
    id: 'dragon_bone',
    name: 'Кость дракона',
    bodyMaterialType: 'mineral',
    hardness: 9,
    qiConductivity: 3.0,
  },
};
```

### A.4 Система Ци (qi_stone.md)

```typescript
// Камни Ци → резервуар для объектов
interface QiStone {
  id: string;                    // QS_XXXXXX
  sizeClass: QiStoneSize;        // dust, fragment, small, medium, large, huge, boulder
  qiType: 'calm' | 'chaotic';
  qiContent: {
    total: number;               // 1024 × объём_см³
    current: number;
  };
}

// В контексте Soul System:
// Камень Ци = SoulEntity с:
// - soulType: 'object'
// - controller: 'none'
// - body: { bodyTypeId: 'qi_crystal', ... }
// - qi: { reservoir: { capacity: total, current: current } }
// - mind: null
```

### A.5 Система NPC (npc-generator-plan.md, random_npc.md)

```typescript
// Species Presets (npc-generator-plan.md) → Справочник видов
const SPECIES_PRESETS: Record<string, SpeciesPreset> = {
  // === Из body.md ===
  'human': {
    id: 'human',
    name: 'Человек',
    type: 'humanoid',
    subtype: 'human',
    
    // Ссылки на типы
    bodyTypeId: 'humanoid_biped',
    materialTypeId: 'flesh',
    qiSystemTypeId: 'human_standard',
    coreTypeId: 'human_standard',
    mindTypeId: 'human_sapient',
    
    // Диапазоны
    baseStatsRange: { strength: [5, 20], ... },
    cultivation: {
      coreCapacityRange: [100, 2000],
      qualityRange: [1, 10],
      conductivityBase: 1.0,
    },
  },
  
  'shadow_wolf': {
    id: 'shadow_wolf',
    name: 'Теневой Волк',
    type: 'beast',
    subtype: 'predator',
    
    bodyTypeId: 'beast_quadruped',
    materialTypeId: 'fur',
    qiSystemTypeId: 'beast_quadruped',
    coreTypeId: 'beast_lesser',
    mindTypeId: 'predator_instinct',
  },
};

// Temp NPC (random_npc.md) → SoulEntity с controller='ai'
interface TempNPC {
  id: string;                    // TEMP_XXXXXX
  speciesId: string;             // → SpeciesPreset.id
  roleId: string;                // → RolePreset.id
  
  // → SoulEntity
  // soul.controller = 'ai'
  // soul.soulType = SpeciesPreset.type
}
```

---

## 📚 ПРИЛОЖЕНИЕ B: Справочники типов

### B.1 Типы тела (Body Types)

```typescript
const BODY_TYPES: Record<string, BodyTypeConfig> = {
  // === Гуманоиды ===
  'humanoid_biped': {
    id: 'humanoid_biped',
    name: 'Гуманоид (двуногий)',
    layout: 'humanoid',              // 2 руки, 2 ноги, голова
    baseHP: 100,
    sizeClass: 'medium',
  },
  
  // === Звери ===
  'beast_quadruped': {
    id: 'beast_quadruped',
    name: 'Зверь (четвероногий)',
    layout: 'quadruped',             // 4 ноги, хвост
    baseHP: 80,
    sizeClass: 'medium',
  },
  'beast_bird': {
    id: 'beast_bird',
    name: 'Птица',
    layout: 'bird',                 // 2 ноги, 2 крыла
    baseHP: 40,
    sizeClass: 'small',
  },
  'beast_serpentine': {
    id: 'beast_serpentine',
    name: 'Змееподобный',
    layout: 'serpentine',            // Тело + хвост
    baseHP: 60,
    sizeClass: 'medium',
  },
  
  // === Духи (бестелесные) ===
  'spirit_formless': {
    id: 'spirit_formless',
    name: 'Бесформенный дух',
    layout: 'single_mass',
    baseHP: 50,
    sizeClass: 'variable',
    incorporeal: true,
  },
  
  // === Объекты ===
  'object_natural': {
    id: 'object_natural',
    name: 'Природный объект',
    layout: 'single_mass',
    baseHP: 500,
    sizeClass: 'variable',
  },
  'object_constructed': {
    id: 'object_constructed',
    name: 'Созданный объект',
    layout: 'single_mass',
    baseHP: 200,
    sizeClass: 'variable',
  },
  
  // === Растения ===
  'plant_tree': {
    id: 'plant_tree',
    name: 'Дерево',
    layout: 'tree',                  // Ствол, ветви, корни
    baseHP: 1000,
    sizeClass: 'large',
  },
};
```

### B.2 Типы систем Ци (Qi System Types)

```typescript
const QI_SYSTEM_TYPES: Record<string, QiSystemTypeConfig> = {
  // === Гуманоиды ===
  'human_standard': {
    id: 'human_standard',
    name: 'Стандартная система человека',
    conductivityBase: 1.0,
    channelCount: 12,               // 12 меридиан
    regenerationRate: 0.1,
  },
  
  // === Звери ===
  'beast_quadruped': {
    id: 'beast_quadruped',
    name: 'Система четвероногого зверя',
    conductivityBase: 0.8,
    channelCount: 8,                // Упрощённая система
    regenerationRate: 0.05,
  },
  'beast_lesser': {
    id: 'beast_lesser',
    name: 'Система малого зверя',
    conductivityBase: 0.5,
    channelCount: 4,
    regenerationRate: 0.02,
  },
  
  // === Духи ===
  'spirit_elemental': {
    id: 'spirit_elemental',
    name: 'Элементальная система',
    conductivityBase: 5.0,
    channelCount: 0,                // Нет меридиан
    regenerationRate: 1.0,          // Быстрая регенерация
    absorptionOnly: true,
  },
  
  // === Объекты ===
  'object_reservoir': {
    id: 'object_reservoir',
    name: 'Пассивный резервуар',
    conductivityBase: 0.1,
    channelCount: 0,
    regenerationRate: 0,
    absorptionOnly: true,
  },
  
  // === Формации ===
  'formation_passive': {
    id: 'formation_passive',
    name: 'Пассивная формация',
    conductivityBase: 5.0,
    channelCount: 0,
    regenerationRate: 0,
    areaEffect: true,
  },
};
```

### B.3 Типы ядер (Core Types)

```typescript
const CORE_TYPES: Record<string, CoreTypeConfig> = {
  // === Гуманоиды ===
  'human_standard': {
    id: 'human_standard',
    name: 'Стандартное человеческое ядро',
    capacityBase: 100,
    qualityRange: [1, 10],
    canCultivate: true,
    maxLevel: 9,
  },
  
  // === Звери ===
  'beast_lesser': {
    id: 'beast_lesser',
    name: 'Малое ядро зверя',
    capacityBase: 50,
    qualityRange: [1, 3],
    canCultivate: false,
  },
  'beast_greater': {
    id: 'beast_greater',
    name: 'Большое ядро зверя',
    capacityBase: 200,
    qualityRange: [3, 6],
    canCultivate: true,
    maxLevel: 7,
  },
  
  // === Духи ===
  'spirit_core': {
    id: 'spirit_core',
    name: 'Духовное ядро',
    capacityBase: 500,
    qualityRange: [3, 8],
    canCultivate: true,
    maxLevel: 7,
  },
  
  // === Искусственные ===
  'artificial_lesser': {
    id: 'artificial_lesser',
    name: 'Искусственное ядро (малое)',
    capacityBase: 100,
    qualityRange: [1, 3],
    canCultivate: false,
    fuelBased: true,
  },
};
```

### B.4 Типы материалов (Material Types)

```typescript
const MATERIAL_TYPES: Record<string, MaterialTypeConfig> = {
  // === Органические (из body.md) ===
  'flesh': {
    id: 'flesh',
    name: 'Плоть',
    hardness: 3,
    flexibility: 6,
    qiConductivity: 1.0,
    regeneration: 1,
  },
  'fur': {
    id: 'fur',
    name: 'Мех',
    hardness: 2,
    flexibility: 7,
    qiConductivity: 1.2,
    regeneration: 0.8,
  },
  'scaled': {
    id: 'scaled',
    name: 'Чешуя',
    hardness: 6,
    flexibility: 3,
    qiConductivity: 1.5,
    regeneration: 0.5,
  },
  
  // === Минеральные ===
  'stone': {
    id: 'stone',
    name: 'Камень',
    hardness: 7,
    flexibility: 1,
    qiConductivity: 0.1,
    regeneration: 0,
  },
  'metal': {
    id: 'metal',
    name: 'Металл',
    hardness: 8,
    flexibility: 2,
    qiConductivity: 0.5,
    regeneration: 0,
  },
  
  // === Особые (из equip.md) ===
  'spirit_steel': {
    id: 'spirit_steel',
    name: 'Духовная сталь',
    hardness: 8,
    flexibility: 3,
    qiConductivity: 2.5,
    regeneration: 0.1,
  },
  'dragon_bone': {
    id: 'dragon_bone',
    name: 'Кость дракона',
    hardness: 10,
    flexibility: 2,
    qiConductivity: 3.0,
    regeneration: 0.5,
  },
  
  // === Эфирные ===
  'ethereal': {
    id: 'ethereal',
    name: 'Эфир',
    hardness: 1,
    flexibility: 10,
    qiConductivity: 5.0,
    regeneration: 2,
    incorporeal: true,
  },
};
```

### B.5 Типы разума (Mind Types)

```typescript
const MIND_TYPES: Record<string, MindTypeConfig> = {
  // === Разумные ===
  'human_sapient': {
    id: 'human_sapient',
    name: 'Человеческий разум',
    baseIQ: [70, 130],
    capabilities: ['speech', 'tool_use', 'cultivation', 'social'],
  },
  
  // === Инстинктивные ===
  'predator_instinct': {
    id: 'predator_instinct',
    name: 'Инстинкт хищника',
    baseIQ: [10, 30],
    capabilities: ['hunting', 'survival', 'pack'],
    instincts: { hunting: 80, survival: 90, pack: 70 },
  },
  
  // === Духовные ===
  'spirit_ancient': {
    id: 'spirit_ancient',
    name: 'Древний дух',
    baseIQ: [100, 200],
    capabilities: ['speech', 'cultivation', 'possession'],
  },
  
  // === Программы ===
  'construct_program': {
    id: 'construct_program',
    name: 'Программа конструкта',
    baseIQ: [5, 20],
    capabilities: ['follow_orders', 'guard'],
    directives: [],
  },
  
  // === Отсутствует ===
  'none': {
    id: 'none',
    name: 'Нет разума',
    baseIQ: 0,
    capabilities: [],
  },
};
```

---

## 📚 ПРИЛОЖЕНИЕ C: Примеры полного цикла

### C.1 Создание монстра

```typescript
// 1. Получаем пресет вида
const speciesPreset = SPECIES_PRESETS['shadow_wolf'];
// {
//   id: 'shadow_wolf',
//   bodyTypeId: 'beast_quadruped',
//   materialTypeId: 'fur',
//   qiSystemTypeId: 'beast_quadruped',
//   coreTypeId: 'beast_lesser',
//   mindTypeId: 'predator_instinct',
//   baseStatsRange: { strength: [15, 40], ... },
// }

// 2. Получаем типы компонентов
const bodyType = BODY_TYPES[speciesPreset.bodyTypeId];
const qiSystemType = QI_SYSTEM_TYPES[speciesPreset.qiSystemTypeId];
const coreType = CORE_TYPES[speciesPreset.coreTypeId];
const mindType = MIND_TYPES[speciesPreset.mindTypeId];

// 3. Генерируем инстанс
const monster: SoulEntity = {
  soul: {
    id: generateId('MON'),           // MON_000100
    name: 'Теневой Волк',
    soulType: 'creature',
    controller: 'ai',
    aiProfile: 'aggressive_predator',
    speciesId: speciesPreset.id,
  },
  
  body: {
    bodyTypeId: speciesPreset.bodyTypeId,
    materialTypeId: speciesPreset.materialTypeId,
    
    // Инстанс-данные
    currentHP: bodyType.baseHP,
    sizeClass: bodyType.sizeClass,
    parts: generateParts(bodyType.layout),  // Генерация частей
    mutations: randomMutations(rng),
  },
  
  qi: {
    systemTypeId: speciesPreset.qiSystemTypeId,
    coreTypeId: speciesPreset.coreTypeId,
    
    // Инстанс-данные из типов
    currentQi: 0,
    accumulatedQi: 0,
    capacity: randomInRange(coreType.capacityBase),
    conductivity: qiSystemType.conductivityBase,
  },
  
  mind: {
    mindTypeId: speciesPreset.mindTypeId,
    
    // Инстанс-данные
    instincts: mindType.instincts,
    learnedBehaviors: [],
  },
  
  attachments: {
    techniques: generateInnateTechniques(speciesPreset.innateTechniques),
    inventory: [],
    effects: [],
    bonds: [],
  },
};
```

### C.2 Создание камня Ци

```typescript
// 1. Определяем размер и тип
const sizeClass: QiStoneSize = 'medium';
const qiType: 'calm' | 'chaotic' = 'calm';

// 2. Генерируем
const qiStone: SoulEntity = {
  soul: {
    id: generateId('QS'),             // QS_000042
    name: 'Средний камень Ци',
    soulType: 'object',
    controller: 'none',
    speciesId: 'qi_crystal',
  },
  
  body: {
    bodyTypeId: 'object_natural',
    materialTypeId: 'spirit_crystal',
    
    // Инстанс-данные из qi_stone.md
    currentHP: 50,
    sizeClass: sizeClass,
    volume: randomInRange(QI_STONE_SIZES[sizeClass].volumeRange),
  },
  
  qi: {
    systemTypeId: 'object_reservoir',
    coreTypeId: null,
    
    // Инстанс-данные
    currentQi: volume * 1024,         // 1024 ед/см³
    accumulatedQi: 0,
    capacity: volume * 1024,
    qiAffinity: [qiType],
  },
  
  mind: null,
  
  attachments: {
    techniques: [],
    inventory: [],
    effects: [],
    bonds: [],
  },
};
```

---

## 📚 ПРИЛОЖЕНИЕ D: Строения, мебель и интерьер

### D.1 Обзор системы строений

Строения и мебель — особый класс объектов, которые:
- Имеют **сложную структуру тела** (комнаты, этажи, части)
- Могут содержать **другие души** (жильцы, содержимое)
- Часто имеют **формации Ци** (защитные, накопительные)
- Обычно **неподвижны** (фиксированная позиция)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ИЕРАРХИЯ СТРОЕНИЙ И МЕБЕЛИ                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     STRUCTURE (СТРОЕНИЕ)                         │   │
│   │                                                                  │   │
│   │  • Дом, Храм, Башня, Павильон                                    │   │
│   │  • Может иметь несколько этажей и комнат                         │   │
│   │  • Может содержать мебель и другие объекты                       │   │
│   │  • Может иметь формации Ци                                       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     FURNITURE (МЕБЕЛЬ)                            │   │
│   │                                                                  │   │
│   │  • Кровать, Шкаф, Стол, Стул                                     │   │
│   │  • Имеет слоты для содержимого                                   │   │
│   │  • Может иметь простые эффекты                                   │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     DECORATION (ДЕКОР)                            │   │
│   │                                                                  │   │
│   │  • Картина, Статуя, Ваза, Ковёр                                  │   │
│   │  • Минимальная функциональность                                  │   │
│   │  • Эстетическая ценность                                         │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### D.2 Расширение SoulType

```typescript
/**
 * Расширенные типы душ
 */
type SoulType = 
  | 'character'    // Персонаж (человек, гуманоид)
  | 'creature'     // Существо (зверь, монстр)
  | 'spirit'       // Дух (призрак, элементаль)
  | 'plant'        // Растение
  | 'object'       // Объект (камень, предмет)
  | 'construct'    // Конструкт (голем, механизмы)
  | 'structure'    // 🆕 Строение (здание, сооружение)
  | 'furniture'    // 🆕 Мебель (кровать, шкаф)
  | 'decoration';  // 🆕 Декор (картина, статуя)
```

### D.3 Интерфейс строения

```typescript
/**
 * Строение — сложная неподвижная структура
 */
interface StructureSoul extends Soul {
  soulType: 'structure';
  
  // === ТИП СТРОЕНИЯ ===
  structureType: StructureType;
  
  // === РАЗМЕРЫ ===
  dimensions: {
    width: number;          // Ширина (м)
    length: number;         // Длина (м)
    height: number;         // Высота (м)
    floors: number;         // Количество этажей
    totalArea: number;      // Общая площадь (м²)
  };
  
  // === ВЛАДЕНИЕ ===
  ownership: {
    owner?: string;         // ID души-владельца
    clan?: string;          // ID клана/секты
    isPublic: boolean;      // Общественное?
    isRentable: boolean;    // Можно арендовать?
  };
  
  // === СОДЕРЖИМОЕ ===
  interior: {
    rooms: Room[];          // Комнаты
    furniture: string[];    // ID мебели внутри
    npcs: string[];         // NPC внутри (постоянные)
    spawnPoints: SpawnPoint[]; // Точки появления
  };
  
  // === ВХОДЫ/ВЫХОДЫ ===
  entrances: Entrance[];
  
  // === ФОРМАЦИИ ===
  formations: FormationRef[];
}

/**
 * Тип строения
 */
type StructureType = 
  // === ЖИЛЫЕ ===
  | 'house_small'       // Малый дом
  | 'house_medium'      // Средний дом
  | 'house_large'       // Большой дом
  | 'mansion'           // Особняк
  | 'estate'            // Поместье
  
  // === КУЛЬТОВАЦИЯ ===
  | 'shrine'            // Святилище
  | 'temple'            // Храм
  | 'pagoda'            // Пагода
  | 'pavilion'          // Павильон
  | 'meditation_hall'   // Зал медитации
  | 'cultivation_cave'  // Пещера культивации
  
  // === ОБОРОНИТЕЛЬНЫЕ ===
  | 'wall'              // Стена
  | 'gate'              // Ворота
  | 'watchtower'        // Сторожевая башня
  | 'fortress'          // Крепость
  
  // === ХОЗЯЙСТВЕННЫЕ ===
  | 'shop'              // Лавка
  | 'warehouse'         // Склад
  | 'stable'            // Конюшня
  | 'forge'             // Кузница
  | 'alchemist_lab'     // Алхимическая лаборатория
  
  // === СПЕЦИАЛЬНЫЕ ===
  | 'teleport_gate'     // Телепортационные врата
  | 'array_anchor'      // Якорь массива
  | 'spirit_tower';     // Духовная башня

/**
 * Комната в строении
 */
interface Room {
  id: string;
  name: string;
  type: RoomType;
  
  // Размеры
  area: number;              // Площадь (м²)
  height: number;            // Высота потолка (м)
  
  // Позиция в строении
  floor: number;             // Этаж (0 = подвал, 1 = первый)
  position: { x: number; y: number }; // Координаты в плане
  
  // Функции
  functions: RoomFunction[];
  
  // Содержимое
  furnitureSlots: FurnitureSlot[];
  occupants: string[];       // ID душ внутри
  
  // Свойства
  properties: {
    isPrivate: boolean;
    hasLock: boolean;
    lockLevel?: number;
    qiDensity: number;       // Плотность Ци в комнате
    ambiance: string;        // Атмосфера
  };
}

type RoomType = 
  | 'bedroom'          // Спальня
  | 'living_room'      // Гостиная
  | 'kitchen'          // Кухня
  | 'storage'          // Кладовая
  | 'study'            // Кабинет
  | 'meditation'       // Медитационная
  | 'training'         // Тренировочный зал
  | 'altar'            // Алтарь
  | 'throne'           // Тронный зал
  | 'dungeon'          // Темница
  | 'treasury'         // Сокровищница
  | 'library'          // Библиотека
  | 'bathroom'         // Баня/ванная
  | 'courtyard'        // Двор
  | 'garden'           // Сад
  | 'corridor'         // Коридор
  | 'entrance';        // Вход

type RoomFunction = 
  | 'rest'             // Отдых
  | 'sleep'            // Сон
  | 'cultivation'      // Культивация
  | 'training'         // Тренировка
  | 'storage'          // Хранение
  | 'crafting'         // Ремесло
  | 'social'           // Общение
  | 'worship'          // Поклонение
  | 'defense'          // Защита
  | 'confinement';     // Заключение

/**
 * Вход в строение
 */
interface Entrance {
  id: string;
  type: 'door' | 'gate' | 'window' | 'secret';
  
  position: {
    floor: number;
    x: number;
    y: number;
    direction: 'north' | 'south' | 'east' | 'west';
  };
  
  // Свойства
  isLocked: boolean;
  lockLevel: number;
  requiresKey: boolean;
  keyId?: string;
  
  // Куда ведёт
  connectsTo?: {
    structureId: string;      // ID другого строения
    entranceId: string;       // ID входа
  };
  
  // Ограничения
  restrictions: {
    minLevel?: number;
    requiredItem?: string;
    requiredStatus?: string;
  };
}

/**
 * Точка появления
 */
interface SpawnPoint {
  id: string;
  roomId: string;
  position: { x: number; y: number };
  
  // Что появляется
  spawnType: 'player' | 'npc' | 'item' | 'creature';
  spawnId?: string;           // ID того, что появляется
  
  // Условия
  conditions: {
    time?: 'day' | 'night' | 'any';
    event?: string;
    probability?: number;
  };
}
```

### D.4 Тело строения (StructureBody)

```typescript
/**
 * Тело строения — физическая структура
 */
interface StructureBody extends BodyComponent {
  // === ОСНОВА ===
  foundation: {
    type: 'ground' | 'pillars' | 'floating' | 'underground';
    depth: number;            // Глубина фундамента (м)
    material: string;
    integrity: number;        // Целостность (%)
  };
  
  // === ЧАСТИ СТРОЕНИЯ ===
  structureParts: StructurePart[];
  
  // === МАТЕРИАЛЫ ===
  primaryMaterial: BuildingMaterial;
  secondaryMaterial?: BuildingMaterial;
  
  // === СОСТОЯНИЕ ===
  condition: {
    overallIntegrity: number; // Общая целостность (%)
    maintenanceLevel: number; // Уровень обслуживания
    age: number;              // Возраст (годы)
    wearRate: number;         // Износ за год
  };
  
  // === ЗАЩИТА ===
  defense: {
    durability: number;       // Прочность
    armor: number;            // Броня
    resistances: string[];    // Сопротивления
    vulnerabilities: string[]; // Уязвимости
  };
}

/**
 * Часть строения
 */
interface StructurePart {
  id: string;
  name: string;
  type: StructurePartType;
  
  // Позиция
  floor: number;
  position: { x: number; y: number };
  
  // Размеры
  dimensions: {
    width: number;
    height: number;
    length?: number;
  };
  
  // Прочность
  durability: {
    maxHP: number;
    currentHP: number;
    armor: number;
  };
  
  // Состояние
  status: 'intact' | 'damaged' | 'broken' | 'destroyed';
  
  // Функции
  functions: string[];
}

type StructurePartType = 
  | 'wall'             // Стена
  | 'floor'            // Пол
  | 'ceiling'          // Потолок
  | 'roof'             // Крыша
  | 'pillar'           // Колонна
  | 'door_frame'       // Дверной проём
  | 'window_frame'     // Оконный проём
  | 'stairs'           // Лестница
  | 'balcony'          // Балкон
  | 'chimney'          // Труба
  | 'decoration';      // Декоративный элемент

/**
 * Строительный материал
 */
interface BuildingMaterial {
  id: string;
  name: string;
  
  // Свойства
  properties: {
    hardness: number;         // Твёрдость (1-10)
    durability: number;       // Долговечность (годы)
    qiConductivity: number;   // Проводимость Ци
    insulation: number;       // Теплоизоляция
    flammability: number;     // Воспламеняемость
  };
  
  // Эстетика
  aesthetics: {
    style: string;            // Стиль
    color: string;            // Основной цвет
    quality: number;          // Качество отделки (1-10)
  };
}

// Справочник материалов
const BUILDING_MATERIALS: Record<string, BuildingMaterial> = {
  // === ДЕРЕВО ===
  'pine_wood': {
    id: 'pine_wood',
    name: 'Сосна',
    properties: { hardness: 3, durability: 50, qiConductivity: 0.8, insulation: 6, flammability: 7 },
    aesthetics: { style: 'rustic', color: 'light_brown', quality: 3 },
  },
  'spirit_wood': {
    id: 'spirit_wood',
    name: 'Духовное дерево',
    properties: { hardness: 5, durability: 500, qiConductivity: 3.0, insulation: 8, flammability: 2 },
    aesthetics: { style: 'mystical', color: 'glowing_green', quality: 8 },
  },
  
  // === КАМЕНЬ ===
  'granite': {
    id: 'granite',
    name: 'Гранит',
    properties: { hardness: 8, durability: 1000, qiConductivity: 0.2, insulation: 3, flammability: 0 },
    aesthetics: { style: 'solid', color: 'gray', quality: 6 },
  },
  'spirit_jade': {
    id: 'spirit_jade',
    name: 'Духовный нефрит',
    properties: { hardness: 9, durability: 5000, qiConductivity: 5.0, insulation: 5, flammability: 0 },
    aesthetics: { style: 'divine', color: 'translucent_green', quality: 10 },
  },
  
  // === МЕТАЛЛ ===
  'iron': {
    id: 'iron',
    name: 'Железо',
    properties: { hardness: 7, durability: 200, qiConductivity: 0.5, insulation: 1, flammability: 0 },
    aesthetics: { style: 'industrial', color: 'dark_gray', quality: 5 },
  },
  'celestial_steel': {
    id: 'celestial_steel',
    name: 'Небесная сталь',
    properties: { hardness: 10, durability: 10000, qiConductivity: 4.0, insulation: 2, flammability: 0 },
    aesthetics: { style: 'celestial', color: 'silver_glow', quality: 10 },
  },
};
```

### D.5 Ци строения (StructureQi)

```typescript
/**
 * Ци строения — формации и накопители
 */
interface StructureQi extends QiComponent {
  // === ФОРМАЦИИ ===
  formations: FormationSlot[];
  
  // === ПОТОКИ ЦИ ===
  qiFlow: {
    intake: number;           // Входящий поток (Ци/тик)
    output: number;           // Исходящий поток
    circulation: number;      // Циркуляция внутри
    density: number;          // Плотность Ци в строении
  };
  
  // === ЛЕЙ-ЛИНИИ ===
  leyLines?: {
    connected: boolean;       // Подключено к лей-линиям?
    strength: number;         // Сила связи
    alignment: string;        // Выравнивание
  };
  
  // === АТМОСФЕРА ===
  atmosphere: {
    qiQuality: number;        // Качество Ци (1-10)
    element?: string;         // Преобладающий элемент
    effects: AtmosphereEffect[];
  };
}

/**
 * Слот формации
 */
interface FormationSlot {
  id: string;
  name: string;
  
  // Тип формации
  type: FormationType;
  
  // Размеры
  coverage: {
    type: 'room' | 'floor' | 'building' | 'area';
    targetId?: string;        // ID комнаты/этажа
    radius?: number;          // Радиус (м)
  };
  
  // Состояние
  status: 'inactive' | 'active' | 'depleted' | 'damaged';
  
  // Параметры
  parameters: {
    power: number;            // Сила формации
    efficiency: number;       // Эффективность
    qiCost: number;           // Расход Ци/тик
    duration?: number;        // Длительность (если временная)
  };
  
  // Ядро формации
  core: {
    itemId?: string;          // ID предмета-ядра
    soulId?: string;          // ID души-хранителя
  };
}

type FormationType = 
  // === ЗАЩИТНЫЕ ===
  | 'barrier'          // Барьер
  | 'shield'           // Щит
  | 'alarm'            // Сигнализация
  | 'repulsion'        // Отталкивание
  
  // === НАКОПИТЕЛЬНЫЕ ===
  | 'accumulator'      // Накопитель Ци
  | 'condenser'        // Конденсатор
  | 'purifier'         // Очиститель
  
  // === УСИЛИВАЮЩИЕ ===
  | 'cultivation_boost' // Ускорение культивации
  | 'healing'          // Исцеление
  | 'mental_clarity'   // Ясность разума
  
  // === СПЕЦИАЛЬНЫЕ ===
  | 'teleport'         // Телепортация
  | 'summoning'        // Призыв
  | 'binding'          // Связывание
  | 'concealment'      // Сокрытие
  | 'elemental';       // Элементальная

/**
 * Эффект атмосферы
 */
interface AtmosphereEffect {
  type: string;
  power: number;
  affectedStats: string[];
  description: string;
}
```

### D.6 Мебель (Furniture)

```typescript
/**
 * Мебель — функциональные объекты интерьера
 */
interface FurnitureSoul extends Soul {
  soulType: 'furniture';
  
  // === ТИП МЕБЕЛИ ===
  furnitureType: FurnitureType;
  
  // === РАЗМЕЩЕНИЕ ===
  placement: {
    structureId?: string;     // В каком строении
    roomId?: string;          // В какой комнате
    position: { x: number; y: number };
    rotation: number;         // Поворот (градусы)
  };
  
  // === ФУНКЦИИ ===
  functions: FurnitureFunction[];
  
  // === СЛОТЫ ===
  slots: FurnitureSlot[];
  
  // === СВОЙСТВА ===
  properties: {
    quality: number;          // Качество (1-10)
    comfort?: number;         // Комфорт
    durability: number;       // Прочность
    aesthetic: number;        // Эстетика
  };
}

type FurnitureType = 
  // === СПАЛЬНЯ ===
  | 'bed'              // Кровать
  | 'mattress'         // Матрас
  
  // === ХРАНЕНИЕ ===
  | 'cabinet'          // Шкаф
  | 'chest'            // Сундук
  | 'drawer'           // Комод
  | 'bookshelf'        // Книжная полка
  | 'wardrobe'         // Гардероб
  
  // === РАБОТА ===
  | 'desk'             // Письменный стол
  | 'table'            // Стол
  | 'workbench'        // Верстак
  
  // === СИДЕНИЕ ===
  | 'chair'            // Стул
  | 'bench'            // Скамья
  | 'throne'           // Трон
  
  // === КУЛЬТИВАЦИЯ ===
  | 'altar'            // Алтарь
  | 'meditation_mat'   // Медитационный коврик
  | 'formation_core'   // Ядро формации
  
  // === ОСОБЫЕ ===
  | 'fountain'         // Фонтан
  | 'incense_burner'   // Курильница
  | 'spirit_lamp';     // Духовная лампа

type FurnitureFunction = 
  | 'sleep'            // Сон
  | 'rest'             // Отдых
  | 'storage'          // Хранение
  | 'display'          // Демонстрация
  | 'work'             // Работа
  | 'cultivation'      // Культивация
  | 'ritual'           // Ритуал
  | 'decoration';      // Декор

/**
 * Слот мебели (для содержимого)
 */
interface FurnitureSlot {
  id: string;
  type: 'item' | 'equipment' | 'qi_stone' | 'book' | 'any';
  
  // Ограничения
  limits: {
    maxItems: number;
    maxWeight?: number;
    allowedTypes?: string[];
    restrictedTypes?: string[];
  };
  
  // Содержимое
  items: string[];           // ID предметов
  locked: boolean;
}

/**
 * Пример: Кровать
 */
const bedEntity: SoulEntity = {
  soul: {
    id: 'FURN_000001',
    name: 'Деревянная кровать',
    soulType: 'furniture',
    controller: 'none',
    status: 'active',
    hasBody: true,
    hasQi: false,
    hasMind: false,
  },
  
  body: {
    soulId: 'FURN_000001',
    bodyType: 'furniture_bed',
    size: { sizeClass: 'medium', height: 50, width: 200, length: 180 },
    parts: [
      { id: 'frame', type: 'frame', durability: { maxHP: 100, currentHP: 100 } },
      { id: 'mattress', type: 'soft', durability: { maxHP: 50, currentHP: 50 } },
      { id: 'pillow', type: 'soft', durability: { maxHP: 20, currentHP: 20 } },
    ],
    material: { type: 'wood', hardness: 4, flexibility: 3, qiConductivity: 0.5 },
    isAlive: false,
    canAct: false,
  },
  
  qi: null,
  mind: null,
  
  attachments: {
    techniques: [],
    inventory: [],
    effects: [
      { 
        id: 'rest_bonus',
        type: 'passive',
        name: 'Бонус отдыха',
        description: 'Восстановление HP и Ци +20% при сне',
        power: 20,
      },
    ],
    bonds: [],
  },
  
  // furniture-specific
  furnitureType: 'bed',
  placement: {
    structureId: 'STR_000001',
    roomId: 'bedroom_1',
    position: { x: 3, y: 2 },
    rotation: 0,
  },
  functions: ['sleep', 'rest'],
  slots: [],  // Кровать не имеет слотов хранения
  properties: {
    quality: 3,
    comfort: 5,
    durability: 100,
    aesthetic: 4,
  },
};

/**
 * Пример: Алтарь культивации
 */
const altarEntity: SoulEntity = {
  soul: {
    id: 'FURN_000042',
    name: 'Алтарь Духовного Нефрита',
    soulType: 'furniture',
    controller: 'none',
    status: 'active',
    hasBody: true,
    hasQi: true,
    hasMind: false,
  },
  
  body: {
    soulId: 'FURN_000042',
    bodyType: 'furniture_altar',
    size: { sizeClass: 'medium', height: 100, width: 150, length: 80 },
    parts: [
      { id: 'base', type: 'base', durability: { maxHP: 500, currentHP: 500 } },
      { id: 'surface', type: 'surface', durability: { maxHP: 200, currentHP: 200 } },
      { id: 'runes', type: 'inscription', durability: { maxHP: 100, currentHP: 100 } },
    ],
    material: { type: 'spirit_jade', hardness: 9, flexibility: 1, qiConductivity: 5.0 },
    isAlive: false,
    canAct: false,
  },
  
  qi: {
    soulId: 'FURN_000042',
    core: { capacity: 0, quality: 0, current: 0 },
    reservoir: { capacity: 1000, current: 800, regeneration: 0 },
    attributes: { conductivity: 5.0, affinity: ['neutral', 'spirit'], purity: 80 },
  },
  
  mind: null,
  
  attachments: {
    techniques: [],
    inventory: [],
    effects: [
      { 
        id: 'cultivation_boost',
        type: 'passive',
        name: 'Ускорение культивации',
        description: 'Скорость культивации +50% в радиусе 5м',
        power: 50,
        radius: 5,
      },
      {
        id: 'qi_condensation',
        type: 'passive',
        name: 'Конденсация Ци',
        description: 'Накапливает Ци из окружения',
        power: 10,  // Ци/тик
      },
    ],
    bonds: [],
  },
  
  furnitureType: 'altar',
  placement: {
    structureId: 'STR_000010',  // Храм
    roomId: 'altar_room',
    position: { x: 0, y: 0 },  // Центр комнаты
    rotation: 0,
  },
  functions: ['cultivation', 'ritual'],
  slots: [
    {
      id: 'offering_slot',
      type: 'any',
      limits: { maxItems: 3 },
      items: ['INCENSE_001'],
      locked: false,
    },
    {
      id: 'formation_core',
      type: 'qi_stone',
      limits: { maxItems: 1 },
      items: ['QS_000100'],
      locked: true,
    },
  ],
  properties: {
    quality: 8,
    durability: 500,
    aesthetic: 9,
  },
};
```

### D.7 Декор (Decoration)

```typescript
/**
 * Декор — эстетические объекты
 */
interface DecorationSoul extends Soul {
  soulType: 'decoration';
  
  // === ТИП ДЕКОРА ===
  decorationType: DecorationType;
  
  // === РАЗМЕЩЕНИЕ ===
  placement: {
    structureId?: string;
    roomId?: string;
    position: { x: number; y: number; z?: number };  // z = высота на стене
    mountType: 'floor' | 'wall' | 'ceiling' | 'freestanding';
  };
  
  // === ЭСТЕТИКА ===
  aesthetics: {
    style: string;
    era?: string;
    artist?: string;
    value: number;            // Денежная ценность
    culturalValue: number;    // Культурная ценность
  };
  
  // === ЭФФЕКТЫ ===
  effects?: DecorationEffect[];
}

type DecorationType = 
  // === СТАТУИ ===
  | 'statue_small'     // Малая статуя
  | 'statue_large'     // Большая статуя
  | 'bust'             // Бюст
  
  // === КАРТИНЫ ===
  | 'painting'         // Картина
  | 'scroll'           // Свиток
  | 'tapestry'         // Гобелен
  
  // === ВАЗЫ ===
  | 'vase'             // Ваза
  | 'urn'              // Урна
  
  // === СВЕТ ===
  | 'lantern'          // Фонарь
  | 'candlestick'      // Подсвечник
  
  // === ТЕКСТИЛЬ ===
  | 'rug'              // Ковёр
  | 'curtain'          // Занавес
  | 'banner';          // Знамя

/**
 * Пример: Статуя основателя секты
 */
const statueEntity: SoulEntity = {
  soul: {
    id: 'DEC_000001',
    name: 'Статуя Основателя',
    soulType: 'decoration',
    controller: 'none',
    status: 'active',
    hasBody: true,
    hasQi: true,          // Может содержать остаточную Ци
    hasMind: false,
  },
  
  body: {
    soulId: 'DEC_000001',
    bodyType: 'statue_large',
    size: { sizeClass: 'large', height: 300, width: 100, length: 100 },
    parts: [
      { id: 'pedestal', type: 'base', durability: { maxHP: 200, currentHP: 200 } },
      { id: 'figure', type: 'statue', durability: { maxHP: 500, currentHP: 500 } },
    ],
    material: { type: 'spirit_jade', hardness: 9, flexibility: 1, qiConductivity: 4.0 },
    isAlive: false,
    canAct: false,
  },
  
  qi: {
    soulId: 'DEC_000001',
    core: { capacity: 0, quality: 0, current: 0 },
    reservoir: { capacity: 500, current: 50, regeneration: 0 },  // Остаточная Ци
    attributes: { conductivity: 4.0, affinity: ['spirit'], purity: 60 },
  },
  
  mind: null,
  
  attachments: {
    techniques: [],
    inventory: [],
    effects: [
      {
        id: 'inspiration_aura',
        type: 'passive',
        name: 'Аура вдохновения',
        description: 'Увеличивает скорость обучения +10%',
        power: 10,
        radius: 10,
      },
    ],
    bonds: [],
  },
  
  decorationType: 'statue_large',
  placement: {
    structureId: 'STR_000010',
    roomId: 'entrance_hall',
    position: { x: 0, y: -5 },
    mountType: 'floor',
  },
  aesthetics: {
    style: 'ancient',
    era: 'founding_era',
    artist: 'Мастер Камнерез',
    value: 5000,
    culturalValue: 100,
  },
  effects: [
    { type: 'inspiration', power: 10, description: 'Вдохновение учеников' },
  ],
};
```

### D.8 Особые случаи

#### D.8.1 Живое здание (Animated Structure)

```typescript
/**
 * Живое здание — строение с разумом
 */
const livingTemple: SoulEntity = {
  soul: {
    id: 'STR_LIVING_001',
    name: 'Храм Пробуждённого Духа',
    soulType: 'structure',
    controller: 'ai',           // ИИ управляет зданием!
    aiProfile: 'ancient_guardian',
    status: 'active',
    hasBody: true,
    hasQi: true,
    hasMind: true,              // Имеет разум!
  },
  
  body: {
    // ... структура храма
    isAlive: true,              // Живое!
    canAct: true,               // Может действовать
  },
  
  qi: {
    // ... мощная система Ци
  },
  
  mind: {
    soulId: 'STR_LIVING_001',
    intelligence: {
      base: 150,
      reasoning: 120,
      memory: 200,
      learning: 50,
      creativity: 80,
      focus: 100,
    },
    memory: { /* тысячелетия истории */ },
    personality: {
      traits: ['ancient', 'wise', 'protective', 'mysterious'],
      goals: ['protect_disciples', 'preserve_knowledge'],
    },
    status: { sanity: 90, clarity: 95, mentalFatigue: 0 },
  },
  
  attachments: {
    techniques: [
      { id: 'barrier_activate', name: 'Активация барьера', type: 'defense' },
      { id: 'room_rearrange', name: 'Перестройка комнат', type: 'utility' },
      { id: 'expel_intruder', name: 'Изгнание захватчиков', type: 'offense' },
    ],
    // ...
  },
  
  // Живое здание может:
  // - Перестраивать свой интерьер
  // - Активировать защитные формации
  // - Общаться с жильцами
  // - Запоминать гостей
  // - Защищать обитателей
};
```

#### D.8.2 Оружейная стойка (Weapon Rack)

```typescript
/**
 * Оружейная стойка — мебель со слотами
 */
const weaponRack: SoulEntity = {
  soul: {
    id: 'FURN_000100',
    name: 'Оружейная стойка',
    soulType: 'furniture',
    controller: 'none',
    status: 'active',
    hasBody: true,
    hasQi: false,
    hasMind: false,
  },
  
  body: {
    soulId: 'FURN_000100',
    bodyType: 'furniture_rack',
    size: { sizeClass: 'medium', height: 180, width: 100, length: 30 },
    parts: [
      { id: 'frame', type: 'frame', durability: { maxHP: 80, currentHP: 80 } },
      { id: 'hooks', type: 'holder', quantity: 6, durability: { maxHP: 30, currentHP: 30 } },
    ],
    material: { type: 'iron', hardness: 7, flexibility: 2, qiConductivity: 0.3 },
    isAlive: false,
    canAct: false,
  },
  
  qi: null,
  mind: null,
  
  attachments: {
    techniques: [],
    inventory: [],
    effects: [
      {
        id: 'weapon_preservation',
        type: 'passive',
        name: 'Сохранение оружия',
        description: 'Оружие не ржавеет и не тупится',
      },
    ],
    bonds: [],
  },
  
  furnitureType: 'rack',
  placement: {
    structureId: 'STR_000050',
    roomId: 'armory',
    position: { x: 5, y: 0 },
    rotation: 0,
  },
  functions: ['storage', 'display'],
  slots: [
    {
      id: 'weapon_slot_1',
      type: 'equipment',
      limits: { maxItems: 1, allowedTypes: ['weapon'] },
      items: ['WP_000042'],
      locked: false,
    },
    // ... ещё 5 слотов
  ],
  properties: {
    quality: 5,
    durability: 80,
    aesthetic: 4,
  },
};
```

### D.9 Фабрика строений

```typescript
/**
 * Фабрика строений
 */
class StructureFactory {
  /**
   * Создать дом
   */
  static createHouse(options: HouseOptions): SoulEntity {
    const id = generateId('STR');
    
    return {
      soul: {
        id,
        name: options.name || 'Дом',
        soulType: 'structure',
        controller: 'none',
        status: 'active',
        hasBody: true,
        hasQi: options.hasQiFormation ?? false,
        hasMind: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'constructed',
      },
      
      body: {
        soulId: id,
        bodyType: 'structure_house',
        size: {
          sizeClass: options.sizeClass,
          height: options.floors * 3,
          width: options.width,
          length: options.length,
        },
        parts: this.generateHouseParts(options),
        material: BUILDING_MATERIALS[options.materialId],
        isAlive: false,
        canAct: false,
      },
      
      qi: options.hasQiFormation ? this.createFormationQi(id, options) : null,
      mind: null,
      
      attachments: {
        techniques: [],
        inventory: [],
        effects: [],
        bonds: [],
      },
      
      // structure-specific
      structureType: options.structureType || 'house_medium',
      dimensions: {
        width: options.width,
        length: options.length,
        height: options.floors * 3,
        floors: options.floors,
        totalArea: options.width * options.length * options.floors,
      },
      ownership: {
        owner: options.ownerId,
        isPublic: false,
        isRentable: options.isRentable ?? false,
      },
      interior: {
        rooms: this.generateRooms(options),
        furniture: [],
        npcs: [],
        spawnPoints: options.spawnPoints || [],
      },
      entrances: this.generateEntrances(options),
      formations: [],
    };
  }
  
  /**
   * Создать храм
   */
  static createTemple(options: TempleOptions): SoulEntity {
    const baseHouse = this.createHouse({
      ...options,
      structureType: 'temple',
      hasQiFormation: true,
    });
    
    // Добавляем особые комнаты
    baseHouse.interior.rooms.push({
      id: 'altar_room',
      name: 'Зал Алтаря',
      type: 'altar',
      floor: 1,
      area: 100,
      height: 8,
      functions: ['worship', 'cultivation'],
      // ...
    });
    
    // Добавляем формацию культивации
    baseHouse.formations.push({
      id: 'formation_001',
      name: 'Формация Небесного Покровительства',
      type: 'cultivation_boost',
      coverage: { type: 'building' },
      status: 'active',
      parameters: { power: 50, efficiency: 80, qiCost: 5 },
    });
    
    return baseHouse;
  }
  
  /**
   * Создать мебель
   */
  static createFurniture(options: FurnitureOptions): SoulEntity {
    const id = generateId('FURN');
    
    return {
      soul: {
        id,
        name: options.name,
        soulType: 'furniture',
        controller: 'none',
        status: 'active',
        hasBody: true,
        hasQi: options.hasQiEffect ?? false,
        hasMind: false,
      },
      
      body: {
        soulId: id,
        bodyType: `furniture_${options.furnitureType}`,
        size: FURNITURE_SIZES[options.furnitureType],
        parts: this.generateFurnitureParts(options),
        material: BUILDING_MATERIALS[options.materialId],
        isAlive: false,
        canAct: false,
      },
      
      qi: options.hasQiEffect ? this.createFurnitureQi(id, options) : null,
      mind: null,
      
      attachments: {
        techniques: [],
        inventory: [],
        effects: options.effects || [],
        bonds: [],
      },
      
      furnitureType: options.furnitureType,
      placement: options.placement || null,
      functions: FURNITURE_FUNCTIONS[options.furnitureType],
      slots: options.slots || [],
      properties: {
        quality: options.quality || 1,
        comfort: options.comfort,
        durability: 100,
        aesthetic: options.aesthetic || 1,
      },
    };
  }
}
```

### D.10 Интеграция с существующими системами

```typescript
/**
 * Обновлённая матрица компонентов
 */
const COMPONENT_MATRIX_V2 = {
  // === Живые ===
  'character_player':  { soul: true, body: true, qi: true, mind: true, controller: 'player' },
  'character_npc':     { soul: true, body: true, qi: true, mind: true, controller: 'ai' },
  'creature_player':   { soul: true, body: true, qi: true, mind: true, controller: 'player' },
  'creature_ai':       { soul: true, body: true, qi: true, mind: false, controller: 'ai' },
  
  // === Духи ===
  'spirit_player':     { soul: true, body: false, qi: true, mind: true, controller: 'player' },
  'spirit_ai':         { soul: true, body: false, qi: true, mind: true, controller: 'ai' },
  
  // === Растения ===
  'plant':             { soul: true, body: true, qi: false, mind: false, controller: 'none' },
  'plant_spirit':      { soul: true, body: true, qi: true, mind: false, controller: 'none' },
  
  // === Объекты ===
  'object':            { soul: true, body: true, qi: false, mind: false, controller: 'none' },
  'object_qi':         { soul: true, body: true, qi: true, mind: false, controller: 'none' },
  
  // === Конструкты ===
  'construct':         { soul: true, body: true, qi: true, mind: false, controller: 'ai' },
  'construct_awakened':{ soul: true, body: true, qi: true, mind: true, controller: 'ai' },
  
  // 🆕 === Строения ===
  'structure':         { soul: true, body: true, qi: false, mind: false, controller: 'none' },
  'structure_qi':      { soul: true, body: true, qi: true, mind: false, controller: 'none' },
  'structure_living':  { soul: true, body: true, qi: true, mind: true, controller: 'ai' },
  
  // 🆕 === Мебель ===
  'furniture':         { soul: true, body: true, qi: false, mind: false, controller: 'none' },
  'furniture_qi':      { soul: true, body: true, qi: true, mind: false, controller: 'none' },
  
  // 🆕 === Декор ===
  'decoration':        { soul: true, body: true, qi: false, mind: false, controller: 'none' },
  'decoration_qi':     { soul: true, body: true, qi: true, mind: false, controller: 'none' },
};
```

### D.11 ID-префиксы для строений и мебели

```typescript
/**
 * Расширенная система ID
 */
const ID_PREFIXES_V2 = {
  // ... существующие префиксы ...
  
  // 🆕 Строения
  'STR': { name: 'Строение', format: 'STR_XXXXXX' },
  'STR_LIVING': { name: 'Живое строение', format: 'STR_LIVING_XXXXXX' },
  'TEMPLE': { name: 'Храм', format: 'TEMPLE_XXXXXX' },
  'TOWER': { name: 'Башня', format: 'TOWER_XXXXXX' },
  'GATE': { name: 'Ворота', format: 'GATE_XXXXXX' },
  
  // 🆕 Мебель
  'FURN': { name: 'Мебель', format: 'FURN_XXXXXX' },
  'BED': { name: 'Кровать', format: 'BED_XXXXXX' },
  'ALTAR': { name: 'Алтарь', format: 'ALTAR_XXXXXX' },
  'RACK': { name: 'Стойка', format: 'RACK_XXXXXX' },
  
  // 🆕 Декор
  'DEC': { name: 'Декор', format: 'DEC_XXXXXX' },
  'STATUE': { name: 'Статуя', format: 'STATUE_XXXXXX' },
  'PAINTING': { name: 'Картина', format: 'PAINTING_XXXXXX' },
};
```

---

*Документ описывает архитектуру системы наследования для всех объектов мира*  
*Совместим с: id-system.md v3.0, body.md v1.1, equip.md v1.0, qi_stone.md v2.0, npc-generator-plan.md v2.0*  
*Версия: 1.2 — добавлена система строений и мебели*
