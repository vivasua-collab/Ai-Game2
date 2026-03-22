# 🎨 Аудит UI окружения

**Дата:** 2026-03-22 16:00 UTC
**Версия:** 1.0

---

## 📊 Архитектура UI

### Компоненты и их ответственность

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ИЕРАРХИЯ UI КОМПОНЕНТОВ                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  GameContainer.tsx                                                   │
│  └── PhaserGame.tsx                                                  │
│      ├── Phaser Scene (LocationScene, WorldScene)                   │
│      │   └── globalVariables (React ↔ Phaser bridge)               │
│      └── EventBusClient (Phaser → Server)                           │
│                                                                      │
│  TechniquesDialog.tsx                                                │
│  ├── TabsList: Культивация | Формации | Бой                         │
│  ├── CultivationTab (слот культивации)                              │
│  ├── FormationsTab (формации)                                       │
│  │   └── [НУЖНО: FormationCoresTab]                                 │
│  └── CombatTab (боевые слоты)                                       │
│                                                                      │
│  BodyStatusPanel.tsx                                                 │
│  ├── HeartPanel (сердце)                                            │
│  ├── BleedingPanel (кровотечения)                                   │
│  ├── AttachmentPanel (приживления)                                  │
│  ├── BodyPartCard (части тела)                                      │
│  └── [НУЖНО: MaterialIndicator]                                     │
│                                                                      │
│  FormationCoresTab.tsx ✅ УЖЕ СУЩЕСТВУЕТ                             │
│  ├── Список ядер                                                    │
│  └── Генерация новых ядер                                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Архитектура передачи данных

### React ↔ Phaser Bridge

```typescript
// В PhaserGame.tsx
// Глобальные переменные для синхронизации
let globalSessionId: string | null = null;
let globalCharacter: Character | null = null;
let globalTechniques: CharacterTechnique[] = [];
let globalCurrentQi: number = 0;  // ✅ Есть доступ к Qi

// useEffect синхронизирует React state с Phaser
useEffect(() => {
  globalCharacter = character;
}, [character]);
```

### Event Bus Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EVENT BUS ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Phaser Scene                                                        │
│       │                                                              │
│       │ eventBusClient.useTechnique(techniqueId)                     │
│       ▼                                                              │
│  EventBusClient.sendEvent()                                          │
│       │                                                              │
│       │ POST /api/game/event                                         │
│       ▼                                                              │
│  Event Bus Server                                                    │
│       │                                                              │
│       ├── TruthSystem.updateQi()                                     │
│       ├── LevelSuppression.calculate()                               │
│       ├── QiBuffer.process()                                         │
│       └── MaterialReduction.apply()                                  │
│       │                                                              │
│       ▼                                                              │
│  Response: { canUse, damageMultiplier, currentQi, ... }             │
│       │                                                              │
│       ▼                                                              │
│  Phaser Scene (обновление)                                           │
│       └── globalCharacter.currentQi = response.currentQi            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Visual Commands (Server → Phaser)

```typescript
// В PhaserEventEmitter.ts
export function executeVisualCommand(scene: Phaser.Scene, command: VisualCommand): void {
  switch (command.type) {
    case 'visual:show_damage':
      showDamageInScene(scene, data);
      break;
    case 'visual:show_effect':
      showEffectInScene(scene, data);
      break;
    case 'visual:show_beam':
      showBeamInScene(scene, data);
      break;
    case 'visual:show_aoe':
      showAoeInScene(scene, data);
      break;
    case 'camera:shake':
      scene.cameras.main.shake(duration, intensity);
      break;
  }
}
```

---

## 📁 Карта существующих компонентов

### Игровые компоненты (`src/components/game/`)

