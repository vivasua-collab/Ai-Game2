# 🎯 Checkpoint: Система Боя NPC - TechniqueProjectile Integration

**Версия:** 4.0
**Дата:** 2026-03-16
**Статус:** ✅ Этапы 1-3 Реализованы
**Приоритет:** Высокий
**Зависимости:** `checkpoint_03_16_colision.md` (завершено)
**Аудит завершён:** 2026-03-16
**Реализация:** 2026-03-16 (commit 7da65c1)

---

## 📋 Обзор

План внедрения боевой системы с использованием `TechniqueProjectile` в `LocationScene.ts`. Основан на:
- **Фаза 2 из NPC_COMBAT_INTERACTIONS.md** — Система нанесения и получения урона
- **TechniqueProjectile** — Снаряды, лучи, AOE (уже создан)
- **NPCSprite/NPCGroup** — Физика NPC (уже реализовано)
- **Event Bus** — Синхронизация с сервером

---

## 🔍 Текущее Состояние

### ✅ Уже Реализовано (из checkpoint_03_16_colision.md)

| Компонент | Файл | Статус |
|-----------|------|--------|
| NPCSprite с физикой | `src/game/objects/NPCSprite.ts` | ✅ 506 строк |
| NPCGroup | `src/game/groups/NPCGroup.ts` | ✅ 390 строк |
| TechniqueProjectile | `src/game/objects/TechniqueProjectile.ts` | ✅ 495 строк |
| Arcade Physics | `LocationScene.ts` | ✅ Интегрировано |
| AI States | `LocationScene.ts` | ✅ idle/patrol/chase/attack/flee |

### ✅ Найдено в Аудите (уже реализовано!)

| Компонент | Файл | Статус | Что использовать |
|-----------|------|--------|------------------|
| **Расчёт урона техники** | `combat-system.ts` | ✅ 1258 строк | `calculateTechniqueDamageFull()` |
| **Урон по дистанции** | `combat-system.ts` | ✅ | `calculateDamageAtDistance()` |
| **Проверка уклонения** | `combat-system.ts` | ✅ | `checkDodge()` |
| **Зоны урона** | `combat-system.ts` | ✅ | `getEffectiveRange()` → fullDamage, halfDamage, max |
| **Проверка попадания** | `combat-utils.ts` | ✅ 144 строки | `checkAttackHit()` |
| **Линейное затухание** | `combat-utils.ts` | ✅ | `calculateLinearDamageFalloff()` |
| **Рукопашный бой** | `hand-combat.ts` | ✅ 151 строка | `calculateHandAttack()`, `canAttack()` |
| **Event Bus Client** | `event-bus/client.ts` | ✅ 401 строка | `useTechnique()`, `reportDamageDealt()` |
| **Combat Handler** | `event-bus/handlers/combat.ts` | ✅ 772 строки | `handleTechniqueUse()`, `handleDamageDealt()` |
| **TempNPC Combat** | `skeleton/temp-npc-combat.ts` | ✅ | `handleTempNPCCombat()` |
| **Truth System** | `truth-system.ts` | ✅ 1112 строк | `spendQi()`, `addQi()`, `getSessionState()` |
| **Цвета элементов** | `combat-utils.ts` | ✅ | `getElementColor()` |
| **Qi Density** | `combat-system.ts` | ✅ | `calculateQiDensity()` = 2^(level-1) |
| **Структурная ёмкость** | `combat-system.ts` | ✅ | `calculateTechniqueCapacity()` |
| **Дестабилизация** | `combat-system.ts` | ✅ | `checkDestabilization()` |
| **Время каста** | `combat-system.ts` | ✅ | `calculateCastTime()` |
| **Блок/Щит/Уклонение** | `combat-system.ts` | ✅ | `calculateBlockResult()`, `calculateShieldResult()`, `calculateDodgeResult()` |

### ❌ Требует Реализации

| Компонент | Описание | Приоритет | Файлы для изменения | Статус |
|-----------|----------|-----------|---------------------|--------|
| **ProjectileManager** | Менеджер снарядов (новый файл) | P0 | `src/game/services/ProjectileManager.ts` | ✅ Создан |
| Интеграция TechniqueProjectile | Вызов из performAttack() | P0 | `src/game/scenes/LocationScene.ts` | ✅ Интегрирован |
| Система техник игрока | Выбор активной техники (слоты 1-4) | P0 | `LocationScene.ts`, `API route` | ⏳ TODO |
| **reportDamageReceived** | Event Bus client method | P1 | `src/lib/game/event-bus/client.ts` | ✅ Добавлен |
| **reportPlayerDeath** | Event Bus client method | P1 | `src/lib/game/event-bus/client.ts` | ✅ Добавлен |
| **reportPlayerRespawn** | Event Bus client method | P2 | `src/lib/game/event-bus/client.ts` | ✅ Добавлен |
| **calculateDamageFromNPC** | Функция расчёта урона NPC→Player | P1 | `src/lib/game/npc-damage-calculator.ts` | ✅ Создан |
| HP бар игрока | Визуализация | P1 | `LocationScene.ts` - createUI() | ✅ Добавлен |
| Смерть игрока | Респаун система | P2 | `LocationScene.ts`, handler | ✅ Реализована |

### 📊 Итоговые оценки времени

