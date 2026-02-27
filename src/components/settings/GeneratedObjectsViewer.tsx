'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X,
  Search,
  Filter,
  Sword,
  Flame,
  Droplet,
  Mountain,
  Wind,
  Zap,
  Eye,
  Shield,
  Heart,
  Sparkles,
} from 'lucide-react';

interface GeneratedObjectsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  combat: '⚔️ Боевая',
  cultivation: '🧘 Культивация',
  support: '🛡️ Поддержка',
  movement: '🏃 Перемещение',
  sensory: '👁️ Восприятие',
  healing: '💚 Исцеление',
};

const RARITY_COLORS: Record<string, string> = {
  common: 'text-slate-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  legendary: 'text-amber-400',
};

export function GeneratedObjectsViewer({ open, onOpenChange }: GeneratedObjectsViewerProps) {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [filteredTechniques, setFilteredTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  
  // Фильтры
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [elementFilter, setElementFilter] = useState<string>('all');

  useEffect(() => {
    if (open) {
      loadTechniques();
    }
  }, [open]);

  useEffect(() => {
    applyFilters();
  }, [techniques, search, levelFilter, typeFilter, elementFilter]);

  const loadTechniques = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generator/techniques?action=list');
      const data = await res.json();
      if (data.success) {
        setTechniques(data.techniques);
      }
    } catch (error) {
      console.error('Failed to load techniques:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...techniques];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.nameEn.toLowerCase().includes(searchLower)
      );
    }
    
    if (levelFilter !== 'all') {
      filtered = filtered.filter(t => t.level === parseInt(levelFilter));
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }
    
    if (elementFilter !== 'all') {
      filtered = filtered.filter(t => t.element === elementFilter);
    }
    
    setFilteredTechniques(filtered);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-amber-400">
            📦 Сгенерированные объекты
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[70vh]">
          {/* Список */}
          <div className="w-1/2 flex flex-col">
            {/* Фильтры */}
            <div className="mb-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по названию..."
                  className="pl-8 bg-slate-800 border-slate-600"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-24 bg-slate-800 border-slate-600 text-xs">
                    <SelectValue placeholder="Уровень" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все уровни</SelectItem>
                    {Array.from({ length: 9 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        Ур. {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-xs">
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="combat">⚔️ Боевая</SelectItem>
                    <SelectItem value="cultivation">🧘 Культивация</SelectItem>
                    <SelectItem value="support">🛡️ Поддержка</SelectItem>
                    <SelectItem value="movement">🏃 Перемещение</SelectItem>
                    <SelectItem value="sensory">👁️ Восприятие</SelectItem>
                    <SelectItem value="healing">💚 Исцеление</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={elementFilter} onValueChange={setElementFilter}>
                  <SelectTrigger className="w-28 bg-slate-800 border-slate-600 text-xs">
                    <SelectValue placeholder="Элемент" />
                  </SelectTrigger>
                  <SelectContent>
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
            <div className="text-xs text-slate-400 mb-2">
              Найдено: {filteredTechniques.length} из {techniques.length}
            </div>

            <ScrollArea className="flex-1 border border-slate-700 rounded-lg">
              {loading ? (
                <div className="p-4 text-center text-slate-400">Загрузка...</div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {filteredTechniques.slice(0, 200).map((tech) => (
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
                          <span className="text-sm font-medium">{tech.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs border-slate-600">
                            Ур. {tech.level}
                          </Badge>
                          <span className={`text-xs ${RARITY_COLORS[tech.rarity]}`}>
                            {tech.rarity === 'legendary' ? '★' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {TYPE_NAMES[tech.type]}
                        {tech.computed.finalDamage > 0 && ` • Урон: ${tech.computed.finalDamage}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Детали */}
          <div className="w-1/2 bg-slate-800/30 rounded-lg p-4">
            {selectedTechnique ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {ELEMENT_ICONS[selectedTechnique.element]}
                    <h3 className="text-xl font-bold">{selectedTechnique.name}</h3>
                  </div>
                  <p className="text-sm text-slate-400">{selectedTechnique.nameEn}</p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="border-slate-600">
                    {TYPE_NAMES[selectedTechnique.type]}
                  </Badge>
                  <Badge variant="outline" className="border-slate-600">
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

                {/* Параметры */}
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
                      <span className="text-slate-500 text-xs">{selectedTechnique.id}</span>
                    </div>
                  </div>
                </div>

                {/* Эффекты */}
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
      </DialogContent>
    </Dialog>
  );
}
