# Упрощённая версия: 🔋 Концепция Зарядника (Qi Charger)

## 1) Назначение документа
- **Версия:** 1.0
- **Создано:** 2026-02-28
- **Статус:** Черновик
- ---

## 2) Ключевые темы
- 🔋 Концепция Зарядника (Qi Charger)
- 📋 Обзор
- Ключевая концепция
- 1️⃣ ТИПЫ ЗАРЯДНИКОВ
- 1.1 По форм-фактору
- 1.2 По назначению
- 2️⃣ ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ
- 2.1 Слоты для камней
- 2.2 Буфер Ци
- 2.3 Проводимость зарядника
- 3️⃣ МЕХАНИКА РАБОТЫ
- 3.1 Поглощение из камней

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- **Хранения камней Ци** в упорядоченном виде
- **Контролируемого поглощения** Ци из камней
- **Буферизации Ци** для быстрого использования в бою
- id: "slot_1"
- id: "slot_2"
- id: "slot_3"
- type: agility
- **Типы и интерфейсы** — `src/types/charger.ts`
- **Пресеты зарядников** — `src/data/presets/charger-presets.ts`
- **Интеграция с камнями Ци**
- **Расчёт скорости** — проводимость как ограничитель
- **Режимы работы** — off/trickle/normal/burst/combat

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
- const CHARGER_FORM_FACTORS: Record<ChargerFormFactor, ChargerFormFactorData> = {
- const CHARGER_PURPOSES: Record<ChargerPurpose, ChargerPurposeData> = {
- const CHARGER_CONDUCTIVITY_EXAMPLES = {
- function calculateAbsorptionProcess(
- const totalSourceRate = charger.slots
- .filter(s => s.currentStone && s.state.isActive)
- .reduce((sum, slot) => sum + slot.currentStone!.properties.releaseRate, 0);
- const bufferConductivity = charger.buffer.flow.conductivity;
- const receiverConductivity = practitioner.conductivity;
- const effectiveRate = Math.min(

> Источник: `/docs/charger.md`. Этот файл сформирован для быстрого чтения и миграции.
