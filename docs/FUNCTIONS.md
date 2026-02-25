# Функции и типы проекта Cultivation World Simulator

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

### Устранённые deprecated-функции (2026-02-24)

| Функция | Было | Стало |
|---------|------|-------|
| `calculateTimeToFull` | @deprecated в qi-system.ts | Экспорт из qi-shared.ts |
| `calculateQiAccumulationRate` | @deprecated в qi-system.ts | Удалена (используйте calculateQiRates) |

---

## src/lib/game/*.ts — Игровые механики

### technique-learning.ts — Система обучения техникам

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `LEARNING_RATES` | :29 | Скорость обучения (% в час) по источникам |
| `LEVEL_PENALTY` | :46 | Множители штрафа за уровень техники |
| `LEARNING_BONUSES` | :57 | Бонусы от характеристик к обучению |

#### Типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `LearningSource` | :69 | Источник изучения техники |
| `LearningProgress` | :71 | Прогресс изучения техники |
| `LearningResult` | :79 | Результат обучения |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `calculateLearningSpeed` | :95 | Расчёт скорости обучения |
| `calculateTimeToComplete` | :127 | Расчёт времени до завершения обучения |
| `processLearning` | :141 | Обработка прогресса обучения |
| `canStartLearning` | :191 | Проверка возможности обучения |
| `formatLearningProgress` | :230 | Генерация описания прогресса обучения |

---

### world-coordinates.ts — Система координат мира

#### Интерфейсы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `WorldPosition` | :20 | 3D позиция в мире (x, y, z) |
| `WorldPosition2D` | :26 | 2D позиция для карты |

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `WORLD_BOUNDS` | :38 | Размеры мира (в метрах) |
| `HEIGHT_ZONES` | :50 | Типы высот (подземелья, поверхность, горы, небо) |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `LocationDanger` | :27 | Уровень опасности локации |
| `InterruptionEvent` | :29 | Событие прерывания медитации |
| `InterruptionCheckResult` | :45 | Результат проверки прерывания |

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `LOCATION_BASE_CHANCE` | :65 | Базовый шанс прерывания по типу локации |
| `TIME_MODIFIERS` | :88 | Множитель шанса по времени суток |
| `INTERRUPTION_EVENTS` | :101 | Таблица событий прерывания |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `MeditationType` | :160 | Тип медитации ('accumulation' \| 'breakthrough') |

---

### qi-system.ts — Система Ци (серверная логика)

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `performMeditation` | :29 | Выполнение медитации |
| `attemptBreakthrough` | :116 | Попытка прорыва |
| `calculateQiAccumulationRate` | :146 | @deprecated — расчёт скорости накопления Ци |
| `calculateTimeToFull` | :157 | @deprecated — расчёт времени до полного ядра |

---

### qi-shared.ts — Общие функции расчёта Ци

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `TechniqueType` | :28 | Тип техники (combat, cultivation, support, movement, sensory, healing) |
| `TechniqueRarity` | :36 | Редкость техники |
| `TechniqueElement` | :38 | Элемент техники |

#### Интерфейсы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `Technique` | :44 | Полное описание техники |
| `TechniqueUseResult` | :102 | Результат использования техники |

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `BASE_TECHNIQUES` | :326 | Базовые техники (будут перенесены в пресеты) |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `calculateTechniqueEffectiveness` | :119 | Расчёт эффективности техники от характеристик |
| `canUseTechnique` | :151 | Проверка возможности использования техники |
| `canLearnTechnique` | :191 | Проверка возможности изучения техники |
| `useTechnique` | :225 | Использование техники |
| `validateNewTechnique` | :280 | Валидация новой техники |
| `generateTechniqueId` | :314 | Генерация ID техники на основе имени |

---

### entity-system.ts — Система встреченных персонажей и монстров

#### Типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `EntityType` | :14 | Тип сущности (npc, monster, animal, spirit) |
| `EntityImportance` | :17 | Ранг важности |
| `EncounteredEntity` | :20 | Интерфейс встреченной сущности |
| `EntityMemory` | :56 | Воспоминание о взаимодействии |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `ActionType` | :24 | Типы действий для расчёта усталости |
| `FatigueResult` | :67 | Результат расчёта усталости |
| `EfficiencyModifiers` | :193 | Множители эффективности |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `getFatigueAccumulationMultiplier` | :79 | Получить множитель накопления усталости |
| `getFatigueRecoveryMultiplier` | :86 | Получить множитель восстановления усталости |
| `calculateFatigueFromAction` | :91 | Расчёт усталости от действия |
| `calculateRestRecovery` | :173 | Расчёт восстановления во сне |
| `calculateEfficiencyModifiers` | :200 | Влияние усталости на эффективность |
| `calculatePassiveRecovery` | :221 | Автоматическое восстановление |

