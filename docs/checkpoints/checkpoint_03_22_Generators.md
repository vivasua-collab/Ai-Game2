# ⚙️ План: Генераторы v2.0

**Дата:** 2026-03-22
**Версия:** 1.0
**Статус:** 📋 Планирование

---

## 📋 Обзор

Документ описывает план обновления генераторов для поддержки:
- Level Suppression System
- Ultimate-техники
- Расширенной морфологии (arthropod)
- Новых материалов (chitin)

---

## 1️⃣ ПРИНЦИП: Документация → Генераторы → Механики

**Генераторы создаются ПОСЛЕ завершения документации.**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ПОРЯДОК ОБНОВЛЕНИЯ ГЕНЕРАТОРОВ                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. technique-generator-v2.ts  — Добавить isUltimate флаг           │
│  2. npc-generator.ts           — Добавить bodyMaterial              │
│  3. species-presets.ts         — Добавить arthropod, chitin         │
│  4. body-generator.ts          — НОВЫЙ: Генерация тел по Species    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ ОБНОВЛЕНИЕ ГЕНЕРАТОРА ТЕХНИК

### 2.1 Добавить Ultimate-техники

**Файл:** `src/lib/generator/technique-generator-v2.ts`

```typescript
// Шанс генерации Ultimate
const ULTIMATE_CHANCE = {
  common: 0,
  refined: 0,
  perfect: 0,
  transcendent: 0.05,  // 5% от Transcendent
};

// Добавить в интерфейс
interface GeneratedTechnique {
  // ... existing fields
  isUltimate?: boolean;  // NEW!
}

// В функции генерации
if (grade === 'transcendent' && Math.random() < ULTIMATE_CHANCE.transcendent) {
  technique.isUltimate = true;
  technique.name = `⚡ ${technique.name}`;  // Маркер в названии
  technique.qiCost *= 1.5;  // Повышенная стоимость
}
```

### 2.2 Добавить technique.level

**Уже реализовано?** Проверить существующую реализацию.

```typescript
interface Technique {
  level: number;  // Уровень техники (1-9)
  // ...
}
```

---

## 3️⃣ ОБНОВЛЕНИЕ ГЕНЕРАТОРА NPC

### 3.1 Добавить bodyMaterial

**Файл:** `src/lib/generator/npc-generator.ts`

```typescript
// В функции генерации NPC
function getBodyMaterial(species: string): BodyMaterial {
  const materialMap: Record<string, BodyMaterial> = {
    // Organic (по умолчанию)
    human: 'organic',
    elf: 'organic',
    demon: 'organic',
    wolf: 'organic',
    tiger: 'organic',
    
    // Scaled
    dragon: 'scaled',
    snake: 'scaled',
    
    // Chitin
    spider: 'chitin',
    centipede: 'chitin',
    scorpion: 'chitin',
    
    // Ethereal
    ghost: 'ethereal',
    elemental: 'ethereal',
    
    // Mineral
    golem: 'mineral',
    
    // Chaos
    chaos_spawn: 'chaos',
  };
  
  return materialMap[species] ?? 'organic';
}
```

### 3.2 Добавить морфологию

```typescript
function getMorphology(species: string): BodyMorphology {
  const morphologyMap: Record<string, BodyMorphology> = {
    // Humanoid
    human: 'humanoid',
    elf: 'humanoid',
    demon: 'humanoid',
    giant: 'humanoid',
    beastkin: 'humanoid',
    
    // Quadruped
    wolf: 'quadruped',
    tiger: 'quadruped',
    bear: 'quadruped',
    dragon: 'quadruped',
    
    // Bird
    eagle: 'bird',
    phoenix: 'bird',
    
    // Serpentine
    snake: 'serpentine',
    lamia: 'serpentine',
    
    // Arthropod (NEW!)
    spider: 'arthropod',
    centipede: 'arthropod',
    scorpion: 'arthropod',
    
    // Amorphous
    ghost: 'amorphous',
    elemental: 'amorphous',
  };
  
  return morphologyMap[species] ?? 'humanoid';
}
```

---

## 4️⃣ НОВЫЙ ГЕНЕРАТОР: body-generator.ts

### 4.1 Назначение

Генерация структуры тела на основе Species и Morphology.

