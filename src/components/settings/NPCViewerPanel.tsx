'use client';

import { useState, useEffect } from 'react';
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
  
  generationMeta: {
    seed: number;
    generatedAt: string;
    version: string;
  };
}

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

const GENDER_NAMES: Record<string, string> = {
  male: '♂️ Мужчина',
  female: '♀️ Женщина',
  none: '⚪ Неизвестно',
};

const SPECIES_ICONS: Record<string, React.ReactNode> = {
  humanoid: <User className="w-4 h-4 text-blue-400" />,
  beast: <Dog className="w-4 h-4 text-orange-400" />,
  spirit: <Ghost className="w-4 h-4 text-purple-400" />,
  hybrid: <Sparkle className="w-4 h-4 text-green-400" />,
  aberration: <Flame className="w-4 h-4 text-red-400" />,
};

interface NPCViewerPanelProps {
  npcs: GeneratedNPC[];
  loading: boolean;
  onLoad: () => void;
}

export function NPCViewerPanel({ npcs, loading, onLoad }: NPCViewerPanelProps) {
  const [filteredNPCs, setFilteredNPCs] = useState<GeneratedNPC[]>([]);
  const [selectedNPC, setSelectedNPC] = useState<GeneratedNPC | null>(null);
  
  // Фильтры
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Получаем тип вида по speciesId
  const getSpeciesType = (speciesId: string): string => {
    if (speciesId.includes('human') || speciesId.includes('elf') || speciesId.includes('demon') || speciesId.includes('giant') || speciesId.includes('beastkin')) {
      return 'humanoid';
    }
    if (speciesId.includes('wolf') || speciesId.includes('tiger') || speciesId.includes('bear') || speciesId.includes('snake') || speciesId.includes('dragon') || speciesId.includes('phoenix')) {
      return 'beast';
    }
    if (speciesId.includes('elemental') || speciesId.includes('ghost') || speciesId.includes('spirit')) {
      return 'spirit';
    }
    if (speciesId.includes('centaur') || speciesId.includes('mermaid') || speciesId.includes('werewolf') || speciesId.includes('harpy') || speciesId.includes('lamia')) {
      return 'hybrid';
    }
    if (speciesId.includes('chaos') || speciesId.includes('cthonian') || speciesId.includes('mutant')) {
      return 'aberration';
    }
    return 'humanoid';
  };

  // Получаем тип роли по roleId
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

  // Применяем фильтры
  useEffect(() => {
    if (npcs.length === 0) return;
    
    let filtered = [...npcs];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(npc => 
        npc.name.toLowerCase().includes(searchLower) ||
        npc.id.toLowerCase().includes(searchLower) ||
        npc.speciesId.toLowerCase().includes(searchLower) ||
        npc.roleId.toLowerCase().includes(searchLower)
      );
    }
    
    if (levelFilter !== 'all') {
      filtered = filtered.filter(npc => npc.cultivation.level === parseInt(levelFilter));
    }
    
    if (speciesFilter !== 'all') {
      filtered = filtered.filter(npc => getSpeciesType(npc.speciesId) === speciesFilter);
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(npc => getRoleType(npc.roleId) === roleFilter);
    }
    
    setFilteredNPCs(filtered);
  }, [npcs, search, levelFilter, speciesFilter, roleFilter]);

  // Автовыбор первого NPC при загрузке
  useEffect(() => {
    if (filteredNPCs.length > 0 && !selectedNPC) {
      setSelectedNPC(filteredNPCs[0]);
    }
  }, [filteredNPCs, selectedNPC]);

  return (
    <div className="flex gap-4 h-[60vh]">
      {/* Список */}
      <div className="w-1/2 flex flex-col min-h-0">
        {/* Фильтры */}
        <div className="mb-3 space-y-2 flex-shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по имени, ID, виду..."
                className="pl-8 bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={levelFilter} onValueChange={setLevelFilter}>
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

            <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
              <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-xs text-white">
                <SelectValue placeholder="Вид" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                <SelectItem value="all">Все виды</SelectItem>
                <SelectItem value="humanoid">👤 Гуманоид</SelectItem>
                <SelectItem value="beast">🐺 Зверь</SelectItem>
                <SelectItem value="spirit">👻 Дух</SelectItem>
                <SelectItem value="hybrid">🧬 Гибрид</SelectItem>
                <SelectItem value="aberration">👁️ Аберрация</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-xs text-white">
                <SelectValue placeholder="Роль" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                <SelectItem value="all">Все роли</SelectItem>
                <SelectItem value="sect">🏛️ Секта</SelectItem>
                <SelectItem value="profession">⚒️ Профессия</SelectItem>
                <SelectItem value="social">👥 Социальная</SelectItem>
                <SelectItem value="combat">⚔️ Боевая</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Результаты */}
        {npcs.length > 0 ? (
          <>
            <div className="text-xs text-slate-400 mb-2 flex-shrink-0">
              Найдено: {filteredNPCs.length} из {npcs.length}
            </div>

            <ScrollArea className="flex-1 min-h-0 border border-slate-700 rounded-lg">
              {loading ? (
                <div className="p-4 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Загрузка...
                </div>
              ) : filteredNPCs.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  Нет объектов, соответствующих фильтрам
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {SPECIES_ICONS[getSpeciesType(npc.speciesId)] || <User className="w-4 h-4" />}
                          <span className="text-sm font-medium text-white">{npc.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs border-slate-500 text-white">
                            Ур. {npc.cultivation.level}
                          </Badge>
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-400">
                            {npc.gender === 'male' ? '♂' : npc.gender === 'female' ? '♀' : '○'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {npc.speciesId} • {npc.roleId}
                        {npc.techniques.length > 0 && ` • ${npc.techniques.length} техник`}
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
              Или сгенерируйте NPC в Настройки → NPC
            </p>
          </div>
        )}
      </div>

      {/* Детали NPC */}
      <div className="w-1/2 bg-slate-800/30 rounded-lg p-4 min-h-0 overflow-hidden flex flex-col">
        {selectedNPC ? (
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {/* Имя и пол */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {SPECIES_ICONS[getSpeciesType(selectedNPC.speciesId)]}
                  <h3 className="text-xl font-bold text-white">{selectedNPC.name}</h3>
                  <span className="text-lg">
                    {selectedNPC.gender === 'male' ? '♂' : selectedNPC.gender === 'female' ? '♀' : '○'}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{selectedNPC.id} • {selectedNPC.age} лет</p>
              </div>

              {/* Бейджи */}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="border-slate-500 text-white">
                  {SPECIES_TYPE_NAMES[getSpeciesType(selectedNPC.speciesId)] || selectedNPC.speciesId}
                </Badge>
                <Badge variant="outline" className="border-slate-500 text-white">
                  {ROLE_TYPE_NAMES[getRoleType(selectedNPC.roleId)] || selectedNPC.roleId}
                </Badge>
                <Badge className="bg-amber-600">
                  Уровень {selectedNPC.cultivation.level}
                </Badge>
              </div>

              {/* Характеристики */}
              <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-medium text-amber-400">Характеристики</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Сила:</span>
                    <span className="text-red-400">{selectedNPC.stats.strength}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ловкость:</span>
                    <span className="text-green-400">{selectedNPC.stats.agility}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Интеллект:</span>
                    <span className="text-blue-400">{selectedNPC.stats.intelligence}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Живучесть:</span>
                    <span className="text-amber-400">{selectedNPC.stats.vitality}</span>
                  </div>
                </div>
              </div>

              {/* Культивация */}
              <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-medium text-amber-400">Культивация</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Уровень:</span>
                    <span className="text-amber-400">{selectedNPC.cultivation.level}.{selectedNPC.cultivation.subLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ци:</span>
                    <span className="text-cyan-400">{selectedNPC.cultivation.currentQi}/{selectedNPC.cultivation.coreCapacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Качество ядра:</span>
                    <span className="text-purple-400">{selectedNPC.cultivation.coreQuality}</span>
                  </div>
                </div>
              </div>

              {/* Личность */}
              <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-medium text-amber-400">Личность</h4>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {selectedNPC.personality.traits.map((trait, i) => (
                      <Badge key={i} variant="outline" className="border-purple-500 text-purple-400 text-xs">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-slate-300">
                    <span className="text-slate-400">Мотивация:</span> {selectedNPC.personality.motivation}
                  </div>
                  <div className="text-sm text-slate-300">
                    <span className="text-slate-400">Эмоция:</span> {selectedNPC.personality.dominantEmotion}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">Отношение:</span>
                    <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${selectedNPC.personality.disposition >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${selectedNPC.personality.disposition}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-300">{selectedNPC.personality.disposition}%</span>
                  </div>
                </div>
              </div>

              {/* Техники */}
              {selectedNPC.techniques.length > 0 && (
                <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                  <h4 className="text-sm font-medium text-amber-400">Техники ({selectedNPC.techniques.length})</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedNPC.techniques.map((tech, i) => (
                      <Badge key={i} variant="outline" className="border-cyan-500 text-cyan-400 text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Инвентарь */}
              {selectedNPC.inventory.length > 0 && (
                <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                  <h4 className="text-sm font-medium text-amber-400">Инвентарь ({selectedNPC.inventory.length})</h4>
                  <div className="space-y-1">
                    {selectedNPC.inventory.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-300">{item.id}</span>
                        <span className="text-slate-400">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ресурсы */}
              <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-medium text-amber-400">Ресурсы</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Дух. камни:</span>
                    <span className="text-cyan-400">{selectedNPC.resources.spiritStones}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Вклад:</span>
                    <span className="text-amber-400">{selectedNPC.resources.contributionPoints}</span>
                  </div>
                </div>
              </div>

              {/* Мета-информация */}
              <div className="text-xs text-slate-500">
                <div>Seed: {selectedNPC.generationMeta.seed}</div>
                <div>Создан: {new Date(selectedNPC.generationMeta.generatedAt).toLocaleString('ru')}</div>
                <div>Версия генератора: {selectedNPC.generationMeta.version}</div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Выберите NPC для просмотра</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
