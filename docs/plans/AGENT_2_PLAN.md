# 🤖 АГЕНТ 2 — ПЛАН РАБОТЫ

**Роль:** Аксессуары + Расходники + Камни Ци + Зарядники
**Ветка Git:** `feature/item-generators-agent2`
**Статус:** К выполнению

---

## ⚠️ ВАЖНО: НАЧАЛО РАБОТЫ

### Шаг 0: Прочитать документацию (ОБЯЗАТЕЛЬНО)

Перед началом работы прочитай следующие файлы:

```
1. docs/checkpoint29.md          — Основной план, интерфейсы
2. docs/id-system.md             — Система ID (префиксы AC, CS, QS, CH)
3. docs/qi_stone.md              — Камни Ци (БЕЗ качества!)
4. src/lib/generator/technique-generator.ts  — Референс архитектуры
5. src/lib/generator/technique-config.ts     — Референс конфигурации
6. src/components/settings/TechniqueGeneratorPanel.tsx — Референс UI
```

---

## 📋 ЗАДАЧИ

### Задача 1: Генератор аксессуаров

#### 1.1 Создать `src/lib/generator/accessory-generator.ts`

```typescript
// Генератор аксессуаров

// Префикс ID: AC (AC_000001, AC_000002, ...)

// Интерфейсы:
interface Accessory {
  id: string;                    // AC_XXXXXX
  name: string;
  slot: AccessorySlot;
  bonuses: {
    stats: {
      strength?: number;
      agility?: number;
      intelligence?: number;
      conductivity?: number;
    };
    special?: SpecialBonus[];
  };
  rarity: Rarity;
  upgradeFlags: number;          // 0-15 (битовое поле)
  setId?: string;
  isSetItem: boolean;
}

// Слоты аксессуаров:
type AccessorySlot =
  | 'ring_left_1'
  | 'ring_left_2'
  | 'ring_right_1'
  | 'ring_right_2'
  | 'amulet'
  | 'talisman_1'
  | 'talisman_2';

// Талисманы — ОСОБЫЕ:
interface Talisman extends Accessory {
  // ❌ НЕ добавляют Ци
  // ❌ НЕ дают бонусы к статам
  // ✅ Одноразовые
  // ✅ Минимальное время действия
  // ✅ Ситуативное использование
  
  effect: {
    type: TalismanEffectType;
    duration: number;       // секунды (минимальное)
    radius?: number;
  };
  isConsumable: true;
  maxUses: 1;
  currentUses: number;
}

type TalismanEffectType =
  | 'detection'       // Обнаружение
  | 'protection'      // Щит
  | 'enhancement'     // Восприятие
  | 'concealment'     // Сокрытие
  | 'barrier'         // Барьер
  | 'purification';   // Очистка

// Функции:
// - generateAccessory(options: AccessoryGenerationOptions): Accessory
// - generateAccessories(count: number, options?: AccessoryGenerationOptions): Accessory[]
// - generateTalisman(options: TalismanGenerationOptions): Talisman
```

#### 1.2 Создать `src/components/settings/AccessoryGeneratorPanel.tsx`

```typescript
// UI панель для генератора аксессуаров

// Включить:
// - Выбор типа (кольцо, амулет, талисман)
// - Для талисманов: выбор эффекта
// - Уровень
// - Редкость
// - Количество
// - Режим
// - Кнопки управления
```

---

### Задача 2: Генератор расходников

#### 2.1 Создать `src/lib/generator/consumable-generator.ts`

```typescript
// Генератор расходных материалов

// Префикс ID: CS (CS_000001, CS_000002, ...)

// ВАЖНО: Расходники НЕ добавляют Ци!

// Интерфейсы:
interface Consumable {
  id: string;                    // CS_XXXXXX
  name: string;
  type: ConsumableType;
  effect: {
    type: ConsumableEffectType;
    value: number;
    duration?: number;           // секунды
  };
  usage: {
    castTime: number;            // время использования
    cooldown?: number;
  };
  rarity: Rarity;
}

type ConsumableType = 
  | 'pill'      // Таблетки — кратковременные баффы
  | 'elixir'    // Эликсиры — долгосрочные эффекты
  | 'food'      // Еда — восстановление
  | 'scroll';   // Свитки — одноразовые эффекты

type ConsumableEffectType =
  | 'heal_hp'           // Восстановление здоровья
  | 'heal_stamina'      // Восстановление сил
  | 'buff_stat'         // Усиление характеристики
  | 'buff_resistance'   // Усиление сопротивления
  | 'cure'              // Лечение статуса
  | 'special';          // Особый эффект

// Функции:
// - generateConsumable(options: ConsumableGenerationOptions): Consumable
// - generateConsumables(count: number, options?: ConsumableGenerationOptions): Consumable[]
```

