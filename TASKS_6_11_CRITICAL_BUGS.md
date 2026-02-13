# Дополнительные задачи 6-11 из внешнего код-ревью

---

## 🔴 ЗАДАЧА 6: Критичный рассинхрон времени

### Проблема
Сервер отдаёт `timeAdvance`, но клиент ориентируется только на `updatedTime`.

### Анализ кода

**Сервер (chat/route.ts):**
```typescript
// При прорыве возвращается:
return NextResponse.json({
  response: {
    timeAdvance: { minutes: 30 },  // ✅ Возвращается
  },
  updatedTime: null,                // ❌ null!
});
```

**Клиент (useGame.ts):**
```typescript
// Обновляет время ТОЛЬКО если есть updatedTime
if (data.updatedTime) {  // ❌ null - не заходит!
  updatedWorldTime = { ... };
}
```

### Результат
После медитации/прорыва игровое время **НЕ обновляется** на клиенте.

### Решение

**Вариант A: Сервер вычисляет updatedTime**
```typescript
// В chat/route.ts после медитации/прорыва:
const updatedTime = calculateUpdatedTime(session, timeAdvanceForMechanics);

return NextResponse.json({
  response: { ... },
  updatedTime,  // Вычисленное время
});
```

**Вариант B: Клиент обрабатывает timeAdvance**
```typescript
// В useGame.ts:
if (data.updatedTime) {
  // Прямое обновление
} else if (data.response.timeAdvance) {
  // Вычислить на клиенте
  updatedWorldTime = advanceTime(prev.worldTime, data.response.timeAdvance);
}
```

### Рекомендация
**Вариант A** - сервер должен быть источником истины для времени.

---

## 🔴 ЗАДАЧА 7: Инвертированная логика усталости при прорыве

### Проблема
Прорыв должен **добавлять** усталость, но код **вычитает** её.

### Анализ кода

**Константы (constants.ts):**
```typescript
FATIGUE: {
  PHYSICAL_BASE: 10,    // ← Усталость ПРИ прорыве
  MENTAL_MINOR: 25,     // ← Усталость ПРИ прорыве
  MENTAL_MAJOR: 40,     // ← Усталость ПРИ прорыве
}
```

**Расчёт (qi-shared.ts):**
```typescript
// fatigueGained - сколько усталости ДОБАВИТЬ
const fatigueGained = {
  physical: BREAKTHROUGH_CONSTANTS.FATIGUE.PHYSICAL_BASE,  // 10
  mental: isMajorBreakthrough ? 40 : 25,
};
return { fatigueGained, ... };
```

**Применение (chat/route.ts):**
```typescript
// ❌ ОШИБКА: вычитаем вместо сложения!
mechanicsUpdate = {
  fatigue: Math.max(0, session.character.fatigue - result.fatigueGained.physical),
  //                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  mentalFatigue: Math.max(0, (session.character.mentalFatigue || 0) - result.fatigueGained.mental),
};
```

### Результат
После успешного прорыва персонаж становится **менее** уставшим вместо **более** уставшим!

### Исправление
```typescript
mechanicsUpdate = {
  // Правильно: ДОБАВЛЯЕМ усталость
  fatigue: Math.min(100, session.character.fatigue + result.fatigueGained.physical),
  mentalFatigue: Math.min(100, (session.character.mentalFatigue || 0) + result.fatigueGained.mental),
};
```

---

## 🟠 ЗАДАЧА 8: Неполная транзакционность

### Проблема
При перезапуске мира операции удаления выполняются последовательно без транзакции.

### Текущий код
```typescript
// Операции выполняются по очереди
await db.message.deleteMany({ where: { sessionId } });
await db.nPC.deleteMany({ where: { sessionId } });
await db.location.deleteMany({ where: { sessionId } });
await db.sect.deleteMany({ where: { sessionId } });
await db.character.deleteMany({ where: { id: session.characterId } });
await db.gameSession.delete({ where: { id: sessionId } });
```

### Риск
При ошибке на 3-й операции:
- ✅ Сообщения удалены
- ✅ NPC удалены
- ❌ Локации НЕ удалены
- ❌ Секты НЕ удалены
- ❌ Персонаж НЕ удалён
- ❌ Сессия НЕ удалена

**Результат:** Частично удалённый мир, orphaned records.

