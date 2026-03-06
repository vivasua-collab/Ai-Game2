# 🔍 Чекпоинт: Внешнее ревью кода

**Дата:** 2026-03-05  
**Тип:** Внешнее ревью  
**Статус:** Требуется анализ

---

## 📊 Сводка

| # | Проблема | Критичность | Сложность | Приоритет |
|---|----------|-------------|-----------|-----------|
| 1 | Lint-blocker в GameChat.tsx | 🟡 Средняя | 🟢 Низкая | P2 |
| 2 | Lint-blocker в NPCViewerPanel.tsx | 🟡 Средняя | 🟡 Средняя | P2 |
| 3 | Недостаточная валидация API | 🔴 Высокая | 🟡 Средняя | P1 |
| 4 | Риск отрицательных тиков | 🔴 Высокая | 🟢 Низкая | P1 |
| 5 | TypeScript-конфиг захватывает лишнее | 🟢 Низкая | 🟢 Низкая | P3 |

---

## 1️⃣ Lint-blocker в GameChat.tsx (React Compiler + useMemo)

### Описание проблемы

**Файл:** `src/components/game/GameChat.tsx`  
**Строки:** 99-115  
**Правило:** `react-hooks/preserve-manual-memoization`

```typescript
// ПРОБЛЕМНЫЙ КОД (строки 99-115)
const qiPercent = useMemo(() => 
  character ? getCoreFillPercent(character.currentQi, character.coreCapacity) : 0,
  [character?.currentQi, character?.coreCapacity]  // ❌ Несоответствие deps
);

const breakthroughProgress = useMemo(() => {
  if (!character) return { percent: 0, current: 0, required: 0 };
  return getBreakthroughProgress(
    character.cultivationLevel,
    character.cultivationSubLevel,
    character.accumulatedQi,
    character.coreCapacity
  );
}, [character?.accumulatedQi, character?.coreCapacity, character?.cultivationLevel, character?.cultivationSubLevel]);
```

### Анализ

**Суть проблемы:** React Compiler выводит свои зависимости для memoization, которые отличаются от вручную заданных. Правило `react-hooks/preserve-manual-memoization` считает это ошибкой.

**Влияние:**
- ❌ Блокирует CI/CD при lint-проверке
- ❌ Не влияет на runtime-поведение (вычисления корректны)
- ❌ Может вызвать ложные срабатывания при оптимизации

**Вычисления:**
- `getCoreFillPercent` — простое деление: `(currentQi / coreCapacity) * 100`
- `getBreakthroughProgress` — несколько математических операций
- Оба вычисления **дешёвые** (O(1), нет рекурсии, нет I/O)

### Решения

#### Вариант A: Убрать useMemo (рекомендуется)

```typescript
// Убираем useMemo полностью — вычисления дешёвые
const qiPercent = character 
  ? getCoreFillPercent(character.currentQi, character.coreCapacity) 
  : 0;

const breakthroughProgress = character
  ? getBreakthroughProgress(
      character.cultivationLevel,
      character.cultivationSubLevel,
      character.accumulatedQi,
      character.coreCapacity
    )
  : { percent: 0, current: 0, required: 0 };
```

**Плюсы:**
- ✅ Устраняет lint-ошибку полностью
- ✅ Упрощает код
- ✅ React Compiler сам определит необходимость memoization

**Минусы:**
- ⚠️ Теоретическое влияние на производительность (но вычисления дешёвые)

#### Вариант B: Упростить deps

```typescript
const qiPercent = useMemo(() => 
  character ? getCoreFillPercent(character.currentQi, character.coreCapacity) : 0,
  [character]  // Зависимость только от объекта character
);

const breakthroughProgress = useMemo(() => {
  if (!character) return { percent: 0, current: 0, required: 0 };
  return getBreakthroughProgress(
    character.cultivationLevel,
    character.cultivationSubLevel,
    character.accumulatedQi,
    character.coreCapacity
  );
}, [character]);
```

**Плюсы:**
- ✅ Может удовлетворить линтер
- ✅ Сохраняет memoization

**Минусы:**
- ⚠️ Может не решить проблему с React Compiler
- ⚠️ Избыточная сложность для простых вычислений

### Рекомендация

