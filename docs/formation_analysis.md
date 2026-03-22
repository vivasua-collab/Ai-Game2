# 🌀 Анализ механики формаций

**Дата:** 2026-03-20 09:00 UTC
**Обновлено:** 2026-03-22
**Статус:** 📋 Теоретический анализ (v3)

---

## 🎯 КЛЮЧЕВАЯ КОНЦЕПЦИЯ

> *"Контур формации — это лишь сосуд. Сила приходит, когда ты наполняешь его Ци."*

### Три этапа создания:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ЭТАПЫ СОЗДАНИЯ ФОРМАЦИИ                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ЭТАП 1: ПРОРИСОВКА КОНТУРА                                                  │
│  ─────────────────────────────                                               │
│  - Практик прогоняет Ци через меридианы                                     │
│  - Ограничено ПРОВОДИМОСТЬЮ (conductivity)                                   │
│  - Затрата Ци: baseCapacity × 2^(level-1)                                   │
│  - Время: затраченное Ци / (conductivity × qiDensity)                       │
│  - Результат: "сырой" контур на земле                                        │
│                                                                              │
│  ЭТАП 2: СТАБИЛИЗАЦИЯ                                                        │
│  ─────────────────────────────                                               │
│  - Ци НЕ тратится!                                                           │
│  - Ждём "проявления" рисунка                                                │
│  - Фиксированное время: ~10-30 секунд                                        │
│  - Результат: стабильный контур, готовый к наполнению                       │
│                                                                              │
│  ЭТАП 3: НАПОЛНЕНИЕ                                                          │
│  ─────────────────────────────                                               │
│  - Вливание Ци в контур                                                      │
│  - Ограничено ПРОВОДИМОСТЬЮ (conductivity)                                   │
│  - Скорость: conductivity × qiDensity баз.Ци/сек                            │
│  - Ёмкость: контур × (10-100)                                               │
│  - Можно подключить НЕСКОЛЬКО практиков                                      │
│  - Результат: заряженная формация                                            │
│                                                                              │
│  ЭТАП 4: АКТИВАЦИЯ                                                           │
│  ─────────────────────────────                                               │
│  - Мгновенно                                                                 │
│  - Результат: работающая формация                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📐 ФОРМУЛЫ

### Проводимость меридиан (conductivity)

```typescript
// Проводимость определяет, сколько Ци может пройти через меридианы в секунду
// Базовое значение: 3-5 у новичков, 10-15 у мастеров

// Скорость потока Ци:
const flowRate = conductivity * qiDensity; // баз. Ци/сек
```

### ЭТАП 1: Прорисовка контура

```typescript
// Затрата Ци на контур:
const contourQi = 80 * Math.pow(2, techniqueLevel - 1);

// Время прорисовки:
const drawTime = contourQi / (conductivity * qiDensity); // секунды
```

| Уровень | Контур (Ци) | L3 (cond=5, dens=4) | L5 (cond=8, dens=16) | L9 (cond=15, dens=256) |
|---------|-------------|---------------------|----------------------|------------------------|
| L1 | 80 | 4 сек | 0.6 сек | 0.02 сек |
| L3 | 320 | 16 сек | 2.5 сек | 0.08 сек |
| L5 | 1,280 | 64 сек | 10 сек | 0.3 сек |
| L9 | 20,480 | 17 мин | 2.7 мин | 5.3 сек |

### ЭТАП 2: Стабилизация

```typescript
// Ци НЕ тратится!
// Фиксированное время ожидания "проявления"

const STABILIZATION_TIME_BY_SIZE: Record<FormationSize, number> = {
  small: 10,    // 10 секунд
  medium: 15,   // 15 секунд
  large: 20,    // 20 секунд
  great: 30,    // 30 секунд
};
```

### ЭТАП 3: Наполнение

```typescript
// Ёмкость формации:
const capacity = contourQi * typeMultiplier * sizeMultiplier;

// Скорость наполнения (один практик):
const fillRate = conductivity * qiDensity; // баз. Ци/сек

// Время наполнения:
const fillTime = capacity / fillRate; // секунды

// При N практиков:
const fillTimeWithHelpers = capacity / (fillRate * N);
```

---

## 📊 ТАБЛИЦА ЁМКОСТЕЙ

### Множители по типу:

```typescript
const CAPACITY_BY_FORMATION_TYPE: Record<FormationType, number> = {
  barrier: 10,        // ×10
  trap: 15,           // ×15
  amplification: 20,  // ×20
  suppression: 20,    // ×20
  transport: 50,      // ×50
  summoning: 100,     // ×100
};

const CAPACITY_BY_SIZE: Record<FormationSize, number> = {
  small: 1,
  medium: 2,
  large: 4,
  great: 8,
};
```

