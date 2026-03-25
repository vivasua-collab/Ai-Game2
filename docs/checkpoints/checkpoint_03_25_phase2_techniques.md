# ФАЗА 2: Techniques - Серверная Миграция Техник

**Версия:** 1.0
**Дата:** 2026-03-25
**Статус:** 📋 ПЛАНИРОВАНИЕ
**Приоритет:** 🟠 ВЫСОКИЙ
**Время:** 2-3 дня
**Зависимости:** Фаза 1 (Combat API)

---

## 🎯 ЦЕЛЬ ФАЗЫ

Перенести расчёт и применение техник на сервер. Qi списывается ТОЛЬКО через TruthSystem. Клиент отправляет только намерение использовать технику.

### Принцип

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ПРИНЦИП TECHNIQUE SERVICE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ДО (НЕПРАВИЛЬНО):                                                         │
│   Клиент: "Использую технику, Qi -= 50, урон = 100"                        │
│   ⚠️ ЧИТ: подмена Qi и урона на клиенте                                    │
│                                                                             │
│   ПОСЛЕ (ПРАВИЛЬНО):                                                        │
│   Клиент: "Хочу использовать технику X на координаты (y, z)"               │
│   Сервер: "Проверяю Qi → Списываю Qi → Рассчитываю урон → Возвращаю"       │
│   ✅ Qi и урон рассчитываются ТОЛЬКО на сервере                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 ФАЙЛЫ ДЛЯ СОЗДАНИЯ

### 1. `src/lib/game/server/combat/technique-service.ts`

```typescript
/**
 * Серверный сервис техник
 * Мигрировано из: TechniqueSlotsManager.ts, techniques.ts
 */

import { TruthSystem } from '@/lib/game/truth-system';
import { DamageCalculator } from './damage-calculator';
import { prisma } from '@/lib/db';

export interface TechniqueUseResult {
  success: boolean;
  reason?: string;
  damage?: number;
  currentQi?: number;
  projectile?: ProjectileData;
  cooldown?: number;
}

export interface ProjectileData {
  element: string;
  speed: number;
  size: number;
  color: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

export class TechniqueService {
  private truthSystem: TruthSystem;
  private damageCalculator: DamageCalculator;

  constructor() {
    this.truthSystem = TruthSystem.getInstance();
    this.damageCalculator = new DamageCalculator();
  }

  /**
   * Использование техники игроком
   */
  async useTechnique(
    sessionId: string,
    techniqueId: string,
    targetX: number,
    targetY: number,
    qiInput?: number
  ): Promise<TechniqueUseResult> {
    
    // 1. Получить персонажа
    const character = this.truthSystem.getCharacter(sessionId);
    if (!character) {
      return { success: false, reason: 'Персонаж не найден' };
    }

    // 2. Получить технику из БД
    const technique = await prisma.technique.findUnique({
      where: { id: techniqueId },
    });
    if (!technique) {
      return { success: false, reason: 'Техника не найдена' };
    }

    // 3. Проверить владение техникой
    const ownedTechnique = await prisma.characterTechnique.findFirst({
      where: { characterId: character.id, techniqueId },
    });
    if (!ownedTechnique) {
      return { success: false, reason: 'Техника не изучена' };
    }

    // 4. Определить Qi для использования
    const qiCost = qiInput ?? technique.qiCost;
    if (character.currentQi < qiCost) {
      return { success: false, reason: 'Недостаточно Qi' };
    }

    // 5. Списать Qi через TruthSystem
    const spendResult = this.truthSystem.spendQi(
      sessionId,
      qiCost,
      'technique',
      `technique:${techniqueId}`
    );

    if (!spendResult.success) {
      return { success: false, reason: 'Ошибка списания Qi' };
    }

    // 6. Рассчитать урон техники
    const damage = this.damageCalculator.calculateTechniqueDamage({
      techniqueId,
      characterLevel: character.level,
      characterQi: qiCost,
      qiInput: qiCost,
      mastery: ownedTechnique.mastery,
      conductivity: character.conductivity ?? 0.5,
      targetDefense: 0, // Будет учтено при попадании
      targetLevel: 1,   // Будет учтено при попадании
    });

    // 7. Создать данные снаряда
    const projectile: ProjectileData = {
      element: technique.element ?? 'neutral',
      speed: 300,
      size: 24,
      color: this.getElementColor(technique.element),
      startX: character.x ?? 0,
      startY: character.y ?? 0,
      targetX,
      targetY,
    };

    // 8. Вернуть результат
    return {
      success: true,
      damage,
      currentQi: spendResult.data.currentQi,
      projectile,
      cooldown: technique.cooldown ?? 0,
    };
  }

  /**
   * Применить урон техники при попадании
   */
  async applyTechniqueDamage(
    sessionId: string,
    techniqueId: string,
    targetId: string,
    damage: number
  ): Promise<CombatResult> {
    // Получить NPC
    const npc = this.truthSystem.getNPC(targetId);
    if (!npc) {
      return {
        success: false,
        damage: 0,
        targetId,
        targetHp: 0,
        targetMaxHp: 0,
        isDead: false,
        effects: [],
      };
    }

    // Применить урон
    const newHp = npc.hp - damage;
    const isDead = newHp <= 0;

    this.truthSystem.updateNPC(targetId, {
      hp: Math.max(0, newHp),
      status: isDead ? 'dead' : 'alive',
    });

    return {
      success: true,
      damage,
      targetId,
      targetHp: newHp,
      targetMaxHp: npc.maxHp,
      isDead,
      effects: [{ type: 'damage', value: damage }],
    };
  }

  private getElementColor(element: string | null): string {
    const colors: Record<string, string> = {
      fire: '#ff4444',
      water: '#4488ff',
      earth: '#886644',
      wind: '#88ff88',
      lightning: '#ffff44',
      neutral: '#888888',
    };
    return colors[element ?? 'neutral'] ?? colors.neutral;
  }
}
```

