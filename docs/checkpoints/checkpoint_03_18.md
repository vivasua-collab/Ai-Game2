# Checkpoint 03-18: Диагностика NPC Коллизий

**Дата:** 2026-03-18
**Статус:** ✅ ЗАВЕРШЁН — все проблемы перенесены в `checkpoint_03_18_colision_fix.md`
**Приоритет:** HIGH
**Зависимости:** `checkpoint_03_17_colision.md`

---

## 📋 История проблемы

### Предыдущие исправления (checkpoint_03_17)

Согласно чекпоинту 03_17, были исправлены:
1. ✅ Callback в NPCGroup.setPlayerCollision()
2. ✅ Клавиша взаимодействия (E/F)
3. ✅ npcSprites → npcPhysicsSprites
4. ✅ Offset хитбокса NPC
5. ✅ Subtype техник при создании
6. ✅ Визуальный хитбокс bodyCircle
7. ✅ Offset снарядов Beam/AOE
8. ✅ Анимация при наведении
9. ✅ Immovable для всех NPC

**Статус:** Все исправления применены, НО "эффект не принесло"

---

## 🕵️ ТЕКУЩИЙ АУДИТ

### 1. Проверка компиляции

```
$ bun run lint
✖ 3 problems (0 errors, 3 warnings)
```

✅ **Код компилируется без ошибок**

### 2. Проверка Phaser импортов

Все файлы используют namespace import:
```javascript
import * as Phaser from 'phaser';
```

✅ **Phaser импорты исправлены (11 файлов)**

### 3. Проверка API путей

- `/api/game/save` - работает ✅
- `/api/game/last-session` - работает ✅
- `/api/npc/spawn` - работает ✅

✅ **API работает корректно**

### 4. Проверка создания NPCs

Из dev.log видно:
```
[PRESET_SPAWNER] Spawned 5 preset NPCs
[LocationScene] Loaded X NPCs
```

✅ **NPCs создаются в базе данных**

---

## 🔴 КЛЮЧЕВЫЕ ВОПРОСЫ ДЛЯ ДИАГНОСТИКИ

### Вопрос 1: Создаются ли физические спрайты NPC?

**Проверка:** Есть ли в консоли логи `[NPCSprite] Created NPC "..." at (...) with hitbox radius ...`?

**Если НЕТ:**
- NPCs создаются в БД, но не в сцене Phaser
- Проблема в `LocationScene.spawnNPC()` или `loadNPCs()`

### Вопрос 2: Работает ли физика игрока?

**Проверка:** Есть ли в консоли логи `[NPCGroup] Player collider enabled with callback`?

**Если НЕТ:**
- `playerPhysicsBody` не создан
- Проблема в `createPlayerWithPhysics()`

### Вопрос 3: Срабатывают ли коллизии?

**Проверка:** Есть ли в консоли логи `[NPCGroup] NPC "..." already in group` или `npc:playerCollision` event?

**Если НЕТ:**
- Коллизии не активны
- Возможно `body.enable = false`

### Вопрос 4: Попадают ли снаряды?

**Проверка:** Есть ли в консоли логи `[ProjectileManager] Hit: ... → ... for ... damage`?

**Если НЕТ:**
- Снаряды не пересекаются с NPC
- Проблема в overlap detection

---

## 🔬 ПЛАН ДИАГНОСТИКИ

### Этап 1: Проверка загрузки NPCs в сцену

**Файл:** `src/game/scenes/LocationScene.ts`

**Метод:** `loadNPCs()` → `spawnNPC()`

**Что проверить:**
1. Вызывается ли `loadNPCs()` после `initializeNPCGroup()`?
2. Возвращает ли API данные NPCs?
3. Создаются ли `NPCSprite` объекты?

**Логи для поиска:**
```
[LocationScene] Loaded X NPCs
[LocationScene] Spawned NPC "..." at (...) with physics
[NPCSprite] Created NPC "..." at (...) with hitbox radius ...
[NPCGroup] Added NPC "..." (...)
```

### Этап 2: Проверка физики игрока

**Файл:** `src/game/scenes/LocationScene.ts`

**Метод:** `createPlayerWithPhysics()`

**Что проверить:**
1. Создаётся ли `playerPhysicsBody`?
2. Добавляется ли он в физику сцены?
3. Есть ли у него тело (`body`)?

**Код для проверки:**
```javascript
console.log('[Player] Physics body created:', this.playerPhysicsBody);
console.log('[Player] Has body:', !!this.playerPhysicsBody.body);
```

### Этап 3: Проверка коллизий

**Файл:** `src/game/groups/NPCGroup.ts`

**Метод:** `setPlayerCollision()`

**Что проверить:**
1. Создаётся ли `collider`?
2. Есть ли NPCs в группе?
3. Работает ли callback?

