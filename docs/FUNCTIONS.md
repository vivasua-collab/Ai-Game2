# Функции и типы проекта Cultivation World Simulator

**Последнее обновление:** 2026-03-02

---

## ⚠️ ВАЖНО: Единый источник расчётов ядра и меридиан

### Принцип единой точки истины

**ВСЕ расчёты, связанные с ядром Ци и системой меридиан, находятся в ОДНОМ месте:**

| Система | Файл | Главная функция |
|---------|------|-----------------|
| **Проводимость** | `src/lib/game/conductivity-system.ts` | `calculateTotalConductivity()` |
| **Расчёты Ци** | `src/lib/game/qi-shared.ts` | Все функции с префиксом `calculate*` |
| **Эффекты времени** | `src/services/time-tick.service.ts` | `processTimeTickEffects()` |

### Формула проводимости

```typescript
// Единая формула проводимости (только в conductivity-system.ts)
totalConductivity = (coreCapacity / 360) * levelMultiplier + (МедП * базовая * 10%)

Где:
- coreCapacity = ёмкость ядра персонажа
- levelMultiplier = QI_CONSTANTS.CONDUCTIVITY_MULTIPLIERS[level]
- МедП = количество медитаций на проводимость
- 10% = MEDITATION_TYPE_CONSTANTS.CONDUCTIVITY_BONUS_PERCENT
```

### Правила добавления новых расчётов

1. **НЕ дублировать расчёты** в других файлах
2. **Импортировать** функции из qi-shared.ts или conductivity-system.ts
3. **Использовать** time-tick.service.ts для всех эффектов времени
4. **При изменении формулы** обновлять только один файл

---

## 🎲 Офлайн Генератор Техник (src/lib/generator/)

### 🔄 ЕДИНСТВЕННОЕ МЕСТО ДЛЯ ГЕНЕРАЦИИ ТЕХНИК

Процедурная генерация техник без использования LLM.

### Принципы

- **Base + Modifiers**: базовый объект + флаги эффектов + значения
- **Детерминированная генерация** через seed
- **Балансировка по формулам уровня**
- **Система ID с префиксами** (MS, MW, RG, DF, etc.)

### Типы техник (TechniqueType)

| Тип | Префикс | Описание |
|-----|---------|----------|
| `combat` | MS/MW/RG | Атакующие техники (по подтипу) |
| `defense` | DF | Защитные техники |
| `cultivation` | CU | Техники культивации |
| `support` | SP | Поддержка (баффы) |
| `movement` | MV | Перемещение |
| `sensory` | SN | Восприятие |
| `healing` | HL | Исцеление |
| `curse` | CR | Проклятия |
| `poison` | PN | Отравления |

### Подтипы боевых техник (CombatSubtype)

| Подтип | Префикс | Описание | Дальность |
|--------|---------|----------|-----------|
| `melee_strike` | MS | Удар телом (руки/ноги) | 0.5м + 0.1м/редкость |
| `melee_weapon` | MW | Удар оружием | Длина оружия + 10%/уровень |
| `ranged_projectile` | RG | Снаряд | 10-140м (по уровню) |
| `ranged_beam` | RG | Луч | +20% к дальности |
| `ranged_aoe` | RG | По площади | -20% дальность, AoE радиус |

### Подтипы защитных техник (DefenseSubtype)

| Подтип | Описание |
|--------|----------|
| `shield` | Энергетический щит |
| `barrier` | Стационарный барьер |
| `block` | Активный блок |
| `dodge` | Уклонение |
| `absorb` | Поглощение урона |
| `reflect` | Отражение урона |

### Интерфейс GeneratedTechnique

```typescript
interface GeneratedTechnique {
  id: string;                    // MS_000001, MW_000042, etc.
  name: string;
  nameEn: string;
  type: TechniqueType;
  subtype?: CombatSubtype | DefenseSubtype | CurseSubtype | PoisonSubtype;
  element: Element;
  level: number;                 // 1-9
  baseDamage: number;
  baseQiCost: number;
  baseRange: number;
  baseDuration: number;
  minCultivationLevel: number;
  
  // Для combat техник
  weaponCategory?: string;       // Категория оружия
  weaponType?: string;           // Конкретный тип оружия
  damageFalloff?: {              // Затухание урона (ranged)
    fullDamage: number;
    halfDamage: number;
    max: number;
  };
  isRangedQi?: boolean;          // Дальний удар Ци (легендарные weapon)
  
  description: string;
  rarity: Rarity;
  modifiers: TechniqueModifiers;
  computed: {
    finalDamage: number;
    finalQiCost: number;
    finalRange: number;
    finalDuration: number;
    activeEffects: ActiveEffect[];
  };
  meta: {
    seed: number;
    template: string;
    generatedAt: string;
    generatorVersion: string;
  };
}
```