### Примеры ёмкостей:

| Формация | Контур | Множитель | Ёмкость |
|----------|--------|-----------|---------|
| L5 Barrier Small | 1,280 | ×10 | 12,800 |
| L5 Barrier Great | 1,280 | ×80 | 102,400 |
| L5 Summoning Great | 1,280 | ×800 | 1,024,000 |
| L9 Barrier Great | 20,480 | ×80 | 1,638,400 |
| L9 Summoning Great | 20,480 | ×800 | 16,384,000 |

---

## ⏱️ ПОЛНОЕ ВРЕМЯ СОЗДАНИЯ

### Формула:

```typescript
function calculateTotalCreationTime(
  contourQi: number,
  capacity: number,
  conductivity: number,
  qiDensity: number,
  size: FormationSize,
  helperCount: number = 1
): { draw: number; stabilize: number; fill: number; total: number } {
  const flowRate = conductivity * qiDensity;
  
  const draw = contourQi / flowRate;
  const stabilize = STABILIZATION_TIME_BY_SIZE[size];
  const fill = capacity / (flowRate * helperCount);
  
  return {
    draw: Math.ceil(draw),
    stabilize,
    fill: Math.ceil(fill),
    total: Math.ceil(draw + stabilize + fill),
  };
}
```

### Примеры (один практик):

#### L3 практик (conductivity=5, qiDensity=4, flowRate=20 Ци/сек):

| Формация | Прорисовка | Стабилизация | Наполнение | ИТОГО |
|----------|------------|--------------|------------|-------|
| L1 Barrier Small | 4 сек | 10 сек | 40 сек | ~54 сек |
| L5 Barrier Small | 64 сек | 10 сек | 640 сек | ~12 мин |
| L5 Barrier Great | 64 сек | 30 сек | 5120 сек | ~87 мин |
| L5 Summoning Great | 64 сек | 30 сек | 51200 сек | ~14 часов |

#### L5 практик (conductivity=8, qiDensity=16, flowRate=128 Ци/сек):

| Формация | Прорисовка | Стабилизация | Наполнение | ИТОГО |
|----------|------------|--------------|------------|-------|
| L5 Barrier Small | 10 сек | 10 сек | 100 сек | ~2 мин |
| L5 Barrier Great | 10 сек | 30 сек | 800 сек | ~14 мин |
| L5 Summoning Great | 10 сек | 30 сек | 8000 сек | ~2.3 часа |

#### L9 практик (conductivity=15, qiDensity=256, flowRate=3840 Ци/сек):

| Формация | Прорисовка | Стабилизация | Наполнение | ИТОГО |
|----------|------------|--------------|------------|-------|
| L9 Barrier Small | 5 сек | 10 сек | 53 сек | ~1 мин |
| L9 Barrier Great | 5 сек | 30 сек | 427 сек | ~8 мин |
| L9 Summoning Great | 5 сек | 30 сек | 4267 сек | ~72 мин |

---

## 👥 СОВМЕСТНОЕ НАПОЛНЕНИЕ

### Концепция:

> *"Великие формации создаются сектами. Один рисует, многие наполняют."*

### Механика:

```typescript
interface FormationFilling {
  formationId: string;
  
  // Основной создатель (рисует контур)
  creatorId: string;
  
  // Наполнители (помогают вливать Ци)
  fillers: Array<{
    practitionerId: string;
    conductivity: number;
    qiDensity: number;
    contribution: number; // Сколько уже влил
  }>;
  
  // Общая скорость наполнения
  totalFillRate: number;
}

function calculateFillRate(filling: FormationFilling): number {
  // Создатель всегда участвует
  const creatorRate = creator.conductivity * creator.qiDensity;
  
  // Добавляем скорость каждого наполнителя
  const fillersRate = filling.fillers.reduce((sum, f) => 
    sum + f.conductivity * f.qiDensity, 0
  );
  
  // Эффективность: 100% создатель + 80% каждый помощник
  const efficiency = 1.0 + filling.fillers.length * 0.8;
  
  return (creatorRate + fillersRate) * efficiency;
}
```

### Пример: 5 практиков L5 создают L5 Summoning Great

```
Один создатель:
- fillRate = 128 Ци/сек
- Время наполнения: 1,024,000 / 128 = 8000 сек ≈ 2.3 часа

Пять практиков (1 создатель + 4 помощника):
- Каждый: 128 Ци/сек
- Суммарно: 128 × 5 = 640 Ци/сек
- С эффективностью: 640 × (1 + 4×0.8) = 640 × 4.2 = 2688 Ци/сек
- Время: 1,024,000 / 2688 = 381 сек ≈ 6.4 минуты!
```

### Ограничения:

