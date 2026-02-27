'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Sword,
  Flame,
  Droplet,
  Mountain,
  Wind,
  Zap,
  Eye,
  Sparkles,
  Package,
  Loader2,
  Shield,
  Users,
} from 'lucide-react';

interface GeneratedObjectsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ==================== ТЕХНИКИ ====================

interface Technique {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type: string;
  combatType?: string;
  element: string;
  level: number;
  rarity: string;
  computed: {
    finalDamage: number;
    finalQiCost: number;
    finalRange: number;
    activeEffects: { type: string; value: number }[];
  };
}

// ==================== ФОРМАЦИИ ====================

interface Formation {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type: 'defensive' | 'offensive' | 'support' | 'special';
  shape: string;
  level: number;
  rarity: string;
  positions: Array<{
    x: number;
    y: number;
    role: 'leader' | 'core' | 'support' | 'auxiliary';
  }>;
  effects: {
    damageReduction?: number;
    damageSharing?: number;
    shieldHP?: number;
    damageBonus?: number;
    critChance?: number;
    attackSpeed?: number;
    qiRegen?: number;
    hpRegen?: number;
    fatigueReduction?: number;
    range?: number;
    duration?: number;
  };
  requirements: {
    minParticipants: number;
    maxParticipants: number;
    minCultivationLevel: number;
  };
  qiCostPerMinute: number;
  setupTime: number;
}

const ELEMENT_ICONS: Record<string, React.ReactNode> = {
  fire: <Flame className="w-4 h-4 text-orange-400" />,
  water: <Droplet className="w-4 h-4 text-blue-400" />,
  earth: <Mountain className="w-4 h-4 text-amber-600" />,
  air: <Wind className="w-4 h-4 text-cyan-300" />,
  lightning: <Zap className="w-4 h-4 text-yellow-400" />,
  void: <Eye className="w-4 h-4 text-purple-400" />,
  neutral: <Sparkles className="w-4 h-4 text-gray-400" />,
};

const TYPE_NAMES: Record<string, string> = {
  combat: '⚔️ Атакующая',
  defense: '🛡️ Защитная',
  cultivation: '🧘 Культивация',
  support: '✨ Поддержка',
  movement: '🏃 Перемещение',
  sensory: '👁️ Восприятие',
  healing: '💚 Исцеление',
  curse: '💀 Проклятие',
  poison: '☠️ Отравление',
};

const FORMATION_TYPE_NAMES: Record<string, string> = {
  defensive: '🛡️ Защитная',
  offensive: '⚔️ Атакующая',
  support: '💚 Поддержка',
  special: '✨ Специальная',
};

const RARITY_COLORS: Record<string, string> = {
  common: 'text-slate-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  legendary: 'text-amber-400',
};

