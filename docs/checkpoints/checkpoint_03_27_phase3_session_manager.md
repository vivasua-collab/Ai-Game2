# ФАЗА 3: Модификация SessionNPCManager

**Дата:** 2026-03-27 07:58 UTC
**Дата обновления:** 2026-03-27 12:45 UTC
**Статус:** ✅ ЗАВЕРШЕНА
**Дата завершения:** 2026-03-27 14:45 UTC
**Зависит от:** Фаза 1, Фаза 2
**Координатор:** `checkpoint_03_27_npc_redesign.md`

---

## 🎯 ЦЕЛЬ ФАЗЫ

Упростить SessionNPCManager, делегировав хранение в TruthSystem.

---

## 🔍 РАСШИРЕННОЕ ИССЛЕДОВАНИЕ

### Аудит session-npc-manager.ts

**Файл:** `src/lib/game/session-npc-manager.ts`
**Строк:** 800
**Класс:** `SessionNPCManager`

#### 3.1 Текущее хранилище (строки 71-72)

```typescript
// Хранилище: sessionId -> locationId -> TempNPC[]
private npcs: Map<string, Map<string, TempNPC[]>> = new Map();
```

**Проблема:** Собственное хранилище дублирует данные, не синхронизировано с AI.

#### 3.2 Метод initializeLocation() (строки 83-135)

**Текущая логика:**
1. Проверка существующих NPC в `this.npcs`
2. Генерация TempNPC через `generateTempNPC()`
3. Сохранение в `this.npcs`
4. Возврат TempNPC[]

**Что нужно изменить:**
1. Проверка через `TruthSystem.getNPCsByLocation()`
2. Конвертация TempNPC → NPCState
3. Сохранение через `TruthSystem.addNPC()`
4. Возврат NPCState[]

#### 3.3 Зависимости от TempNPC

**Методы, возвращающие TempNPC:**
- `getLocationNPCs()` - возвращает TempNPC[]
- `getNPC()` - возвращает TempNPC | null
- `getAllSessionNPCs()` - возвращает TempNPC[]
- `updateNPC()` - принимает Partial<TempNPC>
- `removeNPC()` - работает с TempNPC

**Решение:**
- Изменить возврат на NPCState
- Добавить конвертер `npcStateToTempNPC()` для совместимости

---

## 📁 ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

| Файл | Изменение | Риск |
|------|-----------|------|
| `src/lib/game/session-npc-manager.ts` | Делегировать в TruthSystem | Высокий |

---

## 📐 ИЗМЕНЕНИЯ В КОДЕ

### 1. Удаление собственного хранилища

**Было (строки 71-75):**
```typescript
export class SessionNPCManager {
  // Хранилище: sessionId -> locationId -> TempNPC[]
  private npcs: Map<string, Map<string, TempNPC[]>> = new Map();
  
  // Счётчик для генерации seed
  private counter: number = 0;
}
```

**Стало:**
```typescript
import { TruthSystem } from './truth-system';
import { createNPCStateFromTempNPC } from './types/npc-state';
import type { NPCState } from './types/npc-state';

export class SessionNPCManager {
  // Хранилище УДАЛЕНО - используем TruthSystem
  
  // Счётчик для генерации seed (остаётся)
  private counter: number = 0;
}
```

### 2. Изменение initializeLocation()

**Было (строки 83-135):**
```typescript
async initializeLocation(
  sessionId: string,
  locationId: string,
  config: LocationNPCConfig | string,
  playerLevel: number,
  worldSize?: { width: number; height: number }
): Promise<TempNPC[]> {
  const existing = this.getLocationNPCs(sessionId, locationId);
  if (existing.length > 0) {
    return existing;
  }
  
  // ... генерация TempNPC ...
  
  this.setLocationNPCs(sessionId, locationId, npcs);
  return npcs;
}
```

