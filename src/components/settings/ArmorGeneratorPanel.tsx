'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Shield,
  Trash2,
} from 'lucide-react';
import type { Rarity } from '@/lib/generator/base-item-generator';
import { RARITY_INFO } from '@/lib/generator/base-item-generator';
import {
  getEquipmentSlotList,
  type EquipmentSlot,
} from '@/lib/generator/item-config';

interface ArmorGeneratorPanelProps {
  onGenerate: (params: {
    slot?: EquipmentSlot;
    level: number;
    rarity?: Rarity;
    count: number;
    mode: 'replace' | 'append';
  }) => Promise<void>;
  onClear?: () => Promise<void>;
  loading: boolean;
}

export function ArmorGeneratorPanel({ onGenerate, onClear, loading }: ArmorGeneratorPanelProps) {
  // Параметры генерации
  const [slot, setSlot] = useState<string>('random');
  const [genLevel, setGenLevel] = useState<string>('all');
  const [genRarity, setGenRarity] = useState<string>('random');
  const [genCount, setGenCount] = useState(50);
  const [genMode, setGenMode] = useState<'replace' | 'append'>('append');
  
  // UI состояние
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const slotList = getEquipmentSlotList();
  
  const handleGenerate = async () => {
    await onGenerate({
      slot: slot === 'random' ? undefined : slot as EquipmentSlot,
      level: genLevel === 'all' ? 0 : parseInt(genLevel),
      rarity: genRarity === 'random' ? undefined : genRarity as Rarity,
      count: genCount,
      mode: genMode,
    });
  };
  
  const handleClear = async () => {
    if (!onClear) return;
    if (!confirm('Очистить всю сгенерированную экипировку?')) return;
    await onClear();
  };
  
  // Информация о выбранном слоте
  const renderSlotInfo = () => {
    if (slot === 'random') return null;
    
    const slotConfig = slotList.find(s => s.id === slot);
    if (!slotConfig) return null;
    
    return (
      <div className="bg-slate-700/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{slotConfig.icon}</span>
          <div>
            <div className="font-medium text-slate-200">{slotConfig.name}</div>
            <div className="text-sm text-slate-400">{slotConfig.description}</div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Выбор слота */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          Выбор экипировки
        </h3>
        <p className="text-sm text-slate-400">
          Выберите слот экипировки или оставьте случайным для генерации всех типов.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Слот */}
          <div>
            <Label className="text-xs text-slate-400">Слот экипировки</Label>
            <Select value={slot} onValueChange={setSlot}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                <SelectItem value="random">🎲 Случайный</SelectItem>
                {slotList.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span>{s.icon}</span>
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Информация о слоте */}
        {renderSlotInfo()}
      </div>
      
      {/* Основные параметры */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200">Параметры генерации</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Уровень */}
          <div>
            <Label className="text-xs text-slate-400">Уровень</Label>
            <Select value={genLevel} onValueChange={setGenLevel}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                <SelectItem value="all">Все уровни</SelectItem>
                {Array.from({ length: 9 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    Уровень {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Редкость */}
          <div>
            <Label className="text-xs text-slate-400">Редкость</Label>
            <Select value={genRarity} onValueChange={setGenRarity}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                <SelectItem value="random">🎲 Случайная</SelectItem>
                {Object.entries(RARITY_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${info.bgColor}`} />
                      {info.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Количество */}
          <div>
            <Label className="text-xs text-slate-400">Количество</Label>
            <Input
              type="number"
              value={genCount}
              onChange={(e) => setGenCount(parseInt(e.target.value) || 50)}
              className="bg-slate-700 border-slate-600 text-white mt-1"
              min={1}
              max={10000}
            />
          </div>
          
          {/* Режим */}
          <div>
            <Label className="text-xs text-slate-400">Режим</Label>
            <Select value={genMode} onValueChange={(v) => setGenMode(v as 'replace' | 'append')}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                <SelectItem value="replace">Заменить</SelectItem>
                <SelectItem value="append">Добавить</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Информация о редкости */}
        {genRarity !== 'random' && (
          <div className={`bg-slate-700/30 rounded p-3 ${RARITY_INFO[genRarity as Rarity].color}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-3 h-3 rounded-full ${RARITY_INFO[genRarity as Rarity].bgColor}`} />
              <span className="font-medium">{RARITY_INFO[genRarity as Rarity].label}</span>
              <Badge variant="outline" className="text-xs">
                {RARITY_INFO[genRarity as Rarity].bonusSlots} бонусов
              </Badge>
            </div>
            <p className="text-sm text-slate-400">{RARITY_INFO[genRarity as Rarity].description}</p>
          </div>
        )}
      </div>
      
      {/* Расширенные настройки */}
      <div className="bg-slate-800/50 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 flex items-center justify-between text-slate-300 hover:bg-slate-700/30 transition-colors"
        >
          <span className="font-medium">Расширенные настройки</span>
          {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        
        {showAdvanced && (
          <div className="p-4 pt-0 space-y-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              Дополнительные настройки будут добавлены позже.
            </p>
          </div>
        )}
      </div>
      
      {/* Кнопка генерации */}
      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-amber-600 hover:bg-amber-700 h-12 text-lg"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-5 h-5 mr-2" />
        )}
        Сгенерировать {genCount} единиц экипировки
      </Button>
      
      {/* Кнопка очистки */}
      {onClear && (
        <div className="flex justify-end">
          <Button
            onClick={handleClear}
            disabled={loading}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Очистить всю экипировку
          </Button>
        </div>
      )}
      
      {/* Краткая сводка */}
      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
        <p className="text-sm text-slate-400">
          Генерация: <span className="text-amber-400">Экипировка</span>
          {slot !== 'random' && (
            <> → <span className="text-purple-400">
              {slotList.find(s => s.id === slot)?.name}
            </span></>
          )}
          {genRarity !== 'random' && (
            <> • <span className={RARITY_INFO[genRarity as Rarity].color}>
              {RARITY_INFO[genRarity as Rarity].label}
            </span></>
          )}
          {genLevel !== 'all' && (
            <> • Уровень <span className="text-amber-400">{genLevel}</span></>
          )}
        </p>
      </div>
    </div>
  );
}
