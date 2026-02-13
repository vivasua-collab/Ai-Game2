# План имплементации высокоприоритетных задач

**Ветка:** master2
**Дата создания:** 2025-02-13
**Статус:** В работе

---

## 📋 Обзор задач

| ID | Задача | Приоритет | Время | Статус |
|----|--------|-----------|-------|--------|
| 1 | Валидация данных (Zod) | 🔴 Критический | 2-3 ч | ⏳ Ожидает |
| 5.3 | Слой сервисов для API | 🔴 Критический | 6-8 ч | ⏳ Ожидает |
| 5.1 | Вынос логики из хуков | 🔴 Высокий | 8-12 ч | ⏳ Ожидает |

**Общее время:** 16-23 часа

---

## 🔴 ЗАДАЧА 1: Валидация данных (Zod)

### Декомпозиция

```
ЗАДАЧА 1: Валидация данных
├── 1.1 Создать схему валидации для API чата
│   ├── 1.1.1 Создать src/validation/schemas/chat.schema.ts
│   ├── 1.1.2 Определить ChatRequestSchema
│   └── 1.1.3 Определить ChatResponseSchema
│
├── 1.2 Создать схему валидации для игровых действий
│   ├── 1.2.1 Создать src/validation/schemas/game.schema.ts
│   ├── 1.2.2 Определить StartGameSchema
│   ├── 1.2.3 Определить LoadGameSchema
│   └── 1.2.4 Определить SaveGameSchema
│
├── 1.3 Создать схему валидации для персонажа
│   ├── 1.3.1 Создать src/validation/schemas/character.schema.ts
│   ├── 1.3.2 Определить CharacterIdSchema (branded)
│   └── 1.3.3 Определить UpdateCharacterSchema
│
└── 1.4 Интегрировать валидацию в API-роуты
    ├── 1.4.1 Обновить /api/chat/route.ts
    ├── 1.4.2 Обновить /api/game/start/route.ts
    ├── 1.4.3 Обновить /api/game/state/route.ts
    └── 1.4.4 Обновить /api/game/save/route.ts
```

### Подзадачи

#### 1.1 Схема валидации для API чата

**Файл:** `src/validation/schemas/chat.schema.ts`

```typescript
import { z } from 'zod';

// Базовые схемы
export const SessionIdSchema = z.string().cuid('Неверный формат ID сессии');

export const MessageSchema = z.string()
  .min(1, 'Сообщение не может быть пустым')
  .max(10000, 'Сообщение слишком длинное (макс. 10000 символов)');

// Схема запроса чата
export const ChatRequestSchema = z.object({
  sessionId: SessionIdSchema,
  message: MessageSchema,
});

// Схема ответа
export const ChatResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  response: z.object({
    type: z.enum(['narration', 'system', 'error', 'interruption']),
    content: z.string(),
    characterState: z.record(z.unknown()).optional(),
    timeAdvance: z.object({
      minutes: z.number().optional(),
      hours: z.number().optional(),
      days: z.number().optional(),
    }).optional(),
    requiresRestart: z.boolean().optional(),
  }),
  updatedTime: z.object({
    year: z.number(),
    month: z.number(),
    day: z.number(),
    hour: z.number(),
    minute: z.number(),
    daysSinceStart: z.number(),
  }).nullable(),
});

// Типы
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
```

#### 1.2 Схема валидации для игровых действий

**Файл:** `src/validation/schemas/game.schema.ts`

```typescript
import { z } from 'zod';

// Варианты старта
export const StartVariantSchema = z.union([
  z.literal(1),  // Секта
  z.literal(2),  // Свободный
  z.literal(3),  // Кастомный
]);

// Схема запроса старта игры
export const StartGameRequestSchema = z.object({
  variant: StartVariantSchema,
  customConfig: z.record(z.unknown()).optional(),
  characterName: z.string()
    .min(1, 'Имя не может быть пустым')
    .max(50, 'Имя слишком длинное')
    .optional(),
});

// Схема запроса загрузки
export const LoadGameRequestSchema = z.object({
  sessionId: z.string().cuid(),
});

// Схема запроса сохранения
export const SaveGameRequestSchema = z.object({
  sessionId: z.string().cuid(),
  isPaused: z.boolean().optional(),
});

// Типы
export type StartGameRequest = z.infer<typeof StartGameRequestSchema>;
export type LoadGameRequest = z.infer<typeof LoadGameRequestSchema>;
export type SaveGameRequest = z.infer<typeof SaveGameRequestSchema>;
```

