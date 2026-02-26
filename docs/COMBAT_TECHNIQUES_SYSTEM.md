# ⚔️ Система боевых техник

**Версия:** 1.0  
**Создано:** 2026-02-12  
**Статус:** Проектирование

---

## 📋 Обзор

Боевые техники делятся на две основные группы:
1. **Ближний бой (Melee)** — контактные техники
2. **Дальний бой (Ranged)** — дистанционные техники с падением урона

---

## 🎯 Типы боевых техник

### 1. Ближний бой (Melee)

#### 1.1 Усиление ударов (Contact Strike)
Контактные техники, требующие непосредственного касания цели.

**Характеристики:**
- `combatType: "melee_strike"`
- `contactRequired: true` — требует контакта с целью
- `range: 0-2 метра` — дистанция применения
- Урон зависит от силы и проводимости

**Примеры:**
- "Усиленный удар" — базовый удар с Ци
- "Огненный удар" — удар с огненной Ци
- "Ледяная ладонь" — контактная техника холода

#### 1.2 Усиление оружия (Weapon Buff)
Временное усиление оружия Ци.

**Характеристики:**
- `combatType: "melee_weapon"`
- `contactRequired: false`
- `duration: число минут`
- Добавляет урон к оружию
- Может добавлять элементальный эффект

**Примеры:**
- "Пылающий клинок" — оружие наносит огненный урон
- "Громовое лезвие" — оружие наносит электрический урон

---

### 2. Дальний бой (Ranged)

Техники, выпускающие Ци в виде снарядов или лучей.

#### Параметры дальности

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ДАЛЬНОСТЬ ТЕХНИКИ                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   0м        fullDamageRange           halfDamageRange      maxRange │
│   │              │                          │                  │    │
│   ▼              ▼                          ▼                  ▼    │
│   ├──────────────┼──────────────────────────┼─────────────────┤    │
│   │   100%       │      Линейное падение    │   Рассеивание   │    │
│   │   урона      │      100% → 50%          │   50% → 0%      │    │
│   │              │                          │                 │    │
│   │◄── ЗОНА 1 ──►│◄────── ЗОНА 2 ──────────►│◄── ЗОНА 3 ────►│    │
│   │  Полный урон │     Промежуточный урон   │   Рассеивание   │    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Формулы расчёта урона

**Зона 1 (0 → fullDamageRange):**
```
damageMultiplier = 1.0  // 100% урона
```

**Зона 2 (fullDamageRange → halfDamageRange):**
```
// Линейное падение от 100% до 50%
damageMultiplier = 1.0 - 0.5 * (distance - fullDamageRange) / (halfDamageRange - fullDamageRange)

// Пример:
// fullDamageRange = 10м, halfDamageRange = 20м
// На 15м: damageMultiplier = 1.0 - 0.5 * (15-10)/(20-10) = 1.0 - 0.25 = 0.75 (75%)
```

**Зона 3 (halfDamageRange → maxRange):**
```
// Быстрое падение от 50% до 0%
// Используем квадратичное затухание
const decayStart = halfDamageRange;
const decayEnd = maxRange;
const progress = (distance - decayStart) / (decayEnd - decayStart);
damageMultiplier = 0.5 * (1 - progress * progress);  // Квадратичное затухание

// Пример:
// halfDamageRange = 20м, maxRange = 30м
// На 25м: progress = (25-20)/(30-20) = 0.5
//         damageMultiplier = 0.5 * (1 - 0.25) = 0.375 (37.5%)
// На 28м: progress = 0.8
//         damageMultiplier = 0.5 * (1 - 0.64) = 0.18 (18%)
```

#### Типы дальних техник

**2.1 Снаряд (Projectile)**
- `combatType: "ranged_projectile"`
- Движется по прямой
- Может быть уклонён (dodge chance)
- Время полёта зависит от расстояния

**2.2 Луч (Beam)**
- `combatType: "ranged_beam"`
- Мгновенное попадание
- Труднее уклониться
- Может пробивать цели

**2.3 Область (Area)**
- `combatType: "ranged_aoe"`
- Создаёт зону поражения
- Урон всем в зоне
- Обычно фиксированный урон в зоне