| Этап | Описание | Время | Статус |
|------|----------|-------|--------|
| Аудит | Проверка существующего кода | 2 часа | ✅ Завершён |
| Этап 1 | ProjectileManager + интеграция | 1 день | ✅ Завершён |
| Этап 2 | Урон NPC→Player | 1 день | ✅ Завершён |
| Этап 3 | Event Bus коннекторы | 0.5 дня | ✅ Завершён |
| Этап 4 | UI элементы | 0.5 дня | ✅ Завершён |
| **Итого** | | **3 дня** | ✅ Выполнено |

---

## 📋 Результаты Аудита

### Архитектура "Математика на сервере"

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ДВИГАТЬ (Phaser) - Только визуал                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Отправляет на сервер:                                              │
│  ├─ targetId: ID цели                                               │
│  ├─ techniqueId: ID техники                                         │
│  ├─ targetPosition: {x, y}                                          │
│  ├─ distance: число (пиксели → метры / 32)                         │
│  ├─ rotation: угол в градусах                                       │
│  └─ damageMultiplier: множитель от zones (1.0 / 0.5 / 0.25)        │
│                                                                      │
│  Получает от сервера:                                               │
│  ├─ damage: итоговый урон (число)                                   │
│  ├─ newHealth: новое HP цели                                        │
│  ├─ isDead: умерла ли цель                                         │
│  └─ commands: визуальные команды                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    СЕРВЕР (Event Bus Handler)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  combat.ts handler:                                                 │
│  ├─ handleTechniqueUse() → списывает Qi, возвращает damage          │
│  ├─ handleDamageDealt() → расчёт урона с учётом:                    │
│  │   ├─ qiDensity = 2^(cultivationLevel - 1)                       │
│  │   ├─ statMultiplier (STR/AGI/INT)                               │
│  │   ├─ masteryMultiplier (до +30%)                                │
│  │   ├─ levelEfficiency (+5% за уровень)                           │
│  │   ├─ rarityMult (0.8-1.6)                                       │
│  │   └─ rangeMultiplier (1.0/0.5/0)                                │
│  └─ handleTempNPCDamageEvent() → для TempNPC                       │
│                                                                      │
│  truth-system.ts:                                                   │
│  ├─ spendQi(sessionId, amount) → списание Qi                       │
│  ├─ addQi(sessionId, amount) → добавление Qi                       │
│  └─ getSessionState(sessionId) → текущее состояние                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Event Bus - Реализованные коннекторы

| Событие | Файл | Статус | Данные |
|---------|------|--------|--------|
| `technique:use` | combat.ts:137-401 | ✅ | techniqueId, position |
| `combat:damage_dealt` | combat.ts:410-552 | ✅ | targetId, targetType, techniqueId, distance, rotation, damageMultiplier |
| `technique:charge_start` | combat.ts:556-566 | ✅ | techniqueId |
| `technique:charge_cancel` | combat.ts:568-578 | ✅ | - |
| `inventory:use_item` | inventory.ts | ✅ | itemId, quantity |
| `inventory:equip_item` | inventory.ts | ✅ | itemId, slotId |
| `environment:interact` | environment.ts | ✅ | objectId, objectType, action |
| `player:move` | movement.ts | ✅ | tilesMoved |

### ❌ Event Bus - Требует реализации

| Событие | Описание | Приоритет | Где использовать | Статус |
|---------|----------|-----------|------------------|--------|
| `combat:damage_received` | Игрок получил урон от NPC | P1 | playerTakeDamage() | ✅ Реализовано |
| `player:death` | Смерть игрока | P1 | handlePlayerDeath() | ✅ Реализовано |
| `player:respawn` | Респаун игрока | P2 | respawnPlayer() | ✅ Реализовано |
| `npc:attack` | NPC атакует игрока | P1 | NPC AI attack state | ✅ Реализовано |

### 📍 Расчёт дистанции - Проверка реализации

**✅ Дистанция реализована корректно:**

| Место | Функция | Единицы | Примечание |
|-------|---------|---------|------------|
| TechniqueProjectile.hit() | `Math.sqrt(dx*dx + dy*dy)` | пиксели | Расчёт дистанции до цели |
| checkAttackHit() | `distance` параметр | пиксели | Проверка зон урона |
| combat.ts handler | `distance / METERS_TO_PIXELS` | метры | Конвертация на сервере |
| calculateDamageAtDistance() | `distance` параметр | метры | Расчёт falloff |

**Константа конвертации:**
```typescript
// combat.ts:34
const METERS_TO_PIXELS = 32;  // 1 метр = 32 пикселя
```

**Данные отправляемые на сервер (combat.ts:454-455):**
```typescript
const distanceInMeters = distance / METERS_TO_PIXELS;
// distance - в пикселях от движка
// distanceInMeters - отправляется на сервер
```

### Формула урона (уже реализовано!)

```typescript
// combat-system.ts:861-923 - calculateTechniqueDamageFull()

damage = effectiveQi × qiDensity × statMultiplier × masteryMultiplier × levelBonus

где:
- effectiveQi = qiInput × efficiency (после checkDestabilization)
- qiDensity = 2^(cultivationLevel - 1)
- statMultiplier = 1 + (statBonus × coeff)
- masteryMultiplier = 1 + (mastery/100) × 0.3
- levelBonus = 1 + (techniqueLevel - 1) × 0.05
```

