# Упрощённая версия: Система отношений и взаимодействий

## 1) Назначение документа
- **Версия:** 1.0 | **Дата:** 2026-03-03
- ---
- Документ описывает систему отношений между сущностями мира (персонажи, NPC, секты, фракции, государства) и механику взаимодействий (мирные и враждебные действия).
- ┌─────────────────────────────────────────────────────────────────────────┐

## 2) Ключевые темы
- Система отношений и взаимодействий
- 📋 Обзор
- 🎯 Уровни отношений
- Иерархия отношений
- Веса уровней
- 📊 Модель данных
- Расширение NPC
- Prisma Schema
- 🔄 Расчёт итогового отношения
- Алгоритм
- Примеры расчёта
- ⚔️ Типы взаимодействий

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- **Реализовать Prisma схему** — добавить поля для отношений
- **Создать сервис RelationService** — расчёт и обновление отношений
- **Создать API для взаимодействий** — endpoints для действий
- **Интегрировать с движком** — Event Bus для боевых взаимодействий
- **Добавить UI** — отображение отношения, доступные действия

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
- function calculateDisposition(ctx: DispositionContext): number {
- let totalDisposition = 0;
- let totalWeight = 0;
- if (ctx.source.personalDisposition !== undefined) {
- if (ctx.source.sectId && ctx.target.sectId) {
- const sectRelation = getSectRelation(ctx.source.sectId, ctx.target.sectId);
- if (ctx.source.factionId && ctx.target.factionId) {
- const factionRelation = getFactionRelation(
- if (ctx.source.nationId && ctx.target.nationId) {
- const nationRelation = getNationRelation(

> Источник: `/docs/relations-system.md`. Этот файл сформирован для быстрого чтения и миграции.