#### 2.2 Создать `src/components/settings/ConsumableGeneratorPanel.tsx`

```typescript
// UI панель для генератора расходников

// Включить:
// - Выбор типа (pill, elixir, food, scroll)
// - Выбор эффекта
// - Уровень
// - Редкость
// - Количество
// - Режим
// - Кнопки управления

// Отдельная секция: ПОЯС
// - Информация о системе пояса
// - До 4 слотов быстрого доступа
// - Активация: CTRL + цифра (1-4)
```

---

### Задача 3: Генератор камней Ци

#### 3.1 Создать `src/lib/generator/qi-stone-generator.ts`

```typescript
// Генератор камней Ци

// Префикс ID: QS (QS_000001, QS_000002, ...)

// ⚠️ ВАЖНО: Камни Ци БЕЗ качества!
// Только: объём Ци + тип (calm/chaotic)

// Интерфейсы:
interface QiStone {
  id: string;                    // QS_XXXXXX
  name: string;
  sizeClass: QiStoneSize;
  volumeCm3: number;
  surfaceCm2: number;
  totalQi: number;               // Полное содержание
  currentQi: number;             // Текущее
  type: 'calm' | 'chaotic';      // ЕДИНСТВЕННАЯ классификация
  isSealed: boolean;
}

type QiStoneSize =
  | 'dust'      // < 0.1 см³, < 102 ед Ци
  | 'fragment'  // 0.1 - 1 см³, 102 - 1024 ед
  | 'small'     // 1 - 8 см³, 1024 - 8192 ед
  | 'medium'    // 8 - 27 см³, 8192 - 27648 ед
  | 'large'     // 27 - 64 см³, 27648 - 65536 ед
  | 'huge'      // 64 - 125 см³, 65536 - 128000 ед
  | 'boulder';  // > 125 см³, > 128000 ед

// Формула: Ци = 1024 × объём_см³
// Плотность: 1024 ед/см³ (постоянная)

// Функции:
// - generateQiStone(options: QiStoneGenerationOptions): QiStone
// - generateQiStones(count: number, options?: QiStoneGenerationOptions): QiStone[]

// Параметры генерации:
interface QiStoneGenerationOptions {
  sizeClass?: QiStoneSize;       // или диапазон объёма
  type?: 'calm' | 'chaotic';
  count?: number;
  mode: 'replace' | 'append';
}
```

#### 3.2 Создать `src/components/settings/QiStoneGeneratorPanel.tsx`

```typescript
// UI панель для генератора камней Ци

// Включить:
// - Выбор размера (dust → boulder)
// - Выбор типа (calm / chaotic / оба)
// - Количество
// - Режим
// - Кнопки управления

// Информационная панель:
// - Объём Ци для каждого размера
// - Формула: Ци = 1024 × объём
// - Предупреждение о хаотичной Ци
```

---

### Задача 4: Генератор зарядников

#### 4.1 Создать `src/lib/generator/charger-generator.ts`

```typescript
// Генератор зарядников

// Префикс ID: CH (CH_000001, CH_000002, ...)

// ⚠️ ВАЖНО: Эффективность ≤ 100%!
// Сохранение Ци строго соблюдается!

// Интерфейсы:
interface Charger {
  id: string;                    // CH_XXXXXX
  name: string;
  capacity: number;              // Сколько камней вмещает
  efficiency: number;            // 0.5 - 1.0 (50% - 100%) — НИКОГДА > 100%!
  chargeRate: number;            // Скорость отдачи Ци (ед/сек)
  installed: boolean;
  installedStones: QiStone[];
  totalQiRemaining: number;
  requirements: {
    cultivationLevel?: number;
  };
  rarity: Rarity;
  upgradeFlags: number;          // 0-15
}

// Пример:
// Зарядник (efficiency = 80%):
// - Камень: 1000 ед Ци
// - Практик получит: 800 ед Ци
// - Потери: 200 ед Ци

// Функции:
// - generateCharger(options: ChargerGenerationOptions): Charger
// - generateChargers(count: number, options?: ChargerGenerationOptions): Charger[]

// Валидация:
// - efficiency ДОЛЖНА быть в диапазоне 0.5 - 1.0
// - При генерации проверять: efficiency <= 1.0
```

