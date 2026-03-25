# 🔍 Аудит: План исправлений (checkpoint_03_18_audit)

**Дата:** 2026-03-18
**Источник:** Внешний аудит кода Ai-Game2 (ветка `main2d5`)
**Статус:** 📋 План создан — задачи перенесены в `checkpoint_03_19.md`
**Приоритет:** КРИТИЧЕСКИЙ

---

## 📊 Сводка проблем

| Категория | Количество | Критичных |
|-----------|------------|-----------|
| 🔴 Критичные | 2 | 2 |
| 🟡 Важные | 6 | 0 |
| 🟢 Рекомендации | 4 | 0 |
| **Итого** | **12** | **2** |

### ⚪ ОТЛОЖЕНО (однопользовательский режим)

| # | Проблема | Причина |
|---|----------|---------|
| ~1~ | API `/api/database/reset` без авторизации | Однопользовательский режим, не требуется |

---

## 🔴 КРИТИЧНЫЕ ПРОБЛЕМЫ (исправить немедленно)

### Проблема #1: Падающий юнит-тест combat-system

**Приоритет:** 🔴 P0 - КРИТИЧНО
**Риск:** Тесты не работают, некорректная логика проверки Qi
**Файлы:**
- `__tests__/combat-system.test.ts`
- `src/lib/game/combat-system.ts`

**Текущее поведение:**
```typescript
// Тест ожидает:
expect(result.effectiveQi).toBe(50);

// Функция возвращает:
return { effectiveQi: qiInput, ... }; // qiInput = 54
```

**Анализ:**

Есть два варианта решения:

**Вариант A: Исправить тест (если логика функции верна)**
```typescript
test('qiInput within 10% margin - stable but capped', () => {
  const result = checkDestabilization(54, 50); // 108%
  expect(result.isDestabilized).toBe(false);
  expect(result.effectiveQi).toBe(54); // ← исправлено: возвращает qiInput, не capacity
  expect(result.efficiencyPercent).toBeGreaterThan(90);
});
```

**Вариант B: Исправить функцию (если тест верен)**
```typescript
// Если qiInput в пределах safe limit, не должны кэппить
// Но если бизнес-логика требует кэппинга:
if (qiInput <= safeLimit) {
  return {
    effectiveQi: Math.min(qiInput, techniqueCapacity), // кэппим
    isDestabilized: false,
    efficiencyPercent: 100,
  };
}
```

**Рекомендация:** Уточнить бизнес-логику и исправить соответственно.

**Чек-лист:**
- [ ] Определить правильную бизнес-логику
- [ ] Исправить либо тест, либо функцию
- [ ] Убрать проверку несуществующего поля `efficiencyPercent`
- [ ] Запустить `bun test` для проверки

---

### Проблема #2: Хардкодированные параметры уклонения

**Приоритет:** 🔴 P0 - КРИТИЧНО
**Риск:** Уклонение всегда рассчитывается как будто ловкость = 10
**Файл:** `src/lib/game/combat-system.ts:739`

**Текущий код:**
```typescript
const wasDodged = checkDodge(
  { x: 0, y: 0 },   // ← позиция атакующего всегда (0,0)!
  target.position,
  baseDodgeChance,
  10                 // ← ловкость цели всегда 10!
);
```

**Решение:**
```typescript
// Найти место где вызывается calculateAttackDamage
// Передать реальные параметры

interface AttackParams {
  attacker: {
    position: { x: number; y: number };
    // ... другие поля
  };
  target: {
    position: { x: number; y: number };
    agility: number;  // ← добавить
    // ... другие поля
  };
  // ...
}

// В calculateAttackDamage:
const wasDodged = checkDodge(
  params.attacker.position,
  target.position,
  baseDodgeChance,
  target.agility  // ← использовать реальную ловкость
);
```

**Дополнительно:**
- Объединить `checkDodge` и `calculateDodgeResult` в одну функцию
- Создать единый источник истины для расчёта уклонения

**Чек-лист:**
- [ ] Добавить `target.agility` в интерфейс `calculateAttackDamage`
- [ ] Передать реальные координаты атакующего
- [ ] Найти все вызовы и обновить
- [ ] Объединить две функции уклонения

---

## 🟡 ВАЖНЫЕ ПРОБЛЕМЫ (исправить в ближайшее время)

