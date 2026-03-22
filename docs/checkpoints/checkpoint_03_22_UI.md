# 🎨 План: UI компоненты v1.0

**Дата:** 2026-03-22
**Версия:** 1.0
**Статус:** 📋 Планирование
**Зависимости:** Body_update, Combat, Generators, Formations

---

## 📋 Обзор

Единый план UI компонентов для всех завершённых механик:
- Level Suppression System
- Qi Buffer 90%
- Damage Pipeline
- Ultimate-техники
- Formation Cores
- Material Reduction

---

## 1. СВОДКА UI ЗАДАЧ ИЗ ВСЕХ ЧЕКПОИНТОВ

### 1.1 Из Body_update.md

| Компонент | Статус | Описание |
|-----------|--------|----------|
| BodyStatusPanel.tsx | ✅ Существует | HP частей тела, кровотечения |
| BodyDoll.tsx | ✅ Существует | Визуальное отображение тела |
| QiBufferIndicator.tsx | 🔜 Не создан | Индикатор Qi Buffer 90% |
| LevelSuppressionIndicator.tsx | 🔜 Не создан | Индикатор подавления уровнем |
| DamageFlowDisplay.tsx | 🔜 Не создан | Визуализация pipeline урона |

### 1.2 Из Combat.md

| Компонент | Статус | Описание |
|-----------|--------|----------|
| DamageFlowDisplay.tsx | 🔜 Не создан | Визуализация pipeline урона |
| LevelSuppressionIndicator.tsx | 🔜 Не создан | Индикатор подавления |
| QiBufferStatus.tsx | 🔜 Не создан | Статус Qi Buffer |

### 1.3 Из Formations.md

| Компонент | Статус | Описание |
|-----------|--------|----------|
| FormationCoresTab.tsx | ✅ Создан | Управление ядрами |
| Интеграция в TechniquesDialog | 🔜 Не выполнена | Добавить вкладку "Ядра" |
| Обновление отображения формаций | 🔜 Не выполнена | Показывать утечку, ядро |
| FormationVisual.ts | 🔜 Не создан | Базовая визуализация |
| FormationVisualManager.ts | 🔜 Не создан | Менеджер визуализации |

### 1.4 Из Generators.md

| Компонент | Статус | Описание |
|-----------|--------|----------|
| UI для isUltimate | ⚠️ Частично | Маркер ⚡ уже отображается |
| UI для material | 🔜 Не создан | Отображение материала тела |

---

## 2. ПРИОРИТЕТЫ UI КОМПОНЕНТОВ

### Приоритет 1: КРИТИЧНО (влияет на игровой процесс)

| ID | Компонент | Файл | Описание |
|----|-----------|------|----------|
| UI-01 | Интеграция FormationCoresTab | TechniquesDialog.tsx | Добавить раздел "Ядра" в формации |
| UI-02 | QiBufferIndicator | QiBufferStatus.tsx | Показать % Ци для защиты |
| UI-03 | LevelSuppressionIndicator | LevelSuppressionIndicator.tsx | Показать множитель подавления |

### Приоритет 2: ВАЖНО (улучшает UX)

| ID | Компонент | Файл | Описание |
|----|-----------|------|----------|
| UI-04 | DamageFlowDisplay | DamageFlowDisplay.tsx | Анимация pipeline урона |
| UI-05 | FormationDrainDisplay | FormationEffectsDisplay | Показать утечку Ци/час |
| UI-06 | MaterialIndicator | BodyStatusPanel.tsx | Показать материал тела |

### Приоритет 3: УЛУЧШЕНИЕ (опционально)

| ID | Компонент | Файл | Описание |
|----|-----------|------|----------|
| UI-07 | FormationVisual | FormationVisual.ts | Базовый контур формации |
| UI-08 | UltimateEffect | CombatUI | Эффект для ultimate-техник |

---