#### 4.2 Создать `src/components/settings/ChargerGeneratorPanel.tsx`

```typescript
// UI панель для генератора зарядников

// Включить:
// - Выбор ёмкости
// - Выбор эффективности (с ограничением ≤ 100%!)
// - Уровень
// - Редкость
// - Количество
// - Режим
// - Кнопки управления

// Предупреждение:
// - "Эффективность НЕ может быть больше 100% — это нарушает закон сохранения Ци!"
// - Показывать формулу потерь
```

---

## 🔧 GIT КОМАНДЫ

### Начало работы:
```bash
cd /home/z/my-project
git checkout -b feature/item-generators-agent2
```

### В процессе работы:
```bash
# После каждого завершённого файла
git add src/lib/generator/accessory-generator.ts
git commit -m "feat: add accessory-generator with talisman support"

git add src/lib/generator/consumable-generator.ts
git commit -m "feat: add consumable-generator"

# ... и так далее
```

### Завершение:
```bash
git push -u origin feature/item-generators-agent2
```

---

## 📋 ЧЕК-ЛИСТ

### Генератор аксессуаров:
- [ ] Прочитаны все референсные файлы
- [ ] Создан `accessory-generator.ts`
- [ ] Реализованы талисманы (особая логика)
- [ ] Создан `AccessoryGeneratorPanel.tsx`

### Генератор расходников:
- [ ] Создан `consumable-generator.ts`
- [ ] Расходники НЕ добавляют Ци
- [ ] Создан `ConsumableGeneratorPanel.tsx`
- [ ] Добавлена информация о поясе

### Генератор камней Ци:
- [ ] Прочитан `docs/qi_stone.md`
- [ ] Создан `qi-stone-generator.ts`
- [ ] Камни БЕЗ качества — только объём + тип
- [ ] Создан `QiStoneGeneratorPanel.tsx`

### Генератор зарядников:
- [ ] Создан `charger-generator.ts`
- [ ] Эффективность ≤ 100% (валидация!)
- [ ] Создан `ChargerGeneratorPanel.tsx`
- [ ] Добавлено предупреждение о сохранении Ци

### Git:
- [ ] Создана ветка `feature/item-generators-agent2`
- [ ] Все файлы закоммичены
- [ ] Push на GitHub выполнен

---

## ⚠️ ВАЖНЫЕ ОГРАНИЧЕНИЯ

1. **Камни Ци БЕЗ качества** — только объём + тип (calm/chaotic)
2. **Зарядники ≤ 100%** — сохранение Ци обязательно
3. **Расходники НЕ добавляют Ци** — это задача зарядников
4. **Талисманы одноразовые** — не дают бонусы к статам
5. **ID префиксы:** AC, CS, QS, CH
6. **Битовое поле upgradeFlags** — 0-15 (4 бита)

---

## 📁 СТРУКТУРА ФАЙЛОВ

```
src/lib/generator/
├── accessory-generator.ts       ← Создать
├── consumable-generator.ts      ← Создать
├── qi-stone-generator.ts        ← Создать
├── charger-generator.ts         ← Создать
└── technique-generator.ts       ← Существует (референс)

src/components/settings/
├── AccessoryGeneratorPanel.tsx  ← Создать
├── ConsumableGeneratorPanel.tsx ← Создать
├── QiStoneGeneratorPanel.tsx    ← Создать
├── ChargerGeneratorPanel.tsx    ← Создать
└── SettingsPanel.tsx            ← НЕ трогать (Агент 1 интегрирует)
```

---

## 🔗 СВЯЗАННЫЕ ФАЙЛЫ

- [PLAN_USER.md](./PLAN_USER.md) — План для пользователя
- [AGENT_1_PLAN.md](./AGENT_1_PLAN.md) — План для Агента 1
- [../checkpoint29.md](../checkpoint29.md) — Основной чекпоинт
- [../qi_stone.md](../qi_stone.md) — Документация камней Ци

---

*Документ создан: 2026-03-01*
