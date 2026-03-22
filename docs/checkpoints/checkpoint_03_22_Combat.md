# ⚔️ План: Боевая система v4.0

**Дата:** 2026-03-22
**Версия:** 1.0
**Статус:** 📋 Планирование

---

## 📋 Обзор

Документ описывает план интеграции Level Suppression и Qi Buffer в боевую систему.

---

## 1️⃣ ИЕРАРХИЯ ОБНОВЛЕНИЙ

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ИЕРАРХИЯ БОЕВОЙ СИСТЕМЫ                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  УРОВЕНЬ 1: Константы (новые)                                       │
│  ├── level-suppression.ts — Таблица подавления                      │
│  └── qi-buffer-config.ts — Конфигурация буфера                      │
│                                                                      │
│  УРОВЕНЬ 2: Функции расчёта                                         │
│  ├── calculateLevelSuppression() — Расчёт множителя                 │
│  ├── processQiDamage() — Обработка Qi Buffer                        │
│  └── processDamagePipeline() — Полный pipeline                      │
│                                                                      │
│  УРОВЕНЬ 3: Интеграция                                              │
│  ├── combat-system.ts — Интеграция player combat                    │
│  └── npc-damage-calculator.ts — Интеграция NPC combat               │
│                                                                      │
│  УРОВЕНЬ 4: API и UI                                                │
│  ├── /api/combat/damage — Эндпоинт расчёта                          │
│  └── DamageFlowDisplay.tsx — Визуализация                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ НОВЫЕ ФАЙЛЫ

### 2.1 level-suppression.ts

**Расположение:** `src/lib/constants/level-suppression.ts`

```typescript
export type AttackType = 'normal' | 'technique' | 'ultimate';

export interface SuppressionValues {
  normal: number;
  technique: number;
  ultimate: number;
}

export const LEVEL_SUPPRESSION_TABLE: Record<number, SuppressionValues> = {
  0: { normal: 1.0, technique: 1.0, ultimate: 1.0 },
  1: { normal: 0.5, technique: 0.75, ultimate: 1.0 },
  2: { normal: 0.1, technique: 0.25, ultimate: 0.5 },
  3: { normal: 0.0, technique: 0.05, ultimate: 0.25 },
  4: { normal: 0.0, technique: 0.0, ultimate: 0.1 },
  5: { normal: 0.0, technique: 0.0, ultimate: 0.0 },
};

export function calculateLevelSuppression(
  attackerLevel: number,
  defenderLevel: number,
  attackType: AttackType,
  techniqueLevel?: number
): number {
  let effectiveLevel = attackerLevel;
  
  // Для техник: technique.level может пробить защиту
  if (attackType === 'technique' && techniqueLevel) {
    effectiveLevel = Math.max(attackerLevel, techniqueLevel);
  }
  
  const diff = Math.max(0, defenderLevel - effectiveLevel);
  const clamped = Math.min(5, diff);
  
  return LEVEL_SUPPRESSION_TABLE[clamped][attackType];
}
```

### 2.2 qi-buffer-config.ts

**Расположение:** `src/lib/constants/qi-buffer-config.ts`

```typescript
export const QI_BUFFER_CONFIG = {
  // Сырая Ци
  baseQiAbsorptionRatio: 3.0,      // 1 урон = 3 Ци
  rawQiAbsorptionPercent: 0.90,    // 90% поглощение
  
  // Щитовая техника
  shieldTechniqueMultiplier: 1.0,  // 1 урон = 1 Ци
  shieldAbsorptionPercent: 1.0,    // 100% поглощение
  
  // Минимум
  minQiForBuffer: 10,
} as const;
```

---

## 3️⃣ ОБНОВЛЕНИЕ combat-system.ts

### 3.1 Интеграция Level Suppression

**Файл:** `src/lib/game/combat-system.ts`

```typescript
import { calculateLevelSuppression } from '@/lib/constants/level-suppression';

export function calculateTechniqueDamageFull(params: {
  // ... existing params
}): CombatDamageResult {
  // ... existing damage calculation ...
  
  // ⭐ НОВОЕ: Level Suppression
  const attackType = technique?.isUltimate ? 'ultimate' :
                     technique ? 'technique' : 'normal';
  
  const suppression = calculateLevelSuppression(
    attacker.cultivationLevel,
    defender.cultivationLevel,
    attackType,
    technique?.level
  );
  
  finalDamage *= suppression;
  
  // ... continue with Qi Buffer, armor, etc.
}
```

### 3.2 Интеграция Qi Buffer

```typescript
import { processQiDamage, QI_BUFFER_CONFIG } from '@/lib/game/qi-buffer';

export function calculateTechniqueDamageFull(params: {
  // ...
}): CombatDamageResult {
  // ... after Level Suppression ...
  
  // ⭐ Qi Buffer (только для техник Ци)
  if (isQiTechnique && defender.currentQi > QI_BUFFER_CONFIG.minQiForBuffer) {
    const qiResult = processQiDamage(
      finalDamage,
      defender.currentQi,
      defender.maxQi,
      defender.hasActiveShieldTechnique,
      QI_BUFFER_CONFIG
    );
    
    qiConsumed = qiResult.qiConsumed;
    finalDamage = qiResult.remainingDamage;  // 10% или 0
  }
  
  // ... continue with armor ...
}
```

---

## 4️⃣ ОБНОВЛЕНИЕ npc-damage-calculator.ts

### 4.1 Интеграция Level Suppression

