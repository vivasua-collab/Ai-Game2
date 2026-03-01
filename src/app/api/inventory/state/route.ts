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
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get("characterId");
    
    console.log("[inventory/state] Request received for characterId:", characterId);
    
    const validation = querySchema.safeParse({ characterId });
    
    if (!validation.success) {
      console.error("[inventory/state] Validation error:", validation.error.issues);
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const { characterId: validId } = validation.data;
    
    // Получаем все данные последовательно с обработкой ошибок
    let inventory = null;
    let equipment: Map<string, unknown> = new Map();
    let storage = null;
    let items: unknown[] = [];

    try {
      inventory = await inventoryService.getInventoryState(validId);
      console.log("[inventory/state] Inventory loaded:", inventory ? "OK" : "NULL");
    } catch (err) {
      console.error("[inventory/state] getInventoryState error:", err);
    }

    try {
      equipment = await inventoryService.getCharacterEquipment(validId);
      console.log("[inventory/state] Equipment loaded:", equipment.size, "items");
    } catch (err) {
      console.error("[inventory/state] getCharacterEquipment error:", err);
    }

    try {
      storage = await inventoryService.getSpiritStorage(validId);
      console.log("[inventory/state] Storage loaded:", storage ? "OK" : "NULL");
    } catch (err) {
      console.error("[inventory/state] getSpiritStorage error:", err);
    }

    try {
      items = await inventoryService.getCharacterItems(validId);
      console.log("[inventory/state] Items loaded:", items.length, "items");
    } catch (err) {
      console.error("[inventory/state] getCharacterItems error:", err);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[inventory/state] Completed in ${elapsed}ms`);

    return NextResponse.json({
      success: true,
      inventory,
      equipment: Object.fromEntries(equipment),
      storage,
      items,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[inventory/state] Critical error after ${elapsed}ms:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch inventory state",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
