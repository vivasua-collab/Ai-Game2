# 🎲 Генераторы системы

**Дата обновления:** 2026-03-21
**Версия:** 5.0

---

## 📊 Обзор генераторов

Все генераторы работают через API endpoints и используют единую архитектуру генерации.

### Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                     API ENDPOINTS                                │
├─────────────────────────────────────────────────────────────────┤
│ /api/generator/techniques  → technique-generator-v2.ts          │
│ /api/generator/equipment   → equipment-generator-v2.ts          │
│ /api/generator/npc         → npc-generator.ts                   │
│ /api/generator/npc-full    → npc-full-generator.ts              │
│ /api/generator/formations  → formation-generator.ts             │
│ /api/generator/items       → preset-storage.ts                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     CORE GENERATORS                              │
├─────────────────────────────────────────────────────────────────┤
│ technique-generator-v2.ts ───┐                                   │
│ equipment-generator-v2.ts ───┼──→ base-item-generator.ts        │
│ npc-generator.ts ────────────┤    (seededRandom, Rarity)        │
│ formation-generator.ts ──────┘                                   │
│ consumable-generator.ts                                          │
│ qi-stone-generator.ts                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     SUPPORT MODULES                              │
├─────────────────────────────────────────────────────────────────┤
│ id-config.ts, id-counters.ts ─── ID генерация                   │
│ lore-formulas.ts ─────────────── Формулы культивации            │
│ grade-selector.ts ───────────── Выбор грейда                    │
│ grade-validator.ts ───────────── Валидация грейда                │
│ name-generator.ts ───────────── Имена предметов                 │
│ preset-storage.ts ───────────── Сохранение пресетов             │
│ generated-objects-loader.ts ─── Загрузка из файлов              │
│ soul-mapping.ts ─────────────── Маппинг душ                     │
│ technique-generator-config-v2.ts ─ Конфигурация техник V2       │
│ technique-capacity.ts ───────── Константы ёмкости               │
│ effects/ ────────────────────── Эффекты по Tier                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚔️ Генератор техник (V5.0 — "Матрёшка" v2)

**Endpoint:** `/api/generator/techniques`
**Файл:** `src/lib/generator/technique-generator-v2.ts`
**Конфиг:** `src/lib/generator/technique-generator-config-v2.ts`
**Версия:** 5.0.0 (требуется обновление с 4.0.0)

### Ключевые принципы V2

1. **Урон = Ёмкость × Grade** (НЕ qiCost!)
2. **Формулы вместо хардкод таблиц**
3. **Архитектура "Матрёшка"** — три слоя генерации
4. **Система тиков** — 1 тик = 1 минута игрового времени

### Три слоя генерации

