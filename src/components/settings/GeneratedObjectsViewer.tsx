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
  Gem,
  Pill,
  Circle,
  Briefcase,
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

// ==================== ПРЕДМЕТЫ (НОВОЕ) ====================

// Оружие
interface Weapon {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  category: string;
  weaponType: string;
  baseDamage: number;
  baseRange: number;
  attackSpeed: number;
  requirements?: {
    strength?: number;
    agility?: number;
    cultivationLevel?: number;
  };
  properties?: {
    critChance: number;
    critDamage: number;
    armorPenetration: number;
  };
  rarity: string;
  upgradeFlags: number;
}

// Броня
interface Armor {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  slot: string;
  defense: {
    physical: number;
    qi: number;
    elemental?: Record<string, number>;
  };
  stats?: {
    strength?: number;
    agility?: number;
    conductivity?: number;
  };
  requirements?: {
    cultivationLevel?: number;
  };
  rarity: string;
  upgradeFlags: number;
}

// Аксессуары
interface Accessory {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  slot: string;
  accessoryType: string;
  bonuses: {
    stats?: {
      strength?: number;
      agility?: number;
      intelligence?: number;
      conductivity?: number;
    };
    special?: string[];
  };
  rarity: string;
  upgradeFlags: number;
  isTalisman?: boolean;
  talismanEffect?: {
    type: string;
    duration: number;
    radius?: number;
  };
}

// Расходники
interface Consumable {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  type: string;
  effect: {
    type: string;
    value: number;
    duration?: number;
  };
  usage?: {
    castTime: number;
    cooldown?: number;
  };
  rarity: string;
}

// Камни Ци
interface QiStone {
  id: string;
  name: string;
  description?: string;
  sizeClass: string;
  volumeCm3: number;
  totalQi: number;
  currentQi: number;
  type: 'calm' | 'chaotic';
  isSealed: boolean;
}

// Зарядники
interface Charger {
  id: string;
  name: string;
  description?: string;
  capacity: number;
  efficiency: number;
  chargeRate: number;
  requirements?: {
    cultivationLevel?: number;
  };
  rarity: string;
  upgradeFlags: number;
}

// ==================== КОНСТАНТЫ ====================

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

const RARITY_BG: Record<string, string> = {
  common: 'bg-slate-600',
  uncommon: 'bg-green-600',
  rare: 'bg-blue-600',
  legendary: 'bg-amber-600',
};

// Слоты экипировки
const SLOT_NAMES: Record<string, string> = {
  head: '🎭 Голова',
  torso: '👕 Торс',
  legs: '👖 Ноги',
  feet: '👢 Стопы',
  hands_gloves: '🧤 Кисти',
  hands_bracers: '💪 Руки',
};

// Слоты аксессуаров
const ACCESSORY_SLOT_NAMES: Record<string, string> = {
  ring_left_1: '💍 Кольцо Л1',
  ring_left_2: '💍 Кольцо Л2',
  ring_right_1: '💍 Кольцо П1',
  ring_right_2: '💍 Кольцо П2',
  amulet: '📿 Амулет',
  talisman_1: '🔮 Талисман 1',
  talisman_2: '🔮 Талисман 2',
};

// Типы расходников
const CONSUMABLE_TYPE_NAMES: Record<string, string> = {
  pill: '💊 Таблетка',
  elixir: '🧪 Эликсир',
  food: '🍖 Еда',
  scroll: '📜 Свиток',
};

// Размеры камней Ци
const QI_STONE_SIZE_NAMES: Record<string, string> = {
  dust: '⚪ Пыль',
  fragment: '🔷 Осколок',
  small: '💎 Малый',
  medium: '💠 Средний',
  large: '🔷 Большой',
  huge: '🔶 Огромный',
  boulder: '💎 Глыба',
};

// Категории оружия
const WEAPON_CATEGORY_NAMES: Record<string, string> = {
  one_handed_blade: '🗡️ Одноручный клинок',
  two_handed_blade: '⚔️ Двуручный клинок',
  polearm: '🔱 Древковое',
  blunt: '🔨 Дробящее',
  fist: '👊 Кистевое',
  thrown: '🎯 Метательное',
  ranged: '🏹 Дальнобойное',
};

type TabType = 'techniques' | 'formations' | 'weapons' | 'armor' | 'accessories' | 'consumables' | 'qi_stones' | 'chargers';

