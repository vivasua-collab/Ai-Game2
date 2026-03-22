# 🌀 Анализ механики формаций

**Дата:** 2026-03-20 09:00 UTC
**Статус:** 📋 Теоретический анализ (v2)

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

## ❓ ОТКРЫТЫЕ ВОПРОСЫ

1. **Можно ли прервать наполнение?**
   - Сохраняется ли влитое Ци? (Да, контур держит)
   - Можно ли продолжить позже?

2. **Подпитка активной формации:**
   - Можно ли "долить" Ци в работающую формацию?
   - Кто может подпитывать?

3. **Контроль формации:**
   - Только создатель управляет?
   - Можно ли передать контроль?

4. **Разрушение извне:**
   - Можно ли разрушить контур физически?
   - Сколько урона нужно?

---

## 📚 СВЯЗАННЫЕ ДОКУМЕНТЫ

- **[formation_visualization.md](./formation_visualization.md)** — Графическое отображение формаций в Phaser
  - Визуализация контура и этапов создания
  - Точки подключения с подсветкой
  - Система частиц Ци
  - UI элементы для формаций

---

*Анализ обновлён: 2026-03-20 10:00 UTC*
*Добавлена проводимость меридиан и совместное наполнение*
*Добавлена ссылка на документ визуализации*
*Статус: Ожидает команды на реализацию*
