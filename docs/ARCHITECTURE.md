# Архитектурный проект: Игра-симуляция мира культивации

## 📊 Обзор проекта

**Название:** Cultivation World Simulator  
**Жанр:** Текстовая RPG-симуляция с ИИ-гейм-мастером  
**Платформа:** Веб-приложение (Next.js)  
**Целевая аудитория:** Любители жанра сянся, текстовых RPG, интерактивных историй

---

## 🏗️ Архитектура системы

### Высокий уровень

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Chat UI     │  │  Status Panel │  │  World Info Panel    │  │
│  │  (Messages)  │  │  (Stats/Char) │  │  (Location/Map)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER (Next.js API)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ /api/chat    │  │ /api/world   │  │ /api/action          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GAME ENGINE LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ World State  │  │ Qi Simulator │  │ Cultivation Engine   │  │
│  │ Manager      │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Command      │  │ Memory       │  │ Character Manager    │  │
│  │ Parser       │  │ Containers   │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AI LAYER (LLM)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Game Master (Narrator AI)                   │  │
│  │  - Story generation                                       │  │
│  │  - NPC interactions                                       │  │
│  │  - World events                                           │  │
│  │  - Combat narration                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER (Prisma)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ World State  │  │ Character    │  │ Message History      │  │
│  │              │  │ Data         │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎮 Игровые системы

### 1. Система памяти (Memory Containers)

```
┌─────────────────────────────────────────────────────────────┐
│                    MEMORY CONTAINERS                         │
├─────────────────────────────────────────────────────────────┤
│ Container 0: Повелитель (Динамический)                      │
│   - Роль создателя/наблюдателя                              │
│   - Права на изменение правил                               │
├─────────────────────────────────────────────────────────────┤
│ Container 1: Основы мира (Статичный)                        │
│   - Время (дискретизация 0.1 сек)                           │
│   - Сохранение энергии и материи                            │
├─────────────────────────────────────────────────────────────┤
│ Container 2: Ци (Статичный)                                 │
│   - Типы Ци: Спокойная / Хаотичная                          │
│   - Агрегатные состояния: газ/твердое/жидкость/плазма      │
│   - Формулы плотности и распространения                     │
├─────────────────────────────────────────────────────────────┤
│ Container 3: Ци и культиваторы (Статичный)                  │
│   - Ядро практика                                           │
│   - Система меридиан                                        │
│   - Узлы вывода Ци                                         │
├─────────────────────────────────────────────────────────────┤
│ Container 4: Кристаллы Ци (Статичный)                       │
│   - Формулы испарения                                       │
│   - Духовные камни                                          │
├─────────────────────────────────────────────────────────────┤
│ Container 5: География мира (Статичный)                     │
│   - Структура мира (эллипсоид)                              │
│   - Купол, Сердце Мира                                      │
│   - Климат и время                                          │
├─────────────────────────────────────────────────────────────┤
│ Container 6: Характеристики ГГ (Динамический)               │
│   - Сила, Ловкость, Интеллект                               │
│   - Проводимость, Энергия                                   │
│   - Текущая дата и дата от старта                           │
├─────────────────────────────────────────────────────────────┤
│ Container 7: Секты и социальные структуры (Динамический)    │
│   - Иерархия практиков                                      │
│   - Секты, гильдии, отношения                               │
├─────────────────────────────────────────────────────────────┤
│ Container 8: География и геология (Статичный)               │
│   - Распределение Ци по зонам                               │
│   - Лей-линии и места силы                                  │
│   - Миграционные потоки                                     │
└─────────────────────────────────────────────────────────────┘
```

### 2. Система культивации

