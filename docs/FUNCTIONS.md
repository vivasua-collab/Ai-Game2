# Функции и типы проекта Cultivation World Simulator

**Последнее обновление:** 2026-02-26

Этот документ содержит полный перечень всех экспортируемых функций, интерфейсов, типов и констант проекта.

---

## Унифицированные пресеты (src/data/presets/)

### Базовый интерфейс (base-preset.ts)

Все пресеты следуют единому формату `BasePreset`:

```typescript
interface BasePreset {
  id: string;                              // Уникальный ID
  name: string;                            // Название на русском
  nameEn?: string;                         // Название на английском
  description: string;                     // Описание
  category: PresetCategory;                // basic | advanced | master | legendary
  rarity: PresetRarity;                    // common | uncommon | rare | legendary
  requirements?: PresetRequirements;       // Требования (уровень, статы)
  cost?: PresetCost;                       // Стоимость (очки, камни)
  sources?: PresetSource[];                // Источники получения
  icon?: string;                           // Эмодзи иконка
}
```

### Категории пресетов

| Категория | Описание | Цвет UI |
|-----------|----------|---------|
| `basic` | Базовые пресеты | text-gray-400 |
| `advanced` | Продвинутые | text-blue-400 |
| `master` | Мастерские | text-purple-400 |
| `legendary` | Легендарные | text-amber-400 |

### Редкость пресетов

| Редкость | Описание | Множитель |
|----------|----------|-----------|
| `common` | Обычная | 1.0x |
| `uncommon` | Необычная | 1.25x |
| `rare` | Редкая | 1.5x |
| `legendary` | Легендарная | 2.0x |

---

## Техники (technique-presets.ts)

### Интерфейс TechniquePreset

```typescript
interface TechniquePreset extends BasePreset {
  techniqueType: TechniqueType;
  element: PresetElement;
  level: number;              // Текущий уровень (1-9)
  minLevel: number;           // Минимальный уровень развития
  maxLevel: number;           // Максимальный уровень развития
  canEvolve?: boolean;
  qiCost: number;
  fatigueCost: { physical: number; mental: number };
  scaling?: TechniqueScaling;
  effects: TechniqueEffects;
  masteryBonus: number;
}
```

### Типы техник

| Тип | Описание | Эффекты |
|-----|----------|---------|
| `combat` | Боевые | damage, statModifiers |
| `cultivation` | Культивация | qiRegen |
| `support` | Поддержка | statModifiers, duration |
| `movement` | Перемещение | distance (телепортация) |
| `sensory` | Восприятие | duration |
| `healing` | Исцеление | healing |

### Элементы

`fire` | `water` | `earth` | `air` | `lightning` | `void` | `neutral`

### Список техник (13 шт)

| ID | Название | Тип | Уровень | Элемент |
|----|----------|-----|---------|---------|
| breath_of_qi | Дыхание Ци | cultivation | 1-9 | neutral |
| reinforced_strike | Усиленный удар | combat | 1-5 | neutral |
| mental_shield | Ментальный щит | support | 1-6 | neutral |
| wind_speed | Скорость ветра | movement | 1-5 | air |
| qi_healing | Лечение Ци | healing | 1-7 | neutral |
| fire_strike | Огненный удар | combat | 1-6 | fire |
| water_shield | Водяной щит | support | 1-5 | water |
| lightning_flash | Молниеносный рывок | movement | 1-6 | air |
| earth_armor | Земляная броня | support | 1-7 | earth |
| void_step | Шаг пустоты | movement | 1-9 | void |
| spatial_shift | Пространственный сдвиг | movement | 7-9 | void |
| heavenly_transmission | Небесная передача | movement | 8-9 | void |
| void_march | Марш пустоты | movement | 9 | void |

### Функции

| Функция | Описание |
|---------|----------|
| `getTechniquePresetById(id)` | Получить технику по ID |
| `getTechniquePresetsByType(type)` | Фильтр по типу |
| `getTechniquePresetsByElement(element)` | Фильтр по элементу |
| `getBasicTechniques()` | Базовые техники |
| `getAvailableTechniquePresets(level)` | Доступные для уровня |
| `getTeleportationTechniques()` | Техники телепортации (7+) |
| `calculateTeleportDistance(tech, level)` | Расчёт дальности телепортации |

---

## Навыки культивации (skill-presets.ts)

### Интерфейс SkillPreset

```typescript
interface SkillPreset extends BasePreset {
  maxLevel: number;
  skillEffects: SkillEffects;
  learnSources?: PresetSource[];
}
```