### 2. `src/lib/game/server/combat/qi-manager.ts`

```typescript
/**
 * Серверный менеджер Qi
 * Централизованное управление Qi через TruthSystem
 */

import { TruthSystem } from '@/lib/game/truth-system';

export class QiManager {
  private truthSystem: TruthSystem;

  constructor() {
    this.truthSystem = TruthSystem.getInstance();
  }

  /**
   * Списать Qi
   */
  spendQi(sessionId: string, amount: number, reason: string): QiOperationResult {
    return this.truthSystem.spendQi(sessionId, amount, reason);
  }

  /**
   * Восстановить Qi
   */
  restoreQi(sessionId: string, amount: number, reason: string): QiOperationResult {
    return this.truthSystem.restoreQi(sessionId, amount, reason);
  }

  /**
   * Получить текущее Qi
   */
  getCurrentQi(sessionId: string): number {
    const character = this.truthSystem.getCharacter(sessionId);
    return character?.currentQi ?? 0;
  }

  /**
   * Проверить достаточность Qi
   */
  hasEnoughQi(sessionId: string, required: number): boolean {
    return this.getCurrentQi(sessionId) >= required;
  }
}
```

---

## 📁 ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

### 1. `mini-services/game-ws/index.ts`

**Добавить обработчики:**

```typescript
import { TechniqueService } from '@/lib/game/server';

const techniqueService = new TechniqueService();

// Использование техники
socket.on('technique:use', async (data) => {
  const { sessionId, techniqueId, targetX, targetY, qiInput } = data;
  
  const result = await techniqueService.useTechnique(
    sessionId,
    techniqueId,
    targetX,
    targetY,
    qiInput
  );
  
  // Отправить результат обратно
  socket.emit('technique:result', result);
  
  // Если успех - broadcast для других игроков
  if (result.success) {
    socket.broadcast.emit('player:technique', {
      playerId: sessionId,
      techniqueId,
      projectile: result.projectile,
    });
  }
});

// Попадание снаряда
socket.on('technique:hit', async (data) => {
  const { sessionId, techniqueId, targetId, damage } = data;
  
  const result = await techniqueService.applyTechniqueDamage(
    sessionId,
    techniqueId,
    targetId,
    damage
  );
  
  // Broadcast результата
  io.emit('combat:result', result);
});
```