---

### qi-insight.ts — Система прозрения

#### Интерфейсы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `InsightResult` | :23 | Результат прозрения |
| `AnalysisResult` | :25 | Результат разбора техники |
| `GeneratedTechnique` | :38 | Сгенерированная техника |
| `CharacterForInsight` | :47 | Интерфейс персонажа для прозрения |
| `TechniqueForAnalysis` | :55 | Интерфейс техники для разбора |

**Примечание:** `TechniqueType` и `TechniqueElement` импортируются из `techniques.ts` (см. раздел "Решённые дубликаты")

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `CultivationSkill` | :21 | Пассивный навык культивации |

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `CULTIVATION_SKILLS` | :44 | Список навыков культивации |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `getSkillEffect` | :125 | Получение эффекта навыка на определённом уровне |
| `calculateSkillsInterruptionModifier` | :152 | Расчёт множителя прерывания от навыков |
| `getSkillById` | :170 | Получение информации о навыке |
| `canLearnSkill` | :177 | Проверка доступности навыка для изучения |
| `getAvailableSkills` | :215 | Получение списка доступных навыков |

---

### formations.ts — Система формаций для культивации

#### Типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `FormationType` | :20 | Тип формации |

#### Интерфейсы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `Formation` | :22 | Описание формации |

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `FORMATIONS` | :47 | Список формаций |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `getFormationEffect` | :128 | Получение эффекта формации |
| `calculateFormationInterruptionModifier` | :150 | Расчёт множителя прерывания от формации |
| `canCreateFormation` | :166 | Проверка возможности создания формации |
| `getAvailableFormations` | :215 | Получение списка доступных формаций |

---

### conductivity-system.ts — Система развития проводимости

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `MAX_CONDUCTIVITY_BY_LEVEL` | :29 | Максимальная проводимость для каждого уровня |
| `CONDUCTIVITY_GAIN` | :44 | Прирост проводимости от действий |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `RequestType` | :21 | Типы запросов |
| `RoutingResult` | :36 | Результат маршрутизации |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `identifyRequestType` | :44 | Определение типа запроса |
| `routeRequest` | :103 | Маршрутизация запроса |
| `needsLLM` | :286 | Проверка, нужен ли LLM для запроса |

---

### environment-system.ts — Система окружения

#### Типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `TerrainType` | :15 | Типы местности |
| `TerrainEffects` | :28 | Эффекты местности |
| `EnvironmentInfluence` | :110 | Результат влияния окружения |

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `TERRAIN_EFFECTS` | :36 | Эффекты местности |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `LLMProvider` | :4 | Типы провайдеров (z-ai, local, api) |
| `ParsedCommand` | :114 | Результат парсинга команды |

#### Интерфейсы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `DEFAULT_LLM_CONFIG` | :175 | Дефолтная конфигурация LLM |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `parseCommand` | :122 | Парсинг команд |

---

### providers.ts — LLM Provider Interface и реализации

#### Интерфейсы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `ILLMProvider` | :7 | Интерфейс провайдера LLM |

#### Классы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `ZAIProvider` | :14 | Z-AI провайдер |
| `LocalLLMProvider` | :122 | Локальный LLM провайдер (Ollama) |
| `APIProvider` | :309 | External API провайдер |
| `LLMManager` | :410 | Менеджер LLM провайдеров |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `createLLMManager` | :569 | Фабрика для создания LLMManager |

---

### index.ts — Экспорт LLM модуля

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `getCharacter` | :292 | Псевдоним CharacterService.getCharacter |
| `updateCharacter` | :293 | Псевдоним CharacterService.updateCharacter |
| `applyFatigue` | :294 | Псевдоним CharacterService.applyFatigue |
| `getCharacterWithLocation` | :295 | Псевдоним CharacterService.getCharacterWithLocation |

---

### session.service.ts — Session Service

#### Типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `getSession` | :384 | Псевдоним SessionService.getSession |
| `createSession` | :385 | Псевдоним SessionService.createSession |
| `saveSession` | :386 | Псевдоним SessionService.saveSession |
| `updateWorldTime` | :387 | Псевдоним SessionService.updateWorldTime |
| `getWorldTime` | :388 | Псевдоним SessionService.getWorldTime |

