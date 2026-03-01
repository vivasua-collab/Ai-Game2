/**
 * API данных персонажа (техники, навыки)
 * GET - получить техники и навыки персонажа
 */

import { NextRequest, NextResponse } from "next/server";
import { getCharacterFullData, getCharacterTechniques, getCharacterSkills } from "@/services/character-data.service";
import {
  characterDataQuerySchema,
  validateOrError,
  validationErrorResponse,
} from "@/lib/validations/game";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Zod validation for query params
    const validation = validateOrError(characterDataQuerySchema, {
      characterId: searchParams.get("characterId"),
      type: searchParams.get("type") || "all",
    });
    
    if (!validation.success) {
      return NextResponse.json(
        validationErrorResponse(validation.error),
        { status: 400 }
      );
    }

    const { characterId, type } = validation.data;

    if (type === "techniques") {
      const techniques = await getCharacterTechniques(characterId);
      return NextResponse.json({ success: true, techniques });
    }

    if (type === "skills") {
      const skills = await getCharacterSkills(characterId);
      return NextResponse.json({ success: true, skills });
    }

    // По умолчанию возвращаем всё
    const data = await getCharacterFullData(characterId);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error("Error fetching character data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch character data" },
      { status: 500 }
    );
  }
}
