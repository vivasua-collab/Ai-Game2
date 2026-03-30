/**
 * InventoryDialog - Окно инвентаря с Drag & Drop
 * 
 * Функции:
 * - Схематичная кукла тела с экипировкой
 * - Сетка инвентаря 7x7
 * - Духовное хранилище (в той же вкладке, список)
 * - Drag & Drop между всеми зонами
 * 
 * Поддержка системы Grade (Матрёшка):
 * - V2 экипировка показывает Grade
 * - V1 предметы показывают Rarity
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { 
  type EquipmentGrade, 
  type TechniqueGrade,
  TECHNIQUE_GRADE_CONFIGS,
  EQUIPMENT_GRADE_ORDER,
} from '@/types/grade';

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

// ==================== GRADE FUNCTIONS (Система Матрёшка) ====================

/**
 * Получить цвет границы по Grade
 */
function getGradeBorderStyle(grade: EquipmentGrade | TechniqueGrade | undefined): React.CSSProperties {
  if (!grade) return { borderColor: '#475569' }; // slate-600
  
  // Для экипировки (5 уровней)
  if (EQUIPMENT_GRADE_ORDER.includes(grade as EquipmentGrade)) {
    const colors: Record<EquipmentGrade, string> = {
      damaged: '#6b7280',      // gray-500
      common: '#9ca3af',       // gray-400
      refined: '#4ade80',      // green-400
      perfect: '#60a5fa',      // blue-400
      transcendent: '#fbbf24', // amber-400
    };
    return { borderColor: colors[grade as EquipmentGrade] };
  }
  
  // Для техник (4 уровня)
  if (TECHNIQUE_GRADE_CONFIGS[grade as TechniqueGrade]) {
    return { borderColor: TECHNIQUE_GRADE_CONFIGS[grade as TechniqueGrade].colorHex };
  }
  
  return { borderColor: '#475569' };
}

/**
 * Получить отображаемое название Grade
 */
function getGradeName(grade: EquipmentGrade | TechniqueGrade | undefined): string {
  if (!grade) return '';
  
  // Для экипировки
  if (EQUIPMENT_GRADE_ORDER.includes(grade as EquipmentGrade)) {
    const names: Record<EquipmentGrade, string> = {
      damaged: 'Повреждённый',
      common: 'Обычный',
      refined: 'Улучшенный',
      perfect: 'Совершенный',
      transcendent: 'Превосходящий',
    };
    return names[grade as EquipmentGrade];
  }
  
  // Для техник
  if (TECHNIQUE_GRADE_CONFIGS[grade as TechniqueGrade]) {
    return TECHNIQUE_GRADE_CONFIGS[grade as TechniqueGrade].name;
  }
  
  return '';
}

/**
 * Получить CSS класс цвета для Grade
 */
