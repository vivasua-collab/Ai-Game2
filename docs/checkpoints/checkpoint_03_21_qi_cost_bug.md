# 🔴 КРИТИЧЕСКАЯ ОШИБКА: Формула затрат Ци

**Дата:** 2026-03-21 16:00:00 UTC
**Приоритет:** 🔴🔴🔴 КРИТИЧЕСКИЙ
**Статус:** ТРЕБУЕТСЯ НЕМЕДЛЕННОЕ ИСПРАВЛЕНИЕ

---

## 📋 СУТЬ ОШИБКИ

### Код (combat.ts:203)
```typescript
// ❌ НЕВЕРНО!
const baseQiInput = qiCost * qiDensity;
```

### Документация (technique-system-v2.md)
```
Практик L9 использует технику L2 (melee_strike)
  1 единица Ци практика L9 = 256 базового Ци
```

### Результат ошибки

| Практик | qiDensity | qiCost (L9) | baseQiInput в коде | baseQiInput правильно |
|---------|-----------|-------------|--------------------|-----------------------|
| L9 | 256 | 256 | **65536** ❌❌❌ | 256 |
| L5 | 16 | 50 | **800** ❌ | 16 |
| L1 | 1 | 10 | **10** ✅ | 1 |

**Ошибка:** `qiCost * qiDensity` вместо просто `qiDensity`!

---

## 📐 ПРАВИЛЬНАЯ ФОРМУЛА

### По документации

```
Практик вливает 1 единицу своего Ци = qiDensity базового Ци

baseQiInput = qiDensity  // НЕ qiCost × qiDensity!
```

### Что такое qiCost?

По generators.md:
```
qiCost = 10 × 1.5^(level-1)
```

Это **минимальное Ци практики** для использования техники!

**Проверка:**
```typescript
if (qiCost > currentQi) {
  // Недостаточно Ци!
}
```

**Правильно:** Практик L5 с 800 Ци может использовать L5 технику (qiCost=50), но не L9 (qiCost=256).

---

## ✅ ПРАВИЛЬНЫЙ КОД

### combat.ts

```typescript
// === 3. ПРОВЕРКА ДОСТАТОЧНОСТИ ЦИ ===
const qiCost = technique.qiCost ?? 0;  // Минимальное Ци для техники
const currentQi = session.character.currentQi;

if (qiCost > currentQi) {
  return { /* Недостаточно Ци */ };
}

// === 4. СПИСАНИЕ 1 ЕДИНИЦЫ ЦИ ===
// Практик тратит 1 единицу своего Ци
const qiSpent = 1;  // 1 единица Ци практика
truthSystem.spendQi(sessionId, qiSpent);

// === 5. РАСЧЁТ БАЗОВОГО ЦИ ===
// Практик вливает 1 единицу = qiDensity базового Ци
const baseQiInput = qiDensity;  // ✅ ПРАВИЛЬНО!

// === 6. ДЕСТАБИЛИЗАЦИЯ ===
const stability = checkDestabilizationWithBaseQi(baseQiInput, capacity);
```

### technique-capacity.ts

```typescript
export function checkDestabilizationWithBaseQi(
  baseQiInput: number,  // Вливаемое Ци в базовых единицах = qiDensity
  capacity: number,
  techniqueSubtype?: CombatSubtype
): DestabilizationResult {
  const safeLimit = capacity * 1.1;
  
  if (baseQiInput <= safeLimit) {
    return {
      isDestabilized: false,
      effectiveQi: baseQiInput,  // = qiDensity
      efficiency: 1.0,
    };
  }
  
  const excessQi = baseQiInput - capacity;
  
  return {
    isDestabilized: true,
    effectiveQi: capacity,
    efficiency: capacity / baseQiInput,
    backlashDamage: Math.floor(excessQi * 0.5),
    backlashQiLoss: excessQi,
    targetDamage: isMelee ? Math.floor(baseQiInput * 0.5) : 0,
  };
}
```

---

## 📊 ПРИМЕРЫ

### Сценарий 1: Нормальное использование

```
Практик L5 использует L5 melee_strike (capacity = 1024)

qiCost = 50 (минимум для L5)
currentQi = 800 (достаточно)
qiSpent = 1 единица Ци
baseQiInput = qiDensity = 16 базового Ци

capacity = 1024 > 16 → НЕТ дестабилизации
effectiveQi = 16
damage = 16 × 1.4 = 22 урона (L5 perfect)
```

### Сценарий 2: Дестабилизация

```
Практик L9 использует L3 melee_strike (capacity = 256)

qiCost = 22 (минимум для L3) — OK
qiSpent = 1 единица Ци
baseQiInput = qiDensity = 256 базового Ци

capacity = 256 = 256 → ГРАНИЦА!
effectiveQi = 256
damage = 256 × gradeMult
```

### Сценарий 3: Недостаточно Ци

```
Практик L5 с 30 Ци пытается использовать L5 технику

qiCost = 50
currentQi = 30
50 > 30 → ОТКАЗ! "Недостаточно Ци"
```

---

## 🔧 ФАЙЛЫ ДЛЯ ИСПРАВЛЕНИЯ

| Файл | Строка | Исправление |
|------|--------|-------------|
| `combat.ts` | 203 | `baseQiInput = qiDensity` |
| `combat.ts` | 186 | `spendQi(sessionId, 1)` |
| `technique-capacity.ts` | 282 | Убрать `* qiCost` |
| `technique-capacity.ts` | 276 | Изменить параметры функции |

---

## ⚠️ КОНЦЕПТУАЛЬНОЕ ИЗМЕНЕНИЕ

**Текущая логика (неверная):**
- qiCost = стоимость Ци в "игровых единицах"
- Списывается qiCost единиц Ци
- baseQiInput = qiCost × qiDensity

**Правильная логика:**
- qiCost = минимальный порог Ци практики
- Списывается 1 единица Ци практика
- baseQiInput = qiDensity (1 единица = qiDensity базового)

---

*Ошибка обнаружена: 2026-03-21*
*Требуется исправление: НЕМЕДЛЕННО*
