# ROADMAP: Порядок внедрения

**Для:** ИИ-агент
**Обновлено:** 2026-03-14

---

## COMPLETED PHASES

```
Phase 8 → Phase 9 → Phase 14 → Phase 7
```

| Phase | Description | Status | Completed |
|-------|-------------|--------|-----------|
| Phase 8 | Hand Combat System | ✅ DONE | 2026-03-14 |
| Phase 9 | Delta Development Integration | ✅ DONE | 2026-03-14 |
| Phase 14 | NPC Collision & Combat | ✅ DONE | 2026-03-14 |
| Phase 7 | UI Stats Components | ✅ DONE | 2026-03-14 |

---

## PENDING PHASES

```
Phase 15 → Phase 11 → Phase 10 → Phase 13
```

| Order | Phase | File | Priority | Status |
|-------|-------|------|----------|--------|
| 1 | Weapon & Armor System | [phase-15-weapon-armor-system.md](./phase-15-weapon-armor-system.md) | P1 | 📋 Planning |
| 2 | Combat Improvements | — | P1 | pending |
| 3 | Refactoring Duplicates | — | P2 | pending |
| 4 | Formations | — | P2 | pending |

---

## PHASE 15 SUBTASKS

```
Phase 15A → Phase 15B → Phase 15C → Phase 15D
```

| Subtask | Description | Priority |
|---------|-------------|----------|
| 15A | Базовая структура (types, prisma, durability) | P1 |
| 15B | Расчёт урона (damage-calculation, body-part-targeting) | P1 |
| 15C | Броня (armor-system, coverage, resistances) | P1 |
| 15D | Интеграция (LocationScene, UI) | P1 |

---

## REQUIRED DOCS

### Phase 15 (Weapon & Armor)
- [../equip.md](../equip.md) — Типы экипировки
- [../body.md](../body.md) — Система тела
- [../combat-system.md](../combat-system.md) — Боевая система
- [../DAMAGE_FORMULAS_PROPOSAL.md](../DAMAGE_FORMULAS_PROPOSAL.md) — Формулы урона
- [../technique-system.md](../technique-system.md) — Техники
- [../vitality-hp-system.md](../vitality-hp-system.md) — Vitality и HP

---

## VALIDATION

After each phase:

```bash
bun run lint
```

Expected: 0 errors

---

*END OF ROADMAP*
