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
  Loader2,
  Users,
  User,
  Dog,
  Ghost,
  Sparkle,
  Flame,
  Sword,
  Shield,
  Sparkles,
  Package,
  X,
} from 'lucide-react';

// ==================== NPC INTERFACE ====================

interface GeneratedNPC {
  id: string;
  name: string;
  title?: string;
  age: number;
  gender: 'male' | 'female' | 'none';
  
  speciesId: string;
  roleId: string;
  
  stats: {
    strength: number;
    agility: number;
    intelligence: number;
    vitality: number;
  };
  
  cultivation: {
    level: number;
    subLevel: number;
    coreCapacity: number;
    currentQi: number;
    coreQuality: number;
  };
  
  bodyState?: {
    parts: Record<string, {
      functionalHP: number;
      maxFunctionalHP: number;
      status: string;
    }>;
    isDead: boolean;
  };
  
  personality: {
    traits: string[];
    motivation: string;
    dominantEmotion: string;
    disposition: number;
  };
  
  techniques: string[];
  equipment: Record<string, string | null>;
  inventory: Array<{ id: string; quantity: number }>;
  
  resources: {
    spiritStones: number;
    contributionPoints: number;
  };
  
  generationMeta?: {
    seed: number;
    generatedAt: string;
    version: string;
  };
}

// ==================== ITEM INTERFACE ====================

interface ItemDetails {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  type: string;
  category: string;
  rarity: string;
  icon: string;
  stats?: {
    damage?: number;
    defense?: number;
    qiBonus?: number;
    healthBonus?: number;
    fatigueReduction?: number;
  };
  effects?: Array<{ type: string; value: number; duration?: number }>;
  requirements?: {
    level?: number;
    strength?: number;
    agility?: number;
    intelligence?: number;
  };
}

// ==================== CONSTANTS ====================

const SPECIES_TYPE_NAMES: Record<string, string> = {
  humanoid: '👤 Гуманоид',
  beast: '🐺 Зверь',
  spirit: '👻 Дух',
  hybrid: '🧬 Гибрид',
  aberration: '👁️ Аберрация',
};

const ROLE_TYPE_NAMES: Record<string, string> = {
  sect: '🏛️ Секта',
  profession: '⚒️ Профессия',
  social: '👥 Социальная',
  combat: '⚔️ Боевая',
};

const SPECIES_ICONS: Record<string, React.ReactNode> = {
  humanoid: <User className="w-4 h-4 text-blue-400" />,
  beast: <Dog className="w-4 h-4 text-orange-400" />,
  spirit: <Ghost className="w-4 h-4 text-purple-400" />,
  hybrid: <Sparkle className="w-4 h-4 text-green-400" />,
  aberration: <Flame className="w-4 h-4 text-red-400" />,
};

const RARITY_COLORS: Record<string, string> = {
  common: 'text-slate-400 border-slate-500',
  uncommon: 'text-green-400 border-green-500',
  rare: 'text-blue-400 border-blue-500',
  epic: 'text-purple-400 border-purple-500',
  legendary: 'text-amber-400 border-amber-500',
  mythic: 'text-red-400 border-red-500',
};

const RARITY_BG: Record<string, string> = {
  common: 'bg-slate-600',
  uncommon: 'bg-green-600',
  rare: 'bg-blue-600',
  epic: 'bg-purple-600',
  legendary: 'bg-amber-600',
  mythic: 'bg-red-600',
};

// ==================== MAIN COMPONENT ====================

interface NPCViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NPCViewerDialog({ open, onOpenChange }: NPCViewerDialogProps) {
  // NPC Data
  const [npcs, setNpcs] = useState<GeneratedNPC[]>([]);
  const [selectedNPC, setSelectedNPC] = useState<GeneratedNPC | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  
  // Item popup
  const [itemPopup, setItemPopup] = useState<ItemDetails | null>(null);
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'stats' | 'equipment' | 'techniques'>('stats');

  // Load NPCs on open
  useEffect(() => {
    if (open && npcs.length === 0) {
      loadNPCs();
    }
  }, [open]);

