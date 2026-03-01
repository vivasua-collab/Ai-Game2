/**
 * ============================================================================
 * useInventorySync - Хук для синхронизации инвентаря
 * ============================================================================
 * 
 * Предоставляет React-компонентам доступ к системе прозрачного инвентаря:
 * - Перемещение предметов через Drag & Drop
 * - Автоматическая синхронизация с Phaser
 * - Экипировка на куклу
 * 
 * Версия: 1.0.0
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameCharacter, useGameActions, useGameInventory } from '@/stores/game.store';
import { InventorySyncService, type SyncSource } from '@/services/inventory-sync.service';
import type { InventorySyncState, GridItem, ItemSize } from '@/types/inventory-sync';
import type { InventoryItem } from '@/types/inventory';

// ==================== ТИПЫ ====================

export interface DragItem {
  itemId: string;
  sourceCellId: string;
  sourceType: 'inventory' | 'equipment';
  sourceSlotId?: string;
  item: GridItem;
}

export interface DropZone {
  cellId: string;
  zoneType: 'inventory' | 'equipment';
  slotId?: string;
  canDrop: boolean;
}

export interface InventorySyncHook {
  // Состояние
  state: InventorySyncState | null;
  isDragging: boolean;
  dragItem: DragItem | null;
  dropZone: DropZone | null;
  
  // Действия
  startDrag: (itemId: string, cellId: string) => void;
  endDrag: () => void;
  setDropZone: (zone: DropZone | null) => void;
  dropItem: () => Promise<boolean>;
  
  // Перемещение
  moveItem: (itemId: string, toCellId: string) => Promise<boolean>;
  equipItem: (itemId: string, slotId: string) => Promise<boolean>;
  unequipItem: (slotId: string, toCellId?: string) => Promise<boolean>;
  
  // Стаки
  splitStack: (itemId: string, toCellId: string, quantity: number) => Promise<boolean>;
  mergeStacks: (sourceId: string, targetId: string) => Promise<boolean>;
  
  // Утилиты
  getItemAtCell: (cellId: string) => GridItem | undefined;
  getEquipment: (slotId: string) => GridItem | undefined;
  refreshFromDatabase: () => Promise<void>;
}

// ==================== ХУК ====================

export function useInventorySync(): InventorySyncHook {
  const character = useGameCharacter();
  const inventory = useGameInventory();
  const { loadInventory } = useGameActions();
  
  const [state, setState] = useState<InventorySyncState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropZone, setDropZone] = useState<DropZone | null>(null);
  
  const serviceRef = useRef<InventorySyncService | null>(null);
  
  // Инициализация сервиса
  useEffect(() => {
    if (!character?.id) return;
    
    const service = new InventorySyncService({
      characterId: character.id,
      sessionId: '', // TODO: get from store
      onStateChange: setState,
      onError: (error) => console.error('[InventorySync]', error),
    });
    
    serviceRef.current = service;
    
    // Загружаем данные из React store
    if (inventory && inventory.length > 0) {
      service.loadFromDatabase(inventory as InventoryItem[]);
    }
    
    return () => {
      serviceRef.current = null;
    };
  }, [character?.id]);
  
  // Синхронизация при изменении inventory из React store
  useEffect(() => {
    if (serviceRef.current && inventory) {
      serviceRef.current.loadFromDatabase(inventory as InventoryItem[]);
    }
  }, [inventory]);
  
  // ==================== DRAG & DROP ====================
  
  const startDrag = useCallback((itemId: string, cellId: string) => {
    if (!serviceRef.current) return;
    
    const item = serviceRef.current.getItem(itemId);
    if (!item) return;
    
    // Определяем источник
    const slotId = InventorySyncService.parseEquipSlotId(cellId);
    const sourceType = slotId ? 'equipment' : 'inventory';
    
    setDragItem({
      itemId,
      sourceCellId: cellId,
      sourceType,
      sourceSlotId: slotId || undefined,
      item,
    });
    setIsDragging(true);
    
    // Отправляем событие в Phaser для визуального эффекта
    dispatchPhaserEvent('inventory:drag_start', {
      itemId,
      cellId,
    });
  }, []);
  
  const endDrag = useCallback(() => {
    if (dragItem) {
      dispatchPhaserEvent('inventory:drag_end', {
        itemId: dragItem.itemId,
      });
    }
    
    setIsDragging(false);
    setDragItem(null);
    setDropZone(null);
  }, [dragItem]);
  
  const dropItem = useCallback(async (): Promise<boolean> => {
    if (!dragItem || !dropZone || !serviceRef.current) {
      endDrag();
      return false;
    }
    
    const source: SyncSource = 'react';
    let success = false;
    
    if (dragItem.sourceType === 'equipment' && dropZone.zoneType === 'inventory') {
      // Снятие экипировки
      success = await serviceRef.current.unequipItem(
        dragItem.sourceSlotId!,
        dropZone.cellId,
        source
      ).then(r => r.success);
    } else if (dragItem.sourceType === 'inventory' && dropZone.zoneType === 'equipment') {
      // Экипировка
      success = await serviceRef.current.equipItem(
        dragItem.itemId,
        dropZone.slotId!,
        source
      ).then(r => r.success);
    } else if (dragItem.sourceType === 'inventory' && dropZone.zoneType === 'inventory') {
      // Перемещение в инвентаре
      success = await serviceRef.current.moveItem(
        dragItem.itemId,
        dragItem.sourceCellId,
        dropZone.cellId,
        source
      ).then(r => r.success);
    }
    
    if (success) {
      // Обновляем React store
      await loadInventory();
    }
    
    endDrag();
    return success;
  }, [dragItem, dropZone, loadInventory, endDrag]);
  
  // ==================== ДЕЙСТВИЯ ====================
  
  const moveItem = useCallback(async (
    itemId: string,
    toCellId: string
  ): Promise<boolean> => {
    if (!serviceRef.current) return false;
    
    const item = serviceRef.current.getItem(itemId);
    if (!item) return false;
    
    const result = await serviceRef.current.moveItem(
      itemId,
      item.mainCellId,
      toCellId,
      'react'
    );
    
    if (result.success) {
      await loadInventory();
      dispatchPhaserEvent('inventory:item_moved', { itemId, toCellId });
    }
    
    return result.success;
  }, [loadInventory]);
  
  const equipItem = useCallback(async (
    itemId: string,
    slotId: string
  ): Promise<boolean> => {
    if (!serviceRef.current) return false;
    
    const item = serviceRef.current.getItem(itemId);
    if (!item) return false;
    
    const result = await serviceRef.current.moveItem(
      itemId,
      item.mainCellId,
      InventorySyncService.createEquipSlotId(slotId),
      'react'
    );
    
    if (result.success) {
      await loadInventory();
      dispatchPhaserEvent('inventory:item_equipped', { itemId, slotId });
    }
    
    return result.success;
  }, [loadInventory]);
  
  const unequipItem = useCallback(async (
    slotId: string,
    toCellId?: string
  ): Promise<boolean> => {
    if (!serviceRef.current) return false;
    
    const result = await serviceRef.current.unequipItem(slotId, toCellId, 'react');
    
    if (result.success) {
      await loadInventory();
      dispatchPhaserEvent('inventory:item_unequipped', { slotId });
    }
    
    return result.success;
  }, [loadInventory]);
  
  const splitStack = useCallback(async (
    itemId: string,
    toCellId: string,
    quantity: number
  ): Promise<boolean> => {
    if (!serviceRef.current) return false;
    
    const result = await serviceRef.current.splitStack(itemId, toCellId, quantity, 'react');
    
    if (result.success) {
      await loadInventory();
    }
    
    return result.success;
  }, [loadInventory]);
  
  const mergeStacks = useCallback(async (
    sourceId: string,
    targetId: string
  ): Promise<boolean> => {
    if (!serviceRef.current) return false;
    
    const result = await serviceRef.current.mergeStacks(sourceId, targetId, 'react');
    
    if (result.success) {
      await loadInventory();
    }
    
    return result.success;
  }, [loadInventory]);
  
  // ==================== УТИЛИТЫ ====================
  
  const getItemAtCell = useCallback((cellId: string): GridItem | undefined => {
    return serviceRef.current?.getItemAtCell(cellId);
  }, []);
  
  const getEquipment = useCallback((slotId: string): GridItem | undefined => {
    return serviceRef.current?.getEquipment(slotId);
  }, []);
  
  const refreshFromDatabase = useCallback(async () => {
    await loadInventory();
  }, [loadInventory]);
  
  return {
    state,
    isDragging,
    dragItem,
    dropZone,
    startDrag,
    endDrag,
    setDropZone,
    dropItem,
    moveItem,
    equipItem,
    unequipItem,
    splitStack,
    mergeStacks,
    getItemAtCell,
    getEquipment,
    refreshFromDatabase,
  };
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function dispatchPhaserEvent(eventName: string, data: Record<string, unknown>): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }
}

export default useInventorySync;
