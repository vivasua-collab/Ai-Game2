/**
 * API инвентаря
 * GET - получить инвентарь персонажа
 * POST - добавить предмет
 */

import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/inventory.service";
import {
  inventoryQuerySchema,
  inventoryAddSchema,
  validateOrError,
  validationErrorResponse,
} from "@/lib/validations/game";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Zod validation for query params
    const validation = validateOrError(inventoryQuerySchema, {
      characterId: searchParams.get("characterId"),
    });
    
    if (!validation.success) {
      return NextResponse.json(
        validationErrorResponse(validation.error),
        { status: 400 }
      );
    }

    const { characterId } = validation.data;
    const items = await inventoryService.getInventory(characterId);

    // ✅ Возвращаем 'items' для соответствия контракту UI (UpgradeDialog, RepairDialog)
    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zod validation
    const validation = validateOrError(inventoryAddSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        validationErrorResponse(validation.error),
        { status: 400 }
      );
    }
    
    const { characterId, presetId, quantity, name, type, rarity, description, effects } = validation.data;

    let item;
    if (presetId) {
      item = await inventoryService.addItemFromPreset(characterId, presetId, quantity ?? 1);
      if (!item) {
        return NextResponse.json(
          { success: false, error: `Preset "${presetId}" not found` },
          { status: 400 }
        );
      }
    } else {
      // Для добавления без пресета требуется name и type
      if (!name || !type) {
        return NextResponse.json(
          { success: false, error: "name and type are required when presetId is not provided" },
          { status: 400 }
        );
      }
      // ✅ Исправлена сигнатура: addItem принимает (characterId, data)
      item = await inventoryService.addItem(characterId, { 
        name, 
        type: type as any, // ItemType
        category: 'misc' as any, // ItemCategory по умолчанию
        rarity: (rarity || 'common') as any, // ItemRarity
        icon: '📦',
        quantity: quantity ?? 1,
      });
    }

    return NextResponse.json({
      success: true,
      item,
    });
  } catch (error) {
    console.error("Error adding item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add item" },
      { status: 500 }
    );
  }
}
