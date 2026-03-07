# Упрощённая версия: ⚔️ Оффлайн Генератор Техник

## 1) Назначение документа
- **Версия:** 1.0
- **Создано:** 2026-02-28
- **Статус:** Черновик
- ---

## 2) Ключевые темы
- ⚔️ Оффлайн Генератор Техник
- 📋 Обзор
- Принципы генерации
- 1️⃣ СТРУКТУРА ТЕХНИКИ
- 1.1 Полная модель техники
- 1.2 Расширенные эффекты (предложение)
- 2️⃣ КОМПОНЕНТЫ ГЕНЕРАЦИИ
- 2.1 Шаблоны названий
- 2.2 Шаблоны описаний
- 2.3 Библиотека эффектов
- 3️⃣ АЛГОРИТМ ГЕНЕРАЦИИ
- 3.1 Основной процесс

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- Шаблонов и компонентов
- Балансовых формул
- Контекста персонажа
- Рандомизации с контролем качества
- Основная функция генерации
- rarityConfig.effectMultiplier
- Math.pow(levelScaling.damagePerLevel, level - 1)
- rarityConfig.qiCostMultiplier
- (elementMod.qiCostMultiplier ?? 1)
- Math.pow(levelScaling.durationPerLevel, level - 1)
- Сгенерировать пул техник для прорыва
- Сгенерировать технику прозрения

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
- const NAME_TEMPLATES: NameTemplate[] = [
- const DESCRIPTION_TEMPLATES: DescriptionTemplate[] = [
- const EFFECT_LIBRARY: EffectLibrary = {
- function generateTechniques(context: GenerationContext): GeneratedTechnique[] {
- const rng = seededRandom(context.seed);
- const results: GeneratedTechnique[] = [];
- for (let i = 0; i < context.count; i++) {
- const level = context.targetLevel ?? inferLevel(context.character);
- const type = context.preferredType ?? selectType(context, rng);
- const rarity = context.rarity ?? selectRarity(level, rng);

> Источник: `/docs/Technic-Generator.md`. Этот файл сформирован для быстрого чтения и миграции.
