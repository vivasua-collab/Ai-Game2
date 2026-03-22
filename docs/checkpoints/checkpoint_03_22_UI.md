# 🎨 План: UI компоненты v2.1

**Дата:** 2026-03-22 16:00 UTC
**Версия:** 2.1
**Статус:** 🔨 Аудит завершён, план внедрения готов
**Зависимости:** ✅ Body_update, ✅ Combat, ✅ Generators, ✅ Formations, ✅ Generator_Migration

---

## 📋 Результаты аудита

### Архитектура UI

```
┌─────────────────────────────────────────────────────────────────────┐
│                    АРХИТЕКТУРА UI                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Zustand Store (game.store.ts)                                       │
│  ├── useGameCharacter() → currentQi, maxQi                          │
│  ├── useGameTechniques() → techniques[]                             │
│  └── useGameInventory() → inventory[]                               │
│                                                                      │
│  React Components                                                    │
│  ├── TechniquesDialog.tsx (техники, формации, слоты)                │
│  ├── BodyStatusPanel.tsx (тело, HP, кровотечения)                  │
│  └── FormationCoresTab.tsx ✅ (ядра - готов)                        │
│                                                                      │
│  Phaser Bridge                                                       │
│  ├── Global Variables (React → Phaser)                              │
│  │   └── globalCharacter, globalTechniques, etc.                    │
│  └── EventBusClient (Phaser → Server)                               │
│      └── useTechnique(), reportDamageDealt(), move()                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Уже существует

| Компонент | Файл | Готовность |
|-----------|------|------------|
| FormationCoresTab | `src/components/formation/FormationCoresTab.tsx` | ✅ 100% |
| BodyStatusPanel | `src/components/game/BodyStatusPanel.tsx` | ✅ 100% |
| TechniquesDialog | `src/components/game/TechniquesDialog.tsx` | ✅ 100% |
| EventBusClient | `src/lib/game/event-bus/client.ts` | ✅ 100% |

### Отсутствует

| Компонент | Назначение |
|-----------|------------|
| QiBufferStatus | Индикатор Qi Buffer 90% |
| LevelSuppressionIndicator | Индикатор подавления уровнем |
| DamageFlowDisplay | Визуализация pipeline урона |
| MaterialIndicator | Материал тела в BodyStatusPanel |

---

## 1️⃣ ЭТАП 1: Критичные компоненты (2-4 часа)

### 1.1 UI-01: Интеграция FormationCoresTab ✅ Компонент готов!

**Файл:** `src/components/game/TechniquesDialog.tsx`

**Изменения:**

```tsx
// Добавить импорт
import { FormationCoresTab } from '@/components/formation/FormationCoresTab';

// В TabsContent value="formations" заменить на под-вкладки:
<TabsContent value="formations" className="mt-4 space-y-4">
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
</TabsContent>
```

**Оценка:** 30 минут

---

### 1.2 UI-02: QiBufferStatus

**Файл:** `src/components/game/QiBufferStatus.tsx` (новый)

**Спецификация:**

```tsx
'use client';

import { Progress } from '@/components/ui/progress';
import { useGameCharacter } from '@/stores/game.store';

export function QiBufferStatus() {
  const character = useGameCharacter();
  
  if (!character) return null;
  
  const { currentQi, maxQi } = character;
  const bufferQi = currentQi * 0.9;  // 90% для защиты
  const qiPercent = maxQi > 0 ? (bufferQi / maxQi) * 100 : 0;
  
  return (
    <div className="bg-slate-700/50 rounded-lg p-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-cyan-400">🛡️ Qi Buffer</span>
        <span className="text-slate-400">90% absorption</span>
      </div>
      <Progress value={qiPercent} className="h-2" />
      <div className="text-xs text-slate-500 mt-1">
        {Math.floor(bufferQi).toLocaleString()} / {maxQi.toLocaleString()} Ци
      </div>
    </div>
  );
}
```

**Интеграция:** Добавить в `StatusDialog.tsx` или HUD

**Оценка:** 1-2 часа

---

### 1.3 UI-03: LevelSuppressionIndicator

**Файл:** `src/components/game/LevelSuppressionIndicator.tsx` (новый)

**Спецификация:**

```tsx
'use client';