### Функции генератора

| Функция | Описание |
|---------|----------|
| `generateAllTechniques()` | Генерация техник для всех уровней |
| `generateTechniquesForLevel(level)` | Генерация для конкретного уровня |
| `generateTechniquesWithOptions(options)` | Генерация с параметрами |
| `getGenerationStats()` | Статистика генерации |

### Параметры генерации (GenerationOptions)

```typescript
interface GenerationOptions {
  level?: number;                // Уровень техник (1-9)
  minLevel?: number;
  maxLevel?: number;
  types?: TechniqueType[];       // Фильтр по типам
  elements?: Element[];          // Фильтр по элементам
  rarities?: Rarity[];           // Фильтр по редкости
  count?: number;                // Количество техник
  mode: 'replace' | 'append';    // Режим сохранения
  
  // Специфичные параметры
  rarity?: Rarity;               // Фиксированная редкость
  combatSubtype?: CombatSubtype; // Подтип combat
  weaponCategory?: string;       // Категория оружия
  weaponType?: string;           // Тип оружия
  damageVariance?: { min: number; max: number };
  paramBounds?: {
    damageMin?: number;
    damageMax?: number;
    qiCostMin?: number;
    qiCostMax?: number;
    rangeMin?: number;
    rangeMax?: number;
  };
}
```

---

## 🆔 Система ID префиксов (src/lib/generator/id-config.ts)

### Формат ID

```
PREFIX_NNNNNN

Примеры:
- MS_000001 — Удар телом
- MW_000042 — Оружейная техника
- RG_000123 — Дальняя атака
- DF_000007 — Защитная техника
```

### Префиксы

| Префикс | Название | Тип/Подтип |
|---------|----------|------------|
| `MS` | Melee Strike | combat/melee_strike |
| `MW` | Melee Weapon | combat/melee_weapon |
| `RG` | Ranged | combat/ranged_* |
| `DF` | Defense | defense |
| `CU` | Cultivation | cultivation |
| `SP` | Support | support |
| `MV` | Movement | movement |
| `SN` | Sensory | sensory |
| `HL` | Healing | healing |
| `CR` | Curse | curse |
| `PN` | Poison | poison |
| `FM` | Formation | — |
| `IT` | Item | — |
| `NP` | NPC | — |

### Функции ID

| Функция | Описание |
|---------|----------|
| `getPrefixForTechniqueType(type, subtype?)` | Получить префикс для типа |
| `getIdPrefixConfig(prefix)` | Конфигурация префикса |
| `generateId(prefix, counter)` | Сгенерировать ID |
| `parseId(id)` | Парсинг ID → { prefix, counter } |
| `isCombatPrefix(prefix)` | Проверка атакующего префикса |

---

## 💾 Хранилище пресетов (src/lib/generator/preset-storage.ts)

### Структура хранения

```
presets/
├── techniques/
│   ├── combat/
│   │   ├── melee-strike/level-{n}.json   (MS_ prefix)
│   │   ├── melee-weapon/level-{n}.json   (MW_ prefix)
│   │   └── ranged/level-{n}.json         (RG_ prefix)
│   ├── defense/level-{n}.json            (DF_ prefix)
│   ├── cultivation/level-{n}.json        (CU_ prefix)
│   └── ...
├── formations/
├── items/
├── npcs/
├── manifest.json
└── counters.json
```

### Функции PresetStorageService

| Функция | Описание |
|---------|----------|
| `initialize()` | Инициализация хранилища |
| `saveTechniques(techniques, mode)` | Сохранить техники |
| `loadTechniques()` | Загрузить все техники |
| `loadTechniquesByType(type)` | Загрузить по типу |
| `loadTechniquesBySubtype(subtype)` | Загрузить combat по подтипу |
| `getTechniqueById(id)` | Получить технику по ID |
| `clearAll(preserveCounters?)` | Полная очистка |
| `clearByType(type)` | Очистка по типу |
| `clearBySubtype(subtype)` | Очистка по подтипу combat |
| `getManifest()` | Получить манифест |
| `analyzeStorage()` | Анализ хранилища |

### Экспорт singleton