### Зоны урона (уже реализовано!)

```typescript
// combat-utils.ts:68-127 - checkAttackHit()

if (distance <= fullDamageRange) → damageMultiplier = 1.0 (full)
else if (distance <= halfDamageRange) → damageMultiplier = 0.5 (half)
else if (distance <= maxRange) → damageMultiplier = 0.5 × (1 - falloff) (falloff)
else → hit = false (none)
```

---

## 🏗️ Архитектура Боевой Системы

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LOCATION SCENE (Phaser)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  1. ИГРОК АТАКУЕТ                                            │   │
│  │     ├─ performAttack() → создаёт TechniqueProjectile         │   │
│  │     ├─ TechniqueProjectile.hit() → расчёт урона              │   │
│  │     └─ NPCSprite.takeDamage() → применение урона             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  2. NPC АТАКУЕТ                                              │   │
│  │     ├─ AI: attack state → выбор техники                      │   │
│  │     ├─ calculateDamageFromNPC() → расчёт урона               │   │
│  │     └─ player.takeDamage() → применение урона                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  3. EVENT BUS (синхронизация)                                │   │
│  │     ├─ combat:damage { attackerId, targetId, damage }        │   │
│  │     ├─ combat:death { targetId, killerId }                   │   │
│  │     └─ combat:respawn { playerId, locationId }               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📐 План Внедрения

### Этап 1: Интеграция TechniqueProjectile (1 день)

**Цель:** Заменить текущую конусную атаку на систему техник с снарядами.

#### 1.1 Создать ProjectileManager

```typescript
// src/game/services/ProjectileManager.ts

import { TechniqueProjectile, createProjectileGroup, type ProjectileConfig } from '../objects/TechniqueProjectile';
import { NPCGroup } from '../groups/NPCGroup';
import type { CombatSubtype } from '@/lib/game/techniques';

export class ProjectileManager {
  private scene: Phaser.Scene;
  private projectileGroup: Phaser.Physics.Arcade.Group;
  private npcGroup: NPCGroup;
  private playerProjectiles: TechniqueProjectile[] = [];
  
  constructor(scene: Phaser.Scene, npcGroup: NPCGroup) {
    this.scene = scene;
    this.npcGroup = npcGroup;
    this.projectileGroup = createProjectileGroup(scene);
    
    // Настраиваем коллизию снарядов с NPC
    this.setupCollision();
  }
  
  private setupCollision(): void {
    this.npcGroup.setProjectileCollision(
      this.projectileGroup,
      (projectile, npc) => this.onProjectileHit(projectile, npc)
    );
  }
  
  private onProjectileHit(
    projectile: Phaser.Physics.Arcade.Sprite,
    npc: NPCSprite
  ): void {
    const proj = projectile as TechniqueProjectile;
    const hitResult = proj.hit(npc);
    
    if (hitResult) {
      // Применяем урон
      npc.takeDamage(hitResult.damage, proj.element);
      
      // Визуальный эффект
      this.showHitEffect(npc.x, npc.y, proj.element);
      
      // Отправляем событие на сервер
      eventBusClient.reportDamageDealt(
        npc.npcId,
        'npc',
        proj.techniqueId,
        { x: npc.x, y: npc.y },
        hitResult.distance,
        0,
        hitResult.damageZone === 'full' ? 1.0 : 
          hitResult.damageZone === 'half' ? 0.5 : 0.25
      );
    }
  }
  
  /**
   * Создать снаряд техники
   */
  fire(config: ProjectileConfig): TechniqueProjectile {
    const projectile = new TechniqueProjectile(this.scene, config);
    this.projectileGroup.add(projectile);
    this.playerProjectiles.push(projectile);
    
    // Автоудаление через время жизни
    projectile.once('destroy', () => {
      const idx = this.playerProjectiles.indexOf(projectile);
      if (idx >= 0) this.playerProjectiles.splice(idx, 1);
    });
    
    return projectile;
  }
  
  /**
   * Создать снаряд от игрока к точке
   */
  fireFromPlayer(
    playerX: number,
    playerY: number,
    targetX: number,
    targetY: number,
    technique: { id: string; damage: number; subtype: CombatSubtype; element: string }
  ): TechniqueProjectile {
    const dx = targetX - playerX;
    const dy = targetY - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return this.fire({
      techniqueId: technique.id,
      ownerId: 'player',
      x: playerX,
      y: playerY,
      targetX,
      targetY,
      velocityX: dx / distance,
      velocityY: dy / distance,
      damage: technique.damage,
      subtype: technique.subtype,
      element: technique.element,
    });
  }
  
  private showHitEffect(x: number, y: number, element: string): void {
    // TODO: Визуальный эффект попадания
  }
  
  update(delta: number): void {
    for (const proj of this.playerProjectiles) {
      proj.update(delta);
    }
  }
}
```

#### 1.2 Изменить LocationScene.ts

