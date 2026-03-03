/**
 * API экипировки предметов
 * POST - экипировать предмет
 * DELETE - снять предмет
 */

import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/inventory.service";
import { z } from "zod";

const equipSchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
  itemId: z.string().min(1, "itemId is required"),
  slotId: z.enum([
    'head', 'torso', 'left_hand', 'right_hand',
    'legs', 'feet', 'accessory1', 'accessory2',
    'back', 'backpack'
  ]),
});

const unequipSchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
  slotId: z.enum([
    'head', 'torso', 'left_hand', 'right_hand',
    'legs', 'feet', 'accessory1', 'accessory2',
    'back', 'backpack'
  ]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = equipSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const { characterId, itemId, slotId } = validation.data;
    const equipment = await inventoryService.equipItem(characterId, itemId, slotId);

    return NextResponse.json({
      success: true,
      equipment: Object.fromEntries(equipment),
    });
  } catch (error) {
    console.error("Error equipping item:", error);
    const message = error instanceof Error ? error.message : "Failed to equip item";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const validation = unequipSchema.safeParse({
      characterId: searchParams.get("characterId"),
      slotId: searchParams.get("slotId"),
    });
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const { characterId, slotId } = validation.data;
    const equipment = await inventoryService.unequipItem(characterId, slotId);

    return NextResponse.json({
      success: true,
      equipment: Object.fromEntries(equipment),
    });
  } catch (error) {
    console.error("Error unequipping item:", error);
    const message = error instanceof Error ? error.message : "Failed to unequip item";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
