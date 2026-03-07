# Упрощённая версия: NPC Generator - Technical Specification

## 1) Назначение документа
- version: 2.0
- date: 2026-03-01
- status: ready-for-implementation
- repository:

## 2) Ключевые темы
- NPC Generator - Technical Specification
- Architecture
- Existing Systems
- New Components
- Type Definitions
- File Structure
- Agent Distribution
- Execution Phases
- CRITICAL: Inventory Rule
- Completion Criteria
- Related Documentation

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- Context Input -> 2. Species Selection -> 3. Role Selection
- Stats Generation -> 5. Cultivation -> 6. Body Creation
- Personality -> 8. Techniques -> 9. Equipment -> 10. Inventory (FROM POOL)
- NPC: name, title, age, cultivationLevel, stats, personality, role, sectId
- Character: bodyState, cultivationSkills
- EncounteredEntity: name, type, cultivationLevel, power, disposition
- technique-generator.ts ✅
- weapon-generator.ts ✅
- armor-generator.ts ✅
- accessory-generator.ts ✅
- consumable-generator.ts ✅
- qi-stone-generator.ts ✅

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
- async function generateInventory(role, level, rng) {
- const consumables = await generatedObjectsLoader.loadObjects('consumables');
- const suitable = consumables.filter(c => c.level <= level);
- return weightedRandomSelect(suitable, count, rng);
- function generateInventory(role, level, rng) {
- return generateConsumable({ level }); // ❌ NEVER DO THIS

> Источник: `/docs/npc-generator-plan.md`. Этот файл сформирован для быстрого чтения и миграции.
