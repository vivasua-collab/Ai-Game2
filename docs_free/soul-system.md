# Упрощённая версия: 👻 Система Души (Soul System)

## 1) Назначение документа
- **Версия:** 1.2
- **Создано:** 2026-03-06
- **Обновлено:** 2026-03-06
- **Статус:** Черновик

## 2) Ключевые темы
- 👻 Система Души (Soul System)
- 📋 Обзор
- 🏗️ Архитектура
- 1️⃣ ДУША (Soul)
- 1.1 Интерфейс
- 1.2 Примеры душ
- 2️⃣ ТЕЛО (Body Component)
- 2.1 Интерфейс
- 2.2 Тело камня
- 2.3 Тело культиватора
- 3️⃣ ЦИ (Qi Component)
- 3.1 Интерфейс

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- **Душа (Soul)** — базовый объект с ID
- **Тело (Body)** — опциональный компонент
- **Ци (Qi)** — опциональный компонент
- **Контроллер (Controller)** — кто управляет (игрок/AI)
- Типы душ
- Статус души
- Кто управляет душой
- Базовая душа
- Позиция в мире
- Компонент тела
- Тип телесности
- Материал тела

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
- const stone: Soul = {
- const playerCharacter: Soul = {
- const npcCharacter: Soul = {
- const playerCreature: Soul = {
- const monsterCreature: Soul = {
- const playerSpirit: Soul = {
- const aiSpirit: Soul = {
- const stoneBody: BodyComponent = {
- const cultivatorBody: BodyComponent = {
- const stoneQi: QiComponent = {

> Источник: `/docs/soul-system.md`. Этот файл сформирован для быстрого чтения и миграции.
