# Checkpoint: Реализация системы формаций v2

**Дата:** 2026-03-22
**Статус:** 🔄 В процессе реализации
**Версия:** 2.0
**Зависимости:** `formation_analysis.md` (v4.1), `formation_unified.md` (v4.1), `formation_drain_system.md` (v1.0), `formation_visualization.md`

---

## ✅ ПРОГРЕСС РЕАЛИЗАЦИИ

### Phase 1: База данных — ✅ ЗАВЕРШЕНО

- [x] Добавлены модели `FormationCore` и `ActiveFormation` в `prisma/schema.prisma`
- [x] Добавлены связи в `GameSession`, `Character`, `Technique`, `InventoryItem`
- [x] Выполнен `db:push` — таблицы созданы
- [x] Prisma Client сгенерирован

### Phase 2: Константы и генератор — ✅ ЗАВЕРШЕНО

- [x] Создан `src/lib/formations/formation-constants.ts`
  - CONTOUR_QI_BY_LEVEL
  - CAPACITY_MULTIPLIER_BY_SIZE
  - DRAIN_INTERVAL_BY_LEVEL, DRAIN_AMOUNT_BY_SIZE
  - QI_COST_RATIO_BY_LEVEL
  - MAX_HELPERS_BY_SIZE
  - RADIUS_BY_SIZE
  - Функции: calculateCapacity, calculateDrainParams, calculateTimeToDepletion
  
- [x] Создан `src/lib/formations/formation-core-generator.ts`
  - DISK_CORE_CONFIGS (4 типа дисков L1-L6)
  - ALTAR_CORE_CONFIGS (4 типа алтарей L5-L9)
  - generateFormationCore()
  - getAvailableCoresForLevel()
  - isCoreCompatibleWithFormation()

### Phase 3: Менеджер и API — ✅ ЗАВЕРШЕНО

- [x] Создан `src/lib/formations/formation-manager.ts`
  - createFormationWithoutCore()
  - createFormationWithCore()
  - joinFormationFilling()
  - checkFormationDrain()
  - addQiToFormation()
  - activateFormation()
  - getSessionFormations()
  - getCharacterCores()
  
- [x] Создан `src/app/api/formations/route.ts`
  - GET: получение формаций сессии
  - POST: создание формации
  - PATCH: активация, добавление Ци, удаление
  - DELETE: удаление формации

- [x] Создан `src/app/api/formations/cores/route.ts`
  - GET: получение ядер персонажа, доступных для уровня
  - POST: генерация нового ядра
  - DELETE: удаление ядра

- [x] Создан `src/lib/formations/index.ts` (экспорты)

### Phase 4: UI — 🔄 В ПРОЦЕССЕ

- [x] Создан `src/components/formation/FormationCoresTab.tsx`
- [ ] Интеграция вкладки "Ядра" в TechniquesDialog
- [ ] Обновление отображения формаций (утечка, ядро)

### Phase 5: Визуализация — ⏳ ОЖИДАЕТ

- [ ] Создать `src/game/formation/FormationVisual.ts`
- [ ] Создать `src/game/formation/FormationVisualManager.ts`
- [ ] Интегрировать через шину данных

### 1.1 Найденные файлы

| Файл | Назначение | Статус |
|------|------------|--------|
| `src/lib/game/formations.ts` | Старые хардкоженные формации | ⚠️ Дублирование |
| `src/data/presets/formation-presets.ts` | Пресеты формаций (новые) | ✅ Актуально |
| `src/lib/generator/formation-generator.ts` | Генератор боевых формаций | ⚠️ Другая система! |
| `src/components/game/TechniquesDialog.tsx` | UI техник + вкладка "Формации" | ✅ Работает |
| `src/app/api/generator/formations/route.ts` | API генерации формаций | ⚠️ Для боевых |
| `src/app/api/meditation/route.ts` | API медитации с формациями | ✅ Работает |
| `src/types/technique-types.ts` | Типы техник (включает formation) | ✅ Актуально |

### 1.2 Проблемы и противоречия

#### Дублирование FormationType

| Файл | Значения |
|------|----------|
| `formations.ts` | `protective_circle, qi_condenser, spirit_barrier...` |
| `formation-presets.ts` | **ТЕ ЖЕ САМЫЕ** |
| `formation-generator.ts` | `defensive, offensive, support, special` ← **ДРУГАЯ СИСТЕМА!** |

