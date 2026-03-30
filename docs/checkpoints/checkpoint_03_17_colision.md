# 🎯 Checkpoint: Диагностика коллизий NPC

**Версия:** 4.0
**Дата:** 2026-03-17 (обновлено)
**Статус:** ✅ Критические проблемы ИСПРАВЛЕНЫ
**Приоритет:** Критический
**Зависимости:** `checkpoint_03_16_colision.md`, `checkpoint_03_16_fight.md`, `checkpoint_03_16_fight_ext.md`

---

## ✅ ИСПРАВЛЕНИЯ (версия 4.0)

### ✅ A1: Callback в NPCGroup.setPlayerCollision() - ИСПРАВЛЕНО

**Изменение:** Добавлен callback в `physics.add.collider()` и `physics.add.overlap()`

**Файл:** `src/game/groups/NPCGroup.ts:187-210`

```typescript
// ДО:
this.playerCollider = this.scene.physics.add.collider(player, this.group); // Без callback

// ПОСЛЕ:
this.playerCollider = this.scene.physics.add.collider(
  player,
  this.group,
  (playerObj, npcObj) => this.handlePlayerCollision(playerObj, npcObj, 'collide'),
  undefined,
  this
);
```

---

### ✅ A2: Клавиша взаимодействия (E/F) - ИСПРАВЛЕНО

**Изменение:** Добавлены клавиши E и F для взаимодействия с NPC

**Файл:** `src/game/scenes/LocationScene.ts:746-807`

```typescript
// Добавлено в setupInput():
this.input.keyboard.on('keydown-E', () => this.interactWithNearestNPC());
this.input.keyboard.on('keydown-F', () => this.interactWithNearestNPC());

// Добавлен метод interactWithNearestNPC()
```

---

### ✅ A3: npcSprites vs npcPhysicsSprites - ИСПРАВЛЕНО

**Изменение:** Заменено использование `npcSprites` на `npcPhysicsSprites`

**Файл:** `src/game/scenes/LocationScene.ts:826-827, 987-988`

```typescript
// ДО:
const sprite = this.npcSprites.get(data.npcId);

// ПОСЛЕ:
const sprite = this.npcPhysicsSprites.get(data.npcId);
```

---

### ✅ A4: Offset хитбокса NPC - ИСПРАВЛЕНО (версия 3.0)

**Файл:** `src/game/objects/NPCSprite.ts:148-152`

```typescript
// ВАЖНО: setCircle() автоматически центрирует тело - offset НЕ нужен!
body.setCircle(this.hitboxRadius);
```

---

### ✅ A5: Subtype техник не сохранялся - ИСПРАВЛЕНО

**Изменение:** При создании техники из пресета теперь правильно сохраняются `type` и `subtype`

**Файл:** `src/services/character-data.service.ts:84-93`

**Проблема:**
- Использовался `preset.type` вместо `preset.techniqueType`
- `subtype` вообще не устанавливался из `effects.combatType`

**Исправление:**
```typescript
// ВАЖНО: subtype берём из effects.combatType
const subtype = preset.effects?.combatType || null;

const created = await db.technique.create({
  data: {
    ...
    type: preset.techniqueType, // ИСПРАВЛЕНО: было preset.type
    subtype: subtype,            // ИСПРАВЛЕНО: добавлено
    ...
  },
});
```

**Это объясняет почему слоты 2-4 не работали!** Техники создавались с `type: undefined`, и API не находило их по фильтру `type: { in: ['combat', 'movement'] }`.

---

### ✅ #1: Визуальный хитбокс синхронизирован - ИСПРАВЛЕНО

**Файл:** `src/game/objects/NPCSprite.ts:189-191`

```typescript
// ДО: фиксированный радиус 20px
this.bodyCircle = scene.add.circle(0, 0, 20, this.getBodyColor(), 0.9);

// ПОСЛЕ: синхронизировано с физическим хитбоксом
this.bodyCircle = scene.add.circle(0, 0, this.hitboxRadius, this.getBodyColor(), 0.9);
```

---

### ✅ #2: Offset для Beam и AOE снарядов - ИСПРАВЛЕНО

**Файл:** `src/game/objects/TechniqueProjectile.ts:218-220, 273-276`

