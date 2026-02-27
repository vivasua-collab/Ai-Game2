# 🗄️ Анализ хранения пресетов

**Версия:** 1.0  
**Создано:** 2026-02-27  
**Статус:** Проектное решение

---

## 📋 Постановка задачи

Необходимо определить оптимальный способ хранения:
- ~2046 техник (1024 на ур.1, 512 на ур.2, 256 на ур.3...)
- ~2046 предметов (аналогичная структура)
- ~50-100 шаблонов NPC

Критерии:
- Разнообразие мира
- Возможность модификаций
- Производительность
- Простота поддержки

---

## 1️⃣ СРАВНЕНИЕ ПОДХОДОВ

### 1.1 База данных (Prisma + SQLite)

```
✅ ПРЕИМУЩЕСТВА:
─────────────────────────────────────────────────────────
+ Индексы для быстрого поиска
+ Связи между таблицами (foreign keys)
+ Транзакции при изменениях
+ Прямые запросы из API
+ Автоматическая валидация типов
─────────────────────────────────────────────────────────

❌ НЕДОСТАТКИ:
─────────────────────────────────────────────────────────
- Накладные расходы на запросы
- Сложнее версионирование (миграции)
- БД растёт с количеством пресетов
- Менее удобно для ручного редактирования
─────────────────────────────────────────────────────────

Производительность:
- Загрузка 1 пресета: ~1-5 мс
- Загрузка всех 2046: ~100-500 мс
- Память: ~5-10 MB в БД
```

### 1.2 Файлы (JSON/TypeScript)

```
✅ ПРЕИМУЩЕСТВА:
─────────────────────────────────────────────────────────
+ Загрузка при старте (однократно)
+ Кэширование в памяти
+ Версионирование через Git
+ Легко редактировать вручную
+ Нет накладных расходов БД
+ Возможность кодогенерации
─────────────────────────────────────────────────────────

❌ НЕДОСТАТКИ:
─────────────────────────────────────────────────────────
- Поиск требует загрузки всего файла
- Нет связей на уровне БД
- Нужно вручную управлять кэшем
- Сложнее динамические изменения
─────────────────────────────────────────────────────────

Производительность:
- Загрузка при старте: ~50-200 мс (однократно)
- Доступ из кэша: <1 мс
- Память: ~3-8 MB в памяти
```

### 1.3 Гибридный подход (рекомендуемый)

```
СТРУКТУРА:
─────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────┐
│                    ФАЙЛЫ (source of truth)              │
│  /src/data/presets/                                     │
│  ├── techniques/                                        │
│  │   ├── level-1.json      (1024 техники)              │
│  │   ├── level-2.json      (512 техник)                │
│  │   └── ...                                            │
│  ├── items/                                             │
│  │   ├── level-1.json      (1024 предмета)             │
│  │   └── ...                                            │
│  └── npc-templates.json                                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ загрузка при старте
┌─────────────────────────────────────────────────────────┐
│                    КЭШ В ПАМЯТИ                         │
│  Map<string, PresetTechnique>                           │
│  Map<string, PresetItem>                                │
│  Map<string, NpcTemplate>                               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ по запросу
┌─────────────────────────────────────────────────────────┐
│                    API ЭНДПОИНТЫ                        │
│  GET /api/presets/techniques/:level                     │
│  GET /api/presets/items/:id                             │
└─────────────────────────────────────────────────────────┘
─────────────────────────────────────────────────────────
```

---

## 2️⃣ РЕКОМЕНДУЕМАЯ СТРУКТУРА ГЕНЕРАТОРА

### 2.1 Концепция Base + Modifiers

Вместо хранения полных объектов, используем:
1. **Базовый объект** — минимальный набор фиксированных характеристик
2. **Модификаторы** — флаги включения + значения бонусов/штрафбов

