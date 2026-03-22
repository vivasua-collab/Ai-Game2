# 🦴 Детальный план: Система Тела v2.0

**Дата:** 2026-03-22
**Версия:** 1.0 Draft
**Статус:** 📋 Планирование

---

## 📋 Обзор

Документ описывает план доработки системы тела до логической завершённости на основе:
- `body_review.md` v4.1 — механика Qi Buffer 90%
- `body_armor.md` v3.0 — новая роль брони

---

## 1️⃣ КЛЮЧЕВЫЕ ИЗМЕНЕНИЯ

### 1.1 Qi Buffer 90% (НОВАЯ МЕХАНИКА)

```
┌─────────────────────────────────────────────────────────────────┐
│                    QI BUFFER v3.0                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  СЫРАЯ ЦИ (без щитовой техники):                                │
│  • Поглощение: 90% урона                                        │
│  • Пробитие: 10% ВСЕГДА проходит в броню/HP                     │
│  • Соотношение: 1 поглощённый урон = 3 Ци                      │
│                                                                  │
│  ЩИТОВАЯ ТЕХНИКА:                                               │
│  • Поглощение: 100% урона                                       │
│  • Пробитие: 0%                                                 │
│  • Соотношение: 1 урон = 1 Ци                                   │
│                                                                  │
│  КЛЮЧЕВАЯ РАЗНИЦА:                                              │
│  • Сырая Ци: 3,932 урона за удар L9 → паралич за 1-2 удара     │
│  • Щит-техника: 0 урона → полная неуязвимость                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Обновлённый порядок защиты

```typescript
// ПОРЯДОК ПРОХОЖДЕНИЯ УРОНА (10 СЛОЁВ)
const DAMAGE_LAYERS = [
  'LAYER_1_RAW_DAMAGE',      // Исходный урон техники
  'LAYER_2_BODY_PART',       // Определение части тела
  'LAYER_3_ACTIVE_DEFENSE',  // Уклонение/Парирование/Блок
  'LAYER_4_QI_BUFFER',       // ⭐ Qi Buffer (90% или 100%)
  'LAYER_5_ARMOR_COVERAGE',  // Покрытие брони
  'LAYER_6_ARMOR_REDUCTION', // Снижение урона бронёй
  'LAYER_7_BODY_MATERIAL',   // Материал тела (scales и т.д.)
  'LAYER_8_FINAL_DAMAGE',    // Итоговый урон
  'LAYER_9_HP_DISTRIBUTION', // Распределение по HP
  'LAYER_10_CONSEQUENCES',   // Кровотечение, шок, смерть
];
```

---

## 2️⃣ ТЕКУЩИЙ КОД

### 2.1 Существующие файлы

| Файл | Назначение | Строк |
|------|------------|-------|
| `src/types/body.ts` | Типы HP, частей тела | ~550 |
| `src/lib/game/body-system.ts` | Базовая система | ~700 |
| `src/lib/game/bleeding-system.ts` | Кровотечения | ~200 |
| `src/lib/game/limb-attachment.ts` | Приживление | ~300 |

### 2.2 Функции урона (ТЕКУЩИЕ)

```typescript
// body-system.ts:318
function applyDamageToLimb(
  part: BodyPart,
  damage: number,
  options?: {
    armor?: number;
    penetration?: number;
    isHeart?: boolean;
  }
): DamageResult
```

**Проблема:** Нет Qi Buffer, нет деления на слои, нет механики 90%.

### 2.3 Что нужно добавить

```typescript
// НОВАЯ ФУНКЦИЯ: Qi Buffer
function processQiDamage(
  incomingDamage: number,
  currentQi: number,
  maxQi: number,
  hasShieldTechnique: boolean,
  config: QiBufferConfig
): {
  qiConsumed: number;
  absorbedDamage: number;
  remainingDamage: number;  // 10% или 0
}

// НОВАЯ ФУНКЦИЯ: Полный расчёт урона
function processFullDamagePipeline(
  rawDamage: number,
  attacker: AttackerStats,
  defender: DefenderStats,
  technique: TechniqueData
): DamagePipelineResult
```

---

## 3️⃣ ПЛАН РЕАЛИЗАЦИИ

### Этап 1: Qi Buffer (P0)

#### 1.1 Создать qi-buffer.ts

```typescript
// src/lib/game/qi-buffer.ts

export interface QiBufferConfig {
  // Множитель для сырой Ци
  baseQiAbsorptionRatio: 3.0;  // 1 урон = 3 Ци
  
  // Процент поглощения сырой Ци
  rawQiAbsorptionPercent: 0.90;  // 90%
  
  // Щитовая техника
  shieldTechniqueMultiplier: 1.0;  // 1 урон = 1 Ци
  shieldAbsorptionPercent: 1.0;    // 100%
  
