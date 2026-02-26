# Функции и типы проекта Cultivation World Simulator

**Последнее обновление:** 2026-02-24

Этот документ содержит полный перечень всех экспортируемых функций, интерфейсов, типов и констант проекта.

---

## Решённые дубликаты

Следующие дубликаты были устранены:

| Проблема | Решение | Дата |
|----------|---------|------|
| **TechniqueType** в 2 файлах | qi-insight.ts импортирует из techniques.ts | ✅ Исправлено |
| **TechniqueElement** без lightning | Добавлен `lightning` в techniques.ts, qi-insight.ts импортирует | ✅ Исправлено |
| **GameAction** в llm/types.ts | Переименован в `ParsedInput` | ✅ Исправлено |
| **calculateTravelTime** × 2 | Переименованы в `calculateLocationTravelTime` и `calculatePositionTravelTime` | ✅ Исправлено |
| **LocationData** × 5 файлов | Унифицирован в game-shared.ts | ✅ Исправлено (2026-02-24) |

### Устранённые deprecated-функции (2026-02-24)

| Функция | Было | Стало |
|---------|------|-------|
| `calculateTimeToFull` | @deprecated в qi-system.ts | Экспорт из qi-shared.ts |
| `calculateQiAccumulationRate` | @deprecated в qi-system.ts | Удалена (используйте calculateQiRates) |

---

## src/types/*.ts — Типы

### game-shared.ts — Общие типы для клиента и сервера (НОВОЕ)

#### Интерфейсы
| Имя | Строка | Описание |
|-----|--------|----------|
| `LocationData` | :29 | Данные о локации для расчётов (qiDensity, qiFlowRate, distanceFromCenter, terrainType) |
| `CharacterQiData` | :48 | Минимальные данные персонажа для расчётов Ци |
| `QiRatesData` | :57 | Результаты расчёта скоростей Ци |

**Примечание:** LocationData используется в qi-system.ts, qi-shared.ts, request-router.ts, environment-system.ts, meditation-interruption.ts

---

### game.ts — Общие типы игры

#### Интерфейсы
| Имя | Строка | Описание |
|-----|--------|----------|
| `Character` | :10 | Персонаж игрока |
| `Location` | :53 | Локация в мире |
| `Sect` | :63 | Секта культиваторов |
| `WorldTime` | :72 | Время мира |
| `Message` | :84 | Сообщение в чате |
| `GameState` | :94 | Состояние игры |
| `GameAction` | :120 | Игровое действие |
| `ServerResponse` | :127 | Ответ сервера |
| `BreakthroughRequirements` | :156 | Требования для прорыва |
| `BreakthroughResult` | :165 | Результат прорыва |
| `MeditationResult` | :175 | Результат медитации |
| `QiRates` | :193 | Скорости накопления Ци |
| `InventoryItem` | — | Предмет инвентаря |
| `CharacterTechnique` | — | Изученная техника персонажа |
| `CharacterSkill` | — | Навык культивации персонажа |
| `Technique` | — | Активная техника |

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `GameActionType` | :108 | Типы игровых действий |

---

### branded.ts — Branded Types для type-safe ID

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `SessionId` | :16 | ID сессии |
| `CharacterId` | :19 | ID персонажа |
| `LocationId` | :22 | ID локации |
| `MessageId` | :25 | ID сообщения |
| `SectId` | :28 | ID секты |
| `NPCId` | :31 | ID NPC |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `asSessionId` | :36 | Приведение к SessionId |
| `asCharacterId` | :39 | Приведение к CharacterId |
| `asLocationId` | :42 | Приведение к LocationId |
| `asMessageId` | :45 | Приведение к MessageId |
| `asSectId` | :48 | Приведение к SectId |
| `asNPCId` | :51 | Приведение к NPCId |
| `extractId` | :78 | Извлечение строки из branded типа |

#### Zod схемы
| Имя | Строка | Описание |
|-----|--------|----------|
| `sessionIdSchema` | :58 | Zod схема для SessionId |
| `characterIdSchema` | :61 | Zod схема для CharacterId |
| `locationIdSchema` | :64 | Zod схема для LocationId |
| `messageIdSchema` | :67 | Zod схема для MessageId |
| `sectIdSchema` | :70 | Zod схема для SectId |
| `npcIdSchema` | :73 | Zod схема для NPCId |

---

## src/lib/validations/*.ts — Валидация (НОВОЕ)

### game.ts — Zod схемы для API

#### Zod схемы
| Имя | Строка | Описание |
|-----|--------|----------|
| `sendMessageSchema` | :15 | Валидация отправки сообщения |
| `customConfigSchema` | :30 | Валидация кастомной конфигурации |
| `startGameSchema` | :46 | Валидация старта игры |
| `saveGameSchema` | :66 | Валидация сохранения |
| `loadGameSchema` | :78 | Валидация загрузки |
| `llmSettingsSchema` | :89 | Валидация настроек LLM |
| `cheatRequestSchema` | :115 | Валидация чит-команд |
| `inventoryQuerySchema` | :128 | Валидация GET инвентаря |
| `inventoryAddSchema` | :137 | Валидация добавления предмета |
| `inventoryUseSchema` | :153 | Валидация использования предмета |
| `techniquePoolQuerySchema` | :165 | Валидация GET пула техник |
| `techniquePoolGenerateSchema` | :174 | Валидация генерации пула |
| `techniquePoolActionSchema` | :188 | Валидация выбора техники |
| `databaseMigrateSchema` | :204 | Валидация миграции БД |
| `logsQuerySchema` | :219 | Валидация запроса логов |
| `logsActionSchema` | :230 | Валидация действий с логами |
| `logsDeleteSchema` | :241 | Валидация удаления логов |
| `characterDataQuerySchema` | :253 | Валидация запроса данных персонажа |
| `queryParamsSchema` | :317 | Валидация query параметров |