**Код для добавления debug:**
```javascript
console.log('[NPCGroup] NPCs in group:', this.npcs.size);
console.log('[NPCGroup] Phaser group size:', this.group.getLength());
```

### Этап 4: Проверка снарядов

**Файл:** `src/game/services/ProjectileManager.ts`

**Метод:** `setupCollision()` → `onProjectileHit()`

**Что проверить:**
1. Создаётся ли collider с NPCGroup?
2. Пересекаются ли снаряды с NPC?
3. Вызывается ли `hit()` метод?

---

## 📝 ВОЗМОЖНЫЕ ПРИЧИНЫ

### Причина A: NPCs не загружаются в сцену

**Симптом:** NPCs в БД есть, но в Phaser сцене их нет

**Решение:** Проверить `loadNPCs()` и API `/api/npc/spawn`

### Причина B: Физика игрока не инициализирована

**Симптом:** `playerPhysicsBody` не создан или `null`

**Решение:** Проверить порядок вызова `createPlayerWithPhysics()` до `initializeNPCGroup()`

### Причина C: Коллизии отключены

**Симптом:** Collider создаётся, но события не срабатывают

**Решение:** Проверить `body.enable` и `body.checkCollision`

### Причина D: Порядок инициализации

**Симптом:** NPCGroup создаётся до игрока

**Решение:** Убедиться в правильном порядке:
```javascript
this.createPlayerWithPhysics();  // Сначала игрок
this.initializeNPCGroup();        // Потом NPC группа
await this.loadNPCs();            // Потом загрузка NPCs
```

---

## ✅ ПЛАН РАБОТ

### Шаг 1: Добавить debug логирование

**Файлы:**
- `src/game/scenes/LocationScene.ts`
- `src/game/groups/NPCGroup.ts`
- `src/game/objects/NPCSprite.ts`

**Добавить логи:**
- `[Init]` для этапов инициализации
- `[Player]` для физики игрока
- `[NPC]` для создания и коллизий NPCs

### Шаг 2: Проверить консоль браузера

**Искать логи:**
1. `[LocationScene] NPC Group initialized with Arcade Physics`
2. `[LocationScene] Loaded X NPCs`
3. `[NPCSprite] Created NPC "..." at (...)`
4. `[NPCGroup] Player collider enabled with callback`

### Шаг 3: Проверить dev.log

**Искать ошибки:**
- Ошибки API
- Ошибки создания NPCs
- Ошибки физики

### Шаг 4: При необходимости - добавить debug визуализацию

**Включить debug режим физики:**
```javascript
physics: {
  arcade: {
    debug: true,  // Показать хитбоксы
  }
}
```

---

## 🎯 СЛЕДУЮЩИЕ ДЕЙСТВИЯ

1. **От пользователя:** Описать конкретную проблему (что не работает?)
   - NPCs не видно?
   - NPCs видно, но можно пройти сквозь?
   - Атака не наносит урон?
   - Кнопки E/F не работают?

2. **От разработчика:** Добавить debug логирование

3. **Совместно:** Провести тестирование с открытой консолью

---

## ⚠️ ВАЖНО: Клавиши F1-F12

**Напоминание:** Клавиши F1-F12 перехватываются браузером!
- F1 - Справка браузера
- F5 - Обновление страницы
- F11 - Полноэкранный режим
- F12 - DevTools

**Для игры использовать:**
- E или F - взаимодействие с NPC
- 1-4 - выбор техники
- WASD - движение
- ЛКМ - атака

---

## 📊 ТЕКУЩИЙ СТАТУС КОДА

| Компонент | Статус | Файл |
|-----------|--------|------|
| Phaser импорты | ✅ Исправлено | 11 файлов |
| API пути | ✅ Исправлено | `page.tsx` |
| Обработка ошибок | ✅ Добавлено | `page.tsx` |
| NPCGroup | ✅ Код правильный | `NPCGroup.ts` |
| NPCSprite | ✅ Код правильный | `NPCSprite.ts` |
| ProjectileManager | ✅ Код правильный | `ProjectileManager.ts` |
| LocationScene | ⚠️ Требует проверки | `LocationScene.ts` |
| Коллизии | ❓ Неизвестно | Требует тестирования |

---

## 📚 ССЫЛКИ

- **План исправлений коллизий:** `docs/checkpoints/checkpoint_03_18_colision_fix.md`
- **План исправлений аудита:** `docs/checkpoints/checkpoint_03_18_audit.md`
- **Предыдущий чекпоинт:** `docs/checkpoints/checkpoint_03_17_colision.md`

---

*Аудит проведён: 2026-03-18*
*Версия: 2.1*
*Статус: 🔴 Корневая причина найдена — требует исправления*
