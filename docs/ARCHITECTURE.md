# 🏗️ Архитектура Cultivation World Simulator

> Подробное описание архитектуры, взаимодействий компонентов и потоков данных.
> Версия: 6 | Год: 2026

---

## 📐 Общая архитектура

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   React     │  │   Zustand   │  │  React UI   │                 │
│  │  Components │  │   Stores    │  │  (shadcn)   │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                         │
│         └────────────────┼────────────────┘                         │
│                          ▼                                          │
│                   ┌─────────────┐                                   │
│                   │  useGame()  │  ← Единый хук управления          │
│                   └──────┬──────┘                                   │
└──────────────────────────┼──────────────────────────────────────────┘
                           │ HTTP/WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVER (Next.js API)                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    /api/chat/route.ts                       │   │
│  │              Главный эндпоинт для всех действий             │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│         ┌──────────────────────┼──────────────────────┐            │
│         ▼                      ▼                      ▼            │
│  ┌────────────┐        ┌────────────┐        ┌────────────┐        │
│  │  Services  │        │    LLM     │        │   Game     │        │
│  │   Layer    │        │  Provider  │        │   Logic    │        │
│  └─────┬──────┘        └────────────┘        └─────┬──────┘        │
│        │                                           │                │
│        └─────────────────┬─────────────────────────┘                │
│                          ▼                                          │
│                   ┌─────────────┐                                   │
│                   │   Prisma    │                                   │
│                   │   (SQLite)  │                                   │
│                   └─────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Поток данных

### 1. Обработка действия игрока

```
Player Input
     │
     ▼
┌─────────────────┐
│  API /chat      │
│  route.ts       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  identifyAction │────▶│  Route to       │
│  (local/LLM)    │     │  appropriate    │
└─────────────────┘     │  handler        │
                        └────────┬────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Local Handler  │     │  LLM Handler    │     │  Hybrid Handler │
│  (status, etc)  │     │  (narration)    │     │  (meditation)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                        ┌─────────────────┐
                        │  Update State   │
                        │  (Prisma)       │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Return         │
                        │  characterState │
                        └─────────────────┘
```

### 2. Медитация (пример гибридного обработчика)

```
"Медитировать 2 часа"
         │
         ▼
┌─────────────────────────────────────┐
│  1. Валидация (Zod)                  │
│  2. Расчёт Ци (qi-system.ts)         │
│  3. Расчёт усталости (fatigue-system)│
│  4. Проверка прерывания (meditation) │
│  5. Обновление БД                    │
│  6. Генерация описания (LLM)         │
│  7. Возврат characterState           │
└─────────────────────────────────────┘
```

---

## 📁 Структура модулей

### `/src/lib/game/` - Игровая логика

| Файл | Назначение | Экспорты |
|------|------------|----------|
| `constants.ts` | Единый источник констант | `QI_CONSTANTS`, `FATIGUE_CONSTANTS`, `FATIGUE_RECOVERY_BY_LEVEL` |
| `qi-system.ts` | Система Ци (серверные действия) | `performMeditation()`, `attemptBreakthrough()` |
| `qi-shared.ts` | Общие функции Ци | `calculateQiGain()`, `checkBreakthrough()` |
| `fatigue-system.ts` | Система усталости | `calculateFatigueFromAction()`, `calculateRestRecovery()` |
| `techniques.ts` | Активные техники | `calculateTechniqueEffectiveness()`, `useTechnique()` |
| `cultivation-skills.ts` | Пассивные навыки | `getSkillEffect()`, `calculateSkillsInterruptionModifier()` |
| `formations.ts` | Формации | `getFormationEffect()`, `canCreateFormation()` |
| `technique-learning.ts` | Обучение техникам | `calculateLearningSpeed()`, `processLearning()` |
| `conductivity-system.ts` | Развитие проводимости | `getMaxConductivity()`, `calculateConductivityGainFromMeditation()` |
| `world-coordinates.ts` | 3D координаты | `getDistance3D()`, `getDirection()` |
| `meditation-interruption.ts` | Прерывания медитации | `checkMeditationInterruption()`, `selectInterruptionEvent()` |
| `environment-system.ts` | Влияние окружения | `calculateEnvironmentInfluence()`, `calculateTravelTime()` |
| `entity-system.ts` | Встреченные сущности | `createEntity()`, `calculateMemoryFreshness()` |
| `request-router.ts` | Маршрутизация запросов | `identifyRequestType()`, `routeRequest()` |
| `index.ts` | Экспорты | Все публичные функции |

