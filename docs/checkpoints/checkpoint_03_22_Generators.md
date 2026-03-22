# ⚙️ План: Генераторы v2.0

**Дата:** 2026-03-22
**Версия:** 2.0
**Статус:** 🔧 Требуется корректировка (по результатам аудита)

---

## 📋 Обзор

Документ описывает план обновления генераторов для поддержки:
- Level Suppression System
- Ultimate-техники
- Расширенной морфологии (arthropod)
- Новых материалов (chitin)

---

## 🔍 АУДИТ КОДА (2026-03-22)

### 1. technique-generator-v2.ts

| Поле | Статус | Проблема |
|------|--------|----------|
| `level` | ✅ Генерируется | — |
| `isUltimate` | ❌ **НЕТ** | Ultimate-техники НЕ создаются |
| `grade` | ✅ Генерируется | — |

**Проблема:** Ultimate-техники с флагом `isUltimate: true` НЕ генерируются. Это означает, что техника L8 не сможет пробить защиту L9 (25% урона вместо 10% для ultimate).

### 2. npc-generator.ts

| Поле | В SpeciesPreset | В NPC Generator | Проблема |
|------|-----------------|-----------------|----------|
| `bodyMaterial` | ✅ Есть | ❌ **НЕ используется** | Не попадает в BodyState |
| `morphology` | ✅ Есть | ❌ **НЕ используется** | Не передаётся в NPC |
| `soulType` | ✅ Есть | ❌ **НЕ используется** | Не передаётся в NPC |
| `beast_arthropod` template | ✅ В типе BodyTemplate | ❌ **НЕТ в getTemplateParts()** | Пауки получают humanoid тело! |

**Критическая проблема:**
```typescript
// npc-generator.ts:840-847
function getTemplateParts(template: BodyTemplate): string[] {
  const templates: Record<BodyTemplate, string[]> = {
    humanoid: [...],
    beast_quadruped: [...],
    beast_bird: [...],
    beast_serpentine: [...],
    spirit: [...],
    // ❌ НЕТ beast_arthropod!
  };
  return templates[template] || templates.humanoid;
}
```

### 3. BodyState в NPC Generator

```typescript
export interface BodyState {
  parts: Record<string, BodyPartState>;
  activeBleeds: string[];
  activeAttachments: string[];
  isDead: boolean;
  // ❌ НЕТ bodyMaterial!
  // ❌ НЕТ morphology!
}
```

### 4. species-presets.ts — ✅ КОРРЕКТНО

| Поле | Статус |
|------|--------|
| `bodyMaterial: BodyMaterial` | ✅ Добавлено |
| `morphology: BodyMorphology` | ✅ Добавлено |
| `soulType: SoulType` | ✅ Добавлено |
| Arthropod species (spider, centipede, scorpion) | ✅ Добавлены |
| `beast_arthropod` в BodyTemplate | ✅ Есть |

### 5. temp-npc.ts (TempNPC) — ✅ ИМЕЕТ ПОЛЯ

```typescript
// types/temp-npc.ts:196-205
export interface TempCultivation {
  level: number;           // ✅ Используется в Level Suppression
  currentQi: number;       // ✅ Используется в Qi Buffer
  coreCapacity: number;
  // ...
}
```

### 6. Event Bus Integration — ✅ РАБОТАЕТ

```typescript
// event-bus/handlers/combat.ts:690-694
const npc = getTempNPCForCombat(context.sessionId, targetId);
const npcCultivationLevel = npc?.cultivation?.level ?? 1;  // ✅
const npcCurrentQi = npc?.cultivation?.currentQi ?? 0;     // ✅
```

---

## 🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### Проблема 1: Ultimate-техники не генерируются

**Влияние:**
- L8 практик с техникой L8 наносит L9 практике только 5% урона (technique)
- Должен быть 25% для ultimate-техники

**Решение:** Добавить генерацию `isUltimate: true` для transcendent grade (5% шанс)

### Проблема 2: Arthropod NPC получают humanoid тело