---

## 📊 Параметры боевых техник

### Интерфейс CombatTechniqueEffects

```typescript
interface CombatTechniqueEffects {
  // === УРОН ===
  damage: number;              // Базовый урон
  
  // === ТИП БОЕВОЙ ТЕХНИКИ ===
  combatType: CombatTechniqueType;
  
  // === ДАЛЬНОСТЬ (для ranged) ===
  range?: {
    fullDamage: number;        // Дальность полного урона (м)
    halfDamage: number;        // Дальность 50% урона (м)
    max: number;               // Максимальная дальность (м) - после урон = 0
  };
  
  // === КОНТАКТ (для melee) ===
  contactRequired?: boolean;   // Требует ли контакта с целью
  
  // === ОБЛАСТЬ (для AOE) ===
  aoeRadius?: number;          // Радиус области поражения (м)
  
  // === ВРЕМЕННЫЕ ЭФФЕКТЫ ===
  duration?: number;           // Длительность баффа (мин)
  
  // === ЭЛЕМЕНТАЛЬНЫЕ ЭФФЕКТЫ ===
  elementalEffect?: {
    type: PresetElement;
    damagePerTurn?: number;    // Урон за ход (DoT)
    duration: number;          // Длительность эффекта
  };
  
  // === ШАНС УКЛОНЕНИЯ ===
  dodgeChance?: number;        // Базовый шанс уклонения (для projectile)
  
  // === ПРОБИТИЕ ===
  penetration?: number;        // Пробитие защиты (%)
}
```

### Типы боевых техник

```typescript
type CombatTechniqueType = 
  | "melee_strike"       // Контактный удар
  | "melee_weapon"       // Усиление оружия
  | "ranged_projectile"  // Снаряд
  | "ranged_beam"        // Луч
  | "ranged_aoe";        // Область
```

---

## 🎮 Примеры техник

### Ближний бой

#### Усиленный удар (Melee Strike)
```typescript
{
  id: "reinforced_strike",
  name: "Усиленный удар",
  techniqueType: "combat",
  effects: {
    damage: 15,
    combatType: "melee_strike",
    contactRequired: true,
    range: { max: 2 }  // До 2 метров
  }
}
```

#### Пылающий клинок (Weapon Buff)
```typescript
{
  id: "blazing_blade",
  name: "Пылающий клинок",
  techniqueType: "combat",
  effects: {
    damage: 10,  // Добавочный урон к оружию
    combatType: "melee_weapon",
    duration: 5,  // 5 минут
    elementalEffect: {
      type: "fire",
      damagePerTurn: 3,
      duration: 3
    }
  }
}
```

### Дальний бой

#### Огненный снаряд (Ranged Projectile)
```typescript
{
  id: "fire_bullet",
  name: "Огненный снаряд",
  techniqueType: "combat",
  effects: {
    damage: 30,
    combatType: "ranged_projectile",
    range: {
      fullDamage: 15,   // 15м - полный урон
      halfDamage: 30,   // 30м - 50% урона
      max: 45           // 45м - рассеивание
    },
    dodgeChance: 0.2,   // 20% шанс уклонения
    elementalEffect: {
      type: "fire",
      damagePerTurn: 5,
      duration: 2
    }
  }
}
```

#### Ледяной луч (Ranged Beam)
```typescript
{
  id: "ice_beam",
  name: "Ледяной луч",
  techniqueType: "combat",
  effects: {
    damage: 40,
    combatType: "ranged_beam",
    range: {
      fullDamage: 20,
      halfDamage: 40,
      max: 60
    },
    dodgeChance: 0.05,  // 5% шанс уклонения (луч трудно уклониться)
    penetration: 20,    // 20% пробития
    elementalEffect: {
      type: "water",  // Лёд = вода
      damagePerTurn: 0,
      duration: 1  // Замедление
    }
  }
}
```

---

## 📐 Функции расчёта

### calculateDamageAtDistance()

