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
  Sparkles,
  Package,
  Loader2,
  Check,
  AlertCircle,
  Shield,
  Shirt,
  Users,
  Sword,
  Gem,
  Pill,
  Zap,
  Trash2,
} from 'lucide-react';
import { TechniqueGeneratorPanel } from './TechniqueGeneratorPanel';
import { WeaponGeneratorPanel } from './WeaponGeneratorPanel';
import { ArmorGeneratorPanel } from './ArmorGeneratorPanel';
import { AccessoryGeneratorPanel } from './AccessoryGeneratorPanel';
import { ConsumableGeneratorPanel } from './ConsumableGeneratorPanel';
import { QiStoneGeneratorPanel } from './QiStoneGeneratorPanel';
import { ChargerGeneratorPanel } from './ChargerGeneratorPanel';
import { Rarity, TechniqueType, CombatSubtype } from '@/lib/generator/technique-generator';

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
  formations: {
    total: number;
    byLevel: Record<number, number>;
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
  const [preserveCounters, setPreserveCounters] = useState(true);
  const [formationTypes, setFormationTypes] = useState<string[]>([]);
  const [formationCount, setFormationCount] = useState<string>('50');
  const [formationManifest, setFormationManifest] = useState<{ total: number; byLevel: Record<number, number> } | null>(null);

  useEffect(() => {
    if (open) {
      loadStats();
      checkPresets();
      loadStorageStats();
      loadFormationManifest();
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

  const loadFormationManifest = async () => {
    try {
      const res = await fetch('/api/generator/formations?action=stats');
      const data = await res.json();
      if (data.success) {
        setFormationManifest(data.stats);
      }
    } catch (error) {
      console.error('Failed to load formation stats:', error);
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

  // Функция для сохранения экипировки через API
  const saveItemsToServer = async (
    items: Array<{ id: string; type: string; [key: string]: unknown }>,
    mode: 'replace' | 'append' = 'append'
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/generator/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          items,
          mode,
        }),
      });
      
      const data = await res.json();
      return data.success;
    } catch (error) {
      console.error('Failed to save items:', error);
      return false;
    }
  };

  const handleGenerateTechniques = async (params: {
    type: string;
    level: number;
    rarity?: Rarity;
    count: number;
    damageVariance: { min: number; max: number };
    mode: 'replace' | 'append';
    typeSpecificParams?: Record<string, number>;
    combatSubtype?: CombatSubtype;
    weaponCategory?: string;
    weaponType?: string;
  }) => {
    setLoading(true);
    setMessage(null);
    
    try {
      const options: Record<string, unknown> = {
        mode: params.mode,
        types: [params.type],
        count: params.count,
        damageVariance: params.damageVariance,
      };
      
      if (params.level > 0) {
        options.level = params.level;
      }
      
      if (params.rarity) {
        options.rarity = params.rarity;
      }
      
      if (params.typeSpecificParams) {
        options.typeSpecificParams = params.typeSpecificParams;
      }
      
      // Новые параметры для combat техник
      if (params.combatSubtype) {
        options.combatSubtype = params.combatSubtype;
      }
      
      if (params.weaponCategory) {
        options.weaponCategory = params.weaponCategory;
      }
      
      if (params.weaponType) {
        options.weaponType = params.weaponType;
      }
      
      const res = await fetch('/api/generator/techniques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          mode: params.mode,
          options,
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
          mode: 'append',
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
        await loadFormationManifest();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка генерации формаций' });
    } finally {
      setLoading(false);
    }
  };

  const handleClearFormations = async () => {
    if (!confirm('Удалить все формации?')) return;
    
    setLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/generator/formations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setFormationManifest(null);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка удаления формаций' });
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async (params: {
    scope: 'all' | 'type' | 'subtype';
    targetType?: TechniqueType;
    targetSubtype?: CombatSubtype;
  }) => {
    setLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/generator/techniques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear',
          scope: params.scope,
          targetType: params.targetType,
          targetSubtype: params.targetSubtype,
          preserveCounters,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        if (params.scope === 'all') {
          setManifest(null);
          setHasPresets(false);
        }
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

  const FORMATION_TYPE_NAMES: Record<string, { name: string; color: string }> = {
    defensive: { name: '🛡️ Защитные', color: 'text-blue-400' },
    offensive: { name: '⚔️ Атакующие', color: 'text-red-400' },
    support: { name: '💚 Поддержки', color: 'text-green-400' },
    special: { name: '✨ Специальные', color: 'text-purple-400' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-6xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="text-amber-400 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Создание
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800">
            <TabsTrigger value="generator" className="data-[state=active]:bg-amber-600">
              <Sparkles className="w-4 h-4 mr-1" />
              Техники
            </TabsTrigger>
            <TabsTrigger value="equipment" className="data-[state=active]:bg-amber-600">
              <Shirt className="w-4 h-4 mr-1" />
              Экипировка
            </TabsTrigger>
            <TabsTrigger value="npc" className="data-[state=active]:bg-amber-600">
              <Users className="w-4 h-4 mr-1" />
              NPC
            </TabsTrigger>
            <TabsTrigger value="formations" className="data-[state=active]:bg-amber-600">
              <Shield className="w-4 h-4 mr-1" />
              Формации
            </TabsTrigger>
            <TabsTrigger value="storage" className="data-[state=active]:bg-amber-600">
              <Package className="w-4 h-4 mr-1" />
              Хранилище
            </TabsTrigger>
          </TabsList>

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

            <TechniqueGeneratorPanel 
              onGenerate={handleGenerateTechniques}
              onClear={handleClearAll}
              loading={loading}
            />

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
          </TabsContent>

          {/* ЭКИПИРОВКА - Подвкладки */}
          <TabsContent value="equipment" className="mt-4 space-y-4 overflow-y-auto max-h-[60vh]">
            <Tabs defaultValue="weapon" className="w-full">
              <TabsList className="grid w-full grid-cols-6 bg-slate-800 mb-4">
                <TabsTrigger value="weapon" className="data-[state=active]:bg-amber-600 text-xs">
                  <Sword className="w-4 h-4 mr-1" />
                  Оружие
                </TabsTrigger>
                <TabsTrigger value="armor" className="data-[state=active]:bg-amber-600 text-xs">
                  <Shield className="w-4 h-4 mr-1" />
                  Броня
                </TabsTrigger>
                <TabsTrigger value="accessory" className="data-[state=active]:bg-amber-600 text-xs">
                  <Gem className="w-4 h-4 mr-1" />
                  Аксессуары
                </TabsTrigger>
                <TabsTrigger value="consumable" className="data-[state=active]:bg-amber-600 text-xs">
                  <Pill className="w-4 h-4 mr-1" />
                  Расходники
                </TabsTrigger>
                <TabsTrigger value="qi_stone" className="data-[state=active]:bg-amber-600 text-xs">
                  <Sparkles className="w-4 h-4 mr-1" />
                  Камни Ци
                </TabsTrigger>
                <TabsTrigger value="charger" className="data-[state=active]:bg-amber-600 text-xs">
                  <Zap className="w-4 h-4 mr-1" />
                  Зарядники
                </TabsTrigger>
              </TabsList>

              {/* Оружие */}
              <TabsContent value="weapon">
                <WeaponGeneratorPanel
                  onGenerate={async (params) => {
                    setLoading(true);
                    setMessage(null);
                    try {
                      const res = await fetch('/api/generator/equipment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'generate',
                          type: 'weapon',
                          level: params.level,
                          rarity: params.rarity,
                          category: params.category,
                          weaponType: params.weaponType,
                          count: params.count,
                          mode: params.mode,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setMessage({ type: 'success', text: data.message });
                      } else {
                        setMessage({ type: 'error', text: data.error || data.message });
                      }
                    } catch (error) {
                      setMessage({ type: 'error', text: 'Ошибка генерации оружия' });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onClear={async () => {
                    setLoading(true);
                    try {
                      const res = await fetch('/api/generator/equipment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'clear', type: 'weapon' }),
                      });
                      const data = await res.json();
                      setMessage({ type: 'success', text: data.message });
                    } catch (error) {
                      setMessage({ type: 'error', text: 'Ошибка очистки оружия' });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  loading={loading}
                />
              </TabsContent>

              {/* Броня */}
              <TabsContent value="armor">
                <ArmorGeneratorPanel
                  onGenerate={async (params) => {
                    setLoading(true);
                    setMessage(null);
                    try {
                      const res = await fetch('/api/generator/equipment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'generate',
                          type: 'armor',
                          level: params.level,
                          rarity: params.rarity,
                          count: params.count,
                          mode: params.mode,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setMessage({ type: 'success', text: data.message });
                      } else {
                        setMessage({ type: 'error', text: data.error || data.message });
                      }
                    } catch (error) {
                      setMessage({ type: 'error', text: 'Ошибка генерации брони' });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onClear={async () => {
                    setLoading(true);
                    try {
                      const res = await fetch('/api/generator/equipment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'clear', type: 'armor' }),
                      });
                      const data = await res.json();
                      setMessage({ type: 'success', text: data.message });
                    } catch (error) {
                      setMessage({ type: 'error', text: 'Ошибка очистки брони' });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  loading={loading}
                />
              </TabsContent>

              {/* Аксессуары */}
              <TabsContent value="accessory">
                <AccessoryGeneratorPanel
                  onGenerate={async (accessories) => {
                    setLoading(true);
                    const success = await saveItemsToServer(accessories, 'append');
                    if (success) {
                      setMessage({ type: 'success', text: `Сохранено ${accessories.length} аксессуаров` });
                    } else {
                      setMessage({ type: 'error', text: 'Ошибка сохранения аксессуаров' });
                    }
                    setLoading(false);
                  }}
                  loading={loading}
                />
              </TabsContent>

              {/* Расходники */}
              <TabsContent value="consumable">
                <ConsumableGeneratorPanel
                  onGenerate={async (consumables) => {
                    setLoading(true);
                    const success = await saveItemsToServer(consumables, 'append');
                    if (success) {
                      setMessage({ type: 'success', text: `Сохранено ${consumables.length} расходников` });
                    } else {
                      setMessage({ type: 'error', text: 'Ошибка сохранения расходников' });
                    }
                    setLoading(false);
                  }}
                  loading={loading}
                />
              </TabsContent>

              {/* Камни Ци */}
              <TabsContent value="qi_stone">
                <QiStoneGeneratorPanel
                  onGenerate={async (stones) => {
                    setLoading(true);
                    const success = await saveItemsToServer(stones, 'append');
                    if (success) {
                      setMessage({ type: 'success', text: `Сохранено ${stones.length} камней Ци` });
                    } else {
                      setMessage({ type: 'error', text: 'Ошибка сохранения камней Ци' });
                    }
                    setLoading(false);
                  }}
                  loading={loading}
                />
              </TabsContent>

              {/* Зарядники */}
              <TabsContent value="charger">
                <ChargerGeneratorPanel
                  onGenerate={async (chargers) => {
                    setLoading(true);
                    const success = await saveItemsToServer(chargers, 'append');
                    if (success) {
                      setMessage({ type: 'success', text: `Сохранено ${chargers.length} зарядников` });
                    } else {
                      setMessage({ type: 'error', text: 'Ошибка сохранения зарядников' });
                    }
                    setLoading(false);
                  }}
                  loading={loading}
                />
              </TabsContent>
            </Tabs>

            {message && activeTab === 'equipment' && (
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
          </TabsContent>

          {/* NPC И МОБЫ */}
          <TabsContent value="npc" className="mt-4 space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-amber-400 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Генератор NPC и монстров
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Создание NPC, врагов, боссов и других существ для мира игры.
              </p>
              <div className="bg-slate-700/30 rounded-lg p-4 text-center">
                <p className="text-slate-400">🚧 В разработке</p>
                <p className="text-sm text-slate-500 mt-2">Будет реализовано в следующем обновлении</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="formations" className="mt-4 space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-amber-400 mb-3">
                🛡️ Генератор формаций
              </h3>

              {formationManifest && formationManifest.total > 0 && (
                <div className="mb-4 p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <Check className="w-4 h-4" />
                    Формаций в базе: {formationManifest.total} шт.
                  </div>
                </div>
              )}

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

              <div className="flex gap-2">
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
                
                {formationManifest && formationManifest.total > 0 && (
                  <Button
                    onClick={handleClearFormations}
                    disabled={loading}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Очистить формации
                  </Button>
                )}
              </div>
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
