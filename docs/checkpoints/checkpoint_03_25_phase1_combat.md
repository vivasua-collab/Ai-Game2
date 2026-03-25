# ФАЗА 1: Combat API - Серверная Миграция Боевой Системы

**Версия:** 3.2
**Дата:** 2026-03-25
**Статус:** 📋 ТЕОРЕТИЧЕСКИЙ АНАЛИЗ (v3.2 - Добавлены Qi Density, ограничения стихий, Poison/Healing/Cultivation механики)
**Приоритет:** 🔴 КРИТИЧЕСКИЙ
**Время:** 7-10 дней

---

## 🎯 ЦЕЛЬ ФАЗЫ

Перенести ВСЕ расчёты боевой системы на сервер с обеспечением корректной работы через систему координат, направлений и чувств NPC.

---

## 🔍 ГЛУБОКИЙ АУДИТ ТЕКУЩЕГО КОДА

### 1. Анализ документации

| Документ | Ключевые механики | Статус |
|----------|-------------------|--------|
| `docs/combat-system.md` | Техники, Qi, наполнение | ✅ Реализовано (клиент) |
| `docs/NPC_COMBAT_INTERACTIONS.md` | Коллизии, урон, агрессия | ✅ Реализовано (клиент) |
| `docs/NPC_AI_THEORY.md` | State Machine, Utility AI, Behavior Tree | 📋 Теория |
| `docs/body.md` | Части тела, двойная HP | ✅ Реализовано (клиент) |
| `docs/soul-system.md` | Иерархия типов (L1→L2→L3) | ✅ Единый источник истины |
| `docs/body_review.md` | Морфология (L2) | ✅ Реализовано |
| `docs/body_monsters.md` | Species (L3) | ✅ Реализовано |
| `docs/body_armor.md` | Броня, слои защиты | ✅ Реализовано |

### 2. Анализ кода боевой системы

#### 2.1 Файлы на клиенте (ПРОБЛЕМА)

| Файл | Назначение | Строки | Миграция |
|------|------------|--------|----------|
| `src/lib/game/combat-system.ts` | Расчёт урона техник | ~1140 | 🔴 На сервер |
| `src/lib/game/damage-pipeline.ts` | Пайплайн урона (10 слоёв) | ~460 | 🔴 На сервер |
| `src/lib/game/npc-damage-calculator.ts` | Урон от NPC | ~465 | 🔴 На сервер |
| `src/game/services/TechniqueSlotsManager.ts` | UI + расчёт урона | ~600 | ⚠️ UI остаётся, логика на сервер |
| `src/game/services/ProjectileManager.ts` | Снаряды + урон | ~400 | ⚠️ Визуализация остаётся, логика на сервер |
| `src/game/objects/NPCSprite.ts` | NPC + AI + урон | ~1000 | ⚠️ Sprite остаётся, AI/урон на сервер |

---

## 🎯 ГЕНЕРАТОРЫ ТЕХНИК — БЕЗ УПРОЩЕНИЙ!

### ⚠️ КРИТИЧЕСКИ ВАЖНО

> **Генераторы техник НЕ упрощаются! Они полностью мигрируют на сервер.**
> 
> Причина: Архитектура "Матрёшка" и все механики должны быть сохранены.

### 1. Архитектура "Матрёшка" (Три слоя генерации)

```
┌─────────────────────────────────────────────────────────────────┐
│                 АРХИТЕКТУРА "МАТРЁШКА" V2                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  СЛОЙ 1: БАЗА                                                    │
│  ├── qiCost = baseCapacity(type) × 2^(level-1)                  │
│  ├── capacity = baseCapacity × 2^(level-1) × masteryBonus       │
│  └── baseDamage = capacity (для справки)                         │
│                                                                  │
│  СЛОЙ 2: GRADE (НЕ зависит от уровня!)                          │
│  ├── common:      ×1.0 урона, qiCost ×1.0                       │
│  ├── refined:     ×1.2 урона, qiCost ×1.0                       │
│  ├── perfect:     ×1.4 урона, qiCost ×1.0                       │
│  └── transcendent: ×1.6 урона, qiCost ×1.0                      │
│                                                                  │
│  СЛОЙ 3: СПЕЦИАЛИЗАЦИЯ                                           │
│  ├── Подтипы combat (melee_strike, melee_weapon, ranged_*)       │
│  ├── Эффекты стихий (огонь=DoT, вода=slow, etc.)                │
│  ├── isUltimate (5% шанс для transcendent)                      │
│  └── Transcendent-эффекты (уникальные свойства)                 │
│                                                                  │
│  ИТОГ: finalDamage = capacity × gradeMult                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Ключевые формулы (НЕ ИЗМЕНЯТЬ!)

```typescript
// Формула затрат Ци
qiCost = baseCapacity(type) × 2^(level-1)

// Формула ёмкости
capacity = baseCapacity × 2^(level-1) × (1 + mastery × 0.5%)

// Формула урона
finalDamage = capacity × gradeMult

// Для cultivation: qiCost = 0, capacity = null (пассивная)
```

### 3. Базовая ёмкость по типам техники

| Тип | baseCapacity | Примечание |
|-----|--------------|------------|
| **formation** | 80 | Максимальная — долгая установка |
| **defense** | 72 | Очень высокая — резервуар для блокирования |
| **support** | 56 | Повышенная — мягкое воздействие |
| **healing** | 56 | Повышенная — мягкое воздействие |
| **combat** | 48 | Базовое, переопределяется по подтипу |
| **movement** | 40 | Ниже средней — выталкивание тела |
| **curse** | 40 | Ниже средней — пробитие защиты |
| **poison** | 40 | Ниже средней — скрытое внедрение |
| **sensory** | 32 | Низкая — расхождение веером |
| **cultivation** | null | Пассивная — не использует capacity |

### 4. Базовая ёмкость по CombatSubtype

| Подтип | baseCapacity | Обоснование |
|--------|--------------|-------------|
| **melee_strike** | 64 | Высокая — Ци в теле |
| **melee_weapon** | 48 | Средняя — через оружие |
| **ranged_projectile** | 32 | Низкая — снаряд летит |
| **ranged_beam** | 32 | Низкая — луч рассеивается |
| **ranged_aoe** | 32 | Низкая — область |

### 5. Ultimate-техники (КРИТИЧЕСКИ ВАЖНО!)

```typescript
// 5% шанс ТОЛЬКО для transcendent Grade
const ULTIMATE_CHANCE_BY_GRADE = {
  common: 0,
  refined: 0,
  perfect: 0,
  transcendent: 0.05,  // 5%
};

