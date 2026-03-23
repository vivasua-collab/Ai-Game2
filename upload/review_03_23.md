# 📋 ОТЧЁТ О КОД-РЕВЬЮ

**Проект:** Ai-Game2 (Cultivation World Simulator)  
**Ветка:** main2d5  
**Дата:** 2025-03-23  
**Ревьювер:** AI Code Reviewer

---

## 📊 ИТОГОВАЯ СТАТИСТИКА

| Категория | Критично | Высокий | Средний | Низкий |
|-----------|----------|---------|---------|--------|
| Безопасность | 1 | 1 | 0 | 1 |
| Баги | 3 | 4 | 4 | 0 |
| Архитектура | 0 | 0 | 3 | 2 |
| Мёртвый код | 0 | 0 | 2 | 1 |
| **ИТОГО** | **4** | **5** | **9** | **4** |

---

## 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ (Требуют немедленного исправления)

### 1. Уязвимость безопасности: Database Reset API без авторизации

**Файл:** `src/app/api/database/reset/route.ts`  
**Строки:** 5-9  
**Серьёзность:** 🔴 CRITICAL

```typescript
export async function POST() {
  // NO AUTHENTICATION CHECK!
  await logInfo("SYSTEM", "Database reset requested");
  const result = await resetDatabase();
```

**Проблема:**  
Эндпоинт `/api/database/reset` не имеет **никакой авторизации, rate limiting или проверки прав**. Любой пользователь может полностью удалить базу данных, отправив простой POST запрос.

**Решение:**
```typescript
import { validateAdminAccess } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // Добавить проверку авторизации
  const authResult = await validateAdminAccess(request);
  if (!authResult.authorized) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // Добавить rate limiting
  // ... existing code
}
```

---

### 2. SSR Crash: localStorage в серверном контексте

**Файл:** `src/game/scenes/LocationScene.ts`  
**Строка:** 247  
**Серьёзность:** 🔴 CRITICAL

```typescript
const characterId = localStorage.getItem('characterId');
```

**Проблема:**  
Прямое обращение к `localStorage` без проверки контекста вызовет крах приложения при Server-Side Rendering (SSR). Next.js 16 использует гибридный рендеринг, и этот код может выполняться на сервере.

**Решение:**
```typescript
const characterId = typeof window !== 'undefined' 
  ? localStorage.getItem('characterId') 
  : null;

// Или использовать useEffect для клиентского кода
useEffect(() => {
  if (typeof window !== 'undefined') {
    const id = localStorage.getItem('characterId');
    // ... use id
  }
}, []);
```

---

### 3. Memory Leak: Слушатели событий window не удаляются

**Файл:** `src/game/scenes/LocationScene.ts`  
**Строки:** 877-892  
**Серьёзность:** 🔴 CRITICAL

```typescript
// setupAI() - добавление слушателей
window.addEventListener('npc:move', ((event: CustomEvent) => {
  this.handleNPCMove(data);
}) as EventListener);

window.addEventListener('npc:attack', ((event: CustomEvent) => {
  this.handleNPCAttack(data);
}) as EventListener);

window.addEventListener('npc_ai:tick', (() => {
  this.onAITick();
}) as EventListener);

// ⚠️ НЕТ СООТВЕТСТВУЮЩИХ removeEventListener!
```

**Проблема:**  
При переключении между сценами (WorldScene → LocationScene → WorldScene) слушатели событий остаются в памяти. Это приводит к:
- Утечкам памяти
- Callback'ам на уничтоженных сценах
- Дублированию обработчиков при повторном создании сцены

