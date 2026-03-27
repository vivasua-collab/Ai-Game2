# 🎯 Checkpoint: Fight System Extension — AI, Loot & Techniques

**Версия:** 2.0
**Дата:** 2026-03-16
**Статус:** ✅ Реализовано
**Зависимости:** `checkpoint_03_16_fight.md` (v4.0 — Этапы 1-3 реализованы)
**Приоритет:** Высокий
**Аудит завершён:** 2026-03-16
**Реализация завершена:** 2026-03-16

---

## 📋 Обзор

Продолжение развития боевой системы. На основе анализа `NPC_COMBAT_INTERACTIONS.md` и текущего состояния кода определены следующие направления:

### Статус предыдущего чекпоинта

| Компонент | Статус |
|-----------|--------|
| ProjectileManager | ✅ Создан |
| TechniqueProjectile | ✅ Интегрирован |
| NPCSprite + NPCGroup | ✅ Работает |
| Event Bus connectors | ✅ Добавлены |
| HP бар игрока | ✅ Добавлен |
| Смерть/респаун | ✅ Реализованы |
| **Система техник игрока** | ✅ Реализовано |
| **AI агрессия NPC** | ✅ Реализовано |
| **Система лута** | ✅ Реализовано |

---

## ✅ Результаты Реализации (2026-03-16)

### Этап 1: TechniqueSlotsManager

**Файлы:**
- `src/game/services/TechniqueSlotsManager.ts` — 240+ строк (НОВЫЙ)
- `src/game/scenes/LocationScene.ts` — интеграция

**Реализовано:**
- Класс TechniqueSlotsManager с методами:
  - `loadTechniques()`, `setActiveSlot()`, `use()`, `canUse()`, `update()`
- Интеграция с ProjectileManager
- UI слотов техник в LocationScene
- Горячие клавиши 1-4

### Этап 2: Интеграция NPCAIController

**Статус:** ✅ Уже подключено через window events

**Механизм:**
- LocationScene слушает события `npc:move`, `npc:attack`, `npc_ai:tick`
- NPCAIController уже работает через singleton `npcAIController`
- Состояния AI: `idle → patrol → chase → attack → flee`

### Этап 3: LootDropManager

**Файлы:**
- `src/game/services/LootDropManager.ts` — 430+ строк (НОВЫЙ)
- `src/game/scenes/LocationScene.ts` — интеграция

**Реализовано:**
- Класс LootDropManager с методами:
  - `dropLoot()`, `tryPickup()`, `update()`, `getNearestLoot()`
- Визуализация лута на карте с пульсацией
- Авто-подбор при приближении (30 пикселей)
- Авто-удаление через 3 минуты
- Tooltip с содержимым лута
- Типы: qi_stone, material, consumable, equipment, technique_scroll, currency
- Редкости: common, uncommon, rare, legendary
- Event Bus события: `loot:drop`, `loot:pickup`

### Этап 4: NPC→Player Damage Flow

**Файлы:**
- `src/lib/game/npc-damage-calculator.ts` — используется
- `src/game/scenes/LocationScene.ts` — handleNPCAttack()

**Реализовано:**
- Интеграция `calculateDamageFromNPC()` в handleNPCAttack()
- Поддержка критических ударов через `checkNPCCritical()`
- Расчёт урона по формуле: `damage = effectiveQi × qiDensity × statMultiplier × masteryMultiplier`
- Учёт armor, meridianBuffer, resistances

---

## 🔍 Результаты Аудита (2026-03-16)

### ✅ Уже Реализовано (переиспользовать!)

| Компонент | Файл | Строк | Статус | Что делать |
|-----------|------|-------|--------|------------|
| **NPCAIController** | `src/lib/game/npc-ai.ts` | 419 | ✅ Полный | **ИНТЕГРИРОВАТЬ** в LocationScene |
| **technique-charging** | `src/game/services/technique-charging.ts` | 330 | ✅ Работает | Использовать для слотов |
| **npc-damage-calculator** | `src/lib/game/npc-damage-calculator.ts` | ~200 | ✅ Работает | Использовать для NPC→Player |
| **NPCSprite.aiState** | `src/game/objects/NPCSprite.ts` | 506 | ✅ Есть поле | Подключить к NPCAIController |
| **LocationScene.npcStates** | `src/game/scenes/LocationScene.ts` | - | ⚠️ Map есть | Заменить на NPCAIController |

### ⚠️ Частично Реализовано

| Компонент | Проблема | Решение |
|-----------|----------|---------|
| **AI States** | NPCAIController существует, но не подключён к LocationScene | Импортировать и использовать |
| **Technique Slots** | technique-charging есть, но нет UI слотов | Создать TechniqueSlotsManager + UI |
| **HP бар игрока** | Есть playerHp, playerMaxHp, но нет визуала HP бара | Добавить createPlayerHpBar() |

### ❌ Не Реализовано

| Компонент | Описание | Приоритет |
|-----------|----------|-----------|
| **TechniqueSlotsManager** | Менеджер слотов техник 1-4 | P0 |
| **UI слоты техник** | Визуальное отображение в LocationScene | P0 |
| **LootDropManager** | Система выпадения лута | P1 |
| **loot:drop event** | Event Bus событие | P1 |

### 📊 Скорректированные оценки времени

| Этап | Было | Стало | Причина |
|------|------|-------|---------|
| Этап 1: Техники | 4 часа | **2.5 часа** | technique-charging уже есть |
| Этап 2: AI State Machine | 5 часов | **1.5 часа** | NPCAIController уже реализован! |
| Этап 3: Лут | 4.5 часа | **4 часа** | Без изменений |
| Этап 4: NPC→Player | 2.5 часа | **1 час** | npc-damage-calculator есть |
| **Итого** | 16 часов | **9 часов** | Экономия 7 часов! |

### 🎯 План исправлений

1. **Этап 1: TechniqueSlotsManager** (2.5 часа)
   - Создать `src/game/services/TechniqueSlotsManager.ts`
   - Добавить UI слотов в LocationScene.createUI()
   - Подключить горячие клавиши 1-4
   - Интегрировать с technique-charging.ts

2. **Этап 2: Интеграция NPCAIController** (1.5 часа)
   - Импортировать `npcAIController` в LocationScene
   - Заменить ручной AI на NPCAIController.updateNPC()
   - Подключить события npc:move, npc:attack

3. **Этап 3: LootDropManager** (4 часа)
   - Создать `src/game/services/LootDropManager.ts`
   - Добавить событие `loot:drop` в Event Bus
   - Создать UI окна лута

4. **Этап 4: NPC→Player Damage** (1 час)
   - Использовать calculateDamageFromNPC()
   - Добавить playerTakeDamage() в LocationScene

---

