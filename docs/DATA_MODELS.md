# 🗄️ Модели данных: Unity Migration

**Версия:** 1.1  
**Дата:** 2026-03-30  
**Статус:** 📋 Дополнено данными из кода  
**Источники:** prisma/schema.prisma, src/types/body.ts, src/types/entity-types.ts

---

## ⚠️ Важно

> **Это ЧЕРНОВИК теоретического документа.**  
> Документ будет перерабатываться в процессе разработки.  
> **НЕТ КОДА** — только теоретические описания структур данных.

---

## 📋 Обзор

Документ описывает структуры данных, которые необходимо перенести из текущего проекта (Prisma/SQLite) в Unity (ScriptableObjects/JSON).

---

## 🏗️ Основные сущности

### 1. GameSession — Игровая сессия

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| worldId | string | ID мира |
| worldName | string | Название мира |
| startVariant | int | 1=секта, 2=случайный, 3=кастомный |
| worldYear | int | Год по Э.С.М. |
| worldMonth | int | Месяц (1-12) |
| worldDay | int | День (1-30) |
| worldHour | int | Час (0-23) |
| worldMinute | int | Минута (0-59) |
| daysSinceStart | int | Дней от попадания |
| isPaused | bool | Пауза симуляции |
| worldState | JSON | Текущее состояние мира |

### 2. Character — Персонаж игрока

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| name | string | Имя персонажа |
| **Характеристики** |||
| strength | float | Сила |
| agility | float | Ловкость |
| intelligence | float | Интеллект |
| vitality | float | Выносливость |
| conductivity | float | Проводимость меридиан |
| **Культивация** |||
| cultivationLevel | int | Основной уровень (1-9) |
| cultivationSubLevel | int | Под-уровень (0-9) |
| coreCapacity | int | Ёмкость ядра |
| coreQuality | float | Качество ядра |
| currentQi | int | Текущее Ци |
| accumulatedQi | int | Накопленное для прорыва |
| **Физиология** |||
| health | float | Здоровье (%) |
| fatigue | float | Физическая усталость (%) |
| mentalFatigue | float | Ментальная усталость (%) |
| age | int | Возраст (лет) |
| bodyHeight | int | Рост (см) |
| **Память** |||
| hasAmnesia | bool | Амнезия |
| knowsAboutSystem | bool | Знает о системе |
| **Ресурсы** |||
| contributionPoints | int | Очки вклада |
| spiritStones | int | Духовные камни |
| **Система тела (JSON)** |||
| bodyState | JSON | Kenshi-style повреждения |
| statsDevelopment | JSON | Развитие характеристик |

### 3. NPC — Неигровые персонажи

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| isPreset | bool | Предустановленный NPC |
| presetId | string | ID пресета |
| name | string | Имя |
| title | string | Титул |
| age | int | Возраст |
| backstory | string | Предыстория |
| **Культивация** |||
| cultivationLevel | int | Уровень культивации |
| cultivationSubLevel | int | Под-уровень |
| coreCapacity | int | Ёмкость ядра |
| currentQi | int | Текущее Ци |
| **Характеристики** |||
| strength | float | Сила |
| agility | float | Ловкость |
| intelligence | float | Интеллект |
| conductivity | float | Проводимость |
| vitality | float | Живучесть |
| **Личность (JSON)** |||
| personality | JSON | Черты характера |
| motivation | string | Мотивация |
| **Отношения** |||
| disposition | float | Отношение к ГГ (-100 до 100) |
| relations | JSON | Отношения с другими |
| factionId | string | ID фракции |
| **Прочее (JSON)** |||
| equipment | JSON | Экипировка |
| techniques | JSON | Техники |

### 4. Location — Локации

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| name | string | Название |
| description | string | Описание |
| **Координаты 3D** |||
| x | int | Восток(+)/Запад(-) |
| y | int | Север(+)/Юг(-) |
| z | int | Высота(+)/Глубина(-) |
| distanceFromCenter | int | Расстояние от центра |
| **Характеристики места** |||
| qiDensity | int | Плотность Ци (ед/м³) |
| qiFlowRate | int | Поток Ци (ед/сек) |
| terrainType | string | mountains, plains, forest, sea, desert |
| locationType | string | region, area, building, room |
| **Размеры** |||
| width | int | Ширина (м) |
| height | int | Высота (м) |

### 5. Sect — Секты

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| name | string | Название |
| description | string | Описание |
| locationId | string | ID локации |
| powerLevel | float | Средний уровень культивации старейшин |
| resources | JSON | Ресурсы секты |

---

## 📦 Инвентарь и экипировка