**Решение:**
```typescript
// Хранить ссылки на bound handlers
private boundNPCMove: ((event: Event) => void) | null = null;
private boundNPCAttack: ((event: Event) => void) | null = null;
private boundAITick: ((event: Event) => void) | null = null;

private setupAI(): void {
  // Создать bound handlers
  this.boundNPCMove = ((event: Event) => {
    const data = (event as CustomEvent).detail as NPCMoveEvent;
    this.handleNPCMove(data);
  }) as EventListener;
  
  window.addEventListener('npc:move', this.boundNPCMove);
  // ... аналогично для других
  
  console.log('[LocationScene] AI system initialized');
}

// Добавить метод shutdown
shutdown(): void {
  // Удалить все слушатели
  if (this.boundNPCMove) {
    window.removeEventListener('npc:move', this.boundNPCMove);
  }
  if (this.boundNPCAttack) {
    window.removeEventListener('npc:attack', this.boundNPCAttack);
  }
  if (this.boundAITick) {
    window.removeEventListener('npc_ai:tick', this.boundAITick);
  }
  
  // Очистить другие ресурсы
  this.npcPhysicsSprites.clear();
  this.npcs.clear();
  
  console.log('[LocationScene] Shutdown complete');
}
```

---

### 4. Система зарядки техник не реализована (STUB)

**Файл:** `src/game/services/TechniqueSlotsManager.ts`  
**Строки:** 576-584  
**Серьёзность:** 🔴 CRITICAL

```typescript
private updateCharging(): void {
  // TODO: Интегрировать с technique-charging.ts
  // Пока просто обновляем isCharging
  for (const slot of this.state.slots) {
    if (slot.isCharging) {
      // Заглушка - через 1 секунду зарядка завершается
      // ⚠️ This is a stub - charging never actually completes!
    }
  }
}
```

**Проблема:**  
Техники, требующие время зарядки (charge time), **никогда не завершат зарядку**. Это полностью нарушает геймплей для определённых типов техник.

**Решение:**
```typescript
private updateCharging(delta: number): void {
  for (const slot of this.state.slots) {
    if (slot.isCharging && slot.chargeTime && slot.chargeProgress !== undefined) {
      slot.chargeProgress += delta;
      
      if (slot.chargeProgress >= slot.chargeTime) {
        // Зарядка завершена
        slot.isCharging = false;
        slot.isCharged = true;
        slot.chargeProgress = slot.chargeTime;
        
        // Эмитировать событие завершения зарядки
        this.emit('chargeComplete', { slotIndex: slot.index });
      }
    }
  }
}
```

---

## 🟠 ВЫСОКИЙ ПРИОРИТЕТ

### 5. Mass Assignment Vulnerability

**Файл:** `src/app/api/npc/spawn/route.ts`  
**Строки:** 393-396  
**Серьёзность:** 🟠 HIGH

```typescript
// updates приходит напрямую из request.body без валидации!
const updated = await db.nPC.update({
  where: { id: npcId },
  data: updates,  // ⚠️ Mass Assignment vulnerability
});
```

**Проблема:**  
Злоумышленник может передать любые поля в `updates`, включая:
- `sessionId` - перенос NPC в другую сессию
- `cultivationLevel` - изменение уровня
- `isPreset` - изменение флага пресета

**Решение:**
```typescript
import { z } from "zod";

const NPCUpdateSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  cultivationLevel: z.number().int().min(1).max(9).optional(),
  cultivationSubLevel: z.number().int().min(0).max(9).optional(),
  currentQi: z.number().int().min(0).optional(),
  disposition: z.number().min(-100).max(100).optional(),
  // Только разрешённые поля
});

// В обработчике:
const validationResult = NPCUpdateSchema.safeParse(updates);
if (!validationResult.success) {
  return NextResponse.json({
    success: false,
    error: "Invalid update data",
    details: validationResult.error.issues,
  }, { status: 400 });
}

const updated = await db.nPC.update({
  where: { id: npcId },
  data: validationResult.data,
});
```

---

### 6. Race Condition: Обновление Qi

**Файл:** `src/game/services/TechniqueSlotsManager.ts`  
**Строки:** 296-318  
**Серьёзность:** 🟠 HIGH

```typescript
async use(...): Promise<TechniqueUseResult> {
  // Проверка возможности использования
  const check = this.canUse();
  if (!check.canUse) {
    return { success: false, reason: check.reason };
  }
  
  // ⚠️ Между canUse() и вычитанием Qi состояние может измениться!
  // Другой вызов может уже использовать Qi
  
  this.characterQi -= qiCost; // Может стать отрицательным!
```