## 🏗️ Архитектура расширения

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FIGHT SYSTEM EXTENSION                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  ЭТАП 1: СИСТЕМА ТЕХНИК ИГРОКА (СЛОТЫ 1-4)                     │ │
│  │                                                                 │ │
│  │  Компоненты:                                                    │ │
│  │  ├─ TechniqueSlotsManager (новый класс)                        │ │
│  │  ├─ API /api/character/techniques/equipped                     │ │
│  │  ├─ UI слоты в LocationScene                                   │ │
│  │  └─ Горячие клавиши 1-4                                        │ │
│  │                                                                 │ │
│  │  Время: 2-3 часа                                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  ЭТАП 2: AI STATE MACHINE ДЛЯ NPC                              │ │
│  │                                                                 │ │
│  │  Компоненты:                                                    │ │
│  │  ├─ NPCAIController (новый класс)                              │ │
│  │  ├─ Состояния: idle → patrol → alert → chase → attack → flee  │ │
│  │  ├─ Параметры агрессии из NPC_COMBAT_INTERACTIONS.md           │ │
│  │  └─ Интеграция с NPCSprite                                     │ │
│  │                                                                 │ │
│  │  Время: 4-5 часов                                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  ЭТАП 3: СИСТЕМА ЛУТА (БАЗОВАЯ)                                │ │
│  │                                                                 │ │
│  │  Компоненты:                                                    │ │
│  │  ├─ LootDropManager (новый класс)                              │ │
│  │  ├─ permanentizeLootItem() — перевод в БД                      │ │
│  │  ├─ UI окна лута                                               │ │
│  │  └─ Event Bus: npc:death → loot:drop                           │ │
│  │                                                                 │ │
│  │  Время: 3-4 часа                                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  ЭТАП 4: NPC → PLAYER DAMAGE FLOW                              │ │
│  │                                                                 │ │
│  │  Компоненты:                                                    │ │
│  │  ├─ Интеграция calculateDamageFromNPC()                        │ │
│  │  ├─ NPC атакует игрока в состоянии attack                      │ │
│  │  ├─ Получение урона игроком                                    │ │
│  │  └─ Эффекты попадания                                          │ │
│  │                                                                 │ │
│  │  Время: 2-3 часа                                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📐 ЭТАП 1: Система техник игрока (Слоты 1-4)

### 1.1 Теоретическое обоснование

**Проблема:** Игрок не может выбирать технику для атаки. Все компоненты боевой системы работают, но нет UI для выбора активной техники.

**Решение:** Система слотов техник (1-4), аналогичная MMO играм.

### 1.2 Архитектура

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TECHNIQUE SLOTS SYSTEM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │  UI Layer       │    │  Game Layer     │    │  Data Layer     │  │
│  │  (LocationScene)│    │  (TechniqueSlots│    │  (API + DB)     │  │
│  │                 │    │   Manager)      │    │                 │  │
│  ├─────────────────┤    ├─────────────────┤    ├─────────────────┤  │
│  │ - Render slots  │◄───│ - currentSlot   │◄───│ - equippedTechs │  │
│  │ - Hotkeys 1-4   │    │ - cooldowns[]   │    │ - techniqueData │  │
│  │ - Visual feedback│   │ - canUse()      │    │ - loadFromDB()  │  │
│  │ - Active glow   │    │ - use()         │    │                 │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
│                                                                      │
│  Flow:                                                               │
│  1. Player presses 1-4 → setActiveSlot(index)                       │
│  2. Player clicks target → performAttack()                          │
│  3. TechniqueSlotsManager.use() → fire projectile                   │
│  4. Cooldown starts → UI shows cooldown                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Структуры данных

```typescript
// src/types/technique-slots.ts

/**
 * Слот техники
 */
export interface TechniqueSlot {
  index: number;           // 0-3 (соответствует клавишам 1-4)
  techniqueId: string;     // ID техники
  technique?: Technique;   // Загруженные данные техники
  cooldownEndsAt: number;  // Timestamp окончания кулдауна
  isAvailable: boolean;    // Можно ли использовать
}

/**
 * Менеджер слотов техник
 */
export interface TechniqueSlotsState {
  slots: TechniqueSlot[];
  activeSlotIndex: number;  // Текущий активный слот
  lastUsedAt: number;       // Timestamp последнего использования
}

/**
 * Результат использования техники
 */
export interface TechniqueUseResult {
  success: boolean;
  reason?: 'cooldown' | 'no_qi' | 'no_technique' | 'invalid_target';
  damage?: number;
  projectileId?: string;
}
```

### 1.4 Класс TechniqueSlotsManager

```typescript
// src/game/services/TechniqueSlotsManager.ts

import type { Technique, TechniqueSlot, TechniqueSlotsState, TechniqueUseResult } from '@/types/technique-slots';
import { eventBusClient } from '@/lib/game/event-bus/client';
import type { CombatSubtype } from '@/lib/game/techniques';

/**
 * Менеджер слотов техник игрока
 * 
 * Управляет:
 * - 4 слотами техник (клавиши 1-4)
 * - Кулдаунами
 * - Расходом Qi
 * - Созданием снарядов
 */
export class TechniqueSlotsManager {
  private state: TechniqueSlotsState;
  private scene: Phaser.Scene;
  private onFireProjectile: (config: ProjectileConfig) => void;
  
  constructor(
    scene: Phaser.Scene,
    onFireProjectile: (config: ProjectileConfig) => void
  ) {
    this.scene = scene;
    this.onFireProjectile = onFireProjectile;
    this.state = {
      slots: [
        { index: 0, techniqueId: '', cooldownEndsAt: 0, isAvailable: true },
        { index: 1, techniqueId: '', cooldownEndsAt: 0, isAvailable: true },
        { index: 2, techniqueId: '', cooldownEndsAt: 0, isAvailable: true },
        { index: 3, techniqueId: '', cooldownEndsAt: 0, isAvailable: true },
      ],
      activeSlotIndex: 0,
      lastUsedAt: 0,
    };
  }
  
  /**
   * Загрузить техники в слоты
   */
  async loadTechniques(techniques: Technique[]): Promise<void> {
    for (let i = 0; i < Math.min(4, techniques.length); i++) {
      this.state.slots[i].techniqueId = techniques[i].id;
      this.state.slots[i].technique = techniques[i];
    }
  }
  
  /**
   * Установить активный слот
   */
  setActiveSlot(index: number): void {
    if (index >= 0 && index < 4) {
      this.state.activeSlotIndex = index;
    }
  }
  
  /**
   * Получить активную технику
   */
  getActiveTechnique(): Technique | null {
    const slot = this.state.slots[this.state.activeSlotIndex];
    return slot.technique ?? null;
  }
  
  /**
   * Проверить возможность использования
   */
  canUse(slotIndex?: number): { canUse: boolean; reason?: string } {
    const index = slotIndex ?? this.state.activeSlotIndex;
    const slot = this.state.slots[index];
    
    if (!slot.technique) {
      return { canUse: false, reason: 'no_technique' };
    }
    
    if (Date.now() < slot.cooldownEndsAt) {
      return { canUse: false, reason: 'cooldown' };
    }
    
    // TODO: Проверка Qi
    
    return { canUse: true };
  }
  
  /**
   * Использовать технику
   */
  async use(
    playerX: number,
    playerY: number,
    targetX: number,
    targetY: number,
    playerQi: number
  ): Promise<TechniqueUseResult> {
    const slot = this.state.slots[this.state.activeSlotIndex];
    const technique = slot.technique;
    
    if (!technique) {
      return { success: false, reason: 'no_technique' };
    }
    
    // Проверка кулдауна
    const cooldownCheck = this.canUse();
    if (!cooldownCheck.canUse) {
      return { success: false, reason: cooldownCheck.reason as any };
    }
    
    // Проверка Qi
    const qiCost = technique.qiCost ?? 10;
    if (playerQi < qiCost) {
      return { success: false, reason: 'no_qi' };
    }
    
    // Расчёт урона (используем combat-system)
    const damage = this.calculateDamage(technique);
    
    // Определение типа снаряда
    const subtype = technique.effects?.combatSubtype ?? 'ranged_projectile';
    
    // Создание снаряда
    this.onFireProjectile({
      techniqueId: technique.id,
      ownerId: 'player',
      x: playerX,
      y: playerY,
      targetX,
      targetY,
      damage,
      subtype: subtype as CombatSubtype,
      element: technique.element ?? 'neutral',
    });
    
    // Установка кулдауна
    const cooldown = technique.cooldown ?? 1000; // 1 сек по умолчанию
    slot.cooldownEndsAt = Date.now() + cooldown;
    this.state.lastUsedAt = Date.now();
    
    // Отправка события на сервер
    await eventBusClient.useTechnique(technique.id, { x: playerX, y: playerY });
    
    return {
      success: true,
      damage,
      projectileId: `proj_${Date.now()}`,
    };
  }
  
  /**
   * Расчёт урона техники
   */
  private calculateDamage(technique: Technique): number {
    // TODO: Интегрировать calculateTechniqueDamageFull из combat-system.ts
    return technique.baseDamage ?? 10;
  }
  
  /**
   * Обновление UI (вызывается каждый кадр)
   */
  updateUI(): void {
    // Событие для обновления UI слотов
    this.scene.events.emit('technique-slots-update', this.state);
  }
  
  /**
   * Получить состояние слотов
   */
  getState(): TechniqueSlotsState {
    return { ...this.state };
  }
}
```

