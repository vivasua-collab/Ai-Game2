# Упрощённая версия: NPC в игровой сессии - Схема интеграции

## 1) Назначение документа
- **Версия:** 1.0 | **Дата:** 2026-03-03
- ---
- Документ описывает схему добавления NPC в игровую сессию движка. Система поддерживает два типа NPC:
- ┌─────────────────────────────────────────────────────────────────────────┐

## 2) Ключевые темы
- NPC в игровой сессии - Схема интеграции
- 📋 Обзор
- 🏗️ Архитектура
- 📊 Типы NPC
- 1. Preset NPCs (Предустановленные)
- 2. Generated NPCs (Сгенерированные статисты)
- 🔄 Жизненный цикл NPC
- Preset NPC
- Generated NPC (TempNPC)
- 🎮 API для работы с NPC
- Эндпоинты
- Спавн NPC

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- **Предварительно созданные NPC (Preset NPCs)** — уникальные персонажи с фиксированной историей
- **Случайно сгенерированные NPC (Generated NPCs)** — процедурные "статисты" для наполнения мира
- Уникальное имя и предыстория
- Фиксированные характеристики
- Принадлежность к секте/фракции
- Квестовые цепочки
- Сохраняются в БД (Prisma NPC model)
- Создаются вручную или через генератор и сохраняются как пресеты
- Хранятся в `presets/npcs/preset/` как JSON файлы
- Загружаются в БД при инициализации сессии
- Процедурная генерация через `npc-generator.ts`
- Существуют только в памяти сессии

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
- const preset = await presetStorage.loadNPCPreset(presetId);
- const dbNPC = await db.nPC.create({
- const manager = getSessionNPCManager();
- const npcs = await manager.initializeLocation(
- async function promoteToPreset(
- const preset: PresetNPC = {
- await presetStorage.saveNPCPreset(preset);
- const dbNPC = await db.nPC.create({ ... });
- return preset.id;

> Источник: `/docs/npc-session-integration.md`. Этот файл сформирован для быстрого чтения и миграции.
