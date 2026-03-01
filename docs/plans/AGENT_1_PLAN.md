# 🤖 АГЕНТ 1 — ПЛАН РАБОТЫ

**Роль:** Интегратор + Базовая инфраструктура + Оружие/Экипировка
**Ветка Git:** `feature/item-generators-agent1`
**Статус:** К выполнению

---

## ⚠️ ВАЖНО: НАЧАЛО РАБОТЫ

### Шаг 0: Прочитать документацию (ОБЯЗАТЕЛЬНО)

Перед началом работы прочитай следующие файлы:

```
1. docs/checkpoint29.md          — Основной план, интерфейсы
2. docs/id-system.md             — Система ID (префиксы WP, AR)
3. src/lib/generator/technique-generator.ts  — Референс архитектуры
4. src/lib/generator/technique-config.ts     — Референс конфигурации
5. src/components/settings/TechniqueGeneratorPanel.tsx — Референс UI
```

---

## 📋 ЗАДАЧИ

### Задача 1: Базовая инфраструктура

#### 1.1 Создать `src/lib/generator/base-item-generator.ts`

```typescript
// Общие утилиты для всех генераторов предметов

// Включить:
// - seededRandom(seed: number) — детерминированный рандом
// - weightedSelect<T>(items: T[], rng: () => number) — выбор по весу
// - hashString(str: string) — хеширование строки
// - Rarity и RARITY_MULTIPLIERS (как в technique-generator)
// - GenerationResult интерфейс
// - GenerationOptions интерфейс (базовый)
```

#### 1.2 Создать `src/lib/generator/item-config.ts`

```typescript
// Конфигурация типов предметов

// Включить:
// - ItemType type
// - ITEM_SLOT type (для экипировки)
// - WEAPON_CATEGORY type
// - RARITY_INFO (как в technique-config.ts)
// - getItemTypeList() функция
// - getItemSlotList() функция
```

#### 1.3 Создать `src/lib/generator/name-generator.ts`

```typescript
// Генератор имён с учётом рода

// Включить:
// - Gender type ('male' | 'female' | 'neuter')
// - NAME_PARTS база (прилагательные + существительные по роду)
// - NameGenerator класс
// - generateName(type: ItemType, element?: Element, gender?: Gender): string

// ВАЖНО: "Холодный Клинок" ✓, "Холодный Вода" ✗
// Прилагательные должны согласовываться с родом существительного!
```

---

### Задача 2: Генератор оружия

#### 2.1 Создать `src/lib/generator/weapon-generator.ts`

```typescript
// Генератор оружия

// Префикс ID: WP (WP_000001, WP_000002, ...)

// Интерфейсы:
interface Weapon {
  id: string;                    // WP_XXXXXX
  name: string;
  nameEn: string;
  category: WeaponCategory;      // one_handed_blade, two_handed_blade, ...
  weaponType: WeaponType;        // sword, axe, spear, ...
  baseDamage: number;
  baseRange: number;             // в метрах
  attackSpeed: number;           // атаки в секунду
  requirements: {
    strength?: number;
    agility?: number;
    cultivationLevel?: number;
  };
  properties: {
    critChance: number;
    critDamage: number;
    armorPenetration: number;
  };
  rarity: Rarity;
  upgradeFlags: number;          // 0-15 (битовое поле)
  setId?: string;
  isSetItem: boolean;
}

// Функции:
// - generateWeapon(options: WeaponGenerationOptions): Weapon
// - generateWeapons(count: number, options?: WeaponGenerationOptions): Weapon[]
// - Использовать name-generator для имён
```

#### 2.2 Создать `src/components/settings/WeaponGeneratorPanel.tsx`

```typescript
// UI панель для генератора оружия
// Аналог TechniqueGeneratorPanel.tsx

// Включить:
// - Выбор категории оружия
// - Выбор типа оружия (опционально)
// - Уровень (1-9 или все)
// - Редкость
// - Количество
// - Режим (replace/append)
// - Кнопки "Сгенерировать" и "Очистить"
```

---

### Задача 3: Генератор экипировки

#### 3.1 Создать `src/lib/generator/armor-generator.ts`

```typescript
// Генератор экипировки (брони)

// Префикс ID: AR (AR_000001, AR_000002, ...)

// Интерфейсы:
interface Armor {
  id: string;                    // AR_XXXXXX
  name: string;
  slot: EquipmentSlot;           // head, torso, legs, feet, hands_gloves, hands_bracers
  defense: {
    physical: number;
    qi: number;
    elemental: Record<Element, number>;
  };
  stats: {
    strength?: number;
    agility?: number;
    conductivity?: number;
  };
  requirements: {
    cultivationLevel?: number;
  };
  rarity: Rarity;
  upgradeFlags: number;          // 0-15
  setId?: string;
  isSetItem: boolean;
}

type EquipmentSlot =
  | 'head'
  | 'torso'
  | 'legs'
  | 'feet'
  | 'hands_gloves'
  | 'hands_bracers';

// Функции:
// - generateArmor(options: ArmorGenerationOptions): Armor
// - generateArmors(count: number, options?: ArmorGenerationOptions): Armor[]
```