## 3. ДЕТАЛЬНЫЕ СПЕЦИФИКАЦИИ

### 3.1 UI-01: Интеграция FormationCoresTab

**Файл:** `src/components/game/TechniquesDialog.tsx`

**Изменения:**
```tsx
// Добавить импорт
import { FormationCoresTab } from '@/components/formation/FormationCoresTab';

// В TabsContent value="formations" добавить под-вкладки:
<Tabs defaultValue="techniques" className="w-full">
  <TabsList className="grid grid-cols-2 bg-slate-600">
    <TabsTrigger value="techniques">Формации</TabsTrigger>
    <TabsTrigger value="cores">Ядра</TabsTrigger>
  </TabsList>
  
  <TabsContent value="techniques">
    {/* Существующий контент формаций */}
  </TabsContent>
  
  <TabsContent value="cores">
    <FormationCoresTab
      characterId={character.id}
      cultivationLevel={character.cultivationLevel}
    />
  </TabsContent>
</Tabs>
```

**Оценка:** 30-60 минут

---

### 3.2 UI-02: QiBufferIndicator

**Файл:** `src/components/game/QiBufferStatus.tsx` (новый)

**Спецификация:**
```tsx
interface QiBufferStatusProps {
  currentQi: number;
  maxQi: number;
  hasShieldTechnique: boolean;
  shieldQi?: number;
}

export function QiBufferStatus({ currentQi, maxQi, hasShieldTechnique, shieldQi }: QiBufferStatusProps) {
  const bufferQi = currentQi * 0.9; // 90% доступно для буфера
  const qiPercent = (bufferQi / maxQi) * 100;
  
  return (
    <div className="bg-slate-700/50 rounded-lg p-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-cyan-400">🛡️ Qi Buffer</span>
        <span className="text-slate-400">
          {hasShieldTechnique ? '100%' : '90%'} absorption
        </span>
      </div>
      <Progress value={qiPercent} className="h-2" />
      <div className="text-xs text-slate-500 mt-1">
        {bufferQi.toLocaleString()} / {maxQi.toLocaleString()} Ци
      </div>
      {hasShieldTechnique && shieldQi && (
        <div className="text-xs text-green-400 mt-1">
          ⚛️ Щит-техника: {shieldQi.toLocaleString()} Ци
        </div>
      )}
    </div>
  );
}
```

**Оценка:** 1-2 часа

---

### 3.3 UI-03: LevelSuppressionIndicator

**Файл:** `src/components/game/LevelSuppressionIndicator.tsx` (новый)

**Спецификация:**
```tsx
interface LevelSuppressionIndicatorProps {
  attackerLevel: number;
  defenderLevel: number;
  attackType: 'normal' | 'technique' | 'ultimate';
  techniqueLevel?: number;
}

export function LevelSuppressionIndicator({
  attackerLevel,
  defenderLevel,
  attackType,
  techniqueLevel
}: LevelSuppressionIndicatorProps) {
  const levelDiff = attackerLevel - defenderLevel;
  const multiplier = calculateLevelSuppression(
    attackerLevel,
    defenderLevel,
    attackType,
    techniqueLevel
  );
  
  // Цвет в зависимости от подавления
  const getColor = () => {
    if (multiplier === 0) return 'text-red-400';
    if (multiplier < 0.5) return 'text-orange-400';
    if (multiplier < 1) return 'text-yellow-400';
    return 'text-green-400';
  };
  
  // Текст описания
  const getDescription = () => {
    if (multiplier === 0) return 'Иммунитет!';
    if (levelDiff >= 5) return 'Подавление уровнем';
    if (levelDiff <= -5) return 'Превосходство';
    return '';
  };
  
  return (
    <div className="flex items-center gap-2">
      {multiplier !== 1 && (
        <>
          <span className={`text-sm font-bold ${getColor()}`}>
            {multiplier === 0 ? '🛡️' : `×${(multiplier * 100).toFixed(0)}%`}
          </span>
          <span className="text-xs text-slate-500">{getDescription()}</span>
        </>
      )}
    </div>
  );
}
```

