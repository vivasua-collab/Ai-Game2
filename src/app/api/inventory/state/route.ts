/**
 * API состояния инвентаря
 * GET - получить полное состояние инвентаря с экипировкой
 */

import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/inventory.service";
import { z } from "zod";

const querySchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const validation = querySchema.safeParse({
      characterId: searchParams.get("characterId"),
    });
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const { characterId } = validation.data;
    
    // Получаем все данные параллельно
    const [inventory, equipment, storage, items] = await Promise.all([
      inventoryService.getInventoryState(characterId),
      inventoryService.getCharacterEquipment(characterId),
      inventoryService.getSpiritStorage(characterId),
      inventoryService.getCharacterItems(characterId),
    ]);

    return NextResponse.json({
      success: true,
      inventory,
      equipment: Object.fromEntries(equipment),
      storage,
      items,
    });
  } catch (error) {
    console.error("Error fetching inventory state:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch inventory state" },
      { status: 500 }
    );
  }
}