---

### game.service.ts — Game Service

#### Типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `processMeditation` | :474 | Псевдоним GameService.processMeditation |
| `processBreakthrough` | :475 | Псевдоним GameService.processBreakthrough |
| `processCombat` | :476 | Псевдоним GameService.processCombat |
| `parseMeditationRequest` | :477 | Псевдоним GameService.parseMeditationRequest |

---

### game-client.service.ts — Game Client Service

#### Интерфейсы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `gameClient` | :162 | Singleton instance |

---

### world.service.ts — World Service

#### Типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `getLocation` | :333 | Псевдоним WorldService.getLocation |
| `getLocationsForSession` | :334 | Псевдоним WorldService.getLocationsForSession |
| `createLocation` | :335 | Псевдоним WorldService.createLocation |
| `updateLocation` | :336 | Псевдоним WorldService.updateLocation |
| `generateWorldEvents` | :337 | Псевдоним WorldService.generateWorldEvents |

---

## src/stores/*.ts — State Management

### game.store.ts — Game State Store (Zustand)

#### Селекторы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `useGameStore` | :56 | Основной Zustand стор |

---

## src/hooks/*.ts — Хуки

### useGame.ts — Хук управления игровым состоянием

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `useGame` | :38 | Главный хук для управления игровым состоянием |

Возвращает объект с методами: `startGame`, `loadGame`, `sendMessage`, `sendAction`, `togglePause`, `getSaves`, `clearError`, `resetGame`, `saveAndExit`

#### Экспортируемые типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `Character` | :309 | Тип персонажа |
| `Location` | :309 | Тип локации |
| `WorldTime` | :309 | Тип времени мира |
| `Message` | :309 | Тип сообщения |
| `GameState` | :309 | Тип состояния игры |

---

### use-mobile.ts — Хук для определения мобильных устройств

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `useIsMobile` | :5 | Определение мобильного устройства |

---

### use-toast.ts — Хук для toast уведомлений

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `reducer` | :77 | Редьюсер для toast состояния |
| `toast` | :145 | Функция показа toast |
| `useToast` | :174 | Хук для работы с toast |

---

## src/types/*.ts — Типы

### game.ts — Общие типы игры

#### Интерфейсы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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

#### Типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `GameActionType` | :108 | Типы игровых действий |

---

### branded.ts — Branded Types для type-safe ID

#### Типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `SessionId` | :16 | ID сессии |
| `CharacterId` | :19 | ID персонажа |
| `LocationId` | :22 | ID локации |
| `MessageId` | :25 | ID сообщения |
| `SectId` | :28 | ID секты |
| `NPCId` | :31 | ID NPC |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `asSessionId` | :36 | Приведение к SessionId |
| `asCharacterId` | :39 | Приведение к CharacterId |
| `asLocationId` | :42 | Приведение к LocationId |
| `asMessageId` | :45 | Приведение к MessageId |
| `asSectId` | :48 | Приведение к SectId |
| `asNPCId` | :51 | Приведение к NPCId |
| `extractId` | :78 | Извлечение строки из branded типа |

#### Zod схемы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `sessionIdSchema` | :58 | Zod схема для SessionId |
| `characterIdSchema` | :61 | Zod схема для CharacterId |
| `locationIdSchema` | :64 | Zod схема для LocationId |
| `messageIdSchema` | :67 | Zod схема для MessageId |
| `sectIdSchema` | :70 | Zod схема для SectId |
| `npcIdSchema` | :73 | Zod схема для NPCId |

---

## src/data/*.ts — Данные и пресеты

### cultivation-levels.ts — Уровни культивации

#### Интерфейсы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `CultivationLevel` | :3 | Информация об уровне культивации |

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `CULTIVATION_LEVELS` | :16 | Массив уровней культивации (1-10) |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
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
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `MEMORY_CONTAINERS` | :4 | Контейнеры памяти для мира культивации |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `getAllWorldRules` | :365 | Получение всех правил мира в виде строки |
| `getContainer` | :372 | Получение контейнера по номеру |

#### Типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `MemoryContainerKey` | :378 | Ключ контейнера памяти |
| `MemoryContainer` | :379 | Тип контейнера памяти |

---