**Вариант A** — убрать `useMemo`. Вычисления дешёвые и безопасны для рендера.

### Оценка

| Критерий | Значение |
|----------|----------|
| **Критичность** | 🟡 Средняя — блокирует lint, но не runtime |
| **Сложность** | 🟢 Низкая — 5-10 минут |
| **Приоритет** | P2 — можно отложить, но лучше исправить |

---

## 2️⃣ Lint-blocker в NPCViewerPanel.tsx (setState в effect)

### Описание проблемы

**Файл:** `src/components/settings/NPCViewerPanel.tsx`  
**Строки:** 165-200  
**Правило:** `react-hooks/set-state-in-effect`

```typescript
// ПРОБЛЕМНЫЙ КОД (строки 165-200)
useEffect(() => {
  if (npcs.length === 0) return;
  
  let filtered = [...npcs];
  
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(npc => 
      npc.name.toLowerCase().includes(searchLower) ||
      npc.id.toLowerCase().includes(searchLower) ||
      npc.speciesId.toLowerCase().includes(searchLower) ||
      npc.roleId.toLowerCase().includes(searchLower)
    );
  }
  
  // ... другие фильтры ...
  
  setFilteredNPCs(filtered);  // ❌ setState в effect
}, [npcs, search, levelFilter, speciesFilter, roleFilter]);

useEffect(() => {
  if (filteredNPCs.length > 0 && !selectedNPC) {
    setSelectedNPC(filteredNPCs[0]);  // ❌ setState в effect
  }
}, [filteredNPCs, selectedNPC]);
```

### Анализ

**Суть проблемы:**
1. `setFilteredNPCs` внутри `useEffect` — cascade re-render
2. `setSelectedNPC` внутри `useEffect` — потенциальный бесконечный цикл

**Влияние:**
- ❌ Блокирует CI/CD при lint-проверке
- ⚠️ Потенциальный cascade re-render при каждом изменении фильтров
- ⚠️ Риск бесконечного цикла (маловероятен, но возможен)

**Логика:**
- `filteredNPCs` — **derived state** (вычисляется из `npcs` + фильтры)
- `selectedNPC` — можно вычислить при изменении filteredNPCs или действии пользователя

### Решения

#### Вариант A: useMemo для filteredNPCs (рекомендуется)

```typescript
// Убираем useState для filteredNPCs
// const [filteredNPCs, setFilteredNPCs] = useState<GeneratedNPC[]>([]);  // ❌ Удалить

// Заменяем на useMemo
const filteredNPCs = useMemo(() => {
  if (npcs.length === 0) return [];
  
  let filtered = [...npcs];
  
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(npc => 
      npc.name.toLowerCase().includes(searchLower) ||
      npc.id.toLowerCase().includes(searchLower) ||
      npc.speciesId.toLowerCase().includes(searchLower) ||
      npc.roleId.toLowerCase().includes(searchLower)
    );
  }
  
  if (levelFilter !== 'all') {
    filtered = filtered.filter(npc => npc.cultivation.level === parseInt(levelFilter));
  }
  
  if (speciesFilter !== 'all') {
    filtered = filtered.filter(npc => getSpeciesType(npc.speciesId) === speciesFilter);
  }
  
  if (roleFilter !== 'all') {
    filtered = filtered.filter(npc => getRoleType(npc.roleId) === roleFilter);
  }
  
  return filtered;
}, [npcs, search, levelFilter, speciesFilter, roleFilter]);
```

#### Вариант B: Инициализация selectedNPC через callback

```typescript
// Вычисляемый initialSelectedNPC
const selectedNPCOrFirst = selectedNPC ?? filteredNPCs[0] ?? null;

// Или через callback при рендере списка
const handleNPCClick = useCallback((npc: GeneratedNPC) => {
  setSelectedNPC(npc);
}, []);

// Инициализация при первом рендере с данными
useEffect(() => {
  // Только если нет выбранного и есть данные
  if (!selectedNPC && filteredNPCs.length > 0) {
    setSelectedNPC(filteredNPCs[0]);
  }
}, []); // Пустой массив — только при mount
```

**Комбинированное решение:**