```typescript
import { presetStorage } from '@/lib/generator/preset-storage';

await presetStorage.initialize();
const techniques = await presetStorage.loadTechniquesBySubtype('melee_strike');
```

---

## 🎯 Пул техник (src/services/technique-pool.service.ts)

### Назначение

Управление генерацией, хранением и выбором техник при прорыве или прозрении.

### Основные функции

| Функция | Описание |
|---------|----------|
| `generateTechniquePool(options)` | Генерация пула техник |
| `getActivePool(characterId)` | Получить активный пул |
| `revealTechnique(poolItemId)` | Раскрыть технику (показать описание) |
| `selectTechniqueFromPool(poolItemId, characterId)` | Выбрать технику из пула |
| `checkAndGenerateOnBreakthrough(characterId, newLevel)` | Автогенерация при прорыве |

### Параметры генерации пула

```typescript
interface PoolOptions {
  characterId: string;
  targetLevel: number;           // Уровень техник в пуле
  triggerType: 'breakthrough' | 'insight' | 'scroll' | 'npc';
  count?: number;                // Количество техник (default: 5)
  preferredType?: TechniqueType;
  preferredElement?: TechniqueElement;
}
```

### Интеграция с системой прозрения

При выборе техники из пула:
1. Создаётся запись в БД (`db.technique.create`)
2. Создаётся `CharacterTechnique` с `learningProgress: 100`
3. Начисляется понимание Ци (`addQiUnderstanding`)
4. При достижении капа — может сработать прозрение (новая техника)

---

Этот документ содержит полный перечень всех экспортируемых функций, интерфейсов, типов и констант проекта.

---

## 📦 Унифицированные пресеты (src/data/presets/)

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

### Утилиты пресетов (index.ts)

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

## ⚔️ Техники (technique-presets.ts)

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

### Типы боевых техник (CombatTechniqueType)

| Тип | Описание |
|-----|----------|
| `melee_strike` | Контактный удар (без оружия) |
| `melee_weapon` | Усиление оружия / удар с оружием |
| `ranged_projectile` | Снаряд |
| `ranged_beam` | Луч |
| `ranged_aoe` | Область |
| `defense_block` | Блок (снижение урона) |
| `defense_shield` | Энергетический щит |
| `defense_dodge` | Уклонение |

### Элементы

`fire` | `water` | `earth` | `air` | `lightning` | `void` | `neutral`

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

## 🧘 Навыки культивации (skill-presets.ts)

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

### Функции

| Функция | Описание |
|---------|----------|
| `getSkillPresetById(id)` | Получить навык по ID |
| `getBasicSkills()` | Базовые навыки |
| `getAvailableSkillPresets(level, learned)` | Доступные навыки |
| `getSkillEffectAtLevel(id, level)` | Эффект на уровне |
| `calculateSkillsInterruptionModifier(learned)` | Множитель прерывания |
| `getSkillsBySource(source)` | Фильтр по источнику |

---

## 🔮 Формации (formation-presets.ts)

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

### Функции

| Функция | Описание |
|---------|----------|
| `getFormationPresetById(id)` | Получить формацию по ID |
| `getBasicFormations()` | Базовые формации |
| `getAvailableFormationPresets(level)` | Доступные формации |
| `getFormationsByDifficulty(max)` | По сложности |
| `getFormationEffects(id, quality)` | Эффекты с учётом качества |
| `calculateFormationInterruptionModifier(id, quality)` | Множитель прерывания |
| `getFormationPresetsByType(type)` | Фильтр по типу |

---

## 📦 Предметы (item-presets.ts)

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
  qiCharge?: number;
  sellPrice?: number;
  buyPrice?: number;
}
```

### Функции

| Функция | Описание |
|---------|----------|
| `getItemPresetById(id)` | Получить предмет по ID |
| `getItemPresetsByType(type)` | Фильтр по типу |
| `getConsumableItems()` | Расходуемые предметы |
| `getSpiritStones()` | Духовные камни |
| `getMaterials()` | Материалы |
| `getBuyableItems()` | Покупаемые предметы |
| `getItemPresetsByRarity(rarity)` | Фильтр по редкости |

---

## 👤 Персонажи (character-presets.ts)

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
}
```

### Функции

| Функция | Описание |
|---------|----------|
| `getCharacterPresetById(id)` | Получить персонажа по ID |
| `getCharacterPresetsByStartType(type)` | Фильтр по типу старта |
| `getDefaultSectPreset()` | Стартовый для секты |
| `getDefaultRandomPreset()` | Случайный старт |
| `getAllCharacterPresets()` | Все пресеты персонажей |

