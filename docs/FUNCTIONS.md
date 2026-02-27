# Функции и типы проекта Cultivation World Simulator

**Последнее обновление:** 2026-02-12

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

## ⚡ Система Ци (src/lib/game/qi-shared.ts)

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

### Пассивное накопление

| Функция | Описание |
|---------|----------|
| `calculatePassiveQiGain(currentQi, coreCapacity, rate, delta)` | Пассивный прирост Ци |

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

*Документ актуален на 2026-02-12*