```typescript
// Максимум помощников по размеру формации
const MAX_FILLERS_BY_SIZE: Record<FormationSize, number> = {
  small: 2,    // Максимум 2 помощника
  medium: 5,   // Максимум 5 помощников
  large: 10,   // Максимум 10 помощников
  great: 20,   // Максимум 20 помощников
};

// Требование к уровню помощников
const MIN_LEVEL_FOR_HELPER = {
  // Помощник должен быть минимум на 2 уровня ниже формации
  // L5 формация → помощники минимум L3
};
```

---

## 🔄 ПОЛНЫЙ ПРИМЕР

### Сценарий: Секта из 5 практиков L5 создаёт L5 Barrier Great

```
╔═══════════════════════════════════════════════════════════════════════════╗
║           СОЗДАНИЕ L5 BARRIER GREAT (5 практиков L5)                       ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  Параметры формации:                                                       ║
║  - Контур: 1,280 баз. Ци                                                   ║
║  - Ёмкость: 1,280 × 10 × 8 = 102,400 баз. Ци                              ║
║  - Размер: Great (радиус 100 м)                                           ║
║                                                                            ║
║  Параметры практиков:                                                      ║
║  - conductivity = 8                                                        ║
║  - qiDensity = 16                                                          ║
║  - flowRate = 128 Ци/сек каждый                                           ║
║                                                                            ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ЭТАП 1: ПРОРИСОВКА КОНТУРА                                                ║
║  ─────────────────────────────                                             ║
║  Тратит Ци: 1,280 баз. Ци                                                  ║
║  Проводит только создатель                                                 ║
║  Время: 1,280 / 128 = 10 секунд                                           ║
║  Результат: "сырой" контур на земле                                        ║
║                                                                            ║
║  ЭТАП 2: СТАБИЛИЗАЦИЯ                                                      ║
║  ─────────────────────────────                                             ║
║  Ци НЕ тратится                                                            ║
║  Время: 30 секунд (Great размер)                                          ║
║  Результат: стабильный контур                                              ║
║                                                                            ║
║  ЭТАП 3: НАПОЛНЕНИЕ (5 практиков)                                          ║
║  ─────────────────────────────                                             ║
║  Требуется: 102,400 баз. Ци                                                ║
║                                                                            ║
║  Скорость:                                                                 ║
║  - Базовая: 128 × 5 = 640 Ци/сек                                          ║
║  - С эффективностью: 640 × (1 + 4×0.8) = 2688 Ци/сек                     ║
║                                                                            ║
║  Время: 102,400 / 2688 = 38 секунд                                        ║
║                                                                            ║
║  ЭТАП 4: АКТИВАЦИЯ                                                         ║
║  ─────────────────────────────                                             ║
║  Мгновенно                                                                 ║
║                                                                            ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ИТОГО: 10 + 30 + 38 = 78 секунд ≈ 1.3 минуты                             ║
║                                                                            ║
║  Для одного практика было бы: 10 + 30 + 800 = 840 сек ≈ 14 минут          ║
║  Выгода от команды: ×10 быстрее!                                          ║
║                                                                            ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## ⏱️ ДЕГРАДАЦИЯ

### Очень медленная:

```typescript
const BASE_DEGRADATION_RATE = 0.001; // 0.1% за ход (6 сек)

const DEGRADATION_BY_GRADE: Record<TechniqueGrade, number> = {
  common: 1.0,        // 0.1%/ход
  refined: 0.75,      // 0.075%/ход
  perfect: 0.5,       // 0.05%/ход
  transcendent: 0.25, // 0.025%/ход
};
```

### Время до 50% заряда:

| Grade | L5 Barrier (12,800) | L9 Summoning (16M) |
|-------|---------------------|--------------------|
| Common | ~39 мин | ~11 часов |
| Perfect | ~78 мин | ~22 часа |
| Transcendent | ~2.6 часа | ~44 часа |

---

## 🔧 ИНТЕРФЕЙСЫ

```typescript
interface FormationState {
  id: string;
  techniqueId: string;
  
  // Этап жизни
  stage: 'drawing' | 'stabilizing' | 'filling' | 'active' | 'depleted';
  
  // Контур
  contourQi: number;         // Затрачено на контур
  drawTime: number;          // Время прорисовки (сек)
  
  // Стабилизация
  stabilizationTime: number; // Время стабилизации (сек)
  stabilizationStarted: Date | null;
  
  // Наполнение
  currentQi: number;         // Текущее Ци
  maxCapacity: number;       // Максимум
  
  // Участники
  creatorId: string;
  fillers: FormationFiller[];
  totalFillRate: number;
  
  // Параметры
  type: FormationType;
  size: FormationSize;
  grade: TechniqueGrade;
  level: number;
  radius: number;
  
