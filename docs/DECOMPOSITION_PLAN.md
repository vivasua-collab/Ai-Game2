# 🗺️ План декомпозиции задач - Cultivation World Simulator

**Дата создания:** Текущая сессия
**Статус:** Планирование (к выполнению не приступать)

---

## 📊 Визуализация зависимостей

```
ПАРАЛЛЕЛЬНЫЕ БЛОКИ (можно выполнять одновременно):
┌─────────────────────────────────────────────────────────────────┐
│  БЛОК 1: Пресеты        БЛОК 3: Разделение    БЛОК 8: Усталость │
│  ├─ 1.1 technique       ├─ 3.1 techniques     ├─ 8.1 Константы  │
│  ├─ 1.2 skill           ├─ 3.2 skills         ├─ 8.2 Формулы    │
│  ├─ 1.3 formation       ├─ 3.3 formations     ├─ 8.3 Множители  │
│  ├─ 1.4 character       └─ 3.4 Импорты        └─ 8.4 Функции    │
│  └─ 1.5 index                                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    БЛОК 2: Схема БД                             │
│  ├─ 2.1 cultivationSkills (JSON)                                │
│  ├─ 2.2 qiUnderstanding (аккумулятор)                           │
│  ├─ 2.3 Technique.level                                         │
│  ├─ 2.4 CharacterTechnique.learningProgress                     │
│  ├─ 2.5 Location (x, y, z)                                      │
│  └─ 2.6 basePhysicalRecovery                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              БЛОК 4: Характеристики и техники                   │
│  ├─ 4.1 Сила/Ловкость → Физические техники                      │
│  ├─ 4.2 Интеллект/Проводимость → Техники Ци                     │
│  ├─ 4.3 Схема развития проводимости                             │
│  └─ 4.4 Формулы эффективности                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────┬─────────────────────────────────────┐
│   БЛОК 5: Обучение        │      БЛОК 6: Прозрение             │
│   ├─ 5.1 Авто (базовые)   │      ├─ 6.1 Аккумулятор            │
│   ├─ 5.2 NPC              │      ├─ 6.2 Прирост                │
│   ├─ 5.3 Свитки           │      ├─ 6.3 Создание техники       │
│   ├─ 5.4 Штрафы           │      └─ 6.4 Разбор техник          │
│   └─ 5.5 Тип предметов    │                                     │
└───────────────────────────┴─────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  БЛОК 7: Координаты                             │
│  ├─ 7.1 3D для объектов мира                                    │
│  ├─ 7.2 2D для карты игрока                                     │
│  ├─ 7.3 Расчёт расстояний                                       │
│  └─ 7.4 Возврат в пройденные места                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               БЛОК 9: Миграция и интеграция                     │
│  ├─ 9.1 prisma migrate                                          │
│  ├─ 9.2 character.service.ts                                    │
│  ├─ 9.3 API routes                                              │
│  └─ 9.4 UI                                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Детальная декомпозиция по блокам

### БЛОК 1: Архитектура данных (Пресеты)
**Зависимости:** Нет
**Можно выполнять параллельно с:** Блок 3, Блок 8

#### Задача 1.1: /data/presets/technique-presets.ts
```typescript
// Требования:
// - Обязательная инструкция по созданию стартовых техник в начале файла
// - Поле level для каждой техники
// - Зависимость от характеристик (сила/ловкость/интеллект/проводимость)
// - Типы: combat, cultivation, support, movement, sensory, healing

interface TechniquePreset {
  id: string;
  name: string;
  description: string;
  level: number; // НОВОЕ: уровень техники (1-9)
  type: TechniqueType;
  element: TechniqueElement;
  
  // Требования к характеристикам
  statRequirements?: {
    strength?: number;     // Для физических
    agility?: number;      // Для физических
    intelligence?: number; // Для Ци
    conductivity?: number; // Для Ци
  };
  
  // Множители эффективности от характеристик
  statScaling?: {
    strength?: number;     // +X% за единицу силы
    agility?: number;
    intelligence?: number;
    conductivity?: number;
  };
  