**Файл:** `src/lib/game/npc-damage-calculator.ts`

```typescript
import { calculateLevelSuppression } from '@/lib/constants/level-suppression';

export function calculateDamageFromNPC(params: {
  npc: GeneratedNPC;
  technique: Technique | null;
  target: PlayerStats;
  // ...
}): DamageResult {
  // ... existing calculation ...
  
  // ⭐ НОВОЕ: Level Suppression
  const attackType = technique?.isUltimate ? 'ultimate' :
                     technique ? 'technique' : 'normal';
  
  const suppression = calculateLevelSuppression(
    params.npc.cultivation.level,
    params.target.cultivationLevel,
    attackType,
    technique?.level
  );
  
  finalDamage *= suppression;
  
  // ... Qi Buffer игрока ...
  
  return {
    damage: Math.floor(finalDamage),
    qiConsumed,
    suppression,  // Для логирования
  };
}
```

---

## 5️⃣ AOE ОБРАБОТКА

### 5.1 Индивидуальное подавление

```typescript
export function processAOEAttack(params: {
  attacker: Character;
  targets: Character[];
  technique: Technique;
  // ...
}): Map<string, DamageResult> {
  const results = new Map();
  
  for (const target of params.targets) {
    // Базовый урон
    let damage = calculateBaseDamage(params.technique, params.attacker);
    
    // Дистанция
    const distance = getDistance(params.attacker, target);
    const distanceMult = getDistanceMultiplier(distance, params.technique);
    damage *= distanceMult;
    
    // ⭐ ИНДИВИДУАЛЬНОЕ ПОДАВЛЕНИЕ
    const suppression = calculateLevelSuppression(
      params.attacker.cultivationLevel,
      target.cultivationLevel,
      params.technique.isUltimate ? 'ultimate' : 'technique',
      params.technique.level
    );
    damage *= suppression;
    
    // Остальные слои
    results.set(target.id, processRemainingLayers(damage, target));
  }
  
  return results;
}
```

---

## 6️⃣ API ЭНДПОИНТ

### 6.1 /api/combat/damage

**Файл:** `src/app/api/combat/damage/route.ts`

```typescript
import { calculateTechniqueDamageFull } from '@/lib/game/combat-system';
import { processAOEAttack } from '@/lib/game/damage-pipeline';

export async function POST(request: Request) {
  const body = await request.json();
  const { attackerId, targetIds, techniqueId, qiSpent } = body;
  
  // Загрузка данных
  const attacker = await loadCharacter(attackerId);
  const technique = await loadTechnique(techniqueId);
  
  if (targetIds.length === 1) {
    // Одиночная атака
    const target = await loadCharacter(targetIds[0]);
    const result = calculateTechniqueDamageFull({
      attacker, target, technique, qiSpent
    });
    return Response.json(result);
  } else {
    // AOE атака
    const targets = await Promise.all(
      targetIds.map(id => loadCharacter(id))
    );
    const results = processAOEAttack({ attacker, targets, technique });
    return Response.json(Object.fromEntries(results));
  }
}
```

---

## 7️⃣ ПОРЯДОК РЕАЛИЗАЦИИ

| Этап | Файл | Задачи | Приоритет |
|------|------|--------|-----------|
| 1 | `level-suppression.ts` | Создать константы | P0 |
| 2 | `qi-buffer-config.ts` | Создать конфиг | P0 |
| 3 | `combat-system.ts` | Интегрировать suppression | P0 |
| 4 | `combat-system.ts` | Интегрировать Qi Buffer | P0 |
| 5 | `npc-damage-calculator.ts` | Интегрировать suppression | P0 |
| 6 | `/api/combat/damage` | Создать эндпоинт | P1 |

---

## 8️⃣ ТЕСТИРОВАНИЕ

### Unit тесты

```typescript
describe('Combat System with Level Suppression', () => {
  test('L7 attacker vs L9 defender (normal) = 0 damage', () => {
    const result = calculateTechniqueDamageFull({
      attacker: { cultivationLevel: 7 },
      defender: { cultivationLevel: 9 },
      technique: null,  // normal attack
    });
    expect(result.damage).toBe(0);
  });
  
  test('L7 attacker vs L9 defender (technique) = 5% damage', () => {
    const result = calculateTechniqueDamageFull({
      attacker: { cultivationLevel: 7 },
      defender: { cultivationLevel: 9 },
      technique: { level: 7, isUltimate: false },
      baseDamage: 1000,
    });
    expect(result.damage).toBeCloseTo(50, 0);  // 1000 × 0.05
  });
  
  test('technique.level пробивает защиту', () => {
    const result = calculateTechniqueDamageFull({
      attacker: { cultivationLevel: 7 },
      defender: { cultivationLevel: 9 },
      technique: { level: 8, isUltimate: false },
      baseDamage: 1000,
    });
    expect(result.damage).toBeCloseTo(250, 0);  // 1000 × 0.25
  });
});
```

---

## 9️⃣ КРИТЕРИИ ГОТОВНОСТИ

- [ ] Level Suppression работает для всех типов атак
- [ ] Qi Buffer работает с механикой 90%
- [ ] technique.level влияет на пробитие
- [ ] Ultimate-техники пробивают +4 уровня
- [ ] AOE атаки применяют индивидуальное подавление
- [ ] Unit тесты проходят
- [ ] Интеграционные тесты проходят

---

*План создан: 2026-03-22*
*Версия: 1.0*
*Статус: 📋 Планирование — запуск после генераторов*
