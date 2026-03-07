# Упрощённая версия: 🎨 План упрощения спрайтов персонажей

## 1) Назначение документа
- **Версия:** 1.0.0
- **Дата:** 2026-03-04
- **Статус:** 📋 Планирование
- ---

## 2) Ключевые темы
- 🎨 План упрощения спрайтов персонажей
- 📌 Концепция: "Восток-Запад"
- Проблема
- Решение
- Выгода
- 🎯 Принцип работы
- Логика отображения
- Визуальная граница
- 📋 План внедрения
- Этап 1: Создание нового генератора (1 день)
- 1.1 Новая функция `createSimpleDirectionalSprite()`
- 1.2 Функция отрисовки профиля

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- S, SW, W, NW, N, NE, E, SE (8 фреймов)
- Сложность рисования ×8
- Большой размер текстур
- Трудно добавлять анимации
- **"Запад"** — персонаж смотрит влево (1 спрайт)
- **"Восток"** — отзеркаливание "Запад" (flipX)
- Создать упрощённый спрайт персонажа (1 направление)
- Второе направление получается через sprite.setFlipX(true)
- [ ] Спрайт персонажа отображается в профиле (смотрит влево)
- [ ] При движении вправо спрайт отзеркаливается (flipX)
- [ ] Граница переключения: вертикальная линия через центр игрока
- [ ] Анимация idle работает (дыхание)

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
- const angle = Math.atan2(mouseY - playerY, mouseX - playerX);
- if (angle >= -Math.PI/2 && angle <= Math.PI/2) {
- export function createSimpleDirectionalSprite(
- const frameSize = 64;
- const themeConfig = getCultivationThemeConfig(level);
- const glowColor = themeConfig.color;
- const canvas = document.createElement('canvas');
- const ctx = canvas.getContext('2d')!;
- function drawCharacterProfile(
- if (facing === 'right') {

> Источник: `/docs/SPRITE_SIMPLIFICATION_PLAN.md`. Этот файл сформирован для быстрого чтения и миграции.