**Стало:**
```typescript
async initializeLocation(
  sessionId: string,
  locationId: string,
  config: LocationNPCConfig | string,
  playerLevel: number,
  worldSize?: { width: number; height: number }
): Promise<NPCState[]> {
  const truthSystem = TruthSystem.getInstance();
  
  // 1. Проверяем, уже инициализирована?
  const existing = truthSystem.getNPCsByLocation(sessionId, locationId);
  if (existing.length > 0) {
    console.log(`[SessionNPCManager] Location ${locationId} already has ${existing.length} NPCs`);
    return existing;
  }
  
  // 2. Получаем конфигурацию
  const npcConfig = typeof config === 'string' 
    ? LOCATION_NPC_PRESETS[config] || LOCATION_NPC_PRESETS.village
    : config;
  
  // 3. Рассчитываем количество
  const count = this.calculatePopulation(npcConfig);
  console.log(`[SessionNPCManager] Generating ${count} NPCs for location ${locationId}`);
  
  // 4. Генерируем TempNPC
  const tempNPCs: TempNPC[] = [];
  const baseSeed = Date.now();
  const worldWidth = worldSize?.width || 1600;
  const worldHeight = worldSize?.height || 1200;
  
  for (let i = 0; i < count; i++) {
    const seed = baseSeed + i;
    const tempNPC = await this.generateTempNPC(npcConfig, playerLevel, seed);
    tempNPC.locationId = locationId;
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 200 + Math.random() * 300;
    tempNPC.position = {
      x: Math.round(worldWidth / 2 + Math.cos(angle) * distance),
      y: Math.round(worldHeight / 2 + Math.sin(angle) * distance),
    };
    
    tempNPCs.push(tempNPC);
  }
  
  // 5. Конвертируем и сохраняем в TruthSystem
  const npcStates: NPCState[] = [];
  
  for (const tempNPC of tempNPCs) {
    const npcState = this.convertTempNPCToState(tempNPC);
    truthSystem.addNPC(sessionId, npcState);
    npcStates.push(npcState);
  }
  
  console.log(`[SessionNPCManager] Generated and saved ${npcStates.length} NPCs to TruthSystem`);
  return npcStates;
}
```

### 3. Добавить конвертер TempNPC → NPCState

```typescript
/**
 * Конвертировать TempNPC в NPCState
 */
private convertTempNPCToState(tempNPC: TempNPC): NPCState {
  return createNPCStateFromTempNPC({
    id: tempNPC.id,
    name: tempNPC.name,
    speciesId: tempNPC.speciesId,
    speciesType: tempNPC.speciesType,
    roleId: tempNPC.roleId,
    soulType: tempNPC.soulType,
    controller: tempNPC.controller,
    mind: tempNPC.mind,
    cultivation: tempNPC.cultivation,
    position: tempNPC.position,
    locationId: tempNPC.locationId,
    bodyState: tempNPC.bodyState,
    cultivation_qi: { currentQi: tempNPC.currentQi },
    personality: tempNPC.personality,
    collision: tempNPC.collision,
    interactionZones: tempNPC.interactionZones,
    aiConfig: tempNPC.aiConfig,
  });
}
```

### 4. Изменение getter-методов

```typescript
/**
 * Получить всех NPC в локации
 */
getLocationNPCs(sessionId: string, locationId: string): NPCState[] {
  return TruthSystem.getInstance().getNPCsByLocation(sessionId, locationId);
}

/**
 * Получить конкретного NPC
 */
getNPC(sessionId: string, npcId: string): NPCState | null {
  return TruthSystem.getInstance().getNPC(sessionId, npcId);
}

/**
 * Получить всех NPC в сессии
 */
getAllSessionNPCs(sessionId: string): NPCState[] {
  return TruthSystem.getInstance().getAllNPCs(sessionId);
}
```

### 5. Изменение updateNPC()

```typescript
/**
 * Обновить NPC
 */
updateNPC(sessionId: string, npcId: string, updates: Partial<NPCState>): NPCState | null {
  const result = TruthSystem.getInstance().updateNPC(sessionId, npcId, updates);
  return result.success ? result.data! : null;
}
```

### 6. Изменение removeNPC()