```typescript
export function NPCViewerPanel({ npcs, loading, onLoad }: NPCViewerPanelProps) {
  // Фильтры
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // ✅ Derived state через useMemo
  const filteredNPCs = useMemo(() => {
    if (npcs.length === 0) return [];
    // ... логика фильтрации ...
    return filtered;
  }, [npcs, search, levelFilter, speciesFilter, roleFilter]);
  
  // ✅ selectedNPC только через действие пользователя
  const [selectedNPC, setSelectedNPC] = useState<GeneratedNPC | null>(null);
  
  // ✅ Автовыбор первого при появлении данных (без effect)
  const displayedNPC = selectedNPC ?? filteredNPCs[0] ?? null;
  
  // ...
}
```

### Рекомендация

**Комбинация A + B:**
1. Заменить `useState(filteredNPCs)` на `useMemo`
2. Инициализировать `selectedNPC` через действие пользователя или computed value

### Оценка

| Критерий | Значение |
|----------|----------|
| **Критичность** | 🟡 Средняя — блокирует lint, потенциальный cascade |
| **Сложность** | 🟡 Средняя — 20-30 минут |
| **Приоритет** | P2 — можно отложить, но лучше исправить |

---

## 3️⃣ Недостаточная валидация входных данных в API

### Описание проблемы

**Файлы:**
- `src/app/api/rest/route.ts` (строки 40-66)
- `src/app/api/game/move/route.ts` (строки 31-37)

```typescript
// rest/route.ts — ПРОБЛЕМНЫЙ КОД (строки 39-45)
if (!characterId || !durationMinutes || !restType) {
  return NextResponse.json(
    { success: false, error: 'Missing required fields' },
    { status: 400 }
  );
}
// ❌ durationMinutes = -5 пройдёт валидацию
// ❌ durationMinutes = "abc" пройдёт валидацию (truthy string)
// ❌ durationMinutes = 1e10 пройдёт валидацию

// move/route.ts — ПРОБЛЕМНЫЙ КОД (строки 31-37)
if (!sessionId || typeof tilesMoved !== 'number') {
  // ...
}
// ❌ tilesMoved = NaN пройдёт typeof === 'number'
// ❌ tilesMoved = Infinity пройдёт typeof === 'number'
// ❌ tilesMoved = -100 пройдёт валидацию
// ❌ tilesMoved = 1.5 пройдёт валидацию (не целое)
```

### Анализ

**Уязвимости:**

| Значение | rest API | move API | Результат |
|----------|----------|----------|-----------|
| `NaN` | ❌ Пройдёт | ❌ Пройдёт | Некорректное поведение |
| `Infinity` | ❌ Пройдёт | ❌ Пройдёт | Зависание/краш |
| `-100` | ❌ Пройдёт | ❌ Пройдёт | Отрицательное время |
| `1e10` | ❌ Пройдёт | ❌ Пройдёт | Переполнение времени |
| `"123"` | ✅ Отклонится | ✅ Отклонится | — |
| `1.5` | ✅ Пройдёт | ❌ Пройдёт | Некорректные тики |

**Влияние:**
- 🔴 **Критическое** — может вызвать краш сервера
- 🔴 **Критическое** — отрицательные тики ломают время
- 🔴 **Высокое** — NaN/Infinity вызывают неожиданное поведение
- 🟡 **Среднее** — нецелые значения вызывают баги

### Решение

#### Вариант A: Встроенная валидация (рекомендуется)

```typescript
// rest/route.ts
interface RestRequest {
  characterId: string;
  durationMinutes: number;
  restType: 'light' | 'sleep';
}

function validateRestRequest(body: unknown): { valid: true; data: RestRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  
  const { characterId, durationMinutes, restType } = body as Partial<RestRequest>;
  
  // characterId
  if (typeof characterId !== 'string' || characterId.trim() === '') {
    return { valid: false, error: 'characterId must be a non-empty string' };
  }
  
  // durationMinutes
  if (typeof durationMinutes !== 'number' || !Number.isFinite(durationMinutes)) {
    return { valid: false, error: 'durationMinutes must be a finite number' };
  }
  if (!Number.isInteger(durationMinutes)) {
    return { valid: false, error: 'durationMinutes must be an integer' };
  }
  if (durationMinutes <= 0) {
    return { valid: false, error: 'durationMinutes must be positive' };
  }
  if (durationMinutes > MAX_REST_DURATION) {
    return { valid: false, error: `durationMinutes must not exceed ${MAX_REST_DURATION}` };
  }
  
  // restType
  if (restType !== 'light' && restType !== 'sleep') {
    return { valid: false, error: 'restType must be "light" or "sleep"' };
  }
  
  return { valid: true, data: { characterId, durationMinutes, restType } };
}
```

