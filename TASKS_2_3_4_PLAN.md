# План задач 2, 3, 4

## Текущее состояние

### Проблема Props Drilling (Задача 2)
```typescript
// GameChatProps - 10 пропсов!
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

### Проблема производительности (Задача 3)
- MessageBubble не мемоизирован → ре-рендер всех сообщений
- `messages.map()` без виртуализации → проблемы при 100+ сообщениях
- StatusBar пересчитывает qiPercent каждый рендер

### Проблема типобезопасности (Задача 4)
```typescript
// Все ID - простые строки, нет защиты от путаницы
characterId: string
sessionId: string
locationId: string
// Можно случайно перепутать!
```

---

## Задача 2: Zustand вместо пропсов

### Цель
Устранить props drilling, создать глобальное хранилище состояния игры.

### Варианты реализации

#### Вариант A: Zustand Store (Рекомендуется)
**Плюсы:**
- Минимальный boilerplate
- Не требует Provider
- Отличная интеграция с React DevTools
- Меньше ре-рендеров чем Context

**Минусы:**
- Внешняя зависимость (уже установлена)

**Структура:**
```typescript
// src/stores/game.store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface GameStore {
  // State
  sessionId: string | null;
  character: Character | null;
  worldTime: WorldTime | null;
  location: Location | null;
  messages: Message[];
  isLoading: boolean;
  isPaused: boolean;
  error: string | null;
  daysSinceStart: number;
  
  // Actions
  startGame: (variant: 1|2|3, config?: Config) => Promise<boolean>;
  loadGame: (sessionId: string) => Promise<boolean>;
  sendAction: (action: string) => Promise<void>;
  togglePause: () => void;
  resetGame: () => void;
  clearError: () => void;
}

export const useGameStore = create<GameStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        sessionId: null,
        character: null,
        // ...actions
      }),
      { name: 'game-storage' }
    )
  )
);
```

#### Вариант B: React Context + useReducer
**Плюсы:**
- Встроено в React
- Понятная модель

**Минусы:**
- Больше boilerplate
- Provider wrapper обязателен
- Ре-рендеры всех потребителей при изменении

### TODO для Задачи 2

| # | Действие | Время | Приоритет |
|---|----------|-------|-----------|
| 2.1 | Установить zustand (если нет) | 5 мин | Высокий |
| 2.2 | Создать `src/stores/game.store.ts` | 30 мин | Высокий |
| 2.3 | Перенести логику из useGame в store | 45 мин | Высокий |
| 2.4 | Создать selectors для оптимизации | 20 мин | Средний |
| 2.5 | Обновить GameChat - убрать пропсы | 30 мин | Высокий |
| 2.6 | Обновить дочерние компоненты | 30 мин | Средний |
| 2.7 | Добавить devtools middleware | 10 мин | Низкий |
| 2.8 | Тестирование | 20 мин | Высокий |

**Итого: ~3 часа**

---

## Задача 3: Мемоизация + Virtual Scroll

### Цель
Оптимизация производительности для работы с большими списками сообщений.

### Варианты реализации

#### 3.1 Мемоизация компонентов

**Компоненты для мемоизации:**
```typescript
// MessageBubble - обернуть в React.memo
const MessageBubble = React.memo(function MessageBubble({ message }: { message: Message }) {
  // ...
}, (prev, next) => prev.message.id === next.message.id);

// StatusBar - useMemo для расчётов
function StatusBar() {
  const character = useGameStore(s => s.character);
  const qiPercent = useMemo(() => 
    character ? (character.currentQi / character.coreCapacity) * 100 : 0,
    [character?.currentQi, character?.coreCapacity]
  );
}

// CharacterPanel - мемоизация всего компонента
const CharacterPanel = React.memo(function CharacterPanel({ ... }) { ... });
```

#### 3.2 Virtual Scroll

**Вариант A: @tanstack/react-virtual (Рекомендуется)**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function MessageList() {
  const messages = useGameStore(s => s.messages);
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // примерная высота сообщения
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div key={virtualRow.key} style={{ position: 'absolute', top: virtualRow.start }}>
            <MessageBubble message={messages[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Плюсы:**
- Headless (без стилей)
- Отличная производительность
- Гибкость

**Вариант B: react-window**
```typescript
import { VariableSizeList } from 'react-window';

<VariableSizeList
  height={600}
  itemCount={messages.length}
  itemSize={index => estimateMessageHeight(messages[index])}
>
  {({ index, style }) => (
    <div style={style}>
      <MessageBubble message={messages[index]} />
    </div>
  )}