### Эффекты навыков

```typescript
interface SkillEffects {
  interruptionModifier?: number;    // Множитель прерывания
  qiAbsorptionBonus?: number;       // Бонус к поглощению Ци
  meditationSpeedBonus?: number;    // Бонус к скорости медитации
  fatigueReliefBonus?: number;      // Бонус к снятию усталости
  dangerDetectionRange?: number;    // Дальность обнаружения
}
```

### Список навыков (9 шт)

| ID | Название | Макс. уровень | Категория |
|----|----------|---------------|-----------|
| deep_meditation | Глубокая медитация | 5 | basic |
| qi_perception | Восприятие Ци | 5 | basic |
| concentration | Концентрация | 5 | basic |
| danger_sense | Чутьё опасности | 3 | advanced |
| spirit_shield | Духовный щит | 3 | advanced |
| qi_circulation | Циркуляция Ци | 5 | advanced |
| mind_calm | Покой разума | 3 | master |
| qi_mastery | Мастерство Ци | 5 | master |
| void_perception | Восприятие пустоты | 3 | master |

### Функции

| Функция | Описание |
|---------|----------|
| `getSkillPresetById(id)` | Получить навык по ID |
| `getBasicSkills()` | Базовые навыки |
| `getAvailableSkillPresets(level, learned)` | Доступные навыки |
| `getSkillEffectAtLevel(id, level)` | Эффект на уровне |
| `calculateSkillsInterruptionModifier(learned)` | Множитель прерывания |

---

## Формации (formation-presets.ts)

### Интерфейс FormationPreset

```typescript
interface FormationPreset extends BasePreset {
  formationType: FormationType;
  setupTime: number;           // Время установки (мин)
  duration: number;            // Длительность (часы), 0 = постоянная
  qualityLevels: number;       // Уровни качества (1-5)
  formationEffects: FormationEffects;
  difficulty: number;          // Сложность (1-10)
  creationExp: number;         // Опыт создания
}
```

### Эффекты формаций

```typescript
interface FormationEffects {
  interruptionReduction: number;  // % за уровень качества
  qiBonus?: number;               // % к поглощению
  spiritRepel?: number;           // % отпугивания
  fatigueReduction?: number;      // % снижения усталости
}
```

### Список формаций (8 шт)

| ID | Название | Уровень культивации | Длительность |
|----|----------|---------------------|--------------|
| protective_circle | Защитный круг | 1 | 8 часов |
| qi_condenser | Конденсатор Ци | 2 | 6 часов |
| spirit_barrier | Барьер духа | 4 | 12 часов |
| qi_well | Колокол Ци | 5 | 24 часа |
| five_elements_circle | Круг пяти стихий | 4 | 10 часов |
| elemental_harmony | Гармония стихий | 6 | 24 часа |
| void_sanctuary | Святилище пустоты | 8 | 48 часов |
| eternal_meditation_circle | Круг вечной медитации | 7 | Постоянная |

### Функции

| Функция | Описание |
|---------|----------|
| `getFormationPresetById(id)` | Получить формацию по ID |
| `getBasicFormations()` | Базовые формации |
| `getAvailableFormationPresets(level)` | Доступные формации |
| `getFormationsByDifficulty(max)` | По сложности |
| `getFormationEffects(id, quality)` | Эффекты с учётом качества |
| `calculateFormationInterruptionModifier(id, quality)` | Множитель прерывания |

---

## Предметы (item-presets.ts)

### Интерфейс ItemPreset

```typescript
interface ItemPreset extends BasePreset {
  itemType: ItemType;
  isConsumable: boolean;
  useAction?: ItemUseAction;
  itemEffects?: ItemEffects;
  stackable: boolean;
  maxStack: number;
  durability?: number;
  maxDurability?: number;
  qiCharge?: number;
  maxQiCharge?: number;
  sellPrice?: number;
  buyPrice?: number;
}
```

### Типы предметов

| Тип | Описание | Примеры |
|-----|----------|---------|
| `consumable` | Расходуемые | Таблетки |
| `spirit_stone` | Духовные камни | Низкосортный, обычный |
| `material` | Материалы | Травы, камни стихий |
| `artifact` | Артефакты | Постоянные эффекты |
| `equipment` | Снаряжение | Оружие, броня |
| `quest` | Квестовые | Особые предметы |

### Список предметов (15 шт)

