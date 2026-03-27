# ФАЗА 5: Обновление API Routes

**Дата:** 2026-03-27 08:02 UTC
**Дата обновления:** 2026-03-27 12:55 UTC
**Дата завершения:** 2026-03-27 16:30 UTC
**Статус:** ✅ ЗАВЕРШЕНА
**Зависит от:** Фаза 3, Фаза 4
**Координатор:** `checkpoint_03_27_npc_redesign.md`

---

## 🎯 ЦЕЛЬ ФАЗЫ

Обновить все API routes для использования TruthSystem вместо отдельных менеджеров.

---

## 🔍 РАСШИРЕННОЕ ИССЛЕДОВАНИЕ

### Аудит API routes

#### 5.1 /api/ai/tick/route.ts

**Текущее состояние:**
- Вызывает `npcAIManager.updateAllNPCs()` без sessionId
- Пытается загрузить NPC через `loadNPCsToWorldManager()`
- Читает из `npcWorldManager.getWorldState()`

**Проблемы:**
- `updateAllNPCs()` теперь требует sessionId
- `loadNPCsToWorldManager()` не нужен
- `npcWorldManager` будет удалён

#### 5.2 /api/temp-npc/route.ts

**Текущее состояние:**
- Генерирует NPC через `sessionNPCManager.initializeLocation()`
- Возвращает TempNPC[] клиенту

**Изменения:**
- Теперь возвращает NPCState[] (совместимо по структуре)
- Нужно обновить типы ответов

---

## 📁 ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

| Файл | Изменение | Риск |
|------|-----------|------|
| `src/app/api/ai/tick/route.ts` | Использовать TruthSystem | Высокий |
| `src/app/api/ai/player-position/route.ts` | Использовать TruthSystem | Средний |
| `src/app/api/temp-npc/route.ts` | Использовать TruthSystem | Средний |
| `src/app/api/npc/state/route.ts` | Использовать TruthSystem | Средний |
| `src/app/api/npc/spawn/route.ts` | Использовать TruthSystem | Средний |

---

## 📐 ИЗМЕНЕНИЯ ПО ФАЙЛАМ

### 1. /api/ai/tick/route.ts

**Удалить:**
```typescript
import { sessionNPCManager } from '@/lib/game/session-npc-manager';
import { getNPCWorldManager } from '@/lib/game/npc-world-manager';

// В POST():
const npcWorldManager = (npcAIManager as any).npcWorldManager;
await loadNPCsToWorldManager(sessionId, targetLocationId, npcWorldManager);
```

