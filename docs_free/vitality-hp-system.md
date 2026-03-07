# Упрощённая версия: Система Vitality и HP частей тела

## 1) Назначение документа
- Система живучести (vitality) влияет на расчёт HP частей тела персонажей и NPC. Это ключевой элемент боевой системы в стиле Kenshi.
- ---
- **Vitality (Живучесть)** - характеристика, определяющая выносливость тела и способность переносить повреждения.
- **Текущая реализация:**

## 2) Ключевые темы
- Система Vitality и HP частей тела
- Статус: ЗАПЛАНИРОВАНО
- Описание
- 1. Текущее состояние
- 1.1 Характеристика Vitality
- 1.2 HP частей тела (Body Parts)
- 2. План внедрения
- 2.1 Формула расчёта HP частей тела
- 2.2 Примеры расчёта
- 2.3 Файлы для изменения
- 3. Зависимости
- 3.1 Связанные системы

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- ✅ Vitality добавлена в `PresetNPCStats` (preset-npc.ts)
- ✅ Vitality добавлена в `TempNPCStats` (temp-npc.ts)
- ✅ Vitality добавлена в схему Prisma (NPC model)
- ✅ Vitality генерируется в `npc-generator.ts` из `species.baseStats.vitality`
- ✅ Vitality отображается в NPCViewerDialog
- BodyState определён в `npc-generator.ts`
- HP рассчитывается как: `baseHP * sizeMultiplier * cultivationBonus`
- `cultivationBonus = 1 + (cultivationLevel - 1) * 0.1`
- `baseHP` - базовое HP части тела (head: 50, torso: 100, heart: 80, arm: 40, leg: 50)
- `sizeMultiplier` - множитель размера вида (tiny: 0.5, small: 0.75, medium: 1.0, large: 1.5, huge: 2.0)
- `vitalityMultiplier` = 1 + (vitality - 10) * 0.05
- При vitality = 10: множитель = 1.0 (базовый)

## 5) Псевдокод перехода на новый язык
```text
INIT context
READ rules from this document
FOR each section IN key_topics:
  MAP terms -> new_language_terms
  IMPLEMENT minimal equivalent
  VALIDATE with small test case
END
RETURN migration_notes
```

> Источник: `/docs/vitality-hp-system.md`. Этот файл сформирован для быстрого чтения и миграции.
