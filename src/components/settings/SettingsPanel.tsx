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
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Settings,
  Sparkles,
  Package,
  Users,
  Save,
  FolderOpen,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenGeneratedObjects?: () => void;
}

interface GeneratorStats {
  totalTechniques: number;
  byLevel: Record<number, number>;
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
}

export function SettingsPanel({ open, onOpenChange, onOpenGeneratedObjects }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState('generator');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<GeneratorStats | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [hasPresets, setHasPresets] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      loadStats();
      checkPresets();
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

  const handleGenerateTechniques = async (level?: number) => {
    setLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/generator/techniques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', level }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        await checkPresets();
        await loadStats();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка генерации' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl max-h-[85vh]">
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
            <TabsTrigger value="world" className="data-[state=active]:bg-amber-600">
              <FolderOpen className="w-4 h-4 mr-1" />
              Мир
            </TabsTrigger>
            <TabsTrigger value="save" className="data-[state=active]:bg-amber-600">
              <Save className="w-4 h-4 mr-1" />
              Сохранение
            </TabsTrigger>
            <TabsTrigger value="objects" className="data-[state=active]:bg-amber-600">
              <Package className="w-4 h-4 mr-1" />
              Объекты
            </TabsTrigger>
          </TabsList>

          {/* ГЕНЕРАТОР */}
          <TabsContent value="generator" className="mt-4 space-y-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-amber-400 mb-3">
                ⚔️ Генератор техник
              </h3>
              
              {stats && (
                <div className="mb-4 text-sm text-slate-300">
                  <p>Всего будет сгенерировано: <span className="text-white font-bold">{stats.totalTechniques}</span> техник</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    {Object.entries(stats.byLevel).map(([lvl, count]) => (
                      <div key={lvl} className="bg-slate-700/50 rounded p-2">
                        Ур. {lvl}: <span className="text-cyan-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasPresets && manifest && (
                <div className="mb-4 p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <Check className="w-4 h-4" />
                    Техники сгенерированы: {manifest.techniques.total} шт.
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Дата: {new Date(manifest.generatedAt).toLocaleString('ru')}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleGenerateTechniques()}
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Сгенерировать все
                </Button>
                
                <Button
                  onClick={() => handleGenerateTechniques(1)}
                  disabled={loading}
                  variant="outline"
                  className="border-slate-600"
                >
                  Только уровень 1
                </Button>
              </div>

              {message && (
                <div className={`mt-3 p-2 rounded flex items-center gap-2 text-sm ${
                  message.type === 'success' 
                    ? 'bg-green-900/30 text-green-400' 
                    : 'bg-red-900/30 text-red-400'
                }`}>
                  {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {message.text}
                </div>
              )}
            </div>

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

          {/* МИР */}
          <TabsContent value="world" className="mt-4 space-y-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-amber-400 mb-3">
                Создание нового мира
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Создание нового мира удалит текущую игру. Все данные будут потеряны.
              </p>
              <Button
                onClick={() => {
                  if (confirm('Вы уверены? Текущий мир будет удалён.')) {
                    localStorage.removeItem('sessionId');
                    window.location.reload();
                  }
                }}
                variant="destructive"
              >
                Создать новый мир
              </Button>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-amber-400 mb-3">
                Текущая сессия
              </h3>
              <div className="text-sm text-slate-400">
                <p>ID сессии: <code className="text-cyan-400">{localStorage.getItem('sessionId') || 'не установлена'}</code></p>
              </div>
            </div>
          </TabsContent>

          {/* СОХРАНЕНИЕ */}
          <TabsContent value="save" className="mt-4 space-y-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-amber-400 mb-3">
                💾 Сохранение и загрузка
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Игра сохраняется автоматически. Здесь можно экспортировать/импортировать сохранение.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="border-slate-600">
                  Экспорт сохранения
                </Button>
                <Button variant="outline" className="border-slate-600">
                  Импорт сохранения
                </Button>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-amber-400 mb-3">
                📊 Статистика базы данных
              </h3>
              <div className="text-sm text-slate-400 space-y-1">
                <p>Размер: <span className="text-white">~4 MB</span> (оценка)</p>
                <p>Персонажей: <span className="text-white">1</span></p>
                <p>Техник: <span className="text-white">~10</span></p>
                <p>Предметов: <span className="text-white">~20</span></p>
              </div>
            </div>
          </TabsContent>

          {/* ОБЪЕКТЫ */}
          <TabsContent value="objects" className="mt-4 space-y-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-amber-400 mb-3">
                📦 Сгенерированные объекты
              </h3>
              
              {hasPresets && manifest ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/50 rounded p-3">
                      <div className="text-2xl font-bold text-cyan-400">
                        {manifest.techniques.total}
                      </div>
                      <div className="text-sm text-slate-400">Техник</div>
                    </div>
                    <div className="bg-slate-700/50 rounded p-3">
                      <div className="text-2xl font-bold text-slate-500">0</div>
                      <div className="text-sm text-slate-400">Предметов</div>
                    </div>
                  </div>

                  <Button
                    onClick={onOpenGeneratedObjects}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Просмотреть объекты
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Нет сгенерированных объектов</p>
                  <p className="text-sm">Перейдите во вкладку "Генератор" для создания</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-slate-600"
          >
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
