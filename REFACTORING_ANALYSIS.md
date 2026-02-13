# Анализ замечаний стороннего рефакторинга
## Cultivation World Simulator

**Дата анализа:** 2025-02-13
**Версия проекта:** 0.3.0

---

## 1. Отсутствие полноценной валидации данных

### 🔴 Проблема
Zod указан в зависимостях, но не используется в API-роутах. Входящие данные не валидируются.

### 📍 Текущее состояние
```typescript
// src/app/api/chat/route.ts - строка 72-73
const body = await request.json();
const { sessionId, message } = body;
// Нет валидации! Любые данные проходят.
```

### ⚠️ Риски
- Передача некорректных типов данных
- SQL-инъекции через невалидированные строки
- Ошибки runtime при обращении к несуществующим полям
- Возможность передачи вредоносных данных

### ✅ Предложенное решение

**Файл:** `src/lib/validation/schemas.ts`

```typescript
import { z } from "zod";

// Валидация ID сессии
export const SessionIdSchema = z.string().cuid();

// Валидация сообщения
export const MessageSchema = z.string()
  .min(1, "Сообщение не может быть пустым")
  .max(10000, "Сообщение слишком длинное");

// Схема запроса чата
export const ChatRequestSchema = z.object({
  sessionId: SessionIdSchema,
  message: MessageSchema,
});

// Схема старта игры
export const StartGameRequestSchema = z.object({
  variant: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  customConfig: z.record(z.unknown()).optional(),
  characterName: z.string().min(1).max(50).optional(),
});

// Типы выводятся автоматически
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type StartGameRequest = z.infer<typeof StartGameRequestSchema>;
```

**Применение в API:**

```typescript
// src/app/api/chat/route.ts
import { ChatRequestSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Валидация с понятным ответом об ошибке
  const parseResult = ChatRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { 
        error: "Validation failed", 
        details: parseResult.error.flatten() 
      },
      { status: 400 }
    );
  }
  
  const { sessionId, message } = parseResult.data;
  // ... далее безопасная работа с данными
}
```

### 📊 Оценка
- **Сложность:** Низкая
- **Приоритет:** Высокий (безопасность)
- **Время:** 2-3 часа

---

## 2. Избыточное использование глобального состояния

### 🟡 Проблема
GameChat.tsx получает много пропсов (10+), что усложняет управление.

### 📍 Текущее состояние
```typescript
// src/components/game/GameChat.tsx - строки 12-24
interface GameChatProps {
  messages: Message[];
  character: Character | null;
  worldTime: WorldTime | null;
  location: Location | null;
  isLoading: boolean;
  isPaused: boolean;
  daysSinceStart: number;
  onSendMessage: (message: string) => void;
  onTogglePause: () => void;
  onNewGame: () => void;
  onSaveAndExit: () => void;
}
```

### ⚠️ Риски
- Prop drilling при добавлении новых фич
- Сложность рефакторинга
- Лишние ре-рендеры при изменении любого пропса
- Нарушение принципа DRY

### ✅ Предложенное решение

**Вариант A: Zustand (рекомендуется)**

```typescript
// src/stores/gameStore.ts
import { create } from 'zustand';
import type { Character, Message, WorldTime, Location } from '@/types/game';

interface GameState {
  // Данные
  sessionId: string | null;
  character: Character | null;
  worldTime: WorldTime | null;
  location: Location | null;
  messages: Message[];
  isLoading: boolean;
  isPaused: boolean;
  daysSinceStart: number;
  
  // Действия
  startGame: (variant: 1 | 2 | 3, config?: unknown) => Promise<boolean>;
  sendMessage: (message: string) => Promise<void>;
  togglePause: () => void;
  resetGame: () => void;
  saveAndExit: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  // ... реализация
}));
```

**Использование в компонентах:**

```typescript
// GameChat.tsx - упрощается до минимума
function GameChat() {
  const { 
    messages, 
    character, 
    sendMessage,
    isLoading 
  } = useGameStore();
  
  // Компонент подписывается только на нужные данные
  // Нет пропсов!
}
```

**Вариант B: React Context**

```typescript
// src/contexts/GameContext.tsx
const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const game = useGameLogic(); // Вся логика здесь
  return <GameContext.Provider value={game}>{children}</GameContext.Provider>;
}

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};
```

### 📊 Сравнение подходов

| Критерий | Zustand | Context |
|----------|---------|---------|
| Boilerplate | Меньше | Больше |
| Ре-рендеры | Оптимизированы автоматически | Нужен useMemo/useCallback |
| DevTools | Есть | Нужно подключать отдельно |
| Тестирование | Проще | Сложнее |
| Размер бандла | +2KB | 0KB (встроен) |