### Проблема #3: Мастерство техник всегда = 0 в бою

**Приоритет:** 🟡 P1 - Важно
**Риск:** Игроки не получают бонус от прокачки мастерства
**Файл:** `src/game/services/TechniqueSlotsManager.ts:274`

**Текущий код:**
```typescript
0, // TODO: mastery
```

**Решение:**
```typescript
// TechniqueSlotsManager.ts

// 1. Добавить метод получения мастерства
private getTechniqueMastery(techniqueId: string): number {
  const characterTechnique = this.characterTechniques.find(
    ct => ct.techniqueId === techniqueId
  );
  return characterTechnique?.mastery ?? 0;
}

// 2. Использовать в расчёте урона
const mastery = this.getTechniqueMastery(technique.id);
const attackResult = calculateTechniqueDamageFull(
  strength,
  agility,
  technique,
  mastery,  // ← вместо 0
  qiInput
);
```

**Чек-лист:**
- [ ] Добавить метод `getTechniqueMastery()`
- [ ] Загружать `characterTechniques` при инициализации
- [ ] Передавать mastery в `calculateTechniqueDamageFull`
- [ ] Протестировать рост урона при повышении мастерства

---

### Проблема #4: Теневое объявление `mechanicsUpdate`

**Приоритет:** 🟡 P1 - Важно
**Риск:** Данные обновления при прерывании медитации не попадают в combinedStateUpdate
**Файл:** `src/app/api/chat/route.ts:416`

**Текущий код:**
```typescript
// строка 95 — внешняя область
let mechanicsUpdate: Record<string, unknown> = {};

// строка 416 — внутри meditation interruption block
const mechanicsUpdate: Record<string, unknown> = { ... }; // ← тень!
```

**Решение:**
```typescript
// Убрать const, использовать присваивание
// строка 416:
mechanicsUpdate = {  // ← убрать const
  currentQi: qiBeforeMeditation,
  fatigue: updatedCharacter.fatigue,
  mentalFatigue: updatedCharacter.mentalFatigue,
  // ...
};
```

**Чек-лист:**
- [ ] Заменить `const mechanicsUpdate` на `mechanicsUpdate =`
- [ ] Проверить, что данные попадают в combinedStateUpdate
- [ ] Добавить unit-тест для прерывания медитации

---

### Проблема #5: N+1 запрос update → findUnique

**Приоритет:** 🟡 P1 - Важно
**Риск:** Избыточные запросы к БД
**Файл:** `src/app/api/chat/route.ts`

**Текущий код:**
```typescript
await db.character.update({ where: { id: ... }, data: mechanicsUpdate });
const updatedCharacter = await db.character.findUnique({ where: { id: ... } });
```

**Решение:**
```typescript
// Prisma возвращает обновлённую запись
const updatedCharacter = await db.character.update({
  where: { id: session.characterId },
  data: { ...mechanicsUpdate, updatedAt: new Date() },
  include: {
    // если нужны связанные данные
  }
});
// findUnique не нужен!
```

**Чек-лист:**
- [ ] Найти все места с `update` + `findUnique`
- [ ] Заменить на один вызов `update` с возвратом
- [ ] Протестировать

---

### Проблема #6: God-файл route.ts (1110 строк)

**Приоритет:** 🟡 P1 - Важно (рефакторинг)
**Риск:** Сложность поддержки и тестирования
**Файл:** `src/app/api/chat/route.ts`

**Рекомендуемая архитектура:**
```
src/app/api/chat/
├── route.ts                    # Главный обработчик (~100 строк)
├── handlers/
│   ├── cheat.handler.ts        # Обработка чит-команд
│   ├── cultivation.handler.ts  # Медитация, прорыв
│   ├── combat.handler.ts       # Бой
│   └── narration.handler.ts    # LLM-сценарии
├── services/
│   ├── rate-limiter.ts         # Rate limiting
│   └── llm-init.ts             # Инициализация LLM
└── types.ts                    # Типы для chat API
```

**Чек-лист:**
- [ ] Создать структуру папок
- [ ] Вынести `handleCheatCommand`
- [ ] Вынести `handleCultivation`
- [ ] Вынести `handleCombat`
- [ ] Вынести `handleNarration`
- [ ] Обновить импорты в route.ts
- [ ] Протестировать все сценарии

---

### Проблема #7: `setInterval` в module scope

