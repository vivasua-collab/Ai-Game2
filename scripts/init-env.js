#!/usr/bin/env node
/**
 * Скрипт инициализации окружения
 * Кроссплатформенное решение для Windows/Linux/macOS
 * 
 * Создаёт:
 * 1. Папку db/
 * 2. Файл .env с относительным путём к БД
 * 3. Пустой файл БД (чтобы prisma использовал его)
 * 4. Схему БД через prisma db push
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Кроссплатформенное определение корневой директории
const rootDir = path.resolve(__dirname, '..');
const dbDir = path.join(rootDir, 'db');
const dbFile = path.join(dbDir, 'custom.db');
const envFile = path.join(rootDir, '.env');

console.log('');
console.log('🔧 Проверка окружения...');
console.log(`   Платформа: ${process.platform}`);
console.log(`   Корневая директория: ${rootDir}`);
console.log('');

// 0. Проверяем наличие зависимостей
const nodeModulesDir = path.join(rootDir, 'node_modules');
const nextBinPath = path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next');

if (!fs.existsSync(nodeModulesDir)) {
  console.log('⚠️  Зависимости не установлены!');
  console.log('   Выполните: bun install');
  console.log('');
  process.exit(1);
}

if (!fs.existsSync(nextBinPath)) {
  console.log('⚠️  Next.js не найден в node_modules!');
  console.log('   Выполните: bun install');
  console.log('');
  process.exit(1);
}

// 1. Создаём папку db/ если не существует
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Создана папка db/');
} else {
  console.log('✅ Папка db/ существует');
}

// 2. Создаём .env с относительным путём если не существует
if (!fs.existsSync(envFile)) {
  const envContent = `# Конфигурация базы данных
# Относительный путь к файлу БД (от корня проекта)
DATABASE_URL=file:./db/custom.db
`;
  fs.writeFileSync(envFile, envContent, 'utf8');
  console.log('✅ Создан файл .env');
  console.log('   DATABASE_URL=file:./db/custom.db');
} else {
  console.log('✅ Файл .env существует');
}

// 3. Проверяем существование БД и создаём если нужно
if (!fs.existsSync(dbFile)) {
  console.log('');
  console.log('📊 База данных не найдена, создаём...');
  console.log('');
  
  try {
    // ШАГ 1: Создаём пустой файл-заготовку
    // Prisma создаст валидную SQLite БД при подключении к пустому файлу
    console.log('   [1/2] Создание файла БД...');
    
    // Создаём абсолютно пустой файл
    fs.writeFileSync(dbFile, Buffer.alloc(0));
    console.log(`   ✅ Создан файл: ${dbFile}`);
    
    // ШАГ 2: Запускаем prisma db push для создания таблиц
    console.log('   [2/2] Создание схемы БД...');
    
    // Используем локальный prisma из node_modules
    const prismaBinPath = path.join(rootDir, 'node_modules', '.bin', 'prisma');
    const pushCommand = `node "${prismaBinPath}" db push --accept-data-loss`;
    
    console.log(`   Запуск: prisma db push`);
    
    execSync(pushCommand, {
      cwd: rootDir,
      stdio: 'inherit',
      timeout: 120000,
      env: { ...process.env }
    });
    
    console.log('');
    
    if (fs.existsSync(dbFile)) {
      const stats = fs.statSync(dbFile);
      console.log(`✅ База данных создана: ${dbFile}`);
      console.log(`   Размер: ${stats.size} байт`);
    } else {
      console.log('❌ Файл БД не создан');
    }
  } catch (error) {
    console.log('');
    console.log('❌ Ошибка при создании БД:');
    console.log(`   ${error.message}`);
    console.log('');
    console.log('   Попробуйте выполнить вручную:');
    console.log('   bun run db:push');
    console.log('');
  }
} else {
  console.log('✅ База данных существует');
}

console.log('');
console.log('🎉 Инициализация завершена');
console.log('');