```typescript
// move/route.ts
interface MoveRequest {
  sessionId: string;
  tilesMoved: number;
}

// Константы для валидации
const MAX_TILES_PER_MOVE = 1000;  // Anti-abuse

function validateMoveRequest(body: unknown): { valid: true; data: MoveRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  
  const { sessionId, tilesMoved } = body as Partial<MoveRequest>;
  
  // sessionId
  if (typeof sessionId !== 'string' || sessionId.trim() === '') {
    return { valid: false, error: 'sessionId must be a non-empty string' };
  }
  
  // tilesMoved
  if (typeof tilesMoved !== 'number' || !Number.isFinite(tilesMoved)) {
    return { valid: false, error: 'tilesMoved must be a finite number' };
  }
  if (!Number.isInteger(tilesMoved)) {
    return { valid: false, error: 'tilesMoved must be an integer' };
  }
  if (tilesMoved <= 0) {
    return { valid: false, error: 'tilesMoved must be positive' };
  }
  if (tilesMoved > MAX_TILES_PER_MOVE) {
    return { valid: false, error: `tilesMoved must not exceed ${MAX_TILES_PER_MOVE}` };
  }
  
  return { valid: true, data: { sessionId, tilesMoved } };
}
```

#### Вариант B: Zod-схема (если установлен)

```typescript
import { z } from 'zod';

const RestRequestSchema = z.object({
  characterId: z.string().min(1),
  durationMinutes: z.number().int().positive().max(MAX_REST_DURATION),
  restType: z.enum(['light', 'sleep']),
});

const MoveRequestSchema = z.object({
  sessionId: z.string().min(1),
  tilesMoved: z.number().int().positive().max(MAX_TILES_PER_MOVE),
});

// Использование
const parseResult = RestRequestSchema.safeParse(body);
if (!parseResult.success) {
  return NextResponse.json(
    { success: false, error: parseResult.error.message },
    { status: 400 }
  );
}
const { characterId, durationMinutes, restType } = parseResult.data;
```

### Рекомендация

**Вариант A** — встроенная валидация без дополнительных зависимостей.

### Оценка

| Критерий | Значение |
|----------|----------|
| **Критичность** | 🔴 Высокая — может вызвать краш |
| **Сложность** | 🟡 Средняя — 30-45 минут |
| **Приоритет** | P1 — исправить немедленно |

---

## 4️⃣ Риск некорректного времени при отрицательных тиках

### Описание проблемы

**Файлы:**
- `src/services/time-tick.service.ts` (строка 131)
- `src/lib/game/time-db.ts` (строки 76-106)

```typescript
// time-tick.service.ts — нет валидации
const timeResult = await advanceWorldTime(sessionId, ticks);
// ❌ ticks может быть отрицательным

// time-db.ts — обрабатывает только переполнение вверх
let newMinute = session.worldMinute + ticks;  // ❌ Может быть отрицательным
// ...
while (newMinute >= TIME_CONSTANTS.MINUTES_PER_HOUR) {  // ❌ Только >=
  newMinute -= TIME_CONSTANTS.MINUTES_PER_HOUR;
  newHour++;
}
// ❌ Нет обработки newMinute < 0
```

### Анализ

**Сценарии:**

| ticks | worldMinute | Результат | Проблема |
|-------|-------------|-----------|----------|
| -60 | 30 | -30 | Отрицательные минуты |
| -120 | 60 | -60 | Ещё более отрицательные |
| -1000 | 500 | -500 | Критическое значение |

**Влияние:**
- 🔴 **Критическое** — время может стать отрицательным
- 🔴 **Критическое** — ломает логику игры (день/ночь, события)
- 🔴 **Высокое** — может вызвать NaN при форматировании

### Решение

#### Вариант A: Валидация на входе (рекомендуется)

