/**
 * InventoryPanel - Панель инвентаря
 * 
 * Отображение предметов персонажа:
 * - Сетка ячеек инвентаря
 * - Строки быстрого доступа
 * - Информация о выбранном предмете
 */

'use client';

import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RARITY_BORDER_COLORS, RARITY_TEXT_COLORS as IMPORTED_RARITY_TEXT_COLORS } from '@/types/rarity';

// ==================== ТИПЫ ====================

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'weapon' | 'armor' | 'consumable' | 'material' | 'technique' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  maxStack: number;
  weight: number;
  
  // Для оружия
  damage?: number;
  damageType?: 'slash' | 'pierce' | 'crush';
  
  // Для брони
  armor?: number;
  slot?: 'head' | 'torso' | 'arms' | 'legs' | 'feet' | 'accessory';
  
  // Для расходников
  effect?: string;
  
  // Экипировано ли
  equipped?: boolean;
}

export interface InventoryState {
  items: InventoryItem[];
  capacity: number;
  gold: number;
}

// ==================== КОНСТАНТЫ ====================

// RARITY_BORDER_COLORS и RARITY_TEXT_COLORS импортируются из @/types/rarity
// Для обратной совместимости локально используем импортированные константы
const RARITY_COLORS = RARITY_BORDER_COLORS;
const RARITY_TEXT_COLORS = IMPORTED_RARITY_TEXT_COLORS;

const TYPE_ICONS: Record<InventoryItem['type'], string> = {
  weapon: '⚔️',
  armor: '🛡️',
  consumable: '🧪',
  material: '💎',
  technique: '📜',
  special: '✨',
};

// ==================== КОМПОНЕНТ ЯЧЕЙКИ ====================

interface InventorySlotProps {
  item: InventoryItem | null;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

function InventorySlot({ item, index, isSelected, onClick }: InventorySlotProps) {
  if (!item) {
    return (
      <div
        className="aspect-square rounded-lg border border-slate-700 bg-slate-800/30 
                   flex items-center justify-center text-slate-600 text-xs
                   hover:border-slate-600 transition-colors cursor-pointer"
        onClick={onClick}
      >
        {index + 1}
      </div>
    );
  }
  
  const rarityClass = RARITY_COLORS[item.rarity];
  const textClass = RARITY_TEXT_COLORS[item.rarity];
  
  return (
    <div
      className={`aspect-square rounded-lg border-2 ${rarityClass}
                  flex flex-col items-center justify-center p-1
                  cursor-pointer transition-all duration-200
                  hover:scale-105 hover:shadow-lg
                  ${isSelected ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-800' : ''}
                  ${item.equipped ? 'ring-2 ring-green-400' : ''}`}
      onClick={onClick}
    >
      {/* Иконка */}
      <span className="text-2xl">{item.icon}</span>
      
      {/* Количество */}
      {item.quantity > 1 && (
        <span className={`absolute bottom-1 right-1 text-xs font-bold ${textClass}`}>
          {item.quantity}
        </span>
      )}
      
      {/* Индикатор экипировки */}
      {item.equipped && (
        <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-bl-lg rounded-tr-lg flex items-center justify-center">
          <span className="text-[8px]">✓</span>
        </div>
      )}
    </div>
  );
}

// ==================== ПАНЕЛЬ ДЕТАЛЕЙ ПРЕДМЕТА ====================

interface ItemDetailsProps {
  item: InventoryItem | null;
}

function ItemDetails({ item }: ItemDetailsProps) {
  if (!item) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 text-center text-slate-500">
        <span className="text-4xl mb-2 block">📦</span>
        <span>Выберите предмет для просмотра</span>
      </div>
    );
  }
  
  const textClass = RARITY_TEXT_COLORS[item.rarity];
  const typeIcon = TYPE_ICONS[item.type];
  
  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      {/* Заголовок */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">{item.icon}</span>
        <div>
          <h3 className={`font-bold ${textClass}`}>{item.name}</h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{typeIcon}</span>
            <span className="capitalize">{item.type}</span>
            <Separator orientation="vertical" className="h-3" />
            <span className="capitalize">{item.rarity}</span>
          </div>
        </div>
      </div>
      
      {/* Описание */}
      <p className="text-sm text-slate-400 mb-3">{item.description}</p>
      
      {/* Характеристики */}
      <div className="space-y-2 text-sm">
        {/* Урон */}
        {item.damage && (
          <div className="flex justify-between">
            <span className="text-slate-500">Урон:</span>
            <span className="text-red-400 font-medium">{item.damage} {item.damageType}</span>
          </div>
        )}
        
        {/* Броня */}
        {item.armor && (
          <div className="flex justify-between">
            <span className="text-slate-500">Броня:</span>
            <span className="text-blue-400 font-medium">{item.armor}</span>
          </div>
        )}
        
        {/* Слот */}
        {item.slot && (
          <div className="flex justify-between">
            <span className="text-slate-500">Слот:</span>
            <span className="text-amber-400 font-medium capitalize">{item.slot}</span>
          </div>
        )}
        
        {/* Эффект */}
        {item.effect && (
          <div className="flex justify-between">
            <span className="text-slate-500">Эффект:</span>
            <span className="text-green-400 font-medium">{item.effect}</span>
          </div>
        )}
        
        <Separator className="my-2 bg-slate-700" />
        
        {/* Вес и количество */}
        <div className="flex justify-between">
          <span className="text-slate-500">Вес:</span>
          <span className="text-slate-300">{item.weight} кг</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-slate-500">Количество:</span>
          <span className="text-slate-300">{item.quantity} / {item.maxStack}</span>
        </div>
      </div>
      
      {/* Статус экипировки */}
      {item.equipped && (
        <div className="mt-3 flex items-center gap-2">
          <Badge className="bg-green-600 text-white">Экипировано</Badge>
        </div>
      )}
    </div>
  );
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