---

## ⚡ Система Истинности (src/lib/game/truth-system.ts)

### 🔄 ПАМЯТЬ ПЕРВИЧНА, БД ВТОРИЧНА

**TruthSystem** — singleton для управления активными сессиями в памяти. Все расчёты происходят в памяти, БД используется для persistence.

### Жизненный цикл сессии

```
1. Старт → loadSession() → загрузка из БД в память
2. Активная сессия → все операции в памяти, isDirty = true
3. Автосохранение → каждые 60 секунд (если isDirty)
4. Критические события → немедленное сохранение в БД
5. Завершение → unloadSession() → финальное сохранение
```

### Управление сессиями

| Функция | Описание |
|---------|----------|
| `TruthSystem.getInstance()` | Получить singleton инстанс |
| `loadSession(sessionId)` | Загрузить сессию из БД в память |
| `getSessionState(sessionId)` | Получить состояние из памяти |
| `getSessionByCharacter(characterId)` | Найти сессию по characterId |
| `unloadSession(sessionId)` | Выгрузить с сохранением в БД |
| `isSessionLoaded(sessionId)` | Проверить, загружена ли сессия |
| `getStats()` | Статистика активных сессий |

### Операции с персонажем

| Функция | Описание |
|---------|----------|
| `getCharacter(sessionId)` | Получить персонажа из памяти |
| `updateCharacter(sessionId, updates)` | Обновить (только память, isDirty=true) |
| `addQi(sessionId, amount)` | Добавить Ци (переполнение → accumulatedQi) |
| `spendQi(sessionId, amount)` | Потратить Ци (проверка достаточности) |

### Усталость

| Функция | Описание |
|---------|----------|
| `updateFatigue(sessionId, physical, mental)` | Изменить усталость |
| `recoverFatigue(sessionId, physical, mental)` | Восстановить усталость |

### КРИТИЧЕСКИЕ операции (БД + память)

| Функция | Описание |
|---------|----------|
| `applyBreakthrough(sessionId, data)` | **Прорыв уровня** - немедленное сохранение |
| `updateConductivity(sessionId, value, gained)` | **Проводимость** - немедленное сохранение |
| `addTechnique(sessionId, data)` | **Новая техника** - немедленное сохранение |
| `addInventoryItem(sessionId, data)` | **Новый предмет** - немедленное сохранение |
| `changeLocation(sessionId, locationId)` | **Смена локации** - сохранить → загрузить |

### Время

| Функция | Описание |
|---------|----------|
| `advanceTime(sessionId, minutes)` | Продвинуть время в памяти |
| `getWorldTime(sessionId)` | Получить время из памяти |

### Сохранение

| Функция | Описание |
|---------|----------|
| `saveToDatabase(sessionId)` | Полное сохранение в БД |
| `quickSave(sessionId)` | Быстрое сохранение (только критические данные) |

### Структуры данных

```typescript
interface SessionState {
  sessionId: string;
  characterId: string;
  character: CharacterState;      // Персонаж
  worldTime: WorldTimeState;      // Время мира
  worldState: Record<string, unknown>;  // Состояние мира
  currentLocation: LocationState | null;
  inventory: InventoryItemState[];
  techniques: TechniqueState[];
  lastSavedAt: Date;
  isDirty: boolean;               // Есть несохранённые изменения
  loadedAt: Date;
}
```

---

## ⚡ Система Ци (src/lib/game/qi-shared.ts)

### 🔄 ЕДИНСТВЕННОЕ МЕСТО ДЛЯ РАСЧЁТОВ ЯДРА ЦИ

Этот файл содержит **все** расчёты, связанные с Ци. Не дублируйте эти расчёты в других местах!

### Расчёты скорости

| Функция | Описание |
|---------|----------|
| `calculateCoreGenerationRate(coreCapacity)` | Скорость выработки микроядром (Ци/сек) |
| `getConductivityMultiplier(cultivationLevel)` | Множитель проводимости для уровня |
| `calculateEnvironmentalAbsorptionRate(conductivity, qiDensity, level)` | Скорость поглощения из среды |
| `calculateQiRates(character, location)` | Полные скорости накопления Ци |

### Расчёт времени

| Функция | Описание |
|---------|----------|
| `calculateTimeToFull(currentQi, coreCapacity, rates)` | Время до полного ядра (сек) |
| `formatTime(seconds)` | Форматирование времени |

