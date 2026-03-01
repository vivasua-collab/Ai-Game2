'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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
  Battery,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import {
  generateChargers,
  getEfficiencyInfo,
  getRarityInfo,
  calculateEffectiveQiOutput,
  type ChargerGenerationOptions,
  type Charger,
  type Rarity,
} from '@/lib/generator/charger-generator';

interface ChargerGeneratorPanelProps {
  onGenerate: (chargers: Charger[]) => void;
  onClear?: () => Promise<void>;
  loading?: boolean;
}

const RARITY_OPTIONS = [
  { value: 'random', label: '🎲 Случайная' },
  { value: 'common', label: 'Обычная' },
  { value: 'uncommon', label: 'Необычная' },
  { value: 'rare', label: 'Редкая' },
  { value: 'legendary', label: 'Легендарная' },
];

export function ChargerGeneratorPanel({ onGenerate, onClear, loading = false }: ChargerGeneratorPanelProps) {
  const [selectedRarity, setSelectedRarity] = useState<string>('random');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [genCount, setGenCount] = useState(10);
  const [genMode, setGenMode] = useState<'replace' | 'append'>('append');
  const [isGenerating, setIsGenerating] = useState(false);

  // Расширенные параметры
  const [minEfficiency, setMinEfficiency] = useState(50);
  const [maxEfficiency, setMaxEfficiency] = useState(100);
  const [minCapacity, setMinCapacity] = useState(1);
  const [maxCapacity, setMaxCapacity] = useState(5);

  const efficiencyInfo = getEfficiencyInfo();
  const rarityInfo = getRarityInfo();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const options: ChargerGenerationOptions = {
        rarity: selectedRarity === 'random' ? undefined : selectedRarity as Rarity,
        level: selectedLevel === 'all' ? undefined : parseInt(selectedLevel),
        count: genCount,
        mode: genMode,
        minEfficiency: minEfficiency / 100,
        maxEfficiency: maxEfficiency / 100,
        minCapacity,
        maxCapacity,
      };

      const result = generateChargers(genCount, options);
      onGenerate(result.chargers);
    } finally {
      setIsGenerating(false);
    }
  };

  // Расчёт примерного выхода Ци
  const exampleQiInput = 1000;
  const exampleOutput = calculateEffectiveQiOutput(
    { efficiency: minEfficiency / 100 } as Charger,
    exampleQiInput
  );

  return (
    <div className="space-y-6">
      {/* Предупреждение об эффективности */}
      <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-medium text-red-400">⚠️ Эффективность ≤ 100%</div>
            <p className="text-xs text-slate-400 mt-1">
              {efficiencyInfo.warning}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Это нарушает закон сохранения Ци: нельзя получить больше энергии, чем было затрачено.
            </p>
          </div>
        </div>
      </div>

      {/* Информация о зарядниках */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Battery className="w-5 h-5 text-amber-400" />
          Зарядники
        </h3>
        
        <div className="bg-slate-700/30 rounded-lg p-3 space-y-2">
          <p className="text-sm text-slate-400">
            Зарядник — устройство для контролируемого поглощения Ци из камней.
          </p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-slate-400">Мин. эффективность</div>
              <div className="text-amber-400">{(efficiencyInfo.min * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-slate-400">Макс. эффективность</div>
              <div className="text-amber-400">{(efficiencyInfo.max * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-slate-400">Пример потерь</div>
              <div className="text-red-400">{exampleOutput.loss} ед Ци</div>
            </div>
          </div>
        </div>

        {/* Формула */}
        <div className="bg-slate-700/30 rounded-lg p-3">
          <p className="text-sm text-slate-400 mb-2">
            <span className="text-amber-400 font-medium">Пример работы:</span>
          </p>
          <div className="text-sm text-slate-300 font-mono bg-slate-800 p-2 rounded">
            Зарядник (efficiency = 80%):<br/>
            • Камень: 1000 ед Ци<br/>
            • Практик получит: <span className="text-green-400">800 ед Ци</span><br/>
            • Потери: <span className="text-red-400">200 ед Ци</span> (рассеиваются)
          </div>
        </div>
      </div>

      {/* Параметры эффективности */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200">Ограничения эффективности</h3>
        
        <div className="space-y-4">
          {/* Минимальная эффективность */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm text-slate-300">Мин. эффективность</Label>
              <span className="text-sm text-amber-400 font-medium">{minEfficiency}%</span>
            </div>
            <Slider
              value={[minEfficiency]}
              onValueChange={([v]) => {
                setMinEfficiency(v);
                if (v > maxEfficiency) setMaxEfficiency(v);
              }}
              min={50}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Максимальная эффективность */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm text-slate-300">Макс. эффективность</Label>
              <span className="text-sm text-amber-400 font-medium">{maxEfficiency}%</span>
            </div>
            <Slider
              value={[maxEfficiency]}
              onValueChange={([v]) => {
                setMaxEfficiency(v);
                if (v < minEfficiency) setMinEfficiency(v);
              }}
              min={50}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Ёмкость */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">Мин. ёмкость (камни)</Label>
              <Input
                type="number"
                value={minCapacity}
                onChange={(e) => setMinCapacity(parseInt(e.target.value) || 1)}
                className="bg-slate-700 border-slate-600 text-white"
                min={1}
                max={10}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">Макс. ёмкость (камни)</Label>
              <Input
                type="number"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 5)}
                className="bg-slate-700 border-slate-600 text-white"
                min={1}
                max={10}
              />
            </div>
          </div>
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
              onChange={(e) => setGenCount(parseInt(e.target.value) || 10)}
              className="bg-slate-700 border-slate-600 text-white mt-1"
              min={1}
              max={100}
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

        {/* Информация о бонусах редкости */}
        {selectedRarity !== 'random' && (
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-sm text-slate-400">
              Бонус редкости: +{rarityInfo.find(r => r.id === selectedRarity)?.efficiencyBonus * 100}% к эффективности
            </div>
          </div>
        )}
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
        Сгенерировать {genCount} зарядников
      </Button>

      {/* Кнопка очистки */}
      {onClear && (
        <div className="flex justify-end">
          <Button
            onClick={onClear}
            disabled={loading || isGenerating}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Очистить зарядники
          </Button>
        </div>
      )}

      {/* Краткая сводка */}
      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
        <p className="text-sm text-slate-400">
          Эффективность: <span className="text-amber-400">{minEfficiency}% - {maxEfficiency}%</span>
          {' • '}Ёмкость: <span className="text-cyan-400">{minCapacity} - {maxCapacity} камней</span>
          {selectedRarity !== 'random' && (
            <> • <span className="text-purple-400">{RARITY_OPTIONS.find(r => r.value === selectedRarity)?.label}</span></>
          )}
        </p>
      </div>
    </div>
  );
}
