# 🌸 Cultivation World Simulator

Симулятор мира культивации — современное веб-приложение для управления персонажем в мире, вдохновлённом восточными фэнтези-играми с системой Ци.

## 📋 Описание проекта

Cultivation World Simulator — это интерактивная игра-симулятор, где игроки управляют персонажем-культиватором. Основные возможности:

- **Система культивации** — медитация, накопление Ци, прорывы на новые уровни
- **Управление персонажем** — здоровье, энергия, аспекты культивации
- **Исследование мира** — локации, события, взаимодействия
- **Динамическое время** — внутриигровое время с сменой времени суток
- **Система усталости** — реалистичное управление ресурсами персонажа

## ✨ Технологический стек

Этот проект построен на современных технологиях:

### 🎯 Основной фреймворк
- **⚡ Next.js 15** — React фреймворк для продакшена с App Router
- **📘 TypeScript 5** — Типобезопасный JavaScript
- **🎨 Tailwind CSS 4** — Utility-first CSS фреймворк

### 🧩 UI компоненты и стилизация
- **🧩 shadcn/ui** — Качественные доступные компоненты на Radix UI
- **🎯 Lucide React** — Красивая библиотека иконок
- **🌈 Framer Motion** — Библиотека анимаций для React

### 🔄 Управление состоянием
- **🐻 Zustand** — Простое, масштабируемое управление состоянием
- **🔄 TanStack Query** — Мощная синхронизация данных для React

### 🗄️ База данных и бэкенд
- **🗄️ Prisma** — TypeScript ORM нового поколения
- **🔐 NextAuth.js** — Полное решение для аутентификации

### 🤖 AI интеграция
- **🧠 z-ai-web-dev-sdk** — Интеграция с AI для генерации контента

## 🚀 Установка

```bash
# Клонирование репозитория
git clone https://github.com/vivasua-collab/Ai-Game2.git

# Переход в директорию проекта
cd Ai-Game2

# Установка зависимостей
npm install
```

## 🎮 Запуск

```bash
# Запуск сервера разработки
npm run dev

# Сборка для продакшена
npm run build

# Запуск продакшен сервера
npm start

# Проверка качества кода
npm run lint
```

Откройте [http://localhost:3000](http://localhost:3000) чтобы увидеть приложение.

## 🏗️ Архитектура

### Структура проекта

```
src/
├── app/                    # Next.js App Router страницы
│   └── api/               # API роуты
├── components/            # React компоненты
│   ├── game/             # Игровые компоненты
│   └── ui/               # shadcn/ui компоненты
├── hooks/                 # Пользовательские React хуки
├── lib/                   # Утилиты и конфигурации
│   ├── game/             # Игровая логика
│   └── validations/      # Zod схемы валидации
├── services/              # Сервисный слой
│   ├── game.service.ts   # Игровые действия
│   ├── session.service.ts # Управление сессиями
│   ├── character.service.ts # CRUD персонажа
│   ├── world.service.ts  # Управление миром
│   └── game-client.service.ts # Клиентские API вызовы
├── stores/                # Zustand хранилища
└── types/                 # TypeScript типы
```

### Ключевые принципы

1. **Сервер — источник истины**
   - Все расчёты происходят на сервере
   - Клиент только отображает данные
   - API возвращает полный `characterState`

2. **Разделение ответственности**
   - `services/` — серверные действия (изменяют БД)
   - `lib/game/` — общие функции расчёта
   - `hooks/` — только управление состоянием React
   - `stores/` — глобальное состояние Zustand

3. **Поток данных**
   ```
   User Action → API → Business Logic → Database → Response with characterState
                    ↓
              Client updates state from response
   ```

## 📡 API

### Основные эндпоинты

| Эндпоинт | Метод | Описание |
|----------|-------|----------|
| `/api/game/start` | POST | Начать новую игру |
| `/api/chat` | POST | Отправить действие/сообщение |
| `/api/game/save` | POST | Сохранить игру |
| `/api/game/state` | GET | Получить состояние игры |

### Примеры запросов

**Начало игры:**
```typescript
POST /api/game/start
{
  "variant": "standard",
  "characterName": "Имя персонажа"
}
```

**Отправка действия:**
```typescript
POST /api/chat
{
  "sessionId": "uuid",
  "message": "Начать медитацию на 1 час"
}
```

**Сохранение игры:**
```typescript
POST /api/game/save
{
  "sessionId": "uuid",
  "isPaused": false
}
```

### Игровые типы

```typescript
// Основные типы персонажа
interface Character {
  id: string;
  name: string;
  realm: string;
  stage: number;
  currentQi: number;
  coreCapacity: number;
  health: number;
  fatigue: number;
  lifespan: number;
}

// Время мира
interface WorldTime {
  hour: number;
  minute: number;
  daysSinceStart: number;
}
```

## 🛠️ Разработка

### Требования
- Node.js 18+
- npm или bun

### Скрипты

```bash
# Разработка
npm run dev          # Запуск dev сервера (port 3000)
npm run lint         # Проверка ESLint

# База данных
npm run db:push      # Применить схему Prisma
npm run db:studio    # Открыть Prisma Studio
```

### Код-стайл

- TypeScript во всём проекте со строгой типизацией
- ES6+ import/export синтаксис
- shadcn/ui компоненты предпочтительнее кастомных
- Использование `'use client'` и `'use server'` директив

### Валидация

Все API роуты используют Zod валидацию:

```typescript
// Пример схемы валидации
const sendMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(5000),
});
```

### Тестирование

Проект готов к unit-тестированию благодаря:
- Сервисному слою без состояния
- Dependency injection паттерну
- Чистым функциям расчётов

## 🤝 Участие в разработке

1. Создайте форк репозитория
2. Создайте ветку для фичи (`git checkout -b feature/amazing-feature`)
3. Закоммитьте изменения (`git commit -m 'Add amazing feature'`)
4. Запушьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект распространяется под MIT лицензией.

---

Построено с ❤️ командой Cultivation World. 
