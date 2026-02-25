# 🏗️ Phase 2: Architecture — Детализированный план выполнения

**Создано:** 2026-02-24
**Обновлено:** 2026-02-25
**Статус:** 🟡 Частично завершено
**Приоритет:** Средний

---

## 📋 Обзор задач

| # | Задача | Приоритет | Сложность | Статус |
|---|--------|-----------|-----------|--------|
| 1 | Унификация типов (game-shared.ts) | 🔴 Высокий | 🟡 Средняя | ✅ Завершено |
| 2 | Разделение qi-system / qi-shared | 🟡 Средний | 🟢 Низкая | ⏸️ Отложено |
| 3 | Zod валидация для всех API | 🔴 Высокий | 🟡 Средняя | ✅ Завершено |
| 4 | Рефакторинг request-router | 🟡 Средний | 🟡 Средняя | ⏸️ Отложено |
| 5 | Исправление Google Fonts | 🔴 Критичный | 🟢 Низкая | ✅ Завершено |
| 6 | Упрощённая система карты | 🔴 Высокий | 🟡 Средняя | ✅ Завершено |

---

## 📦 Задача 1: Унификация типов (game-shared.ts)

### 🎯 Цель
Создать единый файл `src/types/game-shared.ts` для общих типов, используемых и сервером, и клиентом. Устранить дублирование интерфейсов.

### 📍 Текущее состояние
```
src/types/game.ts        — 298 строк, основные типы
src/types/branded.ts     — Brand types (SessionId, CharacterId, etc.)
src/lib/game/qi-system.ts — Локальный interface LocationData
src/lib/game/qi-shared.ts — Локальный interface LocationData (дублирование!)
src/lib/game/request-router.ts — Локальный interface LocationData (дублирование!)
```

### 🔨 План выполнения

#### Шаг 1.1: Анализ дублирующихся типов
- [ ] Найти все дублирования `interface LocationData`
- [ ] Найти типы, определённые в нескольких местах
- [ ] Составить список типов для миграции

**Проверка:**
```bash
# Поиск LocationData интерфейсов
rg "interface LocationData" src/ -n
```

#### Шаг 1.2: Создание src/types/game-shared.ts
- [ ] Создать файл `src/types/game-shared.ts`
- [ ] Перенести `LocationData` интерфейс (универсальная версия)
- [ ] Добавить комментарии о назначении файла

**Структура файла:**
```typescript
/**
 * Общие типы для клиента и сервера
 * 
 * Единый источник типов, используемых в:
 * - API routes (сервер)
 * - React components (клиент)
 * - Game logic (сервер)
 */

import type { LocationId } from './branded';

// ==================== ЛОКАЦИЯ ====================

/**
 * Данные о локации для расчётов
 * Используется в qi-system, qi-shared, request-router
 */
export interface LocationData {
  name?: string;
  qiDensity: number;
  distanceFromCenter?: number;
  terrainType?: string | null;
  qiFlowRate?: number;
}

// ==================== ДРУГИЕ ОБЩИЕ ТИПЫ ====================
// ... (добавлять по мере обнаружения)
```

#### Шаг 1.3: Обновление импортов
- [ ] Обновить `src/lib/game/qi-system.ts` → `import { LocationData } from '@/types/game-shared'`
- [ ] Обновить `src/lib/game/qi-shared.ts` → `import { LocationData } from '@/types/game-shared'`
- [ ] Обновить `src/lib/game/request-router.ts` → `import { LocationData } from '@/types/game-shared'`
- [ ] Удалить локальные определения `interface LocationData`

#### Шаг 1.4: Проверка сборки
- [ ] Запустить `bun run lint`
- [ ] Проверить TypeScript: `npx tsc --noEmit`
- [ ] Убедиться, что нет ошибок импортов

### ✅ Критерии завершения
1. Нет дублирующихся `interface LocationData`
2. Все файлы используют единый источник типов
3. `bun run lint` без ошибок
4. `npx tsc --noEmit` без ошибок

---

## 📦 Задача 2: Разделение qi-system / qi-shared

### 🎯 Цель
Чёткое разделение ответственности:
- `qi-system.ts` — ТОЛЬКО серверные действия (meditation, breakthrough)
- `qi-shared.ts` — ТОЛЬКО чистые расчёты (без побочных эффектов)