**Оценка:** 1-2 часа

---

### 3.4 UI-04: DamageFlowDisplay

**Файл:** `src/components/game/DamageFlowDisplay.tsx` (новый)

**Спецификация:**
```tsx
interface DamageFlowDisplayProps {
  stages: {
    originalDamage: number;
    levelSuppression?: number;
    afterSuppression: number;
    qiBuffer?: { absorbed: number; pierced: number };
    materialReduction?: number;
    armorReduction?: number;
    finalDamage: number;
  };
}

export function DamageFlowDisplay({ stages }: DamageFlowDisplayProps) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-3 space-y-1 text-xs">
      <div className="flex justify-between">
        <span>Исходный урон:</span>
        <span className="text-red-400">{stages.originalDamage}</span>
      </div>
      
      {stages.levelSuppression !== undefined && stages.levelSuppression !== 1 && (
        <div className="flex justify-between text-orange-400">
          <span>Подавление уровнем:</span>
          <span>×{(stages.levelSuppression * 100).toFixed(0)}%</span>
        </div>
      )}
      
      {stages.qiBuffer && (
        <div className="flex justify-between text-cyan-400">
          <span>Qi Buffer (90%):</span>
          <span>-{stages.qiBuffer.absorbed} (+{stages.qiBuffer.pierced} пробитие)</span>
        </div>
      )}
      
      {stages.materialReduction && (
        <div className="flex justify-between text-amber-400">
          <span>Материал тела:</span>
          <span>-{(stages.materialReduction * 100).toFixed(0)}%</span>
        </div>
      )}
      
      {stages.armorReduction && (
        <div className="flex justify-between text-slate-400">
          <span>Броня:</span>
          <span>-{stages.armorReduction}</span>
        </div>
      )}
      
      <div className="flex justify-between pt-1 border-t border-slate-600 font-bold">
        <span>Итоговый урон:</span>
        <span className="text-red-400">{stages.finalDamage}</span>
      </div>
    </div>
  );
}
```

**Оценка:** 2-3 часа

---

### 3.5 UI-05: FormationDrainDisplay

**Файл:** Изменить `FormationEffectsDisplay` в TechniquesDialog.tsx

**Изменения:**
```tsx
// Добавить в FormationEffectsDisplay:
{technique.formationDrain && (
  <>
    <div className="flex justify-between text-sm pt-1 border-t border-slate-600">
      <span className="text-slate-400">💧 Утечка:</span>
      <span className="text-red-400">
        {technique.formationDrain.amount} Ци / {technique.formationDrain.interval} мин
      </span>
    </div>
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">⏱️ Время до истощения:</span>
      <span className="text-amber-400">
        {formatTimeToDepletion(technique.formationDrain)}
      </span>
    </div>
  </>
)}

{technique.core && (
  <div className="flex justify-between text-sm pt-1 border-t border-slate-600">
    <span className="text-slate-400">
      {technique.core.type === 'disk' ? '💿 Ядро' : '🏛️ Алтарь'}:
    </span>
    <span className="text-purple-400">{technique.core.name}</span>
  </div>
)}
```

**Оценка:** 30 минут

---

### 3.6 UI-06: MaterialIndicator

**Файл:** Изменить `BodyStatusPanel.tsx`

