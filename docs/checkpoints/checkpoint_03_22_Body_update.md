# 🦴 Детальный план: Система Тела v5.0

**Дата:** 2026-03-22
**Версия:** 2.0
**Статус:** ✅ Теория завершена — ГОТОВО К РЕАЛИЗАЦИИ

---

## 📋 Обзор

Документ описывает план реализации системы тела на основе:
- `body_review.md` v5.0 — Qi Buffer 90%, Core Capacity
- `body_armor.md` v5.0 — Level Suppression, 10 слоёв защиты
- `soul-system.md` v4.1 — Иерархия типов

---

## 1️⃣ КЛЮЧЕВЫЕ ИЗМЕНЕНИЯ

### 1.1 Qi Buffer 90% (РЕАЛИЗОВАТЬ)

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
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Level Suppression (РЕАЛИЗОВАТЬ)

```typescript
export const LEVEL_SUPPRESSION_TABLE = {
  0: { normal: 1.0, technique: 1.0, ultimate: 1.0 },
  1: { normal: 0.5, technique: 0.75, ultimate: 1.0 },
  2: { normal: 0.1, technique: 0.25, ultimate: 0.5 },
  3: { normal: 0.0, technique: 0.05, ultimate: 0.25 },
  4: { normal: 0.0, technique: 0.0, ultimate: 0.1 },
  5: { normal: 0.0, technique: 0.0, ultimate: 0.0 },
};
```

### 1.3 Обновлённый порядок защиты (10 СЛОЁВ)

```
СЛОЙ 1:  Исходный урон (techniqueDamage × qiDensity × gradeMult)
СЛОЙ 2:  ⭐ Level Suppression (по разнице уровней) — NEW!
СЛОЙ 3:  Определение части тела (rollBodyPart)
СЛОЙ 4:  Активная защита (dodge/parry/block)
СЛОЙ 5:  ⭐ Qi Buffer (90% или 100%)
СЛОЙ 6:  Покрытие брони (coverage check)
СЛОЙ 7:  Снижение бронёй (DR + penetration)
СЛОЙ 8:  Материал тела (scales, chitin, etc.)
СЛОЙ 9:  Распределение по HP (Kenshi-style)
СЛОЙ 10: Последствия (bleed, shock, death)
```

---

## 2️⃣ ФАЙЛЫ ДЛЯ РЕАЛИЗАЦИИ

### 2.1 Новые файлы

| Файл | Назначение | Приоритет |
|------|------------|-----------|
| `src/lib/constants/level-suppression.ts` | Таблица подавления | P0 |
| `src/lib/game/qi-buffer.ts` | Механика Qi Buffer | P0 |
| `src/lib/game/damage-pipeline.ts` | Полный pipeline | P0 |

### 2.2 Файлы для обновления

| Файл | Изменения | Приоритет |
|------|-----------|-----------|
| `src/lib/game/body-system.ts` | Интеграция pipeline | P0 |
| `src/lib/game/combat-system.ts` | Level Suppression | P0 |
| `src/lib/game/npc-damage-calculator.ts` | Level Suppression для NPC | P0 |

---

## 3️⃣ ПОШАГОВЫЙ ПЛАН РЕАЛИЗАЦИИ

### Этап 1: Level Suppression (P0)

**Файл:** `src/lib/constants/level-suppression.ts`

```typescript
// Шаг 1: Создать константы
export const LEVEL_SUPPRESSION_TABLE: Record<number, SuppressionValues> = {
  0: { normal: 1.0, technique: 1.0, ultimate: 1.0 },
  1: { normal: 0.5, technique: 0.75, ultimate: 1.0 },
  2: { normal: 0.1, technique: 0.25, ultimate: 0.5 },
  3: { normal: 0.0, technique: 0.05, ultimate: 0.25 },
  4: { normal: 0.0, technique: 0.0, ultimate: 0.1 },
  5: { normal: 0.0, technique: 0.0, ultimate: 0.0 },
};

// Шаг 2: Функция расчёта
export function calculateLevelSuppression(
  attackerLevel: number,
  defenderLevel: number,
  attackType: 'normal' | 'technique' | 'ultimate',
  techniqueLevel?: number
): number {
  let effectiveLevel = attackerLevel;
  if (attackType === 'technique' && techniqueLevel) {
    effectiveLevel = Math.max(attackerLevel, techniqueLevel);
  }
  
  const diff = Math.max(0, defenderLevel - effectiveLevel);
  const clamped = Math.min(5, diff);
  
  return LEVEL_SUPPRESSION_TABLE[clamped][attackType];
}
```

### Этап 2: Qi Buffer (P0)

**Файл:** `src/lib/game/qi-buffer.ts`