```typescript
// time-tick.service.ts
export async function processTimeTickEffects(
  options: ProcessTimeTickOptions
): Promise<TimeTickResult> {
  const { characterId, ticks, sessionId, restType, applyPassiveQi = true, applyDissipation = true } = options;
  
  // ✅ Ранняя валидация
  if (!Number.isFinite(ticks) || ticks <= 0) {
    return {
      success: false,
      ticksAdvanced: 0,
      dayChanged: false,
      qiEffects: { passiveGain: 0, dissipation: 0, finalQi: 0 },
    };
  }
  
  // ... остальной код
}

export async function quickProcessQiTick(
  characterId: string,
  sessionId: string,
  ticks: number
): Promise<TimeTickResult> {
  // ✅ Ранняя валидация
  if (!Number.isFinite(ticks) || ticks <= 0) {
    return {
      success: false,
      ticksAdvanced: 0,
      dayChanged: false,
      qiEffects: { passiveGain: 0, dissipation: 0, finalQi: 0 },
    };
  }
  
  return processTimeTickEffects({ characterId, sessionId, ticks });
}
```

#### Вариант B: Полная обработка в advanceWorldTime

```typescript
// time-db.ts
export async function advanceWorldTime(
  sessionId: string,
  ticks: number
): Promise<AdvanceTimeResult> {
  // ✅ Валидация
  if (!Number.isFinite(ticks)) {
    throw new Error(`Invalid ticks: ${ticks}`);
  }
  
  // ...
  
  let newMinute = session.worldMinute + ticks;
  
  // ✅ Обработка отрицательных минут (rollback)
  while (newMinute < 0) {
    newMinute += TIME_CONSTANTS.MINUTES_PER_HOUR;
    newHour--;
  }
  
  // ✅ Обработка отрицательных часов
  while (newHour < 0) {
    newHour += TIME_CONSTANTS.HOURS_PER_DAY;
    newDay--;
  }
  
  // ✅ Обработка отрицательных дней
  while (newDay < 1) {
    newDay += 30;
    newMonth--;
  }
  
  // ✅ Обработка отрицательных месяцев
  while (newMonth < 1) {
    newMonth += 12;
    newYear--;
  }
  
  // ✅ Проверка на отрицательный год (не может быть раньше начала эры)
  if (newYear < 1) {
    throw new Error(`Cannot go before year 1`);
  }
  
  // ...
}
```

### Рекомендация

**Вариант A** — запретить отрицательные тики на входе сервиса. Это проще и безопаснее.

Если в будущем понадобится rollback времени — реализовать отдельную функцию с полной логикой.

### Оценка

| Критерий | Значение |
|----------|----------|
| **Критичность** | 🔴 Высокая — ломает время |
| **Сложность** | 🟢 Низкая — 10-15 минут |
| **Приоритет** | P1 — исправить немедленно |

---

## 5️⃣ TypeScript-конфиг захватывает не-продакшн файлы

### Описание проблемы

**Файл:** `tsconfig.json`  
**Строки:** 32-41

```json
{
  "include": [
    "next-env.d.ts",
    "**/*.ts",      // ❌ Захватывает ВСЕ .ts файлы
    "**/*.tsx",     // ❌ Захватывает ВСЕ .tsx файлы
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"  // ❌ Не исключает docs, examples
  ]
}
```

**Проблемные файлы:**
- `docs/OPTIMIZATION-TECHNIQUES.ts` — псевдокод/сниппеты, ломает tsc
- `examples/**/*.ts` — примеры кода, могут быть неполными
- `prisma/seed*.ts` — скрипты сидинга

### Анализ

**Влияние:**
- 🟡 **Среднее** — сотни ошибок tsc в CI
- 🟡 **Среднее** — линтер проверяет непродакшн код
- 🟢 **Низкое** — не влияет на runtime

**Пример ошибок:**
- `docs/OPTIMIZATION-TECHNIQUES.ts` — top-level await, неопределённые символы
- Примеры с неполными импортами

### Решение

```json
{
  "compilerOptions": {
    // ... существующие опции
  },
  "include": [
    "next-env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "docs",
    "examples",
    "prisma",
    "mini-services"
  ]
}
```

**Или создать отдельные tsconfig:**

```json
// tsconfig.json (основной)
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    // ...
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "docs", "examples"]
}

// tsconfig.scripts.json (для скриптов)
{
  "extends": "./tsconfig.json",
  "include": ["scripts/**/*", "prisma/**/*"],
  "exclude": ["node_modules"]
}
```