  // Остальные поля...
}
```

#### Задача 1.2: /data/presets/skill-presets.ts
```typescript
// Навыки культивации (пассивные)
// - deep_meditation, qi_perception, concentration, spirit_shield, danger_sense
// - Каждый навык имеет уровень (1-5)
// - prerequisites для изучения
```

#### Задача 1.3: /data/presets/formation-presets.ts
```typescript
// Формации (объекты мира)
// - protective_circle, qi_condenser, spirit_barrier, elemental_harmony
// - Требования для создания
// - Эффекты
```

#### Задача 1.4: /data/presets/character-presets.ts
```typescript
// Стартовые пресеты персонажей
interface CharacterPreset {
  id: string;
  name: string;
  startType: "sect" | "random" | "custom";
  
  stats: { strength, agility, intelligence, conductivity };
  cultivation: { level, subLevel, coreCapacity };
  
  // Начальные навыки и техники
  skills: Record<string, number>;     // {"deep_meditation": 1}
  techniques: string[];                // ID техник из пресета
  
  // Базовые техники (получаются автоматически)
  baseTechniques: string[];
}
```

---

### БЛОК 2: Схема базы данных
**Зависимости:** Блок 1 (пресеты должны быть готовы для миграции)
**Можно выполнять параллельно с:** После завершения Блоков 1, 3, 8

#### Задача 2.1: cultivationSkills (JSON)
```prisma
model Character {
  // Навыки культивации: {"deep_meditation": 3, "qi_perception": 2}
  cultivationSkills String @default("{}")
}
```

#### Задача 2.2: qiUnderstanding (аккумулятор прозрения)
```prisma
model Character {
  // Аккумулятор для системы прозрения
  qiUnderstanding Int @default(0)     // Текущее значение
  qiUnderstandingCap Int @default(100) // Максимум (растёт с уровнем)
  
  // При достижении cap → прозрение → новая техника → сброс
}
```

#### Задача 2.3: Technique.level
```prisma
model Technique {
  // НОВОЕ поле
  level Int @default(1) // Уровень техники (1-9)
  
  // Техники ниже уровня персонажа изучаются без штрафа
  // Техники выше уровня - со штрафом
}
```

#### Задача 2.4: CharacterTechnique.learningProgress
```prisma
model CharacterTechnique {
  mastery Float @default(0.0)      // Мастерство (уже есть)
  
  // НОВЫЕ поля:
  learningProgress Float @default(0.0) // Прогресс изучения (0-100%)
  learningSource String @default("")   // "preset", "npc", "scroll", "insight"
  learningStartedAt DateTime?          // Когда начали изучать
}
```

#### Задача 2.5: Location 3D координаты
```prisma
model Location {
  // ИЗМЕНИТЬ: сделать обязательными
  x Int @default(0)  // Восток(+)/Запад(-) в метрах
  y Int @default(0)  // Север(+)/Юг(-) в метрах
  z Int @default(0)  // Высота(+)/Глубина(-) в метрах
  
  // Вычисляемое (для совместимости)
  distanceFromCenter Int @default(0)
}
```

#### Задача 2.6: basePhysicalRecovery
```prisma
model Character {
  // Множитель восстановления усталости
  // Базовый = 1.0, у 9-го уровня может быть 100.0
  fatigueRecoveryMultiplier Float @default(1.0)
}
```

---

### БЛОК 3: Разделение файлов
**Зависимости:** Нет
**Можно выполнять параллельно с:** Блок 1, Блок 8

#### Структура после разделения:
```
/src/lib/game/
├── techniques.ts          # Активные способности (было technique-system.ts)
├── cultivation-skills.ts  # Пассивные навыки (остаётся)
├── formations.ts          # Формации (вынести из cultivation-skills.ts)
├── constants.ts           # Общие константы
├── fatigue-system.ts      # Система усталости
├── qi-system.ts           # Система Ци
├── qi-shared.ts           # Общие функции Ци
├── meditation-interruption.ts
├── environment-system.ts
├── request-router.ts
└── index.ts               # Экспорты
```

---

### БЛОК 4: Система характеристик и техник
**Зависимости:** Блок 2.3 (level в Technique)
**Можно выполнять параллельно с:** Блок 5

#### Задача 4.1: Влияние силы/ловкости на физические техники
```typescript
// Формула эффективности физической техники:
// effectiveness = baseDamage * (1 + (strength * strScaling + agility * agiScaling))