#### Отсутствие модели Formation в Prisma

```
В prisma/schema.prisma НЕТ таблицы Formation!
Формации хранятся как Technique с type = 'formation'
```

### 1.3 Текущий UI

**TechniquesDialog.tsx:**
- Вкладка "Формации" (строки 791-838)
- Компонент `FormationEffectsDisplay` (строки 78-171)
- Кнопка "Создать формацию" (строка 819-825)
- Разделение техник по категориям (строки 303-321)

---

## 2. ЗАДАЧИ

### 2.1 Расширение базы данных (Приоритет: HIGH)

**Файл:** `prisma/schema.prisma`

```prisma
// ==================== FORMATION SYSTEM ====================

// Ядра формаций (диски и алтари)
model FormationCore {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // === Тип ===
  coreType    String  // disk, altar
  variant     String  // stone, jade, iron, spirit_iron, crystal, dragon_bone
  
  // === Уровень ===
  levelMin    Int     // Мин. уровень
  levelMax    Int     // Макс. уровень
  
  // === Параметры ===
  maxSlots        Int     @default(1)    // Слоты для камней Ци
  baseConductivity Int   @default(5)     // Проводимость ед/сек
  maxCapacity     Int     @default(10000) // Макс ёмкость формации
  
  // === Состояние ===
  isImbued        Boolean @default(false)  // Внедрена ли формация
  imbuedFormationId String?               // ID внедрённой формации
  
  // === Для крафта ===
  craftSkill      String?                 // Профессия для создания
  craftDifficulty Int     @default(1)     // Сложность крафта
  
  // === Для алтарей ===
  isStationary    Boolean @default(false)
  locationId      String?
  
  // === Владелец ===
  characterId String?
  character   Character? @relation(fields: [characterId], references: [id], onDelete: Cascade)
  
  // === Инвентарь ===
  inventoryId   String?
  inventoryItem InventoryItem? @relation(fields: [inventoryId], references: [id], onDelete: Cascade)
  
  @@index([coreType])
  @@index([characterId])
}

// Активные формации в мире
model ActiveFormation {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // === Привязка ===
  sessionId String
  session   GameSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  // === Техника формации ===
  techniqueId String
  technique   Technique @relation(fields: [techniqueId], references: [id])
  
  // === Ядро (опционально) ===
  coreId String?
  core   FormationCore? @relation(fields: [coreId], references: [id])
  
  // === Создатель ===
  creatorId String?
  
  // === Параметры ===
  level       Int
  formationType String  // barrier, trap, amplification, suppression, summoning, transport
  size        String    // small, medium, large, great, heavy
  isHeavy     Boolean   @default(false)
  
  // === Ёмкость ===
  currentQi   Int       @default(0)
  maxCapacity Int
  
  // === Контур ===
  contourQi   Int       // Затрачено на прорисовку
  
  // === Радиусы ===
  creationRadius Int    @default(10)
  effectRadius   Int    @default(50)
  
  // === Утечка ===
  drainInterval  Int     @default(60)   // Интервал в тиках
  drainAmount    Int     @default(1)    // Ци за раз
  drainPerHour   Int     @default(1)    // Ци/час
  lastDrainTick  Int     @default(0)    // Последний тик утечки
  
  // === Для барьеров ===
  qiCostRatio Float?    // 1 урон = X Ци
  
  // === Этап ===
  stage String @default("filling")  // drawing, imbuing, mounting, filling, active, depleted
  
  // === Позиция ===
  locationId String?
  x          Int       @default(0)
  y          Int       @default(0)
  
  // === Участники наполнения (JSON) ===
  participants String @default("[]")  // [{ practitionerId, isCreator, conductivity, qiDensity, contribution }]
  
  @@index([sessionId])
  @@index([locationId])
  @@index([stage])
}

// Расширение модели Technique
// Добавить в существующую модель Technique:
// formationParams String? // JSON: { formationType, size, isHeavy, requiresCore, compatibleCores }
```

**После изменений:**
```bash
bun run db:push
```

---

### 2.2 Генератор ядер формаций (Приоритет: HIGH)

