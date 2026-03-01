'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Loader2,
  Sparkles,
  Trash2,
  User,
  Wolf,
  Ghost,
  Sparkle,
  Flame,
  Sword,
  Shield,
  Briefcase,
  Heart,
  Check,
  AlertCircle,
} from 'lucide-react';

interface NPCGeneratorPanelProps {
  onGenerate: (params: {
    context: {
      speciesType?: string;
      roleType?: string;
      cultivationLevel?: { min: number; max: number };
      difficulty?: string;
    };
    count: number;
    save: boolean;
    mode: 'replace' | 'append';
  }) => Promise<void>;
  onClear?: () => Promise<void>;
  loading: boolean;
  npcStats?: {
    total: number;
    bySpeciesType: Record<string, number>;
    byRoleType: Record<string, number>;
    byLevel: Record<number, number>;
  };
}

// Типы видов
const SPECIES_TYPES = [
  { id: 'all', name: 'Все виды', icon: Users },
  { id: 'humanoid', name: 'Гуманоиды', icon: User },
  { id: 'beast', name: 'Звери', icon: Wolf },
  { id: 'spirit', name: 'Духи', icon: Ghost },
  { id: 'hybrid', name: 'Гибриды', icon: Sparkle },
  { id: 'aberration', name: 'Аберрации', icon: Flame },
];

// Типы ролей
const ROLE_TYPES = [
  { id: 'all', name: 'Все роли', icon: Users },
  { id: 'sect', name: 'Секта', icon: Shield },
  { id: 'profession', name: 'Профессии', icon: Briefcase },
  { id: 'social', name: 'Социальные', icon: Heart },
  { id: 'combat', name: 'Боевые', icon: Sword },
];

// Сложность
const DIFFICULTY_OPTIONS = [
  { id: 'any', name: 'Любая' },
  { id: 'easy', name: 'Лёгкая (уровень -1)' },
  { id: 'medium', name: 'Средняя (тот же уровень)' },
  { id: 'hard', name: 'Сложная (уровень +1)' },
  { id: 'boss', name: 'Босс (уровень +2-3)' },
];