### 1.5 API Endpoint

```typescript
// src/app/api/character/techniques/equipped/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

/**
 * GET /api/character/techniques/equipped
 * 
 * Получить экипированные техники персонажа (слоты 1-4)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Получаем персонажа
    const character = await db.character.findFirst({
      where: { userId: session.user.id },
      include: {
        techniques: {
          where: { isEquipped: true },
          orderBy: { slotIndex: 'asc' },
          take: 4,
        },
      },
    });
    
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      techniques: character.techniques,
    });
  } catch (error) {
    console.error('[API] Error fetching equipped techniques:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/character/techniques/equipped
 * 
 * Экипировать технику в слот
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { techniqueId, slotIndex } = body;
    
    if (slotIndex < 0 || slotIndex > 3) {
      return NextResponse.json({ error: 'Invalid slot index' }, { status: 400 });
    }
    
    // Снимаем технику с других слотов
    await db.characterTechnique.updateMany({
      where: {
        character: { userId: session.user.id },
        slotIndex,
      },
      data: { isEquipped: false, slotIndex: null },
    });
    
    // Экипируем в указанный слот
    await db.characterTechnique.update({
      where: { id: techniqueId },
      data: { isEquipped: true, slotIndex },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error equipping technique:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### 1.6 UI в LocationScene

```typescript
// Добавить в LocationScene.ts

private techniqueSlotsUI!: Phaser.GameObjects.Container;
private techniqueSlotsManager!: TechniqueSlotsManager;

// В create():
this.techniqueSlotsManager = new TechniqueSlotsManager(
  this,
  (config) => this.projectileManager.fire(config)
);

await this.loadEquippedTechniques();
this.createTechniqueSlotsUI();

// Настройка горячих клавиш
this.input.keyboard!.on('keydown-ONE', () => this.setActiveSlot(0));
this.input.keyboard!.on('keydown-TWO', () => this.setActiveSlot(1));
this.input.keyboard!.on('keydown-THREE', () => this.setActiveSlot(2));
this.input.keyboard!.on('keydown-FOUR', () => this.setActiveSlot(3));

/**
 * Создать UI слотов техник
 */
private createTechniqueSlotsUI(): void {
  const slotSize = 44;
  const padding = 4;
  const startX = this.cameras.main.width - (slotSize + padding) * 4 - 20;
  const startY = this.cameras.main.height - 70;
  
  this.techniqueSlotsUI = this.add.container(0, 0);
  this.techniqueSlotsUI.setScrollFactor(0).setDepth(DEPTHS.ui);
  
  for (let i = 0; i < 4; i++) {
    const slotX = startX + i * (slotSize + padding);
    
    // Фон слота
    const bg = this.add.rectangle(slotX, startY, slotSize, slotSize, 0x1e293b, 0.9);
    bg.setStrokeStyle(2, i === 0 ? 0x4ade80 : 0x475569);
    this.techniqueSlotsUI.add(bg);
    
    // Номер слота
    const keyLabel = this.add.text(slotX, startY - slotSize/2 - 10, (i + 1).toString(), {
      fontSize: '11px',
      color: '#9ca3af',
    }).setOrigin(0.5);
    this.techniqueSlotsUI.add(keyLabel);
    
    // Иконка техники (если есть)
    // TODO: Добавить отображение иконки
  }
  
  // Подписка на обновления
  this.events.on('technique-slots-update', (state: TechniqueSlotsState) => {
    this.updateTechniqueSlotsUI(state);
  });
}

/**
 * Установить активный слот
 */
private setActiveSlot(index: number): void {
  this.techniqueSlotsManager.setActiveSlot(index);
  
  // Обновить UI - подсветка активного слота
  this.updateTechniqueSlotsUI(this.techniqueSlotsManager.getState());
}
```

### 1.7 Оценка времени

| Задача | Время |
|--------|-------|
| Типы technique-slots.ts | 30 мин |
| Класс TechniqueSlotsManager | 1.5 часа |
| API endpoint | 30 мин |
| UI в LocationScene | 1 час |
| Тестирование | 30 мин |
| **Итого** | **~4 часа** |

---

## 📐 ЭТАП 2: AI State Machine для NPC

### 2.1 Теоретическое обоснование

**Проблема:** NPC не проявляют агрессию и не атакуют игрока.

**Решение:** State Machine (конечный автомат) — простой и предсказуемый подход для MVP.

**Почему State Machine:**
- Простота реализации
- Предсказуемое поведение
- Легкая отладка
- Возможность расширения до Behaviour Tree в будущем

### 2.2 Диаграмма состояний

```
                                    ┌──────────────────────────────────────┐
                                    │                                      │
                                    ▼                                      │