#### Типы (z.infer)
| Имя | Строка | Описание |
|-----|--------|----------|
| `SendMessageInput` | :22 | Тип для sendMessageSchema |
| `CustomConfig` | :41 | Тип для customConfigSchema |
| `StartGameInput` | :59 | Тип для startGameSchema |
| `SaveGameInput` | :71 | Тип для saveGameSchema |
| `LoadGameInput` | :82 | Тип для loadGameSchema |
| `LLMSettingsInput` | :98 | Тип для llmSettingsSchema |
| `CheatRequestInput` | :121 | Тип для cheatRequestSchema |
| `InventoryQueryInput` | :132 | Тип для inventoryQuerySchema |
| `InventoryAddInput` | :148 | Тип для inventoryAddSchema |
| `InventoryUseInput` | :158 | Тип для inventoryUseSchema |
| `TechniquePoolQueryInput` | :169 | Тип для techniquePoolQuerySchema |
| `TechniquePoolGenerateInput` | :183 | Тип для techniquePoolGenerateSchema |
| `TechniquePoolActionInput` | :197 | Тип для techniquePoolActionSchema |
| `DatabaseMigrateInput` | :212 | Тип для databaseMigrateSchema |
| `LogsQueryInput` | :225 | Тип для logsQuerySchema |
| `LogsActionInput` | :236 | Тип для logsActionSchema |
| `LogsDeleteInput` | :246 | Тип для logsDeleteSchema |
| `CharacterDataQueryInput` | :258 | Тип для characterDataQuerySchema |
| `QueryParams` | :323 | Тип для queryParamsSchema |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `validateOrError` | :266 | Валидация с возвратом результата |
| `validateOrThrow` | :287 | Валидация с выбросом ошибки |
| `validationErrorResponse` | :304 | Стандартизированный ответ об ошибке |
| `parseQueryParams` | :328 | Парсинг URL query параметров |

---

## src/lib/game/*.ts — Игровые механики

### technique-learning.ts — Система обучения техникам

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `LEARNING_RATES` | :29 | Скорость обучения (% в час) по источникам |
| `LEVEL_PENALTY` | :46 | Множители штрафа за уровень техники |
| `LEARNING_BONUSES` | :57 | Бонусы от характеристик к обучению |

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `LearningSource` | :69 | Источник изучения техники |
| `LearningProgress` | :71 | Прогресс изучения техники |
| `LearningResult` | :79 | Результат обучения |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `calculateLearningSpeed` | :95 | Расчёт скорости обучения |
| `calculateTimeToComplete` | :127 | Расчёт времени до завершения обучения |
| `processLearning` | :141 | Обработка прогресса обучения |
| `canStartLearning` | :191 | Проверка возможности обучения |
| `formatLearningProgress` | :230 | Генерация описания прогресса обучения |

---

### world-coordinates.ts — Система координат мира

#### Интерфейсы
| Имя | Строка | Описание |
|-----|--------|----------|
| `WorldPosition` | :20 | 3D позиция в мире (x, y, z) |
| `WorldPosition2D` | :26 | 2D позиция для карты |

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `WORLD_BOUNDS` | :38 | Размеры мира (в метрах) |
| `HEIGHT_ZONES` | :50 | Типы высот (подземелья, поверхность, горы, небо) |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `getDistance3D` | :77 | Расчёт 3D расстояния между точками |
| `getDistance2D` | :88 | Расчёт 2D расстояния (для карты) |
| `getDistanceFromCenter` | :98 | Расчёт расстояния от центра мира |
| `getDirection` | :106 | Расчёт направления между точками (в градусах) |
| `getDirectionName` | :114 | Получение названия направления |
| `formatDistance` | :130 | Форматирование расстояния для отображения |
| `getHeightZone` | :143 | Получение зоны высоты |
| `isPositionAccessible` | :155 | Проверка доступности позиции для уровня культивации |
| `generateRandomPosition` | :189 | Генерация случайной позиции в радиусе от центра |
| `toMapPosition` | :207 | Конвертация в 2D для карты |
| `calculatePositionTravelTime` | :215 | Расчёт пути между 3D позициями |
| `isValidPosition` | :231 | Проверка валидности позиции |

---

### meditation-interruption.ts — Система прерывания медитации

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `LocationDanger` | :27 | Уровень опасности локации |
| `InterruptionEvent` | :29 | Событие прерывания медитации |
| `InterruptionCheckResult` | :45 | Результат проверки прерывания |

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `LOCATION_BASE_CHANCE` | :65 | Базовый шанс прерывания по типу локации |
| `TIME_MODIFIERS` | :88 | Множитель шанса по времени суток |
| `INTERRUPTION_EVENTS` | :101 | Таблица событий прерывания |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `getTimeOfDay` | :291 | Определение времени суток |
| `getLocationDangerLevel` | :303 | Определение уровня опасности локации |
| `getLocationBaseChance` | :320 | Получение базового шанса прерывания |
| `calculateCultivationModifier` | :343 | Расчёт модификатора от уровня культивации |
| `calculateSkillModifier` | :369 | Модификатор от навыков персонажа |
| `calculateFormationModifier` | :378 | Модификатор от формации |
| `calculateInterruptionChance` | :388 | Полный расчёт шанса прерывания |
| `checkMeditationInterruption` | :444 | Проверка прерывания на каждом часу медитации |
| `selectInterruptionEvent` | :492 | Выбор события прерывания |
| `generateInterruptionPrompt` | :543 | Генерация промпта для LLM при прерывании |

