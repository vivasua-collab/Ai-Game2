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
  Info,
  Ring,
  Gem,
  Scroll,
  AlertTriangle,
} from 'lucide-react';
import {
  generateAccessories,
  getAccessoryTypes,
  getTalismanEffectTypes,
  getTalismanEffectInfo,
  type AccessoryType,
  type TalismanEffectType,
  type AccessoryGenerationOptions,
  type GeneratedAccessory,
  type Rarity,
} from '@/lib/generator/accessory-generator';

interface AccessoryGeneratorPanelProps {
  onGenerate: (accessories: GeneratedAccessory[]) => void;
  loading?: boolean;
}

const TYPE_ICONS: Record<AccessoryType, React.ReactNode> = {
  ring: <Ring className="w-5 h-5" />,
  amulet: <Gem className="w-5 h-5" />,
  talisman: <Scroll className="w-5 h-5" />,
};

const RARITY_OPTIONS = [
  { value: 'random', label: '🎲 Случайная' },
  { value: 'common', label: 'Обычная' },
  { value: 'uncommon', label: 'Необычная' },
  { value: 'rare', label: 'Редкая' },
  { value: 'legendary', label: 'Легендарная' },
];

export function AccessoryGeneratorPanel({ onGenerate, loading = false }: AccessoryGeneratorPanelProps) {
  const [selectedType, setSelectedType] = useState<string>('random');
  const [selectedRarity, setSelectedRarity] = useState<string>('random');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedTalismanEffect, setSelectedTalismanEffect] = useState<string>('random');
  const [genCount, setGenCount] = useState(10);
  const [genMode, setGenMode] = useState<'replace' | 'append'>('append');
  const [isGenerating, setIsGenerating] = useState(false);

  const accessoryTypes = getAccessoryTypes();
  const talismanEffects = getTalismanEffectTypes();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const options: AccessoryGenerationOptions = {
        type: selectedType === 'random' ? undefined : selectedType as AccessoryType,
        rarity: selectedRarity === 'random' ? undefined : selectedRarity as Rarity,
        level: selectedLevel === 'all' ? undefined : parseInt(selectedLevel),
        count: genCount,
        mode: genMode,
        talismanEffect: selectedTalismanEffect === 'random' ? undefined : selectedTalismanEffect as TalismanEffectType,
      };

      const result = generateAccessories(genCount, options);
      onGenerate(result.accessories);
    } finally {
      setIsGenerating(false);
    }
  };

  const isTalismanSelected = selectedType === 'talisman';

  return (
    <div className="space-y-6">
      {/* Выбор типа аксессуара */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Info className="w-5 h-5 text-amber-400" />
          Тип аксессуара
        </h3>
        
        <div className="grid grid-cols-3 gap-3">
          {accessoryTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id === selectedType ? 'random' : type.id)}
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
              {accessoryTypes.find(t => t.id === selectedType)?.description}
            </p>
          </div>
        )}

        {/* Предупреждение для талисманов */}
        {isTalismanSelected && (
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-amber-400">Особенности талисманов</div>
                <ul className="text-xs text-slate-400 mt-1 space-y-1">
                  <li>❌ НЕ добавляют Ци</li>
                  <li>❌ НЕ дают бонусы к статам</li>
                  <li>✅ Одноразовые</li>
                  <li>✅ Ситуативное использование</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Выбор эффекта талисмана */}
      {isTalismanSelected && (
        <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
            <Scroll className="w-5 h-5 text-amber-400" />
            Эффект талисмана
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedTalismanEffect('random')}
              className={`
                p-3 rounded-lg border text-sm transition-all
                ${selectedTalismanEffect === 'random'
                  ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                  : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'}
              `}
            >
              🎲 Случайный
            </button>
            {talismanEffects.map(effect => {
              const info = getTalismanEffectInfo(effect);
              return (
                <button
                  key={effect}
                  onClick={() => setSelectedTalismanEffect(effect)}
                  className={`
                    p-3 rounded-lg border text-sm transition-all text-left
                    ${selectedTalismanEffect === effect
                      ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                      : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'}
                  `}
                >
                  <div className="font-medium">{info.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{info.baseDuration} сек</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
              onChange={(e) => setGenCount(parseInt(e.target.value) || 10)}
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
        Сгенерировать {genCount} аксессуаров
      </Button>

      {/* Краткая сводка */}
      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
        <p className="text-sm text-slate-400">
          Генерация: <span className="text-amber-400">
            {selectedType === 'random' ? 'Все типы' : accessoryTypes.find(t => t.id === selectedType)?.name}
          </span>
          {isTalismanSelected && selectedTalismanEffect !== 'random' && (
            <> → <span className="text-purple-400">
              {getTalismanEffectInfo(selectedTalismanEffect as TalismanEffectType)?.name}
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
