# ФАЗА 6: Миграция на единую систему TickTimer — Анализ

**Статус:** ✅ АНАЛИЗ ЗАВЕРШЁН
**Дата создания:** 2026-03-24
**Риск:** 🟠 Высокий
**Зависимость:** Фаза 5 завершена
**Реализация:** → checkpoint_03_24_tick_timer_phase_7.md

---

## 🎯 ЦЕЛЬ ФАЗЫ

Мигрировать ВСЕ использования старой системы времени на новый TickTimer:
- Календарь (year/month/day/season)
- Медитация
- Отдых и сон
- Накопление Ци
- Запись в БД
- Phaser интеграция

---

## 🔍 КАРТА ТАЙМЕРОВ

### Новый TickTimer (Целевая система)

| Файл | Тип | Статус |
|------|-----|--------|
| `src/lib/tick-timer.ts` | setInterval | ✅ Основной |
| `src/stores/time.store.ts` | Zustand | ✅ Основной |
| `src/hooks/useTickTimer.ts` | React Hook | ✅ Основной |
| `src/game/scenes/LocationScene.ts` | game:tick | ✅ Основной |
| `src/components/game/TickTimerControls.tsx` | UI | ✅ Основной |

**События:** `game:tick`, `timer:start`, `timer:pause`, `timer:resume`, `timer:stop`

### Старая система (К миграции)

| Файл | Проблема |
|------|----------|
| `src/services/time-tick.service.ts` | ❌ НЕ интегрирован |
| `src/lib/game/time-system.ts` | ❌ Дублирует WorldTime |
| `src/lib/game/time-db.ts` | ❌ Прямая запись в БД |
| `src/lib/game/truth-system.ts` | ❌ Свои таймеры |
| `src/app/api/meditation/route.ts` | ❌ Два источника времени |
| `src/app/api/rest/route.ts` | ❌ НЕ связан с TickTimer |

---

## 🔄 ПОТОКИ ДАННЫХ

### Текущий (проблемный)

```
┌─ СТАРАЯ СИСТЕМА ─────────────────────────────────┐
│  Meditation API ──▶ advanceWorldTime() ──▶ DB   │
│        └──▶ TruthSystem.advanceTime() (memory)  │
└─────────────────────────────────────────────────┘

┌─ НОВАЯ СИСТЕМА (TickTimer) ─────────────────────┐
│  TickTimer ──▶ time.store ──▶ UI (React)       │
│       └──▶ game:tick ──▶ Phaser Scene          │
└─────────────────────────────────────────────────┘

❌ ДВЕ НЕСВЯЗАННЫЕ СИСТЕМЫ!
```

### Целевой

```
┌─ ЕДИНАЯ СИСТЕМА (TickTimer) ────────────────────┐
│  TickTimer (1 сек) ◀── ЕДИНСТВЕННЫЙ ИСТОЧНИК   │
│       │                                         │
│       ▼                                         │
│  time.store ──▶ UI + Phaser + Qi Effects       │
│       │                                         │
│       ▼                                         │
│  game:tick ──▶ TruthSystem ──▶ DB (batch)      │
│                                                 │
│  Meditation/Rest API ──▶ TickTimer.advance()   │
└─────────────────────────────────────────────────┘
```

---

## 📋 АНАЛИЗ ПОТРЕБИТЕЛЕЙ ВРЕМЕНИ

### 2.1 Медитация

**Проблема:** ДВА источника времени (БД + TruthSystem)

```typescript
// meditation/route.ts - текущий код
await advanceWorldTime(sessionId, minutes);  // БД
truthSystem.advanceTime(sessionId, minutes);  // память
```

**Решение:** Единый источник — time.store

---

### 2.2 Отдых и Сон

**Проблема:** processTimeTickEffects вызывается вручную из API

```typescript
// rest/route.ts - текущий код
await processTimeTickEffects({
  ticks: durationMinutes,
  restType: 'light' | 'sleep',
});
```

**Решение:** TickTimer с restType в store

---

### 2.3 Накопление Ци

**Проблема:** НЕ вызывается автоматически при тиках TickTimer

```typescript
// time-tick.service.ts - вызывается только вручную
export async function processTimeTickEffects(options)
```

**Решение:** QiTickProcessor для batch обработки

---

### 2.4 Календарь

**Проблема:** GameTime не имеет year/month/season

```typescript
// time.store.ts - текущий интерфейс
interface GameTime {
  totalMinutes, day, hour, minute
  // ❌ Нет year, month, season!
}

// time-system.ts - старый интерфейс
interface WorldTime {
  year, month, day, hour, minute, totalMinutes
  // ✅ Полная дата
}
```

**Решение:** Расширить GameTime до WorldTime

---

## ✅ СИСТЕМЫ БЕЗ ИЗМЕНЕНИЙ

Эти системы уже работают корректно:

| Файл | Метод | Статус |
|------|-------|--------|
| condition-manager.ts | tickConditions(deltaTime) | ✅ OK |
| condition-effects.ts | processTick(deltaTime) | ✅ OK |
| training-system.ts | processTrainingTick() | ✅ OK |
| bleeding-system.ts | processAllBleedings() | ✅ OK |

---

## ⚠️ РИСКИ

1. **Поломка медитации** — тестировать параллельно
2. **Рассинхронизация времени** — единая точка (time.store)
3. **Потеря данных** — backup БД перед миграцией

---

## 📂 ФАЙЛЫ

### Новые
- `src/lib/game/qi-tick-processor.ts`
- `src/app/api/qi/tick/route.ts`

### Изменяемые
- `src/stores/time.store.ts`
- `src/lib/tick-timer.ts`
- `src/lib/game/truth-system.ts`
- `src/app/api/meditation/route.ts`
- `src/app/api/rest/route.ts`

### Деактивируемые
- `src/services/time-tick.service.ts`
- `src/lib/game/time-system.ts`

---

**План реализации:** → `checkpoint_03_24_tick_timer_phase_7.md`

*Дата обновления:* 2026-03-24
