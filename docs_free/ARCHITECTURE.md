# Упрощённая версия: 🏗️ Архитектура Cultivation World Simulator

## 1) Назначение документа
- > Подробное описание архитектуры с интеграцией Phaser 3.
- > Версия: 13 | Год: 2026
- ---
- ┌─────────────────────────────────────────────────────────────────────┐

## 2) Ключевые темы
- 🏗️ Архитектура Cultivation World Simulator
- 📐 Общая архитектура
- 📁 Структура проекта
- `/src/app/api/` - API эндпоинты (42 файла)
- Игровые API
- Техники API
- Инвентарь API
- Генераторы API
- Читы API
- Системные API
- `/src/lib/generator/` - Генераторы (19 файлов)
- `/src/services/` - Сервисы (14 файлов)

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- `useGameCharacter()` - данные персонажа
- `useGameLocation()` - текущая локация
- `useGameMessages()` - сообщения чата
- `useGameLoading()` - состояние загрузки
- `useGameActions()` - все действия (loadState, startGame, etc.)
- Добавить кнопку в `ActionButtons.tsx`
- Создать диалог в `components/game/NewDialog.tsx`
- Создать API эндпоинт если нужен расчёт
- Выбрать файл: technique/skill/formation/item/character-presets.ts
- Добавить пресет с уникальным ID
- Указать category, rarity, requirements
- Создать `src/app/api/new-action/route.ts`

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
- await TruthSystem.loadSession(sessionId);
- const state = TruthSystem.getSessionState(sessionId);
- const character = TruthSystem.getCharacter(sessionId);
- await TruthSystem.addTechnique(sessionId, techniqueData);
- await TruthSystem.addInventoryItem(sessionId, itemData);
- await TruthSystem.changeLocation(sessionId, newLocationId);
- await TruthSystem.saveToDatabase(sessionId);
- await TruthSystem.quickSave(sessionId);
- await TruthSystem.unloadSession(sessionId);
- const config: Phaser.Types.Core.GameConfig = {

> Источник: `/docs/ARCHITECTURE.md`. Этот файл сформирован для быстрого чтения и миграции.
