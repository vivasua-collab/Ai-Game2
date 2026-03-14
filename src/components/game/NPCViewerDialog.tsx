'use client';

import { useState, useEffect } from 'react';
import { useGameSessionId, useGameLocation } from '@/stores/game.store';
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
  Package,
  Heart,
  Activity,
  Brain,
  Zap,
  Target,
  BookOpen,
  MapPin,
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
  locationId?: string;
  locationName?: string;
  
  // Тип NPC (реальность)
  isPreset?: boolean;
  isTemporary?: boolean;
  isStatic?: boolean;
  
  stats: {
    strength: number;
    agility: number;
    intelligence: number;
    vitality: number;
    conductivity?: number;
  };
  
  cultivation: {
    level: number;
    subLevel: number;
    coreCapacity: number;
    currentQi: number;
    coreQuality: number;
    baseVolume?: number;
    qiDensity?: number;
    meridianConductivity?: number;
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
  skills?: string[];
  equipment: Record<string, any>;
  inventory: Array<{ id: string; quantity: number }>;
  
  resources: {
    spiritStones: number;
    contributionPoints: number;
  };
}

// ==================== CONSTANTS ====================

const SPECIES_ICONS: Record<string, React.ReactNode> = {
  humanoid: <User className="w-4 h-4 text-blue-400" />,
  beast: <Dog className="w-4 h-4 text-orange-400" />,
  spirit: <Ghost className="w-4 h-4 text-purple-400" />,
  hybrid: <Sparkle className="w-4 h-4 text-green-400" />,
  aberration: <Flame className="w-4 h-4 text-red-400" />,
};

const TECHNIQUE_ICONS: Record<string, React.ReactNode> = {
  attack: <Sword className="w-4 h-4 text-red-400" />,
  defense: <Shield className="w-4 h-4 text-blue-400" />,
  movement: <Activity className="w-4 h-4 text-green-400" />,
  support: <Heart className="w-4 h-4 text-pink-400" />,
  cultivation: <Zap className="w-4 h-4 text-cyan-400" />,
  default: <Sparkle className="w-4 h-4 text-amber-400" />,
};

// ==================== MAIN COMPONENT ====================

interface NPCViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NPCViewerDialog({ open, onOpenChange }: NPCViewerDialogProps) {
  // NPC Data
  const [generatedNpcs, setGeneratedNpcs] = useState<GeneratedNPC[]>([]);
  const [presetNpcs, setPresetNpcs] = useState<GeneratedNPC[]>([]);
  const [sessionNpcs, setSessionNpcs] = useState<GeneratedNPC[]>([]);
  const [selectedNPC, setSelectedNPC] = useState<GeneratedNPC | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  
  // Source tab
  const [sourceTab, setSourceTab] = useState<'session' | 'presets' | 'generated'>('session');
  
  // Loading states
  const [respawning, setRespawning] = useState(false);

  // Get sessionId and current location from game store
  const sessionId = useGameSessionId();
  const currentLocation = useGameLocation();
  const currentLocationId = currentLocation?.id;

  // Load all data on open
  useEffect(() => {
    if (open) {
      loadAllNPCs();
    }
  }, [open]);