**Файл:** `src/lib/generator/formation-core-generator.ts` (новый)

```typescript
import { FormationCore } from '@prisma/client';

// === ТИПЫ ЯДЕР ===
export type CoreType = 'disk' | 'altar';
export type DiskVariant = 'stone' | 'jade' | 'iron' | 'spirit_iron';
export type AltarVariant = 'jade' | 'crystal' | 'spirit_crystal' | 'dragon_bone';

// === КОНСТАНТЫ ЯДЕР ===
export const DISK_CORE_CONFIGS = {
  stone: { levelRange: [1, 2], maxSlots: 1, conductivity: 5, capacity: 10000, craftSkill: 'masonry', difficulty: 1 },
  jade: { levelRange: [2, 4], maxSlots: 1, conductivity: 10, capacity: 50000, craftSkill: 'jewelry', difficulty: 2 },
  iron: { levelRange: [3, 5], maxSlots: 2, conductivity: 15, capacity: 200000, craftSkill: 'smithing', difficulty: 3 },
  spirit_iron: { levelRange: [4, 6], maxSlots: 3, conductivity: 25, capacity: 500000, craftSkill: 'spirit_smithing', difficulty: 5 },
} as const;

export const ALTAR_CORE_CONFIGS = {
  jade: { levelRange: [5, 6], maxSlots: 3, conductivity: 40, capacity: 5000000, stationary: true },
  crystal: { levelRange: [6, 7], maxSlots: 5, conductivity: 55, capacity: 20000000, stationary: true },
  spirit_crystal: { levelRange: [7, 8], maxSlots: 8, conductivity: 75, capacity: 50000000, stationary: true },
  dragon_bone: { levelRange: [8, 9], maxSlots: 10, conductivity: 100, capacity: 200000000, stationary: true },
} as const;

// === ГЕНЕРАЦИЯ ЯДРА ===
export function generateFormationCore(
  level: number,
  preferType?: 'disk' | 'altar',
  variant?: string
): Omit<FormationCore, 'id' | 'createdAt' | 'updatedAt'> {
  // Определение типа
  let coreType: CoreType = preferType || (level >= 5 ? 'altar' : 'disk');
  
  // Выбор варианта
  if (variant) {
    if (coreType === 'disk' && variant in DISK_CORE_CONFIGS) {
      return createCoreFromConfig('disk', variant as DiskVariant, level);
    }
    if (coreType === 'altar' && variant in ALTAR_CORE_CONFIGS) {
      return createCoreFromConfig('altar', variant as AltarVariant, level);
    }
  }
  
  // Авто-выбор по уровню
  if (coreType === 'disk') {
    const availableVariants = Object.entries(DISK_CORE_CONFIGS)
      .filter(([_, cfg]) => level >= cfg.levelRange[0] && level <= cfg.levelRange[1])
      .map(([v]) => v as DiskVariant);
    const selected = availableVariants[Math.floor(Math.random() * availableVariants.length)] || 'stone';
    return createCoreFromConfig('disk', selected, level);
  } else {
    const availableVariants = Object.entries(ALTAR_CORE_CONFIGS)
      .filter(([_, cfg]) => level >= cfg.levelRange[0] && level <= cfg.levelRange[1])
      .map(([v]) => v as AltarVariant);
    const selected = availableVariants[Math.floor(Math.random() * availableVariants.length)] || 'jade';
    return createCoreFromConfig('altar', selected, level);
  }
}

function createCoreFromConfig(
  type: CoreType,
  variant: string,
  level: number
): Omit<FormationCore, 'id' | 'createdAt' | 'updatedAt'> {
  const config = type === 'disk' 
    ? DISK_CORE_CONFIGS[variant as DiskVariant]
    : ALTAR_CORE_CONFIGS[variant as AltarVariant];
  
  return {
    coreType: type,
    variant: variant,
    levelMin: config.levelRange[0],
    levelMax: config.levelRange[1],
    maxSlots: config.maxSlots,
    baseConductivity: config.conductivity,
    maxCapacity: config.capacity,
    isImbued: false,
    imbuedFormationId: null,
    craftSkill: 'craftSkill' in config ? config.craftSkill : 'formation_engineering',
    craftDifficulty: 'difficulty' in config ? config.difficulty : 6,
    isStationary: 'stationary' in config ? config.stationary : false,
    locationId: null,
    characterId: null,
    inventoryId: null,
  };
}

// === ПРОВЕРКА СОВМЕСТИМОСТИ ===
export function isCoreCompatibleWithFormation(
  core: FormationCore,
  formationLevel: number
): boolean {
  return formationLevel >= core.levelMin && formationLevel <= core.levelMax;
}
```