  // Деградация
  degradationRate: number;
}

interface FormationFiller {
  practitionerId: string;
  conductivity: number;
  qiDensity: number;
  efficiency: number;  // 1.0 для создателя, 0.8 для помощников
  contribution: number; // Сколько влил
}

// Расчёт параметров
function calculateFormationParams(
  technique: Technique,
  size: FormationSize,
  creator: Practitioner
): FormationState {
  const contourQi = 80 * Math.pow(2, technique.level - 1);
  const flowRate = creator.conductivity * creator.qiDensity;
  
  const typeMult = CAPACITY_BY_FORMATION_TYPE[technique.formationType];
  const sizeMult = CAPACITY_BY_SIZE[size];
  
  return {
    stage: 'drawing',
    contourQi,
    drawTime: Math.ceil(contourQi / flowRate),
    stabilizationTime: STABILIZATION_TIME_BY_SIZE[size],
    stabilizationStarted: null,
    currentQi: 0,
    maxCapacity: contourQi * typeMult * sizeMult,
    creatorId: creator.id,
    fillers: [],
    totalFillRate: flowRate,
    type: technique.formationType,
    size,
    grade: technique.grade,
    level: technique.level,
    radius: SIZE_TO_RADIUS[size],
    degradationRate: BASE_DEGRADATION_RATE * DEGRADATION_BY_GRADE[technique.grade],
  };
}
```

---

## 📊 ИТОГОВАЯ ТАБЛИЦА

### Один практик L5 (cond=8, dens=16):

| Формация | Прорисовка | Стабилизация | Наполнение | ИТОГО |
|----------|------------|--------------|------------|-------|
| Barrier Small | 10 сек | 10 сек | 100 сек | ~2 мин |
| Barrier Great | 10 сек | 30 сек | 800 сек | ~14 мин |
| Summoning Great | 10 сек | 30 сек | 8000 сек | ~2.3 часа |

### Команда 5 практиков L5:

| Формация | Прорисовка | Стабилизация | Наполнение | ИТОГО |
|----------|------------|--------------|------------|-------|
| Barrier Great | 10 сек | 30 сек | 38 сек | ~1.3 мин |
| Summoning Great | 10 сек | 30 сек | 381 сек | ~7 мин |

### Выгода от команды: **×6-10 быстрее!**

---

## 🔋 ПОДПИТКА ФОРМАЦИЙ

### Варианты подпитки:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     МЕХАНИЗМЫ ПОДПИТКИ ФОРМАЦИЙ                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ТИП 1: СТАЦИОНАРНЫЕ ФОРМАЦИИ (постоянные)                                   │
│  ─────────────────────────────────────────                                   │
│  - Защитный купол города                                                     │
│  - Ловушки в гробницах                                                       │
│  - Стражи древних храмов                                                     │
│                                                                              │
│  Особенности:                                                                │
│  - Не зависят от создателя после активации                                   │
│  - Требуют источник Ци для подпитки                                          │
│  - Могут работать веками при правильном питании                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ИСТОЧНИКИ Ци ДЛЯ СТАЦИОНАРНЫХ ФОРМАЦИЙ:                             │    │
│  │                                                                      │    │
│  │  1. ПЬЕДЕСТАЛ С КАМНЯМИ Ци (аналог charger.md)                       │    │
│  │     - Физический элемент, встроенный в формацию                      │    │
│  │     - Гнёзда для камней Ци                                           │    │
│  │     - Автоматическое поглощение из камней                            │    │
│  │     - Скорость: проводимость_пьедестала ед/сек                       │    │
│  │     - Требует периодической замены камней                            │    │
│  │                                                                      │    │
│  │  2. КОНТУР СБОРА Ци (уровень 8+)                                     │    │
│  │     - Встроенный контур, собирающий Ци из среды                      │    │
│  │     - Самоподдерживаемая формация                                    │    │
│  │     - Эффективность зависит от плотности Ци в месте                  │    │
│  │     - Недостаток: медленная скорость восполнения                     │    │
│  │                                                                      │    │
│  │  3. ЛЕЙ-ЛИНИИ (географические потоки Ци)                             │    │
│  │     - Формация построена на пересечении потоков                      │    │
│  │     - Бесконечное питание из планетарной энергии                     │    │
│  │     - Редкость: требует особого места                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Пьедестал камней Ци:

```typescript
interface FormationPedestal {
  // === ФИЗИЧЕСКИЙ ЭЛЕМЕНТ ===
  id: string;
  type: 'pedestal';
  
  // Расположение
  position: {
    x: number;
    y: number;
    withinFormation: boolean;  // Внутри формации
  };
  