### 2. `src/game/services/TechniqueSlotsManager.ts`

**Изменения:**
- УБРАТЬ `calculateDamage()`
- УБРАТЬ локальное списание Qi
- ОСТАВИТЬ только UI и отправку `technique:use`

```typescript
// ДО:
async use(techniqueId: string) {
  const qiCost = technique.qiCost;
  this.characterQi -= qiCost;  // ❌ Локально!
  const damage = this.calculateDamage(technique);  // ❌ На клиенте!
  this.onFireProjectile({ damage, ... });
}

// ПОСЛЕ:
async use(techniqueId: string) {
  // Только отправить запрос на сервер
  const result = await this.gameSocket.emit('technique:use', {
    techniqueId,
    targetX: this.targetX,
    targetY: this.targetY,
  });
  
  // Результат придёт через technique:result
  if (result.success) {
    // Создать снаряд с данными от сервера
    this.createVisualProjectile(result.projectile);
  }
}
```

### 3. `src/game/services/ProjectileManager.ts`

**Изменения:**
- Снаряд создаётся с данными от сервера (без расчёта урона)
- При попадании отправляется `technique:hit` (без применения урона)

```typescript
// ПОСЛЕ:
createServerProjectile(data: ServerProjectileData) {
  const projectile = this.scene.add.sprite(data.startX, data.startY, 'projectile');
  
  // Движение к цели
  this.scene.physics.moveTo(projectile, data.targetX, data.targetY, data.speed);
  
  // При попадании - уведомить сервер
  projectile.on('hit', (targetId: string) => {
    // НЕ применять урон локально!
    // Отправить событие на сервер
    this.gameSocket.emit('technique:hit', {
      techniqueId: data.techniqueId,
      targetId,
      damage: data.damage, // Урон от сервера
    });
  });
}
```

---

## 📡 WEBSOCKET ПРОТОКОЛ

### Новые события

#### `technique:use` (Клиент → Сервер)

```typescript
// Запрос
{
  techniqueId: string;
  targetX: number;
  targetY: number;
  qiInput?: number;  // Опционально, если техника позволяет
}

// Ответ (только отправителю)
{
  success: boolean;
  reason?: string;      // Если не success
  damage?: number;      // Рассчитанный урон
  currentQi?: number;   // Текущее Qi после списания
  projectile?: {
    element: string;
    speed: number;
    size: number;
    color: string;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
  };
  cooldown?: number;
}
```

#### `technique:hit` (Клиент → Сервер)

```typescript
// Запрос (когда снаряд попадает)
{
  techniqueId: string;
  targetId: string;
  damage: number;  // Урон от technique:result (НЕ рассчитывается!)
}

// Ответ (broadcast combat:result)
{
  success: boolean;
  damage: number;
  targetId: string;
  targetHp: number;
  targetMaxHp: number;
  isDead: boolean;
}
```

#### `player:technique` (Сервер → Клиент, broadcast)

```typescript
{
  playerId: string;
  techniqueId: string;
  projectile: ProjectileData;
}
```

---

## 🧪 МЕТОДЫ ТЕСТИРОВАНИЯ

### Тест 1: Qi списание на сервере

**Цель:** Убедиться, что Qi списывается на сервере

**Метод:**
1. Записать текущее Qi (например, 200)
2. Использовать технику с qiCost = 50
3. Проверить `technique:result` → `currentQi`
4. Проверить UI Qi бара

