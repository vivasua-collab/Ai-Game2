# Упрощённая версия: Система фракций и государств

## 1) Назначение документа
- **Версия:** 1.0 | **Дата:** 2026-03-03
- ---
- Документ описывает систему фракций, сект и государств в мире культивации. Культиваторы стоят над светской жизнью, но секты служат признаком государственной принадлежности и формируют политическую карту мира.
- ┌─────────────────────────────────────────────────────────────────────────┐

## 2) Ключевые темы
- Система фракций и государств
- 📋 Обзор
- 🏛️ Иерархия принадлежности
- 📊 Модели данных
- Nation (Государство)
- Faction (Фракция/Альянс)
- Sect (Секта) — расширение существующей модели
- 🎽 Одеяние секты (Sect Attire)
- Концепция
- Модель экипировки
- Слоты экипировки
- Примеры одеяний

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- Показывает принадлежность культиватора к секте
- Влияет на отношение других NPC
- Даёт бонусы (репутация, защита)
- Может быть снято для скрытия принадлежности
- **Миграция Prisma схемы** — добавить Nation, Faction, расширить Sect
- **Создать пресеты государств и фракций** — для стартового мира
- **Создать пресеты сект с одеяниями** — для каждой секты
- **API для работы с отношениями** — расчёт disposition
- **Интеграция с NPC** — применение отношений в взаимодействиях

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
- const SECT_ATTIRE_SLOTS = {
- const SECT_ATTIRES: Record<string, SectAttire> = {
- function calculateFinalDisposition(
- let disposition = 0;
- if (player.sectId && npc.sectId) {
- const sectRelation = getSectRelation(npc.sectId, player.sectId);
- if (player.factionId && npc.factionId) {
- const factionRelation = getFactionRelation(npc.factionId, player.factionId);
- if (player.nationId && npc.nationId) {
- const nationRelation = getNationRelation(npc.nationId, player.nationId);

> Источник: `/docs/faction-system.md`. Этот файл сформирован для быстрого чтения и миграции.