// Примеры:
// - Усиленный удар: strScaling = 0.05 (+5% за единицу силы)
// - Скорость ветра: agiScaling = 0.08 (+8% за единицу ловкости)
```

#### Задача 4.2: Влияние интеллекта/проводимости на техники Ци
```typescript
// Формула эффективности техники Ци:
// effectiveness = baseEffect * (1 + (intelligence * intScaling + conductivity * condScaling))

// Проводимость влияет на:
// 1. Мощность техник Ци
// 2. Скорость накопления Ци
// 3. Эффективность медитации
```

#### Задача 4.3: Схема развития проводимости
```typescript
// Проводимость растёт от:
// 1. Базовый прирост при повышении уровня (уже есть)
// 2. Медитация (небольшой прирост)
// 3. Использование техник Ци
// 4. Специальные упражнения/тренировки

interface ConductivityGrowth {
  // Базовый прирост за уровень
  basePerLevel: number;
  
  // Прирост за час медитации
  perMeditationHour: number;
  
  // Прирост за использование техники
  perTechniqueUse: number;
  
  // Кап для текущего уровня (нельзя превысить без повышения уровня)
  maxPerLevel: number[];
}
```

#### Задача 4.4: Формулы расчёта
```typescript
// Полная формула эффективности техники:
function calculateTechniqueEffectiveness(
  technique: Technique,
  character: Character
): number {
  let multiplier = 1.0;
  
  // Физические техники
  if (technique.statScaling?.strength) {
    multiplier += character.strength * technique.statScaling.strength;
  }
  if (technique.statScaling?.agility) {
    multiplier += character.agility * technique.statScaling.agility;
  }
  
  // Техники Ци
  if (technique.statScaling?.intelligence) {
    multiplier += character.intelligence * technique.statScaling.intelligence;
  }
  if (technique.statScaling?.conductivity) {
    multiplier += character.conductivity * technique.statScaling.conductivity;
  }
  
  // Мастерство
  multiplier *= (1 + technique.masteryBonus * technique.masteryProgress / 100);
  
  return technique.baseEffect * multiplier;
}
```

---

### БЛОК 5: Система обучения техникам
**Зависимости:** Блок 2, Блок 4
**Можно выполнять параллельно с:** Блок 6

#### Задача 5.1: Автоматическое получение базовых техник
```typescript
// При создании персонажа из пресета:
// 1. Получить пресет по startType
// 2. Добавить все техники из baseTechniques[]
// 3. Установить learningProgress = 100 (уже изучены)
// 4. Установить learningSource = "preset"

function grantBaseTechniques(character: Character, preset: CharacterPreset) {
  for (const techniqueId of preset.baseTechniques) {
    await db.characterTechnique.create({
      data: {
        characterId: character.id,
        techniqueId,
        mastery: 0,
        learningProgress: 100,
        learningSource: "preset",
      }
    });
  }
}
```

#### Задача 5.2: Обучение у NPC
```typescript
// API: POST /api/game/learn-technique
interface LearnTechniqueRequest {
  techniqueId: string;
  teacherId: string;      // NPC ID
  duration: number;       // часы обучения
}

// Логика:
// 1. Проверить что NPC может обучать (role: "elder", teachableTechniques: string[])
// 2. Рассчитать прирост progress с учётом штрафа за уровень
// 3. Проверить требования к характеристикам
// 4. Списать очки вклада/духовные камни

// Штраф за уровень:
// Если technique.level > character.cultivationLevel:
//   progressGain *= 1 - (techniqueLevel - charLevel) * 0.2
//   // 1 уровень разницы = -20%, 2 = -40%, и т.д.
```

#### Задача 5.3: Изучение свитков
```typescript
// Предмет: technique_scroll
interface TechniqueScroll extends InventoryItem {
  type: "technique_scroll";
  techniqueId: string;
  quality: number; // Влияет на скорость изучения
}

