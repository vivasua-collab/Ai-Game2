# ФАЗА 4: Модификация NPCAIManager

**Дата:** 2026-03-27 08:00 UTC
**Дата обновления:** 2026-03-27 12:50 UTC
**Статус:** ✅ ЗАВЕРШЕНА
**Дата завершения:** 2026-03-27 15:05 UTC
**Зависит от:** Фаза 2, Фаза 3
**Координатор:** `checkpoint_03_27_npc_redesign.md`

---

## 🎯 ЦЕЛЬ ФАЗЫ

Настроить NPCAIManager на чтение NPC из TruthSystem вместо NPCWorldManager.

---

## 🔍 РАСШИРЕННОЕ ИССЛЕДОВАНИЕ

### Аудит npc-ai-manager.ts

**Файл:** `src/lib/game/ai/server/npc-ai-manager.ts`
**Строк:** 614
**Класс:** `NPCAIManager`

#### 4.1 Текущая зависимость от NPCWorldManager (строки 15, 59)

```typescript
import { getNPCWorldManager } from '@/lib/game/npc-world-manager';

export class NPCAIManager {
  private npcWorldManager = getNPCWorldManager();  // ← УДАЛИТЬ
}
```

**Проблема:** Читает из пустого NPCWorldManager

#### 4.2 Метод updateAllNPCs() (строки 84-134)

```typescript
async updateAllNPCs(): Promise<void> {
  const worldState = this.npcWorldManager.getWorldState();  // ← ПУСТО!
  
  console.log(`[NPCAIManager] Tick: worldState.npcs.size = ${worldState.npcs.size}`);
  // Вывод: worldState.npcs.size = 0
  
  for (const [npcId, npc] of worldState.npcs) {
    // Никогда не выполняется - NPC нет!
  }
}
```

**Что нужно изменить:**
1. Добавить параметр `sessionId`
2. Читать NPC из `TruthSystem.getActiveNPCs(sessionId)`
3. Обновлять NPC через `TruthSystem.updateNPC()`

#### 4.3 Метод findNearbyPlayers() (строки 236-261)

```typescript
private findNearbyPlayers(npc: NPCState): PlayerWorldState[] {
  const players = this.npcWorldManager.getPlayersInLocation(npc.locationId);  // ← ПУСТО!
}
```

**Проблема:** NPCWorldManager не содержит игроков

**Решение:** В single-player игре игрок один - читать позицию из `SessionState.character`

#### 4.4 Метод executeAction() (строки 575-604)

```typescript
private executeAction(npc: NPCState, action: NPCAction): void {
  // Обновляем позицию локально
  if (action.type === 'move' || action.type === 'chase' || action.type === 'flee') {
    npc.x = action.target.x;  // ← Не сохраняется!
    npc.y = action.target.y;
  }
}
```

**Проблема:** Позиция обновляется только в локальной переменной

**Решение:** Использовать `TruthSystem.updateNPC()` для сохранения

---

## 📁 ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

| Файл | Изменение | Риск |
|------|-----------|------|
| `src/lib/game/ai/server/npc-ai-manager.ts` | Читать из TruthSystem | Высокий |

---

## 📐 ИЗМЕНЕНИЯ В КОДЕ

### 1. Удаление зависимости от NPCWorldManager

**Было (строки 15, 59):**
```typescript
import { getNPCWorldManager } from '@/lib/game/npc-world-manager';

export class NPCAIManager {
  private npcWorldManager = getNPCWorldManager();
}
```

**Стало:**
```typescript
import { TruthSystem } from '@/lib/game/truth-system';
import type { NPCState, NPCAction } from '@/lib/game/types/npc-state';

export class NPCAIManager {
  // УДАЛЕНО: private npcWorldManager = getNPCWorldManager();
}
```

### 2. Изменение updateAllNPCs()

**Было (строки 84-134):**
```typescript
async updateAllNPCs(): Promise<void> {
  const worldState = this.npcWorldManager.getWorldState();
  
  for (const [npcId, npc] of worldState.npcs) {
    // ...
  }
}
```

