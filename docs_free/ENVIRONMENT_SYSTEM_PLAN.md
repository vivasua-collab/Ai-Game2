# Упрощённая версия: 🌳 План создания системы окружения для тестового полигона

## 1) Назначение документа
- **Дата:** 2026-03-04
- **Статус:** 📝 Проектирование
- **Цель:** Создать систему генерации окружения для тестового полигона
- ---

## 2) Ключевые темы
- 🌳 План создания системы окружения для тестового полигона
- 📊 Анализ текущего состояния
- ✅ Уже существует
- ❌ Отсутствует
- 🏗️ Архитектура системы окружения
- 1️⃣ ТИПЫ ОБЪЕКТОВ ОКРУЖЕНИЯ
- 1.1 Препятствия (Obstacles)
- 1.2 Деревья (Trees)
- 1.3 Рудные камни (Ore Deposits)
- 1.4 Строения (Buildings) — часть карты
- 2️⃣ ПРЕСЕТЫ ОБЪЕКТОВ
- 2.1 Камни (Rocks)

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- `prisma/schema.prisma` — модели WorldObject, Building
- `src/lib/game/environment-system.ts` — система местности
- `docs/TRAINING_GROUND_ROADMAP.md` — план полигона
- `docs/equip.md` — система экипировки (для инструментов)

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
- export const ROCK_PRESETS: ObstaclePreset[] = [
- export const TREE_PRESETS: TreePreset[] = [
- export const ORE_PRESETS: OrePreset[] = [
- export const BUILDING_PART_PRESETS: BuildingPartPreset[] = [
- export function generateEnvironment(
- export function createRockTexture(
- const graphics = scene.make.graphics();
- const size = preset.width * 32; // метры в пиксели
- if (preset.shape === 'circle') {
- export function createTreeTexture(

> Источник: `/docs/ENVIRONMENT_SYSTEM_PLAN.md`. Этот файл сформирован для быстрого чтения и миграции.
