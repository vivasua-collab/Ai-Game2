# Упрощённая версия: 🗄️ Анализ хранения пресетов

## 1) Назначение документа
- **Версия:** 1.0
- **Создано:** 2026-02-28
- **Статус:** Проектное решение
- ---

## 2) Ключевые темы
- 🗄️ Анализ хранения пресетов
- 📋 Постановка задачи
- 1️⃣ СРАВНЕНИЕ ПОДХОДОВ
- 1.1 База данных (Prisma + SQLite)
- 1.2 Файлы (JSON/TypeScript)
- 1.3 Гибридный подход (рекомендуемый)
- 2️⃣ РЕКОМЕНДУЕМАЯ СТРУКТУРА ГЕНЕРАТОРА
- 2.1 Концепция Base + Modifiers
- 2.2 Пример структуры файла
- 2.3 Расчёт размера хранения
- 2.4 Сравнение размеров
- 3️⃣ ГЕНЕРАЦИЯ ПРЕСЕТОВ

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- ~2046 техник (1024 на ур.1, 512 на ур.2, 256 на ур.3...)
- ~2046 предметов (аналогичная структура)
- ~50-100 шаблонов NPC
- Разнообразие мира
- Возможность модификаций
- Производительность
- Простота поддержки
- Индексы для быстрого поиска
- Связи между таблицами (foreign keys)
- Транзакции при изменениях
- Прямые запросы из API
- Автоматическая валидация типов

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
- const BASE_VALUES_BY_LEVEL = {
- function generateBaseTechnique(
- const base = BASE_VALUES_BY_LEVEL[level];
- const elementMult = ELEMENT_MULTIPLIERS[element] || { damage: 1.0, cost: 1.0 };
- return {
- const MODIFIER_RULES: ModifierRule[] = [
- function generateModifiers(
- const modifiers: TechniqueModifiers = {
- const numModifiers = 1 + Math.floor(rng() * 3);
- const available = MODIFIER_RULES.filter(r =>

> Источник: `/docs/preset-storage.md`. Этот файл сформирован для быстрого чтения и миграции.
