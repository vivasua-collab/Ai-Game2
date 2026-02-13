# Work Log - Cultivation World Simulator

## Project Overview
Репозиторий: https://github.com/vivasua-collab/Ai-Game2.git
Текущая ветка: master → будет создана master2

---
Task ID: 1
Agent: Main Coordinator
Task: Инициализация проекта, создание worklog, документация архитектуры

Work Log:
- Проверено текущее состояние проекта
- Проанализирована архитектура (frontend/backend разделение)
- Создан worklog.md

Stage Summary:
- Проект инициализирован
- Архитектура: сервер - источник истины, клиент только отображает
- Ключевые файлы: src/types/game.ts, src/lib/game/qi-system.ts, src/hooks/useGame.ts

---
## Архитектура проекта

### Структура файлов

```
src/
├── types/
│   └── game.ts              # Общие типы (Character, GameState, ServerResponse)
│
├── lib/
│   └── game/
│       ├── constants.ts     # Константы игры (QI_CONSTANTS и др.)
│       ├── qi-shared.ts     # Общие функции расчёта (чистые функции)
│       ├── qi-system.ts     # Серверные действия (meditation, breakthrough)
│       ├── fatigue-system.ts # Система усталости
│       ├── request-router.ts # Маршрутизация запросов
│       └── meditation-interruption.ts # Прерывания медитации
│
├── hooks/
│   └── useGame.ts           # Управление состоянием (БЕЗ расчётов!)
│
├── app/
│   └── api/
│       └── chat/
│           └── route.ts     # Главный API роут
│
└── components/
    └── game/
        └── GameChat.tsx     # UI компонент
```

### Ключевые принципы

1. **Сервер - источник истины**
   - Все расчёты происходят на сервере
   - Клиент только отображает данные
   - API возвращает `characterState` вместо дельт

2. **Разделение ответственности**
   - `qi-shared.ts` - чистые функции расчёта (используются и сервером, и клиентом для отображения)
   - `qi-system.ts` - серверные действия (изменяют БД)
   - `useGame.ts` - только управление состоянием React

3. **Поток данных**
   ```
   User Action → API → Business Logic → Database → Response with characterState
                    ↓
              Client updates state from response
   ```

### Высокоприоритетные задачи

#### Задача 1: Zod валидация (2-3 ч)
- Добавить Zod схемы для входящих запросов
- Валидация в API роутах
- Типобезопасные error responses

#### Задача 5.3: Слой сервисов (6-8 ч)
- Создать `src/services/` папку
- Вынести логику из API роутов в сервисы
- Dependency injection для тестирования

#### Задача 5.1: Вынос бизнес-логики из хуков (8-12 ч)
- Создать `src/services/game-service.ts`
- Переместить логику из useGame.ts
- Хук только вызывает сервис

---

## Detailed Task Breakdown

### Task 1: Zod Validation

**Files to modify:**
- `src/app/api/chat/route.ts`
- `src/app/api/game/start/route.ts`
- `src/app/api/game/save/route.ts`
- `src/app/api/game/state/route.ts`

**New files:**
- `src/lib/validations/game.ts` - Zod schemas

**Steps:**
1. Install zod (already in project)
2. Create validation schemas
3. Apply to all API routes
4. Add error handling

### Task 5.3: API Service Layer

**New structure:**
```
src/services/
├── game.service.ts       # Game actions (meditation, breakthrough)
├── session.service.ts    # Session management
├── character.service.ts  # Character CRUD
└── index.ts             # Exports
```

**Steps:**
1. Create services folder
2. Extract logic from chat/route.ts
3. Create service methods
4. Refactor routes to use services

### Task 5.1: Business Logic from Hooks

**New structure:**
```
src/services/
└── game-client.service.ts  # Client-side game logic
```

**Steps:**
1. Create client service
2. Move logic from useGame.ts
3. Update hook to use service
4. Ensure server remains source of truth
