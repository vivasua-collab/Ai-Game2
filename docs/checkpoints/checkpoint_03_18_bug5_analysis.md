# 🔬 БАГ 5: Детальный анализ двух источников позиции NPC

**Дата:** 2026-03-18
**Статус:** ✅ ЗАВЕРШЁНО — все 5 задач исправлены
**Приоритет:** HIGH
**Проверено:** 2026-03-19

---

## 📋 Постановка проблемы

В коде существует **два источника истины** для позиции NPC:

1. **LocationNPC.x/y** — объект данных в `Map<string, LocationNPC>`
2. **NPCSprite.x/y** — позиция физического спрайта в `Map<string, NPCSprite>`

Это приводит к рассинхронизации между:
- Коллизиями (используют `sprite.x/y` от физики)
- Игровой логикой (использует `npc.x/y` из данных)

---

## 🔍 КАРТА ИСПОЛЬЗОВАНИЯ ПОЗИЦИИ

### 1. Где ЧИТАЕТСЯ позиция NPC

| Метод | Файл | Что читает | Для чего |
|-------|------|------------|----------|
| `moveNPCTowards()` | LocationScene.ts:1044-1045 | `npc.x/y` | Расчёт направления |
| `handleNPCAttack()` | LocationScene.ts:907-909 | `npc.x/y` | Проверка дистанции атаки |
| `updateNPCBehavior()` | LocationScene.ts:1000-1002 | `npc.x/y` | Определение состояния AI |
| `handleNPCMove()` | LocationScene.ts:890-891 | `data.targetX/Y` | Анимация движения |

### 2. Где ПИШЕТСЯ позиция NPC

| Метод | Файл | Что пишет | Проблема |
|-------|------|-----------|----------|
| `spawnNPC()` | LocationScene.ts:712 | `npc.x/y = x/y` | OK при создании |
| `moveNPCTowards()` | LocationScene.ts:1054-1055 | `npc.x/y += ...` | Обходит физику! |
| `handleNPCMove()` | LocationScene.ts:886-887 | `npc.x/y = data.targetX/Y` | Обходит физику! |

### 3. Где используется ФИЗИЧЕСКАЯ позиция

| Метод | Файл | Что использует | Для чего |
|-------|------|----------------|----------|
| **Коллизии** | Arcade Physics | `sprite.body.position` | Определение столкновений |
| `ProjectileManager.onProjectileHit()` | ProjectileManager.ts:123 | `npc.x/y` | Эффект попадания |
| `NPCGroup.getNearestNPC()` | NPCGroup.ts:364-366 | `npc.x/y` | Поиск ближайшего |
| `NPCSprite.syncVisualPosition()` | NPCSprite.ts:328-336 | `this.x/y` | Синхронизация визуала |

---

## ⚠️ КОНФЛИКТЫ

### Конфликт 1: moveNPCTowards() обходит физику

```typescript
// LocationScene.ts:1039-1072
private moveNPCTowards(npc: LocationNPC, targetX: number, targetY: number, speed: number): void {
  const sprite = this.npcPhysicsSprites.get(npc.id);
  if (!sprite) return;
  
  // ❌ Читает из npc (данные), а не sprite (физика)
  const dx = targetX - npc.x;
  const dy = targetY - npc.y;
  
  // ...
  
  // ❌ Обновляет npc напрямую
  npc.x += nx * speed * 0.016;
  npc.y += ny * speed * 0.016;
  
  // ❌ Вызывает setPosition вместо setVelocity
  // Это ОБХОДИТ физический движок!
  sprite.setPosition(npc.x, npc.y);
}
```

**Проблема:**
- `setPosition()` не использует физику
- Коллизии рассчитываются на основе `body.position`, а не `sprite.x/y`
- Если есть коллизия с игроком/стеной, `body.position` будет другим

**Правильный подход:**
```typescript
// Использовать setVelocity для движения
sprite.setVelocity(nx * speed, ny * speed);
// Или использовать moveTo() из NPCSprite
sprite.moveTo(targetX, targetY, speed);
```

### Конфликт 2: handleNPCMove() использует tweens