**Расходуемые (7):**
- Малая таблетка Ци (+50 Ци)
- Средняя таблетка Ци (+150 Ци)
- Большая таблетка Ци (+500 Ци)
- Лечебная таблетка (+20 HP)
- Тонизирующая таблетка (-30% усталости)
- Таблетка ясности ума (-30% мент. усталости)

**Духовные камни (3):**
- Низкосортный (+100 Ци)
- Обычный (+500 Ци)
- Высокосортный (+2000 Ци)

**Материалы (5):**
- Духовная трава
- Камень огня/воды/земли/воздуха
- Кристалл стихий
- Эссенция лунного света

### Функции

| Функция | Описание |
|---------|----------|
| `getItemPresetById(id)` | Получить предмет по ID |
| `getItemPresetsByType(type)` | Фильтр по типу |
| `getConsumableItems()` | Расходуемые предметы |
| `getSpiritStones()` | Духовные камни |
| `getMaterials()` | Материалы |
| `getBuyableItems()` | Покупаемые предметы |

---

## Персонажи (character-presets.ts)

### Интерфейс CharacterPreset

```typescript
interface CharacterPreset extends BasePreset {
  startType: StartType;          // sect | random | custom
  stats: CharacterStats;
  cultivation: CharacterCultivation;
  age: number;
  skills: Record<string, number>;
  baseTechniques: string[];
  bonusTechniques?: string[];
  features: string[];
  resources?: CharacterResources;
  backstory?: string;
  suggestedLocation?: SuggestedLocation;
}
```

### Список персонажей (6 шт)

| ID | Название | Тип старта | Особенность |
|----|----------|------------|-------------|
| sect_disciple | Ученик секты | sect | Базовый старт |
| wandering_cultivator | Странствующий практик | random | +навыки, +ресурсы |
| talented_youth | Одарённый юноша | sect | +проводимость, fast_learner |
| fallen_noble | Падший аристократ | random | +образование, +ментальный щит |
| hardened_warrior | Закалённый воин | random | +сила, warrior_background |
| spirit_touched | Отмеченный духом | custom | +восприятие, spirit_touched |

### Функции

| Функция | Описание |
|---------|----------|
| `getCharacterPresetById(id)` | Получить персонажа по ID |
| `getCharacterPresetsByStartType(type)` | Фильтр по типу старта |
| `getDefaultSectPreset()` | Стартовый для секты |
| `getDefaultRandomPreset()` | Случайный старт |

---

## Утилиты пресетов (index.ts)

| Функция | Описание |
|---------|----------|
| `getAllPresets()` | Все пресеты в одном массиве |
| `getStarterPack(presetId)` | Стартовый набор персонажа |
| `findPresetById(id)` | Универсальный поиск по ID |
| `filterByCategory(presets, cat)` | Фильтр по категории |
| `filterByRarity(presets, rarity)` | Фильтр по редкости |
| `filterByCultivationLevel(presets, level)` | Фильтр по уровню культивации |
| `sortByCategory(presets)` | Сортировка по категории |
| `sortByRarity(presets)` | Сортировка по редкости |
| `isPresetAvailable(preset, character)` | Проверка доступности |

---

## API Эндпоинты

### Игровые

| Эндпоинт | Метод | Описание |
|----------|-------|----------|
| `/api/game/start` | POST | Создать новую игру |
| `/api/game/state` | GET | Получить состояние |
| `/api/game/move` | POST | Движение + время + пассивное Ци |
| `/api/rest` | POST | Медитация, отдых, сон |
| `/api/technique/use` | POST | Использовать технику |
| `/api/chat` | POST | Действие + LLM ответ |

---

## Системные константы (constants.ts)

### Время

| Константа | Значение | Описание |
|-----------|----------|----------|
| `TICK_MINUTES` | 1 | Минут за тик |
| `TICK_INTERVAL_MS` | 3000 | Интервал синхронизации |

### Отдых

| Константа | Значение | Описание |
|-----------|----------|----------|
| `SLEEP_PHYSICAL_RECOVERY` | 0.208 | %/мин (100% за 8ч) |
| `SLEEP_MENTAL_RECOVERY` | 0.208 | %/мин (100% за 8ч) |
| `MAX_REST_DURATION` | 480 | Макс. время отдыха (мин) |

### Ци

| Константа | Значение | Описание |
|-----------|----------|----------|
| `PASSIVE_QI_CAP` | 0.9 | Кап пассивного накопления (90%) |
| `BASE_QI_REGEN_RATE` | 0.1 | Базовая скорость регена Ци |

---

*Документ актуален на 2026-02-26*