### Прорыв

| Функция | Описание |
|---------|----------|
| `calculateBreakthroughRequirements(level, subLevel, accumulated, capacity)` | Требования для прорыва |
| `calculateBreakthroughResult(...)` | Результат попытки прорыва |
| `getCultivationLevelName(level)` | Название уровня культивации |
| `getBreakthroughProgress(...)` | Прогресс прорыва |

### Усталость при медитации

| Функция | Описание |
|---------|----------|
| `calculateMeditationFatigue(durationMinutes, type)` | Усталость при медитации |
| `calculateQiCost(action, cultivationLevel)` | Расход Ци на действие |

### Пассивное накопление и рассеивание

| Функция | Описание |
|---------|----------|
| `calculatePassiveQiGain(currentQi, coreCapacity, rate, delta)` | Пассивный прирост Ци (до 90%) |
| `calculatePassiveQiDissipation(currentQi, coreCapacity, conductivity, delta)` | **Рассеивание избыточной Ци** |
| `clampQiWithOverflow(newQi, coreCapacity, previousQi)` | Ограничение Ци с защитой от переполнения |
| `formatQiDissipationMessage(qiDissipated)` | Форматирование сообщения о рассеивании |

### Защита от переполнения ядра

```typescript
interface QiClampResult {
  actualQi: number;      // Реальное значение после ограничения
  qiAdded: number;       // Сколько добавилось
  qiDissipated: number;  // Сколько рассеялось
  wasOverflow: boolean;  // Было ли переполнение
}
```

### Рассеивание избыточной Ци

При `currentQi > coreCapacity`:
- Избыточная Ци «вытекает» через меридианы
- Скорость рассеивания = проводимость (Ци/сек)
- Пример: проводимость 10.80 → рассеивание 10.80 Ци/сек

### Вспомогательные

| Функция | Описание |
|---------|----------|
| `canMeditate(currentQi, coreCapacity)` | Проверка возможности медитации |
| `getCoreFillPercent(currentQi, coreCapacity)` | Прогресс заполнения ядра (%) |

---

## ⏰ Система времени (src/lib/game/time-system.ts)

### Основные функции

| Функция | Описание |
|---------|----------|
| `createInitialTime()` | Создать начальное время мира |
| `addTicks(time, ticks)` | Добавить тики (минуты) |
| `addMinutes(time, minutes)` | Добавить минуты |
| `addHours(time, hours)` | Добавить часы |

### Форматирование

| Функция | Описание |
|---------|----------|
| `formatTime(time)` | Форматировать время (HH:MM) |
| `formatDate(time)` | Форматировать дату |
| `formatDateTime(time)` | Полное время |
| `formatDuration(ticks)` | Длительность в читаемом виде |

### Время суток и сезоны

| Функция | Описание |
|---------|----------|
| `getTimeOfDay(time)` | Время суток (night/dawn/morning/day/evening/dusk) |
| `getTimeOfDayName(time)` | Название времени суток |
| `getSeason(time)` | Сезон (spring/summer/autumn/winter) |
| `getSeasonName(time)` | Название сезона |

### Действия

| Функция | Описание |
|---------|----------|
| `getActionTickCost(action)` | Стоимость действия в тиках |
| `isPauseAction(action)` | Проверка паузы времени |

### Конвертация

| Функция | Описание |
|---------|----------|
| `minutesToTicks(minutes)` | Минуты в тики |
| `hoursToTicks(hours)` | Часы в тики |
| `ticksToHoursMinutes(ticks)` | Тики в часы и минуты |

### Медитация

| Функция | Описание |
|---------|----------|
| `validateMeditationTime(ticks)` | Валидация времени медитации |
| `roundMeditationTime(ticks)` | Округление до 30 минут |

---

## 🗄️ Время в БД (src/lib/game/time-db.ts)

| Функция | Описание |
|---------|----------|
| `sessionToTime(session)` | Конвертировать сессию в WorldTime |
| `advanceWorldTime(sessionId, ticks)` | Продвинуть время в БД |
| `getWorldTime(sessionId)` | Получить текущее время |
| `formatWorldTimeForResponse(time)` | Форматировать для API |

---

## ⏱️ Единый сервис тиков времени (src/services/time-tick.service.ts)

### 🔄 ЕДИНСТВЕННОЕ МЕСТО ДЛЯ ЭФФЕКТОВ ВРЕМЕНИ

