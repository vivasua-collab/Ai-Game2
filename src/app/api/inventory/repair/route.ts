/**
 * API ремонта экипировки
 * POST - выполнить ремонт предмета
 * GET - получить доступные методы ремонта
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  RepairMethod,
  DurabilityState,
  EquipmentGrade,
} from "@/types/equipment-v2";
import {
  REPAIR_METHODS,
  repairEquipment,
  canRepair,
  getAvailableRepairMethods,
} from "@/lib/game/repair-system";
import { GRADE_CONFIGS } from "@/lib/game/grade-system";

// ============================================================================
// SCHEMAS
// ============================================================================

const repairSchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
  itemId: z.string().min(1, "itemId is required"),
  method: z.enum(["field_repair", "proper_repair", "master_repair", "divine_repair"]),
  materials: z.array(z.string()).optional().default([]),
  skill: z.number().min(0).optional().default(0),
});

const previewSchema = z.object({
  itemId: z.string().min(1, "itemId is required"),
  method: z.enum(["field_repair", "proper_repair", "master_repair", "divine_repair"]),
  skill: z.number().min(0).optional().default(0),
});

const availableMethodsSchema = z.object({
  skill: z.number().min(0).optional().default(0),
  materials: z.array(z.string()).optional().default([]),
});

// ============================================================================
// GET - Available methods
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const validation = availableMethodsSchema.safeParse({
      skill: searchParams.get("skill") ? parseInt(searchParams.get("skill")!) : 0,
      materials: searchParams.get("materials")?.split(",").filter(Boolean) || [],
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const { skill, materials } = validation.data;
    const methods = getAvailableRepairMethods(skill, materials);

    return NextResponse.json({
      success: true,
      methods: methods.map((m) => ({
        id: m.id,
        name: m.name,
        durabilityRestore: m.durabilityRestore,
        quality: m.quality,
        downgradeRisk: m.downgradeRisk,
        goldCost: m.goldCost,
        materialsNeeded: m.materialCost,
        skillRequired: m.skillRequired,
        description: m.description,
      })),
    });
  } catch (error) {
    console.error("Error getting repair methods:", error);
    const message = error instanceof Error ? error.message : "Failed to get repair methods";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// ✅ S1-5: HELPERS - Валидация и списание материалов
// ============================================================================

/**
 * ✅ S1-5: Проверить наличие материалов И списать их (внутри транзакции)
 * @throws Error если материалов недостаточно
 */
async function validateAndConsumeRepairMaterials(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  characterId: string,
  method: RepairMethod
): Promise<void> {
  const requiredMaterials = REPAIR_METHODS[method].materialCost;
  
  for (const materialId of requiredMaterials) {
    const item = await tx.inventoryItem.findFirst({
      where: {
        characterId,
        nameId: materialId,
        quantity: { gte: 1 },
        location: 'inventory',
        isEquipped: false,
      },
    });

    if (!item) {
      throw new Error(`INSUFFICIENT_MATERIALS:${materialId}`);
    }

    if (item.quantity > 1) {
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: { decrement: 1 } },
      });
    } else {
      await tx.inventoryItem.delete({
        where: { id: item.id },
      });
    }
  }
}

function getGradeDisplayName(grade: EquipmentGrade): string {
  return GRADE_CONFIGS[grade]?.name || grade;
}

