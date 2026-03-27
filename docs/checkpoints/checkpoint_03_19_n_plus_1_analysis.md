# 🔍 Анализ N+1 запросов в `src/app/api/chat/route.ts`

**Дата анализа:** 2026-03-19
**Статус:** ⚠️ ЕСТЬ ПРОБЛЕМА (2 места)

---

## 📋 Что такое N+1 проблема?

**N+1 проблема** — это когда вместо одного запроса к БД выполняется N+1 запросов:
- 1 запрос на изменение данных
- N запросов на чтение тех же данных

**Правильный подход:** Использовать `update` с возвратом обновлённой записи.

---

## 🔴 Место #1: Чит-команды (строки 208-217)

**Код:**
```typescript
// Строка 208-212: update внутри executeCheat
const cheatResult = await executeCheat(
  parsedCommand.cheatCommand as CheatCommand,
  session.character.id,
  parsedCommand.cheatParams || {}
);

// Строка 215-217: отдельный findUnique
const updatedCharacter = await db.character.findUnique({
  where: { id: session.character.id },
});
```

**Проблема:**
1. `executeCheat()` делает `db.character.update()` — 1 запрос
2. Сразу после делается `db.character.findUnique()` — +1 запрос

**Итого:** 2 запроса вместо 1

**Исправление:**
```typescript
// executeCheat должен возвращать обновлённого персонажа
const { success, message, data, updatedCharacter } = await executeCheat(
  parsedCommand.cheatCommand as CheatCommand,
  session.character.id,
  parsedCommand.cheatParams || {}
);

// Убрать findUnique — использовать updatedCharacter из executeCheat
```

---

## 🔴 Место #2: Прорыв в культивации (строки 339-347)

**Код:**
```typescript
// Строка 339-342: update
await db.character.update({
  where: { id: session.characterId },
  data: { ...mechanicsUpdate, updatedAt: new Date() },
});

// Строка 345-347: findUnique
const updatedCharacter = await db.character.findUnique({
  where: { id: session.characterId },
});
```

**Проблема:**
1. `db.character.update()` — 1 запрос
2. `db.character.findUnique()` — +1 запрос

**Итого:** 2 запроса вместо 1

**Исправление:**
```typescript
// Использовать update с возвратом
const updatedCharacter = await db.character.update({
  where: { id: session.characterId },
  data: { ...mechanicsUpdate, updatedAt: new Date() },
  include: {
    // если нужны связанные данные
  }
});

// findUnique убрать
```

---

## ✅ Правильный пример (строки 853-870)

**Код:**
```typescript
await db.character.update({
  where: { id: session.characterId },
  data: {
    ...combinedStateUpdate,
    updatedAt: new Date(),
  },
});
```

**Здесь нет N+1** — после update не делается findUnique, потому что данные уже есть в `combinedStateUpdate`.

---

## 📊 Влияние на производительность

| Метрика | Сейчас | После исправления |
|---------|--------|-------------------|
| Запросов на чит-команду | 2 | 1 |
| Запросов на прорыв | 2 | 1 |
| Лишних запросов за запрос | 2 | 0 |

**При нагрузке 100 запросов/мин:**
- Сейчас: 200 запросов к БД/мин
- После: 100 запросов к БД/мин (экономия 50%)

---

## 🔧 План исправления

### Задача 1: Исправить executeCheat

**Файл:** `src/lib/game/cheats.ts` (или где находится функция)

**Изменить сигнатуру:**
```typescript
// Было
async function executeCheat(command, characterId, params): Promise<CheatResult>

// Станет
async function executeCheat(command, characterId, params): Promise<CheatResult & { updatedCharacter: Character }>
```

**Внутри функции:**
```typescript
const updatedCharacter = await db.character.update({
  where: { id: characterId },
  data: { ... },
  // include если нужно
});

return {
  success: true,
  message: "...",
  data: {},
  updatedCharacter,  // ← добавить
};
```

### Задача 2: Исправить прорыв

**Файл:** `src/app/api/chat/route.ts`

**Заменить (строки 339-347):**
```typescript
// Было
await db.character.update({
  where: { id: session.characterId },
  data: { ...mechanicsUpdate, updatedAt: new Date() },
});

const updatedCharacter = await db.character.findUnique({
  where: { id: session.characterId },
});

// Станет
const updatedCharacter = await db.character.update({
  where: { id: session.characterId },
  data: { ...mechanicsUpdate, updatedAt: new Date() },
});
```

---

## ⚠️ Риски

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Изменение сигнатуры executeCheat | Низкий | Обновить все вызовы |
| Изменение типа возвращаемого значения | Низкий | TypeScript укажет ошибки |

---

## 📚 Ссылки

- **Основной документ:** `docs/checkpoints/checkpoint_03_19.md`
- **Файл с проблемой:** `src/app/api/chat/route.ts`

---

*Анализ создан: 2026-03-19*