---

### 2.3 Константы формаций (Приоритет: HIGH)

**Файл:** `src/lib/formations/formation-constants.ts` (новый)

```typescript
// === СТОИМОСТЬ КОНТУРА ===
export const CONTOUR_QI_BY_LEVEL: Record<number, number> = {
  1: 80, 2: 160, 3: 320, 4: 640, 5: 1280,
  6: 2560, 7: 5120, 8: 10240, 9: 20480,
};

// === МНОЖИТЕЛИ ЁМКОСТИ ===
export const CAPACITY_MULTIPLIER_BY_SIZE = {
  small: 10, medium: 50, large: 200, great: 1000,
} as const;

export const HEAVY_CAPACITY_MULTIPLIER = 10000;

// === УТЕЧКА: ИНТЕРВАЛ ПО УРОВНЮ (в тиках, 1 тик = 1 минута) ===
export const DRAIN_INTERVAL_BY_LEVEL: Record<number, number> = {
  1: 60, 2: 50, 3: 40, 4: 30, 5: 20,
  6: 15, 7: 10, 8: 8, 9: 5,
};

// === УТЕЧКА: КОЛИЧЕСТВО ПО РАЗМЕРУ ===
export const DRAIN_AMOUNT_BY_SIZE = {
  small: 1, medium: 3, large: 10, great: 30,
} as const;

export const DRAIN_AMOUNT_HEAVY = 100;

// === КОЭФФИЦИЕНТ ЗАТРАТ ЦИ НА УРОН ===
export const QI_COST_RATIO_BY_LEVEL: Record<number, number> = {
  1: 1.0, 2: 0.875, 3: 0.75, 4: 0.625, 5: 0.5,
  6: 0.4375, 7: 0.375, 8: 0.3125, 9: 0.25,
};

// === МАКСИМУМ ПОМОЩНИКОВ ===
export const MAX_HELPERS_BY_SIZE = {
  small: 2, medium: 5, large: 10, great: 20,
} as const;

export const MAX_HELPERS_HEAVY = 50;

// === РАДИУСЫ ===
export const RADIUS_BY_SIZE = {
  small: { creation: 10, effect: 50 },
  medium: { creation: 20, effect: 200 },
  large: { creation: 30, effect: 600 },
  great: { creation: 50, effect: 1000 },
} as const;

export const RADIUS_HEAVY = { creation: 100, effect: 5000 };
```

---

### 2.4 Обновление UI техник (Приоритет: HIGH)

**Файл:** `src/components/game/TechniquesDialog.tsx`

**Изменения:**

1. **Добавить отображение ядер формаций:**
```typescript
// Новая вкладка "Ядра формаций"
const [coresTab, setCoresTab] = useState(false);

// Компонент для отображения ядра
function FormationCoreCard({ core }: { core: FormationCore }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {core.coreType === 'disk' ? '💿' : '🏛️'} {core.variant}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div>Уровень: {core.levelMin}-{core.levelMax}</div>
        <div>Слоты: {core.maxSlots}</div>
        <div>Проводимость: {core.baseConductivity} ед/сек</div>
        <div>Вместимость: {core.maxCapacity.toLocaleString()} Ци</div>
        {core.isImbued && <Badge>Содержит формацию</Badge>}
      </CardContent>
    </Card>
  );
}
```

2. **Обновить вкладку "Формации":**
```typescript
// Добавить информацию о ядре
{formation.hasCore && (
  <div className="flex items-center gap-2">
    <Badge variant="outline">
      {formation.coreType === 'disk' ? '💿 Диск' : '🏛️ Алтарь'}
    </Badge>
    <span className="text-muted-foreground">
      {formation.isHeavy ? 'Тяжёлая' : formation.size}
    </span>
  </div>
)}

// Добавить отображение утечки
<div className="text-xs text-muted-foreground">
  Утечка: {formation.drainPerHour} Ци/час
  {formation.isHeavy && ' | Тяжёлая формация'}
</div>
```