---

### constants.ts — Общие константы игры

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `QI_CONSTANTS` | :8 | Константы системы Ци |
| `BREAKTHROUGH_CONSTANTS` | :37 | Константы прорыва |
| `MEDITATION_CONSTANTS` | :57 | Константы медитации |
| `FATIGUE_CONSTANTS` | :70 | Константы усталости |
| `FATIGUE_RECOVERY_BY_LEVEL` | :112 | Множители восстановления усталости по уровню |
| `FATIGUE_ACCUMULATION_BY_LEVEL` | :130 | Множители накопления усталости по уровню |
| `CULTIVATION_LEVEL_NAMES` | :144 | Названия уровней культивации |
| `COMBAT_ACTION_COSTS` | :164 | Затраты Ци на боевые действия |
| `CULTIVATION_ACTION_COSTS` | :173 | Затраты Ци на культивацию |
| `HEALING_ACTION_COSTS` | :181 | Затраты Ци на лечение |
| `QI_COSTS` | :188 | Все затраты Ци |
| `QI_UNDERSTANDING_CAP` | :204 | Кап понимания Ци по уровням |
| `INSIGHT_CONSTANTS` | :219 | Константы системы прозрения |

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `MeditationType` | :160 | Тип медитации ('accumulation' \| 'breakthrough') |

---

### qi-system.ts — Система Ци (серверная логика)

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `performMeditation` | :29 | Выполнение медитации |
| `attemptBreakthrough` | :116 | Попытка прорыва |

---

### qi-shared.ts — Общие функции расчёта Ци

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `calculateCoreGenerationRate` | :21 | Расчёт скорости выработки микроядром |
| `getConductivityMultiplier` | :29 | Получить множитель проводимости для уровня |
| `calculateEnvironmentalAbsorptionRate` | :38 | Расчёт скорости поглощения из среды |
| `calculateQiRates` | :50 | Полные скорости накопления Ци |
| `calculateTimeToFull` | :74 | Расчёт времени до полного ядра (в секундах) |
| `formatTime` | :90 | Форматирование времени для отображения |
| `calculateBreakthroughRequirements` | :109 | Расчёт требований для прорыва |
| `getCultivationLevelName` | :141 | Получить название уровня культивации |
| `calculateBreakthroughResult` | :149 | Расчёт результата попытки прорыва |
| `calculateMeditationFatigue` | :223 | Расчёт снятия усталости при медитации |
| `calculateQiCost` | :244 | Расчёт расхода Ци на действие |
| `calculatePassiveQiGain` | :259 | Расчёт пассивного накопления Ци |
| `canMeditate` | :283 | Проверка возможности медитации |
| `getCoreFillPercent` | :291 | Прогресс заполнения ядра (в процентах) |
| `getBreakthroughProgress` | :298 | Прогресс прорыва |

---

### techniques.ts — Система активных техник

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `TechniqueType` | :28 | Тип техники (combat, cultivation, support, movement, sensory, healing) |
| `TechniqueRarity` | :36 | Редкость техники |
| `TechniqueElement` | :38 | Элемент техники |

#### Интерфейсы
| Имя | Строка | Описание |
|-----|--------|----------|
| `Technique` | :44 | Полное описание техники |
| `TechniqueUseResult` | :102 | Результат использования техники |

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `BASE_TECHNIQUES` | :326 | Базовые техники (будут перенесены в пресеты) |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `calculateTechniqueEffectiveness` | :119 | Расчёт эффективности техники от характеристик |
| `canUseTechnique` | :151 | Проверка возможности использования техники |
| `canLearnTechnique` | :191 | Проверка возможности изучения техники |
| `useTechnique` | :225 | Использование техники |
| `validateNewTechnique` | :280 | Валидация новой техники |
| `generateTechniqueId` | :314 | Генерация ID техники на основе имени |

---

### entity-system.ts — Система встреченных персонажей и монстров

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `EntityType` | :14 | Тип сущности (npc, monster, animal, spirit) |
| `EntityImportance` | :17 | Ранг важности |
| `EncounteredEntity` | :20 | Интерфейс встреченной сущности |
| `EntityMemory` | :56 | Воспоминание о взаимодействии |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `shouldForget` | :79 | Проверка, нужно ли забыть сущность |
| `calculateMemoryFreshness` | :94 | Расчёт "свежести" воспоминания |
| `updateEntityOnEncounter` | :109 | Обновление при новой встрече |
| `createEntity` | :132 | Создание новой сущности |
| `generateEntityDescriptionForLLM` | :153 | Генерация описания для LLM |
| `filterByFreshness` | :190 | Фильтрация сущностей по свежести памяти |
| `getTopEntities` | :201 | Получение топ-N сущностей по важности |
| `calculateMonsterPower` | :223 | Расчёт силы монстра для боя |
| `inferEntityType` | :241 | Определение типа сущности из описания LLM |
| `inferEntityImportance` | :257 | Определение важности сущности |

