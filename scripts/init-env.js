#!/usr/bin/env node
/**
 * Скрипт инициализации БД
 * Создаёт .env, папку db/ и базу данных
 * Кроссплатформенный: Windows, Linux, macOS
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const dbDir = path.join(rootDir, 'db');
const dbFile = path.join(dbDir, 'custom.db');
const envFile = path.join(rootDir, '.env');
const isWindows = process.platform === 'win32';

console.log('\n🔧 Инициализация...');
console.log(`   Платформа: ${process.platform} (${isWindows ? 'Windows' : 'Unix-like'})\n`);

// 1. Папка db/
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Создана папка db/');
}

// 2. Файл .env
if (!fs.existsSync(envFile)) {
  fs.writeFileSync(envFile, 'DATABASE_URL=file:./db/custom.db\n');
  console.log('✅ Создан .env');
}

// 3. База данных
if (!fs.existsSync(dbFile)) {
  console.log('📊 Создание базы данных...');
  
  // Пустой файл для prisma
  fs.writeFileSync(dbFile, Buffer.alloc(0));
  
  // Выбор пути к prisma в зависимости от платформы
  let prismaPath;
  
  if (isWindows) {
    // Windows: прямой путь к файлу (symlinks в .bin не работают)
    prismaPath = path.join(rootDir, 'node_modules', 'prisma', 'build', 'index.js');
  } else {
    // Linux/macOS: используем прямой путь (надёжнее)
    prismaPath = path.join(rootDir, 'node_modules', 'prisma', 'build', 'index.js');
  }
  
  // Проверяем существование prisma
  if (!fs.existsSync(prismaPath)) {
    console.log('❌ Prisma не найдена. Выполните: bun install');
    process.exit(1);
  }
  
  execSync(`node "${prismaPath}" db push --accept-data-loss`, {
    cwd: rootDir,
    stdio: 'inherit'
  });
  
  console.log('✅ База данных создана\n');
} else {
  console.log('✅ База данных существует\n');
}

console.log('🎉 Готово\n');