---

### 2.5 Менеджер формаций (Приоритет: MEDIUM)

**Файл:** `src/lib/formations/formation-manager.ts` (новый)

```typescript
import { db } from '@/lib/db';
import { ActiveFormation } from '@prisma/client';
import {
  CONTOUR_QI_BY_LEVEL,
  CAPACITY_MULTIPLIER_BY_SIZE,
  HEAVY_CAPACITY_MULTIPLIER,
  DRAIN_INTERVAL_BY_LEVEL,
  DRAIN_AMOUNT_BY_SIZE,
  DRAIN_AMOUNT_HEAVY,
  QI_COST_RATIO_BY_LEVEL,
  MAX_HELPERS_BY_SIZE,
  MAX_HELPERS_HEAVY,
  RADIUS_BY_SIZE,
  RADIUS_HEAVY,
} from './formation-constants';

export class FormationManager {
  // === РАСЧЁТ ЁМКОСТИ ===
  static calculateCapacity(level: number, size: string, isHeavy: boolean): number {
    const contourQi = CONTOUR_QI_BY_LEVEL[level];
    if (isHeavy && level >= 6) {
      return contourQi * HEAVY_CAPACITY_MULTIPLIER;
    }
    return contourQi * CAPACITY_MULTIPLIER_BY_SIZE[size as keyof typeof CAPACITY_MULTIPLIER_BY_SIZE];
  }
  
  // === РАСЧЁТ УТЕЧКИ ===
  static calculateDrainParams(level: number, size: string, isHeavy: boolean) {
    const drainInterval = DRAIN_INTERVAL_BY_LEVEL[level];
    const drainAmount = isHeavy 
      ? DRAIN_AMOUNT_HEAVY 
      : DRAIN_AMOUNT_BY_SIZE[size as keyof typeof DRAIN_AMOUNT_BY_SIZE];
    const drainPerHour = Math.floor(60 / drainInterval) * drainAmount;
    return { drainInterval, drainAmount, drainPerHour };
  }
  
  // === СОЗДАНИЕ ФОРМАЦИИ БЕЗ ЯДРА ===
  static async createWithoutCore(params: {
    sessionId: string;
    techniqueId: string;
    creatorId: string;
    level: number;
    formationType: string;
    size: string;
    locationId?: string;
    x?: number;
    y?: number;
  }) {
    const contourQi = CONTOUR_QI_BY_LEVEL[params.level];
    const isHeavy = params.size === 'heavy';
    const capacity = this.calculateCapacity(params.level, params.size, isHeavy);
    const drain = this.calculateDrainParams(params.level, params.size, isHeavy);
    const radius = isHeavy ? RADIUS_HEAVY : RADIUS_BY_SIZE[params.size as keyof typeof RADIUS_BY_SIZE];
    
    return db.activeFormation.create({
      data: {
        sessionId: params.sessionId,
        techniqueId: params.techniqueId,
        creatorId: params.creatorId,
        level: params.level,
        formationType: params.formationType,
        size: params.size,
        isHeavy,
        currentQi: 0,
        maxCapacity: capacity,
        contourQi,
        creationRadius: radius.creation,
        effectRadius: radius.effect,
        drainInterval: drain.drainInterval,
        drainAmount: drain.drainAmount,
        drainPerHour: drain.drainPerHour,
        lastDrainTick: 0,
        qiCostRatio: QI_COST_RATIO_BY_LEVEL[params.level],
        stage: 'filling',
        locationId: params.locationId,
        x: params.x || 0,
        y: params.y || 0,
        participants: JSON.stringify([{
          practitionerId: params.creatorId,
          isCreator: true,
          conductivity: 0,
          qiDensity: 0,
          contribution: 0,
        }]),
      },
    });
  }
  
  // === СОЗДАНИЕ ФОРМАЦИИ С ЯДРОМ ===
  static async createWithCore(params: {
    sessionId: string;
    techniqueId: string;
    coreId: string;
    creatorId: string;
    level: number;
    formationType: string;
    size: string;
    locationId?: string;
    x?: number;
    y?: number;
  }) {
    // Проверка совместимости ядра
    const core = await db.formationCore.findUnique({ where: { id: params.coreId } });
    if (!core || core.isImbued) {
      throw new Error('Ядро не найдено или уже содержит формацию');
    }
    
    const formation = await this.createWithoutCore(params);
    
    // Обновляем ядро
    await db.formationCore.update({
      where: { id: params.coreId },
      data: { isImbued: true, imbuedFormationId: formation.id },
    });
    
    // Обновляем формацию
    return db.activeFormation.update({
      where: { id: formation.id },
      data: { coreId: params.coreId },
    });
  }
  
  // === ПРОВЕРКА УТЕЧКИ ===
  static checkDrain(formation: ActiveFormation, currentGlobalTick: number) {
    const ticksPassed = currentGlobalTick - formation.lastDrainTick;
    
    if (ticksPassed < formation.drainInterval) {
      return { drained: 0, newQi: formation.currentQi };
    }
    
    const drainCount = Math.floor(ticksPassed / formation.drainInterval);
    const totalDrained = drainCount * formation.drainAmount;
    const newQi = Math.max(0, formation.currentQi - totalDrained);
    
    return { drained: totalDrained, newQi };
  }
  
  // === ПРИСОЕДИНЕНИЕ К НАПОЛНЕНИЮ ===
  static async joinFilling(
    formationId: string,
    practitionerId: string,
    conductivity: number,
    qiDensity: number
  ) {
    const formation = await db.activeFormation.findUnique({ where: { id: formationId } });
    if (!formation || formation.stage !== 'filling') {
      throw new Error('Формация не найдена или не в этапе наполнения');
    }
    
    const participants = JSON.parse(formation.participants);
    const maxHelpers = formation.isHeavy 
      ? MAX_HELPERS_HEAVY 
      : MAX_HELPERS_BY_SIZE[formation.size as keyof typeof MAX_HELPERS_BY_SIZE];
    
    if (participants.length >= maxHelpers + 1) { // +1 for creator
      throw new Error('Максимум участников достигнут');
    }
    
    // Проверка уровня помощника
    const minLevel = Math.max(1, formation.level - 2);
    // ... проверка уровня практика
    
    participants.push({
      practitionerId,
      isCreator: false,
      conductivity,
      qiDensity,
      contribution: 0,
    });
    
    return db.activeFormation.update({
      where: { id: formationId },
      data: { participants: JSON.stringify(participants) },
    });
  }
}
```

