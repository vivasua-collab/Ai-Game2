# 📦 Инструкция по установке Cultivation World Simulator

Полное руководство по разворачиванию проекта локально для Windows и Linux.

---

## 📋 Системные требования

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| **ОЗУ** | 4 ГБ | 8+ ГБ |
| **Место на диске** | 2 ГБ | 5 ГБ |
| **Node.js** | 18.x | 20.x+ |
| **Git** | 2.x | Последняя версия |

---

## 🪟 Windows

### Шаг 1: Установка Git

1. Скачайте Git: https://git-scm.com/download/win
2. Запустите установщик, следуйте инструкциям
3. Проверьте установку:
```powershell
git --version
```

### Шаг 2: Установка Node.js

**Вариант A: Через официальный сайт**
1. Скачайте Node.js: https://nodejs.org/ (LTS версия)
2. Запустите установщик
3. Проверьте:
```powershell
node --version
npm --version
```

**Вариант B: Через Chocolatey**
```powershell
# Установка Chocolatey (если нет)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Установка Node.js
choco install nodejs-lts -y
```

### Шаг 3: Установка Bun

**Вариант A: Через PowerShell**
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Вариант B: Через npm**
```powershell
npm install -g bun
```

Проверьте установку:
```powershell
bun --version
```

### Шаг 4: Клонирование проекта

Откройте PowerShell или Command Prompt:

```powershell
# Переход в папку проектов
cd C:\Users\YourName\Documents

# Клонирование репозитория
git clone https://github.com/vivasua-collab/Ai-Game2.git

# Переход в папку проекта
cd Ai-Game2
```

### Шаг 5: Установка зависимостей

```powershell
bun install
```

### Шаг 6: Настройка базы данных

```powershell
# Создание .env файла (если нет)
echo DATABASE_URL="file:./db/custom.db" > .env

# Инициализация базы данных
bun run db:push
```

### Шаг 7: Запуск проекта

```powershell
bun run dev
```

Откройте браузер: http://localhost:3000

---

## 🐧 Linux (Ubuntu/Debian)

### Шаг 1: Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### Шаг 2: Установка Git

```bash
sudo apt install git -y

# Проверка
git --version
```

### Шаг 3: Установка Node.js

**Вариант A: Через NodeSource (рекомендуется)**
```bash
# Добавление репозитория Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Установка
sudo apt install -y nodejs

# Проверка
node --version
npm --version
```

**Вариант B: Через nvm (менеджер версий)**
```bash
# Установка nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Перезагрузка shell
source ~/.bashrc

# Установка Node.js
nvm install 20
nvm use 20
```

### Шаг 4: Установка Bun

```bash
curl -fsSL https://bun.sh/install | bash

# Перезагрузка shell
source ~/.bashrc

# Или для zsh
source ~/.zshrc

# Проверка
bun --version
```

### Шаг 5: Клонирование проекта

```bash
# Переход в папку проектов
cd ~/Documents  # или ~/projects

# Клонирование репозитория
git clone https://github.com/vivasua-collab/Ai-Game2.git

# Переход в папку проекта
cd Ai-Game2
```

### Шаг 6: Установка зависимостей

```bash
bun install
```

### Шаг 7: Настройка базы данных

```bash
# Создание .env файла
echo 'DATABASE_URL="file:./db/custom.db"' > .env

# Инициализация базы данных
bun run db:push
```

### Шаг 8: Запуск проекта

```bash
bun run dev
```

Откройте браузер: http://localhost:3000

---

## 🐧 Linux (Fedora/RHEL)

### Шаг 1: Обновление системы

```bash
sudo dnf update -y
```

### Шаг 2: Установка Git

```bash
sudo dnf install git -y
```

### Шаг 3: Установка Node.js

```bash
# Добавление репозитория Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Установка
sudo dnf install -y nodejs

# Проверка
node --version
```

### Шаг 4: Установка Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### Шаг 5-8: Аналогично Ubuntu

См. шаги 5-8 для Ubuntu выше.

---

## 🍎 macOS

### Шаг 1: Установка Homebrew (если нет)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Шаг 2: Установка зависимостей

```bash
# Git
brew install git

# Node.js
brew install node@20

# Bun
brew install bun
```

### Шаг 3-8: Аналогично Linux

```bash
# Клонирование
git clone https://github.com/vivasua-collab/Ai-Game2.git
cd Ai-Game2

# Установка
bun install

# База данных
echo 'DATABASE_URL="file:./db/custom.db"' > .env
bun run db:push

# Запуск
bun run dev
```

---

## ⚙️ Настройка LLM (Нейросеть)