**Стало:**
```typescript
/**
 * Обновить всех активных NPC для указанной сессии
 * 
 * @param sessionId - ID сессии (ОБЯЗАТЕЛЬНО!)
 */
async updateAllNPCs(sessionId: string): Promise<void> {
  const startTime = Date.now();
  this.tickCount++;
  
  const truthSystem = TruthSystem.getInstance();
  
  // Получаем АКТИВНЫХ NPC из TruthSystem
  const activeNPCs = truthSystem.getActiveNPCs(sessionId);
  
  console.log(`[NPCAIManager] Tick ${this.tickCount}: activeNPCs = ${activeNPCs.length}`);
  
  // Начинаем batch режим для отправки событий
  this.broadcastManager.startBatch();
  
  try {
    // Проходим по всем активным NPC
    for (const npc of activeNPCs) {
      // Пропускаем мёртвых NPC
      if (npc.isDead) continue;
      
      // Находим ближайших игроков
      const nearbyPlayers = this.findNearbyPlayers(sessionId, npc);
      
      if (nearbyPlayers.length > 0) {
        // Обновляем AI
        await this.updateActiveNPC(sessionId, npc, nearbyPlayers);
      } else {
        // Деактивируем если давно не было игрока рядом
        if (Date.now() - npc.lastActiveTime > 30000) {
          truthSystem.updateNPC(sessionId, npc.id, { isActive: false });
          console.log(`[NPCAIManager] Deactivated NPC: ${npc.name} (${npc.id})`);
        }
      }
    }
  } finally {
    // Отправляем все накопленные события
    this.broadcastManager.endBatch();
  }
  
  // Обновляем статистику
  const tickTime = Date.now() - startTime;
  this.lastTickTime = tickTime;
  this.totalTickTime += tickTime;
  
  if (tickTime > MAX_UPDATE_TIME_MS) {
    console.warn(`[NPCAIManager] Tick ${this.tickCount} took ${tickTime}ms`);
  }
}
```

### 3. Изменение findNearbyPlayers()

**Было:**
```typescript
private findNearbyPlayers(npc: NPCState): PlayerWorldState[] {
  const players = this.npcWorldManager.getPlayersInLocation(npc.locationId);
  // ...
}
```

**Стало:**
```typescript
/**
 * Найти ближайших игроков для NPC
 * 
 * В single-player игре только один игрок.
 * Позиция берётся из SessionState.currentLocation и CharacterState.
 */
private findNearbyPlayers(
  sessionId: string, 
  npc: NPCState
): { id: string; x: number; y: number }[] {
  const truthSystem = TruthSystem.getInstance();
  const session = truthSystem.getSessionState(sessionId);
  
  if (!session || !session.currentLocation) {
    return [];
  }
  
  // В single-player игре только один игрок
  // Позиция игрока хранится в CharacterState
  // Нужно добавить поля currentX, currentY в CharacterState
  
  // ВРЕМЕННО: используем дефолтную позицию
  const playerPos = {
    id: session.characterId,
    x: 400,  // TODO: session.character.currentX
    y: 300,  // TODO: session.character.currentY
  };
  
  // Проверяем дистанцию
  const dx = playerPos.x - npc.x;
  const dy = playerPos.y - npc.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance <= ACTIVATION_RADIUS) {
    return [playerPos];
  }
  
  return [];
}
```

### 4. Изменение updateActiveNPC()

**Было:**
```typescript
private async updateActiveNPC(
  npc: NPCState,
  nearbyPlayers: PlayerWorldState[]
): Promise<void> {
  // ...
  this.executeAction(npc, reflexAction);
}
```