// Множители
const ULTIMATE_DAMAGE_MULTIPLIER = 1.3;   // +30% урона
const ULTIMATE_QI_COST_MULTIPLIER = 1.5;  // +50% стоимости Ци

// Маркер в названии
if (isUltimate) {
  name = `⚡ ${name}`;
}
```

**Ultimate-техники в Level Suppression:**
- Обычная техника: 0% урона при -5 уровнях
- Ultimate-техника: **10% урона при -5 уровнях!**

### 6. Level Suppression (Подавление уровнем)

```typescript
// Таблица подавления
const LEVEL_SUPPRESSION_TABLE = {
  0: { normal: 1.0, technique: 1.0, ultimate: 1.0 },    // Тот же уровень
  1: { normal: 0.5, technique: 0.75, ultimate: 1.0 },   // +1 уровень
  2: { normal: 0.1, technique: 0.25, ultimate: 0.5 },   // +2 уровня
  3: { normal: 0.0, technique: 0.05, ultimate: 0.25 },  // +3 уровня
  4: { normal: 0.0, technique: 0.0, ultimate: 0.1 },    // +4 уровня
  5: { normal: 0.0, technique: 0.0, ultimate: 0.0 },    // +5+ = иммунитет
};
```

### 7. Дестабилизация (Переполнение Ци)

```
При qiInput > capacity:
  1. Излишки Ци рассеиваются
  2. Урон практику = excessQi × 0.5 (50% от излишков)
  3. Урон по цели:
     - melee_strike / melee_weapon: inputQi × 0.5 (50% от влитого)
     - ranged_*: НЕТ урона (Ци разлетается)
```

### 8. Типы техник по Tier

| Tier | Типы | Особенности эффектов |
|------|------|---------------------|
| **1** | combat | Только множители урона, эффекты от стихий |
| **2** | defense, healing | Событийные эффекты (shield, heal) |
| **3** | curse, poison | DoT и дебаффы |
| **4** | support, movement, sensory | Баффы и утилити |
| **5** | cultivation | Специальные эффекты (qiRegen, efficiency) |

### 9. Эффекты стихий по типам техник

#### Combat (атакующие)

| Стихия | Эффект | Описание |
|--------|--------|----------|
| 🔥 Огонь | Горение | DoT 5% урона/тик, 3 тика |
| 💧 Вода | Замедление | -20% скорости, 2 тика |
| 🪨 Земля | Оглушение | 15% шанс стан на 1 тик |
| 💨 Воздух | Отталкивание | Отброс на 3 клетки |
| ⚡ Молния | Цепь | Урон по 2 соседним целям (50%) |
| 🌑 Пустота | Пробитие | +30% пробития брони |
| ⚪ Нейтральный | — | Без эффекта |
| ☠️ Яд | НЕДОСТУПЕН | Только для Poison техник |

#### Defense (защитные)

| Стихия | Эффект | Описание |
|--------|--------|----------|
| 🔥 Огонь | Отражение | Отражает 20% урона атакующему |
| 💧 Вода | Поглощение | +50% поглощения урона огнём |
| 🪨 Земля | Укрепление | +30% прочность щита |
| 💨 Воздух | Уклонение | +20% уклонение за щитом |
| ⚡ Молния | Шок | Шок атакующего при ударе |
| 🌑 Пустота | Антимагия | Поглощает 50% магического урона |

### 10. Файлы генераторов (МИГРАЦИЯ НА СЕРВЕР)

| Файл | Назначение | Строки | Статус |
|------|------------|--------|--------|
| `technique-generator-v2.ts` | Основной генератор техник | ~850 | 🔴 Миграция на сервер |
| `technique-generator-config-v2.ts` | Конфигурация и формулы | ~265 | 🔴 Миграция на сервер |
| `technique-capacity.ts` | Константы ёмкости | ~310 | 🔴 Миграция на сервер |
| `technique-compat.ts` | Совместимость V1↔V2 | ~150 | 🔴 Миграция на сервер |

### 11. Структура GeneratedTechniqueV2 (НЕ УПРОЩАТЬ!)

```typescript
export interface GeneratedTechniqueV2 {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type: TechniqueType;
  subtype?: CombatSubtype | DefenseSubtype | CurseSubtype | PoisonSubtype;
  element: TechniqueElement;
  level: number;
  grade: TechniqueGrade;
  isUltimate?: boolean;          // ⚠️ КРИТИЧНО для Level Suppression

  // Базовые параметры (Слой 1)
  qiCost: number;
  baseQiCost: number;
  baseDamage: number;
  baseRange: number;
  baseCapacity: number | null;

  // Вычисленные параметры
  computed: {
    finalDamage: number;
    finalQiCost: number;
    finalRange: number;
    formula: string;              // Для UI
    activeEffects: Array<{ type: string; value: number; duration?: number }>;
  };

  // Модификаторы
  modifiers: TechniqueModifiersV2;

  // Требования
  minCultivationLevel: number;
  statRequirements?: {...};