| Файл | Назначение | Статус |
|------|------------|--------|
| `GameContainer.tsx` | React wrapper для Phaser | ✅ Работает |
| `PhaserGame.tsx` | Phaser game component | ✅ Работает |
| `TechniquesDialog.tsx` | Техники, формации, слоты | ✅ Работает |
| `BodyStatusPanel.tsx` | Состояние тела | ✅ Работает |
| `BodyDoll.tsx` | Визуальное отображение тела | ✅ Работает |
| `InventoryPanel.tsx` | Инвентарь | ✅ Работает |
| `NPCViewerDialog.tsx` | Просмотр NPC | ✅ Работает |
| `StatusDialog.tsx` | Статус персонажа | ✅ Работает |
| `ActionButtons.tsx` | Кнопки действий | ✅ Работает |
| `LogsPanel.tsx` | Логи | ✅ Работает |

### Формации (`src/components/formation/`)

| Файл | Назначение | Статус |
|------|------------|--------|
| `FormationCoresTab.tsx` | Управление ядрами | ✅ Готов к интеграции |

### UI компоненты (`src/components/ui/`)

Полный набор shadcn/ui компонентов:
- Button, Badge, Card, Dialog, Tabs, Progress, ScrollArea, etc.

---

## ❌ Отсутствующие компоненты (из чекпоинта)

| ID | Компонент | Файл | Описание |
|----|-----------|------|----------|
| UI-01 | Интеграция FormationCoresTab | TechniquesDialog.tsx | Добавить под-вкладку "Ядра" |
| UI-02 | QiBufferStatus | QiBufferStatus.tsx | Индикатор Qi Buffer 90% |
| UI-03 | LevelSuppressionIndicator | LevelSuppressionIndicator.tsx | Индикатор подавления |
| UI-04 | DamageFlowDisplay | DamageFlowDisplay.tsx | Визуализация pipeline |
| UI-05 | FormationDrainDisplay | FormationEffectsDisplay | Утечка Ци/час |
| UI-06 | MaterialIndicator | BodyStatusPanel.tsx | Материал тела |

---

## 📊 Состояние Zustand Store

### Доступные данные

```typescript
// В game.store.ts
interface GameState {
  // Персонаж
  character: {
    id: string;
    name: string;
    cultivationLevel: number;
    currentQi: number;        // ✅ Для QiBufferStatus
    maxQi: number;            // ✅ Для QiBufferStatus
    health: number;
    fatigue: number;
    mentalFatigue: number;
    // ...
  } | null;
  
  // Техники
  techniques: CharacterTechnique[];
  
  // Инвентарь
  inventory: InventoryItem[];
  
  // Сообщения
  messages: Message[];
}
```

### Hooks для доступа

```typescript
export const useGameCharacter = () => useGameStore(s => s.character);
export const useGameTechniques = () => useGameStore(s => s.techniques);
export const useGameInventory = () => useGameStore(s => s.inventory);
export const useGameActions = () => useGameStore(useShallow(state => ({
  loadTechniques: state.loadTechniques,
  loadState: state.loadState,
  // ...
})));
```

---

## 🔌 Интеграция новых компонентов

### UI-01: FormationCoresTab в TechniquesDialog

**Текущее состояние:**
- `FormationCoresTab.tsx` уже создан
- `TechniquesDialog.tsx` имеет вкладку "Формации"

**Изменения:**

```tsx
// В TechniquesDialog.tsx, вкладка "formations"
<TabsContent value="formations" className="mt-4 space-y-4">
  {/* Под-вкладки */}
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

### UI-02: QiBufferStatus

**Источник данных:**
```typescript
const character = useGameCharacter();
// character.currentQi, character.maxQi
```

**Место размещения:**
- `StatusDialog.tsx` - панель статуса персонажа
- Или новый компонент в HUD

**Логика:**
```typescript
const bufferQi = currentQi * 0.9;  // 90% доступно для защиты
const qiPercent = (bufferQi / maxQi) * 100;
```

### UI-03: LevelSuppressionIndicator

**Источник данных:**
- Event Bus response содержит `levelSuppression`
- Или рассчитывается через `calculateLevelSuppression(attackerLevel, defenderLevel, attackType)`

**Место размещения:**
- Damage popup в Phaser
- Combat UI overlay

### UI-04: DamageFlowDisplay

**Подписка на события:**
```typescript
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

