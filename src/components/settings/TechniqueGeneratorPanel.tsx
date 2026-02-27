'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Sword,
  Shield,
  Heart,
  Eye,
  Move,
  Brain,
  Skull,
  Droplet,
  Zap,
} from 'lucide-react';
import { Rarity, TechniqueType } from '@/lib/generator/technique-generator';
import {
  getTechniqueTypeList,
  RARITY_INFO,
  getBonusSlotsForRarity,
  type TechniqueTypeConfig,
  type BonusSlot,
} from '@/lib/generator/technique-config';

interface TechniqueGeneratorPanelProps {
  onGenerate: (params: {
    type: string;
    level: number;
    rarity?: Rarity;
    count: number;
    damageVariance: { min: number; max: number };
    mode: 'replace' | 'append';
    typeSpecificParams?: Record<string, number>;
  }) => Promise<void>;
  loading: boolean;
}

const TYPE_ICONS: Record<TechniqueType, React.ReactNode> = {
  combat: <Sword className="w-5 h-5" />,
  defense: <Shield className="w-5 h-5" />,
  healing: <Heart className="w-5 h-5" />,
  sensory: <Eye className="w-5 h-5" />,
  movement: <Move className="w-5 h-5" />,
  cultivation: <Brain className="w-5 h-5" />,
  curse: <Skull className="w-5 h-5" />,
  poison: <Droplet className="w-5 h-5" />,
  support: <Zap className="w-5 h-5" />,
};