### prompts/game-master.ts — Системный промпт для ИИ-гейм-мастера

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `buildGameMasterPrompt` | :151 | Формирование полного промпта |
| `buildSectStartPrompt` | :162 | Промпт для старта в секте |
| `buildRandomStartPrompt` | :185 | Промпт для случайного старта |
| `buildCustomStartPrompt` | :205 | Промпт для кастомного старта |

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `BASE_PROMPT` | :7 | Базовая часть промпта |
| `WORLD_RULES_SECTION` | :67 | Правила мира |
| `CULTIVATION_SECTION` | :72 | Уровни культивации |
| `COMMANDS_SECTION` | :75 | Команды игрока |
| `OUTPUT_FORMAT` | :95 | Формат ответа |

---

### presets/technique-presets.ts — Пресеты техник

#### Интерфейсы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `TechniquePreset` | :44 | Пресет техники |

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `BASIC_TECHNIQUES` | :109 | Базовые техники |
| `ADVANCED_TECHNIQUES` | :158 | Продвинутые техники |
| `RARE_TECHNIQUES` | :277 | Редкие техники |
| `LEGENDARY_TECHNIQUES` | :358 | Легендарные техники |
| `ALL_TECHNIQUE_PRESETS` | :437 | Все техники |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `getTechniquePresetById` | :451 | Получить технику по ID |
| `getTechniquePresetsByType` | :458 | Получить техники по типу |
| `getTechniquePresetsByLevel` | :465 | Получить техники по уровню |
| `getTechniquePresetsByElement` | :472 | Получить техники по элементу |
| `getBasicTechniques` | :479 | Получить базовые техники |
| `getAvailableTechniquePresets` | :486 | Получить доступные техники |
| `getTeleportationTechniques` | :493 | Получить техники телепортации |
| `calculateTeleportDistance` | :500 | Рассчитать дальность телепортации |

---

### presets/skill-presets.ts — Пресеты навыков культивации

#### Интерфейсы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `SkillPreset` | :23 | Пресет навыка |

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `BASIC_SKILLS` | :41 | Базовые навыки |
| `ADVANCED_SKILLS` | :105 | Продвинутые навыки |
| `MASTER_SKILLS` | :173 | Мастерские навыки |
| `ALL_SKILL_PRESETS` | :242 | Все навыки |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `getSkillPresetById` | :255 | Получить навык по ID |
| `getBasicSkills` | :262 | Получить базовые навыки |
| `getAvailableSkillPresets` | :269 | Получить доступные навыки |
| `getSkillsBySource` | :301 | Получить навыки по источнику |

---

### presets/formation-presets.ts — Пресеты формаций

#### Интерфейсы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `FormationPreset` | :23 | Пресет формации |

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `BASIC_FORMATIONS` | :38 | Базовые формации |
| `ADVANCED_FORMATIONS` | :85 | Продвинутые формации |
| `MASTER_FORMATIONS` | :157 | Мастерские формации |
| `ALL_FORMATION_PRESETS` | :230 | Все формации |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `getFormationPresetById` | :243 | Получить формацию по ID |
| `getBasicFormations` | :250 | Получить базовые формации |
| `getAvailableFormationPresets` | :257 | Получить доступные формации |
| `getFormationsByDifficulty` | :270 | Получить формации по сложности |

---

### presets/character-presets.ts — Пресеты персонажей

#### Типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `StartType` | :39 | Тип старта (sect, random, custom) |

#### Интерфейсы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `CharacterPresetStats` | :41 | Характеристики пресета |
| `CharacterPresetCultivation` | :48 | Культивация пресета |
| `CharacterPreset` | :55 | Пресет персонажа |

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `CHARACTER_PRESETS` | :103 | Массив пресетов персонажей |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `getCharacterPresetById` | :346 | Получить пресет по ID |
| `getCharacterPresetsByStartType` | :353 | Получить пресеты по типу старта |
| `getDefaultSectPreset` | :360 | Получить пресет для секты |
| `getDefaultRandomPreset` | :367 | Получить пресет для случайного старта |
| `getAllCharacterPresets` | :375 | Получить все пресеты |

---

### presets/index.ts — Экспорт пресетов

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `getStarterPack` | :99 | Получить все пресеты для нового персонажа |

---

## Дополнительные модули

### src/lib/utils.ts — Утилиты

| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `cn` | :4 | Утилита для объединения CSS классов |

---

### src/lib/db.ts — Prisma database client

| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `db` | :9 | Prisma клиент для работы с БД |

---

### src/lib/migrations.ts — Система миграций БД

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `SCHEMA_VERSION` | :18 | Версия схемы БД (текущая: 3) |

