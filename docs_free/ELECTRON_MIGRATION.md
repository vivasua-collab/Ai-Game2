# Упрощённая версия: Анализ проекта для Electron портирования

## 1) Назначение документа
- **Дата:** 2026-02-26
- **Проект:** Cultivation World Simulator
- **Текущий стек:** Next.js 16 + Phaser 3
- ---

## 2) Ключевые темы
- Анализ проекта для Electron портирования
- 1. Текущая архитектура
- Фронтенд
- Бэкенд
- 2. Проблемные зоны для портирования
- 🔴 Критические
- 2.1 Next.js App Router
- 2.2 API Routes
- 🟡 Средние
- 2.3 Prisma в Electron
- 2.4 LLM Integration
- 🟢 Минимальные

## 3) Алгоритм (читаемый шаблон)
1. Входные данные: определить контекст, сущности и ограничения.
2. Шаги: выполнить операции по разделам документа последовательно.
3. Проверка: сверить состояние/результат с ожидаемым.
4. Выход: сохранить результат, обновить связанные данные/доки.

## 4) Практические шаги
- **Vite + React** — миграция на чистый React с Vite
- **Electron + Next.js** — использовать electron-next (но это усложняет сборку)
- **Tauri** — альтернатива Electron (меньше размер, но Rust)
- Использовать `prisma generate` для каждой платформы
- База данных SQLite уже локальная — идеально для Electron
- Ollama (локальный LLM сервер)
- [x] Вынести бизнес-логику в services
- [x] Абстрагировать API вызовы
- [ ] Создать общий интерфейс для renderer/main
- [ ] Заменить Next.js на Vite
- [ ] Перенести pages в чистый React Router
- [ ] Перенести API routes в services

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
- import { meditationService } from '@/services/meditation.service';
- await meditationService.perform(data);
- const result = await window.electronAPI.meditation(data);
- ipcMain.handle('meditation', async (event, data) => {
- return await performMeditation(data);

> Источник: `/docs/ELECTRON_MIGRATION.md`. Этот файл сформирован для быстрого чтения и миграции.
