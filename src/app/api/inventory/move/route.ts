/**
 * API перемещения предметов
 * POST - переместить предмет в инвентаре или между инвентарём и хранилищем
 */

import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/inventory.service";
import { z } from "zod";

const moveSchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
  itemId: z.string().min(1, "itemId is required"),
  toX: z.number().int().min(0).optional(),
  toY: z.number().int().min(0).optional(),
  toLocation: z.enum(['inventory', 'storage']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = moveSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const { characterId, itemId, toX, toY, toLocation } = validation.data;

    // Если перемещение в хранилище
    if (toLocation === 'storage') {
      const storage = await inventoryService.moveItemToStorage(characterId, itemId);
      return NextResponse.json({
        success: true,
        storage,
      });
    }

    // Обычное перемещение в инвентаре
    const item = await inventoryService.moveItemInInventory(characterId, {
      itemId,
      toX,
      toY,
      toLocation,
    });

    return NextResponse.json({
      success: true,
      item,
    });
  } catch (error) {
    console.error("Error moving item:", error);
    const message = error instanceof Error ? error.message : "Failed to move item";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