### Рекомендация

Ограничить `include` до `src/**/*.ts` и `src/**/*.tsx`, добавить `exclude` для `docs`, `examples`, `prisma`.

### Оценка

| Критерий | Значение |
|----------|----------|
| **Критичность** | 🟢 Низкая — не влияет на runtime |
| **Сложность** | 🟢 Низкая — 5 минут |
| **Приоритет** | P3 — можно отложить |

---

## 📋 План исправлений

### Фаза 1: Критические (P1)

**Срок:** Немедленно (в рамках текущей сессии)

1. **Валидация API отдыха/движения**
   - [ ] Добавить `validateRestRequest()` в `rest/route.ts`
   - [ ] Добавить `validateMoveRequest()` в `move/route.ts`
   - [ ] Добавить `MAX_TILES_PER_MOVE` константу
   - [ ] Тесты граничных случаев

2. **Валидация тиков времени**
   - [ ] Добавить проверку `ticks > 0` в `processTimeTickEffects()`
   - [ ] Добавить проверку `ticks > 0` в `quickProcessQiTick()`
   - [ ] Логирование невалидных запросов

### Фаза 2: Средние (P2)

**Срок:** Следующий спринт

3. **GameChat.tsx useMemo**
   - [ ] Убрать `useMemo` для `qiPercent`
   - [ ] Убрать `useMemo` для `breakthroughProgress`
   - [ ] Проверить lint

4. **NPCViewerPanel.tsx setState**
   - [ ] Заменить `useState(filteredNPCs)` на `useMemo`
   - [ ] Убрать `useEffect` для `setSelectedNPC`
   - [ ] Проверить lint

### Фаза 3: Низкие (P3)

**Срок:** Технический долг

5. **tsconfig.json**
   - [ ] Ограничить `include` до `src/**/*`
   - [ ] Добавить `exclude` для `docs`, `examples`, `prisma`
   - [ ] Проверить `tsc --noEmit`

---

## 🧪 Тесты для валидации

### API Rest

```typescript
// Тестовые случаи для rest/route.ts
const testCases = [
  { input: { durationMinutes: 60 }, expected: 'success' },
  { input: { durationMinutes: 0 }, expected: 'error: positive' },
  { input: { durationMinutes: -60 }, expected: 'error: positive' },
  { input: { durationMinutes: NaN }, expected: 'error: finite' },
  { input: { durationMinutes: Infinity }, expected: 'error: finite' },
  { input: { durationMinutes: 1.5 }, expected: 'error: integer' },
  { input: { durationMinutes: 10000 }, expected: 'error: max' },
  { input: { durationMinutes: '60' }, expected: 'error: number' },
];
```

### API Move

```typescript
// Тестовые случаи для move/route.ts
const testCases = [
  { input: { tilesMoved: 10 }, expected: 'success' },
  { input: { tilesMoved: 0 }, expected: 'error: positive' },
  { input: { tilesMoved: -10 }, expected: 'error: positive' },
  { input: { tilesMoved: NaN }, expected: 'error: finite' },
  { input: { tilesMoved: Infinity }, expected: 'error: finite' },
  { input: { tilesMoved: 1.5 }, expected: 'error: integer' },
  { input: { tilesMoved: 10000 }, expected: 'error: max' },
];
```

---

## 📊 Итоговая матрица приоритетов

| # | Проблема | P | Время | Риск | Решение |
|---|----------|---|-------|------|---------|
| 3 | Валидация API | P1 | 30-45 мин | 🔴 Краш | validateRequest() |
| 4 | Отрицательные тики | P1 | 10-15 мин | 🔴 Время | ticks > 0 check |
| 1 | GameChat useMemo | P2 | 5-10 мин | 🟡 Lint | Убрать useMemo |
| 2 | NPCViewerPanel | P2 | 20-30 мин | 🟡 Lint | useMemo + убрать effect |
| 5 | tsconfig | P3 | 5 мин | 🟢 CI | Ограничить include |

**Общее время:** ~75-105 минут

---

*Документ создан на основе внешнего ревью кода*  
*Все рекомендации требуют согласования с командой перед внедрением*
