# 📋 Детальный план незавершённых задач

**Дата создания:** 2026-03-22 17:09:47 UTC
**Версия:** 1.0
**Статус:** 📋 Ожидают выполнения

---

## 📊 СВОДКА НЕЗАВЕРШЁННЫХ ЗАДАЧ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    НЕЗАВЕРШЁННЫЕ ЗАДАЧИ                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  🔜 TODO-1: Unit тесты (Body_update, Combat) — P3 Опционально               │
│  🔜 TODO-2: UI компоненты (DamageFlowDisplay и др.) — P2 Важно              │
│  🔜 TODO-3: Formations Phase 4-5 (UI/Visual) — P2 Важно                     │
│  🔜 TODO-4: Generator Migration Phase 4 (Docs) — P3 Опционально             │
│  🔜 TODO-5: Combat AOE/Testing — P3 Опционально                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔜 TODO-1: Unit тесты

**Приоритет:** P3 (Опционально)
**Источники:** checkpoint_03_22_Body_update.md, checkpoint_03_22_Combat.md
**Оценка:** 4-6 часов

### 1.1 Подплан: level-suppression.test.ts

**Файл:** `src/lib/constants/level-suppression.test.ts`

**Тесты:**
```typescript
describe('Level Suppression', () => {
  // Группа 1: Базовые множители
  describe('calculateLevelSuppression()', () => {
    test('равные уровни = 1.0 множитель', () => {
      expect(calculateLevelSuppression(5, 5, 'normal')).toBe(1.0);
    });
    
    test('аттакующий выше на 1 = 1.5 множитель', () => {
      expect(calculateLevelSuppression(6, 5, 'normal')).toBe(1.5);
    });
    
    test('аттакующий ниже на 1 = 0.5 множитель', () => {
      expect(calculateLevelSuppression(5, 6, 'normal')).toBe(0.5);
    });
    
    test('аттакующий ниже на 2+ = иммунитет для normal', () => {
      expect(calculateLevelSuppression(5, 7, 'normal')).toBe(0);
      expect(isTargetImmune(5, 7, 'normal')).toBe(true);
    });
  });
  
  // Группа 2: Technique множители
  describe('Technique attacks', () => {
    test('technique пробивает +1 уровень', () => {
      expect(calculateLevelSuppression(5, 6, 'technique', 5)).toBe(0.5);
    });
    
    test('technique L8 пробивает +3 уровня', () => {
      expect(calculateLevelSuppression(5, 8, 'technique', 8)).toBe(0.25);
    });
  });
  
  // Группа 3: Ultimate множители
  describe('Ultimate attacks', () => {
    test('ultimate пробивает +4 уровня', () => {
      expect(calculateLevelSuppression(5, 9, 'ultimate', 5)).toBe(0.25);
    });
    
    test('ultimate имеет бонус множитель', () => {
      const normalResult = calculateLevelSuppression(7, 9, 'normal');
      const ultimateResult = calculateLevelSuppression(7, 9, 'ultimate');
      expect(ultimateResult).toBeGreaterThan(normalResult);
    });
  });
});
```

**Критерии готовности:**
- [ ] Все тесты проходят
- [ ] Coverage ≥ 80%
- [ ] Edge cases покрыты

### 1.2 Подплан: qi-buffer.test.ts

**Файл:** `src/lib/game/qi-buffer.test.ts`

**Тесты:**
```typescript
describe('Qi Buffer 90%', () => {
  // Группа 1: Базовое поглощение
  describe('processQiDamage()', () => {
    test('90% урона поглощается при достаточной Ци', () => {
      const result = processQiDamage({
        incomingDamage: 100,
        currentQi: 500,
        maxQi: 1000,
        hasShieldTechnique: false,
      });
      expect(result.absorbedDamage).toBeCloseTo(90, 0);
      expect(result.remainingDamage).toBeCloseTo(10, 0);
    });
    
    test('Ци тратится пропорционально', () => {
      const result = processQiDamage({
        incomingDamage: 100,
        currentQi: 500,
        maxQi: 1000,
        hasShieldTechnique: false,
      });
      expect(result.qiConsumed).toBeCloseTo(90, 0);
    });
  });
  
  // Группа 2: Ограничения Ци
  describe('Qi limitations', () => {
    test('при нехватке Ци поглощается меньше', () => {
      const result = processQiDamage({
        incomingDamage: 100,
        currentQi: 10,  // Мало Ци
        maxQi: 1000,
        hasShieldTechnique: false,
      });
      expect(result.absorbedDamage).toBeCloseTo(10, 0);  // Только 10
      expect(result.remainingDamage).toBeCloseTo(90, 0);
    });
    
    test('при 0 Ци всё проходит', () => {
      const result = processQiDamage({
        incomingDamage: 100,
        currentQi: 0,
        maxQi: 1000,
        hasShieldTechnique: false,
      });
      expect(result.absorbedDamage).toBe(0);
      expect(result.remainingDamage).toBe(100);
    });
  });
  
  // Группа 3: Щит-техника
  describe('Shield technique', () => {
    test('щит поглощает 100%', () => {
      const result = processShieldTechnique({
        incomingDamage: 100,
        currentQi: 500,
        maxQi: 1000,
      });
      expect(result.absorbedDamage).toBe(100);
      expect(result.remainingDamage).toBe(0);
    });
  });
});
```