  // Метаданные
  meta: {
    seed: number;
    template: string;
    generatedAt: string;
    generatorVersion: string;
    tier: EffectTier;
  };
}
```

---

### 12. ⚠️ ЧТО НЕЛЬЗЯ ДЕЛАТЬ С ГЕНЕРАТОРАМИ

```
┌─────────────────────────────────────────────────────────────────┐
│                    ЗАПРЕЩЁННЫЕ ДЕЙСТВИЯ                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ❌ НЕ упрощать формулы расчёта                                  │
│  ❌ НЕ убирать архитектуру "Матрёшка"                            │
│  ❌ НЕ менять множители Grade                                    │
│  ❌ НЕ убирать Ultimate-техники                                  │
│  ❌ НЕ упрощать Level Suppression                                │
│  ❌ НЕ убирать механику дестабилизации                           │
│  ❌ НЕ убирать Tier-систему эффектов                             │
│  ❌ НЕ упрощать эффекты стихий                                   │
│  ❌ НЕ менять распределение Grade (60/28/10/2)                   │
│                                                                  │
│  ✅ Можно: реорганизовать код под серверную архитектуру          │
│  ✅ Можно: добавить серверные сервисы-обёртки                   │
│  ✅ Можно: интегрировать с WebSocket                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 13. ⭐ Qi Density (Плотность Ци) — КРИТИЧЕСКИ ВАЖНО!

```typescript
// Формула плотности Ци
qiDensity = 2^(cultivationLevel - 1)
```

| Уровень культивации | Плотность Ци | Базовое Ци |
|--------------------|--------------|------------|
| **L1** | 1 | 1 |
| **L2** | 2 | 2 |
| **L3** | 4 | 4 |
| **L4** | 8 | 8 |
| **L5** | 16 | 16 |
| **L6** | 32 | 32 |
| **L7** | 64 | 64 |
| **L8** | 128 | 128 |
| **L9** | 256 | 256 |

**Применение:**
- Определение совместимости с техниками
- Расчёт последствий переполнения (дестабилизация)
- Масштабирование урона от дестабилизации

---

### 14. ⭐ ОГРАНИЧЕНИЯ СТИХИЙ ПО ТИПАМ ТЕХНИК — КРИТИЧЕСКИ ВАЖНО!

> **Важно:** Не все стихии доступны для всех типов техник!

| Тип техники | Допустимые стихии | Примечание |
|-------------|-------------------|------------|
| **Combat** | fire, water, earth, air, lightning, void, neutral | Все основные |
| **Defense** | fire, water, earth, air, lightning, void, neutral | Все основные |
| **Support** | fire, water, earth, air, lightning, void, neutral | Все основные |
| **Movement** | fire, water, earth, air, lightning, void, neutral | Все основные |
| **Sensory** | fire, water, earth, air, lightning, void, neutral | Все основные |
| **Curse** | fire, water, earth, air, lightning, void, neutral | Все основные |
| **Healing** | ⚪ **neutral ТОЛЬКО** | БЕЗ стихийных бонусов! |
| **Cultivation** | ⚪ **neutral ТОЛЬКО** | БЕЗ стихий! |
| **Poison** | ☠️ **poison ТОЛЬКО** | Особая стихия! |

**ЭТО КРИТИЧНО:**
- Healing техники НЕ имеют стихийных эффектов
- Cultivation техники всегда neutral
- Poison техники — единственные с элементом poison

---

### 15. ⭐ SUPPORT БАФФЫ — КРИТИЧЕСКИ ВАЖНО!

> **⚠️ КРИТИЧЕСКИ ВАЖНО:**
> 
> **Баффы Support техник НЕ увеличивают телесные характеристики!**
> 
> Телесные характеристики (strength, agility, intelligence, conductivity) развиваются ТОЛЬКО через использование.
> Баффы дают временные модификаторы.

**Типы баффов:**

| Тип | Что баффает | Примеры |
|-----|-------------|---------|
| Damage | +% урона техник | +15% урона огнём |
| Defense | +% сопротивления | +20% сопротивления |
| Speed | +% скорости | +30% передвижения |
| Crit | +% крит шанс | +20% крит шанс |
| Special | Уникальные | Снятие дебаффов |

**Масштабирование Support по Grade:**

| Grade | Сила эффекта | Длительность | Цели |
|-------|--------------|--------------|------|
| Common | 0% | — | 0 |
| Refined | 50% | ×0.5 | 1 |
| Perfect | 100% | ×1.0 | 1-3 |
| Transcendent | 150% | ×1.5 | 1-5 |

---

### 16. ⭐ POISON МЕХАНИКА — КРИТИЧЕСКИ ВАЖНО!

**Особенности:**
- `element = 'poison'` **ТОЛЬКО!**
- `capacity = 40` (ниже средней)
- **Особая стихия, недоступная другим техникам!**

**☠️ Яд имеет уникальную механику: НЕСКОЛЬКО ДЕБАФФОВ ПО GRADE!**

| Grade | Дебафф 1 | Дебафф 2 | Дебафф 3 | Дебафф 4 |
|-------|----------|----------|----------|----------|
| **Common** | DoT (малый) | — | — | — |
| **Refined** | DoT | Замедление | — | — |
| **Perfect** | DoT (сильный) | Замедление | Слабость | — |
| **Transcendent** | DoT (max) | Замедление | Слабость+ | Блок регена |

**Типы дебаффов яда:**

| Дебафф | Эффект |
|--------|--------|
| DoT | Урон за тик (body или qi) |
| Slow | -% скорости передвижения/атаки |
| Weakness | -% урона/защиты |
| Block Regen | Нет восстановления HP/Ци |
| Paralysis | Невозможность действия |
| Necrosis | Постоянная потеря HP |

**Transcendent яды:**
- Некротический: часть HP теряется навсегда
- Нервный токсин: паралич + потеря контроля
- Кровавый яд: урон = % от макс HP
- Петрификация: превращение в камень при HP < 10%

**Отравленное оружие:**
- Можно нанести яд на оружие
- Эффект: injection при ударе
- Количество ударов: 1-10

---

### 17. ⭐ HEALING МЕХАНИКА — КРИТИЧЕСКИ ВАЖНО!

**Особенности:**
- `element = 'neutral'` **ВСЕГДА**
- `capacity = 56` (повышенная)
- **БЕЗ стихийных бонусов!**

> **Исцеление — базовая техника. Эффективность зависит ТОЛЬКО от Grade и уровня.**

**Масштабирование (ТОЛЬКО от Grade):**

| Grade | Исцеление | Доп. эффекты |
|-------|-----------|--------------|
| Common | ×1.0 | — |
| Refined | ×1.3 | +HoT 2 тика |
| Perfect | ×1.6 | +HoT 4 тика |
| Transcendent | ×2.0 | +Regen buff 5 тиков |

