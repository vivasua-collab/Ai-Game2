/**
 * API улучшения грейда экипировки
 * POST - попытка улучшения грейда
 * GET - получить информацию о возможности улучшения
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { EquipmentGrade, GradeChangeEvent } from "@/types/equipment-v2";
import {
  GRADE_CONFIGS,
  canUpgradeGrade,
  attemptUpgrade,
  getGradeInfo,
  getRequiredMaterialsForUpgrade,
  getRequiredSkillForUpgrade,
} from "@/lib/game/grade-system";

// ============================================================================
// SCHEMAS
// ============================================================================

const upgradeSchema = z.object({
  characterId: z.string().min(1, "characterId is required"),
  itemId: z.string().min(1, "itemId is required"),
  // ✅ Материалы теперь опциональны - сервер сам определяет требуемые материалы
  // по грейду предмета через getRequiredMaterialsForUpgrade()
  materials: z.array(z.string()).optional().default([]),
  skill: z.number().min(0).optional().default(0),
});

// ✅ S0-2: Добавлен characterId в previewSchema для authorization
const previewSchema = z.object({
  itemId: z.string().min(1, "itemId is required"),
  characterId: z.string().min(1, "characterId is required"), // ✅ Добавлено
  skill: z.number().min(0).optional().default(0),
  materials: z.array(z.string()).optional().default([]),
});

// ============================================================================
// GET - Preview upgrade info
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // ✅ S0-2: Добавлен characterId в парсинг параметров
    const validation = previewSchema.safeParse({
      itemId: searchParams.get("itemId"),
      characterId: searchParams.get("characterId"), // ✅ Добавлено
      skill: searchParams.get("skill") ? parseInt(searchParams.get("skill")!) : 0,
      materials: searchParams.get("materials")?.split(",").filter(Boolean) || [],
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const { itemId, characterId, skill, materials } = validation.data;

    // ✅ S0-2: Получаем предмет с проверкой принадлежности characterId
    const item = await db.inventoryItem.findFirst({
      where: { 
        id: itemId,
        characterId, // ✅ Проверка принадлежности
      },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Предмет не найден" },
        { status: 404 }
      );
    }

    const currentGrade = (item.grade as EquipmentGrade) ?? "common";
    const gradeInfo = getGradeInfo(currentGrade);

    // Если максимальный грейд
    if (!gradeInfo.nextGrade) {
      return NextResponse.json({
        success: true,
        canUpgrade: false,
        reason: "Максимальный грейд",
        currentGrade: {
          id: currentGrade,
          ...gradeInfo.config,
        },
      });
    }

    // Проверяем требования
    const requiredMaterials = getRequiredMaterialsForUpgrade(currentGrade);
    const requiredSkill = getRequiredSkillForUpgrade(currentGrade);
    const check = canUpgradeGrade(currentGrade, materials, skill);

    // Шанс успеха
    const skillBonus = Math.max(0, skill - requiredSkill) * 0.5;
    const successChance = Math.min(95, gradeInfo.config.upgradeChance + skillBonus);

    return NextResponse.json({
      success: true,
      canUpgrade: check.canUpgrade,
      reason: check.reason,
      currentGrade: {
        id: currentGrade,
        ...gradeInfo.config,
      },
      nextGrade: gradeInfo.nextGrade ? {
        id: gradeInfo.nextGrade,
        ...GRADE_CONFIGS[gradeInfo.nextGrade],
      } : null,
      requirements: {
        materials: requiredMaterials,
        skill: requiredSkill,
        hasMaterials: requiredMaterials.every((m) => materials.includes(m)),
        hasSkill: skill >= requiredSkill,
      },
      chances: {
        success: successChance,
        failNoChange: 100 - successChance - gradeInfo.config.downgradeRisk,
        failDowngrade: gradeInfo.config.downgradeRisk,
      },
    });
  } catch (error) {
    console.error("Error getting upgrade info:", error);
    const message = error instanceof Error ? error.message : "Failed to get upgrade info";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * ✅ S1-1: Проверить наличие материалов И списать их (внутри транзакции)
 * @throws Error если материалов недостаточно
 */