### 📍 Текущее состояние
```
src/lib/game/qi-system.ts  — 149 строк
  - performMeditation()      ✅ серверное действие
  - attemptBreakthrough()    ✅ серверное действие
  - re-export из qi-shared   ⚠️ избыточный re-export

src/lib/game/qi-shared.ts   — 322 строк
  - calculateCoreGenerationRate()     ✅ чистая функция
  - calculateEnvironmentalAbsorptionRate() ✅ чистая функция
  - calculateQiRates()       ✅ чистая функция
  - calculateBreakthroughRequirements() ✅ чистая функция
  - calculateBreakthroughResult()     ✅ чистая функция
  - ...все остальные расчёты  ✅ чистые функции
```

### 🔨 План выполнения

#### Шаг 2.1: Анализ re-exports в qi-system.ts
- [ ] Проверить, какие re-exports используются
- [ ] Определить, можно ли убрать re-exports

**Текущие re-exports (строки 138-148):**
```typescript
export {
  calculateCoreGenerationRate,
  calculateEnvironmentalAbsorptionRate,
  calculateQiRates,
  calculateBreakthroughRequirements,
  getCultivationLevelName,
  calculateMeditationFatigue,
  calculateQiCost,
  calculatePassiveQiGain,
  calculateTimeToFull,
} from './qi-shared';
```

#### Шаг 2.2: Поиск использования re-exports
```bash
# Найти импорты этих функций через qi-system
rg "from.*qi-system.*calculate" src/ -n
```

- [ ] Проверить все файлы, использующие эти функции
- [ ] Обновить импорты на прямые из qi-shared

#### Шаг 2.3: Удаление re-exports
- [ ] Удалить блок re-exports из qi-system.ts
- [ ] Оставить только `performMeditation` и `attemptBreakthrough`

#### Шаг 2.4: Документирование ответственности
- [ ] Обновить JSDoc в qi-system.ts с чётким описанием
- [ ] Обновить JSDoc в qi-shared.ts с чётким описанием

**Пример JSDoc для qi-system.ts:**
```typescript
/**
 * Система Ци — Серверные действия
 * 
 * Этот модуль содержит ТОЛЬКО функции, которые:
 * - Выполняют действия над персонажем
 * - Возвращают данные для обновления в БД
 * - Не могут использоваться на клиенте
 * 
 * Для расчётов используйте qi-shared.ts!
 * 
 * @module qi-system
 * @see qi-shared — чистые расчёты
 */
```

### ✅ Критерии завершения
1. `qi-system.ts` содержит только `performMeditation` и `attemptBreakthrough`
2. Нет re-exports из qi-shared
3. Все импорты обновлены
4. Документация отражает реальную ответственность

---

## 📦 Задача 3: Zod валидация для всех API

### 🎯 Цель
Все API routes используют Zod для валидации входных данных.

### 📍 Текущее состояние

**Уже есть валидация:**
- ✅ `/api/chat` — `sendMessageSchema`
- ✅ `/api/game/start` — `startGameSchema`
- ✅ `/api/game/save` — `saveGameSchema`
- ✅ `/api/game/state` — `loadGameSchema`
- ✅ `/api/settings/llm` — `llmSettingsSchema`

**Нет валидации:**
- ❌ `/api/cheats` — нет схемы
- ❌ `/api/inventory` — нет схемы
- ❌ `/api/inventory/use` — нет схемы
- ❌ `/api/techniques/pool` — нет схемы
- ❌ `/api/database/migrate` — нет схемы
- ❌ `/api/database/reset` — нет схемы
- ❌ `/api/logs` — нет схемы
- ❌ `/api/character/data` — нет схемы

### 🔨 План выполнения

#### Шаг 3.1: Создание недостающих схем

**Добавить в `src/lib/validations/game.ts`:**

```typescript
// ==================== CHEATS ====================

export const cheatCommandSchema = z.object({
  command: z.enum([
    'set_level', 'breakthrough', 'add_qi', 'full_restore',
    'god_mode', 'add_stat', 'set_stat', 'give_technique',
    'gen_techniques', 'reset_techniques'
  ]),
  params: z.record(z.unknown()).optional(),
  characterId: z.string().min(1),
});

// ==================== INVENTORY ====================

export const inventoryUseSchema = z.object({
  itemId: z.string().min(1),
  characterId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
});

// ==================== TECHNIQUES ====================

export const techniquePoolSchema = z.object({
  characterId: z.string().min(1),
  action: z.enum(['generate', 'select', 'get']).default('get'),
  selectedTechniqueId: z.string().optional(),
});

// ==================== DATABASE ====================

export const databaseResetSchema = z.object({
  confirm: z.literal('RESET_ALL_DATA'),
  keepBackups: z.boolean().default(true),
});

// ==================== LOGS ====================

export const logsQuerySchema = z.object({
  category: z.string().optional(),
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// ==================== CHARACTER ====================

export const characterDataSchema = z.object({
  characterId: z.string().min(1),
});
```