```typescript
// LocationScene.ts:878-897
private handleNPCMove(data: NPCMoveEvent): void {
  const sprite = this.npcPhysicsSprites.get(data.npcId);
  const npc = this.npcs.get(data.npcId);
  
  // ❌ Обновляет npc напрямую
  npc.x = data.targetX;
  npc.y = data.targetY;
  
  // ❌ Tween анимация обходит физику!
  this.tweens.add({
    targets: sprite,
    x: data.targetX,
    y: data.targetY,
    duration: 1000 / (data.speed / 100),
  });
}
```

**Проблема:**
- Tweens меняют `sprite.x/y` напрямую
- Это игнорирует коллизии физического движка
- NPC может "пройти сквозь" игрока или другие NPC

**Правильный подход:**
```typescript
// Использовать физическое движение
sprite.moveTo(data.targetX, data.targetY, data.speed);
```

### Конфликт 3: handleNPCAttack() читает из npc, а не sprite

```typescript
// LocationScene.ts:902-963
private handleNPCAttack(data: NPCAttackPlayerEvent): void {
  const npc = this.npcs.get(data.npcId);
  if (!npc || this.isPlayerDead) return;
  
  // ❌ Читает из npc (данные)
  const dx = this.playerX - npc.x;
  const dy = this.playerY - npc.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
```

**Проблема:**
- `npc.x/y` может отличаться от реальной позиции спрайта
- Атака может сработать на расстоянии, хотя физически NPC далеко

**Правильный подход:**
```typescript
// Использовать позицию спрайта
const sprite = this.npcPhysicsSprites.get(data.npcId);
if (!sprite) return;

const dx = this.playerX - sprite.x;
const dy = this.playerY - sprite.y;
```

---

## 🎯 РЕШЕНИЕ

### Принцип: **NPCSprite — единственный источник истины для позиции**