┌─────────┐                    ┌─────────┐         ┌─────────┐            │
│  IDLE   │─── patrolling ───▶│ PATROL  │─── enemy │ ALERT   │            │
│         │◀── stopped ───────│         │   seen   │         │            │
└─────────┘                    └─────────┘         └────┬────┘            │
     │                              │                   │                  │
     │                              │                   │ enemy in        │
     │                              │                   │ attack range    │
     │                              │                   ▼                  │
     │                              │              ┌─────────┐            │
     │                              │              │ ATTACK  │────────────┘
     │                              │              │         │  enemy fled
     │                              │              └────┬────┘
     │                              │                   │
     │                              │                   │ HP < fleeThreshold
     │                              │                   ▼
     │                              │              ┌─────────┐
     │                              │              │  FLEE   │
     │                              │              │         │
     │                              │              └─────────┘
     │                              │                   │
     │◀──────── safe ───────────────┴───────────────────┘
     │
     │ player interacted
     ▼
┌─────────┐
│ DIALOG  │
│         │
└─────────┘
```

### 2.3 Структуры данных

```typescript
// src/types/npc-ai.ts

/**
 * Состояния AI NPC
 */
export type NPCAIState = 
  | 'idle'     // Стоит на месте
  | 'patrol'   // Патрулирует территорию
  | 'alert'    // Заметил врага
  | 'chase'    // Преследует врага
  | 'attack'   // Атакует врага
  | 'flee'     // Убегает
  | 'dialog';  // В диалоге с игроком

/**
 * Контекст AI
 */
export interface NPCAIContext {
  npc: {
    id: string;
    disposition: number;      // -100 (враг) до +100 (друг)
    aggressionLevel: number;  // 0-100
    hp: number;
    maxHp: number;
    currentQi: number;
    x: number;
    y: number;
  };
  target: {
    id: string;
    type: 'player' | 'npc';
    x: number;
    y: number;
    distance: number;
  } | null;
  world: {
    locationId: string;
    time: number;
    otherNPCs: Array<{ id: string; x: number; y: number; disposition: number }>;
  };
}

/**
 * Конфигурация AI
 */
export interface NPCAIConfig {
  // Радиусы (в пикселях)
  perceptionRange: number;    // Радиус обнаружения
  aggroRange: number;         // Радиус агрессии
  attackRange: number;        // Радиус атаки
  leashRange: number;         // Радиус возвращения
  
  // Пороги
  fleeThreshold: number;      // HP% для бегства
  pursueThreshold: number;    // Расстояние для прекращения погони
  
  // Тайминги
  idleDuration: number;       // Время в idle (мс)
  patrolDuration: number;     // Время патрулирования (мс)
  attackCooldown: number;     // Кулдаун атаки (мс)
  
  // Поведение
  canFlee: boolean;           // Может ли убегать
  callAllies: boolean;        // Звать ли союзников
  patrolPath?: Array<{ x: number; y: number }>; // Точки патруля
}

/**
 * Результат перехода состояния
 */
export interface NPCAITransition {
  fromState: NPCAIState;
  toState: NPCAIState;
  reason: string;
  timestamp: number;
}
```

### 2.4 Класс NPCAIController

```typescript
// src/game/services/NPCAIController.ts

import type { NPCAIState, NPCAIContext, NPCAIConfig, NPCAITransition } from '@/types/npc-ai';
import type { NPCSprite } from '../objects/NPCSprite';

/**
 * Контроллер AI NPC
 * 
 * Реализует State Machine для управления поведением NPC.
 * 
 * Состояния:
 * - idle: Стоит на месте, сканирует окружение
 * - patrol: Движется по маршруту или случайно
 * - alert: Заметил потенциальную угрозу, наблюдает
 * - chase: Преследует цель
 * - attack: Атакует цель
 * - flee: Убегает от угрозы
 * - dialog: Взаимодействует с игроком
 */
export class NPCAIController {
  private npc: NPCSprite;
  private state: NPCAIState = 'idle';
  private config: NPCAIConfig;
  private context: NPCAIContext;
  
  private lastStateChange: number = 0;
  private lastAttackTime: number = 0;
  private patrolTarget: { x: number; y: number } | null = null;
  private patrolIndex: number = 0;
  
  // Константы из NPC_COMBAT_INTERACTIONS.md
  private static readonly DEFAULT_CONFIG: NPCAIConfig = {
    perceptionRange: 9 * 32,    // 9 метров в пикселях
    aggroRange: 9 * 32,         // 9 метров (враждебные)
    attackRange: 2 * 32,        // 2 метра (ближний бой)
    leashRange: 20 * 32,        // 20 метров
    fleeThreshold: 20,          // 20% HP
    pursueThreshold: 15 * 32,   // 15 метров
    idleDuration: 3000,         // 3 секунды
    patrolDuration: 10000,      // 10 секунд
    attackCooldown: 1500,       // 1.5 секунды
    canFlee: true,
    callAllies: false,
  };
  
  constructor(npc: NPCSprite, customConfig?: Partial<NPCAIConfig>) {
    this.npc = npc;
    this.config = { ...NPCAIController.DEFAULT_CONFIG, ...customConfig };
    this.context = this.buildContext();
  }
  
  /**
   * Главный метод обновления — вызывается каждый кадр
   */
  update(delta: number, playerX: number, playerY: number): void {
    // Обновляем контекст
    this.updateContext(playerX, playerY);
    
    // Проверяем переходы состояний
    this.evaluateTransitions();
    
    // Выполняем действие текущего состояния
    this.executeState(delta);
  }
  
  /**
   * Обновление контекста
   */
  private updateContext(playerX: number, playerY: number): void {
    const dx = playerX - this.npc.x;
    const dy = playerY - this.npc.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    this.context.npc.x = this.npc.x;
    this.context.npc.y = this.npc.y;
    this.context.npc.hp = this.npc.hp;
    
    this.context.target = {
      id: 'player',
      type: 'player',
      x: playerX,
      y: playerY,
      distance,
    };
  }
  
