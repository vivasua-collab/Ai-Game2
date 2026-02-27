'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Sparkles,
  Package,
  Loader2,
  Check,
  AlertCircle,
  Trash2,
  Shield,
  Sword,
  Heart,
  Eye,
  Move,
  Brain,
  Skull,
  Droplet,
  Wrench,
} from 'lucide-react';
import { CheatMenuContent } from '@/components/game/CheatMenuContent';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenGeneratedObjects?: () => void;
}

interface GeneratorStats {
  techniques: {
    totalPossible: number;
    byLevel: Record<number, number>;
    types: string[];
    elements: string[];
    rarities: string[];
  };
  formations: {
    totalPossible: number;
    byLevel: Record<number, number>;
    types: string[];
  };
}

interface Manifest {
  version: string;
  generatedAt: string;
  techniques: {
    total: number;
    byLevel: Record<number, number>;
    byType: Record<string, number>;
    byElement: Record<string, number>;
  };
  fileSizeStats?: {
    techniquesBytes: number;
    largestFileBytes: number;
    largestFileName: string;
  };
}

interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalObjects: number;
  recommendedMaxFileSize: number;
  filesNeedingSplit: string[];
}

export function SettingsPanel({ open, onOpenChange, onOpenGeneratedObjects }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState('generator');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<GeneratorStats | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [hasPresets, setHasPresets] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Состояние фильтров генерации - по умолчанию 'append' (Добавить)
  const [genLevel, setGenLevel] = useState<string>('all');
  const [genTypes, setGenTypes] = useState<string[]>([]);
  const [genElements, setGenElements] = useState<string[]>(['neutral']); // По умолчанию neutral
  const [genRarities, setGenRarities] = useState<string[]>([]);
  const [genCount, setGenCount] = useState<string>('100');
  const [genMode, setGenMode] = useState<'replace' | 'append'>('append'); // По умолчанию Добавить
  const [preserveCounters, setPreserveCounters] = useState(true);
  
  // Фильтры формаций
  const [formationTypes, setFormationTypes] = useState<string[]>([]);
  const [formationCount, setFormationCount] = useState<string>('50');

  useEffect(() => {
    if (open) {
      loadStats();
      checkPresets();
      loadStorageStats();
    }
  }, [open]);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/generator/techniques?action=stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const checkPresets = async () => {
    try {
      const res = await fetch('/api/generator/techniques?action=check');
      const data = await res.json();
      setHasPresets(data.hasPresets);
      
      if (data.hasPresets) {
        const manifestRes = await fetch('/api/generator/techniques?action=manifest');
        const manifestData = await manifestRes.json();
        setManifest(manifestData.manifest);
      }
    } catch (error) {
      console.error('Failed to check presets:', error);
    }
  };

  const loadStorageStats = async () => {
    try {
      const res = await fetch('/api/generator/techniques?action=storage');
      const data = await res.json();
      if (data.success) {
        setStorageStats(data.storage);
      }
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const handleGenerateTechniques = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      // Формируем опции
      const options: Record<string, unknown> = {
        mode: genMode,
      };
      
      if (genLevel !== 'all') {
        options.level = parseInt(genLevel);
      }
      
      if (genTypes.length > 0) {
        options.types = genTypes;
      }
      
      if (genElements.length > 0) {
        options.elements = genElements;
      }
      
      if (genRarities.length > 0) {
        options.rarities = genRarities;
      }
      
      if (genCount && !isNaN(parseInt(genCount))) {
        options.count = parseInt(genCount);
      }
      
      const res = await fetch('/api/generator/techniques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          mode: genMode,
          options: Object.keys(options).length > 1 ? options : undefined,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ 
          type: data.warnings?.length > 0 ? 'warning' : 'success', 
          text: data.message 
        });
        await checkPresets();
        await loadStats();
        await loadStorageStats();
      } else {
        setMessage({ type: 'error', text: data.error || data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка генерации' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFormations = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/generator/techniques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_formations',
          mode: genMode,
          options: {
            types: formationTypes.length > 0 ? formationTypes : undefined,
            count: parseInt(formationCount) || 50,
          },
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        await checkPresets();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка генерации формаций' });
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Вы уверены? Все сгенерированные данные будут удалены.')) {
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/generator/techniques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear',
          preserveCounters,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setManifest(null);
        setHasPresets(false);
        await loadStats();
        await loadStorageStats();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка удаления' });
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const toggleArrayItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    if (arr.includes(item)) {
      setArr(arr.filter(i => i !== item));
    } else {
      setArr([...arr, item]);
    }
  };

  // Названия типов техник
  const TECHNIQUE_TYPE_NAMES: Record<string, { name: string; icon: React.ReactNode }> = {
    combat: { name: '⚔️ Атакующая', icon: <Sword className="w-3 h-3" /> },
    defense: { name: '🛡️ Защитная', icon: <Shield className="w-3 h-3" /> },
    cultivation: { name: '🧘 Культивация', icon: <Brain className="w-3 h-3" /> },
    support: { name: '✨ Поддержка', icon: <Sparkles className="w-3 h-3" /> },
    movement: { name: '🏃 Перемещение', icon: <Move className="w-3 h-3" /> },
    sensory: { name: '👁️ Восприятие', icon: <Eye className="w-3 h-3" /> },
    healing: { name: '💚 Исцеление', icon: <Heart className="w-3 h-3" /> },
    curse: { name: '💀 Проклятие', icon: <Skull className="w-3 h-3" /> },
    poison: { name: '☠️ Отравление', icon: <Droplet className="w-3 h-3" /> },
  };

  // Типы формаций
  const FORMATION_TYPE_NAMES: Record<string, { name: string; color: string }> = {
    defensive: { name: '🛡️ Защитные', color: 'text-blue-400' },
    offensive: { name: '⚔️ Атакующие', color: 'text-red-400' },
    support: { name: '💚 Поддержки', color: 'text-green-400' },
    special: { name: '✨ Специальные', color: 'text-purple-400' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-amber-400 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Настройки
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800">
            <TabsTrigger value="generator" className="data-[state=active]:bg-amber-600">
              <Sparkles className="w-4 h-4 mr-1" />
              Генератор
            </TabsTrigger>
            <TabsTrigger value="formations" className="data-[state=active]:bg-amber-600">
              <Shield className="w-4 h-4 mr-1" />
              Формации
            </TabsTrigger>
            <TabsTrigger value="cheats" className="data-[state=active]:bg-amber-600">
              <Wrench className="w-4 h-4 mr-1" />
              Читы
            </TabsTrigger>
            <TabsTrigger value="storage" className="data-[state=active]:bg-amber-600">
              <Package className="w-4 h-4 mr-1" />
              Хранилище
            </TabsTrigger>
          </TabsList>

          {/* ГЕНЕРАТОР ТЕХНИК */}
          <TabsContent value="generator" className="mt-4 space-y-4 overflow-y-auto max-h-[60vh]">
            {stats && (
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-amber-400 mb-3">
                  ⚔️ Генератор техник
                </h3>

                {hasPresets && manifest && (
                  <div className="mb-4 p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <Check className="w-4 h-4" />
                      Техник в базе: {manifest.techniques.total} шт.
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Дата: {new Date(manifest.generatedAt).toLocaleString('ru')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Фильтры */}
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-medium text-slate-300">Параметры генерации</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-400">Уровень</Label>
                  <Select value={genLevel} onValueChange={setGenLevel}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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

                <div>
                  <Label className="text-xs text-slate-400">Количество</Label>
                  <Input
                    type="number"
                    value={genCount}
                    onChange={(e) => setGenCount(e.target.value)}
                    placeholder="100"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              {/* Типы - белый цвет шрифта */}
              <div>
                <Label className="text-xs text-slate-400 mb-2 block">Типы техник</Label>
                <div className="flex flex-wrap gap-2">
                  {stats?.techniques.types.map(type => {
                    const typeInfo = TECHNIQUE_TYPE_NAMES[type] || { name: type, icon: null };
                    return (
                      <Badge
                        key={type}
                        variant={genTypes.includes(type) ? 'default' : 'outline'}
                        className={`cursor-pointer text-white ${genTypes.includes(type) ? 'bg-amber-600' : 'bg-slate-700 border-slate-500 hover:bg-slate-600'}`}
                        onClick={() => toggleArrayItem(genTypes, setGenTypes, type)}
                      >
                        {typeInfo.icon}
                        <span className="ml-1">{typeInfo.name}</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Элементы - белый цвет шрифта, neutral по умолчанию */}
              <div>
                <Label className="text-xs text-slate-400 mb-2 block">Элементы</Label>
                <div className="flex flex-wrap gap-2">
                  {stats?.techniques.elements.map(element => (
                    <Badge
                      key={element}
                      variant={genElements.includes(element) ? 'default' : 'outline'}
                      className={`cursor-pointer text-white ${genElements.includes(element) ? 'bg-amber-600' : 'bg-slate-700 border-slate-500 hover:bg-slate-600'}`}
                      onClick={() => toggleArrayItem(genElements, setGenElements, element)}
                    >
                      {element}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Режим - по умолчанию Добавить */}
              <div>
                <Label className="text-xs text-slate-400 mb-2 block">Режим</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      checked={genMode === 'replace'}
                      onChange={() => setGenMode('replace')}
                      className="text-amber-500"
                    />
                    <span className="text-sm text-white">Заменить</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      checked={genMode === 'append'}
                      onChange={() => setGenMode('append')}
                      className="text-amber-500"
                    />
                    <span className="text-sm text-white">Добавить</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleGenerateTechniques}
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Сгенерировать
              </Button>
              
              <Button
                onClick={handleClearAll}
                disabled={loading}
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Очистить базу
              </Button>
            </div>

            {message && activeTab === 'generator' && (
              <div className={`p-3 rounded flex items-center gap-2 text-sm ${
                message.type === 'success' 
                  ? 'bg-green-900/30 text-green-400' 
                  : message.type === 'warning'
                  ? 'bg-yellow-900/30 text-yellow-400'
                  : 'bg-red-900/30 text-red-400'
              }`}>
                {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {message.text}
              </div>
            )}

            {/* Заглушки для других генераторов */}
            <div className="bg-slate-800/50 rounded-lg p-4 opacity-60">
              <h3 className="text-lg font-medium text-slate-400 mb-2">
                🛡️ Генератор экипировки
              </h3>
              <p className="text-sm text-slate-500">Будет реализовано позже</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 opacity-60">
              <h3 className="text-lg font-medium text-slate-400 mb-2">
                👥 Генератор NPC и монстров
              </h3>
              <p className="text-sm text-slate-500">Будет реализовано позже</p>
            </div>
          </TabsContent>

          {/* ФОРМАЦИИ */}
          <TabsContent value="formations" className="mt-4 space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-amber-400 mb-3">
                🛡️ Генератор формаций
              </h3>

              {/* Выбор типов формаций */}
              <div className="mb-4">
                <Label className="text-xs text-slate-400 mb-2 block">Типы формаций</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(FORMATION_TYPE_NAMES).map(([type, info]) => (
                    <Badge
                      key={type}
                      variant={formationTypes.includes(type) ? 'default' : 'outline'}
                      className={`cursor-pointer text-white ${formationTypes.includes(type) ? 'bg-amber-600' : 'bg-slate-700 border-slate-500 hover:bg-slate-600'}`}
                      onClick={() => toggleArrayItem(formationTypes, setFormationTypes, type)}
                    >
                      {info.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Количество */}
              <div className="mb-4">
                <Label className="text-xs text-slate-400">Количество</Label>
                <Input
                  type="number"
                  value={formationCount}
                  onChange={(e) => setFormationCount(e.target.value)}
                  placeholder="50"
                  className="bg-slate-700 border-slate-600 text-white w-32"
                />
              </div>

              <Button
                onClick={handleGenerateFormations}
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Сгенерировать формации
              </Button>
            </div>

            <div className="bg-slate-800/30 rounded-lg p-4 text-sm text-slate-400">
              <h4 className="font-medium text-white mb-2">Типы формаций:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><span className="text-blue-400">Защитные</span> — снижение урона, общие щиты</li>
                <li><span className="text-red-400">Атакующие</span> — усиление урона, крит. шанс</li>
                <li><span className="text-green-400">Поддержки</span> — регенерация Ци/HP</li>
                <li><span className="text-purple-400">Специальные</span> — усиление элементов</li>
              </ul>
            </div>
          </TabsContent>

          {/* ЧИТЫ */}
          <TabsContent value="cheats" className="mt-4 overflow-y-auto max-h-[60vh]">
            <CheatMenuContent />
          </TabsContent>

          {/* ХРАНИЛИЩЕ */}
          <TabsContent value="storage" className="mt-4 space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-amber-400 mb-3">
                📦 Хранилище сгенерированных объектов
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Здесь хранятся сгенерированные техники, формации и другие объекты для использования в игре.
              </p>
              
              {storageStats && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-700/50 rounded p-3">
                      <div className="text-2xl font-bold text-cyan-400">
                        {storageStats.totalFiles}
                      </div>
                      <div className="text-sm text-slate-400">Файлов</div>
                    </div>
                    <div className="bg-slate-700/50 rounded p-3">
                      <div className="text-2xl font-bold text-green-400">
                        {formatBytes(storageStats.totalSizeBytes)}
                      </div>
                      <div className="text-sm text-slate-400">Размер</div>
                    </div>
                    <div className="bg-slate-700/50 rounded p-3">
                      <div className="text-2xl font-bold text-amber-400">
                        {storageStats.totalObjects}
                      </div>
                      <div className="text-sm text-slate-400">Объектов</div>
                    </div>
                  </div>

                  {storageStats.filesNeedingSplit.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-400 text-sm mb-2">
                        <AlertCircle className="w-4 h-4" />
                        Файлы требуют разбиения:
                      </div>
                      <ul className="text-xs text-slate-400 space-y-1">
                        {storageStats.filesNeedingSplit.map(f => (
                          <li key={f}>{f.split('/').pop()}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-xs text-slate-500">
                    Рекомендуемый макс. размер файла: {formatBytes(storageStats.recommendedMaxFileSize)}
                  </div>
                </div>
              )}
            </div>

            {/* Контроль счётчиков при удалении */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-amber-400 mb-3">
                🆔 Настройки ID
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={preserveCounters}
                  onCheckedChange={(checked) => setPreserveCounters(checked as boolean)}
                />
                <span className="text-sm text-slate-300">
                  Сохранять счётчики ID при очистке
                </span>
              </label>
              <p className="text-xs text-slate-500 mt-2">
                Если включено, новые ID будут продолжать нумерацию после очистки (без дубликатов).
                Если выключено, счётчики сбросятся и нумерация начнётся с 1.
              </p>
            </div>

            <Button
              onClick={onOpenGeneratedObjects}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              <Package className="w-4 h-4 mr-2" />
              Просмотреть объекты
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-slate-600 text-white"
          >
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
