# 🗺️ ПЛАН ПАРАЛЛЕЛЬНОЙ РАЗРАБОТКИ — РУКОВОДСТВО

**Версия:** 2.0
**Создано:** 2026-03-01
**Обновлено:** 2026-03-01
**Статус:** Готов к выполнению

---

## 📋 Обзор

Параллельная разработка генераторов предметов двумя ИИ-агентами с последующим слиянием на GitHub.

---

## 👥 РАСПРЕДЕЛЕНИЕ АГЕНТОВ

### Агент 1 (Интегратор)
**Файлы:** `AGENT_1_PLAN.md`

**Задачи:**
1. Базовая инфраструктура (base-item-generator.ts)
2. Генератор имён с учётом рода
3. Генератор оружия (weapon-generator.ts)
4. Генератор экипировки (armor-generator.ts)
5. **Внедрение после слияния**

**Ветка Git:** `feature/item-generators-agent1`

---

### Агент 2
**Файлы:** `AGENT_2_PLAN.md`

**Задачи:**
1. Генератор аксессуаров (accessory-generator.ts)
2. Генератор расходников (consumable-generator.ts)
3. Генератор камней Ци (qi-stone-generator.ts)
4. Генератор зарядников (charger-generator.ts)

**Ветка Git:** `feature/item-generators-agent2`

---

## 📁 КЛЮЧЕВЫЕ ДОКУМЕНТЫ (общие для обоих)

Агенты ДОЛЖНЫ прочитать эти файлы перед началом работы:

| Файл | Назначение |
|------|------------|
| `docs/checkpoint29.md` | Основной план, интерфейсы, требования |
| `docs/id-system.md` | Система ID (префиксы WP, AR, AC, CS, QS, CH) |
| `docs/qi_stone.md` | Камни Ци (БЕЗ качества, только объём + тип) |
| `src/lib/generator/technique-generator.ts` | Референс для архитектуры |
| `src/lib/generator/technique-config.ts` | Референс для конфигурации |

---

## 🔄 ПОРЯДОК РАБОТЫ

### Этап 1: Параллельная разработка

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ЭТАП 1: ПАРАЛЛЕЛЬНАЯ РАБОТА                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   АГЕНТ 1                              АГЕНТ 2                          │
│   ─────────                            ─────────                        │
│   1. Читает документацию               1. Читает документацию           │
│   2. git checkout main2d3              2. git checkout main2d3          │
│   3. Создаёт ветку agent1              3. Создаёт ветку agent2          │
│   4. Базовая инфраструктура            4. accessory-generator.ts        │
│   5. name-generator.ts                 5. consumable-generator.ts       │
│   6. weapon-generator.ts               6. qi-stone-generator.ts         │
│   7. armor-generator.ts                7. charger-generator.ts          │
│   8. UI-панели                         8. UI-панели                     │
│   9. Push на GitHub                    9. Push на GitHub                │
│   10. Сообщает: "ГОТОВО"              10. Сообщает: "ГОТОВО"           │
│                                                                          │
│   ⏳ ОЖИДАНИЕ команды на слияние                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Этап 2: Слияние (ВЫПОЛНЯЕТЕ ВЫ)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ЭТАП 2: СЛИЯНИЕ (ВАШИ ДЕЙСТВИЯ)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Через GitHub веб-интерфейс:                                           │
│                                                                          │
│   1. Зайти на https://github.com/vivasua-collab/Ai-Game2               │
│   2. Переключиться на ветку feature/item-generators-agent1             │
│   3. Создать Pull Request из agent2 → agent1                           │
│   4. Слить (Merge)                                                      │
│   5. Разрешить конфликты (если есть)                                   │
│                                                                          │
│   ИЛИ через терминал:                                                   │
│                                                                          │
│   git checkout feature/item-generators-agent1                          │
│   git pull origin feature/item-generators-agent1                       │
│   git merge origin/feature/item-generators-agent2                      │
│   git push origin feature/item-generators-agent1                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Этап 3: Внедрение (АГЕНТ 1)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ЭТАП 3: ВНЕДРЕНИЕ (КОМАНДА АГЕНТУ 1)                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   После успешного слияния, дайте команду Агенту 1:                      │
│                                                                          │
│   > "Ветки слиты, выполняй внедрение"                                   │
│                                                                          │
│   Агент 1 выполнит:                                                     │
│   1. git pull для получения кода Агента 2                              │
│   2. Интеграция ВСЕХ генераторов в SettingsPanel.tsx                   │
│   3. Проверка импортов                                                  │
│   4. Push финальной версии                                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 ТОКЕН ДЛЯ АГЕНТОВ

Передайте агентам следующий токен для push на GitHub:

```
ghp_ВАШ_GITHUB_ТОКЕН
```

### Команда push для агентов:

```bash
# Агент 1:
git push https://ghp_ВАШ_GITHUB_ТОКЕН@github.com/vivasua-collab/Ai-Game2.git feature/item-generators-agent1

# Агент 2:
git push https://ghp_ВАШ_GITHUB_ТОКЕН@github.com/vivasua-collab/Ai-Game2.git feature/item-generators-agent2

# После push удалить токен из remote:
git remote set-url origin https://github.com/vivasua-collab/Ai-Game2.git
```

