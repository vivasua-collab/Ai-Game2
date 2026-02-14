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
    
    let pushCommand;
    let packageManager = 'npx';
    
    // Проверяем наличие bun
    const hasBun = fs.existsSync(path.join(rootDir, 'bun.lock')) || 
                   fs.existsSync(path.join(rootDir, 'bun.lockb'));
    
    if (hasBun) {
      packageManager = 'bunx';
      pushCommand = 'bunx prisma db push --accept-data-loss --skip-generate';
    } else {
      pushCommand = 'npx prisma db push --accept-data-loss --skip-generate';
    }
    
    console.log(`   Менеджер пакетов: ${packageManager}`);
    
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