interface InventoryPanelProps {
  inventory?: InventoryState | null;
  selectedItem?: InventoryItem | null;
  onSelectItem?: (item: InventoryItem | null) => void;
}

export function InventoryPanel({ inventory, selectedItem, onSelectItem }: InventoryPanelProps) {
  // Генерируем массив слотов
  const slots = useMemo(() => {
    const capacity = inventory?.capacity || 30;
    const items = inventory?.items || [];
    const result: (InventoryItem | null)[] = [];
    
    for (let i = 0; i < capacity; i++) {
      result.push(items[i] || null);
    }
    
    return result;
  }, [inventory]);
  
  // Фильтры по типу
  const [filterType, setFilterType] = useState<InventoryItem['type'] | 'all'>('all');
  
  const filteredSlots = useMemo(() => {
    if (filterType === 'all') return slots;
    return slots.map(item => 
      item?.type === filterType ? item : null
    );
  }, [slots, filterType]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Заголовок и ресурсы */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-amber-400">📦 Инвентарь</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm">
            <span className="text-yellow-400">💰</span>
            <span className="text-yellow-400 font-medium">{inventory?.gold || 0}</span>
          </div>
        </div>
      </div>
      
      {/* Фильтры */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {(['all', 'weapon', 'armor', 'consumable', 'material', 'technique', 'special'] as const).map(type => (
          <button
            key={type}
            className={`px-2 py-1 rounded text-xs transition-colors
              ${filterType === type 
                ? 'bg-amber-600 text-white' 
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            onClick={() => setFilterType(type)}
          >
            {type === 'all' ? '📦 Все' : `${TYPE_ICONS[type]} ${type === 'technique' ? 'Свитки' : type === 'material' ? 'Материалы' : type === 'consumable' ? 'Расход.' : type === 'special' ? 'Особые' : type === 'weapon' ? 'Оружие' : 'Броня'}`}
          </button>
        ))}
      </div>
      
      {/* Сетка инвентаря */}
      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="grid grid-cols-6 gap-2 mb-4">
          {filteredSlots.map((item, index) => (
            <InventorySlot
              key={index}
              item={item}
              index={index}
              isSelected={selectedItem?.id === item?.id}
              onClick={() => onSelectItem?.(item)}
            />
          ))}
        </div>
      </ScrollArea>
      
      {/* Детали выбранного предмета */}
      <div className="mt-2 flex-shrink-0">
        <ItemDetails item={selectedItem || null} />
      </div>
    </div>
  );
}

export default InventoryPanel;
