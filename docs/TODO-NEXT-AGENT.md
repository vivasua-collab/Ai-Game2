# TODO для следующего ИИ-агента

> Результаты внешнего код-ревью. Приоритеты ранжированы сверху вниз.

---

## 1. [КРИТИЧЕСКИЙ] Починить удаление мира в chat API

**Файл:** `src/app/api/chat/route.ts`

**Проблема:**
- В транзакции удаляются `location` раньше `sect`, хотя `Sect.locationId -> Location.id` без `onDelete: Cascade`
- Это может ломать удаление по FK
- Удаляется `character`, а затем явный `gameSession.delete`, при том что у `GameSession -> Character` уже стоит `onDelete: Cascade` (возможен конфликт/rollback)

**Решение:**
- Удалить сущности в корректном порядке с учётом FK
- Либо удалить только root-сущность по продуманной стратегии каскадов
- Проверить `prisma/schema.prisma` на предмет правильных `onDelete` правил

**Код для анализа:**
```typescript
// Найти транзакцию удаления и проанализировать порядок
// Проверить схему на onDelete: Cascade / SetNull / Restrict
```

---

## 2. [КРИТИЧЕСКИЙ] Сделать атомарным старт новой игры

**Файл:** `src/app/api/game/start/route.ts`

**Проблема:**
- Создание `character -> session -> location -> updates -> sect/NPC` разнесено по нескольким try/catch с ручными откатами
- При частичных сбоях возможны "висячие" данные
- Сложные edge-case rollback'и

**Решение:**
- Перевести всё на единый транзакционный сценарий:
```typescript
await db.$transaction(async (tx) => {
  // Все операции внутри одной транзакции
  const character = await tx.character.create(...);
  const session = await tx.gameSession.create(...);
  // ...
});
```
- Централизованная обработка ошибок

---

## 3. [БЕЗОПАСНОСТЬ] Ограничить/защитить API логов

**Файл:** `src/app/api/logs/route.ts`

**Проблема:**
- POST/DELETE `/api/logs` позволяет включать/выключать логирование, менять уровень и чистить БД/буфер
- Нет авторизации/проверки роли

**Решение:**
- Добавить guard (token/session/admin)
- Пример:
```typescript
// Проверка admin прав или секретного токена
const isAdmin = request.headers.get('x-admin-token') === process.env.ADMIN_TOKEN;
if (!isAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## 4. [API] Синхронизировать контракт customConfig.startQi

**Файлы:**
- `src/app/api/game/start/route.ts`
- `src/types/game.ts` или схема валидации

**Проблема:**
- Поле `startQi` валидируется в схеме
- При создании персонажа `currentQi` принудительно ставится в `0`
- Пользовательский параметр игнорируется

**Решение (одно из двух):**
1. Применить `startQi`:
```typescript
currentQi: customConfig.startQi ?? 0
```
2. Убрать из API-схемы/UI, если не планируется использовать

---

## 5. [PERF] Убрать постоянный Prisma query logging

**Файл:** `src/lib/db.ts` или `prisma/client`

**Проблема:**
- Клиент Prisma создаётся с `log: ['query']` всегда
- Шумит в проде
- Логирует чувствительные параметры запросов

**Решение:**
```typescript
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn']
    : ['error'],
});
```

---

## 6. [TYPES] Запланировать проход по типам

**Команда для проверки:**
```bash
npx tsc --noEmit
```

**Проблема:**
- Линт чистый, но типизация падает по множеству файлов
- API routes, services, stores, branded types и т.д.

**Решение:**
- Отдельный "type-hardening" этап
- Привести сигнатуры логгера, Prisma-типы и branded/zod-касты к консистентному состоянию

**Известные проблемные области:**
- API routes (NextRequest/NextResponse типы)
- Services (Prisma типы)
- Stores (Zustand типы)
- Branded types (zod схемы)

---

## 7. [PERF] Сократить лишнюю выборку в /api/game/state

**Файл:** `src/app/api/game/state/route.ts`

**Проблема:**
- Читается 50 сообщений
- В ответ уходит только 10 (slice(0,10))
- Перегрузка БД/сериализации

**Решение:**
```typescript
// Было
const messages = await db.message.findMany({
  take: 50,
  orderBy: { createdAt: 'desc' }
});
const recent = messages.slice(0, 10);

// Стало
const messages = await db.message.findMany({
  take: 10,
  orderBy: { createdAt: 'desc' }
});
```

---

## Инструкции для агента

1. Начинать с критических задач (1-3)
2. После каждой задачи запускать `bun run lint` и проверять сервер
3. Обновлять этот файл по мере выполнения (ставить ✅)
4. При обнаружении дополнительных проблем - добавлять в конец списка
5. Перед завершением - проверить `npx tsc --noEmit`

---

## Статус выполнения

| # | Задача | Статус |
|---|--------|--------|
| 1 | Удаление мира в chat API | ✅ Готово |
| 2 | Атомарный старт игры | ✅ Готово |
| 3 | Синхронизация startQi | ✅ Готово (удалён) |
| 4 | Защита API логов | ✅ Готово |
| 5 | Prisma query logging | ✅ Готово |
| 6 | Выборка сообщений | ✅ Готово |
| 7 | Проход по типам | ⬜ Pending |

---

*Создано на основе внешнего код-ревью от 2026-02-14*