**Влияние:**
- Пауки, скорпионы, многоножки имеют humanoid части тела
- `bodyMaterial: 'chitin'` не используется → нет 20% damage reduction
- Нет правильных частей тела (8 ног, хелицеры, педипальпы)

**Решение:**
1. Добавить `beast_arthropod` в `getTemplateParts()`
2. Добавить `bodyMaterial` в `BodyState`

### Проблема 3: bodyMaterial не влияет на урон NPC

**Влияние:**
- Chitin-монстры (пауки) должны иметь 20% damage reduction
- Spirit-существа должны иметь 70% damage reduction от физического урона

**Решение:** Передавать `bodyMaterial` в `processDamagePipeline()` для NPC

---

## 🔧 ПЛАН КОРРЕКТИРОВКИ

### Этап 1: technique-generator-v2.ts — P1

**Файл:** `src/lib/generator/technique-generator-v2.ts`

```typescript
// 1. Добавить в интерфейс GeneratedTechniqueV2
interface GeneratedTechniqueV2 {
  // ... existing fields
  isUltimate?: boolean;  // NEW!
}

// 2. Добавить константу шанса
const ULTIMATE_CHANCE_BY_GRADE: Record<TechniqueGrade, number> = {
  common: 0,
  refined: 0,
  perfect: 0,
  transcendent: 0.05,  // 5% от Transcendent
};

// 3. В generateTechniqueV2() после выбора grade:
if (grade === 'transcendent' && rng() < ULTIMATE_CHANCE_BY_GRADE.transcendent) {
  technique.isUltimate = true;
  technique.name = `⚡ ${technique.name}`;  // Маркер в названии
  technique.qiCost = Math.floor(technique.qiCost * 1.5);  // Повышенная стоимость
  technique.computed.finalDamage = Math.floor(technique.computed.finalDamage * 1.3);
}
```

### Этап 2: npc-generator.ts — P1

**Файл:** `src/lib/generator/npc-generator.ts`

#### 2.1 Добавить beast_arthropod в getTemplateParts()

```typescript
function getTemplateParts(template: BodyTemplate): string[] {
  const templates: Record<BodyTemplate, string[]> = {
    humanoid: ['head', 'torso', 'heart', 'left_arm', 'right_arm', 'left_hand', 'right_hand', 'left_leg', 'right_leg', 'left_foot', 'right_foot'],
    beast_quadruped: ['head', 'torso', 'heart', 'front_left_leg', 'front_right_leg', 'back_left_leg', 'back_right_leg', 'tail'],
    beast_bird: ['head', 'torso', 'heart', 'left_wing', 'right_wing', 'left_leg', 'right_leg'],
    beast_serpentine: ['head', 'torso', 'heart', 'body_segment_1', 'body_segment_2', 'tail'],
    beast_arthropod: [  // NEW!
      'cephalothorax', 'abdomen', 'heart',
      'leg_1', 'leg_2', 'leg_3', 'leg_4',  // 4 пары ног
      'pedipalps', 'chelicerae',  // Клешни и жвала
    ],
    spirit: ['core', 'essence'],
  };
  
  return templates[template] || templates.humanoid;
}
```

#### 2.2 Добавить bodyMaterial в BodyState

```typescript
export interface BodyState {
  parts: Record<string, BodyPartState>;
  activeBleeds: string[];
  activeAttachments: string[];
  isDead: boolean;
  material: BodyMaterial;      // NEW!
  morphology: BodyMorphology;  // NEW!
}
```

#### 2.3 Обновить createBodyForSpecies()