  /**
   * Оценка переходов между состояниями
   */
  private evaluateTransitions(): void {
    const now = Date.now();
    const hp = this.npc.hp / this.npc.maxHp * 100;
    const target = this.context.target;
    
    // Машина состояний
    switch (this.state) {
      case 'idle':
        // Проверяем угрозу
        if (this.isThreatDetected()) {
          this.transitionTo('alert', 'threat_detected');
          return;
        }
        // Переход к патрулированию
        if (now - this.lastStateChange > this.config.idleDuration) {
          this.transitionTo('patrol', 'idle_timeout');
        }
        break;
        
      case 'patrol':
        // Проверяем угрозу
        if (this.isThreatDetected()) {
          this.transitionTo('alert', 'threat_detected');
          return;
        }
        // Возврат к idle
        if (now - this.lastStateChange > this.config.patrolDuration) {
          this.transitionTo('idle', 'patrol_timeout');
        }
        break;
        
      case 'alert':
        if (!target) {
          this.transitionTo('idle', 'no_target');
          return;
        }
        // Враг в радиусе атаки
        if (target.distance <= this.config.attackRange) {
          this.transitionTo('attack', 'target_in_range');
          return;
        }
        // Враг в радиусе агрессии — преследование
        if (target.distance <= this.config.aggroRange) {
          this.transitionTo('chase', 'target_in_aggro_range');
          return;
        }
        // Враг скрылся
        if (target.distance > this.config.perceptionRange) {
          this.transitionTo('idle', 'target_lost');
        }
        break;
        
      case 'chase':
        if (!target) {
          this.transitionTo('idle', 'no_target');
          return;
        }
        // Проверка бегства
        if (hp < this.config.fleeThreshold && this.config.canFlee) {
          this.transitionTo('flee', 'low_health');
          return;
        }
        // Враг в радиусе атаки
        if (target.distance <= this.config.attackRange) {
          this.transitionTo('attack', 'target_in_range');
          return;
        }
        // Враг слишком далеко — возврат
        if (target.distance > this.config.leashRange) {
          this.transitionTo('idle', 'target_too_far');
        }
        break;
        
      case 'attack':
        if (!target) {
          this.transitionTo('idle', 'no_target');
          return;
        }
        // Проверка бегства
        if (hp < this.config.fleeThreshold && this.config.canFlee) {
          this.transitionTo('flee', 'low_health');
          return;
        }
        // Враг вышел из радиуса атаки
        if (target.distance > this.config.attackRange) {
          this.transitionTo('chase', 'target_out_of_range');
        }
        break;
        
      case 'flee':
        // В безопасности
        if (target && target.distance > this.config.leashRange) {
          this.transitionTo('idle', 'safe_distance');
        }
        break;
        
      case 'dialog':
        // Выход из диалога управляется внешне
        break;
    }
  }
  
  /**
   * Выполнение действия текущего состояния
   */
  private executeState(delta: number): void {
    const target = this.context.target;
    
    switch (this.state) {
      case 'idle':
        // Просто стоим
        this.npc.setVelocity(0, 0);
        break;
        
      case 'patrol':
        this.executePatrol();
        break;
        
      case 'alert':
        // Смотрим на цель
        if (target) {
          this.npc.lookAt(target.x, target.y);
        }
        this.npc.setVelocity(0, 0);
        break;
        
      case 'chase':
        if (target) {
          this.npc.moveTo(target.x, target.y, 150); // Скорость преследования
        }
        break;
        
      case 'attack':
        this.executeAttack();
        break;
        
      case 'flee':
        if (target) {
          // Бежим в противоположную сторону
          const dx = this.npc.x - target.x;
          const dy = this.npc.y - target.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          this.npc.moveTo(
            this.npc.x + (dx / dist) * 200,
            this.npc.y + (dy / dist) * 200,
            200 // Скорость бегства
          );
        }
        break;
    }
  }
  
  /**
   * Патрулирование
   */
  private executePatrol(): void {
    if (!this.patrolTarget) {
      // Выбираем новую точку
      this.patrolTarget = this.selectPatrolPoint();
    }
    
    const dx = this.patrolTarget.x - this.npc.x;
    const dy = this.patrolTarget.y - this.npc.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 10) {
      // Достигли точки
      this.patrolTarget = null;
    } else {
      this.npc.moveTo(this.patrolTarget.x, this.patrolTarget.y, 80);
    }
  }
  
  /**
   * Атака
   */
  private executeAttack(): void {
    const now = Date.now();
    const target = this.context.target;
    
    if (!target) return;
    
    // Кулдаун атаки
    if (now - this.lastAttackTime < this.config.attackCooldown) {
      return;
    }
    
    // Поворот к цели
    this.npc.lookAt(target.x, target.y);
    
    // Выполняем атаку
    this.npc.attack(target.id, target.x, target.y);
    this.lastAttackTime = now;
  }
  
  /**
   * Проверка обнаружения угрозы
   */
  private isThreatDetected(): boolean {
    const target = this.context.target;
    if (!target) return false;
    
    // Проверка дистанции
    if (target.distance > this.config.perceptionRange) return false;
    
    // Проверка disposition (враг или нейтрал с провокацией)
    if (this.npc.disposition < 0) {
      // Враг — агрессия в радиусе aggroRange
      return target.distance <= this.config.aggroRange;
    } else if (this.npc.disposition === 0) {
      // Нейтрал — агрессия только при атаке
      return this.npc.wasAttacked;
    }
    
    return false;
  }
  
  /**
   * Выбор точки патруля
   */
  private selectPatrolPoint(): { x: number; y: number } {
    if (this.config.patrolPath && this.config.patrolPath.length > 0) {
      // По маршруту
      this.patrolIndex = (this.patrolIndex + 1) % this.config.patrolPath.length;
      return this.config.patrolPath[this.patrolIndex];
    }
    
    // Случайная точка в радиусе
    const angle = Math.random() * Math.PI * 2;
    const radius = 100 + Math.random() * 100;
    return {
      x: this.npc.x + Math.cos(angle) * radius,
      y: this.npc.y + Math.sin(angle) * radius,
    };
  }
  
  /**
   * Переход в новое состояние
   */
  private transitionTo(newState: NPCAIState, reason: string): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    
    // Уведомление для отладки
    console.log(`[NPC AI] ${this.npc.npcName}: ${oldState} → ${newState} (${reason})`);
    
    // Событие для внешних систем
    this.npc.emit('ai-state-change', { fromState: oldState, toState: newState, reason });
  }
  
  /**
   * Принудительная смена состояния
   */
  forceState(newState: NPCAIState, reason: string = 'forced'): void {
    this.transitionTo(newState, reason);
  }
  
  /**
   * Получить текущее состояние
   */
  getState(): NPCAIState {
    return this.state;
  }
  
  /**
   * Построение начального контекста
   */
  private buildContext(): NPCAIContext {
    return {
      npc: {
        id: this.npc.npcId,
        disposition: this.npc.disposition,
        aggressionLevel: this.npc.aggressionLevel,
        hp: this.npc.hp,
        maxHp: this.npc.maxHp,
        currentQi: 100, // TODO: Получить из NPC
        x: this.npc.x,
        y: this.npc.y,
      },
      target: null,
      world: {
        locationId: '',
        time: Date.now(),
        otherNPCs: [],
      },
    };
  }
}
```

### 2.5 Интеграция с NPCSprite

```typescript
// Добавить в NPCSprite.ts

import { NPCAIController } from '../services/NPCAIController';

export class NPCSprite extends Phaser.Physics.Arcade.Sprite {
  // ... существующие поля ...
  
  public aiController: NPCAIController;
  public wasAttacked: boolean = false;
  
  constructor(scene: Phaser.Scene, config: NPCSpriteConfig) {
    // ... существующий код ...
    
    // Инициализация AI
    this.aiController = new NPCAIController(this, {
      perceptionRange: config.aggressionLevel > 0 ? 9 * 32 : 4.5 * 32,
      aggroRange: config.aggressionLevel > 0 ? 9 * 32 : 4.5 * 32,
      canFlee: config.aggressionLevel < 80, // Очень агрессивные не убегают
    });
  }
  
  /**
   * Обновление AI — вызывается из LocationScene.update()
   */
  updateAI(delta: number, playerX: number, playerY: number): void {
    this.aiController.update(delta, playerX, playerY);
  }
  