export function GeneratedObjectsViewer({ open, onOpenChange }: GeneratedObjectsViewerProps) {
  // Техники
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [filteredTechniques, setFilteredTechniques] = useState<Technique[]>([]);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  
  // Формации
  const [formations, setFormations] = useState<Formation[]>([]);
  const [filteredFormations, setFilteredFormations] = useState<Formation[]>([]);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  
  // Общее
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState<'none' | 'techniques' | 'formations' | 'both'>('none');
  const [activeTab, setActiveTab] = useState<'techniques' | 'formations'>('techniques');
  
  // Фильтры техник
  const [techSearch, setTechSearch] = useState('');
  const [techLevelFilter, setTechLevelFilter] = useState<string>('all');
  const [techTypeFilter, setTechTypeFilter] = useState<string>('all');
  const [techElementFilter, setTechElementFilter] = useState<string>('all');
  
  // Фильтры формаций
  const [formSearch, setFormSearch] = useState('');
  const [formLevelFilter, setFormLevelFilter] = useState<string>('all');
  const [formTypeFilter, setFormTypeFilter] = useState<string>('all');

  // Применяем фильтры техник
  useEffect(() => {
    if (techniques.length === 0) return;
    
    let filtered = [...techniques];
    
    if (techSearch) {
      const searchLower = techSearch.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.nameEn.toLowerCase().includes(searchLower) ||
        t.id.toLowerCase().includes(searchLower)
      );
    }
    
    if (techLevelFilter !== 'all') {
      filtered = filtered.filter(t => t.level === parseInt(techLevelFilter));
    }
    
    if (techTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === techTypeFilter);
    }
    
    if (techElementFilter !== 'all') {
      filtered = filtered.filter(t => t.element === techElementFilter);
    }
    
    setFilteredTechniques(filtered);
  }, [techniques, techSearch, techLevelFilter, techTypeFilter, techElementFilter]);

  // Применяем фильтры формаций
  useEffect(() => {
    if (formations.length === 0) return;
    
    let filtered = [...formations];
    
    if (formSearch) {
      const searchLower = formSearch.toLowerCase();
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(searchLower) ||
        f.id.toLowerCase().includes(searchLower)
      );
    }
    
    if (formLevelFilter !== 'all') {
      filtered = filtered.filter(f => f.level === parseInt(formLevelFilter));
    }
    
    if (formTypeFilter !== 'all') {
      filtered = filtered.filter(f => f.type === formTypeFilter);
    }
    
    setFilteredFormations(filtered);
  }, [formations, formSearch, formLevelFilter, formTypeFilter]);

  const loadTechniques = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generator/techniques?action=list');
      const data = await res.json();
      if (data.success) {
        setTechniques(data.techniques);
        setLoaded(prev => prev === 'formations' || prev === 'both' ? 'both' : 'techniques');
      }
    } catch (error) {
      console.error('Failed to load techniques:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFormations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generator/formations?action=list');
      const data = await res.json();
      if (data.success) {
        setFormations(data.formations);
        setLoaded(prev => prev === 'techniques' || prev === 'both' ? 'both' : 'formations');
      }
    } catch (error) {
      console.error('Failed to load formations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [techRes, formRes] = await Promise.all([
        fetch('/api/generator/techniques?action=list'),
        fetch('/api/generator/formations?action=list'),
      ]);
      
      const techData = await techRes.json();
      const formData = await formRes.json();
      
      if (techData.success) setTechniques(techData.techniques);
      if (formData.success) setFormations(formData.formations);
      
      setLoaded('both');
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-amber-400">
            📦 Сгенерированные объекты
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'techniques' | 'formations')} className="w-full">
          <div className="flex items-center justify-between mb-3">
            <TabsList className="bg-slate-800">
              <TabsTrigger value="techniques" className="text-xs">
                ⚔️ Техники ({loaded !== 'none' ? techniques.length : '-'})
              </TabsTrigger>
              <TabsTrigger value="formations" className="text-xs">
                🛡️ Формации ({loaded !== 'none' ? formations.length : '-'})
              </TabsTrigger>
            </TabsList>
            
            <Button
              onClick={loadAll}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Package className="w-4 h-4" />
              )}
              {loaded !== 'none' ? 'Обновить' : 'Загрузить всё'}
            </Button>
          </div>

          {/* ==================== ТЕХНИКИ ==================== */}
          <TabsContent value="techniques" className="mt-0">
            <div className="flex gap-4 h-[60vh]">
              {/* Список */}
              <div className="w-1/2 flex flex-col">
                {/* Фильтры */}
                <div className="mb-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                      <Input
                        value={techSearch}
                        onChange={(e) => setTechSearch(e.target.value)}
                        placeholder="Поиск по названию или ID..."
                        className="pl-8 bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={techLevelFilter} onValueChange={setTechLevelFilter}>
                      <SelectTrigger className="w-24 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue placeholder="Уровень" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Все уровни</SelectItem>
                        {Array.from({ length: 9 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            Ур. {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={techTypeFilter} onValueChange={setTechTypeFilter}>
                      <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue placeholder="Тип" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Все типы</SelectItem>
                        <SelectItem value="combat">⚔️ Атакующая</SelectItem>
                        <SelectItem value="defense">🛡️ Защитная</SelectItem>
                        <SelectItem value="cultivation">🧘 Культивация</SelectItem>
                        <SelectItem value="support">✨ Поддержка</SelectItem>
                        <SelectItem value="movement">🏃 Перемещение</SelectItem>
                        <SelectItem value="sensory">👁️ Восприятие</SelectItem>
                        <SelectItem value="healing">💚 Исцеление</SelectItem>
                        <SelectItem value="curse">💀 Проклятие</SelectItem>
                        <SelectItem value="poison">☠️ Отравление</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={techElementFilter} onValueChange={setTechElementFilter}>
                      <SelectTrigger className="w-28 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue placeholder="Элемент" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="fire">🔥 Огонь</SelectItem>
                        <SelectItem value="water">💧 Вода</SelectItem>
                        <SelectItem value="earth">🪨 Земля</SelectItem>
                        <SelectItem value="air">💨 Воздух</SelectItem>
                        <SelectItem value="lightning">⚡ Молния</SelectItem>
                        <SelectItem value="void">🌑 Пустота</SelectItem>
                        <SelectItem value="neutral">⚪ Нейтральный</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Результаты */}
                {techniques.length > 0 ? (
                  <>
                    <div className="text-xs text-slate-400 mb-2">
                      Найдено: {filteredTechniques.length} из {techniques.length}
                    </div>

                    <ScrollArea className="flex-1 border border-slate-700 rounded-lg">
                      {loading ? (
                        <div className="p-4 text-center text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Загрузка...
                        </div>
                      ) : filteredTechniques.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                          Нет объектов, соответствующих фильтрам
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-700">
                          {filteredTechniques.slice(0, 500).map((tech) => (
                            <div
                              key={tech.id}
                              onClick={() => setSelectedTechnique(tech)}
                              className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                                selectedTechnique?.id === tech.id ? 'bg-amber-900/20 border-l-2 border-amber-500' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {ELEMENT_ICONS[tech.element]}
                                  <span className="text-sm font-medium text-white">{tech.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs border-slate-500 text-white">
                                    Ур. {tech.level}
                                  </Badge>
                                  <span className={`text-xs ${RARITY_COLORS[tech.rarity]}`}>
                                    {tech.rarity === 'legendary' ? '★' : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {TYPE_NAMES[tech.type]} • {tech.id}
                                {tech.computed.finalDamage > 0 && ` • Урон: ${tech.computed.finalDamage}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border border-slate-700 rounded-lg">
                    <Sword className="w-16 h-16 text-slate-600 mb-4" />
                    <p className="text-slate-400 mb-2 text-center">
                      Нажмите "Загрузить всё" для отображения данных
                    </p>
                    <p className="text-xs text-slate-500 text-center">
                      Или сгенерируйте техники в Настройках → Генератор
                    </p>
                  </div>
                )}
              </div>

              {/* Детали техники */}
              <div className="w-1/2 bg-slate-800/30 rounded-lg p-4">
                {selectedTechnique ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {ELEMENT_ICONS[selectedTechnique.element]}
                        <h3 className="text-xl font-bold text-white">{selectedTechnique.name}</h3>
                      </div>
                      <p className="text-sm text-slate-400">{selectedTechnique.nameEn}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="border-slate-500 text-white">
                        {TYPE_NAMES[selectedTechnique.type]}
                      </Badge>
                      <Badge variant="outline" className="border-slate-500 text-white">
                        Уровень {selectedTechnique.level}
                      </Badge>
                      <Badge className={`
                        ${selectedTechnique.rarity === 'common' ? 'bg-slate-600' : ''}
                        ${selectedTechnique.rarity === 'uncommon' ? 'bg-green-600' : ''}
                        ${selectedTechnique.rarity === 'rare' ? 'bg-blue-600' : ''}
                        ${selectedTechnique.rarity === 'legendary' ? 'bg-amber-600' : ''}
                      `}>
                        {selectedTechnique.rarity}
                      </Badge>
                    </div>

                    <p className="text-sm text-slate-300">{selectedTechnique.description}</p>

                    <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                      <h4 className="text-sm font-medium text-amber-400">Параметры</h4>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Урон:</span>
                          <span className="text-red-400">{selectedTechnique.computed.finalDamage}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ци:</span>
                          <span className="text-cyan-400">{selectedTechnique.computed.finalQiCost}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Дальность:</span>
                          <span className="text-green-400">{selectedTechnique.computed.finalRange} м</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">ID:</span>
                          <span className="text-slate-300 text-xs">{selectedTechnique.id}</span>
                        </div>
                      </div>
                    </div>

                    {selectedTechnique.computed.activeEffects.length > 0 && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Активные эффекты</h4>
                        <div className="space-y-1">
                          {selectedTechnique.computed.activeEffects.map((effect, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="border-purple-500 text-purple-400">
                                {effect.type}
                              </Badge>
                              <span className="text-white">{effect.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Sword className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Выберите технику для просмотра</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ==================== ФОРМАЦИИ ==================== */}
          <TabsContent value="formations" className="mt-0">
            <div className="flex gap-4 h-[60vh]">
              {/* Список */}
              <div className="w-1/2 flex flex-col">
                {/* Фильтры */}
                <div className="mb-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                      <Input
                        value={formSearch}
                        onChange={(e) => setFormSearch(e.target.value)}
                        placeholder="Поиск по названию или ID..."
                        className="pl-8 bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={formLevelFilter} onValueChange={setFormLevelFilter}>
                      <SelectTrigger className="w-24 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue placeholder="Уровень" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Все уровни</SelectItem>
                        {Array.from({ length: 9 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            Ур. {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
                      <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue placeholder="Тип" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Все типы</SelectItem>
                        <SelectItem value="defensive">🛡️ Защитная</SelectItem>
                        <SelectItem value="offensive">⚔️ Атакующая</SelectItem>
                        <SelectItem value="support">💚 Поддержка</SelectItem>
                        <SelectItem value="special">✨ Специальная</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Результаты */}
                {formations.length > 0 ? (
                  <>
                    <div className="text-xs text-slate-400 mb-2">
                      Найдено: {filteredFormations.length} из {formations.length}
                    </div>

                    <ScrollArea className="flex-1 border border-slate-700 rounded-lg">
                      {loading ? (
                        <div className="p-4 text-center text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Загрузка...
                        </div>
                      ) : filteredFormations.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                          Нет объектов, соответствующих фильтрам
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-700">
                          {filteredFormations.slice(0, 500).map((form) => (
                            <div
                              key={form.id}
                              onClick={() => setSelectedFormation(form)}
                              className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                                selectedFormation?.id === form.id ? 'bg-amber-900/20 border-l-2 border-amber-500' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-amber-400" />
                                  <span className="text-sm font-medium text-white">{form.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs border-slate-500 text-white">
                                    Ур. {form.level}
                                  </Badge>
                                  <span className={`text-xs ${RARITY_COLORS[form.rarity]}`}>
                                    {form.rarity === 'legendary' ? '★' : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {FORMATION_TYPE_NAMES[form.type]} • {form.id} • {form.requirements.minParticipants}-{form.requirements.maxParticipants} участников
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border border-slate-700 rounded-lg">
                    <Users className="w-16 h-16 text-slate-600 mb-4" />
                    <p className="text-slate-400 mb-2 text-center">
                      Нажмите "Загрузить всё" для отображения данных
                    </p>
                    <p className="text-xs text-slate-500 text-center">
                      Или сгенерируйте формации в Настройках → Формации
                    </p>
                  </div>
                )}
              </div>

              {/* Детали формации */}
              <div className="w-1/2 bg-slate-800/30 rounded-lg p-4">
                {selectedFormation ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-5 h-5 text-amber-400" />
                        <h3 className="text-xl font-bold text-white">{selectedFormation.name}</h3>
                      </div>
                      <p className="text-sm text-slate-400">{selectedFormation.id}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="border-slate-500 text-white">
                        {FORMATION_TYPE_NAMES[selectedFormation.type]}
                      </Badge>
                      <Badge variant="outline" className="border-slate-500 text-white">
                        Уровень {selectedFormation.level}
                      </Badge>
                      <Badge variant="outline" className="border-slate-500 text-white">
                        Форма: {selectedFormation.shape}
                      </Badge>
                      <Badge className={`
                        ${selectedFormation.rarity === 'common' ? 'bg-slate-600' : ''}
                        ${selectedFormation.rarity === 'uncommon' ? 'bg-green-600' : ''}
                        ${selectedFormation.rarity === 'rare' ? 'bg-blue-600' : ''}
                        ${selectedFormation.rarity === 'legendary' ? 'bg-amber-600' : ''}
                      `}>
                        {selectedFormation.rarity}
                      </Badge>
                    </div>

                    <p className="text-sm text-slate-300">{selectedFormation.description}</p>

                    {/* Требования */}
                    <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                      <h4 className="text-sm font-medium text-amber-400">Требования</h4>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Участников:</span>
                          <span className="text-white">{selectedFormation.requirements.minParticipants}-{selectedFormation.requirements.maxParticipants}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Мин. ур. культивации:</span>
                          <span className="text-white">{selectedFormation.requirements.minCultivationLevel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ци/мин:</span>
                          <span className="text-cyan-400">{selectedFormation.qiCostPerMinute}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Время установки:</span>
                          <span className="text-white">{selectedFormation.setupTime} мин</span>
                        </div>
                      </div>
                    </div>

                    {/* Эффекты */}
                    <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                      <h4 className="text-sm font-medium text-amber-400">Эффекты</h4>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {selectedFormation.effects.damageReduction && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Снижение урона:</span>
                            <span className="text-green-400">{selectedFormation.effects.damageReduction}%</span>
                          </div>
                        )}
                        {selectedFormation.effects.damageBonus && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Бонус урона:</span>
                            <span className="text-red-400">{selectedFormation.effects.damageBonus}%</span>
                          </div>
                        )}
                        {selectedFormation.effects.shieldHP && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Щит:</span>
                            <span className="text-blue-400">{selectedFormation.effects.shieldHP} HP</span>
                          </div>
                        )}
                        {selectedFormation.effects.critChance && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Шанс крита:</span>
                            <span className="text-yellow-400">{selectedFormation.effects.critChance}%</span>
                          </div>
                        )}
                        {selectedFormation.effects.qiRegen && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Реген Ци:</span>
                            <span className="text-cyan-400">{selectedFormation.effects.qiRegen}/мин</span>
                          </div>
                        )}
                        {selectedFormation.effects.hpRegen && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Реген HP:</span>
                            <span className="text-green-400">{selectedFormation.effects.hpRegen}/мин</span>
                          </div>
                        )}
                        {selectedFormation.effects.range && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Радиус:</span>
                            <span className="text-purple-400">{selectedFormation.effects.range} м</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Позиции */}
                    <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                      <h4 className="text-sm font-medium text-amber-400">Позиции ({selectedFormation.positions.length})</h4>
                      
                      <div className="flex flex-wrap gap-1">
                        {selectedFormation.positions.map((pos, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className={`
                              ${pos.role === 'leader' ? 'border-amber-500 text-amber-400' : ''}
                              ${pos.role === 'core' ? 'border-blue-500 text-blue-400' : ''}
                              ${pos.role === 'support' ? 'border-green-500 text-green-400' : ''}
                              ${pos.role === 'auxiliary' ? 'border-slate-500 text-slate-400' : ''}
                            `}
                          >
                            {pos.role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Выберите формацию для просмотра</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