**Transcendent-эффекты Healing (БЕЗ стихий):**
- Феникс: воскрешение с 25% HP (1 раз/бой)
- Полное очищение: снимает все яды и проклятия
- Регенерация: 5% HP/тик 5 тиков

---

### 18. ⭐ CULTIVATION МЕХАНИКА — КРИТИЧЕСКИ ВАЖНО!

**Особенности:**
- `element = 'neutral'` **ВСЕГДА**
- `capacity = null` (пассивная)
- `qiCost = 0`
- Работает во время медитации/отдыха

**Типы культивации:**

| Тип | Описание |
|-----|----------|
| Absorption | Скорость поглощения Ци из камней |
| Filtration | Качество поглощаемого Ци |
| Condensation | Уплотнение Ци в ядре, бонус к прорыву |
| Circulation | Скорость восстановления Ци |

**Бонусы по Grade:**

| Grade | qiBonus | gradient | unnoticeability |
|-------|---------|----------|-----------------|
| Common | +10% | ×1.0 | 5% |
| Refined | +20% | ×1.2 | 10% |
| Perfect | +35% | ×1.5 | 15% |
| Transcendent | +50% | ×2.0 | 25% |

---

## 📐 СИСТЕМА КООРДИНАТ И НАПРАВЛЕНИЙ

### 1. Требования к серверной логике

Для корректной работы боевой системы на сервере нужны:

| Компонент | Описание | Тип данных |
|-----------|----------|------------|
| **Позиция** | Координаты X, Y в мире | `{ x: number, y: number }` |
| **Направление взгляда** | Угол или вектор направления | `{ dx: number, dy: number }` или `angle: number` |
| **Локация** | ID текущей локации | `locationId: string` |
| **Z-слой** | Высота (для летающих) | `z?: number` |

### 2. Структура состояния персонажа

```typescript
// src/lib/game/server/types.ts

/**
 * Полное состояние персонажа на сервере
 */
export interface ServerCharacterState {
  // === Идентификация ===
  id: string;
  sessionId: string;
  
  // === Иерархия типов (из soul-system.md) ===
  soulType: SoulType;           // L1: character, creature, spirit, construct
  morphology: BodyMorphology;   // L2: humanoid, quadruped, etc.
  speciesId: string;            // L3: human, wolf, ghost, etc.
  
  // === Позиция ===
  position: Vector2D;
  direction: Vector2D;          // Направление взгляда (нормализованный вектор)
  locationId: string;
  z?: number;                   // Высота (для летающих)
  
  // === Тело ===
  bodyMaterial: BodyMaterial;   // organic, scaled, chitin, ethereal, mineral, chaos
  sizeClass: SizeClass;         // tiny, small, medium, large, huge
  
  // === Боевое состояние ===
  hp: number;
  maxHp: number;
  qi: number;
  maxQi: number;
  
  // === Характеристики ===
  cultivationLevel: number;
  strength: number;
  agility: number;
  intelligence: number;
  vitality: number;
  conductivity: number;
  
  // === Экипировка ===
  armor: number;
  weapon?: WeaponState;
  
  // === Техники ===
  techniques: TechniqueState[];
  activeTechnique?: string;
  
  // === Состояние ===
  isAlive: boolean;
  isMoving: boolean;
  isAttacking: boolean;
  lastActionTime: number;
}
```

---

## 👁️ СИСТЕМА ЧУВСТВ NPC (v3.0)

### 1. Иерархия чувств

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ИЕРАРХИЯ ЧУВСТВ ПО ВАЖНОСТИ                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ПРИОРИТЕТ 1: PAIN (Боль) — МГНОВЕННАЯ РЕАКЦИЯ                             │
│   └── Триггер: получение урона                                              │
│   └── Действие: немедленный рефлекс (flinch, flee)                          │
│                                                                              │
│   ПРИОРИТЕТ 2: TOUCH (Осязание) — КОНТАКТ                                   │
│   └── Триггер: физический контакт (collision)                               │
│   └── Действие: немедленная реакция на столкновение                         │
│                                                                              │
│   ПРИОРИТЕТ 3: QI_SENSE (Чувство Ци) — ПАССИВНОЕ СКАНИРОВАНИЕ               │
│   └── Триггер: наличие культиваторов поблизости                             │
│   └── Действие: оценка угрозы по уровню Ци                                  │
│                                                                              │
│   ПРИОРИТЕТ 4: VISION (Зрение) — АКТИВНОЕ НАБЛЮДЕНИЕ                        │
│   └── Триггер: цель в поле зрения                                           │
│   └── Действие: визуальное обнаружение                                      │
│                                                                              │
│   ПРИОРИТЕТ 5: HEARING (Слух) — ПАССИВНОЕ НАБЛЮДЕНИЕ                        │
│   └── Триггер: звуковые события                                             │
│   └── Действие: приблизительное определение направления                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. ⭐ Настраиваемые радиусы чувств

#### 2.1 Базовые радиусы по SoulType (L1)

| SoulType | Vision | Hearing | Qi Sense | Примечание |
|----------|--------|---------|----------|------------|
| **character** | 15м | 20м | 50м | Базовые человеческие чувства |
| **creature** | 20м | 30м | 30м | Обострённые чувства животных |
| **spirit** | 10м | 15м | 100м | Слабое физическое, сильное духовное |
| **construct** | 8м | 5м | 20м | Ограниченные чувства големов |
| **artifact** | 5м | 0м | 50м | Минимальные чувства предметов |

#### 2.2 Модификаторы по Morphology (L2)

| Morphology | Vision | Hearing | Qi Sense | Особенности |
|------------|--------|---------|----------|-------------|
| **humanoid** | ×1.0 | ×1.0 | ×1.0 | Базовые значения |
| **quadruped** | ×1.3 | ×1.5 | ×0.8 | Обострённые физические чувства |
| **bird** | ×2.0 | ×1.0 | ×0.7 | Орлиное зрение |
| **serpentine** | ×0.5 | ×1.5 | ×1.2 | Тепловое зрение, чувствительность к вибрациям |
| **arthropod** | ×0.3 | ×2.0 | ×0.5 | Множество простых глаз, виброчувствительность |
| **amorphous** | ×0.0 | ×0.5 | ×2.0 | Нет глаз, всенаправленное Ци-чувство |
| **hybrid_centaur** | ×1.2 | ×1.3 | ×1.0 | Комбинированные чувства |
| **hybrid_mermaid** | ×0.8 | ×1.5 (вода) | ×1.0 | Специализация для воды |