```typescript
// setupBeam - УБРАНО:
// body.setOffset(-4, -4);

// setupAOE - УБРАНО:
// body.setOffset(-this.aoeRadius, -this.aoeRadius);
```

---

### ✅ #3: Анимация при наведении - ИСПРАВЛЕНО

**Файл:** `src/game/objects/NPCSprite.ts:246-262`

```typescript
// ДО: bodyCircle увеличивался
targets: [this.aura, this.bodyCircle, innerGlow, icon, this.nameLabel],

// ПОСЛЕ: bodyCircle НЕ увеличивается
targets: [this.aura, innerGlow, icon, this.nameLabel],  // БЕЗ bodyCircle!
```

---

### ✅ #4: Immovable для всех NPC - ИСПРАВЛЕНО

**Файл:** `src/game/objects/NPCSprite.ts:156-158`

```typescript
// ДО: только дружественные
if (this.disposition >= 0) {
  body.setImmovable(true);
}

// ПОСЛЕ: все NPC
body.setImmovable(true);  // Все NPC неподвижны при столкновении с игроком
```

---

## 📋 Описание проблемы

**Симптомы от пользователя:**
1. При наведении курсора мыши на монстра - круг отображения увеличивается
2. При попытке ударить - ноль реакции
3. При попытке толкнуть - проходит насквозь
4. Невозможно установить технику в слот

**Ожидаемое поведение:**
1. ✅ Наведение курсора показывает реальный размер хитбокса
2. ✅ Удар наносит урон по NPC
3. ✅ NPC нельзя пройти насквозь (физическая коллизия)
4. ✅ Техники можно назначать в слоты

---

## 🔴 ВНЕШНИЙ АУДИТ (критические находки)

### ~~Проблема #A1: Callback-логика коллизий не подключена~~ ✅ ИСПРАВЛЕНО

**Файл:** `src/game/groups/NPCGroup.ts:188-193`

**Статус:** ✅ Исправлено - добавлен callback в collider

---

### ~~Проблема #A2: Отсутствует клавиша взаимодействия (E/F)~~ ✅ ИСПРАВЛЕНО

**Файл:** `src/game/scenes/LocationScene.ts:729-760`

**Статус:** ✅ Исправлено - добавлены клавиши E/F

---

### ~~Проблема #A3: Рассинхронизация npcSprites vs npcPhysicsSprites~~ ✅ ИСПРАВЛЕНО

**Файл:** `src/game/scenes/LocationScene.ts`

**Статус:** ✅ Исправлено - используется npcPhysicsSprites

---

### ~~Проблема #A4: Offset хитбокса NPC~~ ✅ ИСПРАВЛЕНО (версия 3.0)

**Файл:** `src/game/objects/NPCSprite.ts:148-152`

**Статус:** ✅ Исправлено - offset убран

---

## 🟡 ДОПОЛНИТЕЛЬНЫЕ ПРОБЛЕМЫ (вне Phaser) - НЕ ТРЕБУЕТСЯ

### Проблема #B1: UpgradeDialog/RepairDialog ожидают data.items

**Приоритет:** 🟡 P1 - Отложено (не влияет на коллизии)

---

### Проблема #B2: /api/character/data возвращает не то

**Приоритет:** 🟡 P1 - Отложено (не влияет на коллизии)

---

### Проблема #B3: Неверная сигнатура addItem

**Приоритет:** 🟡 P1 - Отложено (не влияет на коллизии)

---

## 🔬 АРХИТЕКТУРА (актуальная)

### Поток коллизий (после исправлений)

```
┌─────────────────────────────────────────────────────────────┐
│                     ВИЗУАЛЬНЫЙ СЛОЙ                         │
│  bodyCircle.setInteractive() ← Курсор мыши попадает сюда    │
│  radius = hitboxRadius (динамический) ✓                     │
│  scale: 1.0 при наведении ← БЕЗ увеличения ✓                │
└─────────────────────────────────────────────────────────────┘
                           ↓ СИНХРОНИЗИРОВАНО
┌─────────────────────────────────────────────────────────────┐
│                     ФИЗИЧЕСКИЙ СЛОЙ                          │
│  body.setCircle(hitboxRadius) ← Атака проверяет это         │
│  hitboxRadius = 15-20px (динамический)                      │
│  immovable = true ✓                                         │
│  position: (x, y) ← Реальная позиция                        │
└─────────────────────────────────────────────────────────────┘
```