### Решение
```typescript
await db.$transaction([
  db.message.deleteMany({ where: { sessionId } }),
  db.nPC.deleteMany({ where: { sessionId } }),
  db.location.deleteMany({ where: { sessionId } }),
  db.sect.deleteMany({ where: { sessionId } }),
  db.character.deleteMany({ where: { id: session.characterId } }),
  db.gameSession.delete({ where: { id: sessionId } }),
]);
```

---

## 🟡 ЗАДАЧА 9: Ослабленная валидация customConfig

### Проблема
`customConfig` в `startGameSchema` использует `z.record(z.unknown())` - почти без ограничений.

### Текущий код
```typescript
export const startGameSchema = z.object({
  variant: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  customConfig: z.record(z.unknown()).optional(),  // ← Слишком宽松
  characterName: z.string().min(1).max(50).optional(),
});
```

### Решение
```typescript
const customConfigSchema = z.object({
  location: z.string().max(200).optional(),
  age: z.number().int().min(10).max(1000).optional(),
  coreCapacity: z.number().int().min(100).max(1000000).optional(),
  knowsAboutSystem: z.boolean().optional(),
  startQi: z.number().int().min(0).max(1000000).optional(),
  strength: z.number().min(1).max(100).optional(),
  agility: z.number().min(1).max(100).optional(),
  intelligence: z.number().min(1).max(100).optional(),
});

export const startGameSchema = z.object({
  variant: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  customConfig: customConfigSchema.optional(),
  characterName: z.string().min(1).max(50).optional(),
});
```

---

## 🟡 ЗАДАЧА 10: Build-зависимость от Google Fonts

### Проблема
`layout.tsx` использует `next/font/google` - требует интернет при build.

### Текущий код
```typescript
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ ... });
const geistMono = Geist_Mono({ ... });
```

### Решение

**Вариант A: Локальные шрифты**
```typescript
import localFont from "next/font/local";

const geistSans = localFont({
  src: "./fonts/Geist.woff2",
  variable: "--font-geist-sans",
});
```

**Вариант B: Fallback на системные**
```typescript
// Удалить Google Fonts, использовать CSS fallback
const fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
```

**Вариант C: Отложенная загрузка (adjustFontFallback)**
```typescript
const geistSans = Geist({
  adjustFontFallback: true,  // Автоматический fallback
  fallback: ["system-ui", "sans-serif"],
  subsets: ["latin"],
});
```

---

## 🟢 ЗАДАЧА 11: Несоответствие metadata

### Проблема
`layout.tsx` metadata описывает "Z.ai Code Scaffold" вместо "Cultivation World Simulator".

### Текущий код
```typescript
export const metadata: Metadata = {
  title: "Z.ai Code Scaffold - AI-Powered Development",
  description: "Modern Next.js scaffold...",
  // ...
};
```

### Исправление
```typescript
export const metadata: Metadata = {
  title: "🌸 Cultivation World Simulator",
  description: "Immersive text-based cultivation game with AI-powered storytelling. Progress through cultivation realms, master techniques, and explore a rich fantasy world.",
  keywords: ["cultivation", "game", "xianxia", "text adventure", "AI game", "cultivation simulator"],
  authors: [{ name: "Cultivation World Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Cultivation World Simulator",
    description: "AI-powered cultivation adventure game",
    type: "website",
  },
};
```

---

## Приоритет выполнения

| Задача | Приоритет | Критичность | Время |
|--------|-----------|-------------|-------|
| **6. Рассинхрон времени** | 🔴 High | Баг, ломает игру | 30 мин |
| **7. Усталость прорыва** | 🔴 High | Баг, нарушает баланс | 15 мин |
| **8. Транзакционность** | 🟠 Medium | Риск потери данных | 20 мин |
| **9. Валидация customConfig** | 🟡 Medium | Безопасность | 15 мин |
| **10. Google Fonts** | 🟡 Medium | Build в офлайне | 15 мин |
| **11. Metadata** | 🟢 Low | Брендинг | 5 мин |

**Общее время: ~1.5 часа**

---

## Порядок выполнения

1. **Задача 7** (усталость) - критичный баг
2. **Задача 6** (время) - критичный баг
3. **Задача 8** (транзакции) - безопасность данных
4. **Задача 11** (metadata) - быстро, визуальное улучшение
5. **Задача 10** (шрифты) - build stability
6. **Задача 9** (валидация) - безопасность
