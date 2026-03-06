/**
 * API для синхронизации инвентаря
 * POST - обработка событий синхронизации
 * GET - получение текущего состояния
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TruthSystem } from "@/lib/game/truth-system";
import {
  createCellId,
  parseCellId,
  parseEquipSlotId,
  getOccupiedCells,
  canPlaceItem,
  findFreePosition,
  type ItemSize,
} from "@/types/inventory-sync";
import { INVENTORY_EVENT_TYPES } from "@/lib/game/events/game-events";

// ==================== POST - ОБРАБОТКА СОБЫТИЙ ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, sessionId, characterId, source, ...data } = body;

    if (!sessionId || !characterId) {
      return NextResponse.json(
        { success: false, error: "sessionId and characterId required" },
        { status: 400 }
      );
    }

    // Загружаем сессию в TruthSystem если не загружена
    if (!TruthSystem.isSessionLoaded(sessionId)) {
      await TruthSystem.loadSession(sessionId);
    }

    const session = TruthSystem.getSessionState(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    let result;

    switch (type) {
      case INVENTORY_EVENT_TYPES.MOVE_ITEM:
        result = await handleMoveItem(characterId, data, source);
        break;
        
      case INVENTORY_EVENT_TYPES.ADD_ITEM:
        result = await handleAddItem(characterId, data, source);
        break;
        
      case INVENTORY_EVENT_TYPES.REMOVE_ITEM:
        result = await handleRemoveItem(characterId, data, source);
        break;
        
      case INVENTORY_EVENT_TYPES.SPLIT_STACK:
        result = await handleSplitStack(characterId, data, source);
        break;
        
      case INVENTORY_EVENT_TYPES.MERGE_STACK:
        result = await handleMergeStack(characterId, data, source);
        break;
        
      case INVENTORY_EVENT_TYPES.FULL_SYNC:
        result = await handleFullSync(characterId, data, source);
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: `Unknown event type: ${type}` },
          { status: 400 }
        );
    }

    // Обновляем инвентарь в TruthSystem
    const inventory = await db.inventoryItem.findMany({
      where: { characterId },
    });
    TruthSystem.updateInventory(sessionId, inventory);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[InventorySync] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ==================== GET - ПОЛУЧЕНИЕ СОСТОЯНИЯ ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get("characterId");

    if (!characterId) {
      return NextResponse.json(
        { success: false, error: "characterId required" },
        { status: 400 }
      );
    }

    // Получаем все предметы
    const items = await db.inventoryItem.findMany({
      where: { characterId },
      orderBy: [{ posY: "asc" }, { posX: "asc" }],
    });

    // Получаем экипировку
    const equipment = await db.equipment.findMany({
      where: { characterId },
      include: { item: true },
    });

    // Формируем состояние
    const state = {
      items: items.map((item) => ({
        itemId: item.id,
        name: item.name,
        nameId: item.nameId || item.name,
        type: item.type,
        category: item.category,
        rarity: item.rarity,
        icon: item.icon || "📦",
        size: {
          width: item.sizeWidth || 1,
          height: item.sizeHeight || 1,
        },
        quantity: item.quantity,
        maxStack: item.maxStack || 1,
        weight: item.weight || 0,
        value: item.value || 0,
        stackable: item.stackable,
        mainCellId:
          item.location === "equipment" && item.equipmentSlot
            ? `equip_${item.equipmentSlot}`
            : createCellId(item.posX || 0, item.posY || 0),
        occupiedCells:
          item.location === "equipment"
            ? []
            : getOccupiedCells(item.posX || 0, item.posY || 0, {
                width: item.sizeWidth || 1,
                height: item.sizeHeight || 1,
              }),
        isEquipped: item.location === "equipment",
        equipmentSlot: item.equipmentSlot,
      })),
      equipment: Object.fromEntries(
        equipment.map((eq) => [
          eq.slotId,
          {
            itemId: eq.item.id,
            name: eq.item.name,
            icon: eq.item.icon || "📦",
          },
        ])
      ),
    };

    return NextResponse.json({
      success: true,
      state,
    });
  } catch (error) {
    console.error("[InventorySync] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get inventory state" },
      { status: 500 }
    );
  }
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

async function handleMoveItem(
  characterId: string,
  data: { itemId: string; fromCellId: string; toCellId: string },
  source: string
) {
  const { itemId, fromCellId, toCellId } = data;

  // Получаем предмет
  const item = await db.inventoryItem.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    return { success: false, error: "Предмет не найден" };
  }

  // Проверяем владельца
  if (item.characterId !== characterId) {
    return { success: false, error: "Предмет принадлежит другому персонажу" };
  }

  // Парсим целевую позицию
  const toCoords = parseCellId(toCellId);
  const toEquipSlot = parseEquipSlotId(toCellId);

  if (toCoords) {
    // Перемещение в инвентарь
    return await moveToInventory(characterId, item, toCoords.x, toCoords.y);
  } else if (toEquipSlot) {
    // Экипировка
    return await equipToSlot(characterId, item, toEquipSlot);
  }

  return { success: false, error: "Неверная целевая позиция" };
}

async function moveToInventory(
  characterId: string,
  item: { id: string; sizeWidth: number | null; sizeHeight: number | null },
  x: number,
  y: number
) {
  const size: ItemSize = {
    width: (item.sizeWidth || 1) as 1 | 2,
    height: (item.sizeHeight || 1) as 1 | 2 | 3,
  };

  // Получаем занятые ячейки
  const existingItems = await db.inventoryItem.findMany({
    where: {
      characterId,
      location: "inventory",
      id: { not: item.id },
    },
    select: { posX: true, posY: true, sizeWidth: true, sizeHeight: true },
  });

  const occupied = new Set<string>();
  for (const i of existingItems) {
    if (i.posX !== null && i.posY !== null) {
      for (let dx = 0; dx < (i.sizeWidth || 1); dx++) {
        for (let dy = 0; dy < (i.sizeHeight || 1); dy++) {
          occupied.add(`${i.posX + dx},${i.posY + dy}`);
        }
      }
    }
  }

  if (!canPlaceItem(x, y, size, occupied)) {
    return { success: false, error: "Невозможно разместить предмет в этой позиции" };
  }

  // Обновляем позицию
  await db.inventoryItem.update({
    where: { id: item.id },
    data: {
      posX: x,
      posY: y,
      location: "inventory",
      isEquipped: false,
      equipmentSlot: null,
    },
  });

  // Удаляем из экипировки если был
  await db.equipment.deleteMany({
    where: { characterId, itemId: item.id },
  });

  return {
    success: true,
    message: "Предмет перемещён",
    visualCommands: [
      {
        type: "item_move",
        timestamp: Date.now(),
        data: { itemId: item.id, toX: x, toY: y, animated: true },
      },
    ],
  };
}

async function equipToSlot(
  characterId: string,
  item: { id: string; equipmentSlot: string | null },
  slotId: string
) {
  // Проверяем есть ли уже предмет в слоте
  const existingEquip = await db.equipment.findUnique({
    where: { characterId_slotId: { characterId, slotId } },
    include: { item: true },
  });

  if (existingEquip) {
    // Снимаем существующий предмет
    await db.inventoryItem.update({
      where: { id: existingEquip.itemId },
      data: {
        location: "inventory",
        isEquipped: false,
        equipmentSlot: null,
        posX: 0,
        posY: 0,
      },
    });

    await db.equipment.delete({
      where: { id: existingEquip.id },
    });
  }

  // Экипируем новый предмет
  await db.inventoryItem.update({
    where: { id: item.id },
    data: {
      location: "equipment",
      isEquipped: true,
      equipmentSlot: slotId,
      posX: null,
      posY: null,
    },
  });

  await db.equipment.create({
    data: {
      characterId,
      slotId,
      itemId: item.id,
    },
  });

  return {
    success: true,
    message: "Предмет экипирован",
    visualCommands: [
      {
        type: "slot_flash",
        timestamp: Date.now(),
        data: { slotId, color: "#4ade80", duration: 300 },
      },
    ],
  };
}

async function handleAddItem(
  characterId: string,
  data: { itemData: Record<string, unknown>; targetCellId?: string },
  source: string
) {
  // Эта логика уже реализована в /api/inventory/add-qi-stone
  // Здесь можно добавить общую логику добавления
  return { success: false, error: "Use /api/inventory/add-qi-stone for now" };
}

async function handleRemoveItem(
  characterId: string,
  data: { itemId: string; quantity: number },
  source: string
) {
  const { itemId, quantity } = data;

  const item = await db.inventoryItem.findUnique({
    where: { id: itemId },
  });

  if (!item || item.characterId !== characterId) {
    return { success: false, error: "Предмет не найден" };
  }

  if (quantity >= item.quantity) {
    // Удаляем полностью
    await db.equipment.deleteMany({
      where: { itemId },
    });

    await db.inventoryItem.delete({
      where: { id: itemId },
    });
  } else {
    // Уменьшаем количество
    await db.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: item.quantity - quantity },
    });
  }

  return {
    success: true,
    message: `Удалено ${quantity} предметов`,
  };
}

async function handleSplitStack(
  characterId: string,
  data: { sourceItemId: string; targetCellId: string; quantity: number },
  source: string
) {
  const { sourceItemId, targetCellId, quantity } = data;

  const sourceItem = await db.inventoryItem.findUnique({
    where: { id: sourceItemId },
  });

  if (!sourceItem || sourceItem.characterId !== characterId) {
    return { success: false, error: "Исходный предмет не найден" };
  }

  if (!sourceItem.stackable || quantity >= sourceItem.quantity) {
    return { success: false, error: "Невозможно разделить" };
  }

  const coords = parseCellId(targetCellId);
  if (!coords) {
    return { success: false, error: "Неверная целевая ячейка" };
  }

  // Создаём новый предмет
  const newItem = await db.inventoryItem.create({
    data: {
      characterId,
      name: sourceItem.name,
      nameId: sourceItem.nameId,
      description: sourceItem.description,
      type: sourceItem.type,
      category: sourceItem.category,
      rarity: sourceItem.rarity,
      icon: sourceItem.icon,
      quantity,
      maxStack: sourceItem.maxStack,
      stackable: true,
      sizeWidth: sourceItem.sizeWidth,
      sizeHeight: sourceItem.sizeHeight,
      weight: sourceItem.weight,
      posX: coords.x,
      posY: coords.y,
      location: "inventory",
      value: sourceItem.value,
      currency: sourceItem.currency,
    },
  });

  // Уменьшаем исходный
  await db.inventoryItem.update({
    where: { id: sourceItemId },
    data: { quantity: sourceItem.quantity - quantity },
  });

  return {
    success: true,
    newItemId: newItem.id,
    message: `Разделено: ${quantity} предметов`,
  };
}

async function handleMergeStack(
  characterId: string,
  data: { sourceItemId: string; targetItemId: string },
  source: string
) {
  const { sourceItemId, targetItemId } = data;

  const sourceItem = await db.inventoryItem.findUnique({
    where: { id: sourceItemId },
  });
  const targetItem = await db.inventoryItem.findUnique({
    where: { id: targetItemId },
  });

  if (
    !sourceItem ||
    !targetItem ||
    sourceItem.characterId !== characterId ||
    targetItem.characterId !== characterId
  ) {
    return { success: false, error: "Предметы не найдены" };
  }

  if (
    !sourceItem.stackable ||
    sourceItem.nameId !== targetItem.nameId ||
    sourceItem.id === targetItem.id
  ) {
    return { success: false, error: "Невозможно объединить" };
  }

  const maxAdd = (targetItem.maxStack || 99) - targetItem.quantity;
  const toAdd = Math.min(sourceItem.quantity, maxAdd);

  if (toAdd <= 0) {
    return { success: false, error: "Целевой стек полон" };
  }

  // Обновляем целевой
  await db.inventoryItem.update({
    where: { id: targetItemId },
    data: { quantity: targetItem.quantity + toAdd },
  });

  // Уменьшаем исходный
  if (toAdd >= sourceItem.quantity) {
    await db.inventoryItem.delete({
      where: { id: sourceItemId },
    });
  } else {
    await db.inventoryItem.update({
      where: { id: sourceItemId },
      data: { quantity: sourceItem.quantity - toAdd },
    });
  }

  return {
    success: true,
    mergedQuantity: toAdd,
    message: `Объединено: ${toAdd} предметов`,
  };
}

async function handleFullSync(
  characterId: string,
  data: { stateJson: string },
  source: string
) {
  // Полная синхронизация от клиента
  // Используется при загрузке сохранения
  return { success: false, error: "Not implemented" };
}
