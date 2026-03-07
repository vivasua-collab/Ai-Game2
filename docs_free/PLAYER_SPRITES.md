# Упрощённая версия: Спрайты игрока - AI Generated Sprites

## 1) Назначение документа
- Спрайты игрока сгенерированы через AI (z-ai-web-dev-sdk) в стиле аниме/манга для симулятора мира культивации.
- public/sprites/
- ├── player/
- │ ├── player-directions.png # Спрайт-лист 8 направлений

## 2) Ключевые темы
- Спрайты игрока - AI Generated Sprites
- Обзор
- Структура файлов
- Система уровней культивации
- Использование в Phaser
- Загрузка спрайтов
- Создание ауры Ци
- Эффект прорыва
- Эффект медитации
- Fallback (программная генерация)
- Конфигурация
- Генерация новых спрайтов

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- `CULTIVATION_THEMES` - цвета и эффекты по уровням
- `SPRITE_PATHS` - пути к файлам спрайтов
- `ANIMATION_CONFIG` - параметры анимации
- `QI_AURA_CONFIG` - параметры ауры Ци
- Все спрайты генерируются с transparent background для наложения
- Размеры должны быть кратны 32 (ограничение API)
- Поддерживаемые размеры: 1024x1024, 768x1344, 1344x768, и т.д.
- Спрайты автоматически кэшируются после первой загрузки

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
- import { SpriteLoader } from '@/game/services/sprite-loader';
- const spriteLoader = new SpriteLoader(scene);
- const qiAura = spriteLoader.createQiAura(
- const meditationEffect = spriteLoader.createMeditationEffect(
- import { createFallbackPlayerTexture } from '@/game/services/sprite-loader';

> Источник: `/docs/PLAYER_SPRITES.md`. Этот файл сформирован для быстрого чтения и миграции.
