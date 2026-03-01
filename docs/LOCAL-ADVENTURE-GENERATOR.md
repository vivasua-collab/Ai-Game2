# 🎲 Концепция локального генератора приключений

**Создано:** 2026-02-25
**Статус:** 📝 Проект
**Приоритет:** 🟡 Средний

---

## 🎯 Проблема

Большинство запросов к LLM — это рутинные действия:
- Осмотр локации
- Короткие перемещения
- Сбор ресурсов
- Простой бой
- Стандартные диалоги

Эти действия можно генерировать локально без потери качества, экономя токены и время.

---

## 📊 Анализ запросов

### Типы запросов по частоте

| Тип запроса | Частота | LLM обязателен? | Потенциал локальной генерации |
|-------------|---------|-----------------|------------------------------|
| Осмотр локации | 30% | ❌ Нет | ✅ Высокий |
| Короткие действия | 20% | ❌ Нет | ✅ Высокий |
| Сбор ресурсов | 15% | ❌ Нет | ✅ Высокий |
| Простой бой | 10% | ⚠️ Частично | ✅ Средний |
| Диалоги с NPC | 10% | ⚠️ Частично | 🟡 Низкий |
| Сюжетные события | 10% | ✅ Да | ❌ Нет |
| Прорыв/Культивация | 5% | ❌ Нет | ✅ Высокий |

**Итого:** ~80% запросов можно обрабатывать локально или гибридно.

---

## 🏗️ Архитектура решения

### Уровни генерации

```
┌─────────────────────────────────────────────────────────────────────┐
│                    УРОВЕНЬ 1: Полностью локальный                    │
├─────────────────────────────────────────────────────────────────────┤
│  Осмотр локации, сбор ресурсов, короткие перемещения, статус        │
│  → Шаблоны + рандом + контекст персонажа                             │
│  → 0 запросов к LLM                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    УРОВЕНЬ 2: Гибридный (шаблоны + LLM)              │
├─────────────────────────────────────────────────────────────────────┤
│  Бой, исследование, простые диалоги                                  │
│  → Локальные расчёты + LLM для описания результата                   │
│  → 1 короткий запрос к LLM (вместо 2-3)                              │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    УРОВЕНЬ 3: Полный LLM                             │
├─────────────────────────────────────────────────────────────────────┤
│  Сюжетные события, сложные диалоги, создание контента                │
│  → Полный запрос к LLM с контекстом                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Модуль 1: Генератор описаний локаций

### Структура данных

```typescript
interface LocationDescription {
  terrainTemplates: string[];      // Шаблоны описания местности
  weatherEffects: string[];        // Эффекты погоды
  timeDescriptions: string[];      // Описания по времени суток
  qiDensityDescriptions: string[]; // Описания плотности Ци
  dangerHints: string[];           // Намёки на опасность
  resourceSpots: string[];         // Места ресурсов
}
```

### Примеры шаблонов

```typescript
const LOCATION_TEMPLATES = {
  forest: {
    terrain: [
      "Деревья {density} окружают тебя. {weather}",
      "Лес {mood}. {qi_hint}",
      "Ты находишься на {path_type} среди вековых деревьев.",
    ],
    weather: {
      clear: "Солнечные лучи пробиваются сквозь листву.",
      cloudy: "Тени облаков скользят по лесной тропе.",
      rain: "Капли дождя стучат по листьям над головой.",
    },
    qi_hint: {
      low: "Ци здесь разрежена, дышится тяжело.",
      medium: "Поток Ци ровный, спокойный.",
      high: "Воздух наполнен энергией, каждая клетка жадно впитывает Ци.",
    },
  },
  // ... другие типы местности
};
```

### Алгоритм генерации

```typescript
function generateLocationDescription(location: Location, time: WorldTime): string {
  // 1. Базовый шаблон
  const template = selectTemplate(location.terrainType);
  
  // 2. Заполнение переменных
  let description = template.terrain[random()];
  description = description.replace("{density}", getDensityDescription(location));
  description = description.replace("{weather}", getWeatherDescription(time));
  description = description.replace("{qi_hint}", getQiDescription(location.qiDensity));
  
  // 3. Добавление деталей
  if (hasResources(location)) {
    description += " " + selectResourceHint(location);
  }
  
  if (hasDanger(location)) {
    description += " " + selectDangerHint(location);
  }
  
  return description;
}
```

---

## 📦 Модуль 2: Генератор событий

### Типы событий

```typescript
type EventType = 
  | "resource_found"     // Найден ресурс
  | "creature_encounter" // Встреча с существом
  | "npc_encounter"      // Встреча с NPC
  | "discovery"          // Открытие
  | "danger"             // Опасность
  | "opportunity";       // Возможность

