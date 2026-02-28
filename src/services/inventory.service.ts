/**
 * Сервис работы с инвентарём
 * 
 * ИНТЕГРАЦИЯ TRUTHSYSTEM:
 * - Проверяет наличие сессии в памяти (ПАМЯТЬ ПЕРВИЧНА!)
 * - Обновляет состояние через TruthSystem если сессия активна
 * - Fallback на прямую БД если сессия не в памяти
 */

import { db } from "@/lib/db";
import type { InventoryItem } from "@/types/game";
import { clampQiWithOverflow } from '@/lib/game/qi-shared';
import { TruthSystem } from '@/lib/game/truth-system';

// ============================================
// ТИПЫ
// ============================================

export interface CreateInventoryItemInput {
  characterId: string;
  name: string;
  nameId?: string;
  description?: string;
  type: "material" | "artifact" | "consumable" | "equipment" | "spirit_stone";
  rarity?: "common" | "uncommon" | "rare" | "legendary";
  icon?: string;
  quantity?: number;
  isConsumable?: boolean;
  useAction?: string;
  durability?: number;
  maxDurability?: number;
  qiCharge?: number;
  maxQiCharge?: number;
  effects?: Record<string, number>;
  properties?: Record<string, unknown>;
}

// Тип для пресетов (без characterId)
export type InventoryItemPreset = Omit<CreateInventoryItemInput, 'characterId'>;

export interface UseItemResult {
  success: boolean;
  message: string;
  consumed: boolean;
  quantityLeft: number;
  item?: InventoryItem;
  effects?: {
    qiChange?: number;
    healthChange?: number;
    fatigueChange?: number;
    mentalFatigueChange?: number;
  };
}

// ============================================
// ПРЕСЕТЫ ПРЕДМЕТОВ
// ============================================

export const CONSUMABLE_PRESETS: Record<string, InventoryItemPreset> = {
  qi_pill_small: {
    name: "Малая таблетка Ци",
    nameId: "qi_pill_small",
    description: "Восстанавливает 50 единиц Ци",
    type: "consumable",
    rarity: "common",
    icon: "💊",
    isConsumable: true,
    useAction: "restore_qi",
    effects: { qiRestore: 50 },
  },
  qi_pill_medium: {
    name: "Средняя таблетка Ци",
    nameId: "qi_pill_medium",
    description: "Восстанавливает 150 единиц Ци",
    type: "consumable",
    rarity: "uncommon",
    icon: "💊",
    isConsumable: true,
    useAction: "restore_qi",
    effects: { qiRestore: 150 },
  },
  healing_pill: {
    name: "Лечебная таблетка",
    nameId: "healing_pill",
    description: "Восстанавливает 20 здоровья",
    type: "consumable",
    rarity: "common",
    icon: "🩹",
    isConsumable: true,
    useAction: "restore_health",
    effects: { healthRestore: 20 },
  },
  spirit_stone_low: {
    name: "Низкосортный духовный камень",
    nameId: "spirit_stone_low",
    description: "Содержит 100 единиц Ци",
    type: "spirit_stone",
    rarity: "common",
    icon: "💎",
    isConsumable: true,
    useAction: "absorb_qi",
    effects: { qiRestore: 100 },
  },
  spirit_stone_medium: {
    name: "Духовный камень",
    nameId: "spirit_stone_medium",
    description: "Содержит 500 единиц Ци",
    type: "spirit_stone",
    rarity: "uncommon",
    icon: "💎",
    isConsumable: true,
    useAction: "absorb_qi",
    effects: { qiRestore: 500 },
  },
  fatigue_pill: {
    name: "Тонизирующая таблетка",
    nameId: "fatigue_pill",
    description: "Снимает 30% усталости",
    type: "consumable",
    rarity: "uncommon",
    icon: "⚡",
    isConsumable: true,
    useAction: "restore_fatigue",
    effects: { fatigueRestore: 30 },
  },
};

// ============================================
// СЕРВИС
// ============================================

export class InventoryService {
  /**
   * Получить инвентарь персонажа
   */
  async getInventory(characterId: string): Promise<InventoryItem[]> {
    const items = await db.inventoryItem.findMany({
      where: { characterId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return items.map(this.mapToModel);
  }

  /**
   * Добавить предмет в инвентарь
   */
  async addItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
    // Проверяем, есть ли уже такой предмет (для стакающихся)
    if (input.nameId) {
      const existing = await db.inventoryItem.findFirst({
        where: {
          characterId: input.characterId,
          nameId: input.nameId,
        },
      });

      if (existing) {
        // Увеличиваем количество
        const updated = await db.inventoryItem.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + (input.quantity ?? 1),
          },
        });
        return this.mapToModel(updated);
      }
    }