// Действие: "изучить свиток [название]"
// 1. Начать изучение (learningProgress начинает расти)
// 2. Каждый час изучения → +X% progress
// 3. При 100% → техника изучена, свиток исчезает

// Прогресс зависит от:
// - Интеллекта персонажа
// - Качества свитка
// - Разницы уровней (штраф)
```

#### Задача 5.4: Штраф за уровень
```typescript
function calculateLearningSpeed(
  techniqueLevel: number,
  characterLevel: number,
  characterIntelligence: number
): number {
  let baseSpeed = 10; // % в час
  
  // Бонус от интеллекта
  baseSpeed *= 1 + (characterIntelligence - 10) * 0.02; // +2% за каждую единицу выше 10
  
  // Штраф за уровень техники
  if (techniqueLevel > characterLevel) {
    const levelDiff = techniqueLevel - characterLevel;
    baseSpeed *= Math.max(0.1, 1 - levelDiff * 0.2);
  }
  
  return baseSpeed;
}
```

#### Задача 5.5: Тип предметов
```typescript
// Добавить в InventoryItem:
type ItemType = 
  | "material" 
  | "artifact" 
  | "consumable" 
  | "spirit_stone"
  | "technique_scroll"  // НОВОЕ
  | "skill_scroll";     // НОВОЕ

// Свойства свитка:
interface ScrollProperties {
  techniqueId: string;
  quality: number;      // 1-5
  difficulty: number;   // Сложность изучения
  requiredIntelligence: number;
}
```

---

### БЛОК 6: Система прозрения
**Зависимости:** Блок 2.2, Блок 4
**Можно выполнять параллельно с:** Блок 5

#### Задача 6.1: Аккумулятор Понимания Ци
```typescript
// Скрытый навык "Понимание Ци"
// - Не отображается в UI
// - Накапливается при изучении техник
// - При достижении cap → прозрение → новая техника

// Размер аккумулятора зависит от уровня:
const QI_UNDERSTANDING_CAP: Record<number, number> = {
  1: 100,   // Уровень 1
  2: 200,   // Уровень 2
  3: 400,
  4: 800,
  5: 1600,  // С 5-го уровня доступно прозрение
  6: 3200,
  7: 6400,
  8: 12800,
  9: 25600,
};
```

#### Задача 6.2: Прирост Понимания Ци
```typescript
// Прирост при изучении техники:
function gainQiUnderstanding(
  character: Character,
  techniqueLevel: number
): number {
  // Базовый прирост = уровень техники * 10
  // Чем сложнее техника, тем больше понимания
  return techniqueLevel * 10;
}

// Прирост при разборе техники (5+ уровень):
function gainFromAnalysis(
  character: Character,
  technique: Technique
): number {
  // Разбор даёт больше понимания, но уничтожает технику
  return technique.level * 25;
}
```

#### Задача 6.3: Механика прозрения
```typescript
// При достижении qiUnderstanding >= cap:
async function triggerInsight(character: Character) {
  // 1. Создать новую технику
  const newTechnique = await generateTechniqueFromInsight(
    character.cultivationLevel,
    character.skills
  );
  
  // 2. Сбросить аккумулятор
  await db.character.update({
    where: { id: character.id },
    data: {
      qiUnderstanding: 0,
      qiUnderstandingCap: QI_UNDERSTANDING_CAP[character.cultivationLevel + 1] || character.qiUnderstandingCap
    }
  });
  
  // 3. Добавить технику персонажу
  await grantTechnique(character, newTechnique, "insight");
  
  return newTechnique;
}
```

#### Задача 6.4: Разбор техник (5+ уровень)
```typescript
// Действие: "разобрать технику [название]" (только 5+ уровень)
// Условия:
// - character.cultivationLevel >= 5
// - technique.mastery >= 50 (хорошо изучена)
// - Медитация в процессе разбора

// Результат:
// 1. Техника удаляется
// 2. Большой прирост qiUnderstanding
// 3. Шанс создать новую технику того же уровня
// 4. Шанс зависит от: интеллекта, проводимости, мастерства техники