#### 2.3 Модификаторы по SizeClass

| SizeClass | Vision | Hearing | Qi Sense | Обоснование |
|-----------|--------|---------|----------|-------------|
| **tiny** | ×0.5 | ×1.0 | ×0.5 | Маленький радиус обзора |
| **small** | ×0.75 | ×1.0 | ×0.75 | |
| **medium** | ×1.0 | ×1.0 | ×1.0 | Базовые значения |
| **large** | ×1.3 | ×1.2 | ×1.2 | Выше точка обзора |
| **huge** | ×1.6 | ×1.5 | ×1.5 | Доминирующая позиция |

#### 2.4 Модификаторы по BodyMaterial

| Material | Vision | Hearing | Pain | Touch | Qi Sense |
|----------|--------|---------|------|-------|----------|
| **organic** | ×1.0 | ×1.0 | ×1.0 | ×1.0 | ×1.0 |
| **scaled** | ×0.9 | ×0.8 | ×0.7 | ×0.5 | ×1.0 |
| **chitin** | ×0.5 | ×1.5 | ×0.5 | ×0.3 | ×0.8 |
| **ethereal** | ×0.5 | ×0.7 | ×0.0* | ×0.0* | ×2.0 |
| **mineral** | ×0.3 | ×0.5 | ×0.3 | ×0.2 | ×0.5 |
| **chaos** | ×0.5-1.5 | ×0.5-1.5 | ×0.0-1.0 | ×0.0-1.0 | ×0.5-2.0 |

*Духи не чувствуют физическую боль/осязание, но уязвимы к духовному урону

---

### 3. ⭐ Решение проблемы "безглазых" существ

#### 3.1 Проблема
В системе тела нет отдельного органа "глаз". Как работает зрение?

#### 3.2 Решение: Центр восприятия

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ЦЕНТР ВОСПРИЯТИЯ (Perception Center)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Для физических существ (organic, scaled, chitin, mineral):                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ MORPHOLOGY          │ PERCEPTION CENTER                             │   │
│   ├─────────────────────┼───────────────────────────────────────────────┤   │
│   │ humanoid            │ head (голова)                                 │   │
│   │ quadruped           │ head (голова)                                 │   │
│   │ bird                │ head (голова)                                 │   │
│   │ serpentine          │ head (голова) + thermal_sense (всё тело)     │   │
│   │ arthropod           │ cephalothorax (головогрудь)                   │   │
│   │ hybrid_*            │ head (человеческая часть)                     │   │
│   └─────────────────────┴───────────────────────────────────────────────┘   │
│                                                                              │
│   Для духов и бесплотных (ethereal, chaos):                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ MORPHOLOGY          │ PERCEPTION CENTER                             │   │
│   ├─────────────────────┼───────────────────────────────────────────────┤   │
│   │ amorphous (spirit)  │ core (ядро) — всенаправленное Ци-восприятие   │   │
│   │ construct           │ core (энергетическое ядро)                    │   │
│   │ chaos               │ essence (сущность)                            │   │
│   └─────────────────────┴───────────────────────────────────────────────┘   │
│                                                                              │
│   ПРАВИЛА:                                                                   │
│   1. Если perception_center повреждён → штраф к чувствам (-50% или более)   │
│   2. Если perception_center уничтожен → слепота, но Qi Sense работает       │
│   3. Для духов: повреждение core = штраф ко ВСЕМ чувствам                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.3 Конфигурация восприятия в коде

```typescript
// src/lib/game/server/ai/senses/perception-config.ts

/**
 * Конфигурация центра восприятия для морфологии
 */
export interface PerceptionCenterConfig {
  /** Часть тела, отвечающая за восприятие */
  bodyPart: string;
  
  /** Тип восприятия */
  perceptionType: 'visual' | 'qi_based' | 'thermal' | 'vibration' | 'omnidirectional';
  
  /** Зависимости от состояния части тела */
  damagePenalty: {
    damaged: number;    // Штраф при повреждении (0-1)
    crippled: number;   // Штраф при параличе (0-1)
    severed: number;    // Штраф при уничтожении (0-1)
  };
  
  /** Направленность восприятия */
  directionality: 'frontal' | 'omnidirectional' | 'hemispheric';
  
  /** Угол обзора (для directional) */
  fieldOfView?: number;  // градусы
}

/**
 * Карта центров восприятия по морфологии
 */
export const PERCEPTION_CENTERS: Record<BodyMorphology, PerceptionCenterConfig> = {
  humanoid: {
    bodyPart: 'head',
    perceptionType: 'visual',
    damagePenalty: { damaged: 0.5, crippled: 0.8, severed: 1.0 },
    directionality: 'frontal',
    fieldOfView: 120,
  },
  
  quadruped: {
    bodyPart: 'head',
    perceptionType: 'visual',
    damagePenalty: { damaged: 0.5, crippled: 0.8, severed: 1.0 },
    directionality: 'frontal',
    fieldOfView: 180,  // Шире за счёт положения глаз
  },
  
  bird: {
    bodyPart: 'head',
    perceptionType: 'visual',
    damagePenalty: { damaged: 0.5, crippled: 0.8, severed: 1.0 },
    directionality: 'frontal',
    fieldOfView: 240,  // Очень широкое поле зрения
  },
  
  serpentine: {
    bodyPart: 'head',
    perceptionType: 'thermal',  // Тепловое зрение + обычное
    damagePenalty: { damaged: 0.5, crippled: 0.8, severed: 1.0 },
    directionality: 'frontal',
    fieldOfView: 100,
    // Особенность: thermal_sense работает от всего тела
  },
  
  arthropod: {
    bodyPart: 'cephalothorax',
    perceptionType: 'visual',  // Множество простых глаз
    damagePenalty: { damaged: 0.3, crippled: 0.6, severed: 1.0 },
    directionality: 'omnidirectional',  // Всенаправленное
    fieldOfView: 360,
  },
  
  amorphous: {
    bodyPart: 'core',
    perceptionType: 'qi_based',
    damagePenalty: { damaged: 0.7, crippled: 0.9, severed: 1.0 },
    directionality: 'omnidirectional',
    // Духи воспринимают мир через Ци, а не глаза
  },
  
  hybrid_centaur: {
    bodyPart: 'head',
    perceptionType: 'visual',
    damagePenalty: { damaged: 0.5, crippled: 0.8, severed: 1.0 },
    directionality: 'frontal',
    fieldOfView: 150,
  },
  
  hybrid_mermaid: {
    bodyPart: 'head',
    perceptionType: 'visual',
    damagePenalty: { damaged: 0.5, crippled: 0.8, severed: 1.0 },
    directionality: 'frontal',
    fieldOfView: 180,
  },
  
  hybrid_harpy: {
    bodyPart: 'head',
    perceptionType: 'visual',
    damagePenalty: { damaged: 0.5, crippled: 0.8, severed: 1.0 },
    directionality: 'frontal',
    fieldOfView: 270,  // Как у птиц
  },
  
  hybrid_lamia: {
    bodyPart: 'head',
    perceptionType: 'thermal',  // Как у змей
    damagePenalty: { damaged: 0.5, crippled: 0.8, severed: 1.0 },
    directionality: 'frontal',
    fieldOfView: 100,
  },
};
```