  const loadNPCs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generator/npc?action=list');
      const data = await res.json();
      if (data.success) {
        setNpcs(data.npcs);
        if (data.npcs.length > 0 && !selectedNPC) {
          setSelectedNPC(data.npcs[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load NPCs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get species type by ID
  const getSpeciesType = (speciesId: string): string => {
    if (['human', 'elf', 'demon_humanoid', 'giant', 'beastkin'].includes(speciesId)) return 'humanoid';
    if (['wolf', 'tiger', 'bear', 'snake', 'lizard', 'eagle', 'hawk', 'dragon_beast', 'phoenix'].includes(speciesId)) return 'beast';
    if (['fire_elemental', 'water_elemental', 'wind_elemental', 'ghost', 'celestial_spirit'].includes(speciesId)) return 'spirit';
    if (['centaur', 'mermaid', 'werewolf', 'harpy', 'lamia'].includes(speciesId)) return 'hybrid';
    if (['chaos_spawn', 'cthonian', 'mutant'].includes(speciesId)) return 'aberration';
    return 'humanoid';
  };

  // Get role type by ID
  const getRoleType = (roleId: string): string => {
    const sectRoles = ['candidate', 'outer_disciple', 'inner_disciple', 'core_member', 'elder', 'sect_master', 'instructor', 'sect_alchemist', 'sect_guard', 'servant'];
    const professionRoles = ['merchant', 'alchemist', 'blacksmith', 'healer', 'scholar', 'hunter', 'farmer', 'innkeeper'];
    const socialRoles = ['noble', 'beggar', 'traveler', 'hermit', 'refugee', 'criminal'];
    const combatRoles = ['guard_combat', 'bandit', 'mercenary', 'assassin', 'cultist', 'warrior'];
    
    if (sectRoles.includes(roleId)) return 'sect';
    if (professionRoles.includes(roleId)) return 'profession';
    if (socialRoles.includes(roleId)) return 'social';
    if (combatRoles.includes(roleId)) return 'combat';
    return 'sect';
  };

  // Filter NPCs
  const filteredNPCs = npcs.filter(npc => {
    if (search) {
      const searchLower = search.toLowerCase();
      if (!npc.name.toLowerCase().includes(searchLower) &&
          !npc.id.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (levelFilter !== 'all' && npc.cultivation.level !== parseInt(levelFilter)) return false;
    if (speciesFilter !== 'all' && getSpeciesType(npc.speciesId) !== speciesFilter) return false;
    return true;
  });

  // Load item details
  const loadItemDetails = async (itemId: string): Promise<ItemDetails | null> => {
    try {
      const res = await fetch(`/api/generator/items?action=list&type=all`);
      const data = await res.json();
      if (data.success) {
        const item = data.items.find((i: ItemDetails) => i.id === itemId);
        return item || null;
      }
    } catch (error) {
      console.error('Failed to load item:', error);
    }
    return null;
  };

  // Handle item click
  const handleItemClick = async (itemId: string) => {
    const item = await loadItemDetails(itemId);
    if (item) {
      setItemPopup(item);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Просмотр NPC</DialogTitle>
        </DialogHeader>
        
        <div className="flex h-[80vh]">
          {/* Left: NPC List */}
          <div className="w-1/3 border-r border-slate-700 flex flex-col">
            {/* Header */}
            <div className="p-3 border-b border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-amber-400">NPC</h2>
                <Badge variant="outline" className="border-slate-600 text-slate-300">
                  {npcs.length}
                </Badge>
              </div>
              
              {/* Search */}
              <div className="relative mb-2">
                <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="pl-8 bg-slate-800 border-slate-600 text-white h-8 text-sm"
                />
              </div>
              
              {/* Filters */}
              <div className="flex gap-2">
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-20 bg-slate-800 border-slate-600 text-xs h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700">
                    <SelectItem value="all">Ур. all</SelectItem>
                    {Array.from({ length: 9 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>Ур. {i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
                  <SelectTrigger className="w-28 bg-slate-800 border-slate-600 text-xs h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700">
                    <SelectItem value="all">Все виды</SelectItem>
                    <SelectItem value="humanoid">👤 Гуманоид</SelectItem>
                    <SelectItem value="beast">🐺 Зверь</SelectItem>
                    <SelectItem value="spirit">👻 Дух</SelectItem>
                    <SelectItem value="hybrid">🧬 Гибрид</SelectItem>
                    <SelectItem value="aberration">👁️ Аберр.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* NPC List */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400" />
                </div>
              ) : filteredNPCs.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  NPC не найдены
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {filteredNPCs.map((npc) => (
                    <div
                      key={npc.id}
                      onClick={() => setSelectedNPC(npc)}
                      className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                        selectedNPC?.id === npc.id ? 'bg-amber-900/20 border-l-2 border-amber-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {SPECIES_ICONS[getSpeciesType(npc.speciesId)]}
                        <span className="text-sm font-medium text-white truncate">{npc.name}</span>
                        <span className="text-xs text-slate-400">
                          {npc.gender === 'male' ? '♂' : npc.gender === 'female' ? '♀' : '○'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Ур. {npc.cultivation.level} • {npc.speciesId}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          
          {/* Right: NPC Details */}
          <div className="flex-1 flex flex-col">
            {selectedNPC ? (
              <>
                {/* NPC Header */}
                <div className="p-4 border-b border-slate-700">
                  <div className="flex items-center gap-3">
                    {SPECIES_ICONS[getSpeciesType(selectedNPC.speciesId)]}
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedNPC.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="border-slate-500 text-xs">
                          {SPECIES_TYPE_NAMES[getSpeciesType(selectedNPC.speciesId)]}
                        </Badge>
                        <Badge variant="outline" className="border-slate-500 text-xs">
                          {selectedNPC.roleId}
                        </Badge>
                        <Badge className="bg-amber-600 text-xs">
                          Ур. {selectedNPC.cultivation.level}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'stats' | 'equipment' | 'techniques')} className="flex-1 flex flex-col">
                  <TabsList className="bg-slate-800 mx-4 mt-2">
                    <TabsTrigger value="stats" className="text-xs">📊 Характеристики</TabsTrigger>
                    <TabsTrigger value="equipment" className="text-xs">🛡️ Экипировка</TabsTrigger>
                    <TabsTrigger value="techniques" className="text-xs">⚔️ Техники</TabsTrigger>
                  </TabsList>
                  
                  <ScrollArea className="flex-1 p-4">
                    {/* Stats Tab */}
                    <TabsContent value="stats" className="mt-0 space-y-4">
                      {/* Basic Info */}
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Основное</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Пол:</span>
                            <span>{selectedNPC.gender === 'male' ? '♂ Мужчина' : selectedNPC.gender === 'female' ? '♀ Женщина' : '⚪ Неизвестно'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Возраст:</span>
                            <span>{selectedNPC.age} лет</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Характеристики</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">💪 Сила:</span>
                            <span className="text-red-400 font-bold">{selectedNPC.stats.strength}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">🏃 Ловкость:</span>
                            <span className="text-green-400 font-bold">{selectedNPC.stats.agility}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">🧠 Интеллект:</span>
                            <span className="text-blue-400 font-bold">{selectedNPC.stats.intelligence}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">❤️ Живучесть:</span>
                            <span className="text-amber-400 font-bold">{selectedNPC.stats.vitality}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Cultivation */}
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Культивация</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">Уровень:</span>
                            <Badge className="bg-amber-600">{selectedNPC.cultivation.level}.{selectedNPC.cultivation.subLevel}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">Ци:</span>
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-cyan-500"
                                style={{ width: `${(selectedNPC.cultivation.currentQi / selectedNPC.cultivation.coreCapacity) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-cyan-400">{selectedNPC.cultivation.currentQi}/{selectedNPC.cultivation.coreCapacity}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Качество ядра:</span>
                            <span className="text-purple-400">{selectedNPC.cultivation.coreQuality}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Personality */}
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Личность</h4>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {selectedNPC.personality.traits.map((trait, i) => (
                              <Badge key={i} variant="outline" className="border-purple-500 text-purple-400 text-xs">
                                {trait}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-sm">
                            <span className="text-slate-400">Мотивация:</span> <span className="text-white">{selectedNPC.personality.motivation}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-slate-400">Эмоция:</span> <span className="text-white">{selectedNPC.personality.dominantEmotion}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">Отношение:</span>
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${selectedNPC.personality.disposition >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${selectedNPC.personality.disposition}%` }}
                              />
                            </div>
                            <span className="text-xs">{selectedNPC.personality.disposition}%</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Resources */}
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Ресурсы</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">💎 Дух. камни:</span>
                            <span className="text-cyan-400">{selectedNPC.resources.spiritStones}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">⭐ Очки вклада:</span>
                            <span className="text-amber-400">{selectedNPC.resources.contributionPoints}</span>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    {/* Equipment Tab */}
                    <TabsContent value="equipment" className="mt-0 space-y-4">
                      {/* Equipped Items */}
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Экипировка</h4>
                        
                        {Object.keys(selectedNPC.equipment).length === 0 ? (
                          <p className="text-slate-500 text-sm">Нет экипировки</p>
                        ) : (
                          <div className="space-y-2">
                            {Object.entries(selectedNPC.equipment).map(([slot, itemId]) => (
                              <div key={slot} className="flex items-center justify-between bg-slate-700/50 rounded p-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 text-xs">{slot}:</span>
                                  {itemId ? (
                                    <button
                                      onClick={() => handleItemClick(itemId)}
                                      className="text-amber-400 hover:text-amber-300 text-sm underline"
                                    >
                                      {itemId}
                                    </button>
                                  ) : (
                                    <span className="text-slate-500 text-sm">Пусто</span>
                                  )}
                                </div>
                                {itemId && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs"
                                    onClick={() => handleItemClick(itemId)}
                                  >
                                    Подробнее
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Inventory */}
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Инвентарь ({selectedNPC.inventory.length})</h4>
                        
                        {selectedNPC.inventory.length === 0 ? (
                          <p className="text-slate-500 text-sm">Инвентарь пуст</p>
                        ) : (
                          <div className="space-y-1">
                            {selectedNPC.inventory.map((item, i) => (
                              <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded p-2">
                                <button
                                  onClick={() => handleItemClick(item.id)}
                                  className="text-amber-400 hover:text-amber-300 text-sm underline"
                                >
                                  {item.id}
                                </button>
                                <Badge variant="outline" className="text-xs">x{item.quantity}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    {/* Techniques Tab */}
                    <TabsContent value="techniques" className="mt-0 space-y-4">
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Известные техники ({selectedNPC.techniques.length})</h4>
                        
                        {selectedNPC.techniques.length === 0 ? (
                          <p className="text-slate-500 text-sm">Нет изученных техник</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {selectedNPC.techniques.map((tech, i) => (
                              <Badge 
                                key={i} 
                                variant="outline" 
                                className="border-cyan-500 text-cyan-400 cursor-pointer hover:bg-cyan-900/30"
                              >
                                ⚔️ {tech}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* TODO: Skills placeholder */}
                      <div className="bg-slate-800/50 rounded-lg p-3 opacity-50">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Навыки</h4>
                        <p className="text-slate-500 text-sm">В разработке...</p>
                      </div>
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Выберите NPC из списка</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Item Details Popup */}
        {itemPopup && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{itemPopup.icon}</span>
                  <h3 className="text-lg font-bold text-white">{itemPopup.name}</h3>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setItemPopup(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex gap-2 mb-3">
                <Badge variant="outline" className={RARITY_COLORS[itemPopup.rarity]}>
                  {itemPopup.rarity}
                </Badge>
                <Badge variant="outline" className="border-slate-500">
                  {itemPopup.category}
                </Badge>
              </div>
              
              <p className="text-sm text-slate-300 mb-3">{itemPopup.description}</p>
              
              {itemPopup.stats && Object.keys(itemPopup.stats).length > 0 && (
                <div className="bg-slate-700/50 rounded p-2 mb-3">
                  <h4 className="text-xs font-medium text-amber-400 mb-1">Характеристики</h4>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {itemPopup.stats.damage && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Урон:</span>
                        <span className="text-red-400">{itemPopup.stats.damage}</span>
                      </div>
                    )}
                    {itemPopup.stats.defense && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Защита:</span>
                        <span className="text-blue-400">{itemPopup.stats.defense}</span>
                      </div>
                    )}
                    {itemPopup.stats.qiBonus && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Бонус Ци:</span>
                        <span className="text-cyan-400">+{itemPopup.stats.qiBonus}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {itemPopup.effects && itemPopup.effects.length > 0 && (
                <div className="bg-slate-700/50 rounded p-2">
                  <h4 className="text-xs font-medium text-amber-400 mb-1">Эффекты</h4>
                  <div className="space-y-1">
                    {itemPopup.effects.map((effect, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
