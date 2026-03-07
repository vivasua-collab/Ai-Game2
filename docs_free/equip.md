# Упрощённая версия: ⚔️ Система Экипировки и Брони

## 1) Назначение документа
- **Версия:** 1.0
- **Создано:** 2026-02-28
- **Статус:** Черновик
- ---

## 2) Ключевые темы
- ⚔️ Система Экипировки и Брони
- 📋 Обзор
- Связь с концепцией тела
- 🏗️ Архитектура системы
- 0️⃣ ТИП ЭКИПИРОВКИ (Equipment Type)
- 0.1 Основные типы
- 0.2 Носимое (Wearable)
- 0.3 Оружие (Weapon)
- 0.4 Расходуемое (Consumable)
- 0.5 Артефакт (Artifact)
- 0.6 Инструмент (Tool)
- 0.7 Имплант (Implant)

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- **Игроков** — экипировка персонажа
- **NPC** — снаряжение неигровых персонажей
- **Монстров** — естественная броня и артефакты
- Защищать определённые части (броня)
- Усиливать части (перчатки → урон рук)
- Заменять функции (протез вместо руки)
- **Типы и интерфейсы** — `src/types/equipment.ts`
- **Пресеты экипировки** — `src/data/presets/equipment-presets.ts`
- **Базовые материалы** — `src/data/materials.ts`
- **Prisma Schema** — модели Equipment, EquipmentSet
- **API** — базовые CRUD операции
- **Инвентарь UI** — отображение экипировки

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
- const RARITY_PROPERTIES: Record<EquipmentRarity, RarityProperties> = {
- function generateBonusStats(rarity: EquipmentRarity): EquipmentBonus[] {
- const props = RARITY_PROPERTIES[rarity];
- const numStats = randomInt(props.minBonusStats, props.maxBonusStats);
- const availableStats: EquipmentBonusType[] = [
- const bonuses: EquipmentBonus[] = [];
- const usedStats = new Set<string>();
- for (let i = 0; i < numStats; i++) {
- const available = availableStats.filter(s => !usedStats.has(s));
- const stat = randomChoice(available);

> Источник: `/docs/equip.md`. Этот файл сформирован для быстрого чтения и миграции.
