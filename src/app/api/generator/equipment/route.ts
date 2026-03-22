/**
 * API для генерации экипировки v2 (оружие, броня, аксессуары, зарядники)
 * 
 * Использует архитектуру "Матрёшка":
 * Base → Material → Grade → Final
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  generateEquipmentV2, 
  generateEquipmentBatch,
  type EquipmentType,
  type EquipmentGrade,
} from '@/lib/generator/equipment-generator-v2';
import { presetStorage } from '@/lib/generator/preset-storage';
import type { IdPrefix } from '@/lib/generator/id-config';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const type = searchParams.get('type'); // weapon, armor, accessory, charger

  try {
    await presetStorage.initialize();

    if (action === 'list') {
      const items = await presetStorage.loadItems();
      const filtered = type ? items.filter(i => i.type === type) : items;
      
      return NextResponse.json({
        success: true,
        items: filtered,
        total: filtered.length,
      });
    }

    if (action === 'stats') {
      const items = await presetStorage.loadItems();
      
      const byType: Record<string, number> = {};
      const byGrade: Record<string, number> = {};
      
      for (const item of items) {
        byType[item.type] = (byType[item.type] || 0) + 1;
        // Для v2 используем grade вместо rarity
        const grade = (item as any).grade || 'common';
        byGrade[grade] = (byGrade[grade] || 0) + 1;
      }
      
      return NextResponse.json({
        success: true,
        stats: {
          total: items.length,
          byType,
          byGrade,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Неизвестное действие. Используйте: ?action=list или ?action=stats',
    });
  } catch (error) {
    console.error('[Equipment API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action,
      type,        // weapon, armor, accessory, charger
      level,       // 1-9
      grade,       // damaged, common, refined, perfect, transcendent
      materialId,  // ID материала из materials-registry
      count = 50,
      mode = 'append',
    } = body;

    await presetStorage.initialize();

    // Очистка
    if (action === 'clear') {
      const items = await presetStorage.loadItems();
      const toDelete = type ? items.filter(i => i.type === type) : items;
      
      if (type) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'presets', 'items', `${type}.json`);
        try {
          await fs.unlink(filePath);
        } catch {
          // Файл не существует
        }
      }
      
      return NextResponse.json({
        success: true,
        deleted: toDelete.length,
        message: `Удалено ${toDelete.length} объектов`,
      });
    }

    // Валидация типа
    const validTypes: EquipmentType[] = ['weapon', 'armor', 'accessory', 'charger'];
    if (!validTypes.includes(type as EquipmentType)) {
      return NextResponse.json({
        success: false,
        error: `Неверный тип экипировки. Используйте: ${validTypes.join(', ')}`,
      }, { status: 400 });
    }

    // Генерация с использованием v2
    if (action === 'generate') {
      const levels = level && level > 0 ? [level] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const allItems: any[] = [];
      
      for (const lvl of levels) {
        const itemsForLevel = generateEquipmentBatch(
          Math.ceil(count / levels.length),
          {
            type: type as EquipmentType,
            level: lvl,
            grade: grade as EquipmentGrade | undefined,
            materialId,
          }
        );
        
        // Конвертируем в формат для сохранения
        const convertedItems = itemsForLevel.map(item => ({
          id: presetStorage.generateId(getPrefixForType(type)),
          name: item.name,
          nameEn: item.name,
          description: generateDescription(item),
          type: item.type,
          category: getCategoryForType(item.type),
          grade: item.grade,
          materialId: item.materialId,
          material: item.material,
          effectiveStats: item.effectiveStats,
          durability: item.durability,
          bonuses: item.bonuses,
          specialEffects: item.specialEffects,
          requirements: item.requirements,
          value: item.value,
          icon: getIconForType(item.type),
          sizeWidth: 1,
          sizeHeight: item.type === 'weapon' ? 2 : 2,
          rarity: gradeToRarity(item.grade),
        }));
        
        allItems.push(...convertedItems);
      }
      
      await presetStorage.saveItems(allItems, mode);
      
      return NextResponse.json({
        success: true,
        generated: allItems.length,
        message: `Сгенерировано ${allItems.length} единиц ${getTypeName(type)} (v2)`,
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Неизвестное действие. Используйте: generate, clear',
    }, { status: 400 });
    
  } catch (error) {
    console.error('[Equipment API] Generation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка генерации',
    }, { status: 500 });
  }
}

// Helper functions

function getPrefixForType(type: string): IdPrefix {
  const prefixes: Record<string, IdPrefix> = {
    weapon: 'WP',
    armor: 'AR',
    accessory: 'AC',
    charger: 'CH',
  };
  return prefixes[type] || 'IT';
}

function getCategoryForType(type: string): string {
  return type; // Для v2 категория = тип
}

function getIconForType(type: string): string {
  const icons: Record<string, string> = {
    weapon: '⚔️',
    armor: '🛡️',
    accessory: '💎',
    charger: '⚡',
  };
  return icons[type] || '📦';
}

function getTypeName(type: string): string {
  const names: Record<string, string> = {
    weapon: 'оружия',
    armor: 'брони',
    accessory: 'аксессуаров',
    charger: 'зарядников',
  };
  return names[type] || 'экипировки';
}

function gradeToRarity(grade: string): string {
  const mapping: Record<string, string> = {
    damaged: 'common',
    common: 'common',
    refined: 'uncommon',
    perfect: 'rare',
    transcendent: 'legendary',
  };
  return mapping[grade] || 'common';
}

function generateDescription(item: any): string {
  const parts: string[] = [];
  
  parts.push(`${item.name} — ${item.type === 'weapon' ? 'оружие' : item.type === 'armor' ? 'броня' : item.type === 'charger' ? 'зарядник' : 'аксессуар'}`);
  
  if (item.material) {
    parts.push(`из ${item.material.name.toLowerCase()}`);
  }
  
  parts.push(`уровня ${item.level}.`);
  parts.push(`Качество: ${item.gradeConfig?.name || item.grade}.`);
  
  if (item.effectiveStats?.damage) {
    parts.push(`Урон: ${item.effectiveStats.damage}.`);
  }
  if (item.effectiveStats?.defense) {
    parts.push(`Защита: ${item.effectiveStats.defense}.`);
  }
  if (item.effectiveStats?.qiConductivity) {
    parts.push(`Проводимость Ци: ${item.effectiveStats.qiConductivity}.`);
  }
  
  return parts.join(' ');
}