#### Шаг 3.2: Обновление API routes

**Порядок обновления (по приоритету):**

| API Route | Приоритет | Сложность |
|-----------|-----------|-----------|
| `/api/cheats` | 🔴 Высокий | 🟢 Низкая |
| `/api/inventory/use` | 🔴 Высокий | 🟢 Низкая |
| `/api/techniques/pool` | 🟡 Средний | 🟢 Низкая |
| `/api/database/reset` | 🔴 Высокий | 🟡 Средняя |
| `/api/logs` | 🟢 Низкий | 🟢 Низкая |
| `/api/character/data` | 🟢 Низкий | 🟢 Низкая |

#### Шаг 3.3: Шаблон обновления API route

```typescript
import { 
  schemaName, 
  validateOrError, 
  validationErrorResponse 
} from "@/lib/validations/game";

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Zod validation
  const validation = validateOrError(schemaName, body);
  if (!validation.success) {
    return NextResponse.json(
      validationErrorResponse(validation.error), 
      { status: 400 }
    );
  }
  
  const { field1, field2 } = validation.data;
  // ... остальная логика
}
```

#### Шаг 3.4: Проверка всех API routes
- [ ] `/api/cheats` — добавить валидацию
- [ ] `/api/inventory` — добавить валидацию
- [ ] `/api/inventory/use` — добавить валидацию
- [ ] `/api/techniques/pool` — добавить валидацию
- [ ] `/api/database/migrate` — добавить валидацию (если нужен body)
- [ ] `/api/database/reset` — добавить валидацию
- [ ] `/api/logs` — добавить валидацию query params
- [ ] `/api/character/data` — добавить валидацию

### ✅ Критерии завершения
1. Все API routes используют Zod валидацию
2. Нет прямого использования `body.field` без валидации
3. Ошибки валидации возвращают 400 с понятным сообщением
4. `bun run lint` без ошибок

---

## 📦 Задача 4: Рефакторинг request-router

### 🎯 Цель
Оптимизация и улучшение читаемости `request-router.ts`.

### 📍 Текущее состояние
```
src/lib/game/request-router.ts — 302 строки
- identifyRequestType() — 56 строк (определение типа запроса)
- routeRequest() — 92 строки (маршрутизация)
- buildStatusResponse() — 27 строк
- buildTechniquesResponse() — 17 строк
- buildStatsResponse() — 21 строк
- buildLocationResponse() — 16 строк
- needsLLM() — 6 строк
```

### 🔨 План выполнения

#### Шаг 4.1: Вынос builder-функций
- [ ] Создать `src/lib/game/response-builders.ts`
- [ ] Перенести `buildStatusResponse`, `buildTechniquesResponse`, `buildStatsResponse`, `buildLocationResponse`

**Структура нового файла:**
```typescript
/**
 * Построители ответов для локальных запросов
 */

import type { Character, WorldTime } from '@/types/game';
import type { Technique } from './techniques';
import type { LocationData } from '@/types/game-shared';

export function buildStatusResponse(
  character: Character | null,
  worldTime: WorldTime | null
): object {
  // ... реализация
}

export function buildTechniquesResponse(techniques: Technique[]): object {
  // ... реализация
}

export function buildStatsResponse(character: Character | null): object {
  // ... реализация
}

export function buildLocationResponse(location: LocationData | null): object {
  // ... реализация
}
```

#### Шаг 4.2: Упрощение identifyRequestType()
- [ ] Группировать regex паттерны по категориям
- [ ] Вынести паттерны в константы

**Пример:**
```typescript
// Паттерны для определения типа запроса
const REQUEST_PATTERNS = {
  status: /^(статус|status|мой статус|!\s*статус)$/i,
  techniques: /^(техники|skills|мои техники|!\s*техники)$/i,
  inventory: /^(инвентарь|inventory|рюкзак|!\s*инвентарь)$/i,
  // ...
} as const;

export function identifyRequestType(input: string): RequestType {
  const normalized = input.toLowerCase().trim();
  
  for (const [type, pattern] of Object.entries(REQUEST_PATTERNS)) {
    if (pattern.test(normalized)) {
      return type as RequestType;
    }
  }
  
  // ... дополнительные проверки
}
```

#### Шаг 4.3: Обновление импортов
- [ ] Обновить импорты в `request-router.ts`
- [ ] Убедиться, что все экспорты работают