### 📊 Оценка
- **Сложность:** Средняя
- **Приоритет:** Средний
- **Время:** 4-6 часов

---

## 3. Оптимизация производительности

### 🟡 Проблема
Отсутствует мемоизация, список сообщений растёт без виртуализации.

### 📍 Текущие проблемы

1. **Нет мемоизации компонентов:**
```typescript
// MessageBubble пересоздаётся при каждом рендере
function MessageBubble({ message }: { message: Message }) {
  // Нет React.memo
}
```

2. **Список сообщений без виртуализации:**
```typescript
// При 100+ сообщениях будет тормозить
{messages.map((message) => (
  <MessageBubble key={message.id} message={message} />
))}
```

### ✅ Предложенное решение

**1. Мемоизация компонентов:**

```typescript
// src/components/game/MessageBubble.tsx
import { memo } from 'react';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  // Компонент не будет ре-рендериться, если message не изменился
  return (
    <div className={/* ... */}>
      {/* ... */}
    </div>
  );
});

// Опционально: кастомное сравнение
const areEqual = (prev: MessageBubbleProps, next: MessageBubbleProps) => {
  return prev.message.id === next.message.id && 
         prev.message.content === next.message.content;
};

export const MessageBubble = memo(MessageBubbleComponent, areEqual);
```

**2. Мемоизация вычислений в GameChat:**

```typescript
import { useMemo, useCallback } from 'react';

function GameChat() {
  const messages = useGameStore(state => state.messages);
  
  // Мемоизация сортировки/фильтрации
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages]);
  
  // Мемоизация обработчиков
  const handleSend = useCallback((msg: string) => {
    sendMessage(msg);
  }, [sendMessage]);
}
```

**3. Virtual Scrolling для сообщений:**

```typescript
// Установка: bun add @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

function MessageList({ messages }: { messages: Message[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Примерная высота сообщения
    overscan: 5, // Количество элементов за пределами видимости
  });
  
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <MessageBubble
            key={messages[virtualItem.index].id}
            message={messages[virtualItem.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

### 📊 Оценка
- **Сложность:** Средняя
- **Приоритет:** Средний (проявится при большом количестве сообщений)
- **Время:** 3-4 часа

---

## 4. Улучшение типизации

### 🟢 Проблема
Типы есть, но можно сделать строже. Нет branded types для ID.

### 📍 Текущее состояние
```typescript
// ID - это просто string
interface Character {
  id: string;  // Можно случайно передать sessionId вместо characterId
  name: string;
  // ...
}
```

### ✅ Предложенное решение

**1. Branded Types для ID:**

```typescript
// src/types/branded.ts
declare const brand: unique symbol;

export type Brand<T, B> = T & { [brand]: B };

export type CharacterId = Brand<string, 'CharacterId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type LocationId = Brand<string, 'LocationId'>;
export type MessageId = Brand<string, 'MessageId'>;

// Фабрики для создания branded типов
export const asCharacterId = (id: string): CharacterId => id as CharacterId;
export const asSessionId = (id: string): SessionId => id as SessionId;

// Валидация
export const isCharacterId = (id: unknown): id is CharacterId => {
  return typeof id === 'string' && id.length > 0;
};
```

**2. Строгие типы для сущностей:**

```typescript
// src/types/game.ts
import { CharacterId, SessionId, LocationId } from './branded';

export interface Character {
  readonly id: CharacterId;  // Теперь нельзя перепутать
  
  // Строгая типизация cultivation level
  cultivationLevel: CultivationLevel;
  cultivationSubLevel: SubLevel;  // 0-9
  
  // Range types
  health: Percentage;  // 0-100
  fatigue: Percentage;
  mentalFatigue: Percentage;
  
  // Non-empty strings
  name: NonEmptyString;
}

// Domain-specific типы
export type CultivationLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type SubLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Percentage = number & { readonly __brand: 'Percentage' };

// Валидация
export const asPercentage = (n: number): Percentage => {
  if (n < 0 || n > 100) throw new Error('Percentage must be 0-100');
  return n as Percentage;
};
```

**3. Дискриминантные объединения:**

```typescript
// Для разных типов ответов сервера
export type ServerResponse = 
  | { type: 'narration'; content: string; characterState?: Partial<Character> }
  | { type: 'system'; content: string }
  | { type: 'error'; error: string; code: ErrorCode }
  | { type: 'interruption'; event: InterruptionEvent; options: ActionOption[] };