---

### fatigue-system.ts — Система усталости

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `ActionType` | :24 | Типы действий для расчёта усталости |
| `FatigueResult` | :67 | Результат расчёта усталости |
| `EfficiencyModifiers` | :193 | Множители эффективности |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `getFatigueAccumulationMultiplier` | :79 | Получить множитель накопления усталости |
| `getFatigueRecoveryMultiplier` | :86 | Получить множитель восстановления усталости |
| `calculateFatigueFromAction` | :91 | Расчёт усталости от действия |
| `calculateRestRecovery` | :173 | Расчёт восстановления во сне |
| `calculateEfficiencyModifiers` | :200 | Влияние усталости на эффективность |
| `calculatePassiveRecovery` | :221 | Автоматическое восстановление |

---

### qi-insight.ts — Система прозрения

#### Интерфейсы
| Имя | Строка | Описание |
|-----|--------|----------|
| `InsightResult` | :23 | Результат прозрения |
| `AnalysisResult` | :25 | Результат разбора техники |
| `GeneratedTechnique` | :38 | Сгенерированная техника |
| `CharacterForInsight` | :47 | Интерфейс персонажа для прозрения |
| `TechniqueForAnalysis` | :55 | Интерфейс техники для разбора |

**Примечание:** `TechniqueType` и `TechniqueElement` импортируются из `techniques.ts`

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `getQiUnderstandingCap` | :69 | Получить максимальное понимание Ци для уровня |
| `calculateQiUnderstandingGain` | :77 | Рассчитать прирост понимания Ци при изучении |
| `calculateAnalysisQiGain` | :85 | Рассчитать прирост при разборе техники |
| `addQiUnderstanding` | :92 | Добавить понимание Ци и проверить прозрение |
| `canAnalyzeTechnique` | :120 | Проверить возможность разбора техники |
| `calculateInsightChance` | :146 | Рассчитать шанс создания новой техники |
| `analyzeTechnique` | :163 | Разобрать технику |
| `generateTechniqueFromInsight` | :221 | Сгенерировать новую технику при прозрении |
| `generateSimilarTechnique` | :259 | Сгенерировать похожую технику при разборе |
| `getQiUnderstandingProgress` | :336 | Получить прогресс понимания Ци (в процентах) |
| `getQiUnderstandingDescription` | :344 | Получить текстовое описание прогресса |

---

### cultivation-skills.ts — Система пассивных навыков культивации

#### Интерфейсы
| Имя | Строка | Описание |
|-----|--------|----------|
| `CultivationSkill` | :21 | Пассивный навык культивации |

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `CULTIVATION_SKILLS` | :44 | Список навыков культивации |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `getSkillEffect` | :125 | Получение эффекта навыка на определённом уровне |
| `calculateSkillsInterruptionModifier` | :152 | Расчёт множителя прерывания от навыков |
| `getSkillById` | :170 | Получение информации о навыке |
| `canLearnSkill` | :177 | Проверка доступности навыка для изучения |
| `getAvailableSkills` | :215 | Получение списка доступных навыков |

---

### formations.ts — Система формаций для культивации

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `FormationType` | :20 | Тип формации |

#### Интерфейсы
| Имя | Строка | Описание |
|-----|--------|----------|
| `Formation` | :22 | Описание формации |

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `FORMATIONS` | :47 | Список формаций |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `getFormationEffect` | :128 | Получение эффекта формации |
| `calculateFormationInterruptionModifier` | :150 | Расчёт множителя прерывания от формации |
| `canCreateFormation` | :166 | Проверка возможности создания формации |
| `getAvailableFormations` | :215 | Получение списка доступных формаций |

---

### conductivity-system.ts — Система развития проводимости

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `MAX_CONDUCTIVITY_BY_LEVEL` | :29 | Максимальная проводимость для каждого уровня |
| `CONDUCTIVITY_GAIN` | :44 | Прирост проводимости от действий |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `getMaxConductivity` | :68 | Получить максимальную проводимость для уровня |
| `getBaseConductivityForLevel` | :76 | Получить базовую проводимость при повышении уровня |
| `calculateConductivityGainFromMeditation` | :85 | Рассчитать прирост проводимости от медитации |
| `calculateConductivityGainFromTechnique` | :107 | Рассчитать прирост проводимости от использования техники |
| `calculateConductivityGainFromBreakthrough` | :126 | Рассчитать прирост при прорыве |
| `canImproveConductivity` | :146 | Проверка возможности развития проводимости |
| `getConductivityProgress` | :165 | Получить прогресс развития проводимости |
| `getConductivityTrainingAdvice` | :182 | Рекомендации по развитию проводимости |

---

### request-router.ts — Динамический маршрутизатор запросов

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `RequestType` | :21 | Типы запросов |
| `RoutingResult` | :36 | Результат маршрутизации |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `identifyRequestType` | :44 | Определение типа запроса |
| `routeRequest` | :103 | Маршрутизация запроса |
| `needsLLM` | :286 | Проверка, нужен ли LLM для запроса |

---

