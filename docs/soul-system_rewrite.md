# 🔄 План переработки: SoulEntity + PhysicalObject

**Версия:** 2.0  
**Создано:** 2026-03-06  
**Обновлено:** 2026-03-06  
**Статус:** План разработки  

---

## 📋 Обзор

Данный документ описывает план внедрения **двухпарной системы объектов**:

1. **SoulEntity** — для живых (одушевлённых) объектов
2. **PhysicalObject** — для неживых (пассивных) объектов

---

## 🎯 КЛЮЧЕВОЕ РАЗДЕЛЕНИЕ

### Критерий разделения

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     КРИТЕРИЙ РАЗДЕЛЕНИЯ                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     ВОПРОС: ЖИВОЙ ИЛИ НЕТ?                      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│              ┌───────────────┴───────────────┐                          │
│              ▼                               ▼                          │
│   ┌─────────────────────┐         ┌─────────────────────┐              │
│   │   МОЖЕТ ДЕЙСТВОВАТЬ? │         │   НЕ МОЖЕТ          │              │
│   │   (осознанно)        │         │   ДЕЙСТВОВАТЬ        │              │
│   └──────────┬──────────┘         └──────────┬──────────┘              │
│              │                               │                          │
│              ▼                               ▼                          │
│   ┌─────────────────────┐         ┌─────────────────────┐              │
│   │   ИМЕЕТ КОНТРОЛЛЕР? │         │   controller='none' │              │
│   │   (player/ai)       │         │                     │              │
│   └──────────┬──────────┘         └──────────┬──────────┘              │
│              │                               │                          │
│              ▼                               ▼                          │
│   ┌─────────────────────┐         ┌─────────────────────┐              │
│   │   SoulEntity        │         │   PhysicalObject    │              │
│   │   (ЖИВОЙ)           │         │   (НЕЖИВОЙ)         │              │
│   │                     │         │                     │              │
│   │   • Soul            │         │   • Base props      │              │
│   │   • Body (parts)    │         │   • Physics         │              │
│   │   • Qi (core/res)   │         │   • Durability      │              │
│   │   • Mind (optional) │         │   • QiStore (opt)   │              │
│   │   • Controller      │         │                     │              │
│   └─────────────────────┘         └─────────────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Таблица распределения

| Объект | Тип | Система | Причина |
|--------|-----|---------|---------|
| **Игрок** | character | SoulEntity | Управляется player |
| **NPC** | character | SoulEntity | Управляется ai |
| **Монстр** | creature | SoulEntity | Управляется ai |
| **Дух** | spirit | SoulEntity | Управляется ai |
| **Голем** | construct | SoulEntity | Управляется ai |
| **Разумный артефакт** | artifact | SoulEntity | Имеет сознание |
| **Камень** | decoration | PhysicalObject | Неподвижен, нет сознания |
| **Руда** | resource | PhysicalObject | Неподвижна, добывается |
| **Дерево** | resource | PhysicalObject | Неподвижно, рубится |
| **Строение** | structure | PhysicalObject | Неподвижно, пассивно |
| **Кристалл Ци** | resource | PhysicalObject | Неподвижен, хранит Ци |
| **Предмет** | item | PhysicalObject | Пассивен |

---

## 📁 ИЕРАРХИЯ ТИПОВ

```
WorldObject (базовый интерфейс)
    │
    ├── SoulEntity (живые)
    │       │
    │       ├── Character
    │       │     ├── PlayerCharacter (controller='player')
    │       │     └── NPCCharacter (controller='ai')
    │       │
    │       ├── Creature
    │       │     └── Monster (controller='ai')
    │       │
    │       ├── Spirit
    │       │     ├── PlayerSpirit (controller='player')
    │       │     └── AISpirit (controller='ai')
    │       │
    │       ├── Artifact
    │       │     └── SentientArtifact (controller='ai')
    │       │
    │       └── Construct
    │             ├── PlayerGolem (controller='player')
    │             └── AIGolem (controller='ai')
    │
    └── PhysicalObject (неживые)
            │
            ├── Resource
            │     ├── Ore (iron, copper, spirit)
            │     ├── Tree (oak, pine, bamboo)
            │     ├── Plant (herb, grass)
            │     └── QiCrystal
            │
            ├── Structure
            │     ├── Building (house, temple)
            │     ├── Wall
            │     └── Door
            │
            ├── Container
            │     └── Chest
            │
            ├── Decoration
            │     ├── Rock
            │     └── Statue
            │
            └── Item
                  ├── Weapon
                  ├── Armor
                  └── Consumable
```

