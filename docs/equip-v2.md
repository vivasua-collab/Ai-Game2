# ⚔️ Унифицированная система экипировки v2.0

**Версия:** 2.0
**Создано:** 2026-03-14
**Статус:** 📋 Теоретические изыскания
**Основано на:** `weapon-armor-system.md` (разделы 12-16)

---

## 📋 Обзор

Документ описывает **унифицированную систему экипировки** с архитектурой "Базовый класс + Грейд" для ВСЕХ типов снаряжения.

### Принцип разделения

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   АРХИТЕКТУРА ЭКИПИРОВКИ v2.0                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   БАЗОВЫЙ КЛАСС (Base Class) — НЕИЗМЕНЕН                                 │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ • Тип экипировки (weapon, armor, jewelry, charger, tool, ...)  │   │
│   │ • Уровень предмета (1-9)                                        │   │
│   │ • Материал (определяет базовые параметры)                      │   │
│   │ • Требования (сила, ловкость, уровень культивации)             │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              +                                            │
│   ГРЕЙД (Grade Overlay) — ИЗМЕНЯЕМ                                        │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ • Качество: Damaged → Common → Refined → Perfect → Transcendent │   │
│   │ • Множители параметров (×0.5 ... ×4.0)                          │   │
│   │ • Дополнительные характеристики                                 │   │
│   │ • Специальные эффекты / Даруемые техники                        │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              =                                            │
│   ИТОГОВЫЙ ПРЕДМЕТ                                                       │
│   Эффективность = BaseStats × GradeMultiplier                            │
│   Прочность = MaterialBase × GradeMultiplier                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 0️⃣ ТИПЫ ЭКИПИРОВКИ

### 0.1 Категории

```typescript
type EquipmentCategory = 
  | 'weapon'      // Оружие
  | 'armor'       // Броня
  | 'jewelry'     // Украшения
  | 'charger'     // Зарядники Ци
  | 'tool'        // Инструменты
  | 'consumable'  // Расходники
  | 'artifact'    // Артефакты
  | 'implant';    // Импланты
```

### 0.2 Применимость системы Грейдов

| Категория | Грейды | Особенности |
|-----------|--------|-------------|
| **Weapon** | ✅ Да | Урон, пробитие, скорость атаки |
| **Armor** | ✅ Да | Защита, сопротивления, штрафы |
| **Jewelry** | ✅ Да | Проводимость Ци, бонусы к статам |
| **Charger** | ✅ Да | Проводимость, ёмкость, слоты |
| **Tool** | ⚠️ Частично | Только durability, нет бонусов |
| **Consumable** | ❌ Нет | Не имеет грейда |
| **Artifact** | ✅ Да | Мощность эффектов |
| **Implant** | ✅ Да | Эффективность, совместимость |

---

## 1️⃣ СИСТЕМА ГРЕЙДОВ

### 1.1 Уровни качества

```typescript
type EquipmentGrade = 
  | 'damaged'      // Повреждённый (ниже базового)
  | 'common'       // Обычный (базовый)
  | 'refined'      // Улучшенный
  | 'perfect'      // Совершенный
  | 'transcendent'; // Превосходящий

interface GradeProperties {
  name: string;
  color: string;
  durabilityMultiplier: number;
  bonusStatsMin: number;
  bonusStatsMax: number;
  specialEffectChance: number;
  grantedTechniqueChance: number;
  upgradeCost: number;
  downgradeChance: number;
}

const GRADE_PROPERTIES: Record<EquipmentGrade, GradeProperties> = {
  damaged: {
    name: 'Повреждённый',
    color: 'text-red-400',
    durabilityMultiplier: 0.5,
    bonusStatsMin: 0,
    bonusStatsMax: 0,
    specialEffectChance: 0,
    grantedTechniqueChance: 0,
    upgradeCost: 0,
    downgradeChance: 0,
  },
  common: {
    name: 'Обычный',
    color: 'text-gray-400',
    durabilityMultiplier: 1.0,
    bonusStatsMin: 0,
    bonusStatsMax: 1,
    specialEffectChance: 0,
    grantedTechniqueChance: 0,
    upgradeCost: 50,
    downgradeChance: 0,
  },
  refined: {
    name: 'Улучшенный',
    color: 'text-green-400',
    durabilityMultiplier: 1.5,
    bonusStatsMin: 1,
    bonusStatsMax: 2,
    specialEffectChance: 20,
    grantedTechniqueChance: 0,
    upgradeCost: 200,
    downgradeChance: 0.25,
  },
  perfect: {
    name: 'Совершенный',
    color: 'text-blue-400',
    durabilityMultiplier: 2.5,
    bonusStatsMin: 2,
    bonusStatsMax: 4,
    specialEffectChance: 50,
    grantedTechniqueChance: 10,
    upgradeCost: 1000,
    downgradeChance: 0.30,
  },
  transcendent: {
    name: 'Превосходящий',
    color: 'text-amber-400',
    durabilityMultiplier: 4.0,
    bonusStatsMin: 4,
    bonusStatsMax: 6,
    specialEffectChance: 80,
    grantedTechniqueChance: 30,
    upgradeCost: 5000,
    downgradeChance: 0.40,
  },
};
```