---

### 2.6 Интеграция с системой тиков (Приоритет: MEDIUM)

**Файл:** `src/lib/services/time-tick.service.ts`

```typescript
// Добавить в processTimeTickEffects:

import { FormationManager } from '@/lib/formations/formation-manager';
import { db } from '@/lib/db';

// === ОБРАБОТКА ФОРМАЦИЙ ===
const activeFormations = await db.activeFormation.findMany({
  where: { sessionId, stage: 'active' },
});

for (const formation of activeFormations) {
  const drainResult = FormationManager.checkDrain(formation, currentGlobalTick);
  
  if (drainResult.drained > 0) {
    await db.activeFormation.update({
      where: { id: formation.id },
      data: {
        currentQi: drainResult.newQi,
        lastDrainTick: currentGlobalTick,
        stage: drainResult.newQi === 0 ? 'depleted' : 'active',
      },
    });
    
    // Событие через шину данных
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('formation:drain', {
        detail: { id: formation.id, drained: drainResult.drained, newQi: drainResult.newQi },
      }));
    }
    
    if (drainResult.newQi === 0) {
      // Формация истощена
      window.dispatchEvent(new CustomEvent('formation:depleted', {
        detail: { id: formation.id },
      }));
    }
  }
}
```

---

### 2.7 Визуализация формаций (Приоритет: MEDIUM)

**Источник:** `docs/formation_visualization.md`

