/**
 * API духовного хранилища
 * GET - получить хранилище
 * POST - переместить предмет из хранилища в инвентарь
 */

import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/inventory.service";
import { z } from "zod";

const querySchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
});

const moveFromStorageSchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
  storageIndex: z.number().int().min(0),
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
    const storage = await inventoryService.getSpiritStorage(characterId);

    return NextResponse.json({
      success: true,
      storage,
    });
  } catch (error) {
    console.error("Error fetching storage:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch storage" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = moveFromStorageSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const { characterId, storageIndex } = validation.data;
    const inventory = await inventoryService.moveItemFromStorage(characterId, storageIndex);

    return NextResponse.json({
      success: true,
      inventory,
    });
  } catch (error) {
    console.error("Error moving from storage:", error);
    const message = error instanceof Error ? error.message : "Failed to move item from storage";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