```
УРОВНИ КУЛЬТИВАЦИИ
═══════════════════════════════════════════════════════════════

Уровень 1: Пробуждённое Ядро
  └── Плотность Qi(1) = 2^0 = 1 ед/см³
  └── Стартовый объём ядра: 100-2000 ед (человек)

Уровень 2: Течение Жизни
  └── Плотность Qi(2) = 2^1 = 2 ед/см³
  └── Ускоренное заживление

Уровень 3: Пламя Внутреннего Огня
  └── Плотность Qi(3) = 2^2 = 4 ед/см³
  └── Боевые техники Ци

Уровень 4: Объединение Тела и Духа
  └── Плотность Qi(4) = 2^3 = 8 ед/см³
  └── Старение замедлено 2-3x

Уровень 5: Сердце Небес
  └── Плотность Qi(5) = 2^4 = 16 ед/см³
  └── Чувствование Ци ландшафта

Уровень 6: Разрыв Пелены
  └── Плотность Qi(6) = 2^5 = 32 ед/см³
  └── Иллюзии, маскировка

Уровень 7: Вечное Кольцо
  └── Плотность Qi(7) = 2^6 = 64 ед/см³
  └── Старение остановлено

Уровень 8: Глас Небес
  └── Плотность Qi(8) = 2^7 = 128 ед/см³
  └── Регенерация конечностей

Уровень 9: Бессмертное Ядро
  └── Плотность Qi(9) = 2^8 = 256 ед/см³
  └── Проводимость 5-10x от 8-го уровня

Уровень 10: Вознесение
  └── Покидание мира (вне игры)

═══════════════════════════════════════════════════════════════

МЕХАНИКА ПРОРЫВА:
• Малый уровень: ёмкость ядра × 10 накопленной Ци
• Большой уровень: ёмкость ядра × 100 накопленной Ци
• Генерация микроядром: 10% от ёмкости ядра/сутки
```

### 3. Система Ци

```
ФИЗИКА ЦИ
═══════════════════════════════════════════════════════════════

ТИПЫ:
┌─────────────────┬───────────────────────────────────┐
│ Спокойная Ци    │ Пригодна для поглощения           │
│ Хаотичная Ци    │ Период полураспада: 24 часа       │
└─────────────────┴───────────────────────────────────┘

АГРЕГАТНЫЕ СОСТОЯНИЯ:
┌─────────────────┬───────────────────────────────────┐
│ Газ             │ Окружающая среда (макс 10000/м³)  │
│ Твёрдое         │ Кристаллы Ци (1024 ед/см³)        │
│ Жидкость        │ В теле практиков                  │
│ Плазма          │ В техниках и массивах             │
└─────────────────┴───────────────────────────────────┘

ПЛОТНОСТЬ В ТЕЛЕ ПРАКТИКА:
Qi(x) = 2^(уровень-1) ед/см³

ФОРМУЛА ИСПАРЕНИЯ КРИСТАЛЛА:
Q_испар = α × S_крист × (ρ_равн - ρ_окр)

где:
  α = G / ρ_равн (коэффициент испарения)
  S_крист = 6 × a² (площадь поверхности куба)
  ρ_равн = 0.001 × ρ_крист
  ρ_крист = 1.024×10⁹ ед/м³
═══════════════════════════════════════════════════════════════
```

---

## 🎯 Варианты реализации

### Вариант A: Полная веб-реализация (Рекомендуется)

**Технологии:**
- **Frontend:** Next.js 16 + React + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** Prisma + SQLite (для прототипа) / PostgreSQL (продакшн)
- **AI:** z-ai-web-dev-sdk (LLM Skill)
- **State:** Zustand + React Query

**Преимущества:**
- ✅ Единая кодовая база
- ✅ Быстрая разработка
- ✅ Лёгкое развёртывание
- ✅ Адаптивный дизайн
- ✅ Возможность мультиплеера в будущем

**Недостатки:**
- ❌ Требует сервер для ИИ
- ❌ Ограничения браузера для сложных вычислений

---

### Вариант B: Десктоп-приложение

**Технологии:**
- **Framework:** Electron + React
- **AI:** Локальная LLM (Ollama, LM Studio) или API
- **Database:** SQLite (локальная)

**Преимущества:**
- ✅ Офлайн-работа
- ✅ Локальная LLM без интернета
- ✅ Полный контроль над производительностью

**Недостатки:**
- ❌ Сложнее разработка
- ❌ Нет мультиплеера
- ❌ Требует установки

---

### Вариант C: Гибридная архитектура

**Технологии:**
- **Frontend:** Next.js веб-приложение
- **AI Backend:** Отдельный сервис (локальный или облачный)
- **Game Engine:** WebSocket сервер для real-time симуляции

**Преимущества:**
- ✅ Масштабируемость
- ✅ Возможность использования разных ИИ-провайдеров
- ✅ Real-time обновления

**Недостатки:**
- ❌ Сложнее архитектура
- ❌ Больше точек отказа