```typescript
// === БАЗОВАЯ ТЕХНИКА ===
interface BaseTechnique {
  id: string;
  name: string;
  type: TechniqueType;          // combat, cultivation, support...
  element: Element;             // fire, water, earth...
  level: number;                // 1-9
  
  // Базовые значения (фиксированные для уровня)
  baseDamage: number;
  baseQiCost: number;
  baseRange: number;
  baseCooldown: number;
}

// === МОДИФИКАТОРЫ (флаги + значения) ===
interface TechniqueModifiers {
  // Флаги эффектов (true = эффект активен)
  effects: {
    burning?: boolean;          // Горение
    freezing?: boolean;         // Заморозка
    slow?: boolean;             // Замедление
    stun?: boolean;             // Оглушение
    poison?: boolean;           // Яд
    heal?: boolean;             // Лечение
    shield?: boolean;           // Щит
    buff?: boolean;             // Бафф
    debuff?: boolean;           // Дебафф
  };
  
  // Значения эффектов (если флаг true)
  effectValues: {
    burningDamage?: number;     // Урон от горения за тик
    burningDuration?: number;   // Длительность горения
    slowPercent?: number;       // % замедления
    stunDuration?: number;      // Длительность оглушения
    poisonDamage?: number;      // Урон от яда
    healAmount?: number;        // Количество лечения
    shieldHP?: number;          // HP щита
    // ...
  };
  
  // Штрафы (негативные модификаторы)
  penalties: {
    selfDamage?: number;        // Урон себе
    qiCostMultiplier?: number;  // Множитель стоимости Ци (>1)
    healthCost?: number;        // Стоимость HP
    cooldownMultiplier?: number; // Множитель кулдауна
    fatigueCost?: number;       // Стоимость усталости
  };
  
  // Бонусы (позитивные модификаторы)
  bonuses: {
    damageMultiplier?: number;  // Множитель урона
    castSpeedMultiplier?: number; // Скорость каста
    rangeMultiplier?: number;   // Множитель дальности
    critChance?: number;        // % шанса крита
    critDamage?: number;        // % крит урона
  };
}

// === ПОЛНАЯ ТЕХНИКА (генерируется при использовании) ===
interface GeneratedTechnique extends BaseTechnique {
  modifiers: TechniqueModifiers;
  
  // Вычисляемые значения (генерируются на лету)
  computed: {
    finalDamage: number;
    finalQiCost: number;
    finalRange: number;
    finalCooldown: number;
    activeEffects: ActiveEffect[];
  };
}
```

### 2.2 Пример структуры файла

```json
// /src/data/presets/techniques/level-1.json
{
  "version": "1.0",
  "level": 1,
  "techniques": [
    {
      "id": "fire_strike_1",
      "name": "Огненный удар",
      "type": "combat",
      "element": "fire",
      "level": 1,
      "baseDamage": 15,
      "baseQiCost": 10,
      "baseRange": 2,
      "baseCooldown": 0,
      "modifiers": {
        "effects": {
          "burning": true
        },
        "effectValues": {
          "burningDamage": 3,
          "burningDuration": 2
        },
        "penalties": {},
        "bonuses": {}
      }
    },
    {
      "id": "ice_shard_1",
      "name": "Ледяной осколок",
      "type": "combat",
      "element": "water",
      "level": 1,
      "baseDamage": 12,
      "baseQiCost": 12,
      "baseRange": 15,
      "baseCooldown": 0,
      "modifiers": {
        "effects": {
          "freezing": true,
          "slow": true
        },
        "effectValues": {
          "slowPercent": 20,
          "stunDuration": 0.5
        },
        "penalties": {},
        "bonuses": {}
      }
    }
  ]
}
```

### 2.3 Расчёт размера хранения

```
Базовая техника (фиксированные поля):
─────────────────────────────────────────────────────────
id              25 байт
name            30 байт
type            15 байт
element         10 байт
level           4 байта
baseDamage      4 байта
baseQiCost      4 байта
baseRange       4 байта
baseCooldown    4 байта
─────────────────────────────────────────────────────────
ИТОГО база:     ~100 байт

Модификаторы (в среднем):
─────────────────────────────────────────────────────────
effects (флаги)           ~10 байт (bitmap)
effectValues (средн. 2)   ~20 байт
penalties                 ~10 байт
bonuses                   ~10 байт
─────────────────────────────────────────────────────────
ИТОГО модификаторы:       ~50 байт

ПОЛНАЯ ТЕХНИКА:           ~150 байт
```

### 2.4 Сравнение размеров

```
Подход                    1 техника    2046 техник
──────────────────────────────────────────────────────
Полный JSON (как раньше)  ~800 байт    ~1.6 MB
Base + Modifiers          ~150 байт    ~300 KB
Только ID + seed          ~30 байт     ~60 KB
──────────────────────────────────────────────────────

ЭКОНОМИЯ: 81% vs полный подход
```

---

