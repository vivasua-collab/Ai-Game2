/**
 * Хук для управления инвентарём
 * 
 * Предоставляет:
 * - Загрузку данных инвентаря
 * - Drag & Drop операции
 * - Экипировку/снятие предметов
 * - Работу с духовным хранилищем
 */

import { useState, useCallback, useEffect } from 'react';
import type { 
  InventoryState, 
  SpiritStorageState, 
  EquipmentSlotId,
  InventoryItem as InvItem 
} from '@/types/inventory';

interface InventoryData {
  inventory: InventoryState | null;
  equipment: Record<string, InvItem | null>;
  storage: SpiritStorageState | null;
  items: InvItem[];
  loading: boolean;
  error: string | null;
}

interface DragItem {
  id: string;
  type: 'inventory' | 'equipment' | 'storage';
  item: InvItem;
  sourceSlot?: EquipmentSlotId;
  sourceIndex?: number;
}

interface DropResult {
  type: 'inventory' | 'equipment' | 'storage';
  slotId?: EquipmentSlotId;
  position?: { x: number; y: number };
  index?: number;
}

export function useInventory(characterId: string | null) {
  const [data, setData] = useState<InventoryData>({
    inventory: null,
    equipment: {},
    storage: null,
    items: [],
    loading: false,
    error: null,
  });

  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);

  // Загрузка данных
  const loadInventory = useCallback(async () => {
    if (!characterId) return;

    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/inventory/state?characterId=${characterId}`);
      const result = await response.json();

      if (result.success) {
        setData({
          inventory: result.inventory,
          equipment: result.equipment || {},
          storage: result.storage,
          items: result.items || [],
          loading: false,
          error: null,
        });
      } else {
        setData(prev => ({
          ...prev,
          loading: false,
          error: result.error || 'Ошибка загрузки инвентаря',
        }));
      }
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Ошибка загрузки',
      }));
    }
  }, [characterId]);

  // Загружаем при монтировании
  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Экипировать предмет
  const equipItem = useCallback(async (itemId: string, slotId: EquipmentSlotId) => {
    if (!characterId) return false;

    try {
      const response = await fetch('/api/inventory/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, itemId, slotId }),
      });

      const result = await response.json();
      if (result.success) {
        await loadInventory();
        return true;
      } else {
        setData(prev => ({ ...prev, error: result.error }));
        return false;
      }
    } catch (error) {
      setData(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Ошибка экипировки',
      }));
      return false;
    }
  }, [characterId, loadInventory]);

  // Снять предмет
  const unequipItem = useCallback(async (slotId: EquipmentSlotId) => {
    if (!characterId) return false;

    try {
      const response = await fetch(`/api/inventory/equip?characterId=${characterId}&slotId=${slotId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        await loadInventory();
        return true;
      } else {
        setData(prev => ({ ...prev, error: result.error }));
        return false;
      }
    } catch (error) {
      setData(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Ошибка снятия',
      }));
      return false;
    }
  }, [characterId, loadInventory]);

  // Переместить предмет
  const moveItem = useCallback(async (
    itemId: string, 
    toX?: number, 
    toY?: number, 
    toLocation?: 'inventory' | 'storage'
  ) => {
    if (!characterId) return false;

    try {
      const response = await fetch('/api/inventory/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, itemId, toX, toY, toLocation }),
      });

      const result = await response.json();
      if (result.success) {
        await loadInventory();
        return true;
      } else {
        setData(prev => ({ ...prev, error: result.error }));
        return false;
      }
    } catch (error) {
      setData(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Ошибка перемещения',
      }));
      return false;
    }
  }, [characterId, loadInventory]);

  // Переместить из хранилища
  const moveFromStorage = useCallback(async (storageIndex: number) => {
    if (!characterId) return false;

    try {
      const response = await fetch('/api/inventory/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, storageIndex }),
      });

      const result = await response.json();
      if (result.success) {
        await loadInventory();
        return true;
      } else {
        setData(prev => ({ ...prev, error: result.error }));
        return false;
      }
    } catch (error) {
      setData(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Ошибка перемещения из хранилища',
      }));
      return false;
    }
  }, [characterId, loadInventory]);

  // Начать перетаскивание
  const startDrag = useCallback((drag: DragItem) => {
    setDraggedItem(drag);
  }, []);

  // Завершить перетаскивание
  const endDrag = useCallback(() => {
    setDraggedItem(null);
  }, []);

  // Обработка drop
  const handleDrop = useCallback(async (dropResult: DropResult) => {
    if (!draggedItem) return false;

    const { type: sourceType, item, sourceSlot, sourceIndex } = draggedItem;

    // Перемещение из инвентаря в экипировку
    if (sourceType === 'inventory' && dropResult.type === 'equipment' && dropResult.slotId) {
      const success = await equipItem(item.id, dropResult.slotId);
      endDrag();
      return success;
    }

    // Перемещение из экипировки в инвентарь
    if (sourceType === 'equipment' && dropResult.type === 'inventory' && sourceSlot) {
      const success = await unequipItem(sourceSlot);
      endDrag();
      return success;
    }

    // Перемещение из экипировки в экипировку (сменить слот)
    if (sourceType === 'equipment' && dropResult.type === 'equipment' && sourceSlot && dropResult.slotId) {
      await unequipItem(sourceSlot);
      const success = await equipItem(item.id, dropResult.slotId);
      endDrag();
      return success;
    }

    // Перемещение из инвентаря в хранилище
    if (sourceType === 'inventory' && dropResult.type === 'storage') {
      const success = await moveItem(item.id, undefined, undefined, 'storage');
      endDrag();
      return success;
    }

    // Перемещение из хранилища в инвентарь
    if (sourceType === 'storage' && dropResult.type === 'inventory' && sourceIndex !== undefined) {
      const success = await moveFromStorage(sourceIndex);
      endDrag();
      return success;
    }

    // Перемещение внутри инвентаря
    if (sourceType === 'inventory' && dropResult.type === 'inventory' && dropResult.position) {
      const success = await moveItem(item.id, dropResult.position.x, dropResult.position.y);
      endDrag();
      return success;
    }

    endDrag();
    return false;
  }, [draggedItem, equipItem, unequipItem, moveItem, moveFromStorage, endDrag]);

  return {
    ...data,
    draggedItem,
    loadInventory,
    equipItem,
    unequipItem,
    moveItem,
    moveFromStorage,
    startDrag,
    endDrag,
    handleDrop,
  };
}

export default useInventory;
