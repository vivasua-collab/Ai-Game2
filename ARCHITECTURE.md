# Архитектура проекта Cultivation World Simulator

**Версия:** 1.0
**Дата:** 2025-02-13
**Статус:** Утверждено

---

## 🏗️ Основные принципы

### 1. Разделение ответственности (Separation of Concerns)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │  React UI   │   │   Hooks     │   │    Components       │   │
│  │  (Только    │   │ (Только     │   │    (Только          │   │
│  │  отображ.)  │   │  состояние) │   │    отображение)     │   │
│  └─────────────┘   └─────────────┘   └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │  Services   │   │  Use Cases  │   │    Validation       │   │
│  │  (Оркест-   │   │ (Бизнес-    │   │    (Zod schemas)    │   │
│  │  рация)     │   │  сценарии)  │   │                     │   │
│  └─────────────┘   └─────────────┘   └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER                                  │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │  Entities   │   │Value Objects│   │  Domain Services    │   │
│  │ (Character, │   │ (Qi, Level, │   │  (QiCalculator,     │   │
│  │  Session)   │   │  Time)      │   │   MeditationLogic)  │   │
│  └─────────────┘   └─────────────┘   └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                    │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │Repositories │   │   Mappers   │   │   Prisma Client     │   │
│  │ (Интерфейсы)│   │ (DTO ↔ Dom) │   │   (SQLite)          │   │
│  └─────────────┘   └─────────────┘   └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Структура папок

```
src/
├── domain/                        # Доменный слой (БИЗНЕС-ЛОГИКА)
│   ├── character/
│   │   ├── Character.ts           # Сущность
│   │   ├── CharacterId.ts         # Value Object (branded type)
│   │   ├── characterCalculations.ts # Чистые функции расчёта
│   │   └── characterValidators.ts   # Валидация домена
│   │
│   ├── qi/
│   │   ├── Qi.ts                  # Value Object
│   │   ├── qiCalculations.ts      # Расчёты Ци
│   │   ├── meditationTypes.ts     # Типы медитации
│   │   └── breakthroughTypes.ts   # Типы прорыва
│   │
│   ├── session/
│   │   ├── Session.ts             # Сущность
│   │   └── SessionId.ts           # Value Object
│   │
│   └── shared/
│       ├── types.ts               # Общие типы
│       └── constants.ts           # Константы игры
│
├── services/                      # Слой сервисов (ОРКЕСТРАЦИЯ)
│   ├── GameService.ts             # Главный сервис игры
│   ├── CharacterService.ts        # Сервис персонажа
│   ├── QiService.ts               # Сервис Ци
│   ├── MeditationService.ts       # Сервис медитации
│   └── LLMService.ts              # Сервис LLM
│
├── repositories/                  # Репозитории (ДОСТУП К ДАННЫМ)
│   ├── ICharacterRepository.ts    # Интерфейс
│   ├── ISessionRepository.ts      # Интерфейс
│   └── prisma/                    # Реализация через Prisma
│       ├── PrismaCharacterRepository.ts
│       └── PrismaSessionRepository.ts
│
├── validation/                    # Валидация (ZOD)
│   ├── schemas/
│   │   ├── chat.schema.ts
│   │   ├── game.schema.ts
│   │   └── character.schema.ts
│   └── index.ts
│
├── hooks/                         # React хуки (ТОЛЬКО UI)
│   ├── useGame.ts                 # Состояние игры
│   └── useUI.ts                   # UI состояние
│
├── components/                    # React компоненты
│   ├── game/
│   ├── start/
│   └── ui/
│
├── stores/                        # Zustand stores
│   └── gameStore.ts
│
├── types/                         # Общие TypeScript типы
│   └── game.ts
│
└── app/api/                       # API routes (ТОЛЬКО HTTP)
    ├── chat/
    │   ├── route.ts               # ~30 строк (валидация + вызов сервиса)
    │   └── handlers/              # Обработчики (если нужно)
    │
    └── game/
        ├── start/
        │   └── route.ts
        └── state/
            └── route.ts
```

---

## 🔄 Поток данных

### Пример: Медитация

```
1. UI: Пользователь вводит "медитация 1 час"
          │
          ▼
2. Hook: useGame.sendAction("медитация 1 час")
          │
          ▼
3. API:  POST /api/chat
          │ { sessionId, message }
          ▼
4. VALIDATION: ChatRequestSchema.parse(body)
          │
          ▼
5. SERVICE: GameService.processMessage(sessionId, message)
          │
          ├─→ Определение типа: "meditation"
          │
          └─→ MeditationService.meditate(character, duration)
                    │
                    ├─→ QiCalculator.calculateQiRates()
                    │
                    ├─→ CharacterRepository.update()
                    │
                    └─→ Возврат MeditationResult
          │
          ▼
6. API:  Response { success, characterState, content }
          │
          ▼
7. Hook: useGame обновляет состояние
          │
          ▼
8. UI:    Компонент отображает результат
```

---

## ✅ Правила разработки

### ОБЯЗАТЕЛЬНО:

1. **Валидация** - Все входящие данные валидируются через Zod
2. **Сервисы** - Бизнес-логика ТОЛЬКО в сервисах, не в хуках/компонентах
3. **Типы** - Использовать branded types для ID
4. **Чистые функции** - Расчёты в domain/ - без побочных эффектов
5. **Репозитории** - БД только через репозитории
6. **API** - Роуты не более 50-100 строк

### ЗАПРЕЩЕНО:

1. ❌ Прямые запросы к БД из API-роутов
2. ❌ Бизнес-логика в React-хурах
3. ❌ Использование `any` без крайней необходимости
4. ❌ Пропсы более 5 параметров (использовать Zustand/Context)
5. ❌ Мутация состояния напрямую

---

## 🧪 Тестирование

```
tests/
├── unit/                    # Unit тесты
│   ├── domain/
│   │   ├── qiCalculations.test.ts
│   │   └── characterCalculations.test.ts
│   │
│   └── services/
│       └── MeditationService.test.ts
│
├── integration/             # Integration тесты
│   └── api/
│       └── chat.test.ts
│
└── e2e/                     # E2E тесты
    └── game-flow.test.ts
```

---

## 📊 Метрики качества

| Метрика | Цель |
|---------|------|
| Размер API-роута | < 100 строк |
| Размер компонента | < 300 строк |
| Покрытие тестами domain/ | > 80% |
| Покрытие тестами services/ | > 70% |
| Размер функции | < 50 строк |

---

## 🔗 Связанные документы

- [REFACTORING_ANALYSIS.md](./REFACTORING_ANALYSIS.md) - Анализ замечаний
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - План имплементации
- [worklog.md](./worklog.md) - Лог разработки

---

*Документ обновляется при изменении архитектуры проекта*