interface EventTemplate {
  type: EventType;
  trigger: {
    location?: string[];
    time?: string[];
    cultivationLevel?: [number, number];
    qiDensity?: [number, number];
  };
  templates: string[];
  effects: EventEffect[];
}
```

### Примеры событий

```typescript
const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: "resource_found",
    trigger: {
      location: ["forest", "mountain"],
      qiDensity: [30, 100],
    },
    templates: [
      "Ты замечаешь {resource} поблизости.",
      "Твой взор привлекает {resource}.",
      "Чутьё подсказывает, что здесь есть {resource}.",
    ],
    effects: [
      { type: "add_item", item: "spirit_herb", chance: 0.3 },
      { type: "add_item", item: "qi_stone", chance: 0.2 },
    ],
  },
  {
    type: "creature_encounter",
    trigger: {
      location: ["forest", "cave"],
      time: ["night", "dawn"],
    },
    templates: [
      "Из тени появляется {creature}!",
      "Ты слышишь шорох... {creature}!",
      "{creature} преграждает тебе путь.",
    ],
    effects: [
      { type: "start_combat", enemy: "wild_beast", chance: 0.5 },
    ],
  },
];
```

---

## 📦 Модуль 3: Генератор боевых сцен

### Принцип

Бой рассчитывается локально:
- Расчёт урона/защиты
- Определение результата
- Потери Ци и усталости

LLM вызывается только для **описания** результата боя (1 короткий запрос).

### Структура

```typescript
interface CombatResult {
  winner: "player" | "enemy" | "draw";
  playerDamage: number;
  playerQiLoss: number;
  playerFatigueGain: number;
  enemyDamage: number;
  loot?: Item[];
  experienceGain: number;
}

interface CombatDescriptionTemplate {
  victory: string[];
  defeat: string[];
  draw: string[];
  critical_hit: string[];
  dodge: string[];
}
```

### Примеры шаблонов

```typescript
const COMBAT_TEMPLATES = {
  victory: [
    "Твой удар достигает цели! {enemy} повержен.",
    "После напряжённой битвы {enemy} падает.",
    "Техника {technique} оказалась решающей. {enemy} побеждён.",
  ],
  critical_hit: [
    "Критический удар! {enemy} отлетает назад.",
    "Твоя атака попадает в уязвимое место!",
  ],
  dodge: [
    "Ты уклоняешься от атаки {enemy}.",
    "{enemy} промахивается, ты уходишь в сторону.",
  ],
};
```

---

## 📦 Модуль 4: Генератор ресурсов

### Механика сбора

```typescript
interface ResourceNode {
  type: string;
  baseYield: number;
  yieldVariance: number;
  qiCost: number;
  fatigueCost: number;
  requiredTool?: string;
  cultivationRequirement?: number;
}