---

## 1️⃣ ОБЩИЕ ИНТЕРФЕЙСЫ

### 1.1 Базовый интерфейс WorldObject

```typescript
/**
 * Базовый интерфейс для всех объектов мира
 */
interface WorldObject {
  id: string;
  name: string;
  
  // Позиция
  worldPosition: WorldPosition;
  
  // Тип объекта
  objectType: 'soul' | 'physical';
  
  // Метаданные
  createdAt: Date;
  updatedAt: Date;
  source: 'generated' | 'preset' | 'player';
}

/**
 * Позиция в мире
 */
interface WorldPosition {
  locationId: string;
  x: number;  // метры
  y: number;
  z: number;
}
```

### 1.2 SoulEntity (живые)

```typescript
/**
 * Живая сущность с душой
 */
interface SoulEntity extends WorldObject {
  objectType: 'soul';
  
  // === ДУША (обязательно) ===
  soul: {
    soulType: SoulType;
    controller: ControllerType;  // 'player' | 'ai'
    status: SoulStatus;
    playerId?: string;
    aiProfile?: string;
  };
  
  // === КОМПОНЕНТЫ ===
  body: BodyComponent | null;
  qi: QiComponent;
  mind: MindComponent | null;
  
  // === ПРИЛОЖЕНИЯ ===
  attachments: Attachments;
}

type SoulType = 'character' | 'creature' | 'spirit' | 'artifact' | 'construct';
type ControllerType = 'player' | 'ai';
```

### 1.3 PhysicalObject (неживые)

```typescript
/**
 * Неживой физический объект
 */
interface PhysicalObject extends WorldObject {
  objectType: 'physical';
  
  // === КАТЕГОРИЯ ===
  category: ObjectCategory;
  subType?: string;
  
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

type ObjectCategory = 'resource' | 'structure' | 'container' | 'decoration' | 'item';
```

---

## 2️⃣ МОДЕЛИ PRISMA

### 2.1 Обновлённая схема

```prisma
// ==================== ЖИВЫЕ СУЩНОСТИ ====================

model SoulEntity {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // === ТИП И КОНТРОЛЛЕР ===
  soulType    String        // character, creature, spirit, artifact, construct
  controller  String        // player, ai
  
  // === БАЗОВЫЕ ДАННЫЕ ===
  name        String
  
  // === УПРАВЛЕНИЕ ===
  playerId    String?       // Для controller='player'
  aiProfile   String?       // Для controller='ai'
  
  // === ПОЗИЦИЯ ===
  locationId  String?
  posX        Int           @default(0)
  posY        Int           @default(0)
  posZ        Int           @default(0)
  
  // === СТАТУС ===
  status      String        @default("active")
  
  // === КОМПОНЕНТЫ (JSON) ===
  bodyData    String?       // JSON: BodyComponent
  qiData      String        // JSON: QiComponent (обязательно!)
  mindData    String?       // JSON: MindComponent
  
  // === ПРИЛОЖЕНИЯ ===
  techniques  String?       @default("[]")
  inventory   String?       @default("[]")
  effects     String?       @default("[]")
  
  // === СВЯЗИ ===
  location    Location?     @relation(fields: [locationId], references: [id])
  session     GameSession?  @relation(fields: [sessionId], references: [id])
  sessionId   String?
  
  @@index([soulType])
  @@index([controller])
  @@index([locationId])
}

// ==================== НЕЖИВЫЕ ОБЪЕКТЫ ====================

model PhysicalObject {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // === КАТЕГОРИЯ ===
  category    String        // resource, structure, container, decoration, item
  subType     String?
  
  // === БАЗОВЫЕ ДАННЫЕ ===
  name        String
  
  // === ПОЗИЦИЯ ===
  locationId  String?
  posX        Int           @default(0)
  posY        Int           @default(0)
  posZ        Int           @default(0)
  rotation    Int           @default(0)
  
  // === ФИЗИКА (JSON) ===
  physicsData String        // JSON: PhysicsProperties
  
  // === ПРОЧНОСТЬ (JSON) ===
  durabilityData String?    // JSON: DurabilityState
  
  // === ХРАНИЛИЩЕ ЦИ (JSON) ===
  qiStoreData String?       // JSON: QiStoreState
  
  // === СОДЕРЖИМОЕ (JSON) ===
  contentsData String?      // JSON: ObjectContents
  
  // === ВЗАИМОДЕЙСТВИЕ ===
  interactable    Boolean   @default(false)
  interactionType String?
  
  // === СВЯЗИ ===
  location    Location?     @relation(fields: [locationId], references: [id])
  session     GameSession?  @relation(fields: [sessionId], references: [id])
  sessionId   String?
  
  @@index([category])
  @@index([subType])
  @@index([locationId])
}

// ==================== ОБНОВЛЁННЫЕ СВЯЗИ ====================

model GameSession {
  // ... существующие поля ...
  
  // Новые связи
  soulEntities     SoulEntity[]
  physicalObjects  PhysicalObject[]
}

model Location {
  // ... существующие поля ...
  
  // Новые связи
  soulEntities     SoulEntity[]
  physicalObjects  PhysicalObject[]
}
```