---

### 4. ⭐ Таблица соответствий для NPC генераторов

#### 4.1 Соответствие Species → Чувства

```typescript
// src/lib/game/server/ai/senses/species-senses-map.ts

import { SPECIES_PRESETS } from '@/data/presets/species-presets';
import type { SensesConfig } from './types';

/**
 * Рассчитать конфигурацию чувств для вида
 */
export function calculateSensesConfig(speciesId: string): SensesConfig {
  const species = SPECIES_PRESETS.find(s => s.id === speciesId);
  if (!species) {
    return getDefaultSensesConfig();
  }
  
  // Базовые значения по SoulType
  const baseConfig = getBaseSensesBySoulType(species.soulType);
  
  // Модификаторы по Morphology
  const morphMods = getMorphologyModifiers(species.morphology);
  
  // Модификаторы по SizeClass
  const sizeMods = getSizeModifiers(species.sizeClass);
  
  // Модификаторы по BodyMaterial
  const materialMods = getMaterialModifiers(species.bodyMaterial);
  
  // Итоговый расчёт
  return {
    vision: {
      enabled: species.morphology !== 'amorphous' || species.soulType === 'spirit',
      range: baseConfig.vision.range * morphMods.vision * sizeMods.vision,
      fieldOfView: PERCEPTION_CENTERS[species.morphology]?.fieldOfView || 120,
      nightPenalty: calculateNightPenalty(species),
      perceptionCenter: PERCEPTION_CENTERS[species.morphology]?.bodyPart || 'head',
    },
    
    hearing: {
      enabled: true,
      range: baseConfig.hearing.range * morphMods.hearing * sizeMods.hearing,
      sensitivity: 1.0 * morphMods.hearing,
    },
    
    pain: {
      enabled: species.bodyMaterial !== 'ethereal',
      threshold: calculatePainThreshold(species),
      damageMultiplier: materialMods.pain,
    },
    
    touch: {
      enabled: species.bodyMaterial !== 'ethereal',
      range: 0,  // Только контакт
      sensitivity: materialMods.touch,
    },
    
    qiSense: {
      enabled: species.capabilities.canCultivate || species.soulType === 'spirit',
      range: baseConfig.qiSense.range * morphMods.qiSense * sizeMods.qiSense,
      levelRequired: species.capabilities.canCultivate ? 1 : 0,
    },
  };
}
```

#### 4.2 Полная таблица Species → Senses

| Species | SoulType | Morphology | Material | Size | Vision | Hearing | Qi Sense | Pain | Perception Center |
|---------|----------|------------|----------|------|--------|---------|----------|------|-------------------|
| **human** | character | humanoid | organic | medium | 15м | 20м | 50м | ✓ | head |
| **elf** | character | humanoid | organic | medium | 18м | 22м | 60м | ✓ | head |
| **demon** | character | humanoid | organic | medium | 15м | 20м | 75м | ✓ | head |
| **giant** | character | humanoid | organic | huge | 24м | 30м | 75м | ✓ | head |
| **beastkin** | character | humanoid | organic | medium | 18м | 26м | 50м | ✓ | head |
| **wolf** | creature | quadruped | organic | medium | 26м | 45м | 24м | ✓ | head |
| **tiger** | creature | quadruped | organic | large | 34м | 54м | 29м | ✓ | head |
| **bear** | creature | quadruped | organic | large | 26м | 36м | 29м | ✓ | head |
| **snake** | creature | serpentine | scaled | small | 11м | 23м | 23м | ✓ | head + body |
| **lizard** | creature | quadruped | scaled | small | 15м | 23м | 18м | ✓ | head |
| **eagle** | creature | bird | organic | small | 30м | 20м | 18м | ✓ | head |
| **hawk** | creature | bird | organic | small | 30м | 20м | 14м | ✓ | head |
| **dragon** | creature | quadruped | scaled | huge | 48м | 45м | 90м | ✓ | head |
| **phoenix** | creature | bird | ethereal | large | 24м | 18м | 120м | ✗ | head |
| **spider** | creature | arthropod | chitin | small | 6м | 45м | 12м | ✓ | cephalothorax |
| **giant_spider** | creature | arthropod | chitin | medium | 9м | 60м | 18м | ✓ | cephalothorax |
| **centipede** | creature | arthropod | chitin | small | 6м | 45м | 12м | ✓ | cephalothorax |
| **scorpion** | creature | arthropod | chitin | small | 6м | 30м | 12м | ✓ | cephalothorax |
| **fire_elemental** | spirit | amorphous | ethereal | medium | 5м | 11м | 200м | ✗ | core |
| **water_elemental** | spirit | amorphous | ethereal | medium | 5м | 11м | 200м | ✗ | core |
| **wind_elemental** | spirit | amorphous | ethereal | medium | 5м | 11м | 200м | ✗ | core |
| **ghost** | spirit | amorphous | ethereal | medium | 5м | 11м | 100м | ✗ | core |
| **celestial_spirit** | spirit | amorphous | ethereal | medium | 5м | 11м | 200м | ✗ | core |
| **centaur** | character | hybrid_centaur | organic | large | 23м | 31м | 60м | ✓ | head |
| **mermaid** | character | hybrid_mermaid | organic | medium | 12м | 30м* | 50м | ✓ | head |

