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
  Diamond,
  AlertTriangle,
} from 'lucide-react';
import {
  generateQiStones,
  getQiStoneSizeList,
  getQiStoneTypeInfo,
  QI_STONE_SIZES,
  QI_DENSITY_CONSTANT,
  type QiStoneSize,
  type QiStoneType,
  type QiStoneGenerationOptions,
  type QiStone,
} from '@/lib/generator/qi-stone-generator';

interface QiStoneGeneratorPanelProps {
  onGenerate: (stones: QiStone[]) => void;
  loading?: boolean;
}

export function QiStoneGeneratorPanel({ onGenerate, loading = false }: QiStoneGeneratorPanelProps) {
  const [selectedSize, setSelectedSize] = useState<string>('random');
  const [selectedType, setSelectedType] = useState<string>('random');
  const [genCount, setGenCount] = useState(20);
  const [genMode, setGenMode] = useState<'replace' | 'append'>('append');
  const [isGenerating, setIsGenerating] = useState(false);

  const sizeList = getQiStoneSizeList();
  const typeInfo = getQiStoneTypeInfo();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const options: QiStoneGenerationOptions = {
        sizeClass: selectedSize === 'random' ? undefined : selectedSize as QiStoneSize,
        type: selectedType === 'random' ? undefined : selectedType as QiStoneType,
        count: genCount,
        mode: genMode,
      };

      const result = generateQiStones(genCount, options);
      onGenerate(result.stones);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Информация о системе камней Ци */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Diamond className="w-5 h-5 text-amber-400" />
          Камни Ци (Духовные Камни)
        </h3>
        
        <div className="bg-slate-700/30 rounded-lg p-3 space-y-2">
          <p className="text-sm text-slate-400">
            <span className="text-amber-400 font-medium">Формула:</span> Ци = 1024 × объём (см³)
          </p>
          <p className="text-sm text-slate-400">
            <span className="text-amber-400 font-medium">Плотность:</span> {QI_DENSITY_CONSTANT} ед/см³ (постоянная)
          </p>
        </div>

        {/* Предупреждение о качестве */}
        <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-cyan-400">Камни Ци БЕЗ качества</div>
              <p className="text-xs text-slate-400 mt-1">
                Лор не предусматривает качество камней. Камень характеризуется только:
              </p>
              <ul className="text-xs text-slate-400 mt-1 space-y-1">
                <li>• <span className="text-amber-400">Объём Ци</span> (ед)</li>
                <li>• <span className="text-amber-400">Тип Ци</span> (calm / chaotic)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Выбор размера */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200">Размер камня</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          <button
            onClick={() => setSelectedSize('random')}
            className={`
              p-3 rounded-lg border text-sm transition-all
              ${selectedSize === 'random'
                ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'}
            `}
          >
            🎲 Случайный
          </button>
          {sizeList.map(size => (
            <button
              key={size.id}
              onClick={() => setSelectedSize(size.id)}
              className={`
                p-3 rounded-lg border text-sm transition-all text-left
                ${selectedSize === size.id
                  ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                  : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'}
              `}
            >
              <div className="font-medium">{size.name}</div>
              <div className="text-xs text-slate-500 mt-1">{size.qiRange}</div>
            </button>
          ))}
        </div>

        {/* Информация о выбранном размере */}
        {selectedSize !== 'random' && (
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-slate-400">Объём</div>
                <div className="text-amber-400">
                  {QI_STONE_SIZES[selectedSize as QiStoneSize]?.typicalDimensions}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Диапазон Ци</div>
                <div className="text-amber-400">
                  {sizeList.find(s => s.id === selectedSize)?.qiRange}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Размер</div>
                <div className="text-amber-400">
                  {QI_STONE_SIZES[selectedSize as QiStoneSize]?.volumeRange[0]} - {
                    QI_STONE_SIZES[selectedSize as QiStoneSize]?.volumeRange[1] === Infinity 
                      ? '∞' 
                      : QI_STONE_SIZES[selectedSize as QiStoneSize]?.volumeRange[1]
                  } см³
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Выбор типа Ци */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200">Тип Ци</h3>
        
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedType('random')}
            className={`
              p-4 rounded-lg border text-sm transition-all
              ${selectedType === 'random'
                ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'}
            `}
          >
            🎲 Случайный
          </button>
          {typeInfo.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`
                p-4 rounded-lg border text-sm transition-all text-left
                ${selectedType === type.id
                  ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                  : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'}
              `}
            >
              <div className="font-medium">{type.name}</div>
              <div className="text-xs text-slate-500 mt-1">{type.description}</div>
              {type.danger > 0 && (
                <Badge variant="outline" className="mt-2 border-red-500 text-red-400 text-xs">
                  ⚠️ Опасность: {type.danger}/10
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Предупреждение о хаотичной Ци */}
        {selectedType === 'chaotic' && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-red-400">Хаотичная Ци опасна!</div>
                <p className="text-xs text-slate-400 mt-1">
                  Камни с хаотичной Ци содержат неупорядоченную энергию. 
                  Высокий энергетический потенциал, но опасен для неопытных практиков.
                  Риск повреждения меридиан и ядра!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Параметры генерации */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200">Параметры генерации</h3>
        
        <div className="grid grid-cols-3 gap-4">
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
          <div className="col-span-2">
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
        Сгенерировать {genCount} камней Ци
      </Button>

      {/* Краткая сводка */}
      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
        <p className="text-sm text-slate-400">
          Генерация: <span className="text-amber-400">
            {selectedSize === 'random' ? 'Случайный размер' : sizeList.find(s => s.id === selectedSize)?.name}
          </span>
          {' • '}
          <span className={selectedType === 'chaotic' ? 'text-red-400' : 'text-cyan-400'}>
            {selectedType === 'random' ? 'Случайный тип' : typeInfo.find(t => t.id === selectedType)?.name}
          </span>
        </p>
      </div>
    </div>
  );
}