```typescript
// === Добавить в LocationScene.ts ===

import { ProjectileManager } from '../services/ProjectileManager';
import type { Technique } from '@/types/game';

// === Новые поля класса ===
private projectileManager!: ProjectileManager;
private equippedTechniques: Technique[] = [];
private activeTechniqueSlot: number = 0;  // 0-3
private playerHp: number = 100;
private playerMaxHp: number = 100;

// === В create() ===
this.projectileManager = new ProjectileManager(this, this.npcGroup);
await this.loadEquippedTechniques();

// === Новые методы ===

/**
 * Загрузить экипированные техники
 */
private async loadEquippedTechniques(): Promise<void> {
  try {
    const response = await fetch('/api/character/techniques?equipped=true');
    const data = await response.json();
    if (data.success && data.techniques) {
      this.equippedTechniques = data.techniques;
      console.log(`[LocationScene] Loaded ${data.techniques.length} techniques`);
    }
  } catch (error) {
    console.warn('[LocationScene] Failed to load techniques:', error);
  }
}

/**
 * Получить активную технику
 */
private getActiveTechnique(): Technique | null {
  return this.equippedTechniques[this.activeTechniqueSlot] || null;
}

/**
 * Обновлённый performAttack с техниками
 */
private performAttack(): void {
  const now = Date.now();
  const technique = this.getActiveTechnique();
  
  if (!technique) {
    // Базовая атака руками (существующий код)
    this.performHandAttack();
    return;
  }
  
  // Проверка cooldown техники
  // TODO: Добавить проверку qiCost
  
  // Определяем тип атаки по технике
  const subtype = technique.effects?.combatSubtype || 'ranged_projectile';
  
  // Создаём снаряд через ProjectileManager
  const worldPoint = this.cameras.main.getWorldPoint(
    this.input.activePointer.x,
    this.input.activePointer.y
  );
  
  this.projectileManager.fireFromPlayer(
    this.playerX,
    this.playerY,
    worldPoint.x,
    worldPoint.y,
    {
      id: technique.id,
      damage: this.calculateTechniqueDamage(technique),
      subtype: subtype as CombatSubtype,
      element: technique.element || 'neutral',
    }
  );
  
  // Эффект каста
  this.showCastEffect(technique);
}

/**
 * Расчёт урона техники
 */
private calculateTechniqueDamage(technique: Technique): number {
  // Используем combat-system.ts
  // TODO: Интегрировать calculateTechniqueDamageFull
  return technique.baseDamage || 10;
}

/**
 * Базовая атака руками (существующий код)
 */
private performHandAttack(): void {
  // ... существующий код из performAttack()
}
```

---

### Этап 2: Урон от NPC к игроку (1 день)

**Цель:** Реализовать систему урона от NPC с использованием формул из NPC_COMBAT_INTERACTIONS.md.

#### 2.1 Создать NPCDamageCalculator

```typescript
// src/lib/game/npc-damage-calculator.ts

import {
  calculateStatScalingByType,
  SCALING_COEFFICIENTS,
} from './combat-system';
import type { Technique, CombatTechniqueType } from '@/types/game';
import type { GeneratedNPC } from '@/lib/generator/npc-generator';

/**
 * Расчёт урона от NPC к игроку
 * 
 * @see docs/NPC_COMBAT_INTERACTIONS.md - Фаза 2.2
 */
export function calculateDamageFromNPC(params: {
  npc: {
    cultivationLevel: number;
    strength: number;
    agility: number;
    intelligence: number;
    conductivity: number;
  };
  technique: {
    combatType?: string;
    qiCost?: number;
    baseDamage?: number;
  } | null;
  qiSpent: number;
  target: {
    armor: number;
    conductivity: number;
    vitality: number;
    meridianBuffer: number;
  };
}): {
  damage: number;
  qiSpent: number;
  effectiveQi: number;
  qiDensity: number;
  statMultiplier: number;
} {
  const { npc, technique, qiSpent, target } = params;
  
  // 1. Качество Ци NPC (геометрический рост ×2)
  const qiDensity = Math.pow(2, npc.cultivationLevel - 1);
  
  // 2. Эффективное Ци (NPC не страдает от дестабилизации)
  const effectiveQi = qiSpent;
  
  // 3. Базовый эффект = ЦИ × Качество
  let effect = effectiveQi * qiDensity;
  
  // 4. Масштабирование от характеристик
  let statMultiplier = 1.0;
  if (technique?.combatType) {
    statMultiplier = calculateStatScalingByType(
      {
        strength: npc.strength,
        agility: npc.agility,
        intelligence: npc.intelligence,
        conductivity: npc.conductivity,
      } as any,
      technique.combatType as CombatTechniqueType
    );
  } else {
    // Базовая атака — масштабирование от силы
    statMultiplier = 1 + Math.max(0, npc.strength - 10) * 0.05;
  }
  effect *= statMultiplier;
  
  // 5. Мастерство NPC (базовое = 50)
  if (technique) {
    const mastery = 50;
    const masteryMultiplier = 1 + (mastery / 100) * 0.3;
    effect *= masteryMultiplier;
  }
  
  // 6. Проводимость NPC (бонус до +20%)
  const conductivityBonus = 1 + (npc.conductivity / 100) * 0.2;
  effect *= conductivityBonus;
  
  // 7. Поглощение бронёй игрока
  const armorReduction = target.armor * 0.5;
  let finalDamage = Math.max(1, effect - armorReduction);
  
  // 8. Буфер Ци игрока (до 30% урона)
  const buffered = Math.min(target.meridianBuffer, finalDamage * 0.3);
  finalDamage -= buffered;
  
  return {
    damage: Math.floor(finalDamage),
    qiSpent,
    effectiveQi,
    qiDensity,
    statMultiplier,
  };
}

/**
 * Расчёт Qi, которое NPC готов потратить
 */
export function calculateNPCQiSpent(
  npcCurrentQi: number,
  techniqueQiCost: number | undefined
): number {
  if (!techniqueQiCost) {
    // Базовая атака — 5-10% от текущего Qi
    return Math.floor(npcCurrentQi * 0.05);
  }
  return techniqueQiCost;
}
```

