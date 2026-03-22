/**
 * Генерация расходников (consumables) для Cultivation World
 * 
 * Запуск: bun run scripts/generate-items.ts
 * 
 * Генерирует:
 * - pills (таблетки) - 20 шт
 * - elixirs (эликсиры) - 15 шт  
 * - food (еда) - 15 шт
 * - scrolls (свитки) - 10 шт
 */

import {
  generateConsumables,
  resetConsumableCounter,
  type ConsumableType,
} from '../src/lib/generator/consumable-generator';
import * as fs from 'fs';
import * as path from 'path';

const PRESETS_DIR = path.join(process.cwd(), 'presets');
const ITEMS_DIR = path.join(PRESETS_DIR, 'items');

// Конфигурация генерации
const GENERATION_CONFIG: Array<{ type: ConsumableType; count: number; levels: [number, number] }> = [
  { type: 'pill', count: 25, levels: [1, 5] },
  { type: 'elixir', count: 20, levels: [2, 7] },
  { type: 'food', count: 20, levels: [1, 3] },
  { type: 'scroll', count: 15, levels: [3, 9] },
];

// Русские названия типов
const TYPE_NAMES: Record<ConsumableType, string> = {
  pill: 'Таблетки',
  elixir: 'Эликсиры',
  food: 'Еда',
  scroll: 'Свитки',
};

async function main() {
  console.log('=== Генерация расходников ===\n');
  
  // Создаём директорию
  fs.mkdirSync(ITEMS_DIR, { recursive: true });
  
  let totalGenerated = 0;
  
  for (const config of GENERATION_CONFIG) {
    const { type, count, levels } = config;
    
    console.log(`\n--- ${TYPE_NAMES[type]} (${count} шт) ---`);
    
    // Сбрасываем счётчик для каждого типа
    resetConsumableCounter();
    
    // Генерируем с разбросом уровней
    const items: any[] = [];
    
    for (let i = 0; i < count; i++) {
      const level = levels[0] + Math.floor(Math.random() * (levels[1] - levels[0] + 1));
      
      const result = generateConsumables(1, {
        type,
        level,
        mode: 'append',
      });
      
      if (result.success && result.consumables.length > 0) {
        items.push(result.consumables[0]);
        
        const item = result.consumables[0];
        const effectInfo = item.effect.duration 
          ? `${item.effect.type} ${item.effect.value} (${item.effect.duration}с)`
          : `${item.effect.type} ${item.effect.value}`;
        console.log(`  ${item.id}: ${item.name} [L${item.level}] - ${effectInfo}`);
      }
    }
    
    // Сохраняем в файл
    const filePath = path.join(ITEMS_DIR, `${type}.json`);
    const fileContent = {
      version: '2.0',
      type,
      count: items.length,
      items,
    };
    
    fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf-8');
    
    console.log(`  Сохранено: ${filePath}`);
    totalGenerated += items.length;
  }
  
  // Генерируем manifest
  const manifest = {
    version: '2.0',
    generatedAt: new Date().toISOString(),
    types: GENERATION_CONFIG.map(c => ({
      type: c.type,
      name: TYPE_NAMES[c.type],
      file: `${c.type}.json`,
      count: c.count,
    })),
    total: totalGenerated,
  };
  
  const manifestPath = path.join(PRESETS_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  
  // Обновляем counters
  const countersPath = path.join(PRESETS_DIR, 'counters.json');
  const counters = {
    lastRun: new Date().toISOString(),
    consumables: totalGenerated,
  };
  fs.writeFileSync(countersPath, JSON.stringify(counters, null, 2), 'utf-8');
  
  console.log(`\n=== Итого: ${totalGenerated} расходников ===`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch(console.error);