#### 1.4 Интеграция в API-роуты

**Файл:** `src/app/api/chat/route.ts` (изменения)

```typescript
import { ChatRequestSchema } from '@/validation/schemas/chat.schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // ✅ ВАЛИДАЦИЯ
    const parseResult = ChatRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }
    
    const { sessionId, message } = parseResult.data;
    
    // Далее безопасная работа с провалидированными данными...
  }
}
```

### Критерии приёмки

- [ ] Все API-роуты используют Zod-валидацию
- [ ] Возвращаются понятные сообщения об ошибках
- [ ] Нет прямого доступа к непроверенным данным
- [ ] Lint проходит без ошибок
- [ ] Тесты на валидацию проходят

---

## 🔴 ЗАДАЧА 5.3: Слой сервисов для API

### Декомпозиция

```
ЗАДАЧА 5.3: Слой сервисов
├── 5.3.1 Создать базовую структуру сервисов
│   ├── 5.3.1.1 Создать src/services/GameService.ts
│   ├── 5.3.1.2 Создать src/services/CharacterService.ts
│   └── 5.3.1.3 Создать src/services/MeditationService.ts
│
├── 5.3.2 Создать репозитории
│   ├── 5.3.2.1 Создать src/repositories/ICharacterRepository.ts
│   ├── 5.3.2.2 Создать src/repositories/ISessionRepository.ts
│   ├── 5.3.2.3 Создать src/repositories/prisma/PrismaCharacterRepository.ts
│   └── 5.3.2.4 Создать src/repositories/prisma/PrismaSessionRepository.ts
│
├── 5.3.3 Рефакторинг API-роутов
│   ├── 5.3.3.1 Рефакторинг /api/chat/route.ts
│   ├── 5.3.3.2 Рефакторинг /api/game/start/route.ts
│   ├── 5.3.3.3 Рефакторинг /api/game/state/route.ts
│   └── 5.3.3.4 Рефакторинг /api/game/save/route.ts
│
└── 5.3.4 Создать фабрику сервисов
    └── 5.3.4.1 Создать src/services/ServiceFactory.ts
```

### Подзадачи

#### 5.3.1.1 GameService

**Файл:** `src/services/GameService.ts`

```typescript
import type { Character, Session, Location } from '@/types/game';
import type { ChatRequest, ChatResponse } from '@/validation/schemas/chat.schema';
import { CharacterRepository } from '@/repositories/ICharacterRepository';
import { SessionRepository } from '@/repositories/ISessionRepository';
import { MeditationService } from './MeditationService';
import { LLMService } from './LLMService';

export class GameService {
  constructor(
    private characterRepo: CharacterRepository,
    private sessionRepo: SessionRepository,
    private meditationService: MeditationService,
    private llmService: LLMService,
  ) {}

  /**
   * Обработка сообщения от игрока
   */
  async processMessage(
    sessionId: string,
    message: string
  ): Promise<ChatResponse> {
    // 1. Получаем контекст
    const context = await this.getSessionContext(sessionId);
    
    // 2. Определяем тип действия
    const actionType = this.identifyActionType(message);
    
    // 3. Обрабатываем
    switch (actionType) {
      case 'meditation':
        return this.meditationService.handleMeditation(context, message);
      case 'breakthrough':
        return this.meditationService.handleBreakthrough(context);
      case 'status':
        return this.handleStatusQuery(context);
      case 'world_restart':
        return this.handleWorldRestart(sessionId);
      default:
        return this.llmService.generateNarration(context, message);
    }
  }

  /**
   * Получение полного контекста сессии
   */
  private async getSessionContext(sessionId: string) {
    const session = await this.sessionRepo.findById(sessionId);
    const character = await this.characterRepo.findById(session.characterId);
    const location = character.currentLocationId
      ? await this.locationRepo.findById(character.currentLocationId)
      : null;
    
    return { session, character, location };
  }

  /**
   * Определение типа действия по сообщению
   */
  private identifyActionType(message: string): ActionType {
    const lower = message.toLowerCase().trim();
    
    if (/медитир|культивир|накоп.*ци/.test(lower)) return 'meditation';
    if (/прорыв|breakthrough/.test(lower)) return 'breakthrough';
    if (/^статус|status$/.test(lower)) return 'status';
    if (/перезапуск мира/.test(lower)) return 'world_restart';
    
    return 'narration';
  }
}
```