**Изменить POST():**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { TruthSystem } from '@/lib/game/truth-system';
import { getNPCAIManager } from '@/lib/game/ai/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { sessionId, playerX, playerY } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const truthSystem = TruthSystem.getInstance();
    const npcAIManager = getNPCAIManager();

    // Проверяем/загружаем сессию
    let session = truthSystem.getSessionState(sessionId);
    if (!session) {
      const result = await truthSystem.loadSession(sessionId);
      if (!result.success) {
        return NextResponse.json(
          { error: 'Session not found in database' },
          { status: 404 }
        );
      }
      session = truthSystem.getSessionState(sessionId);
    }

    const targetLocationId = session?.currentLocation?.id;

    // === АКТИВАЦИЯ NPC ВОКРУГ ИГРОКА ===
    if (targetLocationId && playerX !== undefined && playerY !== undefined) {
      const activatedNPCs = truthSystem.activateNearbyNPCs(
        sessionId,
        playerX,
        playerY,
        300, // ACTIVATION_RADIUS
        targetLocationId
      );
      
      console.log(`[API:ai/tick] Activated ${activatedNPCs.length} NPCs near player`);
    }

    // === ВЫПОЛНЯЕМ AI TICK ===
    await npcAIManager.updateAllNPCs(sessionId);

    // === ДЕАКТИВАЦИЯ ДАЛЁКИХ NPC ===
    if (targetLocationId && playerX !== undefined && playerY !== undefined) {
      const deactivatedCount = truthSystem.deactivateFarNPCs(
        sessionId,
        playerX,
        playerY,
        500, // MAX_DISTANCE
        targetLocationId
      );
      
      if (deactivatedCount > 0) {
        console.log(`[API:ai/tick] Deactivated ${deactivatedCount} far NPCs`);
      }
    }

    // Получаем статистику
    const stats = truthSystem.getNPCStats(sessionId);
    const aiStats = npcAIManager.getStats(sessionId);
    const tickTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processedNPCs: stats.active,
      tickTime,
      stats: {
        totalNPCs: stats.total,
        activeNPCs: stats.active,
        inactiveNPCs: stats.inactive,
        totalUpdates: aiStats.totalUpdates,
        avgUpdateTime: aiStats.avgUpdateTime,
      },
      locations: stats.byLocation,
    });
  } catch (error) {
    console.error('[API:ai/tick] Error:', error);
    return NextResponse.json(
      { error: 'Failed to execute AI tick' },
      { status: 500 }
    );
  }
}
```

**Изменить GET():**
```typescript
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const truthSystem = TruthSystem.getInstance();
    const npcAIManager = getNPCAIManager();

    const stats = truthSystem.getNPCStats(sessionId);
    const aiStats = npcAIManager.getStats(sessionId);

    return NextResponse.json({
      success: true,
      stats: {
        totalNPCs: stats.total,
        activeNPCs: stats.active,
        inactiveNPCs: stats.inactive,
        totalUpdates: aiStats.totalUpdates,
        avgUpdateTime: aiStats.avgUpdateTime,
      },
      byLocation: stats.byLocation,
    });
  } catch (error) {
    console.error('[API:ai/tick] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI stats' },
      { status: 500 }
    );
  }
}
```

### 2. /api/ai/player-position/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { TruthSystem } from '@/lib/game/truth-system';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, x, y } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const truthSystem = TruthSystem.getInstance();

    // Активируем NPC вокруг новой позиции
    const activated = truthSystem.activateNearbyNPCs(sessionId, x, y, 300);

    // Деактивируем далёких NPC
    const deactivated = truthSystem.deactivateFarNPCs(sessionId, x, y, 500);

    return NextResponse.json({
      success: true,
      activated: activated.length,
      deactivated,
    });
  } catch (error) {
    console.error('[API:player-position] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update player position' },
      { status: 500 }
    );
  }
}
```

### 3. /api/temp-npc/route.ts

**Обновить GET action=list:**
```typescript
case 'list': {
  if (!sessionId) {
    return NextResponse.json({
      success: false,
      error: 'sessionId обязателен',
    }, { status: 400 });
  }

  const truthSystem = TruthSystem.getInstance();
  const npcs = locationId
    ? truthSystem.getNPCsByLocation(sessionId, locationId)
    : truthSystem.getAllNPCs(sessionId);

  return NextResponse.json({
    success: true,
    npcs: npcs.map(npcStateToClient),
    total: npcs.length,
  });
}
```

**Обновить GET action=stats:**
```typescript
case 'stats': {
  if (!sessionId) {
    return NextResponse.json({
      success: false,
      error: 'sessionId обязателен',
    }, { status: 400 });
  }

  const truthSystem = TruthSystem.getInstance();
  const stats = truthSystem.getNPCStats(sessionId);

  return NextResponse.json({
    success: true,
    stats,
  });
}
```

**Добавить конвертер для клиента:**
```typescript
function npcStateToClient(npc: NPCState) {
  return {
    id: npc.id,
    name: npc.name,
    speciesId: npc.speciesId,
    speciesType: npc.speciesType,
    roleId: npc.roleId,
    locationId: npc.locationId,
    x: npc.x,
    y: npc.y,
    health: npc.health,
    maxHealth: npc.maxHealth,
    qi: npc.qi,
    maxQi: npc.maxQi,
    level: npc.level,
    subLevel: npc.subLevel,
    isActive: npc.isActive,
    aiState: npc.aiState,
    disposition: npc.disposition,
    aggressionLevel: npc.aggressionLevel,
    canTalk: npc.canTalk,
    canTrade: npc.canTrade,
    isDead: npc.isDead,
  };
}
```