  const loadAllNPCs = async () => {
    setLoading(true);
    try {
      console.log('[NPCViewer] Loading NPCs...');
      console.log('[NPCViewer] sessionId:', sessionId);
      console.log('[NPCViewer] currentLocationId:', currentLocationId);
      
      const [genRes, presetRes, sessionRes] = await Promise.all([
        fetch('/api/generator/npc?action=list'),
        fetch('/api/npc/spawn?action=presets'),
        sessionId 
          ? fetch(`/api/npc/spawn?action=list&sessionId=${sessionId}`)
          : Promise.resolve(new Response(JSON.stringify({ success: false, npcs: [] }))),
      ]);
      
      const genData = await genRes.json();
      const presetData = await presetRes.json();
      const sessionData = await sessionRes.json();
      
      console.log('[NPCViewer] Session data:', sessionData);
      
      // Generated NPCs
      if (genData.success && genData.npcs) {
        const uniqueNPCs = genData.npcs.reduce((acc: GeneratedNPC[], npc: GeneratedNPC) => {
          if (!acc.find(n => n.id === npc.id)) acc.push(npc);
          return acc;
        }, []);
        setGeneratedNpcs(uniqueNPCs);
      }
      
      // Preset NPCs
      if (presetData.success && presetData.presets) {
        const presetConverted: GeneratedNPC[] = presetData.presets.map((p: any) => ({
          id: p.id,
          name: p.name,
          title: p.title,
          age: p.age || 25,
          gender: p.gender || 'male',
          speciesId: p.speciesId || 'human',
          roleId: p.roleId || 'story',
          isPreset: true,
          stats: {
            strength: p.stats?.strength || 0,
            agility: p.stats?.agility || 0,
            intelligence: p.stats?.intelligence || 0,
            vitality: p.stats?.vitality || p.stats?.conductivity || 0,
            conductivity: p.stats?.conductivity,
          },
          cultivation: {
            level: p.cultivation?.level || 1,
            subLevel: p.cultivation?.subLevel || 0,
            coreCapacity: p.cultivation?.coreCapacity || 0,
            currentQi: p.cultivation?.currentQi || 0,
            coreQuality: 1,
            baseVolume: p.cultivation?.baseVolume,
            qiDensity: p.cultivation?.qiDensity,
            meridianConductivity: p.cultivation?.meridianConductivity,
          },
          personality: p.personality ? (typeof p.personality === 'string' ? JSON.parse(p.personality) : p.personality) : {
            traits: [],
            motivation: '',
            dominantEmotion: 'neutral',
            disposition: 0,
          },
          techniques: p.techniques ? (typeof p.techniques === 'string' ? JSON.parse(p.techniques) : p.techniques) : [],
          skills: p.skills ? (typeof p.skills === 'string' ? JSON.parse(p.skills) : p.skills) : [],
          equipment: p.equipment ? (typeof p.equipment === 'string' ? JSON.parse(p.equipment) : p.equipment) : {},
          inventory: [],
          resources: { spiritStones: 0, contributionPoints: 0 },
        }));
        setPresetNpcs(presetConverted);
      }
      
      // Session NPCs - ВСЕ, без фильтрации
      if (sessionData.success && sessionData.npcs) {
        console.log('[NPCViewer] Session NPCs count:', sessionData.npcs.length);
        
        const sessionConverted: GeneratedNPC[] = sessionData.npcs.map((n: any) => ({
          id: n.id,
          name: n.name,
          title: n.title,
          age: n.age || 25,
          gender: n.gender || 'male',
          speciesId: n.speciesId || 'human',
          roleId: n.roleId || n.role || 'unknown',
          locationId: n.locationId,
          isPreset: n.isPreset === true,
          isTemporary: n.isPreset === false || n.id?.startsWith('TEMP_'),
          stats: n.stats || { strength: 10, agility: 10, intelligence: 10, vitality: 10 },
          cultivation: n.cultivation || {
            level: n.level || 1,
            subLevel: n.subLevel || 0,
            coreCapacity: n.coreCapacity || 1000,
            currentQi: n.currentQi || 0,
            coreQuality: 1,
            qiDensity: n.cultivation?.qiDensity,
          },
          personality: n.personality ? (typeof n.personality === 'string' ? JSON.parse(n.personality) : n.personality) : {
            traits: n.traits || [],
            motivation: n.motivation || '',
            dominantEmotion: 'neutral',
            disposition: n.disposition || 50,
          },
          techniques: n.techniques ? (typeof n.techniques === 'string' ? JSON.parse(n.techniques) : n.techniques) : [],
          skills: n.skills ? (typeof n.skills === 'string' ? JSON.parse(n.skills) : n.skills) : [],
          equipment: n.equipment || {},
          inventory: [],
          resources: n.resources || { spiritStones: 0, contributionPoints: 0 },
        }));
        
        console.log('[NPCViewer] Converted session NPCs:', sessionConverted.length);
        setSessionNpcs(sessionConverted);
        
        // Автовыбор первого NPC
        if (sessionConverted.length > 0 && !selectedNPC) {
          setSelectedNPC(sessionConverted[0]);
        }
      } else {
        console.log('[NPCViewer] No session NPCs or error');
        setSessionNpcs([]);
      }
    } catch (error) {
      console.error('[NPCViewer] Failed to load NPCs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Получить список NPC в зависимости от вкладки
  const getDisplayNPCs = () => {
    if (sourceTab === 'presets') return presetNpcs;
    if (sourceTab === 'generated') return generatedNpcs;
    return sessionNpcs; // session tab - показываем ВСЕХ
  };
  
  const npcs = getDisplayNPCs();

  const getSpeciesType = (speciesId: string): string => {
    if (['human', 'elf', 'demon_humanoid', 'giant', 'beastkin'].includes(speciesId)) return 'humanoid';
    if (['wolf', 'tiger', 'bear', 'snake', 'lizard', 'eagle', 'hawk', 'dragon_beast', 'phoenix'].includes(speciesId)) return 'beast';
    if (['fire_elemental', 'water_elemental', 'wind_elemental', 'ghost', 'celestial_spirit'].includes(speciesId)) return 'spirit';
    if (['centaur', 'mermaid', 'werewolf', 'harpy', 'lamia'].includes(speciesId)) return 'hybrid';
    if (['chaos_spawn', 'cthonian', 'mutant'].includes(speciesId)) return 'aberration';
    return 'humanoid';
  };

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

  const handleRespawnSessionNPCs = async () => {
    if (!sessionId) return;
    
    setRespawning(true);
    try {
      const sessionRes = await fetch(`/api/game/session?id=${sessionId}`);
      const sessionData = await sessionRes.json();
      let locationId = currentLocationId || 'loc_default';
      
      if (sessionData.success && sessionData.session?.locations?.length > 0) {
        locationId = sessionData.session.locations[0].id;
      }
      
      const res = await fetch('/api/npc/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respawn_presets',
          sessionId,
          locationId,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        await loadAllNPCs();
      }
    } catch (error) {
      console.error('Failed to respawn NPCs:', error);
    } finally {
      setRespawning(false);
    }
  };

  // Получить тип NPC для отображения
  const getNPCTypeLabel = (npc: GeneratedNPC) => {
    if (npc.isPreset) return { label: '⭐ Сюжетный', color: 'text-amber-400', border: 'border-amber-500' };
    if (npc.isTemporary) return { label: '⏳ Временный', color: 'text-cyan-400', border: 'border-cyan-500' };
    if (npc.isStatic) return { label: '📍 Локальный', color: 'text-green-400', border: 'border-green-500' };
    return { label: '🎮 Сессионный', color: 'text-purple-400', border: 'border-purple-500' };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white !max-w-[95vw] !w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Просмотр NPC</DialogTitle>
        </DialogHeader>
        
        <div className="flex h-[85vh]">
          {/* Left: NPC List */}
          <div className="w-60 min-w-[220px] border-r border-slate-700 flex flex-col bg-slate-900/50">
            {/* Header */}
            <div className="p-3 border-b border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-amber-400">NPC</h2>
              </div>
              {/* Current Location */}
              <div className="text-xs text-slate-400 mb-2 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {currentLocation?.name || currentLocationId || 'Нет локации'}
              </div>
              
              {/* Source Tabs */}
              <div className="flex gap-1 mb-2">
                <Button
                  size="sm"
                  variant={sourceTab === 'session' ? 'default' : 'outline'}
                  className={`text-xs h-6 px-2 flex-1 ${sourceTab === 'session' ? 'bg-amber-600' : 'border-slate-600 text-slate-300'}`}
                  onClick={() => setSourceTab('session')}
                >
                  🎮 Сессия ({sessionNpcs.length})
                </Button>
                <Button
                  size="sm"
                  variant={sourceTab === 'presets' ? 'default' : 'outline'}
                  className={`text-xs h-6 px-2 ${sourceTab === 'presets' ? 'bg-amber-600' : 'border-slate-600 text-slate-300'}`}
                  onClick={() => setSourceTab('presets')}
                >
                  ⭐ ({presetNpcs.length})
                </Button>
                <Button
                  size="sm"
                  variant={sourceTab === 'generated' ? 'default' : 'outline'}
                  className={`text-xs h-6 px-2 ${sourceTab === 'generated' ? 'bg-amber-600' : 'border-slate-600 text-slate-300'}`}
                  onClick={() => setSourceTab('generated')}
                >
                  📁 ({generatedNpcs.length})
                </Button>
              </div>
              
              {/* Search */}
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1.5 w-3 h-3 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="pl-6 bg-slate-800 border-slate-600 text-white h-7 text-xs"
                />
              </div>
              
              {/* Filters */}
              <div className="flex gap-1">
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-16 bg-slate-800 border-slate-600 text-xs h-6">
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
                  <SelectTrigger className="flex-1 bg-slate-800 border-slate-600 text-xs h-6">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700">
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="humanoid">👤</SelectItem>
                    <SelectItem value="beast">🐺</SelectItem>
                    <SelectItem value="spirit">👻</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Respawn button */}
              {sourceTab === 'session' && sessionId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-6 px-2 mt-2 w-full border-red-600 text-red-400 hover:bg-red-900/30"
                  onClick={handleRespawnSessionNPCs}
                  disabled={respawning}
                >
                  {respawning ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Пересоздание...</>
                  ) : (
                    <>🔄 Пересоздать</>
                  )}
                </Button>
              )}
            </div>
            
            {/* NPC List */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-400" />
                </div>
              ) : filteredNPCs.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  {sourceTab === 'session' 
                    ? 'Нет NPC в сессии. Попробуйте "Пересоздать"' 
                    : 'NPC не найдены'}
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {filteredNPCs.map((npc) => {
                    const typeInfo = getNPCTypeLabel(npc);
                    
                    return (
                      <div
                        key={npc.id}
                        onClick={() => setSelectedNPC(npc)}
                        className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                          selectedNPC?.id === npc.id ? 'bg-amber-900/30 border-l-2 border-amber-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {SPECIES_ICONS[getSpeciesType(npc.speciesId)] || <User className="w-4 h-4 text-slate-400" />}
                          <span className="text-xs font-medium text-white truncate flex-1">{npc.name}</span>
                          <span className={`text-xs ${typeInfo.color}`} title={typeInfo.label}>
                            {typeInfo.label.split(' ')[0]}
                          </span>
                          <span className="text-xs text-slate-400">
                            {npc.gender === 'male' ? '♂' : npc.gender === 'female' ? '♀' : '○'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex justify-between">
                          <span>Ур. {npc.cultivation.level}.{npc.cultivation.subLevel}</span>
                          <span className="truncate max-w-[80px]" title={npc.locationId || 'Неизвестно'}>
                            📍 {npc.locationId?.slice(0, 10) || '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
          
          {/* Right: NPC Details - 3 Column Layout */}
          <div className="flex-1 flex flex-col">
            {selectedNPC ? (
              <>
                {/* NPC Header */}
                <div className="p-3 border-b border-slate-700 bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      {SPECIES_ICONS[getSpeciesType(selectedNPC.speciesId)] || <User className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">{selectedNPC.name}</h3>
                      <div className="flex gap-2 items-center flex-wrap">
                        <Badge variant="outline" className="border-slate-500 text-xs px-2 py-0 h-5">
                          {selectedNPC.roleId}
                        </Badge>
                        <Badge className="bg-amber-600 text-xs px-2 py-0 h-5">
                          Ур. {selectedNPC.cultivation.level}.{selectedNPC.cultivation.subLevel}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {selectedNPC.gender === 'male' ? '♂' : selectedNPC.gender === 'female' ? '♀' : '○'} {selectedNPC.age} лет
                        </span>
                      </div>
                      {/* Локация и тип */}
                      <div className="flex gap-2 items-center mt-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-2 py-0 h-5 ${getNPCTypeLabel(selectedNPC).color} ${getNPCTypeLabel(selectedNPC).border}`}
                        >
                          {getNPCTypeLabel(selectedNPC).label}
                        </Badge>
                        <Badge variant="outline" className="border-slate-600 text-xs px-2 py-0 h-5 text-slate-300">
                          📍 {selectedNPC.locationId?.slice(0, 15) || 'Без локации'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 font-mono max-w-[100px] truncate" title={selectedNPC.id}>
                      {selectedNPC.id.slice(0, 15)}...
                    </div>
                  </div>
                </div>
                
                {/* 3 Column Layout */}
                <div className="flex-1 grid grid-cols-3 gap-0 divide-x divide-slate-700 overflow-hidden">
                  
                  {/* Column 1: Status */}
                  <div className="flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-slate-700 bg-slate-800/20 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-red-400">Статус</span>
                    </div>
                    <ScrollArea className="flex-1 p-3">
                      <div className="space-y-3">
                        {/* Stats */}
                        <div className="bg-slate-800/40 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-amber-400 mb-2">Характеристики</h4>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Sword className="w-3 h-3 text-red-400" /> Сила
                              </span>
                              <span className="text-red-400 font-bold">{Math.round(selectedNPC.stats?.strength ?? 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Activity className="w-3 h-3 text-green-400" /> Ловкость
                              </span>
                              <span className="text-green-400 font-bold">{Math.round(selectedNPC.stats?.agility ?? 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Brain className="w-3 h-3 text-blue-400" /> Интеллект
                              </span>
                              <span className="text-blue-400 font-bold">{Math.round(selectedNPC.stats?.intelligence ?? 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Heart className="w-3 h-3 text-amber-400" /> Живучесть
                              </span>
                              <span className="text-amber-400 font-bold">{Math.round(selectedNPC.stats?.vitality ?? 10)}</span>
                            </div>
                            {(selectedNPC.stats?.conductivity ?? 0) > 0 && (
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 flex items-center gap-1">
                                  <Zap className="w-3 h-3 text-cyan-400" /> Проводимость
                                </span>
                                <span className="text-cyan-400 font-bold">{(selectedNPC.stats?.conductivity ?? 0).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Cultivation */}
                        <div className="bg-slate-800/40 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-amber-400 mb-2">Культивация</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Уровень:</span>
                              <Badge className="bg-amber-600 text-xs px-2 py-0 h-5">
                                {selectedNPC.cultivation.level}.{selectedNPC.cultivation.subLevel}
                              </Badge>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-400">Ци</span>
                                <span className="text-cyan-400">
                                  {selectedNPC.cultivation.currentQi.toLocaleString()}/{selectedNPC.cultivation.coreCapacity.toLocaleString()}
                                </span>
                              </div>
                              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                                  style={{ width: `${Math.min(100, (selectedNPC.cultivation.currentQi / selectedNPC.cultivation.coreCapacity) * 100)}%` }}
                                />
                              </div>
                            </div>
                            {selectedNPC.cultivation.qiDensity !== undefined && (
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Плотность Ци:</span>
                                <span className="text-cyan-400">{selectedNPC.cultivation.qiDensity}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Personality */}
                        <div className="bg-slate-800/40 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-amber-400 mb-2">Личность</h4>
                          <div className="space-y-2">
                            {selectedNPC.personality.traits.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {selectedNPC.personality.traits.slice(0, 5).map((trait, i) => (
                                  <Badge key={i} variant="outline" className="border-purple-500/50 text-purple-400 text-xs px-1.5 py-0 h-4">
                                    {trait}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {selectedNPC.personality.motivation && (
                              <div className="text-xs">
                                <span className="text-slate-500">Мотивация:</span>
                                <span className="text-white ml-1">{selectedNPC.personality.motivation}</span>
                              </div>
                            )}
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-400">Отношение</span>
                                <span className={selectedNPC.personality.disposition >= 0 ? 'text-green-400' : 'text-red-400'}>
                                  {selectedNPC.personality.disposition >= 0 ? '+' : ''}{(Math.round(selectedNPC.personality.disposition * 100) / 100).toFixed(2)}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${selectedNPC.personality.disposition >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(100, Math.abs(selectedNPC.personality.disposition))}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Resources */}
                        <div className="bg-slate-800/40 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-amber-400 mb-2">Ресурсы</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">💎 Камни:</span>
                              <span className="text-cyan-400">{selectedNPC.resources.spiritStones}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">⭐ Очки:</span>
                              <span className="text-amber-400">{selectedNPC.resources.contributionPoints}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                  
                  {/* Column 2: Techniques & Skills */}
                  <div className="flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-slate-700 bg-slate-800/20 flex items-center gap-2">
                      <Sword className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-cyan-400">Техники и Навыки</span>
                    </div>
                    <ScrollArea className="flex-1 p-3">
                      <div className="space-y-3">
                        {/* Techniques */}
                        <div className="bg-slate-800/40 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1">
                            <Sword className="w-3 h-3" />
                            Техники ({selectedNPC.techniques.length})
                          </h4>
                          
                          {selectedNPC.techniques.length === 0 ? (
                            <p className="text-slate-500 text-xs">Нет изученных техник</p>
                          ) : (
                            <div className="space-y-1.5">
                              {selectedNPC.techniques.map((tech, i) => (
                                <div 
                                  key={i}
                                  className="flex items-center gap-2 bg-slate-700/40 rounded px-2 py-1.5 hover:bg-slate-700/60 cursor-pointer"
                                >
                                  {TECHNIQUE_ICONS.default}
                                  <span className="text-xs text-cyan-400 flex-1 truncate">{tech}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Skills */}
                        <div className="bg-slate-800/40 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            Навыки ({selectedNPC.skills?.length ?? 0})
                          </h4>
                          
                          {(!selectedNPC.skills || selectedNPC.skills.length === 0) ? (
                            <p className="text-slate-500 text-xs">Нет навыков</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedNPC.skills.map((skill, i) => (
                                <Badge 
                                  key={i} 
                                  variant="outline" 
                                  className="border-green-500/50 text-green-400 text-xs px-2 py-0 h-5"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                  
                  {/* Column 3: Equipment & Inventory */}
                  <div className="flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-slate-700 bg-slate-800/20 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-medium text-amber-400">Экипировка</span>
                    </div>
                    <ScrollArea className="flex-1 p-3">
                      <div className="space-y-3">
                        {/* Equipment */}
                        <div className="bg-slate-800/40 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Слоты
                          </h4>
                          
                          {Object.keys(selectedNPC.equipment || {}).length === 0 ? (
                            <p className="text-slate-500 text-xs">Нет экипировки</p>
                          ) : (
                            <div className="space-y-1.5">
                              {Object.entries(selectedNPC.equipment || {}).map(([slot, item]) => {
                                const itemData = item as any;
                                return (
                                  <div 
                                    key={slot}
                                    className="flex items-center gap-2 bg-slate-700/40 rounded px-2 py-1.5"
                                  >
                                    {slot === 'weapon' ? <Sword className="w-3 h-3 text-red-400" /> :
                                     slot === 'armor' ? <Shield className="w-3 h-3 text-blue-400" /> :
                                     <Package className="w-3 h-3 text-slate-400" />}
                                    <span className="text-xs text-slate-400 capitalize">{slot}:</span>
                                    <span className="text-xs text-white flex-1 truncate">
                                      {itemData?.name || itemData?.id || 'Пусто'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        
                        {/* Inventory placeholder */}
                        <div className="bg-slate-800/40 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            Инвентарь
                          </h4>
                          <p className="text-slate-500 text-xs">
                            {selectedNPC.inventory?.length ?? 0} предметов
                          </p>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Выберите NPC из списка</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