#### 2.2 Добавить урон игроку в LocationScene

```typescript
// === Добавить в LocationScene.ts ===

/**
 * Игрок получает урон от NPC
 */
private playerTakeDamage(
  npc: LocationNPC,
  damage: number,
  type: string = 'normal'
): void {
  this.playerHp = Math.max(0, this.playerHp - damage);
  
  // Визуальный эффект
  this.showDamageNumber(this.playerX, this.playerY, damage, type);
  
  // Flash эффект игрока
  this.tweens.add({
    targets: this.player,
    alpha: 0.5,
    duration: 100,
    yoyo: true,
    repeat: 2,
  });
  
  // Обновить UI HP бара
  this.updatePlayerHpBar();
  
  // Отправить событие на сервер
  eventBusClient.reportDamageReceived({
    sourceId: npc.id,
    damage,
    newHealth: this.playerHp,
    maxHealth: this.playerMaxHp,
  });
  
  // Проверка смерти
  if (this.playerHp <= 0) {
    this.handlePlayerDeath();
  }
}

/**
 * Обновить HP бар игрока
 */
private updatePlayerHpBar(): void {
  // TODO: Добавить HP бар в UI
  console.log(`[Player] HP: ${this.playerHp}/${this.playerMaxHp}`);
}

/**
 * Смерть игрока
 */
private handlePlayerDeath(): void {
  // Эффект смерти
  this.tweens.add({
    targets: this.player,
    alpha: 0,
    scale: 0.5,
    duration: 1000,
    onComplete: () => {
      // Показать диалог респауна
      this.showRespawnDialog();
    },
  });
  
  // Уведомить сервер
  eventBusClient.reportPlayerDeath({
    locationId: this.locationId,
    killerId: null, // или ID NPC если есть
  });
}

/**
 * Диалог респауна
 */
private showRespawnDialog(): void {
  // TODO: Показать UI диалог
  // Временно: автоматический респаун через 3 сек
  this.time.delayedCall(3000, () => {
    this.respawnPlayer();
  });
}

/**
 * Респаун игрока
 */
private respawnPlayer(): void {
  this.playerHp = this.playerMaxHp;
  this.playerX = WORLD_WIDTH / 2;
  this.playerY = WORLD_HEIGHT / 2;
  
  this.player.setPosition(this.playerX, this.playerY);
  this.player.setAlpha(1);
  this.player.setScale(1);
  
  // Уведомить сервер
  eventBusClient.reportPlayerRespawn({
    locationId: this.locationId,
  });
}
```

---

### Этап 3: Интеграция с Event Bus (0.5 дня)

**Цель:** Синхронизация боевых событий с сервером.

#### 3.1 Новые события в Event Bus

```typescript
// Добавить в src/lib/game/event-bus/client.ts

/**
 * Отчёт о нанесённом уроне
 */
async reportDamageDealt(
  targetId: string,
  targetType: 'npc' | 'training_target' | 'player',
  techniqueId: string,
  position: { x: number; y: number },
  distance: number,
  angle: number,
  damageMultiplier: number
): Promise<void> {
  // ... существующий код
}

/**
 * Отчёт о полученном уроне
 */
async reportDamageReceived(params: {
  sourceId: string;
  damage: number;
  newHealth: number;
  maxHealth: number;
}): Promise<void> {
  await this.emit('combat:damage_received', {
    sourceId: params.sourceId,
    damage: params.damage,
    newHealth: params.newHealth,
    maxHealth: params.maxHealth,
    timestamp: Date.now(),
  });
}

/**
 * Отчёт о смерти игрока
 */
async reportPlayerDeath(params: {
  locationId: string;
  killerId: string | null;
}): Promise<void> {
  await this.emit('player:death', {
    locationId: params.locationId,
    killerId: params.killerId,
    timestamp: Date.now(),
  });
}

/**
 * Отчёт о респауне игрока
 */
async reportPlayerRespawn(params: {
  locationId: string;
}): Promise<void> {
  await this.emit('player:respawn', {
    locationId: params.locationId,
    timestamp: Date.now(),
  });
}
```

---

### Этап 4: UI Элементы (0.5 дня)

**Цель:** Добавить HP бар игрока и индикатор активной техники.

#### 4.1 HP бар игрока

