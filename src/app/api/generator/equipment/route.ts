/**
 * API для генерации экипировки (оружие, броня, аксессуары)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateWeapons, type WeaponGenerationOptions } from '@/lib/generator/weapon-generator';
import { generateArmor, type ArmorGenerationOptions } from '@/lib/generator/armor-generator';
import { generateAccessories, type AccessoryGenerationOptions } from '@/lib/generator/accessory-generator';
import { presetStorage } from '@/lib/generator/preset-storage';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const type = searchParams.get('type'); // weapon, armor, accessory

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
      const byRarity: Record<string, number> = {};
      
      for (const item of items) {
        byType[item.type] = (byType[item.type] || 0) + 1;
        byRarity[item.rarity] = (byRarity[item.rarity] || 0) + 1;
      }
      
      return NextResponse.json({
        success: true,
        stats: {
          total: items.length,
          byType,
          byRarity,
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
      type,        // weapon, armor, accessory
      level,       // 0 = все уровни, 1-9 = конкретный
      rarity,
      category,    // Для оружия
      weaponType,  // Для оружия
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

    // Генерация оружия
    if (type === 'weapon') {
      const options: WeaponGenerationOptions = {
        level: level && level > 0 ? level : undefined,
        minLevel: level === 0 || !level ? 1 : undefined,
        maxLevel: level === 0 || !level ? 9 : undefined,
        rarity,
        category,
        weaponType,
        count,
        mode,
      };
      
      const result = generateWeapons(count, options);
      
      if (result.success && result.items) {
        const itemsToSave = result.items.map(w => ({
          id: w.id,
          name: w.name,
          nameEn: w.nameEn,
          description: w.description,
          type: 'weapon',
          category: w.category,
          rarity: w.rarity,
          icon: '⚔️',
          sizeWidth: 1,
          sizeHeight: 2,
          stats: {
            damage: w.baseDamage,
            range: w.baseRange,
            attackSpeed: w.attackSpeed,
            critChance: w.properties.critChance,
            critDamage: w.properties.critDamage,
            armorPenetration: w.properties.armorPenetration,
          },
          requirements: w.requirements,
          value: w.baseDamage * 10 + w.level * 100,
          currency: 'spirit_stones',
        }));
        
        await presetStorage.saveItems(itemsToSave, mode);
      }
      
      return NextResponse.json({
        success: result.success,
        generated: result.generated,
        errors: result.errors,
        message: result.success 
          ? `Сгенерировано ${result.generated} единиц оружия`
          : `Ошибка: ${result.errors.join(', ')}`,
      });
    }

    // Генерация брони
    if (type === 'armor') {
      const options: ArmorGenerationOptions = {
        level: level && level > 0 ? level : undefined,
        minLevel: level === 0 || !level ? 1 : undefined,
        maxLevel: level === 0 || !level ? 9 : undefined,
        rarity,
        count,
        mode,
      };
      
      const result = generateArmor(count, options);
      
      if (result.success && result.items) {
        const itemsToSave = result.items.map(a => ({
          id: a.id,
          name: a.name,
          nameEn: a.nameEn,
          description: a.description,
          type: 'armor',
          category: a.slot,
          rarity: a.rarity,
          icon: getArmorIcon(a.slot),
          sizeWidth: a.size?.width || 2,
          sizeHeight: a.size?.height || 2,
          stats: {
            defense: a.defense,
            qiRegen: a.qiRegen,
            healthBonus: a.healthBonus,
          },
          requirements: a.requirements,
          value: (a.defense || 10) * 15 + (a.level || 1) * 150,
          currency: 'spirit_stones',
        }));
        
        await presetStorage.saveItems(itemsToSave, mode);
      }
      
      return NextResponse.json({
        success: result.success,
        generated: result.generated,
        errors: result.errors,
        message: result.success 
          ? `Сгенерировано ${result.generated} единиц брони`
          : `Ошибка: ${result.errors.join(', ')}`,
      });
    }

    // Генерация аксессуаров
    if (type === 'accessory') {
      const options: AccessoryGenerationOptions = {
        level: level && level > 0 ? level : undefined,
        minLevel: level === 0 || !level ? 1 : undefined,
        maxLevel: level === 0 || !level ? 9 : undefined,
        rarity,
        count,
        mode,
      };
      
      const result = generateAccessories(count, options);
      
      if (result.success && result.items) {
        const itemsToSave = result.items.map(a => ({
          id: a.id,
          name: a.name,
          nameEn: a.nameEn,
          description: a.description,
          type: 'accessory',
          category: a.slot,
          rarity: a.rarity,
          icon: getAccessoryIcon(a.slot),
          sizeWidth: 1,
          sizeHeight: 1,
          stats: a.stats,
          effects: a.effects,
          requirements: a.requirements,
          value: a.value || 100,
          currency: 'spirit_stones',
        }));
        
        await presetStorage.saveItems(itemsToSave, mode);
      }
      
      return NextResponse.json({
        success: result.success,
        generated: result.generated,
        errors: result.errors,
        message: result.success 
          ? `Сгенерировано ${result.generated} аксессуаров`
          : `Ошибка: ${result.errors.join(', ')}`,
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Неизвестный тип экипировки. Используйте: weapon, armor, accessory',
    }, { status: 400 });
    
  } catch (error) {
    console.error('[Equipment API] Generation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка генерации',
    }, { status: 500 });
  }
}

function getArmorIcon(slot: string): string {
  const icons: Record<string, string> = {
    head: '🪖',
    torso: '👕',
    legs: '👖',
    feet: '👢',
    hands: '🧤',
  };
  return icons[slot] || '🛡️';
}

function getAccessoryIcon(slot: string): string {
  const icons: Record<string, string> = {
    ring: '💍',
    necklace: '📿',
    bracelet: '🎰',
    talisman: '🔱',
  };
  return icons[slot] || '💎';
}