### 6. InventoryItem — Предмет инвентаря

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| name | string | Название |
| nameId | string | ID для поиска пресета |
| type | string | weapon_sword, armor_torso, consumable_pill... |
| category | string | weapon, armor, accessory, consumable, material |
| rarity | string | common, uncommon, rare, epic, legendary |
| icon | string | Эмодзи или путь к иконке |
| **Количество** |||
| quantity | int | Количество |
| maxStack | int | Макс. в стаке |
| stackable | bool | Можно стакать |
| **Размер в сетке** |||
| sizeWidth | int | 1-2 |
| sizeHeight | int | 1-3 |
| **Физика** |||
| weight | float | Вес (кг) |
| **Позиция** |||
| posX | int | X в сетке (0-6) |
| posY | int | Y в сетке (0-6) |
| location | string | inventory, equipment, storage |
| equipmentSlot | string | head, torso, left_hand, right_hand... |
| **Equipment V2** |||
| materialId | string | ID материала |
| materialTier | int | Тир (1-5) |
| grade | string | damaged, common, refined, perfect, transcendent |
| durabilityCurrent | int | Текущая прочность |
| durabilityMax | int | Макс. прочность |
| durabilityCondition | string | pristine, good, worn, damaged, broken |
| itemLevel | int | Уровень предмета (1-9) |
| effectiveDamage | int | Итоговый урон |
| effectiveDefense | int | Итоговая защита |
| bonusStats | JSON | Бонусы |
| specialEffects | JSON | Особые эффекты |

### 7. Equipment — Экипированные предметы

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| characterId | string | ID персонажа |
| slotId | string | head, torso, left_hand... |
| itemId | string | ID предмета |
| equippedAt | DateTime | Время экипировки |

---

## ⚔️ Техники

### 8. Technique — Техника культивации

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| name | string | Название |
| nameId | string | ID для поиска |
| description | string | Описание |
| **Классификация** |||
| type | string | combat, cultivation, support, movement, sensory, healing, defense, curse, poison |
| subtype | string | melee_strike, melee_weapon, ranged_projectile... |
| element | string | fire, water, earth, air, void, neutral |
| grade | string | common, refined, perfect, transcendent |
| level | int | Уровень техники (1-9) |
| **Параметры** |||
| baseCapacity | int | Базовая ёмкость |
| minLevel | int | Мин. уровень развития |
| maxLevel | int | Макс. уровень развития |
| canEvolve | bool | Можно развивать |
| **Требования** |||
| minCultivationLevel | int | Мин. уровень культивации |
| qiCost | int | Стоимость Ци |
| physicalFatigueCost | float | Физическая усталость |
| mentalFatigueCost | float | Ментальная усталость |
| statRequirements | JSON | Требования к статам |
| statScaling | JSON | Масштабирование от статов |
| effects | JSON | Эффекты |
| computedValues | JSON | Вычисленные значения |

### 9. CharacterTechnique — Изученная техника

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| characterId | string | ID персонажа |
| techniqueId | string | ID техники |
| mastery | float | Мастерство (0-100%) |
| quickSlot | int | Слот быстрого доступа |
| learningProgress | float | Прогресс изучения |
| learningSource | string | preset, npc, scroll, insight |

---

## 🌀 Формации

### 10. FormationCore — Ядро формации

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| coreType | string | disk, altar |
| variant | string | stone, jade, iron, spirit_iron, crystal... |
| levelMin | int | Мин. уровень формации |
| levelMax | int | Макс. уровень формации |
| maxSlots | int | Слоты для камней Ци |
| baseConductivity | int | Проводимость (ед/сек) |
| maxCapacity | int | Макс. ёмкость |
| isImbued | bool | Внедрена ли формация |
| imbuedTechniqueId | string | ID внедрённой техники |

### 11. ActiveFormation — Активная формация

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| sessionId | string | ID сессии |
| techniqueId | string | ID техники |
| coreId | string | ID ядра |
| level | int | Уровень |
| formationType | string | barrier, trap, amplification, suppression... |
| size | string | small, medium, large, great, heavy |
| currentQi | int | Текущее Ци |
| maxCapacity | int | Макс. ёмкость |
| contourQi | int | Затрачено на прорисовку |
| creationRadius | int | Радиус создания |
| effectRadius | int | Радиус эффекта |
| drainPerHour | int | Утечка Ци/час |
| stage | string | drawing, imbuing, mounting, filling, active, depleted |
| participants | JSON | Участники наполнения |

---

## 🗺️ Мир и объекты

### 12. Building — Здание

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| name | string | Название |
| buildingType | string | house, shop, temple, cave, tower, sect_hq |
| locationId | string | ID локации |
| width | int | Ширина (м) |
| length | int | Длина (м) |
| height | int | Высота (м) |
| isEnterable | bool | Можно войти |
| qiBonus | int | Бонус к медитации (%) |
| comfort | int | Комфорт |
| defense | int | Защита |