### 1.2 Универсальная структура Грейд-надстройки

```typescript
/**
 * Универсальная надстройка грейда для любого типа экипировки
 */
interface GradeOverlay {
  grade: EquipmentGrade;
  
  // Множители
  durabilityMultiplier: number;
  effectivenessMultiplier: number;  // Применяется к основному параметру типа
  
  // Дополнительные характеристики
  bonusStats: EquipmentBonus[];
  
  // Специальные эффекты
  specialEffects: SpecialEffect[];
  
  // Даруемые техники (для high-grade)
  grantedTechniques?: GrantedTechnique[];
  
  // История изменений
  gradeHistory: GradeChangeEvent[];
}

interface GradeChangeEvent {
  fromGrade: EquipmentGrade;
  toGrade: EquipmentGrade;
  reason: 'upgrade' | 'downgrade_repair' | 'downgrade_combat' | 'restoration';
  timestamp: number;
}
```

---

## 2️⃣ МАТЕРИАЛЫ

### 2.1 Универсальная система материалов

```typescript
interface MaterialBaseStats {
  name: string;
  tier: number;              // Уровень материала (1-5)
  
  // Прочность
  baseDurability: number;
  
  // Вес
  weightMultiplier: number;
  
  // Проводимость Ци (влияет на все типы)
  qiConductivity: number;
  
  // Специфичные параметры по типам экипировки
  weapon?: {
    baseDamage: number;
    basePenetration: number;
  };
  armor?: {
    baseDefense: number;
    baseResistances: Partial<Record<Element, number>>;
  };
  jewelry?: {
    qiBonusMultiplier: number;
    statBonusMultiplier: number;
  };
  charger?: {
    baseConductivity: number;    // Проводимость зарядника
    maxBufferSize: number;       // Макс. буфер
    heatResistance: number;      // Термостойкость
  };
}
```

### 2.2 Материалы по тирателям

| Тир | Материалы | Прочность | Особенности |
|-----|-----------|-----------|-------------|
| **1** | Iron, Leather, Cloth | 30-50 | Базовые |
| **2** | Steel, Bronze, Silk | 70-80 | Улучшенные |
| **3** | Spirit Iron, Cold Iron, Spirit Silk | 120-150 | Особые |
| **4** | Star Metal, Dragon Bone | 250-400 | Редкие |
| **5** | Void Matter, Chaos Matter | 500-600 | Божественные |

---

## 3️⃣ БАЗОВЫЕ КЛАССЫ ПО ТИПАМ

### 3.1 Оружие (Weapon)

```typescript
interface WeaponBaseStats {
  damage: number;
  penetration: number;
  range: number;
  attackSpeed: number;
  damageType: DamageType;
  material: MaterialType;
}

interface WeaponEquipment {
  id: string;
  name: string;
  category: 'weapon';
  weaponType: WeaponSubtype;
  level: number;
  
  // База (неизменна)
  baseStats: WeaponBaseStats;
  
  // Грейд (изменяем)
  gradeOverlay: GradeOverlay;
  
  // Прочность
  durability: DurabilityProps;
  
  // Требования
  requirements: EquipmentRequirements;
}
```