  // === СЛОТЫ ДЛЯ КАМНЕЙ ===
  slots: {
    id: string;
    index: number;
    currentStone: QiStone | null;
    compatibility: {
      minQuality: QiStoneQuality;
      maxSize: QiStoneSize;
    };
  }[];
  
  // === ПРОВОДИМОСТЬ ===
  conductivity: number;  // ед/сек (аналог charger.conductivity)
  
  // === СВЯЗЬ С ФОРМАЦИЕЙ ===
  linkedFormation: string;  // ID формации
  transferEfficiency: number;  // 0.9 = 90% Ци доходит до формации
}

// Расчёт скорости подпитки:
function calculatePedestalRecharge(pedestal: FormationPedestal): number {
  // Суммарная скорость всех камней
  const totalReleaseRate = pedestal.slots
    .filter(s => s.currentStone)
    .reduce((sum, s) => sum + s.currentStone!.properties.releaseRate, 0);
  
  // Ограничение проводимости пьедестала
  const effectiveRate = Math.min(totalReleaseRate, pedestal.conductivity);
  
  // С учётом эффективности передачи
  return effectiveRate * pedestal.transferEfficiency;
}

// Примеры проводимости пьедесталов:
const PEDESTAL_CONDUCTIVITY = {
  basic: 10,      // 10 ед/сек = базовый каменный пьедестал
  refined: 25,    // 25 ед/сек = обработанный нефрит
  master: 50,     // 50 ед/сек = мастерский духовный нефрит
  ancient: 100,   // 100 ед/сек = древний артефакт
};
```

### Контур сбора Ци (уровень 8+):

```typescript
interface QiCollectionCircuit {
  // === ПАРАМЕТРЫ ===
  enabled: boolean;
  formationLevel: number;  // Минимум 8
  
  // === ЭФФЕКТИВНОСТЬ ===
  // Собирает Ци из окружающей среды
  collectionRate: number;  // ед/сек
  
  // === ЗАВИСИМОСТЬ ОТ СРЕДЫ ===
  environmentMultiplier: {
    barren: 0.1,      // Пустыня, низины - почти нет Ци
    normal: 0.5,      // Обычная местность
    rich: 1.0,        // Богатое Ци место
    spiritual: 2.0,   // Духовная земля секты
    sacred: 5.0,      // Священное место
  };
  
  // === РАСЧЁТ ===
  // collectionRate = baseRate × environmentMultiplier × formationLevel / 8
  // baseRate = 2 ед/сек для L8 формации в богатой местности
}

// Формула скорости сбора:
function calculateQiCollectionRate(
  formationLevel: number,
  environmentType: 'barren' | 'normal' | 'rich' | 'spiritual' | 'sacred'
): number {
  if (formationLevel < 8) return 0;
  
  const baseRate = 2;  // ед/сек
  const envMult = QI_COLLECTION_CIRCUIT.environmentMultiplier[environmentType];
  
  return baseRate * envMult * (formationLevel / 8);
}

// Примеры:
// L8 формация в духовной земле: 2 × 2.0 × 1 = 4 ед/сек = 14,400 ед/час
// L10 формация в священном месте: 2 × 5.0 × 1.25 = 12.5 ед/сек = 45,000 ед/час
```

---

## 💥 РАЗРУШЕНИЕ ИЗВНЕ

### Классификация по типам разрушения:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     РАЗРУШЕНИЕ ФОРМАЦИЙ                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ТИП ФОРМАЦИИ           │ МЕТОД РАЗРУШЕНИЯ         │ СЛОЖНОСТЬ             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  БАРЬЕРНЫЕ              │ СНАРУЖИ: ❌ Невозможно    │ Нужно попасть внутрь  │
│  (barrier, barrier_dome)│ ВНУТРИ: ✅ Возможно       │ через вход            │
│                         │                          │ или телепортацию      │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ЛОВУШКИ                │ СНАРУЖИ: ⚠️ Очень сложно  │ Нужно обнаружить     │
│  (trap, suppression)    │                          │ и нейтрализовать      │
│                         │ Обнаружение требует:     │ механизм              │
│                         │ - Навыка [Опасность]     │                       │
│                         │ - Времени на анализ      │                       │
│                         │ - Специальных техник     │                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ДРУГИЕ ТИПЫ            │ СНАРУЖИ: ✅ Возможно      │ Прямое разрушение    │
│  (amplification,        │                          │ контура              │
│   summoning, transport) │ Методы:                  │                       │
│                         │ - Физическое разрушение  │                       │
│                         │ - Ци-атака по контуру    │                       │
│                         │ - Истощение (вытягивание)│                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Механика разрушения:

```typescript
interface FormationDestruction {
  // === БАРЬЕРНЫЕ ФОРМАЦИИ ===
  barrier: {
    // Снаружи разрушить НЕЛЬЗЯ
    // Логика: барьер отделяет внутреннее пространство от внешнего
    // Атака снаружи поглощается барьером
    
    fromOutside: {
      possible: false;
      reason: 'Барьер защищает от внешних воздействий. Сначала нужно попасть внутрь.';
    };
    
    // Изнутри разрушить МОЖНО
    fromInside: {
      possible: true;
      methods: [
        'Физическое разрушение узловых точек контура',
        'Атака техниками по контуру изнутри',
        'Вытягивание Ци из формации (контр-техника)',
      ];
    };
    
    // Способы проникновения внутрь:
    entryMethods: [
      'Через официальный вход (если есть)',
      'Телепортация (нужна техника телепорта)',
      'Пространственные техники (разрыв барьера для прохода)',
    ];
  };
  