**Приоритет:** 🟡 P1 - Важно
**Риск:** Утечка памяти в serverless
**Файл:** `src/lib/rate-limit.ts`

**Текущий код:**
```typescript
setInterval(() => {
  // очистка старых записей
}, 5 * 60 * 1000);
```

**Решение (lazy cleanup):**
```typescript
export function checkRateLimit(identifier: string): RateLimitResult {
  // 1. Очищаем просроченные записи при каждом обращении
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
  
  // 2. Основная логика
  const entry = rateLimitStore.get(identifier);
  // ...
}
```

**Альтернатива (для production):** Использовать Redis.

**Чек-лист:**
- [ ] Убрать `setInterval`
- [ ] Добавить lazy cleanup в `checkRateLimit`
- [ ] Протестировать rate limiting

---

### Проблема #8: Молчаливое проглатывание ошибки LLM

**Приоритет:** 🟡 P1 - Важно
**Риск:** Невозможность отладки проблем с LLM
**Файл:** `src/app/api/chat/route.ts`

**Текущий код:**
```typescript
try {
  const llmResponse = await generateGameResponse(...);
  eventDescription = llmResponse.content;
} catch {
  // Используем дефолтное описание
  // ← ошибка полностью проглочена
}
```

**Решение:**
```typescript
import { logWarn } from '@/lib/logger';

try {
  const llmResponse = await generateGameResponse(...);
  eventDescription = llmResponse.content;
} catch (e) {
  await logWarn("LLM", "Interruption description generation failed", { 
    error: e instanceof Error ? e.message : String(e),
    sessionId: session.id 
  });
  // Используем дефолтное описание
}
```

**Чек-лист:**
- [ ] Добавить логирование в catch блок
- [ ] Протестировать с недоступным LLM

---

## 🟢 РЕКОМЕНДАЦИИ (улучшения качества)

### Проблема #9: Дублирование генераторов v1/v2

**Приоритет:** 🟢 P2 - Рекомендация
**Файлы:** `src/lib/generator/`

**Решение:**
1. Определить актуальную версию каждого генератора
2. Удалить устаревшие файлы
3. Переименовать `*-v2.ts` в `*.ts`

**Чек-лист:**
- [ ] Провести аудит всех генераторов
- [ ] Определить используемые версии
- [ ] Удалить неиспользуемые
- [ ] Обновить импорты

---

### Проблема #10: 217 `console.log` вместо логгера

**Приоритет:** 🟢 P2 - Рекомендация
**Файлы:** Весь проект

**Решение:**
```typescript
// Вместо:
console.log('[NPCManager] Creating NPC:', npcId);

// Использовать:
import { logInfo, logDebug } from '@/lib/logger';
logInfo('NPCManager', 'Creating NPC', { npcId });
```

**Приоритетные файлы:**
- `SessionNPCManager`
- `NPC-AI`
- `WaveManager`
- `CombatProcessor`
- `PresetNPCSpawner`

**Чек-лист:**
- [ ] Заменить в SessionNPCManager
- [ ] Заменить в NPC-AI
- [ ] Заменить в WaveManager
- [ ] Заменить в CombatProcessor
- [ ] Заменить в PresetNPCSpawner

---

### Проблема #11: Хардкодированные русские строки для команд

**Приоритет:** 🟢 P2 - Рекомендация
**Файл:** `src/app/api/chat/route.ts`

**Текущий код:**
```typescript
const isInterruptionResponse =
  lowerMessage === "проигнорировать" ||
  lowerMessage === "1" ||
  lowerMessage === "встать и встретить" ||
  lowerMessage === "2" ||
  ...
```

**Решение:**
```typescript
// 1. Создать enum для действий
enum MeditationAction {
  IGNORE = 'meditation:ignore',
  INTERRUPT = 'meditation:interrupt',
  CONTINUE = 'meditation:continue',
}

// 2. UI отправляет структурированную команду
// { action: 'meditation:interrupt' }

// 3. Backend обрабатывает
const action = body.action as MeditationAction;
if (action === MeditationAction.INTERRUPT) {
  // обработка
}
```

**Чек-лист:**
- [ ] Создать enum для действий медитации
- [ ] Обновить frontend для отправки action
- [ ] Обновить backend для обработки action
- [ ] Убрать текстовый матчинг

---

### Проблема #12: In-memory rate limiting