**Изменения:**
```tsx
// Добавить в BodyStatusPanelProps:
material?: 'organic' | 'scaled' | 'chitin' | 'ethereal' | 'mineral' | 'chaos';

// Добавить отображение материала:
{material && (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-slate-400">Материал:</span>
    <Badge variant="outline" className={MATERIAL_COLORS[material]}>
      {MATERIAL_NAMES[material]}
    </Badge>
    {MATERIAL_DAMAGE_REDUCTION[material] > 0 && (
      <span className="text-green-400">
        -{(MATERIAL_DAMAGE_REDUCTION[material] * 100).toFixed(0)}% урон
      </span>
    )}
  </div>
)}

const MATERIAL_NAMES = {
  organic: '🥩 Органика',
  scaled: '🐉 Чешуя',
  chitin: '🪲 Хитин',
  ethereal: '👻 Эфир',
  mineral: '🪨 Минерал',
  chaos: '🌀 Хаос',
};
```

**Оценка:** 30 минут

---

## 4. ПОРЯДОК РЕАЛИЗАЦИИ

### Этап 1: Критичные компоненты (2-4 часа)

1. [ ] UI-01: Интеграция FormationCoresTab в TechniquesDialog
2. [ ] UI-02: QiBufferStatus компонент
3. [ ] UI-03: LevelSuppressionIndicator компонент

### Этап 2: Важные компоненты (3-4 часа)

4. [ ] UI-04: DamageFlowDisplay компонент
5. [ ] UI-05: FormationDrainDisplay в FormationEffectsDisplay
6. [ ] UI-06: MaterialIndicator в BodyStatusPanel

### Этап 3: Улучшения (опционально, 4-6 часов)

7. [ ] UI-07: FormationVisual базовый контур
8. [ ] UI-08: UltimateEffect эффект для боевых техник

---

## 5. ИНТЕГРАЦИЯ

### 5.1 Где использовать компоненты

| Компонент | Место использования |
|-----------|---------------------|
| QiBufferStatus | GameHUD, CombatUI |
| LevelSuppressionIndicator | CombatUI, DamagePopup |
| DamageFlowDisplay | CombatUI (детальный лог) |
| FormationCoresTab | TechniquesDialog |
| MaterialIndicator | BodyStatusPanel, NPCInfo |

### 5.2 Связь с Event Bus

```tsx
// Подписка на события в CombatUI
useEffect(() => {
  const handleDamage = (e: CustomEvent) => {
    setDamageFlow(e.detail.pipeline);
    setShowDamageFlow(true);
    setTimeout(() => setShowDamageFlow(false), 3000);
  };
  
  window.addEventListener('combat:damage_flow', handleDamage as EventListener);
  return () => window.removeEventListener('combat:damage_flow', handleDamage as EventListener);
}, []);
```

---

## 6. КРИТЕРИИ ГОТОВНОСТИ

### Этап 1:
- [ ] FormationCoresTab доступен через TechniquesDialog → Формации → Ядра
- [ ] QiBufferStatus показывает корректный % Ци
- [ ] LevelSuppressionIndicator показывает иммунитет при +5 уровнях

### Этап 2:
- [ ] DamageFlowDisplay показывает все этапы pipeline
- [ ] FormationEffectsDisplay показывает утечку Ци/час
- [ ] BodyStatusPanel показывает материал и снижение урона

### Этап 3:
- [ ] Формации отображаются в игре с базовым контуром
- [ ] Ultimate-техники имеют визуальный эффект

---

## 7. ССЫЛКИ

### Зависимости (завершены):
- `checkpoint_03_22_Body_update.md` — Level Suppression, Qi Buffer
- `checkpoint_03_22_Combat.md` — Damage Pipeline, Event Bus
- `checkpoint_03_22_Generators.md` — isUltimate, material
- `checkpoint_03_22_Formations.md` — Formation Cores, drain system

### Файлы для изменения:
- `src/components/game/TechniquesDialog.tsx`
- `src/components/game/BodyStatusPanel.tsx`

### Файлы для создания:
- `src/components/game/QiBufferStatus.tsx`
- `src/components/game/LevelSuppressionIndicator.tsx`
- `src/components/game/DamageFlowDisplay.tsx`

---

*Чекпоинт создан: 2026-03-22*
*Версия: 1.0*
*Статус: 📋 Планирование*