Все эффекты, связанные со временем, обрабатываются через этот сервис!

### Главная функция

```typescript
await processTimeTickEffects({
  characterId: string,
  sessionId: string,
  ticks: number,              // Количество тиков (минут)
  restType?: 'light' | 'sleep', // Если указан - восстановление усталости
  applyPassiveQi?: boolean,     // Пассивная генерация Ци (по умолчанию true)
  applyDissipation?: boolean,   // Рассеивание избытка Ци (по умолчанию true)
})
```

### Результат

```typescript
interface TimeTickResult {
  success: boolean;
  ticksAdvanced: number;
  dayChanged: boolean;
  
  qiEffects: {
    passiveGain: number;      // Пассивная генерация ядром
    dissipation: number;      // Рассеивание избыточной Ци
    finalQi: number;          // Итоговое количество Ци
  };
  
  fatigueEffects?: { ... };   // При отдыхе
  conductivityInfo?: { ... }; // Информация о проводимости
}
```

### Быстрые функции

| Функция | Описание |
|---------|----------|
| `processTimeTickEffects(options)` | Полная обработка тиков |
| `quickProcessQiTick(characterId, sessionId, ticks)` | Быстрая обработка (без отдыха) |
| `getCharacterConductivity(characterId)` | Получить информацию о проводимости |

### Где используется

- `/api/rest` - отдых и сон
- `/api/game/move` - движение
- `/api/meditation` - медитация (рассеивание при переполнении)

---

## ⚡ Проводимость меридиан (src/lib/game/conductivity-system.ts)

### 🔄 ЕДИНСТВЕННОЕ МЕСТО ДЛЯ РАСЧЁТА ПРОВОДИМОСТИ

**Вся математика проводимости находится только здесь!**

### Главная формула

```typescript
// Базовая проводимость
baseConductivity = coreCapacity / 360

// С множителем уровня
baseWithMultiplier = baseConductivity * CONDUCTIVITY_MULTIPLIERS[level]

// Бонус от медитаций на проводимость (МедП)
meditationBonus = МедП * baseConductivity * 0.1

// Итоговая проводимость
totalConductivity = baseWithMultiplier + meditationBonus
```

### Основные функции

| Функция | Описание |
|---------|----------|
| `calculateTotalConductivity(coreCapacity, level, meditations)` | **Главная функция** - итоговая проводимость |
| `getBaseConductivity(coreCapacity)` | Базовая проводимость (ёмкость/360) |
| `getBaseConductivityForLevel(coreCapacity, level)` | Базовая с множителем уровня |
| `calculateConductivityBonusFromMeditations(meditations, coreCapacity)` | Бонус от медитаций |

### Ограничения

| Функция | Описание |
|---------|----------|
| `getMaxConductivity(level)` | Максимальная проводимость для уровня |
| `getMaxConductivityMeditations(level)` | Макс. медитаций на проводимость |
| `canDoConductivityMeditation(level, meditations)` | Проверка возможности медитации |

### Прогресс

| Функция | Описание |
|---------|----------|
| `getConductivityMeditationProgress(coreCapacity, level, meditations)` | Прогресс медитаций |
| `getConductivityProgress(currentConductivity, level)` | Прогресс развития |
| `getConductivityTrainingAdvice(currentConductivity, level)` | Рекомендации |

---

## ⚔️ Боевая система (src/lib/game/combat-system.ts)

### Время наполнения (каст)

| Функция | Описание |
|---------|----------|
| `calculateCastTime(qiCost, conductivity, level, mastery)` | Время наполнения техники |
| `formatCastTime(seconds)` | Форматировать время каста |

### Масштабирование

| Функция | Описание |
|---------|----------|
| `calculateStatScalingByType(character, combatType)` | Множитель от характеристик по типу |
| `calculateStatScaling(character, scaling)` | Множитель от характеристик (legacy) |
| `calculateMasteryMultiplier(mastery, masteryBonus)` | Множитель от мастерства |

### Типы техник

| Функция | Описание |
|---------|----------|
| `isMeleeTechnique(combatType)` | Проверка melee техники |
| `isRangedTechnique(combatType)` | Проверка ranged техники |
| `isDefenseTechnique(combatType)` | Проверка защитной техники |
| `getEffectiveRange(technique)` | Эффективная дальность |

### Защитные техники

| Функция | Описание |
|---------|----------|
| `calculateBlockResult(technique, character, damage, penetration)` | Результат блока |
| `calculateShieldResult(technique, character, damage, shieldHP)` | Результат щита |
| `calculateDodgeResult(technique, character, baseChance)` | Результат уклонения |