### UI-06: MaterialIndicator

**Изменения в BodyStatusPanel.tsx:**

```tsx
interface BodyStatusPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bodyState?: BodyStructure | null;
  material?: BodyMaterial;  // NEW
}

const MATERIAL_NAMES: Record<BodyMaterial, string> = {
  organic: '🥩 Органика',
  scaled: '🐉 Чешуя',
  chitin: '🪲 Хитин',
  ethereal: '👻 Эфир',
  mineral: '🪨 Минерал',
  chaos: '🌀 Хаос',
};

const MATERIAL_DAMAGE_REDUCTION: Record<BodyMaterial, number> = {
  organic: 0, scaled: 0.1, chitin: 0.2, 
  ethereal: 0.7, mineral: 0.5, chaos: 0.3,
};
```

---

## 🎮 Phaser Integration Points

### Где добавлять визуализацию

1. **Qi Buffer:**
   - В `PhaserGame.tsx` добавить Qi aura visual
   - Использовать `globalCharacter.currentQi`

2. **Level Suppression:**
   - В combat handler добавить текст множителя
   - Из response: `damageMultiplier`

3. **Damage Flow:**
   - Создать overlay в Phaser сцене
   - Показывать этапы pipeline

### Event Bus Events

| Event | Когда | Данные |
|-------|-------|--------|
| `technique:use` | Использование техники | techniqueId, position |
| `combat:damage_dealt` | Нанесение урона | targetId, damage, element |
| `combat:damage_received` | Получение урона | sourceId, damage |
| `player:move` | Движение | tilesMoved |

---

## 📋 План интеграции

### Приоритет 1 (Критично)

1. **UI-01: FormationCoresTab интеграция**
   - Файл: `TechniquesDialog.tsx`
   - Оценка: 30 мин
   - Готовность: 100% (компонент существует)

2. **UI-02: QiBufferStatus**
   - Файл: `src/components/game/QiBufferStatus.tsx`
   - Оценка: 1-2 часа
   - Данные: character.currentQi, maxQi из store

### Приоритет 2 (Важно)

3. **UI-03: LevelSuppressionIndicator**
   - Файл: `src/components/game/LevelSuppressionIndicator.tsx`
   - Оценка: 1-2 часа
   - Интеграция: Event Bus response

4. **UI-06: MaterialIndicator**
   - Файл: `BodyStatusPanel.tsx`
   - Оценка: 30 мин
   - Добавить prop material

### Приоритет 3 (Улучшения)

5. **UI-04: DamageFlowDisplay**
   - Файл: `src/components/game/DamageFlowDisplay.tsx`
   - Оценка: 2-3 часа
   - Подписка: window events

6. **UI-05: FormationDrainDisplay**
   - Файл: `FormationEffectsDisplay` в TechniquesDialog
   - Оценка: 30 мин

---

## 📝 Рекомендации

### Не ломать существующее

1. **Не изменять глобальные переменные** в PhaserGame.tsx без необходимости
2. **Сохранять обратную совместимость** при добавлении props
3. **Использовать опциональные параметры** для новых фич

### Следовать стилю

1. Использовать существующие shadcn/ui компоненты
2. Сохранять цветовую схему (slate-700, amber-400, cyan-400)
3. Добавлять Badge для статусов
4. Использовать ScrollArea для длинных списков

### Архитектура данных

1. **Server = Single Source of Truth**
2. Store только отображает данные от сервера
3. Event Bus для всех игровых действий
4. Global variables для React ↔ Phaser bridge

---

*Аудит проведён: 2026-03-22 16:00 UTC*