**Проблема:**  
При быстрых последовательных вызовах (double-click, auto-fire) Qi может стать отрицательным.

**Решение:**
```typescript
// Использовать мьютекс или атомарную операцию
private isProcessingUse = false;

async use(...): Promise<TechniqueUseResult> {
  // Блокировка
  if (this.isProcessingUse) {
    return { success: false, reason: 'already_using' };
  }
  
  this.isProcessingUse = true;
  try {
    const check = this.canUse();
    if (!check.canUse) {
      return { success: false, reason: check.reason };
    }
    
    // Атомарное обновление с проверкой
    if (this.characterQi < qiCost) {
      return { success: false, reason: 'insufficient_qi' };
    }
    this.characterQi -= qiCost;
    
    // ... execute technique
  } finally {
    this.isProcessingUse = false;
  }
}
```

---

### 7. Отсутствие транзакций при множественных обновлениях

**Файл:** `src/app/api/chat/route.ts`  
**Строки:** 248-254, 285-289  
**Серьёзность:** 🟠 HIGH

```typescript
// Первое обновление
await db.character.update({
  where: { id: session.characterId },
  data: { ...mechanicsUpdate, updatedAt: new Date() },
});

// ... какой-то код ...

// Второе обновление - без транзакции!
await db.character.update({
  where: { id: session.characterId },
  data: { ...otherUpdate, updatedAt: new Date() },
});
```

**Проблема:**  
При сбое между обновлениями база данных останется в неконсистентном состоянии.

**Решение:**
```typescript
import { db } from "@/lib/db";

await db.$transaction(async (tx) => {
  // Первое обновление
  await tx.character.update({
    where: { id: session.characterId },
    data: { ...mechanicsUpdate, updatedAt: new Date() },
  });
  
  // Второе обновление
  await tx.character.update({
    where: { id: session.characterId },
    data: { ...otherUpdate, updatedAt: new Date() },
  });
});
```

---

### 8. Небезопасный JSON.parse без try-catch

**Файл:** `src/app/api/technique/use/route.ts`  
**Строки:** 137-139  
**Серьёзность:** 🟠 HIGH

```typescript
statRequirements: tech.statRequirements ? JSON.parse(tech.statRequirements) : undefined,
statScaling: tech.statScaling ? JSON.parse(tech.statScaling) : undefined,
effects: tech.effects ? JSON.parse(tech.effects) : {},
```

**Проблема:**  
Если JSON в базе данных повреждён, запрос упадёт с ошибкой 500.

**Решение:**
```typescript
function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('[safeJsonParse] Failed to parse:', json, error);
    return fallback;
  }
}

// Использование:
statRequirements: safeJsonParse(tech.statRequirements, undefined),
statScaling: safeJsonParse(tech.statScaling, undefined),
effects: safeJsonParse(tech.effects, {}),
```

---

### 9. Memory Leak: Tween с repeat: -1

**Файл:** `src/game/scenes/WorldScene.ts`  
**Строки:** 90-98  
**Серьёзность:** 🟠 HIGH

```typescript
this.tweens.add({
  targets: particle,
  y: y - Phaser.Math.Between(20, 50),
  alpha: { from: 0.3, to: 0.1 },
  duration: Phaser.Math.Between(2000, 4000),
  yoyo: true,
  repeat: -1,  // ⚠️ Бесконечный tween без cleanup
  delay: Phaser.Math.Between(0, 1000),
});
```

**Проблема:**  
Particles с бесконечными tween никогда не очищаются при shutdown сцены.

**Решение:**
```typescript
// В WorldScene
shutdown(): void {
  // Убить все активные tweens
  this.tweens.killAll();
  
  // Очистить locations map
  this.locations.clear();
  
  // Скрыть tooltip
  this.hideTooltip();
  
  console.log('[WorldScene] Shutdown complete');
}
```

