# 📚 СПРАВОЧНИК: Cultivation World Simulator

**Последнее обновление:** 2026-02-24

---

## ⚠️ Текущие проблемы

### 1. TypeScript ошибки (~60)
**Проблема:** `npx tsc --noEmit` падает с ошибками типизации

**Основные категории:**
- Logger: error как string вместо Error
- Logger: неизвестные поля в details
- Prisma: location выводится как never
- Prisma: orderBy типы

**Решение:** См. docs/PLAN.md (Фаза 1)

### 2. Версия схемы БД
**Проблема:** schema.prisma v4, SCHEMA_VERSION = 3
**Файл:** src/lib/migrations.ts

---

## 📖 Инструкция для следующего агента

### Приоритетные задачи (Фаза 1)

#### 1. Исправление системы логирования
**Файл:** `src/lib/logger/index.ts`

```typescript
// 1. Расширить LogDetails
export interface LogDetails {
  sessionId?: string;
  error?: Error | string;  // Принимать и string
  stack?: string;
  duration?: number;
  [key: string]: unknown;  // Кастомные поля
}

// 2. Добавить категорию CHEATS
export type LogCategory =
  | 'SYSTEM' | 'API' | 'LLM' | 'GAME'
  | 'DATABASE' | 'UI' | 'AUTH'
  | 'CHEATS'  // Новая категория
  | 'UNKNOWN';
```

#### 2. Исправление Prisma типизации
**Файлы:** `src/app/api/chat/route.ts`, `src/app/api/game/start/route.ts`

```typescript
// Добавить явную типизацию
const location = await db.location.findUnique({
  where: { id: session.character.currentLocationId },
}) as Location | null;
```

#### 3. Исправление orderBy в logs API
**Файл:** `src/app/api/logs/route.ts`

```typescript
// Было
orderBy: { createdAt: 'desc' }

// Стало
orderBy: { createdAt: 'desc' as const }
```

### Команды для проверки

```bash
# Проверка TypeScript
bun run tsc --noEmit

# Проверка линтера
bun run lint

# Запуск dev сервера
bun run dev
```

### Инструкции для агента

1. **Начинать с Фазы 1** - критические TypeScript ошибки
2. **После каждого исправления** - запускать `bun run lint`
3. **Перед завершением** - `npx tsc --noEmit` должен пройти без ошибок
4. **Обновлять статус** в docs/PLAN.md

---

## 📁 Структура проекта

### Игровые механики (src/lib/game/)
```
├── constants.ts           # Единый источник констант
├── qi-system.ts          # Система Ци (серверные действия)
├── qi-shared.ts          # Общие функции Ци (расчёты)
├── qi-insight.ts         # Прозрение
├── fatigue-system.ts     # Система усталости
├── techniques.ts         # Активные техники
├── cultivation-skills.ts # Пассивные навыки
├── formations.ts         # Формации
├── technique-learning.ts # Обучение техникам
├── conductivity-system.ts# Развитие проводимости
├── world-coordinates.ts  # 3D координаты
├── meditation-interruption.ts
├── environment-system.ts
├── entity-system.ts
├── request-router.ts
└── index.ts              # Экспорты
```

### Система промптов (src/prompts/)
```
├── templates/            # .md шаблоны
│   ├── system/           # base.md, commands.md, output-format.md, world-rules.md
│   ├── scenarios/        # sect-start.md, random-start.md, custom-start.md
│   └── injections/       # character-state.md, cultivation-levels.md, location-context.md
├── loader.ts             # Загрузчик шаблонов
├── builder.ts            # Сборка с плейсхолдерами
├── optimizer.ts          # Сжатие токенов
├── cache.ts              # Кэширование
└── index.ts              # Экспорты
```

### Сервисы (src/services/)
```
├── technique-pool.service.ts  # Сервис пула техник
├── cheats.service.ts          # Чит-команды
├── game.service.ts
├── character.service.ts
├── session.service.ts
├── world.service.ts
└── index.ts
```

### API Endpoints (src/app/api/)
```
├── techniques/pool/      # API пула техник
├── cheats/               # API читов
├── chat/
├── game/
├── logs/
├── database/
├── settings/
└── llm/
```

---

## 🔧 Ключевые файлы

| Файл | Назначение |
|------|------------|
| `prisma/schema.prisma` | Схема базы данных |
| `src/types/game.ts` | Общие типы игры |
| `src/stores/game.store.ts` | Zustand стор |
| `src/lib/logger/index.ts` | Система логирования |
| `src/data/prompts/game-master.ts` | Промпт для LLM |

---

## 📚 Подробная документация

### FUNCTIONS.md
Полный перечень всех функций проекта (1109 строк).
См. **docs/FUNCTIONS.md**

### CHEATS.md
Чит-команды для тестирования.
См. **docs/CHEATS.md**

---

## 🔗 Связанные документы

- **PLAN.md** - Единый план развития
- **COMPLETED.md** - Выполненные задачи
- **FUNCTIONS.md** - Перечень всех функций (справочник)
- **CHEATS.md** - Чит-команды для тестирования
