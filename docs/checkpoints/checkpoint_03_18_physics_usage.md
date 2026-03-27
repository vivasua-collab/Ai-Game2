# 🎮 Phaser 3 Arcade Physics: Теоретические изыскания

**Дата:** 2026-03-18
**Версия Phaser:** 3.90
**Тип проекта:** Cultivation World Simulator

---

## 📋 Оглавление

1. [Архитектура физики](#архитектура-физики)
2. [Единый источник истины](#единый-источник-истины)
3. [Движение объектов](#движение-объектов)
4. [Коллизии](#коллизии)
5. [Антипаттерны](#антипаттерны)
6. [Рекомендации](#рекомендации)
7. [**🆕 Теоретические изыскания**](#теоретические-изыскания)
8. [**🆕 Стыковка с проектом**](#стыковка-с-проектом)

---

## 🏗️ Архитектура физики

### Компоненты Arcade Physics

```
┌─────────────────────────────────────────────────────────────────┐
│                    Phaser 3 Arcade Physics                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │  Physics.World  │────▶│  Physics.Body   │                   │
│  │  - gravity      │     │  - position     │ ← Источник        │
│  │  - bounds       │     │  - velocity     │   истины          │
│  │  - update()     │     │  - acceleration │   позиции!        │
│  └─────────────────┘     │  - enable       │                   │
│                          │  - immovable    │                   │
│                          └─────────────────┘                   │
│                                   │                             │
│                                   ▼                             │
│                          ┌─────────────────┐                   │
│                          │  GameObject     │                   │
│                          │  - sprite.x/y   │ ← Следует за      │
│                          │  - visual       │   body.position   │
│                          └─────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Иерархия обновления позиции

```
Кадр игры (60 FPS):
1. Input обработка
2. physics.world.update()      ← Физика обновляет body.position
3. scene.update()              ← Синхронизация sprite.x/y с body
4. Render
```

---

## 🎯 Единый источник истины

### ❌ НЕПРАВИЛЬНО: Два источника позиции

```typescript
// ДВА источника истины = Рассинхронизация!
interface LocationNPC {
  x: number;  // ← Позиция в данных
  y: number;
}

class NPCSprite extends Physics.Arcade.Sprite {
  // x, y унаследованы от Sprite ← Позиция от физики
}

// Проблема:
npc.x += speed * delta;  // Обновляем данные
sprite.setPosition(npc.x, npc.y);  // Обходим физику!

// Коллизии используют sprite.body.position
// AI использует npc.x/y
// РЕЗУЛЬТАТ: Рассинхронизация!
```

### ✅ ПРАВИЛЬНО: Один источник истины

```typescript
// NPCSprite — ЕДИНСТВЕННЫЙ источник истины
class NPCSprite extends Physics.Arcade.Sprite {
  // x, y — от физики (body.position)
  
  public moveTo(targetX: number, targetY: number, speed: number): void {
    // Используем setVelocity — физика обновит позицию
    this.setVelocity(nx * speed, ny * speed);
  }
}

// LocationNPC — только чтение!
class LocationScene {
  update(delta: number): void {
    // Синхронизируем данные с физикой
    for (const [id, sprite] of this.npcPhysicsSprites) {
      const npc = this.npcs.get(id);
      if (npc) {
        npc.x = sprite.x;  // Читаем из физики
        npc.y = sprite.y;
      }
    }
  }
}
```

---

## 🚀 Движение объектов

### Способы перемещения

| Метод | Физика | Коллизии | Использование |
|-------|--------|----------|---------------|
| `setPosition(x, y)` | ❌ Обходит | ❌ Игнорирует | Только для телепортации |
| `x += speed` | ❌ Обходит | ❌ Игнорирует | ❌ Не использовать |
| `setVelocity(vx, vy)` | ✅ Использует | ✅ Учитывает | Стандартное движение |
| `moveTo(x, y, speed)` | ✅ Использует | ✅ Учитывает | Движение к точке |
| `Tween` анимация | ❌ Обходит | ❌ Игнорирует | Только для UI/эффектов |

### Рекомендуемый паттерн движения

```typescript
class NPCSprite extends Phaser.Physics.Arcade.Sprite {
  /**
   * Двигаться к точке через физику
   */
  public moveTo(targetX: number, targetY: number, speed: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      const nx = dx / distance;
      const ny = dy / distance;
      
      // ✅ Используем setVelocity — физика обрабатывает коллизии
      this.setVelocity(nx * speed, ny * speed);
    } else {
      this.setVelocity(0, 0);
    }
  }
  
  /**
   * Остановиться
   */
  public stopMovement(): this {
    this.setVelocity(0, 0);
    return this;
  }
}
```

---

## 💥 Коллизии

### Типы коллизий

```typescript
// 1. Физическая коллизия с выталкиванием
this.physics.add.collider(objectA, objectB, callback);

// 2. Обнаружение перекрытия (без физики)
this.physics.add.overlap(objectA, objectB, callback);

// 3. Групповая коллизия
this.physics.add.collider(groupA, groupB, callback);
```

### Настройка хитбокса

```typescript
// ВАЖНО: setCircle() требует offset для центрирования!
const SPRITE_HALF = 16; // __DEFAULT = 32×32, origin = 0.5

body.setCircle(
  radius,                    // Радиус круга
  SPRITE_HALF - radius,      // offsetX для центрирования
  SPRITE_HALF - radius       // offsetY для центрирования
);
```

### Порядок инициализации физики

```typescript
// ✅ ПРАВИЛЬНЫЙ порядок:
// 1. Создать объект (без physics.add.existing)
const npc = new NPCSprite(scene, config);

// 2. Добавить в Physics Group (создаёт тело)
this.group.add(npc);

// 3. Настроить тело ПОСЛЕ добавления
npc.configurePhysicsBody();
```

---

## ⛔ Антипаттерны

### 1. setPosition() вместо setVelocity()

```typescript
// ❌ НЕПРАВИЛЬНО
npc.x += nx * speed * delta;
sprite.setPosition(npc.x, npc.y);

// ✅ ПРАВИЛЬНО
sprite.setVelocity(nx * speed, ny * speed);
```

### 2. Tween для игрового движения

```typescript
// ❌ НЕПРАВИЛЬНО — Tween обходит физику
this.tweens.add({
  targets: sprite,
  x: targetX,
  y: targetY,
  duration: 1000,
});

// ✅ ПРАВИЛЬНО — использовать физику
sprite.moveTo(targetX, targetY, speed);
```

### 3. Дублирование physics.add.existing()

```typescript
// ❌ НЕПРАВИЛЬНО — конфликт с group.add()
scene.physics.add.existing(sprite);
this.group.add(sprite);

// ✅ ПРАВИЛЬНО — group.add() создаёт тело
this.group.add(sprite);
sprite.configurePhysicsBody(); // Настройка после
```

### 4. Прямое изменение x/y

```typescript
// ❌ НЕПРАВИЛЬНО
sprite.x += speed;

// ✅ ПРАВИЛЬНО
sprite.setVelocityX(speed);
// или
sprite.body.velocity.x = speed;
```

---

## ✅ Рекомендации

### Для игрока

```typescript
// Невидимое физическое тело
this.playerPhysicsBody = this.physics.add.sprite(x, y, '__DEFAULT');
this.playerPhysicsBody.setVisible(false);

// Визуальный контейнер следует за физикой
this.player.setPosition(this.playerPhysicsBody.x, this.playerPhysicsBody.y);

// Движение через setVelocity
this.playerPhysicsBody.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);
```

### Для NPC

```typescript
// NPCSprite = Physics.Arcade.Sprite
// Позиция определяется физикой

// Движение
npc.moveTo(targetX, targetY, speed);

// Остановка
npc.stopMovement();

// Синхронизация данных
npcData.x = npc.x;
npcData.y = npc.y;
```

### Для снарядов

```typescript
// Через Physics Group
const group = this.physics.add.group({
  runChildUpdate: false,  // Обновляем вручную
});

// Создание снаряда
const projectile = new TechniqueProjectile(scene, config);
group.add(projectile);

// Движение через setVelocity
projectile.setVelocity(vx * speed, vy * speed);
```

---

## 📊 Диагностика проблем

### Симптомы проблем с физикой

| Симптом | Причина | Решение |
|---------|---------|---------|
| NPC проходит сквозь игрока | setPosition() обходит физику | Использовать setVelocity() |
| Коллизии не срабатывают | Хитбокс смещён | Проверить setCircle() offset |
| Снаряды не попадают | Два источника позиции | Синхронизировать с sprite.x/y |
| NPC "телепортируется" | Tween анимация | Использовать moveTo() |
| Двойное обновление | runChildUpdate + ручной update | Оставить только один |

### Включение debug режима

```typescript
// В конфигурации игры
physics: {
  arcade: {
    debug: true,  // Показать хитбоксы
    gravity: { y: 0 },
  }
}

// Или динамически
this.physics.world.debugGraphic.setVisible(true);
```

---

## 🔄 Цикл обновления физики

```
┌─────────────────────────────────────────────────────────────┐
│                    Game Loop (60 FPS)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Input                                                    │
│     └── Обработка ввода (WASD, mouse)                        │
│                                                              │
│  2. physics.world.update(time, delta)                        │
│     ├── Обновление body.position по velocity                 │
│     ├── Проверка коллизий                                    │
│     ├── Выталкивание (collider)                              │
│     └── Вызов callbacks (overlap)                            │
│                                                              │
│  3. scene.update(time, delta)                                │
│     ├── Чтение позиции из sprite.x/y (после физики)          │
│     ├── Синхронизация данных (npc.x = sprite.x)              │
│     ├── AI логика (использует sprite.x/y)                    │
│     └── Обновление визуала                                   │
│                                                              │
│  4. Render                                                   │
│     └── Отрисовка спрайтов                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

# 🔬 Теоретические изыскания

## 📐 Математическая модель Arcade Physics

### Уравнения движения

Arcade Physics использует упрощённую модель Ньютона:

```
position(t+Δt) = position(t) + velocity(t) × Δt
velocity(t+Δt) = velocity(t) + acceleration(t) × Δt

С учётом drag:
velocity(t+Δt) = velocity(t) × (1 - drag) + acceleration × Δt
```

### Применение к проекту

```typescript
/**
 * Расширенный контроллер движения для культиватора
 * 
 * Учитывает:
 * - Базовую скорость (от cultivationLevel)
 * - Ускорение (от техники)
 * - Сопротивление (от местности/qiDensity)
 */
class CultivatorMovementController {
  private body: Phaser.Physics.Arcade.Body;
  
  // Параметры движения
  private baseSpeed: number = 200;
  private acceleration: number = 800;  // Быстрый разгон
  private drag: number = 0.9;          // Быстрая остановка
  
  configure(body: Phaser.Physics.Arcade.Body, cultivationLevel: number): void {
    this.body = body;
    
    // Скорость растёт с уровнем культивации
    this.baseSpeed = 200 + cultivationLevel * 20;
    
    // Настройка физического тела
    body.setDrag(this.drag * 1000, this.drag * 1000);
    body.setMaxVelocity(this.baseSpeed, this.baseSpeed);
  }
  
  /**
   * Плавное ускорение к цели
   */
  accelerateToward(targetX: number, targetY: number): void {
    const dx = targetX - this.body.position.x;
    const dy = targetY - this.body.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 10) {
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Acceleration обеспечивает плавное движение
      this.body.setAcceleration(nx * this.acceleration, ny * this.acceleration);
    } else {
      this.body.setAcceleration(0, 0);
      this.body.setVelocity(0, 0);
    }
  }
}
```

---

## 🎯 Расширенные возможности физики

### 1. Acceleration + Drag (Плавное движение)

```typescript
/**
 * Плавное движение с инерцией
 * 
 * Преимущества:
 * - Естественное замедление
 * - Нет резких остановок
 * - Подходит для "парения" культиваторов
 */
class FloatingMovement {
  apply(body: Phaser.Physics.Arcade.Body, direction: { x: number; y: number }): void {
    // Ускорение в направлении
    body.setAcceleration(
      direction.x * 600,
      direction.y * 600
    );
    
    // Drag обеспечивает плавное замедление
    body.setDrag(0.92);
  }
}
```

### 2. Bounce (Отскок)

```typescript
/**
 * Отскок для техник "отражения удара"
 */
class BounceTechnique {
  applyReflection(target: NPCSprite, source: { x: number; y: number }): void {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Нормализуем и применяем отскок
    const nx = dx / distance;
    const ny = dy / distance;
    
    target.body.setBounce(1.5, 1.5);  // Усиленный отскок
    target.setVelocity(nx * 300, ny * 300);
    
    // Через секунду восстанавливаем
    target.scene.time.delayedCall(1000, () => {
      target.body.setBounce(0.2, 0.2);
    });
  }
}
```

### 3. Mass (Масса для "тяжёлых" атак)

```typescript
/**
 * Масса влияет на отталкивание при коллизии
 * 
 * Формула:
 * pushForce = (massA / (massA + massB)) × relativeVelocity
 */
class MassBasedCombat {
  // "Тяжёлый" удар — больше масса = меньше отдача
  applyHeavyStrike(attacker: NPCSprite, target: NPCSprite): void {
    attacker.body.setMass(10);  // Большая масса
    target.body.setMass(1);     // Малая масса
    
    // При коллизии attacker почти не сдвинется, target отлетит
  }
}
```

### 4. Angular Velocity (Вращение)

```typescript
/**
 * Вращение для техник "вихрь"
 */
class SpinTechnique {
  private sprite: NPCSprite;
  
  activate(): void {
    // Вращение тела (визуальный эффект)
    this.sprite.setAngularVelocity(360);  // градусов/сек
    
    // Можно использовать для зоны урона
    this.sprite.scene.time.addEvent({
      delay: 100,
      callback: () => this.damageNearby(),
      repeat: 10,
    });
  }
}
```

---

## 🧪 Сенсоры и триггеры

### Проблема Arcade Physics

Arcade Physics **не имеет встроенных сенсоров** (как Matter.js). Но их можно эмулировать:

```typescript
/**
 * Эмуляция сенсора через overlap
 * 
 * Сенсор = невидимый объект с overlap检测
 */
class ProximitySensor {
  private sensor: Phaser.Physics.Arcade.Sprite;
  private targets: Phaser.Physics.Arcade.Group;
  
  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    radius: number,
    onEnter: (target: Phaser.GameObjects.Sprite) => void,
    onExit: (target: Phaser.GameObjects.Sprite) => void
  ) {
    // Невидимый сенсор
    this.sensor = scene.physics.add.sprite(x, y, '__DEFAULT');
    this.sensor.setVisible(false);
    this.sensor.setAlpha(0);
    
    const body = this.sensor.body as Phaser.Physics.Arcade.Body;
    body.setCircle(radius, 16 - radius, 16 - radius);
    body.setImmovable(true);
    
    // Отслеживание входа/выхода
    const inside = new Set<Phaser.GameObjects.Sprite>();
    
    scene.physics.add.overlap(this.sensor, this.targets, (sensor, target) => {
      const t = target as Phaser.GameObjects.Sprite;
      if (!inside.has(t)) {
        inside.add(t);
        onEnter(t);
      }
    });
    
    // Проверка выхода (в update)
    scene.events.on('update', () => {
      for (const t of inside) {
        const dist = Phaser.Math.Distance.Between(
          this.sensor.x, this.sensor.y, t.x, t.y
        );
        if (dist > radius) {
          inside.delete(t);
          onExit(t);
        }
      }
    });
  }
}
```

### Применение для AI

```typescript
/**
 * AI триггеры через сенсоры
 */
class NPCAIWithSensors {
  private aggroSensor: ProximitySensor;
  private attackSensor: ProximitySensor;
  
  setupSensors(npc: NPCSprite): void {
    // Зона агрессии (200px)
    this.aggroSensor = new ProximitySensor(
      npc.scene, npc.x, npc.y, 200,
      (target) => this.onPlayerEnterAggro(target),
      (target) => this.onPlayerExitAggro(target)
    );
    
    // Зона атаки (60px)
    this.attackSensor = new ProximitySensor(
      npc.scene, npc.x, npc.y, 60,
      (target) => this.onPlayerEnterAttackRange(target),
      (target) => this.onPlayerExitAttackRange(target)
    );
  }
}
```

---

## 🌊 Интеграция с Qi System

### Qi Density как сопротивление движению

```typescript
/**
 * Влияние Qi Density на движение
 * 
 * Высокая Qi Density = медленнее движение, но быстрее восстановление
 * Низкая Qi Density = быстрее движение, но медленнее восстановление
 */
class QiMovementModifier {
  private baseDrag: number = 0.92;
  
  applyQiInfluence(
    body: Phaser.Physics.Arcade.Body,
    qiDensity: number  // 0.0 - 2.0
  ): void {
    // Qi Density влияет на drag (сопротивление)
    const modifiedDrag = this.baseDrag - (qiDensity - 1) * 0.1;
    body.setDrag(
      Phaser.Math.Clamp(modifiedDrag, 0.8, 0.98) * 1000,
      Phaser.Math.Clamp(modifiedDrag, 0.8, 0.98) * 1000
    );
    
    // Также влияет на maxVelocity
    const baseMaxVelocity = 200;
    const velocityModifier = 1 - (qiDensity - 1) * 0.2;
    body.setMaxVelocity(
      baseMaxVelocity * Phaser.Math.Clamp(velocityModifier, 0.5, 1.5),
      baseMaxVelocity * Phaser.Math.Clamp(velocityModifier, 0.5, 1.5)
    );
  }
}
```

---

## 🗺️ Структуры данных и физика

### Связка Location ↔ Physics

```
┌─────────────────────────────────────────────────────────────────┐
│                  Архитектура данных проекта                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐         ┌─────────────────┐                   │
│  │  Location   │────────▶│  LocationScene  │                   │
│  │  (Prisma)   │         │  (Phaser)       │                   │
│  │             │         │                 │                   │
│  │  - qiDensity│────────▶│  Physics.World  │                   │
│  │  - terrain  │         │  - drag         │                   │
│  │  - bounds   │────────▶│  - bounds       │                   │
│  └─────────────┘         └─────────────────┘                   │
│                                   │                             │
│                                   ▼                             │
│  ┌─────────────┐         ┌─────────────────┐                   │
│  │  NPC        │────────▶│  NPCSprite      │                   │
│  │  (Prisma)   │         │  (Physics)      │                   │
│  │             │         │                 │                   │
│  │  - hp       │◀───────│  - body         │                   │
│  │  - position │◀───────│  - x, y         │ ← ИСТИНА          │
│  │  - state    │◀───────│  - velocity     │                   │
│  └─────────────┘         └─────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Паттерн синхронизации

```typescript
/**
 * Синхронизация Prisma ↔ Phaser
 * 
 * Правило: Phaser → Prisma (однонаправленный поток)
 */
class PhysicsDataSynchronizer {
  private npcPhysicsSprites: Map<string, NPCSprite>;
  private npcData: Map<string, LocationNPC>;
  
  /**
   * Синхронизация в конце кадра
   * Вызывается после physics.world.update()
   */
  syncToData(): void {
    for (const [id, sprite] of this.npcPhysicsSprites) {
      const data = this.npcData.get(id);
      if (data) {
        // Читаем из физики → записываем в данные
        data.x = sprite.x;
        data.y = sprite.y;
        
        // Дополнительные данные
        data.hp = sprite.hp;
        // data.state = sprite.aiState;
      }
    }
  }
  
  /**
   * Сохранение в БД (при необходимости)
   */
  async persistToDatabase(): Promise<void> {
    for (const [id, data] of this.npcData) {
      await prisma.nPC.update({
        where: { id },
        data: {
          x: data.x,
          y: data.y,
          hp: data.hp,
        },
      });
    }
  }
}
```

---

# 🔗 Стыковка с проектом

## 📋 Текущая архитектура

### Проблемные места (ДО исправлений)

```
┌────────────────────────────────────────────────────────────────┐
│                    ДО исправлений                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  LocationNPC.x/y          NPCSprite.x/y                        │
│       ↓                         ↓                              │
│  [AI логика]              [Физика/Коллизии]                    │
│       ↓                         ↓                              │
│  handleNPCAttack()        onProjectileHit()                    │
│       ↓                         ↓                              │
│  npc.x += speed           sprite.setPosition(npc.x, npc.y)     │
│                                                                │
│  ⚠️ РАССИНХРОНИЗАЦИЯ! Два источника позиции!                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### После исправлений

```
┌────────────────────────────────────────────────────────────────┐
│                    ПОСЛЕ исправлений                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  NPCSprite.x/y  ←──── ЕДИНСТВЕННЫЙ ИСТОЧНИК                    │
│       │                                                        │
│       ├──▶ [Физика/Коллизии]                                   │
│       │         ↓                                              │
│       │    onProjectileHit()                                   │
│       │                                                        │
│       ├──▶ [AI логика]                                         │
│       │         ↓                                              │
│       │    handleNPCAttack() читает sprite.x/y                 │
│       │                                                        │
│       └──▶ [Данные]                                            │
│                 ↓                                              │
│            npc.x = sprite.x (синхронизация)                    │
│                                                                │
│  ✅ ОДИН источник позиции — физика!                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Интеграция с существующими системами

### 1. Combat System

```typescript
/**
 * Интеграция боевой системы с физикой
 */
class CombatPhysicsIntegration {
  /**
   * Расчёт урона с учётом скорости
   * 
   * momentum = mass × velocity
   * damageBonus = momentum × momentumMultiplier
   */
  calculateMomentumDamage(
    attacker: NPCSprite,
    baseDamage: number
  ): number {
    const body = attacker.body as Phaser.Physics.Arcade.Body;
    
    // Скорость в момент удара
    const speed = Math.sqrt(
      body.velocity.x ** 2 + body.velocity.y ** 2
    );
    
    // Масса атакующего
    const mass = body.mass;
    
    // Бонус от импульса
    const momentumBonus = (mass * speed) / 1000;
    
    return baseDamage * (1 + momentumBonus);
  }
}
```

### 2. AI System

```typescript
/**
 * AI на основе физики
 */
class PhysicsBasedAI {
  private npc: NPCSprite;
  
  /**
   * Преследование через физику
   */
  chaseTarget(targetX: number, targetY: number): void {
    // Используем acceleration для плавного поворота
    const dx = targetX - this.npc.x;
    const dy = targetY - this.npc.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 50) {
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Ускорение в направлении цели
      this.npc.body.setAcceleration(nx * 400, ny * 400);
    } else {
      // В зоне атаки — остановка
      this.npc.body.setAcceleration(0, 0);
      this.npc.body.setVelocity(0, 0);
    }
  }
  
  /**
   * Уклонение через импульс
   */
  dodgeAwayFrom(sourceX: number, sourceY: number): void {
    const dx = this.npc.x - sourceX;
    const dy = this.npc.y - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      // Резкий импульс в противоположную сторону
      this.npc.body.velocity.x += (dx / distance) * 300;
      this.npc.body.velocity.y += (dy / distance) * 300;
    }
  }
}
```

### 3. Technique System

```typescript
/**
 * Техники культивации через физику
 */
interface TechniquePhysicsConfig {
  // Движение
  velocityMultiplier: number;
  accelerationBoost: number;
  
  // Коллизии
  pushForce: number;
  bounceOnHit: number;
  
  // Эффекты
  dragModifier: number;
  massModifier: number;
}

class TechniquePhysicsApplier {
  applyTechnique(target: NPCSprite, config: TechniquePhysicsConfig): void {
    const body = target.body as Phaser.Physics.Arcade.Body;
    
    // Применяем модификаторы
    if (config.dragModifier !== 1) {
      body.setDrag(body.drag.x * config.dragModifier);
    }
    
    if (config.massModifier !== 1) {
      body.setMass(body.mass * config.massModifier);
    }
    
    if (config.accelerationBoost > 0) {
      // Увеличиваем ускорение для этой техники
      body.maxAcceleration.x *= config.accelerationBoost;
      body.maxAcceleration.y *= config.accelerationBoost;
    }
  }
  
  /**
   * Пример: Техника "Стремительный шаг"
   */
  applySwiftStep(cultivator: NPCSprite): void {
    this.applyTechnique(cultivator, {
      velocityMultiplier: 2.0,
      accelerationBoost: 1.5,
      pushForce: 0,
      bounceOnHit: 0,
      dragModifier: 0.5,  // Меньше сопротивление
      massModifier: 0.5,  // "Легче"
    });
  }
  
  /**
   * Пример: Техника "Неизменная гора"
   */
  applyMountainStance(cultivator: NPCSprite): void {
    this.applyTechnique(cultivator, {
      velocityMultiplier: 0.5,
      accelerationBoost: 0,
      pushForce: 0,
      bounceOnHit: 0,
      dragModifier: 2.0,  // Больше сопротивление
      massModifier: 3.0,  // "Тяжелее"
    });
  }
}
```

---

## 📊 Оптимизации

### 1. Sleep для неактивных NPC

```typescript
/**
 * Отключение физики для далёких NPC
 */
class PhysicsSleepManager {
  private activeRadius: number = 500;
  private playerX: number = 0;
  private playerY: number = 0;
  
  updateSleepState(npcs: NPCSprite[]): void {
    for (const npc of npcs) {
      const dist = Phaser.Math.Distance.Between(
        this.playerX, this.playerY, npc.x, npc.y
      );
      
      if (dist > this.activeRadius) {
        // За пределами радиуса — "спим"
        npc.body.setEnable(false);
        npc.setVelocity(0, 0);
      } else {
        // В радиусе — активны
        npc.body.setEnable(true);
      }
    }
  }
}
```

### 2. Object Pooling для снарядов

```typescript
/**
 * Пул снарядов для частых атак
 */
class ProjectilePool {
  private pool: TechniqueProjectile[] = [];
  private active: Set<TechniqueProjectile> = new Set();
  
  spawn(config: ProjectileConfig): TechniqueProjectile {
    let projectile = this.pool.pop();
    
    if (!projectile) {
      projectile = new TechniqueProjectile(this.scene, config);
    } else {
      projectile.reset(config);
    }
    
    this.active.add(projectile);
    return projectile;
  }
  
  despawn(projectile: TechniqueProjectile): void {
    this.active.delete(projectile);
    projectile.setActive(false);
    projectile.setVisible(false);
    this.pool.push(projectile);
  }
}
```

### 3. Spatial Hash для коллизий

```typescript
/**
 * Пространственное разбиение для оптимизации коллизий
 * 
 * Вместо проверки всех пар объектов,
 * проверяем только соседние ячейки
 */
class SpatialHash {
  private cellSize: number = 64;
  private cells: Map<string, Set<NPCSprite>> = new Map();
  
  private getKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }
  
  insert(npc: NPCSprite): void {
    const key = this.getKey(npc.x, npc.y);
    if (!this.cells.has(key)) {
      this.cells.set(key, new Set());
    }
    this.cells.get(key)!.add(npc);
  }
  
  getNearby(x: number, y: number, radius: number): NPCSprite[] {
    const result: NPCSprite[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const cell = this.cells.get(key);
        if (cell) {
          result.push(...cell);
        }
      }
    }
    
    return result;
  }
}
```

---

## 🚀 Рекомендации по развитию

### Краткосрочные (выполнено)

- [x] Единый источник позиции (NPCSprite)
- [x] Правильный setCircle() offset
- [x] setVelocity вместо setPosition
- [x] Ручная проверка для лучей

### Среднесрочные

- [ ] Добавить acceleration/drag для плавного движения
- [ ] Реализовать сенсоры для AI триггеров
- [ ] Интегрировать Qi Density в физику
- [ ] Object pooling для снарядов

### Долгосрочные

- [ ] Spatial hash для оптимизации
- [ ] Sleep manager для далёких NPC
- [ ] Техники с физическими эффектами (mass, bounce)
- [ ] Momentum-based combat damage

---

## 📚 Полезные ссылки

- [Phaser 3 Arcade Physics API](https://docs.phaser.io/api-documentation/namespace/Physics-Arcade)
- [Phaser 3 Physics Body](https://docs.phaser.io/api-documentation/class-Physics-Arcade-Body)
- [Phaser 3 Physics Group](https://docs.phaser.io/api-documentation/class-Physics-Arcade-Group)
- [Phaser 3 Examples - Physics](https://phaser.io/examples/v3/category/physics)

---

*Документ создан: 2026-03-18*
*Версия: 2.0*
*Статус: Расширен теоретическими изысканиями*
