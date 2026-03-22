# Checkpoint: Реализация системы формаций

**Дата:** 2026-03-22
**Статус:** 📋 Планирование
**Зависимости:** `formation_analysis.md`, `formation_visualization.md`

---

## 1. КОНТЕКСТ

### 1.1 Текущее состояние

**Генератор формаций:** `src/lib/generator/formation-generator.ts`
- ✅ Генерация базовых параметров формации
- ✅ Система Grade (common/refined/perfect/transcendent)
- ✅ Типы: defensive, offensive, support, special
- ✅ Формы: circle, triangle, square, line, star, custom
- ❌ НЕТ файлов в `presets/formations/` - директория отсутствует
- ❌ НЕТ автогенерации формаций (только для техник)
- ❌ НЕТ механики создания формаций в игре

**Документация:**
- `docs/formation_analysis.md` - механика создания формаций (4 этапа)
- `docs/formation_visualization.md` - визуализация в Phaser

### 1.2 Проблемы

| Проблема | Влияние |
|----------|---------|
| Нет `presets/formations/` | generatedObjectsLoader возвращает [] |
| Нет автогенерации | NPC не получают формации из пула |
| Нет механики создания | Игрок не может создавать формации |
| Нет визуализации | Нет отображения в Phaser |

---

## 2. ЗАДАЧИ

### 2.1 Инфраструктура (Приоритет: HIGH)

#### 2.1.1 Создать директорию и файлы формаций

```
presets/formations/
├── all.json              # Все формации (альтернатива)
├── defensive/
│   ├── level-1.json
│   ├── level-3.json
│   ├── level-5.json
│   ├── level-7.json
│   └── level-9.json
├── offensive/
│   └── ... (аналогично)
├── support/
│   └── ...
└── special/
    └── ...
```

#### 2.1.2 Добавить автогенерацию формаций

**Файл:** `src/lib/generator/generated-objects-loader.ts`

```typescript
// Добавить в класс GeneratedObjectsLoader:

private async autoGenerateFormations(): Promise<GeneratedFormation[]> {
  // Аналогично autoGenerateTechniques
  // Генерировать по 10 формаций каждого типа на каждый уровень
}
```

#### 2.1.3 Обновить манифест

**Файл:** `presets/manifest.json`

```json
{
  "formations": {
    "total": 360,  // 4 типа × 9 уровней × 10 формаций
    "byLevel": { "1": 40, "2": 40, ... },
    "byType": { "defensive": 90, "offensive": 90, ... }
  }
}
```

---

### 2.2 Механика создания формаций (Приоритет: MEDIUM)

**Источник:** `docs/formation_analysis.md`

#### 2.2.1 Интерфейсы состояний

**Файл:** `src/types/formation-state.ts` (новый)

```typescript
export type FormationStage = 
  | 'drawing'      // Прорисовка контура
  | 'stabilizing'  // Стабилизация
  | 'filling'      // Наполнение Ци
  | 'active'       // Активна
  | 'depleted';    // Истощена

export type FormationSize = 'small' | 'medium' | 'large' | 'great';

export interface FormationState {
  id: string;
  techniqueId: string;
  stage: FormationStage;
  
  // Контур
  contourQi: number;
  drawTime: number;
  drawProgress: number;
  
  // Стабилизация
  stabilizationTime: number;
  stabilizationStarted: Date | null;
  
  // Наполнение
  currentQi: number;
  maxCapacity: number;
  
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

export interface FormationFiller {
  practitionerId: string;
  conductivity: number;
  qiDensity: number;
  efficiency: number;  // 1.0 создатель, 0.8 помощники
  contribution: number;
}
```

#### 2.2.2 Функции расчёта

**Файл:** `src/lib/formations/formation-calculations.ts` (новый)

```typescript
// Константы из formation_analysis.md
export const STABILIZATION_TIME_BY_SIZE: Record<FormationSize, number> = {
  small: 10,
  medium: 15,
  large: 20,
  great: 30,
};

export const CAPACITY_BY_FORMATION_TYPE: Record<FormationType, number> = {
  barrier: 10,
  trap: 15,
  amplification: 20,
  suppression: 20,
  transport: 50,
  summoning: 100,
};

export const CAPACITY_BY_SIZE: Record<FormationSize, number> = {
  small: 1,
  medium: 2,
  large: 4,
  great: 8,
};

export const MAX_FILLERS_BY_SIZE: Record<FormationSize, number> = {
  small: 2,
  medium: 5,
  large: 10,
  great: 20,
};

// Функции расчёта времени
export function calculateDrawTime(
  contourQi: number,
  conductivity: number,
  qiDensity: number
): number;

export function calculateFillTime(
  capacity: number,
  fillers: FormationFiller[]
): number;

export function calculateTotalCreationTime(
  contourQi: number,
  capacity: number,
  conductivity: number,
  qiDensity: number,
  size: FormationSize,
  helperCount: number
): { draw: number; stabilize: number; fill: number; total: number };
```