const RESOURCE_NODES: Record<string, ResourceNode> = {
  spirit_herb: {
    type: "spirit_herb",
    baseYield: 1,
    yieldVariance: 2,
    qiCost: 5,
    fatigueCost: 3,
  },
  qi_stone: {
    type: "qi_stone",
    baseYield: 1,
    yieldVariance: 1,
    qiCost: 10,
    fatigueCost: 5,
    requiredTool: "pickaxe",
    cultivationRequirement: 3,
  },
};
```

### Описания сбора

```typescript
const GATHER_TEMPLATES = {
  start: [
    "Ты приступаешь к сбору {resource}...",
    "Ты внимательно осматриваешь место в поисках {resource}...",
  ],
  success: [
    "Тебе удалось найти {count} {resource}!",
    "Твои усилия принесли {count} {resource}.",
  ],
  fail: [
    "Ты не нашёл ничего ценного.",
    "Ресурсы здесь уже исчерпаны.",
  ],
  high_yield: [
    "Неожиданно удача! Ты находишь {count} {resource}!",
    "Богатая находка! {count} {resource} в твоём инвентаре.",
  ],
};
```

---

## 🔧 Интеграция с существующей системой

### Расширение request-router.ts

```typescript
const LOCAL_GENERATION_TYPES: RequestType[] = [
  "status",
  "techniques",
  "inventory",
  "stats",
  "location_info",
  "cultivation",
  "gather",        // Новый тип
  "examine",       // Новый тип
  "short_action",  // Новый тип
];

function canGenerateLocally(input: string, context: GameContext): boolean {
  const type = identifyRequestType(input);
  
  // Полностью локальные типы
  if (LOCAL_GENERATION_TYPES.includes(type)) {
    return true;
  }
  
  // Условная локальная генерация
  if (type === "combat" && isSimpleCombat(context)) {
    return true;
  }
  
  return false;
}
```

### Новый сервис

```typescript
// src/services/local-generator.service.ts

export class LocalGeneratorService {
  /**
   * Генерация описания локации
   */
  static generateLocationDescription(
    location: Location,
    time: WorldTime,
    character: Character
  ): string { ... }
  
  /**
   * Генерация события
   */
  static generateEvent(
    location: Location,
    time: WorldTime,
    character: Character
  ): GameEvent | null { ... }
  
  /**
   * Генерация результата сбора
   */
  static generateGatherResult(
    resource: string,
    character: Character,
    location: Location
  ): GatherResult { ... }
  
  /**
   * Генерация боевой сцены (без LLM)
   */
  static generateCombatResult(
    enemy: string,
    character: Character,
    technique?: Technique
  ): CombatResult { ... }
}
```

---

## 📊 Ожидаемые результаты

| Метрика | До | После |
|---------|-----|-------|
| Запросов к LLM на сессию | 20-30 | 5-10 |
| Среднее время ответа | 2-5 сек | 0.1-0.5 сек |
| Токены на сессию | 5000-10000 | 1500-3000 |
| Качество рутинных действий | Среднее | Высокое |

---

## 📅 План реализации

### Фаза 1: Основа (1-2 дня)
- [ ] Создать `local-generator.service.ts`
- [ ] Реализовать генератор описаний локаций
- [ ] Добавить новые типы запросов в `request-router.ts`

### Фаза 2: События (1-2 дня)
- [ ] Реализовать генератор событий
- [ ] Добавить систему триггеров
- [ ] Интегрировать с существующей механикой

### Фаза 3: Бой и ресурсы (2-3 дня)
- [ ] Реализовать генератор боевых сцен
- [ ] Реализовать генератор сбора ресурсов
- [ ] Оптимизировать гибридный режим

### Фаза 4: Тестирование (1 день)
- [ ] Проверка всех типов генерации
- [ ] Балансировка шаблонов
- [ ] Интеграция с UI

---

## 🔗 Связанные файлы

- `src/lib/game/request-router.ts` — маршрутизация запросов
- `src/services/game.service.ts` — игровой сервис
- `src/lib/game/meditation-interruption.ts` — пример локальной генерации событий

---

*Документ создан: 2026-02-25*