  /**
   * Атака цели
   */
  attack(targetId: string, targetX: number, targetY: number): void {
    // Расчёт урона через calculateDamageFromNPC
    const damage = this.calculateAttackDamage();
    
    // Визуальный эффект атаки
    this.showAttackEffect(targetX, targetY);
    
    // Отправка события
    eventBusClient.reportDamageDealt?.({
      targetId,
      targetType: 'player',
      techniqueId: null,
      position: { x: targetX, y: targetY },
      distance: Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY),
      angle: Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY),
      damageMultiplier: 1.0,
    });
  }
  
  /**
   * Расчёт урона атаки NPC
   */
  private calculateAttackDamage(): number {
    // Используем calculateDamageFromNPC из npc-damage-calculator.ts
    // TODO: Интегрировать
    return 10 + this.level * 2;
  }
  
  /**
   * Визуальный эффект атаки
   */
  private showAttackEffect(targetX: number, targetY: number): void {
    // Линия атаки
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(3, 0xff4444, 0.8);
    graphics.beginPath();
    graphics.moveTo(this.x, this.y);
    graphics.lineTo(targetX, targetY);
    graphics.strokePath();
    
    // Анимация исчезновения
    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 200,
      onComplete: () => graphics.destroy(),
    });
  }
  
  /**
   * Повернуться к точке
   */
  lookAt(x: number, y: number): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    this.directionIndicator?.setRotation(angle);
  }
  
  /**
   * Движение к точке
   */
  moveTo(x: number, y: number, speed: number): void {
    const dx = x - this.x;
    const dy = y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      this.setVelocity((dx / distance) * speed, (dy / distance) * speed);
    }
  }
  
  /**
   * Переопределение takeDamage для отметки атаки
   */
  takeDamage(damage: number, element?: string): void {
    super.takeDamage(damage, element);
    this.wasAttacked = true;
  }
}
```

### 2.6 Оценка времени

| Задача | Время |
|--------|-------|
| Типы npc-ai.ts | 30 мин |
| Класс NPCAIController | 2 часа |
| Интеграция с NPCSprite | 1 час |
| Интеграция с LocationScene | 30 мин |
| Тестирование и отладка | 1 час |
| **Итого** | **~5 часов** |

---

## 📐 ЭТАП 3: Система лута (Базовая)

### 3.1 Теоретическое обоснование

**Проблема:** Бой без награды не имеет смысла для игрока.

**Решение:** Full Loot система — игрок получает всю экипировку и инвентарь убитого NPC.

**Принцип:** Экипировка генерируется при создании NPC, а не при смерти (уже реализовано в npc-generator.ts).

### 3.2 Архитектура

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LOOT SYSTEM                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  NPC Death Flow:                                                     │
│                                                                      │
│  ┌─────────┐     ┌─────────────┐     ┌─────────────┐               │
│  │ NPC dies│────▶│ Drop Loot   │────▶│ Show Loot UI│               │
│  │ (hp=0)  │     │ on ground   │     │ (interaction)│               │
│  └─────────┘     └─────────────┘     └─────────────┘               │
│                         │                   │                       │
│                         ▼                   ▼                       │
│                  ┌─────────────┐     ┌─────────────┐               │
│                  │ Create Loot │     │ Player takes│               │
│                  │ Container   │     │ items       │               │
│                  └─────────────┘     └─────────────┘               │
│                                             │                       │
│                                             ▼                       │
│                                      ┌─────────────┐               │
│                                      │ permanentize│               │
│                                      │ LootItem    │               │
│                                      └─────────────┘               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Структуры данных

```typescript
// src/types/loot.ts

/**
 * Контейнер лута на земле
 */
export interface LootContainer {
  id: string;
  npcId: string;             // ID убитого NPC
  npcName: string;           // Имя для отображения
  x: number;
  y: number;
  
  items: LootItem[];
  totalWeight: number;
  
  createdAt: number;
  expiresAt: number;         // Время исчезновения
}

/**
 * Предмет лута
 */
export interface LootItem {
  id: string;
  tempId: string;            // Временный ID из NPC
  name: string;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'qi_stone';
  rarity: string;
  
  stats: Record<string, number>;
  effects?: any[];
  
  quantity: number;
  weight: number;
  value: number;
  
  durability?: number;       // Для экипировки (повреждена в бою)
  maxDurability?: number;
  
  icon?: string;
}

/**
 * Результат сбора лута
 */
export interface LootCollectionResult {
  success: boolean;
  collectedItems: string[];  // ID собранных предметов
  failedItems: string[];     // ID предметов, которые не удалось подобрать
  reason?: 'inventory_full' | 'too_heavy' | 'expired';
}
```

### 3.4 Класс LootDropManager

```typescript
// src/game/services/LootDropManager.ts

import type { LootContainer, LootItem, LootCollectionResult } from '@/types/loot';
import { eventBusClient } from '@/lib/game/event-bus/client';

/**
 * Менеджер лута
 * 
 * Управляет:
 * - Созданием контейнеров лута при смерти NPC
 * - Отображением лута на карте
 * - Сбором лута игроком
 * - Сохранением в БД
 */
