#!/usr/bin/env node
/**
 * Скрипт инициализации окружения
 * Кроссплатформенное решение для Windows/Linux/macOS
 * 
 * Создаёт:
 * 1. Папку db/
 * 2. Файл .env с путём к БД
 * 3. Базу данных через prisma db push
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

// 2. Создаём .env из .env.example если не существует
if (!fs.existsSync(envFile)) {
  // Используем абсолютный путь для надёжности
  const absoluteDbPath = path.join(dbDir, 'custom.db');
  const envContent = `# Конфигурация базы данных
# Абсолютный путь к файлу БД
DATABASE_URL=file:${absoluteDbPath.replace(/\\/g, '/')}
`;
  fs.writeFileSync(envFile, envContent, 'utf8');
  console.log('✅ Создан файл .env');
  console.log(`   DATABASE_URL=file:${absoluteDbPath.replace(/\\/g, '/')}`);
} else {
  console.log('✅ Файл .env существует');
}

// 3. Проверяем существование БД и создаём если нужно
if (!fs.existsSync(dbFile)) {
  console.log('');
  console.log('📊 База данных не найдена, создаём...');
  console.log('');
  
  try {
    // Кроссплатформенная команда для prisma db push
    // Используем npx так как он доступен везде где есть npm
    // На Windows npx работает корректно
    
    // Сначала пробуем через bunx (быстрее), если есть bun
    let pushCommand;
    let packageManager = 'npx';
    
    // Проверяем наличие bun по разным признакам
    const hasBun = fs.existsSync(path.join(rootDir, 'bun.lock')) || 
                   fs.existsSync(path.join(rootDir, 'bun.lockb')) ||
                   process.env.BUN_INSTALL ||
                   fs.existsSync(path.join(process.env.HOME || process.env.USERPROFILE || '', '.bun'));
    
    if (hasBun) {
      packageManager = 'bunx';
      pushCommand = 'bunx prisma db push --accept-data-loss --skip-generate';
    } else {
      pushCommand = 'npx prisma db push --accept-data-loss --skip-generate';
    }
    
    console.log(`   Менеджер пакетов: ${packageManager}`);
    console.log(`   Выполняю: ${pushCommand}`);
    console.log('');
    
    execSync(pushCommand, {
      cwd: rootDir,
      stdio: 'inherit',
      timeout: 120000,
      env: { ...process.env }
    });
    
    console.log('');
    
    if (fs.existsSync(dbFile)) {
      console.log('✅ База данных успешно создана');
    } else {
      console.log('⚠️  База данных могла быть создана в другом месте');
    }
  } catch (error) {
    console.log('');
    console.log('❌ Ошибка при создании БД:');
    console.log(`   ${error.message}`);
    console.log('');
    console.log('   Попробуйте выполнить вручную:');
    console.log('   bun run db:push');
    console.log('   или');
    console.log('   npx prisma db push');
    console.log('');
  }
} else {
  console.log('✅ База данных существует');
}

console.log('');
console.log('🎉 Инициализация завершена');
console.log('');