### 3.2 Броня (Armor)

```typescript
interface ArmorBaseStats {
  defense: number;
  resistances: Partial<Record<Element, number>>;
  moveSpeedPenalty: number;
  dodgePenalty: number;
  material: MaterialType;
  
  // Покрытие частей тела
  bodyPartCoverage: BodyPartType[];
}

interface ArmorEquipment {
  id: string;
  name: string;
  category: 'armor';
  armorSlot: EquipmentSlot;
  level: number;
  
  // База (неизменна)
  baseStats: ArmorBaseStats;
  
  // Грейд (изменяем)
  gradeOverlay: GradeOverlay;
  
  // Прочность
  durability: DurabilityProps;
}
```

### 3.3 Украшения (Jewelry)

```typescript
interface JewelryBaseStats {
  qiConductivity: number;      // Проводимость Ци
  statBonusBase: number;      // Базовый бонус к статам
  material: MaterialType;
  
  // Тип слота
  jewelrySlot: 'ring' | 'necklace' | 'earring' | 'bracelet';
}

interface JewelryEquipment {
  id: string;
  name: string;
  category: 'jewelry';
  jewelryType: JewelrySubtype;
  level: number;
  
  // База (неизменна)
  baseStats: JewelryBaseStats;
  
  // Грейд (изменяем) — влияет на qiConductivity и бонусы
  gradeOverlay: GradeOverlay;
  
  // Украшения не имеют прочности (или минимальная)
  durability?: DurabilityProps;
}
```

---

## 4️⃣ ЗАРЯДНИКИ ЦИ (CHARGER) — СИСТЕМА ГРЕЙДОВ

### 4.1 Концепция применения грейдов к зарядникам

**Почему грейды применимы к зарядникам:**

| Параметр зарядника | Влияние Грейда |
|-------------------|----------------|
| **Проводимость** | Множитель × (0.5 - 4.0) |
| **Ёмкость буфера** | Множитель × (0.5 - 4.0) |
| **Количество слотов** | +0-2 дополнительных слота |
| **Эффективность** | Снижение потерь Ци |
| **Термостойкость** | Увеличение допустимой температуры |

### 4.2 Базовый класс зарядника

```typescript
interface ChargerBaseStats {
  // === ИДЕНТИФИКАЦИЯ ===
  formFactor: ChargerFormFactor;  // belt, bracelet, necklace, ring, backpack
  purpose: ChargerPurpose;        // accumulation, combat, hybrid
  
  // === МАТЕРИАЛ ===
  material: MaterialType;
  
  // === БАЗОВЫЕ ПАРАМЕТРЫ (от материала и форм-фактора) ===
  
  // Проводимость — ключевой параметр
  baseConductivity: number;       // ед/сек
  
  // Ёмкость буфера
  baseBufferCapacity: number;     // ед Ци
  
  // Количество слотов
  baseSlotCount: number;
  maxSlotSize: QiStoneSize;       // Макс. размер камня
  
  // Термостойкость
  baseHeatResistance: number;     // 0-100%
  
  // Уровень предмета
  level: number;                  // 1-9
}
```

### 4.3 Грейд-надстройка для зарядника

