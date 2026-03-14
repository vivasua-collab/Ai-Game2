# ROADMAP: Порядок внедрения

**Для:** ИИ-агент
**Обновлено:** 2026-03-14

---

## ORDER

```
Phase 8 → Phase 9 → Phase 7
```

| Order | Phase | File | Priority |
|-------|-------|------|----------|
| 1 | Hand Combat | [phase-8-attack-system.md](./phase-8-attack-system.md) | P0 |
| 2 | Delta Integration | [phase-9-delta-integration.md](./phase-9-delta-integration.md) | P0 |
| 3 | UI Stats | [phase-7-ui.md](./phase-7-ui.md) | P2 |

---

## DEPENDENCIES

```
Phase 8 ──┬──▶ Phase 9 ──▶ Phase 7
          │
          └──▶ Phase 11
```

---

## REQUIRED DOCS (read before implementing)

### Phase 8 (Hand Combat)
- [../combat-system.md](../combat-system.md) — формулы урона
- [../technique-system.md](../technique-system.md) — типы техник

### Phase 9 (Delta Integration)
- [../stat-threshold-system.md](../stat-threshold-system.md) — пороги развития
- [../FUNCTIONS.md](../FUNCTIONS.md) — API функций

### Phase 7 (UI Stats)
- [../stat-threshold-system.md](../stat-threshold-system.md) — типы StatDevelopment

---

## FILES TO CREATE/MODIFY

| Phase | Action | File |
|-------|--------|------|
| 8 | CREATE | `src/lib/game/hand-combat.ts` |
| 8 | MODIFY | `src/game/scenes/LocationScene.ts` |
| 9 | MODIFY | `src/lib/game/event-bus/handlers/combat.ts` |
| 9 | CREATE | `src/lib/game/stat-truth.ts` |
| 9 | CREATE | `src/app/api/character/delta/route.ts` |
| 7 | CREATE | `src/components/stats/*.tsx` (5 файлов) |

---

## VALIDATION

After each phase:

```bash
bun run lint
```

Expected: 0 errors

---

*END OF ROADMAP*