**Файловая структура:**
```
src/game/formation/
├── FormationVisual.ts           # Основной класс визуализации
├── FormationContourRenderer.ts  # Рендеринг контура
├── ConnectionPointVisual.ts     # Точка подключения
├── QiFlowVisual.ts              # Поток Ци
├── QiParticleManager.ts         # Система частиц
├── FormationInfoPanel.ts        # UI панель
├── FormationProgressBar.ts      # Прогресс-бар
├── FormationVisualManager.ts    # Менеджер
├── constants.ts                 # Цвета и стили
└── index.ts                     # Экспорты
```

**Интеграция через шину данных:**

```typescript
// FormationVisualManager.ts
class FormationVisualManager {
  private formations: Map<string, FormationVisual> = new Map();
  
  constructor(private scene: Phaser.Scene) {
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    // Слушаем события от TruthSystem
    window.addEventListener('formation:create', ((e: CustomEvent) => {
      this.createFormationVisual(e.detail);
    }) as EventListener);
    
    window.addEventListener('formation:update', ((e: CustomEvent) => {
      this.updateFormation(e.detail);
    }) as EventListener);
    
    window.addEventListener('formation:drain', ((e: CustomEvent) => {
      this.onFormationDrain(e.detail);
    }) as EventListener);
    
    window.addEventListener('formation:depleted', ((e: CustomEvent) => {
      this.destroyFormation(e.detail.id);
    }) as EventListener);
  }
  
  private createFormationVisual(data: FormationCreateEvent) {
    const visual = new FormationVisual(this.scene, data);
    this.formations.set(data.id, visual);
    
    // Слой выше персонажей
    this.scene.add.existing(visual);
  }
  
  update(delta: number) {
    for (const visual of this.formations.values()) {
      visual.update(delta);
    }
  }
}
```

**Базовая визуализация (Phase 1):**

```typescript
// FormationVisual.ts - базовый класс
class FormationVisual extends Phaser.GameObjects.Container {
  private contourGraphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private infoPanel: FormationInfoPanel;
  
  constructor(scene: Phaser.Scene, data: FormationData) {
    super(scene, data.x, data.y);
    
    // Контур формации
    this.contourGraphics = scene.add.graphics();
    this.drawContour(data);
    
    // Свечение
    this.glowGraphics = scene.add.graphics();
    this.drawGlow(data);
    
    // Информационная панель
    this.infoPanel = new FormationInfoPanel(scene, data);
    this.add(this.infoPanel);
  }
  
  private drawContour(data: FormationData) {
    const { formationType, size, stage } = data;
    const radius = this.getRadius(size);
    
    this.contourGraphics.lineStyle(3, 0xfbbf24, 0.8); // Золотистый
    
    // Разные формы по типу
    switch (formationType) {
      case 'barrier':
        this.drawCircle(radius);
        break;
      case 'trap':
        this.drawTriangle(radius);
        break;
      case 'amplification':
        this.drawStar(radius);
        break;
      default:
        this.drawCircle(radius);
    }
  }
  
  private drawCircle(radius: number) {
    this.contourGraphics.strokeCircle(0, 0, radius);
  }
  
  update(delta: number) {
    // Анимация пульсации
    this.contourGraphics.setAlpha(0.7 + Math.sin(Date.now() / 500) * 0.3);
  }
}
```

---

### 2.8 API Endpoints (Приоритет: HIGH)

**Файл:** `src/app/api/formations/route.ts` (новый)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FormationManager } from '@/lib/formations/formation-manager';

// GET /api/formations - список формаций
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }
  
  const formations = await db.activeFormation.findMany({
    where: { sessionId },
    include: { technique: true, core: true },
  });
  
  return NextResponse.json({ formations });
}