**Критерии готовности:**
- [ ] Все тесты проходят
- [ ] Coverage ≥ 80%
- [ ] Edge cases покрыты

### 1.3 Подплан: Интеграционные тесты

**Файл:** `src/lib/game/damage-pipeline.test.ts`

**Тесты:**
```typescript
describe('Damage Pipeline', () => {
  test('полный pipeline с Level Suppression + Qi Buffer', () => {
    const result = processDamagePipeline({
      rawDamage: 100,
      attackerLevel: 5,
      defenderLevel: 7,
      attackType: 'technique',
      techniqueLevel: 5,
      defenderStats: {
        currentQi: 500,
        maxQi: 1000,
        hasShieldTechnique: false,
        armorDR: 0.1,
        bodyMaterial: 'organic',
      },
    });
    
    // Level Suppression: 5 vs 7 = 0.5
    // После suppression: 100 * 0.5 = 50
    // Qi Buffer 90%: 50 * 0.1 = 5 пробитие
    // Armor 10%: 5 * 0.9 = 4.5
    
    expect(result.finalDamage).toBeCloseTo(4.5, 0);
    expect(result.layers.levelSuppression).toBe(0.5);
    expect(result.layers.qiBuffer).toBeDefined();
  });
});
```

**Критерии готовности:**
- [ ] Pipeline тесты проходят
- [ ] Все слои защиты проверены

---

## 🔜 TODO-2: UI компоненты

**Приоритет:** P2 (Важно)
**Источники:** checkpoint_03_22_Combat.md, checkpoint_03_22_UI_Audit.md
**Оценка:** 6-8 часов

### 2.1 Подплан: DamageFlowDisplay.tsx

**Файл:** `src/components/game/DamageFlowDisplay.tsx`

**Описание:** Визуализация pipeline урона с анимацией слоёв защиты

**Структура:**
```tsx
interface DamageFlowDisplayProps {
  open: boolean;
  onClose: () => void;
  pipeline: DamagePipelineResult;
}

// Слои для отображения:
// 1. Raw Damage (исходный урон)
// 2. Level Suppression (множитель)
// 3. Qi Buffer (90% поглощение)
// 4. Material Reduction (chitin 20%, etc.)
// 5. Armor DR
// 6. Final Damage
```

**Компоненты:**
```
src/components/game/DamageFlowDisplay.tsx
├── DamageFlowDisplay.tsx (основной компонент)
├── DamageLayerCard.tsx (карточка слоя)
└── DamageFlowAnimation.tsx (анимация)
```

**Критерии готовности:**
- [ ] Компонент создан
- [ ] Анимация слоёв работает
- [ ] Интеграция с Event Bus

### 2.2 Подплан: QiBufferStatus.tsx

**Файл:** `src/components/game/QiBufferStatus.tsx`

**Описание:** Индикатор Qi Buffer 90%

**Структура:**
```tsx
interface QiBufferStatusProps {
  currentQi: number;
  maxQi: number;
  hasShieldTechnique: boolean;
}

// Отображение:
// - Прогресс-бар Ци
// - Индикатор 90% буфера
// - Статус щит-техники
```

**Данные из store:**
```typescript
const character = useGameCharacter();
// currentQi, maxQi из store
```

**Место размещения:** StatusDialog.tsx, вкладка "Культивация"

**Критерии готовности:**
- [ ] Компонент создан
- [ ] Интегрирован в StatusDialog
- [ ] Обновляется в реальном времени

### 2.3 Подплан: LevelSuppressionIndicator.tsx

**Файл:** `src/components/game/LevelSuppressionIndicator.tsx`

**Описание:** Индикатор подавления уровней

**Структура:**
```tsx
interface LevelSuppressionIndicatorProps {
  attackerLevel: number;
  defenderLevel: number;
  attackType: AttackType;
  techniqueLevel?: number;
}

// Отображение:
// - Разница уровней
// - Множитель подавления
// - Иконка типа атаки (normal/technique/ultimate)
// - Цветовая индикация (зелёный/жёлтый/красный)
```

**Интеграция:** 
- Event Bus response содержит levelSuppression
- Или рассчитывается локально

**Критерии готовности:**
- [ ] Компонент создан
- [ ] Интегрирован в TechniquesDialog
- [ ] Цветовая индикация работает