```typescript
interface ChargerGradeOverlay extends GradeOverlay {
  grade: EquipmentGrade;
  
  // === МНОЖИТЕЛИ ДЛЯ ЗАРЯДНИКА ===
  
  // Проводимость
  conductivityMultiplier: number;
  
  // Ёмкость буфера
  bufferCapacityMultiplier: number;
  
  // Дополнительные слоты
  extraSlots: number;            // +0-2 слота
  
  // Эффективность (снижение потерь Ци)
  efficiencyBonus: number;       // +0-30% эффективности
  
  // Термостойкость
  heatResistanceBonus: number;   // +0-30% термостойкости
  
  // === БОНУСЫ К СТАТАМ ===
  bonusStats: EquipmentBonus[];
  
  // === ИСТОРИЯ ===
  gradeHistory: GradeChangeEvent[];
}

// Конкретные значения по грейдам
const CHARGER_GRADE_MULTIPLIERS: Record<EquipmentGrade, {
  conductivity: number;
  bufferCapacity: number;
  extraSlots: number;
  efficiency: number;
  heatResistance: number;
}> = {
  damaged: {
    conductivity: 0.5,
    bufferCapacity: 0.5,
    extraSlots: 0,
    efficiency: -10,       // -10% эффективности (дополнительные потери)
    heatResistance: -20,   // -20% термостойкости
  },
  common: {
    conductivity: 1.0,
    bufferCapacity: 1.0,
    extraSlots: 0,
    efficiency: 0,
    heatResistance: 0,
  },
  refined: {
    conductivity: 1.3,
    bufferCapacity: 1.5,
    extraSlots: 1,         // +1 слот
    efficiency: 5,         // +5% эффективности
    heatResistance: 10,    // +10% термостойкости
  },
  perfect: {
    conductivity: 1.7,
    bufferCapacity: 2.5,
    extraSlots: 2,         // +2 слота
    efficiency: 15,        // +15% эффективности
    heatResistance: 25,    // +25% термостойкости
  },
  transcendent: {
    conductivity: 2.5,
    bufferCapacity: 4.0,
    extraSlots: 2,         // +2 слота (максимум)
    efficiency: 30,        // +30% эффективности
    heatResistance: 40,    // +40% термостойкости
  },
};
```

### 4.4 Полная структура зарядника с грейдом

```typescript
interface ChargerEquipment {
  id: string;
  name: string;
  category: 'charger';
  level: number;
  
  // === БАЗОВЫЙ КЛАСС (неизменен) ===
  baseStats: ChargerBaseStats;
  
  // === ГРЕЙД (изменяем) ===
  gradeOverlay: ChargerGradeOverlay;
  
  // === ТЕКУЩИЕ ПАРАМЕТРЫ (рассчитываются из базы × грейд) ===
  effectiveStats: {
    conductivity: number;      // = base × gradeMult
    bufferCapacity: number;    // = base × gradeMult
    totalSlots: number;        // = base + extraSlots
    efficiency: number;        // = 100% + efficiencyBonus
    heatResistance: number;    // = base + heatResistanceBonus
  };
  
  // === СОСТОЯНИЕ ===
  state: {
    // Слоты для камней
    slots: QiStoneSlot[];
    
    // Буфер Ци
    buffer: QiBuffer;
    
    // Режим работы
    mode: ChargerMode;
    
    // Температура
    temperature: number;
    
    // Прочность (как для обычной экипировки)
    durability: DurabilityProps;
  };
  
  // === ТРЕБОВАНИЯ ===
  requirements: EquipmentRequirements;
}
```

### 4.5 Расчёт итоговых параметров зарядника

```typescript
function calculateChargerEffectiveStats(
  charger: ChargerEquipment
): ChargerEquipment['effectiveStats'] {
  const base = charger.baseStats;
  const grade = charger.gradeOverlay;
  const gradeMult = CHARGER_GRADE_MULTIPLIERS[grade.grade];
  
  return {
    conductivity: Math.floor(base.baseConductivity * gradeMult.conductivity),
    bufferCapacity: Math.floor(base.baseBufferCapacity * gradeMult.bufferCapacity),
    totalSlots: base.baseSlotCount + gradeMult.extraSlots,
    efficiency: 100 + gradeMult.efficiency,
    heatResistance: Math.min(100, base.baseHeatResistance + gradeMult.heatResistance),
  };
}
```

### 4.6 Примеры зарядников с грейдами

#### Пример 1: Базовый пояс (Common)