export class LootDropManager {
  private scene: Phaser.Scene;
  private lootContainers: Map<string, LootContainer> = new Map();
  private lootSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  
  private static readonly LOOT_EXPIRY_TIME = 5 * 60 * 1000; // 5 минут
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Подписка на смерть NPC
    this.scene.events.on('npc:death', this.onNPCDeath, this);
  }
  
  /**
   * Обработка смерти NPC
   */
  private async onNPCDeath(data: { npcId: string; x: number; y: number }): Promise<void> {
    // Получаем данные NPC
    const npcData = await this.fetchNPCData(data.npcId);
    if (!npcData) return;
    
    // Создаём контейнер лута
    const container = this.createLootContainer(data.npcId, npcData, data.x, data.y);
    
    // Сохраняем
    this.lootContainers.set(container.id, container);
    
    // Создаём спрайт
    this.createLootSprite(container);
    
    // Отправляем событие
    eventBusClient.emit('loot:dropped', {
      containerId: container.id,
      x: data.x,
      y: data.y,
      itemCount: container.items.length,
    });
  }
  
  /**
   * Создание контейнера лута
   */
  private createLootContainer(
    npcId: string,
    npcData: any,
    x: number,
    y: number
  ): LootContainer {
    const items: LootItem[] = [];
    
    // 1. Экипировка NPC
    if (npcData.equipment) {
      for (const [slot, item] of Object.entries(npcData.equipment)) {
        if (!item) continue;
        
        items.push({
          id: `loot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tempId: (item as any).id,
          name: (item as any).name,
          type: this.mapEquipmentSlotToType(slot),
          rarity: (item as any).rarity ?? 'common',
          stats: (item as any).stats ?? {},
          effects: (item as any).effects,
          quantity: 1,
          weight: (item as any).weight ?? 1,
          value: (item as any).value ?? 0,
          durability: this.applyBattleDamage((item as any).durability, npcData.battleDamage),
          maxDurability: (item as any).maxDurability,
          icon: (item as any).icon,
        });
      }
    }
    
    // 2. Инвентарь NPC
    if (npcData.inventory) {
      for (const invItem of npcData.inventory) {
        items.push({
          id: `loot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tempId: invItem.id,
          name: invItem.name,
          type: 'consumable',
          rarity: 'common',
          stats: {},
          quantity: invItem.quantity,
          weight: 0.1,
          value: invItem.value ?? 10,
        });
      }
    }
    
    // 3. Ци-камни (если были у NPC)
    if (npcData.spiritStones > 0) {
      items.push({
        id: `loot_${Date.now()}_stones`,
        tempId: 'spirit_stones',
        name: 'Духовные камни',
        type: 'qi_stone',
        rarity: 'common',
        stats: { qi: npcData.spiritStones },
        quantity: npcData.spiritStones,
        weight: 0,
        value: npcData.spiritStones,
      });
    }
    
    const totalWeight = items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
    
    return {
      id: `loot_container_${Date.now()}`,
      npcId,
      npcName: npcData.name,
      x,
      y,
      items,
      totalWeight,
      createdAt: Date.now(),
      expiresAt: Date.now() + LootDropManager.LOOT_EXPIRY_TIME,
    };
  }
  
  /**
   * Создание спрайта лута
   */
  private createLootSprite(container: LootContainer): void {
    // Спрайт мешка/сундука
    const sprite = this.scene.add.sprite(container.x, container.y, 'loot_bag');
    sprite.setDepth(DEPTHS.items);
    sprite.setScale(0.5);
    
    // Интерактивность
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => this.showLootUI(container.id));
    
    // Подсказка при наведении
    sprite.on('pointerover', () => {
      this.scene.events.emit('show-tooltip', {
        x: container.x,
        y: container.y - 30,
        text: `Лут: ${container.npcName}\n${container.items.length} предметов`,
      });
    });
    
    sprite.on('pointerout', () => {
      this.scene.events.emit('hide-tooltip');
    });
    
    // Анимация появления
    sprite.setAlpha(0);
    sprite.setScale(0.3);
    this.scene.tweens.add({
      targets: sprite,
      alpha: 1,
      scale: 0.5,
      duration: 300,
      ease: 'Back.out',
    });
    
    this.lootSprites.set(container.id, sprite);
  }
  
  /**
   * Показать UI лута
   */
  private showLootUI(containerId: string): void {
    const container = this.lootContainers.get(containerId);
    if (!container) return;
    
    // Отправляем событие для UI
    this.scene.events.emit('loot:open', container);
  }
  
  /**
   * Собрать лут
   */
  async collectLoot(
    containerId: string,
    itemIds: string[],
    characterId: string
  ): Promise<LootCollectionResult> {
    const container = this.lootContainers.get(containerId);
    if (!container) {
      return { success: false, collectedItems: [], failedItems: itemIds, reason: 'expired' };
    }
    
    const collectedItems: string[] = [];
    const failedItems: string[] = [];
    
    for (const itemId of itemIds) {
      const item = container.items.find(i => i.id === itemId);
      if (!item) {
        failedItems.push(itemId);
        continue;
      }
      
      try {
        // Сохраняем в БД
        const permanentId = await this.permanentizeLootItem(item, characterId);
        collectedItems.push(itemId);
        
        // Удаляем из контейнера
        container.items = container.items.filter(i => i.id !== itemId);
      } catch (error) {
        console.error('[LootDropManager] Failed to collect item:', error);
        failedItems.push(itemId);
      }
    }
    
    // Если контейнер пуст — удаляем
    if (container.items.length === 0) {
      this.removeLootContainer(containerId);
    }
    
    return { success: true, collectedItems, failedItems };
  }
  
  /**
   * Перевод временного предмета в постоянный
   */
  private async permanentizeLootItem(item: LootItem, characterId: string): Promise<string> {
    const response = await fetch('/api/inventory/collect-loot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item: {
          name: item.name,
          type: item.type,
          rarity: item.rarity,
          stats: item.stats,
          effects: item.effects,
          quantity: item.quantity,
          durability: item.durability,
          maxDurability: item.maxDurability,
          value: item.value,
        },
        characterId,
      }),
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error ?? 'Failed to permanentize item');
    }
    
    return data.itemId;
  }
  
  /**
   * Удаление контейнера лута
   */
  private removeLootContainer(containerId: string): void {
    // Удаляем спрайт
    const sprite = this.lootSprites.get(containerId);
    if (sprite) {
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        scale: 0.3,
        duration: 200,
        onComplete: () => sprite.destroy(),
      });
      this.lootSprites.delete(containerId);
    }
    
    // Удаляем данные
    this.lootContainers.delete(containerId);
  }
  
  /**
   * Обновление — проверка истечения времени
   */
  update(): void {
    const now = Date.now();
    
    for (const [id, container] of this.lootContainers) {
      if (now > container.expiresAt) {
        this.removeLootContainer(id);
      }
    }
  }
  
  /**
   * Получить данные NPC
   */
  private async fetchNPCData(npcId: string): Promise<any> {
    // TODO: Интеграция с API NPC
    return null;
  }
  
  /**
   * Применить боевые повреждения к прочности
   */
  private applyBattleDamage(durability: number | undefined, battleDamage: number): number | undefined {
    if (durability === undefined) return undefined;
    
    // Снижаем прочность в зависимости от урона в бою
    const damagePercent = Math.min(50, battleDamage * 0.5); // Макс 50% потери
    return Math.max(10, durability - durability * damagePercent / 100);
  }
  
  /**
   * Маппинг слота к типу
   */
  private mapEquipmentSlotToType(slot: string): LootItem['type'] {
    const mapping: Record<string, LootItem['type']> = {
      weapon: 'weapon',
      head: 'armor',
      body: 'armor',
      legs: 'armor',
      feet: 'armor',
      hands: 'armor',
      accessory1: 'accessory',
      accessory2: 'accessory',
    };
    return mapping[slot] ?? 'material';
  }
}
```

### 3.5 API Endpoint для сбора лута

```typescript
// src/app/api/inventory/collect-loot/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

