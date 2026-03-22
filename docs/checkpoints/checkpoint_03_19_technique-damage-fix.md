# 🔧 Checkpoint: Исправление формулы базового урона техник

**Дата:** 2026-03-19
**Статус:** ✅ Документация исправлена

---

## ✅ ВЫПОЛНЕННОЕ

### Документация

**Файл:** `docs/technique-system-v2.md`

- [x] Раздел 5.1: Базовый урон = затраченное Ци
- [x] Раздел 5.2: Таблица множителей урона
- [x] Раздел 5.3: Формула итогового урона с примером
- [x] Раздел 8: Обновлённая иерархия расчёта (10 шагов)
- [x] Раздел 8.2: Ключевой принцип ("диаметр трубы")
- [x] Раздел 9: Обновлённые примеры с effectiveQi

---

## 📝 Формула (исправленная)

```
finalDamage = effectiveQi × gradeMult × qiDensity × masteryMult × statMult

Где:
- effectiveQi = min(qiSpent, capacity)
- capacity = 50 × 2^(techniqueLevel-1) × masteryBonus
- gradeMult = 0.8 | 1.0 | 1.25 | 1.6
- qiDensity = 2^(cultivationLevel - 1)
- masteryMult = 1 + (mastery/100) × 0.5
```

---

*Чекпоинт завершён: 2026-03-19*