### Урон

| Функция | Описание |
|---------|----------|
| `calculateDamageAtDistance(baseDamage, distance, range)` | Урон на дистанции |
| `checkDodge(attackerPos, targetPos, dodgeChance, agility)` | Проверка уклонения |
| `calculateAttackDamage(technique, character, target, distance, mastery)` | Итоговый урон атаки |

### Утилиты

| Функция | Описание |
|---------|----------|
| `formatRange(range)` | Форматировать дальность |
| `getDamageZoneDescription(zone)` | Описание зоны урона |
| `createCombatRange(fullDamage, halfMult, maxMult)` | Создать структуру дальности |

---

## 😴 Система усталости (src/lib/game/fatigue-system.ts)

### Множители

| Функция | Описание |
|---------|----------|
| `getFatigueAccumulationMultiplier(level)` | Множитель накопления усталости |
| `getFatigueRecoveryMultiplier(level)` | Множитель восстановления |

### Расчёты

| Функция | Описание |
|---------|----------|
| `calculateFatigueFromAction(character, action, duration, qiSpent)` | Усталость от действия |
| `calculateRestRecovery(character, duration, isSleep)` | Восстановление при отдыхе |
| `calculateEfficiencyModifiers(physicalFatigue, mentalFatigue)` | Множители эффективности |
| `calculatePassiveRecovery(character, deltaTime)` | Пассивное восстановление |

---

## 🛡️ Безопасность (src/lib/)

### Rate Limiting (rate-limit.ts)

| Функция | Описание |
|---------|----------|
| `checkRateLimit(identifier, maxRequests, windowMs)` | Проверка лимита запросов |
| `resetRateLimit(identifier)` | Сброс лимита |
| `getRateLimitStatus(identifier, maxRequests, windowMs)` | Текущий статус |
| `createRateLimiter(maxRequests, windowMs)` | Создать лимитер |

### Готовые лимитеры

```typescript
rateLimiters.chat   // 30 запросов/мин
rateLimiters.game   // 60 запросов/мин
rateLimiters.auth   // 5 запросов/мин
rateLimiters.api    // 100 запросов/мин
```

### Валидация размера запроса (request-size-validator.ts)

| Функция | Описание |
|---------|----------|
| `validateRequestSize(request, maxSize)` | Проверка размера запроса |
| `payloadTooLargeResponse(contentLength, maxSize)` | Ответ 413 |

### Лимиты размера

```typescript
REQUEST_SIZE_LIMITS = {
  DEFAULT: 1MB,
  CHAT: 1MB,
  MOVEMENT: 100KB,
  TECHNIQUE: 100KB,
  INVENTORY: 256KB,
  MEDITATION: 100KB,
}
```

---

## 📡 API Эндпоинты

### Игровые

| Эндпоинт | Метод | Описание |
|----------|-------|----------|
| `/api/game/start` | POST | Создать новую игру |
| `/api/game/state` | GET | Получить состояние |
| `/api/game/move` | POST | Движение + время + пассивное Ци |
| `/api/game/save` | POST | Сохранить игру |
| `/api/rest` | POST | Медитация, отдых, сон |
| `/api/technique/use` | POST | Использовать технику |
| `/api/technique/slot` | POST | Назначить технику в слот |
| `/api/chat` | POST | Действие + LLM ответ |
| `/api/inventory` | GET | Получить инвентарь |
| `/api/inventory/use` | POST | Использовать предмет |

### Системные

| Эндпоинт | Метод | Описание |
|----------|-------|----------|
| `/api/database/migrate` | GET/POST | Статус/миграция БД |
| `/api/database/reset` | POST | Сброс БД |
| `/api/llm/status` | GET | Статус LLM провайдеров |
| `/api/settings/llm` | GET/POST | Настройки LLM |
| `/api/system/gpu` | GET | Информация о GPU |

---

## 📊 Системные константы (constants.ts)

### Время

| Константа | Значение | Описание |
|-----------|----------|----------|
| `TICK_MINUTES` | 1 | Минут за тик |
| `TICK_INTERVAL_MS` | 3000 | Интервал синхронизации |
| `MINUTES_PER_HOUR` | 60 | Минут в часе |
| `HOURS_PER_DAY` | 24 | Часов в дне |

### Медитация