#### Шаг 4.4: Документирование
- [ ] Добавить JSDoc для всех функций
- [ ] Обновить комментарии о назначении модуля

### ✅ Критерии завершения
1. `request-router.ts` содержит только логику маршрутизации
2. Builder-функции вынесены в отдельный файл
3. Паттерны организованы в константы
4. Документация актуальна

---

## 🧪 Общая проверка после выполнения всех задач

### Автоматические проверки
```bash
# 1. ESLint
bun run lint
# Ожидается: 0 ошибок

# 2. TypeScript
npx tsc --noEmit
# Ожидается: 0 ошибок

# 3. Поиск оставшихся дублирований
rg "interface LocationData" src/ -n
# Ожидается: только в game-shared.ts

# 4. Проверка Zod схем
rg "validateOrError|validateOrThrow" src/app/api -n
# Ожидается: все API routes используют валидацию
```

### Ручные проверки
- [ ] Проверить запуск игры (Create World)
- [ ] Проверить отправку сообщения в чат
- [ ] Проверить медитацию (накопление Ци)
- [ ] Проверить прорыв
- [ ] Проверить чит-команды
- [ ] Проверить инвентарь

---

## 📊 Метрики успеха

| Метрика | До | После |
|---------|-----|-------|
| Дублирующихся LocationData | 3 | 1 |
| Re-exports в qi-system.ts | 9 | 0 |
| API без Zod валидации | 8 | 0 |
| Строк в request-router.ts | 302 | ~150 |

---

## 📅 Оценка времени

| Задача | Время |
|--------|-------|
| 1. Унификация типов | 1-2 часа |
| 2. Разделение qi-system/qi-shared | 30 мин |
| 3. Zod валидация | 2-3 часа |
| 4. Рефакторинг request-router | 1 час |
| **Итого** | **4-6 часов** |

---

## 🔗 Связанные файлы

- `src/types/game.ts` — Основные типы
- `src/lib/validations/game.ts` — Zod схемы
- `src/lib/game/qi-system.ts` — Серверные действия Ци
- `src/lib/game/qi-shared.ts` — Расчёты Ци
- `src/lib/game/request-router.ts` — Маршрутизатор

---

*Документ создан автоматически. Обновлять при изменении задач.*

---

## 📦 Задача 6: Упрощённая система карты

**Дата добавления:** 2026-02-25
**Дата завершения:** 2026-02-25
**Приоритет:** 🔴 Высокий
**Сложность:** 🟡 Средняя
**Статус:** ✅ Завершено

### 🎯 Цель
Реализовать упрощённую систему хранения карты для текстовой AI-игры без избыточной сложности (секторы/чанки отложены до реальной необходимости).

### 📍 Текущее состояние

**Уже реализовано:**
- ✅ 3D координаты в `world-coordinates.ts` (x, y, z в метрах)
- ✅ Модель `Location` в Prisma с x, y, z полями
- ✅ Базовые функции расчёта расстояний

**Отсутствует:**
- ❌ Тип `locationType` для классификации локаций
- ❌ Модель `Building` для строений
- ❌ Модель `WorldObject` для объектов на карте
- ❌ Синхронизация TypeScript типов с Prisma схемой

### 🏗️ Архитектура решения