### 2.4 Подплан: FormationDrainDisplay

**Файл:** Изменения в `src/components/game/TechniquesDialog.tsx`

**Описание:** Отображение утечки Ци/час для формаций

**Изменения:**
```tsx
// В FormationEffectsDisplay добавить:
<div className="text-xs text-muted-foreground">
  Утечка: {formation.drainPerHour} Ци/час
  {formation.isHeavy && ' | Тяжёлая формация'}
</div>
```

**Критерии готовности:**
- [ ] Утечка отображается
- [ ] Форматирование корректное

---

## 🔜 TODO-3: Formations Phase 4-5

**Приоритет:** P2 (Важно)
**Источники:** checkpoint_03_22_Formations.md
**Оценка:** 6-10 часов

### 3.1 Подплан: UI интеграция (Phase 4)

**Задача:** Интегрировать FormationCoresTab в TechniquesDialog

**Файл:** `src/components/game/TechniquesDialog.tsx`

**Изменения:**
```tsx
// В вкладку "formations" добавить под-вкладки:
<TabsContent value="formations" className="mt-4 space-y-4">
  <Tabs defaultValue="techniques" className="w-full">
    <TabsList className="grid grid-cols-2 bg-slate-600">
      <TabsTrigger value="techniques">Формации</TabsTrigger>
      <TabsTrigger value="cores">Ядра</TabsTrigger>
    </TabsList>
    
    <TabsContent value="techniques">
      {/* Существующий контент */}
    </TabsContent>
    
    <TabsContent value="cores">
      <FormationCoresTab
        characterId={character.id}
        cultivationLevel={character.cultivationLevel}
      />
    </TabsContent>
  </Tabs>
</TabsContent>
```

**Критерии готовности:**
- [ ] Под-вкладки работают
- [ ] FormationCoresTab интегрирован
- [ ] Навигация работает

### 3.2 Подплан: Визуализация формаций (Phase 5)

**Задача:** Создать визуальное отображение формаций в игре

**Файловая структура:**
```
src/game/formation/
├── FormationVisual.ts           # Основной класс
├── FormationContourRenderer.ts  # Рендеринг контура
├── QiFlowVisual.ts              # Поток Ци
├── FormationInfoPanel.ts        # UI панель
└── FormationVisualManager.ts    # Менеджер
```

**FormationVisual.ts:**
```typescript
class FormationVisual extends Phaser.GameObjects.Container {
  private contourGraphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private infoPanel: FormationInfoPanel;
  
  constructor(scene: Phaser.Scene, data: FormationData) {
    super(scene, data.x, data.y);
    
    // Контур по типу формации
    this.drawContour(data);
    
    // Свечение
    this.drawGlow(data);
  }
  
  private drawContour(data: FormationData) {
    switch (data.formationType) {
      case 'barrier': this.drawCircle(data.size); break;
      case 'trap': this.drawTriangle(data.size); break;
      case 'amplification': this.drawStar(data.size); break;
    }
  }
  
  update(delta: number) {
    // Анимация пульсации
    this.contourGraphics.setAlpha(0.7 + Math.sin(Date.now() / 500) * 0.3);
  }
}
```

**FormationVisualManager.ts:**
```typescript
class FormationVisualManager {
  private formations: Map<string, FormationVisual> = new Map();
  
  constructor(private scene: Phaser.Scene) {
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    window.addEventListener('formation:create', ((e: CustomEvent) => {
      this.createFormationVisual(e.detail);
    }) as EventListener);
    
    window.addEventListener('formation:drain', ((e: CustomEvent) => {
      this.onFormationDrain(e.detail);
    }) as EventListener);
    
    window.addEventListener('formation:depleted', ((e: CustomEvent) => {
      this.destroyFormation(e.detail.id);
    }) as EventListener);
  }
}
```

**Интеграция с LocationScene:**
```typescript
// В LocationScene.ts
private formationManager: FormationVisualManager;

create() {
  this.formationManager = new FormationVisualManager(this);
}

update(time: number, delta: number) {
  this.formationManager.update(delta);
}
```

**Критерии готовности:**
- [ ] FormationVisual создан
- [ ] FormationVisualManager создан
- [ ] Интеграция с Event Bus
- [ ] Интеграция с LocationScene
- [ ] Анимация пульсации работает

---

## 🔜 TODO-4: Generator Migration Phase 4

**Приоритет:** P3 (Опционально)
**Источники:** checkpoint_03_22_Generator_Migration.md
**Оценка:** 30 минут

### 4.1 Подплан: Обновить JSDoc deprecated

**Файл:** `src/lib/generator/technique-generator.ts`

**Текущий (уже есть):**
```typescript
/**
 * @deprecated Используйте technique-generator-v2.ts
 */
```

**Без изменений - уже помечен.**

### 4.2 Подплан: Обновить документацию

