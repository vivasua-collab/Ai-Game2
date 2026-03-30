# 📂 Unity Documentation Listing

**Версия:** 1.1  
**Дата:** 2026-03-30  
**Проект:** Cultivation World Simulator → Unity Migration

---

## ⚠️ Важно

> **Все документы содержат ТОЛЬКО ТЕОРИЮ.**  
> **НЕТ КОДА** — только теоретические описания систем.  
> Код будет реализован в Unity отдельно.

---

## 📋 Список документов

### 🎮 Выбор версии Unity

| Файл | Описание | Токенов |
|------|----------|---------|
| [UNITY_VERSION_COMPARISON.md](./UNITY_VERSION_COMPARISON.md) | Сравнение Unity 2022 LTS vs Unity 6.3, рекомендации | ~4000 |

### Архитектура и основы

| Файл | Описание | Токенов |
|------|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Общая архитектура Unity проекта, паттерны, модули | ~3500 |
| [MIGRATION_ANALYSIS.md](./MIGRATION_ANALYSIS.md) | Анализ миграции, что нужно перенести | ~2000 |
| [WORKFLOW_GITHUB_UNITY.md](./WORKFLOW_GITHUB_UNITY.md) | Workflow: GitHub ↔ локальный Unity | ~3000 |
| [UNITY_63_RESEARCH.md](./UNITY_63_RESEARCH.md) | Исследование API Unity 6.3 (из оф. документации) | ~3500 |

### Системы данных

| Файл | Описание | Токенов |
|------|----------|---------|
| [DATA_MODELS.md](./DATA_MODELS.md) | Модели данных из Prisma schema, 17 сущностей | ~5000 |
| [CONFIGURATIONS.md](./CONFIGURATIONS.md) | Конфигурации: уровни культивации, техники, материалы | ~4500 |
| [ALGORITHMS.md](./ALGORITHMS.md) | Алгоритмы и формулы: урон, подавление, Ци буфер | ~5500 |

### Игровые системы

| Файл | Описание | Токенов |
|------|----------|---------|
| [COMBAT_SYSTEM.md](./COMBAT_SYSTEM.md) | Боевая система, пайплайн урона 10 слоёв | ~4000 |
| [TECHNIQUE_SYSTEM.md](./TECHNIQUE_SYSTEM.md) | Система техник культивации | ~3500 |
| [QI_SYSTEM.md](./QI_SYSTEM.md) | Система Ци: накопление, проводимость, плотность | ~2500 |
| [BODY_SYSTEM.md](./BODY_SYSTEM.md) | Kenshi-style система тела, двойная HP | ~4000 |
| [INVENTORY_SYSTEM.md](./INVENTORY_SYSTEM.md) | Инвентарь, экипировка, слоты | ~3000 |
| [EQUIPMENT_SYSTEM.md](./EQUIPMENT_SYSTEM.md) | Экипировка v2: материалы, грейды, прочность | ~3500 |

### NPC и AI

| Файл | Описание | Токенов |
|------|----------|---------|
| [NPC_AI_SYSTEM.md](./NPC_AI_SYSTEM.md) | AI NPC, Spinal Controller, рефлексы | ~4000 |

### Мир и время

| Файл | Описание | Токенов |
|------|----------|---------|
| [WORLD_SYSTEM.md](./WORLD_SYSTEM.md) | Мир, локации, 3D координаты | ~3000 |
| [TIME_SYSTEM.md](./TIME_SYSTEM.md) | Система времени, тики, календарь | ~2500 |
| [FACTION_SYSTEM.md](./FACTION_SYSTEM.md) | Фракции, отношения, нации | ~2500 |
| [LORE_SYSTEM.md](./LORE_SYSTEM.md) | Лор, истории, миростроение | ~2000 |

### Специальные системы

| Файл | Описание | Токенов |
|------|----------|---------|
| [SAVE_SYSTEM.md](./SAVE_SYSTEM.md) | Сохранения, JSON, сериализация | ~2500 |
| [GENERATORS_SYSTEM.md](./GENERATORS_SYSTEM.md) | Генераторы: NPC, техники, предметы | ~3500 |
| [CHARGER_SYSTEM.md](./CHARGER_SYSTEM.md) | Зарядные ядра для формаций | ~2000 |
| [ELEMENTS_SYSTEM.md](./ELEMENTS_SYSTEM.md) | Стихии, противоположности, сродство | ~2500 |
| [MODIFIERS_SYSTEM.md](./MODIFIERS_SYSTEM.md) | Модификаторы, баффы, дебаффы | ~2500 |

---

## 📊 Статистика

| Метрика | Значение |
|---------|----------|
| Всего документов | 25 |
| Общий объём | ~72,000 токенов |
| Средний размер | ~2,900 токенов |

---

## 🔗 Связи документов

```
UNITY_VERSION_COMPARISON.md (выбор версии)
    │
    ▼
ARCHITECTURE.md (корневой документ)
    ├── DATA_MODELS.md (структуры данных)
    ├── ALGORITHMS.md (формулы)
    ├── CONFIGURATIONS.md (конфиги)
    │
    ├── COMBAT_SYSTEM.md
    │   ├── TECHNIQUE_SYSTEM.md
    │   ├── QI_SYSTEM.md
    │   └── BODY_SYSTEM.md
    │
    ├── INVENTORY_SYSTEM.md
    │   └── EQUIPMENT_SYSTEM.md
    │
    ├── NPC_AI_SYSTEM.md
    │
    ├── WORLD_SYSTEM.md
    │   ├── TIME_SYSTEM.md
    │   └── FACTION_SYSTEM.md
    │
    ├── SAVE_SYSTEM.md
    │
    └── GENERATORS_SYSTEM.md
```

---

## 📝 Рекомендации по чтению

### Для старта разработки:
1. UNITY_VERSION_COMPARISON.md — выбор версии Unity
2. ARCHITECTURE.md — общая картина
3. DATA_MODELS.md — структуры данных
4. ALGORITHMS.md — ключевые формулы

### Для боевой системы:
1. COMBAT_SYSTEM.md — пайплайн урона
2. TECHNIQUE_SYSTEM.md — техники
3. QI_SYSTEM.md — Ци буфер
4. BODY_SYSTEM.md — телесный урон

### Для систем мира:
1. WORLD_SYSTEM.md — локации
2. TIME_SYSTEM.md — время
3. NPC_AI_SYSTEM.md — население

---

## 🛠️ Рекомендованная версия Unity

**Unity 6.3 (6000.3)** — рекомендуется для проекта.

**Причины:**
- DOTS 2.0 для NPC AI (10-100x улучшение производительности)
- GPU Resident Drawer для рендеринга
- Долгосрочная перспектива (5+ лет)
- Стабильная версия с актуальной документацией

**Документация:** https://docs.unity3d.com/Manual/index.html

Подробнее: [UNITY_VERSION_COMPARISON.md](./UNITY_VERSION_COMPARISON.md)

---

*Документ обновлён: 2026-03-30*  
*Проект: Cultivation World Simulator Unity Migration*