### Вариант 1: Ollama (РЕКОМЕНДУЕТСЯ - бесплатно, локально)

**Windows:**
1. Скачайте Ollama: https://ollama.com/download
2. Установите и запустите (Ollama запустится автоматически в трее)
3. Загрузите модель:
```powershell
ollama pull llama3
```

**Linux:**
```bash
# Установка Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Запуск сервера
ollama serve &

# Загрузка модели (выберите одну)
ollama pull llama3        # ~4.7 GB - хороший баланс
ollama pull llama3.1:8b   # ~4.7 GB - рекомендуется
ollama pull mistral       # ~4.1 GB - быстрее
ollama pull phi3          # ~2.3 GB - для слабых ПК
```

**После установки:** Просто запустите `bun run dev` - Ollama определится автоматически!

### Вариант 2: Z-AI SDK (требует API ключ)

Z-AI SDK требует конфигурационный файл с API ключом:

1. Создайте файл `.z-ai-config` в корне проекта:
```json
{
  "baseUrl": "https://your-api-server.com/v1",
  "apiKey": "YOUR_API_KEY",
  "chatId": "",
  "userId": ""
}
```

2. Запустите проект: `bun run dev`

**Примечание:** Z-AI SDK - это клиент для коммерческого API, требует регистрации и API ключа.

### Вариант 3: Внешний API (OpenAI, Anthropic и др.)

Создайте файл `.env.local` в корне проекта:

```env
# Выбор провайдера: local | z-ai | api
LLM_PROVIDER=api

# Настройки API (пример для OpenAI)
LLM_API_KEY=sk-your-api-key-here
LLM_API_ENDPOINT=https://api.openai.com/v1/chat/completions
LLM_API_MODEL=gpt-4

# Параметры генерации
LLM_TEMPERATURE=0.8
LLM_MAX_TOKENS=2000
```

---

## 🔧 Полезные команды

```bash
# Установка зависимостей
bun install

# Запуск в режиме разработки
bun run dev

# Проверка кода (lint)
bun run lint

# Сборка для продакшена
bun run build

# Запуск продакшен-версии
bun start

# Обновление базы данных
bun run db:push

# Просмотр данных в Prisma Studio
bunx prisma studio
```

---

## 🐛 Решение проблем

### Проблема: "bun: command not found"

**Linux/macOS:**
```bash
# Добавьте в PATH
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Windows:**
Переустановите Bun через PowerShell от имени администратора.

### Проблема: Ошибка при установке зависимостей

```bash
# Очистка кэша
bun pm cache rm

# Удаление node_modules
rm -rf node_modules

# Переустановка
bun install
```

### Проблема: Ошибка базы данных

```bash
# Удаление старой БД
rm -f db/custom.db
rm -f db/custom.db-journal

# Пересоздание
bun run db:push
```

### Проблема: Порт 3000 занят

```bash
# Linux/macOS - найти процесс
lsof -i :3000

# Завершить процесс
kill -9 <PID>

# Или использовать другой порт
PORT=3001 bun run dev
```

**Windows:**
```powershell
# Найти процесс
netstat -ano | findstr :3000

# Завершить процесс (замените PID)
taskkill /PID <PID> /F
```

### Проблема: Ollama не отвечает

```bash
# Проверка статуса
curl http://localhost:11434/api/tags

# Перезапуск сервиса
# Linux:
sudo systemctl restart ollama

# macOS/Windows: перезапустить приложение Ollama
```

---

## 📁 Структура проекта после установки

```
Ai-Game2/
├── db/
│   └── custom.db          # База данных SQLite
├── node_modules/          # Зависимости
├── prisma/
│   └── schema.prisma      # Схема БД
├── public/
│   └── images/            # Изображения
├── src/
│   ├── app/               # Страницы и API
│   ├── components/        # React компоненты
│   ├── data/              # Данные игры
│   ├── hooks/             # React хуки
│   └── lib/               # Библиотеки
├── .env                   # Переменные окружения
├── package.json           # Зависимости npm
└── README.md              # Документация
```

---

## ✅ Проверка установки

После запуска `bun run dev` откройте http://localhost:3000

Вы должны увидеть:
- 🌸 Экран выбора варианта старта
- 3 карточки: "Секта", "Свобода", "Кастомный"

Если всё работает — поздравляем! 🎉

---

## 🆘 Получение помощи

Если возникли проблемы:
1. Проверьте раздел "Решение проблем" выше
2. Создайте Issue на GitHub: https://github.com/vivasua-collab/Ai-Game2/issues

---

*Последнее обновление: 2024*