*Русалки имеют усиленный слух в воде

---

### 5. ✨ Qi Sense и "Давление Ци" (Qi Pressure)

#### 5.1 Концепция

В жанре культивации называется:
- **Qi Pressure** (Давление Ци) — стандартный термин
- **Spiritual Sense** (Духовное чувство) — для средних уровней
- **Divine Sense** (Божественное чувство) — для L7+

#### 5.2 Механика превосходства

```typescript
// src/lib/game/server/ai/senses/qi-pressure.ts

/**
 * Определение типа давления Ци
 * 
 * @param sensorLevel - уровень культивации сенсора
 * @param targetLevel - уровень культивации цели
 */
export function determinePressureType(
  sensorLevel: number,
  targetLevel: number
): PressureType {
  const diff = targetLevel - sensorLevel;
  
  if (diff >= 5) return 'supreme';     // Цель — Верховный (невозможно сопротивляться)
  if (diff >= 3) return 'superior';    // Цель — Превосходящий (сильное давление)
  if (diff >= 1) return 'stronger';    // Цель — Сильнее (ощутимое давление)
  if (diff >= -1) return 'equal';      // Равные
  if (diff >= -3) return 'weaker';     // Цель — Слабее (ощущение силы)
  if (diff >= -5) return 'inferior';   // Цель — Низшая (лёгкое презрение)
  return 'prey';                       // Цель — Жертва (полное пренебрежение)
}

/**
 * Влияние давления Ци на поведение NPC
 */
export const PRESSURE_BEHAVIOR: Record<PressureType, NPCBehaviorModifier> = {
  supreme: {
    fear: 1.0,
    fleeChance: 0.9,
    paralysisChance: 0.5,
    attackPenalty: -0.8,
    dialogue: 'trembling',
  },
  
  superior: {
    fear: 0.7,
    fleeChance: 0.6,
    paralysisChance: 0.2,
    attackPenalty: -0.5,
    dialogue: 'deferential',
  },
  
  stronger: {
    fear: 0.4,
    fleeChance: 0.3,
    paralysisChance: 0,
    attackPenalty: -0.2,
    dialogue: 'cautious',
  },
  
  equal: {
    fear: 0,
    fleeChance: 0,
    paralysisChance: 0,
    attackPenalty: 0,
    dialogue: 'normal',
  },
  
  weaker: {
    fear: 0,
    fleeChance: 0,
    paralysisChance: 0,
    attackPenalty: 0.1,  // Бонус уверенности
    dialogue: 'confident',
  },
  
  inferior: {
    fear: 0,
    fleeChance: 0,
    paralysisChance: 0,
    attackPenalty: 0.2,
    dialogue: 'arrogant',
  },
  
  prey: {
    fear: 0,
    fleeChance: 0,
    paralysisChance: 0,
    attackPenalty: 0.3,
    dialogue: 'dismissive',
    // Может игнорировать жертву
  },
};
```

---

### 6. Интеграция с AI

#### 6.1 Обновление SensesConfig

```typescript
// src/lib/game/server/ai/senses/types.ts

/**
 * Полная конфигурация чувств NPC
 */
export interface SensesConfig {
  vision: VisionConfig;
  hearing: HearingConfig;
  pain: PainConfig;
  touch: TouchConfig;
  qiSense: QiSenseConfig;
}

export interface VisionConfig {
  enabled: boolean;
  range: number;                // Метры
  fieldOfView: number;          // Градусы (120 = человек)
  nightPenalty: number;         // Снижение ночью (0.0 - 1.0)
  perceptionCenter: string;     // Часть тела для восприятия
}

export interface HearingConfig {
  enabled: boolean;
  range: number;
  sensitivity: number;          // Множитель громкости
}

export interface PainConfig {
  enabled: boolean;
  threshold: number;            // Минимальный урон для реакции
  damageMultiplier: number;     // Множитель чувствительности к боли
}

export interface TouchConfig {
  enabled: boolean;
  range: number;                // 0 = только контакт
  sensitivity: number;          // Чувствительность к прикосновениям
}

export interface QiSenseConfig {
  enabled: boolean;
  range: number;
  levelRequired: number;        // Минимальный уровень культивации
}

/**
 * Результат работы чувства
 */
export interface SenseResult {
  type: SenseType;
  detected: boolean;
  targets: DetectedTarget[];
  intensity: number;            // 0.0 - 1.0
  timestamp: number;
  
  // Специфичные данные
  pressureType?: PressureType;  // Для Qi Sense
  perceptionCenterDamaged?: boolean;
}
```

---

## 📊 ТАБЛИЦА СООТВЕТСТВИЙ: ВИДЫ → ЧАСТИ ТЕЛА → ЧУВСТВА

### 7.1 Полная матрица