### environment-system.ts — Система окружения

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `TerrainType` | :15 | Типы местности |
| `TerrainEffects` | :28 | Эффекты местности |
| `EnvironmentInfluence` | :110 | Результат влияния окружения |

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `TERRAIN_EFFECTS` | :36 | Эффекты местности |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `calculateEnvironmentInfluence` | :120 | Расчёт влияния окружения |
| `calculateLocationTravelTime` | :175 | Расчёт времени путешествия между локациями |
| `canDetectLeylines` | :213 | Обнаружение лей-линий |
| `calculateLeylineBreakthroughBonus` | :219 | Расчёт бонуса от лей-линии для прорыва |
| `checkTechniqueAvailability` | :235 | Проверка доступности техник |

---

### index.ts — Главный модуль игровых механик

Экспортирует все подсистемы из файлов выше.

---

## src/lib/llm/*.ts — AI и LLM

### types.ts — Типы для системы LLM

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `LLMProvider` | :4 | Типы провайдеров (z-ai, local, api) |
| `ParsedCommand` | :114 | Результат парсинга команды |

#### Интерфейсы
| Имя | Строка | Описание |
|-----|--------|----------|
| `LLMConfig` | :7 | Конфигурация LLM |
| `LLMMessage` | :25 | Сообщение для LLM |
| `LLMResponse` | :31 | Ответ от LLM |
| `LLMAvailability` | :43 | Результат проверки доступности |
| `LLMStatus` | :50 | Статус провайдеров |
| `LLMProviderStatus` | :56 | Статус провайдера |
| `ParsedInput` | :64 | Распарсенный ввод пользователя (ранее GameAction) |
| `GameResponse` | :71 | Ответ игры |
| `CharacterState` | :87 | Состояние персонажа |
| `TimeAdvance` | :107 | Продвижение времени |

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `DEFAULT_LLM_CONFIG` | :175 | Дефолтная конфигурация LLM |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `parseCommand` | :122 | Парсинг команд |

---

### providers.ts — LLM Provider Interface и реализации

#### Интерфейсы
| Имя | Строка | Описание |
|-----|--------|----------|
| `ILLMProvider` | :7 | Интерфейс провайдера LLM |

#### Классы
| Имя | Строка | Описание |
|-----|--------|----------|
| `ZAIProvider` | :14 | Z-AI провайдер |
| `LocalLLMProvider` | :122 | Локальный LLM провайдер (Ollama) |
| `APIProvider` | :309 | External API провайдер |
| `LLMManager` | :410 | Менеджер LLM провайдеров |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `createLLMManager` | :569 | Фабрика для создания LLMManager |

---

### index.ts — Экспорт LLM модуля

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `initializeLLM` | :14 | Инициализация LLM менеджера |
| `getLLMManager` | :27 | Получение LLM менеджера |
| `updateOllamaEndpoint` | :35 | Обновление конфигурации Ollama endpoint |
| `updateLLMConfig` | :41 | Обновление конфигурации LLM |
| `isLLMReady` | :47 | Проверка готовности LLM |
| `setPreferredProvider` | :52 | Установка предпочтительного провайдера |
| `generateGameResponse` | :58 | Утилита для генерации ответа игры |
| `checkLLMStatus` | :187 | Проверка доступности провайдеров |

---

## src/services/*.ts — Сервисы

### character.service.ts — Character Service

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `CharacterWithRelations` | :13 | Тип для Prisma Character include |
| `CharacterResult` | :21 | Результат операции с персонажем |
| `CharacterUpdateResult` | :27 | Результат обновления персонажа |

#### Класс
| Имя | Метод | Строка | Описание |
|-----|-------|--------|----------|
| `CharacterService` | `getCharacter` | :41 | Получить персонажа по ID |
| `CharacterService` | `updateCharacter` | :65 | Обновить персонажа с частичными данными |
| `CharacterService` | `applyFatigue` | :123 | Применить изменения усталости |
| `CharacterService` | `getCharacterWithLocation` | :175 | Получить персонажа с текущей локацией |
| `CharacterService` | `updateLocation` | :210 | Обновить локацию персонажа |
| `CharacterService` | `createCharacter` | :237 | Создать нового персонажа |
| `CharacterService` | `deleteCharacter` | :277 | Удалить персонажа |

#### Функции (для обратной совместимости)
| Имя | Строка | Описание |
|-----|--------|----------|
| `getCharacter` | :292 | Псевдоним CharacterService.getCharacter |
| `updateCharacter` | :293 | Псевдоним CharacterService.updateCharacter |
| `applyFatigue` | :294 | Псевдоним CharacterService.applyFatigue |
| `getCharacterWithLocation` | :295 | Псевдоним CharacterService.getCharacterWithLocation |

---

### session.service.ts — Session Service

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `SessionWithIncludes` | :13 | Тип для session с includes |
| `SessionResult` | :24 | Результат операции с сессией |
| `WorldTimeUpdateResult` | :30 | Результат обновления времени мира |

#### Класс
| Имя | Метод | Строка | Описание |
|-----|-------|--------|----------|
| `SessionService` | `getSession` | :49 | Получить сессию по ID |
| `SessionService` | `createSession` | :83 | Создать новую сессию |
| `SessionService` | `saveSession` | :124 | Сохранить состояние сессии |
| `SessionService` | `updateWorldTime` | :164 | Обновить время мира |
| `SessionService` | `getWorldTime` | :254 | Получить текущее время мира |
| `SessionService` | `deleteSession` | :298 | Удалить сессию |
| `SessionService` | `addMessage` | :331 | Добавить сообщение в сессию |
| `SessionService` | `getMessages` | :361 | Получить сообщения сессии |