```typescript
// src/lib/generator/body-generator.ts

interface BodyGenerationParams {
  species: string;
  morphology: BodyMorphology;
  material: BodyMaterial;
  sizeClass: SizeClass;
  cultivationLevel: number;
  vitality: number;
}

export function generateBody(params: BodyGenerationParams): BodyStructure {
  const { morphology, sizeClass, cultivationLevel, vitality } = params;
  
  // 1. Выбор шаблона
  const template = BODY_TEMPLATES[morphology];
  
  // 2. Масштабирование по размеру
  const sizeMult = SIZE_MULTIPLIERS[sizeClass];
  
  // 3. Расчёт HP
  const parts = generateParts(template, {
    sizeMultiplier: sizeMult,
    vitalityMultiplier: 1 + (vitality - 10) * 0.05,
    cultivationBonus: 1 + (cultivationLevel - 1) * 0.1,
  });
  
  return {
    morphology,
    material: params.material,
    parts,
    sizeClass,
  };
}
```

### 4.2 Шаблоны тела

```typescript
const BODY_TEMPLATES: Record<BodyMorphology, BodyTemplate> = {
  humanoid: {
    parts: [
      { id: 'head', baseHP: 50, functions: ['sensory', 'breathing'] },
      { id: 'torso', baseHP: 100, functions: ['circulation', 'digestion'] },
      { id: 'heart', baseHP: 80, functions: ['vital'], heartOnly: true },
      { id: 'left_arm', baseHP: 40, functions: ['manipulation', 'attack'] },
      { id: 'right_arm', baseHP: 40, functions: ['manipulation', 'attack'] },
      // ... остальные части
    ],
    hierarchy: {
      torso: ['left_arm', 'right_arm', 'left_leg', 'right_leg'],
      head: ['left_eye', 'right_eye'],
    },
  },
  
  arthropod: {
    parts: [
      { id: 'cephalothorax', baseHP: 30, functions: ['sensory', 'nerve'] },
      { id: 'abdomen', baseHP: 50, functions: ['organs', 'silk'] },
      { id: 'heart', baseHP: 24, functions: ['vital'], heartOnly: true },
      { id: 'leg_1', baseHP: 8, functions: ['movement'], count: 2 },
      { id: 'leg_2', baseHP: 8, functions: ['movement'], count: 2 },
      { id: 'leg_3', baseHP: 8, functions: ['movement'], count: 2 },
      { id: 'leg_4', baseHP: 8, functions: ['movement'], count: 2 },
      { id: 'pedipalps', baseHP: 6, functions: ['manipulation', 'attack'] },
      { id: 'chelicerae', baseHP: 10, functions: ['attack', 'venom'] },
    ],
  },
  
  // ... другие шаблоны
};
```

---

## 5️⃣ ОБНОВЛЕНИЕ species-presets.ts

### 5.1 Добавить членистоногих

**Файл:** `src/data/presets/species-presets.ts`

```typescript
// Добавить новые виды
const ARTHROPOD_SPECIES = {
  spider: {
    soulType: 'creature',
    morphology: 'arthropod',
    material: 'chitin',
    sizeClass: 'small',
    maxCultivationLevel: 3,
    innateTechniques: ['web_trap', 'venom_bite'],
    stats: { str: 5, agi: 15, int: 3, vit: 8 },
  },
  
  centipede: {
    soulType: 'creature',
    morphology: 'arthropod',
    material: 'chitin',
    sizeClass: 'small',
    maxCultivationLevel: 3,
    innateTechniques: ['poison_spray', 'constrict'],
    stats: { str: 8, agi: 12, int: 2, vit: 10 },
  },
  
  scorpion: {
    soulType: 'creature',
    morphology: 'arthropod',
    material: 'chitin',
    sizeClass: 'small',
    maxCultivationLevel: 4,
    innateTechniques: ['sting', 'pincer_crush'],
    stats: { str: 10, agi: 10, int: 3, vit: 12 },
  },
};
```

---

## 6️⃣ ПОРЯДОК РЕАЛИЗАЦИИ

| Этап | Файл | Задачи | Приоритет |
|------|------|--------|-----------|
| 1 | `technique-generator-v2.ts` | Добавить isUltimate | P1 |
| 2 | `npc-generator.ts` | Добавить material, morphology | P1 |
| 3 | `species-presets.ts` | Добавить arthropod species | P1 |
| 4 | `body-generator.ts` | Создать новый генератор | P2 |

---

## 7️⃣ ЗАВИСИМОСТИ

```
species-presets.ts (обновление данных)
        ↓
npc-generator.ts (использует presets)
        ↓
body-generator.ts (генерирует структуру)
        ↓
[Механики тела]
```

---

## 8️⃣ КРИТЕРИИ ГОТОВНОСТИ

- [ ] Ultimate-техники генерируются (5% Transcendent)
- [ ] NPC получают правильный bodyMaterial
- [ ] NPC получают правильную morphology
- [ ] Arthropod species добавлены в пресеты
- [ ] Body generator создаёт корректную структуру
- [ ] Unit тесты проходят

---

*План создан: 2026-03-22*
*Версия: 1.0*
*Статус: 📋 Планирование — запуск после завершения механик*
