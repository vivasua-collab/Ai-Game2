/**
 * API для добавления тестовых предметов в инвентарь
 * POST - добавить Камень Ци в инвентарь персонажа
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createQiStoneItem, QiStoneQuality, QI_STONE_DEFINITIONS } from "@/types/qi-stones";
import { TruthSystem } from "@/lib/game/truth-system";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { characterId, quality = "stone", quantity = 1 } = body;

    if (!characterId) {
      return NextResponse.json(
        { success: false, error: "characterId is required" },
        { status: 400 }
      );
    }

    // Проверяем существование персонажа
    const character = await db.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return NextResponse.json(
        { success: false, error: "Character not found" },
        { status: 404 }
      );
    }

    // Валидация качества
    const validQualities = Object.keys(QI_STONE_DEFINITIONS) as QiStoneQuality[];
    if (!validQualities.includes(quality)) {
      return NextResponse.json(
        { success: false, error: `Invalid quality. Must be one of: ${validQualities.join(", ")}` },
        { status: 400 }
      );
    }

    // Создаём предмет на основе определения
    const itemData = createQiStoneItem(quality as QiStoneQuality, quantity);
    const def = QI_STONE_DEFINITIONS[quality as QiStoneQuality];

    // Ищем существующий стак
    const existingItem = await db.inventoryItem.findFirst({
      where: {
        characterId,
        nameId: itemData.nameId,
        location: "inventory",
        quantity: { lt: def.maxStack },
      },
    });

    let item;

    if (existingItem) {
      // Увеличиваем количество в существующем стаке
      const newQuantity = Math.min(
        existingItem.quantity + quantity,
        def.maxStack
      );

      item = await db.inventoryItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          weight: def.weight * newQuantity,
        },
      });

      console.log(`[QiStone] Updated stack: ${itemData.name} x${newQuantity}`);
    } else {
      // Находим свободную позицию
      const existingItems = await db.inventoryItem.findMany({
        where: { characterId, location: "inventory" },
        select: { posX: true, posY: true, sizeWidth: true, sizeHeight: true },
      });

      const occupied = new Set<string>();
      for (const i of existingItems) {
        if (i.posX !== null && i.posY !== null) {
          for (let dx = 0; dx < (i.sizeWidth || 1); dx++) {
            for (let dy = 0; dy < (i.sizeHeight || 1); dy++) {
              occupied.add(`${i.posX + dx},${i.posY + dy}`);
            }
          }
        }
      }

      // Ищем свободное место (7x7 сетка)
      let posX = 0;
      let posY = 0;
      const gridWidth = 7;
      const gridHeight = 7;

      outer:
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          if (!occupied.has(`${x},${y}`)) {
            posX = x;
            posY = y;
            break outer;
          }
        }
      }

      // Создаём новый предмет
      item = await db.inventoryItem.create({
        data: {
          characterId,
          name: itemData.name,
          nameId: itemData.nameId,
          description: itemData.description,
          type: itemData.type,
          category: itemData.category,
          rarity: itemData.rarity,
          icon: itemData.icon,
          quantity: itemData.quantity,
          maxStack: itemData.maxStack,
          stackable: true,
          sizeWidth: itemData.size.width,
          sizeHeight: itemData.size.height,
          weight: def.weight * quantity,
          posX,
          posY,
          location: "inventory",
          isConsumable: true,
          stats: JSON.stringify(itemData.stats || {}),
          effects: JSON.stringify(itemData.consumable || {}),
          value: itemData.value,
          currency: "spirit_stones",
        },
      });

      console.log(`[QiStone] Created item: ${itemData.name} x${quantity} at (${posX}, ${posY})`);
    }

    // Обновляем инвентарь в TruthSystem если сессия загружена
    const session = TruthSystem.getSessionByCharacter(characterId);
    if (session) {
      // Перезагружаем инвентарь из БД в память
      const allItems = await db.inventoryItem.findMany({
        where: { characterId },
      });
      
      TruthSystem.updateInventory(session.sessionId, allItems.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        quantity: i.quantity,
        rarity: i.rarity,
        isConsumable: i.isConsumable,
        effects: i.effects ? JSON.parse(i.effects) : null,
      })));
      
      console.log(`[QiStone] TruthSystem inventory updated`);
    }

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        name: item.name,
        type: item.type,
        quantity: item.quantity,
        rarity: item.rarity,
        icon: item.icon,
      },
      message: `Добавлен ${itemData.name} x${quantity} в инвентарь`,
    });
  } catch (error) {
    console.error("Error adding Qi Stone:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add Qi Stone" },
      { status: 500 }
    );
  }
}

/**
 * GET - получить информацию о доступных камнях Ци
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    qiStones: Object.entries(QI_STONE_DEFINITIONS).map(([quality, def]) => ({
      quality,
      name: def.name,
      rarity: def.rarity,
      qiContent: def.qiContent,
      value: def.value,
      icon: def.icon,
    })),
  });
}