async function analyzeTechnique(
  character: Character,
  technique: CharacterTechnique
): Promise<{ qiGained: number; newTechnique?: Technique }> {
  // Прирост понимания
  const qiGained = technique.technique.level * 25;
  
  // Шанс создания новой техники
  const insightChance = 0.1 + // Базовый 10%
    character.intelligence * 0.01 +
    character.conductivity * 0.02 +
    technique.mastery * 0.005;
  
  let newTechnique;
  if (Math.random() < insightChance) {
    newTechnique = await generateSimilarTechnique(technique.technique);
  }
  
  return { qiGained, newTechnique };
}
```

---

### БЛОК 7: Система координат
**Зависимости:** Блок 2.5

#### Задача 7.1: 3D координаты для объектов мира
```typescript
// Все объекты мира (кроме инвентаря) имеют 3D координаты:
// - Locations
// - NPCs
// - EncounteredEntities
// - Sects

interface WorldPosition {
  x: number; // Восток(+)/Запад(-) в метрах
  y: number; // Север(+)/Юг(-) в метрах
  z: number; // Высота(+)/Глубина(-) в метрах
}
```

#### Задача 7.2: 2D отображение для карты игрока
```typescript
// UI показывает только x, y (плоская карта)
// z используется для:
// - Подземелий (z < 0)
// - Гор (z > 500)
// - Полётов (z > 1000, только для высоких уровней)

interface PlayerMapPosition {
  x: number;
  y: number;
  // z скрыт, но влияет на доступность
}
```

#### Задача 7.3: Функции расчёта
```typescript
function getDistance3D(a: WorldPosition, b: WorldPosition): number {
  return Math.sqrt(
    Math.pow(b.x - a.x, 2) +
    Math.pow(b.y - a.y, 2) +
    Math.pow(b.z - a.z, 2)
  );
}

function getDistance2D(a: WorldPosition, b: WorldPosition): number {
  return Math.sqrt(
    Math.pow(b.x - a.x, 2) +
    Math.pow(b.y - a.y, 2)
  );
}

function getDirection(a: WorldPosition, b: WorldPosition): number {
  // Угол в градусах (0 = север, 90 = восток)
  return Math.atan2(b.x - a.x, b.y - a.y) * 180 / Math.PI;
}
```

#### Задача 7.4: Возврат в пройденные места
```typescript
// Хранение истории посещений
interface VisitedLocation {
  locationId: string;
  firstVisit: DateTime;
  lastVisit: DateTime;
  visitCount: number;
  coordinates: WorldPosition;
}

// API: "вернуться в [место]"
// - Проверить что место посещено
// - Рассчитать время пути
// - Переместить персонажа
```

---

### БЛОК 8: Система усталости
**Зависимости:** Нет
**Можно выполнять параллельно с:** Блок 1, Блок 3

#### Задача 8.1: Корректировка констант
```typescript
// Изменить в constants.ts:
export const FATIGUE_CONSTANTS = {
  // ИЗМЕНЕНО: Было 0.083, стало 0.104
  SLEEP_MENTAL_RECOVERY: 0.104,   // ~50% за 8 часов (было ~40%)
  
  // Остальное без изменений
  SLEEP_PHYSICAL_RECOVERY: 0.104, // ~50% за 8 часов
  
  // ... остальное
}
```

#### Задача 8.2: Зависимость от уровня культивации
```typescript
// Новые константы:
export const FATIGUE_RECOVERY_BY_LEVEL: Record<number, number> = {
  1: 1.0,    // Базовый уровень
  2: 1.2,    // +20%
  3: 1.5,    // +50%
  4: 2.0,    // x2
  5: 3.0,    // x3
  6: 5.0,    // x5
  7: 10.0,   // x10
  8: 30.0,   // x30
  9: 100.0,  // x100 (может не спать неделями!)
};