---

## 🟡 СРЕДНИЙ ПРИОРИТЕТ

### 10. Мёртвый код: inventory/sync/route.ts

**Файл:** `src/app/api/inventory/sync/route.ts`  
**Строки:** 29-86, 174-519  
**Серьёзность:** 🟡 MEDIUM

**Проблема:**  
POST handler возвращает 501 (Not Implemented), но содержит ~350 строк кода функций, которые никогда не вызываются:
- `handleMoveItem`
- `moveToInventory`
- `equipToSlot`
- `handleAddItem`
- `handleRemoveItem`
- `handleSplitStack`
- `handleMergeStack`
- `handleFullSync`

**Рекомендация:**
1. **Удалить** файл если функционал не планируется
2. Или **реализовать** недостающие зависимости:
   - `TruthSystem.isSessionLoaded()`
   - `INVENTORY_EVENT_TYPES`

---

### 11. Компонент NPCViewerPanel нигде не используется

**Файл:** `src/components/settings/NPCViewerPanel.tsx`  
**Размер:** 652 строки кода  
**Серьёзность:** 🟡 MEDIUM

**Проблема:**  
Компонент экспортируется, но не импортируется ни в одном файле проекта.

**Рекомендация:**
1. Интегрировать в настройки: `src/components/settings/SettingsPanel.tsx`
2. Или удалить для уменьшения размера бандла

---

### 12. Проблема N+1 запросов (потенциальная)

**Файл:** `src/app/api/npc/spawn/route.ts`  
**Строки:** 68-109  
**Серьёзность:** 🟡 MEDIUM

```typescript
const dbNpcs = await db.nPC.findMany({
  where: locationId ? { sessionId, locationId } : { sessionId },
});

for (const dbNpc of dbNpcs) {
  npcs.push({
    // ... constructing objects one by one
  });
}
```

**Рекомендация:**  
Использовать `include` в Prisma для загрузки связанных данных одним запросом:
```typescript
const dbNpcs = await db.nPC.findMany({
  where: { sessionId },
  include: {
    location: true,
    sect: true,
  },
});
```

---

### 13. Утечка памяти: Progress Bar Event

**Файл:** `src/game/scenes/BaseScene.ts`  
**Строки:** 163-186  
**Серьёзность:** 🟡 MEDIUM

```typescript
protected createProgressBar(...): Phaser.GameObjects.Graphics {
  // ...
  this.events.on('update', draw);  // ⚠️ Никогда не удаляется!
  return bar;
}
```

**Решение:**
```typescript
// Хранить ссылку на callback
private progressCallbacks: Map<string, () => void> = new Map();

protected createProgressBar(id: string, ...): Phaser.GameObjects.Graphics {
  const draw = () => { /* ... */ };
  this.events.on('update', draw);
  this.progressCallbacks.set(id, draw);
  return bar;
}

protected destroyProgressBar(id: string): void {
  const callback = this.progressCallbacks.get(id);
  if (callback) {
    this.events.off('update', callback);
    this.progressCallbacks.delete(id);
  }
}
```

---

### 14. Дублирование текстур при рестарте сцены

**Файл:** `src/game/scenes/LocationScene.ts`  
**Строки:** 491-548  
**Серьёзность:** 🟡 MEDIUM

```typescript
private createTargetTexture(): void {
  const graphics = this.make.graphics({ x: 0, y: 0 });
  // ...
  graphics.generateTexture('target', width, height);
  graphics.destroy();
  // ⚠️ Текстура 'target' накапливается при многократном создании сцены
}
```

**Решение:**
```typescript
private createTargetTexture(): void {
  // Удалить старую текстуру если существует
  if (this.textures.exists('target')) {
    this.textures.remove('target');
  }
  
  const graphics = this.make.graphics({ x: 0, y: 0 });
  // ... create texture
}
```

---

### 15. Использование `any` типа

**Файлы с проблемой:**
- `src/components/game/PhaserGame.tsx` (строки 147, 156, 567)
- `src/services/inventory.service.ts` (строка 78)
- `src/app/api/technique/use/route.ts` (строки 124-128)