#### 5.3.2.1 Interface Repository

**Файл:** `src/repositories/ICharacterRepository.ts`

```typescript
import type { Character } from '@/types/game';

export interface ICharacterRepository {
  findById(id: string): Promise<Character | null>;
  findBySessionId(sessionId: string): Promise<Character | null>;
  update(id: string, data: Partial<Character>): Promise<Character>;
  create(data: Omit<Character, 'id'>): Promise<Character>;
  delete(id: string): Promise<void>;
}
```

#### 5.3.2.3 Prisma Implementation

**Файл:** `src/repositories/prisma/PrismaCharacterRepository.ts`

```typescript
import { db } from '@/lib/db';
import type { ICharacterRepository } from '../ICharacterRepository';
import type { Character } from '@/types/game';

export class PrismaCharacterRepository implements ICharacterRepository {
  async findById(id: string): Promise<Character | null> {
    const char = await db.character.findUnique({ where: { id } });
    return char ? this.toDomain(char) : null;
  }

  async update(id: string, data: Partial<Character>): Promise<Character> {
    const char = await db.character.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
    return this.toDomain(char);
  }

  private toDomain(prismaChar: any): Character {
    return {
      id: prismaChar.id,
      name: prismaChar.name,
      age: prismaChar.age,
      cultivationLevel: prismaChar.cultivationLevel,
      cultivationSubLevel: prismaChar.cultivationSubLevel,
      coreCapacity: prismaChar.coreCapacity,
      coreQuality: prismaChar.coreQuality,
      currentQi: prismaChar.currentQi,
      accumulatedQi: prismaChar.accumulatedQi,
      strength: prismaChar.strength,
      agility: prismaChar.agility,
      intelligence: prismaChar.intelligence,
      conductivity: prismaChar.conductivity,
      health: prismaChar.health,
      fatigue: prismaChar.fatigue,
      mentalFatigue: prismaChar.mentalFatigue,
      hasAmnesia: prismaChar.hasAmnesia,
      knowsAboutSystem: prismaChar.knowsAboutSystem,
      sectRole: prismaChar.sectRole,
    };
  }
}
```

#### 5.3.3.1 Рефакторинг API Route

**Файл:** `src/app/api/chat/route.ts` (после рефакторинга)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ChatRequestSchema } from '@/validation/schemas/chat.schema';
import { createGameService } from '@/services/ServiceFactory';
import { logError, logInfo, LogTimer } from '@/lib/logger';

// Создаём сервис один раз
const gameService = createGameService();