```typescript
const basicBelt: ChargerEquipment = {
  id: 'basic_belt_001',
  name: 'Простой пояс-накопитель',
  category: 'charger',
  level: 1,
  
  baseStats: {
    formFactor: 'belt',
    purpose: 'hybrid',
    material: 'iron',
    baseConductivity: 5,
    baseBufferCapacity: 500,
    baseSlotCount: 3,
    maxSlotSize: 'medium',
    baseHeatResistance: 50,
    level: 1,
  },
  
  gradeOverlay: {
    grade: 'common',
    durabilityMultiplier: 1.0,
    effectivenessMultiplier: 1.0,
    conductivityMultiplier: 1.0,
    bufferCapacityMultiplier: 1.0,
    extraSlots: 0,
    efficiencyBonus: 0,
    heatResistanceBonus: 0,
    bonusStats: [],
    specialEffects: [],
    gradeHistory: [],
  },
  
  // Итоговые параметры:
  // conductivity: 5 ед/сек
  // bufferCapacity: 500 ед
  // totalSlots: 3
  // efficiency: 100%
  // heatResistance: 50%
};
```

#### Пример 2: Мастерский боевой браслет (Refined)

```typescript
const combatBracelet: ChargerEquipment = {
  id: 'combat_bracelet_001',
  name: 'Боевой браслет мастера',
  category: 'charger',
  level: 3,
  
  baseStats: {
    formFactor: 'bracelet',
    purpose: 'combat',
    material: 'spirit_iron',
    baseConductivity: 15,       // Духовное железо
    baseBufferCapacity: 200,
    baseSlotCount: 2,
    maxSlotSize: 'small',
    baseHeatResistance: 70,
    level: 3,
  },
  
  gradeOverlay: {
    grade: 'refined',
    durabilityMultiplier: 1.5,
    effectivenessMultiplier: 1.3,
    conductivityMultiplier: 1.3,
    bufferCapacityMultiplier: 1.5,
    extraSlots: 1,             // +1 слот (итого 3)
    efficiencyBonus: 5,        // +5% эффективности
    heatResistanceBonus: 10,   // +10% термостойкости
    bonusStats: [
      { type: 'agility', value: 2, isPercent: false },
    ],
    specialEffects: [],
    gradeHistory: [{
      fromGrade: 'common',
      toGrade: 'refined',
      reason: 'upgrade',
      timestamp: Date.now(),
    }],
  },
  
  // Итоговые параметры:
  // conductivity: 15 × 1.3 = 19.5 ед/сек
  // bufferCapacity: 200 × 1.5 = 300 ед
  // totalSlots: 2 + 1 = 3
  // efficiency: 100 + 5 = 105%
  // heatResistance: 70 + 10 = 80%
};
```

#### Пример 3: Легендарный ранец (Perfect)

```typescript
const legendaryBackpack: ChargerEquipment = {
  id: 'legendary_backpack_001',
  name: 'Ранец Небесного Потока',
  category: 'charger',
  level: 5,
  
  baseStats: {
    formFactor: 'backpack',
    purpose: 'hybrid',
    material: 'star_metal',
    baseConductivity: 40,      // Звёздный металл
    baseBufferCapacity: 2000,
    baseSlotCount: 6,
    maxSlotSize: 'large',
    baseHeatResistance: 80,
    level: 5,
  },
  
  gradeOverlay: {
    grade: 'perfect',
    durabilityMultiplier: 2.5,
    effectivenessMultiplier: 1.7,
    conductivityMultiplier: 1.7,
    bufferCapacityMultiplier: 2.5,
    extraSlots: 2,             // +2 слота (итого 8)
    efficiencyBonus: 15,       // +15% эффективности
    heatResistanceBonus: 25,   // +25% термостойкости
    bonusStats: [
      { type: 'conductivity', value: 0.5, isPercent: false },
      { type: 'qiMax', value: 100, isPercent: false },
    ],
    specialEffects: [
      { id: 'qi_retention', name: 'Сохранение Ци', value: 5 }, // +5% сохранения
    ],
    grantedTechniques: [{
      techniqueId: 'qi_burst',
      charges: { current: 3, max: 3, recharge: { type: 'qi', amount: 100 } },
    }],
    gradeHistory: [],
  },
  
  // Итоговые параметры:
  // conductivity: 40 × 1.7 = 68 ед/сек
  // bufferCapacity: 2000 × 2.5 = 5000 ед
  // totalSlots: 6 + 2 = 8
  // efficiency: 100 + 15 = 115%
  // heatResistance: 80 + 25 = 105% → cap at 100%
};
```