### `/src/services/` - Сервисный слой

| Файл | Назначение |
|------|------------|
| `game.service.ts` | Основные игровые действия |
| `character.service.ts` | CRUD персонажа, характеристики |
| `world.service.ts` | Управление миром, локации |
| `session.service.ts` | Управление сессиями |
| `game-client.service.ts` | Клиентские API вызовы |

### `/src/data/presets/` - Пресеты данных

| Файл | Содержимое |
|------|------------|
| `technique-presets.ts` | Базовые, продвинутые, редкие техники |
| `skill-presets.ts` | Навыки культивации (пассивные) |
| `formation-presets.ts` | Формации (защитные, накопительные) |
| `character-presets.ts` | Стартовые пресеты персонажей |
| `index.ts` | Унифицированный экспорт, `getStarterPack()` |

---

## 🗄️ Модели данных (Prisma Schema v5)

### Character - Персонаж

```
┌─────────────────────────────────────────┐
│              Character                   │
├─────────────────────────────────────────┤
│ id, name                                │
│ strength, agility, intelligence         │
│ conductivity                             │
│ cultivationLevel, cultivationSubLevel   │
│ coreCapacity, currentQi, accumulatedQi  │
│ health, fatigue, mentalFatigue          │
│ age                                      │
│ cultivationSkills (JSON) ← NEW          │
│ qiUnderstanding ← NEW                   │
│ qiUnderstandingCap ← NEW                │
│ fatigueRecoveryMultiplier ← NEW         │
│ sectId, sectRole                        │
│ contributionPoints, spiritStones        │
└─────────────────────────────────────────┘
```

### Technique - Техника

```
┌─────────────────────────────────────────┐
│              Technique                   │
├─────────────────────────────────────────┤
│ id, name, nameId, description           │
│ type, element, rarity                   │
│ level ← NEW (1-9)                       │
│ minCultivationLevel                     │
│ qiCost, physicalFatigueCost             │
│ mentalFatigueCost                       │
│ statRequirements (JSON) ← NEW           │
│ statScaling (JSON) ← NEW                │
│ effects (JSON)                          │
│ source ← preset/npc/scroll/insight      │
└─────────────────────────────────────────┘
```

### CharacterTechnique - Изученные техники

```
┌─────────────────────────────────────────┐
│         CharacterTechnique               │
├─────────────────────────────────────────┤
│ characterId, techniqueId                │
│ mastery (0-100)                         │
│ learningProgress ← NEW (0-100)          │
│ learningSource ← NEW                    │
│ learningStartedAt ← NEW                 │
└─────────────────────────────────────────┘
```

### Location - Локация

```
┌─────────────────────────────────────────┐
│              Location                    │
├─────────────────────────────────────────┤
│ id, name, description                   │
│ x, y, z ← NEW (3D координаты, метры)    │
│ distanceFromCenter                      │
│ qiDensity, qiFlowRate                   │
│ terrainType                             │
└─────────────────────────────────────────┘
```

---

## ⚙️ Ключевые системы

### Система усталости

```
Уровень 1: Базовое восстановление
Уровень 5: x3 скорость восстановления
Уровень 9: x100 скорость (почти не устаёт)

8 часов сна:
- Уровень 1: ~50% восстановление
- Уровень 5: ~150% восстановление  
- Уровень 9: ~5000% (мгновенное)

Накопление усталости:
- Уровень 1: 100%
- Уровень 5: 40%
- Уровень 9: 1% (в 100 раз медленнее)
```