async function validateAndConsumeMaterials(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  characterId: string,
  requiredMaterials: string[]
): Promise<void> {
  for (const materialId of requiredMaterials) {
    const item = await tx.inventoryItem.findFirst({
      where: {
        characterId,
        nameId: materialId,
        quantity: { gte: 1 },
        location: 'inventory',  // ✅ Только из инвентаря
        isEquipped: false,       // ✅ Не из экипировки
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
  return GRADE_CONFIGS[grade].name;
}

// ============================================================================
// POST - Perform upgrade
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = upgradeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const { characterId, itemId, materials, skill } = validation.data;

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

    // Проверяем тип предмета
    if (item.category !== "weapon" && item.category !== "armor" && item.category !== "accessory") {
      return NextResponse.json(
        { success: false, error: "Этот предмет нельзя улучшить" },
        { status: 400 }
      );
    }

    const currentGrade = (item.grade as EquipmentGrade) ?? "common";
    
    // ✅ S1-1: Используем requiredMaterials вместо materials из body
    const requiredMaterials = getRequiredMaterialsForUpgrade(currentGrade);

    // ✅ S1-1: Предварительная проверка возможности upgrade
    const upgradeCheck = canUpgradeGrade(currentGrade, requiredMaterials, skill);
    if (!upgradeCheck.canUpgrade) {
      return NextResponse.json({
        success: false,
        error: upgradeCheck.reason,
      }, { status: 400 });
    }

    // ✅ S1-1: ВЫПОЛНЯЕМ ВСЁ В ТРАНЗАКЦИИ
    const result = await db.$transaction(async (tx) => {
      // Проверка И списание материалов (атомарно)
      try {
        await validateAndConsumeMaterials(tx, characterId, requiredMaterials);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('INSUFFICIENT_MATERIALS:')) {
          const missing = error.message.split(':')[1];
          throw new Error(`Недостаточно материалов: ${missing}`);
        }
        throw error;
      }

      // ✅ S1-1: Используем requiredMaterials, не materials из body!
      const upgradeResult = attemptUpgrade(currentGrade, requiredMaterials, skill);

      // Формируем данные для обновления
      const updateData: Record<string, unknown> = {
        grade: upgradeResult.newGrade,
        gradeName: getGradeDisplayName(upgradeResult.newGrade),
      };

      // Добавляем историю изменения грейда
      const existingHistory = item.gradeHistory ? JSON.parse(item.gradeHistory) : [];
      updateData.gradeHistory = JSON.stringify([...existingHistory, upgradeResult.event]);

      // Если грейд изменился — пересчитываем параметры
      if (upgradeResult.newGrade !== currentGrade) {
        const currentConfig = GRADE_CONFIGS[currentGrade];
        const newConfig = GRADE_CONFIGS[upgradeResult.newGrade];

        // НОРМАЛИЗАЦИЯ: делим на текущий множитель, потом умножаем на новый
        // Это предотвращает "уплывание" durability при повторных upgrade/downgrade
        const baseDurability = (item.durabilityMax ?? 100) / currentConfig.durabilityMultiplier;
        updateData.durabilityMax = Math.floor(baseDurability * newConfig.durabilityMultiplier);
        updateData.maxDurability = updateData.durabilityMax;

        // Пропорциональное обновление текущей прочности
        if (item.durabilityCurrent !== null && item.durabilityCurrent !== undefined && item.durabilityMax) {
          const currentPercent = item.durabilityCurrent / item.durabilityMax;
          updateData.durabilityCurrent = Math.floor((updateData.durabilityMax as number) * currentPercent);
        }

        // Пересчитываем урон (используем damageMultiplier)
        if (item.effectiveDamage) {
          const baseDamage = item.effectiveDamage / currentConfig.damageMultiplier;
          updateData.effectiveDamage = Math.floor(baseDamage * newConfig.damageMultiplier);
        }

        // Пересчитываем защиту (используем damageMultiplier, НЕ durabilityMultiplier)
        // Защита должна масштабироваться вместе с уроном, а не прочностью
        if (item.effectiveDefense) {
          const baseDefense = item.effectiveDefense / currentConfig.damageMultiplier;
          updateData.effectiveDefense = Math.floor(baseDefense * newConfig.damageMultiplier);
        }
      }

      // Обновляем предмет в БД
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: updateData,
      });

      return { upgradeResult, updatedItem };
    });

    // Генерируем сообщение
    let message = "";
    const didChange = result.upgradeResult.newGrade !== currentGrade;
    const operationSuccess = result.upgradeResult.success && didChange;

    if (result.upgradeResult.success) {
      message = `Улучшение успешно! Грейд повышен: ${getGradeDisplayName(currentGrade)} → ${getGradeDisplayName(result.upgradeResult.newGrade)}`;
    } else if (didChange) {
      message = `Неудачное улучшение! Грейд понижен: ${getGradeDisplayName(currentGrade)} → ${getGradeDisplayName(result.upgradeResult.newGrade)}`;
    } else {
      message = `Улучшение не удалось. Грейд остался прежним: ${getGradeDisplayName(currentGrade)}`;
    }

    // ИСПРАВЛЕНА СЕМАНТИКА: success = успех операции, не HTTP статус
    return NextResponse.json({
      success: operationSuccess,
      status: result.upgradeResult.success ? 'upgraded' : (didChange ? 'downgraded' : 'no_change'),
      result: {
        success: result.upgradeResult.success,
        newGrade: result.upgradeResult.newGrade,
        previousGrade: currentGrade,
        didChange,
        message,
        event: result.upgradeResult.event,
      },
      item: {
        id: result.updatedItem.id,
        name: result.updatedItem.name,
        grade: result.updatedItem.grade,
        gradeName: result.updatedItem.gradeName,
        durabilityMax: result.updatedItem.durabilityMax,
        effectiveDamage: result.updatedItem.effectiveDamage,
        effectiveDefense: result.updatedItem.effectiveDefense,
      },
    });
  } catch (error) {
    console.error("Error upgrading grade:", error);
    const message = error instanceof Error ? error.message : "Failed to upgrade grade";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