#### 3.2 Создать `src/components/settings/ArmorGeneratorPanel.tsx`

```typescript
// UI панель для генератора экипировки

// Включить:
// - Выбор слота (head, torso, legs, feet, hands_gloves, hands_bracers)
// - Уровень
// - Редкость
// - Количество
// - Режим
// - Кнопки управления
```

---

### Задача 4: Интеграция в UI

#### 4.1 Обновить `src/components/settings/SettingsPanel.tsx`

```typescript
// Добавить вкладки для новых генераторов

// В меню "Создание" добавить:
// - Оружие (WeaponGeneratorPanel)
// - Экипировка (ArmorGeneratorPanel)

// Структура вкладок:
// 1. Техники (существует)
// 2. Оружие (новое)
// 3. Экипировка (новое)
// 4. Аксессуары (пока заглушка — Агент 2)
// 5. Расходники (пока заглушка — Агент 2)
// 6. Камни Ци (пока заглушка — Агент 2)
// 7. Зарядники (пока заглушка — Агент 2)
```

---

## 🔧 GIT КОМАНДЫ

### Начало работы:
```bash
cd /home/z/my-project
git checkout -b feature/item-generators-agent1
```

### В процессе работы:
```bash
# После каждого завершённого файла
git add src/lib/generator/base-item-generator.ts
git commit -m "feat: add base-item-generator with common utilities"

git add src/lib/generator/item-config.ts
git commit -m "feat: add item-config with types and configurations"

# ... и так далее
```

### Завершение:
```bash
git push -u origin feature/item-generators-agent1
```

---

## 📋 ЧЕК-ЛИСТ

### Базовая инфраструктура:
- [ ] Прочитаны все референсные файлы
- [ ] Создан `base-item-generator.ts`
- [ ] Создан `item-config.ts`
- [ ] Создан `name-generator.ts` (с учётом рода!)

### Генератор оружия:
- [ ] Создан `weapon-generator.ts`
- [ ] Создан `WeaponGeneratorPanel.tsx`
- [ ] Протестирована генерация

### Генератор экипировки:
- [ ] Создан `armor-generator.ts`
- [ ] Создан `ArmorGeneratorPanel.tsx`
- [ ] Протестирована генерация

### Интеграция:
- [ ] Обновлён `SettingsPanel.tsx`
- [ ] Добавлены вкладки в меню "Создание"
- [ ] Добавлены заглушки для Агента 2

### Git:
- [ ] Создана ветка `feature/item-generators-agent1`
- [ ] Все файлы закоммичены
- [ ] Push на GitHub выполнен

---

## ⚠️ ВАЖНЫЕ ОГРАНИЧЕНИЯ

1. **НЕ использовать Event Bus** — генераторы работают в React
2. **Битовое поле upgradeFlags** — 0-15 (4 бита)
3. **ID префиксы:** WP для оружия, AR для экипировки
4. **Сетка setId/isSetItem** — заглушки для будущего
5. **Род слов** — согласовывать прилагательные с существительными!

---

## 📁 СТРУКТУРА ФАЙЛОВ

```
src/lib/generator/
├── base-item-generator.ts      ← Создать
├── name-generator.ts           ← Создать
├── item-config.ts              ← Создать
├── weapon-generator.ts         ← Создать
├── armor-generator.ts          ← Создать
└── technique-generator.ts      ← Существует (референс)

src/components/settings/
├── WeaponGeneratorPanel.tsx    ← Создать
├── ArmorGeneratorPanel.tsx     ← Создать
└── SettingsPanel.tsx           ← Обновить
```

---

## 🔄 ПОСЛЕ СЛИЯНИЯ (ЭТАП 3)

После того как ветка Агента 2 будет слита в твою ветку:

1. Выполнить `git pull` для получения кода Агента 2
2. Разрешить конфликты (если есть)
3. Интегрировать ВСЕ генераторы в меню "Создание"
4. Проверить импорты и зависимости
5. Протестировать UI
6. Push финальной версии
7. Создать Pull Request в main

---

## 🔗 СВЯЗАННЫЕ ФАЙЛЫ

- [PLAN_USER.md](./PLAN_USER.md) — План для пользователя
- [AGENT_2_PLAN.md](./AGENT_2_PLAN.md) — План для Агента 2
- [../checkpoint29.md](../checkpoint29.md) — Основной чекпоинт

---

*Документ создан: 2026-03-01*