### 13. WorldObject — Объект мира

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| name | string | Название |
| objectType | string | resource, container, interactable, decoration |
| x, y, z | int | Координаты |
| isInteractable | bool | Можно взаимодействовать |
| isCollectible | bool | Можно собрать |
| health | int | Здоровье |
| resourceType | string | herb, ore, wood, water |
| resourceCount | int | Количество ресурса |
| inventory | JSON | Предметы в контейнере |

---

## 📊 Фракции и отношения

### 14. Faction — Фракция

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| name | string | Название |
| nameEn | string | Английское название |
| nationId | string | ID нации |
| description | string | Описание |

### 15. FactionRelation — Отношения фракций

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| sourceId | string | ID фракции-источника |
| targetId | string | ID целевой фракции |
| relationType | string | ally, enemy, neutral, vassal |
| strength | int | Сила отношений (-100 до 100) |

---

## 🔧 Материалы

### 16. Material — Материал

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| name | string | Название |
| tier | int | Тир (1-5) |
| category | string | metal, organic, mineral, wood, crystal |
| properties | JSON | Физические свойства |
| bonuses | JSON | Бонусы материала |
| description | string | Описание |
| rarity | float | Шанс выпадения (0.1-100) |
| source | string | Где добывается |
| requiredLevel | int | Мин. уровень для обработки |

---

## 📁 Файловая структура Unity

### ScriptableObjects

| Файл | Назначение |
|------|------------|
| `ScriptableObjects/CharacterData.asset` | Данные персонажа |
| `ScriptableObjects/NPCData.asset` | Данные NPC |
| `ScriptableObjects/LocationData.asset` | Данные локаций |
| `ScriptableObjects/TechniqueData.asset` | Данные техник |
| `ScriptableObjects/ItemData.asset` | Данные предметов |
| `ScriptableObjects/MaterialData.asset` | Данные материалов |

### JSON для сохранения

| Файл | Назначение |
|------|------------|
| `Saves/session.json` | Текущая сессия |
| `Saves/world_state.json` | Состояние мира |
| `Saves/characters.json` | Персонажи |
| `Saves/npcs.json` | NPC |

---

## 17. SpeciesPreset — Виды существ

### Иерархия типов души

| Уровень | Тип | Описание |
|---------|-----|----------|
| Уровень 1 | SoulType | ПЕРВИЧНЫЙ: character, creature, spirit, construct |
| Уровень 2 | Morphology | ВТОРИЧНЫЙ: humanoid, quadruped, bird, serpentine, arthropod |
| Уровень 3 | Species | КОНКРЕТНЫЙ: human, elf, wolf, dragon |

### Поля пресета вида

| Поле | Тип | Описание |
|------|-----|----------|
| id | string | Уникальный ID |
| soulType | string | character, creature, spirit, construct |
| morphology | string | humanoid, quadruped, bird, serpentine, arthropod |
| bodyMaterial | string | organic, scaled, chitin, ethereal, mineral, chaos |
| **Характеристики (Range)** ||
| strength | {min, max} | Диапазон силы |
| agility | {min, max} | Диапазон ловкости |
| intelligence | {min, max} | Диапазон интеллекта |
| vitality | {min, max} | Диапазон жизнеспособности |
| **Способности** ||
| canCultivate | bool | Может культивировать |
| innateQiGeneration | bool | Врождённая генерация Ци |
| speechCapable | bool | Может говорить |
| toolUse | bool | Использует инструменты |
| learningRate | float | Скорость обучения (0.1-2.0) |
| **Культивация** ||
| coreCapacityBase | {min, max} | Базовая ёмкость ядра |
| maxCultivationLevel | int | Макс. уровень культивации |
| conductivityBase | float | Базовая проводимость |
| **Прочее** ||
| sizeClass | string | tiny, small, medium, large, huge |
| innateTechniques | JSON[] | Врождённые техники |
| weaknesses | string[] | Слабости |
| resistances | string[] | Сопротивления |
| lifespan | int | Продолжительность жизни |

### Типы материалов тела

| Материал | Снижение урона | Примеры |
|----------|----------------|----------|
| organic | 0% | Люди, звери |
| scaled | 30% | Рептилии, драконы |
| chitin | 20% | Пауки, скорпионы |
| mineral | 50% | Големы |
| ethereal | 70% | Призраки |
| chaos | 40% | Аберрации |

---

## 📚 Связанные документы

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Общая архитектура Unity
- [SAVE_SYSTEM.md](./SAVE_SYSTEM.md) — Система сохранений
- [CONFIGURATIONS.md](./CONFIGURATIONS.md) — Конфигурации
- [ALGORITHMS.md](./ALGORITHMS.md) — Алгоритмы и формулы

---

*Документ создан: 2026-03-30*  
*Статус: Черновик для доработки*  
*Только теория — код будет в отдельных файлах*
