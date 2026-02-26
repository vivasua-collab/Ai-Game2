/**
 * API использования предмета
 * POST - использовать расходник
 */

import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/inventory.service";
import {
  inventoryUseSchema,
  validateOrError,
  validationErrorResponse,
} from "@/lib/validations/game";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zod validation
    const validation = validateOrError(inventoryUseSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        validationErrorResponse(validation.error),
        { status: 400 }
      );
    }

    const { characterId, itemId } = validation.data;
    const result = await inventoryService.useItem(characterId, itemId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error using item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to use item" },
      { status: 500 }
    );
  }
}
