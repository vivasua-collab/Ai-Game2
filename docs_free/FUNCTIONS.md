# Упрощённая версия: Функции и типы проекта Cultivation World Simulator

## 1) Назначение документа
- **Последнее обновление:** 2026-03-05 19:45 UTC
- ---
- **ВСЕ расчёты, связанные с ядром Ци и системой меридиан, находятся в ОДНОМ месте:**
- | Система | Файл | Главная функция |

## 2) Ключевые темы
- Функции и типы проекта Cultivation World Simulator
- ⚠️ ВАЖНО: Единый источник расчётов ядра и меридиан
- Принцип единой точки истины
- Формула проводимости
- Правила добавления новых расчётов
- 🎲 Офлайн Генератор Техник (src/lib/generator/)
- 🔄 ЕДИНСТВЕННОЕ МЕСТО ДЛЯ ГЕНЕРАЦИИ ТЕХНИК
- Принципы
- Типы техник (TechniqueType)
- Подтипы боевых техник (CombatSubtype)
- Подтипы защитных техник (DefenseSubtype)
- Интерфейс GeneratedTechnique

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- coreCapacity = ёмкость ядра персонажа
- levelMultiplier = QI_CONSTANTS.CONDUCTIVITY_MULTIPLIERS[level]
- МедП = количество медитаций на проводимость
- 10% = MEDITATION_TYPE_CONSTANTS.CONDUCTIVITY_BONUS_PERCENT
- **НЕ дублировать расчёты** в других файлах
- **Импортировать** функции из qi-shared.ts или conductivity-system.ts
- **Использовать** time-tick.service.ts для всех эффектов времени
- **При изменении формулы** обновлять только один файл
- **Base + Modifiers**: базовый объект + флаги эффектов + значения
- **Детерминированная генерация** через seed
- **Балансировка по формулам уровня**
- **Система ID с префиксами** (MS, MW, RG, DF, etc.)

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

## 6) Что важно при переносе кода
- import { presetStorage } from '@/lib/generator/preset-storage';
- await presetStorage.initialize();
- const techniques = await presetStorage.loadTechniquesBySubtype('melee_strike');
- await processTimeTickEffects({

> Источник: `/docs/FUNCTIONS.md`. Этот файл сформирован для быстрого чтения и миграции.
