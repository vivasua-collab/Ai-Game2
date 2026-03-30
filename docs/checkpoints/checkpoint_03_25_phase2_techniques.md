# ФАЗА 2: Techniques - Серверная Миграция Техник

**Версия:** 2.0
**Дата:** 2026-03-25
**Статус:** ✅ РЕАЛИЗОВАНО (адаптировано под HTTP API, WebSocket удалён)
**Приоритет:** 🟠 ВЫСОКИЙ
**Время:** 2-3 дня
**Зависимости:** Фаза 1 (Combat API) ✅

---

## 🎯 ЦЕЛЬ ФАЗЫ

Перенести расчёт и применение техник на сервер. Qi списывается ТОЛЬКО на сервере. Клиент отправляет только намерение использовать технику.

### Принцип

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ПРИНЦИП TECHNIQUE SERVICE (HTTP API)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ДО (НЕПРАВИЛЬНО):                                                         │
│   Клиент: "Использую технику, Qi -= 50, урон = 100"                        │
│   ⚠️ ЧИТ: подмена Qi и урона на клиенте                                    │
│                                                                             │
│   ПОСЛЕ (ПРАВИЛЬНО - HTTP API):                                            │
│   Клиент: POST /api/combat { action: 'technique:use', ... }               │
│   Сервер: "Проверяю Qi → Списываю Qi → Рассчитываю урон → Возвращаю"       │
│   ✅ Qi и урон рассчитываются ТОЛЬКО на сервере                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ РЕАЛИЗОВАНО

### 1. CombatService.useTechnique() — Готово!

**Файл:** `src/lib/game/server/combat/combat-service.ts`

Метод уже реализован:
- ✅ Рассчитывает qiCost
- ✅ Проверяет currentQi >= qiCost
- ✅ Списывает Qi
- ✅ Рассчитывает урон через DamageCalculator
- ✅ Возвращает damage, currentQi, projectile

### 2. Combat API Endpoint — Готово!

**Файл:** `src/app/api/combat/route.ts`

```typescript
// POST /api/combat
{
  action: 'technique:use',
  sessionId: string,
  characterId: string,
  techniqueId: string,
  techniqueLevel: number,
  techniqueGrade: 'common' | 'refined' | 'perfect' | 'transcendent',
  techniqueType: string,
  combatSubtype?: CombatSubtype,
  element: string,
  mastery: number,
  targetX: number,
  targetY: number,
  attackerX: number,
  attackerY: number,
  cultivationLevel: number,
  currentQi: number,
  maxQi: number,
  isUltimate?: boolean,
}

// Response
{
  success: boolean,
  reason?: string,
  damage?: number,
  currentQi?: number,   // Важное Qi ПОСЛЕ списания
  projectile?: {...},
  qiCost?: number,
  techniqueData?: {...},
}
```

### 3. TechniqueSlotsManager — Адаптирован!

**Файл:** `src/game/services/TechniqueSlotsManager.ts`

Изменения:
- ✅ УБРАНО локальное списание Qi (`this.characterQi -= qiCost`)
- ✅ УБРАН локальный расчёт урона (`calculateDamage()`)
- ✅ ДОБАВЛЕН HTTP запрос к /api/combat
- ✅ Qi обновляется из ответа сервера
- ✅ damage приходит от сервера

---

## 📁 АРХИТЕКТУРА (HTTP Only)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    КЛИЕНТ (Phaser)                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   TechniqueSlotsManager.use()                                       │
│   │                                                                  │
│   ├─ 1. Проверка кулдауна (локально)                               │
│   │                                                                  │
│   └─► POST /api/combat { action: 'technique:use', ... }            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    СЕРВЕР (Next.js API)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   CombatService.useTechnique()                                      │
│   │                                                                  │
│   ├─ 1. Рассчитать qiCost                                          │
│   ├─ 2. Проверить currentQi >= qiCost                              │
│   ├─ 3. Списать Qi (update character)                              │
│   ├─ 4. Рассчитать урон (DamageCalculator)                        │
│   ├─ 5. Создать данные снаряда                                      │
│   └─ 6. Вернуть результат                                          │
│                                                                      │
│   Response: { success, damage, currentQi, projectile }             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    КЛИЕНТ (получение ответа)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   result = await response.json()                                   │
│   │                                                                  │
│   ├─ this.characterQi = result.currentQi                           │
│   ├─ damage = result.damage                                         │
│   └─ Создать снаряд с данными от сервера                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🧪 МЕТОДЫ ТЕСТИРОВАНИЯ

### Тест 1: Qi списание на сервере

**Цель:** Убедиться, что Qi списывается на сервере

**Метод:**
1. Записать текущее Qi (например, 200)
2. Использовать технику с qiCost = 50
3. Проверить response → `currentQi`

**Критерий:**
- ✅ `currentQi` в ответе = 150
- ✅ UI Qi бара обновляется от сервера
- ❌ Нет `this.characterQi -=` на клиенте (УБРАНО!)

### Тест 2: Урон техники на сервере

**Цель:** Убедиться, что урон техники рассчитывается на сервере

**Метод:**
1. Использовать технику
2. Проверить response → `damage`
3. Проверить `combat:hit` → `CombatResult`

**Критерий:**
- ✅ `damage` приходит от сервера
- ✅ Урон зависит от mastery, conductivity (проверить формулу)
- ❌ Нет расчёта урона на клиенте (УБРАНО!)

### Тест 3: Невозможность подмены Qi

**Цель:** Убедиться, что клиент не может подделать Qi

**Метод:**
1. Изменить `qiInput` в запросе
2. Проверить, что сервер игнорирует `qiInput` если он > qiCost
3. Проверить, что Qi списывается корректно

**Критерий:**
- ✅ Сервер проверяет `qiInput <= character.currentQi`
- ✅ Сервер использует `qiInput` только если <= qiCost
- ❌ Нельзя использовать технику без Qi

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ ФАЗЫ 2

### Обязательные

- [x] CombatService.useTechnique() реализован
- [x] Combat API обрабатывает `technique:use`
- [x] Qi списывается ТОЛЬКО на сервере
- [x] Урон техники рассчитывается на сервере
- [x] TechniqueSlotsManager использует HTTP API

### Код ревью

- [x] Нет `this.characterQi -=` на клиенте (УБРАНО!)
- [x] Нет локального `calculateDamage()` в TechniqueSlotsManager (УБРАНО!)
- [x] Все расчёты в `src/lib/game/server/`
- [x] technique:use не принимает `damage` от клиента

### Проверка через логи

```
[CLIENT] POST /api/combat { action: 'technique:use', techniqueId: 'fireball_1' }
[SERVER] CombatService.useTechnique: techniqueId=fireball_1
[SERVER] Qi check: 150 >= 50 ✓
[SERVER] Damage calculated: 47
[CLIENT] Technique used: 47 damage, Qi: 100
```

---

## 📊 ПРОГРЕСС

| Задача | Статус | Время |
|--------|--------|-------|
| CombatService.useTechnique() | ✅ | Уже было |
| Combat API endpoint | ✅ | Уже было |
| TechniqueSlotsManager адаптация | ✅ | 2 часа |
| Тестирование | 📋 | 1 час |

**Итого:** ~3 часа (вместо 14 часов благодаря готовому CombatService!)

---

## 🚀 СЛЕДУЮЩАЯ ФАЗА

После завершения Фазы 2 → [checkpoint_03_25_phase3_ai.md](./checkpoint_03_25_phase3_ai.md)

---

*Документ обновлён: 2026-03-25*
*Адаптирован под HTTP API (WebSocket удалён)*