**Файл:** `docs/generators.md`

**Добавить секцию:**
```markdown
## Статус генераторов

| Генератор | Версия | Статус |
|-----------|--------|--------|
| technique-generator.ts | V1 | @deprecated - использовать V2 |
| technique-generator-v2.ts | V2 | ✅ Актуальный |
| formation-generator.ts | V1 | ✅ Актуальный (боевые формации) |
| formation-core-generator.ts | V1 | ✅ Актуальный (медитативные) |
| equipment-generator.ts | V2 | ✅ Актуальный |
| consumable-generator.ts | V1 | ✅ Актуальный |
```

**Критерии готовности:**
- [ ] Документация обновлена
- [ ] Таблица статусов добавлена

---

## 🔜 TODO-5: Combat AOE/Testing

**Приоритет:** P3 (Опционально)
**Источники:** checkpoint_03_22_Combat.md
**Оценка:** 2-3 часа

### 5.1 Подплан: processAOEAttack()

**Файл:** `src/lib/game/damage-pipeline.ts`

**Описание:** Специализированная функция для AOE атак

**Функция:**
```typescript
interface AOEAttackParams {
  rawDamage: number;
  attackerLevel: number;
  attackType: AttackType;
  techniqueLevel: number;
  targets: Array<{
    id: string;
    level: number;
    stats: DefenderStats;
  }>;
}

interface AOEAttackResult {
  results: Map<string, DamagePipelineResult>;
  totalDamageDealt: number;
  immuneTargets: string[];
}

export function processAOEAttack(params: AOEAttackParams): AOEAttackResult {
  const results = new Map<string, DamagePipelineResult>();
  let totalDamage = 0;
  const immuneTargets: string[] = [];
  
  for (const target of params.targets) {
    // Level Suppression применяется индивидуально
    const result = processDamagePipeline({
      rawDamage: params.rawDamage,
      attackerLevel: params.attackerLevel,
      defenderLevel: target.level,
      attackType: params.attackType,
      techniqueLevel: params.techniqueLevel,
      defenderStats: target.stats,
    });
    
    results.set(target.id, result);
    
    if (result.isImmune) {
      immuneTargets.push(target.id);
    } else {
      totalDamage += result.finalDamage;
    }
  }
  
  return { results, totalDamageDealt: totalDamage, immuneTargets };
}
```

**Критерии готовности:**
- [ ] Функция создана
- [ ] Lint: 0 ошибок
- [ ] Unit тесты

### 5.2 Подплан: Event Bus тестирование

**Файл:** `src/lib/game/event-bus/handlers/combat.test.ts`

**Тесты:**
```typescript
describe('Combat Event Bus Handler', () => {
  test('technique:use списывает Ци', async () => {
    // ...
  });
  
  test('combat:damage_dealt применяет Level Suppression', async () => {
    // ...
  });
  
  test('combat:damage_dealt применяет Qi Buffer', async () => {
    // ...
  });
  
  test('combat:damage_dealt применяет Material Reduction', async () => {
    // ...
  });
});
```

**Критерии готовности:**
- [ ] Тесты созданы
- [ ] Все тесты проходят

---

## 📊 ИТОГОВАЯ ОЦЕНКА

| TODO | Приоритет | Оценка | Зависимости |
|------|-----------|--------|-------------|
| TODO-1: Unit тесты | P3 | 4-6 ч | Нет |
| TODO-2: UI компоненты | P2 | 6-8 ч | TODO-1 (частично) |
| TODO-3: Formations Phase 4-5 | P2 | 6-10 ч | Нет |
| TODO-4: Generator Docs | P3 | 30 мин | Нет |
| TODO-5: Combat AOE/Tests | P3 | 2-3 ч | TODO-1 |

**Общая оценка:** 18-27 часов

---

## 🎯 РЕКОМЕНДАЦИИ ПО ВЫПОЛНЕНИЮ

### Порядок выполнения (рекомендуемый):

1. **TODO-4** (30 мин) — Быстрая победа, документация
2. **TODO-2.2-2.3** (2-3 ч) — QiBufferStatus, LevelSuppressionIndicator
3. **TODO-3.1** (1-2 ч) — UI интеграция формаций
4. **TODO-1** (4-6 ч) — Unit тесты
5. **TODO-2.1** (2-3 ч) — DamageFlowDisplay
6. **TODO-3.2** (4-6 ч) — Визуализация формаций
7. **TODO-5** (2-3 ч) — AOE и тесты Event Bus

### Критичные зависимости:

- **TODO-2** может выполняться параллельно с **TODO-1**
- **TODO-3.1** независим от **TODO-3.2**
- **TODO-5** зависит от **TODO-1** (тесты)

---

*Файл создан: 2026-03-22 17:09:47 UTC*
*Версия: 1.0*
*Статус: 📋 Ожидают выполнения*