/**
 * POST /api/inventory/collect-loot
 * 
 * Сохранить предмет лута в инвентарь игрока
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { item, characterId } = body;
    
    // Проверяем владельца
    const character = await db.character.findFirst({
      where: { id: characterId, userId: session.user.id },
    });
    
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }
    
    // Создаём постоянный предмет
    const inventoryItem = await db.inventoryItem.create({
      data: {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: item.name,
        type: item.type,
        category: item.type,
        rarity: item.rarity,
        stats: JSON.stringify(item.stats),
        effects: JSON.stringify(item.effects ?? []),
        quantity: item.quantity ?? 1,
        durability: item.durability,
        maxDurability: item.maxDurability,
        value: item.value,
        characterId,
      },
    });
    
    return NextResponse.json({
      success: true,
      itemId: inventoryItem.id,
    });
  } catch (error) {
    console.error('[API] Error collecting loot:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### 3.6 Оценка времени

| Задача | Время |
|--------|-------|
| Типы loot.ts | 30 мин |
| Класс LootDropManager | 2 часа |
| API endpoint | 30 мин |
| UI окна лута | 1 час |
| Интеграция | 30 мин |
| **Итого** | **~4.5 часа** |

---

## 📐 ЭТАП 4: NPC → Player Damage Flow

### 4.1 Теоретическое обоснование

**Проблема:** NPC может атаковать, но урон не наносится игроку.

**Решение:** Интегрировать calculateDamageFromNPC и добавить получение урона игроком.

### 4.2 Поток урона

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NPC → PLAYER DAMAGE FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. NPC в состоянии attack                                           │
│     │                                                                │
│     ▼                                                                │
│  2. NPCSprite.attack()                                               │
│     │                                                                │
│     ▼                                                                │
│  3. calculateDamageFromNPC()                                         │
│     │                                                                │
│     ├─ qiDensity = 2^(level-1)                                       │
│     ├─ statMultiplier от STR/AGI/INT                                 │
│     ├─ masteryMultiplier (50% базовое)                               │
│     └─ armorReduction игрока                                         │
│     │                                                                │
│     ▼                                                                │
│  4. eventBusClient.reportDamageDealt()                               │
│     │                                                                │
│     ▼                                                                │
│  5. Server: handleDamageDealt()                                      │
│     │                                                                │
│     ▼                                                                │
│  6. Player receives damage (LocationScene)                           │
│     │                                                                │
│     ├─ Update HP bar                                                 │
│     ├─ Visual effect (flash, damage number)                          │
│     └─ Check death                                                   │
│     │                                                                │
│     ▼                                                                │
│  7. Если HP <= 0: handlePlayerDeath()                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Интеграция calculateDamageFromNPC

```typescript
// В LocationScene.ts

import { calculateDamageFromNPC, calculateNPCQiSpent } from '@/lib/game/npc-damage-calculator';

/**
 * Обработка атаки NPC на игрока
 */
private handleNPCAttackOnPlayer(npc: NPCSprite): void {
  // Получаем данные NPC
  const npcData = this.getNPCCombatData(npc);
  
  // Получаем данные игрока
  const playerData = this.getPlayerCombatData();
  
  // Расчёт Qi для атаки
  const qiSpent = calculateNPCQiSpent(npcData.currentQi, null);
  
  // Расчёт урона
  const damageResult = calculateDamageFromNPC({
    npc: npcData,
    technique: null, // Базовая атака
    qiSpent,
    target: playerData,
  });
  
  // Применяем урон
  this.playerTakeDamage(npc, damageResult.damage);
  
  // Визуальный эффект
  this.showPlayerDamageEffect(damageResult.damage);
}

/**
 * Получить данные NPC для боя
 */
private getNPCCombatData(npc: NPCSprite): any {
  return {
    cultivation: {
      level: npc.level,
      currentQi: 100, // TODO: Реальное значение
      meridianConductivity: 50,
    },
    stats: {
      strength: 10 + npc.level * 2,
      agility: 10 + npc.level,
      intelligence: 10,
    },
  };
}

/**
 * Получить данные игрока для боя
 */
private getPlayerCombatData(): any {
  return {
    armor: this.playerArmor ?? 0,
    conductivity: this.playerConductivity ?? 50,
    vitality: this.playerMaxHp,
    meridianBuffer: 0, // TODO: Реальное значение
  };
}
```

### 4.4 Оценка времени

| Задача | Время |
|--------|-------|
| Интеграция calculateDamageFromNPC | 1 час |
| getPlayerCombatData | 30 мин |
| Визуальные эффекты | 30 мин |
| Тестирование | 30 мин |
| **Итого** | **~2.5 часа** |

---

## 📊 Итоговая оценка времени

| Этап | Описание | Время | Зависимости |
|------|----------|-------|-------------|
| 1 | Система техник игрока | 4 часа | — |
| 2 | AI State Machine | 5 часов | Этап 1 (опционально) |
| 3 | Система лута | 4.5 часа | Этап 2 |
| 4 | NPC → Player Damage | 2.5 часа | Этап 2 |
| **Итого** | | **16 часов** | |

---

## 📋 Чеклист выполнения

### Этап 1: Техники игрока
- [ ] Создать `src/types/technique-slots.ts`
- [ ] Создать `src/game/services/TechniqueSlotsManager.ts`
- [ ] Создать `src/app/api/character/techniques/equipped/route.ts`
- [ ] Добавить UI слотов в LocationScene
- [ ] Добавить горячие клавиши 1-4
- [ ] Протестировать

### Этап 2: AI State Machine
- [ ] Создать `src/types/npc-ai.ts`
- [ ] Создать `src/game/services/NPCAIController.ts`
- [ ] Интегрировать с NPCSprite
- [ ] Добавить updateAI в LocationScene
- [ ] Настроить параметры агрессии
- [ ] Протестировать

### Этап 3: Система лута
- [ ] Создать `src/types/loot.ts`
- [ ] Создать `src/game/services/LootDropManager.ts`
- [ ] Создать `src/app/api/inventory/collect-loot/route.ts`
- [ ] Добавить UI окна лута
- [ ] Интегрировать с NPC death
- [ ] Протестировать

### Этап 4: NPC → Player Damage
- [ ] Интегрировать calculateDamageFromNPC
- [ ] Добавить getPlayerCombatData
- [ ] Добавить визуальные эффекты урона
- [ ] Протестировать баланс

---

## 🔗 Связанные документы

- **[checkpoint_03_16_fight.md](./checkpoint_03_16_fight.md)** — Базовая боевая система (v4.0)
- **[checkpoint_03_16_colision.md](./checkpoint_03_16_colision.md)** — Система коллизий (v5.0)
- **[NPC_COMBAT_INTERACTIONS.md](../NPC_COMBAT_INTERACTIONS.md)** — Дизайн-документ

---

## 📝 Примечания

### Архитектурные решения

1. **State Machine для AI** — Простой и предсказуемый подход для MVP. В будущем можно расширить до Behaviour Tree.

2. **Separation of Concerns** — AI Controller отделён от NPCSprite, что позволяет легко менять реализацию AI.

3. **Event-driven архитектура** — Все взаимодействия через Event Bus для синхронизации с сервером.

4. **Permanentize on collect** — Лут становится постоянным только при сборе, а не при смерти NPC.

### Риски

1. **Производительность** — Много NPC с AI может создать нагрузку.
   - Решение: Ограничить количество активных NPC, оптимизировать update.

2. **Баланс урона** — NPC может быть слишком сильным/слабым.
   - Решение: Тестирование и настройка коэффициентов.

3. **Сохранность лута** — Потеря предметов при деспауне.
   - Решение: Увеличить время жизни контейнеров, сохранение в БД.

---

*Документ создан: 2026-03-16*
*Версия: 1.0*
*Автор: ИИ-агент*
*Статус: Планирование*