```typescript
export const QI_BUFFER_CONFIG = {
  baseQiAbsorptionRatio: 3.0,      // 1 урон = 3 Ци (raw)
  rawQiAbsorptionPercent: 0.90,    // 90% поглощение
  shieldTechniqueMultiplier: 1.0,  // 1 урон = 1 Ци (shield)
  shieldAbsorptionPercent: 1.0,    // 100% поглощение
  minQiForBuffer: 10,
};

export function processQiDamage(
  incomingDamage: number,
  currentQi: number,
  maxQi: number,
  hasShieldTechnique: boolean,
  config: typeof QI_BUFFER_CONFIG
): QiDamageResult {
  // Реализация механики 90% vs 100%
  // См. body_review.md секция 3.2
}
```

### Этап 3: Damage Pipeline (P0)

**Файл:** `src/lib/game/damage-pipeline.ts`

```typescript
export function processDamagePipeline(params: {
  rawDamage: number;
  attacker: AttackerStats;
  defender: DefenderStats;
  technique: Technique | null;
}): DamagePipelineResult {
  let damage = params.rawDamage;
  
  // СЛОЙ 2: Level Suppression
  const attackType = params.technique?.isUltimate ? 'ultimate' :
                     params.technique ? 'technique' : 'normal';
  damage *= calculateLevelSuppression(
    params.attacker.cultivationLevel,
    params.defender.cultivationLevel,
    attackType,
    params.technique?.level
  );
  
  // СЛОЙ 4: Активная защита
  if (tryDodge(params.defender)) return { avoided: 'dodge' };
  if (tryParry(params.defender)) damage *= (1 - blockPercent);
  
  // СЛОЙ 5: Qi Buffer
  const qiResult = processQiDamage(
    damage,
    params.defender.currentQi,
    params.defender.maxQi,
    params.defender.hasActiveShieldTechnique,
    QI_BUFFER_CONFIG
  );
  damage = qiResult.remainingDamage;
  
  // СЛОЙ 6-7: Броня
  // ...
  
  // СЛОЙ 8: Материал тела
  // ...
  
  // СЛОЙ 9: HP
  return applyDamageToLimb(part, damage);
}
```

---

## 4️⃣ КРИТЕРИИ ГОТОВНОСТИ

### Phase 1: Core Implementation

- [ ] `level-suppression.ts` создан
- [ ] `calculateLevelSuppression()` работает
- [ ] Unit тесты для Level Suppression проходят

### Phase 2: Qi Buffer

- [ ] `qi-buffer.ts` создан
- [ ] `processQiDamage()` работает с 90% механикой
- [ ] Щитовые техники дают 100% поглощение
- [ ] Unit тесты для Qi Buffer проходят

### Phase 3: Integration

- [ ] `damage-pipeline.ts` создан
- [ ] Интеграция с combat-system.ts
- [ ] Интеграция с npc-damage-calculator.ts
- [ ] Интеграционные тесты проходят

### Phase 4: UI

- [ ] BodyDoll отображает Qi Buffer
- [ ] DamageFlowDisplay показывает все слои
- [ ] QiBufferIndicator работает

---

## 5️⃣ ТЕСТИРОВАНИЕ

### Unit тесты

```typescript
describe('Level Suppression', () => {
  test('L7 vs L9 normal = 0', () => {
    expect(calculateLevelSuppression(7, 9, 'normal')).toBe(0.0);
  });
  
  test('L7 vs L9 technique = 0.05', () => {
    expect(calculateLevelSuppression(7, 9, 'technique')).toBe(0.05);
  });
  
  test('technique.level пробивает защиту', () => {
    expect(calculateLevelSuppression(7, 9, 'technique', 8)).toBe(0.25);
  });
});

describe('Qi Buffer 90%', () => {
  test('Raw Qi absorbs 90%, penetrates 10%', () => {
    const result = processQiDamage(1000, 5000, 10000, false, CONFIG);
    expect(result.absorbedDamage).toBe(900);
    expect(result.remainingDamage).toBe(100);
  });
  
  test('Shield absorbs 100%', () => {
    const result = processQiDamage(1000, 5000, 10000, true, CONFIG);
    expect(result.absorbedDamage).toBe(1000);
    expect(result.remainingDamage).toBe(0);
  });
});
```

### Интеграционные тесты

```typescript
describe('Full Damage Pipeline', () => {
  test('L9 technique vs L8 practitioner with armor', async () => {
    // Полный сценарий из body_armor.md
  });
});
```

---

## 6️⃣ ВРЕМЕННЫЕ РАМКИ

| Этап | Задачи | Оценка |
|------|--------|--------|
| 1 | Level Suppression | 1-2 часа |
| 2 | Qi Buffer | 2-3 часа |
| 3 | Damage Pipeline | 3-4 часа |
| 4 | UI обновления | 2-3 часа |
| 5 | Тестирование | 2 часа |
| **Итого** | | **10-14 часов** |

---

## 7️⃣ ЗАВИСИМОСТИ

```
level-suppression.ts (нет зависимостей)
        ↓
qi-buffer.ts (нет зависимостей)
        ↓
damage-pipeline.ts
    ├── level-suppression.ts
    ├── qi-buffer.ts
    ├── body-system.ts
    └── combat-system.ts
```

---

*План создан: 2026-03-22*
*Версия: 2.0*
*Статус: ✅ Теория завершена — готово к реализации*