```
┌─────────────────────────────────────────────────────────┐
│                     Иерархия данных                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   NPCSprite (физика)     ←  ЕДИНСТВЕННЫЙ ИСТОЧНИК       │
│   ├── sprite.x/y          ←  от body.position            │
│   ├── sprite.body         ←  Arcade Physics              │
│   └── syncVisualPosition() ←  визуал следует за телом   │
│            │                                             │
│            ▼                                             │
│   LocationNPC (данные)    ←  СЛЕДУЕТ за физикой          │
│   └── npc.x/y = sprite.x/y ←  только чтение!             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Изменения в коде

#### 1. moveNPCTowards() — использовать sprite.moveTo()

```typescript
private moveNPCTowards(npc: LocationNPC, targetX: number, targetY: number, speed: number): void {
  const sprite = this.npcPhysicsSprites.get(npc.id);
  if (!sprite) return;
  
  // Используем физическое движение
  sprite.moveTo(targetX, targetY, speed);
  
  // Синхронизируем данные ПОСЛЕ физики
  npc.x = sprite.x;
  npc.y = sprite.y;
}
```

#### 2. handleNPCMove() — использовать sprite.moveTo()

```typescript
private handleNPCMove(data: NPCMoveEvent): void {
  const sprite = this.npcPhysicsSprites.get(data.npcId);
  const npc = this.npcs.get(data.npcId);
  
  if (!sprite || !npc) return;
  
  // Используем физическое движение вместо tween
  sprite.moveTo(data.targetX, data.targetY, data.speed);
  
  // НЕ обновляем npc.x/y напрямую - они синхронизируются в update
}
```

#### 3. handleNPCAttack() — читать из sprite

```typescript
private handleNPCAttack(data: NPCAttackPlayerEvent): void {
  const sprite = this.npcPhysicsSprites.get(data.npcId);
  if (!sprite || this.isPlayerDead) return;
  
  // Используем позицию спрайта
  const dx = this.playerX - sprite.x;
  const dy = this.playerY - sprite.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // ...
}
```

#### 4. updateNPCBehavior() — читать из sprite

```typescript
private updateNPCBehavior(npc: LocationNPC): void {
  const sprite = this.npcPhysicsSprites.get(npc.id);
  if (!sprite) return;
  
  const state = this.npcStates.get(npc.id) || 'idle';
  
  // Используем позицию спрайта
  const dx = this.playerX - sprite.x;
  const dy = this.playerY - sprite.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // ...
}
```

#### 5. Добавить синхронизацию в update()

```typescript
update(time: number, delta: number): void {
  this.handleMovement();
  this.updateAI();
  
  // ...
  
  // Синхронизируем npc.x/y с позицией спрайта
  for (const [id, sprite] of this.npcPhysicsSprites) {
    const npc = this.npcs.get(id);
    if (npc) {
      npc.x = sprite.x;
      npc.y = sprite.y;
    }
  }
  
  // Update NPC Group (синхронизация визуала)
  if (this.npcGroup) {
    this.npcGroup.update(16);
  }
}
```

---

## 📊 ВЛИЯНИЕ НА ДРУГИЕ КОМПОНЕНТЫ

### Не затрагивает:
- **ProjectileManager** — уже использует `npc.x/y` из NPCSprite ✅
- **NPCGroup** — уже использует `npc.x/y` из NPCSprite ✅
- **Коллизии** — используют body.position напрямую ✅

### Требует изменения:
- **LocationScene.moveNPCTowards()** — ❌ Требует изменений
- **LocationScene.handleNPCMove()** — ❌ Требует изменений
- **LocationScene.handleNPCAttack()** — ❌ Требует изменений
- **LocationScene.updateNPCBehavior()** — ❌ Требует изменений
- **LocationScene.update()** — ❌ Добавить синхронизацию

---

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ

### 1. NPCSprite.moveTo() уже существует!

```typescript
// NPCSprite.ts:450-469
public moveTo(targetX: number, targetY: number, speed: number): void {
  const dx = targetX - this.x;
  const dy = targetY - this.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance > 5) {
    const nx = dx / distance;
    const ny = dy / distance;
    
    // Использует setVelocity — корректно для физики!
    this.setVelocity(nx * speed, ny * speed);
    
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    this.setDirection(angle);
  } else {
    this.setVelocity(0, 0);
  }
}
```

### 2. NPCSprite.syncVisualPosition() вызывается в NPCGroup.update()

```typescript
// NPCGroup.ts:327-332
update(delta: number): void {
  for (const npc of this.npcs.values()) {
    npc.syncVisualPosition();
  }
}
```

### 3. Физика обновляется автоматически

Arcade Physics обновляет `body.position` каждый кадр перед вызовом `scene.update()`.

---

## 📋 ЧЕК-ЛИСТ ИСПРАВЛЕНИЙ

### БАГ 5: Единый источник позиции

- [x] **LocationScene.moveNPCTowards()** — заменить setPosition на sprite.moveTo()
  - ✅ ИСПРАВЛЕНО: используется `sprite.moveTo(targetX, targetY, speed)`
- [x] **LocationScene.handleNPCMove()** — заменить tween на sprite.moveTo()
  - ✅ ИСПРАВЛЕНО: используется `sprite.moveTo(data.targetX, data.targetY, data.speed)`
- [x] **LocationScene.handleNPCAttack()** — читать позицию из sprite
  - ✅ ИСПРАВЛЕНО: `const npcX = sprite.x; const npcY = sprite.y;`
- [x] **LocationScene.updateNPCBehavior()** — читать позицию из sprite
  - ✅ ИСПРАВЛЕНО: `const npcX = sprite.x; const npcY = sprite.y;`
- [x] **LocationScene.update()** — добавить синхронизацию npc.x/y ← sprite.x/y
  - ✅ ИСПРАВЛЕНО: цикл синхронизации добавлен в update()

---

## 📅 ПРОВЕРКА СТАТУСА (2026-03-19)

**Проверено:** код проверен вручную в LocationScene.ts

**Результаты:**
- ✅ `moveNPCTowards()` использует `sprite.moveTo()` (строки 1073-1082)
- ✅ `handleNPCMove()` использует `sprite.moveTo()` вместо tween
- ✅ `handleNPCAttack()` читает `sprite.x`, `sprite.y`
- ✅ `updateNPCBehavior()` читает `sprite.x`, `sprite.y`
- ✅ Синхронизация npc.x/y ← sprite.x/y присутствует в update()

**Ключевой комментарий в коде:**
```typescript
// ВАЖНО: NPCSprite — единственный источник истины для позиции!
// LocationNPC.x/y обновляется здесь для совместимости с остальным кодом
for (const [id, sprite] of this.npcPhysicsSprites) {
  const npc = this.npcs.get(id);
  if (npc) {
    npc.x = sprite.x;
    npc.y = sprite.y;
  }
}
```

---

*Документ создан: 2026-03-18*
*Исправлено: 2026-03-18*
*Проверено: 2026-03-19*
*Приоритет: HIGH*
*Статус: ✅ ЗАВЕРШЕНО*
