#!/usr/bin/env node
/**
 * Скрипт инициализации окружения
 * Создаёт необходимые папки и файлы при первом запуске
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const dbDir = path.join(rootDir, 'db');
const envFile = path.join(rootDir, '.env');
const envExample = path.join(rootDir, '.env.example');

console.log('🔧 Проверка окружения...');

// 1. Создаём папку db/ если не существует
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Создана папка db/');
} else {
  console.log('✅ Папка db/ существует');
}

// 2. Создаём .env из .env.example если не существует
if (!fs.existsSync(envFile)) {
  if (fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envFile);
    console.log('✅ Создан файл .env из .env.example');
  } else {
    // Создаём минимальный .env
    fs.writeFileSync(envFile, 'DATABASE_URL=file:./db/custom.db\n');
    console.log('✅ Создан файл .env с настройками по умолчанию');
  }
} else {
  console.log('✅ Файл .env существует');
}

console.log('🎉 Инициализация завершена');