// POST /api/formations - создание формации
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  try {
    let formation;
    
    if (body.coreId) {
      formation = await FormationManager.createWithCore(body);
    } else {
      formation = await FormationManager.createWithoutCore(body);
    }
    
    return NextResponse.json({ formation });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
```

**Файл:** `src/app/api/formations/cores/route.ts` (новый)

```typescript
// GET /api/formations/cores - список ядер
// POST /api/formations/cores - генерация ядра

import { generateFormationCore } from '@/lib/generator/formation-core-generator';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { level, type, variant } = body;
  
  const coreData = generateFormationCore(level, type, variant);
  const core = await db.formationCore.create({ data: coreData });
  
  return NextResponse.json({ core });
}
```

---

### 2.9 Удаление дублирования (Приоритет: LOW)

**Файлы для удаления/обновления:**

| Файл | Действие |
|------|----------|
| `src/lib/game/formations.ts` | Удалить (дублирование) |
| `src/lib/generator/formation-generator.ts` | Переименовать в `battle-formation-generator.ts` |

---

## 3. ПОРЯДОК РЕАЛИЗАЦИИ

### Phase 1: База данных (1-2 часа)

1. [ ] Добавить модели `FormationCore` и `ActiveFormation` в `prisma/schema.prisma`
2. [ ] Добавить поле `formationParams` в `Technique`
3. [ ] Выполнить `bun run db:push`
4. [ ] Проверить через Prisma Studio

### Phase 2: Константы и генератор ядер (2-3 часа)

1. [ ] Создать `src/lib/formations/formation-constants.ts`
2. [ ] Создать `src/lib/generator/formation-core-generator.ts`
3. [ ] Написать unit-тесты

### Phase 3: Менеджер формаций (2-3 часа)

1. [ ] Создать `src/lib/formations/formation-manager.ts`
2. [ ] Интегрировать с time-tick.service
3. [ ] Создать API endpoints

### Phase 4: UI обновление (3-4 часа)

1. [ ] Обновить `TechniquesDialog.tsx` - вкладка "Ядра"
2. [ ] Обновить вкладку "Формации" - отображение ядра и утечки
3. [ ] Добавить компонент `FormationCoreCard`
4. [ ] Интегрировать генерацию ядер

### Phase 5: Визуализация (4-6 часов)

1. [ ] Создать `src/game/formation/FormationVisual.ts`
2. [ ] Создать `src/game/formation/FormationVisualManager.ts`
3. [ ] Реализовать базовый контур
4. [ ] Интегрировать через шину данных
5. [ ] Подключить к LocationScene

---

## 4. КРИТЕРИИ ГОТОВНОСТИ

### Phase 1:
- [ ] Prisma Studio показывает таблицы FormationCore и ActiveFormation
- [ ] Migration прошла без ошибок

### Phase 2:
- [ ] `generateFormationCore(5)` создаёт корректное ядро
- [ ] Расчёт ёмкости: L5 Great = 1,280,000
- [ ] Расчёт утечки: L5 Great = 90 Ци/час

### Phase 3:
- [ ] `FormationManager.createWithoutCore()` создаёт формацию
- [ ] Утечка работает по системе тиков
- [ ] L1 Small живёт 800 часов = 33 дня

### Phase 4:
- [ ] Вкладка "Ядра" показывает все ядра персонажа
- [ ] Вкладка "Формации" показывает утечку и ядро
- [ ] Можно сгенерировать новое ядро

### Phase 5:
- [ ] Формация отображается в игре
- [ ] Контур пульсирует
- [ ] Информационная панель показывает состояние

---

## 5. РИСКИ

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Дублирование типов | Высокая | Среднее | Удалить formations.ts |
| Противоречия в формулах | Низкая | Высокое | Единый файл констант |
| Огромные числа ёмкости | Средняя | Низкое | Int в SQLite до 2^31 |
| Производительность частиц | Средняя | Среднее | Пулирование объектов |

---

## 6. ССЫЛКИ

### Документация:
- **Анализ:** `docs/formation_analysis.md` (v4.1)
- **Единая концепция:** `docs/formation_unified.md` (v4.1)
- **Утечка:** `docs/formation_drain_system.md` (v1.0)
- **Визуализация:** `docs/formation_visualization.md`

### Существующий код:
- **Старые формации:** `src/lib/game/formations.ts` (⚠️ удалить)
- **Пресеты:** `src/data/presets/formation-presets.ts`
- **Генератор боевых:** `src/lib/generator/formation-generator.ts` (⚠️ другая система)
- **UI техник:** `src/components/game/TechniquesDialog.tsx`
- **API медитации:** `src/app/api/meditation/route.ts`

### База данных:
- **Схема:** `prisma/schema.prisma`
- **Клиент:** `src/lib/db.ts`

---

*Чекпоинт обновлён: 2026-03-22*
*Версия: 2.0*
*Проведён аудит существующего кода*
*Добавлены модели БД для формаций и ядер*
*Добавлена визуализация через шину данных*