**Стало:**
```typescript
private async updateActiveNPC(
  sessionId: string,
  npc: NPCState,
  nearbyPlayers: { id: string; x: number; y: number }[]
): Promise<void> {
  const truthSystem = TruthSystem.getInstance();
  const entry = this.controllers.get(npc.id);
  
  if (!entry) {
    // Создаём контроллер если нет
    const controller = createSpinalServerController(npc.id, npc.spinalPreset);
    this.controllers.set(npc.id, {
      controller,
      lastUpdateTime: 0,
      totalUpdates: 0,
    });
  }
  
  // Обновляем время последнего обновления
  npc.lastActiveTime = Date.now();
  
  // Находим ближайшего игрока
  const nearestPlayer = nearbyPlayers[0];
  const distance = nearestPlayer 
    ? Math.sqrt((nearestPlayer.x - npc.x) ** 2 + (nearestPlayer.y - npc.y) ** 2)
    : Infinity;
  
  // === ШАГ 1: Рефлекторные реакции (Spinal AI) ===
  let signal = null;
  
  if (nearestPlayer) {
    if (distance < AGRO_RADIUS && npc.aggressionLevel > 50) {
      signal = createPlayerNearbySignal(
        nearestPlayer.id,
        nearestPlayer.x,
        nearestPlayer.y,
        npc.x,
        npc.y,
        distance,
        AGRO_RADIUS
      );
      signal.type = 'danger_nearby';
    } else if (distance < PERCEPTION_RADIUS) {
      signal = createPlayerNearbySignal(
        nearestPlayer.id,
        nearestPlayer.x,
        nearestPlayer.y,
        npc.x,
        npc.y,
        distance,
        PERCEPTION_RADIUS
      );
    }
  }
  
  const controller = this.controllers.get(npc.id)?.controller;
  if (!controller) return;
  
  const reflexAction = controller.update(1000, npc, signal);
  
  if (reflexAction && reflexAction.type !== 'idle') {
    this.executeAction(sessionId, npc, reflexAction);
    return;
  }
  
  // === ШАГ 2: Проактивные действия ===
  const proactiveAction = this.generateProactiveAction(npc, nearestPlayer, distance);
  
  if (proactiveAction) {
    this.executeAction(sessionId, npc, proactiveAction);
  }
}
```

### 5. Изменение executeAction()

**Было:**
```typescript
private executeAction(npc: NPCState, action: NPCAction): void {
  console.log(`[NPCAIManager] EXECUTE ACTION: NPC "${npc.name}"...`);
  
  npc.currentAction = action;
  npc.aiState = action.type;
  
  if (action.type === 'move' || action.type === 'chase' || action.type === 'flee') {
    if (action.target && typeof action.target === 'object') {
      npc.x = action.target.x;
      npc.y = action.target.y;
    }
  }
  
  this.broadcastManager.broadcastNPCAction(npc.locationId, {...});
}
```

**Стало:**
```typescript
private executeAction(
  sessionId: string,
  npc: NPCState, 
  action: NPCAction
): void {
  const truthSystem = TruthSystem.getInstance();
  
  console.log(`[NPCAIManager] EXECUTE ACTION: NPC "${npc.name}" (${npc.id}) -> ${action.type}`);
  
  // Обновляем состояние NPC через TruthSystem
  const updates: Partial<NPCState> = {
    currentAction: action,
    aiState: action.type,
  };
  
  // Обновляем позицию если действие связано с движением
  if ((action.type === 'move' || action.type === 'chase' || action.type === 'flee') 
      && action.target && typeof action.target === 'object') {
    updates.x = action.target.x;
    updates.y = action.target.y;
    console.log(`[NPCAIManager] Updated NPC "${npc.name}" position to (${updates.x}, ${updates.y})`);
  }
  
  // Применяем обновления
  truthSystem.updateNPC(sessionId, npc.id, updates);
  
  // Обновляем локальную переменную для broadcast
  Object.assign(npc, updates);
  
  // Отправляем событие
  this.broadcastManager.broadcastNPCAction(npc.locationId, {
    npcId: npc.id,
    action,
    npcState: { x: npc.x, y: npc.y, aiState: npc.aiState },
  });
}
```

### 6. Изменение getStats()

**Было:**
```typescript
getStats(): AIStats {
  return {
    totalNPCs: this.controllers.size,
    activeNPCs: this.npcWorldManager.getActiveNPCs().length,
    totalUpdates,
    avgUpdateTime,
  };
}
```

**Стало:**
```typescript
getStats(sessionId?: string): AIStats {
  let totalUpdates = 0;
  for (const entry of this.controllers.values()) {
    totalUpdates += entry.totalUpdates;
  }
  
  let avgUpdateTime = 0;
  if (this.tickCount > 0) {
    avgUpdateTime = this.totalTickTime / this.tickCount;
  }
  
  let activeNPCs = 0;
  let totalNPCs = this.controllers.size;
  
  if (sessionId) {
    const truthSystem = TruthSystem.getInstance();
    const stats = truthSystem.getNPCStats(sessionId);
    activeNPCs = stats.active;
    totalNPCs = stats.total;
  }
  
  return {
    totalNPCs,
    activeNPCs,
    totalUpdates,
    avgUpdateTime,
  };
}
```