```
┌─────────────────────────────────────────────────────────────────┐
│                 АРХИТЕКТУРА "МАТРЁШКА" V2                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  СЛОЙ 1: БАЗА                                                    │
│  ├── qiCost = 10 × 1.5^(level-1)                                │
│  ├── capacity = baseCapacity × 2^(level-1) × masteryBonus       │
│  └── baseDamage = qiCost (для справки, НЕ для урона!)           │
│                                                                  │
│  СЛОЙ 2: GRADE (НЕ зависит от уровня!)                          │
│  ├── common:      ×1.0 урона, qiCost ×1.0                       │
│  ├── refined:     ×1.2 урона, qiCost ×1.0                       │
│  ├── perfect:     ×1.4 урона, qiCost ×1.0                       │
│  └── transcendent: ×1.6 урона, qiCost ×1.0                      │
│                                                                  │
│  СЛОЙ 3: БОНУСЫ                                                  │
│  ├── Сила эффекта от Grade (0% ~ 150%)                          │
│  ├── Эффект от стихии (по типу техники)                         │
│  └── Transcendent-эффект (только для Transcendent)              │
│                                                                  │
│  ИТОГ: finalDamage = capacity × gradeMult                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ⚠️ КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ (V5.0)

| Было (V4.0) | Стало (V5.0) |
|-------------|--------------|
| `finalDamage = qiSpent × gradeMult` | `finalDamage = capacity × gradeMult` |
| `GRADE_QI_COST_MULTIPLIERS` разные | Все = 1.0 |
| `specDamageMult` для подтипов | УБРАТЬ из формулы урона |
| Эффекты в ходах | Эффекты в тиках |

### Входные параметры

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `types` | `TechniqueType[]` | все типы | Типы техник |
| `level` | `number` | — | Уровень (1-9) |
| `minLevel` | `number` | 1 | Минимальный уровень |
| `maxLevel` | `number` | 9 | Максимальный уровень |
| `grade` | `TechniqueGrade` | — | Фиксированный Grade |
| `count` | `number` | 10 | Количество |
| `mode` | `'replace' \| 'append'` | replace | Режим |
| `combatSubtype` | `CombatSubtype` | — | Подтип боя |
| `elements` | `TechniqueElement[]` | все | Элементы (7 стихий) |
| `seed` | `number` | Date.now() | Seed генерации |

### Структура результата (GeneratedTechniqueV2)

```typescript
interface GeneratedTechniqueV2 {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type: TechniqueType;
  subtype?: CombatSubtype | DefenseSubtype | CurseSubtype | PoisonSubtype;
  element: TechniqueElement;  // 7 стихий
  level: number;
  grade: TechniqueGrade;

  // Базовые параметры (Слой 1)
  baseQiCost: number;
  baseDamage: number;      // = qiCost (для справки)
  baseRange: number;
  baseCapacity: number | null;

  // Вычисленные параметры
  computed: {
    capacity: number;      // Ёмкость техники
    finalDamage: number;   // capacity × gradeMult
    finalQiCost: number;   // = baseQiCost (×1.0)
    finalRange: number;
    formula: string;       // Формула для UI
    activeEffects: Array<{ 
      type: string; 
      value: number; 
      duration?: number;   // В ТИКАХ!
    }>;
    elementBonus?: {       // Бонус от стихии
      type: string;
      value: number;
    };
    transcendentBonus?: {  // Transcendent-эффект
      type: string;
      value: number;
    };
  };

  // Модификаторы
  modifiers: TechniqueModifiersV2;

  // Требования
  minCultivationLevel: number;
  maxCultivationLevel: number;  // = level практики (резонанс)
  statRequirements?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  };

  // Метаданные
  meta: {
    seed: number;
    template: string;
    generatedAt: string;
    generatorVersion: string;  // "5.0.0"
    tier: EffectTier;
  };
}
```

### Формула урона (ПРАВИЛЬНАЯ)

> **Урон = Ёмкость × Grade**

```
finalDamage = capacity × gradeMult

где:
  capacity = baseCapacity(type) × 2^(level-1) × masteryBonus
  gradeMult = множитель Grade (×1.0 ~ ×1.6)
```

### Пример расчёта

**melee_strike L5, Grade Perfect, mastery 0%:**

```
baseCapacity = 64 (melee_strike)
levelMultiplier = 2^4 = 16
masteryBonus = 1.0

capacity = 64 × 16 × 1.0 = 1024
gradeMult = 1.4 (Perfect)
finalDamage = 1024 × 1.4 = 1433 урона
```

### Дестабилизация

```
При переполнении (qiInput > capacity):
  - Излишки Ци рассеиваются
  - Урон практику = excessQi × 0.5
  - Урон по цели (только melee!) = inputQi × 0.5
  - Для ranged_*: урона по цели НЕТ