## 3️⃣ ГЕНЕРАЦИЯ ПРЕСЕТОВ

### 3.1 Алгоритм распределения по уровням

```
Уровень    Количество    Формула
────────────────────────────────────────
   1         1024        base
   2          512        base / 2
   3          256        base / 4
   4          128        base / 8
   5           64        base / 16
   6           32        base / 32
   7           16        base / 64
   8            8        base / 128
   9            4        base / 256
────────────────────────────────────────
ИТОГО:      2046 техник
```

### 3.2 Генератор базовых объектов

```typescript
// /src/lib/preset-generator/base-generator.ts

const BASE_VALUES_BY_LEVEL = {
  1: { damage: 15, qiCost: 10, range: 5, cooldown: 0 },
  2: { damage: 25, qiCost: 18, range: 7, cooldown: 0 },
  3: { damage: 40, qiCost: 30, range: 10, cooldown: 1 },
  4: { damage: 60, qiCost: 50, range: 15, cooldown: 2 },
  5: { damage: 90, qiCost: 80, range: 20, cooldown: 3 },
  6: { damage: 130, qiCost: 120, range: 25, cooldown: 4 },
  7: { damage: 185, qiCost: 180, range: 30, cooldown: 5 },
  8: { damage: 260, qiCost: 260, range: 40, cooldown: 6 },
  9: { damage: 350, qiCost: 400, range: 50, cooldown: 8 },
};

function generateBaseTechnique(
  id: string,
  type: TechniqueType,
  element: Element,
  level: number
): BaseTechnique {
  const base = BASE_VALUES_BY_LEVEL[level];
  
  // Элементальные модификаторы базы
  const elementMult = ELEMENT_MULTIPLIERS[element] || { damage: 1.0, cost: 1.0 };
  
  return {
    id,
    name: '', // Генерируется отдельно
    type,
    element,
    level,
    baseDamage: Math.floor(base.damage * elementMult.damage),
    baseQiCost: Math.floor(base.qiCost * elementMult.cost),
    baseRange: base.range,
    baseCooldown: base.cooldown,
  };
}
```

### 3.3 Генератор модификаторов

```typescript
// /src/lib/preset-generator/modifier-generator.ts

interface ModifierRule {
  effect: keyof TechniqueModifiers['effects'];
  minLevel: number;
  maxLevel: number;
  weight: number;
  incompatibleWith: string[];
  valueRange: { min: number; max: number };
}

const MODIFIER_RULES: ModifierRule[] = [
  {
    effect: 'burning',
    minLevel: 1,
    maxLevel: 9,
    weight: 15,
    incompatibleWith: ['freezing'],
    valueRange: { min: 2, max: 20 },
  },
  {
    effect: 'freezing',
    minLevel: 1,
    maxLevel: 9,
    weight: 10,
    incompatibleWith: ['burning'],
    valueRange: { min: 0.5, max: 3 },
  },
  {
    effect: 'stun',
    minLevel: 3,
    maxLevel: 9,
    weight: 5,
    incompatibleWith: [],
    valueRange: { min: 0.5, max: 2 },
  },
  // ... другие правила
];

function generateModifiers(
  base: BaseTechnique,
  rng: SeededRandom
): TechniqueModifiers {
  const modifiers: TechniqueModifiers = {
    effects: {},
    effectValues: {},
    penalties: {},
    bonuses: {},
  };
  
  // Определяем количество модификаторов (1-3)
  const numModifiers = 1 + Math.floor(rng() * 3);
  
  // Выбираем модификаторы по весам
  const available = MODIFIER_RULES.filter(r => 
    base.level >= r.minLevel && 
    base.level <= r.maxLevel
  );
  
  const selected = weightedRandomSelect(available, numModifiers, rng);
  
  for (const rule of selected) {
    modifiers.effects[rule.effect] = true;
    
    // Генерируем значение эффекта
    const value = rule.valueRange.min + 
      rng() * (rule.valueRange.max - rule.valueRange.min);
    
    // Записываем в соответствующее поле
    assignEffectValue(modifiers, rule.effect, value);
  }
  
  // Добавляем штрафы для баланса
  if (Object.keys(modifiers.effects).length >= 2) {
    modifiers.penalties.qiCostMultiplier = 1.1 + rng() * 0.2;
  }
  
  return modifiers;
}
```

### 3.4 Процесс генерации всех пресетов