#### Функции (для обратной совместимости)
| Имя | Строка | Описание |
|-----|--------|----------|
| `getSession` | :384 | Псевдоним SessionService.getSession |
| `createSession` | :385 | Псевдоним SessionService.createSession |
| `saveSession` | :386 | Псевдоним SessionService.saveSession |
| `updateWorldTime` | :387 | Псевдоним SessionService.updateWorldTime |
| `getWorldTime` | :388 | Псевдоним SessionService.getWorldTime |

---

### game.service.ts — Game Service

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `MeditationActionResult` | :31 | Результат действия медитации |
| `BreakthroughActionResult` | :50 | Результат действия прорыва |
| `CombatActionResult` | :63 | Результат боевого действия |

#### Класс
| Имя | Метод | Строка | Описание |
|-----|-------|--------|----------|
| `GameService` | `processMeditation` | :84 | Обработка медитации |
| `GameService` | `processBreakthrough` | :249 | Обработка прорыва |
| `GameService` | `processCombat` | :305 | Обработка боя |
| `GameService` | `processTechniqueUse` | :358 | Обработка использования техники |
| `GameService` | `parseMeditationRequest` | :427 | Парсинг запроса медитации |

#### Функции (для обратной совместимости)
| Имя | Строка | Описание |
|-----|--------|----------|
| `processMeditation` | :474 | Псевдоним GameService.processMeditation |
| `processBreakthrough` | :475 | Псевдоним GameService.processBreakthrough |
| `processCombat` | :476 | Псевдоним GameService.processCombat |
| `parseMeditationRequest` | :477 | Псевдоним GameService.parseMeditationRequest |

---

### game-client.service.ts — Game Client Service

#### Интерфейсы
| Имя | Строка | Описание |
|-----|--------|----------|
| `StartGameResponse` | :14 | Ответ на старт игры |
| `LoadGameResponse` | :31 | Ответ на загрузку игры |
| `ActionResponse` | :43 | Ответ на действие |
| `SaveData` | :64 | Данные сохранения |

#### Класс
| Имя | Метод | Строка | Описание |
|-----|-------|--------|----------|
| `GameClientService` | `startGame` | :86 | Начать новую игру |
| `GameClientService` | `loadGame` | :103 | Загрузить существующую сессию |
| `GameClientService` | `sendAction` | :114 | Отправить игровое действие |
| `GameClientService` | `saveGame` | :132 | Сохранить состояние игры |
| `GameClientService` | `getSaves` | :144 | Получить список сохранений |
| `GameClientService` | `deleteSave` | :153 | Удалить сохранение |

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `gameClient` | :162 | Singleton instance |

---

### world.service.ts — World Service

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `LocationResult` | :13 | Результат операции с локацией |
| `LocationsResult` | :19 | Результат получения локаций |
| `WorldEventResult` | :25 | Результат операции с событием мира |

#### Класс
| Имя | Метод | Строка | Описание |
|-----|-------|--------|----------|
| `WorldService` | `getLocation` | :38 | Получить локацию по ID |
| `WorldService` | `getLocationsForSession` | :58 | Получить все локации сессии |
| `WorldService` | `createLocation` | :75 | Создать новую локацию |
| `WorldService` | `updateLocation` | :113 | Обновить локацию |
| `WorldService` | `deleteLocation` | :143 | Удалить локацию |
| `WorldService` | `generateWorldEvents` | :160 | Генерация мировых событий |
| `WorldService` | `getUnprocessedEvents` | :200 | Получить необработанные события |
| `WorldService` | `markEventProcessed` | :223 | Отметить событие обработанным |
| `WorldService` | `calculateLocationDanger` | :240 | Расчёт уровня опасности локации |
| `WorldService` | `getLocationInterruptionChance` | :257 | Получить шанс прерывания локации |
| `WorldService` | `getTimeOfDay` | :300 | Получить время суток |
| `WorldService` | `getSectsForSession` | :312 | Получить секты сессии |

#### Функции (для обратной совместимости)
| Имя | Строка | Описание |
|-----|--------|----------|
| `getLocation` | :333 | Псевдоним WorldService.getLocation |
| `getLocationsForSession` | :334 | Псевдоним WorldService.getLocationsForSession |
| `createLocation` | :335 | Псевдоним WorldService.createLocation |
| `updateLocation` | :336 | Псевдоним WorldService.updateLocation |
| `generateWorldEvents` | :337 | Псевдоним WorldService.generateWorldEvents |

---

### inventory.service.ts — Inventory Service (НОВОЕ)

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `CreateInventoryItemInput` | :12 | Входные данные для создания предмета |
| `InventoryItemPreset` | :32 | Тип пресета предмета |
| `UseItemResult` | :34 | Результат использования предмета |

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `CONSUMABLE_PRESETS` | :52 | Пресеты расходуемых предметов |

#### Класс
| Имя | Метод | Строка | Описание |
|-----|-------|--------|----------|
| `InventoryService` | `getInventory` | :129 | Получить инвентарь персонажа |
| `InventoryService` | `addItem` | :141 | Добавить предмет в инвентарь |
| `InventoryService` | `addItemFromPreset` | :191 | Добавить предмет из пресета |
| `InventoryService` | `useItem` | :205 | Использовать предмет |
| `InventoryService` | `removeItem` | :315 | Удалить предмет |
| `InventoryService` | `decreaseQuantity` | :327 | Уменьшить количество предмета |

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `inventoryService` | :388 | Singleton instance |