#### Интерфейсы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `MigrationResult` | :25 | Результат миграции |
| `DatabaseInfo` | :35 | Информация о БД |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `databaseExists` | :46 | Проверка существования БД |
| `getDatabaseVersion` | :53 | Получить текущую версию схемы |
| `getDatabaseTables` | :100 | Получить список таблиц |
| `createBackup` | :121 | Создать резервную копию |
| `getBackups` | :145 | Получить список бэкапов |
| `getBackupType` | :159 | Получить тип бэкапа |
| `cleanupOldBackups` | :168 | Удалить старые бэкапы |
| `deleteBackup` | :185 | Удалить конкретный бэкап |
| `restoreFromBackup` | :204 | Восстановить из бэкапа |
| `getDatabaseInfo` | :226 | Получить информацию о БД |
| `needsMigration` | :255 | Проверить, нужна ли миграция |
| `initializeDatabase` | :285 | Инициализировать новую БД |
| `runMigration` | :359 | Выполнить миграцию |
| `resetDatabase` | :450 | Сбросить БД |

---

### src/lib/validations/game.ts — Zod Validation Schemas

#### Схемы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `sendMessageSchema` | :15 | Схема для отправки сообщения |
| `customConfigSchema` | :30 | Схема для кастомной конфигурации |
| `startGameSchema` | :46 | Схема для старта игры |
| `saveGameSchema` | :68 | Схема для сохранения |
| `loadGameSchema` | :80 | Схема для загрузки |
| `llmSettingsSchema` | :91 | Схема для настроек LLM |
| `queryParamsSchema` | :159 | Схема для query параметров |

#### Типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `SendMessageInput` | :22 | Входные данные для отправки сообщения |
| `CustomConfig` | :41 | Кастомная конфигурация |
| `StartGameInput` | :61 | Входные данные для старта игры |
| `SaveGameInput` | :73 | Входные данные для сохранения |
| `LoadGameInput` | :84 | Входные данные для загрузки |
| `LLMSettingsInput` | :100 | Входные данные для настроек LLM |
| `QueryParams` | :165 | Query параметры |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `validateOrError` | :108 | Валидация с возвратом ошибки |
| `validateOrThrow` | :129 | Валидация с выбросом ошибки |
| `validationErrorResponse` | :146 | Стандартизированный ответ ошибки |
| `parseQueryParams` | :170 | Парсинг query параметров |

---

### src/lib/logger/index.ts — Система логирования

#### Типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `LogLevel` | :11 | Уровни логов (ERROR, WARN, INFO, DEBUG) |
| `LogCategory` | :13 | Категории логов |
| `LogEntry` | :23 | Запись лога |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `setLoggingEnabled` | :47 | Включить/выключить логирование |
| `isLoggingEnabledGlobal` | :54 | Проверить, включено ли логирование |
| `setLogLevel` | :61 | Установить минимальный уровень логов |
| `getLogLevel` | :68 | Получить текущий уровень логов |
| `log` | :99 | Основная функция логирования |
| `logError` | :174 | Логирование ошибки |
| `logWarn` | :193 | Логирование предупреждения |
| `logInfo` | :204 | Логирование информации |
| `logDebug` | :215 | Логирование отладки |
| `getLogBuffer` | :229 | Получить логи из буфера |
| `clearLogBuffer` | :236 | Очистить буфер логов |

#### Классы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `LogTimer` | :243 | Измеритель времени выполнения |

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `LOG_LEVELS` | :291 | Массив уровней логов |
| `LOG_CATEGORIES` | :292 | Массив категорий логов |

---

### src/lib/image/index.ts — Модуль генерации изображений

#### Типы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `ImageStyle` | :9 | Стили изображений |
| `ImageGenerationConfig` | :11 | Конфигурация генерации |
| `ImageGenerationResult` | :18 | Результат генерации |

#### Функции
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `generateImage` | :46 | Генерация изображения (заглушка) |
| `isImageGenerationAvailable` | :65 | Проверка доступности генератора |
| `getAvailableStyles` | :73 | Получить список стилей |
| `getStyleDescription` | :80 | Получить описание стиля |
| `generateLocationBackground` | :91 | Сгенерировать фон локации |
| `generateCharacterPortrait` | :120 | Сгенерировать портрет персонажа |

#### Константы
| Имя | Файл:строка | Описание |
|-----|-------------|----------|
| `IMAGE_GENERATION_INFO` | :158 | Информация о модуле |

---

*Документ сгенерирован автоматически. Последнее обновление: $(date)*