```typescript
// В createUI() добавить:

// HP Bar
const hpBarWidth = 200;
const hpBarHeight = 16;
const hpBarX = 110;
const hpBarY = this.cameras.main.height - 50;

const hpBarBg = this.add.graphics();
hpBarBg.setScrollFactor(0).setDepth(DEPTHS.ui);
hpBarBg.fillStyle(0x000000, 0.7);
hpBarBg.fillRoundedRect(hpBarX - hpBarWidth/2, hpBarY, hpBarWidth, hpBarHeight, 4);

this.playerHpBarFill = this.add.graphics();
this.playerHpBarFill.setScrollFactor(0).setDepth(DEPTHS.ui + 1);

const hpLabel = this.add.text(hpBarX, hpBarY + hpBarHeight + 5, 'HP', {
  fontSize: '10px',
  color: '#9ca3af',
}).setOrigin(0.5, 0);
hpLabel.setScrollFactor(0).setDepth(DEPTHS.ui);

// Техники (quick slots)
const slotsX = this.cameras.main.width - 120;
const slotsY = this.cameras.main.height - 50;

for (let i = 0; i < 4; i++) {
  const slotX = slotsX + i * 30;
  const slot = this.add.container(slotX, slotsY);
  slot.setScrollFactor(0).setDepth(DEPTHS.ui);
  
  const bg = this.add.rectangle(0, 0, 26, 26, 0x1e293b, 0.8);
  bg.setStrokeStyle(1, i === this.activeTechniqueSlot ? 0x4ade80 : 0x475569);
  slot.add(bg);
  
  const key = this.add.text(0, 0, (i + 1).toString(), {
    fontSize: '12px',
    color: '#9ca3af',
  }).setOrigin(0.5);
  slot.add(key);
}
```

---

## 🔺 Конусные Атаки (Cone Attacks)

### Анализ двух подходов

#### Подход 1: Расширение луча (Beam → Cone)

```
Обычный луч:
  *==================> (фиксированная ширина)

Конус (расширяющийся луч):
  *==================> 
    \              /
     \            /
      \          /
       ----------
       ↑ шире с расстоянием
       
Формула: width(distance) = baseWidth + distance × tan(spreadAngle/2)
```

**Плюсы:**
- Интуитивно понятно - "толстый луч"
- Простая визуализация - треугольник
- Линейное затухание уже есть в beam

**Минусы:**
- Сложнее попадание по нескольким целям
- Нет явного угла конуса

#### Подход 2: Сужение AOE (AOE → Sector)

```
AOE (полный круг):
      ***
     *****
    *******
     *****
      ***
      360°

Sector (конус):
      ***
     *****
    **
    *
    *
    ↑ 60° сектор
```

**Плюсы:**
- Явный угол сектора
- Легко рассчитывать попадания
- Уже есть radius, element, duration

**Минусы:**
- Нужно добавить параметры угла
- Визуал отличается от "выброса Ци"

### ✅ Рекомендуемое решение: Гибридный подход

**Создать новый тип `ranged_cone` как надстройку над AOE:**

```typescript
// Добавить в visual-commands.ts

/**
 * Команда: Показать конусную атаку
 */
export interface ShowConeCommand extends VisualCommandBase {
  type: 'visual:show_cone';
  data: {
    x: number;              // Начальная точка (игрок)
    y: number;
    direction: number;      // Направление в градусах (куда смотрит конус)
    angle: number;          // Угол конуса в градусах (30-120)
    range: number;          // Дальность в пикселях
    
    // Зоны урона (как в AOE)
    fullDamageRange: number;
    halfDamageRange: number;
    
    element?: DamageElement;
    duration?: number;
  };
}
```

### Почему этот подход оптимален

1. **Явная геометрия** - direction, angle, range чётко описывают конус
2. **Переиспользование AOE логики** - те же зоны урона
3. **checkAttackHit() уже поддерживает конус** - `coneAngle` параметр уже есть!
4. **Простая визуализация** - сектор круга через Graphics.arc()

### Геометрия конуса и расчёт урона

```
              *  ← NPC (попадание)
             /
    30°    /
   \      /
    \    /
     \  /
      \/  ← direction (направление)
      *    ← Игрок (x, y)
      |
      | distance
      ↓
      *-----*-----*
      ↑fullDamage│
            ↑halfDamage
                  ↑max
```

**Формула попадания:**

```typescript
// Уже реализовано в combat-utils.ts:68-127!
function checkAttackHit(
  playerX, playerY,         // Начало конуса
  playerRotation,           // direction
  targetX, targetY,         // Позиция цели
  coneAngle,                // angle (ширина конуса)
  fullDamageRange,          // Зона 100% урона
  halfDamageRange,          // Зона 50% урона
  maxRange,                 // Максимальная дальность
  targetHitboxRadius        // Радиус хитбокса цели
): HitResult
```

### Визуализация конуса

```typescript
// В TechniqueProjectile или LocationScene

function drawCone(
  graphics: Phaser.GameObjects.Graphics,
  x: number, y: number,
  direction: number,    // градусы
  angle: number,        // ширина конуса
  range: number,
  color: number
): void {
  const startAngle = Phaser.Math.DegToRad(direction - angle / 2);
  const endAngle = Phaser.Math.DegToRad(direction + angle / 2);
  
  graphics.clear();
  
  // Внешний контур
  graphics.lineStyle(2, color, 0.8);
  graphics.beginPath();
  graphics.moveTo(x, y);
  graphics.arc(x, y, range, startAngle, endAngle, false);
  graphics.closePath();
  graphics.strokePath();
  
  // Заливка
  graphics.fillStyle(color, 0.2);
  graphics.beginPath();
  graphics.moveTo(x, y);
  graphics.arc(x, y, range, startAngle, endAngle, false);
  graphics.closePath();
  graphics.fillPath();
  
  // Зоны урона (опционально)
  if (showDamageZones) {
    // Full damage zone
    graphics.lineStyle(1, color, 0.5);
    graphics.arc(x, y, fullDamageRange, startAngle, endAngle, false);
    
    // Half damage zone
    graphics.arc(x, y, halfDamageRange, startAngle, endAngle, false);
  }
}
```