import { calculateLevelSuppression } from '@/lib/constants/level-suppression';

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
    attackerLevel, defenderLevel, attackType, techniqueLevel
  );
  
  // Цвет по силе подавления
  const getColor = () => {
    if (multiplier === 0) return 'text-red-400';
    if (multiplier < 0.5) return 'text-orange-400';
    if (multiplier < 1) return 'text-yellow-400';
    return 'text-green-400';
  };
  
  const getDescription = () => {
    if (multiplier === 0) return '🛡️ Иммунитет!';
    if (levelDiff >= 5) return 'Подавление уровнем';
    if (levelDiff <= -5) return 'Превосходство';
    return '';
  };
  
  if (multiplier === 1) return null;
  
  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-bold ${getColor()}`}>
        {multiplier === 0 ? '🛡️' : `×${Math.round(multiplier * 100)}%`}
      </span>
      <span className="text-xs text-slate-500">{getDescription()}</span>
    </div>
  );
}
```

**Интеграция:** Combat overlay или damage popup

**Оценка:** 1-2 часа

---

## 2️⃣ ЭТАП 2: Важные компоненты (3-4 часа)

### 2.1 UI-04: DamageFlowDisplay

**Файл:** `src/components/game/DamageFlowDisplay.tsx` (новый)

**Спецификация:**

```tsx
'use client';

import { useState, useEffect } from 'react';

interface DamageFlowStage {
  originalDamage: number;
  levelSuppression?: number;
  afterSuppression: number;
  qiBuffer?: { absorbed: number; pierced: number };
  materialReduction?: number;
  armorReduction?: number;
  finalDamage: number;
}

export function DamageFlowDisplay() {
  const [stages, setStages] = useState<DamageFlowStage | null>(null);
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const handleDamage = (e: CustomEvent) => {
      setStages(e.detail.pipeline);
      setVisible(true);
      setTimeout(() => setVisible(false), 3000);
    };
    
    window.addEventListener('combat:damage_flow', handleDamage as EventListener);
    return () => window.removeEventListener('combat:damage_flow', handleDamage as EventListener);
  }, []);
  
  if (!visible || !stages) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-slate-800/90 rounded-lg p-3 space-y-1 text-xs z-50 animate-fade-in">
      <div className="flex justify-between">
        <span>Исходный урон:</span>
        <span className="text-red-400">{stages.originalDamage}</span>
      </div>
      
      {stages.levelSuppression !== undefined && stages.levelSuppression !== 1 && (
        <div className="flex justify-between text-orange-400">
          <span>Подавление:</span>
          <span>×{Math.round(stages.levelSuppression * 100)}%</span>
        </div>
      )}
      
      {stages.qiBuffer && (
        <div className="flex justify-between text-cyan-400">
          <span>Qi Buffer:</span>
          <span>-{stages.qiBuffer.absorbed} (+{stages.qiBuffer.pierced})</span>
        </div>
      )}
      
      {stages.materialReduction && stages.materialReduction > 0 && (
        <div className="flex justify-between text-amber-400">
          <span>Материал:</span>
          <span>-{Math.round(stages.materialReduction * 100)}%</span>
        </div>
      )}
      
      <div className="flex justify-between pt-1 border-t border-slate-600 font-bold">
        <span>Итог:</span>
        <span className="text-red-400">{stages.finalDamage}</span>
      </div>
    </div>
  );
}
```

**Интеграция:** Добавить в `GameContainer.tsx` или overlay

**Оценка:** 2-3 часа

---

### 2.2 UI-05: FormationDrainDisplay

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
      <span className="text-slate-400">⏱️ До истощения:</span>
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

### 2.3 UI-06: MaterialIndicator

**Файл:** Изменить `src/components/game/BodyStatusPanel.tsx`

**Изменения:**