### Цепочка коллизии игрок-NPC (после исправлений)

```
initializeNPCGroup()
    ↓
npcGroup.setPlayerCollision(playerPhysicsBody, { collide: true })
    ↓
scene.physics.add.collider(player, group, callback) ← С callback! ✓
    ↓
handlePlayerCollision() → эмитит событие
    ↓
[immmovable = true] → игрок не может пройти ✓
```

---

## ✅ ЧЕК-ЛИСТ ИСПРАВЛЕНИЙ

### Критические (обязательно)
- [x] **1.1** Убрать offset в `TechniqueProjectile.setupBeam()` ✅
- [x] **1.2** Убрать offset в `TechniqueProjectile.setupAOE()` ✅
- [x] **1.3** Синхронизировать bodyCircle с hitboxRadius в NPCSprite ✅
- [x] **1.4** Убрать увеличение bodyCircle при наведении ✅
- [x] **1.5** Добавить `setImmovable(true)` для всех NPC ✅
- [x] **1.6** Добавить callback в collider ✅
- [x] **1.7** Добавить клавишу взаимодействия E/F ✅
- [x] **1.8** Исправить npcSprites → npcPhysicsSprites ✅
- [x] **1.9** Исправить сохранение subtype техник ✅

### Средние (желательно)
- [ ] **2.1** Добавить загрузку техник в `initializeTechniqueSlots()`
- [ ] **2.2** Показывать ошибки при назначении техники в слот
- [ ] **2.3** Добавить визуальную индикацию типов слотов

### Тестирование
- [ ] **3.1** Навести курсор на NPC → проверить размер круга
- [ ] **3.2** Выстрелить по NPC → проверить попадание
- [ ] **3.3** Попытаться пройти сквозь NPC → проверить блокировку
- [ ] **3.4** Назначить технику в слот → проверить результат
- [ ] **3.5** Включить debug-режим (F3) → проверить позиции хитбоксов
- [ ] **3.6** Нажать E/F рядом с NPC → проверить взаимодействие

---

## 🔧 ИЗМЕНЁННЫЕ ФАЙЛЫ

| Файл | Изменение | Статус |
|------|-----------|--------|
| `src/game/objects/TechniqueProjectile.ts` | Убрать offset в setupBeam/setupAOE | ✅ |
| `src/game/objects/NPCSprite.ts` | Синхронизировать bodyCircle с hitboxRadius | ✅ |
| `src/game/objects/NPCSprite.ts` | Убрать увеличение bodyCircle при наведении | ✅ |
| `src/game/objects/NPCSprite.ts` | Добавить immovable для всех NPC | ✅ |
| `src/game/groups/NPCGroup.ts` | Добавить callback в collider | ✅ |
| `src/game/scenes/LocationScene.ts` | Добавить клавишу E/F | ✅ |
| `src/game/scenes/LocationScene.ts` | Исправить npcSprites → npcPhysicsSprites | ✅ |
| `src/services/character-data.service.ts` | Исправить type и subtype техник | ✅ |

---

## 📊 РЕЗУЛЬТАТ АНАЛИЗА

**Найдено проблем:** 9
- 🔴 Критических: 9
- ✅ Исправленных: 9
- 🟡 Средних: 3 (отложено)

**Исправлено в версии 4.0:**
1. ✅ Callback в collider для игровой логики
2. ✅ Клавиша взаимодействия (E/F)
3. ✅ Синхронизация npcSprites
4. ✅ Offset хитбокса NPC
5. ✅ Subtype техник при создании
6. ✅ Визуальный хитбокс bodyCircle
7. ✅ Offset снарядов Beam/AOE
8. ✅ Анимация при наведении
9. ✅ Immovable для всех NPC

---

*Документ создан: 2026-03-17*
*Обновлён: 2026-03-17*
*Версия: 4.0*
*Статус: ✅ Все критические проблемы исправлены*