export async function POST(request: NextRequest) {
  const timer = new LogTimer('API', 'Chat request');
  
  try {
    // 1. Парсинг и валидация
    const body = await request.json();
    const parseResult = ChatRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }
    
    const { sessionId, message } = parseResult.data;
    
    // 2. Делегируем бизнес-логику сервису
    const response = await gameService.processMessage(sessionId, message);
    
    await timer.end('INFO', { sessionId, success: true });
    return NextResponse.json(response);
    
  } catch (error) {
    await logError('API', 'Chat request failed', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    await timer.end('ERROR', { success: false });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### Критерии приёмки

- [ ] API-роуты не более 50-100 строк
- [ ] Нет прямых вызовов Prisma в роутах
- [ ] Бизнес-логика инкапсулирована в сервисах
- [ ] Репозитории имеют интерфейсы
- [ ] Lint проходит без ошибок

---

## 🔴 ЗАДАЧА 5.1: Вынос логики из хуков

### Декомпозиция

```
ЗАДАЧА 5.1: Вынос логики из хуков
├── 5.1.1 Создать domain-слой
│   ├── 5.1.1.1 Создать src/domain/character/CharacterCalculations.ts
│   ├── 5.1.1.2 Создать src/domain/qi/QiCalculations.ts
│   └── 5.1.1.3 Создать src/domain/session/SessionCalculations.ts
│
├── 5.1.2 Создать Zustand store
│   ├── 5.1.2.1 Создать src/stores/gameStore.ts
│   ├── 5.1.2.2 Определить состояние
│   ├── 5.1.2.3 Определить actions
│   └── 5.1.2.4 Определить selectors
│
├── 5.1.3 Рефакторинг useGame
│   ├── 5.1.3.1 Удалить бизнес-логику
│   ├── 5.1.3.2 Оставить только UI-логику
│   └── 5.1.3.3 Использовать Zustand
│
└── 5.1.4 Обновить компоненты
    ├── 5.1.4.1 Обновить GameChat.tsx
    ├── 5.1.4.2 Обновить StartScreen.tsx
    └── 5.1.4.3 Удалить пропсы, использовать store
```

### Подзадачи

#### 5.1.1.1 CharacterCalculations

**Файл:** `src/domain/character/CharacterCalculations.ts`

```typescript
import type { Character } from '@/types/game';

/**
 * Чистые функции расчёта для персонажа
 * Без побочных эффектов, легко тестировать
 */

export function calculateHealthPercentage(character: Character): number {
  return Math.max(0, Math.min(100, character.health));
}

export function calculateQiPercentage(character: Character): number {
  return Math.round((character.currentQi / character.coreCapacity) * 100);
}

export function canMeditate(character: Character): boolean {
  return character.currentQi < character.coreCapacity;
}

export function calculateEffectiveStats(character: Character) {
  const fatigueModifier = 1 - (character.fatigue / 200); // 50% fatigue = 75% effectiveness
  const mentalModifier = 1 - (character.mentalFatigue / 200);
  
  return {
    effectiveStrength: character.strength * fatigueModifier,
    effectiveAgility: character.agility * fatigueModifier,
    effectiveIntelligence: character.intelligence * mentalModifier,
    effectiveConductivity: character.conductivity * mentalModifier,
  };
}

export function formatCharacterStatus(character: Character): string {
  const qiPercent = calculateQiPercentage(character);
  return [
    `🧘 Уровень: ${character.cultivationLevel}.${character.cultivationSubLevel}`,
    `⚡ Ци: ${character.currentQi}/${character.coreCapacity} (${qiPercent}%)`,
    `❤️ Здоровье: ${character.health}%`,
    `😫 Усталость: ${character.fatigue}%`,
  ].join('\n');
}
```

#### 5.1.2.1 Zustand Store

**Файл:** `src/stores/gameStore.ts`

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Character, Message, WorldTime, Location } from '@/types/game';

interface GameState {
  // === ДАННЫЕ ===
  sessionId: string | null;
  character: Character | null;
  worldTime: WorldTime | null;
  location: Location | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isPaused: boolean;
  daysSinceStart: number;
  
  // === ДЕЙСТВИЯ ===
  startGame: (variant: 1 | 2 | 3, config?: Record<string, unknown>, name?: string) => Promise<boolean>;
  loadGame: (sessionId: string) => Promise<boolean>;
  sendMessage: (message: string) => Promise<void>;
  togglePause: () => Promise<void>;
  resetGame: () => void;
  saveAndExit: () => Promise<void>;
  
  // === ВНУТРЕННИЕ ДЕЙСТВИЯ ===
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
  _updateCharacter: (updates: Partial<Character>) => void;
  _addMessage: (message: Message) => void;
  _updateTime: (time: WorldTime, daysSinceStart: number) => void;
}

export const useGameStore = create<GameState>()(
  devtools(
    persist(
      (set, get) => ({
        // Начальное состояние
        sessionId: null,
        character: null,
        worldTime: null,
        location: null,
        messages: [],
        isLoading: false,
        error: null,
        isPaused: true,
        daysSinceStart: 0,
        
        // Действия
        startGame: async (variant, config, name) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await fetch('/api/game/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ variant, customConfig: config, characterName: name }),
            });
            
            const data = await response.json();
            
            if (!data.success) {
              set({ isLoading: false, error: data.error });
              return false;
            }
            
            set({
              sessionId: data.session.id,
              character: data.session.character,
              worldTime: {
                year: data.session.worldYear,
                month: data.session.worldMonth,
                day: data.session.worldDay,
                hour: data.session.worldHour,
                minute: data.session.worldMinute,
                formatted: `${data.session.worldYear} Э.С.М., ${data.session.worldMonth} мес., ${data.session.worldDay} дн.`,
                season: data.session.worldMonth <= 6 ? 'тёплый' : 'холодный',
              },
              location: data.session.character.currentLocation || null,
              messages: [{
                id: 'opening',
                type: 'narration',
                sender: 'narrator',
                content: data.openingNarration,
                createdAt: new Date().toISOString(),
              }],
              isLoading: false,
              isPaused: data.session.isPaused,
              daysSinceStart: data.session.daysSinceStart,
            });
            
            return true;
          } catch (error) {
            set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
            return false;
          }
        },
        
        sendMessage: async (message) => {
          const { sessionId } = get();
          if (!sessionId) return;
          
          // Добавляем сообщение игрока
          set(state => ({
            messages: [...state.messages, {
              id: `temp-${Date.now()}`,
              type: 'player',
              sender: 'player',
              content: message,
              createdAt: new Date().toISOString(),
            }],
            isLoading: true,
          }));
          
          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, message }),
            });
            
            const data = await response.json();
            
            if (!data.success) {
              throw new Error(data.error || 'Failed');
            }
            
            // Обновляем состояние из ответа сервера
            set(state => ({
              messages: [...state.messages, {
                id: `ai-${Date.now()}`,
                type: data.response.type,
                sender: 'narrator',
                content: data.response.content,
                createdAt: new Date().toISOString(),
              }],
              isLoading: false,
              character: data.response.characterState
                ? { ...state.character!, ...data.response.characterState }
                : state.character,
              worldTime: data.updatedTime
                ? { ...data.updatedTime, formatted: `${data.updatedTime.year} Э.С.М., ${data.updatedTime.month} мес., ${data.updatedTime.day} дн.`, season: data.updatedTime.month <= 6 ? 'тёплый' : 'холодный' }
                : state.worldTime,
            }));
          } catch (error) {
            set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        },
        
        resetGame: () => {
          set({
            sessionId: null,
            character: null,
            worldTime: null,
            location: null,
            messages: [],
            isLoading: false,
            error: null,
            isPaused: true,
            daysSinceStart: 0,
          });
        },
        
        // ... остальные действия
        _setLoading: (loading) => set({ isLoading: loading }),
        _setError: (error) => set({ error }),
        _updateCharacter: (updates) => set(state => ({
          character: state.character ? { ...state.character, ...updates } : null,
        })),
        _addMessage: (message) => set(state => ({
          messages: [...state.messages, message],
        })),
        _updateTime: (time, days) => set({ worldTime: time, daysSinceStart: days }),
      }),
      { name: 'game-storage' }
    )
  )
);