```

### Типы техник по Tier

| Tier | Типы | Особенности |
|------|------|-------------|
| 1 | combat | Только множители урона, эффекты от стихий |
| 2 | defense, healing | Событийные эффекты (shield, heal) |
| 3 | curse, poison | DoT и дебаффы |
| 4 | support, movement, sensory | Баффы и утилити |
| 5 | cultivation | Специальные эффекты |

### Система стихий (7 элементов)

| Стихия | Emoji | Характер |
|--------|-------|----------|
| Огонь | 🔥 | Горение, DoT |
| Вода | 💧 | Замедление, контроль |
| Земля | 🪨 | Оглушение, стун |
| Воздух | 💨 | Отталкивание |
| Молния | ⚡ | Цепной урон |
| Пустота | 🌑 | Пробитие, антимагия |
| Нейтральный | ⚪ | Чистый Ци |

> **Камни Ци НЕ имеют стихийного окраса.**

---

## 🛡️ Генератор экипировки (V2 - "Матрёшка")

**Endpoint:** `/api/generator/equipment`
**Файл:** `src/lib/generator/equipment-generator-v2.ts`

### Архитектура "Матрёшка"

```
Base → Material → Grade → Final
EffectiveStats = Base × MaterialProperties × GradeMultipliers
```

### Поддерживаемые типы

| Тип | Функция | Описание |
|-----|---------|----------|
| `weapon` | `generateWeaponV2()` | Оружие всех видов |
| `armor` | `generateArmorV2()` | Броня для всех слотов |
| `charger` | `generateChargerV2()` | Зарядники Ци |
| `accessory` | `generateAccessoryV2()` | Аксессуары |
| `artifact` | `generateArtifactV2()` | Артефакты |

---

## 👥 Генератор NPC (V2.1)

**Endpoint:** `/api/generator/npc`
**Файл:** `src/lib/generator/npc-generator.ts`

### Формулы культивации (Lore)

```typescript
// Плотность Ци = 2^(level - 1)
qiDensity = Math.pow(2, cultivationLevel - 1);

// Объём ядра
coreVolume = baseVolume * qiDensity;

// Качество ядра
coreQuality = Math.floor(meridianConductivity * 10) / 10;
```

---

## 📁 Хранилище пресетов

**Расположение:** `presets/`

```
presets/
├── items/
│   ├── weapon.json
│   ├── armor.json
│   ├── accessory.json
│   └── charger.json
├── techniques/
│   ├── combat/
│   │   ├── melee-strike/level-*.json
│   │   ├── melee-weapon/level-*.json
│   │   └── ranged/level-*.json
│   ├── defense/level-*.json
│   ├── cultivation/level-*.json
│   └── ... (все типы)
├── npcs/
│   ├── human.json
│   └── ... (29 species)
├── formations/
│   ├── defensive.json
│   ├── offensive.json
│   ├── support.json
│   └── special.json
├── counters.json
└── manifest.json
```

---

## 🔧 API Endpoints

### Техники
- `GET /api/generator/techniques?action=stats` — статистика
- `GET /api/generator/techniques?action=list` — список
- `GET /api/generator/techniques?action=manifest` — манифест
- `POST /api/generator/techniques` — генерация

### Экипировка
- `GET /api/generator/equipment?action=stats` — статистика
- `POST /api/generator/equipment` — генерация

### NPC
- `GET /api/generator/npc?action=stats` — статистика
- `POST /api/generator/npc` — генерация

---

## 📈 Статистика генерации V2

| Тип | Лимит тест | Лимит прод | Формула |
|-----|------------|------------|---------|
| Техники (combat) | 125 | 405 | 5 подтипов × 5 уровней |
| Техники (другие) | 50-100 | 150-225 | по типу |
| Формации | ~500 | ~2000 | по типу |
| NPC | 100 | 500 | по species |

---

## 📚 Связанные документы

- [technique-system-v2.md](./technique-system-v2.md) — система техник V2.8
- [matryoshka-architecture.md](./matryoshka-architecture.md) — архитектура "Матрёшка"
- [equip-v2.md](./equip-v2.md) — экипировка с Grade System
- [generator-specs.md](./generator-specs.md) — спецификации генераторов

---

*Обновлено: 2026-03-21*
*Версия генератора техник: 5.0.0 (требуется обновление)*
*Ключевая формула: finalDamage = capacity × gradeMult*
