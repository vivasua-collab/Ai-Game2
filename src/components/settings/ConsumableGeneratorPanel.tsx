'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  Info,
  Pill,
  FlaskConical,
  UtensilsCrossed,
  ScrollText,
} from 'lucide-react';
import {
  generateConsumables,
  getConsumableTypes,
  getEffectTypes,
  getPossibleEffects,
  type ConsumableType,
  type ConsumableEffectType,
  type ConsumableGenerationOptions,
  type Consumable,
  type Rarity,
} from '@/lib/generator/consumable-generator';

interface ConsumableGeneratorPanelProps {
  onGenerate: (consumables: Consumable[]) => void;
  loading?: boolean;
}

const TYPE_ICONS: Record<ConsumableType, React.ReactNode> = {
  pill: <Pill className="w-5 h-5" />,
  elixir: <FlaskConical className="w-5 h-5" />,
  food: <UtensilsCrossed className="w-5 h-5" />,
  scroll: <ScrollText className="w-5 h-5" />,
};

const RARITY_OPTIONS = [
  { value: 'random', label: '🎲 Случайная' },
  { value: 'common', label: 'Обычная' },
  { value: 'uncommon', label: 'Необычная' },
  { value: 'rare', label: 'Редкая' },
  { value: 'legendary', label: 'Легендарная' },
];

export function ConsumableGeneratorPanel({ onGenerate, loading = false }: ConsumableGeneratorPanelProps) {
  const [selectedType, setSelectedType] = useState<string>('random');
  const [selectedEffect, setSelectedEffect] = useState<string>('random');
  const [selectedRarity, setSelectedRarity] = useState<string>('random');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [genCount, setGenCount] = useState(20);
  const [genMode, setGenMode] = useState<'replace' | 'append'>('append');
  const [isGenerating, setIsGenerating] = useState(false);

  const consumableTypes = getConsumableTypes();
  const effectTypes = getEffectTypes();
  const possibleEffects = selectedType !== 'random' 
    ? getPossibleEffects(selectedType as ConsumableType) 
    : [];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const options: ConsumableGenerationOptions = {
        type: selectedType === 'random' ? undefined : selectedType as ConsumableType,
        effectType: selectedEffect === 'random' ? undefined : selectedEffect as ConsumableEffectType,
        rarity: selectedRarity === 'random' ? undefined : selectedRarity as Rarity,
        level: selectedLevel === 'all' ? undefined : parseInt(selectedLevel),
        count: genCount,
        mode: genMode,
      };

      const result = generateConsumables(genCount, options);
      onGenerate(result.consumables);
    } finally {
      setIsGenerating(false);
    }
  };

  // Сброс эффекта при смене типа
  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setSelectedEffect('random');
  };

  return (
    <div className="space-y-6">
      {/* Выбор типа расходника */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Info className="w-5 h-5 text-amber-400" />
          Тип расходника
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {consumableTypes.map(type => (
            <button
              key={type.id}
              onClick={() => handleTypeChange(type.id)}
              className={`
                flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-all
                ${selectedType === type.id 
                  ? 'bg-amber-600/20 border-amber-500 text-amber-400' 
                  : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500'}
              `}
            >
              <span className="mb-2">{TYPE_ICONS[type.id]}</span>
              <span className="text-sm font-medium">{type.name}</span>
            </button>
          ))}
        </div>

        {/* Описание выбранного типа */}
        {selectedType !== 'random' && (
          <div className="bg-slate-700/30 rounded-lg p-3">
            <p className="text-sm text-slate-400">
              {consumableTypes.find(t => t.id === selectedType)?.description}
            </p>
          </div>
        )}
      </div>

      {/* Выбор эффекта */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200">Эффект расходника</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            onClick={() => setSelectedEffect('random')}
            className={`
              p-3 rounded-lg border text-sm transition-all
              ${selectedEffect === 'random'
                ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'}
            `}
          >
            🎲 Случайный
          </button>
          {(selectedType === 'random' ? effectTypes : effectTypes.filter(e => possibleEffects.includes(e.id as ConsumableEffectType))).map(effect => (
            <button
              key={effect.id}
              onClick={() => setSelectedEffect(effect.id)}
              className={`
                p-3 rounded-lg border text-sm transition-all text-left
                ${selectedEffect === effect.id
                  ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                  : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'}
              `}
            >
              <div className="font-medium">{effect.name}</div>
              <div className="text-xs text-slate-500 mt-1">{effect.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Параметры генерации */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200">Параметры генерации</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Уровень */}
          <div>
            <Label className="text-xs text-slate-400">Уровень</Label>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
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
            <Select value={selectedRarity} onValueChange={setSelectedRarity}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                {RARITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
              onChange={(e) => setGenCount(parseInt(e.target.value) || 20)}
              className="bg-slate-700 border-slate-600 text-white mt-1"
              min={1}
              max={1000}
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
      </div>

      {/* Кнопка генерации */}
      <Button
        onClick={handleGenerate}
        disabled={loading || isGenerating}
        className="w-full bg-amber-600 hover:bg-amber-700 h-12 text-lg"
      >
        {loading || isGenerating ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-5 h-5 mr-2" />
        )}
        Сгенерировать {genCount} расходников
      </Button>

      {/* Краткая сводка */}
      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
        <p className="text-sm text-slate-400">
          Генерация: <span className="text-amber-400">
            {selectedType === 'random' ? 'Все типы' : consumableTypes.find(t => t.id === selectedType)?.name}
          </span>
          {selectedEffect !== 'random' && (
            <> → <span className="text-purple-400">
              {effectTypes.find(e => e.id === selectedEffect)?.name}
            </span></>
          )}
          {selectedRarity !== 'random' && (
            <> • <span className="text-cyan-400">{RARITY_OPTIONS.find(r => r.value === selectedRarity)?.label}</span></>
          )}
        </p>
      </div>
    </div>
  );
}