// Селекторы для оптимизации
export const selectCharacter = (state: GameState) => state.character;
export const selectMessages = (state: GameState) => state.messages;
export const selectIsLoading = (state: GameState) => state.isLoading;
```

#### 5.1.4.1 Обновление GameChat

**Файл:** `src/components/game/GameChat.tsx` (после рефакторинга)

```typescript
import { useGameStore } from '@/stores/gameStore';
import { MessageBubble } from './MessageBubble';
import { StatusBar } from './StatusBar';

export function GameChat() {
  // Подписываемся только на нужные данные
  const messages = useGameStore(s => s.messages);
  const character = useGameStore(s => s.character);
  const worldTime = useGameStore(s => s.worldTime);
  const location = useGameStore(s => s.location);
  const isLoading = useGameStore(s => s.isLoading);
  const sendMessage = useGameStore(s => s.sendMessage);
  const saveAndExit = useGameStore(s => s.saveAndExit);
  
  // ... UI логика
}
```

### Критерии приёмки

- [ ] Хуки содержат только UI-логику
- [ ] Бизнес-логика вынесена в domain/ и services/
- [ ] Zustand store управляет состоянием
- [ ] Компоненты не получают более 3-4 пропсов
- [ ] Lint проходит без ошибок

---

## 📅 План выполнения

### Неделя 1: Критические задачи

```
День 1-2: Задача 1 (Валидация)
├── Создать структуру validation/
├── Написать все схемы
└── Интегрировать в API-роуты

День 3-5: Задача 5.3 (Сервисы)
├── Создать структуру services/
├── Создать репозитории
├── Рефакторинг API-роутов
└── Тестирование
```

### Неделя 2: Высокий приоритет

```
День 1-3: Задача 5.1 (Вынос логики)
├── Создать domain-слой
├── Создать Zustand store
├── Рефакторинг useGame
└── Обновить компоненты

День 4-5: Тестирование и документация
├── Unit тесты
├── Integration тесты
└── Обновление документации
```

---

## ✅ Чек-лист готовности

### Перед началом

- [x] Ветка master2 создана
- [x] Архитектура задокументирована
- [ ] План утверждён

### После завершения

- [ ] Lint без ошибок
- [ ] Все API-роуты < 100 строк
- [ ] Валидация на всех endpoints
- [ ] Сервисы покрывают бизнес-логику
- [ ] Zustand store работает
- [ ] Тесты проходят

---

*Документ обновляется по мере выполнения задач*