```typescript
export function createBodyForSpecies(
  species: SpeciesPreset,
  cultivationLevel: number
): BodyState {
  const sizeMultiplier = SIZE_MULTIPLIERS[species.sizeClass] || 1;
  const cultivationBonus = 1 + (cultivationLevel - 1) * 0.1;
  
  const parts: Record<string, BodyPartState> = {};
  const templateParts = getTemplateParts(species.bodyTemplate);
  
  for (const partId of templateParts) {
    const baseHP = getBaseHP(partId, species.bodyTemplate);
    const maxHP = Math.floor(baseHP * sizeMultiplier * cultivationBonus);
    
    parts[partId] = {
      functionalHP: maxHP,
      maxFunctionalHP: maxHP,
      structuralHP: maxHP * 2,
      maxStructuralHP: maxHP * 2,
      status: 'healthy',
      regenerationRate: species.capabilities.canCultivate ? 0.1 : 0.05,
    };
  }
  
  return {
    parts,
    activeBleeds: [],
    activeAttachments: [],
    isDead: false,
    material: species.bodyMaterial || 'organic',      // NEW!
    morphology: species.morphology || 'humanoid',     // NEW!
  };
}
```

### Этап 3: temp-npc-combat.ts — P2

**Файл:** `src/lib/game/skeleton/temp-npc-combat.ts`

Добавить передачу `bodyMaterial` в damage pipeline:

```typescript
// В applyDamageToTempNPC:
const materialReduction = MATERIAL_DAMAGE_REDUCTION[npc.bodyState.material] || 0;
damage = Math.max(1, damage * (1 - materialReduction));
```

---

## 📊 ПОРЯДОК РЕАЛИЗАЦИИ (ОБНОВЛЁННЫЙ)

| Этап | Файл | Задачи | Приоритет | Статус |
|------|------|--------|-----------|--------|
| 1 | `technique-generator-v2.ts` | Добавить isUltimate | P1 | 🔜 Не начато |
| 2a | `npc-generator.ts` | Добавить beast_arthropod template | P1 | 🔜 Не начато |
| 2b | `npc-generator.ts` | Добавить bodyMaterial в BodyState | P1 | 🔜 Не начато |
| 2c | `npc-generator.ts` | Обновить createBodyForSpecies() | P1 | 🔜 Не начато |
| 3 | `temp-npc-combat.ts` | Использовать bodyMaterial | P2 | 🔜 Не начато |

---

## 📈 ЗАВИСИМОСТИ

```
species-presets.ts (✅ уже готово)
        ↓
npc-generator.ts (❌ требует обновления)
        ↓
temp-npc-combat.ts (❌ требует интеграции)
        ↓
[Damage Pipeline с bodyMaterial]
```

```
technique-generator-v2.ts (❌ требует isUltimate)
        ↓
[Level Suppression с ultimate type]
```

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ

### Phase 1: Technique Generator
- [ ] `isUltimate` генерируется для transcendent (5% шанс)
- [ ] Ultimate-техники имеют повышенный qiCost (×1.5)
- [ ] Ultimate-техники имеют маркер в названии (⚡)

### Phase 2: NPC Generator
- [ ] `beast_arthropod` template добавлен
- [ ] `bodyMaterial` попадает в BodyState
- [ ] `morphology` попадает в BodyState
- [ ] Spider/Scorpion/Centipede имеют правильные части тела

### Phase 3: Combat Integration
- [ ] `bodyMaterial` используется для damage reduction
- [ ] Chitin монстры получают 20% reduction
- [ ] Spirit монстры получают 70% reduction от физ. урона

---

## 📝 СВЯЗАННЫЕ ФАЙЛЫ

### Требуют изменений:
- `src/lib/generator/technique-generator-v2.ts` — isUltimate
- `src/lib/generator/npc-generator.ts` — beast_arthropod, bodyMaterial
- `src/lib/game/skeleton/temp-npc-combat.ts` — material reduction

### Уже готовы:
- `src/data/presets/species-presets.ts` — ✅ bodyMaterial, morphology, arthropod species
- `src/types/temp-npc.ts` — ✅ cultivation.level, currentQi
- `src/lib/constants/level-suppression.ts` — ✅ AttackType, isUltimate
- `src/lib/game/event-bus/handlers/combat.ts` — ✅ Level Suppression + Qi Buffer

---

*Аудит проведён: 2026-03-22*
*Версия: 2.0*
*Статус: 🔧 Требуется корректировка (P1)*