---

## 5️⃣ АПГРЕЙД И ПОНИЖЕНИЕ ГРЕЙДА

### 5.1 Универсальные механики

Все типы экипировки (включая зарядники) используют одну систему:

**Апгрейд грейда:**
- Требуются материалы + духовные камни
- Шанс успеха: 50-95%
- При успехе: множители увеличиваются

**Понижение грейда при плохом ремонте:**
- Качество ремонта < 50% → риск понижения
- 25-40% шанс в зависимости от текущего грейда

### 5.2 Специфика для зарядников

```typescript
interface ChargerUpgradeResult {
  success: boolean;
  previousGrade: EquipmentGrade;
  newGrade: EquipmentGrade;
  
  // Изменения параметров зарядника
  changes: {
    conductivityDelta: number;
    bufferCapacityDelta: number;
    extraSlotsGained: number;
    efficiencyDelta: number;
  };
  
  lostMaterials: Material[];
  cost: number;
}

function upgradeChargerGrade(
  charger: ChargerEquipment,
  materials: Material[],
  spiritStones: number,
  upgradeSkill: number
): ChargerUpgradeResult {
  const currentGrade = charger.gradeOverlay.grade;
  const gradeOrder: EquipmentGrade[] = ['damaged', 'common', 'refined', 'perfect', 'transcendent'];
  const currentIndex = gradeOrder.indexOf(currentGrade);
  
  // ... аналогично weapon/armor upgrade
  
  // При успехе обновляем множители
  const targetGrade = gradeOrder[currentIndex + 1];
  const newMultipliers = CHARGER_GRADE_GRADE_MULTIPLIERS[targetGrade];
  
  charger.gradeOverlay.grade = targetGrade;
  charger.gradeOverlay.conductivityMultiplier = newMultipliers.conductivity;
  charger.gradeOverlay.bufferCapacityMultiplier = newMultipliers.bufferCapacity;
  charger.gradeOverlay.extraSlots = newMultipliers.extraSlots;
  charger.gradeOverlay.efficiencyBonus = newMultipliers.efficiency;
  charger.gradeOverlay.heatResistanceBonus = newMultipliers.heatResistance;
  
  // Пересчитываем effectiveStats
  charger.effectiveStats = calculateChargerEffectiveStats(charger);
  
  return {
    success: true,
    previousGrade: currentGrade,
    newGrade: targetGrade,
    changes: {
      conductivityDelta: charger.effectiveStats.conductivity - oldConductivity,
      bufferCapacityDelta: charger.effectiveStats.bufferCapacity - oldCapacity,
      extraSlotsGained: newMultipliers.extraSlots,
      efficiencyDelta: newMultipliers.efficiency,
    },
    lostMaterials: [...],
    cost: targetProps.upgradeCost,
  };
}
```

---

## 6️⃣ ИНСТРУМЕНТЫ (TOOLS)

### 6.1 Применение грейдов

Инструменты имеют **ограниченную** систему грейдов:

```typescript
interface ToolGradeOverlay {
  grade: 'damaged' | 'common' | 'refined';  // Только 3 уровня
  
  // Только прочность и эффективность
  durabilityMultiplier: number;
  effectivenessMultiplier: number;
  
  // Нет бонусов к статам
  // Нет спецэффектов
  // Нет даруемых техник
}
```

### 6.2 Базовый класс инструмента

```typescript
interface ToolBaseStats {
  toolType: ToolSubtype;
  material: MaterialType;
  baseDurability: number;
  baseEffectiveness: number;  // Скорость работы / качество
  level: number;
}

interface ToolEquipment {
  id: string;
  name: string;
  category: 'tool';
  level: number;
  
  baseStats: ToolBaseStats;
  gradeOverlay: ToolGradeOverlay;
  durability: DurabilityProps;
}
```

---

## 7️⃣ РАСХОДНИКИ (CONSUMABLES)