// Использование с type guard
function handleResponse(response: ServerResponse) {
  switch (response.type) {
    case 'narration':
      // TypeScript знает, что есть characterState
      break;
    case 'error':
      // TypeScript знает, что есть code
      break;
  }
}
```

### 📊 Оценка
- **Сложность:** Средняя
- **Приоритет:** Средний
- **Время:** 4-5 часов

---

## 5. Проблемы с масштабируемостью

### 5.1 Сложная бизнес-логика в хуках

### 🔴 Проблема
Бизнес-логика смешана с UI-логикой в хуках.

### 📍 Текущее состояние
```typescript
// src/hooks/useGame.ts - логика вперемешку с состоянием
export function useGame() {
  const [state, setState] = useState<GameState>(initialState);

  const startGame = useCallback(async (variant, config) => {
    // API вызов + состояние + обработка ошибок + бизнес-логика
    setState((prev) => ({ ...prev, isLoading: true }));
    const response = await fetch("/api/game/start", ...);
    // ... преобразование данных, форматирование
  }, []);
}
```

### ✅ Предложенное решение

**Разделение на слои:**

```
src/
├── domain/           # Бизнес-логика (чистые функции)
│   ├── character/
│   │   ├── types.ts
│   │   ├── calculations.ts
│   │   └── validators.ts
│   ├── qi/
│   │   ├── calculations.ts
│   │   └── meditation.ts
│   └── game/
│       └── rules.ts
│
├── services/         # Сервисы (оркестрация)
│   ├── GameService.ts
│   ├── CharacterService.ts
│   └── QiService.ts
│
├── hooks/            # Только UI-логика
│   └── useGame.ts
│
└── app/api/          # Только HTTP-слой
```

**Пример разделения:**

```typescript
// domain/character/calculations.ts - чистые функции
export function calculateBreakthroughRequirements(
  character: Character
): BreakthroughRequirements {
  const requiredFills = character.cultivationLevel * 10 + character.cultivationSubLevel;
  const currentFills = Math.floor(character.accumulatedQi / character.coreCapacity);
  // ... расчёты без побочных эффектов
  return { requiredFills, currentFills, /* ... */ };
}

// services/CharacterService.ts - оркестрация
export class CharacterService {
  constructor(private db: PrismaClient) {}
  
  async updateAfterMeditation(
    characterId: string,
    result: MeditationResult
  ): Promise<Character> {
    // Бизнес-логика + работа с БД
    const updates = calculateCharacterUpdates(result);
    return this.db.character.update({
      where: { id: characterId },
      data: updates,
    });
  }
}

// hooks/useGame.ts - только UI
export function useGame() {
  const characterService = useCharacterService();
  
  const meditate = useCallback(async (duration: number) => {
    setState(s => ({ ...s, isLoading: true }));
    try {
      const result = await characterService.meditate(duration);
      setState(s => ({ ...s, character: result.character }));
    } catch (e) {
      setState(s => ({ ...s, error: e.message }));
    }
  }, [characterService]);
}
```

### 📊 Оценка
- **Сложность:** Высокая
- **Приоритет:** Высокий
- **Время:** 8-12 часов

---

### 5.2 Отсутствие разделения на слои

### 🔴 Проблема
Нет чёткого разделения domain/data/presentation.

### ✅ Предложенное решение

**Чистая архитектура:**

```
src/
├── domain/                    # Ядро бизнес-логики
│   ├── entities/              # Сущности
│   │   ├── Character.ts
│   │   ├── Session.ts
│   │   └── Message.ts
│   ├── value-objects/         # Value Objects
│   │   ├── Qi.ts
│   │   ├── CultivationLevel.ts
│   │   └── Time.ts
│   ├── services/              # Domain Services
│   │   ├── QiCalculator.ts
│   │   └── MeditationService.ts
│   └── repositories/          # Интерфейсы репозиториев
│       └── ICharacterRepository.ts
│
├── data/                      # Слой данных
│   ├── repositories/          # Реализация репозиториев
│   │   ├── PrismaCharacterRepository.ts
│   │   └── PrismaSessionRepository.ts
│   └── mappers/               # Мапперы DTO <-> Domain
│       └── CharacterMapper.ts
│
├── application/               # Application Services
│   ├── use-cases/             # Use Cases
│   │   ├── StartGameUseCase.ts
│   │   ├── MeditateUseCase.ts
│   │   └── SendMessageUseCase.ts
│   └── dtos/                  # Data Transfer Objects
│       └── GameSessionDTO.ts
│
└── presentation/              # Презентационный слой
    ├── components/
    ├── hooks/
    └── app/api/               # API endpoints