    // Создаём новый предмет
    const item = await db.inventoryItem.create({
      data: {
        characterId: input.characterId,
        name: input.name,
        nameId: input.nameId,
        description: input.description,
        type: input.type,
        rarity: input.rarity,
        icon: input.icon,
        quantity: input.quantity ?? 1,
        isConsumable: input.isConsumable ?? false,
        useAction: input.useAction,
        durability: input.durability,
        maxDurability: input.maxDurability,
        qiCharge: input.qiCharge,
        maxQiCharge: input.maxQiCharge,
        effects: input.effects ? JSON.stringify(input.effects) : null,
        properties: input.properties ? JSON.stringify(input.properties) : null,
      },
    });

    return this.mapToModel(item);
  }

  /**
   * Добавить предмет из пресета
   */
  async addItemFromPreset(
    characterId: string,
    presetId: string,
    quantity: number = 1
  ): Promise<InventoryItem | null> {
    const preset = CONSUMABLE_PRESETS[presetId];
    if (!preset) return null;

    return this.addItem({ ...preset, characterId, quantity });
  }

  /**
   * Использовать предмет
   * 
   * ИНТЕГРАЦИЯ TRUTHSYSTEM:
   * - Проверяет наличие сессии в памяти (ПАМЯТЬ ПЕРВИЧНА!)
   * - Обновляет данные через TruthSystem если сессия активна
   * - Fallback на прямую БД если сессия не в памяти
   */
  async useItem(
    characterId: string,
    itemId: string,
    sessionId?: string // Опционально - для интеграции с TruthSystem
  ): Promise<UseItemResult & { source?: 'memory' | 'database' }> {
    // === ПРОВЕРКА TRUTHSYSTEM (ПАМЯТЬ ПЕРВИЧНА!) ===
    const truthSystem = TruthSystem.getInstance();
    const memoryState = truthSystem.getSessionByCharacter(characterId);
    const useMemory = !!memoryState;
    const source: 'memory' | 'database' = useMemory ? 'memory' : 'database';
    
    // Получаем предмет
    const item = await db.inventoryItem.findFirst({
      where: { id: itemId, characterId },
    });

    if (!item) {
      return {
        success: false,
        message: "Предмет не найден",
        consumed: false,
        quantityLeft: 0,
        source,
      };
    }

    // Получаем персонажа
    let character;
    if (useMemory && memoryState) {
      // Используем данные из памяти
      character = {
        id: memoryState.character.id,
        currentQi: memoryState.character.currentQi,
        coreCapacity: memoryState.character.coreCapacity,
        health: memoryState.character.health,
        fatigue: memoryState.character.fatigue,
        mentalFatigue: memoryState.character.mentalFatigue,
      };
    } else {
      // Fallback: загружаем из БД
      const dbCharacter = await db.character.findUnique({
        where: { id: characterId },
      });
      
      if (!dbCharacter) {
        return {
          success: false,
          message: "Персонаж не найден",
          consumed: false,
          quantityLeft: item.quantity,
          source,
        };
      }
      
      character = dbCharacter;
    }

    // Парсим эффекты
    const effects = item.effects ? JSON.parse(item.effects) : {};
    let qiChange = 0;
    let healthChange = 0;
    let fatigueChange = 0;
    let mentalFatigueChange = 0;

    // === ПРИМЕНЯЕМ ЭФФЕКТЫ ===
    
    if (effects.qiRestore) {
      // Используем централизованную функцию ограничения Ци
      const qiResult = clampQiWithOverflow(
        character.currentQi + effects.qiRestore,
        character.coreCapacity,
        character.currentQi
      );
      qiChange = qiResult.qiAdded;
      
      if (useMemory && memoryState) {
        // ОБНОВЛЯЕМ ЧЕРЕЗ TRUTHSYSTEM (КРИТИЧЕСКАЯ ОПЕРАЦИЯ!)
        truthSystem.addQi(memoryState.sessionId, effects.qiRestore);
      } else {
        // Fallback: прямое обновление БД
        await db.character.update({
          where: { id: characterId },
          data: { currentQi: qiResult.actualQi },
        });
      }
    }

    if (effects.healthRestore) {
      healthChange = Math.min(effects.healthRestore, 100 - character.health);
      
      if (useMemory && memoryState) {
        truthSystem.updateCharacter(memoryState.sessionId, {
          health: character.health + healthChange,
        });
      } else {
        await db.character.update({
          where: { id: characterId },
          data: { health: { increment: healthChange } },
        });
      }
    }

    if (effects.fatigueRestore) {
      fatigueChange = Math.min(effects.fatigueRestore, character.fatigue);
      
      if (useMemory && memoryState) {
        truthSystem.recoverFatigue(memoryState.sessionId, fatigueChange, 0);
      } else {
        await db.character.update({
          where: { id: characterId },
          data: { fatigue: { decrement: fatigueChange } },
        });
      }
    }

    if (effects.mentalFatigueRestore) {
      mentalFatigueChange = Math.min(effects.mentalFatigueRestore, character.mentalFatigue);
      
      if (useMemory && memoryState) {
        truthSystem.recoverFatigue(memoryState.sessionId, 0, mentalFatigueChange);
      } else {
        await db.character.update({
          where: { id: characterId },
          data: { mentalFatigue: { decrement: mentalFatigueChange } },
        });
      }
    }

    // Уменьшаем количество или удаляем (всегда в БД - это инвентарь)
    let quantityLeft = item.quantity;
    let updatedItem: InventoryItem | undefined;

    if (item.isConsumable) {
      if (item.quantity <= 1) {
        // Удаляем предмет
        await db.inventoryItem.delete({ where: { id: itemId } });
        quantityLeft = 0;
        
        // Обновляем память если есть
        if (useMemory && memoryState) {
          // Удаляем из массива inventory в памяти (если он синхронизирован)
          // Note: inventory в TruthSystem пока не синхронизирован
        }
      } else {
        // Уменьшаем количество
        const updated = await db.inventoryItem.update({
          where: { id: itemId },
          data: { quantity: { decrement: 1 } },
        });
        quantityLeft = updated.quantity;
        updatedItem = this.mapToModel(updated);
      }
    }

    return {
      success: true,
      message: `Использован ${item.name}`,
      consumed: item.isConsumable && quantityLeft < item.quantity,
      quantityLeft,
      item: updatedItem,
      effects: {
        qiChange,
        healthChange,
        fatigueChange: -fatigueChange,
        mentalFatigueChange: -mentalFatigueChange,
      },
      source,
    };
  }

  /**
   * Удалить предмет
   */
  async removeItem(itemId: string): Promise<boolean> {
    try {
      await db.inventoryItem.delete({ where: { id: itemId } });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Уменьшить количество предмета
   */
  async decreaseQuantity(itemId: string, amount: number = 1): Promise<InventoryItem | null> {
    const item = await db.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return null;

    if (item.quantity <= amount) {
      await db.inventoryItem.delete({ where: { id: itemId } });
      return null;
    }

    const updated = await db.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: item.quantity - amount },
    });

    return this.mapToModel(updated);
  }

  // ============================================
  // ПРИВАТНЫЕ МЕТОДЫ
  // ============================================

  private mapToModel(item: { 
    id: string; 
    name: string; 
    nameId: string | null;
    description: string | null;
    type: string;
    rarity: string | null;
    icon: string | null;
    quantity: number;
    isConsumable: boolean;
    useAction: string | null;
    durability: number | null;
    maxDurability: number | null;
    qiCharge: number | null;
    maxQiCharge: number | null;
    effects: string | null;
    properties: string | null;
  }): InventoryItem {
    return {
      id: item.id,
      name: item.name,
      nameId: item.nameId ?? undefined,
      description: item.description ?? undefined,
      type: item.type as InventoryItem["type"],
      rarity: (item.rarity as InventoryItem["rarity"]) ?? undefined,
      icon: item.icon ?? undefined,
      quantity: item.quantity,
      isConsumable: item.isConsumable,
      useAction: item.useAction ?? undefined,
      durability: item.durability ?? undefined,
      maxDurability: item.maxDurability ?? undefined,
      qiCharge: item.qiCharge ?? undefined,
      maxQiCharge: item.maxQiCharge ?? undefined,
      effects: item.effects ? JSON.parse(item.effects) : undefined,
      properties: item.properties ? JSON.parse(item.properties) : undefined,
    };
  }
}

// Экспорт экземпляра
export const inventoryService = new InventoryService();