### Примеры техник конусной атаки

| Техника | Угол | Дальность | Элемент | Описание |
|---------|------|-----------|---------|----------|
| **Выброс Ци** | 60° | 5м | neutral | Базовый конус Ци |
| **Огненное дыхание** | 45° | 8м | fire | Узкий, дальнобойный |
| **Взрыв Ци** | 120° | 3м | neutral | Широкий, короткий |
| **Молниеносный разряд** | 30° | 15м | lightning | Очень узкий, дальний |
| **Ледяная волна** | 90° | 6м | water | Широкая волна |

### Интеграция с TechniqueProjectile

```typescript
// Добавить в TechniqueProjectile.ts

case 'ranged_cone':
  this.setupCone(config, color);
  break;

private setupCone(config: ProjectileConfig, color: number): void {
  // Конус - статическая область на время duration
  this.aoeRadius = config.aoeRadius ?? 100;
  
  // Круглый хитбокс (для простоты, реальная проверка - по углу)
  const body = this.body as Phaser.Physics.Arcade.Body;
  body.setCircle(this.aoeRadius);
  body.setOffset(-this.aoeRadius, -this.aoeRadius);
  this.setVelocity(0, 0);
  
  // Визуализация конуса
  this.graphics = this.scene.add.graphics();
  this.graphics.setDepth(DEPTHS.effects);
  
  this.drawCone(
    this.graphics,
    0, 0,
    config.direction ?? 0,    // direction из config
    config.coneAngle ?? 60,    // угол конуса
    this.aoeRadius,
    color
  );
}

/**
 * Проверка попадания с учётом угла конуса
 */
hit(target: Phaser.GameObjects.Sprite): HitResult | null {
  const dx = target.x - this.x;
  const dy = target.y - this.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Проверка расстояния
  if (distance > this.aoeRadius) return null;
  
  // Проверка угла (используем checkAttackHit)
  const hitResult = checkAttackHit(
    this.x, this.y,
    this.direction,
    target.x, target.y,
    this.coneAngle,
    this.damageFalloff?.fullDamage ?? 0,
    this.damageFalloff?.halfDamage ?? 0,
    this.damageFalloff?.max ?? this.aoeRadius,
    0
  );
  
  if (!hitResult.hit) return null;
  
  // ... расчёт урона
}
```

### Типы техник (обновление)

```typescript
// Добавить в techniques.ts

type CombatSubtype = 
  | 'melee_strike'       // Удар телом
  | 'melee_weapon'       // Удар оружием
  | 'ranged_projectile'  // Снаряд
  | 'ranged_beam'        // Луч
  | 'ranged_aoe'         // Площадь
  | 'ranged_cone';       // ← НОВЫЙ: Конус

// В интерфейсе Technique
interface TechniqueEffects {
  // ... существующие поля
  
  // Для конусных атак
  coneAngle?: number;      // Угол конуса (30-120 градусов)
  coneRange?: number;      // Дальность конуса
}
```

### Анимация конуса

```
Кадр 1:          Кадр 2:         Кадр 3:         Кадр 4:
  *               *               *               *
   \               \               \               \
    \               \               \               \
     \               \               \               \
      ----           -----           ------          -------
      20%            40%             60%             100%
      
Анимация: расширяющийся сектор с затуханием
```

```typescript
// Анимация появления конуса
this.scene.tweens.add({
  targets: coneGraphics,
  scaleX: { from: 0.2, to: 1.0 },
  scaleY: { from: 0.2, to: 1.0 },
  alpha: { from: 0.8, to: 0.3 },
  duration: 200,
  ease: 'Power2',
  onComplete: () => {
    // Задержка перед исчезновением
    this.scene.time.delayedCall(duration - 200, () => {
      this.scene.tweens.add({
        targets: coneGraphics,
        alpha: 0,
        duration: 150,
        onComplete: () => coneGraphics.destroy()
      });
    });
  }
});
```

---

## ⚠️ Возможные Ошибки и Взаимодействия с Окружением

### 1. Коллизии со стенами и препятствиями

**Проблема:** Снаряд может пройти сквозь стену.

**Решение (реализовано частично):**
```typescript
// LocationScene.ts должен добавить:
private wallGroup!: Phaser.Physics.Arcade.StaticGroup;

// В create():
this.wallGroup = this.physics.add.staticGroup();
// Загрузка стен из карты...

// В ProjectileManager.setupCollision():
this.scene.physics.add.collider(
  this.projectileGroup,
  this.wallGroup,
  (projectile) => {
    // Снаряд попадает в стену
    (projectile as TechniqueProjectile).destroy();
  }
);
```

### 2. Коллизии снаряд-снаряд

**Проблема:** Два снаряда могут столкнуться.

**Решение:**
```typescript
// Обычно не нужно - снаряды проходят друг сквозь друга
// Но можно добавить для "перехвата":
this.scene.physics.add.overlap(
  this.playerProjectiles,
  this.enemyProjectiles,
  this.onProjectileCollision
);
```

### 3. Выход за границы мира

**Проблема:** Снаряд улетает за пределы карты.