// ============================================================================
// POST - Perform repair
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = repairSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const { characterId, itemId, method, materials, skill } = validation.data;

    // Получаем предмет из БД
    const item = await db.inventoryItem.findFirst({
      where: {
        id: itemId,
        characterId,
      },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Предмет не найден" },
        { status: 404 }
      );
    }

    // Проверяем, что предмет можно ремонтировать
    if (item.category !== "weapon" && item.category !== "armor" && item.category !== "accessory") {
      return NextResponse.json(
        { success: false, error: "Этот предмет нельзя ремонтировать" },
        { status: 400 }
      );
    }

    // Получаем текущее состояние прочности
    const durability: DurabilityState = {
      current: item.durabilityCurrent ?? item.durability ?? 100,
      max: item.durabilityMax ?? item.maxDurability ?? 100,
      condition: (item.durabilityCondition as DurabilityState["condition"]) ?? "pristine",
      repairCount: item.repairCount ?? 0,
      lastRepairQuality: item.lastRepairQuality ?? 100,
      totalDamageAbsorbed: item.totalDamageAbsorbed ?? 0,
    };

    // Текущий грейд
    const grade = (item.grade as EquipmentGrade) ?? "common";

    // Получаем конфигурацию метода ремонта
    const methodConfig = REPAIR_METHODS[method];
    const requiredMaterials = methodConfig.materialCost;

    // ✅ S1-5: Проверка возможности ремонта
    const check = canRepair(durability, { method, materials: requiredMaterials, skill, bonuses: [] });
    if (!check.canRepair) {
      return NextResponse.json(
        { success: false, error: check.reason },
        { status: 400 }
      );
    }

    // ✅ S1-5: ВЫПОЛНЯЕМ ВСЁ В ТРАНЗАКЦИИ
    const result = await db.$transaction(async (tx) => {
      // Проверка и списание материалов (атомарно)
      try {
        await validateAndConsumeRepairMaterials(tx, characterId, method);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('INSUFFICIENT_MATERIALS:')) {
          const missing = error.message.split(':')[1];
          throw new Error(`Недостаточно материалов: ${missing}`);
        }
        throw error;
      }

      // Списание дух камней
      const character = await tx.character.findUnique({
        where: { id: characterId },
      });

      if (!character) {
        throw new Error('Персонаж не найден');
      }

      if (character.spiritStones < methodConfig.goldCost) {
        throw new Error(`Недостаточно дух камней: нужно ${methodConfig.goldCost}, есть ${character.spiritStones}`);
      }

      await tx.character.update({
        where: { id: characterId },
        data: { spiritStones: { decrement: methodConfig.goldCost } },
      });

      // Выполняем ремонт
      const { durability: newDurability, result: repairResult } = repairEquipment(
        durability,
        grade,
        { method, materials: requiredMaterials, skill, bonuses: [] }
      );

      // Обновляем предмет в БД
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          durabilityCurrent: newDurability.current,
          durabilityMax: newDurability.max,
          durabilityCondition: newDurability.condition,
          durability: newDurability.current, // Совместимость со старой схемой
          maxDurability: newDurability.max,
          grade: repairResult.newGrade,
          gradeName: getGradeDisplayName(repairResult.newGrade),
          repairCount: newDurability.repairCount,
          lastRepairQuality: repairResult.quality,
          // Обновляем эффективные статы при понижении грейда
          ...(repairResult.didDowngrade && {
            effectiveDamage: Math.floor((item.effectiveDamage ?? 0) * 0.8),
            effectiveDefense: Math.floor((item.effectiveDefense ?? 0) * 0.8),
          }),
        },
      });

      return { newDurability, repairResult, updatedItem };
    });

    return NextResponse.json({
      success: true,
      result: {
        quality: result.repairResult.quality,
        durabilityRestored: result.repairResult.durabilityRestored,
        newDurability: {
          current: result.newDurability.current,
          max: result.newDurability.max,
          condition: result.newDurability.condition,
        },
        newGrade: result.repairResult.newGrade,
        didDowngrade: result.repairResult.didDowngrade,
        message: result.repairResult.message,
      },
      item: {
        id: result.updatedItem.id,
        name: result.updatedItem.name,
        grade: result.updatedItem.grade,
        durabilityCurrent: result.updatedItem.durabilityCurrent,
        durabilityMax: result.updatedItem.durabilityMax,
        durabilityCondition: result.updatedItem.durabilityCondition,
      },
    });
  } catch (error) {
    console.error("Error repairing item:", error);
    const message = error instanceof Error ? error.message : "Failed to repair item";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
