# План рефакторинга - Высокоприоритетные задачи

## Обзор

Документ содержит детальный план выполнения задач 1, 5.1 и 5.3 из анализа рефакторинга.

---

## Задача 1: Zod валидация в API роутах (2-3 часа)

### Цель
Добавить типобезопасную валидацию входящих запросов с использованием Zod.

### Файлы для создания

#### `src/lib/validations/game.ts`
```typescript
// Схемы валидации для игровых действий
export const sendMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

export const startGameSchema = z.object({
  variant: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  customConfig: z.record(z.unknown()).optional(),
  characterName: z.string().min(1).max(50).optional(),
});

export const saveGameSchema = z.object({
  sessionId: z.string().uuid(),
  isPaused: z.boolean().optional(),
});

export const loadGameSchema = z.object({
  sessionId: z.string().uuid(),
});
```

### Файлы для изменения

#### `src/app/api/chat/route.ts`
- Добавить валидацию body через Zod
- Заменить ручную проверку `if (!sessionId || !message)`
- Добавить типобезопасные error responses

#### `src/app/api/game/start/route.ts`
- Добавить валидацию startGameSchema

#### `src/app/api/game/save/route.ts`
- Добавить валидацию saveGameSchema

#### `src/app/api/game/state/route.ts`
- Добавить валидацию loadGameSchema

### Шаги выполнения

1. **Создать схемы валидации** (30 мин)
   - Создать `src/lib/validations/game.ts`
   - Определить все необходимые схемы
   - Добавить JSDoc комментарии

2. **Применить к chat/route.ts** (45 мин)
   - Импортировать схемы
   - Заменить ручную валидацию
   - Обновить обработку ошибок

3. **Применить к остальным роутам** (45 мин)
   - game/start/route.ts
   - game/save/route.ts
   - game/state/route.ts

4. **Тестирование** (30 мин)
   - Проверить невалидные данные
   - Проверить граничные случаи

### Ожидаемый результат
- Все API роуты валидируют входные данные
- Типобезопасные error responses
- Документация через JSDoc

---

## Задача 5.3: Слой сервисов для API (6-8 часов)

### Цель
Вынести бизнес-логику из API роутов в отдельные сервисы для улучшения тестируемости и повторного использования.

### Структура сервиса

```
src/services/
├── index.ts                    # Экспорты
├── game.service.ts             # Игровые действия (медитация, прорыв)
├── session.service.ts          # Управление сессиями
├── character.service.ts        # Операции с персонажем
└── world.service.ts            # Управление миром (время, локации)
```

### Детализация сервисов

#### `src/services/game.service.ts`
```typescript
export class GameService {
  constructor(
    private db: typeof db,
    private llm: LLMProvider
  ) {}

  async processMeditation(
    character: Character,
    location: Location | null,
    durationMinutes: number
  ): Promise<MeditationResult & { characterUpdate: Partial<Character> }> {
    // Логика медитации
  }

  async processBreakthrough(
    character: Character
  ): Promise<BreakthroughResult & { characterUpdate: Partial<Character> }> {
    // Логика прорыва
  }

  async processCombat(
    character: Character,
    enemy: NPC
  ): Promise<CombatResult> {
    // Логика боя
  }
}
```

#### `src/services/session.service.ts`
```typescript
export class SessionService {
  constructor(private db: typeof db) {}

  async createSession(variant: number, config?: CustomConfig): Promise<GameSession> {
    // Создание новой сессии
  }

  async getSession(sessionId: string): Promise<GameSession | null> {
    // Получение сессии
  }

  async updateWorldTime(sessionId: string, minutes: number): Promise<WorldTime> {
    // Обновление времени
  }

  async saveSession(sessionId: string, data: Partial<SessionData>): Promise<void> {
    // Сохранение
  }
}
```

#### `src/services/character.service.ts`
```typescript
export class CharacterService {
  constructor(private db: typeof db) {}

  async getCharacter(characterId: string): Promise<Character | null> {
    // Получение персонажа
  }

  async updateCharacter(
    characterId: string,
    data: Partial<Character>
  ): Promise<Character> {
    // Обновление персонажа
  }

  async applyFatigue(
    character: Character,
    action: ActionType,
    duration: number
  ): Promise<Partial<Character>> {
    // Применение усталости
  }
}
```

### Шаги выполнения

1. **Создать структуру папок** (15 мин)
   - Создать `src/services/`
   - Создать заготовки файлов

