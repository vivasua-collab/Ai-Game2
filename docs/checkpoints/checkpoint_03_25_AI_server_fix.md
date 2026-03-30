# ЧЕКПОЙНТ: Детальный анализ архитектуры NPC и WebSocket

**Версия:** 5.0
**Дата:** 2026-03-25 10:12 UTC
**Статус:** ✅ ИСПРАВЛЕНИЯ ВЫПОЛНЕНЫ

---

## 🚫 ЗАПРЕТ: CADDY НЕ ИСПОЛЬЗУЕТСЯ

**WebSocket подключение - ПРЯМОЕ к localhost:3003**

---

## ✅ ВЫПОЛНЕННЫЕ ИСПРАВЛЕНИЯ

### Исправление #1: WebSocket сервер запущен ✅

```
[GameWS] Game WebSocket server started on port 3003
[GameWS] Tick loop started (1 tick = 1 second)
[GameWS] AI integration ready
```

**Файл:** `mini-services/game-ws/index.ts`
**Команда запуска:** `cd mini-services/game-ws && bun run dev`

### Исправление #2: Урон отправляется через WebSocket ✅

**Было:**
```typescript
// ProjectileManager.ts
npc.takeDamage(hitResult.damage, proj.element);  // Урон на клиенте!
```

**Стало:**
```typescript
// ProjectileManager.ts
if (gameSocket?.isSocketConnected()) {
  gameSocket.emit('player:attack', {
    targetId: npc.npcId,
    techniqueId: proj.techniqueId,
    damage: hitResult.damage,
  });
}
```

### Исправление #3: Сервер применяет урон к NPC ✅

**Файл:** `mini-services/game-ws/index.ts`

```typescript
socket.on('player:attack', (data) => {
  // Находим NPC
  const npc = npcs.find(n => n.id === data.targetId);
  
  // Применяем урон
  npc.health = Math.max(0, npc.health - damage);
  
  // Отправляем обновление всем клиентам
  io.to(`location:${locationId}`).emit('npc:update', {
    npcId: npc.id,
    changes: { health: npc.health, hp: npc.health }
  });
  
  // Проверка смерти
  if (npc.health <= 0) {
    io.to(`location:${locationId}`).emit('npc:despawn', { npcId: npc.id });
  }
});
```

### Исправление #4: Локальный AI отключён ✅

**Файл:** `src/game/scenes/LocationScene.ts`

```typescript
private updateAI(): void {
  // === ЛОКАЛЬНЫЙ AI ОТКЛЮЧЁН ===
  // Сервер управляет поведением через npc:action события
  
  // Обновляем визуал NPC (синхронизация спрайтов с физикой)
  for (const [id, sprite] of this.npcPhysicsSprites) {
    sprite.syncVisualPosition();
  }
}
```

### Исправление #5: NPCSprite применяет обновления от сервера ✅

**Файл:** `src/game/objects/NPCSprite.ts`

```typescript
public applyServerUpdate(changes: {
  health?: number;
  hp?: number;
  maxHp?: number;
  x?: number;
  y?: number;
  aiState?: string;
}): void {
  if (changes.health !== undefined || changes.hp !== undefined) {
    const newHp = changes.health ?? changes.hp ?? this.hp;
    this.hp = newHp;
    this.updateHpBar();
    
    if (this.hp <= 0 && !this.isDead) {
      this.die('server');
    }
  }
}
```

---

## 📊 ТЕКУЩИЙ ПОТОК ДАННЫХ (ИСПРАВЛЕННЫЙ)

```
1. СОЗДАНИЕ NPC
   ────────────────────────────────────────────────
   HTTP API /api/temp-npc (action=init)
   └── SessionNPCManager.initializeLocation()
       └── Генерирует TempNPC[]
   
   Клиент: GET /api/npc/spawn?action=list
   └── Создаёт NPCSprite локально
       └── gameSocket.emit('npc:sync', npcs)
   
   WS сервер:
   └── Сохраняет NPC в npcsByLocation
       └── Имеет состояние для AI

2. ДВИЖЕНИЕ ИГРОКА
   ────────────────────────────────────────────────
   Клиент: handleMovement()
   └── gameSocket.emit('player:move', { x, y })  ✅
   
   WS сервер:
   └── Обновляет players[socketId].x/y
       └── AI знает позицию игрока!

3. ДВИЖЕНИЕ NPC (AI)
   ────────────────────────────────────────────────
   WS сервер: processLocalAI()
   └── Проверяет дистанцию до игрока
       └── io.emit('npc:action', { type: 'move', target })
   
   Клиент: gameSocket.on('npc:action')
   └── NPCSprite.executeServerAction()
       └── ТОЛЬКО визуальное отображение

4. УРОН ИГРОКА → NPC
   ────────────────────────────────────────────────
   Клиент: ProjectileManager.onProjectileHit()
   └── gameSocket.emit('player:attack', { targetId, damage })  ✅
   
   WS сервер:
   └── npc.health -= damage  ✅
       └── io.emit('npc:update', { hp })  ✅
   
   Клиент: gameSocket.on('npc:update')
   └── NPCSprite.applyServerUpdate()  ✅
       └── Обновляет HP бар, проверяет смерть

5. СМЕРТЬ NPC
   ────────────────────────────────────────────────
   WS сервер:
   └── npc.health <= 0
       └── io.emit('npc:despawn', { npcId })
   
   Клиент:
   └── NPCSprite.destroy()
```

---

## 📋 ЧЕК-ЛИСТ ИСПРАВЛЕНИЙ

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1 | Запустить WebSocket сервер | 🔴 Критический | ✅ |
| 2 | Отправлять player:attack через WS | 🔴 Критический | ✅ |
| 3 | Сервер применяет урон к NPC | 🔴 Критический | ✅ |
| 4 | Отключить локальный AI | 🔴 Критический | ✅ |
| 5 | NPCSprite.applyServerUpdate() | 🟡 Высокий | ✅ |
| 6 | Проверить движение NPC | 🟡 Высокий | 🔄 |

---

## 🔧 ОСТАВШИЕСЯ ЗАДАЧИ

### 1. Проверить движение NPC
- Запустить игру
- Переместиться к NPC
- Проверить логи WS сервера на наличие npc:action
- Проверить визуальное движение NPC

### 2. Добавить обработку player:attack для урона игроку
- Сервер должен наносить урон игроку при атаке NPC
- Отправлять player:hit на клиент

---

## 📝 ФАЙЛЫ ИЗМЕНЁННЫЕ В ЭТОЙ СЕССИИ

1. `mini-services/game-ws/index.ts` - применение урона на сервере
2. `src/game/services/ProjectileManager.ts` - отправка player:attack
3. `src/game/scenes/LocationScene.ts` - отключение локального AI
4. `src/game/objects/NPCSprite.ts` - метод applyServerUpdate()

---

**АВТОР**: AI Assistant  
**ДАТА**: 2026-03-25