### 7.1 Без системы грейдов

Расходники не имеют грейда — только **качество**:

```typescript
interface ConsumableBaseStats {
  consumableType: ConsumableSubtype;
  quality: 'low' | 'medium' | 'high' | 'premium';
  
  // Эффект
  effect: {
    type: ConsumableEffectType;
    value: number;
    duration?: number;
  };
  
  // Количество
  quantity: number;
  stackSize: number;
}

// Качество определяется при создании и не изменяется
const CONSUMABLE_QUALITY_MULTIPLIERS = {
  low: 0.5,
  medium: 1.0,
  high: 1.5,
  premium: 2.5,
};
```

---

## 8️⃣ АРТЕФАКТЫ (ARTIFACTS)

### 8.1 Применение грейдов

Артефакты используют полную систему грейдов:

```typescript
interface ArtifactBaseStats {
  artifactType: ArtifactSubtype;
  material: MaterialType;
  
  // Базовая мощность эффектов
  baseEffectPower: number;
  
  // Тип эффекта
  effects: ArtifactEffect[];
  
  level: number;
}

interface ArtifactEquipment {
  id: string;
  name: string;
  category: 'artifact';
  level: number;
  
  baseStats: ArtifactBaseStats;
  gradeOverlay: GradeOverlay;  // Полная система грейдов
  
  // При повышении грейда — увеличивается мощность эффектов
  effectivePower: number;  // = baseEffectPower × gradeMultiplier
}
```

---

## 9️⃣ ИМПЛАНТЫ (IMPLANTS)

### 9.1 Применение грейдов

```typescript
interface ImplantBaseStats {
  implantType: ImplantSubtype;
  material: MaterialType;
  
  // Совместимость с телом
  compatibilityBase: number;  // 0-100%
  
  // Эффекты импланта
  effects: ImplantEffect[];
  
  level: number;
}

interface ImplantEquipment {
  id: string;
  name: string;
  category: 'implant';
  level: number;
  
  baseStats: ImplantBaseStats;
  gradeOverlay: GradeOverlay;
  
  // При повышении грейда:
  // - Увеличивается совместимость
  // - Усиливаются эффекты
}
```

---

## 🔟 СВОДНАЯ ТАБЛИЦА

### 10.1 Применимость грейдов по типам

| Тип | Грейды | Множители | Бонусы | Техники |
|-----|--------|-----------|--------|---------|
| **Weapon** | 5 | damage, penetration | ✅ | ✅ |
| **Armor** | 5 | defense, resistances | ✅ | ✅ |
| **Jewelry** | 5 | qiConductivity, stats | ✅ | ✅ |
| **Charger** | 5 | conductivity, buffer | ✅ | ✅ |
| **Tool** | 3 | durability, effectiveness | ❌ | ❌ |
| **Consumable** | 0 | — | ❌ | ❌ |
| **Artifact** | 5 | effectPower | ✅ | ✅ |
| **Implant** | 5 | compatibility, effects | ✅ | ✅ |

### 10.2 Ключевые параметры по типам

| Тип | Главный параметр | Влияние грейда |
|-----|-----------------|----------------|
| Weapon | Damage | ×0.5 - ×4.0 |
| Armor | Defense | ×0.5 - ×4.0 |
| Jewelry | Qi Conductivity | ×0.5 - ×4.0 |
| **Charger** | **Conductivity** | **×0.5 - ×2.5** |
| Tool | Effectiveness | ×0.5 - ×1.5 |
| Artifact | Effect Power | ×0.5 - ×4.0 |
| Implant | Compatibility | ×0.5 - ×4.0 |

---

## 🔗 Связанные документы

- [weapon-armor-system.md](./weapon-armor-system.md) — Система Грейдов (разделы 12-16)
- [charger.md](./charger.md) — Зарядники Ци (оригинальная документация)
- [body.md](./body.md) — Система тела
- [combat-system.md](./combat-system.md) — Боевая система

---

*Документ создан: 2026-03-14*
*Статус: Теоретические изыскания для объединения в equip.md*