---

### technique-pool.service.ts — Technique Pool Service (НОВОЕ)

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `TriggerType` | :19 | Тип триггера генерации |
| `TechniquePoolResult` | :21 | Результат генерации пула |
| `TechniqueSelectionResult` | :28 | Результат выбора техники |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `generateTechniquePool` | :61 | Генерация пула техник через LLM |
| `getActivePool` | :248 | Получить активный пул для персонажа |
| `revealTechnique` | :288 | Раскрыть технику в пуле |
| `selectTechniqueFromPool` | :300 | Выбрать технику из пула |
| `cleanupOldPools` | :404 | Очистка старых пулов |
| `checkAndGenerateOnBreakthrough` | :421 | Автогенерация пула при прорыве |

---

### cheats.service.ts — Cheats Service (НОВОЕ)

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `CheatCommand` | :16 | Типы чит-команд |
| `CheatResult` | :34 | Результат выполнения чита |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `isCheatsEnabled` | :43 | Проверка разрешения читов |
| `executeCheat` | :50 | Выполнить чит-команду |

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `CHEAT_COMMANDS_HELP` | :639 | Справка по чит-командам |

**Доступные команды:** set_level, add_qi, set_qi, add_stat, set_stat, add_fatigue, reset_fatigue, give_technique, gen_techniques, add_insight, breakthrough, set_time, add_resources, full_restore, god_mode

---

### character-data.service.ts — Character Data Service (НОВОЕ)

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `getCharacterTechniques` | :17 | Получить техники персонажа |
| `getBasicTechniquesForNewCharacter` | :38 | Получить базовые техники для нового персонажа |
| `learnTechnique` | :59 | Изучить технику для персонажа |
| `giveBasicTechniques` | :155 | Дать базовые техники новому персонажу |
| `getCharacterSkills` | :175 | Получить навыки персонажа |
| `updateSkillLevel` | :210 | Обновить уровень навыка |
| `giveBasicSkills` | :236 | Дать базовые навыки новому персонажу |
| `getCharacterFullData` | :255 | Получить все данные персонажа |

---

## src/prompts/*.ts — Система промптов (НОВОЕ)

### loader.ts — Загрузчик шаблонов

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `PromptCategory` | :12 | Категория шаблона (system, scenarios, injections) |
| `PromptTemplate` | :14 | Интерфейс загруженного шаблона |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `loadTemplate` | :33 | Загрузить шаблон из файла |
| `getTemplateContent` | :71 | Получить содержимое шаблона как строку |
| `clearTemplateCache` | :81 | Очистить кэш шаблонов |
| `reloadTemplate` | :88 | Перезагрузить конкретный шаблон |
| `getLoadedTemplates` | :100 | Получить все загруженные шаблоны |
| `initTemplateWatcher` | :107 | Инициализация наблюдателя за файлами (dev режим) |

---

### builder.ts — Сборщик промптов

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `PromptContext` | :11 | Контекст для подстановки |
| `PromptSection` | :110 | Секция промпта |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `replacePlaceholders` | :67 | Замена плейсхолдеров в тексте |
| `buildPrompt` | :116 | Сборка промпта из нескольких секций |
| `buildGameMasterPrompt` | :135 | Сборка полного промпта GM |
| `buildStartPrompt` | :177 | Сборка промпта для стартового сценария |
| `buildTechniqueGenerationPrompt` | :211 | Сборка промпта для генерации техник |
| `buildCharacterContextPrompt` | :237 | Инъекция состояния персонажа |

---

### optimizer.ts — Оптимизатор промптов

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `OptimizerOptions` | :11 | Опции оптимизации |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `estimateTokens` | :147 | Подсчёт примерного количества токенов |
| `optimizePrompt` | :160 | Оптимизация промпта |
| `getOptimizationStats` | :206 | Статистика оптимизации |

---

### cache.ts — Кэш промптов

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `CachedPrompt` | :11 | Кэшированный промпт |
| `SessionPromptCache` | :21 | Кэш сессии |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `getOrSetPrompt` | :86 | Получить или создать кэшированный промпт |
| `initSession` | :132 | Инициализация сессии |
| `bindSystemPrompt` | :153 | Привязка system prompt к сессии |
| `markSystemPromptSent` | :164 | Отметить system prompt как отправленный |
| `wasSystemPromptSent` | :172 | Проверить, был ли отправлен system prompt |
| `getSystemPromptForSession` | :180 | Получить system prompt для сессии |
| `clearSessionCache` | :191 | Очистка кэша сессии |
| `clearAllCaches` | :198 | Полная очистка кэша |
| `getCacheStats` | :206 | Статистика кэша |
| `getCacheEntries` | :241 | Экспорт для мониторинга |

---

### index.ts — Экспорт системы промптов