---

## ⚠️ ВОЗМОЖНЫЕ ОШИБКИ

### Ошибка 1: sessionId is required

**Причина:** API теперь требует sessionId
**Решение:** Обновить клиентский код для отправки sessionId

### Ошибка 2: totalNPCs still 0

**Причина:** NPC не были сгенерированы
**Решение:** Сначала вызвать /api/temp-npc action=init

### Ошибка 3: Property 'npcs' does not exist

**Причина:** Фаза 1 не выполнена
**Решение:** Выполнить Фазы 1-4 сначала

### Ошибка 4: Session not found

**Причина:** Сессия не загружена в TruthSystem
**Решение:** Вызвать `truthSystem.loadSession(sessionId)` в API

---

## ✅ ЧЕК-ЛИСТ ВЫПОЛНЕНИЯ

### /api/ai/tick/route.ts

- [x] Удалить импорты NPCWorldManager
- [x] Изменить POST() - использовать TruthSystem
- [x] Изменить GET() - использовать TruthSystem
- [x] Удалить loadNPCsToWorldManager()

### /api/ai/player-position/route.ts

- [x] Изменить POST() - использовать TruthSystem

### /api/temp-npc/route.ts

- [x] Уже использует TruthSystem через sessionNPCManager (Фаза 3)
- [x] sessionNPCManager делегирует все операции в TruthSystem

### /api/npc/state/route.ts

- [x] Файл не существует - не требуется

### /api/npc/spawn/route.ts

- [x] Файл не существует - не требуется

---

## 🧪 ТЕСТИРОВАНИЕ ПОСЛЕ ФАЗЫ

### Тест /api/ai/tick

```bash
# GET без sessionId - ошибка
curl http://localhost:3000/api/ai/tick

# GET с sessionId - статистика
curl "http://localhost:3000/api/ai/tick?sessionId=TEST_SESSION"

# POST - выполнить tick
curl -X POST http://localhost:3000/api/ai/tick \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"TEST_SESSION","playerX":400,"playerY":300}'
```

**Ожидается:**
```json
{
  "success": true,
  "processedNPCs": 3,
  "stats": {
    "activeNPCs": 3,
    "totalNPCs": 5
  }
}
```

### Тест /api/temp-npc

```bash
# Список NPC
curl "http://localhost:3000/api/temp-npc?action=list&sessionId=TEST_SESSION"

# Статистика
curl "http://localhost:3000/api/temp-npc?action=stats&sessionId=TEST_SESSION"
```

---

## ⚠️ РИСКИ

| Риск | Митигация |
|------|-----------|
| Старые клиенты ожидают TempNPC | npcStateToClient() конвертер |
| Нарушение существующего API | Сохранить структуру ответов |
| sessionId не передаётся клиентом | Обновить клиентский код |

---

## ✅ КРИТЕРИИ ЗАВЕРШЕНИЯ

- [x] Все API routes используют TruthSystem
- [x] Нет ссылок на NPCWorldManager
- [x] GET /api/ai/tick возвращает статистику
- [x] POST /api/ai/tick активирует NPC
- [x] /api/temp-npc возвращает NPC из TruthSystem
- [x] Lint: 0 errors, 3 warnings

---

## 📝 ЗАПИСЬ В WORKLOG

```markdown
---
Task ID: phase-5
Agent: Main
Task: Обновление API Routes

Work Log:
- Обновлён /api/ai/tick для использования TruthSystem
- Обновлён /api/ai/player-position
- /api/temp-npc уже использует TruthSystem через sessionNPCManager
- Удалены ссылки на NPCWorldManager
- Удалена функция loadNPCsToWorldManager()

Stage Summary:
- Все API routes работают с TruthSystem
- sessionId теперь обязательный параметр
- Lint: 0 errors, 3 warnings
```

---

*Фаза 5 создана: 2026-03-27 08:02 UTC*
*Расширенное исследование: 2026-03-27 12:55 UTC*
*ЗАВЕРШЕНА: 2026-03-27 16:30 UTC*
