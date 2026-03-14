# PHASE 8: Hand Combat System

**PRIORITY:** P0 (CRITICAL)
**DEPENDS ON:** None
**TARGET:** Fix attack timeout + integrate stat-based damage

---

## PROBLEM

```typescript
// src/game/scenes/LocationScene.ts:800
private performAttack(): void {
  const attackDamage = 50; // ❌ Hardcoded
  // ❌ No cooldown check
  // ❌ No stat dependency
  // ❌ No technique integration
}
```

**Result:** Player can deal 1000+ damage by holding attack button.

---

## SOLUTION

### 1. Attack Cooldown (AGI-based)

```
cooldown = max(200ms, 1000ms - (AGI-10) * 15ms)
```

| AGI | Cooldown | Atk/sec |
|-----|----------|---------|
| 10  | 1000ms   | 1.0     |
| 30  | 700ms    | 1.43    |
| 50  | 400ms    | 2.5     |
| 70+ | 200ms    | 5.0     |

### 2. Hand Damage (STR-based)

```
handDamage = 3 + (STR-10) * 0.3
```

| STR | Damage |
|-----|--------|
| 10  | 3      |
| 30  | 9      |
| 50  | 15     |

### 3. Total Damage

```
totalDamage = handDamage + techniqueDamage
```

Technique damage uses existing `combat-system.ts` formulas.

---

## FILES

### CREATE: `src/lib/game/hand-combat.ts`

```typescript
/**
 * Hand Combat System
 * 
 * @see docs/combat-system.md
 * @see src/types/stat-development.ts
 */

import type { Technique } from '@/types/game';

// ==================== CONSTANTS ====================

export const BASE_HAND_DAMAGE = 3;
export const STRENGTH_DAMAGE_BONUS = 0.3;
export const BASE_ATTACK_COOLDOWN = 1000; // ms
export const MIN_ATTACK_COOLDOWN = 200;   // ms
export const AGILITY_COOLDOWN_BONUS = 15; // ms per AGI above 10

// ==================== FUNCTIONS ====================

export function calculateHandDamage(strength: number): number {
  const strBonus = Math.max(0, strength - 10) * STRENGTH_DAMAGE_BONUS;
  return Math.floor(BASE_HAND_DAMAGE + strBonus);
}

export function calculateAttackCooldown(agility: number): number {
  const agiBonus = Math.max(0, agility - 10) * AGILITY_COOLDOWN_BONUS;
  return Math.max(MIN_ATTACK_COOLDOWN, BASE_ATTACK_COOLDOWN - agiBonus);
}

export function calculateSlot1TechniqueDamage(
  technique: Technique | null,
  strength: number,
  mastery: number
): number {
  if (!technique || technique.subtype !== 'melee_strike') return 0;
  
  const baseDamage = technique.effects?.damage || 0;
  const strMultiplier = 1 + Math.max(0, strength - 10) * 0.05;
  const masteryMultiplier = 1 + (mastery / 100) * 0.3;
  
  return Math.floor(baseDamage * strMultiplier * masteryMultiplier);
}

// ==================== RESULT TYPE ====================

export interface HandAttackResult {
  damage: number;
  cooldown: number;
  handDamage: number;
  techniqueDamage: number;
  techniqueName: string | null;
  breakdown: string;
}

// ==================== MAIN FUNCTION ====================

export function calculateHandAttack(
  strength: number,
  agility: number,
  technique: Technique | null = null,
  mastery: number = 0
): HandAttackResult {
  const handDamage = calculateHandDamage(strength);
  const cooldown = calculateAttackCooldown(agility);
  const techniqueDamage = calculateSlot1TechniqueDamage(technique, strength, mastery);
  const damage = handDamage + techniqueDamage;
  const techniqueName = technique?.name || null;
  
  let breakdown = `hand:${handDamage}`;
  if (techniqueDamage > 0) breakdown += ` + tech:${techniqueDamage}`;
  breakdown += ` = ${damage}`;

  return { damage, cooldown, handDamage, techniqueDamage, techniqueName, breakdown };
}
```

---

### MODIFY: `src/game/scenes/LocationScene.ts`

**ADD IMPORTS:**
```typescript
import { calculateHandAttack, type HandAttackResult } from '@/lib/game/hand-combat';
```

**ADD CLASS PROPERTIES:**
```typescript
private lastAttackTime: number = 0;
private characterStats: { strength: number; agility: number } = { strength: 10, agility: 10 };
```

**REPLACE `performAttack()`:**
```typescript
private performAttack(): void {
  const now = Date.now();
  const attackResult = calculateHandAttack(
    this.characterStats.strength,
    this.characterStats.agility,
    null, // TODO: technique from slot 1
    0     // TODO: mastery
  );
  
  if (now - this.lastAttackTime < attackResult.cooldown) return;
  
  this.lastAttackTime = now;
  
  const attackRange = 150;
  const attackAngle = 60;
  
  for (const target of this.targets) {
    if (this.checkAttackHit(
      this.playerX, this.playerY, this.playerRotation,
      target.x, target.centerY, attackAngle, attackRange, target.hitboxRadius
    )) {
      this.damageTarget(target, attackResult.damage, 'normal');
    }
  }
  
  this.showAttackEffect(attackRange, attackAngle);
}
```

---

## VALIDATION

```bash
bun run lint
```

**Test:**
1. Enter LocationScene
2. Hold attack button
3. Expected: max 5 attacks/second (at AGI 70+)
4. Expected: damage varies by STR

---

## RELATED DOCS

- [docs/combat-system.md](../../combat-system.md) - Technique damage formulas
- [docs/technique-system.md](../../technique-system.md) - Slot 1 restrictions
- [docs/stat-threshold-system.md](../../stat-threshold-system.md) - Stat development

---

*END OF PHASE 8*