```typescript
/**
 * Удалить мёртвого NPC и вернуть лут
 */
removeNPC(sessionId: string, npcId: string): { loot: TempItem[]; xp: number } | null {
  const truthSystem = TruthSystem.getInstance();
  const npc = truthSystem.getNPC(sessionId, npcId);
  
  if (!npc) return null;
  
  // Конвертируем в TempNPC для генератора лута
  const tempNPC = this.npcStateToTempNPC(npc);
  const loot = this.generateLoot(tempNPC);
  const xp = this.calculateXP(tempNPC);
  
  // Удаляем из TruthSystem
  const result = truthSystem.removeNPC(sessionId, npcId);
  
  if (result.success) {
    console.log(`[SessionNPCManager] Removed NPC ${npcId}, loot: ${loot.length} items, XP: ${xp}`);
    return { loot, xp };
  }
  
  return null;
}
```

### 7. Добавить обратный конвертер NPCState → TempNPC

```typescript
/**
 * Конвертировать NPCState обратно в TempNPC (для совместимости)
 */
private npcStateToTempNPC(npc: NPCState): TempNPC {
  return {
    id: npc.id,
    isTemporary: true,
    speciesId: npc.speciesId,
    speciesType: npc.speciesType,
    roleId: npc.roleId,
    soulType: npc.soulType,
    controller: npc.controller,
    mind: npc.mind,
    name: npc.name,
    gender: 'unknown',
    age: 25,
    stats: { strength: 10, agility: 10, intelligence: 10 },
    cultivation: {
      level: npc.level,
      subLevel: npc.subLevel,
      coreCapacity: npc.maxQi,
      currentQi: npc.qi,
      coreQuality: 50,
      baseVolume: 100,
      qiDensity: 1,
      meridianConductivity: 1,
    },
    bodyState: {
      health: npc.health,
      maxHealth: npc.maxHealth,
      parts: {},
      isDead: npc.isDead,
      isUnconscious: npc.isUnconscious,
      activeEffects: [],
      material: 'organic',
      morphology: 'humanoid',
    },
    equipment: { weapon: null, armor: null, accessories: [] },
    quickSlots: [],
    techniques: [],
    personality: {
      disposition: npc.disposition,
      aggressionLevel: npc.aggressionLevel,
      fleeThreshold: npc.fleeThreshold,
      canTalk: npc.canTalk,
      canTrade: npc.canTrade,
      traits: [],
      motivation: '',
      dominantEmotion: 'neutral',
    },
    resources: { spiritStones: 0, contributionPoints: 0 },
    locationId: npc.locationId,
    position: { x: npc.x, y: npc.y },
    currentQi: npc.qi,
    generatedAt: Date.now(),
    seed: 0,
    collision: { radius: npc.collisionRadius },
    interactionZones: {
      agro: npc.agroRadius,
      perception: npc.perceptionRadius,
      talk: npc.canTalk ? 100 : 0,
      trade: npc.canTrade ? 100 : 0,
    },
    aiConfig: {
      agroRadius: npc.agroRadius,
      patrolRadius: npc.patrolRadius ?? 100,
      fleeThreshold: npc.fleeThreshold,
      attackRange: npc.attackRange ?? 50,
      chaseSpeed: npc.chaseSpeed ?? 150,
      patrolSpeed: npc.patrolSpeed ?? 50,
    },
  };
}
```

### 8. Удалить setLocationNPCs() и обновить clearLocation()

```typescript
// УДАЛИТЬ:
// private setLocationNPCs(sessionId, locationId, npcs): void

/**
 * Очистка локации при выходе
 */
clearLocation(sessionId: string, locationId: string): number {
  const truthSystem = TruthSystem.getInstance();
  const npcs = truthSystem.getNPCsByLocation(sessionId, locationId);
  
  for (const npc of npcs) {
    truthSystem.removeNPC(sessionId, npc.id);
  }
  
  console.log(`[SessionNPCManager] Cleared location ${locationId}, removed ${npcs.length} NPCs`);
  return npcs.length;
}
```

---

## ⚠️ ВОЗМОЖНЫЕ ОШИБКИ

