/**
 * API экипировки предметов
 * POST - экипировать предмет
 * DELETE - снять предмет
 * 
 * Phase 15.6: Добавлена проверка durability и broken состояния
 */

import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/inventory.service";
import { db } from "@/lib/db";
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

    // === Phase 15.6: Проверка состояния предмета ===
    const item = await db.inventoryItem.findFirst({
      where: { id: itemId, characterId },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Предмет не найден" },
        { status: 404 }
      );
    }

    // Проверка на сломанное состояние
    const condition = item.durabilityCondition ?? "pristine";
    const durabilityCurrent = item.durabilityCurrent ?? item.durability ?? 100;
    const durabilityMax = item.durabilityMax ?? item.maxDurability ?? 100;
    const durabilityPercent = (durabilityCurrent / durabilityMax) * 100;

    // Нельзя экипировать сломанные предметы (condition = broken или durability < 20%)
    if (condition === "broken" || durabilityPercent < 20) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Нельзя экипировать сломанный предмет! Сначала отремонтируйте его.",
          code: "ITEM_BROKEN",
          item: {
            id: item.id,
            name: item.name,
            durabilityCurrent,
            durabilityMax,
            condition,
          },
        },
        { status: 400 }
      );
    }

    // Предупреждение о плохом состоянии (worn/damaged)
    const warningMessage = condition === "damaged" 
      ? "⚠️ Предмет в плохом состоянии. Рекомендуется ремонт."
      : condition === "worn" 
        ? "Предмет изношен. Стоит подумать о ремонте."
        : undefined;

    // Экипируем предмет
    const equipment = await inventoryService.equipItem(characterId, itemId, slotId);

    return NextResponse.json({
      success: true,
      equipment: Object.fromEntries(equipment),
      ...(warningMessage && { warning: warningMessage }),
      item: {
        id: item.id,
        name: item.name,
        grade: item.grade,
        condition,
        durabilityPercent: Math.round(durabilityPercent),
      },
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