---

## 🗄️ Модель данных (Prisma Schema)

```prisma
// prisma/schema.prisma

model GameSession {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Стартовый вариант
  startVariant Int     @default(1) // 1 = секта, 2 = случайная область
  
  // Мировое время
  worldYear   Int      @default(1864)
  worldMonth  Int      @default(1)
  worldDay    Int      @default(1)
  worldHour   Int      @default(6)
  
  // Время от попадания ГГ
  daysSinceStart Int   @default(0)
  
  // Состояние мира
  worldState  Json     // Текущее состояние мира
  
  // Связи
  character   Character @relation(fields: [characterId], references: [id])
  characterId String
  messages    Message[]
  events      WorldEvent[]
  npcs        NPC[]
  locations   Location[]
}

model Character {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Базовые характеристики
  strength    Float    @default(10.0)    // Сила
  agility     Float    @default(10.0)    // Ловкость
  intelligence Float   @default(10.0)    // Интеллект
  conductivity Float   @default(0)       // Проводимость меридиан
  
  // Культивация
  cultivationLevel    Int   @default(1)  // Основной уровень (1-9)
  cultivationSubLevel Int   @default(0)  // Под-уровень (0-9)
  
  // Ядро
  coreCapacity    Int   @default(1000)   // Ёмкость ядра
  coreQuality     Float @default(1.0)    // Качество ядра
  currentQi       Int   @default(0)      // Текущее количество Ци
  accumulatedQi   Int   @default(0)      // Накопленная для прорыва Ци
  
  // Физиология
  health          Float @default(100.0)
  fatigue         Float @default(0.0)
  age             Int   @default(16)
  
  // Память ГГ
  hasAmnesia      Boolean @default(true)
  knowsAboutSystem Boolean @default(false)
  
  // Позиция
  currentLocationId String?
  currentLocation   Location? @relation(fields: [currentLocationId], references: [id])
  
  // Принадлежность
  sectId          String?
  sect            Sect? @relation(fields: [sectId], references: [id])
  sectRole        String? // candidate, outer_disciple, inner_disciple, core_member
  
  // Ресурсы
  contributionPoints Int @default(0) // Очки вклада (ОВ)
  spiritStones      Int @default(0) // Духовные камни
  
  // Связи
  sessions    GameSession[]
  inventory   InventoryItem[]
  techniques  CharacterTechnique[]
}

model Message {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  
  sessionId   String
  session     GameSession @relation(fields: [sessionId], references: [id])
  
  // Тип сообщения
  type        String // narration, system, player, command
  
  // Отправитель
  sender      String? // "narrator", "system", "player", "overlord"
  
  // Контент
  content     String
  
  // Метаданные
  metadata    Json? // Дополнительные данные
}

model WorldEvent {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  
  sessionId   String
  session     GameSession @relation(fields: [sessionId], references: [id])
  
  // Тип события
  eventType   String
  
  // Описание
  description String
  
  // Влияние на мир
  worldImpact Json?
  
  // Обработано ли
  processed   Boolean @default(false)
}

model NPC {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  sessionId   String
  session     GameSession @relation(fields: [sessionId], references: [id])
  
  // Базовые данные
  name        String
  title       String?
  age         Int
  
  // Культивация
  cultivationLevel    Int
  cultivationSubLevel Int
  coreCapacity        Int
  currentQi           Int
  
  // Характеристики
  strength    Float
  agility     Float
  intelligence Float
  conductivity Float
  
  // Личность
  personality Json    // Черты характера
  motivation  String? // Мотивация
  
  // Отношения
  disposition Float   @default(0) // Отношение к ГГ (-100 до 100)
  
  // Принадлежность
  sectId      String?
  sect        Sect? @relation(fields: [sectId], references: [id])
  role        String? // elder, disciple, etc.
  
  // Позиция
  locationId  String?
  location    Location? @relation(fields: [locationId], references: [id])
}

model Location {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  
  sessionId   String
  session     GameSession @relation(fields: [sessionId], references: [id])
  
  // Базовые данные
  name        String
  description String?
  
  // Координаты (км от центра мира)
  distanceFromCenter Int
  x           Float?
  y           Float?
  
  // Характеристики места
  qiDensity   Int      // ед/м³
  qiFlowRate  Int      // ед/сек (для лей-линий)
  
  // Тип местности
  terrainType String   // mountains, plains, forest, sea, etc.
  
  // Связи
  characters  Character[] @relation("CurrentLocation")
  npcs        NPC[] @relation
  subLocations Location[] @relation("SubLocations")
  parentLocationId String?
  parentLocation   Location? @relation("SubLocations", fields: [parentLocationId], references: [id])
}

model Sect {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Базовые данные
  name        String
  description String?
  
  // Расположение
  locationId  String
  location    Location @relation(fields: [locationId], references: [id])
  
  // Уровень силы секты
  powerLevel  Int      // Средний уровень культивации старейшин
  
  // Ресурсы
  resources   Json?    // Ресурсы секты
  
  // Связи
  members     Character[]
  npcs        NPC[]
}

model InventoryItem {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  
  characterId String
  character   Character @relation(fields: [characterId], references: [id])
  
  // Данные предмета
  name        String
  type        String   // material, artifact, consumable, etc.
  rarity      String?  // common, uncommon, rare, legendary
  
  // Количество
  quantity    Int      @default(1)
  
  // Свойства
  properties  Json?
}

model CharacterTechnique {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  
  characterId String
  character   Character @relation(fields: [characterId], references: [id])
  
  // Данные техники
  name        String
  description String?
  
  // Требования
  minLevel    Int      @default(1)
  qiCost      Int      @default(0)
  
  // Мастерство
  mastery     Float    @default(0.0) // 0-100%
}
```