```typescript
// /scripts/generate-presets.ts

async function generateAllPresets() {
  const allTechniques: GeneratedTechnique[] = [];
  
  for (let level = 1; level <= 9; level++) {
    const count = Math.floor(1024 / Math.pow(2, level - 1));
    const levelTechniques: GeneratedTechnique[] = [];
    
    for (let i = 0; i < count; i++) {
      // Определяем тип и элемент
      const type = TECHNIQUE_TYPES[i % TECHNIQUE_TYPES.length];
      const element = ELEMENTS[i % ELEMENTS.length];
      
      // Генерируем ID
      const id = `${type}_${element}_l${level}_${i}`;
      
      // Генерируем базу
      const base = generateBaseTechnique(id, type, element, level);
      
      // Генерируем модификаторы
      const rng = seededRandom(hashCode(id));
      const modifiers = generateModifiers(base, rng);
      
      // Генерируем название
      const name = generateName(base, modifiers, rng);
      
      levelTechniques.push({ ...base, name, modifiers });
    }
    
    // Сохраняем в файл
    await writeJson(
      `src/data/presets/techniques/level-${level}.json`,
      { version: '1.0', level, techniques: levelTechniques }
    );
    
    allTechniques.push(...levelTechniques);
  }
  
  // Генерируем индекс для быстрого поиска
  await generateIndex(allTechniques);
}

// Результат: ~300 KB файлов на диске
```

---

## 4️⃣ СТРУКТУРА ФАЙЛОВ

```
/src/data/presets/
├── techniques/
│   ├── index.json              # Индекс всех техник (id -> file)
│   ├── level-1.json            # 1024 техники
│   ├── level-2.json            # 512 техник
│   ├── level-3.json            # 256 техник
│   ├── level-4.json            # 128 техник
│   ├── level-5.json            # 64 техники
│   ├── level-6.json            # 32 техники
│   ├── level-7.json            # 16 техник
│   ├── level-8.json            # 8 техник
│   └── level-9.json            # 4 техники
│
├── items/
│   ├── index.json              # Индекс всех предметов
│   ├── level-1.json            # 1024 предмета
│   ├── level-2.json            # 512 предметов
│   └── ...
│
├── npc/
│   └── templates.json          # ~50 шаблонов NPC
│
└── manifest.json               # Версия и метаданные
```

### Размер файлов:

```
Файл                    Размер
──────────────────────────────────────
techniques/level-1.json   ~150 KB
techniques/level-2.json    ~75 KB
techniques/level-3.json    ~40 KB
... (убывает)
──────────────────────────────────────
techniques/ (всего)       ~300 KB

items/ (аналогично)       ~300 KB
npc/templates.json         ~50 KB
──────────────────────────────────────
ИТОГО:                    ~650 KB
```

---

## 5️⃣ ЗАГРУЗКА И КЭШИРОВАНИЕ

### 5.1 Сервис загрузки пресетов