export function TechniqueGeneratorPanel({ onGenerate, loading }: TechniqueGeneratorPanelProps) {
  // Выбор типа - только один за раз
  const [selectedType, setSelectedType] = useState<TechniqueType>('combat');
  
  // Общие параметры
  const [genLevel, setGenLevel] = useState<string>('all');
  const [genRarity, setGenRarity] = useState<string>('random');
  const [genCount, setGenCount] = useState(50);
  const [genMode, setGenMode] = useState<'replace' | 'append'>('append');
  
  // Специфичные параметры типа (сохраняем для каждого типа)
  const [typeParams, setTypeParams] = useState<Record<TechniqueType, Record<string, number>>>(() => {
    const initial: Record<TechniqueType, Record<string, number>> = {} as Record<TechniqueType, Record<string, number>>;
    const types = getTechniqueTypeList();
    for (const t of types) {
      initial[t.id] = {};
      for (const p of t.params) {
        initial[t.id][p.id] = p.default;
      }
    }
    return initial;
  });
  
  // UI состояние
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const typeConfig = useMemo(() => {
    return getTechniqueTypeList().find(t => t.id === selectedType)!;
  }, [selectedType]);
  
  const typeList = getTechniqueTypeList();
  
  // Получаем текущие параметры для выбранного типа
  const currentParams = typeParams[selectedType] || {};
  
  const handleParamChange = (paramId: string, value: number) => {
    setTypeParams(prev => ({
      ...prev,
      [selectedType]: {
        ...prev[selectedType],
        [paramId]: value,
      },
    }));
  };
  
  const handleGenerate = async () => {
    // Вычисляем damageVariance из параметров
    const damageVariance = {
      min: (currentParams.damageVarianceMin || 70) / 100,
      max: (currentParams.damageVarianceMax || 130) / 100,
    };
    
    await onGenerate({
      type: selectedType,
      level: genLevel === 'all' ? 0 : parseInt(genLevel),
      rarity: genRarity === 'random' ? undefined : genRarity as Rarity,
      count: genCount,
      damageVariance,
      mode: genMode,
      typeSpecificParams: currentParams,
    });
  };
  
  // Рендер слайдера параметра
  const renderParamSlider = (param: TechniqueTypeConfig['params'][0]) => (
    <div key={param.id} className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-sm text-slate-300">{param.label}</Label>
        <span className="text-sm text-amber-400 font-medium">
          {currentParams[param.id] ?? param.default}{param.unit || ''}
        </span>
      </div>
      <Slider
        value={[currentParams[param.id] ?? param.default]}
        onValueChange={([v]) => handleParamChange(param.id, v)}
        min={param.min}
        max={param.max}
        step={param.step}
        className="w-full"
      />
      <p className="text-xs text-slate-500">{param.description}</p>
    </div>
  );
  
  // Рендер бонусов редкости
  const renderRarityBonuses = () => {
    if (genRarity === 'random') return null;
    
    const bonusSlots = getBonusSlotsForRarity(selectedType, genRarity as Rarity);
    if (bonusSlots.length === 0) return null;
    
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Бонусы редкости {RARITY_INFO[genRarity as Rarity].label}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {bonusSlots.map((slot, idx) => (
            <div key={idx} className="bg-slate-700/50 rounded p-2">
              <div className="text-xs text-amber-400 font-medium">{slot.label}</div>
              <div className="text-xs text-slate-400">
                +{slot.minValue} ~ +{slot.maxValue}
              </div>
              <div className="text-xs text-slate-500 mt-1">{slot.description}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Выбор типа техники */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Info className="w-5 h-5 text-amber-400" />
          Выберите тип техники
        </h3>
        <p className="text-sm text-slate-400">
          Выберите один тип техники для генерации. Для каждого типа доступны свои параметры.
        </p>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {typeList.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`
                flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all
                ${selectedType === type.id 
                  ? 'bg-amber-600/20 border-amber-500 text-amber-400' 
                  : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500'}
              `}
            >
              <span className="mb-1">{TYPE_ICONS[type.id]}</span>
              <span className="text-xs font-medium text-center">{type.name}</span>
            </button>
          ))}
        </div>
        
        {/* Описание выбранного типа */}
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">{TYPE_ICONS[selectedType]}</span>
            <div>
              <div className="font-medium text-slate-200">{typeConfig.name}</div>
              <div className="text-sm text-slate-400">{typeConfig.description}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Основные параметры генерации */}
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
                      {info.label} ({info.bonusSlots} бонусов)
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
        
        {/* Бонусы редкости для выбранного типа */}
        {renderRarityBonuses()}
      </div>
      
      {/* Специфичные параметры типа */}
      {typeConfig.params.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
            <span className="text-amber-400">{TYPE_ICONS[selectedType]}</span>
            Параметры {typeConfig.name}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {typeConfig.params.map(renderParamSlider)}
          </div>
        </div>
      )}
      
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
            {/* Границы параметров */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300">Границы параметров</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Мин. урон</Label>
                  <Input
                    type="number"
                    placeholder={String(typeConfig.baseBounds.damageMin)}
                    className="bg-slate-700 border-slate-600 text-white mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Макс. урон</Label>
                  <Input
                    type="number"
                    placeholder={String(typeConfig.baseBounds.damageMax)}
                    className="bg-slate-700 border-slate-600 text-white mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Мин. Ци</Label>
                  <Input
                    type="number"
                    placeholder={String(typeConfig.baseBounds.qiCostMin)}
                    className="bg-slate-700 border-slate-600 text-white mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Макс. Ци</Label>
                  <Input
                    type="number"
                    placeholder={String(typeConfig.baseBounds.qiCostMax)}
                    className="bg-slate-700 border-slate-600 text-white mt-1 text-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* Информация об уборке дубликатов */}
            <div className="bg-amber-900/20 border border-amber-700/50 rounded p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-amber-400">Автоматическая уборка дубликатов</div>
                  <p className="text-xs text-slate-400 mt-1">
                    После генерации автоматически удаляются техники с полностью идентичными параметрами 
                    (тип, элемент, редкость, урон, Ци, эффекты и их значения).
                  </p>
                </div>
              </div>
            </div>
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
        Сгенерировать {genCount} техник &quot;{typeConfig.name}&quot;
      </Button>
      
      {/* Краткая сводка */}
      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
        <p className="text-sm text-slate-400">
          Генерация: <span className="text-amber-400">{typeConfig.name}</span>
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