#### Объект
| Имя | Метод | Описание |
|-----|-------|----------|
| `Prompts` | `load` | Загрузка шаблона |
| `Prompts` | `get` | Получение содержимого |
| `Prompts` | `build` | Сборка промпта |
| `Prompts` | `buildGM` | Сборка GM промпта |
| `Prompts` | `buildStart` | Сборка стартового промпта |
| `Prompts` | `buildTechniques` | Сборка промпта генерации техник |
| `Prompts` | `buildCharacter` | Сборка контекста персонажа |
| `Prompts` | `inject` | Замена плейсхолдеров |
| `Prompts` | `optimize` | Оптимизация промпта |
| `Prompts` | `tokens` | Подсчёт токенов |
| `Prompts` | `stats` | Статистика оптимизации |
| `Prompts` | `cache` | Кэширование |
| `Prompts` | `session` | Инициализация сессии |
| `Prompts` | `bindSystem` | Привязка system prompt |
| `Prompts` | `markSent` | Отметка отправки |
| `Prompts` | `wasSent` | Проверка отправки |
| `Prompts` | `getSystem` | Получение system prompt |
| `Prompts` | `cacheStats` | Статистика кэша |

---

## src/stores/*.ts — State Management

### game.store.ts — Game State Store (Zustand)

#### Селекторы
| Имя | Строка | Описание |
|-----|--------|----------|
| `useGameCharacter` | :219 | Селектор данных персонажа |
| `useGameMessages` | :222 | Селектор сообщений |
| `useGameTime` | :225 | Селектор времени мира |
| `useGameLocation` | :228 | Селектор текущей локации |
| `useGameLoading` | :231 | Селектор состояния загрузки |
| `useGamePaused` | :234 | Селектор состояния паузы |
| `useGameSessionId` | :237 | Селектор ID сессии |
| `useGameDaysSinceStart` | :240 | Селектор дней с начала |
| `useGameError` | :243 | Селектор состояния ошибки |
| `useGameActions` | :248 | Хук для игровых действий |

#### Хук
| Имя | Строка | Описание |
|-----|--------|----------|
| `useGameStore` | :56 | Основной Zustand стор |

---

## src/hooks/*.ts — Хуки

### useGame.ts — Хук управления игровым состоянием

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `useGame` | :38 | Главный хук для управления игровым состоянием |

Возвращает объект с методами: `startGame`, `loadGame`, `sendMessage`, `sendAction`, `togglePause`, `getSaves`, `clearError`, `resetGame`, `saveAndExit`

#### Экспортируемые типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `Character` | :309 | Тип персонажа |
| `Location` | :309 | Тип локации |
| `WorldTime` | :309 | Тип времени мира |
| `Message` | :309 | Тип сообщения |
| `GameState` | :309 | Тип состояния игры |

---

### use-mobile.ts — Хук для определения мобильных устройств

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `useIsMobile` | :5 | Определение мобильного устройства |

---

### use-toast.ts — Хук для toast уведомлений

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `reducer` | :77 | Редьюсер для toast состояния |
| `toast` | :145 | Функция показа toast |
| `useToast` | :174 | Хук для работы с toast |

---

## src/data/*.ts — Данные и пресеты

### cultivation-levels.ts — Уровни культивации

#### Интерфейсы
| Имя | Строка | Описание |
|-----|--------|----------|
| `CultivationLevel` | :3 | Информация об уровне культивации |

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `CULTIVATION_LEVELS` | :16 | Массив уровней культивации (1-10) |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `calculateQiDensity` | :203 | Расчёт плотности Ци для уровня |
| `calculateCoreCapacityAfterLevelUp` | :209 | Расчёт ёмкости ядра после повышения |
| `calculateRequiredQiForBreakthrough` | :219 | Расчёт накопленной Ци для прорыва |
| `calculateBaseConductivity` | :229 | Расчёт базовой проводимости |
| `getCultivationLevel` | :235 | Получение информации об уровне |
| `formatCultivationLevel` | :240 | Форматирование уровня для отображения |
| `calculateMicroCoreGeneration` | :250 | Расчёт скорости генерации Ци микроядром |
| `calculateTimeToBreakthrough` | :255 | Расчёт времени накопления Ци до прорыва |

---

### memory-containers.ts — Контейнеры памяти мира

#### Константы
| Имя | Строка | Описание |
|-----|--------|----------|
| `MEMORY_CONTAINERS` | :4 | Контейнеры памяти для мира культивации |

#### Функции
| Имя | Строка | Описание |
|-----|--------|----------|
| `getAllWorldRules` | :365 | Получение всех правил мира в виде строки |
| `getContainer` | :372 | Получение контейнера по номеру |

#### Типы
| Имя | Строка | Описание |
|-----|--------|----------|
| `MemoryContainerKey` | :378 | Ключ контейнера памяти |
| `MemoryContainer` | :379 | Тип контейнера памяти |

---

### presets/*.ts — Пресеты данных

#### technique-presets.ts
- `BASIC_TECHNIQUES` — Базовые техники для новых персонажей
- `ALL_TECHNIQUE_PRESETS` — Все пресеты техник

#### skill-presets.ts
- `ALL_SKILL_PRESETS` — Все пресеты навыков культивации

#### formation-presets.ts
- `ALL_FORMATION_PRESETS` — Все пресеты формаций

#### character-presets.ts
- `CHARACTER_PRESETS` — Пресеты персонажей

---

## 📊 Статистика проекта

| Категория | Количество |
|-----------|------------|
| Файлов с функциями | 35+ |
| Экспортируемых функций | 200+ |
| Интерфейсов/типов | 100+ |
| Констант | 50+ |
| API endpoints | 15+ |
| Zod схем | 20+ |

---

*Документ обновлён: 2026-02-24*