```typescript
// /src/lib/presets/preset-loader.ts

class PresetLoader {
  private techniqueCache = new Map<string, GeneratedTechnique>();
  private itemCache = new Map<string, GeneratedItem>();
  private loaded = false;
  
  // Загрузка при старте сервера
  async initialize(): Promise<void> {
    if (this.loaded) return;
    
    console.log('[Presets] Loading presets...');
    const startTime = Date.now();
    
    // Загружаем техники
    for (let level = 1; level <= 9; level++) {
      const data = await readJson(`src/data/presets/techniques/level-${level}.json`);
      for (const tech of data.techniques) {
        this.techniqueCache.set(tech.id, this.computeValues(tech));
      }
    }
    
    // Загружаем предметы
    for (let level = 1; level <= 9; level++) {
      const data = await readJson(`src/data/presets/items/level-${level}.json`);
      for (const item of data.items) {
        this.itemCache.set(item.id, this.computeItemValues(item));
      }
    }
    
    this.loaded = true;
    console.log(`[Presets] Loaded in ${Date.now() - startTime}ms`);
    console.log(`[Presets] Techniques: ${this.techniqueCache.size}`);
    console.log(`[Presets] Items: ${this.itemCache.size}`);
  }
  
  // Получение техники
  getTechnique(id: string): GeneratedTechnique | undefined {
    return this.techniqueCache.get(id);
  }
  
  // Получение техник по фильтру
  getTechniquesByLevel(level: number): GeneratedTechnique[] {
    return Array.from(this.techniqueCache.values())
      .filter(t => t.level === level);
  }
  
  // Получение техник по элементу
  getTechniquesByElement(element: Element): GeneratedTechnique[] {
    return Array.from(this.techniqueCache.values())
      .filter(t => t.element === element);
  }
  
  // Вычисление финальных значений
  private computeValues(tech: GeneratedTechnique): GeneratedTechnique {
    const { modifiers } = tech;
    
    let finalDamage = tech.baseDamage;
    let finalQiCost = tech.baseQiCost;
    let finalRange = tech.baseRange;
    let finalCooldown = tech.baseCooldown;
    
    // Применяем бонусы
    if (modifiers.bonuses.damageMultiplier) {
      finalDamage *= modifiers.bonuses.damageMultiplier;
    }
    if (modifiers.bonuses.rangeMultiplier) {
      finalRange *= modifiers.bonuses.rangeMultiplier;
    }
    
    // Применяем штрафы
    if (modifiers.penalties.qiCostMultiplier) {
      finalQiCost *= modifiers.penalties.qiCostMultiplier;
    }
    if (modifiers.penalties.cooldownMultiplier) {
      finalCooldown *= modifiers.penalties.cooldownMultiplier;
    }
    
    return {
      ...tech,
      computed: {
        finalDamage: Math.floor(finalDamage),
        finalQiCost: Math.floor(finalQiCost),
        finalRange: Math.floor(finalRange),
        finalCooldown,
        activeEffects: this.getActiveEffects(modifiers),
      },
    };
  }
  
  private getActiveEffects(modifiers: TechniqueModifiers): ActiveEffect[] {
    const effects: ActiveEffect[] = [];
    
    for (const [key, active] of Object.entries(modifiers.effects)) {
      if (active) {
        effects.push({
          type: key as EffectType,
          value: modifiers.effectValues[`${key}Damage` as keyof typeof modifiers.effectValues] ||
                 modifiers.effectValues[`${key}Percent` as keyof typeof modifiers.effectValues] ||
                 modifiers.effectValues[`${key}Duration` as keyof typeof modifiers.effectValues] ||
                 0,
        });
      }
    }
    
    return effects;
  }
}

// Синглтон
export const presetLoader = new PresetLoader();
```

### 5.2 Инициализация при старте

```typescript
// /src/app/api/presets/route.ts

import { presetLoader } from '@/lib/presets/preset-loader';

// Инициализация при первом запросе
let initialized = false;

export async function GET(request: Request) {
  if (!initialized) {
    await presetLoader.initialize();
    initialized = true;
  }
  
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const level = searchParams.get('level');
  const id = searchParams.get('id');
  
  if (id) {
    const tech = presetLoader.getTechnique(id);
    return Response.json(tech || { error: 'Not found' });
  }
  
  if (type === 'techniques' && level) {
    const techs = presetLoader.getTechniquesByLevel(parseInt(level));
    return Response.json(techs);
  }
  
  return Response.json({ error: 'Invalid parameters' });
}
```

---

## 6️⃣ ИТОГОВОЕ РЕШЕНИЕ

### Рекомендуемый подход:

| Компонент | Метод хранения | Причина |
|-----------|---------------|---------|
| Техники | Файлы JSON + кэш | 300 KB, статичные |
| Предметы | Файлы JSON + кэш | 300 KB, статичные |
| Шаблоны NPC | Файлы JSON + кэш | 50 KB, статичные |
| NPC (экземпляры) | База данных | Динамичные |
| Игроки | База данных | Динамичные |

### Преимущества:

1. **Экономия места**: ~650 KB файлов vs ~5 MB в БД
2. **Скорость**: Кэш в памяти, доступ <1 мс
3. **Версионирование**: Git для отслеживания изменений
4. **Редактирование**: Простой JSON для правок
5. **Гибкость**: Структура Base + Modifiers позволяет комбинации

### Структура генератора:

```
Base (фиксированный) → Modifiers (флаги + значения) → Computed (финальные значения)

Пример:
  baseDamage: 15
  + effects.burning: true
  + effectValues.burningDamage: 3
  + penalties.qiCostMultiplier: 1.1
  ────────────────────────────
  → finalDamage: 15 + 3 (burning) = 18
  → finalQiCost: 10 × 1.1 = 11
```

---

*Документ определяет стратегию хранения пресетов для проекта*
