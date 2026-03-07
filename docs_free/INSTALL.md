# Упрощённая версия: 📦 Установка и запуск Cultivation World Simulator

## 1) Назначение документа
- > Полное руководство по установке, настройке и запуску проекта.
- > Последнее обновление: 2026-02-28
- ---
- | Компонент | Минимум | Рекомендуется |

## 2) Ключевые темы
- 📦 Установка и запуск Cultivation World Simulator
- 📋 Системные требования
- 🚀 Быстрый старт
- 1. Клонирование проекта
- 2. Установка зависимостей
- 3. Инициализация базы данных
- 4. Запуск
- 🎮 Первый запуск
- 📁 Структура проекта
- 🛠️ Доступные скрипты
- ⚙️ Конфигурация
- Переменные окружения (.env)

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- **Автоматически создаётся персонаж** — имя "Путник", вариант старта "Секта"
- **Сессия сохраняется** — ID записывается в localStorage
- **LLM генерирует историю** — уникальное вступление
- Сессия восстанавливается из localStorage автоматически
- **z-ai** (по умолчанию) — через SDK
- **local** — Ollama
- **api** — кастомный API
- **Character** — персонажи с культивацией
- **CharacterTechnique** — изученные техники с мастерством
- **Technique** — шаблоны техник
- **Location** — локации (3D координаты)
- **NPC** — неигровые персонажи

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
- const fs = require('fs');
- const path = require('path');
- const envPath = path.join(process.cwd(), '.env');
- const envContent = 'DATABASE_URL=file:/home/z/my-project/db/custom.db\n';
- if (!fs.existsSync(envPath)) {
- if (!fs.existsSync(envPath)) { fs.writeFileSync(envPath, envContent); console.log('[init-env] Created .env file'); } else { console.log('[init-env] .env already exists'); }
- import { sendEvent } from '@/lib/game/event-bus/client';
- const result = await sendEvent(data);
- import { eventBusClient } from '@/lib/game/event-bus/client';
- const result = await eventBusClient.sendEvent('event:type', eventData);

> Источник: `/docs/INSTALL.md`. Этот файл сформирован для быстрого чтения и миграции.