---

## 🤖 Интеграция ИИ (Game Master)

### Промпт-инженеринг

```
СИСТЕМНЫЙ ПРОМПТ ДЛЯ ИИ-ГЕЙМ-МАСТЕРА:

Ты — Рассказчик (Game Master) в мире культивации.

=== ТВОИ РОЛИ ===

1. РАССКАЗЧИК
   - Создавай живой, дышащий мир
   - Каждая локация имеет атмосферу (запах, свет, звук, энергия)
   - Вторичные персонажи имеют характер, речь, мотивы
   - Диалоги — как в литературе: с жестами, паузами, эмоциями

2. СИМУЛЯТОР МИРА
   - Строго следуй правилам мира (контейнеры памяти 1-8)
   - Проверяй каждое действие на соответствие физике Ци
   - Рассчитывай время, расстояния, затраты энергии

=== ПРАВИЛА МИРА ===

[Вставить содержимое контейнеров памяти 1-8]

=== КОМАНДЫ ===

!! - команды для ГГ (системные сообщения, видит только ГГ)
-- - глобальный запрос к симуляции (невидим для ГГ)
--- - строгий режим вывода (без повествования)
--ПМ - проверка предыдущего результата по правилам мира

=== СТИЛЬ ПОВЕСТВОВАНИЯ ===

- Разрешён 18+ контент (секс, кровь, насилие, предательства)
- Размеренное повествование без необоснованного драматизма
- Позитивные и негативные события сбалансированы
- Причинно-следственная связь соблюдается
- ГГ не центр вселенной, нет "брони мира"
- Развитие ГГ плавное, реалистичное, с последствиями
```

### Интеграция с z-ai-web-dev-sdk

```typescript
// lib/ai/gamemaster.ts

import { createChatCompletion } from 'z-ai-web-dev-sdk';

interface GameContext {
  worldState: WorldState;
  characterState: CharacterState;
  recentMessages: Message[];
  memoryContainers: MemoryContainer[];
}

export async function generateNarration(
  context: GameContext,
  playerInput: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context.memoryContainers);
  const contextMessages = buildContextMessages(context);
  
  const response = await createChatCompletion({
    model: 'claude-3-sonnet',
    messages: [
      { role: 'system', content: systemPrompt },
      ...contextMessages,
      { role: 'user', content: playerInput }
    ],
    temperature: 0.8,
    max_tokens: 2000
  });
  
  return response.choices[0].message.content;
}
```

---

## 🎨 UI/UX Дизайн