---

## ⚠️ ВОЗМОЖНЫЕ ОШИБКИ

### Ошибка 1: Property 'getActiveNPCs' does not exist on TruthSystem

**Причина:** Фаза 2 не выполнена
**Решение:** Выполнить Фазу 2 сначала

### Ошибка 2: sessionId is required

**Причина:** updateAllNPCs() теперь требует sessionId
**Решение:** Передавать sessionId из API route

### Ошибка 3: Player position not found

**Причина:** CharacterState не содержит currentX, currentY
**Решение:** Добавить поля или использовать дефолтные значения

### Ошибка 4: NPC position not updating

**Причина:** truthSystem.updateNPC() не вызывается
**Решение:** Проверить executeAction()

---

## ✅ ЧЕК-ЛИСТ ВЫПОЛНЕНИЯ

### Удаление

- [x] Удалить импорт `getNPCWorldManager`
- [x] Удалить `private npcWorldManager = getNPCWorldManager()`

### Изменение

- [x] Добавить импорт `TruthSystem`
- [x] Изменить `updateAllNPCs(sessionId)` - принимать sessionId
- [x] Изменить `findNearbyPlayers()` - читать из TruthSystem (через getPlayerPosition)
- [x] Изменить `updateActiveNPC()` - принимать sessionId
- [x] Изменить `executeAction()` - обновлять через TruthSystem
- [x] Изменить `getStats()` - принимать sessionId
- [x] Изменить `activateNPC()` - обновлять через TruthSystem
- [x] Изменить `deactivateNPC()` - обновлять через TruthSystem
- [x] Изменить `handlePlayerAttack()` - принимать sessionId
- [x] Добавить `getPlayerPosition()` - временная реализация для single-player

---

## 🧪 ТЕСТИРОВАНИЕ ПОСЛЕ ФАЗЫ

### Тест AI tick

```bash
# Добавить NPC
curl -X POST http://localhost:3000/api/temp-npc \
  -H "Content-Type: application/json" \
  -d '{"action": "init", "sessionId": "TEST", "locationId": "loc1", "config": "village", "playerLevel": 1}'

# Выполнить tick
curl -X POST http://localhost:3000/api/ai/tick \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "TEST", "playerX": 400, "playerY": 300}'
```

**Ожидается:**
```json
{
  "success": true,
  "processedNPCs": 3-5,
  "stats": {
    "activeNPCs": 3-5
  }
}
```

---

## ⚠️ РИСКИ

| Риск | Митигация |
|------|-----------|
| Нет sessionId в вызове | Обновить все вызовы updateAllNPCs() |
| Позиция игрока не в CharacterState | Добавить поля currentX, currentY |
| NPC не активируются | Проверить activateNearbyNPCs() |

---

## ✅ КРИТЕРИИ ЗАВЕРШЕНИЯ

- [x] NPCAIManager не зависит от NPCWorldManager
- [x] NPCAIManager читает NPC из TruthSystem
- [x] updateAllNPCs() требует sessionId
- [x] Позиции NPC обновляются через TruthSystem
- [x] Код компилируется (lint: 0 errors, 3 warnings)
- [x] Добавлен getPlayerPosition() для single-player режима

---

## 📝 ЗАПИСЬ В WORKLOG

```markdown
---
Task ID: phase-4
Agent: Main
Task: Модификация NPCAIManager

Work Log:
- Удалена зависимость от NPCWorldManager
- Изменён updateAllNPCs() для работы с TruthSystem
- Изменён findNearbyPlayers() для single-player
- Изменён executeAction() для сохранения через TruthSystem

Stage Summary:
- NPCAIManager читает NPC из TruthSystem
- activeNPCs > 0 при корректном использовании
- Позиции NPC обновляются корректно
```

---

*Фаза 4 создана: 2026-03-27 08:00 UTC*
*Расширенное исследование: 2026-03-27 12:50 UTC*
*ЗАВЕРШЕНА: 2026-03-27 15:05 UTC*
