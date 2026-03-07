# Упрощённая версия: 🎮 Чит-команды (только development)

## 1) Назначение документа
- **Доступны в development режиме или с ENABLE_CHEATS=true**
- /cheat set_level {"level":5,"subLevel":3} → Установить уровень 5.3
- /cheat breakthrough → Мгновенный прорыв
- /cheat add_qi 1000 → Добавить 1000 Ци

## 2) Ключевые темы
- 🎮 Чит-команды (только development)
- Уровень культивации
- Ци и ресурсы
- Характеристики
- Усталость
- Техники
- Прозрение
- Камни Ци (Qi Stones)
- God Mode
- API Endpoints

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- `shard` - Осколок (50 Ци)
- `fragment` - Фрагмент (100 Ци)
- `stone` - Камень (200 Ци)
- `crystal` - Кристалл (500 Ци)
- `heart` - Сердце (1000 Ци)
- `core` - Ядро (2000 Ци)
- `GET /api/cheats` - Справка по командам
- `POST /api/cheats` - Выполнить команду
- `GET /api/techniques/pool?characterId=...` - Получить пул техник
- `POST /api/techniques/pool` - Сгенерировать пул
- `PUT /api/techniques/pool` - Выбрать/раскрыть технику

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

> Источник: `/docs/CHEATS.md`. Этот файл сформирован для быстрого чтения и миграции.