### 2.2 Альтернатива: расширение существующих моделей

```prisma
// ВАРИАНТ: Не создавать новые таблицы, а расширить существующие

model Character {
  // ... существующие поля ...
  
  // === НОВОЕ: Soul System ===
  soulType    String  @default("character")
  controller  String  @default("player")
}

model NPC {
  // ... существующие поля ...
  
  // === НОВОЕ: Soul System ===
  soulType    String  @default("character")
  controller  String  @default("ai")
  bodyState   String  @default("{}")  // Kenshi-style body
}

model WorldObject {
  // ... существующие поля ...
  
  // === НОВОЕ: Physical Object ===
  category      String  @default("decoration")
  physicsData   String  @default("{}")
  qiStoreData   String?
  contentsData  String?
}
```

---

## 3️⃣ ПЛАН МИГРАЦИИ

### 3.1 Фазы

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ФАЗЫ МИГРАЦИИ                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ФАЗА 1: Типы (1-2 дня)                                           │
│   ├── Создать src/types/world-object.ts                             │
│   ├── Создать src/types/soul-entity.ts                              │
│   ├── Создать src/types/physical-object.ts                          │
│   └── Обновить src/types/game.ts                                    │
│                                                                      │
│   ФАЗА 2: Prisma (2-3 дня)                                         │
│   ├── Выбрать вариант (новые таблицы или расширение)               │
│   ├── Обновить prisma/schema.prisma                                 │
│   ├── Создать миграцию                                              │
│   └── Протестировать                                                │
│                                                                      │
│   ФАЗА 3: Сервисы (3-4 дня)                                        │
│   ├── Создать src/lib/game/soul-factory.ts                          │
│   ├── Создать src/lib/game/physical-object-factory.ts               │
│   ├── Обновить TruthSystem                                          │
│   └── Создать ControllerService                                     │
│                                                                      │
│   ФАЗА 4: API (2-3 дня)                                            │
│   ├── Обновить существующие endpoints                               │
│   ├── Создать /api/soul/*                                          │
│   ├── Создать /api/physical-object/*                                │
│   └── Обновить валидацию                                            │
│                                                                      │
│   ФАЗА 5: UI (2-3 дня)                                             │
│   ├── Обновить BodyDoll для разных bodyType                        │
│   ├── Создать PhysicalObjectViewer                                  │
│   └── Обновить StatusDialog                                         │
│                                                                      │
│   ФАЗА 6: Миграция данных (1-2 дня)                                │
│   ├── Написать скрипты конвертации                                 │
│   ├── Протестировать на копии БД                                    │
│   └── Выполнить миграцию                                            │
│                                                                      │
│   ИТОГО: 11-17 дней                                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Детальный план по файлам

#### Фаза 1: Типы

| Файл | Действие | Приоритет |
|------|----------|-----------|
| `src/types/world-object.ts` | Создать | 🔴 Высокий |
| `src/types/soul-entity.ts` | Создать | 🔴 Высокий |
| `src/types/physical-object.ts` | Создать | 🔴 Высокий |
| `src/types/game.ts` | Обновить | 🟡 Средний |

#### Фаза 2: Prisma

| Файл | Действие | Приоритет |
|------|----------|-----------|
| `prisma/schema.prisma` | Обновить | 🔴 Высокий |
| `prisma/migrations/` | Создать | 🔴 Высокий |

#### Фаза 3: Сервисы

| Файл | Действие | Приоритет |
|------|----------|-----------|
| `src/lib/game/soul-factory.ts` | Создать | 🔴 Высокий |
| `src/lib/game/physical-object-factory.ts` | Создать | 🔴 Высокий |
| `src/lib/game/controller-service.ts` | Создать | 🔴 Высокий |
| `src/lib/game/truth-system.ts` | Обновить | 🔴 Высокий |

#### Фаза 4: API

| Файл | Действие | Приоритет |
|------|----------|-----------|
| `src/app/api/soul/create/route.ts` | Создать | 🔴 Высокий |
| `src/app/api/soul/possess/route.ts` | Создать | 🟡 Средний |
| `src/app/api/physical-object/create/route.ts` | Создать | 🔴 Высокий |
| `src/app/api/game/state/route.ts` | Обновить | 🔴 Высокий |

---

## 4️⃣ КОНСТАНТЫ И ПРЕСЕТЫ

### 4.1 Константы SoulEntity

```typescript
// src/lib/game/soul-constants.ts

export const SOUL_TYPE_CONFIG = {
  character: {
    hasBody: true,
    hasQi: true,
    hasMind: true,
    defaultController: 'player',
    bodyType: 'organic',
  },
  creature: {
    hasBody: true,
    hasQi: true,
    hasMind: false,
    defaultController: 'ai',
    bodyType: 'organic',
  },
  spirit: {
    hasBody: false,
    hasQi: true,
    hasMind: true,
    defaultController: 'ai',
    bodyType: 'ethereal',
  },
  artifact: {
    hasBody: true,
    hasQi: true,
    hasMind: true,
    defaultController: 'ai',
    bodyType: 'mineral',
  },
  construct: {
    hasBody: true,
    hasQi: true,
    hasMind: false,
    defaultController: 'ai',
    bodyType: 'construct',
  },
} as const;
```

### 4.2 Константы PhysicalObject

```typescript
// src/lib/game/physical-object-constants.ts

export const OBJECT_CATEGORY_CONFIG = {
  resource: {
    interactable: true,
    defaultInteraction: 'mine',
    hasDurability: true,
    canHaveQi: true,
  },
  structure: {
    interactable: false,
    hasDurability: true,
    canHaveQi: false,
  },
  container: {
    interactable: true,
    defaultInteraction: 'open',
    hasDurability: true,
    canHaveQi: false,
  },
  decoration: {
    interactable: false,
    hasDurability: true,
    canHaveQi: true,
  },
  item: {
    interactable: true,
    defaultInteraction: 'use',
    hasDurability: true,
    canHaveQi: true,
  },
} as const;

export const MATERIAL_PROPERTIES = {
  stone: { hardness: 7, flexibility: 1, qiConductivity: 0.1 },
  metal: { hardness: 8, flexibility: 2, qiConductivity: 0.5 },
  wood: { hardness: 4, flexibility: 3, qiConductivity: 0.8 },
  crystal: { hardness: 5, flexibility: 1, qiConductivity: 4.0 },
  plant: { hardness: 2, flexibility: 5, qiConductivity: 1.0 },
} as const;
```

---

## 5️⃣ ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### 5.1 Создание персонажа-игрока

```typescript
import { SoulFactory } from '@/lib/game/soul-factory';

const player = SoulFactory.createCharacter({
  name: 'Ли Вэй',
  controller: 'player',
  playerId: 'user_12345',
  species: 'human',
  qi: {
    coreCapacity: 1000,
    coreQuality: 5,
  },
});
```

### 5.2 Создание монстра

```typescript
const monster = SoulFactory.createCreature({
  name: 'Теневой Волк',
  species: 'shadow_wolf',
  level: 3,
  qi: {
    coreCapacity: 500,
  },
  body: {
    parts: WOLF_BODY_PARTS,
    movement: { types: ['quadruped'], speeds: { walk: 2, run: 8 } },
  },
});
```

### 5.3 Создание камня

```typescript
import { PhysicalObjectFactory } from '@/lib/game/physical-object-factory';

const rock = PhysicalObjectFactory.create({
  category: 'decoration',
  subType: 'gray_rock',
  name: 'Камень',
  size: { sizeClass: 'small', height: 30, width: 25 },
  material: 'stone',
  qiStore: { capacity: 50, current: 5 },
});
```

### 5.4 Создание руды

```typescript
const ore = PhysicalObjectFactory.create({
  category: 'resource',
  subType: 'iron_ore',
  name: 'Железная руда',
  size: { sizeClass: 'medium', height: 80, width: 60 },
  material: 'metal',
  durability: { hp: 1000, armor: 15 },
  qiStore: { capacity: 100, current: 30 },
  contents: {
    resources: [{ type: 'iron_ore', amount: 5, quality: 3 }],
  },
  interactable: true,
  interactionType: 'mine',
});
```

---

## 6️⃣ ФУНКЦИОНАЛЬНЫЕ ТРЕБОВАНИЯ

### 6.1 Обязательные функции

| # | Функция | Приоритет | Описание |
|---|---------|-----------|----------|
| 1 | Создание SoulEntity | 🔴 Высокий | SoulFactory.create() |
| 2 | Создание PhysicalObject | 🔴 Высокий | PhysicalObjectFactory.create() |
| 3 | Получение по ID | 🔴 Высокий | WorldObjectRegistry.get(id) |
| 4 | Определение типа | 🔴 Высокий | isSoulEntity() / isPhysicalObject() |
| 5 | Переключение контроллера | 🟡 Средний | ControllerService.possess() |
| 6 | Взаимодействие с объектом | 🟡 Средний | PhysicalObject.interact() |

### 6.2 Опциональные функции

| # | Функция | Приоритет | Описание |
|---|---------|-----------|----------|
| 7 | Пробуждение объекта | 🟢 Низкий | awakenObject() |
| 8 | Запечатывание духа | 🟢 Низкий | sealSpirit() |
| 9 | Эволюция души | 🟢 Низкий | evolveSoul() |

---

## 7️⃣ КРИТЕРИИ УСПЕХА

### 7.1 Технические

- [ ] Все живые объекты используют SoulEntity
- [ ] Все неживые объекты используют PhysicalObject
- [ ] Чёткое разделение controller='player'|'ai' vs 'none'
- [ ] BodySystem работает с обоими типами
- [ ] QiSystem поддерживает core и qiStore

### 7.2 Функциональные

- [ ] Игрок может создать персонажа (как раньше)
- [ ] NPC имеют тело (Kenshi-style)
- [ ] Монстры могут двигаться и атаковать
- [ ] Камни/руды/деревья на карте
- [ ] Добыча ресурсов работает
- [ ] Сохранение/загрузка работает

---

## 🔗 СВЯЗАННЫЕ ДОКУМЕНТЫ

- **docs/soul-system.md** — Система живых объектов (SoulEntity)
- **docs/physical-object-system.md** — Система неживых объектов (PhysicalObject)
- **docs/body.md** — Система тела
- **docs/start_lore.md** — Лор мира

---

**Документ подготовлен для планирования переработки.**  
**Следующий шаг:** Утверждение плана и начало Фазы 1 (создание типов).
