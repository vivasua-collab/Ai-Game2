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

### Задача 4: Интеграция в UI (ЧАСТИЧНО)

#### 4.1 Обновить `src/components/settings/SettingsPanel.tsx`

```typescript
// Добавить вкладки для своих генераторов

// В меню "Создание" добавить:
// - Оружие (WeaponGeneratorPanel)
// - Экипировка (ArmorGeneratorPanel)

// Структура вкладок ПОСЛЕ твоей работы:
// 1. Техники (существует)
// 2. Оружие (новое)
// 3. Экипировка (новое)
// 4. Аксессуары (заглушка — Агент 2)
// 5. Расходники (заглушка — Агент 2)
// 6. Камни Ци (заглушка — Агент 2)
// 7. Зарядники (заглушка — Агент 2)

// ⚠️ ФИНАЛЬНУЮ интеграцию ВСЕХ генераторов сделать ПОСЛЕ слияния с Агентом 2!
```

---

## 🔧 GIT КОМАНДЫ

### Начало работы:

```bash
# 1. Перейти в директорию проекта
cd /home/z/my-project

# 2. Получить актуальный код
git fetch origin
git checkout main2d3
git pull origin main2d3

# 3. Создать свою ветку от main2d3
git checkout -b feature/item-generators-agent1
```

### В процессе работы:

```bash
# После каждого завершённого файла делай коммит:

git add src/lib/generator/base-item-generator.ts
git commit -m "feat: add base-item-generator with common utilities"

git add src/lib/generator/item-config.ts
git commit -m "feat: add item-config with types and configurations"

git add src/lib/generator/name-generator.ts
git commit -m "feat: add name-generator with gender support"

git add src/lib/generator/weapon-generator.ts
git commit -m "feat: add weapon-generator"

git add src/components/settings/WeaponGeneratorPanel.tsx
git commit -m "feat: add WeaponGeneratorPanel UI"

git add src/lib/generator/armor-generator.ts
git commit -m "feat: add armor-generator"

git add src/components/settings/ArmorGeneratorPanel.tsx
git commit -m "feat: add ArmorGeneratorPanel UI"

git add src/components/settings/SettingsPanel.tsx
git commit -m "feat: integrate weapon and armor generators in settings"
```

### Завершение работы (PUSH):

```bash
# ВАЖНО: Использовать токен для авторизации!

# Вариант A: Push с токеном в URL
git push https://ghp_ВАШ_ТОКЕН@github.com/vivasua-collab/Ai-Game2.git feature/item-generators-agent1

# После успешного push удалить токен из remote:
git remote set-url origin https://github.com/vivasua-collab/Ai-Game2.git
```

### ⚠️ После push СООБЩИ ПОЛЬЗОВАТЕЛЮ:

```
✅ АГЕНТ 1 ЗАВЕРШИЛ РАБОТУ

Ветка: feature/item-generators-agent1
Файлы:
- base-item-generator.ts
- item-config.ts
- name-generator.ts
- weapon-generator.ts
- WeaponGeneratorPanel.tsx
- armor-generator.ts
- ArmorGeneratorPanel.tsx
- SettingsPanel.tsx (частично)

Ожидаю завершения Агента 2 и команды на слияние.
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
- [ ] Добавлены вкладки Оружие и Экипировка
- [ ] Добавлены заглушки для Агента 2

### Git:
- [ ] Ветка создана от `main2d3`
- [ ] Все файлы закоммичены
- [ ] Push на GitHub выполнен
- [ ] Пользователь уведомлён

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

## 🔄 ЭТАП 3: СЛИЯНИЕ И ВНЕДРЕНИЕ

### ⚠️ ВАЖНО: Этот этап выполняется ПОСЛЕ команды пользователя!

**Сигнал для выполнения:** Пользователь скажет:
> "Ветки слиты, выполняй внедрение"

### Порядок действий ПОСЛЕ сигнала:

```bash
# 1. Получить слитый код
git fetch origin
git checkout feature/item-generators-agent1
git pull origin feature/item-generators-agent1

# 2. Проверить наличие файлов Агента 2
ls src/lib/generator/accessory-generator.ts
ls src/lib/generator/consumable-generator.ts
ls src/lib/generator/qi-stone-generator.ts
ls src/lib/generator/charger-generator.ts
```

### Финальная интеграция:

```typescript
// Обновить src/components/settings/SettingsPanel.tsx

// Импортировать ВСЕ панели:
import { WeaponGeneratorPanel } from './WeaponGeneratorPanel';
import { ArmorGeneratorPanel } from './ArmorGeneratorPanel';
import { AccessoryGeneratorPanel } from './AccessoryGeneratorPanel';  // Агент 2
import { ConsumableGeneratorPanel } from './ConsumableGeneratorPanel'; // Агент 2
import { QiStoneGeneratorPanel } from './QiStoneGeneratorPanel';       // Агент 2
import { ChargerGeneratorPanel } from './ChargerGeneratorPanel';       // Агент 2

// Полная структура вкладок:
// 1. Техники
// 2. Оружие
// 3. Экипировка
// 4. Аксессуары
// 5. Расходники
// 6. Камни Ци
// 7. Зарядники
```

### Финальный push:

```bash
git add .
git commit -m "feat: integrate all item generators"

git push https://ghp_ВАШ_ТОКЕН@github.com/vivasua-collab/Ai-Game2.git feature/item-generators-agent1

git remote set-url origin https://github.com/vivasua-collab/Ai-Game2.git
```

### После внедрения СООБЩИ:

```
✅ АГЕНТ 1: ВНЕДРЕНИЕ ЗАВЕРШЕНО

Все генераторы интегрированы в меню "Создание".
Ветка feature/item-generators-agent1 обновлена.

Готово к созданию PR в main2d3.
```

---

## 🔗 СВЯЗАННЫЕ ФАЙЛЫ

- [PLAN_USER.md](./PLAN_USER.md) — План для пользователя
- [AGENT_2_PLAN.md](./AGENT_2_PLAN.md) — План для Агента 2
- [../checkpoint29.md](../checkpoint29.md) — Основной чекпоинт

---

*Документ создан: 2026-03-01*
*Обновлён: 2026-03-01*
