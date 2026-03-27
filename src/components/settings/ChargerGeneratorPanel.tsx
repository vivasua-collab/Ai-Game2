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
  Battery,
} from 'lucide-react';
import type { EquipmentGrade, GeneratedEquipmentV2 } from '@/types/equipment-v2';

interface ChargerGeneratorPanelProps {
  onGenerate: (chargers: GeneratedEquipmentV2[]) => void;
  loading?: boolean;
}

// V2 использует grade вместо rarity
const GRADE_OPTIONS = [
  { value: 'random', label: '🎲 Случайный' },
  { value: 'damaged', label: '⚠️ Повреждённый' },
  { value: 'common', label: '⚪ Обычный' },
  { value: 'refined', label: '🟢 Улучшенный' },
  { value: 'perfect', label: '🔵 Совершенный' },
  { value: 'transcendent', label: '🟣 Превосходящий' },
];

// Маппинг grade -> множитель проводимости (для UI)
const GRADE_CONDUCTIVITY_BONUS: Record<string, number> = {
  damaged: 0.7,
  common: 1.0,
  refined: 1.3,
  perfect: 1.6,
  transcendent: 2.0,
};

export function ChargerGeneratorPanel({ onGenerate, loading = false }: ChargerGeneratorPanelProps) {
  const [selectedGrade, setSelectedGrade] = useState<string>('random');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [genCount, setGenCount] = useState(10);
  const [genMode, setGenMode] = useState<'replace' | 'append'>('append');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Определяем уровни для генерации
      const levels = selectedLevel === 'all' 
        ? [1, 2, 3, 4, 5, 6, 7, 8, 9] 
        : [parseInt(selectedLevel)];
      
      const allChargers: GeneratedEquipmentV2[] = [];
      const countPerLevel = Math.ceil(genCount / levels.length);
      
      for (const level of levels) {
        const response = await fetch('/api/generator/equipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate',
            type: 'charger',
            level,
            grade: selectedGrade === 'random' ? undefined : selectedGrade,
            count: countPerLevel,
            mode: 'append', // Всегда append в цикле
          }),
        });

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Ошибка генерации');
        }
        
        // Загружаем сгенерированные объекты
        const listResponse = await fetch('/api/generator/equipment?action=list&type=charger');
        const listData = await listResponse.json();
        
        if (listData.success && listData.items) {
          // Берём последние сгенерированные
          const recentItems = listData.items.slice(-countPerLevel);
          allChargers.push(...recentItems);
        }
      }
      
      onGenerate(allChargers.slice(0, genCount));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      console.error('[ChargerGenerator] Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Информация о выбранном грейде
  const selectedGradeInfo = GRADE_OPTIONS.find(g => g.value === selectedGrade);
  const conductivityBonus = selectedGrade !== 'random' 
    ? GRADE_CONDUCTIVITY_BONUS[selectedGrade] 
    : null;

  return (
    <div className="space-y-6">
      {/* Информация о зарядниках V2 */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Battery className="w-5 h-5 text-amber-400" />
          Зарядники V2
        </h3>
        
        <div className="bg-slate-700/30 rounded-lg p-3 space-y-2">
          <p className="text-sm text-slate-400">
            Зарядник — устройство для контролируемого поглощения Ци из камней.
            Генератор V2 использует архитектуру "Матрёшка" с материалами и грейдами.
          </p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-slate-400">Проводимость Ци</div>
              <div className="text-amber-400">30 + level × 10</div>
            </div>
            <div>
              <div className="text-slate-400">Слоты техник</div>
              <div className="text-cyan-400">1-4 (по грейду)</div>
            </div>
            <div>
              <div className="text-slate-400">Материал</div>
              <div className="text-purple-400">T1-T5</div>
            </div>
          </div>
        </div>

        {/* Формула V2 */}
        <div className="bg-slate-700/30 rounded-lg p-3">
          <p className="text-sm text-slate-400 mb-2">
            <span className="text-amber-400 font-medium">Архитектура "Матрёшка":</span>
          </p>
          <div className="text-sm text-slate-300 font-mono bg-slate-800 p-2 rounded">
            База → Материал → Грейд → Итог<br/>
            Conductivity = Base × Material × Grade
          </div>
        </div>
      </div>

      {/* Параметры генерации */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200">Параметры генерации V2</h3>
        
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

          {/* Грейд (вместо rarity) */}
          <div>
            <Label className="text-xs text-slate-400">Грейд (качество)</Label>
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                {GRADE_OPTIONS.map(opt => (
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

        {/* Информация о выбранном грейде */}
        {selectedGrade !== 'random' && conductivityBonus && (
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-sm text-slate-400">
              Множитель проводимости: <span className="text-amber-400">×{conductivityBonus}</span>
              {' • '}Слоты техник: <span className="text-cyan-400">
                {selectedGrade === 'damaged' ? 0 : 
                 selectedGrade === 'common' ? 1 :
                 selectedGrade === 'refined' ? 2 :
                 selectedGrade === 'perfect' ? 3 : 4}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Ошибка */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

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
        Сгенерировать {genCount} зарядников (V2)
      </Button>

      {/* Краткая сводка */}
      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
        <p className="text-sm text-slate-400">
          Генерация V2: <span className="text-amber-400">
            {selectedLevel === 'all' ? 'Уровни 1-9' : `Уровень ${selectedLevel}`}
          </span>
          {selectedGrade !== 'random' && (
            <> • <span className="text-purple-400">{selectedGradeInfo?.label}</span></>
          )}
          {' • '}<span className="text-cyan-400">Материалы T1-T5</span>
        </p>
      </div>
    </div>
  );
}
