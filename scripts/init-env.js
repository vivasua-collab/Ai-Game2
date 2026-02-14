#!/usr/bin/env node
/**
 * Простой скрипт инициализации БД
 * Создаёт .env, папку db/ и базу данных
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const dbDir = path.join(rootDir, 'db');
const dbFile = path.join(dbDir, 'custom.db');
const envFile = path.join(rootDir, '.env');

console.log('\n🔧 Инициализация...\n');

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
  
  // Запуск prisma
  const prismaBin = path.join(rootDir, 'node_modules', '.bin', 'prisma');
  execSync(`node "${prismaBin}" db push --accept-data-loss`, {
    cwd: rootDir,
    stdio: 'inherit'
  });
  
  console.log('✅ База данных создана\n');
} else {
  console.log('✅ База данных существует\n');
}

console.log('🎉 Готово\n');