```

**Пример Use Case:**

```typescript
// application/use-cases/MeditateUseCase.ts
export class MeditateUseCase {
  constructor(
    private characterRepo: ICharacterRepository,
    private sessionRepo: ISessionRepository,
    private qiCalculator: QiCalculator,
  ) {}
  
  async execute(dto: MeditateDTO): Promise<MeditationResult> {
    // 1. Получаем данные
    const character = await this.characterRepo.findById(dto.characterId);
    const session = await this.sessionRepo.findById(dto.sessionId);
    
    // 2. Бизнес-логика
    const location = session.location;
    const result = this.qiCalculator.calculateMeditation(
      character,
      location,
      dto.duration
    );
    
    // 3. Сохраняем изменения
    await this.characterRepo.update(character.id, {
      currentQi: result.newQi,
      fatigue: result.newFatigue,
    });
    
    return result;
  }
}
```

### 📊 Оценка
- **Сложность:** Высокая
- **Приоритет:** Высокий (для долгосрочной поддержки)
- **Время:** 16-24 часа

---

### 5.3 API-роуты напрямую взаимодействуют с БД

### 🔴 Проблема
Нет слоя сервисов, API-роуты содержат бизнес-логику и работу с БД.

### 📍 Текущее состояние
```typescript
// src/app/api/chat/route.ts - ~700 строк!
// Всё в одном файле:
// - Валидация
// - Бизнес-логика
// - Работа с БД
// - LLM интеграция
// - Форматирование ответов
```

### ✅ Предложенное решение

**Слой сервисов:**

```typescript
// src/services/GameService.ts
export class GameService {
  constructor(
    private db: PrismaClient,
    private llmProvider: LLMProvider,
    private logger: Logger,
  ) {}
  
  async processMessage(
    sessionId: string,
    message: string
  ): Promise<GameResponse> {
    // 1. Получаем контекст
    const session = await this.getSessionWithContext(sessionId);
    
    // 2. Определяем тип действия
    const actionType = this.identifyActionType(message);
    
    // 3. Обрабатываем
    switch (actionType) {
      case 'meditation':
        return this.handleMeditation(session, message);
      case 'breakthrough':
        return this.handleBreakthrough(session);
      default:
        return this.handleNarration(session, message);
    }
  }
  
  private async handleMeditation(session, message): Promise<GameResponse> {
    // Чистая бизнес-логика без HTTP-деталей
  }
}

// src/app/api/chat/route.ts - только HTTP слой
import { GameService } from '@/services/GameService';

const gameService = new GameService(db, llmProvider, logger);

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Валидация
  const { sessionId, message } = ChatRequestSchema.parse(body);
  
  // Делегирование сервису
  const response = await gameService.processMessage(sessionId, message);
  
  return NextResponse.json({ success: true, response });
}
```

**Разделение на файлы:**

```
src/app/api/chat/
├── route.ts              # Только HTTP-слой (~50 строк)
└── handlers/
    ├── meditation.ts     # Обработка медитации
    ├── breakthrough.ts   # Обработка прорыва
    ├── combat.ts         # Обработка боя
    └── narration.ts      # Обработка повествования
```

### 📊 Оценка
- **Сложность:** Средняя
- **Приоритет:** Высокий
- **Время:** 6-8 часов

---

## 📋 Приоритеты исправлений

| # | Проблема | Приоритет | Сложность | Время | ROI |
|---|----------|-----------|-----------|-------|-----|
| 1 | Валидация Zod | 🔴 Высокий | Низкая | 2-3ч | ⭐⭐⭐⭐⭐ |
| 5.3 | Слой сервисов | 🔴 Высокий | Средняя | 6-8ч | ⭐⭐⭐⭐⭐ |
| 5.1 | Логика из хуков | 🔴 Высокий | Высокая | 8-12ч | ⭐⭐⭐⭐ |
| 2 | Zustand состояние | 🟡 Средний | Средняя | 4-6ч | ⭐⭐⭐ |
| 3 | Производительность | 🟡 Средний | Средняя | 3-4ч | ⭐⭐⭐ |
| 4 | Типизация | 🟢 Низкий | Средняя | 4-5ч | ⭐⭐ |
| 5.2 | Чистая архитектура | 🟢 Низкий | Высокая | 16-24ч | ⭐⭐ |

## 🎯 Рекомендуемый порядок

1. **Неделя 1:** Валидация Zod + Слой сервисов (критично для безопасности)
2. **Неделя 2:** Вынос логики из хуков + Zustand
3. **Неделя 3:** Оптимизация + Типизация
4. **Неделя 4+:** Чистая архитектура (по мере роста проекта)

---

*Анализ подготовлен для проекта Cultivation World Simulator*