  // === ЛОВУШКИ ===
  trap: {
    // Очень сложно разрушить извне
    fromOutside: {
      possible: true;
      difficulty: 'extreme';
      
      requirements: {
        // Сначала нужно обнаружить
        detection: {
          skill: 'Опасность';
          minLevel: number;  // Уровень формации ловушки
          time: number;      // Время на анализ (минуты)
        };
        
        // Затем нейтрализовать
        neutralization: {
          methods: [
            'Аккуратное разрушение контура (нужна точность)',
            'Перехват контроля (очень высокий уровень)',
            'Обход триггера (навык Взлом)',
          ];
        };
      };
    };
  };
  
  // === ДРУГИЕ ТИПЫ ===
  other: {
    fromOutside: {
      possible: true;
      
      methods: {
        // Физическое разрушение контура
        physical: {
          damageToContour: number;  %;  // Нужно нанести 100% урона контуру
          damageType: 'physical' | 'qi';
        };
        
        // Ци-атака
        qiAttack: {
          // Атака техниками по контуру
          qiDamageMultiplier: 1.5;  // +50% урона по формациям
        };
        
        // Истощение
        drain: {
          // Вытягивание Ци из формации
          drainRate: number;  // ед/сек
          timeToDrain: number;  // ёмкость / drainRate
        };
      };
    };
  };
}

// Прочность контура:
function calculateContourDurability(formation: FormationState): number {
  // Базовая прочность = затраченное на контур Ци
  const baseDurability = formation.contourQi;
  
  // Множитель от уровня формации
  const levelMult = 1 + (formation.level - 1) * 0.2;  // L1=1.0, L5=1.8, L10=2.8
  
  return baseDurability * levelMult;
}

// Урон по контуру:
interface ContourDamage {
  physical: number;    // Физический урон (мечи, ударные техники)
  qi: number;          // Ци-урон (техники)
  drain: number;       // Вытягивание Ци
}
```

---

## 👤 СВЯЗЬ С СОЗДАТЕЛЕМ

### Ключевой принцип: НЕЗАВИСИМОСТЬ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ФОРМАЦИЯ И СОЗДАТЕЛЬ                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ПРИНЦИП: Формация НЕ привязана к создателю                                  │
│  ─────────────────────────────────────────                                   │
│                                                                              │
│  После активации формация существует самостоятельно:                         │
│  - Смерть создателя НЕ разрушает формацию                                    │
│  - Формация продолжает работать пока есть Ци                                 │
│  - Контроль может быть передан другому                                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  МЕХАНИЗМ: ПЕРЕДАЧА СЛЕПКА Ци                                        │    │
│  │                                                                      │    │
│  │  При создании формации практик может:                                │    │
│  │  1. Влить свою Ци как обычно (Ци остаётся у практика)               │    │
│  │  2. Передать "слепок Ци" в формацию (Ци ИСЧЕЗАЕТ из ядра)           │    │
│  │                                                                      │    │
│  │  Слепок Ци:                                                         │    │
│  │  - Часть Ци практика, "запечатанная" в формации                     │    │
│  │  - Позволяет получить "родство" с формацией                         │    │
│  │  - Упрощает контроль и управление                                    │    │
│  │  - Может быть извлечён обратно (с потерями)                         │    │
│  │                                                                      │    │
│  │  Цена передачи:                                                     │    │
│  │  - Ци УМЕНЬШАЕТСЯ в ядре практика                                   │    │
│  │  - Это "поделился" - безвозвратная трата                            │    │
│  │  - maxQi практика временно снижается на переданное количество       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Механика слепка Ци:

```typescript
interface QiImprint {
  // === ИДЕНТИФИКАЦИЯ ===
  id: string;
  practitionerId: string;
  formationId: string;
  
  // === КОЛИЧЕСТВО ===
  qiAmount: number;        // Сколько Ци передано
  