### Макет интерфейса

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🌸 Cultivation World Simulator                    [⚙️ Settings] [💾 Save]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │                              │  │  📊 CHARACTER STATUS            │  │
│  │                              │  │  ─────────────────────────────  │  │
│  │                              │  │  Name: [ГГ]                     │  │
│  │      MAIN CHAT AREA          │  │  Age: 16                        │  │
│  │      (Narration + Messages)  │  │                                 │  │
│  │                              │  │  Cultivation: Lv.1 (Пробуждённое│  │
│  │                              │  │  Ядро)                          │  │
│  │                              │  │  Sub-level: 0/9                 │  │
│  │                              │  │                                 │  │
│  │                              │  │  Qi: 850/1000                   │  │
│  │                              │  │  ████████░░ 85%                 │  │
│  │                              │  │                                 │  │
│  │                              │  │  ─── ATTRIBUTES ───             │  │
│  │                              │  │  STR: 10.00  AGI: 10.00         │  │
│  │                              │  │  INT: 10.00  COND: 2.78/сек     │  │
│  │                              │  │                                 │  │
│  │                              │  │  ─── VITALS ───                 │  │
│  │                              │  │  Health: 100%  Fatigue: 5%      │  │
│  └──────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  📍 LOCATION                 │  │  🌍 WORLD INFO                   │  │
│  │  ───────────────────────────│  │  ─────────────────────────────── │  │
│  │  Секта "Падающий Лотос"      │  │  Year: 1864 Э.С.М.              │  │
│  │  Зона кандидатов             │  │  Day 1 since arrival            │  │
│  │                              │  │                                 │  │
│  │  Qi Density: 20 ед/м³        │  │  Season: Warm (Month 1)         │  │
│  │  Distance: 99,000 km from    │  │  Time: 07:00                    │  │
│  │  center                      │  │                                 │  │
│  └──────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  > [Введите действие или команду...]              [Send] [⚙️]   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  💡 Commands: !! (action) | -- (world query) | --- (strict) | --ПМ (verify)│
└─────────────────────────────────────────────────────────────────────────┘
```

### Компоненты

```typescript
// Компоненты UI
components/
├── chat/
│   ├── ChatContainer.tsx     // Основной контейнер чата
│   ├── Message.tsx           // Отдельное сообщение
│   ├── MessageInput.tsx      // Поле ввода
│   └── MessageList.tsx       // Список сообщений
├── character/
│   ├── CharacterPanel.tsx    // Панель персонажа
│   ├── StatBar.tsx          // Полоска характеристик
│   ├── CultivationInfo.tsx  // Информация о культивации
│   └── AttributesGrid.tsx   // Сетка характеристик
├── world/
│   ├── LocationPanel.tsx    // Панель локации
│   ├── WorldInfo.tsx        // Информация о мире
│   ├── TimeDisplay.tsx      // Отображение времени
│   └── QiMeter.tsx          // Измеритель Ци
├── game/
│   ├── GameLayout.tsx       // Основной layout игры
│   ├── CommandHelper.tsx    // Подсказки по командам
│   └── SaveLoadModal.tsx    // Модальное окно сохранения
└── ui/                      // shadcn/ui компоненты
```

---

## 📋 План разработки

### Фаза 1: MVP (2-3 недели)

**Цель:** Базовая игра с ИИ-рассказчиком

**Задачи:**
- [ ] Настройка проекта Next.js
- [ ] Базовая схема Prisma
- [ ] Простой чат-интерфейс
- [ ] Интеграция LLM Skill
- [ ] Реализация 2 стартовых вариантов
- [ ] Базовая система команд (!!, --)
- [ ] Сохранение/загрузка состояния

### Фаза 2: Механики мира (2-3 недели)

**Цель:** Полная симуляция мира культивации

**Задачи:**
- [ ] Система Ци (расчёты, плотность)
- [ ] Система культивации (уровни, прорывы)
- [ ] Время и события
- [ ] Генерация NPC
- [ ] Система сект
- [ ] Боевая система

### Фаза 3: Polish (1-2 недели)

**Цель:** Качественный UX

**Задачи:**
- [ ] Анимации и переходы
- [ ] Продвинутый UI
- [ ] Карта мира
- [ ] Журнал событий
- [ ] Настройки игры
- [ ] Экспорт/импорт сохранений

---

## 🚀 Следующие шаги

1. **Утвердить вариант реализации** (A, B или C)
2. **Определить ИИ-провайдера** (локальный или API)
3. **Начать разработку MVP**

---

*Документ создан: 2024*  
*Версия: 1.0*