**Приоритет:** 🟢 P2 - Рекомендация
**Риск:** Не работает при горизонтальном масштабировании
**Файл:** `src/lib/rate-limit.ts`

**Решение (долгосрочное):**
```typescript
// Использовать Redis
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, WINDOW_MS / 1000);
  }
  
  return {
    allowed: current <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - current),
    resetTime: Date.now() + WINDOW_MS,
  };
}
```

**Для MVP:** Зафиксировать ограничение в документации.

**Чек-лист:**
- [ ] Добавить комментарий о limitation
- [ ] Документировать в README
- [ ] (Опционально) Интегрировать Redis

---

## 📋 ПЛАН ИСПОЛНЕНИЯ

### Фаза 1: Критичные исправления (сегодня)

| # | Задача | Оценка | Статус |
|---|--------|--------|--------|
| 1.1 | Исправить тест combat-system | 30 мин | ⬜ НЕ ИСПРАВЛЕНО |
| 1.2 | Исправить параметры уклонения | 30 мин | ⬜ НЕ ИСПРАВЛЕНО |

### Фаза 2: Важные исправления (эта неделя)

| # | Задача | Оценка | Статус |
|---|--------|--------|--------|
| 2.1 | Исправить mastery в TechniqueSlotsManager | 30 мин | ⬜ НЕ ИСПРАВЛЕНО |
| 2.2 | Исправить теневое объявление mechanicsUpdate | 10 мин | ⬜ НЕ ИСПРАВЛЕНО |
| 2.3 | Устранить N+1 запросы | 20 мин | ⬜ НЕ ИСПРАВЛЕНО |
| 2.4 | Убрать setInterval в rate-limit | 20 мин | ⬜ НЕ ИСПРАВЛЕНО |
| 2.5 | Добавить логирование ошибок LLM | 10 мин | ⬜ НЕ ИСПРАВЛЕНО |

### Фаза 3: Рефакторинг (следующая неделя)

| # | Задача | Оценка | Статус |
|---|--------|--------|--------|
| 3.1 | Разбить route.ts на модули | 4 часа | ⬜ |
| 3.2 | Убрать дублирование генераторов | 1 час | ⬜ |
| 3.3 | Заменить console.log на логгер | 2 часа | ⬜ |

### Фаза 4: Улучшения (по возможности)

| # | Задача | Оценка | Статус |
|---|--------|--------|--------|
| 4.1 | Структурированные команды медитации | 1 час | ⬜ |
| 4.2 | Redis для rate limiting | 2 часа | ⬜ |

---

## 📅 ПРОВЕРКА СТАТУСА (2026-03-19)

**Проверено:** код проверен вручную

**Результаты:**
- ❌ `checkDodge({ x: 0, y: 0 }, ..., 10)` - хардкод остался
- ❌ `0, // TODO: mastery` - не исправлено
- ❌ `const mechanicsUpdate` на строке 416 - теневое объявление остаётся
- ❌ `update + findUnique` паттерн - не исправлено
- ❌ `setInterval` в rate-limit.ts - остаётся
- ❌ catch без логирования в route.ts - остаётся

**Примечание:** Все задачи перенесены в `checkpoint_03_19.md` для отслеживания

---

## 🎯 ИТОГОВАЯ ОЦЕНКА

| Фаза | Время | Приоритет |
|------|-------|-----------|
| Фаза 1 (Критичные) | 1 час | 🔴 Сегодня |
| Фаза 2 (Важные) | 1.5 часа | 🟡 Эта неделя |
| Фаза 3 (Рефакторинг) | 7 часов | 🟢 Следующая неделя |
| Фаза 4 (Улучшения) | 3 часа | ⚪ По возможности |

**Общее время:** ~12.5 часов

---

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ

### О mutables в serverless

```typescript
let llmInitialized = false;
```

Это антипаттерн для serverless. В Next.js cold start переменная сбрасывается.
Для MVP это приемлемо, но нужно учитывать:
- LLM инициализируется при каждом cold start
- Флаг `llmInitialized` не гарантирует сохранность состояния

### О консистентности данных

При рефакторинге `route.ts` обратить внимание на:
- `session.character.id` vs `session.characterId` - использовать одно
- Все обновления должны возвращать обновлённые данные

---

*План создан: 2026-03-18*
*Источник: Внешний аудит*
*Ответственный: Development Team*