### Ошибка 1: Property 'getNPCsByLocation' does not exist on TruthSystem

**Причина:** Фаза 2 не выполнена
**Решение:** Выполнить Фазу 2 сначала

### Ошибка 2: Type 'TempNPC' is not compatible with 'NPCState'

**Причина:** Неправильная конвертация
**Решение:** Использовать `createNPCStateFromTempNPC()`

### Ошибка 3: Cannot read property 'addNPC' of undefined

**Причина:** TruthSystem.getInstance() возвращает undefined
**Решение:** Проверить singleton в TruthSystem

### Ошибка 4: API returns empty array

**Причина:** NPC генерируются, но не сохраняются в TruthSystem
**Решение:** Убедиться что `truthSystem.addNPC()` вызывается после генерации

---

## ✅ ЧЕК-ЛИСТ ВЫПОЛНЕНИЯ

### Удаление

- [x] Удалить `private npcs: Map<...>` (закомментирован)
- [x] Удалить `private setLocationNPCs()` (заменён на конвертер)

### Изменение

- [x] Добавить импорт `TruthSystem`
- [x] Изменить `initializeLocation()` - сохранять в TruthSystem
- [x] Изменить `getLocationNPCs()` - читать из TruthSystem
- [x] Изменить `getNPC()` - читать из TruthSystem
- [x] Изменить `updateNPC()` - обновлять через TruthSystem
- [x] Изменить `removeNPC()` - удалять через TruthSystem
- [x] Изменить `clearLocation()` - через TruthSystem
- [x] Изменить `clearSession()` - через TruthSystem
- [x] Изменить `getStats()` - через TruthSystem

### Добавление

- [x] Добавить `convertTempNPCToState()` конвертер
- [x] Добавить `npcStateToTempNPC()` конвертер

---

## 🧪 ТЕСТИРОВАНИЕ ПОСЛЕ ФАЗЫ

### Тест генерации NPC

```bash
# Инициализация локации
curl -X POST http://localhost:3000/api/temp-npc \
  -H "Content-Type: application/json" \
  -d '{
    "action": "init",
    "sessionId": "TEST_SESSION",
    "locationId": "test_location",
    "config": "village",
    "playerLevel": 1
  }'
```

**Ожидается:**
```json
{
  "success": true,
  "npcs": [...],
  "total": 3-5
}
```

### Тест чтения из TruthSystem

```bash
# Получить NPC
curl "http://localhost:3000/api/temp-npc?action=list&sessionId=TEST_SESSION&locationId=test_location"
```

**Ожидается:** Те же NPC, что и при инициализации

---

## ⚠️ РИСКИ

| Риск | Митигация |
|------|-----------|
| Обратная совместимость с TempNPC | Конвертер `npcStateToTempNPC()` |
| API routes используют TempNPC | Обновить в Фазе 5 |
| Потеря данных при миграции | NPC временные, потеря допустима |

---

## ✅ КРИТЕРИИ ЗАВЕРШЕНИЯ

- [x] SessionNPCManager не имеет собственного хранилища (закомментировано)
- [x] NPC сохраняются в TruthSystem
- [x] NPC читаются из TruthSystem
- [x] Код компилируется (lint: 0 errors, 3 warnings)
- [x] Существующий API работает (TempNPC совместимость)

---

## 📝 ЗАПИСЬ В WORKLOG

```markdown
---
Task ID: phase-3
Agent: Main
Task: Модификация SessionNPCManager

Work Log:
- Удалено собственное хранилище NPC
- Изменён initializeLocation() для сохранения в TruthSystem
- Добавлены конвертеры TempNPC ↔ NPCState
- Все getter-методы делегируют в TruthSystem

Stage Summary:
- SessionNPCManager теперь только генерирует NPC
- Хранение полностью в TruthSystem
- Обратная совместимость сохранена
```

---

*Фаза 3 создана: 2026-03-27 07:58 UTC*
*Расширенное исследование: 2026-03-27 12:45 UTC*
*ЗАВЕРШЕНА: 2026-03-27 14:45 UTC*