```tsx
// Добавить в BodyStatusPanelProps:
interface BodyStatusPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bodyState?: BodyStructure | null;
  material?: BodyMaterial;  // NEW
}

// Добавить константы:
const MATERIAL_NAMES: Record<BodyMaterial, string> = {
  organic: '🥩 Органика',
  scaled: '🐉 Чешуя',
  chitin: '🪲 Хитин',
  ethereal: '👻 Эфир',
  mineral: '🪨 Минерал',
  chaos: '🌀 Хаос',
};

const MATERIAL_COLORS: Record<BodyMaterial, string> = {
  organic: 'text-red-400 border-red-400',
  scaled: 'text-green-400 border-green-400',
  chitin: 'text-amber-400 border-amber-400',
  ethereal: 'text-purple-400 border-purple-400',
  mineral: 'text-slate-400 border-slate-400',
  chaos: 'text-pink-400 border-pink-400',
};

const MATERIAL_DAMAGE_REDUCTION: Record<BodyMaterial, number> = {
  organic: 0, scaled: 0.1, chitin: 0.2, 
  ethereal: 0.7, mineral: 0.5, chaos: 0.3,
};

// Добавить отображение в начале панели:
{material && (
  <div className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
    <span className="text-sm text-slate-400">Материал тела:</span>
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={MATERIAL_COLORS[material]}>
        {MATERIAL_NAMES[material]}
      </Badge>
      {MATERIAL_DAMAGE_REDUCTION[material] > 0 && (
        <span className="text-xs text-green-400">
          -{Math.round(MATERIAL_DAMAGE_REDUCTION[material] * 100)}% урон
        </span>
      )}
    </div>
  </div>
)}
```

**Оценка:** 30 минут

---

## 3️⃣ ЭТАП 3: Улучшения (опционально)

### 3.1 FormationVisual

**Файл:** `src/game/formation/FormationVisual.ts`

Базовая визуализация формации в Phaser сцене.

**Оценка:** 4-6 часов

---

## 📊 Итоговый план

| Этап | Задача | Приоритет | Оценка |
|------|--------|-----------|--------|
| 1.1 | FormationCoresTab интеграция | P1 | 30 мин |
| 1.2 | QiBufferStatus | P1 | 1-2 ч |
| 1.3 | LevelSuppressionIndicator | P1 | 1-2 ч |
| 2.1 | DamageFlowDisplay | P2 | 2-3 ч |
| 2.2 | FormationDrainDisplay | P2 | 30 мин |
| 2.3 | MaterialIndicator | P2 | 30 мин |
| 3.1 | FormationVisual | P3 | 4-6 ч |
| **Итого** | | | **9-14 часов** |

---

## 📁 Файлы для изменения

| Файл | Изменения |
|------|-----------|
| `src/components/game/TechniquesDialog.tsx` | Добавить FormationCoresTab |
| `src/components/game/BodyStatusPanel.tsx` | Добавить MaterialIndicator |
| `src/components/game/StatusDialog.tsx` | Добавить QiBufferStatus |

## 📁 Файлы для создания

| Файл | Назначение |
|------|------------|
| `src/components/game/QiBufferStatus.tsx` | Индикатор Qi Buffer |
| `src/components/game/LevelSuppressionIndicator.tsx` | Индикатор подавления |
| `src/components/game/DamageFlowDisplay.tsx` | Визуализация pipeline |

---

## 🔗 Связанные документы

- `docs/checkpoints/checkpoint_03_22_UI_Audit.md` — Детальный аудит UI
- `docs/checkpoints/checkpoint_03_22_Body_update.md` — Level Suppression, Qi Buffer
- `docs/checkpoints/checkpoint_03_22_Combat.md` — Damage Pipeline, Event Bus
- `docs/checkpoints/checkpoint_03_22_Generator_Migration.md` — V1→V2 миграция

---

*Чекпоинт обновлён: 2026-03-22 16:00 UTC*
*Версия: 2.1*
*Статус: 🔨 Аудит завершён, план внедрения готов*
