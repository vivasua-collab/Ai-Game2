/**
 * InventoryDialog - Окно инвентаря с Drag & Drop
 * 
 * Функции:
 * - Схематичная кукла тела с экипировкой
 * - Сетка инвентаря 7x7
 * - Духовное хранилище
 * - Drag & Drop между всеми зонами
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BodyDoll } from './BodyDoll';
import type { BodyStructure, BodyPart, LimbStatus } from '@/types/body';
import { createHumanBody, calculateOverallHealth } from '@/lib/game/body-system';
import { useGameCharacter } from '@/stores/game.store';
import { useInventory } from '@/hooks/useInventory';
import type { 
  InventoryItem, 
  EquipmentSlotId,
  ItemRarity,
  ItemType 
} from '@/types/inventory';
import { EQUIPMENT_SLOTS, RARITY_COLORS, RARITY_NAMES, canEquipInSlot } from '@/types/inventory';

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function getStatusText(status: LimbStatus): string {
  switch (status) {
    case 'healthy': return 'Здорова';
    case 'damaged': return 'Повреждена';
    case 'crippled': return 'Изуродована';
    case 'paralyzed': return 'Парализована';
    case 'critical': return 'Критическое';
    case 'severed': return 'ОТРУБЛЕНА';
    default: return 'Неизвестно';
  }
}

function getStatusColor(status: LimbStatus): string {
  switch (status) {
    case 'healthy': return 'text-green-400';
    case 'damaged': return 'text-yellow-400';
    case 'crippled': return 'text-orange-400';
    case 'paralyzed': return 'text-red-400';
    case 'critical': return 'text-red-500';
    case 'severed': return 'text-gray-500';
    default: return 'text-slate-400';
  }
}

function getRarityBorder(rarity: ItemRarity): string {
  return `border-[${RARITY_COLORS[rarity]}]`;
}

function getRarityStyle(rarity: ItemRarity): React.CSSProperties {
  return { borderColor: RARITY_COLORS[rarity] };
}

// ==================== DRAG & DROP КОМПОНЕНТЫ ====================

interface DragItemData {
  id: string;
  type: 'inventory' | 'equipment' | 'storage';
  item: InventoryItem;
  sourceSlot?: EquipmentSlotId;
  sourceIndex?: number;
}

interface DraggableItemProps {
  item: InventoryItem;
  sourceType: 'inventory' | 'equipment' | 'storage';
  sourceSlot?: EquipmentSlotId;
  sourceIndex?: number;
  onDragStart: (data: DragItemData) => void;
  onDragEnd: () => void;
  selected?: boolean;
  onClick?: () => void;
  showQuantity?: boolean;
}

function DraggableItem({ 
  item, 
  sourceType, 
  sourceSlot, 
  sourceIndex,
  onDragStart, 
  onDragEnd,
  selected,
  onClick,
  showQuantity = true,
}: DraggableItemProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: item.id,
      type: sourceType,
      item,
      sourceSlot,
      sourceIndex,
    }));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart({ id: item.id, type: sourceType, item, sourceSlot, sourceIndex });
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`
        aspect-square bg-slate-800 rounded border-2 flex flex-col items-center justify-center cursor-grab
        hover:bg-slate-700 transition-colors active:cursor-grabbing
        ${selected ? 'ring-2 ring-amber-400' : ''}
      `}
      style={getRarityStyle(item.rarity)}
    >
      <span className="text-lg select-none">{item.icon}</span>
      {showQuantity && item.quantity > 1 && (
        <span className="text-xs text-slate-400 select-none">{item.quantity}</span>
      )}
    </div>
  );
}

interface DropZoneProps {
  onDrop: (data: DragItemData) => void;
  acceptedTypes: ('inventory' | 'equipment' | 'storage')[];
  className?: string;
  children?: React.ReactNode;
  isOver?: boolean;
  isValid?: boolean;
}

function DropZone({ 
  onDrop, 
  acceptedTypes, 
  className = '',
  children,
}: DropZoneProps) {
  const [isOver, setIsOver] = useState(false);
  const [isValid, setIsValid] = useState(true);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      setIsValid(acceptedTypes.includes(data.type));
    } catch {
      setIsValid(false);
    }
    
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
    setIsValid(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as DragItemData;
      if (acceptedTypes.includes(data.type)) {
        onDrop(data);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        ${className}
        ${isOver ? (isValid ? 'bg-green-900/30 ring-2 ring-green-500' : 'bg-red-900/30 ring-2 ring-red-500') : ''}
        transition-colors
      `}
    >
      {children}
    </div>
  );
}

// ==================== ПАНЕЛЬ ДЕТАЛЕЙ ЧАСТИ ТЕЛА ====================

function BodyPartDetails({ part, heart }: { part: BodyPart | null; heart?: BodyStructure['heart'] | null }) {
  if (!part && heart) {
    const hpPercent = (heart.hp.current / heart.hp.max) * 100;
    return (
      <div className="bg-red-900/20 border border-red-600/30 rounded p-2">
        <div className="flex items-center gap-2 mb-1">
          <span>❤️</span>
          <span className="text-sm font-medium text-white">Сердце</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded overflow-hidden">
          <div className="h-full bg-red-600" style={{ width: `${hpPercent}%` }} />
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {heart.hp.current}/{heart.hp.max} HP
          {heart.vulnerable && <span className="text-red-400 ml-1">⚠️ Уязвимо!</span>}
        </div>
      </div>
    );
  }

  if (!part) {
    return (
      <div className="text-center text-slate-500 text-xs py-3">
        👆 Выберите часть тела
      </div>
    );
  }

  const functionalPercent = part.hp.functional.max > 0
    ? (part.hp.functional.current / part.hp.functional.max) * 100
    : 0;
  const structuralPercent = part.hp.structural.max > 0
    ? (part.hp.structural.current / part.hp.structural.max) * 100
    : 100;

  return (
    <div className={`rounded p-2 ${part.status === 'severed' ? 'bg-gray-900/50' : 'bg-slate-800/50'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-white">{part.name}</span>
        <span className={`text-xs ${getStatusColor(part.status)}`}>
          {getStatusText(part.status)}
        </span>
      </div>
      
      {part.status !== 'severed' ? (
        <div className="space-y-1">
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-red-400">Функ</span>
              <span className="text-slate-400">{part.hp.functional.current}</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded overflow-hidden">
              <div className="h-full bg-red-600" style={{ width: `${functionalPercent}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-400">Струк</span>
              <span className="text-slate-400">{part.hp.structural.current}</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded overflow-hidden">
              <div className="h-full bg-gray-500" style={{ width: `${structuralPercent}%` }} />
            </div>
          </div>
          <div className="text-xs text-slate-500 pt-1">
            Эфф: <span className={part.efficiency >= 100 ? 'text-green-400' : 'text-yellow-400'}>{part.efficiency}%</span>
          </div>
        </div>
      ) : (
        <div className="text-center text-xs text-slate-500 py-1">
          ✂️ Отрублена
        </div>
      )}
    </div>
  );
}

// ==================== СЛОТ ЭКИПИРОВКИ ====================

interface EquipmentSlotProps {
  slotId: EquipmentSlotId;
  item: InventoryItem | null;
  onDrop: (data: DragItemData) => void;
  onUnequip: () => void;
  isValidTarget?: boolean;
}

function EquipmentSlot({ slotId, item, onDrop, onUnequip, isValidTarget }: EquipmentSlotProps) {
  const slot = EQUIPMENT_SLOTS.find(s => s.id === slotId);
  const [isOver, setIsOver] = useState(false);

  if (!slot) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const canDrop = data.type === 'inventory' || data.type === 'equipment';
      setIsOver(canDrop);
    } catch {
      setIsOver(false);
    }
  };

  const handleDragLeave = () => setIsOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'inventory' || data.type === 'equipment') {
        onDrop(data);
      }
    } catch (err) {
      console.error('Equipment drop error:', err);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative w-12 h-12 bg-slate-800/60 rounded border-2 flex items-center justify-center
        transition-colors cursor-pointer group
        ${isOver ? 'border-green-500 bg-green-900/20' : 'border-slate-600'}
        ${item ? 'hover:border-amber-400' : ''}
      `}
      title={slot.name}
    >
      {item ? (
        <>
          <div 
            className="w-full h-full flex items-center justify-center text-2xl"
            style={getRarityStyle(item.rarity)}
          >
            {item.icon}
          </div>
          <button
            onClick={onUnequip}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-xs
                       opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            ×
          </button>
        </>
      ) : (
        <span className="text-slate-500 text-lg">{slot.icon}</span>
      )}
      <div className="absolute -bottom-4 text-[10px] text-slate-500 w-full text-center truncate">
        {slot.name}
      </div>
    </div>
  );
}

// ==================== СЕТКА ИНВЕНТАРЯ ====================

interface InventoryGridProps {
  items: (InventoryItem | null)[];
  selectedItem: InventoryItem | null;
  onSelect: (item: InventoryItem | null) => void;
  onDrop: (data: DragItemData, position: { x: number; y: number }) => void;
  width?: number;
  height?: number;
}

function InventoryGrid({ 
  items, 
  selectedItem, 
  onSelect,
  onDrop,
  width = 7,
  height = 7,
}: InventoryGridProps) {
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverSlot(index);
  };

  const handleDragLeave = () => setDragOverSlot(null);

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverSlot(null);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const x = index % width;
      const y = Math.floor(index / width);
      onDrop(data, { x, y });
    } catch (err) {
      console.error('Inventory drop error:', err);
    }
  };

  const slots = [];
  for (let i = 0; i < width * height; i++) {
    const item = items[i] || null;
    const isOver = dragOverSlot === i;

    slots.push(
      <div
        key={i}
        onDragOver={(e) => handleDragOver(e, i)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, i)}
        className={`
          aspect-square bg-slate-800/50 rounded border transition-colors
          ${isOver ? 'border-green-500 bg-green-900/20' : 'border-slate-700'}
        `}
      >
        {item && (
          <DraggableItem
            item={item}
            sourceType="inventory"
            onDragStart={() => {}}
            onDragEnd={() => {}}
            selected={selectedItem?.id === item.id}
            onClick={() => onSelect(item)}
          />
        )}
      </div>
    );
  }

  return (
    <div 
      className="grid gap-1" 
      style={{ gridTemplateColumns: `repeat(${width}, 1fr)` }}
    >
      {slots}
    </div>
  );
}

// ==================== ПАНЕЛЬ ХРАНИЛИЩА ====================

interface StoragePanelProps {
  storage: { slots: (InventoryItem | null)[]; unlocked: boolean; capacity: number; requiredLevel: number } | null;
  selectedItem: InventoryItem | null;
  onSelect: (item: InventoryItem | null) => void;
  onDrop: (data: DragItemData, index: number) => void;
  onMoveToInventory: (index: number) => void;
  cultivationLevel: number;
}

function StoragePanel({ 
  storage, 
  selectedItem, 
  onSelect, 
  onDrop,
  onMoveToInventory,
  cultivationLevel 
}: StoragePanelProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!storage) {
    return (
      <div className="bg-slate-800/50 rounded p-4 text-center">
        <div className="text-slate-500">Загрузка...</div>
      </div>
    );
  }

  if (!storage.unlocked) {
    return (
      <div className="bg-slate-800/50 rounded p-4 text-center">
        <div className="text-purple-400 text-2xl mb-2">🔮</div>
        <div className="text-slate-400">Духовное хранилище</div>
        <div className="text-slate-500 text-sm mt-1">
          Откроется на уровне культивации {storage.requiredLevel}
        </div>
        <div className="text-slate-600 text-xs mt-1">
          Текущий уровень: {cultivationLevel}
        </div>
      </div>
    );
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => setDragOverIndex(null);

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      onDrop(data, index);
    } catch (err) {
      console.error('Storage drop error:', err);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-purple-400 text-sm font-medium">🔮 Духовное хранилище</span>
        <span className="text-slate-500 text-xs">
          {storage.slots.filter(s => s).length}/{storage.capacity}
        </span>
      </div>
      
      <div className="grid grid-cols-5 gap-1">
        {storage.slots.map((item, index) => {
          const isOver = dragOverIndex === index;
          
          return (
            <div
              key={index}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`
                aspect-square bg-slate-700/50 rounded border transition-colors
                ${isOver ? 'border-purple-500 bg-purple-900/20' : 'border-slate-600'}
              `}
            >
              {item ? (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-600/50 rounded"
                  onClick={() => onMoveToInventory(index)}
                  style={getRarityStyle(item.rarity)}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.quantity > 1 && (
                    <span className="text-xs text-slate-400">{item.quantity}</span>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      
      <div className="text-slate-500 text-xs mt-2 text-center">
        Клик — переместить в инвентарь
      </div>
    </div>
  );
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

interface InventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'inventory' | 'storage';
}

export function InventoryDialog({ open, onOpenChange, defaultTab = 'inventory' }: InventoryDialogProps) {
  const character = useGameCharacter();
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  const {
    inventory,
    equipment,
    storage,
    items,
    loading,
    error,
    equipItem,
    unequipItem,
    moveItem,
    moveFromStorage,
    loadInventory,
  } = useInventory(character?.id || null);

  // Перезагружаем инвентарь при открытии
  useEffect(() => {
    if (open && character?.id) {
      loadInventory();
    }
  }, [open, character?.id, loadInventory]);

  // Создаём тело через useMemo
  const bodyState = useMemo(() => {
    if (!open) return null;
    
    const newBody = createHumanBody(character?.id || 'demo');
    
    // Демо повреждения
    const leftArm = newBody.parts.get('left_arm');
    if (leftArm) {
      leftArm.hp.functional.current = 25;
      leftArm.status = 'crippled';
      leftArm.efficiency = 30;
    }
    
    const rightLeg = newBody.parts.get('right_leg');
    if (rightLeg) {
      rightLeg.hp.functional.current = 60;
      rightLeg.status = 'damaged';
      rightLeg.efficiency = 75;
    }

    const torso = newBody.parts.get('torso');
    if (torso) {
      torso.hp.structural.current = 100;
      torso.status = 'critical';
    }
    
    newBody.heart.vulnerable = true;
    newBody.heart.hp.current = 60;
    newBody.overallHealth = calculateOverallHealth(newBody);
    
    return newBody;
  }, [open, character?.id]);

  const selectedPart = useMemo(() => {
    if (!bodyState || !selectedPartId || selectedPartId === 'heart') return null;
    return bodyState.parts.get(selectedPartId) || null;
  }, [bodyState, selectedPartId]);

  const showHeart = selectedPartId === 'heart';

  // Обработка экипировки
  const handleEquipmentDrop = useCallback(async (slotId: EquipmentSlotId, data: DragItemData) => {
    if (data.type === 'inventory') {
      // Проверяем совместимость
      if (!canEquipInSlot(data.item, slotId)) {
        return;
      }
      await equipItem(data.item.id, slotId);
    } else if (data.type === 'equipment' && data.sourceSlot) {
      // Смена слота
      await unequipItem(data.sourceSlot);
      await equipItem(data.item.id, slotId);
    }
  }, [equipItem, unequipItem]);

  // Обработка drop в инвентарь
  const handleInventoryDrop = useCallback(async (
    data: DragItemData, 
    position: { x: number; y: number }
  ) => {
    if (data.type === 'equipment' && data.sourceSlot) {
      await unequipItem(data.sourceSlot);
    } else if (data.type === 'storage' && data.sourceIndex !== undefined) {
      await moveFromStorage(data.sourceIndex);
    } else if (data.type === 'inventory') {
      await moveItem(data.item.id, position.x, position.y);
    }
  }, [unequipItem, moveFromStorage, moveItem]);

  // Обработка drop в хранилище
  const handleStorageDrop = useCallback(async (data: DragItemData) => {
    if (data.type === 'inventory') {
      await moveItem(data.item.id, undefined, undefined, 'storage');
    }
  }, [moveItem]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white w-[95vw] max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-amber-400 text-lg">📦 Инвентарь</DialogTitle>
            <div className="flex items-center gap-3">
              {loading && <span className="text-slate-500 text-xs">Загрузка...</span>}
              {error && <span className="text-red-400 text-xs">{error}</span>}
              {bodyState && (
                <div className="flex items-center gap-2">
                  {bodyState.isDead && (
                    <Badge className="bg-red-600 text-white text-xs">МЁРТВ</Badge>
                  )}
                  <span className="text-xs text-slate-400">
                    HP: <span className="text-green-400">{bodyState.overallHealth}%</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex h-[calc(85vh-80px)]">
          {/* ЛЕВАЯ ПАНЕЛЬ: Кукла тела + Экипировка */}
          <div className="w-[240px] flex-shrink-0 border-r border-slate-700 flex flex-col p-3">
            {/* Кукла - уменьшенная высота */}
            <div className="h-[180px] flex items-center justify-center">
              <BodyDoll
                bodyState={bodyState}
                onPartClick={setSelectedPartId}
                selectedPartId={selectedPartId}
              />
            </div>
            
            {/* Детали выбранной части */}
            <div className="mt-2">
              <BodyPartDetails 
                part={showHeart ? null : selectedPart} 
                heart={showHeart ? bodyState?.heart : null}
              />
            </div>

            {/* Слоты экипировки */}
            <div className="mt-3 border-t border-slate-700 pt-3">
              <div className="text-xs text-slate-400 mb-2">Экипировка</div>
              <div className="grid grid-cols-4 gap-3">
                {EQUIPMENT_SLOTS.slice(0, 8).map(slot => (
                  <EquipmentSlot
                    key={slot.id}
                    slotId={slot.id}
                    item={equipment[slot.id] || null}
                    onDrop={(data) => handleEquipmentDrop(slot.id, data)}
                    onUnequip={() => unequipItem(slot.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ПРАВАЯ ПАНЕЛЬ: Инвентарь + Хранилище */}
          <div className="flex-1 p-4 flex flex-col min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800 mb-3 h-9">
                <TabsTrigger value="inventory" className="data-[state=active]:bg-amber-600 text-sm">
                  📦 Инвентарь ({inventory?.usedSlots || 0}/{inventory?.totalSlots || 49})
                </TabsTrigger>
                <TabsTrigger value="storage" className="data-[state=active]:bg-purple-600 text-sm">
                  🔮 Хранилище
                </TabsTrigger>
              </TabsList>

              <TabsContent value="inventory" className="flex-1 mt-0 flex flex-col">
                {/* Вес */}
                {inventory && (
                  <div className="text-xs text-slate-500 mb-2">
                    Вес: <span className="text-amber-400">{inventory.currentWeight.toFixed(1)}</span>
                    /{inventory.maxWeight} кг
                  </div>
                )}
                
                {/* Сетка инвентаря */}
                <ScrollArea className="flex-1">
                  <InventoryGrid 
                    items={inventory?.slots || []}
                    selectedItem={selectedItem}
                    onSelect={setSelectedItem}
                    onDrop={handleInventoryDrop}
                    width={inventory?.baseWidth || 7}
                    height={inventory?.baseHeight || 7}
                  />
                </ScrollArea>
                
                {/* Детали выбранного предмета */}
                {selectedItem && (
                  <div className="mt-3 p-2 bg-slate-800 rounded border border-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{selectedItem.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-white">{selectedItem.name}</div>
                        <div className="text-xs" style={{ color: RARITY_COLORS[selectedItem.rarity] }}>
                          {RARITY_NAMES[selectedItem.rarity]}
                        </div>
                      </div>
                    </div>
                    {selectedItem.description && (
                      <div className="text-xs text-slate-400 mt-1">{selectedItem.description}</div>
                    )}
                    {selectedItem.stats && (
                      <div className="text-xs text-slate-500 mt-1">
                        {selectedItem.stats.damage && `⚔️ Урон: ${selectedItem.stats.damage} `}
                        {selectedItem.stats.defense && `🛡️ Защита: ${selectedItem.stats.defense} `}
                        {selectedItem.stats.qiBonus && `✨ Ци: +${selectedItem.stats.qiBonus}`}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="storage" className="flex-1 mt-0">
                <StoragePanel
                  storage={storage}
                  selectedItem={selectedItem}
                  onSelect={setSelectedItem}
                  onDrop={(data) => handleStorageDrop(data)}
                  onMoveToInventory={moveFromStorage}
                  cultivationLevel={character?.cultivationLevel || 1}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InventoryDialog;
