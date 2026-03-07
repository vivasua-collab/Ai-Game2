# Упрощённая версия: 🎲 Концепция локального генератора приключений

## 1) Назначение документа
- **Создано:** 2026-02-25
- **Статус:** 📝 Проект
- **Приоритет:** 🟡 Средний
- ---

## 2) Ключевые темы
- 🎲 Концепция локального генератора приключений
- 🎯 Проблема
- 📊 Анализ запросов
- Типы запросов по частоте
- 🏗️ Архитектура решения
- Уровни генерации
- 📦 Модуль 1: Генератор описаний локаций
- Структура данных
- Примеры шаблонов
- Алгоритм генерации
- 📦 Модуль 2: Генератор событий
- Типы событий

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- Осмотр локации
- Короткие перемещения
- Сбор ресурсов
- Простой бой
- Стандартные диалоги
- Расчёт урона/защиты
- Определение результата
- Потери Ци и усталости
- Генерация описания локации
- Генерация события
- Генерация результата сбора
- Генерация боевой сцены (без LLM)

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
- const LOCATION_TEMPLATES = {
- function generateLocationDescription(location: Location, time: WorldTime): string {
- const template = selectTemplate(location.terrainType);
- let description = template.terrain[random()];
- if (hasResources(location)) {
- if (hasDanger(location)) {
- return description;
- const EVENT_TEMPLATES: EventTemplate[] = [
- const COMBAT_TEMPLATES = {
- const RESOURCE_NODES: Record<string, ResourceNode> = {

> Источник: `/docs/LOCAL-ADVENTURE-GENERATOR.md`. Этот файл сформирован для быстрого чтения и миграции.
