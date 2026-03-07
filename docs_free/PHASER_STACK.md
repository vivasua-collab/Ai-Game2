# Упрощённая версия: Phaser 3 Минимальный стек для Cultivation World

## 1) Назначение документа
- ---
- | Модуль | Описание | Обязательный |
- |--------|----------|--------------|
- | `Phaser.Scene` | Система сцен | ✅ Да |

## 2) Ключевые темы
- Phaser 3 Минимальный стек для Cultivation World
- Текущая конфигурация
- Версия
- Используемые модули Phaser
- В проекте используются:
- Минимальные зависимости
- Обязательные (Next.js/React):
- Для SSR совместимости:
- Размер бандлов Phaser
- Минимальная конфигурация
- Phaser Game Config:
- Render типы:

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- **Phaser**: 3.90.0
- **Размер в node_modules**: 148MB
- **Минифицированный бандл**: 1.2MB (phaser.min.js)
- `Phaser.AUTO` - автоматически выбирает WebGL/CSS3D (рекомендуется)
- `Phaser.WEBGL` - только WebGL
- `Phaser.CANVAS` - только Canvas (более совместим)
- Phaser: ~1.2 MB (gzip: ~350KB)
- React: ~140KB (gzip: ~45KB)
- Next.js runtime: ~100KB
- **Итого**: ~1.5 MB (gzip: ~400KB)
- Lazy loading Phaser через dynamic import
- Программная генерация текстур (нет ассетов)

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
- const PhaserModule = await import('phaser');
- const Phaser = PhaserModule.default;
- const config: Phaser.Types.Core.GameConfig = {
- const graphics = this.make.graphics();
- useEffect(() => {
- const initGame = async () => {
- const Phaser = (await import('phaser')).default;

> Источник: `/docs/PHASER_STACK.md`. Этот файл сформирован для быстрого чтения и миграции.