---

## 📋 ЧЕК-ЛИСТ ДЛЯ ПОЛЬЗОВАТЕЛЯ

### Перед запуском агентов:
- [ ] Убедиться, что `docs/checkpoint29.md` актуален
- [ ] Проверить доступ к GitHub
- [ ] Подготовить два отдельных чата/сессии для агентов
- [ ] Передать токен агентам

### После работы агентов (получили "ГОТОВО" от обоих):
- [ ] Проверить ветки на GitHub
- [ ] Создать PR: agent2 → agent1
- [ ] Слить ветки
- [ ] Проверить отсутствие конфликтов

### Финальный этап:
- [ ] Дать команду Агенту 1: **"Ветки слиты, выполняй внедрение"**
- [ ] Дождаться подтверждения
- [ ] Создать PR в main2d3

---

## 📁 СТРУКТУРА ФАЙЛОВ ПОСЛЕ ВЫПОЛНЕНИЯ

```
src/lib/generator/
├── base-item-generator.ts      ← Агент 1
├── name-generator.ts           ← Агент 1
├── item-config.ts              ← Агент 1
├── weapon-generator.ts         ← Агент 1
├── armor-generator.ts          ← Агент 1
├── accessory-generator.ts      ← Агент 2
├── consumable-generator.ts     ← Агент 2
├── qi-stone-generator.ts       ← Агент 2
├── charger-generator.ts        ← Агент 2
└── technique-generator.ts      ← (существует)

src/components/settings/
├── WeaponGeneratorPanel.tsx    ← Агент 1
├── ArmorGeneratorPanel.tsx     ← Агент 1
├── AccessoryGeneratorPanel.tsx ← Агент 2
├── ConsumableGeneratorPanel.tsx← Агент 2
├── QiStoneGeneratorPanel.tsx   ← Агент 2
├── ChargerGeneratorPanel.tsx   ← Агент 2
├── SettingsPanel.tsx           ← Агент 1 (интеграция)
└── TechniqueGeneratorPanel.tsx ← (существует)
```

---

## 📊 ДИАГРАММА ПОТОКА

```
main2d3
    │
    ├─── АГЕНТ 1 ───────────────────────────────┐
    │    checkout -b feature/item-generators-agent1
    │    ... работа ...                          │
    │    push                                    │
    │                                            ▼
    │                              feature/item-generators-agent1
    │                                            │
    │                                            │ (слияние)
    │                                            │
    ├─── АГЕНТ 2 ───────────────────────────────┤
    │    checkout -b feature/item-generators-agent2
    │    ... работа ...                          │
    │    push                                    │
    │                                            ▼
    │                              feature/item-generators-agent2
    │                                            │
    │                                            │ PR + Merge
    │                                            ▼
    │                              feature/item-generators-agent1 (обновлена)
    │                                            │
    │                                            │ (команда пользователю)
    │                                            │
    ├─── АГЕНТ 1 ───────────────────────────────┤
    │    git pull                                │
    │    интеграция                              │
    │    push                                    │
    │                                            ▼
    │                              feature/item-generators-agent1 (финал)
    │                                            │
    │                                            │ PR
    │                                            ▼
    └───────────────────────────────▶ main2d3 (обновлена)
```

---

## ⚠️ ВАЖНЫЕ МОМЕНТЫ

1. **Лор первичен** — при противоречиях смотреть `docs/start_lore.md`
2. **Камни Ци БЕЗ качества** — только объём + тип (calm/chaotic)
3. **Зарядники ≤ 100%** — сохранение Ци обязательно
4. **Генераторы НЕ используют Event Bus** — работа в React среде
5. **upgradeFlags** — битовое поле 0-15 (4 бита)
6. **Агент 1 ждёт команды** — не начинает внедрение без сигнала

---

## 🗣️ КОМАНДЫ АГЕНТАМ

### Агент 1 — в начале:
```
Прочитай файл docs/plans/AGENT_1_PLAN.md и выполни все задачи.
Токен для push: ghp_ВАШ_GITHUB_ТОКЕН
```

### Агент 2 — в начале:
```
Прочитай файл docs/plans/AGENT_2_PLAN.md и выполни все задачи.
Токен для push: ghp_ВАШ_GITHUB_ТОКЕН
```

### Агент 1 — после слияния:
```
Ветки слиты, выполняй внедрение.
```

---

## 🔗 СВЯЗАННЫЕ ФАЙЛЫ

- [AGENT_1_PLAN.md](./AGENT_1_PLAN.md) — План для Агента 1
- [AGENT_2_PLAN.md](./AGENT_2_PLAN.md) — План для Агента 2
- [../checkpoint29.md](../checkpoint29.md) — Основной чекпоинт

---

*Документ создан: 2026-03-01*
*Обновлён: 2026-03-01*