export function NPCGeneratorPanel({ onGenerate, onClear, loading, npcStats }: NPCGeneratorPanelProps) {
  // Параметры генерации
  const [speciesType, setSpeciesType] = useState('all');
  const [roleType, setRoleType] = useState('all');
  const [levelMin, setLevelMin] = useState(1);
  const [levelMax, setLevelMax] = useState(3);
  const [difficulty, setDifficulty] = useState('any');
  const [count, setCount] = useState(10);
  const [save, setSave] = useState(true);
  const [mode, setMode] = useState<'replace' | 'append'>('append');
  
  // Предпросмотр
  const [previewNPCs, setPreviewNPCs] = useState<Array<{
    id: string;
    name: string;
    speciesId: string;
    roleId: string;
    cultivation: { level: number };
  }> | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Сброс предпросмотра при изменении параметров
  useEffect(() => {
    setPreviewNPCs(null);
  }, [speciesType, roleType, levelMin, levelMax, difficulty, count]);

  const handleGenerate = async () => {
    const context = {
      speciesType: speciesType === 'all' ? undefined : speciesType,
      roleType: roleType === 'all' ? undefined : roleType,
      cultivationLevel: { min: levelMin, max: levelMax },
      difficulty: difficulty === 'any' ? undefined : difficulty,
    };

    await onGenerate({ context, count, save, mode });
  };

  const handlePreview = async () => {
    setLoadingPreview(true);
    try {
      const context = {
        speciesType: speciesType === 'all' ? undefined : speciesType,
        roleType: roleType === 'all' ? undefined : roleType,
        cultivationLevel: { min: levelMin, max: levelMax },
        difficulty: difficulty === 'any' ? undefined : difficulty,
      };

      const res = await fetch('/api/generator/npc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          context,
          count: Math.min(count, 5), // Максимум 5 для предпросмотра
          save: false,
        }),
      });

      const data = await res.json();
      if (data.success && data.npcs) {
        setPreviewNPCs(data.npcs.map((npc: { id: string; name: string; speciesId: string; roleId: string; cultivation: { level: number } }) => ({
          id: npc.id,
          name: npc.name,
          speciesId: npc.speciesId,
          roleId: npc.roleId,
          cultivation: npc.cultivation,
        })));
      }
    } catch (error) {
      console.error('Preview error:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const IconComponent = ({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) => (
    <Icon className="w-4 h-4" />
  );

  return (
    <div className="space-y-6">
      {/* Статистика */}
      {npcStats && npcStats.total > 0 && (
        <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <Users className="w-4 h-4" />
            NPC в базе: {npcStats.total} шт.
          </div>
        </div>
      )}

      {/* Выбор вида */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Wolf className="w-5 h-5 text-amber-400" />
          Тип существа
        </h3>
        <p className="text-sm text-slate-400">
          Выберите тип существа или оставьте случайным для всех видов.
        </p>
        
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {SPECIES_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setSpeciesType(type.id)}
              className={`
                flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all
                ${speciesType === type.id 
                  ? 'bg-amber-600/20 border-amber-500 text-amber-400' 
                  : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500'}
              `}
            >
              <IconComponent icon={type.icon} />
              <span className="text-xs font-medium text-center mt-1">{type.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Выбор роли */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-amber-400" />
          Тип роли
        </h3>
        <p className="text-sm text-slate-400">
          Определите социальную или боевую роль NPC.
        </p>
        
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {ROLE_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setRoleType(type.id)}
              className={`
                flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all
                ${roleType === type.id 
                  ? 'bg-amber-600/20 border-amber-500 text-amber-400' 
                  : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500'}
              `}
            >
              <IconComponent icon={type.icon} />
              <span className="text-xs font-medium text-center mt-1">{type.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Уровень культивации */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200">Уровень культивации</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-slate-300">Мин. уровень</Label>
              <Select value={String(levelMin)} onValueChange={(v) => setLevelMin(parseInt(v))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => (
                    <SelectItem key={lvl} value={String(lvl)}>
                      Уровень {lvl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-slate-300">Макс. уровень</Label>
              <Select value={String(levelMax)} onValueChange={(v) => setLevelMax(parseInt(v))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => (
                    <SelectItem key={lvl} value={String(lvl)}>
                      Уровень {lvl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="text-xs text-slate-500 text-center">
            Диапазон: уровни {levelMin} - {levelMax}
          </div>
        </div>
      </div>

      {/* Параметры генерации */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200">Параметры генерации</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Количество */}
          <div>
            <Label className="text-xs text-slate-400">Количество</Label>
            <Input
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 10)}
              className="bg-slate-700 border-slate-600 text-white mt-1"
              min={1}
              max={100}
            />
          </div>
          
          {/* Сложность */}
          <div>
            <Label className="text-xs text-slate-400">Сложность</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                {DIFFICULTY_OPTIONS.map(opt => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Режим */}
          <div>
            <Label className="text-xs text-slate-400">Режим</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as 'replace' | 'append')}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                <SelectItem value="replace">Заменить</SelectItem>
                <SelectItem value="append">Добавить</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Сохранение */}
          <div>
            <Label className="text-xs text-slate-400">Сохранение</Label>
            <Select value={save ? 'save' : 'no-save'} onValueChange={(v) => setSave(v === 'save')}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                <SelectItem value="save">Сохранить</SelectItem>
                <SelectItem value="no-save">Без сохранения</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Предпросмотр */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-slate-200">Предпросмотр</h3>
          <Button
            onClick={handlePreview}
            disabled={loadingPreview || loading}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300"
          >
            {loadingPreview ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Показать пример
          </Button>
        </div>
        
        {previewNPCs && (
          <ScrollArea className="h-48 rounded border border-slate-700 bg-slate-900/50">
            <div className="p-2 space-y-2">
              {previewNPCs.map((npc, idx) => (
                <div key={npc.id || idx} className="bg-slate-800/50 rounded p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-amber-400">{npc.name}</span>
                    <Badge variant="outline" className="text-xs border-slate-600">
                      Ур. {npc.cultivation?.level || 1}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {npc.speciesId} • {npc.roleId}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {!previewNPCs && (
          <div className="text-sm text-slate-500 text-center py-8">
            Нажмите &quot;Показать пример&quot; для предпросмотра
          </div>
        )}
      </div>

      {/* Кнопки действий */}
      <div className="flex gap-4">
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 bg-amber-600 hover:bg-amber-700 h-12 text-lg"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Users className="w-5 h-5 mr-2" />
          )}
          Сгенерировать {count} NPC
        </Button>
        
        {onClear && npcStats && npcStats.total > 0 && (
          <Button
            onClick={onClear}
            disabled={loading}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Очистить
          </Button>
        )}
      </div>

      {/* Информация */}
      <div className="bg-slate-700/30 rounded-lg p-3 text-xs text-slate-400">
        <p>
          NPC генерируются с полным набором характеристик: тело, культивация, 
          техники, личность и инвентарь из пула расходников.
        </p>
      </div>
    </div>
  );
}