</VariableSizeList>
```

### TODO для Задачи 3

| # | Действие | Время | Приоритет |
|---|----------|-------|-----------|
| 3.1 | Установить @tanstack/react-virtual | 5 мин | Высокий |
| 3.2 | Создать `MessageBubble.memo.tsx` | 15 мин | Высокий |
| 3.3 | Создать `VirtualMessageList.tsx` | 30 мин | Высокий |
| 3.4 | Добавить useMemo в StatusBar | 10 мин | Средний |
| 3.5 | Добавить useMemo в CharacterPanel | 15 мин | Средний |
| 3.6 | Мемоизировать SideMenu | 10 мин | Низкий |
| 3.7 | Добавить useCallback для handlers | 15 мин | Средний |
| 3.8 | Тестирование производительности | 20 мин | Высокий |

**Итого: ~2 часа**

---

## Задача 4: Branded Types

### Цель
Создать типобезопасные ID для исключения путаницы между разными сущностями.

### Варианты реализации

#### Вариант A: Branded Types с Zod (Рекомендуется)
```typescript
// src/types/branded.ts
import { z } from 'zod';

// Базовый branded type
declare const brand: unique symbol;
type Brand<T, TBrand> = T & { [brand]: TBrand };

// Конкретные типы ID
export type SessionId = Brand<string, 'SessionId'>;
export type CharacterId = Brand<string, 'CharacterId'>;
export type LocationId = Brand<string, 'LocationId'>;
export type MessageId = Brand<string, 'MessageId'>;
export type SectId = Brand<string, 'SectId'>;
export type NPCId = Brand<string, 'NPCId'>;

// Zod схемы для валидации
export const sessionIdSchema = z.string().brand<'SessionId'>();
export const characterIdSchema = z.string().brand<'CharacterId'>();
export const locationIdSchema = z.string().brand<'LocationId'>();

// Хелперы для создания
export const asSessionId = (s: string) => s as SessionId;
export const asCharacterId = (s: string) => s as CharacterId;
export const asLocationId = (s: string) => s as LocationId;
```

**Использование:**
```typescript
interface Character {
  id: CharacterId;           // Типобезопасно!
  name: string;
  currentLocationId?: LocationId;
  sectId?: SectId;
}

interface GameSession {
  id: SessionId;
  characterId: CharacterId;  // Нельзя перепутать с locationId!
}

// Ошибка компиляции при путанице:
function getLocation(id: LocationId) { ... }
getLocation(character.id);  // ❌ Ошибка типа!
```

#### Вариант B:Opaque Types (проще)
```typescript
// Более простой вариант без Zod
type SessionId = string & { readonly __brand: unique symbol };
type CharacterId = string & { readonly __brand: unique symbol };

// Но меньше возможностей для валидации
```

### TODO для Задачи 4

| # | Действие | Время | Приоритет |
|---|----------|-------|-----------|
| 4.1 | Создать `src/types/branded.ts` | 20 мин | Высокий |
| 4.2 | Обновить `src/types/game.ts` | 30 мин | Высокий |
| 4.3 | Обновить Zod схемы валидации | 30 мин | Высокий |
| 4.4 | Обновить Prisma типы (если нужно) | 20 мин | Средний |
| 4.5 | Обновить сервисы | 30 мин | Средний |
| 4.6 | Обновить API роуты | 20 мин | Средний |
| 4.7 | Обновить компоненты | 20 мин | Низкий |
| 4.8 | Тестирование типами | 15 мин | Высокий |

**Итого: ~3 часа**

---

## Общий план выполнения

### Фаза 1: Zustand (Задача 2) - 3 часа
```
src/stores/
├── game.store.ts          # Основной store
├── selectors.ts           # Optimized selectors
└── index.ts               # Exports
```

### Фаза 2: Branded Types (Задача 4) - 3 часа
```
src/types/
├── branded.ts             # Branded types + helpers
├── game.ts                # Обновлённые типы
└── index.ts               # Exports
```

### Фаза 3: Performance (Задача 3) - 2 часа
```
src/components/game/
├── MessageBubble.memo.tsx # Мемоизированный компонент
├── VirtualMessageList.tsx # Virtual scroll
├── StatusBar.memo.tsx     # Оптимизированный статус
└── GameChat.tsx           # Обновлённый главный компонент
```

---

## Итого

| Задача | Время | Сложность |
|--------|-------|-----------|
| 2. Zustand | 3 ч | Средняя |
| 3. Memo+Virtual | 2 ч | Средняя |
| 4. Branded Types | 3 ч | Низкая |
| **Всего** | **8 ч** | |

## Зависимости для установки

```bash
bun add zustand @tanstack/react-virtual
# zustand уже может быть установлен
```

## Рекомендуемый порядок

1. **Задача 4** (Branded Types) - база для остальных
2. **Задача 2** (Zustand) - архитектурно важная
3. **Задача 3** (Performance) - оптимизация в конце