2. **Реализовать CharacterService** (1 ч)
   - Вынести логику из route.ts
   - Методы CRUD для персонажа

3. **Реализовать SessionService** (1.5 ч)
   - Управление сессиями
   - Обновление времени

4. **Реализовать GameService** (2 ч)
   - Медитация
   - Прорыв
   - Бой

5. **Реализовать WorldService** (1 ч)
   - Управление локациями
   - Управление NPC

6. **Рефакторинг route.ts** (1.5 ч)
   - Использовать сервисы
   - Упростить код роута

7. **Тестирование** (1 ч)
   - Проверить функциональность
   - Убедиться в отсутствии регрессий

### Ожидаемый результат
- API роуты содержат только routing и валидацию
- Бизнес-логика в сервисах
- Возможность unit-тестирования сервисов

---

## Задача 5.1: Вынос бизнес-логики из хуков (8-12 часов)

### Цель
Переместить бизнес-логику из React хуков в сервисы, оставив хукам только управление состоянием.

### Проблема
Текущий `useGame.ts` содержит:
- Управление состоянием (нормально)
- Логику формирования запросов (нужно вынести)
- Обработку ответов (нужно упростить)

### Решение

#### `src/services/game-client.service.ts`
```typescript
// Клиентский сервис для работы с API
export class GameClientService {
  private baseUrl = '/api';

  async startGame(
    variant: 1 | 2 | 3,
    customConfig?: Record<string, unknown>,
    characterName?: string
  ): Promise<StartGameResponse> {
    const response = await fetch(`${this.baseUrl}/game/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant, customConfig, characterName }),
    });
    return response.json();
  }

  async sendAction(
    sessionId: string,
    action: string,
    payload?: Record<string, unknown>
  ): Promise<ActionResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: action, ...payload }),
    });
    return response.json();
  }

  async loadGame(sessionId: string): Promise<LoadGameResponse> {
    const response = await fetch(`${this.baseUrl}/game/state?sessionId=${sessionId}`);
    return response.json();
  }

  async saveGame(sessionId: string, isPaused: boolean): Promise<void> {
    await fetch(`${this.baseUrl}/game/save`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, isPaused }),
    });
  }
}
```

#### Обновлённый `useGame.ts`
```typescript
// Хук только управляет состоянием, вся логика в сервисе
export function useGame() {
  const [state, setState] = useState<GameState>(initialState);
  const service = useMemo(() => new GameClientService(), []);

  const startGame = useCallback(async (variant: 1 | 2 | 3, ...args) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const data = await service.startGame(variant, ...args);
      if (!data.success) throw new Error(data.error);
      
      setState(buildStateFromResponse(data));
      return true;
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message }));
      return false;
    }
  }, [service]);

  // Остальные методы аналогично...
}
```

### Шаги выполнения

1. **Создать GameClientService** (2 ч)
   - Определить интерфейсы
   - Реализовать методы API вызовов
   - Добавить обработку ошибок

2. **Создать утилиты для состояния** (1 ч)
   - `buildStateFromResponse()`
   - `mergeCharacterState()`
   - `updateWorldTime()`

3. **Рефакторинг useGame.ts** (3 ч)
   - Использовать сервис
   - Упростить методы
   - Убрать дублирование

4. **Обновить компоненты** (2 ч)
   - Проверить использование хука
   - Исправить если нужно

5. **Добавить кеширование** (2 ч)
   - React Query или SWR для API вызовов
   - Оптимистичные обновления

6. **Тестирование** (2 ч)
   - Проверить все сценарии
   - Убедиться в корректности состояния

### Ожидаемый результат
- Хук содержит только state management
- Логика API вызовов в сервисе
- Возможность легкого тестирования
- Возможность добавления кеширования

---

## Порядок выполнения

1. **Фаза 1: Валидация (Задача 1)** - 2-3 часа
   - Базовая защита API
   - Фундамент для дальнейшей работы

2. **Фаза 2: Сервисы (Задача 5.3)** - 6-8 часов
   - Вынос логики из роутов
   - Улучшение архитектуры

3. **Фаза 3: Хуки (Задача 5.1)** - 8-12 часов
   - Финальный рефакторинг
   - Оптимизация клиента

**Общее время: 16-23 часа**

---

## Метрики успеха

- [ ] Все API роуты имеют Zod валидацию
- [ ] 100% бизнес-логики в сервисах
- [ ] Хуки содержат только state management
- [ ] Нет дублирования кода
- [ ] Все типы типобезопасны
- [ ] Код готов для unit-тестирования
