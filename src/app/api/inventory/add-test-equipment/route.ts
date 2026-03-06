/**
 * API для добавления тестовой экипировки
 * 
 * POST /api/inventory/add-test-equipment
 * Добавляет полный набор экипировки для тестирования
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Тестовый набор экипировки культиватора
const TEST_EQUIPMENT = [
  // Оружие
  {
    name: 'Духовный меч новичка',
    nameId: 'spirit_sword_novice',
    description: 'Простой меч, созданный для практики. Умеренно проводит Ци.',
    type: 'equipment',
    category: 'weapon',
    rarity: 'uncommon',
    icon: '🗡️',
    equipmentSlot: 'right_hand',
    quantity: 1,
    stackable: false,
    maxStack: 1,
    weight: 2.5,
    value: 50,
    sizeWidth: 1,
    sizeHeight: 2,
  },
  {
    name: 'Деревянный щит',
    nameId: 'wooden_shield',
    description: 'Простой деревянный щит для защиты.',
    type: 'equipment',
    category: 'armor',
    rarity: 'common',
    icon: '🛡️',
    equipmentSlot: 'left_hand',
    quantity: 1,
    stackable: false,
    maxStack: 1,
    weight: 3.0,
    value: 20,
    sizeWidth: 2,
    sizeHeight: 2,
  },
  // Броня
  {
    name: 'Мантия ученика',
    nameId: 'disciple_robe',
    description: 'Стандартная мантия ученика секты. Лёгкая и удобная.',
    type: 'equipment',
    category: 'armor',
    rarity: 'common',
    icon: '👘',
    equipmentSlot: 'torso',
    quantity: 1,
    stackable: false,
    maxStack: 1,
    weight: 1.5,
    value: 30,
    sizeWidth: 2,
    sizeHeight: 2,
  },
  {
    name: 'Капюшон культиватора',
    nameId: 'cultivator_hood',
    description: 'Простой капюшон для защиты от солнца и дождя.',
    type: 'equipment',
    category: 'armor',
    rarity: 'common',
    icon: '🧢',
    equipmentSlot: 'head',
    quantity: 1,
    stackable: false,
    maxStack: 1,
    weight: 0.3,
    value: 15,
    sizeWidth: 1,
    sizeHeight: 1,
  },
  {
    name: 'Сапоги странника',
    nameId: 'traveler_boots',
    description: 'Удобные сапоги для долгих путешествий.',
    type: 'equipment',
    category: 'armor',
    rarity: 'common',
    icon: '👢',
    equipmentSlot: 'feet',
    quantity: 1,
    stackable: false,
    maxStack: 1,
    weight: 1.0,
    value: 25,
    sizeWidth: 1,
    sizeHeight: 1,
  },
  // Аксессуары
  {
    name: 'Кольцо проводимости',
    nameId: 'conductivity_ring',
    description: 'Простое кольцо, улучшающее проводимость меридиан.',
    type: 'equipment',
    category: 'accessory',
    rarity: 'uncommon',
    icon: '💍',
    equipmentSlot: 'accessory1',
    quantity: 1,
    stackable: false,
    maxStack: 1,
    weight: 0.1,
    value: 80,
    sizeWidth: 1,
    sizeHeight: 1,
  },
  {
    name: 'Амулет защиты',
    nameId: 'protection_amulet',
    description: 'Амулет с базовой защитой от негативной энергии.',
    type: 'equipment',
    category: 'accessory',
    rarity: 'uncommon',
    icon: '📿',
    equipmentSlot: 'accessory2',
    quantity: 1,
    stackable: false,
    maxStack: 1,
    weight: 0.2,
    value: 100,
    sizeWidth: 1,
    sizeHeight: 1,
  },
  // Расходники для теста
  {
    name: 'Малая таблетка Ци',
    nameId: 'qi_pill_small',
    description: 'Восстанавливает 50 единиц Ци.',
    type: 'consumable',
    category: 'consumable',
    rarity: 'common',
    icon: '💊',
    quantity: 10,
    stackable: true,
    maxStack: 99,
    weight: 0.1,
    value: 10,
    sizeWidth: 1,
    sizeHeight: 1,
    isConsumable: true,
    effects: JSON.stringify({ qiRestore: 50 }),
  },
  {
    name: 'Лечебная таблетка',
    nameId: 'healing_pill',
    description: 'Восстанавливает 20 здоровья.',
    type: 'consumable',
    category: 'consumable',
    rarity: 'common',
    icon: '🩹',
    quantity: 5,
    stackable: true,
    maxStack: 99,
    weight: 0.1,
    value: 20,
    sizeWidth: 1,
    sizeHeight: 1,
    isConsumable: true,
    effects: JSON.stringify({ healthRestore: 20 }),
  },
  // Материалы
  {
    name: 'Низкосортный духовный камень',
    nameId: 'spirit_stone_low',
    description: 'Содержит 100 единиц Ци. Можно поглотить.',
    type: 'spirit_stone',
    category: 'material',
    rarity: 'common',
    icon: '💎',
    quantity: 25,
    stackable: true,
    maxStack: 999,
    weight: 0.1,
    value: 1,
    sizeWidth: 1,
    sizeHeight: 1,
    isConsumable: true,
    effects: JSON.stringify({ qiRestore: 100 }),
  },
];

export async function POST(request: NextRequest) {
  try {
    const { characterId, clearExisting = false } = await request.json();

    if (!characterId) {
      return NextResponse.json({
        success: false,
        error: 'Character ID is required',
      }, { status: 400 });
    }

    // Проверяем существование персонажа
    const character = await db.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return NextResponse.json({
        success: false,
        error: 'Character not found',
      }, { status: 404 });
    }

    // Если нужно, очищаем существующий инвентарь
    if (clearExisting) {
      await db.inventoryItem.deleteMany({
        where: { characterId },
      });
      await db.equipment.deleteMany({
        where: { characterId },
      });
    }

    // Получаем текущие предметы для определения позиций
    const existingItems = await db.inventoryItem.findMany({
      where: { characterId, location: 'inventory' },
      select: { posX: true, posY: true, sizeWidth: true, sizeHeight: true },
    });

    // Вычисляем занятые ячейки
    const occupied = new Set<string>();
    for (const item of existingItems) {
      if (item.posX !== null && item.posY !== null) {
        for (let dx = 0; dx < (item.sizeWidth || 1); dx++) {
          for (let dy = 0; dy < (item.sizeHeight || 1); dy++) {
            occupied.add(`${item.posX + dx},${item.posY + dy}`);
          }
        }
      }
    }

    // Добавляем предметы
    const createdItems = [];
    let currentX = 0;
    let currentY = 0;

    for (const itemData of TEST_EQUIPMENT) {
      // Ищем свободную позицию для предмета
      const width = itemData.sizeWidth || 1;
      const height = itemData.sizeHeight || 1;
      let foundPos = false;

      outer:
      for (let y = currentY; y < 7; y++) {
        for (let x = (y === currentY ? currentX : 0); x < 7; x++) {
          // Проверяем, влезает ли предмет
          let canPlace = true;
          for (let dx = 0; dx < width && canPlace; dx++) {
            for (let dy = 0; dy < height && canPlace; dy++) {
              if (x + dx >= 7 || y + dy >= 7 || occupied.has(`${x + dx},${y + dy}`)) {
                canPlace = false;
              }
            }
          }

          if (canPlace) {
            currentX = x;
            currentY = y;
            foundPos = true;
            break outer;
          }
        }
      }

      if (!foundPos) {
        // Инвентарь полон, пропускаем предмет
        console.log(`[TestEquipment] No space for ${itemData.name}`);
        continue;
      }

      // Создаём предмет
      const item = await db.inventoryItem.create({
        data: {
          characterId,
          name: itemData.name,
          nameId: itemData.nameId,
          description: itemData.description,
          type: itemData.type,
          category: itemData.category,
          rarity: itemData.rarity,
          icon: itemData.icon,
          quantity: itemData.quantity || 1,
          maxStack: itemData.maxStack || 1,
          stackable: itemData.stackable ?? true,
          weight: itemData.weight || 0,
          value: itemData.value || 0,
          sizeWidth: itemData.sizeWidth || 1,
          sizeHeight: itemData.sizeHeight || 1,
          posX: currentX,
          posY: currentY,
          location: 'inventory',
          equipmentSlot: null,
          isEquipped: false,
          isConsumable: itemData.isConsumable ?? false,
          effects: itemData.effects || null,
        },
      });

      // Занимаем ячейки
      for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < height; dy++) {
          occupied.add(`${currentX + dx},${currentY + dy}`);
        }
      }

      // Обновляем позицию для следующего предмета
      currentX += width;
      if (currentX >= 7) {
        currentX = 0;
        currentY += height;
      }

      createdItems.push(item);
    }

    return NextResponse.json({
      success: true,
      message: `Added ${createdItems.length} items to inventory`,
      items: createdItems.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        category: i.category,
        rarity: i.rarity,
        quantity: i.quantity,
        position: { x: i.posX, y: i.posY },
      })),
    });
  } catch (error) {
    console.error('[AddTestEquipment] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