### Система обучения техникам

```
Источники:
├── preset - автоматически при создании (100% мгновенно)
├── npc - обучение у наставника (10%/час)
├── scroll - изучение свитка (8%/час)
└── insight - прозрение (100% мгновенно)

Штраф за уровень техники:
- Техника = уровень персонажа: без штрафа
- Техника на 1 уровень выше: -20% скорость
- Техника на 2 уровня выше: -40% скорость
- Техника на 3+ уровня выше: минимум 10% скорости

Бонусы:
- Интеллект > 10: +2% за единицу
- Проводимость: +5% за единицу
```

### Система проводимости

```
Максимум по уровням:
1 → 0.5
2 → 1.0
3 → 2.0
4 → 4.0
5 → 8.0
6 → 16.0
7 → 32.0
8 → 64.0
9 → 128.0

Прирост:
- Медитация: +0.01/час
- Использование техники: +0.005 × (qi/10)
- Прорыв: +0.1 × уровень
- Большой прорыв: +0.3 × уровень
```

---

## 🔌 API Эндпоинты

### Основные

| Эндпоинт | Метод | Описание |
|----------|-------|----------|
| `/api/game/start` | POST | Начать новую игру |
| `/api/chat` | POST | Отправить действие |
| `/api/game/state` | GET | Получить состояние |
| `/api/game/save` | POST | Сохранить игру |

### Системные

| Эндпоинт | Метод | Описание |
|----------|-------|----------|
| `/api/database/reset` | POST | Сбросить БД |
| `/api/database/migrate` | POST | Миграция БД |
| `/api/logs` | GET | Системные логи |
| `/api/settings/llm` | GET/POST | Настройки LLM |

---

## 🧩 Принципы дизайна

### 1. Сервер — источник истины

```typescript
// ❌ НЕПРАВИЛЬНО: расчёты на клиенте
const newQi = character.currentQi + gain;

// ✅ ПРАВИЛЬНО: сервер возвращает состояние
const response = await api.chat({ message: "Медитация 1 час" });
setState(response.characterState);
```

### 2. Разделение ответственности

```
API Routes → Валидация (Zod) → Services → Business Logic → Prisma
                ↓
         Error Handling
                ↓
         Response with characterState
```

### 3. Единый источник констант

```typescript
// ❌ НЕПРАВИЛЬНО: магические числа
const recovery = 0.104;

// ✅ ПРАВИЛЬНО: константы из constants.ts
import { FATIGUE_CONSTANTS } from './constants';
const recovery = FATIGUE_CONSTANTS.SLEEP_MENTAL_RECOVERY;
```

---

## 📊 Диаграмма зависимостей

```
page.tsx
    │
    ├── useGame() ──────────┐
    │       │               │
    │       ▼               ▼
    │   game.store.ts   game-client.service.ts
    │                           │
    │                           ▼
    │                      /api/chat
    │                           │
    └───────────────────────────┘
                                │
                                ▼
                         Services Layer
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   game.service.ts    character.service.ts    world.service.ts
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ▼
                         lib/game/*
                                │
        ┌───────────┬───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼           ▼
   constants   qi-system   fatigue-system  techniques  presets
```

---

## 🚀 Расширение системы

### Добавление новой техники

1. Добавить пресет в `src/data/presets/technique-presets.ts`
2. Определить `level`, `statRequirements`, `statScaling`
3. Система автоматически подхватит при следующем запуске

### Добавление нового навыка

1. Добавить в `src/data/presets/skill-presets.ts`
2. Определить `effects` и `prerequisites`
3. Обновить UI при необходимости

### Добавление нового API эндпоинта

1. Создать файл в `src/app/api/.../route.ts`
2. Добавить Zod схему валидации
3. Использовать существующие сервисы
4. Возвращать `characterState` для синхронизации

---

*Архитектура актуальна для версии схемы БД 6 (2026)*