**Пример:**
```typescript
// Плохо
function mapDbItemToInterface(item: any): InventoryItem { ... }

// Хорошо
interface DbInventoryItem {
  id: string;
  name: string;
  // ... другие поля
}

function mapDbItemToInterface(item: DbInventoryItem): InventoryItem { ... }
```

---

### 16. NPC Position Desync

**Файл:** `src/game/scenes/LocationScene.ts`  
**Строки:** 855-861  
**Серьёзность:** 🟡 MEDIUM

```typescript
// Синхронизация в update()
for (const [id, sprite] of this.npcPhysicsSprites) {
  const npc = this.npcs.get(id);
  if (npc) {
    npc.x = sprite.x;
    npc.y = sprite.y;
  }
}
```

**Проблема:**  
Если `npcPhysicsSprites` и `npcs` Map рассинхронизируются (например, после смерти NPC), позиции не будут обновляться корректно.

**Решение:**
```typescript
// Добавить валидацию
for (const [id, sprite] of this.npcPhysicsSprites) {
  const npc = this.npcs.get(id);
  if (npc && sprite.active) {  // Проверить что sprite активен
    npc.x = sprite.x;
    npc.y = sprite.y;
  } else if (!sprite.active) {
    // Удалить неактивный sprite из map
    this.npcPhysicsSprites.delete(id);
  }
}
```

---

### 17. Отсутствие экспорта сервисов в index

**Файл:** `src/services/index.ts`  
**Серьёзность:** 🟡 MEDIUM

**Сервисы не экспортируются:**
- `inventory.service.ts`
- `time-tick.service.ts`
- `technique-pool.service.ts`
- `map.service.ts`
- `inventory-sync.service.ts`
- `character-data.service.ts`
- `game-bridge.service.ts`
- `cheats.service.ts`

**Решение:**
```typescript
// src/services/index.ts
export * from './game.service';
export * from './character.service';
export * from './inventory.service';
export * from './time-tick.service';
export * from './technique-pool.service';
export * from './map.service';
export * from './inventory-sync.service';
export * from './character-data.service';
export * from './game-bridge.service';
export * from './cheats.service';
```

---

### 18. Double-Destroy Risk в NPCSprite

**Файл:** `src/game/objects/NPCSprite.ts`  
**Строки:** 519-528  
**Серьёзность:** 🟡 MEDIUM

```typescript
destroy(fromScene?: boolean): void {
  this.aura?.destroy();
  this.bodyCircle?.destroy();
  // ... другие destroy
  
  // ⚠️ Если scene shutdown уже уничтожил эти объекты,
  // будет double-destroy
}
```

**Решение:**
```typescript
destroy(fromScene?: boolean): void {
  // Проверять active перед destroy
  if (this.aura?.active) this.aura.destroy();
  if (this.bodyCircle?.active) this.bodyCircle.destroy();
  // ... аналогично для других объектов
  
  super.destroy(fromScene);
}
```

---

## 🟢 НИЗКИЙ ПРИОРИТЕТ

### 19. $executeRawUnsafe с интерполяцией

**Файл:** `src/lib/migrations.ts`  
**Строки:** 95-98  
**Серьёзность:** 🟢 LOW

```typescript
await db.$executeRawUnsafe(`
  INSERT INTO _schema_version (id, version) VALUES (1, ${version})
  ON CONFLICT(id) DO UPDATE SET version = ${version}, updated_at = CURRENT_TIMESTAMP
`);
```

**Риск:** Низкий (version контролируется внутренне), но плохой паттерн безопасности.

**Рекомендация:** Использовать параметризованные запросы Prisma:
```typescript
await db.$executeRaw`
  INSERT INTO _schema_version (id, version) VALUES (1, ${version})
  ON CONFLICT(id) DO UPDATE SET version = ${version}, updated_at = CURRENT_TIMESTAMP
`;
```

---

### 20. EventBusTest в production коде