// Множитель накопления усталости (обратный)
export const FATIGUE_ACCUMULATION_BY_LEVEL: Record<number, number> = {
  1: 1.0,    // Базовый
  2: 0.9,    // -10%
  3: 0.8,
  4: 0.6,
  5: 0.4,
  6: 0.2,
  7: 0.1,
  8: 0.05,
  9: 0.01,   // Накапливает усталость в 100 раз медленнее!
};
```

#### Задача 8.3: Множители восстановления
```typescript
function calculateFatigueRecovery(
  character: Character,
  baseRecovery: number
): number {
  const levelMultiplier = FATIGUE_RECOVERY_BY_LEVEL[character.cultivationLevel] || 1.0;
  const personalMultiplier = character.fatigueRecoveryMultiplier || 1.0;
  
  return baseRecovery * levelMultiplier * personalMultiplier;
}

// Пример для 9-го уровня:
// 8 часов сна = 50% * 100 = 5000% восстановления
// Практически полное восстановление за несколько минут сна!
```

#### Задача 8.4: Обновление функций
```typescript
// Обновить fatigue-system.ts:
export function calculateFatigueFromAction(
  character: Character,
  action: ActionType,
  durationMinutes: number,
  qiSpent: number = 0
): FatigueResult {
  // Получить множитель накопления для уровня
  const accumulationMultiplier = 
    FATIGUE_ACCUMULATION_BY_LEVEL[character.cultivationLevel] || 1.0;
  
  // Применить к расчётам
  let physicalChange = rates.physicalPerMinute * durationMinutes * accumulationMultiplier;
  let mentalChange = rates.mentalPerMinute * durationMinutes * accumulationMultiplier;
  
  // ... остальная логика
}

export function calculateRestRecovery(
  character: Character,
  durationMinutes: number,
  isSleep: boolean
): { physicalRecovered: number; mentalRecovered: number } {
  const baseRates = isSleep 
    ? { physical: FATIGUE_CONSTANTS.SLEEP_PHYSICAL_RECOVERY, mental: FATIGUE_CONSTANTS.SLEEP_MENTAL_RECOVERY }
    : { physical: FATIGUE_CONSTANTS.REST_LIGHT_PHYSICAL, mental: FATIGUE_CONSTANTS.REST_LIGHT_MENTAL };
  
  // Применить множитель уровня
  const levelMultiplier = FATIGUE_RECOVERY_BY_LEVEL[character.cultivationLevel] || 1.0;
  
  return {
    physicalRecovered: baseRates.physical * durationMinutes * levelMultiplier,
    mentalRecovered: baseRates.mental * durationMinutes * levelMultiplier,
  };
}
```

---

### БЛОК 9: Миграция и интеграция
**Зависимости:** Все предыдущие блоки

#### Задача 9.1: Миграция БД
```bash
bun run prisma migrate dev --name add_technique_systems
```

#### Задача 9.2: Обновление сервисов
- character.service.ts
- world.service.ts
- game.service.ts

#### Задача 9.3: Обновление API
- /api/chat/route.ts
- /api/game/start/route.ts
- Новый: /api/game/learn-technique/route.ts

#### Задача 9.4: Обновление UI
- Отображение уровня техник
- Прогресс изучения
- Карта с координатами

---

## 📊 Матрица параллельности

| Блок | Зависит от | Можно выполнять параллельно с |
|------|------------|-------------------------------|
| 1 | - | 3, 8 |
| 2 | 1 | - |
| 3 | - | 1, 8 |
| 4 | 2.3 | 5, 6 |
| 5 | 2, 4 | 6, 7 |
| 6 | 2.2, 4 | 5, 7 |
| 7 | 2.5 | 5, 6 |
| 8 | - | 1, 3 |
| 9 | 1-8 | - |

## 🚀 Рекомендуемый порядок выполнения

### Фаза 1 (параллельно):
- Блок 1: Пресеты
- Блок 3: Разделение файлов
- Блок 8: Усталость

### Фаза 2:
- Блок 2: Схема БД

### Фаза 3 (параллельно):
- Блок 4: Характеристики и техники
- Блок 7: Координаты

### Фаза 4 (параллельно):
- Блок 5: Обучение
- Блок 6: Прозрение

### Фаза 5:
- Блок 9: Интеграция

---

**Статус:** План утверждён, к выполнению не приступать.