| Morphology | Body Parts | Perception Center | Vision | Hearing | Pain | Touch | Qi Sense |
|------------|-----------|-------------------|--------|---------|------|-------|----------|
| **humanoid** | head, torso, heart, arms(2), hands(2), legs(2), feet(2) | head | head | all | all | all | core |
| **quadruped** | head, torso, heart, legs(4), tail | head | head | all | all | all | core |
| **bird** | head, torso, heart, wings(2), legs(2), tail | head | head | all | all | all | core |
| **serpentine** | head, torso, heart, segments(N), tail | head + body | head | body | all | all | core |
| **arthropod** | cephalothorax, abdomen, heart, legs(8), pedipalps, chelicerae | cephalothorax | cephalothorax | legs | all | legs | core |
| **amorphous** | core, essence | core | core (qi) | core | — | — | core |
| **hybrid_centaur** | head, torso_human, torso_horse, heart, arms(2), horse_legs(4), tail | head | head | all | all | all | core |
| **hybrid_mermaid** | head, torso, heart, arms(2), hands(2), fish_tail | head | head | all | all | all | core |
| **hybrid_harpy** | head, torso, heart, wings(2), legs(2) | head | head | all | all | all | core |
| **hybrid_lamia** | head, torso, heart, arms(2), hands(2), snake_body, tail | head | head + body | body | all | all | core |

---

## 📁 ФАЙЛЫ ДЛЯ СОЗДАНИЯ

### Новая структура серверной логики

```
src/lib/game/server/
├── index.ts                    # Экспорты
├── types.ts                    # Общие типы
│
├── combat/
│   ├── combat-service.ts       # Главный сервис боя
│   ├── damage-calculator.ts    # Калькулятор урона
│   ├── technique-service.ts    # Сервис техник
│   ├── qi-manager.ts           # Управление Qi
│   └── types.ts                # Типы боя
│
├── ai/
│   ├── ai-service.ts           # Главный AI сервис
│   ├── npc-ai-manager.ts       # Менеджер NPC AI
│   ├── spinal-server.ts        # Серверный Spinal
│   ├── senses/                 # ⭐ Система чувств
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── perception-config.ts  # Конфигурация центров восприятия
│   │   ├── species-senses-map.ts # Карта вид→чувства
│   │   ├── vision.ts             # Зрение
│   │   ├── hearing.ts            # Слух
│   │   ├── pain.ts               # Боль
│   │   ├── touch.ts              # Осязание
│   │   ├── qi-sense.ts           # Чувство Ци
│   │   ├── qi-pressure.ts        # Давление Ци
│   │   └── manager.ts            # Менеджер чувств
│   └── types.ts                # Типы AI
│
└── sync/
    ├── state-sync.ts           # Синхронизация состояния
    └── broadcast.ts            # Broadcast утилиты
```

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ ФАЗЫ 1

### Обязательные

- [ ] Создана система координат на сервере
- [ ] Создана система направлений взгляда
- [ ] Создана конфигурация центров восприятия
- [ ] Создана карта вид→чувства с настраиваемыми радиусами
- [ ] Реализованы все 5 чувств: vision, hearing, pain, touch, qiSense
- [ ] Qi Sense с Qi Pressure работает
- [ ] Создан `server/combat/damage-calculator.ts`
- [ ] Мигрирован пайплайн урона
- [ ] Духи (amorphous) корректно воспринимают мир через Ци
- [ ] Клиент НЕ рассчитывает урон

### Код ревью

- [ ] Нет `damage` параметра от клиента
- [ ] Нет `hp -=` на клиенте
- [ ] Нет `calculateDamage()` на клиенте
- [ ] Все расчёты в `src/lib/game/server/`
- [ ] Чувства NPC на сервере
- [ ] Радиусы чувств зависят от SoulType + Morphology + Size + Material

---

## 📊 ПРОГРЕСС

| Задача | Статус | Время |
|--------|--------|-------|
| Анализ текущего кода | ✅ Завершён | 2 часа |
| Анализ документации души/тела | ✅ Завершён | 3 часа |
| Проектирование системы координат | 📋 | 1 час |
| Проектирование системы чувств | 📋 | 3 часа |
| Создание perception-config.ts | 📋 | 2 часа |
| Создание species-senses-map.ts | 📋 | 3 часа |
| Создание `server/types.ts` | 📋 | 1 час |
| Создание `senses/*` | 📋 | 6 часов |
| Миграция `damage-calculator.ts` | 📋 | 4 часа |
| Создание `combat-service.ts` | 📋 | 3 часа |
| Обновление WebSocket | 📋 | 2 часа |
| Интеграция с AI | 📋 | 4 часа |
| Тестирование | 📋 | 4 часа |

**Итого:** ~38 часов (5-7 дней)

---

## 🚀 СЛЕДУЮЩАЯ ФАЗА

После завершения Фазы 1 → [checkpoint_03_25_phase2_techniques.md](./checkpoint_03_25_phase2_techniques.md)

---

## 📚 СВЯЗАННЫЕ ДОКУМЕНТЫ

### Боевая система
- [docs/combat-system.md](../combat-system.md) - Текущая боевая система
- [docs/NPC_COMBAT_INTERACTIONS.md](../NPC_COMBAT_INTERACTIONS.md) - Взаимодействия
- [docs/NPC_AI_THEORY.md](../NPC_AI_THEORY.md) - Теория AI

### Иерархия типов
- [docs/soul-system.md](../soul-system.md) - Иерархия типов (L1→L2→L3)
- [docs/body.md](../body.md) - Система тела (база)
- [docs/body_review.md](../body_review.md) - Морфология (L2)
- [docs/body_monsters.md](../body_monsters.md) - Species (L3)
- [docs/body_armor.md](../body_armor.md) - Броня

### Техники (КРИТИЧНО!)
- [docs/technique-system-v2.md](../technique-system-v2.md) - Система техник V2.8
- [docs/matryoshka-architecture.md](../matryoshka-architecture.md) - Архитектура "Матрёшка"
- [docs/generators.md](../generators.md) - Документация генераторов V4

### Генераторы
- `src/lib/generator/technique-generator-v2.ts` - Генератор техник V5
- `src/lib/generator/technique-generator-config-v2.ts` - Конфигурация
- `src/lib/constants/technique-capacity.ts` - Константы ёмкости
- `src/lib/generator/npc-generator.ts` - Генератор NPC V2.1
- `src/data/presets/species-presets.ts` - Пресеты видов

---

*Документ создан: 2026-03-25*
*Версия: 3.1 (система чувств + генераторы техник БЕЗ упрощений)*
*Зависимости: soul-system.md, body_review.md, body_monsters.md, technique-system-v2.md, matryoshka-architecture.md*