**Файл:** `src/components/game/EventBusTest.tsx`  
**Серьёзность:** 🟢 LOW

**Рекомендация:** Переместить в `__tests__` или удалить.

---

### 21. AI Timer Precision

**Файл:** `src/game/scenes/LocationScene.ts`  
**Строка:** 1006  
**Серьёзность:** 🟢 LOW

```typescript
this.aiUpdateTimer += 16; // ~60 FPS - предположение
```

**Рекомендация:** Использовать фактический `delta` из update loop:
```typescript
update(time: number, delta: number): void {
  this.aiUpdateTimer += delta;
  // ...
}
```

---

## 📋 ПЛАН ИСПРАВЛЕНИЙ

### Приоритет 1 (Немедленно):

| # | Проблема | Файл | Оценка времени |
|---|----------|------|----------------|
| 1 | API без авторизации | `database/reset/route.ts` | 2 часа |
| 2 | SSR crash | `LocationScene.ts:247` | 30 мин |
| 3 | Memory leak (event listeners) | `LocationScene.ts` | 2 часа |
| 4 | Система зарядки | `TechniqueSlotsManager.ts` | 4 часа |

### Приоритет 2 (Ближайшая неделя):

| # | Проблема | Файл | Оценка времени |
|---|----------|------|----------------|
| 5 | Mass Assignment | `npc/spawn/route.ts` | 2 часа |
| 6 | Race Condition Qi | `TechniqueSlotsManager.ts` | 2 часа |
| 7 | Транзакции | `chat/route.ts` | 1 час |
| 8 | JSON.parse safety | `technique/use/route.ts` | 1 час |
| 9 | Tween memory leak | `WorldScene.ts` | 1 час |

### Приоритет 3 (Рефакторинг):

| # | Проблема | Файл | Оценка времени |
|---|----------|------|----------------|
| 10 | Мёртвый код | `inventory/sync/route.ts` | 2 часа |
| 11 | Неиспользуемый компонент | `NPCViewerPanel.tsx` | 1 час |
| 12 | N+1 queries | `npc/spawn/route.ts` | 1 час |
| 13 | Progress bar leak | `BaseScene.ts` | 1 час |
| 14 | Texture duplication | `LocationScene.ts` | 30 мин |
| 15 | `any` types | Множество файлов | 4 часа |
| 16 | Position desync | `LocationScene.ts` | 2 часа |
| 17 | Services index | `services/index.ts` | 30 мин |
| 18 | Double-destroy | `NPCSprite.ts` | 1 час |

---

## 🏗️ АРХИТЕКТУРА ПРОЕКТА

### Технологический стек:
- **Framework:** Next.js 16.1.1 (App Router)
- **Frontend:** React 19, TypeScript 5
- **Styling:** Tailwind CSS 4, shadcn/ui
- **Database:** Prisma ORM (SQLite)
- **Game Engine:** Phaser 3.90
- **State Management:** Zustand 5

### Размер проекта:
- ~200+ TypeScript файлов
- 18 API routes
- 4 Phaser scenes
- 20+ React components

### Качество кода:
- ✅ Хорошая документация в `docs/`
- ✅ TypeScript strict mode включён
- ⚠️ `noImplicitAny: false` - снижает типобезопасность
- ❌ Критические баги безопасности
- ❌ Memory leaks в game engine

---

## ✅ ЗАКЛЮЧЕНИЕ

Проект **Ai-Game2** представляет собой амбициозную RPG игру с интересной механикой культивации. Код-ревью выявило **22 проблемы** различной серьёзности.

**Критические проблемы** требуют немедленного исправления перед любым production deployment:
1. Уязвимость безопасности в API
2. SSR crash
3. Memory leaks в Phaser
4. Неработающая игровая механика

**Общая оценка качества кода:** ⭐⭐⭐☆☆ (3/5)

После исправления критических и высокоприоритетных проблем, проект будет готов к дальнейшему развитию и тестированию.

---

*Отчёт сгенерирован автоматически. Дата: 2025-03-23*