  // Минимум Ци для активации
  minQiForBuffer: 10;
}

export function processQiDamage(
  incomingDamage: number,
  currentQi: number,
  maxQi: number,
  hasShieldTechnique: boolean,
  config: QiBufferConfig
): QiDamageResult {
  // Реализация механики 90% vs 100%
}
```

#### 1.2 Конфигурация щитовых техник

```typescript
// src/lib/constants/shield-techniques.ts

export const SHIELD_TECHNIQUE_CONFIGS = {
  'qi_barrier': {
    qiCostPerDamage: 1.5,
    qiCostPerSecond: 1,
    absorptionPercent: 1.0,
  },
  'protective_dome': {
    qiCostPerDamage: 1.0,
    qiCostPerSecond: 3,
    absorptionPercent: 1.0,
    damageReduction: 0.2,
  },
  'elemental_shield': {
    qiCostPerDamage: 1.0,
    qiCostPerSecond: 2,
    absorptionPercent: 1.0,
    elementalResistance: { fire: 0.5, water: 0.5 },
  },
};
```

### Этап 2: Интеграция с боевой системой (P0)

#### 2.1 Обновить combat-utils.ts

```typescript
// Добавить функцию полного пайплайна
export function processDamagePipeline(
  rawDamage: number,
  attacker: NPC | Player,
  defender: NPC | Player,
  technique: Technique
): DamagePipelineResult {
  
  // Слой 3: Активная защита
  if (tryDodge(defender)) return { avoided: 'dodge' };
  if (tryParry(defender)) rawDamage *= (1 - blockPercent);
  
  // Слой 4: Qi Buffer ⭐ НОВОЕ
  const qiResult = processQiDamage(
    rawDamage,
    defender.currentQi,
    defender.maxQi,
    defender.hasActiveShieldTechnique,
    QI_BUFFER_CONFIG
  );
  rawDamage = qiResult.remainingDamage;  // 10% или 0
  
  // Слой 5-6: Броня
  if (defender.armor && checkCoverage(defender.armor)) {
    rawDamage = applyArmorReduction(rawDamage, defender.armor);
  }
  
  // Слой 7: Материал тела
  rawDamage = applyBodyMaterialReduction(rawDamage, defender.bodyMaterial);
  
  // Слой 9: HP
  return applyDamageToLimb(part, rawDamage);
}
```

#### 2.2 Обновить типы техник

```typescript
// Добавить флаг isQiTechnique
interface Technique {
  // ... existing fields
  isQiTechnique: boolean;  // true = активирует Qi Buffer
  bypassesQiBuffer?: boolean;  // специальные техники
}
```

### Этап 3: Prisma схема (P1)

#### 3.1 Модель BodyStructure

```prisma
model BodyStructure {
  id          String   @id @default(cuid())
  characterId String   @unique
  character   Character @relation(fields: [characterId], references: [id])
  
  // Сериализованные части тела
  partsJson   String   // JSON Map<string, BodyPart>
  
  // Сердце
  heartCurrentHp Int
  heartMaxHp    Int
  heartEfficiency Int @default(100)
  
  // Общее состояние
  overallHealth Int @default(100)
  isDead       Boolean @default(false)
  deathReason  String?
  
  // Временные метки
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ActiveBleed {
  id          String   @id @default(cuid())
  bodyId      String
  body        BodyStructure @relation(fields: [bodyId], references: [id])
  
  partId      String
  type        String   // minor, moderate, severe, critical, arterial
  damagePerTick Int
  remainingDuration Int
  startedAt   Int      // ТИК начала
  
  createdAt   DateTime @default(now())
}

model ActiveAttachment {
  id          String   @id @default(cuid())
  bodyId      String
  body        BodyStructure @relation(fields: [bodyId], references: [id])
  
  partId      String
  startedAt   Int
  duration    Int
  progress    Int      @default(0)
  stage       String   // attaching, adapting, strengthening, complete
  
  // Информация о доноре
  donorId     String?
  donorCultivationLevel Int
  donorCultivationStep Int
  
  createdAt   DateTime @default(now())
}
```

### Этап 4: UI обновления (P2)

#### 4.1 Обновить BodyStatusPanel

```tsx
// Добавить отображение Qi Buffer
<QiBufferIndicator 
  currentQi={character.currentQi}
  maxQi={character.maxQi}
  absorptionPercent={hasShieldTechnique ? 100 : 90}
  penetrationDamage={calculatePenetration(rawDamage)}
/>
```

#### 4.2 Добавить DamageFlow визуализацию

```tsx
// Показать прохождение урона по слоям
<DamageFlowDisplay>
  <Layer name="Raw Damage" value={39321} />
  <Layer name="Dodge" result="failed" />
  <Layer name="Qi Buffer" absorbed={35389} penetrated={3932} />
  <Layer name="Armor" absorbed={1770} passed={2162} />
  <Layer name="HP" damage={2162} />
</DamageFlowDisplay>
```

---

## 4️⃣ ТЕСТИРОВАНИЕ

### 4.1 Unit тесты

```typescript
// __tests__/qi-buffer.test.ts

describe('Qi Buffer v3.0', () => {
  test('raw Qi absorbs 90%, penetrates 10%', () => {
    const result = processQiDamage(1000, 5000, 10000, false, CONFIG);
    expect(result.absorbedDamage).toBe(900);  // 90%
    expect(result.remainingDamage).toBe(100); // 10%
    expect(result.qiConsumed).toBe(2700);     // 900 × 3
  });
  
  test('shield technique absorbs 100%', () => {
    const result = processQiDamage(1000, 5000, 10000, true, CONFIG);
    expect(result.absorbedDamage).toBe(1000);
    expect(result.remainingDamage).toBe(0);
    expect(result.qiConsumed).toBe(1000);      // 1000 × 1
  });
  
  test('L8 vs L9 technique scenario', () => {
    // Удар L9 (39,321 урона) по L8 (789,750 Ци)
    const result = processQiDamage(39321, 600000, 789750, false, CONFIG);
    expect(result.absorbedDamage).toBeCloseTo(35389, 0);
    expect(result.remainingDamage).toBeCloseTo(3932, 0);
  });
});
```

### 4.2 Интеграционные тесты

```typescript
// __tests__/combat/damage-pipeline.test.ts

describe('Full Damage Pipeline', () => {
  test('L9 technique vs L8 practitioner with armor', async () => {
    const attacker = createTestNPC({ level: 9 });
    const defender = createTestPlayer({ 
      level: 8, 
      qi: 600000,
      armor: { defense: 119, damageReduction: 0.45 }
    });
    const technique = createTestTechnique({ level: 9, damage: 39321 });
    
    const result = await processDamagePipeline(
      technique.damage,
      attacker,
      defender,
      technique
    );
    
    // 10% пробитие: 3932
    // Броня DR 45%: 3932 * 0.55 = 2162
    expect(result.finalDamage).toBeCloseTo(2162, 0);
    expect(result.qiConsumed).toBeCloseTo(106167, 0);
  });
});
```

---

## 5️⃣ МИГРАЦИЯ

### 5.1 Существующие персонажи

1. Добавить поле `currentQi` если отсутствует
2. Рассчитать `maxQi` по формуле ядра
3. Установить `hasShieldTechnique` на основе изученных техник

### 5.2 Совместимость

```typescript
// Флаг для старой механики (100% поглощение)
const LEGACY_QI_ABSORPTION = process.env.LEGACY_QI_BUFFER === 'true';

function processQiDamage(...args) {
  if (LEGACY_QI_ABSORPTION) {
    // Старая логика: 100% поглощение сырой Ци
    return legacyProcessQiDamage(...args);
  }
  // Новая логика: 90%
  return newProcessQiDamage(...args);
}
```

---

## 6️⃣ РИСКИ И РЕШЕНИЯ

### 6.1 Технические риски

| Риск | Решение |
|------|---------|
| Циклические зависимости | Разделить на слои, использовать event bus |
| Производительность | Кэшировать промежуточные расчёты |
| Синхронизация состояния | Server-authoritative, клиент только отображает |

### 6.2 Баланс

| Риск | Решение |
|------|---------|
| L8-9 слишком слабы | Плавный переход, буфф Qi регенерации |
| Щитовые техники имба | Qi drain per second, cooldown |
| PvP дисбаланс | Тестирование на dev сервере |

---

## 7️⃣ ВРЕМЕННЫЕ РАМКИ

| Этап | Задачи | Оценка |
|------|--------|--------|
| 1 | Qi Buffer реализация | 2-3 часа |
| 2 | Интеграция с боем | 3-4 часа |
| 3 | Prisma схема | 1-2 часа |
| 4 | UI обновления | 2-3 часа |
| 5 | Тестирование | 2 часа |
| **Итого** | | **10-14 часов** |

---

## 8️⃣ КРИТЕРИИ ГОТОВНОСТИ

- [ ] Qi Buffer работает с механикой 90%
- [ ] Щитовые техники дают 100% поглощение
- [ ] Броня снижает пробитие
- [ ] Unit тесты проходят
- [ ] Интеграционные тесты проходят
- [ ] UI отображает Qi Buffer статус
- [ ] Документация обновлена

---

*План создан: 2026-03-22*
*Версия: 1.0 Draft*
*Статус: Ожидает начала реализации*
