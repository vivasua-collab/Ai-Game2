# Упрощённая версия: Система инвентаря (Inventory System)

## 1) Назначение документа
- **Версия:** 1.1
- **Создано:** 2025-02-28
- **Статус:** Активно
- ---

## 2) Ключевые темы
- Система инвентаря (Inventory System)
- 📋 Обзор
- 🏗️ Архитектура
- Компоненты
- 📦 Модели данных
- InventoryItem
- Equipment
- SpiritStorage
- 🎮 Слоты экипировки
- 💼 Система пояса (Quick Access)
- Горячие клавиши
- Ограничения

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- **Инвентарь (Inventory)** - 7x7 сетка для переносимых предметов
- **Экипировка (Equipment)** - слоты на теле персонажа
- **Духовное хранилище (Spirit Storage)** - вне-пространственное хранилище
- **Кукла тела (Body Doll)** - визуальное отображение экипировки и состояния
- В слоты быстрого доступа можно помещать только расходники (таблетки, эликсиры, еда, свитки)
- После использования предмет удаляется из слота
- Если в слоте нет предмета, горячая клавиша игнорируется
- `characterId` - ID персонажа
- Всегда указывайте `icon`, `category`, `rarity` при создании предметов
- Используйте валидацию Zod в API
- `characterId` передан правильно
- Персонаж существует в БД

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
- import { inventoryService } from '@/services/inventory.service';
- const item = await inventoryService.addItemToInventory(characterId, {
- import { createQiStoneItem } from '@/types/qi-stones';
- const qiStone = createQiStoneItem('crystal', 3);

> Источник: `/docs/inventory-system.md`. Этот файл сформирован для быстрого чтения и миграции.