| Константа | Значение | Описание |
|-----------|----------|----------|
| `MIN_MEDITATION_TICKS` | 30 | Мин. время медитации (30 мин) |
| `MAX_MEDITATION_TICKS` | 480 | Макс. время медитации (8 ч) |
| `MEDITATION_TICK_STEP` | 30 | Шаг времени (30 мин) |

### Отдых

| Константа | Значение | Описание |
|-----------|----------|----------|
| `SLEEP_PHYSICAL_RECOVERY` | 0.208 | %/мин (100% за 8ч) |
| `SLEEP_MENTAL_RECOVERY` | 0.208 | %/мин (100% за 8ч) |
| `REST_LIGHT_PHYSICAL` | 0.05 | %/мин при отдыхе |
| `MAX_REST_DURATION` | 480 | Макс. время отдыха (мин) |

### Ци

| Константа | Значение | Описание |
|-----------|----------|----------|
| `PASSIVE_QI_CAP` | 0.9 | Кап пассивного накопления (90%) |
| `BASE_QI_REGEN_RATE` | 0.1 | Базовая скорость регена Ци |
| `CORE_GENERATION_RATE` | 0.01 | Скорость выработки ядра |

### Усталость

| Константа | Значение | Описание |
|-----------|----------|----------|
| `CRITICAL_FATIGUE_THRESHOLD` | 90 | Критическая усталость (%) |
| `HIGH_FATIGUE_THRESHOLD` | 70 | Высокая усталость (%) |
| `PASSIVE_PHYSICAL_RATE` | 0.5 | Пассивное восстановление (%/ч) |
| `PASSIVE_MENTAL_RATE` | 0.3 | Пассивное восстановление (%/ч) |

---

## 🎮 Игровые константы (PhaserGame.tsx)

| Константа | Значение | Описание |
|-----------|----------|----------|
| `METERS_TO_PIXELS` | 32 | Пикселей в метре |
| `PLAYER_SIZE` | 24 | Размер спрайта игрока |
| `PLAYER_SPEED` | 200 | Скорость движения (пикс/сек) |
| `PLAYER_HITBOX_RADIUS` | 24 | Радиус хитбокса игрока (~0.75 м) |
| `TARGET_HITBOX_RADIUS` | 22 | Радиус хитбокса мишени (~0.69 м) |
| `MELEE_MAX_RANGE` | 2 | Макс. дальность melee (м) |

---

*Документ актуален на 2026-02-28*

---

## 🚨 НАЙДЕННЫЕ ДУБЛИКАТЫ

### ✅ ИСПРАВЛЕНО: Названия уровней культивации

**Была проблема:** Названия уровней культивации отличались в разных файлах!

**Исправлено (2026-02-28):**
- `src/lib/game/response-builders.ts` - теперь импортирует `getCultivationLevelName` из `qi-shared.ts`
- `src/prompts/builder.ts` - теперь импортирует `getCultivationLevelName` из `qi-shared.ts`

**Единый источник:** `src/lib/game/constants.ts` → `CULTIVATION_LEVEL_NAMES`

| Уровень | Название (единое) |
|---------|-------------------|
| 1 | Пробуждённое Ядро |
| 2 | Течение Жизни |
| 3 | Пламя Внутреннего Огня |
| 4 | Объединение Тела и Духа |
| 5 | Сердце Небес |
| 6 | Разрыв Пелены |
| 7 | Вечное Кольцо |
| 8 | Глас Небес |
| 9 | Бессмертное Ядро |
| 10 | Вознесение |

---

## 📋 Чек-лист для разработчиков

При добавлении новых расчётов:

- [ ] Проверить, нет ли уже функции в qi-shared.ts
- [ ] Проверить, нет ли уже функции в conductivity-system.ts
- [ ] Использовать time-tick.service.ts для эффектов времени
- [ ] Использовать TruthSystem для операций в активной сессии
- [ ] НЕ дублировать формулы в компонентах или API
- [ ] Импортировать функции из единого источника
- [ ] Проверить constants.ts на наличие нужных констант перед созданием новых

### Работа с TruthSystem

При создании новых API routes:

- [ ] Проверять наличие сессии в памяти через `TruthSystem.getSessionByCharacter()`
- [ ] Использовать методы TruthSystem для операций (addQi, spendQi, updateFatigue)
- [ ] Критические операции (новые техники, прорыв) → немедленное сохранение
- [ ] Обычные операции → только память, isDirty = true
- [ ] Возвращать `source: 'memory' | 'database'` в ответе