**Решение (реализовано):**
```typescript
// TechniqueProjectile.update() уже проверяет lifetime
if (this.elapsed >= this.lifetime) {
  this.fadeOut();
}

// Дополнительно - bounds check:
if (this.x < 0 || this.x > WORLD_WIDTH || 
    this.y < 0 || this.y > WORLD_HEIGHT) {
  this.destroy();
}
```

### 4. Попадание по союзникам

**Проблема:** AOE может задеть дружественных NPC.

**Решение:**
```typescript
// В TechniqueProjectile.hit():
if (this.ownerId === 'player' && npc.disposition >= 0) {
  // Не наносим урон дружественным NPC
  return null;
}
```

### 5. Синхронизация с сервером

**Проблема:** Потеря пакета с уроном.

**Решение (частично):**
```typescript
// Event Bus уже отправляет:
eventBusClient.reportDamageDealt(...);

// Нужно добавить обработку ответа:
const response = await eventBusClient.reportDamageDealt(...);
if (!response.success) {
  // Откат урона на клиенте
  npc.hp += damage;
}
```

### 6. Перегрузка сцены

**Проблема:** Слишком много снарядов → падение FPS.

**Решение:**
```typescript
// Ограничение количества снарядов:
private MAX_PROJECTILES = 50;

fire(config: ProjectileConfig): TechniqueProjectile | null {
  if (this.playerProjectiles.length >= this.MAX_PROJECTILES) {
    // Уничтожаем самый старый
    this.playerProjectiles[0].destroy();
  }
  // ...
}
```

### 7. Деспаун NPC во время полёта снаряда

**Проблема:** Снаряд летит к NPC, который уже удалён.

**Решение:**
```typescript
// В TechniqueProjectile.hit():
const npc = this.scene.npcs.get(targetId);
if (!npc) {
  // NPC уже нет - уничтожаем снаряд
  this.destroy();
  return null;
}
```

---

## 📊 Итоговая Оценка Времени (после аудита)

| Этап | Было | Стало | Причина |
|------|------|-------|---------|
| Этап 1: ProjectileManager | 1 день | 0.5 дня | combat-system.ts уже имеет формулы |
| Этап 2: NPC → Player Damage | 1 день | 0.5 дня | Используем calculateStatScalingByType |
| Этап 3: Event Bus | 0.5 дня | 0 дней | ✅ reportDamageDealt уже отправляет distance/rotation! |
| Этап 4: UI | 0.5 дня | 0.5 дня | Нужно создавать UI |
| **Этап 5: Cone Attacks** | - | **0.25 дня** | checkAttackHit() уже поддерживает coneAngle! |
| **ИТОГО** | **3 дня** | **1.75 дня** | **Экономия 1.25 дня** |

---

## 📊 Критерии Готовности

### Функциональные требования

| # | Требование | Статус | Где реализовано |
|---|------------|--------|-----------------|
| 1 | Игрок стреляет снарядами | 📋 | ProjectileManager.fireFromPlayer() |
| 2 | Снаряды попадают по NPC | 📋 | onProjectileHit() |
| 3 | NPC получает урон | 📋 | NPCSprite.takeDamage() |
| 4 | NPC атакует игрока | 📋 | handleNPCAttack() |
| 5 | Игрок получает урон | 📋 | playerTakeDamage() |
| 6 | HP бар игрока | 📋 | updatePlayerHpBar() |
| 7 | Смерть игрока | 📋 | handlePlayerDeath() |
| 8 | Респаун | 📋 | respawnPlayer() |
| 9 | Синхронизация с сервером | 📋 | Event Bus |
| 10 | Зоны урона (falloff) | ✅ | TechniqueProjectile.hit() |
| 11 | **Конусные атаки (cone)** | ✅ | checkAttackHit() уже имеет coneAngle |
| 12 | **Визуализация конуса** | 📋 | drawCone() через Graphics.arc() |

---

## 🔗 Связанные Документы

- **[checkpoint_03_16_colision.md](./checkpoint_03_16_colision.md)** — Система коллизий (завершено)
- **[NPC_COMBAT_INTERACTIONS.md](../NPC_COMBAT_INTERACTIONS.md)** — Дизайн боевой системы
- **[combat-system.ts](../../src/lib/game/combat-system.ts)** — Формулы урона
- **[TechniqueProjectile.ts](../../src/game/objects/TechniqueProjectile.ts)** — Класс снарядов

---

## 📝 Следующие Шаги

1. **Создать ProjectileManager.ts** — Менеджер снарядов
2. **Интегрировать в LocationScene** — Заменить performAttack()
3. **Добавить calculateDamageFromNPC** — Урон от NPC
4. **Добавить playerTakeDamage** — Получение урона игроком
5. **Добавить UI элементы** — HP бар, слоты техник
6. **Тестирование** — Проверить весь цикл боя

---

*Документ создан: 2026-03-16*
*Версия: 2.0 (после аудита)*
*Аудит проведён: анализ 8 файлов (combat-system.ts, combat-utils.ts, hand-combat.ts, event-bus/client.ts, event-bus/handlers/combat.ts, truth-system.ts, TechniqueProjectile.ts, NPCSprite.ts)*
*Найдено: 90% боевой системы уже реализовано!*
*Требуется: только ProjectileManager и UI интеграция*