#### 2.2.3 Менеджер формаций

**Файл:** `src/lib/formations/formation-manager.ts` (новый)

```typescript
export class FormationManager {
  private activeFormations: Map<string, FormationState>;
  
  // Создание формации (начало этапа drawing)
  startFormation(
    technique: Technique,
    size: FormationSize,
    creator: Practitioner
  ): FormationState;
  
  // Присоединение к формации
  joinFormation(
    formationId: string,
    practitioner: Practitioner
  ): boolean;
  
  // Обновление состояния (каждый тик)
  update(deltaMs: number): void;
  
  // Активация формации
  activateFormation(formationId: string): void;
}
```

---

### 2.3 Визуализация в Phaser (Приоритет: LOW)

**Источник:** `docs/formation_visualization.md`

#### 2.3.1 Файловая структура

```
src/game/formation/
├── FormationVisual.ts           # Основной класс
├── FormationContourRenderer.ts  # Рендеринг контура
├── ConnectionPointVisual.ts     # Точки подключения
├── QiFlowVisual.ts              # Поток Ци
├── QiParticleManager.ts         # Частицы
├── FormationInfoPanel.ts        # UI панель
├── FormationProgressBar.ts      # Прогресс-бар
├── FormationVisualManager.ts    # Менеджер
└── constants.ts                 # Цвета и стили
```

#### 2.3.2 Этапы визуализации

| Этап | Визуальный эффект |
|------|-------------------|
| drawing | Линия "рисуется" по контуру |
| stabilizing | Руны появляются, точки пульсируют |
| filling | Потоки Ци от участников |
| active | Свечение, частицы вверх |

---

## 3. ПОРЯДОК РЕАЛИЗАЦИИ

### Phase 1: Инфраструктура (2-3 часа)

1. [ ] Создать `presets/formations/` директорию
2. [ ] Добавить `autoGenerateFormations()` в generated-objects-loader
3. [ ] Сгенерировать файлы формаций
4. [ ] Обновить manifest.json
5. [ ] Проверить загрузку через `generatedObjectsLoader.loadFormations()`

### Phase 2: Механика (4-6 часов)

1. [ ] Создать `src/types/formation-state.ts`
2. [ ] Создать `src/lib/formations/formation-calculations.ts`
3. [ ] Создать `src/lib/formations/formation-manager.ts`
4. [ ] Интегрировать с TruthSystem
5. [ ] Добавить события formation:create/update/destroy

### Phase 3: Визуализация (6-8 часов)

1. [ ] Создать базовый `FormationVisual`
2. [ ] Реализовать анимацию прорисовки контура
3. [ ] Добавить точки подключения
4. [ ] Реализовать потоки Ци
5. [ ] Интегрировать с LocationScene

---

## 4. ЗАВИСИМОСТИ

### Входящие зависимости:

| Файл | Зависит от |
|------|------------|
| generated-objects-loader.ts | formation-generator.ts |
| formation-manager.ts | formation-calculations.ts |
| FormationVisual.ts | FormationState (типы) |

### Исходящие зависимости:

| Файл | Используется в |
|------|----------------|
| formation-state.ts | formation-manager.ts, FormationVisual.ts |
| formation-calculations.ts | formation-manager.ts |

---

## 5. РИСКИ

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Противоречия в формулах | Средняя | Высокое | Проверить с body_review.md |
| Дублирование констант | Высокая | Среднее | Единый файл констант |
| Производительность частиц | Средняя | Среднее | Пулирование объектов |

---

## 6. КРИТЕРИИ ГОТОВНОСТИ

### Phase 1:
- [ ] `presets/formations/` содержит файлы
- [ ] manifest.json показывает total > 0 для формаций
- [ ] `loadFormations()` возвращает массив

### Phase 2:
- [ ] FormationManager создаёт формации
- [ ] Расчёты времени соответствуют формулам из analysis
- [ ] Помощники могут присоединяться

### Phase 3:
- [ ] Контур отрисовывается анимированно
- [ ] Точки подключения интерактивны
- [ ] Прогресс-бар показывает наполнение

---

## 7. ССЫЛКИ

- **Теория:** `docs/formation_analysis.md`
- **Визуализация:** `docs/formation_visualization.md`
- **Генератор:** `src/lib/generator/formation-generator.ts`
- **Загрузчик:** `src/lib/generator/generated-objects-loader.ts`

---

*Чекпоинт создан: 2026-03-22*