  // === ЭФФЕКТЫ ===
  effects: {
    // "Родство" с формацией
    affinity: number;       // 0.0-1.0 (10% переданного = 0.1 аффинити)
    
    // Упрощение контроля
    controlBonus: number;   // +X% к эффективности управления
    
    // Возможность извлечения
    canExtract: boolean;    // Можно ли забрать слепок обратно
    extractionLoss: number; // % потерь при извлечении (30-50%)
  };
  
  // === ВРЕМЕННЫЙ ШТРАФ ПРАКТИКА ===
  practitionerPenalty: {
    // maxQi практика временно снижена
    maxQiReduction: number; // = qiAmount
    
    // Восстановление
    recovery: {
      type: 'natural' | 'meditation';
      rate: number;        // ед/день естественного восстановления
      
      // Примечание: это НЕ текущее Ци, а максимум ядра
      // maxQi восстановится через qiAmount / rate дней
    };
  };
}

// Передача слепка:
function createQiImprint(
  practitioner: Character,
  formation: FormationState,
  amount: number
): QiImprint | null {
  // Проверки
  if (practitioner.maxQi < amount) {
    return null;  // Недостаточно Ци в ядре
  }
  
  // Создание слепка
  const imprint: QiImprint = {
    id: generateId(),
    practitionerId: practitioner.id,
    formationId: formation.id,
    qiAmount: amount,
    effects: {
      affinity: Math.min(1.0, amount / (formation.maxCapacity * 0.1)),
      controlBonus: Math.min(50, amount / 100),  // +1% за каждые 100 Ци
      canExtract: true,
      extractionLoss: 30 + Math.random() * 20,  // 30-50% потерь
    },
    practitionerPenalty: {
      maxQiReduction: amount,
      recovery: {
        type: 'natural',
        rate: amount * 0.01,  // 1% в день
      },
    },
  };
  
  // Применение штрафа к практику
  practitioner.maxQi -= amount;
  
  // Добавление Ци в формацию
  formation.currentQi += amount;
  
  return imprint;
}

// Извлечение слепка:
function extractQiImprint(
  imprint: QiImprint,
  practitioner: Character
): number {
  // Расчёт возвращаемого количества
  const returned = imprint.qiAmount * (1 - imprint.extractionLoss / 100);
  
  // Возврат maxQi практику
  practitioner.maxQi += imprint.qiAmount;
  
  // Возврат части Ци (то, что осталось в формации)
  const actualReturned = Math.min(returned, formation.currentQi);
  practitioner.currentQi += actualReturned;
  formation.currentQi -= actualReturned;
  
  return actualReturned;
}
```

---

## 👥 ТРЕБОВАНИЯ К УЧАСТНИКАМ

### Кто может участвовать в формации:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ТРЕБОВАНИЯ К УЧАСТНИКАМ                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  СМЕРТНЫЕ (без Ци)                                                           │
│  ───────────────────                                                         │
│  ❌ БЕСПОЛЕЗНЫ для формаций                                                   │
│                                                                              │
│  Причина: у смертных нет Ци в ядре                                           │
│  - Не могут наполнять формацию                                               │
│  - Не могут участвовать в ритуалах                                           │
│  - Не чувствуют контур формации                                              │
│                                                                              │
│  Исключение: могут быть "якорями" для некоторых формаций                     │
│  (стоять в определённых точках, но Ци вливают другие)                        │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────────│
│                                                                              │
│  ПРАКТИКИ (с Ци)                                                             │
│  ───────────────────                                                         │
│  ✅ МОГУТ УЧАСТВОВАТЬ                                                        │
│                                                                              │
│  Правило: Минимальный уровень помощника = уровень формации - 2               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ТАБЛИЦА ТРЕБОВАНИЙ                                                  │    │
│  │                                                                      │    │
│  │  Уровень формации  │ Мин. уровень помощника  │ Обоснование         │    │
│  │  ─────────────────────────────────────────────────────────────────  │    │
│  │  L1                │ L1-2 = — (нет треб.)    │ Любой практик       │    │
│  │  L2                │ L2-2 = L0 (нет треб.)   │ Любой практик       │    │
│  │  L3                │ L3-2 = L1               │ Минимум новичок     │    │
│  │  L4                │ L4-2 = L2               │                     │    │
│  │  L5                │ L5-2 = L3               │                     │    │
│  │  L6                │ L6-2 = L4               │                     │    │
│  │  L7                │ L7-2 = L5               │                     │    │
│  │  L8                │ L8-2 = L6               │                     │    │
│  │  L9                │ L9-2 = L7               │                     │    │
│  │  L10               │ L10-2 = L8              │ Высокий уровень     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ЛОГИКА: Чтобы формация не "выпила" практика в 0                             │
│  - Слабый практик не выдержит поток Ци                                       │
│  - Его проводимость недостаточна                                             │
│  - Риск истощения или травм меридиан                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Механика участия:

```typescript
interface FormationParticipant {
  practitionerId: string;
  level: number;
  