function getGradeColorClass(grade: EquipmentGrade | TechniqueGrade | undefined): string {
  if (!grade) return 'text-slate-400';
  
  // Для экипировки
  const equipmentColors: Record<EquipmentGrade, string> = {
    damaged: 'text-gray-500',
    common: 'text-gray-400',
    refined: 'text-green-400',
    perfect: 'text-blue-400',
    transcendent: 'text-amber-400',
  };
  
  if (EQUIPMENT_GRADE_ORDER.includes(grade as EquipmentGrade)) {
    return equipmentColors[grade as EquipmentGrade];
  }
  
  // Для техник
  if (TECHNIQUE_GRADE_CONFIGS[grade as TechniqueGrade]) {
    return TECHNIQUE_GRADE_CONFIGS[grade as TechniqueGrade].color;
  }
  
  return 'text-slate-400';
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
  
  // Приоритет Grade > Rarity для стилей
  const borderStyle = item.grade 
    ? getGradeBorderStyle(item.grade as EquipmentGrade)
    : getRarityStyle(item.rarity);

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
      style={borderStyle}
    >
      <span className="text-lg select-none">{item.icon}</span>
      {showQuantity && item.quantity > 1 && (
        <span className="text-xs text-slate-400 select-none">{item.quantity}</span>
      )}
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

function EquipmentSlot({ slotId, item, onDrop, onUnequip }: EquipmentSlotProps) {
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

// ==================== ПАНЕЛЬ ХРАНИЛИЩА (СПИСОК) ====================

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

  // Фильтруем только непустые слоты для списка
  const nonEmptySlots = storage.slots
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item !== null);

  return (
    <div 
      className="bg-slate-800/50 rounded p-2 min-h-[80px]"
      onDragOver={(e) => {
        e.preventDefault();
        if (dragOverIndex === null) setDragOverIndex(-1);
      }}
      onDragLeave={() => setDragOverIndex(null)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOverIndex(null);
        try {
          const data = JSON.parse(e.dataTransfer.getData('application/json'));
          onDrop(data, storage.slots.filter(s => s).length);
        } catch (err) {
          console.error('Storage drop error:', err);
        }
      }}
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-purple-400 text-xs font-medium flex items-center gap-1">
          <span>🔮</span>
          <span>Хранилище</span>
          <span className="text-slate-500">({nonEmptySlots.length}/{storage.capacity})</span>
        </span>
        <span className="text-slate-600 text-[10px]">
          в другом измерении
        </span>
      </div>
      
      {nonEmptySlots.length === 0 ? (
        <div 
          className={`
            text-center py-3 text-slate-500 text-xs border-2 border-dashed rounded
            ${dragOverIndex === -1 ? 'border-purple-500 bg-purple-900/20' : 'border-slate-700'}
          `}
        >
          Перетащите предмет сюда
        </div>
      ) : (
        <div className="space-y-0.5 max-h-32 overflow-y-auto">
          {nonEmptySlots.map(({ item, index }) => (
            <div
              key={index}
              onClick={() => onMoveToInventory(index)}
              className={`
                flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors
                hover:bg-slate-700/50 border-l-2
                ${selectedItem?.id === item?.id ? 'bg-slate-700/50' : ''}
                ${dragOverIndex === index ? 'bg-purple-900/20' : ''}
              `}
              style={{ borderLeftColor: item ? RARITY_COLORS[item.rarity] : '#475569' }}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              <span className="text-base">{item?.icon}</span>
              <span className="text-sm text-slate-300 flex-1 truncate">{item?.name}</span>
              {item?.quantity && item.quantity > 1 && (
                <span className="text-xs text-slate-400">×{item.quantity}</span>
              )}
              {item && (
                <span 
                  className="text-[10px] px-1 rounded"
                  style={{ color: RARITY_COLORS[item.rarity] }}
                >
                  {RARITY_NAMES[item.rarity]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="text-slate-600 text-[10px] mt-1 text-center">
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

export function InventoryDialog({ open, onOpenChange }: InventoryDialogProps) {
  const character = useGameCharacter();
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

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
          {/* ЛЕВАЯ ПАНЕЛЬ: Кукла тела + Экипировка (увеличена на 20%) */}
          <div className="w-[288px] flex-shrink-0 border-r border-slate-700 flex flex-col p-3">
            {/* Кукла - увеличенная высота на 20% (было 180px, стало 216px) */}
            <div className="h-[216px] flex items-center justify-center">
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

          {/* ПРАВАЯ ПАНЕЛЬ: Инвентарь + Хранилище (в одной вкладке) */}
          <div className="flex-1 p-4 flex flex-col min-w-0">
            {/* Заголовок инвентаря */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-amber-400 text-sm font-medium">
                📦 Инвентарь ({inventory?.usedSlots || 0}/{inventory?.totalSlots || 49})
              </span>
              {inventory && (
                <span className="text-xs text-slate-500">
                  Вес: <span className="text-amber-400">{inventory.currentWeight.toFixed(1)}</span>
                  /{inventory.maxWeight} кг
                </span>
              )}
            </div>
            
            {/* Сетка инвентаря */}
            <ScrollArea className="flex-1 mb-3">
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
              <div className="mb-3 p-2 bg-slate-800 rounded border border-slate-600">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedItem.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-white">{selectedItem.name}</div>
                    {/* Приоритет Grade > Rarity */}
                    {selectedItem.grade ? (
                      <div className="text-xs" style={getGradeBorderStyle(selectedItem.grade as EquipmentGrade)}>
                        {getGradeName(selectedItem.grade as EquipmentGrade)}
                      </div>
                    ) : (
                      <div className="text-xs" style={{ color: RARITY_COLORS[selectedItem.rarity] }}>
                        {RARITY_NAMES[selectedItem.rarity]}
                      </div>
                    )}
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

            {/* Духовное хранилище (в той же вкладке) */}
            <StoragePanel
              storage={storage}
              selectedItem={selectedItem}
              onSelect={setSelectedItem}
              onDrop={(data) => handleStorageDrop(data)}
              onMoveToInventory={moveFromStorage}
              cultivationLevel={character?.cultivationLevel || 1}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InventoryDialog;