export function GeneratedObjectsViewer({ open, onOpenChange }: GeneratedObjectsViewerProps) {
  // Техники
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [filteredTechniques, setFilteredTechniques] = useState<Technique[]>([]);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  
  // Формации
  const [formations, setFormations] = useState<Formation[]>([]);
  const [filteredFormations, setFilteredFormations] = useState<Formation[]>([]);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  
  // Оружие
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [filteredWeapons, setFilteredWeapons] = useState<Weapon[]>([]);
  const [selectedWeapon, setSelectedWeapon] = useState<Weapon | null>(null);
  
  // Броня
  const [armors, setArmors] = useState<Armor[]>([]);
  const [filteredArmors, setFilteredArmors] = useState<Armor[]>([]);
  const [selectedArmor, setSelectedArmor] = useState<Armor | null>(null);
  
  // Аксессуары
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [filteredAccessories, setFilteredAccessories] = useState<Accessory[]>([]);
  const [selectedAccessory, setSelectedAccessory] = useState<Accessory | null>(null);
  
  // Расходники
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [filteredConsumables, setFilteredConsumables] = useState<Consumable[]>([]);
  const [selectedConsumable, setSelectedConsumable] = useState<Consumable | null>(null);
  
  // Камни Ци
  const [qiStones, setQiStones] = useState<QiStone[]>([]);
  const [filteredQiStones, setFilteredQiStones] = useState<QiStone[]>([]);
  const [selectedQiStone, setSelectedQiStone] = useState<QiStone | null>(null);
  
  // Зарядники
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [filteredChargers, setFilteredChargers] = useState<Charger[]>([]);
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  
  // Общее
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('techniques');
  
  // Фильтры техник
  const [techSearch, setTechSearch] = useState('');
  const [techLevelFilter, setTechLevelFilter] = useState<string>('all');
  const [techTypeFilter, setTechTypeFilter] = useState<string>('all');
  const [techElementFilter, setTechElementFilter] = useState<string>('all');
  
  // Фильтры формаций
  const [formSearch, setFormSearch] = useState('');
  const [formLevelFilter, setFormLevelFilter] = useState<string>('all');
  const [formTypeFilter, setFormTypeFilter] = useState<string>('all');
  
  // Фильтры предметов
  const [itemSearch, setItemSearch] = useState('');
  const [itemRarityFilter, setItemRarityFilter] = useState<string>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');

  // ==================== ЭФФЕКТЫ ФИЛЬТРАЦИИ ====================

  // Фильтрация техник
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

  // Фильтрация формаций
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

  // Фильтрация оружия
  useEffect(() => {
    if (weapons.length === 0) return;
    let filtered = [...weapons];
    if (itemSearch) {
      const searchLower = itemSearch.toLowerCase();
      filtered = filtered.filter(w => 
        w.name.toLowerCase().includes(searchLower) ||
        w.id.toLowerCase().includes(searchLower)
      );
    }
    if (itemRarityFilter !== 'all') {
      filtered = filtered.filter(w => w.rarity === itemRarityFilter);
    }
    if (itemTypeFilter !== 'all') {
      filtered = filtered.filter(w => w.category === itemTypeFilter);
    }
    setFilteredWeapons(filtered);
  }, [weapons, itemSearch, itemRarityFilter, itemTypeFilter]);

  // Фильтрация брони
  useEffect(() => {
    if (armors.length === 0) return;
    let filtered = [...armors];
    if (itemSearch) {
      const searchLower = itemSearch.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(searchLower) ||
        a.id.toLowerCase().includes(searchLower)
      );
    }
    if (itemRarityFilter !== 'all') {
      filtered = filtered.filter(a => a.rarity === itemRarityFilter);
    }
    if (itemTypeFilter !== 'all') {
      filtered = filtered.filter(a => a.slot === itemTypeFilter);
    }
    setFilteredArmors(filtered);
  }, [armors, itemSearch, itemRarityFilter, itemTypeFilter]);

  // Фильтрация аксессуаров
  useEffect(() => {
    if (accessories.length === 0) return;
    let filtered = [...accessories];
    if (itemSearch) {
      const searchLower = itemSearch.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(searchLower) ||
        a.id.toLowerCase().includes(searchLower)
      );
    }
    if (itemRarityFilter !== 'all') {
      filtered = filtered.filter(a => a.rarity === itemRarityFilter);
    }
    if (itemTypeFilter !== 'all') {
      filtered = filtered.filter(a => a.slot === itemTypeFilter);
    }
    setFilteredAccessories(filtered);
  }, [accessories, itemSearch, itemRarityFilter, itemTypeFilter]);

  // Фильтрация расходников
  useEffect(() => {
    if (consumables.length === 0) return;
    let filtered = [...consumables];
    if (itemSearch) {
      const searchLower = itemSearch.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.id.toLowerCase().includes(searchLower)
      );
    }
    if (itemRarityFilter !== 'all') {
      filtered = filtered.filter(c => c.rarity === itemRarityFilter);
    }
    if (itemTypeFilter !== 'all') {
      filtered = filtered.filter(c => c.type === itemTypeFilter);
    }
    setFilteredConsumables(filtered);
  }, [consumables, itemSearch, itemRarityFilter, itemTypeFilter]);

  // Фильтрация камней Ци
  useEffect(() => {
    if (qiStones.length === 0) return;
    let filtered = [...qiStones];
    if (itemSearch) {
      const searchLower = itemSearch.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.id.toLowerCase().includes(searchLower)
      );
    }
    if (itemTypeFilter !== 'all') {
      filtered = filtered.filter(s => s.type === itemTypeFilter);
    }
    setFilteredQiStones(filtered);
  }, [qiStones, itemSearch, itemTypeFilter]);

  // Фильтрация зарядников
  useEffect(() => {
    if (chargers.length === 0) return;
    let filtered = [...chargers];
    if (itemSearch) {
      const searchLower = itemSearch.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.id.toLowerCase().includes(searchLower)
      );
    }
    if (itemRarityFilter !== 'all') {
      filtered = filtered.filter(c => c.rarity === itemRarityFilter);
    }
    setFilteredChargers(filtered);
  }, [chargers, itemSearch, itemRarityFilter]);

  // ==================== ЗАГРУЗКА ДАННЫХ ====================

  const loadTechniques = async () => {
    try {
      const res = await fetch('/api/generator/techniques?action=list');
      const data = await res.json();
      if (data.success) setTechniques(data.techniques);
    } catch (error) {
      console.error('Failed to load techniques:', error);
    }
  };

  const loadFormations = async () => {
    try {
      const res = await fetch('/api/generator/formations?action=list');
      const data = await res.json();
      if (data.success) setFormations(data.formations);
    } catch (error) {
      console.error('Failed to load formations:', error);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTechniques(),
        loadFormations(),
        // TODO: Добавить API для предметов
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Сброс фильтров при смене вкладки
  useEffect(() => {
    setItemSearch('');
    setItemRarityFilter('all');
    setItemTypeFilter('all');
  }, [activeTab]);

  // ==================== РЕНДЕР ====================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-amber-400">
            📦 Сгенерированные объекты
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
          <div className="flex items-center justify-between mb-3">
            <TabsList className="bg-slate-800 flex flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="techniques" className="text-xs data-[state=active]:bg-amber-600">
                ⚔️ Техники
              </TabsTrigger>
              <TabsTrigger value="formations" className="text-xs data-[state=active]:bg-amber-600">
                🛡️ Формации
              </TabsTrigger>
              <TabsTrigger value="weapons" className="text-xs data-[state=active]:bg-amber-600">
                🗡️ Оружие
              </TabsTrigger>
              <TabsTrigger value="armor" className="text-xs data-[state=active]:bg-amber-600">
                🛡️ Броня
              </TabsTrigger>
              <TabsTrigger value="accessories" className="text-xs data-[state=active]:bg-amber-600">
                💎 Аксессуары
              </TabsTrigger>
              <TabsTrigger value="consumables" className="text-xs data-[state=active]:bg-amber-600">
                💊 Расходники
              </TabsTrigger>
              <TabsTrigger value="qi_stones" className="text-xs data-[state=active]:bg-amber-600">
                💠 Камни Ци
              </TabsTrigger>
              <TabsTrigger value="chargers" className="text-xs data-[state=active]:bg-amber-600">
                ⚡ Зарядники
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
              Обновить
            </Button>
          </div>

          {/* ==================== ТЕХНИКИ ==================== */}
          <TabsContent value="techniques" className="mt-0">
            <div className="flex gap-4 h-[55vh]">
              <div className="w-1/2 flex flex-col min-h-0">
                <div className="mb-3 space-y-2 flex-shrink-0">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                      <Input
                        value={techSearch}
                        onChange={(e) => setTechSearch(e.target.value)}
                        placeholder="Поиск..."
                        className="pl-8 bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={techLevelFilter} onValueChange={setTechLevelFilter}>
                      <SelectTrigger className="w-20 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Уровень</SelectItem>
                        {Array.from({ length: 9 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>Ур. {i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={techTypeFilter} onValueChange={setTechTypeFilter}>
                      <SelectTrigger className="w-28 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Тип</SelectItem>
                        {Object.entries(TYPE_NAMES).map(([key, name]) => (
                          <SelectItem key={key} value={key}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <ScrollArea className="flex-1 min-h-0 border border-slate-700 rounded-lg">
                  {filteredTechniques.length > 0 ? (
                    <div className="divide-y divide-slate-700">
                      {filteredTechniques.slice(0, 300).map((tech) => (
                        <div
                          key={tech.id}
                          onClick={() => setSelectedTechnique(tech)}
                          className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                            selectedTechnique?.id === tech.id ? 'bg-amber-900/20 border-l-2 border-amber-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">{tech.name}</span>
                            <Badge variant="outline" className="text-xs border-slate-500">Ур. {tech.level}</Badge>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {TYPE_NAMES[tech.type]} • {tech.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500">Нет данных</div>
                  )}
                </ScrollArea>
              </div>
              <div className="w-1/2 bg-slate-800/30 rounded-lg p-4 min-h-0 overflow-hidden flex flex-col">
                {selectedTechnique ? (
                  <ScrollArea className="flex-1">
                    <div className="space-y-4 pr-4">
                      <h3 className="text-xl font-bold text-white">{selectedTechnique.name}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="border-slate-500">{TYPE_NAMES[selectedTechnique.type]}</Badge>
                        <Badge className={RARITY_BG[selectedTechnique.rarity]}>{selectedTechnique.rarity}</Badge>
                      </div>
                      <p className="text-sm text-slate-300">{selectedTechnique.description}</p>
                      <div className="bg-slate-700/50 rounded-lg p-3">
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
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Sword className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Выберите технику</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ==================== ФОРМАЦИИ ==================== */}
          <TabsContent value="formations" className="mt-0">
            <div className="flex gap-4 h-[55vh]">
              <div className="w-1/2 flex flex-col min-h-0">
                <div className="mb-3 space-y-2 flex-shrink-0">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                    <Input
                      value={formSearch}
                      onChange={(e) => setFormSearch(e.target.value)}
                      placeholder="Поиск..."
                      className="pl-8 bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1 min-h-0 border border-slate-700 rounded-lg">
                  {filteredFormations.length > 0 ? (
                    <div className="divide-y divide-slate-700">
                      {filteredFormations.slice(0, 300).map((form) => (
                        <div
                          key={form.id}
                          onClick={() => setSelectedFormation(form)}
                          className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                            selectedFormation?.id === form.id ? 'bg-amber-900/20 border-l-2 border-amber-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">{form.name}</span>
                            <Badge variant="outline" className="text-xs border-slate-500">Ур. {form.level}</Badge>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {FORMATION_TYPE_NAMES[form.type]} • {form.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500">Нет данных</div>
                  )}
                </ScrollArea>
              </div>
              <div className="w-1/2 bg-slate-800/30 rounded-lg p-4 min-h-0 overflow-hidden flex flex-col">
                {selectedFormation ? (
                  <ScrollArea className="flex-1">
                    <div className="space-y-4 pr-4">
                      <h3 className="text-xl font-bold text-white">{selectedFormation.name}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="border-slate-500">{FORMATION_TYPE_NAMES[selectedFormation.type]}</Badge>
                        <Badge className={RARITY_BG[selectedFormation.rarity]}>{selectedFormation.rarity}</Badge>
                      </div>
                      <p className="text-sm text-slate-300">{selectedFormation.description}</p>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Требования</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Участников:</span>
                            <span className="text-white">{selectedFormation.requirements.minParticipants}-{selectedFormation.requirements.maxParticipants}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Ци/мин:</span>
                            <span className="text-cyan-400">{selectedFormation.qiCostPerMinute}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Выберите формацию</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ==================== ОРУЖИЕ ==================== */}
          <TabsContent value="weapons" className="mt-0">
            <div className="flex gap-4 h-[55vh]">
              <div className="w-1/2 flex flex-col min-h-0">
                <div className="mb-3 space-y-2 flex-shrink-0">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                      <Input
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        placeholder="Поиск..."
                        className="pl-8 bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                    <Select value={itemRarityFilter} onValueChange={setItemRarityFilter}>
                      <SelectTrigger className="w-24 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Редкость</SelectItem>
                        <SelectItem value="common">Обычное</SelectItem>
                        <SelectItem value="uncommon">Необычное</SelectItem>
                        <SelectItem value="rare">Редкое</SelectItem>
                        <SelectItem value="legendary">Легенда</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                      <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Категория</SelectItem>
                        {Object.entries(WEAPON_CATEGORY_NAMES).map(([key, name]) => (
                          <SelectItem key={key} value={key}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <ScrollArea className="flex-1 min-h-0 border border-slate-700 rounded-lg">
                  {filteredWeapons.length > 0 ? (
                    <div className="divide-y divide-slate-700">
                      {filteredWeapons.map((weapon) => (
                        <div
                          key={weapon.id}
                          onClick={() => setSelectedWeapon(weapon)}
                          className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                            selectedWeapon?.id === weapon.id ? 'bg-amber-900/20 border-l-2 border-amber-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">{weapon.name}</span>
                            <Badge className={RARITY_BG[weapon.rarity]}>{weapon.rarity}</Badge>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {WEAPON_CATEGORY_NAMES[weapon.category]} • Урон: {weapon.baseDamage} • {weapon.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500">
                      <Sword className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Нет оружия. Сгенерируйте в меню "Создание"
                    </div>
                  )}
                </ScrollArea>
              </div>
              <div className="w-1/2 bg-slate-800/30 rounded-lg p-4 min-h-0 overflow-hidden flex flex-col">
                {selectedWeapon ? (
                  <ScrollArea className="flex-1">
                    <div className="space-y-4 pr-4">
                      <h3 className="text-xl font-bold text-white">{selectedWeapon.name}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="border-slate-500">{WEAPON_CATEGORY_NAMES[selectedWeapon.category]}</Badge>
                        <Badge className={RARITY_BG[selectedWeapon.rarity]}>{selectedWeapon.rarity}</Badge>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Параметры</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Урон:</span>
                            <span className="text-red-400">{selectedWeapon.baseDamage}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Дальность:</span>
                            <span className="text-green-400">{selectedWeapon.baseRange} м</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Скорость:</span>
                            <span className="text-cyan-400">{selectedWeapon.attackSpeed}/сек</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Крит шанс:</span>
                            <span className="text-yellow-400">{selectedWeapon.properties?.critChance || 0}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ID:</span>
                            <span className="text-slate-300 text-xs">{selectedWeapon.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Улучшения:</span>
                            <span className="text-purple-400">{selectedWeapon.upgradeFlags}/15</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Sword className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Выберите оружие</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ==================== БРОНЯ ==================== */}
          <TabsContent value="armor" className="mt-0">
            <div className="flex gap-4 h-[55vh]">
              <div className="w-1/2 flex flex-col min-h-0">
                <div className="mb-3 flex gap-2 flex-shrink-0">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                    <Input
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Поиск..."
                      className="pl-8 bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <Select value={itemRarityFilter} onValueChange={setItemRarityFilter}>
                    <SelectTrigger className="w-24 bg-slate-800 border-slate-600 text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700">
                      <SelectItem value="all">Редкость</SelectItem>
                      <SelectItem value="common">Обычная</SelectItem>
                      <SelectItem value="uncommon">Необычная</SelectItem>
                      <SelectItem value="rare">Редкая</SelectItem>
                      <SelectItem value="legendary">Легенда</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                    <SelectTrigger className="w-28 bg-slate-800 border-slate-600 text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700">
                      <SelectItem value="all">Слот</SelectItem>
                      {Object.entries(SLOT_NAMES).map(([key, name]) => (
                        <SelectItem key={key} value={key}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="flex-1 min-h-0 border border-slate-700 rounded-lg">
                  {filteredArmors.length > 0 ? (
                    <div className="divide-y divide-slate-700">
                      {filteredArmors.map((armor) => (
                        <div
                          key={armor.id}
                          onClick={() => setSelectedArmor(armor)}
                          className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                            selectedArmor?.id === armor.id ? 'bg-amber-900/20 border-l-2 border-amber-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">{armor.name}</span>
                            <Badge className={RARITY_BG[armor.rarity]}>{armor.rarity}</Badge>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {SLOT_NAMES[armor.slot]} • Защита: {armor.defense.physical} • {armor.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500">
                      <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Нет брони. Сгенерируйте в меню "Создание"
                    </div>
                  )}
                </ScrollArea>
              </div>
              <div className="w-1/2 bg-slate-800/30 rounded-lg p-4 min-h-0 overflow-hidden flex flex-col">
                {selectedArmor ? (
                  <ScrollArea className="flex-1">
                    <div className="space-y-4 pr-4">
                      <h3 className="text-xl font-bold text-white">{selectedArmor.name}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="border-slate-500">{SLOT_NAMES[selectedArmor.slot]}</Badge>
                        <Badge className={RARITY_BG[selectedArmor.rarity]}>{selectedArmor.rarity}</Badge>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Защита</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Физическая:</span>
                            <span className="text-red-400">{selectedArmor.defense.physical}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Ци:</span>
                            <span className="text-cyan-400">{selectedArmor.defense.qi}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ID:</span>
                            <span className="text-slate-300 text-xs">{selectedArmor.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Улучшения:</span>
                            <span className="text-purple-400">{selectedArmor.upgradeFlags}/15</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Выберите броню</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ==================== АКСЕССУАРЫ ==================== */}
          <TabsContent value="accessories" className="mt-0">
            <div className="flex gap-4 h-[55vh]">
              <div className="w-1/2 flex flex-col min-h-0">
                <div className="mb-3 flex gap-2 flex-shrink-0">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                    <Input
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Поиск..."
                      className="pl-8 bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <Select value={itemRarityFilter} onValueChange={setItemRarityFilter}>
                    <SelectTrigger className="w-24 bg-slate-800 border-slate-600 text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700">
                      <SelectItem value="all">Редкость</SelectItem>
                      <SelectItem value="common">Обычный</SelectItem>
                      <SelectItem value="uncommon">Необычный</SelectItem>
                      <SelectItem value="rare">Редкий</SelectItem>
                      <SelectItem value="legendary">Легенда</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                    <SelectTrigger className="w-28 bg-slate-800 border-slate-600 text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700">
                      <SelectItem value="all">Слот</SelectItem>
                      {Object.entries(ACCESSORY_SLOT_NAMES).map(([key, name]) => (
                        <SelectItem key={key} value={key}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="flex-1 min-h-0 border border-slate-700 rounded-lg">
                  {filteredAccessories.length > 0 ? (
                    <div className="divide-y divide-slate-700">
                      {filteredAccessories.map((acc) => (
                        <div
                          key={acc.id}
                          onClick={() => setSelectedAccessory(acc)}
                          className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                            selectedAccessory?.id === acc.id ? 'bg-amber-900/20 border-l-2 border-amber-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{acc.name}</span>
                              {acc.isTalisman && <Badge variant="outline" className="text-xs border-purple-500 text-purple-400">Талисман</Badge>}
                            </div>
                            <Badge className={RARITY_BG[acc.rarity]}>{acc.rarity}</Badge>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {ACCESSORY_SLOT_NAMES[acc.slot]} • {acc.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500">
                      <Gem className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Нет аксессуаров. Сгенерируйте в меню "Создание"
                    </div>
                  )}
                </ScrollArea>
              </div>
              <div className="w-1/2 bg-slate-800/30 rounded-lg p-4 min-h-0 overflow-hidden flex flex-col">
                {selectedAccessory ? (
                  <ScrollArea className="flex-1">
                    <div className="space-y-4 pr-4">
                      <h3 className="text-xl font-bold text-white">{selectedAccessory.name}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="border-slate-500">{ACCESSORY_SLOT_NAMES[selectedAccessory.slot]}</Badge>
                        <Badge className={RARITY_BG[selectedAccessory.rarity]}>{selectedAccessory.rarity}</Badge>
                        {selectedAccessory.isTalisman && <Badge variant="outline" className="border-purple-500 text-purple-400">Одноразовый</Badge>}
                      </div>
                      {selectedAccessory.bonuses.stats && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-amber-400 mb-2">Бонусы</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {selectedAccessory.bonuses.stats.strength && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Сила:</span>
                                <span className="text-red-400">+{selectedAccessory.bonuses.stats.strength}</span>
                              </div>
                            )}
                            {selectedAccessory.bonuses.stats.agility && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Ловкость:</span>
                                <span className="text-green-400">+{selectedAccessory.bonuses.stats.agility}</span>
                              </div>
                            )}
                            {selectedAccessory.bonuses.stats.intelligence && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Интеллект:</span>
                                <span className="text-blue-400">+{selectedAccessory.bonuses.stats.intelligence}</span>
                              </div>
                            )}
                            {selectedAccessory.bonuses.stats.conductivity && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Проводимость:</span>
                                <span className="text-cyan-400">+{selectedAccessory.bonuses.stats.conductivity}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedAccessory.talismanEffect && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-purple-400 mb-2">Эффект талисмана</h4>
                          <div className="text-sm text-slate-300">
                            <div>Тип: {selectedAccessory.talismanEffect.type}</div>
                            <div>Длительность: {selectedAccessory.talismanEffect.duration} сек</div>
                            {selectedAccessory.talismanEffect.radius && <div>Радиус: {selectedAccessory.talismanEffect.radius} м</div>}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-slate-500">ID: {selectedAccessory.id}</div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Gem className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Выберите аксессуар</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ==================== РАСХОДНИКИ ==================== */}
          <TabsContent value="consumables" className="mt-0">
            <div className="flex gap-4 h-[55vh]">
              <div className="w-1/2 flex flex-col min-h-0">
                <div className="mb-3 flex gap-2 flex-shrink-0">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                    <Input
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Поиск..."
                      className="pl-8 bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <Select value={itemRarityFilter} onValueChange={setItemRarityFilter}>
                    <SelectTrigger className="w-24 bg-slate-800 border-slate-600 text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700">
                      <SelectItem value="all">Редкость</SelectItem>
                      <SelectItem value="common">Обычный</SelectItem>
                      <SelectItem value="uncommon">Необычный</SelectItem>
                      <SelectItem value="rare">Редкий</SelectItem>
                      <SelectItem value="legendary">Легенда</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                    <SelectTrigger className="w-28 bg-slate-800 border-slate-600 text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700">
                      <SelectItem value="all">Тип</SelectItem>
                      {Object.entries(CONSUMABLE_TYPE_NAMES).map(([key, name]) => (
                        <SelectItem key={key} value={key}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="flex-1 min-h-0 border border-slate-700 rounded-lg">
                  {filteredConsumables.length > 0 ? (
                    <div className="divide-y divide-slate-700">
                      {filteredConsumables.map((cons) => (
                        <div
                          key={cons.id}
                          onClick={() => setSelectedConsumable(cons)}
                          className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                            selectedConsumable?.id === cons.id ? 'bg-amber-900/20 border-l-2 border-amber-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">{cons.name}</span>
                            <Badge className={RARITY_BG[cons.rarity]}>{cons.rarity}</Badge>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {CONSUMABLE_TYPE_NAMES[cons.type]} • {cons.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500">
                      <Pill className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Нет расходников. Сгенерируйте в меню "Создание"
                    </div>
                  )}
                </ScrollArea>
              </div>
              <div className="w-1/2 bg-slate-800/30 rounded-lg p-4 min-h-0 overflow-hidden flex flex-col">
                {selectedConsumable ? (
                  <ScrollArea className="flex-1">
                    <div className="space-y-4 pr-4">
                      <h3 className="text-xl font-bold text-white">{selectedConsumable.name}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="border-slate-500">{CONSUMABLE_TYPE_NAMES[selectedConsumable.type]}</Badge>
                        <Badge className={RARITY_BG[selectedConsumable.rarity]}>{selectedConsumable.rarity}</Badge>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Эффект</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Тип:</span>
                            <span className="text-green-400">{selectedConsumable.effect.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Значение:</span>
                            <span className="text-cyan-400">{selectedConsumable.effect.value}</span>
                          </div>
                          {selectedConsumable.effect.duration && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Длительность:</span>
                              <span className="text-purple-400">{selectedConsumable.effect.duration} сек</span>
                            </div>
                          )}
                          {selectedConsumable.usage && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Время использования:</span>
                              <span className="text-yellow-400">{selectedConsumable.usage.castTime} сек</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">ID: {selectedConsumable.id}</div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Pill className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Выберите расходник</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ==================== КАМНИ ЦИ ==================== */}
          <TabsContent value="qi_stones" className="mt-0">
            <div className="flex gap-4 h-[55vh]">
              <div className="w-1/2 flex flex-col min-h-0">
                <div className="mb-3 flex gap-2 flex-shrink-0">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                    <Input
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Поиск..."
                      className="pl-8 bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                    <SelectTrigger className="w-28 bg-slate-800 border-slate-600 text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700">
                      <SelectItem value="all">Тип Ци</SelectItem>
                      <SelectItem value="calm">Спокойная</SelectItem>
                      <SelectItem value="chaotic">Хаотичная</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="flex-1 min-h-0 border border-slate-700 rounded-lg">
                  {filteredQiStones.length > 0 ? (
                    <div className="divide-y divide-slate-700">
                      {filteredQiStones.map((stone) => (
                        <div
                          key={stone.id}
                          onClick={() => setSelectedQiStone(stone)}
                          className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                            selectedQiStone?.id === stone.id ? 'bg-amber-900/20 border-l-2 border-amber-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{stone.name}</span>
                              {stone.type === 'chaotic' && <Badge variant="outline" className="text-xs border-red-500 text-red-400">Хаотичная</Badge>}
                            </div>
                            <Badge variant="outline" className="text-xs border-cyan-500 text-cyan-400">{stone.totalQi} Ци</Badge>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {QI_STONE_SIZE_NAMES[stone.sizeClass]} • {stone.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Нет камней Ци. Сгенерируйте в меню "Создание"
                    </div>
                  )}
                </ScrollArea>
              </div>
              <div className="w-1/2 bg-slate-800/30 rounded-lg p-4 min-h-0 overflow-hidden flex flex-col">
                {selectedQiStone ? (
                  <ScrollArea className="flex-1">
                    <div className="space-y-4 pr-4">
                      <h3 className="text-xl font-bold text-white">{selectedQiStone.name}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="border-slate-500">{QI_STONE_SIZE_NAMES[selectedQiStone.sizeClass]}</Badge>
                        <Badge variant="outline" className={selectedQiStone.type === 'calm' ? 'border-cyan-500 text-cyan-400' : 'border-red-500 text-red-400'}>
                          {selectedQiStone.type === 'calm' ? 'Спокойная' : 'Хаотичная'}
                        </Badge>
                        {selectedQiStone.isSealed && <Badge variant="outline" className="border-purple-500 text-purple-400">Запечатан</Badge>}
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Параметры</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Всего Ци:</span>
                            <span className="text-cyan-400">{selectedQiStone.totalQi}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Текущее Ци:</span>
                            <span className="text-green-400">{selectedQiStone.currentQi}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Объём:</span>
                            <span className="text-white">{selectedQiStone.volumeCm3} см³</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ID:</span>
                            <span className="text-slate-300 text-xs">{selectedQiStone.id}</span>
                          </div>
                        </div>
                      </div>
                      {selectedQiStone.type === 'chaotic' && (
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                          <p className="text-sm text-red-400">⚠️ Хаотичная Ци опасна! Может вызвать нестабильность при поглощении.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Выберите камень Ци</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ==================== ЗАРЯДНИКИ ==================== */}
          <TabsContent value="chargers" className="mt-0">
            <div className="flex gap-4 h-[55vh]">
              <div className="w-1/2 flex flex-col min-h-0">
                <div className="mb-3 flex gap-2 flex-shrink-0">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                    <Input
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Поиск..."
                      className="pl-8 bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <Select value={itemRarityFilter} onValueChange={setItemRarityFilter}>
                    <SelectTrigger className="w-24 bg-slate-800 border-slate-600 text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700">
                      <SelectItem value="all">Редкость</SelectItem>
                      <SelectItem value="common">Обычный</SelectItem>
                      <SelectItem value="uncommon">Необычный</SelectItem>
                      <SelectItem value="rare">Редкий</SelectItem>
                      <SelectItem value="legendary">Легенда</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="flex-1 min-h-0 border border-slate-700 rounded-lg">
                  {filteredChargers.length > 0 ? (
                    <div className="divide-y divide-slate-700">
                      {filteredChargers.map((charger) => (
                        <div
                          key={charger.id}
                          onClick={() => setSelectedCharger(charger)}
                          className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                            selectedCharger?.id === charger.id ? 'bg-amber-900/20 border-l-2 border-amber-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">{charger.name}</span>
                            <Badge className={RARITY_BG[charger.rarity]}>{charger.rarity}</Badge>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Ёмкость: {charger.capacity} • Эфф.: {(charger.efficiency * 100).toFixed(0)}% • {charger.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500">
                      <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Нет зарядников. Сгенерируйте в меню "Создание"
                    </div>
                  )}
                </ScrollArea>
              </div>
              <div className="w-1/2 bg-slate-800/30 rounded-lg p-4 min-h-0 overflow-hidden flex flex-col">
                {selectedCharger ? (
                  <ScrollArea className="flex-1">
                    <div className="space-y-4 pr-4">
                      <h3 className="text-xl font-bold text-white">{selectedCharger.name}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={RARITY_BG[selectedCharger.rarity]}>{selectedCharger.rarity}</Badge>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Параметры</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Ёмкость:</span>
                            <span className="text-cyan-400">{selectedCharger.capacity} камней</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Эффективность:</span>
                            <span className="text-green-400">{(selectedCharger.efficiency * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Скорость:</span>
                            <span className="text-yellow-400">{selectedCharger.chargeRate} ед/сек</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ID:</span>
                            <span className="text-slate-300 text-xs">{selectedCharger.id}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-3">
                        <p className="text-sm text-cyan-400">
                          💡 Эффективность {selectedCharger. efficiency * 100}% означает, что из каждых 100 ед Ци из камня практик получит {(selectedCharger.efficiency * 100).toFixed(0)} ед.
                        </p>
                      </div>
                      {selectedCharger.efficiency >= 1 && (
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                          <p className="text-sm text-red-400">⚠️ Эффективность не может превышать 100% — это нарушает закон сохранения Ци!</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Выберите зарядник</p>
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