  // Роль в формации
  role: 'creator' | 'filler' | 'anchor';
  
  // Параметры для участия
  conductivity: number;
  qiDensity: number;
  currentQi: number;
  maxQi: number;
}

// Проверка возможности участия:
function canParticipateInFormation(
  participant: FormationParticipant,
  formationLevel: number,
  role: 'creator' | 'filler' | 'anchor'
): { canParticipate: boolean; reason?: string } {
  // Создатель может быть любого уровня (он создаёт формацию своего уровня)
  if (role === 'creator') {
    return { canParticipate: true };
  }
  
  // Якорь - не вливает Ци, просто стоит в точке
  if (role === 'anchor') {
    // Даже смертный может быть якорем
    return { canParticipate: true };
  }
  
  // Наполнитель - должен иметь Ци
  if (participant.currentQi <= 0) {
    return { canParticipate: false, reason: 'Нет Ци в ядре' };
  }
  
  // Проверка уровня для наполнителя
  const minLevel = Math.max(1, formationLevel - 2);
  if (participant.level < minLevel) {
    return {
      canParticipate: false,
      reason: `Требуется минимум уровень ${minLevel}. Формация может истощить практика.`,
    };
  }
  
  return { canParticipate: true };
}

// Расчёт безопасного участия:
interface SafeParticipation {
  maxQiToContribute: number;    // Максимум Ци, которое можно безопасно влить
  exhaustionRisk: number;       // Риск истощения (0-100%)
  meridianStrain: number;       // Нагрузка на меридианы (0-100%)
}

function calculateSafeParticipation(
  participant: FormationParticipant,
  formation: FormationState
): SafeParticipation {
  const levelDiff = participant.level - formation.level;
  
  // Базовый безопасный процент = 70% + levelDiff * 10%
  const safePercent = Math.min(95, 70 + levelDiff * 10);
  
  // Максимум безопасного вклада
  const maxQiToContribute = participant.currentQi * (safePercent / 100);
  
  // Риск истощения при вливании всего Ци
  const exhaustionRisk = Math.max(0, 100 - safePercent);
  
  // Нагрузка на меридианы
  const meridianStrain = (formation.level / participant.level) * 50;
  
  return {
    maxQiToContribute,
    exhaustionRisk,
    meridianStrain,
  };
}
```

---

## ✅ РЕШЁННЫЕ ВОПРОСЫ

### 1. Можно ли прервать наполнение?

**✅ РЕШЕНИЕ: Да, можно.**
- Влитое Ци сохраняется в контуре
- Контур держит Ци даже без активности
- Можно продолжить наполнение позже
- Время стабилизации НЕ нужно повторять

### 2. Подпитка активной формации

**✅ РЕШЕНИЕ: Да, можно "долить" Ци.**
- Любой практик с достаточным уровнем может подпитывать
- Требования: мин. уровень = уровень формации - 2
- Скорость = проводимость × плотность Ци практика
- Можно подключить пьедестал с камнями Ци
- Можно встроить контур сбора Ци (L8+)

### 3. Контроль формации

**✅ РЕШЕНИЕ: Передача через слепок Ци.**
- Формация НЕ привязана к создателю
- Контроль = через слепок Ци ("родство")
- Можно передать контроль, передав слепок
- Можно создать несколько слепков для совместного контроля
- При смерти создателя формация продолжает работать

### 4. Разрушение извне

**✅ РЕШЕНИЕ: Зависит от типа.**
- **Барьерные**: только изнутри (сначала нужно проникнуть)
- **Ловушки**: очень сложно (требует обнаружения)
- **Другие**: можно разрушать извне (физически, Ци-атакой, истощением)

---

## 📚 СВЯЗАННЫЕ ДОКУМЕНТЫ

- **[formation_visualization.md](./formation_visualization.md)** — Графическое отображение формаций в Phaser
  - Визуализация контура и этапов создания
  - Точки подключения с подсветкой
  - Система частиц Ци
  - UI элементы для формаций

- **[charger.md](./charger.md)** — Зарядник для камней Ци
  - Механика проводимости и буфера
  - Аналогична механике пьедестала для формаций

---

*Анализ обновлён: 2026-03-22 UTC*
*Добавлена подпитка формаций (пьедестал, контур сбора Ци)*
*Добавлена механика разрушения извне*
*Добавлена независимость от создателя и слепок Ци*
*Добавлены требования к участникам (мин. уровень = формация - 2)*
*Статус: Готов к реализации*