```typescript
function calculateDamageAtDistance(
  baseDamage: number,
  distance: number,
  range: { fullDamage: number; halfDamage: number; max: number }
): { damage: number; multiplier: number; isZero: boolean } {
  
  // Зона 1: Полный урон
  if (distance <= range.fullDamage) {
    return { damage: baseDamage, multiplier: 1.0, isZero: false };
  }
  
  // За пределами максимальной дальности
  if (distance >= range.max) {
    return { damage: 0, multiplier: 0, isZero: true };
  }
  
  // Зона 2: Линейное падение до 50%
  if (distance <= range.halfDamage) {
    const multiplier = 1.0 - 0.5 * 
      (distance - range.fullDamage) / 
      (range.halfDamage - range.fullDamage);
    return { 
      damage: Math.floor(baseDamage * multiplier), 
      multiplier, 
      isZero: false 
    };
  }
  
  // Зона 3: Квадратичное затухание от 50% до 0%
  const progress = 
    (distance - range.halfDamage) / 
    (range.max - range.halfDamage);
  const multiplier = 0.5 * (1 - progress * progress);
  return { 
    damage: Math.floor(baseDamage * multiplier), 
    multiplier, 
    isZero: false 
  };
}
```

### calculateFinalDamage()

```typescript
function calculateFinalDamage(
  technique: TechniquePreset,
  character: Character,
  target: CombatTarget,
  distance: number
): number {
  
  // Базовый урон техники
  let damage = technique.effects.damage || 0;
  
  // Масштабирование от характеристик
  const scaling = technique.scaling || {};
  if (scaling.strength && character.strength > 10) {
    damage *= 1 + (character.strength - 10) * scaling.strength;
  }
  if (scaling.conductivity && character.conductivity > 0) {
    damage *= 1 + character.conductivity * scaling.conductivity;
  }
  
  // Мастерство техники
  const mastery = target.mastery || 0; // 0-100%
  damage *= 1 + mastery * technique.masteryBonus / 100;
  
  // Штраф за дальность (только для ranged)
  if (technique.effects.combatType?.startsWith('ranged') && technique.effects.range) {
    const result = calculateDamageAtDistance(
      damage, 
      distance, 
      technique.effects.range
    );
    damage = result.damage;
  }
  
  // Пробитие защиты
  const penetration = technique.effects.penetration || 0;
  const armor = target.armor || 0;
  const effectiveArmor = armor * (1 - penetration / 100);
  damage = Math.max(0, damage - effectiveArmor);
  
  return Math.floor(damage);
}
```

---

## 📊 Таблица дальности (пример)

Для техники с `range: { fullDamage: 10, halfDamage: 20, max: 30 }`:

| Дистанция | Множитель | Урон (база 100) |
|-----------|-----------|-----------------|
| 0-10м     | 100%      | 100             |
| 12м       | 90%       | 90              |
| 15м       | 75%       | 75              |
| 18м       | 60%       | 60              |
| 20м       | 50%       | 50              |
| 22м       | 42%       | 42              |
| 25м       | 31%       | 31              |
| 28м       | 16%       | 16              |
| 30м+      | 0%        | 0               |

---

## 🎯 Баланс

### Соотношение урона

| Тип | Базовый урон | Дальность | Сложность |
|-----|--------------|-----------|-----------|
| Melee Strike | 15-30 | 0-2м | Низкая |
| Melee Weapon | +10-20 к оружию | N/A | Низкая |
| Ranged Projectile | 25-50 | 30-60м | Средняя |
| Ranged Beam | 35-70 | 40-80м | Высокая |
| Ranged AOE | 20-40 | 20-50м | Средняя |

### Затраты Ци

| Тип техники | Базовая стоимость |
|-------------|-------------------|
| Melee Strike | 5-15 Ци |
| Melee Weapon | 10-25 Ци |
| Ranged Projectile | 15-30 Ци |
| Ranged Beam | 25-50 Ци |
| Ranged AOE | 30-60 Ци |

---

## 🔗 Связанные документы

- [docs/start_lore.md](./start_lore.md) — Лор мира культивации
- [src/data/presets/technique-presets.ts](../src/data/presets/technique-presets.ts) — Пресеты техник
- [src/types/game.ts](../src/types/game.ts) — Типы игры

---

*Документ создан: 2026-02-12*
