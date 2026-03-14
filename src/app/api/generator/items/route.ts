/**
 * API для работы с предметами (экипировкой)
 * 
 * Поддерживаемые действия:
 * - list: Получить список всех предметов
 * - stats: Статистика по предметам
 * - storage: Анализ хранилища
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

// Каталог для хранения
const DATA_DIR = path.join(process.cwd(), 'presets');
const ITEMS_DIR = path.join(DATA_DIR, 'items');

interface EquipmentItem {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  type: string;
  category: string;
  rarity: string;
  icon: string;
  sizeWidth: number;
  sizeHeight: number;
  stats?: Record<string, number>;
  effects?: Array<{ type: string; value: number; duration?: number }>;
  requirements?: Record<string, number>;
  value: number;
  currency: string;
}

interface ItemsFile {
  version: string;
  type: string;
  count: number;
  items: EquipmentItem[];
}

/**
 * Загрузить все предметы из директории
 */
async function loadAllItems(): Promise<EquipmentItem[]> {
  const items: EquipmentItem[] = [];
  
  try {
    const entries = await fs.readdir(ITEMS_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const filePath = path.join(ITEMS_DIR, entry.name);
        const content = await fs.readFile(filePath, 'utf-8');
        const data: ItemsFile = JSON.parse(content);
        
        if (data.items && Array.isArray(data.items)) {
          items.push(...data.items);
        }
      }
    }
  } catch (error) {
    // Директория не существует или пуста
    console.log('[Items API] No items found:', error);
  }
  
  return items;
}

/**
 * Получить статистику по предметам
 */
async function getItemsStats(items: EquipmentItem[]) {
  const byType: Record<string, number> = {};
  const byRarity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  
  for (const item of items) {
    byType[item.type] = (byType[item.type] || 0) + 1;
    byRarity[item.rarity] = (byRarity[item.rarity] || 0) + 1;
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
  }
  
  return {
    total: items.length,
    byType,
    byRarity,
    byCategory,
  };
}

/**
 * Анализ хранилища
 */
async function analyzeStorage() {
  let totalFiles = 0;
  let totalSize = 0;
  let totalObjects = 0;
  
  try {
    const entries = await fs.readdir(ITEMS_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const filePath = path.join(ITEMS_DIR, entry.name);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        totalFiles++;
        totalSize += stats.size;
        totalObjects += data.items?.length || 0;
      }
    }
  } catch {
    // Игнорируем ошибки
  }
  
  return {
    totalFiles,
    totalSizeBytes: totalSize,
    totalObjects,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  try {
    // Убедимся что директория существует
    await fs.mkdir(ITEMS_DIR, { recursive: true });
    
    switch (action) {
      case 'list': {
        const items = await loadAllItems();
        return NextResponse.json({ 
          success: true, 
          items, 
          count: items.length 
        });
      }
      
      case 'stats': {
        const items = await loadAllItems();
        const stats = await getItemsStats(items);
        return NextResponse.json({ 
          success: true, 
          stats 
        });
      }
      
      case 'storage': {
        const storage = await analyzeStorage();
        return NextResponse.json({ 
          success: true, 
          storage 
        });
      }
      
      case 'check': {
        const items = await loadAllItems();
        return NextResponse.json({ 
          success: true, 
          hasItems: items.length > 0,
          count: items.length 
        });
      }
      
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Unknown action. Use: list, stats, storage, check' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[Items API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * Группировка предметов по типу
 */
function groupItemsByType(items: EquipmentItem[]): Record<string, EquipmentItem[]> {
  const grouped: Record<string, EquipmentItem[]> = {};
  
  for (const item of items) {
    const type = item.type || 'misc';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(item);
  }
  
  return grouped;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, items, mode = 'replace' } = body;
    
    // Убедимся что директория существует
    await fs.mkdir(ITEMS_DIR, { recursive: true });
    
    switch (action) {
      case 'save': {
        if (!items || !Array.isArray(items)) {
          return NextResponse.json({ 
            success: false, 
            error: 'Items array required' 
          }, { status: 400 });
        }
        
        // Группируем по типу
        const grouped = groupItemsByType(items);
        let saved = 0;
        
        for (const [type, typeItems] of Object.entries(grouped)) {
          const filePath = path.join(ITEMS_DIR, `${type}.json`);
          let allItems = typeItems;
          
          if (mode === 'append') {
            try {
              const content = await fs.readFile(filePath, 'utf-8');
              const existing = JSON.parse(content);
              allItems = [...existing.items, ...typeItems];
            } catch {
              // Файл не существует
            }
          }
          
          await fs.writeFile(filePath, JSON.stringify({
            version: '2.0',
            type,
            count: allItems.length,
            items: allItems,
          }, null, 2), 'utf-8');
          
          saved += typeItems.length;
        }
        
        return NextResponse.json({
          success: true,
          saved,
          message: `Сохранено ${saved} предметов`,
        });
      }
      
      case 'clear': {
        const { itemType } = body;
        
        if (itemType) {
          // Удалить конкретный тип
          const filePath = path.join(ITEMS_DIR, `${itemType}.json`);
          try {
            await fs.unlink(filePath);
            return NextResponse.json({ 
              success: true, 
              message: `Удалены предметы типа ${itemType}` 
            });
          } catch {
            return NextResponse.json({ 
              success: true, 
              message: `Файл не найден` 
            });
          }
        } else {
          // Удалить все предметы
          const entries = await fs.readdir(ITEMS_DIR, { withFileTypes: true });
          let deleted = 0;
          
          for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith('.json')) {
              await fs.unlink(path.join(ITEMS_DIR, entry.name));
              deleted++;
            }
          }
          
          return NextResponse.json({ 
            success: true, 
            message: `Удалено ${deleted} файлов` 
          });
        }
      }
      
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Unknown action. Use: save, clear' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[Items API] POST error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