**Критерий:**
- ✅ `currentQi` в ответе = 150
- ✅ UI Qi бара обновляется от сервера
- ❌ Нет `characterQi -=` на клиенте

### Тест 2: Урон техники на сервере

**Цель:** Убедиться, что урон техники рассчитывается на сервере

**Метод:**
1. Использовать технику
2. Проверить `technique:result` → `damage`
3. Проверить `technique:hit` → `combat:result`

**Критерий:**
- ✅ `damage` приходит от сервера
- ✅ Урон зависит от mastery, conductivity (проверить формулу)
- ❌ Нет расчёта урона на клиенте

### Тест 3: Невозможность подмены Qi

**Цель:** Убедиться, что клиент не может подделать Qi

**Метод:**
1. Изменить `qiInput` в запросе
2. Проверить, что сервер игнорирует `qiInput` если он > qiCost
3. Проверить, что Qi списывается корректно

**Критерий:**
- ✅ Сервер проверяет `qiInput <= character.currentQi`
- ✅ Сервер использует `qiInput` только если <= qiCost
- ❌ Нельзя использовать технику без Qi

### Тест 4: Владение техникой

**Цель:** Проверить, что нельзя использовать чужую технику

**Метод:**
1. Попробовать использовать технику, которой нет у персонажа
2. Проверить ответ сервера

**Критерий:**
- ✅ Сервер возвращает `{ success: false, reason: 'Техника не изучена' }`
- ❌ Нельзя использовать неизученную технику

### Тест 5: Интеграция с TruthSystem

**Цель:** Убедиться, что Qi сохраняется

**Метод:**
1. Использовать технику
2. Перезагрузить страницу
3. Проверить Qi персонажа

**Критерий:**
- ✅ Qi сохраняется через TruthSystem
- ✅ После перезагрузки Qi корректный

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ ФАЗЫ 2

### Обязательные

- [ ] Создан `src/lib/game/server/combat/technique-service.ts`
- [ ] Создан `src/lib/game/server/combat/qi-manager.ts`
- [ ] WebSocket обрабатывает `technique:use`
- [ ] WebSocket обрабатывает `technique:hit`
- [ ] Qi списывается ТОЛЬКО через TruthSystem
- [ ] Урон техники рассчитывается на сервере

### Код ревью

- [ ] Нет `this.characterQi -=` на клиенте
- [ ] Нет `calculateDamage()` в TechniqueSlotsManager
- [ ] Все расчёты в `src/lib/game/server/`
- [ ] technique:use не принимает `damage` от клиента

### Проверка через логи

```
[SERVER] TechniqueService.useTechnique: sessionId=xxx, techniqueId=fireball_1
[SERVER] TruthSystem.spendQi: amount=50, reason=technique:fireball_1
[SERVER] DamageCalculator.calculateTechniqueDamage: result=47
[SERVER] Sending technique:result to client
```

---

## 📊 ПРОГРЕСС

| Задача | Статус | Время |
|--------|--------|-------|
| Создать `technique-service.ts` | 📋 | 3 часа |
| Создать `qi-manager.ts` | 📋 | 1 час |
| Обновить `game-ws/index.ts` | 📋 | 2 часа |
| Обновить `TechniqueSlotsManager.ts` | 📋 | 3 часа |
| Обновить `ProjectileManager.ts` | 📋 | 2 часа |
| Тестирование | 📋 | 3 часа |

**Итого:** ~14 часов (2-3 дня)

---

## 🚀 СЛЕДУЮЩАЯ ФАЗА

После завершения Фазы 2 → [checkpoint_03_25_phase3_ai.md](./checkpoint_03_25_phase3_ai.md)

---

## 📚 ЗАВИСИМОСТИ

- **Фаза 1:** Combat API (должна быть завершена)
  - `damage-calculator.ts` - используется для расчёта урона
  - `combat-service.ts` - используется для применения урона

---

*Документ создан: 2026-03-25*
*Зависимости: Фаза 1*