```
┌─────────────────────────────────────────────────────────────┐
│                    МИНИМАЛЬНАЯ СХЕМА                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Location (расширение существующей)                         │
│  ├── x, y, z (координаты - уже есть)                       │
│  ├── name, description                                      │
│  ├── qiDensity, terrainType                                 │
│  └── locationType: "region" | "area" | "building" | "room" │
│                                                             │
│  Character/NPC                                              │
│  └── locationId → Location                                  │
│                                                             │
│  Building (новая модель)                                    │
│  └── locationId + rooms[]                                   │
│                                                             │
│  WorldObject (новая модель)                                 │
│  └── locationId или x, y, z                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 🔨 План выполнения

#### Шаг 6.1: Расширение модели Location
- [ ] Добавить поле `locationType` в Prisma схему
- [ ] Добавить поля `width`, `height` для регионов
- [ ] Обновить TypeScript тип `Location` в game.ts

**Prisma схема:**
```prisma
model Location {
  // ... существующие поля ...
  
  // === Тип локации ===
  locationType String @default("area") // region, area, building, room
  
  // === Размеры (для регионов) ===
  width  Int? // Размер области в метрах (x)
  height Int? // Размер области в метрах (y)
}
```

#### Шаг 6.2: Создание модели Building
- [ ] Добавить модель `Building` в Prisma схему
- [ ] Создать TypeScript интерфейс `Building`
- [ ] Добавить связь с Location

**Prisma схема:**
```prisma
model Building {
  id           String   @id @default(cuid())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // === Идентификация ===
  name         String
  nameId       String?   // Для поиска
  description  String?
  buildingType String   @default("house") // house, shop, temple, cave, tower, sect_hq
  
  // === Координаты ===
  locationId   String
  location     Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  // === Размеры ===
  width  Int @default(10)  // Ширина (x) в метрах
  length Int @default(10)  // Длина (y) в метрах
  height Int @default(3)   // Высота (z) в метрах
  
  // === Свойства ===
  isEnterable Boolean @default(true)
  isOwned     Boolean @default(false)
  ownerType   String? // player, npc, sect
  ownerId     String?
  
  // === Бонусы ===
  qiBonus Int @default(0)    // Бонус к медитации
  comfort Int @default(0)    // Комфорт (восстановление)
  defense Int @default(0)    // Защита
  
  // === Связи ===
  rooms  Location[] @relation("BuildingRooms")
  sectId String?
  sect   Sect?     @relation(fields: [sectId], references: [id])
  
  @@index([buildingType])
  @@index([locationId])
}
```

#### Шаг 6.3: Создание модели WorldObject
- [ ] Добавить модель `WorldObject` в Prisma схему
- [ ] Создать TypeScript интерфейс `WorldObject`
- [ ] Добавить связь с Location

**Prisma схема:**
```prisma
model WorldObject {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // === Идентификация ===
  name        String
  nameId      String?
  description String?
  objectType  String // resource, container, interactable, decoration
  
  // === Координаты ===
  locationId String?
  location   Location? @relation(fields: [locationId], references: [id])
  x          Int       @default(0)
  y          Int       @default(0)
  z          Int       @default(0)
  
  // === Свойства ===
  isInteractable Boolean @default(true)
  isCollectible  Boolean @default(false)
  isDestructible Boolean @default(true)
  
  // === Состояние ===
  health     Int @default(100)
  maxHealth  Int @default(100)
  durability Int @default(100)
  
  // === Ресурсы ===
  resourceType  String? // herb, ore, wood, water
  resourceCount Int     @default(1)
  respawnTime   Int     @default(0) // в минутах
  
  // === Контейнер ===
  inventory String? // JSON с предметами
  
  // === Визуал ===
  icon String? // Эмодзи или путь
  
  @@index([objectType])
  @@index([locationId])
}
```

#### Шаг 6.4: Обновление TypeScript типов
- [ ] Добавить типы в `src/types/game.ts`
- [ ] Обновить `src/types/game-shared.ts` при необходимости
- [ ] Создать `src/types/map.ts` для типов карты

**Новые типы:**
```typescript
// === Типы локаций ===
export type LocationType = "region" | "area" | "building" | "room";

// === Типы строений ===
export type BuildingType = "house" | "shop" | "temple" | "cave" | "tower" | "sect_hq";

// === Типы объектов ===
export type ObjectType = "resource" | "container" | "interactable" | "decoration";
export type ResourceType = "herb" | "ore" | "wood" | "water";

// === Интерфейсы ===
export interface Building { ... }
export interface WorldObject { ... }
```

#### Шаг 6.5: Миграция базы данных
- [ ] Выполнить `bun run db:push`
- [ ] Проверить создание таблиц
- [ ] Протестировать связи

#### Шаг 6.6: Создание сервисов
- [ ] Создать `src/services/map.service.ts`
- [ ] Реализовать функции:
  - `getLocationsInRadius(center, radius)`
  - `getBuildingsAtLocation(locationId)`
  - `getObjectsAtLocation(locationId)`
  - `createBuilding(data)`
  - `createWorldObject(data)`

### ✅ Критерии завершения
1. Prisma схема обновлена (Location, Building, WorldObject)
2. TypeScript типы синхронизированы
3. Миграция выполнена без ошибок
4. Базовый map.service.ts создан
5. `bun run lint` без ошибок

### 📊 Метрики

| Показатель | Значение |
|------------|----------|
| Новых таблиц | 2 (Building, WorldObject) |
| Новых полей в Location | 3 (locationType, width, height) |
| Новых TypeScript типов | ~8 |
| Время реализации | 2-3 часа |

### 🔗 Связанные файлы
- `prisma/schema.prisma` — Схема базы данных
- `src/types/game.ts` — Основные типы
- `src/types/map.ts` — Типы карты (новый)
- `src/lib/game/world-coordinates.ts` — Система координат
- `src/services/map.service.ts` — Сервис карты (новый)
